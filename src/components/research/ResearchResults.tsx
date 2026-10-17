import Link from "next/link";
import { ArrowUpRight, FileSearch, Layers3 } from "lucide-react";
import { RunControl } from "./RunControl";
import { observedAuthorCount } from "@/lib/demand/evidence";
import { researchFailure, researchMoney, researchSourceFailure, RESEARCH_STATUS, type DemandReport } from "@/lib/demand/report";

const sources = { web: "公开网页", reddit: "Reddit", x: "X" } as const;
const fit = { yes: "符合产品需求", no: "与产品不匹配", unknown: "匹配度待判断" } as const;
const request = { pain: "具体痛点", recommendation: "寻求推荐", alternative: "寻找替代" } as const;
export function researchDate(value: Date | null) {
  return value ? value.toLocaleDateString("zh-CN", { timeZone: "Asia/Shanghai", year: "numeric", month: "short", day: "numeric" }) : "未知";
}

export function ResearchResults({ report, tab, enabled }: { report: DemandReport | null; tab: "signals" | "themes"; enabled: boolean }) {
  if (!report) return <section id="research-results" className="research-results rounded-card border bg-surface p-6 sm:p-8" aria-labelledby="research-empty-title">
    <FileSearch className="mb-5 size-8 text-primary" aria-hidden="true" />
    <h2 id="research-empty-title" className="text-h3 font-medium">让真实讨论回答你的问题</h2>
    <p className="mt-3 max-w-[65ch] text-body text-fg-muted">输入产品网址，寻找正在求推荐、抱怨现有工具或寻找替代方案的人；也可以直接研究一个需求主题。</p>
    <div className="mt-7 border-t pt-5 text-small text-fg-muted"><p>先看需求线索，再看痛点主题。</p><p className="mt-2">每条结果保留原文和来源；证据不够时，会明确保留为个别案例。</p></div>
  </section>;
  const { run, documents, signals, attempts } = report;
  const problem = researchFailure(run.error);
  const retryable = ["partial", "failed", "blocked"].includes(run.status) && run.reservedMicros === 0;
  const resumable = report.canResume;
  const demandDocs = documents.filter((doc) => doc.purpose === "demand");
  return <section id="research-results" className="research-results min-w-0 overflow-hidden rounded-card border bg-surface" aria-labelledby="research-run-title">
    <header className="border-b p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="inline-flex min-h-7 items-center rounded-control bg-surface-2 px-2 text-small font-medium">{RESEARCH_STATUS[run.status]}</span>
        <span className="text-small text-fg-muted">{run.mode === "topic" ? "需求主题" : "产品研究"} · {researchDate(run.createdAt)}</span>
      </div>
      <h2 id="research-run-title" className="mt-3 break-words text-h3 font-medium [overflow-wrap:anywhere]">{run.profileSnapshot?.name ?? run.input ?? "已到期的研究"}</h2>
      {run.mode === "product" && run.profileSnapshot && run.input ? <p className="mt-1 break-all text-small text-fg-muted">{run.input}</p> : null}
      <p role="status" className="mt-3 text-small text-fg-muted">{run.status === "expired" ? "原文和分析已按保留规则移除，费用记录仍保留。" : run.progress ?? (run.status === "queued" ? "研究已保存，等待后台开始处理。" : "结果来自本轮保存的资料。")}</p>
      <dl className="mt-5 flex flex-wrap gap-x-6 gap-y-3 border-t pt-4 text-small tabular-nums">
        {[["本轮预算", researchMoney(run.budgetMicros)], ["实际费用", researchMoney(run.spentMicros)], ["尚未结算", researchMoney(run.reservedMicros)], ["内容保留至", researchDate(run.expiresAt)]].map(([label, value]) => <div key={label}><dt className="text-fg-muted">{label}</dt><dd className="mt-1 font-medium">{value}</dd></div>)}
      </dl>
      {problem ? <p role="alert" className="mt-4 max-w-[65ch] text-small text-score-warm">{problem}</p> : null}
      {retryable || resumable ? <div className="mt-4"><RunControl runId={run.id} mode={retryable ? "retry" : "resume"} enabled={enabled} /></div> : null}
      {!enabled && run.status !== "expired" ? <p className="mt-3 text-small text-fg-muted">新检索已暂停；已保存结果仍可阅读。</p> : null}
    </header>
    {run.status !== "expired" ? <>
      <div className="flex flex-wrap gap-x-5 gap-y-2 border-b bg-surface-2 px-5 py-3 text-small text-fg-muted sm:px-6" aria-label="本轮来源读取情况">
        {(Object.keys(sources) as (keyof typeof sources)[]).map((source) => {
          const docs = demandDocs.filter((doc) => doc.source === source);
          const failure = researchSourceFailure(run.error, source);
          return <div key={source} className="max-w-[65ch]"><p>{sources[source]}：{docs.filter((doc) => doc.outcome === "retrieved").length} 篇原文 / {docs.filter((doc) => doc.outcome !== "retrieved").length} 条待读取</p>{failure ? <p className="mt-1 text-score-warm">{sources[source]} 部分步骤未完成：{failure}</p> : null}</div>;
        })}
      </div>
      <nav className="flex gap-5 border-b px-5 sm:px-6" aria-label="研究结果视图">
        {(["signals", "themes"] as const).map((view) => <Link key={view} aria-current={tab === view ? "page" : undefined}
          href={`/app/research?run=${run.id}&tab=${view}#research-results`} className={`inline-flex min-h-12 items-center gap-2 border-b-2 text-body ${tab === view ? "border-primary font-medium text-primary" : "border-transparent text-fg-muted hover:text-fg"}`}>
          {view === "signals" ? <FileSearch className="size-4" aria-hidden="true" /> : <Layers3 className="size-4" aria-hidden="true" />}{view === "signals" ? `需求线索 ${signals.length}` : `痛点主题 ${run.themes?.length ?? 0}`}
        </Link>)}
      </nav>
      {tab === "signals" ? <div>
        {signals.length ? signals.map((signal) => {
          const doc = demandDocs.find((item) => item.id === signal.documentId);
          if (!doc) return null;
          const author = signal.author?.startsWith("x-id:") ? `X 账号 ID ${signal.author.slice(5)}` : signal.author ?? "作者未知";
          return <article key={signal.id} id={`signal-${signal.id}`} className="research-signal scroll-mt-24 border-b p-5 last:border-b-0 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2 text-small"><span className="font-medium">{sources[doc.source]} · {author}</span><span className="text-fg-muted">{request[signal.requestType as keyof typeof request] ?? "需求表达"}</span></div>
            <blockquote lang="en" className="mt-4 max-w-[75ch] whitespace-pre-wrap break-words text-body [overflow-wrap:anywhere]">{signal.quote}</blockquote>
            <p className="mt-4 max-w-[65ch] text-body text-fg-muted">{signal.explanation}</p>
            {run.mode === "product" && signal.productFit ? <p className="mt-3 text-small font-medium">{fit[signal.productFit]}</p> : null}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-small text-fg-muted"><span>发布：{researchDate(doc.publishedAt)} · 收集：{researchDate(doc.retrievedAt)}</span>
              <a href={doc.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-1 text-primary underline-offset-4 hover:underline">打开原文 <ArrowUpRight className="size-4" aria-hidden="true" /><span className="sr-only">（新窗口）</span></a>
            </div>
          </article>;
        }) : <div className="p-6"><h3 className="text-body font-medium">{run.status === "running" || run.status === "queued" ? "等待可核对的原文证据" : "这轮暂未形成有依据的需求线索"}</h3><p className="mt-2 max-w-[65ch] text-small text-fg-muted">搜索摘要和无法读取的页面不会被当作完整需求。没有结果，也不代表这个需求不存在。</p></div>}
      </div> : <div>
        {run.themes?.length ? run.themes.map((theme, index) => <article key={`${run.id}-${index}`} className="border-b p-5 last:border-b-0 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-2"><h3 className="max-w-[65ch] break-words text-h3 font-medium">{theme.title}</h3><span className="shrink-0 rounded-control bg-surface-2 px-2 py-1 text-small">{theme.kind === "recurring" ? "多位作者的观察" : "个别案例"}</span></div>
          <p className="mt-3 max-w-[65ch] whitespace-pre-line break-words text-body text-fg-muted">{theme.explanation}</p>
          <p className="mt-3 text-small text-fg-muted">观察到的不同作者：{observedAuthorCount(signals.filter((signal) => theme.signalIds.includes(signal.id)))} 位（未知作者未计入）</p>
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2">{theme.signalIds.map((id, i) => <Link key={id} className="inline-flex min-h-11 items-center text-small text-primary underline underline-offset-4" href={`/app/research?run=${run.id}&tab=signals#signal-${id}`}>查看证据 {i + 1}</Link>)}</div>
        </article>) : <div className="p-6"><h3 className="text-body font-medium">尚未归纳出痛点主题</h3><p className="mt-2 max-w-[65ch] text-small text-fg-muted">主题只引用已保存的需求线索。作者无法区分或只有一个来源时，会保留为个别案例。</p></div>}
        <p className="border-t px-5 py-4 text-small text-fg-muted sm:px-6">这些是样本中观察到的身份和表达，不代表市场规模或已核实的独立人数。</p>
      </div>}
      {demandDocs.some((doc) => !doc.body) ? <details className="border-t px-5 py-4 sm:px-6"><summary className="min-h-11 cursor-pointer text-small text-fg-muted">仅有摘要或暂未读取的来源（{demandDocs.filter((doc) => !doc.body).length}）</summary>
        <ul className="mt-3 flex flex-col gap-3">{demandDocs.filter((doc) => !doc.body).map((doc) => <li key={doc.id} className="text-small"><a href={doc.url} target="_blank" rel="noopener noreferrer" className="break-all text-primary underline underline-offset-4">{doc.url}<span className="sr-only">（新窗口）</span></a><p className="mt-1 text-fg-muted">{doc.outcome === "snippet_only" ? "只有检索摘要，未用于原文需求判断。" : "未能读取原文，未用于需求判断。"}</p>{doc.snippet ? <p className="mt-1 break-words text-fg-muted">{doc.snippet}</p> : null}</li>)}</ul>
      </details> : null}
    </> : null}
    {attempts.length ? <details className="border-t px-5 py-4 sm:px-6"><summary className="min-h-11 cursor-pointer text-small text-fg-muted">费用与调用记录（{attempts.length} / {run.maxAttempts}）</summary>
      <div className="mt-3 overflow-x-auto"><table className="w-full text-left text-small tabular-nums"><caption className="sr-only">本轮数据与模型费用</caption><thead><tr>{["来源", "用途", "状态", "费用"].map((label) => <th key={label} className="whitespace-nowrap px-2 py-2 font-medium">{label}</th>)}</tr></thead><tbody>{attempts.map((attempt) => <tr key={attempt.id} className="border-t"><td className="whitespace-nowrap px-2 py-3">{sources[attempt.source]}</td><td className="whitespace-nowrap px-2 py-3">{attempt.kind === "data" ? "读取数据" : "AI 分析"}</td><td className="whitespace-nowrap px-2 py-3">{attempt.status === "uncertain" ? "费用待确认" : attempt.status === "reserved" ? "请求中" : attempt.successful === false ? "已计费，结果不可用" : "已结算"}</td><td className="whitespace-nowrap px-2 py-3">{attempt.actualMicros === null ? `预留 ${researchMoney(attempt.upperBoundMicros)}` : researchMoney(attempt.actualMicros)}</td></tr>)}</tbody></table></div>
    </details> : null}
  </section>;
}
