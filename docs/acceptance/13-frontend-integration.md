# Real homepage and shared workspace integration

Tested locally on 2026-10-16 for [issue 16](https://github.com/as992949791/Hark/issues/16), after the user selected the draft's overall direction and removed its top prototype-only homepage/workspace switcher. Baseline: `v0.1.23-discovery-plan`. This is the first bounded integration version; it is not complete interaction acceptance of every module or a public deployment.

## Implemented

- `/` renders the selected sky/cloud, gradient headline and interactive desktop/iPhone composition through the existing Next.js application. Marketing illustrations remain explicitly synthetic. Workspace actions use real `/app/leads` links, with the existing Clerk sign-in flow. Six feature controls switch descriptive/illustrative panels.
- Shared tokens, header, navy navigation and wordmark apply to the existing authenticated components. Reddit/X feeds, forms, routes, ownership checks and stored data remain the working application, not the prototype's in-memory store. Product/repository metadata now names Hark's own public origin and repository; upstream MIT attribution stays visible. Existing Privacy/Terms routes remain linked from the homepage footer.
- Removed the two top homepage/workspace preview buttons and their orphan CSS from the retained 4173 fixture preview. Its sample disclosures, state controls and local-only behavior remain. The working application is on 3000.

## Checks and evidence

| Check | Result and boundary |
| --- | --- |
| Supported full verification | TypeScript, ESLint, 103 files / 970 tests and Next production build passed. This ran before the final selector/wordmark/footer/contrast corrections; tests were not repeated locally after those corrections. |
| Final source | Supported quick TypeScript/ESLint verification passed after the palette fix. The subsequent one-line `HowItWorks` foreground fix passed targeted ESLint and a fresh supported `preview:local` production build. Exact-commit CI is recorded on the ticket after archive. |
| Real sign-in | The owner initially signed into the prior public origin. The existing Google session then completed the intended localhost sign-in; no credential copied or auth bypass added. |
| Real lead workspace | CapCut -> Cal.com -> CapCut project switching, All time showing 24 qualified CapCut leads, selecting another real post and its details, Replied empty state -> New restoration passed. Candidate/detail links include held items and are not used as the qualified-lead count. No handled-state write was needed. |
| Mobile | At 390px, navigation open/Escape, opening a real lead, Back to leads and absence of horizontal page overflow passed. Desktop 1440px also has no horizontal overflow. |
| Other routes | X, Product, Sources, Filters, Insights, Competitors, Reddit SEO, Alerts, Usage, Settings, Scanning, API/MCP and X settings passed 1440px/390px layout smoke checks: 26 observations, no horizontal page overflow or application-error page. This does not certify every form, action, delivery channel or all loading/failure states. |
| Homepage | 1440px, 390px and user-width 1710px inspected; dark desktop also inspected. Six feature descriptions/panels switch with one selected control; final pill radius 999px and feature hardware border 8px confirmed. Zero Open source anchors. Legal links point to their existing routes. |
| Production runtime | Homepage and desktop/mobile real workspace captured no console errors in the bounded instrumented pass. A Clerk hydration notice seen during development hot reload did not reproduce in the fresh standalone preview; no Clerk replacement or speculative fix was made. |
| Detector | One pass reported two gradient-text warnings, both the user's explicit requested treatment. No clean-detector claim. |
| Verdict contrast | Green/amber text now uses separate light/dark tokens. WCAG calculations over surface, secondary surface and both selection tones pass 4.5:1: light minima 5.31/5.11; dark minima 7.01/6.97. Browser computed colors match the new tokens. The one solid green `lead` illustration badge preserves white text in light mode (5.98:1) and uses background-colored text in dark mode (10.42:1); both foregrounds/backgrounds were checked in the rebuilt application. |

Raw screenshots, route observations, detector output and the standalone log are private ignored files under `.local/design/`. Final image set includes home 1440/390/1710/dark, workspace desktop/mobile/dark and mobile detail. The first dark-workspace capture caught its loading skeleton, and an early desktop capture preceded the account menu: both were replaced only after observable detail/account readiness and opened for inspection.

The eight final images were refreshed after the contrast fix and opened again. One mobile capture included a transient tooltip left under the mouse after resizing; it was replaced after moving the pointer and observing tooltip dismissal. An initial mobile link selector timed out during the responsive update; the next snapshot identified the real link and opening its fully loaded detail succeeded. No successful click is inferred from the timeout.

## Corrections and limits

- An extraction cleanup initially removed the feature descriptions along with unused fixture fields; type checking caught it and the descriptions were restored. The first lint run also required Next Link for the home navigation. EOF whitespace was caught and corrected. Independent source reviews found a same-element CSS scope error; all nine selectors were corrected before the final captures.
- Visual finish review required stronger green/amber verdict contrast. Source delta review then caught the solid green illustration badge's inherited white foreground in dark mode; its one-line theme foreground correction passed re-review. Other score-color background consumers are unlabelled marks or translucent same-color pills; no additional solid-background text consumer was found.
- Screenshot paths must be absolute for Ego; the initial relative path failed without producing an image. A dropdown snapshot became stale during hot reload and was reopened before testing. One route inspection timed out waiting for full load; the committed page was healthy, and the evidence pass used DOM-content readiness with incremental private records. No failed operator attempt is counted as a passed check.
- Scheduler, seeding and scheduled dispatch were disabled by supported local startup; background worker was off and the standalone preview explicitly forces it off. All four house paid caps were zero and invitations off. No paid scan or notification was triggered. Existing pages may update visit/activity or queue metadata; no all-table equality or new cost reconciliation is claimed.
- No public deployment, new provider/dependency, wallet work, presentation artifact or cross-platform discovery backend. The remainder of issue 16 requires individual module design/interaction acceptance before implementing [feature 17](https://github.com/as992949791/Hark/issues/17).
