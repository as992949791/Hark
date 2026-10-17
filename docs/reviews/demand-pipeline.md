# Demand pipeline review

Fixed baseline: `v0.1.29-demand-foundation` (`1c4d21e89f0e754cd827688e9d5ca60a6f81a78f`). [Issue 19](https://github.com/as992949791/Hark/issues/19), [implementation plan](../specs/cross-platform-discovery-implementation.md), [acceptance and boundaries](../acceptance/19-demand-pipeline.md).

Implementation `ee2acce`, corrections `5cd3567` and `a5deebe`. Independent reviewers read source only; the parent ran verification. Live provider quality and the research UI are outside this backend acceptance.

## Standards

Initial review found zero documented-standard breaches or heuristic smells, with three P2 correctness findings: retries could read past the run's original page selection; shared rate queues could outlive the lease before starting a paid POST; normalized text hashing conflated case-sensitive URL paths. Distinct admitted read names now persist across retries, required authorization runs inside the final fetch boundary after pacing, and URL receipt identities use byte-preserving SHA-256. The reviewer confirmed each correction at `5cd3567`. Final narrow review through `a5deebe` found zero remaining material Standards/correctness findings or smells.

## Spec

Initial review identified two P1 native-contract mismatches: Reddit details need the original full subreddit permalink and use `body`; X details may omit a returned URL. It also independently identified the read-selection and URL-hash P2s. Corrections preserve the original Reddit request permalink, reject unsupported short forms without buying a detail request, normalize per-SKU fields, and validate native identity. X opaque author IDs remain supported metadata; their population is not added to incomparable handle populations when deciding recurrence.

Focused review found two additional P2 boundaries: an explicit response URL could bypass comparison with the admitted native request ID; truncating emoji could create malformed UTF-16 rejected by PostgreSQL JSONB. Both request and response now must identify the same native post. Source truncation preserves surrogate pairs; malformed normalized strings become known-billed failures before settlement. The reviewer confirmed these resolved at `a5deebe` with no material narrow-delta findings. No scope creep finding remains.

## Regression evidence

The first correction batch had six failing regressions before fixes; all passed afterward. A further three failing regressions covered request-ID mismatch, code-point truncation and invalid-surrogate known-bill settlement. Parent inspection additionally reproduced NUL output and malformed optional model token/receipt metadata losing known-charge persistence; corrected output/metadata handling preserves the actual bill. A persisted-state crash test also verifies extraction receipts can be published without buying extraction or source data again. All 46 final targeted tests passed, alongside supported quick TypeScript/ESLint. Final full fresh-database verification and local runtime preservation checks are recorded in acceptance.
