# Signature Elements — EXISTS-TODAY Evidence (P13 input)

Date: 2026-07-02. Branch: `claude/codebase-audit-docs-pv6mjd`, HEAD `ee2d19d`.
READ-ONLY evidence per candidate element. Facts with file:line only; no design,
no opinions. British English. All paths repo-relative to `/home/user/ADPhysique`.

---

## 1. Active-session mini-bar

### Persistent affordance for a live workout: what exists
- **The only visible affordance is the "Session in Progress" Continue card on
  the Home screen**, shown when `hasActiveWorkout` is true:
  `src/screens/HomeScreen.js:1488-1504` (PressableCard, title "Session in
  Progress", sub "Tap to return to your workout", `onPress` →
  `navigation.navigate('ActiveWorkout')`, a11y label "Continue active workout").
  Card style: `backgroundColor: colors.success`, `radius.lg`
  (`HomeScreen.js:2174-2187`).
- `hasActiveWorkout` derives from the store: `const hasActiveWorkout =
  !!activeWorkout && !isStartingWorkout` (`HomeScreen.js:1071`); also passed to
  TodayStrip as a prop (`HomeScreen.js:1442`).
- **No tab-bar badge exists**: zero `tabBarBadge` occurrences in `src/`
  (repo-wide grep, 2026-07-02). **No floating/mini session indicator exists**:
  greps for `floating|miniBar|sessionBar|Floating` in `src/` match only
  comments (Toast depth note `src/components/Toast.js:239-240`, a CL-4 quote in
  `src/screens/ActiveWorkoutScreen.js:2394`) — no component.
- **All routes back into ActiveWorkout** (`navigate('ActiveWorkout')` grep):
  `HomeScreen.js:991` (start planned), `:1025` (blank session), `:1491`
  (Continue card). No other screen navigates there. A rest-timer notification
  action path exists in `src/lib/notifications/restTimerActions.js:46-47`
  (checks `state.activeWorkout` + `restTimerActive`) but the visible return
  affordance in-app is the Home card only.
- ActiveWorkout is a pushed stack screen (not a tab) registered three times
  with `heroZoomTransition`: `src/navigation/RootNavigator.js:361,579,606`.
  The transition (fade + 0.92→1 scale, `motion.enter`/`motion.exit`) is
  defined at `RootNavigator.js:236-260` with the comment "Matches the Whoop /
  Apple Health pattern of tap a card → it expands" (`:234-235`).
- **The tab bar stays visible during a live workout**: no
  `setOptions`/`tabBarStyle` call in `src/screens/ActiveWorkoutScreen.js`
  (grep 2026-07-02, zero matches). Audit 03b confirms: "no per-screen
  tabBarStyle override — the bar stays visible for an entire live workout"
  (`audit/03b-motion-materials.md:437-440`).

### Active-session store shape (`src/store/useAppStore.js`)
- Session state: `activeWorkout: null` (`:1066`), `workoutExercises: []`
  (`:1067`), `currentExerciseIndex: 0` (`:1068`), `workoutStartTime` (`:1069`),
  `lastActivityAt` (`:1070`), `appliedRemoteEventIds` (`:1073`),
  `sessionAdjustments` (`:1077`), `lastSetLoggedAt: 0` (`:1164`).
- Rest timer, wall-clock anchored: `restTimerActive: false` (`:1411`),
  `restTimerDuration: 90` (`:1412`), `restTimerRemaining: 90` (`:1413`),
  `restTimerEndsAt: null` (`:1414`); extend recomputes remaining from
  `endsAt` (`:1442-1447`).
- WK-1 crash snapshot `_persistActiveWorkout` (`:86-116`) persists to
  AsyncStorage: workout, exercises, `currentExerciseIndex`,
  `sessionAdjustments`, `appliedRemoteEventIds` (last 500), and the rest
  anchor `restTimerEndsAt`/`restTimerDuration` (`:106-109`).
- `restoreActiveWorkout(userId)` (`:1306-1358`) is **called on Home mount**;
  its own comment says "surfacing the restored activeWorkout makes the
  existing 'Session in Progress' card appear" (`:1304-1305`). It resumes a
  still-future rest timer (`:1345-1352`).

### Where the tab bar renders
- `MainTabs()` in `src/navigation/RootNavigator.js:494-553`.

---

## 2. Tab bar (current structure verbatim at HEAD)

- **Stock** `createBottomTabNavigator` (`RootNavigator.js:3`), wrapped by
  `withScreenBoundaries` (`:139`). No custom `tabBar` component.
- Styling via `screenOptions` (`:521-544`): `tabBarStyle` = opaque
  `colors.tabBar` background, `borderTopColor: colors.tabBarBorder`,
  `paddingBottom: 4 + insets.bottom`, `height: 60 + insets.bottom`
  (`:523-528`); active tint `colors.primary`, inactive `colors.textMuted`
  (`:529-530`); label `fontSize.xs` semibold (`:533`).
- **Indicator = filled/outline Ionicons swap only** (`:534-543`): HomeTab
  `home`/`home-outline`, PlansTab `list`, DiaryTab `restaurant`, ProgressTab
  `stats-chart`, ProfileTab `person`. Five tabs: Train, Plans, Diary,
  Progress, You (`:546-550`). No pill, no motion, no badge.
- Tokens: dark `tabBar: '#111111'`, `tabBarBorder: '#222222'`
  (`src/styles/theme.js:73-74`); light `#FFFFFF`/`#E4E4DF` (`:165-166`).
- **Wave 6 M1 landed**: selection haptic on tab CHANGE via `screenListeners`
  `tabPress` — silent on re-press of the focused tab (`RootNavigator.js:510-520`);
  `haptics.selection()` is `src/lib/haptics.js:84` (vocabulary no-ops under
  reduce motion, `haptics.js:19-37` per 03b §3.2 rule 0). Tabs are lazy (F6b,
  `:501-509`).
- **M8 (03b §4 step 8, custom tab bar) has NOT landed**: step 8 is "Custom
  `tabBar` component + hide-during-ActiveWorkout"
  (`audit/03b-motion-materials.md:762-765`); no custom tabBar exists at HEAD.
- **03b §3.3a proposal** (`audit/03b-motion-materials.md:432-462`): anchored
  not floating; translucent surface fill + hairline top border (blur banned);
  sliding amber pill behind the active icon on `withSpring(motion.springs.settle)`
  keyed to `state.index`; icon settle-scale 1→1.06→1; instant jump under
  reduceMotion; hide-on-scroll rejected; hide the bar while ActiveWorkout is
  focused via `setOptions({ tabBarStyle: { display: 'none' } })`; centre
  action button rejected (free/pro exposure rule).

---

## 3. CTA glow

- **Button primitive at HEAD** (`src/components/Button.js`): five variants —
  primary (amber fill), secondary, tertiary, outline, destructive (`:43-53`);
  three sizes (`:55-59`); state morph idle→loading→success in a width-locked
  container with `haptics.commit()` and `SUCCESS_HOLD_MS = 900` (`:65,
  :109-122`, Wave 6 M4); primary-variant `haptics.selection()` on press
  (`:124-130`, M1). Flat fills only — **no glow, gradient or shadow on any
  button variant**.
- **Start Session on Home**: the hero card (`HomeScreen.js:1506` opening,
  style `heroCard` at `:2194-2201`, `surfaceElevated` + 1px border, comment
  "the hero is the screen's ONLY elevated object — D3" `:2192-2193`) contains
  the primary CTA "Start workout" — a `TouchableOpacity` with `styles.primaryBtn`
  (`HomeScreen.js:1553-1566`), not the Button primitive, no glow. The hero is
  "The single start surface" (`:1168-1169`).
- **Coach Apply hero (A1 one-amber rule)**: `CoachOutputScreen.js` — Apply
  rows ride the Button morph (`:77-80`); "primary = the A1 one-amber hero,
  outline = every quiet Apply" (`:2656-2657`); `emphasis` marks the hero
  decision row (`:292`); Done is a quiet text action (`:2354`); the standing
  guidance card is "never amber" (`:2380`, `:2330`).
- **Design-audit anchors**: "Amber inflation" is cross-screen drag #4
  (`audit/03-design-audit.md:158-160`); Home prescription "Start is the sole
  filled-amber element" (`:147`). 03b sanctions exactly one Skia-glow CTA
  class — the Home hero Start button only; Log set and the Paywall CTA
  explicitly excluded (`audit/03b-motion-materials.md:492-501`).
- **Skia usage inventory at HEAD** (grep `@shopify/react-native-skia`,
  installed at `2.2.12`, `package.json:56`):
  - `src/components/food/MacroRings.js:3` — Canvas/Path arcs for the kcal ring.
  - `src/lib/shareCard/drawShareCard.js` — offscreen share-card renderer;
    uses `Skia.Shader.MakeLinearGradient` (`:148`).
  - `src/screens/ShareCardScreen.js:33` — optional require of Skia/matchFont.
  - No Skia glow/bloom exists anywhere; no `BlurMask`/`RadialGradient` in `src`
    (grep 2026-07-02: only SVG `LinearGradient` in `VolyumeChart.js:224` and
    the shareCard shader).
- Counter-precedents on record: `src/components/GradientCard.js:4-6` — "the
  locked rule is a flat background, no gradients/orbs/glows";
  `src/screens/ProSetupCompleteScreen.js:185-190` — completion signal is "the
  full amber bar and the eyebrow, not a glowing orb".

---

## 4. Rolling numbers

- **WorkoutSummary StatBox rAF counter**
  (`src/screens/WorkoutSummaryScreen.js:1249-1300`): bespoke JS-thread
  `requestAnimationFrame` loop, ~900 ms cubic ease-out, `setDisplayed` per
  frame, en-GB thousands formatting (`:1284-1298`); staggered 80 ms reveal via
  JS `Animated.parallel` (`:1272-1276`); reduce-motion shows the final value
  immediately (`:1268`); `hero` prop renders the headline tonnage numeral
  (`:1246-1248, :1302-1311`).
- **MacroRings count-up** (`src/components/food/MacroRings.js:204-225`): RN
  `Animated.Value` + `addListener` + `Animated.timing(..., duration:
  motion.hero, useNativeDriver: false)` interpolating `disp.kcal` and ring
  progress; skipped under reduceMotion (`:210`).
- **Macros-remaining display site (Diary hero)**: `MacroRings` renders in
  `src/screens/DiaryScreen.js:815-821`. Remaining is the hero number (founder
  decision 2026-06-29, MFP-style) derived at render from the animated eaten
  total: `dispRemaining = kcalTarget - disp.kcal` (`MacroRings.js:227-234`),
  displayed at `:285` — so **the Diary remaining hero already ticks today**,
  via the JS-thread listener above.
- **Body-weight display sites render static (no count-up anywhere)**:
  - `src/components/WeightTrendCard.js:88` — EWMA value is a plain `<Text>`
    (`formatBodyWeight`); zero Animated/count code in the file (grep
    2026-07-02, no matches). Used by `AnalyticsScreen.js` and
    `BodyMetricsScreen.js`.
  - `src/components/TodayStrip.js` — Home weight cell; header notes the
    weight-cell sparkline was removed 2026-06-16 (`:23`); static display.
- **03b rule**: "Hard ED rule: the body-weight number never ticks —
  weight-trend and BodyMetrics values render static always, not merely under
  an open flag" (`audit/03b-motion-materials.md:560-563`; restated `:705`,
  and §4 step 6 ships it as a test, `:752-756`).
- `<RollingNumber>` proposed in 03b (`:554-558`) **does not exist at HEAD**
  (grep `RollingNumber` in `src/`: no files). Both count-ups are on the
  fit-rule-4 frozen JS-Animated allowlist (`03b:401-406`).

---

## 5. Charts

- **VolyumeChart** (`src/components/VolyumeChart.js`, 308 lines) is "the
  app's single line/area chart" (`:1`), hand-rolled `react-native-svg` over
  `src/lib/chartGeometry.js` (115 lines, pure, dependency-free `:1-5`).
  - Scrub: long-press 300 ms then drag (`Gesture.Pan().activateAfterLongPress(300)`,
    `:162-170`), snap-to-nearest-point with `haptics.selection()` per point and
    an a11y announcement (`:131-144`), crosshair + tooltip (`:260-267`, tooltip
    width 132 `:211`), latest-ref pattern for stale-closure safety (`:151-158`).
  - Gradient area fill: SVG `LinearGradient` top `withAlpha(color, 0.188)` →
    bottom 0.02 (`:204-206, :222-228, :247`).
  - Axes: y ticks + dashed rules + baseline (`:231-245`), x labels (`:269-278`);
    `paddedDomain` fallback (`:92-97`). Secondary series `data2` (raw behind
    smoothed, `:249-252`); bar variant with scrub-dim (`:72-79, :176-199`).
  - In-file architecture decision `:15-21`: Skia rejected for scrubbing ("the
    chart is static during a scrub"); "Swappable to Skia later behind this
    same API if the founder wants UI-thread scrub smoothness".
  - Hosts (12 files incl. tests): AnalyticsScreen (`:790,:829` — hero volume
    chart `:754`), BodyMetricsScreen (`:205,:283,:342`), WeightTrendCard
    (`:72-79`, `interactive` not passed = static), ExerciseDetailScreen,
    VolumeHeatmapScreen, FoodInsightsScreen, Sparkline (axis-free mini chart
    over the same geometry, `src/components/Sparkline.js:1-19`).
  - Tests: `src/lib/__tests__/chartGeometry.test.js` (scale, plotPoints,
    line/smooth/area paths, ticks, paddedDomain, `nearestPointIndex` scrub
    clamping) and `src/lib/__tests__/chartWindows.test.js` (windows,
    takeaways).
- **No entering draw-in exists** — 03b proposes a once-per-mount path-trim
  draw-in on the Analytics focal chart and recommends against Victory Native
  XL (`audit/03b-motion-materials.md:563-572`; dependency table `:800`).
- **Repo competitive docs on chart standards**:
  - `audit/04-competitive.md:34` — trend presentation "PAR with MacroFactor —
    WeightTrendCard is the same shape (smoothed over raw, rate, insight,
    maintenance estimate)... goal-band overlay + scrubbing deferred".
  - `audit/03-design-audit.md:124` — Analytics should "open on one large owned
    visual — weekly training-load (Whoop/Oura bar)".
  - `audit/05-enhancements.md:62` ("MacroFactor's trend surface is their
    crown"), `:143` ("matches Whoop/Oura-grade glanceability").
  - `src/components/WeightTrendCard.js:19-20` — "dashed goal-band overlay from
    the blueprint is intentionally deferred".
  - No repo doc states a Whoop/MacroFactor chart-interaction spec beyond
    these lines; deeper claims would need fresh research (UNVERIFIED here).

---

## 6. Materials

- **Surface ladder** (`src/styles/theme.js`): dark — `background` then
  `surface '#191917'` (:19), `surfaceElevated '#222220'` (:20), `surface2
  '#2A2A27'` (:21), `surface3 '#343431'` (:22); light equivalents `:141-144`.
  Comment: dark "communicates elevation by lightening each layer rather than
  relying on shadows" (`:15-17`).
- **Borders**: `border '#6E6E6E'` (3.81:1, WCAG 1.4.11) (:23), `borderLight`
  (:24), `borderSubtle '#2E2E2C'` hairline-inside-card (:25); light `:145-147`.
- **Shadows/elevation**: light shadows are the PRIMARY elevation cue; dark
  carries it via the surface ladder (`:215-219`; opacities sm/md/lg 0.3/0.4/0.5
  dark vs 0.10/0.14/0.18 light); `shadow.sm/md/lg` carry Android `elevation`
  2/5/10 (`:514,:521,:528`). Toast reserves shadows for "floating temporary
  surfaces" (`src/components/Toast.js:239-240`).
- **Motion tokens shipped** (`theme.js:600-640`): durations
  micro/state/enter/exit/hero/sheet/pulse (120/200/320/220/440/260/750),
  three M3 beziers + `cssEase` twins, named spring family
  press/release/settle/expressive (`:627-632`).
- **Materials rule on record**: translucent fill + hairline border as the
  material, no blur, Android mid-range first
  (`audit/03b-motion-materials.md:426-430`; fit rule 4 `:398-410`).
- **Blur absence confirmed**: `expo-blur` is NOT in `package.json`
  dependencies (grep 2026-07-02) and is formally **Declined** in the 03b
  dependency table (`audit/03b-motion-materials.md:797`). `lottie-react-native`,
  `rive-react-native`, `victory-native` also absent/declined (`:798-800`).
- Adjacent fact: `@gorhom/bottom-sheet ^5.2.14` IS installed
  (`package.json:47`, commit `18ab135` "founder-approved 2026-07-02") but has
  **zero imports in `src/`** at HEAD; the shipped sheet chrome remains the
  hand-rolled RN-Animated `src/components/BottomSheet.js` (timings tokenised,
  `:25-28`).
