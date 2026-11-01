# Critical audit candidate — release held

This branch is a development candidate. It has not been merged, published as an Expo update, distributed through TestFlight, or submitted to either store. New visuals and level progression remain separate drafts. The existing 1.0.9(32) archive predates these deep-audit changes.

The audit found stale card selections creating illegal moves, initially blocked deals, unsafe save fallbacks, lost concurrent inventory updates, and login state being exposed before durable session verification. The candidate fixes those reproduced cases and adds strict saved-board validation, independent game-mode saves, cloud restore conflict guards, corrected daily reward streak calculation, and banner/rewarded-ad recovery.

Board actions now persist their resulting board and inventory/coin debit in one progress record. Undo, Joker, Resolve, Hint, Shuffle and coin-funded extra moves use this path. Revision guards reject pre-action autosaves; cleared runs have tombstones so delayed writes cannot restore them. Legacy board saves are read without deleting their source. Internal board records are excluded from cloud payloads. Undo preserves purchased extra moves and unlocked spaces. Failed sign-out keeps local progress intact. Timed and elapsed-play clocks pause during rewarded-ad presentation, tutorials and pause/tool overlays; overlapping pauses are counted once. Ad-earned extra moves and space unlocks use the durable board transaction. If their write fails, the same action can retry without another ad while the current screen remains alive. Entering a saved current level without a route parameter now generates that level's board rather than retaining the initial level-one board.

## Verification

- 127 automated behavior/component tests pass, including simulated restarts after tool writes, disk failures, double taps, stale autosaves, independent modes, session persistence and sign-out failures.
- 14 original fault reproductions no longer show their original violations.
- 75,000 extracted card-action calls across 500 layouts show none of the checked card-identity/move-budget violations.
- Earlier deal analysis: 161,000 starts had 59 instances of the detected initial-lock pattern; these became zero after repair. An independent 48,300 starts also had zero instances of that pattern.
- Application source parsing and a GameScreen initial render pass with native modules mocked.

These are bounded local checks, not proof that every level is solvable, balanced or free of bugs. They do not replace physical Android/iPhone tests or a database integration test. The action stress test does not execute delayed category-clear animation callbacks. No new native build was started for this candidate.

Run `node --test scripts/test-*.cjs`, `node scripts/verify-screen.cjs`, `node scripts/audit-source.cjs`, `node scripts/audit-actions.cjs`, and `node scripts/audit-reproduce.cjs` with project dependencies installed. The local standalone Babel runner can also be selected with `BABEL_STANDALONE`.

## Remaining release blockers

- Account deletion must remove the authentication identity through a verified server operation.
- Server ownership and permissions require a migration and cross-account integration checks.
- Reset/sign-out/account switching still need a complete recovery lifecycle; local reset must not silently restore the previous cloud backup.
- Ad reward retry state is currently in memory until the board write succeeds; forced process termination while storage is failing still requires server-backed reward delivery/reconciliation.
- Scoring/history restoration, category-clear callbacks and remaining rule inconsistencies need further review. Verify pause/ad lifecycle behavior on physical devices.
- Verify Google session persistence, all helper actions, cloud conflicts and ad recovery on physical Android and iPhone devices.

Do not merge or distribute this candidate until the remaining critical work and the subsequent gameplay/design changes have been reviewed with the owner. Build workflows are manual-only and contain no submission job.
