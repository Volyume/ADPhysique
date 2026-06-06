# Subscriptions audit, Document B: manual / off-codebase actions

Status: COMPLETE. Date: 2026-06-06. These cannot be done from the repo. "BLOCKS"
stops billing working or stops store approval.

## BLOCKS: billing works at all
1. **Create the Play Console subscription products** `pro_monthly` (£4.99/mo) and
   `pro_annual` (£29.99/yr), each with a base plan and a **7-day free-trial
   offer**. Product IDs must equal `src/lib/payments/catalogue.js` exactly.
   Without these, `fetchProducts` returns nothing, `selectOfferToken` is null,
   and `purchasePackage` throws "No Play offer for …" (`playBilling.js:272`).
2. **Apply Supabase migrations 060-066** in order (esp. `065` trial→14d, `066`
   `billing_period`); verification queries in `supabase/README.md`.
3. **Deploy `play-billing-rtdn`** (`supabase functions deploy play-billing-rtdn
   --no-verify-jwt`) and set its env: `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`,
   `GOOGLE_PLAY_PACKAGE_NAME=app.volyume`, `RTDN_OIDC_AUDIENCE`,
   (optional `RTDN_SERVICE_ACCOUNT_EMAIL`). Wire the Pub/Sub topic +
   push subscription per the function header. **This is what reconciles paid
   cancel/refund/expiry (finding H-1) and is the server-authoritative grant
   path that finding C-1's fix depends on.**
4. **Sandbox purchase** end-to-end on a real device via a licensed tester;
   confirm a `tier_history` row + `trial_state='paid_pro'` + `billing_period`
   land server-side.

## BLOCKS: store approval (both platforms)
5. **Server-side receipt verification is required by C-1's fix**, it already
   exists in the RTDN function (Play Developer API lookup). Ensure the service
   account has Android Publisher access. (No new server code; deployment +
   credentials.)
6. **Subscription terms disclosure** on the paywall, the copy is present
   (`PaywallScreen` renew cadence + "Free for 7 days, then …"), but it shows a
   **hardcoded price** (finding C-2). The code fix renders the store price;
   confirm the Play product price matches what users should see.
7. **Privacy Policy + Terms links from the paywall**, confirm both are reachable
   from the paywall surface (Apple 3.1 requires it). `SubscriptionPolicyScreen`
   exists; verify it (and the privacy policy) is linked from PaywallScreen /
   ProUpgrade, not only Settings.

## Manual config to confirm
8. **Proration modes** for any future plan changes (monthly↔annual), configured
   in the Play purchase request; not exercised by the current single-Pro model
   (there is no Pro→Complete path; Complete was removed). No action unless plan
   tiers are added.
9. **Account hold / grace period** behaviour: the RTDN maps ON_HOLD /
   IN_GRACE_PERIOD to a payment-failure push and **keeps access** during grace
   (no tier change). Confirm the Play Console grace-period + account-hold settings
   are enabled so Google actually sends those notifications.

## iOS
10. **No StoreKit purchase path is implemented.** This audit covers the Android
    Play Billing system. iOS purchases (StoreKit 2, subscription group, App Store
    server notifications) are **not built**. If iOS subscriptions ship Monday,
    that is a separate build: StoreKit product fetch, purchase, restore, and an
    App Store Server Notifications v2 endpoint mirroring the RTDN. Flagged so it
    is not assumed done.

## Receipt-validation note
Client-side, the app trusts the purchase result and writes the tier (finding
C-1/H-2). The authoritative check is the RTDN's Play Developer API lookup. There
is **no purchase-token verification at the moment of the client `upgrade_tier`
write**, that is the gap C-1 closes by moving paid grants server-side.
