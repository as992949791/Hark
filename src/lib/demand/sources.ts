import { z } from "zod";
import { canonicalUrl, sourceOf, type SourceDocument } from "./evidence";

export const dataSku = z.enum(["google.search", "web.scrape", "reddit.search", "reddit.post", "twitter.search", "twitter.tweet"]);
export type DataSku = z.infer<typeof dataSku>;
const text = z.string();
const redditPost = z.object({ id: text, title: text, selftext: text.optional(), body: text.optional(), permalink: text,
  author: text.optional(), createdUtc: z.number().optional() });
const tweet = z.object({ id: text, text, url: text, authorUsername: text.optional(), authorId: text.optional(), createdUtc: z.number().optional() });
const author = (value?: string) => value && !["[deleted]", "[removed]", "unknown"].includes(value.toLowerCase()) ? value : null;
function date(seconds?: number) {
  if (!seconds || seconds < 0 || seconds * 1000 > Date.now()) return null;
  const value = new Date(seconds * 1000);
  return Number.isNaN(value.getTime()) ? null : value.toISOString();
}

/** The only source of author/date is native structured metadata, never the model or generic scrape. */
export function normalizeSource(sku: DataSku, raw: unknown, input: Record<string, unknown>, now = new Date().toISOString()): SourceDocument[] {
  const base = (url: string, snippet: string | null, body: string | null): SourceDocument => ({
    url, canonicalUrl: canonicalUrl(url), source: sourceOf(url), query: typeof input.query === "string" ? input.query : null,
    snippet: snippet?.slice(0, 3000) ?? null, body: body?.slice(0, 12_000) || null,
    outcome: body ? "retrieved" : snippet ? "snippet_only" : "failed",
    author: null, publishedAt: null, retrievedAt: now,
  });
  if (raw === null) return [];
  if (sku === "google.search") {
    return z.object({ results: z.array(z.object({ link: text, snippet: text, title: text })) }).parse(raw).results.slice(0, 10)
      .flatMap((row) => { try { return [base(row.link, `${row.title}\n${row.snippet}`, null)]; } catch { return []; } });
  }
  if (sku === "web.scrape") {
    const page = z.object({ url: text, markdown: text.optional(), title: text.optional(), description: text.optional() }).parse(raw);
    return [base(page.url, null, page.markdown ?? null)];
  }
  if (sku.startsWith("reddit.")) {
    const posts = sku === "reddit.search" ? z.object({ posts: z.array(redditPost) }).parse(raw).posts.slice(0, 8) : [redditPost.parse(raw)];
    return posts.flatMap((post) => {
      try {
        const path = post.permalink.startsWith("/") ? `https://www.reddit.com${post.permalink}` : post.permalink;
        if (!/^[a-z0-9]+$/i.test(post.id) || canonicalUrl(path) !== `https://www.reddit.com/comments/${post.id.toLowerCase()}/`) return [];
        const body = sku === "reddit.post" ? post.body : post.selftext;
        const doc = base(path, post.title, body ? `${post.title}\n\n${body}` : null);
        return [{ ...doc, author: author(post.author), publishedAt: date(post.createdUtc) }];
      } catch { return []; }
    });
  }
  const posts = sku === "twitter.search" ? z.object({ items: z.array(tweet) }).parse(raw).items.slice(0, 8) : [tweet.extend({ url: text.optional() }).parse(raw)];
  return posts.flatMap((post) => {
    try {
      const url = post.url ?? (typeof input.url === "string" ? input.url : "");
      if (!/^\d+$/.test(post.id) || canonicalUrl(url) !== `https://x.com/i/web/status/${post.id}`) return [];
      // Keep the supported opaque ID; never invent a handle from an arbitrary status URL.
      const identity = post.authorId && /^\d+$/.test(post.authorId) ? `x-id:${post.authorId}` : null;
      return [{ ...base(url, null, post.text), author: sku === "twitter.search" ? author(post.authorUsername) : identity, publishedAt: date(post.createdUtc) }];
    } catch { return []; }
  });
}
