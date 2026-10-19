# Provider-free research and monitoring acceptance

2026-10-19. [Issue 26](https://github.com/as992949791/Hark/issues/26), [spec](../specs/offline-research-acceptance.md). Baseline `v0.1.39-monitoring-live` / `92dd57f`.

## Delivered

`npm run research:audit -- <owned-saved-report.json> [review.json]` audits a pre-existing saved report without environment loading, a database, providers or model calls. It validates exact retained source quotations, case-member pain/requirement evidence, product fact grounding, theme references/observed identities, retention and settled accounting. Private review files use an ignored 0700 directory and 0600 files; expired inputs are refused. The content fingerprint and fixed first-20 case IDs prevent accidentally applying labels to another result. Human judgements remain separate from deterministic checks, with no automatic or padded relevance labels. Documentation explains static-copy retention and packet-generation versus grading exit codes.

Existing real CapCut report `dc6238ea-3f7c-4e60-acc5-1d979aea30f8` (31 saved documents, product mode) passed structural source and settled-cost checks, with fingerprint `9525e4b7b2f7f5faaf3d81c940f853e262df0d26008281168dc6474125811a5f`. It contains one retained case, so the result is **insufficient_sample**, shortfall19, zero human judgements and `humanAcceptancePassed=false`. No new search, reanalysis, label, market claim or source freshness is inferred. Private packets remain under `.local/research-audits/`; raw content is not part of this archive.

Two new isolated integration scenarios run both projectless product and topic monitors through the real scheduled dispatcher, authenticated exact-job background handler, pipeline, database settlement, outbox and Nodemailer over TCP to a loopback-only SMTP inbox. Synthetic data/model responses and intercepted internal dispatch prevent external purchases. Date-only virtual time tests immediate and just-before-24h refusal, three due rounds (baseline, duplicate, changed evidence), SMTP451 failure followed by same-job recovery without additional provider attempts, one accepted message with the owned recipient/authenticated research link/no scraped quotation, repeat suppression and finite lifetime budget pause. Both persisted result views render the actual test run and honest missing-limitation state. No synthetic result is written to application or cloud data.

## Verification record

- Initial 17 audit checks:16 passed; one command fixture could not resolve the tsx loader from its temporary working directory. Corrected the fixture to use the installed absolute CLI and explicit repository tsconfig. No application startup dependency changed.
- Initial supported TypeScript/ESLint passed with one unused-import warning in the new acceptance test; the import was removed.
- Combined41 checks initially found MIME body encoding varied between base64 and quoted-printable. Corrected the test's captured-message decoding; production email formatting was unchanged. This is a test assertion correction, not a live delivery defect.
- Full supported verification passed TypeScript, ESLint without warnings,1161 tests/114 files and the production build on a newly created dedicated test database; the database was removed afterward. Independent review subsequently strengthened only the dispatch test, forwarding the actual captured Request rather than rebuilding known-good credentials. Final19 related tests passed after this correction; the final quick static checks passed. No production application code changed after the full build.
- Independent Astra Standards and Spec reviews have zero remaining actionable findings. See [review record](../reviews/offline-research-acceptance.md). Git archive/remote identity and exact-archive CI are recorded on issue26 after upload. No external paid call, production deployment, original data mutation or environment change is part of this release.

## Boundaries still pending

Live fresh-source product/topic searches, measured web increment over the same-input Reddit/X baseline, actual cross-day monitor discovery and external QQ receipt remain pending AnyAPI funding. Human20-case/16-acceptable quality and real multi-person recurring-theme interpretation are not achieved by these tests. Public paid/scheduled controls remain off and no local research was imported into cloud. Slack/Discord real receipt, deferred wallet work and presentation remain outside this release. Parent issues17/20 remain open for those applicable live/human acceptance criteria.
