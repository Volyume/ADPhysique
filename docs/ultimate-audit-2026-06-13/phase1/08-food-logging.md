# Phase 1 inventory — Food logging (08)

Volyume Ultimate Audit, 2026-06-13. READ-ONLY evidence inventory. Every claim cites `file:line`.
Theme tokens resolved against `src/styles/theme.js`.

Token reference used throughout (theme.js):
- `fontSize.micro` = 10 (theme.js:257), `fontSize.xs` = 11 (theme.js:258), `fontSize.sm` = 13 (theme.js:259),
  `fontSize.md` = 16 (theme.js:260), `fontSize.lg` = 17 (theme.js:261), `fontSize.xl` = 20 (theme.js:262),
  `fontSize.xxl` = 24 (theme.js:263), `fontSize.xxxl` = 32 (theme.js:264), `fontSize.display` = 40 (theme.js:265).
- `type.title` => fontSize.lg (17), semibold (theme.js:390-393).
- `type.body` => fontSize.md (16), regular (theme.js:394-397).
- `type.bodyStrong` => fontSize.md (16), semibold (theme.js:398-401).
- `type.label` => fontSize.sm (13), medium (theme.js:402-405).
- `type.caption` => fontSize.xs (11), regular (theme.js:406-409).
- `type.num(role)` => role's fontSize + tabular figures (theme.js:417-421).
- `spacing`: hair 1, xxs 2, xs 4, xs2 6, sm 8, md 12, lg 16, xl 24, xxl 32, xxxl 48 (theme.js:228-239).
- `radius`: xs 4, sm 6, md 10, lg 14, xl 20, full 999 (theme.js:241-248).
- NOTE: every fontSize token is multiplied by 1.2 (rounded) when the Larger Text accessibility
  toggle is on (theme.js:325-337); px values below are the default (toggle off).

---

SCREEN: DiaryScreen
WHAT IT IS: The food diary, the home of the Diary tab. Shows one day's eating: a macro summary, meal sections you log food into, water, and tools to copy / move / save entries (DiaryScreen.js:1-11).
WHAT IS ON IT:
- ScreenHeader titled "Diary" (DiaryScreen.js:505).
- Day pager row (DiaryScreen.js:511-538): a "Today" pill that only shows when the viewed day is not today (DiaryScreen.js:513-517); chevron-back (size 22) "Previous day" (DiaryScreen.js:520-522); the day label, e.g. "Today"/"Yesterday"/"Tomorrow"/"Wed, 11 Jun" (DiaryScreen.js:523, label logic friendlyDate DiaryScreen.js:61-70); chevron-forward (size 22) "Next day" (DiaryScreen.js:524-526); a stats-chart-outline icon (size 22) opening FoodInsights ("View 7-day insights and export diary") (DiaryScreen.js:529-536).
- MacroRings summary, tappable to open the breakdown sheet when there are entries (DiaryScreen.js:540-547). Takes `rollup`, `effectiveTargets`, and a `dayTypeLabel` (DiaryScreen.js:541-545). dayTypeLabel resolves to "Refeed day" / "Training day" / "Rest day" / null (DiaryScreen.js:160-164).
- "Your trend" WeightTrendCard, only on today's view and only when there is data (DiaryScreen.js:549-555).
- One-time Open Food Facts consent card (only today, only after a barcode heal), with "Not now" and "Sharing settings" actions (DiaryScreen.js:557-576).
- Empty state EmptyDiary with onAdd / onCopyYesterday / onPlanDay when no entries (DiaryScreen.js:578-583).
- When entries exist: a list of MealSection cards (one per slot) with per-meal add, quick-add, edit, delete, and multi-select (DiaryScreen.js:586-601), plus an "Add meal" row to extend the ladder (DiaryScreen.js:602-612).
- WaterRow at the bottom: water icon, "Water" label, "{litres} / 3.0 L" value, minus and plus 250 ml buttons, and a progress track (DiaryScreen.js:616, 752-777). Daily target hardcoded at 3000 ml (DiaryScreen.js:750).
- Scan barcode FAB (bottom-right, 56x56, barcode-outline icon size 26), hidden during selection (DiaryScreen.js:647-657).
- Edit sheet (FoodDetailSheet, edit mode), QuickAdd sheet, MacroBreakdown sheet (DiaryScreen.js:619-643).
- Selection toolbar when multi-selecting: cancel (X), "{n} selected" count, and Move / To today / Save meal / Delete actions (DiaryScreen.js:659-684).
- "Move to" modal listing each meal slot (DiaryScreen.js:686-708); "Save as meal" modal with a name field (DiaryScreen.js:710-743).
- Pull-to-refresh on the ScrollView (DiaryScreen.js:503).
NAVIGATION: Registered as route "Diary" in the DiaryStack as the gated component GatedDiary, headerShown false (RootNavigator.js:225). DiaryStack is the "DiaryTab" tab (RootNavigator.js:447, tab title "Diary", restaurant icon RootNavigator.js:437). Reached by tapping the Diary tab. Pushes to: FoodSearch (addFood, DiaryScreen.js:229), MealPlan (empty state onPlanDay, DiaryScreen.js:582), ScanBarcode (FAB, DiaryScreen.js:650), FoodInsights (insights icon, DiaryScreen.js:530), SettingsPrivacy (OFF card, DiaryScreen.js:567).
GATING: PRO. Wrapped in `withProGuard(DiaryScreen, 'Food diary')` as GatedDiary (RootNavigator.js:160), registered at RootNavigator.js:225. CLAUDE.md confirms the food diary is a Pro feature; gating the Diary tab root covers the food sub-screens reached only from it (RootNavigator.js:156-159).
CURRENT STRENGTHS:
- A complete day view: macro summary, meal sections, water, and trend in one scroll (DiaryScreen.js:498-617).
- Strong power-user tooling: swipe-delete (requestDelete, DiaryScreen.js:433-454), multi-select with Move/Copy-to-today/Save-as-meal/Delete (DiaryScreen.js:659-684), copy yesterday (DiaryScreen.js:459-496), flexible numbered meal ladder honouring meals-per-day preference (DiaryScreen.js:194-220).
- All destructive actions confirm via appAlert (DiaryScreen.js:300-320, 433-454).
- Most interactive icons carry accessibilityLabel and 12px hitSlop (DiaryScreen.js:514, 520, 524, 531).
CURRENT WEAKNESSES:
- High information density on a populated day: header, day pager, macro rings, trend card, possible OFF card, N meal sections, add-meal row, water row, plus a floating FAB (DiaryScreen.js:498-657). A lot competing at once.
- Two different "add food" entry points with different reach: the per-meal add inside MealSection vs the barcode FAB. There is no single prominent primary "log food" action at the diary level — the most prominent floating control is Scan barcode (DiaryScreen.js:647-657), not search-add.
- The water target is hardcoded at 3000 ml with no per-user setting (DiaryScreen.js:750, acknowledged as a follow-up).
- offCardText uses a hardcoded lineHeight: 18 (DiaryScreen.js:872) and offCard copy is dense.
NEWBIE QUESTION: Partially. The day pager, meal cards and "Add" affordances are conventional and the empty state guides first use (EmptyDiary, DiaryScreen.js:578-583). But the floating barcode FAB as the single most prominent action may mislead a beginner into thinking scanning is the main path rather than search; and "meal slots" / numbered meals and the macro rings assume the user already knows what macros are.
ATHLETE QUESTION: Largely yes. Carb-cycle training/rest-day targets and refeed-day handling (DiaryScreen.js:143-164), per-meal breakdown, save-as-meal and copy-yesterday all serve a competitor who logs repeatedly. The hardcoded 3 L water target and the absence of a quick total-vs-target glance beyond the rings are minor gaps.
LOCATION QUESTION: Yes. It is the root of the Diary tab (RootNavigator.js:225, 447), which is the correct home for daily food logging, and it owns the sub-screens it pushes to.
VISUAL + USABILITY:
- Font sizes:
  - "Diary" header: rendered by ScreenHeader (not in this file); see ScreenHeader note below.
  - Day label: `type.title` => fontSize.lg (17), semibold (DiaryScreen.js:855, theme.js:390).
  - "Today" pill text: `type.label` => fontSize.sm (13) (DiaryScreen.js:860).
  - OFF card body / dismiss / CTA: fontSize.sm (13) (DiaryScreen.js:872, 874-875).
  - "Add meal" label: `type.label` => fontSize.sm (13) (DiaryScreen.js:881).
  - Water label: fontSize.md (16), medium (DiaryScreen.js:892).
  - Water value: fontSize.sm (13), tabular (DiaryScreen.js:893).
  - Selection count: `type.bodyStrong` => fontSize.md (16) (DiaryScreen.js:800).
  - Selection action labels: fontSize.xs (11), medium (DiaryScreen.js:803).
  - Move modal title: fontSize.xs (11), bold, uppercase (DiaryScreen.js:816-817).
  - Move option text: fontSize.md (16), medium (DiaryScreen.js:824).
  - Save-meal hint: fontSize.sm (13) (DiaryScreen.js:826); input fontSize.md (16) (DiaryScreen.js:833).
- Touch targets:
  - Day pager chevrons + today pill + insights icon: rely on hitSlop 12; the icon-only ones (chevrons, insights) have no explicit width/height, so the target is icon (22) + 12 hitSlop each side ≈ 46px — borderline acceptable (DiaryScreen.js:514, 520-526, 529-536).
  - todayPill: paddingHorizontal md (12), paddingVertical xs (4) over `type.label` (13) text — height ≈ 13 + 8 ≈ 21px plus hitSlop 12 = adequate via hitSlop but the visible pill is short (DiaryScreen.js:856-858). FLAG: visible target < 44px, saved by hitSlop.
  - Scan FAB: 56x56 (DiaryScreen.js:783) — good.
  - Water +/- buttons: 36x36 with hitSlop 8 => ~52px effective (DiaryScreen.js:765-769, 895-898). Visible 36px < 44px, saved by hitSlop.
  - selCancel: 32x32 with hitSlop 10 (DiaryScreen.js:661, 799) => ~52px effective; visible < 44px.
  - selAction: minWidth 48, no explicit height (DiaryScreen.js:802) — width OK, height depends on icon (20) + label.
  - moveOption: minHeight 48 (DiaryScreen.js:821) — good.
  - addMealRow: minHeight 44 (DiaryScreen.js:878) — meets bar exactly.
- Information density: High on a populated day (see weaknesses). Low/clean on the empty day (single EmptyDiary block + water + FAB).
- Clean vs cluttered: Generally clean cards but many stacked sections; the always-present FAB overlaps the bottom of the scroll content.
- Most important action prominence: The Scan barcode FAB is the most visually prominent control (amber 56px, shadow.lg) (DiaryScreen.js:781-787); the more common search-add lives quieter inside each MealSection. Arguably the prominence is on the wrong action.
- Device behaviour: Whole screen is a ScrollView (DiaryScreen.js:500) so content reflows on small/large phones. dateLabel has fixed minWidth 96 and dayPagerSide minWidth 72 (DiaryScreen.js:849, 855) — fixed, but small. moveCard maxWidth 320 (DiaryScreen.js:810). FAB position is spacing-based (DiaryScreen.js:782) so it scales. No fixed-height content list; scales well.

DiaryScreen — EXACT TAP COUNT TO LOG ONE FOOD ITEM (search flow, the primary path):
Flow cited end to end:
1. TAP 1 — On a meal card, tap "Add" (MealSection onAdd) which calls addFood(slot) → navigation.navigate('FoodSearch', { mealSlot, entryDate }) (DiaryScreen.js:591, 226-230). [On an EMPTY day this is the EmptyDiary "onAdd" button instead → addFood('meal_1') (DiaryScreen.js:580).]
2. TAP 2 — In FoodSearch, tap a food row → onPress={() => openPicker(food)} opens the FoodDetailSheet (FoodSearchScreen.js:478, 228-230). (Assumes the desired food is already visible in the default Recents/list; if not, typing a query is additional taps + keystrokes — see note.)
3. TAP 3 — In the FoodDetailSheet, tap "Add to diary" → onSave=confirmLog, which writes the entry via logFoodEntry and calls navigation.goBack() to the diary (FoodDetailSheet.js:169-177, 174-175; FoodSearchScreen.js:336-375, 358-374).
=> MINIMUM 3 TAPS to log one already-visible food at its default serving (meal "Add" → food row → "Add to diary").
Variants:
- Faster "plate" path: tap a row's + (addToPlate, FoodSearchScreen.js:480, 234-248) then tap "Log 1" in the plate bar (FoodSearchScreen.js:678-685, logPlate FoodSearchScreen.js:257-306). That is also 3 taps from the diary (meal Add → row + → Log 1) but skips the serving sheet, logging the default serving.
- If the food is not in the default list, add a TAP to focus the search box plus typed keystrokes before TAP 2 (search box FoodSearchScreen.js:630-639; 2+ char query gate FoodSearchScreen.js:209).
- Quick add (no food): meal card quick-add (DiaryScreen.js:592) → QuickAddSheet save (DiaryScreen.js:631-636) = 2 taps + numeric entry.

---

SCREEN: FoodSearchScreen
WHAT IT IS: The food picker, presented as a modal between the diary "Add food" tap and the actual log write. Browse tabs (Recents/Suggested/Favourites/Frequents/Custom) plus a debounced waterfall search; tap a food to open a serving sheet, or use the multi-add "plate" (FoodSearchScreen.js:1-18).
WHAT IS ON IT:
- Header: close (X, size 24), title "Add to {meal label}", a flash-outline "Quick add calories" icon (size 23) and a barcode-outline "Scan a barcode" icon (size 24) (FoodSearchScreen.js:575-603).
- Horizontal tab strip from SEARCH_TABS with an active underline (FoodSearchScreen.js:605-624).
- Search box "Search foods or brands" with a search icon and an inline spinner while searching (FoodSearchScreen.js:628-641); hidden on the Suggested tab (FoodSearchScreen.js:626).
- Results / browse FlatList of FoodRow items; on the Custom tab, CTA rows "New custom food", "My recipes", "My meals" (FoodSearchScreen.js:438-449, 451-483).
- Suggested tab: curated meal cards showing name and "kcal · protein · carbs · fat", with a per-meal sizing hint, skeletons while loading, and empty/no-targets states (FoodSearchScreen.js:512-571).
- Empty/no-match states with a "Create a custom food" button, and a footer "Create a custom food" button when there are results (FoodSearchScreen.js:485-510, 650-662).
- Plate bar (when items on the plate): "{n} on the plate", "~{kcal} kcal · tap to review", and a "Log {n}" button (FoodSearchScreen.js:667-687).
- Plate review modal: list of plate items with per-item remove, a "Clear" button and a wide "Log {n} to {meal}" button (FoodSearchScreen.js:689-731).
- FoodDetailSheet (add mode) and QuickAddSheet (FoodSearchScreen.js:733-752).
NAVIGATION: Route "FoodSearch" in DiaryStack, headerShown false, presentation 'modal' (RootNavigator.js:231-235). Reached from DiaryScreen addFood (DiaryScreen.js:229), from RecipeBuilder onPickIngredient with pickMode 'recipe' (RecipeBuilderScreen.js:118-124), and via AddCustomFood's "Log that instead" dupe path navigation.replace('FoodSearch', ...) (AddCustomFoodScreen.js:218). Pushes to: ScanBarcode (FoodSearchScreen.js:595), AddCustomFood (newCustomFood/gotoCustomReplace, FoodSearchScreen.js:424-429), MyMeals and MyRecipes (CTA rows, FoodSearchScreen.js:458-459). On log it calls navigation.goBack() (FoodSearchScreen.js:289, 374); in recipe pick mode it navigates back to the returnTo screen (FoodSearchScreen.js:341-350).
GATING: PRO (inherited). It lives only inside DiaryStack (RootNavigator.js:231), whose root is Pro-gated; per the navigator comment the food sub-screens are reached only from the gated Diary tab (RootNavigator.js:156-159). No own guard.
CURRENT STRENGTHS:
- Multiple fast paths: browse tabs, search, multi-add plate, quick add, scan, and curated suggestions sized to remaining macros (FoodSearchScreen.js:155-195, 234-306).
- Search is debounced (250ms) with a local-first waterfall and a 2-char gate, avoiding thrash (FoodSearchScreen.js:206-226).
- Double-log guard on the plate (loggingPlateRef) and honest partial-failure messaging (FoodSearchScreen.js:259-305).
- Long-press cycles favourite/dislike with toast feedback (FoodSearchScreen.js:396-419).
CURRENT WEAKNESSES:
- Five browse tabs plus a search box plus two header icons is a lot of choice for a "pick a food" sheet (FoodSearchScreen.js:575-624).
- Two parallel add mechanisms on each row (tap row = sheet; tap + = plate) are easy to confuse; the difference is only discoverable by trying (FoodSearchScreen.js:474-482).
- The "Create a custom food" affordance appears in three places (empty, no-match, footer) (FoodSearchScreen.js:492-499, 652-660).
- gotoCustomReplace uses navigation.replace, so Back from the custom-food screen lands on the Diary rather than back on search (FoodSearchScreen.js:424-426) — intentional per comment but a surprise.
NEWBIE QUESTION: Partially. "Search foods or brands" and tapping a result are clear, but the tab names (Recents/Suggested/Favourites/Frequents/Custom) and the tap-row-vs-tap-plus distinction are not obvious to a first-timer.
ATHLETE QUESTION: Yes. Frequents, favourites, slot-aware recents that pre-fill the last portion (FoodSearchScreen.js:104-114, 737), and the multi-add plate make repeat logging fast for a heavy user.
LOCATION QUESTION: Yes. A modal sitting between the diary add tap and the write is the right place; it is also correctly reused by RecipeBuilder in pick mode (RecipeBuilderScreen.js:118-124).
VISUAL + USABILITY:
- Font sizes:
  - Header title: `type.title` => fontSize.lg (17) (FoodSearchScreen.js:765).
  - Tab labels: fontSize.sm (13), medium/semibold active (FoodSearchScreen.js:784, 788).
  - Search input: fontSize.md (16) (FoodSearchScreen.js:805).
  - CTA row text: `type.bodyStrong` => fontSize.md (16) (FoodSearchScreen.js:814).
  - Empty text: fontSize.sm (13) (FoodSearchScreen.js:817).
  - Suggest hint: `type.caption` => fontSize.xs (11) (FoodSearchScreen.js:820).
  - Suggest name: `type.bodyStrong` (16); suggest macros: `type.caption` (11) (FoodSearchScreen.js:832-833).
  - No-results text: `type.body` (16); button text: bold, default size (FoodSearchScreen.js:839, 845).
  - Plate count: `type.bodyStrong` (16); plate kcal line: `type.caption` (11); plate log text: `type.bodyStrong` (16) (FoodSearchScreen.js:862-869).
  - Plate modal title: `type.title` (17); plate item name fontSize.md (16); plate item meta `type.caption` (11) (FoodSearchScreen.js:881, 887-888).
  - FoodRow name fontSize.md (16) semibold; meta fontSize.sm (13) (FoodRow.js:95-97).
- Touch targets:
  - Header X / quick-add / scan icons: hitSlop 12, icon-only (FoodSearchScreen.js:576-601) => ~icon+24; quick-add icon is 23, scan 24 — effective ~47px, OK.
  - Tabs: only paddingHorizontal md + paddingTop md, label fontSize.sm + paddingBottom sm (FoodSearchScreen.js:778-787). Height ≈ 12 + 13 + 8 ≈ 33px — FLAG: < 44px and no hitSlop on the tab TouchableOpacity (FoodSearchScreen.js:613-622).
  - Search box: minHeight 48 (FoodSearchScreen.js:802) — good.
  - FoodRow: minHeight 56 (FoodRow.js:93) — good; the + button has hitSlop 12 (FoodRow.js:75).
  - ctaRow: paddingVertical md (12) only, no minHeight (FoodSearchScreen.js:810-811) => ~16(icon)+24 ≈ 40px — borderline < 44px.
  - Plate "Log {n}" button: paddingVertical sm (8) + text 16 ≈ 32px — FLAG: < 44px, no hitSlop (FoodSearchScreen.js:864-868, 678-685).
  - Suggest card / plate item rows: ample padding, OK (FoodSearchScreen.js:823-831, 882-886).
- Information density: Medium-high; tabs + search + list + optional plate bar.
- Clean vs cluttered: The browse list and rows are clean; the header (three controls + title) and the triple custom-food CTA are the busiest parts.
- Most important action prominence: For browse, the amber add-circle on each FoodRow is clear (FoodRow.js:79); for the plate, the amber "Log {n}" is prominent (FoodSearchScreen.js:864-869). Reasonable.
- Device behaviour: Tab strip is a horizontal ScrollView (FoodSearchScreen.js:605-611) so it scrolls on narrow phones. Lists are FlatList. Plate review ScrollView capped at maxHeight 360 (FoodSearchScreen.js:698) — fixed, fine on large, may dominate a 5.4". plateModalSheet maxWidth not set (full width bottom sheet). Scales acceptably.

---

SCREEN: AddCustomFoodScreen
WHAT IT IS: The manual food-entry form. Creates a custom_foods row and logs one food_entries row in a single flow, with macro sanity checks before saving (AddCustomFoodScreen.js:1-9, 104-188).
WHAT IS ON IT:
- Header: close (X, size 24), title "New food", a spacer to balance (AddCustomFoodScreen.js:192-203).
- Context label "Logging to {meal}" (AddCustomFoodScreen.js:206); optional "Scanned barcode: {ean}" hint (AddCustomFoodScreen.js:207-209).
- Optional duplicate banner: "You've saved this barcode before as {name}." + "Log that instead" button (AddCustomFoodScreen.js:210-221).
- Fields: Name (autofocus, placeholder "Chicken breast, raw"), Brand (optional, placeholder "Tesco") (AddCustomFoodScreen.js:223-224).
- "PER 100G" section: optional amber "Amber figures aren't certain, check them." note (AddCustomFoodScreen.js:226-231); Calories + Protein row, Carbs + Fat row, Fibre (optional) (AddCustomFoodScreen.js:232-240). Fields flagged "unsure" get an amber border (AddCustomFoodScreen.js:283, 350).
- "QUANTITY EATEN" section: Serving (g) + Eaten (g) (AddCustomFoodScreen.js:242-246).
- "Save and add to diary" button, disabled until valid, with loading state (AddCustomFoodScreen.js:248-256).
NAVIGATION: Route "AddCustomFood" in DiaryStack, headerShown false, presentation 'modal' (RootNavigator.js:236-240). Reached from FoodSearch (newCustomFood / gotoCustomReplace, FoodSearchScreen.js:424-429) and from ScanLabel via navigation.replace after OCR or manual fallback (ScanLabelScreen.js:133-135, 148-152, 159-161, 171-176). On save it calls navigation.goBack() (AddCustomFoodScreen.js:182); the dupe "Log that instead" navigates back to FoodSearch (AddCustomFoodScreen.js:218).
GATING: PRO (inherited). Lives only in DiaryStack (RootNavigator.js:236); reached only from the Pro-gated Diary domain (RootNavigator.js:156-159). No own guard.
CURRENT STRENGTHS:
- One flow creates the food and logs the first entry (AddCustomFoodScreen.js:124-158).
- Sanity check with a "Numbers look off / Save anyway" confirm before saving (AddCustomFoodScreen.js:108-122).
- OCR-prefill awareness with per-field "unsure" amber flagging that clears on edit (AddCustomFoodScreen.js:57-63, 227-240).
- Duplicate-barcode guard offers logging the existing food instead (AddCustomFoodScreen.js:71-80, 210-221).
- Save is disabled until name + non-negative kcal + positive serving (AddCustomFoodScreen.js:102, 253).
CURRENT WEAKNESSES:
- Seven numeric/text fields plus serving + eaten is a fair amount of typing for "log one food" — heaviest path of the eight screens (AddCustomFoodScreen.js:223-246).
- "Serving (g)" vs "Eaten (g)" side by side may confuse: which one scales the logged macros? (the answer is Eaten, AddCustomFoodScreen.js:143-147) — not explained in UI.
- The barcode is shown but not persisted to custom_foods (comment AddCustomFoodScreen.js:42-45) — a known gap.
NEWBIE QUESTION: Mostly no. "PER 100G" macros, plus the Serving vs Eaten distinction, demand nutrition literacy a first-timer is unlikely to have. The labels are clear English but the concept is advanced.
ATHLETE QUESTION: Yes. Per-100g entry, optional fibre, separate serving and eaten weights, and a sanity check match how a competitor enters a label they trust.
LOCATION QUESTION: Yes. A modal fallback reached from search misses and from the scan chain is the right home for manual entry (RootNavigator.js:236; FoodSearchScreen.js:424-429; ScanLabelScreen.js:148-152).
VISUAL + USABILITY:
- Font sizes:
  - Header title: `type.title` => fontSize.lg (17) (AddCustomFoodScreen.js:307).
  - Context label: fontSize.sm (13) (AddCustomFoodScreen.js:310).
  - Barcode hint: `type.label` => fontSize.sm (13) (AddCustomFoodScreen.js:312).
  - Dupe text: fontSize.sm (13) (AddCustomFoodScreen.js:323).
  - Section label ("PER 100G" / "QUANTITY EATEN"): fontSize.xs (11), bold, letterSpacing 1 (AddCustomFoodScreen.js:326-327).
  - Field label: fontSize.sm (13) (AddCustomFoodScreen.js:330).
  - Text input: `type.body` => fontSize.md (16) (AddCustomFoodScreen.js:337).
  - NumField input: `type.body` => fontSize.md (16); suffix fontSize.sm (13) (AddCustomFoodScreen.js:348-349).
  - Unsure note: fontSize.sm (13) (AddCustomFoodScreen.js:351).
  - Save button: label from Button component (size "lg", not styled here, AddCustomFoodScreen.js:248-256).
- Touch targets:
  - Header X: hitSlop 12, icon 24 (AddCustomFoodScreen.js:193-200) => ~48px, OK.
  - Text input: minHeight 48 (AddCustomFoodScreen.js:337) — good.
  - numWrap: minHeight 48 (AddCustomFoodScreen.js:347) — good.
  - Save button: size "lg" via Button component (not measurable in this file) (AddCustomFoodScreen.js:251).
- Information density: Medium-high (a full form), but well sectioned into PER 100G and QUANTITY EATEN.
- Clean vs cluttered: Clean two-column rows; consistent input styling.
- Most important action prominence: "Save and add to diary" is the single large primary button at the bottom (AddCustomFoodScreen.js:248-256) — correct.
- Device behaviour: Whole body is a ScrollView with keyboardShouldPersistTaps (AddCustomFoodScreen.js:205) so the form scrolls under the keyboard on small phones. Rows use flex (two NumFields each flex:1) so they scale (AddCustomFoodScreen.js:281, 339). No fixed widths that would clip.

---

SCREEN: MyMealsScreen
WHAT IT IS: The user's saved meals (named bundles of foods logged together). Tapping one logs every food in it to the slot/date the screen was opened with; supports rename and delete (MyMealsScreen.js:1-17).
WHAT IS ON IT:
- BackHeader titled "My meals" (MyMealsScreen.js:152).
- Loading skeletons (3 rows) (MyMealsScreen.js:154-159).
- Empty state: "Save your go-to meals" + "Select foods in your diary and tap \"Save as meal\"." (MyMealsScreen.js:160-166).
- List of meal rows: name (1 line) and meta "{n} foods · {kcal} kcal · {protein}g protein", with an add-circle-outline icon; tap logs, long-press opens the rename/delete menu (MyMealsScreen.js:129-148, 167-174).
- Confirm-log alert "Log \"{name}\"?" with item/slot detail (MyMealsScreen.js:79-88).
- Long-press menu: Rename / Delete / Cancel, with a nested delete confirm (MyMealsScreen.js:90-118).
- Rename modal with a name TextInput, Cancel and Save (MyMealsScreen.js:176-207).
NAVIGATION: Route "MyMeals" in DiaryStack, headerShown false, presentation 'modal' (RootNavigator.js:271-275). Reached from the FoodSearch Custom-tab CTA "My meals" (FoodSearchScreen.js:444, 458). On log it calls navigation.goBack() (MyMealsScreen.js:70). No create here — creation is from the diary multi-select "Save as meal" (MyMealsScreen.js:10-11; DiaryScreen.js:674).
GATING: PRO (inherited). DiaryStack only (RootNavigator.js:271); reached from the Pro-gated Diary domain. No own guard.
CURRENT STRENGTHS:
- One tap (plus a confirm) logs a whole saved meal to the current slot (MyMealsScreen.js:66-88).
- Rename and delete with clear, reassuring copy ("Anything you already logged from it stays in your diary.") (MyMealsScreen.js:99-113).
- Loading skeletons and a guiding empty state (MyMealsScreen.js:154-166).
CURRENT WEAKNESSES:
- Create/edit is not available here at all (MyMealsScreen.js:10-11); the only way to make a saved meal is the diary multi-select, which is non-obvious.
- Rename/Delete are hidden behind long-press with only an accessibilityHint as the discoverability cue (MyMealsScreen.js:137).
- The confirm-log alert adds a tap to every log even for trusted meals (MyMealsScreen.js:79-88).
NEWBIE QUESTION: Partially. The list and "tap to log" are clear, but "saved meal" as a concept and the fact you can only create one from diary multi-select are not obvious to a newcomer.
ATHLETE QUESTION: Yes. Reusable meal templates are exactly what a competitor on a fixed plan wants for fast repeat logging.
LOCATION QUESTION: Yes. Reached from the food picker's Custom tab (FoodSearchScreen.js:444) alongside My recipes — a sensible grouping.
VISUAL + USABILITY:
- Font sizes:
  - Title: from BackHeader (not in this file) — see BackHeader note.
  - Row name: `type.bodyStrong` => fontSize.md (16) (MyMealsScreen.js:220).
  - Row meta: fontSize.sm (13) (MyMealsScreen.js:221).
  - Empty title: `type.title` => fontSize.lg (17) (MyMealsScreen.js:226).
  - Empty body: fontSize.sm (13) (MyMealsScreen.js:227).
  - Card title (rename): `type.bodyStrong` => fontSize.md (16) (MyMealsScreen.js:230).
  - Rename input: `type.body` => fontSize.md (16) (MyMealsScreen.js:232).
  - Card button text: `type.body` => fontSize.md (16) (MyMealsScreen.js:240).
- Touch targets:
  - Meal row: minHeight 64 (MyMealsScreen.js:218) — good.
  - cardBtn (Cancel/Save in rename modal): paddingHorizontal lg + paddingVertical sm (8) + text 16 ≈ 32px — FLAG: < 44px, no hitSlop (MyMealsScreen.js:238, 198-203).
- Information density: Low; a single list of rows.
- Clean vs cluttered: Clean.
- Most important action prominence: The row itself is the tap target with an amber add-circle-outline cue (MyMealsScreen.js:145) — appropriate.
- Device behaviour: FlatList (MyMealsScreen.js:168) scales. Rename modal card width '100%' with horizontal padding (MyMealsScreen.js:228-229) so it adapts to width. No fixed clip risks.

---

SCREEN: MyRecipesScreen
WHAT IT IS: A list of the user's composed recipes. Tap a row to log one serving as a single diary line; a pencil edits; long-press deletes; the header plus builds a new one (MyRecipesScreen.js:1-15).
WHAT IS ON IT:
- BackHeader titled "My recipes" with a right-side add (+) "New recipe" icon (size 26) (MyRecipesScreen.js:144-151).
- Loading skeletons (3 rows) (MyRecipesScreen.js:153-158).
- Empty state: "Build your first recipe" + explainer + "Build a recipe" CTA button (MyRecipesScreen.js:159-168).
- List of recipe rows: name (1 line); meta "{n} servings" plus optional notes; a pencil "Edit" button; an add-circle icon (or spinner while logging). Tap logs one serving; long-press deletes (MyRecipesScreen.js:106-140, 169-176).
- Delete confirm: "Delete \"{name}\"?" with reassuring copy (MyRecipesScreen.js:88-104).
NAVIGATION: Route "MyRecipes" in DiaryStack, headerShown false, presentation 'modal' (RootNavigator.js:266-270). Reached from the FoodSearch Custom-tab CTA "My recipes" (FoodSearchScreen.js:443, 459). Pushes to RecipeBuilder for create (onCreate, MyRecipesScreen.js:60-62) and edit (onEdit, MyRecipesScreen.js:64-66). On log it calls navigation.goBack() (MyRecipesScreen.js:77).
GATING: PRO (inherited). DiaryStack only (RootNavigator.js:266); reached from the Pro-gated Diary domain. No own guard.
CURRENT STRENGTHS:
- Recipes log as one diary line, with an in-flight guard so a double-tap can't double-log (MyRecipesScreen.js:71-86, 113).
- Edit (pencil) and Delete (long-press) are both reachable; create from the header + and a primary CTA in the empty state (MyRecipesScreen.js:125-134, 147-149, 165-167).
- Tells the user to add an ingredient if the recipe has none (MyRecipesScreen.js:80-81).
CURRENT WEAKNESSES:
- Logging is unconfirmed (tap immediately logs and pops, MyRecipesScreen.js:75-79) whereas MyMeals confirms (MyMealsScreen.js:79-88) — inconsistent between the two sibling screens.
- Delete is long-press-only with just an accessibilityHint as the cue (MyRecipesScreen.js:116).
- The row carries three tap zones (row, pencil, implicit add icon) close together — the pencil and add-circle sit adjacent (MyRecipesScreen.js:125-138).
NEWBIE QUESTION: Partially. "Build a recipe once. Log it as one line every time you eat it." (MyRecipesScreen.js:163-164) explains the value well, but composing a recipe is an advanced task a beginner may skip.
ATHLETE QUESTION: Yes. A reusable composed recipe with per-serving logging suits meal-preppers and competitors.
LOCATION QUESTION: Yes. Grouped with My meals under the food picker's Custom tab (FoodSearchScreen.js:443).
VISUAL + USABILITY:
- Font sizes:
  - Title: from BackHeader (see BackHeader note).
  - Row name: `type.bodyStrong` => fontSize.md (16) (MyRecipesScreen.js:189).
  - Row meta: fontSize.sm (13) (MyRecipesScreen.js:190).
  - Empty title: `type.title` => fontSize.lg (17) (MyRecipesScreen.js:200).
  - Empty body: fontSize.sm (13) (MyRecipesScreen.js:201).
  - Empty CTA text: `type.bodyStrong` => fontSize.md (16) (MyRecipesScreen.js:206).
- Touch targets:
  - Recipe row: minHeight 64 (MyRecipesScreen.js:187) — good.
  - editBtn: 40x40 (MyRecipesScreen.js:191-194) — FLAG: < 44px (no hitSlop on this inner button; the row's outer pencil TouchableOpacity has hitSlop 12 at MyRecipesScreen.js:128 making it ~64px effective).
  - Header + (new recipe): hitSlop 12, icon 26 (MyRecipesScreen.js:147) => ~50px, OK.
  - Empty CTA: paddingVertical md (12) + text 16 ≈ 40px — borderline < 44px (MyRecipesScreen.js:202-203).
- Information density: Low; a single list.
- Clean vs cluttered: Clean, though the row has three adjacent controls.
- Most important action prominence: Amber add-circle (size 26) marks the primary log action per row (MyRecipesScreen.js:137) — appropriate.
- Device behaviour: FlatList (MyRecipesScreen.js:170) scales. No fixed widths beyond the 40px edit button; fine across sizes.

---

SCREEN: RecipeBuilderScreen
WHAT IT IS: Create or edit a recipe — name, total servings, notes, and an ordered ingredient list — with a live per-serving and whole-recipe macro preview. Ingredient picking reuses FoodSearchScreen in pickMode 'recipe' (RecipeBuilderScreen.js:1-20).
WHAT IS ON IT:
- Header: close (X, size 24), title "New recipe" or "Edit recipe", and a "Save" text action (disabled until valid; shows "Saving…") (RecipeBuilderScreen.js:172-182).
- Loading skeletons (3 rows) in edit mode while loading (RecipeBuilderScreen.js:184-189).
- Name field (autofocus on create, placeholder "e.g. Sunday chilli") (RecipeBuilderScreen.js:192-204).
- Total servings field (numeric, placeholder "4") (RecipeBuilderScreen.js:206-220).
- Notes field (multiline, optional) (RecipeBuilderScreen.js:222-233).
- Ingredients section: "Add ingredient" link; either "No ingredients yet…" hint or rows of {name, optional brand, an editable grams input, "g" unit, and a remove X} (RecipeBuilderScreen.js:235-269).
- Macros card: "Per serving" pills (kcal / P / C / F) and a "Whole recipe: …" subline (RecipeBuilderScreen.js:271-282).
NAVIGATION: Route "RecipeBuilder" in DiaryStack, headerShown false, presentation 'modal' (RootNavigator.js:276-280). Reached from MyRecipes onCreate/onEdit (MyRecipesScreen.js:61, 65). Pushes to FoodSearch in recipe pick mode for adding ingredients (RecipeBuilderScreen.js:118-124); receives the picked ingredient back via route param addedIngredient (RecipeBuilderScreen.js:98-111). On save it calls navigation.goBack() (RecipeBuilderScreen.js:162).
GATING: PRO (inherited). DiaryStack only (RootNavigator.js:276); reached from the Pro-gated Diary domain. No own guard.
CURRENT STRENGTHS:
- Live macro preview (per serving + whole recipe) updates as ingredients/servings change (RecipeBuilderScreen.js:113-116, 271-282).
- Quantity input is sanitised to digits + one decimal so a stray character can't NaN the preview (RecipeBuilderScreen.js:130-135).
- Atomic create/edit + setRecipeIngredients (RecipeBuilderScreen.js:139-168); Save disabled until name + positive servings (RecipeBuilderScreen.js:137).
- Reuses the existing food picker for ingredients rather than a bespoke search (RecipeBuilderScreen.js:118-124).
CURRENT WEAKNESSES:
- Each ingredient is a separate navigate-out to FoodSearch and back (RecipeBuilderScreen.js:118-124, 98-111) — building a multi-ingredient recipe is many round trips.
- "Save" is a small text link in the header (RecipeBuilderScreen.js:177-181), less prominent than the primary buttons used elsewhere.
- Ingredient quantity TextInput is width 64 with no minHeight (RecipeBuilderScreen.js:330-335) — small target.
NEWBIE QUESTION: No. Composing a recipe from per-gram ingredients with servings maths is an advanced workflow; a first-time gym-goer is unlikely to use it.
ATHLETE QUESTION: Yes. Per-serving macros from a gram-weighted ingredient list is exactly what a competitor prepping batch meals needs.
LOCATION QUESTION: Yes. A modal builder launched from My recipes, reusing the food picker, is the right structure (RootNavigator.js:276; MyRecipesScreen.js:61).
VISUAL + USABILITY:
- Font sizes:
  - Header title: `type.title` => fontSize.lg (17) (RecipeBuilderScreen.js:305).
  - Save action: `type.bodyStrong` => fontSize.md (16) (RecipeBuilderScreen.js:306).
  - Field label: fontSize.sm (13) (RecipeBuilderScreen.js:311).
  - Inputs: fontSize.md (16) (RecipeBuilderScreen.js:313).
  - Add-ingredient link: fontSize.sm (13), bold (RecipeBuilderScreen.js:322).
  - Ingredient empty hint: fontSize.sm (13) (RecipeBuilderScreen.js:323).
  - Ingredient name: `type.body` => fontSize.md (16); brand: `type.caption` => fontSize.xs (11) (RecipeBuilderScreen.js:328-329).
  - Quantity input: fontSize.md (16); unit "g": fontSize.sm (13) (RecipeBuilderScreen.js:332, 336).
  - Macros title: fontSize.xs (11), uppercase (RecipeBuilderScreen.js:339); macrosSub: `type.num('caption')` => fontSize.xs (11) tabular (RecipeBuilderScreen.js:341).
  - Pill value: `type.num('bodyStrong')` => fontSize.md (16) tabular; pill label: `type.caption` => fontSize.xs (11) (RecipeBuilderScreen.js:346-347).
- Touch targets:
  - Header X / Save: hitSlop 12 (RecipeBuilderScreen.js:173, 177) — OK.
  - "Add ingredient" link: hitSlop 8 (RecipeBuilderScreen.js:238) over fontSize.sm text — effective ~30px — borderline.
  - Quantity input: width 64, paddingVertical sm (8) + text 16 ≈ 32px, no minHeight (RecipeBuilderScreen.js:330-335) — FLAG: < 44px.
  - Remove X: hitSlop 8, icon 22 (RecipeBuilderScreen.js:264) => ~38px — borderline < 44px.
  - Inputs (name/servings/notes): paddingVertical md (12) + text 16 ≈ 40px, no minHeight (RecipeBuilderScreen.js:314-315) — borderline.
- Information density: Medium; a form plus a growing ingredient list and a macro card.
- Clean vs cluttered: Clean and well sectioned.
- Most important action prominence: Primary "Save" is a header text link (RecipeBuilderScreen.js:177-181), and the macro card draws the eye more than the save — the most important action is NOT the most prominent element.
- Device behaviour: Body is a ScrollView with keyboardShouldPersistTaps (RecipeBuilderScreen.js:191) so it scrolls under the keyboard. Quantity input fixed at width 64 (RecipeBuilderScreen.js:331) — fixed but small enough to be safe across sizes. Notes minHeight 60 (RecipeBuilderScreen.js:225). Scales acceptably.

---

SCREEN: ScanBarcodeScreen
WHAT IT IS: A live camera barcode scanner. On a successful scan it runs a waterfall lookup and routes to the detail sheet (hit) or to ScanLabel (miss) (ScanBarcodeScreen.js:1-25).
WHAT IS ON IT:
- Header: close (X, size 24), title "Scan barcode", and a torch toggle (flashlight / flashlight-outline, size 22; amber when on) (ScanBarcodeScreen.js:200-218).
- Live camera view filling the body (ScanBarcodeScreen.js:220-228).
- Overlay: an amber reticle (240x160) and a hint "Point at a barcode" / "Looking it up" while resolving (ScanBarcodeScreen.js:229-234).
- A resolving spinner badge top-right while looking up (ScanBarcodeScreen.js:235-239).
- Permission states: a spinner while 'not-determined' (ScanBarcodeScreen.js:138-146); a "Camera access needed" screen with "Open Settings" (denied) or "Allow camera" (otherwise) (ScanBarcodeScreen.js:148-176); a "No camera available" screen when there is no device (ScanBarcodeScreen.js:178-194).
NAVIGATION: Route "ScanBarcode" in DiaryStack, headerShown false, presentation 'modal' (RootNavigator.js:241-245). Reached from DiaryScreen's FAB (DiaryScreen.js:650) and from FoodSearch's header scan icon (FoodSearchScreen.js:595). On a hit it navigation.replace('FoodSearch', { scannedFood }) (ScanBarcodeScreen.js:117-119); on a miss it navigation.replace('ScanLabel', { prefillBarcode }) (ScanBarcodeScreen.js:122-124). Close calls navigation.goBack() (ScanBarcodeScreen.js:201).
GATING: PRO (inherited). Barcode scanning is a Pro feature (CLAUDE.md). The screen lives only in DiaryStack (RootNavigator.js:241), reached from the Pro-gated Diary domain; it has no own guard.
CURRENT STRENGTHS:
- Scan lock prevents a second scan firing mid-navigation (ScanBarcodeScreen.js:64, 104-107).
- Camera pauses when unfocused or backgrounded, re-arming on focus (ScanBarcodeScreen.js:68-78, 196).
- Success haptic on detect (ScanBarcodeScreen.js:111); torch toggle (ScanBarcodeScreen.js:205-217).
- Robust permission handling incl. Android re-ask quirks (ScanBarcodeScreen.js:80-101, 148-176).
- A miss routes straight into the heal chain (ScanLabel) rather than dead-ending (ScanBarcodeScreen.js:120-125).
CURRENT WEAKNESSES:
- No manual "type a barcode" or "type it in" escape on this screen itself (unlike ScanLabel which offers Type it in) — the only non-scan exit is Close (ScanBarcodeScreen.js:200-203).
- The hint text uses the scrim as a chip background (ScanBarcodeScreen.js:260-264); on a bright product it may be low-contrast but that is the standard chip.
- cameraWrap background is colors.background, not black, so letterboxing on some aspect ratios may not look like a camera viewport (ScanBarcodeScreen.js:254) — contrast ScanLabel which uses '#000' (ScanLabelScreen.js:365).
NEWBIE QUESTION: Yes. A reticle plus "Point at a barcode" is universally understood; the torch icon is conventional.
ATHLETE QUESTION: Yes, with a caveat. Fast scanning is what a busy user wants, but the lack of a manual-barcode entry path may frustrate when a code won't read.
LOCATION QUESTION: Yes. Reached from both the diary FAB and the food picker (DiaryScreen.js:650; FoodSearchScreen.js:595), the two natural launch points.
VISUAL + USABILITY:
- Font sizes:
  - Header title: `type.title` => fontSize.lg (17) (ScanBarcodeScreen.js:253).
  - Hint: `type.body` => fontSize.md (16) (ScanBarcodeScreen.js:260-261).
  - Permission title: `type.title` => fontSize.lg (17) (ScanBarcodeScreen.js:270-271).
  - Permission body: fontSize.md (16), hardcoded lineHeight 22 (ScanBarcodeScreen.js:274-276).
  - Permission button text: `type.bodyStrong` => fontSize.md (16) (ScanBarcodeScreen.js:282).
- Touch targets:
  - Header X / torch: hitSlop 12 (ScanBarcodeScreen.js:201, 206) over icons 24/22 => ~46-48px, OK.
  - Permission button: paddingVertical md (12) + text 16 ≈ 40px — borderline < 44px (ScanBarcodeScreen.js:278-281).
- Information density: Very low; a full-bleed camera with one reticle and a hint.
- Clean vs cluttered: Clean.
- Most important action prominence: The camera itself is the action; the reticle clearly marks where to aim (ScanBarcodeScreen.js:256-258). Appropriate.
- Device behaviour: Camera uses StyleSheet.absoluteFillObject inside a flex:1 wrap (ScanBarcodeScreen.js:221-222, 254) so it fills any screen. Reticle is fixed 240x160 (ScanBarcodeScreen.js:256-257) — fixed but well within a 5.4" width. Scales well.

---

SCREEN: ScanLabelScreen
WHAT IT IS: Two-step food capture via camera + on-device OCR: first the front of pack (to read the name), then the nutrition panel (to read macros), then hands off to AddCustomFood with values prefilled. Degrades to manual entry when OCR isn't in the binary (ScanLabelScreen.js:1-27).
WHAT IS ON IT:
- Header: close (X, size 24), title "Snap label", torch toggle (size 22) (ScanLabelScreen.js:240-258).
- Live camera view (ScanLabelScreen.js:260-269).
- Optional miss banner (when arriving from a barcode miss): "Barcode {ean} not in our database" (or just the barcode when offline) + guidance (ScanLabelScreen.js:270-285).
- OCR overlay (when OCR available): a frame (280x360) and a step hint "Front of pack (1 of 2)" / "Nutrition panel (2 of 2)" / "Reading" (ScanLabelScreen.js:232-236, 286-291).
- Capture row: a round shutter (72x72) with an inner dot, plus contextual "Skip name" (front step) and "Type it in" (when from a barcode miss); or, when OCR unavailable, a "Type it in" tertiary button (ScanLabelScreen.js:292-321).
- COMP-022 arrival-choice overlay (barcode miss + OCR available): a card titled "Not in the database yet" / "Couldn't check the full database" (offline) with body copy and "Scan the label" + "Type it in" buttons (ScanLabelScreen.js:324-341).
- Permission states: spinner while 'not-determined' (ScanLabelScreen.js:178-184); "Camera access needed" with Open Settings / Allow camera plus "Type it in instead" (ScanLabelScreen.js:186-211); "No camera available" with "Type it in instead" (ScanLabelScreen.js:213-230).
NAVIGATION: Route "ScanLabel" in DiaryStack, headerShown false, presentation 'modal' (RootNavigator.js:246-250). Reached from ScanBarcode on a miss (navigation.replace('ScanLabel', { prefillBarcode }), ScanBarcodeScreen.js:122-124). It can also be a direct "snap a label" entry (no prefillBarcode, ScanLabelScreen.js:18-19) — NOT DETERMINED IN CODE which surface launches it without a barcode (no navigate('ScanLabel') call appears in the eight audited screens; the route is only entered via ScanBarcode's replace in this set). All exits go via navigation.replace('AddCustomFood', ...) (ScanLabelScreen.js:133, 148, 159, 172) or Close goBack (ScanLabelScreen.js:241).
GATING: PRO (inherited). DiaryStack only (RootNavigator.js:246); reached from the Pro-gated Diary domain via ScanBarcode. No own guard.
CURRENT STRENGTHS:
- Never dead-ends: a barcode heal always has a "Type it in" escape that keeps the barcode (ScanLabelScreen.js:310-316, 337-338).
- Two-step capture (name then panel) with a skippable name step (ScanLabelScreen.js:118-127, 165-169, 305-309).
- Graceful degradation: hides the shutter and offers manual entry when OCR isn't present (ScanLabelScreen.js:286-320).
- Offline-aware copy distinguishes "not in DB" from "couldn't check" (ScanLabelScreen.js:68-78, 273-283, 329-335).
- Camera pauses when unfocused/backgrounded (ScanLabelScreen.js:80-88, 232).
CURRENT WEAKNESSES:
- The arrival-choice overlay adds a decision step on top of an already two-step capture, then a third screen (AddCustomFood) — a long chain for one food (ScanLabelScreen.js:324-341 → capture → AddCustomFood).
- Two different "Type it in" affordances can both be visible (capture-row Type-it-in and the arrival card's Type-it-in) (ScanLabelScreen.js:312-316, 338).
- A capture failure silently advances or routes to manual with only the hint changing (ScanLabelScreen.js:153-162) — no explicit error toast.
NEWBIE QUESTION: Partially. "Front of pack (1 of 2)" / "Nutrition panel (2 of 2)" and the framed shutter guide the steps well, but understanding why two photos are needed, and the OCR "amber, check these" downstream, asks some patience of a beginner.
ATHLETE QUESTION: Yes. Snapping a label to capture an unknown product fast, with the barcode saved for next time, suits a competitor who eats varied packaged foods.
LOCATION QUESTION: Yes. As the second link of the barcode heal chain (reached from a ScanBarcode miss, ScanBarcodeScreen.js:122-124), it is in the right place; the direct-entry surface is unverified (see NAVIGATION).
VISUAL + USABILITY:
- Font sizes:
  - Header title: `type.title` => fontSize.lg (17) (ScanLabelScreen.js:354).
  - Choice title: `type.title` => fontSize.lg (17); choice body: fontSize.sm (13), lineHeight 20 (ScanLabelScreen.js:362-363).
  - Hint: `type.body` => fontSize.md (16) (ScanLabelScreen.js:371-373).
  - Miss title: `type.bodyStrong` => fontSize.md (16); miss body: fontSize.sm (13), lineHeight 20 (ScanLabelScreen.js:382-387).
  - Skip text: `type.body` => fontSize.md (16) (ScanLabelScreen.js:401).
  - Fallback title: `type.title` => fontSize.lg (17); fallback body: fontSize.md (16), lineHeight 22 (ScanLabelScreen.js:405-412).
- Touch targets:
  - Header X / torch: hitSlop 12 (ScanLabelScreen.js:241, 245) — OK.
  - Shutter (captureBtn): 72x72 (ScanLabelScreen.js:392-393) — good.
  - skipBtn ("Skip name" / "Type it in"): hitSlop 12, paddingVertical xs (4) + text 16 ≈ 24px visible, ~48px effective (ScanLabelScreen.js:306, 313, 400) — saved by hitSlop.
  - Choice / fallback buttons: Button component (size not measurable here) (ScanLabelScreen.js:203, 207, 337-338).
- Information density: Low-medium; full-bleed camera plus a banner/overlay and the capture row, or a single decision card.
- Clean vs cluttered: Mostly clean; the simultaneous miss banner + frame + capture row + (possible) arrival card is the busiest moment.
- Most important action prominence: The 72px amber shutter with a white ring is clearly the primary action (ScanLabelScreen.js:392-398); the arrival card's primary "Scan the label" is the first button (ScanLabelScreen.js:337). Appropriate.
- Device behaviour: Camera fills via absoluteFillObject in a flex:1 wrap with a true-black background (ScanLabelScreen.js:262-265, 365). Frame fixed 280x360 (ScanLabelScreen.js:367-368) — fits a 5.4" width (≈ up to ~320pt) but is tall; on a 5.4" the 360-tall frame plus banner plus bottom capture row may crowd vertically. captureRow is bottom-anchored (ScanLabelScreen.js:388-390). Scales acceptably, watch vertical crowding on the smallest device.

---

## Cross-screen notes (components referenced, not in scope but load-bearing for the above)
- ScreenHeader (DiaryScreen.js:505) and BackHeader (MyMealsScreen.js:152, MyRecipesScreen.js:144) render the visible screen titles; their exact font tokens are defined in `src/components/ScreenHeader.js` / `src/components/BackHeader.js` and were NOT read in this pass — title font sizes for those headers are NOT DETERMINED IN CODE here.
- FoodDetailSheet (the serving picker used by both the add and edit flows) lives at `src/components/food/FoodDetailSheet.js`; its "Add to diary" / "Save changes" button is `type`-free fontSize.md (16) bold on amber (FoodDetailSheet.js:263), the quantity input is fontSize.lg (17) (FoodDetailSheet.js:214), and the delete button is 44x44 (FoodDetailSheet.js:244-249). Meal-slot chips (mealBtn) have only paddingVertical sm (8) — FLAG < 44px (FoodDetailSheet.js:229-231).
- FoodRow (`src/components/food/FoodRow.js`) is the list row in FoodSearch: minHeight 56 (FoodRow.js:93); name fontSize.md (16) semibold, meta fontSize.sm (13) (FoodRow.js:95-97); + button hitSlop 12 (FoodRow.js:75).
