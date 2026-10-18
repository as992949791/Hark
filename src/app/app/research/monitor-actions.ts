"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireLocalUser } from "@/lib/auth";
import { deleteDemandMonitor, saveDemandMonitor, setDemandMonitorEnabled } from "@/lib/demand/monitors";
import type { ResearchActionState } from "./actions";

function budget(value: FormDataEntryValue | null, maximum: number) {
  const text = String(value ?? "").trim();
  if (!/^\d+(\.\d{1,6})?$/.test(text) || Number(text) <= 0 || Number(text) > maximum) throw new Error("budget");
  return Math.round(Number(text) * 1e6);
}

export async function saveMonitorAction(_previous: ResearchActionState, form: FormData): Promise<ResearchActionState> {
  const user = await requireLocalUser();
  let perRunBudgetMicros: number, totalBudgetMicros: number;
  try { perRunBudgetMicros = budget(form.get("perRunBudget"), 1); totalBudgetMicros = budget(form.get("totalBudget"), 10); }
  catch { return { error: "请填写大于 0 的美元预算，最多六位小数；单轮最多 $1，累计最多 $10。" }; }
  if (totalBudgetMicros < perRunBudgetMicros) return { error: "累计预算不能小于单轮预算。" };
  try {
    await saveDemandMonitor(user.id, { key: z.uuid().parse(form.get("key")), sourceRunId: z.uuid().parse(form.get("sourceRunId")),
      emailChannelId: z.uuid().parse(form.get("emailChannelId")), perRunBudgetMicros, totalBudgetMicros });
    revalidatePath("/app/research");
    return { error: null, message: "监控条件已保存，当前暂停。开启后才会定时检索。" };
  } catch { return { error: "无法保存监控。请刷新后检查研究记录和邮件渠道，再重试。" }; }
}

export async function updateMonitorAction(monitorId: string, operation: "enable" | "pause" | "delete"): Promise<ResearchActionState> {
  const user = await requireLocalUser();
  try {
    z.uuid().parse(monitorId); z.enum(["enable", "pause", "delete"]).parse(operation);
    if (operation === "delete") await deleteDemandMonitor(user.id, monitorId);
    else await setDemandMonitorEnabled(user.id, monitorId, operation === "enable");
    revalidatePath("/app/research");
    return { error: null, message: operation === "enable" ? "已开启每日监控；第一次检索只建立基线。" : operation === "pause" ? "已暂停后续检索和提醒；正在执行的请求可能继续完成。" : "已删除监控；已有研究和费用记录仍保留。" };
  } catch { return { error: operation === "enable" ? "尚未开启。请检查定时服务、预算和邮件渠道；当前测试部署默认关闭持续检索。" : "操作未完成，请刷新并检查这项监控是否仍存在。" }; }
}
