import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { demandAttempts } from "@/db/schema";
import { config } from "@/lib/config";
import { getDemandEvidence, getDemandRun } from "./runs";

export function researchAvailability(userId: string) {
  const settings = config();
  const enabled = settings.DEMAND_DISCOVERY_ENABLED && settings.DEMAND_LIVE_ENABLED && settings.BACKGROUND_WORKER_ENABLED &&
    settings.BACKGROUND_WORKER_USER_ID === userId && !!settings.BACKGROUND_WORKER_SECRET &&
    settings.HOUSE_DATA_CAP_USD_PER_DAY > 0 && settings.HOUSE_LLM_CAP_USD_PER_DAY > 0;
  return { enabled, message: enabled ? "手动开始检索后才会产生数据与模型费用。" : "新检索暂未开放，你仍可浏览已保存的研究。" };
}

/** Owner-scoped presentation data; raw paid artifacts and request credentials never reach the client. */
export async function getDemandReport(userId: string, runId: string) {
  const run = await getDemandRun(userId, runId);
  if (!run) return null;
  const evidence = await getDemandEvidence(userId, runId);
  const attempts = await db().select({ id: demandAttempts.id, source: demandAttempts.source,
    kind: demandAttempts.kind, status: demandAttempts.status, actualMicros: demandAttempts.actualMicros,
    upperBoundMicros: demandAttempts.upperBoundMicros,
    successful: sql<boolean | null>`(${demandAttempts.result}->>'ok')::boolean`,
  }).from(demandAttempts).where(eq(demandAttempts.runId, run.id));
  const canResume = run.status === "queued" || (run.status === "running" && (!run.leaseExpiresAt || run.leaseExpiresAt.getTime() <= Date.now()));
  return { run, ...evidence, attempts, canResume };
}
export type DemandReport = NonNullable<Awaited<ReturnType<typeof getDemandReport>>>;

export function researchMoney(micros: number) {
  return `$${(micros / 1e6).toFixed(micros % 10_000 === 0 ? 2 : 6)}`;
}
export const RESEARCH_STATUS = { queued: "等待处理", running: "研究中", partial: "部分完成", complete: "已完成", blocked: "已暂停", failed: "未完成", expired: "内容已到期" } as const;

export function researchFailure(message: string | null) {
  if (!message) return null;
  if (/uncertain|unconfirmed|reconcil|outstanding charges/i.test(message)) return "有请求的费用尚待确认，已停止重复请求。请先确认账单，再继续研究。";
  if (/budget|limit|cap|ceiling|pric/i.test(message)) return "本轮预算、处理数量或系统每日额度已到上限。成功结果已保留；需要更多材料时请新建研究。";
  if (/disabled|credentials|wallet|configured/i.test(message)) return "检索服务暂未准备好，研究已暂停，已有记录会保留。";
  if (/profile|preparation|product fact/i.test(message)) return "产品资料未能支持分析，尚未开始需求检索。可检查网址后重试，或使用主题模式。";
  return "部分步骤未能完成，已有证据和费用记录已保留。重试会复用成功步骤。";
}
