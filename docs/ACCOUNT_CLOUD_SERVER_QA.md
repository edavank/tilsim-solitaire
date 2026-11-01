# Account, cloud and server candidate — not deployed

The account lifecycle candidate is prepared on the critical-fixes branch. It is not active in production. The leaderboard migration was exercised inside a rolled-back transaction on the existing database; the new deletion Edge Function has not been deployed or called against a real account.

## Changed behavior

- Account deletion calls a server endpoint which verifies the caller with Supabase Auth and hard-deletes only that verified identity. A body-supplied account or device ID has no authority. The app requires confirmation for the same account before acknowledging success or deleting local records. Failed server calls preserve local data. Once server deletion is confirmed, a durable marker allows local cleanup to resume without deleting the server account twice.
- Confirmed account cleanup removes the deleted account's local cloud backup, leaving other account backups and device/settings preferences intact.
- Partial local cleanup has a durable recovery marker. Coin writes are blocked until cleanup completes; failed deletion is no longer swallowed. Startup and login recover the interrupted cleanup before exposing a new account.
- Explicit progress resets carry a reset identifier. Old boards and completion requests cannot write into the new progress. Cloud sync does not silently restore pre-reset backups or replay pre-reset requests. Lost reset responses retry their existing receipt. A reset on another device requires an explicit save choice rather than silently merging the older balance back.
- Account adoption is serialized. Before exposing a different identity, the prior owner's local progress is preserved under that owner's backup and the working copy is cleared. Login/sign-out/deletion cannot race through the UI. Late sync responses cannot update the new account's UI state.
- New leaderboard rows belong to an authenticated account rather than a device string. Public score reads remain available. The score submission RPC reads that owner's synced progress; callers cannot provide authoritative score values or write score/ownership columns directly. Display-name changes are constrained to the caller's row. Guest gameplay continues locally; entering the protected leaderboard requires connecting an account.
- Historical leaderboard rows are preserved read-only and are not automatically claimed by a device ID. They are excluded from the new owned leaderboard. Account-linked rows cascade when their auth identity is deleted.
- Empty/unavailable leaderboard data is displayed as empty, not as fictional opponents. Weekly/monthly score semantics remain a separate open audit item.

## Verification completed

- 153 automated behavior/component tests passed locally, including server-handler and entry wiring with the Supabase SDK mocked.
- 12 database assertions passed under `authenticated`/`anon` roles in a transaction: server-derived score, denied direct score/owner writes and forged inserts, allowed own-name update, denied foreign-progress read/write and foreign-name write, allowed public score read, denied anonymous writes/RPC, and account-delete cascade through progress, receipts and owned leaderboard rows.
- After rollback, separate metadata checks confirmed that the added column/function and temporary fixture table were absent. No real player account was deleted, and no database security migration was retained.
- GameScreen initial render passes with native modules mocked; full application source parses without undefined identifiers or dependency initialization-order faults. Local tests do not replace phone or deployed-endpoint verification.

## Activation sequence and remaining checks

1. Test the candidate with the same native runtime as the currently installed production apps. The working app configuration targets 1.0.9, while existing 1.0.8 installations require their own compatible update target. Do not publish a 1.0.9-only update and claim it reached 1.0.8 users.
2. Review/deploy the deletion Edge Function and ownership migration together with the compatible client rollout plan. The migration intentionally rejects legacy anonymous leaderboard writes; old rows and game progress are preserved. Do not enable the migration alone and describe old score submission as compatible.
3. Verify the deployed Auth deletion endpoint using a specifically designated disposable test account, including expired credentials, transport failure and local-cleanup recovery. The SQL cascade test does not prove Auth Admin API behavior end-to-end.
4. Verify reset, account switching and cloud conflicts on physical Android and iPhone devices. The older 1.0.9(32) archive does not contain this candidate.
5. Only then consider a separate critical-fix update for current players. Keep the new design, logo/app icon, native dependency changes and store metadata for the later combined store submission.

Remaining limitations: native/platform integration remains unverified. If the server deletes an account but its response is lost before the app can persist confirmation, the app reports incomplete deletion rather than falsely confirming local cleanup; reconciling that case needs the deployed integration test and possibly an account-deletion receipt. Unowned historical leaderboard rows cannot safely be attributed/deleted by a client-supplied device ID. The new permissions protect ownership; they are not a complete anti-cheat system for a client-authored progress record. Ad reward delivery after process termination during a storage failure and other game-rule/scoring issues remain outside this change.

References: [Supabase server-side account deletion](https://supabase.com/docs/reference/javascript/auth-admin-deleteuser), [server-verified user](https://supabase.com/docs/reference/javascript/auth-getuser), [Expo runtime compatibility and staged testing](https://docs.expo.dev/eas-update/runtime-versions/).
