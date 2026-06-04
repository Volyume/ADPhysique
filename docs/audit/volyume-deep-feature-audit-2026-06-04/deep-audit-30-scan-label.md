# Deep Feature Audit — Item 29: Scan Label (OCR) screen

**Document:** deep-audit-30-scan-label.md
**Item:** 29 of master inventory (screen #27 — `ScanLabelScreen`; Diary sub-stack, nutrition-label OCR modal)
**File:** `src/screens/ScanLabelScreen.js` (363 lines), libs `react-native-vision-camera`, `food/ocr` (`isOcrConfigured`, `recogniseText`, `recogniseBlocks`), `food/ocrParser` (`parseNutritionLabel`), `food/labelName` (`pickProductName`), `food/writeback` (`queueContribution`, `getConsent`), `Button`
**Status:** IMPLEMENTED (approved 2026-06-04, "Approve"). Added roles + labels to the three header close buttons and the "Skip name" button; gave the torch toggle a button role, a `selected` state, and an on/off label so its state is announced rather than colour-only; normalised one curly apostrophe in user copy. Attribute + one apostrophe; no logic, behaviour, layout change. The four required eslint-directive descriptions (`-- ...`) and the documented camera-convention raw-hex exemptions were left untouched.
**Timestamp:** 2026-06-04

---

## STEP A — CURRENT STATE AUDIT

### What it is and what it does
Two-step nutrition-label capture, the Cronometer pattern: front-of-pack photo to
read the product name, then the nutrition panel to parse macros, both via
vision-camera + on-device MLKit text recognition, then a `replace`-navigate to
`AddCustomFood` with name / macros / per-field confidence prefilled. It degrades
to "Type it in" when the OCR native module isn't in the running binary, queues an
Open Food Facts contribution when the user has consented and a barcode is
attached, and carries the full permission flow with manual-entry fallbacks. Two
entry contexts: a `prefillBarcode` miss (top banner) or a direct "snap a label".

This is a **runtime-critical** screen (camera, OCR, AppState, write-back), so the
changes were kept attribute-only with no logic touched.

### Findings
1. **Mature, careful scanner.** Two-step capture, graceful OCR degradation,
   consent-gated write-back, resilient catch paths (a front-step error advances
   to the panel; a panel-step error still hands off to manual entry with the name
   kept). The capture button already had a role + dynamic label; permission and
   fallback actions use the shared `Button` (role covered). Clean: **no dead
   styles, no em-dash character.** The raw-hex camera-convention colours (black
   viewport, white capture ring, black shutter dot) are legitimately exempted with
   documented eslint-disables, and all four `--` in the file are **required
   eslint-directive descriptions**, not prose.
2. **A11y gaps remaining.** The header **close X** (all three render states) and
   the **torch toggle** lacked roles/labels (torch state colour-only), and the
   **"Skip name"** button had no role.
3. **Copy clean and on-voice.** One cosmetic nit: line 264 used a curly apostrophe
   ("we'll") where the codebase uses straight ones in user copy.

### Design assessment (values cited)
- On-system: amber `primary` capture button + frame border, `scrim` hint / miss
  banner / skip backgrounds, scale tokens. The black viewport, white capture
  ring, and black shutter dot are camera-UI convention, each carrying a documented
  `no-restricted-syntax` exemption. No fingerprints.

### Flow / integration assessment
- `step` drives the two-shot flow; `busy` guards re-entry; `isActive = focused &&
  appActive` pauses the camera off-screen. Capture reads, advances or hands off,
  and the OFF write-back fires on capture (gated on consent + barcode). Sound.

---

## STEP B — RESEARCH (live web, 2026-06-04)

- Cronometer's two-step capture (front of pack for the name + nutrition panel for
  the macros → an auto Custom Food) is the named reference pattern for label OCR;
  Volyume matches it, including the barcode-miss → label-scan handoff. [Cronometer]
- Torch toggle and modal close a11y per the prior scanner research: a labelled
  button with an announced on/off state. [Scandit; React Native a11y]

---

## STEP C — COMPARISON

### Where Volyume leads
- Two-step OCR + consent-gated OFF write-back + graceful degradation to manual
  entry is more than a single-shot label scan. [Cronometer]

### Where Volyume lags
- A11y on close / torch / skip-name; torch state colour-only.

### Critical gaps
- None functional.

---

## STEP D — PROPOSAL (as implemented)

### Specific changes — one by one
1. **All three header close buttons.** `accessibilityRole="button"` +
   `accessibilityLabel="Close"`. [A11y — Low, priority]
2. **Torch toggle.** `accessibilityRole="button"` +
   `accessibilityState={{ selected: torch }}` + label "Torch on" / "Torch off".
   [A11y — Low]
3. **"Skip name" button.** `accessibilityRole="button"` +
   `accessibilityLabel="Skip name"`. [A11y — Low]
4. **Cosmetic.** Normalised the line-264 curly apostrophe.

### COPY CHANGES
None of meaning. Only the curly→straight apostrophe.

### What to keep (with evidence)
- The two-step capture, OCR degradation, consent write-back, the permission flow,
  and all user copy. [Cronometer]

### IMPACT / EFFORT
- **Impact: Low–Medium.** Close / torch / skip were unreachable or ambiguous to a
  screen reader; the torch state was colour-only.
- **Effort: Low.** Attribute-only plus one apostrophe; no logic touched on a
  runtime-critical screen. eslint 0 problems; the four eslint directives remain
  intact. No dedicated test and not in the screen-mount sweep (camera-dependent);
  lint is the gate.

### SOURCES
- Cronometer — barcode/label scanner (two-step capture, OCR autofill):
  https://cronometer.com/blog/best-barcode-scanner/
- Scandit — barcode scanner overlay (torch button label/state):
  https://docs.scandit.com/stable/phonegap/class_scandit_1_1_scan_overlay.html
- React Native — Accessibility:
  https://reactnative.dev/docs/accessibility
