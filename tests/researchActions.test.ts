import { randomUUID } from "node:crypto";
import { renderToStaticMarkup } from "react-dom/server";
import { eq } from "drizzle-orm";
import { afterEach, expect, it, vi } from "vitest";
import { db } from "@/db";
import { alerts, demandAttempts, demandRuns, jobs, projects, users } from "@/db/schema";
import { saveMonitorAction, updateMonitorAction } from "@/app/app/research/monitor-actions";
import { listDemandMonitors } from "@/lib/demand/monitors";
import { createResearchAction, resumeResearchAction, retryResearchAction } from "@/app/app/research/actions";
import ResearchPage from "@/app/app/research/page";
import { claimDemandRun, createDemandRun, finishDemandRun } from "@/lib/demand/runs";
import { getDemandReport } from "@/lib/demand/report";
import { describeDb, makeProject, makeUser } from "./fixtures/db";

let signedIn = { id: "" };
const { redirect } = vi.hoisted(() => ({ redirect: vi.fn((url: string) => { throw new Error(`REDIRECT:${url}`); }) }));
vi.mock("@/lib/auth", () => ({ requireLocalUser: async () => signedIn }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect, unstable_rethrow: vi.fn(), notFound: () => { throw new Error("NOT_FOUND"); } }));
vi.mock("@/components/ActivityPoll", () => ({ ActivityPoll: () => null }));

describeDb("owned manual research actions and reports", () => {
  it("saves a paused monitor through authenticated actions without dispatch and rejects invalid budget/foreign changes", async () => {
    const { user, fetch } = await fixture(); const project = await makeProject(user.id);
    const [channel] = await db().insert(alerts).values({ projectId: project.id, channel: "email", target: "owner@example.com", cadence: "daily" }).returning();
    const run = await createDemandRun(user.id, { key: randomUUID(), mode: "topic", topic: "video captions", budgetMicros: 100_000 });
    const data = new FormData();
    for (const [key, value] of Object.entries({ key: randomUUID(), sourceRunId: run.id, emailChannelId: channel.id, perRunBudget: "0.1", totalBudget: "0.5" })) data.set(key, value);
    expect((await saveMonitorAction({ error: null }, data)).error).toBeNull();
    const [monitor] = await listDemandMonitors(user.id); expect(monitor.enabled).toBe(false); expect(fetch).not.toHaveBeenCalled();
    expect(renderToStaticMarkup(await ResearchPage({ searchParams: Promise.resolve({ run: run.id }) }))).toContain("每日监控");
    data.set("totalBudget", "0.0000001"); expect((await saveMonitorAction({ error: null }, data)).error).toBeTruthy();
    expect((await updateMonitorAction(monitor.id, "enable")).error).toBeTruthy();
    const other = await makeUser(); owners.push(other.id); signedIn = { id: other.id };
    expect((await updateMonitorAction(monitor.id, "delete")).error).toBeTruthy();
    expect(await listDemandMonitors(user.id)).toHaveLength(1);
  });
  const owners: string[] = [];
  afterEach(async () => {
    for (const id of owners.splice(0)) await db().delete(users).where(eq(users.id, id));
    vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.clearAllMocks();
  });
  async function fixture() {
    const user = await makeUser(); owners.push(user.id); signedIn = { id: user.id };
    for (const key of ["DEMAND_DISCOVERY_ENABLED", "DEMAND_LIVE_ENABLED", "BACKGROUND_WORKER_ENABLED"]) vi.stubEnv(key, "true");
    vi.stubEnv("BACKGROUND_WORKER_USER_ID", user.id); vi.stubEnv("BACKGROUND_WORKER_SECRET", "synthetic-research-secret-32-characters");
    vi.stubEnv("HOUSE_DATA_CAP_USD_PER_DAY", "100000"); vi.stubEnv("HOUSE_LLM_CAP_USD_PER_DAY", "100000");
    const fetch = vi.fn().mockResolvedValue(new Response(null, { status: 202 })); vi.stubGlobal("fetch", fetch);
    return { user, fetch };
  }
  function form(mode = "topic", input = "video captions", budget = "0.10") {
    const data = new FormData(); for (const [key, value] of Object.entries({ key: randomUUID(), mode, input, budget })) data.set(key, value); return data;
  }
  it.each(["topic", "product"])("queues exactly one owned %s investigation with no monitoring project or paid request", async (mode) => {
    const { user, fetch } = await fixture(); const input = form(mode, mode === "topic" ? "video captions" : "www.capcut.com");
    await expect(createResearchAction({ error: null }, input)).rejects.toThrow(/REDIRECT:\/app\/research\?run=/);
    const [run] = await db().select().from(demandRuns).where(eq(demandRuns.userId, user.id));
    expect(run).toMatchObject({ mode, budgetMicros: 100_000, spentMicros: 0, projectId: null });
    if (mode === "product") expect(run.input).toBe("https://www.capcut.com/");
    expect(await db().select().from(projects).where(eq(projects.userId, user.id))).toEqual([]);
    const queued = await db().select().from(jobs).where(eq(jobs.demandRunId, run.id)); expect(queued).toHaveLength(1);
    expect(fetch).toHaveBeenCalledOnce(); expect(fetch.mock.calls[0][0]).toMatch(/\.netlify\/functions\/queue-worker$/);
    expect(JSON.parse(fetch.mock.calls[0][1].body).jobId).toBe(queued[0].id);
  });
  it("keeps the saved key/job after dispatch failure and a repeated submission", async () => {
    const { user, fetch } = await fixture(); const input = form(); fetch.mockRejectedValueOnce(new Error("synthetic dispatch failure"));
    const first = await createResearchAction({ error: null }, input); expect(first.runId).toBeDefined(); expect(first.error).toContain("已保存");
    await expect(createResearchAction(first, input)).rejects.toThrow(/REDIRECT/);
    expect(await db().select().from(demandRuns).where(eq(demandRuns.userId, user.id))).toHaveLength(1);
    expect(fetch.mock.calls.map(([, options]) => JSON.parse(options.body).jobId)[0]).toBe(JSON.parse(fetch.mock.calls[1][1].body).jobId);
  });
  it.each(["DEMAND_DISCOVERY_ENABLED", "DEMAND_LIVE_ENABLED", "BACKGROUND_WORKER_ENABLED"])("refuses creation before mutation when %s is off", async (key) => {
    const { user, fetch } = await fixture(); vi.stubEnv(key, "false");
    expect((await createResearchAction({ error: null }, form())).error).toContain("暂未开放");
    expect(await db().select().from(demandRuns).where(eq(demandRuns.userId, user.id))).toEqual([]); expect(fetch).not.toHaveBeenCalled();
  });
  it.each(["-1", "1.01", "1e2", "", "0.0000001"])("refuses invalid budget %s without queuing", async (budget) => {
    const { user, fetch } = await fixture(); expect((await createResearchAction({ error: null }, form("topic", "captions", budget))).error).toBeTruthy();
    expect(await db().select().from(demandRuns).where(eq(demandRuns.userId, user.id))).toEqual([]); expect(fetch).not.toHaveBeenCalled();
  });
  it("rejects private URLs and malformed topic text before queue creation", async () => {
    const { user, fetch } = await fixture();
    for (const input of [form("product", "http://127.0.0.1"), form("topic", "bad\u0000topic"), form("topic", "x".repeat(501))]) {
      expect((await createResearchAction({ error: null }, input)).error).toBeTruthy();
    }
    expect(await db().select().from(demandRuns).where(eq(demandRuns.userId, user.id))).toEqual([]); expect(fetch).not.toHaveBeenCalled();
  });
  it("reports only owned records and never starts jobs or exposes normalized receipt artifacts on reads", async () => {
    const { user, fetch } = await fixture(); const other = await makeUser(); owners.push(other.id);
    const run = await createDemandRun(user.id, { mode: "topic", topic: "captions", key: randomUUID(), budgetMicros: 100_000 });
    await db().insert(demandAttempts).values({ runId: run.id, key: "test:0", kind: "data", source: "web", operation: "test", upperBoundMicros: 10,
      status: "settled", actualMicros: 0, result: { ok: true, value: { privateArtifact: "synthetic-unrendered-receipt" } } });
    const first = await getDemandReport(user.id, run.id), second = await getDemandReport(user.id, run.id);
    expect(first).toEqual(second); expect(first?.canResume).toBe(true); expect(JSON.stringify(first)).not.toContain("synthetic-unrendered-receipt");
    expect(await getDemandReport(other.id, run.id)).toBeNull(); expect(fetch).not.toHaveBeenCalled();
    expect(await db().select().from(jobs).where(eq(jobs.demandRunId, run.id))).toHaveLength(1);
  });
  it("renders the project-less real entry without creating work or requiring product onboarding", async () => {
    const { user, fetch } = await fixture();
    const html = renderToStaticMarkup(await ResearchPage({ searchParams: Promise.resolve({}) }));
    expect(html).toContain("需求主题"); expect(html).toContain("还没有研究记录");
    expect(redirect).not.toHaveBeenCalled(); expect(fetch).not.toHaveBeenCalled();
    expect(await db().select().from(demandRuns).where(eq(demandRuns.userId, user.id))).toEqual([]);
  });
  it("rejects foreign history and redacts expired input on the real route", async () => {
    const { user, fetch } = await fixture(); const run = await createDemandRun(user.id, { mode: "topic", topic: "synthetic-expiring-topic", key: randomUUID(), budgetMicros: 0 });
    const other = await makeUser(); owners.push(other.id); signedIn = { id: other.id };
    await expect(ResearchPage({ searchParams: Promise.resolve({ run: run.id }) })).rejects.toThrow("NOT_FOUND");
    signedIn = { id: user.id }; await db().update(demandRuns).set({ expiresAt: new Date(Date.now() - 1000) }).where(eq(demandRuns.id, run.id));
    const html = renderToStaticMarkup(await ResearchPage({ searchParams: Promise.resolve({ run: run.id }) }));
    expect(html).toContain("内容已到期"); expect(html).not.toContain("synthetic-expiring-topic"); expect(fetch).not.toHaveBeenCalled();
  });
  it("retries and redispatches the exact job, preserving foreign-owner and active-lease fences", async () => {
    const { user, fetch } = await fixture(); const run = await createDemandRun(user.id, { mode: "topic", topic: "captions", key: randomUUID(), budgetMicros: 100_000 });
    const [original] = await db().select().from(jobs).where(eq(jobs.demandRunId, run.id));
    expect((await resumeResearchAction(run.id)).error).toBeNull();
    const lease = (await claimDemandRun(user.id, run.id))!;
    expect((await resumeResearchAction(run.id)).error).toBeTruthy();
    await finishDemandRun(lease, "partial", "synthetic failure"); await db().update(jobs).set({ finishedAt: new Date() }).where(eq(jobs.id, original.id));
    expect((await retryResearchAction(run.id)).error).toBeNull();
    expect(fetch.mock.calls.map(([, options]) => JSON.parse(options.body).jobId)).toEqual([original.id, original.id]);
    const other = await makeUser(); owners.push(other.id); signedIn = { id: other.id }; vi.stubEnv("BACKGROUND_WORKER_USER_ID", other.id); fetch.mockClear();
    expect((await resumeResearchAction(run.id)).error).toBeTruthy(); expect((await retryResearchAction(run.id)).error).toBeTruthy(); expect(fetch).not.toHaveBeenCalled();
  });
});
