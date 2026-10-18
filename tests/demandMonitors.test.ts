import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterEach, expect, it, vi } from "vitest";
import { db } from "@/db";
import { alerts, demandDocuments, demandMonitorRuns, demandMonitors, demandRuns, demandSignals, jobs, users } from "@/db/schema";
import { deliverDemandMonitorRun, processDemandMonitorRun } from "@/lib/demand/monitor-notifications";
import { sendEmail } from "@/lib/alerts/email";
import { runScheduledTick, scheduledJobAllowed } from "@/jobs/scheduled";
import { runBackgroundRequest } from "@/jobs/serverless";
import * as provider from "@/lib/demand/transport";
import { createDemandRun } from "@/lib/demand/runs";
import { admitDemandMonitors, deleteDemandMonitor, listDemandMonitors, saveDemandMonitor, setDemandMonitorEnabled } from "@/lib/demand/monitors";
import { describeDb, makeProject, makeUser } from "./fixtures/db";

const owners: string[] = [];
vi.mock("@/lib/alerts/email", () => ({ sendEmail: vi.fn() }));
vi.mock("node:dns/promises", () => ({ lookup: vi.fn(async () => [{ address: "93.184.216.34", family: 4 }]) }));
afterEach(async () => { for (const id of owners.splice(0)) await db().delete(users).where(eq(users.id, id)); vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.restoreAllMocks(); vi.clearAllMocks(); });
async function fixture() {
  vi.stubEnv("DEMAND_DISCOVERY_ENABLED", "true");
  const user = await makeUser(); owners.push(user.id);
  const project = await makeProject(user.id);
  const [channel] = await db().insert(alerts).values({ projectId: project.id, channel: "email", target: "test@example.com", cadence: "daily" }).returning();
  const run = await createDemandRun(user.id, { key: randomUUID(), mode: "topic", topic: "video caption workflows", budgetMicros: 100_000 });
  await db().update(demandRuns).set({ status: "complete" }).where(eq(demandRuns.id, run.id));
  return { user, channel, run, input: { key: randomUUID(), sourceRunId: run.id, emailChannelId: channel.id, perRunBudgetMicros: 100_000, totalBudgetMicros: 200_000 } };
}
function enableRuntime(userId: string) {
  for (const key of ["DEMAND_LIVE_ENABLED", "DEMAND_MONITORING_ENABLED", "SCHEDULED_WORKER_ENABLED", "BACKGROUND_WORKER_ENABLED"]) vi.stubEnv(key, "true");
  vi.stubEnv("BACKGROUND_WORKER_SECRET", "x".repeat(32)); vi.stubEnv("BACKGROUND_WORKER_USER_ID", userId);
  vi.stubEnv("ANYAPI_HOUSE_API_KEY", "test-only"); vi.stubEnv("OPENROUTER_API_KEY", "test-only");
  vi.stubEnv("HOUSE_DATA_CAP_USD_PER_DAY", "10"); vi.stubEnv("HOUSE_LLM_CAP_USD_PER_DAY", "10");
  vi.stubEnv("SMTP_URL", "smtp://invalid.example"); vi.stubEnv("ALERTS_FROM_EMAIL", "hark@example.com");
}
describeDb("saved demand monitors", () => {
  it("holds pending delivery while paused and refuses a removed email channel", async () => {
    const f = await fixture(); enableRuntime(f.user.id);
    const monitor = await saveDemandMonitor(f.user.id, f.input); await setDemandMonitorEnabled(f.user.id, monitor.id, true);
    const [job] = await admitDemandMonitors(f.user.id);
    await db().update(demandRuns).set({ status: "complete", finishedAt: new Date() }).where(eq(demandRuns.id, job.demandRunId!));
    await db().update(demandMonitorRuns).set({ processedAt: new Date(), deliveryState: "pending", newSignalIds: [randomUUID()] }).where(eq(demandMonitorRuns.runId, job.demandRunId!));
    await setDemandMonitorEnabled(f.user.id, monitor.id, false); await deliverDemandMonitorRun(f.user.id, job.demandRunId!);
    expect(sendEmail).not.toHaveBeenCalled();
    await setDemandMonitorEnabled(f.user.id, monitor.id, true); await db().delete(alerts).where(eq(alerts.id, f.channel.id));
    await deliverDemandMonitorRun(f.user.id, job.demandRunId!);
    expect(sendEmail).not.toHaveBeenCalled();
    expect((await listDemandMonitors(f.user.id))[0]).toMatchObject({ enabled: false, reason: "channel", deliveryState: "pending" });
  });
  it("runs two fresh scheduled investigations through the actual pipeline and sends only the second new result", async () => {
    const f = await fixture(); enableRuntime(f.user.id); vi.stubEnv("SCHEDULED_PROJECT_IDS", ""); vi.stubEnv("X_LEADS", "false");
    vi.stubEnv("HOUSE_DATA_CAP_USD_PER_DAY", "1000000"); vi.stubEnv("HOUSE_LLM_CAP_USD_PER_DAY", "1000000");
    let round = 0; const searches: string[] = [];
    const original = "I fix every caption manually. It takes two hours per video.";
    const fresh = "I use another editor to fix subtitles. The export crashes every day.";
    const transport: provider.DemandTransport = {
      async prepareData(sku, input) { return { upperBoundMicros: 100, async call() {
        const charge = { actualMicros: 10, requestId: randomUUID() };
        if (sku === "google.search") { searches.push(String(input.query)); return { value: { results: [{ link: `https://forum.example.com/case-${round}`, title: "Caption workflow", snippet: "A creator needs better subtitles" }] }, charge }; }
        if (sku === "web.scrape") return { value: { url: input.url, markdown: round === 0 ? original : fresh }, charge };
        return { value: { posts: [] }, charge };
      } }; },
      async prepareModel(request) { return { upperBoundMicros: 100, async call() {
        const charge = { actualMicros: 10, requestId: randomUUID(), model: "synthetic" };
        if (request.stage === "query-plan") return { value: { web: ["caption pain forum", "subtitle editor complaints"], reddit: "caption complaints", x: "captions lang:en" }, charge };
        const payload = JSON.parse(request.prompt.split("UNTRUSTED_DATA_JSON:\n")[1]);
        const documents = payload.documents as { id: string; body: string }[];
        if (request.stage.startsWith("extract-")) return { value: { signals: documents.map(doc => ({ documentId: doc.id, quote: doc.body, relevant: true, explanation: "用户正在解决字幕问题。", requestType: "pain", productFit: null, fitFact: null })) }, charge };
        return { value: { documents: documents.map(doc => ({ documentId: doc.id, role: "user_experience", contextQuote: doc.body })),
          cases: payload.candidates.map((candidate: { id: string; documentId: string; quote: string }) => ({ signalIds: [candidate.id], problem: "手动修正字幕的负担", explanation: "当前方案存在明确局限。", requestType: "pain", requirements: [], fitReason: null, excludedProductQuote: null,
            analysis: [{ kind: "workaround", summary: "手动修正或换用其他工具。", documentId: candidate.documentId, quote: candidate.quote }] })), rejected: [] }, charge };
      } }; },
    };
    vi.spyOn(provider, "demandTransport").mockResolvedValue(transport);
    const fetch = vi.fn().mockResolvedValue(new Response(null, { status: 202 })); vi.stubGlobal("fetch", fetch);
    const monitor = await saveDemandMonitor(f.user.id, f.input); await setDemandMonitorEnabled(f.user.id, monitor.id, true);
    for (round = 0; round < 2; round++) {
      await db().update(demandMonitors).set({ nextRunAt: new Date(0) }).where(eq(demandMonitors.id, monitor.id));
      expect(await runScheduledTick()).toBe(1);
      const body = fetch.mock.calls.at(-1)![1].body;
      await runBackgroundRequest(new Request("https://hark.example.com/.netlify/functions/queue-worker", { method: "POST", headers: { authorization: `Bearer ${"x".repeat(32)}` }, body }));
      const latest = (await listDemandMonitors(f.user.id))[0];
      const [result] = await db().select().from(demandRuns).where(eq(demandRuns.id, latest.latestRunId!));
      expect(result.error).toBeNull(); expect(latest.latestStatus).toBe("complete");
      const signals = await db().select().from(demandSignals).where(eq(demandSignals.runId, latest.latestRunId!));
      expect(signals[0].assessment?.analysis?.[0].quote).toBe(round === 0 ? original : fresh);
      expect(sendEmail).toHaveBeenCalledTimes(round);
    }
    expect(searches).toHaveLength(4);
  });
  it("expires pending mail without dispatching expired content or treating old settled history as a new failure", async () => {
    const f = await fixture(); enableRuntime(f.user.id); vi.stubEnv("SCHEDULED_PROJECT_IDS", "");
    const monitor = await saveDemandMonitor(f.user.id, f.input); await setDemandMonitorEnabled(f.user.id, monitor.id, true);
    const [job] = await admitDemandMonitors(f.user.id);
    await db().update(demandRuns).set({ status: "expired", expiresAt: new Date(0), finishedAt: new Date(), spentMicros: 1000 }).where(eq(demandRuns.id, job.demandRunId!));
    await db().update(demandMonitorRuns).set({ processedAt: new Date(), deliveryState: "pending", newSignalIds: [randomUUID()] }).where(eq(demandMonitorRuns.runId, job.demandRunId!));
    const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
    expect(await runScheduledTick()).toBe(0);
    const [record] = await db().select().from(demandMonitorRuns).where(eq(demandMonitorRuns.runId, job.demandRunId!));
    expect(record).toMatchObject({ deliveryState: "expired", newSignalIds: [] });
    expect(fetch).not.toHaveBeenCalled(); expect(sendEmail).not.toHaveBeenCalled();
    expect((await listDemandMonitors(f.user.id))[0].enabled).toBe(true);
  });
  it("pauses creation on unknown charges and preserves the original run and bill after deletion", async () => {
    const f = await fixture(); enableRuntime(f.user.id);
    const monitor = await saveDemandMonitor(f.user.id, f.input); await setDemandMonitorEnabled(f.user.id, monitor.id, true);
    const [job] = await admitDemandMonitors(f.user.id);
    await db().update(demandRuns).set({ status: "blocked", reservedMicros: 1000, spentMicros: 2000 }).where(eq(demandRuns.id, job.demandRunId!));
    expect(await admitDemandMonitors(f.user.id)).toEqual([]);
    expect((await listDemandMonitors(f.user.id))[0]).toMatchObject({ enabled: false, reason: "review" });
    await deleteDemandMonitor(f.user.id, monitor.id);
    expect(await listDemandMonitors(f.user.id)).toEqual([]);
    const [preserved] = await db().select().from(demandRuns).where(eq(demandRuns.id, job.demandRunId!));
    expect(preserved).toMatchObject({ spentMicros: 2000, reservedMicros: 1000 });
  });
  it("cancels unstarted work when deleting a monitor and refuses a foreign email target", async () => {
    const f = await fixture(); enableRuntime(f.user.id);
    const other = await makeUser(); owners.push(other.id); const foreign = await makeProject(other.id);
    const [channel] = await db().insert(alerts).values({ projectId: foreign.id, channel: "email", target: "foreign@example.com", cadence: "daily" }).returning();
    await expect(saveDemandMonitor(f.user.id, { ...f.input, emailChannelId: channel.id })).rejects.toThrow("Owned email");
    const monitor = await saveDemandMonitor(f.user.id, f.input); await setDemandMonitorEnabled(f.user.id, monitor.id, true);
    const [job] = await admitDemandMonitors(f.user.id); await deleteDemandMonitor(f.user.id, monitor.id);
    const [run] = await db().select().from(demandRuns).where(eq(demandRuns.id, job.demandRunId!));
    expect(run.status).toBe("blocked");
    expect((await db().select().from(jobs).where(eq(jobs.id, job.id)))[0].finishedAt).not.toBeNull();
  });
  it("routes only enabled owned monitor jobs through the scheduled background worker, including notification-only retries", async () => {
    const f = await fixture(); enableRuntime(f.user.id); vi.stubEnv("SCHEDULED_PROJECT_IDS", "");
    const monitor = await saveDemandMonitor(f.user.id, f.input); await setDemandMonitorEnabled(f.user.id, monitor.id, true);
    const fetch = vi.fn().mockResolvedValue(new Response(null, { status: 202 })); vi.stubGlobal("fetch", fetch);
    expect(await runScheduledTick()).toBe(1);
    const requestBody = JSON.parse(fetch.mock.calls[0][1].body);
    expect(requestBody.scheduled).toBe(true);
    const [linked] = await db().select().from(demandMonitorRuns).where(eq(demandMonitorRuns.monitorId, monitor.id));
    // A terminal run needing mail is a real worker path, but cannot call the paid pipeline.
    await db().update(demandRuns).set({ status: "complete", finishedAt: new Date() }).where(eq(demandRuns.id, linked.runId));
    await db().update(demandMonitorRuns).set({ processedAt: new Date(), deliveryState: "pending", newSignalIds: [randomUUID()] }).where(eq(demandMonitorRuns.runId, linked.runId));
    const request = () => new Request("https://hark.example.com/.netlify/functions/queue-worker", { method: "POST", headers: { authorization: `Bearer ${"x".repeat(32)}` }, body: JSON.stringify(requestBody) });
    await setDemandMonitorEnabled(f.user.id, monitor.id, false);
    await runBackgroundRequest(request()); expect(sendEmail).not.toHaveBeenCalled();
    await setDemandMonitorEnabled(f.user.id, monitor.id, true);
    await Promise.all([runBackgroundRequest(request()), runBackgroundRequest(request())]);
    expect(sendEmail).toHaveBeenCalledOnce();
    expect(await scheduledJobAllowed({ kind: "demand_research", projectId: null, demandRunId: f.run.id })).toBe(false);
  });
  it("baselines old results, ignores repeated sources/quotes, and retries delivery without repeating research", async () => {
    const f = await fixture(); enableRuntime(f.user.id);
    const monitor = await saveDemandMonitor(f.user.id, { ...f.input, totalBudgetMicros: 1_000_000 });
    await setDemandMonitorEnabled(f.user.id, monitor.id, true);
    const finish = async (url: string, quote: string) => {
      await db().update(demandMonitors).set({ nextRunAt: new Date(0) }).where(eq(demandMonitors.id, monitor.id));
      const [job] = await admitDemandMonitors(f.user.id);
      const [doc] = await db().insert(demandDocuments).values({ runId: job.demandRunId!, purpose: "demand", source: "web", url,
        canonicalUrl: url, outcome: "retrieved", body: quote, contentHash: randomUUID() }).returning();
      const [signal] = await db().insert(demandSignals).values({ runId: job.demandRunId!, documentId: doc.id, quoteStart: 0, quoteEnd: quote.length,
        quote, explanation: "真实用户需求。", requestType: "pain", assessment: { version: 1, problem: "字幕问题", fitReason: null, requirements: [], evidence: [{ documentId: doc.id, quoteStart: 0, quoteEnd: quote.length, quote, author: null }] } }).returning();
      await db().update(demandRuns).set({ status: "complete", finishedAt: new Date(), spentMicros: 1000 }).where(eq(demandRuns.id, job.demandRunId!));
      await processDemandMonitorRun(f.user.id, job.demandRunId!);
      return { runId: job.demandRunId!, signal };
    };
    const first = await finish("https://forum.example.com/old", "I manually correct all captions.");
    await deliverDemandMonitorRun(f.user.id, first.runId);
    expect(sendEmail).not.toHaveBeenCalled();
    const repeated = await finish("https://forum.example.com/old", "I manually correct all captions again.");
    await deliverDemandMonitorRun(f.user.id, repeated.runId);
    expect(sendEmail).not.toHaveBeenCalled();
    const syndicated = await finish("https://another.example.com/repost", "I manually correct all captions.");
    await deliverDemandMonitorRun(f.user.id, syndicated.runId);
    expect(sendEmail).not.toHaveBeenCalled();
    const fresh = await finish("https://forum.example.com/fresh", "My captions are wrong and fixing them takes two hours.");
    vi.mocked(sendEmail).mockRejectedValueOnce(new Error("private SMTP credentials must not be stored"));
    await deliverDemandMonitorRun(f.user.id, fresh.runId);
    let [record] = await db().select().from(demandMonitorRuns).where(eq(demandMonitorRuns.runId, fresh.runId));
    expect(record).toMatchObject({ deliveryState: "pending", newSignalIds: [fresh.signal.id], deliveryError: "邮件暂未发送，等待重试。" });
    await Promise.all([deliverDemandMonitorRun(f.user.id, fresh.runId), deliverDemandMonitorRun(f.user.id, fresh.runId)]);
    expect(sendEmail).toHaveBeenCalledTimes(2);
    expect(vi.mocked(sendEmail).mock.calls[1][0]).toMatchObject({ to: "test@example.com", subject: "Hark · 1 条新增需求证据" });
    expect(vi.mocked(sendEmail).mock.calls[1][0].html).not.toContain(fresh.signal.quote);
    [record] = await db().select().from(demandMonitorRuns).where(eq(demandMonitorRuns.runId, fresh.runId));
    expect(record.deliveryState).toBe("sent");
    await processDemandMonitorRun(f.user.id, fresh.runId); await deliverDemandMonitorRun(f.user.id, fresh.runId);
    expect(sendEmail).toHaveBeenCalledTimes(2);
  });
  it("saves paused and idempotently, and never creates scheduled work on reads or with default-off controls", async () => {
    const f = await fixture();
    const monitor = await saveDemandMonitor(f.user.id, f.input);
    expect(monitor.enabled).toBe(false);
    expect((await saveDemandMonitor(f.user.id, f.input)).id).toBe(monitor.id);
    expect(await admitDemandMonitors(f.user.id)).toEqual([]);
    expect(await listDemandMonitors(f.user.id)).toHaveLength(1);
    expect(await db().select().from(demandMonitorRuns)).not.toContainEqual(expect.objectContaining({ monitorId: monitor.id }));
    const other = await makeUser(); owners.push(other.id);
    expect(await listDemandMonitors(other.id)).toEqual([]);
    await expect(saveDemandMonitor(other.id, f.input)).rejects.toThrow();
    await expect(setDemandMonitorEnabled(other.id, monitor.id, false)).rejects.toThrow();
  });
  it("atomically admits one fresh run per monitor and reserves its whole ceiling against a finite lifetime budget", async () => {
    const f = await fixture(); enableRuntime(f.user.id);
    const monitor = await saveDemandMonitor(f.user.id, f.input);
    await setDemandMonitorEnabled(f.user.id, monitor.id, true);
    const [a, b] = await Promise.all([admitDemandMonitors(f.user.id), admitDemandMonitors(f.user.id)]);
    expect([...a, ...b]).toHaveLength(1);
    const [association] = await db().select().from(demandMonitorRuns).where(eq(demandMonitorRuns.monitorId, monitor.id));
    const [run] = await db().select().from(demandRuns).where(eq(demandRuns.id, association.runId));
    expect(run).toMatchObject({ mode: "topic", input: f.run.input, sourceRunId: null, budgetMicros: 100_000 });
    await db().update(demandRuns).set({ status: "complete", spentMicros: 150_000 }).where(eq(demandRuns.id, run.id));
    await db().update(demandMonitors).set({ nextRunAt: new Date(0) }).where(eq(demandMonitors.id, monitor.id));
    expect(await admitDemandMonitors(f.user.id)).toEqual([]);
    expect((await listDemandMonitors(f.user.id))[0]).toMatchObject({ enabled: false, reason: "budget" });
  });
});
