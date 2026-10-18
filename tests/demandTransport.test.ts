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
  it.each(["confirmed", "pending", "foreign", "wrong-sku"])("checks the authoritative request receipt for an unbilled source failure (%s)", async (mode) => {
    const fetch = vi.fn().mockResolvedValueOnce(response(catalog("web.scrape")))
      .mockResolvedValueOnce(response({ error: "unreadable source", code: "upstream_error" }, 422))
      .mockResolvedValueOnce(response({ requestId: mode === "foreign" ? "other-request" : "test-request",
        sku: mode === "wrong-sku" ? "google.search" : "web.scrape", status: "failed", settlementState: mode === "pending" ? "pending" : "not_required" }));
    vi.stubGlobal("fetch", fetch);
    const prepared = await (await demandTransport("owner")).prepareData("web.scrape", { url: "https://example.com" }, "test-key");
    if (mode === "confirmed") expect(await prepared.call(async () => {})).toMatchObject({ value: null, error: expect.any(String), charge: { actualMicros: 0, requestId: "test-request" } });
    else await expect(prepared.call(async () => {})).rejects.toThrow();
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(fetch.mock.calls[2][1]?.method ?? "GET").toBe("GET");
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
    expect(prepared.upperBoundMicros).toBe(1260);
    expect(await prepared.call(async () => {})).toMatchObject({ value: { answer: "yes" }, charge: { actualMicros: 200, requestId: "test-model-request", model: "test/model" } });
    const sent = JSON.parse(fetch.mock.calls[1][1].body);
    expect(sent).toMatchObject({ model: "test/model", max_tokens: 100, provider: { allow_fallbacks: false, require_parameters: true, max_price: { prompt: 1, completion: 2, request: 0 } } });
    expect(sent).not.toHaveProperty("models"); expect(sent).not.toHaveProperty("tools");
    expect(sent.response_format.type).toBe("json_schema");
  });
  it.each(["deepseek/deepseek-v4.1-flash", "deepseek/deepseek-v4.1-flash-1017"])("uses the official DeepSeek JSON endpoint for %s with no provider fallback", async (model) => {
    vi.stubEnv("OPENROUTER_PROFILE_MODEL", model);
    const fetch = vi.fn().mockResolvedValueOnce(response({ data: [{ ...modelRow, id: model }] }))
      .mockResolvedValueOnce(response({ usage: { cost: 0, is_byok: true, cost_details: { upstream_inference_cost: 0.0002 } },
        choices: [{ finish_reason: "stop", message: { content: '{"answer":"yes"}' } }],
      }));
    vi.stubGlobal("fetch", fetch);
    const prepared = await (await demandTransport("owner")).prepareModel(modelRequest, "model-key");
    expect(await prepared.call(async () => {})).toMatchObject({ value: { answer: "yes" }, charge: { actualMicros: 200 } });
    const sent = JSON.parse(fetch.mock.calls[1][1].body);
    expect(sent.response_format).toEqual({ type: "json_object" });
    expect(sent.provider).toMatchObject({ only: ["deepseek"], allow_fallbacks: false, require_parameters: true });
    expect(sent.reasoning).toEqual({ enabled: false });
    expect(sent.temperature).toBe(0);
    expect(sent.messages[0].content).toContain(JSON.stringify(z.toJSONSchema(modelRequest.schema)));
    expect(fetch).toHaveBeenCalledTimes(2);
  });
  it("retains the actual bill but refuses valid JSON with the wrong schema", async () => {
    const fetch = vi.fn().mockResolvedValueOnce(response({ data: [modelRow] })).mockResolvedValueOnce(response({
      usage: { cost: 0.0002 }, choices: [{ finish_reason: "stop", message: { content: '{"answer":42}' } }],
    }));
    vi.stubGlobal("fetch", fetch);
    const prepared = await (await demandTransport("owner")).prepareModel(modelRequest, "model-key");
    expect(await prepared.call(async () => {})).toMatchObject({ value: null, error: expect.any(String), charge: { actualMicros: 200 } });
    expect(fetch).toHaveBeenCalledTimes(2);
  });
  it.each([0, 0.00001])("includes BYOK upstream charges alongside the platform fee %s", async (cost) => {
    const fetch = vi.fn().mockResolvedValueOnce(response({ data: [modelRow] })).mockResolvedValueOnce(response({
      id: "test-byok-request", usage: { cost, is_byok: true, cost_details: { upstream_inference_cost: 0.0002 } },
      choices: [{ finish_reason: "stop", message: { content: '{"answer":"yes"}' } }],
    }));
    vi.stubGlobal("fetch", fetch);
    const prepared = await (await demandTransport("owner")).prepareModel(modelRequest, "model-key");
    expect(await prepared.call(async () => {})).toMatchObject({ value: { answer: "yes" }, charge: { actualMicros: cost === 0 ? 200 : 210 } });
    expect(fetch).toHaveBeenCalledTimes(2);
  });
  it.each([true, false])("counts tiny BYOK bills once and does not double count shared inference (BYOK %s)", async (is_byok) => {
    const fetch = vi.fn().mockResolvedValueOnce(response({ data: [modelRow] })).mockResolvedValueOnce(response({
      usage: { cost: is_byok ? 0 : 0.0002, is_byok, cost_details: { upstream_inference_cost: 0.00000195 } },
      choices: [{ finish_reason: "stop", message: { content: '{"answer":"yes"}' } }],
    }));
    vi.stubGlobal("fetch", fetch);
    const prepared = await (await demandTransport("owner")).prepareModel(modelRequest, "model-key");
    expect(await prepared.call(async () => {})).toMatchObject({ charge: { actualMicros: is_byok ? 2 : 200 } });
  });
  it.each([undefined, null, {}, { upstream_inference_cost: "0.01" }, { upstream_inference_cost: -0.01 }])(
    "keeps a BYOK response with unconfirmed upstream charges uncertain (%j)", async (cost_details) => {
      const fetch = vi.fn().mockResolvedValueOnce(response({ data: [modelRow] })).mockResolvedValueOnce(response({
        usage: { cost: 0, is_byok: true, cost_details }, choices: [{ finish_reason: "stop", message: { content: '{"answer":"yes"}' } }],
      }));
      vi.stubGlobal("fetch", fetch);
      const prepared = await (await demandTransport("owner")).prepareModel(modelRequest, "model-key");
      await expect(prepared.call(async () => {})).rejects.toThrow();
      expect(fetch).toHaveBeenCalledTimes(2);
    },
  );
  it("refuses an upstream bill with an unknown funding mode instead of reporting zero", async () => {
    const fetch = vi.fn().mockResolvedValueOnce(response({ data: [modelRow] })).mockResolvedValueOnce(response({
      usage: { cost: 0, cost_details: { upstream_inference_cost: 0.0002 } },
    }));
    vi.stubGlobal("fetch", fetch);
    const prepared = await (await demandTransport("owner")).prepareModel(modelRequest, "model-key");
    await expect(prepared.call(async () => {})).rejects.toThrow(/funding receipt/);
    expect(fetch).toHaveBeenCalledTimes(2);
  });
  it("rounds the combined BYOK bill once instead of rounding each charge", async () => {
    const fetch = vi.fn().mockResolvedValueOnce(response({ data: [modelRow] })).mockResolvedValueOnce(response({
      usage: { cost: 0.0000004, is_byok: true, cost_details: { upstream_inference_cost: 0.0000004 } },
      choices: [{ finish_reason: "stop", message: { content: '{"answer":"yes"}' } }],
    }));
    vi.stubGlobal("fetch", fetch);
    const prepared = await (await demandTransport("owner")).prepareModel(modelRequest, "model-key");
    expect(await prepared.call(async () => {})).toMatchObject({ charge: { actualMicros: 1 } });
  });
  it.each([200, 429])("retains BYOK charges on an unusable response (HTTP %s) without a retry", async (status) => {
    const fetch = vi.fn().mockResolvedValueOnce(response({ data: [modelRow] })).mockResolvedValueOnce(response({
      id: "test-byok-failure", usage: { cost: 0.00001, is_byok: true, cost_details: { upstream_inference_cost: 0.0002 } },
      choices: [{ finish_reason: "length", message: { content: "invalid JSON" } }],
    }, status));
    vi.stubGlobal("fetch", fetch);
    const prepared = await (await demandTransport("owner")).prepareModel(modelRequest, "model-key");
    expect(await prepared.call(async () => {})).toMatchObject({ error: expect.any(String), charge: { actualMicros: 210, requestId: "test-byok-failure" } });
    expect(fetch).toHaveBeenCalledTimes(2);
  });
  it("reserves the maximum conditional token prices and sends the same provider ceiling", async () => {
    const fetch = vi.fn().mockResolvedValueOnce(response({ data: [{ ...modelRow, pricing: { ...modelRow.pricing,
      overrides: [{ utc_days: ["saturday", "sunday"], prompt: "0.0000005" },
        { utc_start: 100, utc_end: 400, prompt: "0.000003", completion: "0.000004" }],
    } }] })).mockResolvedValueOnce(response({ usage: { cost: 0.0002 }, choices: [{ finish_reason: "stop", message: { content: '{"answer":"yes"}' } }] }));
    vi.stubGlobal("fetch", fetch);
    const prepared = await (await demandTransport("owner")).prepareModel(modelRequest, "model-key");
    expect(prepared.upperBoundMicros).toBe(3570);
    await prepared.call(async () => {});
    expect(JSON.parse(fetch.mock.calls[1][1].body).provider.max_price).toEqual({ prompt: 3, completion: 4, request: 0 });
  });
  it("ignores an unrelated model's conditional pricing when selecting the configured model", async () => {
    const fetch = vi.fn().mockResolvedValue(response({ data: [{ ...modelRow, id: "other/model", pricing: { overrides: [{ prompt: "0.1" }] } }, modelRow] }));
    vi.stubGlobal("fetch", fetch);
    const prepared = await (await demandTransport("owner")).prepareModel(modelRequest, "model-key");
    expect(prepared.upperBoundMicros).toBe(1260); expect(fetch).toHaveBeenCalledOnce();
  });
  it("inherits omitted token prices from the base tier for long-context overrides", async () => {
    const fetch = vi.fn().mockResolvedValue(response({ data: [{ ...modelRow, pricing: { ...modelRow.pricing,
      overrides: [{ min_prompt_tokens: 200_000, prompt: "0.000003" }],
    } }] }));
    vi.stubGlobal("fetch", fetch);
    expect((await (await demandTransport("owner")).prepareModel(modelRequest, "model-key")).upperBoundMicros).toBe(3360);
    expect(fetch).toHaveBeenCalledOnce();
  });
  it.each([null, {}, [{ prompt: "NaN" }], [{ request: "0.01" }], [{ input_cache_write: "0.000002" }], [{ new_charge: "0.01" }]])(
    "refuses malformed or unsupported conditional pricing %j before generation", async (overrides) => {
      const fetch = vi.fn().mockResolvedValue(response({ data: [{ ...modelRow, pricing: { ...modelRow.pricing, overrides } }] }));
      vi.stubGlobal("fetch", fetch);
      await expect((await demandTransport("owner")).prepareModel(modelRequest, "model-key")).rejects.toThrow();
      expect(fetch).toHaveBeenCalledOnce();
    },
  );
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
