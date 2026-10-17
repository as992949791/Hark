import { randomUUID } from "node:crypto";
import { lookup } from "node:dns/promises";
import { afterEach, describe, expect, it, vi } from "vitest";
import { admitSourceUrl, canonicalUrl, deduplicateDocuments, validateSignals, validateThemes, type EvidenceDocument, type ValidatedSignal } from "@/lib/demand/evidence";
import { normalizeSource } from "@/lib/demand/sources";

vi.mock("node:dns/promises", () => ({ lookup: vi.fn(async () => [{ address: "93.184.216.34", family: 4 }]) }));
afterEach(() => vi.clearAllMocks());
const document = (values: Partial<EvidenceDocument> = {}): EvidenceDocument => ({ id: randomUUID(), purpose: "demand", source: "web",
  url: "https://forum.example.com/a", canonicalUrl: "https://forum.example.com/a", query: "video editor", snippet: null,
  body: "I need a video editor that creates accurate captions.", author: null, publishedAt: null,
  retrievedAt: "2026-10-01T00:00:00Z", outcome: "retrieved", ...values });
const signal = (doc: EvidenceDocument) => ({ documentId: doc.id, quoteStart: 0, quoteEnd: doc.body!.length, quote: doc.body!,
  explanation: "发帖者明确需要准确的自动字幕。", requestType: "recommendation" as const, relevant: true as const, productFit: null, fitFact: null });

describe("demand source evidence", () => {
  it.each(["file:///etc/passwd", "https://user:pass@example.com", "http://localhost/a", "http://127.1/", "http://10.0.0.1/", "http://169.254.169.254/", "http://[::1]/", "http://[::ffff:7f00:1]/", "https://example.com:8888", "https://private.local/"])("refuses private/non-web source %s", (url) => {
    expect(() => canonicalUrl(url)).toThrow();
  });
  it("rejects a public-looking hostname whose DNS includes a private destination", async () => {
    vi.mocked(lookup).mockResolvedValueOnce([{ address: "93.184.216.34", family: 4 }, { address: "10.0.0.2", family: 4 }] as never);
    await expect(admitSourceUrl("https://forum.example.com")).rejects.toThrow(/DNS/);
  });
  it("canonicalizes tracking/native IDs without conflating different pages", () => {
    expect(canonicalUrl("https://old.reddit.com/r/video/comments/AbC123/title/?utm_source=x")).toBe("https://www.reddit.com/comments/abc123/");
    expect(canonicalUrl("https://twitter.com/person/status/123?s=20")).toBe("https://x.com/i/web/status/123");
    expect(canonicalUrl("https://forum.example.com/a?b=2&utm_source=x&a=1#top")).toBe("https://forum.example.com/a?a=1&b=2");
    expect(canonicalUrl("https://forum.example.com/b")).not.toBe(canonicalUrl("https://forum.example.com/a"));
  });
  it("keeps Google snippets separate and generic web metadata unknown", () => {
    const found = normalizeSource("google.search", { results: [{ link: "https://forum.example.com/a", title: "Help", snippet: "need captions" }] }, { query: "video captions" });
    expect(found[0]).toMatchObject({ outcome: "snippet_only", body: null, source: "web", author: null, publishedAt: null });
    const page = normalizeSource("web.scrape", { url: found[0].url, markdown: "I need accurate captions.", author: "invented", publishedAt: "today" }, {});
    expect(page[0]).toMatchObject({ outcome: "retrieved", body: "I need accurate captions.", author: null, publishedAt: null });
    expect(normalizeSource("web.scrape", { url: found[0].url }, {})[0].outcome).toBe("failed");
  });
  it("supports native metadata only when the native identity agrees with its URL", () => {
    const reddit = normalizeSource("reddit.search", { posts: [{ id: "abc123", title: "Help", selftext: "I need accurate captions.", permalink: "/r/video/comments/abc123/help", author: "alice", createdUtc: 1750000000 }] }, {});
    expect(reddit[0]).toMatchObject({ source: "reddit", author: "alice", publishedAt: "2025-06-15T15:06:40.000Z" });
    const x = normalizeSource("twitter.search", { items: [{ id: "123", text: "Need captions", url: "https://x.com/a/status/123" }] }, {});
    expect(x[0]).toMatchObject({ source: "x", author: null, publishedAt: null });
    expect(normalizeSource("twitter.search", { items: [{ id: "123", text: "Need captions", url: "https://x.com/a/status/456" }] }, {})).toEqual([]);
  });
  it("reads the Reddit detail body's documented field", () => {
    const result = normalizeSource("reddit.post", { id: "abc123", title: "Help", body: "Which editor has accurate captions?", author: "alice", createdUtc: 1750000000,
      permalink: "/r/video/comments/abc123/help/" }, { url: "https://www.reddit.com/r/video/comments/abc123/help/" });
    expect(result[0]).toMatchObject({ outcome: "retrieved", body: "Help\n\nWhich editor has accurate captions?", author: "alice" });
  });
  it("reads X detail without fabricating a missing URL/handle and verifies the request's native ID", () => {
    const detail = { id: "123", text: "Which editor has accurate captions?", authorId: "987", createdUtc: 1750000000 };
    const result = normalizeSource("twitter.tweet", detail, { url: "https://x.com/i/web/status/123" });
    expect(result[0]).toMatchObject({ outcome: "retrieved", author: "x-id:987", canonicalUrl: "https://x.com/i/web/status/123" });
    expect(normalizeSource("twitter.tweet", detail, { url: "https://x.com/i/web/status/456" })).toEqual([]);
    expect(normalizeSource("twitter.tweet", { ...detail, url: "https://x.com/i/web/status/123" }, { url: "https://x.com/i/web/status/456" })).toEqual([]);
    expect(normalizeSource("reddit.post", { id: "abc123", title: "Help", body: "Need accurate captions", permalink: "/r/video/comments/abc123/help/" },
      { url: "https://www.reddit.com/r/video/comments/def123/help/" })).toEqual([]);
  });
  it("truncates source text without splitting a Unicode code point", () => {
    const result = normalizeSource("web.scrape", { url: "https://forum.example.com/help", markdown: `${"a".repeat(11_999)}😀` }, {});
    expect(result[0].body?.isWellFormed()).toBe(true);
    expect(result[0].body).toHaveLength(11_999);
  });
  it("deduplicates canonical identities and syndicated normalized content", () => {
    const first = document();
    expect(deduplicateDocuments([first, { ...first }, document({ url: "https://other.example.com/b", canonicalUrl: "https://other.example.com/b", body: first.body!.toUpperCase() })])).toHaveLength(1);
  });
  it("accepts exact original quotations and refuses snippets/preparation/cross-run IDs", () => {
    const doc = document(); const candidate = signal(doc);
    expect(validateSignals({ signals: [candidate] }, [doc], null)).toEqual([candidate]);
    for (const changed of [{ body: null, outcome: "snippet_only" as const }, { purpose: "profile" as const }, { id: randomUUID() }]) {
      expect(() => validateSignals({ signals: [candidate] }, [{ ...doc, ...changed }], null)).toThrow();
    }
    for (const changed of [{ quote: "invented quotation" }, { author: "invented" }, { publishedAt: "yesterday" }, { relevant: false }]) {
      expect(() => validateSignals({ signals: [{ ...candidate, ...changed }] }, [doc], null)).toThrow();
    }
  });
  it("keeps relevance distinct from product fit", () => {
    const doc = document(); const candidate = signal(doc);
    const profile = { version: 1, name: "Editor", url: null, pain: "captions", solution: "accurate captions", targetUsers: "creators", geography: null, budgetFit: null, brief: null };
    expect(() => validateSignals({ signals: [{ ...candidate, productFit: "yes", fitFact: "captions" }] }, [doc], null)).toThrow(/Topic/);
    expect(() => validateSignals({ signals: [{ ...candidate, productFit: "yes", fitFact: "invented capability" }] }, [doc], profile)).toThrow(/fact/);
    expect(validateSignals({ signals: [{ ...candidate, productFit: "unknown" }] }, [doc], profile)[0].productFit).toBe("unknown");
  });
  it("locates unique exact quotations in UTF-16 without relying on model character counts", () => {
    const original = document(); const doc = { ...original, body: `😀 ${original.body}` };
    const candidate = { ...signal(original), quoteStart: undefined, quoteEnd: undefined };
    expect(validateSignals({ signals: [candidate] }, [doc], null)[0]).toMatchObject({ quoteStart: 3, quoteEnd: 3 + original.body!.length });
    expect(validateSignals({ signals: [{ ...candidate, quoteStart: 999, quoteEnd: 1000 }] }, [doc], null)[0]).toMatchObject({ quoteStart: 3, quoteEnd: 3 + original.body!.length });
  });
  it("retains verified candidates when another quotation is fabricated", () => {
    const doc = document(); const candidate = signal(doc);
    expect(validateSignals({ signals: [candidate, { ...candidate, quote: "A quotation absent from the source" }] }, [doc], null)).toEqual([candidate]);
  });
  it("rejects ambiguous repeated quotations unless exact legacy offsets identify the occurrence", () => {
    const original = document(); const doc = { ...original, body: `${original.body} ${original.body}` };
    const candidate = { ...signal(original), quoteStart: undefined, quoteEnd: undefined };
    expect(() => validateSignals({ signals: [candidate] }, [doc], null)).toThrow(/quotation/);
    expect(validateSignals({ signals: [signal(original)] }, [doc], null)[0].quoteStart).toBe(0);
  });
  it("requires independent supported authors and quotations for recurrence", () => {
    const doc = document();
    const first: ValidatedSignal = { ...signal(doc), id: randomUUID(), author: "alice" };
    const second = { ...first, id: randomUUID(), quote: "Which editor produces accurate subtitles?", author: "bob" };
    const group = { themes: [{ title: "字幕准确性需求", signalIds: [first.id, second.id] }] };
    expect(validateThemes(group, [first, second])[0].kind).toBe("recurring");
    for (const changed of [{ author: "alice" }, { author: null }, { author: "@alice" }, { author: "x-id:987" }, { quote: first.quote }]) {
      expect(validateThemes(group, [first, { ...second, ...changed }])[0].kind).toBe("individual");
    }
    expect(() => validateThemes(group, [first])).toThrow(/citation/);
    expect(validateThemes(group, [{ ...first, author: "x-id:987" }, { ...second, author: "x-id:988" }])[0].kind).toBe("recurring");
  });
});
