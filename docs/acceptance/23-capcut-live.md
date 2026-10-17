# CapCut live cross-platform research

Continuation of [issue 20](https://github.com/as992949791/Hark/issues/20), based on `v0.1.33-byok-billing`. On 2026-10-17 the actual owned CapCut project ran through the registered research job and real AnyAPI/OpenRouter transports. This establishes a working product-mode chain with grounded candidate results, not the separate human relevance target.

## Result

- Run `154a61b6-c733-432a-887e-8f365e505548`: 31 saved source documents, **13 demand candidates** (Reddit 8, X 2, public web 3), and **5 pain themes**. Every published quote equals its stored source's exact UTF-16 slice. All 30 attempts are settled; reserved cost is zero.
- The final status is **partial** because two public pages failed `web.scrape`. No extraction or grouping failure remains. Search, successful page reads and successful analysis were reused during explicit retries; the two inaccessible pages are not presented as empty successful results.
- Themes concern CapCut alternatives, watermarks/paywalls, time spent adding captions/editing, and free watermark-free recommendations. These are generated themes requiring human judgement. The three web candidates do not yet prove independent-person evidence or useful incremental demand, and none of the 13 candidates is a verified buyer.
- Results are readable at `/app/research?run=154a61b6-c733-432a-887e-8f365e505548` in the existing local preview. This was an operator-driven live worker execution; no new browser interaction/progress acceptance is claimed.

## Corrections from observed failures

The configured `deepseek/deepseek-v4.1-flash` official endpoint supports JSON-object output rather than the requested strict structured-output parameter. For this exact model, the transport sends the schema as trusted format instructions, selects the DeepSeek provider without fallbacks, disables reasoning and uses temperature zero. Other models retain their existing strict-schema path. All returned JSON still passes server-side schema validation and known charges survive invalid output. Contracts: [DeepSeek JSON mode](https://api-docs.deepseek.com/guides/json_mode/) and [OpenRouter structured outputs](https://openrouter.ai/docs/guides/features/structured-outputs).

The existing CapCut profile has a solution but no saved pain field. An owned solution now permits snapshot reuse; unknown pain/target-user facts remain null. New-page preparation still requires exact source support for every supplied fact. An earlier preparation run (`776a1a05-2f1e-4635-9a37-3dd296ee8278`) correctly rejected unsupported/translated model facts and remains blocked with its real charges retained. The original project profile was not rewritten.

A failed scrape omitted its cost. The authoritative AnyAPI request GET identified the matching request/SKU as `failed` with `settlementState: not_required`. The transport may settle only that exact receipt as zero; unknown, pending or mismatched receipts remain uncertain. One previously uncertain attempt was reconciled from that receipt before retrying; it was not silently waived.

The model supplied incorrect quote offsets and mixed grounded with unsupported candidates. New extraction requests literal quotes without numeric offsets. The server resolves only unique exact quotes, accepts verified legacy offsets, and excludes invalid evidence/fit claims individually while preserving valid peers. Missing/ambiguous quotes remain rejected. Required labels and enum choices are explicit in the extraction instructions; there is no automatic model retry.

## Cost and execution bounds

The initial operator run limit of $0.35 could not admit the unchanged conservative full-context reservation after source spending. With no reservation outstanding, the same owned partial run's limit was explicitly raised to $0.40 under the existing cumulative $1 user authorization. This was a scoped operator database adjustment, not a newly implemented budget-editing UI. Paid gates/caps were enabled only in the bounded worker process; the existing preview retains zero-paid, demand/live/background/scheduled/invitation-off overrides.

Final read-only reconciliation at 13:49:08 UTC: AnyAPI balance **$0.002610**, down **$0.011350** from the last baseline; current OpenRouter key upstream usage **$0.017814270**, platform usage **$0**. Adding the previously reconciled historical **$0.286331398** gives **$0.315495668 cumulative**, including failed preparations, failed analyses, explicit retries and the prior connection probe. The old key's history was not freshly audited. The main run's ledger is 27,140 microdollars; the earlier preparation ledger is 2,028 microdollars. Ledger rounding occurs per attempt, so the provider totals retain finer precision. No refill or further paid retry was made after the final result.

## Verification and remaining acceptance

- Regressions reproduced JSON compatibility/schema failures, optional product facts/snapshot reuse, authoritative unpaid receipts and exact quote grounding before correction. The four relevant suites passed 103 tests; after the final format-instruction/temperature edit, all 78 affected transport/pipeline/evidence tests passed. Supported quick TypeScript/ESLint verification passed, and the final targeted ESLint check was clean.
- Independent Standards and Spec source reviews of `v0.1.33-byok-billing...89518d7` returned zero material findings. Full local tests/build were not repeated: one complete exact-archive CI run supplies those checks, with its outcome and remote identities recorded on issue 20. The UI is unchanged, so no repeated visual audit or separate documentation-review round was added.
- Human relevance judgement, the 20-result/16-relevant target, topic-mode live execution, successful projectless new-URL preparation and populated browser progress acceptance remain open. No notification, wallet action or public deployment was performed. Legacy SDK BYOK accounting remains outside this correction. Raw response/post artifacts are private and ignored; only this aggregate report is committed.
