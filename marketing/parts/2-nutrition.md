# VOLYUME Marketing Fact-Base — Part 2: Nutrition & Food

Read-only extraction. Every line below is TRUE-AS-SHIPPED and traced to code.
Roadmap / partial / unverified items are quarantined in their own sections at
the foot of the document. British English. No em dash.

**Tier rule (verified).** `src/lib/proGate.js` gates the app all-or-nothing:
`tier === 'pro'` unlocks everything, otherwise Free. CLAUDE.md states the whole
nutrition/food domain is Pro and Free is training-only. Confirmed in
`src/navigation/RootNavigator.js`: the Diary tab root and every food sub-screen
are wrapped in `withProGuard` / `withReadOnlyProGuard`. So unless stated
otherwise, **every feature in this document is Pro**. There is no free food or
nutrition feature. (Nuance: a *lapsed* Pro user who already has food entries
keeps **read-only** access to their existing diary via `withReadOnlyProGuard` on
`DiaryScreen` — they can view, not add.)

---

## 1. NUTRITION FEATURES (all Pro)

### Food diary & logging

- **Food diary** — a per-day log split into meal slots, with a live macro
  rollup against the day's target. Pro. (`DiaryScreen`, `food/db.js`
  `logFoodEntry`, `getWater`/rollup helpers.)
- **Calorie & macro targets from the deterministic engine** — kcal, protein,
  carbs and fat targets are computed by the coaching engine
  (`nutritionEngine.js`: Mifflin-St Jeor and Katch-McArdle BMR, activity-tuned
  TDEE, adaptive TDEE from real weight trend), never guessed and never from an
  LLM. Pro. (`NutritionTargetsScreen`, `nutritionEngine.js`.)
- **Per-day-of-week targets** — a user who eats more at weekends (or trims
  midweek) can set a kcal offset per weekday; the diary shows that day's target
  shifted by the offset. Display-only and additive: the engine's stored target
  is never changed, and every offset is hard-clamped so a day can never display
  below the safe calorie floor. Pro. (`food/perDayTargets.js`,
  `food/effectiveTargets.js`.)
- **Day-type targets** — the diary target also shifts for refeed days, carb
  cycling (training-day / rest-day split) and calorie banking, in a fixed
  precedence, all display-only over the stored target. Pro.
  (`food/effectiveTargets.js`.)
- **One-tap re-log ("Add again")** — the first search tab is a slot-aware
  recents list; on it a single row tap re-logs the food at the remembered last
  portion, no sheet, no keystrokes. Long-press opens the portion sheet at the
  same portion so tap and long-press agree. Saved meals and recipes join this
  same ranked pool. Pro. (`FoodSearchScreen.quickLogRelog`, `food/searchTabs.js`,
  `food/servingEntry.js`, `food/db.js` `upsertSlotRecent`/`resolveSlotRecentRef`.)
- **Serving entry** — log by a food's household serving ("1 slice", "1 square")
  or by raw grams; grams are always the stored truth so the safety floors can
  never be bypassed by the unit choice. Pro. (`food/servingEntry.js`.)

### Search & data

- **Offline local food search** — a full-text (SQLite FTS5) search over the
  on-device food cache: word-prefix matching plus porter stemming and bm25
  relevance, with the user's own custom foods ranked first. Works with NO
  network. A LIKE fallback answers identically if FTS is not compiled in. Pro.
  (`food/sources/localCache.js` `searchLocalByName`/`toFtsMatch`.)
- **Lookup waterfall** — search resolves in order: local SQLite cache, then the
  bundled OpenFoodFacts UK snapshot, then bundled CoFID, then (online only) the
  live OpenFoodFacts API, then USDA FoodData Central. First strong local hit
  wins; live hits are cached back so the next lookup is instant. Pro.
  (`food/waterfall.js`.)
- **Personal-history ranking** — foods the user has favourited, logged recently
  in this slot, or logged often are lifted above generic database matches for
  the same query. Pro. (`food/searchTabs.js` `rankByPersonalHistory`.)
- **Recents / Favourites / Frequents / Custom browse tabs** — Frequents is the
  user's top foods over 30 days, recomputed nightly on the server and pulled
  into a local cache. Pro. (`food/searchTabs.js`, `food/frequents.js`.)

### Capture

- **Barcode scanning** — live camera barcode scan (EAN-13/8, UPC-A/E, Code-128)
  runs the product through the lookup waterfall and drops you on the food detail
  sheet on a hit, or a prefilled label-scan on a miss. **Pro** (verified: route
  `GatedScanBarcode = withProGuard(..., 'Barcode scanning')`). (`ScanBarcodeScreen`.)
- **OCR nutrition-label scan** — a two-step camera capture (front of pack for
  the name, then the nutrition panel for the macros) using on-device MLKit text
  recognition, then hands the parsed name and macros to the add-food screen
  prefilled. Fully on-device; degrades to manual type-in when the OCR native
  module is not in the running binary. Pro. (`ScanLabelScreen`,
  `food/ocr.js`, `food/ocrParser.js`, `food/labelName.js`.)
- **Custom foods** — key in your own food (name, brand, macros, optional
  barcode); a scanned barcode that missed is saved with it so it scans straight
  away next time. Pro. (`AddCustomFoodScreen`.)

### Meals & recipes

- **Meal builder / saved meals** — build a meal once from several foods, save
  it, and re-log the whole thing in one tap from the "Add again" pool. Pro.
  (`MyMealsScreen`, `food/db.js` saved-meal fan-out.)
- **Curated meal library + free additions** — a UK-bodybuilder meal library
  (foods + grams, macros computed from a staple-food table, never hand-typed);
  each meal carries a few suggested near-zero-calorie flavour additions (herbs,
  spices, citrus, hot sauce) shown as education, not logged, so the diary stays
  honest. Pro. (`food/curatedMeals.js`, `food/curatedFoods.js`,
  `food/mealAdditions.js`.)
- **Rule-based meal suggestions** — given the macros left for the day, ranks the
  user's foods and saved meals by how well they fill the gap, protein-first
  without blowing the calorie budget, sized to one meal's share of what's left.
  Pure and deterministic, NO LLM. Pro. (`food/mealSuggest.js`.)
- **Generated meal plan** — one active assembled day/week plan per user, stored
  and synced, re-solvable on swaps. Pro. (`MealPlanScreen`,
  `food/mealPlanAssembler.js`, `food/mealPlanService.js`.)
- **Recipes** — build a recipe from ingredients; log it as one scaled line that
  rescales on edit. Pro. (`RecipeBuilderScreen`, `MyRecipesScreen`,
  `food/db.js` `applyRecipeToDiary`.)
- **Recipe import from a web URL** — pulls a schema.org/Recipe object from a
  page's JSON-LD (name, ingredients, servings) for the user to review. No AI,
  https only, network required. Pro. (`food/recipeImport.js`.)

### Surfacing & display

- **Sodium & sugar surfacing** — a food's per-100g sodium (shown in mg) and
  sugar (in g) scale to the eaten amount on the food-detail view. "No datum
  stays null", so a food without a value reads as "no data", never a fake 0.
  DISPLAY-ONLY: sodium and sugar are NOT tracked in `food_entries`, the daily
  rollup, or any target. Pro. (`food/macros.js` `scaleSodiumMg`/`scaleSugarG`.)
- **kcal <-> kJ toggle** — a display-only preference (`accessibility.energyUnit`,
  default kcal) that shows food energy in kilojoules for a UK/EU audience (EU
  labelling law gives kJ first). 1 kcal = 4.184 kJ. Every stored value stays in
  kcal. Pro. (`lib/format.js` `formatEnergy`/`energyUnitLabel`.)
- **Water tracking** — log a day's water intake; stored per day and synced
  cross-device with soft-delete tombstones. Pro. (`food/db.js`
  `setWater`/`getWater`/`deleteWater`.)

---

## 2. PROOF POINTS (verified against the shipped assets)

**Bundled offline food database — exact row counts** (read from each `.dat`
file's own `_meta` header, not estimated):

| Snapshot | Rows | Source | Licence |
|---|---|---|---|
| OpenFoodFacts UK (`off_uk_snapshot.dat`) | **25,965** | "openfoodfacts.org search API, country=united-kingdom" | Open Database License (ODbL) 1.0 |
| CoFID UK (`cofid_uk.dat`) | **2,852** | "McCance and Widdowson's Composition of Foods Integrated Dataset (CoFID), 7th edition, 2021" | Open Government Licence v3.0 |
| **Total bundled** | **28,817** | | |

- Exact attribution string shipped for CoFID (`_meta.attribution`): "Contains
  public sector information licensed under the Open Government Licence v3.0."
- OFF snapshot generated 2026-05-25 (`_meta.generatedAt` 2026-05-25T07:06:03Z);
  CoFID generated 2026-05-25T06:02:02Z. OFF is refreshed weekly by a GitHub
  Actions workflow (`scripts/seed/buildOffSnapshot.js`); CoFID is a static
  dataset. (`food/seed.js` header + constants.)
- Note: `food/seed.js` code comments describe the snapshots as "~100k+" (OFF)
  and "~3k" (CoFID). The authoritative shipped numbers are the `_meta.rowCount`
  values above (25,965 and 2,852) — use those, not the comment estimates.

**Search works fully offline.** The first three waterfall steps (local cache,
bundled OFF, bundled CoFID) all read the on-device SQLite `foods` table; the
FTS5 index and its LIKE fallback need no network. Live OFF/USDA are steps 4-5
only and time out internally, leaving local rows standing when offline.
(`food/waterfall.js`, `food/sources/localCache.js`.)

**Data sources & licences (verified strings):** OpenFoodFacts UK under the Open
Database License (ODbL) 1.0; McCance & Widdowson's CoFID (7th edition, 2021)
under the Open Government Licence v3.0. Live fallbacks: OpenFoodFacts live API
and USDA FoodData Central. (`food/seed.js`, `food/waterfall.js`,
`food/sources/liveOff.js`, `food/sources/usda.js`.)

**Tap-count to log a repeat food or meal:** ONE tap. On the "Add again" tab a
single row tap re-logs the food (or the whole saved meal / recipe) at the
remembered last portion, with a double-tap guard. (`FoodSearchScreen`
`quickLogRelog`/`quickLogRelogMeal`.)

**No AI in the food domain (verified):** meal suggestions
(`food/mealSuggest.js`) and recipe import (`food/recipeImport.js`) both state
and implement "no LLM / no AI" — rule-based scoring and JSON-LD parsing only,
consistent with the CLAUDE.md deterministic-engine mandate.

---

## 3. DIFFERENTIATORS (grounded in this domain)

- **UK-first food data.** The bundled database is built from UK-specific sources:
  OpenFoodFacts filtered to `country=united-kingdom` and the UK government's
  CoFID (McCance & Widdowson). UK naming and UK supermarket staples run through
  the curated meal/food library too. (`food/seed.js`, `food/curatedMeals.js`.)
- **Offline-first search.** ~28.8k UK foods plus the user's own foods are
  searchable with zero network, via an on-device FTS5 index. Most competitors
  lean on a live API. (`food/waterfall.js`, `food/sources/localCache.js`.)
- **No ads.** Nothing in the food domain (or the codebase) serves ads; the app
  is subscription-funded. (No ad SDK present.)
- **Deterministic, transparent targets.** Calorie and macro targets come from a
  published-formula engine (Mifflin-St Jeor / Katch-McArdle, adaptive TDEE), not
  a black box. (`nutritionEngine.js`.)

**POSITIONING NOTE — do NOT claim "free barcode scanning".** The task brief
assumed barcode scanning is Free in VOLYUME. It is NOT: the route is Pro-gated
(`withProGuard(..., 'Barcode scanning')`). The whole food domain is Pro. The
factual competitor line still stands for context — some large trackers place
barcode scanning behind a subscription — but VOLYUME cannot be positioned as
"free barcode scanning" because it does not offer one. Any barcode differentiator
must be framed on quality/UK-data/offline grounds within the Pro tier, not price.

---

## 4. HONEST LIMITS in this domain (verified by absence in code)

- **No restaurant / menu database.** Food data is packaged-product (OFF) and
  generic-food (CoFID) only. No restaurant, chain-menu or takeaway dataset
  exists anywhere in `src/lib/food/**` or the bundled assets.
- **No photo-portion / meal-photo AI.** The only camera features are barcode
  scanning and OCR of a printed nutrition label. There is no "photograph your
  plate and estimate portions" capability, and by mandate there never will be
  (deterministic engine, no AI). (`ScanBarcodeScreen`, `ScanLabelScreen`.)
- **Sodium & sugar are view-only, not tracked.** They scale on the food-detail
  view but are never written to `food_entries`, never rolled up, and have no
  target or trend. (`food/macros.js` explicit comments.) So no daily sodium or
  sugar totals, and no micronutrient tracking at all in the shipped build.
- **Recipe URL import needs network and a well-formed page.** It only works on
  https pages that publish schema.org JSON-LD; it is best-effort and returns
  nothing on a malformed or non-conforming page. (`food/recipeImport.js`.)
- **OCR label scan needs a native build.** It requires the MLKit module in the
  running binary (an EAS build, not plain Expo Go); without it the screen
  degrades to manual type-in. (`ScanLabelScreen`.)

---

## QUARANTINE — not verified / not a shipped selling point

- `food/seed.js` code comments say OFF is "~100k+" and CoFID "~3k". These are
  stale estimate comments; the shipped `_meta.rowCount` figures (25,965 and
  2,852) are authoritative. Do not market the comment numbers.
- Kilojoule copy example "7,029 kJ" appears in code comments; the toggle itself
  is verified but that specific figure is illustrative only.
- Micronutrients / NRV: CLAUDE.md lists this as a decision-gated, NOT-built item
  (MN-1). Confirmed absent from the food domain. Do not market micronutrient
  tracking.

---

### 6-line summary

1. Biggest true food selling points: ~28.8k UK-first foods searchable fully
   OFFLINE (OpenFoodFacts UK + government CoFID) via on-device full-text search;
   deterministic, transparent calorie/macro targets; one-tap re-log of any
   food, saved meal or recipe; barcode + on-device label OCR capture; curated
   UK meal library with free flavour additions; no ads, no AI.
2. Exact bundled database numbers: OFF UK = 25,965 rows (ODbL 1.0); CoFID UK =
   2,852 rows (OGL v3.0); TOTAL = 28,817. Live OFF + USDA extend it online.
3. Every food/nutrition feature is Pro; Free is training-only (verified against
   proGate.js and RootNavigator's withProGuard wrappers).
4. CORRECTION: barcode scanning is Pro-gated, NOT free — do not run the "free
   barcode scanning" line; position on UK-data/offline/quality instead.
5. Top 3 honest limits: no restaurant/menu database; no photo-portion AI; sodium
   and sugar are view-only (not tracked/rolled-up) and there is no micronutrient
   tracking.
6. All food capabilities are deterministic and offline-capable where it counts;
   the only network-dependent pieces are the live OFF/USDA fallback and web
   recipe-URL import.
