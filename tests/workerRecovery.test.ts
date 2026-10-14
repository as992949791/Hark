import { spawn, type ChildProcess } from "node:child_process";
import { once } from "node:events";
import { fileURLToPath } from "node:url";
import { eq, inArray } from "drizzle-orm";
import { afterEach, expect, it, vi } from "vitest";
import { db } from "@/db";
import { jobs, users } from "@/db/schema";
import { HEARTBEAT_MS, LEASE_MS } from "@/jobs/lease";
import { JOB_HANDLERS } from "@/jobs/registry";
import { claimNextJob, runClaimedJob } from "@/jobs/runner";
import { describeDb, makeProject, makeUser } from "./fixtures/db";
import { PAID_KEYS } from "./testDatabase";

const children = new Set<ChildProcess>();
const ownedUsers: string[] = [];

describeDb("interrupted worker recovery", () => {
  afterEach(async () => {
    vi.useRealTimers(); vi.restoreAllMocks();
    delete JOB_HANDLERS.recovery_fixture;
    for (const child of children) {
      if (child.exitCode === null && child.signalCode === null) {
        const stopped = once(child, "exit");
        child.kill("SIGKILL"); await stopped;
      }
    }
    children.clear();
    if (ownedUsers.length) await db().delete(users).where(inArray(users.id, ownedUsers.splice(0)));
  });

  async function fixture() {
    const user = await makeUser(); ownedUsers.push(user.id);
    const project = await makeProject(user.id);
    const [job] = await db().insert(jobs).values({
      projectId: project.id, kind: "recovery_fixture", runAt: new Date("2005-01-01T00:00:00Z"),
    }).returning();
    return { project, job };
  }
  async function stored(id: string) {
    const [row] = await db().select().from(jobs).where(eq(jobs.id, id)); return row;
  }

  it("recovers a killed process only after lease expiry, with one concurrent winner", async () => {
    const { project, job } = await fixture();
    const began = new Date("2005-01-01T00:00:01Z");
    const env: NodeJS.ProcessEnv = { ...process.env, RUN_SCHEDULER: "false", SCHEDULER_SEED: "false", SCHEDULED_WORKER_ENABLED: "false" };
    for (const key of [...PAID_KEYS, "SMTP_URL", "AZURE_EMAIL_CONNECTION_STRING", "ALERTS_FROM_EMAIL"]) delete env[key];
    const child = spawn(process.execPath, ["--import", "tsx",
      fileURLToPath(new URL("./fixtures/interrupted-worker.ts", import.meta.url)),
      project.id, job.id, began.toISOString(),
    ], { env, stdio: ["ignore", "pipe", "pipe"] });
    children.add(child);
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("Fixture worker did not start")), 10_000);
      child.once("error", (error) => { clearTimeout(timer); reject(error); });
      child.once("exit", () => { clearTimeout(timer); reject(new Error("Fixture worker exited before interruption")); });
      child.stdout!.on("data", (data: Buffer) => {
        if (data.toString().includes("holding")) { clearTimeout(timer); resolve(); }
      });
    });
    const stopped = once(child, "exit"); child.kill("SIGKILL");
    expect((await stopped)[1]).toBe("SIGKILL");
    expect((await stored(job.id)).finishedAt).toBeNull();
    const scope = { projectId: project.id, jobId: job.id };
    expect(await claimNextJob(new Date(began.getTime() + LEASE_MS - 1), undefined, scope)).toBeNull();
    // Advance the eligibility clock, rather than waiting for a platform timeout.
    const expired = new Date(began.getTime() + LEASE_MS + 1000);
    const claims = await Promise.all([claimNextJob(expired, undefined, scope), claimNextJob(expired, undefined, scope)]);
    const winners = claims.filter((row) => row !== null);
    expect(winners).toHaveLength(1);
    expect(winners[0]!.id).toBe(job.id);
    const run = vi.fn(async () => {}); JOB_HANDLERS.recovery_fixture = run;
    await runClaimedJob(winners[0]!);
    expect(run).toHaveBeenCalledOnce();
    expect(await claimNextJob(expired, undefined, scope)).toBeNull();
    expect(await stored(job.id)).toMatchObject({ error: null, finishedAt: expect.any(Date) });
  });

  it("survives a failed heartbeat and renews on the next interval", async () => {
    const { project, job } = await fixture();
    const claimed = await claimNextJob(new Date(), undefined, { projectId: project.id, jobId: job.id });
    expect(claimed).not.toBeNull();
    const update = vi.spyOn(db(), "update");
    const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.useFakeTimers({ toFake: ["setInterval"] });
    JOB_HANDLERS.recovery_fixture = async () => {
      update.mockImplementationOnce(() => { throw Object.assign(new Error("Synthetic connection reset"), { code: "ECONNRESET" }); });
      await vi.advanceTimersByTimeAsync(HEARTBEAT_MS);
      await vi.advanceTimersByTimeAsync(HEARTBEAT_MS);
      await vi.waitFor(async () => expect((await stored(job.id)).startedAt!.getTime()).toBeGreaterThan(claimed!.startedAt!.getTime()), { timeout: 10_000 });
    };
    await runClaimedJob(claimed!);
    expect(warning).toHaveBeenCalledOnce();
    expect(await stored(job.id)).toMatchObject({ error: null, finishedAt: expect.any(Date) });
  });
});
