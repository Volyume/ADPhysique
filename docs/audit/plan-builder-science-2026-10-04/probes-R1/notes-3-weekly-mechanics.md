# R1 notes 3: how sets change after the plan exists (OBSERVED)

## Two separate stores of "sets"
A) routine_exercises.recommended_sets : written ONLY at generation (planAutoGen.js:1091-1102 addExerciseToRoutine(...ex.sets...)) and by the athlete's manual edits (RoutineDetailScreen.js:589-605 updateRoutineExercise; database.js:4976-5005). No automated writer afterwards (grep: updateRoutineExercise callers = RoutineDetailScreen only).
B) planned_muscle_volume (per week per MUSCLE): seeded at block activation: database.js:5925-6030 generateInitialPlannedVolume: template = Math.round(mev + (mav-mev)*progress), progress=i/(totalAcc-1), totalAcc = 5 accumulation weeks (weeks 1-5), deload (week 6) = mev; uses VOLUME_LANDMARKS (algorithms.js:25-59) NOT the individualised computeLandmarks. Seeded ramp (block 2+): blockLedgerGather.buildSeededWeeklyTargets (:486-501) linear start->peak, deload = deloadSets ?? mev. Rows: source 'template' | 'seed_*' | 'coach' | 'reintroduction'. mrv column clamp band for computeVolumeApply.
   Block shape: BLOCK_PLANNED_WEEKS=6, deload week 6 (mesocycle.js:28-29), rir ladder [3,2,1,0,0,4] (database.js:5361).

## Serve time scaling (FQ-4, D96, register ruling 2026-08-10)
- coachApply.computeWeeklySessionAllocation (coachApply.js:335-351): served = max(1, Math.round(recommended_sets * (weekPlanned[muscle] / baselinePlanned[muscle]))) ; baseline = block's week-1 planned row; factor 1 if any missing/zero. NO per-exercise cap, NO exercise added, NO redistribution; per exercise independent rounding (half up).
- Caller: sessionAdjustments.getSessionWeeklyAllocation (sessionAdjustments.js:48-73) <- ActiveWorkoutScreen.js:631-640 (weeklyAllocation) -> comp015SetCount (:1144) / readiness (:1174) -> adjustedSetCount (:1176) -> targetSets (:4168).
- Documented elsewhere: docs/injury-disability-audit-2026-08-28/DESIGN-RULING.md:76-80 "the FQ-4 allocator scales existing entries with no per-entry cap".
- plan-B-weak-point-sets.md:133 (2026-07-09) says progression cannot stack sets onto routine rows: STALE vs FQ-4 (2026-08-10).

## Check-in volume apply
- weeklyCoach.autoregulationMatrix (weeklyCoach.js:~395-419): deload -2 (recovery 4 or (rec>=3 and perf>=4)); hold 0 (rec 3 or perf 3); push +3 (rec 1 & perf 1), +2 (either 1), +1 (both 2). exceeded escalation (:2200-2230) +1 up to MATRIX_PUSH_CEILING 3. safety hold zeroes pushes (:1255-1270).
- CoachOutputScreen.handleApplyTraining (:1322-1396): rows = getPlannedMuscleVolume(nextTrainingWeekId) ; changes = computeVolumeApply(rows, delta, holdMuscles) ; applyCoachTrainingAdjustmentAtomically (database.js:9871) writes ONLY the next week's rows (source 'coach').
- computeVolumeApply (coachApply.js:269-310): every row: next = current + delta clamped [mev, mrv]; muscles held for capability/soreness skip increases; no per-exercise logic; rows for muscles with no exercises (front_delts, forearms, adductors, neck, tibialis) also change (inert at serve because baseline 0 -> factor 1).
- Card label: CoachOutputScreen.js:411-415 "Add N set(s) to each muscle group" / "Pull back N set(s) per muscle group" / "Volume stays the same"; footnote :~470 "These are next week's planned sets. Each session can still adjust them on the day."
- Sessions after next week: rows untouched (template or earlier seed).

## Session +1 (COMP-015)
- algorithms.computeSessionAdjustments (algorithms.js:1263-1457): only FIRST exercise per muscle in the session (:1293-1303); +1 when lastTrainedAt within 14d (:1385-1388), lastPerformance<=2, lastPump<=2, projectedPlanned<mav (projectedPlanned = doneThisWeek[muscle] + THAT exercise's plannedSets :1331-1333), !addedThisWeek, no safety hold, weekly signal != reduce, projectedPlanned+1 <= mrv and <= mav (:1394-1403). Max 2 adjusted exercises per session (:1448-1456). Silent in deload (:1273). Drop -1 on residual soreness (R2). landmarks passed = computeAdaptiveLandmarks(history) (sessionAdjustments.js:131).
- No cap per exercise. plannedSets fed = allocation (week-scaled) else static.
- Gated: appliedGovernsWeek (sessionAdjustments.js:146-149) volumeSignal only counts if a coach row for the week exists.

## Other writers of planned_muscle_volume
- capability/reintroduction.js:60-110 (source 'reintroduction'): ramps a released muscle back to the block's own peak.
- computeDeloadVolume (coachApply.js:175-200) via handleApplyDeload (CoachOutputScreen.js:1405-1460): early deload row = max(deloadFloor(mev)=max(1,round(mev*.5)), round(min(peak,current)*share%)) share=60-5*strain (min 40).
- WorkoutSummaryScreen adaptive engine (runAdaptiveEngine algorithms.js:1111-1135) only records adaptation_events (WorkoutSummaryScreen.js:1079-1108), does not write planned rows.

## Probe results (scratch, replicas) - d4 typical plan (general, intermediate, full_gym, 60 min)
- Template ramp week1..5 chest 6 8 10 12 14 (deload wk6 = 6). Exercise sets served: Barbell Bench 3 4 5 6 7; Lat Pulldown (Close Grip) 5 6 7 8 8; B-Stance Hip Thrust 3 5 7 9 11 ; Ab Rollout 3 5 8 10 12 ; B-Stance RDL 3 4 5 6 7 ...
- Max sets on one exercise in one session: d3 14 (B-Stance Hip Thrust wk5), d4 12 (Ab Rollout wk5), d5 12.
- Weekly SERVED muscle totals exceed planned when generator base != template week-1 (abs planned 16 vs served 24 wk5; glutes planned 14 vs served 22; traps).
- Coach +3 on week 3 rows: every muscle row +3; served chest exercises 3->7 each (planned 13, served 14), lat pulldown 5->8, glute hip thrust 3->9, ab rollout 3->10.
