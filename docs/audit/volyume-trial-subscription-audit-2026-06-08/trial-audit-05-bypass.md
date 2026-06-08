# Trial Audit 05 — Bypass audit

Date: 2026-06-08. Citations from files read directly.

## Entitlement gate audit — every gate uses one check

- Component gate: `src/components/ProGate.js:25` `const tier =
  useAppStore(s => s.tier)`; `:31` `if (tier === 'pro') return children` else
  lock overlay.
- Route guard: `src/components/ProGate.js:123-128` `withProGuard`; `:125`
  `const tier = useAppStore(s => s.tier)`; `:126` `if (tier !== 'pro') return
  <ProLocked/>`.
- All Pro routes are wrapped with `withProGuard` in `RootNavigator.js`
  (`:114-120` GatedWeeklyCheckIn / NutritionTargets / BodyMetrics / CoachOutput
  / ProGoalSetup / CoachingReminders / PlanUpdate, plus cardio).
- The check is **consistent** (single `store.tier === 'pro'` everywhere). Good:
  no divergent gate logic found. (Caveat: a per-feature sweep of *shared* screens
  for Pro content rendered without a `ProGate` wrapper was not exhaustively
  completed — gating is documented as all-or-nothing in `proGate.js:6-7`, but
  this should be confirmed screen-by-screen before sign-off. Noted MEDIUM.)

## CRITICAL #1 — Client can extend/reset the trial via the DB

- RLS on `users_profile`: `supabase/migrate_005_rls_hardening.sql:33-35`
  `FOR ALL USING (auth.uid()=id) WITH CHECK (auth.uid()=id)`. An authenticated
  user can UPDATE their own row via PostgREST.
- The protect trigger guards **only `tier`**: `migrate_068:60-82`
  (`protect_users_profile_tier`) reverts `NEW.tier` only; `trial_state`,
  `pro_trial_ends_at`, `trial_started_at` are unguarded.
- Exploit A (extend): `UPDATE users_profile SET pro_trial_ends_at = '2099-01-01'
  WHERE id = <self>` → the worker's `pro_trial_ends_at <= now()` test
  (`migrate_068:435`) never matches → never downgraded → `tier` stays `'pro'`.
- Exploit B (reset): `UPDATE users_profile SET trial_state='unstarted'` (allowed
  by the enum CHECK `migrate_030:32-41` and RLS) then call `start_cascade()` →
  fresh 14-day trial, `tier='pro'` again (`migrate_068:114-131`).
- Severity: CRITICAL (free Pro indefinitely for any user who can sign a Supabase
  request). Fix: a trigger/RLS that blocks client writes to
  `trial_state`/`pro_trial_ends_at`/`trial_started_at` (server RPCs set them via
  the `app.allow_tier_change` GUC, so they can be guarded the same way `tier`
  is).

## CRITICAL #2 — Offline / cached-entitlement loophole

- Launch entitlement = cached AsyncStorage value: `useAppStore.js:checkTier
  (:507-523)` → `:509` reads `TIER_KEY`, `:519` `set({ tier: saved })`. No
  comparison to `pro_trial_ends_at`.
- Cloud reconciliation can't run offline: `refreshTierFromCloud (:784-848)` has
  a 5s timeout (`:794`) and on timeout/error hits the catch (`:841-847`) and
  **leaves `store.tier` unchanged** (cached `'pro'`).
- Combined with 02 (no client-side expiry check), a user whose trial/sub has
  expired server-side but who is offline keeps `store.tier='pro'` → all gates
  pass, indefinitely, until a successful cloud read. Severity: HIGH (CRITICAL if
  trivially reproducible by disabling network). Fix: store `pro_trial_ends_at`
  with the cached tier and have `checkTier` downgrade locally when
  `now > pro_trial_ends_at` and not `paid_pro`.

## HIGH — Startup-timing window

- `checkTier()` is awaited at bootstrap (`RootNavigator.js:572`) and the splash
  gate only waits for `tierChecked` (`:956` `if (!splashReady ||
  !firstRunChecked || !tierChecked) return <Splash/>`). `refreshTierFromCloud`
  is fire-and-forget (`:612`, `:778`) and not awaited before routing.
- So every launch renders with the **cached** tier first; the server
  reconciliation lands later (up to the 5s timeout, or never offline). A
  recently-expired user gets a Pro-access window each launch. Severity: HIGH.
  Fix: gate Pro routes on a "tier verified this session" flag, or block Pro
  surfaces until the first `refreshTierFromCloud` resolves (with the offline
  local-expiry fallback from #2).

## Navigation bypass

- `withProGuard` enforces at the screen regardless of how it is reached (deep
  link / stale nav state) — `ProGate.js:123-128`. A direct navigation to a Pro
  route with `tier!=='pro'` renders `ProLocked`. No navigation bypass found
  **for routes that are wrapped**. (Same caveat as the gate audit: confirm no
  Pro content sits on an unwrapped shared screen.)

## Race conditions

- `ProGate`/`withProGuard` read `store.tier` synchronously at render and
  re-render on change. The async risk is the startup window (#3): during the
  fire-and-forget `refreshTierFromCloud`, `store.tier` is the cached value, so a
  stale `'pro'` shows Pro until the cloud read flips it. Same root as #2/#3.
- The optimistic-paid window (`setOptimisticPaid :468-472`, honoured at
  `:814-816`) deliberately holds `'pro'` for 5 min after a purchase; it cannot
  be triggered without a `purchasePackage`/`restore` call, and it reverts after
  5 min if the server never grants. Not a user-exploitable bypass on its own.

## Summary of bypass severities
- CRITICAL: direct DB trial extend/reset (RLS + unguarded trial columns).
- CRITICAL/HIGH: offline cached-tier with no local expiry check.
- HIGH: startup-timing window using cached tier before cloud reconcile.
- (Plus the 04 finding: paid cancel/refund never revokes until Pub/Sub wired.)
