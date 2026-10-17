import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ResearchResults } from "@/components/research/ResearchResults";
import { syntheticDemandReport } from "./fixtures/demand-report";
import { researchMoney } from "@/lib/demand/report";

vi.mock("@/components/research/RunControl", () => ({ RunControl: () => createElement("button", { type: "button" }, "重试未完成部分") }));
const render = (report = syntheticDemandReport(), tab: "signals" | "themes" = "signals") => renderToStaticMarkup(createElement(ResearchResults, { report, tab, enabled: false }));

describe("research evidence presentation", () => {
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
