import { and, asc, eq, inArray, isNotNull, isNull } from "drizzle-orm";
import { db } from "@/db";
import { demandMonitorRuns, demandMonitors, demandRuns, jobs } from "@/db/schema";
import { config } from "@/lib/config";
import { processDemandMonitorRun } from "@/lib/demand/monitor-notifications";
import { admitDemandMonitors, monitoringAvailable, monitorForRun } from "@/lib/demand/monitors";
import { lockBudget } from "@/lib/demand/store";
import { claimableJob } from "./runner";

export async function scheduledDemandJobAllowed(runId: string) {
  const userId = config().BACKGROUND_WORKER_USER_ID;
  if (!userId || !monitoringAvailable(userId)) return false;
  const monitor = await monitorForRun(runId);
  return monitor?.enabled === true && monitor.userId === userId;
}

/** Short database-only preparation. Paid research and SMTP stay in the background job. */
export async function dueDemandMonitorJobs(now = new Date()) {
  const userId = config().BACKGROUND_WORKER_USER_ID;
  if (!userId || !monitoringAvailable(userId)) return [];
  const finished = await db().select({ runId: demandRuns.id }).from(demandMonitorRuns)
    .innerJoin(demandRuns, eq(demandRuns.id, demandMonitorRuns.runId)).innerJoin(demandMonitors, eq(demandMonitors.id, demandMonitorRuns.monitorId))
    .where(and(eq(demandMonitors.userId, userId), eq(demandMonitors.enabled, true), isNull(demandMonitorRuns.processedAt), inArray(demandRuns.status, ["complete", "partial"]))).orderBy(asc(demandRuns.createdAt)).limit(20);
  for (const run of finished) await processDemandMonitorRun(userId, run.runId, now);
  await db().transaction(async tx => {
    await lockBudget(tx);
    const pending = await tx.select({ record: demandMonitorRuns, run: demandRuns }).from(demandMonitorRuns)
      .innerJoin(demandMonitors, eq(demandMonitors.id, demandMonitorRuns.monitorId)).innerJoin(demandRuns, eq(demandRuns.id, demandMonitorRuns.runId))
      .where(and(eq(demandMonitors.userId, userId), eq(demandMonitors.enabled, true), inArray(demandMonitorRuns.deliveryState, ["pending", "sending"])));
    for (const { record, run } of pending) {
      if (run.expiresAt <= now || run.status === "expired") {
        await tx.update(demandMonitorRuns).set({ deliveryState: "expired", newSignalIds: [], deliveryLeaseUntil: null, deliveryError: null }).where(eq(demandMonitorRuns.runId, run.id));
        continue;
      }
      if (record.deliveryState === "sending" && record.deliveryLeaseUntil && record.deliveryLeaseUntil > now) continue;
      await tx.update(jobs).set({ startedAt: null, finishedAt: null, error: null, runAt: now })
        .where(and(eq(jobs.demandRunId, record.runId), isNotNull(jobs.finishedAt)));
    }
  });
  await admitDemandMonitors(userId, now);
  return db().select({ job: jobs }).from(jobs).innerJoin(demandMonitorRuns, eq(demandMonitorRuns.runId, jobs.demandRunId))
    .innerJoin(demandMonitors, eq(demandMonitors.id, demandMonitorRuns.monitorId))
    .innerJoin(demandRuns, eq(demandRuns.id, demandMonitorRuns.runId))
    .where(and(eq(demandMonitors.userId, userId), eq(demandMonitors.enabled, true), inArray(demandRuns.status, ["queued", "running", "complete", "partial"]), claimableJob(now)))
    .orderBy(asc(jobs.runAt)).limit(2).then(rows => rows.map(row => row.job));
}
