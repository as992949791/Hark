# Public scheduled dispatch and digest acceptance

Tested on 2026-10-11 at [public Hark](https://hark-as992949791.netlify.app), using the existing test owner. Implementation commit `e391c72f8163a6fa0795d22572ac99cf54042b45` is archived as `v0.1.16-public-schedule`. This report records live acceptance for [ticket 13](https://github.com/as992949791/Hark/issues/13); the acceptance archive changes documentation only.

## Cloud invocations

The first disabled deployment, `6acb2a8a1e087bdfbbbf0733`, published at 06:21:03.140 UTC with the scheduled worker off, an empty allowlist, provider keys omitted and all four paid caps zero. Netlify's Functions panel Run now invoked the actual scheduled function; its log reported zero dispatched jobs. No digest was seeded and the original pending jobs remained unchanged. A stale browser subtree reference affected the first evidence capture after invocation; the existing log was recaptured without invoking again.

Temporary trial deployment `6acb2b5fa912d2f782d0504d` published at 06:24:23.954 UTC. Only the new Cal.com demonstration project and a temporary synthetic digest project were allowlisted. Recorded-spend thresholds were $0.03 global data / $0.07 global model and $0.01 X data / $0.03 X model, with the existing small sweeps and single concurrent data request. These are soft daily checks, not reservations or a replacement for the cumulative $1 authorization. Persistent scheduling, boot seeding and invites remained off.

One Run now invocation logged “Scheduled tick dispatched 2 jobs” at 06:26:09 UTC, request prefix `4e122096`. The dispatcher invoked the existing Netlify background runner; no local operator ran a scan or digest handler.

| Job | Started UTC | Finished UTC | Observed result |
| --- | --- | --- | --- |
| Cal.com X successor `0adcc84c-2c8e-4a6d-8fdc-bb1258850995` | 06:26:12.446 | 06:26:16.068 | Finished without a recorded error |
| Synthetic project digest `e4761918-d1f2-455a-ad06-7aecf431a136` | 06:26:12.409 | 06:26:15.949 | SMTP sending succeeded; lastSentAt advanced |

X run `e55ae4e7-5dae-4f8f-8b00-5251f48f0622` completed two lanes/two pages, both empty: zero posts fetched, judgements or new leads, with no partial reason. Ledger cost was $0.001200 data / $0 model. The existing demonstration X lead remains; it was produced in the prior stage. The handler booked successor `cc40e6f0-797e-4ce3-a3d0-4db27803bbc3` for 07:26:12.470 UTC, still unstarted after cleanup. This trial verifies real scheduled-path execution and persistence, not new buyer discovery or model quality.

## Digest delivery

A read-only preview found no currently eligible digest for the real Cal.com project. To exercise cloud delivery without altering real lead timestamps, an operator created a separate project named **Hark Scheduled Acceptance (synthetic)** under the same owner. Its one lead explicitly described itself as synthetic acceptance data, not a real Reddit buyer. Its Daily email channel copied only the already confirmed owner's mailbox; no new recipient was introduced.

The actual scheduled dispatcher seeded the project's digest, and the background runner used the original digest selection and SMTP transport. The message subject was **1 new lead for Hark Scheduled Acceptance (synthetic)**. The job finished successfully and the channel's lastSentAt became 06:26:12.436 UTC, establishing successful SMTP transport acceptance. Human inbox/content confirmation is pending; server acceptance alone does not prove inbox receipt. No second message was sent. Its hourly successor was queued for 07:26:15.940 UTC and removed with the fixture.

The temporary project, channel, lead, digest jobs and unique synthetic post were removed after delivery, with absence checked in the cloud database. Signed action links in that temporary message refer to deleted fixture resources; their ongoing usability was not accepted. Real project channels and send markers were preserved.

## Cost, cleanup and automatic clock

Provider reconciliation before the trial showed AnyAPI balance $0.015160 and OpenRouter key usage $0.150291398. Afterward they were $0.013960 and $0.150291398: this trial added $0.001200, bringing cumulative provider spending to **$0.286331398 of $1**. Billing may settle later. No hosting upgrade, credit purchase or additional recipient was involved; the Netlify Free panel showed approximately 197 available credits before this stage's publications.

Cleanup deployment `6acb2c7390d71f3dc87c5e9a`, at the same implementation commit, reached ready/published at **06:29:00.750 UTC**. Published identity and configuration were read back: scheduled worker false, project allowlist empty, all four paid caps zero in build/function scopes, provider keys absent, and persistent scheduler/seeding/invites false. Automatic Git builds were stopped again. Public health returned `{"status":"ok"}`. The ignored saved cloud configuration was also cleaned.

Without clicking Run now again, Netlify's subsequent automatic clock invocation logged **Scheduled tick dispatched 0 jobs** at **06:30:39 UTC / 14:30:39 Beijing**, request prefix `796e22e8`. Thus the enabled work was tested via Netlify's manual invocation of its scheduled function, while natural cron firing was observed in disabled mode. The application switch prevents database/queue/provider work; the platform still invokes the empty function and uses compute. See [Netlify scheduled functions](https://docs.netlify.com/build/functions/scheduled-functions/).

Scoped preservation checks passed after cleanup: both original project/profile rows, all 33 original Reddit lead rows, both original X lead rows, original email channel/last-sent marker and three unstarted research successors matched their snapshot. Shared post metadata and visit timestamps were not part of that comparison. The new real Cal.com demonstration remains; raw signed-in captures, provider metadata, recipient and credential material stay ignored.

## Verification and limits

The implementation's [exact-commit Check run 38117678432](https://github.com/as992949791/Hark/actions/runs/38117678432) passed TypeScript, ESLint, all 967 tests in 102 files, and production build. Full local verification and both custom-function bundles had already passed before publication, with independent Standards and Spec reviews returning zero findings. This documentation-only acceptance did not repeat those local tests; its archive and CI are recorded on ticket 13 after execution.

Live acceptance covers the scheduled dispatcher, actual X handler completion, synthetic digest SMTP acceptance, automatic disabled clock invocation, provider reconciliation and cleanup. It does not prove a fresh real-content scheduled digest, enabled unattended operation over multiple periods, a real platform timeout/lease recovery, exactly-once SMTP delivery, retention automation or unconfigured Slack/Discord receipt. Wallet OAuth remains deferred. Human receipt is the remaining confirmation for this delivery trial; recurring paid scans and automatic messages are disabled while it is pending.
