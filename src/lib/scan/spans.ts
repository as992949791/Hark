import { PARENT_CHAR_BUDGET, plainTypography, truncateBody } from "./evidence";
import type { ScorableItem } from "./judgement";

/**
 * A candidate's own words cut into sentences the model can point at. Jev
 * cannot write a quote, it can only choose one, so the need quote is the
 * sentence id it picks and the text is copied from here, verbatim, by code.
 */
export type Spans = Record<string, string>;

/**
 * A Choice takes at most 255 options (TypeSafe API reference), and one of
 * them is `none`. A post with more sentences than that has neighbours merged
 * until it fits; the quote is then two sentences, still the author's own.
 */
const SPAN_LIMIT = 254;

/**
 * The title first, then the body at sentence ends and line breaks, ids in
 * reading order. A comment has no title of its own: the thread's title is the
 * original poster's words, so it goes in with the parent post, never here.
 */
export function spans(title: string | null, body: string): Spans {
  let parts = title === null ? [] : [plainTypography(title).trim()];
  for (const paragraph of plainTypography(truncateBody(body)).split(/\n+/)) {
    for (const sentence of paragraph.trim().split(/(?<=[.!?])\s+/)) {
      if (sentence.trim()) {
        parts.push(sentence.trim());
      }
    }
  }
  while (parts.length > SPAN_LIMIT) {
    const merged: string[] = [];
    for (let index = 0; index < parts.length; index += 2) {
      merged.push(parts.slice(index, index + 2).join(" "));
    }
    parts = merged;
  }
  return Object.fromEntries(parts.map((text, index) => [`s${index}`, text]));
}

/** The sentences a candidate may be quoted from: a commenter's own, never the thread's title. */
export function ownSpans(item: ScorableItem): Spans {
  return spans(item.parentBody === null ? item.title : null, item.body);
}

/**
 * One candidate as the `posts.<id>` object of a Jev request. The parent post
 * a comment replies to is sent as one block, not as spans: a quote from it is
 * somebody else's need, so it is never offered as an option.
 */
export function itemState(item: ScorableItem): Record<string, unknown> {
  const state: Record<string, unknown> = {
    subreddit: item.subreddit,
    author: item.author ?? "unknown",
    age_hours: Math.round(item.ageHours),
    upvotes: item.upvotes ?? 0,
    comments_on_thread: item.numComments ?? 0,
    sentences: ownSpans(item),
  };
  if (item.parentBody !== null) {
    state.thread_title = plainTypography(item.title);
    state.parent_post_replied_to = plainTypography(truncateBody(item.parentBody, PARENT_CHAR_BUDGET));
  }
  return state;
}
