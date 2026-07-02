# Volyume — Motion & Materials Audit (03b)

Date: 2026-07-02 · Read-only session · Method: three parallel motion
subagents (capability check, motion inventory + dead-tap census, pattern
proposals + token system), every claim verified at the cited file:line.
Companions: `03-design-audit.md` (visual system; this document extends its §3
motion inventory), `02-ux-audit.md` (journeys/friction), `06-MASTER-PLAN.md`
(ranking).

**Headline.** The platform prerequisite question answers itself: **no upgrade
is needed** — Reanimated 4.1.7, worklets 0.5.1 and the New Architecture are
already shipped and configured. The motion foundations are genuinely good
(tokenised durations, a canonical press spring, a self-gating haptic
vocabulary, near-total reduce-motion discipline) but adoption is thin and
split across two runtimes: ~10 files animate via the JS `Animated` API, only
3 via Reanimated, and the token layer has just three consumers. The real
debts are nameable: **~25 dead-tap controls** (including the GDPR consent
checkbox and food-save CTAs), **four press-feedback dialects**, **three
hand-rolled bottom sheets** with three timing sets, **four raw expo-haptics
call sites that bypass the reduce-motion gate**, and exactly **one ungated
animation** in the whole app (YearOfLifts pip fill).

**Correction to the record:** design audit §3's "dead haptic vocabulary"
finding is stale — D2 wired nearly all of it (verified call-site table in §3f
below). The remaining haptics work is closing bypasses, not wiring events.

---

## 1. Capability check — is an upgrade a prerequisite?

**No. There is no upgrade to do — the prerequisite is already fully
satisfied.** A Reanimated-4-based motion system can be built on the current
dependency set today with zero config changes, zero breaking usages and no
migration work.

| Item | Value | Evidence |
|---|---|---|
| Expo SDK | `expo: ~54.0.35` (SDK 54) | `package.json:59` |
| React Native | `0.81.5` (exact pin) | `package.json:95` |
| React | `19.1.0` | `package.json:94` |
| New Architecture | **enabled explicitly**: `"newArchEnabled": true` | `app.json:19` |
| Reanimated | declared `~4.1.1`, installed **4.1.7** | `package.json:101` |
| react-native-worklets (RA4 runtime) | `0.5.1` (exact pin) | `package.json:108` |
| react-native-nitro-modules | `0.35.9` | `package.json:100` |
| react-native-gesture-handler | `~2.28.0`, installed 2.28.0 | `package.json:98` |
| @shopify/react-native-skia | `2.2.12` exact pin | `package.json:53` |
| expo-haptics | `~15.0.8`, installed 15.0.8 | `package.json:70` |
| expo-image | `~3.0.11`, installed 3.0.11 | `package.json:71` |

Why nothing blocks:

- **Babel is already the Reanimated-4 form.** `babel.config.js:18-20` pushes
  `react-native-worklets/plugin` correctly last in the plugins list, with the
  NODE_ENV-aware cache handled at line 5. No legacy
  `react-native-reanimated/plugin` remnant.
- **The three existing Reanimated call sites are all RA4-native APIs** —
  `runOnJS` + `Gesture`/`GestureDetector` (`src/components/VolyumeChart.js:33-34`),
  `FadeInDown/FadeOut/LinearTransition` (`src/components/AnimatedRow.js:22`),
  `FadeInDown` (`src/components/AnimatedEntrance.js:20`). No source file uses
  `useSharedValue`/`useAnimatedStyle`/`withTiming`/`withSpring` directly yet;
  the only hit is a comment at `src/styles/theme.js:614` labelling a spring
  token "(Reanimated withSpring config)".
- **Custom native modules are not a blocker.** Both `modules/live-activity`
  (iOS) and `modules/rest-timer-live` (Android) are Expo Modules API modules
  (each has `expo-module.config.json`), New-Architecture-compatible by
  design, and already building under the New Architecture in production EAS
  builds — any incompatibility would have surfaced long ago.
- SDK note: New Architecture has been the Expo default since SDK 52 and is
  effectively the only supported path in SDK 54 / RN 0.81; Volyume does not
  rely on the default, it sets the flag explicitly.

**What actually remains before richer motion (none of it an upgrade):**

1. **Missing libraries** — `@gorhom/bottom-sheet`, `expo-blur`,
   `lottie-react-native`, `rive-react-native` are all absent; each would need
   explicit founder approval per CLAUDE.md and an EAS rebuild (custom native
   modules mean no Expo Go). Only the first is recommended (§3c, §5).
2. **Consistency debt, not compatibility debt** — ~10 files on JS `Animated`
   vs 3 on Reanimated. Migration is optional and incremental (§3, rule 4),
   never a prerequisite.
3. **Gating hooks exist** — every new animation wires to the existing
   `accessibility.reduceMotion` store flag (pattern at
   `src/components/PeekMenu.js:45`) and the ED calm-mode suppression.
4. **Jest** — the 3 Reanimated files run under jest-expo with mocks; new
   Reanimated-heavy components need the same discipline (gesture-handler mock
   precedent at `src/__tests__/screen-mount.test.js:222`).

---

## 2. Motion inventory — what exists, what's dead, what's inconsistent

`LayoutAnimation` is used nowhere (zero hits). Reanimated appears in exactly
3 files; everything else is JS `Animated`, almost always
`useNativeDriver: true` (so the *running* animation is UI-thread even though
orchestration is JS-thread).

### 2.1 What exists — the de facto system

**Shared primitives (the good bones):**

| # | Primitive | Mechanism | Reach | Reduce-motion |
|---|---|---|---|---|
| 1 | **PressableCard** — spring to scale 0.97 (speed 30 in / 18 + bounce 6 out) + opacity dip to 0.92 (`src/components/PressableCard.js:41-66`) | JS `Animated.spring`, native driver | CANONICAL press pattern: wrapped by Button (`Button.js:21,62`), Card (`Card.js:57`), Chip (`Chip.js:29`), Stepper (`Stepper.js:38,48`), ExerciseCard (`ExerciseCard.js:14`), SettingsPrimitives (`SettingsPrimitives.js:17`); direct in HomeScreen (`HomeScreen.js:1484,1685,1748`), ImportScreen, LiftProgressScreen, PlansScreen, WorkoutHistoryScreen, YouScreen (`YouScreen.js:29`), PeekMenu | Yes — flat, no anim (`PressableCard.js:42,52,61`) |
| 2 | **AnimatedEntrance** — mount fade+rise, `FadeInDown.duration(motion.enter)`, 30 ms stagger capped at 8 (`AnimatedEntrance.js:20,35-45`) | Reanimated 4, UI thread | ReadinessCards (`ReadinessCards.js:167`), Analytics, Consistency, Diary, ExerciseDetail, LiftProgress, PlanDetail, Plans, WorkoutHistory screens | Yes — plain View (`AnimatedEntrance.js:31-33`) |
| 3 | **AnimatedRow** — `FadeInDown` enter, `FadeOut` exit, `LinearTransition` sibling glide, on `motion.enter/exit/state` tokens (`AnimatedRow.js:22,40-42`) | Reanimated 4 layout animations | Food MealSection entries (`food/MealSection.js:60`), ActiveWorkout logged sets (`ActiveWorkoutScreen.js:2238`) | Yes — plain View (`AnimatedRow.js:33-35`) |
| 4 | **Skeleton** — opacity pulse loop 0.45↔0.9 (`Skeleton.js:25-47`) | JS `Animated.loop`, native driver | 19 screen consumers (Home, Diary, Plans, PlanLibrary, Analytics, FoodSearch, WeeklyCheckIn, CoachOutput, …) | Yes — static 0.6 (`Skeleton.js:28,55`) |
| 5 | **Toast** — slide-up 40 px + fade (220/260 ms in, 180 ms out) (`Toast.js:55-56,101-155`) | JS `Animated.timing`, native driver | Single provider app-wide | Yes — 0-duration (`Toast.js:104,146`) |
| 6 | **BottomSheet** (bespoke, not @gorhom) — translateY slide (260 ms out-cubic) + backdrop fade (200 ms); close 200/160 ms (`BottomSheet.js:24-27,43-67`) | JS `Animated.timing`, native driver | Nine consumers: QuickAddSheet, FoodDetailSheet, MacroBreakdownSheet, CalorieBankSheet, CuratedMealSheet, ServingPicker, PostLapseSheet, CancelReasonSheet, MealPlan/PlanUpdate screens | Yes (`BottomSheet.js:42-54`) |
| 7 | **PRCelebration + MilestoneBurst** — 40-particle gold burst (springs tension 80/friction 6, `Animated.stagger(8,…)`) + card scale-in (`PRCelebration.js:55-68,123-166`; `MilestoneBurst` at `:44`, shown from `WorkoutSummaryScreen.js:1205`) | JS `Animated`, native driver | PR + milestone rungs | Yes AND ED calm-mode: `subdued={calm \|\| reduceMotion}` at `App.js:913-919`; subdued renders a quiet card, particles skipped (`PRCelebration.js:115-121,189`) |
| 8 | **RestTimer drain fill** — bar `scaleX` glides 1 s linear per tick (`RestTimer.js:198-218`) | JS `Animated.timing`, native driver | Deliberate D2 feature (one-off) | Yes — steps statically (`RestTimer.js:203-205`) |
| 9 | **VolyumeChart scrub** — `Gesture.Pan` + `runOnJS` snap-to-point crosshair, `haptics.selection()` per point, rendered in react-native-svg (Skia explicitly deferred, in-file comment) (`VolyumeChart.js:33-34,137,165-169,199,292`) | Gesture on UI thread; crosshair via JS setState | The one chart engine; AnalyticsScreen hero uses its bar variant (`AnalyticsScreen.js:753-760`) | Haptics no-op via vocabulary (`VolyumeChart.js:7`) |
| 10 | **Swipeable delete** (legacy gesture-handler `Swipeable`) on food entry rows (`food/EntryRow.js:3,67-81`) | gesture-handler, UI thread | Only swipe-action in the app | No gate (gesture-driven, acceptable) |

**Navigation:** the crafted `heroZoomTransition` (fade + 0.92→1 scale,
280/200 ms, defensive null-progress guard, `RootNavigator.js:227-251`) is now
applied to ActiveWorkout, WorkoutSummary, PlanDetail, RoutineDetail and
ExerciseDetail across every stack (`RootNavigator.js:352-353,382-384,409,417,
550-551,577-578`) — design audit win #5 has shipped. ~15 registrations use
`presentation: 'modal'` (`RootNavigator.js:282-333,360-361,477-480`). A
navigator-wide reduce-motion kill-switch (`useStackMotionOverride()` →
`animationEnabled: false`) is merged into every navigator and read at render,
so the toggle applies without restart (`RootNavigator.js:256-258,272,349,379,
406,441,529`). The tab bar is a default `createBottomTabNavigator` with only
a filled/outline icon swap — no indicator, no press feedback
(`RootNavigator.js:491-524`).

**Screen one-offs (all JS `Animated`, all reduce-motion gated unless
noted):** brand splash 4-stage choreography (550/650/320/280/300 ms,
`RootNavigator.js:1390-1477`, gated at `:1394-1400,1403`); Welcome entrance
480 ms (`WelcomeScreen.js:39-46`, gated `:33`); ProSetupComplete fade+slide +
`planReady()` haptic (`ProSetupCompleteScreen.js:101-114,21`); WorkoutSummary
RevealSection staggers (`WorkoutSummaryScreen.js:1210-1228`, gated
`:1221-1226`) and StatBox count-up (setState per frame — JS thread,
`:1263-1275`, gated `:1268-1269`); ProOnboarding staged plan-build with a11y
announcements (`ProOnboardingScreen.js:145,512-556`, gated `:551`);
ExerciseDetail congrats banner (`ExerciseDetailScreen.js:185,288-303`);
ActiveWorkout info-button pulse loop (`ActiveWorkoutScreen.js:256,543-559`,
gated `:548`); MacroRings 500 ms count-up (`useNativeDriver: false` +
listener → setState = JS thread, `food/MacroRings.js:204-225,236`, gated
`:210`); YearOfLifts story pip fill (width %, JS thread,
`YearOfLiftsScreen.js:465-477`) — **the single animation in the app with no
reduce-motion gate** (zero `reduceMotion` hits in the file; the auto-advance
itself is also ungated).

**Haptics:** a named 13-intent vocabulary in `src/lib/haptics.js:19-101`
(setLogged, warmupLogged, prAchieved, restDone, restAlmostDone, restCountdown
ladder, planReady, selection, press, workoutComplete, error, commit), every
helper self-gated to no-op under reduce-motion. Call sites are broad and
consistent: ActiveWorkoutScreen (`:370,538,983-984,1214,1304,1334,1360,1477,
1578,2022,2047,2511`), DiaryScreen (`:660,680,684`), WeeklyCheckInScreen
(`:566`), StreakWeeksSection (`:84,91`), Settings screens
(`SettingsCoachingScreen.js:42-71` etc.), VolyumeChart (`:137`),
PRCelebration (`:132,139`), ProSetupCompleteScreen (`:21`),
WorkoutSummaryScreen (`:20`), ReasonPicker (`:15`), RestTimer (`:9`).

### 2.2 Dead taps — interactive elements with no press feedback

Baseline: 548 `<TouchableOpacity>` instances across 93 files all give at
least the default opacity dip, and PressableCard consumers get the spring.
The true dead taps are **raw `<Pressable>` with a static `style` object** (no
`({pressed}) =>` function — no visual change while the finger is down):

- `src/components/food/QuickAddSheet.js:105,118,121` — meal-slot buttons,
  Cancel, and **"Add to diary" (the primary save CTA of quick-add)**
- `src/components/food/FoodDetailSheet.js:165,181,199,237,257,261,264` —
  7 controls including Delete, Cancel and the primary Save (only 1 of 7 has
  feedback)
- `src/components/food/ServingPicker.js:48` — serving option rows
- `src/components/food/CuratedMealSheet.js` (2), `MacroBreakdownSheet.js`
  (2), `CalorieBankSheet.js` (1), `HeldDecisionCard.js` (2) — all food-domain
  sheet buttons
- `src/screens/Article9ConsentScreen.js:209` — **the GDPR consent checkbox
  row itself**
- `src/screens/GoalLockConsentScreen.js` (2) — consent controls
- `src/components/TierComparisonStrip.js:61` — tappable Pro pricing column on
  the paywall
- `src/screens/PerDayTargetsScreen.js:131,140,157` — per-day kcal steppers +
  reset (repeat-tap controls with zero feedback; contrast
  `components/Stepper.js`, which springs)
- `src/screens/MyMealsScreen.js` (2), `MyRecipesScreen.js` (2),
  `src/screens/DiaryScreen.js:1044-1104` (move/save/copy sheet internals),
  `src/screens/PlansScreen.js:1043-1044` + `PlanLibraryScreen.js:587-588`
  (folder/quiz sheet internals), `src/components/ProGate.js:100-101` (sheet)
- `src/screens/YearOfLiftsScreen.js:628-629` — story tap zones (arguably
  fine: Instagram-style zones are invisible by design)

Intentional non-feedback (not defects): backdrop catchers with
`activeOpacity={1}` — `AppAlert.js:83-84`, `RoutineDetailScreen.js:507-508`,
`HomeScreen.js:1846,1878`, `InfoTooltip.js:24`, `StreakWeeksSection.js:178`,
`PRCelebration.js:210`, `ActiveWorkoutScreen.js:2497,2544,2640`,
`ExerciseDetailScreen.js:818`. Pressed-state done right on raw Pressable (the
minority): `ReasonPicker.js:35-38` (opacity 0.7), `CancelReasonSheet.js`,
`PeekMenu.js:127-130` (background tint), `FeedbackSheet.js` (1 of 4),
`FoodDetailSheet.js` (1 of 7), HomeScreen inline (3).

### 2.3 What's inconsistent

1. **Four coexisting press-feedback styles.** (a) PressableCard spring 0.97
   (canonical); (b) TouchableOpacity default 0.2 dim — the *majority*: ~432
   of 548 instances have no explicit `activeOpacity`, so most of the app
   presses with a harsh 80% dim; (c) TouchableOpacity with **seven different
   explicit dim levels** (0.7 ×16, 0.75 ×15, 0.8 ×16, 0.82 ×2, 0.85 ×42,
   0.88 ×10, 0.9 ×2); (d) raw Pressable with either `pressed` styling or
   nothing (§2.2). Same-looking buttons feel different screen to screen.
2. **Three hand-rolled bottom sheets, three timing sets:** BottomSheet
   260/200 + 200/160 ms (`BottomSheet.js:24-27`), PeekMenu 180/200 ms
   (`PeekMenu.js:62-66`), FeedbackSheet 280/220 + 220/180 ms
   (`FeedbackSheet.js:157-198`) — only BottomSheet's open duration is
   tokenised (`motion.sheet: 260`, `theme.js:607`). Plus modal-as-sheet
   look-alikes built from Pressable backdrops (DiaryScreen:1044+,
   PlansScreen:1043, ProGate:100) that **appear with no animation at all**.
3. **Two animation runtimes for the same job.** Entrances exist as Reanimated
   (`AnimatedEntrance`) and as bespoke JS `Animated` copies of the identical
   fade+rise (WelcomeScreen:39-46, ProSetupCompleteScreen:101-114,
   WorkoutSummary RevealSection:1210-1228, splash:1394+). Durations drift:
   480 ms, 320/360 ms, 550/650 ms vs the `motion.enter = 320` token. Only
   AnimatedEntrance/AnimatedRow/ProOnboarding/BottomSheet-open read
   `motion.*`; every other file hard-codes (Toast 220/260/180, PeekMenu
   180/200, FeedbackSheet 280/220, congrats 300/400, pulse 700, splash
   550/650/320/280/300).
4. **JS-thread animations that could stutter on mid-range Android:**
   MacroRings count-up (`useNativeDriver: false` + listener → setState,
   `MacroRings.js:216-222`), YearOfLifts pip width (`:472`), WorkoutSummary
   StatBox count-up (setState per frame). Everything else runs on the native
   driver.
5. **Reduce-motion discipline is near-total but not total:** the single
   ungated animation is the YearOfLifts pip fill; and **four files call
   expo-haptics directly, bypassing the vocabulary's reduce-motion gate** —
   `SetEntry.js:45,69` (stepper selection), `FeedbackSheet.js:147,218,271`
   (selection ×2 + success), `ScanBarcodeScreen.js:111` (scan success),
   `PeekMenu.js:52` (medium impact on long-press open). A reduce-motion user
   still gets vibration from steppers, the feedback sheet, barcode scan and
   the long-press menu. ED calm-mode gating exists only at the PRCelebration
   mount (`App.js:919`); no other animation consults calm mode.
6. **Feedback deserts by domain:** the food-sheet family (QuickAdd,
   FoodDetail, ServingPicker, CuratedMeal, MacroBreakdown, CalorieBank,
   HeldDecision) is the largest dead-tap cluster AND has no choreography
   beyond the shared BottomSheet slide; consent screens (Article9, GoalLock)
   have dead-tap primary controls; the tab bar has no press feedback beyond
   the icon glyph swap.
7. **Gesture layer minimal and split:** modern `Gesture.Pan` only in
   VolyumeChart (`:165`), legacy `Swipeable` only in EntryRow (`:3`); no
   sheet drag-to-dismiss anywhere (all sheets close by backdrop tap or button
   only).

---

## 3. The proposed system

Three non-negotiables inherited from the codebase itself: every animation
collapses under `accessibility.reduceMotion` (store pattern:
`PressableCard.js:38`; navigator-wide at `RootNavigator.js:256-259`); every
celebratory surface additionally suppresses under ED-flag/calm
(`WorkoutSummaryScreen.js:391-430` computes `suppressed = calm || !!edFlag`;
`PRCelebration.js:109-129` has a `subdued` mode); and all timings/curves come
from `motion.*` tokens (`theme.js:600-621`). Material default: translucent
surface fill + hairline border, never blur, Android mid-range first.

### 3.1 Motion tokens (extend `theme.js` `motion` namespace, additive only)

**Already shipped** (D0/D2, Material-3-derived curves, comment at
theme.js:596-599): `micro` 120 (taps/toggles, theme.js:602), `state` 200
(colour/size shifts, :603), `enter` 320 (:604), `exit` 220 (:605), `hero` 440
(the one important moment per screen, :606), `sheet` 260 (:607);
`easeStandard [0.2,0,0,1]` (:610), `easeDecelerate [0.05,0.7,0.1,1]` (:611),
`easeAccelerate [0.3,0,0.8,0.15]` (:612); `spring {stiffness:150, damping:18,
mass:1}` (:615); legacy aliases `card`/`easeOut`/`easeInOut` (:617-620).
Adoption today: only `AnimatedRow.js:40-42`, `AnimatedEntrance.js:39` and
`ProOnboardingScreen.js:518` read the tokens. `motion.spring` has **zero call
sites**, so its shape can be restructured without breaking anything.

**Additions (no visual change at token-add time, Phase-0 discipline per
03-design-audit.md:236-241):**

- **Durations.** New work picks from exactly three: `micro` (120), `state`
  (200), and the `enter`/`exit` pair (320/220). `hero` (440) requires a
  rule-1 purpose justification; `sheet` (260) is reserved for sheet/overlay
  open. One new token: **`motion.pulse: 750`** (indeterminate attention
  loops — Skeleton pulse, absorbs ActiveWorkout's 700 ms info pulse). No
  other duration token without a founder decision.
- **One named spring family, `motion.springs`** (Reanimated
  `withSpring`-shaped; press/release are the stiffness/damping equivalents of
  PressableCard's shipped `speed/bounciness` feel):

  ```js
  springs: {
    press:      { stiffness: 420, damping: 36, mass: 1 }, // press-in; settles < 100 ms, no overshoot
    release:    { stiffness: 250, damping: 22, mass: 1 }, // press-out / drag-release; one tiny overshoot beat
    settle:     { stiffness: 150, damping: 18, mass: 1 }, // cards/sheets/scrubs coming to rest (= today's motion.spring)
    expressive: { stiffness: 120, damping: 13, mass: 1 }, // celebration surfaces ONLY (rule 1)
  },
  spring: /* legacy alias -> springs.settle, zero call sites today */
  ```

- **CSS-string easing twins** for Reanimated 4's CSS transition API, so both
  call styles read one source: `cssEase: { standard: 'cubic-bezier(0.2, 0,
  0, 1)', decelerate: 'cubic-bezier(0.05, 0.7, 0.1, 1)', accelerate:
  'cubic-bezier(0.3, 0, 0.8, 0.15)' }`. Linear easing is sanctioned only for
  time-proportional fills (the rest-timer drain, `RestTimer.js:206-215`) —
  never for spatial movement.
- **Codified press spec** (what PressableCard already ships): scale 0.97
  default, 0.94 for hero CTAs, hard floor 0.92 (`PressableCard.js:34-36`);
  opacity dips with scale to 0.92 (`:61-66`); spring-driven, never
  duration-driven (`springs.press` in, `springs.release` out; press-in must
  visibly respond next frame); **no haptic on the press visual by default** —
  haptics mark outcomes, not touches (`haptics.js:42,84-101`); reduce-motion
  → flat (`PressableCard.js:38,61`).
- **Standard enter/exit pairs.** List rows: `FadeInDown.duration(motion.enter)`
  + 30 ms stagger cap 8 / `FadeOut.duration(motion.exit)` /
  `LinearTransition.duration(motion.state)` — this is `AnimatedRow.js:40-42`
  verbatim; use the component, not the recipe. Screen mounts:
  `AnimatedEntrance`. Sheets: translateY `motion.sheet` + easeDecelerate in,
  `motion.state` + easeAccelerate out; backdrop `motion.state`/`micro`.
  Toast/banner: `motion.state` both ways. Asymmetry is deliberate and
  mandatory: exits always faster than entries (220 vs 320, accelerate vs
  decelerate).

**Migration backlog (mechanical-first):**

1. *Zero-diff swaps (literal equals or Δ≤20 ms):* BottomSheet 260→`sheet`,
   200→`state` (`BottomSheet.js:24-27`; flagged at 03-design-audit.md:72-74);
   PeekMenu 280→`sheet`/200→`state` (`PeekMenu.js:62-67,79-87`);
   WorkoutSummary 320/360/280/320→`enter` (`WorkoutSummaryScreen.js:1227-1228,
   1274-1275`, all within 40 ms); ProSetupComplete 420→`hero`
   (`ProSetupCompleteScreen.js:111,115`); Skeleton 750 (`Skeleton.js:33,39`) +
   ActiveWorkout 700 (`ActiveWorkoutScreen.js:551-552`) → `pulse`.
2. *Founder-eyeball retimes (Δ40-80 ms or curve change):* Welcome 480→`hero`
   (`WelcomeScreen.js:45-46`); ExerciseDetail 300 in / 400 out — non-standard,
   exit slower than entry (`ExerciseDetailScreen.js:299-301`); PeekMenu
   backdrop 180; heroZoom 280/200 (`RootNavigator.js:248-249`); MacroRings
   500 (`MacroRings.js:222`).
3. *Documented exemptions (in-file comment naming this spec):* splash
   choreography (`RootNavigator.js:1408-1447` — crown jewel,
   03-design-audit.md:219-220); rest-timer 1 s drain (`RestTimer.js:212` —
   time-proportional: 1 s of bar = 1 s of rest); PRCelebration particle
   physics (`PRCelebration.js:63,133,142-144,160`; 220→`exit`, 200→`state`
   where mechanical); Toast hold times (`Toast.js:40-47` are holds, not
   motion).
4. PressableCard's `speed/bounciness` springs re-expressed as
   `springs.press`/`springs.release` **only** as part of its rule-4 migration
   off JS Animated — not as a drive-by.

### 3.2 Fit rules — every future animation must pass all six

**Rule 0 — Gate test.** Every animation, haptic and celebration honours
**both** `accessibility.reduceMotion` **and** ED-calm/flag suppression.
Shipped patterns to copy exactly: store read
`useAppStore(s => s.accessibility?.reduceMotion)` (`PressableCard.js:38`;
`AnimatedRow.js:31-35` plain-View fallback; `PeekMenu.js:45` with
`duration: reduceMotion ? 0 : …` at :62-67,79-87; `RestTimer.js:203-206`
static step); haptics gate `haptics.js:19-22`; ED gate
`WorkoutSummaryScreen.js:390-401` (`suppressed = calm || !!edFlag` via
`getWellbeingMode()`/`isCalm` from `src/lib/wellbeing.js:34-36` +
`getOpenEdPatternFlag`); `PRCelebration.js:41,110`. *Testable:* any new file
importing `react-native-reanimated` or `expo-haptics` must either be a
self-gating primitive (AnimatedRow, AnimatedEntrance, PressableCard,
lib/haptics.js) or contain a `reduceMotion` reference — a source-level
regression guard in the codebase's established fs.readFileSync + regex
convention (CLAUDE.md §3). Celebratory/weight/food-adjacent motion must
additionally reference the calm/ED suppression.

**Rule 1 — Purpose test.** An animation must communicate state, direct
attention (one hero per screen), establish spatial continuity, or reward.
Reward-class motion exists in exactly **three moments**: PR
(`PRCelebration.js`), the 50/100-session milestone rungs
(`WorkoutSummaryScreen.js:424-430`), and the plan-ready reveal
(`ProSetupCompleteScreen.js` — the Pro funnel's peak,
03-design-audit.md:201-203). Decoration anywhere else is rejected in review.
*Testable:* PR checklist question + `springs.expressive` grep restricted to
those three surfaces.

**Rule 2 — Token test.** Only sanctioned durations
(`micro/state/enter/exit/hero/sheet/pulse`), springs (`motion.springs.*`) and
easings (the three beziers or their `cssEase` twins; linear for
time-proportional fills only). *Testable:* source guard failing any numeric
literal in `withTiming(…, {duration:`, `FadeIn*.duration(`,
`withSpring(…, {stiffness:` outside `theme.js` and the named exemption list.

**Rule 3 — Intensity rule.** The core logging loops — set logging in
ActiveWorkout and food logging in Diary/FoodSearch, the two highest-frequency
loops (03-design-audit.md:209-211) — get the **fastest, quietest** motion in
the app: `micro`/`state` durations, `press`/`release`/`settle` springs,
`setLogged`/`selection` haptics, nothing louder. Preserves the shipped
strength "matching last session = 1 tap per set" (02-ux-audit.md:41-42) —
motion must never add perceived latency to a log. *Testable:* grep
`motion.hero|springs.expressive` in
ActiveWorkoutScreen/DiaryScreen/FoodSearchScreen/SetEntry = failure.

**Rule 4 — Performance budget.** 60 fps on mid-range Android, all animation
on the UI thread: Reanimated CSS transitions/animations for state-driven
motion, worklets for gesture- and scroll-driven. **No JS-thread `Animated`
in new work**; the existing ten JS-Animated files (PressableCard, RestTimer,
Skeleton, Toast, MacroRings, PeekMenu, RootNavigator,
ActiveWorkout/WorkoutSummary/ProOnboarding screens) are a **frozen allowlist**
that migrates incrementally and never grows. Blur: `expo-blur` is not
installed (founder approval required); if ever approved, sparingly and
Android-device-tested per surface. *Testable:* source guard permitting
`Animated.timing|Animated.spring` only in the allowlisted files.

**Rule 5 — Interruption rule.** Every animation in the logging flow is
interruptible and never blocks input: (a) data commits first, animation
follows — never gate a write on an animation callback (sets already write to
SQLite at log time, 02-ux-audit.md:43-44); (b) no `pointerEvents` lock or
disabled state while animating; (c) springs/timings retarget mid-flight
(Reanimated does this natively) — no `Animated.sequence` chains that must
finish; (d) every auto-timeout is cancelled by the user's next action — the
shipped counter-example is the 1.8 s auto-advance never cleared by "Log
another set" (`ActiveWorkoutScreen.js:1035-1042`, finding CL-3,
02-ux-audit.md:82). *Testable:* PR checklist ("what happens if the user taps
mid-animation?") + Jest invariant where feasible.

### 3.3 Pattern proposals (a–g)

All proposals assume the token layer (§3.1) lands first; none needs a
platform upgrade (§1).

**a) Tab bar — anchored, translucent, spring pill; hidden during workouts.**
Current: default bar, opaque `colors.tabBar` (#111111, a deliberate
under-background), height 60 + inset, icon swap only
(`RootNavigator.js:491-524`); ActiveWorkoutScreen is registered inside
HomeStack (`RootNavigator.js:352`) with no per-screen `tabBarStyle` override
anywhere (the only `tabBarStyle` hit is `RootNavigator.js:495`), so **the tab
bar stays visible for the entire workout** and eats the bottom edge finding
CL-4 wants for the pinned Log-set CTA (`audit/02-ux-audit.md:83`).
Direction: **anchored, not floating** (a floating dock needs blur or heavy
translucency — banned Android-first — and steals ~16px of list on every long
scroll, fighting the edge-to-edge inset work at `RootNavigator.js:487-499`);
translucent surface fill + existing hairline top border; a custom `tabBar`
component with a sliding amber pill on `withSpring(motion.springs.settle)`
keyed to `state.index` + subtle icon settle-scale (1 → 1.06 → 1), pill jumps
under reduceMotion (matching `useStackMotionOverride`); `haptics.selection()`
on tab change (`haptics.js:84`). **No hide-on-scroll** (jittery on mid-range
Android, unpredictable mid-set) — instead **hide the bar entirely while
ActiveWorkout is focused** (`getParent().setOptions({ tabBarStyle:
{ display: 'none' } })` on focus, restore on blur): a live session is a mode,
not a tab. **No centre action button**: all five tabs are destinations
(`RootNavigator.js:518-522`) and the natural centre action is tier-split —
Diary is wholly Pro behind the show-then-sell gate the UX audit calls the
best gate in the app (02-ux-audit.md:59-64); a paywalling centre button
violates "never expose Pro to free". Diary already has its barcode FAB.
**Impact 6/10 · Effort M · Dependencies: token layer; no new libraries.**

**b) Buttons — Reanimated spring in the primitive, vocabulary haptics,
width-locked state morphing, one Skia-glow CTA.** Current: `Button.js`
(4 variants, 3 sizes) delegates press physics to PressableCard
(`Button.js:62`); **no haptic anywhere in the primitive** (neither file
imports haptics), and `loading` is an abrupt spinner swap that changes
content width (`Button.js:83-84`). Direction: migrate PressableCard's two
`Animated.spring` calls to `useSharedValue` + `withSpring(motion.springs.*)`
(theme.js:615 was written for exactly this) — same values (0.97 in; 0.94 for
hero via the existing `scale` prop, `PressableCard.js:34-36`) — upgrading
every button and card in the app at once. Haptics from the vocabulary inside
the primitive: `haptics.press()` (Light, `haptics.js:87`) on press-in for
`primary` and `destructive` variants only; `secondary`/`tertiary` stay silent
so frequent taps don't buzz; the vocabulary's reduce-motion no-op
(`haptics.js:19-27`) makes this safe by construction and fixes the "toggles
silent on some screens, haptic on others" inconsistency
(03-design-audit.md:173). State morphing: a `state` prop cross-fading content
via `FadeIn/FadeOut(motion.state)` inside a width-locked container; success
shows a checkmark ~900 ms with `haptics.commit()` then `onSettled`. Adoption
by payoff: WeeklyCheckIn submit (`WeeklyCheckInScreen.js:566` already fires
`commit()` — the visual should match), CoachOutput Apply rows — where a morph
to an explicit "Held at your safe minimum" settled state is also the UX fix
for the silent ED-floor no-op NU-3 (02-ux-audit.md:77; the wording is
safety-adjacent copy: hands-on, not agent work) — and food save actions.
**The single Skia-glow CTA class: the Home hero Start CTA and only it** —
the design audit's diagnosis is amber inflation
(03-design-audit.md:159-160) and its Home prescription is "Start is the sole
filled-amber element" (:143-149); a soft Skia radial bloom (static or a very
slow 4–6 s breathe, killed under reduceMotion, static under calm/ED) gives
the app exactly one glowing object. Skia is an in-app precedent
(`MacroRings.js`, `lib/shareCard/drawShareCard.js`), not a new capability.
Explicitly not: Log set (fires dozens of times per session — fast and matte)
and not the Paywall CTA (billing surface; any change needs its own written
plan per `docs/rules/billing.md`).
**Impact 7/10 · Effort M · Dependencies: token layer; none new.**

**c) Sheets — @gorhom/bottom-sheet behind the existing BottomSheet API (or a
gesture fallback).** Current: `BottomSheet.js` is solid (Modal + timing
slide, scrim, handle, tap-outside + back-button dismiss, reduce-motion aware,
`BottomSheet.js:24-71`) but lacks **drag-to-dismiss, snap points and
finger-tracking open/close physics**; `ExercisePickerModal` is a full-screen
RN `<Modal animationType="slide">` (`ExercisePickerModal.js:105`); set entry
is not a modal at all — inline in ActiveWorkoutScreen, praised as a core-loop
strength (02-ux-audit.md:39-44,109-115). Direction:

| Surface | Direction | Snap points |
|---|---|---|
| The 9 existing BottomSheet consumers | Re-implement `BottomSheet.js`'s API (visible/onClose/keyboardAvoiding/sheetStyle) as a wrapper over `BottomSheetModal` — zero call-site churn | Single dynamic snap (`enableDynamicSizing`), pan-down to dismiss |
| FoodDetailSheet | Same wrapper, two snaps | ~60% (log fast) → ~92% (serving picker + full nutrients) |
| ExercisePickerModal | Convert to a 92%-snap sheet, search pinned at top; workout faintly visible behind the scrim preserves mid-session-swap context | Single 92%, keyboard-aware |
| Set entry | **Do not convert** — a sheet would add a tap and an occlusion to the highest-frequency action in the app | n/a |

`@gorhom/bottom-sheet` is absent (capability check) — MIT, pure JS over the
already-installed reanimated + gesture-handler peers, no new native code.
Requires founder approval. **Fallback if declined:** add `Gesture.Pan()`
drag-to-dismiss + spring-settle to the existing BottomSheet with installed
libraries — 80% of the felt gain (interactive dismissal), no snap points,
zero dependencies. Either path also absorbs the PeekMenu/FeedbackSheet
timing drift (§2.3 item 2) onto the tokens.
**Impact 6/10 · Effort M (wrapper + 9 consumers) to L (picker conversion) ·
Dependencies: token layer; @gorhom/bottom-sheet (NEW — founder approval).**

**d) Lists & data — pulse skeleton coverage, one RollingNumber, one chart
engine.** Skeleton: keep the pulse (0.45↔0.85, reduce-motion static,
`Skeleton.js:27-58`) as the standard — **do not chase a shimmer sweep** (a
moving highlight needs masked-view, a new dep, or per-skeleton Skia gradient
sweeps — the wrong load profile for mid-range Android). The deficit is
coverage: the Progress tab root has no skeleton (whole dashboard pops with
layout shift), YouScreen has none, four data-heavy screens sit on bare
spinners (03-design-audit.md:181-184). Numbers: one shared `<RollingNumber>`
on Reanimated (shared value + `withTiming(motion.enter)` →
`useDerivedValue` → text in the theme's tabular-numeral `type.num()` styles) —
a count-up interpolation, not a per-digit slot machine (digit columns
multiply animated nodes for no legibility gain). Precedents shipped:
WorkoutSummary's animated tonnage counter (`WorkoutSummaryScreen.js:741-749`)
and MacroRings' centre count (`MacroRings.js:204-229`). Adopt at:
WorkoutSummary tonnage (replacing the bespoke JS-thread counter), Diary
remaining-kcal hero, Analytics weekly-volume numeral. **ED rule: the
body-weight number never ticks** — BodyMetrics/weight-trend values render
static always, not just under an open flag; the conservative reading of the
tier-blind guardrail posture, and it costs nothing. Charts: **recommend
against Victory Native XL** — a second chart engine against an in-file
architectural decision that already deferred Skia ("swappable to Skia later
behind this same API", `VolyumeChart.js:15-21`), and the charts are static
during scrub, so XL's headline win (UI-thread data updates) buys nothing.
Instead: an entering draw-in on the line (path-trim via `strokeDasharray`
interpolation, `motion.hero` 440 ms, once per mount, skipped under
reduceMotion) applied **only to the Analytics focal chart** the design audit
wants as that screen's owned visual (03-design-audit.md:121-127); a Skia
render-layer swap behind the same props stays a founder-gated follow-up.
**Impact 6/10 · Effort M · Dependencies: token layer; none new.**

**e) Transitions — codify the three-verb language; no navigator change.**
The language is already latent in the code: **Expand** (heroZoom — anything
opened from a card; fully deployed), **Push** (platform slide — peer
navigation; leave alone), **Sheet** (commitments/interruptions —
`presentation: 'modal'` on the stack, §c surfaces in-screen). **Do not
migrate to native-stack now**: under React Navigation v6 it would forfeit the
custom `cardStyleInterpolator` heroZoom depends on
(`withScreenBoundaries` wraps the factory, `RootNavigator.js:114-131`);
revisit only alongside a v7 upgrade. Full shared-element transitions are off
the table (Reanimated's shared transitions remain experimental on the New
Architecture; native-stack shared elements need v7). The high-value,
zero-risk version is **press-to-expand choreography**: the source card is a
PressableCard (already scales 0.97) and the destination heroZooms in from
0.92 — press-out and push starting together read as one continuous
expansion. Apply where it most aids orientation: **Plans list → PlanDetail**
(rows currently plain touchables) and **Analytics tile → LiftProgress** (the
audit's "nav hub" problem). Fix the one raw cut the audit names: the
choreographed splash hard-swaps to the first screen with no exit fade
(03-design-audit.md:178-179) — give it a `motion.exit` fade-through. And
complete the language inside screens: adopt `AnimatedRow` on Diary entry rows
and ActiveWorkout set rows so add/remove stops being a jump-cut
(03-design-audit.md:192-195).
**Impact 5/10 · Effort S–M · Dependencies: token layer; none new.**

**f) Haptic choreography — a five-class canon; close the bypasses.** The
vocabulary in `src/lib/haptics.js` is the single tuning point and its
reduce-motion no-op is the master gate (`haptics.js:19-37`). Verified live
wiring (correcting the design audit's stale "dead vocabulary" finding):

| Event | Signature | Fired at |
|---|---|---|
| Working set logged | Light impact | `ActiveWorkoutScreen.js:983-984,1214,1304,1334,2022,2047` |
| Warm-up set logged | selection | `ActiveWorkoutScreen.js:983` |
| Workout finished | Success + 2 Heavy (150/320 ms) | `ActiveWorkoutScreen.js:1578` |
| PR | Success + 2 Heavy (150/300 ms) | `PRCelebration.js:139` (subdued → single selection, `:132`) |
| Rest countdown 3-2-1 | Medium → Heavy → Heavy+Warning ladder | `RestTimer.js:9` (`restCountdown`) |
| Rest done (GO) | Success + 2 Heavy (200/400 ms) | `RestTimer.js:9` (`restDone`) |
| Plan ready | single Success | `ProSetupCompleteScreen.js:21` |
| Check-in submitted | Medium "commit" beat | `WeeklyCheckInScreen.js:566` |
| Diary delete / undo | commit / selection | `DiaryScreen.js:680,684` |
| Chart scrub per point | selection | `VolyumeChart.js:137` |
| Milestone rung | prAchieved reused | `WorkoutSummaryScreen.js:20` (`hapticMilestone`) |

Proposed canon — five classes: **selection** (`selectionAsync`): warm-up
set, picker/toggle/chip change, tab change (new, §a), scrub ticks, undo.
**light** (`Impact.Light`): working set logged, primary Button press-in
(new, §b), rest 3 s warning. **medium "commit"** (`Impact.Medium`): check-in
submitted, delete confirmed, sheet committed (Quick-add save). **success**
(`Notification.Success` ± Heavy beats): workout complete, PR, rest GO, plan
ready, barcode lock-on. **warning** (`Notification.Warning`): blocked
action/validation error (`haptics.error()`, `ActiveWorkoutScreen.js:1477`) —
**never attached to ED-floor holds; a safety hold is calm information, not an
error buzz**. Gaps to close (all one-liners through the vocabulary): the raw
expo-haptics bypasses — `SetEntry.js:45,69` (stepper ticks → `selection()`),
`FeedbackSheet.js:147,218,271` (→ `selection()`/`planReady()`),
`PeekMenu.js:52` (long-press Medium → `commit()`), `ScanBarcodeScreen.js:111`
(barcode Success → a new `scanLocked()` or `planReady()`). Android reality:
mid-range rotary motors render `impactAsync` coarsely and some OEMs collapse
Light/Medium — the rest ladder works precisely because it varies pattern and
count, not amplitude; keep multi-beat signatures for the big moments and
never encode meaning in amplitude alone. The rest-end-while-locked problem is
**not** a haptics problem: no scheduled end-of-rest trigger exists when
backgrounded (finding CL-1, 02-ux-audit.md:73); the fix lives in the
notifications system under `docs/NOTIFICATIONS_LOCKED.md` — out of scope,
flagged as the dependency it is.
**Impact 7/10 · Effort S · Dependencies: none (can precede the token layer).**

**g) Celebration moments — exactly three; Skia + Reanimated; no Lottie, no
Rive.** Current: PRCelebration (40-particle burst + haptic ladder + subdued
mode, `PRCelebration.js:109-129`); MilestoneBurst (all-gold variant for the
50/100-session rungs, callers gate on `calm || !!edFlag`,
`WorkoutSummaryScreen.js:391-430,1205`); ProSetupComplete — flat fade+slide
with a statically-full progress bar, the Pro funnel's under-celebrated peak
(03-design-audit.md:200-203). The three that earn expressive animation:

1. **PR** — user-earned, unambiguous, frequency self-limiting. Elevation:
   migrate the particle system from 40 JS `Animated.Value` quadruplets
   (`PRCelebration.js:24-35`) to a single Skia canvas (one draw pass,
   positions from one Reanimated clock) — dramatically cheaper on mid-range
   Android and richer (glow, trails), zero new dependencies. Subdued/
   reduce-motion contract carries over verbatim.
2. **Milestone rungs 50/100 sessions** — celebrates consistency, the app's
   most defensible value and completely weight-neutral. Same Skia migration,
   gold palette, existing `calm||edFlag` gate untouched.
3. **ProSetupComplete plan reveal** — the one currently-flat moment that
   earns choreography, at the emotional peak of the paid funnel during the
   trial-churn window (finding OB-4). Not confetti — a staged reveal: kcal
   ring draws in (Skia arc sweep), macro rows cascade via the existing
   `FadeInDown` entrances, split name settles last, `planReady()` at the
   beat. Calm register, no fanfare copy. **ED note:** this screen shows
   calorie targets — under an open ED flag or calm mode the reveal renders
   instantly and quietly (numbers are information, never spectacle), and if a
   floor raised the target the reveal must not dramatise the number at all.

Everything else stays quiet — streaks, weekly check-in completion, sync,
weight entries, workout finish (its `workoutComplete()` haptic + tonnage
counter is already the right size). **Weight-loss-adjacent moments never
celebrate: no confetti, ticker, glow or success-toned animation on any weight
or calorie-delta surface, and absolutely nothing under an open ED flag** —
the `calm || edFlag` suppression at `WorkoutSummaryScreen.js:400` is the
mandatory template for any new celebratory mount. **Lottie vs Rive: neither.**
Both are new dependencies (absent per §1); Rive additionally ships a native
runtime (the heaviest ask). The three moments above are particles, arcs and
cascades — exactly what installed Skia + Reanimated does best,
deterministically, themable from theme tokens, with no designer-tooling
pipeline, no asset-versioning surface, and no new ED-audit surface hidden
inside an opaque .riv/.json file. If a future brand-character moment
genuinely needs keyframed vector art, revisit Lottie then, with a founder
decision.
**Impact 7/10 · Effort M · Dependencies: token layer; none new (explicitly
avoids two would-be new ones).**

### 3.4 Proposal summary

| § | Direction | Impact | Effort | New deps |
|---|---|---|---|---|
| a) Tab bar | Anchored translucent + hairline, spring pill, selection haptic, hidden during ActiveWorkout, no centre button | 6 | M | none |
| b) Buttons | Reanimated spring + vocabulary haptics in the primitive, width-locked state morphing, Skia glow on Home Start only | 7 | M | none |
| c) Sheets | @gorhom behind the existing BottomSheet API; 2-snap FoodDetailSheet; picker → 92% sheet; set entry stays inline forever | 6 | M–L | @gorhom/bottom-sheet (approval req.) |
| d) Lists & data | Pulse-skeleton coverage sweep, one RollingNumber (never body-weight), single SVG chart engine + Analytics draw-in | 6 | M | none |
| e) Transitions | Three-verb language, press-to-expand continuity, splash exit fade, AnimatedRow on Diary/set rows; no navigator change | 5 | S–M | none |
| f) Haptics | Five-class canon, close the raw-expo-haptics bypasses, tab + button haptics | 7 | S | none |
| g) Celebrations | Three moments only (PR, 50/100 rungs, plan reveal), Skia + Reanimated, existing ED/calm gates; no Lottie/Rive | 7 | M | none |

---

## 4. Recommended adoption order

Each step is independently shippable, one session + one founder device-walk
(EAS build), ED/calm/reduce-motion gates untouched throughout. Ordered
highest-visibility lowest-risk first; the evidence supports the press +
haptics-first default, with one amendment — two of the haptics/gating items
are outright **defects** (reduce-motion bypasses and the one ungated
animation), so they lead even before the token layer.

1. **Defect closure: haptic bypasses + the one ungated animation (§f, part
   of Rule 0).** Route `SetEntry.js:45,69`, `FeedbackSheet.js:147,218,271`,
   `PeekMenu.js:52`, `ScanBarcodeScreen.js:111` through `lib/haptics.js`;
   gate the YearOfLifts pip fill (`YearOfLiftsScreen.js:465-477`) on
   `reduceMotion`. *Rationale:* these are accessibility-promise violations,
   not polish; every fix is a one-liner; zero visual change; S effort,
   immediate integrity win.
2. **Token layer extension (§3.1, Phase-0 discipline).** Add `pulse`,
   `springs.{press,release,settle,expressive}`, `cssEase`; keep all legacy
   aliases (`spring` → `springs.settle` — zero call sites, safe). No call
   sites migrate yet; lint + full suite green. *Rationale:* everything below
   consumes it; no pixels change, so risk is nil.
3. **Fit-rule regression guards (Rules 0, 2, 3, 4 as source-level tests).**
   The codebase's fs.readFileSync + regex convention, with the named
   exemption list (splash, rest-drain, PRCelebration physics, Toast holds)
   and the frozen JS-Animated allowlist. *Rationale:* lock the discipline
   BEFORE new motion lands, so every subsequent step is born compliant.
4. **Dead-tap sweep + press unification (§2.2 + §b first half).** Give every
   raw static-style Pressable a pressed state (PressableCard where
   card-shaped, `({pressed}) =>` opacity/tint elsewhere), starting with the
   Article 9 consent row, GoalLock controls, the food-sheet primary CTAs and
   PerDayTargets steppers; migrate PressableCard to
   `withSpring(motion.springs.press/release)` (upgrading Button, Card, Chip,
   Stepper and 14+ consumers at once); add `haptics.press()` to
   primary/destructive Button variants. *Rationale:* the single
   highest-visibility felt change in the audit — hundreds of taps per session
   pass through these controls — and mechanically low-risk because the values
   are unchanged, only the runtime.
5. **Transition quick wins (§e).** Splash `motion.exit` fade-through;
   `AnimatedRow` on Diary entry rows and ActiveWorkout set rows (the
   component exists — ~3 lines per list); press-to-expand on Plans →
   PlanDetail and Analytics tile → LiftProgress. *Rationale:* S–M effort,
   kills the jump-cuts in the two highest-frequency loops, no new surface
   area.
6. **Token migration sweeps (§3.1 backlog).** Zero-diff swaps in one PR;
   founder-eyeball retimes in a second with the eyeball list attached;
   exemption comments in a third. *Rationale:* grep-driven, near-zero visual
   diff, and it makes the Rule 2 guard's exemption list honest.
7. **Haptic canon + new events (§f remainder).** Tab-change `selection()`
   (with §a or standalone), Button press haptics (landed in step 4),
   `scanLocked()`. *Rationale:* one-liners against an already-proven
   vocabulary.
8. **Lists & data (§d).** Skeleton coverage for Progress root, YouScreen and
   the four spinner screens; `<RollingNumber>` (WorkoutSummary tonnage first —
   it also retires a JS-thread counter from the allowlist); Analytics hero
   chart draw-in. *Rationale:* M effort, visible on the most data-dense
   screens, and the tonnage swap doubles as a Rule-4 migration.
9. **Tab bar (§a).** Custom tabBar with the spring pill + translucent fill;
   hide during ActiveWorkout. *Rationale:* M effort and touches navigation
   chrome app-wide, so it benefits from the guards and tokens being settled;
   the ActiveWorkout hide is the piece with real UX payoff (CL-4/CL-5).
10. **Sheets (§c) — after a founder dependency decision.** If
    @gorhom/bottom-sheet is approved: wrapper first (zero call-site churn),
    then two-snap FoodDetailSheet, then the ExercisePickerModal conversion.
    If declined: the `Gesture.Pan()` drag-to-dismiss fallback on the existing
    BottomSheet. Either way, fold PeekMenu/FeedbackSheet onto the shared
    sheet timings. *Rationale:* blocked on approval; the fallback keeps it
    unblocked at 80% of the felt gain.
11. **Celebrations (§g).** Skia particle migration for PR + milestone rungs,
    then the ProSetupComplete staged reveal. *Rationale:* last because it is
    the most expressive, most ED-sensitive work — it should land on top of a
    proven gate/guard/token stack, and each moment needs its own founder
    device-walk of the subdued/calm paths.
12. **Incremental JS-Animated allowlist burn-down (Rule 4, ongoing).**
    RestTimer, Skeleton, Toast, MacroRings, PeekMenu, RootNavigator splash,
    the three screens — migrated opportunistically when a file is already
    being touched, never as a drive-by.

---

## 5. Closing note

These items flow into the master ranking (`06-MASTER-PLAN.md`) like
everything else — nothing here is pre-authorised by this document; impact
and effort scores above are inputs to that ranking, and the fit rules (§3.2)
apply to any motion work that ranks in from any other audit too. All of it
sits inside the design audit's phase model (Phase 0 tokens → Phase 1
mechanical sweeps → Phase 2 felt layer), honours the crown-jewels
do-not-break list (03-design-audit.md:219-223), and ships nothing on an
ED-suppressed surface except in its subdued form.

**NEW DEPENDENCIES that would need explicit founder approval (name, purpose,
licence) — per CLAUDE.md, none may be added without a yes:**

| Package | Purpose | Licence | Recommendation |
|---|---|---|---|
| `@gorhom/bottom-sheet` | Interactive sheets: drag-to-dismiss, snap points, finger-tracking physics, hidden behind the existing `BottomSheet.js` API (§3c) | MIT (pure JS over installed reanimated + gesture-handler peers; no new native code) | **Requested** — the only dependency this document asks for; a zero-dependency `Gesture.Pan()` fallback is specified if declined |
| `expo-blur` | Blurred materials (frosted tab bar / sheets) | MIT | **Not requested** — banned by the Android-first material rule; translucent fill + hairline instead |
| `lottie-react-native` | Keyframed vector celebration animations | Apache-2.0 | **Not requested** — the three celebration moments are built with installed Skia + Reanimated; revisit only for a future brand-character moment, with a founder decision |
| `rive-react-native` | Interactive vector animation runtime | MIT (ships a native runtime — the heaviest ask) | **Not requested** — same reasoning as Lottie, plus a native runtime and an opaque asset format that would create a new ED-audit surface |

No other proposal in this document adds a dependency, and none requires a
platform upgrade (§1).
