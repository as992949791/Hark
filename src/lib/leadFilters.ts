import { sql, type SQL } from "drizzle-orm";
import { z } from "zod";
import { projects, redditComments, redditPosts, xLeads, xPosts } from "@/db/schema";
import { DEFAULT_SCORE_THRESHOLD } from "@/lib/scan/constants";

/**
 * A project's own rules for which judged leads it wants, on top of the judge.
 * The judge decides whether someone is asking; these decide whether this user
 * cares, so a thread that shares the product's words without wanting it can be
 * kept out by name. Like the minimum score they are applied when leads are
 * read, never when they are scored: changing one changes the next page load
 * and the next alert, with no rescan and nothing deleted.
 */
export type LeadFilters = {
  /** A lead must mention one of these, when there are any. */
  mustMention: string[];
  /** A lead that mentions any of these is left out. */
  skipIfMentions: string[];
  /** The least score a Reddit lead needs to be alerted; null is the house floor. */
  alertMinScore: number | null;
  /** The least score an X ask needs to show or be alerted; null is none. */
  xMinScore: number | null;
};

export const NO_FILTERS: LeadFilters = {
  mustMention: [],
  skipIfMentions: [],
  alertMinScore: null,
  xMinScore: null,
};

/** Below this a Reddit lead is in the feed and not worth a message, unless the project says otherwise. */
export const ALERT_SCORE_FLOOR = 55;

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

const score = z.number().int().min(0).max(100).nullable();

export const leadFiltersSchema = z.object({
  mustMention: z.array(z.string()).max(FILTER_TERM_CAP).default([]),
  skipIfMentions: z.array(z.string()).max(FILTER_TERM_CAP).default([]),
  alertMinScore: score.default(null),
  xMinScore: score.default(null),
});

/** What the jsonb column holds, or no filters when it holds nothing usable. */
export function parseLeadFilters(stored: unknown): LeadFilters {
  const parsed = leadFiltersSchema.safeParse(stored ?? {});
  return parsed.success ? parsed.data : NO_FILTERS;
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

/** Whether `text` mentions `term` as whole words. The SQL below is this, in Postgres. */
export function mentions(text: string, term: string): boolean {
  const key = wordsOf(term);
  return key !== "" && ` ${wordsOf(text)} `.includes(` ${key} `);
}

/** Whether a lead's text passes a project's word lists. */
export function passesWords(text: string, filters: LeadFilters): boolean {
  if (filters.skipIfMentions.some((term) => mentions(text, term))) {
    return false;
  }
  return filters.mustMention.length === 0 || filters.mustMention.some((term) => mentions(text, term));
}

/**
 * Postgres's `wordsOf`. `[^[:alnum:]]` is `[^\p{L}\p{N}]` in a UTF-8 database,
 * and a normalised term holds only letters, digits and single spaces, so it
 * can sit inside a LIKE pattern with nothing to escape.
 */
function wordsSql(text: SQL): SQL {
  return sql`btrim(regexp_replace(lower(${text}), '[^[:alnum:]]+', ' ', 'g'))`;
}

function anyTermSql(list: "mustMention" | "skipIfMentions", haystack: SQL): SQL {
  return sql`exists (
    select 1 from jsonb_array_elements_text(coalesce(${projects.leadFilters} -> ${sql.raw(`'${list}'`)}, '[]'::jsonb)) as term
    where ${wordsSql(sql`term`)} <> ''
      and ${haystack} like '% ' || ${wordsSql(sql`term`)} || ' %'
  )`;
}

/**
 * The project's word lists as a condition on a query that joins `projects`.
 * They are read off the row itself, so the feed, the X tab and the digest all
 * ask the same question without loading the filters first.
 */
export function wordsWhere(text: SQL): SQL {
  const haystack = sql`(' ' || ${wordsSql(text)} || ' ')`;
  return sql`(${projects.leadFilters} is null or (
    not ${anyTermSql("skipIfMentions", haystack)}
    and (jsonb_array_length(coalesce(${projects.leadFilters} -> 'mustMention', '[]'::jsonb)) = 0
      or ${anyTermSql("mustMention", haystack)})
  ))`;
}

/**
 * What a Reddit lead is checked against: the thread's title and opening post,
 * and the reply itself when the lead is one. A reply in a thread about
 * something the owner excluded is in that thread. Needs `reddit_posts` and a
 * left-joined `reddit_comments`.
 */
export function redditWordsWhere(): SQL {
  return wordsWhere(
    sql`concat_ws(' ', ${redditPosts.title}, ${redditPosts.body}, ${redditComments.body})`,
  );
}

/** What an X lead is checked against: the post's own text. */
export function xWordsWhere(): SQL {
  return wordsWhere(sql`${xPosts.text}`);
}

/** The feed's own floor on a Reddit lead: the project's minimum score, or the default. */
export const FEED_FLOOR_SQL = sql`coalesce(${projects.scoreThreshold}, ${DEFAULT_SCORE_THRESHOLD})`;

/**
 * The least score a Reddit lead needs to be alerted: the project's alert
 * floor or the house one, and never under the feed's, since a message should
 * not point at a lead the feed hides.
 */
export const ALERT_FLOOR_SQL = sql<number>`greatest(
  coalesce((${projects.leadFilters} ->> 'alertMinScore')::int, ${ALERT_SCORE_FLOOR}),
  ${FEED_FLOOR_SQL}
)`;

/** The least score an X ask needs, shown or alerted. No floor unless the project sets one. */
export const X_FLOOR_SQL = sql<number>`coalesce((${projects.leadFilters} ->> 'xMinScore')::int, 0)`;

/**
 * Whether the X tab shows a lead: its words pass, and an ask is at the
 * project's X floor. A reply is not scored the way an ask is, so the floor is
 * not asked of it. Needs `projects` and `x_posts` joined.
 */
export function xShownWhere(): SQL {
  return sql`(${xWordsWhere()} and (${xLeads.kind} <> 'ask' or ${xLeads.score} >= ${X_FLOOR_SQL}))`;
}
