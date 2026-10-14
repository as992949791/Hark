# Worker recovery and isolated Neon retention

Tested on 2026-10-14 for [ticket 14](https://github.com/as992949791/Hark/issues/14), baseline `v0.1.18-schedule-receipt`. The user deferred presentation: finish recovery and retention first, then frontend, then new features, then demonstration materials. This stage does not redesign the UI or prepare a demo.

## Interrupted workers and the reproduced defect

A synthetic child Node process used the original scoped claim and `runClaimedJob` against the dedicated local test database. Its fixture handler signalled that it was running, then remained pending. The test sent SIGKILL only to that owned child and observed its signal exit and unfinished job. A claim before lease expiry returned no row; advancing the eligibility clock beyond the original lease allowed recovery. Two simultaneous scoped claims produced exactly one winner. Running that recovered fixture finished the same job successfully, and another claim returned no row.

The same real subprocess test also passed against the separate Neon test database. The Node processes ran on the operator's machine; only their database was hosted. The lease clock was advanced explicitly, without shortening production leases or editing application job timestamps. Neither test represents killing a Netlify invocation or waiting for its real 15-minute timeout. No fixture handler performed an external side effect before interruption, so this does not establish exactly-once delivery after a crash following SMTP acceptance.

The heartbeat test injected an ECONNRESET at the database update boundary. Before the fix, its assertions could finish but Vitest recorded an unhandled rejection and exited nonzero. The original interval's `void renewLease(...).then(...)` had no rejection handler. Added one catch: retain the last lease stamp, log a static warning without error/credential contents, and let the next interval retry. The test confirms the next heartbeat advances the lease and the job finishes without error. Claim, retry cadence and lease-duration rules were not replaced.

The existing job, serverless and scheduled suites cover transient handler release, recurring failure successors, live/expired leases, duplicate admission and owner/project boundaries. The scheduled digest suite retains mocked sending and verifies failed delivery leaves lastSentAt unchanged, books the scoped hourly retry, and can retry the same eligible window. No real SMTP failure or second external message was induced.

## Cloud retention and isolation

Created one uniquely named empty `_test` database on the existing Neon endpoint through SQL, applied the existing migrations, and set both DATABASE_URL and TEST_DATABASE_URL to it in the private test process. Paid provider and notification credentials were removed from that process; provider/send transports were mocked. The fixture subprocess independently refuses a database whose name does not end in `_test`. Hosted application configuration and database URLs were not changed. Neon documents SQL database management in its [Postgres integration guidance](https://neon.com/blog/better-postgres-with-prisma-experience).

The original retention functions ran only on this new database, including test setup's initial trim. Synthetic historical clocks let the existing suites coexist without deleting another suite's current fixtures. Passed behavior checks:

- Unreferenced old Reddit posts are removed in multiple batches; posts referenced by leads or SEO opportunities survive. Model-cost rows remain.
- Old finished jobs are pruned; the latest per project/kind, unfinished expired leases, future jobs and the latest instance-kind record survive.
- Old X posts are removed with their lead rows. Fresh posts and old parent posts fetched recently survive. Shared search runs and linked data-cost rows survive.
- Added coverage for stale author removal, the strict 90-day X run-history boundary, old retired lanes, active lanes and retired lanes used recently. Their expected retained/deleted rows were checked against the actual database.

The initial cloud run exercised five files / 31 checks: 29 passed and two failed because their one-second waitFor conditions expired before Neon completed the asynchronous work. One failure concerned initial background admission; the other recorded the assertion timeout as a fixture handler error. The detailed failure did not indicate a missed production finish write. Increased only those two waitFor limits to ten seconds, preserving their assertions, then reran the two affected cases on the same isolated database: both passed, with ten intentionally filtered-out cases reported skipped. Thus all 31 distinct cloud checks have passing observations across these runs; there was not a single all-green 31-check cloud run after the waiting correction.

After verification, dropped only the owned uniquely named test database and recorded successful removal. No whole-instance retention pass, global retention scheduler or destructive cleanup ran on the application database. This establishes cloud database behavior, not a hosted periodic retention service.

## Preservation, cost and verification

Read back Netlify's published implementation and controls before testing: `e391c72f8163a6fa0795d22572ac99cf54042b45`, automatic Git builds stopped, scheduled/persistent switches, seeding and invites false, empty schedule allowlist, all four paid caps zero and all three provider keys absent. The authenticated public saved-results page loaded; it may update the owner's last-seen timestamp. A direct operator curl initially failed with a connection reset; the browser loaded through its existing connection. No new browser submission, scan or sample send was performed.

Before and after the cloud tests, preservation assertions matched both original project/profile rows, all 33 original Reddit lead rows, both original X lead rows, original email channel/last-sent marker and the three original unstarted research successors. These assertions do not cover every table or the third demonstration project's full rows. Cloud tests never pointed at the application database for writes. Private SQL connections, fixture/database identities and logs remain ignored.

The last reconciled cumulative provider spending remains $0.286331398 of the authorized $1. Provider balances were not queried again. This stage made no paid provider call, external send, top-up or infrastructure upgrade; database checks consume the existing hosting resources.

Passed locally: complete supported verification with TypeScript, ESLint, 970 tests in 103 files and production build; both custom function bundles without warnings (queue-worker 628 inputs / 3,421,012 bytes, scheduled-tick 627 inputs / 3,415,155 bytes). After the two wait-limit changes, the affected local files passed all 12 cases and final quick TypeScript/ESLint verification passed. Complete local verification was not repeated for those test-only waiting changes; exact-archive CI is checked separately.

The first local attempt failed before collection because the previously stopped PostgreSQL helper was unavailable; starting the existing helper recovered it. That startup failure was not the heartbeat bug reproduction. The subsequent unhandled-rejection failure, corrected local passes and cloud wait-limit failures are retained in private logs. Review, archive/remote SHA verification, exact-commit CI and publication/readback of the small source fix are recorded on the linked ticket after execution. Publication must preserve zero paid configuration and stopped automatic builds.

Remaining limits: real hosted timeout/lease recovery, persistent database outage behavior, enabled scheduling over multiple periods, strict once-only external sending, production retention automation and unconfigured Slack/Discord receipt. Wallet remains deferred. Frontend and subsequent feature work proceed separately; presentation follows them.
