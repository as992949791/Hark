# Frontend integration handoff

Baseline: `v0.1.22-home-nav`. Prototype feedback: [issue 15](https://github.com/as992949791/Hark/issues/15). Integration: [issue 16](https://github.com/as992949791/Hark/issues/16).

## Current state and gate

The homepage/workspace proposal is runnable at `http://127.0.0.1:4173/#home` and `#workspace`; see [run instructions](../../design/first-draft/README.md). It uses synthetic in-memory data and does not replace the real Next.js application. The user has specified sky/cloud backgrounds, gradient display text, computer/phone previews, iPhone-inspired controls and removal of the Open source navigation link.

On 2026-10-15 the user selected the current visual direction for integration, with one change: remove the top prototype-only homepage/workspace switcher. The confirmation of [cross-platform discovery scope](../specs/cross-platform-discovery.md) is a separate product decision. Preserve the remaining sky/cloud, gradient, device framing and workspace treatment while connecting actual application routes and controls.

## Implementation order

1. Integrate the homepage into its existing Next.js route, preserving real sign-in/workspace links, truthful product copy, upstream attribution and cost disclosures. Keep any illustrative preview clearly labelled; do not advertise planned web discovery as a working capability.
2. Apply the shared navigation and lead-workspace treatment to the existing authenticated components. Preserve source-specific controls, filtering, detail URLs, handled states, pagination and Clerk/owner checks. Do not ship the prototype's fixture store or disabled navigation as a functional replacement.
3. Complete the existing Product, Sources, Insights, Competitors, Reddit SEO, Alerts, Usage and Settings surfaces with the same visual vocabulary while retaining their actual forms, permissions and working integrations. Wallet functionality remains deferred.
4. Verify desktop/mobile and keyboard behavior, real empty/loading/error states and existing data preservation. Use existing saved data with scheduler/seeding and paid scanning off. Archive each completed version and inspect its exact-commit CI.

Frontend completion is the gate for implementing the new cross-platform feature. The feature's input and two result views can be designed within the established system afterward; this handoff does not insert synthetic web results into the working application or redesign unrelated backend behavior. Public deployment remains a separate verified delivery step.

## Local delivery record — 2026-10-17

The real frontend route/layout/core-interaction gate is complete across v0.1.24-home-integration, v0.1.25-product-sources, v0.1.26-research-pages and v0.1.27-frontend-completion. Acceptance and review records are linked from [the final slice](../acceptance/16-configuration-workspace.md); remote identities and exact-commit CI follow on issue 16 after archive. The synthetic 4173 prototype remains a historical reference; the real local application is served at port 3000.

This gate does not imply exhaustive browser/OS, accessibility or every slow/offline/permission combination, a public deployment, wallet completion or new cross-platform functionality. The documented limits remain. Engineering preparation for issue 17 can proceed within the established system with paid calls and scheduling off.
