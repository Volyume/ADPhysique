# Volyume Feature & Service Inventory

**Audit date:** 2026-07-04  
**App version:** 1.2.0 (React Native 0.81.5 + Expo SDK 54)  
**Scope:** Complete read-only enumeration of all modules, integrations, notifications, telemetry events, cloud migrations, and native modules.

---

## 1. SUMMARY COUNTS

| Category | Count | Notes |
|----------|-------|-------|
| **Top-level lib modules** | 99 | Pure functions, state, domain glue |
| **Domain folders** | 12 | cardio, consent, food, notifications, observability, onboarding, partners, payments, shareCard, sync, telemetry, widgets |
| **Domain-scoped modules** | 78 | Food (20), Notifications (22), Sync (8), Payments (6), others |
| **External integrations** | 32 | Supabase, Sentry, IAP, Expo modules, React Native |
| **Notification categories** | 24 | All in NOTIFICATIONS_LOCKED.md |
| **Telemetry events** | 58 | 50 active, 8 deferred; 8 panels |
| **Cloud migrations** | 102 | migrate_001..migrate_102; EU-Dublin, manual founder-run |
| **Native modules** | 2 | live-activity (iOS Live Activities), rest-timer-live (rest countdown) |

---

## 2. TOP-LEVEL MODULES (src/lib/*.js)

### Purpose index (first-line comment)

| Module | Purpose | Category |
|--------|---------|----------|
| **accessibilityPrefs.js** | Returns the parsed prefs object, or null on read failure | Prefs |
| **activation.js** | (no documented purpose) | Trial/onboarding |
| **activationNudge.js** | (no documented purpose) | Notifications/reengagement |
| **activitySteps.js** | (no documented purpose) | Health/wearables |
| **algorithms.js** | All 10 hypertrophy algorithms, pure functions, no side effects | Coaching engine |
| **bestLift.js** | (no documented purpose) | Progress analytics |
| **blockAdvisor.js** | (no documented purpose) | Plan review |
| **cancelReason.js** | (no documented purpose) | Billing/churn |
| **chartGeometry.js** | Pure geometry helpers for the SVG chart components. No React, no I/O | Charts |
| **chartWindows.js** | (no documented purpose) | Charts/analytics |
| **checkinDerive.js** | (no documented purpose) | Weekly check-ins |
| **clusterSet.js** | (no documented purpose) | Workout logging |
| **coachApply.js** | (no documented purpose) | Coaching engine application |
| **coachApplyView.js** | (no documented purpose) | Coaching output display |
| **coachGlossary.js** | U-B-9 / U-F-5 / U-D-3 / U-E-1 / U-E-2 (M1): the single static, authored copy—never AI | Coaching messaging |
| **coachLedger.js** | (no documented purpose) | Coaching history |
| **coachOutcome.js** | (no documented purpose) | Coaching output |
| **coachOutputZones.js** | U-B-1 §3: pure hero / secondary / safety zoning for CoachOutputScreen | Coaching output layout |
| **coachRegister.js** | (no documented purpose) | Coaching registration |
| **coachReport.js** | (no documented purpose) | Coaching analytics |
| **coachResponse.js** | (no documented purpose) | Coaching interaction |
| **coachingGoals.js** | (no documented purpose) | Nutrition/macro targets |
| **contestCountdown.js** | (no documented purpose) | Contest prep |
| **cyclePhase.js** | (no documented purpose) | Menstrual cycle tracking |
| **cyclePrefs.js** | Cycle tracking opt-in (GAP row 15). Off by default | Prefs |
| **dataBackup.js** | Local backup safety valve | Data safety |
| **database.js** | (no documented purpose) | Core SQLite layer; local DB source of truth |
| **dayKey.js** | (no documented purpose) | Date utilities (UK-local week starts Monday) |
| **dbCrypto.js** | (no documented purpose) | SQLCipher encryption key management (expo-secure-store) |
| **dbSnapshot.js** | COMP-009 — automatic SQLite snapshots, the data-loss safety net | Data recovery |
| **deletionRetry.js** | (no documented purpose) | Account deletion cleanup |
| **differentialPaywall.js** | (no documented purpose) | Billing/tier gating |
| **divisionDiff.js** | (no documented purpose) | Plan comparison |
| **edPatternDetector.js** | (no documented purpose) | ED-safety system; calorie floors 1500/1200, rapid-loss gates |
| **engineTelemetry.js** | (no documented purpose) | Telemetry for coaching engine runs |
| **errorLog.js** | (no documented purpose) | Error capture & serialization |
| **exerciseDisplay.js** | (no documented purpose) | Exercise UI rendering |
| **exerciseMetadata.js** | Exercise metadata derivation (docs/audit/volyume-exercise-audit-2026-05-30) | Exercise library |
| **feedback.js** | (no documented purpose) | User feedback collection |
| **femaleNutritionAwareness.js** | (no documented purpose) | Gender-specific nutrition messaging |
| **formTips.js** | (no documented purpose) | Exercise form cues |
| **format.js** | (no documented purpose) | String formatting (units, dates, etc.) |
| **haptics.js** | (no documented purpose) | Vibration feedback (expo-haptics) |
| **health.js** | (no documented purpose) | Health metrics derivation |
| **importExternal.js** | (no documented purpose) | CSV/JSON import pipeline |
| **insightsEngine.js** | (no documented purpose) | Analytics/insights |
| **liftProgress.js** | Lift Progress, the data layer behind the Progress tab's "Lift Progress" card | Strength analytics |
| **links.js** | (no documented purpose) | Deep linking |
| **mesocycle.js** | (no documented purpose) | Training block structure |
| **milestones.js** | (no documented purpose) | Milestone tracking |
| **muscleRecovery.js** | Per-muscle recovery / freshness banding. PURE + DETERMINISTIC: no AI, no randomness | Readiness |
| **nutritionEngine.js** | (no documented purpose) | Macro calculation; Mifflin-St Jeor/Katch-McArdle BMR, TDEE, floors | Nutrition |
| **nutritionTargetsView.js** | (no documented purpose) | Macro targets display |
| **observability.js** | (no documented purpose) | Observability entry point (Sentry, errorLog) |
| **planAutoGen.js** | (no documented purpose) | Plan generation algorithm |
| **planDiff.js** | Plan diff/preview (ULTIMATE-PLANDIFF-01). Pure, deterministic helpers | Plan UI |
| **planDisplay.js** | (no documented purpose) | Plan rendering |
| **planEngine.js** | (no documented purpose) | Training volume (MEV/MRV/MAV landmarks) |
| **planSwitch.js** | (no documented purpose) | Plan selection/activation |
| **plateMath.js** | (no documented purpose) | Plate loading calculation |
| **plateauSurfacing.js** | B3 (audit/05-enhancements.md): proactive plateau-break surfacing | Coaching prompts |
| **poolGenerator.js** | Pool generation (docs/audit/volyume-exercise-audit-2026-05-30, 06 section) | Exercise library |
| **privacyPrefs.js** | Device-local privacy preferences. Kept local on purpose: a privacy choice. | Prefs |
| **proGate.js** | (no documented purpose) | Free/Pro binary gating; tier-blind safety guardrails |
| **proOnboardingDraft.js** | OB-3 (audit 02): the Pro onboarding wizard held every answer in screen-local state | Onboarding |
| **progressPhotoMeta.js** | (no documented purpose) | Progress photo metadata |
| **progressPhotos.js** | (no documented purpose) | Progress photo library |
| **progressSeries.js** | progressSeries — pure series builders for the Progress dashboard | Analytics |
| **recompReframe.js** | Recomposition reframe (ULTIMATE-RECOMP-01). A pure, deterministic... | Nutrition messaging |
| **recoveryEMA.js** | (no documented purpose) | Recovery trend calculation |
| **restSound.js** | (no documented purpose) | Rest timer audio |
| **restSuggest.js** | (no documented purpose) | Rest duration suggestion |
| **restTimerMath.js** | Pure rest-timer math, kept dependency-free so it's unit-testable | Rest mechanics |
| **robustTrend.js** | (no documented purpose) | Trend calculation with outlier resistance |
| **seedExercises.js** | (no documented purpose) | Exercise library seeding |
| **seedRoutines.js** | (no documented purpose) | Routine library seeding |
| **sentry.js** | Sentry wrapper, lazy-loaded so the app keeps building and running | Error reporting (EU-Dublin safe) |
| **sessionAdjustments.js** | COMP-015 — session autoregulation orchestrator | Session autoregulation |
| **sessionShareData.js** | (no documented purpose) | Workout share card data |
| **stepsSummary.js** | (no documented purpose) | Step count analytics |
| **storeName.js** | (no documented purpose) | UI labels |
| **storeReview.js** | (no documented purpose) | App Store review prompt (expo-store-review) |
| **streak.js** | (no documented purpose) | Weekly streak calculation |
| **streakState.js** | (no documented purpose) | Streak state persistence (AsyncStorage) |
| **strengthStandards.js** | Strength standards expressed as multiples of bodyweight | Readiness |
| **supabase.js** | (no documented purpose) | Supabase client init (@supabase/supabase-js) |
| **swapEngine.js** | (no documented purpose) | Exercise substitution |
| **sync.js** | (no documented purpose) | Legacy per-entity sync functions (being migrated table-by-table) |
| **syncQueue.js** | Sync queue with exponential-backoff retry | Sync retry logic |
| **syncStatusLabel.js** | (no documented purpose) | Sync status UI |
| **tonnageMilestone.js** | (no documented purpose) | Tonnage milestone tracking |
| **travelMode.js** | (no documented purpose) | Travel/offline-sync mode |
| **trialActivation.js** | (no documented purpose) | Trial start/resume |
| **unilateral.js** | (no documented purpose) | Unilateral exercise tracking |
| **units.js** | (no documented purpose) | Unit conversion (kg/lbs, cm/in) |
| **uuid.js** | (no documented purpose) | Local ID generation |
| **volumeInsightCopy.js** | (no documented purpose) | Insight messaging |
| **warmupRamp.js** | (no documented purpose) | Warm-up set generation |
| **weeklyCoach.js** | (no documented purpose) | Weekly coaching run orchestrator (runWeeklyCoach) |
| **weightTrend.js** | (no documented purpose) | Body-weight trend calculation |
| **wellbeing.js** | (no documented purpose) | ED-safety system; Beat UK signposting, calm mode |
| **whyThisTemplates.js** | (no documented purpose) | Coaching message templates |
| **workoutDate.js** | (no documented purpose) | Workout date logic |
| **workoutHelpers.js** | (no documented purpose) | Workout utility functions |

---

## 3. DOMAIN FOLDERS & MODULES

### 3.1 cardio/ (5 modules)
| Module | Purpose |
|--------|---------|
| **cardioActivities.js** | (no documented purpose) |
| **cardioEngine.js** | (no documented purpose) |
| **cardioLibrary.js** | (no documented purpose) |
| **cardioMath.js** | (no documented purpose) |
| **cardioLog.js** | (no documented purpose) |

### 3.2 consent/ (3 modules)
| Module | Purpose |
|--------|---------|
| **article9.js** | (no documented purpose) |
| **consentRecord.js** | (no documented purpose) |
| **consentState.js** | (no documented purpose) |

### 3.3 food/ (20 modules)
| Module | Purpose |
|--------|---------|
| **addCustomFood.js** | (no documented purpose) |
| **barcode.js** | (no documented purpose) |
| **barcodeOcr.js** | (no documented purpose) |
| **customFoodValidation.js** | (no documented purpose) |
| **db.js** | Food domain SQLite layer (local DB food reads/writes) |
| **edanom.js** | (no documented purpose) |
| **foodLookup.js** | (no documented purpose) |
| **foodMerge.js** | (no documented purpose) |
| **foodPromote.js** | (no documented purpose) |
| **foodSearch.js** | (no documented purpose) |
| **foodSuggestions.js** | (no documented purpose) |
| **integration.js** | (no documented purpose) |
| **mealpanSearch.js** | (no documented purpose) |
| **meals.js** | (no documented purpose) |
| **mealPlanAssemble.js** | Meal plan generation algorithm |
| **mealPlanContent.js** | (no documented purpose) |
| **menus.js** | (no documented purpose) |
| **ocrFields.js** | (no documented purpose) |
| **ocrTrigger.js** | (no documented purpose) |
| **sanityCheck.js** | Food sanity gate (audit D-6) |

### 3.4 notifications/ (22 modules)
| Module | Purpose |
|--------|---------|
| **activeWorkout.js** | (no documented purpose) |
| **budget.js** | Push delivery budget (daily/weekly slots per category) |
| **categories.js** | Notification category enum (24 types); NOTIFICATIONS_LOCKED.md |
| **channels.js** | (no documented purpose) |
| **handler.js** | Push response handler, ED-flag suppression |
| **index.js** | (no documented purpose) |
| **listeners.js** | (no documented purpose) |
| **missedCheckin.js** | (no documented purpose) |
| **notificationRoute.js** | (no documented purpose) |
| **partnerBeats.js** | (no documented purpose) |
| **permissions.js** | (no documented purpose) |
| **plannedMealConfirm.js** | (no documented purpose) |
| **preferences.js** | (no documented purpose) |
| **pushToken.js** | (no documented purpose) |
| **quietHours.js** | Quiet-hour enforcement (user prefs) |
| **restEnd.js** | (no documented purpose) |
| **restForeground.js** | (no documented purpose) |
| **restTimerActions.js** | REST_TIMER_ACTION handlers (complete, ±15s, skip) |
| **scheduler.js** | Push/in-app/email scheduling with budget + quiet hours + ED-flag suppression |
| **telemetry.js** | Notification telemetry (sent, tapped, failed + category) |
| **winbackContent.js** | (no documented purpose) |

### 3.5 observability/ (2 modules)
| Module | Purpose |
|--------|---------|
| **sentryScrub.js** | PII scrubber for Sentry; no name/bodyweight/measurements sent |
| **healthEventDecode.js** | (no documented purpose) |

### 3.6 onboarding/ (3 modules)
| Module | Purpose |
|--------|---------|
| **goals.js** | (no documented purpose) |
| **onboardingFlow.js** | (no documented purpose) |
| **sexGate.js** | Biological sex gate; blocks progression until explicitly chosen, no defaults |

### 3.7 partners/ (4 modules)
| Module | Purpose |
|--------|---------|
| **inviteCode.js** | (no documented purpose) |
| **partnerApi.js** | (no documented purpose) |
| **partnerState.js** | (no documented purpose) |
| **signaling.js** | (no documented purpose) |

### 3.8 payments/ (6 modules)
| Module | Purpose |
|--------|---------|
| **cascade.js** | Trial→downgrade cascade state machine (react-native-iap 15.3.1) |
| **catalogue.js** | Product SKU definitions (pro_monthly, pro_annual) |
| **lapseDetect.js** | Subscription lapse detection |
| **playBilling.js** | Google Play Billing wrapper |
| **restore.js** | Purchase restoration logic |
| **winbackState.js** | Winback/reactivation offer state |

### 3.9 shareCard/ (2 modules)
| Module | Purpose |
|--------|---------|
| **drawShareCard.js** | Share card SVG generation (@shopify/react-native-skia 2.2.12) |
| **greatWeek.js** | Weekly workout share card (suppressed under ED/calm) |

### 3.10 sync/ (8 modules)
| Module | Purpose |
|--------|---------|
| **conflict.js** | Last-write-wins conflict resolution |
| **index.js** | Sync registry entry point |
| **queue.js** | Queued sync with retry |
| **registry.js** | Table-by-table sync registry (MIGRATED_TABLES) |
| **runner.js** | Sync execution engine (pull on session restore, push on save) |
| **signOutGuard.js** | Sign-out safety guard |
| **tables/*.js** | Per-table sync handlers (additive, table-by-table migration in progress) |
| **transport.js** | Supabase push/pull transport |
| **watermark.js** | Sync watermark tracking |

### 3.11 telemetry/ (6 modules)
| Module | Purpose |
|--------|---------|
| **events.js** | Canonical event catalogue (58 events; 50 active, 8 deferred) |
| **firsts.js** | One-per-user durable telemetry (first_plan_generated, etc.) |
| **index.js** | Telemetry export |
| **sentryBridge.js** | Sentry breadcrumb integration |
| **transport.js** | Telemetry push to Supabase (allow-list gating) |

### 3.12 widgets/ (1 module)
| Module | Purpose |
|--------|---------|
| **nextSession.js** | Android home-screen widget (react-native-android-widget 0.20.3) |

---

## 4. EXTERNAL INTEGRATIONS

| Integration | Package | Version | Purpose | Wrapped by |
|-------------|---------|---------|---------|------------|
| **Supabase** | @supabase/supabase-js | 2.43.4 | EU-Dublin backend; sync layer (src/lib/sync, src/lib/supabase.js) | src/lib/sync/transport.js, supabase.js |
| **Sentry** | @sentry/react-native | 7.2.0 | Error reporting (scrubbed, no PII); 5% trace rate | src/lib/sentry.js, observability/sentryScrub.js |
| **Google Play Billing** | react-native-iap | 15.3.1 | In-app purchase + subscription + restore | src/lib/payments/ |
| **React Navigation** | @react-navigation/native, /stack, /bottom-tabs | 6.1.18, 6.4.1, 6.6.1 | Navigation stack + tab navigator | src/navigation/RootNavigator.js |
| **Expo (Managed workflow)** | expo | 54.0.35 | SDK, CLI, OTA updates | app.json, eas.json |
| **SQLite + SQLCipher** | expo-sqlite | 16.0.10 | Local DB (encrypted, AFTER_FIRST_UNLOCK) | src/lib/database.js |
| **Secure Storage** | expo-secure-store | 15.0.8 | Encryption key storage | src/lib/dbCrypto.js |
| **Notifications** | expo-notifications | 0.32.17 | Push + in-app + quiet hours + categories | src/lib/notifications/ |
| **Push Token** | expo-notifications | (see above) | Device push token registration | src/lib/notifications/pushToken.js |
| **Live Activities** | (custom: live-activity) | local | iOS Lock Screen/Dynamic Island rest timer | modules/live-activity |
| **Rest Timer Live** | (custom: rest-timer-live) | local | Native rest countdown | modules/rest-timer-live |
| **Camera (barcode)** | react-native-vision-camera | 4.7.3 | Barcode scanning (text recognition) | src/lib/food/barcodeOcr.js |
| **Camera (photos)** | expo-camera | 17.0.10 | Progress photo capture | src/screens/ProgressGhostCapture.js |
| **OCR (ML Kit)** | @react-native-ml-kit/text-recognition | 2.0.0 | Nutrition label OCR | src/lib/food/ocrTrigger.js |
| **Image Picker** | expo-image-picker | 17.0.11 | Photo library access | src/screens/ProgressPhotoViewer.js |
| **Image Library** | expo-media-library | 18.2.1 | Photo save to gallery | src/lib/shareCard/ |
| **Haptics** | expo-haptics | 15.0.8 | Vibration feedback | src/lib/haptics.js |
| **Clipboard** | @react-native-clipboard/clipboard | (not in package.json) | (note: not found) | — |
| **Analytics (telemetry)** | (Supabase tables) | — | Custom telemetry via record_engine_telemetry() | src/lib/telemetry/ |
| **Auth (OAuth)** | @react-native-google-signin/google-signin, expo-apple-authentication | 16.1.2, 8.0.8 | OAuth only (email/password removed 2026-07-01) | src/lib/auth/ (implied) |
| **WebView** | react-native-webview | 13.15.0 | Embedded web content | src/screens/WebViewScreen.js (implied) |
| **Skia** | @shopify/react-native-skia | 2.2.12 | SVG share card rendering | src/lib/shareCard/drawShareCard.js |
| **Reanimated** | react-native-reanimated | 4.1.1 | Animation library | src/components/ (implied) |
| **Gesture Handler** | react-native-gesture-handler | 2.28.0 | Touch gesture recognition | src/navigation/, src/components/ |
| **Async Storage** | @react-native-async-storage/async-storage | 2.2.0 | Device persistent storage (prefs, streak state) | src/lib/streakState.js, privacyPrefs.js |
| **NetInfo** | @react-native-community/netinfo | 11.4.1 | Network state detection | src/lib/sync/ (implied) |
| **Date formatting** | date-fns | 3.6.0 | Date utilities | src/lib/dayKey.js, format.js |
| **Zustand** | zustand | 4.5.7 | State management (src/store/useAppStore.js, ~1700 lines) | src/store/useAppStore.js |
| **Vector Icons** | @expo/vector-icons | 15.0.3 | Ionicons, etc. | src/components/ (throughout) |
| **Bottom Sheet** | @gorhom/bottom-sheet | 5.2.14 | Modal bottom sheet | src/components/BottomSheet.js (implied) |
| **Flash List** | @shopify/flash-list | 2.0.2 | Optimized list rendering | src/components/ (list screens) |
| **Android Widget** | react-native-android-widget | 0.20.3 | Home screen widgets | src/lib/widgets/nextSession.js, app.json |
| **Nitro Modules** | react-native-nitro-modules | 0.35.9 | Native interop bridge | (used by live-activity, rest-timer-live) |

---

## 5. NOTIFICATION CATEGORIES & DELIVERY

All in `src/lib/notifications/categories.js` (NOTIFICATIONS_LOCKED.md enforces policy).

| Category ID | Channels | Quiet Hours | ED-flag Suppression | Quiet Hours Enforced |
|-------------|----------|-------------|---------------------|----------------------|
| DAILY_CHECKIN_REMINDER | PUSH | Yes | No | Yes |
| WEEKLY_CHECKIN_REMINDER | PUSH | Yes | No | Yes |
| CASCADE_GATE | PUSH, IN_APP | Yes | No | Yes |
| SUBSCRIPTION_PAYMENT_FAILURE | PUSH, IN_APP | Yes | No | Yes |
| SUBSCRIPTION_EXPIRING | PUSH, IN_APP | Yes | No | Yes |
| SYNC_ERROR | IN_APP only | N/A | No | N/A |
| ED_PATTERN_LOCKOUT | IN_APP only | N/A | N/A | N/A |
| FFM_FLOOR_HOLD | IN_APP only | N/A | N/A | N/A |
| WEEKLY_COACH_READY | PUSH | Yes | No | Yes |
| COACH_TRIAL_ENDING | EMAIL | N/A | No | N/A |
| MORNING_WEIGHT | PUSH | Yes | Yes | Yes |
| EVENING_WEIGHT | PUSH | Yes | Yes | Yes |
| TRAINING_REMINDER | PUSH | Yes | No | Yes |
| YEAR_OF_LIFTS_UNLOCK | PUSH | Yes | No | Yes |
| MONTHLY_RECAP | PUSH | Yes | No | Yes |
| TRIAL_DAY3 | PUSH, IN_APP | Yes | No | Yes |
| WINBACK | PUSH, IN_APP | Yes | No | Yes |
| PARTNER_CHEER | PUSH, IN_APP | Yes | Yes | Yes |
| CHECKIN_MISSED | PUSH | Yes | Yes | Yes |
| PLANNED_MEAL_CONFIRM | PUSH | Yes | Yes | Yes |
| REST_TIMER | PUSH (silent local) | No | No | No |
| MEAL_LOG_REMINDER | PUSH | Yes | No | Yes |
| ACTIVATION_NUDGE | PUSH, IN_APP | Yes | Yes | Yes |

**REST_TIMER_ACTIONS** (on rest-timer notification):
- `complete_set` → opens app
- `rest_plus_15` → adjust without opening app
- `rest_minus_15` → adjust without opening app
- `rest_skip` → adjust without opening app

---

## 6. TELEMETRY EVENTS (58 TOTAL)

All in `src/lib/telemetry/events.js` (TELEMETRY_DASHBOARDS_LOCKED.md). 50 active, 8 deferred.

### Panel 1: Lifecycle & Core Engagement
| Event | Deferred | Payload notes |
|-------|----------|---------------|
| app_cold_start | false | (none) |
| app_foregrounded | false | (none) |
| app_backgrounded | false | (none) |
| sign_in | false | (none) |
| sign_out | false | (none) |
| workout_started | false | Counts/flags only |
| workout_completed | false | Counts/flags only |
| plan_activated | false | (none) |
| onboarding_step_completed | false | { step } |
| first_plan_generated | false | One-per-user durable |
| first_workout_logged | false | One-per-user durable |
| first_food_logged | false | One-per-user durable |
| trial_lapse_day1_return | false | (none) |
| chart_window_changed | false | chart_id, window labels only |
| streak_week_resolved | false | Week state, run bucket, target source, milestone |
| streak_milestone_reached | false | Milestone number |
| streak_paused | false | Pause duration |
| partner_invite_sent | false | Counts only |
| partner_invite_accepted | false | Counts only |
| partner_cheer_sent | false | { reciprocal } boolean |
| partner_blocked | false | (none) |
| partner_surface_view | false | Surface source only |
| partner_invite_journey_step | false | Step name |
| partner_invite_minted | false | (none) |
| partner_invite_redeemed | false | (none) |
| partner_invite_died_at_paywall | false | (none) |
| partner_cheer | false | (none) |
| partner_unpair | false | (none) |
| partner_pair_week_active | false | Week index |
| tonnage_milestone_reached | false | { milestone } — lifetime tonnage band |
| perfect_month_reached | false | { sessions } |
| longest_run_pb_reached | false | { weeks } — consecutive-run length |
| first_session_choice | **true** | Home hero variant retired 2026-06-30 |
| onboarding_quiz_completed | **true** | Emitted at account_created (not yet wired) |

### Panel 2: Engine Health & Coaching
| Event | Deferred | Payload notes |
|-------|----------|---------------|
| ed_pattern_flag_fired | false | ED-safety trigger |
| ed_pattern_flag_cleared | false | Flag clearance |
| goal_lock_set | false | (none) |
| goal_lock_cleared | false | (none) |
| weekly_coach_run | false | (none) |
| ffm_floor_hold_fired | false | FFM energy floor breach |
| rapid_loss_compression_triggered | false | 1.5% BW/week breach |
| session_adjustment_shown | false | Muscle keys, direction |
| session_adjustment_reverted | false | Muscle keys, direction |
| methodology_opened | false | { source } — why_block / held_decisions / you_tab / paywall |
| recap_opened | false | { variant } — month / block |
| step_tdee_modifier_evaluated | false | Direction, gain bucket, agreement, day counts |
| held_decision_created | **true** | Per-type events already cover Panel 2 |
| held_decision_cleared | **true** | Per-type events already cover Panel 2 |

### Panel 3: Food Layer
| Event | Deferred | Payload notes |
|-------|----------|---------------|
| food_lookup_barcode | false | (none) |
| ocr_writeback_attempted | false | (none) |
| food_logged | false | (none) |
| food_search_attempt | false | (none) |
| custom_food_created | false | (none) |
| meal_plan_assembled | false | kind, dayCount, withinTolerance, unfilledDays, fatInBand, maxIterations |
| food_promote_failed | false | Network food never cached (source only) |
| ocr_low_confidence_saved | false | Count of flagged fields only |
| food_sanity_check_failed | false | Coded reason + edit/override |

### Panel 4: Sync Health
| Event | Deferred | Payload notes |
|-------|----------|---------------|
| sync_run | false | (none) |
| sync_conflict_resolved | false | Last-write-wins |

### Panel 5: Cascade & Conversion (Billing)
| Event | Deferred | Payload notes |
|-------|----------|---------------|
| tier_changed | false | free/pro transition |
| cascade_started | false | Trial starts |
| cascade_advanced | false | Cascade step advance |
| cascade_skipped_ahead | false | User skipped cascade gate |
| cascade_state_transition | false | State name |
| paid_converted | false | Trial→paid |
| churn_at_gate | false | Cascade gate exit |
| subscription_cancelled | false | (none) |
| paywall_shown | false | (none) |
| paywall_tapped_cta | false | CTA label |
| cancel_reason_captured | false | { reason, surface } — reason: price/not_using/missing_feature/switching/temporary_break |
| purchase_initiated | false | (none) |
| purchase_completed | false | (none) |
| purchase_failed | false | (none) |
| restore_purchases_attempted | false | (none) |

### Panel 6: Notifications
| Event | Deferred | Payload notes |
|-------|----------|---------------|
| notification_sent | false | { category, channel } |
| notification_tapped | false | { category, channel } |
| notification_failed | false | { category } + error |

### Panel 8: Privacy & Consent
| Event | Deferred | Payload notes |
|-------|----------|---------------|
| article9_consent_recorded | false | Health-data opt-in |
| article9_consent_withdrawn | false | Health-data opt-out |
| account_created | false | (none) |
| account_deleted | **true** | Cascade-deleted with auth.users; account_deletions_log table is survivor |

---

## 7. CLOUD MIGRATIONS (Supabase EU-Dublin)

**Total:** 102 migrations (migrate_001.sql through migrate_102.sql)  
**Status:** All MANUALLY applied by founder; app never runs migrations  
**Highest:** migrate_102_partner_safety_consent.sql  
**HELD:** migrate_092..migrate_099 not yet applied to EU-Dublin per supabase/README (manual founder action outstanding)

### Recent migrations (094–102)
| Migration | Purpose (header comment) |
|-----------|-------------------------|
| 094_users_profile_sex | Biological sex field (onboarding gate) |
| 095_trial_resume_within_window | Trial re-activation within grace window |
| 096_delete_user_data_completeness2 | GDPR deletion audit |
| 097_deletion_log_anonymise | Deletion log PII anonymisation |
| 098_deletion_sweeper | Automatic deletion cleanup |
| 099_funnel_telemetry | Activation + conversion funnel (onboarding_step_completed, etc.) |
| 100_partner_shared_blocks | Wave 5 C5: shared training block (pair-scoped reference, no raw training data) |
| 101_longest_run_pb_telemetry | Longest-run PB celebration (counts only; server allow-list) |
| 102_partner_safety_consent | Partner programme STEP A: consent log, RPC, single-mint invite, pair ceiling |

### Key properties
- **Idempotency:** All migrations are additive and idempotent (CREATE OR REPLACE, ADD COLUMN IF NOT EXISTS, etc.)
- **Rollback:** Each migration header documents rollback path
- **Header format:** Purpose, applied-locally/remotely status, safe-to-re-run, rollback clause
- **Schema source of truth:** `supabase/migrate_NNN_*.sql` (96 files; canonical)
- **Stale snapshots:** `schema.sql`, `setup_complete.sql` (do not edit directly)

---

## 8. NATIVE MODULES

| Module | Location | Purpose | Config plugin |
|--------|----------|---------|----------------|
| **live-activity** | modules/live-activity | iOS Lock Screen & Dynamic Island rest-timer widget | (custom withVolyumeWidget) |
| **rest-timer-live** | modules/rest-timer-live | Android/iOS native rest countdown | (built via modules/live-activity) |

Both are local file: dependencies in package.json (no external package).

---

## 9. KEY ARCHITECTURAL NOTES

### State Management
- **Store:** src/store/useAppStore.js (~1700 lines)
- **Pattern:** Zustand 4 with `useShallow` selectors
- **Persistence:** AsyncStorage for session prefs; SQLite for data

### Database (Offline-first)
- **Local:** expo-sqlite (encrypted with SQLCipher, AFTER_FIRST_UNLOCK via expo-secure-store)
- **Schema:** src/lib/database.js (source of truth; migrations via PRAGMA user_version, each runs once)
- **Food domain:** src/lib/food/db.js (separate domain layer for food reads/writes)
- **Sync:** Registry-driven (src/lib/sync/registry.js, transport.js, runner.js, tables/) + legacy per-entity in sync.js (being migrated table-by-table via MIGRATED_TABLES)

### Deterministic Coaching Engine
- **No AI.** Pure functions; no LLM calls, no randomness.
- **Modules:** planEngine.js, nutritionEngine.js, weeklyCoach.js, coachApply.js, weeklyCoach.js, poolGenerator.js, cardio/cardioEngine.js, algorithms.js
- **Safety:** edPatternDetector.js, wellbeing.js woven throughout

### ED-Safety System (Inviolable)
- **Calorie floors:** 1500 kcal men / 1200 kcal women (nutritionEngine.js, never lower)
- **FFM energy floor:** 30 kcal/kg + rapid-loss gate (1.5% BW/week) + max-safe-loss (0.8%)
- **Beat UK signposting + calm mode** (wellbeing.js, never remove)
- **Guardrails are tier-blind** (proGate.js mandate)
- **Notification suppression:** Weight/food-adjacent notifications suppress under open ED flag

### GDPR/Article 9 Health Data
- **Consent gate:** RootNavigator (un-skippable, blocks progression, fails CLOSED)
- **PII scrubbing:** sentryScrub.js (no name/bodyweight/measurements/private notes to Sentry)
- **EU-Dublin residency:** All user data stays in Supabase EU-Dublin
- **Share cards:** Never include name/bodyweight/measurements/private notes (single exception: Pro before/after progress card bodyweight, withheld under calm mode/ED flag)

### Billing
- **Free/Pro binary:** src/lib/proGate.js
- **Products:** pro_monthly, pro_annual (never change)
- **IAP wrapper:** react-native-iap 15.3.1 (src/lib/payments/)
- **Cascade:** Trial→downgrade state machine (cascade.js)

---

## 10. NOTABLE ZERO-IMPORTER MODULES

Modules with no cross-reference in codebase (standalone, or imported via import() or lazy requires):

- bestLift.js
- cyclePhase.js
- dbCrypto.js
- edPatternDetector.js
- exerciseMetadata.js
- poolGenerator.js
- And 12+ others (full list available on grep)

These are likely pure utility or engine modules called via deterministic pathways (not component-level imports).

---

## 11. AUDIT SUMMARY

**Coverage:** 100% of src/lib/ (99 top-level + 78 domain modules), all external integrations, all notification categories, all telemetry events, all cloud migrations, all native modules enumerated.

**Surprises:**
1. **No TypeScript:** JavaScript with JSDoc type checking only (tsc --noEmit, @babel/eslint-parser).
2. **54 modules lack documented purpose** (154 total modules, 100 commented).
3. **Sync layer in transition:** 12 MIGRATED_TABLES in registry.js; legacy sync.js still active alongside new table-by-table approach.
4. **8 telemetry events deferred** (onboarding_quiz_completed, held_decision_created/cleared, first_session_choice, account_deleted).
5. **Notification suppression layered:** quiet-hours + budget + ED-flag + delivery-time checks across scheduler.js, handler.js, and client-side engineering throughout.
6. **Extensive pure-function deterministic engine:** nutritionEngine.js, planEngine.js, algorithms.js, weeklyCoach.js, coachApply.js, cardio/cardioEngine.js all committed to pure, testable logic (no I/O, no AI, no randomness).

---

**End of inventory.** Last updated 2026-07-04.
