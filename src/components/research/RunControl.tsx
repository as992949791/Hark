"use client";

import { useActionState } from "react";
import { resumeResearchAction, retryResearchAction, type ResearchActionState } from "@/app/app/research/actions";
import { Button } from "@/components/ui/button";

export function RunControl({ runId, mode, enabled }: { runId: string; mode: "retry" | "resume"; enabled: boolean }) {
  const action = (mode === "retry" ? retryResearchAction : resumeResearchAction).bind(null, runId);
  const [state, submit, pending] = useActionState<ResearchActionState, FormData>(action, { error: null });
  return <form action={submit} className="flex flex-col gap-2" aria-busy={pending}>
    <Button type="submit" variant="outline" className="min-h-11 self-start" disabled={pending || !enabled}>{pending ? "正在提交…" : mode === "retry" ? "重试未完成部分" : "重新派发这项研究"}</Button>
    {state.error ? <p role="alert" className="text-small text-score-warm">{state.error}</p> : null}
    {state.message ? <p role="status" className="text-small text-fg-muted">{state.message}</p> : null}
  </form>;
}
