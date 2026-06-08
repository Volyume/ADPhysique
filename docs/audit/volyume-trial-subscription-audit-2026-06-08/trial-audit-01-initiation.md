# Trial Audit 01 — Trial initiation

Date: 2026-06-08. Method: every claim cited to a file and line read directly
(no agents). HEAD `2bc18fa`. Deployed server logic is migration 068 (the GUC
rewrite that supersedes 030/033/065/067 function bodies); `supabase/README.md`
records 060–069 applied remotely 2026-06-06/07, with 068's verification query
still outstanding.

## Where the 14-day trial starts (trigger)

- The trial is started by a **client RPC call**, not on account creation or
  login. It fires when the user taps **Continue** on the Article 9 health-data
  consent screen: `src/screens/Article9ConsentScreen.js:112`
  `await cascade.startCascade()`, inside `handleContinue` (declared `:44`,
  bound to the Continue button at `:193-194`).
- `cascade.startCascade()` calls the server RPC `start_cascade`:
  `src/lib/payments/cascade.js:104-105` (`_call('start_cascade', {})`).
- Consequence: a user who never reaches Article 9 (e.g. chooses Free at
  Welcome) never starts a trial. "On signup" in the spec = "at Article 9
  consent during Pro onboarding." Cited gap noted in 06b.

## What the trial-start writes, and where (server-side)

Deployed `start_cascade` — `supabase/migrate_068_tier_trigger_guc_bypass.sql:93-143`:
- `:123` `ends_at := starts_at + interval '14 days';` (the 14-day value).
- `:126-131` `UPDATE users_profile SET tier='pro', trial_state='pro_trial_active',
  trial_started_at=starts_at, pro_trial_ends_at=ends_at WHERE id=uid;`
- `:134-135` writes a `tier_history` row (`free → pro_trial`, reason `admin`,
  surface `onboarding_article9`).

Schema (columns written): `supabase/migrate_030_tier_infrastructure.sql:31-47`
adds `trial_state` (NOT NULL DEFAULT `'unstarted'`, CHECK enum `:32-41`),
`trial_started_at` `:42`, `pro_trial_ends_at` `:44`.

So the trial timestamp + state are **server-side** in `users_profile`
(`trial_started_at`, `pro_trial_ends_at`, `trial_state`), written by a
`SECURITY DEFINER` RPC.

## Trial duration = 14 days

- Deployed: `migrate_068:123` `interval '14 days'`.
- Original definitions agree: `migrate_030:199` and (per README) `migrate_065`
  both set `interval '14 days'`. The Play 7-day half is a Play Console offer,
  not in the DB (`migrate_068:121-122` comment).

## Can the trial be reset / re-started?

- `start_cascade` is idempotent: `migrate_068:114-119` — if `trial_state <>
  'unstarted'` it no-ops and returns `already_started`. So calling it again
  while active does nothing.
- BUT the idempotency guard keys off `trial_state`. `trial_state` and
  `pro_trial_ends_at` are **client-writable** (see 05): the `protect_users_
  profile_tier` trigger guards only `tier` (`migrate_068:60-82` checks only
  `NEW.tier`), and RLS allows a user to UPDATE their own row
  (`migrate_005_rls_hardening.sql:33-35`, `FOR ALL USING (auth.uid()=id) WITH
  CHECK (auth.uid()=id)`). A user could `UPDATE users_profile SET
  trial_state='unstarted'` then re-call `start_cascade` for a fresh 14 days, or
  push `pro_trial_ends_at` into the future. CRITICAL — detailed in 05/06b.

## Entitlement during the 14 days

- Resolver: `src/lib/proGate.js:_resolveTier (:39-53)` returns `'pro'` for
  `pro_trial_active`; `isPaidTier (:62-64)` reads `userProfile.trialState`.
  `PRO_BETA_ACTIVE = false` (`:28`).
- **The actual gate does NOT call `_resolveTier`.** Every Pro gate checks
  `store.tier === 'pro'`: `src/components/ProGate.js:25,31` (component) and
  `:125-126` (`withProGuard` route guard). `store.tier` is the cached/server
  `tier` column, not a live `trial_state` computation.
- `store.tier` lifecycle:
  - Launch: `src/store/useAppStore.js:checkTier (:507-523)` reads cached
    `TIER_KEY` from AsyncStorage (`:509`, set in store `:519`).
  - Cloud: `refreshTierFromCloud (:784-848)` reads the server `tier` column
    (`:789`) and writes it to store + AsyncStorage (`:819`, `:829-839`).
  - Purchase: `setOptimisticPaid (:468-472)` forces `tier='pro'` for 5 min.
- Where the gate is evaluated: on every render of a `ProGate`/`withProGuard`
  subtree (reactive to `store.tier`). It is NOT re-validated against the server
  on every navigation; server reconciliation is only `refreshTierFromCloud`,
  which runs after sign-in (`RootNavigator.js:612`, `:778`) — fire-and-forget.
- Server vs local: the gate reads a **local cached value** (`store.tier`),
  reconciled from the server only when `refreshTierFromCloud` succeeds (online).
  Offline/launch-window behaviour is the bypass surface (05).
