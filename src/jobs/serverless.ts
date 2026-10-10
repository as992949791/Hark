import { timingSafeEqual } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { jobs, projects } from "@/db/schema";
import { config } from "@/lib/config";
import { nextQueuedJob } from "./enqueue";
import { claimNextJob, runClaimedJob } from "./runner";
import { handlerFor } from "./registry";

const requestBody = z.object({ jobId: z.uuid() });

/** Invalid background requests have no effects, even though Netlify replies 202. */
export async function runBackgroundRequest(request: Request): Promise<void> {
  const settings = config();
  const secret = settings.BACKGROUND_WORKER_SECRET;
  const received = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret ?? ""}`);
  if (!settings.BACKGROUND_WORKER_ENABLED || !secret || !settings.BACKGROUND_WORKER_USER_ID ||
    request.method !== "POST" || received.length !== expected.length ||
    !timingSafeEqual(received, expected)) {
    return;
  }
  const parsed = requestBody.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return;
  }
  const [row] = await db().select({ job: jobs }).from(jobs)
    .innerJoin(projects, eq(projects.id, jobs.projectId))
    .where(and(eq(jobs.id, parsed.data.jobId), eq(projects.userId, settings.BACKGROUND_WORKER_USER_ID)));
  if (!row?.job.projectId || !handlerFor(row.job.kind) ||
    ["digest", "retention", "alert_invites"].includes(row.job.kind)) {
    return;
  }
  const projectId = row.job.projectId;
  const job = await claimNextJob(new Date(), undefined, { projectId, jobId: row.job.id });
  if (!job) {
    return;
  }
  const beganAt = Date.now();
  await runClaimedJob(job);
  // Initial discovery books its backfill. Other due research jobs are not drained.
  const [finished] = await db().select().from(jobs).where(eq(jobs.id, job.id));
  if (job.kind !== "discovery_initial" || !finished?.finishedAt || finished.error ||
    Date.now() - beganAt >= 12 * 60 * 1000) {
    return;
  }
  const backfill = await nextQueuedJob("backfill", projectId);
  if (backfill) {
    const claimed = await claimNextJob(new Date(), undefined, { projectId, jobId: backfill.id });
    if (claimed) {
      await runClaimedJob(claimed);
    }
  }
}
