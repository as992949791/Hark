import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterEach, expect, it, vi } from "vitest";
import { db } from "@/db";
import { jobs, users } from "@/db/schema";
import { dispatchJob } from "@/jobs/dispatch";
import { JOB_HANDLERS, nextRunAt } from "@/jobs/registry";
import { claimNextJob } from "@/jobs/runner";
import { runBackgroundRequest } from "@/jobs/serverless";
import { createDemandRun, getDemandRun, retryDemandRun } from "@/lib/demand/runs";
import { describeDb, makeUser } from "./fixtures/db";

const SECRET = "synthetic-worker-secret-32-characters";
const original = JOB_HANDLERS.demand_research;
const request = (jobId: string, scheduled = false) => new Request("https://hark.test/.netlify/functions/queue-worker", {
  method: "POST", headers: { authorization: `Bearer ${SECRET}` }, body: JSON.stringify({ jobId, scheduled }),
});

describeDb("demand exact-job worker", () => {
  const owners: string[] = [];
  afterEach(async () => {
    JOB_HANDLERS.demand_research = original;
    for (const id of owners.splice(0)) await db().delete(users).where(eq(users.id, id));
    vi.unstubAllEnvs(); vi.unstubAllGlobals();
  });

  async function fixture() {
    const user = await makeUser(); owners.push(user.id);
    vi.stubEnv("DEMAND_DISCOVERY_ENABLED", "true");
    vi.stubEnv("DEMAND_LIVE_ENABLED", "false");
    vi.stubEnv("BACKGROUND_WORKER_ENABLED", "true");
    vi.stubEnv("BACKGROUND_WORKER_USER_ID", user.id);
    vi.stubEnv("BACKGROUND_WORKER_SECRET", SECRET);
    const run = await createDemandRun(user.id, { mode: "topic", topic: "video captions", budgetMicros: 100_000, key: randomUUID() });
    const [job] = await db().select().from(jobs).where(eq(jobs.demandRunId, run.id));
    return { user, run, job };
  }

  it("dispatches only the configured run owner and leaves the exact queued row on network failure", async () => {
    const { user, job } = await fixture();
    const fetch = vi.fn().mockResolvedValueOnce(new Response(null, { status: 503 })).mockResolvedValue(new Response(null, { status: 202 }));
    vi.stubGlobal("fetch", fetch);
    await expect(dispatchJob(job)).rejects.toThrow(/was queued/);
    await dispatchJob(job);
    expect(fetch.mock.calls.map(([, init]) => JSON.parse(init.body).jobId)).toEqual([job.id, job.id]);
    const other = await makeUser(); owners.push(other.id);
    vi.stubEnv("BACKGROUND_WORKER_USER_ID", other.id);
    await dispatchJob(job);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(user.id).not.toBe(other.id);
  });

  it("rejects a foreign run and scheduled or feature-disabled requests before claim", async () => {
    const { job } = await fixture(); const run = vi.fn(); JOB_HANDLERS.demand_research = run;
    await runBackgroundRequest(request(job.id, true));
    vi.stubEnv("DEMAND_DISCOVERY_ENABLED", "false");
    await runBackgroundRequest(request(job.id));
    vi.stubEnv("DEMAND_DISCOVERY_ENABLED", "true");
    const other = await makeUser(); owners.push(other.id);
    vi.stubEnv("BACKGROUND_WORKER_USER_ID", other.id);
    await runBackgroundRequest(request(job.id));
    expect(run).not.toHaveBeenCalled();
    expect((await db().select().from(jobs).where(eq(jobs.id, job.id)))[0].startedAt).toBeNull();
  });

  it("runs an exact null-project job once without draining another run", async () => {
    const { user, job } = await fixture();
    const other = await createDemandRun(user.id, { mode: "topic", topic: "another", budgetMicros: 0, key: randomUUID() });
    const run = vi.fn(); JOB_HANDLERS.demand_research = run;
    await Promise.all([runBackgroundRequest(request(job.id)), runBackgroundRequest(request(job.id))]);
    expect(run).toHaveBeenCalledOnce();
    expect((await db().select().from(jobs).where(eq(jobs.demandRunId, other.id)))[0].startedAt).toBeNull();
    expect(await nextRunAt(job)).toBeNull();
  });

  it("keeps the foundation truthful: blocked until collection exists, no provider call or successor", async () => {
    const { user, run, job } = await fixture();
    const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
    await runBackgroundRequest(request(job.id));
    expect((await getDemandRun(user.id, run.id))?.status).toBe("blocked");
    expect((await getDemandRun(user.id, run.id))?.error).toMatch(/not installed yet/);
    expect(fetch).not.toHaveBeenCalled();
    expect(await db().select().from(jobs).where(eq(jobs.demandRunId, run.id))).toHaveLength(1);
    const retried = await retryDemandRun(user.id, run.id);
    expect(retried.id).toBe(job.id);
  });

  it("resident claim cannot take a demand job while the feature is disabled", async () => {
    const { job } = await fixture();
    vi.stubEnv("DEMAND_DISCOVERY_ENABLED", "false");
    expect(await claimNextJob(new Date(), undefined, { projectId: null, jobId: job.id })).toBeNull();
  });
});
