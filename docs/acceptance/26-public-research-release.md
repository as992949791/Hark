# Publish the Hark research release

2026-10-18, [issue 23](https://github.com/as992949791/Hark/issues/23). The user requested publication of the reviewed research release to the existing public test site. No application source, authentication integration or business behavior was changed for this deployment.

## Published identity

- Site: [hark-as992949791.netlify.app](https://hark-as992949791.netlify.app/).
- Netlify production deploy `6ad4692042cd5bb4b42b53ea`, build `6ad4692042cd5bb4b42b53e8`, published at **2026-10-18 06:38:44.789 UTC**.
- Exact deployed commit: `d6cd1b6574fca6216744a69b8c710bb191af6058`, tag `v0.1.36-demand-quality`, branch `codex/local-setup`.
- [Exact-source Check 39103231587](https://github.com/as992949791/Hark/actions/runs/39103231587) had already passed 1126 tests / 111 files, TypeScript, ESLint, dedicated test migrations and production build. The original source's independent Standards/Spec reviews remain applicable. Netlify separately applied migrations and built this same commit; no duplicate local full test/build or source-review cycle was added.
- Provider readback reports `state=ready`, `context=production`, the exact commit and the published deploy ID. Automatic builds were restored to stopped after this single deliberate release, before documentation was archived. No main push, Azure deployment or second Netlify documentation-only build was triggered.

## Configuration and database

The account still reports Free, with 56.2660637236 included credits available before publication. No new plan, domain, add-on or infrastructure purchase was made. One production build consumes the existing plan allowance; no claim of unlimited hosting is made.

An old saved deployment token returned 401 for privileged API reads. The existing Netlify browser login remained valid. Current browser resource URLs established its same-origin authenticated API proxy; deployment used that session rather than asking for a new login or creating a new API credential. An initial desktop helper assumed an active system proxy; its ignored operator-only fallback was corrected. A local-storage session marker was not a usable bearer credential and was not exported. No session cookie/token or environment value was printed or committed.

Cloud settings were saved and read back with Builds and Functions scopes. Research visibility is enabled; research live execution, background worker, scheduled worker, persistent scheduler, boot seeding and automatic invitations are false. All four data/model daily caps are zero, and AnyAPI/OpenRouter/Gateway paid credentials remain absent. Existing Clerk, app encryption, database and SMTP settings were preserved. The previous background switch was true despite the paid caps; it is now explicitly false. No live scan, model call, email or Webhook was invoked during acceptance.

A private read-only transaction backed up the actual existing Neon database before deployment: 38 public tables / 4857 rows, including one user, three projects, 50 Reddit leads, three X leads and 19 jobs. The configured cloud database identity matched the backup target. This was the existing cloud dataset, not an empty database restore.

Netlify applied additive migrations 0040–0043: four demand tables, job/ledger associations, saved result artifacts, assessment JSON and source-run provenance. The database now has 42 public tables / the same 4857 application rows and 44 applied migrations. Before/after comparison projects each original row onto its original columns, preserving all prior values; only expected user/X page-visit timestamps are allowed to vary during browsing. No original job lease/status is exempted. New demand tables are empty. Local research records were not copied into or substituted for cloud data.

## HTTPS acceptance

Anonymous checks on the published site:

| Path | Result |
| --- | --- |
| `/` | 200, Hark page |
| `/api/health` | 200, `status=ok` |
| `/sign-in` | 200 |
| `/app/research` | 307 to `/sign-in` |
| `/api/v1/projects` | 401 |
| `/.env` | 404 |
| `/.local/deployment/neon.env` | 404 |

## Authenticated browser acceptance

The public Clerk session had expired. Normal Google sign-in reused the existing account, selected the already signed-in Google identity and returned through Clerk to the existing CapCut workspace; no password, OTP, new user or authentication bypass was needed. The existing CapCut rail still reports 24 Reddit leads and two X leads, and the saved feed renders.

The authenticated `/app/research` route renders the new Hark research shell, product/topic inputs, saved-product selector, history and honest empty state. Its submit control is disabled and explains that new research is not enabled. Desktop and 390px mobile captures were inspected; mobile document width equals 390px. The cloud has no demand runs, so no local result was shown as a cloud run. A final read-only database comparison after browsing again preserved all original values apart from allowed visit timestamps, with the same 4857 application rows and empty research tables.

Configuration readback matches every verified environment value/scope. The public site continues to use the existing Clerk development instance and generated Netlify hostname, so this remains the personal test environment. Bounded source/model verification from [the preceding release](25-demand-quality.md) does not claim live paid execution on this new deployment. Raw backups, environment snapshots and browser captures stay private and ignored. Documentation-only archive checks cover links, whitespace and remote Git identity; the already-passed exact application-source CI is reused rather than starting another full application test/build cycle.

After the completed browser checks, a final attempt to leave the result tab open found TaskSpace 2 unavailable. No new browser space or substitute session was created; the earlier captured page/authentication checks remain the acceptance evidence, and no claim is made that the tab remained open.
