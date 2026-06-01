# Onboarding Audit 04 — Integration Accuracy

Status: COMPLETE (Phase 4 of 7)
Date: 2026-06-01
Method: every feature reference in both flows checked against how the feature
actually works in the current code. This is the phase the founder flagged
directly ("users don't need to log their food separately now ... a lot of old
instruction isn't valid anymore"). Replaces the earlier version.

Verdict scale: ACCURATE / OUTDATED / MISSING / CONTRADICTORY.

---

## 1. Steps and activity tracking — ACCURATE

The app reads steps automatically from the platform health aggregator (phone
pedometer, Apple Watch, Garmin, Fitbit, Whoop), with manual entry only as a
fallback and no forced wearable or health account (`activitySteps.js:2-14`,
:104-113; `health.js` wrapper).

- Onboarding copy: "Your phone fills the number in for you." (ProOnboarding:1190)
  and "Steps are the first thing the coach leans on when progress slows, before
  it touches your food." (:1179). Both ACCURATE.
- No copy in either flow presents manual step entry as the primary method.
- The weekly check-in keeps a manual steps fallback field
  (WeeklyCheckInScreen:253), which is correct given the aggregator can be
  unavailable. Not a contradiction.

Action: none required. Keep this copy, it is a model for the rest.

## 2. Food logging, the Eat / Diary logger — OUTDATED FRAMING, MISDIRECTION, MISSING INTRODUCTION

This is the core finding, and the most serious in the whole audit.

### 2a. The app HAS a complete, coach-integrated food logger

The "Eat" feature (the tab is currently labelled "Diary",
`DiaryScreen:450`, `ScreenHeader title="Diary"`) is a full food logger:
- It loads the coach's calorie and macro targets (`getNutritionTargets`,
  DiaryScreen:93) and shows the day's intake against them via macro rings
  (:487), with carb-cycle and refeed-day target swaps (:124-144). It directly
  consumes the targets the coach sets.
- Backend `food/db.js`: `logFoodEntry`, `recomputeRollup` into
  `daily_intake_rollups`, range rollups, custom foods, frequents, and food
  like/dislike preferences that feed the coach's meal suggestions
  (food/db.js:38-411).
- Inputs: barcode scan (`ScanBarcodeScreen`, described in code as better
  detection than MFP/Cronometer), label OCR (`ScanLabelScreen`), multi-source
  search across OpenFoodFacts / USDA / CoFID (`food/sources`, `waterfall`),
  saved meals (`MyMeals`), recipes (`MyRecipes`, `RecipeBuilder`), and meal
  suggestions (`mealSuggest`).
The food the user logs flows back to the coach: the weekly check-in reads the
rollups for adherence (`WeeklyCheckInScreen:97-105`, `getRollupsForRange`).

### 2b. CRITICAL: onboarding sends users to a competitor app

`NutritionEducationScreen` section 4 "How to actually track", option A
(:103-109): **"Use an app like MyFitnessPal or Cronometer. Scan barcodes or
pick from saved meals."** This screen's header comment calls it "the first
thing a new Pro user reads" (:8-9) and it is linked from the reveal
(ProSetupComplete:180-190) and from `NutritionTargetsScreen`. It instructs the
new user to log food in a competitor's app, and the very actions it describes
(scan barcodes, pick saved meals) are native Eat features. This is a critical
error: invalid instruction that points users away from the product.

### 2c. The coaching model: food is optional, weight drives it

The coach adapts calories from the **morning-weight EWMA trend**, not from food
logs:
- `weeklyCoach` computes the calorie decision from weight trend and check-in
  signals (`weeklyCoach.js:6`, :52-64, :373-379).
- Food adherence is derived **only if** food data exists on at least 5 of 7
  days, otherwise it is null and coaching proceeds on weight alone
  (`WeeklyCheckInScreen:97-105`).
- Conclusion: **food logging is optional and enhancing. It is not required for
  the coach to work.** The founder's statement is correct and the code proves
  it.

Where the flow gets this wrong or silent:
- MISSING: neither flow tells the user food is optional. The reveal says only
  "Hit your daily targets" (ProSetupComplete:137), which reads as "you must log
  food to hit them".
- MISSING: the Diary tab is never introduced by name in onboarding, nor is its
  contribution explained ("logging food sharpens the coach, but your weight
  drives it").
- CONTRADICTORY: `PaywallScreen` sells Pro as "Pro adds food data ... turns on
  the food layer" (PaywallScreen:107-109). This frames the optional food layer
  as the central Pro benefit, contradicting both the engine and the
  Welcome/ProUpgrade coaching framing.

Action: add one plain line in onboarding and the reveal stating weight drives
the coach and food logging is optional but sharpens it. Re-frame the paywall
away from "food layer" as the headline.

## 3. Division-specific training — ACCURATE

Division selection genuinely shapes the plan. The engine applies per-division
volume overlays, division-aware MRV caps, pool restrictions and a structured/
matrix split distinction (`planEngine.js:127-360`, :846; `coachingGoals`
`GOAL_OVERLAYS`, `WEAK_POINT_SETS`, `DIVISION_*`).

- Onboarding copy "Biases volume toward the muscles that category is judged on."
  (ProOnboarding:1002) and `ProGoalSetup` "Biases plan volume toward the muscles
  that category is judged on." (:303). Both ACCURATE.
- Caveat: onboarding hardcodes days = 4 (ProOnboarding:41), so the engine's
  day-sensitive distribution and 3-day compression
  (`planEngine.js:230`, :331) never fire from a first-time plan. Not inaccurate
  copy, but the feature is under-exercised from onboarding.

## 4. Nutrition targets — ACCURATE (plain-language description holds)

`nutritionEngine` uses Mifflin-St Jeor BMR, a Katch-McArdle lean-mass variant
when body fat is known, an activity multiplier from training frequency, and an
adaptive TDEE correction from the weight trend (`nutritionEngine.js:334-352`,
:544-545, :214-264). The user-facing label is "Standard calorie formula" /
"Lean mass-adjusted formula" (:633), no internal jargon leaks. ACCURATE.

- Onboarding hints ("Used with your height and age to calculate your calorie
  targets", ProOnboarding:872-873) are ACCURATE.
- The reveal shows the real computed kcal/protein/carbs/fat
  (ProSetupComplete:130-163). ACCURATE.

## 5. Pre-population in the plan builder — PARTIALLY PRESENT

- `ProGoalSetup` pre-populates every field from `userProfile`
  (ProGoalSetupScreen:70-87) and rescopes/clears weak points on goal change
  (:145-147). Good.
- It does NOT re-confirm body weight, yet it recalculates nutrition from weight
  (:183-194). It pulls the latest morning-weight EWMA instead (:184-191), which
  is the right call, but means the field the calc depends on is invisible on the
  screen.
- `ManualBuilder` pre-populates nothing and is identical first-build or fifth.
- One latent bug: onboarding's saved profile omits `planWeakPoints`
  (ProOnboarding:460-483) while `buildPlanInputs` reads `migrated.planWeakPoints`
  (planAutoGen.js:97). A regenerate-from-profile after onboarding therefore
  drops the weak points the user picked. The initial onboarding generation is
  fine because it passes `planWeakPoints` directly (ProOnboarding:541).

## 6. Pro and the 28-day trial — CONTRADICTORY / OUTDATED

| Claim | Source | Reality |
|---|---|---|
| Pro is free, no subscription | WelcomeScreen:82, LoginScreen:409 | True during beta |
| "Try Pro free for 14 days" | PaywallScreen:92-94 | Trial is day-21 in code |
| "Day 14 / Day 28" gates | CascadeGateScreen:5-7 (docstring) | Single day-21 gate (:39-59) |
| "28-day cascade" | brief | Not in code |
| Pro = "adds food data" | PaywallScreen:107-109 | Pro = coaching, food optional |
| £2.99/month | PaywallScreen:91 | SKUs are £0.99/£1.99/£3.99 (catalogue.js) |
| Pro vs "Complete" comparison | TierComparisonStrip:23-74 | 2-tier model, Complete deleted |

The trial mechanic, price, tier model, and Pro value proposition are each
stated inconsistently across the paywall surfaces, and several reference the
removed 3-tier model. The trial actually starts at Article 9 consent
(`Article9ConsentScreen:90` to `cascade.startCascade`) with day-19/21 reminders
and day-21 expiry (`cascade.js:108`, :165).

## 7. Other current features not introduced when they should be — MISSING

- Adaptive coaching reads weight trend, never explained at the point the user
  is asked to weigh daily (the "why" is implied but not stated).
- Barcode and label scanning exist (`ScanBarcode`, `ScanLabel` in DiaryStack)
  but are never surfaced in onboarding, fine to defer, but worth one mention if
  food gets introduced.

---

## Flag list (every inaccuracy, for doc 07 triage)

Critical (references behaviour that no longer exists / is wrong):
- F0 NutritionEducationScreen tells users to "Use an app like MyFitnessPal or
  Cronometer" (NutritionEducationScreen:103-109), linked from the reveal, while
  the app ships its own complete food logger. Highest-priority fix.
- F1 PaywallScreen "adds food data / food layer" headline (PaywallScreen:107-109).
- F2 TierComparisonStrip "Complete" column (TierComparisonStrip:23-74).
- F3 Trial length: 14 days (PaywallScreen) vs day-21 (cascade) vs docstring
  day14/28 (CascadeGateScreen:5-7).
- F4 Price £2.99 not in catalogue (PaywallScreen:91).
- F5 "Answer 3 questions", quiz has 2 (PlanLibrary:439).
- F6 ManualBuilder cosmetic goal implies plan shaping it does not do.

High (missing truth):
- F7 No "food logging is optional, weight drives the coach" message anywhere.
- F8 Diary tab never introduced.
- F9 planWeakPoints dropped from saved profile (regenerate loses weak points).
