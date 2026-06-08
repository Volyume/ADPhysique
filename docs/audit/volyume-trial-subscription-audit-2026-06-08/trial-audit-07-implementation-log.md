# Trial Audit 07 — Implementation log

Date: 2026-06-08. Branch `main`. Fixes applied in severity order after the Phase
6 review. Verified: ESLint 0, `tsc --noEmit` 0, jest 155 suites / 2825 passed
(3 skipped).

## CRITICAL

### C1 — Stop clients writing their own trial columns
- **NEW `supabase/migrate_070_protect_trial_columns.sql`** — `CREATE OR REPLACE
  protect_users_profile_tier` so the trigger also reverts client UPDATEs to
  `trial_state` / `trial_started_at` / `pro_trial_ends_at` /
  `complete_trial_ends_at` / `locked_in_price_tier` (previously only `tier`), and
  clamps a client INSERT to a clean unstarted free state. Uses the existing
  `app.allow_tier_change` GUC bypass, so the server RPCs are unaffected; service
  role bypasses. Frozen-AAB safe. `supabase/README.md` row + status note added.
- **FOUNDER ACTION:** apply 070 in the SQL editor (verification query in the file
  + README row). Until applied, C1 stays open.

### C2 — Revoke Pro when a paid subscription lapses (client safety net)
- `src/lib/payments/cascade.js` `reconcilePaidEntitlement(profile)` — for a
  `paid_pro` user, when the REAL Play provider reports no active `'pro'`
  entitlement, downgrade via `cancel()`. Conservative: no-op on the stub, on a
  non-paid user, and on any failed Play read (never wrongly revokes a payer).
- Wired on launch after the cloud tier read: `src/navigation/RootNavigator.js`
  (`_reconcilePaidEntitlement` + `.then()` on both `refreshTierFromCloud` sites).
- **FOUNDER ACTION:** wire the Play→Pub/Sub push (`index.ts:31-43`) for the
  authoritative, instant revocation; the client net catches it on next launch.

### C3 (+ H1) — Close the offline / cached-entitlement loophole
- `src/store/useAppStore.js`: new cache keys `TRIAL_STATE_KEY`,
  `PRO_TRIAL_ENDS_KEY`; `checkTier` downgrades a cached `'pro'` to `'free'` when
  the cached `trial_state==='pro_trial_active'` and `now > pro_trial_ends_at`
  (paid_pro untouched). `refreshTierFromCloud` persists `trial_state` +
  `pro_trial_ends_at`; `setOptimisticPaid` caches `paid_pro`. This also addresses
  H1 (the startup window no longer trusts an expired cached trial).

## HIGH

### H2 — Present the gate at trial end without depending on notifications
- `src/screens/HomeScreen.js` — one-time, dismissible CascadeGate presentation
  when `trialState==='cascade_expired'` and `tier==='free'`, guarded by a
  per-uid flag. Complements the existing notifications + manual Subscription entry.

## MEDIUM

### M1 — Single entitlement resolver
- `src/screens/SubscriptionScreen.js` and `src/screens/CoachOutputScreen.js` now
  resolve the Pro/Free value from `store.tier` (the source every feature gate
  uses), with `isPaidTier(userProfile)` only as the pre-hydration fallback. So
  these surfaces can no longer disagree with the gates.

### M2 — Acknowledge every purchase (3-day auto-refund guard)
- `src/lib/payments/playBilling.js` — new `acknowledgeOutstanding()` (real
  provider): `getAvailablePurchases` + `finishTransaction` any unacknowledged,
  non-pending purchase. Called at the end of `initialise` and at the start of
  `restorePurchases`.

### M3 — Restore server-verifies
- `playBilling.js` `_purchasesToCustomerInfo`/`STUB_CUSTOMER_INFO` expose
  `latestPurchaseToken`; `src/lib/payments/restore.js` calls `confirmPurchase`
  after the optimistic `payAt`.

### M3 (heuristic) — drop legacy "first-run ⇒ pro"
- `checkTier` no longer auto-grants `'pro'` when `TIER_KEY` is absent. The cloud
  read is the source of truth. `auth-scenarios.test.js` updated.

## Tests added (Rule 7)
- `src/lib/payments/__tests__/cascade.reconcile.test.js` — C2 guards + downgrade.
- `src/store/__tests__/checkTier.tierExpiry.test.js` — C3 local expiry +
  paid_pro exemption + M3.

## NOT done in code (founder / console — flagged)
- **M4** (trial starts at Article 9 consent, not raw signup) — left as-is by
  design: health-data processing must be consented first, so the trial cannot
  legitimately start before the Article 9 step.
- Apply migration **070**; run **068**'s verification query.
- Wire the Play→Pub/Sub push (C2 root); confirm the Play Console 7-day offer +
  £4.99/£29.99 prices; run a real **Internal-testing purchase** end-to-end.
