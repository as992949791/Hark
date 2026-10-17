# Research workspace integration

UI stage of [issue 20](https://github.com/as992949791/Hark/issues/20), based on `v0.1.30-demand-pipeline`. Parent17 and this ticket's later paid/human acceptance remain open. No paid execution or live relevance metric is established by offline UI tests.

## Behavior

The existing navy workspace now has a project-independent `/app/research` entry. Chinese product/topic input, a per-run test budget, owned history, persisted run status/costs, source read counts, demand signals and pain themes share the existing visual system. New product URLs stay run-owned and topic research requires no product onboarding. The original project picker and native modules remain intact.

Start is explicit and only available when demand/live, the configured personal background owner and nonzero operator caps admit it. Default controls remain disabled with an explanation; reads still show saved history. Creation uses a stable request key, exact job dispatch and a saved-run recovery path on dispatch failure. Retrying incomplete work reuses the same backend job/results; redispatch can recover queued or stale work. Public reconciliation of uncertain charges is intentionally absent. No page render starts a research job.

Signals show original-language quotes, Chinese judgements, source URLs, unknown author/date labels, publication/collection dates and product fit only in product mode. Search hints remain a separate disclosure. Themes link to cited signal anchors and label individual cases. Counts refer to observed source material, not verified market population. Actual charge precision is retained, including fractional cents. Expired content is redacted while billing stays visible. Raw paid artifacts and credentials are absent from presentation data.

The new form/results extend DESIGN.md in code-led Operate mode, using the existing paper/navy/blue family and shared fields/buttons. A narrow compose/history area sits beside results on desktop. Narrow screens stack; selected results lead, with a direct anchor back to the input. Controls have focus, pending/error/disabled states, and loading uses the existing skeleton family. [Direction contract](../../.impeccable/surfaces/src-app-app-research-page-tsx.md).

## Evidence and remaining boundaries

- Passed 22 targeted action/report/presentation tests with dedicated test-database records and mocked worker HTTP only. Tests cover project-less topic/product creation, no monitoring project, stable duplicate/dispatch recovery, feature gates, invalid budgets/input, foreign ownership, same-job retry, read-only route rendering, expiry redaction, original citations, unknown metadata, escaped model content and exact cost formatting. An initial hoisted mock fixture was corrected. The charge-precision regression failed before the formatting correction.
- Synthetic result fixtures live under tests only. Authenticated app data is never seeded with them. When original result layouts need inspection without a paid run, isolated static test renders are explicitly labelled synthetic and do not establish live behavior.
- Full supported verification, real local viewport/interaction checks, bounded finish review, documentation handoff, archive and exact-commit CI are recorded after execution. All local data/model caps and live/background/scheduling gates remain zero/off during browser acceptance.
- Later live CapCut validation needs a concrete budget, measured new-route ceilings and the user's20-case judgement sheet. The16/20 target is unachieved. There is no wallet, outreach, general chat, continuous new-source monitoring, presentation or public deployment in this stage.
