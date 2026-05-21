# Volyume — Infrastructure & Current State

Source of truth for the runtime configuration, schema, security posture,
and recent flow changes. Last updated 2026-05-21 (beta polishing pass).

If anything in `ARCHITECTURE.md` / `APPMAP.md` / `VOLYUME_DEEPMAP.md`
conflicts with this file, this file wins.

---

## 1. Runtime

| Surface | Tech | Notes |
|---|---|---|
| Mobile app | React Native + Expo SDK ~51 | Hermes JS engine; OTA via `expo-updates` |
| Local DB | `expo-sqlite` | Migration runner in `src/lib/database.js` |
| State | Zustand | Single store at `src/store/useAppStore.js`, AsyncStorage persistence |
| Backend | Supabase | Postgres + Auth + Edge Functions (Deno) |
| Auth | Supabase email/password + Google OAuth + Apple OAuth | Deep link `volyume://` |
| Notifications | `expo-notifications` | Local schedule; no FCM/APNs server push yet |
| Audio | `expo-av` | Synthesised WAV beeps for rest-timer countdown |
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

**Beta override:** `PRO_BETA_ACTIVE = true` in `src/lib/proGate.js` forces
every cloud-authenticated user to Pro. Cloud `users_profile.tier` is
unwritable from the client (RLS + trigger) so this constant is the
authoritative answer during beta. Set to `false` and re-enable cloud
writes to flip to paid mode.

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

### Migrations applied

| File | Purpose |
|---|---|
| `schema.sql` | initial table set |
| `setup_complete.sql` | canonical "fresh deploy" combined script (kept in sync with migrations) |
| `migrate_001_profile_columns.sql` | profile fields |
| `migrate_002_beta_tester.sql` | beta flag |
| `migrate_003_delete_rpc.sql` | initial delete RPC (v1) |
| `migrate_004_schema_improvements.sql` | schema tweaks |
| `migrate_005_rls_hardening.sql` | RLS hardening + tier trigger (UPDATE only) |
| `migrate_006_delete_rpc_v2.sql` | delete RPC v2 — wipes 9 additional tables to fix auth deletion FK violations |
| `migrate_007_pro_rls_hardening.sql` | **RLS on 6 Pro sync tables (programmes / morning_weights / coach_outputs / user_body_profile / exercise_user_notes / weekly_checkins_v2), tier trigger extended to INSERT** |

Migrations are applied via Supabase Dashboard → SQL Editor. There's no
automated runner — each new migration must be pasted and executed manually.

### Tier trigger (`protect_users_profile_tier`)

Fires `BEFORE INSERT OR UPDATE` on `users_profile`. When `auth.uid()` is
non-null (i.e. a normal client call, not service role):
- On INSERT: forces `tier := 'free'`
- On UPDATE: reverts any `tier` change back to OLD.tier

Service-role calls (`auth.uid() = NULL`) bypass this — used by Stripe
webhooks and Edge Functions for legitimate upgrades. Post-beta, paid
sign-ups will flow through a service-role webhook that flips tier.

### Edge Functions

| Function | Purpose | Auth |
|---|---|---|
| `delete-account` | full account wipe (public.* via RPC + auth.users via admin client) | JWT verified via anon client, then service-role for admin.deleteUser |

Edge Function logs use `console.log` / `console.error` at each phase
(invoke start, user verified, public data wiped, auth user deleted, per
failure branch) so the Supabase dashboard shows the exact failure point.

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

Removed in this beta-polish pass and **must not be reintroduced** unless
the Pro setup flow is redesigned:

| Removed | Why |
|---|---|
| `CoachBuilderScreen` (1,350 lines) | 8-step plan-builder wizard that predated ProOnboarding + ProGoalSetup. Pro users now run the 4-step onboarding via the upgrade-success CTA. Free users build via Library or Manual Builder. |
| `OnboardingQuizScreen` (334 lines) | 4-question template recommender — auto-setup is a Pro feature, and only ever reachable from the now-removed CoachBuilder entry point. |
| `FirstRunScreen` "branch" mode | Path-picker UI for Pro first-run; Pro users now route through `ProOnboardingStack` instead. Free is the only consumer of `FirstRunStack` now. |

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
| Medium | Excess `useAppStore()` subscriptions causing re-renders | ⚠ Open — performance only |
| Medium | OAuth instrumentation gaps | ⚠ Open — diagnostic only |
| Medium | Determinism not asserted for `generatePlan()` | ⚠ Open — testing gap |
| Medium | Free `FirstRunScreen` doesn't surface a "what now" hint | ⚠ Open — UX |
| Low | Stack traces on `setTier` are useless under Hermes | ⚠ Open — would need explicit caller-tag refactor |

---

## 10. Deployment checklist

Before flipping `PRO_BETA_ACTIVE` to `false`:

1. ☐ Stripe webhook hooked up to flip `users_profile.tier` server-side
2. ☐ Service-role function for "your trial expired" downgrades
3. ☐ `users_profile` UPDATE trigger updated to allow service-role tier promotion
4. ☐ All migrations applied to production: 001–007 in order
5. ☐ Edge Functions deployed: `delete-account` with secrets
6. ☐ `VERBOSE_LOGGING` set to `false`
7. ☐ Sentry / equivalent crash reporting enabled
8. ☐ Push notification setup (FCM + APNs) — currently local-only
