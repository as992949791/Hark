-- A reply was offered its thread's title as one of its own sentences, so the
-- judge could quote the original poster's question as the replier's need.
-- Marking those verdicts as an older scorer's makes the boot-time rescore judge
-- them again, now that a reply is quoted only from its own words.
UPDATE "lead_evaluations" AS e
SET "scorer_version" = e."scorer_version" || '+reply-title'
FROM "reddit_posts" AS rp
WHERE rp."id" = e."post_id"
  AND e."comment_id" IS NOT NULL
  AND regexp_replace(lower(e."evidence_quote"), '[^a-z0-9]+', ' ', 'g')
    = regexp_replace(lower(rp."title"), '[^a-z0-9]+', ' ', 'g');
