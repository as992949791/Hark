# Hark workspace acceptance — 2026-10-08

Scope: exercise the existing CapCut workspace against the upstream functional checklist, preserve its visual design, repair observed blockers, and archive the result. Real product creation and the remaining research/integration modules are separate stages. This is a sampled acceptance, not a complete accessibility certification or a claim that every upstream feature is verified.

## Results

| Path | Observed result |
| --- | --- |
| Authentication | Signed-in access initially looped because server-side Node could not connect to api.clerk.com. Direct GET timed out at 3 seconds; with the existing local proxy it returned HTTP 401 without credentials in 1.5 seconds. Restarting with proxy configuration restored authenticated app access. Clerk keys were not changed. |
| Leads | All-time view showed 24 leads; 30 days showed five; today and seven days showed an empty window with the all-time count. Detail showed the post, author, community, quoted need, explanation and Reddit link. |
| Community search | Keyboard search selected r/aivideos and retained the project in the URL. |
| Replied | Marking the cached sample replied persisted one replied lead and one handled-thread row; the Replied filter showed one lead. Not replied restored New and removed the handled row. |
| Display filters | Saving minimum score 99 removed all list rows without rescanning; saving 50 restored the original threshold. |
| Product / Sources / Filters / Usage | Authenticated pages rendered on desktop and mobile without the app error boundary. Product name, URL, solution and audience were filled; unsupported pain remained empty. Usage showed the existing data ledger. |
| Mobile navigation / theme | Navigation opened and Escape closed it; Back to leads worked. Dark/light theme switched. |
| Responsive layout | At 390×844, Filters overflowed to 739px. Its scoring grid used an implicit track sized by its contents. Adding an explicit single column reduced page width to 390px; 1710×896 desktop retained two 475px columns. |
| Branding | Sources explanation still said lurk; changed that visible sentence to Hark. Upstream attribution and asset filenames retained. |

The initial capture reported a stray action label over the mobile pane. DOM bounds confirmed the closed navigation was hidden and positioned outside the viewport; it was not treated as an application layout defect. Raw browser captures remain in ignored `.local/acceptance/` rather than publishing signed-in evidence.

## Cost and data preservation

The planned no-new-call check was breached: an operator used `lead:` instead of the actual `lead-` URL prefix, which selected the first lead and automatically fetched its missing community policy. One data row ($0.000380) and one model row ($0.000011, ledger rounding) were added. The mistake was corrected and disclosed; the later preview process inherited zero data/model caps, while the user's persisted budgets remained unchanged. No scan, profile rebuild or outbound notification was triggered in this stage.

Before inspection: profile/brief version 3, ten capabilities, 24 New leads, zero unfinished jobs. Replied and threshold changes were undone. Hide/not-fit persistence and scoped restoration are recorded in the final version log. The current provider reading before the next stage is OpenRouter key usage $0.061967992 plus AnyAPI spend $0.023640, approximately $0.085608 cumulatively; billing may settle later. AnyAPI balance is $0.126360, a separate constraint from the authorized $1 total budget.

## Interface audit

The product-specific list/detail, filters and source configuration are coherent with the existing implementation. The detector returned two accent-border warnings in alert previews; these are upstream notification examples outside this inspected workspace, not evidence for changing the baseline design.

- Fixed P1: mobile scoring-grid overflow. Original symptom and constrained-grid comparison were observed in the live browser, followed by rebuilt desktop/mobile confirmation.
- Fixed P0 local environment blocker: Clerk server connection timeouts. This was network configuration, not proof of invalid API keys.
- Fixed P2: Sources retained upstream product wording.
- Deferred P2: compact lead-action and ranking controls are below the skill's 44px touch recommendation. Keyboard, theme and drawer checks passed; exhaustive contrast measurement, screen-reader testing and physical-device gestures were not run. No WCAG conformance score is assigned from this limited sample.

## Limits and next stages

There was only one product, so true cross-project switching awaits browser creation of a second product. Exactly 24 leads fit the original 24-row page; fetching a second page was not exercised. Stage-two creation will verify queue/progress/results and project isolation under explicit small-sweep limits. SEO, competitor research, insights, X, notifications, wallet, REST and MCP each need separate verification; configuration-dependent modules must be distinguished from completed integrations.
