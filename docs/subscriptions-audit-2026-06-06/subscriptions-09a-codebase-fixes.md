# Subscriptions audit, Document A: codebase fixes

Status: FINDINGS COMPLETE, awaiting confirmation before implementation.
Date: 2026-06-06. Every finding is from a file read or command run. Severity
order. NOTHING changed yet (Phase 9 checkpoint).

---

## CRITICAL

### C-1: A user can self-grant Pro for free via the `upgrade_tier` RPC
**Files:** `supabase/migrate_033_two_tier_consolidation.sql`
(`upgrade_tier`, `GRANT EXECUTE ... TO authenticated`),
`src/lib/payments/cascade.js:124` (`payAt`),
`src/screens/PaywallScreen.js:72-74`.
**Problem:** `upgrade_tier` is `SECURITY DEFINER`, granted to `authenticated`,
and for `_reason='user_paid'` with **any** non-null `_payment_ref` sets
`trial_state='paid_pro'`, `tier='pro'`. It performs **no server-side receipt
verification**. The client supplies the ref (`PaywallScreen.js:73` even
fabricates `client_${Date.now()}`). Any authenticated user can call
`rpc('upgrade_tier', { _target_tier:'pro', _reason:'user_paid', _payment_ref:'x' })`
directly (the anon key is public, the auth token is theirs) and grant themselves
Pro permanently. RTDN never corrects it: there is no Google event for a purchase
that never happened, so no expire/revoke fires. This is a direct revenue/security
hole, exposed now that `PRO_BETA_ACTIVE` is off.
**Fix:** make `'pro'` grants server-authoritative.
- Restrict the client `upgrade_tier` to non-paid transitions only
  (`user_skip`, `auto_downgrade`); reject `user_paid`/`pro` from the
  `authenticated`-granted function (`RAISE EXCEPTION`).
- Route every paid `'pro'` grant through `upgrade_tier_for_user` (service-role,
  migration 042) from the RTDN path **after** Play Developer API verification.
- Client `cascade.payAt` becomes an **optimistic local unlock only** (set
  `store.tier='pro'` in memory for instant UX), reconciled by
  `refreshTierFromCloud` once the RTDN writes the real row. Document the window.
- Needs a new migration (tighten `upgrade_tier`) + RTDN deployment (Doc B).
**Caveat:** this is an architectural change to the trust model and depends on
RTDN being live. Until then, the only safe interim is to keep the client unlock
but treat the cloud `tier` as unverified, flag clearly. Confirm approach before
implementing.

### C-2: Paywall prices are hardcoded, not store-fetched (store policy violation)
**Files:** `src/lib/payments/catalogue.js:30,31,37,38` (`priceText:'£4.99/month'`,
`priceNumber`), `src/screens/PaywallScreen.js:125,136,140-141,172,175,182,186`,
`src/screens/ProUpgradeScreen.js:357,369`,
`src/screens/CascadeGateScreen.js:212,224`,
`src/screens/SubscriptionScreen.js:138`,
`src/components/TierComparisonStrip.js:42,61`.
**Problem:** every paywall surface renders the hardcoded `priceTextFor(...)` /
`currentSku.priceText` (and hardcoded `accessibilityLabel`s like "£4.99 a
month"). The store's localised price is fetched in `playBilling.initialise()`
(`fetchProducts`) only to pick the offer token; it is never displayed. Apple
(Guideline 3.1) and Google both require prices fetched from the store and shown
in the user's local currency. A non-UK user sees "£4.99" regardless, and if the
founder sets per-market prices the app shows the wrong number.
**Fix:** expose the fetched product's localised `displayPrice` from playBilling
(store it at `initialise`, add a `getDisplayPrice(skuId)` accessor + a store
field), render that on every surface; keep the catalogue `priceText` only as a
pre-load fallback. Replace hardcoded `accessibilityLabel` price strings with the
dynamic value.

---

## HIGH

### H-1: Paid-subscription cancel / refund / expiry is not reconciled without RTDN
**Files:** `supabase/functions/play-billing-rtdn/index.ts` (handles refund=REVOKED,
expire=EXPIRED, grace), `supabase/migrate_033` `cascade_advance_due_users`
(expires **trials only**, not paid subs).
**Problem:** the pg_cron worker only downgrades `pro_trial_active → cascade_expired`.
A **paid** subscriber who cancels, lapses, or is refunded is downgraded only by
the RTDN function, which is **not deployed** (Doc B). Until it is, a
cancelled/refunded paid user keeps `tier='pro'` indefinitely. Refund = direct
revenue loss + policy expectation that access is revoked.
**Fix (code side):** none beyond C-1's RTDN routing; the handler exists and is
correct (verified: REVOKED→`refunded`→free, EXPIRED→free, grace→payment-failure
push). The fix is deployment (Doc B). Add a test asserting the RTDN type→action
map stays correct (partly covered by `rtdnWebhook.contract.test.js`).

### H-2: Client trusts the purchase result before any server check
**Files:** `src/screens/PaywallScreen.js:72-74`, `CascadeGateScreen.js:105`,
`ProUpgradeScreen.js:67`, `src/lib/payments/restore.js:60`.
**Problem:** root cause shared with C-1. After `purchasePackage` resolves, the
client immediately writes the tier via `payAt`→`upgrade_tier`. Resolves with C-1
(optimistic unlock + server-authoritative grant).

---

## MEDIUM

### M-1: Two restore implementations (drift risk)
**Files:** `src/screens/PaywallScreen.js:101-119` (inline restore) vs
`src/lib/payments/restore.js` used by `src/screens/SubscriptionScreen.js:88`.
**Problem:** two code paths do "read available purchases → write tier". They can
drift (e.g. different reasons, different messaging).
**Fix:** route both through `restore.js`; delete the inline copy in PaywallScreen.

### M-2: `restore.js` comment/code mismatch + dead `'complete'` branch
**File:** `src/lib/payments/restore.js:40-41,54,60,21`.
**Problem:** the header comment says restore uses the `'admin'` reason, but the
code calls `payAt(...)` which always uses `_reason:'user_paid'`. Also it still
checks for a `'complete'` entitlement (2-tier has no Complete SKU); a
`'complete'` restore would hit `payAt('complete')` → `invalid_target_tier`.
**Fix:** correct the comment; drop the `'complete'` branch; once C-1 lands,
restore should reconcile via the verified server path, not client `user_paid`.

### M-3: Stale "day21" naming vs the 14+7 model
**Files:** `src/screens/CascadeGateScreen.js:5,45,57` (`variant 'day21'`,
`surface 'cascade_day21_gate'`), `src/screens/SubscriptionScreen.js:114`
(`variant:'day21'`), `supabase/migrate_033` worker source_surface
`'cascade_day21_worker'`.
**Problem:** internal/telemetry labels say "day21" while the intended trial is
14+7. User-facing copy is generic ("trial winding down"), so no user sees "21",
but the telemetry surface names are misleading. Note the DB trial is still 21
days until migration 065 applies, so today the names match the DB but not the
intended model.
**Fix:** rename to a model-neutral `trial_end_gate` after 065 is applied; low
risk, telemetry-only.

### M-4: No local trial-expiry check on the client
**Files:** `src/store/useAppStore.js` (`refreshTierFromCloud`), no client compare
of `pro_trial_ends_at` to now.
**Problem:** trial downgrade depends on the pg_cron worker + the next successful
`refreshTierFromCloud`. An offline or rarely-foregrounding user keeps Pro past
expiry until the next online refresh. Fail-open is acceptable UX but is a small
revenue leak window.
**Fix (optional):** when resolving `store.tier`, if `trial_state==
'pro_trial_active'` and `pro_trial_ends_at < now`, treat as free locally until
the cloud confirms. Keep it conservative to avoid flicker.

---

## LOW

### L-1: `finishTransaction` may run on a still-PENDING purchase
**File:** `src/lib/payments/playBilling.js:216-220`.
**Problem:** the purchase listener calls `finishTransaction` for any delivered
purchase with a token and `!isAcknowledgedAndroid`, without checking the purchase
state is PURCHASED (not PENDING). Guarded by try/catch + the acknowledged flag,
so low impact, but acknowledging a pending purchase can error.
**Fix:** gate on `purchase.purchaseStateAndroid === 1 (purchased)` before
`finishTransaction`.

### L-2: (Already fixed this session) cascade-gate notification tap dead-ended
**File:** `src/lib/notifications/notificationRoute.js` (added), `RootNavigator`.
Fixed in commit `46755bb`. Listed for completeness.

---

## Verified NOT broken (counters the brief's assumptions)
- **Acknowledgement is handled** (`playBilling.js:218-220`, `finishTransaction`),
  so the Play 3-day auto-refund bug does not apply.
- **Refund handling exists** server-side (RTDN REVOKED→free).
- **Offline access** for an active subscriber works (cached `store.tier`).
- **Trial expiry is enforced** server-side (pg_cron `cascade_advance_due_users`,
  sets `tier='free'`).
- **Restore button** exists (SubscriptionScreen + PaywallScreen) without needing
  to subscribe first.
- **Subscription management deep-link** present (PaywallScreen copy "Manage or
  cancel anytime in Google Play"; verify the actual Play link in SubscriptionScreen
  during implementation).
- **Double-tap guard** on purchase: `busy`/`setBusy` disables the CTA
  (`PaywallScreen`), and the provider supersedes a stale pending purchase.
