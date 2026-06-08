# Trial Audit 02 — Trial expiry

Date: 2026-06-08. Citations from files read directly.

## Expiry detection — server-side cron, NOT client

- The expiry is detected and enacted by a **pg_cron worker**, server-side.
  Worker body (deployed): `supabase/migrate_068:417-461`
  `cascade_advance_due_users()`:
  - `:431-435` selects `users_profile` where `trial_state='pro_trial_active'
    AND pro_trial_ends_at IS NOT NULL AND pro_trial_ends_at <= now()`.
  - `:438-442` `UPDATE ... SET trial_state='cascade_expired', tier='free'`.
  - `:444-449` writes a `tier_history` row (`pro_trial → free`,
    `auto_downgrade`).
- Schedule: `supabase/migrate_031_cascade_workers.sql:127-131`
  `cron.schedule('cascade-advance-due-users', '*/15 * * * *', $cron$SELECT
  cascade_advance_due_users();$cron$)` — every 15 minutes. (031 created the
  schedule; 068 re-created the function body it calls.)
- Calculation: `pro_trial_ends_at <= now()` (`migrate_068:435`), where
  `pro_trial_ends_at = trial_started_at + interval '14 days'` (`:123`).

So expiry is **proactive on the server** (within 15 min of the 14-day mark),
**reactive on the client** (the client only learns via `refreshTierFromCloud`).

## No client-side expiry enforcement

- The client computes days for display only: `src/lib/payments/cascade.js:
  daysRemaining (:330-344)` (returns days from `proTrialEndsAt`). It is read in
  `src/screens/SubscriptionScreen.js:49`. **Nothing on the client compares
  `now` to `pro_trial_ends_at` and sets `tier='free'`.** Verified: no such
  check in `useAppStore.js` tier path (`checkTier :507-523`,
  `refreshTierFromCloud :784-848`) or `proGate.js`.
- Therefore, if the client never reaches the server (offline) after expiry, the
  cached `store.tier='pro'` persists (see 05). HIGH/ CRITICAL.

## The Google Play prompt at expiry — NOT forced, NOT automatic

- The prompt is `CascadeGateScreen` (`src/screens/CascadeGateScreen.js`),
  registered as a **dismissible modal**: `src/navigation/RootNavigator.js:357`
  (`presentation: 'modal'`), with a close (X) button at
  `CascadeGateScreen.js:214-216`.
- It is reached only by:
  1. Tapping the trial-ending **notification**:
     `src/lib/notifications/notificationRoute.js:24-27` maps `data.type
     ==='cascade_gate'` → `{ tab:'ProfileTab', screen:'CascadeGate',
     params:{variant:'day14'} }`.
  2. Manually: `src/screens/SubscriptionScreen.js:123`
     `navigation.navigate('CascadeGate', { variant:'day14', period })`.
- There is **no launch-time / Home-screen trigger**. Verified by direct read:
  no `CascadeGate` navigation and no `stageOf`/`daysRemaining` gate in
  `HomeScreen.js` or `App.js`.
- The notifications themselves: `src/lib/notifications/scheduler.js`
  `scheduleCascadeGateNotifications (:238-292)`, scheduled from `startCascade`
  (`cascade.js:142-148`). They are derived from the real end date:
  `:253-254` "day21" notification fires at `pro_trial_ends_at` 10:00 ("You're
  now on Free", copy `:222-225`); `:256-258` "day19" fires 2 days earlier
  ("Your Pro trial ends in 2 days", copy `:218-221`). For a 14-day trial that
  is day 12 and day 14 — correct timing, stale variable names.
- **Dependency:** these are **local notifications** (`:238-281`). If the user
  denied notification permission, the day-12 warning never fires and the trial
  lapses with **no in-app warning** (the gate is never shown). HIGH — 06b.

### Can the user dismiss the prompt and keep Pro?
- Yes, momentarily: the gate has a close button (`:214`) and `dismiss` just
  goes back (`:107-109`). After the server worker has run (expiry), the server
  `tier='free'`, so once `refreshTierFromCloud` lands the gates block. But until
  that cloud read completes — and entirely while offline — `store.tier` is the
  cached value (05).

## Downgrade to Free on non-subscription

- The downgrade is the **server worker** above: `migrate_068:438-442`
  (`tier='free'`). No client function performs it.
- Client effect: gates block when `store.tier==='free'`, which happens after
  `refreshTierFromCloud` reads the server value (`useAppStore.js:810`,
  `:819`, `:829-839`). Online, post-launch, this reconciles. Offline / during
  the launch window it does not (05).

### Pro gates that block a downgraded (free) user
Each reads `store.tier`:
- Component gate: `ProGate.js:31` (`tier==='pro'` else lock overlay).
- Route guard: `ProGate.js:126` (`tier!=='pro'` → `ProLocked`).
- Guarded routes (`RootNavigator.js`): `GatedWeeklyCheckIn (:114)`,
  `GatedNutritionTargets (:115)`, `GatedBodyMetrics (:116)`,
  `GatedCoachOutput (:117)`, `GatedProGoalSetup (:118)`,
  `GatedPlanUpdate (:120)`, `GatedCoachingReminders (:119)`,
  `GatedLogCardio`/`GatedCardioHistory` (cardio).
All block correctly **for the value of `store.tier`** — which is the cached
value, so correctness depends entirely on `store.tier` being current (05).
