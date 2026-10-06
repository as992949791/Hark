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
