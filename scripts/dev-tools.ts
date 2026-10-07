import { spawn, type ChildProcess } from "node:child_process";
import { cp, mkdir, readFile, rm } from "node:fs/promises";
import { createServer } from "node:net";
import { fileURLToPath } from "node:url";
import { parseEnv } from "node:util";
import postgres from "postgres";

const root = fileURLToPath(new URL("../", import.meta.url));
const owned = new Set<ChildProcess>();

async function loadEnvironment() {
  const local: Record<string, string> = {};
  for (const name of [".env", ".env.local"]) {
    try { Object.assign(local, parseEnv(await readFile(`${root}/${name}`, "utf8"))); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
  }
  Object.assign(process.env, local, { ...process.env });
  process.env.RUN_SCHEDULER = "false";
  process.env.SCHEDULER_SEED = "false";

}

function start(command: string, args: string[]): ChildProcess {
  const child = spawn(command, args, { cwd: root, env: process.env, stdio: "inherit" });
  owned.add(child);
  child.once("exit", () => owned.delete(child));
  return child;
}

async function run(command: string, args: string[]) {
  await new Promise<void>((resolve, reject) => {
    const child = start(command, args);
    child.once("error", reject);
    child.once("exit", (code) => code === 0 ? resolve() : reject(new Error(`${command} failed (exit ${code}).`)));
  });
}

async function canConnect(url: string) {
  const client = postgres(url, { max: 1, connect_timeout: 2 });
  try { await client`select 1`; return true; }
  catch { return false; }
  finally { await client.end({ timeout: 1 }); }
}

async function ensureDatabase() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is missing. See docs/LOCAL_SETUP.md.");
  if (await canConnect(databaseUrl)) return;
  const url = new URL(databaseUrl);
  if (url.hostname !== "127.0.0.1") throw new Error("The configured database is unavailable; only the 127.0.0.1 helper can be started automatically.");
  const helper = start(process.execPath, ["tools/local-postgres/start.mjs"]);
  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (helper.exitCode !== null) throw new Error("Local PostgreSQL did not start. Check the helper output above.");
    if (await canConnect(databaseUrl)) return;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("Local PostgreSQL did not become ready.");
}

async function checkPort(port: number) {
  const server = createServer();
  await new Promise<void>((resolve, reject) => {
    server.once("error", () => reject(new Error(`Port ${port} is unavailable. Stop its owner or set PORT to another port.`)));
    server.listen(port, "::", () => server.close(() => resolve()));
  });
}

async function main() {
  const [action, ...args] = process.argv.slice(2);
  if (!["dev", "preview", "verify"].includes(action)) throw new Error("Usage: dev-tools.ts dev | preview | verify [--quick]");
  if (args.some((arg) => action !== "verify" || arg !== "--quick") || args.length > 1) throw new Error("Only verify accepts --quick.");
  await loadEnvironment();
  if (action === "verify") {
    process.env.HARK_PROFILE_TRACE = "false";
    await run("npm", ["run", "typecheck"]);
    await run("npm", ["run", "lint"]);
    if (args.includes("--quick")) return;
    await ensureDatabase();
    await run("npm", ["test", "--", "--maxWorkers=2", "--testTimeout=30000"]);
    await run("npm", ["run", "build"]);
    return;
  }
  const port = Number(process.env.PORT || "3000");
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("PORT must be an integer from 1 to 65535.");
  await checkPort(port);
  await ensureDatabase();
  await run("npm", ["run", "db:migrate"]);
  process.env.HARK_PROFILE_TRACE = "true";
  process.env.HOSTNAME = "::";
  process.env.PORT = String(port);
  process.env.APP_URL = `http://localhost:${port}`;
  if (action === "dev") {
    await run(process.execPath, ["node_modules/next/dist/bin/next", "dev", "--hostname", "::", "--port", String(port)]);
    return;
  }
  await run("npm", ["run", "build"]);
  await mkdir(`${root}/.next/standalone/.next`, { recursive: true });
  for (const [from, to] of [["public", "public"], [".next/static", ".next/static"]]) {
    const target = `${root}/.next/standalone/${to}`;
    await rm(target, { recursive: true, force: true });
    await cp(`${root}/${from}`, target, { recursive: true });
  }
  await run(process.execPath, [".next/standalone/server.js"]);
}

async function stopOwned(signal: NodeJS.Signals = "SIGTERM") {
  await Promise.all([...owned].map((child) => new Promise<void>((done) => {
    child.once("exit", done);
    child.kill(signal);
    const deadline = setTimeout(() => { child.kill("SIGKILL"); done(); }, 5000);
    deadline.unref();
    child.once("exit", () => clearTimeout(deadline));
  })));
}
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => { void stopOwned(signal).then(() => process.exit(signal === "SIGINT" ? 130 : 143)); });
}
main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Development tool failed.");
  process.exitCode = 1;
}).finally(() => stopOwned());
