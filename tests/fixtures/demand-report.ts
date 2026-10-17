import type { DemandReport } from "@/lib/demand/report";

/** Synthetic render data. Never imported by app routes, actions or live workers. */
export function syntheticDemandReport(): DemandReport {
  const runId = "10000000-0000-4000-8000-000000000001";
  const at = new Date("2026-10-17T06:00:00Z");
  const quote = "I need accurate automatic captions without editing every sentence by hand.";
  const second = "Which video editor has reliable subtitles for short videos?";
  const documents: DemandReport["documents"] = [
    { id: "20000000-0000-4000-8000-000000000001", runId, purpose: "demand", source: "reddit", query: "video captions", url: "https://www.reddit.com/r/video/comments/synthetic1/help/", canonicalUrl: "https://www.reddit.com/comments/synthetic1/", snippet: null, body: quote, contentHash: "synthetic", author: "example_creator", publishedAt: new Date("2026-10-01T00:00:00Z"), retrievedAt: at, outcome: "retrieved" },
    { id: "20000000-0000-4000-8000-000000000002", runId, purpose: "demand", source: "x", query: "captions lang:en", url: "https://x.com/i/web/status/123", canonicalUrl: "https://x.com/i/web/status/123", snippet: null, body: second, contentHash: "synthetic2", author: null, publishedAt: null, retrievedAt: at, outcome: "retrieved" },
    { id: "20000000-0000-4000-8000-000000000003", runId, purpose: "demand", source: "web", query: "video editor problems", url: "https://forum.example.com/captions", canonicalUrl: "https://forum.example.com/captions", snippet: "Looking for better video editing tools", body: null, contentHash: null, author: null, publishedAt: null, retrievedAt: at, outcome: "snippet_only" },
  ];
  const signals: DemandReport["signals"] = documents.slice(0, 2).map((doc, index) => ({ id: `30000000-0000-4000-8000-00000000000${index + 1}`, runId, documentId: doc.id,
    quoteStart: 0, quoteEnd: doc.body!.length, quote: doc.body!, explanation: index === 0 ? "创作者希望自动字幕足够准确，减少逐句手动修改。" : "发帖者正在寻找适合短视频、字幕可靠的编辑工具。", requestType: index === 0 ? "pain" : "recommendation", author: doc.author, productFit: null }));
  return {
    canResume: false, documents, signals,
    run: { id: runId, userId: "synthetic-owner", key: "40000000-0000-4000-8000-000000000001", mode: "topic", input: "短视频创作者的自动字幕需求", projectId: null,
      profileSnapshot: null, status: "partial", error: "read-web: Original page unavailable.", progress: "已有部分结果；一个网页仍未能读取", budgetMicros: 100_000, reservedMicros: 0, spentMicros: 3150,
      maxAttempts: 30, retryVersion: 0, leaseToken: null, leaseExpiresAt: null, createdAt: at, finishedAt: at, expiresAt: new Date("2026-11-16T06:00:00Z"),
      themes: [{ title: "减少手动校对字幕的负担", explanation: signals[0].explanation, signalIds: [signals[0].id], kind: "individual" }],
    },
    attempts: [{ id: "50000000-0000-4000-8000-000000000001", source: "web", kind: "data", status: "settled", actualMicros: 3150, upperBoundMicros: 5000, successful: false }],
  };
}
