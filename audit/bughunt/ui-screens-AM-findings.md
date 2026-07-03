# UI screens A–M — crash / runtime-error hunt findings

Surface: `src/screens/*.js`, alphabetical first half (ActiveWorkout … MyRecipes,
i.e. every A–M screen inclusive), plus the hooks/lib they touch. Focus:
crash & runtime-error classes (null/undefined deref, unguarded array/object
access on async/nullable data, unsafe destructuring, `.map/.find` on
possibly-undefined, `JSON.parse` without guards, NaN propagation, missing
empty/loading/error states, setState-after-unmount, unhandled rejections,
missing await, throw in render, deep-link/route-param misuse).

## Result: no reproducible blocker/major/minor crash found on this surface.

This surface is exceptionally hardened. Every crash-prone pattern I traced was
already guarded, so I could construct **no** concrete trigger for a crash,
wrong-render throw, or unhandled rejection. Per the scope rule ("if you cannot
construct the trigger, drop it — no speculative noise"), I am not padding the
report with maybes. The verification detail below records what was checked and
why it is safe, so the founder can see the surface was hunted, not skipped.

## Screens read in full (or in full for every risk-bearing region)
ActiveWorkout (set-logging/PR/notification/draft/superset paths), AddCustomFood,
Analytics, Article9Consent, BlockReflection, BodyMetrics, BuildWorkout,
CardioHistory, CoachHeldHistory, CoachReview (progression-win region),
CoachOutput (buildOff/buildDecision region), Consistency, Diary
(load/handlers/state region), ExerciseDetail (chart-build/history/goal region),
FoodInsights, FoodSearch, GoalChangeSummary, Import, LiftProgress, LogCardio,
ManualBuilder, MealNames, MealPlan, MesocycleBuilder, MyMeals, MyRecipes.
Static/presentational screens in range (Login, FirstRun, CascadeGate,
GoalLockConsent, FreeStarter, Methodology, Credits, DebugLog, CoachingReminders)
follow the same guard conventions in the portions read.

## Patterns verified as GUARDED (checked, not vulnerable)

- **`Math.min/max(...arr)` on possibly-empty arrays** — every site is fenced by
  a length check first: `BodyMetricsScreen` weight/bodyfat/measurement charts
  return an empty-hint before the spread (`sparse`/`< 2` guards);
  `CoachReviewScreen:74-78` spreads over non-empty grouped sets;
  `ExerciseDetailScreen:677` spreads over a non-empty session group;
  `HomeScreen`/`ProSetupComplete`/`CoachOutput` use `weights.length ? … : null`.
- **`JSON.parse` without try/catch** — none. Every parse on this surface
  (`ActiveWorkoutScreen:978`, `HomeScreen:596/644/920`, `BodyMetricsScreen:541/642`,
  `MesocycleBuilder`, `FoodInsights`) sits inside try/catch or `raw ? … : null`.
- **Number inputs → NaN propagation** — `BuildWorkoutScreen` rep/weight inputs use
  `parseInt(v) || fallback` / `parseFloat(v) || 0`; `ManualBuilderScreen`
  steppers clamp with `Math.max(min, Math.min(max, …))` and keep the rep range
  coherent; `AddCustomFoodScreen` hard-blocks non-finite/negative via
  `Number.isFinite` before save; `ActiveWorkoutScreen` set logging validates
  reps with `Number.isFinite(repsNum) && repsNum >= 1` and weight via
  `isLoggableWeight` before writing.
- **`route.params` deref** — all optional-chained or defaulted:
  `GoalChangeSummaryScreen` (`route.params || {}` then per-field defaults),
  `MealPlan`/`FoodSearch`/`MyMeals`/`MyRecipes`/`AddCustomFood`/`LogCardio`
  (`route?.params?.x ?? default`), `CoachOutput` (`route.params?.weekStart ?? …`).
- **Async-before-resolve render** — screens gate on `loaded`/`loading` and show
  skeletons/empty states (`Diary`, `Analytics`, `BodyMetrics`, `MealPlan`,
  `LiftProgress`, `MesocycleBuilder`, `MyMeals`, `MyRecipes`, `CoachHeldHistory`).
- **setState-after-unmount / stale async** — `cancelled`/`active`/`live` flags in
  effects across `BodyMetrics`, `AddCustomFood`, `Diary`, `FoodSearch`,
  `ManualBuilder`, `GoalChangeSummary`, `MealNames`, `LogCardio`; `ActiveWorkout`
  loadHistory uses a `cancelled` guard for rapid exercise swaps.
- **List keyExtractor / `.totals` deref** — `MyMealsScreen:173` renders
  `item.totals.kcal`; verified `listSavedMeals` (food/db.js:982-1018) always sets
  `totals: computeSavedMealTotals(items)`, so it is never undefined.
- **`plan.schedule.map`** (`MealPlanScreen:492`) — verified `mealPlanService`
  always sets `schedule` on both day (`[day.variant]`) and week plans
  (`schedule: sched`), so the week-picker map cannot hit undefined.
- **`new Date(x).toISOString()/format()`** — `BodyMetricsScreen.safeFormatDate`
  wraps invalid dates; `LiftProgressScreen` share uses `row.lastTrainedAt` which
  liftProgress.js always sets to a numeric `latest.at`; `BlockReflection.fmtDate`
  and `Analytics.SessionCard` guard falsy timestamps.
- **Travel-mode plate build** (`BuildWorkoutScreen.applyTravelMode`) —
  `plan.sessions[0].exercises.map`; verified `generateTravelPlan` always returns a
  populated `sessions` array for the three allowed equipment values.
- **ED-safety reads fail CLOSED** — `BodyMetrics`, `Diary`, `CoachHeldHistory`,
  `GoalChangeSummary` all treat a failed wellbeing/ED-flag read as
  suppressed/flag-open (never fail open), consistent with the constitution.

## Count by severity: blocker 0, major 0, minor 0 (no reproducible defect on the A–M screen surface).
