# Deep Feature Audit — Item 32: Food Insights screen

**Document:** deep-audit-33-food-insights.md
**Item:** 32 of master inventory (screen #30 — `FoodInsightsScreen`; food/nutrition insights, reached via a header button on Diary)
**File:** `src/screens/FoodInsightsScreen.js` (280 → 281 lines net), local `AdherenceRow` / `within`, components `Card`, libs `food/db` (`getRollupsForRange`, `getFoodEntriesForRange`), `food/csvExport`, `database` (`getNutritionTargets`), `dayKey`
**Status:** IMPLEMENTED (approved 2026-06-04, "Approve and extra"). Added a role + label to the icon-only header close; gave the export button a role + disabled state; made each calorie bar and each adherence row a single accessible element with a composed label (announcing the colour-only "on target" state); and removed the redundant second `load()` effect (the approved extra). Attribute + a dead-effect removal; no behaviour-visible or copy change.
**Timestamp:** 2026-06-04

---

## STEP A — CURRENT STATE AUDIT

### What it is and what it does
A 7-day food adherence view: kcal-vs-target horizontal bars (a bar turns green
when within 10% of target), a macro adherence card (Calories / Protein / Carbs /
Fat hit-rate as "X/Y days"), and a CSV export of the diary for the window.

### Findings
1. **Clean, correct weekly-trend view.** Exactly the high-value pattern the
   sources name (weekly trend + adherence rate). Dates use the TZ-1 local-day
   helpers (`localDayKey` / `parseLocalDay` + `en-GB`), so the 7-day window is the
   **UK local calendar**. Two-card layout (not a forced three), `colors.success`
   for the on-target state (CVD-palette aware), honest empty states. Clean: **no
   dead styles, no em dashes, all colour via tokens**, terse on-voice copy.
2. **A11y gaps.** The **header close X was icon-only with no role or label**
   (priority). The export button had a good label but no role. The charts read as
   fragmented nodes — each calorie bar was "Mon" + an unlabelled bar + "2100" as
   separate elements, and the **"green = within 10%" cue was colour-only** (in a
   footnote, but never announced per bar). Same for the adherence rows.
3. **Redundant double-load.** `load()` was called by both `useFocusEffect` and a
   `useEffect` on mount, so it ran twice on entry. Harmless, but the `useEffect`
   was redundant (and pulled in the only `useEffect` import).

### Design assessment (values cited)
- On-system: `Card` surfaces, `surface2` bar tracks, `primary` fills, `success`
  for the on-target bar, uppercase `textSecondary` section labels, scale tokens.
  Two cards + an export button, no forced symmetry, no decorative icons beyond the
  export glyph. No fingerprints.

### Flow / integration assessment
- The window is built once (`useMemo`) as seven local day-keys; rollups + targets
  load on focus; adherence is computed against per-macro tolerances (kcal/protein
  10%, carbs/fat 15%) over logged days only. Export pulls entries for the range
  and writes CSV with empty/error toasts. Sound.

---

## STEP B — RESEARCH (live web, 2026-06-04)

- Weekly **trend + adherence-rate** views are the most valuable nutrition insight;
  clean kcal/macro charts are the bar, and Volyume matches it. [Fuel Nutrition;
  MacroFactor]
- Chart screen-reader support is a broad industry gap; giving each bar a composed
  text label makes the trend usable non-visually, which is the basis for the
  finding-2 chart-labelling fix. [research note]

---

## STEP C — COMPARISON

### Where Volyume leads
- A local-day 7-day view + macro hit-rate + CSV export, with honest "set a target
  to unlock colours" empty states.

### Where Volyume lags
- Control roles, the colour-only on-target cue, and the fragmented chart a11y (all
  fixed).

### Critical gaps
- None functional.

---

## STEP D — PROPOSAL (as implemented)

### Specific changes — one by one
1. **Header close X.** `accessibilityRole="button"` + `accessibilityLabel="Close"`.
   [A11y — Low, priority]
2. **Export button.** `accessibilityRole="button"` +
   `accessibilityState={{ disabled: exporting }}` (label already present). [A11y — Low]
3. **Calorie bars.** Each row is now a single accessible element with a composed
   label, e.g. `"Mon, 2100 kcal, on target"` — the suffix announces the green
   state non-visually. [A11y — Low]
4. **Adherence rows.** Composed label, e.g. `"Protein, hit 3 of 5 days"`. [A11y — Low]
5. **Dead-effect removal (approved extra).** Dropped the redundant `useEffect`
   load (and the now-unused `useEffect` import); `useFocusEffect` covers mount.
   [Cleanup — Low]

### COPY CHANGES
None to on-screen copy. The composed strings are accessibility labels.

### What to keep (with evidence)
- The two-card layout, the bars, the macro hit-rate, CSV export, and all copy.
  [Fuel Nutrition; MacroFactor]

### IMPACT / EFFORT
- **Impact: Low–Medium.** The header close was the blocker; labelling the bars
  makes the chart usable to a screen reader and surfaces the on-target state that
  was colour-only.
- **Effort: Low.** Attribute-only plus a dead-effect removal. eslint 0 problems
  (confirms the import cleanup); csvExport suite green (9). Not in the
  screen-mount sweep (header-button modal); lint is the gate.

### SOURCES
- Fuel Nutrition — best macro tracking apps (weekly trend insight):
  https://fuelnutrition.app/blog/best-macro-tracking-apps
- MacroFactor — smart macro tracker (weekly trend + adherence):
  https://macrofactor.com/macrofactor/
