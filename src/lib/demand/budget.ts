import { and, eq, ne, sql } from "drizzle-orm";
import { demandAttempts, demandRuns, llmUsage, usageLedger } from "@/db/schema";
import { LEASE_MS } from "@/jobs/lease";
import { config } from "@/lib/config";
import { houseDataSpend, llmSpend } from "@/lib/spend";
import { utcDayStart } from "@/lib/time";
import { X_PURPOSES, X_SKUS } from "@/lib/x/constants";
import { attemptInput, DemandError, micros, type AttemptInput, type DemandLease } from "./contracts";
import { assertLease, withDemandRun, type DemandRun, type Transaction } from "./store";

type Attempt = typeof demandAttempts.$inferSelect;
export type DemandCharge = { actualMicros: number; requestId: string | null; inputTokens?: number; outputTokens?: number; model?: string };

/** Reserve the upper bound before transport access. No endpoint/model is priced by this foundation. */
export async function reserveDemandAttempt(lease: DemandLease, raw: AttemptInput) {
  const input = attemptInput.parse(raw);
  const settings = config();
  if (!settings.DEMAND_LIVE_ENABLED) throw new DemandError("Live demand requests are disabled.");
  if ((input.source === "x" && !settings.X_LEADS) ||
    (input.kind === "data" && input.operation.startsWith("twitter.") && input.source !== "x")) {
    throw new DemandError("X requests require their source gate and budgets.");
  }
  return withDemandRun(lease.userId, lease.runId, async (tx, run) => {
    assertLease(run, lease);
    const attempts = await tx.select().from(demandAttempts).where(eq(demandAttempts.runId, run.id));
    if (attempts.some((attempt) => attempt.key === input.key)) throw new DemandError("This attempt already exists; reuse its result or reconcile it.");
    if (attempts.some((attempt) => attempt.status !== "settled")) throw new DemandError("An outstanding request must settle before another purchase.");
    if (attempts.length >= run.maxAttempts || run.spentMicros + run.reservedMicros + input.upperBoundMicros > run.budgetMicros) {
      throw new DemandError("The research budget or attempt limit cannot cover this request.");
    }
    const cap = input.kind === "data" ? settings.HOUSE_DATA_CAP_USD_PER_DAY : settings.HOUSE_LLM_CAP_USD_PER_DAY;
    const spent = input.kind === "data" ? await houseDataSpend({}, tx) : await llmSpend({ since: utcDayStart() }, tx);
    const [pending] = await tx.select({ sum: sql<string>`coalesce(sum(${demandAttempts.upperBoundMicros}), 0)` })
      .from(demandAttempts).where(and(eq(demandAttempts.kind, input.kind), ne(demandAttempts.status, "settled")));
    if (Math.round(spent * 1e6) + Number(pending.sum) + input.upperBoundMicros > Math.floor(cap * 1e6)) {
      throw new DemandError("The daily house budget cannot cover this request.");
    }
    if (input.source === "x") {
      const xCap = input.kind === "data" ? settings.HOUSE_X_DATA_CAP_USD_PER_DAY : settings.HOUSE_X_LLM_CAP_USD_PER_DAY;
      const xSpent = input.kind === "data" ? await houseDataSpend({ skus: X_SKUS }, tx) : await llmSpend({ since: utcDayStart(), purposes: X_PURPOSES }, tx);
      const [xPending] = await tx.select({ sum: sql<string>`coalesce(sum(${demandAttempts.upperBoundMicros}), 0)` })
        .from(demandAttempts).where(and(eq(demandAttempts.kind, input.kind), eq(demandAttempts.source, "x"), ne(demandAttempts.status, "settled")));
      if (Math.round(xSpent * 1e6) + Number(xPending.sum) + input.upperBoundMicros > Math.floor(xCap * 1e6)) {
        throw new DemandError("The X daily budget cannot cover this request.");
      }
      if (input.kind === "data" && !(X_SKUS as readonly string[]).includes(input.operation)) throw new DemandError("Unknown X endpoint ceiling.");
    }
    const [attempt] = await tx.insert(demandAttempts).values({ ...input, runId: run.id }).returning();
    await tx.update(demandRuns).set({ reservedMicros: run.reservedMicros + input.upperBoundMicros, leaseExpiresAt: new Date(Date.now() + LEASE_MS) })
      .where(eq(demandRuns.id, run.id));
    return attempt;
  });
}

async function writeCharge(tx: Transaction, run: DemandRun, attempt: Attempt, charge: DemandCharge) {
  const actual = micros.parse(charge.actualMicros);
  if (attempt.status === "settled") {
    if (attempt.actualMicros !== actual || attempt.requestId !== charge.requestId) throw new DemandError("A settled charge cannot be changed.");
    return false;
  }
  // Run-owned charges survive deletion of an optional product project and its cascading ledger rows.
  const association = { projectId: null, demandRunId: run.id, demandAttemptId: attempt.id, costUsd: (actual / 1e6).toFixed(6) };
  if (attempt.kind === "data") {
    await tx.insert(usageLedger).values({ ...association, sku: attempt.operation, requestId: charge.requestId, fundedBy: "house" });
  } else {
    await tx.insert(llmUsage).values({ ...association, purpose: attempt.source === "x" ? "demand_x" : "demand",
      inputTokens: charge.inputTokens ?? 0, outputTokens: charge.outputTokens ?? 0, model: charge.model ?? null });
  }
  await tx.update(demandAttempts).set({ status: "settled", actualMicros: actual, requestId: charge.requestId }).where(eq(demandAttempts.id, attempt.id));
  const overrun = actual > attempt.upperBoundMicros;
  await tx.update(demandRuns).set({ reservedMicros: run.reservedMicros - attempt.upperBoundMicros, spentMicros: run.spentMicros + actual,
    ...(overrun && run.status !== "expired" ? { status: "blocked" as const, error: "Provider exceeded its admitted ceiling.", leaseToken: null, leaseExpiresAt: null } : {}),
  }).where(eq(demandRuns.id, run.id));
  return overrun;
}

export async function settleDemandAttempt(lease: DemandLease, attemptId: string, charge: DemandCharge, result?: Attempt["result"]) {
  return withDemandRun(lease.userId, lease.runId, async (tx, run) => {
    assertLease(run, lease);
    const [attempt] = await tx.select().from(demandAttempts).where(and(eq(demandAttempts.id, attemptId), eq(demandAttempts.runId, run.id)));
    if (!attempt || attempt.status === "uncertain") throw new DemandError("This charge needs explicit reconciliation.");
    const overrun = await writeCharge(tx, run, attempt, charge);
    if (result && attempt.status !== "settled") await tx.update(demandAttempts).set({ result }).where(eq(demandAttempts.id, attempt.id));
    return overrun;
  });
}

/** Server-side reconciliation only, using a known provider receipt; there is no public action for it. */
export async function reconcileDemandAttempt(userId: string, runId: string, attemptId: string, charge: DemandCharge) {
  return withDemandRun(userId, runId, async (tx, run) => {
    if (run.leaseToken && run.leaseExpiresAt && run.leaseExpiresAt.getTime() > Date.now()) throw new DemandError("The worker still holds this run.");
    const [attempt] = await tx.select().from(demandAttempts).where(and(eq(demandAttempts.id, attemptId), eq(demandAttempts.runId, run.id)));
    if (!attempt || attempt.status !== "uncertain") throw new DemandError("No uncertain charge to reconcile.");
    return writeCharge(tx, run, attempt, charge);
  });
}

async function uncertain(lease: DemandLease) {
  await withDemandRun(lease.userId, lease.runId, async (tx, run) => {
    assertLease(run, lease);
    await tx.update(demandAttempts).set({ status: "uncertain" })
      .where(and(eq(demandAttempts.runId, run.id), eq(demandAttempts.status, "reserved")));
    await tx.update(demandRuns).set({ status: "blocked", error: "Request failed with unconfirmed charges; reconcile before retry.",
      leaseToken: null, leaseExpiresAt: null }).where(eq(demandRuns.id, run.id));
  });
}

/** Persist normalized output (including billed failures) in the settlement transaction. */
export async function executeRecordedDemandAttempt(lease: DemandLease, input: AttemptInput, call: () => Promise<{ result: NonNullable<Attempt["result"]>; charge: DemandCharge }>) {
  const attempt = await reserveDemandAttempt(lease, input);
  let result: { result: NonNullable<Attempt["result"]>; charge: DemandCharge };
  try {
    result = await call();
    micros.parse(result.charge.actualMicros);
  } catch (error) {
    await uncertain(lease);
    throw error;
  }
  const overrun = await settleDemandAttempt(lease, attempt.id, result.charge, result.result);
  if (overrun) throw new DemandError("Provider exceeded its admitted ceiling; the actual charge was retained.");
  return result.result;
}

/** Compatibility entry point for callers whose normalized result is always usable. */
export async function executeDemandAttempt<T>(lease: DemandLease, input: AttemptInput, call: () => Promise<{ value: T; charge: DemandCharge }>): Promise<T> {
  const result = await executeRecordedDemandAttempt(lease, input, async () => {
    const response = await call();
    return { result: { ok: true, value: response.value }, charge: response.charge };
  });
  if (!result.ok) throw new DemandError(result.error);
  return result.value as T;
}
