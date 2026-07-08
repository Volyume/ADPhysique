# Phase 1 evidence gaps — Progress Photos / Image Scoring

Companion to `phase-1-code-audit.md`. Everything here is either unevidenced, unclear, or a
judgement call that must not be guessed. Sources: scout reports 01-07 and the external research
file. Nothing in Phase 2 blueprints rests on a gap listed here without saying so.

## 1. Unevidenced claims (things nobody may assert about the current app)

- Any accuracy figure for the Volyume Score against ground truth. Not evidenced anywhere in-repo.
- That the score is "AI" or ML-predicted. Not evidenced — the score formula and regressor are
  deterministic, hand-authored/linear (scout 3). Equally, "validated" is not evidenced.
- That photos are ever uploaded, synced, or shared automatically. Contradicted by evidence
  (guard-tested local-only design, scout 6).
- That the Coach or check-ins USE scan data for decisions. Contradicted by evidence (scout 7):
  engine inputs, check-in columns, body-metrics writes are all scan-free and guard-tested.
- Thumbnail generation, retention policy, EXIF stripping, iOS backup exclusion, app-level photo
  file encryption, skeletal pose estimation, live framing feedback, score-over-time chart,
  minimum-resolution enforcement: all "not evidenced" (scouts 2, 4, 5, 6).
- Device-model-specific camera calibration: not evidenced (scout 4).

## 2. Unclear scoring behaviour

- The blend maths' real-world effect: how often the regressor anchor moves the silhouette score,
  and by how much, on real users (clamps are +20/-26; distribution unknown).
- `calibrateVolyumeScore`'s lookup-table provenance (hand-authored curve; basis not documented
  in-repo as far as scouts read).
- `coachSummaryFromScan` internals (`progressScanStore.js:419`) — not fully reviewed (scout 7).
- Whether `estimate_out_of_range` and other rare withhold reasons are reachable in practice.
- Whether the raw regressor body-fat percent can leak on any unreviewed surface (scout 3, Q3).
- `normaliseStoredPhysiqueAssessment` recalibration: how many stored scores would shift, by how
  much, on the v1→v2 migration path (scout 5).

## 3. Unclear accuracy/confidence behaviour

- Ground truth: no labelled corpus in-repo; `docs/progress-scan-validation.md` and
  `progressScanCalibrationCorpus.test.js` were named but NOT opened by any scout — their actual
  content is a gap (scout 2, Q2).
- The founder-only calibration export loop: how much data has been collected, whether any
  validation milestone has been reached (scouts 1, 3).
- Whether the confidence tier word is visually prominent relative to the score integer on real
  rendered screens (data flow verified; layout prominence not; scout 4).
- Test-retest repeatability of the pipeline on new photos of the same person under nominally
  identical conditions: no in-repo evidence; external research says nobody publishes this either.
- Blur/segmentation/framing threshold provenance (0.18/0.30/0.25 etc.): whether tuned against the
  calibration corpus or hand-set (scout 2).

## 4. Unclear privacy/storage behaviour

- EXIF/GPS in byte-copied JPEGs: JS never requests exif, but files are copied byte-for-byte;
  whether current iOS/Android pickers strip GPS on export is OS-dependent and unverified
  (scout 6).
- iOS backup behaviour: no exclusion attribute found; presumed included in iCloud/iTunes backups
  by default — presumption, not verified on-device.
- `wipeProgressPhotoDirectory()` cross-user scope: behaviour is clear in code (whole tree), but
  whether it is an accepted trade-off or an oversight is a founder question (scout 6, Q2).
- Stale `progress_photos` cloud table in `schema.sql`/`setup_complete.sql`: safe-to-delete status
  unknown (scout 6, Q4). Stale `docs/BUDGET_POSTURE_LOCKED.md` photo section likewise.
- iOS data-protection class of the photo files (no `NSFileProtection` override found; effective
  class unverified).

## 5. Unclear test coverage

Named but unopened (content unverified): `progressScanCalibrationCorpus.test.js`,
`progressScanBodyMExternal.test.js`, `docs/progress-scan-validation.md`, the `scripts/`
replay/calibration harnesses' assertions, native Swift/Kotlin module internals,
`MethodologyScreen.js`, `ProgressPhotoPrompt` suppression logic.

Confirmed missing tests (scouts 4, 6):
- Duplicate photo content reused across poses (front == back).
- Rendered confidence-label prominence vs score integer.
- Direct `finishScan` re-entrancy.
- Timezone/DST edges for photo local-day grouping.
- Two-user photo-directory wipe scope.
- EXIF absence in saved files.
- Quick-add photos entering scored comparison material.

## 6. Candidate future Coach/check-in attachment points (mapped, not built)

From scout 7 — for the future-integration blueprint only:

- Check-in assembly: the `runWeeklyCoach({...})` call site (`CoachOutputScreen.js:1381-1440`)
  and `saveWeeklyCheckin`/`weekly_checkins` COLS (`database.js:5036-5080`) — currently scan-free.
- Receipt rendering: the existing "Progress photo context" card region
  (`CoachOutputScreen.js:2042-2048`) — the natural home for any future scan receipt.
- The bounded summary interface already specified in
  `audit/progress-flagship/stage3-blueprint-approval-gate.md:242-259` (source, capturedAt,
  confidence, qualityLabel, comparableScanCount, trendDirection, trendMagnitude,
  supportingSignals, limitations) — a ready-made future data shape.
- `recentWeeklyHistory` input to `runWeeklyCoach` and `getBlockAdvice(userId, activeBlock,
  userProfile)` (`blockAdvisor.js:216`) — plausible FUTURE trend-context homes; zero wiring today.
- Guard-test pattern to copy: `progressScanSafetyFloorIsolation.test.js` +
  `progressScanCoachIsolation.guard.test.js` (fs.readFileSync + regex + behavioural assertions).
- Check-in-form attachment is genuinely unscoped: no blueprint exists for it (scout 7).

## 7. Questions requiring founder/product judgement

1. Coach-screen "Progress photo context" card: confirm as approved current state (matches the
   stage3 approval-gate blueprint) or direct its removal. This audit proceeds on
   "approved-pending-confirmation".
2. Advisory-only quality gating ("Save without score" always available): keep as product stance,
   or make specific gates hard for SCORED sets?
3. Hidden uncertainty range (`hiddenLegacyRange`): keep hidden (qualitative confidence only), or
   surface a range/margin at the point of the score?
4. Quick-add capture asymmetry: intentional (library-only photos) or to be closed?
5. Cross-user wipe blast radius: accepted trade-off or scope wipe to the removed account?
6. EXIF stripping and iOS backup exclusion: launch-critical or later?
7. Retention: unlimited accumulation or a review nudge?
8. The milestone photo prompt: is body-checking-adjacent prompting acceptable as gated today?
9. Cadence: is the soft 7-day gate enough, given checking-frequency harm evidence?
10. Concurrent "Codex" edits on this exact surface: sequencing/ownership decision needed.

## 8. Questions requiring technical validation

1. Ground-truth study design: what corpus, what reference method, what subgroup coverage
   (research file §9 gives the 8-point protocol).
2. Test-retest: same person, new photos, nominally identical conditions — what variance does the
   current pipeline actually produce?
3. Cross-condition robustness: lighting/distance/clothing/phone-model sensitivity of the current
   thresholds and score.
4. Duplicate-content detection approach: byte-hash vs perceptual hash cost/benefit on-device.
5. EXIF reality check: capture and library-import a GPS-tagged photo on physical devices, inspect
   saved bytes.
6. Whether the TFLite model and native fallback produce materially different masks on the same
   image (device-consistency check).
7. DST/timezone behaviour of photo day-grouping around clock changes.

## 9. Questions requiring safety judgement

1. Should scored-scan surfaces get a tone contract (banned-word test) like the plain compare has,
   given they legitimately discuss change? What word list?
2. Should the Coach-screen card's suppression migrate to `usePhotoSuppression()` for a single
   fail-closed path? (Recommended in blueprints; founder confirms.)
3. Is a per-user scan-frequency ceiling (beyond the soft 7-day gate) warranted for users with
   elevated risk signals, and how would it avoid feeling punitive?
4. Does showing ANY uncertainty number increase or decrease fixation risk for vulnerable users
   (external evidence favours qualitative-first framing; direct evidence for this category does
   not exist)?
5. Should the milestone photo prompt frequency-cap harder under any wellbeing signal short of an
   open ED flag?
