# Progress-Scan formula accuracy audit — 2026-07-12

**Ask (founder):** go deep on the Progress Photos / Volyume Score system, investigate
the formula, and make it "as bulletproof as possible" internally (no external
study; on-device testing already done).

**Method:** 5 read-only opus audit agents, one per failure surface, each opening
the current code and returning file:line findings + a failing input + a proposed
fix + proposed invariant tests. Lanes: (A) score-formula core, (B) vision mask→ratio
extraction, (C) confidence/abstention/uncertainty, (D) comparison/setup-stability,
(E) numerical robustness + ED-safety isolation.

**System recap.** On-device TFLite selfie-segmentation → silhouette ratios
(`waistToShoulder`, `waistToHip`, `waistToHeight`, `bodyAreaRatio`,
`frontBackWaistSpread`, optional `sideWaistToHeight`) → weighted silhouette score →
calibration curve → blended with a versioned body-fat estimate under anchor clamps
→ 0–100 Volyume Score + confidence tier + leanness band. Estimator asset status is
`provisional_validation_pending`, which tightens the blend clamp to ±8 today.

---

## Headline

- **ED-safety isolation: PASS, no gaps (Agent E).** The scan cannot move a calorie
  floor, the FFM floor, BMR/TDEE, or any nutrition target; the estimate is never
  written to the user profile (persisted as `null`); coach corroboration is a
  display caption only, `affectsTargets:false`, suppressed under calm mode / ED
  flag / data hold; the score + before/after card fail **closed** (start
  suppressed, read failures suppress); copy is condition-blaming. This is the
  most important property for a body-image feature and it holds.
- **No live crash / NaN / out-of-range reaches any displayed value (Agents A, E).**
  Divide-by-zero, empty-array averages, and JSON-persist paths are guarded; every
  score/band/delta/confidence passes a clamp or an explicit null gate.
- **The real gap is accuracy, not safety.** Two themes dominate:
  1. **Monotonicity is unguarded and violated** — a *leaner* body can score
     *lower* (A-F1 latent, A-F2 live). No monotonicity/continuity test exists
     anywhere.
  2. **Distance / perspective invariance is broken** — `bodyAreaRatio` is a
     camera-distance measure scored as body shape (B-F1, ~10-pt swing from
     distance alone), the camera-facing switch was uncompared (D-F1, now fixed),
     and the corpus "distance invariance" test is **vacuous** (B-F1).
- **Confidence can be inflated on weak captures** — a missing foundational metric
  is backfilled with a favourable average instead of lowering the tier (C-F1);
  `segmentation_low_confidence` is soft, not a withhold (B-F4 / C-F2, pinned-test
  conflict).

---

## Landed this session (safe, no valid-score recalibration)

- **D-F1 camera-facing comparability guard** (`8cd7d79`). A front/back lens switch
  now voids the comparison instead of reading as fake physique change. Ships with
  the front-camera default. Fails open on unknown facing.
- **Front-camera + 5s-timer capture default + on-screen advice** (`aaf656c`).
- **Safe hardening batch** (`33109fc`): E-F1, E-F2, E-F4/A-F5, A-F6, A-F7, A-F4
  (applied-clamp telemetry), C-F3, D-F3 (fail-closed setup/capture-time), D-F4
  (civil-day interval, DST-correct), B-F7 (blur over contentRect). Score path
  untouched; corpus 26/26.
- **Confidence honesty** (`1a35682`): C-F1 (drop-and-renormalise, 'high' gated
  on segmentation+pose presence), C-F4 (real within-scan consistency replaces
  the constant), C-F5 (flag semantics documented). Score path byte-identical.
- **Invariant property suite** (`3f46160`): garbage-never-throws, [0,100]
  bounds, full band coverage, withhold-reasons-withhold. Monotonicity property
  deliberately deferred with D1 (see below).

## DEFERRED to the device-validated fast-follow (founder launch-stability direction, 2026-07-12)

The D1 spread-out-of-score change was BUILT and measured against the release
calibration corpus: it moves `male_lean_broad_frame` (80-94 -> 78) and
`short_muscular_stocky` (74-90 -> 71) out of their ratified bands -- i.e. it is
a real recalibration of live users' scores, not a drop-in fix. Per the founder's
direction ("expected fall-out ... isn't acceptable" the night before launch),
the score path ships byte-identical to live, and D1 (blend-weight step + spread
placement), D2 (bodyAreaRatio distance invariance -- solidity anchors are NOT
derivable from the synthetic corpus; verified: fixture bodyAreaRatio values
exceed their own bbox areas), D3 (lean-athlete BMI anchor protection) and D4
(withhold promotion, pinned-test conflict) land together in one corpus/curve
retune validated on real device photos. A KNOWN LIMITATION note in
`computeVisualLeannessScore` and the invariant-suite header pin this so it
cannot be forgotten. All four are masked today by the provisional ±8 anchor
clamp (D1a/D3 latency) -- the retune must land BEFORE the estimator asset is
ever flipped to 'validated'.

## Safe to land next (clear fix, no valid-score change, ED-safe direction)

| ID | Finding | Fix | File |
|---|---|---|---|
| E-F1 | a `null`/`undefined` element in `assets` THROWS instead of abstaining | `filter(Boolean)` + `?.` at each boundary | progressScanAnalysis.js:134-182 |
| E-F2 | display trusts a corrupt stored score (`900` → "900/100") | clamp [0,100] in `formatVolyumeScore`/`progressScanScoreForDisplay` | progressScanDisplay.js:11-23 |
| E-F4 / A-F5 | `inverseRatioScore` + `interpolateBodyFatIndex` divide-by-zero safe only by caller convention | guard the denominators / `if (x===prevX) continue` | progressScanAnalysis.js:466-470, 533 |
| A-F6 | band table has a non-integer gap (96,97) → fractional score → null band | contiguous half-open bands, or round in `leannessBandForScore` | progressScanAnalysis.js:40-48, 687 |
| A-F7 | no explicit `[0,100]` clamp in the blend (safe only by construction) | add an explicit final clamp | progressScanAnalysis.js:680-684 |
| D-F3 | `scanSetupStability` reports `stable:true` when **zero** setup signals were compared (fail-open) | require a minimum `comparedSignalCount`; treat missing `capturedAt` as not_comparable | progressScanAnalysis.js:1010, 1042 |
| D-F4 | 7-day interval gate is raw elapsed-ms → a legit weekly retake across UK spring-forward (167h) is falsely blocked | gate on civil-day difference via `dayKey.js` | progressScanAnalysis.js:10, 1042 |
| C-F1 | a null diagnostic metric is backfilled with the aggregate → confidence tier inflated, no reason code | drop null metrics from the weighted mean and renormalise; gate 'high' behind segmentation+pose presence | progressScanAnalysis.js:441-464 |
| C-F3 | anchor→confidence cap disengages on a partial-`inputs` provisional estimate | treat "pure provisional estimate" as `anchorEngaged`/moderate cap | progressScanAnalysis.js:645, 815 |
| C-F4 | `setupConsistency` is a hardcoded constant masquerading as a measured signal | feed real `scanSetupStability` into it, or drop + renormalise | progressScanAnalysis.js:452 |
| C-F5 | bias-flag drift: `quality_limited` inert, `anthropometric_limited` margin-only | give `quality_limited` a penalty or delete; reconcile the flag sets | progressScanAnalysis.js:257, 408-422 |
| A-F4 | divergent duplicate clamp: persisted `estimatorAnchorAdjustment` telemetry does not describe the visible score | single source of truth, or rename + add an applied-adjustment field | progressScanAnalysis.js:629-636, 850-858 |
| B-F7 | `blurScore` computed over letterbox padding → false `too_blurry` on tall photos | restrict to `contentRect` (mirror `lightingScore`) | progressScanVision.js:757 |

Plus the highest-value deliverable: **invariant/property tests** — garbage-in-never-throws,
bounds ∈ [0,100], band coverage, every-current-withhold-withholds, scan-never-moves-a-floor,
setup-change-never-becomes-delta, and (once the decisions below are made) global monotonicity.

---

## Founder decisions (change a valid capture's score, or a pinned-test conflict, or need device validation — NOT pre-decided)

### D1 — Monotonicity: a leaner body can score lower
- **A-F1 (HIGH, latent):** the piecewise `estimateWeight` step (`estimateScore>=80 && gap>=15 ? 0.75 …`) makes a body rated ~0.5% **leaner** score ~4 points **lower**. Masked today by the provisional ±8 clamp; **goes live the moment the estimator JSON status flips to `validated`** (by design, no code change). progressScanAnalysis.js:654.
- **A-F2 (MEDIUM, LIVE today):** `frontBackWaistSpread` is folded into the **score** (weight 0.10), so a leaner-but-front/back-asymmetric read scores lower via the consistency penalty. progressScanAnalysis.js:497, 515.
- **Options:** (a) make the weight a continuous function of gap (no step) + route spread into confidence only; (b) gate the boost so a lean estimate can only pull the score *up*, never over-pull a leaner silhouette *down*; (c) accept and document the non-monotonicity as intended. Then land the global-monotonicity property test.

### D2 — `bodyAreaRatio` is a camera-distance measure scored as body shape
- **B-F1 (HIGH):** `bodyAreaRatio = foreground/contentArea` scales ~1/distance², yet it is a scored component (0.15), an estimator term, and a required ratio. Distance alone swings the score ~10 points; standing farther reads "leaner." The corpus distance-invariance test holds `bodyAreaRatio` fixed, so it does not actually catch this. progressScanVision.js:675, progressScanAnalysis.js:514.
- **Options:** (a) redefine the scored area signal as `foreground/bboxArea` (distance-invariant solidity); (b) drop `bodyAreaRatio` from scoring, keep diagnostic-only. **Either recalibrates every existing user's score** and needs the corpus re-tuned + ideally a device check — hence a decision, especially pre-launch.

### D3 — Lean athletes lose anchor protection at high BMI
- **A-F3 (MEDIUM):** a measured-lean silhouette at BMI ≥ 29.25/30/34 (BMI high from muscle) is skipped for the tight lean-protection clamp unless the user set a competition/`very_muscular` profile flag — so the population most prone to body-image harm can have the estimator drag the score down. Masked to −8 today, −24 persisted, live on `validated`. progressScanAnalysis.js:607-625.
- **Options:** grant the tight limit whenever `isLeanSilhouetteForAnchorProtection` is true regardless of BMI; or add a lean-mass inference independent of the competition flag.

### D4 — Withhold vs soft-warning on unreliable captures (pinned-test conflict)
- **B-F4 / C-F2 (MEDIUM):** `segmentation_low_confidence` (<0.30), `clothing_or_background_uncertain`, and `camera_tilted` are soft warnings — the scan is still scored at Low tier. A sub-0.30-confidence mask is the score's own input declared unreliable. A pinned test (`progressScanAnalysis.test.js:330-388`) locks the current score-at-Low behaviour, so this is a spec-vs-code conflict.
- **Options:** (a) promote these to withhold reasons (more abstentions, safer); (b) keep score-at-Low and amend the corpus to record it as intentional. Related non-decision: B-F3 (fixed-fraction landmark rows misread under leg-crop) and B-F2 (EXIF orientation stripped before the orientation-correcting analysis) are vision-algorithm fixes that need on-device validation.

---

## Full agent reports
Preserved verbatim in the session transcript (2026-07-12). Each lane's "top 3
invariant tests" are the build list for the property-test suite once D1–D4 are ruled.
