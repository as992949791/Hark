import { NoObjectGeneratedError, TypeValidationError } from "ai";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { LlmCall } from "./llm";
import { generateStructured } from "./llm";
import { config } from "./config";

type CallTrace = { purpose: string; model?: string; prompt: string; response?: unknown; rawText?: string; error?: string; latencyMs?: number };

/** Local tools enable tracing; private page content never enters tracked fixtures automatically. */
export async function profileGenerator(page: object, mode: "full" | "fast", generate = generateStructured): Promise<typeof generateStructured> {
  if (process.env.HARK_PROFILE_TRACE !== "true") return generate;
  const directory = resolve(".local/profile-runs");
  const path = resolve(directory, `${randomUUID()}.json`);
  const trace = { version: 1, mode, page, calls: [] as CallTrace[] };
  let writing = Promise.resolve();
  const save = () => {
    writing = writing.then(async () => {
      await mkdir(directory, { recursive: true, mode: 0o700 });
      await writeFile(path, JSON.stringify(trace, null, 2), { mode: 0o600 });
    }).catch((error: unknown) => {
      console.warn(`[profile trace] Could not save the private trace: ${error instanceof Error ? error.name : "unknown error"}`);
    });
    return writing;
  };
  await save();
  return async <T>(call: LlmCall<T>): Promise<T> => {
    const entry: CallTrace = { purpose: call.purpose, model: call.model ?? config().OPENROUTER_MODEL, prompt: call.prompt };
    trace.calls.push(entry);
    await save();
    const started = Date.now();
    try {
      const result = await generate(call);
      entry.response = result;
      return result;
    } catch (error) {
      entry.error = error instanceof Error ? error.name : "unknown error";
      if (NoObjectGeneratedError.isInstance(error)) entry.rawText = error.text;
      if (TypeValidationError.isInstance(error)) entry.response = error.value;
      throw error;
    } finally {
      entry.latencyMs = Date.now() - started;
      await save();
    }
  };
}
