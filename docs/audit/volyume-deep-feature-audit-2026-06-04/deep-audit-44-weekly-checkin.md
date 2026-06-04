# Deep Feature Audit — Item 43: Weekly Check-in screen

**Document:** deep-audit-44-weekly-checkin.md
**Item:** 43 of master inventory (screen #43 — `WeeklyCheckInScreen` 🔒; weekly check-in form)
**File:** `src/screens/WeeklyCheckInScreen.js` (1322 lines), reusable `ChipRow` / `OptionRow` / `SectionLabel` / `StepBar`
**Status:** IMPLEMENTED (approved 2026-06-04, "Approve and fold in"). Full a11y pass: role + selected state + label on the `ChipRow` and `OptionRow` controls, the sore-muscle multi-select chips, and the training-performance cards; labels on the three inputs; roles/labels on the gate buttons, header back, nutrition-targets prompt, and Next/Submit (with disabled state); and the approved step-progress announcement ("step X of 4") on the header. Attribute-only. A11y refs 2 → 28.
**Timestamp:** 2026-06-04

---

## STEP A — CURRENT STATE AUDIT

### What it is and what it does
A 4-step weekly check-in behind gates (wrong day / too soon / need weights /
open): rating chips, option rows (calories/cardio adherence), a sore-muscle
multi-select, training-performance cards, auto-derivation of calories/steps/cardio
with overrides (incl. the steps override shipped earlier this session), sleep and
notes inputs, and a Next/Submit flow. Feeds the weekly coach.

### Findings
1. **Thorough and well-gated.** The auto-derive-then-override pattern (calories,
   steps, cardio) is genuinely good, and the gates are considerate. Clean: **no em
   dashes.**
2. **A11y nearly absent** (33 controls, 2 refs). Systematic gaps: the reusable
   **`ChipRow`/`OptionRow`** (no role/selected state/label), the **sore-muscle**
   chips, the **training-performance** cards, the **three inputs** (sleep,
   steps-manual, notes — unlabelled), the **nutrition-targets prompt**, the
   **gate** buttons, the **header back**, and **Next/Submit** (disabled state not
   announced).
3. **No dead styles.** The dead-style scan flagged `trainingMeta`, but that is a
   property of the `autoDerived` state object (used at the training-performance
   auto note), not a style — verified and left.
4. **Multi-step progress wasn't announced** to a screen reader.

### Design assessment (values cited)
- On-system: chips/option buttons/perf cards with `primary` selected tint, gate
  cards, a `StepBar` progress indicator, scale tokens. No fingerprints; the
  gates avoid a dead-end by offering "Check in anyway".

### Flow / integration assessment
- Gate resolves (day/timing/weights) → 4 steps with `stepCanAdvance` gating →
  `handleSubmit` feeds the weekly coach. Auto-derivation reads diary/steps/cardio
  and lets the user override. The `stepsAvg` contract to the coach is unchanged.
  Sound.

---

## STEP B — RESEARCH (live web, 2026-06-04)

- Rating/selection chips need a role + selected state; multi-step wizards should
  convey **step progress** to a screen reader; a disabled submit should **announce
  its disabled state**. This is the basis for the chip roles, the header step
  announcement, and the Next/Submit disabled state. [W3C WAI multi-page forms;
  Telerik chips; Adrian Roselli]

---

## STEP C — COMPARISON

### Where Volyume leads
- A gated check-in with auto-derivation + overrides feeding the coach, with no
  dead-end gate.

### Where Volyume lags
- A11y across the selectors, inputs, and buttons (all fixed).

### Critical gaps
- None functional.

---

## STEP D — PROPOSAL (as implemented)

### Specific changes — one by one
1. **`ChipRow` (component).** role + `accessibilityState={{ selected }}` + label
   (`${value} ${label}`).
2. **`OptionRow` (component).** role + selected state + label.
3. **Sore-muscle chips.** role + selected state + label.
4. **Training-performance cards.** role + selected state + label.
5. **Three inputs.** labels (Average sleep hours; Average steps a day; Anything
   else to flag?).
6. **Nutrition-targets prompt, gate buttons, header back.** roles + labels.
7. **Next + Submit.** role + `accessibilityState={{ disabled }}` + label.
8. **Step progress (folded in).** The header centre announces
   `${checkinDayLabel}, step ${step + 1} of ${TOTAL_STEPS}`.

### COPY CHANGES
None.

### What to keep (with evidence)
- The gates, auto-derivation + overrides, and all copy. [W3C WAI]

### IMPACT / EFFORT
- **Impact: Medium.** The chips, selectors, inputs and submit were largely
  invisible to a screen reader on a 4-step form; a11y refs went 2 → 28.
- **Effort: Medium.** Two component fixes cover the bulk. eslint 0 problems; 13
  WeeklyCheckIn tests pass (incl. mount fuzz), and the weekly-coach contract suites
  stay green (60).

### SOURCES
- W3C WAI — multi-page forms:
  https://www.w3.org/WAI/tutorials/forms/multi-page/
- Telerik — Chip accessibility:
  https://www.telerik.com/design-system/docs/components/chip/accessibility/
- Adrian Roselli — Don't disable form controls:
  https://adrianroselli.com/2024/02/dont-disable-form-controls.html
