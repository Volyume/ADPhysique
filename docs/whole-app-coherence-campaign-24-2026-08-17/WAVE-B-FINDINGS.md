# WAVE B — NUTRITION — Findings

Campaign 24, Wave B. Read-only audit. Baseline: `claude/campaign24-whole-app`
branch, tree as at 2026-08-17. British English throughout. Every finding
carries file:line. Nothing here re-litigates a recorded Campaign 17/17B
decision (one-daily-truth, calorie banking as the sole per-day exception,
stated-vs-observed meal count, food-swap intent scope, etc.) — those are
treated as law and cited, not re-audited.

Screens read in full: `src/screens/DiaryScreen.js` (2433 ln),
`src/screens/MealPlanScreen.js` (2166 ln), `src/screens/FoodSearchScreen.js`
(1230 ln), `src/screens/AddCustomFoodScreen.js` (520 ln),
`src/screens/ScanBarcodeScreen.js` (506 ln), `src/screens/ScanLabelScreen.js`
(511 ln), `src/screens/FoodInsightsScreen.js` (842 ln),
`src/screens/MyRecipesScreen.js` (364 ln), `src/screens/MyMealsScreen.js`
(360 ln), `src/screens/RecipeBuilderScreen.js` (624 ln). Directly-rendered
components read in full: `src/components/food/CalorieBankSheet.js`,
`MacroRings.js`, `FoodDetailSheet.js`, `MealSection.js`, `EmptyDiary.js`,
`QuickAddSheet.js`. Authority modules read/traced (not re-derived):
`src/lib/food/calorieBank.js`, `mealPlanService.js`, `mealSuggest.js`,
`curatedMeals.js`, `insights.js`, `adherence.js`, `effectiveTargets.js`,
`diaryViewModel.js`. Cross-referenced against
`src/lib/nutritionEngine.js`/`weeklyCoach.js`/`coachApply.js` by call-site
grep, not full re-read (unchanged this wave, C20/C21 authoritative).

---

## DiaryScreen.js (`Diary` — Eat, Nutrition tab root, Pro RO)

PURPOSE: today's (or any day's) food — meal sections, macro rings, water,
calorie banking, copy/plan actions. Free/lapsed users get the exact same
screen in read-only.

VERDICT: **NO_CHANGE.** This is the most heavily hardened screen in the
domain. Confirmed:
- ED-safety carve-out is correct and single-sourced: `bankingAvailable`
  (`:364`) gates BOTH the "Plan a higher-calorie day" control's visibility
  AND whether a persisted bank is allowed to display, on `!targetWasFloored
  (targets) && !edFlagOpen`; `edFlagOpen` fails CLOSED on a read error
  (`:221-225`, the `'read_failed'` sentinel maps truthy).
- `readOnly` (`:134`) is derived from the live store inside the screen, not
  a trusted prop, and every write handler re-checks `canWrite()` at
  execution time (`:140`), not just at render — correctly defends against
  a tier flip while a sheet is open (E10 hostile-review fix, `:897-912`
  closes every open write surface the instant `readOnly` flips true).
- Authority: `effectiveTargets` (`:376-379`) is the ONLY place the day's
  macro target is computed, and it is `resolveEffectiveTargets(targets, {
  bankedDelta })` from `lib/food/effectiveTargets.js` — no local target/macro
  arithmetic exists in this file (grep-confirmed: every `kcal`/`protein`/
  `target` value traces to `getNutritionTargets`, `getRollupForDay`, or the
  imported `lib/food/*` helpers).
- One-daily-truth (Campaign 17A) is respected: banking is the only
  mechanism that moves a day, and it is disabled outright on the floored/
  ED-flag carve-out, not made "conditional but softer".

---

## MealPlanScreen.js (`MealPlan` — meal builder / plan review, Pro)

PURPOSE: generate/review a day or week of meals from the existing nutrition
target, swap/pin/rebuild, log into the diary.

VERDICT: findings below; otherwise sound. Header comment states the
authority contract explicitly ("The screen NEVER computes nutrition: it
renders what the engine assembled") and it holds — every macro/kcal number
on screen (`slot.totals`, `day.totals`, `target`) is either read from the
persisted plan JSON or `sumDayTotals`/`swapFoodInMeal`/`swapMealInPlan`
results returned by `lib/food/mealPlanService.js`. No independent
calorie/macro decision found.

- **COPY_DEFECT** — `src/screens/MealPlanScreen.js:276` (`PrefRow label="Meals
  per day"`). This label is the DIFFERENT setting from
  `src/screens/NutritionTargetsScreen.js:1267`'s "Diary meals per day" —
  writing `mealPlanMealsPerDay` (sizes only the auto-generated meal plan)
  versus the `@volyume_meals_per_day` AsyncStorage key (sizes the diary's
  numbered meal-slot ladder, `MealNamesScreen.js`, and
  `FoodSearchScreen.js`'s Suggested-tab split). This exact ambiguity was
  already found and partially fixed: `NutritionTargetsScreen.js:1249-1266`
  is a first-person audit note ("Campaign 3 discoverability audit, finding
  #4") that traces every reader of the AsyncStorage key and explicitly
  states "MealPlanScreen's `mealPlanMealsPerDay` … is untouched by this
  fix." The disambiguation was one-sided: the Nutrition Targets side now
  reads "Diary meals per day" with a sub-line naming its real consequence
  (`:1268`), but MealPlanScreen — which a new Pro user is more likely to
  meet FIRST (the empty "Meal builder" state opens straight onto this
  panel) — still shows the bare, unqualified "Meals per day" with help text
  that does not say it is scoped to the auto-generated plan only
  ("Choose how many meals Volyume should build before snacks or pre-workout
  extras.", `:277`). A user who sets one, then finds the diary's meal count
  unchanged (or vice versa), hits the exact confusion the Campaign 3 finding
  was written to prevent — just from the other screen.
  CORRECTION: rename the label at `MealPlanScreen.js:276` to something that
  names the plan it sizes (e.g. "Meal plan meals per day"), and extend the
  help text at `:277` with the same disambiguating sentence
  `NutritionTargetsScreen.js:1268` already carries, so a user reading either
  screen learns these are two independent settings and where the other one
  lives.

---

## FoodSearchScreen.js (`FoodSearch` — food picker modal, Pro)

PURPOSE: search/browse/scan/suggest a food, confirm a portion, log it (or
return a pick to Recipe Builder).

VERDICT: **NO_CHANGE.** Authority: `loadSuggested` (`:272-331`) and the
Diary-parity single-food ranking (`suggestFoodCandidates`, `:236-265`) both
delegate to `getCuratedCandidates`/`rankSuggestions` (`lib/food/curatedMeals.
js`, `lib/food/mealSuggest.js`), the same modules DiaryScreen's
`slotMealSuggestion` effect uses — one ranking engine, two call sites, not a
duplicate decision. The "don't suggest" exclusion (Campaign 17B job 8) is
honoured consistently across Suggested, Search-results merge
(`personalPool`, `:663-675`), and the meal-plan layer via the shared
`foodRefExcluded`/`withDoNotSuggest` predicates — no gap found where a food
the user excluded could resurface through this screen. Read-only tier
gating is structural (`withProGuard` at the navigator, RootNavigator.js:242),
not re-implemented here, correctly — there is no free-tier code path to
audit for a leak.

---

## AddCustomFoodScreen.js (`AddCustomFood` — manual food entry modal, Pro)

PURPOSE: create a custom food (optionally from a barcode/OCR miss) and log
it in one action.

VERDICT: **NO_CHANGE.** `canSave` (`:151-157`) and the `isValidEntryGrams`
gate on the logged quantity (`:194-198`) correctly hard-block non-finite/
negative values before `checkFoodSanity`'s soft "numbers look off, save
anyway?" gate runs (`:201-226`) — the two guards do different jobs (safety
floor vs plausibility nudge) and are not duplicative. Serving vs Eaten
grams are explicitly disambiguated in copy (`:377-379`, L05-ACF3). No local
macro-authority computation: `scaleMacros(food, qty)` is the only
kcal/macro arithmetic in the file.

---

## ScanBarcodeScreen.js (`ScanBarcode` — camera barcode scan modal, Pro)

PURPOSE: live camera barcode capture → waterfall lookup → route to
FoodSearch (hit) or ScanLabel (miss).

VERDICT: **NO_CHANGE.** Camera lifecycle (focus/background pause,
permission fallback, manual-entry escape hatch) is defensive and consistent
with its sibling. No nutrition-authority surface on this screen (it only
routes).

---

## ScanLabelScreen.js (`ScanLabel` — nutrition-label OCR modal, Pro)

PURPOSE: two-step (front-of-pack name, then nutrition panel) OCR capture →
AddCustomFood with prefilled fields.

VERDICT: findings below; otherwise sound. `parseNutritionLabel`/OCR
confidence flagging is correctly display-only (feeds `AddCustomFoodScreen`'s
`_unsure` amber-field marking, never auto-saves a value the user hasn't
seen).

- **PRESENTATION_DEFECT** — `src/screens/ScanLabelScreen.js:313-314`
  (torch toggle `onPress={() => setTorch(v => !v)}`). The identical torch
  toggle on the sibling scan screen fires a selection haptic before the
  state change: `src/screens/ScanBarcodeScreen.js:340`
  (`onPress={() => { hapticSelection(); setTorch(v => !v); }}`). Both
  screens share the same camera-UI grammar (same `ModalHeader
  rightAccessory` torch icon, same flashlight/flashlight-outline pair,
  reached from the same barcode-miss → label-scan chain) and the file
  header for ScanLabelScreen doesn't note torch as an intentional
  exception; `ScanLabelScreen.js` also never imports `haptics` at all,
  which reads as an omission rather than a considered choice. A user
  toggling the torch gets tactile confirmation on one scan screen and none
  on the other, seconds apart in the same flow.
  CORRECTION: import `selection` from `../lib/haptics` in
  `ScanLabelScreen.js` and call it in the torch `onPress` at `:313-314`,
  matching `ScanBarcodeScreen.js:340` exactly.

---

## FoodInsightsScreen.js (`FoodInsights` — nutrition trends, Pro)

PURPOSE: kcal/macro adherence and trend charts over a selectable window,
plus CSV/PDF export.

VERDICT: **NO_CHANGE**, including on the mandatory ED-safety suppression
check. This screen shows historical adherence percentages and hit-rate
counts, which superficially resembles `BodyMetricsScreen`'s
calm-mode/ED-flag-suppressed "recomposition" narrative
(`BodyMetricsScreen.js:614-615`,
`suppressed: !wellbeingLoaded || calm || edFlagOpen`) closely enough to be
worth checking for a missing carve-out. It does not carry one, and that is
correct, not an omission: `lib/food/insights.js`'s header is an explicit,
dated founder-law comment ("FOUNDER LAW: … NO JUDGEMENT. No cheat day, no
bad food, no dirty meal, no failed day, no diet score, no punishment, no
guilt, and nothing that encourages obsessive logging… INSUFFICIENT DATA IS
AN ANSWER") and every generated insight (`coverageInsight`,
`proteinInsight`, `calorieConsistencyInsight`) is stated as a plain fact
about the diary, never a judgement, with its own sufficiency gate
(`MIN_LOGGED_DAYS`, `RELIABLE_COVERAGE_FRACTION`) refusing to speak below
threshold. `BodyMetricsScreen`'s suppression target is a DIFFERENT thing —
an inferred body-composition claim ("you are gaining muscle/losing fat"),
which is a materially higher-risk inference than "you hit protein on 6 of 7
logged days." Screen colours are adherence-neutral throughout
(`colors.success` on the on-target calorie bar is the one exception, and
the file's own comment at `:810-813` correctly identifies it as
theme-neutral factual state, not an ED-gated valence). No finding.

---

## MyRecipesScreen.js (`MyRecipes` — saved recipes modal, Pro)

PURPOSE: list/log/edit/delete the user's own composed recipes.

VERDICT: findings below; otherwise sound.

- **IA_DEFECT** — `src/screens/MyRecipesScreen.js` (whole file: no
  read-only "view contents" affordance exists). Its sibling screen,
  `src/screens/MyMealsScreen.js:213-220` and `:315-320`, gives every row an
  info-circle button that opens `SavedMealDetailSheet` — a read-only peek
  at exactly what's inside before committing to log it, added deliberately
  per `MyMealsScreen.js:73-76` ("L05-MM1 (design audit 2026-07-09, decision
  D6)"). `DiaryScreen.js:1673-1710` presents Saved meals and Recipes as two
  equal options in one chooser sheet ("Use a saved meal from your diary, or
  a recipe you built"), so the two are product-positioned as parallel
  surfaces — yet only one of the pair got the D6 inspect capability. A
  recipe row in `MyRecipesScreen.js:159-222` has exactly two ways to learn
  what's inside: "Log" (opens the servings-picker sheet, which shows no
  ingredient list, only the recipe name and a stepper) or "Edit" (navigates
  away into the full `RecipeBuilder` edit form). Neither is a non-committal
  peek: Log requires stepping into the log flow to see nothing extra, and
  Edit is a destination for editing, not viewing, and a poor way to "just
  check" a recipe someone else might have built for a shared account.
  CORRECTION: add the equivalent read-only inspect entry point to
  `MyRecipesScreen.js`'s row (matching `MyMealsScreen.js:213-220`'s
  info-circle button) opening a recipe equivalent of
  `SavedMealDetailSheet` (ingredient list + per-serving/whole-recipe
  totals, already computed via `perServingTotals`/`item.totals` at
  `MyRecipesScreen.js:183-187`), so the two "saved food collection"
  screens DiaryScreen presents as equals actually offer equal capability.

---

## MyMealsScreen.js (`MyMeals` — saved meals modal, Pro)

PURPOSE: list/log/rename/delete the user's own saved meal combinations.

VERDICT: **NO_CHANGE** (other than being the reference side of the
MyRecipesScreen finding above). `confirmLog`'s Undo path (`:114-126`)
correctly deletes every `entryIds` row a saved meal fanned out into, not
just the first — the header comment's stated risk is handled. The
info/inspect button (`:213-220`) is exactly the capability MyRecipesScreen
lacks; no action needed on this screen.

---

## RecipeBuilderScreen.js (`RecipeBuilder` — create/edit recipe modal, Pro)

PURPOSE: build or edit a recipe (name, servings, notes, ingredients), with
optional import-from-web.

VERDICT: **NO_CHANGE.** Authority: the live macro preview
(`macros = computeRecipeMacros(ingredients, Number(totalServings))`, `:162-165`)
is the only macro computation and it delegates to `lib/food/db.js`, never
computing Atwater/kcal arithmetic locally. `isUsableIngredient`/`onSave`'s
validation (`:274-301`) correctly blocks a save that `setRecipeIngredients`
would otherwise silently filter down to an unresolvable shell (FOOD-002),
matching the "never park a defect, surface it" law by refusing rather than
degrading. Import-from-web is explicitly best-effort and never blocks the
manual builder (`:184-236`), with an honest "check the amounts" toast
rather than a false-confidence success message.

---

## CalorieBankSheet.js (component; rendered by DiaryScreen)

VERDICT: **NO_CHANGE.** All safety maths (floor, band cap, refusal copy)
are imported from `lib/food/calorieBank.js` — the sheet is presentation +
preview only, exactly as its header comment states. The caller
(`DiaryScreen.js:1910-1922`) is the sole gate on when this sheet may open
(`bankingAvailable`), matching the component's own documented contract
("The caller is responsible for only opening this when banking is
allowed").

---

## MacroRings.js, FoodDetailSheet.js, MealSection.js, EmptyDiary.js,
## QuickAddSheet.js (components; rendered by Diary/FoodSearch)

VERDICT: **NO_CHANGE** on all five. Notable positive evidence, not a
finding: `MacroRings.js`'s ring/bar colours are explicitly adherence-neutral
by founder decision (`bandColour`, `:21-35`; macro-split % at `:199-213` is
labelled "purely factual… NOT a target judgement, carries no colour"), and
`QuickAddSheet.js:37-44` carries a fixed real regression (a kJ-unit user's
typed figure used to be stored verbatim as kcal, a ~4.18x inflation feeding
straight into adherence/ED-safety-consumed rollups) with the unit
conversion now applied correctly on save (`:74-88`).

- **Minor COPY_DEFECT (not filed as an action item)** —
  `src/screens/DiaryScreen.js:1564` ("Create today or the week from your
  targets. You review everything before it is logged.") and
  `src/components/food/EmptyDiary.js:46` ("Build a day or week from your
  targets. Nothing is logged until you add it.") describe the identical
  "Meal builder" entry point in two different sentences, in two mutually
  exclusive render states of the same screen (populated day vs. empty
  day). Both are accurate and calm; this is a missed opportunity for a
  single shared string, not a user-facing defect (a user only ever sees
  one of the two in a given day). Noted for completeness, no change
  recommended on its own — fold into a future copy-consolidation pass if
  one is run for this domain, not worth a dedicated commit.

---

## Authority-collision table (mandatory hunt)

| Surface | Decision rendered | Authoritative owner | Verdict |
|---|---|---|---|
| DiaryScreen macro rings/targets | day's effective kcal/macro target | `resolveEffectiveTargets` (`lib/food/effectiveTargets.js`), fed by `getNutritionTargets` (nutritionEngine-derived) + `displayBankedDelta` (`lib/food/calorieBank.js`) | **Class A** — factual re-presentation, no independent decision |
| DiaryScreen calorie-bank gate | whether banking may run today | `safeDayFloorKcal`/`targetWasFloored`/`edFlagOpen` — floor traces to `computeFFMFloor` (`nutritionEngine.js`) | **Class A** — correctly delegates the floor, only gates the UI on it |
| CalorieBankSheet preview/apply | per-day kcal redistribution | `planCalorieBank`/`maxApplicableBumpKcal` (`lib/food/calorieBank.js`) | **Class A** |
| MealPlanScreen day/meal/food totals | generated plan's kcal/macros | `lib/food/mealPlanService.js` (`swapMealInPlan`, `swapFoodInMeal`, `sumDayTotals` is pure re-addition of already-decided totals, not a new decision) | **Class A** |
| MealPlanScreen "stated vs observed" meal-count ask | whether to *suggest* changing `mealPlanMealsPerDay` | `lib/food/habits.js` `mealCountObservation`; never applies itself, always asks | **Class A** — an offer, not a decision |
| FoodSearchScreen / DiaryScreen Suggested tab | which food/meal to suggest next | `lib/food/mealSuggest.js` `rankSuggestions`, `lib/food/curatedMeals.js` `getCuratedCandidates` — one engine, multiple call sites | **Class A** |
| FoodInsightsScreen adherence/insights | "hit target on N of M days", trend charts | `lib/food/adherence.js` (`within`, `ADHERENCE_TOLERANCE`), `lib/food/insights.js` (`buildInsights`) — pure re-aggregation of logged rollups against the stored target, no new target/judgement invented | **Class A** |
| RecipeBuilderScreen macro preview | recipe kcal/macros per serving | `computeRecipeMacros` (`lib/food/db.js`) | **Class A** |
| AddCustomFoodScreen sanity check | "numbers look off" soft warning | `checkFoodSanity` (`lib/food/sanityChecks.js`) — plausibility only, never overrides what gets saved | **Class A** |

**Conclusion: no C/D/E authority defect found in Wave B.** Every
calorie/macro/target/adherence number rendered across all ten screens and
the six components read in full traces to exactly one of
`nutritionEngine.js`, `lib/food/calorieBank.js`, `lib/food/effectiveTargets.
js`, `lib/food/mealPlanService.js`, `lib/food/adherence.js`, or
`lib/food/insights.js` — never computed locally in a screen, and never
duplicated by a second independent algorithm the way Wave A's
MesocycleBuilderScreen deload banner duplicated `blockAdvisor.js`'s
recovery decision. This is the intended shape for the nutrition domain
(Campaign 17/17B's "one daily truth" law) and it held under this audit.

---

## CHANGE PLAN (ordered by risk)

1. **Lowest risk, ship first — `src/screens/ScanLabelScreen.js`.** Add the
   missing torch-toggle haptic (import `selection` from `../lib/haptics`,
   call it in the `onPress` at `:313-314`). One-line behavioural parity fix
   with an exact sibling precedent (`ScanBarcodeScreen.js:340`); no data,
   no authority, no ED-safety surface touched.
2. **Low risk — `src/screens/MealPlanScreen.js:276-277`.** Rename the
   "Meals per day" label and extend its help text to name the setting it
   actually controls and disambiguate it from Nutrition Targets' "Diary
   meals per day", mirroring the sentence already present at
   `NutritionTargetsScreen.js:1268`. Copy-only change; no logic, no schema,
   no store field renamed (`mealPlanMealsPerDay` itself is untouched).
3. **Moderate risk — `src/screens/MyRecipesScreen.js`.** Add a read-only
   "view contents" entry point (info-circle button + a recipe-shaped
   `SavedMealDetailSheet` equivalent), bringing it to parity with
   `MyMealsScreen.js`'s D6 capability. Requires a small new
   read-only-sheet component (or a light generalisation of
   `SavedMealDetailSheet` to accept a recipe's resolved ingredient list),
   but touches no write path, no authority module, and no other screen.

No changes recommended to: DiaryScreen.js, FoodSearchScreen.js,
AddCustomFoodScreen.js, ScanBarcodeScreen.js, FoodInsightsScreen.js,
MyMealsScreen.js, RecipeBuilderScreen.js, CalorieBankSheet.js,
MacroRings.js, FoodDetailSheet.js, MealSection.js, EmptyDiary.js,
QuickAddSheet.js.

---

## Candidate founder forks

None. All three findings have a single, unambiguous, lower-effort-than-
alternative correction each (a haptic call, a label/help-text edit matching
an existing precedent, and a component-parity addition with a direct
sibling to copy the shape from). None require a product-law judgement call
D33 delegation would need to rule on.
