# Calculation Audit 03 — Proposal

Date: 2026-06-08. Source: live code at HEAD `313856f`.
Status: AWAITING FOUNDER CONFIRMATION. No code written yet.

## Scope

The founder confirmed four symptoms while the audit ran, all from one root:
the nutrition surfaces do not consistently store or read body-composition and
goal data. This proposal fixes all four with the smallest, most additive change
that keeps onboarding output identical.

| # | Symptom | Cause |
|---|---|---|
| 1 | Update Your Plan produces different kcal/macros (≈595 kcal lower in the test case) | Update flow doesn't pass `bodyFatSource`, and onboarding never stored `bodyFatPct`/`bodyFatSource` → engine silently uses Mifflin instead of Katch-McArdle. |
| 2 | Nutrition Targets shows "Build muscle (slow)" after a bulk save | Summary label reads `goal` state ← `userProfile.goal`, which no flow ever writes (defaults to `lean_gain`). The kcal come from the saved target (`build`). |
| 3 | Nutrition Targets shows no current weight or body fat | Prefill effect sets sex/height/age only, never weight/BF. |
| 4 | Nutrition Targets assumes "moderate" activity | `activity` state hardcodes `'moderate'`; never derived from stored `daysPerWeek` (5 days should be `active`). |

## Requirement compliance

- **R1 Single calculation function** — both flows already call
  `calculateNutritionTargets`. We add ONE shared input-builder so the inputs can
  never drift again.
- **R2 Full profile read on update** — update will read sex, age, height, weight,
  BF%, BF source, days, goal, trainingGoal, protein approach from the stored
  profile (with a body-metric-log fallback for BF on already-onboarded users).
- **R3 No onboarding regression** — onboarding's engine inputs stay byte-identical.
  We only ADD storage (BF%, source, goal) and route onboarding through the shared
  builder that reproduces its exact current inputs. `experienceLevel` stays
  unsent (status quo) so no onboarding number moves.
- **R4 Proportionate training changes** — activity multipliers (1.375 / 1.55 /
  1.65 / 1.725) are unchanged and medically reasonable; the fix makes every
  surface derive activity from the same `daysToActivityLevel(daysPerWeek)`, so a
  4→5 day change moves maintenance by one band (≈+6%), not a 595 kcal jump.

## The fix

### A. New shared input-builder (R1, prevents future drift)
`src/lib/coachingGoals.js` — add a pure function:
```
buildNutritionEngineInputs({
  sex, age, heightCm, weightKg,
  bodyFatPct, bodyFatSource,
  daysPerWeek, trainingPhase, trainingGoal, proteinApproach,
}) => {
  sex, ageYears, heightCm, weightKg,
  bodyFatPercent: <range-guarded bodyFatPct>,
  bodyFatSource:  <source or null when BF% absent>,
  activityLevel:  daysToActivityLevel(daysPerWeek),
  goal:           phaseToNutritionKey(trainingPhase),
  trainingGoal,
  proteinApproach,
}
```
This is exactly onboarding's current input shape. Both screens build inputs
through it. No `experienceLevel` key (preserves current behaviour).

### B. Onboarding persists body composition + goal (R2/R3 storage half)
`src/screens/ProOnboardingScreen.js` — in the `merged` profile object
(`:485-511`), ADD:
```
bodyFatPct: bfNum,
bodyFatSource: bfNum != null ? bfSource : null,
goal: phaseToNutritionKey(trainingPhase),   // nutritionKey, for label consistency
```
Engine call switches to `calculateNutritionTargets(buildNutritionEngineInputs(...))`
with the same values it passes today → identical output (verified in Phase 4).

### C. Update flow reads full body composition (R2, symptom 1) + writes goal (symptom 2)
`src/screens/ProGoalSetupScreen.js` — in `handleSave`:
- Source BF: `bfPct = wp.bodyFatPct`; if absent, fall back to the latest
  `body_metric_log` row via a new `getLatestBodyComposition(user.id)` reader
  (covers users who onboarded before fix B). `bfSource = wp.bodyFatSource ?? <log source>`.
- Replace the engine call with `buildNutritionEngineInputs(...)` passing
  `bodyFatPct: bfPct, bodyFatSource: bfSource` and the latest weight.
- Add `goal: phaseToNutritionKey(selectedPhase)` to `updatedProfile` so
  `userProfile.goal` matches the saved phase.

### D. New DB reader (additive, read-only)
`src/lib/database.js` — add:
```
export async function getLatestBodyComposition(userId) {
  // most recent body_metric_log row with body_fat_percent NOT NULL
  // returns { bodyFatPercent, bodyFatSource, loggedAt } | null
}
```
No schema change; `body_metric_log` already has `body_fat_percent` +
`body_fat_source` (`database.js:221-222`).

### E. Nutrition Targets prefill + label (symptoms 2, 3, 4)
`src/screens/NutritionTargetsScreen.js` — make the Adjust form a faithful mirror
of the saved targets + stored profile, so opening it and recalculating cannot
silently change anything:
- Prefill `weight` from `getLatestBodyWeight` / `userProfile.weightKg`.
- Prefill `bodyFat` + `bfSource` from `getLatestBodyComposition`.
- Prefill `activity` from `daysToActivityLevel(userProfile.daysPerWeek)` instead
  of the hardcoded `'moderate'` default.
- When saved targets load (`loadSaved`), sync the form to the saved values:
  `setGoal(results.goal)` and `setProteinApproach(results.proteinApproach)`, and
  make the collapsed summary label prefer `results.phase` so it can't disagree
  with the saved calories. (Confirmed live: saved 3,387 kcal came from `build` +
  Advanced protein 2.80 g/kg, but the form showed `lean_gain` + Optimised.)

## Files changed

| File | Change |
|---|---|
| `src/lib/coachingGoals.js` | + `buildNutritionEngineInputs` (pure). |
| `src/lib/database.js` | + `getLatestBodyComposition` (read-only). |
| `src/screens/ProOnboardingScreen.js` | Store BF%, BF source, goal; call via builder. |
| `src/screens/ProGoalSetupScreen.js` | Read BF%+source (+log fallback), store goal; call via builder. |
| `src/screens/NutritionTargetsScreen.js` | Prefill weight/BF/activity; label from saved targets. |
| `src/lib/__tests__/nutritionConsistency.test.js` | NEW. Onboarding vs update parity + builder unit tests (Rule 7). |

## How identical output is guaranteed

Both flows construct inputs through the one `buildNutritionEngineInputs` and call
the one `calculateNutritionTargets`. For the same stored profile the input object
is identical field-for-field, so the engine returns identical kcal and macros. A
new test asserts this with the Phase 4 fixture (Male/42/177.8cm/96kg/12% caliper/
build/4 days/mens_physique): both paths must return `targetKcal 3980`,
`P253 / C549 / F86`.

## Risk / Rule-5 notes

- `userProfile` is free-form local AsyncStorage; BF%/source/goal join
  weight/height/age there with no migration and no cloud-sync-allow-list change
  (cloud syncs only 7 fields; these stay local like weight already does).
- `getLatestBodyComposition` is a read-only additive query.
- Onboarding numeric output is unchanged (storage + builder only). Phase 4 trace
  will prove it.
- Existing closed-test build keeps working: no schema or contract change, so the
  release policy hold is satisfied.

## Explicitly NOT in this change (flagged for separate decision)

- Wiring `experienceLevel` into calories. No surface passes it today; adding it
  would move onboarding numbers (R3). Recommend a follow-up once you confirm the
  intended experience→surplus behaviour.
- Re-tuning the activity multiplier values themselves. They are unchanged; only
  the per-surface sourcing of which band applies is fixed.
