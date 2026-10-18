import { randomUUID } from "node:crypto";
import { and, desc, eq, gt, inArray, isNull, lte, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { demandAttempts, demandDocuments, demandRuns, demandSignals, jobs, projects } from "@/db/schema";
import { LEASE_MS } from "@/jobs/lease";
import { RETENTION_DAYS } from "@/lib/tiers";
import { demandInput, DemandError, type DemandInput, type DemandLease } from "./contracts";
import { assertLease, demandEnabled, lockBudget, withDemandRun, type DemandRun, type Transaction } from "./store";

export const DEMAND_JOB = "demand_research";

function productUrl(value: string) {
  const url = new URL(value); url.hash = "";
  return url.href;
}

async function assertOwnerCapacity(tx: Transaction, userId: string) {
  const [active] = await tx.select({ count: sql<number>`count(*)::int` }).from(demandRuns)
    .where(and(eq(demandRuns.userId, userId), inArray(demandRuns.status, ["queued", "running"]), gt(demandRuns.expiresAt, new Date())));
  if (active.count >= 3) throw new DemandError("Finish existing research before starting another run.");
}

/** Only explicit creation queues work. Reads below have no scheduling side effects. */
export async function createDemandRun(userId: string, raw: DemandInput): Promise<DemandRun> {
  demandEnabled();
  const input = demandInput.parse(raw);
  const value = input.mode === "product" ? productUrl(input.url) : input.topic;
  return db().transaction(async (tx) => {
    await lockBudget(tx);
    const [existing] = await tx.select().from(demandRuns)
      .where(and(eq(demandRuns.userId, userId), eq(demandRuns.key, input.key)));
    if (existing) {
      if (existing.status === "expired" || existing.expiresAt.getTime() <= Date.now()) throw new DemandError("This request expired; start with a new key.");
      if (existing.mode !== input.mode || existing.input !== value || existing.budgetMicros !== input.budgetMicros ||
        existing.sourceRunId !== (input.sourceRunId ?? null) ||
        (input.mode === "product" && input.projectId && input.projectId !== existing.projectId)) {
        throw new DemandError("This request key already belongs to another input.");
      }
      return visibleRun(existing);
    }
    await assertOwnerCapacity(tx, userId);
    let source: DemandRun | undefined;
    let savedDocuments: (typeof demandDocuments.$inferSelect)[] = [];
    if (input.sourceRunId) {
      [source] = await tx.select().from(demandRuns).where(and(eq(demandRuns.id, input.sourceRunId), eq(demandRuns.userId, userId))).for("share");
      if (!source || !["complete", "partial", "blocked", "failed"].includes(source.status) || source.expiresAt.getTime() <= Date.now()) throw new DemandError("Saved research is unavailable for reuse.");
      savedDocuments = await tx.select().from(demandDocuments).where(and(eq(demandDocuments.runId, source.id), eq(demandDocuments.purpose, "demand")));
      if (!savedDocuments.some((doc) => doc.outcome === "retrieved" && doc.body)) throw new DemandError("Saved research has no original text to reuse.");
    }
    let project: typeof projects.$inferSelect | undefined;
    if (input.mode === "product") {
      const owned = await tx.select().from(projects).where(and(eq(projects.userId, userId),
        input.projectId ? eq(projects.id, input.projectId) : undefined));
      project = owned.find((row) => row.url && productUrl(row.url) === value);
      if (input.projectId && !project) throw new DemandError("Product project not found for this URL.");
    }
    const profileSnapshot = project?.solution ? {
      version: project.profileVersion, name: project.name, url: project.url,
      pain: project.pain || null, solution: project.solution, targetUsers: project.targetUsers || null,
      geography: project.geography, budgetFit: project.budgetFit, brief: project.brief,
    } : null;
    const [run] = await tx.insert(demandRuns).values({
      userId, key: input.key, mode: input.mode, input: value, projectId: project?.id ?? null,
      profileSnapshot, budgetMicros: input.budgetMicros,
      sourceRunId: source?.id ?? null,
      expiresAt: source?.expiresAt ?? new Date(Date.now() + RETENTION_DAYS * 86_400_000),
    }).returning();
    for (const doc of savedDocuments) {
      await tx.insert(demandDocuments).values({ ...doc, id: randomUUID(), runId: run.id });
    }
    await tx.insert(jobs).values({ kind: DEMAND_JOB, demandRunId: run.id });
    return visibleRun(run);
  });
}

function visibleRun(run: DemandRun): DemandRun {
  return run.expiresAt.getTime() <= Date.now()
    ? { ...run, status: "expired", input: null, profileSnapshot: null, themes: null, progress: null, error: null, leaseToken: null }
    : { ...run, leaseToken: null };
}

export async function getDemandRun(userId: string, runId: string) {
  const [run] = await db().select().from(demandRuns).where(and(eq(demandRuns.id, runId), eq(demandRuns.userId, userId)));
  return run ? visibleRun(run) : null;
}

export async function listDemandRuns(userId: string) {
  return (await db().select().from(demandRuns).where(eq(demandRuns.userId, userId))
    .orderBy(desc(demandRuns.createdAt)).limit(50)).map(visibleRun);
}

export async function getDemandEvidence(userId: string, runId: string) {
  const run = await getDemandRun(userId, runId);
  if (!run || run.status === "expired") return { documents: [], signals: [] };
  const documents = await db().select().from(demandDocuments).where(eq(demandDocuments.runId, run.id));
  const signals = await db().select().from(demandSignals).where(eq(demandSignals.runId, run.id));
  return { documents, signals };
}

/** A separate fence protects evidence/budget writes even if an old job process survives its lease. */
export async function claimDemandRun(userId: string, runId: string): Promise<DemandLease | null> {
  demandEnabled();
  return withDemandRun(userId, runId, async (tx, run) => {
    if (run.expiresAt.getTime() <= Date.now() ||
      !["queued", "running"].includes(run.status) ||
      (run.status === "running" && run.leaseExpiresAt && run.leaseExpiresAt.getTime() > Date.now())) return null;
    const pending = await tx.select().from(demandAttempts).where(and(eq(demandAttempts.runId, runId), ne(demandAttempts.status, "settled")));
    if (pending.length) {
      await tx.update(demandAttempts).set({ status: "uncertain" })
        .where(and(eq(demandAttempts.runId, runId), eq(demandAttempts.status, "reserved")));
      await tx.update(demandRuns).set({ status: "blocked", error: "Reconcile outstanding charges before retrying.", leaseToken: null, leaseExpiresAt: null })
        .where(eq(demandRuns.id, runId));
      return null;
    }
    const token = randomUUID();
    await tx.update(demandRuns).set({ status: "running", error: null, finishedAt: null, leaseToken: token, leaseExpiresAt: new Date(Date.now() + LEASE_MS) })
      .where(eq(demandRuns.id, runId));
    return { userId, runId, token };
  });
}

export async function finishDemandRun(lease: DemandLease, status: "complete" | "partial" | "failed" | "blocked", error: string | null = null) {
  return withDemandRun(lease.userId, lease.runId, async (tx, run) => {
    assertLease(run, lease);
    if (run.reservedMicros !== 0 && status !== "blocked") throw new DemandError("Outstanding charges must be reconciled first.");
    if (status === "blocked") await tx.update(demandAttempts).set({ status: "uncertain" })
      .where(and(eq(demandAttempts.runId, run.id), eq(demandAttempts.status, "reserved")));
    await tx.update(demandRuns).set({ status, error, finishedAt: new Date(), leaseToken: null, leaseExpiresAt: null }).where(eq(demandRuns.id, run.id));
  });
}

/** Explicit retries reuse the exact job and successful stored work. */
export async function retryDemandRun(userId: string, runId: string) {
  demandEnabled();
  return withDemandRun(userId, runId, async (tx, run) => {
    if (run.expiresAt.getTime() <= Date.now() || !["blocked", "failed", "partial", "queued"].includes(run.status)) {
      throw new DemandError("This research run cannot be retried.");
    }
    if (run.reservedMicros) throw new DemandError("Reconcile outstanding charges before retrying.");
    if (run.status !== "queued") await assertOwnerCapacity(tx, userId);
    const [job] = await tx.select().from(jobs).where(eq(jobs.demandRunId, run.id)).for("update");
    if (!job || (job.startedAt && !job.finishedAt)) throw new DemandError("The previous worker has not finished.");
    await tx.update(demandRuns).set({ status: "queued", retryVersion: run.retryVersion + 1, error: null, finishedAt: null, leaseToken: null, leaseExpiresAt: null }).where(eq(demandRuns.id, run.id));
    const [queued] = await tx.update(jobs).set({ runAt: new Date(), startedAt: null, finishedAt: null, error: null })
      .where(eq(jobs.id, job.id)).returning();
    return queued;
  });
}

/** Removes source content; run/attempt/ledger totals remain as billing tombstones. */
export async function expireDemandRuns(now = new Date()): Promise<number> {
  return db().transaction(async (tx) => {
    await lockBudget(tx);
    const expired = await tx.select({ id: demandRuns.id }).from(demandRuns)
      .where(and(lte(demandRuns.expiresAt, now), ne(demandRuns.status, "expired"))).limit(500).for("update");
    const ids = expired.map((row) => row.id);
    if (!ids.length) return 0;
    await tx.update(demandAttempts).set({ result: null }).where(inArray(demandAttempts.runId, ids));
    await tx.delete(demandDocuments).where(inArray(demandDocuments.runId, ids));
    await tx.update(demandAttempts).set({ status: "uncertain" }).where(and(inArray(demandAttempts.runId, ids), eq(demandAttempts.status, "reserved")));
    await tx.update(demandRuns).set({ status: "expired", input: null, profileSnapshot: null, themes: null,
      error: null, progress: null, leaseToken: null, leaseExpiresAt: null, finishedAt: now }).where(inArray(demandRuns.id, ids));
    await tx.update(jobs).set({ finishedAt: now, startedAt: null, error: "Research expired." })
      .where(and(inArray(jobs.demandRunId, ids), isNull(jobs.finishedAt)));
    return ids.length;
  });
}
