# Phase 2 — Codebase Audit (phase2-00)

**App:** Volyume — precision hypertrophy coaching and physique app
**Date:** 2026-06-08
**Repo:** `ADPhysique` (app name: Volyume)
**Branch:** `claude/tender-albattani-crloK` (Phase 2 working branch; tracks `main`, never pushed to live)
**Purpose:** Ground-truth map of the existing app so every Phase 2 proposal integrates cleanly rather than rebuilding. Every external research question and proposal in `phase2-01`…`phase2-05` is anchored to the facts below.

> Provenance note: this audit reflects the *actual* codebase as read on 2026-06-08. Where an earlier Phase 2 brief assumed a different stack (WatermelonDB, RevenueCat, MP4 demo videos), this document supersedes it. Volyume uses **expo-sqlite + Zustand**, **direct Google Play Billing (react-native-iap)**, and ships **no demo video player today**.

---

## 1. Tech stack & architecture

| Layer | Choice | Notes |
|---|---|---|
| Framework | Expo SDK **54.0.35**, React Native **0.81.5**, React **19.1.0** | New Architecture enabled (`app.json`). App version 1.2.0. |
| Language | JavaScript (+ TypeScript ^5.9.3 available, strict off) | Most of `src/` is `.js`. |
| Local DB | **expo-sqlite ~16.0.10** (`volyume.db`, WAL) | `src/lib/database.js` (~6000 lines). PRAGMA `user_version` migration system. |
| State | **Zustand ^4.5.7** | `src/store/useAppStore.js` (~63KB). Instrumented with an observability proxy. |
| Key-value | `@react-native-async-storage/async-storage` 2.2.0 | All keys prefixed `@volyume_`. |
| Cloud | **Supabase ^2.43.4** (Postgres + Auth + RLS), EU/UK region | `src/lib/supabase.js`. Session in `expo-secure-store`. |
| Sync | Custom offline-first engine | `src/lib/sync.js` + `src/lib/sync/` (registry/transport/conflict/runner) + `src/lib/syncQueue.js`. |
| Navigation | `@react-navigation` v6 (bottom-tabs + stack) | `src/navigation/RootNavigator.js` (~1083 lines). |
| Charts | `@shopify/react-native-skia` 2.2.12 + custom SVG | `SvgLineChart`, `Sparkline`, `VolumeBars`, `BodyDiagramHeatmap`. |
| Animation | `react-native-reanimated` ~4.1.1 + worklets | Motion tokens in theme. Respects Reduce Motion. |
| Billing | **react-native-iap ^15.3.1** (direct Google Play Billing) | `src/lib/payments/` — NOT RevenueCat. |
| Health | `react-native-health` 1.19.0 (iOS HealthKit) + `react-native-health-connect` ~3.5.3 (Android) | `src/lib/health.js`; custom config plugin `plugins/withHealthConnectPermissionDelegate.js`. |
| Camera/OCR | `react-native-vision-camera` ^4.7.3 + `@react-native-ml-kit/text-recognition` ^2.0.0 | Barcode + nutrition label OCR. |
| Notifications | `expo-notifications` ~0.32.17 | Local schedules + (optional) Expo push. |
| Crash/obs | `@sentry/react-native` ~7.2.0 + custom ring buffer (`errorLog.js`) | No PII to Sentry. |
| Images | **`expo-image` ~3.0.11** | Already present — relevant to Feature 2 caching. |
| Native modules | `modules/live-activity` (iOS rest-timer Live Activity), `modules/rest-timer-live` (Android) | |

**Architecture doctrine (from `CLAUDE.md`, confirmed in code):** Offline-first. **Local SQLite is the source of truth on device.** Components read from local storage, never query Supabase directly. Supabase is the sync target; all sync runs through the sync layer only. EU/UK data residency. No PII to analytics/crash reporters.

**Sync triggers** (`App.js`): foreground resume, network reconnect, debounced write (~2s), 15-min interval, daily background fetch.

---

## 2. Database schema

### 2.1 Cloud (Supabase) — `supabase/schema.sql` + 71 migrations

Core tables (all RLS-enabled). Ownership pattern is uniform: **`FOR ALL USING (auth.uid() = user_id)`**, or an `EXISTS` subquery for child rows, or the canonical-read exception on `exercises`.

- **`users_profile`** — `id UUID PK REFERENCES auth.users(id)`, `username`, `first_name`, `training_focus`, `training_age`, `primary_equipment`, `units`, `tier`, `bar_weight`, `goal_start_date`, trial columns (`trial_state`, `trial_started_at`, `pro_trial_ends_at` — mig 065), `billing_period` (mig 066), `updated_at`. RLS: owner-only (`auth.uid() = id`). Mig 070 PROTECT trigger forbids client-side `tier`/`trial_state` mutation.
- **`exercises`** — `id UUID PK`, `user_id` (NULL = canonical library, NOT NULL = custom), `name`, `aliases[]`, `primary_muscle`, `secondary_muscles JSONB`, `equipment`, `movement_pattern`, `compound_isolation`, `unilateral_bilateral`, `default_rep_min/max`, `valid_set_types[]`, `resistance_profile`, `fatigue_cost`, `stimulus_to_fatigue_ratio`, `injury_sensitivity`, `tension_at_stretch`, `substitute_exercise_ids[]`, `notes`, `is_custom`, timestamps. **RLS: `Anyone can read canonical exercises` USING (`user_id IS NULL OR auth.uid() = user_id`)** + custom-only FOR ALL. **No `demo_*`/`form_cues` columns exist yet.**
- **`routines`**, **`routine_exercises`**, **`programmes`** (mig 010), **`mesocycles`**, **`mesocycle_weeks`**, **`planned_muscle_volume`**, **`adaptation_events`** — training plan structures.
- **`workouts`** — `id`, `user_id`, `routine_id`, `mesocycle_id`, `started_at`, `ended_at`, `duration_minutes`, ratings, **`is_completed BOOLEAN`**, timestamps. Index `idx_workouts_user_started(user_id, started_at DESC)`.
- **`workout_sets`** — set-level log (`set_type`, `actual_reps`, `weight`, `rir`, `rpe`, pump/connection, unilateral `left_reps`/`right_reps` mig 054).
- **`volume_landmarks`**, **`weekly_volumes`**, **`personal_records`**.
- **`body_metrics`** / cloud `body_composition_log` (LWW + soft-delete, mig 047), **`weekly_checkins`** → cloud `weekly_checkins_v2`, **`morning_weights`**, **`coach_outputs`**.
- **Nutrition:** `custom_foods`, `food_entries`, `saved_meals`, `recipes`, `recipe_ingredients`, `daily_intake_rollups` (server-authoritative, pull-only), `food_favourites`, `daily_water`.
- **Activity:** `daily_steps` (mig 056), `cardio_log` (mig 064).
- **Safety/tier:** `ed_pattern_flags` (server-wins, pull-only), `tier_history` (server-wins, pull-only).
- **`notification_preferences`** (mig 044, PK `user_id, category`).
- **`private.trial_ledger`** (mig 071) — salted SHA-256 of email, survives account deletion, anti-trial-fraud. Not exposed via PostgREST.

**Composite PKs:** mig 018 moved most tables to `(user_id, id)` so cross-user id collisions are impossible at schema level (IDENTITY_AND_OWNERSHIP_LOCKED.md).

**GDPR delete:** `delete_user_data()` SECURITY DEFINER RPC deletes all owned rows across tables in dependency order (extended by migs 025, 062; deliberately excludes `trial_ledger`).

**There is no `feature_flags` table and no `partnerships`/groups table today.** Both would be new.

### 2.2 Local (expo-sqlite) — `src/lib/database.js`

Mirrors the cloud tables (snake_case) and adds **local-only exercise metadata** seeded offline and **not synced**: `equipment_category`, `machine_type`, `force`, `laterality`, `difficulty`, `machine_ok`, `home_ok`, `cue`, `equipment_profiles`. Migration system is a `SCHEMA_MIGRATIONS` array (v0…v31+), each entry an array of SQL strings or async fns, gated by PRAGMA `user_version`; `isBenignMigrationError()` tolerates duplicate-column re-runs. `rowToCamel()` converts every row to camelCase and JSON-parses `secondary_muscles`.

**Additive column pattern (the one Feature 2 would copy):** e.g. `ALTER TABLE exercises ADD COLUMN cue TEXT`, `ALTER TABLE exercises ADD COLUMN equipment_profiles TEXT` in the migration array.

### 2.3 Sync layer — `src/lib/sync/registry.js`

Every synced table is declared once with: PK, conflict strategy (`last_write_wins` | `server_wins` | `merge`), `server_authoritative`, `soft_delete`, direction (`bidirectional` | `pull_only`). Conflict resolution (`conflict.js`) is `updated_at`-based LWW, per-column merge for `profiles`, or server-wins. Failed pushes go to `pending_sync_ops` with exponential backoff `[0, 60s, 300s, 1.8M, 7.2M, 28.8M]`, drained on foreground.

> **Key constraint for Phase 2 Feature 1:** every entry in this registry is single-owner. There is no mechanism for one user to read another user's rows. Accountability groups are inherently multi-user and therefore CANNOT use this sync engine — they need a separate, cloud-direct, RLS-mediated read path (documented in `phase2-02`).

---

## 3. Authentication & user model

- **Provider:** Supabase Auth. Email/password (`signInWithEmail`/`signUpWithEmail`), **Google** (native `@react-native-google-signin`, id-token → `signInWithIdToken`), **Apple** (browser OAuth → `volyume://` deep link → `exchangeCodeForSession`). Session persisted encrypted in `expo-secure-store` (`secureAuthStorage`).
- **Identity:** `auth.users(id)` is source of truth; `users_profile.id` is 1:1 with it. Every user-scoped row carries `user_id`; RLS enforces ownership. Composite `(user_id, id)` PKs lock ownership at schema level.
- **`getCurrentUser()`**, `getUserProfile(userId)`, `upsertUserProfile()` in `src/lib/supabase.js`.
- **No public username/discovery surface** exists — usernames exist on `users_profile` but there is no search/lookup-by-username path. (Relevant: Feature 1 must not introduce user discovery.)

---

## 4. Subscription & Pro gating

- **Entitlement:** `src/lib/proGate.js` → `isPaidTier(profile)` resolves `'pro' | 'free'` from `users_profile.trial_state`. The Zustand store holds `tier` (`useAppStore(s => s.tier)`). `PRO_BETA_ACTIVE = false` since launch (2026-06-06).
- **Billing:** direct Google Play Billing via `react-native-iap`. SKUs in `src/lib/payments/catalogue.js`: **`pro_monthly` (£4.99/mo)**, **`pro_annual` (£29.99/yr)**. State machine `src/lib/payments/cascade.js`; provider `playBilling.js`. Server verification via `play-billing-rtdn` Edge Function → `upgrade_tier` RPC.
- **Trial:** 14-day cardless in-app (started at Article 9 consent via `cascade.startCascade()`), then 7-day Google Play intro trial if they subscribe at day 14.
- **Gating patterns (copy-this):**
  - Inline: `<ProGate feature="Name">…</ProGate>` (`src/components/ProGate.js`) — free users see dimmed content + upgrade modal.
  - Whole screen: `export default withProGuard(Screen, 'Name')`.
  - Inline check: `const tier = useAppStore(s => s.tier); if (tier === 'pro') {…}`.
  - Navigation gating: many routes already gate via these in `RootNavigator.js`.

**Free vs Pro (locked, `docs/COMPLETE_TIER_SCOPE_LOCKED.md` + `CLAUDE.md`):**
- **Free:** Plan Library, training builder, workout logging, exercise library, personal bests, progress stats.
- **Pro:** food diary, barcode scanning, smart suggestions, nutrition targets, macros, cardio, steps, check-ins, Precision Coaching, division plans, safety systems, wearable.

---

## 5. Coach system (Precision Coaching)

**Deterministic, no LLM, no randomness** (verified: no `Math.random()` in coach files). Hard project rule.

- `src/lib/weeklyCoach.js` (~1305 lines) — `runWeeklyCoach(inputs)` returns a coaching card. EWMA weight trend, recovery×performance autoregulation matrix → `volumeDelta`/`trainingSignal`, phase config (bulk/cut/recomp/maintenance), calorie/steps/cardio adjustments, `whyThisWeek`, `heldDecisions`.
- **Phase state** lives on `users_profile` (`goalPhase`, `goal_start_date`), read by `CoachOutputScreen`. (Feature 1 contest-prep auto-pause would *read* this, never modify it.)
- `src/lib/coachApply.js` — confirm-then-apply (user taps Apply; no silent writes).
- `src/lib/coachingGoals.js` — physique divisions, training phases, overlays, weak-point muscles, `getTrainingNote()` copy.
- `src/lib/blockAdvisor.js` — block transition advice from 8-week check-in history.
- **Inputs:** weekly check-in, morning weights (14d), session stats, nutrition targets, body profile. **Outputs:** confirm-then-apply adjustments persisted to `nutrition_targets`, `planned_muscle_volume`, `coach_outputs`.

**ED safety system (DO NOT TOUCH — `CLAUDE.md`):**
- `src/lib/edPatternDetector.js` — 4 signals (rapid loss ≤ −1.5%/wk, low energy ≤2 for ≥2wk, sustained under-eating, weight-only check-ins). 2+ (or 3+ for advanced) raises a flag that blocks calorie-cut suggestions.
- In `weeklyCoach.js`: FFM floor (30 kcal/kg FFM, RED-S) holds cuts; rapid-loss compression adds calories immediately. Calorie floors 1200 (women)/1500 (men); max loss 1%/wk (1.5% triggers intervention).
- **Relevance to Phase 2:** Feature 1 must never share nutrition/weight/ED data; contest-prep/aggressive-cut phase must auto-pause sharing.

---

## 6. Exercise library

- **Seed:** `src/lib/seedExercises.js` (~89KB) — **445+ canonical exercises**. Deterministic `canonicalExerciseId(name)` (128-bit Murmur mixer) so the same name → same id across devices (enables sync). Subregion tags (`SUBREGION_MAP`) for balanced coverage.
- **Metadata derivation:** `src/lib/exerciseMetadata.js` — equipment category, profiles, force, laterality, machine type. `src/lib/exerciseDisplay.js` — presentation labels.
- **Technique content TODAY:** `src/lib/formTips.js` (~46KB) — `FORM_TIPS` object keyed by **exact exercise name** → a single prose cue paragraph (200+ exercises). Plus `exercises.cue` (short coaching cue, local-only column). No structured setup/execution/mistakes; no media.
- **Rendering:** `ExerciseDetailScreen.js` shows `FORM_TIPS[exercise.name]` and `exercise.cue` (cue card at ~line 603, notes at ~610). `ActiveWorkoutScreen.js` imports `FORM_TIPS`. `ExerciseCard.js` / `ExercisePickerModal.js` for browsing. `PlanLibraryScreen.js` for plan collections.

> For Feature 2, the additive path is: new nullable columns on `exercises` (`demo_url`, `demo_thumbnail_url`, `form_cues JSONB`, `common_mistakes JSONB`, `demo_duration_seconds`) mirrored in the local migration array + `rowToCamel`, with a new `DemoCard`/coaching-notes UI folding in the existing `FORM_TIPS`/`cue` content. `expo-image` is already available for thumbnail caching.

---

## 7. Session logging — and how "trained this week" is derived

- **`workouts`** row created on start (`createWorkout`), finalised with `is_completed = 1` + `ended_at` on finish. `started_at` is epoch-ms.
- **`workout_sets`** written per set (`createWorkoutSet`). Warmup/dropset excluded from progress-set counts.
- **THE consistency signal already exists:** `getWeeklySessionStats(userId, weekStart)` at **`database.js:4214`**:
  ```sql
  SELECT COUNT(*) AS completed FROM workouts
   WHERE user_id = ? AND is_completed = 1 AND started_at >= ? AND started_at < ?;
  ```
  Week is Monday-anchored (UTC), `weekEnd = weekStart + 7*86400000`. Returns `{ completed, planned }` where `planned` is the active plan's routine count or a rolling 4-week average.
- **Anti-gaming corollary:** a "trained this week" yes/no is grounded in *real* completed sessions with real sets — it can't be faked without actually logging a workout. (See `phase2-01`/`phase2-02`.)

---

## 8. Navigation & tab layout

Five bottom tabs (`RootNavigator.js`): **Train** (Home), **Plans**, **Diary** (Pro), **Progress** (Analytics), **You** (Profile/Settings). Auth/onboarding stacks gate ahead of tabs: Welcome→Login, Article 9 consent (blocking), First-run (free) / Pro onboarding. Tab bar `#111111` bg, `#222222` border, amber active tint, Ionicons. Hero-zoom transitions for ActiveWorkout/Summary; Reduce-Motion aware.

- **Feature 1 (accountability)** belongs in the **You** tab (below Coaching), per its accountability-not-social positioning and the existing Settings home there.
- **Feature 2 (demos)** belongs on `ExerciseDetailScreen` (Plans/Progress stacks) with an on-demand entry from the Active Workout set view.

---

## 9. Design system — `src/styles/theme.js`

- **Backgrounds:** `background #0D0D0D`, `surface #191917`, `surfaceElevated #222220`, `surface2 #2A2A27`, `surface3 #343431`. (Note: real surfaces are warm near-blacks, not flat `#1A1A1A` as an earlier brief assumed.)
- **Accent (amber):** `primary #F5A623`, `primaryFill #E08C0B`, `primaryDim #B45309`, `primaryBg rgba(245,166,35,0.12)`.
- **Text:** `textPrimary #FFFFFF`, `textSecondary #9E9E9E`, `textMuted #9B9B9B`, `textDisabled #727272` (AAA contrast; high-contrast + colour-blind-safe + larger-text mutations applied at boot).
- **Status:** `success #4CAF50`, `warning #FFC107`, `error #F44336` (CVD-safe swaps).
- **Spacing:** hair1/xxs2/xs4/sm8/md12/lg16/xl24/xxl32/xxxl48. **Radius:** xs4/sm6/md10/lg14/xl20/full999. **Type:** sizes micro10…display40; weights 400–900; roles `display/h1/h2/h3/title/body/label/caption` + `num()` tabular. **Motion:** durations micro120…hero440, Material easing, spring `{stiffness:150,damping:18,mass:1}`.
- **Components (69):** `Button`, `Card`, `PressableCard`, `Chip`, `SegmentedControl`, `BottomSheet`, `EmptyState`, `Skeleton`, `Toast`, `AppAlert`, `ProGate`, `SettingsPrimitives` (`SettingsPage`/`SettingRow`/`SectionHeader`), `ScreenHeader`/`BackHeader`, `InfoTooltip`, `Illustrations`, `BodyDiagramHeatmap`, `ExerciseCard`, `ExercisePickerModal`, etc.
- Buttons 48dp min height (accessibility). New Phase 2 UI must reuse these primitives and tokens — no new colours.

---

## 10. Notification system

- `expo-notifications`. Channels in `src/lib/notifications/channels.js` (e.g. `COACHING_REMINDERS_CHANNEL`, `TRAINING_REMINDER_CHANNEL`). Local schedules: morning weight (daily, rotating copy, quiet-hours aware), weekly check-in, training-day reminders (`trainingReminders.js`, per `@volyume_schedule_v1`). Tap routing in `handler.js`/`listeners.js`.
- **Push:** `pushToken.js` registers Expo push tokens to `device_push_tokens` (mig 053) **but hard-gates on `app.json` `extra.eas.projectId`, which is currently absent → remote push is a no-op today.** Any Phase 2 feature needing server-initiated push (e.g. partner emoji reaction) must account for this (either add projectId, or use local-notification/poll-on-foreground fallback).
- Quiet hours respected; reminders rescheduled on timezone change.

---

## 11. Settings & preferences architecture

- **Structure:** `SettingsScreen` is a category list → focused sub-pages (`SettingsCoachingScreen`, `SettingsHealthScreen`, `SettingsPrivacyScreen`, etc.). Shared primitives in `src/components/SettingsPrimitives.js`: `SettingsPage` (chrome), `SettingRow` (icon/label/sub/value/rightElement e.g. Switch), `SectionHeader`.
- **Storage patterns for a toggle:**
  - **A — device-local only** (privacy/analytics): AsyncStorage via store actions (`setAnalyticsOptOut` → `@volyume_privacy_prefs`). Pattern in `privacyPrefs.js`, `wellbeing.js`, `cyclePrefs.js`.
  - **B — cloud-synced profile field:** `saveLocalProfile(userId, {...userProfile, field})` (AsyncStorage immediate + fire-and-forget `syncProfile`). Add the field name to `PROFILE_FIELDS_TRACKED` (`useAppStore.js`) for per-field LWW timestamps.
  - **C — lib function** (no store): bespoke AsyncStorage getter/setter.
- **Switch styling:** `trackColor={{false: colors.surface3, true: withAlpha(colors.primary,0.502)}}`, `thumbColor={value ? colors.primary : colors.textMuted}`.

---

## 12. Privacy & GDPR layer

- **Article 9 consent** (`Article9ConsentScreen.js`) — mandatory blocking gate for health data; `record_health_consent(true)` RPC writes `users_profile.health_data_consent` + `consent_log` audit row; `CONSENT_VERSION = '2026-06-06'`. Consent also starts the trial.
- **Data residency:** servers in the **UK** (Supabase), encrypted local storage, RLS per user. Delete = within 30 days; `delete_user_data()` cascade + local wipe.
- **Toggles:** Open Food Facts sharing (device-local), usage analytics opt-out (device-local; never includes training/food/body data). **No PII to external services.**
- **Relevance:** Feature 1 shares a binary training signal — still personal data under UK GDPR. Requires explicit consent (default OFF), lawful basis, data minimisation, and a complete data-isolation toggle enforced in RLS, not just UI. (See `phase2-01`/`phase2-02`.)

---

## 13. Third-party SDKs/services (inventory)

Supabase (auth/DB/RLS), Google Play Billing (`react-native-iap`), Apple HealthKit + Android Health Connect, Google Sign-In, Vision Camera + ML Kit OCR, Sentry, Expo Notifications/Push, OpenFoodFacts (bundled `.dat` snapshot) + USDA + CoFID, expo-secure-store, expo-file-system/print/sharing/document-picker, expo-updates (OTA), Skia, Reanimated, date-fns.

---

## 14. Constraints that bind every Phase 2 proposal

1. **Never touch:** `main`, billing, trial logic, coaching engine, ED safety system, free/pro gating, WatermelonDB-equivalent schema foundations. (There is no WatermelonDB; the equivalent is the SQLite migration system + sync registry.)
2. **Offline-first** for on-device features; **but cross-user features (accountability) are intrinsically online** and must fail gracefully/queue.
3. **British English** in all user-facing strings.
4. **Visual language:** `#0D0D0D` / `#F5A623` and the existing tokens/components only.
5. **No LLM/AI** in or around the coaching engine; new features read its outputs, never modify logic.
6. **RLS on every new Supabase table.** Default-deny; no discovery.
7. **Premium feel:** features must feel native to Volyume, never bolt-on; toggling off must leave zero trace.
8. **Remote push is currently a no-op** (missing EAS projectId) — design around it.

---

*End phase2-00. Next: `phase2-01` (accountability research) and `phase2-03` (demonstrations research), then proposals `02`/`04`, then synthesis `05`.*
