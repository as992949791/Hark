/**
 * How a filter word is compared, with nothing server-side in it, so the form
 * that edits the lists and the queries that apply them agree on what counts as
 * the same word (lib/leadFilters.ts).
 */

/** How many words each list may hold; past this it is a search plan, not a filter. */
export const FILTER_TERM_CAP = 50;

/**
 * A term the way both it and the text it is looked for in are compared:
 * lower case, every run of anything but letters and digits one space. So
 * "Open-source" finds "open source", and "form" does not find "formula".
 */
export function wordsOf(text: string): string {
  return text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

/**
 * One list as typed: a word or phrase per line or between commas, each kept
 * as written for the form, duplicates and ones with no letters or digits
 * dropped, since those would match every space.
 */
export function termsOf(raw: string): string[] {
  const seen = new Set<string>();
  const terms: string[] = [];
  for (const piece of raw.split(/[\n,]/)) {
    const term = piece.trim();
    const key = wordsOf(term);
    if (key && !seen.has(key)) {
      seen.add(key);
      terms.push(term);
    }
  }
  return terms;
}

