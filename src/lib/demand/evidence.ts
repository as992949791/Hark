import { createHash } from "node:crypto";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { z } from "zod";
import { isPublicAddress } from "@/lib/alerts/outbound";
import { DemandError, type DemandTheme, type ProfileSnapshot } from "./contracts";

export type Source = "web" | "reddit" | "x";
export type SourceDocument = {
  source: Source; url: string; canonicalUrl: string; query: string | null;
  snippet: string | null; body: string | null; author: string | null;
  publishedAt: string | null; retrievedAt: string;
  outcome: "retrieved" | "snippet_only" | "failed";
};
export type EvidenceDocument = SourceDocument & { id: string; purpose: "profile" | "demand" };

/** No network access. Native IDs and tracking-free URLs identify repeated discoveries. */
export function canonicalUrl(value: string): string {
  const url = new URL(value);
  const host = url.hostname.toLowerCase().replace(/\.$/, "");
  const address = host.replace(/^\[|\]$/g, "");
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password ||
    (url.port && !["80", "443"].includes(url.port)) ||
    (!isIP(address) && (!host.includes(".") || /\.(localhost|local|internal|test|invalid)$/.test(host))) ||
    (isIP(address) && (!isPublicAddress(address) || address.startsWith("::ffff:")))) throw new DemandError("Source URL must be public HTTP(S).");
  url.hostname = host; url.hash = "";
  const reddit = /(?:^|\.)reddit\.com$/.test(host) && /\/comments\/([a-z0-9]+)/i.exec(url.pathname);
  if (reddit) return `https://www.reddit.com/comments/${reddit[1].toLowerCase()}/`;
  const tweet = /^(?:www\.|mobile\.)?(?:x|twitter)\.com$/.test(host) && /\/(?:[^/]+\/status|i\/web\/status)\/(\d+)/.exec(url.pathname);
  if (tweet) return `https://x.com/i/web/status/${tweet[1]}`;
  for (const name of [...url.searchParams.keys()]) if (/^(utm_|fbclid$|gclid$)/i.test(name)) url.searchParams.delete(name);
  url.searchParams.sort();
  return url.href;
}

/** DNS is checked for submitted and returned URLs; the app never fetches these pages itself. */
export async function admitSourceUrl(value: string): Promise<string> {
  const canonical = canonicalUrl(value);
  for (const hostname of new Set([new URL(value).hostname, new URL(canonical).hostname])) {
    const host = hostname.replace(/^\[|\]$/g, "");
    const answers = isIP(host) ? [{ address: host }] : await lookup(host, { all: true });
    if (!answers.length || answers.some((answer) => !isPublicAddress(answer.address))) throw new DemandError("Source DNS is not public.");
  }
  return canonical;
}

export function sourceOf(value: string): Source {
  const host = new URL(value).hostname;
  if (/(?:^|\.)reddit\.com$/.test(host)) return "reddit";
  if (/^(?:www\.|mobile\.)?(?:x|twitter)\.com$/.test(host)) return "x";
  return "web";
}

export function contentHash(text: string) {
  return createHash("sha256").update(text.normalize("NFKC").toLowerCase().replace(/\s+/g, " ").trim()).digest("hex");
}

export function deduplicateDocuments<T extends SourceDocument>(documents: T[]): T[] {
  const urls = new Set<string>(); const hashes = new Set<string>();
  return documents.filter((doc) => {
    const hash = doc.body ? contentHash(doc.body) : null;
    if (urls.has(doc.canonicalUrl) || (hash && hashes.has(hash))) return false;
    urls.add(doc.canonicalUrl); if (hash) hashes.add(hash);
    return true;
  });
}

const chinese = z.string().min(1).max(1500).regex(/\p{Script=Han}/u, "Explain the judgement in Chinese.");
const signalSchema = z.object({
  documentId: z.uuid(), quoteStart: z.number().int().nonnegative().optional(), quoteEnd: z.number().int().positive().optional(),
  quote: z.string().min(8).max(3000), explanation: chinese,
  requestType: z.enum(["pain", "recommendation", "alternative"]), relevant: z.literal(true),
  productFit: z.enum(["yes", "no", "unknown"]).nullable(),
  fitFact: z.string().nullable(),
}).strict();
export const extractedSignals = z.object({ signals: signalSchema.array().max(24) }).strict();
export const quotedSignals = z.object({ signals: signalSchema.omit({ quoteStart: true, quoteEnd: true }).array().max(24) }).strict();
export type ExtractedSignal = z.infer<typeof extractedSignals>["signals"][number];
export type ValidatedSignal = ExtractedSignal & { id: string; author: string | null; quoteStart: number; quoteEnd: number };

/** Exact quotations are located in source text; model author/date fields are never accepted. */
export function validateSignals(raw: unknown, documents: EvidenceDocument[], profile: ProfileSnapshot | null) {
  const { signals } = extractedSignals.parse(raw);
  const accepted: (ExtractedSignal & { quoteStart: number; quoteEnd: number })[] = [];
  let firstError: DemandError | undefined;
  for (const signal of signals) {
    try {
      const doc = documents.find((item) => item.id === signal.documentId);
      if (!doc || doc.purpose !== "demand" || doc.outcome !== "retrieved" || !doc.body) throw new DemandError("Unsupported source quotation.");
      let start = signal.quoteStart, end = signal.quoteEnd;
      if (start === undefined || end === undefined || start >= end || end > doc.body.length || doc.body.slice(start, end) !== signal.quote) {
        start = doc.body.indexOf(signal.quote); end = start + signal.quote.length;
        if (start < 0 || doc.body.indexOf(signal.quote, start + 1) !== -1) throw new DemandError("Unsupported or ambiguous source quotation.");
      }
      if (!profile && (signal.productFit !== null || signal.fitFact !== null)) throw new DemandError("Topic research cannot claim product fit.");
      if (profile && signal.productFit === null) throw new DemandError("Product qualification is missing.");
      if (signal.productFit === "yes" && (!signal.fitFact || ![profile?.pain, profile?.solution, profile?.targetUsers]
        .some((fact) => fact?.includes(signal.fitFact!)))) throw new DemandError("Product fit needs an exact product fact.");
      accepted.push({ ...signal, quoteStart: start, quoteEnd: end });
    } catch (error) {
      if (!(error instanceof DemandError)) throw error;
      firstError ??= error;
    }
  }
  if (!accepted.length && firstError) throw firstError;
  return accepted;
}

export const groupedSignals = z.object({ themes: z.array(z.object({ title: chinese, signalIds: z.array(z.uuid()).min(1).max(24) }).strict()).max(12) }).strict();

/** Equal handles across platforms are conservatively treated as one observed identity. */
function authorKey(author: string | null) {
  return author?.trim().toLowerCase().replace(/^(?:reddit:|x:|u\/|@)/, "") || null;
}

export function observedAuthorCount(signals: Pick<ValidatedSignal, "quote" | "author">[]) {
  const uniqueQuotes = new Set<string>();
  const authors = new Set(signals.filter((signal) => {
    const hash = contentHash(signal.quote);
    if (uniqueQuotes.has(hash)) return false;
    uniqueQuotes.add(hash); return true;
  }).map((signal) => authorKey(signal.author)).filter(Boolean));
  // Opaque X IDs cannot be matched to handles. Do not add both populations.
  const ids = [...authors].filter((identity) => identity!.startsWith("x-id:")).length;
  return Math.max(ids, authors.size - ids);
}

export function validateThemes(raw: unknown, signals: ValidatedSignal[]): DemandTheme[] {
  const { themes } = groupedSignals.parse(raw);
  const used = new Set<string>();
  return themes.map((theme) => {
    if (new Set(theme.signalIds).size !== theme.signalIds.length) throw new DemandError("Repeated theme citation.");
    const members = theme.signalIds.map((id) => {
      const signal = signals.find((item) => item.id === id);
      if (!signal || used.has(id)) throw new DemandError("Unsupported theme citation.");
      used.add(id); return signal;
    });
    // Explanations come directly from cited signal judgements. No free-form workarounds/market claims.
    return { ...theme, explanation: members.map((signal) => signal.explanation).join("\n"), kind: observedAuthorCount(members) >= 2 ? "recurring" : "individual" };
  });
}
