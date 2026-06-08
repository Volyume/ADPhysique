# Calculation Audit 04 — Implementation Log

Date: 2026-06-08. Branch: `main` (founder confirmed Rule 9 over the harness
feature-branch directive). Base HEAD `313856f`.

## What changed and why

### 1. `src/lib/coachingGoals.js` — new shared input-builder
Added `buildNutritionEngineInputs(profileFields)`. Pure function that maps a
user's stored profile fields to the exact input object `calculateNutritionTargets`
expects: range-guards body fat, drops the BF source when no usable percentage is
present, derives `activityLevel` via `daysToActivityLevel`, and `goal` via
`phaseToNutritionKey`. No `experienceLevel` key (preserves current behaviour).
This is now the single place both flows build engine inputs, so they cannot drift.

### 2. `src/lib/database.js` — new read-only reader
Added `getLatestBodyComposition(userId)`. Returns the most recent `body_metric_log`
row that carries a body-fat figure (`{ bodyFatPercent, bodyFatSource, loggedAt }`)
or null. Used to recover BF% + method for users who onboarded before the profile
persisted them. No schema change.

### 3. `src/screens/ProOnboardingScreen.js` — store body comp + goal, build via helper
- Engine call now goes through `buildNutritionEngineInputs(...)` with the same
  values as before (output unchanged, verified).
- The saved `merged` profile now persists `bodyFatPct`, `bodyFatSource`, and the
  nutrition `goal` key, so later recalcs read the same body composition and goal.
- Removed the now-unused `daysToActivityLevel` import.

### 4. `src/screens/ProGoalSetupScreen.js` — read full body comp, store goal
- Sources body fat: profile first (`wp.bodyFatPct` / `wp.bodyFatSource`), falling
  back to `getLatestBodyComposition` for already-onboarded users.
- Engine call now goes through `buildNutritionEngineInputs(...)`, passing both the
  BF% AND the source, so the update calc stays on the Katch-McArdle path that
  onboarding used (the fix for the calorie discrepancy).
- `updatedProfile` now persists `goal` (nutrition key) and caches the resolved
  body composition back onto the profile.
- Removed the now-unused `daysToActivityLevel` import.

### 5. `src/screens/NutritionTargetsScreen.js` — prefill + mirror saved targets
- Prefills `weight` (from `getLatestBodyWeight` / profile), `bodyFat` + `bfSource`
  (from `getLatestBodyComposition` / profile), and `activity` (from
  `daysToActivityLevel(userProfile.daysPerWeek)` instead of a hardcoded
  "moderate").
- On load, syncs the form's `goal` and `proteinApproach` to the saved targets
  (deriving the goal from the phase label when the DB record lacks the key, and
  recovering `proteinApproach` from the rich AsyncStorage copy). The collapsed
  summary label now prefers the saved `phase`.

### 6. `src/lib/__tests__/nutritionConsistency.test.js` — new (Rule 7)
Parity + regression tests for the audit's Phase 4 fixture.

## Manual trace (identical inputs, both flows)

Fixture: Male, 42, 5ft10in (177.8 cm), 96 kg, 12% BF (Caliper), Build muscle
(bulk), 4 training days, Full Gym, Men's Physique, advanced protein.

| | Onboarding | Update (after fix) |
|---|---|---|
| BMR formula | Katch-McArdle | Katch-McArdle |
| BMR | 2195 | 2195 |
| Maintenance (×1.55) | 3402 | 3402 |
| Target (×1.17) | **3980 kcal** | **3980 kcal** |
| Protein | **253 g** | **253 g** |
| Carbs | **549 g** | **549 g** |
| Fat | **86 g** | **86 g** |

Before the fix the update path produced 3385 kcal / P269 / C384 / F86 (Mifflin),
matching the founder's live screenshot of 3,387 kcal / 269 / 384 / 86. The 595
kcal gap from an unchanged body is closed.

## Symptom coverage

| Symptom | Status |
|---|---|
| Different kcal/macros after update (Mifflin vs Katch) | Fixed (4, 1, 2) |
| "Build muscle (slow)" label vs bulk calories | Fixed (3, 4, 5) |
| No current weight / body fat in Nutrition Targets | Fixed (5) |
| Activity assumed moderate not active | Fixed (5) |
| Protein showed Optimised vs saved Advanced | Fixed (5) |

## Verification

- `npx jest src/lib/__tests__/nutritionConsistency.test.js src/lib/__tests__/nutritionEngine.test.js`
  → 70 passed. Parity test asserts both flows return `3980 / 253 / 549 / 86`,
  `formulaUsed === 'katch_mcardle'`, and that dropping the source (the old bug)
  diverges by > 400 kcal.
- `npx jest src/lib` → 150 suites, 2231 passed, 3 skipped. No regression.
- `npx eslint` on all six changed files → 0 errors, 0 warnings.
- `npx tsc --noEmit` → 0 errors.

## Not in this change (flagged earlier, founder agreed to defer)

- Wiring `experienceLevel` into the calorie surplus scaling (no surface passes it
  today; adding it would move onboarding numbers).
- Re-tuning the activity multiplier values themselves (unchanged; only the
  per-surface sourcing of which band applies was fixed).
