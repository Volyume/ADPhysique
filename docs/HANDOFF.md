# Volyume: comprehensive session handoff

**Last updated:** 2026-05-25 (evening, post comprehensive telemetry pass + Move #4 ship + Move #5 partial ship + 2-tier consolidation + device-log bug fixes + account_deletions_log + status doc refresh)

**Last session ended at commit:** `7e0959e` (account_deletions_log + Edge Function audit). Active branch: `main` (founder force-push override 2026-05-25).

**Doc hierarchy when new sessions read in:**
1. `CLAUDE.md` (project root) — voice rules, founder overrides, branch policy, identity contract
2. `docs/CURRENT_STATUS.md` — canonical state of what's shipped, what's pending, in suggested execution order
3. **THIS doc** — every artefact, every test, every migration, every screen, every file location, every gotcha
4. Locked specs (`*_LOCKED.md`) — design decisions you cannot override

When this doc disagrees with `CURRENT_STATUS.md`, `CURRENT_STATUS.md` wins (it's rewritten end-to-end on every material change). When `CURRENT_STATUS.md` disagrees with a LOCKED spec, the LOCKED spec wins. When the founder overrides any of them, the founder wins (update the docs).

---

## 0. Founder context (90 seconds)

- **Project:** Volyume, UK Android-only fitness coaching app
- **Founder:** Allan Douglas, `allansdouglas1983@gmail.com`. UK-based, low tolerance for guesses presented as facts. Will call you out hard for skimming docs, hand-waving, or "ill-advised suggestions". Always verify against code or database before claiming something works.
- **Tone he wants from you:** direct, factual, no AI tells, British spelling, no em dashes. See `CLAUDE.md` section "Voice and copy" for the full rules. These apply to commit messages and code comments too, not just UI strings.
- **What he is doing right now:** sideloading debug APKs to his Android phone and testing manually. He pastes device debug logs when bugs surface. He is NOT touching the Closed Testing track — that build is frozen until Phase A exit.
- **Current rhythm:** he says "proceed" / "yes" / "keep going" between shipping chunks. He applies SQL migrations directly in Supabase Dashboard between asks. He has been letting Claude pick the next chunk if it's tractable; ask only if it's genuinely a fork in the road.

---

## 1. What this project is

Volyume is a UK Android coaching app for resistance training + nutrition. The coach engine is called **Precision Coaching** in user-facing copy (always a proper noun). Currently in Play Store closed testing as v1.1.0 (versionCode 4); that build is frozen until the WHOLE project is built out per the locked release policy.

The big strategic shift in flight is the 2-tier consolidation: Free + Pro, with a 21-day Pro trial, replacing the originally locked 3-tier model (Free / Pro / Complete). The Peak Week module was removed entirely. See section 4 below for the full founder override stack.

---

## 2. Founder overrides locked 2026-05-25

These supersede the LOCKED specs they touch. Updated wherever code reads from them.

### Override 1: cloud infrastructure migration deferred

Original plan (`MASTER_VISION_AND_PLAN.md`): migrate to Azure or AWS for compliance + scale. Founder direction: not until the app is stable in production. Supabase + Sentry stack stays for v1 launch. Revisit only if telemetry proves Supabase's tier is genuinely insufficient or a compliance requirement appears.

### Override 2: Google Play Billing direct, not RevenueCat

Original (`SUBSCRIPTION_AND_PAYMENT_LOCKED.md` line 49): RevenueCat as the IAP abstraction. Founder rationale: iOS is deferred indefinitely (Android-only Phase B), so RevenueCat's cross-platform differentiator is moot. Going direct against Google Play Billing removes the 1%-above-£2.5k-MRR fee and one third-party dependency. The `src/lib/payments/playBilling.js` provider abstraction stays in place so the underlying SDK can swap without touching cascade / UI / RPC layers.

Implementation: `react-native-iap` ^12.16.1 added as the real provider. `playBilling.js` lazy-loads it and injects via `tryWireRealProvider()` from `App.js`. `RootNavigator` calls `playBilling.initialise({ appUserID })` after sign-in. RTDN webhook lands in `supabase/functions/play-billing-rtdn/index.ts`.

### Override 3: 2-tier model, not 3-tier

Original (`COMPLETE_TIER_SCOPE_LOCKED.md`): Free / Pro / Complete, with a 28-day Complete-to-Pro cascade. Founder direction: consolidate to Free + Pro only; remove Complete tier; remove Peak Week module entirely ("peak week needs a human eye, not numbers"); single 21-day Pro trial.

Pricing windows (Override 3a):
- Open beta: £0.99/mo
- Founders (post open beta): £1.99/mo (up from £1.49)
- Standard (post founders): £3.99/mo (up from £2.99, well below old Complete £6.99)

Pricing strategy: build a user base over short-term ARPU.

Implementation:
- `docs/COMPLETE_TIER_SCOPE_LOCKED.md` re-locked with override preamble
- `docs/SUBSCRIPTION_AND_PAYMENT_LOCKED.md` re-locked for Play Billing direct + 21-day single trial + 3 SKUs
- `supabase/migrate_033_two_tier_consolidation.sql` applied
- `src/lib/proGate.js` FEATURE_MAP collapsed to `{free, pro}`, `peak_week_module` removed
- `src/lib/payments/cascade.js` `skipToPro()` stubbed to return error
- `src/lib/payments/catalogue.js` 3 SKUs only (Pro × 3 pricing windows)
- `src/screens/CascadeGateScreen.js` Day-21 variant only (day14 + day28 alias for back-compat)
- `src/screens/SubscriptionScreen.js` 2-tier UI

### Override 4: Closed Testing build stays frozen

"The current Play Console closed testing build stays in place until the WHOLE project is built out, not half done. Do NOT propose, schedule, or trigger a new closed-testing release." — locked in `CLAUDE.md`.

Cloud migrations DO get applied now to support continued building on the branch; the old app on closed testing is required to remain functional against the new schema (sync errors in log are acceptable; total break is not). Any schema change must satisfy that contract or it can't ship to cloud either.

### Override 5: main is the active branch

The earliest sessions ran on `claude/volyume-food-logging-app-B9JZv`. Founder asked for that branch to be force-pushed over `main`, then for `main` to be the active development branch directly. GitHub default branch is still `claude/build-volyume-app-srY9C` (per founder, requires desktop access to change, deferred).

**This means:** push to `main`, fetch + rebase before push. Never `--no-verify`. Never skip hooks. Never `git reset --hard` without asking. Never force-push to `main`/`master` again (the original force-push was an explicit one-time override).

---

## 3. Architecture overview

### Tech stack

| Layer | Choice |
|---|---|
| Mobile | React Native 0.74.5 + Expo SDK 51 |
| State | Zustand 4.5.2 (`src/store/useAppStore.js`) |
| Local storage | expo-sqlite (`src/lib/database.js`) + AsyncStorage for flags |
| Cloud | Supabase (Postgres + Auth + RLS + Edge Functions + pg_cron) |
| Auth | Email + Google + Apple OAuth via Supabase auth |
| Payments | Google Play Billing direct via `react-native-iap` 12.16.1 |
| Errors | Sentry React Native 5.24.3 |
| Camera | react-native-vision-camera 4.7.3 |
| OCR | @react-native-ml-kit/text-recognition 1.5.2 (on-device) |
| Charts | victory-native 41.12, react-native-gifted-charts 1.4.41 |
| Notifications | expo-notifications 0.28.19 + expo-task-manager |
| Build | EAS (Android only); GitHub Actions Android build pipeline at `.github/workflows/build-android.yml` |

iOS modules are kept buildable but iOS is deferred indefinitely (no Apple Developer account, no App Store Connect entity).

### Repo layout

```
/
├── App.js                          App entry point. Boots Sentry, runs maybeSync, AppState listener
├── index.js                        registerRootComponent
├── CLAUDE.md                       Voice + engineering rules (READ FIRST)
├── README.md
├── metro.config.js                 Adds 'dat' to assetExts for bundled snapshots
├── babel.config.js
├── jest.config*.js                 (config is in package.json)
├── package.json
├── eas.json                        EAS Build profiles
├── app.json                        Expo config (versionCode, splash, plugins)
├── google-services.json            Google OAuth config (gitignored copy in CI)
├── android/                        Native Android project (prebuild output)
├── modules/
│   ├── rest-timer-live/            Custom expo module: live rest timer
│   └── live-activity/              Custom expo module: iOS LiveActivity (dormant)
├── assets/
│   ├── seed/
│   │   ├── off_uk_snapshot.dat     OFF UK foods snapshot (~25k rows, Metro asset)
│   │   └── cofid_uk.dat            CoFID UK generic foods snapshot (~3k rows, Metro asset)
│   └── ...                         Icons, splash, fonts
├── docs/                           This handoff + LOCKED specs + status docs
├── public/
│   └── privacy.html                Privacy policy (12 locked sections, not yet deployed)
├── scripts/
│   └── seed/
│       ├── buildOffSnapshot.js     Generates off_uk_snapshot.dat
│       └── buildCofidSnapshot.js   Generates cofid_uk.dat
├── src/
│   ├── components/                 Reusable UI components
│   │   ├── DifferentialBadge.js    Move #4 paywall trigger badge
│   │   ├── HeldDecisionCard.js     Coach surface card
│   │   ├── MacroRings.js           Diary macro rings
│   │   ├── FoodDetailSheet.js      Bottom sheet on food row tap
│   │   ├── PRCelebration.js
│   │   ├── Toast.js
│   │   ├── VolyumeMark.js
│   │   └── ...
│   ├── lib/
│   │   ├── database.js             ~5000 lines, single SQLite gateway
│   │   ├── supabase.js             Supabase client + auth helpers
│   │   ├── sync.js                 ~85KB single-file sync (drift vs spec'd 7-file layout)
│   │   ├── syncQueue.js            Per-op retry with exponential backoff
│   │   ├── engineTelemetry.js      Local-first event queue + cloud push
│   │   ├── errorLog.js             logInfo/logWarn/logError + ring buffer
│   │   ├── sentry.js               Sentry init, scrub wired
│   │   ├── observability.js        AppState shutdown handler, crash flag, error ring buffer
│   │   ├── observability/
│   │   │   └── sentryScrub.js      Privacy-critical PII scrubber (110 audit tests)
│   │   ├── food/
│   │   │   ├── db.js               food + custom_foods + food_entries CRUD
│   │   │   ├── waterfall.js        local → live OFF → USDA orchestrator
│   │   │   ├── sources/
│   │   │   │   ├── localCache.js
│   │   │   │   ├── liveOff.js      OpenFoodFacts API
│   │   │   │   └── usda.js         USDA FoodData Central API
│   │   │   ├── normalisers/        Per-source normalisation
│   │   │   ├── seed.js             OFF + CoFID snapshot importer (transaction mutex)
│   │   │   ├── libraryDelta.js     Cloud delta pull via food_library_pull RPC
│   │   │   ├── csvExport.js
│   │   │   ├── ocr.js              MLKit wrapper
│   │   │   ├── ocrParser.js        Nutrition-label text → rows
│   │   │   ├── writeback.js        OFF write-back queue
│   │   │   └── sanityChecks.js     Macro sanity gate before custom-food save
│   │   ├── payments/
│   │   │   ├── index.js
│   │   │   ├── playBilling.js      Real react-native-iap provider + stub
│   │   │   ├── catalogue.js        3 SKUs (Pro × 3 pricing windows)
│   │   │   ├── cascade.js          Trial state machine + telemetry fan-out
│   │   │   └── restore.js
│   │   ├── nutritionEngine.js      FFM floor + adaptive TDEE
│   │   ├── weeklyCoach.js          Weekly Precision Coaching output
│   │   ├── differentialPaywall.js  Move #4 pure detector
│   │   ├── edPatternDetector.js    Move #2 ED-pattern signals
│   │   ├── insightsEngine.js       Insights tab
│   │   ├── planEngine.js / planAutoGen.js / planSwitch.js
│   │   ├── mesocycle.js
│   │   ├── phaseEngine.js
│   │   ├── recoveryEMA.js
│   │   ├── swapEngine.js
│   │   ├── notifications/          7-file module per NOTIFICATIONS_LOCKED.md
│   │   │   ├── index.js
│   │   │   ├── categories.js       Category enum + channel routing
│   │   │   ├── quietHours.js       22:00→07:00 default time-shift rule
│   │   │   ├── permissions.js      Request / status helpers
│   │   │   ├── handler.js          Foreground delivery + smart suppression
│   │   │   ├── scheduler.js        Cron-like schedule + cancel helpers
│   │   │   └── telemetry.js        notification_sent / _tapped / _failed
│   │   ├── restNotifications.js    (sibling, pending pull-in)
│   │   ├── trainingReminders.js    (sibling, pending pull-in)
│   │   ├── coachingGoals.js
│   │   ├── coachExport.js
│   │   ├── whyThisTemplates.js     Locked Move #0.5 templates
│   │   ├── algorithms.js
│   │   ├── strengthStandards.js
│   │   ├── seedExercises.js / seedRoutines.js
│   │   ├── health.js               HealthKit / Health Connect read wrapper
│   │   ├── feedback.js
│   │   ├── haptics.js
│   │   ├── proGate.js              isPaidTier / hasFeature / hasGoalUnlock + FEATURE_MAP
│   │   ├── activeWorkoutNotification.js
│   │   ├── dailyNarrative.js
│   │   ├── blockAdvisor.js
│   │   ├── formTips.js
│   │   ├── importExternal.js
│   │   ├── travelMode.js
│   │   ├── wellbeing.js
│   │   ├── units.js
│   │   ├── accessibilityPrefs.js
│   │   ├── dataBackup.js
│   │   └── storeReview.js
│   ├── screens/                    56 screens (full inventory in section 11)
│   ├── navigation/
│   │   └── RootNavigator.js        Stacks + auth gating + cascade entry
│   ├── store/
│   │   └── useAppStore.js          Zustand store (user, tier, profile, sync state)
│   ├── styles/
│   │   └── theme.js                Locked dark theme (#0D0D0D bg, amber accent)
│   ├── api/                        (if present)
│   └── __tests__/                  Top-level integration tests (screen-mount, error pipeline)
├── tests/
│   └── simulator/                  Engine simulator framework
│       ├── runner.js
│       ├── buildWeeklyInputs.js
│       └── scenarios/              12 locked scenarios
├── supabase/
│   ├── schema.sql
│   ├── setup_complete.sql
│   ├── migrate_*.sql               39 migrations (015-039)
│   ├── nuke_uid_*.sql              Ad-hoc cleanup scripts (not for production)
│   ├── functions/
│   │   ├── delete-account/         Account deletion + audit log
│   │   └── play-billing-rtdn/      Google Play RTDN webhook
│   └── email-templates/
├── __mocks__/                      Jest mocks (asset-stub, expo-constants, expo-secure-store, expo-sqlite, etc.)
└── .github/
    └── workflows/
        └── build-android.yml       Android build with Gradle 8.9 + RN 0.74 patches + missingDimensionStrategy for react-native-iap
```

---

## 4. Shipped functionality by area

### 4.1 Authentication

- Email signup / sign-in via Supabase auth (`signUpWithEmail`, `signInWithEmail`)
- Email confirmation flow ("Check your email")
- Password reset (`resetPassword`)
- Google OAuth (`signInWithGoogle`) — deep-link redirect handled by App.js
- Apple OAuth (`signInWithApple`) — same pattern; iOS-only but module kept buildable
- Local anonymous user fallback (`useAppStore.initLocalUser`) — pre-sign-in workouts logged locally, migrated on signup via `migrateLocalUserId` (IDENTITY contract: only legitimate UPDATE of `user_id`)
- Sign-out wipes local SQLite + AsyncStorage + SecureStore tokens (`clearAuthStateForSignOut`)
- Push-first safety: sign-out fails if cloud push fails (caller shows "couldn't sign out" toast)
- Cross-user wipe: if a different supabase account signed in previously, wipe their data before pulling new account's
- Sentry user binding via `setSentryUser(session?.user)` so errors are searchable by user

**Telemetry wired:** `sign_in`, `sign_out`, `account_created` (5-min created_at filter).

### 4.2 Onboarding

11 screens, scattered (not in the spec'd `src/screens/onboarding/` subdirectory — accepted drift):
- `WelcomeScreen` (entry)
- `OnboardingScreen` (carousel)
- `LoginScreen` (signin/signup)
- `FirstRunScreen` (first-time setup)
- `ProOnboardingScreen` (Pro entry)
- `ProGoalSetupScreen`
- `ProSetupCompleteScreen`
- `GoalChangeSummaryScreen`
- `Article9ConsentScreen` (UK GDPR Article 9 health-data consent)
- `GoalLockConsentScreen` (Move #2 ED-pattern goal lock)
- `WellbeingCheckScreen` (ED screening questions)

**Telemetry wired at consent:** `article9_consent_recorded`.

### 4.3 Workouts / training

- Plan library + custom builder (`PlansScreen`, `PlanLibraryScreen`, `PlanDetailScreen`, `BuildWorkoutScreen`, `ManualBuilderScreen`, `MesocycleBuilderScreen`)
- Routines + exercises (CRUD via `database.js`)
- Active workout (`ActiveWorkoutScreen`) with rest timer (`rest-timer-live` module), live notification, PR celebration
- Workout history + summary (`WorkoutHistoryScreen`, `WorkoutSummaryScreen`)
- Exercise library + detail (`ExerciseLibraryScreen`, `ExerciseDetailScreen`)
- PR wall (`PRWallScreen`)
- Volume heatmap (`VolumeHeatmapScreen`)
- Year of Lifts unlock (one-shot on first crossing of 365-day training)
- Strength standards (`strengthStandards.js`)
- Plan auto-generation + swap engine (`planAutoGen.js`, `swapEngine.js`)

### 4.4 Engine / Precision Coaching

Per `MASTER_VISION_AND_PLAN.md` + `COACHING_VOICE_SYNTHESIS_LOCKED.md`:
- `weeklyCoach.js` — the weekly check-in → coach output. Includes:
  - FFM-aware safety floor (Move #1)
  - ED-pattern detector integration (Move #2)
  - Rapid-loss upward gate compression (Move #3)
  - Differential paywall trigger emission (Move #4)
  - All voice-compliant copy (Move #0.5)
- `nutritionEngine.js` — adaptive TDEE + protein floor + macro split
- `insightsEngine.js` — Insights tab content + Move #1.5 food insights
- `phaseEngine.js` + `mesocycle.js` — block phase tracking
- `edPatternDetector.js` — 4-signal threshold flip (Move #2)
- `differentialPaywall.js` — pure detector for Move #4
- `recoveryEMA.js` — EWMA on weight trend (alpha=0.1)
- `weeklyCoach.voice.snapshot.test.js` (5 snapshots) — guards voice compliance
- `whyThisTemplates.snapshot.test.js` (14 snapshots) — guards locked WHY_LIBRARY copy

**Coach surface:** `CoachOutputScreen`, `CoachReviewScreen`, `CoachHeldHistoryScreen`.

**Telemetry wired:** `weekly_coach_run`, `ffm_floor_hold_fired`, `ed_pattern_flag_fired`, `ed_pattern_flag_cleared`, `rapid_loss_compression_triggered`, `goal_lock_set`, `goal_lock_cleared`.

### 4.5 Food / Diary

- `DiaryScreen` — meal sections, MacroRings, swipe-delete (`SwipeableEntryRow`), Copy-yesterday FAB, water tracker, date pager
- `FoodSearchScreen` — debounced search across local + OFF + USDA, source chips
- `ScanBarcodeScreen` — vision-camera barcode scan + torch + freeze-on-read + auto-permission-request
- `ScanLabelScreen` — vision-camera image capture → MLKit OCR → parsed macros → AddCustomFood
- `AddCustomFoodScreen` — manual entry + sanity check + custom_foods insert
- `FoodInsightsScreen` — 7-day macro chart + CSV export
- `NutritionTargetsScreen` — daily macro target editor
- `NutritionEducationScreen`
- `CreditsScreen` — OFF / CoFID / USDA license attribution

**Data layer:**
- `src/lib/food/db.js` — foods + custom_foods + food_entries CRUD
- `src/lib/food/waterfall.js` — local cache → live OFF → USDA orchestrator with first-hit-wins + cache promotion
- `src/lib/food/sources/localCache.js` / `liveOff.js` / `usda.js`
- `src/lib/food/seed.js` — bundled OFF + CoFID snapshot importer (transaction-mutex serialised)
- `src/lib/food/libraryDelta.js` — cloud delta-pull RPC (migration 028)
- `src/lib/food/ocr.js` + `ocrParser.js` + `writeback.js`
- `src/lib/food/sanityChecks.js` — macro plausibility gate

**Bundled snapshots:**
- `assets/seed/off_uk_snapshot.dat` (~25k OFF UK products, regenerated weekly by GitHub Actions)
- `assets/seed/cofid_uk.dat` (~3k CoFID UK generic foods, Open Government Licence v3.0)

**Telemetry wired:** `food_search_attempt`, `food_lookup_barcode`, `food_logged`, `custom_food_created`, `ocr_writeback_attempted`.

### 4.6 Cascade / Payments / Tiers

Per `SUBSCRIPTION_AND_PAYMENT_LOCKED.md` (re-locked 2026-05-25) + `COMPLETE_TIER_SCOPE_LOCKED.md` (re-locked 2026-05-25 with 2-tier consolidation preamble):

- 2-tier model: Free, Pro
- 21-day Pro trial starts at Article 9 consent
- Single Day-21 gate (CascadeGateScreen, with day14/day28 alias for back-compat)
- 3 SKUs: pro_open_beta_monthly £0.99, pro_founders_monthly £1.99, pro_standard_monthly £3.99

**Client-side modules** (`src/lib/payments/`):
- `index.js` — re-exports
- `playBilling.js` — provider abstraction. Real `react-native-iap` provider injected at boot via `tryWireRealProvider()` from `App.js`. Purchase listener acknowledges via `finishTransaction`. obfuscatedAccountId stamped at initialise. Fires `purchase_initiated`, `purchase_completed`, `purchase_failed`, `restore_purchases_attempted`.
- `cascade.js` — wrappers around `start_cascade` and `upgrade_tier` RPCs. Telemetry fan-out via `_trackTransition` for every transition.
- `restore.js` — `restorePurchases` flow + `payAt` for tier reconciliation
- `catalogue.js` — 3-SKU catalogue with current_pricing_window resolver

**Server side** (Supabase):
- `migrate_030_tier_infrastructure.sql` — `tier_history`, `users_profile.trial_state` + 5 cols, `upgrade_tier` RPC, `start_cascade` RPC, `pricing_config`, `current_pricing_window`. Bypasses existing `protect_users_profile_tier` trigger via `session_replication_role`.
- `migrate_031_cascade_workers.sql` — `cascade_advance_due_users()` + pg_cron schedule every 15 min (requires pg_cron extension enabled in the project)
- `migrate_033_two_tier_consolidation.sql` — RPC updates for 2-tier collapse
- `supabase/functions/play-billing-rtdn/index.ts` — Pub/Sub push receiver. Verifies subscription via Google Play Developer API JWT-signed service account. Maps Google notificationType → `upgrade_tier(...reason='play_billing_rtdn')`. Deployment pending founder action.

**UI:**
- `CascadeGateScreen` — Day-21 gate (with day14 + day28 aliases)
- `SubscriptionScreen` — You-tab management
- `TierComparisonStrip`
- `PaywallScreen` — modal for Move #4 differential pay tap
- `DifferentialBadge` — inline on CoachOutputScreen below held-decisions
- `ProUpgradeScreen` — legacy Pro upgrade
- `SubscriptionPolicyScreen`

**proGate** (`src/lib/proGate.js`):
- `isPaidTier(profile)` — true if active pro or in trial
- `hasFeature(profile, feature)` — FEATURE_MAP gated
- `hasGoalUnlock(profile, goal)`
- FEATURE_MAP collapsed to `{free, pro}` (peak_week_module removed)

**Telemetry wired:** `cascade_started`, `cascade_advanced`, `cascade_skipped_ahead`, `cascade_state_transition`, `paid_converted`, `churn_at_gate`, `subscription_cancelled`, `paywall_shown`, `paywall_tapped_cta`, `purchase_initiated`, `purchase_completed`, `purchase_failed`, `restore_purchases_attempted`, `tier_changed`.

### 4.7 Privacy / Consent

Per `PRIVACY_CONSENT_LOCKED.md`:
- `Article9ConsentScreen` — UK GDPR Article 9 explicit consent for health data
- `record_health_consent` RPC writes to `users_profile.health_data_consent` AND appends to `consent_log` audit table (`migrate_019_health_consent.sql`)
- Cascade starts at Article 9 consent (per `SUBSCRIPTION_AND_PAYMENT_LOCKED.md` line 106)
- `public/privacy.html` — 12-section privacy policy with verbatim FTC HBNR breach-notification language. **Not yet deployed.**
- `src/lib/observability/sentryScrub.js` — privacy-critical PII scrubber with 110 audit tests. Asserts every scrub rule matches the schema (per spec line 282).
- Account deletion flow (`SettingsScreen.performDeleteAccount` → Edge Function `delete-account`):
  1. Edge Function verifies user via JWT
  2. Calls `delete_user_data` RPC (RLS-enforced user-data wipe)
  3. Calls `record_account_deletion_started` (writes to non-cascading `account_deletions_log`)
  4. Calls `auth.admin.deleteUser` (service role)
  5. Calls `record_account_deletion_completed` (sets completed_at)
- `account_deletions_log` table (migration 039) does NOT have a FK to auth.users, so the audit row survives the cascade delete. Stores user_email for FTC HBNR compliance.

**Telemetry wired:** `article9_consent_recorded`. The `account_deleted` event lands in `account_deletions_log` instead of engine_telemetry (because engine_telemetry cascades).

### 4.8 Telemetry

Per `TELEMETRY_DASHBOARDS_LOCKED.md`:

**Infrastructure** (`src/lib/engineTelemetry.js`):
- `track(userId, event, payload)` — writes to local SQLite `engine_telemetry` table immediately (survives offline), debounces a cloud push via `record_engine_telemetry` RPC
- `flushPendingTelemetry()` — drains the unpushed local queue
- Allow-list enforced client-side AND server-side (matching arrays)

**Server schema:**
- `migrate_017_ed_pattern_and_telemetry.sql` — `engine_telemetry` table with `payload_json` column (NOT `payload` — was the source of the device-log bug, see section 13)
- `migrate_022_food_telemetry_events.sql` — Move #1.5 events
- `migrate_027_rapid_loss_compression_telemetry.sql` — Move #3 event
- `migrate_029_telemetry_allowlist_extension.sql` — Engine health events (typoed `payload`, fixed by 034)
- `migrate_032_paywall_telemetry_events.sql` — Move #4 events (same typo, fixed by 034)
- `migrate_034_telemetry_payload_column_fix.sql` — restores correct column name
- `migrate_035_auth_consent_telemetry.sql` — sign_in / sign_out / article9_consent_recorded
- `migrate_036_signup_funnel_telemetry.sql` — account_created / custom_food_created
- `migrate_037_lifecycle_sync_telemetry.sql` — app_cold_start / app_foregrounded / app_backgrounded / sync_run
- `migrate_038_payments_cascade_telemetry.sql` — cascade_state_transition + purchase_* + subscription_cancelled + restore_purchases_attempted
- `migrate_039_account_deletions_log.sql` — non-cascading audit-trail table + record_account_deletion_started/completed RPCs (Panel 8)
- `migrate_040_notification_telemetry.sql` — notification_sent + notification_tapped + notification_failed (Panel 6)
- `migrate_041_consent_withdrawal_telemetry.sql` — article9_consent_withdrawn (Panel 8)

**Daily rollup view** (`engine_telemetry_daily` from migration 017) aggregates per day; cohort dashboards read from it.

**Event count: 36 allow-listed; 32 currently emitting from real call sites.** Full event-to-panel mapping in section 8.

### 4.9 Sync

`src/lib/sync.js` is a single ~85KB file (drift vs the spec'd `src/lib/sync/` 7-file directory):
- `syncProfile(supabaseUserId, userProfile, _tier, opts)` — pushes profile
- `syncWorkout(supabaseUserId, workoutId)` — pushes one workout + exercises
- `syncMorningWeight` / `syncWeeklyCheckin` / `syncBodyMetric`
- `bulkUploadLocalData(supabaseUserId, localUserId)` — full local→cloud catch-up
- `pullFromCloud(supabaseUserId)` — full cloud→local pull
- Debounced sync (2s) on workout edits
- Foreground/background AppState listener in App.js → `maybeSync` (60s throttle)

`src/lib/syncQueue.js` — per-op retry with exponential backoff (next_attempt_at gate per row).

**Outstanding (Phase A code work):** Build the spec'd `src/lib/sync/` directory split (registry / runner / queue / conflict / transport / telemetry). Conflict-resolution path doesn't exist yet so `sync_conflict_resolved` telemetry can't fire.

**Telemetry wired:** `sync_run` (from App.js maybeSync).

### 4.10 Notifications

`src/lib/notifications/` directory (built this session per `NOTIFICATIONS_LOCKED.md`):
- `categories.js` — category enum + per-category channel routing (push / in-app / email). ED-pattern + FFM-floor + sync-error are in-app-only by policy.
- `quietHours.js` — 22:00 → 07:00 local default, wrap-window aware, AsyncStorage-persisted via `@volyume_quiet_hours_v1`. Exposes `shiftHourMinuteOutOfQuietHours` + `shiftDateOutOfQuietHours`; the schedulers consult it before pinning every trigger.
- `permissions.js` — `requestNotificationPermissions` + `getNotificationPermissionStatus` (web → 'denied'; iOS sound disabled by default).
- `handler.js` — `configureNotificationHandler` with foreground smart-suppression (don't surface "log your weight" 30 min after the user logged it; don't surface "weekly check-in" once it's done; same for training reminders).
- `scheduler.js` — `scheduleMorningWeightNotification`, `scheduleCheckinReminder`, `scheduleNextCheckinReminder`, the cancel helpers, `restoreNotifications`, `checkYearOfLiftsUnlock`. Every helper catches scheduling errors and emits `notification_failed`.
- `telemetry.js` — `trackNotificationSent` / `trackNotificationTapped` / `trackNotificationFailed`. All three look the user up lazily from the Zustand store; no userId threading needed at call sites. Helpers no-op when nobody is signed in (cold-start tap on a signed-out app).
- `index.js` — single re-export surface. Existing imports `from '../lib/notifications'` keep working unchanged.

Sibling files still alongside the directory (follow-up work to pull into it):
- `restNotifications.js` — rest-timer channel + permission helpers + the (currently disabled) live-countdown Live Activity path. Native module `rest-timer-live`.
- `trainingReminders.js` — per-training-day weekly reminders backed by AsyncStorage prefs. Telemetry-wired in this session's catch path.
- `activeWorkoutNotification.js` — persistent workout-in-progress notification (currently disabled pending manifest fix for Android 14 `FOREGROUND_SERVICE_TYPE_HEALTH`).

**Telemetry wired (migration 040, this session):**
- `notification_sent` from `RootNavigator.addNotificationReceivedListener`. Carries category + scheduled_for + delivered_at. Cold-start deliveries unobservable; tap event covers those.
- `notification_tapped` from `RootNavigator.addNotificationResponseReceivedListener` (plus cold-start `getLastNotificationResponseAsync`). Carries category + tapped_at + data_type.
- `notification_failed` from every scheduler.js catch path + the trainingReminders.js catch path.

**Tests:** `src/lib/__tests__/notifications.quietHours.test.js` (16 tests covering the wrap window, the locked spec's "23:00 shifts to 07:00 next day" acceptance case, custom windows, and the disabled-rule pass-through). `src/lib/__tests__/notifications.categories.test.js` (5 tests covering the category enum / channel map consistency + `isPushCategory` policy + `categoryForDataType` mapping).

**Outstanding follow-ups:** Pull the three sibling files into `src/lib/notifications/`. Add `cascade_gate` + `subscription_payment_failure` + `weekly_coach_ready` scheduler helpers when those surfaces ship.

### 4.11 Observability

Per `OBSERVABILITY.md` + `TELEMETRY_DASHBOARDS_LOCKED.md`:
- Sentry React Native 5.24.3 wired in `src/lib/sentry.js`
- DSN at runtime via `EXPO_PUBLIC_SENTRY_DSN` env var; no-ops without DSN
- `beforeSend` hook applies scrub rules from `src/lib/observability/sentryScrub.js`
- 110 audit tests assert scrub rules match the schema (`PRIVACY_CONSENT_LOCKED.md` line 282)
- Error ring buffer (200 events) in `errorLog.js`, attached as breadcrumbs
- Performance traces sampled 10% prod / 100% dev
- AppState shutdown handler (`observability.js`) flips CRASHED_FLAG so cold-launch can tell if last session crashed
- `getLastCrashMeta()` exposes the last-crash metadata to the debug screen

---

## 5. Test inventory

**1348 tests across 60 suites, 0 fail, 0 skip.** Run via `npx jest`.

### 5.1 Test locations

- `src/__tests__/` — integration tests (screen-mount, error pipeline)
- `src/lib/__tests__/` — unit tests for lib modules
- `tests/simulator/` — engine simulator framework + 12 scenarios

### 5.2 Test suites by area

| Area | Suite | Tests |
|---|---|---|
| Voice compliance | jargonBlocklist.test.js | 11 |
| Voice compliance | whyThisTemplates.snapshot.test.js | 14 |
| Voice compliance | weeklyCoach.voice.snapshot.test.js | 5 |
| FFM floor | ffmFloor.test.js | 17 |
| FFM floor | ffmFloor.adaptive.test.js | 8 |
| FFM floor | weeklyCoach.ffmFloor.test.js | 8 |
| Food sanity | sanityChecks.test.js | 18 |
| Food export | csvExport.test.js | 8 |
| Food sync | foodSync.test.js | 12 |
| Food sources | food.liveOff.test.js | 10 |
| Food sources | food.usda.test.js | 8 |
| Food OCR | food.ocrParser.test.js | 6 |
| Food OCR | food.writeback.test.js | 9 |
| Food orchestration | food.waterfall.test.js | (orchestration) |
| ED pattern | edPatternDetector.test.js | 23 |
| Move #3 | upwardGateCompression.test.js | 15 |
| Move #4 | differentialPaywall (detector) | 40 |
| Move #4 | DifferentialBadge / PaywallScreen mounts | 6 |
| Payments | payments.catalogue.test.js | (catalogue) |
| Insights | insightsEngine.test.js | (full) |
| Plans | planAutoGen.test.js | (full) |
| Mesocycle | mesocycle.test.js | (full) |
| Engine simulator | scenarios/straight_cut.test.js | 1 |
| Engine simulator | scenarios/aggressive_cut_supervised.test.js | 1 |
| Engine simulator | scenarios/aggressive_cut_unsupervised.test.js | 1 |
| Engine simulator | scenarios/red_s_trajectory.test.js | 1 |
| Engine simulator | scenarios/recomp_steady.test.js | 1 |
| Engine simulator | scenarios/bulk_gentle.test.js | 1 |
| Engine simulator | scenarios/bulk_aggressive.test.js | 1 |
| Engine simulator | scenarios/rapid_loss_correction.test.js | 1 |
| Engine simulator | scenarios/stalled_lift.test.js | 2 (free + paid) |
| Engine simulator | scenarios/plateau_then_break.test.js | 1 |
| Engine simulator | scenarios/returning_user.test.js | 1 |
| Engine simulator | scenarios/noisy_logger.test.js | 1 |
| Integration | screen-mount.test.js | (every screen × 4 state variants) |
| Integration | error-and-feedback-pipeline.test.js | (full) |
| Privacy | sentryScrub audit | 110 |

### 5.3 Engine simulator framework

`tests/simulator/runner.js`:
- `simulate({ user, weeks, weeklyInputs })` — runs the weeklyCoach engine for N weeks, returns trace
- Daily-granularity morning-weights anchored to Date.now() (so getEwmaSevenDaysAgo cutoff lines up)
- `buildWeeklyInputs(n, fn)` — helper to generate weekly check-in inputs from a function

All 12 locked scenarios per `TESTING_STRATEGY_LOCKED.md` lines 22-72:
1. `straight_cut` — straightforward fat-loss cut
2. `aggressive_cut_supervised` — supervised aggressive cut, no flag
3. `aggressive_cut_unsupervised` — same trajectory but consent-gated → flag fires
4. `red_s_trajectory` — RED-S pattern (under + low energy + amenorrhoea proxy)
5. `recomp_steady` — flat weight, intake hit
6. `bulk_gentle` — mild bulk on target
7. `bulk_aggressive` — fast bulk → adjustments but no safety flags
8. `rapid_loss_correction` — week of rapid loss → upward gate compression
9. `stalled_lift` — bench plateau + under-adherence → Move #4 differential paywall trigger (free + paid variants)
10. `plateau_then_break` — 8+ weeks cutting → diet break suggested per MATADOR
11. `returning_user` — 6-week absence → data confidence gate clamps
12. `noisy_logger` — inconsistent data → engine tolerates without false flags

---

## 6. Database migrations (15 through 039, all on cloud)

Each migration is idempotent (CREATE TABLE IF NOT EXISTS, ON CONFLICT DO NOTHING, etc.) so re-running is safe.

| # | Purpose | Apply method | Status |
|---|---|---|---|
| 015 | Food logging schema | Supabase Dashboard | Applied |
| 016 | Food sync RPCs (food_sync_pull, food_sync_push) | Dashboard | Applied |
| 017 | ED-pattern + telemetry (ed_pattern_flags, engine_telemetry, view, RPC, clear_goal_lock RPC) | Dashboard | Applied |
| 018 | Composite PKs on legacy tables (user_id, id) | Dashboard | Applied |
| 019 | Health consent (Article 9): users_profile.health_data_consent + consent_log + record_health_consent RPC | Dashboard | Applied |
| 020 | custom_exercises split from exercises | Dashboard | Applied |
| 021 | Food composite PKs | Dashboard | Applied |
| 022 | Food telemetry events allow-list (food_lookup_barcode, ocr_writeback_attempted) | Dashboard | Applied |
| 023 | custom_foods.barcode_ean column | Dashboard | Applied |
| 024 | consent_log composite PK rectification | Dashboard | Applied |
| 025 | delete_user_data completeness (wipes every public.* table) | Dashboard | Applied |
| 027 | rapid_loss_compression_triggered allow-list (Move #3) | Dashboard | Applied |
| 028 | food_library_pull RPC (delta sync) | Dashboard | Applied |
| 029 | Telemetry allow-list extension (had typo: `payload` instead of `payload_json`) | Dashboard | Applied (patched by 034) |
| 030 | Tier infrastructure (tier_history, trial_state + 5 cols, upgrade_tier RPC, start_cascade RPC, pricing_config, current_pricing_window) | Dashboard | Applied |
| 031 | Cascade workers (cascade_advance_due_users + pg_cron schedule every 15 min) | Dashboard (requires pg_cron extension) | Applied |
| 032 | Paywall telemetry events (same typo as 029) | Dashboard | Applied (patched by 034) |
| 033 | 2-tier consolidation RPC updates (Override 3) | Dashboard | Applied |
| 034 | engine_telemetry column-name fix (restores payload_json after 029+032 typo) | Dashboard | Applied |
| 035 | sign_in + sign_out + article9_consent_recorded allow-list | Dashboard | Applied |
| 036 | account_created + custom_food_created allow-list | Dashboard | Applied |
| 037 | app_cold_start + foregrounded/backgrounded + sync_run allow-list | Dashboard | **Pending founder apply** |
| 038 | cascade_state_transition + purchase_* + subscription_cancelled + restore_purchases_attempted | Dashboard | **Pending founder apply** |
| 039 | account_deletions_log table + record_account_deletion_started/completed RPCs (non-cascading audit) | Dashboard | **Pending founder apply** |

There are gaps at 026 (skipped: was a silencer that was reverted) and ones lost during early experimentation. Migration filenames are the canonical reference.

**Schema invariants** (per `IDENTITY_AND_OWNERSHIP_LOCKED.md`):
- Every user-scoped table has `PRIMARY KEY (user_id, id)`
- `user_id` is set at INSERT and NEVER updated (CI grep enforces this)
- No anonymous mode: every user has a real account
- Sign-out wipes local SQLite
- No destructive cleanup of existing data: the schema fix rescues it

**Schema contract with closed-test build** (Override 4):
The old AAB at v1.1.0+4 must remain functional against the new schema. Sync errors in log are acceptable; total break is not. All new migrations have been verified additive-only (no DROP TABLE, no NOT NULL on existing columns).

---

## 7. Telemetry event catalogue (full state)

Per `TELEMETRY_DASHBOARDS_LOCKED.md` event catalogue.

### 7.1 Wired and emitting (29 events)

| Event | Call site | Dashboard panel |
|---|---|---|
| `weekly_coach_run` | CoachOutputScreen post-run | Panel 2 |
| `ffm_floor_hold_fired` | CoachOutputScreen post-run | Panel 2 |
| `ed_pattern_flag_fired` | CoachOutputScreen ED-pattern transition | Panel 2 |
| `ed_pattern_flag_cleared` | CoachOutputScreen ED-pattern clearance | Panel 2 |
| `rapid_loss_compression_triggered` | CoachOutputScreen Move #3 fire | Panel 2 |
| `goal_lock_set` | GoalLockConsentScreen | Panel 2 |
| `goal_lock_cleared` | GoalLockConsentScreen | Panel 2 |
| `food_search_attempt` | waterfall.js searchFoods | Panel 3 |
| `food_lookup_barcode` | waterfall.js resolveBarcode | Panel 3 |
| `food_logged` | food/db.js logFoodEntry | Panel 3 |
| `custom_food_created` | AddCustomFoodScreen.onSave | Panel 3 |
| `ocr_writeback_attempted` | food/writeback.js | Panel 3 |
| `paywall_shown` | CoachOutputScreen DifferentialBadge mount | Panel 5 |
| `paywall_tapped_cta` | CoachOutputScreen DifferentialBadge tap | Panel 5 |
| `purchase_initiated` | playBilling.purchasePackage entry | Panel 5 |
| `purchase_completed` | playBilling.purchaseUpdatedListener | Panel 5 |
| `purchase_failed` | playBilling.purchaseErrorListener | Panel 5 |
| `restore_purchases_attempted` | playBilling.restorePurchases | Panel 5 |
| `cascade_started` | cascade.startCascade success | Panel 5 |
| `cascade_advanced` | cascade.payAt success | Panel 5 |
| `cascade_skipped_ahead` | cascade.skipToFree success | Panel 5 |
| `cascade_state_transition` | cascade._trackTransition (all paths) | Panel 5 |
| `paid_converted` | cascade.payAt success | Panel 5 |
| `churn_at_gate` | cascade.skipToFree success | Panel 5 |
| `subscription_cancelled` | cascade.cancel / graceLapsed / refunded | Panel 5 |
| `tier_changed` | useAppStore.setTier | Panel 5 |
| `sign_in` | RootNavigator auth listener (SIGNED_IN, not INITIAL_SESSION) | Panel 1 |
| `sign_out` | useAppStore.clearAuthStateForSignOut entry | Panel 1 |
| `account_created` | RootNavigator auth listener (SIGNED_IN + created_at < 5min) | Panel 1 / 5 funnel |
| `article9_consent_recorded` | Article9ConsentScreen.handleContinue | Panel 8 |
| `sync_run` | App.js maybeSync end | Panel 4 |
| `app_cold_start` | App.js maybeSync first signed-in resolve | Panel 1 |
| `app_foregrounded` | App.js AppState 'active' after cold-start | Panel 1 |
| `app_backgrounded` | App.js AppState 'background' (not 'inactive') | Panel 1 |
| `notification_sent` | RootNavigator addNotificationReceivedListener | Panel 6 |
| `notification_tapped` | RootNavigator addNotificationResponseReceivedListener (incl. cold-start) | Panel 6 |
| `notification_failed` | scheduler.js catch paths + trainingReminders.js catch path | Panel 6 |

(Counts as ~36 because account_created/paywall_shown/purchase_completed/etc. each map to multiple panels; 32 unique call sites.)

### 7.2 Not wired, with explicit rationale

| Event | Blocker | Resolution |
|---|---|---|
| `held_decision_created` / `_cleared` | Per-type events (ed_pattern_flag_fired, ffm_floor_hold_fired, rapid_loss_compression_triggered) already populate Panel 2 split-by-type. Umbrella event would duplicate rows. | Skip unless dashboard explicitly needs the umbrella shape; revisit if Panel 2 query becomes painful. |
| `sync_conflict_resolved` | Single-file `sync.js` doesn't have a structured conflict-resolution code path. | Build `src/lib/sync/` directory split per `SYNC_ARCHITECTURE_LOCKED.md` (drift item; ~3-4 days). |
| `account_deleted` | Cascade-self-deleting: engine_telemetry.user_id has ON DELETE CASCADE so the row dies with the auth.users row. | **Resolved via `account_deletions_log` table (migration 039).** The Edge Function writes pre-and-post auth.admin.deleteUser. |
| `article9_consent_withdrawn` | **Shipped.** SettingsScreen → Privacy section + migration 041. | — |

---

## 8. Dashboard panel coverage (Panels 1-8 from spec)

Panel readiness inferred from event coverage.

| Panel | Coverage | Notes |
|---|---|---|
| **1: Active users / lifecycle** | Full | DAU/WAU/MAU + 7-day retention via sign_in + app_foregrounded + account_created. |
| **2: Engine health** | Full | weekly_coach_run + per-type held-decision events + FFM hold rate + ED flag rate + goal lock count. |
| **3: Food layer health** | Full | food_logged + food_search_attempt + food_lookup_barcode + custom_food_created + ocr_writeback_attempted. Source breakdown from food_logged payload. |
| **4: Sync health** | Partial | sync_run fires. Sync conflict resolution not wired (blocker: sync.js single-file). p50/p95 duration not captured in payload yet. |
| **5: Cascade and conversion** | Full | Full purchase funnel + cascade transitions + paywall events + tier_changed + subscription_cancelled. |
| **6: Notifications** | Partial | `notification_sent` / `_tapped` / `_failed` wired this session; payloads carry the category and timestamps. Categories without an active schedule (cascade gate, payment failure, weekly-coach-ready) will appear once their scheduler helpers land. |
| **7: Crash and error health** | Full | Sentry feeds this; not Supabase telemetry. Crash-free session rate + top issues + new issues today. |
| **8: Privacy and consent** | Full | article9_consent_recorded fires; account_deletions_log captures deletion queue depth + stuck deletions. Consent withdrawal still needs UI to fire withdrawn event (legal path exists). |

---

## 9. Edge Functions

### 9.1 `supabase/functions/delete-account/index.ts`

Account deletion. Brackets `auth.admin.deleteUser` with `record_account_deletion_started` (writes audit row) and `record_account_deletion_completed` (sets completed_at). Audit row survives the cascade because `account_deletions_log` has no FK to auth.users.

Flow:
1. Verify caller via JWT (anon-key client with Authorization header)
2. Wipe public.* via `delete_user_data` RPC (user JWT, RLS enforced)
3. Service-role admin client created
4. `record_account_deletion_started` with reason + app_version + platform from request body → returns row id
5. `auth.admin.deleteUser(user.id)`
6. `record_account_deletion_completed(row_id)`

Deployed via `supabase functions deploy delete-account`.

### 9.2 `supabase/functions/play-billing-rtdn/index.ts`

Google Play Real-Time Developer Notifications webhook. Receives Pub/Sub push messages, decodes the base64 message body, verifies subscription state via Google Play Developer API (JWT-signed service account), maps Google's `notificationType` to a cascade RPC call (`upgrade_tier(...reason='play_billing_rtdn')`).

**Deployment pending** until founder is ready for Phase A exit purchase test. Requires:
- `supabase functions deploy play-billing-rtdn`
- Configure Pub/Sub topic in Google Cloud Console
- Set RTDN webhook URL in Play Console subscription notifications
- Service account JSON loaded as secret

---

## 10. Build infrastructure

### 10.1 `.github/workflows/build-android.yml`

GitHub Actions Android build pipeline. Cleaned-up patches applied:
- Gradle 8.9 compatibility patches for expo-modules-core
- react-native gradle-plugin patches
- `missingDimensionStrategy 'store', 'play'` patch on app/build.gradle for `react-native-iap` variant matching (the patch that fixed the "last 3 builds have failed" issue)
- `EXPO_PUBLIC_USDA_API_KEY` forwarded into the build (optional)
- Per-build status update commits at `[skip ci]` so dashboard stays current

### 10.2 EAS Build

`eas.json` profiles. Local builds happen via CI; the founder downloads the resulting APK and sideloads to test.

### 10.3 Signing

**No keystore exists yet.** The current `build-android.yml` has explicit signing config that's never been exercised in production. A new AAB cannot replace the Closed Testing build until:
1. Generate Android upload keystore
2. Configure Google Play App Signing
3. Run a CI build with the keystore, verify the AAB is release-signed (`build-android.yml` already has the verification step)

This is a Phase A exit prep step, not blocking current code work.

### 10.4 `metro.config.js`

```js
config.resolver.assetExts.push('dat');
```

Required so `assets/seed/*.dat` files are treated as binary assets (numeric registry IDs for `Asset.fromModule`) instead of being inlined as parsed JS objects.

---

## 11. Screen inventory (56 screens)

Listed alphabetically with one-line purpose.

| Screen | Purpose |
|---|---|
| `ActiveWorkoutScreen` | Workout-in-progress with sets, rest timer, PR celebration |
| `AddCustomFoodScreen` | Manual food entry form with sanity check |
| `AnalyticsScreen` | Body metrics + volume analytics |
| `Article9ConsentScreen` | UK GDPR Article 9 health-data consent gate |
| `AthleteHubScreen` | Home for "what's next" today's training + check-in |
| `BlockReflectionScreen` | End-of-block reflection prompts |
| `BodyMetricsScreen` | Weight + body metrics charts |
| `BuildWorkoutScreen` | Compose a workout from exercises |
| `CascadeGateScreen` | Day-21 Pro trial gate (with day14/day28 back-compat aliases) |
| `CoachHeldHistoryScreen` | Past held-decision cards |
| `CoachOutputScreen` | Weekly Precision Coaching output with held decisions + adjustments |
| `CoachReviewScreen` | Pre-run review |
| `CoachingRemindersScreen` | Notification cadence settings |
| `CreditsScreen` | OFF / CoFID / USDA license attribution |
| `DebugLogScreen` | On-device error ring buffer viewer |
| `DiaryScreen` | Food diary with meal sections + MacroRings + swipe-delete + Copy-yesterday FAB + water tracker |
| `ExerciseDetailScreen` | Per-exercise history + form tips |
| `ExerciseLibraryScreen` | Searchable exercise catalogue |
| `FirstRunScreen` | First-launch setup wizard |
| `FoodInsightsScreen` | 7-day macro chart + CSV export |
| `FoodSearchScreen` | Debounced food search with source chips |
| `GoalChangeSummaryScreen` | Confirmation after a goal change |
| `GoalLockConsentScreen` | Move #2 ED-pattern goal-lock opt-in |
| `HomeScreen` | Tab root with This Week card + active workout shortcut |
| `ImportScreen` | Import external workout data |
| `LoginScreen` | Email + OAuth sign-in / sign-up |
| `ManualBuilderScreen` | Manual mesocycle builder |
| `MesocycleBuilderScreen` | Mesocycle builder |
| `NotificationSettingsScreen` | Notification preferences |
| `NutritionEducationScreen` | Educational nutrition content |
| `NutritionTargetsScreen` | Daily macro target editor |
| `OnboardingScreen` | Multi-page onboarding carousel |
| `PRWallScreen` | Personal record wall |
| `PaywallScreen` | Modal for Move #4 differential pay tap |
| `PlanDetailScreen` | Per-plan detail |
| `PlanLibraryScreen` | Plan library |
| `PlansScreen` | "My plans" tab root |
| `PrivacyPolicyScreen` | In-app privacy policy viewer |
| `ProGoalSetupScreen` | Pro goal selection wizard |
| `ProOnboardingScreen` | Pro tier onboarding |
| `ProSetupCompleteScreen` | Pro setup completion |
| `ProUpgradeScreen` | Legacy Pro upgrade screen |
| `RoutineDetailScreen` | Per-routine detail |
| `ScanBarcodeScreen` | Barcode scan with vision-camera, torch, freeze-on-read |
| `ScanLabelScreen` | Image capture → MLKit OCR → AddCustomFood |
| `SettingsScreen` | You tab: profile, subscription, credits, account delete |
| `ShareCardScreen` | Shareable progress card |
| `SubscriptionPolicyScreen` | Subscription policy text |
| `SubscriptionScreen` | You-tab subscription management with restore |
| `VolumeHeatmapScreen` | Per-muscle volume heatmap |
| `WeeklyCheckInScreen` | Weekly check-in form |
| `WelcomeScreen` | Cold-launch welcome |
| `WellbeingCheckScreen` | ED screening questions |
| `WorkoutHistoryScreen` | Per-workout history |
| `WorkoutSummaryScreen` | Post-workout summary |
| `YearOfLiftsScreen` | Year-of-lifts unlock celebration |

---

## 12. Dependencies (package.json snapshot)

**Runtime:**
- `@expo/vector-icons` ^14.0.2
- `@react-native-async-storage/async-storage` 1.23.1
- `@react-native-ml-kit/text-recognition` ^1.5.2
- `@react-navigation/bottom-tabs` ^6.6.1
- `@react-navigation/native` ^6.1.18
- `@react-navigation/stack` ^6.4.1
- `@sentry/react-native` ~5.24.3
- `@shopify/react-native-skia` ^1.2.3
- `@supabase/supabase-js` ^2.43.4
- `date-fns` ^3.6.0
- `expo` ~51.0.0
- expo-asset, expo-av, expo-background-fetch, expo-build-properties, expo-document-picker, expo-file-system, expo-font, expo-image, expo-haptics, expo-linear-gradient, expo-notifications, expo-print, expo-secure-store, expo-sensors, expo-sharing, expo-sqlite, expo-status-bar, expo-store-review, expo-task-manager, expo-updates, expo-web-browser
- `react` 18.2.0
- `react-native` 0.74.5
- `react-native-calendar-heatmap` ^0.2.4
- `react-native-gesture-handler` ~2.16.1
- `react-native-gifted-charts` ^1.4.41
- `react-native-iap` ^12.16.1 (added 2026-05-25 for Play Billing direct)
- `react-native-reanimated` ~3.10.1
- `react-native-safe-area-context` 4.10.5
- `react-native-screens` ~3.31.1
- `react-native-svg` 15.2.0
- `react-native-url-polyfill` ^2.0.0
- `react-native-vision-camera` ^4.7.3
- `react-native-webview` 13.8.6
- `rest-timer-live` file:./modules/rest-timer-live (custom)
- `live-activity` file:./modules/live-activity (custom, iOS-only, dormant)
- `victory-native` ^41.12.0
- `zustand` ^4.5.2

**Dev:**
- `@babel/core` ^7.29.0
- `babel-jest` ^29.7.0
- `jest` ^29.7.0
- `jest-expo` ~51.0.4
- `xlsx` ^0.18.5 (added for snapshot generation scripts)

---

## 13. Device-log findings + fixes (this session)

The founder pasted a debug log from a successfully-running APK build on his Android phone. Two real bugs surfaced; both fixed and pushed.

### 13.1 food.seed transaction nesting

**Symptom:**
```
[2026-05-25T12:04:22.400Z] ERROR food.seed.off.chunk
  cannot start a transaction within a transaction
  ctx: {"chunkStart":0,"chunkSize":200,...}
[2026-05-25T12:04:24.657Z] ERROR food.seed.off.chunk
  cannot commit - no transaction is active
```

**Root cause:** OFF and CoFID importers fired from `RootNavigator` bootstrap as parallel fire-and-forget promises. Both ran `BEGIN`/`COMMIT` on the same shared SQLite connection. expo-sqlite rejected the second `BEGIN`, then later "cannot commit, no transaction is active" once the first one finished. Despite the chunk error spam, OFF import still landed 25,765 rows because `INSERT OR IGNORE` worked outside the transaction wrapper.

**Fix:** module-level promise-chain mutex (`_withTxLock`) in `src/lib/food/seed.js`. Every per-chunk transaction queues behind the previous one regardless of which importer owns it.

### 13.2 engine_telemetry payload_json column-name typo

**Symptom:**
```
[2026-05-25T12:05:16.836Z] WARN engineTelemetry.flush.rpc
  column "payload" of relation "engine_telemetry" does not exist
  ctx: {"event":"food_search_attempt"}
```

**Root cause:** Migration 017 created the column as `payload_json`. Migrations 029 + 032 (event allow-list extensions) typoed it as `payload`. Result: every cloud telemetry push for post-029 events was rejected, while the local SQLite row still landed.

**Fix:** migration 034 re-creates `record_engine_telemetry` with the correct column name and the full allow-list from 032. Subsequent migrations (035, 036, 037, 038) all use `payload_json` correctly.

---

## 14. Founder action queue (cleaned)

### Now (next session-start the founder reads this)

1. Apply migrations 037 + 038 + 039 in Supabase Dashboard → SQL Editor.
2. (Optional, low priority) Add `EXPO_PUBLIC_USDA_API_KEY` repo secret if USDA fallback is wanted active.

### When Claude says "Phase A code work complete, ready for Phase A exit prep"

3. Generate Android upload keystore. Claude writes the commands.
4. Set up Google Cloud Pub/Sub topic for RTDN + deploy `supabase/functions/play-billing-rtdn/index.ts`.
5. Create 3 SKU products in Play Console (open beta visible; founders + standard hidden).
6. Set up sandbox testers in Play Console for end-to-end purchase test.
7. Deploy `public/privacy.html` to volyume.app/privacy (hosting setup separate question).

### When Phase A exit checklist is green

8. Promote next AAB to Closed Testing.
9. After internal sanity test passes, promote to production.
10. Stand up marketing site + waitlist.
11. Send first wave of 200 open-beta invites.

### Never (in current scope)

- Apple Developer account / App Store Connect / iOS SKU work.

---

## 15. Phase A exit checklist (per RELEASE_PLAN_LOCKED.md lines 77-89)

- [x] Move #0 shipped (citation fix, jargon blocklist)
- [x] Move #0.5 shipped (voice retrofit)
- [x] Move #1 shipped (food foundation + FFM floor)
- [x] Move #1.5 shipped (barcode + OCR)
- [x] Move #2 shipped (ED-pattern detection)
- [x] Move #3 shipped (upward gate compression + telemetry slice)
- [x] Move #4 shipped (differential paywall)
- [ ] Move #5 partial (cascade + RTDN webhook need founder deploy + Play Console SKUs + sandbox test)
- [x] 1370/1370 tests green
- [x] All 12 locked simulator scenarios shipped
- [x] Sentry scrub audit (110 tests)
- [x] Article 9 consent UI + audit trail (grant + withdraw)
- [x] Account deletion audit (account_deletions_log)
- [x] Telemetry catalogue comprehensive (36 events allow-listed, gaps documented)
- [x] User-action breadcrumbs in Sentry trail (22 audit() call sites) — when a bug surfaces in Sentry, the trail of what the user did to reach it is attached to the issue
- [x] Skeleton loaders covering 8 screens (HomeScreen, WorkoutHistory, AthleteHub, CoachReview, WeeklyCheckIn, CoachHeldHistory, BlockReflection, CoachOutput)
- [x] Privacy management UI in Settings (consent withdrawal via record_health_consent(false))
- [x] Web favicon + privacy page auto-deployed to GitHub Pages
- [~] Maestro E2E framework + 12 critical-path flows — **Phase 1 shipped:** harness (`.maestro/config.yaml`), 12 spec'd flow scaffolds + smoke launch check in `e2e/`, structural linter wired into Jest, CI workflow at `.github/workflows/maestro-e2e.yml` with status writeback to `.ci-status/maestro-latest.md`. Smoke bundle not yet green on the CI emulator — iteration ongoing.
- [ ] Move #5 partial (cascade + RTDN webhook need founder deploy + Play Console SKUs + sandbox test)
- [ ] k6 load tests (1000-user sync, 100-user purchase, 10k weekly_coach)
- [ ] Privacy policy at custom volyume.app/privacy (DNS CNAME only — GH Pages already serves it)
- [ ] Android upload keystore generated + Play App Signing configured
- [ ] play-billing-rtdn Edge Function deployed + Pub/Sub configured
- [ ] Sandbox purchase end-to-end test passed
- [ ] CI build with keystore verified release-signed AAB

---

## 16. Phase B prep (post-launch, do not start until Phase A is fully green)

- Marketing site at volyume.app (waitlist signup form, pricing page "Coming soon")
- Waitlist email template with one-time invite codes (200-500/week pace per `MASTER_VISION_AND_PLAN.md` Decision 2.1)
- Welcome push template for waitlist invitees
- Incident response runbook (`docs/INCIDENT_RESPONSE_RUNBOOK.md` to be written)
- Support workflow (support@volyume.app forwarded, reply templates)
- Coach marketing landing page at volyume.app/coach ("phase 2 coming soon")
- Version bump 1.1.0 → 1.2.0
- Publish first wave of 200 invite emails
- Play store listing finalised (screenshots, privacy manifest, age rating per `docs/PLAY_STORE_LISTING.md`)

---

## 17. Explicitly out of scope for v1

Hard exclusions per `BACKLOG.md` + founder overrides:
- iOS / Apple Developer / App Store Connect / iOS SKUs (Android-only Phase B is locked)
- Cloud infrastructure migration (Azure/AWS) — Override 1
- Peak Week module — Override 3
- Complete tier + 28-day Complete-to-Pro cascade — Override 3
- RevenueCat — Override 2
- Photo cloud sync (photos stay on-device forever)
- Recipe URL importer (v1.1)
- Body composition deep charts (v1.1)
- Share-pack PDF (v1.1)
- Refeed automation across any cut (v1.1)
- Coach surface (phase 2)
- Email notifications client-facing (v1.1)
- AI photo logging (never)
- Apple Watch app (never at v1)
- Web app for end users (never at v1)
- Social feed / community (hard product exclusion)
- Gamification (carve-out: single week-streak chip on HomeScreen; don't expand)
- Wearable integration beyond morning weight + step count one-way reads

---

## 18. Structural drift (acknowledged, non-blocking)

| Locked spec | Reality | Why kept |
|---|---|---|
| `src/lib/sync/` 7-file directory | Single `src/lib/sync.js` (~85KB) | Refactor risk vs reward unfavourable mid-Phase-A; blocks `sync_conflict_resolved` telemetry only |
| `src/lib/notifications/` 5-file directory | Scattered code | Blocks `notification_*` telemetry; structured pass needed before Phase A exit |
| `src/lib/telemetry/` 4-file directory | Single `src/lib/engineTelemetry.js` | Functional; allow-list + push live there. Refactor low-value. |
| `src/screens/onboarding/` directory | Flat in `src/screens/` | Cosmetic |
| `src/components/food/` 9 components | Only MacroRings + FoodDetailSheet | Most inline in screens; works fine, harder to reuse |
| `src/lib/links.js` single URL source | Doesn't exist | URLs inline; multi-file edit if URL changes |

Each is a tracked Phase A code work item per `CURRENT_STATUS.md` section 7.

---

## 19. Locked docs index (read these before touching their surface)

| Doc | Surface |
|---|---|
| `BUDGET_POSTURE_LOCKED.md` | Spend ceiling, infra costs, monetisation timing |
| `COACHING_VOICE_SYNTHESIS_LOCKED.md` | Coach copy rules (also enforced by snapshot tests) |
| `COMPLETE_TIER_SCOPE_LOCKED.md` | Tier scope (re-locked 2026-05-25 with 2-tier override preamble) |
| `DATABASE_SCHEMA_LOCKED.md` | Cloud schema reference |
| `FOOD_DATA_STRATEGY_LOCKED.md` | OFF + CoFID + USDA + custom source taxonomy |
| `GROWTH_STRATEGY_SYNTHESIS_LOCKED.md` | Phase B waitlist + marketing |
| `IDENTITY_AND_OWNERSHIP_LOCKED.md` | user_id invariants, sign-out wipe, anonymous-to-account migration |
| `MASTER_VISION_AND_PLAN.md` | Top-level product vision |
| `NOTIFICATIONS_LOCKED.md` | Notification categories + quiet hours |
| `ONBOARDING_SEQUENCE_LOCKED.md` | 11-screen onboarding order |
| `PRIVACY_CONSENT_LOCKED.md` | UK GDPR Article 9 + FTC HBNR text + scrub rules |
| `PRODUCTION_READINESS_LOCKED.md` | Phase A exit criteria source |
| `RELEASE_PLAN_LOCKED.md` | Phase A / B / C / D plan |
| `SUBSCRIPTION_AND_PAYMENT_LOCKED.md` | Cascade + SKUs (re-locked 2026-05-25 for Play Billing direct + 21-day single trial + 3 SKUs) |
| `SYNC_ARCHITECTURE_LOCKED.md` | Spec'd sync module split |
| `TELEMETRY_DASHBOARDS_LOCKED.md` | Event catalogue + panels + alerts |
| `TESTING_STRATEGY_LOCKED.md` | Simulator scenarios + Maestro + k6 |
| `UI_FLOWS_LOCKED.md` | Per-screen flow specs |

**Move plans** (historical, kept for gap-audit reference):
- `MOVE_0_CODE_CORRECTIONS.md`
- `MOVE_0_5_VOICE_RETROFIT.md`
- `MOVE_1_FOOD_FOUNDATION_AND_FFM.md`
- `MOVE_1_5_BARCODE_AND_OCR.md`
- `MOVE_2_ED_PATTERN_DETECTION.md`
- `MOVE_3_UPWARD_GATE_COMPRESSION.md`
- `MOVE_4_DIFFERENTIAL_PAYWALL.md`
- `MOVE_5_TIER_INFRASTRUCTURE.md`

---

## 20. This session's commit log (chronological, most recent first)

| Commit | Summary |
|---|---|
| `7e0959e` | feat(privacy): account_deletions_log table + Edge Function audit trail (Panel 8) |
| `2bdccd0` | docs(status): refresh CURRENT_STATUS.md after the comprehensive telemetry pass |
| `e1446c2` | feat(telemetry): wire payments + cascade catalogue (purchase_*, cascade_state_transition, subscription_cancelled) |
| `1aac464` | feat(telemetry): wire app_cold_start, app_foregrounded/backgrounded, sync_run |
| `1dd5fd9` | feat(telemetry): wire account_created + custom_food_created funnel events |
| `552f87f` | feat(telemetry): wire sign_in, sign_out, article9_consent_recorded events |
| `a955f33` | fix(seed,telemetry): serialise OFF/CoFID transactions + restore engine_telemetry payload_json column |
| `1e9ae63` | fix(android): patch app/build.gradle with missingDimensionStrategy for react-native-iap |
| `9f79f51` | feat(simulator): complete all 12 locked scenarios (stalled_lift, bulk_aggressive, plateau_then_break, returning_user) |
| `e5e6df7` | feat(simulator): add 4 more locked scenarios (aggressive_cut_supervised, noisy_logger, bulk_gentle, recomp_steady) |
| `ba072e0` | feat(payments): wire react-native-iap as real Play Billing provider + Edge Function for RTDN webhook |
| `6f1e089` | feat(tiers): consolidate to 2-tier model (Free, Pro) + 21-day trial — founder override 2026-05-25 |
| `32989ec` | feat(simulator): engine simulator framework + 4 locked scenarios (straight_cut, aggressive_cut_unsupervised, red_s_trajectory, rapid_loss_correction) |
| `c352ed0` | feat(privacy): rewrite privacy.html to PRIVACY_CONSENT_LOCKED.md 12-section spec + verbatim FTC HBNR language |
| `9a0de70` | feat(observability): dedicated sentryScrub module + schema audit (PRIVACY_CONSENT_LOCKED L282) |
| `48f2e3e` | docs(status): record item 12 partial ship (sync indicator + multi-select deferred) |
| `ac37b41` | feat(ui): diary swipe-delete + copy-yesterday FAB + Credits screen (license attribution) |
| `d03b93e` | fix(scan): auto-request camera permission on 'not-determined' so first-launch users get the OS prompt |
| `3f2fc4d` | feat(paywall): Move #4 differential paywall — detector + badge + screen + telemetry |
| `8fbb144` | feat(payments): swap RevenueCat → Google Play Billing direct (founder override) |
| `d44bc5d` | feat(paywall): differential paywall trigger detection + 6 locked copy variants |
| `c109f44` | fix(diary): resolve actual food name + brand on each entry, not hardcoded 'Food' |
| `09963c4` | feat(cascade-ui): CascadeGateScreen + SubscriptionScreen + TierComparisonStrip + Settings row |
| `3539dc4` | feat(cascade): pg_cron workers (migration 031) + Article 9 consent fires start_cascade |

---

## 21. Next chunks waiting (in suggested execution order)

These are the Phase A code-work items still open. Pick one when restarting work.

**Shipped this session (2026-05-25 late evening):**
1. ~~**Notifications module split**~~ Shipped — section 4.10.
2. ~~**Maestro E2E framework Phase 1**~~ Shipped — section 21.0 follow-up below.
3. ~~**Privacy management section in SettingsScreen**~~ Shipped — Settings → Privacy section with consent withdrawal + migration 041.
4. ~~**audit() helper + breadcrumbs**~~ Shipped — 22 call sites across workout/food/auth/privacy/payments.
5. ~~**Skeleton loaders**~~ Shipped to 8 screens.
6. ~~**Web favicon + privacy hosting**~~ Shipped — auto-deploys to GitHub Pages.
7. ~~**Cyber-security review**~~ Ran via `/security-review`; no findings.

**Open (in priority order for tomorrow):**

1. **Sync module split (~3-4 days, HIGH RISK).** `src/lib/sync.js`
   is 1924 lines, 13 exports across 13 topic sections (helpers,
   profile, exercises, single workout, body metrics, debounced
   trigger, morning weight / check-in / body metric writers, bulk
   upload, per-table push, push for previously-local-only tables,
   food domain push/pull, AsyncStorage prefs, pull from cloud,
   per-table pull). Spec target per `SYNC_ARCHITECTURE_LOCKED.md`:
   `src/lib/sync/` directory with `index`, `registry`, `runner`,
   `queue`, `conflict`, `transport`, `telemetry`. Unblocks
   `sync_conflict_resolved` telemetry. Recommend phased approach:
   one commit per topic-area-extracted-into-registry-entry, run
   tests at every step, never break the public API. **Worth
   getting a Codex second-opinion on the design before diving in.**
2. **Maestro CI smoke green** (~unknown, iteration). Last failure
   was JetifyTransform OOM despite gradle heap bumps. Pick up
   from latest `.ci-status/maestro-latest.md` and iterate. Pull-
   rebase + retry pattern is in place. Run #9 was pending at end
   of session.
3. **Maestro E2E Phase 2: tighten selectors** (~half day per
   round). Once smoke runs end-to-end on the emulator, fold any
   selector misses back into the YAML and promote the four
   `blocked` flows once the test-hook deep links land.
4. **Maestro test-hook deep links** (~half day). Add a
   `volyume://test/...` handler behind `__DEV__` so the four
   blocked flows (barcode happy-path, barcode-miss-OCR, cascade
   day-14 pay, subscription-restore) can drive deterministic
   fixtures.
5. **k6 load tests.** Server load testing per
   `TESTING_STRATEGY_LOCKED.md` lines 183-193. Standalone,
   doesn't touch app code.
6. **Maestro CI flip to `pull_request` gate.** After smoke is
   green for at least 3 consecutive runs, change the workflow's
   `on:` block from `push` to `pull_request` so merges are gated.

---

## 22. Things that have caught past Claude sessions out

- **Branch confusion.** Earlier sessions ran on `claude/volyume-food-logging-app-B9JZv`. Override 5 moved everything to `main`. Latest session prompts may name a fresh `claude/*` branch — that's the default scaffold; verify with founder if it's a hard requirement before pushing anywhere other than `main`.
- **engine_telemetry column name is `payload_json`, NOT `payload`.** Migrations 029 + 032 had this typo. If you're writing a new telemetry-allowlist migration, use `payload_json`.
- **Engine simulator EWMA + cutoff math.** The `getEwmaSevenDaysAgo` cutoff is relative to `Date.now()`, so simulator timestamps must be re-anchored on each engine call. `runner.js` does this; if you write new scenarios, use the existing runner.
- **Phase config has no plain `'cut'` value.** Use `mild_cut` / `mod_cut` / `agg_cut`. Same for bulk.
- **Anonymous-to-account migration runs ONCE per account.** Per `IDENTITY_AND_OWNERSHIP_LOCKED.md`. Only in `LoginScreen.handleEmailAuth` signup branch. Sign-out wipes local SQLite so cross-user sign-in finds local already empty.
- **`UPDATE ... SET user_id = ?` is BANNED EVERYWHERE except the one legitimate `migrateLocalUserId` call.** CI grep enforces this.
- **`expo-application` static-import breaks the screen-mount test.** Lazy-require inside the function instead. Article9ConsentScreen gets away with the static import because it's not in the test sweep list; SettingsScreen IS in the sweep list.
- **The bundled `.dat` snapshots are Metro assets, not JS modules.** `metro.config.js` adds 'dat' to `assetExts`. Don't `import` them; use `Asset.fromModule(require(...))`.
- **`react-native-iap` needs a Gradle `missingDimensionStrategy` patch.** Already in `build-android.yml`; if a future build fails on `playRelease` variant matching, look there first.
- **The Closed Testing build is FROZEN.** Don't propose / schedule / trigger a new closed-testing release until the WHOLE project is built out.
- **CURRENT_STATUS.md is rewritten end-to-end on every material change.** Not appended. If you find yourself adding a "what's new" section, you're doing it wrong.
- **The dashboard tells the founder when migrations are missing.** Don't write code that depends on a pending migration without flagging it; the founder applies them between asks.

---

## 23. If you're a new session reading this cold

You're picking up a project that ships chunks per founder consent and avoids surprise scope. Read in this order:

1. `CLAUDE.md` (5 min) — voice, branch, identity rules
2. `docs/CURRENT_STATUS.md` (10 min) — canonical "where are we"
3. This doc (30 min) — everything else
4. The specific LOCKED doc(s) for the surface you're about to touch
5. The relevant `MOVE_X_*.md` plan if you're working on a Move

Then start work. Ship in small commits, fix tests before pushing, push to `main`, and let the founder apply migrations between asks. When in doubt about scope, ask one focused question. When the founder says "proceed" / "yes" / "keep going", that's permission to ship the next chunk you flagged.

Last thing: don't be lazy about reading docs. The founder will notice and will say so.
