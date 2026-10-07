# Remaining original modules — 2026-10-08

Scope: verify the existing fork's research, integration and settings modules after real browser creation, within the user's cumulative $1 authorization. Tracked in [issue 8](https://github.com/as992949791/Hark/issues/8). Preserve the original design and MIT attribution; add no new product features.

## Live checks

| Module | Result and limits |
| --- | --- |
| Insights | The original job finished successfully and stored eight pain themes. Themes and Communities rendered at desktop and 390-pixel mobile widths. Generated summaries were inspected for rendering, not independently fact-checked. |
| Competitors | The original job finished successfully; 39 mentions are stored. Their source posts fall outside the original 30-day window: the database query and UI both return zero recent mentions. This verifies the real pipeline and empty state, not a populated recent-mentions chart. |
| Reddit SEO | The original job finished successfully and stored 50 keyword/thread opportunity rows. The default open-thread view shows 29 ranking threads over six phrasings, seven rated worth replying in. Table, desktop split view, mobile detail selection and Back to threads worked. These scores are attention rankings, not conversion probabilities. |
| REST | Eleven live checks passed: account, two projects, owned project, leads, pain themes, SEO, usage, missing token (401), missing project (404), invalid limit (400), and a revoked token (401). The temporary read-only key was created locally through the existing key module and revoked in a finally block; no key was published. |
| MCP | Ten live checks passed: initialization as Hark, seven-tool listing, all seven tool calls, and the missing-project tool error. REST and MCP responses checked the zero-cost header. This was a local HTTP client, not a configured external assistant integration. |
| X | With the existing X flag off, its navigation remains hidden and opening the route renders the original 404. No X job or paid X data request was run. A preliminary browser-fetch status alone reported 200; actual navigation and the rendered 404 were used for the gating check. |
| Alerts | Settings rendered, and all four channel tabs selected the expected email/webhook input. No channel was added and no message was sent. Email sender and Slack/Discord app credentials are absent; delivery and chat OAuth remain unverified. The inherited email-preview fallback address is an upstream example, not a configured Hark sender. |
| Wallet/settings | Self-hosted mode uses the operator's keys. The settings page and scanning form render, but hosted-wallet OAuth is unconfigured and was not attempted. Scan-setting saves/cadence execution were not exercised. |

## Observed defects and fixes

- Self-hosted settings said limits were disabled but still labelled Free as the current plan and offered wallet connection. Its prefetched connection route logged missing AnyAPI OAuth configuration. WalletPanel now explains own-key use and omits hosted plan comparison/connect/disconnect controls in self-hosted mode. Five isolated server-render checks passed for the three self-hosted scopes and the existing hosted free/connected branches; the disconnect action was stubbed and not invoked. Rebuilt General/Reddit pages show no free-plan label or `/connect` link. Hosted OAuth itself remains a separate integration.
- The notification-channel tab strip overflowed a 390-pixel screen to 437 pixels. A constrained wrapping track removed the overflow; rebuilt screenshots and all four tab selections stayed within the requested viewport. Desktop layout and channel behavior were retained.
- Visible upstream product wording in notification previews, plan descriptions, Reddit/X settings and the stale-action message now reads Hark. Internal keys, assets, source/license attribution and real integration addresses were not renamed.

Raw signed-in screenshots, response checks, provider traces, before/after database snapshots and private workers remain under ignored `.local/acceptance/`. Browser-command mistakes included a relative artifact path (Ego's working directory differs), an overly specific h1 wait on a valid h2 page, and a private probe initially reading scheduler state from the wrong object. The isolated render harness needed Next's explicit native-ESM link filename. These were corrected without changing product behavior. Rebuilding while an old preview was running briefly made its old asset paths unavailable; the final preview was restarted with copied assets and reports zero broken images on the repaired pages.

## Cost and final state

Research ran serially through the original handlers, with automatic scheduler/seeding off. Only the three watched CapCut jobs were claimed. The private worker capped AnyAPI requests at $0.01, generation at 6,144 output tokens, and daily house data/model spending at $0.11/$0.25. Research methods still used their original breadth; smallSweep is not a research-module limit. The ledger recorded 150 data accesses (one reused), $0.080200 data and $0.011068 model for this run.

After all paid work, AnyAPI balance was $0.035720, down $0.114280 from the observed $0.15 starting balance. OpenRouter cumulative key usage was $0.105496620. Combined observed trial spending is **$0.219776620**, within $1; billing can settle later. The remaining AnyAPI wallet is a tighter practical constraint than the authorized dollar ceiling. No credit was added.

CapCut's 24 original lead statuses/reasons remain identical to the snapshot and its profile remains version 3. Cal.com retains nine leads. There are zero alert channels. The original research handlers queued two future successors (competitor scan and SEO refresh); they are retained, unstarted, while scheduler/seeding remain off. The final localhost preview inherits zero paid-call caps to prevent browsing from making further purchases; persisted environment budgets are unchanged. Restarting through the normal local tools without those temporary shell overrides restores configured paid-call caps, so do so only for the next budgeted scan. Starting local tools does not enable automatic scheduling.

## Verification

- Passed: TypeScript, ESLint, 97 test files / 928 tests on the dedicated test database, production build, five isolated wallet render cases, scoped Impeccable detector inspection, local HTTP health, live REST/MCP checks, browser result checks and Git whitespace checks.
- After the final tab-wrap class change, TypeScript/ESLint, a fresh production preview build and the original mobile reproduction passed. The local full suite was not repeated for that layout-only line; final GitHub Check runs against the archived source.
- The detector's two accent-border warnings are inherited Slack/Discord preview decorations, not introduced defects. Physical-device, exhaustive accessibility, factual model-quality, larger sweep, cross-user live-client, hosted OAuth, outbound delivery and production deployment checks were not run. Existing automated authorization tests passed in the full suite; they are not presented as live cross-user testing.
- Two independent Astra review outcomes, remote archive SHA verification and final CI completion are recorded separately after execution. This report does not claim the unconfigured integrations are completed.
