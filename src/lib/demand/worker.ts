import { eq } from "drizzle-orm";
import { db } from "@/db";
import { demandRuns } from "@/db/schema";
import { config } from "@/lib/config";
import type { Job } from "@/jobs/registry";
import { claimDemandRun, getDemandRun } from "./runs";
import { DemandLeaseBusyError } from "./contracts";
import { executeDemandPipeline } from "./pipeline";
import { monitorForRun, monitoringAvailable } from "./monitors";
import { deliverDemandMonitorRun, processDemandMonitorRun } from "./monitor-notifications";

/** Exact owned run, with the independently fenced source/evidence pipeline. */
export async function runDemandResearch(job: Job) {
  if (!config().DEMAND_DISCOVERY_ENABLED || !job.demandRunId) return;
  const [run] = await db().select({ userId: demandRuns.userId }).from(demandRuns).where(eq(demandRuns.id, job.demandRunId));
  if (!run) return;
  const monitor = await monitorForRun(job.demandRunId);
  if (monitor && (!monitor.enabled || !monitoringAvailable(run.userId))) throw new DemandLeaseBusyError("Monitor is paused; leave its job queued.");
  const lease = await claimDemandRun(run.userId, job.demandRunId);
  if (!lease && (await getDemandRun(run.userId, job.demandRunId))?.status === "running") {
    throw new DemandLeaseBusyError("The research lease is still held; retry this job later.");
  }
  if (lease) await executeDemandPipeline(lease);
  if (monitor) {
    await processDemandMonitorRun(run.userId, job.demandRunId);
    await deliverDemandMonitorRun(run.userId, job.demandRunId);
  }
}
