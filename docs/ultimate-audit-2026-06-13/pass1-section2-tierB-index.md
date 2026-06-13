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

## STILL TO LOCATE-AND-CITE (Tier B engine remainder — none dropped):
robustTrend.js, weightTrend.js, recoveryEMA.js, stepsSummary.js, milestones.js, strengthStandards.js,
poolGenerator.js, coachingGoals.js, coachRegister.js, coachResponse.js, sessionAdjustments.js,
planAutoGen.js, planSwitch.js, clusterSet.js, liftProgress.js, restTimerMath.js, unilateral.js,
wellbeing.js, coachOutputZones.js, differentialPaywall.js, dayKey.js, + blockAdvisor.js (above).
