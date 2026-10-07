# Hark local setup

Use Node.js 24 and npm. Hark retains Lurk's Next.js, Clerk, PostgreSQL and Drizzle integration. The UI still follows the original baseline at this stage.

## Dependencies

From the repository root:

```sh
npm ci
```

npm 11 requires explicit approval for dependency install scripts. The root `package.json` pins approvals for esbuild and unrs-resolver; other scripts are not required for this setup.

## Local database

The upstream Docker Compose configuration remains available. This machine has no Docker, so the optional helper in `tools/local-postgres` runs persistent PostgreSQL 17 locally. It only listens on `127.0.0.1` and stores the cluster under the ignored `.local/postgres` directory.

Install the helper from its own directory:

```sh
cd tools/local-postgres
npm ci
cd ../..
```

The macOS ARM package's install script is approved in the helper's `package.json`. On another platform, review and approve the matching `@embedded-postgres` package's installation script before running it.

Copy `.env.example` to `.env` if no local environment file exists. Set `DATABASE_URL` to `postgres://hark:<local-password>@127.0.0.1:5433/hark`, and set `APP_ENCRYPTION_KEY` to 32 random bytes encoded as base64. Keep `RUN_SCHEDULER=false`; leave paid API keys blank during setup. Never commit this file.

Start PostgreSQL in a separate terminal:

```sh
node tools/local-postgres/start.mjs
```

Ctrl+C stops the process and retains the database. Run migrations from the repository root with the environment loaded explicitly:

```sh
node --env-file=.env --import tsx src/db/migrate.ts
```

## Clerk

The Clerk application is named Hark. Use the official Clerk CLI to authenticate, then link the existing project to the application selected in the Clerk Dashboard:

```sh
clerk auth login
clerk init --app <your-app-id> --no-skills
clerk env pull --instance dev --file .env.local
clerk doctor
```

Inspect CLI changes before accepting any scaffold modifications: this fork already contains `ClerkProvider`, `clerkMiddleware`, sign-in and sign-up routes, and server-side authorization. The setup used Clerk CLI 3.4.0; on this machine its verified official macOS ARM binary is installed at `~/.local/bin/clerk`.

Keep the publishable and secret keys in an ignored local environment file. The secret key is server-only. Do not include CLI credentials or environment files in an archive.

Hark's development instance uses email verification without requiring a phone number at sign-up. Apply the tracked partial configuration after linking your own application:

```sh
clerk config patch --instance dev --file config/clerk-development.patch.json
```

This patch is applied to Clerk's hosted configuration; the app does not load it automatically from Git. It changes only the phone sign-up fields. Email verification and existing phone sign-in/MFA settings are preserved. Refresh an open sign-up page after applying it. Clerk's SMS country allowlist is a separate setting; see the [official sign-up/sign-in options](https://clerk.com/docs/guides/configure/auth-strategies/sign-up-sign-in-options).

## Data and models

Set `ANYAPI_HOUSE_API_KEY` and `OPENROUTER_API_KEY` in the ignored `.env` file. Jev can use the same OpenRouter key as the generation model; a separate Gateway key is optional.

The upstream default, `meta/muse-spark-1.3-contributor`, returned a regional availability error on this machine. The following local override passed a real structured-output call through Hark's existing model adapter:

```dotenv
OPENROUTER_MODEL=qwen/qwen3-30b-a3b-instruct-2507
OPENROUTER_PROFILE_MODEL=deepseek/deepseek-v4.1-flash
JEV_MODEL=~typesafe/jev-latest
```

`OPENROUTER_PROFILE_MODEL` overrides only the fast/full product readings, their competitor identification, and the product brief. If blank, they use `OPENROUTER_MODEL`. Other generation calls keep `OPENROUTER_MODEL`; Jev still makes the lead decisions. The application defaults remain upstream; configure the overrides in your own environment.

The local DeepSeek configuration passed a real CapCut profile comparison. See [the measured comparison](model-evaluation/capcut-2026-10-07.md) for its cost, latency and observed limitations, including a later empty rebuild. Changing the environment does not rewrite stored profiles or evaluations: `buildProfile` writes a new profile, and a queued `rescore` job reconciles its stored verdicts. Verify the resulting product facts; schema validity alone does not establish useful content. The scheduler remains off during this operation.

An authenticated API key is not proof of available account credit or model access. Check a small actual model request before starting a scan. A balance endpoint can return 403 for a valid key; the actual model request is the decisive check.

For a local trial, keep `RUN_SCHEDULER=false` and `SCHEDULER_SEED=false`, and use a separate Node/tsx task process with `SWEEP_SCALE=small`. The upstream `smallSweep()` ignores this setting when `NODE_ENV=production`. Do not enable the standalone server's scheduler expecting a small scan. Give trial keys their own provider spending limits; the application's daily caps check recorded spend and are not atomic reservations for requests already in flight.

## Verification and development

With PostgreSQL running:

```sh
npm run check
npm run build
npm run dev
```

For the full suite on a busy local machine, use `npm test -- --maxWorkers=2 --testTimeout=30000`. The upstream defaults use a 5-second timeout and caused intermittent failures during concurrent setup/build work. This command changes execution limits only; it does not change the tests or business logic.

`next.config.ts` uses `output: "standalone"`. For a production smoke test after building, copy assets to the standalone output and run its server instead of `next start`:

```sh
cp -R public .next/standalone/public
cp -R .next/static .next/standalone/.next/static
HOSTNAME=:: PORT=3000 node .next/standalone/server.js
```

This Mac resolves `localhost` to IPv6 first and also uses a system HTTP proxy. Listening on IPv4 only broke Next's internal requests; listening on IPv6 only broke requests routed through the local proxy. `HOSTNAME=::` accepts both families here. Both `localhost` and `127.0.0.1` were verified.

The original test setup creates and migrates a sibling `hark_test` database and removes paid API keys from test workers. It does not use the development database for test fixtures.

Open `http://localhost:3000`. Verify the landing page, `/api/health`, sign-in and sign-up screens, then sign in with your own test account to inspect the empty workspace. AnyAPI, model calls, scanning and alerts require separate configuration and verification later.
