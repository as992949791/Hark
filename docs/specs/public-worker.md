# Public background execution

Ticket: [12](https://github.com/as992949791/Hark/issues/12).

Continue the public-test deployment after `v0.1.13-public-test`. The user deferred wallet OAuth and authorized the other integration work. Preserve the Lurk handlers, Clerk, original projects and upstream attribution. Use existing Netlify Free and Neon Free; no new infrastructure purchase.

## First version

- Add a Netlify background function which executes one explicitly requested database job, using the original runner and leases. Successful initial discovery may execute its queued backfill in the same invocation. It must not drain old research successors or instance-wide notification/retention jobs.
- Existing authenticated actions dispatch after queuing. Retrying a button whose job is already due also dispatches that job. Dispatch failure leaves the row queued and reports a retryable error.
- Default off. Require a private shared secret and one configured personal-test owner. Missing/wrong credentials, malformed body, another owner's job, a completed job or a live lease must not execute a handler. Dispatch only to the same application's Netlify function URL.
- Serialize scoped project claims in the database, so independent invocations cannot claim sibling jobs concurrently. Preserve the original X/Reddit family rule and expired-lease recovery.
- Keep the persistent scheduler/seeding/invites off. Publish the first worker with paid caps still zero. A 202 response means invocation accepted, not job success; acceptance reads final job/progress/error rows.
- Allow the existing `SWEEP_SCALE=small` only inside an explicit worker async context for the personal test. Ordinary production requests stay full size. No global NODE_ENV change. The default full setting remains full even in that context.
- Verify admission, project isolation, duplicate/concurrent claims, discovery/backfill continuation and safe handler failure with the dedicated test database. Bundle the custom function separately and run supported full verification. Independent Standards/Spec review precedes version archive and deployment.

## Live acceptance and later steps

Privately configure the existing provider credentials only for bounded testing within the original cumulative $1 authorization. Reconcile provider spend before and after; do not treat free hosting as free data/model calls. Preserve existing lead states and research successors, use a separate demonstration project for creation, and disable purchases again after the tests. Verify real browser creation, scanning, persisted results, cloud SMTP and one notification to the already configured owner mailbox. Wallet remains deferred. Other real notification channels require owner-controlled receiver configuration; protocol/failure tests do not prove live Slack/Discord receipt.

Recurring dispatch, long-run timeout recovery, external REST/MCP clients and other notification integrations are follow-up work, not established by the first worker version. Background platform retries cannot immediately reclaim a database lease. See [platform research](../research/netlify-background.md).
