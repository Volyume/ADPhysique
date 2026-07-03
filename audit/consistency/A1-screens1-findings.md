# A1 — Screens slice 1 findings

Slice (edit-ownership, exclusive): `src/screens/*.js` from `ActiveWorkoutScreen.js`
through `ImportScreen.js` inclusive (26 files, including HomeScreen).

Audited against VOLYUME's own standards (`audit/consistency/_STANDARDS.md`,
`docs/rules/styling.md`, `CLAUDE.md` §2–3, `src/styles/theme.js`).

Baseline lint: 0 errors, 24 warnings. After fixes: 0 errors, 1 warning
(the pre-existing unused-var below, out of scope).

---

## 1. Language

### 1.1 Em dashes in comments — FIXED (safe-fix rule 2)
- **110** em dashes (U+2014) across the slice, ALL in code comments (JS `//` and
  JSX `{/* */}` blocks). Verified none in user-facing `Literal`/`JSXText`
  (the em-dash lint rule targets those and reported 0 errors at baseline).
- Fix: mechanical `" —"` → `","` (space + em dash to comma), preserving the
  trailing space. Arrows (`→`), middots (`·`) and box-drawing (`─`) left
  untouched. Spot-checked for double-punctuation artefacts: none.
- Severity: minor. Fix-applied.

### 1.2 Curly apostrophe → straight — FIXED
- `AddCustomFoodScreen.js:242` `You’ve saved this barcode before…` used a curly
  apostrophe (U+2019) against the app's overwhelmingly straight convention
  (264 `'s`, 123 `'t`, etc., all straight). Ordinary UI copy (barcode dedupe
  notice), not safety copy. Fixed to straight `'`.
- Severity: minor. Fix-applied.

### 1.3 Ellipsis character consistency — FIXED (safe-fix rule 8)
- App convention is the single Unicode `…` (all loading strings: `Saving…`,
  `Starting…`, `Reading your file…`; and half the placeholders). Two
  three-dot `...` placeholders in the slice were the deviation, one an exact
  duplicate of an existing `…` placeholder:
  - `ActiveWorkoutScreen.js:2324` `"Add a note..."` → `"Add a note…"`
  - `BuildWorkoutScreen.js:405` `"Search exercises..."` → `"Search exercises…"`
    (another screen already ships `"Search exercises…"`).
- Severity: minor. Fix-applied.

### 1.4 US spellings in copy — NONE FOUND
- No `fibre/fiber`, `colour/color`, `favourite/favorite`, `grey/gray`,
  `programme/program`, `maths/math` drift in user-facing strings. `lbs`/`kg`
  are user-selected units, not spellings. `behavior`/`colors`/`center`/
  `canceled` hits are all code identifiers / RN + Expo APIs.

### 1.5 Brand casing — CLEAN
- All user-facing brand mentions read `Volyume` (e.g. `Article9ConsentScreen`).
  Lowercase `volyume` occurrences are all identifiers (AsyncStorage keys,
  testIDs, `KEEP_AWAKE_TAG`) — left per rule 7.

### 1.6 AI-speak / filler — 1 flagged (comment only), none in copy
- No filler in user-facing copy. One instance in a comment
  (`CoachOutputScreen.js:2309` `"Seamless next-week meal setup…"`). Flagged in
  decisions; comment, not copy, so not auto-edited.

---

## 2. Visual / tokens

### 2.1 Hardcoded hex/rgba — NONE actionable
- Only hex literals in the slice are the plate-colour map in
  `ActiveWorkoutScreen.js:71–77`, a documented deliberate exception
  (comment L67). None equal a theme token. No safe-fix; left as-is.

### 2.2 Off-scale spacing / raw sizes — none introduced; none found needing a
  token swap that maps exactly. (Out-of-scope deep spacing sweep not run;
  no obvious raw literal matched a token 1:1.)

---

## 3. Professionalism / accessibility

### 3.1 Missing accessibility descriptors — FIXED (safe-fix rule 5), 23 total
All 23 pre-existing `react-native-a11y/has-valid-accessibility-descriptors`
warnings cleared. Matched existing house patterns
(`accessibilityLabel={\`Target weight in ${units}\`}` for inputs;
`accessibilityRole="button" accessibilityLabel="Close"` for dismiss backdrops,
mirroring `src/components/BottomSheet.js`).

TextInputs given `accessibilityLabel` (7):
- `ActiveWorkoutScreen.js:2320` note input → "Add a note"
- `ActiveWorkoutScreen.js:2345` cluster reps → "Mini-set reps"
- `BuildWorkoutScreen.js:321` → `Starting weight in ${units}`
- `BuildWorkoutScreen.js:405` search → "Search exercises"
- `ExerciseDetailScreen.js:829` → `Target weight in ${units}`
- `ExerciseDetailScreen.js:840` → "Target date, optional"
- `FirstRunScreen.js:63` → "First name"

Dismiss backdrops given `accessibilityRole="button"` + `accessibilityLabel="Close"` (11):
- `ActiveWorkoutScreen.js` sheet overlays ×5 (set-type, warm-up ramp, plates,
  overflow, execution)
- `ExerciseDetailScreen.js:816` goal modal backdrop
- `DiaryScreen.js` moveBackdrop ×3 (move-to, save-as-meal, copy-day)
- `HomeScreen.js` sheetBackdrop ×2 (block-shape, change-workout)

Buttons with visible text given `accessibilityRole="button"` (5, all HomeScreen):
- proRecoverBtn ("Build my plan"), coachingNudgeBtn ("Open check-in"),
  sheetCancel ("Close"), sheetCancel ("Cancel"), intentSkip ("Skip")

HomeScreen note: only interactive-element roles/labels added — banner precedence
logic and any coaching/safety copy untouched.

### 3.2 Placeholder / TODO / debug copy — NONE in user-facing surfaces.

### 3.3 Dead taps — none identified in this slice.

---

## Out of scope / mention-only
- `BodyMetricsScreen.js:719` — pre-existing lint warning: `'saved' is assigned
  a value but never used`. Unrelated dead code; not a copy/token/a11y finding.
  Mentioned per "mention, don't fix".

---

## Fix counts by category
- Language — em dash → comma (comments): 110
- Language — curly apostrophe → straight: 1
- Language — ellipsis `...` → `…`: 2
- Accessibility — descriptors added: 23
- **Total safe fixes applied: 136**

## Verification
- `npx eslint` (whole slice): 0 errors, 1 pre-existing warning (BodyMetrics
  unused var, out of scope).
- `npx jest --runInBand` on covering suites: 6 suites / 641 tests pass
  (screen-mount, DiaryScreen ×2 guards, ExerciseDetailScreen.logic,
  FoodInsightsScreen, FoodSearchScreen) plus 7 source-reading guard suites /
  48 tests pass (activationBanner, coachLedger.wiring, fullFlowAudit,
  motionFitRules, partnerPlacementSpine, FoodSearchScreen.holdHint,
  FoodSearchScreen.savedMealRelog).
