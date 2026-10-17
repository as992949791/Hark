import { AnyAPI } from "@getanyapi/sdk";
import { z } from "zod";
import { config } from "@/lib/config";
import { walletConnection } from "@/lib/anyapi";
import { paced as redditPaced } from "@/lib/reddit/pace";
import { paced as xPaced } from "@/lib/x/pace";
import { DemandError, micros } from "./contracts";
import type { DemandCharge } from "./budget";
import type { DataSku } from "./sources";

export type PreparedDemandCall = { upperBoundMicros: number; call: (authorize: () => Promise<void>) => Promise<{ value: unknown; charge: DemandCharge; error?: string }> };
export type ModelRequest = { stage: string; system: string; prompt: string; schema: z.ZodType; maxOutputTokens: number };
export interface DemandTransport {
  prepareData(sku: DataSku, input: Record<string, unknown>, key: string): Promise<PreparedDemandCall>;
  prepareModel(request: ModelRequest, key: string): Promise<PreparedDemandCall>;
}

function chargedMicros(usd: unknown) {
  if (typeof usd !== "number" || !Number.isFinite(usd) || usd < 0) throw new DemandError("Provider charge is unconfirmed.");
  return micros.parse(Math.ceil(usd * 1e6 - 1e-8));
}

function modelPriceCeiling(pricing: Record<string, unknown>) {
  const { overrides, ...base } = pricing;
  const price = z.string().trim().min(1).transform(Number).pipe(z.number().nonnegative().finite());
  const tariff = z.object({ prompt: price, completion: price }).catchall(price);
  const conditional = overrides === undefined ? [] : z.array(z.record(z.string(), z.unknown())).parse(overrides);
  const conditions = new Set(["min_prompt_tokens", "utc_start", "utc_end", "utc_days"]);
  // Reserve across every published tier, without guessing which schedule will apply at dispatch.
  const tiers = [base, ...conditional.map((entry) => ({ ...base, ...Object.fromEntries(Object.entries(entry).filter(([key]) => !conditions.has(key))) }))];
  const prices = tiers.map((tier) => {
    const parsed = tariff.safeParse(tier);
    if (!parsed.success || Object.entries(parsed.data).some(([name, value]) =>
      !["prompt", "completion", "input_cache_read", "input_cache_write"].includes(name) && value !== 0) ||
      ["input_cache_read", "input_cache_write"].some((name) => parsed.data[name] !== undefined && parsed.data[name] > parsed.data.prompt)) {
      throw new DemandError("The configured model has unsupported extra pricing.");
    }
    return parsed.data;
  });
  return { prompt: Math.max(...prices.map((tier) => tier.prompt)), completion: Math.max(...prices.map((tier) => tier.completion)) };
}

/** Used only after live admission. No wallet fallback or provider credentials enter saved results. */
export async function demandTransport(userId: string): Promise<DemandTransport> {
  const settings = config();
  if (!settings.DEMAND_DISCOVERY_ENABLED || !settings.DEMAND_LIVE_ENABLED) throw new DemandError("Live demand requests are disabled.");
  if (await walletConnection(userId)) throw new DemandError("Demand research currently requires house funding; wallet research is deferred.");
  const apiKey = settings.ANYAPI_HOUSE_API_KEY;
  if (!apiKey || !settings.OPENROUTER_API_KEY) throw new DemandError("Research data/model credentials are not configured.");
  const catalog = new AnyAPI({ apiKey, baseUrl: settings.ANYAPI_BASE_URL, maxRetries: 0, maxInProgressWaitMs: 0, timeoutMs: 60_000 });
  const model = settings.OPENROUTER_PROFILE_MODEL ?? settings.OPENROUTER_MODEL;
  return {
    async prepareData(sku, input, key) {
      // Current official catalog's failover ceiling, not its cheapest advertised lane.
      const contract = await catalog.describe(sku);
      const published = chargedMicros(contract.pricing.failoverMaxUsd);
      const upperBoundMicros = sku === "twitter.search" ? Math.min(published, 1000) : sku === "twitter.tweet" ? Math.min(published, 500) : published;
      if (!upperBoundMicros) throw new DemandError("A positive endpoint ceiling is required.");
      return { upperBoundMicros, async call(authorize) {
        let receipt: { costUsd?: unknown; requestId: string | null } | undefined;
        const client = new AnyAPI({ apiKey, baseUrl: settings.ANYAPI_BASE_URL, maxRetries: 0, maxInProgressWaitMs: 0, timeoutMs: 60_000,
          fetch: async (original, init) => {
            // Shared pacing may have outlived the lease since reservation.
            await authorize();
            const url = new URL(original instanceof Request ? original.url : String(original));
            url.searchParams.set("max_cost_usd", String(upperBoundMicros / 1e6));
            const response = await fetch(url, { ...init, redirect: "error" });
            const body = await response.clone().json().catch(() => null);
            receipt = { costUsd: body?.costUsd, requestId: response.headers.get("x-anyapi-request-id") };
            return response;
          },
        });
        const run = () => client.run(sku as string, input, { idempotencyKey: key, maxRetries: 0, maxInProgressWaitMs: 0 });
        try {
          const response = sku.startsWith("reddit.") ? await redditPaced(run, { retries: false }) : sku.startsWith("twitter.") ? await xPaced(run) : await run();
          return { value: response.output?.found ? response.output.data : null,
            charge: { actualMicros: chargedMicros(response.costUsd), requestId: receipt?.requestId ?? null } };
        } catch (error) {
          if (receipt?.costUsd !== undefined) return { value: null, error: `Source request failed (${sku}).`,
            charge: { actualMicros: chargedMicros(receipt.costUsd), requestId: receipt.requestId } };
          if (receipt?.requestId) {
            const snapshot = await catalog.requests.get(receipt.requestId).catch(() => null);
            const unpaid = z.object({ requestId: z.literal(receipt.requestId), sku: z.literal(sku),
              status: z.literal("failed"), settlementState: z.literal("not_required") }).safeParse(snapshot);
            if (unpaid.success) return { value: null, error: `Source request failed (${sku}).`,
              charge: { actualMicros: 0, requestId: receipt.requestId } };
          }
          throw error;
        }
      } };
    },
    async prepareModel(request) {
      const jsonSchema = z.toJSONSchema(request.schema);
      // The official Flash endpoint supports JSON mode rather than native strict schemas.
      const deepseekJsonMode = model === "deepseek/deepseek-v4.1-flash";
      const system = deepseekJsonMode ? `${request.system}\nReturn a JSON object matching this JSON schema:\n${JSON.stringify(jsonSchema)}` : request.system;
      if (Buffer.byteLength(request.prompt + system) > 120_000) throw new DemandError("Research model input is too large.");
      const response = await fetch("https://openrouter.ai/api/v1/models", { signal: AbortSignal.timeout(15_000), redirect: "error" });
      if (!response.ok) throw new DemandError("Cannot establish the model price ceiling.");
      const listing = await response.json();
      const selected = z.object({ data: z.array(z.object({ id: z.string() }).passthrough()) }).parse(listing).data.find((item) => item.id === model);
      if (!selected) throw new DemandError("The configured model has no known ceiling.");
      const row = z.object({ context_length: z.number().int().positive(), pricing: z.record(z.string(), z.unknown()) }).parse(selected);
      const { prompt: promptPrice, completion: completionPrice } = modelPriceCeiling(row.pricing);
      // Reserve the entire context allowance: no unverified character-to-token estimate.
      // BYOK can add a 5% OpenRouter fee above its allowance; reserve it before routing is known.
      const upperBoundMicros = Math.max(1, chargedMicros((row.context_length * promptPrice + request.maxOutputTokens * completionPrice) * 1.05));
      return { upperBoundMicros, async call(authorize) {
        await authorize();
        const result = await fetch("https://openrouter.ai/api/v1/chat/completions", { method: "POST", redirect: "error", signal: AbortSignal.timeout(120_000),
          headers: { authorization: `Bearer ${settings.OPENROUTER_API_KEY}`, "content-type": "application/json" },
          body: JSON.stringify({ model, messages: [{ role: "system", content: system }, { role: "user", content: request.prompt }],
            stream: false, max_tokens: request.maxOutputTokens, usage: { include: true },
            ...(deepseekJsonMode ? { reasoning: { enabled: false } } : {}),
            provider: { ...(deepseekJsonMode ? { only: ["deepseek"] } : {}), allow_fallbacks: false, require_parameters: true,
              max_price: { prompt: promptPrice * 1e6, completion: completionPrice * 1e6, request: 0 } },
            response_format: deepseekJsonMode ? { type: "json_object" } : { type: "json_schema", json_schema: { name: "research", strict: true, schema: jsonSchema } } }),
        });
        const body = await result.json();
        const usage = z.object({ cost: z.number().nonnegative().finite(), is_byok: z.boolean().optional() }).passthrough().parse(body.usage);
        if (usage.is_byok === undefined && usage.cost_details !== undefined) throw new DemandError("Model funding receipt is unconfirmed.");
        const upstreamUsd = usage.is_byok === true
          ? z.object({ upstream_inference_cost: z.number().nonnegative().finite() }).parse(usage.cost_details).upstream_inference_cost : 0;
        const actualMicros = chargedMicros(usage.cost + upstreamUsd);
        const tokenCount = (value: unknown) => typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 2_147_483_647 ? value : 0;
        const charge = { actualMicros, requestId: typeof body.id === "string" && body.id.isWellFormed() && !body.id.includes("\u0000") ? body.id : null, model,
          inputTokens: tokenCount(body.usage?.prompt_tokens), outputTokens: tokenCount(body.usage?.completion_tokens) };
        if (!result.ok || body.error || body.choices?.[0]?.finish_reason !== "stop") return { value: null, charge, error: "Model request did not finish successfully." };
        let value: unknown;
        try { value = JSON.parse(body.choices[0].message.content); }
        catch { return { value: null, charge, error: "Model returned invalid JSON." }; }
        const parsed = request.schema.safeParse(value);
        return parsed.success ? { value: parsed.data, charge } : { value: null, charge, error: "Model returned data outside the requested schema." };
      } };
    },
  };
}
