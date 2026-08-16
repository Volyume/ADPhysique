# GRAPH-TRAINING — Volyume production coach decision graph (training side)

Campaign 21 Step 1, TRAINING LANE. Read-only research; no code or tests
touched.

## Method

Traced from the "known starting seams" in the brief outward, by:
1. `Grep` for every `export function|const` in each seed file to enumerate
   candidate rules.
2. `Grep` across `src/screens` and `src/store` for each function/constant
   name to find production callers (never trusted a doc comment claiming a
   caller; the grep result is the evidence).
3. `Read` of the full function body for every rule recorded below, so
   thresholds are copied from the literal source, not inferred.
4. Where a file's own production caller could not be found, it is marked
   DEAD or TEST-ONLY below with the grep evidence.

Files opened in full or in load-bearing part (paths relative to
`/home/user/ADPhysique`):

- `src/lib/weeklyCoach.js` (2557 lines, opened in full)
- `src/lib/coachApply.js` (334 lines, full)
- `src/lib/coachIntervention.js` (618 lines, full)
- `src/lib/coachPrecedence.js` (476 lines, full)
- `src/lib/coachingGoals.js` (getTrainingNote + phase tables, partial)
- `src/lib/mesocycle.js` (573 lines, full)
- `src/lib/programmeEpoch.js` (461 lines, full)
- `src/lib/blockReview.js` (234 lines, full)
- `src/lib/blockAdvisor.js` (945 lines, full)
- `src/lib/blockLedgerGather.js` (partial — gather/classification helpers)
- `src/lib/blockLedgerRunner.js` (export surface + production callers)
- `src/lib/interBlock.js` (classification constants + BLOCK_CLASS)
- `src/lib/effectiveLandmarks.js` (162 lines, full)
- `src/lib/algorithms.js` (1394 lines, full)
- `src/lib/sessionAdjustments.js` (356 lines, full)
- `src/lib/recoveryState.js` (298 lines, full)
- `src/lib/programmePosition.js` (235 lines, full)
- `src/lib/blockProgression.js` (408 lines, full)
- `src/lib/livePrescription.js` (999 lines, full)
- `src/lib/exercise/intent.js` (production export surface + evidence/rank
  functions, partial)
- `src/lib/reEntryEaseState.js` (export surface)
- `src/lib/workoutHelpers.js` (`_timeCrunchSkipped` rule)

Production callers confirmed by `Grep` (not by reading a comment) in:
`src/screens/CoachOutputScreen.js`, `HomeScreen.js`, `PlansScreen.js`,
`ActiveWorkoutScreen.js`, `WorkoutSummaryScreen.js`, `CoachReviewScreen.js`,
`RoutineDetailScreen.js`, `BlockReflectionScreen.js`, and
`src/lib/database.js` / `src/hooks/useProgressData.js` /
`src/lib/effectiveLandmarks.js` as the intermediate library callers where a
screen calls a wrapping lib function rather than the engine directly.

Every rule below is PRODUCTION unless explicitly marked DEAD or TEST-ONLY.

---

## DOMAIN: weekly (runWeeklyCoach and its satellites)

Entry point: `CoachOutputScreen.js:1825` calls `runWeeklyCoach({...})`;
output persisted via `saveCoachOutput` (`CoachOutputScreen.js:1193` /
`:1257` / `:1322` / `:1380` / `:1455` / `:2092`) into `coach_outputs`.

```
RULE_ID: T-WEEKLY-01
DOMAIN: weekly
AUTHORITY: src/lib/weeklyCoach.js:186 assessDataConfidence
PRODUCTION_CALLER: weeklyCoach.js:820 runWeeklyCoach -> CoachOutputScreen.js:1825
INPUTS: weigh-in DISTINCT calendar-day count (weighInDayCount, deduped by
  localDayKey, clock-anchored to nowMs), calsAdherence known/untracked,
  weeksInPhase, hasUnusualEvent (checkin.notes non-empty)
OUTPUT: confidence.level in {high, medium, low, data_hold}; holdMessage
THRESHOLDS: weigh_ins < 3 -> data_hold ("fewer than 3 different days");
  hasUnusualEvent && weigh_ins < 5 -> data_hold; weigh_ins < 5 -> medium;
  weeksInPhase < 2 -> low
PRECEDENCE: data_hold is a hard early-return from runWeeklyCoach (line 827)
  that suppresses every calorie/training/deload/diet-break decision this run
  and returns training.signal = 'hold' unconditionally
PERSISTENCE: confidence.level and dataNote persisted in coach_outputs blob
USER_VISIBLE: holdMessage text; weekLabel; adjustments.training = {signal:
  'hold', note: 'Plan unchanged...'}
PROVENANCE: none (pre-provenance vocabulary; this is weeklyCoach's own gate)
SENIOR_RULES: none outrank this — it is itself the senior gate for the run
EXCLUSIONS: none (runs for every tier that reaches runWeeklyCoach; free tier
  never calls it per proGate)
NOTES: weighInDayCount is clock-anchored (nowMs), not data-anchored, per C6
  R-1/D97-22 — a returning user whose last weigh-ins are old scores fewer
  days, so the hold fires MORE not less.
```

```
RULE_ID: T-WEEKLY-02
DOMAIN: weekly
AUTHORITY: src/lib/weeklyCoach.js:261 corroborateConfidenceLevel (D18)
PRODUCTION_CALLER: weeklyCoach.js (called near the return of runWeeklyCoach)
  -> CoachOutputScreen.js photoCorroboration path (guarded by
  CoachOutputScreen.photoCorroborationCaption.test.js)
INPUTS: baseLevel (confidence.level), photoCorroboration {eligible,
  direction}, suppressed (calm mode / open-or-just-fired ED flag / any
  safety hold)
OUTPUT: possibly-raised confidence level string, DISPLAY ONLY
THRESHOLDS: exactly one step on ['low','medium','high']; never moves
  'data_hold'; only 'supports' direction moves it; ceiling at 'high'
PRECEDENCE: display-only — pinned NEVER to reach any calorie/macro/
  training/floor decision (isolation guard test:
  progressScanSafetyFloorIsolation.test.js)
PERSISTENCE: emitted confidence field only
USER_VISIBLE: the confidence caption shown beside the trend
PROVENANCE: none
SENIOR_RULES: suppressed=true (calm mode/ED flag/any safety hold) forces
  return of baseLevel unchanged
EXCLUSIONS: never applies to data_hold
NOTES: pure, deterministic bounded-delta rule; a strict "training lane"
  reader should treat this as informational only.
```

```
RULE_ID: T-WEEKLY-03
DOMAIN: weekly
AUTHORITY: src/lib/weeklyCoach.js:279 getRecoveryScore, :344
  contextAdjustedRecovery, :371 autoregulationMatrix (RP-style)
PRODUCTION_CALLER: runWeeklyCoach body -> CoachOutputScreen.js:1825
INPUTS: energyScore, sorenessScore, stressScore (checkin), performanceScore
  (sessionAdherence, prsThisWeek, trainingPerformance, sessionsCompleted,
  blockE1rmSlopePct), blockWeekIndex, blockAccumWeeks,
  consecutivePoorRecoveryWeeks, consecutiveGrade3RecoveryWeeks
OUTPUT: {volumeDelta: -2|-1|0|1|2|3, trainingSignal: 'reduce'|'hold'|'push',
  deloadFlag: boolean}
THRESHOLDS: recovery score 1-4: soreness>=4 -> 4; energy<=2 OR soreness>=3
  -> 3; energy>=4 AND soreness<=1 -> 1; else 2. stress>=4 AND score<3 forces
  score=3 (PIPE-001, never improves the read). performance score 1-4: PR
  density strong = prsThisWeek/sessionsCompleted >= 0.3 (PR_DENSITY_STRONG)
  OR blockE1rmSlopePct >= 1.5 (BLOCK_SLOPE_STRONG_PCT) with adherence>=0.9
  -> 1; trainingPerformance==='dropped' OR adherence<0.5 -> 4;
  'struggled' OR adherence<0.75 -> 3; 'hit' OR adherence>=0.75 -> 2.
  Matrix: recovery==4 OR (recovery>=3 AND performance>=4) -> deload
  (volumeDelta -2); recoveryForPush==3 OR performance==3 -> hold (0);
  recoveryForPush==1 AND performance==1 -> push +3; either ==1 -> push +2;
  both 2 -> push +1.
  Peak-week softening (Stage 4, contextAdjustedRecovery): a grade-3
  soreness-driven recovery reading in the block's FINAL accumulation week
  (blockAccumWeeks>=3, blockWeekIndex===blockAccumWeeks) softens 3->2 for
  the push/hold branch ONLY (never the deload branch, which always reads
  the RAW grade) when soreness>=3, energy(null or)>=3, stress(null or)<4,
  AND consecutivePoorRecoveryWeeks<1 AND consecutiveGrade3RecoveryWeeks<1.
PRECEDENCE: deload branch always reads RAW recovery grade regardless of
  peak-week softening ("the founder red line: deload thresholds
  unchanged"). Softened grade only ever used by push/hold branches.
PERSISTENCE: volumeSignal / trainingSignal / recoveryFlag / matrixDeload
  written into coach_outputs
USER_VISIBLE: trainingNote (getTrainingNote), deloadSuggested banner
PROVENANCE: whyKeys chain (push_volume / recovery_lagging /
  deload_suggested / exceeded_escalation)
SENIOR_RULES: coordinateChanges (T-WEEKLY-08) can withhold the resulting
  volumeSignal even after computed; safety holds gate D15 escalation
EXCLUSIONS: n/a (always runs post data-confidence gate)
NOTES: PR_DENSITY_STRONG=0.3, BLOCK_SLOPE_STRONG_PCT=1.5 are Stage-4
  (2026-08-09) constants replacing the old "any PR + adherence" binary.
```

```
RULE_ID: T-WEEKLY-04
DOMAIN: weekly
AUTHORITY: src/lib/weeklyCoach.js:2085 autoApplyHoldActive gate (D16)
PRODUCTION_CALLER: runWeeklyCoach -> emitted flag consumed by
  CoachOutputScreen.js (coach-autonomy apply flow)
INPUTS: deloadSuggested, matrixDeload, poorRecovery, safetyHold,
  ffmFloorHeld, edPatternHeld, rapidWeightLossFlag, scoffPositive, calmMode
OUTPUT: single boolean autoApplyHoldActive
THRESHOLDS: OR of the 9 named booleans (no numeric threshold)
PRECEDENCE: senior to every autonomy-mode auto-apply; a more autonomous
  coachAutonomy mode changes WHO confirms, never whether this hold applies
PERSISTENCE: emitted field only, read by the apply-confirmation UI
USER_VISIBLE: forces confirm-first behaviour even in a more autonomous mode
PROVENANCE: n/a
SENIOR_RULES: this IS the senior rule (ED-safety/D18/D15/wellbeing/calm
  mode composite)
EXCLUSIONS: n/a
NOTES: single emitted flag so no downstream consumer re-derives the hold
  list from raw signals it cannot see.
```

```
RULE_ID: T-WEEKLY-05
DOMAIN: weekly
AUTHORITY: src/lib/weeklyCoach.js:2115-2145 sustained over-performance
  escalation (D15)
PRODUCTION_CALLER: runWeeklyCoach -> CoachOutputScreen.js
INPUTS: consecutiveExceededWeeks (caller-derived), trainingSignal,
  peakWeekContextApplied, deloadSuggested, matrixDeload, poorRecovery,
  safetyHold, ffmFloorHeld, edPatternHeld, rapidWeightLossFlag,
  scoffPositive, calmMode, volumeDecisionMemory.blockEscalation,
  coordinationVolumeHeld
OUTPUT: bounded +1 step to volumeSignal (never more than one step)
THRESHOLDS: EXCEEDED_ESCALATION_WEEKS = 3 (>= 3 consecutive prior
  'exceeded' weeks); MATRIX_PUSH_CEILING = 3 (never exceeds
  autoregulationMatrix's own +3 ceiling); only applies when
  trainingSignal==='push'
PRECEDENCE: gated OFF entirely by ANY of: peak-week-softened push,
  deloadSuggested, matrixDeload, poorRecovery, safetyHold, ffmFloorHeld,
  edPatternHeld, rapidWeightLossFlag, scoffPositive, calmMode,
  volumeMemory.blockEscalation (C18 job B3 — no escalation on top of a
  dose that already did nothing or cost the athlete), or
  coordinationVolumeHeld (C18 job C — coordination gate withheld the
  change, escalation must not resurrect it)
PERSISTENCE: volumeSignal, exceededEscalationApplied written to
  coach_outputs
USER_VISIBLE: whyKeys 'exceeded_escalation' copy: "You have been ahead of
  your plan for three weeks running..."
PROVENANCE: exceeded_escalation (WHY_LIBRARY key)
SENIOR_RULES: every ED/recovery/coordination hold above outranks it
EXCLUSIONS: calmMode explicitly gates this training-only signal (the ONE
  training signal in this file that is calm-mode-gated, per the code
  comment at line ~628)
NOTES: still downstream-clamped by computeVolumeApply's [mev,mrv] clamp
  (coachApply.js:269) — this rule cannot itself exceed recoverable volume.
```

```
RULE_ID: T-WEEKLY-06
DOMAIN: weekly
AUTHORITY: src/lib/weeklyCoach.js:29-30 PHASE_CONFIG / phaseConfig,
  coachingGoals.js:620 getTrainingNote
PRODUCTION_CALLER: runWeeklyCoach -> CoachOutputScreen.js
INPUTS: trainingGoal, volumeSignal, trainingSignal, matrixDeload
OUTPUT: trainingNote text, goal-specific (9 physique-goal variants +
  general fallback)
THRESHOLDS: matrixDeload -> fatigue copy; trainingSignal==='reduce' ->
  reduce copy; ==='hold' -> hold copy; volumeSignal>=2 -> push-high copy;
  volumeSignal===1 -> push-light copy
PRECEDENCE: matrixDeload > reduce > hold > push-high > push-light
PERSISTENCE: trainingNote string in coach_outputs
USER_VISIBLE: yes, the training-note line on CoachOutputScreen
PROVENANCE: n/a (copy layer)
SENIOR_RULES: none (copy only; obeys whatever signal upstream computed)
EXCLUSIONS: none
NOTES: purely a copy-selection function — no numeric decision of its own;
  included because the copy IS a consequential "what the athlete is told
  to do" surface per the mission's definition of consequential.
```

```
RULE_ID: T-WEEKLY-07
DOMAIN: weekly
AUTHORITY: src/lib/coachIntervention.js (whole file) — OBSERVE windows,
  classifyOutcome, wouldReverseRecent (anti-oscillation), doseEscalation,
  volumeDecisionMemory, holdReinforcement
PRODUCTION_CALLER: weeklyCoach.js imports {wouldReverseRecent,
  doseEscalation, holdReinforcement, volumeDecisionMemory} at top of file
  (line 30) and uses them inside runWeeklyCoach -> CoachOutputScreen.js
INPUTS: priorInterventions (from coachIntervention.interventionsFromHistory
  over appliedAdjustments history), current coachContext (`after`), nowMs,
  goalPhase
OUTPUT: doseEscalation -> {multiplier: 1.5, escalate, because}; anti-
  oscillation -> blocks a reversal of an unjudged recent change;
  volumeDecisionMemory -> {holdIncrease, blockEscalation, because}
THRESHOLDS: DOSE_ESCALATION_MULTIPLIER = 1.5. Observation windows
  (OBSERVE table): CALORIE_TARGET min 2 weeks; VOLUME_START min 2 weeks
  (BOTH training.progress AND recovery.systemic must be GOOD for IMPROVED);
  PRESCRIPTION min 3 exposures; EXERCISE_REPLACEMENT min 3 exposures;
  STRUCTURE min 4 weeks.
PRECEDENCE: CONFOUNDED is checked before any outcome classification
  (user_changed_it_themselves, goal_phase_changed_or_unknown,
  training_stopped -- training.execution.signal !== GOOD,
  manualVolumeMuscles confound for VOLUME_START, diary_coverage_lost for
  CALORIE_TARGET). Only UNCHANGED and WORSENED are acted on by
  volumeDecisionMemory; CONFOUNDED and IMPROVED never resize a future
  change ("CONFOUNDED NEVER TEACHES").
PERSISTENCE: intervention record stored inside
  appliedAdjustments[key].intervention on the coach_outputs row at apply
  time (coachApply.markApplied writes it; the caller supplies the record)
USER_VISIBLE: outcomeCopy() text ("Since we raised your calorie target,
  things have moved into the range we were aiming for.")
PROVENANCE: n/a (own vocabulary: OUTCOME.{IMPROVED,UNCHANGED,WORSENED,
  INSUFFICIENT_EVIDENCE,CONFOUNDED})
SENIOR_RULES: volumeDecisionMemory only ever WITHHOLDS a push
  (holdIncrease/blockEscalation), never creates or reverses a change; a
  volume REDUCTION is explicitly untouched by this memory (dir<=0 short-
  circuits to inert)
EXCLUSIONS: only records interventions the user explicitly APPLIED
  (markApplied); a declined suggestion is never scored
NOTES: this is the "memory" layer feeding T-WEEKLY-05's
  volumeMemory.blockEscalation gate.
```

```
RULE_ID: T-WEEKLY-08
DOMAIN: weekly
AUTHORITY: src/lib/coachPrecedence.js:264 chooseInterventions, :380
  coordinateChanges (THE COORDINATION GATE, C18 job C)
PRODUCTION_CALLER: weeklyCoach.js:1742 coordinateChanges(...) inside
  runWeeklyCoach -> CoachOutputScreen.js
INPUTS: coachContext (classifyLimiters output), proposed
  {calorieChange, volumeChange}, safety {calorie: rapidLossOverride}
OUTPUT: {allowCalorieChange, allowVolumeChange, holds[], both}
THRESHOLDS: no new numeric threshold — reuses classifyTrainingLimiter /
  classifyNutritionLimiter's existing signal states (GOOD/POOR/UNKNOWN).
  R1 (nutrition permission): calorie change held if
  nutrition.limiter===EXECUTION (target not eaten) unless it is a safety
  correction. R2 (training permission): a volume ADD (never a reduction)
  is held if training.limiter===EXECUTION (sessions missed) or
  training.limiter===RECOVERY (recovery calls for restraint). R3 (minimum
  effective intervention): when BOTH a calorie change and a volume ADD
  survive R1/R2, whichever domain's limiter is INSUFFICIENT_EVIDENCE is
  held (training checked first, then nutrition) — "do not change both
  merely because both engines found weak evidence"; two domains that both
  reached PLAN may both change.
PRECEDENCE: safety-marked calorie changes (rapidLossOverride) and ANY
  volume REDUCTION are NEVER withheld by this gate — explicitly senior to
  coordination.
PERSISTENCE: coordinationCalorieHeld / coordinationVolumeHeld reasons
  folded into heldDecisions, persisted in coach_outputs
USER_VISIBLE: held-decision copy explaining why a change did not land this
  week
PROVENANCE: hold reasons 'target_not_eaten', 'sessions_missed',
  'recovery_calls_for_restraint', 'one_change_at_a_time'
SENIOR_RULES: this gate itself sits BELOW every domain engine's own safety
  clamp (calorie floors, FFM floor, ED lockouts, autoregulation matrix) —
  "it can only ever WITHHOLD... never creates a change, enlarges one,
  reverses one or relaxes a clamp"
EXCLUSIONS: never fires for a volume reduction or a safety-flagged calorie
  correction
NOTES: this is the only production consumer of coordinateChanges found by
  grep; chooseInterventions/conflictOutcome have no other production
  caller besides coachStory.js (copy layer, not decision layer).
```

```
RULE_ID: T-WEEKLY-09
DOMAIN: weekly
AUTHORITY: src/lib/weeklyCoach.js:107-174 weeklyComparatorMs,
  elapsedWeeksSinceComparator, weeklyComparatorFresh, getEwmaSevenDaysAgo
PRODUCTION_CALLER: runWeeklyCoach (weight-trend section) -> CoachOutputScreen.js
INPUTS: morningWeights[], nowMs
OUTPUT: normalised per-week trend rate (weightDelta, computeWeeklyTrendPct)
THRESHOLDS: comparator must be <= nowMs-7d; comparator freshness boundary
  = 14 days (weeklyComparatorFresh); elapsedWeeksSinceComparator floored at
  1 week
PRECEDENCE: feeds T-WEEKLY-03's on-target/off-target read and the rapid-
  loss/ED detector (nutrition-adjacent; noted for completeness since it
  also drives whether a volume "push" reads as evidence)
PERSISTENCE: trend.ewma7 / trend.delta persisted in coach_outputs
USER_VISIBLE: trend delta/rate label
PROVENANCE: n/a
SENIOR_RULES: n/a
EXCLUSIONS: n/a
NOTES: SUSPECTED area of prior defect (now fixed per code comments, C10A
  RB6-2 / C6 RB6-2 D97-25) — historical bug where a stale comparator was
  read as "this week's" rate; documented here only as engine context, not
  a live defect.
```

---

## DOMAIN: programme (block/programme lifecycle)

Entry point: `PlansScreen.js` imports `{getBlockAdvice, buildNextBlockOptions,
applyAdjustEvidence}` from `blockAdvisor.js`; `blockAdvisor.js` internally
requires `blockReview.js` (`proposeNextBlock`, `verdictCopy`) and
`programmeEpoch.js`. `database.js:4312 activatePlanWithBlock` is the sole
block-creation write path.

```
RULE_ID: T-PROGRAMME-01
DOMAIN: programme
AUTHORITY: src/lib/mesocycle.js:28-29 BLOCK_PLANNED_WEEKS=6,
  BLOCK_DELOAD_WEEK=BLOCK_PLANNED_WEEKS
PRODUCTION_CALLER: src/lib/database.js:4312 activatePlanWithBlock (imports
  the two constants at database.js:13, writes them at :4361/:4400 into the
  mesocycles row on EVERY block creation)
INPUTS: none (compile-time constant)
OUTPUT: every block the app creates is 6 weeks total
THRESHOLDS: BLOCK_PLANNED_WEEKS = 6; last week (week 6) is always the
  recovery week
PRECEDENCE: authoritative over the generic MESO_SCHEDULE tables below (T-
  PROGRAMME-02), which have zero production callers
PERSISTENCE: mesocycles.planned_weeks / mesocycles.deload_week written at
  block creation
USER_VISIBLE: every "Week N of 6" / recovery-week surface
PROVENANCE: n/a
SENIOR_RULES: none
EXCLUSIONS: none — applies to every block, every tier
NOTES: CONFIRMS the CLAUDE.md law "5 accumulation weeks + week 6 recovery"
  is the live production structure. This is the single authority; no other
  file writes a different plannedWeeks default at block creation.
```

```
RULE_ID: T-PROGRAMME-02
DOMAIN: programme
AUTHORITY: src/lib/mesocycle.js:31-49 MESO_SCHEDULE (standard 5-week /
  advanced 6-week), :106 getCurrentMesoWeek
PRODUCTION_CALLER: DEAD IN PRODUCTION for week-position purposes.
  getCurrentMesoWeek has ZERO production callers (grep confirms only test
  files + this file's own JSDoc); the file's own comment (line 85-98)
  explicitly documents this as "RETAINED DESPITE ZERO PRODUCTION CALLERS"
  — kept only as a DST cross-check oracle in
  mesocycle.f10.dst.test.js and blockWeekResolver.test.js.
INPUTS: startDateMs, experience, nowMs
OUTPUT: 1-based week number, WRAPPING by experience schedule length
THRESHOLDS: standard = 4 accumulation + 1 recovery (5 weeks); advanced/
  competitive = 5 accumulation + 1 recovery (6 weeks)
PRECEDENCE: superseded in production by T-PROGRAMME-01/03
  (getCurrentBlockWeekIndex + getBlockStatus), which read the block's own
  stored plannedWeeks (always 6, per T-PROGRAMME-01) rather than a
  per-experience schedule
PERSISTENCE: none (test oracle only)
USER_VISIBLE: no
PROVENANCE: n/a
SENIOR_RULES: n/a
EXCLUSIONS: n/a
NOTES: DEAD/TEST-ONLY, confirmed by the module's own header comment and by
  grep (getCurrentMesoWeek has no import outside mesocycle.js and its own
  tests). Not a defect — deliberately retained as documented.
```

```
RULE_ID: T-PROGRAMME-03
DOMAIN: programme
AUTHORITY: src/lib/mesocycle.js:533 getBlockStatus, :513
  blockCompletionState, :164 getCurrentBlockWeekIndex
PRODUCTION_CALLER: blockAdvisor.js:676-686 getBlockAdvice ->
  PlansScreen.js; database.js:4742-4791 (mesocycle-week resolver);
  blockAdvisor.js:553 buildProgrammeReview
INPUTS: startDateMs, plannedWeeks (from the stored block row, always 6 per
  T-PROGRAMME-01), nowMs
OUTPUT: status in {active, recovery, completed_awaiting_decision},
  awaitingDecision, currentWeek, weeksOverdue, recoveryWeek
THRESHOLDS: currentWeek < recoveryWeek -> active; ===recoveryWeek ->
  recovery; > recoveryWeek -> completed_awaiting_decision (single state
  regardless of how many weeks overdue, per Stage 1 2026-08-09 ruling:
  "a finished block is ONE explicit state, however long it is ignored")
PRECEDENCE: this is the CALENDAR authority; programmePosition.js's
  activeWeekIndex (T-PROGRAMME-09) is the PROGRAMME authority and is
  senior for "which week is really active" (position beats calendar)
PERSISTENCE: no direct write; consumed for display + gating
USER_VISIBLE: "Week N of 6" headline, recovery-week banner,
  "Recovery week passed N weeks ago" copy
PROVENANCE: n/a
SENIOR_RULES: recoveryPhaseAllowed (programmePosition.js) can hold the
  'recovery' status back to 'active' narrative even once the calendar
  reaches it (see T-PROGRAMME-09)
EXCLUSIONS: none
NOTES: blockCompletionState (ABANDONED/COMPLETED/ACTIVE) is the separate
  HISTORICAL-block authority used by the epoch counter (T-PROGRAMME-06)
  — a block whose end_date was truncated by endActiveMesocycles (switch-
  away) reads ABANDONED and does not count as epoch evidence.
```

```
RULE_ID: T-PROGRAMME-04
DOMAIN: programme
AUTHORITY: src/lib/programmeEpoch.js:265 slotVerdict
PRODUCTION_CALLER: blockAdvisor.js:649 proposeNextBlock({slots, evidenceFor,
  ...}) inside buildProgrammeReview -> blockAdvisor.getBlockAdvice ->
  PlansScreen.js (Pro only, best-effort)
INPUTS: per-slot evidence {excluded, swappedAwayCount, jointDiscomfort,
  equipmentLost, autoEligible, redundant, conflictsWithGoal (if
  goalChanged), doesNotFitSession (if sessionLengthChanged), plateau,
  prescriptionFix, systematicCandidate, progressing, establishedPersonalFit},
  epochBlocks, executionJudgeable
OUTPUT: {verdict: KEEP|KEEP_WITH_PRESCRIPTION_CHANGE|REPLACE|
  REMOVE_OR_REDISTRIBUTE, reason: SLOT_REASON}
THRESHOLDS: swappedAwayCount >= 2 -> REPLACE (user_swapped_away); epoch
  review threshold EPOCH_REVIEW_BLOCKS = 3 (systematic variation gated on
  epochBlocks >= 3)
PRECEDENCE (exact order, code lines 276-350): (1) evidence.excluded ->
  REPLACE; (2) swappedAwayCount>=2 -> REPLACE; (3) jointDiscomfort ->
  REPLACE; (4) equipmentLost -> REPLACE; (5) autoEligible===false ->
  REPLACE; (6) redundant -> REMOVE_OR_REDISTRIBUTE; (7) goalChanged &&
  conflictsWithGoal -> REPLACE; (8) sessionLengthChanged &&
  doesNotFitSession -> REMOVE_OR_REDISTRIBUTE; (9) plateau &&
  executionJudgeable -> KEEP_WITH_PRESCRIPTION_CHANGE (if prescriptionFix)
  else REPLACE; (10) epochReviewDue && systematicCandidate &&
  !progressing && executionJudgeable -> REPLACE (SYSTEMATIC_VARIATION,
  the ONLY reason gated on the review threshold); (11) progressing -> KEEP
  (STILL_PRODUCTIVE); (12) !executionJudgeable -> KEEP
  (INSUFFICIENT_EXECUTION); (13) establishedPersonalFit -> KEEP
  (PERSONAL_FIT_KEEP); (14) !epochReviewDue -> KEEP
  (INSUFFICIENT_HISTORY); (15) else KEEP (NO_REASON_TO_CHANGE)
PERSISTENCE: not persisted directly — computed fresh each read
  (buildProgrammeReview is best-effort / read-only); the USER's acceptance
  of a proposed change writes through the normal plan-edit paths
USER_VISIBLE: programmeReview.copy (verdictCopy) shown on the
  block-finished/recovery-week card
PROVENANCE: SLOT_REASON vocabulary (13 codes, programmeEpoch.js:63-91)
SENIOR_RULES: rule (9)'s executionJudgeable gate (C18 job 5): "poor gym
  performance + poor adherence must NOT immediately mean replace
  exercises" — a plateau on an unrun block never fires REPLACE
EXCLUSIONS: Free tier — programmeReview is Pro-only
  (blockAdvisor.js:791 `if (isPro)`)
NOTES: rules 1-8 (SAFETY_FIT + explicit user intent) fire in ANY block,
  including the first — never gated on epoch age. Only rule 10 waits for
  EPOCH_REVIEW_BLOCKS.
```

```
RULE_ID: T-PROGRAMME-05
DOMAIN: programme
AUTHORITY: src/lib/programmeEpoch.js:382 programmeVerdict
PRODUCTION_CALLER: blockReview.js:112 proposeNextBlock -> blockAdvisor.js
  buildProgrammeReview -> PlansScreen.js
INPUTS: epochBlocks, slotVerdicts[] (from T-PROGRAMME-04), daysChanged,
  equipmentChanged, sessionLengthChanged, goalChanged
OUTPUT: verdict in {CONTINUE_STRUCTURE, REFINE_PROGRAMME,
  REBUILD_PROGRAMME}
THRESHOLDS: REBUILD_MIN_CHANGED_SLOTS = 3 (absolute floor — fewer than 3
  changed slots can NEVER be called a rebuild, however high the % churn);
  REBUILD_CHURN_RATIO = 0.4 (40% of slots changed, checked ONLY once the
  3-slot floor is met)
PRECEDENCE: (1) ANY material structural change (daysChanged OR
  equipmentChanged OR sessionLengthChanged OR goalChanged) -> REBUILD
  regardless of slot count — "a rebuild however few exercises move,
  because it changes what the programme IS"; (2) else changed.length===0
  -> CONTINUE_STRUCTURE; (3) else changed.length>=3 AND churn>0.4 ->
  REBUILD; (4) else REFINE_PROGRAMME
PERSISTENCE: display-only (programmeReview.verdict); not written back to
  the plan until the user acts
USER_VISIBLE: verdictCopy() — "Worth rebuilding" / "N changes
  recommended" / "Your structure stays"
PROVENANCE: reasons[] = deduped SLOT_REASON codes for REFINE/REBUILD, or
  ['days_changed'|'equipment_changed'|'session_length_changed'|
  'goal_changed'] for a structural rebuild
SENIOR_RULES: none — this is itself the top-level programme decision
EXCLUSIONS: Pro only (same gate as T-PROGRAMME-04)
NOTES: SUSPECTED-DEFECT-CANDIDATE (documented as a FIXED historical bug,
  not a live one): the code comment at programmeEpoch.js:416-432 states
  the OLD behaviour (churn ratio alone, reusing
  EPOCH_CONTINUITY_SIMILARITY=0.6) let a 2-of-4-slot (50%) change on a
  small programme read as REBUILD, contradicting the founder's explicit
  "do not call something REBUILD_PROGRAMME if only one/two slots changed"
  rule. The fix (REBUILD_MIN_CHANGED_SLOTS floor) is IN the current code
  and is what T-PROGRAMME-05 documents above; flagging only so a scenario
  writer tests a 2-of-4-slot case and confirms it now returns REFINE, not
  REBUILD.
```

```
RULE_ID: T-PROGRAMME-06
DOMAIN: programme
AUTHORITY: src/lib/programmeEpoch.js:226 countEpochBlocks, :211
  isSameEpochStructure, :183 structureSimilarity, :202
  EPOCH_CONTINUITY_SIMILARITY, :137 EPOCH_REVIEW_BLOCKS
PRODUCTION_CALLER: blockReview.js:88 proposeNextBlock -> blockAdvisor.js
  buildProgrammeReview (signatureHistory built at blockAdvisor.js:589-619
  from getAllMesocycles + blockCompletionState)
INPUTS: currentSignature (structureSignature of the live plan), history[]
  ({completed, signature}) built newest-first from real mesocycle rows,
  filtered through blockCompletionState (T-PROGRAMME-03) so only
  COMPLETED blocks count
OUTPUT: epochBlocks (integer count of consecutive same-structure completed
  blocks), reviewDue boolean
THRESHOLDS: EPOCH_REVIEW_BLOCKS = 3 (structural review eligible at 3+
  consecutive same-structure completed blocks); EPOCH_CONTINUITY_SIMILARITY
  = 0.6 (Jaccard similarity of exercise sets; below this OR a different
  splitType/dayCount ends the epoch)
PRECEDENCE: counting stops (breaks) at the first non-completed block or
  the first structurally-different block, walking newest-to-oldest
PERSISTENCE: computed fresh each read from mesocycles.blockLedger's stored
  programmeSignature (new ledgers) or reconstructed from archived
  programmes (legacy fallback, blockAdvisor.js:601-618)
USER_VISIBLE: recoveryHeadsUp() line ("You have now built enough history
  on this programme for Volyume to review the exercise structure as
  well.")
PROVENANCE: n/a
SENIOR_RULES: an ABANDONED historical block (walked away from) never
  counts toward the epoch — "an abandoned block is not evidence"
EXCLUSIONS: Pro only
NOTES: EPOCH_CONTINUITY_SIMILARITY (0.6) is explicitly documented as NOT
  the same constant as REBUILD_CHURN_RATIO (0.4) even though both are
  "how much changed" thresholds — the code comment at
  programmeEpoch.js:361-365 flags this as a historical near-miss (the old
  code accidentally reused one constant for both questions) that is now
  fixed with two separate named constants. Confirmed current code has two
  distinct constants.
```

```
RULE_ID: T-PROGRAMME-07
DOMAIN: programme
AUTHORITY: src/lib/blockAdvisor.js:254 buildNextBlockRecommendation, :380
  applyAdjustEvidence
PRODUCTION_CALLER: blockAdvisor.js:663 getBlockAdvice -> PlansScreen.js
INPUTS: recentCheckins (14-day-window filtered, C6 RA6-11/D97-25),
  signals[] (from detectSignals, T-PROGRAMME-08), phase
  ('recovery'|'finished'), isPro, nextBlockPreview (buildAdjustPreview
  output, applied via applyAdjustEvidence)
OUTPUT: {recommendation: 'repeat'|'adjust'|'consider_rebuild'|null,
  coached, headline, body, secondaryLabel}
THRESHOLDS: avgReadiness computed only over check-ins inside the 14-day
  detraining window (fallback 70 = conservative default -> repeat branch
  when no data); highSignals.length===0 && avgReadiness>=60 -> repeat;
  highSignals.length<=1 || avgReadiness>=50 -> adjust; else
  consider_rebuild
PRECEDENCE: applyAdjustEvidence (C8) re-decides Repeat vs Adjust from the
  ACTUAL ledger-derived seed preview after the base recommendation is
  computed — NEVER overrides consider_rebuild ("persistent fatigue keeps
  its own advice"); Free is never touched (recommendation stays null)
PERSISTENCE: display-only recommendation; the user's actual choice (Repeat
  vs Adjust button) is what writes the next block
USER_VISIBLE: headline/body copy on the block-finished/recovery card;
  NEXT_BLOCK_OPTION_LABELS (both options ALWAYS rendered per FQ-2/D96 —
  "never hides, gates or forces" either option)
PROVENANCE: n/a (own recommendation vocabulary)
SENIOR_RULES: FQ-2 (D96): Free tier gets recommendation:null, coached:false
  always — "FREE DOES NOT HAVE COACHING"; buildNextBlockOptions always
  renders BOTH options regardless of recommendation, gated only by
  requiresPro/locked flags, never removed
EXCLUSIONS: Free — no adaptive coaching computed at all for this branch
NOTES: this is the FQ-2/D96 surface: Repeat and Adjust are both always
  legitimate choices; the engine may only recommend, never gate.
```

```
RULE_ID: T-PROGRAMME-08
DOMAIN: programme
AUTHORITY: src/lib/blockAdvisor.js:104 detectSignals, :49 checkinReadiness
PRODUCTION_CALLER: blockAdvisor.js:663 getBlockAdvice -> PlansScreen.js
INPUTS: recentCheckins[8] (getRecentCheckins), each row's energyScore/
  sorenessScore/sleepHours
OUTPUT: signals[] {type, severity: 'info'|'medium'|'high', label, data}
THRESHOLDS: energy<=1 -> high; energy<=2 -> medium. soreness>=4 AND
  prevSoreness>=4 (two consecutive) -> high; soreness>=4 alone -> medium.
  sleep<5.5h -> high; sleep<6.5h -> medium. readiness z-score vs 8-week
  personal baseline (weeks 2-8): z<=-1.5 -> high, z<=-1.0 -> medium
  (needs baseline.length>=2). recentPoorCount (last 2 checkins with
  readiness<45) >=2 -> sustained_fatigue (high).
  checkinReadiness formula: energy_term = ((energyScore-1)/4)*100 weight
  0.4, soreness_term = (1-(sorenessScore-1)/4)*100 weight 0.4, sleep_term
  = clamp((sleepHours-4)/5,0,1)*100 weight 0.2; sleepHours null ->
  energy*0.5+soreness*0.5 (no sleep term); a row answering NONE of
  energy/soreness/sleep scores null (not 50) — FB-36/D96 fix.
PRECEDENCE: n/a (flat signal list; consumed by T-PROGRAMME-07 and
  T-PROGRAMME-10's deload trigger)
PERSISTENCE: none (computed live each read)
USER_VISIBLE: signal chips/labels on the recovery card
PROVENANCE: n/a
SENIOR_RULES: signals are only computed when isPro && latestIsCurrent
  (latest check-in inside 14-day window) — "Free has no coaching" tier
  gate (C6 closeout P-8)
EXCLUSIONS: Free tier gets signals: []
NOTES: n/a
```

```
RULE_ID: T-PROGRAMME-09
DOMAIN: programme
AUTHORITY: src/lib/programmePosition.js:97 resolveProgrammePosition,
  src/lib/blockProgression.js (resolveWeekSessions,
  weekProgressionResolved)
PRODUCTION_CALLER: HomeScreen.js, database.js (imports resolveNextSession/
  resolveProgrammePosition — grep confirms both files import
  programmePosition), recoveryState.resolveRecoveryState consumes its
  recoveryPhaseAllowed output
INPUTS: active mesocycle row, plan routines, mesocycle weeks, completed
  workouts (getBlockTrainingData), explicit session resolutions
  (getLiveSessionResolutions), calendar week (getCurrentMesocycleWeek)
OUTPUT: {activeWeekIndex, activeWeekId, sessions[], nextSession,
  weekResolved, execution summary, preRecoveryOutstanding,
  recoveryPhaseAllowed, recoveryState, source, legacyBlock,
  candidateFloorWeek}
THRESHOLDS: candidateFloor for a legacy block (no progressionAnchorWeek)
  = max(week index of any week with a logged workout, 1) — never
  resurrects ambiguity below that floor. Candidates window =
  [floor, calendarWeekIndex] and strictly before recoveryWeek.
PRECEDENCE: "VOLYUME TRAINING IS SESSION-SEQUENCED, NOT
  CALENDAR-SEQUENCED" — the first candidate accumulation week with an
  unresolved session becomes activeWeekIndex, OVERRIDING the calendar
  week; only once every reached week is progression-resolved does
  activeWeekIndex fall back to the calendar position (capped at
  recoveryWeek)
PERSISTENCE: read-only resolver; no write. Drives recoveryState which
  ultimately clamps mesocycle_weeks.is_deload-derived narrative
USER_VISIBLE: nextSession surfaced on Home/Plans/Train ("the single
  answer... so they cannot disagree about what is next")
PROVENANCE: diagnostics[] {kind:'session_conflict', ...} for any
  ENDED_EARLY-with-later-completion conflict (rule 6 of
  RESOLUTION_PRECEDENCE, T-SESSION-01)
SENIOR_RULES: preRecoveryOutstanding gates recoveryState away from
  PLANNED_BLOCK_RECOVERY even if the calendar has reached the recovery
  week ("Position beats calendar" — the founder-reported failure this
  closed: the app tried to enter recovery with the final hard session
  unfinished)
EXCLUSIONS: returns null (no live position question) for no active
  block, an unreadable block, or a read failure — callers keep prior
  state rather than guessing
NOTES: this replaces the old broken `programmes.next_workout_index`
  single-integer pointer (documented defect in blockProgression.js
  header, now fixed).
```

```
RULE_ID: T-PROGRAMME-10
DOMAIN: programme
AUTHORITY: src/lib/blockAdvisor.js:826-872 getBlockAdvice early-deload /
  heads-up branches
PRODUCTION_CALLER: blockAdvisor.js:663 getBlockAdvice -> PlansScreen.js
INPUTS: signals[] (T-PROGRAMME-08), userProfile.age, blockStatus,
  checkins.length
OUTPUT: action in {early_deload, heads_up, continue}
THRESHOLDS: deloadHighThreshold = isMasters(age>=40) ? 1 : 2 high signals;
  headsUpMediumThreshold = isMasters ? 1 : 2 medium signals.
  hasEnoughHistory gate = checkins.length>=2 AND blockStatus.currentWeek
  >=2 (required before EITHER branch can fire — "A user one week into
  their first block... shouldn't be told to drop their sets in half").
  early_deload fires when hasEnoughHistory && (highSignals.length >=
  deloadHighThreshold OR hasSustainedFatigue). heads_up fires when
  hasEnoughHistory && (highSignals.length>=1 || mediumSignals.length >=
  headsUpMediumThreshold).
PRECEDENCE: early_deload outranks heads_up (checked first); both require
  hasEnoughHistory; below either threshold -> 'continue' (all clear)
PERSISTENCE: none (live-computed card)
USER_VISIBLE: "Your body is asking for a lighter week" (early_deload
  headline + buildEarlyDeloadBody prose); "Keep an eye on recovery"
  (heads_up)
PROVENANCE: n/a
SENIOR_RULES: none above this in blockAdvisor; this is itself an advisory
  surface (does not mutate the plan — "All decisions are proposed to the
  user, never auto-executed", header law)
EXCLUSIONS: none by tier (signals themselves are already tier-gated
  upstream at T-PROGRAMME-08)
NOTES: masters (age>=40) threshold halving is research-cited (Sullivan &
  Baker; Rippetoe; Hayes et al. 2023) in the code comment.
```

```
RULE_ID: T-PROGRAMME-11
DOMAIN: programme
AUTHORITY: src/lib/interBlock.js:67 BLOCK_CLASS, :162 classifyMuscleBlock,
  :450 buildBlockLedger (constants: PERF_UP_PCT=1.5, PERF_DOWN_PCT=-1.5,
  SORENESS_HIGH=4, JOINT_HIGH=3, READINESS_SLOPE_POOR=-0.3,
  SLEEP_FLAG_WEEKS=2, RECOVERY_EXCESSIVE_WEIGHT=2, ADHERENCE_FLOOR=0.6,
  MIN_EXPOSURES=4, MIN_RECOVERY_POINTS=4, CONFIDENCE_FLOOR=0.6,
  STALE_EVIDENCE_WEEKS=4)
PRODUCTION_CALLER: blockLedgerRunner.js:213 computeAndStoreBlockLedger,
  invoked from database.js:4343 activatePlanWithBlock ->
  buildLearnedSeedRangesForActivation, and PlansScreen.js /
  BlockReflectionScreen.js (grep-confirmed importers of
  buildSeedRangesForNextBlock / buildLearnedSeedRangesForActivation)
INPUTS: per-muscle e1RM slope %, recovery aggregates (sorenessLateAvg,
  jointDiscomfortAvg from blockLedgerGather), readiness slope,
  sleepFlaggedWeeks, deloadFlagFired/deloadFlagMidBlock, adherence,
  exposure count
OUTPUT: BLOCK_CLASS per muscle in {RESPONSIVE, OVERREACHED, STALE,
  STRAINED, INSUFFICIENT_DATA}; feeds next-block seeded weekly volume
  ranges
THRESHOLDS: perfUp = slope>=1.5%; perfDown = slope<=-1.5%; recoveryPoor =
  recoveryCostWeight >= RECOVERY_EXCESSIVE_WEIGHT(2), where cost weight
  sums +1 for sorenessLateAvg>=4, +1 for jointDiscomfortAvg>=3, +1 for
  sleepFlaggedWeeks>=2, +1 (not +2, RA6-2 fix) for a block-level deload
  flag alone; INSUFFICIENT_DATA when dataPoints<MIN_RECOVERY_POINTS(4) OR
  exposures<MIN_EXPOSURES(4) OR adherence<ADHERENCE_FLOOR(0.6) OR
  weeksSinceBlockEnd>=STALE_EVIDENCE_WEEKS(4) (suppressed/stale); 10-day
  vs 7-day proposedRecoveryDays: 10 when anyStrained && persistent>=2,
  else 7
PRECEDENCE: STALE evidence (age >= 4 weeks) suppresses a fresh
  classification even if the raw numbers would otherwise classify;
  RECOVERY_EXCESSIVE_WEIGHT single-flag correction (RA6-2, Campaign 10I):
  the advisor's early-deload flag alone can NO LONGER make recoveryPoor
  true for every muscle — it must be corroborated by at least one other
  signal
PERSISTENCE: block ledger JSON stored on the mesocycle row
  (mesocycles.blockLedger), read back by proposeNextBlock's epoch history
  (T-PROGRAMME-06) and by buildSeedRangesForNextBlock for the next block's
  starting per-muscle volume
USER_VISIBLE: informs the "Continue with adjustments" next-block set
  targets shown on PlansScreen/BlockReflectionScreen
PROVENANCE: n/a (own BLOCK_CLASS vocabulary)
SENIOR_RULES: manual landmark edits (isManualEdit, effectiveLandmarks.js)
  win the seeding fallback chain over any ledger-derived value
  (T-VOLUME-08)
EXCLUSIONS: n/a
NOTES: LEDGER_ALGORITHM_VERSION=2 but LEDGER_VERSION (schema) stays 1 —
  an algorithm-version bump never forces a stored historical ledger to
  recompute ("that would rewrite a historical decision the user already
  acted on").
```

---

## DOMAIN: volume

```
RULE_ID: T-VOLUME-01
DOMAIN: volume
AUTHORITY: src/lib/algorithms.js:25 VOLUME_LANDMARKS, :277 getVolumeStatus
PRODUCTION_CALLER: WorkoutSummaryScreen.js, AnalyticsScreen.js,
  VolumeHeatmapScreen.js (via effectiveLandmarks.js), database.js
INPUTS: workingSets count for a muscle, landmarks {mev, mav, mrv}
  (research defaults or effectiveLandmarks precedence, T-VOLUME-08)
OUTPUT: status in {below, minimum, optimal, near_mrv, over_mrv, unknown}
THRESHOLDS: workingSets<=0 or non-finite -> below; <mev -> below; <=mev+2
  -> minimum; <=mav -> optimal; <=mrv -> near_mrv; else over_mrv. Per-
  muscle mev/mav/mrv table hardcoded (e.g. chest mev6/mav14/mrv22, back
  mev10/mav16/mrv25, quads mev8/mav14/mrv20 — full table at lines 25-59)
PRECEDENCE: zero-work short-circuit fires even for a muscle with mev=0
  (front_delts) so the heatmap never shows "optimal" before any set is
  logged
PERSISTENCE: display-only; landmarks themselves may be persisted via
  manual edits (AsyncStorage) or adaptive history
USER_VISIBLE: volume heatmap colour/label
PROVENANCE: n/a
SENIOR_RULES: none
EXCLUSIONS: none
NOTES: "population starting points, not precise prescriptions" per the
  file's own header comment.
```

```
RULE_ID: T-VOLUME-02
DOMAIN: volume
AUTHORITY: src/lib/algorithms.js:484 shouldDeload
PRODUCTION_CALLER: HomeScreen.js:1143, CoachReviewScreen.js:418,
  hooks/useProgressData.js:350 (three independent production callers)
INPUTS: last4WeeksData[] {avgReps, weeksSinceLastDeload,
  avgJointDiscomfort, hasOverMRV, avgSoreness}
OUTPUT: {deload: boolean, reasons[]}
THRESHOLDS: weighted score, deload triggers at score>=50 of 100.
  Performance (50 pts): recentReps < earlierReps-2 (recent = last week,
  earlier = first of the 4). Wellness (30 pts, split): avgJointDiscomfort
  >=1.5 AND weeksSinceLastDeload>=3 -> +18; overMRVWeeks>=2 -> +12.
  Soreness (20 pts, down-weighted per Coleman 2024): highSorenessWeeks
  (avgSoreness>=2.5) >=3 AND weeksSinceLastDeload>=4 -> +20. Requires
  last4WeeksData.length>=2 to run at all.
PRECEDENCE: additive score across 4 independent signal groups; no single
  signal alone reaches 50 except performance drop (50 pts exactly)
PERSISTENCE: display-only signal, feeds the deload-suggested banner
USER_VISIBLE: deload suggestion + reasons list
PROVENANCE: n/a
SENIOR_RULES: none within this function; the weekly-coach matrix
  (T-WEEKLY-03) is a SEPARATE deload signal computed from check-in data,
  not this one — this reads raw session/joint/soreness buckets, not the
  weekly check-in
EXCLUSIONS: none
NOTES: input scale is deliberately the 1-3 per-session slider scale, NOT
  the 1-5 weekly check-in scale — the file comment explicitly warns
  against "normalising these away".
```

```
RULE_ID: T-VOLUME-03
DOMAIN: volume
AUTHORITY: src/lib/algorithms.js:545 computeAdaptiveDecision, :658
  runAdaptiveEngine
PRODUCTION_CALLER: WorkoutSummaryScreen.js:575 runAdaptiveEngine(...)
INPUTS: per-muscle {soreness 1-4, performance 1-4, pump 1-4, joint 0-3}
OUTPUT: {decision: rotate_exercise|hold|deload_trigger|drop_set|add_set,
  delta: -1|0|+1|+2, reasonCode, reasonText}; runAdaptiveEngine wraps this
  per muscle and clamps nextWeekSets to [mev, mrv]
THRESHOLDS: joint>=3 -> rotate_exercise (overrides everything, checked
  twice in source at lines 551 and 569 — same effect). soreness==null ||
  performance==null -> hold (insufficient_feedback) — "a missing REQUIRED
  signal holds" (Campaign 1 P0-7 D7 fix; the OLD default silently allowed
  add_set on absent data). performance===4 && soreness>=3 ->
  deload_trigger. soreness===4 -> drop_set (-1). joint>=2 -> hold
  (joint_moderate). soreness<=2 && performance<=2: pump===1 -> add_set +2
  (under_stimulus); pump===4 && soreness===2 -> hold (optimal_response);
  else add_set +1. performance>=3 && soreness<=3 -> hold
  (performance_struggle). Default -> hold.
PRECEDENCE: joint pain (>=3) is the absolute override, checked before the
  missing-signal guard even fires functionally (both checks present);
  missing-signal hold is next; then systemic deload; then per-branch
  reads in the order listed above
PERSISTENCE: adaptation_events / nextWeekSets feed the following week's
  session sets via getAdaptiveLandmarkHistory
USER_VISIBLE: WorkoutSummaryScreen post-session adjustment message
PROVENANCE: reasonCode vocabulary (joint_high, insufficient_feedback,
  systemic_mrv_breach, residual_soreness, joint_moderate, under_stimulus,
  optimal_response, good_recovery_good_performance, performance_struggle,
  hold_default)
SENIOR_RULES: none above this within the function; nextWeekSets is
  clamped to [mev, mrv] in runAdaptiveEngine unconditionally
EXCLUSIONS: none
NOTES: this is a DIFFERENT matrix from T-WEEKLY-03's autoregulationMatrix
  — this is the per-session RP-style matrix (WorkoutSummaryScreen, weekly
  cadence), the other is the weekly-coach recovery x performance matrix
  (CoachOutputScreen, also weekly cadence but different scoring). The two
  can disagree about the same week's data because they read different
  input scales and different evidence.
```

```
RULE_ID: T-VOLUME-04
DOMAIN: volume
AUTHORITY: src/lib/algorithms.js:693 computeAdaptiveLandmarks
PRODUCTION_CALLER: sessionAdjustments.js:131 (computeAndLogSessionAdjustments)
  -> HomeScreen.js session-start flow; effectiveLandmarks.js:160
  getAdaptedLandmarks -> AnalyticsScreen.js / VolumeHeatmapScreen.js /
  WorkoutSummaryScreen.js / blockLedgerRunner.js / blockSeed.js /
  CoachReviewScreen.js (via getEffectiveLandmarks)
INPUTS: history[] {muscle, pumpScore, sorenessScore, jointDiscomfort,
  performanceTrend, prFrequency, missedReps, weeklyVolume} per muscle,
  base defaults (VOLUME_LANDMARKS)
OUTPUT: per-muscle {mev, mav, mrv, isAdapted, dataPoints, netScore,
  bestVolume, note}
THRESHOLDS: requires entries.length>=3 to adapt (else isAdapted:false,
  raw defaults returned). Uses last 8 data points. netScore =
  (avgPump-3)*0.3 + -(avgSoreness-2)*0.4 + -(avgJoint)*0.8 +
  avgPerf*0.8 + min(avgPRFreq*0.3, 0.6) + -(avgMissed*0.6). adjustment =
  round(clamp(netScore*2, -4, 4)) sets. mev = max(0, base.mev+adjustment);
  mav = clamp(round(bestVolume), base.mev+1, base.mrv-1); mrv =
  max(base.mav+1, base.mrv + floor(adjustment/2))
PRECEDENCE: weighting order stated in comment: performance trend > missed
  reps > joint > soreness > pump ("pump is exercise-selection-dependent
  and over-weighted in naive models")
PERSISTENCE: not written directly — recomputed from getAdaptiveLandmarkHistory
  each read; the effectiveLandmarks precedence layer (T-VOLUME-08) is what
  actually reaches the display/session-adjustment surfaces
USER_VISIBLE: "You recover well here. Target raised by N sets." /
  "Recovery cost is high. Target lowered by N sets." note text
PROVENANCE: n/a
SENIOR_RULES: gated to Pro tier at the effectiveLandmarks precedence layer
  (getAdaptedLandmarks: `tier !== 'pro' -> null`)
EXCLUSIONS: Free tier never reaches the adapted layer (research + manual
  edits only)
NOTES: ±4 sets is the hard adjustment ceiling per muscle per adaptation
  cycle.
```

```
RULE_ID: T-VOLUME-05
DOMAIN: volume
AUTHORITY: src/lib/algorithms.js:810 computeSessionAdjustments, :1012
  buildSessionAdjustmentInput
PRODUCTION_CALLER: sessionAdjustments.js:166
  computeAndLogSessionAdjustments -> HomeScreen.js (session-start flow,
  Pro-gated by the caller per file header)
INPUTS: todaysExercises[], muscleSignals (lastTrainedAt, lastFeedback:
  {pump,joint,performance}, checkinSore, checkinAt, presessionSoreness),
  weeklyContext (doneThisWeekByMuscle, landmarks, weeklySignal, safetyHold,
  isDeload, weekStartMs), recentSessionEvents[], now, presessionIntent
OUTPUT: per-muscle-exercise decisions [{exerciseId, muscle, setDelta,
  reasonCode, show, signals}], capped at 2 nonzero-delta exercises per
  session
THRESHOLDS: R0: isDeload -> [] (engine fully silent). Revert memory:
  revertCounts[muscle]>=2 -> hold (user "won the argument" twice this
  meso). R1 joint: lastJoint>=2 -> hold, suppress any add. R2 residual
  soreness (soreForM && trainedWithin72h(<=HOURS_72=259200000ms)) -> -1
  set IF projectedPlanned-1>=mev AND plannedSets-1>=1. R3 stale soreness
  (soreForM but >72h since trained) -> hold, "weekly's territory". R4/R5
  under-stimulus add: feedbackRecent (<=DAYS_14=1209600000ms),
  lastPerformance<=2, lastPump<=2, projectedPlanned<mav,
  !addedThisWeek.has(muscle) -> candidate +1, blocked by safetyHold (R5
  HOLD_SAFETY) or weeklySignal==='reduce' (R5 HOLD_WEEKLY_PRECEDENCE),
  else +1 IF projectedPlanned+1<=mrv AND projectedPlanned+1<=mav (R4
  ADD_UNDER_STIMULUS). checkinFresh window = DAYS_4 (345600000ms).
  Per-session cap: max 2 nonzero-delta exercises, drops (-1) kept before
  adds (+1) when trimming (recovery has right of way).
PRECEDENCE: revert-memory hold > joint hold > residual-soreness drop >
  stale-soreness hold > under-stimulus add (each muscle only reaches one
  branch, first match wins in source order); safetyHold and
  weeklySignal==='reduce' outrank the add branch specifically
PERSISTENCE: every decision (including silent holds) logged as an
  adaptation_event via createAdaptationEvent (sessionAdjustments.js:173),
  namespaced session_* so weekly deload evaluation ignores them
USER_VISIBLE: only decisions where `show` is true surface in the UI (show
  = SESSION_SHOWN_CODES.has(reasonCode) OR (a precedence-hold AND
  presessionIntent==='sharp') — "R5 honesty holds surface only after a
  Sharp pre-session answer")
PROVENANCE: SESSION_REASON_CODES (HOLD_USER_PREF, HOLD_JOINT,
  DROP_RESIDUAL_SORENESS, HOLD_STALE_SORENESS, ADD_UNDER_STIMULUS,
  HOLD_SAFETY, HOLD_WEEKLY_PRECEDENCE)
SENIOR_RULES: weeklySignal==='reduce' (derived from the weekly coach's
  volumeSignal, gated by FQ-4 appliedGovernsWeek — sessionAdjustments.js:146
  — an UNAPPLIED coach proposal cannot suppress a session +1) and
  coachOutput.safetyHold both outrank the session-level add
EXCLUSIONS: v1 scope requires an active mesocycle week
  (workout.mesocycleWeekId); non-meso/ad-hoc sessions are silently skipped
  entirely (sessionAdjustments.js file header)
NOTES: "The weekly coach remains the sole owner of next-week volume
  direction... the session layer is read-only against the plan and
  reinforces — never races — the weekly coach, because only one of the
  two ever writes" (file header law).
```

```
RULE_ID: T-VOLUME-06
DOMAIN: volume
AUTHORITY: src/lib/coachApply.js:269 computeVolumeApply, :318
  computeWeeklySessionAllocation (FQ-4, D96)
PRODUCTION_CALLER: computeVolumeApply — CoachOutputScreen.js apply flow
  (grep-confirmed importer of coachApply); computeWeeklySessionAllocation —
  sessionAdjustments.js:67 getSessionWeeklyAllocation -> HomeScreen.js
  session-start flow
INPUTS: computeVolumeApply(plannedRows, volumeDelta): planned_muscle_volume
  rows {mev, mrv, mav, planned_sets} + a signed volumeDelta.
  computeWeeklySessionAllocation(exercises, weekPlannedByMuscle,
  baselinePlannedByMuscle): per-exercise recommendedSets + this week's vs
  week-1's planned per-muscle sets
OUTPUT: computeVolumeApply -> [{muscle, plannedSets, mev, mav, mrv}]
  changed rows only; computeWeeklySessionAllocation -> {exerciseId:
  allocatedSets}
THRESHOLDS: computeVolumeApply clamps next = clamp(current+volumeDelta,
  mev, mrv||mav||ABSOLUTE_WEEKLY_SET_CEILING(30)) — the 30-set backstop
  fires only when a row is missing BOTH mrv and mav (degenerate/partial
  sync data), preventing an effective +Infinity ceiling.
  computeWeeklySessionAllocation: factor = week/baseline (both must be
  finite, positive) else factor=1 (identity); allocated =
  max(1, round(recommendedSets*factor))
PRECEDENCE: computeVolumeApply is THE enforcement point translating a
  weekly coach volumeDelta into persisted planned_muscle_volume rows;
  computeWeeklySessionAllocation is THE enforcement point translating
  those persisted rows into actual per-exercise session set counts —
  together they close the "COACH PROPOSAL -> APPLY -> PERSISTED TARGET ->
  VOLUME ALLOCATION -> SET TARGETS -> ACTUAL NEXT SESSION" chain the FQ-4
  ruling required
PERSISTENCE: computeVolumeApply's output is written via
  upsertPlannedMuscleVolume; computeWeeklySessionAllocation's output feeds
  the session's per-exercise plannedSets base (before session-level
  readiness/R4/R2 tweaks apply on top)
USER_VISIBLE: session set counts, weekly volume targets
PROVENANCE: n/a
SENIOR_RULES: computeVolumeApply's [mev,mrv] clamp is the final backstop
  under which EVERY weekly volumeDelta (including the D15 escalation
  step, T-WEEKLY-05) must land
EXCLUSIONS: computeWeeklySessionAllocation returns identity (factor=1)
  for any muscle with no row in either week or a zero/missing baseline —
  "legacy blocks and ad-hoc sessions are byte-identical to pre-wiring
  behaviour"
NOTES: before FQ-4 wired computeWeeklySessionAllocation into
  sessionAdjustments.js, planned_muscle_volume was DISPLAY-ONLY — the
  weekly ramp and confirmed Apply changed a number no session ever read.
  This is documented in-code as a fixed defect, not a live one.
```

```
RULE_ID: T-VOLUME-07
DOMAIN: volume
AUTHORITY: src/lib/algorithms.js:1364 detectLaggingMuscles
PRODUCTION_CALLER: CoachReviewScreen.js:422
INPUTS: weeklyVolumeHistory[] (oldest first), minWeeks (default 3)
OUTPUT: [{muscle, displayName, avgSets, mev, weeksBelow}] sorted by
  weeksBelow desc then deficit desc
THRESHOLDS: requires weeklyVolumeHistory.length>=minWeeks; flags a muscle
  when weeksBelow (weeks with sets<mev) >= minWeeks over the trailing
  minWeeks window; skips muscles with mev<=0 (e.g. front_delts — "no
  effective minimum")
PRECEDENCE: n/a (independent per-muscle check)
PERSISTENCE: display-only
USER_VISIBLE: lagging-muscle callout on CoachReviewScreen
PROVENANCE: n/a
SENIOR_RULES: none
EXCLUSIONS: mev<=0 muscles excluded entirely
NOTES: default minWeeks=3, called with explicit 3 at the production call
  site.
```

```
RULE_ID: T-VOLUME-08
DOMAIN: volume
AUTHORITY: src/lib/effectiveLandmarks.js:41 mergeLandmarkPrecedence, :94
  isManualEdit
PRODUCTION_CALLER: AnalyticsScreen.js, VolumeHeatmapScreen.js,
  WorkoutSummaryScreen.js, blockLedgerRunner.js, blockSeed.js,
  CoachReviewScreen.js (all import from effectiveLandmarks.js)
INPUTS: manual table (AsyncStorage @volyume_landmarks_<userId>), adapted
  table (computeAdaptiveLandmarks output, Pro only), research
  (VOLUME_LANDMARKS)
OUTPUT: per-muscle {mev, mav, mrv} + source tag 'manual'|'adapted'|
  'research'
THRESHOLDS: manual wins only if isManualEdit(entry, research) is true —
  either entry.explicit===true (editor stamped it) or at least one of
  mev/mav/mrv differs numerically from the research default; adapted wins
  only if a.isAdapted && all three values finite; else research
PRECEDENCE: manual > adapted (Pro only) > research, strictly in that order
  per muscle (not per user — mixed sources across muscles are legitimate)
PERSISTENCE: manual table itself is the persisted artifact
  (AsyncStorage); this function does not write, only resolves precedence
  at read time
USER_VISIBLE: every volume-status/heatmap/session-set-count surface that
  claims to show "your" targets
PROVENANCE: source map (manual/adapted/research) available to callers for
  labelling
SENIOR_RULES: none
EXCLUSIONS: adapted layer is skipped entirely for tier!=='pro'
NOTES: isManualEdit's value-comparison fallback exists specifically
  because the volume-targets editor historically saved the WHOLE table
  (including untouched defaults) on any save, which used to silently
  disable the adaptive layer for every muscle — documented as a fixed
  defect (Stage 6 review blocker #1), not a live one.
```

---

## DOMAIN: recovery (readiness, re-entry, deload machinery)

```
RULE_ID: T-RECOVERY-01
DOMAIN: recovery
AUTHORITY: src/lib/sessionAdjustments.js:211 READINESS_RULES, :241
  getReadinessTweak, :269 applyReadinessToSets, :280 applyReadinessToLoad
PRODUCTION_CALLER: ActiveWorkoutScreen.js (grep-confirmed import of
  getReadinessTweak/applyReadinessToSets/applyReadinessToLoad)
INPUTS: intent ('sharp'|'average'|'below_par', from the pre-session intent
  sheet), sleepQuality/energyScore chips
OUTPUT: {setDelta, loadFactor, whySets, whyLoad, acknowledgement}
THRESHOLDS: below_par -> setDelta=-1 (one set fewer, floored at 1 working
  set), loadFactor=0.95 (trimmed 5%, rounded DOWN to the 0.25 grid);
  average -> {0, 1} (no change); sharp -> {0, 1} + acknowledgement only
  ("good readiness NEVER pushes beyond the plan")
PRECEDENCE: HARD INVARIANT, fuzz-enforced: adjusted sets <= planned sets
  and adjusted load <= planned load for EVERY input (strictly
  downward-only)
PERSISTENCE: display-only per-session targets; stored plan/routines/
  logged sets never touched
USER_VISIBLE: "Rough night: one set fewer on each lift today keeps
  quality up." etc; dismissible via "Use planned targets instead"
PROVENANCE: n/a (own intent vocabulary)
SENIOR_RULES: this is itself downstream of livePrescription's senior trim
  (T-LIVESET rules) which applies the SAME 0.95 factor at the load-
  resolution layer
EXCLUSIONS: none — available at every tier (not Pro-gated in this file;
  caller HomeScreen decides Pro-gating for the intent-sheet surface itself
  per the file's own comment)
NOTES: poor sleep outranks low energy for WHY-text tie-break
  (sleepQuality===2 checked before energyScore===2).
```

```
RULE_ID: T-RECOVERY-02
DOMAIN: recovery
AUTHORITY: src/lib/sessionAdjustments.js:317 getReEntryEaseTweak, :351
  resolveSessionEasingTweak; src/lib/reEntryEaseState.js (pending-state
  read/write/match/clear)
PRODUCTION_CALLER: ActiveWorkoutScreen.js (grep-confirmed import of
  getReEntryEaseTweak family)
INPUTS: reEntryEaseActive boolean (from reEntryEaseState.getPendingReEntryEase
  matched against the current session via reEntryEaseMatches), intent,
  chips
OUTPUT: same shape/magnitude as T-RECOVERY-01's below_par tweak, but
  because: 'athlete_reentry_choice' (never 'below_par')
THRESHOLDS: identical magnitude to below_par (setDelta=-1, loadFactor=
  0.95) — deliberately reuses the constant rather than a second number, so
  the two mechanisms can never silently diverge
PRECEDENCE: resolveSessionEasingTweak composes by CHOOSING ONE tweak
  object, never summing: if the intent-sheet answer already reduces for a
  same-day reason (poor sleep/low energy), THAT reason leads; re-entry
  easing only fills in when the intent sheet itself did not call for a
  reduction — "stacking two downward steps... is forbidden by the
  re-entry amendment"
PERSISTENCE: pending re-entry state keyed by (mesocycleWeekId, routineId)
  in reEntryEaseState, cleared on match (clearPendingReEntryEaseIfMatches)
USER_VISIBLE: "Welcome back: one set fewer on each lift today keeps
  quality up."
PROVENANCE: because:'athlete_reentry_choice' — explicitly distinct
  provenance from below_par "so nothing downstream... can read this as
  fabricated readiness evidence"
SENIOR_RULES: NOT tier-gated — "re-entry easing is the athlete's own
  explicit answer to a question every tier is asked, and must not become
  Pro-only merely because it happens to reuse this machinery"
EXCLUSIONS: none by tier
NOTES: n/a
```

```
RULE_ID: T-RECOVERY-03
DOMAIN: recovery
AUTHORITY: src/lib/recoveryState.js:90 resolveRecoveryState, :47
  RECOVERY_STATE
PRODUCTION_CALLER: programmePosition.js:204 (resolveProgrammePosition ->
  HomeScreen.js/database.js consumers); consumed for
  recoveryStateCard/nextWorkoutRecoveryLabel/trainRecoveryDetail
INPUTS: weekIndex (calendar week), plannedWeeks, deloadWeek, isDeload
  (mesocycle_weeks row flag), awaitingDecision, recoveryPhaseAllowed
  (from programmePosition's preRecoveryOutstanding)
OUTPUT: state in {NORMAL_ACCUMULATION, PLANNED_BLOCK_RECOVERY,
  ADAPTIVE_RECOVERY_ADJUSTMENT}, or null
THRESHOLDS: recoveryWeek = plannedRecoveryWeek(deloadWeek ||
  plannedWeeks); week>=recoveryWeek AND recoveryPhaseAllowed ->
  PLANNED_BLOCK_RECOVERY; week>=recoveryWeek AND
  !recoveryPhaseAllowed -> NORMAL_ACCUMULATION (because:
  'accumulation_work_outstanding' — position beats calendar); week<
  recoveryWeek AND isDeload===true -> ADAPTIVE_RECOVERY_ADJUSTMENT; else
  NORMAL_ACCUMULATION
PRECEDENCE: recoveryPhaseAllowed (a PROGRAMME fact) outranks the calendar
  reaching the recovery week; awaitingDecision returns null outright (a
  finished block has no live recovery-week question)
PERSISTENCE: display-only resolver, no write
USER_VISIBLE: "Recovery week" card (PLANNED) vs "Training is lighter for
  now" card (ADAPTIVE) — DIFFERENT copy for the two causes, never
  conflated ("NO FALSE CAUSE" — the planned week is never explained by
  recovery evidence and vice versa)
PROVENANCE: because in {'block_recovery_week',
  'accumulation_work_outstanding', 'recovery_evidence',
  'accumulation_week'}
SENIOR_RULES: awaitingDecision short-circuits to null (no lighter-training
  claim on a finished, undecided block)
EXCLUSIONS: n/a
NOTES: this replaces a SINGLE boolean (mesocycle_weeks.is_deload) that
  conflated two causes; documented in the file header as a fixed defect
  ("a perfectly-recovering athlete in their normal recovery week risked
  being told their recovery had been poor").
```

```
RULE_ID: T-RECOVERY-04
DOMAIN: recovery
AUTHORITY: src/lib/algorithms.js:1334 generateDeloadPrescription
PRODUCTION_CALLER: ActiveWorkoutScreen.js:1595
INPUTS: prevSets (last session's working sets), isFirstHalf boolean
OUTPUT: array of {weight, reps, setType:'straight', rir:4, isDeload:true}
THRESHOLDS: isFirstHalf -> same weight as prevSets, 50% of reps
  (round(baseReps*0.5), floor 1); !isFirstHalf -> 50% of weight (rounded
  to 0.25 grid) AND 50% of reps; RIR fixed at 4 for both halves
PRECEDENCE: this is THE senior prescription for a recovery-week session —
  livePrescription's resolveSetPrescription defers entirely to
  senior.deloadTargets when senior.isDeload is set (T-LIVESET-01)
PERSISTENCE: display-only per-session prescription, not persisted beyond
  the session's own logged sets
USER_VISIBLE: the recovery-week set prescription shown in
  ActiveWorkoutScreen
PROVENANCE: n/a
SENIOR_RULES: none above it — this generates the values SENIOR_RECOVERY_HOLD
  in livePrescription.js reads verbatim
EXCLUSIONS: n/a
NOTES: recoveryState.describePrescriptionDifferences (T-RECOVERY-03's
  sibling) explicitly notes this prescription keeps the LOAD and halves
  reps in the first half — "so 'reduced loading' would be false on it,
  and saying so would be the kind of plausible-sounding copy nobody
  checked" — a documented anti-pattern the copy layer guards against.
```

```
RULE_ID: T-RECOVERY-05
DOMAIN: recovery
AUTHORITY: src/lib/mesocycle.js:212 evaluateAutoReg, :315
  predictDeloadWeek
PRODUCTION_CALLER: DEAD/TEST-ONLY IN THE NARROW SENSE — no screen imports
  evaluateAutoReg or predictDeloadWeek directly (grep of src/screens
  returns nothing); blockAdvisor.js does NOT import mesocycle's
  evaluateAutoReg either (it has its own detectSignals/
  buildNextBlockRecommendation, T-PROGRAMME-08/07). Only test files import
  these two functions.
INPUTS: feedbackWindow[] {sessionDifficulty 1-5, overallPump 1-3,
  soreness24hBefore 1-3, fatigueLevel 1-5, jointDiscomfort 0-3}
OUTPUT: {action, setsAdjust, message}
THRESHOLDS: jointDiscomfort>=3 (latest) -> deload_now (-50%); jointAlerts
  (>=2 in window with jointDiscomfort>=2) -> reduce_volume (-20%);
  avgFatigue>=4.5 && avgDifficulty>=4.5 -> deload_now (-50%);
  avgFatigue>=4 && avgSoreness>=2.5 -> reduce_volume (-15%);
  avgDifficulty>=4.2 && avgPump<=1.3 -> hold_volume; avgDifficulty<=2.5 &&
  avgPump>=2.5 && avgSoreness<=1.5 && avgFatigue<=2.5 -> continue;
  avgDifficulty>=3.8 && avgFatigue>=3.5 -> hold_volume; else continue
PRECEDENCE: joint discomfort (session-level, latest only) is checked
  first as an "emergency brake"; multi-session joint alert second; then
  the weighted-average branches in source order
PERSISTENCE: none (unreachable from any screen)
USER_VISIBLE: none currently reachable
PROVENANCE: n/a
SENIOR_RULES: n/a
EXCLUSIONS: n/a
NOTES: DEAD IN PRODUCTION. This is a fully-specified, well-tested
  autoregulation engine with real thresholds that appears to have been
  superseded by algorithms.computeAdaptiveDecision (T-VOLUME-03,
  production-live via WorkoutSummaryScreen) and blockAdvisor's own signal
  detection (T-PROGRAMME-08/10, production-live via PlansScreen). Flagging
  for the founder/D37 triage: two DIFFERENT joint/fatigue/soreness
  autoregulation formulas exist in the codebase (this one and T-VOLUME-03),
  and only T-VOLUME-03 is wired to a screen. This is not necessarily a
  defect (may be a deliberately retained oracle like T-PROGRAMME-02) but
  no code comment here claims that status the way mesocycle.js:85-98 does
  for getCurrentMesoWeek — worth a scenario-writer question to the founder
  rather than an assumption either way.
```

---

## DOMAIN: performance (interpretation of logged sets)

```
RULE_ID: T-PERFORMANCE-01
DOMAIN: performance
AUTHORITY: src/lib/algorithms.js:101 calculate1RM
PRODUCTION_CALLER: ActiveWorkoutScreen.js, ExerciseDetailScreen.js,
  liftProgress.js, blockMetrics.js, plateauSurfacing.js,
  workoutRecordLine.js (multiple confirmed production callers)
INPUTS: weight, reps
OUTPUT: estimated 1RM
THRESHOLDS: reps===1 -> return weight verbatim. reps clamped at 20 for the
  formula (r = min(reps,20)) — "1RM estimators lose validity past ~12-15
  reps... a 25-30 rep set used to return a wildly inflated estimate
  (~5x)". r<=10: blend epley*0.6 + brzycki*0.4. r>10 (11-20): Epley ALONE
  (C10L ruling — Brzycki over-inflates in this range, "a lighter high-rep
  set could manufacture an Est. max PR, a steeper block e1RM slope and...
  stronger weekly performance evidence than its quality warranted")
PRECEDENCE: n/a (single formula, not a competing-rule decision)
PERSISTENCE: derived value, not stored directly; feeds PR detection
  (T-PERFORMANCE-02) and blockE1rmSlopePct (feeds T-WEEKLY-03's
  performance score)
USER_VISIBLE: "Est. max" displays, PR banners
PROVENANCE: n/a
SENIOR_RULES: none
EXCLUSIONS: w<=0 or reps<1 -> returns w if finite&&>0, else 0 (guard, not
  an exclusion in the domain sense)
NOTES: the 10-rep Epley/Brzycki formula switch (C10L) is a documented
  FIXED historical defect (inflated high-rep PRs), not a live one.
```

```
RULE_ID: T-PERFORMANCE-02
DOMAIN: performance
AUTHORITY: src/lib/algorithms.js:355 isE1rmEligibleRow, :360 detectPR,
  :446 bestPRPerExercise
PRODUCTION_CALLER: ActiveWorkoutScreen.js (grep-confirmed), used inside
  the finish-workout PR detection flow
INPUTS: newSet, historicalSets[], exercise, units
OUTPUT: prs[] of {type: '1rm_estimate'|'heaviest_weight'|
  'most_reps_at_weight', value, previousValue, label}
THRESHOLDS: isE1rmEligibleRow excludes setType in {warmup, myo_reps,
  rest_pause} — cluster-commit rows store SUMMED reps and would fabricate
  a huge estimate. 1rm_estimate PR requires new1RM > best1RM * 1.001
  (0.1% margin, "detectPR's 0.1% margin", reused verbatim as
  E1RM_PROGRESS_MARGIN elsewhere). heaviest_weight: weight >
  heaviestEver (any margin). most_reps_at_weight: reps > maxRepsAtWeight
  at the same weight (within 0.1kg tolerance), maxRepsAtWeight>0 required
  (no PR on a genuinely first-ever weight for this exercise via this
  route)
PRECEDENCE: bestPRPerExercise collapses multiple PRs from one session per
  exercise to ONE, ranked 1rm_estimate(3) > heaviest_weight(2) >
  most_reps_at_weight(1), tie-broken by larger value
PERSISTENCE: PR events written to workout completion flow (finish-workout
  path)
USER_VISIBLE: PR celebration banner/toast
PROVENANCE: n/a (own PR-type vocabulary)
SENIOR_RULES: none
EXCLUSIONS: warm-up/myo-rep/rest-pause rows can never set OR seed a
  1rm_estimate PR (isE1rmEligibleRow gate applies to both the new set and
  every historical comparator)
NOTES: n/a
```

```
RULE_ID: T-PERFORMANCE-03
DOMAIN: performance
AUTHORITY: src/lib/algorithms.js:1096 sessionBestE1rm, :1136
  detectPlateau, :1304 detectProgressionConsistency
PRODUCTION_CALLER: liftProgress.js, plateauSurfacing.js,
  exercise/intent.js:86-91 (loadExerciseIntentState — production, feeds
  T-SLOT-04's plateau/systematicCandidate evidence), blockMetrics.js
INPUTS: exerciseSessions[] (newest-first, one array of sets per session)
OUTPUT: detectPlateau -> {plateau, consecutiveStalls, resolution:
  'change_rep_range'|'swap_exercise', weeks, sessions, spanDays, message};
  detectProgressionConsistency -> {status: 'progressing'|'holding'|
  'insufficient', gains, comparisons}
THRESHOLDS: both require >=3 eligible sessions (isE1rmEligibleRow filter)
  to run at all. Comparison window = 4 most recent sessions (3 adjacent
  comparisons). "Progressed" = curr > prev * E1RM_PROGRESS_MARGIN(1.001).
  Plateau qualifies at consecutiveStalls>=2. Plateau DURATION extends
  backward through full history while gap<=PLATEAU_MAX_GAP_DAYS(14) and no
  real progression breaks it; must additionally satisfy distinctWeeks >=
  PLATEAU_MIN_WEEKS(3) AND spanDays>=PLATEAU_MIN_SPAN_DAYS(14) AND
  biggestGap<=14 to actually qualify as a plateau (else returned as
  {plateau:false, consecutiveStalls}). resolution: consecutiveStalls>=3 ->
  'swap_exercise' (4-6 week substitute); consecutiveStalls===2 ->
  'change_rep_range' (15-20 rep range, 3 weeks).
  detectProgressionConsistency: requires comparisons>=2; 'progressing' if
  gains >= ceil(comparisons/2) (a MAJORITY of comparisons improved), else
  'holding' (never a negative claim)
PRECEDENCE: detectPlateau and detectProgressionConsistency are explicitly
  built as MIRROR IMAGES sharing sessionBestE1rm and E1RM_PROGRESS_MARGIN
  "so the app can never say a muscle is both progressing and plateaued
  from the same data" (C13 job 1 fix — documented historical bug where
  the two used different session-summary bases and could disagree)
PERSISTENCE: plateau/progression status feeds exercise/intent.js's
  evidence (T-SLOT-04) and the block-review slot verdict (T-PROGRAMME-04
  rule 9)
USER_VISIBLE: plateau nudge copy ("Your best set here hasn't moved in
  about N weeks...")
PROVENANCE: n/a
SENIOR_RULES: none
EXCLUSIONS: cluster-set rows (myo_reps, rest_pause) and warm-ups never
  count as evidence for either function
NOTES: the C13-job-1 divergence (plateau using best-set, progression
  using session-average) is a documented FIXED historical defect.
```

---

## DOMAIN: liveset (Campaign 20 live set prescription)

Entry point: `ActiveWorkoutScreen.js` calls `resolveSetPrescription` at
multiple sites (seed at line 1693, re-resolution at 2051/3046, first-set
lookup at 2188), consuming `buildEvidencePacket`/`assembleEvidencePacket`
from `src/lib/livePrescription.js`.

```
RULE_ID: T-LIVESET-01
DOMAIN: liveset
AUTHORITY: src/lib/livePrescription.js:867 resolveSetPrescription (the
  full §9.3 precedence pipeline)
PRODUCTION_CALLER: ActiveWorkoutScreen.js:1693/2051/2188/3046
INPUTS: evidence packet (exercise, prescription, senior, history[],
  today.working[], overrideLoad/overrideReps), position {index, setType}
OUTPUT: {weight, repsTarget, repsBand, provenance, confidence, prefill,
  reference}
THRESHOLDS: pipeline order (exact, cannot be reordered without breaking
  the design's own precedence law):
  1. SENIOR: isDeload && deloadTargets.length -> return deloadTargets[idx]
     verbatim, provenance SENIOR_RECOVERY_HOLD, confidence 'high',
     ALWAYS wins (Law F — deload owns its session outright)
  2. TYPE GATE (§15): exerciseType in {duration, distance} OR setType in
     {dropset, myo_reps, rest_pause, warmup} -> INSUFFICIENT_EVIDENCE,
     confidence 'low', prefill false, no intelligence applied
  3. FIRST-TIME: history.length===0 AND today.working.length===0 ->
     FIRST_TIME_BAND, weight = prescription.startingWeight or null,
     repsTarget = band.min, confidence 'low'
  4. WORKING LOAD (determineWorkingLoad, T-LIVESET-02/03/04)
  5. STRUCTURE (back-off ratio, T-LIVESET-05) — skipped if
     today.overrideLoad set OR working.sessionDriven true (current-session
     evidence outranks structure, §7 hierarchy)
  6. REP TARGET (§11 beat rule + §13 expected-curve prior, T-LIVESET-06)
  7. SENIOR TRIM (readiness/re-entry load factor + layoff 0.9 multiplier),
     applied LAST, downward-only, compose independently
  BODYWEIGHT LAW (CALC-5/FR-C4-4): exerciseType==='reps_only' -> weight
     forced null, unconditionally, AFTER every other computation
PRECEDENCE: as listed above; Law G (user override) outranks Law E
  (structure); Law B (current-session evidence) outranks stable structure
  when sessionDriven=true
PERSISTENCE: display-only per-set prescription; NOT persisted beyond the
  session's own logged sets (the resolver recomputes fresh from evidence
  every call — "PURE, deterministic. Same packet + position in, same
  Prescription out, always")
USER_VISIBLE: the weight/reps shown on ActiveWorkoutScreen before the set
  is logged
PROVENANCE: exactly 13 codes (PROVENANCE object, livePrescription.js:52-66)
SENIOR_RULES: deload (rule 1) and the type gate (rule 2) are senior to
  everything; the readiness/re-entry/layoff trim (rule 7) is senior to
  the resulting number but can only ever REDUCE it
EXCLUSIONS: AMRAP positions never receive a numeric repsTarget
  (repsTarget forced null at pos.setType==='amrap')
NOTES: this module replaces "the fragmented authorities" (getBestAnchorSet,
  the ghost prefill, computeSetTargets' per-set loop, stalledAdvice) per
  its own header — those are RETIRED (algorithms.js:324-342 documents
  computeSetTargets/getProgressionSuggestion as retired with zero
  production callers, migrated here).
```

```
RULE_ID: T-LIVESET-02
DOMAIN: liveset
AUTHORITY: src/lib/livePrescription.js:195 nextSessionOpeningLoad (§10
  LOAD-PROGRESSION RULE)
PRODUCTION_CALLER: livePrescription.js:846 determineWorkingLoad (inside
  resolveSetPrescription) -> ActiveWorkoutScreen.js
INPUTS: comparableHistory[] (already §8-comparable, newest-first), band
  {min,max}, incrementKg/units/category
OUTPUT: {weight, provenance, sourceAt}
THRESHOLDS: outlier-discounted first (T-LIVESET-07). DROP
  (LOAD_DROP_CONSECUTIVE_MISS): the BEST set at the top load W missed
  repsMin in TWO consecutive comparable (non-discounted) sessions ->
  weight = W - resolveLoadIncrement(W) (T-LIVESET-08's 5%-capped
  increment). A SINGLE miss holds and rebuilds (HOLD_BUILDING_RANGE),
  never drops on one miss. ADVANCE (LOAD_ADVANCE_RANGE_TOPPED): range
  topped at W (best reps >= band.max), NOTHING at W missed, AND effort
  corroborates (sessionDifficulty 1-3 out of the 1-5 scale) AND W>0 ->
  weight = W + increment. Effort 4-5 ("very hard") -> HOLD_EFFORT_VERY_HARD
  (topped but too hard to trust yet). No difficulty rating ->
  HOLD_EFFORT_UNKNOWN. Otherwise (in-band, or topped-but-W<=0) ->
  MATCH_LOAD_ADD_REP (ordinary continuation at W).
PRECEDENCE: DROP is checked before ADVANCE — a genuine regression is never
  masked by a "topped" read from a different, more recent comparable
  session
PERSISTENCE: n/a (pure function feeding resolveSetPrescription)
USER_VISIBLE: the copy strings mapped from provenance in
  ActiveWorkoutScreen.js:127-137 ("Range topped last time. Next step up."
  etc.)
PROVENANCE: LOAD_DROP_CONSECUTIVE_MISS, HOLD_BUILDING_RANGE,
  LOAD_ADVANCE_RANGE_TOPPED, HOLD_EFFORT_VERY_HARD, HOLD_EFFORT_UNKNOWN,
  MATCH_LOAD_ADD_REP
SENIOR_RULES: never fires when senior deload/type-gate/first-time already
  short-circuited (rules 1-3 of T-LIVESET-01)
EXCLUSIONS: never advances a zero/unloaded (W<=0) top set regardless of
  reps (CALC-5 pin, bodyweight-never-loads)
NOTES: the ±2-rep "noise floor" the mission calls out is IMPLICIT here —
  documented at livePrescription.js:326-330: adjustWeaker only fires on a
  genuine below-band miss or a >=3-rep-below-expected shortfall, and
  adjustStronger only fires on a >=repsMax+2 overshoot — "anything inside
  that leaves both changed:false", i.e. the ±2 zone is inert by
  construction, not a literal comparison against the number 2 anywhere in
  this function.
```

```
RULE_ID: T-LIVESET-03
DOMAIN: liveset
AUTHORITY: src/lib/livePrescription.js:337 adjustWeaker (§12.2), :372
  adjustStronger (§12.1)
PRODUCTION_CALLER: livePrescription.js:790/798 determineWorkingLoad ->
  ActiveWorkoutScreen.js
INPUTS: today.working[] (this session's logged sets so far), band,
  comparableHistory, category, senior (for adjustStronger's gate)
OUTPUT: adjustWeaker -> {changed, drop, basisWeight, repsTargetOverride,
  provenance: CURRENT_SESSION_FATIGUE_ADJUST}; adjustStronger ->
  {changed, add, basisWeight, repsTargetOverride, provenance:
  CURRENT_SESSION_STRONGER}
THRESHOLDS: adjustWeaker: last logged set reps < band.min -> drop one
  increment, honest target = band.min. Else, if in-band but >=3 below the
  HISTORY-based (not today-rebased) expected-curve value -> hold the
  load, target drops to the honest expected value (never re-demanding a
  fresh +1). adjustStronger: last set reps >= band.max+2 (the explicit
  "+2 overshoot" threshold named in the mission) -> +1 increment step,
  bounded to ONE step per session (checked via "any set today already
  heavier than the first set today" — stateless re-derivation of
  "already advanced once"); REQUIRES no sub-band set logged today
  (anySubBand check) and Founder Ruling 2 (ABSOLUTE): disabled outright
  under senior.isDeload, senior.blockFinished, senior.reEntryEaseActive,
  or senior.readinessReductionActive — "never merely trimmed"
PRECEDENCE: adjustWeaker checked before adjustStronger in
  determineWorkingLoad (weaker wins if both could theoretically apply,
  though the anySubBand guard on adjustStronger makes true overlap rare)
PERSISTENCE: n/a
USER_VISIBLE: "Down a little today. Steady here." /
  "Strong today. Stay here for this one."
PROVENANCE: CURRENT_SESSION_FATIGUE_ADJUST, CURRENT_SESSION_STRONGER
SENIOR_RULES: adjustStronger is DISABLED (not trimmed — a hard `changed:
  false`) under any of the four senior states named above
EXCLUSIONS: adjustStronger never fires with any sub-band set already
  logged today, and never compounds twice in one session
NOTES: n/a
```

```
RULE_ID: T-LIVESET-04
DOMAIN: liveset
AUTHORITY: src/lib/livePrescription.js:401 detectLoadOverride, :408
  detectRepsOverride (Law G, user override)
PRODUCTION_CALLER: exported for screen-wiring per the module's own
  comment ("Exported for the (later) screen-wiring stage; not called
  internally here"); override STATE (today.overrideLoad/overrideReps) is
  read as a PACKET INPUT inside resolveSetPrescription
  (livePrescription.js:783/932), which IS production-live via
  ActiveWorkoutScreen.js. The detection functions themselves compute
  whether a logged deviation COUNTS as a deliberate override.
INPUTS: loggedWeight/prescribedWeight, or loggedReps/prescribedReps
OUTPUT: the logged value if it counts as an override, else null
THRESHOLDS: load override: |loggedWeight - prescribedWeight| > half an
  increment (resolveLoadIncrement/2). Reps override: |loggedReps -
  prescribedReps| > 2
PRECEDENCE: an active override (today.overrideLoad != null) is checked
  FIRST in determineWorkingLoad, before any today-evidence adjustment —
  Law G outranks Law B and Law E (structure)
PERSISTENCE: n/a directly; the override, once detected/set, becomes
  today.overrideLoad for the rest of the resolver's precedence chain
USER_VISIBLE: provenance USER_CHOICE_RESPECTED — "Working from the weight
  you chose."
PROVENANCE: USER_CHOICE_RESPECTED
SENIOR_RULES: user override outranks structure (Law E) and ordinary
  today-evidence adjustment, but NOT the senior deload gate (rule 1 of
  T-LIVESET-01, which owns the session outright before override state is
  even consulted)
EXCLUSIONS: n/a
NOTES: detectLoadOverride/detectRepsOverride themselves have NO confirmed
  production caller by name (grep finds only the module and tests) — the
  DECISION they make (is this an override) is exercised in production via
  whatever screen code sets today.overrideLoad/overrideReps before
  building the packet; the pure detection helpers are exported but their
  actual invocation site in ActiveWorkoutScreen.js was not traced further
  in this pass. Recorded as PRODUCTION (the mechanism they encode is
  live) with the caveat that the exact call site for the two named
  functions was not grep-confirmed — worth a follow-up grep for
  `detectLoadOverride(` / `detectRepsOverride(` specifically in
  ActiveWorkoutScreen.js if Step 9 needs the exact line.
```

```
RULE_ID: T-LIVESET-05
DOMAIN: liveset
AUTHORITY: src/lib/livePrescription.js:263 stableBackoffRatio (§13.1,
  Law E)
PRODUCTION_CALLER: livePrescription.js:933 resolveSetPrescription ->
  ActiveWorkoutScreen.js
INPUTS: comparableHistory[], pos (set position)
OUTPUT: {ratio, support} or null
THRESHOLDS: a stable back-off exists at position `pos` when >=2 of the
  last 3 outlier-discounted comparable sessions show ratio_p =
  weight_p/topWeight <= 0.95 (5% or more below the session top), AND
  those low ratios agree within 0.05 of each other (2-of-3 back-off at
  0.95/0.05, exactly as named in the mission). ratio returned = median of
  the agreeing subset.
PRECEDENCE: applied AFTER working-load determination but BEFORE rep-
  target computation; skipped entirely when
  today.overrideLoad!=null OR working.sessionDriven===true (current-
  session evidence, §7 tier 3, outranks stable structure, §7 tier 4)
PERSISTENCE: n/a
USER_VISIBLE: provenance STABLE_BACKOFF_PATTERN — "You usually back this
  set off slightly."
PROVENANCE: STABLE_BACKOFF_PATTERN
SENIOR_RULES: one session can NEVER create a back-off pattern (adversarial
  property, Stage 14) — the >=2-of-3 requirement is the enforcement
EXCLUSIONS: AMRAP rows excluded from structure learning
  (STRUCTURE_TYPES = {'straight'} only)
NOTES: n/a
```

```
RULE_ID: T-LIVESET-06
DOMAIN: liveset
AUTHORITY: src/lib/livePrescription.js:298 expectedRepsFromHistory, :314
  expectedReps (§11 beat rule + §13.2 expected-curve prior), :106
  declinePerPosition
PRODUCTION_CALLER: livePrescription.js:949 resolveSetPrescription ->
  ActiveWorkoutScreen.js
INPUTS: pos, comparableHistory, today.working[], band, category
OUTPUT: numeric expected reps for this position, clamped to [band.min,
  band.max]
THRESHOLDS: declinePerPosition: isolation/accessory -> 0 reps decline per
  position; compound (default) -> 1 rep decline per position. Mid-session
  (a prior position already logged today): re-bases off TODAY's most
  recent logged position, declined by the gap. Otherwise: median of
  history's observations at that exact position (falls back to the
  nearest LOWER position with data, decline-adjusted, when this exact
  position has never been observed). With NO data anywhere: a neutral
  band.max-based decline chain. Final rep target (rule 6 of
  T-LIVESET-01) = clamp(min(E+1, band.max), band.min, band.max) — "the
  beat rule": always ask for one more than the expected curve, capped at
  band.max.
PRECEDENCE: today's own logged positions outrank history when present
  (avoids self-reference per the code comment)
PERSISTENCE: n/a
USER_VISIBLE: the reps target number shown per set
PROVENANCE: n/a (feeds the final repsTarget field on every non-special-
  case prescription)
SENIOR_RULES: overridden entirely when working.repsOverride is set
  (drop/add/deload/user-override branches all set their own repsTarget)
EXCLUSIONS: LOAD_ADVANCE_RANGE_TOPPED / LOAD_DROP_CONSECUTIVE_MISS /
  INSUFFICIENT_EVIDENCE provenances bypass this and use band.min directly
  ("fresh range at the new load")
NOTES: n/a
```

```
RULE_ID: T-LIVESET-07
DOMAIN: liveset
AUTHORITY: src/lib/livePrescription.js:178 discountOutliers (§13.3)
PRODUCTION_CALLER: called internally by nextSessionOpeningLoad,
  stableBackoffRatio, expectedRepsFromHistory, resolveConfidence — all
  reached from resolveSetPrescription -> ActiveWorkoutScreen.js
INPUTS: comparableHistory[]
OUTPUT: filtered session list (outlier sessions excluded from LEARNING
  only)
THRESHOLDS: a session's top e1RM sitting >10% below the window median
  (sessionTopE1rm(session) < median*0.9) is discounted — the "10% outlier"
  named in the mission. list.length<=1 -> returns unchanged (a single
  session can never be its own outlier)
PRECEDENCE: applied before every learning computation (opening load,
  back-off ratio, expected curve, confidence) but NEVER removes a session
  from the `history` shown as reference (Law A: never fabricate, never
  hide — the reference row still shows real history)
PERSISTENCE: n/a
USER_VISIBLE: indirectly, via which sessions inform the shown prescription
PROVENANCE: n/a
SENIOR_RULES: none
EXCLUSIONS: n/a
NOTES: n/a
```

```
RULE_ID: T-LIVESET-08
DOMAIN: liveset
AUTHORITY: src/lib/livePrescription.js:116 resolveLoadIncrement (§10.2/
  §10.4), algorithms.js:313 defaultIncrement
PRODUCTION_CALLER: livePrescription.js multiple internal call sites (load
  DROP/ADVANCE/adjustWeaker/adjustStronger) -> ActiveWorkoutScreen.js
INPUTS: baseWeight, incrementKg (custom per-exercise override), units,
  category
OUTPUT: the increment to apply, in kg or lb
THRESHOLDS: raw increment = incrementKg (custom) ?? defaultIncrement(w,
  units, category); capped at 5% of the base load
  (cappedByPercent = min(raw, w*0.05), the "5% cap" named in the mission);
  rounded to the nearest 0.25 (roundQuarter); floored at 0.25 (never
  zero). defaultIncrement table (algorithms.js:313-322): kg compound
  weight>=60 -> 2.5 else 1.25; kg isolation weight>=20 -> 1 else 0.5; kg
  accessory weight>=40 -> 1.25 else 0.75; lbs compound weight>=135 -> 5
  else 2.5; lbs isolation weight>=45 -> 2.5 else 1.25; lbs accessory
  weight>=90 -> 2.5 else 1.25
PRECEDENCE: the ONE increment source of truth for every load-changing
  branch in livePrescription.js (single function, no competing formula)
PERSISTENCE: n/a
USER_VISIBLE: the actual kg/lb jump shown between sessions
PROVENANCE: n/a
SENIOR_RULES: none
EXCLUSIONS: n/a
NOTES: n/a
```

```
RULE_ID: T-LIVESET-09
DOMAIN: liveset
AUTHORITY: src/lib/livePrescription.js:829-844 determineWorkingLoad
  (layoff / block-finished senior opening-time overrides, §10.5/§14)
PRODUCTION_CALLER: livePrescription.js -> resolveSetPrescription ->
  ActiveWorkoutScreen.js
INPUTS: senior.layoffDays, senior.blockFinished, comparableHistory, band
OUTPUT: {L, provenance: SENIOR_RECOVERY_HOLD, repsOverride: band.min,
  seniorMultiplier}
THRESHOLDS: senior.layoffDays > 7 (the "layoff >7d" named in the mission)
  OR senior.blockFinished -> cap the opening load at the most recent
  comparable session's top load (never let the ADVANCE gate fire), still
  respect a genuine consecutive-miss DROP, still allow back-off structure
  to compose. Layoff specifically applies seniorMultiplier = 0.9 (the
  "×0.9" named in the mission) on top of the capped load; block-finished
  applies no multiplier (cap only)
PRECEDENCE: fires only when today.working.length===0 (no today evidence
  yet); ordinary nextSessionOpeningLoad gate runs afterward if neither
  layoff nor block-finished condition triggers
PERSISTENCE: n/a
USER_VISIBLE: provenance SENIOR_RECOVERY_HOLD copy on
  ActiveWorkoutScreen: recovery-hold framing after a layoff or at a
  block's first post-finish session
PROVENANCE: SENIOR_RECOVERY_HOLD (shared with the deload branch, rule 1
  of T-LIVESET-01)
SENIOR_RULES: "a senior state's own hold composes with an existing
  back-off exactly the way the un-flagged resolve would... the only
  guaranteed way to satisfy 'a senior flag never makes the prescription
  MORE aggressive' against every history shape" (Stage 14 invariant)
EXCLUSIONS: only reachable with zero today evidence; once a set is logged
  today, ordinary Law B (today-evidence) rules take over
NOTES: readinessReductionActive/reEntryEaseActive are separate senior
  trims applied at rule 7 (the final downward-only pass) rather than
  here.
```

---

## DOMAIN: session (completion semantics, sequencing)

```
RULE_ID: T-SESSION-01
DOMAIN: session
AUTHORITY: src/lib/blockProgression.js:171 RESOLUTION_PRECEDENCE (the
  six-row founder-pinned table), :242 resolveWeekSessions
PRODUCTION_CALLER: programmePosition.js:148/176
  (resolveProgrammePosition) -> HomeScreen.js/database.js
INPUTS: explicit resolution (SKIPPED_BY_USER | ENDED_EARLY | null, from
  getLiveSessionResolutions), otherCompletion (a completed workout row for
  the same required session that is NOT the ended-early session's own
  workout)
OUTPUT: state in {OUTSTANDING, COMPLETED, SKIPPED_BY_USER, ENDED_EARLY}
  per required (mesocycleWeekId, routineId) session
THRESHOLDS: table (verbatim, blockProgression.js:172-178): (1) no
  explicit, no completion -> OUTSTANDING; (2) no explicit, completion
  exists -> COMPLETED; (3) SKIPPED explicit, no completion -> SKIPPED_BY_
  USER; (4) SKIPPED explicit, completion exists -> COMPLETED ("real
  performed work is stronger truth than an earlier intention to skip");
  (5) ENDED_EARLY explicit, no OTHER completion -> ENDED_EARLY; (6)
  ENDED_EARLY explicit, OTHER completion exists -> ENDED_EARLY flagged
  conflict (diagnostically invalid — "not reachable by any authorised
  path", never silently upgraded)
PRECEDENCE: exact table lookup, no branch-order dependency by design (the
  file states this explicitly: "so the answer can never come to depend on
  the order the branches happen to be written in")
PERSISTENCE: explicit resolutions persisted as rows (skip/end-early
  actions write a resolution row); COMPLETED is always DERIVED, never
  itself an explicit resolution type (EXPLICIT_RESOLUTIONS = [SKIPPED_
  BY_USER, ENDED_EARLY] only)
USER_VISIBLE: skipConfirmation / endEarlyConfirmation dialogs; the
  session's state feeds nextOutstandingSession (T-PROGRAMME-09)
PROVENANCE: because in {'not_yet_resolved','performed',
  'skipped_by_user','performed_after_skip','ended_early'}; conflict:
  'ended_early_with_later_completion' (rule 6 only)
SENIOR_RULES: identity is (mesocycleWeekId, routineId) — proven sufficient
  even when a routine NAME repeats within a week (e.g. bikini's two
  "Glutes" sessions), because each is its own routine row/uid
EXCLUSIONS: n/a
NOTES: replaces the old single-integer `programmes.next_workout_index`
  pointer (documented fixed defect: "an athlete whose next required
  session was Legs, who trained Push & Arms instead, had the pointer
  moved past Legs. Legs was never performed and never marked anything").
```

```
RULE_ID: T-SESSION-02
DOMAIN: session
AUTHORITY: src/lib/blockProgression.js:132 pickCurrentResolution, :107
  compareSessionResolutionVersions
PRODUCTION_CALLER: resolveWeekSessions (T-SESSION-01) -> programmePosition.js
  -> HomeScreen.js
INPUTS: multiple raw resolution rows for the SAME (mesocycleWeekId,
  routineId) instance (sync can deliver duplicates/out-of-order rows)
OUTPUT: the ONE current resolution
THRESHOLDS: total order: newest updatedAt, then newest resolvedAt, then
  explicit-state rank (ENDED_EARLY=2 > SKIPPED_BY_USER=1), then
  workoutId text, then id text (ASCII code-unit compare, matching the
  server-side C-collation trigger)
PRECEDENCE: deterministic regardless of arrival order — "shuffling the
  input cannot change the result"
PERSISTENCE: cross-device sync authority for session resolution state
USER_VISIBLE: indirectly (which resolution "wins" after a multi-device
  sync)
PROVENANCE: n/a
SENIOR_RULES: none
EXCLUSIONS: soft-deleted rows (deletedAt != null) never counted
NOTES: mirrored by a founder-gated cloud migration's BEFORE UPDATE
  trigger per the code comment — a schema-level enforcement of the same
  ordering exists server-side.
```

```
RULE_ID: T-SESSION-03
DOMAIN: session
AUTHORITY: src/lib/workoutHelpers.js:64 shouldConfirmBeforeFinish
  (`_timeCrunchSkipped`)
PRODUCTION_CALLER: ActiveWorkoutScreen.js (grep-confirmed importer)
INPUTS: workoutExercises[] {sets, _timeCrunchSkipped}
OUTPUT: boolean — whether to show the "Finish workout?" confirm
THRESHOLDS: totalLoggedSets===0 -> always confirm. Else: planned =
  exercises where !_timeCrunchSkipped; confirm required UNLESS every
  planned exercise has >=1 logged set (planned.length>0 &&
  planned.every(sets.length>0))
PRECEDENCE: an exercise deliberately dropped via Time Crunch is excluded
  from the "would this be silently abandoned" check — "that's a
  deliberate choice, not an abandonment"
PERSISTENCE: none (a UI confirm gate only)
USER_VISIBLE: the finish-workout confirmation dialog itself
PROVENANCE: n/a
SENIOR_RULES: none
EXCLUSIONS: n/a
NOTES: this is the production authority for the `_timeCrunchSkipped` flag
  named explicitly in the mission's session-completion bullet.
```

```
RULE_ID: T-SESSION-04
DOMAIN: session
AUTHORITY: src/lib/mesocycle.js:372 applyTimeCrunch
PRODUCTION_CALLER: not found via direct grep of src/screens for
  `applyTimeCrunch(` in this pass — TEST-ONLY/UNCONFIRMED. Grep of
  `applyTimeCrunch\(` across src returns mesocycle.js itself and test
  files only (mesocycle.test.js, campaign5.syntheticJourney.test.js).
  Flagged rather than asserted DEAD: the Time Crunch FEATURE is clearly
  live (T-SESSION-03's `_timeCrunchSkipped` flag exists and is read by
  ActiveWorkoutScreen), so either a different function now implements the
  session trim in ActiveWorkoutScreen.js directly, or this function is
  invoked through a path this grep pass did not surface (e.g. a
  differently-named re-export). Needs a follow-up grep specifically for
  how ActiveWorkoutScreen sets `_timeCrunchSkipped` before Step 9 treats
  this as either DEAD or reclassifies it PRODUCTION.
INPUTS: exercises[], targetMinutes, estimateFn, options
  {maxSetsPerExercise, maxExercises}
OUTPUT: {exercises, restReduction, dropped[]}
THRESHOLDS: rest reduced 30% first (restSec*0.70). If a starter-session
  trim is configured (maxSetsPerExercise or maxExercises set): keep first
  N exercises in plan order, cap sets per exercise — deterministic, no
  minutes-budget dependency. Otherwise: drop lowest-priority ISOLATION
  exercises (compounds always protected), sorted fewest-sets-first,
  removed highest-sets-first, until estimateFn(result)<=targetMinutes.
PRECEDENCE: starter-trim mode runs INSTEAD OF the budget-fit isolation
  drop, never both
PERSISTENCE: none (a session-shaping function)
USER_VISIBLE: session exercise list under a time constraint
PROVENANCE: n/a
SENIOR_RULES: compounds are NEVER dropped by the budget-fit path
EXCLUSIONS: n/a
NOTES: SUSPECTED CALLER GAP, not a confirmed defect — recorded so Step 9
  does not silently assume this function is the live Time Crunch
  implementation without re-verifying.
```

---

## DOMAIN: slot (exercise preference / exclusion / swap memory)

```
RULE_ID: T-SLOT-01
DOMAIN: slot
AUTHORITY: src/lib/exercise/intent.js:160 isExcluded, :169
  isAvoidedThisBlock, :184 isEligible
PRODUCTION_CALLER: RoutineDetailScreen.js, ActiveWorkoutScreen.js (both
  grep-confirmed importers of the exercise/intent module family)
INPUTS: intent row {kind: EXCLUDED|AVOIDED_BLOCK, scopeMesocycleId},
  state.activeMesocycleId
OUTPUT: boolean eligibility for suggestion/auto-selection
THRESHOLDS: EXCLUDED ("Don't suggest") is INDEFINITE until explicitly
  restored. AVOIDED_BLOCK ("Avoid for this block") is live ONLY while
  row.scopeMesocycleId === the CURRENT active mesocycle id — expires
  automatically when the block ends, no invented duration
PRECEDENCE: exclusion/avoidance never touches HISTORY or deliberate
  reachability — "an excluded exercise stays reachable through 'show
  excluded'"; only affects SUGGESTION/auto-selection paths
PERSISTENCE: intent rows in the exercise_intents table (via
  getExerciseIntents)
USER_VISIBLE: exercise no longer offered by generators/swap sheets
PROVENANCE: n/a
SENIOR_RULES: explicit user intent outranks everything else in this
  module ("An exclusion beats swap history; an approved default beats a
  counted preference")
EXCLUSIONS: n/a
NOTES: n/a
```

```
RULE_ID: T-SLOT-02
DOMAIN: slot
AUTHORITY: src/lib/exercise/intent.js:252 swappedAwayCount
PRODUCTION_CALLER: blockAdvisor.js:510 evidenceFor (inside
  buildProgrammeReview) -> feeds T-PROGRAMME-04's slotVerdict
  swappedAwayCount>=2 rule; database.js:9684 recordExerciseSwap is the
  write path, called from RoutineDetailScreen.js:451 and
  ActiveWorkoutScreen.js:1028
INPUTS: swap rows {fromExerciseId, scope}
OUTPUT: integer count of PROGRAMME-scoped swaps away from this exercise
THRESHOLDS: only rows with scope===SWAP_SCOPE.PROGRAMME count; rows
  recorded before scope existed (scope===null) are explicitly NOT counted
  ("that asymmetry is deliberate and it favours the user")
PRECEDENCE: SESSION-scoped substitutions (a one-off swap because a
  machine was busy) are counted SEPARATELY (sessionSubstitutionCount) and
  are "deliberately never used as negative preference... must never reach
  a replace decision" — this is the fix for a documented historical
  defect where "two busy-machine days reached the threshold and the
  exercise was proposed for removal"
PERSISTENCE: swap rows in exercise_swaps table
USER_VISIBLE: feeds the REPLACE verdict at T-PROGRAMME-04 (>=2 programme-
  scoped swaps away)
PROVENANCE: SLOT_REASON.USER_SWAPPED_AWAY (T-PROGRAMME-04)
SENIOR_RULES: n/a
EXCLUSIONS: SESSION-scoped swaps and pre-scope legacy rows excluded
NOTES: this is the C16 quality-law-1 fix — a documented, now-fixed
  historical defect (busy-machine substitutions counting as negative
  preference), not a live one.
```

```
RULE_ID: T-SLOT-03
DOMAIN: slot
AUTHORITY: src/lib/exercise/intent.js:200 approvedDefaultFor, :412
  repeatedDefaultCandidate
PRODUCTION_CALLER: RoutineDetailScreen.js (swap-sheet default-replacement
  flow, via the exercise/intent module import)
INPUTS: state.defaults[] {fromExerciseId, toExerciseId, routineId},
  state.swaps[] (for repeatedDefaultCandidate)
OUTPUT: approvedDefaultFor -> exerciseId or null; repeatedDefaultCandidate
  -> {exerciseId, count} or null (an OFFER, never automatic)
THRESHOLDS: routine-specific default wins over plan-wide default
  ("preference is contextual, and the more specific context is the
  better answer"). repeatedDefaultCandidate requires top.count >=
  REPEATED_SWAP_MIN(3) AND top.explicit===true AND the candidate is still
  eligible (not since excluded) AND no default already approved
PRECEDENCE: an approved default that the user has SINCE excluded is not
  offered — "the newer explicit intent wins over the older explicit
  intent"
PERSISTENCE: exercise_slot_defaults table (approvedDefaultFor reads it);
  repeatedDefaultCandidate never writes — "never after one swap, and
  never automatic: the caller must ask the user"
USER_VISIBLE: "Make this your default?" prompt after 3 repeated explicit
  swaps to the same replacement
PROVENANCE: n/a
SENIOR_RULES: exclusion (T-SLOT-01) outranks an approved default
EXCLUSIONS: n/a
NOTES: REPEATED_SWAP_MIN=3 is the same constant used for
  evidenceMaturity's ESTABLISHED gate (T-SLOT-04) — "one swap is a choice,
  not a pattern".
```

```
RULE_ID: T-SLOT-04
DOMAIN: slot
AUTHORITY: src/lib/exercise/intent.js:312 exerciseEvidence, :382
  evidenceMaturity, :397 MATURITY_WEIGHT
PRODUCTION_CALLER: blockAdvisor.js:507/523/530 evidenceFor (inside
  buildProgrammeReview) -> feeds T-PROGRAMME-04's slotVerdict
  (establishedPersonalFit, sufficient, systematicCandidate fields all
  derive from this)
INPUTS: usage row (sessions, lastTrainedMs), swap evidence (chosen count),
  progression map (from detectProgressionConsistency/detectPlateau,
  T-PERFORMANCE-03)
OUTPUT: {sessions, lastTrainedMs, trainedRecently, repeatedChoice,
  retained, swappedAway, progression, plateau, plateauResolution,
  sufficient, maturity: NONE|EMERGING|ESTABLISHED}
THRESHOLDS: trainedRecently = within recencyWindowMs (default 45 days —
  matches livePrescription's own 45-day comparability window, T-LIVESET's
  FORTY_FIVE_DAYS_MS). sufficient = sessions>=2 OR chosen>=
  REPEATED_SWAP_MIN(3) ("a brand-new exercise must be allowed to say so.
  One session is a try, not a preference"). retained = chosen>0 AND
  sessions>0 AND away<chosen. ESTABLISHED_SESSIONS = 4 (evidenceMaturity:
  sessions>=4 OR repeatedChoice>=3 -> ESTABLISHED; sessions>=1 OR
  repeatedChoice>=1 -> EMERGING; else NONE). MATURITY_WEIGHT: NONE=0,
  EMERGING=0.5, ESTABLISHED=1 — "Zero at NONE is the whole point of law
  3... a NEW/replacement exercise must not inherit confidence or working
  load from the exercise it replaced"
PRECEDENCE: maturity gates how much personal-evidence weight (vs generic
  canonicality) a ranking may apply (rankPersonalised, not separately
  detailed here) — "generic canonicality dominates when evidence is weak
  and legitimate personal evidence increasingly dominates as it becomes
  established" (Founder Law 3)
PERSISTENCE: derived, not stored directly (usage/swap/progression source
  rows are what persist)
USER_VISIBLE: establishedPersonalFit feeds a KEEP (PERSONAL_FIT_KEEP)
  verdict at block review (T-PROGRAMME-04)
PROVENANCE: EVIDENCE_MATURITY vocabulary (none/emerging/established)
SENIOR_RULES: Founder Law 2: "New/replacement exercises begin with
  insufficient personal evidence. Do not transfer confidence or working
  load from the exercise they replaced" — enforced by maturity always
  starting at NONE for a never-performed exercise regardless of what it
  replaced
EXCLUSIONS: tolerance is explicitly NOT tracked ('not_tracked') — "the
  app's recovery feedback is whole-body and per-session; attributing it
  to one exercise would be manufacturing evidence"
NOTES: this module explicitly disclaims any "score" or hypertrophy-
  effectiveness claim — "No fake effectiveness score... nothing here
  claims one exercise builds more muscle than another".
```

---

## INVENTORY TABLE

| rule_id | authority (file:function) | caller-status |
|---|---|---|
| T-WEEKLY-01 | weeklyCoach.js:186 assessDataConfidence | PRODUCTION — CoachOutputScreen.js:1825 |
| T-WEEKLY-02 | weeklyCoach.js:261 corroborateConfidenceLevel | PRODUCTION — CoachOutputScreen.js (photo corroboration) |
| T-WEEKLY-03 | weeklyCoach.js:279/344/371 recovery x performance matrix | PRODUCTION — CoachOutputScreen.js:1825 |
| T-WEEKLY-04 | weeklyCoach.js:2085 autoApplyHoldActive (D16) | PRODUCTION — CoachOutputScreen.js |
| T-WEEKLY-05 | weeklyCoach.js:2115 exceeded escalation (D15) | PRODUCTION — CoachOutputScreen.js |
| T-WEEKLY-06 | coachingGoals.js:620 getTrainingNote | PRODUCTION — via runWeeklyCoach |
| T-WEEKLY-07 | coachIntervention.js (whole file) | PRODUCTION — imported weeklyCoach.js:30 |
| T-WEEKLY-08 | coachPrecedence.js:380 coordinateChanges | PRODUCTION — weeklyCoach.js:1742 |
| T-WEEKLY-09 | weeklyCoach.js:107-174 comparator/freshness | PRODUCTION — via runWeeklyCoach |
| T-PROGRAMME-01 | mesocycle.js:28 BLOCK_PLANNED_WEEKS | PRODUCTION — database.js:4312 activatePlanWithBlock |
| T-PROGRAMME-02 | mesocycle.js:31/106 MESO_SCHEDULE/getCurrentMesoWeek | DEAD (test oracle only, self-documented) |
| T-PROGRAMME-03 | mesocycle.js:533/513/164 getBlockStatus family | PRODUCTION — blockAdvisor.js, database.js |
| T-PROGRAMME-04 | programmeEpoch.js:265 slotVerdict | PRODUCTION — blockAdvisor.js:649 (Pro only) |
| T-PROGRAMME-05 | programmeEpoch.js:382 programmeVerdict | PRODUCTION — blockReview.js:112 (Pro only) |
| T-PROGRAMME-06 | programmeEpoch.js:226/211/202/137 epoch counting | PRODUCTION — blockAdvisor.js buildProgrammeReview |
| T-PROGRAMME-07 | blockAdvisor.js:254/380 next-block recommendation | PRODUCTION — PlansScreen.js |
| T-PROGRAMME-08 | blockAdvisor.js:104/49 detectSignals | PRODUCTION — PlansScreen.js |
| T-PROGRAMME-09 | programmePosition.js:97, blockProgression.js | PRODUCTION — HomeScreen.js, database.js |
| T-PROGRAMME-10 | blockAdvisor.js:826-872 deload/heads-up gating | PRODUCTION — PlansScreen.js |
| T-PROGRAMME-11 | interBlock.js BLOCK_CLASS/classifyMuscleBlock | PRODUCTION — blockLedgerRunner.js -> database.js/PlansScreen.js |
| T-VOLUME-01 | algorithms.js:25/277 VOLUME_LANDMARKS/getVolumeStatus | PRODUCTION — multiple screens |
| T-VOLUME-02 | algorithms.js:484 shouldDeload | PRODUCTION — HomeScreen.js:1143, CoachReviewScreen.js:418, useProgressData.js:350 |
| T-VOLUME-03 | algorithms.js:545/658 adaptive decision/engine | PRODUCTION — WorkoutSummaryScreen.js:575 |
| T-VOLUME-04 | algorithms.js:693 computeAdaptiveLandmarks | PRODUCTION — via effectiveLandmarks.js, sessionAdjustments.js |
| T-VOLUME-05 | algorithms.js:810/1012 computeSessionAdjustments | PRODUCTION — sessionAdjustments.js:166 -> HomeScreen.js |
| T-VOLUME-06 | coachApply.js:269/318 computeVolumeApply/Allocation | PRODUCTION — CoachOutputScreen.js, sessionAdjustments.js:67 |
| T-VOLUME-07 | algorithms.js:1364 detectLaggingMuscles | PRODUCTION — CoachReviewScreen.js:422 |
| T-VOLUME-08 | effectiveLandmarks.js:41/94 precedence merge | PRODUCTION — multiple screens |
| T-RECOVERY-01 | sessionAdjustments.js:211-286 READINESS_RULES | PRODUCTION — ActiveWorkoutScreen.js |
| T-RECOVERY-02 | sessionAdjustments.js:317/351, reEntryEaseState.js | PRODUCTION — ActiveWorkoutScreen.js |
| T-RECOVERY-03 | recoveryState.js:90 resolveRecoveryState | PRODUCTION — programmePosition.js:204 |
| T-RECOVERY-04 | algorithms.js:1334 generateDeloadPrescription | PRODUCTION — ActiveWorkoutScreen.js:1595 |
| T-RECOVERY-05 | mesocycle.js:212/315 evaluateAutoReg/predictDeloadWeek | DEAD (no screen caller found) |
| T-PERFORMANCE-01 | algorithms.js:101 calculate1RM | PRODUCTION — multiple screens/libs |
| T-PERFORMANCE-02 | algorithms.js:355/360/446 PR detection | PRODUCTION — ActiveWorkoutScreen.js |
| T-PERFORMANCE-03 | algorithms.js:1096/1136/1304 plateau/progression | PRODUCTION — liftProgress.js, exercise/intent.js |
| T-LIVESET-01 | livePrescription.js:867 resolveSetPrescription | PRODUCTION — ActiveWorkoutScreen.js (multiple sites) |
| T-LIVESET-02 | livePrescription.js:195 nextSessionOpeningLoad | PRODUCTION — via resolveSetPrescription |
| T-LIVESET-03 | livePrescription.js:337/372 adjustWeaker/Stronger | PRODUCTION — via resolveSetPrescription |
| T-LIVESET-04 | livePrescription.js:401/408 override detection | PRODUCTION (mechanism live); exact call site of the two named functions not grep-confirmed |
| T-LIVESET-05 | livePrescription.js:263 stableBackoffRatio | PRODUCTION — via resolveSetPrescription |
| T-LIVESET-06 | livePrescription.js:298/314 expected reps | PRODUCTION — via resolveSetPrescription |
| T-LIVESET-07 | livePrescription.js:178 discountOutliers | PRODUCTION — via resolveSetPrescription |
| T-LIVESET-08 | livePrescription.js:116, algorithms.js:313 increment | PRODUCTION — via resolveSetPrescription |
| T-LIVESET-09 | livePrescription.js:829-844 layoff/block-finished | PRODUCTION — via resolveSetPrescription |
| T-SESSION-01 | blockProgression.js:171/242 RESOLUTION_PRECEDENCE | PRODUCTION — programmePosition.js |
| T-SESSION-02 | blockProgression.js:132/107 pickCurrentResolution | PRODUCTION — via resolveWeekSessions |
| T-SESSION-03 | workoutHelpers.js:64 shouldConfirmBeforeFinish | PRODUCTION — ActiveWorkoutScreen.js |
| T-SESSION-04 | mesocycle.js:372 applyTimeCrunch | UNCONFIRMED — no direct screen caller found by grep; feature (`_timeCrunchSkipped`) is live but this exact function's caller is not confirmed |
| T-SLOT-01 | exercise/intent.js:160/169/184 exclusion/eligibility | PRODUCTION — RoutineDetailScreen.js, ActiveWorkoutScreen.js |
| T-SLOT-02 | exercise/intent.js:252 swappedAwayCount | PRODUCTION — blockAdvisor.js:510; write path database.js:9684 |
| T-SLOT-03 | exercise/intent.js:200/412 approved/repeated default | PRODUCTION — RoutineDetailScreen.js |
| T-SLOT-04 | exercise/intent.js:312/382/397 evidence maturity | PRODUCTION — blockAdvisor.js:507-530 |

---

## THRESHOLDS INVENTORY (deduplicated, for Step 9)

**Weekly / coordination**
- Data confidence: weigh_ins < 3 -> data_hold; hasUnusualEvent && < 5 ->
  data_hold; < 5 -> medium; weeksInPhase < 2 -> low
- Recovery score bands: soreness>=4 ->4; energy<=2 OR soreness>=3 ->3;
  energy>=4 AND soreness<=1 ->1; else 2; stress>=4 forces score>=3
- Performance score: PR_DENSITY_STRONG = 0.3 (PRs/session); BLOCK_SLOPE_
  STRONG_PCT = 1.5%
- Autoregulation matrix deltas: -2/0/+1/+2/+3 per recovery x performance
  cell
- Peak-week softening: only in the FINAL accumulation week
  (blockAccumWeeks>=3), grade 3->2 for push/hold only
- EXCEEDED_ESCALATION_WEEKS = 3 consecutive weeks; MATRIX_PUSH_CEILING = 3
- DOSE_ESCALATION_MULTIPLIER = 1.5
- Observation windows: calorie 2 weeks; volume-start 2 weeks (both
  training.progress AND recovery.systemic must be GOOD); prescription 3
  exposures; exercise-replacement 3 exposures; structure 4 weeks
- 7-day trend comparator freshness boundary = 14 days
- Photo-corroboration: exactly one confidence-ladder step, never on
  data_hold

**Programme / block lifecycle**
- BLOCK_PLANNED_WEEKS = 6 (5 accumulation + 1 recovery)
- EPOCH_REVIEW_BLOCKS = 3 consecutive same-structure completed blocks
- EPOCH_CONTINUITY_SIMILARITY = 0.6 (Jaccard)
- REBUILD_MIN_CHANGED_SLOTS = 3 (absolute floor)
- REBUILD_CHURN_RATIO = 0.4 (40%)
- swappedAwayCount >= 2 -> REPLACE
- Signal thresholds (blockAdvisor detectSignals): energy<=1 high/<=2
  medium; soreness>=4 (2 consecutive) high, else medium; sleep<5.5h high/
  <6.5h medium; readiness z<=-1.5 high/<=-1.0 medium (baseline weeks 2-8,
  >=2 points); recentPoorCount(readiness<45)>=2 -> sustained_fatigue
- Next-block recommendation: highSignals===0 && avgReadiness>=60 ->
  repeat; highSignals<=1 || avgReadiness>=50 -> adjust; else
  consider_rebuild; 14-day check-in recency window
- Masters (age>=40) threshold halving: deload trigger 2->1 high signal,
  heads-up 2->1 medium signal
- hasEnoughHistory gate: checkins.length>=2 AND blockStatus.currentWeek>=2
- interBlock.js: PERF_UP_PCT=1.5%, PERF_DOWN_PCT=-1.5%, SORENESS_HIGH=4,
  JOINT_HIGH=3, READINESS_SLOPE_POOR=-0.3, SLEEP_FLAG_WEEKS=2,
  RECOVERY_EXCESSIVE_WEIGHT=2 (weighted sum of up to 4 signals at +1 each),
  ADHERENCE_FLOOR=0.6, MIN_EXPOSURES=4, MIN_RECOVERY_POINTS=4,
  CONFIDENCE_FLOOR=0.6, STALE_EVIDENCE_WEEKS=4; proposedRecoveryDays =
  10 (persistent>=2 && anyStrained) else 7

**Volume**
- VOLUME_LANDMARKS: per-muscle mev/mav/mrv table (16 muscles; e.g. chest
  6/14/22, back 10/16/25, quads 8/14/20 — see algorithms.js:25-59 for the
  full table)
- getVolumeStatus bands: <mev below; <=mev+2 minimum; <=mav optimal;
  <=mrv near_mrv; else over_mrv
- shouldDeload: score>=50/100 (performance drop 50 pts alone at
  recentReps<earlierReps-2; joint>=1.5avg && weeksSinceDeload>=3 -> +18;
  overMRVWeeks>=2 -> +12; highSorenessWeeks(avg>=2.5)>=3 &&
  weeksSinceDeload>=4 -> +20)
- computeAdaptiveDecision: joint>=3 override; soreness===4 -> -1 set;
  soreness<=2 && performance<=2 && pump===1 -> +2 sets; else +1 set in
  that quadrant
- computeAdaptiveLandmarks: requires >=3 data points; ±4 sets adjustment
  ceiling; last 8 points used
- computeSessionAdjustments: HOURS_72 (trained-within window), DAYS_4
  (check-in freshness), DAYS_14 (feedback staleness for adds); revert
  memory >=2 -> hold; per-session cap = 2 nonzero-delta exercises
- ABSOLUTE_WEEKLY_SET_CEILING = 30 (last-resort backstop when mrv AND mav
  both missing)
- REPEATED_SWAP_MIN = 3 (also used for evidence maturity)

**Recovery**
- READINESS_RULES.below_par: setDelta=-1, loadFactor=0.95 (5% trim,
  rounded down to 0.25)
- Deload prescription: 50% reps both halves; 50% weight in second half
  only; RIR fixed 4
- evaluateAutoReg (DEAD): deload_now at -50%, reduce_volume at -20%/-15%,
  various 1-5/1-3 scale thresholds (see T-RECOVERY-05)

**Performance**
- calculate1RM: reps clamped at 20; r<=10 blend 0.6 Epley/0.4 Brzycki;
  r>10 pure Epley
- PR margin: 1.001 (0.1%)
- Plateau: >=3 eligible sessions to run; 4-session window (3
  comparisons); consecutiveStalls>=2 to qualify; PLATEAU_MIN_WEEKS=3;
  PLATEAU_MIN_SPAN_DAYS=14; PLATEAU_MAX_GAP_DAYS=14;
  consecutiveStalls>=3 -> swap_exercise, ===2 -> change_rep_range
- Progression consistency: gains >= ceil(comparisons/2) -> progressing

**Live prescription (Campaign 20)**
- ±2-rep noise floor (implicit: adjustWeaker fires at <band.min or
  >=3-below-expected; adjustStronger fires at >=band.max+2)
- repsMax+2 overshoot threshold (adjustStronger)
- 2-of-3 back-off agreement at ratio<=0.95, agreeing within 0.05
- 45-day recency bound (FORTY_FIVE_DAYS_MS)
- 50% band-overlap comparability threshold
- 10% outlier discount (session top e1RM < median*0.9)
- 5% load-increment cap, 0.25 rounding grid, 0.25 floor
- Layoff >7 days -> ×0.9 senior multiplier; block-finished -> cap only,
  no multiplier
- Consecutive-miss DROP: 2 consecutive comparable sessions missing
  repsMin at the top load

**Session / slot**
- REPEATED_SWAP_MIN = 3 (repeated default candidate, evidence maturity)
- ESTABLISHED_SESSIONS = 4
- MATURITY_WEIGHT: NONE=0, EMERGING=0.5, ESTABLISHED=1
- evidence "sufficient": sessions>=2 OR repeatedChoice>=3
- recencyWindowMs default = 45 days (trainedRecently)
- Time Crunch: 30% rest reduction (applyTimeCrunch, caller unconfirmed)

---

## SUSPECTED-CONTRADICTION / DEFECT LOG

1. **Two independent autoregulation engines with different thresholds,
   only one wired to a screen.** `mesocycle.js:212 evaluateAutoReg` (1-5/
   1-3 scale, -50%/-20%/-15% actions) has NO production screen caller
   (grep-confirmed); `algorithms.js:545 computeAdaptiveDecision` (1-4
   scale, delta -1/0/+1/+2) IS wired via `WorkoutSummaryScreen.js:575`.
   Both claim to answer "should volume change based on recent
   fatigue/performance signals" but score on different scales and
   produce different action vocabularies. Not confirmed as a live bug
   (evaluateAutoReg may be a deliberate retained-but-unused module like
   `getCurrentMesoWeek`), but unlike `getCurrentMesoWeek` it carries NO
   "retained despite zero production callers" comment justifying its
   survival. Recorded as SUSPECTED-DEFECT (dead-code candidate,
   `T-RECOVERY-05`) for founder/D37 triage, not fixed.
2. **REBUILD_PROGRAMME churn-ratio historical near-miss (now fixed in
   current code, flagged only for scenario coverage).** The current
   `programmeVerdict` code (`programmeEpoch.js:382`) enforces
   `REBUILD_MIN_CHANGED_SLOTS = 3` as an absolute floor before the 40%
   churn ratio is even consulted, per the founder's explicit rule ("do
   not call something REBUILD_PROGRAMME if only one/two slots changed").
   The in-code comment documents that the PRE-fix version violated this
   (a 2-of-4-slot 50%-churn change on a small programme used to read as
   REBUILD). Current code appears correct; recorded as a scenario-writer
   note (`T-PROGRAMME-05`) rather than a live contradiction, since no
   evidence was found that the fix is incomplete.
3. **`_timeCrunchSkipped` consumer (`applyTimeCrunch`) has no confirmed
   screen caller** while the flag it produces is read live in
   `ActiveWorkoutScreen.js` via `workoutHelpers.shouldConfirmBeforeFinish`
   (`T-SESSION-04`). Either a different function sets the flag, or the
   grep in this pass missed an indirect call path (e.g. through a
   store action or a differently-named wrapper). Not asserted as a
   defect — flagged for a targeted follow-up grep before Step 9 treats
   Time Crunch's trimming logic as fully traced.

No genuine contradiction between two BINDING LAWS (e.g. CLAUDE.md Section 2
inviolables vs production code) was found in this pass. The one law
explicitly named in the mission — "5 accumulation weeks + week 6 recovery"
— is CONFIRMED live and singly-sourced (`T-PROGRAMME-01`), not contradicted
anywhere in the traced graph.

---

## LEAD VERIFICATION ADDENDUM (Fable, same day)

Closing two of the three open flags above with direct grep evidence:

- **T-LIVESET-04 CONFIRMED PRODUCTION**: `detectLoadOverride` /
  `detectRepsOverride` are called at `ActiveWorkoutScreen.js:2015-2016`
  (handleCompleteSet, against `presentedPrescriptionRef`), imported at
  :68-69. Flag closed.
- **T-SESSION-04 producer CONFIRMED**: `applyTimeCrunch` is imported at
  `ActiveWorkoutScreen.js:91` and called at :2632 (starter/time-crunch
  trim). The `_timeCrunchSkipped` write sites remain the two pinned by
  `ActiveWorkoutScreen.verticalLogger.guard.test.js` (write-count === 2).
  Flag closed.
- **T-RECOVERY-05** (`evaluateAutoReg`/`predictDeloadWeek` dead-code
  candidate) remains OPEN for D37 triage — recorded on the taskboard at
  campaign close; NOT fixed in this campaign (mention-don't-fix law).
