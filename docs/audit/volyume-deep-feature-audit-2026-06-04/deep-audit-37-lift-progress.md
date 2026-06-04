# Deep Feature Audit — Item 36: Lift Progress screen

**Document:** deep-audit-37-lift-progress.md
**Item:** 36 of master inventory (screen #35 — `LiftProgressScreen`; Progress sub-stack, per-lift estimated-1RM progress)
**File:** `src/screens/LiftProgressScreen.js` (406 → 415 lines) + an additive prop on the shared `src/components/PressableCard.js`; libs `liftProgress`, `strengthStandards`, `algorithms`, `units`, components `Sparkline`, `PeekMenu`, `InfoTooltip`, `AnimatedEntrance`
**Status:** IMPLEMENTED (approved 2026-06-04, "Approve"). Extended `PressableCard` to forward an optional `accessibilityHint`; gave the lift cards a composed label + a long-press hint; gave the filter tabs a role + selected state + label; and gave the bodyweight-prompt card a role + label. Attribute-only plus one additive shared-component prop; no behaviour change.
**Timestamp:** 2026-06-04

---

## STEP A — CURRENT STATE AUDIT

### What it is and what it does
"Am I getting stronger" in one screen: an overall **strength standing**,
**relative-strength** ratio + level badge per main lift (with "X {units} from
{next level} on {lift}"), and a filterable list (All lifts / Recent bests) of
every trained lift by estimated-1RM, each with a **sparkline trend**, a delta %,
and a PR marker. Long-press a lift for a peek menu (view detail / share PR).

### Findings
1. **Rich and well-aligned.** Estimated 1RM + relative-strength ratio + level
   (Beginner→Elite) + next-level goal + trend is exactly the gold-standard
   pattern. The lbs/kg ratio bug is handled (the A2-043 comment, converting
   bodyweight to the display unit before the ratio). Clean: **no dead styles, no
   em dashes, tokens throughout** (trend colours CVD-aware), one justified
   `InfoTooltip`.
2. **A11y gaps.** The **filter tabs** had no role or selected state; the **"Add
   your body weight" prompt card** was a plain `TouchableOpacity` with no
   role/label; the **lift cards** use `PressableCard` (default `role="button"`)
   but passed no label and the **long-press peek menu was not announced** — and
   `PressableCard` did not forward `accessibilityHint`.
3. **Copy clean and on-voice.** Nothing to reword.

### Design assessment (values cited)
- On-system: `surface` standing/prompt/lift cards, `primary` for the standing
  headline + active filter + PR tag, level badges tinted from a token map
  (incl. `gold` for Elite), `success`/`error`/`muted` trend colours (CVD-aware),
  scale tokens. The standing + relative-strength + list earns its density; one
  tooltip. No fingerprints.

### Flow / integration assessment
- Loads completed sets + exercises + latest bodyweight on focus; builds rows via
  `buildLiftProgressRows`; computes levels via `getStrengthLevel` against
  unit-matched bodyweight; summarises standing via `summariseStrengthStanding`.
  Tap → ExerciseDetail; long-press → peek menu (detail / share PR). Sound.

---

## STEP B — RESEARCH (live web, 2026-06-04)

- The standard is estimated 1RM + **relative strength (1RM ÷ bodyweight)** + a
  category (Untrained→Elite) + what you need for the next level + **trend over
  time**; Volyume implements all of these. [Arvo; StrengthLevel]

---

## STEP C — COMPARISON

### Where Volyume leads
- Standing + relative strength + next-level goal + trend sparkline, all in one
  screen, with a per-lift PR marker and a share path.

### Where Volyume lags
- Control a11y (tabs, prompt card, the card label + long-press hint).

### Critical gaps
- None functional.

---

## STEP D — PROPOSAL (as implemented)

### Specific changes — one by one
1. **`PressableCard` (shared).** Accept and forward an optional
   `accessibilityHint` (additive; benefits every caller). [A11y infra — Low]
2. **Lift card.** Composed `accessibilityLabel` (name, estimated max, trend,
   "recent best" when applicable) + `accessibilityHint="Long press for options"`.
   [A11y — Low]
3. **Filter tabs.** `accessibilityRole="button"` + `accessibilityState={{ selected }}`
   + label. [A11y — Low]
4. **Bodyweight-prompt card.** `accessibilityRole="button"` + label. [A11y — Low]

### COPY CHANGES
None.

### What to keep (with evidence)
- The standing card, relative-strength rows, the filter, the lift list +
  sparklines, and the peek menu. [Arvo; StrengthLevel]

### IMPACT / EFFORT
- **Impact: Low–Medium.** The cards did not announce their trend or long-press
  menu; the tabs did not announce selection.
- **Effort: Low.** Attribute-only plus one additive prop. eslint 0 problems; all
  LiftProgress screen-mount variants pass, and the **full mount sweep (455) stays
  green** after the shared-component change.

### SOURCES
- Arvo — strength standards (relative strength, levels):
  https://arvo.guru/resources/strength-standards
- StrengthLevel — weightlifting calculator (1RM, bodyweight ratio, levels):
  https://strengthlevel.com/
