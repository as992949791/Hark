# Public test deployment

Ticket: [11](https://github.com/as992949791/Hark/issues/11). Setup: [Netlify and Neon](../NETLIFY_SETUP.md).

## Deployed configuration

- On 2026-10-10, both account consoles confirmed Free plans. No domain, paid infrastructure or upgrade was purchased. The application is available at `https://hark-as992949791.netlify.app` using Hark's existing Clerk development instance.
- Netlify deploy `6aca0497dbf40a61200a2ba5` published implementation commit `d2fa7d666bd8f54d04960e565a290b982efe28c8` at 09:27:06 UTC. The platform reported a successful 80-second build/deploy, with one Next.js function and one edge function.
- Only `as992949791/Hark` was selected for the Netlify GitHub App. The deployment branch is `codex/local-setup`. Production visibility is Public; previews remain Private. Subsequent automatic builds are stopped while acceptance records are archived, to avoid unnecessary credit consumption.
- Twenty-six project environment variables were saved and read back with matching values and Functions scopes. Scheduling, seeding and automatic invitations are false; all four paid caps are zero. Paid AnyAPI/OpenRouter/Gateway credentials were omitted. Cloud SMTP retains the existing credentials and TLS/timeouts, with the Mac's localhost proxy removed. No environment values appear in this report or Git.

## Data and checks

- Required an empty Neon database, backed up the local database privately, applied the existing Drizzle migrations, and copied all 38 public tables in foreign-key order in one transaction. All 4090 rows compared equal after using the same SQL timezone and canonical JSON key ordering. This includes one user, two projects, 33 Reddit leads, two X leads, one Daily email channel and the original three unstarted successors. API-key and wallet-connection tables are empty.
- The first raw row comparison flagged a timezone representation difference in `reddit_authors`. The follow-up comparison normalized the database session timezone and JSON key order and verified every copied value; it did not rewrite source or target data. Local data remains intact. Backups, connection strings, environment metadata and browser captures are ignored private artifacts.
- Anonymous HTTPS checks passed for `/` and `/api/health`, with health JSON `{ "status": "ok" }`. Signed-out `/app/leads` redirects to `/sign-in`; unauthenticated REST project and lead access returns 401. Both `/.env` and the private artifact path return 404. The browser rendered “Sign in to Hark” and Clerk's Development mode indicator.
- Local TypeScript, ESLint and Git whitespace checks passed. The full local suite was not repeated for this hosting configuration/documentation change. GitHub Check [38041246761](https://github.com/as992949791/Hark/actions/runs/38041246761) passed on the deployed implementation, including tests and production build. Netlify separately built and published that same implementation.
- The first provider repository pull failed before building because GitHub App access was not connected. The user installed the app for Hark; linking that installation through Netlify resolved the clone error. A first Free-plan environment API call requested paid-plan granular scopes and was rejected; saving Free-plan variables with their default scopes succeeded. Operator corrections did not change application business logic or purchase an upgrade.

## Authenticated acceptance and remaining limits

- The user completed login on the public hostname with the existing Clerk account. The project switcher showed CapCut and Cal.com. CapCut rendered 24 Reddit leads, two X leads with details, the saved product profile and the original Daily email channel/last-sent time; Cal.com rendered its nine-lead total and existing feed. The initial landing was the new-project route, but switching selected the existing projects; no project was created. Two browser waits used labels that did not match a standalone element and timed out; DOM inspection confirmed the feeds had loaded, and subsequent waits used the visible feed content. Desktop and 390px mobile X pages rendered the saved leads; the mobile document width equaled its viewport width. The Free-plan Netlify badge is visible. No scan, profile rebuild, lead-status action or Send test control was used.
- SMTP credentials are configured, but authentication from the deployed function and cloud email delivery have not been tested. No third notification was sent. The earlier local inbox confirmations do not verify cloud SMTP.
- The original persistent scheduler stays off. Manual cloud background execution is not yet connected; this release supports existing data/settings, while new paid analysis, queued scans and automatic digests do not run. Large/recurring workloads and formal Clerk production deployment remain unverified.
- This stage made no paid data/model requests. The last reconciled cumulative provider spend remains $0.230851669 of the original $1 authorization; balances were not polled again. Free hosting still has resource quotas and can pause when exhausted.

Independent review, archive references and final CI are recorded separately after completion. Ticket 11 remains open until its outstanding acceptance checks are addressed.
