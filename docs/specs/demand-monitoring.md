# Public-web monitoring and deeper pain evidence

Issue: [24](https://github.com/as992949791/Hark/issues/24). Baseline: `v0.1.37-public-research`.

## Outcome

Save a product URL or topic as a daily monitor, discover newly observed demand through the existing Reddit/X/public-web research pipeline, and notify the owner's selected existing email channel. Show evidenced current workarounds and limitations in demand cases and pain themes.

## Acceptance

1. Authenticated owners can save, list, enable, pause and delete their own monitors. Save paused; creation and reads never purchase or send. Save the mode/input, owned email channel, per-run and finite lifetime USD budgets. One daily cadence, no subscription or budget reset.
2. Scheduled invocations reuse the existing fenced research jobs. Concurrent/repeated ticks create at most one active run per monitor, using fresh retrieval rather than cloning old content. Admission reserves the whole per-run ceiling against the lifetime budget; terminal settled runs release unused ceiling. Uncertain charges or failed/blocked runs pause further creation. Existing global daily caps and all live/worker switches still apply. Monitoring has its own default-off deployment switch and exact configured worker-owner scope; projectless topic jobs must not broaden legacy project scheduling.
3. A completed/partial, settled run records supporting canonical-source and quotation fingerprints. Repeated supporting source or repeated quotation produces no new alert, even when model IDs/labels change; newly observed evidence is not proof of a newly published post or a new independent person. First scan establishes a baseline without emailing old demand. Later new cases create a durable notification record. Delivery retries reuse that record, respect pauses/ownership/channel deletion and content expiry, and never rerun paid research. Normal successful repeats send once; SMTP acceptance followed by process failure can duplicate delivery, which is disclosed.
4. The existing email sender delivers a bounded count plus an authenticated research link, without raw scraped text or untrusted HTML. User-controlled email targets must come from a currently owned existing email alert channel. No real external calls or notifications during automated development tests.
5. Each reviewed demand case may contain up to four structured items: current workaround or limitation, Chinese explanation and an exact contiguous original quotation from that case's retained source documents. Server validates provenance and offsets. Fabricated, foreign-case and unread source quotes fail publication. No inference from missing evidence. Merge repeated cases without losing these items.
6. Both demand and theme views show the two categories, each conclusion's quote/source, and honest missing-evidence/legacy states. Do not add another AI request; extend the final contextual review. Existing legacy results stay readable without silently purchasing a reanalysis.
7. Dedicated test database coverage verifies owner isolation, default-off/read-only behavior, concurrent admission, budget and uncertain-charge fences, baseline/dedup/outbox retry, real scheduled-to-worker routing with fake external transports, exact pain quotations, and accessible form/results states. Keep original records intact. Record review/verification, commit, annotated tag and push to GitHub; document real paid/provider/email acceptance as not run.

## Defaults and limits

Daily means 24 hours after admission, not a promised wall-clock hour; the existing scheduled tick can be late. English public sources and Chinese presentation continue. Monitoring discovers changes in retrieved evidence; semantic cross-platform identity and market prevalence are not certified. Pausing stops future admissions and delivery, while an already executing request can finish within its reserved ceiling. Deleting a monitor preserves research and billing history but removes its conditions/fingerprints/pending delivery. This version does not enable production recurring spend, add SMS, or claim the unperformed human 20-case quality target.
