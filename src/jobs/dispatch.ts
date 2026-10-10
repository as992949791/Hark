import { eq } from "drizzle-orm";
import { db } from "@/db";
import { projects } from "@/db/schema";
import { config } from "@/lib/config";
import type { Job } from "./registry";

/** The existing authenticated action queues first, then wakes only that job. */
export async function dispatchJob(job: Pick<Job, "id" | "projectId" | "runAt">): Promise<void> {
  const settings = config();
  if (!settings.BACKGROUND_WORKER_ENABLED || !job.projectId || job.runAt.getTime() > Date.now()) {
    return;
  }
  if (!settings.BACKGROUND_WORKER_SECRET || !settings.BACKGROUND_WORKER_USER_ID) {
    throw new Error("The background worker needs its secret and test owner configured.");
  }
  const [project] = await db().select({ userId: projects.userId }).from(projects)
    .where(eq(projects.id, job.projectId));
  if (project?.userId !== settings.BACKGROUND_WORKER_USER_ID) {
    return;
  }
  const response = await fetch(`${settings.APP_URL}/.netlify/functions/queue-worker`, {
    method: "POST",
    headers: { authorization: `Bearer ${settings.BACKGROUND_WORKER_SECRET}`, "content-type": "application/json" },
    body: JSON.stringify({ jobId: job.id }),
    signal: AbortSignal.timeout(10_000),
  });
  if (response.status !== 202) {
    throw new Error("The job was queued, but the background worker could not be reached. Try again.");
  }
}
