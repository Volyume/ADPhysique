# playstore-04 — in-app purchase / subscription compliance

Status: COMPLETE. Date: 2026-06-06.

## Billing engine — PASS
- All digital purchases go through **Google Play Billing via react-native-iap
  v15** (`src/lib/payments/playBilling.js`). No external payment system for
  digital goods. PASS (no auto-rejection risk).
- v15 API verified: `fetchProducts({type:'subs'})`, `requestPurchase` with
  `subscriptionOffers[].offerToken`, result via `purchaseUpdatedListener`,
  `finishTransaction`. Server-authoritative: the `play-billing-rtdn` RTDN Edge
  Function is the source of truth for renew/cancel/refund; the client never
  fakes entitlement.

## Products
- Catalogue (`src/lib/payments/catalogue.js`): `pro_monthly` (£2.99/mo),
  `pro_annual` (£19.99/yr). 2-tier model (Free / Pro). `skuFor`, `allSkuIds`,
  `BILLING_PERIODS` present.
- **The Play Console products do not exist yet** (founder task). Billing is inert
  until `pro_monthly` + `pro_annual` base plans + the 7-day free-trial offers are
  created in Play Console. → Document B, BLOCKER for billing to function.

## Trial model
- **14 cardless in-app days + 7-day Google Play introductory free-trial offer**
  (= 21 days free), not 28. The 14-day window is server-side
  (`start_cascade`, migration 065 pending apply); the 7-day part is a Play
  Console intro offer on each base plan. Both must line up.

## Required purchase-surface elements — PASS (added in `b676678`)
- Price + billing period + auto-renew disclosure on the paywall. PASS.
- **Restore Purchases**: wired (`src/lib/payments/restore.js`, surfaced on
  SubscriptionScreen + PaywallScreen). PASS.
- **Manage subscription** link → `https://play.google.com/store/account/subscriptions`
  (`SubscriptionScreen.js:72`, `CascadeGateScreen.js:165`). PASS.
- Terms + Privacy links on the paywall. PASS (per prior LB-1 remediation).
- Dismiss / no-purchase exit present (paywall is not a hard wall). PASS.

## Tier gating — PASS (post-fix this session)
The trialState-resolution fix (commit `7a944a5`) closed the gap where, with the
beta switch off, paid users could see the paywall and lapsed users were routed
to a trial. `refreshTierFromCloud` + `restoreSessionFromCloud` now hydrate
`trialState`/`proTrialEndsAt` onto `userProfile`, so the cascade resolves
correctly across Subscription / ProUpgrade / CoachOutput.

## Open items (Document B)
1. Create Play Console subscription products + base plans + 7-day offers.
2. Apply migration 065 (trial 14d) + 066 (billing_period) and redeploy the RTDN
   function.
3. Sandbox-purchase end-to-end and confirm a `tier_history` row + `trial_state`
   update + `billing_period` write.
