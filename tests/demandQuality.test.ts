import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { validateDemandReview } from "@/lib/demand/quality";
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
      fitReason: product ? "已知自动字幕能力支持此需求。" : null, excludedProductQuote: null as string | null })),
    rejected: [] as { signalId: string; reason: string }[],
  };
}
const validate = (raw: ReturnType<typeof review>, items: ReturnType<typeof sample>[], product = false) => validateDemandReview(raw, items.map(x => x.signal), items.map(x => x.doc), product ? profile : null);

describe("contextual demand review", () => {
  it("merges repeat needs from one observed author while preserving both original quotations", () => {
    const items = [sample("u/Alice"), sample("@alice", "I still need a reliable automatic caption editor.")];
    const result = validate(review(items), items);
    expect(result.signals).toHaveLength(1);
    expect(result.signals[0].assessment.evidence.map(x => x.documentId)).toEqual(items.map(x => x.doc.id));
    expect(result.themes).toHaveLength(1); expect(result.themes[0].kind).toBe("individual");
  });
  it.each(["tutorial", "recommendation", "promotion", "unclear"])("refuses to publish %s material even with an exact first-person quote", (role) => {
    const items = [sample()]; const raw = review(items); raw.documents[0].role = role;
    expect(() => validate(raw, items)).toThrow("Non-customer source");
    raw.cases = []; raw.rejected = [{ signalId: items[0].signal.id, reason: "这不是用户自己的未解决需求。" }];
    expect(validate(raw, items)).toMatchObject({ signals: [], themes: [] });
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
  it("keeps distinct problems as separate individual cases even when both authors are known", () => {
    const items = [sample("alice"), sample("bob", "My editor crashes every time I export a long video.")];
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
