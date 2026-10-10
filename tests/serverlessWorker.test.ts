import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { afterEach, expect, it, vi } from "vitest";
import { db } from "@/db";
import { jobs } from "@/db/schema";
import { dispatchJob } from "@/jobs/dispatch";
import { enqueueJob, enqueueOnce } from "@/jobs/enqueue";
import { JOB_HANDLERS } from "@/jobs/registry";
import { runBackgroundRequest } from "@/jobs/serverless";
import { claimNextJob } from "@/jobs/runner";
import { pressForJob } from "@/lib/throttle";
import { describeDb, makeProject, makeUser } from "./fixtures/db";

const SECRET = "synthetic-worker-secret-32-characters";
const original = { ...JOB_HANDLERS };

function request(jobId: string, token = SECRET, body: unknown = { jobId }) {
  return new Request("https://hark.test/.netlify/functions/queue-worker", {
    method: "POST", headers: { authorization: `Bearer ${token}` }, body: JSON.stringify(body),
  });
}

describeDb("serverless job admission and execution", () => {
  afterEach(() => {
    Object.assign(JOB_HANDLERS, original);
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  async function fixture(kind = "insights") {
    const user = await makeUser({ lastSeenAt: new Date() });
    const project = await makeProject(user.id);
    vi.stubEnv("BACKGROUND_WORKER_ENABLED", "true");
    vi.stubEnv("BACKGROUND_WORKER_SECRET", SECRET);
    vi.stubEnv("BACKGROUND_WORKER_USER_ID", user.id);
    vi.stubEnv("APP_URL", "https://hark.test");
    const [job] = await db().insert(jobs).values({ kind, projectId: project.id }).returning();
    return { job, user, project };
  }

  async function stored(id: string) {
    const [row] = await db().select().from(jobs).where(eq(jobs.id, id));
    return row;
  }

  it("refuses invalid credentials, malformed input and disabled dispatch without claiming", async () => {
    const { job } = await fixture();
    const run = vi.fn(); JOB_HANDLERS.insights = run;
    await runBackgroundRequest(request(job.id, "wrong"));
    await runBackgroundRequest(request(job.id, SECRET, { jobId: "not-a-uuid" }));
    vi.stubEnv("BACKGROUND_WORKER_ENABLED", "false");
    await runBackgroundRequest(request(job.id));
    expect(run).not.toHaveBeenCalled();
    expect((await stored(job.id)).startedAt).toBeNull();
  });

  it("cannot run another owner's job, an instance job or an unknown job", async () => {
    const { job } = await fixture("digest");
    const run = vi.fn(); JOB_HANDLERS.digest = run;
    await runBackgroundRequest(request(job.id));
    const other = await makeUser();
    vi.stubEnv("BACKGROUND_WORKER_USER_ID", other.id);
    await runBackgroundRequest(request(job.id));
    await runBackgroundRequest(request(randomUUID()));
    expect(run).not.toHaveBeenCalled();
    expect((await stored(job.id)).startedAt).toBeNull();
  });

  it("runs an exact job once and leaves other due research jobs alone", async () => {
    const { job, project } = await fixture();
    const [other] = await db().insert(jobs).values({ kind: "seo_refresh", projectId: project.id }).returning();
    const run = vi.fn(); JOB_HANDLERS.insights = run;
    await runBackgroundRequest(request(job.id));
    await runBackgroundRequest(request(job.id));
    expect(run).toHaveBeenCalledOnce();
    expect((await stored(job.id)).finishedAt).not.toBeNull();
    expect((await stored(other.id)).startedAt).toBeNull();
  });

  it("serializes concurrent sibling claims and duplicate invocations", async () => {
    const { job, project } = await fixture();
    const [sibling] = await db().insert(jobs).values({ kind: "insights", projectId: project.id }).returning();
    let finish = () => {};
    const held = new Promise<void>((resolve) => { finish = resolve; });
    const run = vi.fn(async () => { await held; }); JOB_HANDLERS.insights = run;
    const first = runBackgroundRequest(request(job.id));
    try {
      await vi.waitFor(() => expect(run).toHaveBeenCalledOnce());
      await Promise.all([runBackgroundRequest(request(job.id)), runBackgroundRequest(request(sibling.id))]);
      expect(run).toHaveBeenCalledOnce();
      expect((await stored(sibling.id)).startedAt).toBeNull();
    } finally {
      finish(); await first;
    }
  });

  it("claims only one sibling when independent claim transactions begin together", async () => {
    const { job, project } = await fixture();
    const [sibling] = await db().insert(jobs).values({ kind: "insights", projectId: project.id }).returning();
    const claims = await Promise.all([job, sibling].map((row) =>
      claimNextJob(new Date(), undefined, { projectId: project.id, jobId: row.id }),
    ));
    expect(claims.filter(Boolean)).toHaveLength(1);
  });

  it("continues successful discovery with its backfill without draining successors", async () => {
    const { job, project } = await fixture("discovery_initial");
    JOB_HANDLERS.discovery_initial = async () => {
      await enqueueOnce("backfill", new Date(), project.id);
      await enqueueOnce("competitor_scan", new Date(), project.id);
    };
    const backfill = vi.fn(); JOB_HANDLERS.backfill = backfill;
    await runBackgroundRequest(request(job.id));
    expect(backfill).toHaveBeenCalledOnce();
    const [successor] = await db().select().from(jobs)
      .where(and(eq(jobs.projectId, project.id), eq(jobs.kind, "competitor_scan")));
    expect(successor.startedAt).toBeNull();
  });

  it("records a handler failure and does not start backfill", async () => {
    const { job, project } = await fixture("discovery_initial");
    await enqueueOnce("backfill", new Date(), project.id);
    JOB_HANDLERS.discovery_initial = async () => { throw new Error("Synthetic profile failure"); };
    const backfill = vi.fn(); JOB_HANDLERS.backfill = backfill;
    await runBackgroundRequest(request(job.id));
    expect((await stored(job.id)).error).toBe("Synthetic profile failure");
    expect(backfill).not.toHaveBeenCalled();
  });

  it("a retry can dispatch the same due job without creating a second row", async () => {
    const { user, project } = await fixture();
    vi.stubEnv("SELF_HOSTED", "true");
    const fetch = vi.fn().mockResolvedValue(new Response(null, { status: 202 }));
    vi.stubGlobal("fetch", fetch);
    const queued = await enqueueJob("scan", project.id);
    await dispatchJob(queued);
    await dispatchJob(await pressForJob(user.id, "scan_now", "scan", project.id));
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch.mock.calls.map(([, init]) => JSON.parse(init.body).jobId)).toEqual([queued.id, queued.id]);
    expect(fetch.mock.calls[0][0]).toBe("https://hark.test/.netlify/functions/queue-worker");
  });

  it("keeps a queued row on dispatch failure and skips dispatch for another owner", async () => {
    const { job, project } = await fixture();
    const fetch = vi.fn().mockResolvedValue(new Response(null, { status: 503 }));
    vi.stubGlobal("fetch", fetch);
    const row = await enqueueJob("scan", project.id);
    await expect(dispatchJob(row)).rejects.toThrow(/was queued/);
    const [queued] = await db().select().from(jobs)
      .where(and(eq(jobs.projectId, project.id), eq(jobs.kind, "scan")));
    expect(queued.startedAt).toBeNull();
    vi.stubEnv("BACKGROUND_WORKER_USER_ID", (await makeUser()).id);
    await dispatchJob(job);
    expect(fetch).toHaveBeenCalledOnce();
  });

  it("does not invoke a worker for future jobs or incomplete worker configuration", async () => {
    const { job } = await fixture();
    const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
    await dispatchJob({ ...job, runAt: new Date(Date.now() + 60_000) });
    vi.stubEnv("BACKGROUND_WORKER_SECRET", "");
    await expect(dispatchJob(job)).rejects.toThrow(/secret/);
    await runBackgroundRequest(request(job.id));
    expect(fetch).not.toHaveBeenCalled();
    expect((await stored(job.id)).startedAt).toBeNull();
  });
});
