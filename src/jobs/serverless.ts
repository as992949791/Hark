import { timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { jobs } from "@/db/schema";
import { config } from "@/lib/config";
import { nextQueuedJob } from "./enqueue";
import { claimNextJob, runClaimedJob } from "./runner";
import { handlerFor } from "./registry";
import { scheduledJobAllowed } from "./scheduled";
import { ownedWorkerJob } from "./owner";

const requestBody = z.object({ jobId: z.uuid(), scheduled: z.boolean().default(false) });

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
  const owned = await ownedWorkerJob(parsed.data.jobId, settings.BACKGROUND_WORKER_USER_ID);
  if (!owned || !handlerFor(owned.kind) ||
    ["retention", "alert_invites"].includes(owned.kind) ||
    (owned.kind === "digest" && !parsed.data.scheduled) || (owned.demandRunId && parsed.data.scheduled)) {
    return;
  }
  if (parsed.data.scheduled && !(await scheduledJobAllowed(owned))) return;
  const projectId = owned.projectId;
  const job = await claimNextJob(new Date(), undefined, { projectId, jobId: owned.id });
  if (!job) {
    return;
  }
  const beganAt = Date.now();
  await runClaimedJob(job);
  // Initial discovery books its backfill. Other due research jobs are not drained.
  const [finished] = await db().select().from(jobs).where(eq(jobs.id, job.id));
  if (!projectId || job.kind !== "discovery_initial" || !finished?.finishedAt || finished.error ||
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
