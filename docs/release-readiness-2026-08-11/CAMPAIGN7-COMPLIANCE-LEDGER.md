# CAMPAIGN 7 — compliance ledger (scope-corrected)

The founder's scope correction (2026-08-11) superseded the original
90-phase order and narrowed Campaign 7 to the POST-CAMPAIGN-6 RELEASE
DELTA, 15 workstreams. Evidence gathered before the correction is
preserved and cited; the mechanical 90-phase walk was stopped as
ordered and NOT resumed.

| WS | Workstream | Status | Evidence |
|---|---|---|---|
| 1 | Live build → current main upgrade | COMPLETE-IMPL | UPGRADE-MATRIX.md: live = local schema **v68** (versionCode 30, d97d513f), current = **v72**; `campaign7.upgrade.test.js` 36 tests green over the REAL migration pipeline on real SQLite. No data loss on any tracked category |
| 2 | Campaign 6 sync regression | COMPLETE-AUDIT | 110 sync-lane tests green: reinstall E2E (receipt ratchet, applied writer, tombstone carry, same-version ledger, provenance merge), applyRepeat, syncConflict, winbackState, sync/* , coachOutputReid, syncQueue |
| 3 | Production migration rollout | COMPLETE-AUDIT | PRODUCTION-MIGRATION-RUNBOOK.md: 134→132→133 → binary → RC6-6 preflight → 135; per-stage old-client effect proven; 049 HELD. **No production SQL run** |
| 4 | OTA / binary compatibility | COMPLETE-AUDIT | OTA-COMPATIBILITY.md: **BINARY ONLY**, two independent reasons (no OTA channel exists — `expo.modules.updates.ENABLED=false` in the built artefact; and the delta changes native config) |
| 5 | Release build sanity | COMPLETE-IMPL (Android) / BLOCKED-DEVICE (iOS) | ANDROID-BUILD-AND-16KB.md: real `assembleRelease` **BUILD SUCCESSFUL**, no debug/testOnly/cleartext, no dev-client leakage. IOS-BUILD-CONTRACT.md: config verified, compile is a Mac/EAS gate with 7 exact steps |
| 6 | Android 16 KB page size | COMPLETE-IMPL | **PASS, zero offenders** — all 40 arm64-v8a libs 0x4000-aligned in the real APK; `zipalign -c -P 16` verifies; `extractNativeLibs=false`. The two 4 KB expo-sqlite extras proven NOT packaged |
| 7 | Billing/trial regression | COMPLETE-AUDIT | 92 tests green (cascade lifecycle incl. the P-7 fail-closed pins, pendingCascade flush/retry, reconcile, restore, proGate). Trial copy audited: no 21-day conflation, no card-required claim, all 14-day claims true |
| 8 | Free/Pro regression | COMPLETE-AUDIT | P-8 pins green (Pro→Free renders no coaching card/chips; return to Pro restores from the same rows; history preserved); Adjust stays Pro (FQ-2), Repeat truthful for Free (P-6); campaign5.firstUse 172 green |
| 9 | Notification delta | COMPLETE-IMPL | NOTIFICATION-MATRIX.md (23 live surfaces). Fixed: sign-out cancel (F1, pinned), partner types budgeted (F3), `default` channel created (F2), channel description preserved (F9). **R-16 = HIGH POST-RELEASE**, not a blocker; FR-5 four control gaps with founder options |
| 10 | Known safety release questions | COMPLETE-AUDIT | SAFETY-RELEASE-QUESTIONS.md: D92-11 / R-3 / R-18 / RB6-2 all **CAN SHIP**, none blocks, recommended rulings recorded, nothing implemented |
| 11 | H4 store truth | BLOCKED-EXTERNAL | H4-STORE-CORRECTION-PACK.md: 6 Play + 3 Apple exact corrections, screenshot and declaration impact. **H4 PREP COMPLETE, NOT RESOLVED** — only founder console confirmation closes it |
| 12 | Changed-flow physical checklist | BLOCKED-DEVICE | PHYSICAL-DEVICE-CHECKLIST.md: 35 numbered checks over the changed surfaces only, Android/iOS split, expected result each |
| 13 | Genuine new release defects | COMPLETE-IMPL | 12 found and fixed (list in the final report), including one self-caught wrong finding reverted |
| 14 | Final gates | COMPLETE-IMPL | lint clean, identity invariant clean, full suite green, merged to main, gates rerun on merged main |
| 15 | Final release delta report | COMPLETE-IMPL | Delivered in-message (30 items) |

## Preserved pre-correction evidence

- SHIPPING-ARCHITECTURE.md — 18 findings; identity/secrets/flags CLEAN;
  the Android-via-Actions / iOS-via-EAS asymmetry
- PLATFORM-REQUIREMENTS-2026-08-11.md — official-source requirements
  with verification dates; **its "dead permissions" finding was WRONG
  and is corrected in place by the E6A guard** (see WS-13)
- NOTIFICATION-MATRIX.md — full inventory, channels, lifecycle, R-16,
  FR-5

## Deliberately NOT done (superseded scope)

The broad order's generic platform re-audits (device integrations,
runtime UX sweep, accessibility pass, data-safety/privacy matrices,
store-console checklist, five adversarial reviews, app-size and memory
passes) were stopped by the scope correction. Findings already
harvested from them before the stop are retained above.
