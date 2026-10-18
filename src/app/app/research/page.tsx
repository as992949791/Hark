import { randomUUID } from "node:crypto";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { ActivityPoll } from "@/components/ActivityPoll";
import { ResearchForm } from "@/components/research/ResearchForm";
import { MonitorSection } from "@/components/research/MonitorSection";
import { ResearchResults, researchDate } from "@/components/research/ResearchResults";
import { requireLocalUser } from "@/lib/auth";
import { getDemandReport, researchAvailability, RESEARCH_STATUS } from "@/lib/demand/report";
import { listDemandRuns } from "@/lib/demand/runs";
import { listDemandMonitors, monitorEmailChannels, monitoringAvailable } from "@/lib/demand/monitors";
import { listProjects } from "@/lib/projects";
import "./research.css";

export const metadata = { title: "跨平台研究 · Hark" };

export default async function ResearchPage({ searchParams }: { searchParams: Promise<{ run?: string; tab?: string }> }) {
  const user = await requireLocalUser();
  const params = await searchParams;
  const [runs, projects, monitors, channels] = await Promise.all([listDemandRuns(user.id), listProjects(user.id), listDemandMonitors(user.id), monitorEmailChannels(user.id)]);
  if (params.run && !z.uuid().safeParse(params.run).success) notFound();
  const runId = params.run ?? runs[0]?.id;
  const report = runId ? await getDemandReport(user.id, runId) : null;
  if (params.run && !report) notFound();
  const availability = researchAvailability(user.id);
  const busy = report?.run.status === "running" || (report?.run.status === "queued" && availability.enabled);
  return <div className="research-page flex min-w-0 max-w-[1500px] flex-col gap-6" lang="zh-CN">
    <ActivityPoll busy={busy} />
    <header className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-h2 font-medium">跨平台研究</h1><p className="mt-2 max-w-[65ch] text-body text-fg-muted">从 Reddit、X 和公开网页中，找到真实的需求表达。</p><p className="mt-2 text-small text-fg-muted">{availability.message}</p></div><a href="#research-inputs" className="inline-flex min-h-11 items-center text-small text-primary underline underline-offset-4">输入新的研究问题</a></header>
    <MonitorSection monitors={monitors} channels={channels} available={monitoringAvailable(user.id)} runId={report?.run.status !== "expired" ? report?.run.id : undefined} requestKey={randomUUID()} />
    <div className="research-layout" data-has-run={!!report}>
      <aside id="research-inputs" className="research-inputs flex min-w-0 scroll-mt-24 flex-col gap-5" aria-label="研究输入与历史">
        <ResearchForm requestKey={randomUUID()} enabled={availability.enabled} projects={projects.map(({ id, name, url }) => ({ id, name, url }))}
          sourceRunId={report?.run.status !== "expired" && report?.documents.some((doc) => doc.purpose === "demand" && doc.body) && !["running", "queued"].includes(report.run.status) ? report.run.id : undefined} />
        <section className="rounded-card border bg-surface p-5" aria-labelledby="research-history-title"><h2 id="research-history-title" className="text-body font-medium">研究记录</h2><p className="mb-3 mt-1 text-small text-fg-muted">最近 50 次，只显示你的研究。</p>
          {runs.length ? <ul className="research-history -mx-2 flex max-h-80 flex-col gap-1 overflow-y-auto px-1">{runs.map((run) => <li key={run.id}><Link href={`/app/research?run=${run.id}#research-results`} aria-current={run.id === runId ? "true" : undefined} className="flex min-h-16 flex-col gap-2 rounded-control px-2 py-3 hover:bg-surface-2"><span className="line-clamp-2 break-words text-body font-medium [overflow-wrap:anywhere]">{run.profileSnapshot?.name ?? run.input ?? "已到期的研究"}</span><span className="flex flex-wrap justify-between gap-2 text-small text-fg-muted"><span>{RESEARCH_STATUS[run.status]}</span><span>{researchDate(run.createdAt)}</span></span></Link></li>)}</ul> : <p className="py-3 text-small text-fg-muted">还没有研究记录。提交后可以在这里回看。</p>}
        </section>
      </aside>
      <ResearchResults report={report} tab={params.tab === "themes" ? "themes" : "signals"} enabled={availability.enabled} />
    </div>
  </div>;
}
