# CAMPAIGN 24 — WHOLE-APP UX / LOGIC / PRESENTATION COHERENCE SWEEP

Founder order 2026-08-17. Baseline: main `e5319811` (verified exact).
Branch: `claude/campaign24-whole-app`. One programme, one final merge.

## Standing constraints (from the order, binding)

- ActiveWorkout: FOUNDER_ACCEPTED / NO_DEEP_REAUDIT. Touchable only for
  shared-component correctness, direct regressions, or global token
  repairs that do not change the approved logger UX.
- Home/Today (C22) and Progress root (C23): reference-quality baselines.
  Shared style corrections, bug/unit/copy/accessibility fixes only;
  their locked hierarchies are not reopened without a concrete
  contradiction.
- C20 prescription and C21 coach graph: authoritative. The cross-screen
  authority audit hunts for any surface still deciding
  load/reps/sets/volume/deload/recovery/calories/macros independently
  (classes C/D/E are defects).
- Logic first, IA second, presentation third. No feature sprawl. No
  founder interruptions except genuinely undecidable, materially
  consequential forks (recorded in FOUNDER-RULINGS, work continues).
- Waves commit individually after lead review; merge to main only after
  all waves + global cohesion pass + hostile review + full gates.

## Wave plan (adjusted to the real ProgressStack/RootNavigator graph)

- WAVE A — Train/Programme: Plans, PlanDetail, RoutineDetail,
  ManualBuilder, MesocycleBuilder, PlanLibrary, BuildWorkout,
  FreeStarter, WorkoutSummary (edit mode), block/decision flows.
- WAVE B — Nutrition: Diary, MealPlan, FoodSearch, AddCustomFood,
  saved meals/recipes, calorie bank surfaces, nutrition history.
- WAVE C — Coach/Check-in: You, WeeklyCheckIn, CoachOutput,
  CoachReview, CoachHeldHistory, Methodology, WeeklyStory,
  AthleteProfile, coaching settings.
- WAVE D — Progress detail: BodyMetrics (incl. the recorded
  WeightTrendCard kg literal), ProgressPhotos, LiftProgress,
  Consistency, VolumeHeatmap, WorkoutHistory, WorkoutSummary
  (read-only), ExerciseDetail, YearOfLifts/Recaps, Partners,
  ShareCard.
- WAVE E — Onboarding/Auth/Consent: login/signup, startup resolution
  (incl. the known auth-hydration flash — product law: neutral splash
  until auth + routing resolve), onboarding, consent/Article 9, trial
  entry, ProUpgrade/paywall surfaces.
- WAVE F — Profile/Settings: all Settings* screens, account,
  subscription, notifications/reminders audit, privacy, display.
- WAVE G — Secondary/modals: everything reachable not covered above.

Then: global cohesion pass → hostile review → final gates → merge.

## Working records

- FINDINGS-LEDGER.md — per-screen findings, classification, action.
- CROSS-SCREEN-AUTHORITY-FINDINGS.md — the old-decision-logic hunt.
- GLOBAL-COHERENCE-DECISIONS.md — post-wave consolidation decisions.
- FOUNDER-RULINGS.md — only genuinely undecidable forks (target: zero).
- FINAL-LANDING.md — the 33-section handover at close.
