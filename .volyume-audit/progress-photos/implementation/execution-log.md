# Progress Photos / Image Scoring — Execution Log

Lead: Fable (main loop). Implementation agents: Sonnet (per wave). Run date: 2026-07-08.

## Starting state

- Branch: `claude/codebase-audit-docs-pv6mjd`
- Starting commit: `e1fa8a9` (audit-doc commits on top of audited app commit `0025e07`)
- Working tree: clean (no dirty files)
- Codex coordination check: `git log 0025e07..HEAD -- src/ modules/ assets/` is EMPTY; the last
  Codex touch on `src/lib/progressScanCoachResolver.js` was `883b772`, which PRECEDES the audit
  commit `0025e07` and is therefore already reflected in the saved audit. No in-flight collision.

## Founder approvals (given in the execution instruction, 2026-07-08)

1. **F1 anchor clamp**: audit-recommended option (a). Clamp the provisional regressor anchor to
   +/-8 points; cap confidence at Moderate when the anchor engages; reflect engagement in the
   confidence/receipt language; no wild visible-score swings from the provisional regressor.
2. **Coach card**: the display-only "Progress photo context" card is CONFIRMED as approved
   current state, under strict display-only constraints (no targets/calories/macros/refeeds/
   diet breaks/training/check-in influence; low-confidence and withheld scans behave like absent;
   all proven by tests). Wave 4 hardens; it must not expand.
3. **Priority**: scoring trust first; coach/check-in context work last.
4. **Current-state fact**: scans are NOT a decision input for Coach/check-ins; any hidden
   dependency found is a bug to remove/guard.
5. **Safety stance**: no shame, no body panic, no score chasing, no overconfident body-fat
   claims, no fake AI certainty, no hidden coaching changes from scans, no red/green judgement,
   no streak pressure.
6. **Decision authority**: Fable may apply the saved blueprint's recommendation where there is
   ambiguity; stop conditions limited to the founder's listed cases.

## Wave order (decided by Fable)

`1 → 2 → 3 → 5 → 4`, strictly sequential.

Reason: waves 1, 2 and 3 all touch `src/screens/ProgressPhotosScreen.js` (conflict risk rules
out parallelism); wave 5 touches `src/lib/progressPhotos.js`/`database.js` which wave 2 may
brush (origin marker) so it follows 3; wave 4 runs last per founder priority 3 and because its
guard tests should pin the final shape of the scoring surfaces. This matches the founder's
preferred order.

## Fable decisions (blueprint-recommendation authority)

- **F2 (wave 2, quick-add asymmetry)**: TAG route, per scoring blueprint §4 recommendation and
  founder top-10 item 5 wording ("unscored tag, never comparison material"). No vision pipeline
  on quick-adds.
- **F3 (wave 2, first-photo baseline)**: recommended shape — one extra "reference set" sentence
  plus firmer retake phrasing when flagged; NEVER a hard block.
- **Wave 3 uncertainty display**: numeric range stays HIDDEN (qualitative-first), per scoring
  blueprint §5 / results blueprint §2 deliberate design and founder safety stance ("no fake AI
  certainty"). Low-tier "Show score anyway" affordance included with caveat copy per results
  blueprint §1.
- **Scoring blueprint §6 additions 2 and 3** (anchor-divergence withhold, multi-day session
  integrity withhold) are NOT in this execution's scope: the divergence threshold is explicitly
  "set during §10 corpus work, not guessed", and neither appears in the launch-critical top 10
  or any wave doc's requirements. Recorded here, not silently dropped.
- **Wave 5 EXIF strip mechanism**: `expo-image-manipulator` is NOT a dependency and new
  dependencies are forbidden without founder yes. Decision: pure-JS JPEG metadata segment strip
  (remove APP1/EXIF and other metadata APP segments from the JPEG byte stream) applied on every
  save path. Lossless (no re-encode, no quality change), zero new dependencies, byte-testable in
  Jest, satisfies the blueprint requirement "stored files carry no EXIF/GPS" and the acceptance
  test "GPS-tagged fixture in → EXIF-free bytes out". This does NOT hit the founder stop
  condition because no external dependency is required.
- **Wave 5 iOS backup exclusion**: no supported JS API exists in the installed `expo-file-system`;
  never eject. Decision: smallest native touch — extend the EXISTING in-repo native module
  (`modules/progress-scan-image`) with a `setExcludedFromBackup(path)` function (iOS
  `NSURLIsExcludedFromBackupKey` via `URLResourceValues`; Android no-op), called best-effort on
  photo-directory creation and healed at app photo-flow start. Jest cannot verify the attribute;
  manual verification goes on the device checklist, as the wave doc allows.
- **Wave 5 stale artefacts**: founder sign-off to DELETE the dead cloud `progress_photos` table
  from `supabase/schema.sql`/`setup_complete.sql` was not granted in this run → apply the wave
  doc's sanctioned fallback: clarifying header notes only. `docs/BUDGET_POSTURE_LOCKED.md` is a
  LOCKED doc → untouched; correcting its photo section stays an outstanding founder action.
- **Review model**: Fable reviews each wave's diff hands-on in the main loop (no review agents),
  per the founder's execution model for this run.
- **Testing posture**: targeted suites per wave (this surface is safety-adjacent), plus lint;
  one full `npm test` before final push.

## Wave log

### Wave 1 — scoring accuracy foundation (COMPLETE, commit `2badeea`)

Agent: Sonnet. Reviewed hands-on by Fable (full diff read; symbols verified;
`normaliseStoredPhysiqueAssessment` checked — stored historical scores are NOT re-blended on
read, so the tighter clamp affects only newly analysed scans; no silent historical shift).

Files changed:
- `src/lib/progressScanAnalysis.js` — F1(a) ±8 provisional anchor clamp (status-keyed via
  fresh read of the estimator JSON's `status`), `anchorEngaged` flag + Moderate confidence cap
  when the shift exceeds 4 points, calibration-honesty receipt line, `duplicate_pose_content`
  withhold reason + cross-pose content-hash check + exact blueprint copy.
- `src/lib/progressScanStore.js` — SHA-256 content hash of photo bytes at asset-add time,
  stored in existing `signals_json` (no schema change; best-effort, null on failure, nulls never
  match).
- `__mocks__/expo-crypto.js` — real Node SHA-256 backing for tests.
- `src/lib/__tests__/progressScanAnalysis.test.js` — F1(a) invariant suite (bound, cap,
  status-keyed reversion), duplicate withhold positive/negative/no-hash tests, source guard on
  `SCORE_WITHHOLD_REASONS`; 4 pre-existing mismatched-anchor expectations updated to the tighter
  clamp, each documented old→new in the test header.
- `src/lib/__tests__/progressScanStore.contentHash.test.js` (new) — hash wiring pins.

Tests: `npx jest --testPathPattern="progressScanAnalysis|progressScanCalibrationCorpus|progressScanStore"`
→ 4 suites, 83 tests, all passed (corpus replay needed ZERO expectation changes). Broader
targeted sweep by the agent: 19 suites passed, 228 tests; 1 pre-existing unrelated failure
(`progressScanVision.test.js`, missing `react-native-fast-tflite` build artifact in this
sandbox, confirmed present on base branch via stash). `npm run lint` clean.

Decisions/risks recorded:
- The four changed test expectations are the intended consequence of founder-approved F1(a):
  large-body cases the old −16/−26 anchor pulled down now move at most −8, with confidence
  capped at Moderate and the calibration honesty line shown. Accepted per founder approval 1.
- Diagnostic-only fields `boundedEstimatorAnchorScore`/`estimatorAnchorAdjustment` in
  `indexInputs` still reflect the old clamps; they render nowhere. Revisit only if a surface
  ever displays them.
- Duplicate defence is byte-identical only (per spec; perceptual hashing is premium-later).
- Manual Android EAS device checklist written (in the wave 1 agent report, mirrored into the
  final status): duplicate-import withhold, retake-scores path, anchor-engaged Moderate receipt,
  no-anchor path, old-scan render, ED-suppression check.

### Wave 2 — capture quality and confidence (COMPLETE, commit `465a573`)

Agent: Sonnet. Reviewed hands-on by Fable; ONE REAL BUG caught and fixed in review before
commit: the agent's new `localDayKeyForScanMatch` in `progressPhotosController.js` used
`getMonth()` while the screen's map build used `getMonth() + 1` — the day-fallback lookup key
could never match the map key (silent loss of the legitimate same-day score row), and the test
fixture mirrored the wrong key so the suite could not see it. Fix: one exported
`localDayKeyForScanMatch` (month + 1) now builds the screen's `scansByDateKey` AND performs the
lookup; the screen's private `localDateKey` was deleted; the test fixture builds its map key
with the exported function so any future drift fails the suite.

Leak-path trace (evidenced by the agent): quick-adds can never enter `progress_scan_assets`
(hard fence by construction: `addProgressScanAsset` reachable only from scan routes). The real
leak was display attribution: `scanForCheckIn`'s same-day fallback could attribute an unrelated
scan's Score/Leanness/Change row to a check-in card containing only quick-add photos (e.g. a
backdated quick-add landing on a scored day). Fenced at that exact point.

Files changed: `database.js` (additive idempotent local migration v59:
`progress_photo_meta.unscored`, header-noted), `progressPhotoMeta.js` (permanent monotonic
`unscored` flag; true can never be cleared), `progressPhotosController.js`
(`resolveScanForCheckIn` fence + `isFirstPoseCapture` + shared day key),
`progressCaptureGuide.js` (F3 baseline sentence + firmer retake copy),
`ProgressPhotosScreen.js` (quick-add tagging on save, baseline-once wiring, `finishScan`
re-entrancy guard keyed by scanId), plus 5 test files (fence behavioural + source guard,
baseline-once, re-entrancy, meta permanence; 2 pinned literals updated for the refactor with
guards preserved).

Tests: `npx jest --testPathPattern="progress|Progress" --testPathIgnorePatterns=progressScanVision`
→ 35 suites passed (1 skipped: the pre-existing sandbox-only vision-module failure), 364 tests
passed. `npm run lint` clean.

Deferred item (recorded, not silently parked): the same-day fallback is fenced for quick-add
photos per founder gate F2's exact scope; a check-in built ENTIRELY from guided single photos
(ghost-overlay route, also never scan assets) could still, in a narrow backdating edge, borrow
a same-day scan's score display. Fixing that means either tagging guided singles unscored too
or removing the day-fallback outright — both beyond F2's stated scope, so this is surfaced in
the final status as a founder question rather than pre-decided.

### Wave 3 -- results, history and trust (COMPLETE, commit `bb98f58`)

Agent: Sonnet. Reviewed hands-on by Fable: read `progressScanResultsContract.js`,
`progressScanTrendViewModel.js`, both new components, and the full
`ProgressPhotosScreen.js` diff against the wave doc's acceptance criteria.
Confirmed `ProgressPhotoCompare.js` (the neutral surface) and its banned-word
test are byte-identical/untouched; confirmed no engine file touched.

A theoretical timing concern was raised during review (a possible race between
the mount-time disk read of `seenRecalibrationIds` and the visibleScans-keyed
effect that marks a scan's recalibration note seen, which could in principle
make the note render then vanish mid-session). Empirically extended the
"first encounter" test with two extra flush cycles and a post-settle
re-assertion that the note text is still present: it passed against the
as-built code, so no defect is confirmed. Recorded here rather than silently
dropped; worth a second look only if a future device walk ever shows the note
disappearing after its first render.

Files changed: `src/lib/progressScanResultsContract.js` (new),
`src/lib/progressScanTrendViewModel.js` (new), `src/components/ProgressScanTrend.js`
(new), `src/components/ProgressScanMeaningMoment.js` (new),
`src/lib/progressScanPreferences.js` (recalibration/meaning-moment seen flags),
`src/screens/ProgressPhotosScreen.js` (tier contract on the score row, receipts
with Why?, trend entry, meaning moment, recalibration note),
`src/components/ProgressScanCompare.js` (confidence chip on the compare
summary), plus 8 test files (106 tests).

Tests: `npx jest --testPathPattern="progressScanResultsContract|progressScanTrendViewModel|ProgressScanMeaningMoment|ProgressScanTrend|ProgressPhotosScreen.resultsContract|progressScanPreferences|ProgressPhotosScreen.addFlow"`
-> 8 suites, 106 tests, all passed. `ProgressPhotoCompare.js`'s own suite (12
tests) re-run to confirm no cross-contamination. `npm run lint` clean.
