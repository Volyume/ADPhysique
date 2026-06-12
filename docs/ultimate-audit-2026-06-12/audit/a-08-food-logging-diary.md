# A-08 — Food logging & diary (Pro): internal code-verified audit

Area 08 of the ultimate-app mandate. Phase 1 (internal, code-verified).
Branch `claude/admiring-bohr-2kb7pd`. Every claim carries file:line evidence.
No code modified. British English.

Scope covered hands-on and in depth: DiaryScreen end-to-end, the search
pipeline (waterfall + sources + ranking), the full barcode/COMP-022 miss
chain, every logging path with tap counts, totals presentation, the free
user's "Today's plate" teaser, meal-slot memory, Suggested tab, custom foods,
diary↔meal-plan linkage. Kept brief where budget required: recipes, water,
CSV/insights export (flagged honestly in §6).

---

## 1. WHAT — every surface, sheet, and pipeline step

### 1.1 Diary surfaces (the host screen)
`src/screens/DiaryScreen.js`. Pro-gated at the navigator
(`RootNavigator.js:160` `withProGuard(DiaryScreen, 'Food diary')`).

Render order down the scroll (`DiaryScreen.js:498-617`):
1. `ScreenHeader title="Diary"` (505).
2. Day pager row (511-538): Today pill (shown only off-today, 513-517),
   chevron back / friendly date / chevron forward (519-527), and an
   insights/export icon routing to `FoodInsights` (529-536).
3. `MacroRings` summary card (540-547) — kcal ring + three macro bars,
   tappable into the per-meal breakdown only when entries exist (545).
4. `WeightTrendCard` (COMP-004) — today only, self-hides until data
   (551-555).
5. COMP-022 one-time OFF-consent card — today only, after a heal chain
   (557-576).
6. Body: either `EmptyDiary` (578-583) or the meal-section ladder
   (586-612) + an "Add meal" row (602-611).
7. `WaterRow` (616, defined 752-778).

Overlays / sheets hosted by the screen:
- `FoodDetailSheet` in edit mode (619-629).
- `QuickAddSheet` (631-636).
- `MacroBreakdownSheet` (638-643).
- Scan FAB → `ScanBarcode` (647-657).
- Selection toolbar (multi-select) (659-684) with Move / To today / Save
  meal / Delete.
- Move-picker modal (686-708).
- Save-as-meal name modal (710-743).

The effective macro target folds in carb-cycle (training/rest) and refeed
day overrides (`DiaryScreen.js:143-164`), so the rings can show a different
target than the flat stored one. Day-type chip surfaces "Training day" /
"Rest day" / "Refeed day".

### 1.2 The meal-slot model
`src/lib/food/mealSlots.js`. Flexible **numbered** meals (`meal_1..N`) plus
named `preworkout` / `postworkout`, defaulting to `DEFAULT_MEALS_PER_DAY = 4`
(mealSlots.js:21). Honours `@volyume_meals_per_day` AsyncStorage pref
(DiaryScreen.js:211-218). `buildMealSlots` unions the numbered ladder with
any legacy slot (`breakfast/lunch/dinner/snack`) that has entries so old
diaries never lose food (mealSlots.js:59-68); the ladder never shrinks below
`highestLoggedMeal` (DiaryScreen.js:219). "Add meal" extends it for the
session (602-611, resets per day at 196).

Note the **model split**: the diary uses numbered slots, but several picker
defaults and labels still fall back to legacy `'snack'`
(FoodSearchScreen.js:64, QuickAddSheet default, AddCustomFood
`MEAL_LABELS` only maps breakfast/lunch/dinner/snack, AddCustomFood.js:28-33).

### 1.3 The search pipeline, step by step
Entry: `FoodSearchScreen.js`. Top bar: close / "Add to {slot}" title /
flash quick-add icon / barcode icon (575-603). Browse subnav tabs
(`searchTabs.js:13-19`): **Add again / Suggested / Favourites / Frequents /
Custom**. Persistent search box under the tabs (except Suggested, which has
none).

Debounced waterfall (`FoodSearchScreen.js:206-226`): 250 ms debounce, fires
only at ≥2 chars and not on Suggested. Calls `searchFoods` (waterfall.js:98).

`searchFoods` waterfall (`waterfall.js:98-134`), first non-empty wins:
1. `searchLocalByName` — SQLite `foods` + `custom_foods`
   (localCache.js:18-54). Customs ranked first, then globals; prefix match
   before substring; `verified DESC` tiebreak on globals.
2. If local empty → live OFF free-text (`liveOff.js:90`,
   `NETWORK_SEARCH_FANOUT_LIMIT = 10`), 1200 ms timeout, rows lacking core
   macros filtered out (`_hasMacros`, liveOff.js:58-64, 102).
3. If OFF empty → USDA (`usda.js`, same fan-out).
4. Network hits are **promoted** into local `foods` (cache promotion,
   waterfall.js:40-87) so the next lookup is a step-1 hit; the returned
   `food_ref` is rewritten `global:<uuid>`.

Telemetry `food_search_attempt` fires once per search with
`source_hit ∈ {local, off_live, usda, miss}`, `query_len`, `ms`
(waterfall.js:105-133).

Ranking is **name-relevance only** at the local step (prefix > substring,
customs first); there is **no popularity / frequency / verified-brand
ranking** across the merged result set, and **no merge** of local + network
(it is strictly first-source-wins, so a partial local hit hides better OFF
matches — see §4).

### 1.4 Barcode flow with every branch
`src/screens/ScanBarcodeScreen.js` (vision-camera). Branches:
- Permission `not-determined` → spinner, auto-requests
  (ScanBarcode.js:96-101, 138-146).
- Permission denied/restricted → settings deep-link card (148-176). On
  Android fires `requestCameraPermission` for any non-granted status
  (88-101) because Android 16 reports never-asked as `denied`.
- No back camera device → "No camera available" (178-194).
- First detected code: `scanLock` set, haptic, `resolveBarcode`
  (103-131).
  - **Hit** → `navigation.replace('FoodSearch', { scannedFood })`
    (117-119); FoodSearch auto-opens the detail sheet (FoodSearch.js:327-334).
  - **Miss** → `navigation.replace('ScanLabel', { prefillBarcode })`
    (122-124).
  - **Throw** → log, release lock, resume (126-130).
- Re-arms on focus (68-73); pauses camera while backgrounded/unfocused
  (196).

`resolveBarcode` waterfall (`waterfall.js:141-170`): local-by-barcode
(custom first, then global, localCache.js:59-93) → OFF barcode → USDA
barcode, each promoted; telemetry `food_lookup_barcode` carries source+ms
only — the EAN is deliberately **not** sent (HP-2, waterfall.js:144-148).

### 1.5 COMP-022 miss chain (label scan + heal)
`src/screens/ScanLabelScreen.js`.
- **Arrival choice** (68, 325-341): a barcode miss lands on a one-tap
  decision card ("Scan the label" / "Type it in") over a warm camera.
  Only when OCR is in the binary; copy forks online vs offline via NetInfo
  (70-78) — "Not in the database yet" vs "Couldn't check the full database".
- **Two-step OCR capture** (104-163): front-of-pack → `pickProductName`;
  nutrition panel → `parseNutritionLabel`. Each step degrades gracefully
  (a failed read just advances, never blocks). "Skip name" (305-309) and a
  persistent "Type it in" escape that **keeps the barcode** (311-316).
- **Miss banner** (270-285): "Barcode {ean} not in our database" + guidance,
  forks on `ocrAvailable` and `offline`.
- **No-OCR fallback** (318-320): capture button hides, "Type it in" CTA.
- Hands off to `AddCustomFood` with `prefillBarcode`, `prefillMacros`,
  `prefillConfidence`, `prefillName`, `from: 'scan_chain'` (148-152).

`AddCustomFoodScreen.js`:
- **Duplicate banner** (72-80, 210-221): if `findLocalByBarcode` finds an
  existing **custom** food for this EAN (sync pulled it, or restored), shows
  "You've saved this barcode before as X" + "Log that instead" → replace to
  FoodSearch with the existing food.
- **Amber low-confidence fields** (62-63, 227-240): OCR-unsure values get an
  amber border + "Amber figures aren't certain, check them"; editing clears
  the flag (`fieldNeedsCheck`).
- **Sanity check** before save (108-122) → "Numbers look off" confirm.
- On save: insert custom food (carrying `barcode_ean`, db.js:232-254) + log
  entry + (if `barcodeEan`) queue OFF contribution gated on consent
  (164-181) + `markScanChainCompleted()` + reward toast "Saved. Next time
  this barcode scans instantly."

**OFF consent / write-back** `src/lib/food/writeback.js`:
- Consent flag `@volyume_off_writeback_consent_v1`, default OFF (38-41, 64).
- Queue in AsyncStorage; flush within 30 s; 3 retries with backoff
  (2/8/30 s) (33-35, 102-183). Permanent failure logs only, never surfaces.
- The contribution moved from ScanLabel capture to AddCustomFood onSave so
  it carries the **confirmed** values (ScanLabel.js:143-147,
  AddCustomFood.js:160-175).
- The one-time Diary consent card is eligible only after a completed chain,
  while consent is still off and not dismissed (55-62); rendered today-only
  (DiaryScreen.js:557-576).

### 1.6 Totals presentation
`src/components/food/MacroRings.js`. Kcal ring (Skia) with a count-up
animation on change, skipped under reduce-motion (104-126). Centre: value /
"of {target}". Right side: remaining **or** "over" (absolute value) when
exceeded (175-184). Three macro **bars** (protein primary/bolded), all the
same adherence-neutral amber fill — `bandColour()` returns `colors.primary`
unconditionally (17-19), an explicit reversal of the old amber/green/amber
banding for the at-risk subgroup. Per-meal subtotal "kcal · g P" on each
`MealSection` header (MealSection.js:23-25). `MacroBreakdownSheet` gives the
by-meal breakdown.

---

## 2. WHERE — every way food gets logged; entry points; dead-ends; links

### 2.1 Logging paths with tap counts
Tap counts assume the food is already known unless stated; sheet defaults to
the food's serving (FoodDetailSheet.js:46-50), so a default-portion log needs
**no quantity typing**.

| # | Path | Taps (best case) | Evidence |
|---|------|------------------|----------|
| 1 | **Add again** (slot recents, prefilled portion) | Diary "Add food" → row → "Add to diary" = **3** | FoodSearch.js:97-114, 336-375; pre-fill via `last_quantity_g` 737 |
| 2 | Search a known food | "Add food" → type ≥2ch → row → "Add to diary" = **3 + typing** | 206-226, 478, 733-742 |
| 3 | **Multi-add plate** | "Add food" → tap `+` per food (1 ea) → "Log N" = **2 + N** for N foods | `addToPlate` 234-248, `logPlate` 257-306; plate bar 667-687 |
| 4 | **Quick add** (COMP-003) from meal card | meal "Quick add" → enter kcal → "Add to diary" = **3** | MealSection.js:50-59; DiaryScreen.js:237-256 |
| 4b | Quick add from search header (flash) | flash → kcal → save = **3** + auto-goBack | FoodSearch.js:586-593, 744-752 |
| 5 | **Barcode** hit | FAB → scan → sheet → "Add to diary" = **3** (1 is the scan) | DiaryScreen.js:647-657; ScanBarcode 103-119 |
| 6 | Barcode miss → custom | scan → arrival choice → capture ×2 → save = **~5** | ScanLabel/AddCustomFood chain |
| 7 | **Custom food** (manual) | Custom tab → "New custom food" → fill → "Save and add" = **3 + typing** | FoodSearch.js:440-449, 457; AddCustomFood |
| 8 | **Suggested** curated meal | Suggested tab → meal card = **2** (whole meal, fixed portions) | FoodSearch.js:551-567; `applyCuratedMealToDiary` |
| 9 | **Copy yesterday** | EmptyDiary "Copy yesterday" → confirm = **2** (whole day) | DiaryScreen.js:459-496, 578-583 |
| 10 | **Copy selected to today** | long-press → (select) → "To today" = **3** | 322-334, 670-673 |
| 11 | **Save as meal** then reuse | select → "Save meal" → name → save; later My meals | 348-379; MyMealsScreen |
| 12 | **Plan day → diary** (from meal plan) | MealPlan "Log day" → confirm via toast = **1** | MealPlanScreen.js:156-167 |
| 13 | Water | `+`/`−` 250 ml = **1 per increment** | DiaryScreen.js:423-428, 616 |

Fastest realistic repeat-log of a habitual food is **3 taps** (Add again
with prefilled portion), and a whole day can be replayed in **2** (Copy
yesterday) or **1** (Plan day → diary). This is competitive with
MacroFactor's multi-add plate, which is mirrored deliberately
(FoodSearch.js:72-74).

### 2.2 Entry points into the food domain
- Diary tab (`DiaryTab`, RootNavigator.js:447) — primary.
- Diary "Add food" per meal → `FoodSearch` (DiaryScreen.js:226-230).
- Scan FAB → `ScanBarcode` (650).
- Insights icon → `FoodInsights` (530).
- EmptyDiary "Plan my day" → `MealPlan` (582).
- FoodSearch header → `ScanBarcode`; Custom tab CTAs → `AddCustomFood`,
  `MyRecipes`, `MyMeals` (FoodSearch.js:441-444, 457-460).
- MealPlan "Log day" → writes straight to today's diary
  (MealPlanScreen.js:160).

### 2.3 Diary ↔ meal-plan linkage (from the diary side)
- **Plan → diary**: `applyPlanDayToDiary` (MealPlanScreen.js:35, 160) logs a
  whole plan day to today; `applyCuratedMealToDiary` (db.js:939) logs a
  single curated meal from the Suggested tab.
- **Diary → plan**: EmptyDiary "Plan my day" deep-links to `MealPlan`
  (DiaryScreen.js:582; both screens live in the same gated Diary stack,
  RootNavigator.js:217-273).
- **Gap**: there is **no "log THIS diary day from the plan for an arbitrary
  date"** — `applyPlanDayToDiary` is hardcoded to `todayLocalKey()`
  (MealPlanScreen.js:160), so a user viewing a past/future diary day cannot
  pull the plan into the day they are looking at.

### 2.4 Dead-ends / friction edges (per code)
- Live-search no-match replaces the screen so Back lands on Diary, not an
  empty search (`gotoCustomReplace` uses `navigation.replace`,
  FoodSearch.js:424-426, 492). Good.
- Suggested tab with no targets → "Set your daily targets to get meal ideas"
  but offers **no inline link** to NutritionTargets (FoodSearch.js:523-528).
- Quick-add entries (`quick:adhoc`) show as "Quick add" with no gram weight
  and earn **no** slot-recent memory (db.js:204), so a frequent estimate
  can't become an Add-again row.

---

## 3. FEEL — speed, tone, newbie vs competitor

### 3.1 Common-case speed
Local cache hit target <50 ms; cold network <1500 ms with 1200 ms source
timeouts and 250 ms debounce (waterfall.js:11-16, liveOff.js:20). The kcal
ring count-up animation (500 ms, MacroRings.js:123) makes a log feel "alive".
Add-again with prefilled portion is the fastest path and is the default first
tab — the right default for the daily loop.

### 3.2 Copy tone on overshoot — adherence-neutral?
**Yes, by design and consistently.** The ring is a single amber regardless of
under/over (`bandColour`, MacroRings.js:17-19); over-target shows a factual
"{n} over" with no colour judgement (175-184). No congratulation, no
warning, no streak language on the diary. This is the explicit
adherence-neutral brief for the ED-risk subgroup. Copy throughout is short
and factual ("It comes off this day's totals", FoodDetailSheet.js:86;
"Saved. Next time this barcode scans instantly.", AddCustomFood.js:180). No
AI tells, no encouragement — matches CLAUDE voice rules.

### 3.3 Newbie empty-diary vs prep-competitor
- **Newbie**: `EmptyDiary` is a calm single card — "Nothing logged yet
  today. Add a meal whenever you're ready." with Plan my day / Add food /
  Copy yesterday (EmptyDiary.js:15-58). Welcoming, low-pressure. Good for the
  expanded gym-newbie market.
- **Free user**: never reaches the diary — `ProLocked` renders the read-only
  `TodaysPlateTeaser` (a fixed sample 2200 kcal omnivore day, deterministic
  seed) above the upgrade ask (ProGate.js:91-127; teaser
  TodaysPlateTeaser.js:23-64). Show-then-sell at the value moment; exposes no
  Pro action. Held-seat reassurance for lapsed users (ProGate.js:108-112).
- **Prep competitor**: the numbered-meal ladder (4 default, extendable),
  pre/post-workout slots, protein-primary bars, carb-cycle + refeed
  day-type chips, multi-add plate, and per-meal protein subtotals all serve
  the athlete. The balance the mandate asks for is largely present in code.

---

## 4. GAPS / FRICTION (per code only)

1. **First-source-wins hides better matches.** A weak local prefix hit (e.g.
   one stale custom food named "chicken") short-circuits the waterfall and
   the network is never queried (waterfall.js:103-109). There is no merge or
   "search more online" affordance, so result quality silently caps at
   whatever local holds. (FoodSearch shows a "Create a custom food" footer,
   not "search the web".)

2. **No verified/popularity ranking.** Local ranking is name-relevance +
   `verified DESC` only (localCache.js:31-36); network results arrive in OFF/
   USDA's own order. No frequency, brand-trust, or per-user weighting, so the
   most-logged item isn't floated within a search (only within the separate
   Frequents/Add-again tabs).

3. **Suggested tab cannot recover a missing target.** "Set your daily
   targets…" has no tap-through to NutritionTargets
   (FoodSearch.js:523-528) — a dead end for a new Pro user.

4. **Plan-day logging is today-only.** Viewing a non-today diary day, the
   user cannot pull the meal plan into that day; `applyPlanDayToDiary` is
   pinned to `todayLocalKey()` (MealPlanScreen.js:160). The diary's own
   date pager creates the expectation that it would.

5. **Quick-add has no memory and no name.** `quick:adhoc` entries are
   excluded from slot-recents (db.js:204) and show as "Quick add" with no
   grams — a frequent restaurant estimate can never become a fast re-log.

6. **Water is a flat 3 L target, not per-user.** `WATER_TARGET_ML = 3000`
   hardcoded with a TODO to make it a preference (DiaryScreen.js:748-750).
   No history/insight; resets are a single `−250` tap loop.

7. **Slot-model seams.** Pickers and labels still default to legacy `'snack'`
   (FoodSearch.js:64, QuickAdd default, AddCustomFood `MEAL_LABELS`
   28-33), while the diary speaks numbered meals — a brand-new entry logged
   from a default path can land in `snack` rather than a numbered meal.

8. **OFF write-back has no user-visible status.** Permanent upload failures
   are silent (writeback.js:170-175); a contributor gets no confirmation the
   share landed beyond the optimistic save toast.

---

## 5. Surface inventory

**Screens (8):** DiaryScreen, FoodSearchScreen, ScanBarcodeScreen,
ScanLabelScreen, AddCustomFoodScreen, FoodInsightsScreen, MyMealsScreen,
MyRecipesScreen. (Adjacent in-stack: MealPlanScreen, RecipeBuilderScreen,
NutritionTargetsScreen, NutritionEducationScreen — owned by areas 09/15.)

**Food components (13):** `src/components/food/` — EmptyDiary, EntryRow,
FoodDetailSheet, FoodRow, HeldDecisionCard, MacroBreakdownSheet, MacroRings,
MealSection, QuickAddSheet, ServingPicker, SourceChip, TodaysPlateTeaser,
(+ `__tests__`). Plus shared ProGate (`src/components/ProGate.js`).

**Lib modules — `src/lib/food/` (~27):** db.js, waterfall.js,
mealSlots.js, mealSwap.js, mealSuggest.js, mealPlanAssembler.js,
mealPlanService.js, curatedMeals.js (159 curated meals,
curatedMeals.js:43-…), curatedFoods.js, foodRoles.js, frequents.js,
labelName.js, libraryDelta.js, bulkEntryOps.js, csvExport.js, ocr.js,
ocrParser.js, planEdit.js, planExplain.js, planPreferences.js,
sanityChecks.js, searchTabs.js, seed.js, writeback.js,
`sources/{localCache,liveOff,usda}.js`, `normalisers/usdaToFood.js`.
Sync: `src/lib/sync/tables/{foodDomain,mealPlans}.js`.

**Flags / storage keys:** `@volyume_meals_per_day`,
`@volyume_off_writeback_consent_v1`, `@volyume_off_writeback_queue_v1`,
`@volyume_scan_chain_completed_v1`, `@volyume_off_consent_card_dismissed_v1`.
Tier gate: `withProGuard(..., 'Food diary')`.

**Telemetry events:** `food_search_attempt` (source_hit/query_len/ms),
`food_lookup_barcode` (source/ms, no EAN), `food_logged`,
`custom_food_created`, `ocr_writeback_attempted`; audit events
`food.add / food.delete / food.saveMeal / food.custom.create /
food.barcode.scan / food.barcode.resolved / food.suggestMeal`.

**Data sources (5-step waterfall):** local SQLite (`foods` +
`custom_foods`, incl. bundled OFF/CoFID snapshot) → live OpenFoodFacts →
USDA FoodData Central; cache promotion writes network hits back to local.

**Tests present:** food.waterfall, food.writeback, food.liveOff, food.usda,
food.sanityChecks, food.ocrParser, foodSync, mealSuggest, curatedMeals,
curatedDiary, mealSlots, savedMeals, logFoodEntry.guard, foodComponents,
proGate.

---

## 6. Coverage honesty
Deep: DiaryScreen, search pipeline + sources + ranking, full barcode/COMP-022
chain, all logging paths + tap counts, totals, free-user teaser, slot model,
Suggested. **Lighter (read but not exhaustively traced):** recipes
(MyRecipes/RecipeBuilder/recipe resolution at localCache.js:148-192 confirmed
working but the builder UI not walked), water (fully read — it is genuinely
thin), FoodInsights/CSV export (confirmed reachable via the insights icon;
internals not traced). `usda.js` skimmed (mirrors `liveOff.js` shape).
No claim here is unverified; anything not opened is named above rather than
asserted.
