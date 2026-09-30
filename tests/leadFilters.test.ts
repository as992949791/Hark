import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { mentions, passesWords, termsOf, wordsOf, type LeadFilters } from "@/lib/leadFilters";

/**
 * A project's own filters on top of the judge: words a lead must or must not
 * mention, and the least score a lead needs to be alerted or an X ask to show.
 * The repro is two threads that share the product's word, one asking for it
 * and one that is not, which the judge can score alike.
 */

const hasDatabase = !!process.env.DATABASE_URL;
const HOUR_MS = 3_600_000;

const none: LeadFilters = { mustMention: [], skipIfMentions: [], alertMinScore: null, xMinScore: null };

describe("word matching", () => {
  it("matches whole words in any case and any punctuation", () => {
    expect(mentions("Looking for an Open-Source CRM!", "open source")).toBe(true);
    expect(mentions("A formula question", "form")).toBe(false);
    expect(mentions("Need a form builder", "FORM")).toBe(true);
    expect(mentions("anything", "++")).toBe(false);
    expect(mentions("How do you send invoices?", "invoice")).toBe(true);
    expect(mentions("Two quick fixes", "fix")).toBe(true);
    expect(mentions("The invoice's due date", "invoice")).toBe(true);
    expect(mentions("Invoicing is dull", "invoice")).toBe(false);
  });

  it("reads a typed list one per line or between commas, once each", () => {
    expect(termsOf("hiring, Homework\n\nhomework\n  ++ \njob post")).toEqual(["hiring", "Homework", "job post"]);
    expect(wordsOf("  Job--Post ")).toBe("job post");
  });

  it("drops a skipped word first, then asks for one of the required ones", () => {
    const filters = { ...none, mustMention: ["invoice"], skipIfMentions: ["hiring"] };
    expect(passesWords("Any invoice tool?", filters)).toBe(true);
    expect(passesWords("Hiring: invoice clerk", filters)).toBe(false);
    expect(passesWords("Any CRM?", filters)).toBe(false);
    expect(passesWords("Any CRM?", none)).toBe(true);
  });
});

describe.skipIf(!hasDatabase)("a project's filters where leads are read", () => {
  async function fixture(leadFilters: Partial<LeadFilters> | null, scoreThreshold: number | null = null) {
    process.env.APP_ENCRYPTION_KEY ??= Buffer.alloc(32).toString("base64");
    const { db } = await import("@/db");
    const schema = await import("@/db/schema");
    const [user] = await db().insert(schema.users).values({ clerkUserId: `test_${randomUUID()}` }).returning();
    const [project] = await db()
      .insert(schema.projects)
      .values({
        userId: user.id,
        name: "Invoicer",
        scoreThreshold,
        leadFilters: leadFilters ? { ...none, ...leadFilters } : null,
      })
      .returning();
    return { db, schema, user, project };
  }

  type Owned = Awaited<ReturnType<typeof fixture>>;

  /** A Reddit lead on its own thread, found now and posted an hour ago. */
  async function redditLead({ db, schema, project }: Owned, title: string, body: string, score: number) {
    const [post] = await db()
      .insert(schema.redditPosts)
      .values({
        id: `p${randomUUID().slice(0, 8)}`,
        subreddit: "smallbusiness",
        author: "asker",
        title,
        body,
        url: `https://www.reddit.com/r/smallbusiness/comments/${randomUUID().slice(0, 6)}/x/`,
        createdAt: new Date(Date.now() - HOUR_MS),
      })
      .returning();
    const [lead] = await db().insert(schema.leads).values({ projectId: project.id, postId: post.id, score }).returning();
    return lead.id;
  }

  /** An X ask, found now and posted an hour ago. */
  async function xAsk({ db, schema, project }: Owned, text: string, score: number) {
    const id = randomUUID().replace(/\D/g, "").slice(0, 18);
    await db().insert(schema.xPosts).values({ id, text, authorUsername: "asker", createdAt: new Date(Date.now() - HOUR_MS) });
    const [lead] = await db()
      .insert(schema.xLeads)
      .values({ projectId: project.id, tweetId: id, score, authorUsername: "asker" })
      .returning();
    return lead.id;
  }

  async function seedRepro(owned: Owned) {
    const wanted = await redditLead(owned, "Which invoice software for a 3 person agency?", "Paying too much for FreshBooks.", 72);
    const unrelated = await redditLead(owned, "Hiring: invoice clerk, remote", "We need someone to chase invoices.", 70);
    return { wanted, unrelated };
  }

  it("keeps the unrelated thread that shares the product's word out of the feed and the digest", async () => {
    const owned = await fixture({ skipIfMentions: ["hiring"] });
    const { wanted } = await seedRepro(owned);
    const { listLeads, countLeads, newLeadCount, wordsHideCount } = await import("@/lib/leads");
    const { newLeadsSince } = await import("@/lib/alerts/leads");
    const { alertable } = await import("@/lib/alerts/select");

    expect((await listLeads(owned.project.id, { status: "new", days: 30 })).map((row) => row.id)).toEqual([wanted]);
    expect(await countLeads(owned.project.id, { status: "new", days: 30 })).toBe(1);
    expect(await newLeadCount(owned.project.id)).toBe(1);
    expect(await wordsHideCount(owned.project.id)).toEqual({ hidden: 1, total: 2 });
    const since = new Date(Date.now() - 2 * HOUR_MS);
    expect(alertable(await newLeadsSince(owned.project.id, since), since).map((row) => row.id)).toEqual([wanted]);
  });

  it("with no filters shows and alerts both, which is the complaint", async () => {
    const owned = await fixture(null);
    await seedRepro(owned);
    const { listLeads } = await import("@/lib/leads");
    const { newLeadsSince } = await import("@/lib/alerts/leads");
    const { alertable } = await import("@/lib/alerts/select");
    const since = new Date(Date.now() - 2 * HOUR_MS);

    expect(await listLeads(owned.project.id, { status: "new", days: 30 })).toHaveLength(2);
    expect(alertable(await newLeadsSince(owned.project.id, since), since)).toHaveLength(2);
  });

  it("shows only leads that mention a required word, matched as whole words", async () => {
    const owned = await fixture({ mustMention: ["FreshBooks"] });
    const { wanted } = await seedRepro(owned);
    await redditLead(owned, "Freshbooksy is a typo", "", 90);
    const { listLeads } = await import("@/lib/leads");

    expect((await listLeads(owned.project.id, { status: "new", days: 30 })).map((row) => row.id)).toEqual([wanted]);
  });

  it("checks a reply lead against its thread as well as its own words", async () => {
    const owned = await fixture({ skipIfMentions: ["hiring"] });
    const { db, schema, project } = owned;
    const [post] = await db()
      .insert(schema.redditPosts)
      .values({
        id: `p${randomUUID().slice(0, 8)}`,
        subreddit: "smallbusiness",
        author: "op",
        title: "Hiring thread: who needs help?",
        url: "https://www.reddit.com/r/smallbusiness/comments/h/x/",
        createdAt: new Date(Date.now() - HOUR_MS),
      })
      .returning();
    const [comment] = await db()
      .insert(schema.redditComments)
      .values({
        id: `c${randomUUID().slice(0, 8)}`,
        postId: post.id,
        author: "replier",
        body: "Need an invoice tool honestly",
        permalink: "/r/smallbusiness/comments/h/x/c/",
        createdAt: new Date(Date.now() - HOUR_MS),
      })
      .returning();
    await db().insert(schema.leads).values({ projectId: project.id, postId: post.id, commentId: comment.id, score: 80 });
    const { listLeads } = await import("@/lib/leads");

    expect(await listLeads(project.id, { status: "new", days: 30 })).toEqual([]);
  });

  it("alerts at the project's own floor, and never under the feed's", async () => {
    const owned = await fixture({ alertMinScore: 71 });
    const { wanted } = await seedRepro(owned);
    const { newLeadsSince } = await import("@/lib/alerts/leads");
    const { alertable } = await import("@/lib/alerts/select");
    const { listLeads } = await import("@/lib/leads");
    const since = new Date(Date.now() - 2 * HOUR_MS);

    // Both still show; only the 72 is sent.
    expect(await listLeads(owned.project.id, { status: "new", days: 30 })).toHaveLength(2);
    expect(alertable(await newLeadsSince(owned.project.id, since), since).map((row) => row.id)).toEqual([wanted]);

    const strict = await fixture({ alertMinScore: 10 }, 71);
    const kept = await seedRepro(strict);
    expect(alertable(await newLeadsSince(strict.project.id, since), since).map((row) => row.id)).toEqual([kept.wanted]);
  });

  it("holds X asks to the same words and to the project's X floor", async () => {
    const owned = await fixture({ skipIfMentions: ["hiring"], xMinScore: 40 });
    const wanted = await xAsk(owned, "Anyone know a good invoice app for freelancers?", 60);
    await xAsk(owned, "We're hiring an invoice specialist", 60);
    await xAsk(owned, "invoice app suggestions?", 30);
    const { listXLeads, newXLeadCount, listXFaces } = await import("@/lib/x/read");
    const { newXLeadsSince } = await import("@/lib/alerts/leads");
    const { alertable } = await import("@/lib/alerts/select");
    const since = new Date(Date.now() - 2 * HOUR_MS);

    expect((await listXLeads(owned.project.id)).map((card) => card.id)).toEqual([wanted]);
    expect(await newXLeadCount(owned.project.id)).toBe(1);
    expect(await listXFaces(owned.project.id, { days: 30, status: "new" })).toHaveLength(1);
    expect(alertable(await newXLeadsSince(owned.project.id, since), since).map((row) => row.id)).toEqual([wanted]);
  });

  it("works on the scores the owner's ranking weights give, and keeps skipped leads out of their preview", async () => {
    const owned = await fixture({ skipIfMentions: ["hiring"], alertMinScore: 80 });
    const { db, schema, project } = owned;
    const { eq } = await import("drizzle-orm");
    const { wanted, unrelated } = await seedRepro(owned);
    // Both barely over the lead model's bar; the wanted one asks outright.
    await db().update(schema.leads).set({ quality: 0.55, intent: 4, engagement: 1 }).where(eq(schema.leads.id, wanted));
    await db().update(schema.leads).set({ quality: 0.55, intent: 4, engagement: 1 }).where(eq(schema.leads.id, unrelated));
    const { rerankProject, scoringPreview } = await import("@/lib/scoring/apply");
    const { newLeadsSince } = await import("@/lib/alerts/leads");
    const { alertable } = await import("@/lib/alerts/select");
    const since = new Date(Date.now() - 2 * HOUR_MS);

    await rerankProject(project.id, null);
    expect(alertable(await newLeadsSince(project.id, since), since)).toEqual([]);

    const intentFirst = { weights: { match: "low", intent: "high", fresh: "off", community: "off" } as const, communities: [] };
    await db().update(schema.projects).set({ scoring: intentFirst }).where(eq(schema.projects.id, project.id));
    await rerankProject(project.id, intentFirst);
    expect(alertable(await newLeadsSince(project.id, since), since).map((row) => row.id)).toEqual([wanted]);
    expect((await scoringPreview(project.id)).leads.map((row) => row.id)).toEqual([wanted]);
  });

  it("matches in SQL exactly as it does in TypeScript", async () => {
    const filters = { mustMention: ["open source", "C#"], skipIfMentions: ["job"] };
    const owned = await fixture(filters);
    const texts = [
      "Open-source CRM anyone?",
      "OPEN SOURCE alternatives",
      "opensource tools",
      "Best C# library",
      "Job: open source dev",
      "jobs board for open source",
      "Café open source ünïcode",
      "Open sources and C#s",
      "jobsite for sources",
    ];
    const ids = new Map<string, string>();
    for (const text of texts) {
      ids.set(await redditLead(owned, text, "", 80), text);
    }
    const { listLeads } = await import("@/lib/leads");
    const shown = (await listLeads(owned.project.id, { status: "new", days: 30 })).map((row) => ids.get(row.id));
    const expected = texts.filter((text) => passesWords(text, { ...none, ...filters }));

    expect(new Set(shown)).toEqual(new Set(expected));
    // "job" also skips "jobs", as "open source" also keeps "open sources".
    expect(expected).not.toContain("jobs board for open source");
    expect(expected).toContain("Open sources and C#s");
    expect(expected).not.toContain("opensource tools");
  });
});
