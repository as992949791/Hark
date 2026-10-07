# Development tools

Run from the repository root with Node 22.9+ (local verification uses Node 24), npm, Python 3 and an authenticated `gh` CLI. Install the main dependencies with `npm ci`; the existing PostgreSQL helper also needs `npm --prefix tools/local-postgres ci`. Put credentials in ignored root `.env` / `.env.local`. Shell variables take precedence, then `.env.local`, then `.env`.

## Start and verify

```sh
npm run dev:local
npm run preview:local
npm run verify -- --quick
npm run verify
```

`dev:local` checks the port, connects to the configured database (or starts the existing 127.0.0.1 helper), migrates it, then starts Next on both address families. `preview:local` also builds and copies public/static assets before starting the standalone server. Both force scheduler and seeding off and enable private profile capture. An occupied port fails; use `PORT=3001 npm run dev:local` to select another port. Ctrl+C stops processes started by the command; it does not stop an existing shared database.

Quick verification runs TypeScript and ESLint. Complete verification adds the existing tests with two workers / 30-second timeouts, then a production build. Existing test setup selects a sibling `_test` database and removes provider keys. It resets local trial sweep/cap overrides to the application defaults; cap-specific tests set their own limits. Verification disables tracing and scheduling. Development caps remain unchanged. Failure stops subsequent stages. Local data and generated files are excluded from lint.

## Provider connections through a local proxy

If the browser signs in but the server logs `api.clerk.com` connection timeouts and repeated authentication redirects, check Node network access before replacing Clerk keys. On Node 24+, set `NODE_USE_ENV_PROXY=1`, `HTTPS_PROXY` and `HTTP_PROXY` to your existing proxy in ignored `.env.local`; keep `NO_PROXY=localhost,127.0.0.1,::1`. Restart `dev:local` or `preview:local`: the proxy is read when the child Node process starts. An unavailable proxy must be started or removed from this local configuration. These settings are optional and do not change application keys or paid-call budgets. See the [Node 24 environment proxy documentation](https://nodejs.org/download/release/v24.20.0/docs/api/cli.html#node_use_env_proxy1).

## Capture and replay a profile

```sh
npm run profile:replay -- tests/fixtures/profile-trace.json
npm run profile:replay -- .local/profile-runs/<trace-id>.json
```

Local startup captures each fast/full page and its model attempts under ignored `.local/profile-runs/`. Files are mode 0600, directories 0700. Capture stores the supplied page, purpose, model, prompt, structured response or error name, and duration. SDK validation failures retain their invalid value or generated text, without copying provider headers or environment credentials. Even an empty page rejected before generation gets a trace. Capture failure logs a warning without failing the product analysis.

Replay uses the current profile analysis with saved responses, including its grounding and one content retry. It removes provider keys, blocks `fetch`, performs no scrape/generation requests and makes no project writes. It saves the resulting reading privately and prints the output path. A failed captured attempt is replayed as a failure; validation failures retain retry behavior. This reproduces analysis logic, not model quality or an older prompt implementation. Format version 1 requires `mode`, `page`, and ordered `calls` with `purpose` and a `response` or `error`. The checked-in fixture is synthetic; do not add real traces to Git. The original failed CapCut call predates capture and cannot be reconstructed from these tools.

## Archive a reviewed version

```sh
git add <reviewed-files>
npm run archive -- v0.1.7-dev-tools --dry-run
npm run archive -- v0.1.7-dev-tools "Standardize development tools"
```

First run the required verification and review. Stage specific reviewed files. Dry run validates the workspace without GitHub access. Archive refuses unstaged/untracked files and known environment, private, database, key and generated file paths (including already committed and unpublished intermediate trees), non-`codex/` branches and non-GitHub origins. It commits staged changes (or archives existing HEAD), creates an annotated tag, atomically pushes the branch/tag, and verifies remote commit and tag SHA equality. It uses configured Git credentials (`gh auth setup-git` if needed) and the macOS system HTTPS proxy with HTTP/1.1. No credentials are printed. Path guards do not detect arbitrary secrets hidden in ordinary source files; review staged content before upload. The remote branch must already have a baseline.

If interrupted, rerun the same command. Identical remote refs succeed; different tags, branches ahead/diverged, or refs changed during upload stop without force-overwriting them. Do not reuse a published version for different content. A `verified` archive confirms Git refs, not CI success: inspect the Check workflow separately. The workflow includes `codex/**` pushes and manual dispatch as well as main/PRs.

## Work intake

Use the configured GitHub labels and native issue dependencies. The [approved spec](specs/dev-tools.md) links the four tickets. Complete this tooling version before using `implement-spec` for independent product features; reviews run separately along Standards and Spec axes.
