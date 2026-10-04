# R1 notes 2: order of sessions + every next-session suggestion/override (OBSERVED)

## Build-time order
- planEngine.js:3532 unsequencedWorkouts -> 3548 sequenceSessionsForRecovery(unsequencedWorkouts,{daysPerWeek:effectiveDays, recoveryRating, rirTarget: PLAN_OPENING_RIR (recovery/constants.js:383 =3), exerciseById: buildExerciseByIdForRecovery()})
- 3565 validWorkouts = reletterByPosition(recoverySequenced.workouts)
- sequenceSessions.js: lead session (workouts[0]) never moves (header 50-58, 474-481); permutes rest (n-1)!; guard n>7 (153, 455); penalty (322-348): per muscle circular consecutive qualifying pairs (QUALIFYING_SETS=2 primary sets, :149), T = recoveryHours(muscle,{sets: source dose, recoveryRating, rirTarget}) (:332) NO personalFactor, no firstWeek, no ratings; underRecovered = max(0,T-gap)^2 ; overRecovered = 0.25*max(0,gap-2T)^2/24; adjacency clash CLASH_PENALTY_BASE 1e6*(1+(overlap-0.5)) if overlap>0.5, LINEAR only (:343-345); gap layout TYPICAL_WEEK_GAP_HOURS[n] (constants.js:385-393): 2:[72,96] 3:[48,48,72] 4:[24,48,24,72] 5:[24,24,24,24,72] 6:[24x5,48] 7:[24x7]; tie keeps original order (TIE_TOLERANCE 1e-9, :173,:484)
- describeSpacing (523-540) -> whyThis.sequencing (planEngine.js:3605-3606) "Assuming a usual N-day week, sessions are ordered to leave about H hours before the next session that trains the X."
- NOTE: the whole-week order is optimised against a TYPICAL calendar-week gap prior (assumes Mon/Tue/Thu/Fri etc) -- stored plan has no days, but the scoring assumes a gap layout. Sequencer does not use habitual days, not learned speed.

## Runtime order authority
- Programme order = routines.position (blockProgression.requiredSessions :202-216); nextOutstandingSession (:305-309) = first OUTSTANDING by `order` ; resolveProgrammePosition (programmePosition.js:97-226) (position.nextSession :192)
- Permanent reorder: PlanDetailScreen.handleMoveDay (:285-331) chevrons + handleReorderWorkouts (:342-362) drag -> database.updateRoutinePosition (database.js:5191)
- Temporary out-of-order: blockProgression.js header lines 198-201 "a temporary out-of-order execution does not renumber"

## Places that suggest/allow a different next session than the plan's own next
1. recoveryRecommendation: nextWorkoutRecommendation.recommendNextWorkout (:249-341). Rule (header :19-28; code :302-325): recommended set only when programmeNext verdict at PROJECTED time == 'not_yet' AND another OUTSTANDING session verdict 'ready' at projected time AND it has <2 planned sets on programmeNext's limiting muscle (:313-318); best minPercent wins (:320-323). reason text (:218-230) "<Next> is next in your plan. <Muscle> are estimated N% recovered, ready by <day>. <Other> is estimated ready now."
   Callers: HomeScreen.loadRecoveryRecommendation (HomeScreen.js:1478-1550; call :1509); ReadinessCards.load (:733-775; call :755)
2. HomeScreen: recoveryOverride (HomeScreen.js:1998-2004) = recommended session becomes hero primary; displayWorkout = selectedWorkoutOverride || recoveryOverride || nextWorkout (:2005); "Keep <name>" (:2067-2078, UI :2989-3000), kept flag stored @volyume_recovery_kept_<user> keyed routineId+dayKey (:191, :1528-1537); heroRecoveryLine (:2096-2104)
3. HomeChangeWorkoutSheet (components/HomeChangeWorkoutSheet.js): "Choose a different workout" list of every plan routine (:136-191), "Next up" badge = programme order (:145,:183-187), per-row recovery line (:41-43,:177-181), "View workout", "Blank workout" (:101-118), "Skip this workout" (:119-135, "Just this once, not the whole plan."). Opened by Home "Options" (HomeScreen.js:3055-3064; sheet :3411).
4. Skip: HomeScreen.handleSkipThisWorkout (:1560-1600) -> recordSessionResolution 'skipped_by_user' ; blockProgression.skipConfirmation (:380-390)
5. ReadinessCards (Recovery screen): buildNextWorkoutSentence (:337-366) shown at :982; buildStillToDoRows (:375-404) "Still to do this plan week" (:985)
6. progress planWeek (lib/progress/planWeek.js:178-224): subline "<weekWords> · <Name> is next" from position.nextSession (programme order only)
7. WorkoutSummaryScreen "Next up: <name>." (:1754-1757) from resolveNextSession (:362-372) (programme order only)
8. PlansScreen.handleStartNextWorkout (:828-862) starts position.nextSession (programme order)
9. widgets/writer.js:45-61: nextSession.name = routines[0]?.name (ALWAYS the first routine; not programme next) -> OBSERVED inconsistency
10. nextLikelyTrainingTime (recovery/nextLikelyTrainingTime.js:55-87): projection = next habitual weekday at typical start minute; with no habit = now
