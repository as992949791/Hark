import type { DemandAssessment } from "@/lib/demand/contracts";
import type { DemandReport } from "@/lib/demand/report";

/** Each theme keeps the case-level evidence rather than inventing an aggregate causal story. */
export function PainAnalysis({ assessments, documents }: { assessments: (DemandAssessment | null)[]; documents: DemandReport["documents"] }) {
  const entries = [...new Map(assessments.flatMap(assessment => assessment?.analysis ?? []).map(item => [JSON.stringify([item.kind, item.documentId, item.quoteStart, item.quoteEnd]), item])).values()];
  const legacy = assessments.some(assessment => !assessment?.analysis);
  return <div className="mt-5 border-t pt-4">
    {legacy ? <p className="mb-3 text-small text-fg-muted">部分历史分析尚未提取解决办法和局限；查看记录不会自动重新分析。</p> : null}
    <dl className="space-y-5">{(["workaround", "limitation"] as const).map(kind => {
      const items = entries.filter(item => item.kind === kind);
      return <div key={kind}><dt className="text-body font-medium">{kind === "workaround" ? "目前怎么解决" : "现有方案的局限"}</dt>
        <dd className="mt-2">{items.length ? <ul className="space-y-3">{items.map(item => {
          const doc = documents.find(source => source.id === item.documentId);
          return doc ? <li key={`${doc.id}-${item.quoteStart}-${item.quoteEnd}`}><p className="max-w-[65ch] break-words text-body">{item.summary}</p>
            <details className="mt-1 text-small"><summary className="min-h-11 cursor-pointer text-primary">核对这项判断的原文</summary>
              <blockquote lang="en" className="mt-1 max-w-[75ch] whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{item.quote}</blockquote>
              <a href={doc.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center break-all text-primary underline underline-offset-4">打开来源<span className="sr-only">（新窗口）</span></a>
            </details></li> : null;
        })}</ul> : <p className="max-w-[65ch] text-small text-fg-muted">{legacy ? "尚无这项结构化证据，请核对已有原文。" : "原文未明确说明，暂不推断。"}</p>}</dd>
      </div>;
    })}</dl>
  </div>;
}
