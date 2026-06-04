# Deep Feature Audit — Item 27: Add Custom Food screen

**Document:** deep-audit-28-add-custom-food.md
**Item:** 27 of master inventory (screen #25 — `AddCustomFoodScreen`; Diary sub-stack, create-a-custom-food modal)
**File:** `src/screens/AddCustomFoodScreen.js` (288 lines), local `Field` / `NumField` components, `Button`, libs `food/db` (`insertCustomFood`, `logFoodEntry`), `food/sanityChecks`, `food/ocrParser` (`fieldNeedsCheck`), `engineTelemetry`
**Status:** IMPLEMENTED (approved 2026-06-04, "Approve"). Added a role + label to the icon-only header close; gave the `Field` / `NumField` inputs an `accessibilityLabel` (RN does not associate a sibling `Text` label with a `TextInput`), with an `accessibilityHint` on amber "unsure" number fields so that colour-only state is announced; normalised one curly apostrophe. Attribute-only (plus the apostrophe); no behaviour, layout, or copy-meaning change.
**Timestamp:** 2026-06-04

---

## STEP A — CURRENT STATE AUDIT

### What it is and what it does
The manual custom-food form: name + brand, per-100g macros (calories / protein /
carbs / fat / fibre), serving + eaten grams, then "Save and add to diary". It
accepts OCR prefill (name, macros, per-field confidence) and a barcode-miss
prefill, runs a macro **sanity check** before saving ("Numbers look off" → Edit /
Save anyway), **denormalises** the logged entry at save time (scales per-100g to
the eaten quantity so later edits to the custom food do not rewrite history), and
fires funnel telemetry (`custom_food_created` + the follow-on `food_logged`).
Fields the OCR could not confirm render with an **amber border** and an "Amber
figures aren't certain, check them." note that clears as the user edits.

### Findings
1. **Strong, focused form.** Sanity check + denormalised logging + OCR-confidence
   flags is more careful than a plain add form. Clean: **no dead styles, 0 em
   dashes, tokens throughout**, and the save-failure toast is the terse shape the
   voice rules want ("Couldn't save. Try again.").
2. **A11y gaps.** The **header close X was icon-only with no role or label**
   (priority). The `Field` / `NumField` inputs have a visible `<Text>` label, but
   React Native does not associate a sibling label with a `TextInput`, so a screen
   reader announced no field name on focus. The amber "unsure" state was conveyed
   by **colour only**. The Save button was already fine (the shared `Button` sets
   `accessibilityRole="button"` + label).
3. **Copy clean.** One cosmetic nit: the unsure note used a curly apostrophe where
   the rest of the file uses straight ones.

### Design assessment (values cited)
- On-system: `inputBg` fields with `border`, `primary` amber border for the
  unsure state (the brand affordance doubling as the confidence cue), uppercase
  `textSecondary` section labels, scale tokens. The 2-up macro rows are a sensible
  form layout, not decorative stat tiles. No fingerprints.

### Flow / integration assessment
- `canSave` gates on a name, non-negative kcal, and a positive serving. Save runs
  the sanity check (blocking confirm on failure), inserts the custom food, logs a
  denormalised entry at this slot/date, then returns to the picker/diary. OCR and
  barcode prefills flow in via route params; the confidence map drives the amber
  flags and clears on edit. Sound.

---

## STEP B — RESEARCH (live web, 2026-06-04)

- A React Native `TextInput` needs an explicit `accessibilityLabel` — a visible
  sibling `Text` is not associated with the input, so the field otherwise reads as
  unlabelled. Use the label text as the input's `accessibilityLabel` (plus a hint
  where useful). [React Native a11y; RN AMA]
- State conveyed by colour alone (the amber "unsure" border) must also be exposed
  non-visually, hence the `accessibilityHint` on unsure fields. [React Native a11y]

---

## STEP C — COMPARISON

### Where Volyume leads
- OCR-confidence amber flags + the macro sanity check give more guidance than a
  bare custom-food form, and the denormalise-at-log-time design protects history.

### Where Volyume lags
- The a11y gaps (finding 2): unlabelled inputs, icon-only close, colour-only
  unsure cue.

### Critical gaps
- None functional.

---

## STEP D — PROPOSAL (as implemented)

### Specific changes — one by one
1. **Header close X.** `accessibilityRole="button"` + `accessibilityLabel="Close"`.
   [A11y — Low, priority]
2. **`Field`.** `accessibilityLabel={label}` on the `TextInput`. [A11y — Low]
3. **`NumField`.** `accessibilityLabel` composed from the label + unit where the
   unit is not already implied (`${label}, grams` for gram fields), and
   `accessibilityHint="Not certain, check this value"` when `unsure`, so the amber
   state is announced. [A11y — Low]
4. **Cosmetic.** Normalised the one curly apostrophe in the unsure note.

### COPY CHANGES
None of meaning. Only the curly→straight apostrophe.

### What to keep (with evidence)
- The form layout, the macro sanity check, OCR prefill/confidence flags,
  denormalised logging, and all copy. [React Native a11y]

### IMPACT / EFFORT
- **Impact: Low–Medium.** The macro inputs were unlabelled to a screen reader (a
  real blocker for filling the form blind), plus the icon close and the
  colour-only unsure cue.
- **Effort: Low.** Attribute-only (plus one apostrophe). eslint 0 problems. The
  screen is a route-param modal, so it is not in the screen-mount sweep; lint is
  the gate and the change is additive a11y attributes.

### SOURCES
- React Native — Accessibility:
  https://reactnative.dev/docs/accessibility
- React Native AMA — TextInput / Accessibility Label:
  https://nearform.com/open-source/react-native-ama/guidelines/accessibility-label/
