import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ResearchResults } from "@/components/research/ResearchResults";
import { syntheticDemandReport } from "./fixtures/demand-report";
import { researchMoney, researchSourceFailure } from "@/lib/demand/report";
import { observedAuthorCount } from "@/lib/demand/evidence";

vi.mock("@/components/research/RunControl", () => ({ RunControl: () => createElement("button", { type: "button" }, "重试未完成部分") }));
const render = (report = syntheticDemandReport(), tab: "signals" | "themes" = "signals") => renderToStaticMarkup(createElement(ResearchResults, { report, tab, enabled: false }));

describe("research evidence presentation", () => {
  it("shows all supporting original sources for one merged demand case", () => {
    const report = syntheticDemandReport(), first = report.signals[0];
    first.assessment = { version: 1, problem: "准确的自动字幕", fitReason: null, requirements: [],
      evidence: report.signals.map((signal) => ({ documentId: signal.documentId, quoteStart: signal.quoteStart, quoteEnd: signal.quoteEnd, quote: signal.quote, author: first.author })) };
    report.signals = [first];
    const html = render(report);
    expect(html).toContain("保留 2 处原文");
    expect(html).toContain("Which video editor has reliable subtitles");
    expect(html).toContain(report.documents[1].url);
  });
  it("does not certify legacy unreviewed candidates or trust their stored recurring label", () => {
    const report = syntheticDemandReport(); report.run.themes![0].kind = "recurring";
    report.signals.forEach((signal) => { signal.assessment = null; });
    report.run.mode = "product"; report.signals[0].productFit = "yes";
    expect(render(report)).toContain("历史候选尚未经过新版语境筛选");
    expect(render(report)).not.toContain("符合产品需求");
    const html = render(report, "themes");
    expect(html).toContain("待复核主题"); expect(html).not.toContain("多位作者的观察");
  });
  it("preserves recorded charge precision even above one cent", () => {
    expect(researchMoney(12_345)).toBe("$0.012345");
  });
  it("presents source quotes, unknown metadata, real collection dates, partial status and small actual charges", () => {
    const html = render(); expect(html).toContain("部分完成"); expect(html).toContain("$0.003150"); expect(html).toContain("作者未知");
    expect(html).toContain("准确"); expect(html).toContain("I need accurate automatic captions"); expect(html).toContain("发布：未知");
    expect(html).toContain("只有检索摘要，未用于原文需求判断"); expect(html).toContain('rel="noopener noreferrer"'); expect(html).not.toContain("符合产品需求");
  });
  it("links theme evidence back to the persisted signal and labels individual cases conservatively", () => {
    const report = syntheticDemandReport(), html = render(report, "themes");
    expect(html).toContain("个别案例"); expect(html).toContain(`#signal-${report.signals[0].id}`); expect(html).not.toContain("市场规模为");
    expect(html).toContain("观察到的不同作者：1 位（未知作者未计入）");
  });
  it("shows safe source failures even when admission failed before a bill or document existed", () => {
    const report = syntheticDemandReport(); report.run.error = "reddit-search: Request was not admitted. secret-provider-detail\nread-web: budget limit";
    const html = render(report);
    expect(html).toContain("Reddit 部分步骤未完成"); expect(html).toContain("公开网页 部分步骤未完成");
    expect(html).not.toContain("X 部分步骤未完成"); expect(html).not.toContain("secret-provider-detail");
    expect(researchSourceFailure("group: failed", "reddit")).toBeNull();
  });
  it("counts known observed identities conservatively across duplicated quotes, handles and opaque IDs", () => {
    expect(observedAuthorCount([
      { quote: "Same statement", author: "u/Alice" }, { quote: "Same statement", author: "@Bob" },
      { quote: "Another statement", author: "@alice" }, { quote: "Third statement", author: "x-id:123" },
      { quote: "Unknown identity", author: null },
    ])).toBe(1);
    expect(observedAuthorCount([{ quote: "a", author: "Alice" }, { quote: "b", author: "Bob" }])).toBe(2);
  });
  it("does not show product qualification in topic mode and escapes untrusted explanations", () => {
    const report = syntheticDemandReport(); report.signals[0].productFit = "yes"; report.signals[0].explanation = "<script>syntheticAttack()</script>";
    const html = render(report); expect(html).not.toContain("符合产品需求"); expect(html).toContain("&lt;script&gt;"); expect(html).not.toContain("<script>syntheticAttack");
  });
  it("renders the honest empty state without synthetic results", () => {
    const html = renderToStaticMarkup(createElement(ResearchResults, { report: null, tab: "signals", enabled: false }));
    expect(html).toContain("让真实讨论回答你的问题"); expect(html).not.toContain("example_creator");
  });
  it("redacts expired evidence views while retaining costs", () => {
    const report = syntheticDemandReport(); report.run.status = "expired"; report.run.input = null; report.run.profileSnapshot = null; report.run.themes = null;
    report.documents = []; report.signals = [];
    const html = render(report); expect(html).toContain("内容已到期"); expect(html).toContain("$0.003150"); expect(html).not.toContain("I need accurate");
  });
});
