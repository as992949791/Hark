# Daily monitoring source review

Baseline: `v0.1.37-public-research` (`a47f1ce9efc15cc60faa1663997e74f4642ed91e`). Canonical requirement: [issue 24](https://github.com/as992949791/Hark/issues/24), [spec](../specs/demand-monitoring.md).

Two independent Astra reviewers used `git diff v0.1.37-public-research...c42f9e7`, then rechecked the correction `c42f9e7..d3f5125`. Reviewers read source without modifying files or invoking providers. The user has already delegated implementation and authorized this review workflow, so the existing archived baseline was selected without an additional approval round.

## Standards

Zero material Standards findings in the initial source or correction. Owner-scoped transactions and shared budget locking are preserved; final admission, reporting and retry use the same commitment calculation. The changes remain scoped to monitors, grounded analysis and their UI/tests. No material baseline maintainability smell was reported. Review checked AGENTS.md, domain/tracker/tool instructions, GLOSSARY.md, DESIGN.md and ADRs 0001–0004. No CONTRIBUTING.md or CODING_STANDARDS.md exists.

The review requested the required development-log entry before archive. That bookkeeping is included in the final archive, with exact completed and unperformed checks.

## Spec

Initial review identified two defects:

1. **P1, corrected:** a previously partial monitor run could be retried after its unused ceiling was released and another run admitted, exceeding lifetime commitments. `retryDemandRun` now re-reserves its full ceiling under the existing shared budget transaction, rejects another active same-monitor run or an unfinished notification, and resets the processing marker only within the successful requeue transaction. New tests reproduced competing-run and lifetime exhaustion failures before correction, then verified valid re-admission.
2. **P2, corrected:** changing the original project's URL could make its saved monitor project/URL pair invalid, aborting the whole tick. Monitoring now treats the saved URL as authoritative and lets ordinary owned-profile lookup select only a currently matching project. A regression verifies that the former URL remains intact and a second due monitor is admitted normally.

The focused source recheck confirmed both fixes and zero material new issues through `d3f5125`. No material unrequested scope was found. Live paid/public acceptance remains explicitly outside this development verification.

Final count: Standards 0 material findings; Spec 0 remaining findings (initial P1/P2 both resolved).

## Interface finish

The existing paper/navy/blue research workspace is preserved. Authenticated local browser acceptance saved a paused CapCut condition and checked refresh, disabled deployment state, legacy evidence disclosure, keyboard focus and 1440/390px layout without horizontal overflow. Populated structured analysis is checked with synthetic render tests; no synthetic result was inserted in the real application. One detector pass returned `[]` across the five modified UI files. No new raster assets. Skill version/sidecar drift is a nonblocking tooling observation; no update or unrelated design regeneration was performed.
