# Facts: Nutrition (Pro)

Raw fact-extraction report, saved verbatim from a read-only subagent
(model: claude-sonnet-5) run on 2026-07-09. Evidence base for `ASSESSMENT.md`.
Facts only; all judgement lives in the assessment.

---

I now have thorough coverage of the food/diary/nutrition surfaces. Here are the facts.

## 1. LOGGING LOOP

**Search → portion → save** (`FoodSearchScreen.js`): Modal opened from Diary's "Add food". Top: horizontal sub-nav tabs (`SEARCH_TABS`: Recents, Suggested, Favourites, Frequents, Custom). Persistent search box under the tabs works from any tab (250ms debounce, 2+ char minimum, local cache first then live OFF+USDA waterfall). Tap a row → `FoodDetailSheet` (`mode="add"`) → serving-unit picker (household unit or grams, `buildServingUnits`) → "Add to diary" writes `food_entries`, then a success+Undo toast (`"{food} added."`), then `navigation.goBack()`.

**Recents/favourites/frequents ("Add again")**: On these three tabs, with no active search, a **tap logs immediately** at the remembered portion (`quickLogRelog`, rounds to whole grams, 1–5000g safety bound `isValidEntryGrams`), no sheet. **Long-press opens the sheet** to change the portion. A saved meal that has earned a slot-recent (`meal:<id>` ref) taps into `quickLogRelogMeal` instead (fans into N `food_entries` rows). Recents are per-slot ("this slot's most-logged foods," `getSlotRecents`), not global recency.

**Copy-yesterday / copy-a-day**: `EmptyDiary`'s "Copy yesterday" button (only shown if yesterday has food) confirms via `appAlert` then replays every entry through `logFoodEntry`, reporting partial failures ("Copied 4; 2 couldn't be added."). Diary's "Day tools" sheet also offers "Copy from another day" — lists last 14 logged days via `getRecentLoggedDays`.

**Quick-add macros**: `QuickAddSheet` (kcal/protein/carbs/fat, no food lookup) reachable from the Diary meal-card overflow, the FoodSearch "More/Custom" tab CTA, and inline. Writes `food_ref: 'quick:adhoc'`, `quantityG: 0`; diary shows it as "Quick add" with no gram weight.

**Barcode scan** (`ScanBarcodeScreen.js`): live `react-native-vision-camera` scan (EAN-13/8, UPC-A/E, Code-128). Hit → routes to `FoodSearch` with `scannedFood` (auto-opens detail sheet). **Miss** → routes to `ScanLabelScreen` with the barcode prefilled ("Barcode {ean} not in our database"). A manual-entry escape hatch ("Enter barcode number") exists for damaged/curved barcodes (8–14 digit validator). Permission-denied state shows "Camera access needed" + Open Settings / Allow camera / "Type it in instead" (routes straight to `AddCustomFood`). No-camera-device state shows the same escape hatch.

**Label scan** (`ScanLabelScreen.js`): two-step capture — front-of-pack photo (name via MLKit OCR block recognition) then nutrition panel photo (macros via `parseNutritionLabel`). "Skip name" (rememberable via `@volyume_scan_skip_name`) and "Add a name" toggle between steps. Routes to `AddCustomFoodScreen` with prefilled name/macros/OCR-confidence flags. If OCR isn't in the binary, capture UI hides and a "Type it in" CTA routes to manual entry. A COMP-022 one-tap arrival choice ("Scan the label" / "Type it in") appears on barcode-miss arrival, with distinct offline vs. online copy.

## 2. DIARY

Day view (`DiaryScreen.js`): `ScreenHeader "Eat"` → day-pager row (chevrons + tappable date opening a native date picker, `DiaryDatePicker`) → `MacroRings` (or `FirstFoodPrompt` for brand-new accounts with zero lifetime entries) → optional micronutrient panel (Pro-only, collapsed) → six meal-section cards (Breakfast/Lunch/Dinner/peri-workout/Snacks, flexible numbered ladder "Meal 1..N" + "Add meal") → water tracker card.

**Rings**: kcal ring (Skia canvas, animated sweep) shows **"N left"/"N over"** as the hero numeral (remaining-first, MFP-style), eaten total as quiet secondary reference beside it. Four macro bars underneath (Protein primary/bold, Carbs, Fat, optional Fibre) each showing "Ng / Ng target," a factual "Ng to go"/"Ng over" line, and a %-of-calories split footer. **Colour is explicitly adherence-neutral**: ring/fill always brand amber (`bandColour()`), never green/red for under/over — code comment cites this as a deliberate ED-safety reversal of an earlier three-band scheme. Fibre is "more is fine" — never shows "over."

**Meal grouping**: `MealSection` cards show a per-meal subtotal (kcal + protein only), swipeable entry rows (`SwipeableEntryRow`, swipe-right reveals Delete), long-press enters multi-select, tap opens edit sheet. Empty slots with a memorized history show up to 3 "usuals" one-tap chips.

**Swipe actions**: horizontal swipe on the whole day content changes date (`Gesture.Fling`, left=next day, right=previous), independent of the per-row swipe-to-delete. Multi-select toolbar (bottom bar): Move / Copy to today / Save meal / Delete.

**Day switching**: chevrons, swipe gesture, tap-date-to-jump (native picker), and a "Today" pill when off-today.

**Read-only (free tier)**: `readOnly = tier !== 'pro'` — Diary becomes view-only (no add/edit/delete/scan/FAB/selection), shows a calm banner ("Your diary is view-only on the free plan... Upgrade to keep logging"), hides empty meal slots entirely, and an empty day shows a plain fact line ("Nothing logged this day") with no CTA.

## 3. TARGETS

`NutritionTargetsScreen.js` (2159 lines): collapsed "Set it for me" fast path first, full form one tap away. Goal picker (6 named goals, e.g. "Build muscle (slow) ~+10% surplus"), activity level, body-fat source with confidence badges (High/Medium/Low, colour-coded). Results: a hero card showing target kcal + estimated range, three macro cards (grams, g/kg, %-of-kcal bar), a per-meal protein-distribution card (info tooltip explaining the 0.4–0.55 g/kg MPS window), collapsible "why" disclosures per macro. **Per-day (training vs rest)**: separate screen `PerDayTargetsScreen.js` — a per-weekday kcal offset (Stepper, ±MAX_PERDAY_OFFSET_KCAL, step 50 kcal) shown live-clamped against the safe floor with a "floor" tag when clamped; explicitly "planning only," never touches coaching/weekly average/safety floor. Diary itself separately supports a macro-cycle split (training/rest) and refeed day, each with its own quiet "tap to stop" exit row under the rings.

**Education surfaces**: `InfoTooltip` icons throughout (protein-window explainer, protein-approach comparison). Female-athlete iron/micronutrient awareness banner (`femaleNutritionAwareness`, awareness-only, no tracking). `MealNamesScreen.js` lets users rename meal-slot labels (cosmetic only, slot keys/logged data untouched).

## 4. COPY (verbatim)

- "Nothing logged for this day yet." (`EMPTY_DIARY_COPY`)
- "Log your first food to see your day take shape." (new-account prompt)
- "Your numbers came out below the minimum we hold targets at, so we raised them. The target above is your safe minimum. Eating below it would work against your training, recovery and health." (calorie-floor banner, calm/shield-icon framing, never alarm-red)
- "Held at your safe minimum" (hero-card floor chip)
- "Your diary is view-only on the free plan. Everything you logged is safe and stays yours." (E10 read-only banner)
- "A starting point, not a rule. Season and tweak to taste with herbs, spices, citrus or sauces you enjoy." (suggested-meal note, explicitly anti-diet-culture)
- "Fibre counts on days you reached 30 g or more. More is fine." (adherence footer — no upper-bound shame)
- "Not in the database yet" / "Fix it once and it's yours. Scan the label, about 30 seconds, or type it in." (barcode-miss choice sheet)
- "You've saved this barcode before as {name}." (duplicate-custom-food banner)
- "Ease this cut to about {kcal}" (one-tap energy-availability nudge, only ever raises calories)
- "Amber figures aren't certain, check them." (OCR low-confidence flag)
- "{N}g over" / "{N}g to go" (macro-bar remaining, never colour-flagged as bad)

## 5. STATE COVERAGE

**Offline search**: empty live-search result triggers a `NetInfo.fetch()` probe to distinguish "you're offline" from a genuine miss; distinct copy for each ("You're offline, so live search can't check the food database. Saved foods still work..." vs "No matches for '{query}'."). Saved/local foods never report offline (answered without network).

**Scanner permission denial**: both `ScanBarcodeScreen` and `ScanLabelScreen` show identical structure — icon + "Camera access needed" + (Open Settings if `denied` / Allow camera if askable) + a "Type it in instead" escape hatch that always routes to manual entry, never a dead end. `not-determined` shows a bare spinner while the OS dialog is requested automatically. No-camera-device state also degrades gracefully.

**Empty states**: `EmptyState` component used consistently across MyMeals/MyRecipes/FoodInsights/FoodSearch with icon+title+text+action; load-error and empty-list are visually distinct (warning icon + "Try again" vs. content icon + CTA).

**Loading**: `SkeletonRow`/`SkeletonCard` content-shaped skeletons throughout (Diary day load, FoodInsights cards, MyMeals/Recipes lists, Suggested tab) rather than bare spinners.

**Error handling**: consistent `try/catch` + calm toast pattern ("Couldn't add that. Try again.", variant 'error'); RecipeBuilder/MealPlan/FoodInsights all have distinct load-error EmptyState with "Try again" retry actions that never silently fail.

## 6. INTERACTION

**Haptics** (`src/lib/haptics.js`): `press()`/light-impact on taps and water +/-, `commit()`/medium-impact after a delete succeeds (fires only after the write, never before — hostile-review-noted), `selection()` on Undo, `planReady()`/success-notification on barcode scan lock-on. All routed through a vocabulary module respecting reduce-motion.

**Animations**: kcal ring sweep + count-up numeral run on the UI thread via Reanimated shared values (`useSharedValue`/`withTiming`, `motion.hero` duration), skipped entirely under reduce-motion. Meal-list rows animate in/out on add/delete (`AnimatedRow`, keyed by stable entry id) rather than jump-cutting. `AnimatedEntrance` staggers meal-card entrance by index.

**Keyboard handling on portion entry**: `AddCustomFoodScreen`/`RecipeBuilderScreen`/`MealNamesScreen` all wrap in `KeyboardAvoidingView` with `behavior: 'padding'` (iOS only), a standardised pattern noted as a 2026-07-09 audit fix (`L03-C5`) applied for consistency. `FoodDetailSheet`'s in-sheet amount field has no separate KeyboardAvoidingView (BottomSheet handles it).

## 7. STANDOUT

**Strong**:
1. Adherence-neutral colour discipline is enforced with unusual rigor — code comments explicitly cite the ED-safety rationale for banning green/red valence on macro bars and rings, even on the "over target" state.
2. `FirstFoodPrompt` progressive-disclosure: a brand-new account gets one calm sentence + target instead of the full four-bar/percentage-split MacroRings, permanently swapping to full rings the moment any food is ever logged.
3. Race-guard discipline on the diary day load (`loadGuardRef`/`createRaceGuard`) explicitly prevents a stale rapid-date-navigation load from painting the wrong day's data — documented as a specific prior bug (BUG-1).
4. One-tap "usuals" per empty meal slot (top-3 most-logged foods for that specific slot) turns routine logging into a single tap without a search.
5. The floor/refeed/macro-cycle/banking interactions are unusually well cross-guarded: banking is disabled and explains itself when a split/refeed/floor/ED-flag closes it off, rather than silently vanishing.

**Rough edges**:
1. `NutritionTargetsScreen.js` is 2159 lines / `DiaryScreen.js` is 2174 lines — both single-file screens carrying very large amounts of state and inline JSX, a maintainability/regression-risk concern even if functionally solid.
2. `MealSection`'s per-meal action hub was deliberately reduced to a single "Add food" button per a prior polish pass, but `onSavedMeals`/`onScan`/`onQuickAdd` callbacks are still wired through unused (dead-but-connected code, per the code's own comment) rather than removed or exposed.
3. Multiple `require('../lib/food/db')` / `require('../lib/errorLog')` calls appear inline inside functions (e.g. `DiaryScreen.confirmQuickAdd`, `FoodSearchScreen` catch blocks) rather than top-level imports — an ESLint-suppressed pattern repeated many times.
4. `RecipeBuilderScreen`'s web-import path silently caps at 30 ingredients and does per-line food-search lookups sequentially (no parallelism), so a large imported recipe could feel slow with only a toast noting "(N more not imported.)" after the fact.
5. Read-only (free-tier) empty-day state ("Nothing logged this day") offers zero affordance beyond the earlier upgrade banner — a free user revisiting an old logged-but-now-empty day has no path forward on that specific screen state.
