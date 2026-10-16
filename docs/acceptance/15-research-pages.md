# Research pages frontend acceptance

Scope: [issue 16](https://github.com/as992949791/Hark/issues/16), [frontend handoff](../design/frontend-integration.md), and research surface contract. Baseline v0.1.25-product-sources. Local production preview and existing CapCut data; no public deployment or new discovery feature.

## Implementation

- Insights retains its theme/community queries and project links. Theme cards use readable spacing, wrapping and a 40px primary text-link target. Columns start at lg so the 232px navigation does not squeeze intermediate layouts. Communities remains an actual table with column headers, caption and a named keyboard-focusable horizontal scroll region.
- Competitors exposes the saved watched products and a project-aware Edit sources link, including the zero-watchlist branch. Existing ranked totals, time series, mention reading and scan actions remain. No synthetic mentions were inserted to fill the naturally empty local result.
- SEO retains filters, ordering, table/list choice, selection URLs, row disclosure and original evidence. The table has an opaque surface and caption, its disclosure target is 40px, and selected list rows use the existing semantic accent. The thread's own container width determines whether the evidence and scoring rail sit together or stack. The narrow Back control stays visible while reading. Added Insights/Competitors loading skeletons; existing SEO loading remains.

## Verification

Supported quick TypeScript/ESLint verification and production preview build passed. The initial quick run caught an invalid competitor.id reference: watchedCompetitors returns name/domain/evidence. Corrected the key to its existing unique name, then reran successfully. No backend/query/schema/dependency/provider change or cosmetic implementation-mirroring tests were added.

First capture round: 15 images across Insights, Communities, Competitors and SEO. Primary pages cover 1440px/390px/768px light and 1440px dark, plus desktop/mobile Communities and desktop SEO split view. Each image was opened and checked. Asserted window-error/unhandled-rejection instrumentation and document overflow checks returned zero for all 15; this is not a full network/console/accessibility audit. One design detector pass returned `[]`; no second detector was run. A source-review empty-watchlist fix was made before the final rebuild/capture confirmation.

Real owner interactions passed: project-aware Insights tab navigation; 16 saved community rows; theme-to-leads navigation; SEO keyboard Enter/Space disclosure and collapse; order dropdown to Google rank; searchable phrasing filter returning seven stored rows; narrow thread navigation, root scroll lock and Back restoring the list/unlocking scroll. Paid Refresh/Scan controls, notification actions and external source links were not invoked. Available unknown metadata remains unknown.

A private loopback-only before/after helper preserved selected project facts/version, keyword/community/competitor rows, stored theme rows and project data/model ledger counts. No acceptance fixture writes were needed. The helper does not establish equality of every historical activity/job table or current provider balances.

Final production confirmation captured the same 15-view matrix with zero observed errors/overflow. Nine changed capture files were opened; six were byte-identical to already opened first-round files. A viewer request using unsupported low detail returned no images; those nine files were then inspected through the supported default. A final nonvisual cleanup restores the original selected-row utility because the introduced accent utility lacked a Tailwind alias; selection appearance remains supplied by the existing aria-current CSS. Final quick checks passed. Independent review is recorded in [review](../reviews/research-pages.md); archive identity and exact-commit CI follow on issue 16 after execution. The ticket remains open for other existing module surfaces.

## Limits

The current competitor case has no recent mentions, so populated cards/chart are source-reviewed, not live visual acceptance. Zero-watchlist reachability is source-reviewed. Loading layouts are source/build checked; exhaustive slow/offline/pending/permission states were not captured. No paid call, email, scan, wallet action, cap change, recurring scheduling or public deployment. Cross-platform discovery and its human relevance review remain separate work after the frontend gate.
