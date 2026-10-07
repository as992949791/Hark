# Development tools standardization

## Problem Statement
Mechanical operator mistakes, manual startup/archive steps and missing profile inputs caused avoidable rework. The current development branch also bypasses the existing CI trigger.

## Solution
Provide supported commands for local startup, verification, private profile capture/replay, and resumable version archiving. Configure the repository's engineering skills and four approved GitHub tickets.

## User Stories
1. As a developer, I want one local startup command so database and app setup agree.
2. As a developer, I want an occupied port to fail clearly without stopping another process.
3. As a developer, I want preview to copy required assets automatically.
4. As a developer, I want local startup to keep the scheduler and seeding off.
5. As a developer, I want quick static checks and a complete verification command.
6. As a developer, I want the original profile page and model attempts preserved privately so failures can be diagnosed.
7. As a developer, I want to replay captured responses without provider access or project writes.
8. As a developer, I want archive to verify remote commit/tag hashes and resume after interruption without overwriting divergent refs.
9. As a developer, I want GitHub tickets with blocking relationships and automatic checks on development branches.

## Implementation Decisions
Reuse existing local PostgreSQL, Next, TypeScript, ESLint, Vitest and profile analysis. A caller-supplied structured generator is the minimal seam for replay; default callers retain the existing billed adapter. Trace capture is enabled by local tools and uses ignored files with restrictive permissions. Archive supports staged changes or an existing commit, uses the configured GitHub origin, annotated tags and atomic native Git pushes. Native Git transport works when explicitly given the macOS system HTTPS proxy; API object-upload reconstruction is unnecessary. Independent ticket implementation remains serial in this version.

## Testing Decisions
The approved interfaces are command-line behavior (exit status/output/files) and existing profile analysis functions. Test offline success and invalid output, process/port refusal, capture privacy, archive preflight/ref safety and retry/idempotence. Reuse the sibling test database and existing generation mocks. Run the full test suite once after scoped checks pass, plus build and local HTTP smoke checks.

## Out of Scope
New product features, paid model evaluation, broad architecture refactoring, production deployment and implement-spec parallel development.

## Tickets
- Spec: https://github.com/as992949791/Hark/issues/1
- Startup and verification: https://github.com/as992949791/Hark/issues/2
- Private capture and offline replay: https://github.com/as992949791/Hark/issues/3
- Archive and CI: https://github.com/as992949791/Hark/issues/4
- Integration acceptance (blocked by #2, #3, #4): https://github.com/as992949791/Hark/issues/5

The integration issue uses native GitHub dependency links. Each ticket is a native sub-issue of the spec. Implementation is serial in this version.
