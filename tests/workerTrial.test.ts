import { afterEach, describe, expect, it, vi } from "vitest";
import { smallSweep, withWorkerTrial } from "@/lib/sweepScale";

describe("explicit production trial scope", () => {
  afterEach(() => { vi.unstubAllEnvs(); });

  it("keeps production requests full while the worker uses the configured small sweep", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("SWEEP_SCALE", "small");
    let finish = () => {};
    const held = new Promise<void>((resolve) => { finish = resolve; });
    const worker = withWorkerTrial(async () => {
      await held;
      return smallSweep();
    });
    expect(smallSweep()).toBe(false);
    finish();
    expect(await worker).toBe(true);
    expect(smallSweep()).toBe(false);
  });

  it("does not shrink a worker with the full setting", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("SWEEP_SCALE", "full");
    expect(await withWorkerTrial(async () => smallSweep())).toBe(false);
  });
});
