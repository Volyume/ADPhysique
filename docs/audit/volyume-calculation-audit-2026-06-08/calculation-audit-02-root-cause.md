# Calculation Audit 02 — Root Cause

Date: 2026-06-08. Source: live code at HEAD `313856f`.

## Confirmed root cause (traceable)

Both flows call the same engine, `calculateNutritionTargets()`
(`nutritionEngine.js:554`). The discrepancy is caused by the Update Your Plan
flow handing the engine an **incomplete body-composition input set**, which
silently switches the BMR formula from Katch-McArdle to Mifflin-St Jeor.

Two linked defects produce it:

1. **Storage gap (onboarding).** `ProOnboardingScreen.js` builds the saved
   profile object `merged` at `:485-511` and does **not** include `bodyFatPct`
   or `bodyFatSource`. The BF% the user entered is passed to the engine at
   `:469-470` and logged to `body_metric_log` at `:531-532`, but it is never
   persisted into `userProfile`. So the profile the update flow later reads has
   no body-fat data at all.

2. **Read gap (update).** `ProGoalSetupScreen.js` calls the engine at `:230`
   with `bodyFatPct: wp.bodyFatPct ?? null` (`:235`) — and `wp.bodyFatPct` is
   `undefined` because of defect 1 — and it **does not pass `bodyFatSource` at
   all**. In `calcBMR` (`nutritionEngine.js:381-391`), Katch-McArdle requires a
   finite in-range BF% AND a non-null, non-`'visual'` `bodyFatSource`. With both
   absent, BMR falls back to Mifflin-St Jeor (`:398-403`).

Consequence: identical physical inputs yield two different BMRs, hence two
different maintenance and target calorie figures and two different protein bases
(LBM vs bodyweight), with nothing about the user's body having changed.

This is corruption of the calculation **inputs**, not the formula. It maps to
root-cause categories (a) "recalculates using incomplete values for fields it
does not ask for" and (d) "profile data not read by the update flow", combined.
Category (c) (activity multiplier mis-weighting) is **not** the cause: the
multiplier is identical in both flows and is applied correctly.

## Precise example (the task's Phase 4 test inputs)

Male, 42, 5ft10in (177.8 cm), 96 kg, 12% BF (Caliper), Build muscle (bulk),
4 training days, Men's Physique. No morning weights logged yet (so update falls
back to `wp.weightKg = 96`, same weight as onboarding).

Derived: phase `bulk`→nutrition goal `build` (`PHASE_ADJUSTMENTS.build = 0.17`);
4 days→`moderate` (1.55); trainingGoal `mens_physique`→protein approach
`advanced`; `experienceLevel` default `intermediate` in both.

### Onboarding (Katch-McArdle, BF + source present)
- LBM = 96 × (1 − 0.12) = 84.48 kg
- BMR = 370 + 21.6 × 84.48 = **2194.77** (→ 2195)
- Maintenance = round(2194.77 × 1.55) = **3402**
- Target = round(3402 × 1.17) = **3980 kcal**
- Protein (advanced, LBM basis, build 3.0 g/kg LBM) = 3.0 × 84.48 = **253 g**
- Fat (0.9 g/kg) = 86 g; Carbs = (3980 − 1012 − 774)/4 = **549 g**
- **Result: 3980 kcal · P253 / C549 / F86**

### Update Your Plan, current/broken (Mifflin, BF + source absent)
- BMR = 10×96 + 6.25×177.8 − 5×42 + 5 = **1866.25** (→ 1866)
- Maintenance = round(1866.25 × 1.55) = **2893**
- Target = round(2893 × 1.17) = **3385 kcal**
- Protein (advanced, bodyweight basis, build 2.8 g/kg BW) = 2.8 × 96 = **269 g**
- Fat = 86 g; Carbs = (3385 − 1076 − 774)/4 = **384 g**
- **Result: 3385 kcal · P269 / C384 / F86**

### Delta from a training-only save, physical profile unchanged
**595 kcal/day** lower, +16 g protein, −165 g carbs. This sits inside the
observed 375–840 kcal band and is fully explained by the Mifflin↔Katch-McArdle
switch (the size of the swing varies with BF% and weight, which is why the
observed range is wide).

## Out-of-scope finding (flagged, not the cause, not fixed here)

`experienceLevel` is never passed to the engine by **any** screen (onboarding,
update, or manual). Both flows therefore use the engine default `intermediate`,
so experience is *consistent* between flows but does **not** currently affect
calories at all. Wiring it in would change onboarding output and so is held back
to respect Requirement 3 (no onboarding regression). Recorded here for a separate
decision; it is not part of this fix.
