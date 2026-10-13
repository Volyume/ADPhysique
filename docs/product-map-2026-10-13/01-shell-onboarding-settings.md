# 01 - App shell, onboarding and identity, Home and Coach tabs, Settings, flags, build config

Slice: product map of Volyume v2.14.0 (2026-10-13). Source of truth is the code. Labels: OBSERVED = read in code; INFERRED = reasoned from what was read; NOT TRACED = said so. Status vocabulary: LIVE, CONDITIONAL (condition named), BACKGROUND, DORMANT/LEGACY. British English, no em dashes.

Files read for this slice: App.js, index.js, app.json, package.json, eas.json, react-native.config.js, src/navigation/* (RootNavigator.js 2434 lines, navTheme.js, navigateCommunity.js, navigateCrossTab.js, safeGetStateFromPath.js), src/store/useAppStore.js (2512 lines), src/hooks/*, src/screens/{Welcome,Login,Quiz,PlanPreview,Article9Consent,ProOnboarding,ProSetupComplete,ProGoalSetup,GoalLockConsent,Home,You,Settings*,...}, src/lib/{onboarding,consent,home,widgets}, src/widgets/*, plugins/withVolyumeWidget.js, src/lib/proGate.js, src/lib/sync/featureFlags.js, src/hooks/useAccountActions.js, src/components/auth/*.

---

## 1. Product in one paragraph (OBSERVED)

Volyume is a fully free (no tier, no ads, no paywall) offline-first coaching app: six bottom tabs (Today, Train, Nutrition, Progress, Community, Coach), a six-step-plus wizard (eight steps, two skippable) after account creation, a deterministic weekly coach, a Settings tree reached from the Coach tab, and Android home-screen widgets. Free state is enforced by `FULL_ACCESS_FOR_ALL = true` (src/lib/proGate.js:43), which forces the stored tier to `'pro'` everywhere (src/store/useAppStore.js:44-47). Welcome screen copy: "Completely free · No ads" (src/screens/WelcomeScreen.js, actions block).

---

## 2. App shell

### 2.1 Boot sequence (OBSERVED)

| Stage | What happens | Where |
|---|---|---|
| index.js | On Android only, tries to register the react-native-android-widget task handler (`src/widgets/widgetTaskHandler`); wrapped in try/catch so builds without the widget plugin do nothing. Then `registerRootComponent(App)`. | index.js:5-19 |
| App.js module scope | `SplashScreen.preventAutoHideAsync`; `installGlobalHandlers()` (error ring buffer); `initSentry`; `tryWireRealProvider()` (loads react-native-iap provider; the barrel disables use, see 2.6); defines two TaskManager tasks: `VOLYUME_REST_TIMER_KEEPALIVE` (no-op to keep iOS JS alive) and `VOLYUME_DAILY_SYNC` (calls `syncAll({triggeredBy:'periodic'})`, `writeWidgetSnapshot`, `retryPendingJoin` for Community); sets the notification handler (alerts shown only for `rest-done` channel). | App.js:42-170 |
| bootstrapVisualSystem | Loads accessibility prefs, applies them to theme tokens BEFORE RootNavigator is required (screens' StyleSheet.create read post-accessibility tokens), loads fonts. | App.js:193-212 |
| App component | Provider tree: ErrorBoundary > GestureHandlerRootView > KeyboardProvider > BottomSheetModalProvider > SafeAreaProvider > ToastProvider > FeedbackProvider > RootNavigator. Registers: OTA check (non-DEV), notification channels + tap wiring, `BackgroundFetch.registerTaskAsync(VOLYUME_DAILY_SYNC)`, AppState listener (background: widget snapshot write + sync push; foreground: sync), reconnect sync, 15-minute periodic sync, deep link listener (`Linking`, `handleAuthDeepLink` for email-confirmation/reset links, `captureFirstTouch` attribution), iOS quick actions (`workout` -> HomeTab/BuildWorkout, `diary` -> DiaryTab/Diary), system Reduce Motion listener, crash-recovery toast ("Volyume crashed last session. Report sent." with Add details -> FeedbackSheet). | App.js:395-1125 |
| ErrorBoundary | Last-resort crash screen with incident id `V-xxxxxx`, writes `@volyume_crash_log`, support link. Hard-coded hex colours on purpose. | App.js:301-400 |
| RootNavigator bootstrap | Opens SQLCipher DB (`initDatabase`, 12 s timeout `DB_INIT_TIMEOUT_MS`, Retry screen "Couldn't open your data" on failure), runs exercise seed chain, `checkFirstRun`/`checkTier` (AsyncStorage only), `auth.getSession()` restore, installs `onAuthStateChange` listener, restores notifications, installs notification tap listeners. | RootNavigator.js:1087-1730, 1245 |

OTA note (OBSERVED + INFERRED): App.js:625-646 calls `Updates.checkForUpdateAsync()` and shows "Update available / Restart now" alert. app.json has `runtimeVersion.policy = appVersion` but NO `updates` block and no `updates.url` (grep of app.json: only a sentry `url`). INFERRED: OTA may not be configured in builds, in which case the check silently throws into the catch. NOT VERIFIED against EAS dashboard. Comments elsewhere ("OTA-patchable writer", src/lib/widgets/writer.js header) assume OTA works.

### 2.2 RootNavigator gating order (OBSERVED, src/navigation/RootNavigator.js:2291-2350 `renderNavigator()` plus the guards before it)

Pre-navigator guards, in order (all return a bare background `SplashScreen` View or an error screen, never a navigator):

1. Boot gate: `!freshInstallOpen && (!splashReady || !firstRunChecked || !tierChecked || !initialAuthResolved)` -> blank splash (RootNavigator.js:2197). A verified FRESH INSTALL (no owner marker `@volyume_last_supabase_user_id` AND no stored auth session, `classifyFreshInstall`) skips the auth latch so Welcome shows at first frame (D149).
2. `classifyAuthBoot(...) === 'auth_retry'` -> "Couldn't check your sign-in" screen with "Try again" / "Go to sign in" (only when a prior session existed and auth gave up).
3. `dbInitFailed` -> "Couldn't open your data" with Try again.

Then `renderNavigator()`:

| Order | Condition | Renders | Notes |
|---|---|---|---|
| 1 | `!user` | `WelcomeStack` (Welcome, QuizTraining, PlanPreview, Login, PrivacyPolicy) | No anonymous mode. |
| 2 | `user && !user.isLocal && !firstRunComplete && !healthConsentChecked` | blank Splash (consent resolver) | 15 s failsafe `CONSENT_LATCH_FAILSAFE_MS` sets consent to `null` (never `true`) so the user falls into the gate. |
| 3 | `healthConsentChecked && (healthConsent === false || (healthConsent == null && !firstRunComplete))` | `Article9ConsentStack` (Article9Consent, PrivacyPolicy) | Fails closed for NEW users with an unresolved consent read. A RETURNING user (firstRunComplete) with a null read is NOT re-prompted (comment RootNavigator.js ~2318-2326). |
| 4 | `!firstRunComplete` | `ProOnboardingStack` | The ONE setup path; FirstRunStack and FreeStarter screens were deleted. |
| 5 | else | `LockedMainTabs` = `MainTabs` wrapped by the opt-in biometric lock overlay | `useAppLockGate` (src/lib/biometricLock.js), pref in expo-secure-store, per device. |

Tier is NOT a gate any more (the "tier" element of the CLAUDE.md order is vestigial): `tierChecked` only gates the splash; no branch reads `tier`. `checkFirstRun` fails OPEN to `firstRunComplete: true` on an AsyncStorage error (useAppStore.js:1366-1372) but the consent branch is independent.

Consent read mechanism (RootNavigator.js:1960-1990): on SIGNED_IN/INITIAL_SESSION, reads AsyncStorage cache `@volyume_health_consent_<uid>`; if `'true'` trusts it, else reads `users_profile.health_data_consent` from Supabase; read error -> `setHealthConsent(null, true)`.

Auth listener (RootNavigator.js:1756+): SIGNED_OUT wipes; SIGNED_IN/INITIAL_SESSION run an admission guard, a 3 s duplicate-enter dedupe (`_lastAuthEnter`), `restoreSessionFromCloud`, consent check, `runFreeConversionOnce` (drains residual trial notifications/keys, src/lib/payments/freeConversion.js), `restoreNotifications`, habit-schedule refresh, `syncAll`, telemetry flush.

### 2.3 Tabs (OBSERVED, RootNavigator.js:731-805)

Custom tab bar `VolyumeTabBar` (sliding pill plus active-session mini-bar). Internal ids are stable for deep links; visible titles differ.

| Tab id | Visible title | Icon | Stack root screen | Notes |
|---|---|---|---|---|
| HomeTab | Today | today | Home | initial tab unless `postSetupLanding` is set (wizard payoff can land on PlansTab, D147). |
| PlansTab | Train | barbell | Plans | |
| DiaryTab | Nutrition | nutrition | Diary | |
| ProgressTab | Progress | stats-chart | Analytics | |
| CommunityTab | Community | people | Community (CommunityHubScreen) | `initialRouteName="Community"`. |
| ProfileTab | Coach | pulse | You (YouScreen) | Hosts the whole Settings tree and the coaching screens. |

Tabs are lazy (non-initial tabs mount on first focus; notification and deep-link navigation use `initial:false` so the tab root is not stranded). Re-pressing the focused tab pops its stack to the root (NAV-5). Tab change fires a selection haptic.

### 2.4 Deep links and notification routing (OBSERVED, RootNavigator.js:900-1085)

Scheme `volyume://`; universal link host `https://volyume.app`. Android intent filters in app.json for scheme `volyume` and `volyume.app` path prefixes `/partner`, `/u`, `/p`, `/s`, `/g/`. Parser is `safeGetStateFromPath` (bounds and validates the path before React Navigation's decode-uri-component, a ReDoS defence). Legacy `partner/<CODE>` is rewritten to `community?legacyPartnerCode=` (the retired Partners feature; Community shows a "Partner invites have moved" card).

| Link | Resolves to |
|---|---|
| `workout/start` | HomeTab > BuildWorkout |
| `active-workout` | HomeTab > Home (deliberately NOT ActiveWorkout, because the session is restored by HomeScreen's mount effect) |
| `community` | CommunityTab > Community |
| `u` (`?h=`), `s` (`?id=`), `m` (`?id=`), `g` (`?id=`) | CommunityProfile / CommunityPost / CommunityConversation / CommunityGroup |
| `diary/:date?` | DiaryTab > Diary |
| `routine/:planId` | PlansTab > PlanDetail |
| `progress` | ProgressTab > Analytics |
| `coach` | ProfileTab > CoachOutput |
| `checkin` | ProfileTab > WeeklyCheckIn |

Not deep-linkable (OBSERVED, absent from `linking.config`): `/p` path prefix is declared in the Android manifest but there is NO `p` mapping in `linking.config` (grep RootNavigator.js:980-1070). INFERRED: `https://volyume.app/p...` opens the app but does not route. Notification taps use `routeForNotificationType(type, data)` (src/lib/notifications/notificationRoute.js) and navigate with `initial:false` retrying up to 20 times at 150 ms.

Signed-out or mid-onboarding users cannot resolve any of these (the target stacks are not mounted), so links are inert until MainTabs is mounted.

### 2.5 Navigation helpers (OBSERVED)

| File | Purpose |
|---|---|
| src/navigation/navigateCrossTab.js | `navigateCrossTab(navigation, tab, screen, params)`: pops the target tab's stack to root if deep, then `parent.navigate(tab, {screen, params, initial:false})`. No-op if no parent. Used widely (Home, You, Settings). |
| src/navigation/navigateCommunity.js | Pushes in-stack if the current navigator has the route, otherwise hops to CommunityTab. Exists because HomeStack registers only CommunityCompose and CommunityPost as duplicates. |
| src/navigation/safeGetStateFromPath.js | Bounded, validated path parsing. |
| src/navigation/navTheme.js | `useNavTheme`, `useStackOptions`: live theme for headers/cards (CP-10 restart-free theming). |
| Per-screen error boundaries | `withScreenBoundaries(createStackNavigator())` wraps every registered screen in a ScreenBoundary; a throw degrades to a calm fallback inside the still-mounted stack, so the consent gate cannot be skipped by a crash. |
| Lazy screens | `lazyScreen(() => require(...))` defers module evaluation to first render. |

Transitions: `heroZoomTransition` (centre zoom) for ActiveWorkout, WorkoutSummary, PlanDetail, RoutineDetail; `heroZoomOptions` (origin-aware growth from a tapped card) for ExerciseDetail, CommunityProfile, CommunityGroup, CommunityPost. Reduce Motion disables stack animation (`useStackMotionOverride`).

### 2.6 Dormant billing in the shell (OBSERVED)

- `src/lib/payments/index.js` is the barrel; while `FULL_ACCESS_FOR_ALL` is true, `cascade`, `playBilling`, `restorePurchases`, `handlePotentialLapse` resolve to inert stubs (index.js:31, 62, 73, 86, 92).
- RootNavigator still calls the barrel at: reconcile (242-254), `playBilling.initialise` (1617-1618), `playBilling.logOut` (1797). All inert.
- App.js:60-65 requires `./src/lib/payments/playBilling` DIRECTLY (not the barrel) and calls `tryWireRealProvider()` at module scope. That loads the native react-native-iap module and injects the real provider. The provider's `initialise()` is only reached via the barrel (inert), so no store connection is opened (INFERRED from code; not device-tested). This is a bypass of the "barrel is the boundary" design.
- `src/lib/payments/freeConversion.js` is required directly by RootNavigator (1644) and is LIVE: a one-shot per-uid migration that cancels residual trial/win-back pushes and cached trial keys.
- Residual tier readers still exist and all see `'pro'`: src/lib/notifications/scheduler.js:463-468, 572, 1151, 1507 (`tier !== 'pro'` early-outs), src/screens/SettingsDataScreen.js (`tier === 'pro'` gates the "Skip name on label scans" row), src/lib/blockAdvisor.js (`isPro` param). Flipping the flag off would silently change these (see section 9 observation B3).

### 2.7 Complete table of src/screens (109 directory entries)

`ls src/screens` = 109 entries = 108 `.js` files plus the `__tests__` directory (325 test files, not product). Of the 108: 103 registered screens, 4 dormant billing screens (unregistered), 1 non-screen helper (`paywallExcerpts.js`). Registration was computed by script over `<Stack.Screen name= component=>` in RootNavigator.js; "refs" evidence is a grep of quoted route names across non-test src.

Legend: Status LIVE = registered and has at least one navigate call or is a stack root; CONDITIONAL = needs state; DORMANT = not reachable; ORPHAN = registered but no code path navigates to it.

#### Onboarding and identity (stack: WelcomeStack, Article9ConsentStack, ProOnboardingStack)

| Screen | Lines | Area | Tab / stack and route | Reachability |
|---|---|---|---|---|
| WelcomeScreen | 229 | Onboarding | WelcomeStack `Welcome` (root) | LIVE when signed out. Opens AuthSheet (sign-up / sign-in). |
| LoginScreen | 13 | Onboarding | WelcomeStack `Login` | LIVE but a thin wrapper that renders WelcomeScreen with the sheet open. Only referrer: PlanPreviewScreen (dormant flow) and `intent:'pro_signup'` param. Effectively a duplicate route. |
| QuizScreen | 236 | Onboarding | WelcomeStack `QuizTraining` | DORMANT: only reached from WelcomeScreen when `ONBOARDING_QUIZ_FIRST` is true (it is false). |
| PlanPreviewScreen | 98 | Onboarding | WelcomeStack `PlanPreview` | DORMANT: only reached from QuizScreen. |
| Article9ConsentScreen | 500 | Onboarding / compliance | Article9ConsentStack `Article9Consent` | CONDITIONAL: signed in and (consent false, or unresolved for a new user). |
| ProOnboardingScreen | 3945 | Onboarding | ProOnboardingStack `ProOnboarding` | CONDITIONAL: signed in, consent granted, `firstRunComplete` false. |
| ProSetupCompleteScreen | 850 | Onboarding | ProOnboardingStack `ProSetupComplete` | CONDITIONAL: `navigation.replace` from wizard step 8. |
| PrivacyPolicyScreen | 275 | Legal | registered in WelcomeStack, Article9ConsentStack, ProfileStack | LIVE (also from AuthSheet, SettingsPrivacy). |

#### Today tab (HomeStack)

| Screen | Lines | Route | Reachability |
|---|---|---|---|
| HomeScreen | 3817 | `Home` (root) | LIVE |
| BuildWorkoutScreen | 767 | `BuildWorkout` | LIVE (Home "change workout" sheet, deep link `workout/start`, quick action, RoutineDetail, ExerciseDetail) |
| ActiveWorkoutScreen | 8014 | `ActiveWorkout` | LIVE (Home, mini-bar in tab bar, WorkoutHistory) |
| WorkoutSummaryScreen | 2944 | `WorkoutSummary` (also Progress stack) | LIVE |
| WorkoutHistoryScreen | 1469 | `WorkoutHistory` (also Progress stack) | LIVE |
| ShareCardScreen | 1781 | `ShareCard` (Home, Progress, Profile stacks) | LIVE |
| CoachReviewScreen | 720 | `CoachReview` (HomeStack) | ORPHAN: no `navigate('CoachReview')` anywhere in src (grep). Only comments mention it. |
| CommunityComposeScreen / CommunityPostScreen | 421 / 354 | duplicate registrations in HomeStack (and CommunityStack) | LIVE (so workout summary and share card compose in-stack) |

#### Train tab (PlansStack)

| Screen | Lines | Route | Reachability |
|---|---|---|---|
| PlansScreen | 2722 | `Plans` (root) | LIVE |
| PlanUpdateScreen | 726 | `PlanUpdate` | LIVE (Home, Plans) |
| PlanDetailScreen | 1017 | `PlanDetail` | LIVE (deep link `routine/:planId`) |
| RoutineDetailScreen | 2210 | `RoutineDetail` | LIVE |
| ExerciseDetailScreen | 1826 | `ExerciseDetail` (Plans and Progress) | LIVE |
| ManualBuilderScreen | 2118 | `ManualBuilder` | LIVE |
| PlanLibraryScreen | 1247 | `PlanLibrary` | LIVE |
| MesocycleBuilderScreen | 677 | `MesocycleBuilder` | LIVE |
| HowYouTrainScreen | 1660 | `HowYouTrain` (registered in Home, Plans, Progress, Profile, Onboarding stacks) | LIVE (capability / limitations lane) |
| HowYouTrainAddScreen | 957 | `HowYouTrainAdd` (5 stacks) | LIVE |
| TrainingConsiderationsScreen | 281 | `TrainingConsiderations` (5 stacks) | LIVE |
| AvoidedMovementsScreen | 213 | `AvoidedMovements` (5 stacks) | LIVE |
| SettingsWorkoutScreen | 289 | `SettingsWorkout` (5 stacks) | LIVE |

#### Nutrition tab (DiaryStack)

| Screen | Lines | Route | Reachability |
|---|---|---|---|
| DiaryScreen | 2653 | `Diary` (root; deep link `diary/:date?`) | LIVE |
| MealPlanScreen | 2242 | `MealPlan` | LIVE |
| FoodSearchScreen | 1273 | `FoodSearch` | LIVE |
| AddCustomFoodScreen | 646 | `AddCustomFood` | LIVE |
| ScanBarcodeScreen | 506 | `ScanBarcode` | LIVE (uses react-native-vision-camera) |
| ScanLabelScreen | 512 | `ScanLabel` | LIVE (only referrer: ScanBarcodeScreen; ML Kit OCR) |
| FoodInsightsScreen | 842 | `FoodInsights` | LIVE (only referrer: DiaryScreen) |
| MyRecipesScreen | 446 | `MyRecipes` | LIVE |
| MyMealsScreen | 362 | `MyMeals` | LIVE |
| RecipeBuilderScreen | 627 | `RecipeBuilder` | LIVE |

#### Progress tab (ProgressStack)

| Screen | Lines | Route | Reachability |
|---|---|---|---|
| AnalyticsScreen | 896 | `Analytics` (root; deep link `progress`) | LIVE |
| VolumeHeatmapScreen | 1092 | `VolumeHeatmap` | LIVE |
| BodyMetricsScreen | 1722 | `BodyMetrics` (Progress and Profile) | LIVE |
| ProgressPhotosScreen | 2579 | `ProgressPhotos` (Progress and Profile) | LIVE |
| LiftProgressScreen | 971 | `LiftProgress` | LIVE |
| ConsistencyScreen | 372 | `Consistency` | LIVE |
| RecoveryScreen | 45 | `Recovery` | LIVE (wrapper over ReadinessCards, moved out of Consistency, D208) |
| YearOfLiftsScreen | 1032 | `YearOfLifts` and `RecapStory` (same component, two route names) | LIVE |

#### Community tab (CommunityStack, 29 screens, other domain owns detail)

CommunityHubScreen (route `Community`, 1457), CommunityJoin (754), CommunityEditProfile (668), CommunityProfile (705), CommunitySearch (252), CommunityActivity (356), CommunityDimension (803), CommunityBoard (318), CommunityGroup (792), CommunityGroupCreate (183), CommunityGroupMembers (266), CommunityRules (364; also in ProOnboardingStack), CommunityPrivacy (582), CommunityModeration (604), CommunityCompose (421), CommunityPost (354), CommunityGymAdd (247; also ProOnboardingStack), CommunityFindPeople (266), CommunityPeopleList (373), CommunityTrainingProfile (521), CommunityConversations (184), CommunityConversation (619), CommunityGroupChat (303), CommunityFollowers (225), CommunityConnections (236). All registered; every one has at least one navigate referrer (script output). CONDITIONAL on joining Community (profile row) and on the ED/calm gate (loadCommunityFriendsRow on Home, widget friends count). Detail belongs to the Community slice. NOT TRACED here.

#### Coach tab (ProfileStack): coaching, setup, Settings

| Screen | Lines | Route | Reachability |
|---|---|---|---|
| YouScreen | 662 | `You` (root, labelled "Coach") | LIVE |
| AthleteProfileScreen | 915 | `AthleteProfile` | LIVE (YouScreen) |
| CoachOutputScreen | 3760 | `CoachOutput` (deep link `coach`) | LIVE |
| CoachHeldHistoryScreen | 383 | `CoachHeldHistory` | LIVE (only referrer: CoachOutputScreen) |
| WeeklyCheckInScreen | 2406 | `WeeklyCheckIn` (deep link `checkin`) | LIVE |
| WeeklyStoryScreen | 199 | `WeeklyStory` | LIVE (YouScreen "Your week") |
| BlockReflectionScreen | 505 | `BlockReflection` | LIVE (Plans, MesocycleBuilder via cross-tab) |
| ProGoalSetupScreen | 1149 | `ProGoalSetup` | LIVE (YouScreen "Update goal and phase"; NOT part of onboarding despite the name) |
| GoalChangeSummaryScreen | 433 | `GoalChangeSummary` | LIVE (replace from ProGoalSetup) |
| GoalLockConsentScreen | 261 | `GoalLockConsent` | LIVE (YouScreen "Goal lock", `editMode:true`) |
| WellbeingCheckScreen | 273 | `WellbeingCheck` | LIVE (YouScreen "Wellbeing check") |
| CoachingRemindersScreen | 707 | `CoachingReminders` (Profile, Onboarding) | LIVE |
| NutritionTargetsScreen | 2967 | `NutritionTargets` | LIVE |
| NutritionEducationScreen | 358 | `NutritionEducation` (Profile, Onboarding) | LIVE |
| MealNamesScreen | 109 | `MealNames` | ORPHAN: registered, but SettingsScreen.js:85 comment says its row was REMOVED; no other navigate. |
| MethodologyScreen | 215 | `Methodology` (Profile, Onboarding) | LIVE (How Precision Coaching works) |
| NotificationSettingsScreen | 1274 | `NotificationSettings` (Profile, Onboarding) | LIVE |
| ImportScreen | 547 | `Import` | LIVE (SettingsData) |
| SnapshotsScreen | 166 | `Snapshots` | LIVE (SettingsData) |
| CreditsScreen | 175 | `Credits` | LIVE (SettingsAbout) |
| DebugLogScreen | 260 | `DebugLog` | CONDITIONAL: hidden gesture (7 taps on the version value inside a time window) or `__DEV__` long press (SettingsAboutScreen.js:95-140). |
| SettingsScreen | 173 | `Settings` | LIVE (YouScreen cog, AthleteProfile) |
| SettingsAccountScreen | 51 | `SettingsAccount` | LIVE |
| SettingsProfileScreen | 377 | `SettingsProfile` | LIVE |
| SettingsCoachingScreen | 330 | `SettingsCoaching` | LIVE |
| SettingsDisplayScreen | 278 | `SettingsDisplay` | LIVE |
| SettingsHealthScreen | 233 | `SettingsHealth` | DORMANT: row shown only if `isHealthAvailable()`, which is always false (src/lib/health.js:90-108, both native getters return null). |
| SettingsDataScreen | 426 | `SettingsData` | LIVE |
| SettingsDietaryScreen | 20 | `SettingsDietary` | LIVE (Settings row; also hosts the shared DietaryPreferencesEditor) |
| SettingsPrivacyScreen | 177 | `SettingsPrivacy` | LIVE |
| SettingsAboutScreen | 182 | `SettingsAbout` | LIVE |
| SettingsFaqScreen | 147 | `SettingsFaq` | LIVE (from SettingsAbout) |

#### Dormant billing (on disk, NOT registered in any navigator)

| Screen | Lines | Why unreachable |
|---|---|---|
| ProUpgradeScreen | 829 | Unregistered since D137 (RootNavigator.js comment 78-82, 723-729); also guarded by the payments barrel. Referenced only from comments/AuthSheet/useAppStore text. |
| SubscriptionScreen | 282 | Unregistered. |
| SubscriptionPolicyScreen | 287 | Unregistered. |
| CascadeGateScreen | 482 | Unregistered. |
| paywallExcerpts.js | 61 | Not a screen; content module for ProUpgrade's review block (empty list = dark). |

Counts: registered unique components = 103; orphaned-but-registered = 2 (CoachReview, MealNames); dormant by flag = 3 (Quiz, PlanPreview, SettingsHealth); duplicate route names = `RecapStory` aliasing YearOfLifts, Login aliasing Welcome.

---

## 3. State: src/store/useAppStore.js (Zustand 4, one store, 2512 lines)

Wrapped by `observability.instrumentStore` (breadcrumb and duration per action). Screens must select with `useShallow`. Slices (OBSERVED, line numbers from the file):

| Slice | State | Persisted where | Notes |
|---|---|---|---|
| Auth/session | `user`, `session`, `userProfile`, `isAuthLoading`, `userProfileFieldUpdatedAt` | Profile cache in AsyncStorage `@volyume_user_profile_<uid>` and `_ts_<uid>`; session by Supabase client (secure storage); owner marker `@volyume_last_supabase_user_id` | `saveLocalProfile`, `clearAuthStateForSignOut` (push-first, cross-account wipe, account epoch invalidation). |
| Health consent | `healthConsent`, `healthConsentChecked`, `healthConsentGranted()` | Cloud `users_profile.health_data_consent`; local cache `@volyume_health_consent_<uid>` (true only) | Drives gate order 2-3. |
| Onboarding | `firstRunComplete` (default true until checked), `firstRunChecked`, `proOnboardingAccountCreated`, `postSetupLanding`, `onboardingQuiz` (memory only) | `@volyume_first_run_complete` and `_<uid>`; wizard draft via src/lib/proOnboardingDraft (per-uid AsyncStorage) | `completeFirstRun`, `resetFirstRun`, `noteSignupPendingOnboarding`. |
| Tier | `tier`, `tierChecked`, `billingPeriod`, optimistic paid fields | `@volyume_tier`, `@volyume_trial_state`, `@volyume_pro_trial_ends_at`, `@volyume_paid_verified_at` | All writers pass through `_effectiveTier` (forces `'pro'`). Legacy trial/paid logic retained but inert. |
| Cloud sync status | `cloudSyncStatus/Version/Error` | memory | Surfaced in SettingsData. |
| Coach flags | `hasUnseenCoachChange`, `community.unseen` | memory; durable "viewed" marker `COACH_OUTPUT_VIEWED_KEY_FOR(uid)` in AsyncStorage | Badge logic in src/lib/home/unseenCoachChange.js. |
| Active workout | `activeWorkout`, `workoutExercises`, `currentExerciseIndex`, `workoutStartTime`, `lastActivityAt`, `sessionPRs`, `sessionAdjustments`, `appliedRemoteEventIds`, `lastSetLoggedAt` | Snapshot to AsyncStorage `@volyume_active_workout` on each mutation; `restoreActiveWorkout(userId)` rehydrates (called by HomeScreen mount) | Not in SQLite until set logging/finish. |
| Rest timer | `restTimerActive/Duration/Remaining/EndsAt` | memory (plus OS notification) | `startRestTimer`, `addRestTime`, `tickRestTimer`. |
| Workout prefs | `defaultRestSeconds` (90), `autoStartRestTimer`, `restEndAlertEnabled`, `restSoundsEnabled`, `openRestViewAfterLog` | AsyncStorage `@volyume_workout_prefs` | Settings > Workout and units. |
| Units / body | `units` (always `'kg'`), `bodyWeightUnits` (default `'st'`), `barWeight` 20 | profile cache key | UK defaults; lbs removed. |
| Diet | diet preference, allergen excludes, meal-plan exclusions and prefs, calorie bank | profile cache key (`PROFILE_KEY_PFX + uid`) | Settings > Dietary needs, MealPlan. |
| Accessibility | `accessibility` {largerText, higherContrast, colorBlindSafe, reduceMotion (effective), reduceMotionUserPref, theme 'dark'|'light'|'system', energyUnit 'kcal'|'kj', showFibre/Sugar/Sodium}, `systemReduceMotion` | AsyncStorage `A11Y_PREFS_KEY` (src/lib/accessibilityPrefs) | Larger text/contrast apply via theme tokens; useTheme gives live restart-free theming. |
| Privacy | `privacy.analyticsOptOut` | AsyncStorage `PRIVACY_PREFS_KEY` | Pushes into telemetry transport (`setTelemetryEnabled`). |

Persistence split (OBSERVED): SQLite (SQLCipher, `src/lib/database.js`, food in `src/lib/food/db.js`) holds domain data; AsyncStorage holds prefs/flags/caches; expo-secure-store holds the DB key (src/lib/dbCrypto.js) and the app-lock flag. Many per-screen dismissal flags are AsyncStorage keys read directly by HomeScreen (examples: `@volyume_brief_dismissed_date`, `@volyume_phase_banner_dismissed_v1`, `@volyume_seen_coaching_nudge`, community intro key, how-you-train offer key, welcome-card key, `@volyume_notification_prefs`, `@volyume_nutrition_targets`).

Hooks (src/hooks, OBSERVED):

| Hook | Purpose | Consumers (sample) |
|---|---|---|
| useTheme | Live theme from store a11y prefs (CP-10) | nearly every screen |
| useAccountActions | sign out (push-first, active-workout guard), delete account, withdraw consent | SettingsAccount, SettingsPrivacy |
| useCommunityMe | Own Community profile (cache then RPC), error codes | CommunityHeaderAction and Community screens |
| usePhotoSuppression | ED-safety gate: true when calm mode OR open ED flag OR a read failure (fail closed) | progress photo compare/share |
| useProgressData | PRs per week and progress aggregates | AnalyticsScreen |
| useVisualPillar | Progress landing "visual pillar" from progress scan chain | Progress |
| useWeightTrend | "Your trend" card (EWMA, weekly rate, adaptive maintenance, ED check) | Progress/Home |

---

## 4. Onboarding and identity

### 4.1 Flow as shipped (OBSERVED)

```
Welcome (signed out)
  -> "Get started" -> AuthSheet(signup)   [ONBOARDING_QUIZ_FIRST=false, so no quiz]
  -> "Already have an account? Sign in" -> AuthSheet(signin)
AuthSheet: Apple (iOS), Google (non-iOS), email+password (all), Forgot password
  -> Supabase SIGNED_IN -> RootNavigator enter pipeline
  -> Article 9 consent check (gate order 3)  -> Article9ConsentScreen if not granted
  -> ProOnboarding wizard (8 steps)          -> ProSetupComplete (replace)
  -> completeFirstRun -> LockedMainTabs (Today)
```

| Feature | What it does for the user | Entry | Key files | Reads/writes | Status | Connects to |
|---|---|---|---|---|---|---|
| Welcome | Hero with three product screenshots, headline "Everything you need to build your physique.", "Completely free · No ads", Get started / Sign in | WelcomeStack root | src/screens/WelcomeScreen.js, assets/welcome/*.jpg | store `accessibility.reduceMotion` | LIVE (signed out) | AuthSheet |
| AuthSheet | Bottom sheet auth: Apple on iOS (Apple-branded button, white style), Google on Android (Google is excluded from iOS autolinking in react-native.config.js and package.json), email+password sign-up/sign-in, password reset, unconfirmed-email handling, spam-folder copy | Welcome | src/components/auth/AuthSheet.js (543), OAuthButtons.js, EmailPasswordFields.js; src/lib/supabase.js (`signInWithGoogle/Apple/Email`, `signUpWithEmail`, `resetPassword`), src/lib/authErrorCopy.js | Supabase Auth; audit events `auth.signin.attempt` | LIVE | RootNavigator auth listener |
| Email confirmation / reset deep link | Returns the user via `volyume://` link | OS link | App.js `handleIncomingDeepLink`, src/lib/authDeepLink.js, authCallbackState.js | Supabase session | LIVE | AuthSheet |
| Quiz-first flow (Quiz + PlanPreview + Login wall) | 8-question pre-account quiz then a plan preview then "Create an account to keep it". Answers in memory only | Welcome, only if flag on | QuizScreen.js, PlanPreviewScreen.js, src/lib/onboarding/{quizFlow,planPreview}.js | store `onboardingQuiz` (memory); ProOnboarding prefills from it (ProOnboardingScreen.js:793) | DORMANT: `ONBOARDING_QUIZ_FIRST = false` (quizFlow.js:24, turned off by founder 2026-06-26) | ProOnboarding |
| Article 9 consent | Explicit, un-skippable consent to health-data processing with checkbox, link to in-app privacy policy, withdrawal explanation (Art 7(3)), "What if I don't agree?" with sign-out / delete options | Gate order 3 | Article9ConsentScreen.js (500), `CONSENT_VERSION='2026-08-10'` | RPC `record_health_consent(_granted:true, ...)`; on RPC failure queues via src/lib/consent/pendingConsent.js and proceeds locally; telemetry `article9_consent_recorded`; AsyncStorage `@volyume_health_consent_<uid>` | LIVE | sync layer refuses to move health data without consent; RootNavigator |
| Capability consent | Separate granular consent for the HowYouTrain/limitations ("capability") lane; withdrawing erases that lane without touching Article 9 | HowYouTrain / HowYouTrainAdd | src/lib/consent/capabilityConsent.js (`CAPABILITY_CONSENT_VERSION='2026-08-20'`), src/lib/capability/store.js (write gate), runner.js:184 flush | local flag `capabilityConsent.v1.<uid>`; RPC `record_capability_consent` (migrate_147); queue `pendingCapabilityConsent.v1` | LIVE (conditional on user opting into the lane) | sync runner flush, ExercisePickerModal |
| ProOnboarding wizard | Eight steps: 1 Account (auto-skipped for any signed-in cloud user), 2 Baseline (sex, age, height, weight; each blocks progression, no defaults), 3 Body composition, 4 Training week (experience, session length, days, equipment), 5 Your gym / Community join (skipped for under-18s and optionally for others), 6 Injuries and limitations (offers HowYouTrain), 7 Targets (physique goal, phase, weak points), 8 Check-in rhythm plus plan fit review and plan generation | Gate order 4 | src/screens/ProOnboardingScreen.js (3945); steps at lines 2252, 2293, 2531, 2619, 2717, 2930, 2977, 3141; `TOTAL_STEPS = 8`, `ONBOARDING_WIZARD_VERSION = 2` | Writes: userProfile via `saveLocalProfile` (AsyncStorage + sync), nutrition targets via `calculateNutritionTargets`, plan via `generateAndSavePlan` (src/lib/planAutoGen.js, with retry), draft `src/lib/proOnboardingDraft`, optional early Community join (`performEarlyCommunityJoin`, src/lib/community/onboardingJoin.js) | LIVE | planAutoGen/nutritionEngine (ED floors apply), Community, notifications |
| ProSetupComplete | "Hand-off" payoff: what was built and why (WHY_ORDER: schedule, goal, experience, progression, equipment, recovery, nutrition, weak points), macro targets, notification permission tile, links to NutritionEducation, NotificationSettings, Methodology; calls `completeFirstRun`, can set `postSetupLanding` to open Train | `replace` from step 8 | ProSetupCompleteScreen.js (850) | reads plan, plan facts, ED flag, morning weights; writes `@volyume_first_run_complete(_uid)` | LIVE | MainTabs |
| FirstRun / FreeStarter | Deleted. `src/lib/onboarding/freeStarter.js` kept because PlanDetailScreen and PlanLibraryScreen import `getPlanDays`, `planEquipmentAllows`, `scorePlanRecommendation` | n/a | RootNavigator.js:846-855 comment | n/a | LEGACY (screens gone, helpers live) | Train |
| Update goal and phase (ProGoalSetup) | Post-onboarding editor for goal/phase/weak points, previews plan rebuild before committing (`prepareStartWithPlan`, `commitStartWithPlan`) | Coach > "Update goal and phase" | ProGoalSetupScreen.js, GoalChangeSummaryScreen.js | profile, nutrition targets, programme | LIVE | planAutoGen, startWithPlan |
| Goal lock | Pick standard (2-signal ED detector threshold) or advanced (3-signal) safety checks; FFM floor always applies | Coach > "Goal lock" | GoalLockConsentScreen.js (`setGoalLockAdvanced`) | SQLite via database.js | LIVE, ED-safety adjacent | edPatternDetector |

### 4.2 Auth providers (OBSERVED)

- Apple: iOS only (OAuthButtons.js:44, `AppleAuthenticationButton`, expo-apple-authentication; app.json `usesAppleSignIn`).
- Google: Android only (OAuthButtons.js:79 `Platform.OS !== 'ios'`; iOS native module excluded in package.json `expo.autolinking.apple.exclude` and react-native.config.js). Comment: no iOS OAuth client id is wired.
- Email + password: re-added 2026-07-21 (CLAUDE.md), ungated, in AuthSheet. Unconfirmed-email and spam-folder copy present (latest commit 0b5a6ce).
- Stale comment: ProOnboardingScreen.js step 1 says "OAuth only ... email path was removed (founder 2026-07-01)". Step 1 only renders OAuthButtons. INFERRED: unreachable in practice because the auth sheet runs before the wizard and step 1 auto-advances for any non-local signed-in user (ProOnboardingScreen.js:894-919). It is therefore a dead UI branch with a stale comment.
- `user.isLocal` branches exist in many places (sign-out copy, delete copy, `!user.isLocal` guards), but no code path creates a local user (identity law: no anonymous mode). INFERRED vestigial.

### 4.3 Sign-out and delete-account path (OBSERVED, src/hooks/useAccountActions.js)

| Action | Entry | Behaviour |
|---|---|---|
| Sign out | Settings > Account | Refuses with an active workout ("Finish your workout first"). Confirm alert. `clearAuthStateForSignOut()` pushes everything first and wipes local data; on push failure shows "Sync incomplete" with "Sign out anyway" (force). Wipe failure aborts with a specific "Removing X from this device failed" message. Then up to 2 attempts at Supabase `signOut()`. |
| Delete account | Settings > Account (two confirmations: "Delete account?" then "Are you sure?" / "Delete forever") | Invokes edge function `delete-account` with `{reason, app_version, platform}`. If the function fails, falls back to RPC `delete_user_data`, then records a durable retry backstop (`establishAuthDeletionBackstop`: server `record_rpc_fallback_deletion` plus local `markAuthDeletionPending`) so the auth record is removed later. Then `signOut`, `wipeAllUserDataWithRetry`, `clearAuthStateForSignOut`, `clearDeletedAccountStorage`, `clearTrainingStatus`. Copy promises removal of "Community profile and posts". |
| Withdraw consent | Settings > Privacy and legal > "Delete account and withdraw consent" (only when consent is true) | Same deletion path (handleWithdrawConsent). The row is destructive and honest: withdrawal equals account deletion (Article9 screen says the same). |
| Sign-out wipe retention | `lib/deletionRetry.js`, `lib/accountEpoch.js`, `lib/accountTransitionGuard.js`, `lib/sync/signOutGuard.js` | Cross-account isolation: epoch invalidation of in-flight async work before wipe. |

Phantom dependency (OBSERVED): `useAccountActions.js:236` and `Article9ConsentScreen.js:8` / `WhatsNewSheet.js:17` import `expo-application`, which is NOT listed in package.json (present in package-lock.json:8255 as a transitive module). Static imports of an undeclared package. See section 9.

---

## 5. Home (Today tab) and You (Coach tab)

### 5.1 HomeScreen (src/screens/HomeScreen.js, 3817 lines; OBSERVED)

Render order inside one ScrollView with pull-to-refresh (lines 2432-3400):

| Order | Block | Component / source | Shown when |
|---|---|---|---|
| 1 | Header "Today" with Community header action | ScreenHeader, CommunityHeaderAction (src/components/community/) | always |
| 2 | Community friends row ("N friends trained today") | HomeCommunityTodayRow, loader `loadCommunityFriendsRow`, `fetchFriendsTrainedToday` (src/lib/widgets/friends.js) | Community members only; suppressed under ED/calm gate (comment 2462-2467) |
| 3 | TodayStrip | src/components/TodayStrip.js | loaded |
| 4 | TodayLine: ONE ranked line | `resolveTodayLine` (src/lib/home/todayLineArbiter.js) | at most one occupant by rank: safety (reserved slot, always null today) > block-complete decision > coach decision to review > weekly check-in due > first-review readiness (conflict days) > recovery/deload > re-entry question > nutrition-phase mismatch. Trial-ending rank retired. |
| 5 | Welcome card, "How you train" offer card, plan rebuild note and choice card | HomeWelcomeCard, HomeHowYouTrainOfferCard, PlanRebuildNote/Choice (src/lib/planRebuild.js `ensureActivePlanRebuilt`) | first run / dismissible / when a rebuild is pending at next session (`PLAN_REBUILD_AT_NEXT_SESSION`) |
| 6 | Continue active workout card | PressableCard -> `ActiveWorkout` | `hasActiveWorkout` |
| 7 | Next session hero (Start, change workout sheet, block shape sheet, circuit preview line, recovery label) | HomeChangeWorkoutSheet, HomeBlockShapeSheet, RecoveryStateCard, `resolveProgrammePosition` | active plan present |
| 8 | Empty states | EmptyState -> PlansTab `PlanDetail` / `PlanLibrary` | no plan / no active programme |
| 9 | EvidencePanel (since-check-in evidence: weigh-in, sessions, weight line) | EvidencePanel, `resolveEvidencePanel` (src/lib/home/evidencePanel.js) | loaded; weigh-in input is on this screen (daily morning weight) |
| 10 | Last session card | HomeLastSessionCard | has history |
| 11 | Community intro card | HomeCommunityIntroCard, reoffer logic `src/lib/community/introReoffer.js` | not dismissed and not a member |
| 12 | Plateau banner | `selectPlateauForBanner` (src/lib/plateauSurfacing.js) -> ProgressTab ExerciseDetail | plateau detected |
| 13 | Sheets: PlanPreviewSheet, WhatsNewSheet (per-version entries, 2.14.0 at WhatsNewSheet.js:158) | | on demand / once per version |

Home also: shows a daily readiness question (`@volyume_...` answered key near HomeScreen.js:1475-1512), a weekly nudge for coaching reminders, re-entry ease (`applyReEntryEaseIfPending`), `computeAndLogSessionAdjustments`, ED-pattern flag checks (`getOpenEdPatternFlag`), calm-mode read (`WELLBEING_KEY`), and restores the active workout on mount (`restoreActiveWorkout`). Cross-tab navigation targets: You, Plans, CoachOutput, WeeklyCheckIn, NutritionTargets, Community, Analytics (weight trend), ExerciseDetail, HowYouTrain(Add), PlanUpdate, CommunityCompose (share workout).

Home libs (src/lib/home, all pure, tested): `todayLineArbiter.js` (single-occupant arbiter, spec HOME-TODAY-UX-SPEC section 13), `evidencePanel.js` (Campaign 26 founder device order 2026-08-17), `unseenCoachChange.js` (durable "last viewed" marker; badge persists until the review is opened, D141).

### 5.2 YouScreen / Coach tab (src/screens/YouScreen.js, 662 lines; OBSERVED)

Header "Coach" with subtitle "Weekly coaching based on what you log." and a Settings cog. Sections and rows:

| Section | Row (target) | Notes |
|---|---|---|
| (header) | Athlete profile card (`AthleteProfile`) | |
| Your body | Injuries and limitations (`HowYouTrain`) | |
| This week | Weekly check-in (`WeeklyCheckIn`); Coaching decision (`CoachOutput`, shown when a review exists); Your week (`WeeklyStory`); Community (cross-tab) | Readiness subtitle is one calm line; weigh-in counts suppressed when ED/calm (YouScreen.js:116, 255-266) |
| Setup | Update goal and phase (`ProGoalSetup`); Nutrition targets; Coaching reminders | |
| Safety checks | Goal lock (`GoalLockConsent`, editMode); Wellbeing check (`WellbeingCheck`) | Beat UK signposting/calm mode lane |

### 5.3 Widgets (OBSERVED)

| Item | What | Status |
|---|---|---|
| Android widgets | react-native-android-widget (app.json plugin config): `NextSession` (3x1, 180x110dp) and `WeeklyConsistency` (2x1, 110x110dp), `updatePeriodMillis` 1,800,000. Rendering in src/widgets/widgets.js; task handler src/widgets/widgetTaskHandler.js registered in index.js | LIVE on Android (add via launcher) |
| Snapshot writer | src/lib/widgets/writer.js (`gatherWidgetInputs`, `writeWidgetSnapshot(userId, {refreshFriends})`), pure shaping src/lib/widgets/snapshot.js (`WIDGET_SNAPSHOT_VERSION = 1`), persistence src/lib/widgets/storage.js (AsyncStorage `@volyume_widget_snapshot_v1`, Android widget update, iOS App Group via `live-activity` native module) | BACKGROUND. Triggers: workout finish (ActiveWorkoutScreen), history change (WorkoutHistoryScreen), app backgrounding (App.js), daily background-fetch task. Content: routine name, counts, same-day friends count only; "NEVER weight/calories/macros/body data"; consistency suppressed under COMP-018 ED rule; `dayLabel` always null (product has no scheduled days). |
| Friends count | src/lib/widgets/friends.js (`@volyume_widget_friends_v1`, per-uid, 15 min refresh floor `FRIENDS_REFRESH_MIN_MS`) | BACKGROUND, Community consent/ED gated |
| iOS widgets + Live Activity | plugins/withVolyumeWidget.js creates the VolyumeWidget extension (bundle `app.volyume.widget`, App Group `group.app.volyume.widget`, deployment 16.1) and copies Swift from modules/live-activity | DORMANT in this repo's config: the plugin is NOT in app.json `plugins`, there is no `app.config.*`, and `git log -S "withVolyumeWidget" -- app.json` returns nothing (OBSERVED). app.json also has no `ios.entitlements` App Group. INFERRED: iOS builds from this repo do not produce the widget extension. Yet SettingsScreen.js:119-128 tells iOS users they have home screen widgets and a lock screen widget. See section 9. |
| Settings row | "Home screen widget" alert with launcher instructions | LIVE |

---

## 6. Settings (Coach tab > cog > Settings; OBSERVED)

SettingsScreen (173 lines) rows in order: Injuries and limitations (`HowYouTrain`), Account, Profile, Coaching, Workout and units, Nutrition targets, Dietary needs, Notifications and reminders, Coaching reminders, Display and accessibility, Home screen widget (alert), Health (conditional, never shown), Your data, Community (cross-tab to hub), Privacy and legal, Help and about.

| Screen | Controls (label) | Reads/writes | Status / notes |
|---|---|---|---|
| SettingsAccount | Identity row (email), Sign out, Delete account | useAccountActions; Supabase edge fn `delete-account`, RPC `delete_user_data` | LIVE |
| SettingsProfile | Name, sex, height, date of birth, diet preference (feet/inches and age fields) | store `saveLocalProfile`, userProfile sync | LIVE; feeds nutrition engine |
| SettingsCoaching | Calmer coaching (calm mode), Session readiness check, Show the science, Cycle tracking (female only) | wellbeing prefs (`WELLBEING_KEY`), coaching prefs, sync prefs | LIVE; calm mode is ED-safety lane; cycle tracking conditional on `bioSex === 'female'` (SettingsCoachingScreen.js:290) |
| SettingsWorkout (Workout and units) | Body weight unit (st/kg/lb segment), Session length, Default rest timer, Auto-start rest timer, Open rest view after a set, Rest finished alert, Rest timer sounds, Make rest alerts exact | store workout prefs, `@volyume_workout_prefs`; exact-alarm request | LIVE; "exact alarms" row Android-only and hidden once granted or alert off (SettingsWorkoutScreen.js:255-266) |
| NutritionTargets | calorie/macro targets, calorie choice within range (D226) | database nutrition targets | LIVE (nutrition domain) |
| SettingsDietary | DietaryPreferencesEditor (diet, 14 FSA allergens, flagged foods) | store diet slice | LIVE |
| NotificationSettings | training reminder, meal reminders, quiet hours, etc. | `@volyume_notification_prefs`, src/lib/notifications | LIVE (notifications domain) |
| CoachingReminders | weigh-in and weekly check-in schedule | notifications | LIVE |
| SettingsDisplay | Fibre, Sugars, Sodium toggles; Larger text; Higher contrast; Colour-blind safe palette; Reduce motion; theme (dark/light/system) and energy unit (kcal/kJ) | store `accessibility`, AsyncStorage | LIVE; larger text/contrast "after restart" caveat per store comment, though useTheme gives live theming |
| SettingsHealth | Read morning weight, Write workouts, Open Health settings | src/lib/health.js | DORMANT: `isHealthAvailable()` always false; screen would show "Not available in this version". Health Connect / HealthKit removed 2026-06-30 (founder), health.js:90-99 |
| SettingsData (Your data) | Cloud sync (last synced, tap to sync), Retry now (failed ops), Refresh food library, Skip name on label scans (`tier==='pro'`), Import from another app, Back up app data (JSON), Restore from backup, Restore a snapshot, Export workout log (CSV), Coach handover report (PDF), Clear workout history | `syncAll`, `getQueueStats`, `retryFailedOps`, `exportBackup/importBackup` (src/lib/dataBackup.js, expo-document-picker + expo-sharing), `buildWorkoutCSV`, `exportCoachReportPdf` (src/lib/coachReport.js, expo-print), `clearWorkoutHistory` | LIVE. Backup excludes photo image files (copy says so). |
| Import | Hevy or Strong workout-history CSV: pick file, preview, confirm; unmatched exercises become custom exercises | src/lib/importExternal.js (`detectFormat`, `parseHevy`, `parseStrong`, `analyzeImport`, `runImport`, `MAX_CSV_CHARS`) | LIVE. Only two formats. |
| Snapshots | list rolling pre-migration / pre-account-switch DB snapshots; destructive restore (close DB, copy, ask to relaunch) | src/lib/dbSnapshot.js | LIVE |
| SettingsPrivacy (Privacy and legal) | Share scanned labels with Open Food Facts, Share usage data (analytics opt-out), Privacy policy, App lock (Face ID / fingerprint), Health-data consent row (delete + withdraw) | store `privacy`, expo-secure-store app lock (`biometricLock.js`, live availability check before arming), `useAccountActions.handleWithdrawConsent` | LIVE |
| SettingsAbout | Help and FAQ, Send feedback (FeedbackSheet), Rate Volyume (expo-store-review), Credits, version row (tap shares build id; 7 taps open DebugLog) | `Constants.expoConfig.version`, `expo-application` nativeBuildVersion | LIVE |
| SettingsFaq | 15 Q/A items (grep count 15) | static | LIVE |
| Credits | OpenFoodFacts (ODbL), CoFID (OGL v3.0 verbatim), USDA FoodData Central acknowledgement | static, Linking | LIVE |
| PrivacyPolicy | In-app static policy, "Last updated 26 September 2026" (`LAST_UPDATED`) | static | LIVE; the policy text is hard-coded in the screen |
| Methodology | "How Precision Coaching works": collapsible static sections; telemetry `track` | static | LIVE; copy must be re-reviewed if engine maths change (header) |
| DebugLog | on-device ring buffer viewer (200 events), filter all/error/warn/info, share, clear, sync conflict diagnosis | src/lib/errorLog.js, `diagnoseSyncConflicts` | CONDITIONAL (hidden gesture) |

Also in Settings reach: the "What's new" sheet is on Home, not Settings. FeedbackSheet has a shake-to-report trigger (expo-sensors Accelerometer; iOS usage string NSMotionUsageDescription).

---

## 7. Feature flags and gating constants

All values OBSERVED in the named file. "Consumed by" lists non-test files found by grep.

| Flag / constant | Value | Defined | Consumed by | Effect |
|---|---|---|---|---|
| `FULL_ACCESS_FOR_ALL` | `true` | src/lib/proGate.js:43 | useAppStore.js:45, 913, 1037, 1340; notifications/scheduler.js:841, 927, 1034; weeklyCoach.js:25, 2399 (`differential_output` forced `{shown:false}`); payments/index.js:31, 62, 73, 86, 92; HomeScreen.js, Article9ConsentScreen.js, notifications/notificationRoute.js (comments/guards); RootNavigator.js (comments) | Whole product is free. All tier writes coerced to `'pro'`; billing barrel inert; trial/cascade/win-back notifications cancelled; weekly coach differential output suppressed. |
| `PRO_BETA_ACTIVE` | `= FULL_ACCESS_FOR_ALL` | proGate.js:49 | proGate.js:85 (`resolveTier`); ProUpgradeScreen.js (dormant) | Alias kept for the dormant paywall. |
| `ONBOARDING_QUIZ_FIRST` | `false` | src/lib/onboarding/quizFlow.js:24 | WelcomeScreen.js:75; telemetry comment events.js:197-200 | Off: Get started opens AuthSheet, not the quiz. |
| `PHASE_PRE_ACCOUNT` | `true` | quizFlow.js:48 | QuizScreen.js (dormant) | Whether the phase question may be asked pre-account. |
| `CIRCUIT_SYNC_COLUMNS_ENABLED` | `true` | src/lib/sync/featureFlags.js:27 | sync.js:18, database.js | Include routine_exercises.group_kind, round_rest_seconds and workout_sets.evidence_class (migrate_158/159) in cloud push. |
| `PLAN_FACTS_PUSH` | `true` | featureFlags.js:49 | sync.js:18, database.js | Push programmes.plan_facts (migrate_188 applied 2026-10-05). |
| `ENTRY_TYPED_PUSH` | `true` | featureFlags.js:74 | sync.js:18, 602, 615 | Push workout_sets.entry_typed (migrate_189 applied 2026-10-08). Turning it off while the column exists is safe; turning on without the column would fail the whole upsert chunk. |
| `STRUCTURE_ENGINE` | `true` | src/lib/structure/release.js:24 | planAutoGen.js, planRebuild.js, PlanDetailScreen.js | New plans built by the structure engine. The file header says "It is OFF on main until the founder signs off the rendered plans" while the value is `true`: stale comment or unsanctioned flip, NOT VERIFIED which. |
| `PROTECTED_PROGRAMME_IDS` | frozen list with one id (founder's own plan) | structure/release.js | planRebuild.js, planAutoGen.js | No automatic path may delete, regenerate or rebuild that programme. A hard-coded user id in shipped code. |
| `PLANNER_V2` | `true` | src/lib/plan/release.js:22 | planAutoGen.js only | New planner for `generateAndSavePlan`. Interacts with STRUCTURE_ENGINE; precedence NOT traced (planning domain). |
| `PLAN_REBUILD_AT_NEXT_SESSION` | `true` | src/lib/planRebuild.js:105 | planRebuild.js (Home calls `ensureActivePlanRebuilt`) | Rebuild an old plan at next session. |
| `BODY_FAT_METHOD_CHOICE` | `true` | src/lib/bodyMetricValidate.js:66 | BodyMetricsScreen.js | Body-fat method picker. |
| `USE_FOREGROUND_SERVICE` | `false` | src/lib/notifications/activeWorkout.js:55 | same file | Session sticky foreground notification stays off; rest-timer foreground service (modules/rest-timer-live) is separate and live. |
| `COMMUNITY_RULES_VERSION` | `3` | src/lib/community/limits.js:34 | Community join/rules | Re-accept trigger. |
| `CONSENT_VERSION` | `'2026-08-10'` | Article9ConsentScreen.js:43 | consent RPC and telemetry | Stamp only; gates nothing at runtime. |
| `CAPABILITY_CONSENT_VERSION` | `'2026-08-20'` | consent/capabilityConsent.js:21 | capability lane | Stamp. |
| `WIDGET_SNAPSHOT_VERSION` | `1` | lib/widgets/snapshot.js:30 | widgets | Snapshot schema. |
| `ONBOARDING_WIZARD_VERSION` | `2` | ProOnboardingScreen.js | telemetry funnel | Step numbering identity. |
| `CONSENT_LATCH_FAILSAFE_MS` | `15000` | RootNavigator.js:~1085 | consent resolver | Fail-closed escape to the gate. |
| `DB_INIT_TIMEOUT_MS` | `12000` | RootNavigator.js:1245 | DB init | Triggers Retry screen. |
| `isHealthAvailable()` | always `false` | src/lib/health.js:105 | SettingsScreen, SettingsHealth | Hides Health row. |
| Platform gates | Apple button iOS only; Google non-iOS; Android widgets; exact alarms Android; iOS quick actions; Live Activity iOS | OAuthButtons.js, index.js, SettingsWorkout | | |
| `__DEV__` | build-time | App.js OTA check; SettingsAbout DebugLog long press | | OTA update check skipped in dev. |
| Env vars | `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_SENTRY_DSN`, `EXPO_PUBLIC_USDA_API_KEY` | src/lib/supabase.js, sentry.js, food | | Missing Supabase vars make the client null (many `if (!supabase)` paths). Missing DSN disables Sentry. |
| User-set runtime flags | calm mode (`WELLBEING_KEY`), `analyticsOptOut`, app lock (secure store), cycle tracking, capability consent, community sharing | various | | Behaviour switches the user owns. |

The flag sweep covered boolean-literal uppercase constants in src (11 found by regex `^(export )?const [A-Z_]+ = (true|false)`, plus the named non-boolean ones above). Domain-local flags with other shapes (for example inside food, notifications, community) were NOT swept.

---

## 8. Build configuration (OBSERVED)

### 8.1 app.json / package.json

| Item | Value |
|---|---|
| App name / slug / owner / scheme | Volyume / volyume / volyume / `volyume` |
| Version | `2.14.0` in app.json:12 and package.json:3 (match). package.json engines node >= 20.19.4; packageManager npm 10.9.4 |
| Android | package `app.volyume`, `versionCode 3357` (but eas.json `appVersionSource: remote`, `autoIncrement: true` for production, so the in-file code is inert for store builds), minSdk 26, compile/target SDK 36, `allowBackup false`, `usesCleartextTraffic false`, adaptive + monochrome icon |
| iOS | bundle `app.volyume`, `buildNumber "10"` (comment in SettingsAbout: inert, EAS remote governs), `supportsTablet false`, `requireFullScreen true`, `usesAppleSignIn`, deployment target 16.0, `NSSupportsLiveActivities true` |
| Runtime | `newArchEnabled true`, `runtimeVersion.policy appVersion`, portrait only, `userInterfaceStyle automatic`, background `#0D0D0D`, primary `#F59E0B` |
| Android permissions | CAMERA, VIBRATE, RECEIVE_BOOT_COMPLETED, FOREGROUND_SERVICE, WAKE_LOCK, SCHEDULE_EXACT_ALARM |
| Android blocked permissions | ACCESS_FINE_LOCATION, ACCESS_BACKGROUND_LOCATION, RECORD_AUDIO, MODIFY_AUDIO_SETTINGS, SYSTEM_ALERT_WINDOW, READ_MEDIA_IMAGES, READ_MEDIA_VIDEO |
| iOS usage strings | Camera (barcodes, labels, progress photos), Motion (shake feedback), Location When In Use (approximate, "Use my location" gym listing, never stored), Microphone (explained as required by a bundled media library; never requested), Face ID (App lock) |
| iOS other | UIBackgroundModes fetch + remote-notification; LSApplicationQueriesSchemes whatsapp/sms/mailto; privacy manifest declares UserDefaults CA92.1 |
| Deep link intent filters | `volyume://`, `https://volyume.app` prefixes `/partner`, `/u`, `/p`, `/s`, `/g/` (autoVerify) |
| Manifest queries | com.whatsapp package; SENDTO smsto/mailto; VIEW sms |
| app.json `plugins` | expo-splash-screen (blank 64px image, #0D0D0D), expo-secure-store, expo-location (foreground only), expo-media-library (save share cards; location media off), expo-quick-actions (Start workout, Log food), expo-sqlite (`useSQLCipher: true`), expo-apple-authentication, @react-native-google-signin/google-signin, expo-local-authentication, react-native-vision-camera (code scanner on, mic off), expo-camera (mic off), expo-notifications (icon, colour `#F59E0B`), expo-build-properties, @sentry/react-native/expo (org/project volyume), react-native-android-widget (2 widgets), @react-native-community/datetimepicker. NOT present: `./plugins/withVolyumeWidget.js`, any `expo-updates` config, any `updates.url`. |
| EAS | eas.json profiles: development, development-device, preview (apk), production (aab, node 20.19.4, autoIncrement, env `RCT_USE_PREBUILT_RNCORE=0`), e2e-simulator |

Unused-permission check (INFERRED, not device tested): `SCHEDULE_EXACT_ALARM` is requested through `requestExactAlarmAccess` in SettingsWorkout; `FOREGROUND_SERVICE` supports rest-timer-live (comment activeWorkout.js:45-54).

### 8.2 Dependencies and purpose (package.json; usage counted by grep of non-test src)

Runtime core: react 19.1.0, react-native 0.81.5, expo ~54.0.37 (SDK 54), zustand ^4.5.7 (state), date-fns ^3.6 (date maths), react-native-url-polyfill (Supabase), promise ^8.3.0 (no import found in src/App/metro/babel: INFERRED unused or transitive).

Navigation and UI: @react-navigation/native ^6.1.18, /stack ^6.4.1, /bottom-tabs ^6.6.1, react-native-screens, react-native-safe-area-context, react-native-gesture-handler, react-native-reanimated ~4.1.1 + react-native-worklets 0.5.1, @gorhom/bottom-sheet (all sheets via src/components/BottomSheet.js), react-native-keyboard-controller 1.18.5, @shopify/flash-list 2.0.2 (long lists), @shopify/react-native-skia 2.2.12 (share cards, photo compare), react-native-svg (charts/icons), @expo/vector-icons (Ionicons), expo-linear-gradient (Welcome fade; only one importer), expo-font, expo-status-bar, expo-system-ui, expo-splash-screen, react-native-haptic-feedback + expo-haptics, expo-image, zeego ^3.0.6 (menus; one importer ActiveWorkoutScreen) with peers @react-native-menu/menu, react-native-ios-context-menu, react-native-ios-utilities (no direct imports; iOS autolinking excludes ios-context-menu and ios-utilities, so how zeego renders on iOS is NOT traced), react-native-webview 13.15 (no runtime importer found: INFERRED unused).

Data and backend: expo-sqlite ~16 with SQLCipher (local DB), expo-secure-store (keys), @react-native-async-storage/async-storage 2.2.0 (prefs), @supabase/supabase-js ^2.43.4 (EU-Dublin backend), @react-native-community/netinfo (connectivity), expo-file-system (legacy API used), expo-document-picker (backup/import), expo-sharing, expo-print (PDF and CSV report), expo-crypto (ids, hashing), expo-constants, expo-asset.

Auth: expo-apple-authentication, @react-native-google-signin/google-signin ^16.1.2, expo-web-browser (OAuth fallbacks in supabase.js), expo-local-authentication (app lock).

Device: expo-camera (progress photos), react-native-vision-camera ^4.7.3 (barcode scan; imported at module scope in ScanBarcode, lazily loaded), @react-native-ml-kit/text-recognition (label OCR), react-native-fast-tflite ^3.0.1 (progress scan vision model), expo-image-picker, expo-image-manipulator, expo-media-library, expo-location (gym finder), expo-sensors (shake, ghost camera), expo-keep-awake (workout), expo-av (rest sounds), expo-notifications, expo-task-manager + expo-background-fetch (periodic sync), expo-quick-actions (iOS shortcuts), expo-store-review, expo-build-properties, expo-updates ~29 (OTA; no `updates` config found).

Native modules in-repo (file: dependencies): `live-activity` (iOS; ActivityKit and widget data via App Group), `rest-timer-live` (Android shortService foreground for rest timer), `progress-scan-image` (image prep for the scan model). Android widgets: react-native-android-widget ^0.20.3. Observability: @sentry/react-native ~7.2.0 (excluded from `expo install` checks).

Dormant: react-native-iap ^15.3.1 (billing, wired but inert, see 2.6).

Undeclared: expo-application is imported statically in 3 files yet absent from package.json (transitive only).

Dev: jest 29 + jest-expo ~54, babel-jest, eslint 9 (+ react, react-hooks, import, react-native-a11y plugins), typescript 5.9 (JSDoc check only), babel-plugin-transform-remove-console, cross-env, xlsx ^0.18.5 (scripts/data tooling; version has known upstream advisories, NOT assessed here).

Scripts: `lint` (`--max-warnings 0`), `test` (TZ=Europe/London), `typecheck`, `check:imports`, `release:quality`, `release:check` (npm ci then quality then `release:audit`), progress-scan calibration/replay/report scripts, Android 16 KB page-size and SQLCipher verifiers.

---

## A) Cross-domain wiring

Consumes from other domains:
- Sync layer (src/lib/sync*, runner) via `syncAll` from App.js (foreground, reconnect, 15-minute, background, daily task) and Settings > Your data; consent gate enforced inside the runner.
- Notifications (src/lib/notifications): `routeForNotificationType`, `restoreNotifications`, channels, quiet hours, scheduler (reads `tier`, cancels trial pushes under FULL_ACCESS_FOR_ALL).
- Planning engine: `generateAndSavePlan` (planAutoGen), `resolveProgrammePosition`, `ensureActivePlanRebuilt`, `prepareStartWithPlan/commitStartWithPlan`; nutrition engine `calculateNutritionTargets` (ED floors apply).
- Wellbeing/ED safety: `isCalm`, `getOpenEdPatternFlag`, `usePhotoSuppression`, calm mode in Home (friends row, readiness text), widget consistency suppression, You subtitle.
- Community: `performEarlyCommunityJoin` (wizard step 5), `retryPendingJoin` (daily task), `fetchFriendsTrainedToday`, `useCommunityMe`, HomeCommunity* cards, CommunityTab stack.
- Food: food DB migrations at boot (`migrateFoodDayKeysOnce`), `loadMealLabelOverrides` in App.js.
- Payments barrel (inert) and `freeConversion` (live one-shot).

Exposes to others:
- `navigationRef`, `navigateCrossTab`, `navigateCommunity` (used by nearly every screen).
- The store (`useAppStore`) as the cross-feature session/active-workout/rest-timer/prefs surface.
- `useTheme`, `useAccountActions`, `usePhotoSuppression`.
- Widget snapshot writer (called from ActiveWorkout, WorkoutHistory, App).
- `WhatsNewSheet.WHATS_NEW` per-version release copy (CLAUDE.md requires an entry before each build).
- Flags in `featureFlags.js` consumed by sync and database layers.

## B) Product-decision observations

1. Two registered screens nobody can open. CoachReviewScreen (720 lines) and MealNamesScreen (109 lines) have no navigate call (grep of quoted route names). Evidence: RootNavigator.js:483 and 700 register them; SettingsScreen.js:85 comment says the MealNames row was removed. Decision: reinstate an entry point or delete (the founder's deferral rule applies, this is a fork to surface).
2. iOS home-screen and lock-screen widgets and the Live Activity UI are promised in the app but not wired into config. SettingsScreen.js:119-128 describes iOS widgets and a lock-screen widget; plugins/withVolyumeWidget.js exists but is not in app.json plugins, there is no app.config, no `ios.entitlements` App Group, and git history shows it was never added to app.json. INFERRED: iOS TestFlight builds from this repo do not contain the extension. NOT VERIFIED against an actual iOS build. Android widgets are wired.
3. Tier residue is a latent regression risk. `FULL_ACCESS_FOR_ALL` is read in about 9 files, but `tier === 'pro'` or `!== 'pro'` also gates real behaviour in scheduler.js (463-468, 572, 1151, 1507: meal reminders and similar), SettingsDataScreen (scan-name skip) and blockAdvisor (`isPro` selects richer advice). If the flag is ever flipped to re-arm monetisation (documented as a two-step), these silently change for everyone. The CLAUDE.md "tier" gating step is also vestigial (RootNavigator never branches on tier). Opportunity: delete or convert these to unconditional.
4. Dead and stale onboarding code. Wizard step 1 (OAuth-only UI) is unreachable in practice (auto-advance at ProOnboardingScreen.js:894) and its comment contradicts the re-added email sign-in. The quiz-first path (QuizScreen, PlanPreviewScreen, quizFlow, planPreview, onboardingQuiz store slice, ProOnboarding prefill) is entirely behind a false flag since 2026-06-26. LoginScreen is a 13-line alias of Welcome. `user.isLocal` branches persist with no way to create a local user.
5. Phantom and unused dependencies. `expo-application` is statically imported by WhatsNewSheet.js:17 and Article9ConsentScreen.js:8 but is not in package.json (works only because it is transitive in the lockfile); a dependency-tree change could break the build, and CLAUDE.md requires asking before adding dependencies. `react-native-webview` and `promise` have no importer; `@react-native-menu/menu`, `react-native-ios-context-menu`, `react-native-ios-utilities` are zeego peers with iOS autolinking excluded. `xlsx` is a dev dependency with a known-advisory major line (not assessed).
6. OTA looks unconfigured. No `updates` block in app.json while App.js shows an "Update available" prompt and docs refer to OTA-patchable code. If OTA is not set up, the check is dead code and any "ship via OTA" assumption is false. Needs a founder/EAS check.
7. Flag comment drift. `STRUCTURE_ENGINE = true` but its own header says it is OFF on main until the founder signs off rendered plans (structure/release.js:5-8). `PLANNER_V2` and `STRUCTURE_ENGINE` both change plan generation; precedence unclear from this slice. A hard-coded founder programme id (`PROTECTED_PROGRAMME_IDS`) ships in the production bundle.
8. Health integration is a fully built but permanently dark surface: SettingsHealthScreen (233 lines) plus the Settings row logic, with both native getters hard-wired to null (health.js:98-99, founder removed 2026-06-30). Candidate for deletion or a founder decision.
9. Deep-link gap. app.json declares an Android `/p` path-prefix link with `autoVerify`, but `linking.config` has no mapping for `p`; the link opens the app and goes nowhere (INFERRED from config reading; the `p` prefix may be reserved for a web share page, NOT TRACED).
10. Billing bypass of the barrel. App.js requires playBilling directly and wires the real provider at boot. Inert today per the barrel, but it contradicts "nothing reaches billing while the flag is on" and ships react-native-iap native code to every user.
11. Heavy single files concentrate risk: ActiveWorkoutScreen 8014 lines, ProOnboardingScreen 3945, HomeScreen 3817, CoachOutputScreen 3760, NutritionTargetsScreen 2967, WorkoutSummaryScreen 2944; RootNavigator 2434 (boot, auth, consent, navigation in one file); useAppStore 2512.
12. Duplicate surfaces. HowYouTrain, HowYouTrainAdd, TrainingConsiderations, AvoidedMovements, SettingsWorkout are registered in five stacks each (Home, Plans, Progress, Profile, Onboarding), and CommunityCompose/CommunityPost in two, to avoid silent dropped taps; the capabilityRoutesReachable test sweeps this. Settings also repeats entry points (Coaching reminders appears in both Settings and Coach tab; Nutrition targets in both; Injuries in both; Community in both). Consolidation is an IA decision.
13. Version-note repetition. WhatsNewSheet entries 2.11.0 to 2.13.0 repeat the same Community line (WhatsNewSheet.js:158-170), consistent with the "privacy line" rule in CLAUDE.md but meaning 2.14.0 users see Community text that is not new to people who saw it at 2.11.0. INFERRED from the map keyed by version.
14. Health-data consent withdrawal equals account deletion (Article9 screen, SettingsPrivacy). There is no granular withdrawal for Article 9 data other than deleting everything; capability consent is the only granular one. This is a deliberate, documented choice (Article9ConsentScreen.js:267-270) but a product-level limit.
15. Positive findings (for completeness): consent gate fails closed with a 15 s failsafe that can only route to the gate; per-screen error boundaries keep the gate intact on crash; widget payload excludes weight/calories; photo comparison fails closed under ED/calm; delete-account has an RPC fallback plus a durable backstop for auth removal.

## C) Not verified

- Behaviour on a physical device or build; nothing was run. All "LIVE" statuses mean registered and referenced in code, not device-confirmed.
- Whether OTA updates are configured in EAS; whether iOS builds contain the widget extension by some mechanism outside the repo files read.
- RootNavigator lines 1087-1960 and 2060-2125 were skimmed by search, not read line by line (auth listener internals, cloud restore details, `restoreSessionFromCloud` body in useAppStore.js:1006-1243, `refreshTierFromCloud`).
- Contents of most Settings screens were read at the level of labels, switches and navigation targets, not every handler.
- Community screens (25+ files), Diary/Train/Progress screens beyond registration and referrers: owned by other slices.
- `src/lib/notifications/notificationRoute.js` mapping table, `src/lib/proOnboardingDraft`, `src/lib/startWithPlan`, `src/lib/planAutoGen` internals.
- Which exact `tier` consumers beyond those grepped exist in components (grep covered `tier ===`/`isPro` patterns only).
- Precedence between `PLANNER_V2` and `STRUCTURE_ENGINE` inside planAutoGen.
- Whether zeego menus work on iOS given the autolinking exclusions.
- Supabase-side objects referenced (RPCs `record_health_consent`, `delete_user_data`, `record_rpc_fallback_deletion`, `record_capability_consent`, edge function `delete-account`): existence and behaviour server-side not checked.
- docs/* were not used as evidence (per brief); PRIVACY policy text accuracy against actual data flows not audited.
