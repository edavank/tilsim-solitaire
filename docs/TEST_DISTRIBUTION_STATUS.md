# Test distribution status — 2026-11-01

Candidate commit: 307ab5c4835237b9017e836e5b0a392e364ef0d5, draft PR #4.

- iOS 1.0.9 (32) native build f226a6b6-5748-45b8-a312-481828b274e5 succeeded (4m21s). Standard EAS Submit succeeded; workflow completed in 6m43s. Apple processing completed. Build 1.0.9(32) was added only to the private Tılsım S2 Test external group and submitted for beta review. Verified status: Waiting for Review; 1 Tester / 1 Build. Automatically notify testers was enabled.
- iOS workflow: https://expo.dev/accounts/eda-vank/projects/tilsim-solitaire/workflows/01a19859-e022-7d33-94da-b4bd57077099
- Android R3 workflow: https://expo.dev/accounts/eda-vank/projects/tilsim-solitaire/workflows/01a19859-ed92-7cc0-b218-8e858aaefb27
- Earlier Android S2 workflow (pre-R3): https://expo.dev/accounts/eda-vank/projects/tilsim-solitaire/workflows/01a1984d-ead3-75a6-aa44-0bf725e38daf ; build 47e390a5-72d9-47d8-8d69-a22e3d7bc8a7 completed successfully (confirmed in Expo workflows).
- Private external group Tılsım S2 Test in existing App Store Connect app 6762220979 has one authorized tester. Do not use the old public external group. No usable invite claimed yet.
- Existing 1.0.8 (31) iOS archive compiled but Apple rejected the marketing version because its release train is closed. Fixed candidate version to 1.0.9. Do not retry the old archive.
- Expo doctor reported 17/18 checks passing, with a pre-existing Expo SDK/package mismatch: expo-apple-authentication expected ~8.0.8, found 7.2.4; nine other package versions also lag. This update does not change native dependencies. Native package upgrades need separate testing and a new binary.
- All 48 behavioral tests and GameScreen smoke render passed locally AND inside the iOS EAS build hook. Tests are mocked, not physical-device ad/auth/cloud verification.
- No S2/R3 production OTA or public store release. Main remains R2. QA runtime uses appVersion 1.0.9; any later OTA for existing 1.0.8 installations must explicitly target their compatible runtime from a release snapshot, rather than publish this QA runtime to them.

## User direction changed

The user asked to finish all planned fixes, game logic/balance and the approved visual redesign (including logo, cards, category symbols and in-game graphics) before another Apple/Google submission. Do not submit any further beta/store build without the user saying the package is ready. Pending beta review for 1.0.9(32) was removed using App Store Connect Remove from Review; final list status verified: Ready to Submit. Do not expire/delete the archive. Preserve code and test work. No live release was made.
