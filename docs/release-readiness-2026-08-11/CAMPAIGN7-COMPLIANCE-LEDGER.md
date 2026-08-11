# CAMPAIGN 7 — compliance ledger (scope-corrected)

The founder's scope correction (2026-08-11) superseded the original
90-phase order and narrowed Campaign 7 to the POST-CAMPAIGN-6 RELEASE
DELTA, 15 workstreams. Useful evidence from the broad order's opening
wave is preserved and cited; the mechanical 90-phase walk was stopped
as ordered. Statuses: COMPLETE-IMPL / COMPLETE-AUDIT / BLOCKED-FOUNDER
/ BLOCKED-EXTERNAL / BLOCKED-DEVICE / BLOCKED-LAW.

| WS | Workstream | Status | Evidence / remaining |
|---|---|---|---|
| 1 | Live build → current main upgrade | IN PROGRESS | Upgrade/migration lane in flight (UPGRADE-MATRIX.md + campaign7.upgrade pin suite) |
| 2 | Campaign 6 sync regression | COMPLETE-AUDIT | 110 sync-lane tests green hands-on (reinstall E2E 13, applyRepeat, syncConflict, winbackState, sync/* 55, coachOutputReid, syncQueue); receipt ratchet + applied writer + v72 re-id + tombstones + same-version ledger + guarded prefs all pinned |
| 3 | Production migration rollout | IN PROGRESS | Migration lane in flight; runbook to finalise from its old-client table; NO production migration run |
| 4 | OTA / binary compatibility | IN PROGRESS | Facts already established hands-on: expo-updates ENABLED=false in the generated manifest, no updates URL/channel anywhere (SHIPPING-ARCHITECTURE F-1) → no OTA route exists; formal verdict lands with the OTA lane |
| 5 | Release build sanity | IN PROGRESS | Release JS bundle exported clean (13.8 MB Hermes .hbc); local Android SDK installed and :app:assembleRelease running; iOS = config-audit + Mac gate (no Xcode in environment) |
| 6 | Android 16 KB page size | IN PROGRESS | node_modules prepackaged .so swept: only expo-sqlite/expo-av AARs carry arm64 libs, both 0x4000-aligned; the two 4 KB-aligned files (libsql/vec) are NOT packaged under this config (useLibSQL/withSQLiteVecExtension unset); full-artefact scan pending the local build |
| 7 | Billing/trial regression | COMPLETE-AUDIT | 92 tests green hands-on (cascade lifecycle incl. P-7 fail-closed pins, pendingCascade flush, reconcile, restore, proGate); billing lane doc in flight adds the platform-truth audit |
| 8 | Free/Pro regression | COMPLETE-AUDIT | P-8 pins green (blockAdvisor 17: Pro→Free no coaching card, return-to-Pro restores, history preserved); campaign5.firstUse 172 green (tier gates); Adjust remains Pro (FQ-2 pins); Repeat truthful for Free (P-6 pins) |
| 9 | Notification delta | COMPLETE-IMPL | NOTIFICATION-MATRIX.md landed (23 live surfaces); fixes landed: sign-out cancels the queue (F1, pinned), partner types budgeted (F3), 'default' channel created (F2), channel description kept (F9); R-16 classified HIGH POST-RELEASE with recommendation; FR-5 four control gaps with founder options |
| 10 | Known safety release questions | COMPLETE-AUDIT | SAFETY-RELEASE-QUESTIONS.md: D92-11 / R-3 / R-18 / RB6-2 — all four CAN SHIP, none blocks the update, recommended rulings recorded, nothing implemented |
| 11 | H4 store truth | IN PROGRESS | H4-STORE-CORRECTION-PACK.md in flight (billing/store lane); H4 remains OPEN pending founder live-console confirmation |
| 12 | Changed-flow physical smoke checklist | NOT STARTED | Assembles from lane evidence at close |
| 13 | Genuine new release defects | IN PROGRESS | Fixed so far (commit 4038026e): sign-out notification leak, package-visibility query intents (mailto/sms checks failed), camera permission string override, PII emails in binary, budget blind spots, channel hygiene, stale build display, undeclared dependency, false OTA claim, app-link scope |
| 14 | Final gates | NOT STARTED | After all lanes land |
| 15 | Final release delta report | NOT STARTED | The 30-item report at close |

## Preserved broad-order evidence

- SHIPPING-ARCHITECTURE.md (18 findings; Android ships via GitHub
  Actions prebuild+Gradle from MAIN, iOS via EAS; identity/secrets/
  flags CLEAN)
- NOTIFICATION-MATRIX.md (full inventory, channels, lifecycle, R-16,
  FR-5)
- PLATFORM-REQUIREMENTS-2026-08-11.md (in flight — official-source
  requirements; feeds WS-5/6)
- DEVICE-INTEGRATIONS.md (in flight — photos/backup truth, deep links,
  auth callbacks; feeds WS-12)
- SECURITY-PRIVACY.md (in flight — PII/logging sweep; feeds WS-13)
- RUNTIME-PLATFORM-AUDIT.md (in flight — device-gate items; feeds WS-12)
- BILLING-PLATFORM-TRUTH.md + store checklists (in flight — feeds
  WS-7/WS-11)
