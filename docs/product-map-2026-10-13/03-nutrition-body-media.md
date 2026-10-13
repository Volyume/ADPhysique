# Product map slice 03: Nutrition, body, media, notifications, wellbeing, local schema

Surveyed 2026-10-13 against app v2.14.0 (package.json:3). Source of truth is the code; every claim cites a path
(relative to `/home/user/ADPhysique`). Labels: OBSERVED = read in code; INFERRED = reasoned, not run; NOT TRACED = said so.
Status vocabulary: LIVE (user-reachable), CONDITIONAL (needs state/flag/data), BACKGROUND (no screen, consumed), DORMANT/LEGACY.

Global fact that colours every status below: the product is fully free. `FULL_ACCESS_FOR_ALL = true` (src/lib/proGate.js:43) and the
store clamps tier to `'pro'` (src/store/useAppStore.js:45-46). So any remaining "Pro-gated" comment in the files below is stale
text, and any runtime `tier === 'pro'` check passes (INFERRED from the clamp; e.g. src/lib/notifications/scheduler.js meal reminders
`tier !== 'pro'` return).

---

## 0. Navigation placement (OBSERVED, src/navigation/RootNavigator.js)

| Screen / route | Registered in | Line(s) | Notes |
|---|---|---|---|
| Diary, MealPlan, FoodSearch, AddCustomFood, ScanBarcode, ScanLabel, FoodInsights, MyRecipes, MyMeals, RecipeBuilder | DiaryStack (tab `DiaryTab`, title "Nutrition") | 412-455, 794 | Diary is the tab root; tab press pops to top (405-410) |
| NutritionTargets, NutritionEducation, SettingsDietary, GoalChangeSummary, GoalLockConsent, NotificationSettings, WellbeingCheck, MealNames, BodyMetrics, ProgressPhotos, ShareCard | Profile (You) stack | 690-717, 702-708 | |
| BodyMetrics, ProgressPhotos, ShareCard | Progress stack | 624-632 | Same screens registered in a second stack |
| NutritionEducation, NotificationSettings | Onboarding / setup stack | 880, 886 | Reached from ProSetupComplete |
| ShareCard | three stacks | 482, 632, 708 | Reachable from Diary-adjacent, Progress, Profile |

Every route above uses `lazyScreen(...)` (e.g. 112-149, 272-290) and `headerShown:false`. No `withProGuard` wraps any of them
(ProGate is a dormant module, RootNavigator.js:266-267).

---

## 1. Nutrition and food

### 1.1 Feature table

| Feature | What it does for the user | Entry point | Key files | Data read/written | Status | Connects to |
|---|---|---|---|---|---|---|
| Food diary | Date-paged day view: macro rings, meal sections (up to six slots), per-entry edit/delete with undo, swipe delete, multi-select bulk move/copy/delete/save-as-meal, copy yesterday/other day, "usual" one-tap chips, water tracker, planned-meal confirm | Tab "Nutrition" -> `Diary` | src/screens/DiaryScreen.js (2653 lines), src/lib/food/db.js, bulkEntryOps.js, diaryDates.js, loggingPayloads.js | SQLite `food_entries`, `daily_intake_rollups`, `daily_water`, `food_slot_recents`, `foods`/`custom_foods`; AsyncStorage water target; reads `nutrition_targets`, `ed_pattern_flags`, body weight/composition | LIVE | Coach (intake feeds weeklyCoach), Home strip, deep link `volyume://diary/:date` (DiaryScreen.js:132-139) |
| Food search / picker | 2+ char search through the waterfall (250 ms debounce); browse tabs Recent / Suggested / Favourites / Frequents / More; tap row -> serving picker -> "Add to diary"; long press cycles favourite / "don't suggest" | Diary "Add food" per meal -> `FoodSearch` | src/screens/FoodSearchScreen.js (1273), src/lib/food/searchTabs.js, waterfall.js, frequents.js | `food_entries`, `food_favourites`, `food_frequents`, `food_slot_recents`, `foods` cache | LIVE | RecipeBuilder (pickMode 'recipe'), MyMeals, MyRecipes, ScanBarcode |
| Barcode scan | Live camera scan, lookup, hit -> FoodSearch with the food preselected, miss -> ScanLabel with barcode prefilled; torch; manual EAN entry sheet | FoodSearch "More" tab; Diary; also Diary line 1991 | src/screens/ScanBarcodeScreen.js, src/lib/food/waterfall.js `resolveBarcode`, react-native-vision-camera `useCodeScanner` | `foods` (cache promotion), telemetry `food_lookup_barcode` | LIVE (needs camera permission) | ScanLabel, AddCustomFood, OFF write-back |
| Snap label (OCR) | Two-step photo: front-of-pack for name (skippable, skip remembered), nutrition panel for macros; on-device MLKit text recognition; regex parser; opens AddCustomFood prefilled | ScanBarcode miss, or ScanBarcode "snap a label" link (ScanBarcodeScreen.js:148) | src/screens/ScanLabelScreen.js, src/lib/food/ocr.js, ocrParser.js, labelName.js | Writes nothing itself; queues OFF contribution via AddCustomFood | CONDITIONAL: needs the MLKit native module in the binary (`isOcrConfigured`, ocr.js:36); falls back to "Type it in" | AddCustomFood, writeback.js |
| Add / edit custom food | Manual per-100g entry with sanity checks, serving label, barcode, duplicate-barcode detection, creates `custom_foods` row and logs entry in one flow; edit via `editFoodId` | FoodSearch "More"/results fallback; ScanLabel; ScanBarcode `from:'scan_manual'` | src/screens/AddCustomFoodScreen.js, sanityChecks.js, servingEntry.js, writeback.js | `custom_foods`, `food_entries`; AsyncStorage OFF queue | LIVE | OFF write-back (opt-in) |
| Quick add | Bare kcal (+ optional P/C/F) without a food | FoodSearch "More" tab | src/components/food/QuickAddSheet.js | `food_entries` | LIVE | |
| Saved meals | Named bundles of foods; log whole meal; rename/delete; created from Diary multi-select "Save as meal" | FoodSearch "More" tab and a Suggested-tab link (FoodSearchScreen.js:748, 768) | src/screens/MyMealsScreen.js, db.js `createSavedMeal`/`applySavedMealToDiary` | `saved_meals` (items_json), `food_entries` | LIVE | Meal builder pool |
| Recipes | List, create/edit (ingredients via FoodSearch pickMode 'recipe', servings, notes), per-serving macros, log N servings, import from a recipe URL (schema.org JSON-LD, no AI) | FoodSearch "More" tab -> MyRecipes -> RecipeBuilder | src/screens/MyRecipesScreen.js, RecipeBuilderScreen.js, src/lib/food/recipeImport.js, db.js | `recipes`, `recipe_ingredients` | LIVE | Meal builder (`listRecipesForPlanning`) |
| Meal builder ("Meal plan") | Generates a day or 7-day plan from the stored nutrition target and the curated meal library plus the user's saved meals/recipes; per-meal pin, swap meal, swap food, regenerate, repeat day, "why this meal" rationale, apply day/week to diary as planned (scaffold) rows, shopping list (Share sheet, per-device check-off), inline dietary-needs sheet | Diary FeatureRow "Meal builder" (only when the day has entries, DiaryScreen.js:1828-1840); EmptyDiary promo; CoachOutput (CoachOutputScreen.js:3003, 3131) | src/screens/MealPlanScreen.js (2242), src/lib/food/mealPlanAssembler.js, mealPlanService.js, mealSwap.js, planEdit.js, planContinuity.js, planPreferences.js, groceryList.js, mealRationale.js, planExplain.js, curatedMeals.js (94 meals), curatedFoods.js (83 staples), foodRoles.js, gramSolve.js | SQLite `meal_plans` (plan_json, one active); `food_entries.is_planned`; `food_swaps`; profile prefs (`mealPlanMealsPerDay`, exclusions) | LIVE | NutritionTargets (a target change opens a reconcile review sheet, NutritionTargetsScreen.js:28-34), Diary, calorie bank |
| Planned vs eaten | Planned rows are scaffolding (`is_planned=1`), excluded from rollups, adherence, FFM floor and sync until the user marks eaten (per meal or whole day); "Clear" removes | Diary per-meal "Mark as eaten", banner bottom of page (DiaryScreen.js:1876, 1887) | db.js `confirmPlannedDay`/`confirmPlannedEntry`/`clearPlannedDay` | `food_entries.is_planned` (migration ~1576) | LIVE | Planned-meal-confirm notification |
| Higher-calorie day ("calorie bank") | Pick one day of the week and a bump (default 150, step 50, hard cap 500 kcal); the other days give up an equal share so the weekly total is unchanged; refuses if any day would breach the safe floor or the band max; planned food is rewritten to match; undo clears | Diary FeatureRow "Higher-calorie day" (DiaryScreen.js:1841-1849) | src/components/food/CalorieBankSheet.js, src/lib/food/calorieBank.js, effectiveTargets.js, store `setCalorieBank` (useAppStore.js:2355) | `userProfile.calorieBank` in AsyncStorage + store only (see 1.4); planned `food_entries` | CONDITIONAL: shown only when `bankingAvailable = !!targets && !targetWasFloored(targets) && !edFlagOpen` (DiaryScreen.js:404) | Meal builder planned rows, effective targets on Diary |
| Energy "calorie slider" | After the engine calculates a target, the person drags a daily target inside the estimated range (engine target +/-10%, 25 kcal steps). The lowest point is the highest of: range bottom, sex floor, FFM floor, 0.8% BW/week safe-loss line. Macros follow (protein and fat fixed, carbs take the rest). Plan review sheet follows a change | Nutrition targets results card | src/components/EnergySlider.js, src/lib/energyChoice.js, energyChoiceEnforce.js, energyChoiceView.js, NutritionTargetsScreen.js:462-496 | AsyncStorage `@volyume_energy_choice` (numbers only; "follows the person across devices through the prefs sync" per energyChoiceEnforce.js header), `nutrition_targets` | CONDITIONAL: hidden under calm mode or an open ED flag or any failed read (`suppressed`, NutritionTargetsScreen.js:462-474); needs saved sex + weight (`floorInputsFromProfile`) | Calm toggle (SettingsCoachingScreen.js:82), weekly coach (CoachOutputScreen.js:2253) call `enforceEnergyChoice` to put the engine's target back |
| Nutrition targets | Calculates BMR/TDEE, calories and macros from sex, age, height, weight, optional body fat + source, activity, goal, protein approach (Standard / Optimised / Advanced / Custom g/kg); "Set it for me" fast path; per-meal protein guidance and meals-per-day; derivation explainers in a bottom sheet; consent checkbox required to calculate | You tab -> "Nutrition targets"; also from Home, Diary empty state, Coach, WeeklyCheckIn, FoodInsights | src/screens/NutritionTargetsScreen.js (2967), src/lib/nutritionEngine.js (1320), nutritionTargetsView.js, effectiveMaintenanceService.js, maintenanceInputs.js | SQLite `nutrition_targets` (+ AsyncStorage `@volyume_nutrition_targets` fallback), `body_metric_log`, `user_body_profile`, `effective_maintenance_memos` | LIVE | Everything in nutrition; coach; meal builder |
| Training status (Natural / Enhanced) | Private device-only toggle that only changes the weekly coach's gain ceiling (0.75%/wk) in a gain phase | Nutrition targets "Training status" pills | src/lib/trainingStatus.js (expo-secure-store key `volyume_training_status`), weeklyCoach.js | SecureStore only; "never in AsyncStorage, never synced" (trainingStatus.js header) | CONDITIONAL: hidden when `suppressed` (NutritionTargetsScreen.js:1243) | weeklyCoach `gainCeilingPct` (CoachOutputScreen.js:2059) |
| Food Insights (Trends) | 7/14/30/90-day windows: coverage honesty block ("what we can see"), calorie trend + per-day bars, protein block, macro adherence (kcal/protein within 10%, carbs/fat 15%), nutrient averages, weekly micronutrient averages (coverage-floored), CSV export, PDF report | Diary header "Trends" HeaderAction (DiaryScreen.js:1451-1459) and Diary-tools sheet | src/screens/FoodInsightsScreen.js, src/lib/food/insights.js, adherence.js, nutrientSummary.js, micronutrientCoverage.js, csvExport.js, components/food/WeeklyMicronutrientsCard.js | Reads `daily_intake_rollups`, `food_entries`; writes cache-dir file then share sheet | LIVE | No calm/ED gating found (see 1.6) |
| Nutrition education | Six-section explainer (calories, macros, set numbers, tracking, adherence, "your coach does the adjustments") | NutritionTargets education card (line 1013), ProSetupComplete (496) | src/screens/NutritionEducationScreen.js | none | LIVE | Standing Diary row was removed on founder order (DiaryScreen.js:1572-1578) |
| Dietary needs | Diet (omnivore / pescatarian / vegetarian / vegan), FSA-14 allergen hard excludes, "don't suggest" food list with soft nudge at 15 | Settings -> "Dietary needs" (SettingsScreen.js:92) and inline sheet in Meal builder | src/screens/SettingsDietaryScreen.js, components/food/DietaryPreferencesEditor.js, planPreferences.js, curatedMeals.js `dietAllows` | profile `dietPreference`, `mealPlanExcludeFoods/Tags`; `food_favourites` kind for dislikes | LIVE | Meal builder, FoodSearch suggestions |
| Meal names | Rename numbered/peri-workout meal slots (24 chars), device-local, cosmetic | none | src/screens/MealNamesScreen.js, lib/food/mealSlots.js (`@volyume_meal_labels`) | AsyncStorage | DORMANT: registered but unreachable by founder order 2026-07-13 (RootNavigator.js:696-700); no `navigate('MealNames')` anywhere (grep) | `mealSlotLabel` still reads overrides, so previously saved names would still show |
| Meal log reminders | Opt-in per-meal (Breakfast 08:00 / Lunch 12:30 / Dinner 18:30 defaults, preset times) | Notification settings -> "Meal reminders" | NotificationSettingsScreen.js:962-1010, scheduler.js `scheduleMealReminders` | AsyncStorage `@volyume_meal_reminders` | CONDITIONAL (opt-in, permission, no open ED flag) | See section 5 |
| OFF write-back (contribute fixes) | Opt-in upload of label photo + confirmed macros to Open Food Facts after a scan-miss custom food | One-time Diary card after a completed barcode-heal chain; Settings -> Privacy toggle | src/lib/food/writeback.js, SettingsPrivacyScreen.js, DiaryScreen.js:1571-1600 | AsyncStorage consent (default off), queue, retries 3 | CONDITIONAL (consent) | Sends data to a third party; see 1.6 |
| Water tracker | Add/subtract buttons, editable daily target (default 3.0 L), hint | Diary WaterRow (DiaryScreen.js:1851) | DiaryScreen.js `WaterRow`, db.js `setWater` | `daily_water` (synced), AsyncStorage target | LIVE | |
| Per-day offsets | Weekday kcal offsets | none | src/lib/food/perDayTargets.js, sync/tables/perDayTargetOffsets.js | AsyncStorage + cloud `perday_target_offsets` | LEGACY storage only: "Retired as a product feature", nothing applies it (perDayTargets.js header) | Contradicted by registry comment, see 1.6 |

### 1.2 Food data sources and waterfall (OBSERVED, src/lib/food/waterfall.js:1-60)

Order of lookup: (1) local SQLite `custom_foods` + `foods`; (2) bundled OFF UK snapshot (already in `foods`); (3) bundled CoFID UK
(already in `foods`); (4) live OpenFoodFacts API; (5) USDA FoodData Central API.

| Source | Detail | Evidence |
|---|---|---|
| Bundled OFF UK snapshot | `assets/seed/off_uk_snapshot.dat` (6.6 MB), imported once per snapshot version into `foods`; version const `OFF_SNAPSHOT_VERSION = 2026-07-05` | src/lib/food/seed.js:40, ls assets/seed |
| Bundled CoFID UK | `assets/seed/cofid_uk.dat` (1.9 MB), ~3k generic UK foods, OGL v3, 24 of 27 micronutrient columns populated; version `2026-07-10` | seed.js:44 and header; RootNavigator.js:1304, 1314 trigger the imports |
| Live OpenFoodFacts | 1200 ms timeout, User-Agent `Volyume/1.1`, maps 27 micronutrient columns; literal 0 treated as unknown | src/lib/food/sources/liveOff.js:1-60 |
| USDA FoodData Central | 1500 ms timeout; needs `EXPO_PUBLIC_USDA_API_KEY` at build time, else short-circuits to empty. Build workflows pass the secret (`.github/workflows/build-android.yml:306, 491`, `build-ios.yml`). Whether the secret is actually set in GitHub is NOT VERIFIED | sources/usda.js:12-30 |
| Cache promotion | Live hits are written to `foods` so the next lookup is local; idempotent on `(source, source_id)` unique index | waterfall.js:49-60 |
| Weak-local merge | Fewer than 3 local hits or no prefix match -> live results merged below local rows (E3 fix) | waterfall.js:39-61 |
| Barcode | Strict first-hit-wins; telemetry `food_lookup_barcode` with source local/off_live/usda/miss | waterfall.js `resolveBarcode` (~192-219) |
| Stale refetch | `refetchStaleFood` opportunistic, once per session per food | waterfall.js:237, freshness.js |
| OCR | `@react-native-ml-kit/text-recognition` on-device, no network, no key; `isOcrConfigured()` is true only if the native module loads | ocr.js:1-50, package.json:78 |
| Barcode decoding | vision-camera built-in code scanner (MLKit on Android, Apple Vision on iOS); `enableCodeScanner:true` in app.json plugin | ScanBarcodeScreen.js:25-40 |
| Curated library | 94 meals (`m('...')` entries, curatedMeals.js:53-195) from 83 staples (curatedFoods.js); UK CoFID-style values; diet tags cascade vegan < vegetarian < pescatarian < omnivore | curatedMeals.js:41-52 |

Food-ref scheme: `off:<ean>`, `usda:<fdcId>`, `custom:<id>` (waterfall.js header; searchTabs.js `custom:` prefix check).

### 1.3 Macro, BMR and TDEE logic (OBSERVED, src/lib/nutritionEngine.js)

| Item | Rule | Line |
|---|---|---|
| BMR | Katch-McArdle `370 + 21.6 x LBM` when body fat is a finite value in (0, 60) AND source is baseline (`dexa`, `caliper`, `bia`, `visual`, `manual`, `self_reported`); otherwise Mifflin-St Jeor with `+5` for male and `-161` for anything else (including unknown sex) | calcBMR 605-632; `isBaselineBodyFatSource` 604 |
| Photo-scan body fat | `photo_scan` is NOT in the baseline list, so it never drives Katch-McArdle; it only sets confidence 'low' | 831; 601-607 |
| Activity multipliers | sedentary 1.2, light 1.375, moderate 1.55, active 1.65, very_active 1.725 | 24-30 |
| Phase adjustments | lean_gain +10%, build +17%, maintain 0, recomp -5%, mild_cut -13%, aggressive_cut -22% of maintenance | 32-39 |
| Experience scaling of surplus | multipliers beginner 1.30/1.25 ... competitive 0.50/0.65 for lean_gain/build | 923+ `SURPLUS_EXP_MULT` |
| Maintenance | `formulaMaintenance + effectiveMaintenanceResidualKcal` (Campaign 19 canonical resolver supplies the residual) | calculateNutritionTargets ~1000 |
| Missing weight | A deficit is held at maintenance (no invented weight may size a cut) | ~1010 |
| Protein | Approach tables per goal on LBM basis (preferred when baseline BF known) or bodyweight basis; floors 2.0/2.2/2.5 g/kg, custom floor 1.2, custom ceiling 3.5 g/kg; physique-competitor training goals default to 'advanced' | 73-103, 899-909 |
| Fat | g/kg by phase (1.0 / 0.9 / 1.0 / 0.85 / 0.8 / 0.75), floor `max(0.5 x weight, 40 g)`; carbs take the remainder | 150-160, ~1090 |
| Range | `kcalMin/kcalMax` = target x 0.9 / 1.1 | ~1100 |
| Clamps | age 13-100, height 100-250, weight 30-350 | ~960 |
| Weekly rate | `(target - maintenance) x 7 / 7700` | `estimateWeeklyRate` |
| EWMA | alpha 0.28 for planning surfaces (BodyMetrics, Coach nutrition trend); weeklyCoach has its own slower 0.1 | 168-178 |
| Diet break | Suggest after 8 weeks in deficit (MATADOR citation) | 1145-1165 |

### 1.4 ED-safety floors and caution copy as observed (food side)

| Safeguard | Implementation | Evidence |
|---|---|---|
| Sex floor 1,500 / 1,200 kcal | `kcalFloorForSex(sex)`: `female -> 1200`, everything else (incl. null) `1500`. Applied in `calculateNutritionTargets`; warning text "Target calories (X kcal) below safe minimum (Y kcal). Raising to floor." | nutritionEngine.js:721-723, ~1030 |
| Rapid-loss hard gate 1.5% BW/week | Target raised so loss is capped at 1.5%; `floorApplied = true` | HARD_GATE_LOSS_RATE 112; ~1050 |
| 0.8% BW/week caution | Warning "exceeds the recommended 0.8 % threshold. Consider slowing the rate" | MAX_SAFE_LOSS_RATE 111; ~1060 |
| FFM energy floor 30 kcal/kg | `computeFFMFloor`: credible BF only if source is dexa/caliper/bia, else sex-aware conservative fraction (male 0.78, female 0.72) | 127, 681-715 |
| Energy-availability caution | Lines 35 kcal/kg FFM (male) and 40 (female and unknown) above the hard floor; copy "This target is low on energy availability (about X kcal per kg of lean mass, under the N guideline). Easing to about Y kcal ..."; UI offers a one-tap "Ease this cut to about Y kcal" that steps the goal down one notch and recalculates (only ever raises) | 779-835; NutritionTargetsScreen.js:1871-1895 |
| Floor banner copy | "Your numbers came out below the safe minimum, so they were raised to it. The target above is your safe minimum. Eating below it would work against your training, recovery and health." and hero text "Held at your safe minimum" | NutritionTargetsScreen.js:1848-1856, 1476 |
| Aggressive cut hidden under calm | Goal list filters `aggressive_cut` when `calm`; a previously selected aggressive cut is stepped back to `mild_cut` | NutritionTargetsScreen.js:496-499, 1042, 1265 |
| Slider cannot lower a floor | `energyChoiceBounds` takes the max of range bottom, sex floor, FFM floor, safe-loss line; `strictestBounds` takes the strictest across saved and last-calculated inputs; a floor above the engine target never removes the engine target | energyChoice.js:41-78, 148-160 |
| Slider enforcement | Calm mode or open ED flag -> engine's own target saved back everywhere (on foreground, calm toggle, flag raise, targets focus) | energyChoiceEnforce.js header; callers listed in 1.1 |
| Calorie bank | Maths-only module; refuses if any base day is below `floorKcal`, if big day lacks room under band max, or bump < 50; caller carves out ED flag / floored target | calorieBank.js:1-95; DiaryScreen.js:404 |
| Meal plan | "never computes or lowers a calorie number"; flagged `withinTolerance:false` with residual rather than under-feeding; floored targets stay flat | mealPlanAssembler.js header; mealPlanService.js header |
| Goal lock | Raises ED detector threshold 2 -> 3 signals; FFM floor never changes | edPatternDetector.js header; GoalLockConsentScreen.js |
| Deterministic engine | No LLM calls or randomness in these modules; assembler uses seeded mulberry32 for "regenerate" jitter (deterministic per seed) | mealPlanAssembler.js:34-44 |

### 1.5 ED pattern detector (consumed by this domain) (OBSERVED, src/lib/edPatternDetector.js)

Signals: s1 rapid loss (<= -1.5% BW/wk), s2 energy score <= 2 for 2 weeks, s3 'under' adherence in >= 2 of last 3 weeks, s4 weight-only
check-ins (check-in with no food data in >= 2 of last 3 weeks). Fires on >= 2 signals (>= 3 with goal lock advanced). Clearance needs
positive evidence over two weeks (energy recorded and > 2, no 'under', food data present, finite non-rapid trend): absence of data never
clears. The flag is raised only in `CoachOutputScreen` after `runWeeklyCoach` (CoachOutputScreen.js:2241), so it depends on the
Coach screen being opened (OBSERVED `raiseEdPatternFlag` has one caller in screens/lib; background raising not found).
On raise: `pushEdPatternFlagsNow` (cloud), `enforceEnergyChoice`, `cancelMorningNotification` (which also clears the evening backstop,
scheduler.js:1801-1813). SCOFF answers (WellbeingCheck) add `scoffPositive` (score >= 2) to coach gating (weeklyCoach.js:1467, 2162).

### 1.6 Per-screen trace (fuller notes)

**DiaryScreen** (src/screens/DiaryScreen.js)
- Load: one `Promise.all` of day entries, rollup, water, targets, open ED flag (fail-closed `'read_failed'`), latest weight, composition, latest coach output (lines ~232-290); race guard `createRaceGuard` drops stale loads; failed load shows a retryable "Couldn't load this day" state, not an empty diary.
- Renders: ScreenHeader "Nutrition" + "Trends" HeaderAction (1451); MacroRings + macro breakdown sheet; one `MealSection` per slot from `buildMealSlots` (default 4 meals/day, optional peri-workout slots); `EmptyDiary` (with its own meal-builder promo and "Copy yesterday"); "Targets updated" coach receipt chip only when the coach itself changed calories in the last 7 days (360-420); OFF consent card on today only (1571); meal-reminder offer card (1612-1640, hidden when `calmMode || edFlagOpen`, mealReminderOffer.js:72); FeatureRow list (Meal builder when entries exist, Higher-calorie day when banking available); WaterRow; planned banner with Mark as eaten / Clear.
- Selection mode: bulk move to another slot, copy to date, delete with undo, save as meal.
- Deep link: `route.params.date` validated by `isValidDayKey` (132-139).
- Calm/ED handling OBSERVED: the Diary reads the ED flag only for the banking gate and the reminder offer; it reads calm only for the reminder offer. Calories, rings and macro numbers always render. Whether this is intentional is not stated in the file.

**FoodSearchScreen**: mealSlot default 'snack', `entryDate` default today; `pickMode:'recipe'` returns `addedIngredient` to RecipeBuilder; `scannedFood` / `preselectedFood` params open the serving sheet directly (lines 522-577); custom foods ranked first, then favourites/recents/frequents via `rankByPersonalHistory` (searchTabs.js).

**ScanBarcodeScreen**: requests camera permission once per mount even from 'denied' (Android 16 note, lines 150-165); `scanLock` prevents double navigation; re-arms on focus; thrown lookups distinguish offline vs unreachable via NetInfo; hit -> `navigation.replace('FoodSearch', {scannedFood})`, miss -> `replace('ScanLabel', {prefillBarcode})`.

**ScanLabelScreen**: front step then panel step; `@volyume_*` skip-name flag is reset from SettingsDataScreen (header, lines 50-58); confidence reported per parsed field; user always confirms in AddCustomFood before save.

**AddCustomFoodScreen**: sanity checks (kcal <= 900/100 g, macro mass <= 110%) are soft warnings; duplicate-barcode shortcut sends to FoodSearch with the existing food (line 454); queues OFF contribution only when consent is on and a barcode came from a scan.

**MyMeals / MyRecipes / RecipeBuilder**: see table; Undo on a saved-meal log removes every created `entryIds` row; recipe URL import is `fetch` + JSON-LD parse, "No new dependency, no AI" (recipeImport.js header).

**MealPlanScreen**: see table. Never computes nutrition; persists via `updateMealPlan`. Observation: header still says "Pro surface (lives inside the gated Diary stack)" (line 8), stale.

**NutritionTargetsScreen**: On open: loads SQLite targets, falls back to AsyncStorage; reads saved floor inputs from saved records only (never from the form being edited, D226 review fix, line 418). Fast path "Set it for me" collapses the form; the form requires sex, age, height, weight AND the "I consent to storing this data" checkbox before Calculate (line 647). After a calculation: hero target, floor banner, warnings, EA nudge, female-athlete micronutrient awareness card (`femaleNutritionAwareness(sex)`, female only), protein/fat/carbs "why" disclosures (collapsed by default), per-meal protein, slider (if not suppressed), save with plan reconcile sheet (`reviewTargetChangeAgainstActivePlan`, `commitReconciledPlan`).

**GoalChangeSummaryScreen**: see section 3.

**FoodInsightsScreen**: "WHAT WE CAN SEE" coverage block first; below `RELIABLE_COVERAGE_FRACTION = 0.7` or `MIN_LOGGED_DAYS = 4` it says what it does not know instead of averaging (insights.js:25-60). Founder law in file header: no dashboard of clever statistics, no judgement, no scores. Exports: CSV (formula-injection neutralised, csvExport.js:20-33) and PDF.

### 1.7 Nutrition data stores and sync (OBSERVED, src/lib/sync/registry.js)

Syncing tables in this domain: `food_entries`, `custom_foods`, `saved_meals`, `recipes`, `recipe_ingredients`, `food_favourites`, `daily_water`,
`daily_intake_rollups`, `daily_steps`, `cardio_log`, `nutrition_targets`, `effective_maintenance_memos`, `meal_plans`, `perday_target_offsets`,
`weight_log` (from `morning_weights`), `body_composition_log` (from `body_metric_log`), `weekly_checkins_v2`, `ed_pattern_flags`, `profiles`,
`notification_preferences`. NOT in the registry (so device-local, OBSERVED by absence): `food_swaps` has local-first helpers (db.js `insertOrUpdateFoodSwapFromCloud`) so
may sync through legacy `src/lib/sync.js` (NOT TRACED); `food_frequents`, `food_slot_recents`, `progress_*`, `calorieBank`, meal labels, water target,
OFF consent, training status.

### 1.8 Product-decision observations specific to nutrition (details also in section B)

1. Higher-calorie day is local-only: `setCalorieBank` writes AsyncStorage `PROFILE_KEY_PFX+userId` and the Zustand store (useAppStore.js:2355-2361); a grep of sync.js, sync/ and the store finds no `calorie_bank`/`calorieBank` push. A second device or a reinstall loses the bank, but the rewritten planned `food_entries` (if confirmed) do sync (INFERRED).
2. Higher-calorie day gate ignores calm mode (only ED flag and floored target). The slider, photo score, body metrics and reminder offer all withhold under calm; banking does not (DiaryScreen.js:404).

---

## 2. Body metrics and weight trend

| Feature | What it does | Entry | Key files | Data | Status | Connects to |
|---|---|---|---|---|---|---|
| Body metrics screen | "Is my weight doing what the plan wants, and what changed this week?" Sections in order: This week (trend weight, verdict, week vs last, typical day-to-day swing), actions (log weigh-in / measurements), Trend chart with window chips, Maintenance calories, Recomposition (with "Create share image"), Body fat and measurements, History (grouped by week, editable, deletable), doors to Photos and units | Progress tab (Analytics Body card, AthleteProfile, LiftProgress), You tab; Home weigh-in strip logs but does not open it | src/screens/BodyMetricsScreen.js (1722), src/lib/bodyMetricsPolicy.js, bodyMetricsDisplay.js, bodyMetricsHistoryMerge.js, bodyMetricValidate.js, recompReframe.js, chartWindows.js | SQLite `morning_weights` (weigh-ins), `body_metric_log` (body fat + 9 circumferences: chest, shoulders, arm, forearm, waist, hips, thigh, ham, calf), `weekly_checkins`; reads `effective_maintenance_memos`, intake summary | LIVE | Coach, Home, Analytics, share card (recomposition milestone) |
| Weight trend view-model | Pure derivation: state ladder by entry count (0 none, <7 prompt "Your trend appears after 7 weigh-ins: n of 7", <14 "still taking shape", <42, 42+), two-week reading (needs >= 7 points over >= 7 days), steady rule (< 0.2 kg/wk and < 0.5 kg total), lapsed and calm and ED-flag branches, coach verdict leads when fresh (< 14 days), maintenance label with confidence | Analytics WeightTrendCard (`useWeightTrend`), BodyMetrics | src/lib/weightTrend.js (497), src/hooks/useWeightTrend.js | `morning_weights` last 90 days, must include a reading in the last 14 days or the card drops to its early/lapsed state | LIVE | AnalyticsScreen.js:30, 164 |
| Weigh-in logging | Weight in the user's chosen unit (kg / lb / stone-lb), future dates refused (BM-40), plausibility messages, body-weight range 20-500 kg | BodyMetrics form; Home strip (HomeScreen.js:1035); onboarding (ProOnboardingScreen.js:1927); health import (lib/health.js:690) | bodyMetricValidate.js | `morning_weights` | LIVE | Notification stand-down |
| Gain settling | In the first 4 weeks of a gain (bulk) phase a faster-than-band gain is read as water/glycogen and counted on target; a gain slower than target still reads as off target; cuts untouched | Weekly coach (no screen of its own) | src/lib/weeklyCoach.js:633-634 (`GAIN_SETTLE_WEEKS = 4`), 1132-1141, 2166 | Weekly coach output | BACKGROUND (surfaced as coach "held decision": "Calorie target stays the same. Early in a building phase, fast gain is mostly water and stored carbohydrate...", weeklyCoach.js:2167) | Training status ceiling (0.75%/wk, enhanced only) |
| Effective maintenance | Canonical maintenance memo derived from formula prior + logged food + weigh-ins; consumed by Nutrition targets, BodyMetrics, useWeightTrend, coach | Nutrition targets, BodyMetrics Maintenance card | src/lib/effectiveMaintenanceService.js, effectiveMaintenance.js, maintenanceInputs.js | SQLite `effective_maintenance_memos` (synced) | BACKGROUND + shown | weeklyCoach |
| Step-trend modifier | Calorie change sized with a step-trend modifier shown as one line when the latest coach run used it | Weight trend card | nutritionEngine.js:506 `computeStepTrendModifier`, weightTrend `stepTrendLineFor` | `daily_steps` (HealthKit / Health Connect via lib/activitySteps.js) | CONDITIONAL (health permission, coach run) | |

**Body metrics withhold rule** (OBSERVED, bodyMetricsPolicy.js:49-62): nothing below the header renders until both safety reads (open ED flag,
raw wellbeing key) have returned (fail-closed: failed flag read = open, failed wellbeing read = calm). Under an open flag or calm-after-Continue
the following are withheld: direction words, rate, week comparison, "weighed N of M mornings", swing line, chart takeaway, maintenance figure,
intake line, recomposition card, measurement change lines. Kept: trend weight, chart line and dots, latest measurements with dates, history,
log/add actions. Replacement line: calm "Your weigh-ins are kept here, ready when you want them."; flag "Your weigh-ins are kept here."
Calm mode also shows a once-per-process "A gentle pause" interstitial (module flag `bodyMetricsSessionConfirmed`, BodyMetricsScreen.js:106) with the Beat helpline text.
Progress root pillar prints no weight figure under calm (weightTrend.js `calm` branch) nor under an open flag (`pillarFigure:false`).

Mifflin and Katch-McArdle: see 1.3. Body-fat methods offered: dexa, caliper, bia, visual (BODY_FAT_METHODS in bodyMetricValidate.js).

Cardio: see section 6 (data layer only).

---

## 3. Goal change summary and goal lock

| Feature | What it does | Entry | Key files | Status |
|---|---|---|---|---|
| GoalChangeSummary ("What changed") | After a goal/phase/protein-approach/calorie change: hero "Goals updated", per-field before -> after cards with reasons (phase reason, goal reason, calorie delta reason, protein approach reason), macro rows with deltas, plan-rebuilt / plan-kept (style lock) / library-kit-installed lines. Under an open ED flag (or unknown state, fail-closed default `true`) the deficit framing and diet-break notice give way to neutral lines | `navigation.replace('GoalChangeSummary', ...)` from ProGoalSetup after the write (ProGoalSetupScreen.js:724) | src/screens/GoalChangeSummaryScreen.js (433) | LIVE (only reachable via goal setup) |
| Goal lock ("Goal lock") | Two-option choice: "I've done hard cuts safely before, or I'm working with a coach. Wait for three warning signs instead of two before pausing my cut." vs "I'm new to this and want Volyume's standard safety checks to apply." Persists `user_body_profile.goal_lock_advanced`, telemetry `goal_lock_set` / `goal_lock_cleared` | You tab -> "Safety checks" -> "Goal lock" (YouScreen.js:556, `editMode:true`) | src/screens/GoalLockConsentScreen.js, db `setGoalLockAdvanced` | LIVE. The onboarding interstitial that used to show it was removed 2026-05-29 (screen header), so the `onContinue` param is vestigial |
| Wellbeing check (SCOFF) | Five yes/no questions; score stored `user_body_profile.scoff_score`; score >= 2 shows alert "Thank you for sharing that ... worth speaking to your GP or a registered dietitian alongside your training. We've noted this so Volyume focuses on performance and support rather than restriction." | You tab -> "Safety checks" -> "Wellbeing check" (YouScreen.js:564, the only route) | src/screens/WellbeingCheckScreen.js | LIVE. Raw answers in AsyncStorage `@volyume_scoff_answers`; the score syncs (`scoff_score`, sync.js:1567) |
| Calm mode | The `@volyume_wellbeing_mode` flag ('calm' / 'normal' / 'unspecified') the whole app reads | Settings -> Coaching (SettingsCoachingScreen) | src/lib/wellbeing.js | LIVE; syncs as a guarded pref |

---

## 4. Progress photos and the progress scan

### 4.1 Progress photos (OBSERVED, src/lib/progressPhotos.js header, ProgressPhotosScreen.js)

| Item | Detail |
|---|---|
| Storage | Device-local only: files `<epochMs>.jpg` under `documentDirectory/progress_photos/` per user; "never synced to Supabase, never uploaded, never shared automatically" (progressPhotos.js:1-12). EXIF/GPS stripped on every save via re-encode + segment strip (lines 230-251). iOS backup exclusion via the native module `setExcludedFromBackup`; Android relies on `allowBackup=false` (header) |
| Metadata | `progress_photo_meta` (name, taken_at, pose front/side/back, weight_kg, note, `unscored` column) local only |
| Entry | Body metrics "photos" door; Analytics; AthleteProfile; WeeklyCheckIn `onScan`; WorkoutSummary `onAddPhoto` |
| Capture | Guided ghost-overlay capture (`ProgressGhostCapture`, expo-camera), library import, "Photo details" step (date + pose), set-as-reference |
| Timeline | Check-in cards grouped by month, pose filter chips, newest/oldest sort, date-range sheet, full-size viewer, delete |
| Compare / share | Side-by-side and overlay compare, scan compare, scan trend, before/after share sheet |
| Suppression | `usePhotoSuppression` (calm OR open ED flag, both raw fail-closed reads) plus the screen's own raw calm read: under suppression compare, share, trend, scores, bands, confidence and bodyweight text are all hidden ("Hidden"); view own photos and delete stay (ProgressPhotosScreen.js:153-184, 1041-1054, 1163-1232) |
| Stale comments | "Share is additionally Pro-gated" (ProgressPhotosScreen.js:1014) and "Pro-gated (check-ins ...)" (1229) are stale under free access |

### 4.2 Progress scan (physique "Volyume score")

| Item | Detail | Evidence |
|---|---|---|
| What it is | A guided front + back (side optional) photo set at least 7 days apart; on-device silhouette segmentation produces anthropometric ratios, a deterministic JS regressor produces a body-fat estimate with range, and a 0-100 "Volyume score" with named bands Foundation 0-49, Active 50-59, Athletic 60-69, Defined 70-79, Lean 80-89, Very Lean 90-96, Peak Condition 97-100 | progressScanAnalysis.js:1-60; ProgressPhotosScreen.js:130 (`PROGRESS_SCAN_MIN_INTERVAL_MS`) |
| Models | TFLite MediaPipe selfie segmentation general v2 (`assets/ml/selfie_segmentation_v2.tflite`) via react-native-fast-tflite, native ML Kit fallback; estimator `assets/ml/progress_scan_bf_estimator_v1.json`, kind `deterministic_silhouette_anthropometric_regressor`, status `provisional_validation_pending` | progressScanVision.js:1-45; JSON keys |
| Native module | `modules/progress-scan-image`: `extractRgb`, `segmentPersonMask`, `resolveBundledModel`, `diagnoseBundledModel`, `setExcludedFromBackup` (Swift 340 lines + Android Kotlin/Java) | modules/progress-scan-image/index.ts |
| Quality gates | lighting 0.25, blur 0.18, framing 0.25, pose 0.22, segmentation 0.30, separation 0.20, tilt <= 10 degrees; withhold reasons include `silhouette_implausible`, `estimate_out_of_range`, `duplicate_pose_content`; measurement version `silhouette_bands_anatomical_v3` | progressScanAnalysis.js:12-45; progressScanVision.js:25-45 |
| Confidence tiers | high / moderate / low / not_enough; Low hides the score behind "Show score anyway" (per-scan reveal, not persisted) | progressScanResultsContract.js:20-50; ProgressPhotosScreen.js:206-212 |
| Storage | Local SQLite `progress_scan_sessions` (estimates, signals_json, abstention reasons), `progress_scan_assets` (per pose quality metrics), `progress_scan_classification_history`; "still local-only and deliberately absent from SYNC_REGISTRY" (database.js v57 comment) | progressScanStore.js; database.js |
| Preferences | camera facing (default front), timer (default 5 s), hide exact numbers, recalibration-seen ids, meaning-moment seen | progressScanPreferences.js |
| Coach use | `affectsTargets` is a hard-coded `false` literal; scan only supplies "visual trend context" and a photo-corroboration direction check against the weight trend (weeklyCoach.js:30, 711); notes resolve to null when suppressed or low confidence | progressScanCoachEvidence.js:1-50; progressScanCoachResolver.js:103; CoachOutputScreen.js:62, 2206; WeeklyCheckInScreen.js:729-759; hooks/useVisualPillar.js |
| Calibration export | Founder-only: allow-list of three SHA-256 email digests gates a calibration JSON export | progressScanCalibrationAccess.js:12-35 |
| Status | LIVE (camera + model needed). Whether the TFLite path runs on-device after the v2 asset fix is not provable from code; the native fallback exists and is the path that ran for everyone before v2 (progressScanVision.js header) |

Observed: no dedicated scan-consent screen found; `PROGRESS_SCAN_CONSENT_VERSION = 'progress_scan_v1_2026-07-04'` is stamped onto each session row at creation (progressScanStore.js:170) and grep for a scan consent UI in ProgressPhotosScreen and components finds none (the only other `consentVersion` use is Article9ConsentScreen.js:109, 129). NOT VERIFIED whether the Article 9 gate is intended to cover it.

---

## 5. Share cards

### 5.1 Card types and what each can contain (OBSERVED)

| Card | Source params | Content | Body data? | Gate |
|---|---|---|---|---|
| Session | `sessionData`, `workoutId`, `prList` | Workout name/plan, volume, date, chosen "top lifts" (weight x reps), up to 2 optional highlights, optional quote/caption, optional gym photo background with look filters and strength slider | Lift weights only; exercise-name list deliberately removed (founder 2026-09-26) | none |
| PR | `prData` / `prList` | Exercise, weight, previous best toggle | none | none |
| Milestone | `milestoneData` | Year of Lifts, recap variants (week / month / block), recomposition card from BodyMetrics ("Weight steady." + estimated 1RM gain in kg or lb) | Recomposition card prints no bodyweight (recompReframe.js:267-281) | Recomposition card only offered when the recomp read is warranted and not withheld |
| Weekly recap ("Textbook Week") | `weeklyRecapData` = coach output | Sessions x/y, PRs, recovery "Strong", best lift hero, and, ONLY on a cut that lost weight on target and not suppressed and user toggle on: hero "weight lost this week X kg, right on target" plus "lost X kg" in the coach line | YES: a weight-change figure (greatWeek.js:96-125) | `suppress` = param OR live `usePhotoSuppression()`; under suppress weight, progress and best-lift are stripped (ShareCardScreen.js:142-147) |
| Before / after progress | `BeforeAfterShareSheet` from ProgressPhotos | Two dated photos, date + optional weight caption, elapsed time | YES: bodyweight beside photos by founder exception (drawShareCard.js:1415-1430) | Whole card withheld under calm or open ED flag, fail-closed, before compose/encode/share |
| Sticker | any type, format 'sticker' | Transparent stat panel | as parent | as parent |

Formats: story (default, 9:16), portrait 4:5, square 1:1, sticker; themes dark (default) and light; one Skia renderer (`drawShareCard`) for preview and PNG so they cannot drift. Outputs: share sheet, save to gallery (expo-media-library), "Share to Stories" = OS share sheet (no Instagram deep link), "Save as PDF" separate HTML to PDF path, "Post to Community" for pr / milestone / session kinds only (weekly and before/after never offered, "SD-04"). Wordmark footer on every card.

### 5.2 Article 9 rule versus code

CLAUDE.md Section 2: share cards never include name / bodyweight / measurements / private notes, single exception the Pro before/after progress card.
OBSERVED: the weekly recap card prints a weight-lost figure (a bodyweight change, not an absolute weight) behind a founder correction dated 2026-06-22 (greatWeek.js:9-16, 96-125; CoachOutputScreen.js:2815-2822). That is a second weight-bearing card that is not named in CLAUDE.md's exception text. Name, measurements and private notes were not found on any card (grep of drawShareCard.js header comments and recapPayload.js; full draw code not exhaustively read). The `isCut` condition keeps bulk/recomp/maintenance weeks free of scale numbers.

---

## 6. Cardio and steps

| Item | Status | Evidence |
|---|---|---|
| `cardio_log` table (user_id+id PK, activity, duration, intensity, MET, est kcal, recovery impact, distance, avg HR, source, `ext_id` for passive import dedupe, soft delete) | Table, sync handler and cloud-apply only | database.js ~1355-1430; sync/tables/cardioLog.js; lib/database/activity.js `insertCardioLogFromCloud`, `deleteCardioLog` |
| Local writer / UI to log cardio | NOT FOUND. The only `INSERT INTO cardio_log` in src is the cloud apply (activity.js:125); no screen named cardio (ls screens) and no caller of an insert/save helper | grep |
| `coach_outputs.cardio_prescription` column | Present in schema (database.js:644), consumer not traced; `userProfile.cardioPrescription` mention at database.js:1286 is a migration comment | |
| Steps | `daily_steps` fed from HealthKit (iOS) / Health Connect (Android) via lib/activitySteps.js; consumed by step-trend modifier and weekly check-in `steps_avg` | activitySteps.js:1-72; Settings -> Health (SettingsScreen.js:136) |
| Verdict | Cardio is LEGACY/orphaned as a user feature: the data model and cloud sync survive without any local entry point | |

---

## 7. Notifications (src/lib/notifications/, NotificationSettingsScreen)

### 7.1 Categories and channels (OBSERVED, categories.js)

| Category | Channel(s) | Type | Notes |
|---|---|---|---|
| weekly_checkin_reminder | push | habit | Schedule via CoachingReminders (outside NotificationSettings) |
| morning_weight, evening_weight | push | habit | Bounded 14-day horizon of one-shots, re-laid at cold start, weekly foreground top-up, timezone change, ED clear (scheduler.js:1819-1895); 21-day inactivity stand-down (scheduler.js:312) |
| training_reminder | push | habit | NotificationSettings "Training reminders", weekly per training day |
| meal_log_reminder | push | habit | OS DAILY repeat trigger (scheduler.js:524-545) |
| planned_meal_confirm | push | event, rank 10 | default on; ED-gated at schedule time |
| checkin_missed | push | event, rank 4 | default on; ED-gated both times |
| weekly_coach_ready (and block_ready_to_review) | push | event, rank 2 | |
| activation_nudge | push + in-app | event, rank 3 | default on |
| return_nudge | push | event, rank 5 | after 21 days away, 10:00, default on, never under calm or ED flag |
| year_of_lifts_unlock, monthly_recap | push | event | `checkMonthlyRecapReady` softens copy under calm / ED (`neutral`) |
| community_follow, community_activity, community_message | push + in-app | event, server-sent by `community-notify` | default on, own quiet hours |
| ed_pattern_lockout, ffm_floor_hold, sync_error | in-app only | | "push for those is the harm pattern" (categories.js channel comment) |
| cascade_gate, trial_day3, winback, subscription_payment_failure, subscription_expiring, coach_trial_ending | push / in-app / email | billing lifecycle | DORMANT under free access (see below) |
| partner_cheer | push + in-app | retired (Partners removed 2026-09-06) | kept so old pushes resolve |
| rest_timer, rest_end | local ongoing + action buttons | | not budgeted |

### 7.2 Controls and budgets

- NotificationSettingsScreen (1274 lines) sections: Coaching reminders cross-link (weigh-in, check-in, follow-ups, meal-plan reminders live in CoachingRemindersScreen, a different screen); Training reminders toggle + time presets; Getting started (activation nudge, welcome-back note); Community (follow, activity, message toggles + Community quiet hours with its own times); Meal reminders (3 slots, per-slot toggle + time); Quiet hours (toggle + start/end presets). Permission-denied banner with `Linking.openSettings()`.
- Quiet hours: default enabled 22:00 to 07:00, stored `@volyume_quiet_hours_v1`, wrap-aware; a one-off trigger inside the window shifts to the window end; each push helper consults it (quietHours.js:1-129).
- Push budget: event-class pushes capped at 2 per local day and 8 per local week with fixed priority order; loser dropped not queued; fails OPEN if the schedule cannot be read (budget.js:36-70). Habit pushes (weigh-ins, training day, check-in) are outside the cap; server transactional pushes exempt.
- Category prefs authority: AsyncStorage blob `@volyume_notification_prefs` plus an outbound projection table `notification_preferences` (user_id, category, enabled, time_pref, updated_at; created lazily, preferences.js:35-55, synced). Opt-out categories default on, opt-in (training, morning, check-in) default off (categoryPrefs.js:63-118).
- Remote push: `registerPushToken` called after sign-in (RootNavigator.js:2093); app.json now carries `extra.eas.projectId` (app.json:8), so the module header claim "The project has no projectId at time of writing" (pushToken.js:19-22) is stale.

### 7.3 ED and calm suppression as observed

| Surface | Schedule-time gate | Delivery-time gate (foreground handler only) |
|---|---|---|
| morning_weight / evening_weight | `weighInEdFlagOpen` fail-closed (scheduler.js:255-272) | handler: suppressed if weight logged today OR ED flag open (handler.js:35-41) |
| meal_log_reminder | `scheduleMealReminders` returns if flag open or read fails (scheduler.js:575-595) | handler: ED flag, and already-logged slot |
| checkin_missed | ED flag cancels (scheduler.js:1176-1180) | handler: checked in within 72 h OR ED flag |
| activation_nudge | cancels on flag (1295-1298) | handler: stage passed OR ED flag |
| planned_meal_confirm | cancels on flag (1523-1527) | no handler branch |
| return_nudge | flag or calm (read failure = calm) cancels (1427-1439) | no handler branch |
| winback, trial_day3 | flag (and calm for winback) cancels | n/a (dormant billing) |
| weekly_checkin | none (not food adjacent) | handler: already checked in this week |
| community_* | server-side `community-notify` downgrades to in-app under flag (categories.js comments) | |

Raising a flag cancels only the weigh-in family (`cancelMorningNotification` plus the evening backstop; CoachOutputScreen.js:2259). INFERRED risk: the foreground handler never runs when the app is backgrounded (the code comment at CoachOutputScreen.js:2255-2258 states exactly this about weigh-ins), so already-laid `meal_log_reminder` DAILY repeats, `planned_meal_confirm`, `checkin_missed` and `activation_nudge` can still fire in the background after a flag is raised, until the next re-lay. Mitigating: logging food calls `relayMealRemindersFromPrefs` which re-runs the gated scheduler (scheduler.js:627+), and cold start re-lays through `restoreNotifications`. Whether any of these actually fires after a raise was not tested.

Copy check: subtitle "Volyume uses local notifications only, never marketing." (NotificationSettingsScreen.js:679-681) while the Community section and `pushToken.js` deliver server-sent pushes (community-notify). INFERRED inconsistency of claim.

---

## 8. Wellbeing and Beat UK surfacing (exact locations)

OBSERVED by grep across src/ and public/ for `Beat`, `0808`, `helpline`, `beateatingdisorders`, `getEdSupportLink`:

| # | Surface | What appears | File:line | Condition |
|---|---|---|---|---|
| 1 | Body metrics calm interstitial "A gentle pause" | Full helpline sentence: "If you're struggling, Beat Eating Disorders UK: 0808 801 0677 (free, confidential)." (the `WELLBEING_HELPLINE` constant, wellbeing.js:19-20) | BodyMetricsScreen.js:947 | Calm mode, once per app process |
| 2 | Coach ED-pattern lockout card | Button "<ctaSupport> · Beat" that opens `https://www.beateatingdisorders.org.uk` (locale-aware: en-US NEDA, en-AU Butterfly, default Beat) | CoachOutputScreen.js:697-706, 745; link table whyThisTemplates.js:442-456 | Open ED lockout (flag-raised week) |
| 3 | Community physique-division pages | Row "Support with eating and body image: Beat" (opens the same URL via `getEdSupportLink`) | CommunityDimensionScreen.js:154-180 (BeatSignpostRow) | Seven physique-division dimension pages; shown regardless of calm; the only content left under withhold |
| 4 | Public support page | Paragraph with link to Beat | public/support/index.html:134 | Web, not in the app |

NOT present (OBSERVED, no match in the file): NutritionTargetsScreen (floor banner, EA caution, aggressive-cut copy), DiaryScreen, FoodInsightsScreen, MealPlanScreen, ProgressPhotosScreen, ShareCardScreen, NotificationSettingsScreen, GoalChangeSummary, GoalLockConsent, WellbeingCheckScreen. The WellbeingCheck positive-score alert names "your GP or a registered dietitian" and no Beat line. YouScreen.js:538-543 has a code comment saying the Wellbeing check is where a Free user could "reach the Beat UK signpost it shows"; the screen itself does not render one (stale or incorrect comment).

Calm mode behaviour map (all fail-closed reads of `@volyume_wellbeing_mode`): withholds slider + training status + aggressive-cut goal (NutritionTargets), Body metrics figures (after one confirm), Progress root weight figure, photo scores / compare / share / bodyweight, weekly recap weight and best-lift, before/after card, return nudge, meal reminder offer, winback. Does NOT withhold: Diary calories / macros / rings, Food Insights, Meal builder, banking (Diary gate).

---

## 9. Local SQLite schema (src/lib/database.js, 14,517 lines)

- Encrypted with SQLCipher; key in expo-secure-store (CLAUDE.md Section 1; src/lib/dbCrypto.js not re-read).
- Migration mechanism: `SCHEMA_MIGRATIONS` array (database.js:492-2921), each entry one version; `CURRENT_SCHEMA_VERSION = SCHEMA_MIGRATIONS.length` (2926). Counting top-level `  [` entries between those lines gives **90 versions**, so `PRAGMA user_version` target is **90** (OBSERVED by structure count, not by running the app). Each version runs inside one `withTransactionAsync` with its `user_version` bump (adversarial audit 2026-08-26 fix, database.js:3231-3277); function-ops allowed; proven-benign duplicate-column/already-exists errors are skipped; a byte snapshot is taken before the first pending version (`dbSnapshot`, COMP-009).
- Latest version (90): `ALTER TABLE workout_sets ADD COLUMN entry_typed INTEGER` (database.js:2919). The comment above it still says the cloud counterpart `migrate_189` is "WRITTEN, NOT APPLIED" and `ENTRY_TYPED_PUSH` is false, whereas CLAUDE.md's status block says 189 was applied 2026-10-08 with ENTRY_TYPED_PUSH on: stale comment (the CLAUDE.md side was not independently verified).
- Outside migrations: `notification_preferences` is created lazily by `ensureTable()` (preferences.js:35); `effective_maintenance_memos` is declared twice (database.js:387 and 2586, the second a rebuild).
- Tables grouped by domain (names from `CREATE TABLE IF NOT EXISTS`; purposes read from column lists and nearby comments):

**Nutrition and food**
| Table | Purpose |
|---|---|
| `foods` | Shared food cache and bundled snapshots: id, source (off/cofid/usda...), source_id, barcode_ean, name, brand, per-100g kcal/P/C/F/fibre/sodium/sugar, 27 micronutrient columns, serving, verified, fetched_at. Unique `(source, source_id)`, indexes on barcode and lower(name) |
| `custom_foods` | User-created foods (same macro/micro columns, barcode_ean, photo_url, notes, soft delete) |
| `food_entries` | The diary: user_id, entry_date, meal_slot, food_ref, quantity_g, denormalised kcal/P/C/F/fibre, logged_at, soft delete; later columns `is_planned`, `weight_state` (default 'as_weighed'), `eaten_at` |
| `daily_intake_rollups` | Per-day totals + entries_count (excludes planned rows) |
| `saved_meals` | Named bundles (items_json) |
| `recipes`, `recipe_ingredients` | Recipes (total_servings, notes) and ordered ingredients with quantity_g |
| `food_favourites` | Favourite / dislike marks per food_ref (also the "don't suggest" list) |
| `food_frequents` | Computed log counts per food |
| `food_slot_recents` | Per-meal-slot recent foods with last quantity ("usual" chips) |
| `food_swaps` | Standing food replacement preferences (from_food_key, to_food_key, scope) |
| `daily_water` | Millilitres per day |
| `meal_plans` | Generated plan JSON, `is_active`, soft delete (one active) |
| `nutrition_targets` | Saved engine output: bmr, tdee, target_kcal, P/C/F, phase, method, activity, confidence, warnings; later `goal`, `protein_approach`, `deleted_at` |
| `effective_maintenance_memos` | Canonical maintenance memo (residual kcal, source, status, evidence signature, algorithm version) |
| `peak_week_plans` | Early show-prep schema (show_date, federation, carbs/sodium/water per kg); a consumer was not traced (INFERRED legacy) |

**Body, check-in and coach state**
| Table | Purpose |
|---|---|
| `body_metric_log` | Body fat % + source and 9 circumference columns (+ weight_kg, notes) per log time; syncs as `body_composition_log` |
| `morning_weights` | Weigh-ins (weight_kg, logged_at, notes); syncs as `weight_log` |
| `user_body_profile` | Sex, DOB, height, experience, training age, primary goal, `scoff_score`, `goal_lock_advanced`, `goal_lock_set_at`, gdpr_consented |
| `weekly_checkins` | Energy, soreness, stress, sleep, adherence (cals/steps/cardio), training performance, joint pain, `steps_avg` |
| `coach_outputs` | Weekly coach result (phase, signals, calorie change, steps target, cardio_prescription, why_this, output_json, `applied`) |
| `user_insights` | Generated insight cards (key, severity, copy, dismissed_at) |
| `daily_steps` | Steps per day (source manual / health) |
| `cardio_log` | See section 6 (no local writer) |
| `ed_pattern_flags` | ED state machine: one open row while raised, cleared_at on clearance, reason, signals_json |
| `tier_history` | Tier transition log (legacy of billing; free access) |
| `engine_telemetry` | Local mirror of engine events with `pushed_at` |

**Progress media**
| Table | Purpose |
|---|---|
| `progress_photo_meta` | Photo date / pose / weight / note keyed by file name (rebuilt in v55; `progress_photo_meta_legacy_v55` temp dropped, database.js:3111) |
| `progress_scan_sessions` | One scan: status, analysis_status, consent_version, camera, timer, estimate BF % + range + confidence + source, trend, quality, model + estimator versions, signals_json, abstention + bias flags |
| `progress_scan_assets` | Per pose photo: uri, quality / landmark / segmentation / blur / lighting / framing / tilt, `signals_json` |
| `progress_scan_classification_history` | Assessment status history per user |

**Training, programmes, exercises (other slice; listed for completeness)**
`exercises`, `custom_exercises`, `workouts`, `workout_sets` (latest column `entry_typed`), `workout_notes`, `workout_notes_v2`, `exercise_user_notes`, `exercise_goals`, `routines`, `routine_exercises`, `programmes`, `mesocycles`, `mesocycle_weeks`, `planned_muscle_volume`, `planned_muscle_volume_sync`, `adaptation_events`, `adaptation_events_sync`, `exercise_intent`, `exercise_swaps`, `exercise_slot_defaults`, `session_resolutions`, `capability_constraints`, `session_constraint_effects`, `plan_folders`.

**Retired social (Partners, removed 2026-09-06)**: `partnerships`, `partner_week_signals`, `partner_cheers`, `partner_weekly_intentions`, `partner_win_cards`, `partner_shared_blocks` (local mirrors kept).

**Sync plumbing**: `pending_sync_ops` (queued writes), `sync_meta` (watermarks / flags).

Totals: roughly 62 distinct tables; 147 distinct `ADD COLUMN` statements in migrations (count of unique `table.column` ALTER lines, regex-based, approximate). Local DB wiped on sign-out under the identity law (database.js identity comment ~1236-1250, not exhaustively traced).

---


---

## 10. Reference: constants and thresholds in one place (OBSERVED)

| Constant | Value | File:line |
|---|---|---|
| Sex kcal floor | 1,500 (male, unknown) / 1,200 (female) | nutritionEngine.js:721-723 |
| FFM floor | 30 kcal per kg FFM | nutritionEngine.js:127 |
| EA caution lines | 35 male / 40 female and unknown | nutritionEngine.js:779 |
| Safe loss / hard gate | 0.8% / 1.5% BW per week | nutritionEngine.js:111-112 |
| kcal per kg fat | 7,700 | nutritionEngine.js:113 |
| Diet break | 8 weeks in deficit | nutritionEngine.js:117 |
| Slider range / step | +/-10% of engine target / 25 kcal | energyChoice.js (`RANGE_FRACTION`, `ENERGY_STEP_KCAL`) |
| Calorie bank | min 50, max 500 kcal, default 150, step 50 | calorieBank.js:30-36; CalorieBankSheet.js:21-22 |
| Gain settle | 4 weeks of a gain phase | weeklyCoach.js:634 |
| Enhanced gain ceiling | 0.75% BW/week | trainingStatus.js:25 |
| Trend states | <7, <14, <42, 42+ weigh-ins | weightTrend.js:33-39 |
| Direction reading | >= 7 points over >= 7 days, 14-day window | weightTrend.js:140-142 |
| Steady rule | < 0.2 kg/week and < 0.5 kg total | weightTrend.js:120, 127 |
| Trend freshness | newest weigh-in must be within 14 days; window 90 days | hooks/useWeightTrend.js:70-90 |
| Weigh-in plausibility | 20-500 kg; body fat 1-80%; circumference 1-300 cm | bodyMetricValidate.js:34-40 |
| Food insight coverage | 70% of window, min 4 logged days | food/insights.js:30-40 |
| Macro adherence tolerance | kcal 10, protein 10, carbs 15, fat 15 (%) | food/adherence.js:11-16 |
| Search | min 2 chars, 250 ms debounce, weak-local threshold 3 hits | waterfall.js:35-46; FoodSearchScreen.js header |
| Network timeouts | OFF 1,200 ms, USDA 1,500 ms | liveOff.js; usda.js |
| Water default target | 3,000 ml | DiaryScreen.js:2198 |
| Meals per day default | 4 (AsyncStorage `@volyume_meals_per_day`, 3-8) | mealSlots.js:25; NutritionTargetsScreen.js:455-460 |
| Scan interval / tilt gate | 7 days / 10 degrees | ProgressPhotosScreen.js:130; progressScanAnalysis.js:25-35 |
| Scan image quality | 0.92 | ProgressPhotosScreen.js:132 |
| Scan library limit | 100 | ProgressPhotosScreen.js:131 |
| Event push caps | 2 per day, 8 per week | notifications/budget.js:36-37 |
| Quiet hours default | 22:00 to 07:00 | quietHours.js:19-25 |
| Weigh-in stand-down | 21 days without a completed session | scheduler.js:312 |
| Weigh-in horizon | 14 days of one-shots; top-up if last laid > 7 days ago | scheduler.js (WEIGH_IN_HORIZON_DAYS, WEIGH_IN_REFRESH_AFTER_MS) |
| Return nudge | 21 days absent, 10:00 | scheduler.js:1356-1357 |
| Meal stand-down run | 3 one-shot days after a slot is already logged | scheduler.js:519 |
| Ed detector | 2 signals (3 advanced); trend <= -1.5%/wk; energy <= 2 for 2 weeks | edPatternDetector.js:36-43 |
| SCOFF positive | score >= 2 of 5 | WellbeingCheckScreen.js:88; coachReport.js:260 |
| OFF write-back | 3 retries, back-off 2 s / 8 s / 30 s | writeback.js:30-33 |
| Recipe/CSV | CSV formula-injection prefix on = + - @ tab CR | csvExport.js:20-33 |

## 11. Reference: notification identifiers and what lays them (OBSERVED from exports, scheduler.js)

| Function | Lays | Triggers / notes |
|---|---|---|
| `scheduleMorningWeightNotification(hour, minute, {userInitiated})` | morning weigh-in | 14-day one-shot horizon; ED-gated; stand-down gate exempted by `userInitiated` |
| `scheduleEveningWeightReminder(19, 30)` | evening backstop | rides `morningEnabled`; handler stands down once weight logged |
| `relayWeighInAfterTrainingReturn()` | re-lay after a completed session breaks a stand-down | called by workout finish |
| `scheduleMealReminders(reminders)` | per-meal daily repeats | tier + ED + quiet hours + already-logged-today gates |
| `scheduleCheckinReminder` / `scheduleNextCheckinReminder` | weekly check-in | skip when already checked in this week (handler) |
| `scheduleMissedCheckinFollowups` | follow-up pair after a missed check-in | ED-gated, never shame copy |
| `scheduleActivationNudge` | early-activation stages cold_start / stalled_1 / stalled_2 | single shot per stage |
| `scheduleReturnNudge` | after 21 days away | calm and ED gated, one only |
| `schedulePlannedMealConfirm` | evening nudge for planned-but-unconfirmed meals | ED gated |
| `scheduleWeeklyCoachReady` | weekly coach ready | default 09:00 |
| `scheduleBlockReadyToReview` / `scheduleBlockReadyForActiveBlock` | block-complete review | shares coach category |
| `checkYearOfLiftsUnlock`, `checkMonthlyRecapReady` | milestone pushes | monthly recap copy neutral under calm / ED |
| `scheduleCascadeGateNotifications`, `scheduleTrialDay3Notification`, `scheduleWinbackNotification` | billing lifecycle | DORMANT in a free product; winback also calm and ED gated (scheduler.js:1043-1056) |
| `restoreNotifications(prefs, userId)` | cancels all then re-lays everything from prefs | cold start, timezone change, weekly foreground top-up, ED clear |
| `rescheduleForTimezoneIfChanged`, `refreshWeighInHorizonIfStale` | maintenance | foreground |

Listeners: `installNotificationListeners` (notifications/listeners.js), tap routing in `notificationRoute.js` (maps data.type to screens, including a diary-day link), rest-timer actions in `restTimerActions.js` (Log set, +15 s, -15 s, Skip, Add exercise; registered with `setNotificationCategoryAsync`, needs a native build, categories.js comment).

## 12. Suggested device test checklist for this slice (for whoever acts on these observations)

1. Fresh account, no targets: Diary shows no rings; "Set it for me" on Nutrition targets requires sex, age, height, weight and the consent tick before it calculates.
2. Calculate a mild cut for a 60 kg woman with low maintenance: expect the target held at 1,200 or the FFM floor, the banner "Held at your safe minimum", and (if the line trips) the "Ease this cut" button, which only raises calories.
3. Turn calm mode on, return to Nutrition targets: slider and Training status disappear, aggressive cut vanishes from the goal list, saved target reverts to the engine value. Open Body metrics: "A gentle pause" with the Beat sentence; Continue; figures withheld. Open Diary: confirm what still shows (calories do).
4. Log a barcode that exists in the bundled snapshot (works offline), one that only exists in OFF live (needs network), and a miss: expect ScanLabel with the barcode prefilled, then AddCustomFood prefilled.
5. Higher-calorie day: open sheet, choose Saturday +200; confirm planned food moves; reinstall or sign in on a second device and confirm whether the bank survives (expected: it does not).
6. Weekly recap share on a cut week that lost weight on target: confirm the weight-lost hero shows; toggle progress off; then enable calm and confirm the number is stripped.
7. Progress photos: capture a front/back set, confirm the 7-day gate message on a second scan, confirm score hidden under calm and an open ED flag, confirm delete still works under suppression.
8. Notifications: set a 08:00 breakfast reminder, then (in a test account) raise an ED flag by running the Coach screen; background the app and confirm whether the daily breakfast reminder still fires (observation 4).
9. Maximum accessibility text size pass on Diary, Nutrition targets, Body metrics, Notification settings, Share card.

## A) Cross-domain wiring

Consumes:
- Auth/session/user id and tier (always 'pro') from the Zustand store (`useAppStore`), body profile (`user_body_profile`) from onboarding.
- Weekly coach (`runWeeklyCoach`, `CoachOutputScreen`) for coach verdicts, held decisions, applied calorie changes, ED flag raise; `coachApply.js` re-enforces floors.
- Weekly check-ins for ED signals (energy, adherence, food data presence).
- Health platform data (steps, weights) via `lib/activitySteps.js` and `lib/health.js` into `daily_steps` and `morning_weights`.
- Training data for notification stand-down (last completed workout) and activation nudge stage.
- Supabase via the registry sync layer; `community-notify` Edge Function for server pushes.
- `expo-notifications`, `expo-camera`, `react-native-vision-camera`, `@react-native-ml-kit/text-recognition`, `react-native-fast-tflite`, `@shopify/react-native-skia`, `expo-media-library`, `expo-sharing`, `expo-secure-store`.

Exposes:
- Nutrition targets and `effective_maintenance_memos` to the weekly coach and Home; daily intake summaries to the coach and ED detector; food logging events to notification stand-down (`standDownMeal`).
- `getOpenEdPatternFlag` / `readEdOrCalmSuppressed` / `usePhotoSuppression` as the shared fail-closed safety reads, used by 30-plus screens and libs (CoachOutput, Home, Analytics, WeeklyCheckIn, YouScreen, widgets writer, community trainingConsistency).
- Weight trend view-model to Analytics (Progress tab) and Home strip.
- Share card renderer to WorkoutSummary, LiftProgress, YearOfLifts, CoachOutput, BodyMetrics.
- Photo-scan evidence packet to WeeklyCheckIn and Coach as non-authoritative context only.
- Calm-mode flag (`wellbeing.js`) to every surface.

## B) Product-decision observations

1. **Nutrition surfaces do not honour calm mode.** Diary, Food Insights, Meal builder and Food Search render calories, rings, adherence bars and macro hit-rates with no calm or ED-flag read (grep of those four files: no `WELLBEING_KEY`/`isCalm`; Diary reads the flag only at DiaryScreen.js:404 and the calm flag only for the reminder offer at ~620-640). By contrast Body metrics, photos, slider, share cards and the Progress pillar all withhold. Either the calm promise is body-and-photo only or food numbers are an unexamined gap; the code does not say which.
2. **Higher-calorie day ignores calm mode** and is local-only (not synced). Gate is `targets && !floored && !edFlag` (DiaryScreen.js:404). Bank lives in AsyncStorage + store (useAppStore.js:2355-2361).
3. **Beat UK helpline text appears in exactly one in-app place** (Body metrics calm interstitial). The one screen a code comment says carries it (WellbeingCheck, YouScreen.js:538-543) has no Beat reference; a positive SCOFF score yields only "speak to your GP or a registered dietitian". The Nutrition targets floor banner and EA caution, where under-eating risk is surfaced, carry no signpost either.
4. **ED flag raise cancels only weigh-in reminders.** Meal-log DAILY repeats, planned-meal-confirm, missed check-in and activation nudges rely on the foreground handler, which does not run in the background (CoachOutputScreen.js:2255-2259 comment makes the same point for weigh-ins). The ED flag can also only be raised when the Coach screen runs the weekly engine (single caller, CoachOutputScreen.js:2241), so a user who never opens Coach is never flagged (INFERRED from one caller; background raising not found).
5. **Weekly recap share card prints weight lost** (greatWeek.js:96-125) beyond the single before/after exception written into CLAUDE.md Section 2. Needs an explicit rule decision either way.
6. **Cardio is orphaned**: table, sync handler and cloud-apply exist but nothing writes locally and no screen exists. Either remove, or build the entry surface.
7. **Dormant/dead surfaces carried in the tree**: MealNames (registered, unreachable, founder-retained), per-day offsets (storage + cloud sync of retired data, with a registry comment still describing them as display offsets the diary applies, registry.js:238-249, contradicted by perDayTargets.js header), `peak_week_plans` table, `tier_history`, billing lifecycle notification categories (cascade_gate, trial_day3, winback, payment failure, expiring, coach_trial_ending) in the budget priority list, `buildProgressScanCoachEvidence`'s "nothing calls it yet" header while `useVisualPillar` now does (progressScanCoachEvidence.js:12 vs hooks/useVisualPillar.js:56-57).
8. **Stale Pro text**: MealPlanScreen.js:8 "Pro surface", ProgressPhotosScreen.js:1014 and 1229 "Pro-gated", WeeklyMicronutrientsCard header "already Pro-gated at the navigator level", ShareCardScreen (Pro-gated comment in greatWeek.js:12). Harmless at runtime but misleading for a reader deciding what is gated.
9. **Notification copy claims "local notifications only, never marketing"** while server pushes exist for Community (and the pushToken header says server pushes are only for payment failure). Copy and architecture have drifted.
10. **Two consent surfaces for the same data**: the Article 9 gate and an extra "I consent to storing this data" checkbox required on every Nutrition targets calculation (NutritionTargetsScreen.js:647, 1111-1124, 1364-1377). Not necessarily wrong; worth deciding whether the second is still needed.
11. **Progress scan is ML-derived** (selfie segmentation network + deterministic regressor, estimator status `provisional_validation_pending`) producing named leanness bands up to "Peak Condition" in an ED-adjacent product. It is suppressed under calm / ED and never moves targets (`affectsTargets` literal false). CLAUDE.md's "no AI, ever" is about the coaching engine; this perception model is outside it, but the line is a founder interpretation, not written down.
12. **USDA coverage depends on a build secret**: if `EXPO_PUBLIC_USDA_API_KEY` is absent the fifth source silently returns nothing (usda.js:12-30); nothing in-app indicates it.
13. **Training status (Natural / Enhanced)** is a sensitive input stored in SecureStore only. It only changes the coach's gain ceiling; it is hidden under suppression. Lost on reinstall or device change by design (not synced).
14. **Energy slider can lower calories below the engine target** (down to range bottom or the strictest floor) and above it by up to +10%; it never goes under a floor (energyChoice.js:41-78). The stated rationale and bounds are in the file; whether users on a cut can drift to the 0.8% BW/week line deliberately is a product choice already encoded.
15. **Floor wording for unknown sex** takes the higher floor (1,500) but the BMR path uses the female Mifflin constant for any non-male value (nutritionEngine.js:620-631): the two defaults point in different directions, though onboarding enforces sex so it only affects failure states.
16. **Registered-in-three-stacks ShareCard / BodyMetrics / ProgressPhotos** means the same screen can be reached with different back stacks (Progress vs You); intended by the cross-tab helper but a duplicated surface.

## C) Not verified

- Never ran the app, tests, lint or a build. All status labels are from reading code and navigator registration.
- Not read in full: DiaryScreen (2653 lines, read about 40%), NutritionTargetsScreen (2967, about 25%), MealPlanScreen (2242, headers + greps), ProgressPhotosScreen (2579, about 10%), drawShareCard.js (1785, greps and the before/after block only), progressScanAnalysis.js (1862) and progressScanVision.js (1059; headers only), scheduler.js (2116, about 35%), BodyMetricsScreen (1722, about 15%), db.js (2398, export list only).
- Not traced: `src/lib/dbCrypto.js`, `dbSnapshot.js`, SQLCipher key lifecycle; sign-out wipe of tables; whether `food_swaps`, `food_slot_recents`, `food_frequents` sync via legacy `src/lib/sync.js`; `peak_week_plans` consumers; `user_insights` producers; `coach_outputs.cardio_prescription` consumers; `lib/health.js` weight import wiring and permissions; HealthKit / Health Connect plumbing beyond file headers; `community-notify` Edge Function; `CoachingRemindersScreen` details (weigh-in / check-in reminder controls); `SettingsCoachingScreen` calm toggle UI; `SettingsPrivacyScreen` OFF toggle copy; `SettingsDataScreen` skip-name reset; HomeScreen weigh-in strip and coach banners; ProOnboarding body-fat/weight capture; WeeklyCheckIn nutrition tie-ins; Analytics WeightTrendCard rendering.
- Not verified: that the 90 migration count equals what a device reports in `PRAGMA user_version` (structural count only); whether the USDA secret is set in GitHub; whether TFLite segmentation executes on devices or the native fallback does; whether any cloud migration state matches CLAUDE.md's status block (read-only repo, no Supabase calls made); real behaviour of background notification firing after an ED flag raise; which control opens the Diary "Day tools" sheet (opened at DiaryScreen.js:1403, caller not traced).
- Content of `docs/*` was deliberately not used (D37).
