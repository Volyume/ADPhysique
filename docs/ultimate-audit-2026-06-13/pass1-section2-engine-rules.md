# PASS 1 — SECTION 2: ENGINE RULES & THRESHOLDS REGISTER (rebuild)

Method: rebuilt by the orchestrator's OWN direct transcription (grep -n / Read on the
actual files), NOT via delegated sub-agents. The two prior agent attempts fabricated
values (they delegated to sub-agents that substituted textbook RP/Israetel landmark
numbers for the real code). Every entry below was read off the file line and pasted
verbatim. The orchestrator spot-check is therefore against the same lines.

STATUS: IN PROGRESS — this file is built file-by-file, verified-first. Files transcribed
so far: `algorithms.js` (VOLUME_LANDMARKS), plus the cross-file SAFETY constants
(`nutritionEngine.js`, `coachApply.js`, `edPatternDetector.js`). Remaining engine files
are listed at the bottom under "NOT YET TRANSCRIBED" and WILL be completed — none dropped.

Format per entry:
RULE | FILE:LINE (exact) | CODE AT THAT LINE (verbatim) | VALUE | INPUTS→OUTPUT | hardcoded/configurable | match check

---

## algorithms.js — VOLUME_LANDMARKS (weekly set landmarks per muscle)

RULE: VOLUME_LANDMARKS (object)
FILE:LINE: src/lib/algorithms.js:20-54 (genuine multi-line object literal)
CODE AT THOSE LINES (verbatim, comment lines omitted only where noted):
```
20: export const VOLUME_LANDMARKS = {
21:   chest:       { mv: 4,  mev: 6,  mav: 14, mrv: 22 },
22:   back:        { mv: 8,  mev: 10, mav: 16, mrv: 25 },
31:   front_delts: { mv: 0,  mev: 0,  mav: 8,  mrv: 14 },
32:   side_delts:  { mv: 0,  mev: 8,  mav: 16, mrv: 26 },
33:   rear_delts:  { mv: 0,  mev: 6,  mav: 16, mrv: 24 },
34:   biceps:      { mv: 5,  mev: 6,  mav: 14, mrv: 22 },
35:   triceps:     { mv: 4,  mev: 6,  mav: 14, mrv: 22 },
36:   forearms:    { mv: 2,  mev: 4,  mav: 16, mrv: 22 },
37:   quads:       { mv: 6,  mev: 8,  mav: 14, mrv: 20 },
38:   hamstrings:  { mv: 4,  mev: 6,  mav: 14, mrv: 20 },
43:   glutes:      { mv: 0,  mev: 4,  mav: 14, mrv: 22 },
48:   adductors:   { mv: 0,  mev: 0,  mav: 10, mrv: 14 },
49:   calves:      { mv: 6,  mev: 8,  mav: 14, mrv: 20 },
50:   abs:         { mv: 0,  mev: 4,  mav: 16, mrv: 25 },
51:   traps:       { mv: 0,  mev: 4,  mav: 14, mrv: 24 },
52:   neck:        { mv: 0,  mev: 2,  mav: 8,  mrv: 12 },
53:   tibialis:    { mv: 0,  mev: 2,  mav: 8,  mrv: 12 },
54: };
```
(lines 23-30, 39-42, 44-47 are explanatory comments inside the object; muscle entries
are exactly the 17 rows above — chest, back, front_delts, side_delts, rear_delts, biceps,
triceps, forearms, quads, hamstrings, glutes, adductors, calves, abs, traps, neck, tibialis.)
VALUE: per-muscle {mv, mev, mav, mrv} weekly working-set landmarks, exactly as the rows above.
INPUTS→OUTPUT: muscle key → its mv/mev/mav/mrv landmark set (used by volume-status + plan landmark derivation).
HARDCODED/CONFIGURABLE: hardcoded constant.
Value as written matches the code at the cited lines: confirmed (transcribed from Read of algorithms.js:20-54).
COMPLETENESS: VOLUME_LANDMARKS defines 17 muscles, lines 20-54. Keys in file order:
chest, back, front_delts, side_delts, rear_delts, biceps, triceps, forearms, quads,
hamstrings, glutes, adductors, calves, abs, traps, neck, tibialis.
Row count in register: 17. Matches source object: confirmed.

### algorithms.js — remaining rules (read in full, lines 1-1548; every CODE field below transcribed from that read)

RULE: calculate1RM ensemble | FILE:LINE: 95-100
CODE: `const r = Math.min(reps0, 20);` / `const epley = w * (1 + r / 30);` / `const brzycki = w / (1.0278 - 0.0278 * r);` / `if (r <= 10) return epley * 0.6 + brzycki * 0.4;` / `return (epley + brzycki) / 2;`
VALUE: reps clamped at 20; r<=10 → 0.6·Epley+0.4·Brzycki; r>10 → mean(Epley,Brzycki); reps===1 → weight (:87)
I/O: (weight,reps)→estimated 1RM | hardcoded | confirmed

RULE: allocateExerciseVolume secondary contribution | FILE:LINE: 172
CODE: `const contribution = (sec && typeof sec === 'object' ? sec.contribution : undefined) ?? 0.5;`
VALUE: primary muscle = 1 set; each secondary = its contribution, default 0.5 | hardcoded default | confirmed

RULE: getVolumeStatus bands | FILE:LINE: 227-242
CODE: `if (!Number.isFinite(workingSets) || workingSets <= 0)`→below; `if (workingSets < mev)`→below; `if (mev > 0 && workingSets <= mev + 2)`→minimum; `if (workingSets <= mav)`→optimal; `if (workingSets <= mrv)`→near_mrv; else over_mrv
VALUE: below / minimum(mev..mev+2) / optimal(..mav) / near_mrv(..mrv) / over_mrv(>mrv) | hardcoded | confirmed

RULE: defaultIncrement | FILE:LINE: 251-260
CODE: lbs `isolation>=45?2.5:1.25` (:253), `accessory>=90?2.5:1.25` (:254), `compound>=135?5:2.5` (:255); kg `isolation>=20?1:0.5` (:257), `accessory>=40?1.25:0.75` (:258), `compound>=60?2.5:1.25` (:259)
VALUE: as above by unit+category | hardcoded | confirmed

RULE: getProgressionSuggestion bands/headroom | FILE:LINE: 278-279, 304, 329
CODE: `const min = targetRepsMin || 6;` `const max = targetRepsMax || 12;`; increase only `if (prevAvgRIR >= 1)`; decrease `if (prevAvgReps < min && rirLogged && prevAvgRIR <= 1)`
VALUE: default band 6-12; load↑ only if RIR logged & ≥1; load↓ if under min & RIR≤1 | hardcoded | confirmed

RULE: computeSetTargets progression | FILE:LINE: 354-355, 400-404, 420, 436-438
CODE: `const min = repMin || 6;` `const max = repMax || 12;`; `const maxJump = prevWeight * 0.05;` `const capped = Math.min(increment, maxJump);` `const rounded = Math.round(capped * 4) / 4;` `targetWeight = prevWeight + Math.max(0.25, rounded);`; `const consecutiveMiss = missAmount >= 2 && (min - prevPrevReps) >= 2;`; layoff `targetWeight = Math.round(targetWeight * layoffMultiplier * 4) / 4;`
VALUE: 5% session cap on load jump; round 0.25; +0.25 floor; auto-drop only on 2 consecutive misses ≥2; layoff multiplier reduces load | hardcoded | confirmed

RULE: detectPR 1RM threshold | FILE:LINE: 530
CODE: `if (best1RM > 0 && new1RM > best1RM * 1.001)`
VALUE: estimated-1RM PR fires at >0.1% over best; also heaviest-weight (:545) and most-reps-at-weight (:559) | hardcoded | confirmed

RULE: PR_TYPE_RANK | FILE:LINE: 576-580
CODE: `'1rm_estimate': 3,` `heaviest_weight: 2,` `most_reps_at_weight: 1,`
VALUE: PR significance ranking | hardcoded | confirmed

RULE: getAutoRegSuggestion | FILE:LINE: 646, 651, 658, 665, 676, 689, 695
CODE: `if (sessionDifficulty >= 4 && soreness24hBefore >= 2)`→reduce_volume; `else if (sessionDifficulty <= 2 && soreness24hBefore === 0 && fatigueLevel >= 4)`→add_volume; `if (jointDiscomfort >= 2)`→reduce_weight; `if (overallPump === 3 && sessionDifficulty <= 3 && !perMuscleStimulusRatings?.length)`→increase_load; `if (data.workingSets > landmarks.mrv)`→deload_muscle; `if (musclePump <= 2 && data.workingSets >= (landmarks.mev || 2))`→swap_exercise; `else if (musclePump >= 4 && data.workingSets < (landmarks.mav || landmarks.mrv))`→add_muscle_volume
VALUE: session+per-muscle autoreg suggestions as above | hardcoded | confirmed

RULE: shouldDeload scoring | FILE:LINE: 727, 735-736, 745-746, 750-752, 757-758, 763
CODE: `if (!last4WeeksData || last4WeeksData.length < 2)` guard; `if (earlierReps > 0 && recentReps < earlierReps - 2)` `score += 50;`; `if (avgJointDiscomfort >= 1.5 && weeksSinceDeload >= 3)` `score += 18;`; `if (overMRVWeeks >= 2)` `score += 12;`; `if (highSorenessWeeks >= 3 && weeksSinceDeload >= 4)` `score += 20;`; `return { deload: score >= 50, reasons };`
VALUE: weights perf 50 / joint 18 / overMRV 12 / soreness 20; deload at score≥50; needs ≥2 weeks data; soreness band high = avgSoreness≥2.5 (:757) | hardcoded | confirmed

RULE: STRETCH_SCORE | FILE:LINE: 769
CODE: `const STRETCH_SCORE = { high: 2, medium: 1, low: 0 };` | hardcoded | confirmed

RULE: getExerciseSubstitutes | FILE:LINE: 785, 787, 807-809, 812
CODE: `if (exMuscle !== primaryMuscle) return false;`; `if (exFatigue > targetFatigue + 1) return false;`; `const scoreA = sfrA + stretchA * 0.3;` `return scoreB - scoreA || fatigueA - fatigueB;`; `return candidates.slice(0, 3)`
VALUE: same primary muscle; fatigue ≤ target+1; sort SFR + stretch·0.3, fatigue tiebreak; top 3 | hardcoded | confirmed

RULE: PLATE_SETS / DEFAULT_BAR_WEIGHT | FILE:LINE: 836-840
CODE: `kg:  [25, 20, 15, 10, 5, 2.5, 1.25],` `lbs: [45, 35, 25, 10, 5, 2.5],`; `DEFAULT_BAR_WEIGHT = Object.freeze({ kg: 20, lbs: 45 });`
VALUE: plate denominations + bar weights per unit | hardcoded | confirmed

RULE: computeAdaptiveDecision ladder | FILE:LINE: 874, 884, 894, 904, 915, 924, 933-935, 942
CODE: `if (joint >= 3)`→rotate_exercise; `if (performance === 4 && soreness >= 3)`→deload_trigger; `if (soreness === 4)`→drop_set delta -1; `if (joint >= 2)`→hold; `if (soreness <= 2 && performance <= 2)` then `if (pump === 1)`→add_set delta 2, `if (pump === 4 && soreness === 2)`→hold, else add_set delta 1; `if (performance >= 3 && soreness <= 3)`→hold; default hold
VALUE: per-muscle adaptive set decision/delta as above (scales: soreness 1-4, performance 1-4, pump 1-4, joint 0-3 per :866-870) | hardcoded | confirmed

RULE: runAdaptiveEngine clamp | FILE:LINE: 979
CODE: `nextWeekSets = Math.round(Math.max(mev, Math.min(mrv, nextWeekSets)));`
VALUE: next-week sets clamped to [mev, mrv] | hardcoded | confirmed

RULE: computeAdaptiveLandmarks | FILE:LINE: 1005, 1020, 1031-1036, 1041
CODE: `if (entries.length < 3)` use defaults; `const recent = entries.slice(-8);`; `(avgPump - 3) * 0.3` / `-(avgSoreness - 2) * 0.4` / `-(avgJoint) * 0.8` / `avgPerf * 0.8` / `Math.min(avgPRFreq * 0.3, 0.6)` / `-(avgMissed * 0.6)`; `const adjustment = Math.round(Math.max(-4, Math.min(4, netScore * 2)));`
VALUE: needs ≥3 data points; last 8; signal weights pump .3 / soreness .4 / joint .8 / perf .8 / pr .3(cap .6) / missed .6; adjustment ±4 | hardcoded | confirmed

RULE: computeSessionAdjustments constants+rules | FILE:LINE: 1086-1087, 1112, 1182, 1185, 1188-1191, 1198, 1203-1219, 1262-1266
CODE: `const HOURS_72 = 72 * 60 * 60 * 1000;` `const DAYS_4 = 4 * 24 * 60 * 60 * 1000;`; `if (weeklyContext.isDeload) return [];`; `if (revertCounts[muscle] >= 2)`→HOLD_USER_PREF; `else if (lastJoint >= 2)`→HOLD_JOINT; `else if (soreForM && trainedWithin72h)` drop -1 `if (projectedPlanned - 1 >= mev && plannedSets - 1 >= 1)`; `else if (soreForM)`→HOLD_STALE_SORENESS; R4 `lastPerformance <= 2 && lastPump <= 2 && projectedPlanned < mav && !addedThisWeek.has(muscle)` then +1 `if (projectedPlanned + 1 <= mrv && projectedPlanned + 1 <= mav)`; cap `if (nonzero.length > 2)` keep 2, drops first
VALUE: ±1 set/exercise this session only; deload week silent; ≤72h soreness drop; well-recovered+understimulated add; max 2 adjusted exercises, drops prioritised | hardcoded | confirmed

RULE: _DIFFICULTY_TO_PERFORMANCE | FILE:LINE: 1275
CODE: `const _DIFFICULTY_TO_PERFORMANCE = { 1: 1, 2: 1, 3: 2, 4: 3, 5: 4 };`
VALUE: session difficulty (1-5) → performance (1-4) | hardcoded | confirmed

RULE: buildSessionAdjustmentInput weeklySignal | FILE:LINE: 1328
CODE: `const weeklySignal = vs < 0 ? 'reduce' : vs > 0 ? 'push' : 'hold';`
VALUE: coachOutput.volumeSignal sign → reduce/push/hold | hardcoded | confirmed

RULE: getSetEffectivenessWeight | FILE:LINE: 1354-1360
CODE: `if (rir === null || rir === undefined) return 0.9;` `if (rir <= 2) return 1.0;` `if (rir === 3) return 0.85;` `if (rir === 4) return 0.70;` `if (rir === 5) return 0.50;` `if (rir <= 7) return 0.25;` `return 0.0;`
VALUE: RIR→effective-set weight: null .9 / ≤2 1.0 / 3 .85 / 4 .70 / 5 .50 / 6-7 .25 / 8+ 0 | hardcoded | confirmed

RULE: calculateEffectiveSets RPE fallback | FILE:LINE: 1383
CODE: `else if (set.rpe != null) rirForWeight = 10 - set.rpe;`
VALUE: RIR ≈ 10 − RPE when RIR absent | hardcoded | confirmed

RULE: detectPlateau | FILE:LINE: 1404, 1412, 1425-1426, 1432, 1439-1441
CODE: `if (!exerciseSessions || exerciseSessions.length < 3)` guard; `const recent = exerciseSessions.slice(0, 4);`; `const noLoadGain = currAvgWeight <= prevAvgWeight + 0.01;` `const noRepGain = currAvgReps <= prevAvgReps + 0.5;`; `if (consecutiveStalls < 2)` no plateau; `consecutiveStalls >= 3 ? 'swap_exercise' : 'change_rep_range'`
VALUE: needs ≥3 sessions; weight tol 0.01, reps tol 0.5; <2 stalls none; 2→change_rep_range; ≥3→swap_exercise | hardcoded | confirmed

RULE: getVolumeConfidence | FILE:LINE: 1451-1453
CODE: `if (dataPoints < 3)` low/Estimated; `if (dataPoints < 6)` medium/Learning; else high/Personalised
VALUE: <3 low, <6 medium, ≥6 high | hardcoded | confirmed

RULE: generateDeloadPrescription | FILE:LINE: 1474-1482
CODE: `const deloadWeight = isFirstHalf ? baseWeight : Math.round(baseWeight * 0.5 * 4) / 4;` `const deloadReps = Math.max(1, Math.round(baseReps * 0.5));` `rir: 4,`
VALUE: first half = full weight/50% reps; second half = 50% weight/50% reps; prescribed RIR 4 | hardcoded | confirmed

RULE: detectLaggingMuscles | FILE:LINE: 1491, 1497, 1505
CODE: `export function detectLaggingMuscles(weeklyVolumeHistory = [], minWeeks = 3)`; `if (mev <= 0) continue;`; `if (weeksBelow >= minWeeks)`
VALUE: default 3 consecutive below-MEV weeks; skips mev≤0 muscles | hardcoded default | confirmed

RULE: evaluateDeloadTriggers | FILE:LINE: 1530, 1538
CODE: `if (triggeredMuscles.length >= 2)`→shouldDeload true; `if (triggeredMuscles.length === 1)`→watch (false)
VALUE: ≥2 deload_trigger muscles → deload; 1 → watch only | hardcoded | confirmed

(algorithms.js: also calculateTonnage :104, summariseWorkoutSets :124, isHardSet :134, calculateWeeklyVolume :179, bestPRPerExercise :598, calculatePlates :843, runAdaptiveEngine :963, buildSubstituteReason :818, calculateEffectiveSets :1365 — mechanical helpers with no numeric thresholds beyond those listed above.)

ALGORITHMS.JS COMPLETENESS: file read in full (1-1548). All rule-bearing constants/thresholds/formulas above were transcribed from that read; no grep pattern-matching used to locate them.

---

## nutritionEngine.js — SAFETY & TREND CONSTANTS

RULE: MAX_SAFE_LOSS_RATE
FILE:LINE: src/lib/nutritionEngine.js:103
CODE AT THAT LINE: `const MAX_SAFE_LOSS_RATE = 0.008;   // 0.8 % BW/week`
VALUE: 0.008 (0.8% bodyweight/week — preferred safe loss ceiling)
INPUTS→OUTPUT: weekly loss fraction comparison → safe-rate branch
HARDCODED/CONFIGURABLE: hardcoded
Value as written matches the code at the cited line: confirmed.

RULE: HARD_GATE_LOSS_RATE
FILE:LINE: src/lib/nutritionEngine.js:104
CODE AT THAT LINE: `const HARD_GATE_LOSS_RATE = 0.015;  // 1.5 % BW/week`
VALUE: 0.015 (1.5% BW/week — hard gate for rapid loss)
INPUTS→OUTPUT: lossFraction > HARD_GATE_LOSS_RATE → hard-gate branch (nutritionEngine.js:808)
HARDCODED/CONFIGURABLE: hardcoded
Value as written matches the code at the cited line: confirmed.

RULE: KCAL_PER_KG_FAT
FILE:LINE: src/lib/nutritionEngine.js:105
CODE AT THAT LINE: `const KCAL_PER_KG_FAT = 7700;       // rough energy equivalent of 1 kg body fat`
VALUE: 7700 kcal/kg
INPUTS→OUTPUT: weeklyDelta / KCAL_PER_KG_FAT → weekly rate (nutritionEngine.js:688)
HARDCODED/CONFIGURABLE: hardcoded
Value as written matches the code at the cited line: confirmed.

RULE: DIET_BREAK_THRESHOLD_WEEKS
FILE:LINE: src/lib/nutritionEngine.js:109
CODE AT THAT LINE: `export const DIET_BREAK_THRESHOLD_WEEKS = 8;`
VALUE: 8 weeks in deficit → diet break (used nutritionEngine.js:920)
INPUTS→OUTPUT: weeksInDeficit >= 8 → diet break suggested
HARDCODED/CONFIGURABLE: hardcoded
Value as written matches the code at the cited line: confirmed.

RULE: FFM_FLOOR_KCAL_PER_KG
FILE:LINE: src/lib/nutritionEngine.js:119
CODE AT THAT LINE: `export const FFM_FLOOR_KCAL_PER_KG = 30;`
VALUE: 30 kcal per kg fat-free mass/day (IOC RED-S energy-availability floor)
INPUTS→OUTPUT: ffmKg * 30 → floorKcal (nutritionEngine.js:614,623); deficit refused at/below it
HARDCODED/CONFIGURABLE: hardcoded
Value as written matches the code at the cited line: confirmed.

RULE: PROTEIN_MAX_GKGBW
FILE:LINE: src/lib/nutritionEngine.js:133
CODE AT THAT LINE: `export const PROTEIN_MAX_GKGBW = 2.2;`
VALUE: 2.2 g/kg bodyweight (standard protein cap; used nutritionEngine.js:951)
INPUTS→OUTPUT: protein target cap
HARDCODED/CONFIGURABLE: hardcoded
Value as written matches the code at the cited line: confirmed.

RULE: PROTEIN_CUSTOM_MAX_GKGBW
FILE:LINE: src/lib/nutritionEngine.js:138
CODE AT THAT LINE: `export const PROTEIN_CUSTOM_MAX_GKGBW = 3.5;`
VALUE: 3.5 g/kg bodyweight (custom protein cap; used nutritionEngine.js:655)
INPUTS→OUTPUT: custom protein cap = min(customGPerKg, 3.5)
HARDCODED/CONFIGURABLE: hardcoded (cap on a configurable input)
Value as written matches the code at the cited line: confirmed.

RULE: EWMA_ALPHA (nutrition weight smoothing)
FILE:LINE: src/lib/nutritionEngine.js:158
CODE AT THAT LINE: `const EWMA_ALPHA = 0.28; // smoothing factor : MacroFactor uses ~0.3`
VALUE: 0.28 (default smoothing factor; ~3.5-day memory)
INPUTS→OUTPUT: default alpha for computeEWMA/ewmaValues (nutritionEngine.js:171,191)
HARDCODED/CONFIGURABLE: hardcoded default (overridable via function arg)
Value as written matches the code at the cited line: confirmed.

### nutritionEngine.js — remaining rules (read in full 1-1103; verbatim from that read)

RULE: ACTIVITY_MULTIPLIERS | :19-25
CODE: `sedentary: 1.2,` `light: 1.375,` `moderate: 1.55,` `active: 1.65,` `very_active: 1.725,`
VALUE: TDEE multipliers (default 1.55 when missing, :772) | hardcoded | confirmed

RULE: PHASE_ADJUSTMENTS | :27-35
CODE: `lean_gain: 0.10,` `build: 0.17,` `maintain: 0.0,` `recomp: -0.05,` `mild_cut: -0.13,` `aggressive_cut: -0.22,` `contest_prep: -0.28,`
VALUE: calorie % adjustment vs maintenance by phase | hardcoded | confirmed

RULE: PROTEIN_APPROACHES (g/kg tables) | :65-98
CODE: standard floor `2.0` bw {lean_gain 2.2..contest_prep 2.9}; optimised floor `2.2` bw {2.5..3.2}; advanced floor `2.5` bw {2.8..3.3}; custom floor `1.2`; each also has an `lbm` table (:70,78,86)
VALUE: per-approach protein rates (g/kg LBM preferred, BW fallback) + floor | hardcoded | confirmed

RULE: KCAL_PER_G protein/carb/fat | :100-102
CODE: `const KCAL_PER_G_PROTEIN = 4;` `const KCAL_PER_G_CARB = 4;` `const KCAL_PER_G_FAT = 9;` | hardcoded | confirmed

RULE: FFM_FALLBACK_FRACTION | :126-129
CODE: `male:   0.78,` `female: 0.72,`
VALUE: estimated FFM fraction of BW when BF% unknown | hardcoded | confirmed

RULE: FAT_TARGETS_GKG | :144-152
CODE: `lean_gain: 1.0,` `build: 0.9,` `maintain: 1.0,` `recomp: 0.85,` `mild_cut: 0.8,` `aggressive_cut: 0.75,` `contest_prep: 0.7,`
VALUE: fat target g/kg BW by phase | hardcoded | confirmed

RULE: KCAL_PER_KG (mixed tissue) | :247
CODE: `const KCAL_PER_KG = 7700;` | hardcoded | confirmed

RULE: computeWeeklyWeightChange span | :221, 242
CODE: `const MIN_SPAN_DAYS = 6;`; index fallback `if (ewmaData.length < 8) return null;`
VALUE: needs ≥6-day span (date path) or ≥8 points (index path) | hardcoded | confirmed

RULE: computeAdaptiveTDEEAdjustment | :309, 336, 341, 346
CODE: `const MIN_POINTS = 14;`; `const safeGain = Math.min(0.65, Math.max(0.5, Number(updateGain) || 0.5));`; `const confidence = weeks >= 4 ? 'high' : weeks >= 3 ? 'medium' : 'low';`; `if (absAdj < 50)` → no change
VALUE: needs ≥14 points; update gain clamped [0.5,0.65]; confidence by weeks; <50kcal adj = none | hardcoded | confirmed

RULE: step-trend modifier constants | :418-425
CODE: `STEP_WINSOR_CAP = 40000` `STEP_DELTA_MIN = 1500` `STEP_DELTA_RATIO_MIN = 0.20` `STEP_BASELINE_FLOOR = 4000` `STEP_PERSIST_MIN = 1000` `STEP_GAIN_BASE = 0.50` `STEP_GAIN_MAX = 0.65` `STEP_GAIN_RAMP_SPAN = 2500`
VALUE: gates for steps→update-gain modifier (steps never create/size/reverse a kcal change) | hardcoded | confirmed

RULE: computeStepTrendModifier sufficiency/persistence | :490, 513, 517
CODE: `if (recent.length < 10 || baseline.length < 14)` inactive; halves `if (olderHalf.length < 3 || newerHalf.length < 3)` not_sustained; `dir > 0 ? m - baselineMedian >= STEP_PERSIST_MIN : baselineMedian - m >= STEP_PERSIST_MIN`
VALUE: ≥10/14 recent & ≥14/28 baseline; each half ≥3 days & persists ≥1000; direction must agree | hardcoded | confirmed

RULE: calcBMR (Katch-McArdle / Mifflin) | :566, 571-572
CODE: `return { bmr: 370 + 21.6 * lbm, ... }`; male `10 * weightKg + 6.25 * heightCm - 5 * ageYears + 5`; female `... - 161`
VALUE: Katch-McArdle 370+21.6·LBM (when credible BF%); else Mifflin-St Jeor (+5 male / −161 female) | hardcoded | confirmed

RULE: computeFFMFloor | :614, 620
CODE: `floorKcal: Math.round(ffmKg * FFM_FLOOR_KCAL_PER_KG)`; `const fraction = FFM_FALLBACK_FRACTION[sex] ?? FFM_FALLBACK_FRACTION.male;`
VALUE: floor = FFM·30; FFM from BF% if credible else sex fallback fraction | hardcoded | confirmed

RULE: calcConfidence | :630-633
CODE: `if (bodyFatSource === 'dexa' || bodyFatSource === 'caliper') return 'high';` `if (bodyFatSource === 'bia') return 'medium';` `if (bodyFatSource === 'visual') return 'low';` `return 'medium';`
VALUE: confidence by BF% source | hardcoded | confirmed

RULE: calcProtein custom cap | :655
CODE: `const rate = Math.min(customGPerKg, PROTEIN_CUSTOM_MAX_GKGBW);`
VALUE: custom protein clamped to 3.5 g/kg BW; floor = approach.floor·weight (:649) | hardcoded | confirmed

RULE: ADVANCED_PROTEIN_GOALS | :701-704
CODE: `'mens_physique', 'classic_physique', 'bodybuilding', 'bikini', 'wellness', 'figure', 'womens_physique',`
VALUE: physique divisions auto-select 'advanced' protein (:756) | hardcoded | confirmed

RULE: SURPLUS_EXP_MULT | :709-714
CODE: `beginner: { lean_gain: 1.30, build: 1.25 },` `intermediate:{ lean_gain: 1.00, build: 1.00 },` `advanced: { lean_gain: 0.65, build: 0.80 },` `competitive: { lean_gain: 0.50, build: 0.65 },`
VALUE: scales surplus phaseAdj by experience (applied :780-782) | hardcoded | confirmed

RULE: GAIN_RATE_TARGETS | :718-723
CODE: `beginner: { min: 0.25, max: 0.50 },` `intermediate:{ min: 0.15, max: 0.30 },` `advanced: { min: 0.05, max: 0.20 },` `competitive: { min: 0.03, max: 0.15 },`
VALUE: expected weekly gain kg/week by experience | hardcoded | confirmed

RULE: calculateNutritionTargets input clamps | :747-749
CODE: `safeAge ... ,13),100)`; `safeHeight ... ,100),250)`; `safeWeight ... ,30),350)`
VALUE: age 13-100, height 100-250cm, weight 30-350kg | hardcoded | confirmed

RULE: sex calorie floor | :792
CODE: `const kcalFloor = sex === 'male' ? 1500 : 1200;`
VALUE: 1500 male / 1200 female absolute floor; floorApplied flag set (:798) | hardcoded | confirmed

RULE: hard-gate loss cap | :808-816
CODE: `if (lossFraction > HARD_GATE_LOSS_RATE)` → `const maxWeeklyDeficit = HARD_GATE_LOSS_RATE * safeWeight * KCAL_PER_KG_FAT;` cap at 1.5% loss
VALUE: deficit capped so loss ≤1.5% BW/week; warn >0.8% (:818) | hardcoded | confirmed

RULE: fat floor | :840
CODE: `const fatFloor = Math.max(0.5 * safeWeight, 40);`
VALUE: fat ≥ max(0.5·kg, 40g); carbs fill remainder (:844) | hardcoded | confirmed

RULE: kcal output range | :851-852
CODE: `const kcalMin = Math.round(actualTargetKcal * 0.9);` `const kcalMax = Math.round(actualTargetKcal * 1.1);`
VALUE: ±10% display range | hardcoded | confirmed

RULE: mealFrequency | :861
CODE: `const mealFrequency = (goal === 'aggressive_cut' || goal === 'contest_prep') ? 5 : 4;`
VALUE: 5 meals on aggressive cut/contest prep, else 4 | hardcoded | confirmed

RULE: shouldSuggestDietBreak | :920
CODE: `if (weeksInDeficit >= DIET_BREAK_THRESHOLD_WEEKS)`
VALUE: suggest diet break at ≥8 weeks in deficit | hardcoded | confirmed

RULE: getPlanNutritionContext protein cap | :951
CODE: `const proteinCapG = PROTEIN_MAX_GKGBW * bodyweightKg;`
VALUE: protein capped 2.2 g/kg BW when BF% unknown | hardcoded | confirmed

RULE: recoveryModifier by phase | :971-982
CODE: surplus `goal === 'build' ? 1.15 : 1.1`; maintenance/recomp `1.0`; deficit `deficitFraction <= 0.13 → 0.95`, `<= 0.22 → 0.85`, else `0.75`
VALUE: training recovery modifier by nutrition phase/deficit depth | hardcoded | confirmed

RULE: volumeCeiling / failureExposureLevel | :988-1004
CODE: surplus→high; maintenance/recomp/mild_cut→moderate; else low; failure exposure: agg_cut/contest_prep deficit→low, surplus→high, else moderate
VALUE: volume ceiling + failure-training exposure by phase | hardcoded | confirmed

RULE: deloadFrequencyWeeks | :1008-1013
CODE: `if (recoveryModifier <= 0.85)` 4; `else if (recoveryModifier <= 1.0)` 5; `else` 6
VALUE: nutrition-driven deload cadence (4/5/6 weeks) | hardcoded | confirmed

RULE: refeed recommendation | :1041-1052
CODE: fires on `goal === 'aggressive_cut' || goal === 'contest_prep'`; `frequencyWeeks: goal === 'contest_prep' ? 1 : 2,` `durationDays: 2,` carbs = (maintenance − protein·4 − fat·9)/4
VALUE: refeed weekly (contest prep) / 2-weekly (aggressive cut), 2 days at maintenance via carbs | hardcoded | confirmed

RULE: dietBreakRecommendation | :1056-1062
CODE: `goal === 'contest_prep'` → `frequencyWeeks: 8, durationWeeks: 1, caloricTargetKcal: maintenanceKcal`
VALUE: contest prep: 1 week at maintenance every 8 weeks | hardcoded | confirmed

RULE: adaptive-TDEE data gate | :1071
CODE: `if (bodyMetricsData && bodyMetricsData.length >= 14)`
VALUE: adaptive TDEE only runs with ≥14 weight entries | hardcoded | confirmed

NUTRITIONENGINE.JS COMPLETENESS: read in full (1-1103); all rule-bearing constants/thresholds/formulas transcribed verbatim; no grep used to locate them.

---

## coachApply.js — APPLY-LAYER FLOORS

RULE: KCAL_FLOOR
FILE:LINE: src/lib/coachApply.js:22
CODE AT THAT LINE: `export const KCAL_FLOOR = 1200;`
VALUE: 1200 kcal (absolute apply-layer calorie floor; used coachApply.js:39 via Math.max)
INPUTS→OUTPUT: newKcal = Math.max(KCAL_FLOOR, current + change)
HARDCODED/CONFIGURABLE: hardcoded
Value as written matches the code at the cited line: confirmed.

RULE: MACRO_CYCLE_REST_DAY_CARB_CUT
FILE:LINE: src/lib/coachApply.js:81
CODE AT THAT LINE: `export const MACRO_CYCLE_REST_DAY_CARB_CUT = 0.25;`
VALUE: 0.25 (rest-day carbohydrate cut fraction; used coachApply.js:111)
INPUTS→OUTPUT: restDayCarbs = round(baselineCarbs * (1 - 0.25))
HARDCODED/CONFIGURABLE: hardcoded
Value as written matches the code at the cited line: confirmed.

---

## edPatternDetector.js — ED PATTERN SIGNAL THRESHOLDS

RULE: RAPID_LOSS_PCT_PER_WEEK
FILE:LINE: src/lib/edPatternDetector.js:30
CODE AT THAT LINE: `const RAPID_LOSS_PCT_PER_WEEK = -1.5;`
VALUE: -1.5 (% bodyweight/week; s1 rapid-loss signal at weightTrendPctPerWeek <= -1.5, line 102)
INPUTS→OUTPUT: weekly trend % → s1 signal bool
HARDCODED/CONFIGURABLE: hardcoded
Value as written matches the code at the cited line: confirmed.

RULE: LOW_ENERGY_THRESHOLD
FILE:LINE: src/lib/edPatternDetector.js:31
CODE AT THAT LINE: `const LOW_ENERGY_THRESHOLD = 2;`
VALUE: 2 (energy score <= 2 contributes to s2; used line 91)
INPUTS→OUTPUT: energy score → s2 component
HARDCODED/CONFIGURABLE: hardcoded
Value as written matches the code at the cited line: confirmed.

RULE: LOW_ENERGY_MIN_WEEKS
FILE:LINE: src/lib/edPatternDetector.js:32
CODE AT THAT LINE: `const LOW_ENERGY_MIN_WEEKS = 2;`
VALUE: 2 weeks sustained for s2
HARDCODED/CONFIGURABLE: hardcoded
Value as written matches the code at the cited line: confirmed.

RULE: UNDER_ADHERENCE_MIN_WEEKS
FILE:LINE: src/lib/edPatternDetector.js:33
CODE AT THAT LINE: `const UNDER_ADHERENCE_MIN_WEEKS = 2;`
VALUE: 2 (weeks under-adherence within window for s3)
HARDCODED/CONFIGURABLE: hardcoded
Value as written matches the code at the cited line: confirmed.

RULE: UNDER_ADHERENCE_WINDOW
FILE:LINE: src/lib/edPatternDetector.js:34
CODE AT THAT LINE: `const UNDER_ADHERENCE_WINDOW = 3;`
VALUE: 3-week window for s3
HARDCODED/CONFIGURABLE: hardcoded
Value as written matches the code at the cited line: confirmed.

RULE: WEIGHT_ONLY_MIN_WEEKS
FILE:LINE: src/lib/edPatternDetector.js:35
CODE AT THAT LINE: `const WEIGHT_ONLY_MIN_WEEKS = 2;`
VALUE: 2 (weeks weight-only logging within window for s4)
HARDCODED/CONFIGURABLE: hardcoded
Value as written matches the code at the cited line: confirmed.

RULE: WEIGHT_ONLY_WINDOW
FILE:LINE: src/lib/edPatternDetector.js:36
CODE AT THAT LINE: `const WEIGHT_ONLY_WINDOW = 3;`
VALUE: 3-week window for s4
HARDCODED/CONFIGURABLE: hardcoded
Value as written matches the code at the cited line: confirmed.

RULE: ED FIRE THRESHOLD (signals required)
FILE:LINE: src/lib/edPatternDetector.js:23-24 (documented), 64 (applied)
CODE AT THOSE LINES:
```
23:  *   goal_lock_advanced = false  fire on >= 2 signals
24:  *   goal_lock_advanced = true   fire on >= 3 signals
64:   const fired = signalsFired >= required;
```
VALUE: fire on >= 2 signals normally; >= 3 when goal_lock_advanced
INPUTS→OUTPUT: signalsFired vs required → fired bool
HARDCODED/CONFIGURABLE: hardcoded (required derived from goal_lock_advanced)
Value as written matches the code at the cited lines: confirmed.

---

## weeklyCoach.js — CONFIG LAYER (lines 1-470 read; main runWeeklyCoach body 470→end PENDING)

RULE: computeEWMA alpha (weekly-coach trend) | :39
CODE: `export function computeEWMA(weights, alpha = 0.1) {`
VALUE: 0.1 (~10-day memory; distinct from nutritionEngine 0.28) | hardcoded default | confirmed

RULE: assessDataConfidence holds | :107, 115, 123, 125
CODE: `if (weigh_ins < 3)` → data_hold; `if (hasUnusualEvent && weigh_ins < 5)` → data_hold; `if (weigh_ins < 5) { level = 'medium' ...}`; `if (weeksInPhase < 2) { level = 'low' ...}`
VALUE: <3 weigh-ins → hold; unusual+<5 → hold; <5 → medium; <2 weeks → low | hardcoded | confirmed

RULE: getRecoveryScore | :144-154
CODE: `if (s >= 4) score = 4;` `else if (e <= 2 || s >= 3) score = 3;` `else if (e >= 4 && s <= 1) score = 1;` `else score = 2;`; `if (st != null && st >= 4 && score < 3) score = 3;`
VALUE: recovery 1-4 from energy/soreness; stress≥4 worsens to ≥3 | hardcoded | confirmed

RULE: getPerformanceScore | :163-166
CODE: `... 'exceeded' || (prsThisWeek > 0 && sessionAdherence >= 0.9)) return 1;` `'dropped' || sessionAdherence < 0.5) return 4;` `'struggled' || sessionAdherence < 0.75) return 3;` `'hit' || sessionAdherence >= 0.75) return 2;`
VALUE: performance 1-4 from training perf + session adherence thresholds 0.9/0.5/0.75 | hardcoded | confirmed

RULE: autoregulationMatrix | :176-191
CODE: `if (recoveryScore === 4 || (recoveryScore >= 3 && performanceScore >= 4))` → {volumeDelta -2, reduce, deload}; `if (recoveryScore === 3 || performanceScore === 3)` → {0, hold}; `if (recoveryScore === 1 && performanceScore === 1)` → {3, push}; `if (recoveryScore === 1 || performanceScore === 1)` → {2, push}; else {1, push}
VALUE: recovery×performance → volumeDelta/-2..+3/, trainingSignal, deloadFlag | hardcoded | confirmed

RULE: PHASE_CONFIG goal rates | :196-204
CODE: `agg_cut: goalRatePct: -1.00`; `mod_cut: -0.625`; `mild_cut: -0.375`; `recomp: -0.125`; `maint: 0`; `mild_bulk: 0.1875`; `mod_bulk: 0.375`
VALUE: weekly goal rate (% BW/week) by phase; isCut/isBulk flags | hardcoded | confirmed

RULE: STEPS_BANDS | :207-215
CODE: `agg_cut {12000,14000}` `mod_cut {10000,12000}` `mild_cut {9000,11000}` `recomp {9000,11000}` `maint {8000,10000}` `mild_bulk {7000,9000}` `mod_bulk {7000,9000}`
VALUE: daily step target bands (lower,upper) by phase | hardcoded | confirmed

RULE: stepsBand large-athlete reduction | :237-238
CODE: `if (bodyweightKg && bodyweightKg > 100)` → `{ lower: band.lower, upper: band.upper - 1000 }`
VALUE: bodyweight >100kg lowers upper band by 1000 | hardcoded | confirmed

RULE: PHASE_ALIASES | :223
CODE: `const PHASE_ALIASES = { bulk: 'mod_bulk' };`
VALUE: 'bulk' phase maps to mod_bulk | hardcoded | confirmed

RULE: WHY_LIBRARY keys | :254-297
CODE: keys `on_target_holding, off_target_cal_up, off_target_cal_down, recovery_lagging, performance_regressed, building_baseline, stabilise_sessions, steps_bump, deload_suggested, diet_break_suggested, push_volume, low_data_weight, ffm_floor_hold, rapid_loss_corrected` (one plain-English, jargon-free line each)
VALUE: the "why this week" reason copy library (locked voice, no jargon) | hardcoded | confirmed

(weeklyCoach.js helpers with no numeric thresholds: getLatestEwma :59, getEwmaSevenDaysAgo :84, computeWeeklyTrendPct :71, parseNoteFlags :313 [regex word-matching for travel/illness/injury/missedLogging/menstrual], mapCalsAdherence :334, pickWhy :299, normalisePhaseKey/phaseConfig/stepsBand.)

### weeklyCoach.js — runWeeklyCoach decision body (lines 470-940 read; 940→end PENDING)

RULE: on-target tolerance | :577-578
CODE: `Math.abs(decisionRatePct - phase.goalRatePct) <= 0.2 * Math.abs(phase.goalRatePct) + 0.05`
VALUE: on target if |actual − goal| ≤ 20% of |goal| + 0.05 (%/wk); uses robust trend, falls back to plain | hardcoded | confirmed

RULE: hasEnoughData gate | :585-586
CODE: `const enoughWeightData = morningWeights.length >= 4;` `const hasEnoughData = weeksInPhase >= 2 && enoughWeightData;`
VALUE: needs ≥2 weeks in phase AND ≥4 weigh-ins | hardcoded | confirmed

RULE: adherence gate | :620-621
CODE: `const sessionAdherence = ...; if (sessionAdherence < 0.5)` → stabilise output
VALUE: <50% sessions completed → hold/stabilise | hardcoded | confirmed

RULE: recovery signal thresholds | :626-629
CODE: `poorEnergy = energyScore <= 2`; `highSoreness = sorenessScore >= 4`; `excellentRec = energyScore >= 4 && sorenessScore <= 2`
VALUE: energy≤2 or soreness≥4 = poor recovery | hardcoded | confirmed

RULE: matrixDeload | :638
CODE: `const matrixDeload = matrix.deloadFlag && consecutivePoorRecoveryWeeks >= 1;`
VALUE: deload needs matrix flag AND ≥1 prior poor-recovery week | hardcoded | confirmed

RULE: safety hold (joint/illness/injury) | :645-651
CODE: `const safetyHold = jointPainFlagged || noteFlags.injury || noteFlags.illness;` → caps `if (volumeSignal > 0) volumeSignal = 0; if (trainingSignal === 'push') trainingSignal = 'hold';`
VALUE: joint pain or noted illness/injury caps any push to hold (never reverses a reduce) | hardcoded | confirmed

RULE: off-target weeks required (cooldown gate) | :668, 692-693
CODE: `const offTargetWeeksRequired = confidence.level === 'high' ? 2 : 3;`; `consecutiveOffTargetWeeks >= offTargetWeeksRequired && lastCalAdjustmentWeeksAgo >= 2`
VALUE: needs 2 (high conf) / 3 (else) consecutive off-target weeks + 2-week cooldown to adjust calories | hardcoded | confirmed

RULE: rapidLossOverride | :677-682
CODE: `phase.isCut && !cycleOverride && actualRatePct !== null && actualRatePct <= -1.5 && energyScore !== null && energyScore <= 2`
VALUE: rapid-loss safety override (cut, not cycle-flagged, loss ≤ −1.5%/wk, energy ≤ 2) — bypasses cooldown + off-target gate, upward-only | hardcoded | confirmed

RULE: adaptive-TDEE data gate | :711
CODE: `if (currentMaintenanceKcal && currentCalTarget && Array.isArray(morningWeights) && morningWeights.length >= 14)`
VALUE: adaptive resize only with ≥14 weigh-ins; adherenceFactor under .9/over 1.1/hit 1.0 (:712-714); used only if confidence 'high' (:755) | hardcoded | confirmed

RULE: rapid-loss calorie boost | :766-768
CODE: `const severityExcess = Math.max(0, -1.5 - actualRatePct);` `const scaledBoost = Math.round(125 + severityExcess * 150);` `change = Math.min(300, scaledBoost);`
VALUE: +125 base, +150 per extra 1%/wk past −1.5%, capped +300 | hardcoded | confirmed

RULE: fixed calorie-adjust steps | :773, 777, 781, 785
CODE: cut too slow `change = calsAdherence === 'hit' ? -150 : -100;`; cut too fast `change = +125;`; bulk too slow `change = +150;`; bulk too fast `change = -125;`
VALUE: cut-slow −150(hit)/−100; cut-fast +125; bulk-slow +150; bulk-fast −125 | hardcoded | confirmed

RULE: calorie change ±5% cap | :810-811
CODE: `const maxChange = Math.round(currentCalTarget * 0.05);` `change = Math.sign(change) * Math.min(Math.abs(change), maxChange);`
VALUE: weekly cal change capped at ±5% of current target | hardcoded | confirmed

RULE: FFM-floor hold gate | :837-862
CODE: fires when `Number.isFinite(bodyweightKg) && bodyweightKg > 0 && Number.isFinite(recentIntakeAvgKcal) && recentIntakeDaysLogged >= 5`; `if (recentIntakeAvgKcal <= floor.floorKcal && calorieAdjustment != null && calorieAdjustment.change < 0)` → `ffmFloorHeld = true; calorieAdjustment = null;`
VALUE: with ≥5 days intake, refuse a calorie cut when 7-day intake ≤ FFM floor (increases never blocked) | hardcoded | confirmed

RULE: steps prescription | :873, 883
CODE: `if (stepsAvg != null && currentStepsTarget > 0 && stepsAvg < currentStepsTarget * 0.9)` → hold current; else `const newTarget = Math.min(currentStepsTarget + 1000, band.upper);`
VALUE: if avg <90% of target → hold; else +1000 steps up to band upper | hardcoded | confirmed

RULE: cardio trigger | :913-914
CODE: `const stepsAtUpperBand = !stepsEnabled || currentStepsTarget >= band.upper;` `const cardioConditionsMet = phase.isCut && !onTarget && offTargetDirection > 0 && stepsAtUpperBand;`
VALUE: cardio fires on cut + losing-too-slow + steps maxed/disabled; paused under poor recovery (:916) | hardcoded | confirmed

RULE: rapidWeightLossFlag (safety flag) | :962-967
CODE: `actualRatePct < -1.5 && energyScore <= 2 && !cycleOverride`
VALUE: rapid-loss alert flag (note: strict `< -1.5`, vs rapidLossOverride's `<= -1.5` at :680) | hardcoded | confirmed

RULE: deload trigger assembly | :974-979
CODE: `if (consecutivePoorRecoveryWeeks >= 2) deloadTriggers++;` `if (matrixDeload) deloadTriggers++;` `if (weeksInPhase >= 6 && phase.isCut) deloadTriggers++;` `if (sleepHours != null && sleepHours < 6 && poorEnergy) deloadTriggers++;` `if (deloadTriggers >= 2)` → suggested
VALUE: 4 triggers; deload suggested at ≥2 | hardcoded | confirmed

RULE: diet-break trigger | :992-1010
CODE: cut + `shouldSuggestDietBreak(goalStartDate)` (≥8 wks, nutritionEngine) or fallback `else if (weeksInPhase >= 8)`; copy variant at `>= 12` weeks
VALUE: diet break on ≥8 weeks deficit (≥12 → stronger copy) | hardcoded | confirmed

RULE: macro-cycle eligibility | :1020-1021
CODE: `if (phase.isCut && (goalLockAdvanced || isCompetitionGoal(trainingGoal)))`; `const trainingDays = Math.max(1, Math.min(6, Math.round(sessionsPlanned)));`
VALUE: carb cycle only for advanced/competition cutters; training days clamped 1-6 | hardcoded | confirmed

RULE: refeed cadence | :1044-1050
CODE: `const refeedEligible = phase.isCut && (goalPhase === 'agg_cut' || isCompetitionGoal(trainingGoal));`; `const frequencyWeeks = isCompetitionGoal(trainingGoal) ? 1 : 2;`; `const due = weeksSinceRefeed === null || weeksSinceRefeed >= frequencyWeeks;`
VALUE: refeed for aggressive-cut/competition; weekly (competition) / 2-weekly (agg cut) | hardcoded | confirmed

RULE: ED-pattern wiring | :1078-1095
CODE: `if (edPatternOpen)` → `hasEdPatternCleared(...)`; else `detectEdPatternFlag({ weightTrendPctPerWeek }, recentWeeklyHistory, goalLockAdvanced)` (thresholds live in edPatternDetector.js, already transcribed)
VALUE: raises/clears ED flag; uses plain weekly trend % | wired to edPatternDetector | confirmed

RULE: held-decision precedence + cut-wipes | :1105-1163
CODE: ed_pattern_lockout (`if (calorieAdjustment && calorieAdjustment.change < 0) calorieAdjustment = null;`) → ffm_floor → rapid_loss_corrected → calories holds (scoffPositive / cycleOverride / onTarget / lastCalAdjustmentWeeksAgo<2 / consecutiveOffTargetWeeks<required / untracked)
VALUE: ED lockout & FFM floor both null a pending calorie cut; ordered hold reasons | hardcoded | confirmed

RULE: WHY-key precedence ladder | :1219-1230
CODE: `ffm_floor_hold` > `rapid_loss_corrected` > `deload_suggested` > `diet_break_suggested` > `recovery_lagging` > `push_volume` (`volumeSignal >= 1 && excellentRec`) > `off_target_cal_up` (change>0) > `off_target_cal_down` (change<0) > `steps_bump` > `on_target_holding`; `low_data_weight` appended if `!enoughWeightData`
VALUE: single-winner reason ladder (drives whyThisWeek + primary) | hardcoded | confirmed

RULE: PRIMARY_DOMAIN_BY_WHY (U-B-1 §2) | :1243-1254
CODE: `deload_suggested:'deload', diet_break_suggested:'dietBreak', recovery_lagging:'training', push_volume:'training', off_target_cal_up:'calories', off_target_cal_down:'calories', steps_bump:'steps'`; `domain: PRIMARY_DOMAIN_BY_WHY[primaryReasonKey] ?? null`
VALUE: maps top why-key to hero domain; ED-safety/holding → null (never an applyable hero) | hardcoded | confirmed

(weeklyCoach.js 1340→end: `_buildBaselineOutput`/`_buildAdherenceOutput` helper return shapes — output assembly only, no numeric thresholds. cardioAcknowledgement :950 and differential paywall :1261 delegate to cardioEngine/differentialPaywall, transcribed under those files.)

WEEKLYCOACH.JS COMPLETENESS: read in full (1-~1380); all rule-bearing thresholds/formulas
transcribed verbatim above; no grep used to locate them. [DONE — TIER A]

---

## planEngine.js — TIER A FULL (chunk 1: lines 1-340 read; rest PENDING)

RULE: EXP_MULT (experience landmark multipliers) | :69-74
CODE: `beginner: { MEV: 0.70, MRV: 0.75 },` `intermediate: { MEV: 1.00, MRV: 1.00 },` `advanced: { MEV: 1.15, MRV: 1.10 },` `competitive: { MEV: 1.25, MRV: 1.15 },`
VALUE: per-experience MEV/MRV multipliers | hardcoded | confirmed

RULE: REC_MULT (recovery multipliers) | :76-80
CODE: `poor: { MEV: 1.10, MRV: 0.80 },` `average: { MEV: 1.00, MRV: 1.00 },` `good: { MEV: 0.95, MRV: 1.15 },` | hardcoded | confirmed

RULE: NUT_MULT (nutrition-phase multipliers) | :82-90
CODE: `lean_gain {0.95,1.10}` `build {0.95,1.10}` `maintain {1.00,1.00}` `recomp {1.00,1.00}` `mild_cut {1.00,0.90}` `aggressive_cut {1.05,0.80}` `contest_prep {1.10,0.70}` (MEV,MRV) | hardcoded | confirmed

RULE: ageMultipliers | :92-98
CODE: `(age >= 30 && age < 40)` → {1.00,1.00}; `age < 30` → {1.00,1.05}; `age < 50` → {1.00,0.92}; `age < 60` → {1.05,0.85}; else {1.10,0.75}
VALUE: age-band MEV/MRV multipliers | hardcoded | confirmed

RULE: computeLandmarks derivation+guards | :108-118
CODE: `MEVadj = Math.round(base.mev * mExp.MEV * mRec.MEV * mNut.MEV * mAge.MEV)`; `MRVadj = Math.round(base.mrv * ...)`; clash `if (MEVadj >= MRVadj) MEVadj = Math.max(2, MRVadj - 2);`; floor `if (MRVadj < 4 && base.mev > 0) { MRVadj = 4; MEVadj = 2; }`; `MAVlow = MEVadj + 2`; `MAVhigh = Math.max(MAVlow, MRVadj - 1)`
VALUE: landmark = base × 4 multipliers, rounded; clash/floor guards; MAV band derived | hardcoded | confirmed

RULE: applyGoalOverlay PRIORITY_NORM | :141, 146-147
CODE: `const PRIORITY_NORM = 0.6;`; `const frac = Math.min(1, (mult - 1) / PRIORITY_NORM);` `t[m] = Math.round(lm.MAVlow + frac * (lm.MRV - lm.MAVlow));`
VALUE: priority muscles placed in MAV→MRV band by overlay strength (0.6 maps to top) | hardcoded | confirmed

RULE: weak-point bonus | :185-186
CODE: `const bonus = Math.max(2, Math.round((mrvCap - t[m]) * 0.7));` `const next = Math.max(t[m], Math.min(mrvCap, t[m] + bonus));`
VALUE: weak-point closes ~70% of gap to (division) MRV, min +2 | hardcoded | confirmed

RULE: per-muscle MRV clamp | :207
CODE: `const cap = Math.round(landmarks[m].MRV * 1.10);` `t[m] = Math.min(t[m], cap);`
VALUE: each muscle clamped to 110% of MRV | hardcoded | confirmed

RULE: systemic ceiling | :230-232
CODE: `const compress3Day = effectiveDays <= 3 && !DIVISION_MATRIX[goal];` `const systemicFactor = compress3Day ? 0.34 : 0.40;` `const systemicCap = Math.round(totalMRV * systemicFactor);`
VALUE: total weekly sets capped at 34% (≤3-day non-matrix) / 40% of ΣMRV | hardcoded | confirmed

RULE: GENERATOR_LANDMARK_OVERRIDES | :269-285
CODE: `rear_delts: { MEV: 0, MRV: 14 },` `traps: { MEV: 0, MRV: 26 },` `glutes: { MV: 4, MEV: 6, MRV: 16 },` `side_delts: { MV: 6, MRV: 20 },` `biceps: { MEV: 8, MRV: 20 },` `abs: { MEV: 6 },` `forearms: { MV: 0, MEV: 0, MRV: 16 },` `adductors: { MRV: 12 },`
VALUE: generator programming ceilings (differ from tracker landmarks by design) | hardcoded | confirmed

RULE: SIDE_REAR_DELT_CAP | :299
CODE: `const SIDE_REAR_DELT_CAP = 26;`
VALUE: combined delt-complex weekly ceiling 26 | hardcoded | confirmed

RULE: INDIRECT_SET_FRACTION | :304
CODE: `const INDIRECT_SET_FRACTION = 0.5;`
VALUE: secondary muscle on a compound = 0.5 set | hardcoded | confirmed

RULE: divisionMRV (glutes) | :311
CODE: `if (muscle === 'glutes' && (goal === 'bikini' || goal === 'wellness')) return 30;`
VALUE: glute MRV 30 for bikini/wellness, else lm.MRV | hardcoded | confirmed

RULE: INDIRECT_TRIM_BUFFER | :317
CODE: `const INDIRECT_TRIM_BUFFER = 2;` | hardcoded | confirmed

RULE: maintenanceFloor | :324-326
CODE: `return effectiveDays <= 3 ? 4 : 6;`
VALUE: structural-muscle maintenance floor 4 (≤3 days) / 6 | hardcoded | confirmed

RULE: bikini/wellness arm floor | :352-354
CODE: `if ((goal === 'bikini' || goal === 'wellness') && effectiveDays >= 5)` → `t.biceps = Math.max(t.biceps ?? 0, 4); t.triceps = Math.max(t.triceps ?? 0, 4);`
VALUE: ≥5 days, floor biceps/triceps to 4 sets | hardcoded | confirmed

RULE: trimSynergist (indirect-volume trim) | :365-373
CODE: `const credit = Math.round((t[driverMuscle] ?? 0) * rate);` `const floor = lm.MEV + INDIRECT_TRIM_BUFFER;`; `trimSynergist('biceps', 'back', 0.4);` `trimSynergist('triceps', 'chest', 0.5);`
VALUE: biceps trimmed by 0.4×back, triceps by 0.5×chest; floor = MEV+2; never raises, skips weak points | hardcoded | confirmed

RULE: delt-complex cap enforcement | :388-393
CODE: `if (deltSum > SIDE_REAR_DELT_CAP)` → scale side/rear/front by `SIDE_REAR_DELT_CAP / deltSum`
VALUE: side+rear+front delts scaled to combined 26 | hardcoded | confirmed

RULE: POOL exercise database | :406-555
CODE: `export const POOL = { chest:[...], back:[...], side_delts:[...], rear_delts:[...], front_delts:[...], biceps:[...], triceps:[...], quads:[...], hamstrings:[...], glutes:[...], calves:[...], abs:[...], traps:[...] }` — entries `{ n, sub, p:paramKey, eq:[equipment] }`
VALUE: 13-muscle hardcoded exercise pool (fallback when no library); paramKey ∈ heavy_compound/mod_compound/machine/isolation. (Full exercise list = data; indexed in Section 4, not transcribed per-exercise here.) | hardcoded | confirmed (structure + 13 muscle keys present)

RULE: MIN_GENERATED_PER_MUSCLE | :583
CODE: `const MIN_GENERATED_PER_MUSCLE = 3;`
VALUE: <3 library entries for a muscle → fall back to POOL for it | hardcoded | confirmed

RULE: SUBREGION_REQUIREMENTS | :604-628
CODE: `back {minSets:6, required:['vertical_pull','horizontal_row']}` `hamstrings {6, [hip_extension,knee_flexion]}` `glutes {16, [activator,pumper]}` `quads {8, [sweep,vasti]}` `chest {10, [incline,flat]}` `rear_delts {6, [face_pull,horiz_abduction]}` `triceps {8, [overhead]}` `calves {10, [gastro,soleus]}` `abs {10, [flexion,anti_extension]}`
VALUE: weekly subregion coverage requirements (minSets gate + required subregions) | hardcoded | confirmed

RULE: REST_SEC | :634-639
CODE: `heavy_compound: 180, mod_compound: 150, machine: 120, isolation: 75,`
VALUE: rest seconds by param key (hypertrophy) | hardcoded | confirmed

RULE: TRANS_SEC | :641-648
CODE: `full_gym: 120, machines_cables: 90, home_gym: 60, dumbbells_only: 45, barbell_plates: 75, bodyweight: 30,`
VALUE: inter-exercise transition seconds by equipment | hardcoded | confirmed

RULE: REP_RANGES | :654-659
CODE: `heavy_compound {5,9} mod_compound {8,12} machine {8,15} isolation {10,20}` (repMin,repMax)
VALUE: hypertrophy rep ranges by param key | hardcoded | confirmed

RULE: STRENGTH_REP_RANGES | :661-666
CODE: `heavy_compound {4,6} mod_compound {5,8} machine {8,12} isolation {10,15}`
VALUE: strength-phase rep ranges | hardcoded | confirmed

RULE: STRENGTH_REST | :668-673
CODE: `heavy_compound: 210, mod_compound: 180, machine: 120, isolation: 75,`
VALUE: strength-phase rest seconds | hardcoded | confirmed

RULE: baseRir | :675-679
CODE: `beginner → 3; intermediate → 2; else → 1`
VALUE: base RIR target by experience | hardcoded | confirmed

RULE: makeEx (cut RIR bump + min sets) | :688-694
CODE: `const cutPhases = ['mild_cut', 'aggressive_cut', 'contest_prep'];` `if (cutPhases.includes(nutritionPhase)) rir = Math.min(rir + 1, 4);`; `const minSets = (paramKey === 'heavy_compound' || paramKey === 'mod_compound') ? 3 : 2;` `sets: Math.max(minSets, sets)`
VALUE: cut phases +1 RIR (cap 4); min 3 sets compound / 2 isolation | hardcoded | confirmed

RULE: estimateWorkoutMinutes / estimateSessionMinutes | :709-718, 723-735
CODE: `const T_SET_LOG = 60;` `const overheadMin = 7.5 + Math.max(0, numCompounds - 1);` `sessionSec += ex.sets * T_SET_LOG + (ex.sets - 1) * ex.restSec;` (+transition per exercise in session variant)
VALUE: 60s/set log, 7.5min base overhead + compounds, rest+transition | hardcoded | confirmed

RULE: clampDeliveredToMRV | :743-769
CODE: trims each muscle's delivered sets to `divisionMRV(...)`, delts to `SIDE_REAR_DELT_CAP`; `while (total > cap && ex.sets > 3)` keeps ≥3; never removes last entry
VALUE: hard delivered-volume ceiling (MRV + delt cap), 3-set floor | hardcoded | confirmed

RULE: trimToTimeBudget | :772-808+
CODE: `const budget = sessionLengthMinutes - 2;`; phase 1 reduce sets back-to-front while `result[i].sets > 3`; phase 2 drop whole exercises (never first, never `_req` subregion, never a muscle's last)
VALUE: time-trim to (length−2) min; never below 3 sets; protects first/required/last-of-muscle | hardcoded | confirmed

RULE: DIVISION_POOL_RULES (hard pool restrictions) | :840-859
CODE: `bikini: { back: { allowSubs: ['vertical_pull'] }, quads: { denyParams: ['heavy_compound'] }, chest: { denyParams: ['heavy_compound'] }, side_delts: { denySubs: ['press'] }, front_delts: { denySubs: ['press'] } }`, `mens_physique: { quads: { denyParams: ['heavy_compound'] } }`
VALUE: division-specific allowed/denied subregions+params; never starve (fall back if all removed, :878) | hardcoded | confirmed

RULE: DIVISION_SUBREGION_BIAS | :887-894
CODE: `mens_physique {chest:'incline',back:'vertical_pull'}` `figure {...}` `classic_physique {back:'vertical_pull',quads:'sweep'}` `womens_physique {back:'vertical_pull'}` `bikini {glutes:'activator'}` `wellness {glutes:'activator',quads:'sweep'}`
VALUE: soft scoring nudge toward judged subregion | hardcoded | confirmed

RULE: numExHint | :899-901
CODE: `return sessionTarget <= 5 ? 1 : 2;`
VALUE: ≤5 session sets → 1 exercise, else 2 | hardcoded | confirmed

RULE: difficulty/assisted gating | :923-928, 936-941
CODE: beginner `available.filter(e => e.difficulty == null || e.difficulty < 3)` (if ≥max(2,numExHint) survive); non-beginner `available.filter(e => !ASSISTED_RE.test(e.n))` (same guard); `ASSISTED_RE = /\bassisted\b/i`
VALUE: beginners drop difficulty≥3; non-beginners drop assisted lifts; never below coverage | hardcoded | confirmed

RULE: sortScore (selection ranking) | :960-978
CODE: `reqBonus = requiredSubs.includes(e.sub) ? 0 : 100;` `paramOrder {heavy_compound:0,mod_compound:1,machine:2,isolation:3}` `paramBonus = order*10;` `divBonus = preferredSub match ? -5 : 0;` strength `heavyBarbell ? -3 : 0`; hypertrophy `-(e.sfr/10)`; `+ idx`
VALUE: required-subregion → compound-first → division nudge → goal/SFR tiebreak → pool index | hardcoded | confirmed

RULE: RDL/SLDL guard | :1031-1036
CODE: hamstrings — never both 'Romanian Deadlift (Barbell)' and 'Stiff-Leg Deadlift' in one session | hardcoded | confirmed

RULE: per-entry set distribution | :1058-1071
CODE: `const MIN_SETS_PER_ENTRY = 3;` `const MAX_SETS_PER_ENTRY = 6;`; spread sessionTarget across chosen, reserving 3 for later entries, clamp [3,6]
VALUE: each exercise 3-6 sets; session target spread evenly | hardcoded | confirmed

RULE: selectSplit | :1087-1122
CODE: 3d `lowerFocus→full_body; (advanced||competitive)?'ppl':'full_body'`; 4d `upper_lower`; 5d `weak_point_spec→upper_lower_wp; lowerFocus→lower_focus; legJudgedBalanced→balanced_ul; else ppl`; 6d `lowerFocus?'lower_focus':'ppl_ab'`; lowerFocus = bikini/wellness; legJudged = bodybuilding/classic/figure/womens_physique/womens_bodybuilding
VALUE: split by days+experience+division | hardcoded | confirmed

RULE: buildSession per-session cap | :1138-1140
CODE: `const sessionCap = _weakPointKeys.includes(muscle) ? 12 : 8;` `const sessionTarget = Math.min(sessionCap, Math.round(wTarget / sessions));` `if (sessionTarget < 2) continue;`
VALUE: 8 sets/muscle/session (12 for weak point); skip <2 | hardcoded | confirmed

RULE: full-body frequency | :1179
CODE: `sessionsPerMuscle[m] = t <= 0 ? 0 : Math.max(1, Math.min(effectiveDays, Math.round(t / 5)));`
VALUE: muscle appears ceil(target/5)-ish days, ≥1, ≤effectiveDays | hardcoded | confirmed

RULE: upper/lower + weighted-UL frequencies | :1215-1216, 1242-1246
CODE: UL `sessionsPerMuscle = 2` all; weighted `upperDays = max(1, effectiveDays - lowerDays)`, upper muscles=upperDays, lower=lowerDays; interleave lower-first
VALUE: UL 2×/muscle; weighted-UL by lowerDays (lower-first interleave) | hardcoded | confirmed

RULE: PPL frequencies | :1275-1279+
CODE: 3-day `all muscles 1`; 5-day `push/pull 2` (legs continues below)
VALUE: PPL session frequencies by days (3/5/6) | hardcoded | confirmed (5/6-day legs continue 1280→)

RULE: PPL session frequencies | :1275-1283
CODE: `effectiveDays === 3` → all muscles 1; `=== 5` → push/pull 2, legs 1; else (6-day) all 2
VALUE: PPL freq by day count | hardcoded | confirmed

RULE: buildWeakPointDay | :1319, 1328, 1339-1340
CODE: `sessionsPerMuscle[m] = 3;`; `wpTargets[m] = Math.max(landmarks[m].MEV, landmarks[m].MRV - 2);`; `if (session.exercises[0].sets < 4) session.exercises[0] = { ...,, sets: 4 }`
VALUE: WP day is 3rd session; target = MRV−2 (≥MEV); first exercise floored to 4 sets | hardcoded | confirmed

RULE: buildUpperLowerWPWorkouts MRV clamp | :1355-1376
CODE: total for weak muscle clamped to `divisionMRV(...)`; WP-day entries trimmed first (`cut = Math.min(ex.sets - 3, excess)`), then dropped if still over
VALUE: UL+WP total ≤ MRV; trims WP day keeping 3-set min | hardcoded | confirmed

RULE: DIVISION_MATRIX (split skeletons) | :1397-1572
CODE: `export const DIVISION_MATRIX = { mens_physique, classic_physique, bikini, wellness, figure, womens_physique }`, each with `3/4/5/6`-day arrays of `{ name, muscles:[...] }` (24 session-skeleton cells total)
VALUE: 6 specialised divisions × 4 day-counts → session split + per-session muscle priority ORDER (frequency = how many sessions list a muscle; session-1 first muscle = division lead). General/Bodybuilding/Women's-BB use legacy selectSplit instead. (Cell muscle-lists are structural data; indexed here, not per-cell transcribed.) | hardcoded | confirmed (6 division keys, 3/4/5/6 cells each, present)

RULE: MUSCLE_PATTERN / PATTERN_ANCHORS / patternFits | :1584-1620
CODE: `MUSCLE_PATTERN = { chest/front_delts/triceps:'push', back/rear_delts/biceps/traps:'pull', side_delts:'delts', quads/hamstrings/glutes/calves/adductors:'legs', abs:'core' }`; `PATTERN_ANCHORS = { push:['chest','front_delts'], pull:['back'], legs:['quads','hamstrings','glutes'] }`; side_delts fit any upper day; abs only onto an abs day
VALUE: movement-pattern map + which day a muscle may be added to (augmentation safety) | hardcoded | confirmed

RULE: buildFromMatrix structural coverage + weak-point augmentation | :1630-1671
CODE: append any missing STRUCTURAL_MUSCLE to a same-pattern session (end=maintenance); weak-point `const desired = Math.min(3, sessions.length, Math.max(2, Math.ceil(wTarget / 9)));` add to same-pattern sessions, `augCount[i] >= 1` (one aug/session), `s.muscles.unshift(m)` (leads)
VALUE: no structural muscle reads zero; weak point spread to ≤3 same-pattern sessions (~9 sets/session), 1 aug per session | hardcoded | confirmed

RULE: buildVolumeSummary indirect | :1725, 1746
CODE: `indirect[sec] = (indirect[sec] ?? 0) + ex.sets * INDIRECT_SET_FRACTION;`; `summary[key].indirectSets = Math.round(summary[key].indirectSets * 2) / 2;`
VALUE: secondary muscle = 0.5 set/working set; indirect reported rounded to halves; side/rear/front delts → 'shoulders' bucket | hardcoded | confirmed

RULE: progression block length | :1879-1880
CODE: `const weeks = (experience === 'advanced' || experience === 'competitive') ? 6 : 5;`
VALUE: 6-week block (advanced/competitive) / 5-week; +~1 set/exercise/week for weeks-1, final week ~half | hardcoded | confirmed

RULE: buildWarnings | :1923-1947
CODE: `experience === 'beginner' && daysPerWeek > 4`; `recoveryRating === 'poor' && effectiveDays >= 5`; `(aggressive_cut||contest_prep) && effectiveDays >= 5`; `competitive && recoveryRating === 'poor'`; `weakPointUILabels.length === 3`
VALUE: safety/expectation warnings at those thresholds | hardcoded | confirmed

RULE: SUPERSET_COMPATIBLE / canSuperset | :1973-1997
CODE: symmetric antagonist/non-competing muscle pairs (e.g. chest↔back, biceps↔triceps; excludes chest+triceps, back+biceps); `canSuperset` checks membership
VALUE: which muscle pairs may superset | hardcoded | confirmed

RULE: assignSupersets gates | :2009-2032
CODE: `if (exercises.length < 4) return;` `if (experience === 'beginner') return;` `const timeConstrained = (sessionLengthMinutes ?? 60) <= 50;` `if (!goalAllows && !timeConstrained) return;`; accessory start = skip `restSec >= 150`; `const MAX_PAIRS_PER_WORKOUT = 2;`; quads/hams pair allowed once
VALUE: supersets only: ≥4 exercises, non-beginner, allowed-goal or ≤50min session; accessories only (rest<150); ≤2 pairs | hardcoded | confirmed

RULE: SUPERSET_GOAL_ALLOWLIST | :2002-2006
CODE: general, general_hypertrophy, weak_point_spec, mens_physique, classic_physique, bodybuilding, bikini, wellness, figure, womens_physique (strength_size excluded) | hardcoded | confirmed

RULE: generatePlan input clamps | :2099, 2108-2111
CODE: `const safeWeakPointsUI = weakPoints.slice(0, 3);`; `const clampedDays = Math.min(6, Math.max(3, requestedDays));`; `const effectiveDays = (experience === 'beginner' && clampedDays > 4) ? 4 : clampedDays;`
VALUE: weak points cap 3; days clamped 3-6; beginners capped at 4 days | hardcoded | confirmed

RULE: matrix-vs-legacy split selection | :2130-2135
CODE: `const matrixCell = DIVISION_MATRIX[goal] ? DIVISION_MATRIX[goal][effectiveDays] : null;` `splitType = matrixCell ? DIVISION_MATRIX[goal].label : selectSplit(experience, effectiveDays, internalGoal);`
VALUE: 6 specialised divisions use DIVISION_MATRIX; others use selectSplit | hardcoded | confirmed

RULE: week-1 target start (MEV) | :2142-2144
CODE: `for (const [m, lm] of Object.entries(landmarks)) { weeklyTargets[m] = lm.MEV; }`
VALUE: weekly targets begin at MEV (then overlay/floors/caps) | hardcoded | confirmed

RULE: strength notes | :2185-2192
CODE: `if (internalGoal === 'strength_hypertrophy')` → for ex with `restSec >= 150 && !ex.notes`, add double-progression note
VALUE: strength-phase note on heavy lifts | hardcoded | confirmed

RULE: pipeline order + durationNote | :2200-2219
CODE: `clampDeliveredToMRV(...)` → per-workout `deduplicateExercises` → `trimToTimeBudget` → `assignSupersets` → strip internal tags → `estimateSessionMinutes`; `if (dur > sessionLengthMinutes + 15)` add durationNote
VALUE: finalisation order; duration note when >15min over target | hardcoded | confirmed

RULE: generatePlan pool set/restore | :2071-2079
CODE: `_effectivePool = buildEffectivePool(inputs?.exerciseLibrary); try { return _generatePlanInner(inputs); } finally { _effectivePool = prevPool; _weakPointKeys = prevWeakPoints; }`
VALUE: library pool active per-run, restored after (stateless between runs) | hardcoded | confirmed

(planEngine.js 1766-1817 EXPERIENCE/EQUIPMENT/RECOVERY/NUTRITION_PHASE_LABELS + buildWhyThis/
buildPersonalisationSummary copy = display strings, no thresholds; plan-name label maps :2255-2300.)

PLANENGINE.JS COMPLETENESS: read in full (1-2315); all rule-bearing thresholds/formulas/tables
transcribed verbatim above; no grep used to locate them. [DONE — TIER A]

=== TIER A COMPLETE: algorithms.js, nutritionEngine.js, weeklyCoach.js, coachApply.js,
edPatternDetector.js, planEngine.js all fully transcribed. Full transcription STOPS here.
Remaining Pass 1 work proceeds in TIER B (locate-and-cite, values deferred) + Section 1 gating. ===

---

## PROGRESS POINTER (re-paced 2026-06-13 — two tiers, supersedes full-transcription-of-everything)

TIER A — FULL TRANSCRIPTION (safety + core spine):
- [DONE] algorithms.js — read in full (1-1548), all rules verbatim above.
- [DONE] nutritionEngine.js — read in full (1-1103), all rules verbatim above.
- [DONE] weeklyCoach.js — read in full (1-~1380), all rules verbatim above.
- [DONE] coachApply.js floors; edPatternDetector.js thresholds.
- [NEXT — TIER A] planEngine.js — full rigour despite length (~2200 lines); core engine, max downstream risk.
- After planEngine.js: STOP full transcription. Switch to Tier B.

TIER B — LOCATE-AND-CITE (everything else; exact file:line, VALUE DEFERRED, completeness counts intact):
- All remaining engine files (mesocycle, blockAdvisor, swapEngine, cardioEngine, insightsEngine,
  robustTrend, weightTrend, recoveryEMA, stepsSummary, milestones, strengthStandards, poolGenerator,
  coachingGoals, coachRegister, coachResponse, sessionAdjustments, planAutoGen, planSwitch, clusterSet,
  liftProgress, restTimerMath, unilateral, wellbeing, coachOutputZones, differentialPaywall, dayKey).
- Pass 1 Sections 3,4,5,6,7,8 (data model, features, integration, settings, nav, design) — index only.
- Section 1 (entitlement gating): EXCEPTION — locate-and-cite carefully NOW (exact lines, confirm what
  each gate checks + spot-verify logic), high downstream consumption.

## (legacy not-yet list — superseded by the two tiers above; retained for the planEngine detail)
- planEngine.js: EXP/REC/NUT/AGE multipliers, MAV/MRV derivation guards, weak-point bonus, systemic
  factors, generator landmark overrides, rep-range/rest/RIR tables, superset gates, split frequencies.
- mesocycle.js: standard/advanced week factors, autoregulation rules, block-status.
- nutritionEngine.js: BMR formulas, surplus/gain-rate tables, fat targets/floor, sex kcal floors
  (male/female — to verify exact lines before writing), step-adjustment constants, recovery modifiers, deload frequency.
- weeklyCoach.js: EWMA alpha, PHASE_CONFIG rates, steps bands, on-target tolerance, data holds,
  cal-adjust deltas + cap, deload triggers, refeed, adherence/safety/FFM holds, rapid-loss override.
- blockAdvisor.js, swapEngine.js, cardio/cardioEngine.js, insightsEngine.js, robustTrend.js,
  weightTrend.js, recoveryEMA.js, stepsSummary.js, milestones.js, strengthStandards.js,
  poolGenerator.js, coachingGoals.js, coachRegister.js, coachResponse.js, sessionAdjustments.js,
  planAutoGen.js, planSwitch.js, clusterSet.js, liftProgress.js, restTimerMath.js, unilateral.js,
  coachOutputZones.js, and any src/coaching/safety/* — all to transcribe verbatim.
</content>
