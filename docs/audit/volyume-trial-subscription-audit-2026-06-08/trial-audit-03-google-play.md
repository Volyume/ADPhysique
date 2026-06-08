# Trial Audit 03 — Google Play subscription

Date: 2026-06-08. Citations from files read directly. Deployment facts (RTDN
deployed, Play products + 7-day offers active) are from `CURRENT_STATUS.md` §0
(2026-06-07) — they are console/cloud state and cannot be proven from repo code;
flagged as such.

## PRODUCT CONFIGURATION

**Product IDs.** `src/lib/payments/catalogue.js:27` `id:'pro_monthly'`, `:34`
`id:'pro_annual'`.

**7-day introductory offer.** Not defined in code (it is a Play Console product
offer). The client SELECTS it at purchase: `src/lib/payments/playBilling.js:
selectOfferToken (:116-129)` prefers an offer with a £0 pricing phase
(`:119-125`, `Number(p.priceAmountMicros) === 0`), else the base plan. The
"7 days" length itself is Play Console config — NOT verifiable from code.
Per `CURRENT_STATUS.md` §0 the offer is "active."

**Price £4.99/month — dynamic, not hardcoded on purchase surfaces.**
- Catalogue fallback: `catalogue.js:30` `'£4.99/month'`, `:37` `'£29.99/year'`.
- Dynamic store price: `src/lib/payments/usePlayPrices.js:17-30` calls
  `ensureDisplayPrices()` → `selectDisplayPrice(product)` (`playBilling.js:142-158`,
  the store's localised `formattedPrice`); returns the store price, catalogue
  text only as the pre-load fallback (`usePlayPrices.js:26-29`).
- Rendered via `usePlayPrices` on `PaywallScreen.js:128`, `CascadeGateScreen.js:103`,
  `ProUpgradeScreen.js:35`, `SubscriptionScreen.js:57`, `TierComparisonStrip.js`.
- CONFIRMED: price is fetched from the store on the purchase surfaces (policy
  compliant). NOTE: `WelcomeScreen.js:94` and `DifferentialBadge.js` use the
  static catalogue text (`priceTextFor`), but neither is a Play purchase surface.

## PURCHASE INITIATION

**The function.** `src/lib/payments/playBilling.js:purchasePackage (:311-384)`:
resolves the offer token (`:313-321`; throws `No Play offer for…` if none,
`:325-327`); fires `RNIap.requestPurchase` with `subscriptionOffers:[{sku,
offerToken}]` and `obfuscatedAccountId` (`:355-364`). v15 result arrives via the
purchase listener; a single in-flight bridge + 90s timeout guards it
(`:331-353`), and a second tap supersedes a stale bridge (`:345-352`).

**Offer presented to eligible users.** `selectOfferToken` picks the free-trial
offer when Google still returns it; once used, Google stops returning it and the
code falls back to the base plan (`:124-128` + comment `:101-105`). Eligibility
is Google's; not separately gated in code.

**Confirm → entitlement (full trace).** Three surfaces, identical:
- `PaywallScreen.js:handlePay (:61-95)`: `purchasePackage(sku.id) :74` →
  `cascade.payAt('pro', ref, surface) :76` → `cascade.confirmPurchase({
  purchaseToken, subscriptionId }) :80` (fire-and-forget).
- `CascadeGateScreen.js:handlePay (:111-158)`: `:127` → `:129` → `:132`.
- `ProUpgradeScreen.js:subscribePro (:64-88)`: `:73` → `:75` → `:78`.
Then: `cascade.payAt (:161-176)` does an optimistic in-memory unlock only
(`:172` `setOptimisticPaid`), returns `{ok:true, optimistic:true}` — it does NOT
write the tier (closed by `migrate_068:184-189`). `cascade.confirmPurchase
(:190-216)` invokes the `play-billing-rtdn` function (`:197-199`).

**Double-tap guard.** CONFIRMED: `PaywallScreen.js:51,63` `busy`/`setBusy` +
`loading={busy}` on the CTA `:197`; `CascadeGateScreen.js:100,113`; plus the
provider's single-bridge supersede (`playBilling.js:345-352`).

**User cancels.** `E_USER_CANCELLED` / superseded → logged, no alarm:
`CascadeGateScreen.js:145-146`, `PaywallScreen.js:86-87`.

**Purchase fails.** Warning toast / alert: `CascadeGateScreen.js:150-153`,
`PaywallScreen.js:88-91`.

## PURCHASE ACKNOWLEDGEMENT (3-day auto-refund)

**Where.** Client-side, in the purchase listener:
`src/lib/payments/playBilling.js:264-287` `purchaseUpdatedListener` → `:271-273`
`await RNIap.finishTransaction({ purchase, isConsumable:false })` (skips a
PENDING purchase, `:270`).
- CONFIRMED for the normal foreground purchase path.
- The edge function does NOT acknowledge (`index.ts` only reads
  `acknowledgementState` in the type at `:232`).
- The restore path does NOT acknowledge: `restorePurchases`
  (`playBilling.js:386-390`) maps `getAvailablePurchases` without
  `finishTransaction`.
- So acknowledgement is guaranteed only on the listener path. A purchase whose
  listener event was missed (app killed) and that later surfaces via restore is
  not acknowledged. Severity: MEDIUM (edge case; the common path is covered).
  (Note: the prior audit `09a:150-151` treated acknowledgement as fully handled;
  this is the residual edge case it did not separate out.)

## ENTITLEMENT GRANT ON SUBSCRIPTION — server-authoritative

- Client never writes its own paid tier: `cascade.payAt (:161-176)` is optimistic
  only; `migrate_068:184-189` makes the authenticated `upgrade_tier` reject
  `_target_tier<>'free'` and `_reason IN ('user_paid','admin')`.
- Real grant: `confirmPurchase` → `play-billing-rtdn handleClientVerify`
  (`supabase/functions/play-billing-rtdn/index.ts:379-408`): `verifyWithPlayApi`
  (`:236-251`, GETs the Play Developer API `.../tokens/{token}` `:242`), reads the
  user id from Google's `obfuscatedExternalAccountId` (`:388`, never from the
  caller), guards expiry + paymentState (`:394-402`), then
  `callUpgradeTier(userId,'pro','user_paid',ref,'client_verify')` (`:404`) →
  service-role `upgrade_tier_for_user` (`:312`; RPC `migrate_068:284-413`, REVOKEd
  from `authenticated` `:412-413`). Sets `billing_period` (`:405`).
- Server-side, not local. The optimistic local unlock (`setOptimisticPaid`,
  `useAppStore.js:468-472`, 5-minute window honoured at `:814-816`) bridges until
  the server tier reconciles.

**Confirmed-but-not-active window?** For the BUYER there is no locked window —
`payAt` unlocks instantly. The opposite risk (optimistic unlock with no real
server grant) self-corrects after the 5-minute window (`:814-816` only HOLDS pro
during the window, then the server value governs).

**Dependency / not-yet-exercised.** `confirmPurchase` requires the deployed
`play-billing-rtdn` (deployed per status) + active Play products (per status).
Per `CURRENT_STATUS.md` §0 a **real Internal-testing purchase has not been run**,
so the end-to-end grant is asserted, not exercised in code or on a device.
