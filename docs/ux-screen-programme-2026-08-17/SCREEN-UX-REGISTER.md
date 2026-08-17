# VOLYUME — SCREEN UX REGISTER

**Created:** 2026-08-17 (Campaign 23 Phase 1, Step 25)

This is the permanent whole-app screen review register (founder order,
Campaign 23, 2026-08-17). SCREEN EXISTS != SCREEN IS GOOD. A screen
passes only when ALL of these hold (the Global Screen Completion Law,
verbatim):
1. the information is correct
2. the ordering makes sense
3. the user understands its purpose
4. the visual hierarchy reflects importance
5. actions belong where they are shown
6. another system is not already responsible for the same decision
7. the screen is calm enough to use

"It works", "it looks nice" and "it is logically correct" are each
insufficient on their own.

Status updates happen at every screen campaign landing. Status key:
- **UNREVIEWED** — not yet audited
- **IN_AUDIT** — audit campaign currently running
- **AUDITED** — audit complete, spec pending or in founder review
- **SPEC_LOCKED** — redesign spec locked, ready to build
- **IMPLEMENTED** — redesign landed on main
- **DEVICE_VALIDATED** — founder has walked the redesigned screen on a
  physical device and confirmed it

---

## CORE TABS

| SCREEN_ID | USER-FACING NAME | PRODUCTION ROUTE | SOURCE FILE | ENTRY POINTS | TIER | PRIMARY JOB | STATUS |
|---|---|---|---|---|---|---|---|
| `HomeTab` | Today | MainTabs root | `src/screens/HomeScreen.js` | Initial tab on app load | Both | Tab root — displays today's session, coaching brief, and progress signals | IMPLEMENTED |
| `PlansTab` | Train | MainTabs root | `src/screens/PlansScreen.js` | Tab navigation | Both | Tab root — user's active training programme and library browser | UNREVIEWED |
| `DiaryTab` | Nutrition | MainTabs root (gated) | `src/screens/DiaryScreen.js` | Tab navigation | Pro | Tab root — food diary entry point with meal sections and macro tracking (gated; readOnly for free) | UNREVIEWED |
| `ProgressTab` | Progress | MainTabs root | `src/screens/AnalyticsScreen.js` | Tab navigation | Both | Tab root — training analytics, volume trends, and lifetime tonnage | AUDITED |
| `ProfileTab` | Coach | MainTabs root | `src/screens/YouScreen.js` | Tab navigation | Both | Tab root — athlete profile, coaching hub, and settings | UNREVIEWED |

---

## TRAINING FLOWS

| SCREEN_ID | USER-FACING NAME | PRODUCTION ROUTE | SOURCE FILE | ENTRY POINTS | TIER | PRIMARY JOB | STATUS | NOTES |
|---|---|---|---|---|---|---|---|---|
| `Home` | Today | HomeTab > Home | `src/screens/HomeScreen.js` | HomeTab (root) | Both | Displays today's session, coaching brief, recovery state, and progress signals | IMPLEMENTED | Campaign 22 redesign landed on main 2026-08-17; founder device validation PENDING (15-step checklist in docs/home-today-ux-campaign-22-2026-08-16/PHASE2-LANDING.md) |
| `BuildWorkout` | Blank Session | HomeTab > BuildWorkout | `src/screens/BuildWorkoutScreen.js` | HomeScreen "Build" button | Both | Workout builder — add exercises and set schema to structure a session manually | UNREVIEWED | Free feature; no plan required |
| `ActiveWorkout` | Live Workout | HomeTab/PlansTab > ActiveWorkout | `src/screens/ActiveWorkoutScreen.js` | HomeScreen continue/next, PlanDetailScreen, RoutineDetailScreen | Both | Live workout timer, exercise logging, set/rep entry, and rest tracking during active session | UNREVIEWED | Hero-zoom transition from cards; session state persisted locally. Campaign 20 rebuilt its prescription logic (landed on main); the founder device retest of that flow is still outstanding, and the screen has not had a UX-programme audit — logic landing is not screen completion |
| `WorkoutSummary` | Session Complete | HomeTab/PlansTab/ProgressTab > WorkoutSummary | `src/screens/WorkoutSummaryScreen.js` | ActiveWorkoutScreen finish action, HomeScreen history tap | Both | Post-workout feedback form — tonnage reflection, performance feel, injury/soreness notes | UNREVIEWED | Hero-zoom transition; optional coach reflection prompt if Pro |
| `WorkoutHistory` | Workout History | HomeTab/ProgressTab > WorkoutHistory | `src/screens/WorkoutHistoryScreen.js` | HomeScreen history link, AnalyticsScreen | Both | List of past workouts — search, filter by muscle/week, session replay and details | UNREVIEWED | Registered in both HomeStack and ProgressStack |
| `Plans` | Train | PlansTab > Plans | `src/screens/PlansScreen.js` | PlansTab (root) | Both | Plans tab root — active plan overview and library browser entry | UNREVIEWED | Free shows Plan Library only; Pro shows active plan + library |
| `PlanDetail` | Plan Overview | PlansTab > PlanDetail | `src/screens/PlanDetailScreen.js` | PlansScreen plan card | Both | Plan structure — mesocycles, weeks, routines, and start/swap controls | UNREVIEWED | Hero-zoom from card; manual/generated plan support |
| `RoutineDetail` | Routine Exercises | PlansTab > RoutineDetail | `src/screens/RoutineDetailScreen.js` | PlanDetailScreen routine card | Both | Routine breakdown — exercise order, set/rep schema, form notes, and exercise variations | UNREVIEWED | Hero-zoom from card |
| `ExerciseDetail` | Exercise Details | PlansTab/ProgressTab > ExerciseDetail | `src/screens/ExerciseDetailScreen.js` | RoutineDetailScreen, AnalyticsScreen, LiftProgressScreen | Both | Exercise reference — form guide video, variation picker, historical sets/reps, and personal notes | UNREVIEWED | Origin-aware hero-zoom from card (grows from tapped card location) |
| `ManualBuilder` | Custom Training | PlansTab > ManualBuilder | `src/screens/ManualBuilderScreen.js` | PlansScreen, PlanDetailScreen | Both | Create/edit custom training programmes — build weeks, exercises, and periodisation | UNREVIEWED | Free feature; no limits on custom plans |
| `MesocycleBuilder` | Edit Blocks | PlansTab > MesocycleBuilder | `src/screens/MesocycleBuilderScreen.js` | PlanDetailScreen | Both | Mesocycle editor — create/edit weeks, set deload flags, manage periodisation structure | UNREVIEWED | Pro-only for advanced editing; free can't edit existing library plans |
| `PlanLibrary` | Browse Library | PlansTab > PlanLibrary | `src/screens/PlansScreen | Both | Curated training programme catalogue — browse by goal, experience, duration, and muscle split | UNREVIEWED | Free and Pro have same library view; tier affects start options |
| `FreeStarter` | Difficulty Quiz | HomeTab/PlansTab/FirstRunStack > FreeStarter | HomeScreen no-plan, PlansScreen, FirstRunStack | Both | Free onboarding micro-quiz — three questions that activate a starter difficulty-0 plan | UNREVIEWED | Registered in three stacks; shown on new free account with no plan |

---

## NUTRITION FLOWS

| SCREEN_ID | USER-FACING NAME | PRODUCTION ROUTE | SOURCE FILE | ENTRY POINTS | TIER | PRIMARY JOB | STATUS | NOTES |
|---|---|---|---|---|---|---|---|---|
| `Diary` | Eat | DiaryTab > Diary | `src/screens/DiaryScreen.js` | DiaryTab (root) | Pro (RO) | Food diary root — six meal sections, macro rings, date pager, and copy-yesterday | UNREVIEWED | Gated; free users with data see read-only view per withReadOnlyProGuard |
| `MealPlan` | Meal Plan | DiaryTab > MealPlan | `src/screens/MealPlanScreen.js` | DiaryScreen meal plan button | Pro | Nutrition targets editor — daily calorie/macro goals and meal planning automation engine | UNREVIEWED | Pro-only; gated by withProGuard |
| `FoodSearch` | Search Foods | DiaryTab > FoodSearch (modal) | `src/screens/FoodSearchScreen.js` | DiaryScreen + buttons (meals, snacks) | Pro | Food library search — barcode database, branded foods, off/USDA, and manual entry flows | UNREVIEWED | Modal presentation; deep-linked food record creation |
| `AddCustomFood` | Custom Food | DiaryTab > AddCustomFood (modal) | `src/screens/AddCustomFoodScreen.js` | FoodSearchScreen, DiaryScreen custom button | Pro | Create custom food entries — macro and micronutrient input with UI calculators | UNREVIEWED | Modal; one-off food or recipe base for saved meals |
| `ScanBarcode` | Barcode Scan | DiaryTab > ScanBarcode (modal) | `src/screens/ScanBarcodeScreen.js` | DiaryScreen scan button, FoodSearchScreen | Pro | Barcode scanner — vision camera capture and product lookup from OFF/USDA databases | UNREVIEWED | Modal; native camera module (expo-vision-camera plugin) |
| `ScanLabel` | Label Scan | DiaryTab > ScanLabel (modal) | `src/screens/ScanLabelScreen.js` | DiaryScreen scan button | Pro | Nutrition label OCR — camera capture and text extraction for manual macro entry | UNREVIEWED | Modal; native vision module |
| `FoodInsights` | Nutrition Insights | DiaryTab > FoodInsights | `src/screens/FoodInsightsScreen.js` | DiaryScreen insights button | Pro | Weekly nutrition analysis — macro balance, food patterns, and consistency trends | UNREVIEWED | Non-modal; scroll view with charts |
| `MyRecipes` | Saved Recipes | DiaryTab > MyRecipes (modal) | `src/screens/MyRecipesScreen.js` | DiaryScreen, MealPlanScreen quick-add | Pro | User's saved recipes — quick reuse for multi-ingredient meals and meal planning | UNREVIEWED | Modal; created via RecipeBuilder |
| `MyMeals` | Saved Meals | DiaryTab > MyMeals (modal) | `src/screens/MyMealsScreen.js` | DiaryScreen, RecipeBuilderScreen | Pro | User's saved meal combinations — quick logging for repeated meal patterns | UNREVIEWED | Modal; faster entry than building from scratch |
| `RecipeBuilder` | Build Recipe | DiaryTab > RecipeBuilder (modal) | `src/screens/RecipeBuilderScreen.js` | DiaryScreen, FoodSearchScreen | Pro | Create custom recipes — combine foods, auto-calc macros, save for reuse | UNREVIEWED | Modal; ingredient search and quantity entry |

---

## COACH & CHECK-IN

| SCREEN_ID | USER-FACING NAME | PRODUCTION ROUTE | SOURCE FILE | ENTRY POINTS | TIER | PRIMARY JOB | STATUS | NOTES |
|---|---|---|---|---|---|---|---|---|
| `WeeklyCheckIn` | Weekly Check-In | ProfileTab > WeeklyCheckIn | `src/screens/WeeklyCheckInScreen.js` | ProfileTab/CoachOutputScreen, notification | Pro | Precision Coaching intake form — recovery, exertion, adherence, energy, and soreness input | UNREVIEWED | Gated; unlocks coaching decision on submission |
| `CoachOutput` | Coaching Decision | ProfileTab > CoachOutput | `src/screens/CoachOutputScreen.js` | WeeklyCheckInScreen, ProfileTab, notification, deep-link volyume://coach | Pro | Displays coaching recommendation — volume adjust, deload, intensity modulation, or hold | UNREVIEWED | Gated; deep-linkable; shows rationale and next actions |
| `CoachReview` | Review Session | HomeTab > CoachReview | `src/screens/CoachReviewScreen.js` | HomeScreen session reflection prompt (optional) | Both | Optional post-workout coaching reflection — perceived effort and performance feedback | UNREVIEWED | Free feature; appears after workouts under certain conditions |
| `BlockReflection` | Block Review | ProfileTab > BlockReflection | `src/screens/BlockReflectionScreen.js` | ProfileTab/CoachOutputScreen, end-of-mesocycle | Both | Mesocycle reflection form — feedback on completed training block and next goals | UNREVIEWED | Presented on mesocycle end; free and Pro |
| `CoachHeldHistory` | Held Recommendations | ProfileTab > CoachHeldHistory | `src/screens/CoachHeldHistoryScreen.js` | ProfileTab/ProfileStack | Both | History of deferred coaching recommendations — replay held adjustments and approve/reject | UNREVIEWED | Shows coaching decisions the user deferred/held |
| `Methodology` | How Coaching Works | ProfileTab/ProOnboardingStack > Methodology | `src/screens/MethodologyScreen.js` | CoachOutputScreen info icon, ProSetupCompleteScreen, ProfileStack | Both | Explanation of Precision Coaching system — decision logic, volume landmarks, and adjustment logic | UNREVIEWED | Educational reference; accessible from Pro onboarding and Coach tab |
| `WeeklyStory` | Your Week | ProfileTab > WeeklyStory | `src/screens/WeeklyStoryScreen.js` | ProfileTab/ProfileStack, notification | Pro | Weekly coaching narrative — nutrition targets, weight trend, check-in result, and coach decision combined | UNREVIEWED | Gated; synthesis of nutrition + coaching week |

---

## PROGRESS, BODY & PHOTOS

| SCREEN_ID | USER-FACING NAME | PRODUCTION ROUTE | SOURCE FILE | ENTRY POINTS | TIER | PRIMARY JOB | STATUS | NOTES |
|---|---|---|---|---|---|---|---|---|
| `Analytics` | Progress | ProgressTab > Analytics | `src/screens/AnalyticsScreen.js` | ProgressTab (root) | Both | Progress tab root — volume trends, tonnage milestones, weight graph, and recent sessions | AUDITED | Campaign 23 Phase 1 audit complete 2026-08-17; redesign spec at docs/progress-audit-campaign-23-2026-08-17/PROGRESS-UX-SPEC.md (verdict B, two founder rulings open) |
| `VolumeHeatmap` | Exercise Matrix | ProgressTab > VolumeHeatmap | `src/screens/VolumeHeatmapScreen.js` | AnalyticsScreen | Both | Heatmap of training volume — volume per muscle per week (52-week rolling view) | UNREVIEWED | Shows adherence patterns and muscle group balance |
| `LiftProgress` | Lift PRs | ProgressTab > LiftProgress | `src/screens/LiftProgressScreen.js` | AnalyticsScreen | Both | Personal records — tracked max per exercise with progression timeline and trend arrows | UNREVIEWED | Shows top set per exercise; pro users see weight trend |
| `Consistency` | Consistency | ProgressTab > Consistency | `src/screens/ConsistencyScreen.js` | AnalyticsScreen | Both | Workout adherence — weekly session streak, frequency patterns, and scheduled vs. actual | UNREVIEWED | Shows consistency trends and achievement badges |
| `YearOfLifts` | Year in Review | ProgressTab > YearOfLifts | `src/screens/YearOfLiftsScreen.js` | AnalyticsScreen, deep-link or notification | Both | Year-in-review visual story — monthly volume blocks, session counts, and tonnage milestones | UNREVIEWED | Shareable visual recap of annual training data |
| `RecapStory` | Monthly Recap | ProgressTab > RecapStory | `src/screens/YearOfLiftsScreen.js` | AnalyticsScreen month card, deep-link or notification | Both | Dual-use route — same YearOfLiftsScreen component, parameterised for monthly vs. annual view | UNREVIEWED | Different params (variant: 'month' vs. 'year') to same component |
| `BodyMetrics` | Body Metrics | ProgressTab/ProfileTab > BodyMetrics | `src/screens/BodyMetricsScreen.js` | AnalyticsScreen, ProfileTab, SettingsHealthScreen | Pro (RO) | Weight tracking and body composition — morning weigh-ins, measurements, and trend graph | UNREVIEWED | Gated; withReadOnlyProGuard shows read-only view for free with data; no upload for free |
| `ProgressPhotos` | Progress Photos | ProgressTab/ProfileTab > ProgressPhotos | `src/screens/ProgressPhotosScreen.js` | AnalyticsScreen, ProfileTab, AthleteProfileScreen | Pro (RO) | Before/after photo gallery — progress photos with Volyume Score and comparison sliders | UNREVIEWED | Gated; withReadOnlyProGuard; hidden under calm mode or open ED flag |
| `Partner` | Training Partner | ProgressTab > Partner | `src/screens/PartnerScreen.js` | AnalyticsScreen partner card | Pro | Training partner view — performance comparison and shared workout insights (NEW-002) | UNREVIEWED | Partner network feature; Pro-only |
| `ShareCard` | Share Card | HomeTab/PlansTab/ProgressTab/ProfileTab > ShareCard | `src/screens/ShareCardScreen.js` | WorkoutSummaryScreen, YearOfLiftsScreen, CoachOutputScreen, ProgressPhotosScreen | Both | Social share card builder — format session/volume/progress milestone for external sharing | UNREVIEWED | Registered in four tab stacks; multiple source screens |

---

## ONBOARDING, AUTH & CONSENT

| SCREEN_ID | USER-FACING NAME | PRODUCTION ROUTE | SOURCE FILE | ENTRY POINTS | TIER | PRIMARY JOB | STATUS | NOTES |
|---|---|---|---|---|---|---|---|---|
| `Welcome` | Welcome | WelcomeStack > Welcome | `src/screens/WelcomeScreen.js` | RootNavigator (!user) | Both | Tier selection screen — free or Pro onboarding path picker | UNREVIEWED | Entry screen for signed-out users |
| `QuizTraining` | Training Quiz | WelcomeStack > QuizTraining | `src/screens/QuizScreen.js` | WelcomeScreen (COMP-030 quiz-first path) | Both | Pre-account training background quiz — experience, goals, and equipment for Pro signup | UNREVIEWED | Optional quiz-first signup flow; skippable |
| `PlanPreview` | Plan Preview | WelcomeStack > PlanPreview | `src/screens/PlanPreviewScreen.js` | QuizTrainingScreen | Both | Suggested plan preview — show user their recommended plan before account creation | UNREVIEWED | Quiz-first onboarding only |
| `Login` | Sign In / Sign Up | WelcomeStack > Login | `src/screens/LoginScreen.js` | WelcomeScreen | Both | Email/password and OAuth sign-in/sign-up — Apple, Google, email auth, account creation | UNREVIEWED | Unified auth screen; email/password re-added 2026-07-21 |
| `FirstRunBranch` | Onboarding Setup | FirstRunStack > FirstRunBranch | `src/screens/FirstRunScreen.js` | RootNavigator (!firstRunComplete && tier !== 'pro') | Both | Free tier onboarding wizard — name entry, athletic background, and training preferences | UNREVIEWED | Gated to free users without firstRunComplete |
| `Article9Consent` | Health Data Consent | Article9ConsentStack > Article9Consent | `src/screens/Article9ConsentScreen.js` | RootNavigator (!healthConsent && user) | Both | Un-skippable Article 9 GDPR compliance gate — health data processing consent | UNREVIEWED | Mandatory gate before app access; fails closed on transient read failure |
| `PrivacyPolicy` | Privacy Policy | Article9ConsentStack/ProfileTab > PrivacyPolicy | `src/screens/PrivacyPolicyScreen.js` | Article9ConsentScreen policy link, SettingsPrivacyScreen | Both | Privacy policy and data processing terms — inline reading during consent flow or on-demand | UNREVIEWED | Registered in two stacks |
| `ProOnboarding` | Pro Setup | ProOnboardingStack > ProOnboarding | `src/screens/ProOnboardingScreen.js` | RootNavigator (!firstRunComplete && tier === 'pro') | Both | Pro tier multi-step onboarding — goals, body metrics, check-in intro, and preferences | UNREVIEWED | Gated to Pro users without firstRunComplete |
| `ProSetupComplete` | Coaching Start | ProOnboardingStack > ProSetupComplete | `src/screens/ProSetupCompleteScreen.js` | ProOnboardingScreen completion action | Both | Pro onboarding hand-off — Precision Coaching introduction, how to check-in, and next steps | UNREVIEWED | Final Pro onboarding screen; links to Methodology and NutritionEducation |

---

## PROFILE & SETTINGS

| SCREEN_ID | USER-FACING NAME | PRODUCTION ROUTE | SOURCE FILE | ENTRY POINTS | TIER | PRIMARY JOB | STATUS | NOTES |
|---|---|---|---|---|---|---|---|---|
| `You` | Coach | ProfileTab > You | `src/screens/YouScreen.js` | ProfileTab (root) | Both | Profile tab root — athlete profile summary, weight, goals, and recent activity | UNREVIEWED | Displays photo, subscription status, goal card, and quick-link tiles |
| `AthleteProfile` | Edit Profile | ProfileTab > AthleteProfile | `src/screens/AthleteProfileScreen.js` | YouScreen photo or name | Both | Edit athlete profile — name, photo, biography, and experience level | UNREVIEWED | Free and Pro can edit; Pro can see partner views |
| `Settings` | Settings | ProfileTab > Settings | `src/screens/SettingsScreen.js` | YouScreen settings link | Both | Settings hub — navigation to all preference and account sub-screens | UNREVIEWED | Master settings navigation; free and Pro have same structure |
| `SettingsWorkout` | Workout Settings | ProfileTab > SettingsWorkout | `src/screens/SettingsWorkoutScreen.js` | SettingsScreen | Both | Exercise preferences — muscle group defaults, favourite exercises, and difficulty level | UNREVIEWED | Customises exercise suggestions and library display |
| `SettingsAccount` | Account | ProfileTab > SettingsAccount | `src/screens/SettingsAccountScreen.js` | SettingsScreen | Both | Email and password — view email, change password, sign out, and account deletion | UNREVIEWED | Critical account management flows |
| `SettingsProfile` | Profile Settings | ProfileTab > SettingsProfile | `src/screens/SettingsProfileScreen.js` | SettingsScreen | Both | Units and body — weight/distance units, biological sex, age, height | UNREVIEWED | Used by coaching engine for calorie floors |
| `SettingsCoaching` | Coaching Settings | ProfileTab > SettingsCoaching | `src/screens/SettingsCoachingScreen.js` | SettingsScreen | Both | Coaching preferences — training goal, macro split, volume modulation, and deload frequency | UNREVIEWED | Pro users edit here; free view only |
| `SettingsDisplay` | Display | ProfileTab > SettingsDisplay | `src/screens/SettingsDisplayScreen.js` | SettingsScreen | Both | Theme and accessibility — light/dark mode, text size, motion reduction, and language | UNREVIEWED | Affects app-wide styling and motion UX |
| `SettingsHealth` | Health | ProfileTab > SettingsHealth | `src/screens/SettingsHealthScreen.js` | SettingsScreen | Both | Health metrics — ED pattern flag status, wellbeing state (Beat UK), and calm mode toggle | UNREVIEWED | Critical for ED-safety guardrails; gates nutrition data exposure |
| `SettingsData` | Your Data | ProfileTab > SettingsData | `src/screens/SettingsDataScreen.js` | SettingsScreen | Both | Data management — account snapshots, import/export, and cross-device restore history | UNREVIEWED | Snapshot and import flows; account switch recovery |
| `SettingsDietary` | Dietary Preferences | ProfileTab > SettingsDietary | `src/screens/SettingsDietaryScreen.js` | SettingsScreen | Both | Dietary restrictions — allergies, intolerances, vegetarian/vegan, and food preferences | UNREVIEWED | Used by meal planning and food suggestions |
| `SettingsPrivacy` | Privacy | ProfileTab > SettingsPrivacy | `src/screens/SettingsPrivacyScreen.js` | SettingsScreen | Both | GDPR and consent — data access request, consent replay, and policy links | UNREVIEWED | Privacy and regulatory compliance management |
| `SettingsAbout` | About Volyume | ProfileTab > SettingsAbout | `src/screens/SettingsAboutScreen.js` | SettingsScreen | Both | App info — version, build, legal links, and support links | UNREVIEWED | Credits, FAQ, debug log access (dev mode) |
| `SettingsFaq` | Help & FAQ | ProfileTab > SettingsFaq | `src/screens/SettingsFaqScreen.js` | SettingsScreen | Both | Frequently asked questions and help content — common user questions and troubleshooting | UNREVIEWED | Educational reference; static content |
| `NotificationSettings` | Notifications | ProfileTab/ProOnboardingStack > NotificationSettings | `src/screens/NotificationSettingsScreen.js` | SettingsScreen, ProSetupCompleteScreen, ProfileStack | Both | Push notification preferences — toggle notification types and set quiet hours | UNREVIEWED | Registered in three stacks |
| `NutritionTargets` | Nutrition Targets | ProfileTab > NutritionTargets | `src/screens/NutritionTargetsScreen.js` | SettingsCoachingScreen, SettingsScreen | Pro | Edit daily calorie and macro targets — override coaching suggestions with custom goals | UNREVIEWED | Gated; Pro-only target adjustment |
| `MealNames` | Meal Names | ProfileTab > MealNames | `src/screens/MealNamesScreen.js` | SettingsScreen (unreachable per D95) | Pro | Meal naming preferences — rename meal slots (Breakfast, Lunch, etc.) | UNREVIEWED | D95 note: deliberately unreachable; retained pending feature return |
| `NutritionEducation` | Nutrition Guide | ProfileTab/ProOnboardingStack > NutritionEducation | `src/screens/NutritionEducationScreen.js` | ProSetupCompleteScreen, SettingsCoachingScreen, ProfileStack | Both | Nutrition education — macro system explanation, calorie basics, and plan mechanics | UNREVIEWED | Educational; part of Pro onboarding and settings access |
| `CoachingReminders` | Coaching Alerts | ProfileTab/ProOnboardingStack > CoachingReminders | `src/screens/CoachingRemindersScreen.js` | NotificationSettingsScreen, ProSetupCompleteScreen, ProfileStack | Pro | Coaching notification frequency — toggle check-in reminders and adjust cadence | UNREVIEWED | Pro-only; registered in three stacks |
| `WellbeingCheck` | Wellbeing | ProfileTab > WellbeingCheck | `src/screens/WellbeingCheckScreen.js` | SettingsHealthScreen wellbeing state card, ProfileTab | Both | Beat UK ED screening and calm mode — manage wellbeing status and activate calm mode | UNREVIEWED | ED-safety critical; manages content suppression flags |
| `Subscription` | Subscription | ProfileTab > Subscription | `src/screens/SubscriptionScreen.js` | YouScreen subscription card, SettingsScreen | Both | Subscription status — manage subscription, upgrade, downgrade, and billing info | UNREVIEWED | Billing and entitlement management |
| `CascadeGate` | Pro Trial Gate | ProfileTab > CascadeGate (modal) | `src/screens/CascadeGateScreen.js` | YouScreen, SettingsScreen (on-demand) | Both | 14-day Pro trial start — upgrade gate and trial messaging (modal presentation) | UNREVIEWED | Paywall surface for trial initiation |
| `ProUpgrade` | Upgrade to Pro | MultiTab > ProUpgrade (modal) | `src/screens/ProUpgradeScreen.js` | ProGate wraps throughout app | Both | Paywall modal — Pro benefits teaser, purchase button, and trial offer | UNREVIEWED | Registered in all five tab stacks (HomeStack, PlansStack, DiaryStack, ProgressStack, ProfileStack) |
| `SubscriptionPolicy` | Subscription Terms | ProfileTab > SubscriptionPolicy | `src/screens/SubscriptionPolicyScreen.js` | SubscriptionScreen link | Both | Subscription terms and policy — cancellation, billing, and renewal policy | UNREVIEWED | Legal/policy reference |
| `Import` | Import Workouts | ProfileTab > Import | `src/screens/ImportScreen.js` | SettingsDataScreen | Both | Import workouts from external sources — Strong, Fitbod, and other exportable formats | UNREVIEWED | Data import and migration tool |
| `Credits` | Credits | ProfileTab > Credits | `src/screens/CreditsScreen.js` | SettingsAboutScreen link | Both | Credits — music, fonts, data sources, and third-party attributions | UNREVIEWED | Attribution and credits page |

---

## SECONDARY, HISTORY & DETAIL

| SCREEN_ID | USER-FACING NAME | PRODUCTION ROUTE | SOURCE FILE | ENTRY POINTS | TIER | PRIMARY JOB | STATUS | NOTES |
|---|---|---|---|---|---|---|---|---|
| `ProGoalSetup` | Goal Setup | ProfileTab > ProGoalSetup | `src/screens/ProGoalSetupScreen.js` | YouScreen goal card or ProfileStack | Pro | Goal definition and macro preference editor — Pro users set training goals and nutrition targets | UNREVIEWED | Pro-only goal and nutrition configuration |
| `GoalChangeSummary` | Goal Change | ProfileTab > GoalChangeSummary | `src/screens/GoalChangeSummaryScreen.js` | ProfileStack, notification routing, goal change flow | Both | Summary of coaching adjustments when goal changes — explain plan/volume impact | UNREVIEWED | Shown after goal update; free and Pro |
| `GoalLockConsent` | Goal Lock Consent | ProfileTab > GoalLockConsent | `src/screens/GoalLockConsentScreen.js` | GoalChangeSummaryScreen, ProfileStack | Both | Goal lock consent — confirm before locking goal for a coaching cycle | UNREVIEWED | Prevents accidental goal changes mid-cycle |
| `DebugLog` | Debug Log | ProfileTab > DebugLog | `src/screens/DebugLogScreen.js` | SettingsAboutScreen (dev-mode route) | Both | Internal debugging log view — app events, errors, and diagnostic information | UNREVIEWED | Development and support tool; not user-facing in production |
| `Snapshots` | Snapshots | ProfileTab > Snapshots | `src/screens/SnapshotsScreen.js` | SettingsDataScreen link | Both | Account data snapshots — list of saved snapshots for restore and cross-device migration | UNREVIEWED | Data recovery and account switch management |

---

## ORPHANS (Files not registered in navigation graph)

| FILENAME | STATUS | NOTES |
|---|---|---|
| `paywallExcerpts.js` | Not a production screen | Utility module for paywall copy reuse — imported by screens, not a routable screen |

---

## REGISTER SUMMARY

- **Total production screens:** 80 (79 unique routes; some registered in multiple stacks)
- **Core tabs:** 5 (Today, Train, Nutrition, Progress, Coach)
- **Free/Both screens:** 67
- **Pro-only screens:** 12
- **Pro read-only screens (free sees upgrade):** 2 (BodyMetrics, ProgressPhotos via withReadOnlyProGuard)
- **Dual-use routes:** 1 (RecapStory = YearOfLiftsScreen with different params)
- **Multi-stack registrations:** 
  - ProUpgrade: 5 stacks (HomeStack, PlansStack, DiaryStack, ProgressStack, ProfileStack)
  - ExerciseDetail: 2 stacks (PlansStack, ProgressStack)
  - ShareCard: 4 stacks (HomeStack, ProgressTab, ProfileStack, multiple source screens)
  - WorkoutSummary: 2 stacks (HomeTab, ProgressStack)
  - WorkoutHistory: 2 stacks (HomeStack, ProgressStack)
  - BodyMetrics: 2 stacks (ProgressStack, ProfileStack)
  - ProgressPhotos: 2 stacks (ProgressStack, ProfileStack)
  - Methodology: 3 stacks (ProfileStack, ProOnboardingStack)
  - NotificationSettings: 3 stacks (ProfileStack, ProOnboardingStack)
  - CoachingReminders: 3 stacks (ProfileStack, ProOnboardingStack)
  - NutritionEducation: 3 stacks (ProfileStack, ProOnboardingStack)
  - PrivacyPolicy: 2 stacks (Article9ConsentStack, ProfileStack)

### Screens awaiting trace (entry point or title TRACE-NEEDED)

None. All 80 screens have verified entry points and user-facing titles established from RootNavigator code inspection.
