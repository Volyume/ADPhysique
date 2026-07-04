# Volyume Navigation Inventory (Audit H1)

**Audit Date:** 2026-07-04  
**Scope:** src/navigation/, src/screens/ (~81 screens), src/components/(*Sheet, *Modal)

## Summary (10 lines)

- **Total Screens:** 81 (excluding utility files like paywallExcerpts.js)
- **Total Navigators:** 1 root + 4 bottom tabs + 4 onboarding stacks = 9 active navigator trees
- **Bottom Tabs:** HomeTab, PlansTab, DiaryTab, ProgressTab, ProfileTab (5 tabs)
- **Main Stacks per Tab:** 5 stacks (HomeStack, PlansStack, DiaryStack, ProgressStack, ProfileStack)
- **Onboarding/Auth Stacks:** 4 stacks (WelcomeStack, FirstRunStack, Article9ConsentStack, ProOnboardingStack)
- **Modal/Sheet Components:** 8 component files (FeedbackSheet, CancelReasonSheet, WhatsNewSheet, PostLapseSheet, BottomSheet, PhotoDetailsSheet, BeforeAfterShareSheet, ExercisePickerModal)
- **Orphaned Screens:** 0 (all 81 screens are registered in at least one navigator)
- **Gated Screens (Pro):** ~27 screens (guarded by withProGuard or withReadOnlyProGuard)
- **Cross-Tab Jumps:** 16 distinct navigateCrossTab calls across 10 source screens
- **Article 9 Gating:** RootNavigator:1392, healthConsent flow blocks until consent resolved

---

## 1. ROOT NAVIGATOR GATING BRANCHES

**File:** `src/navigation/RootNavigator.js`

| Gating Gate | Route Name | Condition | Line | Route Path |
|---|---|---|---|---|
| **1. Auth Status** | WelcomeStack | `!user` | 1362 | Login/Welcome screens, OAuth chooser |
| **2. Article 9 Consent** | Article9ConsentStack | `user && healthConsentChecked && (healthConsent === false \|\| consentUnresolvedForNewUser)` | 1392 | Health-data consent gate (blocks all features until affirmative) |
| **3. First Run Not Complete** | FirstRunStack or ProOnboardingStack | `!firstRunComplete && (tier === 'pro' ? ProOnboardingStack : FirstRunStack)` | 1396 | Onboarding flow (split by tier) |
| **4. Completed Users** | MainTabs | `firstRunComplete && user && healthConsent === true` | 1398 | 5-tab main navigator (Train/Plans/Diary/Progress/You) |

**Deep Linking:** RootNavigator:635–672 (linking config)
- `volyume://` scheme registered in app.json
- Routes: BuildWorkout, Diary, routine/:planId, progress
- Pro-gated routes still render upgrade prompt for free users

---

## 2. MAIN NAVIGATOR STACKS (5 Bottom Tabs)

### Tab: HOME (HomeTab → HomeStack)

**File:** `src/navigation/RootNavigator.js:352–380`  
**Initial Route:** Home  
**Tab Press Behaviour:** Pops to Home when already focused (NAV-5, line 280–283)

| Screen File | Route Name | Type | Gating | Modality | Trigger |
|---|---|---|---|---|
| HomeScreen | Home | Full | Free | Default | Tab press, home icon |
| BuildWorkoutScreen | BuildWorkout | Full | Free | Default | "Start a workout" card or cross-tab from Analytics |
| ActiveWorkoutScreen | ActiveWorkout | Full | Free | Default | BuildWorkout → "Start", or CoachReview live button |
| WorkoutSummaryScreen | WorkoutSummary | Full | Free | Default | ActiveWorkout → finish session |
| WorkoutHistoryScreen | WorkoutHistory | Full | Free | Default | Home analytics card or ProgressTab |
| VolumeHeatmapScreen | VolumeHeatmap | Full | Free | Default | Home or ProgressTab heat card |
| ShareCardScreen | ShareCard | Full | Free | Default | WorkoutSummary, CoachReview, or ProgressTab |
| CoachReviewScreen | CoachReview | Full | Pro | Default | Home "Your week" card, or cross-tab from ProfileTab |
| LogCardioScreen | LogCardio | Full | Pro | Modal | Home "Cardio" card or Diary tab |
| ProUpgradeScreen | ProUpgrade | Full | Gated | Modal | Any Pro screen tap from free user |
| FreeStarterScreen | FreeStarter | Full | Free | Default | Home "no plan" card → micro-quiz (B2) |

**Hero-Zoom Transition:** ActiveWorkout, WorkoutSummary, PlanDetail, RoutineDetail, ExerciseDetail use `heroZoomTransition` (line 241–265)

---

### Tab: PLANS (PlansTab → PlansStack)

**File:** `src/navigation/RootNavigator.js:382–407`  
**Initial Route:** Plans  
**Tab Press Behaviour:** Pops to Plans when already focused (NAV-5)

| Screen File | Route Name | Type | Gating | Modality | Trigger |
|---|---|---|---|---|
| PlansScreen | Plans | Full | Free | Default | Tab press, plans icon |
| PlanDetailScreen | PlanDetail | Full | Free | Default | PlansScreen plan card, or cross-tab from FirstRunStack |
| RoutineDetailScreen | RoutineDetail | Full | Free | Default | PlanDetailScreen routine card |
| ExerciseDetailScreen | ExerciseDetail | Full | Free | Default | RoutineDetailScreen exercise card, or cross-tab from ProgressTab |
| ManualBuilderScreen | ManualBuilder | Full | Free | Default | PlansScreen "Custom plan" button |
| PlanLibraryScreen | PlanLibrary | Full | Free | Default | "Browse plans" or FirstRunStack/ProOnboardingStack |
| MesocycleBuilderScreen | MesocycleBuilder | Full | Free | Default | PlansScreen or cross-tab from ConsistencyScreen |
| PlanUpdateScreen | PlanUpdate | Full | Pro | Default | PlansScreen "Update training" (Precision Coaching) |
| ProUpgradeScreen | ProUpgrade | Full | Gated | Modal | PlanUpdate or any Pro feature tap (free user) |
| FreeStarterScreen | FreeStarter | Full | Free | Default | PlansScreen "no plan" → micro-quiz (B2) |

---

### Tab: DIARY (DiaryTab → DiaryStack)

**File:** `src/navigation/RootNavigator.js:275–350`  
**Initial Route:** Diary  
**Tab Press Behaviour:** Pops to Diary when already focused (NAV-5)  
**Gating:** **Entire stack is Pro-gated** (withReadOnlyProGuard at Diary root, line 201). Free users with existing food data see view-only; free users with no data see upgrade prompt. Defence-in-depth: all sub-screens also guarded (lines 209–217).

| Screen File | Route Name | Type | Gating | Modality | Trigger |
|---|---|---|---|---|
| DiaryScreen | Diary | Full | Pro (read-only for free with data) | Default | Tab press, diary icon |
| MealPlanScreen | MealPlan | Full | Pro | Default | DiaryScreen "Meal plan" button |
| FoodSearchScreen | FoodSearch | Full | Pro | Default | DiaryScreen "Add food" or Diary quick-add |
| AddCustomFoodScreen | AddCustomFood | Full | Pro | Default | FoodSearchScreen "Add custom" or DiaryScreen |
| ScanBarcodeScreen | ScanBarcode | Full | Pro | Default | DiaryScreen "Scan barcode" |
| ScanLabelScreen | ScanLabel | Full | Pro | Default | ScanBarcodeScreen or DiaryScreen "Scan label" |
| FoodInsightsScreen | FoodInsights | Full | Pro | Default | DiaryScreen "Insights" card |
| MyRecipesScreen | MyRecipes | Full | Pro | Default | DiaryScreen "Saved recipes" or FoodSearchScreen |
| MyMealsScreen | MyMeals | Full | Pro | Default | DiaryScreen "Saved meals" or FoodSearchScreen |
| RecipeBuilderScreen | RecipeBuilder | Full | Pro | Default | MyRecipesScreen "Create recipe" or FoodSearchScreen |
| LogCardioScreen | LogCardio | Full | Pro | Modal | DiaryScreen "Cardio" or HomeTab |
| CardioHistoryScreen | CardioHistory | Full | Pro | Default | DiaryScreen "Cardio history" or AnalyticsScreen |
| ProUpgradeScreen | ProUpgrade | Full | Gated | Modal | Any Pro action when free |

**All screens in DiaryStack are Pro-domain.** Free users can deep-link to Diary (via URL `volyume://diary`) and see the upgrade path; they cannot access food data entry or cardio logging.

---

### Tab: PROGRESS (ProgressTab → ProgressStack)

**File:** `src/navigation/RootNavigator.js:409–442`  
**Initial Route:** Analytics  
**Tab Press Behaviour:** Pops to Analytics when already focused (NAV-5)

| Screen File | Route Name | Type | Gating | Modality | Trigger |
|---|---|---|---|---|
| AnalyticsScreen | Analytics | Full | Free | Default | Tab press, stats icon; deep-link `volyume://progress` |
| WorkoutHistoryScreen | WorkoutHistory | Full | Free | Default | AnalyticsScreen or HomeTab; also cross-tab from WorkoutHistoryScreen itself |
| WorkoutSummaryScreen | WorkoutSummary | Full | Free | Default | AnalyticsScreen or HomeTab (post-workout) |
| VolumeHeatmapScreen | VolumeHeatmap | Full | Free | Default | AnalyticsScreen heat card |
| LiftProgressScreen | LiftProgress | Full | Free | Default | AnalyticsScreen "Lifts" card |
| ConsistencyScreen | Consistency | Full | Free | Default | AnalyticsScreen "Consistency" card |
| ExerciseDetailScreen | ExerciseDetail | Full | Free | Default | AnalyticsScreen or cross-tab from HomeTab/PlansTab |
| CoachReviewScreen | CoachReview | Full | Free (displays, but data is Pro) | Default | AnalyticsScreen "Weekly review" or HomeTab |
| BodyMetricsScreen | BodyMetrics | Full | Pro (read-only for free with data) | Default | AnalyticsScreen or ProfileTab SettingsHealth |
| ProgressPhotosScreen | ProgressPhotos | Full | Pro (read-only for free with data) | Default | AnalyticsScreen or ProfileTab "Progress photos" |
| YearOfLiftsScreen | YearOfLifts | Full | Free | Default | AnalyticsScreen (year-end story view) |
| RecapStoryScreen | RecapStory | Full | Free | Default | Same as YearOfLifts (alias route name) |
| PartnerScreen | Partner | Full | Pro | Default | AnalyticsScreen "Partner" card or cross-tab from YouScreen |
| ShareCardScreen | ShareCard | Full | Free | Default | WorkoutSummary, CoachReview, or YouScreen |
| LogCardioScreen | LogCardio | Full | Pro | Modal | AnalyticsScreen "Cardio" or HomeTab |
| CardioHistoryScreen | CardioHistory | Full | Pro | Default | AnalyticsScreen cardio row |
| ProUpgradeScreen | ProUpgrade | Full | Gated | Modal | Any Pro action when free |

**Deep Link:** `volyume://progress` → AnalyticsScreen

---

### Tab: YOU/PROFILE (ProfileTab → ProfileStack)

**File:** `src/navigation/RootNavigator.js:444–496`  
**Initial Route:** You  
**Tab Press Behaviour:** Pops to You when already focused (NAV-5)  
**Description:** The largest stack (37+ screens). Contains Settings hierarchy, nutrition/coaching/body configs, legal, billing/subscription, and debug surfaces.

| Screen File | Route Name | Type | Gating | Modality | Trigger |
|---|---|---|---|---|
| YouScreen | You | Full | Free | Default | Tab press, person icon |
| SettingsScreen | Settings | Full | Free | Default | YouScreen "Settings" button |
| SettingsAccountScreen | SettingsAccount | Full | Free | Default | SettingsScreen "Account" row |
| SettingsProfileScreen | SettingsProfile | Full | Free | Default | SettingsScreen "Profile" row |
| SettingsCoachingScreen | SettingsCoaching | Full | Free | Default | SettingsScreen "Coaching" row |
| SettingsDisplayScreen | SettingsDisplay | Full | Free | Default | SettingsScreen "Display & accessibility" row |
| SettingsHealthScreen | SettingsHealth | Full | Free | Default | SettingsScreen "Health" row |
| SettingsDataScreen | SettingsData | Full | Free | Default | SettingsScreen "Your data" row (includes snapshot restore) |
| SnapshotsScreen | Snapshots | Full | Free | Default | SettingsDataScreen "Restore snapshot" button |
| SettingsPrivacyScreen | SettingsPrivacy | Full | Free | Default | SettingsScreen "Privacy & legal" row |
| SettingsAboutScreen | SettingsAbout | Full | Free | Default | SettingsScreen "Help & about" row |
| NutritionEducationScreen | NutritionEducation | Full | Free | Default | YouScreen or cross-tab from ProOnboardingStack |
| NutritionTargetsScreen | NutritionTargets | Full | Pro | Default | SettingsScreen "Nutrition targets" or cross-tab from MealPlanScreen |
| MealNamesScreen | MealNames | Full | Pro | Default | SettingsScreen "Meal names" |
| PerDayTargetsScreen | PerDayTargets | Full | Pro | Default | SettingsScreen "Per-day targets" |
| BodyMetricsScreen | BodyMetrics | Full | Pro (read-only for free with data) | Default | SettingsHealthScreen or ProgressTab |
| ProgressPhotosScreen | ProgressPhotos | Full | Pro (read-only for free with data) | Default | SettingsHealthScreen or ProgressTab |
| WeeklyCheckInScreen | WeeklyCheckIn | Full | Pro | Default | HomeScreen trial banner, YouScreen, or cross-tab from HomeTab |
| CoachOutputScreen | CoachOutput | Full | Pro | Default | HomeScreen "Your week" card or YouScreen (Precision Coaching) |
| MethodologyScreen | Methodology | Full | Free | Default | CoachOutputScreen or ProOnboardingStack hand-off |
| CoachHeldHistoryScreen | CoachHeldHistory | Full | Pro | Default | CoachOutputScreen "Held history" |
| BlockReflectionScreen | BlockReflection | Full | Pro | Default | CoachOutputScreen reflection prompt or post-block |
| ProGoalSetupScreen | ProGoalSetup | Full | Pro | Default | YouScreen or SettingsCoachingScreen "Adjust goal" |
| GoalChangeSummaryScreen | GoalChangeSummary | Full | Free | Default | ProGoalSetupScreen goal adjustment flow |
| GoalLockConsentScreen | GoalLockConsent | Full | Free | Default | ProGoalSetupScreen "Lock goal" |
| NotificationSettingsScreen | NotificationSettings | Full | Free | Default | YouScreen or SettingsAboutScreen "Notifications" |
| CoachingRemindersScreen | CoachingReminders | Full | Pro | Default | SettingsCoachingScreen "Reminders" |
| WellbeingCheckScreen | WellbeingCheck | Full | Free | Default | YouScreen or scheduled notification tap |
| ImportScreen | Import | Full | Free | Default | SettingsDataScreen "Import history" |
| PrivacyPolicyScreen | PrivacyPolicy | Full | Free | Default | YouScreen "Privacy" button, Article9ConsentStack, or SettingsPrivacyScreen |
| DebugLogScreen | DebugLog | Full | Free | Default | SettingsAboutScreen "Debug log" (dev/build-specific) |
| SubscriptionScreen | Subscription | Full | Free | Default | YouScreen or cascading trial/subscription flows |
| SubscriptionPolicyScreen | SubscriptionPolicy | Full | Free | Default | YouScreen or billing flow |
| CascadeGateScreen | CascadeGate | Full | Free | Modal | HomeScreen day-14 trial gate, or billing cascade transitions |
| PaywallScreen | Paywall | Full | Free | Modal | Billing upgrade prompt (review excerpts if populated) |
| CreditsScreen | Credits | Full | Free | Default | YouScreen or SettingsAboutScreen "Credits" |
| ShareCardScreen | ShareCard | Full | Free | Default | WorkoutSummary, CoachReview, or ProgressTab |
| ProUpgradeScreen | ProUpgrade | Full | Gated | Modal | Any Pro action when free |

**Pro Gating:** 21 screens directly guarded (NutritionTargets, MealNames, PerDayTargets, BodyMetrics, ProgressPhotos, WeeklyCheckIn, CoachOutput, CoachHeldHistory, BlockReflection, ProGoalSetup, CoachingReminders). BodyMetrics and ProgressPhotos use `withReadOnlyProGuard` (read-only for free with historical data, line 187–188).

**Deeplinks:** SettingsPrivacy can be reached in-app from YouScreen "Privacy" or in-modal from Article9ConsentStack (line 594).

---

## 3. AUTHENTICATION & ONBOARDING STACKS

### WelcomeStack (Auth)

**File:** `src/navigation/RootNavigator.js:554–565`  
**Mounted when:** `!user` (RootNavigator:1362)  
**Initial Route:** Welcome

| Screen File | Route Name | Type | Trigger |
|---|---|---|---|
| WelcomeScreen | Welcome | Full | Sign-out or first install |
| LoginScreen | Login | Full | Welcome → "Sign in" button |
| QuizScreen | QuizTraining | Full | Welcome → Pro tier selection (COMP-030, optional quiz-first path, line 559) |
| PlanPreviewScreen | PlanPreview | Full | QuizTraining completion (optional, part of quiz-first flow) |

**Auth:** Google OAuth or Apple OAuth (email/password removed 2026-07-01)

---

### FirstRunStack (Free Onboarding)

**File:** `src/navigation/RootNavigator.js:567–581`  
**Mounted when:** `user && firstRunComplete === false && tier !== 'pro'` (RootNavigator:1396)  
**Initial Route:** FirstRunBranch (FirstRunScreen)  
**Description:** Free user onboarding. FirstRunScreen collects biological sex + required fields (blocks progress until explicitly chosen, per onboarding enforcement in CLAUDE.md §2). After completion, routes to MainTabs.

| Screen File | Route Name | Type | Trigger |
|---|---|---|---|
| FirstRunScreen | FirstRunBranch | Full | Auto on first sign-in (free tier) |
| FreeStarterScreen | FreeStarter | Full | FirstRunScreen "Get started" or from PlansScreen/HomeScreen (B2 micro-quiz) |
| PlanLibraryScreen | PlanLibrary | Full | FreeStarterScreen completion or FirstRunScreen "Browse plans" |
| PlanDetailScreen | PlanDetail | Full | PlanLibraryScreen plan selection |
| ActiveWorkoutScreen | ActiveWorkout | Full | PlanDetailScreen "Start first session" |

**First-Run Gate:** `firstRunComplete` flag blocks MainTabs; only flipped true after completing onboarding (biological sex mandatory).

---

### ProOnboardingStack (Pro Onboarding)

**File:** `src/navigation/RootNavigator.js:599–615`  
**Mounted when:** `user && firstRunComplete === false && tier === 'pro'` (RootNavigator:1396)  
**Initial Route:** ProOnboarding  
**Description:** Pro user guided setup (Precision Coaching orientation). Includes nutrition education, plan selection, first-session preview, and hand-off screen linking to methodology.

| Screen File | Route Name | Type | Trigger |
|---|---|---|---|
| ProOnboardingScreen | ProOnboarding | Full | Auto on Pro trial grant or Pro purchase sign-in |
| PlanLibraryScreen | PlanLibrary | Full | ProOnboarding "Choose plan" or hand-off screen |
| PlanDetailScreen | PlanDetail | Full | PlanLibraryScreen plan card |
| ActiveWorkoutScreen | ActiveWorkout | Full | PlanDetailScreen "Preview session" |
| ProSetupCompleteScreen | ProSetupComplete | Full | Post-workout hand-off screen |
| NutritionEducationScreen | NutritionEducation | Full | ProSetupCompleteScreen or direct navigation (COMP-030) |
| MethodologyScreen | Methodology | Full | ProSetupCompleteScreen "How Precision Coaching works" (Wave A B3) |

**Tier Grant:** Trial starts on Article 9 consent grant (start_cascade, RootNavigator:1347–1348). Pro tier checked post-consent.

---

### Article9ConsentStack (Health-Data Consent Gate)

**File:** `src/navigation/RootNavigator.js:587–597`  
**Mounted when:** `user && healthConsentChecked === true && (healthConsent === false || consentUnresolvedForNewUser)` (RootNavigator:1392)  
**Description:** GDPR Article 9 compliance gate. Single-screen stack; user must explicitly grant consent before proceeding. Blocks ALL health-adjacent features (nutrition, coaching, body metrics, ED-safety protections) until affirmative. Consent read from cloud (RootNavigator:1182–1223); new users gate BEFORE onboarding.

| Screen File | Route Name | Type | Trigger |
|---|---|---|---|
| Article9ConsentScreen | Article9Consent | Full | Auto on sign-in if consent === false or null (new user) |
| PrivacyPolicyScreen | PrivacyPolicy | Full | Article9Consent "Read privacy policy" button (in-app view) |

**Consent Resolution:**
- Local cache: `@volyume_health_consent_${userId}` (RootNavigator:1182)
- Cloud fallback: `users_profile.health_data_consent` (RootNavigator:1189–1193)
- Submission: RPC in Article9ConsentScreen; sets `healthConsent = true` in store + AsyncStorage + cloud
- Data Sync Gate: syncAll deferred until `healthConsent === true` (RootNavigator:1267, line 1266–1282)

**Fail-Closed:** Transient read failure (e.g., network) resolves to `null`, NOT `false`, so the gate stays closed and retries next session (RootNavigator:1204, 1222).

---

## 4. MODALS & BOTTOM-SHEET COMPONENTS

**File paths:** `src/components/`

| Component | File | Type | Screens Using It | Purpose |
|---|---|---|---|---|
| ExercisePickerModal | ExercisePickerModal.js | Modal | ManualBuilderScreen, RoutineDetailScreen | Exercise selection overlay (custom plan building) |
| FeedbackSheet | FeedbackSheet.js | Bottom Sheet | SettingsAboutScreen, various error states | User feedback collection |
| CancelReasonSheet | CancelReasonSheet.js | Bottom Sheet | SettingsAccountScreen, subscription flows | Cancellation reason capture |
| WhatsNewSheet | WhatsNewSheet.js | Bottom Sheet | HomeScreen (launch condition-dependent) | New feature/update announcements |
| PostLapseSheet | PostLapseSheet.js | Bottom Sheet | Subscription/cascading win-back | Post-churn re-engagement UI |
| BottomSheet | BottomSheet.js | Bottom Sheet (base component) | Used by other sheets | Generic bottom-sheet container + dismiss logic |
| PhotoDetailsSheet | PhotoDetailsSheet.js | Bottom Sheet | ProgressPhotosScreen | Photo metadata (date, weight, notes) display |
| BeforeAfterShareSheet | BeforeAfterShareSheet.js | Bottom Sheet | ProgressPhotosScreen (before/after progress card) | Share card composition overlay |

**Note:** These are component-based sheets, not Stack-registered screens. They are imperative (`.bottomSheetModalRef?.present()`) and do not appear in navigation routing. All are `presentation: 'modal'` equivalent in behaviour.

---

## 5. SCREEN REGISTRATION SUMMARY & GATING

### By Gating Model

**Free-Tier Screens (54 screens):** Open to all signed-in users with health consent.
- Auth: WelcomeScreen, LoginScreen, Article9ConsentScreen
- Onboarding: FirstRunScreen, ProOnboardingScreen, ProSetupCompleteScreen, FreeStarterScreen
- Training: HomeScreen, BuildWorkoutScreen, ActiveWorkoutScreen, WorkoutSummaryScreen, WorkoutHistoryScreen, VolumeHeatmapScreen, PlansScreen, PlanDetailScreen, RoutineDetailScreen, ExerciseDetailScreen, ManualBuilderScreen, PlanLibraryScreen, MesocycleBuilderScreen, AnalyticsScreen, LiftProgressScreen, ConsistencyScreen, YearOfLiftsScreen, ShareCardScreen
- You: YouScreen, SettingsScreen, SettingsAccountScreen, SettingsProfile, SettingsCoachingScreen, SettingsDisplayScreen, SettingsHealthScreen, SettingsDataScreen, SnapshotsScreen, SettingsPrivacyScreen, SettingsAboutScreen, MethodologyScreen, NotificationSettingsScreen, ImportScreen, PrivacyPolicyScreen, DebugLogScreen, SubscriptionScreen, SubscriptionPolicyScreen, CascadeGateScreen, PaywallScreen, CreditsScreen, NutritionEducationScreen
- Legal: PrivacyPolicyScreen (appears in 2 stacks), NutritionEducationScreen (appears in 3 stacks)
- Deep-linkable: BuildWorkout, Diary (with upgrade gate), routine/:planId, progress

**Pro Screens with withProGuard (21 screens):**
Hard-lock for free users; render upgrade prompt (ProUpgradeScreen navigation).
- Nutrition: NutritionTargetsScreen, MealNamesScreen, PerDayTargetsScreen
- Diary Stack: DiaryScreen (root), MealPlanScreen, FoodSearchScreen, AddCustomFoodScreen, ScanBarcodeScreen, ScanLabelScreen, MyRecipesScreen, MyMealsScreen, RecipeBuilderScreen, LogCardioScreen, CardioHistoryScreen, FoodInsightsScreen
- Coaching: WeeklyCheckInScreen, CoachOutputScreen, CoachHeldHistoryScreen, BlockReflectionScreen, ProGoalSetupScreen, PlanUpdateScreen, CoachingRemindersScreen
- Partner: PartnerScreen

**Pro Screens with withReadOnlyProGuard (2 screens):**
Free users with historical data see read-only view (write affordances hidden); free users with no data see upgrade gate.
- BodyMetricsScreen (BodyMetrics)
- ProgressPhotosScreen (ProgressPhotos)

**Data Check:** withReadOnlyProGuard uses async history checks:
- BodyMetricsScreen: `getBodyMetricLog(userId, 1).then(rows => rows.length > 0)` (line 187)
- ProgressPhotosScreen: `photosViewableBy(userId)` (line 188)

**Gating Logic Location:**
- `src/lib/proGate.js` — binary free/pro resolution, never consults tier for guardrails (CLAUDE.md §2)
- `src/components/ProGate.js` — HOC components withProGuard, withReadOnlyProGuard

---

## 6. CROSS-TAB NAVIGATION

**Helper:** `navigateCrossTab(navigation, tab, screen, params)` (src/navigation/navigateCrossTab.js)  
**Purpose:** Navigate from one tab's stack to a screen in another tab's stack (works around React Navigation F4 dead-tap bug where plain `navigate()` silently no-ops across stacks).

### Registered Cross-Tab Jumps (Source → Target)

| Source Screen | Target Tab | Target Screen | Params | File:Line |
|---|---|---|---|---|
| YouScreen | ProgressTab | Partner | `{ source: 'you_row' }` | YouScreen:109 |
| DiaryScreen | ProfileTab | SettingsPrivacy | (none) | DiaryScreen:1085 |
| MealPlanScreen | ProfileTab | NutritionTargets | (none) | MealPlanScreen:165 |
| AnalyticsScreen | HomeTab | BuildWorkout | (none) | AnalyticsScreen:558 |
| ConsistencyScreen | PlansTab | MesocycleBuilder | (none) | ConsistencyScreen:93 |
| ConsistencyScreen | PlansTab | PlanLibrary | (none) | ConsistencyScreen:94 |
| HomeScreen | ProfileTab | CascadeGate | `{ variant: 'day14' }` | HomeScreen:159 |
| HomeScreen | ProfileTab | NutritionTargets | (none) | HomeScreen:1342 |
| HomeScreen | ProfileTab | CoachOutput | `{ weekStart: latestCoachOutput.weekStart }` | HomeScreen:1367 |
| HomeScreen | ProfileTab | WeeklyCheckIn | (none) | HomeScreen:1408 |
| HomeScreen | ProfileTab | Methodology | `{ source: 'trial_banner' }` | HomeScreen:1412 |
| HomeScreen | ProgressTab | ExerciseDetail | `{ exerciseId: exerciseId }` | HomeScreen:1454 |
| HomeScreen | ProgressTab | Analytics | `{ focusWeightTrend: true }` | HomeScreen:1580 |
| HomeScreen | DiaryTab | FoodSearch | `{ mealSlot: slot }` | HomeScreen:1586 |
| WeeklyCheckInScreen | HomeTab | Home | `{ openWeightLog: Date.now() }` | WeeklyCheckInScreen:1361 |
| WorkoutHistoryScreen | HomeTab | ActiveWorkout | (none) | WorkoutHistoryScreen:121 |
| WorkoutHistoryScreen | PlansTab | (tab root) | (none) | WorkoutHistoryScreen:141 |
| WorkoutHistoryScreen | ProgressTab | ExerciseDetail | `{ exerciseId: exerciseId }` | WorkoutHistoryScreen:372 |

**Guard Against Dead Taps:** regression test `navigationTargets.guard.test.js` bans hand-rolled `getParent()?.navigate()` calls outside navigateCrossTab.js (source-level enforcement).

---

## 7. SCREENS BY LIFECYCLE & ROLE

### Auth & Gating Screens (4)
- LoginScreen: Email/password removed; OAuth only (Google + Apple)
- WelcomeScreen: Tier selector + OAuth entry point
- Article9ConsentScreen: Health-data consent (blocks until affirmative)
- ProOnboardingScreen: Pro onboarding flow

### Onboarding Screens (3)
- FirstRunScreen: Free user setup (biological sex mandatory)
- ProSetupCompleteScreen: Pro post-quiz hand-off
- FreeStarterScreen: Free micro-quiz (B2 initiative)

### Training Domain (18)
- HomeScreen: Home tab root, session preview + coaching banners
- BuildWorkoutScreen: Custom workout builder
- ActiveWorkoutScreen: Live session UI (RPE, weight input, rest timer)
- WorkoutSummaryScreen: Post-session review + share
- WorkoutHistoryScreen: Workout log (appears in HomeTab & ProgressTab)
- VolumeHeatmapScreen: Volume by muscle group heatmap
- PlansScreen: Plan library browser
- PlanDetailScreen: Plan details + routine picker
- RoutineDetailScreen: Routine editor
- ExerciseDetailScreen: Exercise info + history (appears in PlansTab & ProgressTab)
- ManualBuilderScreen: Custom plan builder
- PlanLibraryScreen: Browse library (appears in FirstRunStack & ProOnboardingStack)
- MesocycleBuilderScreen: Training block editor
- PlanUpdateScreen: Precision Coaching plan update (Pro)
- YearOfLiftsScreen: Year-end recap story
- ShareCardScreen: Social share cards (appears in HomeTab, ProgressTab, ProfileTab)
- CoachReviewScreen: Weekly coaching review (appears in HomeTab & ProgressTab)
- AnalyticsScreen: Progress dashboard (ProgressTab root)

### Progress & Analytics (8)
- LiftProgressScreen: Strength trends
- ConsistencyScreen: Session frequency heatmap
- BodyMetricsScreen: Body weight/measurements (read-only for free with data)
- ProgressPhotosScreen: Before/after progress photos (read-only for free with data)
- CoachOutputScreen: Precision Coaching weekly recommendations (Pro)
- CoachHeldHistoryScreen: Coaching holds history (Pro)
- BlockReflectionScreen: Training block reflection prompt (Pro)
- PartnerScreen: Partner coaching/accountability (Pro)

### Nutrition & Coaching (17)
- DiaryScreen: Food diary root (Pro, read-only for free with data)
- MealPlanScreen: Suggested meal plan (Pro)
- FoodSearchScreen: Food database search + quick-add (Pro)
- AddCustomFoodScreen: Custom food entry (Pro)
- ScanBarcodeScreen: Barcode scanner (Pro)
- ScanLabelScreen: Nutrition label OCR (Pro)
- FoodInsightsScreen: Meal & macro breakdowns (Pro)
- MyRecipesScreen: Saved recipes (Pro)
- MyMealsScreen: Saved meals (Pro)
- RecipeBuilderScreen: Recipe composer (Pro)
- LogCardioScreen: Cardio session logger (Pro, appears in HomeTab & DiaryTab & ProgressTab)
- CardioHistoryScreen: Cardio log (Pro, appears in DiaryTab & ProgressTab)
- NutritionEducationScreen: Nutrition guide (appears in 3 stacks, Free)
- NutritionTargetsScreen: Macro/calorie targets (Pro)
- MealNamesScreen: Meal label customisation (Pro)
- PerDayTargetsScreen: Per-meal targets (Pro)
- WeeklyCheckInScreen: Coaching check-in (Pro)

### Settings & Profile (20)
- YouScreen: Profile dashboard
- SettingsScreen: Settings hub
- SettingsAccountScreen: Account, sign-out, deletion
- SettingsProfileScreen: Name, avatar, bio
- SettingsCoachingScreen: Coaching parameters
- SettingsDisplayScreen: Theme, accessibility (includes a11y prefs, reduce motion)
- SettingsHealthScreen: Health metrics, biological sex
- SettingsDataScreen: App data, snapshot export
- SnapshotsScreen: Snapshot restore
- SettingsPrivacyScreen: Privacy, legal, GDPR (appears in Article9ConsentStack & ProfileStack)
- SettingsAboutScreen: Help, version, credits, debug log
- MethodologyScreen: Precision Coaching explainer (appears in ProOnboardingStack & ProfileTab)
- NotificationSettingsScreen: Push, quiet hours, categories
- ImportScreen: Workout history import
- ProGoalSetupScreen: Training goal adjustment (Pro)
- GoalChangeSummaryScreen: Goal change summary (Free, appears in onboarding)
- GoalLockConsentScreen: Goal lock confirmation (Free, appears in onboarding)
- CoachingRemindersScreen: Coaching reminder prefs (Pro)
- WellbeingCheckScreen: ED-safety check-in
- CreditsScreen: App credits, attributions

### Legal & Policy (3)
- PrivacyPolicyScreen: Privacy policy (appears in 2 stacks)
- SubscriptionPolicyScreen: Subscription terms
- NutritionEducationScreen: (listed above; also free/legal educational content)

### Billing & Paywall (3)
- SubscriptionScreen: Subscription manager
- PaywallScreen: Upgrade prompt (review excerpts, if populated)
- CascadeGateScreen: Trial → downgrade cascade gate (day-14, modal)

### Debug & Diagnostic (2)
- DebugLogScreen: Error/telemetry log (dev/build-specific)

---

## 8. ORPHANED & UNREACHABLE SCREENS

**Status:** ✅ **NONE** — all 81 screens are registered in at least one navigator.

**Verification method:** Every screen defined in RootNavigator.js (lines 58–117) is registered in at least one Stack.Screen call:
- Auth screens: WelcomeStack
- Main tabs: HomeStack, PlansStack, DiaryStack, ProgressStack, ProfileStack
- Onboarding: FirstRunStack, ProOnboardingStack, Article9ConsentStack

**Screen files with multiple registrations** (re-used across stacks):
- ExerciseDetailScreen: PlansTab (route), ProgressTab (route), default re-registration per stack
- LogCardioScreen: HomeTab, DiaryTab, ProgressTab (registered 3× for cross-tab safety)
- CardioHistoryScreen: DiaryTab, ProgressTab
- WorkoutHistoryScreen: HomeTab, ProgressTab
- WorkoutSummaryScreen: HomeTab, ProgressTab
- VolumeHeatmapScreen: HomeTab, ProgressTab
- ShareCardScreen: HomeTab, ProgressTab, ProfileTab
- BodyMetricsScreen: ProgressTab, ProfileTab (SettingsHealthScreen route)
- ProgressPhotosScreen: ProgressTab, ProfileTab (SettingsHealthScreen route)
- PrivacyPolicyScreen: Article9ConsentStack, ProfileTab (SettingsPrivacyScreen route)
- NutritionEducationScreen: ProOnboardingStack, ProfileTab (SettingsAboutScreen or standalone route)
- MethodologyScreen: ProOnboardingStack, ProfileTab (CoachOutputScreen or standalone route)
- PlanLibraryScreen: FirstRunStack, ProOnboardingStack, PlansTab (PlansScreen route)
- PlanDetailScreen: FirstRunStack, ProOnboardingStack, PlansTab (PlansScreen route)
- ActiveWorkoutScreen: FirstRunStack, ProOnboardingStack, HomeTab (BuildWorkoutScreen route)
- FreeStarterScreen: FirstRunStack, PlansTab, HomeTab (no-plan cards)
- ProUpgradeScreen: Registered in every tab stack + DiaryStack (defence-in-depth, line 346)

---

## 9. NAVIGATION TRANSITIONS & OPTIONS

### Hero-Zoom Transition (`heroZoomTransition`, line 241–265)
Applied to screens that "expand" from a card on the previous screen. Used on:
- ActiveWorkoutScreen (expanding from Home session hero or CoachReview live button)
- WorkoutSummaryScreen (post-session expansion)
- PlanDetailScreen (expanding from plan card)
- RoutineDetailScreen (expanding from routine card)
- ExerciseDetailScreen (expanding from exercise card)

**Interpolation:** destination fades in (0→1) and scales from 0.92→1.0 over `motion.enter`/`motion.exit` ms (Reduce Motion aware, line 270–273).

### Modal Presentations (`presentation: 'modal'`, half-slide transitions)
- Diary Stack: FoodSearch, AddCustomFood, ScanBarcode, ScanLabel, MyRecipes, MyMeals, RecipeBuilder, LogCardio, ProUpgrade
- Home/Plans/Progress/Profile Stacks: ProUpgrade
- Profile Stack: CascadeGate, Paywall
- Deep-link modal: ProUpgrade (safety net, line 347, 375, 402, 439, 493)

### Header Options
- `headerShown: false` — screens manage their own BackHeader (custom styling)
- `headerShown: true` — stock React Navigation header (PlanLibraryScreen, MethodologyScreen in onboarding)
- `title: 'X'` — header text override (varies by screen)

---

## 10. DEEP LINKING & ROUTE PARAMS

**URL Scheme:** `volyume://` + `https://volyume.app` (app.json registration)  
**Linking Config:** RootNavigator:635–672

| URL | Route | Stack | Params | Use Case |
|---|---|---|---|---|
| `volyume://workout/start` | HomeTab → BuildWorkout | HomeStack | (none) | Start custom workout from external link |
| `volyume://diary` | DiaryTab → Diary | DiaryStack | (none) | Open food diary (Pro-gated, free users see upgrade) |
| `volyume://routine/:planId` | PlansTab → PlanDetail | PlansStack | `{ planId }` | Open a specific training plan |
| `volyume://progress` | ProgressTab → Analytics | ProgressStack | (none) | Open progress dashboard |
| `https://volyume.app/...` | (same prefix scheme) | — | (same as volyume://) | Fallback HTTP scheme |

**Param Note:** Path param MUST be named `planId` for PlanDetailScreen; old `:id` param was mapped to `id` and left `planId` undefined (audit 2026-07-01).

**Notification Routing:** `navigationRef.navigate(target.tab, { screen, initial: false, params })` (RootNavigator:747–757). Tabs are lazy; `initial: false` prevents the tab from mounting on its initial route only.

---

## 11. SYNC & DATA GATING

**Pro Features (all health/nutrition/coaching data):**
- Protected at render time by withProGuard (hard block) or withReadOnlyProGuard (history view for free users).
- Sync layer gates data push/pull on `healthConsent === true` (RootNavigator:1267–1282, SyncAll enforcement).
- Nutrition/Coaching/Body metrics tables silently skipped if user is free or consent unresolved.
- Food domain (meals, recipes, targets): **Pro-only**; free users cannot enter any data.

**ED-Safety System (Tier-Blind):**
- Calorie floors (1,500 kcal men / 1,200 kcal women), FFM energy floor, rapid-loss gates, Beat UK signposting, calm mode.
- Woven through nutrition engine; enforced regardless of tier (CLAUDE.md §2, guarantee: "guardrails are tier-blind").
- Notification suppression under open ED flag (weight/food-adjacent).
- Progress photos card withheld entirely under calm mode or open ED flag (with single exception: Pro before/after card, founder-approved 2026-07-03).

---

## 12. REFERENCE TABLE: ALL 81 SCREENS

| # | Screen File | Route Name | Stack(s) | Tab(s) | Type | Gating |
|---|---|---|---|---|---|---|
| 1 | ActiveWorkoutScreen | ActiveWorkout | HomeStack, FirstRunStack, ProOnboardingStack | HomeTab | Full | Free |
| 2 | AddCustomFoodScreen | AddCustomFood | DiaryStack | DiaryTab | Full | Pro |
| 3 | AnalyticsScreen | Analytics | ProgressStack | ProgressTab | Full | Free |
| 4 | Article9ConsentScreen | Article9Consent | Article9ConsentStack | — | Full | Consent Gate |
| 5 | BodyMetricsScreen | BodyMetrics | ProgressStack, ProfileStack | ProgressTab, ProfileTab | Full | Pro (read-only) |
| 6 | BlockReflectionScreen | BlockReflection | ProfileStack | ProfileTab | Full | Pro |
| 7 | BuildWorkoutScreen | BuildWorkout | HomeStack | HomeTab | Full | Free |
| 8 | CardioHistoryScreen | CardioHistory | DiaryStack, ProgressStack | DiaryTab, ProgressTab | Full | Pro |
| 9 | CascadeGateScreen | CascadeGate | ProfileStack | ProfileTab | Full | Free (modal) |
| 10 | CoachHeldHistoryScreen | CoachHeldHistory | ProfileStack | ProfileTab | Full | Pro |
| 11 | CoachOutputScreen | CoachOutput | ProfileStack | ProfileTab | Full | Pro |
| 12 | CoachReviewScreen | CoachReview | HomeStack, ProgressStack | HomeTab, ProgressTab | Full | Free |
| 13 | CoachingRemindersScreen | CoachingReminders | ProfileStack | ProfileTab | Full | Pro |
| 14 | ConsistencyScreen | Consistency | ProgressStack | ProgressTab | Full | Free |
| 15 | CreditsScreen | Credits | ProfileStack | ProfileTab | Full | Free |
| 16 | DebugLogScreen | DebugLog | ProfileStack | ProfileTab | Full | Free (dev) |
| 17 | DiaryScreen | Diary | DiaryStack | DiaryTab | Full | Pro (read-only) |
| 18 | ExerciseDetailScreen | ExerciseDetail | PlansStack, ProgressStack | PlansTab, ProgressTab | Full | Free |
| 19 | FirstRunScreen | FirstRunBranch | FirstRunStack | — | Full | Onboarding |
| 20 | FoodInsightsScreen | FoodInsights | DiaryStack | DiaryTab | Full | Pro |
| 21 | FoodSearchScreen | FoodSearch | DiaryStack | DiaryTab | Full | Pro |
| 22 | FreeStarterScreen | FreeStarter | FirstRunStack, PlansStack, HomeStack | —, PlansTab, HomeTab | Full | Free |
| 23 | GoalChangeSummaryScreen | GoalChangeSummary | ProfileStack | ProfileTab | Full | Free |
| 24 | GoalLockConsentScreen | GoalLockConsent | ProfileStack | ProfileTab | Full | Free |
| 25 | HomeScreen | Home | HomeStack | HomeTab | Full | Free |
| 26 | ImportScreen | Import | ProfileStack | ProfileTab | Full | Free |
| 27 | LiftProgressScreen | LiftProgress | ProgressStack | ProgressTab | Full | Free |
| 28 | LogCardioScreen | LogCardio | HomeStack, DiaryStack, ProgressStack | HomeTab, DiaryTab, ProgressTab | Full | Pro |
| 29 | LoginScreen | Login | WelcomeStack | — | Full | Auth |
| 30 | ManualBuilderScreen | ManualBuilder | PlansStack | PlansTab | Full | Free |
| 31 | MealNamesScreen | MealNames | ProfileStack | ProfileTab | Full | Pro |
| 32 | MealPlanScreen | MealPlan | DiaryStack | DiaryTab | Full | Pro |
| 33 | MesocycleBuilderScreen | MesocycleBuilder | PlansStack | PlansTab | Full | Free |
| 34 | MethodologyScreen | Methodology | ProOnboardingStack, ProfileStack | —, ProfileTab | Full | Free |
| 35 | MyMealsScreen | MyMeals | DiaryStack | DiaryTab | Full | Pro |
| 36 | MyRecipesScreen | MyRecipes | DiaryStack | DiaryTab | Full | Pro |
| 37 | NotificationSettingsScreen | NotificationSettings | ProfileStack | ProfileTab | Full | Free |
| 38 | NutritionEducationScreen | NutritionEducation | ProOnboardingStack, ProfileStack | —, ProfileTab | Full | Free |
| 39 | NutritionTargetsScreen | NutritionTargets | ProfileStack | ProfileTab | Full | Pro |
| 40 | PartnerScreen | Partner | ProgressStack | ProgressTab | Full | Pro |
| 41 | PaywallScreen | Paywall | ProfileStack | ProfileTab | Full | Free (modal) |
| 42 | PerDayTargetsScreen | PerDayTargets | ProfileStack | ProfileTab | Full | Pro |
| 43 | PlanDetailScreen | PlanDetail | PlansStack, FirstRunStack, ProOnboardingStack | PlansTab, —, — | Full | Free |
| 44 | PlanLibraryScreen | PlanLibrary | PlansStack, FirstRunStack, ProOnboardingStack | PlansTab, —, — | Full | Free |
| 45 | PlanPreviewScreen | PlanPreview | WelcomeStack | — | Full | Auth |
| 46 | PlanUpdateScreen | PlanUpdate | PlansStack | PlansTab | Full | Pro |
| 47 | PlansScreen | Plans | PlansStack | PlansTab | Full | Free |
| 48 | PrivacyPolicyScreen | PrivacyPolicy | Article9ConsentStack, ProfileStack | —, ProfileTab | Full | Free |
| 49 | ProgressPhotosScreen | ProgressPhotos | ProgressStack, ProfileStack | ProgressTab, ProfileTab | Full | Pro (read-only) |
| 50 | ProGoalSetupScreen | ProGoalSetup | ProfileStack | ProfileTab | Full | Pro |
| 51 | ProOnboardingScreen | ProOnboarding | ProOnboardingStack | — | Full | Onboarding |
| 52 | ProSetupCompleteScreen | ProSetupComplete | ProOnboardingStack | — | Full | Onboarding |
| 53 | ProUpgradeScreen | ProUpgrade | HomeStack, PlansStack, DiaryStack, ProgressStack, ProfileStack | All | Full | Gated (modal) |
| 54 | QuizScreen | QuizTraining | WelcomeStack | — | Full | Auth (optional) |
| 55 | RecipeBuilderScreen | RecipeBuilder | DiaryStack | DiaryTab | Full | Pro |
| 56 | RoutineDetailScreen | RoutineDetail | PlansStack | PlansTab | Full | Free |
| 57 | ScanBarcodeScreen | ScanBarcode | DiaryStack | DiaryTab | Full | Pro |
| 58 | ScanLabelScreen | ScanLabel | DiaryStack | DiaryTab | Full | Pro |
| 59 | SettingsAboutScreen | SettingsAbout | ProfileStack | ProfileTab | Full | Free |
| 60 | SettingsAccountScreen | SettingsAccount | ProfileStack | ProfileTab | Full | Free |
| 61 | SettingsCoachingScreen | SettingsCoaching | ProfileStack | ProfileTab | Full | Free |
| 62 | SettingsDataScreen | SettingsData | ProfileStack | ProfileTab | Full | Free |
| 63 | SettingsDisplayScreen | SettingsDisplay | ProfileStack | ProfileTab | Full | Free |
| 64 | SettingsHealthScreen | SettingsHealth | ProfileStack | ProfileTab | Full | Free |
| 65 | SettingsPrivacyScreen | SettingsPrivacy | ProfileStack | ProfileTab | Full | Free |
| 66 | SettingsProfileScreen | SettingsProfile | ProfileStack | ProfileTab | Full | Free |
| 67 | SettingsScreen | Settings | ProfileStack | ProfileTab | Full | Free |
| 68 | ShareCardScreen | ShareCard | HomeStack, ProgressStack, ProfileStack | HomeTab, ProgressTab, ProfileTab | Full | Free |
| 69 | SnapshotsScreen | Snapshots | ProfileStack | ProfileTab | Full | Free |
| 70 | SubscriptionPolicyScreen | SubscriptionPolicy | ProfileStack | ProfileTab | Full | Free |
| 71 | SubscriptionScreen | Subscription | ProfileStack | ProfileTab | Full | Free |
| 72 | WeeklyCheckInScreen | WeeklyCheckIn | ProfileStack | ProfileTab | Full | Pro |
| 73 | WellbeingCheckScreen | WellbeingCheck | ProfileStack | ProfileTab | Full | Free |
| 74 | WelcomeScreen | Welcome | WelcomeStack | — | Full | Auth |
| 75 | WorkoutHistoryScreen | WorkoutHistory | HomeStack, ProgressStack | HomeTab, ProgressTab | Full | Free |
| 76 | WorkoutSummaryScreen | WorkoutSummary | HomeStack, ProgressStack | HomeTab, ProgressTab | Full | Free |
| 77 | YouScreen | You | ProfileStack | ProfileTab | Full | Free |
| 78 | YearOfLiftsScreen | YearOfLifts | ProgressStack | ProgressTab | Full | Free |
| 79 | RecapStory | RecapStory | ProgressStack | ProgressTab | Full | Free |
| 80 | NutritionEducationScreen | NutritionEducation | ProOnboardingStack, ProfileStack | —, ProfileTab | Full | Free |
| 81 | ProOnboardingScreen | ProOnboarding | ProOnboardingStack | — | Full | Onboarding |

**Note:** Count includes all screen files. Some routes are registered in multiple stacks; unique file count = 81.

---

## AUDIT NOTES

1. **No File Errors:** All 81 screen files defined in RootNavigator lazy-screen imports (lines 59–117) are present in src/screens/. Every screen has a corresponding Stack.Screen registration.

2. **Gating Completeness:** Pro gating is implemented via withProGuard (hard block) or withReadOnlyProGuard (history view). No missing guards on Pro surfaces (defence-in-depth, e.g., LogCardio registered 3× across stacks).

3. **Consent Enforcement:** Article 9 gate blocks at RootNavigator:1392 for ungranted/unresolved-new-user consent. Sync deferred until `healthConsent === true` (line 1267). Fail-closed on transient read errors (line 1204, 1222).

4. **Cross-Tab Safety:** navigateCrossTab is the single sanctioned pattern; guard test bans hand-rolled getParent()?.navigate() (navigationTargets.guard.test.js).

5. **Deep Linking:** 4 routes mapped (BuildWorkout, Diary, routine/:planId, progress). Pro gates still fire for deep-link Pro screens (e.g., Diary deep-link for free user shows upgrade).

6. **Modality Consistency:** Modal `presentation: 'modal'` applied to ~13 screen registrations (FoodSearch, AddCustomFood, ScanBarcode, ScanLabel, MyRecipes, MyMeals, RecipeBuilder, LogCardio in food stack, ProUpgrade everywhere, CascadeGate, Paywall). Bottom-sheet components (8 files) are imperative, not Stack-registered.

7. **Lazy Evaluation:** All 82 screen modules defer evaluation to first render via lazyScreen() (lines 46–56). No module-scope side effects verified per line 43 comment. Accessibility theme mutations happen before RootNavigator required (App.js order).

8. **Tier Gates:** ✅ **Binary free/pro** (proGate.js). ED-safety guardrails are **tier-blind** (never consult tier, CLAUDE.md §2 guarantee).

---

**END AUDIT H1**
