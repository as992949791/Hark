# Configuration and workspace frontend acceptance

Scope: [frontend issue 16](https://github.com/as992949791/Hark/issues/16), its handoff, and the configuration surface brief. Baseline v0.1.26-research-pages. This is local frontend delivery using the existing signed-in owner's real saved data, not a public deployment or cross-platform feature implementation.

## Changes and checks

- Preserved the existing Settings/platform/API/Alerts routes and project context. Added narrow-screen form padding, 40px scoring options, larger channel actions, wrapped API key header/endpoint text and contained keyboard-focusable comparison tables. Usage keeps two statistic columns until the content has room for four. Filters, Settings and Usage have loading skeletons.
- Scan settings and channel forms use the existing server actions/error adapter with React action pending state. Source review caught previous result text remaining during a new request; guards now hide it until settlement. The independent finish review found the same inherited issue in LeadFiltersForm; its error/Saved text now follows the same rule.
- The finish reviewer also found actual broken X avatar images. Avatar now uses its existing initials fallback after a failed image, including cached failures observed at hydration. A changed source can display again; no source image/data is rewritten. No dependency or new design token.
- The first inspection found the existing new-project tutorial hiding later cards even with reduced motion. Two rules expose its content immediately in that mode while preserving the existing ordinary animation.

Supported quick TypeScript/ESLint and production preview builds passed. Five relevant existing suites (settings, lead filters, scoring weights, alerts, API) passed 104 tests against the test setup; no paid keys are available to those tests. No markup-mirroring test or framework dependency was added. The final full exact-commit CI is inspected after archive on issue 16.

## Real owner acceptance

- Invalid email showed “That is not an email address”; invalid zero-hour scan settings showed the server validation error. No channel or settings write resulted.
- Invalid filter threshold 101 showed its server error. Repeating that validation with a bounded 1000ms browser latency produced a disabled Saving button with no prior result text; the new error appeared after settlement. Network emulation was reset.
- API key dialog opened with focus in Key name and closed with Escape. No key was created/revoked and no clipboard value was changed.
- A draft-only Buying intent change selected High and enabled Save weights. Refresh restored the saved Off value. No weights were saved.
- Real Reddit and X mobile detail routes opened from the saved list, locked root scrolling while covering it and returned through Back with scrolling restored. Existing list/detail controls, external links and handled actions remain; no replied/hide/mute changes or external posting were performed.
- Current real X failures resolved into initials, with zero remaining failed Avatar images after settlement. Account controls were awaited before final captures. Other browser-owned/third-party prompts were not exercised.

A loopback-only private before/after helper preserved selected product facts/version, score/filter settings, user scan overrides, source lists, channels/cadence/last-sent markers, mutes, stored themes and project data/model ledger counts. Normal last-seen activity and every historical job/handled table are not part of this equality claim. No acceptance fixture rows or provider balance refresh.

## Visual evidence and boundaries

Nineteen views cover Filters, Usage (including 768px), Alerts, API, Reddit scan settings, General/X settings, real Reddit/X workspaces and the new-project page. Primary routes have 1440px/390px captures; Filters additionally has a dark capture. The first batch's body views were inspected, but later account hydration meant they were not claimed as complete header evidence. Confirmation waits for the Clerk user-menu control, fonts and reduced-motion content. Parent opened all nineteen confirmed files. Asserted window-error/unhandled-rejection and document-overflow checks observed zero failures.

The finish reviewer requested the Avatar/LeadFilters corrections. The same nineteen views were recaptured after that one handoff fix batch, awaiting all Avatar loads/fallbacks. Their manifest additionally checks failed Avatar images and hidden tutorial cards. Both material fixes were scored resolved with ship at that fix scope; final disposition and documenter comparison are recorded in [review](../reviews/configuration-workspace.md). The one detector pass over twenty UI targets returned `[]` before the status/reduced-motion/avatar corrections; no second detector was run.

This completes the existing frontend route integration gate at the documented real-data layout, navigation, keyboard and validation scope, together with [homepage/shared shell](13-frontend-integration.md), [Product/Sources](14-product-sources.md) and [research pages](15-research-pages.md). It does not establish exhaustive combinations of slow/offline/permission states, every dark route, browser/OS coverage, a full console/network or screen-reader audit, fresh paid backend acceptance or verified product demand. Source/build and existing suites cover unchanged permissions, success actions and loading wiring; all of those states were not independently photographed.

No paid request, notification send, wallet OAuth, cap change, recurring scheduling or public deployment. The existing cloud build remains separate. Cross-platform engineering preparation follows the frontend archive; live relevance acceptance still needs actual bounded results and the user's judgement.
