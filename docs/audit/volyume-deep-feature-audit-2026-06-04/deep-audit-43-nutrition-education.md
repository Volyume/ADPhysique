# Deep Feature Audit — Item 42: Nutrition Education screen

**Document:** deep-audit-43-nutrition-education.md
**Item:** 42 of master inventory (screen #42 — `NutritionEducationScreen` ⤴; nutrition primer, also onboarding)
**File:** `src/screens/NutritionEducationScreen.js` (293 → 289 lines), reusable `Section`/`Body`/`KeyPoint`/`MacroLine`/`PhaseLine`/`BulletRow`, `BackHeader`
**Status:** IMPLEMENTED (approved 2026-06-04, "Approve"). Added `accessibilityRole="header"` to the `Section` title (applies to all six sections) so screen-reader users can navigate by heading, and removed the 4 dead `teaser*` styles left from the removed "Coming soon" teaser. No behaviour or copy change.
**Timestamp:** 2026-06-04

---

## STEP A — CURRENT STATE AUDIT

### What it is and what it does
A read-only 5-minute nutrition primer in six sections (calories, the three
macros, setting your numbers, how to track, adherence beats perfection, the coach
does the adjustments), built from reusable content blocks. `BackHeader` at the
top. Linked from Nutrition Targets and used in onboarding.

### Findings
1. **Exemplary copy.** Plain, specific, friendly, non-judgemental ("Miss a day?
   Don't double up the next day."). Correct typography throughout — en-dash
   ranges, ±, ≈, **no banned em dashes, no AI tells**. The "Coming soon" teaser
   was already removed per the design rule, with a documenting comment.
2. **4 dead `teaser*` styles** left from that removal: `teaser`, `teaserIconWrap`,
   `teaserTitle`, `teaserBody` (0 refs each, verified).
3. **A11y.** No interactive controls to label, and `BackHeader` is already
   accessible. But the six section titles were not marked as headings, so a
   screen-reader user could not jump between sections on a long read.

### Design assessment (values cited)
- On-system: `surface` section cards with tinted icon chips (per-section `warning`
  / `primary` / `success`), `primaryBg` key-point callouts with a left rule,
  `surface2` phase lines, lettered bullet chips, scale tokens. No fingerprints; the
  "Coming soon" filler was already gone.

### Flow / integration assessment
- Pure presentational screen; no data or controls beyond the back header. Reads
  linearly. Sound.

---

## STEP B — RESEARCH (live web, 2026-06-04)

- Long-form content should mark section titles with `accessibilityRole="header"`
  so screen-reader users can **navigate by heading**; each screen should expose at
  least one header. This is the basis for the heading-semantics change. [RN AMA;
  React Native a11y]

---

## STEP C — COMPARISON

### Where Volyume leads
- A genuinely well-written, on-brand primer with zero "coming soon" filler.

### Where Volyume lags
- 4 dead styles and no heading semantics (both fixed).

### Critical gaps
- None.

---

## STEP D — PROPOSAL (as implemented)

### Specific changes — one by one
1. **`accessibilityRole="header"`** on the `Section` title (one line in the shared
   block → all six sections), so screen-reader users can navigate by heading.
   [A11y — Low]
2. **Remove the 4 dead `teaser*` styles.** [Cleanup — Low]

### COPY CHANGES
None.

### What to keep (with evidence)
- All the content and copy as-is. [RN AMA]

### IMPACT / EFFORT
- **Impact: Low.** Cleanup plus a real navigation aid on a long read.
- **Effort: Low.** eslint 0 problems; all NutritionEducation screen-mount variants
  pass (incl. a11y and random-tap fuzz).

### SOURCES
- React Native AMA — Headers:
  https://nearform.com/open-source/react-native-ama/guidelines/headers/
- React Native — Accessibility (header role):
  https://reactnative.dev/docs/accessibility
