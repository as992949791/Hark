"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { ArrowRight, Globe2, Search } from "lucide-react";
import { createResearchAction, type ResearchActionState } from "@/app/app/research/actions";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";

export function ResearchForm({ requestKey, enabled, projects }: { requestKey: string; enabled: boolean; projects: { id: string; name: string; url: string | null }[] }) {
  const [mode, setMode] = useState<"product" | "topic">("product");
  const [url, setUrl] = useState("");
  const [key] = useState(requestKey);
  const [state, action, pending] = useActionState<ResearchActionState, FormData>(createResearchAction, { error: null });
  if (state.runId) return <section className="research-compose rounded-card border bg-surface p-5" aria-label="已保存的研究">
    <h2 className="text-h3 font-medium">研究已保存</h2><p role="status" className="mt-2 text-small text-fg-muted">{state.error}</p>
    <Link className="mt-4 inline-flex min-h-11 items-center gap-2 text-primary" href={`/app/research?run=${state.runId}`}>打开这项研究 <ArrowRight className="size-4" /></Link>
    <a className="mt-2 block text-small underline underline-offset-4" href="/app/research">开始另一项研究</a>
  </section>;
  return <section className="research-compose rounded-card border bg-surface p-5" aria-labelledby="research-start-title">
    <h2 id="research-start-title" className="text-h3 font-medium">开始一项研究</h2>
    <p className="mb-5 mt-1 text-small text-fg-muted">已有产品，或只有一个想了解的需求，都可以从这里开始。</p>
    <form action={action} className="flex flex-col gap-4" aria-busy={pending}>
      <input type="hidden" name="key" value={key} /><input type="hidden" name="mode" value={mode} />
      <fieldset disabled={pending} className="flex min-w-0 flex-col gap-3">
        <legend className="sr-only">研究方式</legend>
        <div className="grid grid-cols-2 gap-1 rounded-control bg-surface-2 p-1">
          {(["product", "topic"] as const).map((item) => <button key={item} type="button" aria-pressed={mode === item} onClick={() => setMode(item)}
            className={`flex min-h-11 items-center justify-center gap-2 rounded-control text-small transition-colors ${mode === item ? "bg-surface font-medium text-fg" : "text-fg-muted hover:text-fg"}`}>
            {item === "product" ? <Globe2 className="size-4" aria-hidden="true" /> : <Search className="size-4" aria-hidden="true" />}{item === "product" ? "产品网址" : "需求主题"}
          </button>)}
        </div>
        {mode === "product" ? <>
          <Field label="产品网站" hint="会复用你已保存的同一产品资料；新网址会先分析产品，再搜索需求。">
            <Input name="input" aria-label="产品网站" placeholder="例如：www.capcut.com" value={url} onChange={(event) => setUrl(event.target.value)} maxLength={2048} required autoComplete="url" />
          </Field>
          {projects.some((project) => project.url) ? <label className="flex flex-col gap-1 text-small text-fg-muted">使用已保存的产品
            <select aria-label="使用已保存的产品" value={projects.find((project) => project.url === url)?.id ?? ""} onChange={(event) => setUrl(projects.find((project) => project.id === event.target.value)?.url ?? "")}
              className="min-h-11 w-full rounded-control border bg-surface px-2 text-body text-fg">
              <option value="">自行输入网址</option>{projects.filter((project) => project.url).map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
            </select>
          </label> : null}
        </> : <Field label="想了解的需求" hint="不需要已有产品。先搜索英文公开讨论，再用中文说明发现的需求。">
          <Textarea name="input" aria-label="想了解的需求" placeholder="例如：独立创作者在自动字幕和视频剪辑方面遇到的问题" rows={4} maxLength={500} required />
        </Field>}
        <Field label="本轮预算（美元）" hint="测试版单次最多 $1。数据与模型费用合计计入预算，失败请求也可能计费。">
          <Input name="budget" type="number" min="0" max="1" step="0.000001" defaultValue="0.10" required inputMode="decimal" />
        </Field>
      </fieldset>
      {state.error ? <p role="alert" className="text-small text-score-warm">{state.error}</p> : null}
      <Button type="submit" disabled={pending || !enabled} className="min-h-11 w-full gap-2">{pending ? "正在提交研究…" : "开始研究"}<ArrowRight className="size-4" aria-hidden="true" /></Button>
      <p className="text-small text-fg-muted">{enabled ? "只在你手动开始时检索，不会自动联系发帖者。预算为 0 时不会购买新资料。" : "新检索暂未开放。你可以先查看输入方式与已有记录。"}</p>
    </form>
  </section>;
}
