# EAT / Meal Builder — Design & Usability Audit

**Date:** 2026-07-09
**Scope:** the full nutrition domain — DiaryScreen, MealNamesScreen, MealPlanScreen,
FoodSearchScreen, ScanBarcodeScreen, ScanLabelScreen, AddCustomFoodScreen,
MyMealsScreen, MyRecipesScreen, RecipeBuilderScreen, NutritionTargetsScreen,
PerDayTargetsScreen, FoodInsightsScreen, and the lib modules behind them
(`src/lib/food/`: `mealPlanAssembler.js`, `mealSwap.js`, `mealSuggest.js`,
`mealPlanService.js`, `perDayTargets.js`, `searchTabs.js`, `servingEntry.js`, `db.js`).

**Method:** every screen listed above was read in full (not skimmed); two
background research passes (Opus) independently audited the scan/custom-food/
saved-content surfaces and the targets/insights/meal-plan-engine surfaces,
each cross-checking prior audit claims against current code before reporting.
The single highest-value finding (§A1) was independently confirmed by both
the primary pass and a background pass, from the same line numbers.

**AUDIT ONLY.** No source files were modified. Findings in locked areas
(ED-safety, calorie floors, tier gating) are marked **LOCKED** and are
observations, never suggested changes.

---

## 0. Prior-audit verification (what's actually true in CURRENT code)

Before repeating anything, every headline claim in the three prior audits was
re-checked against the code as it stands today (2026-07-09):

| Prior claim | Source | Status now |
|---|---|---|
| F-1 Undo for delete/bulk | food-function-audit §5a | **CONFIRMED SHIPPED.** `DiaryScreen.js:846-862,979-996` — optimistic delete + Undo toast, single and bulk. |
| F-2 "Add again" one-tap relog at remembered portion | food-function-audit §5a | **CONFIRMED SHIPPED.** `FoodSearchScreen.js:385-425`, default tab is `recents` (`FoodSearchScreen.js:101`, `searchTabs.js:14`). |
| F-3 Copy from any date | food-function-audit §5a | **CONFIRMED SHIPPED.** `DiaryScreen.js:1062-1068,1676-1700` (recent-days picker), plus copy-yesterday now correctly gated on `yesterdayHasFood` (`DiaryScreen.js:1300`), fixing the world-class-audit's "dead tap for day-1 users" finding. |
| F-4 Recipe servings picker | food-function-audit §5a | **CONFIRMED SHIPPED.** `MyRecipesScreen.js:237-265` stepper, 0.5–20 servings. |
| F-6 Breakdown sheet jumps to meal | food-function-audit §5a | **CONFIRMED SHIPPED.** `DiaryScreen.js:775-783` (`jumpToMeal`). |
| F-7 Macro a11y live-region | food-function-audit §5a | **CONFIRMED SHIPPED.** `MacroRings.js:259` (`accessibilityLiveRegion="polite"`), `FoodDetailSheet.js:253`. |
| world-class-audit: day nav = 1 tap/chevron only, 8 taps for a week-old day | 03-nutrition.md #2 | **FIXED.** Date label opens a native date picker (`DiaryScreen.js:1120-1134`, `DiaryDatePicker`), plus a horizontal swipe gesture (`DiaryScreen.js:695-718`). |
| world-class-audit: three long-press affordances with a11y-hint only, no visible hint | 03-nutrition.md #4 | **FIXED.** Visible one-time `HintCaption`s for portion-edit long-press and water +500 long-press (`DiaryScreen.js:564-591,1340-1345,1800-1808`; `FoodSearchScreen.js:134-148,1003-1008`). |
| world-class-audit: saved meal/recipe logging = 6 taps + blocking confirm dialog | 03-nutrition.md #3 | **FIXED.** Saved meals now earn a slot-recent row and one-tap relog like any other food (`FoodSearchScreen.js:427-461`, comment cites "T1, world-class audit 2026-07-03"); no confirm dialog on the fast path. |
| food-function-audit P-1…P-7 engine gaps, "BUILD LOG" claims all seven shipped and wired | food-function-audit §5a | **PARTIALLY TRUE, PARTIALLY OVERSTATED.** See §A1/§A2 below — `diagnoseDayPlan` (P-4/P-5/P-6) and `proteinWithinTolerance` (P-2) are built in the engine but **not consumed by any screen**. This is the single biggest finding in this audit. |
| meal-library-conformance-audit: single-source `soy_protein`/`pea_protein` should be replaced by the report's `vegan_protein_blend` | meal-library-conformance-audit-2026-06-16 | **PARTIALLY FIXED.** Most vegan meals now use `vegan_protein_blend` (`curatedFoods.js:117`), but three meals still use single-source `soy_protein`: `curated_vg_overnight_oats`, `curated_vg_pre_soy_oats_banana`, `curated_vg_post_soy_banana_shake` (`curatedMeals.js:100,136,138`). Low priority, feeds the Suggested tab and meal-plan content quality. |

---

## 1. Standout finding — engine intelligence computed and then discarded

### A1 (Severity A). `mealPlanAssembler.js`'s per-day diagnosis never reaches the meal-builder UI

`assembleDayPlan` computes a rich, specific, actionable diagnosis for every
day that misses its target — `diagnoseDayPlan()` (`src/lib/food/mealPlanAssembler.js:255-301`),
called at `:914` and returned as `day.diagnosis` (`:934`), persisted in the
plan snapshot:

- Unfilled slots (a genuinely incomplete plan): *"We could not fill 2 meals
  from your current choices. Try fewer meals a day, or relax a food
  exclusion."* (`:268`)
- Oversized pinned meal: *"Your pinned meals alone come to 2,400 kcal, above
  this day's 2,100 kcal ceiling. Unpin one, or raise your target."* (`:274`)
- Calorie miss: *"This day lands about 180 kcal under target. Regenerate to
  try a different mix. Widening your food preferences would help."* (`:292`)
- Protein miss: *"Protein is about 22 g short. Regenerate, or add a
  higher-protein meal."* (`:299`)

Each carries a `severity` tier (`minor`/`moderate`/`major`) computed from how
far off the residual actually is.

`MealPlanScreen.js` never reads any of this. The only feedback a user sees
when a day misses is one static line, gated purely on the boolean
`day.withinTolerance`:

```
// MealPlanScreen.js:611-614
const honestyLine = useMemo(() => {
  if (!day || day.withinTolerance) return null;
  return 'Close. Your preferences make this day hard to hit exactly; the totals below are honest.';
}, [day]);
```

A user whose vegan + soya + gluten exclusions left a genuinely **unfillable
meal slot** sees the identical "Close..." sentence as a user who is 15 kcal
over target. The specific, correct next action the engine already computed
("try fewer meals a day", "unpin one, or raise your target", "widening your
food preferences would help") is silently thrown away. `grep -rn
"diagnosis" src/screens/MealPlanScreen.js` returns nothing.

This directly undercuts the food-function-audit's 2026-06-16 build-log claim
that P-4/P-5/P-6 shipped "oversized-pin call-out, restricted-pool hint,
severity tiers" — those exist in the engine only; the promised user-facing
payoff was never wired in.

**Also dead in the same family:**
- `proteinWithinTolerance` (P-2, symmetric protein band) — computed
  (`mealPlanAssembler.js:909,932`) but consumed **nowhere**, not even
  telemetry (`emitPlanMetrics` in `mealPlanService.js:48-55` omits it).
- `fatWithinTolerance` (P-1) reaches telemetry only
  (`mealPlanService.js:54`), never the UI or the swap/regenerate logic —
  the build-log's "surfaced to swaps/regenerate" claim is false for the UI.
- `perMealRelaxed`/`perMealBalanced`/`targetFloored` day flags and
  `closeOutIterations` (`mealPlanAssembler.js:939,949-951`) — same pattern,
  computed and discarded.

**Fix size: S.** No new engine work — `MealPlanScreen.js:611-614` needs to
read `day.diagnosis.hint` (falling back to the current generic line only
when `diagnosis` is absent) and differentiate `unfilled_slots`/
`pins_exceed_budget` from a near-miss. Highest value-for-effort item in this
whole audit.

---

## 2. Per-surface findings

### DiaryScreen.js

**D1 (Severity B).** `MealSection` is passed three write-affordance
callbacks it never uses. `DiaryScreen.js:1358-1360` wires:
```
onSavedMeals={() => addSavedMeal(slot.key)}
onScan={() => scanForMeal(slot.key)}
onQuickAdd={() => setQuickAddSlot(slot.key)}
```
into `<MealSection>`, but `src/components/food/MealSection.js`'s function
signature (`MealSection.js:16-28`) does not destructure `onScan`,
`onSavedMeals`, or `onQuickAdd` anywhere in the file (confirmed by grep — zero
matches in the component). The per-meal-card "action hub" renders only one
button, **Add food** (search) (`MealSection.js:127-139`). Scan is still
reachable via the screen-level FAB and quick-add/saved-meals via the Custom
tab inside FoodSearchScreen, so nothing is unreachable — but the
"quiet in-card hub" the file's own top-of-file comment describes ("search,
barcode scan, ... quick add sheet") is not what actually renders per meal
card. This is a genuine half-wired regression: dead props passed into a
component that silently ignores them.

**Strengths (verified, worth preserving as-is):** optimistic delete+Undo on
every delete path; slot-aware "usuals" one-tap chips on empty meal cards
(`DiaryScreen.js:608-678`); day swipe + date-picker jump + chevrons (three
ways to change day); per-meal "mark eaten" for planned/meal-plan scaffolding
(`MealSection.js:106-125`); calorie banking with an honest close-out note
when it's unavailable rather than silently disappearing
(`DiaryScreen.js:1428-1439`); read-only lapse view for free users that is a
plain fact, not a paywall nag (`DiaryScreen.js:1163-1183,1288-1294`).

**D2 (Severity C).** `MacroRings` (rendered at the top of every diary day) is
information-dense: day-type chip, kcal ring with remaining-first hero number
and planned overlay, an eaten/target secondary readout, up to four macro bars
(each with value/target, planned overlay, a sub-line, and a remaining
readout), plus a macro-% split footer. All of it is well-organised and
adherence-neutral (no colour judgement, matching CLAUDE.md's ED-safety
mandate — **LOCKED**, correctly implemented, not a finding to change), but a
first-time user gets a lot of numbers before they've logged their first food.

### FoodSearchScreen.js

**FS1 (Severity B).** Barcode scan, quick-add-calories, saved meals, and
recipes are all reachable only by tapping the tab literally labelled
**"Custom"** (`FoodSearchScreen.js:713-723`, `searchTabs.js:13-18`). A
first-time user looking to scan a barcode or log a saved meal has no reason
to associate those actions with a tab called "Custom" (which reads as
"create a custom food"). Diary's FAB still gets a user to barcode scan
directly, so scanning specifically isn't blocked, but quick-add, saved
meals, and recipes have no other entry point from this screen and are
mislabelled by the tab they live under.

**Strengths (verified):** default tab is Recent (matches MFP/Cronometer
convention); one-tap relog at the remembered portion with an Undo toast
(`:385-425`); personal-history re-ranking lifts favourited/recent/frequent
foods above generic database matches for a typed query
(`searchTabs.js:31-59`); "plate" multi-add lets a user stage several foods
and log them in one pass (`:104-110,351-367,466-515`), matching
MacroFactor's fastest workflow; offline vs genuine-no-hit is distinguished
via a connectivity probe rather than one generic "no results" message
(`:120-123,304-345`); the Suggested tab carries a calm "season to taste"
note so a suggested meal doesn't read as a fixed prescription
(`:888-899`).

### RecipeBuilderScreen.js

No severity-A/B findings. **Strengths:** "Import from web" reads a
schema.org Recipe from a pasted URL's JSON-LD and matches each ingredient to
the top food-search hit (`:165-221`) — genuinely ahead of most competitors
in this price tier; live per-serving and whole-recipe macro preview; save
validation blocks an empty or unresolvable recipe with a specific reason
rather than silently dropping rows (`:236-261`, comment cites "FOOD-002").
**C-level:** no drag-to-reorder of ingredients (remove-and-re-add only).

### MealPlanScreen.js (+ mealPlanAssembler.js, mealSwap.js, mealSuggest.js, mealPlanService.js)

**See §A1/A2 above — the standout finding for this surface.**

**A2 (Severity A, companion to A1).** An **unfilled slot** (a plan that
genuinely could not be completed — a real hole, not a near-miss) is
presented identically to a 3%-off near-miss, because both simply set
`withinTolerance = false` and the screen has one message for both cases
(`mealPlanAssembler.js:910,940`; `MealPlanScreen.js:611-614`). A
restricted-diet user (the exact case the prior audit's P-5 flagged as
"Medium-High" impact) gets no signal that a meal is actually missing from
their plan.

**MP1 (Severity B).** Meal-level swap opens a generous, style-diverse
chooser sheet (`handleSwapMeal`, `mealSwap.js:281-298`,
`MealPlanScreen.js:441-448,959-1002`) — a genuinely good pattern. Food-level
swap (tapping one ingredient inside a meal) instead silently substitutes the
single best match with no chooser (`handleSwapFood`,
`MealPlanScreen.js:477-511`, `swapFoodInMeal` called with no preference key,
`mealSwap.js:184-187` picks the first in-tolerance candidate even though
`findRoleAlternatives` can return up to 6, `mealSwap.js:118-140`). A user who
wants potato instead of rice specifically has no way to choose — they get
whichever alternative the engine picked, and can only try again by tapping
repeatedly and hoping. Inconsistent ergonomics between two swap affordances
on the same screen.

**Strengths (verified):** "repeat this day" onto another day of the same
week plan; a real grocery list with native share; a training/rest per-day
override that only revariants the single day answered, not an asserted
weekly pattern; "replace vs add alongside" logic that correctly never
deletes real eaten food when re-applying a plan (`handleLogDay`,
`MealPlanScreen.js:309-344`); season-to-taste additions surfaced both here
and in the diary once a meal is logged.

### ScanBarcodeScreen.js / ScanLabelScreen.js *(agent-verified, cited file:line)*

**SB1 (Severity B).** The two capture screens handle camera-permission-denied
and no-camera-device states inconsistently. ScanBarcode offers only "Open
Settings" on permission-denied and a bare title+back on no-device
(`ScanBarcodeScreen.js:186-210`) — a full dead end for a user who declines
camera access. ScanLabel offers "Type it in instead" in both equivalent
states (`ScanLabelScreen.js:255,268`). A barcode-scan user who declines the
camera permission is trapped; the sibling OCR screen is not.

**SB2 (Severity C).** No manual barcode-number entry exists anywhere in the
app — the only route around a camera that can't read a damaged/curved
barcode is to abandon to label-scan or custom-food. MFP/Lose It let you type
the EAN by hand.

**SL1 (Severity C).** "Skip name" on the OCR label flow is effectively
permanent — it writes a flag with no in-app way to clear it globally
(`ScanLabelScreen.js:46-51,210-215`), only a per-scan "Add a name" link.

**Strengths (verified):** barcode lookup is completeness-ranked (not
first-match) per the earlier D-2 build (`waterfall.js`); torch toggle and
connectivity-aware error copy on ScanBarcode; OCR degrades honestly when
MLKit isn't in the binary, routing straight to manual entry
(`ScanLabelScreen.js:329-370`).

### AddCustomFoodScreen.js *(agent-verified)*

**ACF1 (Severity B).** Serving size is grams-only. The form exposes only
"Serving (g)" / "Eaten (g)" (`AddCustomFoodScreen.js:307-311`) and always
saves `servingLabel` as `null`, despite `insertCustomFood` having a
`serving_label` column ready and waiting (`db.js:389,396`). Every named
competitor (MFP, Lose It, MacroFactor) supports "1 slice / 1 cup / 250 ml"
custom servings; here the schema anticipates it and the UI doesn't expose it.

**ACF2 (Severity B).** No computed calorie/macro preview for the actual
portion before saving — macros are entered per-100g, the eaten grams are a
separate field, and the resulting logged kcal is only computed at save time
(`:228-234`), never shown. A user can't sanity-check "this portion works out
to 320 kcal" before committing.

**ACF3 (Severity B).** The "Serving (g)" vs "Eaten (g)" fields sit side by
side with no explanatory text (`:307-311`) — a first-timer can't tell why
there are two gram boxes or which one drives what gets logged.

**Strengths (verified):** amber "not certain, check this" flags on
low-confidence OCR-derived fields; a duplicate-barcode banner offering to
log the existing food instead of creating a near-duplicate; a hard
finite/negative block plus a `checkFoodSanity` "Save anyway" gate for
plausible-but-unusual values.

### MyMealsScreen.js / MyRecipesScreen.js *(agent-verified)*

**MM1 (Severity B).** A saved meal's contents cannot be inspected before
logging, and cannot be edited at all. Tapping a row logs it immediately
(`MyMealsScreen.js:168-197`); the only other actions are rename and delete.
`db.js` exposes no item-level edit for a saved meal. Recipes, by contrast,
are fully editable via RecipeBuilder. A user who wants to "look inside" a
saved meal has no way to do that short of logging it and reviewing the
diary afterwards.

**MM2 (Severity B).** Both `MyMealsScreen.js:211-217` and
`MyRecipesScreen.js:213-219` show "Check your connection and try again" on a
load failure, but `listSavedMeals`/`listRecipes` are local encrypted-SQLite
reads (offline-first, per CLAUDE.md §1 "the local database is the source of
truth on device") — connectivity has nothing to do with a failure here, and
the copy actively misdirects the user toward the wrong fix. The same defect
recurs in `FoodInsightsScreen.js:347` for a local rollup read.

**MR1 (Severity B).** Recipe rows show servings and notes but no calories or
macros (`MyRecipesScreen.js:154-159`); `listRecipes` doesn't even select the
macro columns (`db.js:826-835`). MyMeals rows show kcal+protein per row; the
two "saved content" list screens are inconsistent with each other, and a
user can't judge or compare recipes without opening each one individually.

**X1 (Severity B, cross-cutting).** "Meal" is overloaded across three
surfaces with no in-app disambiguation: MyMeals = a saved bundle of foods;
MealNamesScreen renames diary meal *slots* (breakfast/meal_1/pre-workout);
AddCustomFood creates a "custom food" (not a meal at all). A user asked to
"rename my meals" could reasonably land on either MyMeals or MealNames and
find the wrong screen.

**C-level (agent-verified, listed together):** neither MyMeals nor MyRecipes
supports favourite/pin, manual reorder, or duplicate (`ORDER BY updated_at
DESC` only, `db.js:1016,832`) — the two screens meant to hold a user's
staples have no way to surface which ones matter most. MealNamesScreen gives
no save confirmation on rename (`MealNamesScreen.js:43-50`, silent
`onBlur`/`onSubmit`) and always shows pre/post-workout rename rows even for
users who never log peri-workout meals.

### NutritionTargetsScreen.js *(agent-verified + my own read)*

**Strengths (verified):** the "Set it for me" fast path collects only the
engine's true minimum inputs (sex/age/height/weight/goal) and produces a
usable target before the full form is ever shown
(`NutritionTargetsScreen.js:531-673`) — genuinely good progressive
disclosure; inline `InfoTooltip`s explain the calorie/macro maths in plain
language at the point of use; the calorie-floor banner, calm-mode goal
filtering (hides "Lose weight (fast)" under calm mode,
`:544,791`), and the one-tap "Ease this cut" that only ever *raises*
calories are all correctly implemented and **LOCKED** — not a finding to
change, noted only because they were specifically checked for weakening and
found intact.

**NT1 (Severity B).** `goal` and `proteinApproach` are not columns in the
cloud `nutrition_targets` schema — the rich "Why these targets" explanation
(phase description, protein-approach label) is reconstructed only from an
AsyncStorage copy written by the same save
(`NutritionTargetsScreen.js:276-293`). On a new device (DB row synced, no
local AsyncStorage), `goal`/`proteinApproach` come back `null` and the
explanation silently degrades to blanks/defaults. This is a data-portability
gap for a Pro feature that is otherwise well-explained.

**NT2 (Severity B).** The results view, once calculated, stacks roughly
eleven blocks in one scroll: hero+range+floor row, three-to-four macro
cards (each with per-kg ratio, category-colour bar, and %-of-kcal line), a
per-meal protein card with a 6-chip meal-count selector, a "Why these
targets" card with four expandable disclosures (default-expanded,
`:217`), a confidence row, a floor banner, an "Ease this cut" nudge, a
female-awareness card, and a "How was this calculated?" table. Individually
each block is well-designed and most content is behind a disclosure, but the
combined first read is long for a screen whose job is "tell me one number".

### PerDayTargetsScreen.js *(my own read)*

Clean, small, correctly respects the safety floor with a live clamp shown to
the user (`:91,119-132` — **LOCKED**, correctly implemented). Only reachable
via Settings (`SettingsScreen.js:128`), not from the Diary or Nutrition
Targets screen itself, despite Diary's per-day target logic reading these
offsets every day (`DiaryScreen.js:369-383`).

**PDT1 (Severity B).** Both per-day offsets (`perDayTargets.js`) and the
meals-per-day preference (`@volyume_meals_per_day` AsyncStorage key,
`NutritionTargetsScreen.js:231,237`) are device-local only, never synced to
Supabase. Unlike the nutrition target itself (DB + sync), a user's
weekend-eating plan and preferred meal split are lost on reinstall or a new
device — below the portability bar CLAUDE.md sets for Pro features, and
worth flagging because fixing it touches the sync-layer registry
(`src/lib/sync/`), a rule-flagged area per CLAUDE.md §1.

**PDT2 (Severity C).** The stepper shows no numeric value between its +/−
buttons (`formatValue={() => ''}`, `PerDayTargetsScreen.js:145`) — the
running total only updates in the row label to the left, so the control
itself reads as empty.

### FoodInsightsScreen.js *(agent-verified + my own read)*

**FI1 (Severity B).** Reachable only via Diary's icon-only "options" button
→ "Diary tools" sheet → "Trends and export" (`DiaryScreen.js:1070-1073,
1659-1673`) — two taps behind an unlabelled icon, with no persistent
Insights tab. The screen's own header comment admits this is a stopgap:
*"The Insights tab in the locked nav doesn't exist yet... we surface this
screen via a header button on Diary so the data is visible day one"*
(`FoodInsightsScreen.js:13-15`). This is a genuinely strong screen (see
below) that most users will never find.

**FI2 (Severity B, same defect as MM2/MR2).** Load-error copy says "Check
your connection and try again" (`:347`) for a failure in
`getRollupsForRange`/`getNutritionTargets`, both local SQLite reads.

**FI3 (Severity B).** Two cards plot the same series: a "Calorie trend" line
chart and a "Calories" per-day/weekly bar list both show logged calories
against the same target over the same window (`:381-459`) — redundant
information density with no second insight, where competitors show one.

**Strengths (verified):** window selector (7/14/30/90 days) with automatic
weekly-aggregation past 14 days so bars stay legible
(`:65-66,180-198`); a protein-consistency headline above the generic macro
block (behaviour-relevant metric surfaced first); adherence-neutral styling
throughout (no red/green valence, matches the ED-safety voice mandate —
**LOCKED**, correctly implemented); CSV **and** PDF export, the PDF framed
explicitly for sharing with a coach or GP (`:582-590`).

**FI4 (Severity C).** "THIS WEEK" always compares the last 7 vs prior 7
calendar days regardless of the selected window (`:256-273`) — selecting
90d leaves the headline fixed at a 7-day comparison, which is defensible but
inconsistent with every other card re-scoping to the window.

**FI5 (Severity C).** The fibre adherence aim is a flat 30 g for every user
regardless of body size or calorie intake (`FIBRE_AIM_G = 30`, `:72`),
anchored to the NHS Eatwell public reference since no per-user fibre target
exists — reasonable as a stopgap, coarse as an adherence signal.

---

## 3. Cross-cutting observations

- **Target-setting has three different names across three screens with no
  deep link.** FoodInsights says "Set your calorie target in Coach"
  (`:414,456`) — there is no "Coach" destination to tap. PerDayTargets says
  "Set your calorie target in Nutrition targets first" (`:110`) as plain
  text with no button. NutritionTargetsScreen itself is titled "Nutrition
  targets". A first-time user following the Insights hint hits a dead end.
- **Local-database read failures are consistently blamed on network
  connectivity** across MyMeals, MyRecipes, and FoodInsights (three separate
  screens, same wrong copy) — worth a single shared fix rather than three
  patches, since CLAUDE.md's error-handling convention
  (`logError`/calm toast) already exists and just needs accurate copy.
- **The ED-safety system was specifically checked for weakening across every
  surface in scope and found intact everywhere it appears**: calorie floors
  shown live and correctly clamped (PerDayTargets, NutritionTargets,
  DiaryScreen banking), calm-mode goal filtering, adherence-neutral colour
  in MacroRings and FoodInsights, and no report-bad-food/valence-scoring
  affordance anywhere in the capture screens. No LOCKED-area friction was
  found that needs surfacing to the founder in this pass beyond what's
  already correctly implemented.
- **MicronutrientPanel (MN-1)** is fully built, Pro-gated, collapsed by
  default with lazy resolution (`MicronutrientPanel.js:1-18`,
  `DiaryScreen.js:1237-1245`) — worth flagging only because CLAUDE.md's
  STATUS line (dated 2026-07-01) still lists "micronutrients/NRV = MN-1" as
  a decision-gated item that "MUST NOT start without a structured founder
  decision." The code shows it already shipped and dated with review
  comments through at least 2026-07-04. This reads as the STATUS line being
  stale rather than a process violation, but it's worth a founder
  confirmation that MN-1 was in fact decided, since the doc still says
  otherwise.

---

## 4. Prioritised top-10 improvement list

| # | Item | Surface | Size | Value | Locked-system contact |
|---|---|---|---|---|---|
| 1 | Wire `day.diagnosis.hint`/`reason`/`severity` into MealPlanScreen's honesty line instead of one static sentence (§A1/A2) | MealPlanScreen.js | **S** | Highest — makes already-built, specific, actionable guidance visible; directly closes the restricted-diet dead-end the prior audit flagged as Medium-High | None |
| 2 | Reconnect `onScan`/`onSavedMeals`/`onQuickAdd` to MealSection's per-meal action hub, or deliberately delete the dead props and the comment claiming they exist (§D1) | DiaryScreen.js / MealSection.js | **S** | Removes a real half-wired regression; founder call needed on which direction (restore 4-button hub vs simplify to search-only) | None — but per CLAUDE.md workflow rules this fork (restore vs simplify) is a founder decision, not a default |
| 3 | Give food-level swap the same chooser-sheet pattern meal-level swap already has (§MP1) | MealPlanScreen.js / mealSwap.js | **S–M** | Consistency + control parity with competitors that let you pick the specific substitute | None |
| 4 | Fix "Check your connection" copy on three screens where the failure is a local SQLite read (MyMeals, MyRecipes, FoodInsights) (§MM2/MR2/FI2) | MyMealsScreen.js, MyRecipesScreen.js, FoodInsightsScreen.js | **S** | Removes actively misleading guidance on every error path in these screens | None |
| 5 | Add named/household serving units + a portion-calorie preview to AddCustomFoodScreen, using the existing `serving_label` column (§ACF1/ACF2) | AddCustomFoodScreen.js, db.js | **M** | Closes the clearest below-competitor-par gap found in this audit; schema already anticipates it | None (additive UI over existing column) |
| 6 | Let a saved meal be inspected (and ideally edited) before logging, not just renamed/deleted (§MM1) | MyMealsScreen.js, db.js | **M** | Saved meals are meant to be the power feature for repeat eaters; currently a black box | None |
| 7 | Add manual barcode entry + "Type it in instead" on ScanBarcode's permission-denied/no-device states, matching ScanLabel (§SB1) | ScanBarcodeScreen.js | **S** | Removes a genuine dead end (camera permission declined = fully stuck) | None |
| 8 | Persist `goal`/`proteinApproach` on the cloud `nutrition_targets` row so the "Why these targets" explanation survives a device change (§NT1) | NutritionTargetsScreen.js, supabase schema | **M** | Data portability for a Pro-paid feature | **Database schema rule** — additive, idempotent migration per CLAUDE.md §2; founder applies manually to EU-Dublin |
| 9 | Sync per-day offsets and meals-per-day preference instead of AsyncStorage-only (§PDT1) | perDayTargets.js, sync layer | **M** | Same portability gap, one tier down in impact (planning-only, not a calorie target) | **Sync layer** — new table/registry entry, rule-flagged per CLAUDE.md §1; floor-clamping logic is unaffected and stays correct either way |
| 10 | Relabel or restructure FoodSearchScreen's "Custom" tab so scan/quick-add/saved-meals/recipes read as their own actions, not sub-items of "creating a custom food" (§FS1) | FoodSearchScreen.js | **S–M** | Discoverability; design-judgement call on the right structure, not just a copy fix | None |

**Also worth a founder look, not sized above:** FoodInsights is a strong,
well-built screen (protein-consistency headline, CSV+PDF export, window
selector) that is two taps behind an unlabelled icon with no persistent tab
(§FI1) — the file's own comments call this an interim state. Surfacing it
better is a navigation-architecture decision (adding a tab/entry point),
which CLAUDE.md's workflow rules require presenting to the founder as
options rather than defaulting to one, so it's flagged here rather than
sized as a single task.
