# Hark development rules

Hark is a personal project based on the Lurk fork. Preserve the upstream MIT license and attribution.

- Think before coding: state material assumptions, surface tradeoffs, and ask when blocked by ambiguity.
- Keep the implementation simple. Do not add speculative features or unnecessary abstractions.
- Make surgical changes. Do not refactor unrelated code or alter the baseline design during setup.
- Define a short plan with verifiable outcomes. Run checks appropriate to each change.
- Archive every completed development version in GitHub: commit the changes, add an annotated version tag, push the branch and tag, and verify the remote SHA.
- Record exactly which checks passed, failed, or were not run in docs/DEVELOPMENT.md. Do not call an incomplete setup verified.
- Never commit environment files, credentials, database files, local caches, or node_modules.
- Use codex/ as the branch prefix. Keep origin pointed at as992949791/Hark and upstream at getanyapi-com/lurk.
- Run database tests against the dedicated test database. Keep the scheduler disabled during setup and tests.
- Ask for a concrete scan budget before performing paid data/model calls.
- Preserve existing Clerk auth integration. Do not scaffold a replacement application over this fork.
- The user permits Astra for code review. Do not delegate unrelated work without authorization.

See docs/DEVELOPMENT.md for the version log and docs/LOCAL_SETUP.md for setup.
