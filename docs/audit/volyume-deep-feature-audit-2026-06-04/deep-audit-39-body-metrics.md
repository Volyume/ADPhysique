# Deep Feature Audit — Item 38: Body Metrics screen

**Document:** deep-audit-39-body-metrics.md
**Item:** 38 of master inventory (screen #37 — `BodyMetricsScreen` 🔒 ⤴ Pro-gated, shared with Profile; body measurements/weight)
**File:** `src/screens/BodyMetricsScreen.js` (1168 → 1155 lines), two StyleSheets (`chartStyles` + `styles`)
**Status:** IMPLEMENTED (approved 2026-06-04, "Approve"). Removed 11 genuinely-dead styles, and added a full a11y pass: labels on all seven form inputs, roles (+ state) on every button and toggle, and selected state on the measurement cells and trend tabs. Attribute-only plus the dead-style removal; no behaviour change. `parseLocalDay` consistency and a date picker remain flagged, not coded.
**Timestamp:** 2026-06-04

---

## STEP A — CURRENT STATE AUDIT

### What it is and what it does
Body weight (kg / lbs / stone), body fat, optional measurements, notes, a
measurement snapshot with selectable cells + trend tabs, and weight/measurement
trend charts. It opens behind a **calm/wellbeing gate** for users who asked for a
gentler experience ("Body measurements can be a sensitive space. Open it only if
it feels right for you today."), with a helpline line. Dates default to local
today.

### Findings
1. **Thoughtful and considerate.** The wellbeing gate + sensitive copy, multi-unit
   handling, and trend charts are more careful than a typical tracker. **No em
   dashes.**
2. **A11y entirely absent** (22 controls, 0 roles). Priority is the **data-entry
   form**: the date, body-weight (one or two fields), body-fat, per-measurement,
   and notes **inputs were all unlabelled** (RN does not associate the visible
   `Text` labels). Also the opt-in button, the calm-gate "Continue", "Log
   Weight/Cancel", the measurements toggle, "Save Entry" (no disabled state), and
   the selectable measurement **cells/tabs** (no role or selected state).
3. **Dead styles — 11 (corrected from an initial 15).** A first pass flagged 15,
   but four (`wrap`, `emptyHint`, `emptyHintText`, `smoothedHint`) are live via
   `chartStyles.X` — the detection had only checked `styles.`. The genuinely dead
   ones: `chartStyles.axisText`, and the 10-key `nutrition*` cluster in `styles`
   (`nutritionCard`/`CardHeader`/`CardLeft`/`CardTitle`/`CardLink`/`Grid`/`Cell`/
   `Value`/`Label`/`Empty`) left from a removed nutrition section. Verified 0 refs
   to each across both StyleSheets before removal.
4. **Date handling — UK-safe, but fragile.** A saved entry's `loggedAt` is
   `new Date(form.metric_date).getTime()` — `new Date('2026-06-04')` is **UTC
   midnight**, which round-trips back to the same calendar day via `localDayKey`
   for UK, so no live bug. But it is inconsistent with the app's `parseLocalDay`
   helper, and the date is a **free-text `YYYY-MM-DD` field** (typed), fragile UX.

### Design assessment (values cited)
- On-system: `surface` cards, `primary` opt-in/log/save CTAs, selectable cells +
  tabs with active tints, `DeltaBadge` for changes, scale tokens, charts via the
  shared chart components. The wellbeing gate is a genuine, earned screen. No
  fingerprints.

### Flow / integration assessment
- Opt-in gate → optional calm gate → form (weight/fat/measurements/notes) →
  `saveMetrics` (units converted to kg for storage, `loggedAt` from the date) →
  snapshot + trend charts. Data is local-only (stated in the opt-in copy). Sound.

---

## STEP B — RESEARCH (live web, 2026-06-04)

- Sensitive body data calls for **empathetic tone** (Volyume's calm gate nails
  it), **unit auto-adaptation** (it has st/lbs/kg), **trend charts** (it has
  them), and **screen-reader accessibility** — the gap addressed here. [Dataconomy;
  NCHPAD]

---

## STEP C — COMPARISON

### Where Volyume leads
- The wellbeing gate + sensitive copy + multi-unit entry + trends, all local-only.

### Where Volyume lags
- A11y absent on a data-entry screen (fixed); 11 dead styles (removed).

### Critical gaps
- None functional.

---

## STEP D — PROPOSAL (as implemented)

### Specific changes — one by one
1. **Remove the 11 dead styles** (`chartStyles.axisText` + the 10 `nutrition*`).
   [Cleanup — Low]
2. **A11y pass (attribute-only).**
   - Inputs: `accessibilityLabel` on date, body weight (st + lbs / kg-lbs), body
     fat, each measurement, and notes.
   - Buttons: role (+ label) on opt-in, calm "Continue", "Log Weight/Cancel" (+
     `expanded`), the measurements toggle (+ `expanded`), and "Save Entry" (+
     `disabled`).
   - Measurement cells and trend tabs: role + `accessibilityState={{ selected }}`
     + label.

### Flagged for the founder (not coded)
- Swap `new Date(metric_date)` for `parseLocalDay` (consistency; UK-safe today).
- Consider a date picker instead of the free-text `YYYY-MM-DD` field (a feature).

### COPY CHANGES
None.

### What to keep (with evidence)
- The wellbeing gate, multi-unit entry, the snapshot, and the trend charts.
  [Dataconomy; NCHPAD]

### IMPACT / EFFORT
- **Impact: Medium.** Unlabelled inputs are a real blocker on a data-entry screen;
  plus a sizeable dead-style cleanup.
- **Effort: Low–Medium.** Mechanical across many controls. eslint 0 problems; the
  **full mount sweep (455) stays green**, covering this screen and its Profile use.

### SOURCES
- Dataconomy — best UX/UI practices for fitness apps (inclusive design, tone):
  https://dataconomy.com/2025/11/11/best-ux-ui-practices-for-fitness-apps-retaining-and-re-engaging-users/
- NCHPAD — accessible nutrition/health apps:
  https://www.nchpad.org/resources/accessible-nutrition-apps/
