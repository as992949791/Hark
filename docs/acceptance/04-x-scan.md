# Bounded real X scan — 2026-10-08

Scope: the user requested real X scanning next. Tracked in [issue 9](https://github.com/as992949791/Hark/issues/9), within the existing cumulative $1 data/model authorization. This is a two-search development pilot, not a full production sweep or scheduled monitoring.

## Preflight and dispatch

- Fresh reads confirmed AnyAPI balance $0.035720, OpenRouter cumulative key usage $0.105496620, no connected user wallet, no existing X project/run/lead rows, and only two unstarted Reddit research successors. House spending since the current UTC midnight was zero.
- The live AnyAPI SDK `describe` metadata reported entry request prices of $0.000600 for twitter.search and $0.000220 for tweet/profile. Search failover could reach $0.015400. The existing application price ceilings remained intact: $0.001000 search and $0.000500 tweet/profile. No expensive failover, top-up or external X account login was enabled.
- Set `X_LEADS=true` in ignored .env.local, preserving credentials, reply configuration, model choices and persisted budgets. The production preview inherited zero paid-call caps; scheduler/seeding stayed off. The existing signed-in CapCut X page mounted its original action, created the X state and queued one x_scan. It displayed progress without requiring another login.
- A private operator worker conditionally claimed only that queued CapCut job and called the original runner. It asserted development smallSweep, scheduler/seeding off, no user wallet, X API concurrency one, global/X daily data caps $0.02 and model caps $0.05. It allowed only the three twitter endpoints, checked their original price ceilings, limited paid data attempts to 20 and model POST attempts to 40, and bounded chat-completion output at 6,144 tokens. Jev's decision route retained its original adapter. Other jobs were not claimed.

## Actual result

The job and its run completed without error or partial reason in about 38 seconds:

| Recorded metric | Result |
| --- | --- |
| Lanes / search pages | 2 / 2 |
| Posts fetched / newly stored | 43 / 43 |
| Free-screen exclusions | 22: 16 no visible term, 3 listicles, 2 long articles, 1 bare link |
| Initial post judgements | 10 |
| Parent lookups / profiles | 7 / 4 |
| Complete judgements / reply checks | 3 / 1 |
| Leads / review decisions / rejected judgements | 2 / 1 / 7 |
| Pending initial judgements | 11 |
| Paid data requests / model POSTs | 13 / 36 |
| Run ledger data / model cost | $0.003620 / $0.007460 |

SmallSweep limits primary initial judgements to ten; it does not prohibit the original supplementary scoring of excluded posts. Model records comprise one seed generation, ten x_score calls, three x_final calls, one x_reply call and 21 x_rescore calls. Jev remained the decision model; existing Qwen configuration handled seeds/reply checks, while the DeepSeek product-profile configuration was unchanged. No product analysis was rebuilt.

The database has 22 free_rejected, seven rejected, one review, two lead and eleven pending_llm evaluations. The UI's MAYBE count of four combines one review with three near-threshold rejected candidates; LEFT OUT shows the other 26 exclusions. These counts are consistent with 43 stored candidates. The eleven pending candidates make this explicitly non-exhaustive despite the completed run status. There were no positive reply-kind leads, so a successful real reply-kind write remains unverified.

## Browser and separation checks

- The signed-in X tab showed two New leads and stored author/context details. Their source URLs point to the stored X post IDs; one post clearly asks for Adobe Premiere Pro alternatives, and the other discusses simplifying an existing content workflow. These are model-selected candidates, not confirmed sales-qualified customers.
- Selected the second lead, verified its detail/source URL and displayed timestamp, switched to Replied (empty list) and back to New, opened a held candidate, and used mobile Back to leads. The original selector retains an explicit status=new parameter; an operator assertion was corrected to match this behavior rather than requiring parameter removal.
- Desktop result width matched 1710 pixels; mobile list/detail/held views stayed within 390 pixels. Final rebuilt pages show Hark wording and two leads without an app error. Physical-device and exhaustive accessibility checks were not run.
- CapCut's 24 original Reddit IDs/statuses/reasons and profile/brief versions remain unchanged. X has one project and two leads in its separate tables; no other product received an X run. No reply, direct message, notification or webhook was sent.

Residual visible X explanations still named Lurk. Corrected only those strings in five presentation files and updated four existing exact-text assertions. Comments, internal names, assets, upstream attribution, search templates, model prompts and business rules were retained. The initial scoped test run had four failures due to the old displayed-name assertions; after updating their expected wording, all 194 tests in 14 X/price-cap files passed. An initial read-only preflight probe omitted llmSpend's required options; it was corrected before the paid worker ran.

## Cost and final state

Provider reconciliation after the run: AnyAPI balance $0.032100, cumulative data spend $0.117900 from the observed $0.15 initial balance, OpenRouter cumulative key usage $0.112951669. Total observed trial spend is **$0.230851669**, within $1. This run added $0.011075049 by provider readings, approximately the ledger's $0.011080; rounding and later billing settlement can differ.

Passed: TypeScript, ESLint, 194 scoped tests against the dedicated test database, fresh production preview build, browser result/filter/detail/responsive checks, Reddit preservation assertions and Git whitespace checks. Full local tests were not repeated for presentation-string changes; GitHub Check is inspected after archive. Two independent review outcomes are recorded separately.

X remains visible locally. The final preview still inherits zero paid-call caps, and scheduler/seeding remain disabled. The original X handler queued an unstarted hourly successor alongside the two existing Reddit research successors; its displayed next-check time does not mean this disabled local scheduler will execute it. The configured persistent budgets were not raised. The next paid scan requires an explicitly controlled worker under the remaining cumulative budget; notification integration, production deployment, full-scale sampling and recurring scheduling remain separate work.

Raw signed-in captures, worker, provider readings and database snapshots stay in ignored .local/acceptance/.
