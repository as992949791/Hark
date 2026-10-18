"use client";

import { useActionState, useState } from "react";
import { saveMonitorAction, updateMonitorAction } from "@/app/app/research/monitor-actions";
import type { ResearchActionState } from "@/app/app/research/actions";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";

export function MonitorForm({ runId, requestKey, channels }: { runId: string; requestKey: string; channels: { id: string; target: string; projectName: string }[] }) {
  const [key] = useState(requestKey);
  const [state, action, pending] = useActionState<ResearchActionState, FormData>(saveMonitorAction, { error: null });
  return <details className="research-compose border-t pt-4"><summary className="min-h-11 cursor-pointer text-body font-medium">保存为每日监控</summary>
    <p className="mb-4 mt-2 max-w-[65ch] text-small text-fg-muted">保存当前研究的问题。每天重新检索公开来源；第一次建立基线，以后只提醒未记录的证据。保存后默认暂停。</p>
    {channels.length ? <form action={action} className="flex flex-col gap-4" aria-busy={pending}>
      <input type="hidden" name="key" value={key} /><input type="hidden" name="sourceRunId" value={runId} />
      <fieldset disabled={pending} className="flex min-w-0 flex-col gap-4">
        <label className="flex min-w-0 flex-col gap-1 text-small text-fg-muted">提醒邮箱
          <select name="emailChannelId" required className="min-h-11 min-w-0 rounded-control border bg-surface px-2 text-body text-fg">{channels.map(channel => <option key={channel.id} value={channel.id}>{channel.projectName} · {channel.target}</option>)}</select>
        </label>
        <Field label="单轮预算（美元）" hint="数据和 AI 费用合计，失败请求也可能计费。"><Input name="perRunBudget" type="number" min="0.000001" max="1" step="0.000001" defaultValue="0.10" required inputMode="decimal" /></Field>
        <Field label="累计预算（美元）" hint="整个监控的上限，不会按天重置；每轮先预留完整单轮预算。"><Input name="totalBudget" type="number" min="0.000001" max="10" step="0.000001" defaultValue="0.50" required inputMode="decimal" /></Field>
      </fieldset>
      <Button type="submit" variant="outline" className="min-h-11" disabled={pending || !!state.message}>{pending ? "正在保存…" : state.message ? "已保存为暂停监控" : "保存监控条件"}</Button>
      {state.error ? <p role="alert" className="text-small text-score-warm">{state.error}</p> : null}
      {state.message ? <p role="status" className="text-small text-fg-muted">{state.message}</p> : null}
    </form> : <p className="text-small text-fg-muted">请先在项目的 Alerts 页面添加提醒邮箱，然后返回保存监控。</p>}
  </details>;
}

export function MonitorControl({ monitorId, operation, disabled = false }: { monitorId: string; operation: "enable" | "pause" | "delete"; disabled?: boolean }) {
  const [state, action, pending] = useActionState<ResearchActionState, FormData>(updateMonitorAction.bind(null, monitorId, operation), { error: null });
  return <form action={action} className="flex flex-col gap-2" aria-busy={pending}>
    <Button type="submit" variant="outline" className="min-h-11 self-start" disabled={pending || disabled}>{pending ? "正在处理…" : operation === "enable" ? "开启每日监控" : operation === "pause" ? "暂停监控" : "删除监控"}</Button>
    {state.error ? <p role="alert" className="max-w-[45ch] text-small text-score-warm">{state.error}</p> : null}
    {state.message ? <p role="status" className="max-w-[45ch] text-small text-fg-muted">{state.message}</p> : null}
  </form>;
}
