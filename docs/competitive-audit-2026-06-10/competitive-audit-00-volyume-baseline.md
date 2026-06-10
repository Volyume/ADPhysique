# Competitive Audit 2026-06-10 — Volyume Baseline (Phase 1)

> Produced from a direct read of the codebase on branch
> `claude/main-branch-content-update-dcqicf` (post build-14 fixes).
> Every claim below cites the source file. This is the ground-truth
> document the 14 competitive research agents and the comparison
> matrix are measured against.
>
> Companion document: `competitive-audit-00-workout-screen-deep-audit.md`
> (the priority deliverable, the active workout session screen at
> maximum depth).

---

## 1. Product identity

Volyume is an offline-first hypertrophy training and nutrition coaching
app. Two tiers (Free + Pro), live on Google Play, iOS build 14 in
TestFlight Beta App Review. Tagline: "Less thinking. More lifting."
(`RootNavigator.js:1168`).

- **Stack:** Expo SDK 54 / React Native 0.81 / React 19, expo-sqlite
  local DB (source of truth), Supabase (EU Dublin) as sync target only,
  Zustand store, React Navigation v6 (`package.json`).
- **Coaching engine:** fully deterministic, pure functions, "No LLM. No
  AI. No randomness" (`CLAUDE.md`, `weeklyCoach.js:4`, `planEngine.js:4`).
- **Voice:** British English, no jargon (MEV/MRV/RIR banned from
  user-facing copy — enforced by `jargonBlocklist.test.js`), no
  em-dashes, no encouragement filler, "honesty test applied to every
  line" (`docs/COACHING_VOICE_SYNTHESIS_LOCKED.md`, referenced
  throughout screens).
- **Safety systems:** ED-pattern detector with calorie-cut lockout
  (`edPatternDetector.js`, `weeklyCoach.js:1002`), FFM energy floor at
  30 kcal/kg fat-free mass (IOC RED-S threshold, `nutritionEngine.js:119`),
  calorie floors 1,200/1,500 kcal (`nutritionEngine.js:616`), 1.5 %
  BW/week rapid-loss hard gate (`nutritionEngine.js:104`), SCOFF-based
  wellbeing screen gating deficits (`WellbeingCheckScreen.js`,
  `weeklyCoach.js` `scoffPositive`), Beat UK signposting
  (`whyThisTemplates.js` `getEdSupportLink`).

## 2. Navigation map (verified against `RootNavigator.js`)

Five tabs (`MainTabs`, tab bar 60pt + bottom inset, icons 22, labels
`fontSize.xs`):

| Tab | Default screen | Stack contents |
|---|---|---|
| **Train** (HomeTab) | HomeScreen | BuildWorkout, ActiveWorkout (hero-zoom transition), WorkoutSummary, WorkoutHistory, VolumeHeatmap, ShareCard, CoachReview, LogCardio (modal), ProUpgrade (modal) |
| **Plans** | PlansScreen | PlanUpdate (gated), PlanDetail, RoutineDetail, ExerciseDetail, ManualBuilder, PlanLibrary, MesocycleBuilder, ProUpgrade |
| **Diary** | DiaryScreen (Pro-gated at root) | FoodSearch, AddCustomFood, ScanBarcode, ScanLabel, LogCardio, CardioHistory, FoodInsights, MyRecipes, MyMeals, RecipeBuilder (all modals except history/insights) |
| **Progress** | AnalyticsScreen | WorkoutHistory, WorkoutSummary, VolumeHeatmap, CoachReview, BodyMetrics (gated), LiftProgress, Consistency, ExerciseDetail, YearOfLifts, ShareCard, LogCardio, CardioHistory, ProUpgrade |
| **You** (ProfileTab) | YouScreen | 10 Settings sub-pages, NutritionTargets (gated), NutritionEducation, BodyMetrics (gated), WeeklyCheckIn (gated), CoachOutput (gated, "Precision Coaching™"), ShareCard, CoachHeldHistory, BlockReflection, ProGoalSetup (gated), GoalChangeSummary, GoalLockConsent, NotificationSettings, Import, CoachingReminders (gated), WellbeingCheck, PrivacyPolicy, DebugLog, SubscriptionPolicy, Subscription, CascadeGate (modal), Paywall (modal), Credits, ProUpgrade (modal) |

Pre-main-tabs routing priority (`RootNavigator.js:1005-1050`):
signed-out → WelcomeStack (Welcome → Login); signed-in without Article 9
health-data consent → Article9ConsentStack (blocking; this is also where
the 14-day cardless Pro trial is granted); Pro + first-run incomplete →
ProOnboardingStack (5 steps); Free + first-run incomplete → FirstRunStack
(name only); else MainTabs. Branded splash with animated wordmark,
minimum 1,600 ms (`SPLASH_MIN_MS`).

## 3. Feature inventory by area

### 3.1 Training plan generation (`planEngine.js`, 2,315 lines)

- Deterministic generator: inputs = experience (4 levels), days/week
  (clamped 3–6, beginners capped at 4), session length, equipment,
  goal (12 incl. 8 physique divisions), training phase (weak_point /
  strength_size), up to 3 weak points, recovery rating, nutrition phase,
  age (`_generatePlanInner`, `planEngine.js:2082`).
- Volume landmarks (MV/MEV/MAV/MRV per 17 muscles) individualised by
  4 multiplier tables: experience, recovery, nutrition phase, age
  (`computeLandmarks`, `planEngine.js:100`).
- Division-first programming: a DIVISION_MATRIX maps each of 6
  specialised divisions × 3–6 days to named sessions with muscle lists
  (e.g. Men's Physique "V-Taper": Pull (Width) / Push (Delts + Chest)…,
  `planEngine.js:1397`). Division-aware MRV ceilings (Bikini/Wellness
  glutes 30 vs general 16, `divisionMRV`).
- Hard guarantees: structural muscles never zero, judged muscles ≥ MEV,
  per-muscle MRV cap, combined delt cap 26, systemic ceiling scaled to
  individual recovery (`enforceWeeklyFloorsAndCaps`,
  `applyGoalOverlay`).
- Weak-point blocks are additive on top of division bias with systemic
  offset trims; warns the user when a chosen weak point is already the
  division's top priority (`planEngine.js:2232`).
- Output includes `whyThis` (plain-English rationale per dimension),
  `personalisationSummary`, `weeklyVolumeSummary`, per-session duration
  estimates with an honest over-budget note, auto-assigned supersets,
  time-budget trimming (`planEngine.js:2202-2222`).
- `planAutoGen.js` wires profile → engine → DB ("Build my plan" recovery
  on Home). Plans can also come from a curated Plan Library
  (collections: Featured / For women / For men / Beginner / Dumbbells
  only / Short sessions / Bodybuilding Divisions,
  `PlanLibraryScreen.js`), a ManualBuilder, and seeded templates
  (`seedRoutines.js`, 1,568 lines).

### 3.2 Session logging (see deep-audit doc for the screen itself)

- Pre-filled per-set targets from `computeSetTargets` (previous session
  + prev-previous, layoff detection at 7 days → 0.9 multiplier,
  exercise-specific increments, `algorithms.js:339`).
- PR detection per set (1RM estimate / heaviest / most reps,
  `detectPR`), full-screen PR celebration component (`PRCelebration.js`),
  best-PR-per-exercise aggregation for the summary.
- Set types: working, warm-up, drop set, myo-reps, rest-pause, AMRAP;
  myo-reps/rest-pause run as in-UI "clusters" committing one row with a
  breakdown note (`clusterSet.js`). Supersets: plan-time or ad-hoc
  pairing, auto-jump between halves, one-time instructional sheet.
- Unilateral (per-side) logging preference per exercise
  (`unilateral.js`). Plate calculator component exists
  (`PlateCalculator.js`) but is **not wired into ActiveWorkoutScreen**
  (only the stale `plateBtn` style remains in `SetEntry.js`).
- Rest timer: store-driven, wall-clock-resynced, escalating 3-2-1
  beeps + haptics, ±15/±30 adjustments, Skip (`RestTimer.js`,
  `restSound.js`). Lock-screen Live Activity was built
  (`modules/rest-timer-live`, `live-activity`) but the rest-timer
  notification path is currently disabled after beta feedback
  (`RestTimer.js:46-52`); a persistent active-workout notification
  (current exercise/set/elapsed) IS shown (`notifications/activeWorkout.js`).
- Time Crunch: shortens the remaining session (~30 % rest cut, drops
  un-started isolations), revertible (`mesocycle.js applyTimeCrunch`).
- Stale-session recovery (>4 h), crash recovery of in-progress workouts
  (`restoreActiveWorkout`, HomeScreen.js:60), double-tap finish guard,
  DB-sourced finish totals, immediate cloud sync on finish
  (`ActiveWorkoutScreen.js:1038-1093`).
- Post-session: WorkoutSummary with duration/sets/tonnage, PRs, and a
  7-row subjective feedback panel (difficulty, pump, soreness-coming-in,
  fatigue, joint discomfort, energy, sleep) feeding the adaptive engine
  (`WorkoutSummaryScreen.js:736-742`), plus per-exercise "next time"
  notes that resurface at the next session
  (`getNextTimeNotes` / `nextTimeBanner`).

### 3.3 The Coach (Precision Coaching™)

Weekly loop: morning weights (+ HealthKit/Health Connect import) →
gated check-in → deterministic `runWeeklyCoach` → CoachOutputScreen with
confirm-then-apply cards → applied changes write to nutrition targets /
planned volume / profile.

- **Check-in** (`WeeklyCheckInScreen.js`, 4 steps): energy, stress,
  sleep; weight trend (read-only EWMA), cycle flag (opt-in, female),
  calorie adherence **pre-derived from the food diary** with a
  plain-language confidence note, steps average (auto from health data
  when 4+ days registered, manual fallback, tap-to-override), cardio
  compliance pre-derived from the cardio log; soreness + sore muscles +
  joint pain; training performance **pre-derived** from session
  adherence + PRs + week-over-week volume. Gates: scheduled day only,
  ≥5 days since first weight, ≥3 weigh-ins; load failures fail CLOSED
  with retry (`gateState`).
- **Engine** (`weeklyCoach.js`, 1,304 lines): data-confidence
  assessment with explicit holds; recovery×performance autoregulation
  matrix → volume signal -2…+3; stress caps pushes; safety holds from
  joint pain / free-text illness-injury parsing (`parseNoteFlags`);
  EWMA weight trend vs phase goal rate; calorie adjustments gated by
  2-3 consecutive off-target weeks + 2-week cooldown, ±5 % cap,
  adaptive TDEE resizing when ≥4 weeks of data (MacroFactor-style
  energy-balance maths, 50 % damped, `computeAdaptiveTDEEAdjustment`);
  rapid-loss compression (immediate calorie raise bypassing gates);
  FFM-floor refusal of cuts; steps prescription by phase band with
  "hit your current target first" logic; cardio prescription only when
  steps lever is maxed, compliance-driven escalation, recovery pause;
  deload suggestion (2-of-4 triggers); diet break (MATADOR, ≥8 weeks);
  carb cycling + refeeds for advanced/competition users; ED-pattern
  raise/clear state machine; differential paywall trigger for free
  users; **held decisions** — every adjustment NOT made is surfaced
  with its reason ("Calories held. Trend is on target.").
- **Output screen** (`CoachOutputScreen.js`, 2,099 lines): headline,
  what's working, "Nutrition next week" + "Training next week" cards
  with per-row Apply buttons and Applied chips, why-this-week line,
  held-decisions card with previous-weeks shelf, rich ED-lockout /
  cleared / rapid-loss blocks, diet-break / macro-cycle / refeed apply
  cards. Nothing writes without an explicit user Apply.
- Coach history (`CoachHeldHistoryScreen`), pre-workout coach brief on
  Home (`buildCoachBrief`), in-session deload prescriptions
  (week-1 weight, ~50 % reps), block-end reflection
  (`BlockReflectionScreen`), block advisor (`blockAdvisor.js`).

### 3.4 Nutrition & food

- **Targets** (`nutritionEngine.js`): Mifflin-St Jeor or Katch-McArdle
  (credible BF% only), gym-tuned activity multipliers, 7 phases, three
  named protein approaches + custom g/kg (capped 3.5), fat g/kg by
  phase, carbs fill, per-meal protein distribution, experience-scaled
  surpluses, safety floors/gates with explicit warnings, "How was this
  calculated?" breakdown on NutritionTargetsScreen (1,849 lines).
- **Diary** (`DiaryScreen.js`): date pager, MacroRings vs effective
  daily target (refeed day > carb-cycle training/rest day > flat),
  numbered meal ladder + pre/post-workout slots, swipe-delete,
  long-press multi-select (move / copy-to-today / save-as-meal /
  delete), copy-yesterday, water tracker (250 ml steps vs 3 L), barcode
  FAB, per-meal macro breakdown sheet, designed empty state.
- **Food data** (`lib/food/`): bundled OpenFoodFacts UK snapshot +
  CoFID UK generic foods (~3k) imported at boot, live OFF + USDA
  waterfall behind a 250 ms debounced search, local cache, cloud food
  library delta pulls, OFF write-back of user photos/labels (opt-in),
  barcode scan (vision-camera), label OCR scan (ML Kit, Cronometer
  -style two-step front-of-pack + nutrition panel), custom foods,
  recipes (RecipeBuilder, ingredients sync), saved meals, frequents,
  favourites/dislikes with long-press cycling, curated meal
  suggestions (`mealSuggest.js`), macro sanity checks
  (`sanityChecks.js`), CSV export.
- **Insights**: FoodInsightsScreen (7-day kcal bars vs target, macro
  hit rate, export).

### 3.5 Progress & analytics

- Progress tab (`AnalyticsScreen.js` + `useProgressData.js`):
  insight stack from a deterministic `insightsEngine` (severity-ranked,
  dismissible), recent sessions, This week's volume strip → Volume
  Heatmap (per-muscle working sets vs landmarks, 1/2/4-week windows,
  editable custom landmarks, body-diagram heatmap
  `BodyDiagramHeatmap.js`), cardio week card (Pro), PR-rate sparkline
  (window toggle), Explore tiles: Consistency, Lifts, Weight,
  Full History, Year of Lifts (locked until 365 days of history with
  countdown).
- Lifts (`LiftProgressScreen.js`): strength standing per lift
  (Beginner→Elite via `strengthStandards.js`), e1RM trajectories,
  recent-best markers; ExerciseDetail: weight/e1RM charts, PRs, lift
  goals with achieved detection, text form tips.
- Consistency (`ConsistencyScreen.js`): mesocycle pulse, recovery
  signals, acute:chronic workload, session duration chart, muscle
  frequency table, 12-week training calendar.
- Year of Lifts (`YearOfLiftsScreen.js`): Spotify-Wrapped-style
  full-screen swipe story.
- Body metrics (Pro): EWMA weight trend chart, body-fat trend,
  physique measurements (opt-in), morning-weight quick log on Train.
- Share cards (`ShareCardScreen.js`): 1080×1920 story-format PNG via
  off-screen WebView canvas, brand wordmark, hero stat, top lift,
  muscle chips.
- History: month calendar + filters (All/This month/Upper/Lower/Full),
  per-workout summaries, repeat-last-session.

### 3.6 Steps, cardio, wearables

- Steps: HealthKit / Health Connect aggregator reads (dedup via
  aggregate API, `health.js`), silent foreground recording
  (`activitySteps.recordTodaySteps`), understated StepsCard line on
  Train (self-hides until data), phase-banded coach targets, check-in
  auto-average. One combined "connect steps + weight" permission ask
  (`connectHealthStepsAndWeight`).
- Weight import from scales/wearables via the same health layer
  (`importNewWeights`).
- Cardio (`lib/cardio/`): activity library with categories
  (walking…sport), user-led logging (duration + intensity, kcal
  estimate shown but deliberately never added to food targets — the
  energy-balance model owns it), CardioCard on Train, CardioPlanCard
  on Progress, history screen, coach prescriptions as above.
- No live workout tracking from wearables (no watch app, no HR
  streaming): integration is aggregator-read only.

### 3.7 Onboarding

- **Welcome** (`WelcomeScreen.js`): animated wordmark, Free vs Pro
  bullet comparison, localised Play price, two CTAs.
- **Login**: email/password + Google + Apple (Supabase), signup intent
  carried from tier choice; no anonymous mode
  (`IDENTITY_AND_OWNERSHIP_LOCKED.md`).
- **Article 9 consent** (blocking): explicit health-data consent;
  grants the 14-day cardless Pro trial (`start_cascade`); trial-abuse
  prevention via salted email-hash ledger (migration 071).
- **Pro onboarding** (5 steps, `ProOnboardingScreen.js`, 1,594 lines):
  account → profile (sex, age, height, weight, BF% optional) →
  training logistics (experience, days, session length, equipment) →
  goal (physique divisions, phases, weak points; competition goals get
  a Goal-Lock consent gate) → recovery + reminders + health connect,
  then plan + nutrition generation and a reveal
  (`ProSetupCompleteScreen` → plan walkthrough → NutritionEducation
  hand-off).
- **Free first-run**: name + units only, straight to logging.
- Trial-end: CascadeGate day-14 prompt (subscribe or drop to Free),
  notification + one-time Home gate (`HomeScreen.js:76`).

### 3.8 Monetisation

- Two SKUs: Pro monthly £4.99, annual £29.99 (~50 % saving badge),
  flat pricing, localised prices ALWAYS from the store
  (`usePlayPrices`, PLAY-002 rule), StoreKit/Play Billing via
  react-native-iap with server-side verification + RTDN/App Store
  webhooks (`payments/`, `cascade.js`).
- 14-day cardless trial granted at consent, ledger-deduped; Play/App
  Store 7-day intro offer as the store-level trial for lapsed users.
- Differential paywall (Move #4): 6 contextual triggers computed by
  the coach for free users (e.g. stalled lift, missing TDEE signal),
  rendered as a contextual badge → PaywallScreen (single decision,
  TierComparisonStrip); CascadeGate handles day-14/28 branched gates.
- Free tier: full logger, plan library, manual builder, progress
  stats, PRs. Pro: diary/food, barcode/OCR, nutrition targets +
  coaching, steps/cardio, check-ins, Precision Coaching, divisions,
  body metrics, wearable import. Gating enforced at route level
  (`withProGuard`) and store level (`proGate.js`).
- Observation for the founder (no action taken): `catalogue.js` SKU ids
  are `pro_monthly` / `pro_annual` while `CLAUDE.md` names the immutable
  Play product ids as `volyume_pro_monthly` / `volyume_pro_annual` —
  worth a five-minute verification against Play Console, since tests
  pin the former.

### 3.9 Notifications (`lib/notifications/`)

Morning-weight daily reminder, scheduled check-in reminder (+ reschedule
after submit), Monday "coach ready", trial cascade gates (day 12/14),
training-day reminders, Year-of-Lifts unlock, active-workout persistent
notification, push token registration for billing-failure pushes.
Channels/categories split, quiet hours, per-type preferences screen,
timezone-change rescheduling. Tapped notifications deep-route via
`routeForNotificationType`.

### 3.10 Settings

Hub + 10 sub-pages (`SettingsScreen.js`): Account (delete/sign-out,
subscription), Profile (name, diet preference), Coaching (calmer mode,
steps/cardio toggles, cycle tracking), Notifications, Display &
accessibility (higher contrast, colour-blind-safe palette, larger text
1.2×, reduce motion — all wired through `applyAccessibility`,
`theme.js:170`), Health (connect/disconnect, consent withdrawal), Your
data (export, import from Strong/Hevy CSV via `importExternal.js`,
backup), Privacy & legal, Help & about (rate app, feedback with
logs-attach, credits), plus Debug log.

### 3.11 Data model (local SQLite mirrored to Supabase, 71 migrations)

Domains (`DATABASE_SCHEMA_LOCKED.md` + `database.js`, 5,984 lines):
identity/profiles, exercises (canonical deterministic-ID seed ~449 +
custom), programmes/routines/routine_exercises, workouts/workout_sets
(set types, unilateral, RIR), mesocycles/mesocycle_weeks/planned muscle
volume, morning_weights, body composition log, weekly_checkins, coach
outputs (JSON), food domain (foods, custom_foods, food_entries, rollups,
water, saved meals, recipes, frequents, preferences), daily_steps,
cardio_log, ed_pattern_flags, notification prefs, tier_history,
telemetry allowlist, sync queue/watermarks. Sync runs through a
registry/transport layer with LWW conflict policy, push-then-pull,
fire-and-forget with retry queue (`lib/sync/`).

### 3.12 Design system (`styles/theme.js` — full token read)

- Dark-only. Background #0D0D0D (not pure black, astigmatism
  rationale), 4-step surface elevation ladder with warm pull, amber
  primary #F5A623 (+ deepened #E08C0B for fills), WCAG-documented
  contrast for every text token.
- Type scale: micro 10 / xs 11 / sm 13 / md 16 (body) / lg 17 / xl 20 /
  xxl 24 / xxxl 32 / display 40; semantic roles (display…caption);
  tabular numerals helper `type.num()` ("numerals are the hero").
- Spacing 1/2/4/6/8/12/16/24/32/48; radius 4–20+full; iconSize 16–32;
  `hitSlop` 12 default; shadows sm/md/lg; motion tokens (M3 curves,
  120/200/320/220/440 ms, spring) with Reduce Motion respected.
- Accessibility palette swaps: higher contrast, Okabe-Ito
  colour-blind-safe success/error, 1.2× larger text — applied at boot
  before StyleSheets build.
- Components: Button, Card/PressableCard/GradientCard, Chip, Dropdown,
  BottomSheet, SegmentedControl, Stepper, Skeleton, Sparkline,
  SvgLineChart/SvgBarSparkline (Skia available), Toast, AppAlert,
  EmptyState, InfoTooltip, ScreenHeader, BackHeader, PeekMenu,
  AnimatedEntrance, PRCelebration, FeedbackSheet, Illustrations.

### 3.13 Observability & quality

Sentry (PII-scrubbed, `sentryScrub.js`), structured error log +
DebugLog screen, audit breadcrumbs (`observability.js`), allowlisted
engine telemetry (no PII), 200+ test files including engine
invariants, fuzz tests, contract tests for webhooks/sync, screen-mount
tests, voice snapshot tests, schema-drift tests.

---

## 4. Screen-by-screen visual & usability audit (condensed)

Conventions: tokens from `theme.js` — xs=11, sm=13, md=16, lg=17,
xl=20, xxl=24. "TT" = touch target. Screens render in a single dark
theme; all screens use SafeArea + consistent ScreenHeader (display-size
title) except modals.

| Screen | Hierarchy & density | Assessment |
|---|---|---|
| **Home (Train)** | Greeting header → schedule line → (1 of 3 prioritised banners) → morning-weight inline-input card (Pro) → steps line → cardio line → hero "next workout" card (eyebrow 11, name 24 black, meso chip 11, coach brief, Start CTA + View, 2 secondary pills) → last-session card → nudges | Generally clean; banner-priority system caps noise at 1. Weakness: 3 stacked utility cards (weight/steps/cardio) push the hero card down ~150pt before the primary action; on a 5.4" phone "Start workout" can sit near the fold. Weight input TT good; Log button text 11 is small. |
| **ActiveWorkout** | See deep-audit doc | Flagged: chip soup above inputs, 11px coaching context, 5-button action row, logged sets below the fold. |
| **WorkoutSummary** | Hero stats, PR list, 7 RatingRows (1-5 chips), next-time note input | 7 subjective ratings post-session is heavy; competitors ask 0–1. Data is genuinely consumed (adaptive engine) but the cost is real. |
| **Diary** | Header → day pager → MacroRings (tappable) → meal cards → water → scan FAB | Clean, modern, matches category leaders structurally. Multi-select toolbar is desktop-grade. 56pt FAB good. |
| **FoodSearch** | 5 browse tabs + debounced search + serving sheet | Strong pattern (Recents/Suggested/Favourites/Frequents/Custom). |
| **Analytics (Progress)** | For-you insights → recent sessions → volume strip → cardio → PR sparkline → Explore tiles | Hub-not-wall philosophy works; insight stack is a differentiator. |
| **VolumeHeatmap** | Body diagram + per-muscle bars vs landmarks, window toggle, editable landmarks | Power feature; jargon-free labels. |
| **LiftProgress / ExerciseDetail** | Standing → lift list → charts/PRs/goals | Solid; no visual exercise demos anywhere (text tips only, 169 entries `formTips.js`). |
| **WeeklyCheckIn** | 4-step wizard, step dots, derived pre-answers with "from your diary" notes | Best-in-class transparency; gates (wrong day / too soon / need weights) are honest but add friction vs competitors with always-open reviews. |
| **CoachOutput** | Headline → trend chips → What's working → Nutrition/Training next week (Apply rows) → why → held decisions + history | The held-decisions card is a genuine differentiator; screen is long (2,099 lines) but sectioned. |
| **PlanLibrary/PlanDetail** | Collections chips → plan cards → division pickers; PlanDetail has whyThis ordered reveal | Reveal exists for generated plans; library plans lighter. |
| **Welcome/Login/Onboarding** | Animated wordmark, tier bullets, 5-step Pro wizard with progress bar | Wizard asks ~15 inputs before plan reveal; reveal pays it off. Step 1 (account) before any value shown is the highest-risk drop-off point. |
| **Paywall/CascadeGate** | Single-decision modal, tier strip, localised prices, period toggle with savings badge | Contextual triggers (differential) are unusual and good; no testimonials/social proof. |
| **YearOfLifts** | Full-screen story cards, tap/swipe advance | Premium feel; locked for 365 days (long wait for a delight feature). |
| **Settings** | Hub + focused sub-pages, SettingsPrimitives rows | Tidy; accessibility options ahead of category norms. |

Small-phone (5.4") risk list: ActiveWorkout chip stack + logged sets
below fold; Home hero below 3 utility cards; WorkoutSummary rating wall;
CoachOutput length. Large-phone (6.7"): no issues — content scales by
adding visible rows, max-width not constrained but cards are full-bleed
with 16pt padding which reads fine.

---

## 5. Known gaps surfaced by this read (input to Phase 3/4)

1. **No exercise media at all** — no video, no animation, no images;
   technique guidance is 169 text tips + a generic fallback paragraph.
2. **No plate calculator in session** despite the component existing.
3. **Workout screen density** — detailed in the companion doc.
4. **No social/accountability surface of any kind** (by design so far).
5. **Rest-timer lock-screen Live Activity built but disabled**; iOS
   Live Activity module exists in-tree (`modules/rest-timer-live`).
6. **No widgets** (iOS/Android home-screen).
7. **Charts are static SVG polylines** (`SvgLineChart`), no scrub/zoom
   interactions; Skia is installed but barely used.
8. **Year of Lifts locked 365 days**; no shorter-horizon recap
   (month/quarter).
9. **Onboarding asks for account at step 1** before showing value.
10. **7-question post-workout survey** is the heaviest in the category.
11. **No food photo logging / AI estimation** (deliberate: no-AI rule).
12. **Free→Pro teaser surfaces are modest** (one Home teaser card +
    differential badges).
13. **No HR/watch live session integration**; no watch app.
14. **Exercise history in-session is one chip deep** — "Last time"
    shows only the matching set index; no inline sparkline or full
    history sheet from the logging card (full history requires leaving
    to ExerciseDetail).

---

*Phase 2 agents: treat sections 3–5 as the authoritative current
state. Where a competitor comparison contradicts this file, re-read the
cited source before claiming a gap.*
