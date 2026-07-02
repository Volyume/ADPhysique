# Volyume — Motion & Materials Audit (03b)

Date: 2026-07-02 · Read-only session · Method: three parallel motion
subagents (capability check, motion inventory + dead-tap census, pattern
proposals + token-system extraction), every claim re-verified at the cited
file:line against the working tree. Companions: `03-design-audit.md` (visual
system; this document extends its §3 motion inventory), `02-ux-audit.md`
(journeys/friction), `06-MASTER-PLAN.md` (ranking).

**Headline.** The platform question answers itself: **no upgrade is a
prerequisite** — Reanimated 4.1.7, worklets 0.5.1 and the New Architecture
are already shipped and correctly configured; a Reanimated-4 motion system
can be built on the current config with zero architecture migration. The gap
is *adoption*, not *capability*: 3 files use Reanimated versus 17–19 on the
legacy JS `Animated` API, the shipped `motion.springs`/`cssEase` tokens have
**zero consumers**, four press-feedback dialects coexist, three hand-rolled
sheet engines plus ~31 raw `Modal` sheets drift on timing, and no button in
the app fires a haptic. Everything premium-feeling that remains to build
(spring press physics, drag-to-dismiss sheets, Skia celebrations, rolling
numbers) is possible on installed dependencies except one: `@gorhom/bottom-sheet`
would need founder approval.

**Corrections to the record (this document supersedes the earlier 03b state
where they conflict):**
- The repo has already absorbed the first two steps of the earlier 03b §4:
  the full motion token layer is live including `motion.pulse`,
  `motion.springs.{press,release,settle,expressive}` and `cssEase`
  (`src/styles/theme.js:600-640`); the raw expo-haptics bypasses are closed
  (`SetEntry.js:45,69` now call `haptics.selection()`;
  `FeedbackSheet.js:147,220,273`, `PeekMenu.js:54`, `ScanBarcodeScreen.js:38`
  all route through `src/lib/haptics.js`); the YearOfLifts pip fill is now
  reduce-motion gated (`YearOfLiftsScreen.js:383,469`); the food-sheet dead
  taps have pressed states (`QuickAddSheet.js:105-123`,
  `FoodDetailSheet.js:165-201`); AnalyticsScreen has skeleton coverage and a
  VolyumeChart hero (`AnalyticsScreen.js:322-325,415-424,790,829`); and
  NAV-5 re-tap-to-root is fixed (`RootNavigator.js:262-270`).
- Design audit §3's "seven files bypass the haptics vocabulary" is therefore
  stale: `src/lib/haptics.js` is now the **only** importer of `expo-haptics`
  (grep-verified). The remaining haptics work is new events, not bypasses.
- The JS-`Animated` count is larger than previously recorded: **17 source
  files** import it (19 touching the API including indirect use), not ~10.

---

## 1. Capability check — is a Reanimated 4 / New Architecture upgrade a prerequisite?

**No. Stated plainly: no upgrade is a prerequisite.** Reanimated 4 is already
installed and the New Architecture is already enabled. The codebase is on
Expo SDK 54 / RN 0.81.5 with `newArchEnabled: true` and
`react-native-reanimated` 4.1.7 resolved, with the required
`react-native-worklets` package and Babel plugin correctly wired. Zero config
changes remain; zero existing usages would break.

### 1.1 Core platform (verified)

| Item | Declared | Installed | Evidence |
|---|---|---|---|
| Expo SDK | `expo ~54.0.35` | 54.0.35 | `package.json:57` |
| React Native | `0.81.5` (exact) | 0.81.5 | `package.json:88` |
| React | `19.1.0` | — | `package.json:87` |
| New Architecture | `"newArchEnabled": true` | n/a | `app.json:19` |
| react-native-reanimated | `~4.1.1` | **4.1.7** | `package.json:93` |
| react-native-worklets | `0.5.1` (exact) | 0.5.1 | `package.json:100` |

SDK 54 enables the New Architecture by default (default since SDK 53; SDK 54
/ RN 0.81 is the last release where opting out is even supported — the legacy
architecture is frozen upstream). Volyume does not rely on the default: the
flag is explicit at `app.json:19`. `react-native-nitro-modules 0.35.9`
(`package.json:92`) is a further New-Arch-native dependency confirming the
app builds and ships on the New Architecture today.

### 1.2 Motion-library inventory

| Library | Status | Version | Evidence |
|---|---|---|---|
| react-native-gesture-handler | Present | `~2.28.0` (2.28.0) | `package.json:90` |
| @shopify/react-native-skia | Present | `2.2.12` (exact pin) | `package.json:54` |
| expo-haptics | Present | `~15.0.8` (15.0.8) | `package.json:67` |
| expo-image | Present | `~3.0.11` (3.0.11) | `package.json:68` |
| expo-linear-gradient | Present | `~15.0.8` | `package.json:70` |
| react-native-svg | Present | `15.12.1` | `package.json:96` |
| @gorhom/bottom-sheet | **NOT installed** | — | absent from `package.json` and `node_modules` |
| expo-blur | **NOT installed** | — | absent |
| lottie-react-native | **NOT installed** | — | absent |
| rive-react-native | **NOT installed** | — | absent |

Adjacent facts: Skia is already product code (`src/components/food/MacroRings.js`,
`src/lib/shareCard/drawShareCard.js`, `src/screens/ShareCardScreen.js`), so
Skia-driven motion is precedent, not a new capability. The hand-rolled sheet
at `src/components/BottomSheet.js` (JS `Animated`) means a @gorhom adoption
would be a replacement, not a greenfield add.

### 1.3 Wiring and what an "upgrade" would have involved (already done)

- **Babel/worklets: correct for RA4.** `babel.config.js:18-20` documents the
  change and pushes `react-native-worklets/plugin` last in the plugins list —
  exactly right (the old `react-native-reanimated/plugin` is superseded).
- **RA4's New-Architecture requirement: satisfied** (`app.json:19` + RN
  0.81.5 + SDK 54). No `app.config.js/ts` exists; nothing to flip.
- **Breaking usages: none in practice.** Only 3 files import Reanimated and
  all use RA4-safe APIs (`FadeInDown`/`FadeOut`/`LinearTransition` in
  `src/components/AnimatedRow.js:22` and `AnimatedEntrance.js:20`; `runOnJS`
  in `src/components/VolyumeChart.js:34`). There are no RA2/RA3-era
  `useAnimatedStyle`/`useSharedValue` call sites to audit; the 17
  JS-`Animated` files are untouched by Reanimated versioning.
- **Custom native modules: no implications.** Both are Expo Modules API
  modules (New-Arch-compatible by construction, independent of Reanimated):
  `modules/live-activity` (iOS Swift, `expo-module.config.json`
  `"platforms": ["ios"]`, `LiveActivityModule`) and `modules/rest-timer-live`
  (Android Kotlin, `expo.modules.resttimerlive.RestTimerLiveModule`),
  consumed as `file:` deps (`package.json:85,101`) and already shipping in
  New-Arch EAS binaries.
- **Managed-workflow constraint holds.** All four missing libraries above
  work without ejecting (config-plugin/autolinked); "never eject" is not
  threatened by any of them — but each is a new dependency requiring founder
  approval before install (CLAUDE.md §2), see §5.

**Practical implication:** the work is migration of 17 JS-`Animated` files,
not platform surgery — matching the open tracker item ("Wave 4 track B:
motion foundation … JS-runtime migrations").

---

## 2. Motion inventory — what exists, what's dead, what's inconsistent

Scope: all of `src/` (tests excluded). Grep-verified: 19 files touch the JS
`Animated` API, 3 import Reanimated, 0 use `LayoutAnimation`, 1 file
(`src/lib/haptics.js`) is the sole importer of `expo-haptics`, 2 use
gesture-handler. No `TouchableHighlight`/`TouchableNativeFeedback`, no
`android_ripple` anywhere.

### 2.1 What exists (25 classified surfaces)

Thread legend: **UI** = worklet/native-driven; **native-driven JS** = JS
`Animated` with `useNativeDriver: true` (ticks native, orchestrates on JS);
**JS** = per-frame JS work.

| # | Surface | What moves | API / thread | Pattern or one-off | Reduce-motion gated |
|---|---|---|---|---|---|
| 1 | `src/components/AnimatedEntrance.js:38-48` | fade+rise entrance, 30ms stagger cap 8, `motion.enter` | Reanimated `FadeInDown` / UI | **Pattern** — 9 adopters (ReadinessCards, WorkoutHistory, Consistency, LiftProgress, ExerciseDetail, Analytics, Diary, PlanDetail, PlansScreen) | Yes (plain View, :31) |
| 2 | `src/components/AnimatedRow.js:40-50` | enter `FadeInDown`, exit `FadeOut`, siblings `LinearTransition` | Reanimated layout / UI | **Pattern** (`food/MealSection.js`, `ActiveWorkoutScreen.js`) | Yes (:33) |
| 3 | `src/components/PressableCard.js:41-66` | press-in spring to 0.97 scale + 0.92 opacity dip | JS `Animated.spring` / native-driven JS | **Pattern — the sanctioned press feel**; ridden by `Button.js:21`, `Chip.js:13`, `Card.js:17`, `Stepper.js:15`, `SettingsPrimitives.js:17`, `ExerciseCard.js:5` + 6 screens | Yes (:42, :52, :61) |
| 4 | `src/components/BottomSheet.js:55-69` | scrim fade + panel slide (`motion.sheet` 260ms open, 200ms close) | JS `Animated.timing` / native-driven JS | **Pattern** — 9 adopters (FoodDetailSheet, CuratedMealSheet, QuickAddSheet, CalorieBankSheet, MacroBreakdownSheet, CancelReasonSheet, PostLapseSheet, PlanUpdateScreen, MealPlanScreen) | Yes (:52-54, :62) |
| 5 | `src/components/PeekMenu.js:62-92` | own slide+scrim (280ms in / `motion.state` out) | JS / native-driven JS | **One-off** — duplicates #4 with different numbers | Yes |
| 6 | `src/components/FeedbackSheet.js:155-198` | own slide+scrim (220/280ms in, 180/220ms out) | JS / native-driven JS | **One-off** — third hand-rolled sheet, third timing set | Yes |
| 7 | `src/components/Toast.js:101-156` | slide-up 40px + fade (220/260ms in, 180ms out), fallback timer :163 | JS / native-driven JS | **Pattern** (single app-wide host) | Yes (:104, :146) |
| 8 | `src/components/Skeleton.js:29-47` | opacity pulse 0.45↔0.85, `motion.pulse` (750ms) | JS `Animated.loop` / native-driven JS | **Pattern** (Skeleton/SkeletonCard/SkeletonRow) | Yes — static 0.6 (:28, :55) |
| 9 | `src/components/RestTimer.js:198-218,297-303` | draining fill: 1s linear `scaleX` glide per tick | JS / native-driven JS | One-off (bespoke) | Yes — static step (:203-206) |
| 10 | `src/components/PRCelebration.js:141-177` | 40-particle confetti burst, overlay fade, card scale-in | JS `Animated.spring/stagger` / native-driven JS | One-off (flagship reward) | Yes — subdued toast (:114-115, :129-135) |
| 11 | `PRCelebration.js` `MilestoneBurst` :50-79 | gold-only burst, no card (rungs 50/100) | JS / native-driven JS | One-off | Yes — null (:79); callers gate calm/ED (:42) |
| 12 | `src/components/food/MacroRings.js:204-225` | kcal number + ring interpolate 500ms via `addListener`+`setState` | JS `Animated.timing`, `useNativeDriver: false` / **JS thread** | One-off | Yes (:210) |
| 13 | `src/components/VolyumeChart.js:33-137` | scrub gesture → tooltip index; `haptics.selection()` per point (:137) | gesture-handler `Gesture` + `runOnJS` / gesture UI, response JS | One-off (single chart engine) | haptic gated via vocabulary |
| 14 | `src/components/food/EntryRow.js:3,84-99` | swipe-to-reveal delete | gesture-handler v1 `Swipeable` / native | One-off (only swipeable row) | **Not gated** (library default) |
| 15 | `src/navigation/RootNavigator.js:227-251` `heroZoomTransition` | destination fades + scales 0.92→1 (280/200ms) | `cardStyleInterpolator` / native | **Pattern** — ActiveWorkout, WorkoutSummary ×2, PlanDetail, RoutineDetail, ExerciseDetail (:352-353, :382-384, :409) | Yes — `useStackMotionOverride` (:256-259), merged into every stack (:272, :349, :379, :406) |
| 16 | `RootNavigator.js:1407-1480` SplashScreen | staged hero scale/fade, wordmark rise, accent sweep | JS `Animated.sequence` / native-driven JS | One-off (brand) | Yes — end-state values (:1411-1417) |
| 17 | `src/screens/ActiveWorkoutScreen.js:259,567-578` | info-icon pulse loop (1↔1.35, 700ms) | JS `Animated.loop` / native-driven JS | One-off | Yes (:567) |
| 18 | `src/screens/ExerciseDetailScreen.js:185,290-301` | goal-hit congrats fade (300/400ms) | JS / native-driven JS | One-off | Yes (:290) |
| 19 | `src/screens/ProOnboardingScreen.js:145,512-530` | staged "building your plan" fade (`motion.enter`) | JS + setTimeout stages | One-off | Yes — spinner instead (:551) |
| 20 | `src/screens/ProSetupCompleteScreen.js:101-116` | fade+slide entrance, `planReady()` haptic (:107) | JS / native-driven JS | Hand-rolled entrance (pre-dates AnimatedEntrance) | Yes (:101-108) |
| 21 | `src/screens/WelcomeScreen.js:39-46` | 480ms fade + 24px slide-up | JS / native-driven JS | Hand-rolled entrance, different numbers | Yes (:43) |
| 22 | `src/screens/WorkoutSummaryScreen.js:1220-1230` `FadeInView` | fade+14px rise, per-block delay | JS / native-driven JS | Third hand-rolled duplicate of the idiom | Yes (:1225) |
| 23 | `WorkoutSummaryScreen.js:1262-1290` stat count-up | numbers tick 0→target, 900ms, 80ms stagger | **rAF + setState / JS thread** | One-off | Yes (:1268) |
| 24 | `src/screens/YearOfLiftsScreen.js:466-485` | story progress bar width % | JS `Animated.timing`, **`useNativeDriver: false`** (:480) / JS thread | One-off | Yes (:469) |
| 25 | ~31 hand-rolled `Modal` sheets | native `animationType="slide"` (15 sites) / `"fade"` (16) across ActiveWorkoutScreen (8), HomeScreen (3), DiaryScreen (3), RoutineDetail/BuildWorkout (2 each), AppAlert, InfoTooltip, ExercisePickerModal, ProGate, etc. | RN `Modal` / native | **Anti-pattern cluster** — bypasses shared BottomSheet chrome (#4) | **No — never gated.** Zero conditional `animationType` sites exist |

**Haptics (all reduce-motion gated centrally).** `src/lib/haptics.js` is a
named 13-intent vocabulary and the only `expo-haptics` importer; every helper
no-ops under reduce-motion (:19-37). Vocabulary: `setLogged`, `warmupLogged`,
`prAchieved`, `restDone`, `restAlmostDone`, `restCountdown` (3/2/1 escalating
ladder), `planReady`, `selection`, `press`, `workoutComplete`, `error`,
`commit`. Call sites: RestTimer (`RestTimer.js:106,133-144,171`), set logging
(`ActiveWorkoutScreen.js:1002-1003,1233`), PR/milestone
(`PRCelebration.js:132,139`; `WorkoutSummaryScreen.js:433`), chart scrub
(`VolyumeChart.js:137`), pickers/toggles (`ReasonPicker.js:23`,
`SetEntry.js:45,69`, SettingsCoaching/Data/Privacy), destructive commit +
undo (`DiaryScreen.js:660,680,684`, `StreakWeeksSection.js:84,91`,
`WeeklyCheckInScreen.js:566`, `PeekMenu.js:54`), barcode success
(`ScanBarcodeScreen.js:38`), plan ready (`ProSetupCompleteScreen.js:107`,
`FeedbackSheet.js:220`). Notable gap: the shared `Button.js` primitive fires
**no** haptic — `haptics.press()` has exactly one caller
(`DiaryScreen.js:660`), so "primary action" haptics are effectively
unadopted.

### 2.2 Dead taps (interactive elements with no feedback)

The app is close to fully covered *visually* — 548 `TouchableOpacity` sites
all inherit at least the default 0.2 press dim; all 29 feedback-styled
`Pressable` files use `pressed && {opacity: 0.7}` or a background change.
Genuine zero-feedback cases:

1. **`src/screens/YearOfLiftsScreen.js:636-637`** — invisible story tap zones
   (`tapLeft`/`tapRight`, styles :785-786): no visual state, no haptic, no
   pressed style. Only cue is the JS-thread progress bar (#24). A dead tap on
   a flagship reward surface.
2. **Backdrop/scrim catchers** (intentional, zero acknowledgment):
   `ProGate.js:100-101`, `MyRecipesScreen.js:214-215`,
   `MyMealsScreen.js:194-195`, `DiaryScreen.js:1044,1068-1069,1103-1104`,
   `PlanLibraryScreen.js:587-588`, `PlansScreen.js:1043-1044`, plus
   `activeOpacity={1}` scrims in `HomeScreen.js:1846,1878`,
   `ActiveWorkoutScreen.js:2516,2563,2659`, `ExerciseDetailScreen.js:818`,
   `AppAlert.js:83-84`, `RoutineDetailScreen.js:507-508`,
   `StreakWeeksSection.js:178`, `InfoTooltip.js:24`.
3. **Sheet-body no-op catchers** — `Pressable onPress={() => {}}` (7 sites,
   e.g. `DiaryScreen.js:1069`, `MyMealsScreen.js:195`,
   `PlanLibraryScreen.js:588`): correctly inert, but register as tappable to
   assistive tech with no role.
4. **Haptic dead taps** (visual present, tactile absent): every `Button.js`
   CTA, all tab-bar taps (`RootNavigator.js:491-523` stock tab buttons), and
   the ~430 `TouchableOpacity` sites on the default dim.

### 2.3 Consistency gaps

1. **Four press-feedback dialects coexist**: (a) PressableCard spring 0.97 +
   0.92 opacity dip — the sanctioned one; (b) `TouchableOpacity` default
   `activeOpacity` 0.2 (~430 of 548 sites — much harsher than anything else);
   (c) explicit `activeOpacity` scattered across 8 values (42×0.85, 16×0.8,
   16×0.7, 15×0.75, 10×0.88, 2×0.9, 2×0.82); (d) `Pressable`
   `pressed && {opacity: 0.7}` (29 files) plus PeekMenu's background variant
   (`PeekMenu.js:131`).
2. **Three hand-rolled sheet engines + one native cluster**: shared
   `BottomSheet.js` (260/200ms), `PeekMenu.js` (280/`motion.state`),
   `FeedbackSheet.js` (220-280/180-220), and ~31 raw
   `Modal animationType="slide"/"fade"` sheets — so timing and scrim darkness
   drift, exactly what BottomSheet's header says it was extracted to stop
   (`BottomSheet.js:6-9`).
3. **Reduce-motion coverage is excellent except two classes**: native `Modal`
   animations (31 sites, never gated) and the `Swipeable` food row
   (`food/EntryRow.js:84`). Everything else — every Animated/Reanimated
   surface, navigation transitions (`RootNavigator.js:256-259`) and all
   haptics — gates correctly.
4. **Entrance idiom duplicated four ways**: AnimatedEntrance (UI thread,
   tokenised) vs hand-rolled fade+rise in WelcomeScreen (480ms),
   ProSetupCompleteScreen, and WorkoutSummary `FadeInView` (320/360ms) —
   three JS-Animated re-implementations with divergent numbers.
5. **Three JS-thread hotspots** on mid-range-Android-critical paths:
   MacroRings listener+setState count-up (`MacroRings.js:216-222`),
   WorkoutSummary rAF count-up (:1284+), YearOfLifts
   `useNativeDriver: false` width anim (:480). VolyumeChart scrubbing also
   re-renders on JS per point (`runOnJS`, :34).
6. **Token adoption incomplete**: `motion.springs`/`cssEase` have zero
   consumers (grep-verified); PressableCard still hard-codes
   `speed: 30/18, bounciness: 0/6` (`PressableCard.js:45-57`); ~15 surfaces
   carry magic-number durations (Toast 220/260/180, PeekMenu 280,
   FeedbackSheet 220/280/180/220, PRCelebration 200/300/500/600, Welcome
   480, count-up 900).
7. **Reanimated 3 files vs 19 on JS `Animated`** — the two Reanimated
   primitives are the only UI-thread motion; every celebration, sheet, toast,
   skeleton and press spring rides the JS API (all `useNativeDriver: true`
   except the three hotspots, so they tick natively but orchestrate on JS).

---

## 3. The proposed system

### 3.1 Motion tokens (shipped — spec and residue)

The token layer has already landed as Phase-0 additive tokens:
`src/styles/theme.js:600-640`, documented in the header at `theme.js:591-599`
("Curves follow Material 3's motion system … Respect Reduce Motion at call
sites by collapsing duration to 0"). Nothing needs inventing; the spec below
is normative for all new motion.

**Durations (ms):**

| Token | Value | Line | Applies to |
|---|---|---|---|
| `motion.micro` | 120 | theme.js:602 | taps, toggles, opacity dips |
| `motion.state` | 200 | theme.js:603 | state changes, colour/size shifts; sheet close + backdrops |
| `motion.enter` | 320 | theme.js:604 | sheets, cards, screen content entering |
| `motion.exit` | 220 | theme.js:605 | leaving (always faster than enter — deliberate asymmetry) |
| `motion.hero` | 440 | theme.js:606 | the ONE "important moment" per screen (rule-1 justification required) |
| `motion.sheet` | 260 | theme.js:607 | bottom-sheet open only (BottomSheet's historical timing, tokenised) |
| `motion.pulse` | 750 | theme.js:608 | indeterminate attention loops (Skeleton, info-tip pulse) |

New work picks from exactly three: `micro`, `state`, and the `enter`/`exit`
pair. `hero` needs a purpose-test justification; `sheet` is reserved; `pulse`
is for loops. No new duration token without a founder decision.

**Easing:** bezier arrays `easeStandard [0.2, 0, 0, 1]` (theme.js:611),
`easeDecelerate [0.05, 0.7, 0.1, 1]` (:612), `easeAccelerate
[0.3, 0, 0.8, 0.15]` (:613), plus CSS-string twins for Reanimated 4's CSS API
at `motion.cssEase.{standard,decelerate,accelerate}` (theme.js:616-620).
Pairing rule (theme.js:596-598): decelerate for entrances, accelerate for
exits, standard for in-place changes. **Linear easing is sanctioned only for
time-proportional fills** (the rest-timer drain, `RestTimer.js:198-218`,
where 1 s of bar = 1 s of rest) — never for spatial movement. Legacy aliases
retained (`card: 320`, `easeOut`, `easeInOut`, theme.js:637-639).

**Named spring family — `motion.springs` (theme.js:627-632),** Reanimated
`withSpring`-shaped, intent stated at theme.js:623-626:

| Member | stiffness | damping | mass | Applies to |
|---|---|---|---|---|
| `springs.press` | 420 | 36 | 1 | press-in; responds next frame, settles < 100 ms, no overshoot |
| `springs.release` | 250 | 22 | 1 | press-out / drag-release; one tiny overshoot beat |
| `springs.settle` | 150 | 18 | 1 | resting default: cards, sheets, scrubs coming to rest |
| `springs.expressive` | 120 | 13 | 1 | the sanctioned celebration moments ONLY (fit rule 1) |

`motion.spring` (theme.js:634) is a legacy alias of `springs.settle` with
zero call sites — point all new work at `springs.*`. `press`/`release` are
the stiffness/damping equivalents of PressableCard's shipped
`speed: 30 / bounciness: 0` in and `speed: 18 / bounciness: 6` out
(`PressableCard.js:41-58`), so the eventual Reanimated migration of the
primitive is value-neutral.

**The standard press-feedback spec** (codifying what PressableCard ships):
scale 0.97 default, 0.94 for hero CTAs via the `scale` prop, hard floor 0.92
("anything below 0.92 looks heavy and slow", `PressableCard.js:34-36`);
opacity dips with scale to 0.92 at full press (:61-66); spring-driven, never
duration-driven; haptics mark outcomes, not touches — sanctioned exception:
`haptics.press()` (Impact.Light, `haptics.js:87`) on press-in for
`primary`/`destructive` Button variants only; reduce-motion = flat, no
animation, no haptic (`PressableCard.js:38,42,52,61`).

**Standard enter/exit pairs** (asymmetry mandatory — exits faster,
accelerate vs decelerate):

| Surface | Enter | Exit | Exemplar |
|---|---|---|---|
| List rows | `FadeInDown.duration(motion.enter)` + 30ms stagger capped at 8 | `FadeOut.duration(motion.exit)`; siblings via `LinearTransition.duration(motion.state)` | `AnimatedRow.js:40-42` — use the component, not the recipe |
| Screen mounts | `AnimatedEntrance` | n/a | `AnimatedEntrance.js:39` |
| Sheets | translateY over `motion.sheet` + easeDecelerate; backdrop `motion.state` | translateY `motion.state` + easeAccelerate; backdrop `micro`/`state` | `BottomSheet.js:24-27,56-67` (open side tokenised) |
| Toast/banner | `motion.state` both ways | same | `Toast.js` (not yet tokenised) |

**Migration residue** (mechanical, Δ≤20 ms unless flagged): adoption today is
`AnimatedRow.js:40-42`, `AnimatedEntrance.js:39`, `Skeleton.js:33,39`,
`BottomSheet.js:24,26` (open side), `PeekMenu.js:68,83`,
`ProOnboardingScreen.js:518`; `springs.*` has no consumers yet. Remaining:
`BottomSheet.js:25,27` (`CLOSE_MS = 200` → `motion.state`,
`BACKDROP_CLOSE_MS = 160`, Δ40, eyeball — flagged at
`03-design-audit.md:72-74`); `Toast.js:104` (220 → `motion.exit`/`state`; its
:40-47 per-variant values are HOLD times, not motion — documented exemption);
`PeekMenu.js:64` (180) and `:87` (280) → `motion.state`/`sheet`. Founder-
eyeball retimes (Δ40–80 ms or curve change): Welcome 480 → `hero`
(`WelcomeScreen.js:45-46`); ExerciseDetail congrats 300 in / 400 out —
non-standard, exit slower than entry (`ExerciseDetailScreen.js:299-301`);
heroZoom 280/200 (`RootNavigator.js:248-249`); MacroRings 500
(`MacroRings.js:222`). Documented exemptions (in-file comment naming this
spec): splash choreography (`RootNavigator.js:1390-1477` — crown jewel),
rest-timer 1 s drain (time-proportional), PRCelebration particle physics,
Toast hold times.

### 3.2 The fit rules — every future animation must pass all six

Written as testable rules; enforcement uses the codebase's established
source-level regression-guard convention (fs.readFileSync + regex,
CLAUDE.md §3).

**Rule 0 — Gate test (this codebase's precondition).** Every animation,
haptic and celebration honours BOTH `accessibility.reduceMotion` AND
ED-calm/open-flag suppression. Patterns to copy exactly: store read
`const reduceMotion = useAppStore(s => s.accessibility?.reduceMotion)`
(`PressableCard.js:38`); plain-View fallback (`AnimatedRow.js:33-35`);
`duration: reduceMotion ? 0 : motion.state` (`PeekMenu.js:68,83`);
navigator kill-switch `useStackMotionOverride()` → `animationEnabled: false`
(`RootNavigator.js:256-258`, spread into every stack
:272,:349,:379,:406,:441,:529). Haptics master gate: every vocabulary helper
no-ops under reduce-motion (`haptics.js:19-37`); new haptics go through the
vocabulary, never raw `expo-haptics`. ED-calm gate:
`suppressed = calm || !!edFlag` via `isCalm(getWellbeingMode())`
(`src/lib/wellbeing.js:19,34-36`) + `getOpenEdPatternFlag`
(`WorkoutSummaryScreen.js:390-401`); celebration mounts gate
`subdued={calm || reduceMotion}` (`App.js:916-919`); `PRCelebration.js`
subdued mode. *Testable:* any new file importing `react-native-reanimated`
or `expo-haptics` must either be a self-gating primitive (AnimatedRow,
AnimatedEntrance, PressableCard, lib/haptics.js) or reference `reduceMotion`;
celebratory/weight/food-adjacent motion must additionally reference the
calm/ED suppression.

**Rule 1 — Purpose test.** An animation must communicate state, direct
attention (one hero per screen), establish spatial continuity, or reward.
Reward-class motion exists in exactly THREE moments: PR
(`PRCelebration.js`), the 50/100-session milestone rungs
(`WorkoutSummaryScreen.js:400,1205` MilestoneBurst path), and the plan-ready
reveal (`ProSetupCompleteScreen.js`). Decoration anywhere else is rejected in
review. *Testable:* PR checklist question + grep — `springs.expressive` may
appear only in those three surfaces.

**Rule 2 — Token test.** Only sanctioned durations
(`micro/state/enter/exit/hero/sheet/pulse`), springs (`motion.springs.*`),
and easings (the three beziers or their `cssEase` twins; linear for
time-proportional fills only). *Testable:* source guard failing any numeric
literal in `withTiming(…, {duration:`, `FadeIn*.duration(`, or
`withSpring(…, {stiffness:` outside `theme.js` and the named exemption list
(§3.1).

**Rule 3 — Intensity rule.** The core logging loops — set logging in
ActiveWorkout and food logging in Diary/FoodSearch, the two highest-frequency
loops — get the FASTEST, QUIETEST motion in the app: `micro`/`state`
durations, `press`/`release`/`settle` springs, `setLogged`/`selection`
haptics, nothing louder. Expressive motion is reserved for milestones. This
preserves the shipped strength "matching last session = 1 tap per set"
(`audit/02-ux-audit.md:41-42`) — motion must never add perceived latency to a
log. *Testable:* grep for `motion.hero|springs.expressive` in
ActiveWorkoutScreen.js, DiaryScreen.js, FoodSearchScreen.js, SetEntry.js =
failure.

**Rule 4 — Performance budget.** 60 fps on mid-range Android (the primary
device class), all animation on the UI thread: Reanimated CSS
transitions/animations for state-driven motion, worklets for
gesture/scroll-driven. **No JS-thread `Animated` API in new work.** The
existing JS-Animated files (PressableCard, RestTimer, Skeleton, Toast,
MacroRings, PeekMenu, BottomSheet, FeedbackSheet, PRCelebration,
RootNavigator splash, and the ActiveWorkout/WorkoutSummary/ProOnboarding/
Welcome/ProSetupComplete/ExerciseDetail/YearOfLifts screens) are a **frozen
allowlist** that migrates incrementally and never grows. Blur: `expo-blur` is
not installed and not requested — banned by the Android-first material rule
(translucent fill + hairline border instead); if ever founder-approved,
sparingly and per-surface Android-device-tested. *Testable:* source guard
permitting `Animated.timing|Animated.spring` only in allowlisted files.

**Rule 5 — Interruption rule.** Every animation in the logging flow is
interruptible and never blocks input: (a) data commits first, animation
follows — never gate a write on an animation callback (sets already write to
SQLite at log time, `02-ux-audit.md:43-44`); (b) no `pointerEvents` lock or
disabled state while animating; (c) springs/timings retarget mid-flight
(Reanimated native behaviour) — no `Animated.sequence` chains that must
finish; (d) every auto-timeout is cancelled by the user's next action — the
counter-example to never repeat is the 1.8 s auto-advance not cleared by
"Log another set" (`ActiveWorkoutScreen.js:1035-1042`, finding CL-3,
`02-ux-audit.md:82`). *Testable:* PR checklist ("what happens if the user
taps mid-animation?") + Jest invariant where feasible.

### 3.3 Pattern proposals (a–g)

House constraints applied throughout: reduce-motion gate on every animation
(store pattern `PressableCard.js:38`), ED-calm/flag suppression on anything
celebratory or weight/food-adjacent, all timings from `motion.*` tokens,
translucent fill + hairline border as the material (no blur, Android
mid-range first), no new dependency without founder approval.

#### a) Tab bar — **Impact 6/10 · Effort M · Dependencies: token layer (shipped); no new deps**

*Current:* `RootNavigator.js:485-525` — stock `createBottomTabNavigator`,
opaque `colors.tabBar` background, hairline `tabBarBorder` top border, height
60 + bottom inset, filled/outline Ionicons swap as the only active indicator
(:506-515). No press feedback, no indicator motion, and no per-screen
`tabBarStyle` override — the bar stays visible for an entire live workout,
the same bottom-edge finding CL-4 (`audit/02-ux-audit.md:83`) wants for a
pinned Log-set CTA.

*Proposal:* **anchored, not floating** — a floating dock only reads with blur
or heavy translucency (`expo-blur` uninstalled and banned by the
Android-first material rule) and steals list height the edge-to-edge inset
work (`RootNavigator.js:486-499`) just reclaimed. Keep the anchored bar on
translucent surface fill + hairline top border; replace the icon-swap
indicator with a custom `tabBar`: sliding amber pill behind the active icon
driven by `withSpring(motion.springs.settle)` keyed to `state.index`, plus a
subtle icon settle-scale (1 → 1.06 → 1) on focus. Under `reduceMotion` the
pill jumps instantly, matching the shipped `useStackMotionOverride()`
kill-switch (`RootNavigator.js:256-259`). Add `haptics.selection()` on tab
change (`haptics.js:84` — self-gating). **Hide-on-scroll: no** (jittery on
mid-range Android, unpredictable mid-set); instead **hide the bar entirely
while ActiveWorkout is focused** via
`navigation.getParent()?.setOptions({ tabBarStyle: { display: 'none' } })` on
focus, restored on blur — a live session is a mode, not a tab, and this frees
the bottom edge for CL-4's pinned CTA. **Centre action button: no** — all
five tabs are destinations (`RootNavigator.js:518-522`) and the natural
candidate action (log food) is wholly Pro behind the show-then-sell Diary
gate the UX audit calls the best gate in the app (`02-ux-audit.md:59-64`); a
centre button that paywalls half its audience violates the free/pro exposure
rule, and Diary already owns a barcode FAB.

#### b) Buttons — **Impact 7/10 · Effort M · Dependencies: token layer (shipped); no new deps**

*Current:* `src/components/Button.js` is the single primitive (4 variants, 3
sizes), delegating press physics to PressableCard (`Button.js:62`).
`PressableCard.js:41-59` is the canonical spring but runs on JS-thread
`Animated.spring` (:43,:53). Neither file imports haptics: no button in the
app buzzes. `loading` is an abrupt `ActivityIndicator` swap that changes
content width (`Button.js:83-84`); no success state.

*Proposal:* migrate PressableCard's two `Animated.spring` calls to Reanimated
`useSharedValue` + `withSpring(motion.springs.press)` in /
`withSpring(motion.springs.release)` out — the tokens at `theme.js:627-632`
were written for exactly this and have zero consumers. Values unchanged
(0.97 default, 0.94 hero via the `scale` prop, floor 0.92 per
`PressableCard.js:34-36`), so Button, Card, Chip, Stepper, ExerciseCard and
every consumer upgrade at once with no visual diff, retiring the most-used
JS-thread animation in the app. Haptics live in the primitive:
`haptics.press()` (Light, `haptics.js:87`) on press-in for `primary` and
`destructive` variants only; `secondary`/`tertiary` stay silent. The
vocabulary's reduce-motion no-op (`haptics.js:19-27`) makes this safe by
construction. **State morphing (idle → loading → success):** a `state` prop
cross-fading content via `FadeIn/FadeOut(motion.state)` inside a width-locked
container, success showing a checkmark ~900 ms with `haptics.commit()` then
`onSettled`. Adopt where the commit is meaningful: WeeklyCheckIn submit
(already fires `commit()` — the visual should match the haptic), CoachOutput
Apply rows (where a morph to a settled "Held at your safe minimum" state is
also the UX repair for the silent ED-floor no-op NU-3, `02-ux-audit.md:77` —
that wording is safety-adjacent copy, hands-on work, not agent work), and the
food save CTAs in `QuickAddSheet.js:121` / `FoodDetailSheet.js`. **The single
Skia-glow CTA class: the Home hero Start button, and only it** — the design
audit's core diagnosis is amber inflation (`03-design-audit.md:159-160`) and
its Home prescription is "Start is the sole filled-amber element"
(:143-149). A soft Skia radial bloom behind Start (static, or a very slow
4–6 s breathe; killed under reduceMotion; static under calm/ED) gives the app
exactly one glowing object; Skia is an in-app precedent (`MacroRings.js`,
`drawShareCard.js`). Explicitly excluded: Log set (fires dozens of times a
session — stays fast and matte per fit rule 3) and the Paywall CTA (billing
surface; `docs/rules/billing.md` requires its own written plan).

#### c) Sheets — **Impact 6/10 · Effort M (wrapper) to L (picker conversion) · Dependencies: `@gorhom/bottom-sheet` (NEW — founder approval required; zero-dep fallback specified)**

*Current:* `BottomSheet.js` is solid bespoke chrome (Modal +
`Animated.timing` slide on `motion.sheet`/`motion.state`, scrim, handle,
tap-outside + hardware-back dismiss, keyboard avoidance, reduce-motion aware,
exit-before-unmount at :60-70) serving nine consumers including
`food/QuickAddSheet.js:6` and `food/FoodDetailSheet.js:153`. What it cannot
do: drag-to-dismiss, snap points, finger-tracking physics.
`ExercisePickerModal.js:105` is a full-screen `<Modal animationType="slide">`,
not a sheet. Set entry is not a modal: it is inline in ActiveWorkoutScreen
via `SetEntry.js`, and that inline hybrid entry is a named core-loop strength
("matching last session = 1 tap per set", `02-ux-audit.md:41-44`).

*Proposal:* adopt `@gorhom/bottom-sheet` v5 **behind the existing
`BottomSheet.js` API** (visible/onClose/keyboardAvoiding/sheetStyle/
showHandle re-implemented over `BottomSheetModal`) so all nine consumers get
drag-to-dismiss and spring physics with zero call-site churn. Per surface:

| Surface | Direction | Snap behaviour |
|---|---|---|
| 9 existing BottomSheet consumers | Wrapper swap only | Single dynamic snap (`enableDynamicSizing`), pan-down dismiss |
| `FoodDetailSheet` | Two snaps | ~60% (fast log: name, serving, save) → ~92% (serving picker + full nutrient detail) |
| `ExercisePickerModal` | Convert to a 92%-snap sheet, search pinned at top | Single 92%, keyboard-aware; the workout faintly visible behind the scrim preserves mid-session-swap context |
| Set entry | **Do not convert, ever** | A sheet adds a tap and an occlusion to the highest-frequency action in the app |

*Dependency reality:* NOT installed; needs explicit founder approval (MIT;
pure JS over the installed Reanimated 4.1.7 + gesture-handler 2.28.0 peers;
no new native code, managed-workflow safe). **Fallback if declined:** add
`Gesture.Pan()` drag-to-dismiss with `withSpring(motion.springs.settle)`
settle/release to the existing BottomSheet — roughly 80% of the felt gain
(interactive dismissal) with zero dependencies, no snap points. Either path
also folds PeekMenu's and FeedbackSheet's private timings onto the shared
tokens.

#### d) Lists & data — **Impact 6/10 · Effort M · Dependencies: none new (explicitly avoids one)**

*Current:* `Skeleton.js:23-60` is a proper system (pulse 0.45↔0.85 on
`motion.pulse`, static 0.6 under reduce-motion, shape presets); Analytics now
uses it properly (`AnalyticsScreen.js:322-325,415-424`). `VolyumeChart.js` is
deliberately the app's **single chart engine**, hand-rolled SVG over
unit-tested `chartGeometry`, with an in-file architectural decision that
already rejected Skia for scrubbing and reserved a later swap "behind this
same API" (`VolyumeChart.js:15-21`); Analytics' hero chart renders through it
(`AnalyticsScreen.js:754,790,829`). Numbers: WorkoutSummary has a bespoke
JS-thread setState-per-frame tonnage counter; MacroRings a
`useNativeDriver:false` count-up.

*Proposal:* **keep the pulse; do not chase a shimmer sweep** — a moving
highlight needs `masked-view` (a new dependency) or per-skeleton Skia
gradient sweeps, the wrong load profile for many simultaneous placeholders on
mid-range Android, for a purely cosmetic delta; remaining skeleton work is
coverage, not the animation. **Rolling numbers:** one shared
`<RollingNumber>` — Reanimated shared value + `withTiming(motion.enter)`
count-up in the theme's tabular-numeral `type.num()` styles; a count-up
interpolation, not a per-digit slot machine (digit columns multiply animated
nodes for no legibility gain). Adopt at: WorkoutSummary tonnage (retiring the
JS-thread counter — a fit-rule-4 win), Diary remaining-kcal hero, Analytics
weekly-volume numeral. **Hard ED rule: the body-weight number never ticks** —
weight-trend and BodyMetrics values render static always, not merely under an
open flag; the conservative reading of the tier-blind guardrail posture, and
it costs nothing. **Charts: recommend against Victory Native XL** — a new
dependency AND a second chart engine against an explicit in-file decision
(`VolyumeChart.js:12-21`), and its headline win (UI-thread data updates
during gestures) buys nothing because the chart is static during a scrub —
only the crosshair moves, already handled by `Gesture.Pan` + `runOnJS` with
per-point selection haptics (`VolyumeChart.js:33-39`). Instead: an entering
**draw-in on the line** (path-trim via `strokeDasharray` interpolation,
`motion.hero` 440 ms, once per mount, skipped under reduceMotion), applied
only to the Analytics focal chart. A Skia render-layer swap behind the same
props remains the sanctioned follow-up if the founder wants it.

#### e) Transitions — **Impact 5/10 · Effort S–M · Dependencies: none new**

*Current:* the motion language already has three latent verbs. **Expand:**
`heroZoomTransition` (fade + 0.92→1 scale, 280/200 ms, defensive
null-progress guard, `RootNavigator.js:227-251`) on ActiveWorkout,
WorkoutSummary, PlanDetail, RoutineDetail, ExerciseDetail. **Push:** the
platform slide for peer navigation. **Sheet:** ~15 `presentation: 'modal'`
registrations (e.g. FoodSearch/AddCustomFood, `RootNavigator.js:282-288`). A
navigator-wide reduce-motion kill-switch exists and is read at render time
(`useStackMotionOverride`, `RootNavigator.js:256-259`).

*Proposal:* **codify, don't migrate.** Do NOT move to native-stack now —
under React Navigation v6 it forfeits the custom `cardStyleInterpolator` that
heroZoom depends on; revisit only with a v7 upgrade. Full shared-element
transitions stay off the table (Reanimated shared transitions remain
experimental on the New Architecture). The high-value zero-risk version of
continuity is **press-to-expand choreography**: the source card is a
PressableCard already scaling to 0.97, and the destination heroZooms in from
0.92 — releasing the press and starting the push together reads as one
continuous expansion of the thing you touched. Apply where it most aids
orientation: **Plans list row → PlanDetail** and **Analytics tile →
LiftProgress** (the design audit's "nav hub" screen,
`03-design-audit.md:121-127`). Continuity matters most where the user carries
a specific object across the boundary (plan card → detail, exercise row →
history chart, Analytics tile → lift page); least on tab switches (parallel
worlds, no object carried) — leave those as cuts. Complete the language
inside screens with `AnimatedRow` on any remaining jump-cut list mutations,
and give the choreographed splash the `motion.exit` fade-through the design
audit flagged (`03-design-audit.md:178-179`).

#### f) Haptic choreography — **Impact 7/10 · Effort S · Dependencies: none**

*Current:* the 13-intent vocabulary is live and every helper self-gates
(`haptics.js:19-37`). Verified live map as shipped today:

| Event | Signature | Where |
|---|---|---|
| Working set logged | Light impact (`setLogged`, `haptics.js:42`) | ActiveWorkout log paths |
| Warm-up set logged | selection (:45) | ActiveWorkout |
| Stepper ticks (weight/reps/seconds) | selection | `SetEntry.js:45,69` (via vocabulary) |
| PR | Success + 2×Heavy at 150/300 ms (`prAchieved`, :50-54); subdued → single selection | `PRCelebration.js:132,139` |
| Rest countdown 3-2-1 | Medium → Heavy → Heavy+Warning ladder (`restCountdown`, :71-78) | RestTimer |
| Rest done (GO) | Success + 2×Heavy at 200/400 ms (`restDone`, :59-63) | RestTimer |
| Rest 3 s warning | Light (`restAlmostDone`, :66) | RestTimer |
| Workout complete | Success + 2×Heavy (`workoutComplete`, :90-94) | ActiveWorkout finish |
| Plan ready / barcode lock-on | single Success (`planReady`, :81) | ProSetupComplete; `ScanBarcodeScreen.js:38` |
| Check-in submitted / delete / long-press menu | Medium (`commit`, :101) | WeeklyCheckIn; Diary; `PeekMenu.js:54` |
| Chart scrub per point | selection | `VolyumeChart.js:39` |
| Blocked action | Warning (`error`, :97) | ActiveWorkout validation |

*Proposal — ratify a five-class canon on the vocabulary (no raw expo-haptics
ever again):*
- **selection** (`selectionAsync`): warm-up set, stepper tick,
  picker/toggle/chip, scrub tick, undo, tab change (NEW, §a).
- **light** (`Impact.Light`): working set logged, rest 3 s warning, primary
  Button press-in (NEW, §b).
- **medium / commit** (`Impact.Medium`): check-in submitted, delete
  confirmed, sheet save committed (Quick-add / FoodDetail save — NEW, via §b
  state morph).
- **success** (`Notification.Success` ± Heavy beats): workout complete, PR,
  rest GO, plan ready, barcode lock-on.
- **warning** (`Notification.Warning`): validation/blocked action only.
  **Never attached to ED-floor holds — a safety hold is calm information, not
  an error buzz.**

*Android reality:* mid-range rotary motors render `impactAsync` coarsely and
some OEMs collapse Light/Medium into one buzz. The shipped rest ladder works
precisely because it varies **pattern and count, not amplitude**
(`haptics.js:71-78`) — keep multi-beat signatures for the big moments and
never encode meaning in amplitude alone. The rest-end-while-locked gap
(CL-1, `02-ux-audit.md:73`) is not a haptics problem; the fix lives in the
notification scheduler under `docs/NOTIFICATIONS_LOCKED.md` and its rest-end
addendum — flagged as a dependency, out of this scope. Keep the source guard
banning raw expo-haptics imports outside `lib/haptics.js`.

#### g) Celebration moments — a maximum of three — **Impact 7/10 · Effort M · Dependencies: none new (explicitly declines two)**

*Current:* `PRCelebration.js` is the flagship — 40-particle gold burst built
from 40 JS `Animated.Value` quadruplets, haptic ladder, and a `subdued` mode
rendering a quiet card with no particles, forced on by reduce-motion
(`PRCelebration.js:109-129`); callers gate on `calm || !!edFlag`.
WorkoutSummary reuses it as MilestoneBurst for session rungs.
ProSetupComplete — the paid funnel's emotional peak during the trial-churn
window (finding OB-4) — is a flat fade+slide with a statically-full progress
bar.

*The three that earn expressive animation (`motion.springs.expressive` is
grep-restricted to exactly these, fit rule 1):*

1. **PR.** User-earned, unambiguous, frequency self-limiting. Elevation:
   migrate the 40 JS Animated particles to a **single Skia canvas** (one draw
   pass, positions from one Reanimated clock) — dramatically cheaper on
   mid-range Android and visually richer (glow, trails), zero new
   dependencies. The subdued/reduce-motion contract carries over verbatim.
2. **Milestone rungs (50/100 sessions).** Celebrates consistency — the app's
   most defensible value and completely weight-neutral. Same Skia migration,
   gold palette, existing `calm || edFlag` caller gate untouched.
3. **ProSetupComplete plan reveal.** The one currently-flat moment that
   genuinely earns choreography. Not confetti — a staged reveal: the kcal
   ring draws in (Skia arc sweep), macro rows cascade via the existing
   `FadeInDown` entrances, the split name settles last, `planReady()` haptic
   at the beat. Calm register, no fanfare copy. **ED note:** this screen
   shows calorie targets — under an open ED flag or calm mode the reveal
   renders instantly and quietly (numbers are information, never spectacle),
   and if a safety floor raised the target the reveal must not dramatise the
   number at all.

*Everything else stays quiet:* streaks, weekly check-in completion, sync,
weight entries, and workout finish (its `workoutComplete()` haptic + tonnage
counter is already the right size). **Weight-loss-adjacent moments never
celebrate** — no confetti, ticker, glow or success-toned animation on any
weight or calorie-delta surface, and absolutely nothing under an open ED
flag; the caller-side `calm || edFlag` suppression is the mandatory template
for any new celebratory mount.

*Rive vs Lottie: neither.* Both are new dependencies requiring founder
approval; Rive additionally ships a native runtime (the heaviest ask). All
three moments above are particles, arcs and cascades — exactly what the
installed Skia 2.2.12 + Reanimated 4.1.7 do best: deterministic, themable
from `theme.js` tokens, no designer-tooling pipeline, no asset-versioning
surface, and no new ED-audit surface hidden inside an opaque `.riv`/`.json`
file. Revisit Lottie only if a future brand-character moment needs keyframed
vector art, with a structured founder decision.

### 3.4 Proposal summary

| § | Direction | Impact | Effort | New deps |
|---|---|---|---|---|
| a | Anchored translucent tab bar, spring pill, selection haptic, hidden during ActiveWorkout, no centre button | 6 | M | none |
| b | Reanimated springs + vocabulary haptics in PressableCard/Button, width-locked state morphing, Skia glow on Home Start only | 7 | M | none |
| c | @gorhom/bottom-sheet v5 behind the existing BottomSheet API; 2-snap FoodDetailSheet; picker → 92% sheet; set entry stays inline | 6 | M–L | @gorhom/bottom-sheet (founder approval; Gesture.Pan fallback) |
| d | Pulse skeletons (no shimmer), one RollingNumber (never body weight), single SVG chart engine + Analytics draw-in (no Victory XL) | 6 | M | none |
| e | Three-verb transition language, press-to-expand continuity, splash exit fade; no navigator migration | 5 | S–M | none |
| f | Five-class haptic canon on the existing vocabulary + tab/button events; bypass ban stays enforced | 7 | S | none |
| g | Three celebrations only, Skia + Reanimated, existing ED/calm gates; no Lottie/Rive | 7 | M | none |

All of a–g depend on the token layer, which has already landed
(`theme.js:600-640`); none depends on a Reanimated upgrade, because there is
none to do (§1).

---

## 4. Recommended adoption order

Highest-visibility, lowest-risk wins first; each step independently
shippable with a founder device-walk on a green EAS build, and every step
lands behind the existing reduce-motion/ED-calm gates.

1. **Haptic canon + the two new events (f).** Effort S, impact 7, zero
   dependencies, zero visual diff risk. Ratify the five-class contract, add
   tab-change `selection()` and primary-Button `press()`, keep the raw
   expo-haptics import ban as a source guard. The vocabulary and its
   reduce-motion no-op already exist (`haptics.js:19-37`), so this is wiring,
   not building — and it is felt on every single tap of the day.
2. **PressableCard → Reanimated springs (b, first half).** The single
   highest-leverage migration in the app: one file upgrades Button, Card,
   Chip, Stepper, ExerciseCard and 6 screens at once, gives `motion.springs`
   its first consumers (rule 2), retires the most-used JS-thread animation
   (rule 4), and is value-neutral by construction
   (`springs.press`/`release` encode the shipped `speed: 30/18` feel,
   §3.1). No visual diff = low review burden, high confidence.
3. **Token sweep residue + fit-rule source guards (§3.1, rule 2/4 guards).**
   Mechanical: BottomSheet close side, Toast, PeekMenu onto tokens
   (Δ≤20 ms); land the regression guards (expressive-grep, JS-Animated
   allowlist, raw-haptics ban) so the system cannot drift while the rest
   ships. Founder-eyeball items (Welcome 480, ExerciseDetail 300/400,
   heroZoom, MacroRings 500) batch into one screenshot review.
4. **Button state morphing + the dead-tap fixes (b, second half + §2.2).**
   Width-locked idle→loading→success on WeeklyCheckIn submit, CoachOutput
   Apply (the NU-3 repair — safety-adjacent copy, hands-on) and food saves;
   pressed states + haptic for the YearOfLifts tap zones
   (`YearOfLiftsScreen.js:636-637`), accessibility roles on the no-op sheet
   catchers. Visible quality jump on committing moments.
5. **Transitions codification (e).** Effort S–M, pure navigator-options and
   choreography work: press-to-expand on Plans→PlanDetail and
   Analytics→LiftProgress, splash `motion.exit` fade, AnimatedRow on
   remaining jump-cuts. No new mechanics, so risk stays low while spatial
   continuity improves where objects carry across boundaries.
6. **Lists & data (d).** `RollingNumber` (retiring the WorkoutSummary rAF
   counter and the MacroRings JS-thread count-up — two of the three
   fit-rule-4 hotspots), Analytics hero draw-in, skeleton coverage
   completion. Ships the "body weight never ticks" rule as a test at the
   same time.
7. **Celebrations (g).** PR/Milestone Skia migration then the
   ProSetupComplete plan reveal. Higher craft bar and ED-gate review
   burden, so it benefits from the springs, tokens and guards being settled
   first; the reveal is also the piece most worth doing slowly and
   device-walking hard.
8. **Tab bar (a).** Custom `tabBar` component + hide-during-ActiveWorkout.
   Sequenced after 1–2 so the pill spring and selection haptic land on an
   already-proven foundation, and because hiding the bar interacts with the
   CL-4 pinned-CTA work — best co-ordinated with that UX change.
9. **Sheets (c) — gated on a founder dependency decision.** Present
   `@gorhom/bottom-sheet` for approval (name/purpose/licence in §5); if
   approved, wrapper swap first (zero call-site churn), then the two-snap
   FoodDetailSheet, then the ExercisePickerModal conversion (L). If
   declined, ship the `Gesture.Pan()` drag-to-dismiss fallback — ~80% of the
   felt gain, zero dependencies. Last because it is the only item blocked on
   an external decision and carries the largest surface of behavioural
   change.

Rationale for the overall shape: steps 1–3 are the "press feedback +
haptics first" foundation — felt everywhere, near-zero regression risk, and
they install the enforcement rails (guards) before any expressive work.
Steps 4–6 adopt the primitives across surfaces. Steps 7–9 are the
craft/judgement tail, with the sole dependency-gated item deliberately last.

---

## 5. Closing note

These items flow into the master ranking (`06-MASTER-PLAN.md`) like
everything else in the audit series — nothing here is pre-authorised; the
adoption order above is this document's recommendation to that ranking, not a
mandate. Fit rules 0–5 (§3.2) apply to any motion work that arrives via other
tracks too.

**NEW DEPENDENCIES that would need founder approval (name, purpose,
licence)** — per CLAUDE.md §2, none may be installed without an explicit yes:

| Name | Purpose | Licence | Position |
|---|---|---|---|
| `@gorhom/bottom-sheet` (v5) | Drag-to-dismiss, snap points and finger-tracking spring physics for all sheets, adopted behind the existing `BottomSheet.js` API (§3.3c). Pure JS over the installed Reanimated 4.1.7 + gesture-handler 2.28.0; no new native code; managed-workflow safe | MIT | **Recommended** — the only new dependency this audit asks for; a zero-dependency `Gesture.Pan()` fallback is specified if declined |
| `expo-blur` | Blur materials (floating tab bar, sheet backdrops) | MIT (first-party Expo) | **Declined** — banned by the Android-first material rule; translucent fill + hairline border instead (§3.3a, rule 4) |
| `lottie-react-native` | Keyframed vector celebration assets | Apache-2.0 | **Declined** — installed Skia + Reanimated cover all three sanctioned celebration moments; opaque `.json` assets would create a new ED-audit surface (§3.3g); revisit only for a future brand-character moment via a structured founder decision |
| `rive-react-native` | State-machine vector animation runtime | MIT (runtime) | **Declined** — heaviest ask (native runtime); same reasoning as Lottie (§3.3g) |
| `victory-native` (XL) | GPU chart library | MIT | **Declined** — would be a second chart engine against the explicit in-file decision at `VolyumeChart.js:12-21`, and its gesture-time win buys nothing for a static-during-scrub chart (§3.3d) |
| `@react-native-masked-view/masked-view` | Shimmer sweep for skeletons | MIT | **Declined** — wrong load profile for many simultaneous placeholders on mid-range Android; the pulse stays (§3.3d) |
