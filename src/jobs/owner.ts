import { and, eq, or } from "drizzle-orm";
import { db } from "@/db";
import { demandRuns, jobs, projects } from "@/db/schema";
import { config } from "@/lib/config";

/** The one new kind has a run owner; ordinary jobs retain their project owner. */
export async function ownedWorkerJob(jobId: string, userId: string) {
  const [row] = await db().select({ job: jobs, expiresAt: demandRuns.expiresAt }).from(jobs)
    .leftJoin(projects, eq(projects.id, jobs.projectId))
    .leftJoin(demandRuns, eq(demandRuns.id, jobs.demandRunId))
    .where(and(eq(jobs.id, jobId), or(eq(projects.userId, userId), eq(demandRuns.userId, userId))));
  if (row?.job.demandRunId && (!config().DEMAND_DISCOVERY_ENABLED || !row.expiresAt || row.expiresAt.getTime() <= Date.now())) return null;
  return row?.job ?? null;
}
