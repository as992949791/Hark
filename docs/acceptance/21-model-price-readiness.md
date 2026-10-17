# Research model-price readiness correction

Continuation of [issue 20](https://github.com/as992949791/Hark/issues/20), from `v0.1.31-research-workspace`. This release fixes a prerequisite found before live research. It does not establish result relevance, a completed paid run or the 20-result acceptance target.

## Reproduction and correction

Read-only provider inspection on 2026-10-17 found `pricing.overrides` arrays in the public model listing, including the configured DeepSeek model. The transport previously required every pricing value of every listed model to be a string. It therefore rejected conditional pricing on either the selected model or an unrelated listed model before generation.

Two deterministic regressions failed at that exact schema boundary before the correction. The transport now selects the configured model before validating its context and prices. Conditional prices inherit missing keys from the base tariff; the reservation takes independent prompt/completion maxima across the base and every listed tier. Day, time and long-context conditions are not evaluated to obtain a cheaper price. The same maxima reach the provider price controls. Invalid rates, unsupported nonzero charges and cache rates above prompt rates remain refused before generation. Existing full-context/output reservations, funding/owner gates, retries and settlement remain unchanged.

Primary contract: [OpenRouter model pricing and conditional overrides](https://openrouter.ai/docs/guides/overview/models). The public catalog replay prepared a 324404-microdollar upper bound for the configured model with 8192 output tokens. This is a conservative reservation, not an actual charge or cost estimate for a short prompt.

## Verification

- Passed 19 mocked-network transport tests. Added failing-before cases for selected/unrelated conditional pricing, plus highest-price forwarding, base-price inheritance and malformed/unsupported conditional rates. The ignored public-catalog replay also passed, with zero paid POSTs and no application writes.
- Supported full verification at `56ba92e` passed TypeScript, ESLint, 1081 tests / 110 files, fresh test migrations and production build. The disposable test database was removed. No paid key was supplied to database tests.
- Original selected product/source/settings/channel/mute/theme and project-usage scopes remain equal. Supported zero-paid local preview passed health/home 200 and signed-out research 307. Independent Standards and Spec reviews returned zero material findings; [review record](../reviews/model-price-readiness.md). The frontend is unchanged; its earlier finish verdict is not repeated as a new visual review. Archive identity and exact-commit CI are recorded on issue 20 after upload.

## Live prerequisites still pending

AnyAPI's read-only balance returned $0.013960. The configured OpenRouter credential returned HTTP 401 from its [official current-key endpoint](https://openrouter.ai/docs/api/api-reference/api-keys/get-current-api-key). A local key update was requested without asking for the key in chat. No completion request was sent, no run was created, and no credit purchase or refill occurred.

The previous cumulative provider reconciliation remains $0.286331398 against the user's original $1 CapCut test authorization. OpenRouter usage could not be refreshed with the failing credential, so that historical number is not presented as current spending or a freshly verified remaining budget. Before paid execution, reconcile the usable key and balances, establish bounded admitted calls, and remain within the existing authorization; do not silently add budget. Both entry modes, live price-cap behavior, actual costs, incremental relevant web signals versus the same-input native baseline and the user's 20-result judgement remain pending. Issues 17/20 stay open.

Local demand/live/background/scheduled controls and invitations remain off, with all four paid caps zero. No provider generation, data purchase, external notification, wallet action or public deployment was performed.
