# Trial Audit 07 — Implementation log

Date: 2026-06-08. Branch `main`. Fixes applied in severity order. Verified:
ESLint 0, `tsc --noEmit` 0, jest 154 suites / 2811 passed (3 skipped).

## CRITICAL

### C1 — Stop clients writing their own trial columns
- **NEW `supabase/migrate_070_protect_trial_columns.sql`** — `CREATE OR REPLACE
  protect_users_profile_tier` so the trigger also reverts client UPDATEs to
  `trial_state`, `trial_started_at`, `pro_trial_ends_at`,
  `complete_trial_ends_at`, `locked_in_price_tier` (previously only `tier`), and
  clamps a client INSERT to a clean unstarted free state. Uses the same
  `app.allow_tier_change` GUC bypass as 068, so the server RPCs are unaffected;
  service role bypasses. Frozen-AAB safe (the client never writes these).
- `supabase/README.md` — added the 070 tracking row + status note (Rule 6).
- **Founder action:** apply 070 in the SQL Editor (verification query in the
  file footer / README row).

### C2 — Revoke Pro when a paid subscription lapses (client safety net)
- The authoritative revocation is the Google Play RTDN Pub/Sub push
  (`play-billing-rtdn` `index.ts:481-486`), which needs the Pub/Sub topic +
  push subscription wired in the Play/GCP console (**founder action**,
  `index.ts:31-43`).
- Code-side safety net added: `src/lib/payments/cascade.js`
  `reconcilePaidEntitlement(profile)` — for a `paid_pro` user, when the REAL
  Play provider reports no active `'pro'` entitlement, downgrade via
  `cancel()` (`upgrade_tier('free','user_cancelled')`). Conservative: no-op on
  the stub, on a non-paid user, and on any failed Play read (never wrongly
  revokes a payer; a false empty is recoverable via Restore).
- Wired on launch after the cloud tier read: `src/navigation/RootNavigator.js`
  (`_reconcilePaidEntitlement` helper + `.then()` on both
  `refreshTierFromCloud` call sites).

### C3 — Close the offline / cached-entitlement loophole
- `src/store/useAppStore.js`:
  - New cache keys `TRIAL_STATE_KEY`, `PRO_TRIAL_ENDS_KEY`.
  - `checkTier` now downgrades a cached `'pro'` to `'free'` at launch when the
    cached `trial_state==='pro_trial_active'` and `now > pro_trial_ends_at`
    (paid_pro untouched). So an expired trial no longer survives offline / the
    launch window.
  - `refreshTierFromCloud` persists `trial_state` + `pro_trial_ends_at` to the
    cache; `setOptimisticPaid` caches `paid_pro` so a just-paid user isn't
    wrongly downgraded.

## HIGH

### H1 — Startup-timing window
- Addressed by C3's local expiry check: the cached tier is no longer trusted
  past the trial end even before `refreshTierFromCloud` lands. (Paid-sub
  offline window remains bounded by the next cloud read; that is inherent to an
  offline-capable app and is the reason C2's net + the server RTDN exist.)

### H2 — Present the prompt at trial end without depending on notifications
- `src/screens/HomeScreen.js` — one-time, dismissible CascadeGate presentation
  when `trialState==='cascade_expired'` and `tier==='free'`, guarded by a
  per-uid AsyncStorage flag. Complements the existing day-12/day-14
  notifications + the manual Subscription entry.

### H3 — Acknowledge every purchase (3-day auto-refund guard)
- `src/lib/payments/playBilling.js` — new `acknowledgeOutstanding()` in the
  real provider: `getAvailablePurchases` + `finishTransaction` any
  unacknowledged, non-pending purchase. Called at the end of `initialise` and
  at the start of `restorePurchases`, so a purchase whose listener event was
  missed (killed app) or that only surfaces via restore is still acknowledged.

## MEDIUM

### M2 — Restore now server-verifies
- `src/lib/payments/playBilling.js` — `_purchasesToCustomerInfo` /
  `STUB_CUSTOMER_INFO` expose `latestPurchaseToken`.
- `src/lib/payments/restore.js` — after the optimistic `payAt`, calls
  `confirmPurchase({ purchaseToken, subscriptionId })` so the server tier is
  (re)verified, not just optimistically unlocked.

### M3 — Drop the legacy "first-run ⇒ pro" heuristic
- `src/store/useAppStore.js` `checkTier` no longer auto-grants `'pro'` when
  `TIER_KEY` is absent but first-run is done. The cloud read is the source of
  truth. Updated `src/lib/__tests__/auth-scenarios.test.js` to assert the new
  (secure) behaviour.

## Tests added (Rule 7)
- `src/lib/payments/__tests__/cascade.reconcile.test.js` — C2 guards + downgrade.
- `src/store/__tests__/checkTier.tierExpiry.test.js` — C3 local expiry +
  paid_pro exemption + M3.

## NOT done in code (founder / console actions, flagged)
- **C2 root** — wire the Play→Pub/Sub push subscription (`index.ts:31-43`) so
  cancel/refund/expire reconcile authoritatively, not only via the client net.
- **6/7 — the Play Console product offers**: the 7-day intro free trial on
  `pro_monthly`/`pro_annual` and the £4.99/£29.99 prices are Play Console config
  (the code selects the free-trial offer token and shows the store price).
- **M5** — run migration 068's verification query (and now 070's).
- **M1** — Welcome/DifferentialBadge static GBP pre-auth: left as-is (no store
  price is available pre-auth; cosmetic for non-UK). Noted, not changed.
- **M4** — a screen-by-screen sweep confirming no Pro content renders on an
  unwrapped shared screen was not exhaustively completed; route guards are
  verified.
