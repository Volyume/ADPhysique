# A2, screens slice 2, FLAG-ONLY decisions for the founder

Items the safe-fix class does NOT permit me to touch. Each needs a founder
ruling before any change. Nothing below has been edited.

---

## D1. NutritionTargets energy-range en dash (SAFETY-ADJACENT, FLAG)
`src/screens/NutritionTargetsScreen.js:970`

```
Estimated range: {formatEnergy(kMin, energyUnit)} [en dash] {formatEnergy(kMax, energyUnit)} {energyUnitLabel(energyUnit)}
```

- This is a **user-facing** en dash on the daily-energy-target hero surface
  (calorie/coaching copy). The styling lint bans en dashes in user-facing
  copy, so it wants a rewrite; but per this slice's special-care rule, ANY
  calorie/energy-target line is FLAG-ONLY.
- **Proposed fix (needs ratification):** replace the en dash with ` to ` so
  it reads `Estimated range: {kMin} to {kMax} kcal`. Pure copy, no logic
  change.
- I did NOT edit this line. Every other dash in the file (all comments) was
  cleared under the safe-fix class.

## D2. Terminology drift: "session" vs "workout" (LIST ONLY, orchestrator decides canon)
Both terms are used for training-unit-adjacent concepts in the slice:

- "Session length" (a training session's duration):
  `PlanUpdateScreen.js:273, 278, 349`; `ProGoalSetupScreen.js:498, 503`;
  `ProOnboardingScreen.js:1190, 1191, 1196`.
- "Workout" (the training unit):
  `MealPlanScreen.js:676` ("Workout meals"),
  `PlansScreen.js:732, 735` ("Start Next Workout"),
  `PlansScreen.js:934` ("Workout templates").

Note: these may be intentionally distinct, "session length" being how long
you train and "workout" the unit trained. Not canonicalised. Flagged for the
orchestrator to decide whether a single term should win.

## D3. Pre-existing accessibility warnings (DECISION: fix now, or dedicated a11y pass?)
`npx eslint` flags 20 `react-native-a11y/has-valid-accessibility-descriptors`
warnings on interactive elements missing labels/roles. These predate this
audit (my edits added no touchables). Fixing them is in the safe-fix class
(rule 5) but each needs per-element judgement and several sit on
safety-sensitive screens. Locations:

- `ManualBuilderScreen.js:763, 853, 869`
- `MyMealsScreen.js:213`
- `NutritionTargetsScreen.js:1340, 1404`
- `PlansScreen.js:970, 1043`
- `ProOnboardingScreen.js:938, 967, 1006, 1019, 1033, 1068, 1081, 1095, 1147, 1222, 1405, 1637`

**Founder decision:** (a) I add British-English labels/roles now, matching
neighbouring rows, screen by screen; or (b) leave for a dedicated
accessibility pass. Not decided unilaterally; surfaced per the
no-corner-cutting rule. eslint is error-green either way (warnings only).

---

## Explicitly NOT flagged (checked, clean)
Consent wording, ED/calorie-floor copy ("Held at your safe minimum",
NutritionTargets), Partner privacy-receipt copy, coaching-voice verdicts,
medical/health-claim copy: reviewed, no spelling/dash fixes were needed on
any of them, so nothing there was touched.
