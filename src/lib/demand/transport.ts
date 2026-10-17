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
          throw error;
        }
      } };
    },
    async prepareModel(request) {
      if (Buffer.byteLength(request.prompt + request.system) > 120_000) throw new DemandError("Research model input is too large.");
      const response = await fetch("https://openrouter.ai/api/v1/models", { signal: AbortSignal.timeout(15_000), redirect: "error" });
      if (!response.ok) throw new DemandError("Cannot establish the model price ceiling.");
      const listing = await response.json();
      const row = z.object({ data: z.array(z.object({ id: z.string(), context_length: z.number().int().positive(),
        pricing: z.record(z.string(), z.string()) })) }).parse(listing).data.find((item) => item.id === model);
      if (!row) throw new DemandError("The configured model has no known ceiling.");
      const promptPrice = Number(row.pricing.prompt), completionPrice = Number(row.pricing.completion);
      if (![promptPrice, completionPrice].every((price) => Number.isFinite(price) && price >= 0) ||
        Object.entries(row.pricing).some(([name, price]) => !["prompt", "completion", "input_cache_read", "input_cache_write"].includes(name) && Number(price) !== 0) ||
        ["input_cache_read", "input_cache_write"].some((name) => row.pricing[name] !== undefined && !(Number(row.pricing[name]) <= promptPrice))) {
        throw new DemandError("The configured model has unsupported extra pricing.");
      }
      // Reserve the entire context allowance: no unverified character-to-token estimate.
      const upperBoundMicros = Math.max(1, chargedMicros(row.context_length * promptPrice + request.maxOutputTokens * completionPrice));
      return { upperBoundMicros, async call(authorize) {
        await authorize();
        const result = await fetch("https://openrouter.ai/api/v1/chat/completions", { method: "POST", redirect: "error", signal: AbortSignal.timeout(120_000),
          headers: { authorization: `Bearer ${settings.OPENROUTER_API_KEY}`, "content-type": "application/json" },
          body: JSON.stringify({ model, messages: [{ role: "system", content: request.system }, { role: "user", content: request.prompt }],
            stream: false, max_tokens: request.maxOutputTokens, usage: { include: true },
            provider: { allow_fallbacks: false, require_parameters: true, max_price: { prompt: promptPrice * 1e6, completion: completionPrice * 1e6, request: 0 } },
            response_format: { type: "json_schema", json_schema: { name: "research", strict: true, schema: z.toJSONSchema(request.schema) } } }),
        });
        const body = await result.json();
        const actualMicros = chargedMicros(body.usage?.cost);
        const tokenCount = (value: unknown) => typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 2_147_483_647 ? value : 0;
        const charge = { actualMicros, requestId: typeof body.id === "string" && body.id.isWellFormed() && !body.id.includes("\u0000") ? body.id : null, model,
          inputTokens: tokenCount(body.usage?.prompt_tokens), outputTokens: tokenCount(body.usage?.completion_tokens) };
        if (!result.ok || body.error || body.choices?.[0]?.finish_reason !== "stop") return { value: null, charge, error: "Model request did not finish successfully." };
        try { return { value: JSON.parse(body.choices[0].message.content), charge }; }
        catch { return { value: null, charge, error: "Model returned invalid JSON." }; }
      } };
    },
  };
}
