# Volyume — Infrastructure & Current State

Source of truth for the runtime configuration, schema, security posture,
and recent flow changes. **Reconciled against `main` on 2026-06-26**
(app version 1.2.0, iOS build 7, Android versionCode 14). `main` is the
canonical branch and the GitHub default branch.

> This file now reflects the post-beta production state: the food/diary
> layer, ED-pattern detection, differential paywall, day-21 trial cascade,
> **native store IAP (Play Billing + App Store StoreKit2 — no Stripe)**,
> the 2-tier (Free / Pro) model, SQLCipher-encrypted local DB, the
> `src/lib/sync/` registry sync layer, Apple Health / Health Connect
> integration, and the Ultimate-Audit Tier-1/2/3 builds are all live and
> merged. **`PRO_BETA_ACTIVE` is now `false`** — entitlement is real.
> Where a `*_LOCKED.md` spec disagrees with this file, the LOCKED spec wins.

If anything in `ARCHITECTURE.md` / `APPMAP.md` / `VOLYUME_DEEPMAP.md`
conflicts with this file, this file wins.

## Release surface

- iPhone (App Store) and Android (Google Play) only.
- Web entry point and dependencies removed in May 2026.
  `react-native-web`, `react-dom`, `@expo/metro-runtime`, the `web`
  script in `package.json`, and the `expo.web` block in `app.json`
  are gone. Do not reintroduce without a deliberate product decision.

---

## 1. Runtime

| Surface | Tech | Notes |
|---|---|---|
| Mobile app | React Native 0.81.5 + React 19.1.0 + Expo SDK ~54 | Hermes; New Architecture enabled; OTA via `expo-updates` |
| Local DB | `expo-sqlite` (SQLCipher, `useSQLCipher: true`) | Encrypted at rest; 256-bit per-device key in `expo-secure-store` (`src/lib/dbCrypto.js`); migration runner in `src/lib/database.js` (v23) |
| State | Zustand ^4.5 | Single store at `src/store/useAppStore.js`; manual AsyncStorage persistence |
| Backend | Supabase (EU Dublin) | Postgres + Auth + Edge Functions (Deno) |
| Sync | `src/lib/sync/` | Registry-driven, two-track (migrated + legacy), watermark incremental pull, conflict strategies |
| Auth | Supabase email/password + Google OAuth + Apple OAuth | Real account required (no anonymous mode); deep link `volyume://` |
| Notifications | `expo-notifications` + `send-push` Edge Function | Local schedule + server push tokens (`device_push_tokens`) |
| Billing | `react-native-iap` (Play Billing + StoreKit2) | Server verify via Edge Functions; products `pro_monthly` / `pro_annual` |
| Health | `react-native-health` (iOS) / `react-native-health-connect` (Android) | Read weight/steps/cardio/HR; write workouts |
| Scanning | `react-native-vision-camera` + `@react-native-ml-kit/text-recognition` | Barcode + nutrition-label OCR |
| Graphics | `@shopify/react-native-skia`, `react-native-reanimated` ~4 | Share cards, charts, animations |
| Audio | `expo-av` | Rest-timer countdown sound (installed 2026-06-06) |
| Crash/telemetry | `@sentry/react-native` | PII-scrubbed; EU project |
| Bundler | Metro (Expo default) | |

---

## 2. Tier model

Two tiers — **Free** and **Pro**.

| Capability | Free | Pro |
|---|---|---|
| Local workout logging | ✅ | ✅ |
| Plan Library (browse + activate) | ✅ | ✅ |
| Manual Builder (custom plan from scratch) | ✅ | ✅ |
| Cloud backup | ❌ (local-only) | ✅ |
| Coach Builder / auto-plan wizard | ❌ (removed for both) | ❌ (removed for both) |
| Onboarding quiz / template suggester | ❌ (removed) | ❌ (removed) |
| Weekly Check-in | ❌ | ✅ |
| Nutrition Targets | ❌ | ✅ |
| Body Metrics tracking | ❌ | ✅ |
| Coach Output (weekly auto-coach) | ❌ | ✅ |
| Goal regeneration (ProGoalSetup) | ❌ | ✅ |
| Morning weight log | ❌ | ✅ |
| Pro-only routes (gated in `src/lib/proGate.js`) | locked | accessible |

**Beta override (now OFF):** `PRO_BETA_ACTIVE = false` in
`src/lib/proGate.js` (`:28`). The closed-test override that forced every
authenticated user to Pro is disabled — entitlement is now the real
`store.tier === 'pro'`, driven by native store purchases verified
server-side. Cloud `users_profile.tier` remains unwritable from the client
(RLS + trigger); tier is promoted only by the service-role billing
webhooks (`play-billing-rtdn`, `app-store-verify` Edge Functions).

---

## 3. Onboarding & enrollment flows

### Free signup
1. `WelcomeScreen` → tier choice → tier='free'
2. `FirstRunStack` mounts → `FirstRunScreen`
3. Name + units only (no body metrics, no diet, no auto-plan)
4. `completeFirstRun()` → `MainTabs`

### Pro signup (first-time)
1. `WelcomeScreen` → "Go Pro" → `LoginScreen` → OAuth or email
2. `SIGNED_IN` event → `restoreSessionFromCloud()` (forces tier='pro')
3. `firstRunComplete=false` triggers `ProOnboardingStack`
4. `ProOnboardingScreen` 4-step wizard:
   - Step 1: Account (auto-advances if already authed)
   - Step 2: Profile (firstName, body weight, sex, age, height)
   - Step 3: Training setup (experience, days/week, equipment, goal, phase)
   - Step 4: Recovery + reminders
5. `completeFirstRun()` → `generateAndSavePlan` → `ProSetupComplete` → `MainTabs`

### Pro upgrade (existing user, Free → Pro)
1. User on `MainTabs` (Free) taps "Go Pro"
2. `ProUpgradeScreen` modal → authenticate (OAuth or email)
3. `activatePro()` → `setTier('pro')` + cloud sync
4. Success screen shows **two CTAs**:
   - **"Set up your training"** (primary) — calls `resetFirstRun()`
     which sets `firstRunComplete=false`, causing `RootNavigator` to
     mount `ProOnboardingStack` and run the full wizard. Guarded
     against `activeWorkout` being non-null (refuses with an alert
     telling them to finish their workout first).
   - **"Skip for now"** (secondary link) — just `goBack()` to MainTabs.

### Switch to Free (downgrade)
1. Settings → "Switch to Free" → confirm
2. `setTier('free')` — local-only. Cloud `tier` column doesn't change
   (trigger blocks it). After beta this will be a server-side flip.

### Account deletion
1. Settings → "Delete account" → confirm
2. Client calls Edge Function `delete-account`
3. Edge Function verifies JWT, runs RPC `delete_user_data` (wipes all
   public.* rows for the user), then `auth.admin.deleteUser` (removes
   auth.users row)
4. If Edge Function fails, client falls back to RPC-only and continues
   with local `wipeAllUserData()` regardless
5. `signOut()` and back to `WelcomeScreen`

---

## 4. Database — Supabase

### Tables (current)

| Table | Purpose | RLS | Indexes |
|---|---|---|---|
| users_profile | profile + tier + first_run flag | ✅ own-row | PK |
| exercises | canonical + user-custom | ✅ canonical readable, own custom RW | — |
| routines | plan day templates | ✅ own-row | — |
| routine_exercises | routine ↔ exercise | ✅ via routine | — |
| mesocycles | training blocks | ✅ own-row | — |
| mesocycle_weeks | week-by-week target sets | ✅ via mesocycle | — |
| workouts | session start/end | ✅ own-row | (user_id, started_at DESC) |
| workout_sets | logged sets | ✅ own-row | (workout_id), (exercise_id) |
| volume_landmarks | per-user MV/MEV/MAV/MRV | ✅ own-row | (user_id) |
| weekly_volumes | weekly set totals | ✅ own-row | (user_id, week_start) |
| personal_records | PR snapshots | ✅ own-row | (user_id, exercise_id) |
| body_metrics | bodyweight history | ✅ own-row | (user_id, ts) |
| progress_photos | URLs only | ✅ own-row | (user_id, ts) |
| achievements | unlock log | ✅ own-row | (user_id) |
| weekly_checkins | (legacy v1 schema) | ✅ own-row | (user_id, week_start) |
| weekly_checkins_v2 | modern coach schema | ✅ own-row (migrate_007) | (user_id, week_start DESC) |
| autoregulation_suggestions | coach output cache | ✅ own-row | — |
| programmes | sync layer plan rows | ✅ own-row (migrate_007) | (user_id, is_active) |
| morning_weights | Pro morning weigh-in | ✅ own-row (migrate_007) | (user_id, logged_at DESC) |
| coach_outputs | weekly coach JSON | ✅ own-row (migrate_007) | (user_id, week_start DESC) |
| user_body_profile | Pro body screening | ✅ own-row (migrate_007) | PK (user_id) |
| exercise_user_notes | per-exercise notes | ✅ own-row (migrate_007) | (user_id, exercise_id) |
| debug_log_uploads | beta diagnostics ring-buffer dump | ✅ insert-anywhere | (user_id, ts DESC) |

### Migrations

`supabase/` holds **~88 numbered migrations** (`migrate_001` … `migrate_088`,
with a few gaps and one `085` number collision), plus baselines `schema.sql`
and `setup_complete.sql` (the canonical fresh-deploy combined script).
Highest = **088** (`drop_debug_log_open_insert`). The full ordered list is in
the codebase; recent/notable ones:

- `001`–`014` — early profile/RLS/delete-RPC/sync/feedback hardening
  (014 locked the feedback views with `security_invoker`).
- `033` two-tier consolidation · `042`/`067`/`068` tier-promotion controls ·
  `049` drop `peak_week_plans` (HELD) · `053` `device_push_tokens` ·
  `056` `daily_steps` · `064` `cardio_log` · `065` 14-day trial ·
  `071` trial ledger · `081` training partners (4 tables, EU Dublin, RLS) ·
  `086` `meal_plans` · `087` `cardio_log.ext_id` (passive cardio dedupe) ·
  `088` drop debug-log open insert.
- A long telemetry series (allow-listed, coded-enum / counts only — no PII):
  e.g. `032` paywall, `035`–`041` auth/consent/funnel/lifecycle, `073`–`080`
  session-adjustment/methodology/recap/streak/step-TDEE, `084` watch,
  `085` food-quality.

**Automated deploy (new since this doc's old version):**
`.github/workflows/deploy-migrations.yml` applies `migrate_*.sql` on push to
`main`, tracked in `claude_schema_migrations` (baseline ≤058 pre-seeded; a
HELD list `049`, `059` ships with the app build instead). The old
"paste each migration into the SQL Editor manually" workflow is retired.

**Outstanding founder-action migration (apply manually to EU-Dublin, never
from the app):** `migrate_087_cardio_log_ext_id.sql` (header marks it
"pending founder apply"). `migrate_085_food_quality_telemetry.sql` is on the
auto-deploy path.

### Local SQLite migration runner

A second migration runner lives at `src/lib/database.js` and operates on
the local SQLite file (`volyume.db`). Versioned via `PRAGMA user_version`.
Each entry in `SCHEMA_MIGRATIONS` is one schema version. Recent additions:

| Version | Purpose |
|---|---|
| v21 | backfill `mesocycles.end_date` for rows that predated `activatePlanWithBlock` setting it explicitly |
| v22 | re-issue `mesocycle_weeks.id` for rows using the legacy `mw_<uuid>_<n>` composite format. Postgres mesocycle_weeks.id is a UUID column; the composite IDs failed every cloud push. Migration generates a fresh UUID per bad row and updates planned_muscle_volume, planned_muscle_volume_sync, adaptation_events, adaptation_events_sync, and workouts to point at it, all inside one transaction per row. |
| v23 | scale indexes: `workout_sets(created_at)`, `workout_sets(user_id, created_at)`, `mesocycle_weeks(mesocycle_id)`, `mesocycle_weeks(mesocycle_id, week_index)`, `planned_muscle_volume(mesocycle_week_id)` |

### Tier trigger (`protect_users_profile_tier`)

Fires `BEFORE INSERT OR UPDATE` on `users_profile`. When `auth.uid()` is
non-null (i.e. a normal client call, not service role):
- On INSERT: forces `tier := 'free'`
- On UPDATE: reverts any `tier` change back to OLD.tier

Service-role calls (`auth.uid() = NULL`) bypass this — used by the native
store billing webhooks and Edge Functions for legitimate upgrades. Paid
sign-ups flow through the service-role billing webhooks
(`play-billing-rtdn` for Google Play RTDN, `app-store-verify` /
`app-store-notifications` for StoreKit2) which flip `users_profile.tier`.

### Edge Functions (`supabase/functions/`)

| Function | Purpose |
|---|---|
| `delete-account` | Full account wipe (public.* via RPC + auth.users via admin client). JWT verified, then service-role for `admin.deleteUser`. |
| `play-billing-rtdn` | Google Play Real-Time Developer Notifications → verify + set tier. |
| `app-store-verify` | App Store StoreKit2 receipt verification → set tier. |
| `app-store-notifications` | App Store server-to-server subscription notifications. |
| `partner-cheer` | Training-partner cheer relay (partners system). |
| `send-push` | Server push to `device_push_tokens`. |
| `_shared` | Shared helpers (CORS, auth, clients). |

Edge Function logs use `console.log` / `console.error` at each phase so the
Supabase dashboard shows the exact failure point.

---

## 5. Client-side state model

### Zustand store (`src/store/useAppStore.js`)

Key sections:

- **User identity**: `user` (with `isLocal: bool`), `session`, `isAuthLoading`
- **Tier**: `tier` ('free'|'pro'|null), `tierChecked`. Mutated via `setTier()`.
- **First-run**: `firstRunComplete`, `firstRunChecked`. Mutated via
  `completeFirstRun()` / `resetFirstRun()`.
- **Profile**: `userProfile` (JSON blob; firstName, weightKg, heightCm,
  sex, age, units, trainingGoal, trainingPhase, planWeakPoints, etc.)
- **Workout**: `activeWorkout`, `workoutExercises`, `currentExerciseIndex`
- **Rest timer**: `restTimerActive`, `restTimerRemaining`, `restTimerDuration`
- **Accessibility**: `accessibility.reduceMotion`, etc.

### AsyncStorage keys

| Key | Stores |
|---|---|
| `@volyume_tier_v1` | tier string |
| `@volyume_first_run_complete` | "true"/"false" |
| `@volyume_user_profile_<uid>` | profile JSON per user |
| `@volyume_local_user_id` | anon local user UUID |
| `@volyume_units` | "kg"/"lbs" |
| `@volyume_body_weight_units` | "kg"/"lbs"/"st" |
| `@volyume_error_log_v1` | ring buffer (last 200 entries) |
| `@volyume_crash_log` | most recent fatal (single slot) |
| `@volyume_log_upload_watermark` | last shipped log timestamp |
| `@volyume_ship_debug_logs` | "true"/"false" opt-out |
| `@volyume_a11y_prefs` | accessibility settings |
| `@volyume_block_snooze` | block-advisor snooze timestamps |
| `@volyume_body_metric_seeded_<uid>` | one-time onboarding-weight seed flag |

---

## 6. Auth event flow

`RootNavigator` subscribes to `supabase.auth.onAuthStateChange`. Events:

| Event | Handler |
|---|---|
| `INITIAL_SESSION` | log only — bootstrap path handles hydration |
| `SIGNED_IN` | `restoreSessionFromCloud()` → forces tier='pro' during beta, restores `userProfile` + `firstRunComplete` from cloud row |
| `SIGNED_OUT` | `clearAuthStateForSignOut()` → wipes user/session/tier/profile/firstRun |
| `TOKEN_REFRESHED` | no-op |
| `USER_UPDATED` | no-op |

### Known invariants

- `setTier('free')` only fires from Settings → "Switch to Free" (deliberate)
- `restoreSessionFromCloud` always forces tier='pro' during beta before
  reading the cloud row (the cloud `tier` value is unreliable while the
  trigger blocks client writes)
- `firstRunComplete=true` is mirrored to `users_profile.first_run_complete`
  so a new device pulls the right initial state

---

## 7. Verbose logging (beta)

`VERBOSE_LOGGING = true` in `src/lib/errorLog.js`. Effects:
- `logInfo(scope, msg, ctx)` writes to the ring buffer and console
- `logWarn` and `logError` always do
- The ring buffer is shipped to `debug_log_uploads` on AppState
  foreground (and on Settings → Send logs)

Key instrumentation:
- `auth.event` for every Supabase auth event
- `useAppStore.setTier` warns on every tier transition (with stack trace
  attempt — Hermes mangles async frames so frames are usually unhelpful,
  but for sync callers it surfaces the screen name)
- `restoreSessionFromCloud.start` / `.betaPro` / `.noProfile`
- `clearAuthStateForSignOut` with prevTier/prevUid
- `useAppStore.resetFirstRun`
- `workout.start` / `workout.end`
- `plan.generateAndSave.start` with goal/phase/days
- `coachingGoals.phaseToCoachingKey` warns on unknown phase values

Flip `VERBOSE_LOGGING` to `false` before public launch to silence the
info noise — warnings and errors stay on.

---

## 8. Removed surfaces (recent)

Removed in beta-polish passes and **must not be reintroduced** unless
the Pro setup flow is redesigned:

| Removed | Why |
|---|---|
| `CoachBuilderScreen` (1,350 lines) | 8-step plan-builder wizard that predated ProOnboarding + ProGoalSetup. Pro users now run the 4-step onboarding via the upgrade-success CTA. Free users build via Library or Manual Builder. |
| `OnboardingQuizScreen` (334 lines) | 4-question template recommender — auto-setup is a Pro feature, and only ever reachable from the now-removed CoachBuilder entry point. |
| `FirstRunScreen` "branch" mode | Path-picker UI for Pro first-run; Pro users now route through `ProOnboardingStack` instead. Free is the only consumer of `FirstRunStack` now. |
| Auto warm-up suggestion chip (ActiveWorkoutScreen) | Auto-appeared on every exercise's first set when working weight ≥ 20 kg. Didn't make sense in supersets and pushed extra friction. Users now mark warm-ups manually via the Set type picker on the SetEntry card — same data, no prompt. The sheet + suggest handler + ~200 lines of orphan code were deleted with it. |
| Web entry point | iPhone + Android only. `react-native-web`, `react-dom`, `@expo/metro-runtime`, the `web` script in `package.json`, and the `expo.web` block in `app.json` removed in May 2026. The accelerometer in `FeedbackSheet` retains an explicit `Platform.OS === 'web'` bypass for any developer running `expo start --web` for screenshots. |

If you see these names in older docs (APPMAP.md, ARCHITECTURE.md,
VOLYUME_DEEPMAP.md), that text is stale.

---

## 9. Pre-launch open items

From the multi-agent audit (2026-05-21):

| Severity | Area | Status |
|---|---|---|
| Critical | RLS on 6 Pro sync tables | ✅ Fixed (migrate_007) |
| Critical | Tier trigger UPDATE-only | ✅ Fixed (migrate_007) |
| Critical | Legacy profiles couldn't regenerate (no trainingPhase) | ✅ Fixed (planAutoGen fallback) |
| Critical | delete-account FK violation on auth.users | ✅ Fixed (migrate_006) |
| High | `resetFirstRun` could yank mid-workout | ✅ Fixed (guard added) |
| High | `phaseToCoachingKey` silent fallback | ✅ Fixed (logs warn) |
| Medium | Excess `useAppStore()` subscriptions causing re-renders | ✅ Fixed (5 hottest screens migrated to useShallow) |
| Medium | OAuth instrumentation gaps | ✅ Fixed (logInfo/logError at every decision point in Login + ProUpgrade + ProOnboarding) |
| Medium | Determinism not asserted for `generatePlan()` | ✅ Fixed (audit-stress.test.js) |
| Medium | Free `FirstRunScreen` doesn't surface a "what now" hint | ✅ Fixed (hint card pointing to Plans tab) |
| Low | Stack traces on `setTier` are useless under Hermes | ✅ Fixed (explicit callerScope param, all 4 deliberate callers tagged) |
| Low | `refreshTierFromCloud` no timeout | ✅ Fixed (5s Promise.race timeout, warn on failure) |
| Low | AsyncStorage not atomic with store set() | ✅ Fixed (persist before set; failures logged) |
| Low | ProOnboarding skipped `goalStartDate` for cut-phase entry | ✅ Fixed (set on onboarding into a deficit phase) |
| Low | `selectSplit` silent fallback on out-of-range days | ✅ Fixed (logs warn) |
| Low | Missing accessibility on RestTimer / SetEntry 1RM | ✅ Fixed (labels + liveRegion) |
| Low | RestTimer notification leak on sign-out mid-rest | ✅ Fixed (cleanup cancels lock-screen notif + clears interval) |
| Low | ActiveWorkout AppState.remove() unguarded | ✅ Fixed (try/catch) |

---

## 10. Build + CI

### Workflows (`.github/workflows/`)

- **`build-android.yml`** — free GitHub-runner build (no EAS credits) on
  push to `main` / `claude/**` (docs/markdown paths ignored). Artifacts below.
- **`build-ios.yml`** — **manual only** (`workflow_dispatch`; each EAS iOS
  build costs credits). Builds via EAS cloud → submits to TestFlight.
- **`main-ci.yml`** — jest + eslint + Expo Doctor on push to `main` /
  `claude/**` and PRs to `main`.
- **`deploy-migrations.yml`** — auto-applies `supabase/migrate_*.sql` on push
  to `main` (see §4).
- **`deploy-functions.yml`** — deploys Edge Functions.
- Plus `deploy-pages`, `identity-invariant`, `print-signing-sha`,
  `refresh-off-snapshot`.

### Android build artifacts

`build-android.yml` produces two artifacts per build:

- `volyume-release-apk-<run>` — for sideload testing (debug-signed
  when the upload-keystore secrets aren't set, upload-signed when
  they are)
- `volyume-release-aab-<run>` — the Play Store format

### Upload keystore

Generated once and persisted as four GitHub secrets:

| Secret | Source |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | `base64 -w0 volyume-upload.keystore` |
| `ANDROID_KEYSTORE_PASSWORD` | the keystore password |
| `ANDROID_KEY_ALIAS` | `volyume-upload` |
| `ANDROID_KEY_PASSWORD` | same as keystore password (PKCS12) |

The workflow decodes the keystore, writes the four
`VOLYUME_UPLOAD_*` properties into `android/gradle.properties`, then
patches `android/app/build.gradle` to point the release `buildType`
at `signingConfigs.release` (Expo's prebuild template hard-codes
`signingConfigs.debug`). If `ANDROID_KEYSTORE_BASE64` is empty the
step bails gracefully and the build uses the debug keystore — the
APK still installs for sideload but the AAB can't be uploaded to
Play because the signing certificate doesn't match anything Play
trusts. **Losing the keystore = losing the ability to ship updates to
Play forever**, so it's also kept outside GitHub in a password
manager.

### Sentry + environment vars

Passed through the workflow at both `prebuild` and `gradle assemble`
steps:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_SENTRY_DSN`

All three live as GitHub repo secrets.

### OTA updates (`expo-updates`)

`App.js` checks for updates on every cold launch in production and
prompts "Restart now" when one is available. `runtimeVersion.policy`
is `appVersion` so JS-only updates only reach clients on the same
binary `version`. EAS is now configured: `app.json extra.eas.projectId`
is the real `2f60a6ed-8b37-4cd6-8057-60ee04e39ea8` (owner/slug `volyume`),
and `eas.json` defines `development` / `preview` / `production` build
profiles plus a Play `internal`-track submit profile
(`appVersionSource: remote`, production `autoIncrement`).

---

## 11. Deployment checklist

### Play Store closed beta (this release)

1. ☑ Upload keystore generated, base64 + password stored in GitHub secrets
2. ☑ Sentry DSN secret wired through CI to both prebuild and assemble steps
3. ☑ Migrations auto-deploy via `deploy-migrations.yml` (baseline through 088;
   `migrate_087` is a manual founder-apply, see §4)
4. ☑ `volyume.app` domain owned + universal links wired
5. ☑ Play Console listing — see `docs/PLAY_STORE_LISTING.md` and the
   `docs/playstore-readiness-2026-06-06/` set
6. ☑ Privacy policy hosted at `volyume.app/privacy` (source `public/privacy-policy.md`)
7. ☐ Google Cloud OAuth client with the Play App Signing SHA-1 (verify current)

### Paid mode (now LIVE — `PRO_BETA_ACTIVE = false`)

1. ☑ Native store IAP via `react-native-iap` (Play Billing + StoreKit2);
   products `pro_monthly` / `pro_annual`
2. ☑ Service-role billing webhooks flip `users_profile.tier`
   (`play-billing-rtdn`, `app-store-verify`, `app-store-notifications`)
3. ☑ Day-21 trial cascade + differential paywall live
4. ☐ `VERBOSE_LOGGING` is still `true` in `src/lib/errorLog.js` — set to
   `false` before broad public launch to silence info noise (warnings/errors
   stay on)
5. ☐ Server push is wired (`send-push` + `device_push_tokens`); confirm
   FCM/APNs credentials per environment

---

## 12. Recent changes (May 2026 beta-prep branch)

This branch (`claude/fix-session-api-errors-PqkZo`) merged ~30 fixes,
~200 polish edits, and ~470 new tests on top of the May 21 polish pass.
The highlights:

### Real bugs fixed

- **`mesocycle_weeks` UUID format mismatch** — the cause of the
  `invalid input syntax for type uuid: "mw_..._1"` warnings in the
  user's debug log. Local IDs were composite `mw_<uuid>_<n>` strings;
  Postgres column is UUID. Fixed at the write site + migration v22
  re-issues existing rows.
- **`errorLog` PII leak** — the on-device ring buffer (exportable via
  Settings → Debug Logs) stored raw context with workout notes, body
  weights, emails, tokens. The same raw context was forwarded to
  Sentry. Now redacted at the top of `logError/logWarn/logInfo` with
  an expanded `PII_KEYS` list covering snake_case + camelCase auth
  secrets, body metrics, names, free-text notes.
- **Feedback dashboard view RLS bypass** — Supabase views bypass
  underlying table RLS by default. The two feedback dashboard views
  could be read by any authenticated user. Migration 014 locks them
  down with `security_invoker = true` + REVOKEs.
- **Feedback offline-queue slicing dropped failed items** — when an
  interleaved pass/fail flush happened, the surviving "tail slice"
  kept the wrong items. Now collects specific failed items into a
  separate list.
- **`planned_muscle_volume` and `adaptation_events` never reached the
  cloud** — sync getters read from `_sync` mirror tables that only
  cloud-pull writes to. Now read from the primary tables via JOIN
  through `mesocycle_weeks → mesocycles` for user_id.
- **ActiveWorkout `useAppStore()` unscoped re-renders** — every rest
  timer tick re-rendered the 2255-line screen. Now uses `useShallow`
  with explicit field selection.
- **`ActiveWorkoutScreen` × 5 unsafe `entry.sets.length`** — render
  paths that didn't guard against undefined `sets`.
- **`OnboardingScreen` rapid-tap step overflow** — double-tap on Next
  from the last step blew past `STEPS.length`.
- **`PRWallScreen` empty-history crash** on an exercise with no logged
  sets.
- **Timezone / DST bugs** in `getRelativeDay`, `logMorningWeight`,
  `getMorningWeightToday`, `getCurrentMesoWeek`. All switched from
  UTC epoch math to local-calendar comparisons.
- **`loadHistory` stale setState on rapid exercise swap** — `cancelled`
  flag with cleanup in the useEffect.
- **`installShutdownHandler` AppState leak** — subscription memoised +
  uninstall helper exported.
- **Importer DoS** — `parseCSV` capped at 100,000 rows.
- **NutritionTargets resilience** — `useShallow` selector, navigation
  prop passed through, defensive `targetKcal` fallbacks. Should fix
  the on-tap crash the user reported.

### Elite-feel polish added

- **Plate calculator wired to the SetEntry weight row** — pill button
  next to the Weight label opens the existing (previously unused)
  `PlateCalculator` component pre-filled with the current weight.
- **Live e1RM** inline on the Reps row of SetEntry once weight + reps
  are both entered.
- **Repeat-last quick chip** above the SetEntry card — one tap to
  duplicate the most recent logged set's weight + reps.
- **Stalled-progress nudge** on ActiveWorkoutScreen when the same
  heaviest weight × reps has been logged 3 sessions running on the
  same exercise.
- **Week-streak flame chip** on the HomeScreen "This week" card,
  counting consecutive Mon-start weeks with ≥1 workout.
- **Mesocycle-context chip** under the workout card showing
  "Week 3 of 6 · RIR 1" or "Deload week" so the user sees the
  coaching block context before every session.
- **BETA badge** in Settings → About.
- **Tester-friendly build identifier** in Settings → version line:
  tap the version to share `Volyume v1.1.0 (android 2, release)`.
- **Discard workout** now hard-deletes the row + sets so SQLite
  doesn't accumulate orphaned in-progress sessions.
- **Finish workout double-tap guard** so mashing the button can't
  fire two concurrent finish chains.

### Tests added

- 26 jest suites, **903 tests** (up from ~409 at the start of the branch).
- Screen mount harness: every Pro-reachable screen mounted under
  react-test-renderer with 4 state variants, 7600+ simulated taps,
  rapid double-tap stress, fuzz chains, and form workflow.
- 12-week coaching simulation + 20 adversarial scenarios.
- Error log + feedback pipeline coverage (22 tests including the
  PII-reaches-Sentry regression + the interleaved-fail queue case).
