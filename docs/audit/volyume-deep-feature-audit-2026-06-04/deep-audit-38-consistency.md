# Deep Feature Audit — Item 37: Consistency screen

**Document:** deep-audit-38-consistency.md
**Item:** 37 of master inventory (screen #36 — `ConsistencyScreen`; Progress sub-stack, training frequency/consistency)
**File:** `src/screens/ConsistencyScreen.js` (141 lines, clean) + the shared `src/components/ProgressSections.js` it renders (where the changes landed); hook `useProgressData`, components `FatigueTrendCard`, `BlockProgressCard`, `ReadinessCards`, `InfoTooltip`
**Status:** IMPLEMENTED (approved 2026-06-04, "Approve"). The screen file needed nothing. In the shared `ProgressSections`: gave the `MesocyclePulseCard` empty CTA and main card roles + labels (+ a hint), the `MuscleFrequencyTable` toggle a role + expanded state + label, and wrapped the `TrainingCalendar` grid as one accessible element with a "Trained X of the last 84 days" summary. Attribute-only; no behaviour change. These also improve the already-audited Progress landing.
**Timestamp:** 2026-06-04

---

## STEP A — CURRENT STATE AUDIT

### What it is and what it does
The "am I training often enough, and is my body keeping up" hub: a lighter-week
banner, the training block (`MesocyclePulseCard` + fatigue + block progress),
recovery signals, training load (ACWR), a session-length trend, training
frequency per muscle, and a 12-week training-day calendar. Driven by
`useProgressData`.

### Findings
1. **Clean composition.** The screen file has **no direct interactive controls,
   no dead styles, no em dashes** (the "10–20%" is a correct en-dash range, not a
   banned em dash), justified tooltips, and good copy.
2. **The a11y gaps are in the shared `ProgressSections`** (7 touchables, 0 roles),
   which this screen surfaces (and shares with the Progress landing):
   - `MesocyclePulseCard` empty/"Browse plans" CTA — no role/label.
   - `MesocyclePulseCard` main card (navigates to the block) — no role/label/hint;
     content read fragmented.
   - `MuscleFrequencyTable` "Show all / Show less" toggle — no role, state, label.
   - `TrainingCalendar` — 84 colour-only squares; the count is in the legend
     ("X days trained"), so the key info is conveyed, but the grid itself was a
     silent visual.
3. **Copy clean and on-voice.** Nothing to reword.

### Design assessment (values cited)
- On-system: `surface` cards, `warning`-tinted lighter-week banner, `primary`
  trained squares / progress fill, scale tokens, `SvgBarSparkline` for weekly
  load. Sections appear only when there is enough data (`enoughForTrends`), so the
  screen never shows empty scaffolding. No fingerprints.

### Flow / integration assessment
- All data flows through `useProgressData`; sections are conditionally rendered on
  data presence. The block card navigates to `MesocycleBuilder`/`PlanLibrary` via
  the parent Plans tab. The calendar matches on the **local** day key (the comment
  notes UK-calendar alignment, not UTC). Sound.

---

## STEP B — RESEARCH (live web, 2026-06-04)

- A consistency heatmap should expose a **screen-reader-friendly summary** rather
  than leaving the colour-coded cells silent; tappable cards and toggles need
  roles. This is the basis for the calendar summary + the control roles. [Syncfusion;
  FusionCharts]

---

## STEP C — COMPARISON

### Where Volyume leads
- A rich consistency + recovery hub (block, ACWR, fatigue, frequency, 12-week
  calendar) in one place, gated on having enough data.

### Where Volyume lags
- Control a11y in the shared sections (fixed).

### Critical gaps
- None functional.

---

## STEP D — PROPOSAL (as implemented, in `ProgressSections`)

### Specific changes — one by one
1. **`MesocyclePulseCard` empty/build.** `accessibilityRole="button"` + label
   "Browse plans". [A11y — Low]
2. **`MesocyclePulseCard` main card.** `accessibilityRole="button"` + a composed
   label (name + week/progress) + `accessibilityHint="Opens training block"`.
   [A11y — Low]
3. **`MuscleFrequencyTable` toggle.** `accessibilityRole="button"` +
   `accessibilityState={{ expanded: showAll }}` + label. [A11y — Low]
4. **`TrainingCalendar`.** The grid is now one accessible element labelled
   "Trained X of the last 84 days"; the decorative squares are covered by that
   summary. [A11y — Low]

### COPY CHANGES
None.

### What to keep (with evidence)
- The composition, the tooltips, and the recovery/ACWR/frequency/calendar
  sections. [Syncfusion; FusionCharts]

### IMPACT / EFFORT
- **Impact: Low–Medium.** The block card and frequency toggle did not announce as
  buttons; the calendar was a silent visual.
- **Effort: Low.** Attribute-only in a shared component. eslint 0 problems; the
  **full mount sweep (455) stays green**, covering both this screen and the
  Progress landing.

### SOURCES
- Syncfusion — HeatMap accessibility (screen-reader summaries):
  https://ej2.syncfusion.com/react/documentation/heatmap-chart/accessibility
- FusionCharts — accessibility (ARIA chart descriptions):
  https://www.fusioncharts.com/extensions/accessibility
