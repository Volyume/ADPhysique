> ⚠ STATUS (2026-07-10): SUPERSEDED/CLOSED - do not build from this document. May 2026 deep-reference handoff (an older stale note already sits below). Current work runs from docs/ux-world-class-audit-2026-07-09/_HANDOVER-AND-RESUME.md and docs/TASKBOARD.md. Pre-campaign items require the D37 triage rule before any consideration.

# Volyume: session handoff (deep reference)

> ## ⚠ STALE (2026-05-27 snapshot) — banner added 2026-06-26
> Predates the entire June 2026 sprint (food domain, Ultimate-Audit Tier-1/2/3
> builds, cardio/Health import, partners, recap/share cards, native IAP,
> SQLCipher). For the current state read the root reference docs reconciled
> against `main` on 2026-06-26: `INFRASTRUCTURE.md`, `ARCHITECTURE.md`,
> `APPMAP.md`, `VOLYUME_DEEPMAP.md`, and
> `docs/ultimate-audit-2026-06-13/_AUDIT-STATUS-AND-RESUME.md`. Treat everything
> below as a historical record.

Verified against code in `src/` and `supabase/` on 2026-05-27. This is the deep reference for a new session reading in cold. For day-to-day status read `docs/CURRENT_STATUS.md` first; for evidence at the file:line level read `docs/CODE_TRUTH_SURVEY.md`.

> **Stale-snapshot note (2026-05-28):** this doc predates the 2026-05-28 sessions (coach confirm-then-apply rows 3-7, then UI surfaces rows 8/15/26/27/28 + the Frequents pipeline). Anything below described as "planned" or "not built" for those rows is now shipped. `docs/CURRENT_STATUS.md` § 0.A and § 0.B are authoritative; trust them over this doc where they disagree.

**Doc hierarchy.** When new sessions read in:

1. `CLAUDE.md` (project root): voice rules, founder overrides, branch policy, identity contract, the 10 permanent engineering rules.
2. `docs/CURRENT_STATUS.md`: canonical state of what's shipped, what's pending, in execution order.
3. `docs/CODE_TRUTH_SURVEY.md`: code-verified walk of all 188 files in `src/`. Source of truth at the line level.
4. **This doc**: every artefact, every test suite name, every migration, every Edge Function, every gotcha. Repo layout + tech stack + Phase A/B + cold-start.
5. Locked specs (`*_LOCKED.md`): design decisions that cannot be overridden without founder approval.

When this doc disagrees with `CURRENT_STATUS.md`, `CURRENT_STATUS.md` wins. When `CURRENT_STATUS.md` disagrees with a LOCKED spec, the LOCKED spec wins. When the founder overrides any of them, the founder wins.

---

## 0. Founder context (90 seconds)

- **Project:** Volyume. UK Android-first (iOS deferred, not locked never) coaching app for resistance training + nutrition.
- **Founder:** Allan Douglas, `allansdouglas1983@gmail.com`. UK-based. Low tolerance for guesses presented as facts. Will call you out hard for skimming docs, hand-waving, or "ill-advised suggestions". Always verify against code or database before claiming something works.
- **Tone he wants:** direct, factual, no AI tells, British spelling, no em dashes. See `CLAUDE.md` § "Voice and copy" for the full rules. They apply to commit messages and code comments too.
- **What he is doing right now:** sideloading debug APKs to his Android phone and testing manually. He pastes device debug logs when bugs surface. He is NOT touching the Closed Testing track, that build is frozen until Phase A exit.
- **Rhythm:** he says "proceed" / "yes" / "keep going" between shipping chunks. He applies SQL migrations directly in Supabase Dashboard. He lets Claude pick the next chunk if it's tractable; ask only at genuine forks.

---

## 1. What this project is

Volyume is a UK Android coaching app for resistance training and nutrition. The coach engine is called **Precision Coaching** in user-facing copy (always a proper noun). Currently in Play Store closed testing as v1.1.0 (versionCode 4); that build is frozen until the whole project is built out per the locked release policy.

2-tier model (Free + Pro), 21-day Pro trial, founder-overridden 2026-05-25 from the original 3-tier ladder (Free / Pro / Complete). Peak Week module removed entirely.

---

## 2. Founder overrides locked 2026-05-25

These supersede LOCKED specs they touch.

### Override 1: cloud infrastructure migration deferred

Supabase + Sentry stack stays for v1 launch. Revisit only if telemetry proves Supabase's tier is genuinely insufficient or compliance requirement appears.

### Override 2: Google Play Billing direct, not RevenueCat

`react-native-iap` ^12.16.1 as the real provider. `playBilling.js` lazy-loads it and injects via `tryWireRealProvider()` from `App.js`. `RootNavigator` calls `playBilling.initialise({ appUserID })` after sign-in. RTDN webhook lands in `supabase/functions/play-billing-rtdn/index.ts` (not yet deployed).

### Override 3: 2-tier model

Free + Pro only. Complete tier removed. Peak Week module removed. Single 21-day Pro trial.

Pricing windows:
- Open beta: £0.99/mo
- Founders (post open beta): £1.99/mo
- Standard (post founders): £3.99/mo

Implementation evidence:
- `proGate.js:70` FEATURE_MAP collapsed to `{free, pro}` (no `complete` key, no `peak_week_module` feature).
- `payments/catalogue.js:18` `TIERS = Object.freeze(['pro'])` (no `complete` SKU).
- `payments/cascade.js:146` `skipToPro()` stubbed to return error.
- `supabase/migrate_033_two_tier_consolidation.sql` applied.

### Override 4: Closed Testing build stays frozen

"The current Play Console closed testing build stays in place until the whole project is built out, not half done. Do NOT propose, schedule, or trigger a new closed-testing release." Cloud migrations DO get applied to support continued building; the old app must remain functional against the new schema (sync errors in log acceptable; total break is not).

### Override 5: main is canonical and the GitHub default branch

Push direct to `main`. Fetch + rebase before push. Never `--no-verify`. Never skip hooks. Never `git reset --hard` without asking. Never force-push to `main`. If the harness injects a "develop on branch X" directive and X is not `main`, surface that to the founder verbatim and wait for explicit confirmation.

### Beta tier override

`proGate.js:22` sets `PRO_BETA_ACTIVE = true`. Every signed-in user receives `tier: 'pro'` automatically during closed testing. Legacy `complete_*` trial states map to `pro` for migration-030 compat. This explains why `LoginScreen.js:162` and `ProUpgradeScreen.js:43` default new accounts to Pro.

---

## 3. Architecture overview

### Tech stack

| Layer | Choice |
|---|---|
| Mobile | React Native 0.74.5 + Expo SDK 51 |
| State | Zustand 4.5.2 (`src/store/useAppStore.js`) |
| Local storage | expo-sqlite (`src/lib/database.js`) + AsyncStorage for flags |
| Cloud | Supabase (Postgres + Auth + RLS + Edge Functions + pg_cron) |
| Auth | Email + Google + Apple + Microsoft OAuth via Supabase auth |
| Payments | Google Play Billing direct via `react-native-iap` 12.16.1 |
| Errors | Sentry React Native 5.24.3 |
| Camera | react-native-vision-camera 4.7.3 |
| OCR | @react-native-ml-kit/text-recognition 1.5.2 (on-device) |
| Notifications | expo-notifications 0.28.x (local) |
| Charts | react-native-gifted-charts + victory-native |
| Health bridge | HealthKit (iOS) + Health Connect (Android) via `src/lib/health.js` |

### Repo layout (top-level)

```
ADPhysique/
├── .github/workflows/      CI: build-android, main-ci, maestro-e2e, deploy-pages
├── android/                Native Android shell
├── ios/                    Native iOS shell (kept buildable, not shipped)
├── assets/                 Bundled images + food snapshots
├── docs/                   Living docs (CURRENT_STATUS, BACKLOG, this, locked specs)
├── e2e/                    Maestro flow definitions
├── maestro/                Maestro config + emulator scripts
├── public/                 GitHub Pages content (privacy policy, app map, etc.)
├── scripts/                Build + seed helpers
├── src/                    App source (see below)
├── supabase/               Migrations + Edge Functions + audit SQL
└── tests/simulator/        Engine scenario simulator (12 locked scenarios)
```

### `src/` layout

```
src/
├── components/             27 top-level + 9 food/ subfolder = 36 components
│   └── food/               EmptyDiary, EntryRow, FoodDetailSheet, FoodRow,
│                           HeldDecisionCard, MacroRings, MealSection,
│                           ServingPicker, SourceChip
├── lib/                    43 top-level lib files + 5 subfolders (51 more files)
│   ├── food/               db, csvExport, libraryDelta, normalisers,
│   │                       ocr, ocrParser, sanityChecks, seed,
│   │                       sources/{liveOff, localCache, usda}, waterfall, writeback
│   ├── notifications/      activeWorkout, categories, channels, handler,
│   │                       index, listeners, permissions, preferences,
│   │                       quietHours, scheduler, telemetry, trainingReminders
│   ├── observability/      sentryScrub
│   ├── payments/           cascade, catalogue, index, playBilling, restore
│   ├── sync/               conflict, index, queue, registry, runner,
│   │                       telemetry, transport, tables/{10 per-table files}
│   └── telemetry/          events, index, sentryBridge, transport
├── navigation/             RootNavigator
├── screens/                58 screens (all flat, not in subfolders)
├── store/                  useAppStore (Zustand)
└── styles/                 theme tokens
```

Survey at `docs/CODE_TRUTH_SURVEY.md` walks every one of these 188 files.

---

## 4. Shipped functionality by area

Verified against `src/screens/`, `src/lib/`, `src/components/`, and `src/navigation/RootNavigator.js`.

### 4.1 Authentication

Per `IDENTITY_AND_OWNERSHIP_LOCKED.md`:

- **No anonymous mode.** Every user has a real account.
- Email signup / sign-in via Supabase auth (`signUpWithEmail`, `signInWithEmail`).
- Email confirmation flow ("Check your email").
- Password reset (`resetPassword`).
- Google OAuth (`signInWithGoogle`).
- Apple OAuth (`signInWithApple`).
- Microsoft OAuth wired but UI surface to be confirmed (`signInWithMicrosoft` exported from `supabase.js:171`).
- **Sign-out wipes local SQLite + AsyncStorage + SecureStore tokens** via `clearAuthStateForSignOut`.
- Cross-user wipe: if a different supabase account signed in previously, wipe their data before pulling the new account's data (`LoginScreen.js:126`).
- Sentry user binding via `setSentryUser(session?.user)`.

**Telemetry:** `sign_in`, `sign_out`, `account_created`.

### 4.2 Onboarding

11 screens, all flat under `src/screens/` (not in the spec'd `onboarding/` subdirectory, accepted drift):

`WelcomeScreen`, `OnboardingScreen`, `LoginScreen`, `FirstRunScreen`, `ProOnboardingScreen`, `ProGoalSetupScreen`, `ProSetupCompleteScreen`, `GoalChangeSummaryScreen`, `Article9ConsentScreen`, `GoalLockConsentScreen`, `WellbeingCheckScreen`.

**Telemetry wired at consent:** `article9_consent_recorded`.

### 4.3 Workouts / training

- Plan library + custom builder: `PlansScreen`, `PlanLibraryScreen`, `PlanDetailScreen`, `BuildWorkoutScreen`, `ManualBuilderScreen`, `MesocycleBuilderScreen`.
- Routines + exercises (CRUD via `database.js`).
- Active workout: `ActiveWorkoutScreen` with rest timer, live notification, PR celebration.
- Workout history + summary: `WorkoutHistoryScreen`, `WorkoutSummaryScreen`.
- Exercise library + detail: `ExerciseLibraryScreen`, `ExerciseDetailScreen`.
- PR wall: `PRWallScreen`.
- Volume heatmap: `VolumeHeatmapScreen`.
- Year of Lifts unlock (one-shot at 365-day mark): `YearOfLiftsScreen`.
- Strength standards: `strengthStandards.js` (with parallel `algorithms.getStrengthStandard`, drift to resolve).
- Plan auto-generation + swap engine: `planAutoGen.js`, `swapEngine.js`.
- Travel mode: `lib/travelMode.js` + `BuildWorkoutScreen` integration.

### 4.4 Engine / Precision Coaching

Per `MASTER_VISION_AND_PLAN.md` + `COACHING_VOICE_SYNTHESIS_LOCKED.md`:

- `weeklyCoach.js` (983 lines): the weekly check-in → coach output. Includes FFM-aware safety floor (Move #1), ED-pattern detector integration (Move #2), rapid-loss upward gate compression (Move #3), differential paywall trigger emission (Move #4), voice-compliant copy (Move #0.5).
- `nutritionEngine.js` (835 lines): adaptive TDEE + protein floor + macro split. Note: `getPlanNutritionContext()` (lines 671-834) builds a refeed recommendation object but is **never called from any screen**. Dead engine code today.
- `algorithms.js` (1,132 lines): volume landmarks, 1RM, autoreg matrix, deload detection, PR detection, plateau detection, lagging-muscle detection, `runAdaptiveEngine` (writes adaptation events from `WorkoutSummaryScreen`).
- `insightsEngine.js`: insights tab content.
- `phaseEngine.js`: comp-phase awareness. **No consumers found in any surveyed file.** Possibly dead code.
- `mesocycle.js`: per-session autoreg + time-crunch + deload prediction.
- `edPatternDetector.js`: 4-signal multi-signal detector (Move #2).
- `differentialPaywall.js`: pure detector for Move #4.
- `recoveryEMA.js`: EWMA on weight trend (alpha 0.1).
- `coachingGoals.js`: goal taxonomy + training-note generator (`getTrainingNote` consumed by `weeklyCoach.js:471`).
- `blockAdvisor.js`: block-end recommendation (consumed by `PlansScreen`).
- `dailyNarrative.js`: home hero one-line story (consumed by `HomeScreen`).

**Coach surfaces:** `CoachOutputScreen` (weekly card, calorie auto-apply at line 680), `CoachReviewScreen` (pre-workout volume status), `CoachHeldHistoryScreen`.

**What the coach auto-applies vs what's advisory:** see `CURRENT_STATUS.md § 7`. Short version: only calorie target changes are written to DB. Steps, cardio, training signal, deload, diet break are advisory text only.

**Voice guards:** `weeklyCoach.voice.snapshot.test.js` (5 snapshots), `whyThisTemplates.snapshot.test.js` (14 snapshots).

**Telemetry:** `weekly_coach_run`, `ffm_floor_hold_fired`, `ed_pattern_flag_fired`, `ed_pattern_flag_cleared`, `rapid_loss_compression_triggered`, `goal_lock_set`, `goal_lock_cleared`.

### 4.5 Food / Diary

- `DiaryScreen`: meal sections, MacroRings, swipe-delete, Copy-yesterday FAB, water tracker, date pager.
- `FoodSearchScreen`: debounced search across local cache + OFF + USDA (3-source waterfall), source chips, long-press fav/dislike cycle.
- `ScanBarcodeScreen`: vision-camera barcode scan + torch + freeze-on-read + auto-permission-request.
- `ScanLabelScreen`: vision-camera image capture → MLKit OCR → parsed macros → AddCustomFood.
- `AddCustomFoodScreen`: manual entry + sanity check + custom_foods insert.
- `MyRecipesScreen` + `RecipeBuilderScreen`: shipped 2026-05-27. Recipe CRUD + ingredient picker.
- `FoodInsightsScreen`: 7-day macro chart + CSV export.
- `NutritionTargetsScreen`: daily macro target editor (writes via `calculateNutritionTargets`).
- `NutritionEducationScreen`: static content.
- `CreditsScreen`: OFF / CoFID / USDA licence attribution.

**Data layer (`src/lib/food/`, 13 files):**
- `db.js` (816 lines, 40 exports): foods + custom_foods + food_entries + saved_meals + recipes + favourites + water CRUD. Includes `setFoodPreference`, `cycleFoodPreference`, `getFoodPreference`, `getDislikes`, `createRecipe`, `setRecipeIngredients`, `computeRecipeMacros`.
- `waterfall.js`: local cache → live OFF → USDA orchestrator with first-hit-wins + cache promotion.
- `sources/localCache.js`, `sources/liveOff.js`, `sources/usda.js`.
- `seed.js`: bundled OFF + CoFID snapshot importer (transaction-mutex serialised after the device-log bug).
- `libraryDelta.js`: cloud delta-pull RPC (migration 028).
- `ocr.js` + `ocrParser.js` + `writeback.js`: OFF community-DB write-back queue (consent gated).
- `sanityChecks.js`: macro plausibility gate.
- `csvExport.js`: diary CSV builder.
- `normalisers/usdaToFood.js`: USDA response shape → internal.

**Bundled snapshots:**
- `assets/seed/off_uk_snapshot.dat` (~25k OFF UK products, regenerated weekly by GitHub Actions).
- `assets/seed/cofid_uk.dat` (~3k CoFID UK generic foods, Open Government Licence v3.0).

**food_dislikes is NOT a separate table.** Fav + dislike both live on `food_favourites.kind` (column added by migration 048, pending founder apply).

**Telemetry:** `food_search_attempt`, `food_lookup_barcode`, `food_logged`, `custom_food_created`, `ocr_writeback_attempted`.

### 4.6 Cascade / Payments / Tiers

Per `SUBSCRIPTION_AND_PAYMENT_LOCKED.md` (re-locked 2026-05-25) + `COMPLETE_TIER_SCOPE_LOCKED.md` (re-locked 2026-05-25 with 2-tier consolidation preamble):

- 2-tier model: Free, Pro.
- 21-day Pro trial starts at Article 9 consent (cascade trigger in `Article9ConsentScreen.js:90`).
- Single Day-21 gate (`CascadeGateScreen`, with day14/day28 alias for back-compat).
- 3 SKUs: `pro_open_beta_monthly` £0.99, `pro_founders_monthly` £1.99, `pro_standard_monthly` £3.99.

**Client modules (`src/lib/payments/`, 5 files):**
- `index.js`: re-exports.
- `playBilling.js` (339 lines): provider abstraction with `tryWireRealProvider` + `injectProvider` + `_resetForTests` + mock fallback. Real `react-native-iap` provider injected at boot from `App.js`. Purchase listener acknowledges via `finishTransaction`. Fires `purchase_initiated`, `purchase_completed`, `purchase_failed`, `restore_purchases_attempted`.
- `cascade.js` (253 lines): state machine wrappers around `start_cascade` and `upgrade_tier` RPCs. 7 transitions (start, payAt, skipToFree, skipToPro, autoDowngrade, cancel, graceLapsed, refunded). Telemetry fan-out via `_trackTransition`.
- `restore.js` (67 lines): `restorePurchases` flow + `payAt` reconciliation.
- `catalogue.js` (84 lines): `PRICING_WINDOWS = ['open_beta', 'founders', 'standard']`, `TIERS = ['pro']` (2-tier confirmed at source), `skuFor`, `priceTextFor`, `skuById`, `allSkuIds`.

**Server side (Supabase):**
- `migrate_030_tier_infrastructure.sql`: `tier_history`, `users_profile.trial_state`, `upgrade_tier` RPC, `start_cascade` RPC, `pricing_config`, `current_pricing_window`.
- `migrate_031_cascade_workers.sql`: `cascade_advance_due_users()` + pg_cron schedule every 15 min.
- `migrate_033_two_tier_consolidation.sql`: RPC updates for 2-tier collapse.
- `migrate_042_upgrade_tier_for_user.sql`: service-role-only RPC for the RTDN webhook.
- `supabase/functions/play-billing-rtdn/index.ts`: Pub/Sub push receiver. Verifies subscription via Google Play Developer API JWT-signed service account. Deployment pending.

**UI:** `CascadeGateScreen`, `SubscriptionScreen`, `TierComparisonStrip`, `PaywallScreen`, `DifferentialBadge`, `ProUpgradeScreen`, `SubscriptionPolicyScreen`.

**proGate (`src/lib/proGate.js`):**
- `PRO_BETA_ACTIVE = true` → every signed-in user gets `pro` during closed testing.
- `isPaidTier(profile)`, `hasFeature(profile, feature)`, `hasGoalUnlock(profile, feature)`.
- `FEATURE_MAP = { free, pro }` (no `complete`).
- **3 v1.1 features in PRO_FEATURES not actually shipped:** `refeed_automated_any_cut`, `body_composition_deep`, `share_pack_pdf` (comment line 61 acknowledges).

**Telemetry:** `cascade_started`, `cascade_advanced`, `cascade_skipped_ahead`, `cascade_state_transition`, `paid_converted`, `churn_at_gate`, `subscription_cancelled`, `paywall_shown`, `paywall_tapped_cta`, `purchase_initiated`, `purchase_completed`, `purchase_failed`, `restore_purchases_attempted`, `tier_changed`.

### 4.7 Privacy / Consent

Per `PRIVACY_CONSENT_LOCKED.md`:

- `Article9ConsentScreen`: UK GDPR Article 9 explicit consent for health data.
- `record_health_consent` RPC writes to `users_profile.health_data_consent` AND appends to `consent_log` audit table (`migrate_019_health_consent.sql`).
- Cascade starts at Article 9 consent.
- `public/privacy/index.html`: 12-section privacy policy. Auto-deployed via `deploy-pages.yml`. **Pending founder DNS configuration** for `volyume.app` to resolve at `volyume.app/privacy`.
- `src/lib/observability/sentryScrub.js`: PII scrubber. 7 exports: `SENSITIVE_KEY_PATTERNS`, `SENSITIVE_VALUE_SUBSTRINGS`, `isSensitiveKey`, `scrubValue`, `scrubObject`, `scrubEvent`, `scrubBreadcrumb`.
- Withdraw-consent flow in `SettingsScreen.js:227+`. Calls `record_health_consent(false)` → appends to `consent_log` → flips local mirror → fires `article9_consent_withdrawn` (migration 041).
- Account deletion flow (`SettingsScreen.performDeleteAccount` → Edge Function `delete-account`):
  1. Edge Function verifies user via JWT.
  2. Calls `delete_user_data` RPC (RLS-enforced user-data wipe).
  3. Calls `record_account_deletion_started` (writes to non-cascading `account_deletions_log`).
  4. Calls `auth.admin.deleteUser` (service role).
  5. Calls `record_account_deletion_completed` (sets `completed_at`).
- `account_deletions_log` table (migration 039) has no FK to `auth.users`, so the audit row survives the cascade delete. Stores `user_email` for FTC HBNR compliance.

**Telemetry:** `article9_consent_recorded`, `article9_consent_withdrawn`. The `account_deleted` event is deferred client-side (`engine_telemetry.user_id` ON DELETE CASCADE); the survivor is `account_deletions_log`.

### 4.8 Telemetry

Per `TELEMETRY_DASHBOARDS_LOCKED.md`:

**Folded layout (post 2026-05-28, commit `099738f`):**
- `src/lib/telemetry/transport.js`: owns persist + push. Validates against `ALLOWED_EVENTS`, writes to local SQLite `engine_telemetry`, schedules a debounced push to the `record_engine_telemetry` RPC. Pure logic, no other module behind it.
- `src/lib/telemetry/index.js`: public API. Adds Sentry breadcrumb mirror, then delegates to transport.
- `src/lib/engineTelemetry.js`: thin re-export shim (`track` → `postEvent`, `flushPendingTelemetry` → `flushPending`). Existing callers keep working unchanged; new code should import from `lib/telemetry`.

**Canonical event list at `lib/telemetry/events.js`:**
- 42 entries total
- 4 explicitly deferred with `deferralReason` strings
- 38 emittable; runtime allow-list (`ALLOWED_EVENTS`) enforces this

**Server schema migrations for telemetry:** 017 (table + RPC), 022, 027, 029, 032, 034 (column-name fix), 035, 036, 037, 038, 040, 041, 042, 043.

**Daily rollup view** (`engine_telemetry_daily` from migration 017) aggregates per day for cohort dashboards.

**Three event-tracking surfaces** (drift to resolve):
- `engineTelemetry.track(userId, event, payload)`: the database queue.
- `observability.track` namespace: UI events.
- `observability.audit(name, props)`: internal audit.

### 4.9 Sync

**Two layers coexist** (drift to resolve):

**Legacy (`src/lib/sync.js`, 1,640 lines):** Still consumed by some screens. Exposes `syncProfile`, `syncExercises`, `syncCustomExercises` (alias), `syncWorkout`, `scheduleSync`, `cancelScheduledSync`, `syncMorningWeight`, `syncWeeklyCheckin`, `syncBodyMetric`, `bulkUploadLocalData`, `syncUserPref`, `pullFromCloud`, `syncNutritionTargets`.

**Modular (`src/lib/sync/`, 16 files):** The spec'd architecture per `SYNC_ARCHITECTURE_LOCKED.md`. Public API at `sync/index.js`: `syncAll`, `syncTable`, `getStatus` + re-exports of registry/queue/conflict/telemetry.

**Sync registry (16 entries, 15 unique cloud tables):** see `lib/sync/registry.js`. `weight_log` is intentionally aliased to `body_composition_log` (handlers in `tables/weightLog.js` return `skipped:'aliased_to_body_composition_log'`).

- **3 pull-only** (server authoritative): `daily_intake_rollups`, `ed_pattern_flags`, `tier_history`.
- **`profiles` uses merge strategy** (per-column timestamps via `column_updates_at` jsonb from migration 045).
- All others bidirectional, last-write-wins.

**Per-table handlers (`src/lib/sync/tables/`, 10 files):** `bodyComposition`, `edPatternFlags`, `foodDomain` (handles 7 food tables via single shared run context), `notificationPreferences`, `nutritionTargets`, `profiles`, `recipeIngredients`, `tierHistory`, `weeklyCheckins`, `weightLog` (no-op alias).

**Triggers:**
- Foreground/background AppState listener in `App.js` → `maybeSync` (60s throttle).
- Every DB write in `database.js` schedules a debounced sync (~2s) via `_scheduleSync()` lazy-required from `sync.js`.

**`syncQueue.js`** (separate from `sync/queue.js`): per-op retry with exponential backoff via `pending_sync_ops` table.

**Telemetry:** `sync_run`, `sync_conflict_resolved`.

### 4.10 Notifications

`src/lib/notifications/` (12 files):

| File | Purpose |
|---|---|
| `index.js` | Public API surface. Re-exports everything else. |
| `categories.js` | Category enum + per-category channel routing. ED-pattern + FFM-floor + sync-error are in-app-only by policy. |
| `channels.js` | `ensureNotifChannels()` for Android channels. |
| `quietHours.js` | 22:00 → 07:00 local default, wrap-window aware. AsyncStorage-persisted via `@volyume_quiet_hours_v1`. |
| `permissions.js` | `requestNotificationPermissions`, `getNotificationPermissionStatus`. |
| `handler.js` | `configureNotificationHandler` with foreground smart-suppression. |
| `scheduler.js` | `scheduleMorningWeightNotification`, `scheduleCheckinReminder`, `scheduleNextCheckinReminder`, cancel helpers, `restoreNotifications`, `checkYearOfLiftsUnlock`. |
| `telemetry.js` | `trackNotificationSent` / `_tapped` / `_failed`. Lazy user lookup; no-op when signed out. |
| `listeners.js` | `installNotificationListeners({ onTap })`. Extracted from RootNavigator (2026-05-27). |
| `activeWorkout.js` | Sticky in-workout notification (`showActiveWorkoutNotification`, `dismissActiveWorkoutNotification`). |
| `preferences.js` | Per-user category preference storage. Backs `notification_preferences` table from migration 044. Includes `migrateFromLegacyBlob` for upgrade from the old AsyncStorage blob. |
| `trainingReminders.js` | Per-training-day reminders backed by AsyncStorage prefs. **Drift candidate:** uses AsyncStorage while the rest of the module uses SQLite via `preferences.js`. |

**Surfaces still pending** per `notifications/index.js:17-22`:
- Cascade gate (day 19, 21) push.
- Subscription payment failure.
- Weekly coach output ready.

**Telemetry (migration 040):** `notification_sent`, `notification_tapped`, `notification_failed`.

### 4.11 Observability

Per `OBSERVABILITY.md` + `TELEMETRY_DASHBOARDS_LOCKED.md`:

- Sentry React Native 5.24.3 wired in `src/lib/sentry.js`. DSN at runtime via `EXPO_PUBLIC_SENTRY_DSN`; no-ops without DSN.
- `beforeSend` hook applies scrub rules from `src/lib/observability/sentryScrub.js`.
- Error ring buffer (200 events) in `errorLog.js`, attached as breadcrumbs.
- Performance traces sampled 10% prod / 100% dev.
- AppState shutdown handler (`observability.js:172`) flips `CRASHED_FLAG` so cold-launch can tell if last session crashed.
- `getLastCrashMeta()` exposes last-crash metadata to the debug screen.
- `audit(name, props)` for internal event recording. `track` namespace for user-facing analytics.
- Session tracking: `setCurrentScreen`, `setCurrentUserId` updated as the user moves through the app.

---

## 5. Test inventory

**~1700 tests across ~85 suites, 0 fail, 3 skipped.** Run via `npx jest`. 3 skipped are explicit `test.skip` for deferred catalogue events (`account_deleted`, `held_decision_created`, `held_decision_cleared`).

### 5.1 Test locations

- `src/__tests__/`: top-level component / integration tests.
- `src/lib/__tests__/`: lib unit tests.
- `src/lib/sync/__tests__/`: sync transport + runner tests.
- `src/components/food/__tests__/`: food component tests.
- `tests/simulator/scenarios/`: 12 locked engine scenarios.

### 5.2 Test suites by area

| Area | Suites |
|---|---|
| Engine voice | `whyThisTemplates.snapshot` (14), `weeklyCoach.voice.snapshot` (5) |
| Engine math | `nutritionEngine`, `weeklyCoach`, `weeklyCoach.ffmFloor`, `ffmFloor`, `ffmFloor.adaptive`, `upwardGateCompression`, `recoveryEMA`, `algorithms`, `algorithms.adaptiveLandmarks` |
| ED-pattern | `edPatternDetector` (4-signal threshold, 2-of-3 vs 3-of-4 gate) |
| Differential paywall | `differentialPaywall` (40 detector tests) |
| Food data | `foodSync`, `sanityChecks`, `csvExport`, `liveOff`, `usda`, `ocrParser`, `writeback`, `foodWaterfall` |
| Sync | `sync.transport`, `sync.runner.integration`, `sync.regressionMatrix`, `sync.profiles`, `sync.publicApi` |
| Notifications | `notifications.quietHours`, `notifications.categories`, `notifications.listeners` |
| Telemetry | `engineTelemetry.allowlist`, `telemetryEvents.deferred` |
| Identity | `identity.invariant` (CI grep guard) |
| Snapshot framework | `voiceSnapshots`, `whyThisTemplates.snapshot` |
| Engine simulator | 12 scenarios + scenario harness |

### 5.3 Engine simulator framework

All 12 locked scenarios under `tests/simulator/scenarios/`: `straight_cut`, `aggressive_cut_supervised`, `aggressive_cut_unsupervised`, `red_s_trajectory`, `recomp_steady`, `bulk_gentle`, `bulk_aggressive`, `rapid_loss_correction`, `stalled_lift`, `plateau_then_break`, `returning_user`, `noisy_logger`.

### 5.4 E2E (Maestro)

`e2e/` with all 12 spec'd flows + a smoke launch check. `.maestro/config.yaml`. Structural linter wired into Jest. Opt-in `maestro-e2e.yml` CI workflow. 5 flows scaffolded (smoke + 4 founder-runnable); 4 await IAP / barcode / OCR fixtures (tagged `blocked`); 4 need selector validation against a real device.

---

## 6. Database migrations

Full applied list in `CURRENT_STATUS.md § 3`. As of 2026-05-27:

- **All migrations 015 through 047 applied** to production Supabase.
- **Migration 048 pending founder apply** (`food_favourites.kind` column for fav/dislike toggle).

**SQLite schema (`src/lib/database.js`):** 39 unique tables. See `CODE_TRUTH_SURVEY.md § database.js` for the full list with purpose. Notable:

- `peak_week_plans` remains as legacy despite Peak Week being out of scope. Cleanup migration outstanding.
- `workout_notes` v1 + `workout_notes_v2` both exist. v1 is legacy.
- `exercises` + `custom_exercises` both exist (seed vs user-created split per the identity refactor).

---

## 7. Telemetry events

See `CURRENT_STATUS.md § 4` for the complete per-panel breakdown of 42 canonical events (38 live, 4 deferred). Panel 7 absent from the canonical list (worth chasing).

---

## 8. Edge Functions

### 8.1 `supabase/functions/delete-account/index.ts`

Deployed. Handles the account-deletion flow per `PRIVACY_CONSENT_LOCKED.md`:
1. Verifies user via JWT.
2. Calls `delete_user_data` RPC.
3. Writes pre/post audit rows to `account_deletions_log` via service-role RPCs.
4. Calls `auth.admin.deleteUser`.

### 8.2 `supabase/functions/play-billing-rtdn/index.ts`

**Written, not deployed.** Pub/Sub push receiver for Google Play Billing Real-Time Developer Notifications. Verifies subscription via Google Play Developer API. Maps Google `notificationType` → `upgrade_tier_for_user(...reason='play_billing_rtdn')` (migration 042).

Deployment requires: founder configures Pub/Sub topic + service account env vars. Phase A exit prerequisite.

---

## 9. Build infrastructure

### 9.1 `.github/workflows/build-android.yml`

Builds an AAB on push to `main`. Status report uploaded as `build-status-<run>` artefact (post-CI-trigger-fix 2026-05-26). Signing config exists but never exercised in production (no keystore yet).

### 9.2 `.github/workflows/main-ci.yml`

Jest + lint on every push and PR. `--forceExit` removed 2026-05-27 after root-cause fix (leaked setTimeouts in HomeScreen useEffect). `--detectOpenHandles` reports zero leaks. PR comment auto-posts FAIL detail on Jest failures.

### 9.3 `.github/workflows/maestro-e2e.yml`

Opt-in Maestro CI. Status writeback to `.ci-status/maestro-latest.md`. Iteration ongoing (F4 emulator boot diagnosis still open).

### 9.4 `.github/workflows/deploy-pages.yml`

Auto-deploys `public/` to GitHub Pages on push to main. Privacy policy at `public/privacy/index.html` serves at `/privacy` once DNS is configured.

### 9.5 EAS Build

Configured but not used; CI build via `build-android.yml` is the active path. EAS Update (OTA) enabled via `expo-updates`; production builds check on launch.

### 9.6 Signing

`build-android.yml` has signing config that has never been exercised in production. **No keystore exists yet.** Phase A exit blocker. When founder is ready, Claude writes the commands.

### 9.7 `metro.config.js`

Standard Expo config + asset extensions for `.dat` (bundled food snapshots).

---

## 10. Screen inventory (58 screens)

Full breakdown in `CODE_TRUTH_SURVEY.md`. All flat under `src/screens/` (no subfolders). Categorised in `CURRENT_STATUS.md § 6` by tab.

---

## 11. Dependencies (current package.json highlights)

| Dependency | Version | Purpose |
|---|---|---|
| react-native | 0.74.5 | Mobile framework |
| expo | ~51 | Managed workflow + many SDKs |
| zustand | 4.5.2 | State |
| expo-sqlite | (Expo 51) | Local storage |
| @supabase/supabase-js | latest | Cloud client |
| react-native-iap | ^12.16.1 | Google Play Billing |
| @sentry/react-native | 5.24.3 | Errors. Note: 6.22.0 bump excluded via `expo.install.exclude` per Expo SDK 51 bundled-versions list. |
| react-native-vision-camera | 4.7.3 | Barcode + OCR camera |
| @react-native-ml-kit/text-recognition | 1.5.2 | On-device OCR |
| expo-notifications | ~0.28 | Local notifications |
| react-native-gifted-charts | latest | Bar + line charts |
| victory-native | latest | Cartesian charts (ExerciseDetail trend) |
| date-fns | latest | Date helpers |
| expo-haptics | (Expo 51) | Haptics |
| expo-document-picker | (Expo 51) | CSV import |
| expo-file-system | (Expo 51) | Backup + share |
| expo-sharing | (Expo 51) | Share sheet |
| expo-print | (Expo 51) | PDF for coach export (function dead today) |
| expo-updates | (Expo 51) | OTA update check |
| expo-secure-store | (Expo 51) | Auth token storage |
| expo-application | (Expo 51) | App version, native version |
| @react-native-async-storage/async-storage | latest | Flag + cache storage |

**npm audit:** 29 advisories at last count (15 high), all in the Expo SDK 51 dep chain. Fix path is the SDK 51 → 56 staged migration; documented in `docs/DEPENDENCY_AUDIT_2026-05-26.md`. Not in scope for Phase A.

---

## 12. Known drift (deep version)

Live tracking in `CURRENT_STATUS.md § 5` and the ranked punch list at `GAP_ANALYSIS.md § 2`. Items still open:

1. Two sync layers (`lib/sync.js` monolithic + `lib/sync/` modular). GAP row 12. Per-entity helpers in legacy file (`syncWorkout`, `syncProfile`, `bulkUploadLocalData`, `pullFromCloud`, `cancelScheduledSync`) don't have direct equivalents in `lib/sync/`; each migration is its own design call. Reserve a focused session per CLAUDE.md Rule 5.
2. `weekly_checkins` has two write paths (`WeeklyCheckInScreen.js:385` + `WorkoutSummaryScreen.js:377`). Verify field sets before any schema change.
3. `cycleOverride` is a dead input (coach reads at `weeklyCoach.js:375`, check-in UI never sets). GAP row 15 — needs biological-sex onboarding + check-in field + privacy gate.
4. `food_dislikes` is NOT a separate table (lives on `food_favourites.kind`). Not a drift, a fact docs sometimes get wrong.
5. `weight_log` is intentionally aliased to `body_composition_log` (the `sync/tables/weightLog.js` handler is a no-op).
6. 3 v1.1 features in PRO_FEATURES not actually shipped (`refeed_automated_any_cut`, `body_composition_deep`, `share_pack_pdf`). GAP row 25.
7. Refeed engine code (`getPlanNutritionContext` in `nutritionEngine.js:671-834`) is dead. GAP row 7 (wire as confirm-then-apply).
8. High/low day macros: not in code at all. GAP row 6 (build, gated to advanced cuts).
9. `peak_week_plans` table remains despite Peak Week being out of scope. Migration 049 drafted, hold apply until next AAB. GAP row 18.
10. `evaluateAutoReg` exists at `mesocycle.js:165` (per-session matrix) and as `autoregulationMatrix` in `weeklyCoach.js:144` (weekly matrix). Different scopes by design; dimensions overlap; alignment worth verifying before any future change.

**Resolved this session (2026-05-28):**
- ~~Two telemetry modules~~ → folded into `telemetry/transport.js`; `engineTelemetry.js` is a shim (commit `099738f`).
- ~~`STRENGTH_STANDARDS` duplicated~~ → `algorithms` copy deleted, PRWallScreen migrated (commit `48717e0`).
- ~~`detectRepRegressions` duplicated~~ → confirmed single definition (the second copy was already removed in an earlier session; survey was stale).
- ~~Likely dead lib files~~ → `phaseEngine.js` + `coachExport.js` + `phaseEngine.test.js` deleted (commit `9e556c4`, 2026-05-27). `sentry.js` and `seedExercises.js` confirmed live via App.js init paths.
- ~~`computeEWMA` duplicated~~ → confirmed intentional separation, annotation already in place at both `nutritionEngine.js:152` and `weeklyCoach.js:23` (different alphas for different consumer needs).

---

## 13. Founder action queue

Live list in `CURRENT_STATUS.md § 9`. Summary as of 2026-05-27:

### Now
1. Apply migration 048 (`food_favourites.kind`).
2. Tear down `volyume-e2e-test` Supabase project + delete the four `SUPABASE_TEST_*` repo secrets.
3. Close PR #5 without merging.
4. Point `volyume.app` DNS at GitHub Pages.
5. (Optional) Add `EXPO_PUBLIC_USDA_API_KEY` if USDA fallback wanted.

### When Phase A code work is complete
- Generate Android upload keystore.
- Set up Google Cloud Pub/Sub topic for RTDN + deploy the Edge Function.
- Create 3 SKU products in Play Console.
- Sandbox testers + end-to-end purchase test.

### When Phase A exit checklist is green
- Promote next AAB to Closed Testing.
- After internal sanity, promote to production.
- Stand up marketing site + waitlist.
- Send first wave of 200 open-beta invites.

### Never (current scope)
- Apple Developer / App Store Connect / iOS SKU work.

---

## 14. Phase A exit checklist

Per `RELEASE_PLAN_LOCKED.md` lines 77-89:

1. All Moves #0 through #5 shipped + green in CI.
2. Sandbox purchase end-to-end verified (Android).
3. Sentry quiet on a representative session.
4. Telemetry events firing into dashboards (all 8 panels: verify Panel 7 status).
5. Privacy policy live at `volyume.app/privacy`.
6. Article 9 consent flow tested end-to-end.
7. Account deletion flow tested end-to-end.
8. Keystore generated + signing tested via CI build.
9. Migration 048 applied.
10. Outstanding UI work from `CURRENT_STATUS.md § 8 NOW` resolved (saved meals, body comp charts, training auto-apply decision, drift cleanup).

---

## 15. Phase B prep

Per `RELEASE_PLAN_LOCKED.md` lines 93-115:

- Marketing site at `volyume.app` (waitlist signup, pricing page).
- Waitlist email template + one-time invite codes (200-500/week).
- Welcome push template for waitlist invitees.
- Incident response runbook.
- Support workflow (`support@volyume.app` forwarded).
- Coach marketing landing page at `volyume.app/coach`.
- Version bump 1.1.0 → 1.2.0.
- Publish first wave of 200 invite emails.
- Play store listing finalised (screenshots, privacy manifest, age rating).

---

## 16. Out of scope for v1

See `BACKLOG.md` NEVER section for the comprehensive list. Highlights:

- Apple Developer / App Store Connect / iOS SKU work (Android-first; iOS post-Android-launch, not locked never).
- Peak Week module (founder removed 2026-05-25).
- Complete tier + 28-day cascade (consolidated to 2-tier 2026-05-25).
- RevenueCat (Play Billing direct).
- Cloud infrastructure migration (Azure/AWS).
- Photo cloud sync.
- AI photo logging.
- Apple Watch app.
- Web app for end users.

---

## 17. Locked docs index

Read these before touching the surface they cover. They cannot be overridden without founder approval.

| Doc | Owns |
|---|---|
| `MASTER_VISION_AND_PLAN.md` | Vision + tier model + Move ladder |
| `COMPLETE_TIER_SCOPE_LOCKED.md` | Tier scope (re-locked 2026-05-25 with 2-tier preamble) |
| `SUBSCRIPTION_AND_PAYMENT_LOCKED.md` | Pricing + cascade + Play Billing direct |
| `RELEASE_PLAN_LOCKED.md` | Phase A / Phase B sequence + exit checklists |
| `DATABASE_SCHEMA_LOCKED.md` | Cloud schema + migration tracking |
| `SYNC_ARCHITECTURE_LOCKED.md` | Sync layer architecture (the modular target) |
| `ONBOARDING_SEQUENCE_LOCKED.md` | Onboarding screen order + entry points |
| `PRIVACY_CONSENT_LOCKED.md` | Article 9 consent + delete-account flow + PII scrub |
| `UI_FLOWS_LOCKED.md` | Diary + food flows + Search tab subnav |
| `NOTIFICATIONS_LOCKED.md` | Categories + quiet hours + scheduler |
| `TELEMETRY_DASHBOARDS_LOCKED.md` | Event catalogue + 8 dashboard panels |
| `PRODUCTION_READINESS_LOCKED.md` | What "ready for production" means |
| `IDENTITY_AND_OWNERSHIP_LOCKED.md` | No anonymous mode, sign-out wipe, composite PKs, no UPDATE on user_id |
| `BUDGET_POSTURE_LOCKED.md` | Costs + dependency posture |
| `FOOD_DATA_STRATEGY_LOCKED.md` | OFF + CoFID + USDA waterfall + writeback |
| `COACHING_VOICE_SYNTHESIS_LOCKED.md` | Voice rules across all coaching surfaces |
| `GROWTH_STRATEGY_SYNTHESIS_LOCKED.md` | Phase B waitlist + acquisition strategy |
| `TESTING_STRATEGY_LOCKED.md` | Test pyramid + E2E flows + load tests |

---

## 18. Things that have caught past Claude sessions out

1. **The PRO_BETA_ACTIVE flag.** During closed testing every user gets `pro` tier. Code paths that look like they default to Pro on signup are correct in this period, not bugs.
2. **food_dislikes is NOT a separate table.** It lives on `food_favourites.kind`. Don't grep for a table that doesn't exist.
3. **Refeed engine code is dead.** `getPlanNutritionContext` in `nutritionEngine.js` builds a refeed object but nothing calls it. Don't claim refeed is shipped.
4. **Per-set RIR was deliberately removed.** `SetEntry.js:173-176` documents the decision. `DEFAULT_SET.rir = 2` is internal-only.
5. **Two sync layers coexist (legacy `lib/sync.js` + modular `lib/sync/`).** Any sync change must specify which layer it touches. Don't accidentally update only one. GAP row 12 is the planned consolidation.
6. **Telemetry is now one module.** As of 2026-05-28 (commit `099738f`) `engineTelemetry.js` is a thin shim re-exporting from `telemetry/transport.js`. Existing callers keep working; new code imports from `lib/telemetry`.
7. **`weight_log` is an alias.** The sync registry has 16 entries; 15 are unique cloud tables.
8. **`peak_week_plans` table exists despite Peak Week being out of scope.** Don't take its presence as authorisation to add features.
9. **`cycleOverride` is a dead input.** Coach reads it; UI never sets it. Permanently false. GAP row 15 plans to wire it.
10. **`weekly_checkins` has two write paths.** Verify both before any schema change.
11. **iOS is NOT locked never.** It's deferred until Android ships. Adjust framing.
12. **`workout_notes` v1 and v2 both exist.** Use v2; v1 is legacy.
13. **MacroRings turns warning on over-target.** Not adherence-neutral. GAP row 8 plans the three-band (under = primary amber, at = success green within 5%, over = warning amber).
14. **Coach apply is now uniform confirm-then-apply (2026-05-28).** Calories, training volume, steps, cardio, deload, and diet break all surface a suggestion with an Apply button; nothing writes until tapped. Pure compute + applied-state in `src/lib/coachApply.js`; `CoachOutputScreen` does the side effects; applied-state rides in the `coach_outputs.output_json` blob (no migration). Destinations: calories/diet-break → `nutrition_targets`; training/deload → next week's `planned_muscle_volume` (deload also flips `mesocycle_weeks.is_deload`); steps/cardio → `userProfile` fields that gate check-in adherence. Remaining: row 6 (high/low-day macros), row 7 (refeed). **Data-loss bug fixed in passing:** `computeCalorieTargets` only handed the changed macros to `saveNutritionTargets`, which writes the whole row, so every calorie apply nulled `tdee`/`bmr`/`phase`. Now spreads the full row first. If you touch any apply path, remember `saveNutritionTargets` is a full-row write, never hand it a partial.
15. **Silent `try/catch (_) {}` hides import bugs.** Caught one this session: `useAppStore.clearAuthStateForSignOut` destructured `flushPendingTelemetry` from `lib/sync` instead of `lib/engineTelemetry`. The catch ate the TypeError; the symptom (telemetry never flushed at sign-out) was invisible. When touching code adjacent to a swallowed catch, grep the destructured names against the module's actual exports.
16. **CODE_TRUTH_SURVEY is a snapshot.** It's `188 files` because that's what was on disk when it was authored. Files have been deleted since (`phaseEngine.js`, `coachExport.js`, `phaseEngine.test.js` in commit `9e556c4`). Verify file existence before planning a refactor off the survey alone.
17. **Harness injects feature-branch directives.** Twice now the session prompt has said "develop on branch `claude/...`". Rule 9 says surface that to the founder and wait. Don't auto-follow.

---

## 19. If you're a new session reading this cold

1. Read `CLAUDE.md` first (voice rules + 10 engineering rules + branch policy).
2. Run the Rule 1 repo validation (`git fetch origin`, `git branch --show-current`, etc.) and print the result to the founder before touching code.
3. Read `docs/CURRENT_STATUS.md`. That's the executive state. Note what's pending in § 8 and § 9.
4. Skim this doc for area you're about to touch (§ 4.x).
5. If you need code-level evidence, open `docs/CODE_TRUTH_SURVEY.md` and grep the area.
6. If you're about to touch a LOCKED surface, read the relevant LOCKED doc first.
7. **Do not** mass-edit docs based on what you assume. Always verify against code.
8. **Do not** describe AI-machine-learning concepts in any user-facing copy. Coach Builder is deterministic.
9. Never invent commit SHAs, line numbers, telemetry events, table names, or RPCs. If you don't know, check.
