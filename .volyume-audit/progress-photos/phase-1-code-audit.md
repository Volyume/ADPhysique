# Volyume Progress Photos / Image Scoring Phase 1 Code Audit

Synthesised by Fable from the seven saved scout reports in `evidence/` and the saved external
research in `research/`. Every current-app claim below traces to a scout report, which in turn
cites file paths. Branch `claude/codebase-audit-docs-pv6mjd`, commit `0025e07` (see
`00-run-manifest.md`). Nothing here is invented; where scouts could not evidence something, it
is marked "not evidenced".

---

## 1. Executive evidence verdict

**Classification: strong but trust gaps remain.**

The system is far more built, more careful, and more tested than the audit premise assumed. There
is a real, on-device, deterministic image-scoring pipeline (genuine pixel-level segmentation, a
hand-authored silhouette formula, layered withhold gates, confidence tiers, bias flags,
comparability gating, and a hard tested guarantee that nothing leaves the device or touches the
coaching engine's decisions). This is not a mock, not a stub, and not an AI black box.

The trust gaps are specific and consequential:

1. A **provisionally validated linear body-fat regressor** (`assets/ml/progress_scan_bf_estimator_v1.json`,
   self-marked `"status": "provisional_validation_pending"`) can shift the visible Volyume Score
   by up to +20 / -26 points as an internal "anchor", with no in-repo ground-truth validation
   corpus (scout 3).
2. The score renders as a **bare precise integer ("Volyume Score 74/100") with no visible
   uncertainty**, even though the engine computes an uncertainty margin internally and then
   deliberately hides it (`hiddenLegacyRange`) (scouts 3, 4, 5).
3. **Two capture pipelines with unequal quality standards**: the guided scan flow is quality-gated;
   quick single-photo adds bypass every automated check yet land in the same timeline (scout 2).
4. **Degenerate input is rewarded**: the identical photo reused for front and back poses is not
   detected and would score as *more* consistent (scout 4).
5. Privacy hardening gaps on Article 9 data: no verified EXIF/GPS stripping, no iOS
   backup-exclusion attribute, and a cross-user wipe blast radius on shared devices (scout 6).

None of these are "rebuild" findings. They are validation, honesty-of-presentation, and
hardening gaps on top of an unusually strong foundation.

## 2. Current system map from code

Three named layers (code's own names, scout 1):

- **"Progress photos"** — the raw on-device gallery. Files at
  `documentDirectory/progress_photos/users/<safeUserId>/<epochMs>.jpg` (`src/lib/progressPhotos.js`),
  metadata in local SQLite `progress_photo_meta` (date taken, pose, bodyweight snapshot, note;
  `src/lib/progressPhotoMeta.js`, schema in `src/lib/database.js` v56).
- **"Progress Scan"** — the guided pose-based capture and analysis flow (front and back required,
  side optional), living inside `src/screens/ProgressPhotosScreen.js` (no separate route). Sessions
  and per-photo assets in `progress_scan_sessions` / `progress_scan_assets` (v56/v57), CRUD in
  `src/lib/progressScanStore.js`.
- **"Volyume Score"** — the 0-100 output (internally `visualLeannessScore`,
  `assessmentVersion: 'volyume_physique_scan_score_v2'`) with a leanness band (Foundation through
  Peak Condition), a Scan Confidence tier (high / moderate / low / not_enough), and a Progress
  Signal (baseline / clear_positive / ... / inconclusive). Engine:
  `src/lib/progressScanAnalysis.js` (1,584 lines).

Supporting parts: native module `modules/progress-scan-image` (RGB extraction + person-mask
segmentation, Swift/Kotlin); vision layer `src/lib/progressScanVision.js` (bundled MediaPipe
selfie-segmentation TFLite model, 256x256, via `react-native-fast-tflite`, with an ML Kit /
Vision-framework native fallback); display/copy view-models (`progressScanDisplay.js`,
`progressScanCopy.js`, `progressScanCompareViewModel.js`); components (`ProgressGhostCapture`,
`ProgressPhotoCompare`, `ProgressScanCompare`, `ProgressPhotoViewer`, `ProgressScanHistoryCard`,
`BeforeAfterShareSheet`, `PhotoDetailsSheet`, `PhotoDatePicker`, `PhotoDateRangeSheet`,
`ProgressPhotoPrompt`); a founder-only calibration export tool gated by a hardcoded 3-email
allow-list (`progressScanCalibrationAccess.js`).

State: **zero photo/scan state in the Zustand store** (`src/store/useAppStore.js`, grep-confirmed);
everything reads straight from SQLite per screen. Gating: `ProgressPhotos` route is Pro via
`withReadOnlyProGuard` keyed on `photosViewableBy(userId)` (free users with existing photos get
read-only view; `RootNavigator.js:189`). Cloud: the ONLY Supabase migration touching "photo" is
`migrate_104_photo_prompt_telemetry.sql` (two payload-free telemetry event names). A historical
cloud `progress_photos` table exists only in the stale snapshot files `schema.sql` /
`setup_complete.sql`, never in a canonical migration — dead (scout 6).

Old/new duplicate systems: the raw gallery predates and underlies the scan flow (shared files and
`progress_photo_meta` rows); a legacy body-fat estimator survives only as an internal anchor input
to the newer silhouette score (see §4). No abandoned parallel photo system was found.

## 3. Current capture/input-quality evidence

Evidenced (scout 2):

- **Six capture entry points**: resume-partial-set, guided "photo set" scan (camera),
  scan-via-library-import (date-first), standalone guided single photo (ghost overlay), quick
  camera add, quick library add (`buildProgressStudioCaptureRoutes`).
- **Real capture-time repeatability aids**: ghost overlay of the previous same-pose photo at
  adjustable opacity 15-85%, rule-of-thirds grid, live accelerometer horizon level
  (`expo-sensors`), per-pose text guidance (stance, checks, avoid-list), lighting/framing/clothing
  guidance copy.
- **Automated post-capture quality analysis, scan flow only**: on-device segmentation +
  blur (Laplacian variance) + lighting + framing + pose/tilt + multi-person signals; a
  "Retake this photo?" prompt fires on breach, always with a "Save without score" escape
  (advisory by design, `QUALITY_FIRST_CAPTURE_NOTE`).
- Permission handling is calm and fail-safe (auto-request once, denial states, library fallback);
  Android `READ_MEDIA_*` deliberately blocked (system photo picker); accessibility is deep
  (adjustable-slider semantics, Reduce Motion respected).

Missing or unclear:

- **No quality gating at all** on the two quick-add routes; those photos share the timeline
  (scout 2's top gap).
- **No live framing feedback** — all automated checks run after the shutter.
- **No elevated baseline standard** for the first-ever photo of a pose, despite it seeding every
  future ghost-overlay reference.
- The mask-derived `cameraTiltDegrees` (body lean) and the live sensor level (device tilt) are
  different concepts that can disagree; only the sensor one is live.
- No thumbnails (full-resolution files rendered in the grid); no minimum-resolution enforcement
  (only JPEG quality settings 0.7 / 0.92).

## 4. Current scoring pipeline evidence

Evidenced, in pipeline order (scout 3):

1. **Real pixel analysis**: `analyseProgressScanPhoto` extracts RGB natively, runs the bundled
   MediaPipe selfie-segmentation TFLite model (ML Kit fallback), computes a genuine foreground
   mask, then blur/lighting/framing/pose/tilt and silhouette width ratios by sampling mask rows
   at fixed body-height bands. Tensor contract validation exists. Not mocked (mocks appear only
   in `__tests__`). No `Math.random` or hard-coded scores in production code.
2. **Deterministic score**: `computeVisualLeannessScore` is a fixed weighted formula over the
   ratios; `calibrateVolyumeScore` applies a hand-authored calibration curve. No neural net
   predicts the score.
3. **Provisional anchor**: `estimateBodyFatFromScanAssets` is a deterministic linear regressor
   (coefficients in `assets/ml/progress_scan_bf_estimator_v1.json`; inputs include sex, BMI from
   height/weight, waist-to-height/shoulder/hip ratios, body-area ratio, front-back waist spread).
   Its raw body-fat percent is never shown or persisted as a body-fat result
   (`assets/ml/README.md`); it only anchors/blends the visible score
   (`blendedVisualLeannessScore`), with clamps `ESTIMATOR_ANCHOR_MAX_UPWARD_POINTS` (+20) and
   large-body downward limits (up to -26). Its own JSON says
   `"status": "provisional_validation_pending"`.
4. **Confidence** is genuinely computed (`computeScanConfidenceScore`): weighted blend of
   segmentation/pose/framing/lighting/clothing/completeness/stability/setup-consistency minus
   `biasConfidencePenalty` (female overestimation risk, darker-skin overestimation risk, very
   muscular, prep/lean-stage, missing side pose, validation-pending flags).
5. **Profile data feeds the score**: sex and BMI enter the regressor; nearest logged bodyweight is
   snapshotted per photo and shown in history/compare.

Unknown / not evidenced:

- No labelled ground-truth accuracy dataset in-repo; `progressScanCalibrationCorpus.test.js`
  tests internal consistency (e.g. framing cannot create a fake progress jump), not accuracy
  against real body-composition measurements.
- Whether any current path writes `bodyFatSource: 'photo_scan'` into the body-metrics log:
  scout 7 found `src/lib/database/bodyMetrics.js` has zero `photo_scan` references, so the
  `nutritionEngine.js:715` `photo_scan` confidence case appears to be pre-wired but currently
  unreachable via automatic writes. Manual entry paths were not exhaustively traced.
- Whether the raw regressor body-fat percent could leak via any unreviewed surface (calibration
  export was checked and contains no photo names/paths; every display boundary nulls
  `rangeLow`/`rangeHigh`; but scouts did not exhaustively check every screen).

## 5. Current accuracy, confidence, and withhold evidence

What protects users today (scout 4):

- **Named per-asset quality gates** (`FINAL_SCAN_QUALITY_GATES`): lighting 0.25, blur 0.18,
  framing 0.25, pose 0.22, segmentation 0.30, separation 0.20, tilt 20 degrees.
- **A hard withhold set** (`SCORE_WITHHOLD_REASONS`): missing required pose, model unavailable,
  incomplete signals, no person, too dark, too blurry, whole body not visible, multiple people,
  pose not clear, estimate out of range, mask unusable. Withheld scans keep the photos and return
  `analysisStatus: 'abstained'`, `visualLeannessScore: null`.
- **Confidence tiers** gate display and behaviour: high >= 0.85, moderate, low, not_enough.
- **Comparability gating** before any trend claim (`scanComparability`): both scans complete and
  scored, required poses present, >= 7 days apart (`PROGRESS_SCAN_MIN_COMPARISON_INTERVAL_MS`),
  quality not poor/unknown, confidence above not_enough, and `scanSetupStability` passing
  (lighting drift 0.24, tilt drift 4 degrees, camera distance drift ~0.09-0.10 of body-box,
  position drift 0.11).
- **Trend direction only at moderate+ pair confidence** (`canCallPairTrend`); below that the copy
  says a trend is not being called.
- Race/duplicate protections: same-millisecond filename collision walk (tested), shutter and
  save-button disabling during async saves, a ref-lock against double-opening a scan session,
  live tier re-checks at async boundaries.

Overconfidence risks (scouts 4, 5):

- The **precise integer with no visible range** (`hiddenLegacyRange` deliberately hidden); trust
  rests entirely on the qualitative confidence word's visual prominence, which no test pins.
- **Duplicate photo content across poses is undetected** and drives `frontBackWaistSpread`
  toward 0, which `consistencyScoreFromSpread` rewards as high consistency.
- `normaliseStoredPhysiqueAssessment` can silently recalibrate historically stored scores on
  version migration ("the number moved without the photo changing" surprise).
- Bias flags materially widen margins and shift weighting, but neither the flags nor their effect
  are disclosed to the user; only the confidence tier word surfaces.
- No `finishScan` re-entrancy guard independent of upstream button disabling.
- Timeline day-grouping rolls its own device-local logic rather than reusing `dayKey.js`; no
  DST/timezone tests for photo grouping.

## 6. Current results UI/history/comparison evidence

What users see today (scout 5):

- One hub screen (`ProgressPhotosScreen.js`, 2,193 lines): a dated check-in-card timeline mixing
  plain photos and scored sets, pose/sort/date-range filters, and (only when a same-day scan
  exists) a 3-cell Score / Leanness / Change row.
- **Two comparison surfaces with different content rules**:
  `ProgressPhotoCompare` (side-by-side / slider / overlay) is contractually neutral — a
  banned-word regex test forbids before/after/change/gained/lost/weight/leaner/etc.; labels are
  strictly "Earlier"/"Later". `ProgressScanCompare` ("Compare photo sets") does show score, band,
  weight, and a "Why this looks different" delta explanation.
- `ProgressScanHistoryCard` maps abstentions to calm labels ("Analysis unavailable",
  "Retake needed", "Not enough confidence", "Measured only", "Not scored") each with explanatory
  body copy; a "Read quality" pill shows the confidence tier.
- `ProgressPhotoViewer` shows date/pose/note and nearest bodyweight, gated by suppression and a
  per-user hide-weight setting. `BeforeAfterShareSheet` composites two photos into one PNG with an
  "Included / Kept private" receipt; weight is per-export opt-in (the founder-approved exception);
  the sheet is withheld under `usePhotoSuppression()` (fail-closed) and Pro-gated.
- Body-fat ranges are computed internally but **hard-nulled at every display boundary**; no
  percentile/population comparison exists; no numeric body measurements are ever displayed.
- Empty/loading/error states are content-shaped, cause-differentiated, honest ("Volyume has not
  deleted or changed your photo library.").
- **Not evidenced**: any score-over-time chart (comparison is pairwise only); a dedicated
  methodology explainer (a `MethodologyScreen.js` exists but its scoring content was not read).

Assessment (evidence-tied): the engineering is unusually calm and honest for the category; the
two real overclaim risks are the bare integer without uncertainty and the invisible
anchor/bias-flag machinery that can move that integer materially.

## 7. Current Coach/check-in status

**Verdict: not linked to decisions or check-ins; a display-only link to the Coach output screen
exists and contradicts the audit premise as literally stated.** Documented as a contradiction to
reconcile with the founder, per the audit instructions.

Verified NOT linked (scout 7, high confidence):

- `runWeeklyCoach` (`src/lib/weeklyCoach.js:383+`) has no scan/photo field in its explicit
  destructured input contract and no `...rest` passthrough; the actual call site
  (`CoachOutputScreen.js:1381-1440`) passes `bodyFatPercent`/`bodyFatSource` from the body-metrics
  log only.
- `nutritionEngine.js` allowlists exclude `photo_scan` from authoritative
  (`isAuthoritativeBodyFatSource`: dexa/caliper/bia only) and baseline body-fat sources; a
  photo-scan value can never trigger Katch-McArdle BMR or lower the FFM floor. Five tests across
  three files pin this (`progressScanSafetyFloorIsolation.test.js`, `ffmFloor.test.js`,
  `nutritionEngine.test.js`).
- `weekly_checkins` columns (`database.js:5058-5073`) contain no photo/scan field;
  `WeeklyCheckInScreen.js` has zero photo/scan references; nothing writes scan estimates into the
  body-metrics log (`src/lib/database/bodyMetrics.js`, zero `photo_scan` references).
- Nothing scan-related reaches `coachApply.js`, `planEngine.js`, `blockAdvisor.js`, or
  `cardio/cardioEngine.js`; nothing is persisted to `coach_outputs`.

The CONTRADICTION (all seven code scouts converged on it):

- `CoachOutputScreen.js` fetches the latest complete scan (`getProgressScanCoachSummary`,
  line 1365), and AFTER `runWeeklyCoach` returns, resolves a "Progress photo context" note
  (`resolveProgressScanCoachNote`, lines 1444-1449), gated `!edPatternOpen && !calmMode`
  (line 1725), folds one sentence into the displayed `interpretation` via
  `applyProgressScanCoachContext` (line 1769), and renders a dedicated card (lines 2042-2048).
  `AthleteProfileScreen.js:274` uses the same summary for its "Physique Score" tile.
- The resolver (`src/lib/progressScanCoachResolver.js`) self-documents as "deliberately NOT part
  of weeklyCoach or nutritionEngine"; every note carries `affectsTargets: false` and
  `usedFor: 'visual_trend_context_only'`; its copy states in-line that "The weekly target still
  comes from your logs, weight trend, training and recovery, not from this scan".
- A dedicated guard suite (`progressScanCoachIsolation.guard.test.js`) pins all of this.
- **This is not rogue code**: scout 7 traced it to a prior founder-approved blueprint,
  `audit/progress-flagship/stage3-blueprint-approval-gate.md:236-278`, which specified exactly
  this resolver-outside-the-engine pattern and its "must not" list. The shipped code closely
  matches that approved design. Git history shows the resolver under active edit as recently as
  2026-07-08 (commit `883b772`, attributed to "Codex") — a live coordination flag.

Resolution required from the founder (not pre-decided here): either (a) update the "not linked"
premise to "display-only Coach-screen context is approved current state; decisions and check-ins
remain unlinked", or (b) direct removal/hiding of the Coach-screen card. This audit's blueprints
treat the engine/check-in isolation as the inviolable baseline and the display-only card as
approved-pending-confirmation, because the stage3 approval-gate document evidences prior founder
approval. Two hygiene findings stand regardless: the Coach screen uses its own local suppression
pair rather than the shared fail-closed `usePhotoSuppression()` hook, and the isolation is
enforced by regex source-guards that a refactor could silently defeat.

## 8. Data, privacy, reliability, and tests

Evidenced (scout 6):

- Photos never leave the device: no Supabase Storage code, no canonical migration creates a photo
  table, no SYNC_REGISTRY entry — pinned by `progressPhotoMetaNoSync.guard.test.js`
  (also forbids any table matching `/photo|scan/i`).
- Deletion is ordered and tested: detach scan → delete meta → delete file for singles; account
  wipe deletes the three tables (the ONLY tables marked FATAL-on-failure in the wipe set) and the
  photo directory, then purges DB snapshots.
- Sentry scrubbing explicitly redacts photo tables, paths, and binary payloads; the only
  photo-adjacent telemetry is two payload-free event names (migration 104).
- Privacy copy is source-pinned by `privacyTruth.guard.test.js` (photos stay on device; JSON
  backup includes metadata, never image files; not a DEXA scan or medical measure).
- Owner-marker (`owner.txt`) gives fail-closed per-user read gating on shared devices; Android
  `allowBackup=false`.

Not evidenced / gaps:

- **EXIF/GPS stripping**: `exif: true` is never requested (JS object clean), but
  `saveProgressPhoto` byte-copies the JPEG, so embedded GPS from a library-picked original could
  persist in an Article 9 data file.
- **iOS backup exclusion**: no `NSURLIsExcludedFromBackupKey`; documentDirectory files enter
  iCloud/iTunes backups by default, in tension with "your photos stay on this device".
- **Cross-user wipe blast radius**: `wipeProgressPhotoDirectory()` deletes the entire
  `progress_photos/` tree for ALL users on a shared device, not just the account being removed;
  no two-user test exists.
- No retention/auto-expiry policy; no thumbnails; no app-level encryption of the JPEG files
  (SQLCipher covers the DB only).
- Stale artefacts that could mislead future readers: the dead cloud `progress_photos` table in
  `schema.sql`/`setup_complete.sql`, and `docs/BUDGET_POSTURE_LOCKED.md`'s outdated
  "camera roll save toggle"/`photo_progress` description.

Test coverage verdict: unusually deep (60+ relevant test files) — pure logic, deletion ordering
and failure branches, sync absence, coach isolation, safety-floor isolation, shared-device
gating, copy truth pinning, plus standalone calibration/replay harnesses in `scripts/`. Gaps are
structural (see §13), not missing tests on existing behaviour.

## 9. Safety, copy, and accessibility

- ED-safety suppression is present and mostly consistent: `usePhotoSuppression()` (fail-closed)
  governs compare/weight/share surfaces; the Coach-screen card and profile tile use a locally
  computed `edPatternOpen`/`calmMode` pair — same intent, second mechanism (reconcile).
- The neutral-copy banned-word contract covers only `ProgressPhotoCompare`; scored-scan surfaces
  legitimately use trend words ("leaner", "positive", "drift") with no equivalent tone contract.
- `ProgressPhotoPrompt` invites a photo after milestones (PB/streak) — body-checking-adjacent;
  its suppression/frequency logic was not read in full (open item).
- The 7-day cadence gate is soft ("Save photos anyway"), so frequent re-scanning is discouraged,
  not prevented — relevant given the external evidence that checking frequency is the main harm
  variable (research §10).
- Voice is calm and honest throughout the quoted copy; abstention copy is specific and
  actionable; accessibility is genuinely deep in the capture flow (adjustable-slider semantics,
  Reduce Motion, differentiated empty states). Some icon targets sit at 40x40, marginally under
  the 44pt guideline.

## 10. External research summary

(External research only — none of this is evidence about the Volyume codebase. Full file:
`research/image-scoring-progress-photo-research.md`.)

- Best independent evidence (npj Digital Medicine, n=1,273) puts AI 2D-photo body-fat estimation
  at MAE ~1.5-2.5 percentage points vs DEXA — but only under controlled conditions
  (tight/minimal clothing, fixed distance, good lighting); the authors state it is unvalidated
  in non-research environments and in athletes.
- Confounds are large and mostly uncontrolled in consumer use: perspective distortion up to ~18%
  at close selfie distances (peer-reviewed); glycogen/sodium/pump shift appearance day-to-day
  with zero composition change; clothing/lighting/pose flagged by the studies' own authors.
- Even trained bodybuilding judges show limited inter-rater reliability without calibration —
  visual scoring has an inherent precision ceiling.
- Repeatability gold standard across coaching sources: same time of day (morning, fasted), fixed
  lighting, fixed distance/camera, minimal consistent clothing, fixed poses, constant background;
  cadence 4-6 weeks recreationally, weekly only in active prep.
- Competitors split: coach platforms (Trainerize, TrueCoach, MacroFactor) make no photo-based
  body-fat claim; scanner/CNN products (Spren, MeThreeSixty, Fit3D, ZOZOFIT, discontinued Amazon
  Halo) claim explicit body-fat %, and none surfaces uncertainty at the point of the score.
- Amazon Halo: a DXA-comparable validation study did not protect it from sustained criticism, and
  it was discontinued — accuracy studies alone are not sufficient cover.
- FTC requires "competent and reliable scientific evidence" for objective claims; disclaimers do
  not cure a misleading headline number.
- Body-checking research: harm concentrates in already-vulnerable users and is driven by checking
  frequency and single-number fixation — argues for cadence limits and trend framing.
- No published full validation protocol exists anywhere in the category; the evidence base to
  trust a score for driving coaching decisions does not yet publicly exist.

## 11. What already works well

Polish, do not rebuild (converged across scouts):

- The device-local, never-synced architecture and its guard test.
- The quality-gate / withhold / confidence / bias-flag / comparability machinery in
  `progressScanAnalysis.js` — extend, never replace.
- The on-device vision pipeline with native fallback and contract validation.
- The safety-floor isolation (`photo_scan` can never be authoritative) and its five tests.
- The resolver-outside-the-engine pattern (`progressScanCoachResolver.js`) with
  `affectsTargets: false` self-documenting data shapes — the template for ALL future integration.
- The ghost-overlay capture aid, the neutral-copy contract on `ProgressPhotoCompare`, the
  share-sheet "Included / Kept private" receipt, `usePhotoSuppression()`'s fail-closed shape,
  deletion ordering and fatal-wipe semantics, filename collision walk, owner-marker gate,
  differentiated empty/error states, and the calm abstention copy.

## 12. Evidence-backed risks

| # | Risk | Evidence | Severity | Why it matters | Evidence gap |
|---|------|----------|----------|----------------|--------------|
| 1 | Provisional regressor materially moves the visible score (+20/-26 pts) while self-marked validation-pending | Scout 3; `blendedVisualLeannessScore`, estimator JSON status | High | The single number users anchor on is partly driven by an unvalidated component; research shows all favourable accuracy figures come from controlled conditions | No in-repo ground-truth corpus; founder-only calibration loop status unknown |
| 2 | Precise integer shown with no visible uncertainty (`hiddenLegacyRange`) | Scouts 3, 4, 5 | High | Overconfidence-by-omission; FTC/Halo research says hedge must sit at the point of the claim | UI prominence of the confidence word untested/unverified visually |
| 3 | Quick-add photos bypass all quality gating yet share the timeline | Scout 2; `pickFrom()` vs scan flow | Medium-High | Undermines the input-quality standard the scoring flow enforces; comparison material of unknown quality | Whether quick-add photos can enter scored comparisons downstream needs a targeted trace |
| 4 | Identical photo reused across poses scores as MORE consistent | Scout 4; `consistencyScoreFromSpread` | Medium-High | Degenerate input produces a falsely well-supported score | None — clear gap, no test |
| 5 | Display-only Coach link contradicts stated premise; second suppression mechanism; regex guards brittle | Scouts 1, 3, 4, 5, 6, 7 | Medium (process) / Low (code) | Founder fact and repo disagree; two suppression paths can drift; refactors can silently defeat regex guards | Founder decision required; `coachSummaryFromScan` internals not fully reviewed |
| 6 | Cross-user wipe blast radius on shared devices | Scout 6; `wipeProgressPhotoDirectory()` | Medium | Account A sign-out/delete destroys account B's photos, irreversibly | No two-user test seeds the scenario |
| 7 | EXIF/GPS possibly retained in byte-copied JPEGs; iOS backups include the photo dir | Scout 6 | Medium | Article 9 data with dormant location; "stays on this device" claim weakened by iCloud backup default | OS picker behaviour not verified either way |
| 8 | Silent historical score recalibration on version migration | Scout 5; `normaliseStoredPhysiqueAssessment` | Low-Medium | "Number moved without the photo changing" erodes trust in exactly the property the product sells | Frequency/magnitude of shifts unquantified |
| 9 | Bias flags and anchor clamps invisible to users | Scouts 3, 5 | Low-Medium | The confidence word carries all the weight; users cannot know why confidence dropped | Deliberate-design vs gap unconfirmed |
| 10 | Milestone photo prompt is body-checking-adjacent | Scouts 1, 6; `ProgressPhotoPrompt`, migration 104 | Low (gated) | Checking frequency is the main harm variable in the external evidence | Suppression/frequency logic not read in full |
| 11 | Concurrent agent ("Codex") actively editing this surface on this branch | Scout 7; git log `883b772` (2026-07-08) | Process | Blueprint work could collide with in-flight changes | Coordination state unknown to this session |

## 13. Critical evidence gaps

What Phase 2 must not guess (and did not):

1. Ground-truth accuracy of the score and the regressor — no in-repo labelled corpus; the
   founder-run calibration loop's state is unknown.
2. Contents of `docs/progress-scan-validation.md` and the calibration-corpus tests' actual
   accuracy establishment (named, not opened by scouts).
3. Whether `bodyFatSource: 'photo_scan'` is reachable via any manual entry path.
4. `coachSummaryFromScan` internals (`progressScanStore.js`) — the exact place a raw scan row
   becomes the bounded coach summary; not fully reviewed.
5. Whether the raw regressor body-fat percent leaks via any unreviewed surface (dev builds,
   share cards, exports).
6. Visual prominence of the confidence tier relative to the score integer on real screens.
7. OS-level EXIF behaviour of the system photo picker on current iOS/Android.
8. `ProgressPhotoPrompt` suppression/frequency logic.
9. `MethodologyScreen.js` scoring content.
10. Whether quick-add photos can flow into scored comparison material downstream
    (`scanForCheckIn` matching logic flagged by scout 2).
11. Founder intent on: advisory-vs-hard quality gating, hiding the uncertainty range, the
    Coach-screen card's status, and the whole-directory wipe trade-off.

## 14. Scoring-first Phase 2 questions

Questions only (answered in the blueprints, with founder forks marked there):

1. What is the Volyume Score allowed to MEAN, given the anchor component is validation-pending
   and the external ceiling on visual scoring precision?
2. Should the provisional regressor's influence be capped, gated behind validation status, or
   left as-is until the calibration loop concludes?
3. How should uncertainty be shown at the point of the score without inviting numeric fixation
   (range vs qualitative-first vs both)?
4. Should every photo that can enter scored comparison material pass the same quality pipeline
   (closing the quick-add asymmetry), and should any gate become hard rather than advisory?
5. What is the minimum baseline standard for the first photo of a pose?
6. What duplicate-content defence is proportionate (hash vs perceptual)?
7. What is the repeatability standard the product formally commits to, and how is it explained?
8. What does a scoring receipt look like (why shown / withheld / downgraded), reusing the
   existing reason codes?
9. What validation protocol gates each tier of claim (current wording → any stronger wording →
   any future coach influence)?
10. Which privacy hardening items (EXIF strip, iOS backup exclusion, per-user wipe scope) are
    launch-critical vs later?
11. Under what conditions, if ever, may scan data influence anything beyond display context —
    and what guard tests must exist first?
