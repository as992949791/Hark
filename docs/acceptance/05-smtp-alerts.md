# QQ SMTP acceptance — 2026-10-08

Scope: [issue 10](https://github.com/as992949791/Hark/issues/10). The user chose an existing mailbox via SMTP, entered a QQ authorization code in a private local wizard, and authorized one sample plus one eligible real digest to that same owner-controlled mailbox. No other recipient or integration was configured. The wizard and credentials are not committed.

## Connection and configuration

- Read-only preflight confirmed SMTP_URL and ALERTS_FROM_EMAIL configured, matching mailbox/login, smtp.qq.com:465 with TLS, no Azure carrier, and ALERT_INVITES=false. Existing model/data credentials, flags and persistent budgets were preserved.
- Direct connection did not return promptly, and a separate native DNS lookup ended with ENOTFOUND. An initial private probe incorrectly passed timeout options as Nodemailer message defaults; corrected to transport options. Two unfinished direct probes were stopped without sending mail. No authorization code was replaced.
- Changing only the probe's connection to the existing local HTTP proxy yielded successful TLS SMTP authentication in under a second. Persisted the optional proxy plus connection/greeting/socket/DNS timeout URL options in ignored .env.local, retaining the original credentials. The original application already accepts Nodemailer URL options; no business code was changed. Repeated authentication through the saved configuration passed.
- Restarted the supported production preview with zero global/X data/model caps. Scheduler/seeding and automatic email invites remain off. The private operator also blocks every HTTP fetch and applies a total execution deadline.

## Browser and real delivery

The signed-in CapCut Alerts form added exactly one Email digest channel, addressed to the configured owner mailbox, with Daily cadence. Send test was clicked once. Its original three-lead sample returned the success message; the channel still displayed Never sent, consistent with samples not consuming the real discovery window.

Read-only selection found one currently eligible X ask and no eligible Reddit candidates. Older or otherwise ineligible stored leads were not forced into the email. A restricted operator asserted that this was the instance's only channel, its project/recipient/cadence matched the selected scope and lastSentAt was null. It then called the original sendDueDigests pass:

| Check | Observed result |
| --- | --- |
| Sample mail subject | 3 new leads for CapCut |
| Real digest subject | 1 new lead for CapCut |
| Real leads | 1 X ask, selected by original rules |
| Original pass accepted sends | 1 |
| lastSentAt | 2026-10-08T05:01:40.672Z |
| Immediate second pass, one second later | 0 accepted sends |
| Next daily-window selection with current unchanged rows | null; already-sent lead excluded |
| Desktop page / mobile page width | 1710 / 390 pixels, equal to viewport |

The mailbox owner confirmed that **both emails arrived and their contents were normal**. This is human inbox evidence in addition to successful SMTP acceptance. Delivery latency, mailbox placement and remote image loading were not independently inspected. No third email was sent.

After reloading, the browser displayed Daily, Last sent and one channel. Mobile rendering stayed within 390 pixels. Before/after assertions preserved all 33 Reddit IDs/statuses/reasons across CapCut and Cal.com, both X lead states, all product profile/brief versions and the three original unstarted jobs. No lead reply/mute action was executed. Signed digest links and raw captures remain private.

## Checks, cost and limits

Passed: two bounded SMTP authentication probes through the proxy, authenticated browser channel creation/sample send, original real digest pass, duplicate-send/window checks, user-confirmed inbox receipt, database preservation, five existing alert/signed-link test files with 95 passing tests, production preview build including TypeScript, health 200 and desktop/mobile channel rendering. No new implementation-mirroring tests were added. Application source is unchanged from v0.1.11; a complete local suite and separate lint run were not repeated. Final archive CI is inspected separately.

No AnyAPI/model HTTP call or new scan ran in this stage. The last reconciled cumulative provider spend remains $0.230851669 from the preceding X pilot; provider balances were not polled again here. No SMTP service fee was separately measured or added credit purchased. Existing local credentials and delivery metadata are not exported to CI.

The channel stays connected with Daily cadence, but scheduler/seeding and automatic invites remain disabled. This verifies manually dispatched delivery, not unattended recurring notifications. Sender/provider failover, live delivery-failure recovery, hourly cadence, public deployment, externally reachable app links/images and exhaustive mail-client/accessibility checks remain unverified. APP_URL still names localhost; successful delivery does not make those local resources public.

Configuration guidance: [SMTP setup](../SMTP_SETUP.md). Independent review and archive/CI outcomes are recorded after execution. The completed wizard is ephemeral; private operator files, receipt records and snapshots stay under ignored .local/acceptance/.
