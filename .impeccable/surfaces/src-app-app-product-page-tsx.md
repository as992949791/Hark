---
version: 1
slug: "src-app-app-product-page-tsx"
primary_target: "src/app/app/product/page.tsx"
related_targets: ["src/app/app/sources/page.tsx","src/components/product/ProfileForm.tsx","src/components/product/ListEditor.tsx","src/components/product/PlanEditor.tsx","src/components/product/PlanSections.tsx","src/components/product/EvidenceThreads.tsx","src/app/app/product/loading.tsx"]
---

# Product and sources refinement

Mode: Operate. Primary route: `/app/product`; related route: `/app/sources`. Existing project owners edit product facts and retrieval lists. This extends the v0.1.24 working application without changing the visual world, permissions, schemas or scan budgets. A save-path regression found during acceptance is included: unchanged null/empty fields must not bump the profile version or enqueue fresh analysis; actual edits and existing queued-job retry behavior remain. Real stored content supplies all counts and fields. Paid actions and schedules stay off during acceptance.

## Direction contract

**THESIS:** Make product facts and retrieval choices easy to read and correct, preserving their distinct roles rather than introducing a new dashboard.

**OWN-WORLD:** Inherit DESIGN.md's Instrument Sans, cool opaque surfaces, blue actions, navy shell, semantic light/dark colors and compact rounded controls.

**STORY:** Review the profile, edit a buyer phrase, then inspect and adjust the searches, communities and competitor sources. Existing evidence and explicit scan/rebuild controls remain available.

**FIRST VIEWPORT:** Keep the page title and short explanation above the profile. Pair problem/solution fields on desktop and stack on mobile. Related lists form a two-column desktop area. Sources retain their existing section order, with readable full-width mobile entry fields and domain fields below competitor names.

**FORM:** Narrow code-led refinement of the established pages; no new concept seed or raster comp. Signature interaction: real add/toggle/remove feedback remains immediate and keyboard accessible, with larger control hit areas. Motion stays at the inherited state-transition duration.

**FINISH:** unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
