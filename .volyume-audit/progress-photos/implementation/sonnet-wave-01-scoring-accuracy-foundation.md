# Sonnet implementation wave: Scoring accuracy foundation

## Source docs

Read IN FULL before writing any code (all paths repo-relative):
1. `.volyume-audit/progress-photos/blueprints/scoring-accuracy-and-validation-blueprint.md`
   (governing document; especially §1, §5 F1, §6)
2. `.volyume-audit/progress-photos/phase-1-code-audit.md` (§4, §5, §12 risks 1 and 4)
3. `.volyume-audit/progress-photos/evidence/scout-03-scoring-code-pipeline.md`
4. `.volyume-audit/progress-photos/evidence/scout-04-confidence-withhold-repeatability.md`
5. `CLAUDE.md` (workflow rules, conventions, test style)

## Goal

Make the visible Volyume Score silhouette-led and structurally honest: bound the provisional
body-fat regressor anchor's influence and reflect its engagement in confidence, and withhold
scoring when identical photo content is reused across poses. Nothing else.

## FOUNDER GATE (must be answered before build)

The scoring blueprint §5 presents fork F1 with recommendation (a): clamp the anchor to +/-8
points (from +20/-26) AND cap confidence at Moderate when the clamped anchor still moves the
silhouette score by more than 4 points. Options (b) disable anchor until validation, (c) keep
current clamps. Do NOT start this wave until the founder has chosen. If the founder chooses
different numbers, use those. Never silently substitute your own.

## Current evidence

- The score pipeline is `src/lib/progressScanAnalysis.js` (1,584 lines):
  `computeVisualLeannessScore` (silhouette formula, ~line 473), `calibrateVolyumeScore` (~530),
  `blendedVisualLeannessScore` (~595-636, the anchor blend),
  `estimateBodyFatFromScanAssets` (~1284-1320, linear regressor over
  `assets/ml/progress_scan_bf_estimator_v1.json`), anchor clamps
  `ESTIMATOR_ANCHOR_MAX_UPWARD_POINTS` (+20) / large-body downward limits (up to -26, ~525-593),
  confidence in `computeScanConfidenceScore` (~412-435), tiers in `confidenceTier` (~395),
  withhold set `SCORE_WITHHOLD_REASONS` (~23-37), aggregate gate in `analyseProgressScan`
  (~1389-1534).
- The regressor JSON self-reports `"status": "provisional_validation_pending"`.
- Library import per pose: `pickScanPoseFromLibrary` (`src/screens/ProgressPhotosScreen.js:281-354`);
  photo saving `saveProgressPhoto` (`src/lib/progressPhotos.js:69-90`); scan assets recorded via
  `addProgressScanAsset` (`src/lib/progressScanStore.js`).
- Duplicate content across poses is undetected and REWARDED: `frontBackWaistSpread` ~0 scores as
  high consistency via `consistencyScoreFromSpread` (~line 443).
- Existing test style: invariant tests against the real engine
  (`src/lib/__tests__/progressScanAnalysis.test.js`), replay corpus
  (`progressScanCalibrationCorpus.test.js`), source-level regex guards.

## Files/areas likely involved

- `src/lib/progressScanAnalysis.js` (anchor clamp constants, blend, confidence cap, new withhold
  reason)
- `src/lib/progressScanVision.js` or `src/lib/progressScanStore.js` / capture flow in
  `src/screens/ProgressPhotosScreen.js` (where duplicate detection naturally fits; prefer
  computing a content hash at asset-add time and checking within the session)
- `src/lib/database.js` ONLY if a hash column is added to `progress_scan_assets` (additive,
  idempotent, header-noted local migration via PRAGMA user_version) — prefer avoiding a schema
  change if the hash can be computed and compared in-flow
- Colocated `__tests__` files

## Requirements

1. Anchor gating per the founder-chosen F1 option (default recommendation (a)): new named
   constants; the blend may never move the calibrated silhouette score beyond the chosen bound
   while regressor status is `provisional_validation_pending`; when the applied anchor shift
   exceeds the chosen threshold, the confidence tier is capped at `moderate` and a machine-
   readable flag (e.g. `anchorEngaged: true`) appears in the analysis result.
2. Status-keyed: read the status from the estimator JSON; if the status ever becomes
   `validated`, the pre-existing clamps apply unchanged (no behaviour change in this wave for
   that future state).
3. Duplicate-content defence: detect identical image content used for two or more poses within
   one scan session (byte/file hash, e.g. SHA-256 of file bytes or an existing cheap digest; NOT
   perceptual hashing). On detection: withhold the score with new reason code
   `duplicate_pose_content` in `SCORE_WITHHOLD_REASONS`, photos kept, calm copy per the safety
   blueprint: "Two poses used the same photo, so this set was not scored. Retake each pose
   separately and the set will score."
4. All existing behaviour outside these two changes is byte-identical: run the calibration
   corpus/replay tests and confirm scores unchanged for cases where the anchor shift was within
   the new bound and no duplicates exist.

## Acceptance criteria

- [ ] Founder's F1 choice recorded in the PR description and implemented exactly.
- [ ] Anchor can no longer move the visible score beyond the chosen bound while status is
      provisional (invariant test against the real engine, fixture-driven).
- [ ] Confidence tier caps at Moderate when anchor engagement exceeds the chosen threshold.
- [ ] `anchorEngaged` surfaces in the analysis result and is persisted with the session's
      signals (existing `signals_json` pathway; no new table).
- [ ] Identical front/back content → `analysisStatus: 'abstained'`,
      reasons include `duplicate_pose_content`, photos retained.
- [ ] Distinct photos never trigger the duplicate withhold (negative tests, including similar
      but non-identical images if fixtures allow).
- [ ] Corpus/replay suites pass with zero unexplained score shifts.
- [ ] `npm run lint && npm test` output reported verbatim.
- [ ] Manual device checklist written (numbered steps + expected results, Android EAS build),
      including: import the same library photo as front and back → expect the duplicate
      withhold receipt and photos saved.

## Tests required

- New invariant tests in `src/lib/__tests__/progressScanAnalysis.test.js` (or a sibling file):
  anchor bound, confidence cap, status-keyed behaviour, duplicate withhold, duplicate-negative.
- Extend `progressScanCalibrationCorpus.test.js` replay expectations only where the anchor bound
  changes an expected value; document each changed expectation in the test header.
- A source guard pinning that `SCORE_WITHHOLD_REASONS` contains `duplicate_pose_content`.

## Safety rules

No shame, no score chasing, no body panic, no false certainty. New copy uses the safety
blueprint's exact examples; no em dash; British English; conditions-not-person framing. Withheld
scans always keep photos.

## Coach rules

Do not touch Coach/check-in integration. No changes to `CoachOutputScreen.js`,
`progressScanCoachResolver.js`, `weeklyCoach.js`, `nutritionEngine.js`, `coachApply.js`, or any
check-in code. The existing isolation guard tests must pass untouched.

## Do-not-overbuild warnings

- No perceptual hashing, no image-similarity ML, no new native module work.
- No new model, no retraining, no changes to the regressor JSON beyond READING its status field.
- No UI redesign: the withhold path renders through the existing abstention machinery.
- No schema change unless the hash genuinely cannot live in-flow; if added, additive and
  idempotent only.

## Forbidden changes

- ED-safety system (floors, edPatternDetector, wellbeing, suppression) — untouchable.
- `SYNC_REGISTRY` and anything that would sync photo/scan data.
- Billing, tier gating, identity, notifications, onboarding.
- Existing threshold values in `FINAL_SCAN_QUALITY_GATES` (owned by validation work, not this
  wave).
- `main` branch. Feature branch + PR per CLAUDE.md; no attribution lines in commits.

## Final response format for Sonnet

1. Files changed (paths + one line each).
2. Tests run (exact commands + verbatim result lines).
3. Acceptance checklist with pass/fail.
4. Remaining risks (bullets, honest).
