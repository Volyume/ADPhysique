# Subscriptions audit, Executive summary

Date: 2026-06-06. Scope: Volyume's subscription / IAP system, audited against the
**actual code** (not the brief's assumed 3-tier/28-day/RevenueCat model, the
real system is 2-tier Free/Pro, a 14+7 trial, `react-native-iap` v15, Android
first). No code changed; this is the Phase 9 checkpoint.

## Verdict
The purchase machinery is well built: client acknowledgement is correct (no Play
auto-refund bug), trial start/expiry is server-enforced, refunds are mapped in
the RTDN handler, offline keeps an active subscriber on Pro, and there is a
restore button and a double-tap guard. **But two findings block a safe revenue
launch**, and the server lifecycle is gated on a deployment that hasn't happened.

## Critical issues (must fix before charging real money)
1. **Self-grant of Pro (revenue/security).** `upgrade_tier` is granted to
   `authenticated` and writes `paid_pro` for `_reason='user_paid'` with any
   client-supplied `_payment_ref`, with **no receipt verification**. Any user can
   call the RPC directly and get Pro free, permanently; RTDN never corrects it.
   Now live because the beta override is off. (C-1)
2. **Hardcoded prices on every paywall** (`catalogue.js` `'£4.99/month'` shown via
   `priceTextFor` everywhere). Store policy violation on both Apple and Google,
   and the wrong currency for non-UK users. The store price is fetched but never
   displayed. (C-2)

## Submission / revenue blockers (mostly founder-side)
- **RTDN not deployed** → cancelled/refunded **paid** subscribers keep Pro (the
  pg_cron worker only expires *trials*). Deploying it also enables C-1's
  server-authoritative grant. (H-1, Doc B)
- **Play Console products + 7-day offer not created** → no purchase works at all.
- **Migrations 060-066 pending** (065 sets the trial to 14 days; 066 stores the
  bought plan).
- **iOS has no StoreKit purchase path**, Android-only today; iOS subscriptions
  are a separate build.

## Top 5 revenue-risk fixes
1. C-1, close the self-grant: client `upgrade_tier` rejects `user_paid`; paid
   grants only via the service-role RTDN path after Play verification.
2. Deploy `play-billing-rtdn` + create the Play products (Doc B), without these
   nothing charges and refunds/cancellations aren't reconciled.
3. C-2, show store-fetched localised prices, not the hardcoded `£4.99`.
4. Apply migrations 065/066 and sandbox-test a real purchase end to end.
5. M-1/M-2, unify the two restore paths and fix the `restore.js` legacy bits.

## Confidence for production
- **Engineering quality: high**, the flows are carefully built and now tested
  (cascade lifecycle + offer selection covered).
- **Revenue integrity: NOT production-ready** until C-1 (self-grant) and the RTDN
  deployment land. Shipping Pro for money before C-1 means Pro is effectively
  free to anyone technical and refunds don't revoke access.
- **Store compliance: blocked** by C-2 (hardcoded prices) until fixed.

Recommended order: C-1 + C-2 in code (this session, on confirmation) →
founder deploys RTDN + creates products + applies migrations → sandbox purchase →
then enable the real purchase path for production.
