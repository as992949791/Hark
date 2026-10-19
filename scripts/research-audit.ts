import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { z } from "zod";
import { canonicalUrl, observedAuthorCount } from "../src/lib/demand/evidence";
import { demandTheme, micros } from "../src/lib/demand/contracts";

const span = z.object({ documentId: z.uuid(), quote: z.string().min(1), quoteStart: z.number().int().nonnegative(), quoteEnd: z.number().int().positive() });
const assessment = z.object({ version: z.literal(1), problem: z.string(), fitReason: z.string().nullable(),
  evidence: span.extend({ author: z.string().nullable() }).array(),
  analysis: span.extend({ kind: z.enum(["workaround", "limitation"]), summary: z.string() }).array().optional(),
  requirements: z.object({ documentId: z.uuid(), quote: z.string(), productFact: z.string().nullable(), status: z.enum(["supported", "unknown", "contradicted"]) }).array(),
});
const reportSchema = z.object({
  run: z.object({ id: z.uuid(), mode: z.enum(["product", "topic"]), input: z.string().nullable(), status: z.enum(["queued", "running", "partial", "complete", "blocked", "failed", "expired"]),
    sourceRunId: z.uuid().nullable(), createdAt: z.coerce.date(), expiresAt: z.coerce.date(), budgetMicros: micros, spentMicros: micros, reservedMicros: micros,
    profileSnapshot: z.object({ name: z.string(), pain: z.string().nullable(), solution: z.string().nullable(), targetUsers: z.string().nullable(), brief: z.unknown() }).nullable(),
    themes: demandTheme.array().nullable(),
  }),
  documents: z.object({ id: z.uuid(), runId: z.uuid(), purpose: z.enum(["profile", "demand"]), source: z.enum(["web", "reddit", "x"]),
    url: z.string(), canonicalUrl: z.string(), body: z.string().nullable(), outcome: z.string(), author: z.string().nullable(), retrievedAt: z.coerce.date(),
  }).array(),
  signals: span.extend({ id: z.uuid(), runId: z.uuid(), author: z.string().nullable(), explanation: z.string(), requestType: z.string(),
    productFit: z.enum(["yes", "no", "unknown"]).nullable(), assessment: assessment.nullable(),
  }).array(),
  attempts: z.object({ id: z.uuid(), status: z.enum(["reserved", "settled", "uncertain"]), actualMicros: micros.nullable() }).array(),
});
const decision = z.boolean().nullable();
const reviewSchema = z.object({ version: z.literal(1), fingerprint: z.string(), runId: z.uuid(),
  cases: z.object({ signalId: z.uuid(), relevant: decision, customerContext: decision, distinctNeed: decision,
    productFit: decision, painInterpretation: decision, citationsChecked: decision, notes: z.string() }).strict().array(),
  themes: z.object({ index: z.number().int().nonnegative(), interpretation: decision, notes: z.string() }).strict().array(),
}).strict();
type Report = z.infer<typeof reportSchema>;
type Review = z.infer<typeof reviewSchema>;

/** Pure saved-data checks. This module imports no database, provider adapter or environment loader. */
export function auditResearch(raw: unknown, judgement?: unknown, now = new Date()) {
  const report = reportSchema.parse(raw), { run, signals, documents, attempts } = report;
  if (run.status === "expired" || run.expiresAt <= now) throw new Error("Research content has expired; no evidence packet was exported.");
  const fingerprint = createHash("sha256").update(JSON.stringify(report)).digest("hex");
  const failures: string[] = [];
  const fail = (message: string) => failures.push(message);
  for (const [label, items] of [["document", documents], ["signal", signals], ["attempt", attempts]] as const) {
    if (new Set(items.map(item => item.id)).size !== items.length) fail(`Duplicate ${label} IDs.`);
  }
  for (const doc of documents) {
    if (doc.runId !== run.id) fail(`Foreign document: ${doc.id}`);
    try { canonicalUrl(doc.url); canonicalUrl(doc.canonicalUrl); }
    catch { fail(`Unsafe source URL: ${doc.id}`); }
  }
  const original = (item: z.infer<typeof span>, owner?: Report["signals"][number]) => {
    const doc = documents.find(doc => doc.id === item.documentId);
    const valid = doc?.runId === run.id && doc.purpose === "demand" && doc.outcome === "retrieved" && !!doc.body &&
      item.quoteStart < item.quoteEnd && item.quoteEnd <= doc.body.length && doc.body.slice(item.quoteStart, item.quoteEnd) === item.quote;
    if (!valid) fail(`Unsupported quotation: ${owner?.id ?? item.documentId}`);
    return valid;
  };
  for (const signal of signals) {
    if (signal.runId !== run.id) fail(`Foreign signal: ${signal.id}`);
    original(signal, signal);
    const reviewed = signal.assessment;
    if (!reviewed?.evidence.length) { fail(`Unreviewed case: ${signal.id}`); continue; }
    for (const evidence of reviewed.evidence) {
      original(evidence, signal);
      if (evidence.author !== documents.find(doc => doc.id === evidence.documentId)?.author) fail(`Unsupported author: ${signal.id}`);
    }
    if (!reviewed.evidence.some(item => item.documentId === signal.documentId && item.quoteStart === signal.quoteStart && item.quoteEnd === signal.quoteEnd && item.quote === signal.quote)) fail(`Primary evidence missing: ${signal.id}`);
    if (signal.author !== documents.find(doc => doc.id === signal.documentId)?.author) fail(`Unsupported case author: ${signal.id}`);
    const member = (id: string) => reviewed.evidence.some(item => item.documentId === id);
    for (const item of reviewed.analysis ?? []) {
      original(item, signal);
      if (!member(item.documentId)) fail(`Foreign pain evidence: ${signal.id}`);
    }
    for (const item of reviewed.requirements) {
      const doc = documents.find(doc => doc.id === item.documentId);
      if (!member(item.documentId) || !item.quote || !doc?.body?.includes(item.quote)) fail(`Foreign requirement evidence: ${signal.id}`);
      if (item.status === "unknown" ? item.productFact !== null : !item.productFact || ![run.profileSnapshot?.solution, run.profileSnapshot?.pain].some(fact => fact?.includes(item.productFact!))) fail(`Unsupported product fact: ${signal.id}`);
    }
    if (run.mode === "topic" && (signal.productFit !== null || reviewed.requirements.length || reviewed.fitReason)) fail(`Product qualification in topic mode: ${signal.id}`);
    if (run.mode === "product" && (!run.profileSnapshot || signal.productFit === null || !reviewed.requirements.length || !reviewed.fitReason ||
      signal.productFit === "yes" && reviewed.requirements.some(item => item.status !== "supported"))) fail(`Incomplete product qualification: ${signal.id}`);
  }
  const themed = new Set<string>();
  for (const theme of run.themes ?? []) {
    const members = signals.filter(signal => theme.signalIds.includes(signal.id));
    if (members.length !== theme.signalIds.length || theme.signalIds.some(id => themed.has(id))) fail("Invalid or repeated theme member.");
    theme.signalIds.forEach(id => themed.add(id));
    if (theme.kind === "recurring" && observedAuthorCount(members) < 2) fail("Recurring theme lacks independent observed identities.");
  }
  if (!["complete", "partial"].includes(run.status) || run.reservedMicros || attempts.some(item => item.status !== "settled" || item.actualMicros === null)) fail("Research or charges are not settled.");
  if (attempts.reduce((sum, item) => sum + (item.actualMicros ?? 0), 0) !== run.spentMicros || run.spentMicros > run.budgetMicros) fail("Recorded charges do not reconcile with run totals.");
  const sample = signals.slice(0, 20);
  const blank: Review = { version: 1, fingerprint, runId: run.id,
    cases: sample.map(signal => ({ signalId: signal.id, relevant: null, customerContext: null, distinctNeed: null, productFit: null, painInterpretation: null, citationsChecked: null, notes: "" })),
    themes: (run.themes ?? []).map((_, index) => ({ index, interpretation: null, notes: "" })),
  };
  const review = judgement === undefined ? blank : reviewSchema.parse(judgement);
  if (review.fingerprint !== fingerprint || review.runId !== run.id || review.cases.length !== sample.length ||
    new Set(review.cases.map(item => item.signalId)).size !== sample.length || review.cases.some(item => !sample.some(signal => signal.id === item.signalId)) ||
    review.themes.length !== blank.themes.length || new Set(review.themes.map(item => item.index)).size !== blank.themes.length || review.themes.some(item => !blank.themes.some(theme => theme.index === item.index))) throw new Error("Judgements must match this report and its fixed sample.");
  const checks = (item: Review["cases"][number]) => [item.relevant, item.customerContext, item.distinctNeed, item.painInterpretation, item.citationsChecked, ...(run.mode === "product" ? [item.productFit] : [])];
  const judged = review.cases.filter(item => checks(item).every(value => value !== null)).length;
  const acceptable = review.cases.filter(item => checks(item).every(value => value === true)).length;
  const allCitationsChecked = sample.length > 0 && review.cases.every(item => item.citationsChecked === true);
  const themesChecked = review.themes.every(item => item.interpretation === true);
  const passed = failures.length === 0 && sample.length === 20 && judged === 20 && acceptable >= 16 && allCitationsChecked && themesChecked;
  return { report, review, summary: { offline: true, runId: run.id, fingerprint, sampleSize: sample.length, sampleShortfall: 20 - sample.length,
    judged, acceptable, allCitationsChecked, themesChecked, integrityPassed: failures.length === 0, failures, humanAcceptancePassed: passed,
    status: failures.length ? "integrity_failed" : sample.length < 20 ? "insufficient_sample" : judged < 20 || review.themes.some(item => item.interpretation === null) ? "awaiting_human_review" : passed ? "passed" : "failed",
  } };
}

export function researchReviewMarkdown(audit: ReturnType<typeof auditResearch>) {
  const { run, signals, documents } = audit.report;
  // Raw HTML and Markdown links in retrieved text must remain inert in the local review document.
  const text = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/([\\`*_[\]#])/g, "\\$1");
  const lines = ["# Hark 已保存研究人工核对", "", "仅使用已有文件；没有搜索、模型调用或数据库写入。原文有效不等于需求相关，以下判断必须由人填写。", "",
    `研究：${run.id} · ${run.mode} · ${run.status}`, `研究输入：${text(run.input ?? "未知")}`, `已有原文复用：${run.sourceRunId ? "是" : "否（本工具未重新采集）"}`,
    `样本：${audit.summary.sampleSize}/20；不足 ${audit.summary.sampleShortfall} 条，不补造样本。`,
    `引用与账目检查：${audit.summary.integrityPassed ? "通过" : "未通过"}；人工质量验收：${audit.summary.humanAcceptancePassed ? "通过" : "尚未通过"}。`,
    `原记录内容保留至：${run.expiresAt.toISOString()}。到期请删除此私有副本；导出文件不会自动随数据库清理。`, "",
    "编辑 review.json 中的 true/false/null，再以相同原始报告重新运行。productFit 在主题模式留 null；painInterpretation 同时核对摘要有没有误读、没有说明的内容有没有被推断。所有引用须人工核对；notes 记录原因。", "",
    "## 已保存产品事实", "", text(JSON.stringify(run.profileSnapshot, null, 2) ?? "主题模式，没有产品画像。"), ""];
  const evidence = (item: z.infer<typeof span>) => {
    const doc = documents.find(doc => doc.id === item.documentId);
    lines.push(`来源：${text(doc?.url ?? "缺失")} · 收集：${doc?.retrievedAt.toISOString() ?? "未知"}`, `位置：${item.quoteStart}–${item.quoteEnd}`, "", `> ${text(item.quote).replace(/\n/g, "\n> ")}`, "");
    if (doc?.body) lines.push("原文上下文（引用前后最多 500 字）：", "", `> ${text(doc.body.slice(Math.max(0, item.quoteStart - 500), item.quoteEnd + 500)).replace(/\n/g, "\n> ")}`, "");
  };
  for (const [index, signal] of signals.entries()) {
    lines.push(`## 案例 ${index + 1}${index >= 20 ? "（样本之外，仅供主题上下文核对）" : ""}`, "", `ID：${signal.id}`, `问题：${text(signal.assessment?.problem ?? "未复核")}`, `说明：${text(signal.explanation)}`,
      `已存作者：${text(signal.author ?? "未知")}；产品匹配：${signal.productFit ?? "不适用"}`, "");
    for (const item of signal.assessment?.evidence ?? [signal]) evidence(item);
    for (const kind of ["workaround", "limitation"] as const) {
      const items = signal.assessment?.analysis?.filter(item => item.kind === kind);
      lines.push(`### ${kind === "workaround" ? "目前怎么解决" : "现有方案的局限"}`, "");
      if (!items?.length) lines.push(signal.assessment?.analysis ? "原文未明确说明，暂不推断。" : "历史分析尚未提取，不能视为原文没有说明。", "");
      for (const item of items ?? []) { lines.push(text(item.summary), ""); evidence(item); }
    }
    lines.push("产品匹配理由与要求：", text(JSON.stringify({ reason: signal.assessment?.fitReason, requirements: signal.assessment?.requirements }, null, 2)), "");
  }
  lines.push("## 痛点主题", "", "人工核对归类是否合理，是否把不同问题合并，是否把同一人或转载算成多人；身份数量不代表市场规模。", "");
  for (const [index, theme] of (run.themes ?? []).entries()) lines.push(`${index}. ${text(theme.title)} · ${theme.kind}`, text(theme.explanation), `案例：${theme.signalIds.join(", ")}`, "");
  return lines.join("\n");
}

async function main() {
  const [input, reviewPath, ...extra] = process.argv.slice(2);
  if (!input || extra.length) throw new Error("Usage: npm run research:audit -- <saved-report.json> [review.json]");
  globalThis.fetch = async () => { throw new Error("Network access is disabled during research audit."); };
  const audit = auditResearch(JSON.parse(await readFile(resolve(input), "utf8")), reviewPath ? JSON.parse(await readFile(resolve(reviewPath), "utf8")) : undefined);
  const output = resolve(".local/research-audits", randomUUID());
  await mkdir(output, { recursive: true, mode: 0o700 });
  for (const [name, value] of [["summary.json", JSON.stringify(audit.summary, null, 2)], ["review.json", JSON.stringify(audit.review, null, 2)], ["evidence.md", researchReviewMarkdown(audit)]]) {
    await writeFile(resolve(output, name), value, { mode: 0o600, flag: "wx" });
  }
  console.log(JSON.stringify({ ...audit.summary, output }));
  if (reviewPath && !audit.summary.humanAcceptancePassed || !audit.summary.integrityPassed) process.exitCode = 1;
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(() => { console.error("Research audit failed. Check arguments, report schema, retention and matching review IDs. No acceptance was recorded."); process.exitCode = 1; });
}
