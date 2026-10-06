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
