# Layout & Responsiveness Audit — 2026-07-09

Scope: `src/screens/` (82 top-level screens) and `src/components/` (81
top-level components), audited against the founder's bar — the app must
display consistently from 320-360dp-wide / 640dp-tall phones up to large
phones, and the workout logger specifically must fit and fill the screen
without scrolling or feeling cramped for thumbs.

Method: full read of `CLAUDE.md`, `docs/audit/bottom-inset-inventory-2026-07-03.md`
and `src/styles/theme.js`, then a source sweep (grep + targeted file reads,
no device/simulator available in this environment — findings are static-code
evidence with device conditions reasoned from the actual layout maths, not
screenshots). Every item cites the exact file and line.

This is an audit only. No source files were modified.

---

## 0. Verification against the prior bottom-inset inventory (2026-07-03)

The founder GO'd a full inset rollout on 2026-07-03. Re-checked against
current code (2026-07-09), six days later:

**Confirmed still fixed / correct (do not re-open):**
- `ActiveWorkoutScreen.js:2503` bottom bar — `Math.max(spacing.md, insets.bottom + spacing.sm)`.
- `components/BottomSheet.js:128` — `Math.max(spacing.xxl + spacing.md, insets.bottom + spacing.lg)`.
- `components/FeedbackSheet.js:253`, `components/PeekMenu.js:120` — same pattern, confirmed present.
- `components/StreakWeeksSection.js:187` and `components/ProGate.js:106` inline
  upsell sheet — both now render through the shared `<BottomSheet>` (migrated
  off their old hand-rolled copies since the last audit), so they inherit the
  fix automatically.
- `screens/DiaryScreen.js:1079-1085` `selectionBar`/`scanFab` — both now read
  `useSafeAreaInsets()` and add `bottomInset` explicitly.
- `screens/WorkoutSummaryScreen.js:1326-1331` `stickyFooter` — confirmed still
  the deliberate flat token (comment at :1326 explains the tab band absorbs it).
- `screens/ScanBarcodeScreen.js` / `ScanLabelScreen.js` — top notch handled via
  `SafeAreaView edges={['top']}` on every returned state.

**Still NOT fixed — Severity A, live regression risk, unchanged since 2026-07-03:**
- **`screens/FoodSearchScreen.js`** — the file has **zero** occurrences of
  `useSafeAreaInsets` (confirmed via full-file grep). Its root
  `SafeAreaView` explicitly excludes the bottom edge
  (`FoodSearchScreen.js:932`, `edges={['top']}`), and the sticky `plateBar`
  footer (`FoodSearchScreen.js:1028`, styled at `:1283-1288`) has only
  `paddingVertical: spacing.md` (12dp) with no inset compensation at all.
  `FoodSearchScreen` is registered in `RootNavigator.js:298-302` as a root
  `Stack.Screen` with `presentation: 'modal'`, i.e. it lives entirely outside
  the tab navigator — per the inventory's own rule 1, this is exactly the
  class of surface that needs `Math.max(token, insets.bottom + lift)`, and it
  still has nothing. **Device condition:** any Android phone with 3-button
  nav or the gesture pill, or an iOS phone with the home indicator — the "Log
  N" plate button sits flush against/under the system bar. This is the single
  most concrete, currently reproducible instance of the exact bug class the
  2026-07-03 pass was meant to close everywhere.
- **`components/ProGate.js` `ProLocked`** (`:193`, `edges={['top','left','right']}`)
  — still no bottom inset handling, confirmed unchanged. Lower risk than the
  above: content is a vertically-centred `ScrollView` (`lockedScroll`,
  `:377-380`, `flexGrow:1, justifyContent:'center'`) with `padding: spacing.xl`
  as the only buffer, not a bar docked to the physical edge. On a short
  device where the locked copy + teaser + two buttons + restore link overflow
  the centred layout, the "Restore purchases" link can sit close to the
  gesture bar. Severity C given the low real-world frequency (a free user
  landing on a Pro-only deep link).

---

## 1. Fixed dimensions, stale `Dimensions.get()`, percentage misuse

**Severity B — module-scope `Dimensions.get('window')`, frozen at import time:**
Six sites compute a screen-width constant once, at module evaluation, and
never again:
- `screens/BodyMetricsScreen.js:110` `SCREEN_W`, consumed at `:191,290,350`
  for three chart widths.
- `screens/FoodInsightsScreen.js:76` `CHART_WIDTH`, consumed at `:388,480`.
- `screens/ExerciseDetailScreen.js:71` `SCREEN_W`, consumed at `:682`.
- `screens/YearOfLiftsScreen.js:40` `SCREEN_W` — used for **FlatList paging
  geometry**: `getItemLayout` (`:686`) and the scroll-offset → page-index
  calculation (`:682`) both key off this frozen value, plus the page's own
  `width: SCREEN_W` (`:762`). If actual runtime width ever differs from the
  import-time value, paging snaps to the wrong offset and pages render at the
  wrong width.
- `components/ProgressSections.js:14` `SCREEN_W`, used at `:101` to size a
  heatmap square grid.
- `components/PRCelebration.js:16` `SCREEN_WIDTH`/`SCREEN_HEIGHT`, used for
  particle-burst physics bounds.

`app.json` locks `orientation: "portrait"` (confirmed), which removes the
classic rotation trigger. The residual exposure is Android split-screen /
freeform multi-window resize, which changes the window's reported width
without a rotation event and without remounting these modules — RN's
`Dimensions.get` module constant does not react to that. Impact is cosmetic
(wrong chart width, wrong particle bounds) except **YearOfLiftsScreen**,
where it is a functional paging bug under multi-window. Fix pattern already
exists in this codebase: `components/RestTimer.js:351` uses
`useWindowDimensions()` (live-subscribing, re-renders on change) — that's the
right model, and it's already proven out for exactly this kind of
short-screen-aware layout decision (`RestTimer.js:352`
`const compact = windowHeight < COMPACT_HEIGHT`).

**Severity C — component-body `Dimensions.get()` (recomputed per render, not
frozen, but not reactive to a resize with no other trigger):**
- `components/ProgressPhotoCompare.js:449` and
  `components/ProgressPhotoViewer.js:156` both call `Dimensions.get('window')`
  inside the render body (not module scope), so a re-render picks up the
  correct value, but neither subscribes to dimension-change events the way
  `useWindowDimensions()` would. Lower severity than the module-scope group
  since a re-render is likely on the events that matter here (photo
  selection, page change) — flagged for consistency, not urgency.

**Fixed pixel dimensions:**
- `screens/ScanLabelScreen.js:411` `frame: { width: 280, height: 360, ... }`
  — the barcode-label scan guide box. On a 320dp-wide device this leaves only
  20dp of margin per side; not a touch target (decorative overlay on a
  full-bleed camera), so no functional break, but it is the one clearly
  hand-picked pixel box in the sweep rather than a proportion of the frame.
  Severity C.
- No other `width:`/`height:` literals above ~300px were found anywhere in
  `src/screens` or `src/components` (full-repo grep for 3-digit-plus literal
  width/height came back with only the ScanLabel frame).

**Percentage widths:** the sweep found ~40 uses of `'100%'`/`'47%'` etc.
Every one resolves to a fill-parent or a two-column half-width inside a
flex row with a `gap` token — none is a percentage-of-screen sized against
an unconstrained parent, so no overflow risk. No action needed here.

---

## 2. Touch targets (44dp minimum)

The codebase has an explicit contract for this:
`src/styles/layout.js` defines `touchTarget = { minimum: 44, android: 48 }`
and a `workoutLoggerSize` token table built on it, and the convention across
almost every icon-only button in the sweep (~90 `TouchableOpacity`s checked
across `screens/` and `components/`) is a visually-small icon wrapped in a
`hitSlop` that brings the effective hit area to 44dp or above. Examples
confirmed correct: `DiaryScreen.js:1769` (`waterBtn`, 36dp visual + `hitSlop:8`
→ 52dp), `PlansScreen.js:532` (`moreBtn`, 28dp + `hitSlop:12` → 52dp),
`RoutineDetailScreen.js:417` / `ManualBuilderScreen.js:1010`
(`reorderBtn` up/down, 32dp/26dp + `hitSlop:8`), `YearOfLiftsScreen.js:628,638`
(`shareBtn`/`closeBtn`, 30dp + `hitSlop:10` → 50dp). `SetEntry.js:107-158`
(the workout weight/reps steppers) is the strongest example: 36dp visual
button (`stepBtn`, `SetEntry.js:443-450`) + `STEPPER_HIT_SLOP` of 8dp on all
sides (`SetEntry.js:11`) → 52dp effective, comfortably clears the bar, and
supports long-press-repeat for rapid adjustment.

**Severity B — below 44dp with no hitSlop at all:**
- `screens/ActiveWorkoutScreen.js` exercise-navigator chips: `navTab`
  (`:3333`, `minHeight: workoutLoggerSize.exerciseTabMinHeight` = 36dp) has
  **no `hitSlop`**, at both call sites — the main logger's exercise strip
  (`:1974-1997`) and the empty-exercise-state strip in `EmptyExerciseView`
  (`:3264-3271`). This is the exercise-switcher used repeatedly through a
  multi-exercise session. `spacing.sm` gaps between chips (`exerciseNavContent`,
  `:3332`) reduce mis-tap risk somewhat, but the row itself is 8dp under the
  documented `layout.js` minimum and has no compensating hitSlop, unlike
  every other icon control in the same file.

**Severity C — right at the edge:**
- `screens/ManualBuilderScreen.js` `reorderBtn` (`:1324`, 26dp) + `hitSlop:8`
  on all sides (`:1010`) = 42dp effective — 2dp under the 44dp bar. Every
  other `reorderBtn` instance in the app (e.g. `RoutineDetailScreen.js:744`,
  32dp) clears it; this one specific button is marginal.

**Font-scaling interaction with a fixed circular touch target:**
- `screens/WorkoutHistoryScreen.js:862-869` `dayCircle` is a **fixed**
  `width: 30, height: 30` (not `minHeight`/`minWidth`) containing a day
  number (`dayNum`, `:880-883`, `...type.num('caption')`) with **no**
  `maxFontSizeMultiplier`. At the app's own Larger-Text toggle (1.2x,
  `theme.js:391-403`) stacked with an OS accessibility text scale (Android/
  iOS commonly go well past 1.3x for low-vision users), the numeral can
  outgrow the fixed 30dp circle. Because the parent `View`'s default overflow
  is visible, the digit doesn't clip so much as visually spill outside its
  circle in a tight 7-day calendar row, crowding into neighbouring days.
  Severity B on a large-font-scale device; every other numeral-in-a-badge
  spot found elsewhere in the sweep (e.g. `navTabBadgeText`,
  `ActiveWorkoutScreen.js:1993`) correctly caps at `maxFontSizeMultiplier={1.3}`
  — this is the one inconsistent case.

---

## 3. Safe areas

Coverage is broad: 71 of ~82 top-level screens use `SafeAreaView` directly,
and the 11 that don't (`SettingsAboutScreen`, `SettingsAccountScreen`,
`SettingsCoachingScreen`, `SettingsDataScreen`, `SettingsDisplayScreen`,
`SettingsHealthScreen`, `SettingsPrivacyScreen`, `SettingsProfileScreen`,
`SettingsScreen`, `SnapshotsScreen`) all delegate to the shared
`SettingsPage` wrapper in `components/SettingsPrimitives.js:58-63`, which
itself wraps `SafeAreaView edges={title ? ['top','bottom'] : ['bottom']}` —
confirmed correct, not a gap. `paywallExcerpts.js` is not a screen (a text
data module, no JSX).

The two real gaps are both already logged in Section 0 above
(`FoodSearchScreen` plateBar — Severity A; `ProGate.js` ProLocked — Severity C).
No additional un-handled bottom-edge sticky surface was found beyond those two
in this pass.

Notch/top-edge handling on the two full-bleed camera screens
(`ScanBarcodeScreen.js`, `ScanLabelScreen.js`) is consistently correct via
`edges={['top']}` on every state the screen can render.

---

## 4. Keyboard handling

10 screens use `KeyboardAvoidingView`: `ActiveWorkoutScreen`,
`ExerciseDetailScreen`, `LoginScreen`, `ManualBuilderScreen`,
`NutritionTargetsScreen`, `PlansScreen`, `ProOnboardingScreen`,
`ProUpgradeScreen`, `WeeklyCheckInScreen`, `WorkoutSummaryScreen`.

13 screens contain `TextInput`/`TextField` but no `KeyboardAvoidingView`:
`AddCustomFoodScreen`, `BodyMetricsScreen`, `BuildWorkoutScreen`,
`DiaryScreen`, `FirstRunScreen`, `MealNamesScreen`, `MyMealsScreen`,
`PartnerScreen`, `ProGoalSetupScreen`, `RecipeBuilderScreen`,
`RoutineDetailScreen`, `SettingsProfileScreen`, `VolumeHeatmapScreen`.

Checked each of these: every one puts its inputs inside a `ScrollView`
(RN's `ScrollView` auto-scrolls a focused `TextInput` above the keyboard via
its built-in responder logic, so the absence of `KeyboardAvoidingView` is not
automatically a bug). The specific risk `KeyboardAvoidingView` protects
against — a **sticky/fixed element below the scroll area** getting covered by
the keyboard — was checked on the screens most likely to have one:
- `AddCustomFoodScreen.js` — the "Save and add to diary" button is the last
  item **inside** the `ScrollView` (`:336-343`), not a fixed footer. Low risk.
- `BuildWorkoutScreen.js` — the footer (`:337`, `styles.footer` at `:582-587`)
  sits in normal flex flow below the `ScrollView`, not absolutely positioned,
  and every `TextField` on this screen is `keyboardType="number-pad"` /
  `"decimal-pad"` (`:266-322`), i.e. a short numeric keyboard, not the full
  QWERTY that would need the most vertical clearance. Low risk.
- `RecipeBuilderScreen.js` — "Save" is inside the `ScrollView`
  (`contentContainerStyle={{ paddingBottom: spacing.xxl }}`, `:327`). Low risk.

No screen in this list was found with a genuinely fixed/absolute bottom bar
sitting below a keyboard-obscured `TextInput`. Severity C at most (worth
standardising on `KeyboardAvoidingView` for consistency, not because a break
was found).

`ActiveWorkoutScreen.js:1919` wraps the whole screen in
`KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}`
— correct for the note-input and cluster-reps `TextInput`s that can appear
mid-scroll.

---

## 5. Font scaling

`allowFontScaling` is never explicitly set to `false` anywhere in
`src/screens` or `src/components` (zero matches) — i.e. the app never
overrides RN's accessible default, which is correct and deliberate.

`maxFontSizeMultiplier` is used 22 times, consistently on **hero numerals in
fixed-size containers** where uncapped growth would break a badge/circle
(`RestTimer.js:392,394` countdown numeral capped at 1.15x, `SetEntry.js`
weight/reps/stepper text capped at 1.3x throughout, `ActiveWorkoutScreen.js:1993,3269`
nav-tab set-count badges capped at 1.3x). This is a coherent, deliberately
applied pattern, not ad hoc.

The one inconsistency found is `WorkoutHistoryScreen.js`'s `dayCircle`/`dayNum`
(Section 2 above) — a fixed-size numeral container with no cap, the only one
of its kind identified in the sweep.

`applyAccessibility()` (`theme.js:359-404`) also offers an in-app 1.2x
"Larger Text" toggle that multiplies every `fontSize` token, stacking with
the OS-level scale. No fixed-height row (as opposed to fixed-size circular
badge) was found elsewhere that would visibly clip two-line text at this
combined scale — the sweep's `numberOfLines` audit (Section on
ActiveWorkoutScreen below) shows text-heavy rows consistently use
`numberOfLines` + `flex:1` wrapping rather than a hard pixel height.

---

## 6. ScrollView / tab-bar interaction

`VolyumeTabBar.js` (the custom bottom tab bar) is explicitly **not**
absolutely positioned — its own header comment states the design intent
directly: *"Anchored, not floating (blur is banned by the Android-first
material rule; a floating dock steals the reclaimed edge-to-edge list
height)."* Confirmed in the styles (`VolyumeTabBar.js:162-168`, `bar` has no
`position: 'absolute'`; only the internal `pill` cushion and `badgeDot`
decorations are absolutely positioned *within* the bar). Passed as a custom
`tabBar` component, React Navigation reserves layout space for it in the
normal way, so screen `ScrollView`s do **not** need to pad for the tab bar's
own height — the flat `paddingBottom: spacing.xxl/xxxl` tokens seen on
`HomeScreen.js:2366`, `DiaryScreen.js:1970`, `PlansScreen.js:1071`,
`YouScreen.js:474` are just normal "let the last card breathe" padding, not
inset-absorption, and are correct as written. No content-under-tab-bar bug
was found; this was checked specifically because it's a common RN pitfall
and the codebase avoids it.

No nested-ScrollView-inside-ScrollView pattern was found in the audited
files (horizontal `ScrollView`s for chip rows/exercise nav are always
siblings of, not children of, another scrollable, which is correct).

---

## 7. Workout logger deep dive — `ActiveWorkoutScreen.js` (3,668 lines) + `RestTimer.js` + `SetEntry.js` + `ExercisePickerModal.js`

### Verdict: largely already engineered to the founder's bar, with one real short-screen squeeze case and two smaller gaps.

This is not a screen that was overlooked. The file's own comments show at
least three prior audit passes aimed at exactly this brief — `COMP-001`
("recovering ~32pt of vertical space", "so the beat line + inputs stay above
the fold"), `U-A-1` ("collapse the banner stack into one tappable 'N notes'
rail"), and `CL-4`/`A2` ("the PRIMARY action moved to the bottom-pinned bar,
the one-handed thumb zone, at a stable position"). Concretely:

- **Primary action is always in the thumb zone, never requires scrolling.**
  "Log set" / "Finish workout" / "Next exercise" render in a `View` outside
  and below the main `ScrollView` (`ActiveWorkoutScreen.js:2502-2503`,
  `styles.bottomBar`), fixed at the bottom of the screen with the inset
  handling confirmed correct in Section 0. Whatever else is happening
  higher up the screen, the one button the user needs after every set is
  always reachable without scrolling.
- **Banner stacking is collapsed by design.** Up to five different
  cue banners (starter/time-crunch, superset, next-time note, deload,
  target-reached) can theoretically all be true at once; instead of stacking
  them, they collapse into a single "N cues" chip (`ActiveWorkoutScreen.js:2124-2140`)
  that expands on tap — this is a direct, on-record fix for the exact
  "too much stuff above the fold" failure mode the founder's brief describes.
- **`RestTimer.js` already uses live, reactive sizing, not stale
  `Dimensions.get`.** `useWindowDimensions()` (`RestTimer.js:351`) drives a
  `compact` mode below 700dp window height (`COMPACT_HEIGHT`, `:46`),
  shrinking the row from `minHeight:64` to `56` and the hero numeral from
  26px to 22px (`:461,476,478`) specifically for short screens. This is the
  right pattern and should be the model for the stale-`Dimensions.get` sites
  flagged in Section 1.
- **Touch targets in the set-entry card are correct.** The weight/reps
  steppers are 36dp visual with an 8dp hitSlop (52dp effective,
  `SetEntry.js:443-450` + `:11`), support long-press-repeat, and the reps
  field's Done key submits the set directly (`SetEntry.js:360`,
  "keyboard-completes-the-set").

**Severity B — realistic short-screen scroll case.** Estimating the vertical
budget on a 640dp-tall device (the founder's own stated floor) from the
actual style tokens: header (`header`, `:3290-3294`, ~48dp) + exercise nav
strip when the workout has more than one exercise (`exerciseNavMaxHeight`,
`layout.js:10` = 48dp) + the "N cues" chip when any banner is active (~40dp)
+ an active `RestTimer` between sets (`minHeight:64`, or `56` compact) +
a 2-line exercise title (`exerciseName`, `numberOfLines={2}`, up to ~40dp) +
the set-entry card itself (title/orientation row ~28dp + optional target row
~20dp + optional beat line ~36dp + two 44dp-effective stepper rows ≈ 96dp +
`spacing.xs2` card padding) comes to roughly 480-520dp of content, against
roughly 500-540dp of available scroll height once the status bar (~24dp),
fixed bottom bar (~72-90dp with inset), and bottom inset are subtracted.
That is a near-exact fit in the best case and a small scroll in the common
one — a multi-exercise workout, mid-rest, with one active cue banner, on a
640dp device, will likely need a short scroll to see (not to tap — "Log set"
is always reachable) the weight/reps steppers before adjusting them. This
compounds on **320-360dp-wide** phones specifically because narrower width
forces more text wrapping in the same vertical budget — the 2-line exercise
name cap and the 4-line cap on a next-time coaching note
(`ActiveWorkoutScreen.js:2075`, `numberOfLines={4}`) both consume
meaningfully more height at 320dp than at 400dp+. This is an estimate from
static layout maths (no device/simulator available in this environment), not
a confirmed on-device measurement, and should be device-walked as part of
the existing manual test process before being treated as ship-blocking.

**Severity B — exercise-nav touch target (already covered in Section 2):**
`navTab` at 36dp with no `hitSlop` (`ActiveWorkoutScreen.js:3333`, call sites
`:1974-1997` and `:3264-3271`).

**Severity C:**
- `ExercisePickerModal.js` (used for both "Add exercise" and mid-workout
  "Swap") is well-built for this brief: `FlashList` virtualised rows (not a
  plain `.map` over ~450 exercises), 54dp row `minHeight`
  (`ExercisePickerModal.js:331`), a nested `SafeAreaProvider` specifically to
  fix a documented RN `Modal` safe-area bug on iOS (`:113-118`, own comment
  explains the fix), and 44-48dp buttons throughout. No issues found here.
- `BuildWorkoutScreen.js` (652 lines) and `WorkoutSummaryScreen.js`
  (1,856 lines) were checked for the same fixed-dimension/touch-target/inset
  classes as the rest of the sweep and returned nothing beyond what's already
  logged above (`WorkoutSummaryScreen`'s inset handling was already correct
  per Section 0; no fixed pixel widths above 300px found in either file).

### Improvement list for the workout logger (concrete, ranked)

1. Add `hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}` (or similar) to
   `navTab` at `ActiveWorkoutScreen.js:3333`'s two call sites (`:1976`,
   `:3265`) — a one-line fix matching the pattern already used on every other
   control in the file.
2. Device-walk the specific "multi-exercise + active rest timer + one cue
   banner + 2-line exercise name" combination on a real 640dp-tall,
   320-360dp-wide phone to confirm or rule out the Section 7 scroll estimate;
   if confirmed, the cheapest lever is extending `RestTimer`'s existing
   `useWindowDimensions()` compact threshold logic (`COMPACT_HEIGHT`,
   `RestTimer.js:46`) to also compact the set-entry card's target/beat-line
   rows on short screens, rather than inventing a new mechanism.
3. Migrate the six stale `Dimensions.get('window')` module constants
   (Section 1) to `useWindowDimensions()`, following the `RestTimer.js`
   pattern already proven in this exact screen family — `YearOfLiftsScreen.js`
   first, since it's the one with an actual (not just cosmetic) functional
   risk via `FlatList` paging geometry.

---

## Summary counts

| Severity | Count | 
|---|---|
| A (broken/unusable on some devices) | 1 |
| B (awkward/cramped) | 6 |
| C (polish) | 6 |

**Severity A (1):** `FoodSearchScreen.js` plateBar has zero safe-area inset
handling on a root-stack modal screen outside the tab band — the "Log N"
button can sit under the Android gesture pill / iOS home indicator. Still
unresolved as of 2026-07-09, despite being logged in the 2026-07-03 inset
inventory as one of only two "no handling at all" items.

**Severity B (6):** stale module-scope `Dimensions.get` in 6 files (chart
widths + `YearOfLiftsScreen`'s FlatList paging is the functional one);
`ActiveWorkoutScreen`'s exercise-nav chips below 44dp with no hitSlop;
`WorkoutHistoryScreen`'s fixed 30dp day-circle with no font-scale cap; the
workout logger's estimated short-screen scroll case on 640dp/320-360dp
devices under realistic multi-banner conditions.

**Severity C (6):** `ProGate.js` ProLocked's un-handled (but low-risk,
centred) bottom edge; `ScanLabelScreen`'s fixed 280×360 scan frame;
`ManualBuilderScreen`'s one 42dp-effective reorder button; two component-body
(non-module-scope) `Dimensions.get()` calls that should be
`useWindowDimensions()` for consistency; the general absence of
`KeyboardAvoidingView` on 13 form screens (checked individually, no actual
break found, but worth standardising).
