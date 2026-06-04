# Deep Feature Audit — Item 41: Nutrition Targets screen

**Document:** deep-audit-42-nutrition-targets.md
**Item:** 41 of master inventory (screen #41 — `NutritionTargetsScreen` 🔒; calorie/macro targets calculator)
**File:** `src/screens/NutritionTargetsScreen.js` (1717 lines), reusable `PillGroup` / `MacroCard`
**Status:** IMPLEMENTED (approved 2026-06-04, "Approve"). One `PillGroup` change labels every pill selector; added labels to the six form inputs, roles + selected state to the goal and protein-approach cards, a checkbox role + checked state to the consent row, and roles to the edu card, Adjust, and Calculate (with disabled state) buttons. Attribute-only; no behaviour or copy change. A11y refs went 2 → 21.
**Timestamp:** 2026-06-04

---

## STEP A — CURRENT STATE AUDIT

### What it is and what it does
A thorough TDEE/macro calculator: sex, age, height, weight, optional body fat +
source, activity level, a goal selector, protein-approach cards (with a custom
g/kg input), meals per day, a consent row, and Calculate. Follows the standard
calculation flow and links out to the nutrition primer.

### Findings
1. **Comprehensive and on-standard.** Sex → age/height → weight → goal → activity →
   optional body fat is the established calculator flow, and the
   body-composition-aware protein approach is a nice touch. Clean: **no dead
   styles, no em dashes**, dates local. The meals-per-day pills already had a11y.
2. **A11y nearly absent** (29 controls, 2 refs). The systematic gap was the
   reusable **`PillGroup`** (pills with no role/selected state/label) plus the
   **six form inputs** (unlabelled), the **goal** and **protein-approach cards**
   (selectable cards with no role/selected state), the **consent row** (a checkbox
   with no role/checked state/label), and the **edu card / Adjust / Calculate**
   buttons (no roles; Calculate has a disabled state).
3. **Copy clean** in what was reviewed; no em dashes, no obvious AI tells.

### Design assessment (values cited)
- On-system: `pill`/`goalCard`/`approachCard` selectors with `primary` active
  tint + checkmark, `surface` cards, a real checkbox for consent, scale tokens.
  The goal grid + approach cards earn their layout. No fingerprints.

### Flow / integration assessment
- Form state → `handleCalculate` (gated on `formComplete`) → results, with an
  Adjust path to reopen the form. Body data is local-only (stated in the consent
  card). Sound.

---

## STEP B — RESEARCH (live web, 2026-06-04)

- Selectable option cards are **functionally radio/checkbox controls** and must
  expose a role + selected state to assistive tech; form inputs need **associated
  labels** (a placeholder is not a label). This is the basis for the card roles and
  the input labels. [Salt Design System; Baymard]

---

## STEP C — COMPARISON

### Where Volyume leads
- A complete, on-standard calculator with a body-comp-aware protein approach and a
  custom override, plus a primer link for newcomers.

### Where Volyume lags
- A11y across the pills, inputs, selectable cards, and consent (all fixed).

### Critical gaps
- None functional.

---

## STEP D — PROPOSAL (as implemented)

### Specific changes — one by one
1. **`PillGroup` (component).** `accessibilityRole="button"` +
   `accessibilityState={{ selected }}` + label — fixes every pill selector at once.
2. **Six inputs.** `accessibilityLabel` (Age; Height, feet; Height, inches;
   Current weight in kilograms; Body fat percentage; Protein target, grams per
   kilogram).
3. **Goal cards + protein-approach cards.** `accessibilityRole="button"` +
   `accessibilityState={{ selected }}` + label from the option data.
4. **Consent row.** `accessibilityRole="checkbox"` +
   `accessibilityState={{ checked: consent }}` + label.
5. **Edu card, Adjust, Calculate.** roles + labels (Calculate also
   `accessibilityState={{ disabled }}`).

### COPY CHANGES
None.

### What to keep (with evidence)
- The calculation flow, the approach cards, the primer link, and all copy. [Salt
  Design System; Baymard]

### IMPACT / EFFORT
- **Impact: Medium.** The selectors and inputs were largely invisible to a screen
  reader on a data-entry calculator; a11y refs went 2 → 21.
- **Effort: Low–Medium.** One `PillGroup` fix plus several controls. eslint 0
  problems; the NutritionTargets mount fuzz (35 tests) stays green.

### SOURCES
- Salt Design System — selectable card pattern:
  https://www.saltdesignsystem.com/salt/patterns/selectable-card
- Baymard — input field best practices:
  https://baymard.com/learn/input-fields
