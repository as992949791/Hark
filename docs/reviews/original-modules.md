# Original-module acceptance review

Fixed point: `v0.1.9-create-chain`. Final implementation: `562754e80cf9177bbc8644395058923b0c256812`, following initial patch `35a9230d35a3d98c5abc5d7303a348303508e172`. Spec: [issue 8](https://github.com/as992949791/Hark/issues/8); evidence: [module acceptance](../acceptance/03-original-modules.md).

Two independent Astra agents used the Matt Pocock code-review workflow. Reviews were read-only source/evidence inspections; reviewers did not independently rerun the tests or browser. Later review-record documentation does not change the reviewed application source.

## Standards

No documented-standard violations and no actionable judgment-call smells. The ten-file diff was checked against AGENTS.md, development tools, tracker guidance, ADR-0001 and the glossary. Funding disclosure/disconnection, self-hosted controls and notification-tab wrapping remain surgical. Eight observable wallet regression cases and one automatic-JSX test configuration option add no dependency or speculative abstraction. Evidence distinguishes render coverage from live OAuth and final full verification from earlier checks.

## Spec

The initial review found one P2: self-hosted mode can still have a stored wallet token, which takes precedence for data funding. Hiding its connection/disconnect control while claiming own-key funding concealed the real payer. The correction preserves wallet disclosure and General-tab disconnection whenever connected. Three tests reproduced the initial failure; all eight wallet cases and the final 936-test suite passed after correction.

The final review found no remaining actionable Spec findings. Research jobs, read-only API/MCP, spending limits, notification restrictions and scheduler state match issue 8. Unconfigured sender/chat/wallet OAuth and paid X verification remain explicit limits. Archive and final CI follow the reviewed implementation and are verified separately.

Final outcome: Standards 0 findings; Spec 0 remaining findings, with the initial P2 resolved.
