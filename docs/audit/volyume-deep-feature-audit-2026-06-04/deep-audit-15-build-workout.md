# Deep Feature Audit — Item 14: Build Workout screen

**Document:** deep-audit-15-build-workout.md
**Item:** 14 of master inventory (screen #10 — `BuildWorkoutScreen`; Train stack, pre-session build/blank-start)
**File:** `src/screens/BuildWorkoutScreen.js` (614 lines), shared `Button`, lib `travelMode`
**Status:** IMPLEMENTED (approved 2026-06-04, "Approved"). Added roles/labels to the remove-X, Travel chip, Add Exercise, Skip Setup, travel Cancel/Build and picker rows/close; made the travel equipment options a radiogroup; labelled the rep min/max inputs. Attribute-only, no behaviour/copy/layout change.
**Timestamp:** 2026-06-04

---

## STEP A — CURRENT STATE AUDIT

### What it is and what it does
The pre-session manual builder, reached from Home's "Blank session" and the
free no-plan path. A header (Skip Setup / Build Workout), a subtitle, a
Travel / Hotel-Gym quick-fill chip, then a list of exercise cards (index badge,
name + muscle/equipment, remove X) each with steppers for Sets and Rest, a
rep-range min/max pair, and a starting-weight input. An "Add Exercise" dashed
button opens a search picker modal; "Start Training (N)" creates the workout and
replaces into ActiveWorkout; "Skip Setup" starts an empty session. Travel mode
opens an equipment picker (bodyweight / dumbbells / hotel gym) and fills a
full-body session via `generateTravelPlan`.

### Findings
1. **Solid, and the core steppers are already accessible.** The Sets and Rest
   stepper buttons carry `accessibilityRole="button"` + labels, and the stepper
   values have `accessibilityLabel`s ("3 sets", "Rest 90s"). `units` is correctly
   used in the starting-weight label. No dead styles (verified), eslint clean.
   Travel mode is a genuine differentiator (maintain-muscle-while-away).
2. **A11y gaps on the secondary controls.** Missing `accessibilityRole`/labels:
   the remove-exercise X (`:194`), the Travel chip (`:173`), the "Add Exercise"
   button (`:294`), "Skip Setup" (`:162`), the travel-modal equipment options
   (`:326`, should be radios) and its Cancel / Build buttons (`:338`, `:341`), and
   the picker rows (`:368`) + picker close (`:360`). The rep min/max `TextInput`s
   (`:233`, `:241`) also have no `accessibilityLabel` ("Minimum reps" / "Maximum
   reps"). A screen-reader user can drive the steppers but not reliably the rest.
3. **Copy is on-voice.** "Add exercises and set your targets before you start.",
   the Travel sub, and the toasts are plain and terse. No em dashes (the rep
   separator is an en dash "–", which is allowed), no AI tells. Nothing to fix.
4. **Minor: equipment options aren't a radiogroup.** The three travel-equipment
   options are a single-select but rendered as plain `TouchableOpacity`s without
   radio semantics. Same class as the Goal-lock fix.

### Design assessment (values cited)
- On-system: `surface`/`surface2` cards + steppers, amber accent on the Add
  button border, Travel chip and active states, scale tokens. The dashed
  Add-Exercise affordance and the per-exercise stepper row read as a real
  builder. The Travel modal is a clean equipment picker. No fingerprints.

### Flow / integration assessment
- Both exits (`handleStartTraining`, `handleSkip`) create the workout via
  `createWorkout`, seed `initialExercises` with the per-exercise targets, and
  `navigation.replace('ActiveWorkout')`, toast-guarded. Travel mode resolves
  exercise names against the library with a sensible fallback. The picker lazy-
  loads the exercise list once and caps the unfiltered view at 50. Clean.

---

## STEP B — RESEARCH (live web, 2026-06-04)

- **Builders use steppers/inputs for sets, reps, rest, plus add/insert.** The
  standard pattern is intuitive per-exercise parameter controls; Volyume matches
  it (steppers + rep inputs + rest + starting weight), and adds Travel mode.
  [Movement; WorkoutLabs]
- **Single-tap adjustments during build/execution** are the bar; Volyume's
  steppers fit. [Reps & Sets]
- Stepper-specific screen-reader guidance wasn't covered by the sources, so the
  a11y recommendation leans on WCAG: every interactive control needs an
  accessible name and role. [WCAG, general]

---

## STEP C — COMPARISON

### Where Volyume leads
- A clean per-exercise builder with proper steppers and a Travel/Hotel-Gym
  maintain-muscle quick-fill that most builders don't offer, plus a frictionless
  "Skip Setup" empty-start. [Movement; WorkoutLabs]

### Where Volyume lags
- Secondary controls (remove, add, skip, travel chip + modal, picker) miss a11y
  roles/labels, and the rep inputs miss labels (finding 2). The steppers are
  already done, so it's an inconsistent-coverage gap.

### Critical gaps
- None. The build/start flow works; the items are a11y polish.

---

## STEP D — PROPOSAL

### Summary
A11y-only polish to bring the secondary controls up to the standard the steppers
already meet. No behaviour, copy, or layout change.

### Specific changes — one by one

**1. Add roles/labels to the secondary controls. [A11y — Low]**
- What: `accessibilityRole="button"` + concise labels on the remove-exercise X
  ("Remove {name}"), the Travel chip, "Add Exercise", "Skip Setup", the travel
  Cancel / Build buttons, the picker rows ("Add {name}") and the picker close.

**2. Make the travel equipment options a radiogroup. [A11y — Low] — `:320-336`**
- What: wrap the three options in `accessibilityRole="radiogroup"` and give each
  `accessibilityRole="radio"` + `accessibilityState={{ selected }}`.

**3. Label the rep inputs. [A11y — Low] — `:233`, `:241`**
- What: `accessibilityLabel="Minimum reps"` / `"Maximum reps"` on the two
  `TextInput`s.

### COPY CHANGES
None. Copy is on-voice.

### What to keep (with evidence)
- The per-exercise steppers (already accessible), Travel mode, the dashed Add
  affordance, Skip Setup, and the lazy-loaded capped picker. [Movement; Reps & Sets]

### IMPACT / EFFORT
- **Impact: Low** (a11y polish; the screen is sound).
- **Effort: Low.** Attribute-only; no behaviour, copy, or layout change.

### SOURCES
- Movement — Workout builder feature:
  https://movement.so/features/workout-builder
- WorkoutLabs — Free workout builder:
  https://workoutlabs.com/train/free-workout-builder/
- Reps & Sets — strength training app:
  https://repsandsetsapp.com/
