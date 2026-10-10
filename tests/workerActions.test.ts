import { and, eq } from "drizzle-orm";
import { afterEach, expect, it, vi } from "vitest";
import { db } from "@/db";
import { jobs, projects } from "@/db/schema";
import { describeDb, makeProject, makeUser } from "./fixtures/db";

let signedIn = { id: "" };
const buildProfile = vi.fn();
const redirect = vi.fn();
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect, unstable_rethrow: vi.fn() }));
vi.mock("@/lib/auth", () => ({ requireLocalUser: async () => signedIn }));
vi.mock("@/lib/profile", () => ({ buildProfile }));

describeDb("authenticated worker action retries", () => {
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.clearAllMocks(); });

  async function fixture() {
    const user = await makeUser(); signedIn = { id: user.id };
    const project = await makeProject(user.id, { url: "https://formcraft.test" });
    vi.stubEnv("SELF_HOSTED", "true");
    vi.stubEnv("BACKGROUND_WORKER_ENABLED", "true");
    vi.stubEnv("BACKGROUND_WORKER_USER_ID", user.id);
    vi.stubEnv("BACKGROUND_WORKER_SECRET", "synthetic-worker-secret-32-characters");
    const fetch = vi.fn().mockResolvedValueOnce(new Response(null, { status: 503 }))
      .mockResolvedValue(new Response(null, { status: 202 }));
    vi.stubGlobal("fetch", fetch);
    return { project, fetch };
  }

  const queued = (projectId: string, kind: string) => db().select().from(jobs)
    .where(and(eq(jobs.projectId, projectId), eq(jobs.kind, kind)));

  it("retries a saved profile's brief without bumping its version again", async () => {
    const { project, fetch } = await fixture();
    const { saveProfileAction } = await import("@/app/app/product/actions");
    const form = new FormData(); form.set("projectId", project.id);
    for (const key of ["name", "url", "pain", "solution", "targetUsers"] as const) {
      form.set(key, key === "name" ? "Renamed form builder" : project[key] ?? "");
    }
    const first = await saveProfileAction({ error: null, saved: false }, form);
    expect(first.error).toMatch(/was queued/);
    const second = await saveProfileAction(first, form);
    expect(second).toEqual({ error: null, saved: true });
    const [stored] = await db().select().from(projects).where(eq(projects.id, project.id));
    expect(stored.profileVersion).toBe(project.profileVersion + 1);
    const rows = await queued(project.id, "brief"); expect(rows).toHaveLength(1);
    expect(fetch.mock.calls.map(([, init]) => JSON.parse(init.body).jobId)).toEqual([rows[0].id, rows[0].id]);
  });

  it("retries rebuild dispatch without a second paid profile call", async () => {
    const { project, fetch } = await fixture();
    const { rebuildProfileAction } = await import("@/app/app/product/actions");
    const form = new FormData(); form.set("projectId", project.id);
    await expect(rebuildProfileAction(form)).rejects.toThrow(/was queued/);
    await rebuildProfileAction(form);
    expect(buildProfile).toHaveBeenCalledOnce();
    const rows = await queued(project.id, "discovery_initial"); expect(rows).toHaveLength(1);
    expect(fetch.mock.calls.map(([, init]) => JSON.parse(init.body).jobId)).toEqual([rows[0].id, rows[0].id]);
  });

  it("dispatches the Product scan button and preserves its job when dispatch fails", async () => {
    const { project, fetch } = await fixture();
    const { scanAndOpenLeadsAction } = await import("@/app/app/product/actions");
    const form = new FormData(); form.set("projectId", project.id);
    await expect(scanAndOpenLeadsAction(form)).rejects.toThrow(/was queued/);
    await scanAndOpenLeadsAction(form);
    const rows = await queued(project.id, "scan"); expect(rows).toHaveLength(1);
    expect(fetch.mock.calls.map(([, init]) => JSON.parse(init.body).jobId)).toEqual([rows[0].id, rows[0].id]);
    expect(redirect).toHaveBeenCalledOnce();
  });

  it("redispatches a tab's queued job on reopen after its first dispatch failed", async () => {
    const { project, fetch } = await fixture();
    const { startOnOpen } = await import("@/lib/startOnOpen");
    await expect(startOnOpen("seo_refresh", project.id)).rejects.toThrow(/was queued/);
    expect(await startOnOpen("seo_refresh", project.id)).toBe(false);
    const rows = await queued(project.id, "seo_refresh"); expect(rows).toHaveLength(1);
    expect(fetch.mock.calls.map(([, init]) => JSON.parse(init.body).jobId)).toEqual([rows[0].id, rows[0].id]);
  });
});
