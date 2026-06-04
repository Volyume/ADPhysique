# Deep Feature Audit — Item 9: Diary tab (DiaryScreen)

**Document:** deep-audit-10-diary-tab.md
**Item:** 9 of master inventory (Group 2 — tab landings; `DiaryTab` / title "Diary")
**File:** `src/screens/DiaryScreen.js` (851 lines), components `MacroRings`, `MealSection`, `FoodDetailSheet`, `MacroBreakdownSheet`, `EmptyDiary`, `EntryRow`, libs `food/db`, `food/bulkEntryOps`, `food/mealSlots`, `cardio/cardioEngine`
**Status:** AWAITING APPROVAL
**Timestamp:** 2026-06-04

---

## STEP A — CURRENT STATE AUDIT

### What it is and what it does
The food diary. A `ScreenHeader` + a day pager (prev/next, "Today" pill, an
insights/export icon), macro rings (tap for a per-day breakdown), then either a
designed empty state (`EmptyDiary`) or a flexible numbered-meal ladder
("Meal 1..N" plus the two peri-workout slots, never shorter than the highest
logged meal, extendable via "Add meal"). Each `MealSection` supports search-add,
edit (`FoodDetailSheet`), swipe-delete, long-press multi-select. Below: a water
row (±250 ml) and, for Pro with cardio on, a cardio row. A barcode-scan FAB. In
selection mode a bottom toolbar offers Move / Copy-to-today / Save-as-meal /
Delete. The day's targets adapt to a macro cycle (training vs rest day) or a
refeed day; the rings read the effective target. All day-keys are the LOCAL
calendar day (TZ-1), matching the food/water/weight/workout buckets.

### Findings
1. **This is a strong, mature screen.** Recent redesign (2026-06-01). No dead
   styles (checked: 0 orphaned keys), eslint clean. Logging is search-first and
   fast, recently-logged items surface first (in the search screen), copy-
   yesterday and save-as-meal cut repeat-logging friction, and the optimistic
   water/selection flows feel immediate. This matches the 2026 best-practice bar
   almost exactly (see Step B).
2. **A11y: roles missing on controls that already have labels.** Several
   `TouchableOpacity`s carry an `accessibilityLabel` but no
   `accessibilityRole="button"`: the day-pager chevrons (`:476`, `:480`), the
   "Today" pill (`:470`), the insights icon (`:485`), the selection-bar actions
   (`:586`, `:591`, `:595`, `:599`, `:603`), and the water ± buttons (`:724`,
   `:727`, which have neither). A screen reader still reads the inner
   text/label, but they aren't announced as buttons. The scan FAB, the add-meal
   row, the move-picker options and the cardio row DO have roles, so this is a
   consistency gap on the secondary controls, not a systemic miss.
3. **Hardcoded water target (3.0 L).** `WATER_TARGET_ML = 3000` (`:675`) with a
   comment that a per-user water target is a flagged follow-up. 3 L is a
   defensible default but isn't personalised (body weight / climate / training
   load all move it). Documented TODO, not a bug.
4. **Double load on mount.** `useFocusEffect(load)` and `useEffect(load)` both
   fire (`:160-161`); on first mount both run, so the day's reads happen twice.
   Harmless (idempotent reads, fast SQLite) but a tiny redundancy.
5. **Copy is on-voice.** Terse, plain, British ("litres"), no em dashes, no AI
   tells. Error toasts follow the house shape ("Couldn't save. Try again.").
   Nothing to rewrite.

### Design assessment (values cited)
- On-system throughout: `surface`/`surface2`, single amber accent (rings, FAB,
  water fill, cardio icon), `circle`/`shadow`/scale tokens. One amber FAB (the
  scan affordance) is the brand affordance, not decoration. The selection
  toolbar is a contextual bottom bar, the day pager is a secondary row under the
  shared header so Diary now matches Train/Plans/Progress/You. This reads as a
  tool a lifter built, not a template.

### Flow / integration assessment
- Adds route to `FoodSearch`/`ScanBarcode` with the slot + date; edits go through
  `FoodDetailSheet` → `updateFoodEntry`; bulk ops through `food/bulkEntryOps`;
  rollups via the DB trigger. Macro-cycle/refeed resolution is memoised and reads
  cleanly. Cardio row self-loads on focus. Solid, well-guarded, idempotent.

---

## STEP B — RESEARCH (live web, 2026-06-04)

- **Friction, not motivation, is the barrier.** Users who spend >10 min/day
  logging are 2.4× more likely to quit within 30 days; sub-5-minute logging
  keeps people in. Volyume's search-first add, recently-logged-first, copy-
  yesterday and save-as-meal all target exactly this. [BiteKit; Welling]
- **One-tap quick logging + clean daily view + colour-coded macro rings** are the
  modern bar. Volyume has the rings and a clean day view; its quick paths are
  copy-yesterday and saved meals. [Welling; FuelNutrition]
- **Recently-logged-first search** speeds repeat meals — a named best practice
  Volyume already follows. [Welling]

---

## STEP C — COMPARISON

### Where Volyume leads
- A genuinely low-friction diary with flexible numbered meals (not the rigid
  breakfast/lunch/dinner box), multi-select bulk tools, save-as-meal, copy-
  yesterday, macro-cycle/refeed-aware targets, and TZ-correct local days. That
  macro-cycle/refeed awareness in the day view is ahead of most mainstream
  trackers. [Welling; FuelNutrition]

### Where Volyume lags
- Minor a11y role gaps on secondary controls (finding 2).
- A non-personalised water target (finding 3, documented).
- It has no photo/voice "describe what you ate" quick-log, which some 2026 apps
  now lead on — but that is a roadmap-scale feature, out of scope for a polish
  audit, and Volyume's search-first + saved-meals path is a sound alternative.
  Flagging for awareness only. [BiteKit]

### Critical gaps
- None. The screen is strong; the items are a11y polish and one documented TODO.

---

## STEP D — PROPOSAL

### Summary
Light, low-risk polish on an already-strong screen: add the missing
`accessibilityRole="button"` to the secondary controls that already carry
labels (and labels to the water ± buttons), and flag the water-target and
photo/voice-logging items for your roadmap call. No behaviour, data, or copy
change.

### Specific changes — one by one

**1. Add a11y roles to the secondary controls. [A11y — Low] — `:470`, `:476`,
`:480`, `:485`, `:586`, `:591`, `:595`, `:599`, `:603`, `:724`, `:727`**
- What: `accessibilityRole="button"` on the day-pager chevrons, the Today pill,
  the insights icon, and the selection-bar actions (all already labelled); add
  both role and an `accessibilityLabel` ("Add water" / "Remove water") to the
  water ± buttons.

**2. (Flag — no code) Per-user water target.** The 3 L default is fine to ship;
flagging that a per-user target is the documented follow-up if you want it
prioritised. Your call.

**3. (Flag — no code, roadmap) Photo/voice quick-log.** Some 2026 trackers lead
on "describe/snap your meal". Out of scope here; noting it as a competitive
signal, not proposing it.

### COPY CHANGES
None. On-voice and terse.

### What to keep (with evidence)
- Search-first add, recently-logged-first, copy-yesterday, save-as-meal (the
  anti-friction core). [BiteKit; Welling]
- The flexible numbered-meal ladder, multi-select bulk tools, macro-cycle/refeed
  day awareness, TZ-correct local days, the single scan FAB, and the contextual
  selection toolbar.

### IMPACT / EFFORT
- **Impact: Low** (a11y polish on an already-strong screen).
- **Effort: Low.** Attribute-only changes; no behaviour, data, or navigation
  change.

### SOURCES
- BiteKit — Simple food journal apps 2026:
  https://bitekit.app/blog/simple-food-journal-app/
- Welling — Best food diary apps 2026:
  https://www.welling.ai/articles/best-food-diary-apps-2026
- FuelNutrition — Best macro tracking apps 2026:
  https://fuelnutrition.app/blog/best-macro-tracking-apps
