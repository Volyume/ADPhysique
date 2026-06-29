# Cronometer — Complete Feature Inventory & VOLYUME Comparison

**Date:** 2026-06-29
**Author area:** Complete Cronometer feature surface (diary, foods, custom foods, recipes,
meals, biometrics, charts/trends, reports, fasting, nutrition scores/oracle, suggested
targets, water, exercise, notes, food groups).
**Audience:** VOLYUME founder, deciding where to match / beat Cronometer.

## Source & method (read this first — obfuscation honesty)

Evidence is from the **decompiled Cronometer Android app** (Flutter). Flutter compiles to
native (`libapp.so`); **class/method names are obfuscated** (`_OracleSearchState@1768357574`,
`a/b/c` package shards). Therefore **signal comes from user-facing strings, route paths,
enum constants and asset names — NOT from class names.** Where a feature exists only as
back-end logic with no distinctive string, I CANNOT confirm it from this corpus and I say so.

Corpora grepped:
- `scratchpad/libapp_strings.txt` (1.7 MB Flutter strings — richest signal)
- `scratchpad/cronometer/corpus/dex_strings_raw.txt` (3.3 MB Java/Kotlin shell)
- `scratchpad/cronometer/corpus/{screens_components,cronometer_identifiers,food_ui_copy,premium_keys,nutrient_keys,res_strings}.*`

**Confidence key:** CONFIRMED = explicit, unambiguous user-facing string(s).
INFERRED = strong indirect evidence (route path, enum, gating copy) but no single
naming string. OBFUSCATED-UNKNOWN = plausibly present but hidden by obfuscation; not asserted.

VOLYUME side: read from actual source under `/home/user/ADPhysique/src` (file refs given).

---

## 1. Complete Cronometer feature inventory (with evidence)

### 1.1 Diary (food log) — CONFIRMED
- Core day-by-day diary. Strings: `Diary`, `Add Food`, `Add to Diary`, `Diary Screen`,
  `Diary Settings`, `Delete All Diary Entries`, `Are you sure you want to delete all diary entries for the current day?`
- **Diary Groups** (meal sections) — customisable, default `Breakfast / Lunch / Dinner / Snacks`
  + `Uncategorised`. CONFIRMED: `Diary Group`, `Diary Groups`, `Diary Group Settings`.
- **Diary Group Reminders** — per-group notification times. CONFIRMED:
  `Diary Group Reminders`, `Choose to enable notifications for specific diary groups and set the reminder time.`
- **Timestamps** on entries (GOLD). CONFIRMED: `Add timestamps to your diary entries.`,
  `Add Timestamp to Selected is a feature for Gold Subscriber.`, `Sort all by time is a feature only available to Gold subscribers.`
- **Copy days / groups:** `Copy to Today`, `Copy Current Day`, `Copy Previous Day`,
  `Copy Yesterday's Group`. CONFIRMED.
- **Repeat Items** (recurring auto-log, GOLD) — route `/repeatItems`, `Repeat Items is a feature for Cronometer Gold subscribers.` CONFIRMED.
- **Multi-Add** (bulk add/select). CONFIRMED: `Enable Multi-Add`.
- **Summary column** (customisable diary right-hand readout, GOLD). CONFIRMED:
  `Customise the summary column in your diary`, `Summary Column`.
- **AI / photo logging** of diary (see 1.13). CONFIRMED: `AddedToDiaryFromAILogging`, `AiSuggestDiaryDisplay`.
- Routes: `/diary`, `/diary-entries`, `/diarySettings`, `/moveDiary`. CONFIRMED.

### 1.2 Foods & food search — CONFIRMED
- Search across multiple databases: **USDA** (DRIs), **NCCDB** (`assets/NCCDB.svg`, `NCCDB`),
  **FDC Branded** (`FDCBranded`, `fdc:branded`). CONFIRMED. (Cronometer's curated, verified
  database is a known differentiator vs. crowd-sourced.)
- `Browse All`, `Browse Categories`, `Add to Favourites`, recents (`from recents`,
  `Delete Recent Item`). CONFIRMED.
- `Include Custom Foods`, `verifiedOnly` filter (`ClientSearchContext.verifiedOnly`). CONFIRMED.

### 1.3 Custom foods — CONFIRMED
- `Custom Food`, `Custom Foods`, `Add any item not in our database as Custom Food.`,
  `Nutrition Label` (manual label entry), `Add Serving Size`, advanced serving sizes,
  `Clear all serving sizes is a feature for Gold subscribers.` CONFIRMED.

### 1.4 Recipes — CONFIRMED
- `Create Recipe`, `Edit Recipe`, `Add Ingredient`, `Servings Per Recipe`,
  `Servings Based` / weight-based servings.
- **Recipe Importer** (from a website URL, GOLD). CONFIRMED:
  `Easily import recipes from your favourite websites.`, `Create recipes manually or import them from a website for quick logging.`
- **Create Recipe From Selection / From Group** (GOLD). CONFIRMED:
  `Create Recipe From Selection is a feature for Gold Subscribers.`, `Create recipe from Group`.

### 1.5 Meals — CONFIRMED
- Bundle foods/recipes into a reusable Meal. CONFIRMED:
  `Combine your favourite recipes and foods into one meal for faster logging.`,
  `Save time logging your meals! Combine frequently consumed items into Meals for more efficient tracking.`

### 1.6 Sharing custom foods/recipes (friends) — CONFIRMED
- `Share Custom Foods and Recipes`, `Share your custom foods and recipes with your friends who use Cronometer.`
  via email friend requests (GOLD). CONFIRMED.

### 1.7 Biometrics tracking — CONFIRMED (very broad)
- `Add Biometric`, `+ Custom Biometric`, `Add Custom Biometric` (GOLD:
  `Creating custom biometrics is only available to Gold subscribers.`), `Biometric Name`, `Biometric Unit`.
- **Confirmed biometric enum** (from string constants):
  `WEIGHT`, `BODY_FAT_PERCENTAGE`, `BODY_FAT_MASS`, `BODY_FAT_RATIO`, `LEAN_BODY_MASS`,
  `BODY_MASS_INDEX`, `BODY_WATER_MASS` / `TOTAL_BODY_WATER`, `WAIST_CIRCUMFERENCE`,
  `BLOOD_GLUCOSE`, blood **ketones** (`Ketones (Blood)`, `Import Ketones`, `KetoMojo`/`Ketomojo`),
  `BLOOD_PRESSURE_SYSTOLIC` / `_DIASTOLIC`, `BLOOD_OXYGEN`, `BLOOD_TYPE`, `BODY_TEMPERATURE`,
  `HEART_RATE`, `RESTING_HEART_RATE`, `WALKING_HEART_RATE`, `HEART_RATE_VARIABILITY_RMSSD`/`_SDNN`,
  `SLEEP` (+ `SLEEP_DEEP/REM/LIGHT/AWAKE/IN_BED…`), `DIETARY_CHOLESTEROL`, **Lipid Panel**
  (`Lipid Panel`, `Lipid panel data access` — HDL/LDL/triglycerides), `CYCLE_TRACKING`
  (menstrual). CONFIRMED.
- **Custom medical biometrics** (user-defined name + unit + time series). CONFIRMED.

### 1.8 Charts / Trends — CONFIRMED
- `Add Chart`, `/manageCharts`, `Create custom charts with gold!`, `This Chart is only available to Gold subscribers.`,
  `Are you sure you want to delete the chart?`. CONFIRMED.
- Chart accessors confirmed: weight (`chrt_wech` weight-change, `chrt_wewa` weight),
  energy chart, **weight-change chart**, **blood-pressure chart** (`chrt_bldpres`),
  **glucose/ketone chart** (`chrt_gluket`, `Glucose Ketone Index`), **lipid chart** (`chrt_lipid`),
  **single-nutrient chart** (`SingleNutrientChartDataAccess`), **score chart** (`chrt_score`),
  cycle (`chrt_cc`). CONFIRMED.
- **Nutrient bar charts grouped by class:** `macroNutrientsBarCharts`, `lipidNutrientsBarCharts`,
  `proteinNutrientsBarCharts`, `carbNutrientsBarCharts`, `vitaminNutrientsBarCharts`,
  `mineralNutrientsBarCharts`, `generalNutrientsBarCharts`. CONFIRMED — this is the full
  vitamin/mineral/amino panel visualisation.

### 1.9 Reports / Export — CONFIRMED
- Route `/nutritionReport`; `Daily Report`, `Adjust the date range and select the Report widget you would like displayed.` CONFIRMED.
- **PDF for health professionals.** CONFIRMED: `Create an easy-to-read PDF to share with health professionals.`
- **CSV / data export:** `.csv`, `.pdf`, `Export Food Calories`, `Export Water Log`,
  `Export Food Calories`, Apple-Health / Health-Connect export. CONFIRMED.
- `This date range is only available to Gold subscribers.` (history depth gated). CONFIRMED.

### 1.10 Fasting — CONFIRMED (GOLD)
- `Fasting Timer`, `Start Fast`, `Schedule Fast`, `Scheduled Fast`, `Stop Fasting`,
  `Continue Fast`, `Elapsed Time`, `Ask to stop fast when adding food`,
  `7-fast Average`, `Completed fasts`, `longestFastInHours`, `last7FastsAvgInHours`.
  Route `/fasting`. Dashboard fast cards + **home-screen fasting widgets**
  (`homewidget/widgets/fasting`). CONFIRMED. Gated: `Fasting is a feature for Gold subscribers.`

### 1.11 Nutrition Scores / Oracle — CONFIRMED (GOLD)
- **Nutrition Scores:** `Nutrition Scores`, `Show Nutrition Scores`, `Single Nutrition Score`,
  `Select up to eight nutrition scores to highlight at the top of your Diary screen.`,
  `With Gold, you can see a set of 8 nutrition scores to represent well researched health concepts.`
  CONFIRMED. Components seen: `Nutrient Balance`, `Energy Balance` / `Active Energy Balance`,
  `Omega(Energy)Balance`, `KetoProteinScoreComponent` / `Ketogenic Score`,
  Lipid/`Lipid Panel`. (The full named set of 8 is partly OBFUSCATED — I confirm Nutrient
  Balance, Energy Balance, Omega-3:6 balance, Ketogenic; the other component labels are not
  cleanly resolvable in strings.)
- **The Oracle** (nutrient → best-food-sources search, GOLD): `The Oracle`, `Nutrient Oracle`,
  `Oracle Nutrient Search`, `The Oracle will list the foods that are the best sources of the selected nutrient.`,
  route `OracleSearch`. CONFIRMED.

### 1.12 Suggested / custom targets — CONFIRMED
- Energy + macro targets: `Energy Target`, `Daily Energy Target`, `Custom Energy Target`,
  `Energy Budget`, `Default Macronutrient Targets`, `Fixed Targets`, `Estimated Macro Targets`.
- **Macro Ratios** presets (Zone/Even/Paleo/LFRV unified): `Macro Ratios`,
  `You have previously chosen Zone, Even, Paleo or LFRV macro settings: These are now all under the umbrella of "Macro Ratios".` CONFIRMED.
- **Keto Calculator / Keto targets:** `Keto Calculator`, `KetoCalculator`, `KetoTarget`,
  `For more accurate ketogenic targets, periodically log your actual body fat %`. CONFIRMED.
- **Macro (Target) Scheduler** (per-weekday target templates, GOLD): `Macro Scheduler`,
  `Macro Scheduler Templates`, `Schedule macronutrient targets with Cronometer Gold!`,
  `Target Scheduler is only available to Gold subscribers.` CONFIRMED.
- **DRI-based suggested intakes:** `This is your intake compared to the USDA Dietary Reference Intakes (DRIs) for an average person of your age and gender.` CONFIRMED.
- Add expenditure-above-baseline to target. CONFIRMED.
- Nutrient targets can be **hidden by a professional** (`Nutrient information has been hidden by your professional`). CONFIRMED.

### 1.13 Photo / AI logging + Snapshots — CONFIRMED (GOLD trial)
- **Photo/AI food logging:** routes `/food-search/multimodal/photo`, `/photoLogging`,
  `Take a photo of your meal and we'll identify the key ingredients and servings.`,
  `Photo Logging is a Gold feature.`, `AiImporterModel.fromPhotoLogging`. CONFIRMED.
- **Barcode scanning:** `Barcode`, `BarcodeScanResult`, EAN/UPC formats. CONFIRMED.
- **Snapshots** (progress photos): `Add Snapshot`, `Add snapshots here to view your progress over time.` CONFIRMED.

### 1.14 Water — CONFIRMED
- Water tracked as a **nutrient target**, not a separate widget: `total water nutrient target`,
  `will contribute to your total water nutrient target`, `Show total water nutrient target bar`,
  `Export Water Log`. CONFIRMED.

### 1.15 Exercise / energy expenditure — CONFIRMED
- `Add Exercise`, `+ Custom Exercise`, `Add Custom Exercise`, `ActivityBrowserScreen`,
  route `/exerciseAddEdit`. `Calories (Burned From Exercise)`, `Energy Burned`.
- **Expenditure model:** `Basal Metabolic Rate (BMR)`, `Energy Expenditure`, `Activity Level`,
  `Baseline Activity Level`, `Customized Expenditure`, `Add Expenditure Above Baseline to Energy Target`.
  Adaptive: burned-above-baseline rolls into the day's energy target. CONFIRMED.
- Steps + active energy synced from wearables (`totalSteps`, `ACTIVE_ENERGY_BURNED`). CONFIRMED.

### 1.16 Notes — CONFIRMED (limited)
- `Add Note`; **photos attached to notes are GOLD** (`Adding photos to notes is only available to Gold subscribers.`). CONFIRMED a note feature exists; granular scope (per-day vs per-entry) is OBFUSCATED-UNKNOWN.

### 1.17 Food groups / categories — CONFIRMED (browse), partial detail
- `Browse Categories`, `Food Group`, food-group notifications (`Could not reschedule food group notification`).
  These are **food-database browse categories**, CONFIRMED. (Note: "diary groups" = meals; "food groups" = categories — distinct.)

### 1.18 Dashboard — CONFIRMED
- A configurable **Dashboard** of cards (`DashboardScreen`, `DashboardSettings`, `DashboardConfig`):
  Consumed, Remaining, Energy chart, Weight, Weight-change chart, Fasting, Cycle-tracking,
  **Streaks** (`DashboardStreaksCard`, `Show Streak`), Gold/Pro banners. CONFIRMED.

### 1.19 Streaks / gamification — CONFIRMED (and GATED-OUT for VOLYUME)
- `CurrentDiaryStreak`, `Longest Streak`, `Reset Streak`, `Congrats! You beat your past streak.`,
  `Start logging to begin your streak!`, share-streak copy. CONFIRMED. **VOLYUME deliberately
  rejects this — see §3/§5.**

### 1.20 Cronometer Pro (professional/dietitian) — CONFIRMED
- Separate Pro tier for practitioners managing clients: `Cronometer Pro`, route `/pro/clients`,
  `Add Client`, `Add Client Group`, `Once they accept the invite you will then have access to their Cronometer profile.` CONFIRMED.

### 1.21 Integrations / sync — CONFIRMED
- Apple Health, Health Connect, Samsung Health, Google Fit; KetoMojo, Keto-Mojo glucose/ketone
  device import; Home-screen widgets (consumed / remaining / fasting, small/medium/large);
  WearOS + Apple Watch. CONFIRMED.

### Not found / cannot confirm (honest gaps)
- **Glycemic Index / Glycemic Load:** NO matching string found in this corpus. Likely
  **not a tracked field** in the mobile app (may be web-only or simply absent).
  OBFUSCATED-UNKNOWN — do not assert.
- **Supplements as a distinct entity:** no clear `Supplement` UI string; they appear to be
  ordinary custom foods. OBFUSCATED-UNKNOWN.
- Full named set of the 8 Nutrition Scores: only ~4 component labels resolved; rest OBFUSCATED.

---

## 2. VOLYUME equivalent (actual source)

| Cronometer feature | VOLYUME status | Evidence (file) |
|---|---|---|
| Diary w/ meal sections | HAS — 6 slots (Breakfast/Lunch/Dinner/Pre/Post/Snacks) + dynamic "Add meal" | `src/screens/DiaryScreen.js`, `src/lib/food/mealSlots.js` |
| Copy previous day / yesterday | HAS | `DiaryScreen.js` (copy-day picker), `src/lib/food/diaryDates.js` |
| Bulk multi-select (delete/move/copy/save-as-meal) | HAS | `DiaryScreen.js`, `src/lib/food/bulkEntryOps.js` |
| Repeat items (recurring auto-log) | LACKS | — |
| Diary-group reminders / timestamps | PARTIAL (meal-slot recents; no per-entry timestamps) | `src/lib/food/slotRecents.js` |
| Food search across DBs | HAS — waterfall local→Open Food Facts→USDA | `FoodSearchScreen.js`, `src/lib/food/waterfall.js`, `sources/usda.js`, `sources/liveOff.js` |
| Recents/Favourites/Frequents/Suggested/Custom tabs | HAS (5 tabs) | `FoodSearchScreen.js`, `src/lib/food/searchTabs.js`, `frequents.js` |
| Custom foods (manual + label) | HAS | `AddCustomFoodScreen.js` |
| Recipes (ingredients, servings, per-serving macros) | HAS | `RecipeBuilderScreen.js`, `MyRecipesScreen.js`, `src/lib/food/recipeLogging` |
| Recipe importer (from URL) | LACKS | — |
| Meals (saved bundles) | HAS | `MyMealsScreen.js`, `src/lib/food/savedMeals` |
| Share foods/recipes with friends | LACKS (offline-first / no social) | — |
| Barcode scan | HAS (EAN/UPC/Code-128) | `ScanBarcodeScreen.js` |
| Label OCR | HAS (2-step front + panel) | `ScanLabelScreen.js`, `src/lib/food/ocr.js`, `ocrParser.js` |
| Photo / AI meal logging | LACKS (deterministic-only; no AI by SACRED rule) | — |
| Macros (P/C/F) + kcal | HAS, full targets + adherence | `nutritionEngine.js`, `FoodInsightsScreen.js` |
| Fibre | HAS (logged, target = NHS 30g, in CSV) | `src/lib/food/macros.js`, `FoodInsightsScreen.js`, `csvExport.js` |
| Sodium / sugar | SCHEMA ONLY (stored, not surfaced) | `src/lib/food/db.js` |
| Full micronutrient panel (vitamins/minerals/amino/lipid) | LACKS — **GATED item 16** | `nutritionEngine.js` (macros only) |
| Suggested/calculated targets | HAS — 6 phases, 3 protein approaches, FFM floor | `NutritionTargetsScreen.js`, `nutritionEngine.js` |
| Macro scheduler (per-weekday) | PARTIAL (carb cycling / refeed exist, not weekday template scheduler) | `nutritionEngine.js`, meal-plan prefs |
| Keto calculator / GKI | LACKS (out of scope) | — |
| Water tracking | HAS (+/−250ml, 3 L target, progress bar) | `DiaryScreen.js`, `src/lib/food/db.js` |
| Biometrics: weight | HAS — EWMA trend, phase, adaptive TDEE | `BodyMetricsScreen.js`, `nutritionEngine.js` |
| Biometrics: body-fat % (source-aware) | HAS | `BodyMetricsScreen.js` |
| Biometrics: 9 circumferences | HAS | `BodyMetricsScreen.js` (`FIELD_MAP`) |
| Biometrics: glucose/ketone/BP/HR/HRV/sleep/lipid/cycle | LACKS — **GATED (custom medical biometrics)** | — |
| Custom user-defined biometrics | LACKS — **GATED** | — |
| Charts / trends | HAS (weight, body-fat, kcal, protein; 7/14/30/90 windows, per-chart persistence) | `BodyMetricsScreen.js`, `FoodInsightsScreen.js`, `src/lib/chartWindows.js` |
| Reports / PDF for professionals | LACKS (CSV only) | `csvExport.js` |
| CSV export | HAS (date/meal/food/brand/qty/kcal/P/C/F/fibre) | `src/lib/food/csvExport.js` |
| Fasting timer | LACKS — **GATED (ED conflict)** | — |
| Nutrition Scores (8) | LACKS — depends on micronutrients (GATED 16) | — |
| The Oracle (nutrient→food sources) | LACKS — depends on micronutrients (GATED 16) | — |
| Exercise / expenditure | HAS (training app side; cardio + adaptive TDEE) | `LogCardioScreen.js`, `nutritionEngine.js` |
| Notes (per food entry / day) | LACKS for diary; body-metric notes HAS | `BodyMetricsScreen.js` |
| Food groups (browse categories) | PARTIAL — macro **roles** for meal-planning, not a browse taxonomy | `src/lib/food/foodRoles.js` |
| Dashboard of cards | PARTIAL (HomeScreen) | `src/screens/HomeScreen.js` |
| Streaks / gamification | INTENTIONALLY ABSENT (ED-safety) | CLAUDE.md (no streaks) |
| Meal plans + grocery list | **HAS — VOLYUME EXCLUSIVE** (Cronometer has no meal-plan generator) | `mealPlanService.js`, `mealPlanAssembler.js`, `groceryList.js` |
| Calorie banking | **HAS — VOLYUME EXCLUSIVE** | `src/lib/food/calorieBank.js` |
| Health-platform sync | PARTIAL (cardio ext-id; not full Health Connect biometric sync) | `supabase/migrate_087_cardio_log_ext_id.sql` |

---

## 3. Gaps where Cronometer beats VOLYUME — ranked, tagged

Each tagged **[SAFE-TO-BUILD]** (compatible with VOLYUME's constraints: ED-safety,
adherence-neutral, no streaks/gamification, offline-first, EU/no-PII, Free-vs-Pro,
deterministic) or **[GATED]** (conflicts with a constraint / is a founder-gated item).

1. **Recipe importer from a URL** — [SAFE-TO-BUILD]. Parse a recipe webpage into ingredients.
   Deterministic parse, no AI required (schema.org/Recipe JSON-LD is structured). Offline
   caveat: needs network for the fetch, degrade gracefully. Big logging-speed win.
2. **Repeat / scheduled items** (auto-appear daily staples) — [SAFE-TO-BUILD] *with care*:
   must be adherence-neutral and never a streak. Pure scheduling of a template; deterministic.
3. **Per-weekday macro-target scheduler** — [SAFE-TO-BUILD]. VOLYUME already has carb-cycling
   and refeeds; a user-facing per-weekday template surface is a natural, deterministic extension.
   Must respect all existing floors/gates.
4. **Diary entry timestamps + sort-by-time** — [SAFE-TO-BUILD]. Useful for meal-timing context;
   neutral. (Cronometer gates this behind Gold — VOLYUME could ship it cleanly.)
5. **Configurable home dashboard cards** — [SAFE-TO-BUILD] (excluding any streak card).
6. **PDF report for a coach/clinician** — [SAFE-TO-BUILD]. VOLYUME has CSV; a clean PDF of
   intake + trends is high-value and constraint-safe (export only, no PII to third parties).
7. **Progress photos (snapshots)** — [SAFE-TO-BUILD] *only if* stored locally/EU, no third-party
   vision, and never gamified. Mild ED-sensitivity around body image — needs the same calm-mode
   guard pattern as BodyMetrics; flag for founder.
8. **Full micronutrient panel + DRI/NRV comparison** — **[GATED]** (Ultimate-Audit item 16).
   This is Cronometer's single biggest moat (curated DB + ~84 nutrients + bar charts by class).
9. **Nutrition Scores (8) + Nutrient Balance** — **[GATED]** (depends on micronutrients/item 16).
10. **The Oracle (best food sources per nutrient)** — **[GATED]** (depends on micronutrients/item 16).
11. **Fasting timer / time-restricted-eating** — **[GATED]** (explicit ED conflict).
12. **Custom + medical biometrics** (glucose, ketones, BP, HRV, sleep, lipid panel, cycle) —
    **[GATED]** (custom medical biometrics gated; PII/medical-data sensitivity).
13. **Keto calculator / Glucose-Ketone Index** — **[GATED]** (ketogenic-target framing + medical
    biometrics; out of VOLYUME's training scope).
14. **Sharing foods/recipes with friends** — **[GATED]** (offline-first + no-social-graph; PII).
15. **Verified curated food database (NCCDB/FDC)** — [SAFE-TO-BUILD in principle but heavy];
    data-licensing + sourcing decision, not a code task. Note as strategic, not a build item.

## 4. Where VOLYUME beats Cronometer

- **Deterministic Precision Coaching** — adaptive TDEE from EWMA weight trend, phase logic,
  diet-break (MATADOR) and RED-S/FFM energy-floor safety gates. Cronometer has expenditure
  math but **no coaching engine**. (`nutritionEngine.js`)
- **Meal-plan generator + automatic grocery list** — Cronometer has recipes/meals but **no
  plan-a-week assembler** and no grocery list. VOLYUME exclusive. (`mealPlanAssembler.js`, `groceryList.js`)
- **Calorie banking** ("plan a bigger day", weekly-total-preserving, floor-safe) — no Cronometer
  equivalent. (`calorieBank.js`)
- **ED-safety system** — sex calorie floors (1500/1200), FFM floor, rapid-loss gate (1.5%/wk),
  ED-pattern detector, Beat UK signposting, calm mode. Cronometer has none of this; it even
  warns of "extreme weight loss plans" but has **no enforced floors**.
- **No streaks / no gamification by design** — Cronometer leans hard on streaks
  (`Reset Streak`, `beat your past streak`), which is an ED-risk pattern VOLYUME deliberately omits.
- **Integrated training side** — mesocycles, workout logging, lift progress, volume heatmaps.
  Cronometer is nutrition-only.
- **Protein-quality-aware meal planning** (anchor protein + quality tiers) — finer than
  Cronometer's macro-only view for athletes. (`foodRoles.js`, `proteinQuality.js`)

## 5. The single highest-leverage SAFE feature gap

**Recipe importer from a URL** (item 1, [SAFE-TO-BUILD]).

Rationale: the founder uses Cronometer daily and rates it "very easy" — that ease is mostly
**logging speed**. VOLYUME already matches Cronometer on custom foods, barcode, OCR, recipes
and meals, but **manual recipe entry is the slowest remaining path** and the importer is exactly
what removes it. It is fully compatible with every VOLYUME constraint: structured-data parsing
(schema.org/Recipe JSON-LD) is **deterministic, needs no AI/LLM**, sends no PII, slots straight
into the existing `RecipeBuilderScreen` → ingredient-resolution → waterfall pipeline, and is
adherence-neutral with no streak/gamification surface. It is the biggest "match-and-beat
Cronometer on ease" win available without touching any gated area (micronutrients, fasting,
medical biometrics, social).

*Note (founder rule): items 8–14 are GATED — do not start without the structured founder
decision; item 16 (micronutrients/NRV) governs the entire Scores/Oracle/curated-DB cluster.*
