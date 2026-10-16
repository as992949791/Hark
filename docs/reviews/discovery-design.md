# Cross-platform preparation review

Fixed baseline: v0.1.27-frontend-completion, peeled commit `8c587e319558374b1c53554eefc2e1cf0e79cefe`. Planning commits are `5194d5e759bde42cb0747b67ff7aa819a0951055` plus correction `4cac36cd63ceb847dbd07b27bac05e6aebed4d17`. This reviews the [engineering plan](../specs/cross-platform-discovery-implementation.md), not a shipped pipeline. Approved scope is [the product spec](../specs/cross-platform-discovery.md) and issue 17.

## Standards

Independent review found zero documented-standard breaches and zero actionable heuristic smells in both the original plan and correction. Selective current-code checks confirmed Reddit-only SERP storage, required data-ledger project IDs versus nullable model/job references, null-project job coalescing/dispatch restrictions, spend aggregation, the retention constant and installed Google/scrape input/metadata limitations. Planned run/evidence/attempt storage addresses these concrete constraints without a new framework or unrelated refactor.

## Spec

Initial review found one P2: routing a new product URL through ordinary product creation could enqueue discovery_initial/scheduler/backfill outside run limits. The correction gives new URLs only an owned research run and bounded profile preparation, charged inside the same budget: one page and one structured profile attempt. No ordinary creation/orchestration, hidden retry or monitoring dispatch. Preparation cannot count as demand evidence, and failed/insufficient preparation stops product retrieval until explicit bounded retry. Existing project creation elsewhere stays intact. The same reviewer confirmed the P2 resolved and zero remaining material findings in the final delta and ticket drafts.

Product/topic entry, Chinese views, original-source evidence, conservative author counts, explicit retry, default-off bounded calls and unachieved live targets remain consistent with the approved scope. No QA-chat, wallet, outreach, recurring discovery or presentation work was added.

## Validation boundary

Parent whitespace/local-link checks passed. GitHub tickets 18/19/20 carry the same preparation contract and native blocking dependencies; frontend 16 was closed only after v27 remote archive verification and exact-commit Check 38962053427 passed 972 tests/103 files, TypeScript, ESLint and production build.

The independent reviewers performed source/document comparison only; they did not run providers, application tests or independently inspect remote archive/CI. This planning version changes no runtime code/schema/configuration. Local app tests/build/browser acceptance are not repeated for prose-only edits; its own remote archive and exact-commit CI are recorded on issue 17 after upload. No current provider price ceiling, live result quality, market-size estimate or achieved 16/20 relevance rate is asserted.
