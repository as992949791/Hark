import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { demandRuns } from "@/db/schema";
import { config } from "@/lib/config";
import { DemandError, type DemandLease } from "./contracts";

export type DemandRun = typeof demandRuns.$inferSelect;
export type Transaction = Parameters<Parameters<ReturnType<typeof db>["transaction"]>[0]>[0];

export function demandEnabled() {
  if (!config().DEMAND_DISCOVERY_ENABLED) throw new DemandError("Demand research is disabled.");
}

/** Budget writes serialize across new runs; legacy daily caps retain their existing admission semantics. */
export async function lockBudget(tx: Transaction) {
  await tx.execute(sql`select pg_advisory_xact_lock(hashtext('demand-budget'))`);
}

export async function withDemandRun<T>(userId: string, runId: string, write: (tx: Transaction, run: DemandRun) => Promise<T>): Promise<T> {
  return db().transaction(async (tx) => {
    await lockBudget(tx);
    const [run] = await tx.select().from(demandRuns)
      .where(and(eq(demandRuns.id, runId), eq(demandRuns.userId, userId))).for("update");
    if (!run) throw new DemandError("Research run not found.");
    return write(tx, run);
  });
}

export function assertLease(run: DemandRun, lease: DemandLease) {
  demandEnabled();
  if (run.status !== "running" || run.leaseToken !== lease.token ||
    !run.leaseExpiresAt || run.leaseExpiresAt.getTime() <= Date.now() || run.expiresAt.getTime() <= Date.now()) {
    throw new DemandError("Research lease is no longer held.");
  }
}
