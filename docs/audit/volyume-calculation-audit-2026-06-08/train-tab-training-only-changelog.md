# Train-side Plan Update — training only

Date: 2026-06-08. Branch: `main`.

## Goal
The plan-update entry reached from the Plans tab must rebuild training only. It
must not recalculate calories or macros, write nutrition targets, or show a
calorie/macro change screen. Nutrition recalculation stays in the You tab
(`ProGoalSetup` "Update your plan" and `NutritionTargets`), which is untouched.

Founder direction: do not edit `ProGoalSetup`. It still lives, reached from the
You tab only. Add a new training-only screen for the Plans side.

## Before vs after

| | Plans-tab "Update plan" (before) | Plans-tab "Update training" (after) |
|---|---|---|
| Screen | `ProGoalSetup` (shared with You tab) | new `PlanUpdateScreen` |
| Training params | yes | yes (experience, days, session length, equipment, division, weak points, recovery) |
| Rebuild plan | yes (`generateAndSavePlan`) | yes (`generateAndSavePlan`) |
| Recalc calories/macros | yes (`calculateNutritionTargets`) | no |
| Write `nutrition_targets` | yes (`saveNutritionTargets` + AsyncStorage) | no |
| Calorie/macro change screen | yes (`GoalChangeSummary`) | no (toast + back) |
| Goal / phase / protein approach | editable | unchanged (carried through untouched) |

The You tab keeps `ProGoalSetup` and `NutritionTargets` exactly as they were.

## Files changed

- **NEW `src/screens/PlanUpdateScreen.js`** — training-only update. State seeded
  from the profile (division, weak points, experience, training days, session
  length, equipment, recovery). On save: builds `updatedProfile` with training
  fields only, `saveLocalProfile`, then `generateAndSavePlan`, then a toast and
  `navigation.goBack()`. No nutrition imports, no nutrition calls, no
  `GoalChangeSummary`.
- **`src/navigation/RootNavigator.js`** — import `PlanUpdateScreen`, add
  `GatedPlanUpdate = withProGuard(PlanUpdateScreen, 'Update training')`, register
  `<Stack.Screen name="PlanUpdate">` inside `PlansStack` (so it stays in the
  Plans tab). `ProGoalSetup` registration unchanged (still ProfileStack / You).
- **`src/screens/PlansScreen.js`** — the "Update plan and rebuild" action card now
  points to `PlanUpdate` (was `ProGoalSetup`), retitled "Update training and
  rebuild" with copy that no longer promises nutrition recalculation and points
  goal/calorie changes to the You tab. The post-recovery "Build a new programme"
  CTA now navigates to `PlanUpdate` (was `ProGoalSetup`). Stale header comment
  updated.
- **`src/__tests__/screen-mount.test.js`** — added `PlanUpdateScreen` to the mount
  sweep.

`ProGoalSetup` is now navigated to only from `YouScreen.js:134` (You tab).

## Save-path trace (new Plans-side flow)

`PlanUpdateScreen.handleSave`:
1. `saveLocalProfile(user.id, updatedProfile)` — writes the profile (AsyncStorage
   + cloud `users_profile` via `syncProfile`, which maps only 7 non-nutrition
   fields). No nutrition write.
2. `generateAndSavePlan(user.id, updatedProfile)` — rebuilds the training plan.
   Verified: `planAutoGen` makes no `nutrition_targets` / `calculateNutritionTargets`
   / `saveNutritionTargets` call.
3. toast + `navigation.goBack()`.

No nutrition function is called and no calorie/macro column is written.

## Verification
- `npx eslint` (new + changed files) → 0 errors, 0 warnings.
- `npx tsc --noEmit` → 0 errors.
- `npx jest screen-mount + planAutoGen + nutritionConsistency` → 571 passed.
  The mount sweep exercises `PlanUpdateScreen` across state variants and stress
  taps (including its save button) with no crash.
