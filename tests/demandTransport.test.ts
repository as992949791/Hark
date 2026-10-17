import { z } from "zod";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { walletConnection } from "@/lib/anyapi";
import { demandTransport } from "@/lib/demand/transport";
import { resetPace } from "@/lib/reddit/pace";

vi.mock("@/lib/anyapi", () => ({ walletConnection: vi.fn(async () => null) }));
const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "x-anyapi-request-id": "test-request" } });
const catalog = (sku: string, maxUsd = 0.002) => ({ id: sku, slug: sku, category: "test", name: "test", description: "synthetic catalog",
  method: "POST", path: `/v1/run/${sku}`, provider: "AnyAPI", execution: { mode: "sync" },
  pricing: { from: { model: "flat", unit: "request", maxUsd: 0.0004, maxPer1kUsd: 0.4 }, failoverMaxUsd: maxUsd, failoverMaxPer1kUsd: maxUsd * 1000 },
  lanes: [], tryEligible: false, inputSchema: {}, outputSchema: {}, latency: null });
const modelRow = { id: "test/model", context_length: 1000, pricing: { prompt: "0.000001", completion: "0.000002", request: "0", input_cache_read: "0.0000001" } };
const modelRequest = { stage: "test", system: "Return JSON", prompt: "Synthetic fixture", schema: z.object({ answer: z.string() }), maxOutputTokens: 100 };

describe("demand bounded provider transport (mock network only)", () => {
  beforeEach(() => {
    for (const key of ["DEMAND_DISCOVERY_ENABLED", "DEMAND_LIVE_ENABLED"]) vi.stubEnv(key, "true");
    vi.stubEnv("ANYAPI_HOUSE_API_KEY", "synthetic-key"); vi.stubEnv("OPENROUTER_API_KEY", "synthetic-key");
    vi.stubEnv("ANYAPI_BASE_URL", "https://api.getanyapi.com"); vi.stubEnv("OPENROUTER_PROFILE_MODEL", "test/model");
    resetPace({ inFlight: 10, perSecond: 100 });
  });
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.clearAllMocks(); });
  it("gates all access and refuses wallet fallback before network", async () => {
    const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
    vi.stubEnv("DEMAND_LIVE_ENABLED", "false"); await expect(demandTransport("owner")).rejects.toThrow(/disabled/);
    vi.stubEnv("DEMAND_LIVE_ENABLED", "true"); vi.mocked(walletConnection).mockResolvedValueOnce({} as never);
    await expect(demandTransport("owner")).rejects.toThrow(/wallet/); expect(fetch).not.toHaveBeenCalled();
  });
  it("reserves the published failover ceiling and caps the actual billed request with a stable idempotency key", async () => {
    const fetch = vi.fn().mockResolvedValueOnce(response(catalog("google.search")))
      .mockResolvedValueOnce(response({ output: { found: true, data: { results: [] } }, provider: "AnyAPI", costUsd: 0.0004, items: 0, replayed: false }));
    vi.stubGlobal("fetch", fetch);
    const transport = await demandTransport("owner"); const prepared = await transport.prepareData("google.search", { query: "captions", limit: 10 }, "stable-test-key");
    expect(prepared.upperBoundMicros).toBe(2000); expect(fetch).toHaveBeenCalledTimes(1);
    expect(await prepared.call(async () => {})).toMatchObject({ value: { results: [] }, charge: { actualMicros: 400, requestId: "test-request" } });
    const [url, init] = fetch.mock.calls[1]; expect(new URL(url).searchParams.get("max_cost_usd")).toBe("0.002");
    expect(new Headers(init.headers).get("Idempotency-Key")).toBe("stable-test-key");
  });
  it("never hides a second Reddit request behind SDK or rate-limit retries, and retains a billed failure", async () => {
    const fetch = vi.fn().mockResolvedValueOnce(response(catalog("reddit.search")))
      .mockResolvedValue(response({ error: "synthetic rate limit", code: "rate_limited", costUsd: 0.00001 }, 429));
    vi.stubGlobal("fetch", fetch);
    const transport = await demandTransport("owner"); const prepared = await transport.prepareData("reddit.search", { query: "captions" }, "test-key");
    expect(await prepared.call(async () => {})).toMatchObject({ error: expect.any(String), charge: { actualMicros: 10, requestId: "test-request" } });
    expect(fetch).toHaveBeenCalledTimes(2);
  });
  it("keeps a response with no trustworthy bill uncertain", async () => {
    const fetch = vi.fn().mockResolvedValueOnce(response(catalog("web.scrape"))).mockRejectedValueOnce(new Error("synthetic timeout"));
    vi.stubGlobal("fetch", fetch);
    const prepared = await (await demandTransport("owner")).prepareData("web.scrape", { url: "https://example.com" }, "test-key");
    await expect(prepared.call(async () => {})).rejects.toThrow(/timeout/); expect(fetch).toHaveBeenCalledTimes(2);
  });
  it("rechecks the worker fence immediately before the paid POST, after any pacing wait", async () => {
    const fetch = vi.fn().mockResolvedValueOnce(response(catalog("reddit.search")))
      .mockResolvedValue(response({ output: { found: false, data: null }, provider: "AnyAPI", costUsd: 0, items: 0, replayed: false }));
    vi.stubGlobal("fetch", fetch);
    const prepared = await (await demandTransport("owner")).prepareData("reddit.search", { query: "captions" }, "test-key");
    const fence = vi.fn(async () => { throw new Error("Synthetic expired lease"); });
    await expect(prepared.call(fence)).rejects.toThrow(/expired lease/);
    expect(fence).toHaveBeenCalledOnce(); expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("bounds the configured model by the full context and output cap, disables fallback, and keeps its actual bill", async () => {
    const fetch = vi.fn().mockResolvedValueOnce(response({ data: [modelRow] })).mockResolvedValueOnce(response({
      id: "test-model-request", usage: { cost: 0.0002, prompt_tokens: 10, completion_tokens: 20 },
      choices: [{ finish_reason: "stop", message: { content: '{"answer":"yes"}' } }],
    }));
    vi.stubGlobal("fetch", fetch);
    const prepared = await (await demandTransport("owner")).prepareModel(modelRequest, "model-key");
    expect(prepared.upperBoundMicros).toBe(1200);
    expect(await prepared.call(async () => {})).toMatchObject({ value: { answer: "yes" }, charge: { actualMicros: 200, requestId: "test-model-request", model: "test/model" } });
    const sent = JSON.parse(fetch.mock.calls[1][1].body);
    expect(sent).toMatchObject({ model: "test/model", max_tokens: 100, provider: { allow_fallbacks: false, require_parameters: true, max_price: { prompt: 1, completion: 2, request: 0 } } });
    expect(sent).not.toHaveProperty("models"); expect(sent).not.toHaveProperty("tools");
  });
  it.each(["json", "truncated"])("settles a model response with unusable %s output without a hidden generation retry", async (failure) => {
    const fetch = vi.fn().mockResolvedValueOnce(response({ data: [modelRow] })).mockResolvedValueOnce(response({
      id: "test-model-request", usage: { cost: 0.0002 }, choices: [{ finish_reason: failure === "truncated" ? "length" : "stop", message: { content: "invalid JSON" } }],
    }));
    vi.stubGlobal("fetch", fetch);
    const prepared = await (await demandTransport("owner")).prepareModel(modelRequest, "model-key");
    expect(await prepared.call(async () => {})).toMatchObject({ error: expect.any(String), charge: { actualMicros: 200 } });
    expect(fetch).toHaveBeenCalledTimes(2);
  });
  it("refuses an unknown model ceiling or unpriced extras before generation", async () => {
    const fetch = vi.fn().mockResolvedValue(response({ data: [{ ...modelRow, pricing: { ...modelRow.pricing, web_search: "0.01" } }] }));
    vi.stubGlobal("fetch", fetch);
    await expect((await demandTransport("owner")).prepareModel(modelRequest, "test-key")).rejects.toThrow(/pricing/);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("retains a known bill when optional token/receipt metadata is malformed", async () => {
    const fetch = vi.fn().mockResolvedValueOnce(response({ data: [modelRow] })).mockResolvedValueOnce(response({
      id: "bad\u0000receipt", usage: { cost: 0.0002, prompt_tokens: "bad", completion_tokens: 3_000_000_000 },
      choices: [{ finish_reason: "stop", message: { content: '{"answer":"yes"}' } }],
    }));
    vi.stubGlobal("fetch", fetch);
    const prepared = await (await demandTransport("owner")).prepareModel(modelRequest, "model-key");
    expect(await prepared.call(async () => {})).toMatchObject({ charge: { actualMicros: 200, requestId: null, inputTokens: 0, outputTokens: 0 } });
  });
});
