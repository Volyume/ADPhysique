# Deep Feature Audit — Item 23: Manual Builder screen

**Document:** deep-audit-24-manual-builder.md
**Item:** 23 of master inventory (screen #20 — `ManualBuilderScreen`; Plans stack, build a plan from scratch)
**File:** `src/screens/ManualBuilderScreen.js` (896 lines, two StyleSheets: `styles` + `balanceStyles`), components `BackHeader`, `ExercisePickerModal`, libs `database`, `algorithms` (`VOLUME_LANDMARKS`, `MUSCLE_DISPLAY_NAMES`)
**Status:** IMPLEMENTED (approved 2026-06-04, "Proceed"). Removed the 2 dead styles (`pillRow`, `dayPill`); added roles/labels/state to the goal pills (selected), Create/Save Draft/Save & Activate (disabled), Add Exercise/Add Day, the success-modal buttons, and the exercise row (role + label + "Hold to remove" hint so the long-press remove is announced). Attribute-only + style deletions.
**Timestamp:** 2026-06-04

---

## STEP A — CURRENT STATE AUDIT

### What it is and what it does
The from-scratch plan builder, a two-page wizard. Page 1: plan name + a goal
pill row (Build Muscle / Balanced / Aesthetic / Strength-Biased / Lose Fat),
then "Create Plan & Add Workouts" which creates the programme and seeds four
days. Page 2: an editable plan name, a card per day (editable day name, an
exercise list, an "Add Exercise" button that opens the shared
`ExercisePickerModal`), an "Add Day" button, a live **Plan Balance** card
(per-muscle set counts graded against MEV/MAV/MRV volume landmarks, with
"no work" / "low" / "very high" warnings), and two actions: Save Draft (no
activation) or Save & Activate (persists routines + exercises, activates the
plan with a block, then a success modal → Train or stay). Removing an exercise
is a long-press with an 8-second Undo toast, no confirm dialog.

### Findings
1. **Strong, well-built wizard.** It matches the standard custom-builder kit
   (name → goal → per-day exercises with sets/reps, add/remove days — Step B) and
   goes beyond with a live Plan Balance card driven by the same MEV/MAV/MRV
   volume landmarks as the rest of the app, an Undo-based remove (no nagging
   "Are you sure?" Alert), and a clean draft-vs-activate split. Theme tokens
   throughout (status colours recolour with the colour-blind palette). eslint
   clean, 0 em dashes.
2. **2 dead styles.** `pillRow` (`:577`) and `dayPill` (`:589`) are orphaned
   from a removed days-per-week picker (`daysPerWeek` is now a fixed const of 4,
   seeded at create; there is no day-count picker rendered). Verified across both
   StyleSheets (0 `styles.X` refs for each).
3. **A11y: 0 `accessibilityRole` across 19 controls, and one real trap.** The
   exercise row (`:446`) has an ellipsis icon and its *only* action is
   long-press-to-remove, with no role, label, or hint. A screen-reader user
   can't discover or trigger removal (the ellipsis reads as nothing and a tap
   does nothing) — this is the priority. Beyond that: the goal pills (`:373`)
   have no `selected` state; Create (`:386`), Save Draft (`:484`) and Save &
   Activate (`:491`) have no role or disabled state; Add Exercise (`:466`),
   Add Day (`:474`) and the success-modal Stay Here (`:513`) / Go to Train
   (`:519`) have no role.
4. **Copy is excellent.** The validation toasts ("`{day}` has no exercises. Add
   one or remove the day"), the remove Undo ("Removed `{name}`" + Undo), and the
   balance warnings ("No `{muscle}` work in this plan", "`{muscle}` work is low.
   Consider adding a set or two.", "`{muscle}` volume is very high. This may
   affect recovery.") are plain, specific, and non-judgemental. The rep-range
   en dash ("8–12 reps") is correct typography, not an em dash. Nothing to
   rewrite.

### Design assessment (values cited)
- On-system: `surface` day cards, amber `primary` for the create/activate
  buttons + active goal pill + add-exercise affordance, semantic `warning`/
  `error`/`success` for the balance card graded by volume landmark, dashed
  `borderLight` Add-Day affordance, scale tokens. The two-page wizard, the day
  cards, and the success modal each earn their place. The status dots use glyph
  + theme colour (not raw hex). No fingerprints.

### Flow / integration assessment
- Page 1 creates the programme up front (so the ID exists before adding days);
  page 2 holds days in local state and persists them all on save via
  `createRoutine` + `addExerciseToRoutine`, then `activatePlanWithBlock`. Remove
  is optimistic with index-preserving Undo. Save Draft persists without
  activating and returns to Plans. Solid, with the one a11y trap on remove.

---

## STEP B — RESEARCH (live web, 2026-06-04)

- **Add exercises, tweak sets/reps, rearrange days** is the named custom-builder
  pattern; an intuitive, clean editor where users build per-day workouts is the
  bar. Volyume implements name → goal → per-day exercises with sets/reps + add
  day. [Fitbudd; Workout Builder]
- **Per-exercise rest/reps control + multi-day schedule** are listed as core;
  Volyume sets sets + rep-min/max per exercise and adds days freely. [Fitbudd]
- **Buttons need a descriptive accessible name; icon-only controls need an
  explicit label.** "An icon-only button should include an accessible name" is
  the direct rule behind the ellipsis/long-press remove gap (finding 3); a
  control whose only trigger is a timed gesture also needs a discoverable name +
  hint. [Deque; Sara Soueidan; MDN button role]

---

## STEP C — COMPARISON

### Where Volyume leads
- A from-scratch builder with a live Plan Balance card (per-muscle volume vs
  MEV/MAV/MRV with plain-language warnings) and an Undo-based remove instead of
  a confirm dialog — more guidance and less friction than the plain name/sets/
  reps builders the sources describe. [Fitbudd; Workout Builder]

### Where Volyume lags
- 2 dead styles (finding 2) and control a11y, with the long-press-only exercise
  remove the priority (no accessible way to discover or trigger it; finding 3).

### Critical gaps
- None functional. Dead-style cleanup + a11y completion (the remove control is
  the one that genuinely blocks a screen-reader user).

---

## STEP D — PROPOSAL

### Summary
Remove the 2 dead styles and complete the control a11y, with the exercise-row
remove the priority: give it a role, a label, and a hint so a screen reader can
discover and trigger it. No behaviour, copy, or layout change.

### Specific changes — one by one

**1. Remove the 2 dead styles (`pillRow`, `dayPill`). [Cleanup — Low, zero
behaviour risk]**

**2. Complete the control a11y. [A11y — Low]**
- Exercise row (priority): `accessibilityRole="button"`, label
  (`{name}, {sets} sets`), and `accessibilityHint="Hold to remove"` so the
  long-press action is announced and discoverable.
- Goal pills: `accessibilityRole="button"` + `accessibilityState={{ selected }}`.
- Create / Save Draft / Save & Activate: `accessibilityRole="button"` +
  `accessibilityState={{ disabled }}`.
- Add Exercise, Add Day, and the success-modal Stay Here / Go to Train:
  `accessibilityRole="button"`.

### COPY CHANGES
None. The builder copy is excellent.

### What to keep (with evidence)
- The two-page wizard, the goal pills, the live Plan Balance card (MEV/MAV/MRV
  warnings), the Undo-based remove, the draft-vs-activate split, and the success
  modal. [Fitbudd; Workout Builder]

### IMPACT / EFFORT
- **Impact: Low–Medium** (tidy + a11y; the long-press-only remove is a genuine
  screen-reader blocker today, the rest is polish).
- **Effort: Low.** Two style deletions + attribute-only changes; no behaviour,
  copy, or layout change.

### SOURCES
- Fitbudd — Custom workout app / customizable plans:
  https://www.fitbudd.com/post/custom-workout-app-how-to-create-fully-customizable-workout-plans-and-timers-using-fitbudd
- Workout Builder App (Google Play):
  https://play.google.com/store/apps/details?id=com.muzudre.workout.builder.app&hl=en_US
- Deque — Accessible ARIA buttons:
  https://www.deque.com/blog/accessible-aria-buttons/
- Sara Soueidan — Accessible icon buttons:
  https://www.sarasoueidan.com/blog/accessible-icon-buttons/
- MDN — ARIA button role:
  https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Roles/button_role
