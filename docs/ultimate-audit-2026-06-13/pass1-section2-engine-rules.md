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

## TRANSCRIPTION PROGRESS (full Pass 1, by hand, no agents)
- [DONE] algorithms.js — read in full (1-1548), all rules transcribed verbatim above.
- [DONE] nutritionEngine.js SAFETY constants (loss-rate gates, FFM floor, kcal floors, protein caps,
  EWMA alpha) — remaining nutritionEngine rules (BMR, surplus/gain tables, fat targets, sex floors,
  step constants, recovery modifiers, deload frequency) still to do via full read.
- [DONE] coachApply.js floors; edPatternDetector.js thresholds.

## NOT YET TRANSCRIBED (to be completed, verbatim, full-read method — none dropped)
- nutritionEngine.js: the non-safety rules listed above (full read pending).
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
