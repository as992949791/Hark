# Research pages review

Baseline v0.1.25-product-sources (`62cf3d44bc9010e9a61e8b44ea125303864c0c4f`). Scope: Insights, Competitors and Reddit SEO under [frontend integration 16](https://github.com/as992949791/Hark/issues/16), the research surface brief, and [acceptance](../acceptance/15-research-pages.md).

## Standards

Independent read-only Standards review at `6e98876` checked every changed hunk across 16 files against AGENTS.md, DESIGN.md and development/domain/issue guidance. Zero documented breaches or actionable baseline smells. New wrappers/loading components serve existing layouts without introducing an unnecessary abstraction. The final empty-watchlist and utility-cleanup delta is reviewed separately before archive.

## Spec

Independent Spec review identified a P2: the new Watching/Edit sources section was inside the nonempty watchlist branch, leaving zero-watchlist users without a configuration link. `33cb47b` moved it outside and corrected empty guidance to Sources. The reviewer confirmed resolution with no additional delta findings. Existing queries, owner checks, actions, scoring, thread URLs and view/filter behavior remain. Acceptance, archive and CI were explicitly treated as delivery gates, not implied by source review.

## Visual finish and documentation

Fresh independent finish review opened all 15 first-round captures and returned `disposition: ship` at saved-data visual scope. It matched type, materials, ground, thesis, own-world, story, first viewport and form. Final confirmation uses the same 15-view matrix after the source-review correction. Independent QUALITY BAR comparison, unshown zero-watchlist/populated mention states and exhaustive state coverage remain outside the verdict. Parent verified real tabs, filter/disclosure, theme links and mobile Back separately.

The fresh documenter read PRODUCT.md, DESIGN.md, sidecar, global styles/primitives and the changed TSX files. This ordinary extension introduces no approved system change, so root DESIGN.md and sidecar are preserved. It identified an unmapped introduced accent utility; restoring the original `bg-surface-2` resolved that source concern, while existing aria-current CSS continues to supply selection appearance. Final quick TypeScript/ESLint checks passed. The one detector pass returned `[]` before these tiny corrections and was not repeated.
