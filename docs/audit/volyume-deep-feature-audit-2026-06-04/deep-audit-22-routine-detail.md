# Deep Feature Audit — Item 21: Routine Detail screen

**Document:** deep-audit-22-routine-detail.md
**Item:** 21 of master inventory (screen #18 — `RoutineDetailScreen`; Plans stack, edit a routine/day)
**File:** `src/screens/RoutineDetailScreen.js` (859 lines, two StyleSheets: `styles` + `tagStyles`), components `Button`, `ExercisePickerModal`, libs `swapEngine`, `whyThisTemplates`
**Status:** AWAITING APPROVAL
**Timestamp:** 2026-06-04

---

## STEP A — CURRENT STATE AUDIT

### What it is and what it does
The routine editor. A "Start This Workout" button, a **muscle-coverage** chip row
(per-muscle exercise counts, colour-graded, with smart balance warnings, e.g.
"No hamstring work. Consider adding an RDL or leg curl."), and a split rationale
line; then the exercise list — each card shows order, name, sets/reps/rest/start-
weight, muscle, and a "why this" line, with per-card Edit / Swap / Remove icon
buttons (or Move up/down in reorder mode, toggled from the header). Tapping a card
opens the edit sheet (sets / reps-min / reps-max / rest / start weight); an
unresolved (broken-FK) row instead opens the swap modal to re-link it. Swap shows
ranked substitutes with a "search all / create your own" escape hatch. Add and
swap-all both use the shared `ExercisePickerModal`.

### Findings
1. **Strong, full-featured editor.** It matches the standard add/remove/swap/
   reorder + per-exercise sets-reps-rest pattern (Step B), and goes beyond with
   muscle-coverage balance warnings (a differentiator the sources don't list),
   per-exercise "why this", a split rationale, and graceful re-link recovery for
   broken-FK rows from the pre-deterministic-ID sync era. eslint clean, 0 em
   dashes.
2. **7 dead picker styles.** `pickerSafe`, `pickerHeader`, `pickerSearch`,
   `pickerClose`, `pickerItem`, `pickerItemName`, `pickerItemMuscle` are orphaned
   from a removed inline picker (the screen now uses the shared
   `ExercisePickerModal` for both Add and Swap-all). Verified across both
   StyleSheets (0 `styles.X`/`tagStyles.X` refs).
3. **A11y: inconsistent and incomplete (0 `accessibilityRole` across 29
   controls).** The icon-only **Edit** (`:395`) and **Remove** (`:408`) buttons
   have neither role nor label (the worst case — no text fallback). Reorder
   up/down (`:366`, `:379`) and Swap (`:401`) have labels but no role. Also
   missing: the header Reorder/Done toggle (`:121`), the tappable exercise card
   (`:307`, opens edit/re-link), the Add Exercise footer (`:426`), the edit-sheet
   Save (`:512`), and the swap-modal close/items/search-all (`:528`, `:544`,
   `:561`).
4. **Copy is excellent.** The swap confirmation ("This affects all future
   sessions of this routine. Your set, rep and rest targets stay the same."), the
   re-link recovery copy, and the coverage warnings are plain, specific, and
   non-judgemental. No em dashes. Nothing to rewrite.

### Design assessment (values cited)
- On-system: `surface` cards, amber `primary` Start/Add, semantic `warning` for
  the unresolved-row variant + coverage warnings, `error` for Remove, scale
  tokens; `tagStyles` grades coverage chips by count. The order badge + icon
  action row + reorder mode is a clean, conventional editor layout. No
  fingerprints.

### Flow / integration assessment
- Loads routine + exercises + library on mount; edit/swap/reorder/add/remove go
  through the DB layer; reorder is optimistic with revert-on-failure. Start builds
  `initialExercises` (superset-hydrated) → ActiveWorkout. Unresolved rows route to
  a re-link swap with all exercises as candidates. Well-built and resilient.

---

## STEP B — RESEARCH (live web, 2026-06-04)

- **Add / remove / swap / reorder + per-exercise set-rep-rest editing** is the
  standard routine-editor pattern (Hevy, JEFIT, Fitbod). Volyume implements all
  of it. [Hevy; JEFIT; Fitbod]
- **Per-exercise / per-set granular targets (reps range, rest)** are the modern
  bar; Volyume edits sets, rep-min/max, rest and start weight per exercise.
  [Hevy; JEFIT]
- A11y specifics weren't covered by the sources, so the icon-button
  recommendation leans on WCAG: every interactive control needs an accessible
  name + role. [WCAG, general]

---

## STEP C — COMPARISON

### Where Volyume leads
- A full editor with muscle-coverage balance warnings, per-exercise "why this",
  and graceful broken-FK re-link recovery — beyond the standard add/swap/reorder
  most editors ship. [Hevy; JEFIT]

### Where Volyume lags
- 7 dead picker styles (finding 2) and incomplete/inconsistent control a11y, with
  the icon-only Edit/Remove buttons the priority (finding 3).

### Critical gaps
- None functional. Dead-style cleanup + a11y completion.

---

## STEP D — PROPOSAL

### Summary
Remove the dead picker styles and complete the control a11y (label the icon-only
Edit/Remove, add roles everywhere, label the card + header toggle + modal
buttons). No behaviour, copy, or layout change.

### Specific changes — one by one

**1. Remove the 7 dead picker styles. [Cleanup — Low, zero behaviour risk]**

**2. Complete the control a11y. [A11y — Low]**
- What: `accessibilityRole="button"` + `accessibilityLabel` on the icon-only Edit
  (`Edit {name}`) and Remove (`Remove {name}`); add `accessibilityRole="button"`
  to the reorder up/down and Swap (which already have labels); role + label on the
  header Reorder/Done toggle, the tappable exercise card (`Edit {name}` /
  `Re-link {name}` when unresolved), the Add Exercise footer, the edit-sheet Save,
  and the swap-modal close / items (`Swap in {name}`) / search-all.

### COPY CHANGES
None. The editor copy is excellent.

### What to keep (with evidence)
- The muscle-coverage warnings, per-exercise "why this", the split rationale,
  reorder mode, the ranked-swap + search-all escape hatch, and the broken-FK
  re-link recovery. [Hevy; JEFIT]

### IMPACT / EFFORT
- **Impact: Low** (tidy + a11y; the icon-only Edit/Remove are the meaningful part).
- **Effort: Low.** Style deletions + attribute-only changes; no behaviour, copy,
  or layout change.

### SOURCES
- Hevy — Gym routines:
  https://www.hevyapp.com/features/gym-routines/
- JEFIT — Unified workout editing screen:
  https://www.jefit.com/wp/jefit-news-product-updates/meet-jefits-all-new-unified-workout-editing-screen/
- Fitbod — Editing workouts:
  https://fitbod.zendesk.com/hc/en-us/articles/360006335593-Editing-Workouts-in-Fitbod
