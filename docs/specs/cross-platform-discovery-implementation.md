# Manual cross-platform demand discovery — implementation plan

Status: engineering plan for issue 17, after frontend 16. Product scope remains [the confirmed scope](cross-platform-discovery.md). This document describes intended changes, not shipped capabilities, prices or completed acceptance. Development/offline tests can proceed without paid calls; a new live test needs concrete approved limits.

## Tickets and dependencies

- [Foundation 18](https://github.com/as992949791/Hark/issues/18): run/evidence ownership, storage, exact jobs and cost admission. Depends on frontend 16.
- [Collection/analysis 19](https://github.com/as992949791/Hark/issues/19): native/web adapters, evidence validation and grouping. Depends on 18.
- [UI/integration 20](https://github.com/as992949791/Hark/issues/20): Chinese entry and two views, persisted-run acceptance. Depends on 18 and 19.

These are children of [feature 17](https://github.com/as992949791/Hark/issues/17) in the work plan. GitHub native blocking dependencies record the implementation order. Offline work is ready after each dependency; live relevance acceptance is a separate budgeted gate. [ADR-0004](../adr/0004-demand-run-ownership.md) records the ownership decision.

## Outcome and small releases

1. Foundation: owner-scoped runs, immutable evidence contracts, storage and admission/cost tests. Verify topic/new-product modes work without an existing product and cannot read another owner's run.
2. Collection and analysis: reuse native Reddit/X seams and add separately stored public-web documents through existing AnyAPI search/scrape. Verify quotes, attribution, deduplication, budget stop, partial failure and retry with transport fixtures.
3. Real UI and integration: Chinese product/topic input, demand-signal and pain-theme views, source/cost disclosure, progress and explicit retry. Run bounded live CapCut acceptance only after provider ceilings and a specific budget are ready, followed by the user's 20-result review.

Each release has focused tests, independent Standards/Spec review, frontend finish review where relevant, a Git commit/annotated tag/push/remote verification, and exact-commit CI. Presentation, wallet, automatic outreach and recurring discovery stay outside this work.

## Decisions grounded in the current code

- `src/lib/seo/fetch.ts` appends reddit through googleQuery and storeSerp drops every non-Reddit result. Keep it unchanged. Add a demand-discovery module under `src/lib/demand/`; do not overload the existing retrieval-plan `src/lib/discovery/` module.
- The installed AnyAPI SDK and existing code expose `google.search({query,gl,hl,limit,...})` and `web.scrape({url,formats:["markdown"]})`. Search result title/snippet/URL and scraped title/description/markdown/URL are available. The generic scrape shape does not guarantee author or publication-date metadata. Never infer those from the search position or retrieval time.
- `usage_ledger.project_id` is currently required; `llm_usage.project_id` and `jobs.project_id` are nullable. Existing null-project enqueueJob coalesces work by kind, and public dispatch rejects null-project jobs. Topic research cannot simply pass null into those APIs and inherit correct ownership, dispatch or billing.
- Existing daily caps check spend before a call, rather than reserving the call's upper bound. They remain admission controls, not a claimed exact per-run cap. New discovery must add bounded-attempt reservation and reconcile actual charges before another attempt.
- The ordinary create/profile action dispatches discovery_initial and kicks the scheduler; its worker can start backfill. Research must not call that action or buildProfile/readSite orchestrators whose fan-out is outside the run. Preserve ordinary creation elsewhere.

## Ownership, entry modes and storage

A Demand run belongs directly to a signed-in owner. Product mode accepts a product URL. If it matches that owner's prepared project, snapshot its current profile/brief version with no automatic refresh. A new URL creates only the owned research run, with an optional null product-project reference; prepare its product facts within that run's admitted budget. Topic mode has no product/project and never claims product fit. Do not create a fake product or read another owner's profile.

New-URL preparation is at most one product-page scrape plus one structured profile attempt, both reserved, charged and recorded against the same run before demand retrieval. Reuse bounded schema/analysis primitives, not the create action or the readSite/buildProfile orchestration, competitor-page fan-out, discovery_initial, scheduler or backfill. Any helper/SDK retry must consume an explicit admitted attempt; the one-attempt default does not permit a hidden second generation. Store preparation text with product-profile purpose, excluded from demand evidence/counts; retain its provenance and profile snapshot. If preparation fails or facts cannot support fit, show that state and stop product-mode retrieval until an explicit bounded retry. Ordinary project creation elsewhere remains unchanged.

Proposed additive storage:

| Record | Minimum responsibility |
| --- | --- |
| `demand_runs` | owner, mode, product URL or topic, optional owned product-project reference, profile snapshot/version when applicable, status/progress, explicit limits, budget totals, job association, validated theme result, created/finished/expiry times |
| `demand_documents` | run, purpose (product preparation or demand evidence), source kind, discovery query, requested/canonical source URL, search snippet separately, exact retrieved text and content hash, retrieval time, independently supported author/publication metadata or null, retrieval outcome |
| `demand_signals` | run/document, exact quote offsets, original quote, Chinese need/match explanation, native author identity or unknown, request type, relevance and product-fit result only in product mode |
| `demand_attempts` | run/sequence, operation, reserved upper bound, actual charge, request/ledger reference, reserved/settled/uncertain outcome |

Owner checks apply to every list/detail/status/retry read and action. A product reference must be owned by the same user. No cross-user evidence/history view or shared query cache in v1. Topic runs cannot reuse or expose an arbitrary product's saved results. Store source content only within the existing 30-day public-data retention horizon; expiry removes dependent signals/themes together. On expiry, remove documents/signals/themes and redact input/profile snapshots; retain only the minimal run ownership/billing record needed to reference durable charges.

Add an optional run association to existing data/model ledgers. Permit a data-ledger row without project_id only when it has a valid demand-run reference; add a database constraint and tests. Keep house-spend aggregation counting these rows once. Project usage continues to show only its attributed rows; each run exposes its own complete costs. Deleting/expiring evidence must not delete historic charges from the daily cap. The foundation migration keeps a minimal run billing record on evidence expiry, with ledger references preserved; test that policy explicitly.

Link each run to an exact job. Insert that job directly with a unique run association rather than calling the coalescing null-project enqueue helper. Extend the current personal-test dispatcher/admission owner resolver only for this explicit new job kind; ordinary project jobs and scheduled allowlists remain unchanged. Worker resolves the run's owner before any provider access. The handler has no recurring successor and page reads never start it.

## Retrieval and evidence pipeline

Keep the first run bounded and sequential: validate input, form a small English query plan, collect source documents, extract supported requests, deduplicate, group and persist. Proposed offline defaults are two web queries (ten results each), one query for each enabled native source, at most eight new web-page reads, eight native detail reads combined, three extraction batches and one grouping call. New-product mode additionally allows at most the one preparation page and one profile attempt described above, inside the same total budget. These are request-count proposals, not cost quotes or authority to run live. More pages require an explicit later run.

Reuse existing Reddit/X query/result reading, source identifiers, funding and budget controls through narrow adapters. Product mode can include an explicit saved-baseline lane labelled with its real original collection timestamps; this is not a fresh scan. Fresh native requests must be separately counted against the run. Topic mode searches the topic directly, without borrowing unrelated product-profile queries or applying product-fit labels. Respect X's existing enablement gate.

The web adapter calls google.search directly without googleQuery's reddit suffix, requests US/English results, then retains source URLs independently. Prefer forums/questions/reviews and filter marketing during analysis; discovery rank itself proves no need. Apply server-side public-URL admission: http(s) only, no credentials/private/loopback/link-local destinations; canonical URL/redirect handling cannot silently bypass this. Do not directly fetch arbitrary URLs from the application server. Original native URLs remain native source documents; repeated search hits do not become multiple people.

Read supported pages with the existing paid web.scrape transport. Separate discovery snippets from page text. A missing/unreadable/blocked page remains a failed or snippet-only discovery result and cannot support a full-text demand claim. V1 uses generic web metadata only where returned and supported; native/structured metadata can be richer. An unknown author is shown as unknown and cannot establish a second independent person. Do not invent metadata to populate theme counts.

Model prompts treat all retrieved text as untrusted evidence, not instructions. Request structured Chinese explanations and original-language quote spans. On the server, verify every span is inside the exact stored text and its quote matches; reject unsupported claims rather than patching quotes into existence. Enforce valid run/document IDs. Product qualification additionally requires its current fit criteria; a complaint alone is not a lead. Topic fit is not applicable.

Deduplicate canonical native IDs/URLs and normalized content hashes before counting. Same known author and repeated/syndicated passages count once. Keep potentially duplicated/unknown people conservative rather than treating page count as people count. Every theme cites supporting signal IDs, every substantive workaround/limitation has support, and recurring themes need at least two distinct supported authors; otherwise keep an individual case. The display calls the count observed distinct authors, not verified market population.

## Budget, failure and retry

Feature and live admission default off. Keep current zero-paid configuration while implementing. A planned per-run budget does not bypass operator daily/X caps, rate controls, owner limits or funding rules.

Reserve a verifiable worst-case charge before each data/model attempt under a run-row lock. AnyAPI request ceilings need endpoint-level enforcement; the installed typed Google/scrape inputs do not themselves expose max_cost_usd, while the current X transport adds it at the gateway seam. Verify supported Google/scrape ceiling behavior before enabling paid operations; refuse an operation whose upper bound cannot be established. No speed preference may silently raise an admitted price.

A bounded model attempt needs a known price/routing bound, input/output limits and internal SDK retries disabled or charged individually. Reuse the configured analysis model and existing model usage recording where compatible; do not select a new model or silently fall back to an unpriced route. Extend only the needed call options/usage association. No unknown-cost call is admitted.

Settle actual costs and preserve provider request IDs even when the result has no usable evidence. A timeout/crash with uncertain billing keeps its reservation and stops automatic repeat purchase until reconciled. Retry is explicit, operates only on failed/incomplete work, reuses successful documents and never silently refreshes the whole search. One run lease and atomic reservations prevent double clicks, overlapping workers and expired-worker writes from overspending or publishing conflicting results. Partial results remain visible with source-specific failures; never label partial as complete.

## UI and verification

Add a real `/app/research` entry with product/topic mode and explicit manual search. Keep the established workspace system. Chinese demand signals and pain themes are views over the same owned run. Show product preparation progress/failure and include its charges in run limits/spend. A card shows original quote/source, available author/date, collection time, Chinese explanation, product fit where applicable and retrieval status. The run shows limits, actual spend, freshness and per-source counts. Clicking a citation opens its original source; there is no auto reply/post action. Fixtures stay in tests/CLI and never populate the authenticated application as live results.

Foundation tests: owner isolation including topic/new-product-without-project; foreign project/run IDs; migration constraints; durable charge retention; exact job/run dispatch; no schedule on page read; concurrent admission and zero-budget refusal before transports.

Pipeline tests: new-product preparation stays inside run limits, no create/scheduler/backfill dispatch, no hidden profile retry or preparation page counted as a demand signal; source distinction, full-text versus snippet-only, hostile prompt text, fabricated quote/date/author rejection, duplicate URLs/text/people, unknown-person handling, one-author case versus recurring theme, irrelevant marketing, partial fetch/model failure, bounded retry, no duplicate charge/publication after crash and native baseline freshness disclosure.

End-to-end offline acceptance: both entry modes, progress/loading/empty/error/partial/retry, project context, keyboard/mobile and refresh persistence. Existing Reddit/X suites and full CI remain green. Live acceptance later records actual requests, charges, incremental relevant web signals against the same-input native baseline, and each of the user's 20 judgements. Target 16/20 is unachieved until reviewed; do not pad fewer than twenty or call offline fixtures real demand.
