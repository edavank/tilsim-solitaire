# Audit device test plan — no production rollout

The owner has authorized installing the account-deletion service and starting Android/iPhone testing. Do not publish an Expo update to production, merge the critical branch, submit an App Store version for public review, or release a Google Play build.

## Server installation observed

`delete-account` was deployed through the Tılsım Supabase dashboard. Its unauthenticated POST returned `401` with `{success:false,code:"AUTH_REQUIRED"}`. No account was deleted in this installation check. Legacy JWT verification remains enabled; authenticated test calls will determine whether the project's signing configuration is compatible. Do not disable authentication as a workaround.

The user created a disposable email/password Auth profile specifically for this test. Its password is user-controlled and must not be requested in chat, read, logged, committed, or forwarded. The test UI uses a reserved `tilsim.qa.*@example.invalid` address. Test-profile deletion is performed by the user from the test app after confirmation, not on any real player's account.

## Build isolation

- `audit_android`: installable APK, application ID `com.edavank.tilsimsolitaire.qa`, display name “Tılsım Test”. It installs beside the normal game.
- `audit_ios`: TestFlight test archive, existing iOS application ID. Installing it replaces the installed binary on that iPhone, so first record the normal profile's level/balance and verify its recoverable cloud/account state. Do not delete the normal profile.
- Both: update channel `audit-qa`, runtime `1.0.9-audit.1`, QA OAuth scheme `tilsim-solitaire-qa`, official test ad units. No production channel update is part of this workflow.
- QA settings expose a temporary email/password login. It is disabled in production configuration. The QA client refuses to delete a normal Google/Apple profile; only the designated disposable email profile is accepted.
- The build workflow builds only. iOS upload/testing is a separate test-only step; it must not submit the app for public release or add other test groups.

## Sequence after installation

1. Confirm the app is “Tılsım Test” and its QA marker is visible in Settings. Record build/version and starting test balance/level.
2. Sign in using the temporary test email/password in the QA panel. Do not share the password in chat. Verify the connected profile and cloud status.
3. Complete one level, use one helper, return home, close/reopen, and compare level, coins, inventory and board. Check airplane-mode save/recovery separately, then restore connectivity and sync.
4. Test the intentional reset only on the temporary profile. Confirm old progress does not reappear automatically after restart or sync; verify the second device detects the reset rather than merging old balances back.
5. On the temporary profile only, confirm account deletion. Verify success in the app, absence of the account and linked progress/receipts/owned leaderboard record on the server, no local backup resurrection, and failed login with the deleted test credentials.
6. Record actual outcomes separately for Android and iOS. Recreate another disposable test profile if a second independent deletion test is needed; do not reuse a deleted identity or test against a normal player.

Pending: build completion/distribution, exact QA OAuth redirect allowlist entry, additive leaderboard preparation for the compatible test client, authenticated deployed endpoint verification, and device acceptance. The full leaderboard permission cutover remains held until compatibility tests pass; the additive preparation must preserve legacy rows/writes while protecting newly owned rows.
