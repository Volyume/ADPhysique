# Volyume — Fitness & Bodybuilding Logic Audit

Date: 2026-06-03. Repo: `main` @ `08e28e6`. Scope: read-only. No source
files changed.

Method: four parallel deep-reads of the domain code, with the headline
maths verified by hand against the source (BMR equations, the two
weekly-volume counters, the deload thresholds, the weight-trend EMA, the
two landmark tables). Every file:line below was read directly.

## The one structural theme

Almost every defect in this report traces to a single root cause: **the
same concept is implemented more than once, and the copies disagree.**

- **2** weekly-volume-per-muscle counters (`calculateWeeklyVolume` vs
  `getWeeklyVolumeByMuscle`), rendered on the same screen.
- **2** muscle-volume landmark tables (`VOLUME_LANDMARKS` in
  `algorithms.js` vs `SPEC_LANDMARKS` in `planEngine.js`), driving
  different stages of the same plan pipeline.
- **4** progression engines (`getProgressionSuggestion`,
  `computeSetTargets`, `getProgressionPath`, `checkDoubleProgressionReady`)
  that give different advice on the same session.
- **5** deload deciders (`shouldDeload`, weeklyCoach, `evaluateAutoReg`,
  `computeAdaptiveDecision`, blockAdvisor) with no reconciliation layer.
- **2** functions called "EMA" using different maths (one time-aware, one
  not), plus **3** muscle-allocation models (primary+0.5-secondary,
  primary-only-RIR-weighted, primary-only-integer).
- **4** different soreness scales (1-3, 1-4, 1-5, continuous) feeding the
  deload paths.

A user can therefore be told "progress this lift" on one screen and
"you've plateaued, swap it" on another, or see chest at 14 sets on the
heatmap tile and 10 sets on the trend line directly beneath it, for the
same week. The numbers are individually defensible; the contradictions
between them are the product problem.

Below, each of the twelve areas in the requested format: current
implementation → problems → how elite evidence-based apps approach it →
recommendations.

---

## 1. Volume calculations

### Current implementation
- `calculateWeeklyVolume(sets, exerciseMap)` (`algorithms.js:122-172`):
  per set, drops only `set_type === 'warmup'` (`isHardSet`,
  `algorithms.js:116-119`), adds **+1 working set** to the primary muscle
  plus reps and `weight × actualReps` tonnage, and **+0.5** working set to
  each secondary muscle (sets only, no reps/tonnage).
- `getWeeklyVolumeByMuscle(userId)` (`database.js:1532-1590`): a **second,
  independent** SQL implementation that counts **+1 to the primary muscle
  only**, integer, **no secondaries**, bucketed into rolling 7-day windows.
- Landmarks: `VOLUME_LANDMARKS` (`algorithms.js:13-39`), weekly **set**
  counts MV/MEV/MAV/MRV for 17 muscles (e.g. chest 4/6/14/22, back
  8/10/16/25, side_delts 0/8/16/26).
- `calculateTonnage` (`algorithms.js:89-96`): Σ `weight × reps` over
  non-warmup sets.

### Problems
- **Headline (P1.1):** the two counters disagree, and `VolumeHeatmapScreen`
  renders **both at once** — current-week tiles from `calculateWeeklyVolume`
  (primary + 0.5×secondary, float), the 4-week trend chart from
  `getWeeklyVolumeByMuscle` (primary-only, int). Same week, different
  numbers for the same muscle. Verified by reading both.
- **Float sets vs integer landmarks (P1.4):** secondaries make
  `workingSets` a float (e.g. 22.4); the MRV check `workingSets > mrv`
  (`algorithms.js:557`) uses the raw float, tripping a 22-set MRV the user
  never reached in countable sets.
- **Dropset contract is false (P1.3):** the comment at `algorithms.js:100`
  claims tonnage excludes dropsets; `isHardSet` only excludes warmups, so
  dropsets count fully toward both volume and tonnage. Verified at line 118.
- **Mixed-unit tonnage (P1.5):** `weight` is stored in the user's display
  unit and never normalised, so a user who switched kg↔lb has a
  meaningless summed tonnage and a broken acute:chronic workload ratio.
- **Silent set loss (P2.2):** sets on an unknown/deleted exercise, or a
  custom exercise with no `primary_muscle`, vanish from totals — and the
  two paths drop under *different* conditions, widening the divergence.

### How elite evidence-based apps approach it
RP Hypertrophy and the Stronger-By-Science tools settle on **one**
fractional-set model and apply it everywhere: a direct (target-muscle) set
counts 1.0, an indirect set a fixed fraction (commonly 0.5, sometimes 0),
and the *same* number drives the chart, the landmark comparison, and the
coaching. Volume is integer-rounded for display only. Loads are normalised
to a single internal unit (kg) so tonnage and fatigue proxies are
unit-stable. "Stimulating reps near failure," not raw sets, is the more
modern currency, but the non-negotiable is internal consistency.

### Recommendations
1. **Delete one counter.** Make `getWeeklyVolumeByMuscle` call the same
   pure `calculateWeeklyVolume` model (push the secondary logic into SQL or
   pull the trend into JS). One function, one number, everywhere.
2. Compare landmarks against an **integer** rounded set count; keep the
   float only internally.
3. Normalise `weight` to kg at the data layer for all tonnage/workload
   maths; keep display units at the presentation layer only.
4. Fix the `isHardSet`/tonnage comment, and decide explicitly whether a
   dropset is 1 set or a fraction — then apply that decision in one place.
5. Surface dropped sets (unknown muscle) as a data-quality nudge rather
   than silently discarding them.

---

## 2. Muscle allocation (primary)

### Current implementation
Primary muscle = `exercise.primaryMuscle` lower-cased, with a legacy remap
`shoulders → side_delts` (`algorithms.js:132-134`), repeated in
`calculateEffectiveSets` (`:1010`) and the SQL path (`database.js:1566`).
+1 set to that muscle.

### Problems
- **Inconsistent legacy remap (P2.1):** the same legacy token `'shoulders'`
  maps to **side_delts** as a primary but **front_delts** as a secondary
  (`algorithms.js:162`). One source label, two destinations.
- **No landmark-key validation (P2.3):** a typo'd or custom
  `primary_muscle` ("chests") creates a bucket no landmark or tile ever
  surfaces — the sets are counted into a void.

### How elite apps approach it
A closed, validated muscle taxonomy (enum), with exercise→muscle mappings
curated and version-controlled. No free-text muscle strings reach the
volume engine; custom exercises must pick from the enum.

### Recommendations
1. Normalise the legacy `shoulders` token **once**, at data-read, to a
   single canonical head — not differently per slot.
2. Validate `primary_muscle` against the landmark key set on write
   (custom-exercise creation) and reject/flag unknowns.

---

## 3. Secondary muscle allocation

### Current implementation
Each secondary muscle adds a flat **0.5** working set
(`algorithms.js:159-168`); `const contribution = sec.contribution || 0.5`.
Reps and tonnage are **not** added to secondaries.

### Problems
- **The contribution mechanism is dead code (P3.1):** seed rows store
  secondaries as plain strings (`seedExercises.js`), so `sec.contribution`
  is always `undefined` and the value is **always 0.5**. Worse, `|| 0.5`
  means a future intentional `contribution: 0` is silently overridden to
  0.5. Verified at `algorithms.js:163`.
- **Flat 0.5 regardless of involvement (P3.2):** bench gives front delts
  0.5; deadlift gives quads, glutes **and** hamstrings 0.5 each. Front
  delts accumulate 0.5 from every press — ~6 phantom sets across a pressing
  session — and can be pushed "over MRV" on indirect work alone.
- **Absent from the trend path (P3.3):** `getWeeklyVolumeByMuscle` never
  reads secondaries, which is the visible face of the P1.1 divergence
  (triceps/front delts/rear delts show far lower on the trend than the
  tile).
- **Sets without reps/tonnage (P3.4):** a secondary-only muscle shows "3
  sets, 0 reps, 0 tonnage," breaking any per-set average for it.
- **A third allocation model (P3.5):** `calculateEffectiveSets` (the
  RIR-weighted path) ignores secondaries entirely.

### How elite apps approach it
Per-exercise indirect contributions are **data**, not a constant:
bench→triceps might be 0.5 but bench→front-delt 0.33, curated per movement.
The contribution flows through every consumer identically, and indirect
volume is reported distinctly from direct so a muscle is never flagged
"over MRV" purely on synergist work.

### Recommendations
1. Either populate real per-exercise `contribution` values in the seed
   **or** delete the dead object-form path — don't ship a half-built
   mechanism. If you keep it, change `sec.contribution || 0.5` to
   `sec.contribution ?? 0.5` so an intended 0 survives.
2. Feed secondaries through the *same* path the trend uses, or drop them
   from both — never one and not the other.
3. Track direct vs indirect volume separately; gate MRV on direct (or
   direct + a capped fraction), not on raw direct+0.5.

---

## 4. Progression logic

### Current implementation
Four live engines:
- `computeSetTargets` (`algorithms.js:279-442`) — the real per-set engine.
  Double progression: hit top of rep band with logged RIR ≥1 → load up,
  capped 5% session-over-session, rounded to 0.25; consecutive misses →
  load down; null RIR at top of band → **hold** and prompt for RIR.
- `getProgressionSuggestion` (`algorithms.js:227-276`) — session-average
  based; missing RIR **defaults to 2** (will suggest load increase with no
  RIR logged).
- `getProgressionPath` (`algorithms.js:707-742`) — week-over-week on rep
  averages, **no RIR gate at all**.
- `checkDoubleProgressionReady` (`mesocycle.js:393-431`) — missing RIR
  treated as **9** (full headroom).

### Problems
- **Four engines, four contracts for missing RIR (P1):** hold / +2 / 9 /
  ignored. The same "hit top of range, didn't log RIR" session yields
  *hold*, *add weight*, or *ready to progress* depending on the screen —
  directly violating the codebase's own stated principle that unlogged RIR
  must not drive overload.
- **Averaging hides failure (P3):** `100×12, 100×4` averages to 8 reps and
  reads "in range," masking the failed set.
- **5% cap silently disabled on light loads (P4):** `Math.min(increment,
  maxJump > 0.5 ? maxJump : increment)` (`algorithms.js:330`) — for weights
  ≤10 units the cap is discarded and the full increment applies, allowing
  a ~25% jump on a 5 kg dumbbell.
- **Maintain-forever footguns (P2, P6):** with no configured rep min/max,
  the increase condition becomes `avg ≥ avg+1` (never) and the decrease
  `avg < avg` (never) — the suggestion silently sticks at "maintain."

### How elite apps approach it
RP-style autoregulation: progression is driven by **logged proximity to
failure (RIR)** with one consistent rule, per-set not per-average, and an
explicit "log your RIR to progress" state when data is missing — never an
optimistic default. Increments are absolute-and-relative-bounded (e.g.
min(2.5 kg, 10%)). Bodyweight progression is rep-based with the same
framework.

### Recommendations
1. **Collapse to one engine.** `computeSetTargets` is the soundest
   (per-set, RIR-gated, cap, consecutive-miss logic) — route every surface
   through it and delete the other three, or make them thin wrappers.
2. Standardise the missing-RIR contract to **hold + prompt** everywhere.
3. Fix the 5% cap to `min(increment, max(maxJump, smallestPlate))` so light
   loads still get a sane absolute floor without a 25% relative jump.
4. Never progress on session averages; use the worst/last working set.
5. Add unit tests — these functions currently have **none** (see §13).

---

## 5. Plateau detection

### Current implementation
- `detectPlateau` (`algorithms.js:1037-1076`): looks at the **3 most
  recent** sessions, session **averages**, flags when load and rep gains
  both stall for 2 consecutive comparisons. RIR-agnostic.
- `insightsEngine` `stalled_lift` (`insightsEngine.js:143-158`): **4**
  day-grouped sessions, **top set**, **exact** weight-and-rep equality, AND
  `avgRir ≥ 3` (with `rir ?? 0`).

### Problems
- **Two contradictory definitions (P8):** 3-session-average-RIR-agnostic vs
  4-session-top-set-exact-equality-RIR≥3. The same lift is "plateau, swap
  it" on one screen and nothing on the other.
- **Dead branch (P10):** `detectPlateau` only ever has 3 sessions → at most
  2 comparisons → `consecutiveStalls` caps at 2, so the `≥3 → swap_exercise`
  resolution **can never fire**. Every plateau resolves to
  `change_rep_range`. Verified.
- **Exact equality is too strict (P11):** a lift grinding 100×5/5/6/5 (a
  real stall) isn't flagged because the reps aren't identical across 4
  sessions.
- **Inverted RIR default within one function (P12):** `stalled_lift` uses
  `rir ?? 0` (a non-RIR-logger can never trigger it) while `peaked_lift` in
  the *same file* uses `rir ?? 9`.

### How elite apps approach it
Statistical trend, not equality: fit a slope/EWMA over estimated 1RM (or
e1RM) across a window; flag a stall when the slope is flat within noise
over N sessions, with one shared definition. MacroFactor-style trend
thinking applied to strength.

### Recommendations
1. One detector, defined as **flat e1RM trend over a window** with a
   tolerance band, not exact equality.
2. Use a consistent missing-RIR default (hold/ignore), not 0-vs-9.
3. Handle bodyweight lifts (progress = added reps at fixed load).
4. Remove the unreachable swap branch or extend the window so it's real.

---

## 6. Deload recommendations

### Current implementation
Five deciders, each with its own thresholds and **scale**:
- `shouldDeload` (`algorithms.js:599-637`): 0-100 score, fires ≥50.
- weeklyCoach (`weeklyCoach.js:701-714`): counts ≥2 triggers.
- `evaluateAutoReg` (`mesocycle.js:173-262`).
- `computeAdaptiveDecision`/`evaluateDeloadTriggers` (`algorithms.js:783+,
  1156+`).
- `blockAdvisor` (`blockAdvisor.js:266-296`).

### Problems
- **`shouldDeload` performance axis is a 2-point endpoint compare (P14):**
  `recentReps = last bucket`, `earlierReps = data[0]` — a block that
  cratered mid-way and recovered scores 0; despite the "over 4 weeks"
  comment it ignores the middle.
- **Effectively single-signal (P16):** performance alone = 50 = the trigger
  threshold; the wellness signals (joint 18 + over-MRV 12 + soreness 20)
  only deload if **all** fire. The documented 50/30/20 weighting doesn't
  hold.
- **Confounds intentional rep-range changes (P15):** moving from a 12-15 to
  a 5-8 range reads as `recentReps < earlierReps − 2` → instant deload.
- **One caller hardcodes the time axis (P17):** `CoachReviewScreen.js:335`
  passes `weeksSinceLastDeload: 99` for every bucket, so the joint/soreness
  time gates are always satisfied; `useProgressData.js` computes it
  properly. Same function, two behaviours.
- **Module contradiction (P18, P20):** weeklyCoach can say "deload" (e.g. 6
  weeks into a cut, time-based) while blockAdvisor — whose header insists
  "changes happen when DATA signals it, not time" — says "continue." No
  reconciliation.
- **Single catastrophic week is gated out (P19):** `matrixDeload` needs the
  *previous* week to also be poor, so one soreness-5/energy-1 week raises
  nothing.
- **Four soreness scales (P22):** 1-3, 1-4, 1-5, continuous, across the five
  deciders.

### How elite apps approach it
RP's fatigue model is multi-signal but **one coherent function**:
performance trend (e1RM/reps-at-load), joint/connective discomfort, sleep,
motivation, and accumulated volume relative to MRV — combined into a single
readiness/fatigue score on **one scale**, with the deload recommended once
per planning cycle, not five times by five modules.

### Recommendations
1. **One deload function, one soreness/fatigue scale.** The other call
   sites consume its output.
2. Replace the endpoint rep compare with a **trend slope** over the block,
   and separate "load dropped" from "reps dropped" so a deliberate
   rep-range change isn't read as fatigue.
3. Let a single severe week trigger (remove the prior-week gate for the
   extreme case).
4. Fix `CoachReviewScreen`'s hardcoded `99`; compute weeks-since-deload
   once and pass it consistently.

---

## 7. Exercise categorisation

### Current implementation
RAW tuple → `compoundIsolation` ('compound'|'isolation'), `fatigueCost`
(1-10), `stimulusToFatigueRatio` (1-10), plus derived `equipmentCategory`,
`laterality`, `difficulty`, etc. (`seedExercises.js`, `exerciseMetadata.js`).

### Problems
- **`laterality` is computed, stored, and never used (P4.1):** a unilateral
  set (Bulgarian split squat, single-arm row) counts as exactly **1.0**
  working set — same as a bilateral set — so per-side movements are
  systematically under-counted against set-based landmarks. The stored
  field promises an accounting adjustment that never happens.
- **Dead `'accessory'` category (P4.2):** `defaultIncrement`/
  `computeSetTargets` branch on `'accessory'`, but the data only ever
  produces 'compound'/'isolation'.
- **Magic numbers scattered (P4.4):** default fatigue 3, default SFR 3,
  stretch ×0.3, `targetFatigue + 1` gates — inline literals repeated across
  `getExerciseSubstitutes` with no shared constant.
- **Categorisation disconnected from volume (P4.5):** compound/isolation
  drives increments but not secondary contribution — the very signal that
  *should* inform indirect volume.

### How elite apps approach it
Curated exercise databases (RP, Juggernaut) tag each lift with primary +
weighted secondaries, SFR, fatigue, **and** a per-side flag that the volume
engine honours (a unilateral set = one set per limb of stimulus). The
categorisation feeds the volume model, not just display.

### Recommendations
1. Decide the unilateral convention and **apply** it: either count a
   unilateral set as 2 working sets for the trained limb-muscle, or
   document loudly that volume is per-side-logged. Right now the field is a
   silent lie.
2. Remove the dead `'accessory'` branch or introduce the category for real.
3. Hoist fatigue/SFR/stretch defaults into named constants.

---

## 8. Workout generation

### Current implementation
`generatePlan` → `_generatePlanInner` (`planEngine.js:2029-2255`):
compute per-muscle landmarks (`computeLandmarks`, seeded from
`VOLUME_LANDMARKS`), apply goal/phase/weak-point overlays
(`applyGoalOverlay`), floor/cap (`enforceWeeklyFloorsAndCaps`, using the
**separate** `SPEC_LANDMARKS`), choose a split (`selectSplit` for 3/4/5/6
days, or `DIVISION_MATRIX` for the six physique divisions), build sessions,
trim to a time budget, assign supersets. Deterministic (no `Math.random`).

### Problems (all empirically verified by the audit)
- **Day-counts outside 3-6 → a 6-workout plan (A):** `selectSplit` falls
  through to `ppl_ab` for 1, 2, or 7 days; `effectiveDays` is never
  clamped. A user who picks 2 training days gets six sessions.
- **Short sessions ignored (B):** a 30-minute request produced 56-62-minute
  sessions; `trimToTimeBudget` bails at ≤3 exercises.
- **Two landmark tables drive one pipeline (C):** `VOLUME_LANDMARKS` (seeds
  targets, clamps overlays) vs `SPEC_LANDMARKS` (floors/caps) — they
  disagree materially (side_delts MRV 26 vs 20; traps/rear-delts MEV 4-6 vs
  0; glutes MRV 22 vs 16), against the "single source of truth" comment.
  Verified both exist (`algorithms.js:8` import vs `planEngine.js:254`).
- **Muscles delivered below their own MEV (D, G, I):** general intermediate
  4-day → back 6 sets (MEV 10); 3-day full body → chest/arms/glutes/abs at
  3, traps 0; mens_physique 4-day → judged biceps/triceps at 3 (below MEV).
  The synergist trim (`trimSynergist('biceps','back',0.4)`) compounds it.
- **Bodyweight users get zero shoulders and zero biceps (E):** the pool has
  no bodyweight side-delt/front-delt/biceps entry and there's no fallback;
  plus cross-session duplicate exercises (F).
- **Antagonist imbalance (H):** bodybuilding 6-day → quads 10, hamstrings 6,
  from asymmetric subregion thresholds and overlays.
- **Tracker-vs-generator contradiction (R):** the generator sets traps to 0
  (SPEC MEV 0) while the tracker flags traps "lagging" (algorithms MEV 4).
- **Swap preserves muscle but not volume or subregion coverage (P):** sets
  carry over from the old row regardless, and `SUBREGION_REQUIREMENTS`
  aren't re-checked, so a swap can leave a required movement uncovered.
- **The "5-6 week, +1 set/week, deload" mesocycle is narrative-only:** the
  "Why this" copy promises week-by-week progression the generated plan data
  never encodes (`planEngine.js:1826`).

### How elite apps approach it
RP, Juggernaut AI, and Boostcamp build from **validated templates** keyed to
days/week and goal, with the volume model and the generator sharing **one**
landmark table; every muscle lands within MEV-MRV by construction, time
budget is honoured by capping exercises/sets up front, and equipment
filtering falls back to a substitute that preserves the muscle and its
required movement patterns. Mesocycle progression (volume ramp + deload) is
encoded as data the app actually executes, not prose.

### Recommendations
1. **Unify on one landmark table** (`VOLUME_LANDMARKS`) for both the
   generator and the tracker; delete `SPEC_LANDMARKS`.
2. **Clamp `effectiveDays` to [2,6]** (or support 2 explicitly) before
   `selectSplit`, and add a 1-2 day split.
3. Make the time budget a hard constraint: cap total sets to fit the
   requested minutes before exercise selection.
4. Guarantee every trained muscle ≥ its MEV (post-floor assertion); fail
   loudly in tests if any muscle ships below MEV.
5. Give bodyweight (and minimal-equipment) users a fallback pool so no
   muscle is zeroed; dedupe across sessions, not just within.
6. After a swap, re-validate set count and subregion coverage.
7. Encode the mesocycle ramp/deload as plan data, or stop promising it.

---

## 9. Recovery calculations

### Current implementation
- `recoveryEMA.emaValue` (`recoveryEMA.js:23-36`): **time-aware** half-life
  weighted mean, `weight = 0.5^(ageDays/7)`, half-life 7 days. Correct for
  irregular spacing.
- `weeklyCoach.computeEWMA` (`weeklyCoach.js:30-40`): recursive α-EWMA
  (α=0.1) over bodyweight, **ignores actual time gaps**.
- `blockAdvisor.checkinReadiness` (`blockAdvisor.js:45-51`):
  `energy×0.4 + soreness_inv×0.4 + sleep×0.2`, plus a z-score vs a 2-8 week
  baseline.

### Problems
- **Two "EMA"s, different maths (P25):** the recovery one is time-decayed
  and order-independent; the bodyweight one is recursive and treats 1-day
  and 10-day gaps identically — so irregular weigh-ins distort the trend.
- **Missing fields default to mid-range (P29):** `energy ?? 3, soreness ??
  3, sleep ?? 7` — a sparse check-in scores as "fine," suppressing the
  low-readiness signal. Missing data reads as average data.
- **Unstable early z-scores (P30):** baseline fires at ≥2 points with biased
  sample SD; two close readings give a tiny SD, so a normal third reading
  trips "well below baseline."
- **Scale mismatches (P32, P33):** `computeAdaptiveLandmarks` defaults
  soreness on a 1-5 scale and has an **unclamped MRV** drift; the fatigue
  deload threshold (4.3) assumes 1-5 with no range guard on the source
  field.

### How elite apps approach it
Time-aware smoothing everywhere (EWMA over actual timestamps, or HRV-based
readiness à la Whoop/Oura). Missing inputs lower **confidence**, they don't
impute the median. Baselines require a minimum n before firing, with
population-corrected variance.

### Recommendations
1. Use the time-aware `emaValue` for the bodyweight trend too (one EMA).
2. Treat missing check-in fields as **reduced confidence**, not 3/3/7.
3. Gate the z-score on a larger minimum n; use sample-corrected SD.
4. Validate and clamp soreness/fatigue scales at ingestion; clamp the MRV
   adjustment like MEV/MAV.

---

## 10. Weight-trend calculations

### Current implementation
- `computeEWMA` (`nutritionEngine.js:159-168`, α=0.28) and a second EWMA in
  weeklyCoach (α=0.1) — both seed from the first raw reading.
- `computeWeeklyWeightChange` (`nutritionEngine.js:194-199`):
  `ewmaData[len-1] − ewmaData[len-8]` — **pure index arithmetic**, assumes
  one reading per day.
- `getEwmaSevenDaysAgo` (`weeklyCoach.js:70-77`): timestamp-based, returns
  the closest reading at-or-before 7 days ago.

### Problems
- **Index-based rate assumes daily logging (P2, verified):** `len-8` is "7
  days ago" only if logging is exactly daily. A user logging 3×/day reaches
  "3 weeks confidence" in 7 calendar days and the kg/week rate spans ~2.3
  days — reading ~3× too fast. The docstring even admits the assumption.
- **"7 days ago" can span 4-11 days (P26):** `getEwmaSevenDaysAgo` returns
  the nearest older reading, so the "weekly" rate (and every calorie /
  rapid-loss decision built on it, `weeklyCoach.js:426-440, 515-520`) can be
  computed over an 11-day or 4-day interval while labelled weekly.
- **No outlier/water-weight handling (P3):** both EWMAs seed from the first
  raw point with no spike filter; a single carb-load or mistyped reading
  biases the early trend — exactly when calorie adjustments begin.
- **Maintenance "on-target" band collapses (P6):** the tolerance is `0.2 ×
  |goalRate| + 0.05`, so at maintenance/recomp it's ±0.05-0.075 %BW/week —
  normal noise reads "off target" almost every week, while aggressive cut
  gets ±0.25%.

### How elite apps approach it
MacroFactor and TrendWeight smooth bodyweight with a **date-anchored** EWMA
(Hacker's Diet lineage) and compute the rate as a **regression slope over a
fixed calendar window**, robust to multiple-logs-per-day and missing days.
Confidence scales with calendar coverage, not raw point count.

### Recommendations
1. Compute the weekly rate from **timestamps** (slope per calendar day ×7),
   never array indices; de-duplicate to one reading/day (or average within
   day) first.
2. Use one date-anchored EWMA; seed from a short median, not point 0.
3. Add a simple outlier guard (clamp daily change beyond a plausible bound).
4. Make the on-target band a sensible absolute floor (e.g. ±0.15 %BW/week)
   so maintenance isn't perpetually "off."

---

## 11. Calorie calculations (TDEE)

### Current implementation
- BMR (`calcBMR`, `nutritionEngine.js:334-352`): **Mifflin-St Jeor**, or
  **Katch-McArdle** when a credible non-visual BF% exists. Both verified
  textbook-correct.
- Maintenance = `BMR × activity multiplier` (1.2-1.725, deliberately
  deflated from textbook).
- Phase adjustment: lean_gain +10% … aggressive_cut −22%, contest_prep
  −28%; kcal floors 1500 M / 1200 F; hard loss-rate cap at 1.5 %BW/week.
- `computeAdaptiveTDEEAdjustment` (`:214-328`): discrepancy-based, dampened
  to 50%, FFM-floor clamped.

### Problems
- **"Adaptive TDEE" isn't fed back into targets (P9, verified):**
  `getPlanNutritionContext` passes the **static** `maintenanceKcal` as the
  TDEE estimate (`:844`) and returns the adjustment as a **separate
  informational field** — the returned `targetKcal` stays static. The real
  calorie change runs through weeklyCoach's fixed ±100/125/150 steps, which
  don't use the discrepancy maths at all. The principled mechanism is not
  in the loop.
- **`contest_prep` is dead from the UI (P7), `aggressive_cut` reachable from
  only one of two entry points (P8):** the steepest-deficit logic (−28%,
  contest refeeds, the contest safety warning) is unreachable via the goal
  pickers; the Pro flow maps "cut" → mild_cut (−13%) while the standalone
  Nutrition screen allows −22%. Two entry points, two deficit ceilings for
  the same goal.
- **`bulk` phase silently coached as maintenance (#24, verified):**
  `PHASE_CONFIG` has no `bulk` key, so `phaseConfig` falls to
  `PHASE_CONFIG.maint` (`weeklyCoach.js:195`) — a build-muscle user is
  coached at goal rate 0% and never recognised as on-target for a surplus.
- **Confidence inflated by multi-log days (P10):** `weeks =
  floor(points/7)` reaches "high confidence" in <2 calendar weeks for a
  frequent logger.
- **Floor vs FFM-floor disagreement (P13):** the 1200 F / 1500 M floor sits
  *below* the FFM-derived floor (~1400 for a 65 kg woman), and the FFM floor
  isn't consulted at target-generation time.
- **BF% ignored in the Pro onboarding path (#22):** `ProGoalSetupScreen`
  passes `bodyFatPct` without `bodyFatSource`, so credibility checks fail
  and everyone falls to Mifflin + bodyweight protein.

### How elite apps approach it
MacroFactor's defining feature: TDEE is **dynamically estimated from actual
intake and weight change** (energy-balance reconciliation), with the static
equation only as a cold-start seed. The adaptation *is* the target engine,
not an info card. Deficits are expressed as a rate (%BW/week) and the app
holds that rate by adjusting calories — one mechanism, not two.

### Recommendations
1. **Feed the adaptive TDEE back into the target** (or delete it). Pick one
   correction mechanism — the discrepancy estimator — and retire the
   fixed-step path, or make the fixed step a fallback only.
2. Reconcile the phase vocabularies (`bulk`/`contest_prep`/`aggressive_cut`)
   across the goal pickers, `PHASE_CONFIG`, and `PHASE_ADJUSTMENTS` — one
   enum, every goal reachable, no silent fall-through to maintenance.
3. Consult the FFM floor at target generation, and raise the static floor
   to never sit below it.
4. Fix the Pro onboarding to pass `bodyFatSource` so a real BF% is used.

---

## 12. Protein calculations

### Current implementation
`calcProtein` (`nutritionEngine.js:414-456`): per-goal rates in both g/kg
**lean mass** and g/kg **bodyweight**, LBM rates only with a credible BF%
else bodyweight rates, `protein = max(rate × basis, floor × weightKg)`.
Per-meal split = `protein / mealFrequency`.

### Problems
- **Advertised range ≠ delivered number (P15):** the UI labels show the
  **LBM** ranges ("optimised 2.5-3.0 g/kg") but the common no-BF% path uses
  the **bodyweight** table (optimised maintain 2.2 g/kg). A user is told
  2.5-3.0 and gets 2.2.
- **The 2.2 g/kg cap is a dead no-op and contradicts the defaults (P14,
  P17):** `PROTEIN_MAX_GKGBW = 2.2` is applied only to a local used for
  refeed maths and never returned, so it has no effect — while the engine's
  own optimised lean_gain BW rate is 2.5 and advanced 2.8, both above the
  "cap."
- **Custom protein has no ceiling (P18):** `max(customGPerKg × weightKg,
  floorG)` — a fat-fingered "10" yields 10 g/kg with no clamp.
- **High-BF LBM path can under-deliver (P16):** for an obese user with DEXA,
  LBM rates can fall below the bodyweight equivalent; only the floor rescues
  it, partly inverting the table's intent.
- **Silent wrong-rate fallback (P19):** if a physique goal key is passed
  where a phase key is expected, `approach.bw[goal] ?? approach.bw.maintain`
  silently returns the maintenance rate.

### How elite apps approach it
A single, clearly-stated basis — most evidence-based apps use **g/kg total
bodyweight** (≈1.6-2.2 for hypertrophy, up to ~2.6-3.1 g/kg *lean* mass for
lean contest prep) — and the number shown equals the number delivered, with
a sane upper clamp. Lean-mass scaling is offered only when BF% is credible
and is explained.

### Recommendations
1. Make the displayed range equal the delivered basis (don't show LBM ranges
   on the bodyweight path).
2. Apply a real upper clamp (~2.2 g/kg BW for general, higher only for
   credible-lean contest prep) to **all** paths including custom; fix the
   dead cap.
3. Use `??` not truthiness for rate lookups, and warn (not silently fall
   back) on an unknown goal key.

---

## 13. Cross-cutting findings & test gaps

- **`shouldSuggestDietBreak(null,…)`** treats a null start date as epoch-0 →
  ~2900 weeks → spurious "diet break" suggestion (`nutritionEngine.js:675`).
- **No unit assertion** in `calculateNutritionTargets`: a caller passing lbs
  as `weightKg` is accepted silently up to the 350 clamp.
- **Test coverage gap:** `shouldDeload`, `detectPlateau`,
  `computeAdaptiveDecision`, `getProgressionSuggestion`, `computeSetTargets`,
  `getProgressionPath`, `computeAdaptiveLandmarks` have **no direct unit
  tests**. The four highest-impact training defects (dead plateau branch,
  endpoint-only deload, single-signal deload, light-load jump cap) all sit
  in untested functions. The volume counters and the two landmark tables
  also lack a consistency test that would have caught the divergence.

---

## Severity ranking (for triage)

**Tier 1 — user sees contradictory or wrong numbers**
1. Two weekly-volume counters on the same screen (§1).
2. Adaptive TDEE computed but never applied; calories driven by a separate
   fixed-step path (§11).
3. Index-based weekly weight rate + inflated confidence for multi-log users
   (§10).
4. Two landmark tables; muscles generated below their own MEV; `bulk`
   coached as maintenance (§8, §11).
5. Four progression engines / five deload deciders giving different advice
   (§4, §6).

**Tier 2 — wrong for a subset / safety-adjacent**
6. Bodyweight users get zero shoulders/biceps (§8).
7. Protein advertised ≠ delivered; dead 2.2 cap; uncapped custom (§12).
8. Static kcal floor below the FFM floor; BF% ignored in Pro onboarding
   (§11).
9. Light-load 25% jump; missing-RIR optimistic defaults (§4).

**Tier 3 — latent / dead code / hygiene**
10. Dead plateau swap branch; dead `contribution`/`accessory`/`contest_prep`
    paths; unilateral field never used; magic numbers; missing tests.

The single highest-leverage fix is **de-duplication**: one volume counter,
one landmark table, one progression engine, one deload decider, one TDEE
loop. Most Tier-1 contradictions dissolve the moment each concept has a
single implementation.
