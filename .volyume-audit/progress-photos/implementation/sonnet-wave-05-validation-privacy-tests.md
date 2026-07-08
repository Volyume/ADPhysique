# Sonnet implementation wave: Validation, privacy, and tests

## Source docs

Read IN FULL first:
1. `.volyume-audit/progress-photos/blueprints/safety-privacy-blueprint.md` (§6, governing here)
2. `.volyume-audit/progress-photos/blueprints/scoring-accuracy-and-validation-blueprint.md`
   (§10 Tier 1, §11 test matrix)
3. `.volyume-audit/progress-photos/evidence/scout-06-storage-privacy-reliability-tests.md`
4. `.volyume-audit/progress-photos/phase-1-evidence-gaps.md` (§4, §5)
5. `CLAUDE.md` (especially the migrations and Supabase rules)

## Goal

Make the privacy promise byte-level true and close the reliability test gaps: EXIF stripping,
iOS backup exclusion, per-user wipe scope, DST/day-grouping tests, and Tier 1 validation harness
support. Nothing else.

## FOUNDER GATES (must be answered before build)

- Per-user wipe scope (evidence-gaps §7 Q5): recommended scope-to-account on sign-out/delete;
  whole-directory only for full local resets. Confirm before changing wipe semantics — this is
  destructive-path code.
- Stale-artefact cleanup timing (safety blueprint §6.7): deleting the dead `progress_photos`
  table from `supabase/schema.sql`/`setup_complete.sql` snapshots and correcting
  `docs/BUDGET_POSTURE_LOCKED.md`'s photo section need founder sign-off (locked/stale docs).
  If not granted, add clarifying header notes instead and record the decision.

## Current evidence

- Photos: `documentDirectory/progress_photos/users/<safeUserId>/<epochMs>.jpg`
  (`src/lib/progressPhotos.js:16-27`); `saveProgressPhoto` does a byte-for-byte
  `FileSystem.copyAsync` (~line 88) — EXIF/GPS in a picked original would persist (scout 6).
  Camera captures (`ProgressGhostCapture.js`, `takePictureAsync({ quality: 0.92 })`) also do not
  explicitly strip. `exif: true` is never requested anywhere (JS objects clean; files unproven).
- iOS backup: no `NSURLIsExcludedFromBackupKey` usage in the repo; documentDirectory is included
  in iCloud/iTunes backups by default. Android `allowBackup=false` already set.
- Wipe: `wipeAllUserData` (`src/lib/database.js:4125-4260`) deletes the three photo/scan tables
  (FATAL-on-failure set, ~4119-4123) and calls `wipeProgressPhotoDirectory()` which deletes the
  ENTIRE `progress_photos/` tree (all users) — cross-user blast radius, untested for two users
  (scout 6). Owner-marker read gating is per-user and fail-closed
  (`markPhotosOwner`/`photosViewableBy`, `progressPhotos.js:114-148`).
- Day grouping: `progressPhotoTimeline.js:32-35` uses device-local Date getters, does not reuse
  `src/lib/dayKey.js`; no DST/timezone tests (scout 4).
- Validation assets that exist: founder-gated calibration export
  (`progressScanCalibrationAccess.js`, `progressScanCalibrationExport.js` — export contains no
  photo names/paths, tested), replay/calibration scripts in `scripts/`
  (`run-progress-scan-replay.cjs`, `run-progress-scan-calibration-report.cjs`, etc.),
  `progressScanCalibrationCorpus.test.js`, and `docs/progress-scan-validation.md` (named by
  scouts, never opened — READ IT FIRST and reconcile this wave's harness work with it).
- Privacy copy is source-pinned by `src/screens/__tests__/privacyTruth.guard.test.js`.

## Files/areas likely involved

- `src/lib/progressPhotos.js` (save path re-encode; per-user wipe scope; backup exclusion)
- `src/components/ProgressGhostCapture.js` / capture call sites (if strip happens at capture)
- `expo-image-manipulator` is the natural re-encode tool — CHECK `package.json` first; if it is
  not already a dependency, STOP and ask the founder before adding it (CLAUDE.md dependency
  rule). `expo-file-system` metadata APIs for backup exclusion; if a config-plugin or native
  touch is needed for the iOS attribute, spec it and ask rather than ejecting anything.
- `src/lib/database.js` (`wipeAllUserData` call into a scoped wipe)
- `src/lib/progressPhotoTimeline.js` tests (DST) — code change only if a real bug is proven
- `scripts/` replay harness (Tier 1 support: test-retest and sensitivity fixtures)
- Colocated `__tests__`

## Requirements

1. **EXIF strip**: every progress photo (camera capture and library import) is re-encoded on
   save so the stored JPEG carries no EXIF/GPS/maker metadata. Verify by reading bytes in tests
   (fixture JPEG with GPS tags → saved file has none). Visual quality preserved (reuse the
   existing quality settings).
2. **iOS backup exclusion**: the `progress_photos/` directory (or each file) carries the
   exclude-from-backup attribute; applied on directory creation and healed on app start for
   existing installs. Document the mechanism chosen; do not eject.
3. **Per-user wipe scope** (founder-confirmed): `wipeAllUserData(userId)` wipes
   `progress_photos/users/<safeUserId>/` only; a full local reset path (if one exists distinct
   from account wipe) may keep whole-directory semantics. FATAL-on-failure semantics preserved.
   Two-user test: seed A and B, wipe A, B's photos intact, A's gone, DB rows scoped correctly.
4. **DST/day-grouping tests**: add timezone/DST-boundary tests for photo local-day grouping (use
   the house pattern from `mesocycle.f10.dst.test.js`). Fix grouping only if tests prove a bug;
   otherwise tests pin current behaviour.
5. **Tier 1 harness support**: extend the replay/calibration scripts with (a) a test-retest
   fixture format (same subject, repeated captures) reporting per-tier score spread, and (b) a
   single-factor sensitivity fixture format (lighting/distance/clothing/tilt variants) reporting
   which reason codes fired. Scripts only; no app code. Reconcile with
   `docs/progress-scan-validation.md` and report any contradiction between that doc and this
   blueprint set.
6. **Copy truth**: if any privacy copy needs updating to reflect the hardening (e.g. backup
   behaviour), update copy and `privacyTruth.guard.test.js` together.

## Acceptance criteria

- [ ] Founder decisions (wipe scope, stale-doc handling, any new dependency) recorded and
      followed exactly.
- [ ] GPS-tagged fixture in → EXIF-free bytes out, both capture and import paths (tests).
- [ ] Backup-exclusion attribute verified on the photo directory (test or documented manual
      verification if the attribute is not readable in Jest; then it goes on the device
      checklist).
- [ ] Two-user wipe test green; fatal-on-failure semantics unchanged
      (`wipeAllUserData.test.js` extended, not weakened).
- [ ] DST tests green; any grouping fix evidenced by a failing-then-passing test.
- [ ] Test-retest and sensitivity harness runs documented with sample output.
- [ ] `docs/progress-scan-validation.md` reconciliation reported (agreements and contradictions).
- [ ] No photo/scan data gains any sync/cloud path (`progressPhotoMetaNoSync.guard.test.js`
      untouched, passing).
- [ ] `npm run lint && npm test` output reported verbatim.
- [ ] Manual device checklist (Android EAS build + iOS TestFlight where relevant): import a
      GPS-tagged photo → export/inspect via the debug path to confirm no location data; sign out
      of account A on a two-account device → account B photos intact; iOS: verify backup
      exclusion per the documented mechanism.

## Tests required

EXIF byte tests; two-user wipe; DST grouping; backup-attribute check (where feasible);
harness smoke tests for the new script modes; updated privacy-truth pins.

## Safety rules

No shame, no score chasing, no body panic, no false certainty. Wipe-path changes are
destructive-adjacent: every branch tested before merge; when in doubt about a deletion
behaviour, stop and ask.

## Coach rules

Do not touch Coach/check-in integration. No changes to coach, engine, or check-in files.

## Do-not-overbuild warnings

- No at-rest photo-file encryption (premium later; explicitly out of this wave).
- No retention/auto-expiry feature (premium later).
- No thumbnails.
- No cloud anything. Supabase migrations are not needed by this wave; if you believe one is,
  stop and ask (cloud migrations are founder-run and manual, per CLAUDE.md).
- Backup exclusion via supported Expo/config-plugin means only; never eject.

## Forbidden changes

- `SYNC_REGISTRY` and the no-sync guard test; ED-safety system; scoring engine maths; billing/
  tier/identity/notifications; `supabase/migrate_*.sql` (nothing here needs the cloud);
  `main` branch. No new dependencies without an explicit founder yes. No attribution in commits.

## Final response format for Sonnet

1. Files changed (paths + one line each).
2. Tests run (exact commands + verbatim result lines).
3. Acceptance checklist with pass/fail.
4. Remaining risks (bullets, honest) including the validation-doc reconciliation.
