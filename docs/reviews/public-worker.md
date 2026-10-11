# Public background worker review

Baseline: `v0.1.13-public-test`. Two independent existing Astra agents reviewed Standards and Spec separately.

At `195d5936398fd98cf1cfffc220ab4ad0b2a13ad3`, Standards identified one P3: persistent architecture decisions needed a numbered ADR under the configured domain rules. ADR-0002 records the chosen background runner, scoped claims, explicit async small-sweep context and timeout/recovery limits.

Spec identified four P2s: the Product scan button missed dispatch; saving unchanged facts could not retry a failed brief dispatch; new-project retry could duplicate a project; and rebuild retry could repeat paid profile generation. The fixes dispatch the missing entry point and retain queued job/project identities, including owner and URL checks on creation retry. Tab opens also redispatch their unstarted jobs. Database regression tests assert job/project counts, profile version, paid-generation invocation count and foreign-owner refusal.

Both re-reviews at `73297a448c146b0162a97b770aed80916b2e1a40` returned zero remaining findings. Final local full verification subsequently completed with 953 tests in 101 files, TypeScript, ESLint and production build passing. Reviews did not access private credentials/evidence or independently perform cloud/paid acceptance. Deployment and later business verification are separate from the code review.
