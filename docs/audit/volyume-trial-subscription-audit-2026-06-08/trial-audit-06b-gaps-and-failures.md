# Trial Audit 06B — Gaps and failures

Severity key: CRITICAL = Pro access when not entitled / revenue loss; HIGH =
flow does not match spec; MEDIUM = edge case.

## CRITICAL

### C1 — Client can extend or reset its own trial via the database
- What: RLS lets a user UPDATE their own `users_profile` row
  (`migrate_005:33-35`); the protect trigger guards only `tier`
  (`migrate_068:60-82`). `pro_trial_ends_at`/`trial_state` are writable, so a
  user can push the trial end to the future (worker never fires,
  `migrate_068:435`) or reset `trial_state='unstarted'` and re-`start_cascade`.
- Where: `migrate_005_rls_hardening.sql:33-35`; `migrate_068:60-82`,`:435`.
- Fix: extend `protect_users_profile_tier` (or a new BEFORE-UPDATE trigger) to
  revert client changes to `trial_state`, `pro_trial_ends_at`, `trial_started_at`
  unless `app.allow_tier_change='on'` (the server RPCs already set that flag),
  mirroring the existing `tier` protection.

### C2 — Paid cancellation/refund/lapse never revokes Pro (Pub/Sub not wired)
- What: revocation lives only in the Pub/Sub RTDN branch
  (`index.ts:481-486`), which requires the Google Play → Pub/Sub push
  subscription that is not yet configured (`index.ts:31-43`;
  `subscriptions-10-implementation-log.md:111-113`). The client verify branch
  only grants. So a cancelled/refunded paid user keeps `tier='pro'`
  server-side and the client never downgrades. Spec Step 5 fails.
- Where: `index.ts:379-408` (grant-only client branch), `:425-506` (Pub/Sub
  branch, unwired).
- Fix: wire the Pub/Sub push subscription (founder step), and/or add a
  client-side active-subscription re-check on launch that calls a server verify
  which can downgrade when Play reports the sub inactive.

### C3 — Offline / cached-entitlement loophole
- What: launch tier is the cached `TIER_KEY` (`useAppStore.js:509,519`) with no
  comparison to `pro_trial_ends_at`; `refreshTierFromCloud` leaves the cached
  value on timeout/offline (`:794`,`:841-847`). An expired user who is offline
  keeps Pro indefinitely.
- Where: `useAppStore.js:507-523`, `:784-848`; no local expiry check anywhere
  (`cascade.js:330-344` is display-only).
- Fix: persist `pro_trial_ends_at` alongside the cached tier and have
  `checkTier` resolve to `'free'` when `now > pro_trial_ends_at` and state is
  not `paid_pro`; cap how long a cached Pro is trusted without a successful
  cloud verify.

## HIGH

### H1 — Startup-timing window uses cached tier before cloud reconcile
- What: routing/splash gate on `tierChecked` (cached) only
  (`RootNavigator.js:572`,`:956`); `refreshTierFromCloud` is fire-and-forget
  (`:612`,`:778`). A recently-expired user gets a Pro window each launch.
- Fix: gate Pro routes on a "verified-this-session" flag, or await the first
  cloud tier read for Pro surfaces (with C3's offline fallback).

### H2 — The trial does not "force" a Google Play prompt at day 14
- What: spec Step 2 says the user "is presented with" the Play prompt at
  expiry. In code, the gate (`CascadeGateScreen`) is a dismissible modal
  (`RootNavigator.js:357`, close `:214`) reached only by tapping a notification
  (`notificationRoute.js:24-27`) or via Subscription (`SubscriptionScreen.js:123`).
  If notifications are denied there is no prompt at all; the trial silently
  lapses to Free (worker). No blocking in-app prompt exists.
- Fix (if the spec is the target): add a launch/Home check on
  `stageOf`/`daysRemaining` that presents the gate when the trial has ended
  (and an in-app banner near expiry independent of notification permission).

### H3 — Acknowledgement not guaranteed on every purchase path
- What: `finishTransaction` runs only in the purchase listener
  (`playBilling.js:271-273`); the restore path (`:386-390`) and a
  killed-app-before-listener case may leave a purchase unacknowledged → Google
  auto-refund after 3 days.
- Fix: on `initialise`/restore, call `getAvailablePurchases` and
  `finishTransaction` any unacknowledged purchase.

## MEDIUM

### M1 — Welcome / DifferentialBadge show catalogue GBP, not store price
- `WelcomeScreen.js:94`, `DifferentialBadge.js:42` use `priceTextFor`
  (static £) rather than `usePlayPrices`. Non-UK users see GBP on these
  (non-purchase) surfaces. Fix: use the hook or omit the figure pre-auth.

### M2 — Restore can't repair a wrong server tier
- `restore.js:61` calls `payAt` (optimistic) but not `confirmPurchase`, so it
  cannot server-verify/re-grant an active sub whose server tier is stale.
  Fix: have restore also call `confirmPurchase` with the restored token.

### M3 — Legacy "first-run-done ⇒ pro" heuristic
- `useAppStore.js:511-517`: missing `TIER_KEY` + `FIRST_RUN_KEY==='true'`
  grants `'pro'`. A migration aid that can grant Pro on a cleared-tier cache.
  Fix: drop the heuristic now that tiers are live, or require a cloud verify.

### M4 — Per-feature gate sweep not exhaustive
- `withProGuard` covers the Pro *routes*; a screen-by-screen check that no Pro
  content renders on an unwrapped shared screen was not completed. Confirm
  before sign-off.

### M5 — 068 verification query not run
- `supabase/README.md` records 068 applied but its verification query (that
  `start_cascade`/tier RPCs no longer throw the `session_replication_role`
  error) is outstanding. Until run, "the trial actually starts in prod" is
  asserted, not confirmed.
