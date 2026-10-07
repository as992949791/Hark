import { TypeValidationError } from "ai";
import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:net";
import { mkdtemp, readFile, rm, writeFile, mkdir, copyFile, readdir, stat, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

const root = process.cwd();
const cleanup: string[] = [];
afterEach(async () => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  await Promise.all(cleanup.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});
function cli(script: string, args: string[], cwd = root, env = process.env) {
  return spawnSync(process.execPath, ["--import", "tsx", resolve(root, script), ...args], { cwd, env, encoding: "utf8", timeout: 25000 });
}
async function temporary() {
  const directory = await mkdtemp(join(tmpdir(), "hark-tools-"));
  cleanup.push(directory);
  return directory;
}
const fixture = async () => JSON.parse(await readFile(join(root, "tests/fixtures/profile-trace.json"), "utf8"));
async function replay(trace: unknown) {
  const input = join(await temporary(), "trace.json");
  await writeFile(input, JSON.stringify(trace));
  const result = cli("scripts/profile-replay.ts", [input]);
  if (result.status === 0) {
    const summary = JSON.parse(result.stdout.trim());
    cleanup.push(summary.output);
    return { result, summary, reading: JSON.parse(await readFile(summary.output, "utf8")).reading };
  }
  return { result };
}

describe("supported local commands", () => {
  it("starts the PostgreSQL helper with inherited .env.local configuration and no .env", async () => {
    const directory = await temporary();
    const helper = join(directory, "tools/local-postgres");
    await mkdir(helper, { recursive: true });
    await copyFile(join(root, "tools/local-postgres/start.mjs"), join(helper, "start.mjs"));
    await symlink(join(root, "tools/local-postgres/node_modules"), join(helper, "node_modules"));
    const portHolder = createServer();
    await new Promise<void>((done) => portHolder.listen(0, "127.0.0.1", done));
    const address = portHolder.address();
    if (!address || typeof address === "string") throw new Error("Missing test port");
    await new Promise<void>((done) => portHolder.close(() => done()));
    const url = `postgres://fixture:synthetic-password@127.0.0.1:${address.port}/helper_test`;
    await writeFile(join(directory, ".env.local"), `DATABASE_URL=${url}`);
    const child = spawn(process.execPath, [join(helper, "start.mjs")], { cwd: directory, env: { ...process.env, DATABASE_URL: url }, stdio: ["ignore", "pipe", "pipe"] });
    const exited = new Promise<void>((done) => child.once("exit", () => done()));
    try {
      await new Promise<void>((done, reject) => {
        const deadline = setTimeout(() => reject(new Error("Helper did not start")), 20000);
        child.once("error", reject);
        child.once("exit", (code) => { clearTimeout(deadline); reject(new Error(`Helper exited before ready: ${code}`)); });
        child.stdout.on("data", (data: Buffer) => { if (data.toString().includes("Local PostgreSQL is ready")) { clearTimeout(deadline); done(); } });
      });
    } finally { child.kill("SIGTERM"); await exited; }
  });
  it("refuses an occupied port without stopping its owner", async () => {
    const server = createServer();
    await new Promise<void>((done) => server.listen(0, "::", done));
    try {
      const address = server.address();
      if (!address || typeof address === "string") throw new Error("Missing test port");
      const result = cli("scripts/dev-tools.ts", ["dev"], root, { ...process.env, PORT: String(address.port) });
      expect(result.status).toBe(1);
      expect(result.stderr).toContain(`Port ${address.port} is unavailable`);
      expect(server.listening).toBe(true);
    } finally { await new Promise<void>((done) => server.close(() => done())); }
  });
  it("rejects unsupported arguments before running a tool", () => {
    const result = cli("scripts/dev-tools.ts", ["preview", "--quick"]);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Only verify accepts --quick");
  });
});

describe("offline profile replay", () => {
  it("replays a supported reading and applies existing grounding without provider keys", async () => {
    const { result, summary, reading } = await replay(await fixture());
    expect(result.status, result.stderr).toBe(0);
    expect(summary.offline).toBe(true);
    expect(reading.notBuyers).toEqual(["students wanting a free plan"]);
    expect(reading.solution).toBe("Forms with branching logic.");
  });
  it("retries schema-invalid output through the existing profile retry", async () => {
    const trace = await fixture();
    trace.calls.unshift({ purpose: "profile_fast", response: { name: "Formcraft" } });
    const { result, reading } = await replay(trace);
    expect(result.status, result.stderr).toBe(0);
    expect(reading.capabilities).toEqual(["Skip irrelevant questions"]);
  });
  it("retries a captured SDK validation failure", async () => {
    const trace = await fixture();
    trace.calls.unshift({ purpose: "profile_fast", error: "AI_NoObjectGeneratedError" });
    const { result } = await replay(trace);
    expect(result.status, result.stderr).toBe(0);
  });
  it("rejects two empty readings and refuses missing response data", async () => {
    const trace = await fixture();
    trace.calls[0].response.solution = " ";
    trace.calls[0].response.capabilities = [];
    trace.calls.push(trace.calls[0]);
    const { result } = await replay(trace);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("usable product profile");
  });
  it("refuses a trace without recorded responses", async () => {
    const trace = await fixture();
    trace.calls = [];
    const missing = await replay(trace);
    expect(missing.result.status).toBe(1);
    expect(missing.result.stderr).toContain("no remaining response");
  });
});

describe("private profile capture", () => {
  it("retains invalid model output and the successful retry in a private trace", async () => {
    const directory = await temporary();
    vi.spyOn(process, "cwd").mockReturnValue(directory);
    vi.stubEnv("HARK_PROFILE_TRACE", "true");
    vi.stubEnv("OPENROUTER_PROFILE_MODEL", "");
    vi.stubEnv("OPENROUTER_MODEL", "synthetic/model");
    const trace = await fixture();
    const generate = vi.fn().mockRejectedValueOnce(new TypeValidationError({ value: { invalid: "synthetic response" }, cause: new Error("invalid") })).mockResolvedValueOnce(trace.calls[0].response);
    const { fastProfileFromPage } = await import("@/lib/profile");
    await fastProfileFromPage("offline", trace.page, generate);
    const traces = join(directory, ".local/profile-runs");
    const [name] = await readdir(traces);
    const captured = JSON.parse(await readFile(join(traces, name), "utf8"));
    expect(captured.calls).toHaveLength(2);
    expect(captured.calls[0]).toMatchObject({ error: "AI_TypeValidationError", response: { invalid: "synthetic response" } });
    expect(captured.calls[1].response.name).toBe("Formcraft");
    expect(captured.calls.every((call: { model: string }) => call.model === "synthetic/model")).toBe(true);
    expect(captured.page).toEqual(trace.page);
  });
  it("captures the page even when analysis rejects it before generation", async () => {
    const directory = await temporary();
    vi.spyOn(process, "cwd").mockReturnValue(directory);
    vi.stubEnv("HARK_PROFILE_TRACE", "true");
    const { fastProfileFromPage } = await import("@/lib/profile");
    const generate = vi.fn();
    await expect(fastProfileFromPage("offline", { url: "https://formcraft.test", title: "Formcraft" }, generate)).rejects.toThrow("no readable product content");
    expect(generate).not.toHaveBeenCalled();
    const traces = join(directory, ".local/profile-runs");
    const [name] = await readdir(traces);
    const path = join(traces, name);
    expect(JSON.parse(await readFile(path, "utf8"))).toMatchObject({ page: { title: "Formcraft" }, calls: [] });
    expect((await stat(path)).mode & 0o777).toBe(0o600);
  });
});

describe("archive preflight", () => {
  it("verifies idempotence, interruption recovery and conflicting refs at the GitHub boundary", () => {
    const result = spawnSync("python3", ["tests/archiveScenarios.py", "scripts/archive.py"], { cwd: root, encoding: "utf8", timeout: 25000 });
    expect(result.status, result.stderr).toBe(0);
    expect(result.stderr).toContain("Ran 5 tests");
  });
  async function repository() {
    const directory = await temporary();
    await mkdir(join(directory, "scripts"));
    await copyFile(join(root, "scripts/archive.py"), join(directory, "scripts/archive.py"));
    const git = (...args: string[]) => spawnSync("git", args, { cwd: directory, encoding: "utf8" });
    git("init", "-b", "codex/test");
    git("config", "user.name", "Test"); git("config", "user.email", "test@example.com");
    git("add", "scripts/archive.py"); git("commit", "-m", "baseline");
    git("remote", "add", "origin", "https://github.com/example/hark.git");
    const archive = () => spawnSync("python3", ["scripts/archive.py", "v0.1.7-dev-tools", "--dry-run"], { cwd: directory, encoding: "utf8" });
    return { directory, git, archive };
  }
  it.each([".env.local", "backup.sqlite3", ".cache/token.json", "credentials.pem"])("refuses private staged path %s", async (path) => {
    const { directory, git, archive } = await repository();
    expect(archive().status).toBe(0);
    const file = join(directory, path);
    await mkdir(join(file, ".."), { recursive: true });
    await writeFile(file, "FAKE_KEY=public-test-placeholder");
    git("add", path);
    const rejected = archive();
    expect(rejected.status).toBe(1);
    expect(rejected.stderr).toContain("private data");
  });
  it("refuses an incomplete workspace and an unrelated branch", async () => {
    const { directory, git, archive } = await repository();
    await writeFile(join(directory, "pending.txt"), "pending");
    expect(archive().stderr).toContain("untracked files");
    await rm(join(directory, "pending.txt"));
    git("switch", "-c", "unrelated");
    expect(archive().stderr).toContain("codex/ branch");
  });
});
