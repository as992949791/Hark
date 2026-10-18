"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { jobs } from "@/db/schema";
import { dispatchJob } from "@/jobs/dispatch";
import { failure } from "@/lib/actionResult";
import { requireLocalUser } from "@/lib/auth";
import { demandInput } from "@/lib/demand/contracts";
import { canonicalUrl } from "@/lib/demand/evidence";
import { researchAvailability, researchFailure } from "@/lib/demand/report";
import { createDemandRun, getDemandRun, retryDemandRun } from "@/lib/demand/runs";

export type ResearchActionState = { error: string | null; message?: string; runId?: string };

async function sendOwnedRun(userId: string, runId: string) {
  const run = await getDemandRun(userId, runId);
  if (!run || run.status === "expired") throw new Error("Research not found.");
  const [job] = await db().select().from(jobs).where(eq(jobs.demandRunId, run.id));
  if (!job) throw new Error("Research job not found.");
  await dispatchJob(job);
}

function actionFailure(error: unknown): ResearchActionState {
  const result = failure(error, "研究暂时无法提交，请稍后重试。");
  return { error: researchFailure(result.error) ?? "研究暂时无法提交，请稍后重试。" };
}

export async function createResearchAction(_previous: ResearchActionState, form: FormData): Promise<ResearchActionState> {
  const user = await requireLocalUser();
  if (!researchAvailability(user.id).enabled) return { error: "新检索暂未开放，尚未创建研究或产生费用。" };
  const budget = String(form.get("budget") ?? "").trim();
  if (!/^\d+(\.\d{1,6})?$/.test(budget) || Number(budget) > 1) return { error: "请填写 0 至 1 美元的单次预算，最多保留六位小数。" };
  const mode = form.get("mode");
  const input = String(form.get("input") ?? "").trim();
  let runId: string;
  try {
    let url = input;
    if (mode === "product") {
      url = new URL(/^[a-z][a-z0-9+.-]*:/i.test(input) ? input : `https://${input}`).href;
      canonicalUrl(url);
    }
    const raw = { key: form.get("key"), budgetMicros: Math.round(Number(budget) * 1e6), ...(form.get("sourceRunId") ? { sourceRunId: form.get("sourceRunId") } : {}), ...(mode === "product" ? { mode, url } : { mode, topic: input }) };
    const parsed = demandInput.safeParse(raw);
    if (!parsed.success || input.includes("\u0000") || !input.isWellFormed()) return { error: "请检查产品网址或需求主题（最多 500 字），然后重试。" };
    runId = (await createDemandRun(user.id, parsed.data)).id;
  } catch { return { error: "无法创建研究。请检查公开网址、主题和现有研究数量后重试。" }; }
  try { await sendOwnedRun(user.id, runId); }
  catch {
    revalidatePath("/app/research");
    return { error: "研究已保存，但暂时未能交给后台处理。打开记录后可重新派发，不必重复创建。", runId };
  }
  revalidatePath("/app/research");
  redirect(`/app/research?run=${runId}`);
}

export async function retryResearchAction(runId: string): Promise<ResearchActionState> {
  const user = await requireLocalUser();
  if (!researchAvailability(user.id).enabled) return { error: "新检索暂未开放，当前不会重试或产生费用。" };
  try {
    z.uuid().parse(runId);
    const job = await retryDemandRun(user.id, runId);
    await dispatchJob(job);
    return { error: null, message: "已提交重试，成功步骤会复用。" };
  } catch (error) { return actionFailure(error); }
  finally { revalidatePath("/app/research"); }
}

/** Explicit same-job dispatch also recovers a stale worker; no page read starts work. */
export async function resumeResearchAction(runId: string): Promise<ResearchActionState> {
  const user = await requireLocalUser();
  if (!researchAvailability(user.id).enabled) return { error: "新检索暂未开放，当前不会派发任务。" };
  try {
    z.uuid().parse(runId);
    const run = await getDemandRun(user.id, runId);
    if (!run || !["queued", "running"].includes(run.status) || (run.status === "running" && run.leaseExpiresAt && run.leaseExpiresAt.getTime() > Date.now())) {
      return { error: "这项研究正在处理或已结束，请刷新查看当前状态。" };
    }
    await sendOwnedRun(user.id, runId);
    return { error: null, message: "已重新派发，等待后台处理。" };
  } catch (error) { return actionFailure(error); }
  finally { revalidatePath("/app/research"); }
}
