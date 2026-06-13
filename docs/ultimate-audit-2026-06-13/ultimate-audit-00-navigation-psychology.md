# Ultimate Audit 00 — Navigation & Psychology (Phase 1)

READ-ONLY inventory. Zero fabrication: every claim cites `file:line`. Where the
code does not determine something, it is marked **NOT DETERMINED IN CODE**.
Source of truth: `src/navigation/RootNavigator.js` (read in full), plus the nav
helper `src/lib/notifications/notificationRoute.js`, the guard
`src/components/ProGate.js`, and `src/styles/theme.js` for token values.

British English throughout.

---

## 0. Top-level routing (which navigator renders)

`renderNavigator()` chooses the root tree (`RootNavigator.js:1107`):

- `!user` → `WelcomeStack` (`RootNavigator.js:1117`)
- signed-in, first-run not done, consent not yet checked → `SplashScreen` (blocking resolver) (`RootNavigator.js:1131-1133`)
- consent checked AND `healthConsent === false` → `Article9ConsentStack` (`RootNavigator.js:1134-1136`)
- `!firstRunComplete` → `tier === 'pro' ? ProOnboardingStack : FirstRunStack` (`RootNavigator.js:1137-1139`)
- both done → `MainTabs` (`RootNavigator.js:1140`)

Cold-launch splash gate: shown until `splashReady && firstRunChecked && tierChecked` (`RootNavigator.js:1078-1080`). `SPLASH_MIN_MS = 1600` (`RootNavigator.js:518`).

---

## 1. COMPLETE NAVIGATION MAP (every navigator, screen, modal)

Tab navigator created at `RootNavigator.js:110`; stack navigator at `:111`.
"(modal)" = `presentation: 'modal'`. "GATED" = wrapped in `withProGuard`.
headerShown=false unless a `title` is noted.

```
RootNavigator (NavigationContainer, RootNavigator.js:1143)
│
├─ WelcomeStack  (RootNavigator.js:454)            [shown when !user]
│  ├─ Welcome           WelcomeScreen        (:457)
│  ├─ QuizTraining      QuizScreen           (:460)   COMP-030 quiz-first; only reached if ONBOARDING_QUIZ_FIRST on + Pro picked (:458-459)
│  ├─ PlanPreview       PlanPreviewScreen    (:461)
│  └─ Login             LoginScreen          (:462)
│
├─ Article9ConsentStack (RootNavigator.js:487)     [signed-in, healthConsent===false]
│  ├─ Article9Consent   Article9ConsentScreen (:490)
│  └─ PrivacyPolicy     PrivacyPolicyScreen   (:494)
│
├─ FirstRunStack  (RootNavigator.js:467)           [free, first-run not done]
│  ├─ FirstRunBranch    FirstRunScreen        (:470)
│  ├─ FreeStarter       FreeStarterScreen     (:475)
│  ├─ PlanLibrary       PlanLibraryScreen     (:476)  title 'Plan Library'
│  ├─ PlanDetail        PlanDetailScreen      (:477)  title 'Plan'
│  └─ ActiveWorkout     ActiveWorkoutScreen   (:478)  heroZoom
│
├─ ProOnboardingStack (RootNavigator.js:499)       [pro, first-run not done]
│  ├─ ProOnboarding     ProOnboardingScreen   (:502)
│  ├─ PlanLibrary       PlanLibraryScreen     (:503)  title 'Plan Library'
│  ├─ PlanDetail        PlanDetailScreen      (:504)  title 'Plan'
│  ├─ ActiveWorkout     ActiveWorkoutScreen   (:505)  heroZoom
│  ├─ ProSetupComplete  ProSetupCompleteScreen (:506)
│  ├─ NutritionEducation NutritionEducationScreen (:509)
│  └─ GoalLockConsent   GoalLockConsentScreen (:513)  title 'Goal lock'
│
└─ MainTabs (Tab.Navigator, RootNavigator.js:412)  [both done; lazy={false} :419]
   │   tabBar icons set at :433-442; labels fontSize.xs (:432)
   │
   ├─ HomeTab  title 'Train'  (:445)  → HomeStack (:285)
   │  ├─ Home            HomeScreen            (:293)
   │  ├─ BuildWorkout    BuildWorkoutScreen    (:294)
   │  ├─ ActiveWorkout   ActiveWorkoutScreen   (:295)  heroZoom
   │  ├─ WorkoutSummary  WorkoutSummaryScreen  (:296)  title 'Session Complete', heroZoom
   │  ├─ WorkoutHistory  WorkoutHistoryScreen  (:297)  title 'Workout History'
   │  ├─ VolumeHeatmap   VolumeHeatmapScreen   (:298)  title 'Volume'
   │  ├─ ShareCard       ShareCardScreen       (:299)  title 'Share Card'
   │  ├─ CoachReview     CoachReviewScreen     (:300)  title 'Weekly Review'
   │  ├─ LogCardio       GatedLogCardio        (:303)  GATED (modal)
   │  ├─ ProUpgrade      ProUpgradeScreen      (:304)  (modal)
   │  └─ FreeStarter     FreeStarterScreen     (:306)
   │
   ├─ PlansTab title 'Plans'  (:446)  → PlansStack (:311)
   │  ├─ Plans           PlansScreen           (:319)
   │  ├─ PlanUpdate      GatedPlanUpdate       (:320)  GATED
   │  ├─ PlanDetail      PlanDetailScreen      (:321)  title 'Plan'
   │  ├─ RoutineDetail   RoutineDetailScreen   (:322)  title 'Edit Workout'
   │  ├─ ExerciseDetail  ExerciseDetailScreen  (:323)  title 'Exercise'
   │  ├─ ManualBuilder   ManualBuilderScreen   (:324)
   │  ├─ PlanLibrary     PlanLibraryScreen     (:325)  title 'Plan Library'
   │  ├─ MesocycleBuilder MesocycleBuilderScreen (:326) title 'Training Blocks'
   │  ├─ ProUpgrade      ProUpgradeScreen      (:327)  (modal)
   │  └─ FreeStarter     FreeStarterScreen     (:329)
   │
   ├─ DiaryTab title 'Diary'  (:447)  → DiaryStack (:217)
   │  ├─ Diary           GatedDiary            (:225)  GATED (gating the root covers food sub-screens, :156-159)
   │  ├─ MealPlan        MealPlanScreen        (:226)
   │  ├─ FoodSearch      FoodSearchScreen      (:231)  (modal)
   │  ├─ AddCustomFood   AddCustomFoodScreen   (:236)  (modal)
   │  ├─ ScanBarcode     ScanBarcodeScreen     (:241)  (modal)
   │  ├─ ScanLabel       ScanLabelScreen       (:246)  (modal)
   │  ├─ LogCardio       GatedLogCardio        (:251)  GATED (modal)
   │  ├─ CardioHistory   GatedCardioHistory    (:256)  GATED
   │  ├─ FoodInsights    FoodInsightsScreen    (:261)
   │  ├─ MyRecipes       MyRecipesScreen       (:266)  (modal)
   │  ├─ MyMeals         MyMealsScreen         (:271)  (modal)
   │  └─ RecipeBuilder   RecipeBuilderScreen   (:276)  (modal)
   │
   ├─ ProgressTab title 'Progress'  (:448)  → ProgressStack (:334)
   │  ├─ Analytics       AnalyticsScreen       (:342)
   │  ├─ WorkoutHistory  WorkoutHistoryScreen  (:343)  title 'Workout History'
   │  ├─ WorkoutSummary  WorkoutSummaryScreen  (:344)  title 'Session Complete', heroZoom
   │  ├─ VolumeHeatmap   VolumeHeatmapScreen   (:345)  title 'Volume Heatmap'
   │  ├─ CoachReview     CoachReviewScreen     (:346)  title 'Weekly Review'
   │  ├─ BodyMetrics     GatedBodyMetrics      (:347)  GATED, title 'Body Metrics'
   │  ├─ LiftProgress    LiftProgressScreen    (:348)  title 'Lifts'
   │  ├─ Consistency     ConsistencyScreen     (:349)  title 'Consistency'
   │  ├─ Partner         PartnerScreen         (:350)  title 'Training partner'
   │  ├─ ExerciseDetail  ExerciseDetailScreen  (:351)  title 'Exercise'
   │  ├─ YearOfLifts     YearOfLiftsScreen     (:352)
   │  ├─ RecapStory      YearOfLiftsScreen     (:353)  (same component, alias route)
   │  ├─ ShareCard       ShareCardScreen       (:354)  title 'Share Card'
   │  ├─ LogCardio       GatedLogCardio        (:357)  GATED (modal)
   │  ├─ CardioHistory   GatedCardioHistory    (:358)  GATED
   │  └─ ProUpgrade      ProUpgradeScreen      (:359)  (modal)
   │
   └─ ProfileTab title 'You'  (:449)  → ProfileStack (:364)
      ├─ You              YouScreen            (:372)
      ├─ Settings         SettingsScreen       (:373)  title 'Settings'
      ├─ SettingsAccount  SettingsAccountScreen (:374) title 'Account'
      ├─ SettingsProfile  SettingsProfileScreen (:375) title 'Profile'
      ├─ SettingsCoaching SettingsCoachingScreen (:376) title 'Coaching'
      ├─ SettingsNotifications SettingsNotificationsScreen (:377) title 'Notifications'
      ├─ SettingsDisplay  SettingsDisplayScreen (:378) title 'Display & accessibility'
      ├─ SettingsHealth   SettingsHealthScreen (:379)  title 'Health'
      ├─ SettingsData     SettingsDataScreen   (:380)  title 'Your data'
      ├─ Snapshots        SnapshotsScreen      (:381)  title 'Restore a snapshot'
      ├─ SettingsPrivacy  SettingsPrivacyScreen (:382) title 'Privacy & legal'
      ├─ SettingsAbout    SettingsAboutScreen  (:383)  title 'Help & about'
      ├─ NutritionTargets GatedNutritionTargets (:384) GATED, title 'Nutrition Targets'
      ├─ NutritionEducation NutritionEducationScreen (:385)
      ├─ BodyMetrics      GatedBodyMetrics     (:386)  GATED, title 'Body Metrics'
      ├─ WeeklyCheckIn    GatedWeeklyCheckIn   (:387)  GATED
      ├─ CoachOutput      GatedCoachOutput     (:388)  GATED, title 'Precision Coaching™'
      ├─ Methodology      MethodologyScreen    (:389)  title 'How Precision Coaching works'
      ├─ ShareCard        ShareCardScreen      (:390)  title 'Share Card'
      ├─ CoachHeldHistory CoachHeldHistoryScreen (:391)
      ├─ BlockReflection  BlockReflectionScreen (:392)
      ├─ ProGoalSetup     GatedProGoalSetup    (:393)  GATED
      ├─ GoalChangeSummary GoalChangeSummaryScreen (:394)
      ├─ GoalLockConsent  GoalLockConsentScreen (:395)  title 'Goal lock'
      ├─ NotificationSettings NotificationSettingsScreen (:396) title 'Notifications'
      ├─ Import           ImportScreen         (:397)  title 'Import history'
      ├─ CoachingReminders GatedCoachingReminders (:398) GATED, title 'Coaching reminders'
      ├─ WellbeingCheck   WellbeingCheckScreen (:399)  title 'Wellbeing check'
      ├─ PrivacyPolicy    PrivacyPolicyScreen  (:400)
      ├─ DebugLog         DebugLogScreen       (:401)
      ├─ SubscriptionPolicy SubscriptionPolicyScreen (:402)
      ├─ Subscription     SubscriptionScreen   (:403)
      ├─ CascadeGate      CascadeGateScreen    (:404)  (modal)
      ├─ Paywall          PaywallScreen        (:405)  (modal)
      ├─ Credits          CreditsScreen        (:406)
      └─ ProUpgrade       ProUpgradeScreen     (:407)  (modal)
```

### Gated screens (the only `withProGuard` wrappers; `RootNavigator.js:149-162`)
- `GatedWeeklyCheckIn` (:149), `GatedNutritionTargets` (:150), `GatedBodyMetrics` (:151), `GatedCoachOutput` (:152), `GatedProGoalSetup` (:153), `GatedPlanUpdate` (:154), `GatedCoachingReminders` (:155), `GatedDiary` (:160), `GatedLogCardio` (:161), `GatedCardioHistory` (:162).
- Guard mechanism: `withProGuard(Component, feature)` renders `ProLocked` when `tier !== 'pro'` (`ProGate.js:134-139`); `ProLocked` (`ProGate.js:91`) shows a Pro held-seat with an "Upgrade to Pro" → `navigate('ProUpgrade')` (`ProGate.js:115`). The Food-diary lock additionally shows `TodaysPlateTeaser` (`ProGate.js:96,100`).
- **Tab-bar icons are NOT gated**: DiaryTab is always visible to free users (`RootNavigator.js:447`); the gate fires on the Diary root screen, not on tab visibility.

### Notification deep-link routing (`RootNavigator.js:573-589`, helper `notificationRoute.js:20`)
A tapped notification routes via `routeForNotificationType(type)` then `navigationRef.navigate(target.tab, { screen, params })`:
- `weekly_checkin` → ProfileTab/WeeklyCheckIn (`notificationRoute.js:22-23`)
- `year_of_lifts_unlock` → ProgressTab/YearOfLifts (`:24-25`)
- `monthly_recap` → ProgressTab/Analytics (`:26-30`)
- `cascade_gate` → ProfileTab/CascadeGate `{variant:'day14'}` (`:31-34`)
- `weekly_coach_ready` → ProfileTab/CoachOutput (`:35-38`)
- `winback` → ProfileTab/Subscription `{fromWinback:true}` (`:39-44`)
- `partner_cheer` → ProgressTab/Consistency (`:45-48`)
- `checkin_missed` → ProgressTab/Analytics (followup) or ProfileTab/WeeklyCheckIn (`:49-57`)
- `trial_day3` → HomeTab (S3) or ProfileTab/WeeklyCheckIn (`:58-65`)

---

## 2. Major feature areas — is each in the right place?

| Feature | Lives in | Right place? |
|---|---|---|
| Logging today's session | HomeTab/Home → ActiveWorkout (`:293,295`) | Yes — primary action on the landing tab. |
| Build a quick workout | HomeTab/BuildWorkout (`:294`) | Reasonable, but ManualBuilder (a *similar* builder) lives in PlansTab (`:324`) — two builders split across two tabs. |
| Plans / Plan Library / Mesocycle | PlansTab (`:319,325,326`) | Yes — coherent. |
| Food diary, search, scan, meal plan, recipes, meals | DiaryTab (`:225-276`) | Yes — single Pro domain, gated at root (`:156-159`). |
| Cardio (LogCardio / CardioHistory) | Registered in **three** stacks: HomeStack (`:303`), DiaryStack (`:251,256`), ProgressStack (`:357,358`) | Deliberate (comments `:301-302,355-356`) so save/back returns to the originating tab. Functional, but cardio has no single home — discoverability depends on which card the user tapped. |
| Analytics / Lifts / Consistency / Body Metrics / Volume / Year of Lifts / Recaps | ProgressTab (`:342-358`) | Yes — coherent analytics hub. |
| Body Metrics | Registered in **both** ProgressStack (`:347`) and ProfileStack (`:386`) | Duplicated entry points; both GATED. |
| Coaching (CheckIn, CoachOutput, Methodology, Held history, Reminders, Goal setup) | ProfileTab (You) (`:387-398`) | Coaching is buried under the "You"/profile tab rather than surfaced as its own destination — see §7. |
| Nutrition Targets | ProfileTab (`:384`) — *not* DiaryTab | Mismatch: nutrition targets are a food/Diary concept but live in the You tab; Home links cross-tab to it (`HomeScreen.js:987`). |
| Settings (9 sub-screens) | ProfileTab (`:373-383`) | Yes. |
| Billing / Subscription / Paywall / CascadeGate / Credits | ProfileTab (`:403-407`) | Yes (account domain). |
| WorkoutSummary / WorkoutHistory / VolumeHeatmap / ShareCard / CoachReview | Registered in **both** HomeStack and ProgressStack (`:296-300` and `:343-354`) | Intentional duplication so each tab is self-contained; increases the route surface. |

---

## 3. Buried / unreachable registered screens

Method: counted `navigate('X')` callsites across `src` (excluding `__tests__`).

- **`GoalChangeSummary`** (`:394`) — 0 `navigate()` callsites. Reached only via `navigation.replace('GoalChangeSummary', …)` from `ProGoalSetupScreen.js:303`. Not unreachable, but reached by `replace`, not `navigate` (so it cannot be returned to with back).
- **`CascadeGate`** (`:404`) — 0 in-app `navigate()` callsites. Reachable only via the `cascade_gate` notification tap (`notificationRoute.js:31-34`). With notifications disabled/denied this screen is effectively unreachable in-app. **NOT DETERMINED IN CODE** whether any other surface opens it.
- **`DebugLog`** (`:401`) — reached only by a long-press on the version row (`SettingsAboutScreen.js:76`). Intentionally hidden (developer affordance).
- **`RecapStory`** (`:353`) — alias route to `YearOfLiftsScreen`; reached via `navigate('RecapStory', …)` from Analytics/WorkoutSummary/BlockReflection (`AnalyticsScreen.js:215,370`, `WorkoutSummaryScreen.js:969`, `BlockReflectionScreen.js:100`). Registered in ProgressStack only, but `BlockReflection`/`WorkoutSummary` in ProfileStack/HomeStack also call it — **cross-stack reachability of `RecapStory` from those stacks is NOT DETERMINED IN CODE** (no `RecapStory` route is registered in HomeStack or ProfileStack).
- `FreeStarter` is registered three times (HomeStack `:306`, PlansStack `:329`, FirstRunStack `:475`) — reachable; not buried.
- All other registered screens have at least one `navigate()` callsite.

---

## 4. Cross-tab jumps (navigate calls that switch tab)

Each below changes the active bottom tab (via `navigate('<Tab>', {screen})` or `getParent()?.navigate('<Tab>')`):

- `HomeScreen.js:127` → ProfileTab (params) ; `:987` → ProfileTab/NutritionTargets ; `:1046` → ProfileTab/WeeklyCheckIn ; `:1266` → PlansTab ; `:1356` → PlansTab/PlanLibrary ; `:1436` → ProgressTab/Analytics (focusWeightTrend) ; `:1550` → ProfileTab/WeeklyCheckIn.
- `PlansScreen.js:240` and `:349` → HomeTab/ActiveWorkout.
- `RoutineDetailScreen.js:251` → HomeTab/BuildWorkout ; `:266` → HomeTab/ActiveWorkout.
- `PlanDetailScreen.js:139` → HomeTab/ActiveWorkout.
- `ConsistencyScreen.js:98` → PlansTab/MesocycleBuilder ; `:99` → PlansTab/PlanLibrary.
- `CoachOutputScreen.js:1675` → DiaryTab/MealPlan.
- `FreeStarterScreen.js:100` → PlansTab/PlanLibrary.
- `ManualBuilderScreen.js:331` → PlansTab ; `:538` → HomeTab.
- `WorkoutHistoryScreen.js:117` → HomeTab/ActiveWorkout ; `:137` → PlansTab.

Observation: starting a workout from a plan always cross-jumps to HomeTab/ActiveWorkout (`PlansScreen.js:240,349`, `PlanDetailScreen.js:139`, `RoutineDetailScreen.js:266`), so the workout always "lives" in the Train tab regardless of entry point. Coaching/nutrition affordances on Home cross-jump into ProfileTab (4 sites), reinforcing that the coaching domain is split from the tab it is launched from.

Tab-press resets each stack to its top (`popToTop()` on `tabPress`, `RootNavigator.js:218-222, 286-290, 312-316, 335-339, 365-369`), so a cross-tab jump followed by re-tapping that tab returns to its root.

---

## 5. Day 1 / 3 / 7 / 30 — grounded only in code gates/unlocks

**Day 1 (new user).** Routing: a brand-new signed-in account hits the Article 9 consent gate first (`RootNavigator.js:1134-1136`); the comment states the Article 9 step is where `start_cascade` grants the 14-day Pro trial, setting `tier='pro'` (`RootNavigator.js:1100-1103`). After consent: Pro path → `ProOnboardingStack` (`:1138`); free path → `FirstRunStack` (`:1138`). FirstRun offers the `FreeStarter` micro-quiz that "install + activate a difficulty-0 starter plan" so the user "lands on Home with today's session already answered" (`RootNavigator.js:472-475`). So Day-1 visible surface = Welcome→consent→onboarding→MainTabs with a pre-seeded session.

**Day 3.** A `trial_day3` notification is routed (`notificationRoute.js:58-65`): variant S1/S2 → WeeklyCheckIn, variant S3 (no sessions yet) → HomeTab. The comment (`:58-62`) describes it as the "COMP-023 day-3 value moment". The exact scheduling/trigger conditions for this notification live in the scheduler, not in the files read — **scheduler timing NOT DETERMINED IN CODE here** (helper only maps type→route).

**Day 7.** No 7-day gate is present in the files read. The monthly-recap "ephemeral card" shows "for the first 7 days of the month" (`AnalyticsScreen.js:141-142`) — but that is a calendar-month window, not a day-7-of-tenure unlock. **A day-7-of-tenure milestone is NOT DETERMINED IN CODE.**

**Day 30.** No 30-day tenure gate is in the read files. The `winback` notification is a "+30-day win-back" *after a lapse* (`notificationRoute.js:39-44`), not a Day-30-of-tenure event. The 14-day in-app trial ending (`cascade.js:355` "only the end of the 14-day in-app trial transitions to free"; `cascade_gate` notification → CascadeGate `variant:'day14'`, `notificationRoute.js:31-34`) is the salient ~day-14 event, not day-30. **A day-30 tenure milestone is NOT DETERMINED IN CODE.**

**Recap unlocks (tenure-like gates that ARE in code):**
- Monthly recap unlocks at `RECAP_GATE = 10` logged sessions (`AnalyticsScreen.js:352`); locked tile messages "unlocks after 10 logged sessions" (`AnalyticsScreen.js:363-366`).
- Year of Lifts unlocks at `YEAR_MS = 365 * 86400000` of history (`AnalyticsScreen.js:377`), i.e. earliest workout ≥ 365 days ago (`:378`).

---

## 6. Cognitive load per tab (distinct things each landing screen shows)

Counts below are of distinct interactive/navigational affordances on each tab's **landing** screen, derived from that screen's `navigate()`/handler call sites (not a full visual render — element-level detail is the Phase-1 per-screen brief's job).

- **HomeTab → HomeScreen**: at least 11 distinct destinations/actions — ActiveWorkout start (`HomeScreen.js:821,855,1148`), CoachOutput (`:1008`), CoachReview (`:1071`), WeeklyCheckIn cross-jump (`:1046,1550`), NutritionTargets cross-jump (`:987`), weight-trend cross-jump (`:1436`), LogCardio (`:1435`), ProUpgrade (`:1114,1445`), PlanLibrary cross-jump (`:1356`), BuildWorkout (`:1292`), FreeStarter (`:1350`), WorkoutHistory (`:1472`), PlansTab plan card (`:1266`). **High density** — Home mixes training, coaching, nutrition, cardio and upsell. (Several are conditional cards; **exact simultaneous count depends on state — NOT DETERMINED IN CODE**.)
- **PlansTab → PlansScreen**: ~6 distinct — active-plan detail (`:547`), FreeStarter (`:574`), PlanLibrary (`:580`), plan cards (`:603,627,673,697`), RoutineDetail edit (`:323`), MesocycleBuilder (`:759`), start ActiveWorkout (`:240,349`). Moderate, single-domain.
- **DiaryTab → DiaryScreen** (Pro; free sees `ProLocked`): ~5 distinct — add food per slot (`DiaryScreen.js:229`), FoodInsights (`:530`), MealPlan (`:582`), ScanBarcode (`:650`), privacy/OFF card (`:567`). Single-domain.
- **ProgressTab → AnalyticsScreen**: ~10 distinct — recap card (`:215`), WorkoutHistory (`:263,345`), VolumeHeatmap (`:288`), LogCardio (`:300`), CardioHistory (`:301`), Consistency tile (`:332`), Lifts tile (`:333`), Body Metrics tile (`:340`), Partner tile (`:344`), Full History tile (`:345`), RecapStory (`:370`), YearOfLifts (`:385`). **High density** — analytics hub with a tile grid.
- **ProfileTab → YouScreen**: ~9 distinct — ProUpgrade (`:109`), WeeklyCheckIn (`:122`), CoachOutput (`:128`), ProGoalSetup (`:134`), NutritionTargets (`:140`), GoalLockConsent edit (`:146`), Methodology (`:163`), WellbeingCheck (`:176`), Settings (`:183`). **High density** — the "You" tab carries the entire coaching + nutrition + settings entry surface.

Densest landings: Home and Progress and You. Lightest: Diary.

---

## 7. Newbie features hidden behind athlete/competitor concepts

Examples where first-timer-relevant functionality sits behind advanced terminology, cited:

- **"Precision Coaching™" / CoachOutput** (`RootNavigator.js:388`, You row `YouScreen.js:128`): the weekly guidance a beginner most needs is labelled with a trademarked competitor term and buried in the You tab rather than surfaced on Home.
- **"Training Blocks" / MesocycleBuilder** (`RootNavigator.js:326`, opened from Consistency `ConsistencyScreen.js:98` and Plans `:759`): "Mesocycle" is a competition-periodisation concept; a newbie wanting "a plan that changes over time" must recognise the term.
- **"Volume" / VolumeHeatmap** (`RootNavigator.js:298,345`) and the volume-status grammar (theme `volumeColors`/`volumeStatusColors`, `theme.js:469-492` with MAV/MRV bands, `:485-492`): MAV/MRV are advanced hypertrophy concepts; the heatmap is a top-level Progress tile (`AnalyticsScreen.js:288`).
- **"Goal lock" / GoalLockConsent** (`RootNavigator.js:395,513`; fired from ProOnboarding step 3 on a "competition-tier goal" `:510-513`): a consent gate framed around competition goals sits in the new-user onboarding path.
- **"Block reflection" / RecapStory variant 'block'** (`RootNavigator.js:392`, `WorkoutSummaryScreen.js:969`): "block" reflection assumes the user thinks in training blocks.
- **Body Metrics gated + competitor-oriented** (`RootNavigator.js:347,386`): a basic "track my weight" expectation is Pro-gated (`GatedBodyMetrics`) and duplicated across two tabs.

Counterweight (newbie-friendly affordances present in code): the `FreeStarter` "three plain questions" difficulty-0 on-ramp (`RootNavigator.js:472-475`) and Home's pre-answered "today's session" hero, which deliberately shield beginners from the above on Day 1.

---

## Items marked NOT DETERMINED IN CODE
- Day-7-of-tenure and Day-30-of-tenure milestones (no such gate in the files read).
- `trial_day3` notification scheduling/trigger conditions (scheduler not read; only the type→route helper).
- Whether any in-app surface (besides the `cascade_gate` notification) opens `CascadeGate`.
- Cross-stack reachability of `RecapStory` from HomeStack/ProfileStack (route only registered in ProgressStack).
- Exact simultaneous on-screen affordance counts on Home/Progress/You (many cards are state-conditional).
