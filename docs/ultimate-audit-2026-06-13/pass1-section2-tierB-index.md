# PASS 1 — SECTION 2 TIER B: remaining engine files (LOCATE-AND-CITE)

Method (founder re-pace): exact file:line for every rule/constant/function; **VALUE DEFERRED —
verify on consumption**. Completeness: every exported rule + named constant per file listed; none
dropped. No `~`. Values are pulled+verified when a Pass 4 blueprint consumes them.

## src/lib/mesocycle.js
- `MESO_SCHEDULE` :14 (week volume-factor schedule, standard/advanced) — VALUE DEFERRED
- `getCurrentMesoWeek` :48 · `getMesoSchedule` :72 · `getWeekSetsMultiplier` :85 · `isRecoveryWeek` :103
- `getVolumeTargetsForWeek` :121 · `buildWeeklyProgression` :138 · `evaluateAutoReg` :173 (autoreg rules — VALUE DEFERRED)
- `predictDeloadWeek` :276 · `applyTimeCrunch` :333 (rest reduction — VALUE DEFERRED) · `getBlockStatus` :427
COMPLETENESS: 1 schedule const + 10 exported functions.

## src/lib/swapEngine.js
- Score constants :13-24 — `SCORE_SAME_PRIMARY_MUSCLE`:13, `SCORE_SAME_SUBREGION`:19, `SCORE_SAME_MOVEMENT_PATTERN`:20, `SCORE_SAME_EQUIPMENT`:21, `SCORE_SAME_COMPOUND_ISOLATION`:22, `SCORE_SIMILAR_FATIGUE_COST`:23, `SCORE_SIMILAR_SFR`:24 — VALUE DEFERRED (values exist; pull on consumption)
- `SIMILAR_WITHIN` :25 · `ASSISTED_RE` :31
- `buildSwapReason` :98 · `rankSwaps` :191 · `detectJointDiscomfortPattern` :252 (windowMs default) · `autoSwapForJointDiscomfort` :293
COMPLETENESS: 7 score consts + 2 helper consts + 4 functions.

## src/lib/cardio/cardioEngine.js
- `MAX_CARDIO_SESSIONS` :24 — VALUE DEFERRED
- `cutCardioTarget` :31 · `healthCardioTarget` :62 · `pausedCardioTarget` :76 · `cardioComplianceFromLog` :88
- `summariseWeekCardio` :102 · `nextCardioTarget` :125 · `cardioRecoveryFlag` :166
COMPLETENESS: 1 const + 7 functions.

## src/lib/insightsEngine.js
- `DAY_MS` :17 · `WEEK_MS` :18
- `generateInsights` :60 (all insight thresholds: under-MEV, peaked/stalled lift, recovery warn, deload-due, gentle rhythm — VALUE DEFERRED, internal to this fn)
- `rankAndCapInsights` :235 (max default 3 — VALUE DEFERRED)
COMPLETENESS: 2 time consts + 2 functions (thresholds nested in generateInsights, verify on consumption).

## src/lib/blockAdvisor.js
- LOCATE PENDING: grep for `^export`/`const` returned nothing on the standard pattern; needs a
  targeted read to enumerate (likely arrow-fn exports or different casing). Flagged so it is NOT
  dropped — must be indexed before Pass 3 consumes block-advisor readiness rules.

## src/lib/blockAdvisor.js (readiness / next-block advisor)
- `checkinReadiness` :45 · `mean` :53 · `stdDev` :58 · `zScore` :64 · `detectSignals` :78 (energy/soreness/sleep/z-score/sustained-fatigue thresholds — VALUE DEFERRED)
- `buildNextBlockRecommendation` :154 · `getBlockAdvice` :216 (async, main export) · `buildEarlyDeloadBody` :336 · `buildHeadsUpBody` :361
COMPLETENESS: 9 functions (readiness weights + signal thresholds nested in checkinReadiness/detectSignals, verify on consumption). Resolves the earlier LOCATE-PENDING.

## src/lib/robustTrend.js
- `ROBUST_DEFAULTS` :28 · `ROBUST_TRACKING_DEFAULTS` :159 (alpha/k/madWindow/scaleFloor/knee/beta — VALUE DEFERRED)
- `median` :37 · `mad` :48 · `robustEwma` :63 · `robustValues` :100 · `robustLatest` :121 · `robustSevenDaysAgo` :127 · `robustTrackingEwma` :168 · `robustTrackingLatest` :204 · `robustTrackingSevenDaysAgo` :210
COMPLETENESS: 2 default-objs + 9 functions.

## src/lib/weightTrend.js
- `trendStateFor` :19 (entry-count state thresholds — VALUE DEFERRED) · `confidenceLabel` :27 · `isDiverging` :39 (tolerance — VALUE DEFERRED) · `stepTrendLineFor` :59 · `deriveWeightTrend` :70 (dot-class cap — VALUE DEFERRED)
COMPLETENESS: 5 functions.

## src/lib/recoveryEMA.js
- `HALF_LIFE_DAYS` :11 · `DAY_MS` :12 (VALUE DEFERRED) · `emaValue` :23 · `computeRecoveryEMAs` :48 · `emaWeekOverWeekPct` :77 · `dailySeries` :97
COMPLETENESS: 2 consts + 4 functions.

## src/lib/stepsSummary.js
- `DEFAULT_MIN_DAYS` :16 (VALUE DEFERRED) · `summariseWeekSteps` :18 (registered-threshold, zero-day exclusion — VALUE DEFERRED)
COMPLETENESS: 1 const + 1 function.

## src/lib/strengthStandards.js
- `STRENGTH_STANDARDS` :16 (per-lift × level BW multiples — VALUE DEFERRED) · `LEVEL_LABELS` :39 · `STRENGTH_TIERS` :94 · `getStrengthLevel` :56 · `summariseStrengthStanding` :108
COMPLETENESS: 3 consts + 2 functions.

## src/lib/coachingGoals.js (goal/phase config consumed by planEngine + weeklyCoach)
- `PHYSIQUE_GOAL_GROUPS` :24 · `PHYSIQUE_GOALS` :26 · `GOAL_LABELS` :114 · `GOALS_WITH_WEAK_POINTS` :118
- `WEAK_POINT_MUSCLES` :126 · `WEAK_POINT_REGION` :136 · `WEAK_POINT_SETS` :152 · `weakPointSetForGoal` :163
- `shouldShowGoalLockOnboarding` :183 · `isCompetitionGoal` :193 · `TRAINING_PHASES` :201 · `PHASE_LABELS` :271
- `phaseToNutritionKey` :276 · `phaseToCoachingKey` :283 · `daysToActivityLevel` :300 (activity-level bands — VALUE DEFERRED)
- `buildNutritionEngineInputs` :321 · `migrateProfileGoals` :360
- `GOAL_OVERLAYS` :419 (per-division muscle multipliers — VALUE DEFERRED, consumed by planEngine applyGoalOverlay)
- `PHASE_OVERLAYS` :568 (strength_size isolation reduction — VALUE DEFERRED) · `getTrainingNote` :578
COMPLETENESS: 12 consts + 8 functions.

## src/lib/coachRegister.js (coach voice register + science layer — note: withScience etc. are pre-existing; the U-B-9 additions were reverted earlier)
- `clean` :47 · `TONE_PREFERENCES` :64 · `resolveRegister` :80 (register rules — VALUE DEFERRED)
- `preciseAcknowledgement` :100 · `onTargetStreak` :137 · `preciseInterpretation` :147 · `preciseCue` :174 · `preciseForward` :214
- `buildRegisteredCoachResponse` :254 · `withScience` :308 · `checkJargonScienceOn` :327
COMPLETENESS: 1 const + 10 functions.

## src/lib/coachResponse.js (5-part coach narration builder)
- `clean` :40 · `plural` :53 · `ORDINAL_WORDS` :59
- `buildAcknowledgement` :75 · `onTargetStreak` :128 · `buildInterpretation` :143 · `buildDecision` :185 · `buildCue` :227 (sleep-cue + weigh-in-thin thresholds — VALUE DEFERRED) · `buildForward` :280
- `buildCoachResponse` :327 · `buildFreeCoachLine` :406
COMPLETENESS: 1 const-map + 10 functions.

## src/lib/milestones.js
- `WEEK_MS` :42 · `KEY` :43 · `MILESTONES` :50 (sessions_5/10/25/50/100 + first_pr ladder — VALUE DEFERRED) · `SESSION_RUNGS` :96
- `normalise` :100 · `hasThreeInSeven` :115 · `isEarned` :127 · `earnedMilestones` :139 · `selectMilestone` :148 · `nextSessionRung` :158
COMPLETENESS: 4 consts + 6 functions.

## src/lib/poolGenerator.js
- `HEAVY_CATEGORIES` :18 · `MACHINE_CATEGORIES` :19 · `SUBREGION_TRANSLATION` :34 · `DEFAULT_SUBREGION` :50 · `NON_HYPERTROPHY_PATTERNS` :112 · `NON_HYPERTROPHY_NAMES` :113 (VALUE DEFERRED)
- `deriveParamKey` :21 · `translateSubregion` :67 · `parseProfiles` :79 · `toPoolEntry` :88 · `isHypertrophyExercise` :117 · `generatePoolFromLibrary` :128 · `findThinMuscles` :148 (minPerMuscle default 3 — VALUE DEFERRED)
COMPLETENESS: 6 consts + 7 functions.

## src/lib/sessionAdjustments.js
- `WEEK_MS` :33 (the session-autoreg RULES live in algorithms.js computeSessionAdjustments, already Tier-A transcribed; this file is the DB-IO wrapper + meso-session gate)
COMPLETENESS: 1 const + IO wrapper (rules cross-referenced to algorithms.js).

## src/lib/planAutoGen.js
- `PLAN_WHYTHIS_KEY` :32 · `DEFAULT_DAYS_PER_WEEK` :63 (VALUE DEFERRED) · `buildPlanInputs` :75 · `planShortfallNote` :108
COMPLETENESS: 2 consts + 2 functions. (SESSION_LENGTH default + plan orchestration cross-ref planEngine.)

## src/lib/planSwitch.js
- LOCATE PENDING (loose-grep, like blockAdvisor was): silent-switch gates (week<=1, status!=active) known to exist; enumerate before Pass 3 consumes. Not dropped.

## src/lib/clusterSet.js
- `CLUSTER_SET_TYPES` :18 (myo_reps, rest_pause) · `LABELS` :20 · `isClusterType` :29 · `clusterLabel` :36 · `cleanReps` :44 · `summariseCluster` :62 · `mergeClusterNote` :78
COMPLETENESS: 2 consts + 5 functions.

## src/lib/liftProgress.js
- `buildLiftProgressRows` :34 (best-session e1RM, delta%, min-sessions — VALUE DEFERRED)
COMPLETENESS: 1 function.

## src/lib/restTimerMath.js
- `clampRestDelta` :8 (rest-timer floor — VALUE DEFERRED)
COMPLETENESS: 1 function.

## src/lib/unilateral.js
- `UNILATERAL_KEY` :23 · `lowerSideReps` :29 · `formatPerSide` :44
COMPLETENESS: 1 const + 2 functions.

## src/lib/wellbeing.js
- `WELLBEING_KEY` :14 · `WELLBEING_HELPLINE` :16 (Beat UK number — VALUE DEFERRED) · `isCalm` :34
COMPLETENESS: 2 consts + 1 function.

## src/lib/coachOutputZones.js
- `selectCoachOutputZones` :16 (hero/secondary/safety zone assignment — VALUE DEFERRED)
COMPLETENESS: 1 function.

## src/lib/differentialPaywall.js
- `LOCKED_COPY` :48 · `LOCKED_COPY_NO_TRIAL` :61 · `TRIGGER_CONTEXTS` :71 (VALUE DEFERRED) · `detectDifferentialTrigger` :102 (2-of-3 adherence gate — VALUE DEFERRED)
COMPLETENESS: 3 consts + 1 function.

## src/lib/dayKey.js
- `localDayKey` :17 · `todayLocalKey` :27 · `parseLocalDay` :37 · `localWeekStartMs` :53
COMPLETENESS: 4 functions.

## SECTION 2 TIER B STATUS
All listed engine files indexed (locate-and-cite, exact lines, VALUE DEFERRED). LOCATE-PENDING:
planSwitch.js (loose-grep, like blockAdvisor) — the only outstanding item before Section 2 is fully
indexed. Sections 3-8 (data model, features, integration, settings, nav, design) index next.
