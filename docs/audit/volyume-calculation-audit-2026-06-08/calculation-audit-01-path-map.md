# Calculation Audit 01 — Path Map (onboarding vs Update Your Plan)

Date: 2026-06-08. Source: live code at HEAD `313856f`.
Method: every function below was read in full before any conclusion was drawn.

## Files in scope

| File | Role |
|---|---|
| `src/lib/nutritionEngine.js` | The single calorie + macro engine. `calculateNutritionTargets(inputs)`. |
| `src/lib/coachingGoals.js` | Maps days→activity, phase→nutrition goal, protein defaults. |
| `src/screens/ProOnboardingScreen.js` | Onboarding wizard. Builds inputs, calls the engine, saves profile + targets. |
| `src/screens/ProGoalSetupScreen.js` | "Update your plan". Re-reads profile, calls the engine, saves targets. |
| `src/screens/NutritionTargetsScreen.js` | Manual recalc (reference flow, correct). |
| `src/store/useAppStore.js` | Holds `userProfile` (free-form object, AsyncStorage-backed). |
| `src/lib/sync/tables/profiles.js` | Cloud sync map (7 fields only). |
| `src/lib/database.js` | `logBodyMetric`, `getBodyMetricLog`, `getMorningWeightsLast14Days`. |

## The engine (shared, single source)

`calculateNutritionTargets(inputs)` — `nutritionEngine.js:554`.
Both flows call THIS function. Requirement 1 ("single calculation function") is
already met at the engine level. The divergence is in the **inputs each flow
hands it**, not the formula.

Key engine behaviour:
- `calcBMR()` (`:380`) picks **Katch-McArdle** only when BF% is finite, in range
  (0–60), AND `bodyFatSource` is present and not `'visual'`. Otherwise it uses
  **Mifflin-St Jeor**. (`:381-403`)
- Activity multiplier from `ACTIVITY_MULTIPLIERS[activityLevel]`, default 1.55. (`:601`)
- Protein basis is LBM only when there is a credible LBM (BF% + non-visual
  source); otherwise bodyweight. (`calcProtein:489-508`)
- `experienceLevel` defaults to `'intermediate'` (`:569`) and only scales surplus
  phases (`SURPLUS_EXP_MULT`, `:608-612`).

## Activity multiplier (identical in both flows)

`daysToActivityLevel(daysPerWeek)` — `coachingGoals.js:300`:

| Days/week | activityLevel | multiplier |
|---|---|---|
| ≤2 | light | 1.375 |
| 3–4 | moderate | 1.55 |
| 5 | active | 1.65 |
| 6+ | very_active | 1.725 |

Both flows derive activity the same way, from `daysPerWeek` only. Session length
and experience do **not** feed the multiplier in either flow.

## ONBOARDING flow path

Screen: `ProOnboardingScreen.js`. Collects sex, age, height, weight, BF% + method,
experience, session length, days/week, equipment, recovery, goal (phase),
division (trainingGoal), weak points, protein approach.

Engine call — `ProOnboardingScreen.js:464`:
```
calculateNutritionTargets({
  sex, ageYears: safeAge, heightCm: safeHeightCm, weightKg: safeWeightKg,
  bodyFatPercent: bfNum,                       // parsed, range-guarded
  bodyFatSource: bfNum != null ? bfSource : null,   // <-- PASSED
  activityLevel: daysToActivityLevel(daysPerWeek),
  goal: phaseToNutritionKey(trainingPhase),
  trainingGoal,
  proteinApproach,
});
// experienceLevel: NOT passed -> engine default 'intermediate'
```

Saved profile (`merged`, `:485-511`) stores: sex, age, heightCm, weightKg,
trainingGoal, trainingPhase, goalPhase, daysPerWeek, experience,
sessionLengthMinutes, equipment, recoveryRating, planWeakPoints, proteinApproach.
**It does NOT store `bodyFatPct` or `bodyFatSource`.** BF% is written only to the
`body_metric_log` table via `logBodyMetric` (`:528-534`).

Targets saved to AsyncStorage `@volyume_nutrition_targets` and via
`saveNutritionTargets(user.id, …)`.

## UPDATE YOUR PLAN flow path

Screen: `ProGoalSetupScreen.js`, title "Update your plan". The screen asks for
division, weak points, focus/phase, experience, days/week, session length,
equipment, recovery, protein approach. It does **not** ask for sex, age, height,
weight, or body fat.

Engine call — `ProGoalSetupScreen.js:230`:
```
calculateNutritionTargets({
  weightKg: safeWeightKg,        // latest morning-weight EWMA, else wp.weightKg, else 80
  heightCm: safeHeightCm,        // wp.heightCm, else 175
  ageYears: safeAge,             // wp.age, else 28
  sex: safeSex,                  // wp.sex, else 'male'
  bodyFatPct: wp.bodyFatPct ?? null,   // <-- wp.bodyFatPct is UNDEFINED (never stored)
  // bodyFatSource: NOT PASSED  <-- forces Mifflin even if BF% existed
  activityLevel: daysToActivityLevel(daysPerWeek),
  goal: phaseToNutritionKey(selectedPhase),
  trainingGoal: selectedGoal,
  proteinApproach,
});
// experienceLevel: NOT passed -> engine default 'intermediate'
```
`wp` is the store profile (`:191-192`). Targets saved the same way as onboarding.

## Profile data storage summary

`userProfile` is a free-form object in `useAppStore`, persisted to AsyncStorage by
`saveLocalProfile` (`useAppStore.js:215`). Only 7 fields sync to cloud
(`profiles.js:27`); weight/height/age/sex/experience/days/etc. are local-only —
the same class as the BF fields would be. So adding `bodyFatPct`/`bodyFatSource`
to the profile needs **no migration and no sync-allow-list change**.

No update-flow code clears stored profile data; it spreads `...wp` and overwrites
only training fields.

## Side-by-side discrepancy table

| Question | Onboarding | Update | Same? |
|---|---|---|---|
| Same engine function | `calculateNutritionTargets` | `calculateNutritionTargets` | **Y** |
| Reads body weight | yes (`safeWeightKg`) | yes (latest EWMA / `wp.weightKg`) | Y* |
| Reads body fat % | yes (`bfNum`) | reads `wp.bodyFatPct` which is **undefined** | **N** |
| Reads body fat source | yes (`bfSource`) | **not passed at all** | **N** |
| Reads age | yes | yes (`wp.age`) | Y |
| Reads sex | yes | yes (`wp.sex`) | Y |
| Reads height | yes | yes (`wp.heightCm`) | Y |
| Activity multipliers identical | `daysToActivityLevel` | `daysToActivityLevel` | Y |
| BMR formula identical | Katch-McArdle (BF given) | **Mifflin** (BF + source absent) | **N** |
| experienceLevel passed | no (default intermediate) | no (default intermediate) | Y (both omit) |

\* Weight: update deliberately prefers the latest logged morning weight (this is
intended weight-tracking, not the bug). With no logged morning weight it falls
back to `wp.weightKg`, matching onboarding.

## What the N rows actually use instead

- **Body fat %**: update passes `wp.bodyFatPct`, but onboarding never wrote that
  key to the profile, so it is `undefined` → engine treats BF% as absent.
- **Body fat source**: update never passes it → `undefined` → `calcBMR` cannot
  select Katch-McArdle and falls back to Mifflin even for an existing user whose
  BF% could be recovered from `body_metric_log`.
- **BMR formula**: as a direct consequence, onboarding computes BMR from lean mass
  (Katch-McArdle) while update computes it from Mifflin-St Jeor. Different BMR →
  different maintenance → different target kcal and different macro split, with no
  physical input having changed.
