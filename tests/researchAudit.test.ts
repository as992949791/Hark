import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { auditResearch, researchReviewMarkdown } from "../scripts/research-audit";
import { syntheticDemandReport } from "./fixtures/demand-report";

const now = new Date("2026-10-19T00:00:00Z");
const cleanup: string[] = [];
afterEach(async () => { await Promise.all(cleanup.splice(0).map(path => rm(path, { force: true, recursive: true }))); });
function report(count = 20) {
  const raw = syntheticDemandReport(), doc = raw.documents[0], signal = raw.signals[0];
  raw.signals = []; raw.documents = []; raw.run.themes = [];
  for (let index = 0; index < count; index++) {
    const documentId = randomUUID(), id = randomUUID(), body = `I fix captions manually for ${index + 1} hours every week.`, author = `person_${index}`;
    raw.documents.push({ ...doc, id: documentId, body, author, url: `https://forum.example.com/${index}`, canonicalUrl: `https://forum.example.com/${index}` });
    raw.signals.push({ ...signal, id, documentId, author, quote: body, quoteEnd: body.length,
      assessment: { version: 1, problem: "校对字幕耗时", fitReason: null, requirements: [],
        evidence: [{ documentId, author, quote: body, quoteStart: 0, quoteEnd: body.length }],
        analysis: [{ kind: "workaround", summary: "手动修正字幕。", documentId, quote: body, quoteStart: 0, quoteEnd: body.length }] } });
    raw.run.themes.push({ title: "手动校对负担", explanation: "保留不同人的表达。", signalIds: [id], kind: "individual" });
  }
  return raw;
}
function approved(raw = report()) {
  const review = auditResearch(raw, undefined, now).review;
  for (const item of review.cases) Object.assign(item, { relevant: true, customerContext: true, distinctNeed: true, productFit: null, painInterpretation: true, citationsChecked: true });
  for (const theme of review.themes) theme.interpretation = true;
  return review;
}

describe("offline research acceptance", () => {
  it("keeps quote integrity separate from human quality and never pads a short sample", () => {
    const audit = auditResearch(report(1), undefined, now);
    expect(audit.summary).toMatchObject({ integrityPassed: true, sampleSize: 1, sampleShortfall: 19, judged: 0, humanAcceptancePassed: false, status: "insufficient_sample" });
    expect(auditResearch(report(), undefined, now).summary.status).toBe("awaiting_human_review");
    expect(audit.review.cases[0].relevant).toBeNull();
    expect(researchReviewMarkdown(audit)).toContain("原文未明确说明");
  });
  it("requires 16 acceptable cases and every citation plus theme checked in the fixed first 20", () => {
    const raw = report(21), review = approved(raw);
    expect(review.cases).toHaveLength(20);
    for (const item of review.cases.slice(0, 4)) item.relevant = false;
    expect(auditResearch(raw, review, now).summary).toMatchObject({ acceptable: 16, humanAcceptancePassed: true });
    review.cases[4].relevant = false;
    expect(auditResearch(raw, review, now).summary.humanAcceptancePassed).toBe(false);
    review.cases[4].relevant = true; review.cases[0].citationsChecked = false;
    expect(auditResearch(raw, review, now).summary.humanAcceptancePassed).toBe(false);
    review.cases[0].citationsChecked = true; review.themes[0].interpretation = null;
    expect(auditResearch(raw, review, now).summary.status).toBe("awaiting_human_review");
  });
  it("binds human decisions to unchanged report contents and refuses duplicate or cherry-picked IDs", () => {
    const raw = report(21), review = approved(raw);
    review.cases[0].signalId = raw.signals[20].id;
    expect(() => auditResearch(raw, review, now)).toThrow("fixed sample");
    const duplicate = approved(raw); duplicate.cases[1].signalId = duplicate.cases[0].signalId;
    expect(() => auditResearch(raw, duplicate, now)).toThrow("fixed sample");
    const stale = approved(raw); raw.signals[0].explanation += "变化";
    expect(() => auditResearch(raw, stale, now)).toThrow("fixed sample");
  });
  it("checks product fit separately and leaves historical pain extraction unknown", () => {
    const raw = report(); raw.run.mode = "product";
    raw.run.profileSnapshot = { version: 1, name: "CaptionApp", url: null, pain: null, solution: "Automatic captions.", targetUsers: null, geography: null, budgetFit: null, brief: null };
    for (const signal of raw.signals) {
      signal.productFit = "unknown"; signal.assessment!.fitReason = "尚不能确认产品适配。";
      signal.assessment!.requirements = [{ documentId: signal.documentId, quote: signal.quote, status: "unknown", productFact: null }];
    }
    const review = approved(raw);
    expect(auditResearch(raw, review, now).summary.judged).toBe(0);
    review.cases.forEach(item => { item.productFit = true; });
    expect(auditResearch(raw, review, now).summary.humanAcceptancePassed).toBe(true);
    raw.signals[0].assessment!.analysis = undefined;
    expect(researchReviewMarkdown(auditResearch(raw, undefined, now))).toContain("历史分析尚未提取");
    raw.signals[0].productFit = "yes";
    expect(auditResearch(raw, undefined, now).summary.integrityPassed).toBe(false);
  });
  it.each(["primary", "support", "pain", "requirement", "author", "theme", "foreign", "url", "charges", "pending", "legacy"])("refuses integrity failure in %s", kind => {
    const raw = report(2), first = raw.signals[0], second = raw.signals[1];
    if (kind === "primary") first.quote = "A fabricated demand that never appeared.";
    if (kind === "support") first.assessment!.evidence[0].quoteEnd -= 1;
    if (kind === "pain") first.assessment!.analysis![0] = { ...second.assessment!.analysis![0] };
    if (kind === "requirement") first.assessment!.requirements.push({ documentId: second.documentId, quote: second.quote, productFact: null, status: "unknown" });
    if (kind === "author") first.author = "invented_author";
    if (kind === "theme") raw.run.themes![0].kind = "recurring";
    if (kind === "foreign") raw.documents[0].runId = randomUUID();
    if (kind === "url") raw.documents[0].url = "javascript:alert(1)";
    if (kind === "charges") raw.run.spentMicros += 1;
    if (kind === "pending") raw.attempts[0].status = "uncertain";
    if (kind === "legacy") first.assessment = null;
    expect(auditResearch(raw, undefined, now).summary).toMatchObject({ integrityPassed: false, humanAcceptancePassed: false, status: "integrity_failed" });
  });
  it("refuses expired snapshots and keeps untrusted raw HTML inert in evidence packets", () => {
    const raw = report(1);
    expect(() => auditResearch(raw, undefined, raw.run.expiresAt)).toThrow("expired");
    raw.signals[0].explanation = '<img src=x onerror="attack()"> [bad](javascript:attack())';
    const text = researchReviewMarkdown(auditResearch(raw, undefined, now));
    expect(text).not.toContain("<img"); expect(text).not.toContain("[bad]");
  });
  it("exports private files without environment or network access and exits nonzero for incomplete grading", async () => {
    const directory = await mkdtemp(join(tmpdir(), "hark-research-audit-")); cleanup.push(directory);
    const raw = report(1); raw.run.expiresAt = new Date(Date.now() + 86_400_000);
    await writeFile(join(directory, "input.json"), JSON.stringify(raw));
    await writeFile(join(directory, ".env"), "this is deliberately not a valid environment file");
    const run = (args: string[]) => spawnSync(process.execPath, [resolve("node_modules/tsx/dist/cli.mjs"), "--tsconfig", resolve("tsconfig.json"), resolve("scripts/research-audit.ts"), ...args], {
      cwd: directory, encoding: "utf8", timeout: 15000, env: { ...process.env, DATABASE_URL: "not-a-database", OPENROUTER_API_KEY: "must-not-use", ANYAPI_HOUSE_API_KEY: "must-not-use" },
    });
    const result = run([join(directory, "input.json")]);
    expect(result.stderr).toBe(""); expect(result.status).toBe(0);
    const summary = JSON.parse(result.stdout.trim());
    expect(summary).toMatchObject({ integrityPassed: true, humanAcceptancePassed: false });
    expect((await stat(summary.output)).mode & 0o777).toBe(0o700);
    for (const name of ["evidence.md", "summary.json", "review.json"]) expect((await stat(join(summary.output, name))).mode & 0o777).toBe(0o600);
    const saved = JSON.parse(await readFile(join(summary.output, "review.json"), "utf8"));
    expect(saved.cases).toHaveLength(1);
    expect(run([join(directory, "input.json"), join(summary.output, "review.json")]).status).toBe(1);
    raw.run.expiresAt = new Date(0); await writeFile(join(directory, "expired.json"), JSON.stringify(raw));
    const expired = run([join(directory, "expired.json")]);
    expect(expired.status).toBe(1); expect(expired.stdout).toBe(""); expect(expired.stderr).not.toContain(raw.signals[0].quote);
  });
});
