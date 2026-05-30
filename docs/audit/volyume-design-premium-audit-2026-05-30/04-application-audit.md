# 04 — Application audit (all 61 screens against the confirmed standard)

Audited against the confirmed Phase 3 standard (amber kept; system font
retained; warm widened surface ladder; deepened large-amber fills; body
15→16; tabular numerals on all data; hero-only number animation; one press
feel; Reanimated for motion with full migration; skeletons everywhere data
loads; CI guards; `iconSize`/`radius`/`spacing` extensions). This is
exhaustive by your instruction — every screen appears.

**Five findings are universal** (true on essentially every screen), so they
are stated once here and then *not* repeated per screen. Per-screen notes
cover only what's specific to that screen.

### Universal findings (apply everywhere unless noted)

- **U1 — `type` roles unused (61/61 screens).** Every screen hand-assembles
  `{ fontSize, fontWeight }`. Standard: replace with `type.*` roles. This is
  the single change that touches every screen and yields the most.
- **U2 — data numerals not tabular.** No screen applies
  `fontVariant:['tabular-nums']` systematically. Standard: `type.num(role)`
  on every weight/rep/set/%/kcal/timer/table-date.
- **U3 — mixed press feel.** Only 6 screens use `PressableCard`/`Card
  onPress`; the rest use `TouchableOpacity` with scattered `activeOpacity`.
  Standard: route tappables through `PressableCard`/`Button`.
- **U4 — hand-rolled cards.** 50 screens inline
  `backgroundColor: colors.surface` card blocks instead of the `Card`
  primitive. Standard: adopt `Card`, gaining the surface-ladder + press feel
  for free.
- **U5 — flat surfaces.** Every screen renders on the compressed ladder.
  Once `surfaceElevated` + the widened/warmed tokens land (Foundation),
  nested cards must move to the elevated tier so depth reads.

Per-screen severity: **H** = high-traffic, fix first; **M** = medium;
**L** = low / rarely seen.

---

## A. The training loop (highest traffic — fix first)

### ActiveWorkoutScreen — **H** (2,615 lines, the signature surface)
- The most-seen screen and Volyume's "one moment that must feel best"
  (§10). 0 `Card`, 0 `Button`, 0 `PressableCard` — entirely hand-rolled.
- 7 raw hex/rgba, 3 raw `borderRadius`, 1 raw `fontSize`.
- **Required:** the timer/next-set numeral → `type.display` + tabular
  (U2); **COMPLETE SET** → `Button` primary, deepest press (0.96), largest
  on screen, `setLogged()` haptic (haptic exists, confirm wired); set rows →
  `Card`/`PressableCard` (U3/U4); entry via `heroZoomTransition` (already);
  the optional single backdrop-blur "moment" lives behind the bottom
  controls here (Android → solid fill). Move the 7 hex to tokens.
- Cite: `src/screens/ActiveWorkoutScreen.js`.

### HomeScreen — **H** (2,339 lines)
- Best-adopted screen for press (9 `PressableCard`) and skeletons (5) —
  use it as the reference pattern for the rest.
- But: 3 raw `fontSize`, 4 hex/rgba (the coach/deload `rgba(245,158,11,…)`
  banners → `withAlpha(colors.primary,…)`), 3 raw `borderRadius`, 0 `type`.
- **Required:** U1/U2 on the next-session and volume figures; move the two
  banner rgba to tokens; first content block rises on focus
  (`motion.enter`).
- Cite: `src/screens/HomeScreen.js:2257-2258` (banner rgba).

### BuildWorkoutScreen — **M**
- Uses `Button` (good). U1/U2/U4 apply. Set/rest steppers already a11y-
  labelled. Low violation count otherwise.

### RoutineDetailScreen — **M**
- Uses `Button` (good), 1 raw `borderRadius`. U1/U3/U4. Swap-exercise rows
  should be `Card onPress`.

### WorkoutSummaryScreen — **M** (1,306 lines)
- Already has the staggered card entrance (good motion reference). 1 raw
  `borderRadius`, 0 `type`. **Required:** U1/U2 on the summary stat numbers
  (these are hero data → tabular); retime its hand-rolled durations to
  `motion.*` tokens; under full migration, move its RN Animated stagger to
  Reanimated layout animations.

### RestTimer (component) — **M**
- Already excellent haptics + animated bar. Under full migration its RN
  Animated bar moves to Reanimated. The countdown numerals → tabular.
- Cite: `src/components/RestTimer.js`.

---

## B. Plans & programming

### PlansScreen — **H**
- 7 `PressableCard` (good), 4 skeletons (good), 2 raw `fontSize`, 1 raw
  `borderRadius`. U1/U2/U4. Strong baseline; mostly type-role + tabular.

### PlanDetailScreen — **M**
- `Button` + 7 skeletons (excellent loading). 2 raw `borderRadius`.
  U1/U2/U4. Loading skeleton already content-shaped — reference example.

### PlanLibraryScreen — **M**
- 4 skeletons, 1 raw `fontSize`, 2 raw `borderRadius`. U1/U3/U4. Featured-
  plan grid cards → `Card`.

### MesocycleBuilderScreen — **M** (the progress dots are raw radius)
- 3 skeletons, 2 raw `fontSize`, 2 raw `borderRadius` (the 3-4px progress
  dots — exactly what the new `radius.xs` token is for). U1/U2 (week/volume
  numbers tabular).

### ManualBuilderScreen — **M** (1,269 lines)
- 1 raw `fontSize`. U1/U2/U3/U4. The volume-balance numbers → tabular.

### ExerciseLibraryScreen — **M**
- Clean (0 violations in the matrix) but U1/U3/U4 still apply; the create-
  exercise modal inputs should use the standard field styling. Rows already
  via `ExerciseCard`.

### ExerciseDetailScreen — **H** (the charts screen, just reworked)
- 2 `ActivityIndicator` (→ skeleton, U-load), 2 raw `fontSize`, 1 hex
  (the `rgba(245,158,11,0.08)` chart fill → `colors.chartFill` token which
  already exists). 0 `type`. **Required:** est-1RM / weight numerals →
  tabular; strength-trend chart axis labels → `type.caption`; spinner →
  `SkeletonCard`.
- Cite: `src/screens/ExerciseDetailScreen.js:454` (chart-fill rgba).

### LiftProgressScreen — **M** (new this session, clean)
- 0 violations in the matrix, already on `Sparkline`. Still needs U1/U2
  (the est-max numerals → tabular) and U3 (rows are `TouchableOpacity` →
  `PressableCard`).

---

## C. Progress & analytics

### AnalyticsScreen — **H** (1,394 lines)
- 6 raw `fontSize`, 1 raw `fontWeight`, 6 raw `borderRadius` (chart dots/
  bars — `radius.xs`). 0 `type`, 0 skeleton (renders into charts). **Required:**
  U1/U2 (every stat tabular); the `fontWeight:'700'` PR-bar count →
  `fontWeight.bold`; chart-dot radii → `radius.xs`; consider a skeleton for
  the initial data load.
- Cite: `src/screens/AnalyticsScreen.js:1196` (raw weight), `:1209-1212`
  (raw fontSize/gap clusters).

### AthleteHubScreen — **M** (the moved dashboard)
- 4 skeletons (good), 6 raw `fontSize`, 3 raw `borderRadius`. U1/U2 on
  recovery/readiness/quick-stat numbers (these are hero data). Gauge labels
  → `type.label`.
- Cite: `src/screens/AthleteHubScreen.js:221,1016-1017`.

### PRWallScreen — **M**
- 3 raw `fontSize`. U1/U2 (the est-1RM / heaviest numerals → tabular; this
  screen is almost entirely numbers — high payoff). The strength-standing
  headline → `type.h2`. Already has good per-exercise trend chart.

### VolumeHeatmapScreen — **M**
- 1 raw `fontSize`, 3 raw `borderRadius`. U1; muscle-set counts → tabular.

### WorkoutHistoryScreen — **M**
- Uses `Card` (1) + `PressableCard` (3) + 6 skeletons — one of the better-
  adopted screens; a reference. 1 raw `borderRadius`. U1/U2 (session
  tonnage/volume tabular).

### YearOfLiftsScreen — **L** (gated, rarely seen)
- 2 raw `fontSize`, 1 hex (`rgba(255,255,255,0.08)` divider →
  `borderSubtle` token), 2 raw `borderRadius`. U1/U2.
- Cite: `src/screens/YearOfLiftsScreen.js:376`.

### CoachReviewScreen — **M** (worst `fontWeight` offender)
- 5 skeletons (good) but **8 raw `fontWeight` literals** + 3 raw
  `borderRadius`, 0 `type`. **Required:** all 8 `fontWeight:'…'` →
  `fontWeight.*` tokens (or better, `type` roles, which carry weight).
- Cite: `src/screens/CoachReviewScreen.js:621,644,663,684,716,732,753,783`.

### CoachOutputScreen — **M** (2,063 lines)
- 5 skeletons + 1 spinner (the spinner sub-section → skeleton for
  consistency). 1 raw `fontSize`. U1/U2/U4.

### CoachHeldHistoryScreen / BlockReflectionScreen — **L**
- 4 skeletons each (good). U1/U2/U4 only.

---

## D. Diary & food

### DiaryScreen — **H** (the only screen using `shadow` token correctly)
- 1 hex, 1 raw `borderRadius`. 0 `type`. FAB uses `shadow.lg` (good — the
  reference for tokenised shadow). **Required:** U1/U2 (macro totals, kcal →
  tabular — this is a numbers screen); macro rings already Skia. The FAB
  radius is a hand-computed circle → `radius.circle` helper.
- Cite: `src/screens/DiaryScreen.js:649,652`.

### FoodSearchScreen — **M** (4 spinners → skeletons)
- 4 `ActivityIndicator`, 1 raw `borderRadius`. **Required:** U-load (search
  results → `SkeletonRow`); U1/U2 (per-food kcal/macros tabular); U3.

### FoodInsightsScreen — **M**
- Uses `Card` (1) but 2 spinners + 2 raw `borderRadius`. U-load → skeleton;
  U1/U2.

### MyRecipesScreen / MyMealsScreen — **M / L**
- MyRecipes: 2 spinners → skeleton; U1/U2/U3. MyMeals: clean; U1/U3/U4.

### AddCustomFoodScreen — **M**
- Uses `Button` (good). U1/U2 (macro inputs); field styling to standard.

### NutritionTargetsScreen — **M** (1,736 lines)
- 2 raw `fontSize`, 4 raw `borderRadius` (incl. a `borderRadius:4` and `:22`
  — the `:22` is between tokens, snap to `radius.xl` 20 or add a step). 0
  `type`. U1/U2 (calorie/macro targets are pure data → tabular).
- Cite: `src/screens/NutritionTargetsScreen.js:1360,1382,1408`.

### NutritionEducationScreen — **L**
- 4 raw `borderRadius`. U1/U4. Mostly static copy → `type.body` at the new
  16px.

### Scan screens (ScanBarcodeScreen, ScanLabelScreen) — **M**
- ScanLabel: **6 hex** + 3 spinners + 2 raw radius (worst scan offender);
  ScanBarcode: 2 hex (`rgba(0,0,0,0.55/0.6)` → the `scrim` token exists for
  exactly this) + 3 spinners. **Required:** move scrims to `scrim` token;
  camera-overlay hex to tokens; spinners → skeleton/branded loading.
- Cite: `src/screens/ScanBarcodeScreen.js:255,260`.

---

## E. Onboarding, auth & paywall (first impressions)

### WelcomeScreen — **H** (first impression)
- 2 raw `fontSize`, 1 raw `borderRadius`, an inline shadow block. 0 `type`.
  **Required:** U1; inline shadow → `shadow` token; the entrance fade/slide
  retimed to `motion.enter`; establish the instrument identity (§10) — calm,
  number-forward, no carousel.
- Cite: `src/screens/WelcomeScreen.js:202-206` (inline shadow).

### OnboardingScreen / ProOnboardingScreen — **M** (1,365 lines)
- ProOnboarding: 2 raw `fontSize`, 3 spinners, 4 raw `borderRadius` + an
  inline primary-coloured shadow (`:1323-1324`) + a `borderRadius:13` toggle
  (→ `radius.circle`). U1/U3. Onboarding: 2 spinners, 2 raw radius.
- Cite: `src/screens/ProOnboardingScreen.js:1298,1323-1330`.

### LoginScreen — **M**
- Uses `Button` (good). 2 raw `fontSize` (incl. a 38px title → `type.h1`),
  1 spinner (login button `loading` is fine). U1.
- Cite: `src/screens/LoginScreen.js:435,448`.

### FirstRunScreen / CascadeGateScreen / Article9ConsentScreen — **L/M**
- FirstRun + Cascade use `Button` (good). U1 only. Article9 clean; U1.

### ProUpgradeScreen / PaywallScreen / SubscriptionScreen — **M**
- ProUpgrade: `Button` + 1 hex (`color="#FFFFFF"` inline →
  `colors.textPrimary`) + 1 spinner + 2 raw radius (`:32`,`:40` avatar
  circles → `radius.circle`) + inline shadow (`:475-476`). Subscription:
  `Card`+`Button` (good). Paywall: `Button` (good). U1/U2 (price/tier
  numbers tabular).
- Cite: `src/screens/ProUpgradeScreen.js:277,387,472,475-476`.

### ProSetupCompleteScreen — **L**
- `Button` + 3 raw `fontSize` + 4 raw `borderRadius` + inline confetti
  shadow. Celebration screen — under full migration its RN Animated moves to
  Reanimated. U1.

### ProGoalSetupScreen — **M**
- 1 raw `fontSize` (a 10px badge → `type.caption`). U1/U3. The weak-point
  chips already use `Chip` (good); confirm the new "Adductors" chip styles
  identically.

---

## F. Settings, profile & utility

### YouScreen — **M** (new You-tab root)
- 3 `PressableCard` (good), 1 raw `borderRadius`. U1/U2 (training-age /
  session-count). Profile header number → `type` + tabular.

### SettingsScreen — **M** (1,391 lines)
- 1 raw `fontSize`, 1 raw `borderRadius`. U1/U3 (rows → `PressableCard`).
  Mostly list rows — high U3 payoff for one consistent press feel.

### CreditsScreen — **L** — uses `Card` (good). U1 only.

### NotificationSettingsScreen — **M**
- 2 hex (`rgba(255,193,7,…)` warning banner → `withAlpha(colors.warning,…)`)
  + 1 raw radius. U1/U3.
- Cite: `src/screens/NotificationSettingsScreen.js:724,726`.

### CoachingRemindersScreen / WellbeingCheckScreen / WeeklyCheckInScreen — **M**
- WeeklyCheckIn: 4 skeletons + 2 spinners (consolidate to skeleton) + 2 raw
  radius. Wellbeing uses `Button`. U1/U2/U3.

### BodyMetricsScreen — **M** (1,205 lines)
- 1 raw `fontSize`. U1/U2 (weight/measurement numbers + the daily-burn
  figure → tabular). The body-diagram (now with adductors) is Skia/SVG —
  leave.

### GoalChangeSummaryScreen / GoalLockConsentScreen — **L/M**
- GoalChange uses `Card` + 1 raw `fontSize`. GoalLock: 2 raw radius. U1.

### ImportScreen — **L**
- 11 `PressableCard` (well-adopted!) + 3 spinners (→ skeleton) + 1 raw
  radius. U1.

### Policy screens (PrivacyPolicy, SubscriptionPolicy) — **L**
- Near-clean; U1 (long-form copy → `type.body` 16px improves readability
  most here).

### DebugLogScreen — **L** (internal)
- Intentional `monospace`. Leave as-is except U1 on chrome. Low priority.

---

## G. Components (the primitives the screens should adopt)

These are mostly already to standard; the work is *extending* them so screens
can adopt, plus a few token cleanups.

- **Button.js / PressableCard.js** — to standard. No change beyond the
  deepened `primaryFill` for the primary variant's large fill, and the
  Reanimated migration (PressableCard's spring → `withSpring`, same feel).
- **Card.js / GradientCard.js** — consolidate: `GradientCard` is `Card` with
  no real difference (confirmed in component audit). Merge to one `Card`
  with a `hero` intent; update the ~handful of `GradientCard` call sites.
  Add `surfaceElevated` support for nested use.
- **Toast.js** — to standard; move its inline `'#000'` shadow to the
  `shadow` token; retime durations to `motion.*`.
- **Skeleton.js / EmptyState.js / Illustrations.js** — already premium; no
  change, just adopt on the 14 spinner screens.
- **Chip / SearchBar / Stepper / ScreenHeader / BackHeader** — to standard;
  enforce `iconSize` token (Chip's hardcoded 14 → token), and `type` roles
  for their labels. Stepper already uses tabular-nums (reference).
- **PRCelebration.js** — premium peak; under full migration, port the
  40-particle spring system to Reanimated. **Flag: highest regression risk
  in the whole roadmap** — sequence last, snapshot behaviour first.
- **MacroRings (food) / BodyDiagramHeatmap** — Skia/SVG, leave.
- **BrandMark.js** — fine; the wordmark/icon PNGs stay.

---

## Cross-screen violation totals (the Foundation backlog)

From the per-screen matrix:
- `type` roles: **0/61 screens** adopted → the U1 backlog is the whole app.
- Raw `fontSize` literals: ~68 across 28 screens (worst: ShareCard 15,
  Analytics 6, AthleteHub 6, Home 3).
- Raw `fontWeight` literals: 11 (worst: CoachReview 8).
- Raw hex/rgba: 64 across 16 screens (ShareCard 40 — its offline HTML canvas,
  legitimately exempt; real targets: ScanLabel 6, Home 4, ScanBarcode 2,
  NotificationSettings 2).
- Raw `borderRadius`: 91 across 44 screens (mostly circles → `radius.circle`
  and 2-4px dots → `radius.xs`).
- Inline shadows: 9 (Toast, Welcome, ProUpgrade, ProOnboarding,
  ProSetupComplete).
- `ActivityIndicator`-only loading: 14 screens (the skeleton backlog).

ShareCardScreen note: its 40 hex + 15 fontSize live in a generated HTML
string for offline PNG export that genuinely cannot read RN styles. It is
**exempt** from U1/hex rules (and from the CI guard via whitelist), but its
*palette constants* should be derived from the theme values at the top of
the file so they don't drift from the app.
