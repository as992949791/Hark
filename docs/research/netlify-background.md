# Netlify background worker research

Checked against official documentation and source on 2026-10-10. This note does not verify a deployed worker, SMTP delivery, or paid provider calls.

## Feasible deployment shape

Netlify background functions are available on **credit-based Free**, and run for up to **15 minutes**. Prefer a standalone `netlify/functions/queue-worker.mts` with `export const config = { background: true }`. The legacy `-background` filename suffix remains supported. Do not copy the legacy Next.js `pages/api` configuration into an App Router route. [Background functions](https://docs.netlify.com/build/functions/background-functions/), [legacy Next.js API routes](https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/legacy-runtime/advanced-api-routes/).

Custom functions are detected in the functions directory during the same site build. Keep that directory outside `.next`, the current publish directory. OpenNext separately provisions the Next.js server handler and middleware. This supports adding a Node worker without a second server; actual build artifacts and deployed routing still need acceptance checks. [Function configuration](https://docs.netlify.com/build/functions/configuration/), [Next.js integration](https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview/).

Defaults: 1024 MB memory; synchronous functions 60 seconds, scheduled functions 30 seconds, background functions 15 minutes; background payload limit 256 KB. Keep a payload to identifiers and controls, with durable work/results in the existing database. Do not move the resident scheduler loop into a function or assume a scheduled function has the background timeout. [Function limits](https://docs.netlify.com/build/functions/configuration/#default-values).

## Acknowledgement, authentication, and retries

The platform immediately sends an empty **202**, discarding the handler return value. Thus a `Response` with status 401/400 returned inside a background handler cannot tell the caller that validation failed. A successful invocation response also does not prove the job succeeded. [Functions API: background mode](https://docs.netlify.com/build/functions/api/#background-mode).

For Hark, use a synchronous authenticated dispatcher when meaningful rejection/status is needed; still validate the worker's private invocation token before claiming any work. Avoid exposing a generic unauthenticated queue drain. Check completion in durable job state and correlate logs with job/request identifiers. This is an implementation recommendation inferred from the response contract, not a Netlify authentication feature.

Thrown invocation failures are retried after one minute and again two minutes later. Repeat invocation, timeout, and crash therefore require idempotent claims/side effects. Hark's existing `runClaimedJob` handles job errors internally; a finished failed job will not automatically become successful through a platform retry. A killed worker can only recover through an invocation after its heartbeat lease expires. These are distinct mechanisms. [Background retries](https://docs.netlify.com/build/functions/background-functions/); local source: `src/jobs/runner.ts`, `src/jobs/lease.ts`.

Bound each invocation by job count and elapsed time, and leave enough time before the hard deadline. An elapsed-time check between jobs cannot interrupt one long-running handler; provider timeouts or resumable batches need separate verification. Do not consume every existing due job during a deployment smoke test.

## TypeScript and dependency bundling

Netlify loads `tsconfig.json` from the functions directory, repository root, or base directory; TypeScript functions use esbuild. esbuild resolves `paths` during bundling, so Hark's existing `@/* -> ./src/*` alias can work without a runtime alias loader. Literal `import("@/lib/x/run")` is analyzable; computed package import paths may remain unresolved at runtime. [Netlify TypeScript](https://docs.netlify.com/build/functions/lambda-compatibility/), [esbuild paths](https://esbuild.github.io/content-types/#tsconfig-json), [esbuild dynamic imports](https://esbuild.github.io/api/#non-analyzable-imports).

A source-only bundle probe of `src/jobs/runner.ts` passed with the installed esbuild 0.25.12, Node target 24, ESM, root tsconfig, `bundle: true`, `write: false`: 624 inputs, 3,419,547 output bytes, no warnings, X runner included, no Next.js or Clerk inputs. It did **not** execute app code, connect to the database, load env files, or emulate Netlify packaging. Preserve this narrow dependency boundary; importing server actions/auth/UI helpers can introduce Next request-context assumptions. Native or computed-import dependencies may require explicit package/file inclusion. [Netlify's esbuild implementation](https://github.com/netlify/build/blob/main/packages/zip-it-and-ship-it/src/runtimes/node/bundlers/esbuild/bundler.ts).

## Routing and observation

Prefer the default `/.netlify/functions/queue-worker` endpoint initially. Setting `config.path` removes the default URL. OpenNext's generated server handler declares `path: "/*"`, `preferStatic: true`; do not assume a custom `/api/...` path bypasses that handler or Clerk middleware. Verify the deployed function name and endpoint explicitly. Edge functions can terminate the request before serverless functions. [Function routing](https://docs.netlify.com/build/functions/configuration/#routing), [OpenNext handler template](https://github.com/opennextjs/opennextjs-netlify/blob/main/src/build/templates/handler.tmpl.js), [request chain](https://docs.netlify.com/resources/troubleshooting/request-chain/).

Logs are available under **Cloud compute → Functions**, including background execution messages, with at least 24 hours of retention. Keep logs free of tokens, SMTP URLs, database URLs, raw provider responses, and personal content; persist job status rather than relying on logs as history. [Function logs](https://docs.netlify.com/build/functions/logs/).

## Free-plan operating limits

Free provides 300 monthly credits with a hard limit and no recharge. Background compute consumes 10 credits per GB-hour; at default memory a full 15-minute run is approximately 2.5 compute credits, excluding request/traffic/deployment costs. Each published production deployment consumes 15 credits. Existing site traffic shares this allowance. Keep automatic builds/schedules disabled until bounded tests pass; reusing a manual dispatcher first avoids accidental perpetual consumption. This credit estimate is calculated from the published rates, not observed account usage. [Credit pricing](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/credit-based-pricing-plans/).

The Free infrastructure allowance is separate from Hark's approved data/model budget. Deploying the worker must not silently enable provider keys, raise spending caps, or send another email as an invocation test.
