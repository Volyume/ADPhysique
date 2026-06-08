# Trial Audit 03 — Google Play subscription

Date: 2026-06-08. Citations from files read directly.

## Product configuration

- Product IDs: `src/lib/payments/catalogue.js:27` `id:'pro_monthly'`, `:36`
  `id:'pro_annual'`.
- 7-day introductory offer: NOT defined in code (it is a Play Console product
  offer). The client selects it at purchase: `src/lib/payments/playBilling.js:
  selectOfferToken (:116-129)` prefers an offer with a £0 pricing phase
  (`:119-125` `Number(p.priceAmountMicros) === 0`), i.e. the free-trial offer;
  falls back to the base plan (`:126-128`). Eligibility is Google's (used-up
  offers stop being returned).
- Price £4.99/month, £29.99/year: `catalogue.js:30` `priceText:'£4.99/month'`,
  `:37` `priceText:'£29.99/year'` — these are the **fallback** strings.

### Is price fetched dynamically? — YES on purchase surfaces.
- `src/lib/payments/usePlayPrices.js:17-30`: `ensureDisplayPrices()` →
  `playBilling.ensureDisplayPrices (:446-450)` → `loadOfferTokens (:212-226)`
  caches `selectDisplayPrice(product)` (`:142-158`, the store's localised
  `formattedPrice`). `priceFor` returns the store price, catalogue text only as
  pre-load fallback (`usePlayPrices.js:26-29`).
- Used by `PaywallScreen.js:128`, `CascadeGateScreen.js:103`,
  `ProUpgradeScreen.js:35`, `SubscriptionScreen.js:57`, `TierComparisonStrip.js`.
- NOT dynamic (catalogue static GBP): `WelcomeScreen.js:94` and
  `DifferentialBadge.js:42` use `priceTextFor` directly. These are not Play
  purchase surfaces; flagged MEDIUM in 06b for non-UK display.

## Purchase initiation

- Entry points (identical pattern), each guarded against double-tap with a
  `busy`/`setBusy` flag + `Button loading`:
  - `PaywallScreen.js:handlePay (:61-95)`: `setBusy(true) :63` →
    `playBilling.purchasePackage(sku.id) :74` → `cascade.payAt :76` →
    `cascade.confirmPurchase :80`. Button `loading={busy} :197`.
  - `CascadeGateScreen.js:handlePay (:111-158)`: `setBusy :113` →
    `purchasePackage :127` → `payAt :129` → `confirmPurchase :132`.
  - `ProUpgradeScreen.js:subscribePro (:64-88)` (read earlier this session):
    `purchasePackage :73` → `payAt :75` → `confirmPurchase :78`.
- `purchasePackage` (`playBilling.js:311-384`): resolves the offer token
  (`:313-321`, throws if none `:325-327`), then `RNIap.requestPurchase` with
  `subscriptionOffers:[{sku, offerToken}]` and `obfuscatedAccountId`
  (`:355-364`). v15 result arrives via the listener; a single in-flight bridge
  + 90s timeout guards it (`:331-353`), and a second tap supersedes a stale
  bridge (`:345-352`) — double-tap safe.
- Cancel by user: `E_USER_CANCELLED`/superseded → logged, no alarm
  (`CascadeGateScreen.js:145-146`, `PaywallScreen.js:86-87`).
- Failure: warning toast/alert (`CascadeGateScreen.js:150-153`,
  `PaywallScreen.js:88-91`).

## Purchase acknowledgement (CRITICAL area)

- Acknowledgement is **client-side only**, in the purchase listener:
  `playBilling.js:264-287` `purchaseUpdatedListener` → `:271-273`
  `await RNIap.finishTransaction({ purchase, isConsumable:false })` (skips
  `PENDING` state `:270`). This is the Play acknowledgement.
- The edge function does **not** acknowledge (`index.ts` never calls
  `acknowledge`; it only reads `acknowledgementState` in the type at `:232`).
- The restore path does **not** acknowledge: `restorePurchases` →
  `getAvailablePurchases` (`playBilling.js:386-390`) maps purchases but never
  calls `finishTransaction`.
- Risk: a purchase whose `purchaseUpdatedListener` never fired (app killed
  before the event) is unacknowledged. `initialise` re-registers the listener
  (`:264`) and Play *may* redeliver pending transactions to it, but that is not
  guaranteed for an already-acknowledged-pending edge case, and the restore
  path certainly won't acknowledge. Google auto-refunds unacknowledged
  purchases after 3 days. HIGH — 06b.

## Entitlement grant on subscription — server-authoritative

- Client never writes its own paid tier: `cascade.payAt (:161-176)` only sets
  the 5-minute optimistic unlock (`:172` `setOptimisticPaid`) and returns
  `{ok:true, optimistic:true}`. It does NOT call `upgrade_tier` (closed by
  migration 067 / 068:184-189).
- Real grant: `cascade.confirmPurchase (:190-216)` → invokes the
  `play-billing-rtdn` function (`:197-199`) → `handleClientVerify`
  (`index.ts:379-408`): `verifyWithPlayApi` (Google Play Developer API
  `:236-251`, GETs `.../purchases/subscriptions/{sub}/tokens/{token}` `:242`),
  reads the user id from Google's `obfuscatedExternalAccountId` (`:388`, never
  from the caller), guards expiry + paymentState (`:394-402`), then
  `callUpgradeTier(userId,'pro','user_paid',ref,'client_verify')` (`:404`) →
  service-role `upgrade_tier_for_user` (`:312`, RPC `migrate_068:284-408`,
  REVOKEd from authenticated `:412-413`). Sets `billing_period` (`:405`).
- Timing window: `payAt` unlocks instantly (optimistic, 5 min); `confirmPurchase`
  is fire-and-forget; `refreshTierFromCloud` reconciles to the server value, and
  within the 5-min window will not downgrade pro→free
  (`useAppStore.js:814-816`). So there is no "confirmed-but-locked" gap for the
  buyer; the risk is the reverse (optimistic unlock with no real server grant),
  which reverts after 5 min (`:814-816` only HOLDS pro during the window).

### Server-side vs local entitlement
Entitlement is stored server-side (`users_profile.tier`, written by
`upgrade_tier_for_user`). Local `store.tier` is a cache reconciled by
`refreshTierFromCloud`. So the grant is server-authoritative; the local value
is the cache that the gates read (see 05 for the cache-trust risk).

### Dependency on deployment
`confirmPurchase` requires the `play-billing-rtdn` function deployed +
Google service-account creds set (`index.ts:44-58`). README/CURRENT_STATUS
record this as deployed 2026-06-06, but **no real purchase has been run from
Play Internal testing** — so the end-to-end grant is asserted, not exercised.
06b.
