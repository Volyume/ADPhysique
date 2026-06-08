# Trial Audit 06B — Gaps and failures

Severity: CRITICAL = Pro access when not entitled / revenue loss; HIGH = flow
does not match the 5-step spec; MEDIUM = edge case / inconsistency.

## CRITICAL

### C1 — A user can extend or reset their own trial (spec: "no bypass")
- RLS is `FOR ALL` on the user's own row (`migrate_005_rls_hardening.sql:33-35`);
  the `protect_users_profile_tier` trigger reverts only `tier`
  (`migrate_068:60-82`, `:67-71`). So `pro_trial_ends_at` / `trial_state` /
  `trial_started_at` are client-writable via PostgREST.
- Extend: `UPDATE pro_trial_ends_at = future` → worker never expires
  (`migrate_068:435`). Reset: `UPDATE trial_state='unstarted'` → a fresh trial
  via `ProUpgradeScreen.completeUpgrade:110-120` / `start_cascade`.
- Violates the LOCKED one-time rule (`COMPLETE_TIER_SCOPE_LOCKED.md:91-94`) and
  was NOT caught by the prior security audit, which checked only the `tier`
  column (`05-security-audit.md:52-55`).
- Fix: extend the protect trigger to revert client writes to
  `trial_state/pro_trial_ends_at/trial_started_at/complete_trial_ends_at/
  locked_in_price_tier` unless the `app.allow_tier_change` GUC is set (same
  mechanism `tier` already uses).

### C2 — Cancel/refund/lapse does not revoke Pro (spec Step 5 fails)
- Revocation only exists in the Pub/Sub RTDN branch (`index.ts:481-486`
  expire→free / refund→free), entered only for a `{message:{data}}` push
  (`:421-424,:433-437`). The client branch `handleClientVerify` (`:379-408`) only
  GRANTS — no downgrade path.
- Per `CURRENT_STATUS.md` §0 the Pub/Sub push is **optional / not wired**. So a
  cancelled/refunded/lapsed paid user keeps server `tier='pro'` and the client
  stays Pro. Spec Step 5 ("immediately downgraded … for any reason") is not met.
- (Trial expiry is unaffected — it's the pg_cron worker, not Pub/Sub.)
- Fix: wire the Play→Pub/Sub push (founder console), and/or add a launch-time
  active-subscription re-check that can downgrade when Play reports the sub
  inactive.

### C3 — Offline / cached entitlement loophole (spec: "no offline loophole")
- `checkTier (:507-523)` sets `store.tier` from cached `TIER_KEY` (`:509,:519`)
  with no `pro_trial_ends_at` comparison; `refreshTierFromCloud` leaves the cache
  on timeout/offline (`:794,:841-847`). No local expiry check exists. An expired
  trial/sub, offline, keeps Pro indefinitely.
- Fix: cache `trial_state`+`pro_trial_ends_at`; in `checkTier` resolve `'free'`
  when `trial_state='pro_trial_active'` and `now > pro_trial_ends_at`.

## HIGH

### H1 — Startup-timing window
Routing/splash gate on `tierChecked` (cached) only (`RootNavigator.js:572,956`);
`refreshTierFromCloud` is fire-and-forget (`:612,778`). Each launch renders gates
from the cached tier before the server reconciliation. Fix: gate Pro on a
"verified-this-session" flag, or block Pro routes until the first cloud read (with
C3's offline fallback).

### H2 — The Play prompt at day 14 is not guaranteed (spec Step 2)
The day-14 gate (`CascadeGateScreen`) is a dismissible modal (`RootNavigator.js:357`,
close `:214`) reached only by tapping the trial-ending notification
(`notificationRoute.js:24-27`, scheduled `scheduler.js:253-258`) or via
Subscription (`SubscriptionScreen.js:123`). No launch/Home auto-trigger exists.
If notifications are denied, the user is NOT "presented with a Google Play
subscription prompt"; the trial silently lapses to Free. Fix: present the gate
in-app at trial end independent of notification permission.

## MEDIUM

### M1 — Two entitlement resolvers (inconsistency)
`SubscriptionScreen.js:47` and `CoachOutputScreen.js:1104` use
`isPaidTier(userProfile)` (from `userProfile.trialState`); every Pro feature gate
uses `store.tier` (the `tier` column). Two separately-cached sources that can
drift (notably under the C1 edit, which touches `trial_state` not `tier`). Fix:
resolve both from one source.

### M2 — Acknowledgement not guaranteed on the restore / missed-listener path
`finishTransaction` runs only in the purchase listener (`playBilling.js:271-273`);
`restorePurchases` (`:386-390`) doesn't acknowledge. A purchase whose listener
event was missed (killed app) and later surfaced via restore is unacknowledged →
Google's 3-day auto-refund. Fix: acknowledge outstanding purchases on
init/restore.

### M3 — Restore doesn't server-verify
`restore.js:61` calls `payAt` (optimistic) only, no `confirmPurchase`. Can't
repair a stale server tier. Fix: also `confirmPurchase` the restored token.

### M4 — Trial starts at Article 9 consent, not "signup" (spec Step 1 nuance)
`Article9ConsentScreen.js:112`. A user who chooses Free at Welcome, or never
reaches consent, never starts a 14-day trial. There is no signup-triggered start.

## NOT CODE-VERIFIABLE (Play Console / deployment — confirm separately)
- Spec Steps 6/7 (the offer IS 7 days free; billing IS £4.99/month) are Play
  Console product config. Code selects the free-offer token (`playBilling.js:
  116-129`) and shows the store price; the 7-day length and the price are set in
  Play Console (active per `CURRENT_STATUS.md` §0). Confirm in console + a real
  Internal-testing purchase.
- Migration 068's verification query is still to be run (`CURRENT_STATUS.md` §0).
