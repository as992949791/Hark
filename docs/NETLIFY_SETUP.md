# Free public test deployment

Hark uses Netlify Free for the Next.js application and Neon Free for PostgreSQL. Use the generated `netlify.app` address for personal testing. Keep both accounts on Free; no domain or infrastructure purchase is needed. Netlify Free has a monthly credit limit and pauses service when exhausted rather than automatically charging for more credits. See [Netlify billing](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/credit-based-pricing-plans/) and [Next.js support](https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview/).

## Application and data

Connect only the `as992949791/Hark` repository through Netlify's GitHub App. Select `codex/local-setup`, which contains the archived Hark changes; the upstream-derived `main` branch is not the deployment source. The checked-in `netlify.toml` applies existing Drizzle migrations before building Next.js. Netlify installs its Next.js adapter automatically. Do not upload the workspace folder: it contains ignored credentials, backups and private captures.

Configure these variables in the Netlify project's environment settings, outside Git:

- `DATABASE_URL`: Neon's pooled PostgreSQL connection string with TLS required.
- `APP_URL`: the HTTPS address of this deployment.
- `APP_ENCRYPTION_KEY`: preserve the local value when copying existing encrypted settings and signed-link identity.
- `CLERK_SECRET_KEY` and `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`: the existing Hark development instance.
- `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in`, `NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up`, and both Clerk fallback redirect variables set to `/app/leads`.
- `SELF_HOSTED=true`, `X_LEADS=true`, `X_REPLIES=true` to preserve the tested application mode.
- Optional `SMTP_URL` and `ALERTS_FROM_EMAIL` from [SMTP setup](SMTP_SETUP.md). Remove the desktop's localhost proxy parameter from the cloud SMTP URL. Cloud connectivity must be checked separately.

The host's default address uses Clerk development keys, so this remains a public **test** environment, with Clerk development behavior. A formal Clerk production instance needs a suitable custom domain. See [Clerk environment guidance](https://clerk.com/docs/guides/development/managing-environments). Preserve existing Clerk identity IDs when copying users and projects.

Before copying data, make a private local backup and require the cloud database to be empty. Apply the existing schema, copy data in foreign-key order within one transaction, then compare every copied table's rows using the same database timezone. Do not restore over an existing cloud dataset. Backups and connection strings stay under ignored `.local/`, with owner-only permissions.

## Background work and cost

Set `RUN_SCHEDULER=false`, `SCHEDULER_SEED=false`, `ALERT_INVITES=false`, `HOUSE_DATA_CAP_USD_PER_DAY=0`, `HOUSE_LLM_CAP_USD_PER_DAY=0`, `HOUSE_X_DATA_CAP_USD_PER_DAY=0` and `HOUSE_X_LLM_CAP_USD_PER_DAY=0` in the Netlify project's environment settings for both builds and Functions. The TOML values are build defaults; they do not establish function runtime configuration. Check the saved variable scopes and values before deployment. The initial web deployment omits paid provider credentials. This runtime configuration disables the original persistent scheduler; serverless hosting alone does not disable it. Queueing a scan does not mean it has executed, and a saved Daily email channel does not mean automatic delivery is active.

Manual background execution is a separate integration step. Until it is connected and verified, this deployment supports inspecting existing data and settings, while paid generation, scanning and automatic notifications remain disabled. The original cumulative $1 provider-test budget is separate from free hosting and is not reset by deployment.

Only deliberately requested release builds should be published during initial testing. Stop automatic builds while changing configuration or archiving acceptance documents, then trigger a build of the selected commit explicitly. Each build consumes free-plan resources. Record the deployed commit, checks, limitations and remote archive in `docs/DEVELOPMENT.md`; a Git push or green CI alone does not prove the website is deployed.
