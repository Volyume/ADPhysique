# R1 interim notes (planEngine.js, planAutoGen.js) - OBSERVED line refs

## Call chain (generation)
- planAutoGen.buildPlanInputs (97-131) -> profile -> {experience,daysPerWeek,sessionLengthMinutes,equipment,goal,phase,weakPoints(planWeakPoints),recoveryRating,nutritionPhase,age}
- generateAndSavePlan (959-1208): getAllExercises, loadGenerationIntent, filterLibraryForGeneration, readDemonstratedStructure(structureMemory, 190-234), style pool, generatePlan (1017), withContinuity (1052), resolvePlanAgainstLibrary, createProgramme/createRoutine/addExerciseToRoutine(...ex.sets...) 1085-1103, then activatePlanWithBlock (1159) or activatePlanKeepingBlock (1155), archiveOtherUserPlans
- generatePlanDryRun (1225-1353) read-only twin
- planEngine.generatePlan (3189) -> _generatePlanInner (3222)
  - effectiveDays clamp 2..6, beginner cap 4 (3267-3270)
  - matrixCell = DIVISION_MATRIX[goal][effectiveDays] (3289) else selectSplit (1932) / memorySplit (3317)
  - landmarks = computeLandmarks(experience, recoveryRating, nutritionPhase, age) (133-154) via EXP_MULT/REC_MULT/NUT_MULT/ageMultipliers (99-127). MEV adj, MRV adj, MAVlow = MEV+2, MAVhigh = max(MAVlow, MRV-1)
  - weeklyTargets[m] = lm.MEV (week-1 start) (3329-3332)
  - applyGoalOverlay (160-275): division overlay (priority mult>1 -> MAVlow + frac*(MRV-MAVlow), frac=min(1,(mult-1)/0.6)), phase overlay, weak_point phase additive (bonus = max(2, round((mrvCap - t)*0.7)), offset trim to MV), clamp 110% MRV, systemic cap = totalMRV * (0.40 | 0.34 if <=3d non-matrix)
  - enforceWeeklyFloorsAndCaps (371-522): structural floors (chest,back,side_delts,quads,hamstrings,glutes) maintenance 6 (4 if <=3d); overlay>=1 -> MEV floor; indirect synergist trim (biceps 0.4*back, triceps 0.5*chest, glutes .3 quads + .4 hams); MRV cap via divisionMRV (glutes 30 for raised ceiling); delt combined cap 26; 2-day glute floor
  - builders: full_body (2048), upper_lower (2089), upper_lower_wp (2278), lower_focus/balanced_ul = buildWeightedUpperLower (2119), ppl/ppl_ab (2190), DIVISION buildFromMatrix (2568)
  - clampDeliveredToMRV (992-1031)
  - computeStructuralFloors (1297-1337)
  - fitToTimeBudget (timeConstraint.js) 3459
  - trimToTimeBudget (1072-1265) per session: MAX_EXERCISES_PER_SESSION 8, MAX_WORKING_SETS_PER_SESSION 25 (1068-1069), min 3 sets/entry
  - D201 sequenceSessionsForRecovery (3548) reorders sessions; reletterByPosition (808)
  - buildDivisionCoverage, buildVolumeSummary (2650), buildWhyThis (2768), whyThis.sequencing (3606)

## Constants (planEngine.js)
- CAP_COMPOUND=4, CAP_ISOLATION=3 (1445-1446) per-exercise cap; MIN_SETS_PER_ENTRY=3 (1447); capForEntry (1448)
- numExHint = max(1, ceil(sessionTarget/CAP_COMPOUND)) (1462)
- sessionCap per muscle per session: 8 normal / 12 weak-point (2020); sessionTarget = min(sessionCap, round(wTarget/sessions)) (2021)
- makeEx minSets: 3 compound (heavy/mod), 2 otherwise; sets = max(minSets, sets) (934, 943)
- relax rule: if totalCapacity < sessionTarget the last entry takes the shortfall (1853-1857) - only place a single entry exceeds 4/3 in generation
- growth loop adds exercises while sum(caps) < sessionTarget and sessionTarget >= 3*(n+1) (1800-1810)
- INDIRECT_SET_FRACTION = 0.5 (337); SIDE_REAR_DELT_CAP=26 (332)
- STRUCTURAL_SESSION_FLOOR_CAP=6, WEAKPOINT_SESSION_FLOOR_CAP=9 (1295-1296)
- HIGH_FATIGUE_COST 4, STACK_LIMIT 2 (1925-1926)
- WEAK_POINT_MAP (61-78) cap 3 weak points (3245)
- SUBREGION_REQUIREMENTS (846-893)
- sessionsPerMuscle: full_body: max(1, min(days, round(t/5))) (2062); upper_lower: all 2 (2098-2099); PPL 3d:1; 5d push/pull 2 legs 1; 6d all 2 (2198-2207); weighted UL: sliceFreq (2144-2149) ; matrix: count of sessions listing muscle + augmentation (2597-2621) desired=min(3,sessions, max(2,ceil(wTarget/9)))
- WP day (buildWeakPointDay 2239): target = max(MEV, MRV-2) for weak muscles, session cap...

## Day-count splits (selectSplit 1932-1993)
- 2d full_body; 3d full_body (ppl for advanced/competitive, lowerFocus full_body); 4d upper_lower; 5d: weak_point_spec->upper_lower_wp, lowerFocus->lower_focus, legJudgedBalanced->balanced_ul, else balanced_ul; 6d lower_focus or ppl_ab. Clamp 2..6.
