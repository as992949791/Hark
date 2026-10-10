# Public test deployment review

Baseline: `v0.1.12-smtp-alerts`. Configuration implementation: `d2fa7d666bd8f54d04960e565a290b982efe28c8`.

Two independent existing Astra review agents reviewed Standards and Spec separately. The first Standards review found one P2: build environment defaults must not be presented as proof of Functions runtime configuration. The correction explicitly lists all seven scheduler/invitation/budget controls, requires both Builds and Functions scopes and saved-value checks, and states that TOML alone does not configure runtime. Actual project variables were independently read back with matching values and Functions scopes.

Both configuration re-reviews returned zero remaining findings. No unrelated business code changed. Live deployment, data copying, public access and authenticated acceptance and the pending cloud SMTP/manual-worker checks are recorded in [acceptance](../acceptance/06-public-test.md); configuration review alone does not verify them.

The acceptance-document reviews at `41ef2746a7d6acdc6d52c36f24279bee78cb6b9b` each found the same P3: this review record still called login pending after the user had completed it. The wording above now matches the acceptance report; Both independent re-reviews at `28b7fc2f6c2690c08ae242deff99c1fc55f46c98` returned zero remaining Standards and Spec findings. Reviews checked committed files and the original visit-update behavior; they did not independently access private cloud evidence.
