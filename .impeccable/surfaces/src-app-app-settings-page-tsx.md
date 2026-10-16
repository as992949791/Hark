---
version: 1
slug: "src-app-app-settings-page-tsx"
primary_target: "src/app/app/settings/page.tsx"
related_targets: ["src/app/app/settings", "src/app/app/filters", "src/app/app/usage", "src/components/alerts", "src/components/product/LeadFiltersForm.tsx", "src/components/product/ScoringPanel.tsx", "src/components/settings/ScanSettingsForm.tsx", "src/components/api"]
---

# Configuration and workspace completion

Mode: Operate. Existing owners manage filters, notification destinations, scan preferences, API access and usage, then review Reddit/X leads. Code-led ordinary extension of DESIGN.md. Preserve wallet deferral, real auth, existing state and actions; no paid scan, notification send or provider change during acceptance.

## Direction contract

**THESIS:** Make existing controls readable, reachable and explicit about progress without introducing another visual system or changing their rules.

**OWN-WORLD:** Retain navy navigation, Instrument Sans, cool opaque surfaces, blue actions and semantic theme pairs. Extend the same form spacing and 40px control vocabulary from Product/Sources.

**STORY:** Inspect lead filtering and preview weights, review notification channels without sending, navigate scan/platform settings, inspect API access and read project usage. Return to real Reddit/X workspaces with project context intact.

**FIRST VIEWPORT:** Existing headings and content order remain. Form groups use narrow-screen padding and columns only when space allows. Usage statistics remain two columns until desktop content can hold four; comparisons scroll inside their own labelled region.

**FORM:** Local refinement and acceptance of existing components. Signature interactions are draft-only scoring preview, notification channel selection, form validation, settings tabs and real workspace detail/back. Pending and result text stay attached to their form, with inherited state transitions.

**FINISH:** unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
