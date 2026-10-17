import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { afterEach, expect, it, vi } from "vitest";
import { db } from "@/db";
import { demandAttempts, demandDocuments, demandRuns, demandSignals, jobs, llmUsage, projects, usageLedger, users } from "@/db/schema";
import { describeDb, makeProject, makeUser } from "./fixtures/db";
import { claimDemandRun, createDemandRun, expireDemandRuns, finishDemandRun, getDemandEvidence, getDemandRun, listDemandRuns, retryDemandRun } from "@/lib/demand/runs";
import { executeDemandAttempt, reconcileDemandAttempt, reserveDemandAttempt, settleDemandAttempt } from "@/lib/demand/budget";

describeDb("demand research foundation", () => {
  const owners: string[] = [];
  afterEach(async () => {
    for (const id of owners.splice(0)) await db().delete(users).where(eq(users.id, id));
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  async function owner() {
    const user = await makeUser(); owners.push(user.id);
    vi.stubEnv("DEMAND_DISCOVERY_ENABLED", "true");
    vi.stubEnv("DEMAND_LIVE_ENABLED", "true");
    vi.stubEnv("HOUSE_DATA_CAP_USD_PER_DAY", "100000");
    vi.stubEnv("HOUSE_LLM_CAP_USD_PER_DAY", "100000");
    return user.id;
  }

  async function active(budgetMicros = 100_000) {
    const userId = await owner();
    const run = await createDemandRun(userId, { mode: "topic", topic: "video captions", budgetMicros, key: randomUUID() });
    const lease = (await claimDemandRun(userId, run.id))!;
    return { userId, run, lease };
  }

  const attempt = (key = randomUUID(), upperBoundMicros = 60_000) => ({ key, kind: "data" as const, source: "web" as const, operation: `test.demand.${randomUUID()}`, upperBoundMicros });
  const result = (actualMicros = 20_000) => ({ value: "source text", charge: { actualMicros, requestId: randomUUID() } });

  it("owns topic runs without creating a product and keeps reads isolated", async () => {
    const userId = await owner();
    const otherId = await owner();
    const run = await createDemandRun(userId, { mode: "topic", topic: "video captions", budgetMicros: 100_000, key: randomUUID() });
    expect(run.projectId).toBeNull();
    expect((await getDemandRun(userId, run.id))?.input).toBe("video captions");
    expect(await getDemandRun(otherId, run.id)).toBeNull();
    expect(await listDemandRuns(otherId)).toEqual([]);
    expect(await getDemandEvidence(otherId, run.id)).toEqual({ documents: [], signals: [] });
    await expect(claimDemandRun(otherId, run.id)).rejects.toThrow(/not found/);
    await expect(retryDemandRun(otherId, run.id)).rejects.toThrow(/not found/);
    const [job] = await db().select().from(jobs).where(eq(jobs.demandRunId, run.id));
    await getDemandRun(userId, run.id); await listDemandRuns(userId);
    expect((await db().select().from(jobs).where(eq(jobs.demandRunId, run.id)))).toEqual([job]);
  });

  it("defaults off and rejects invalid input without queuing", async () => {
    const userId = await owner();
    vi.stubEnv("DEMAND_DISCOVERY_ENABLED", "false");
    await expect(createDemandRun(userId, { mode: "topic", topic: "video", budgetMicros: 0, key: randomUUID() })).rejects.toThrow(/disabled/);
    vi.stubEnv("DEMAND_DISCOVERY_ENABLED", "true");
    await expect(createDemandRun(userId, { mode: "product", url: "file:///etc/passwd", budgetMicros: 0, key: randomUUID() })).rejects.toThrow();
    expect(await listDemandRuns(userId)).toEqual([]);
  });

  it("creates a new-product run without a project, profile call or automatic discovery", async () => {
    const userId = await owner();
    const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
    const run = await createDemandRun(userId, { mode: "product", url: "https://capcut.com/#intro", budgetMicros: 100_000, key: randomUUID() });
    expect(run.input).toBe("https://capcut.com/");
    expect(run.projectId).toBeNull(); expect(run.profileSnapshot).toBeNull();
    expect(await db().select().from(projects).where(eq(projects.userId, userId))).toEqual([]);
    expect(fetch).not.toHaveBeenCalled();
    const rows = await db().select().from(jobs).where(eq(jobs.demandRunId, run.id));
    expect(rows.map((row) => [row.kind, row.projectId])).toEqual([["demand_research", null]]);
  });

  it("snapshots only the owner's matching prepared product and rejects a foreign/mismatched reference", async () => {
    const userId = await owner(); const other = await owner();
    const project = await makeProject(userId, { url: "https://capcut.com/", pain: "captions", solution: "automatic captions", targetUsers: "creators" });
    const foreign = await makeProject(other, { url: project.url });
    const input = { mode: "product" as const, url: project.url!, budgetMicros: 100_000, key: randomUUID() };
    await expect(createDemandRun(userId, { ...input, projectId: foreign.id })).rejects.toThrow(/not found/);
    await expect(createDemandRun(userId, { ...input, projectId: project.id, url: "https://other.test" })).rejects.toThrow(/not found/);
    const run = await createDemandRun(userId, { ...input, projectId: project.id });
    expect(run.profileSnapshot?.version).toBe(project.profileVersion);
    await db().update(projects).set({ pain: "changed", profileVersion: 2 }).where(eq(projects.id, project.id));
    expect((await getDemandRun(userId, run.id))?.profileSnapshot?.pain).toBe("captions");
  });

  it("serializes duplicate clicks and keeps different null-project jobs separate", async () => {
    const userId = await owner();
    const input = { mode: "topic" as const, topic: "video captions", budgetMicros: 100_000, key: randomUUID() };
    const rows = await Promise.all([createDemandRun(userId, input), createDemandRun(userId, input)]);
    expect(rows[0].id).toBe(rows[1].id);
    const second = await createDemandRun(userId, { ...input, key: randomUUID() });
    expect(second.id).not.toBe(rows[0].id);
    expect(await db().select().from(jobs).where(eq(jobs.demandRunId, rows[0].id))).toHaveLength(1);
    await expect(createDemandRun(userId, { ...input, topic: "other" })).rejects.toThrow(/request key/);
  });

  it("bounds an owner's active runs", async () => {
    const userId = await owner();
    for (let i = 0; i < 3; i++) await createDemandRun(userId, { mode: "topic", topic: "video", budgetMicros: 0, key: randomUUID() });
    await expect(createDemandRun(userId, { mode: "topic", topic: "video", budgetMicros: 0, key: randomUUID() })).rejects.toThrow(/Finish existing/);
  });

  it("does not expose a lease on duplicate creation and does not revive expired inputs", async () => {
    const userId = await owner();
    const input = { mode: "topic" as const, topic: "video", budgetMicros: 1, key: randomUUID() };
    const run = await createDemandRun(userId, input);
    await claimDemandRun(userId, run.id);
    expect((await createDemandRun(userId, input)).leaseToken).toBeNull();
    await db().update(demandRuns).set({ expiresAt: new Date(Date.now() - 1000) }).where(eq(demandRuns.id, run.id));
    await expect(createDemandRun(userId, input)).rejects.toThrow(/expired/);
  });

  it.each(["live", "run", "daily"])("refuses %s zero/off admission before transport", async (scope) => {
    const { lease } = await active(scope === "run" ? 0 : 100_000);
    if (scope === "live") vi.stubEnv("DEMAND_LIVE_ENABLED", "false");
    if (scope === "daily") vi.stubEnv("HOUSE_DATA_CAP_USD_PER_DAY", "0");
    const call = vi.fn(async () => result());
    await expect(executeDemandAttempt(lease, attempt(), call)).rejects.toThrow();
    expect(call).not.toHaveBeenCalled();
  });

  it("refuses unknown ceilings, foreign leases and a disabled feature before transport", async () => {
    const { lease } = await active(); const call = vi.fn(async () => result());
    await expect(executeDemandAttempt(lease, { ...attempt(), upperBoundMicros: Number.NaN }, call)).rejects.toThrow();
    await expect(executeDemandAttempt({ ...lease, userId: await owner() }, attempt(), call)).rejects.toThrow(/not found/);
    vi.stubEnv("DEMAND_DISCOVERY_ENABLED", "false");
    await expect(executeDemandAttempt(lease, attempt(), call)).rejects.toThrow(/disabled/);
    expect(call).not.toHaveBeenCalled();
  });

  it("serializes reservation races and refuses a second purchase while one is in flight", async () => {
    const { lease, userId, run } = await active();
    const results = await Promise.allSettled([reserveDemandAttempt(lease, attempt()), reserveDemandAttempt(lease, attempt())]);
    expect(results.filter((item) => item.status === "fulfilled")).toHaveLength(1);
    expect((await getDemandRun(userId, run.id))?.reservedMicros).toBe(60_000);
    await expect(finishDemandRun(lease, "complete")).rejects.toThrow(/Outstanding/);
  });

  it("settles once, records the real charge and permits only the remaining budget", async () => {
    const { lease, userId, run } = await active(); const input = attempt();
    const reserved = await reserveDemandAttempt(lease, input); const paid = result(20_000).charge;
    await settleDemandAttempt(lease, reserved.id, paid);
    await settleDemandAttempt(lease, reserved.id, paid);
    await expect(settleDemandAttempt(lease, reserved.id, { ...paid, actualMicros: 1 })).rejects.toThrow(/cannot be changed/);
    expect((await getDemandRun(userId, run.id))?.spentMicros).toBe(20_000);
    expect(await db().select().from(usageLedger).where(eq(usageLedger.demandAttemptId, reserved.id))).toHaveLength(1);
    await expect(reserveDemandAttempt(lease, { ...input, key: "another", upperBoundMicros: 80_001 })).rejects.toThrow(/budget/);
    const call = vi.fn(async () => result());
    await expect(executeDemandAttempt(lease, input, call)).rejects.toThrow(/already exists/);
    expect(call).not.toHaveBeenCalled();
  });

  it("records model charges with request identity in the attempt and enforces attempt count", async () => {
    const { lease, run } = await active();
    await db().update(demandRuns).set({ maxAttempts: 1 }).where(eq(demandRuns.id, run.id));
    await executeDemandAttempt(lease, { ...attempt(), kind: "model" }, async () => ({ value: "analysis", charge: { actualMicros: 12_000, requestId: "receipt-model", inputTokens: 100, outputTokens: 20, model: "synthetic" } }));
    const [line] = await db().select().from(llmUsage).where(eq(llmUsage.demandRunId, run.id));
    expect([line.projectId, line.costUsd, line.inputTokens, line.outputTokens]).toEqual([null, "0.012000", 100, 20]);
    const [saved] = await db().select().from(demandAttempts).where(eq(demandAttempts.runId, run.id));
    expect(saved.requestId).toBe("receipt-model");
    await expect(reserveDemandAttempt(lease, attempt())).rejects.toThrow(/attempt limit/);
  });

  it("retains an uncertain reservation after timeout and requires receipt reconciliation before retry", async () => {
    const { lease, run, userId } = await active();
    await expect(executeDemandAttempt(lease, attempt(), async () => { throw new Error("timeout"); })).rejects.toThrow("timeout");
    const [saved] = await db().select().from(demandAttempts).where(eq(demandAttempts.runId, run.id));
    expect(saved.status).toBe("uncertain");
    expect((await getDemandRun(userId, run.id))?.reservedMicros).toBe(60_000);
    await expect(retryDemandRun(userId, run.id)).rejects.toThrow(/Reconcile/);
    await reconcileDemandAttempt(userId, run.id, saved.id, { actualMicros: 10_000, requestId: "receipt-late" });
    const job = await retryDemandRun(userId, run.id);
    expect(job.demandRunId).toBe(run.id);
    expect((await getDemandRun(userId, run.id))?.spentMicros).toBe(10_000);
    expect(await db().select().from(jobs).where(eq(jobs.demandRunId, run.id))).toHaveLength(1);
  });

  it("fences stale workers and turns an abandoned purchase into an uncertain charge", async () => {
    const { lease, run, userId } = await active();
    await reserveDemandAttempt(lease, attempt());
    await db().update(demandRuns).set({ leaseExpiresAt: new Date(Date.now() - 1000) }).where(eq(demandRuns.id, run.id));
    expect(await claimDemandRun(userId, run.id)).toBeNull();
    await expect(finishDemandRun(lease, "complete")).rejects.toThrow(/lease/);
    expect((await getDemandRun(userId, run.id))?.status).toBe("blocked");
  });

  it("only one worker can hold the run and expired workers cannot publish over a new lease", async () => {
    const { run, userId, lease } = await active();
    expect(await claimDemandRun(userId, run.id)).toBeNull();
    await db().update(demandRuns).set({ leaseExpiresAt: new Date(Date.now() - 1000) }).where(eq(demandRuns.id, run.id));
    const claims = await Promise.all([claimDemandRun(userId, run.id), claimDemandRun(userId, run.id)]);
    expect(claims.filter(Boolean)).toHaveLength(1);
    await expect(finishDemandRun(lease, "complete")).rejects.toThrow(/lease/);
  });

  it("retains the actual over-ceiling charge and blocks further work", async () => {
    const { lease, run, userId } = await active();
    await expect(executeDemandAttempt(lease, attempt(), async () => result(110_000))).rejects.toThrow(/actual charge was retained/);
    const stored = await getDemandRun(userId, run.id);
    expect([stored?.status, stored?.spentMicros, stored?.reservedMicros]).toEqual(["blocked", 110_000, 0]);
    expect((await db().select().from(usageLedger).where(eq(usageLedger.demandRunId, run.id)))[0].costUsd).toBe("0.110000");
  });

  it("preserves X gates and sub-caps for data and model requests", async () => {
    const { lease } = await active(); const call = vi.fn(async () => result());
    const input = { ...attempt(), source: "x" as const, operation: "twitter.search" };
    vi.stubEnv("X_LEADS", "false");
    await expect(executeDemandAttempt(lease, input, call)).rejects.toThrow(/X requests/);
    vi.stubEnv("X_LEADS", "true");
    vi.stubEnv("HOUSE_X_DATA_CAP_USD_PER_DAY", "0");
    await expect(executeDemandAttempt(lease, input, call)).rejects.toThrow(/X daily budget/);
    vi.stubEnv("HOUSE_X_LLM_CAP_USD_PER_DAY", "0");
    await expect(executeDemandAttempt(lease, { ...input, kind: "model" }, call)).rejects.toThrow(/X daily budget/);
    expect(call).not.toHaveBeenCalled();
  });

  it("retains run-owned charges when its optional product project is deleted", async () => {
    const userId = await owner();
    const project = await makeProject(userId, { url: "https://capcut.com/", pain: "captions", solution: "automatic captions", targetUsers: "creators" });
    const run = await createDemandRun(userId, { mode: "product", url: project.url!, projectId: project.id, budgetMicros: 100_000, key: randomUUID() });
    const lease = (await claimDemandRun(userId, run.id))!; const input = attempt();
    await executeDemandAttempt(lease, input, async () => result());
    await db().delete(projects).where(eq(projects.id, project.id));
    const { houseDataSpend } = await import("@/lib/spend");
    expect(await houseDataSpend({ skus: [input.operation] })).toBeCloseTo(0.02);
    expect((await getDemandRun(userId, run.id))?.projectId).toBeNull();
    expect(await db().select().from(usageLedger).where(eq(usageLedger.demandRunId, run.id))).toHaveLength(1);
  });

  it("expires evidence and snapshots without erasing run charges or enabling another read", async () => {
    const { lease, run, userId } = await active(); const input = attempt();
    await executeDemandAttempt(lease, input, async () => result());
    const [document] = await db().insert(demandDocuments).values({ runId: run.id, purpose: "demand", source: "web", url: "https://forum.test/1", canonicalUrl: "https://forum.test/1", body: "need captions", contentHash: "synthetic", outcome: "retrieved" }).returning();
    await db().insert(demandSignals).values({ runId: run.id, documentId: document.id, quoteStart: 0, quoteEnd: 13, quote: "need captions", explanation: "需要字幕", requestType: "tool" });
    await db().update(demandRuns).set({ expiresAt: new Date(Date.now() - 1000), progress: "private text", themes: [] }).where(eq(demandRuns.id, run.id));
    expect((await getDemandRun(userId, run.id))?.input).toBeNull();
    expect(await getDemandEvidence(userId, run.id)).toEqual({ documents: [], signals: [] });
    await expireDemandRuns();
    expect(await db().select().from(demandSignals).where(eq(demandSignals.runId, run.id))).toEqual([]);
    const saved = await getDemandRun(userId, run.id);
    expect([saved?.status, saved?.spentMicros, saved?.progress]).toEqual(["expired", 20_000, null]);
    const { houseDataSpend } = await import("@/lib/spend");
    expect(await houseDataSpend({ skus: [input.operation] })).toBeCloseTo(0.02);
    await expect(retryDemandRun(userId, run.id)).rejects.toThrow(/cannot be retried/);
  });

  it("rejects ledger rows without an owner association and evidence from a different run", async () => {
    const { lease, run, userId } = await active();
    const other = await createDemandRun(userId, { mode: "topic", topic: "another", budgetMicros: 1, key: randomUUID() });
    const saved = await reserveDemandAttempt(lease, attempt());
    await expect(db().insert(usageLedger).values({ sku: "synthetic" })).rejects.toThrow();
    await expect(db().insert(usageLedger).values({ sku: "synthetic", demandRunId: other.id, demandAttemptId: saved.id })).rejects.toThrow();
    const [document] = await db().insert(demandDocuments).values({ runId: run.id, purpose: "demand", source: "web", url: "https://forum.test/1", canonicalUrl: "https://forum.test/1", outcome: "failed" }).returning();
    await expect(db().insert(demandSignals).values({ runId: other.id, documentId: document.id, quoteStart: 0, quoteEnd: 5, quote: "wrong", explanation: "wrong", requestType: "tool" })).rejects.toThrow();
    expect(await db().select().from(usageLedger).where(and(eq(usageLedger.demandRunId, other.id)))).toEqual([]);
  });
});
