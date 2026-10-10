# ADR-0002: Execute requested public jobs in Netlify background functions

Accepted 2026-10-10. Keep Netlify Free and Neon Free for the personal test. A standalone background function executes an explicitly requested job using the original database runner, handlers, heartbeat and leases; successful initial discovery can continue with its backfill. Existing authenticated actions dispatch after queuing, and the worker independently checks a private shared secret and the configured owner. Scoped claim transactions use project advisory locks to serialize sibling checks across independent invocations. This avoids running the persistent scheduler inside short-lived serverless requests or draining unrelated queued work.

An AsyncLocalStorage context permits the dedicated personal-test worker to honor an explicit `SWEEP_SCALE=small`; ordinary production requests ignore that setting and the full default remains full. Publish the first worker with provider credentials absent and all paid caps zero. Hosting quotas and the cumulative provider-test budget remain separate.

A 202 is acceptance only; durable job state establishes completion. The invocation runs at most two jobs and checks elapsed time before backfill, but cannot interrupt a single handler before Netlify's 15-minute limit. Platform retries cannot immediately reclaim a live lease; recovery requires a later invocation after expiry. Recurring dispatch and automatic digests remain separate work. Wallet OAuth is deferred.

See [spec](../specs/public-worker.md), [platform evidence](../research/netlify-background.md) and [setup](../NETLIFY_SETUP.md).
