# Food level-up: the assessment, the rulings and the plan (the lead, 2026-10-16)

Register: D230. Sources read in full: `00-BRIEF.md` (the founder's words), `01-INVENTORY.md` (the read lane, file and line), `02-COMPETITOR-RESEARCH.md` (the research lane, with its source tags). Judged hands-on by the lead at `main` 9fb87f9 and the branch head bae817c: DiaryScreen.js 1455-1580, 1676-1736, 1790-1902, 2218-2292; MealSection.js 140-340; EntryRow.js 100-140; FoodRow.js 80-130; FoodSearchScreen.js 905-970; FoodDetailSheet.js 283-350; MacroRings.js 300-380; servingEntry.js; searchTabs.js; food/db.js 100-200; the house parts Card, Chip, Stepper, WindowChips, SegmentedControl, NavRow, FeatureRow, SectionLabel; the two pinned suites `DiaryScreen.dailyWorkspace.test.js` and `DiaryScreen.foodLogTapCount.guard.test.js`.

Labels: OBSERVED is in the cited file or lane; RULED is the lead's D33 decision with its reason; FOUNDER marks anything only the founder can answer.

---

## 1. The gap, in one page

The founder still logs in MyFitnessPal. The research says the two apps' data sources are the only thing Volyume cannot match (brief: "other than data source"), and the inventory says every logging method the two apps charge for already exists here free (inventory section 10). So the gap is not features. It is what the founder named: "lagging and a bit of a bolt on". Read against the rest of the app, the food area departs from the house in five ways that add up to that feeling.

1. **The first food of every day is the hardest.** An empty day replaces the whole workspace with a card that offers "Add food", "Copy yesterday" and the meal builder (DiaryScreen.js 1681-1689). The one-tap usual chips, "Yesterday's Meal 1" and the hour's suggestion appear only once the day has an entry (MealSection.js 184-217; the suite says so at dailyWorkspace.test.js 140-143). MyFitnessPal's old diary and MacroFactor both open on the same workspace every day. This is the single largest usability defect and it is structural, not a founder ruling (the suite's own comment calls it "the existing diary structure").
2. **The add path is a general-purpose form, not a logger.** The logger's grammar is one action, the fewest words, the next thing in view. The add sheet stacks up to ten blocks (FoodDetailSheet.js 283-505), search rows show one calorie figure and no macros or portion (FoodRow.js 91-99), the screen never says which meal or which day it is logging to, and the plate's multi-add closes with no toast and no Undo (FoodSearchScreen.js 443-492).
3. **The chrome is hand-rolled where house parts exist.** Card is used once on the Diary; the tab strip, the steppers, the chips, the window chips, the feature rows and the day-tools rows are each a local copy (inventory 5.1 items 1 to 7). The result reads as a different app because it is drawn by different code.
4. **Amber and explanation break the house rules.** Seven amber elements sit on a populated Diary (ring, protein bar, "+N planned", chip glyphs, water icon and fill, the FAB) against "amber only on an action, at most one per screen, never on a fact" (NavRow.js 9-13), and standing explainers remain where the logger's ruling is "explanation is on-demand only" (ActiveWorkoutScreen.js 161-172).
5. **The small things that make a logger feel instant are missing.** Targets under 48 dp on the one-tap controls (usual chips about 26 dp, search tabs about 40 dp), no heading roles on the busiest screen, a lost update on water, every mutation re-running an eight-read load, copy writing planned rows as eaten, errors that drop their cause, and copy that is clipped or abbreviated ("Couldn't log.", "12P 30C 5F", "Frequents", "P 30% - C 40% - F 30%").

What MyFitnessPal and Cronometer users are leaving over (research section 6) is the mirror of this list: a diary that hides the day, extra taps, a barcode paywall, ads, confetti, and search that no longer finds a plain egg. Volyume has none of the paywalls and none of the noise. Once the five departures are closed it is the better daily logger on every axis but the database, and the research's fifteen "what beats them" items (section 9) are the measure: twelve are built here in full, two are built with their cloud migrations written and held for the founder's phrase (notes, custom portions), and one is declined with the reason (section 6 below).

---

## 2. What binds this build (read before any lane starts)

OBSERVED, from the inventory's section 0 and the code:
- The ED-safety system in full. The eleven gates in inventory 3.1 are not touched by any lane: the fail-closed flag read, the banking gate and its floors, the plan-edit floors, the meal-reminder suppression, Insights quiet mode, the NutritionTargets suppression, the presentation law (neutral ring, "over" in the same ink, no micronutrient colour-coding, no limit concept), the intake bounds, "planned is not eaten", and the absence of calm-mode display gating on the Diary itself (which stays absent: the Diary shows the day's intake in every state).
- Meal cards are canonical; the flat timeline is never re-proposed (TASKBOARD section 4).
- MacroRings render first and unconditionally (D75, DiaryScreen.js 1540-1544). Never hidden, never moved below the meals.
- No standing education row in the Diary (founder 2026-08-17); no "hold to select several" caption (founder 2026-07-13).
- D12 and D22 16b: vitamins and minerals are per-food and weekly, never a daily Diary surface.
- Insights law (insights.js 2-15): no dashboard of clever statistics; no score, streak, cheat or guilt.
- One daily truth (effectiveTargets.js 4-12): no per-day targets; only the person's own calorie bank moves a day.
- TAP_BUDGET = 3 for Add food, tap a result, Add to diary (foodLogTapCount.guard.test.js). This build LOWERS tap counts on other paths and never raises this one; where a lane changes the anchors the regex matches, it re-points the guard to the same three taps and leaves the number at 3.
- AI photo and voice food input are HELD (TASKBOARD section 4). Nothing here uses a model, a camera for meals, or a microphone. The one typed helper in Wave 3 is a deterministic parser over the person's own foods and the local library, with an editable list before anything logs.
- Cloud schema: additive, idempotent, applied only under the founder's exact phrase. Two migrations are written in Wave 4 and HELD; the app pushes the new columns only behind a flag that stays off until the apply (the ENTRY_TYPED_PUSH pattern).
- No new dependency. `expo-document-picker` 14.0.8 and `expo-file-system` are already installed (package.json 96-97), so the import lane needs nothing new.
- British English, calm, no shame, no em dash, no clipped commands, no "AI talk", no collaborative "we" for a coaching decision.
- The "do not copy" list in research 8.3 stands in full: no red or "over" colouring, no five-week projection, no exercise calories added back, no streaks or confetti, no coach remark on intake, no goal below the floors, nothing hidden behind a tier, no upsell copy.

---

## 3. The rulings (D33; one criterion: the best for the person using it)

**R1. The workspace is the same on every day.** An empty day shows the meal cards, each in its empty state with its one-tap usual chips, "Yesterday's <meal>" and the hour's suggestion, exactly as a started day does. EmptyDiary is retired. Its three actions survive: "Add food" is on every card, "Copy yesterday" becomes a FeatureRow door in the feature list when the day is empty and yesterday has food, and "Meal builder" is the door it already is. Reason: the first food of the day is the one that decides whether the day gets logged at all; a chip that logs it in one tap must be there at 07:00, not after a search.

**R2. One amber on the Diary, and it is the scan button.** Everything else that is not a chart is ink: "+N planned", the usual-chip glyphs, the water icon, the feature-row icon tiles (NavRow's `surface2` tile with a `textSecondary` glyph), the suggestion card's border, the recipe "Log" pill. The calorie ring, the macro bars and the water fill keep their chart tints: they are data marks, as the weight-trend and volume charts are, and the house rule is about chrome, not charts. Reason: NavRow.js 9-13 and the logger set the rule; the Diary is the one screen that breaks it seven times.

**R3. Explanation is on demand.** The standing lines go: "Your usual foods are below. Pick something else if this meal was different.", "A meal that fits what's left of your day...", "Planned means added ahead...", the provenance line under the search box, the Suggested note, the CalorieBankSheet's seven-line intro, the Insights footnotes that restate a rule in a second place. Each fact they carried lives where it is needed: the chip's own label says what it logs ("Oats, 60 g"), the chip's accessibility hint says "Hold to change the portion first", the breakdown sheet (opened from the ring) carries one line about planned food, the offline empty state keeps the offline fact, and the bank sheet keeps its four rules as a collapsed "How this works" row. Reason: the logger's ruling (ActiveWorkoutScreen.js 161-172) and the founder's two Diary orders on standing captions.

**R4. The house parts, everywhere.** Card for every card; Chip (radio role, 48 dp minimum height, ink glyph) for the usual chips, the day chips and the unit chips; Stepper for every numeric +/-; FeatureRow (ink tile) for every door; NavRow inside the Day tools sheet; WindowChips on Insights; SectionLabel with `heading` on real section titles; BottomSheet with `scroll` where the content can exceed the window at large text. The search tab strip stays a tab strip (role `tab`, selected state) but at 48 dp with the house's ink-selected treatment. Reason: inventory 5.1; styling.md names local clones as drift.

**R5. The add screen says where it is logging.** The header reads "Add to Breakfast" (the meal's name), and when the day is not today a quiet line under the tabs reads "For Tuesday 14 October." The add sheet's button reads "Add to Breakfast". Reason: inventory flow A, the sheet "never shows the date being logged to"; Lose It's reviews on logging to the wrong day.

**R6. Every search row is one tap and shows what matters.** Name; brand, portion and kcal on the second line; protein, carbs and fat as a quiet third line in the same grammar as a diary row; a "+" on every row that adds the shown portion to the plate; a tap opens the sheet to change it. Logging the plate shows the house undo toast ("3 foods added to Breakfast.") whose Undo removes all of them. Reason: MacroFactor's rows and basket are the best-liked logger (research 1.2); the plate today closes in silence (FoodSearchScreen.js 443-492).

**R7. "Around this time" on the Recent tab.** Above the slot's recents, up to six foods the person has eaten within 90 minutes of the current clock time on other days in the last 60 days, ranked by how often, excluding ones already in the slot list. Deterministic SQL over `food_entries.eaten_at` and a pure ranking function. Shown only when logging to today. Reason: research item 3 ("the add screen already knows what you eat at this hour") and the inventory's note that recents are slot-keyed, so a food usually eaten at Meal 1 does not appear when adding to Meal 2.

**R8. The add sheet is five blocks, not ten.** Title (heading role) with brand and the source chip on one line; Amount (unit chips and the house Stepper with its typed field, decimal comma accepted); one line of what this amount is ("227 kcal · 8 g protein · 36 g carbs · 5 g fat · 6 g fibre", wrapping); the meal chips; the action. A collapsed "More about this food" row holds the last-verified line, the weigh-basis chips, sugar, salt (sodium times 2.5, labelled "salt" as UK packs are) and the vitamins and minerals. Edit mode adds "Eaten at" and "Remove". Reason: the logger's one-action grammar; inventory 5.2 ("up to ten stacked blocks").

**R9. Copy keeps each item's time and never copies a plan.** Every copy path (per meal, whole day, any day, "To today") filters `is_planned = 0` and writes each row with the source's clock time on the target date. Entries within a meal order by `eaten_at`, then `logged_at`. "To today" while viewing today shows the toast and Undo like every other write. Reason: research item 2 (MyFitnessPal's swipe-copy stamps the swipe time; its users ask for the original times); the inventory's flow I (planned rows copied as eaten, NOT VERIFIED on device, closed by the filter either way).

**R10. Bulk writes are one transaction.** `logFoodEntries` writes N rows, recomputes the rollup once, schedules sync once, and stands down the meal reminders once; delete, restore, move and copy do the same. Each row keeps the same validation as a single write. Reason: inventory section 6 (`await` in loops, a rollup per row).

**R11. Meals are the person's.** The Day tools sheet gains "Meals": meals per day (the existing synced pref, as a Stepper) and a name for each meal (the existing `setMealLabel`, synced, 24 characters). "Add meal" under the cards becomes "Add another meal". Reason: inventory 1.3 (custom names have no UI though the store and sync exist); MyFitnessPal's "Add meal" means two different things here.

**R12. Saved meals can be changed before and after.** Tapping a saved meal opens a sheet listing its items with each item's grams editable and removable, then "Add to Breakfast"; the sheet also offers "Edit this meal" which saves the changes to the meal itself (`items_json`, no schema change). Recipes log with a toast and Undo, and the servings sheet offers grams as a second unit. Reason: research item 12 and section 4 (home cooking is the gap in every app); inventory flows G and H.

**R13. Several foods in one line, typed.** When the search box holds two or more parts separated by commas or "and", the screen offers "Add these as separate foods". A review list shows each part with its parsed amount, the best match from the person's own foods first and the local library second, and the portion; a part with no match says so and opens search; nothing logs until "Add 3 foods". The parser is a pure function with tests; the matching is the existing search. No camera, no microphone, no model. Reason: research item 5's deterministic form; a meal of four items is four search round-trips today.

**R14. Water is a house control and never loses a tap.** The row uses the Stepper's 48 dp buttons, the delta is applied through a functional update and the write carries the delta, not the closure's base. Water joins the CSV. Reason: inventory section 6 (lost update), section 8 (36 dp buttons).

**R15. Copy is plain, full, and one name per thing.** "Trends" everywhere (screen title, header action, tools row); "Scan barcode" on both scan headers; "Often" for the Frequents tab; "12 P · 30 C · 5 F" with the spoken form "12 grams protein, 30 carbs, 5 fat"; "30% protein, 40% carbs, 30% fat"; every error a full sentence that says what happened and what to do ("That food was not added. Try again in a moment."); "{n} entries saved together. Give the meal a name." ; "Amber figures aren't certain, check them." becomes "The figures marked with a dot were hard to read. Check them before you save." with a visible mark that is not only a colour; the one source vocabulary: "Food Facts", "CoFID", "USDA", "From a label", "Yours", "Volyume", "Recipe". Reason: inventory section 7; the founder's standing voice orders.

**R16. 48 dp, headings, and a hint on the camera.** Every control the finger reaches in daily use meets 48 dp or reaches it with hit slop; meal names, sheet titles and the Diary's sections carry the heading role; the scan button's hint says it opens the camera; the Insights radiogroup is labelled. Reason: inventory section 8; D104-3.

**R17. Load once, update in place.** After a single-entry write the Diary updates its entries and rollup in place and reloads in the background; `buildLiveStyles` is memoised per theme; rows select only the fields they read; the weekly micronutrient card resolves refs in one call; the recipe URL import searches locally first and runs at most four live lookups at once. Reason: inventory section 6.

**R18. Errors are logged, then calmly reported.** Every catch that drops a cause in AddCustomFood, MealPlan, ScanLabel and FoodSearch gains `logError` with context; the person sees the full-sentence toast. Reason: inventory section 6 (0 `logError` against 12 catches).

**R19. A door to targets; Home left as it is.** The Day tools sheet gains "Nutrition targets" (the cross-tab route the no-targets state already uses). The inventory read the Home line "Food logged on N of the last 7 days" as a food door that opens the wrong screen; the lead checked (HomeScreen.js 2342-2344, 2951-2953; evidencePanel.js 140-170) and it is one row of a composite evidence panel whose single press opens the first-review surface, which is the right destination for that panel. It is not changed. TodayStrip's own rule stands: no food slot in the premium strip. Reason: inventory 1.1, corrected on the evidence.

**R20. Notes and custom portions, with their migrations written and held.** `food_entries.note` (also the name a quick add never had, and the line an import writes) and `custom_foods.portions_json` (up to three named household portions: "1 slice", "1 mug", "1 tbsp", each in grams) are additive local migrations plus cloud migrations 194 and 195 written in `supabase/`, HELD until the founder's phrase; the push of each column is behind a flag that is off until then. Reason: research items 9 and 12; inventory flows F, K and O. FOUNDER: the apply of 194 and 195, by the phrase, when the build is on main.

**R21. Bring your history.** Settings gains "Import food history": a CSV from MyFitnessPal (its Nutrition-Summary export, one row per meal per day) becomes one entry per meal per day with the note "Breakfast, from MyFitnessPal"; a Cronometer servings export becomes entries by food with its amounts, creating a custom food per unique name where the amount is in grams. Rows are actuals on their own dates; nothing already logged is overwritten; the import reports what it read and what it could not. Reason: research item 15; the founder's own history is in MyFitnessPal. Depends on R20's note column for the names, so it lands in Wave 4.

**R22. Declined: a week strip in the Diary header.** MyFitnessPal's strip is the thing its users complain about ("circles hard to read", no swipe); the house day pager with swipe, the date picker and Insights' week card already give the week. Not built.

**R23. Declined: a consumed/remaining swap on the ring.** The ring already shows both figures side by side (left in the centre, eaten of target beside it, MacroRings.js 316-341); a toggle would hide one of two numbers that are both wanted. Not built.

**R24. The Diary's ring, bars and the Insights blocks keep their tints and their safety reads.** No lane changes a colour, a label or a gate in MacroRings' hero, MacroBar, the Insights quiet-mode branches or the bank sheet's floors. Where a lane touches those files for chrome (R2, R3, R4) it touches only the named element.

---

## 4. The specification, surface by surface

### 4.1 DiaryScreen (the Nutrition tab)
Order, unchanged where not named: ScreenHeader "Nutrition" with "Trends"; the day pager (unchanged, 48 dp on its three controls by hit slop); MacroRings (unchanged but "+N planned" in `textSecondary` and the planned line removed; the macro split line in words); the targets-changed chip (48 dp); the no-targets way out; the offer cards (on Card); the meal cards on every day (R1); "Add another meal" (house Button, outline); the feature list (FeatureRow, `bordered={false}`, ink tiles): "Meal builder" (always), "Copy yesterday" (empty day and yesterday has food), "Higher-calorie day" (the untouched `bankingAvailable` gate); the water row (R14); the planned banner (unchanged); the scan FAB (the one amber, hint "Opens the camera to scan a barcode"); the selection bar (unchanged, extracted). The sheets DiaryScreen defines inline (move, save-as-meal, Day tools, copy-from-day) move to `src/components/food/` as named components with the same behaviour; the Day tools sheet is NavRows: Trends, Copy from another day, Meals (R11), Nutrition targets (R19). `copyYesterday`, `copyFromDate` and "To today" go through R9 and R10 with the toast and Undo.

### 4.2 MealSection (the meal card)
Card surface; header: meal name with `accessibilityRole="header"` and the subtotal "420 kcal · 32 g protein" on the right (tabular); empty state: the chips row (house Chip, radio off, minimum height 48 dp, ink "add" glyph, label "Oats, 60 g"; accessibility label as today; hint "Hold to change the portion first"), "Yesterday's Breakfast" first when it applies, the suggestion chip after; entries (EntryRow); "Mark eaten" (planned); the "Add food" row (house Button, ghost, with the search glyph; it remains TAP #1 and the guard is re-pointed to it). The three unused props are removed. The two standing lines are gone (R3).

### 4.3 EntryRow
Name (one line), brand, "60 g · 08:15"; right: kcal (tabular, bodyStrong) over "8 P · 36 C · 5 F" in `type.caption` with the spoken form in the row's accessibility label; the weight-state and meal tags unchanged; 48 dp row minimum; swipe delete with Undo unchanged.

### 4.4 FoodSearchScreen (Add food)
ModalHeader "Add to Breakfast"; the tab strip at 48 dp, ink-selected, labels Recent, Suggested, Favourites, Often, More; the search box; when not today, the line "For Tuesday 14 October."; Recent tab: "Around this time" section (R7) then the slot recents; every row per R6; the plate bar unchanged in place, its log per R6 with the toast; the provenance line and the Suggested note removed (R3); R13's offer appears under the box when the query parses to two or more parts; errors per R15 and R18.

### 4.5 FoodDetailSheet
Per R8. The Stepper is the house part with `step` 0.5 serving or 10 g as today; the typed field uses `parseDecimalInput`; the unit chips are house Chips (radio). The "More about this food" row is a plain disclosure (chevron, 48 dp) that expands in place; the sheet is `scroll`. Date line "For Tuesday 14 October" when `initialEntryDate` is not today.

### 4.6 Water
A house Stepper (250 ml step, long press 500 ml kept as the hint says), value "1.5 of 2.5 litres" tapping to the target picker, the fill in its chart tint, the icon in ink; the delta write per R14; the CSV gains a `water_ml` daily row type or a second file (the lane chooses the one that keeps the existing columns stable and says which).

### 4.7 Day tools, Meals, Copy from another day, Save as meal, Move
Each a component under `src/components/food/`, BottomSheet with a heading-role title, NavRow or Chip inside per its content, unchanged behaviour except R9, R10 and R11.

### 4.8 FoodInsightsScreen
WindowChips for the window; SectionLabel `heading` on each block; literal capitals removed; the footnotes that restate rules removed, the one "on target" cue kept in text as well as colour; nothing added. The quiet-mode branches untouched (R24).

### 4.9 CalorieBankSheet
House Chips (radio) for the days at 48 dp, house Stepper, house Button for "Plan it"; the intro reduced to one line and the four rules under a collapsed "How this works" row; the floors and the gate untouched (R24).

### 4.10 MyMeals, MyRecipes, RecipeBuilder
Per R12; the recipe log toast with Undo; the URL import per R17; icons at 48 dp by hit slop.

### 4.11 AddCustomFood and ScanLabel
R15's unsure-figure mark (a dot glyph beside the field, not a colour alone), `logError` at every catch (R18), "Save the food" as a second action that saves without logging (inventory flow E: no way to save without logging), the portions editor (R20, Wave 4).

### 4.12 Settings
"Import food history" (R21, Wave 4) beside the existing export.

### 4.13 Home
The evidence line's destination (R19).

---

## 5. The build: four waves, each merged to main when green

Two lanes at a time; every lane's brief carries: this document's section numbers as authority, the locks of section 2, the do-not-touch lanes, the lint, test and device-checklist expectation, and "STOP and report rather than interpret" on any ambiguity or pinned-test conflict. Agents never commit. The lead reviews every hunk before its commit, writes the register's landing note per wave, and runs the full gate on the settled tree before each merge. A fresh-eyes adversarial review (Opus) runs over each wave's whole diff before its merge; its blockers are fixed before the merge, its should-fixes within the wave.

Tier by the D185 rule, lowest capable: Opus where the quality bar is the house's own design (the Diary spine, the add path); Sonnet for well-specified surfaces; Haiku for nothing here (every lane carries judgement on copy or layout).

### Wave 1: the Diary spine (R1, R2, R3, R4, R11, R14, R16 on the Diary, R19)
- **1A (Opus)** DiaryScreen.js, MealSection.js, EntryRow.js, EmptyDiary.js (retired), FeatureRow.js (ink tile), the four extracted sheets, the Day tools sheet's new rows (Meals per R11 with its sheet, Nutrition targets per R19), water. Tests: a mounted suite for the empty-day workspace (chips present with no entries; "Copy yesterday" door only when yesterday has food), the heading roles, the one-amber count (a mounted count of `primary` on non-chart elements), the water delta under two taps in one tick; the existing `dailyWorkspace` suite re-pointed (its comment and its `startedDay` seeding), `foodLogTapCount.guard` re-pointed to the house Button with TAP_BUDGET unchanged at 3, `d12EatDeclutter`, `holdHints`, `planAddedHint` re-pointed to the same truths.
- **1B (Sonnet)** MacroRings.js chrome only ("+N planned" ink, the planned line gone, the split line in words, the breakdown sheet's one planned line), CalorieBankSheet.js (4.9). Do not touch: anything 1A owns; MacroRings' hero, MacroBar, the bank floors.

### Wave 2: the add path (R5, R6, R7, R8, R15, R16 on the modals, R18)
- **2A (Opus)** FoodSearchScreen.js (header, tabs, the date line, rows, plate toast, "Around this time"), FoodRow.js, searchTabs.js (labels), the `aroundThisTime` query in food/db.js and its pure ranking in `src/lib/food/aroundThisTime.js`. Tests: pure ranking (window, exclusion, ordering, determinism), the plate toast's Undo removing every row, the header's meal name, the date line only when not today.
- **2B (Opus)** FoodDetailSheet.js (R8), servingEntry.js (decimal comma), the salt line, the "More about this food" disclosure, the Add button's meal name. Tests: the five visible blocks at open, the disclosure's content, decimal comma to grams, salt from sodium.
- **2C (Sonnet)** The copy sweep (R15) across the food area with its regex guard listing every retired string; `logError` at every dropped catch (R18); the source vocabulary unified in FoodRow and SourceChip; the scan FAB's hint; MyRecipes' toast and Undo. Do not touch: 2A's and 2B's files until they land; then 2C re-bases.

### Wave 3: planning, speed and the typed line (R9, R10, R12, R13, R17)
- **3A (Sonnet)** food/db.js `logFoodEntries` transaction and the bulk paths (R10), `copyEntriesToDate` and `copyFromDate` (R9: the planned filter and the kept clock time), the in-meal order by `eaten_at`. Tests against the real SQLite test harness the food suites use: a copy of a day holding a planned row writes no planned row; a copied row keeps 13:00 on the new date; one rollup recompute for N rows.
- **3B (Sonnet)** MyMealsScreen's item sheet and "Edit this meal" (R12), MyRecipes' grams unit, RecipeBuilder's import concurrency (R17).
- **3C (Sonnet)** `src/lib/food/foodLine.js` (the parser: parts by comma or " and ", a leading count or a count with a unit word, the rest the name; tests for "2 eggs, toast and a tea", "half a bagel", "200g chicken", "a banana"), the review list in FoodSearchScreen behind the offer (R13), nothing logs until the one button.
- **3D (Sonnet)** FoodInsightsScreen (4.8) and the performance items of R17 not owned above (memoised live styles across the food components, narrowed selectors, the weekly micronutrient card's batched resolve, the Diary's in-place update after a single write with the background reload). Tests pin call counts (one `resolveFoodRefs` for the card; `load` not called after a single log).

### Wave 4: the schema-bearing pieces (R20, R21)
- **4A (Sonnet)** `food_entries.note`: local migration in database.js, cloud `supabase/migrate_194_food_entries_note.sql` (HELD, header per the schema rule), the push flag `FOOD_ENTRY_NOTE_PUSH = false` in the food sync table handler with its guard test, the note field in the add and edit sheet (one TextField under the meal chips, optional), the quick add's name, the row's display of a note (one quiet line). 
- **4B (Sonnet)** `custom_foods.portions_json`: local migration, cloud `migrate_195_custom_foods_portions.sql` (HELD), the push flag, the portions editor on AddCustomFood (up to three named portions), `buildServingUnits` reading them so the sheet's unit chips list them.
- **4C (Sonnet)** Import (R21): `src/lib/food/importHistory.js` (pure parsers for the two formats with fixtures the lane builds from the vendors' published column lists, verified by web search and cited in its header), the Settings row with the document picker, the summary sheet ("Read 412 rows from 3 March to 14 October. 408 added. 4 could not be read."), nothing overwritten. FOUNDER at apply time: 194 and 195 by the phrase.

After Wave 4: the register's close-out note, the TASKBOARD line, the handover entry, the version bump before any build (the founder's standing order), the What's new line, and the device checklist delivered in chat with the ED-safety cases (an open flag: the bank door absent, the reminder offer absent, Insights quiet; calm mode likewise) and the one pass at the phone's largest text size over the Diary, the add screen and the add sheet.

---

## 6. What is not built, and why (no parking: each is a ruling or a founder gate)

- A week strip (R22) and a ring swap (R23): ruled out on the evidence.
- AI photo or voice input: HELD by the founder; not touched, not proposed. R13 is typed and deterministic.
- Per-day or per-weekday targets, carb cycling, refeeds: the one-daily-truth ruling stands.
- Exercise calories added back: never (research 8.3).
- Any Diary surface for vitamins and minerals: D12 and D22 16b stand.
- Cloud applies of 194 and 195: the founder's phrase, after Wave 4 is on main.

---

## 7. How this will be judged

Against the research's section 9, after Wave 4: items 1, 2, 3, 4 (already free), 6 (as the ring already is), 7 (structural), 8 (already offline; the in-place update makes it instant), 9 (grams and millilitres, salt, kJ, British portion words through R20), 10 (the honest report that exists, with WindowChips and plain text cues), 11 (R12 and R17), 12 (R12; planning ahead exists), 13 (Insights' week card; no streak), 14 (the targets-changed chip exists and links to the week's reasoning), 15 (R21 and the existing export). Item 5 in its deterministic typed form (R13). The two declined items are R22 and R23 with their reasons.

And against the founder's own test: the add path from the Diary on an empty morning is one tap for a usual food, two for anything on "Around this time", three for a search; every screen reads as the rest of the app because it is drawn by the same parts; nothing on the Diary explains itself unless asked; and nothing anywhere nags, celebrates, colours a number red, or gates a feature.
