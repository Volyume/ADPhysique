# Trial Audit 04 — Subscription lapse and cancellation

Date: 2026-06-08. Citations from files read directly. Spec Step 5: "If at any
point the user cancels … or it lapses for any reason, they are IMMEDIATELY
downgraded to free."

## CANCELLATION / LAPSE DETECTION

**The only revocation mechanism is the Google Play RTDN Pub/Sub path** in the
edge function: `supabase/functions/play-billing-rtdn/index.ts:425-506`.
- `expire` (type 13, `SUBSCRIPTION_EXPIRED`) → `:481-483`
  `callUpgradeTier(userId,'free','user_cancelled',…)`.
- `refund` (type 12, `SUBSCRIPTION_REVOKED`) → `:484-486` `…,'free','refunded',…`.
- `cancel` (type 3) → `:497,502` no tier change (sub runs to period end; `expire`
  fires later). Correct.
- `grace` (types 5/9) → `:487-495` no tier change + `sendPaymentFailurePush`.
`callUpgradeTier` (`:293-331`) calls the service-role `upgrade_tier_for_user`
(`:312`), which writes `tier='free'` (`migrate_068:385-391`).

**There is no client-side receipt re-query that revokes.** The client's
`getCustomerInfo`/`restorePurchases` only ever GRANT optimistically; neither
downgrades (verified: `restore.js:30-68` has no downgrade path).

### CRITICAL vs spec Step 5: revocation depends on Pub/Sub, which is not wired
- The `expire`/`refund` handlers live in the **Pub/Sub branch** (`index.ts:425-506`),
  entered only for a `{ message:{ data } }` Google push (`:421-424` routes client
  calls to `handleClientVerify`; `:433-437` requires `message.data`). The client
  branch `handleClientVerify` (`:379-408`) **only grants Pro — it has no
  downgrade path**.
- Wiring the Pub/Sub topic + push subscription is the founder console step
  (`index.ts:31-43`). Per `CURRENT_STATUS.md` §0 (2026-06-07): "optional Pub/Sub
  for auto refund / cancel reconciliation" — i.e. **NOT wired**.
- Result: a paid user who cancels / refunds / lapses sends **no notification the
  server acts on**, the server `tier` stays `'pro'`, and `refreshTierFromCloud`
  keeps the client Pro. Spec Step 5 ("immediately downgraded") is **NOT
  satisfied** in the current deployment. Severity: CRITICAL (Pro access when not
  entitled) / HIGH (flow does not match spec).
- This does NOT affect the 14-day **trial** expiry, which is the pg_cron worker
  (`migrate_068:417-461` + `migrate_031:127-131`), independent of Pub/Sub.

## GRACE PERIOD

Handled: `index.ts:487-495` (`grace`) makes NO tier change and fires
`sendPaymentFailurePush` (`:265-291`); comment `:488-491` notes the 3-day grace
clock is client-side and access is retained. Correct — no premature revoke.
(Also gated on Pub/Sub delivering the ON_HOLD/IN_GRACE_PERIOD notification.)

## LAPSE → DOWNGRADE: instantaneous?

- Server: `callUpgradeTier(...'free'...)` (`index.ts:482`,`:485`) →
  `upgrade_tier_for_user` writes `tier='free'` (`migrate_068:385-391`) — immediate
  **if** the RTDN fires (which needs Pub/Sub).
- Client: reflected only on the next successful `refreshTierFromCloud`
  (`useAppStore.js:784-848`). Between the server write and the next client cloud
  read, and entirely while offline (timeout/catch at `:794`,`:841-847` leaves the
  cached tier), `store.tier='pro'` persists. So the client downgrade is **not
  instantaneous**, and **offline it is indefinite** (no local expiry check; see
  Phase 5). GAP vs spec Step 5.

## RESTORE PURCHASES

`src/lib/payments/restore.js:restorePurchases (:30-68)`:
- `playBilling.restorePurchases() :33` → `getAvailablePurchases`
  (`playBilling.js:386-390`) returns **active** purchases only.
- `'pro'` in `activeEntitlements` (`:39-42`) → `payAt` optimistic unlock (`:61`).
  It does NOT call `confirmPurchase` (no server re-verify); the optimistic unlock
  reverts via `refreshTierFromCloud` if the server says free
  (`useAppStore.js:814-816` only holds within the 5-minute window).
- **Cannot reactivate a cancelled sub**: an expired/cancelled subscription is not
  returned by `getAvailablePurchases`, so `restoredTier` is `null`
  (`restore.js:42-48`), and any spurious optimistic unlock reverts after 5
  minutes. SAFE.
- MEDIUM: restore never server-verifies (`payAt` only, no `confirmPurchase`), so
  it cannot repair a server tier that is wrong (e.g. active sub but server still
  `free` because Pub/Sub isn't wired).
