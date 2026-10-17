# Volyume: architecture and data map (version 3.0.0)

Snapshot taken 2026-10-17 from the repository on branch `audit/final-2026-10-17`. This document is self-contained: it is written so that someone with no repository access can read it and suggest improvements.

How to read the labels used below:

- **Observed**: taken directly from code, configuration, migration files or the project's own status documents.
- **Observation**: a judgement made while mapping. These are candidates for review, not confirmed defects.
- Counts are measured from the repository at the snapshot date and will drift.

---

## 1. Stack and principles

### 1.1 What the product is

- Volyume is a training, nutrition and progress app for lifters. It is a React Native app published on Google Play (Android) and distributed through TestFlight (iOS).
- Observed: package version 3.0.0 (package.json and app.json). Android versionCode 3357. iOS buildNumber 10. Bundle and package identifier `app.volyume`.
- Observed: the product is fully free. There is no trial, no Free and Pro split, no paywall and no pricing in the user experience. The billing code is kept on disk but is unreachable (see section 1.4).

### 1.2 Core stack

- Observed: Expo SDK 54 in the managed workflow, with native code added through Expo config plugins. The project does not eject. The New Architecture is enabled.
- Observed: React Native 0.81.5 and React 19.1.0.
- Observed: JavaScript, not TypeScript. JSDoc comments are checked with `tsc --noEmit`.
- Observed: local database `expo-sqlite` 16 with SQLCipher enabled (`useSQLCipher: true` in app.json).
- Observed: backend is Supabase (`@supabase/supabase-js` ^2.43.4), hosted in EU-Dublin.
- Observed: state management uses Zustand 4.5.7 (one store).
- Observed: navigation uses React Navigation 6 (native stack and bottom tabs) with `react-native-screens`.
- Observed: UI support libraries include `@shopify/flash-list`, `@gorhom/bottom-sheet`, `react-native-reanimated` 4.1, `react-native-gesture-handler`, `react-native-svg`, `@shopify/react-native-skia` 2.2.12, `zeego` and `@react-native-menu/menu`.
- Observed: `date-fns` 3 for date arithmetic (the app's own day logic is in `src/lib/dayKey.js`).
- Observed: `@sentry/react-native` ~7.2 for crash and error reporting.
- Observed: `expo-updates` ~29 is installed (over-the-air update capability).
- Observed: `xlsx` 0.18.5 is listed under devDependencies, not dependencies.

### 1.3 Native and media libraries (Observed)

- `react-native-vision-camera` ^4.7.3 and `expo-camera` ~17: barcode scanning, progress-scan capture and clip recording.
- `@react-native-ml-kit/text-recognition` ^2.0.0: on-device text recognition for nutrition label scanning.
- `react-native-fast-tflite` ^3.0.1: on-device TensorFlow Lite runtime, used by the progress-scan pipeline.
- `expo-image-picker`, `expo-image-manipulator`, `expo-media-library`, `expo-sharing`, `expo-print`: photos, image processing, saving to the gallery, sharing and printing.
- `expo-av`, `expo-haptics`, `expo-keep-awake`, `expo-sensors`, `expo-location`, `expo-local-authentication` (Face ID or device unlock), `expo-apple-authentication` and `@react-native-google-signin/google-signin`.
- `react-native-android-widget` ^0.20.3: home-screen widget on Android. The iOS widget extension is parked (see section 7).
- `react-native-iap` 15.3.1: store billing wrapper. Compiled into the bundle but dormant (section 1.4).

### 1.4 Non-negotiable principles (from the project constitution, CLAUDE.md)

- **Offline-first.** The encrypted on-device database is the source of truth. The cloud is a backup and cross-device copy.
- **Encryption at rest on device.** SQLCipher with a per-device 256-bit key held in the OS keystore (`expo-secure-store`, accessible after first unlock).
- **EU data residency.** All user data stays in Supabase EU-Dublin. One documented exception: transactional email (member and sign-in emails) is sent through Resend, which sends from Ireland and keeps its records in the United States under standard contract clauses. The privacy policy says so.
- **Deterministic coaching.** The coaching engine is pure functions with no I/O, no randomness and no AI or LLM calls. Identical inputs give identical outputs.
- **ED-safety system.** Calorie floors, energy-availability gates, rapid-loss gates and a wellbeing mode. These must not be removed, lowered or made conditional (section 3.3).
- **Article 9 consent.** Health data is special category data under GDPR. An un-skippable consent gate runs before the app is used. It fails closed.
- **Data minimisation.** No personal data goes to Sentry or analytics. Share cards exclude name, measurements and private notes. Two founder-approved exceptions exist (the progress before-and-after card may show bodyweight; the session card's opt-in "show progress" may show a cut goal's weekly change), both withheld under calm mode or an open ED flag.
- **No anonymous mode.** Every user has a real account (Apple, Google or email and password).
- **Fully free (decision D137, 2026-09-03).** Observed: `src/lib/proGate.js` exports `FULL_ACCESS_FOR_ALL = true`. The store clamps every tier write to full access. No route is guarded.
- **Dormant billing.** Observed: `src/lib/payments/` (11 modules) and billing screens are compiled and unit-tested but unregistered. `src/lib/payments/index.js` refuses to load while the flag is on. Re-enabling monetisation takes two deliberate steps: flip the flag and re-register the surfaces.
- **Additive, idempotent migrations.** Every database migration, local or cloud, is additive and re-runnable, with a header stating purpose, status and rollback.
- **Cloud migrations are applied by hand.** The app never runs them. Production application requires an explicit founder phrase per batch.

### 1.5 Scripts and tooling (Observed, package.json)

- `npm test`: `cross-env TZ=Europe/London jest`. The timezone is pinned so day-boundary tests are stable.
- `npm run lint`: `eslint . --max-warnings 0` (ESLint 9, with import, React, React Hooks and React Native accessibility plugins).
- `npm run check:imports`: a script that checks import rules.
- `npm run release:quality`: strict type check, lint, import check and the full test suite.
- `npm run release:check`: clean install with `--legacy-peer-deps --ignore-scripts`, then release quality, then `release:audit`.
- Several `progress-scan:*` scripts for calibration and replay of the progress-scan pipeline.
- `verify:android:16kb` and `verify:android:sqlcipher`: checks for 16 KB page-size compatibility and for SQLCipher in the Android build.

---

## 2. Code layout and data flow

### 2.1 Top-level layout (Observed)

- `App.js` and `index.js`: entry point. Registers background tasks, sync triggers, deep links, the accessibility listener and app-state handling.
- `src/screens/`: 104 `*Screen.js` files (CLAUDE.md states 82; the count has grown).
- `src/components/`: about 113 files of shared UI.
- `src/navigation/`: `RootNavigator.js` (the single navigator), theme and deep-link helpers.
- `src/store/useAppStore.js`: the one Zustand store, 2,541 lines.
- `src/lib/`: about 247 entries (modules and folders). This is where the logic lives. Section 2.4 lists them.
- `src/styles/`: theme tokens (`theme.js`), typography (`fonts.js`), layout helpers.
- `src/widgets/`: home-screen widget content and task handler.
- `src/hooks/`: shared React hooks.
- `modules/`: four local native modules (section 7.1).
- `supabase/`: migrations, edge functions, email templates and a schema-drift audit query.
- `public/`: the static website (section 6.3).
- `.maestro/`: Maestro end-to-end flows (4 files).
- `scripts/`: build, release, verification and calibration scripts.
- `.github/workflows/`: CI and manual build and deploy workflows (section 8.1).
- `docs/`: specifications, decision registers and handovers (about 187 entries).

### 2.2 Data flow

The intended one-way flow is:

1. **UI** (screens and components) calls functions in `src/lib/`.
2. **Domain logic** in `src/lib/*` (pure engines plus the coordinating modules) reads and writes through the data layer.
3. **Data layer**: `src/lib/database.js` (general schema and queries, 14,872 lines) and `src/lib/food/db.js` (food domain, 3,389 lines). These are the only places that touch the local SQLite database.
4. **Sync layer** (`src/lib/sync/` and the legacy `src/lib/sync.js`) pushes local changes to Supabase and pulls remote changes back.
5. **Supabase** holds the cloud copy. Row-level security limits each user to their own rows.

Rules that hold across the code:

- Components never query Supabase directly. Everything goes through the sync layer.
- The store holds session and derived state. It does not bypass the database.
- The two main gates to the cloud are `src/lib/sync/transport.js` (sync) and `src/lib/community/transport.js` (Community). A guard test pins that only the Community transport imports the Supabase client inside the Community folder.
- Lib modules that need the store use a lazy `require` to avoid import cycles.

### 2.3 Navigation and routing

- Observed: `RootNavigator.js` routes by auth state, then the Article 9 consent gate, then first-run onboarding, then tier. Because the tier is clamped to full access, the tier step currently passes everyone through.
- Observed: deep links use the `volyume://` scheme (for example `volyume://workout/start` and `volyume://diary`, from the iOS quick actions). Universal and app links are served from `public/.well-known/`.
- Observed: `src/navigation/navigateCommunity.js` and `navigateCrossTab.js` handle navigation across the tab structure. `safeGetStateFromPath.js` guards deep-link state restoration.

### 2.4 src/lib map (Observed names, one or two lines each)

**Coaching engines (pure, deterministic)**

- `planEngine.js` (3,714 lines): training volume and plan generation using the MEV, MRV and MAV landmarks. Pure, no randomness.
- `structure/` (12 files, engine.js 2,378 lines): the structure engine, the live plan builder since decision D222. It builds a week from a rulebook in stages and never saves a plan that fails its own checker.
- `plan/` (16 files): plan helpers, rationale and fit checks used with the structure engine.
- `nutritionEngine.js` (1,320 lines): BMR (Mifflin-St Jeor, Katch-McArdle), TDEE, macros, calorie floors, the FFM floor and energy-availability caution.
- `weeklyCoach.js` (2,794 lines): the weekly coaching run. Turns check-ins, weight trend and training data into a coaching card.
- `coachApply.js` (429 lines): applies a coach suggestion only after the user taps Apply. Floors are re-enforced here.
- `coachApplySafety.js`, `coachApplyView.js`, `coachDecision.js`, `coachOutcome.js`, `coachPrecedence.js`, `coachIntervention.js`, `coachReport.js`, `coachStory.js`, `coachResponse.js`, `coachRegister.js`, `coachGlossary.js`, `coachLedger.js`, `coachContext.js`, `coachDecline.js`: safety checks, presentation, ledger and wording for coach output.
- `coachOutput/` and `coachOutputZones.js`: structured coach output and zone classification.
- `coachingGoals.js`: goal definitions, goal overlays and phase overlays.
- `mesocycle.js`, `blockProgression.js`, `blockReview.js`, `blockSeed.js`, `blockMetrics.js`, `blockAdvisor.js`, `blockExplain.js`, `blockLedgerRunner.js`, `blockLedgerGather.js`, `blockWeekProgress.js`: training block lifecycle, progression, review and ledger.
- `planAutoGen.js`, `poolGenerator.js`, `planRebuild.js`, `planRebuildNote.js`, `planDiff.js`, `planDisplay.js`, `planFit.js`, `planRationale.js`, `planSwitch.js`, `planVolumeTargets.js`: plan generation support, rebuild and presentation.
- `algorithms.js`: e1RM, tonnage, volume allocation and related maths.
- `trainingLoad.js`, `trainingRecency.js`, `trainingStatus.js`, `volumeJudgement.js`, `volumeWindow.js`, `volumeLogged.js`, `volumeBandLabels.js`, `volumeInsightCopy.js`: training load, recency, status and volume interpretation.
- `recovery/` (13 files) and `recoveryState.js`, `recoveryEMA.js`: recovery modelling and readiness.
- `weightTrend.js`, `robustTrend.js`, `trendInBand.js`, `recompReframe.js`, `learnedRange.js`, `femaleNutritionAwareness.js`, `maintenanceInputs.js`, `effectiveMaintenance*.js`: weight trend, maintenance estimation and recomposition framing.
- `insightsEngine.js`, `plateauSurfacing.js`, `liftProgress.js`, `strengthStandards.js`, `bestLift.js`, `pastWorkoutPRs.js`, `milestones.js`, `tonnageMilestone.js`: insights, plateaus, PRs and strength standards.
- `restSuggest.js`, `restTimerMath.js`, `restSound.js`, `warmupRamp.js`, `circuitRound.js`, `timeConstraint.js`, `swapEngine.js`, `energyChoice*.js`, `unilateral.js`: rest, warm-up, circuits, swaps and energy choice.

**Safety and wellbeing**

- `edPatternDetector.js` (157 lines): the eating-disorder pattern check. Pure. Reads weight history, check-ins and food adherence, and raises a flag when signals stack.
- `wellbeing.js` (47 lines): the user's wellbeing setting, with values `calm`, `normal` and `unspecified`. Stored in AsyncStorage.
- `safetyState.js`, `reEntryCheck.js`, `reEntryEaseState.js`, `cyclePhase.js`, `cyclePrefs.js`, `femaleNutritionAwareness.js`: safety state, return-to-training checks and cycle-aware preferences.
- `energyChoice.js` and `energyChoiceEnforce.js`: energy-availability choices and their enforcement.

**Data layer**

- `database.js` (14,872 lines): the local SQLite schema and general queries. Owns `SCHEMA_MIGRATIONS` (96 numbered entries, run once each via `PRAGMA user_version`).
- `database/` (3 files): `activity.js`, `bodyMetrics.js`, `planFolders.js`, repositories split out of `database.js`.
- `dbCrypto.js` (493 lines): opens the SQLCipher database. Holds the key in SecureStore. Never deletes the plaintext database until an encrypted copy is verified. Falls back to plaintext and logs if encryption fails.
- `dbSnapshot.js`, `localDbReset.js`, `deviceWipe.js`, `dataBackup.js`, `dbSnapshot`: snapshot, reset, wipe and backup of local data.
- `sqliteBoundary.js`: connection guard for SQLite calls.
- Real-database tests (names ending in `.realdb.test.js`) run against SQLite beside these modules.
- `sync.js` (3,308 lines), `syncQueue.js` (467 lines), `sync/`: section 5.

**Food and nutrition (`food/`, 63 files)**

- `db.js` (3,389 lines): the food domain's SQLite reads and writes.
- `diaryViewModel.js`, `diaryDates.js`, `diaryInPlace.js`, `habits.js`, `frequents.js`, `aroundThisTime.js`: diary view models, dates, frequent foods and habits.
- `calorieBank.js`, `waterfall.js`, `effectiveTargets.js`, `perDayTargets.js`, `nutrientSummary.js`, `macros.js`, `micronutrients.js`, `micronutrientCoverage.js`, `adherence.js`, `insights.js`: calorie banking, target calculation, macro and micronutrient summaries and adherence.
- `mealPlanAssembler.js`, `mealPlanService.js`, `mealSlots.js`, `mealSuggest.js`, `mealSwap.js`, `mealRationale.js`, `mealReminderOffer.js`, `mealAdditions.js`, `planEdit.js`, `planExplain.js`, `planPreferences.js`, `planContinuity.js`: meal plans, slots, swaps, rationale and reminders.
- `recipeImport.js`, `recipeWeight.js`, `savedMealItems.js`, `curatedMeals.js`, `curatedFoods.js`, `seed.js`, `portions.js`, `servingEntry.js`, `gramSolve.js`, `foodLine.js`, `foodRoles.js`, `foodSwapScope.js`, `labelName.js`, `entryNote.js`: recipes, saved meals, curated seed data, portions and serving logic.
- `ocr.js` and `ocrParser.js`: parse nutrition label text from on-device recognition.
- `importHistory.js`, `importHistoryFlow.js`, `csvExport.js`, `groceryList.js`, `bulkEntryOps.js`, `writeback.js`, `libraryDelta.js`, `loggingPayloads.js`: import, export, grocery list, bulk writes and cloud write-back.
- `sources/` (liveOff.js, localCache.js, usda.js) and `normalisers/usdaToFood.js`: food data sources. Open Food Facts UK snapshot, USDA, and a local cache with full-text search.
- `concurrency.js`, `loadRaceGuard.js`, `freshness.js`, `sanityChecks.js`: race and sanity guards for food writes.

**Sync (`sync/`, 29 files, plus `sync.js`)**

- Section 5 covers this in detail.

**Notifications (`notifications/`, 26 files)**

- Section 7.3 covers this in detail.

**Community (`community/`, 42 files)**

- Section 6.4 covers this in detail.

**Clips (`clips/`, 5 files)**

- `store.js`, `rules.js`, `cues.js`, `cameraTips.js`, `index.js`: the local-only store and rules for short workout clips. Clips are kept on the device and never synced (see section 7.4).

**Share cards and share video (`shareCard/`, 9 files; `shareVideo/`, 3 files)**

- Section 7.4 covers this in detail.

**Progress photos and progress scan (`progress/`, `progress*.js`, about 30 files)**

- `progressPhotos.js`, `progressPhotosController.js`, `progressPhotoMeta.js`, `progressPhotoTimeline.js`, `progressPhotoDates.js`, `progressPhotoOrientation.js`, `progressCaptureGuide.js`, `progressSeries.js`: capture, storage metadata, timeline and series.
- `progressScan*.js` (about 17 files): the progress-scan pipeline. Calibration, classification history, vision analysis, trend and comparison view models, storage (`progressScanStore.js`) and the coach evidence bridge. Uses the local image module and TFLite.

**Partners (retired in code, partly remains)**

- The Partners surface was retired under decision SD-03 (2026-09-06). The `src/lib/partners/` folder no longer exists in the current tree. Some local tables and the cloud partner tables remain (section 4).

**Payments (`payments/`, 11 files; dormant)**

- `playBilling.js`, `catalogue.js`, `restore.js`, `cascade.js`, `lapseDetect.js`, `winbackState.js`, `freeConversion.js`, `pendingCascade.js`, `storeErrors.js`, `usePlayPrices.js`, `index.js`: store catalogue, purchase, restore, lapse detection and win-back logic. Unreachable while `FULL_ACCESS_FOR_ALL` is true. Product IDs `pro_monthly` and `pro_annual` must never change.

**Consent (`consent/`, 3 files)**

- `healthConsentRead.js`: reads the Article 9 consent. Local cache first, then the cloud profile. Fails closed: it grants consent only from a real grant recorded in the cache or in the cloud row.
- `capabilityConsent.js`: consent for capability-level features.
- `pendingConsent.js`: holds a consent decision that has not reached the cloud yet.

**Member email (`memberEmail/`, 4 files)**

- `subscription.js`, `topics.js`, `copy.js`, `appSeen.js`: the in-app side of the team's member email. Users can turn email off; one topic exists today (`weekly_summary`). Section 6.2 covers the server side.

**Identity and auth**

- `supabase.js`: the Supabase client.
- `authBootGate.js`, `authCallbackState.js`, `authDeepLink.js`, `authErrorCopy.js`, `appleIdentity.js`, `accountEpoch.js`, `accountTransitionGuard.js`, `biometricLock.js`, `deviceLocation.js`: sign-in boot gate, OAuth callbacks, Apple identity, account transitions and the app lock.

**Telemetry, observability and errors**

- `sentry.js`: Sentry set-up. The DSN comes from an environment variable. Sample rate 0.05 in production, 1.0 in development.
- `observability/` (networkNoise.js, r2Wording.js, sentryScrub.js): Sentry scrubbing and noise filtering.
- `errorLog.js` (372 lines): `logError`, `logWarn` and `logInfo`. Keeps a ring buffer in AsyncStorage, visible on device in the Debug logs screen.
- `engineTelemetry.js`: back-compatible shim over `telemetry/transport.js`.
- `telemetry/` (5 files, `events.js`, `firsts.js`, `transport.js`, `sentryBridge.js`): event catalogue, first-time milestones, the telemetry queue and the Sentry bridge.

**Other domains**

- `dayKey.js`: local-day keys and UK-local week boundaries (weeks start on Monday). Used everywhere that needs a day.
- `weekWindows.js`, `workoutDate.js`, `streak.js`, `streakState.js`, `cancelReason.js`: week windows, dates and streaks.
- `keypadEntry.js`, `parseDecimalInput.js`, `numericBoundary.js`, `units.js`, `format.js`, `safeFormat.js`, `bodyMetricValidate.js`, `bodyMetricsDisplay.js`, `bodyMetricsPolicy.js`, `bodyMetricsHistoryMerge.js`: input parsing, units and formatting.
- `exercise/` (19 files), `exerciseCorpus/` (19 files, family definitions for the exercise library), `exerciseFuzzySearch.js`, `exerciseHistory.js`, `exerciseInstructions.js`, `exerciseMetadata.js`, `exerciseDisplay.js`, `exercisePickerSections.js`, `formTips.js`: the exercise library, search, history and display.
- `library/` (5 files): library helpers.
- `capability/` (18 files): capability constraints (for example exercise limits from a person's needs), with their consent and telemetry.
- `gyms/` (5 files): gym directory and selection.
- `home/` (4 files) and `widgets/` (4 files): home-screen content and widget data.
- `onboarding/` (1 file) and `proOnboardingDraft.js`: onboarding draft state.
- `division/` (1 file) and `divisionDiff.js`: division-level comparisons.
- `checkinPlan.js`, `checkinDerive.js`, `weeklyStory.js`, `homeCoachBrief.js`: weekly check-in logic and summaries.
- `notifications/` and `sync/`: sections 7.3 and 5.
- `storeReview.js`, `activation.js`, `activationNudge.js`, `trialActivation.js`, `attribution.js`, `contestCountdown.js`: store review prompts, activation nudges and attribution.
- `feedback.js`, `importExternal.js`, `haptics.js`, `storeName.js`, `brand.js`, `uuid.js`, `reorder.js`, `startWithPlan.js`, `quickSession*.js`, `sessionReport.js`, `sessionShareData.js`, `sessionAdjustments.js`, `sessionEffective.js`, `livePrescription.js`, `interBlock.js`, `nextBlockPreview.js`: smaller helpers for sessions, feedback, import and presentation.
- `seedExercises.js`, `seedRoutines.js`, `seedRoutines.bandPlans.js`: seed data for exercises and routines.

---

## 3. Coaching engine and safety system

### 3.1 Determinism and purity

- The engine modules (`planEngine.js`, `structure/engine.js`, `nutritionEngine.js`, `weeklyCoach.js`, `edPatternDetector.js` and others) are pure: no I/O, no database calls, no `Math.random()`.
- Observed: the live plan builder is the structure engine (decision D222). Stages run in order: the core of each session and each muscle's first exercise are placed first, then each muscle's own sets, then focus on top. The engine never removes a set to fit a clock: rest is shortened first, and a session still more than five minutes over asks the user for a longer session or more days.
- Observed: the structure engine's checker must pass before a plan is saved.

### 3.2 Coaching flow

1. The weekly check-in, weight trend and training data go into `weeklyCoach.js`.
2. The output is a coaching card with a trend summary, what is working, suggested adjustments and a plain-English rationale.
3. Each adjustment is shown as a suggestion. Nothing changes until the user taps Apply (decision of 2026-05-28: no silent automatic changes, including calories).
4. Applying runs through `coachApply.js`, which re-enforces floors. Applied state is stored in the coach output's JSON.

### 3.3 ED-safety rules (must not be weakened)

Observed in `nutritionEngine.js` and related files:

- **Calorie floors**: 1,500 kcal per day for men, 1,200 kcal per day for women. When sex is unknown, the higher floor (1,500) applies. The code comment at the floor function records this deliberately.
- **FFM energy floor**: 30 kcal per kg of fat-free mass per day (the IOC RED-S consensus threshold). Below the user's FFM-derived floor, deficit suggestions are refused. A fallback estimate is used when body fat is unknown.
- **Rapid-loss gate**: a weekly loss of 1.5% of body weight or more is a hard gate (`HARD_GATE_LOSS_RATE`).
- **Maximum safe loss**: 0.8% of body weight per week (`MAX_SAFE_LOSS_RATE`).
- **Sex gate in onboarding**: biological sex must be chosen explicitly before onboarding continues. There is no default.

Observed: the ED pattern detector (`edPatternDetector.js`) reads signals such as rapid loss (signal s1) and raises a flag when signals stack. An open flag:

- suppresses weight and food-adjacent notifications,
- withholds automatic Community posts server-side (migration 192),
- switches the app to the calm experience.

Observed: the flag is stored locally and in the cloud table `ed_pattern_flags`. Migration 182 (live) lets a device raise and clear its own flag through a cloud push. The status documents record that no shipped build carries that push yet, so the server-side gates armed by it are dormant in practice until one does.

### 3.4 Wellbeing and calm mode

- Observed: `wellbeing.js` stores a user-controlled setting. `calm` softens the app. `normal` turns it off. `unspecified` is the default and shows normal UX.
- Observed: Beat UK signposting is shown in the wellbeing flows and must not be removed or gated.
- Observed: calm mode and an open ED flag both suppress the progress-photo share card and the body-weight parts of share cards.

### 3.5 Consent gate

- The Article 9 consent gate in `RootNavigator` is un-skippable and must run before the app is used.
- The sign-in resolution reads consent through `healthConsentRead.js`. A transient read failure keeps the user out, never in.

---

## 4. Local database and cloud schema by area

### 4.1 Local SQLite (device truth)

- Observed: `database.js` owns the local schema. Migrations are an ordered `SCHEMA_MIGRATIONS` array (96 numbered entries), each applied once through `PRAGMA user_version`. Some early entries are column additions that predate version tracking.
- Observed: the food domain's tables are created by the same migrations. `food/db.js` holds the CRUD for them.
- Observed: encryption is SQLCipher. The key is 256 random bits, held in the device keystore.

Local tables (Observed names, grouped):

- **Training**: `workouts`, `workout_sets`, `workout_notes`, `workout_notes_v`, `routines`, `routine_exercises`, `programmes`, `mesocycles`, `mesocycle_weeks`, `plan_folders`, `peak_week_plans`, `planned_muscle_volume`, `planned_muscle_volume_sync`, `coach_outputs`, `exercise_goals`, `exercise_intent`, `exercise_slot_defaults`, `exercise_swaps`, `exercise_user_notes`, `exercises`, `custom_exercises`, `session_resolutions`, `session_constraint_effects`, `capability_constraints`, `adaptation_events`, `adaptation_events_sync`, `cardio_log`, `effective_maintenance_memos`, `workout_clips`.
- **Body and check-ins**: `weekly_checkins`, `body_metric_log`, `morning_weights`, `user_body_profile`, `daily_steps`, `user_insights`.
- **Food and nutrition**: `foods`, `food_entries`, `custom_foods`, `food_favourites`, `food_frequents`, `food_slot_recents`, `food_swaps`, `daily_water`, `daily_intake_rollups`, `nutrition_targets`, `meal_plans`, `saved_meals`, `recipes`, `recipe_ingredients`.
- **Progress photos and scan**: `progress_photo_meta`, `progress_scan_assets`, `progress_scan_sessions`, `progress_scan_classification_history`.
- **Safety and tier**: `ed_pattern_flags`, `tier_history`.
- **Partners (legacy)**: `partnerships`, `partner_cheers`, `partner_shared_blocks`, `partner_week_signals`, `partner_weekly_intentions`, `partner_win_cards`.
- **Sync and telemetry**: `pending_sync_ops` (offline queue), `sync_meta` (watermarks and state), `engine_telemetry`.
- **Other**: `workout_notes_v` (a view-style name from the grep, not verified).

Observation: a few names in the grep output were SQL keywords or comment fragments and were ignored, so this list is a close approximation rather than an exhaustive dump.

### 4.2 Cloud (Supabase, EU-Dublin)

- Observed: migrations are numbered `supabase/migrate_NNN_*.sql`, from `migrate_001` to `migrate_199`. Numbers 011, 026, 082 and 083 were never used. `085` and `152` each name two files.
- Observed: the status is recorded in `supabase/README.md` and `CLAUDE.md`. Per those records: all migrations through 199 are applied to production except `049` (HELD, destructive, must not be applied), `072` (deliberately never applied) and `150` (retired). Applications of 198 and 199 are dated 2026-10-17. This map did not re-verify the live database.
- Observed: `schema.sql` and `setup_complete.sql` are stale snapshots. The base tables (`workouts`, `workout_sets`, `routines`, `profiles`, `weight_log` and the like) are defined there, and the migrations are canonical for later changes.
- Observed: about 330 distinct functions are created or replaced across the migrations. This includes the helper functions and about 70 Community RPCs (approximate grep count).

Cloud tables by area (Observed names):

**Identity, profile and consent**

- `profiles` (the registry name for the user's profile row; the legacy name is `users_profile`), with per-column merge timestamps (`column_updates_at`, migration 045).
- `user_prefs`, `user_body_profile`, `user_feedback`, `user_insights`.
- `consent_log`: consent decisions, including Article 9 health consent and Community visibility.
- `notification_preferences`: per-category push and in-app preferences.
- `device_push_tokens`: Expo push tokens per device (migration 053).
- `account_deletions_log`: deletion audit, anonymised in migration 097.
- Account deletion uses `delete_user_data()` (re-issued over time to cover new tables; migrations 154, 160 and 161 re-issue it in full, with the Community deletes) and the `delete-account` edge function, which also removes the auth user.

**Training**

- `workouts`, `workout_sets`, `workout_notes`, `routines`, `routine_exercises` (base tables; `workout_sets.entry_typed` added in migration 189, `workout_sets.evidence_class` in 159).
- `programmes` (with `plan_facts` added in migration 188), `mesocycles` (with `block_ledger` in 131 and `deload_week` in 129), `mesocycle_weeks`.
- `plan_folders` (089), `exercise_goals`, `exercise_intent` (136, expiry 142), `exercise_swaps` (137), `exercise_slot_defaults`, `custom_exercises` (020).
- `session_resolutions` (140), `session_constraint_effects` (146), `capability_constraints` (145), `capability_adaptation` modes (152).
- `cardio_log` (064, external id 087), `planned_muscle_volume` (132 provenance), `effective_maintenance_memos` (141).
- `peak_week_plans`: legacy, held by migration 049, which must not be applied until the client prerequisites land.

**Body and check-ins**

- `weight_log` (registry name), `body_composition_log`, `morning_weights` (with `updated_at`, 060), `weekly_checkins` and `weekly_checkins_v2` (last-write-wins, 047 and 058).
- `daily_steps` (056), `perday_target_offsets` (110).

**Nutrition and food**

- `foods` (the shared food library, with pull RPCs in 028 and 116), `food_entries` (with `note` in 194, `eaten_at` in 115, `weight_state` in 114), `custom_foods` (barcode 023, portions 195), `food_favourites` (kind 048), `food_frequents`, `food_swaps` (138), food delete tombstones (090) and soft-delete columns (196, 197).
- `saved_meals`, `recipes` (`cooked_weight_g` in 196), `recipe_ingredients` (soft delete in 046).
- `daily_water` (052 reconcile), `daily_intake_rollups` (server-derived), `nutrition_targets` (with goal protein in 111 and micronutrients in 109), `meal_plans` (086), allergen exclusions (112), meal slots (057, numbered slots in 059).

**Safety, tier and billing (dormant except telemetry)**

- `ed_pattern_flags` (017; pull-only derived state; cloud push added by 182).
- `tier_history`, the trial ledger (071), `founder_pro_ledger` (108), `pricing_config` (030 and later). Tier infrastructure and the cascade workers (031) exist in the cloud but are not reachable from the app while full access is on.
- `engine_telemetry`, `engine_overrides`, `scan_calibration_events` (126, 127), and the telemetry allow-list used by `record_engine_telemetry` (extended in migrations 029, 104 and 156).

**Partners (retired in code; cloud objects remain)**

- `partnerships`, `partner_blocks`, `partner_cheers`, `partner_shared_blocks` (100), `partner_week_signals`, `partner_weekly_intentions` (105), `partner_win_cards` (107). The `partner-cheer` edge function still exists.

**Community (migrations 160 to 191)**

- About 25 `community_*` tables. Migration 160 created 14 at the start, and later migrations added connections, conversations, messages, groups, group members and invites, group messages, challenges, programmes, rate events and moderation. The main groups are profiles, posts, comments, reactions, follows, blocks, mutes, reports, moderators and moderation log, programmes and uses, groups and their members, invites, messages and challenges, activity and notify-daily counters.
- Row-level security is enabled on every Community table. No policy grants anon or authenticated direct access. All reads and writes go through SECURITY DEFINER RPCs with a fixed `search_path`, and EXECUTE is revoked from anon and PUBLIC.
- Community rules are versioned (`_community_rules_version()`, version 2 since migration 161). Connecting, messaging and training-profile updates are blocked until the user accepts the current rules.
- Feed scopes and sort are from migration 190. Presence, group chat and challenges arrived in 191.

**Gyms directory (162 to 181)**

- `gym_venues`, `gym_brands`, `gym_postcode_sectors`, `gym_reports`, `gym_submissions`, `gym_venue_history`, `gym_venue_sources`, with moderation lists (181) and dedupe and geocell helpers.

**Scan and calibration**

- `scan_calibration_events` (126) and the vision debug extension (127). Used to calibrate the progress-scan pipeline.

**Internal tooling (not used by the app's users)**

- Marketing HQ: `marketing_admins`, `marketing_channels`, `marketing_content`, `marketing_email_log`, `marketing_email_optout`, `marketing_ledger`, `marketing_metrics`, `marketing_promo_codes`, `marketing_survey_responses`, `marketing_waitlist` (120, 121, 122, 124).
- Member email: about 22 `member_email_*` tables (for example `member_email_campaigns`, `member_email_sends`, `member_email_deliveries`, `member_email_suppressions`, `member_email_prefs`, `member_email_audit_log`, `member_email_admin_logins`) and `member_surveys` with `member_survey_answers`. Migrations 198 and 199.
- `member_app_seen_days`: a record of days the app was seen, read by the app-seen helper in the member email folder (`appSeen.js`).

### 4.3 Security model

- Observed: row-level security is on for user tables. Direct client writes to some tables were locked down in migration 119.
- Observed: SECURITY DEFINER functions revoke anon EXECUTE (130), and default privileges for functions were tightened (153).
- Observed: `supabase/audit_cloud_schema_drift.sql` is a query for checking live schema against the migrations.

---

## 5. Sync, offline queue and conflict rules

### 5.1 Principle

- The device is the source of truth. The cloud is a backup and a second copy for other devices.
- Writes land in SQLite first, then go to the cloud.
- Pulls bring cloud changes down. Last-write-wins applies to most tables, with the device's view kept as the truth for user edits.

### 5.2 Components

- `sync/registry.js`: the registry of tables to sync. Observed: 24 entries. Each entry names the table and its strategy.
- `sync/runner.js`: the single runner. All sync triggers go through `syncAll()`. An in-memory lock stops two rounds from running at once. `getStatus()` drives the status indicator (synced, pending, offline, error).
- `sync/transport.js`: the per-table dispatch. Observed: `MIGRATED_TABLES` lists 17 tables with their own handler under `sync/tables/`.
- `sync/tables/` (21 files, about 3,000 lines): one handler per migrated table, or per shared group (the food domain shares one bulk RPC pair in `foodDomain.js`).
- `sync.js` (3,308 lines, legacy): the older per-entity functions. Tables not yet migrated still use it. Its header records the migration plan.
- `sync/conflict.js`: the conflict dispatcher. Every resolution emits a `sync_conflict_resolved` event.
- `sync/watermark.js`: per-table pull watermarks, kept in AsyncStorage. Pulls ask only for rows changed since the last pull. Sign-out clears the watermark.
- `sync/signOutGuard.js`: during sign-out the local database is pushed first, then wiped. The guard stops other sync triggers from pulling data back into the database that is being wiped.
- `sync/featureFlags.js`: feature flags for push. Observed names: `CIRCUIT_SYNC_COLUMNS_ENABLED`, `PLAN_FACTS_PUSH`, `ENTRY_TYPED_PUSH`, `STRUCTURE_REFUSED_TELEMETRY`, `CUSTOM_FOOD_PORTIONS_PUSH`, `FOOD_ENTRY_NOTE_PUSH`, `RECIPE_COOKED_WEIGHT_PUSH`. The project status records several as on. Read the file header for the current state of each.
- `sync/telemetry.js`: sync telemetry.
- `syncQueue.js` (467 lines): the offline queue. Failed writes are stored in `pending_sync_ops` with an exponential backoff. The queue drains when the app returns to the foreground.

### 5.3 Triggers

Observed in `App.js` and `sync/runner.js`:

- app foreground and background,
- network reconnect (NetInfo),
- write (after a save),
- a periodic background task (`VOLYUME_DAILY_SYNC`, through expo-background-fetch and expo-task-manager), and a 15-minute periodic trigger in the app.

Every trigger routes through `syncAll()`. `syncAll()` fails closed when it cannot prove consent.

### 5.4 Conflict strategies

Observed from `sync/registry.js`:

- **last_write_wins**: the server compares the incoming `updated_at` and the newer write wins. Most user tables.
- **server_wins** (pull-only): the client never pushes. The server is authoritative for derived state such as rollups, flags and history.
- **merge**: profile-only, per column, using the `column_updates_at` map. This stops two phones editing different fields from overwriting each other.

### 5.5 Deletes

- Observed: food deletes use soft deletes with tombstones (migrations 090, 196, 197). A tombstone carries the server's time. Undo revives a cloud tombstone. Late deletes from an offline device reach other devices (197).
- Observed: recipe ingredients soft-delete (046).

### 5.6 Community sync

- Community does not use this sync layer. It calls its own transport (`src/lib/community/transport.js`), which is the only file allowed to call Supabase for Community. Each call goes through the RPCs and the rules and consent gates.

### 5.7 Observations

- Observation: the legacy `sync.js` (3,308 lines) and the registry run side by side. Each table has to be migrated and its legacy path removed. Duplicate paths are a source of drift.
- Observation: sync correctness depends on the watermark living in AsyncStorage. If sign-out does not clear it, a re-login may skip rows. The sign-out guard is documented to handle this.

---

## 6. Backend functions, website and admin tools

### 6.1 Edge functions (supabase/functions/)

Observed from each function's header comment.

- `app-store-verify`: verifies an iOS StoreKit 2 purchase (signed transaction) and grants Pro server-side. Dormant because billing is off.
- `app-store-notifications`: App Store Server Notifications V2 handler (renewals, refunds, revocations). Dormant.
- `play-billing-rtdn`: Google Play real-time developer notifications, plus client verification. Dormant.
- `send-push`: server-side push fan-out. Reads `device_push_tokens` and sends through Expo's push API. Used for events only the server can see, such as a failed subscription payment.
- `community-notify` (version 5, deployed 2026-10-08): push notifications for Community events (reactions, comments, groups, messages). Carries `kind`, `post_id` and `group_id`.
- `community-public` (version 4, deployed 2026-10-08): the anonymous read-only window for shared links: programme (`/p/`), story (`/s/`) and profile (`/u/`). Uses the service role internally.
- `partner-cheer`: authenticated cheer sent to a training partner. Stamps the UTC date. The Partners surface is retired in the client, but the function remains deployed.
- `delete-account`: deletes the user's data through `delete_user_data()` and removes the auth user.
- `member-email-admin` (version 2 file also present, `v2.ts`): back end of the members admin page. Headed "written, not deployed (2026-10-17)" in its header.
- `member-email-public`: survey page, unsubscribe page and one-click unsubscribe. Headed "written, not deployed (2026-10-17)".
- `member-email-runner`: the scheduler, called every five minutes by pg_cron through pg_net (migration 199). Headed "written, not deployed". The cron job exists but its function is not deployed (per the status documents).
- `member-email-webhook`: receives Resend delivery events (opens, clicks, bounces). Signed. Headed "written, not deployed".
- `_shared/`: `memberEmail.ts`, `memberEmailServer.ts`, `appStore.ts`, `boundedJson.ts` and tests (`*_test.ts`).

Observation: four member-email functions are written but not deployed at the snapshot date, so the member-email feature is not live even though its tables (migrations 198 and 199) are applied.

Deployment is manual. The `deploy-functions.yml` workflow is manual dispatch with a function name input.

### 6.2 Member email (team email system)

Observed from the function headers and `docs/member-email-2026-10-17/`:

- Purpose: the team sends email to members (for example a weekly summary) and runs surveys, under a private admin page.
- Members receive email by default and can turn it off. The admin can exclude people.
- Sending is through Resend. Records are kept in the United States under standard contract clauses (a founder-approved exception to EU residency, documented in the privacy policy).
- Tables: about 22 `member_email_*` tables plus survey tables (section 4.2). Every admin action is written to an audit log, and the audit log is append-only.
- Topics: one today, `weekly_summary`. The in-app topic toggle mirrors the main subscription pattern (local mirror, cloud RPC, pending marker, offline replay through the sync queue).
- Automations and segments are data-driven. A runner evaluates them every five minutes.

### 6.3 Public website (public/, 38 files)

Observed: static pages served from GitHub Pages (`deploy-pages.yml`, manual dispatch) on the custom domain `volyume.app` (`CNAME`). Pages:

- `index.html`: home page.
- `get/index.html`: the app's landing and download page.
- `articles/`: an index and three articles (training volume, when to change calories, why explainable coaching beats black-box coaching).
- `support/`: support and FAQ.
- `privacy/`, `privacy.html` and `privacy-policy.md`: the privacy policy.
- `survey/`: the two-minute member survey (served by `member-email-public`, not yet deployed).
- `email/unsubscribe/` and `email/preferences/`: email unsubscribe and preference pages (also served by `member-email-public`).
- `auth/callback/` and `auth/confirm/` (with `security.js`): OAuth and email confirmation landing pages.
- `p/`, `s/`, `u/`: public share pages for programmes, stories and profiles, which fetch from `community-public`.
- `g/`: Community group invite landing page.
- `partner/`: training partner invite page (the Partners surface is retired in the app, so the page's continued use is an open question).
- `app-map/`: a plain-English app map page with an audit (`data-outputs.html`).
- `members/`: the private members admin page (section 6.4).
- `.well-known/`: `apple-app-site-association` and `assetlinks.json` for universal and app links.
- `404.html`, `favicon.png`, `volyume-wordmark.png`, `volyume-v.png`, `screenshots/`.

### 6.4 Members admin page (public/members/)

Observed:

- A single static page (`index.html`) with plain JavaScript (`members.js`, no libraries). It is marked `noindex, nofollow` and sends no referrer.
- Every network call goes to `member-email-admin` with an action and a session token. The page's views are Home, Emails, Automations, Surveys, People and More.
- Server text is written with `textContent`, never as HTML. The email preview renders inside a sandboxed iframe.
- The session token is stored in `localStorage` under a fixed key.

Observation: the session token in `localStorage` is a convenience for the team's own browser. It is readable by any script running on the same origin, so the page's content security posture matters. Review this before adding third-party scripts to the page.

---

## 7. Native modules, notifications, media

### 7.1 Local native modules (modules/)

- `live-activity`: iOS Live Activity and Dynamic Island for the rest timer, through ActivityKit. Includes a `widget/` folder. Returns unavailable on Android and in Expo Go.
- `rest-timer-live`: the rest timer's ongoing notification and foreground controls on Android (no iOS folder). Carries exercise name, end time, channel and deep link.
- `progress-scan-image`: image handling for the progress scan. Extracts RGB pixels from a photo, returns a content rectangle and a lighting score, and runs person segmentation to produce a mask. Native code on both platforms (`android/`, `ios/`).
- `volyume-video-export`: the share-video native binding (decision D229). Takes the clip, a 15-second window, a 20-number colour matrix, the placement rectangle and a still card picture. Returns an H.264 MP4 in the app cache. Android and iOS code.

Each module is wired through an Expo module definition (`expo-module.config.json`) and an entry file. The app's JavaScript wrappers validate options before calling native code.

Observation: the iOS home-screen widget plugin (`plugins/withVolyumeWidget.js`) exists but is not wired into app.json, and the iOS extension is parked.

### 7.2 Camera and media

- Barcode scanning (`ScanBarcodeScreen`), label scanning with on-device text recognition (`ScanLabelScreen`, `food/ocr.js`).
- Progress photos and progress scan (`ProgressPhotosScreen`, `progressScan*` modules, TFLite and the image module).
- Clip recording (`ClipCameraScreen`, `clips/`). Clips are local-only and never synced.
- Photo permission copy in app.json says the app accesses photos so it can save share cards to the gallery (`expo-media-library`).
- Location is used only when the user taps "Use my location" to find gyms. It is not stored.
- Face ID or device unlock is used only for the app lock, if the user turns it on.

### 7.3 Notifications (src/lib/notifications/, 26 files)

Observed:

- Scheduler (`scheduler.js`), quiet hours, a push budget (to avoid notification overload), categories (`categories.js`) and channels (`channels.js`), permissions, push tokens (`pushToken.js`), and foreground suppression (`handler.js`).
- Categories include: activation nudge, add exercise, block ready to review, cascade gate, check-in missed, coach trial ending, Community activity, Community follow, Community message, complete set, ED pattern lockout, evening and morning weight, FFM floor hold, meal log reminder, monthly recap, partner cheer, partner joined, partner streak, planned meal confirm, rest end and rest skip, rest timer actions, return nudge, sync error, subscription expiring and payment failure, and win-back content.
- Rest-timer notifications have live actions. A background task keeps the rest timer alive.
- Weight and food-adjacent notifications are suppressed while an ED flag is open. This must not be weakened.
- Push delivery: local notifications through expo-notifications, and server pushes through `send-push` and `community-notify` to Expo's push service.

### 7.4 Share cards and share video

- `shareCard/`: one Skia draw routine (`drawShareCard.js`) is used both for the on-screen preview and the exported PNG, so what the user sees is what they share. Typefaces, wordmark image, photo framing and looks, quotes, the great week card and the before-and-after card are in this folder.
- Share card rules: no name, bodyweight, measurements or private notes, with two founder-approved exceptions: the progress before-and-after card may show bodyweight beside each photo, and the session card's opt-in "show progress" may show a cut goal's weekly change. Both are withheld under calm mode or an open ED flag.
- `shareVideo/`: the bridge to the native video module. Validates every option, runs one export at a time, handles progress and turns failures into calm messages. The video shows the same still card on top of the clip.
- `ShareCardScreen.js` (3,497 lines) is the largest screen after the active workout screen.
- Share cards and videos are saved to the gallery or shared through the system sheet.

### 7.5 Clips

- `clips/`: a local-only store (`store.js`) of short clips attached to a workout, with rules (`rules.js`), cues (`cues.js`) and camera tips (`cameraTips.js`).
- Observed: the `workout_clips` table exists locally only. Clips are never synced, so they do not reach the cloud or other devices.

### 7.6 Home-screen widget (Android)

- `react-native-android-widget` provides the Android widget. `src/widgets/` holds the widget content and its task handler.
- The iOS widget extension is parked. The plugin file is in the repository but not active.

---

## 8. Build, release, testing and observability

### 8.1 Workflows (.github/workflows/, 13 files)

Observed triggers in each file:

- `main-ci.yml`: on push to branches. Tests, lint and Expo Doctor.
- `identity-invariant.yml`: on push and pull request. Runs the identity invariant check (`scripts/check-identity-invariant.sh`).
- `build-android.yml`: manual. Builds a signed APK and AAB.
- `build-ios.yml`: manual. Builds with EAS, with an optional submit input.
- `deploy-functions.yml`: manual. Deploys one named edge function (or all).
- `deploy-migrations.yml`: manual. Applies Supabase migrations. The push trigger was retired.
- `apply-named-sql.yml`: manual. Applies named SQL files from a seed directory (used for batches).
- `deploy-pages.yml`: manual. Deploys `public/` to GitHub Pages.
- `refresh-off-snapshot.yml`: scheduled and manual. Refreshes the Open Food Facts UK snapshot.
- `maestro-e2e.yml`: manual, pre-release. Runs Maestro flows against a build run.
- `screenshot-net.yml`: manual, pre-release. Captures screenshots.
- `print-signing-sha.yml` and `export-upload-certificate.yml`: manual. Print signing fingerprints and export the upload certificate.

Rules that apply to every build (CLAUDE.md):

- Builds are started only by the founder, never by the assistant.
- Every build is preceded by a minor version bump in package.json, package-lock.json and app.json, a "What's new" entry, and an update to the privacy guard test.
- Every shipped change includes a manual device test checklist.

### 8.2 Testing

Observed from the repository:

- Framework: Jest 29 with `jest-expo`. Test files are colocated in `__tests__/` folders.
- Count, measured at the snapshot: about 1,755 test files (`*.test.js`). About 420 of them are guard tests (`*.guard.test.js`) that read source files and check founder rules with regular expressions.
- Count of test declarations: about 22,400 `it`, `test` and `.each` declarations found by static grep. This is lower than the figure of about 31,000 quoted in the brief. The difference may come from parameterised test expansion at run time. Confirm the exact number from a Jest summary (`npm test`) rather than from this document.
- Tests are written to fail if an invariant is broken. Invariant tests run against the real engine.
- Real-database tests (`*.realdb.test.js`) run against SQLite.
- Other test types: `tests/simulator/` (a runner and scenarios; not described further in this pass), `.maestro/flows/` (four Maestro end-to-end flows, including the Article 9 consent flow and workout backgrounding), and calibration corpora for the progress scan.
- Jest setup in `jest.setup.js` (13 lines) and `jest.globalSetup.js` (20 lines).
- Timezone pinned to Europe/London for every run.
- Lint with zero warnings allowed.

### 8.3 Observability

- **Sentry** (`src/lib/sentry.js`): set up from an environment variable. Sample rate 0.05 in production and 1.0 in development. Scrubbing rules are in `observability/sentryScrub.js`. Network noise is filtered in `observability/networkNoise.js`. Filtering also happens in `sentry.js` itself (the file is long, so read it end to end before assuming what it drops).
- **Local error log** (`errorLog.js`): ring buffer of the latest entries in AsyncStorage, viewable on device in Settings, Debug logs. Used to get traces from testers without Sentry.
- **Engine telemetry** (`engineTelemetry.js`, `telemetry/`): an event catalogue (`events.js`), first-time milestones (`firsts.js`), a queue with a push to the `record_engine_telemetry` RPC, and a bridge to Sentry (`sentryBridge.js`). The RPC has an allow-list of event names, extended by migrations.
- **Principle**: no personal data goes to any external service. Events carry counts, codes and categories.

---

## 9. Technical debt and risks (observations)

These are observations from mapping the repository, not confirmed defects. Each one is a candidate for review.

1. **Very large files.** `src/lib/database.js` (14,872 lines), `src/screens/ActiveWorkoutScreen.js` (7,294), `src/lib/planEngine.js` (3,714), `src/screens/HomeScreen.js` (3,950), `src/screens/ProOnboardingScreen.js` (3,941), `src/screens/CoachOutputScreen.js` (3,823), `src/screens/ShareCardScreen.js` (3,497), `src/lib/food/db.js` (3,389), `src/lib/sync.js` (3,308). Changes to these are hard to review and risky to test in isolation.
2. **Two sync paths.** The registry runner and the legacy `sync.js` run side by side. Only 17 tables are on the registry path in `MIGRATED_TABLES`. The legacy path must keep working until each table moves.
3. **One large store.** `src/store/useAppStore.js` (2,541 lines) holds session, consent, tier, sync status and more. Screens select with `useShallow`, which limits re-renders, but the file is a coupling point.
4. **Migration hygiene.** Numbers 011, 026, 082 and 083 are unused. Numbers 085 and 152 each name two files. Migration 049 is held and destructive. Migration 072 was never applied. The base schema lives in two stale snapshots (`schema.sql`, `setup_complete.sql`), so a new environment cannot be built from migrations alone without reading them in order.
5. **Manual cloud application.** Every production change is applied by hand in batches, with the founder's phrase. This is deliberate, but it means the live database can drift from the migrations between batches. `supabase/audit_cloud_schema_drift.sql` exists for this reason.
6. **Deployment gap for member email.** Four member-email edge functions are written but not deployed, and the pg_cron job that calls the runner exists without its function. Tables are live. Until deployment, the feature's data is present but nothing sends.
7. **Retired surface with live pieces.** The Partners surface is removed from the app, but the `partner-cheer` function, the partner tables and the `partner/` public page remain. Decide whether to remove or keep them.
8. **Dormant billing in the bundle.** `react-native-iap` and about 11 payment modules are compiled into the app and unit-tested but unreachable. They add size and maintenance cost and can drift from the store's real behaviour. The flag is hard-coded in `proGate.js`.
9. **Test count discrepancy.** The brief's figure of about 31,000 tests does not match the static count of about 22,400 declarations. Check the actual Jest total before quoting a number externally.
10. **Stale documentation.** CLAUDE.md states 82 screens; the directory has 104 screen files. The repository root holds about 19 Markdown files, and `docs/` holds about 187 entries. Some root files (for example `APPMAP.md`, `ARCHITECTURE.md`, `_FULL-APP-PRODUCT-MAP.md`) may overlap. Confirm which is current before relying on any of them.
11. **Dev dependency that looks like a runtime tool.** `xlsx` is listed under devDependencies. Confirm it is not bundled into the app.
12. **Session token in localStorage on the members page.** The page is private and carefully written, but a token in `localStorage` is readable by any script on the same origin. Keep the page free of third-party scripts.
13. **Cross-platform parity.** The iOS widget is parked, the rest-timer and share-video native modules exist on both platforms, and the progress-scan pipeline depends on two native modules. Parity of behaviour across Android and iOS is not guaranteed by the unit tests alone and needs device testing.
14. **Deterministic-only engine.** The no-AI rule is strict. Any future feature that needs language generation must be designed around it, and the rule is a constraint on ideas, not only on code.
15. **Safety-critical numbers are spread across files.** The calorie floors, FFM floor and loss gates are in `nutritionEngine.js`, and the ED flag logic is in `edPatternDetector.js` and in server functions (migrations 182 and 192, and the notification suppression). A single source of truth for thresholds would reduce the risk of drift. Any change here needs founder approval.
16. **Build pipeline depends on the founder.** Every build is manual. This protects against accidental builds but makes release timing depend on one person.
17. **Known open items at the snapshot.** Migration 049 held. Migration 072 never applied. Migration 150 retired. Member-email functions not deployed. ED-flag push live in the cloud but not yet in a shipped build (per the status document). The iOS widget parked.

---

## 10. Quick reference

- Version: 3.0.0 (Android versionCode 3357, iOS buildNumber 10).
- Stack: Expo 54, React Native 0.81.5, React 19.1.0, Zustand 4.5.7, SQLCipher via expo-sqlite 16, Supabase EU-Dublin, Sentry.
- Local database: `src/lib/database.js` and `src/lib/food/db.js`.
- Sync: `src/lib/sync/` (registry, runner, transport, tables) and `src/lib/sync.js` (legacy), `src/lib/syncQueue.js`.
- Engines: `src/lib/planEngine.js`, `src/lib/structure/engine.js`, `src/lib/nutritionEngine.js`, `src/lib/weeklyCoach.js`, `src/lib/coachApply.js`, `src/lib/edPatternDetector.js`, `src/lib/wellbeing.js`.
- Cloud migrations: `supabase/migrate_001` to `migrate_199`, status in `supabase/README.md`.
- Edge functions: `supabase/functions/` (12 functions plus `_shared/`).
- Website: `public/` (GitHub Pages, `volyume.app`).
- Workflows: `.github/workflows/` (13 files, most manual).
- Tests: Jest, colocated, about 1,755 files, about 420 guard tests.
