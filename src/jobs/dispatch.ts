import { config } from "@/lib/config";
import type { Job } from "./registry";
import { ownedWorkerJob } from "./owner";

/** The existing authenticated action queues first, then wakes only that job. */
export async function dispatchJob(job: Pick<Job, "id" | "projectId" | "runAt"> & Partial<Pick<Job, "demandRunId">>, scheduled = false): Promise<void> {
  const settings = config();
  if (!settings.BACKGROUND_WORKER_ENABLED || (!job.projectId && !job.demandRunId) || job.runAt.getTime() > Date.now() ||
    (job.demandRunId && (!settings.DEMAND_DISCOVERY_ENABLED || scheduled))) {
    return;
  }
  if (!settings.BACKGROUND_WORKER_SECRET || !settings.BACKGROUND_WORKER_USER_ID) {
    throw new Error("The background worker needs its secret and test owner configured.");
  }
  if (!(await ownedWorkerJob(job.id, settings.BACKGROUND_WORKER_USER_ID))) {
    return;
  }
  const response = await fetch(`${settings.APP_URL}/.netlify/functions/queue-worker`, {
    method: "POST",
    headers: { authorization: `Bearer ${settings.BACKGROUND_WORKER_SECRET}`, "content-type": "application/json" },
    body: JSON.stringify({ jobId: job.id, ...(scheduled ? { scheduled: true } : {}) }),
    signal: AbortSignal.timeout(10_000),
  });
  if (response.status !== 202) {
    throw new Error("The job was queued, but the background worker could not be reached. Try again.");
  }
}
