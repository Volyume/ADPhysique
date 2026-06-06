# Phase 4: In-app purchase and subscription compliance

Status: COMPLETE. Date 2026-06-06. The single largest iOS gap.

## What exists
- `react-native-iap ^15.3.1` is a dependency (cross-platform capable).
- `src/lib/payments/playBilling.js` is the only provider implementation and it is
  Google Play Billing end to end: `setObfuscatedAccountIdAndroid`,
  `isAcknowledgedAndroid`, `finishTransaction`, and server-side validation via
  the Google Play Developer API in a Supabase RTDN Edge Function
  (`google-iap-rtdn`). SKU catalogue (`catalogue.js`) holds Google product ids.
- The trial cascade state machine (`cascade.js`) and the UI
  (`CascadeGateScreen`, `PaywallScreen`, `SubscriptionScreen`, `ProGate`) call
  `playBilling.purchasePackage(sku.id)` and `restorePurchases`.
- `App.js` calls `tryWireRealProvider()` on boot, which loads react-native-iap;
  on iOS this connects to StoreKit.

## Beta reality (important)
`src/lib/proGate.js` `PRO_BETA_ACTIVE = true`: every signed-in user resolves to
Pro for free during the beta (`useAppStore.js` lines 567-570, 766-767). So
nothing is actually being sold today. There is therefore no live "must use IAP"
violation, and no external-payment violation (no Stripe/PayPal in the UI).

## The blocker (3.1.1 + 2.1)
On iOS, the purchase CTAs are still reachable (ProGate "Go Pro", CascadeGate
pay button, PaywallScreen Start, SubscriptionScreen). Tapping pay calls
`react-native-iap.requestSubscription` with Google SKU ids that do not exist as
App Store Connect products, so the purchase fails. A reachable, non-functional
purchase button is a rejection under 2.1 (completeness) and 3.1.1.

## Two ways to be compliant
### Option A (small, near-term, matches the free-beta strategy)
Hide/disable every purchase CTA on iOS while `PRO_BETA_ACTIVE` is true, and do
not wire the real IAP provider on iOS. The app is fully usable (everyone is Pro,
free), nothing is sold, no broken purchase exists. Passes review. Touch points:
- `App.js` `tryWireRealProvider()` guard to `Platform.OS !== 'ios'` (or skip when
  beta).
- `ProGate.js` "Go Pro" button hidden on iOS during beta.
- `CascadeGateScreen` / `PaywallScreen` pay buttons hidden/disabled on iOS during
  beta (these mostly do not fire in beta because everyone is Pro, but they must
  not be reachable with a dead StoreKit call).
- `SubscriptionScreen` "Restore purchases" hidden on iOS during beta (it calls
  the Google path).
This is the recommended path: it makes iOS submittable now without building
StoreKit, consistent with the locked Android-first strategy.

### Option B (full, when iOS monetises)
Implement real StoreKit:
- A platform-conditional provider: keep `playBilling.js` for Android, add an
  `appStore.js` provider using react-native-iap's iOS StoreKit 2 path (or
  `expo-iap`), behind the same provider contract.
- Three iOS subscription products in App Store Connect (pro_monthly etc.),
  mapped to `catalogue.js` ids per platform.
- The 28-day cascade as StoreKit introductory offers (free trial then price).
- Server-side Apple receipt / JWS transaction validation in a new Edge Function
  (mirror the Google one), plus App Store Server Notifications v2 for
  renew/cancel/refund (mirror the RTDN webhook).
- Restore purchases on iOS reads StoreKit current entitlements.
The locked spec already describes this (`SUBSCRIPTION_AND_PAYMENT_LOCKED.md`
lines 374-435). It is days of work and needs the App Store Connect product +
banking/tax setup (Phase 10b).

## Paywall design (for when B lands)
`PaywallScreen` / `CascadeGateScreen` show tier value and the cascade; ensure
StoreKit-localised price + billing period + trial terms render before purchase
(StoreKit returns localised price; wire it). No dark patterns observed; a clear
dismiss exists. Manage-subscription deep link: `SubscriptionScreen` already
branches `Platform.OS === 'ios'` for the App Store management URL.

## Severity
CRITICAL as written (reachable dead purchase on iOS), but resolvable to PASS
quickly via Option A. Option B is the real monetisation build, separate project.
