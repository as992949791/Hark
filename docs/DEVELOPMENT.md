# Hark development archive

Hark is based on [Lurk](https://github.com/getanyapi-com/lurk), under its MIT license. The selected upstream commit is `44834c83b8aa34f46f17b93806aa1588240d855e`.

## Version policy

Every completed development version is committed, tagged, and pushed to [as992949791/Hark](https://github.com/as992949791/Hark). Verify the remote branch and tag SHA before reporting that a version is archived. Record passed, failed, and pending checks separately. Secrets and local databases stay out of Git.

## v0.1.0-baseline — source and research archive

- Preserved the original upstream commit and code. Added the original site research, 20 screenshots, route inventory, and acceptance checklist under `docs/replica-baseline`.
- Renamed the personal fork to Hark. Page branding remains upstream until the original behavior is verified.
- Verified 645 file blobs, the source tree `6eec12d96acdb550c65dd6243a99fb21419ddd52`, and the signed original commit against GitHub records. Git transport stalled; the official archive and Git database objects restored a shallow checkout with the exact original commit.
- Retained origin and upstream remotes. The full older history can be fetched when Git transport is available.
- Research evidence: public pages and unauthenticated API behavior were observed; authenticated workflows were not tested. App dependencies, runtime, migrations, and tests are pending for the next version.

## v0.1.1-local-setup — local database and Clerk development setup

- Installed the upstream application's locked dependencies. Added pinned npm 11 install-script approvals without upgrading application packages.
- Added an optional persistent PostgreSQL 17 helper for this machine without Docker. Data and environment files are ignored by Git. Migrations passed; tests use the dedicated sibling database.
- Linked the existing Clerk integration to Hark using Clerk CLI 3.4.0. Development keys were pulled into local environment files, never committed. Clerk doctor confirmed the account, application and development keys. Registry update checks and shell completion remain optional warnings; production Clerk is not configured.
- Followed the provided Clerk setup instructions by placing ClerkProvider inside body and adding the `/__clerk/:path*` matcher. Retained existing sign-in/sign-up routes and per-page/server authorization.
- Passed: TypeScript, ESLint, production build, helper lockfile dry run, diff whitespace check, and checks that environment files, database data, dependencies and build output are ignored.
- Runtime: the standalone server requires its public/static assets. This Mac needs a listener supporting IPv4 and IPv6; the initial IPv4-only launch caused internal proxy failures. Both address families now return 200 for health and sign-up, and 307 to `/sign-in` for signed-out `/app/leads`. Browser verification confirmed the live Clerk registration form.
- Tests: the default full suite initially passed 883/900 and failed 17, mostly on the upstream 5-second timeout. A two-worker run passed 895/900 with five timeouts. Those five files were retested with one worker and a 30-second timeout: 62/62 passed. Final full-suite verification with `npm test -- --maxWorkers=2 --testTimeout=30000` passed all 96 files and 900 tests in 350.56 seconds. No test assertions or business logic were changed; the upstream default execution limits remain unchanged.
- Pending: the user's first Hark account and signed-in workspace verification, actual AnyAPI/model scans, email/chat alerts and production deployment. The scheduler and paid keys remain disabled during setup.
- Git archive transport: GitHub HTTPS Git connections failed on this machine. GitHub's Git database API uploaded committed objects instead; blob, tree, commit and annotated-tag hashes are checked against local Git before creating/updating refs.

## v0.1.2-email-signup — remove the mandatory phone step

- The user could not register with a Chinese phone number. The development Clerk instance required both email and phone at sign-up, including phone verification.
- Applied the partial configuration in `config/clerk-development.patch.json` to the linked Hark development instance: disabled phone use, requirement and verification at sign-up. Retained required verified email and the existing other authentication settings.
- Verified the patch against Clerk's instance schema, then read back the hosted configuration. Only the three intended phone flags and the generated config version changed. Clerk's fresh frontend environment reports phone `enabled=false`, `required=false`, `verify_at_sign_up=false`, and email `enabled=true`, `required=true`, `verify_at_sign_up=true`.
- Updated local setup instructions so this hosted configuration change can be reproduced. No application source, dependency or test changed; the 900-test suite was not rerun for this configuration-only fix.
- Pending: the user's refreshed sign-up attempt and first authenticated workspace. No SMS verification or message was sent by this fix.

## v0.1.3-brand-name — Hark in the shared header and page titles

- The user reported successful registration and reaching the new-project page, where the shared header still displayed the upstream name.
- Changed the shared `PRODUCT_NAME` to `Hark`, with its intended capitalization. The homepage and app header share Wordmark; page titles, accessible home labels, and other consumers of the brand constant now use Hark. Preserved the original layout, assets and upstream attribution.
- Passed: production build including TypeScript, ESLint for the changed module, Impeccable's scoped detector, and Git whitespace checks. The rebuilt homepage returns `Hark by AnyAPI` as its title, `Hark` as its wordmark, and `Hark home` as the accessible link label. Health returns 200 with `status=ok`.
- Restarted the local PostgreSQL and standalone application after the interrupted turn. The production server now serves the updated build. No database migration, authentication configuration or scan logic changed; the full business test suite was not rerun for this display-name change.

## v0.1.4-first-scan — real CapCut discovery and lead scoring

- The user authorized `https://www.capcut.com` as the first example, with a combined data/model budget of at most $1. Local operator keys remain in ignored environment files.
- Passed: live OpenRouter authentication, an actual Jev decision through Hark's adapter, AnyAPI balance authentication, and structured generation through the existing adapter with `qwen/qwen3-30b-a3b-instruct-2507`. Configured that generation-model override locally, preserving Jev for decisions and the upstream application defaults.
- Provider checks: the original Meta model and an OpenAI alternative returned regional availability errors. Two Qwen 3.5 variants did not pass the short connection probes (the Flash variant required a JSON instruction, then exceeded the probe deadline; the 35B variant exceeded the deadline). The selected Qwen3 Instruct model passed both the probe and the actual product/discovery flow. The new key's account-credit endpoint returned 403 despite successful model access; key authentication alone is not a credit check.
- Created the CapCut project for the single existing local user through `createProject`, then queued and ran the original `discovery_initial` and `backfill` jobs. These were operator verification commands, not a browser submission of the new-project form. Both jobs finished without errors. The pipeline persisted a product profile, search plan, 81 evaluations (27 qualified, 19 for review, 35 rejected), and 27 leads.
- Trial execution: scheduler and boot seeding stayed disabled. A separate Node/tsx process used the original small-sweep mode, ran the two watched jobs serially, and left no pending jobs. X and recurring scans were not enabled. Local daily stop thresholds were $0.40 each, Reddit requests were paced one at a time, and the verification process added $0.01 per-request AnyAPI price ceilings and a 6,144-token ceiling on generation responses. These checks complement provider limits; recorded-spend checks alone cannot reserve in-flight costs.
- Measured scan cost: 38 AnyAPI requests cost $0.017280; the scan's model ledger cost $0.020676. OpenRouter's cumulative key usage, including connection probes and timed-out requests whose local failure rows lacked bills, was $0.021274233. AnyAPI balance decreased by $0.017280. Combined observed cost was $0.038554233, below the authorized $1.
- Passed: the live feed queries against the populated project (4 leads in the opening 30-day window; 27 across all time, with 24 on the first page), fresh standalone health/home HTTP checks, and Git whitespace checks. Restarted the standalone application with current root environment files explicitly loaded. No application source, dependency or database schema changed; no build or full business-test rerun was needed for this documentation/local-configuration version.
- Pending: visual inspection of the populated feed in the user's authenticated browser and the new-project form's paid flow. Ego's separate browser session was signed out and handed back to the user; its cookies are not shared with the user's already authenticated in-app browser. Real scan data, private verification scripts, environment files and provider metadata were not committed.
