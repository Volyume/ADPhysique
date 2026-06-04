# Deep Feature Audit — Item 17: Workout History screen

**Document:** deep-audit-18-workout-history.md
**Item:** 17 of master inventory (screen #13 — `WorkoutHistoryScreen`; Progress + Train stacks)
**File:** `src/screens/WorkoutHistoryScreen.js` (908 lines), components `Card`, `PressableCard`, `SkeletonRow`, `AnimatedEntrance`, `EmptyWorkoutsIllustration`
**Status:** AWAITING APPROVAL
**Timestamp:** 2026-06-04

---

## STEP A — CURRENT STATE AUDIT

### What it is and what it does
The session history. A FlatList of completed workouts (most recent 50) with a
header that shows the session count and a list/calendar toggle, filter chips
(All / This month / Upper / Lower / Full body), and in calendar mode a month grid
that highlights trained days and lets you tap a day to filter to it. Each list
card shows date, relative time, duration + working sets, and the exercise list;
tapping expands it to stat chips + a per-exercise breakdown + notes + "view full
summary"; card actions are View Details and Repeat (repeat-as-is or view in
Plans). Skeleton rows on load; a designed empty state. Pull-to-refresh.

### Findings
1. **Strong, and matches the best-practice shape.** List + calendar toggle,
   trained-day highlighting, filters, expandable drill-down with entrance
   animation, and a repeat action — all named history/calendar best practice
   (Step B). Bounded reads (page of 50 + only that page's sets), no dead styles
   (verified), eslint clean. The earlier dead `handleStartNewWorkout` was already
   removed in the lint sweep.
2. **A11y: the interactive controls lack roles/labels.** The expand header uses
   `PressableCard` (button role + label, good), but these are bare
   `TouchableOpacity`s: the list/calendar toggle (`:499`), the filter chips
   (`:520`, no selected state), the calendar prev/next (`:411`, `:421`), the
   calendar day cells (`:462`, tappable when trained), the View Details (`:374`),
   View full summary (`:350`), Repeat (`:392`), and "show all this month"
   (`:550`) buttons. A screen-reader user can't reliably operate the toggle,
   filters or calendar.
3. **Copy is on-voice.** The empty state ("Completed workouts appear here. Each
   session is saved automatically when you finish.") is two short sentences,
   within bounds. The Repeat alert ("How would you like to continue?" → Repeat
   as-is / View in Plans) is clear. No em dashes, no AI tells.

### Design assessment (values cited)
- On-system: `surface` cards, amber `primaryBg`/`primary` for active toggle +
  trained calendar days + selected day, scale tokens. The calendar cell circles
  (trained / today / selected states) are a clean, restrained treatment.
  `AnimatedEntrance` staggers list cards. Filter chips are a standard pattern.
  No fingerprints.

### Flow / integration assessment
- Expand lazy-loads + caches each session's grouped sets. Repeat-as-is rebuilds
  from the routine (or the session's sets) and routes to ActiveWorkout. View
  routes to `WorkoutSummary` in `readOnly` mode. Calendar filtering + day
  selection + month nav are coherent. Bounded, well-guarded.

---

## STEP B — RESEARCH (live web, 2026-06-04)

- **Calendar month view highlighting trained days + a timeline of sessions** is
  the recognised history pattern; Volyume does this. [Workout Calendar; Fitlist]
- **List/calendar toggle + category filters + smooth drill-down animations** are
  named interaction patterns; Volyume has the toggle, filters and animated
  expansion. [Fito; Workout Calendar]
- **Show the key takeaway per row; every view suggests a next step** — Volyume's
  cards lead with date + duration + sets and offer Repeat as the next step.
  [Fito]

---

## STEP C — COMPARISON

### Where Volyume leads
- A dual list/calendar history with trained-day highlighting, filters, animated
  expandable breakdowns, and a one-tap Repeat into a live session — richer than
  the flat log list many trackers ship, and bounded for performance. [Workout
  Calendar; Fito]

### Where Volyume lags
- The interactive controls miss a11y roles/labels (finding 2). That's the only
  concrete gap.

### Critical gaps
- None. Clean screen; a11y polish only.

---

## STEP D — PROPOSAL

### Summary
A11y-only polish: give the toggle, filters, calendar nav/cells, and the card/
detail action buttons proper roles, labels and (for the chips/toggle/day)
selected state. No behaviour, copy, or layout change.

### Specific changes — one by one

**1. Add roles/labels/state to the interactive controls. [A11y — Low]**
- What: `accessibilityRole="button"` + label + `accessibilityState={{ selected }}`
  on the list/calendar toggle and the filter chips; role + label on the calendar
  prev/next ("Previous month" / "Next month"); role + label + selected state on
  the trained calendar day cells (and leave untrained cells non-actionable);
  role + label on View Details, View full summary, Repeat, and "show all this
  month".

### COPY CHANGES
None.

### What to keep (with evidence)
- The list/calendar toggle, filters, trained-day calendar, animated expandable
  breakdowns, the bounded page-of-50 reads, and the Repeat-as-is flow. [Workout
  Calendar; Fito]

### IMPACT / EFFORT
- **Impact: Low** (a11y polish on a clean screen).
- **Effort: Low.** Attribute-only; no behaviour, copy, or layout change.

### SOURCES
- Workout Calendar — Track/Log:
  https://apps.apple.com/us/app/workout-calendar-track-log/id6443797216
- Fito — Best fitness data analysis & visualizations:
  https://getfitoapp.com/en/best-fitness-data-analysis/
- Fitlist — Workout log & planner:
  https://apps.apple.com/us/app/fitlist-workout-log-planner/id696350076
