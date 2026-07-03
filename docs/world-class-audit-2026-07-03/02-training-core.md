# Track 2: training core loop

TAP ECONOMY: repeat set 1 tap (matches Hevy/Strong); stepper 1 (per-exercise increments,
best-in-class); add exercise 2; swap 2 (ranked); edit logged set 2; finish 3; rest ±15s
1; SESSION START = FORCED 2 (intent modal every time, no remember-skip). Plan creation:
targets read-only in ManualBuilder (must save then re-edit in RoutineDetail); library
plan activation = two stacked native Alerts.

FINDINGS RANKED:
1. S-M: forced intent modal every session start (HomeScreen 1960-2024) — add
   remember-skip or inline chip row (flag: feeds readiness/sessionAdjustments, review
   with COMP-008/B2 owner).
2. S-M: ManualBuilder targets are static text (616-618) — port BuildWorkoutScreen's
   existing steppers (90-105).
3. S: LiftProgress has NO search, sorted by lastTrainedAt (290-386).
4. S: latestWeight/latestE1rm computed (liftProgress.js:89) but never rendered — "last
   time: X kg × Y" headline is free. Biggest return-experience win.
5. M: supersets read-only outside ManualBuilder create flow (RoutineDetail 309-311) —
   library/coach plans can never gain one.
6. S-M INTEGRITY: builder allows 3+ exercise supersetGroupId but live session pairs only
   adjacent two (ActiveWorkout 450-456) — giant sets silently break mid-session. Cap at
   pairs (S) or scan contiguous run (M).
7. S/L: no drag reorder (chevron mode = 6 taps for 4 slots); drag needs gesture-handler
   check (likely already installed — reanimated is).
8. S: WorkoutHistory exercise rows not tappable → no jump to ExerciseDetail (367-376).
9. S: 1.8s silent auto-advance after target hit (1234-1242) — visible countdown/cancel.
10. S: plan activation stacked native Alerts → app bottom-sheet idiom.
11. S-M: no duplicate day/routine anywhere (PPL/upper-lower ×2 = full manual re-entry).
12. M: no per-exercise personal notes (additive migration; Hevy parity).

ELEVATION: last-time headline (from #4); drag reorder; unify the three plan-authoring
surfaces' capabilities; fix giant-set breakage; inline readiness row; tappable history
rows + lift search; duplicate day; personal notes.
