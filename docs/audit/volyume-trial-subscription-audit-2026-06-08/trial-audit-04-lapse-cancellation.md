# Trial Audit 04 — Subscription lapse and cancellation

Date: 2026-06-08. Citations from files read directly.

## Cancellation / lapse detection — Google Play RTDN (Pub/Sub) only

- The only mechanism that revokes a **paid** subscription is the Google Play
  RTDN Pub/Sub path in the edge function:
  `supabase/functions/play-billing-rtdn/index.ts:425-506`.
  - `expire` (type 13, `SUBSCRIPTION_EXPIRED`) → `:481-483`
    `callUpgradeTier(userId,'free','user_cancelled',...)`.
  - `refund` (type 12, `SUBSCRIPTION_REVOKED`) → `:484-486`
    `callUpgradeTier(userId,'free','refunded',...)`.
  - `cancel` (type 3) → `:497,502` no tier change (sub runs to period end;
    `expire` fires later). Correct.
  - `grace` (types 5/9, on-hold/in-grace) → `:487-495` no tier change +
    `sendPaymentFailurePush` — user keeps access during grace. Correct.
- There is **no client-side receipt re-query that revokes**. The client
  `restorePurchases`/`getCustomerInfo` only ever *grants* optimistically; it
  never downgrades.

### CRITICAL: revocation depends on Pub/Sub being wired, which it is not
- The `expire`/`refund` handlers live in the **Pub/Sub branch**
  (`index.ts:425-506`), entered only for a `{ message:{ data } }` push from
  Google (`:421-424` routes client calls elsewhere; `:433-437` requires
  `message.data`). The client `handleClientVerify` branch (`:379-408`) **only
  grants Pro** — it has no downgrade path.
- Wiring the Pub/Sub topic + push subscription is the founder steps at
  `index.ts:31-43`. Per `docs/subscriptions-audit-2026-06-06/
  subscriptions-10-implementation-log.md:111-113` and `docs/CURRENT_STATUS.md`
  §0 (2026-06-07), Pub/Sub is "optional… to set up when wanted" — i.e. **NOT
  wired today**.
- Result: when a paid user cancels/refunds/lapses, **no notification reaches
  the server**, the server `tier` stays `'pro'`, and `refreshTierFromCloud`
  keeps the client on Pro indefinitely. **Spec Step 5 ("cancel/lapse →
  immediate downgrade") is NOT satisfied** in the current deployment.
- Note: this does NOT affect the 14-day **trial** expiry, which is the pg_cron
  worker (`migrate_068:417-461` + `migrate_031:127-131`), independent of
  Pub/Sub. Trial→free works; paid-sub→free does not (until Pub/Sub).

## Grace period

- Handled: `index.ts:487-495` (`grace`) does NOT change tier and pushes the
  payment-failure notice (`sendPaymentFailurePush :265-291`). The 3-day grace
  clock is client-side per the comment (`:488-491`). Access is retained during
  grace — correct, no premature revoke. (Also gated on Pub/Sub being wired.)

## Downgrade on lapse — instantaneous?

- Server: `callUpgradeTier(...'free'...)` (`index.ts:482`,`485`) →
  `upgrade_tier_for_user` writes `tier='free'` immediately (`migrate_068:385-391`).
- Client: only reflected on the next successful `refreshTierFromCloud`
  (`useAppStore.js:784-848`). Between the server write and the next client
  cloud read, and entirely while offline, the cached `store.tier='pro'`
  persists (05). So downgrade is **not instantaneous on the client**, and
  offline it is indefinite.

## Restore purchases

- `src/lib/payments/restore.js:restorePurchases (:30-68)`:
  - `playBilling.restorePurchases() :33` → `getAvailablePurchases`
    (`playBilling.js:386-390`) — Google returns **active** purchases only.
  - If `activeEntitlements` includes `'pro'` (`:39-42`) → `payAt` optimistic
    unlock (`:61`). It does NOT call `confirmPurchase`, so no server re-grant;
    it relies on the server tier already being correct, and the optimistic
    unlock reverts via `refreshTierFromCloud` if the server says free
    (`useAppStore.js:814-816` only holds within the 5-min window).
- Can restore reactivate a cancelled sub? **No** — `getAvailablePurchases`
  does not return an expired/cancelled subscription, so `restoredTier` is
  `null` (`restore.js:42-48`), and even a spurious optimistic unlock reverts
  after 5 minutes. Safe.
- Minor gap: restore never calls `confirmPurchase`, so it cannot *repair* a
  server tier that is wrong (e.g. active sub but server still `free` because
  Pub/Sub isn't wired). MEDIUM — 06b.
