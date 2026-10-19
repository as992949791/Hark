import { randomUUID } from "node:crypto";
import { createServer, type Socket } from "node:net";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { eq } from "drizzle-orm";
import { afterEach, expect, it, vi } from "vitest";
import { db } from "@/db";
import { alerts, demandAttempts, demandMonitorRuns, demandRuns, jobs, projects, users } from "@/db/schema";
import { runScheduledTick } from "@/jobs/scheduled";
import { runBackgroundRequest } from "@/jobs/serverless";
import { createDemandRun } from "@/lib/demand/runs";
import { listDemandMonitors, saveDemandMonitor, setDemandMonitorEnabled } from "@/lib/demand/monitors";
import { getDemandReport } from "@/lib/demand/report";
import * as provider from "@/lib/demand/transport";
import { ResearchResults } from "@/components/research/ResearchResults";
import { describeDb, makeProject, makeUser } from "./fixtures/db";

vi.mock("node:dns/promises", () => ({ lookup: vi.fn(async () => [{ address: "93.184.216.34", family: 4 }]) }));
vi.mock("@/components/research/RunControl", () => ({ RunControl: () => createElement("button", {}, "重试") }));
const owners: string[] = [];
afterEach(async () => {
  vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.unstubAllEnvs();
  for (const owner of owners.splice(0)) await db().delete(users).where(eq(users.id, owner));
});

/** Test-only SMTP receiver. Actual Nodemailer uses TCP; nothing listens beyond loopback. */
async function localInbox() {
  const messages: string[] = [], recipients: string[] = [], sockets = new Set<Socket>();
  let rejectNext = false, attempts = 0;
  const server = createServer(socket => {
    sockets.add(socket); socket.on("error", () => {}); socket.on("close", () => sockets.delete(socket));
    socket.write("220 localhost synthetic inbox\r\n");
    let pending = "", data: string[] | null = null;
    socket.on("data", chunk => {
      pending += chunk.toString();
      let end: number;
      while ((end = pending.indexOf("\r\n")) !== -1) {
        const line = pending.slice(0, end); pending = pending.slice(end + 2);
        if (data !== null) {
          if (line !== ".") { data.push(line); continue; }
          attempts++;
          if (rejectNext) { rejectNext = false; socket.write("451 synthetic delivery unavailable\r\n"); }
          else { messages.push(data.join("\r\n")); socket.write("250 accepted\r\n"); }
          data = null; continue;
        }
        if (/^EHLO|^HELO/.test(line)) socket.write("250 localhost\r\n");
        else if (/^MAIL FROM:/.test(line)) socket.write("250 sender accepted\r\n");
        else if (/^RCPT TO:/.test(line)) { recipients.push(line); socket.write("250 recipient accepted\r\n"); }
        else if (line === "DATA") { data = []; socket.write("354 send message\r\n"); }
        else if (line === "QUIT") socket.end("221 bye\r\n");
        else socket.write("250 ok\r\n");
      }
    });
  });
  await new Promise<void>(done => server.listen(0, "127.0.0.1", done));
  const address = server.address(); if (!address || typeof address === "string") throw new Error("No test SMTP port");
  return { url: `smtp://127.0.0.1:${address.port}`, messages, recipients, get attempts() { return attempts; }, reject() { rejectNext = true; },
    close: async () => { for (const socket of sockets) socket.destroy(); await new Promise<void>(done => server.close(() => done())); },
  };
}

describeDb("provider-free scheduled monitoring acceptance", () => {
  it.each(["topic", "product"] as const)("accepts %s baseline, due time, duplicates, SMTP recovery and budget exhaustion through the real worker", async mode => {
    const inbox = await localInbox();
    try {
      const user = await makeUser(); owners.push(user.id);
      const project = await makeProject(user.id);
      const [channel] = await db().insert(alerts).values({ projectId: project.id, channel: "email", target: "owner@example.com", cadence: "daily" }).returning();
      for (const key of ["DEMAND_DISCOVERY_ENABLED", "DEMAND_LIVE_ENABLED", "DEMAND_MONITORING_ENABLED", "BACKGROUND_WORKER_ENABLED", "SCHEDULED_WORKER_ENABLED"]) vi.stubEnv(key, "true");
      for (const key of ["HOUSE_DATA_CAP_USD_PER_DAY", "HOUSE_LLM_CAP_USD_PER_DAY"]) vi.stubEnv(key, "1000000");
      vi.stubEnv("BACKGROUND_WORKER_SECRET", "s".repeat(32)); vi.stubEnv("BACKGROUND_WORKER_USER_ID", user.id);
      vi.stubEnv("ANYAPI_HOUSE_API_KEY", "synthetic-unused"); vi.stubEnv("OPENROUTER_API_KEY", "synthetic-unused");
      vi.stubEnv("AZURE_EMAIL_CONNECTION_STRING", ""); vi.stubEnv("SMTP_URL", inbox.url); vi.stubEnv("ALERTS_FROM_EMAIL", "hark@example.com");
      vi.stubEnv("APP_URL", "https://hark.example.com"); vi.stubEnv("SCHEDULED_PROJECT_IDS", ""); vi.stubEnv("X_LEADS", "false");
      const source = await createDemandRun(user.id, { key: randomUUID(), budgetMicros: 100_000, ...(mode === "product" ? { mode, url: "https://editor.example.com/" } : { mode, topic: "caption editing pain" }) });
      await db().update(demandRuns).set({ status: "complete" }).where(eq(demandRuns.id, source.id));
      const monitor = await saveDemandMonitor(user.id, { key: randomUUID(), sourceRunId: source.id, emailChannelId: channel.id, perRunBudgetMicros: 100_000, totalBudgetMicros: 100_200 });
      await setDemandMonitorEnabled(user.id, monitor.id, true);
      // Only Date advances. TCP and timers run normally, without waiting actual days.
      vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date(Date.now() + 5000));
      let round = 0, providerCalls = 0;
      const profile = "Editor makes automatic captions for creators.";
      const bodies = ["I manually fix every caption. Correction takes two hours.", "I use another editor for subtitles. Its exports crash daily."];
      const transport: provider.DemandTransport = {
        async prepareData(sku, input) { return { upperBoundMicros: 100, async call() {
          providerCalls++; const charge = { actualMicros: 10, requestId: randomUUID() };
          if (sku === "google.search") return { value: { results: [{ link: `https://forum.example.com/case-${round < 2 ? 0 : 1}`, title: "Caption problem", snippet: "A creator's editing difficulty" }] }, charge };
          if (sku === "web.scrape") return { value: { url: input.url, markdown: input.url === "https://editor.example.com/" ? profile : bodies[round < 2 ? 0 : 1] }, charge };
          return { value: { posts: [] }, charge };
        } }; },
        async prepareModel(request) { return { upperBoundMicros: 100, async call() {
          providerCalls++; const charge = { actualMicros: 10, requestId: randomUUID(), model: "synthetic" };
          if (request.stage === "profile") return { value: { name: { value: "Editor", quote: profile }, pain: null, solution: { value: "automatic captions", quote: profile }, targetUsers: null }, charge };
          if (request.stage === "query-plan") return { value: { web: ["caption pain forum", "subtitle export complaints"], reddit: "caption complaints", x: "captions lang:en" }, charge };
          const payload = JSON.parse(request.prompt.split("UNTRUSTED_DATA_JSON:\n")[1]);
          const docs = payload.documents as { id: string; body: string }[];
          if (request.stage.startsWith("extract-")) return { value: { signals: docs.map(doc => ({ documentId: doc.id, quote: doc.body, relevant: true, explanation: "用户明确描述字幕处理中的困难。", requestType: "pain", productFit: mode === "product" ? "unknown" : null, fitFact: null })) }, charge };
          return { value: { documents: docs.map(doc => ({ documentId: doc.id, role: "user_experience", contextQuote: doc.body })),
            cases: payload.candidates.map((candidate: { id: string; documentId: string; quote: string }) => ({ signalIds: [candidate.id], problem: "字幕处理的困难", explanation: "现有字幕工作流存在明确局限。", requestType: "pain",
              requirements: mode === "product" ? [{ documentId: candidate.documentId, quote: candidate.quote, productFact: null, status: "unknown" }] : [],
              fitReason: mode === "product" ? "尚不能确认产品能解决该问题。" : null, excludedProductQuote: null,
              analysis: [{ kind: "workaround", summary: "使用手动校对或其他编辑器。", documentId: candidate.documentId, quote: candidate.quote }] })), rejected: [] }, charge };
        } }; },
      };
      vi.spyOn(provider, "demandTransport").mockResolvedValue(transport);
      const requests: string[] = [];
      vi.stubGlobal("fetch", vi.fn(async (url: string, init: RequestInit) => {
        if (url !== "https://hark.example.com/.netlify/functions/queue-worker") throw new Error("External network forbidden");
        requests.push(String(init.body)); return new Response(null, { status: 202 });
      }));
      const tick = async () => {
        const before = requests.length, count = await runScheduledTick();
        for (const body of requests.slice(before)) await runBackgroundRequest(new Request("https://hark.example.com/.netlify/functions/queue-worker", {
          method: "POST", headers: { authorization: `Bearer ${"s".repeat(32)}` }, body,
        }));
        return count;
      };
      for (round = 0; round < 3; round++) {
        if (round) vi.setSystemTime(Date.now() + 86_400_000);
        if (round === 2) inbox.reject();
        expect(await tick()).toBe(1);
        const latest = (await listDemandMonitors(user.id))[0];
        expect(latest.latestStatus).toBe("complete");
        expect(latest.deliveryState).toBe(round < 2 ? "none" : "pending");
        expect(inbox.messages).toHaveLength(0);
        const result = (await getDemandReport(user.id, latest.latestRunId!))!;
        expect(result.run.sourceRunId).toBeNull(); expect(result.run.reservedMicros).toBe(0);
        expect(result.run.spentMicros).toBe(result.attempts.length * 10);
        for (const view of ["signals", "themes"] as const) {
          const html = renderToStaticMarkup(createElement(ResearchResults, { report: result, tab: view, enabled: false }));
          expect(html).toContain(bodies[round < 2 ? 0 : 1]); expect(html).toContain("原文未明确说明");
        }
        if (round < 2) {
          const calls = providerCalls;
          expect(await tick()).toBe(0);
          vi.setSystemTime(Date.now() + 86_400_000 - 1); expect(await tick()).toBe(0);
          expect(providerCalls).toBe(calls); vi.setSystemTime(Date.now() - (86_400_000 - 1));
        }
      }
      const callsBeforeRetry = providerCalls, runId = (await listDemandMonitors(user.id))[0].latestRunId!;
      expect(inbox.attempts).toBe(1);
      expect(await tick()).toBe(1); expect(providerCalls).toBe(callsBeforeRetry);
      expect(inbox.attempts).toBe(2); expect(inbox.messages).toHaveLength(1);
      expect(inbox.recipients).toEqual(["RCPT TO:<owner@example.com>", "RCPT TO:<owner@example.com>"]);
      const delivered = inbox.messages[0].replace(/Content-Transfer-Encoding: base64\r\n\r\n([A-Za-z0-9+/=\r\n]+)/g,
        (_header, encoded: string) => Buffer.from(encoded.replace(/\s/g, ""), "base64").toString("utf8")).replace(/=\r\n/g, "").replace(/=3D/g, "=");
      expect(delivered).toContain(`/app/research?run=${runId}`);
      expect(delivered).not.toContain(bodies[1]);
      expect((await listDemandMonitors(user.id))[0].deliveryState).toBe("sent");
      expect(await tick()).toBe(0); expect(providerCalls).toBe(callsBeforeRetry); expect(inbox.messages).toHaveLength(1);
      vi.setSystemTime(Date.now() + 86_400_000);
      expect(await tick()).toBe(0); expect((await listDemandMonitors(user.id))[0]).toMatchObject({ enabled: false, reason: "budget" });
      expect(await db().select().from(demandMonitorRuns).where(eq(demandMonitorRuns.monitorId, monitor.id))).toHaveLength(3);
      expect((await db().select().from(demandAttempts).where(eq(demandAttempts.runId, runId))).every(attempt => attempt.status === "settled")).toBe(true);
      expect((await db().select().from(jobs).where(eq(jobs.demandRunId, runId)))[0].finishedAt).not.toBeNull();
      expect(await db().select().from(projects).where(eq(projects.userId, user.id))).toHaveLength(1);
    } finally { await inbox.close(); }
  });
});
