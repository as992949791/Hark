import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { demandReviewSchema, validateDemandReview } from "@/lib/demand/quality";
import type { EvidenceDocument, ValidatedSignal } from "@/lib/demand/evidence";
import type { ProfileSnapshot } from "@/lib/demand/contracts";

const profile: ProfileSnapshot = { version: 1, name: "CaptionApp", url: null, pain: null, solution: "Automatic captions for videos.", targetUsers: "Independent video creators.", geography: null, budgetFit: null, brief: null };
function sample(author: string | null = "alice", body = "I need accurate captions for my videos.") {
  const doc: EvidenceDocument = { id: randomUUID(), purpose: "demand", source: "web", url: `https://forum.example.com/${randomUUID()}`, canonicalUrl: `https://forum.example.com/${randomUUID()}`,
    query: null, snippet: null, body, author, publishedAt: null, retrievedAt: "2026-10-18T00:00:00Z", outcome: "retrieved" };
  const signal: ValidatedSignal = { id: randomUUID(), documentId: doc.id, quoteStart: 0, quoteEnd: body.length, quote: body,
    explanation: "发帖者需要字幕工具。", requestType: "recommendation", relevant: true, productFit: null, fitFact: null, author };
  return { doc, signal };
}
function review(items: ReturnType<typeof sample>[], product = false) {
  return {
    documents: items.map(({ doc }) => ({ documentId: doc.id, role: "seeker", contextQuote: doc.body! })),
    cases: items.map(({ doc, signal }) => ({ signalIds: [signal.id], problem: "准确的自动字幕", explanation: "用户明确需要自动字幕。", requestType: "recommendation",
      requirements: product ? [{ documentId: doc.id, quote: doc.body!, productFact: profile.solution, status: "supported" }] : [],
      fitReason: product ? "已知自动字幕能力支持此需求。" : null, excludedProductQuote: null as string | null, analysis: [] })),
    rejected: [] as { signalId: string; reason: string }[],
  };
}
const validate = (raw: ReturnType<typeof review>, items: ReturnType<typeof sample>[], product = false) => validateDemandReview(raw, items.map(x => x.signal), items.map(x => x.doc), product ? profile : null);

describe("contextual demand review", () => {
  it("does not accept a workaround cited from another case, and preserves evidence while merging repeats", () => {
    const items = [sample("alice", "I manually edit every single caption."), sample("alice", "Manual correction takes two hours per video.")];
    const raw = review(items);
    const analysis = [
      { kind: "workaround", summary: "逐条修正字幕。", documentId: items[0].doc.id, quote: items[0].doc.body! },
      { kind: "limitation", summary: "校对字幕耗时。", documentId: items[1].doc.id, quote: items[1].doc.body! },
    ];
    const reviewed = { ...raw, cases: raw.cases.map((item, index) => ({ ...item, analysis: [analysis[index]] })) };
    const result = validateDemandReview(reviewed, items.map(x => x.signal), items.map(x => x.doc), null);
    expect(result.signals[0].assessment.analysis).toHaveLength(2);
    reviewed.cases[0].analysis = [analysis[1]];
    expect(() => validateDemandReview(reviewed, items.map(x => x.signal), items.map(x => x.doc), null)).toThrow("pain-analysis quotation");
  });
  it("grounds structured workarounds and limitations in the retained case's original text", () => {
    const items = [sample("alice", "I fix every caption manually. It takes two hours per video.")];
    const raw = { ...review(items), cases: review(items).cases.map(item => ({ ...item, analysis: [
      { kind: "workaround", summary: "逐条手动修正字幕。", documentId: items[0].doc.id, quote: "I fix every caption manually." },
      { kind: "limitation", summary: "每个视频要花两小时。", documentId: items[0].doc.id, quote: "It takes two hours per video." },
    ] })) };
    const result = validateDemandReview(raw, items.map(x => x.signal), items.map(x => x.doc), null);
    expect(result.signals[0].assessment).toMatchObject({ analysis: [
      { kind: "workaround", quoteStart: 0, quoteEnd: 29 }, { kind: "limitation", quoteStart: 30, quoteEnd: 59 },
    ] });
    raw.cases[0].analysis[0].quote = "I use an expensive outsourced editor.";
    expect(() => validateDemandReview(raw, items.map(x => x.signal), items.map(x => x.doc), null)).toThrow("pain-analysis quotation");
  });
  it("requests a topic-only schema that cannot emit product requirements or exclusion", () => {
    const items = [sample()];
    expect(demandReviewSchema("topic").safeParse(review(items)).success).toBe(true);
    expect(demandReviewSchema("topic").safeParse(review(items, true)).success).toBe(false);
  });
  it("merges repeat needs from one observed author while preserving both original quotations", () => {
    const items = [sample("u/Alice"), sample("@alice", "I still need a reliable automatic caption editor.")];
    const result = validate(review(items), items);
    expect(result.signals).toHaveLength(1);
    expect(result.signals[0].assessment.evidence.map(x => x.documentId)).toEqual(items.map(x => x.doc.id));
    expect(result.themes).toHaveLength(1); expect(result.themes[0].kind).toBe("individual");
  });
  it.each(["tutorial", "recommendation", "promotion", "unclear"])("refuses to publish %s material even with an exact first-person quote", (role) => {
    const items = [sample()]; const raw = review(items); raw.documents[0].role = role;
    expect(validate(raw, items)).toMatchObject({ signals: [], themes: [], rejected: [{ signalId: items[0].signal.id }] });
    raw.cases = []; raw.rejected = [{ signalId: items[0].signal.id, reason: "这不是用户自己的未解决需求。" }];
    expect(validate(raw, items)).toMatchObject({ signals: [], themes: [] });
  });
  it("keeps grounded customer cases when the model also lists explicitly excluded sources as cases", () => {
    const items = [sample("alice"), sample("seller", "I built a caption tool and recommend everyone try it.")];
    const raw = review(items); raw.documents[1].role = "promotion";
    raw.rejected = [{ signalId: items[1].signal.id, reason: "这是自我推广。" }];
    const result = validate(raw, items);
    expect(result.signals.map(signal => signal.id)).toEqual([items[0].signal.id]);
    expect(result.rejected.map(item => item.signalId)).toEqual([items[1].signal.id]);
    const mixed = review(items); mixed.documents[1].role = "promotion";
    mixed.cases[0].signalIds.push(items[1].signal.id); mixed.cases.pop();
    expect(() => validate(mixed, items)).toThrow("Non-customer source");
    const duplicateCustomer = review([items[0]]); duplicateCustomer.rejected = [{ signalId: items[0].signal.id, reason: "同时剔除的冲突决定。" }];
    expect(() => validate(duplicateCustomer, [items[0]])).toThrow("citation");
  });
  it("keeps different authors separate and requires independent evidence for a recurring theme", () => {
    const items = [sample("alice"), sample("bob", "Which editor can generate accurate captions for my clips?")];
    const result = validate(review(items), items);
    expect(result.signals).toHaveLength(2); expect(result.themes[0].kind).toBe("recurring");
    const merged = review(items); merged.cases[0].signalIds.push(items[1].signal.id); merged.cases.pop();
    expect(() => validate(merged, items)).toThrow("Different observed authors");
  });
  it("does not invent identities for unknown authors or count repeated text as independent", () => {
    const unknown = [sample(null), sample(null, "I need an accurate caption editor for my clips.")];
    const result = validate(review(unknown), unknown);
    expect(result.signals).toHaveLength(2); expect(result.themes[0].kind).toBe("individual");
    const duplicate = [sample("alice"), sample("bob")];
    expect(validate(review(duplicate), duplicate).themes[0].kind).toBe("individual");
  });
  it("keeps one author's distinct problems in the same workflow as separate cases", () => {
    const items = [sample("alice"), sample("alice", "My editor crashes every time I export a long video.")];
    const raw = review(items); raw.cases[1].problem = "长视频导出崩溃";
    expect(validate(raw, items).themes.map(x => x.kind)).toEqual(["individual", "individual"]);
  });
  it("qualifies supported capabilities but leaves an unsupported price requirement unknown", () => {
    const items = [sample("alice", "I need automatic captions for my videos.")];
    const raw = review(items, true);
    expect(validate(raw, items, true).signals[0].productFit).toBe("yes");
    items[0].doc.body += " I cannot pay a subscription.";
    raw.cases[0].requirements.push({ documentId: items[0].doc.id, quote: items[0].doc.body!, productFact: null, status: "unknown" });
    expect(validate(raw, items, true).signals[0].productFit).toBe("unknown");
  });
  it("cannot justify a positive fit using only the target audience", () => {
    const items = [sample()]; const raw = review(items, true);
    raw.cases[0].requirements[0].productFact = profile.targetUsers;
    expect(() => validate(raw, items, true)).toThrow("exact capability fact");
  });
  it("accepts a short exact capability fact from the saved product profile", () => {
    const items = [sample()]; const raw = review(items, true);
    raw.cases[0].requirements[0].productFact = "自动字幕";
    const result = validateDemandReview(raw, items.map(x => x.signal), items.map(x => x.doc), { ...profile, solution: "自动字幕" });
    expect(result.signals[0].productFit).toBe("yes");
  });
  it("does not recommend a product the requester explicitly wants to replace", () => {
    const items = [sample("alice", "I need a free alternative to CaptionApp for accurate captions.")];
    const raw = review(items, true); raw.cases[0].excludedProductQuote = items[0].doc.body;
    expect(validate(raw, items, true).signals[0].productFit).toBe("no");
    expect(() => validate(raw, items)).toThrow("Topic research");
  });
  it("rejects fabricated context, unsupported requirements and missing decisions", () => {
    const items = [sample()]; const missing = review(items); missing.cases = [];
    expect(() => validate(missing, items)).toThrow("decisions are incomplete");
    const context = review(items); context.documents[0].contextQuote = "Fabricated context not in source";
    expect(() => validate(context, items)).toThrow("source-context review");
    const requirement = review(items, true); requirement.cases[0].requirements[0].quote = "Fabricated requirement not in source";
    expect(() => validate(requirement, items, true)).toThrow("requirement quotation");
  });

});
