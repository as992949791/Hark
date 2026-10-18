import Link from "next/link";
import { MonitorControl, MonitorForm } from "./MonitorControls";
import type { listDemandMonitors, monitorEmailChannels } from "@/lib/demand/monitors";
import { researchMoney, RESEARCH_STATUS } from "@/lib/demand/report";

const reasons: Record<string, string> = { manual: "已手动暂停", budget: "累计剩余额度不足以预留下一轮", channel: "提醒邮箱已移除，请重新保存监控", review: "最近研究需要检查，请先核对费用与错误" };
function date(value: Date) { return value.toLocaleString("zh-CN", { timeZone: "Asia/Shanghai", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }); }

export function MonitorSection({ monitors, channels, available, runId, requestKey }: {
  monitors: Awaited<ReturnType<typeof listDemandMonitors>>; channels: Awaited<ReturnType<typeof monitorEmailChannels>>;
  available: boolean; runId?: string; requestKey: string;
}) {
  return <section className="min-w-0 rounded-card border bg-surface p-5 sm:p-6" aria-labelledby="demand-monitors-title">
    <div className="flex flex-wrap items-baseline justify-between gap-2"><h2 id="demand-monitors-title" className="text-h3 font-medium">每日监控</h2><span className="text-small text-fg-muted">{monitors.filter(monitor => monitor.enabled).length} 项开启 · {monitors.length} 项已保存</span></div>
    <p className="mt-2 max-w-[75ch] text-small text-fg-muted">{available ? "每 24 小时安排一次检索，实际开始时间受后台调度和额度影响。" : "定时检索服务尚未开启。可以保存条件，当前不会自动检索或发信。"}</p>
    {runId ? <div className="mt-4"><MonitorForm key={runId} runId={runId} requestKey={requestKey} channels={channels} /></div> : <p className="mt-3 text-small text-fg-muted">先开始或打开一项研究，再把问题保存为监控。</p>}
    {monitors.length ? <details className="mt-4 border-t pt-3"><summary className="min-h-11 cursor-pointer text-body font-medium">查看已保存的监控（{monitors.length}）</summary>
      <ul className="divide-y">{monitors.map(monitor => <li key={monitor.id} className="min-w-0 py-5">
        <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="max-w-[65ch] break-words text-body font-medium [overflow-wrap:anywhere]">{monitor.input}</h3><span className="text-small font-medium">{monitor.enabled ? available ? "每日检查" : "等待服务开启" : "已暂停"}</span></div>
        <p className="mt-2 text-small text-fg-muted">{monitor.mode === "topic" ? "需求主题" : "产品研究"} · {channels.find(channel => channel.id === monitor.emailChannelId)?.target ?? "邮箱渠道已移除"}</p>
        <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-small tabular-nums">{[
          ["单轮上限", researchMoney(monitor.perRunBudgetMicros)], ["已计费", researchMoney(monitor.spentMicros)],
          ["已用及预留", `${researchMoney(monitor.committedMicros)} / ${researchMoney(monitor.totalBudgetMicros)}`],
        ].map(([label, value]) => <div key={label}><dt className="text-fg-muted">{label}</dt><dd className="mt-1">{value}</dd></div>)}</dl>
        <p className="mt-3 text-small text-fg-muted">{monitor.reason ? reasons[monitor.reason] : monitor.baselineAt ? "基线已建立，只提醒后来发现的原文证据。" : "第一次检查将建立基线，不发送旧结果。"}</p>
        {monitor.enabled && available ? <p className="mt-2 text-small text-fg-muted">下一轮最早安排：{date(monitor.nextRunAt)}（北京时间）</p> : null}
        {monitor.latestRunId ? <Link href={`/app/research?run=${monitor.latestRunId}#research-results`} className="mt-2 inline-flex min-h-11 items-center text-small text-primary underline underline-offset-4">最近研究 · {monitor.latestStatus ? RESEARCH_STATUS[monitor.latestStatus] : "查看记录"}</Link> : null}
        {monitor.deliveryState !== "none" ? <p role="status" className="mt-2 text-small text-fg-muted">{monitor.deliveryState === "sent" ? "新增证据提醒已交给邮件服务器。" : monitor.deliveryState === "expired" ? "证据内容已到期，不再发送提醒。" : monitor.deliveryError ?? "新增证据提醒等待后台发送；暂停时不会发送。"}</p> : null}
        <div className="mt-3 flex flex-wrap items-start gap-3"><MonitorControl monitorId={monitor.id} operation={monitor.enabled ? "pause" : "enable"} disabled={!monitor.enabled && !available} />
          <details className="text-small"><summary className="min-h-11 cursor-pointer py-3 text-fg-muted">删除选项</summary><p className="mb-3 max-w-[45ch] text-fg-muted">删除监控条件和待发提醒；研究与费用历史保留。正在执行的请求可能继续完成。</p><MonitorControl monitorId={monitor.id} operation="delete" /></details>
        </div>
      </li>)}</ul>
    </details> : null}
    <p className="mt-3 max-w-[75ch] text-small text-fg-muted">提醒按已见来源和原文去重，不代表新增独立用户。同一页面的新变化可能不会再次提醒。邮件服务已接收后若进程中断，极少数提醒可能重复。</p>
  </section>;
}
