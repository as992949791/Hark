import { readFile, mkdir, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { z } from "zod";
import { TypeValidationError } from "ai";
import { profileFromPage, fastProfileFromPage } from "../src/lib/profile";
import type { generateStructured } from "../src/lib/llm";

const schema = z.object({
  version: z.literal(1),
  mode: z.enum(["full", "fast"]),
  page: z.object({ url: z.string(), title: z.string().nullish(), description: z.string().nullish(), markdown: z.string().nullish() }),
  calls: z.array(z.object({ purpose: z.string(), response: z.unknown().optional(), error: z.string().optional() })),
});

async function main() {
  const [input, ...rest] = process.argv.slice(2);
  if (!input || rest.length) throw new Error("Usage: npm run profile:replay -- <trace.json>");
  for (const key of ["OPENROUTER_API_KEY", "ANYAPI_HOUSE_API_KEY", "AI_GATEWAY_API_KEY", "HARK_PROFILE_TRACE"]) delete process.env[key];
  process.env.RUN_SCHEDULER = "false";
  process.env.SCHEDULER_SEED = "false";
  process.env.DATABASE_URL ??= "postgres://replay@127.0.0.1/replay_test";
  process.env.APP_ENCRYPTION_KEY ??= Buffer.alloc(32).toString("base64");
  const trace = schema.parse(JSON.parse(await readFile(resolve(input), "utf8")));
  const remaining = [...trace.calls];
  const generate: typeof generateStructured = async (call) => {
    const index = remaining.findIndex((item) => item.purpose === call.purpose);
    if (index < 0) throw new Error(`The trace has no remaining response for ${call.purpose}.`);
    const [entry] = remaining.splice(index, 1);
    if (entry.error) {
      if (["AI_NoObjectGeneratedError", "AI_TypeValidationError"].includes(entry.error)) {
        throw new TypeValidationError({ value: undefined, cause: new Error(`Captured ${entry.error}`) });
      }
      throw new Error(`Captured ${entry.error}`);
    }
    const result = call.schema.safeParse(entry.response);
    if (!result.success) throw new TypeValidationError({ value: entry.response, cause: result.error });
    return result.data;
  };
  // All external access is refused, even if a later refactor accidentally reaches a provider.
  globalThis.fetch = async () => { throw new Error("Network access is disabled during profile replay."); };
  const reading = await (trace.mode === "fast" ? fastProfileFromPage : profileFromPage)("offline-replay", trace.page, generate);
  const directory = resolve(".local/profile-runs");
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const output = resolve(directory, `replay-${randomUUID()}.json`);
  await writeFile(output, JSON.stringify({ input: resolve(input), reading }, null, 2), { mode: 0o600 });
  console.log(JSON.stringify({ offline: true, name: reading.name, capabilities: reading.capabilities.length, output }));
}
main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : "Replay failed."); process.exitCode = 1; });
