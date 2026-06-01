Status: COMPLETE | Timestamp: 2026-06-01 | Phase 1: Internal audit

# Diary tab internal audit (from the code)

Every claim below is from the code at commit `191b788`. Files cited inline.

## 1. File inventory

- `src/screens/DiaryScreen.js` (the screen: header, day pager, summary, meal
  sections, water row, FABs, copy-yesterday, selection mode, edit/breakdown
  sheets, save-as-meal and move modals). 777 lines.
- `src/components/food/MacroRings.js` (calorie ring + 3 macro sub-rings + the
  remaining/over readout + day-type chip). Skia-drawn.
- `src/components/food/MealSection.js` (one meal section: label, kcal total,
  entry rows, dashed "Add food" row).
- `src/components/food/EntryRow.js` (a logged item row + `SwipeableEntryRow`
  swipe-to-delete + `friendlyFoodName`).
- `src/components/food/EmptyDiary.js` (a single line of empty-day text).
- `src/components/food/MacroBreakdownSheet.js` (per-meal breakdown bottom
  sheet, opened by tapping the rings when entries exist).
- `src/components/food/FoodDetailSheet.js` (edit-entry sheet: quantity, slot,
  date).
- Supporting, reached from the add/scan flows rather than rendered on the
  diary itself: `QuickAddSheet.js`, `ServingPicker.js`, `SourceChip.js`,
  `FoodRow.js`, `HeldDecisionCard.js`.
- Shared: `src/components/ScreenHeader.js`, `src/components/Toast.js`,
  `src/components/AnimatedEntrance.js`.
- Tokens: `src/styles/theme.js`.
- Data: `src/lib/food/db.js` (entries, rollup, water, saved meals),
  `src/lib/food/sources/localCache.js` (`resolveFoodRef`),
  `src/lib/database.js` (`getNutritionTargets`, `hasWorkoutOnDate`,
  `getFirstWorkoutDateOnOrAfter`), `src/lib/food/bulkEntryOps.js`.

## 2. What is displayed, top to bottom (DiaryScreen.js:419-488)

1. `ScreenHeader title="Diary"` (`:426`). The standard tab header, shared with
   Train/Plans/Progress/You.
2. Day pager row (`:432-458`): a left slot holding a "Today" pill that appears
   only when the viewed day is not today (`:434-438`); a centre group of
   chevron-back / date label / chevron-forward (`:440-448`); a right
   stats-chart icon to `FoodInsights` (`:449-457`). Date label uses
   `friendlyDate` -> Today / Yesterday / Tomorrow / "Mon, 2 Jun"
   (`:59-68`).
3. The summary card, `MacroRings` (`:460-467`), tappable to the breakdown sheet
   only when entries exist (`onPress={entries.length ? ... : undefined}`).
4. Six meal sections (`:469-483`), each wrapped in `AnimatedEntrance` (a
   staggered entrance by index), rendered from `MEAL_SLOTS`.
5. `WaterRow` (`:485`), defined inline at `:629-648`.
6. `EmptyDiary` text, but only when `entries.length === 0` (`:487`), rendered
   AFTER the water row.

Floating, outside the scroll view:
- Scan FAB (`:511-521`), a 56px amber circle, barcode icon, -> `ScanBarcode`.
- Copy-yesterday FAB (`:527-538`), a pill stacked above the scan FAB, shown
  only when `entries.length === 0`.
- Selection toolbar (`:540-565`) when in multi-select.
- Move-to and Save-as-meal modals (`:567-624`).

## 3. Meal sections (MealSection.js, DiaryScreen.js:40-47)

- Six fixed slots: Breakfast, Lunch, Dinner, Pre-workout, Post-workout, Snacks
  (`DiaryScreen.js:40-47`). Not configurable, not reorderable, not collapsible.
  All six always render, on every day, empty or not. (The file header comment
  at `DiaryScreen.js:7` still says "four meal sections" and is stale.)
- A section (`MealSection.js:12-39`) is NOT a card. It is a bare header row
  (uppercase label + "{kcal} kcal" total, `:14-17`), then the entry rows, then
  an always-present dashed "Add food" button (`:30-37`). There is no surface,
  border or background around the section. The only structure is
  `marginBottom: spacing.lg` (`:43`).
- The section total is calories only (`slotKcal`, `:11`). No per-section macro
  split, no item count.
- The dashed "Add food" row (`:50-56`: `borderStyle: 'dashed'`,
  `borderColor: colors.border`, `minHeight: 48`) is shown in every section
  whether or not it has entries. On an empty day this is the six identical
  dashed boxes the brief calls out. On a logged day the dashed box still sits
  under every section.
- Pre-workout and Post-workout are plain slots. They get no training context:
  the screen already computes `isTrainingDay` (`:87`, `:123`) for the macro
  cycle, but the meal sections never use it, and there is no link to the day's
  workout. On a rest day the two workout slots still render identically.

## 4. Logged food item display (EntryRow.js)

- Each entry is its OWN bordered card: `backgroundColor surface`, `border`,
  `radius.md`, `marginBottom: spacing.sm` (`:96-104`). So a populated section is
  a floating label over a stack of separate bordered cards over a dashed box,
  three different container treatments in one section.
- Left: food name (`md medium`, `:120`), brand if present (`xs muted`, `:121`),
  grams (`xs muted`, `:122`). Right: "{kcal} kcal" (`md semibold`, `:124`) and a
  macro line "{p}P {c}C {f}F" (`xs muted`, `:125`).
- Swipe left reveals a 90px red Delete (`:62-72`, `:126-134`); tap opens the
  edit sheet; long-press enters multi-select (`:28-32`).

## 5. Calorie and macro display (MacroRings.js)

- A Skia card (`:170-176`, surface, border, `radius.lg`, `padding lg`).
- Optional day-type chip: "Training day" / "Rest day" / "Refeed day"
  (`:126-130`, value from `DiaryScreen.js:151-155`).
- Calorie ring 132px / 14px stroke (`:6-7`, `:133-139`) with the consumed value
  as a hero numeral (`fontSize 34`, `:188-195`) and "of {target}" beneath; to
  its right a large remaining / over readout (`:149-158`).
- Three macro sub-rings (44px) for Protein / Carbs / Fat, each with
  "{value}/{target}g" (`:64-86`, `:160-164`).
- Colour is adherence-NEUTRAL by deliberate design: `bandColour()` always
  returns `colors.primary`, never green-for-good or red-for-over (`:18-20`,
  comment `:11-17`). This is a locked eating-disorder-safety decision and any
  redesign must keep it.
- Targets come from `getNutritionTargets` (`DiaryScreen.js:98`), overridden by a
  carb cycle (training/rest day) or a refeed day (`:134-149`).

## 6. Water tracker (DiaryScreen.js:629-648, :754-767)

- A single row card (`waterRow`: surface, border, `radius.lg`), an icon +
  "Water" + "{ml} ml | {glasses} glasses", and minus / plus buttons.
- Fixed 250 ml increments (`logWaterDelta(250)` / `(-250)`, `:485`, `:346-350`),
  glasses = `round(ml / 250)` (`:630`).
- Stored via `setWater(userId, date, ml)` / read via `getWater` (`:23`, `:97`).
- No target, no goal, no progress indicator. It is the one place on the screen
  that does not use the ring language the macros use, and it sits between the
  meal sections and the empty-state text.

## 7. Barcode scanner (DiaryScreen.js:511-521)

- The scan FAB navigates to `ScanBarcode` with the current `entryDate`. After a
  scan the result flow lives in that screen, not the diary. On the diary the
  scanner is only the FAB.

## 8. Copy yesterday (DiaryScreen.js:378-417, :527-538)

- A pill FAB shown only on an empty day (`entries.length === 0`, `:527`). Reads
  yesterday's entries and, on confirm, replays them into today at the same meal
  slots via `logFoodEntry` (`:398-411`). If yesterday is empty it toasts
  "Nothing logged yesterday to copy." It deliberately hides once today has
  entries, so it is unavailable mid-day.

## 9. Date navigation (DiaryScreen.js:432-458, :175-177)

- Chevron back / forward only. No swipe gesture, no week strip, no calendar.
  Future dates are unbounded (`gotoTomorrow` has no cap). A past or future day
  renders exactly like today (same sections, same summary) with the date label
  and the "Today" pill as the only cues that you have moved off today.

## 10. Empty state (DiaryScreen.js:469-487, EmptyDiary.js)

On a day with nothing logged the screen shows: the header, the day pager, the
rings card reading 0 against the targets, the six meal sections (each = an
uppercase label + "0 kcal" + a dashed Add box), the water row at 0, and then
the `EmptyDiary` line of text at the very bottom (`:487`). `EmptyDiary`
(`EmptyDiary.js:19-25`) is a single centred sentence: "No food logged yet. Tap a
meal slot above to start. Or use Scan to grab something from a barcode." It has
no icon, no illustration, no card. It is also redundant with, and physically
separated from, the six dashed boxes it refers to (it sits below the water
row, they are above it). DiaryScreen also carries an UNUSED `empty` /
`emptyTitle` / `emptyBody` style block (`:769-775`) that nothing renders.

## 11. Tokens and consistency (theme.js)

- Spacing 2/4/6/8/12/16/24/32/48; radius 4/6/10/14/20/999; fontSize
  10/11/13/16/17/20/24/32/40; semantic `type` roles (display/h1/h2/h3/title/
  body/bodyStrong/label/caption); colours locked on `#0D0D0D` background,
  `#191917` surface, amber `#F5A623` primary (`theme.js:18-46`, `:107-167`).
- The Diary mixes the semantic `type` roles (`type.title`, `type.label`,
  `type.body` in DiaryScreen) with raw `fontSize`/`fontWeight` pairs
  (MealSection, EntryRow, MacroRings, WaterRow). The card components do not all
  use the same elevation: the rings card and water row are `surface`+border;
  meal sections have no container; entry rows are `surface`+border each.

## 12. Animations and interactions

- `AnimatedEntrance` staggers the six sections in on load (`:470`).
- Swipe-to-delete on entries; long-press to multi-select; pull-to-refresh
  (`:424`); the rings card scales slightly on press (`activeOpacity 0.9`).
- No shared-element transition to the search/scan screens, no count-up on the
  calorie number, no haptic or animated feedback when an entry lands or when a
  target is hit.

## 13. Settings that affect the Diary

- `macroCycle` and `refeed` from the user profile change the effective targets
  and add the day-type chip (`:71-75`, `:134-155`).
- `getNutritionTargets` supplies the base targets.
- No diary-specific preferences (meal-slot names, water target, units) exist.

## 14. Honest design weaknesses (specific, cited)

1. The six dashed "Add food" boxes (`MealSection.js:50-56`) are the dominant
   visual on an empty day and read as unfinished. The dashed treatment also
   repeats under every populated section.
2. Meal sections have no container (`MealSection.js:43`), so the screen is a
   long single column of bare labels, bordered item cards, and dashed boxes,
   with no grouping. The water row and the rings card ARE cards, so the page
   has inconsistent containment.
3. Three different container styles stack inside one populated section (bare
   label, per-item bordered cards, dashed box). Item rows as individual
   bordered cards (`EntryRow.js:96-104`) fragment the list.
4. The empty state is split in two: six dashed boxes near the top and a lone
   sentence at the very bottom (`DiaryScreen.js:487`) that points back up at
   them. Neither is inviting; there is no illustration, no targets-in-context,
   no training-day cue.
5. The water row (`:754-767`) is a different visual idiom from everything else:
   text and stepper buttons, no ring, no target, dropped between the meals and
   the empty text.
6. Pre-workout and Post-workout are inert slots; the training context the app
   already knows (`isTrainingDay`) is not used and there is no link to the
   day's session.
7. All six sections always render, including both workout slots on rest days,
   which is avoidable clutter.
8. Copy-yesterday is only reachable on a fully empty day (`:527`) and is a
   second stacked FAB, which crowds the bottom-right and removes the action the
   moment the user logs anything.
9. The section total is kcal only (`MealSection.js:11`); a physique user
   tracking protein gets no per-meal macro readout without opening the
   breakdown sheet.
10. Typography is applied inconsistently (semantic roles in some components,
    raw size/weight pairs in others), and there are dead `empty*` styles
    (`DiaryScreen.js:769-775`) and a stale "four meal sections" comment
    (`:7`).

## 15. What is already good (keep)

- The `MacroRings` summary is strong: a clear hero calorie ring, a remaining
  readout, three macro rings, the day-type chip, and a careful accessibility
  summary (`MacroRings.js:106-114`).
- Adherence-neutral colour is a deliberate, locked safety choice and reads
  calm.
- Swipe-delete, multi-select, move-to-slot, save-as-meal and copy-to-today are
  capable bulk tools.
- The header now matches the other tabs (`ScreenHeader`), and the day pager is
  clear.
