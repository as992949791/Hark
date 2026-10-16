# Cross-platform demand discovery — confirmed scope

Confirmed by the user on 2026-10-15. Baseline: `v0.1.22-home-nav`. Feature: [issue 17](https://github.com/as992949791/Hark/issues/17), blocked by [frontend integration 16](https://github.com/as992949791/Hark/issues/16).

Engineering decisions and sequenced implementation tickets are now captured in [the implementation plan](cross-platform-discovery-implementation.md). They do not represent a shipped feature or completed acceptance.

## Problem and outcome

People need to find concrete, relevant requests beyond Hark's existing Reddit/X sources. The same collected content should support two tasks: find potential users for an existing product, and investigate unmet needs in a field. The first version is a small manual workflow, targeted at about one week of feature work after the frontend is complete. That is a planning scope, not a delivery guarantee.

The earlier in-app research-question-answering proposal is not the selected next feature. Its conversation-history and QA-case requirements are not requirements for this workflow.

## Existing capability and actual addition

- Reddit and X already have search, judgement and saved lead workflows. Bounded live acceptance is recorded in [public pipeline acceptance](../acceptance/08-public-pipeline.md); this does not establish continuous live operation or customer usefulness.
- Google search is already used for Reddit discovery/feed/SEO. [`googleQuery`](../../src/lib/seo/fetch.ts) appends `reddit`, and storage retains only Reddit threads. Adding X or simply connecting Google is not a new feature.
- The extension adds demand discovery from other accessible public web sources, a demand-topic input, and two views over the collected evidence. It must not broaden the existing Reddit-only parser and pretend other site content is a Reddit thread.

## User workflow

1. Enter a product URL or a demand topic. Product mode uses the existing product context to explain fit; topic mode investigates the specified problem without asserting fit to an unspecified product.
2. Start a search manually. Search overseas English public content through existing Reddit/X capabilities and web search. The initial public case remains CapCut/video editing.
3. Prioritize firsthand public forum discussions, questions and user reviews expressing concrete needs. Filter unrelated content and pure marketing. A complaint alone does not establish purchase intent or product fit.
4. Inspect either view of the evidence:
   - **Demand signals / 需求线索**: the request or difficulty, original quote, source URL, available author/date metadata, and why it matches the product or topic. A qualified product lead must satisfy the product's fit criteria.
   - **Pain themes / 痛点主题**: recurring problems, users' current workarounds and limitations supported by the retrieved content. Show supporting signals and independent-person counts; one person's feedback stays an individual case.
5. Read Chinese explanations and summaries while retaining the original-language evidence. The user decides whether to follow up or investigate a theme.

## Evidence and data boundaries

- Web search discovers source pages; Google is the discovery channel, not the author of the underlying feedback. Preserve original URLs and distinguish search snippets from retrieved page text.
- Quotes and claims must be supported by the content actually retrieved. Missing dates stay unknown; a search/index timestamp must not be represented as the post's publication date. Inaccessible pages cannot support invented full-text evidence.
- Avoid counting repeated or syndicated content as independent people. Repetition in a search sample is not an estimate of market size or a promise of demand.
- Preserve authentication, ownership boundaries, existing project data and provider cost accounting. Topic ownership/storage and concrete source adapters are implementation decisions still to be designed; this scope does not authorize a new cross-user search surface or a schema replacement.
- Reuse source and budget infrastructure where appropriate without changing existing Reddit/X behavior. Account separately for the incremental web-source results and costs.

## Acceptance targets — not achieved results

- Both entry types lead to the two result views. Reddit/X results and newly found non-Reddit/X web results can be distinguished and checked individually.
- The user manually reviews 20 displayed results from the public case. Target: at least 16 express an explicit need relevant to the supplied product or topic. Record each judgement and reason; insufficient results are a limitation, not a reason to invent or pad examples.
- Every displayed quote can be checked against its actual retrieved source. Available metadata is accurate; unknown fields remain unknown. Every theme's substantive claims link to supporting signals.
- Recurring themes require evidence from at least two independent people. Otherwise retain an individual case. Do not equate source count with person count.
- Report how many relevant independent signals the new web sources add beyond the Reddit/X baseline for the same input. Record actual requests/model usage and costs. No minimum incremental count or acquisition outcome is claimed before testing.
- Verify loading, no results, partial source failure and retry behavior, along with authentication/ownership and the supported checks appropriate to the implementation. Real scans must use concrete approved provider limits; no paid call is authorized by this planning archive.

## Sequence and exclusions

1. Integrate the selected frontend direction, preserving real application behavior. The user separately selected the current prototype direction on 2026-10-15 with removal of the top prototype-only homepage/workspace switcher.
2. Design and implement the bounded manual discovery workflow and its two views.
3. Run small real-source acceptance and manual review; correct observed failures.
4. Consider ongoing monitoring only after this workflow is useful. Presentation work follows frontend and feature completion.

The first version does not add automatic outreach, posting, reply generation, wallet OAuth, Chinese-platform adapters, recurring monitoring of the new sources or a general-purpose chat system. Existing unrelated features remain in place. No new provider, vector database, agent framework or model has been selected by this decision. Continue preferring low-cost testing and archive each completed implementation version in Git.
