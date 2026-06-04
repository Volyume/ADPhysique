# Deep Feature Audit — Item 28: Scan Barcode screen

**Document:** deep-audit-29-scan-barcode.md
**Item:** 28 of master inventory (screen #26 — `ScanBarcodeScreen`; Diary sub-stack, barcode-scan modal)
**File:** `src/screens/ScanBarcodeScreen.js` (277 lines), libs `react-native-vision-camera`, `food/waterfall` (`resolveBarcode`), `expo-haptics`, `errorLog`, `observability`
**Status:** IMPLEMENTED (approved 2026-06-04, "Approve"). Added roles + labels to the three header close buttons and the two permission buttons; gave the torch toggle a button role, a `selected` state, and an on/off label so its state is announced rather than colour-only; normalised two `--` em-dash substitutes in comments. Attribute + comment only; no logic, behaviour, layout, or user-copy change.
**Timestamp:** 2026-06-04

---

## STEP A — CURRENT STATE AUDIT

### What it is and what it does
Live camera barcode scan on `react-native-vision-camera`. A robust permission
flow (not-determined → spinner; permanently denied → Open Settings; re-askable →
Allow camera, with a documented Android 16 `denied` quirk), re-arm on focus, the
camera paused while backgrounded or unfocused (`isActive = focused && appActive
&& !resolving`), a `scanLock` ref against double-fire, a success haptic, a torch
toggle, and a waterfall `resolveBarcode` that routes a hit to `FoodSearch`
(`scannedFood`) and a miss to `ScanLabel` (`prefillBarcode`).

This is a **runtime-critical** screen (camera, permissions, AppState background
handler), so the changes were kept attribute-only with no logic touched.

### Findings
1. **Well-built, careful scanner.** The permission resilience, the background
   pause, and the double-fire lock are all sound; the catch path re-arms on a
   resolve throw while a successful navigate intentionally leaves the lock set
   (focus re-arms on return). Clean: **no dead styles, no em-dash character,
   tokens throughout.** No functional bug found.
2. **A11y entirely absent** (0 roles/labels). The header **close X** (present in
   all three render states) and the **torch toggle** are the priority: the close
   was icon-only with no label, and the torch's on/off state was conveyed by
   colour only. The two permission buttons also lacked a role.
3. **Two `--` em-dash substitutes in comments** (lines 19, 48); the no-em-dash
   rule covers code comments.
4. **Copy is clean and on-voice.** Short, factual, no AI tells ("Camera access
   needed", "Point at a barcode", "Looking it up"). Nothing to reword.

### Design assessment (values cited)
- On-system: amber `primary` reticle border (brand affordance), `scrim` hint and
  resolving-badge backgrounds, `primary` permission button + active torch glyph,
  scale tokens. No fingerprints; the camera surface is unchrome'd by design.

### Flow / integration assessment
- Permission states each render their own minimal header + body; the granted
  state renders the camera with the reticle overlay (pointer-events none) and a
  status hint. Resolve → replace-navigate so Back from the hit/miss landing
  returns here and re-arms. Sound throughout.

---

## STEP B — RESEARCH (live web, 2026-06-04)

- A torch/flashlight toggle should announce its state to a screen reader: a
  button role plus a "currently on/off" state and label so the user knows the
  current state and what a tap will do (Scandit's scanner exposes exactly this
  label + state + hint pattern). [Scandit]
- A modal/scanner close must be a labelled button (consistent with the
  dialog-pattern research from earlier items). [Scandit; W3C APG]

---

## STEP C — COMPARISON

### Where Volyume leads
- The permission resilience (Android 16 quirk), the background pause, and the
  double-fire lock are more careful than a basic scanner.

### Where Volyume lags
- A11y was absent; the torch state was colour-only.

### Critical gaps
- None functional.

---

## STEP D — PROPOSAL (as implemented)

### Specific changes — one by one
1. **All three header close buttons.** `accessibilityRole="button"` +
   `accessibilityLabel="Close"`. [A11y — Low, priority]
2. **Torch toggle.** `accessibilityRole="button"` +
   `accessibilityState={{ selected: torch }}` + label "Torch on" / "Torch off",
   so the state is announced rather than colour-only. [A11y — Low]
3. **Permission buttons** ("Open Settings" / "Allow camera").
   `accessibilityRole="button"`. [A11y — Low]
4. **Comments.** Normalised the two `--` to a full stop / colon. [Voice — Low]

### COPY CHANGES
None to user-facing copy. Only the two in-comment dash normalisations.

### What to keep (with evidence)
- The permission flow, background pause, scan lock, torch, haptic, and all user
  copy. [Scandit]

### IMPACT / EFFORT
- **Impact: Low–Medium.** The close and torch were unreachable/ambiguous to a
  screen reader; the torch state was colour-only.
- **Effort: Low.** Attribute-only plus two comment edits; no logic touched on a
  runtime-critical screen. eslint 0 problems. No dedicated test and not in the
  screen-mount sweep (camera-dependent); lint is the gate and the change is
  additive a11y attributes.

### SOURCES
- Scandit — barcode scanner overlay (torch button label/state/hint):
  https://docs.scandit.com/stable/phonegap/class_scandit_1_1_scan_overlay.html
- React Native — Accessibility (role / state / label):
  https://reactnative.dev/docs/accessibility
