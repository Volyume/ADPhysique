# Deep Feature Audit — Item 26: Food Search screen

**Document:** deep-audit-27-food-search.md
**Item:** 26 of master inventory (screen #24 — `FoodSearchScreen`; Diary sub-stack, the food picker modal)
**File:** `src/screens/FoodSearchScreen.js` (841 lines) + `src/components/food/FoodRow.js` (used only by this screen), components `FoodDetailSheet`, `QuickAddSheet`, `SkeletonRow`, libs `food/db`, `food/waterfall`, `food/searchTabs`, `food/mealSuggest`, `food/curatedMeals`, `food/frequents`, `database`
**Status:** IMPLEMENTED (approved 2026-06-04, "Approve"). Added `accessibilityRole="button"` (and a label where icon-only) to the controls that lacked it: the header close X, the Custom-tab CTA rows, both "Create a custom food" buttons, the plate-modal Clear / Log / close / remove controls, and the `FoodRow` main row; hid the decorative non-interactive add icon (recipe-pick mode) from the screen reader. Attribute-only; no behaviour, layout, or copy change.
**Timestamp:** 2026-06-04

---

## STEP A — CURRENT STATE AUDIT

### What it is and what it does
The food picker between the Diary "Add food" tap and the log write. Header
(close X, quick-add, scan barcode), 5 browse tabs (Recents / Suggested /
Favourites / Frequents / Custom), a 250ms-debounced waterfall search (local
cache → OFF → USDA, fires at 2+ chars), a **multi-add plate** with a double-log
guard (`CALC-3`), **quick-add** calories, curated meal suggestions sized to the
macros left today, recipe-pick mode (hands a picked food back to the recipe
builder instead of logging), scanned-food auto-open, and a custom-food fallback.
Long-press a row to cycle favourite / exclude with toast feedback.

The screen was **already largely accessible**: the quick-add and scan buttons
are labelled, the tabs use `role="tab"` + selected state, and the suggested
cards and the plate bar carry roles and labels.

### Findings
1. **Strong, fast logging flow.** The plate multi-add + quick-add + barcode set
   is exactly what the speed-focused trackers optimise for (logging speed drives
   adherence). Clean: **no dead styles, 0 em dashes, all colour via tokens.** No
   functional bugs — the `CALC-3` double-log guard, the debounced waterfall, and
   lazy per-tab loading (Frequents/Suggested only load when opened) are sound.
2. **A11y: a few role/label gaps remained.** The **header close X was icon-only
   with no role or label** (priority — a picker/modal close should be a labelled
   button). Missing `accessibilityRole="button"` on: the Custom-tab CTA rows, both
   "Create a custom food" buttons (empty-state + footer), and the plate-modal
   Clear / Log / close / remove controls (close and remove already had labels).
   The shared `FoodRow` main row had a good composed label (incl. the long-press
   behaviour) but no `role="button"`, and in recipe-pick mode rendered a
   non-interactive `add-circle-outline` icon that still read to the screen reader.
3. **Copy is clean.** Empty states already pair a message with a real CTA where
   it counts ("No matches… → Create a custom food", "Set your daily targets to
   get meal ideas"). Nothing to reword.

### Design assessment (values cited)
- On-system: `inputBg` search field, `surface` suggest cards with a 3px amber
  `primary` left border (brand affordance, not decoration), `primary` for the
  add/scan/quick-add affordances and primary buttons, `scrim` plate backdrop,
  scale tokens. The Custom-tab CTA rows are functional nav, not filler. No
  fingerprints.

### Flow / integration assessment
- Search is decoupled from the active browse tab (any tab + a 2+ char query runs
  the waterfall; Suggested has no search box). Logging paths: detail sheet →
  `logFoodEntry`; plate → fan to `logFoodEntry` behind the in-flight guard;
  quick-add → `quick:adhoc`; curated meal → `applyCuratedMealToDiary`; recipe
  mode → hand the ingredient back. Scanned food auto-opens the sheet then clears
  the param. Sound throughout.

---

## STEP B — RESEARCH (live web, 2026-06-04)

- Logging speed is the retention lever: MacroFactor's Food Logging Speed Index
  counts discrete actions per entry, and **multi-add / quick-add / barcode** are
  the levers that cut them; saved seconds compound across daily logging. Volyume
  implements all three. [MacroFactor; NutriScan]
- A modal/dialog close must be a **visible, labelled element with button role**
  ("Close"); an icon-only close with no accessible name is the named gap behind
  finding 2. [Harvard HUIT; W3C APG Dialog pattern]

---

## STEP C — COMPARISON

### Where Volyume leads
- The plate multi-add + quick-add + macro-sized curated suggestions is
  competitive with the fastest loggers, and the curated-meal "sized for this
  meal" hint is a nicety the mainstream trackers do not show. [MacroFactor]

### Where Volyume lags
- The a11y role/label gaps (finding 2), the header close the priority.

### Critical gaps
- None functional.

---

## STEP D — PROPOSAL (as implemented)

### Specific changes — one by one

**1. Header close X.** `accessibilityRole="button"` + `accessibilityLabel="Close"`.
[A11y — Low, priority]

**2. Role on the remaining controls.** `accessibilityRole="button"` on the
Custom-tab CTA rows (labelled from their text), the empty-state and footer
"Create a custom food" buttons, and the plate-modal Clear / Log / close / remove
controls. [A11y — Low]

**3. `FoodRow`.** `accessibilityRole="button"` on the main row (label already
composed); the decorative non-interactive add icon (recipe-pick mode) hidden via
`importantForAccessibility="no"` + `accessibilityElementsHidden`. [A11y — Low]

### COPY CHANGES
None. The screen's copy is already clean and CTA-complete.

### What to keep (with evidence)
- The 5-tab browse, the waterfall search, the plate multi-add, quick-add, the
  macro-sized curated suggestions, and the custom-food fallback. [MacroFactor;
  NutriScan]

### IMPACT / EFFORT
- **Impact: Low–Medium.** A11y completion; the unlabelled header close was the
  one real screen-reader blocker for dismissing the picker.
- **Effort: Low.** Attribute-only across the screen and its row component. eslint
  0 problems; `foodComponents` suite green (34 tests). FoodSearch is a modal that
  needs route params, so it is not in the screen-mount sweep; the component suite
  is the relevant gate.

### SOURCES
- MacroFactor vs MyFitnessPal 2025 (Food Logging Speed Index):
  https://macrofactor.com/macrofactor-vs-myfitnesspal-2025/
- NutriScan — MacroFactor vs MyFitnessPal logging speed:
  https://nutriscan.app/blog/posts/macrofactor-vs-myfitnesspal-2026-93f2aa703e
- Harvard HUIT — Accessible modal dialogs:
  https://accessibility.huit.harvard.edu/technique-accessible-modal-dialogs
- W3C APG — Dialog (Modal) pattern:
  https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/
