# A4 - Components & Navigation - decisions for the founder (flag-only)

These are NOT auto-fixed. Each needs a founder call. File:line + why below.

---

## 1. BlockProgressCard.js:25 - en-dash placeholder glyph in user-facing copy
```
: ` · Effort ${currentMesoWeek.rirTarget != null ? `${5 - currentMesoWeek.rirTarget}/5` : '–'}`
```
- The `'–'` (en-dash, U+2013) renders as the "no effort value" placeholder, e.g.
  the subtitle reads "· Effort –". `_STANDARDS` treats en-dash in user copy as a
  safe-fix, BUT en-dash is used **deliberately app-wide** as the numeric-range
  separator (rep ranges "6–12", "30–45°" across ActiveWorkout/RoutineDetail/
  ExerciseDetail etc. - all untouched). So this standalone placeholder is
  plausibly a deliberate typographic choice, not drift.
- **Decision needed:** (a) change to a plain hyphen `'-'`; (b) change to an
  em-dash-free word e.g. `'—'`->no; (c) leave as deliberate. Recommend NOT
  pre-deciding; it is a visible glyph on a training-block surface.

## 2. FeedbackSheet.js - hardcoded animation durations (motion-token drift)
`163/167/197/201`: `duration: reduceMotion ? 0 : 220 / 280 / 180`.
- `220` equals `motion.exit` exactly; `280`/`180` have no matching token
  (`motion.sheet` = 260, nearest). Reduce-Motion is correctly gated; only the
  numeric literals are off-token.
- Flag not fixed: converting only `220` while `280`/`180` stay raw would make one
  file internally inconsistent, and these read as deliberately tuned sheet
  timings (behaviour-adjacent). **Decision:** retune all three onto tokens
  (which tokens?) or leave as bespoke.

## 3. PRCelebration.js - hardcoded durations in the celebration hero
`64/182`: `duration: 600` (particle fade); `166`: `duration: 300` (card fade-in).
- No exact `motion.*` token (nearest: state 200, sheet 260, enter 320, hero 440).
  This is the one sanctioned celebration moment, so bespoke timing may be
  intended. **Decision:** map to `motion` tokens or keep bespoke.

## 4. Primitive duplication - un-migrated hand-rolled sheets (behaviour risk; DO NOT refactor blind)
- `FeedbackSheet.js:237` and `PeekMenu.js:107` each hand-roll a `<Modal>` +
  `Animated` slide-in + scrim, duplicating the `BottomSheet` primitive.
- `BottomSheet.js`'s own header states it was "Extracted from the hand-rolled
  sheets the audit found duplicated 6 times (QuickAdd, FoodDetail,
  MacroBreakdown, Feedback, WhatsNew, PeekMenu)" - yet **Feedback and PeekMenu
  were never migrated** (the other four were). These are the last two un-swapped.
- Not swapped here: FeedbackSheet has a multi-step form + custom offscreen
  distance; PeekMenu is an anchored context menu, not a bottom sheet - both
  carry prop/behaviour differences, so a like-for-like swap is not safe without
  a test plan. **Decision:** schedule the migration onto `BottomSheet` (with a
  written test plan) or record these two as intentional exceptions.

## 5. Off-scale layout literals (minor drift; no exact token to auto-map)
- `RootNavigator.js:541` + `VolyumeTabBar.js:143`: icon `size: 22` - off the
  `iconSize` scale (sm16/md20/lg24/xl32); consistent with each other but no
  token. VolyumeTabBar pill constants `PILL_WIDTH 56 / PILL_HEIGHT 26` and
  `height: 60 / paddingBottom/Top: 4` are tuned bar geometry (comment-justified).
- `Skeleton.js:68`: `marginTop: 10` (off `spacing` scale); `SkeletonCard`/`Row`
  dimension literals are placeholder sizes.
- These are size literals with **no exact-match token**, so per the safe-fix
  rule they are FLAG-only (do not invent tokens / edit theme.js).
  **Decision:** add tokens (e.g. an `iconSize` step for 22) or accept as tuned
  layout constants.

## 6. Pre-existing a11y lint warnings in touched files (not introduced here)
`npx eslint` reports 13 warnings (0 errors) across:
- `ProGate.js` (104/121/126/203/211), `TodayStrip.js` (206/215/229),
  `StreakWeeksSection.js:187` - `Pressable`/`Touchable` missing
  `accessibilityRole`/label (react-native-a11y/has-valid-accessibility-descriptors).
- `RestTimer.js:380` - `no-nested-touchables` (accessible container wrapping a
  clickable child).
- These pre-date this audit. Not auto-fixed because adding labels/roles here
  risks tripping the nested-touchable and duplicate-label rules and touches
  interaction structure (behaviour). **Decision:** fold into a dedicated a11y
  pass with device verification, or fix individually with review.

## 7. Terminology (informational, orchestrator canon)
- Tab titles: HomeTab is titled "Train" (route name `HomeTab`), ProfileTab
  titled "You". "workout" vs "session" both appear in nav titles ("Workout
  complete", "Workout History") and comments. Not canonicalised here - listed
  for the orchestrator's cross-slice terminology decision.
