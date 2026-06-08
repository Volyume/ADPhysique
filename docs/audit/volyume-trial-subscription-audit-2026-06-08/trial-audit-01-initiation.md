# Trial Audit 01 — Trial initiation

Date: 2026-06-08. Repo at `main` HEAD `3188e37` (tree == `2bc18fa`). Every claim
cites a file:line read directly this session. No agents. The deployed server
functions are migration 068 (it re-created `start_cascade`, `upgrade_tier`,
`upgrade_tier_for_user`, `cascade_advance_due_users`); per `CURRENT_STATUS.md`
§3 footer + §0 (2026-06-07), migrations 060–069 are applied.

Prior decisions noted (pre-work): `COMPLETE_TIER_SCOPE_LOCKED.md:91-98` — the
trial is a **one-time, server-side entitlement** that "cannot re-enter the trial
later." `05-security-audit.md:52-55` cleared "a user cannot forge Pro" but only
inspected the `tier` column.

## THE 14-DAY TRIAL START

**Where the start timestamp is written (table.column, file:line).**
`users_profile.trial_started_at` and `users_profile.pro_trial_ends_at`, written
by the `start_cascade` RPC: `supabase/migrate_068_tier_trigger_guc_bypass.sql:126-131`:
```
UPDATE users_profile SET
  tier='pro', trial_state='pro_trial_active',
  trial_started_at=starts_at, pro_trial_ends_at=ends_at WHERE id=uid;
```
Columns defined in `supabase/migrate_030_tier_infrastructure.sql:42` (`trial_started_at`)
and `:44` (`pro_trial_ends_at`); `trial_state` `:31-41`.

**When it is written (trigger path).** NOT on account creation or login. It fires
at the **Article 9 health-consent Continue tap**:
`src/screens/Article9ConsentScreen.js:112` `await cascade.startCascade()` inside
`handleContinue` (declared `:44`, bound to the Continue button at `:193-194`).
`cascade.startCascade` calls the RPC at `src/lib/payments/cascade.js:104-105`
(`_call('start_cascade', {})`).
- GAP vs spec Step 1 ("User signs up… they receive 14 days"): the trial is gated
  on reaching and accepting the Article 9 consent screen, which is part of the
  **Pro onboarding** path. A user who chooses Free at Welcome, or never reaches
  consent, never starts a trial. There is no file:line where signup/account
  creation alone starts the 14 days. Severity: MEDIUM (flow nuance).

**Trial duration = 14 days, hardcoded.** `migrate_068:123`
`ends_at := starts_at + interval '14 days';`. (First set to 14 by `migrate_065`;
068 is the deployed re-creation.)

**Server-side or client-only?** SERVER-SIDE. The values live in `users_profile`
(Supabase) and are written by a `SECURITY DEFINER` RPC (`migrate_068:93-143`),
not computed on the client. CONFIRMED, not a client-only timer.

**Can the trial start be reset? — YES (CRITICAL bypass).**
1. `start_cascade` itself is idempotent: `migrate_068:114-119` no-ops unless
   `trial_state='unstarted'`.
2. BUT `trial_state` / `pro_trial_ends_at` / `trial_started_at` are **directly
   client-writable**:
   - RLS: `supabase/migrate_005_rls_hardening.sql:33-35` —
     `"Users can read/write own profile" … FOR ALL USING (auth.uid()=id) WITH
     CHECK (auth.uid()=id)`. A signed-in user may UPDATE their own row.
   - The protect trigger guards **only `tier`**:
     `migrate_068:60-82` (`protect_users_profile_tier`) — the only revert is
     `IF NEW.tier IS DISTINCT FROM OLD.tier THEN NEW.tier := OLD.tier` (`:67-71`).
     `trial_state`, `pro_trial_ends_at`, `trial_started_at` are not touched.
   - The profile sync push also never sends these (so nothing legitimate writes
     them client-side): `src/lib/sync/tables/profiles.js:27-35` FIELD_MAP maps
     only `first_name, units, training_focus, training_age, primary_equipment,
     bar_weight, diet_preference`.
   - Exploit A: `UPDATE users_profile SET pro_trial_ends_at = now()+interval
     '999 days'` → the expiry worker's `pro_trial_ends_at <= now()`
     (`migrate_068:435`) never matches → never downgraded.
   - Exploit B: `UPDATE users_profile SET trial_state='unstarted'` (a valid enum
     value, `migrate_030:32-41`) → call `start_cascade` again → fresh 14 days.
   Both directly violate the locked one-time-trial rule
   (`COMPLETE_TIER_SCOPE_LOCKED.md:91-98`). Severity: CRITICAL.

## TRIAL ENTITLEMENT DURING THE 14 DAYS

**The function that determines the active gate.** The operative gate is
`store.tier === 'pro'`, NOT a live trial calculation:
- `src/components/ProGate.js:25` `const tier = useAppStore(s => s.tier)`; `:31`
  `if (tier === 'pro') return children`.
- `src/components/ProGate.js:123-128` `withProGuard`: `:125` reads `store.tier`,
  `:126` `if (tier !== 'pro') return <ProLocked/>`.
- `src/lib/proGate.js:_resolveTier (:39-53)` maps `pro_trial_active → 'pro'`, but
  it is NOT what the gate reads at runtime; it is used to set `store.tier` in a
  couple of places (e.g. `cascade.startCascade` mirror, `cascade.js:120-125`).

**`store.tier` source (server vs local).**
- Launch (local, offline-capable): `src/store/useAppStore.js:checkTier (:507-523)`
  reads the cached `TIER_KEY` from AsyncStorage (`:509`), sets `store.tier`
  (`:519`). There is NO comparison to `pro_trial_ends_at` here.
- Cloud (server): `refreshTierFromCloud (:784-848)` reads `users_profile.tier`
  (`:789`) and writes it to `store.tier` + AsyncStorage (`:819`, `:829-839`).

**Where the gate is evaluated (call sites).** Every Pro route via `withProGuard`
in `src/navigation/RootNavigator.js`: `GatedWeeklyCheckIn (:114)`,
`GatedNutritionTargets (:115)`, `GatedBodyMetrics (:116)`, `GatedCoachOutput
(:117)`, `GatedProGoalSetup (:118)`, `GatedCoachingReminders (:119)`, plus
gated cardio screens; and any `<ProGate>` component subtree. The gate
re-evaluates reactively on `store.tier` change (render-time), NOT via a
server check on each navigation.

**Server timestamp or local value?** The gate reads a **local cached value**
(`store.tier`). It is reconciled to the server only when `refreshTierFromCloud`
succeeds. So during the trial the user is Pro because `store.tier='pro'` (set by
`start_cascade`'s mirror + the cloud read). The correctness of the gate depends
entirely on `store.tier` being current — examined in Phase 5.

**Checked every launch / navigation?** `checkTier()` is awaited once at
bootstrap (`RootNavigator.js:572`); `refreshTierFromCloud` is fire-and-forget on
sign-in (`:612`, `:778`), not awaited and not per-navigation.
