# Demand foundation review

Fixed baseline: `v0.1.28-discovery-design` (`c9e2755a2fd32e8e8fffdd5bbbef346b7e32154c`). Implementation `bc041844be2953181d24a3dfbaefdc44b204e94d`, correction `515d4f53b0c318fc43cb65240e5c2152eaaf5196`. [Issue 18](https://github.com/as992949791/Hark/issues/18), [plan](../specs/cross-platform-discovery-implementation.md), [acceptance](../acceptance/17-demand-foundation.md).

## Standards

Independent review found no documented-standard breaches or actionable heuristic smells. It identified one material P2 correctness issue: a reservation held the transaction/global lock but requested a second pooled connection for house/X spend. At pool saturation, admission could stall. The correction passes the same typed transaction reader to existing spend functions, preserving defaults for legacy callers. The deterministic saturated one-connection subprocess regression failed at its five-second kill deadline before correction, then settled house/X data/model operations successfully. Final delta review found zero remaining material findings, documented breaches or actionable smells.

## Spec

Independent review identified the same spend-pool P2 and two further P2 issues. Retry could bypass the three-active-run owner limit; it now shares the atomic capacity check with creation. A reclaimed job could finish while the independent run lease was still held, leaving a stranded running run; the specific lease-busy error now releases the same unfinished job for later recovery, without a successor or purchase. Each behavior regression failed before correction. The same reviewer confirmed all three findings resolved at `515d4f5`, with no remaining material delta findings or scope creep.

## Verification boundaries

Parent supported full verification after correction passed TypeScript, ESLint, 1002 tests/105 files and production build on a fresh disposable local test database. The initial generated migration's composite FK/index order was corrected before fresh migration verification. Related tests include legacy worker/scheduled/recovery/spend behavior and the new owner/accounting/retention constraints. Independent reviewers performed source reviews only and did not rerun tests or call providers.

This is backend foundation delivery, with no UI changes or visual finish review. New feature/live gates default off. Source adapters, live endpoint/model ceilings, bounded product preparation, extraction, grounded publication and real research UI remain on issues 19/20. The foundation handler truthfully records blocked/source-pipeline-not-installed. No paid provider request, notification, schedule enablement, wallet or public deployment. Parent supported local migration/preview readiness and selected-data preservation checks passed as recorded in acceptance. Archive identity and exact-commit CI follow on issue 18 after execution; a 202 or finished queue row is not completed research.
