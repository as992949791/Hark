import { eq } from "drizzle-orm";
import { db } from "@/db";
import { demandRuns } from "@/db/schema";
import { config } from "@/lib/config";
import type { Job } from "@/jobs/registry";
import { claimDemandRun, finishDemandRun, getDemandRun } from "./runs";
import { DemandLeaseBusyError } from "./contracts";

/** Foundation only: stops truthfully until the source pipeline is installed in the next release. */
export async function runDemandResearch(job: Job) {
  if (!config().DEMAND_DISCOVERY_ENABLED || !job.demandRunId) return;
  const [run] = await db().select({ userId: demandRuns.userId }).from(demandRuns).where(eq(demandRuns.id, job.demandRunId));
  if (!run) return;
  const lease = await claimDemandRun(run.userId, job.demandRunId);
  if (!lease && (await getDemandRun(run.userId, job.demandRunId))?.status === "running") {
    throw new DemandLeaseBusyError("The research lease is still held; retry this job later.");
  }
  if (lease) await finishDemandRun(lease, "blocked", "Source collection is not installed yet; no provider request was made.");
}
