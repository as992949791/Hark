# Public creation and X pipeline acceptance

Tested on 2026-10-11 using the original signed-in Clerk owner at [Hark's public site](https://hark-as992949791.netlify.app). Implementation: `f660f68178e40ee655d8e9d44fe438c165b7b775`, archived as `v0.1.14-public-worker`. Netlify deploy `6acb1bdb1e087b90a2bf0732` published the temporary bounded trial configuration. No local process ran these handlers; operator database commands only observed their progress and results.

## Actual browser creation

Submitted `cal.com` from the authenticated New project form. It created a separate demonstration project, `6834c7e1-9ec3-4d54-8e7c-5a96bf15c568`; the two original projects were retained. The application dispatched its queued discovery job to Netlify, whose background invocation completed discovery and then the original backfill:

| Job | Started UTC | Finished UTC | Result |
| --- | --- | --- | --- |
| Initial discovery | 05:19:41.684 | 05:20:18.178 | Finished without a recorded error |
| Backfill | 05:20:18.189 | 05:20:41.462 | Finished without a recorded error |

The new profile and brief are version 1 with 19 capabilities. The Reddit pass stored 85 evaluations, including 17 qualified and 21 review decisions. The live feed transitioned from setup progress to results, and selecting All time showed all 17 qualified leads. The initial 30-day view showed one qualified lead and four review items. These counts verify this example's pipeline and persistence, not general product-analysis accuracy.

## X execution

Opening the demonstration project's X tab dispatched its already queued X scan, rather than creating a second scan. The job ran from 05:25:13.596 to 05:25:40.732 UTC without a recorded error. Its run metrics report two lanes/two pages, 29 fetched posts, ten judgements, one lead and one review, with no partial reason. Run-ledger cost was $0.003840 data and $0.007431 model. The public X page displayed one lead, its source/details and “Checked X just now. Next check in 1h.”

The original handler queued its next X job for 06:25:13.637 UTC. That row remains unstarted. The page's next-check estimate does not establish unattended execution: persistent scheduling and boot seeding remain disabled, and scheduled serverless dispatch is not implemented yet.

## Spending and cleanup

Before this trial, cumulative authorized provider spending was $0.230851669. AnyAPI balance was $0.032100 and OpenRouter key usage was $0.112951669. After creation, X execution and their page observations, balance was $0.015160 and key usage was $0.150291398. The combined increase was $0.054279729, bringing cumulative trial spending to $0.285131398 of the user's $1 authorization. Provider billing may settle after this observation. The new project's application ledgers separately total $0.016940 data / $0.037345 model; these are not substituted for provider reconciliation.

Temporary daily recorded-spend thresholds were $0.02 data / $0.06 model and $0.004 X data / $0.03 X model, with one data request in flight and small worker sweeps. They are soft recorded-spend checks, not reservations for concurrent requests. The trial executed only this project's two setup jobs and one X job. No wallet connection, purchase of hosting/credits, recurring scan or automatic notification ran.

After the jobs finished, all four hosted paid caps were reset to zero and provider keys were removed from Netlify and the ignored saved cloud configuration. Cleanup deployment `6acb1edb708410d04aa697d3`, at the same implementation commit, reached ready/published at 05:30:55.726 UTC. Published-deploy identity and hosted configuration were read back after publication. Scheduler, boot seeding and automatic invites remain false. Automatic Git builds are stopped after publication so documentation archives do not create extra deploys. The worker remains configured for the test owner; a new scan needs an explicitly funded provider configuration again.

Compared with the pre-test snapshot, both original project/profile rows, all 33 original Reddit lead rows, both original X lead rows, the original email channel/last-sent marker and three unstarted research successors remain equal. New demonstration rows and the revoked API-key audit row are intentional additions. Visit timestamps and all shared metadata tables were not included in this preservation assertion. Raw signed-in captures, provider metadata, receiver addresses and secrets remain ignored.

## Verification limits

Cloud SMTP receipt and generic Webhook 204/503 behavior are recorded in [public integrations](07-public-integrations.md). REST/MCP passed 21 checks before the worker deployment; they were not rerun after adding the demonstration project. The unchanged application implementation passed the complete 953-test/101-file verification and production build in [its exact-commit CI](https://github.com/as992949791/Hark/actions/runs/38113765671). This acceptance archive changes documentation only; full local tests were not repeated.

Still pending: recurring serverless dispatch, automatic cloud digest scheduling, long-run timeout/lease recovery acceptance and real Slack/Discord receipt. Wallet OAuth is deferred. This is a verified bounded public pipeline, not a claim of complete upstream operational parity.
