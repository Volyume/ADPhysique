# Subscriptions audit, Document 10: implementation log

Status: COMPLETE. Date: 2026-06-06. Founder approved: C-1 (full
server-authoritative), C-2, M-1+M-2, M-3, L-1. Implemented in severity order;
no production source regressions; full suite green at the end (182 suites, 2990
passing, ESLint 0 errors).

## C-1, self-grant closed (server-authoritative paid grant)
- **Migration 067** (`migrate_067_upgrade_tier_block_client_pro.sql`): the
  authenticated `upgrade_tier` now raises on `_target_tier <> 'free'` and on
  `_reason IN ('user_paid','admin')`. A signed-in caller can no longer grant
  itself Pro. Tracked in `supabase/README.md` row 067. **Pending founder apply;
  must land with the RTDN deployment or new purchases won't grant Pro.**
- **Client** (`src/lib/payments/cascade.js` `payAt`): no longer calls
  `upgrade_tier`. It does an optimistic in-memory unlock via
  `store.setOptimisticPaid()` and returns `{ ok:true, optimistic:true }`. The
  real grant is the Play RTDN writing the tier via the service-role
  `upgrade_tier_for_user`.
- **Store** (`src/store/useAppStore.js`): added `_optimisticPaidUntil` +
  `setOptimisticPaid()` (5-minute window). `refreshTierFromCloud` will not
  downgrade pro→free within that window, so the on-device purchase unlocks
  instantly while the RTDN write lands; after the window the server value
  governs (a purchase that never reached the server reverts to free).
- **Tests**: `cascade.lifecycle.test.js` + `payments.cascade.test.js` updated to
  assert payAt is optimistic and does NOT hit the RPC; the RPC-error path now
  exercised via `skipToFree`.

## C-2, store-fetched localised prices
- `src/lib/payments/playBilling.js`: added `selectDisplayPrice(product)` (pure),
  a module-level `_displayPrices` cache populated in `loadOfferTokens`,
  `getDisplayPrice`/`getDisplayPrices`/`ensureDisplayPrices`, and a
  `loadProducts` method on the real + stub providers.
- `src/lib/payments/usePlayPrices.js` (new hook): `priceFor(tier, period)`
  returns the localised store price, catalogue text as the pre-load fallback.
- Rendered on every surface: `PaywallScreen`, `ProUpgradeScreen`,
  `CascadeGateScreen`, `SubscriptionScreen`, `TierComparisonStrip`, including
  the previously-hardcoded `accessibilityLabel` price strings.
- **Test**: `playBilling.offer.test.js` covers `selectDisplayPrice`
  (localised price, skip-free-phase, null fallback).

## M-1 + M-2, restore unified and cleaned
- `PaywallScreen.handleRestore` now routes through `restore.js` (one
  implementation; the inline duplicate is gone).
- `restore.js`: dropped the dead `'complete'` branch; corrected the stale
  `'admin'`-reason comment; documented that restore is server-authoritative
  like a purchase (C-1).

## M-3, day21 naming
- `CascadeGateScreen`: `'day14'` is now the canonical variant (the trial is
  14+7); `'day21'`/`'day28'` kept as synonyms; telemetry surface renamed
  `cascade_day21_gate` -> `cascade_trial_end_gate`.
- `SubscriptionScreen`: navigates the gate with `variant:'day14'`.
- Note: the server worker's `source_surface='cascade_day21_worker'` lives in
  applied migration 033; left as-is (a rename needs a new migration, telemetry
  only, deferred).

## L-1, finishTransaction guard
- `playBilling.js` purchase listener now skips `finishTransaction` when
  `purchaseStateAndroid === 2` (PENDING), so a pending purchase isn't
  acknowledged prematurely.

## Out-of-scope item surfaced (not changed)
- `TierComparisonStrip.js` lists "Peak Week and block planning" as a Pro
  feature, but Peak Week was removed from scope (founder 2026-05-25). This is
  stale user-facing copy advertising a feature that does not exist. Flagged for a
  copy fix; not changed here (outside the confirmed scope).

## Stress-state re-trace after fixes (code-verified)
1. New user, no trial: `tier=free`, gated. OK.
2. Complete trial (days 1-14): N/A, no Complete tier (2-tier). OK.
3. Pro trial: `start_cascade` sets `tier='pro'`; gating reads `store.tier`. OK.
4. Trial expired -> Free: pg_cron `cascade_advance_due_users` sets `tier='free'`;
   client reflects on next refresh. OK.
5. Active Pro: `tier='pro'` from RTDN-written column. OK.
6. Active Complete: N/A. OK.
7. Pro cancelled, in paid period: RTDN CANCELED is a no-op (access continues);
   EXPIRED later -> free. **Requires RTDN deployed.**
8. Expired <24h: `cascade_advance` (trial) or RTDN (paid) -> free on next refresh.
9. Grace period: RTDN grace -> payment-failure push, no tier change (access
   kept). **Requires RTDN deployed.**
10. Refunded: RTDN REVOKED -> free. **Requires RTDN deployed.**
11. Offline, last state Pro: cached `store.tier` keeps Pro (fail-open). OK.
12. iOS purchaser opens Android: no StoreKit path; Android reads its own Play
    entitlement; cross-platform not supported (Doc B). OK (graceful).
13. Pro -> Complete: N/A, no Complete tier. OK.
14. Complete -> Pro: N/A. OK.
15. Restore on new device: `restore.js` reads Play entitlement, optimistic
    unlock, RTDN-written server tier reconciles. OK.

## Still founder-side before charging (Doc B)
Deploy `play-billing-rtdn` (the server-authoritative grant + refund/cancel/
expiry reconciliation now depends on it), create the Play products + 7-day
offer, apply migrations 060-067, sandbox-purchase test.
