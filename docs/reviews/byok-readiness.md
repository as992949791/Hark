# BYOK research billing review

Fixed baseline: `v0.1.32-model-pricing` (`a2ad6e460047b905a1d0f764cc0d26d71657e3c8`). Source reviewed: `60a24ae`, [issue 20](https://github.com/as992949791/Hark/issues/20), [budget specification](../specs/cross-platform-discovery-implementation.md), [acceptance](../acceptance/22-byok-readiness.md).

The independent reviewers inspected the exact source diff without edits, tests, provider calls or browser actions. Parent verification and the bounded connection probe are recorded separately. Legacy SDK accounting, provider routing and structured-output compatibility remain outside this correction; no full live-discovery acceptance is inferred.

## Standards

Zero actionable findings. The change is confined to research transport billing and mocked-network regressions, consistent with AGENTS.md and the user's simplicity and surgical-change rules. Upstream and platform charges are combined before rounding. Unconfirmed funding receipts fail conservatively, preserving research costs. Tests verify observable accounting behavior, including charged failures without retries. No actionable Fowler smell was identified; another abstraction at the single receipt-parsing site would add unnecessary complexity.

## Spec

Zero findings. The worst-case full-context/output reservation includes a possible 5% BYOK platform fee. Explicit BYOK responses settle platform plus upstream cost and round once; ordinary shared inference is not double counted. Known charges survive unusable responses. Missing, malformed or ambiguous receipts enter existing uncertain settlement, preserving reservations and preventing automatic repurchase. No missing scoped requirements or scope creep were identified.

Standards: 0 findings. Spec: 0 findings. Archive/remote identity and exact-commit CI follow on issue 20 after upload.
