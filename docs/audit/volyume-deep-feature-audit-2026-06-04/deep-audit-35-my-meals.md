# Deep Feature Audit — Item 34: My Meals screen

**Document:** deep-audit-35-my-meals.md
**Item:** 34 of master inventory (screen #32 — `MyMealsScreen`; Diary sub-stack, saved-meals list modal)
**File:** `src/screens/MyMealsScreen.js` (232 → 240 lines), components `BackHeader`, `SkeletonRow`, libs `food/db` (`listSavedMeals`, `applySavedMealToDiary`, `renameSavedMeal`, `deleteSavedMeal`)
**Status:** IMPLEMENTED (approved 2026-06-04, "Yes do it"). Gave the meal row a button role, a "Log {name}" label, and a long-press hint; labelled the rename `TextInput`; gave the rename modal's Cancel/Save a role; and folded in the loading-skeleton consistency fix (blank → three `SkeletonRow`s, matching My Recipes). Attribute-only plus the skeleton; no behaviour or copy change.
**Timestamp:** 2026-06-04

---

## STEP A — CURRENT STATE AUDIT

### What it is and what it does
The user's saved meals (named bundles of foods). Tap a row to log the whole
bundle to the slot/date the screen was opened with, behind a confirm showing how
many foods go where; long-press for a rename/delete menu; a rename modal. Create
happens elsewhere (the diary multi-select "Save as meal"). Honest delete copy
("Anything you already logged from it stays in your diary.").

### Findings
1. **Clean and well-built.** Saved-meal one-tap logging is the efficiency feature
   the sources call critical, and the "Adds N foods to {slot}" confirm is a nice
   touch. Clean: **no dead styles, no em dashes, tokens throughout**; `BackHeader`
   back is already accessible.
2. **A11y gaps (a bit more than My Recipes).** The meal **row had no role, label,
   or hint** — announced only as raw text, not a "button", and its long-press
   rename/delete menu was undiscoverable (priority). The **rename `TextInput`** had
   only a placeholder, no `accessibilityLabel`. The modal **Cancel/Save** had no
   role.
3. **Minor inconsistency.** While loading, the screen rendered nothing (blank),
   whereas My Recipes shows a `SkeletonRow`.

### Design assessment (values cited)
- On-system: plain bordered rows with the `primary` add-affordance, `scrim`
  modal backdrop, `surface` rename card, scale tokens. No decorative icons beyond
  the add affordance. No fingerprints.

### Flow / integration assessment
- `useFocusEffect` reloads on focus. Tap → confirm → `applySavedMealToDiary`
  (fans the bundle to the slot) → back; zero-food meals surface a toast.
  Long-press → rename (modal) or delete (nested confirm). Sound.

---

## STEP B — RESEARCH (live web, 2026-06-04)

- Saving a meal for **one-tap re-logging** is a critical efficiency feature ("you
  eat the same breakfast 80% of the time"); Volyume has it. [Fitia]
- A hidden long-press menu needs an `accessibilityHint`, and a form input needs an
  `accessibilityLabel` (the visible title is not associated). [prior RN a11y
  research]

---

## STEP C — COMPARISON

### Where Volyume leads
- Saved-meal bundle logging with the honest "N foods to {slot}" confirm.

### Where Volyume lags
- The row's missing role/label/hint, the unlabelled rename input, and the modal
  button roles (all fixed); a blank loading state (now a skeleton).

### Critical gaps
- None functional.

---

## STEP D — PROPOSAL (as implemented)

### Specific changes — one by one
1. **Meal row.** `accessibilityRole="button"` + `accessibilityLabel={`Log
   ${item.name}`}` + `accessibilityHint="Long press to rename or delete"`. [A11y — Low]
2. **Rename `TextInput`.** `accessibilityLabel="Meal name"`. [A11y — Low]
3. **Modal Cancel + Save.** `accessibilityRole="button"`. [A11y — Low]
4. **Loading skeleton (folded in).** Blank → three `SkeletonRow`s, matching My
   Recipes. [Consistency — Low]

### Flagged for the founder (not coded)
- The rename/delete is long-press-only with no visible alternative, so motor/switch
  users cannot reach it even with the hint (same as My Recipes). [prior research]

### COPY CHANGES
None.

### What to keep (with evidence)
- The bundle-log confirm, the rename modal, and all copy. [Fitia]

### IMPACT / EFFORT
- **Impact: Low–Medium.** The row was announced only as plain text with a hidden
  menu; it is now a labelled button with the long-press action announced.
- **Effort: Low.** Attribute-only plus the skeleton. eslint 0 problems; not in
  the screen-mount sweep (modal), so lint is the gate.

### SOURCES
- Fitia — best food tracking apps (saved meals / one-tap logging):
  https://fitia.app/learn/article/best-food-tracking-apps-weight-loss/
- React Native — Accessibility (label / hint):
  https://reactnative.dev/docs/accessibility
