import { and, eq, isNull } from "drizzle-orm";
import { afterEach, expect, it, vi } from "vitest";
import { db } from "@/db";
import { alerts, jobs, leads } from "@/db/schema";
import { runScheduledTick, scheduledJobAllowed } from "@/jobs/scheduled";
import * as usage from "@/lib/usage";
import { runBackgroundRequest } from "@/jobs/serverless";
import { JOB_HANDLERS } from "@/jobs/registry";
import { runDigest, sendDueDigests } from "@/jobs/digest";
import { LEASE_MS } from "@/jobs/lease";
import { describeDb, makePost, makeProject, makeUser } from "./fixtures/db";

const send = vi.fn();
vi.mock("@/lib/alerts/send", () => ({ sendToChannel: (...args: unknown[]) => send(...args) }));
const SECRET = "synthetic-scheduled-worker-32-characters";
const original = { ...JOB_HANDLERS };

function request(jobId: string) {
  return new Request("https://hark.test/.netlify/functions/queue-worker", {
    method: "POST", headers: { authorization: `Bearer ${SECRET}` },
    body: JSON.stringify({ jobId, scheduled: true }),
  });
}

describeDb("bounded scheduled dispatch and scoped digest delivery", () => {
  afterEach(() => {
    Object.assign(JOB_HANDLERS, original);
    vi.unstubAllEnvs(); vi.unstubAllGlobals(); send.mockReset();
    vi.restoreAllMocks();
  });

  async function fixture() {
    const user = await makeUser({ lastSeenAt: new Date() });
    const project = await makeProject(user.id);
    await db().insert(alerts).values({ projectId: project.id, channel: "email", target: "owner@example.test", cadence: "daily" });
    vi.stubEnv("BACKGROUND_WORKER_ENABLED", "true");
    vi.stubEnv("BACKGROUND_WORKER_SECRET", SECRET);
    vi.stubEnv("BACKGROUND_WORKER_USER_ID", user.id);
    vi.stubEnv("SCHEDULED_WORKER_ENABLED", "true");
    vi.stubEnv("SCHEDULED_PROJECT_IDS", project.id);
    vi.stubEnv("SELF_HOSTED", "true"); vi.stubEnv("X_LEADS", "false");
    vi.stubEnv("APP_URL", "https://hark.test");
    vi.stubEnv("HOUSE_DATA_CAP_USD_PER_DAY", "0"); vi.stubEnv("HOUSE_LLM_CAP_USD_PER_DAY", "0");
    const fetch = vi.fn().mockResolvedValue(new Response(null, { status: 202 }));
    vi.stubGlobal("fetch", fetch);
    return { user, project, fetch };
  }
  async function stored(id: string) {
    const [row] = await db().select().from(jobs).where(eq(jobs.id, id)); return row;
  }
  async function alert(projectId: string) {
    const [existing] = await db().select().from(alerts).where(eq(alerts.projectId, projectId));
    const row = existing ?? (await db().insert(alerts).values({ projectId, channel: "email", target: "owner@example.test", cadence: "daily" }).returning())[0];
    const post = await makePost();
    await db().insert(leads).values({ projectId, postId: post.id, score: 80, foundAt: new Date(Date.now() - 1000) });
    return row;
  }

  it("does nothing while disabled, with no allowlist or no worker secret", async () => {
    const { project, fetch } = await fixture();
    vi.stubEnv("SCHEDULED_WORKER_ENABLED", "false"); expect(await runScheduledTick()).toBe(0);
    vi.stubEnv("SCHEDULED_WORKER_ENABLED", "true"); vi.stubEnv("SCHEDULED_PROJECT_IDS", ""); expect(await runScheduledTick()).toBe(0);
    vi.stubEnv("SCHEDULED_PROJECT_IDS", project.id); vi.stubEnv("BACKGROUND_WORKER_SECRET", ""); expect(await runScheduledTick()).toBe(0);
    expect(fetch).not.toHaveBeenCalled();
    expect(await db().select().from(jobs).where(eq(jobs.projectId, project.id))).toHaveLength(0);
  });

  it("dispatches only a due owned digest when paid configuration is absent or zero", async () => {
    const { user, project, fetch } = await fixture();
    const outside = await makeProject(user.id); const foreign = await makeProject((await makeUser()).id);
    vi.stubEnv("SCHEDULED_PROJECT_IDS", `${project.id},${foreign.id}`);
    await db().insert(jobs).values([
      { projectId: project.id, kind: "scan" }, { projectId: outside.id, kind: "insights" },
      { projectId: foreign.id, kind: "digest" }, { projectId: null, kind: "digest" },
    ]);
    expect(await runScheduledTick()).toBe(1);
    const id = JSON.parse(fetch.mock.calls[0][1].body).jobId;
    expect(await stored(id)).toMatchObject({ projectId: project.id, kind: "digest", startedAt: null });
    expect(JSON.parse(fetch.mock.calls[0][1].body).scheduled).toBe(true);
    expect(fetch).toHaveBeenCalledOnce();
  });

  it("keeps the dispatch bound and leaves a future job undispatched", async () => {
    const { user, project, fetch } = await fixture();
    const second = await makeProject(user.id); const third = await makeProject(user.id);
    await alert(second.id); await alert(third.id);
    vi.stubEnv("SCHEDULED_PROJECT_IDS", `${project.id},${second.id},${third.id}`);
    const [future] = await db().insert(jobs).values({ projectId: project.id, kind: "insights", runAt: new Date(Date.now() + 60_000) }).returning();
    expect(await runScheduledTick()).toBe(2);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch.mock.calls.map(([, init]) => JSON.parse(init.body).jobId)).not.toContain(future.id);
  });

  it("does not duplicate digest rows when scheduled ticks overlap", async () => {
    const { project } = await fixture();
    await Promise.all([runScheduledTick(), runScheduledTick()]);
    const rows = await db().select().from(jobs).where(and(eq(jobs.projectId, project.id), eq(jobs.kind, "digest"), isNull(jobs.finishedAt)));
    expect(rows).toHaveLength(1);
    const run = vi.fn(); JOB_HANDLERS.digest = run;
    await Promise.all([runBackgroundRequest(request(rows[0].id)), runBackgroundRequest(request(rows[0].id))]);
    expect(run).toHaveBeenCalledOnce();
  });

  it("skips live sibling leases and recovers an expired exact job", async () => {
    const { project, fetch } = await fixture();
    const [job] = await db().insert(jobs).values({ projectId: project.id, kind: "digest", startedAt: new Date() }).returning();
    expect(await runScheduledTick()).toBe(0); expect(fetch).not.toHaveBeenCalled();
    await db().update(jobs).set({ startedAt: new Date(Date.now() - LEASE_MS - 1000) }).where(eq(jobs.id, job.id));
    expect(await runScheduledTick()).toBe(1);
    const run = vi.fn(); JOB_HANDLERS.digest = run;
    await runBackgroundRequest(request(job.id));
    expect(run).toHaveBeenCalledOnce(); expect((await stored(job.id)).finishedAt).not.toBeNull();
  });

  it("rechecks the allowlist and paid controls at background admission", async () => {
    const { project } = await fixture();
    const [job] = await db().insert(jobs).values({ projectId: project.id, kind: "insights" }).returning();
    const run = vi.fn(); JOB_HANDLERS.insights = run;
    await runBackgroundRequest(request(job.id));
    vi.stubEnv("SCHEDULED_PROJECT_IDS", (await makeProject((await makeUser()).id)).id);
    await runBackgroundRequest(request(job.id));
    expect(run).not.toHaveBeenCalled(); expect((await stored(job.id)).startedAt).toBeNull();
  });

  it("dispatches funded due work, while skipping disabled X and exhausted recorded budgets", async () => {
    const { project, fetch } = await fixture();
    vi.stubEnv("ANYAPI_HOUSE_API_KEY", "synthetic-data-key"); vi.stubEnv("OPENROUTER_API_KEY", "synthetic-model-key");
    vi.stubEnv("HOUSE_DATA_CAP_USD_PER_DAY", "1000000"); vi.stubEnv("HOUSE_LLM_CAP_USD_PER_DAY", "1000000");
    const [job] = await db().insert(jobs).values({ projectId: project.id, kind: "insights", runAt: new Date(Date.now() - 1000) }).returning();
    await db().insert(jobs).values({ projectId: project.id, kind: "x_scan", runAt: new Date(Date.now() - 1000) });
    expect(await runScheduledTick()).toBe(2);
    expect(fetch.mock.calls.map(([, init]) => JSON.parse(init.body).jobId)).toContain(job.id);
    expect(await scheduledJobAllowed({ kind: "x_scan", projectId: project.id })).toBe(false);
    vi.spyOn(usage, "assertHouseDataUnderCap").mockRejectedValue(new usage.HouseDataCapReachedError(1));
    expect(await scheduledJobAllowed(job)).toBe(false);
    const run = vi.fn(); JOB_HANDLERS.insights = run;
    await runBackgroundRequest(request(job.id)); expect(run).not.toHaveBeenCalled();
  });

  it("does not dispatch future funded jobs or seed digests on projects with no channels", async () => {
    const { project, fetch } = await fixture();
    await db().delete(alerts).where(eq(alerts.projectId, project.id));
    vi.stubEnv("ANYAPI_HOUSE_API_KEY", "synthetic-data-key"); vi.stubEnv("OPENROUTER_API_KEY", "synthetic-model-key");
    vi.stubEnv("HOUSE_DATA_CAP_USD_PER_DAY", "1000000"); vi.stubEnv("HOUSE_LLM_CAP_USD_PER_DAY", "1000000");
    await db().insert(jobs).values({ projectId: project.id, kind: "insights", runAt: new Date(Date.now() + 60_000) });
    expect(await runScheduledTick()).toBe(0); expect(fetch).not.toHaveBeenCalled();
    expect(await db().select().from(jobs).where(and(eq(jobs.projectId, project.id), eq(jobs.kind, "digest")))).toHaveLength(0);
  });

  it("retains the queue row after dispatch failure for the next tick", async () => {
    const { project, fetch } = await fixture(); fetch.mockResolvedValue(new Response(null, { status: 503 }));
    await expect(runScheduledTick()).rejects.toThrow(/was queued/);
    const rows = await db().select().from(jobs).where(eq(jobs.projectId, project.id));
    expect(rows).toHaveLength(1); expect(rows[0].startedAt).toBeNull();
    fetch.mockResolvedValue(new Response(null, { status: 202 })); expect(await runScheduledTick()).toBe(1);
    expect(JSON.parse(fetch.mock.calls[1][1].body).jobId).toBe(rows[0].id);
  });

  it("sends only the scoped owner's due project, advances success, and obeys cadence", async () => {
    const { user, project } = await fixture();
    const ours = await alert(project.id); const outside = await makeProject(user.id); const theirs = await alert(outside.id);
    const now = new Date(); send.mockResolvedValue(undefined);
    expect(await sendDueDigests(now, { projectId: project.id, userId: user.id })).toBe(1);
    expect(send).toHaveBeenCalledOnce();
    expect(await sendDueDigests(new Date(now.getTime() + 1000), { projectId: project.id, userId: user.id })).toBe(0);
    const rows = await db().select().from(alerts).where(eq(alerts.projectId, project.id)); expect(rows[0].lastSentAt).toEqual(now);
    const [untouched] = await db().select().from(alerts).where(eq(alerts.id, theirs.id)); expect(untouched.lastSentAt).toBeNull();
    const foreign = await makeUser(); expect(await sendDueDigests(now, { projectId: project.id, userId: foreign.id })).toBe(0);
    expect(ours.id).toBe(rows[0].id);
  });

  it("does not advance failed delivery and retries the same digest window", async () => {
    const { user, project } = await fixture(); const channel = await alert(project.id);
    send.mockRejectedValue(new Error("Synthetic SMTP failure"));
    await expect(sendDueDigests(new Date(), { projectId: project.id, userId: user.id })).rejects.toThrow(/SMTP failure/);
    const [failed] = await db().select().from(alerts).where(eq(alerts.id, channel.id)); expect(failed.lastSentAt).toBeNull();
    send.mockResolvedValue(undefined); expect(await sendDueDigests(new Date(), { projectId: project.id, userId: user.id })).toBe(1);
  });

  it("scoped digest jobs book only their project successor and send nothing for an empty window", async () => {
    const { project } = await fixture();
    await runDigest({ projectId: project.id });
    const rows = await db().select().from(jobs).where(eq(jobs.projectId, project.id));
    expect(rows).toHaveLength(1); expect(rows[0].kind).toBe("digest"); expect(rows[0].runAt.getTime()).toBeGreaterThan(Date.now());
    expect(send).not.toHaveBeenCalled();
  });

  it("records failed background digest delivery and books a scoped retry without advancing the channel", async () => {
    const { project } = await fixture(); const channel = await alert(project.id);
    const [job] = await db().insert(jobs).values({ projectId: project.id, kind: "digest", runAt: new Date(Date.now() - 1000) }).returning();
    send.mockRejectedValue(new Error("Synthetic SMTP failure"));
    await runBackgroundRequest(request(job.id));
    expect(send).toHaveBeenCalledOnce();
    expect((await stored(job.id)).error).toContain("Synthetic SMTP failure");
    const [after] = await db().select().from(alerts).where(eq(alerts.id, channel.id)); expect(after.lastSentAt).toBeNull();
    const pending = await db().select().from(jobs).where(and(eq(jobs.projectId, project.id), isNull(jobs.finishedAt)));
    expect(pending).toHaveLength(1); expect(pending[0].kind).toBe("digest"); expect(pending[0].runAt.getTime()).toBeGreaterThan(Date.now());
  });
});
