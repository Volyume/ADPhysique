# Deep Feature Audit — Item 22: Exercise Detail screen

**Document:** deep-audit-23-exercise-detail.md
**Item:** 22 of master inventory (screen #19 — `ExerciseDetailScreen`; Plans + Progress stacks)
**File:** `src/screens/ExerciseDetailScreen.js` (1077 lines), components `SvgLineChart`, `InfoTooltip`, `SkeletonCard`, `AnimatedEntrance`, libs `algorithms`, `swapEngine`, `exerciseDisplay`, `formTips`
**Status:** AWAITING APPROVAL
**Timestamp:** 2026-06-04

---

## STEP A — CURRENT STATE AUDIT

### What it is and what it does
The per-exercise detail/history. An overview card (muscle tags, secondary
muscles, estimated max, SFR "Quality" + "Fatigue" + rep-range with tooltips); a
Personal-bests highlight; a goal section (set a target weight + optional date, a
progress bar vs current est. max, auto-detected achievement with a brief
congrats banner); a plateau banner when progress has stalled; a strength-trend
chart with a Max-weight / Est-max toggle; a history list (last 8 sessions); an
all-time bests list; horizontally-scrolling similar exercises; a coaching cue;
and a "How to do it" form-tip card. Loading shows content-shaped skeletons.

### Findings
1. **Strong and ahead of the bar.** It has the standard exercise-detail kit
   (e1RM/max-weight progression chart, auto-computed PRs across types, Epley
   e1RM with a note, form info — Step B) AND goes beyond with goal-setting +
   progress + auto-achievement, plateau detection, SFR/fatigue "quality" ratings,
   and ranked substitutes. Reduce-motion-aware congrats animation. Single
   StyleSheet, no dead styles (verified), eslint clean, 0 em dashes.
2. **A11y: the interactive controls have no roles (0 across 16 controls).**
   The "Set a target weight" link (`:391`), the icon-only goal-edit pencil
   (`:404`, no text fallback), the chart-mode toggle buttons (`:455`, `:463`, no
   selected state), the substitute cards (`:570`), and the goal-modal Save
   (`:656`) + Remove-goal (`:665`) are all unlabelled/role-less to a screen
   reader. The goal pencil and chart toggle are the priority.
3. **Copy is excellent.** The tooltips translate SFR / fatigue / estimated-max
   into plain language; the e1RM note ("Estimated from top set using the Epley
   formula. Best for rep ranges 2–10.") is honest. The goal congrats ("You've hit
   your target! Set a new one.") is an *earned* milestone acknowledgement of a
   user-set goal, not unasked encouragement — appropriate. No em dashes, British.
   Nothing to rewrite.

### Design assessment (values cited)
- On-system: `surface` cards, amber `primary` + `gold` for the estimated-max /
  PR highlights, semantic `warning` for the plateau banner, `chartFill` for the
  trend area, scale tokens. The overview + PR + goal + chart + history stack is
  dense but each section is conditional and earns its place. `AnimatedEntrance`
  on the overview. No fingerprints.

### Flow / integration assessment
- Loads exercise + history (grouped by workout, last 8) + computed PRs + goal
  (with auto-achievement) + ranked substitutes on mount. Goal save/remove and
  achievement detection go through the DB. The chart derives from session top
  sets. Substitute cards `navigation.push` to the same screen (recursive detail).
  Loose date parsing for the optional target date. Well-built.

---

## STEP B — RESEARCH (live web, 2026-06-04)

- **Progression graphs (e1RM, max weight) on the exercise detail** are the named
  pattern; Volyume has the toggle chart. [FitNotes; Strong]
- **Auto-tracked PRs across rep ranges + estimated 1RM from all sets** are best
  practice; Volyume computes 1RM-est / heaviest / most-reps automatically.
  [Strong; Setgraph]
- **Per-exercise next-session targets + visible-not-buried progress** — Volyume's
  goal-setting + progress bar + plateau banner extend this into the detail view.
  [Setgraph; Hevy]

---

## STEP C — COMPARISON

### Where Volyume leads
- A detail screen that pairs the standard e1RM chart + auto-PRs with goal-setting
  (target + date + progress + auto-achievement), plateau detection, and SFR/
  fatigue "quality" ratings — a richer, more coaching-oriented view than the
  graph-only detail most trackers ship. [FitNotes; Strong; Hevy]

### Where Volyume lags
- The interactive controls lack a11y roles/labels (finding 2), with the icon-only
  goal pencil and the chart toggle the priority. Only gap.

### Critical gaps
- None. Clean, rich screen; a11y polish only.

---

## STEP D — PROPOSAL

### Summary
A11y-only polish: label the goal link + icon-only pencil, give the chart-mode
toggle roles + selected state, and role the substitute cards and the goal-modal
buttons. No behaviour, copy, or layout change.

### Specific changes — one by one

**1. Add roles/labels/state to the controls. [A11y — Low]**
- What: `accessibilityRole="button"` + label on the "Set a target weight" link,
  the goal-edit pencil ("Edit target"), the substitute cards (`View {name}`), and
  the goal-modal Save (+ disabled state) / Remove-goal; `accessibilityRole=
  "button"` + `accessibilityState={{ selected }}` + label on the two chart-mode
  toggle buttons.

### COPY CHANGES
None.

### What to keep (with evidence)
- The e1RM/max-weight chart, auto-PRs, goal-setting + progress + auto-achievement,
  plateau detection, SFR/fatigue ratings, substitutes, the plain-language
  tooltips, and the reduce-motion congrats. [FitNotes; Strong; Hevy]

### IMPACT / EFFORT
- **Impact: Low** (a11y polish; the icon-only pencil + chart toggle are the
  meaningful part).
- **Effort: Low.** Attribute-only; no behaviour, copy, or layout change.

### SOURCES
- FitNotes — Progress tracking (e1RM / rep-max graphs):
  http://www.fitnotesapp.com/progress_tracking/
- Strong — Workout tracker (estimated 1RM, PRs):
  https://apps.apple.com/us/app/strong-workout-tracker-gym-log/id464254577
- Hevy — Track gym progress:
  https://www.hevyapp.com/features/gym-progress/
