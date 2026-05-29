# Volyume component audit, 00 · Inventory (Phase 1)

Date: 2026-05-29
Scope: every UI component and screen in `src/`, plus the foundation
(theme tokens, navigation shell, store wiring).

This file is the master checklist. Each entry carries: file path, what it
does, where it appears, and issues visible at inventory stage. Phase 3
assessments tick these off category by category.

Method: read `src/styles/theme.js` and `src/navigation/RootNavigator.js`
in full; the rest inventoried by four parallel read passes over
`src/components/`, `src/components/food/`, the training screens, and the
coaching / onboarding / settings screens. Line counts and line citations
are from those passes.

Counts: 28 core components, 11 food components, 62 screens, 1 navigator,
1 theme module, 1 store.

---

## A. Foundation (tokens, primitives, theme, motion)

- [ ] **theme.js** (`src/styles/theme.js`), Single token source: `colors`
  (WCAG-annotated dark palette, `#0D0D0D` bg, amber `#F59E0B`),
  `spacing` (8-pt-ish scale xxs–xxxl), `radius` (tiered sm–full),
  `fontSize` (xs–display), `fontWeight`, `shadow` (sm/md/lg),
  `hitSlop`, `iconSize`, `motion` (card/state/micro + easings),
  `volumeColors` (lazy getters). `colors`/`fontSize` are mutable so
  `applyAccessibility()` can swap higher-contrast / colour-blind /
  larger-text variants at boot. Used everywhere. Issues: no
  `lineHeight` token scale (every screen hardcodes lineHeight ints);
  no `letterSpacing` scale; no `overlay`/`backdrop` colour token, so
  every sheet hardcodes `#000`/`rgba(0,0,0,x)`; no `fontFamily` token
  (system font only); motion tokens exist but many screens still inline
  `duration:` literals (e.g. RootNavigator heroZoom 280/200).
- [ ] **BrandMark.js**, `VolyumeMark` / `VolyumeIcon` wordmark + V-icon,
  expo-image with RN Image fallback. accessibilityLabel present. No
  interaction states (correct). Foundation asset.
- [ ] **Illustrations.js**, Hand-tuned SVG empty-state art (barbell,
  calendar, trophy, chart, scale), `size` prop. Uses theme tokens for
  fills; hardcoded stroke widths. No a11y beyond structure.
- [ ] **InfoTooltip.js**, Info-icon button → modal with explanatory
  text. Backdrop hardcoded `rgba(0,0,0,0.65)` (l.32); no
  accessibilityLabel on the trigger.
- [ ] **PressableCard.js**, Shared press-in spring (scale 0.97 + opacity
  dip), respects reduceMotion, default `accessibilityRole='button'`.
  No hardcoded colours. This is the reference interaction primitive.
- [ ] **Skeleton.js**, Shimmer placeholder, `SkeletonCard`/`SkeletonRow`
  presets, `accessibilityRole='progressbar'`, pauses under reduceMotion.
  Fallback colour hardcoded `#1F2024` (l.87).

## B. Navigation

- [ ] **RootNavigator.js** (`src/navigation/`), 5-tab bottom nav (Train /
  Plans / Diary / Progress / You) over 6 stacks; auth/first-run/consent
  gating; hero-zoom card→screen transition; per-stack reduceMotion
  override; `SyncStatusBadge` in every header-right; branded
  `SplashScreen`. Issues: tab bar `tabBarLabelStyle` hardcodes
  `fontSize: 11` and `fontWeight: '600'` (l.332) instead of tokens;
  splash container hardcodes `#000000` (l.1039); heroZoom durations
  inline (l.145-147); five separate `tabPress→popToTop` effects
  duplicated across stacks. `lazy={false}` mounts every tab eagerly.
- [ ] **BackHeader.js**, Back chevron + title + optional right node for
  pushed/modal screens. Theme tokens, accessibilityRole+label. No
  visual press state on the chevron (hitSlop only).
- [ ] **ScreenHeader.js**, Tab-screen top (title + subtitle + wordmark +
  optional right). `WORDMARK_HEIGHT` and paddingTop hardcoded for
  optical alignment (l.25,67). No a11y labels.
- [ ] **PeekMenu.js**, Imperative long-press bottom action menu (icon +
  label rows, cancel). Items have role+label, Pressable press states.
  Backdrop hardcoded `#000` 0.55 (l.166).
- [ ] **Tab bar** (inside RootNavigator `MainTabs`), Ionicons filled/
  outline per focus, amber active tint. Labels hardcode size/weight.

## C. Layout (containers, cards, sections, grids)

- [ ] **GradientCard.js**, Misnomer: flat hero card with optional accent
  border by `tone`; no gradient (correct per brand). Border alpha via
  `accent + '55'` string concat (l.38). Optional accessibilityLabel.
- [ ] **MealSection.js** (food), Meal-slot group: uppercase header +
  summed kcal + dashed "Add food" row + swipeable entries. Tokens,
  a11y label on add, minHeight 48. No loading state for onAdd.
- [ ] **TierComparisonStrip.js**, Two-column Pro/Complete pricing
  compare, 3 locked diff rows. Tokens; comparison copy hardcoded
  (l.22-26).

## D. Input (fields, selectors, steppers, buttons, pickers)

- [ ] **SetEntry.js**, Weight/reps steppers (52×52), plate-calc button,
  live e1RM, set-type picker, per-side (unilateral) toggle. Full a11y
  labels+roles, decimal-safe weight entry. No hardcoded colours.
  Reference-quality input cluster.
- [ ] **PlateCalculator.js**, Target/bar weight + plate breakdown + visual
  bar. Plate colours hardcoded IEC standard (l.24-32, intentional but
  off-token); TextInput + 22px close button lack accessibilityLabel.
- [ ] **ServingPicker.js** (food), Quantity input + unit toggle,
  tabular-nums. a11y label + state on units, hitSlop 6. No validation
  UI (parent validates).
- [ ] **QuickAddSheet.js** (food), Bare calories + optional macros + meal
  slot bottom sheet. KeyboardAvoiding, validation (1-5000 kcal),
  submitting state. Backdrop hardcoded `#000` (l.166).
- [ ] **FoodDetailSheet.js** (food), Add/edit one entry: quantity, meal
  slot, live macro preview, delete-confirm. accessibilityViewIsModal.
  Backdrop `#000` (l.234); no live region on macro preview; no save-fail
  recovery UI.

## E. Feedback (toasts, alerts, sheets, loading, empty, error)

- [ ] **Toast.js**, Queue + variants (success/error/warning/info/undo) +
  optional action, auto-dismiss, `role='alert'`+liveRegion, reduceMotion-
  aware. Host z-index hardcoded 9999 (l.205). Reference-quality.
- [ ] **EmptyState.js**, Shared empty card: icon/title/text/primary+
  secondary CTA/ghost preview. a11y on dismiss. Uses activeOpacity, not
  the PressableCard spring (inconsistent press feel).
- [ ] **FeedbackSheet.js**, Global sentiment-chip feedback sheet, shake-
  to-report, auto-dismiss 12s, full a11y, reduceMotion-aware. Backdrop
  `#000` (l.349).
- [ ] **PRCelebration.js**, Full-screen confetti + card reveal + haptics,
  `subdued` toast mode. Particle colours hardcoded array (l.26);
  backdrop `#000` (l.190); animated elements lack a11y.
- [ ] **WhatsNewSheet.js**, One-time release-notes bottom sheet, versioned
  storage key, reduceMotion-aware. Backdrop `#000` 0.55 (l.163); tint
  alpha via `tint + '22'` concat (l.123).
- [ ] **SyncStatusBadge.js**, Header sync dot + status, tap → diagnostics
  modal (queue depth, last sync, errors), 5s poll + NetInfo. role+label.
  Backdrop `rgba(0,0,0,0.4)` (l.171); status colour map hardcoded
  (l.26-32).
- [ ] **ProGate.js** / `ProLocked` / `ProBadge` / `withProGuard`, Pro lock
  overlay (dim to 0.35) → upgrade sheet; HOC guard for routes. a11y on
  buttons. Backdrop `rgba(0,0,0,0.65)` (l.173).
- [ ] **DifferentialBadge.js**, Paywall card under coach output (Move #4
  trigger), fires telemetry on mount. a11y label+role on buttons; CTA
  has no press state.
- [ ] **HeldDecisionCard.js** (food), Safety-hold reason (FFM floor / ED
  pattern / rapid loss) + Why link + Get-support (ED only). role/link
  a11y. Linking error swallowed `.catch(()=>{})`.
- [ ] **EmptyDiary.js** (food), Empty diary copy block, `role='text'`.
  Static; locked copy.
- [ ] **RestTimer.js**, Countdown + progress bar + skip + ±15/±30 + haptic/
  audio cues, live region for VoiceOver, reduceMotion-aware. countdownNum
  fontSize hardcoded (l.261). Reference-quality.

## F. Data display (charts, stats, badges, rings, sparklines)

- [ ] **MacroRings.js** (food), Concentric Skia rings (kcal centre + P/C/F
  outer) vs target, tap → breakdown. role+label when tappable. Skia
  Canvas with no fallback for environments without it; ring shapes not
  a11y-described (numeric labels mitigate).
- [ ] **MacroBreakdownSheet.js** (food), Per-meal macro table modal.
  Backdrop `rgba(0,0,0,0.5)` (l.121). Empty + no error state.
- [ ] **VolumeBars.js**, Weekly working-sets-vs-MRV bars per muscle with
  MEV/MAV ticks. Data-driven fills. No a11y.
- [ ] **BlockProgressCard.js**, Planned vs actual sets per muscle bar.
  Sub-70% bar colour hardcoded `rgba(245,158,11,0.25)` (l.35). No a11y.
- [ ] **BodyDiagramHeatmap.js**, Front/back muscle map, colour-coded
  volume, tappable regions + legend. SVG regions have onPress but no
  accessibilityRole (l.47).
- [ ] **FatigueTrendCard.js**, Recent-session fatigue bar sparkline + read.
  No a11y. Pure display.
- [ ] **Sparkline.js**, Inline gifted-charts line, no axes. Null-filters
  data, <2pt placeholder. No a11y.
- [ ] **SvgBarSparkline.js**, Pure-SVG bar sparkline (fatigue, meso pulse),
  optional labels/colours. No a11y.
- [ ] **DifferentialBadge.js**, (also Feedback; see E.)
- [ ] **SourceChip.js** (food), Source badge (OFF/USDA/CoFID/Custom/OCR),
  tabular-nums. a11y label. padding hardcoded 6 (l.35).
- [ ] **EntryRow.js** (food), Diary entry: name/brand/qty/kcal/macros,
  swipe-delete, checkbox multi-select, long-press. a11y both modes,
  minHeight 48. Checkbox check colour hardcoded `#000` (l.41).
- [ ] **FoodRow.js** (food), Search/browse row: name/brand/serving/kcal/
  source + fav/dislike icon, long-press cycles preference. a11y w/
  preference state, minHeight 56. No visual feedback on the long-press
  cycle.
- [ ] **ExerciseCard.js**, Exercise name/muscles/equipment/custom-tag/
  last-logged + add button (36×36). a11y on outer card. Wrapped in
  PressableCard.

## G. Feature-specific screens

### Training / workout
- [ ] **HomeScreen.js** (Train tab root, ~large), Greeting, week stats,
  active-plan card, daily narrative, morning-weight tracker, coach
  banner, fatigue graph; SkeletonCard load state; several sheets. Large
  file; limited a11y labels visible.
- [ ] **ActiveWorkoutScreen.js** (2616 lines), Set logging, rest timer,
  cluster sets, supersets, time-crunch UI, swap engine, notes, PR
  celebration. Issues: very large; exercise carousel via `map` not
  FlatList (l.477); inconsistent hitSlop; opacity literal 0.4 (l.546);
  Alert-based errors (l.870); sparse a11y outside reorder.
- [ ] **BuildWorkoutScreen.js** (627), Pre-session exercise picker + set/
  rep/rest config + travel mode. FlatList correct. Alert errors; minimal
  a11y.
- [ ] **RoutineDetailScreen.js** (872), Template editor: reorder/swap/add,
  muscle-coverage chips. Good a11y on reorder/swap; Alert confirms; no
  spinners; FlatList.
- [ ] **PlansScreen.js** (999), Plans hub: block advisor, active-plan hero,
  plan/template/block lists, PeekMenu. No skeleton (loads on focus);
  uneven a11y; ScrollView for whole page.
- [ ] **PlanDetailScreen.js** (~440), Plan detail: badges, workout list,
  "Why this plan" rationale, manage actions. RefreshControl; no skeleton;
  manage rows lack a11y labels.
- [ ] **PlanLibraryScreen.js** (794), Pre-built plan browser: quiz reco,
  collections, division filter, import. FlatList; good chip states; many
  buttons lack a11y labels; no skeleton.
- [ ] **ManualBuilderScreen.js** (1270), Multi-step manual plan builder +
  in-file ExercisePickerModal + plan-balance chart. Large; Alert
  validation; limited a11y.
- [ ] **MesocycleBuilderScreen.js** (542), Training-block dashboard:
  tonnage BarChart, recovery, deload advice, past blocks. Mostly display;
  no skeleton; little a11y.
- [ ] **ExerciseLibraryScreen.js** (748), Searchable catalog + filters +
  custom-exercise sheet + last-logged. Debounced search, useMemo+FlatList
  (good). Limited a11y outside primary buttons.
- [ ] **ExerciseDetailScreen.js** (1046), Strength chart, PR history, goal
  set/track, similar lifts, form tips. ActivityIndicator load; victory-
  native chart; `colors.gold + '15'` concat (l.676); limited a11y.
- [ ] **WorkoutHistoryScreen.js**, List/calendar history, expandable
  session detail. EmptyWorkouts illustration; FlatList; lazy detail.
- [ ] **WorkoutSummaryScreen.js** (~1000+), Post-workout feedback
  (difficulty/pump/fatigue/sleep), autoreg suggestions, volume status,
  deload, PR showcase, save-template. RatingRow reuse; debounced
  feedback; Toast.
- [ ] **BlockReflectionScreen.js**, Post-block stats + narrative + PRs.
  SkeletonCard + empty state; StatBlock reuse.
- [ ] **PRWallScreen.js**, PR gallery grouped by exercise, strength-level
  badges, progression LineChart, PeekMenu. getLevelColor helper.
- [ ] **YearOfLiftsScreen.js**, Annual recap as swipeable story cards,
  progress pips, GradientCard hero numbers. Zero-value cards filtered.
- [ ] **ShareCardScreen.js**, PR share PNG via WebView/Canvas
  (1080×1920). Palette hardcoded in Canvas HTML to mirror theme
  (l.40-49); platform deps with fallbacks; canvas output not a11y.
- [ ] **RestTimer.js**, (see Feedback.)

### Food / nutrition
- [ ] **DiaryScreen.js** (Diary tab root), Date pager, MacroRings, 4 meal
  sections, water tracker, multi-select, copy-yesterday, save-as-meal,
  breakdown sheet. FAB 56×56 + stacked copy FAB; FAB shadow hardcoded
  (l.650); dynamic `require` in copy-yesterday callback (l.392); no error
  boundary.
- [ ] **FoodSearchScreen.js**, Tabbed browse (Recents/Suggested/Favourites/
  Frequents/Custom) + global waterfall search, plate multi-add, quick-add,
  preference cycling; reused in RecipeBuilder (pickMode). 250ms debounce;
  plate modal height hardcoded 360 (l.634); no search-reject handling.
- [ ] **AddCustomFoodScreen.js**, Custom-food form (per-100g macros +
  serving + eaten qty), logs immediately; OCR/barcode prefill. Macro
  sanity check w/ override; disabled+loading save.
- [ ] **MyMealsScreen.js**, Saved meals list, tap→log, long-press menu
  (rename/delete). Loading+empty; rename modal; rows minHeight 64; no
  a11y label on rows (l.129); no error recovery on log reject.
- [ ] **MyRecipesScreen.js**, Saved recipes, tap→log (loggingId guard +
  spinner), pencil→edit, long-press delete. a11y on rows/edit/CTA;
  empty w/ CTA; no error handling on applyRecipeToDiary reject.
- [ ] **RecipeBuilderScreen.js**, Create/edit recipe: name/servings/notes/
  ordered ingredients + live per-serving macros. Reuses FoodSearch
  (pickMode='recipe'); disabled+loading save; no error recovery on
  fetch reject.
- [ ] **FoodInsightsScreen.js**, 7-day adherence: kcal bars, macro hit
  rate, CSV export. In-tolerance bars go green; export loading; no error
  handling on rollup reject.
- [ ] **NutritionTargetsScreen.js** (Pro, gated), Long targets calculator
  (sex/age/height/weight/BF/activity/goal/protein) → results (hero,
  macro cards, per-meal split, why, phase, confidence, warnings,
  expandable maths). Strong a11y on selectables; no error boundary
  around calculate.
- [ ] **NutritionEducationScreen.js**, Read-only macros primer; reusable
  Section/Body/MacroLine/Bullet. No interactivity; no loading/error.
- [ ] **ScanBarcodeScreen.js**, vision-camera barcode → waterfall →
  FoodSearch (hit) / ScanLabel (miss). Permission fallback; torch;
  scan-lock; AppState pause. Reticle 240×160 + colours hardcoded
  (l.250-256).
- [ ] **ScanLabelScreen.js**, Camera label OCR (MLKit) → AddCustomFood
  prefilled; optional OFF contribution. Permission handling; torch; OCR-
  availability fallback "Type it in". Frame 280×360 + colours hardcoded.

### Coaching / analytics
- [ ] **AnalyticsScreen.js** (1395, Progress tab root), Explore grid +
  charts/stats hub; NavTiles into heatmap, PRs, body, recovery hub. Large.
- [ ] **AthleteHubScreen.js** (1151), Recovery/readiness dashboard +
  Engine Log; management cards cross-navigate to ProfileTab. Large; loads
  via getAllWorkouts.
- [ ] **VolumeHeatmapScreen.js**, Volume heatmap detail (VolumeBars /
  BodyDiagramHeatmap consumers).
- [ ] **CoachOutputScreen.js** (2062, Pro gated "Your week"), Weekly
  Precision-Coaching output: adjustment + rationale, held decisions,
  differential paywall. Very large.
- [ ] **CoachReviewScreen.js** (813), Weekly review detail.
- [ ] **CoachHeldHistoryScreen.js**, History of held coaching decisions.
- [ ] **CoachingRemindersScreen.js** (Pro gated), Coaching reminder
  scheduling.
- [ ] **WeeklyCheckInScreen.js** (1259, Pro gated), Weekly check-in
  capture feeding the engine. Very large.
- [ ] **WellbeingCheckScreen.js**, Wellbeing check capture.
- [ ] **BodyMetricsScreen.js** (1206, Pro gated), Body metrics log +
  trends. Very large.
- [ ] **GoalChangeSummaryScreen.js**, Summary after a goal change.
- [ ] **GoalLockConsentScreen.js**, Goal-lock consent (now off the
  onboarding path; reachable from You).
- [ ] **CascadeGateScreen.js**, Cascade/paywall gate (modal).

### Onboarding / auth / account
- [ ] **WelcomeScreen.js**, Tier selection / welcome entry.
- [ ] **LoginScreen.js**, Email + OAuth sign-in / sign-up; owns the
  anonymous→account migration (signup branch).
- [ ] **OnboardingScreen.js**, Free onboarding flow.
- [ ] **FirstRunScreen.js**, Free first-run branch (plan library / quick
  setup).
- [ ] **Article9ConsentScreen.js**, Health-data consent gate (un-skippable
  for cloud users).
- [ ] **ProOnboardingScreen.js** (1332), 4-step Pro wizard (auth → profile
  → training → recovery/reminders); inline Dropdown; OAuth. No raw hex;
  a11y on auth buttons; very large.
- [ ] **ProGoalSetupScreen.js** (745, Pro gated), Update goal/phase/weak-
  points/etc → re-plan + recalc. a11y on selectables; large.
- [ ] **ProSetupCompleteScreen.js** (419), Setup-complete reveal: 4 daily
  routines + nutrition summary + collapsible split + "Why this plan" +
  founder note. Animated, reduceMotion-aware.
- [ ] **ProUpgradeScreen.js** (527), Free→Pro pitch + auth. Apple-button
  text hardcoded `#FFFFFF` (l.291, brand-required but off-token).
- [ ] **PaywallScreen.js** (193), Lightweight Pro paywall modal +
  TierComparisonStrip.
- [ ] **SubscriptionScreen.js** (263), Current tier/price/days + upgrade/
  restore/cancel.
- [ ] **SubscriptionPolicyScreen.js** (194), Plain-English subscription
  policy.

### Settings / system
- [ ] **YouScreen.js** (You tab root), Profile header (initials avatar,
  training age, sessions) + coaching/wellbeing/settings/about nav rows.
  useFocusEffect for fresh session count.
- [ ] **SettingsScreen.js**, Account identity + units/diet + notifications
  + health + accessibility + export/wipe + delete; restart alert on a11y
  toggle.
- [ ] **NotificationSettingsScreen.js** (946), Morning weight / check-in /
  training reminders with day+hour chips; SQLite→AsyncStorage→legacy
  fallback; 600ms debounced save; permission gate. Large.
- [ ] **PrivacyPolicyScreen.js**, Privacy policy (Section/Body).
- [ ] **CreditsScreen.js** (136), Food-data attributions (OFF/CoFID/USDA).
- [ ] **DebugLogScreen.js**, On-device error log viewer (last 200) +
  filter/share/clear/diagnose.
- [ ] **ImportScreen.js** (485), CSV import (Hevy/Strong): detect→preview→
  confirm→write. Stage-based; good error copy.

---

## Cross-cutting issues surfaced at inventory stage

These recur across many components and are candidates for systemic fixes
(Phase 5). Each is grounded in the citations above.

1. **No overlay/backdrop token.** At least 9 surfaces hardcode `#000` /
   `rgba(0,0,0,x)` at differing opacities (InfoTooltip 0.65, ProGate 0.65,
   PeekMenu 0.55, WhatsNewSheet 0.55, FeedbackSheet, SyncStatusBadge 0.4,
   MacroBreakdownSheet 0.5, FoodDetailSheet, QuickAddSheet, PRCelebration,
   splash `#000000`). Backdrop darkness is visibly inconsistent.
2. **No lineHeight / letterSpacing token scale.** Every screen hardcodes
   `lineHeight` integers; type rhythm drifts between screens.
3. **Two press-feedback systems.** `PressableCard` (spring scale, the good
   one) vs ad-hoc `activeOpacity` (EmptyState, many cards/buttons) vs raw
   TouchableOpacity. Press feel is not uniform.
4. **Accessibility coverage is uneven.** Strong in SetEntry, RestTimer,
   Toast, FeedbackSheet, food inputs; thin or absent in chart components
   (Sparkline, VolumeBars, BodyDiagramHeatmap regions, MacroRings shapes)
   and across the large training screens (ActiveWorkout, Plans,
   PlanLibrary, manage rows).
5. **Loading-state strategy is mixed.** Skeleton (Home, BlockReflection)
   vs ActivityIndicator (ExerciseDetail, Import) vs nothing (Plans,
   PlanLibrary, Mesocycle, PlanDetail). No house rule.
6. **Error UX is Alert-driven.** Most write paths surface failure via
   `Alert.alert` or swallow it (`.catch(()=>{})`); few offer inline retry.
   Contradicts the Toast system that already exists.
7. **Alpha-by-string-concat** (`color + '40'`, `+ '55'`, `+ '15'`,
   `+ '22'`) scattered across GradientCard, WhatsNewSheet, ExerciseDetail,
   Plans, PlanLibrary, no tinted-surface helper.
8. **A few very large screens** (ActiveWorkout 2616, CoachOutput 2062,
   AnalyticsScreen 1395, ProOnboarding 1332, WeeklyCheckIn 1259,
   BodyMetrics 1206, AthleteHub 1151, ExerciseDetail 1046, ManualBuilder
   1270) mix layout + state + sub-modals in one file. Component-extraction
   opportunity, and a re-render/perf watch item.
9. **List virtualisation is inconsistent.** FlatList in most lists, but
   ActiveWorkout exercise carousel and the Plans page use `map` inside
   ScrollView.
10. **Tab bar + splash off-token.** Tab label size/weight and splash bg
    bypass the theme.

---

## Phase 1 status: COMPLETE

Every file in `src/components/`, `src/components/food/`, and `src/screens/`
is listed, plus the navigator, theme, and store wiring. The ten cross-
cutting issues above are the seed for the Phase 4 coherence audit and the
Phase 5 systemic-fixes list. Proceeding to Phase 2 (category-level best-in-
class research) and Phase 3 (per-component assessment), saving one file per
category.
