import { and, asc, eq, inArray, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { alerts, jobs, projects } from "@/db/schema";
import { config } from "@/lib/config";
import { assertUnderLlmCap, LlmCapReachedError } from "@/lib/llm";
import { assertHouseDataUnderCap, HouseDataCapReachedError } from "@/lib/usage";
import { assertXHouseDataUnderCap, assertXLlmUnderCap } from "@/lib/x/budget";
import { xEnabledFor } from "@/lib/x/enabled";
import { dispatchJob } from "./dispatch";
import { claimableJob } from "./runner";
import { handlerFor, type Job } from "./registry";

/** Rechecked by the background worker, including when configuration changes after a tick. */
export async function scheduledJobAllowed(job: Pick<Job, "kind" | "projectId">): Promise<boolean> {
  const settings = config();
  if (!settings.SCHEDULED_WORKER_ENABLED || !settings.BACKGROUND_WORKER_ENABLED ||
    !settings.BACKGROUND_WORKER_SECRET || !settings.BACKGROUND_WORKER_USER_ID ||
    !job.projectId || !settings.SCHEDULED_PROJECT_IDS.includes(job.projectId) ||
    !handlerFor(job.kind) || ["retention", "alert_invites"].includes(job.kind)) return false;
  if (job.kind === "digest") return true;
  if (!settings.ANYAPI_HOUSE_API_KEY || !settings.OPENROUTER_API_KEY ||
    settings.HOUSE_DATA_CAP_USD_PER_DAY === 0 || settings.HOUSE_LLM_CAP_USD_PER_DAY === 0) return false;
  const x = job.kind.startsWith("x_");
  if (x && (!xEnabledFor(settings.BACKGROUND_WORKER_USER_ID) ||
    settings.HOUSE_X_DATA_CAP_USD_PER_DAY === 0 || settings.HOUSE_X_LLM_CAP_USD_PER_DAY === 0)) return false;
  try {
    await assertHouseDataUnderCap();
    await assertUnderLlmCap();
    if (x) {
      await assertXHouseDataUnderCap();
      await assertXLlmUnderCap();
    }
    return true;
  } catch (error) {
    if (error instanceof HouseDataCapReachedError || error instanceof LlmCapReachedError) return false;
    throw error;
  }
}

/** A short scheduled invocation dispatches at most two jobs; handlers run elsewhere. */
export async function runScheduledTick(now = new Date()): Promise<number> {
  const beganAt = Date.now();
  const settings = config();
  if (!settings.SCHEDULED_WORKER_ENABLED || !settings.BACKGROUND_WORKER_ENABLED ||
    !settings.BACKGROUND_WORKER_SECRET || !settings.BACKGROUND_WORKER_USER_ID ||
    settings.SCHEDULED_PROJECT_IDS.length === 0) return 0;
  const owned = await db().select({ id: projects.id }).from(projects)
    .where(and(eq(projects.userId, settings.BACKGROUND_WORKER_USER_ID), inArray(projects.id, settings.SCHEDULED_PROJECT_IDS)));
  if (owned.length === 0) return 0;
  const channelProjects = await db().selectDistinct({ id: alerts.projectId }).from(alerts)
    .where(inArray(alerts.projectId, owned.map((project) => project.id)));
  for (const project of channelProjects) {
    await db().transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`worker:${project.id}`}))`);
      const waiting = await tx.select({ id: jobs.id }).from(jobs)
        .where(and(eq(jobs.projectId, project.id), eq(jobs.kind, "digest"), isNull(jobs.finishedAt))).limit(1);
      if (waiting.length === 0) await tx.insert(jobs).values({ kind: "digest", projectId: project.id, runAt: now });
    });
  }
  const due = await db().select().from(jobs).where(and(
    inArray(jobs.projectId, owned.map((project) => project.id)), claimableJob(now),
  )).orderBy(sql`(${jobs.kind} = 'digest') desc`, asc(jobs.runAt)).limit(12);
  let dispatched = 0;
  for (const job of due) {
    if (dispatched === 2 || Date.now() - beganAt >= 18_000) break;
    if (await scheduledJobAllowed(job)) {
      await dispatchJob(job, true);
      dispatched += 1;
    }
  }
  return dispatched;
}
