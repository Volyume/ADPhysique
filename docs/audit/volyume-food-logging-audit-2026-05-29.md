# Volyume food logging and recipe audit (2026-05-29)

Research brief: how the best food logging apps handle logging, recipe
creation, meal categorisation and recipe libraries, measured against
Volyume as built, with a prioritised proposal for a food and recipe
experience designed to beat all of them for Volyume's user.

Scope is derived from the repo. Locked exclusions are treated as fixed:
no AI photo logging, no paid food APIs at v1, adherence-neutral (no
good/bad food colouring), deterministic coach (no LLM), one app for
training and nutrition. Nothing below proposes adding any of those.

Verified against code on 2026-05-29 (HEAD `c971430`). Internal claims
are file-cited. Where the shipped record in `CURRENT_STATUS.md` and a
file disagree, the file wins and the point is flagged.

---

## Executive summary

Volyume already has a more complete and more honest food layer than most
people would guess: a real diary with denormalised macros, a five-source
lookup waterfall (local cache, live OpenFoodFacts, USDA), barcode and
label OCR, saved meals, a curated meal library whose macros are computed
from a fixed staple table rather than typed by hand, and a coach that
already moves nutrition targets off training data. The foundations are
strong and, on accuracy, ahead of the crowdsourced incumbents.

The gaps are about speed and follow-through, not foundations:

1. **Recipes are a dead-end.** You can build a recipe but there is no
   code path anywhere to log one. The builder even receives the meal
   slot and date but never writes an entry, and the recipes screen
   promises "log it as one line in your diary every time you eat it".
   This is the single most visible broken promise in the food layer.
2. **No quick-add.** Every competitor lets you log a bare calorie or
   macro figure when you cannot find the food or cannot be bothered.
   Volyume forces a full food record every time.
3. **One food at a time.** There is no multi-add or plate. MacroFactor,
   the speed leader, logs a whole meal in one pass; Volyume makes you
   open a sheet, set a serving and confirm for every single item.
4. **Re-logging is slower than it should be.** The pieces exist (recents,
   frequents, copy-to-date) but the one move users explicitly ask for,
   "repeat yesterday's breakfast", is not a single tap.
5. **The integration story is unfinished, not absent.** The coach already
   adjusts calories, volume, refeeds and carb cycling from training. No
   competitor does deterministic training to nutrition coupling in one
   app (MacroFactor keeps them as two apps on purpose). Volyume should
   own this loudly instead of leaving it implicit.

**The proposed approach in plain terms.** Keep the four fixed meal slots.
Keep the curated library and make it browsable, because computed-from-
staples accuracy is a genuine edge over the generic recipe libraries
users distrust. Then close the speed gaps in order: make recipes
loggable, add quick-add, add multi-add, and make re-logging a single
tap. Surface the training-aware numbers the coach already produces so the
diary feels intelligent. Deliberately skip AI photo logging, voice
logging, traffic-light food judgement and a giant generic recipe library.

**Top five build priorities.**

1. Make recipes loggable (Foundation). Touches `RecipeBuilderScreen`,
   `MyRecipesScreen`, `lib/food/db.js`.
2. Quick-add calories and optional macros (Foundation). Touches the
   diary add flow, `lib/food/db.js`, `resolveFoodRef`.
3. Multi-add plate logging (Core). Touches `FoodSearchScreen`,
   `FoodDetailSheet`.
4. One-tap re-log and repeat-a-meal (Core). Touches `DiaryScreen`,
   `FoodSearchScreen`, `lib/food/bulkEntryOps.js`.
5. Browsable curated library plus save-as-my-meal/recipe (Differentiator).
   Touches `FoodSearchScreen` Suggested tab, `lib/food/curatedMeals.js`.

---

## Phase 1: internal audit (from the code)

### Where food sits in the app

Diary is its own tab. The add flow is Diary, then "Add food" on a meal
slot, which opens `FoodSearchScreen` with the slot and date as params.
From there a row opens `FoodDetailSheet` (serving and slot), and confirm
writes one `food_entries` row. Barcode and label scanning branch off the
search and diary surfaces. Targets are set on `NutritionTargetsScreen`,
adherence is shown on `FoodInsightsScreen`, and the 7-day intake average
appears on `BodyMetricsScreen`.

### Screens (src/screens/)

- `DiaryScreen.js`: day view, date pager, macro rings, four meal
  sections, water, swipe-delete, long-press multi-select (delete, move
  slot, copy to date), per-meal macro breakdown sheet on ring tap.
- `FoodSearchScreen.js`: the picker. Browse subnav (Recents, Suggested,
  Favourites, Frequents, Custom) plus a persistent search box that now
  searches the database from any tab (changed 2026-05-29, `c971430`).
- `AddCustomFoodScreen.js`: manual food record, per-100g macros, sanity
  check, optional barcode/OCR prefill.
- `MyMealsScreen.js`: saved meal templates. Tap to log the whole meal
  (`applySavedMealToDiary`), rename, delete.
- `MyRecipesScreen.js`: lists recipes, tap opens the builder to edit,
  long-press deletes, FAB creates. No log action (see Recipes below).
- `RecipeBuilderScreen.js`: build/edit a recipe (ingredients via the
  search picker in `pickMode: 'recipe'`, servings, notes, live macro
  preview). Save only.
- `ScanBarcodeScreen.js` and `ScanLabelScreen.js`: camera barcode scan
  and on-device label OCR, both feeding the detail sheet or custom-food
  prefill.
- `NutritionTargetsScreen.js`: BMR/TDEE/activity/phase/goal/protein to
  targets; reads `nutritionEngine`.
- `FoodInsightsScreen.js`: 7-day kcal-vs-target and macro hit-rate, CSV
  export.
- `BodyMetricsScreen.js`: weight and measurements, plus a 7-day intake
  average and the adaptive daily-burn figure (shipped `50e5eb2`).

### Components (src/components/food/)

`MacroRings`, `MealSection`, `FoodRow`, `FoodDetailSheet`, `EntryRow`,
`ServingPicker`, `MacroBreakdownSheet` (wired to the ring tap in
`393b350`), `SourceChip`, `EmptyDiary`, `HeldDecisionCard`.

### Logic (src/lib/food/)

- `db.js`: all food SQLite. Diary CRUD, rollups, custom foods, favourites
  and dislikes, water, saved meals (`applySavedMealToDiary`), curated
  apply (`applyCuratedMealToDiary`), recipes (`createRecipe`,
  `updateRecipe`, `setRecipeIngredients`, `computeRecipeMacros`,
  `getRecipeWithIngredients`, `listRecipes`), frequents cache, and the
  sync row fetchers and cloud upsert helpers.
- `waterfall.js`: `searchFoods` and `resolveBarcode`, first-hit-wins
  across local cache, live OFF, USDA, with cache promotion of network
  hits into the local `foods` table.
- `sources/localCache.js`: `searchLocalByName` (foods plus custom_foods,
  custom ranked first), `findLocalByBarcode`, `resolveFoodRef` (now
  handles `global:`, `custom:` and `curated:`, the last from the static
  table, fixed `c971430`).
- `sources/liveOff.js`, `sources/usda.js`, `normalisers/usdaToFood.js`:
  network sources and unit normalisation.
- `curatedMeals.js` and `curatedFoods.js`: ~100 curated meals defined as
  staple-food keys plus grams, macros computed at runtime from an ~80
  food per-100g table (British staples, label-grade values). Diet filter
  (omnivore, vegetarian, vegan).
- `searchTabs.js`: `SEARCH_TABS` order and `selectTabRows` (2+ char query
  returns waterfall results from any tab).
- `mealSuggest.js`: rule-based, protein-first ranking of curated meals to
  the macros left for the meal. No LLM.
- `frequents.js`: 12-hour stale check and pull of the server-computed top
  20.
- `bulkEntryOps.js`: `deleteEntries`, `moveEntriesToSlot`,
  `copyEntriesToDate` for the multi-select toolbar.
- `sanityChecks.js`, `ocr.js`, `ocrParser.js`, `writeback.js`,
  `csvExport.js`, `seed.js`, `libraryDelta.js`: validation, OCR, OFF
  write-back queue, export, snapshot seeding, monthly library delta.

### Data model

Local SQLite (`lib/database.js`): `foods` (shared, read-only),
`custom_foods` (user), `food_entries` (the diary, macros denormalised at
log time so history never moves), `daily_intake_rollups`
(trigger-maintained totals), `saved_meals` (items as JSON),
`recipes` plus `recipe_ingredients`, `food_favourites` (with `kind` =
fav or dislike), `daily_water`, `food_frequents` (server-computed cache).
Cloud mirrors these via migrations 015/016 and follow-ons (021 composite
PKs, 022 telemetry, 023 custom-food barcode, 046 recipe-ingredient soft
delete, 048 favourite kind, 051 frequents, 052 water reconcile).

`food_ref` formats: `global:<uuid>`, `custom:<uuid>`, `curated:<key>`,
and the source-prefixed `off:` and `usda:` before cache promotion.
Notably, `food_entries` has **no name column**; the diary resolves names
from `food_ref` at display time. That is why curated items showed as
"Food" until `resolveFoodRef` learned the `curated:` scope (`c971430`).

### Recipes: build-only, cannot be logged

Verified directly. There is no `applyRecipeToDiary`, `logRecipe` or any
recipe-to-entries function anywhere in `src/`. `RecipeBuilderScreen`
receives `mealSlot` and `entryDate` but uses them only to pass through to
the ingredient picker; `onSave` calls `createRecipe`/`updateRecipe` plus
`setRecipeIngredients` and then `goBack()`. It never writes a
`food_entries` row. `MyRecipesScreen` tap goes to the editor, not a log.
So a user can build, edit and delete a recipe but has no way to eat one.
Meanwhile the recipes empty state reads "Build a recipe once. Log it as
one line in your diary every time you eat it." The promise is shipped;
the feature is not. The threaded slot and date strongly suggest a
save-and-log path was designed and never finished.

By contrast saved meals and curated meals both have working fan-out
loggers (`applySavedMealToDiary`, `applyCuratedMealToDiary`) that iterate
items into `food_entries`. The recipe gap is an inconsistency, not a
missing primitive.

### Meal categorisation: four fixed slots

`breakfast`, `lunch`, `dinner`, `snack`, hardcoded in `DiaryScreen`,
`FoodSearchScreen` (`MEAL_LABELS`) and `FoodDetailSheet` (`MEAL_SLOTS`),
and enforced by a CHECK constraint on `food_entries.meal_slot`. The
locked spec mentions renameable slot names, but there is no
`mealSlotNames` anywhere in the code, so rename is not shipped. No custom
or freeform categories.

### Quick-add: none

Every entry needs a resolvable food and macros. `logFoodEntry` requires a
`food_ref`; `AddCustomFoodScreen` creates a full per-100g custom food.
There is no calories-only or macros-only ad-hoc entry.

### Other gaps and notes

- No multi-add or plate. `FoodDetailSheet` logs one item per confirm.
- No recipe URL import, no recipe search, no recipe sharing.
- Re-log primitives exist (recents, frequents, `copyEntriesToDate`) but
  no single-tap "repeat this meal".
- Bundled OFF and CoFID snapshot steps of the waterfall are deferred; the
  live OFF and USDA steps carry lookups for now (per the move docs).

---

## Phase 2: competitor research (live, 2026)

### MacroFactor (the speed and accuracy leader)

Five logging methods in one unified logger: barcode and label scan,
search, quick-add, Describe (AI text), and custom foods or recipes. The
food log is timeline-based. The headline is speed: MacroFactor publishes
a Food Logging Speed Index and claims the fastest workflow tested against
20 loggers. The mechanics behind that claim are the interesting part:

- **Multi-add plate.** Tap the small plus on a search row to drop its
  default serving onto a minified plate at the top, keep adding, then
  open the plate, adjust quantities and tap "Log Foods". A swipe gesture
  also exposes the multi-add button. You build a whole meal then log it
  in one pass.
- **Favourites bar with presets.** Heart a food and it appears in a
  favourites bar with the exact serving you chose, one tap to log. You
  can save multiple presets of the same food, each its own one-tap entry.
- **Curated, reviewed database** that is smaller than MyFitnessPal but
  more reliable because entries are checked, plus custom foods and recipes
  in a Custom tab.
- **Recipe creator** with description and preparation steps; AI can group
  a logged plate into a recipe with an in-context per-ingredient editor.
- Deliberately keeps Workouts and Nutrition as **separate apps** that
  share body metrics, and states that deeper training-to-nutrition
  integration would be future and intentional, not automatic.

### MyFitnessPal

Largest database but crowdsourced, with well-known accuracy variance and
duplicate entries. Recipe importer parses a recipe from a pasted URL.
"Remember Meals" lets you save a selection of diary items as a named meal
that then appears under a Meals tab. "Quick Tools" under a meal copies the
whole meal to or from another date; check-boxes copy individual items
across meals. Known 2025-26 issues include recipe save/scroll/paging
bugs. Limitation: no logging to multiple days at once.

### Cronometer

Accuracy-first. Three distinct objects: custom foods (manual nutrients),
custom meals (a reusable bundle of items), and custom recipes (a cooked
dish with multiple servings). Recipes import from a pasted URL or pasted
text. The standout is "Set Cooked Recipe Weight": after cooking you weigh
the dish and enter the real weight so per-portion macros are honest.
Photo and voice logging are Gold features. Strong on micronutrients.

### Lose It

Clean, fast, modern interface; barcode scan; 34M crowdsourced foods with
the usual accuracy caveats. Quick-add macros exists but is locked behind
Premium and users report it is hard to find. Photo logging is pushed
hard, with a marketing claim of 3.5x faster entry.

### Yazio

4M foods, barcode, recents and favourites, AI photo logging (Pro, late
2025). The differentiator is a curated recipe library: 2,500 to 2,900
goal-friendly recipes with low-carb, vegetarian and vegan filters, plus
weekly meal planning. Praised when used, but a recurring complaint is
"too many screens to log a meal".

### MyMacros+

Built by a bodybuilder for athletes. Different macro targets per day of
the week (training vs rest). Recipes carry prep time, cook time,
difficulty, instructions and photos. Barcode, label and AI scan combined.
One-off price. No adaptive coaching; for people who know their numbers.

### Carbon Diet Coach (Layne Norton)

Coaching-led, four-item navigation (Diary, Coach, Me, Settings) praised
for not overloading. Custom foods and recipes, barcode scan, flexible
dieting with no good/bad food labelling. About 10% of scanned barcode
data reported inaccurate. No free trial.

### Noom

Photo, voice and text logging. Traffic-light colour system (green, yellow,
orange) that judges foods. A specific user-requested feature is the
ability to swipe a whole meal from yesterday into today in one move, which
it lacks. Logging is reported as time-consuming.

### What even the best get wrong

- **Crowdsourced database accuracy** (MyFitnessPal, Lose It, Carbon).
- **Too many taps and screens to log** (Yazio, Lose It quick-add buried).
- **No one-move repeat-yesterday** (Noom users ask; MyFitnessPal copies
  one date at a time).
- **Generic recipe libraries are distrusted.** "Chicken, cooked" hides a
  large macro range by cut and preparation; users do not trust pre-built
  recipe macros. Volyume's compute-from-staples model sidesteps this.
- **Food judgement systems** (Noom's colours) conflict with an
  adherence-neutral philosophy.

---

## Phase 3: comparison matrix

Lead = clearly best in class. Match = on par. Lag = behind. Gap = absent.

| Dimension | Volyume (as built) | Verdict | Notes |
|---|---|---|---|
| Logging speed and friction | One food per confirm, no plate, no quick-add | **Lag** | MacroFactor multi-add and favourites bar are the bar. |
| Meal categorisation | Four fixed slots | **Match** | Same as all majors; rename not shipped. Fine for the user. |
| Recipe creation | Solid builder (ingredients, servings, live macros) | **Match** | On par with manual builders; no URL import. |
| Recipe logging | None: build-only | **Gap** | Cannot log a recipe at all. Worst single gap. |
| Recipe library (pre-built) | Curated meals, macros computed from staples | **Lead on accuracy** | More trustworthy than Yazio's generic recipes; not browsable yet. |
| Food database quality | OFF + USDA + (deferred) CoFID, custom, curated | **Match/Lead** | Curated and custom are accurate; live coverage matches. |
| Portion and scaling | Per-100g serving picker | **Match** | No recipe scaling or cooked-weight. |
| Quick-add options | None | **Gap** | Every competitor has one. |
| Re-log and reuse | Recents, frequents, saved meals, copy-to-date | **Match** | No single-tap repeat-yesterday. |
| Training to nutrition integration | Coach adjusts calories, volume, refeed, carb cycle | **Lead** | Nobody else does deterministic coupling in one app. |
| Food judgement / adherence neutrality | Neutral by design | **Lead** | Deliberate edge over Noom-style colouring. |
| Overall UX clarity | Clean, but speed gaps show | **Match** | Foundations strong; follow-through missing. |

---

## Phase 4: proposed solution

Designed for Volyume's user: training-focused, goal-oriented, wants speed
and clarity over breadth. Synthesised from the research, not copied from
any one app, and kept inside the locked scope.

### Meal categories: keep four fixed slots

Every leading app uses breakfast, lunch, dinner and snack, and custom
categories add friction the target user does not need. Keep the four.
Optional later: allow renaming the labels (already half-specified), low
priority. Do not add a traffic-light or good/bad colour layer; it
contradicts the adherence-neutral lock and is a known Noom complaint.
Evidence: every competitor; Noom colour backlash.

### Logging flow: from open to confirmed entry

Target the MacroFactor speed model while keeping Volyume's accuracy.

1. Diary, tap "Add food" on a slot (existing).
2. `FoodSearchScreen` opens on Recents with the search box ready
   (existing, improved `c971430`).
3. **New: multi-add.** A plus on each row drops the default serving onto
   a plate chip at the top. Keep adding from recents, search results,
   favourites or curated meals. Tap the plate to review and adjust
   quantities, then "Log foods" writes them in one pass. Reuses
   `logFoodEntry` per item.
4. Single item still works exactly as now via the detail sheet.
5. **New: quick-add.** A "Quick add" affordance on the diary slot logs a
   bare kcal figure with optional protein, carbs and fat, no food record
   required, for when the food is not found or detail does not matter.

Evidence: MacroFactor multi-add and favourites; Yazio and Lose It
friction complaints; Lose It's hidden quick-add (so make Volyume's
visible). Touches `FoodSearchScreen`, `FoodDetailSheet`, the diary slot
header, `lib/food/db.js`.

### One-tap re-log

Add a "repeat" affordance: from a diary meal, copy that meal to today (or
another day) in one move; and surface recents and favourites with their
last-used serving so a tap re-logs without opening the sheet. The
primitives exist (`copyEntriesToDate`, frequents, favourites); the gap is
the single tap. Evidence: Noom's explicitly requested swipe-yesterday;
MyFitnessPal copy-meal. Touches `DiaryScreen`, `FoodSearchScreen`,
`bulkEntryOps.js`.

### Recipe creation: keep the builder, fix the dead-end

The builder is good. The fix is to make a recipe loggable, closing the
broken promise. Recommended shape, reusing the working saved-meal pattern:

- Add `applyRecipeToDiary(userId, recipeId, { mealSlot, entryDate,
  servings })` that scales each ingredient by servings eaten and fans the
  ingredients into `food_entries`, exactly like `applySavedMealToDiary`.
- Wire a "Log" action on `MyRecipesScreen` rows and a "Save and log" on
  the builder (the slot and date are already threaded in).
- Phase two option: show the fanned ingredients grouped under the recipe
  name in the diary for the "one line" feel, via a recipe label on the
  entries. Keep ingredient-level entries so edit and macro accuracy stay
  intact.

Evidence: Cronometer and MyMacros+ recipe logging; the in-app promise.
Touches `RecipeBuilderScreen`, `MyRecipesScreen`, `lib/food/db.js`.

### Recipe library: lean into curated meals, make them browsable

Volyume already has the trustworthy version of Yazio's recipe library:
~100 curated meals with macros computed from a fixed staple table, so no
"chicken, cooked" ambiguity. Improvements:

- Make the Suggested tab browsable, not only macro-ranked. Let the user
  filter by slot and diet and scroll the library, the way Yazio's filters
  work, while keeping the protein-first ranking as the default order.
- Add "Save as my meal" and "Save as recipe" from a curated meal so a
  user can adopt and then tweak one. This connects the library to the
  personal saved-meal and recipe loops and drives reuse.

Evidence: Yazio curated library praised; generic-recipe accuracy
distrust; MacroFactor save-from-plate. Touches `FoodSearchScreen`,
`curatedMeals.js`, `lib/food/db.js`.

### Scaling and portion honesty

Recipe logging takes a servings count (above). Optional differentiator,
borrowed from Cronometer: a "made X g, ate Y g" entry on a recipe so the
per-portion macros reflect the real cooked weight. Medium effort, high
trust payoff for the cooking user. Touches `RecipeBuilderScreen` and the
recipe log action.

### Quick-add and power-user shortcuts

- Quick-add (above) is the main one.
- Favourites with a remembered serving, one tap to log.
- Multi-add plate doubles as a power-user batch tool.
- Keep barcode and label OCR as the fast paths they already are.

### Integration with the rest of Volyume (the differentiator)

This is where Volyume should win outright. The coach already writes
training-aware nutrition: training-day vs rest-day carb cycling, refeed
days, calorie and volume applies, all confirm-then-apply. The diary
already swaps the day's targets when a cycle or refeed applies, and Body
Metrics now shows the adaptive daily burn. The work is to make this
legible and to lead on it:

- Show the training context on the diary day (training day vs rest day
  chip already exists for cycling; extend the framing) so the user sees
  why today's target differs.
- Tie the curated suggestions to the day's remaining macros (already
  done) and say so plainly.
- Market the single fact no competitor can match: your training changes
  your numbers automatically, in one app. MacroFactor split this across
  two apps on purpose; Volyume should not.

Respect the lock: no automatic pre/post-workout meal detection (the
curated engine deliberately avoids it). Touches `DiaryScreen`,
`HomeScreen`, copy.

### What every other app gets wrong that Volyume should keep doing

- Accuracy by construction: curated macros computed from staples, diary
  macros denormalised at log time. Keep both.
- Adherence neutrality: no food judgement colours. Keep it.

### What to deliberately leave out, and why

- **AI photo logging.** Locked exclusion, and the accuracy and trust
  concerns are real. Skip.
- **Voice logging.** LLM-adjacent, out of the deterministic-coach scope.
  Skip.
- **Traffic-light food colouring.** Contradicts adherence neutrality.
  Skip.
- **A giant generic recipe library.** Users distrust generic recipe
  macros; the curated computed-from-staples library is the better bet.
  Skip the bulk library.
- **Recipe URL import.** Useful but needs parsing infrastructure and
  collides with the no-paid-API and on-device constraints; the curated
  library plus manual builder cover the need. Defer, revisit later.
- **Custom or freeform meal categories.** Friction with no demand from the
  target user. Skip.

---

## Phase 5: prioritised build recommendations

Scored Impact times Effort. Grouped Foundation, Core, Differentiator.

### Foundation (must exist before the rest pays off)

1. **Make recipes loggable.** Impact high, effort medium. Add
   `applyRecipeToDiary` (fan-out, scaled by servings, mirrors
   `applySavedMealToDiary`), a Log action on `MyRecipesScreen`, and Save
   and log on the builder. Fixes a shipped dead-end and a broken in-app
   promise. Dependency: none (primitive pattern already exists).
2. **Quick-add.** Impact high, effort low-medium. A bare kcal plus
   optional P/C/F entry. Needs a `quick:` `food_ref` that `resolveFoodRef`
   renders as "Quick add" (or a stored label), so the diary shows it
   cleanly. Dependency: none.

### Core experience (what makes it genuinely useful and fast)

3. **Multi-add plate.** Impact high, effort medium. Add a plus-to-plate on
   search and browse rows, a plate chip, a review step, then one "Log
   foods". Dependency: builds cleanly on the existing row and detail
   components.
4. **One-tap re-log and repeat-a-meal.** Impact high, effort medium. A
   repeat action on a diary meal (copy to today) and one-tap re-log of a
   recent or favourite with its last serving. Dependency: reuses
   `bulkEntryOps` and favourites; pairs well with item 3.

### Differentiators (what makes it better than the field)

5. **Browsable curated library plus save-as-my-meal/recipe.** Impact high
   (understanding and word-of-mouth), effort medium. Filterable, scrollable
   Suggested tab; adopt-and-tweak into saved meals or recipes. Dependency:
   the save-as-recipe loop is stronger once item 1 ships.
6. **Recipe cooked-weight scaling.** Impact medium, effort medium. "Made X,
   ate Y" for honest portions. Dependency: item 1.
7. **Training-aware diary surfacing and the integration story.** Impact
   high, effort low-medium (much is already shipped). Make the
   training-day reasoning visible and lead the product narrative on it.
   Dependency: none; mostly copy and surfacing.

Suggested order: 1, 2, 3, 4, then 5, 7, 6.

---

## Open questions

1. Was a recipe save-and-log path started and dropped? The threaded
   `mealSlot`/`entryDate` in the builder and the empty-state copy imply
   yes. Confirm intended behaviour: log as fanned ingredients, or as a
   single collapsed line.
2. Should quick-add entries count toward the curated suggestion engine and
   adherence stats, or be excluded as low-information? Product call.
3. Renameable meal slots: ship the locked-but-unbuilt rename, or drop it
   from the spec? Low priority either way.
4. Curated library size: is ~100 meals enough to feel like a library when
   browsable, or does it need expansion? It is computed-from-staples, so
   growth is cheap.
5. Recipe URL import: genuinely wanted, or does the curated library plus
   manual builder cover it for this user?

---

## Appendix

### A. Internal file references

- Diary and entries: `src/screens/DiaryScreen.js`,
  `src/components/food/EntryRow.js`, `MealSection.js`, `MacroRings.js`,
  `MacroBreakdownSheet.js`.
- Picker and search: `src/screens/FoodSearchScreen.js`,
  `src/lib/food/searchTabs.js`, `waterfall.js`, `sources/localCache.js`,
  `sources/liveOff.js`, `sources/usda.js`.
- Custom and scan: `src/screens/AddCustomFoodScreen.js`,
  `ScanBarcodeScreen.js`, `ScanLabelScreen.js`, `src/lib/food/ocr.js`,
  `ocrParser.js`, `writeback.js`, `sanityChecks.js`.
- Meals and recipes: `src/screens/MyMealsScreen.js`, `MyRecipesScreen.js`,
  `RecipeBuilderScreen.js`, recipe and saved-meal functions in
  `src/lib/food/db.js`.
- Curated library and suggestions: `src/lib/food/curatedMeals.js`,
  `curatedFoods.js`, `mealSuggest.js`, `frequents.js`.
- Targets, insights, body: `src/screens/NutritionTargetsScreen.js`,
  `FoodInsightsScreen.js`, `BodyMetricsScreen.js`,
  `src/lib/nutritionEngine.js`, `src/lib/coachApply.js`.
- Schema: `src/lib/database.js` (food tables); `supabase/` migrations 015,
  016, 021, 022, 023, 046, 048, 051, 052.
- Locked specs: `docs/FOOD_DATA_STRATEGY_LOCKED.md`,
  `docs/UI_FLOWS_LOCKED.md`, `docs/DATABASE_SCHEMA_LOCKED.md`,
  `docs/MOVE_1_FOOD_FOUNDATION_AND_FFM.md`,
  `docs/MOVE_1_5_BARCODE_AND_OCR.md`.

### B. Competitor sources (live, 2026)

- MacroFactor, fastest food logging workflows:
  https://macrofactor.com/new-food-logger/
- MacroFactor, multi-add foods:
  https://help.macrofactorapp.com/en/articles/40-multi-add-foods
- MacroFactor, favourite foods:
  https://macrofactor.com/favorite-foods/
- MacroFactor, AI food logging:
  https://macrofactor.com/macrofactor-ai/
- MacroFactor, is it still the fastest (FLSI 2025):
  https://macrofactorapp.com/best-food-logging-app/
- MacroFactor, separate Workouts app:
  https://macrofactor.com/workouts/
- MyFitnessPal, copy a meal to another day:
  https://support.myfitnesspal.com/hc/en-us/articles/360032622131
- MyFitnessPal, recipe importer (apps):
  https://support.myfitnesspal.com/hc/en-us/articles/360032623231
- MyFitnessPal, copy and remember meals:
  https://blog.myfitnesspal.com/copy-and-remember-meals/
- MyFitnessPal, known iOS issues:
  https://support.myfitnesspal.com/hc/en-us/articles/360032274552
- Cronometer, custom meals and recipes:
  https://cronometer.com/features/custom-meals-and-recipes.html
- Cronometer, log food faster:
  https://cronometer.com/blog/log-food-fast/
- Cronometer, custom recipes (cooked weight):
  https://support.cronometer.com/hc/en-us/articles/28780966141204
- Lose It, review (quick-add, photo):
  https://ikanabusinessreview.com/2025/07/lose-it-app-review-can-this-app-help-you-lose-weight/
- Lose It vs MyFitnessPal (quick-add friction):
  https://randaderkson.com/myfitnesspal-vs-lose-it-app/
- Yazio, curated recipe library and reviews:
  https://www.hotelgyms.com/blog/yazio-nutrition-app-review
- Yazio, App Store listing:
  https://apps.apple.com/us/app/ai-calorie-tracker-by-yazio/id946099227
- MyMacros+, recipes and per-day macros:
  https://getmymacros.com/
- Carbon Diet Coach, how it works:
  https://www.joincarbon.com/how-it-works
- Carbon Diet Coach, review (data accuracy):
  https://feastgood.com/carbon-diet-coach-review/
- Noom, photo/voice/text logging:
  https://www.noom.com/support/faqs/using-the-app/logging-and-tracking/food-and-water/2025/10/how-to-log-meals-using-photo-voice-or-text/
- Generic recipe accuracy concerns:
  https://www.nutrola.app/en/blog/recipe-apps-that-actually-calculate-accurate-nutrition-not-estimates

### C. Verification caveats

- The internal inventory was assembled from a code walk plus a research
  sub-agent. Two claims that drive the proposal were verified directly in
  the code: recipes have no log path anywhere, and meal slots are
  hardcoded with no rename in the codebase.
- Where the sub-agent's notes leaned on stale GAP rows (for example
  treating the macro-breakdown sheet or saved-meals UI as unshipped), the
  shipped record in `CURRENT_STATUS.md` and the files were treated as
  authoritative: the breakdown sheet shipped in `393b350`, saved meals in
  `310575a`.
- Competitor detail is from vendor help pages, App Store listings and
  reviews as of 2026; specifics such as database sizes and FLSI rankings
  shift over time.
