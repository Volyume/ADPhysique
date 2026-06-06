# Subscriptions audit, Pre-work: system map

Status: COMPLETE. Date: 2026-06-06. Author: Claude (direct, no agents).
Method: read the actual code. Every claim cites a file. The brief assumed a
3-tier model (Free/Pro/Complete), a 28-day cascade, and possibly RevenueCat;
**none of that is the current system** and findings are written against the code
as it actually is.

## Model in force (from code, not the brief)
- **2 tiers: Free and Pro.** No Complete tier. `src/lib/proGate.js:_resolveTier`
  maps states to `'pro' | 'free'`; legacy `complete_*` states map to `pro` for
  migration-030 compatibility. Locked in `docs/COMPLETE_TIER_SCOPE_LOCKED.md`
  (2-tier override 2026-05-25; trial + pricing override 2026-06-06).
- **Trial: 14 + 7 (21 days free total), intended.** 14 cardless in-app days,
  then a 7-day Google Play intro trial. **DB currently still 21 days**:
  `start_cascade` in `supabase/migrate_033` uses `interval '21 days'`; migration
  065 changes it to 14 but **065 is pending apply**.
- **Provider: Google Play Billing direct via `react-native-iap` v15.** Not
  RevenueCat. `src/lib/payments/playBilling.js`. iOS/StoreKit is not wired for
  purchases yet (the EAS iOS build exists but no StoreKit purchase path; this is
  an Android-first production push).
- **Beta override OFF**: `PRO_BETA_ACTIVE = false` (`src/lib/proGate.js:28`).
  Trials/subscriptions are now live, so paths the override used to mask are now
  exercised.

## Product identifiers (from `src/lib/payments/catalogue.js`)
- `pro_monthly`, £4.99/month (priceText hardcoded).
- `pro_annual`, £29.99/year (priceText hardcoded).
- IDs must match Play Console products exactly (founder-side, not yet created).

## File map
**Entitlement / gating**
- `src/lib/proGate.js`, `_resolveTier(trialState, betaActive)`, `isPaidTier`,
  `PRO_BETA_ACTIVE`. Binary Pro; no granular FEATURE_MAP (removed 2026-05-29).
- `src/components/ProGate.js`, `ProGate` (overlay), `ProLocked`, `withProGuard`
  (route guard), `ProBadge`. All read `store.tier`.
- `src/store/useAppStore.js`, `tier` (string, persisted to AsyncStorage
  `TIER_KEY`), `checkTier`, `setTier`, `refreshTierFromCloud` (reads
  `users_profile.tier/trial_state/billing_period/pro_trial_ends_at`),
  `restoreSessionFromCloud`. **`store.tier` is the operative gate everywhere.**

**Purchase / cascade**
- `src/lib/payments/playBilling.js`, react-native-iap v15 adapter
  (`_buildRealProvider`), `tryWireRealProvider`, `injectProvider`, stub default,
  `initialise/purchasePackage/restorePurchases/getCustomerInfo/logOut`,
  `selectOfferToken` (7-day trial offer).
- `src/lib/payments/cascade.js`, RPC wrappers: `startCascade`, `payAt`,
  `skipToFree`, `autoDowngrade`, `cancel`, `graceLapsed`, `refunded`; read
  helpers `stageOf`, `canStillTrial`, `daysRemaining`.
- `src/lib/payments/restore.js`, `restorePurchases` (used by SubscriptionScreen).
- `src/lib/payments/catalogue.js`, `index.js`.

**Paywall / management surfaces**
- `src/screens/PaywallScreen.js` (modal), `src/screens/CascadeGateScreen.js`
  (trial gate), `src/screens/ProUpgradeScreen.js` (upgrade/trial start),
  `src/screens/SubscriptionScreen.js` (manage), `src/screens/SubscriptionPolicyScreen.js`,
  `src/components/TierComparisonStrip.js`, `src/components/DifferentialBadge.js`,
  `src/lib/differentialPaywall.js`.

**Server**
- `supabase/functions/play-billing-rtdn/index.ts`, RTDN handler (purchase,
  renewal, cancel, expire, grace, refund, pause/restart, price change). Verifies
  via Play Developer API; OIDC-gated; writes via `upgrade_tier_for_user`
  (service-role). **Not deployed yet.**
- Migrations: `030` tier infra, `031` cascade pg_cron workers, `033` 2-tier
  consolidation (`start_cascade`, `upgrade_tier`, `cascade_advance_due_users`),
  `042` `upgrade_tier_for_user` (service-role), `065` trial 21→14 (pending),
  `066` `billing_period` (pending). 030/031/033/042 applied per
  `docs/CURRENT_STATUS.md` §3.

## Entitlement flow (verified end to end)
1. Onboarding → `Article9ConsentScreen:95` → `cascade.startCascade()` →
   `start_cascade` RPC sets `tier='pro'`, `trial_state='pro_trial_active'`,
   `pro_trial_ends_at = now + 21d` (14d once 065 applied).
2. Gating reads `store.tier` (kept in sync with the cloud `tier` column by
   `refreshTierFromCloud`). `tier='pro'` during the trial, so trial users get Pro.
3. Trial expiry: pg_cron `cascade_advance_due_users` sets `trial_state=
   'cascade_expired'`, `tier='free'` when `pro_trial_ends_at` lapses. Client
   reflects it on next `refreshTierFromCloud`.
4. Subscribe: `PaywallScreen/CascadeGate/ProUpgrade` → `playBilling.purchasePackage`
   → `cascade.payAt('pro', ref)` → `upgrade_tier` RPC → `paid_pro`/`tier='pro'`.
   Client-acknowledged via `finishTransaction` in the purchase listener.
5. Server lifecycle (renewal/cancel/expire/refund/grace) → RTDN →
   `upgrade_tier_for_user`. **Requires RTDN deployment.**

## Offline / persistence
- `store.tier` persisted to AsyncStorage and rehydrated on launch
  (`checkTier`), so an active subscriber keeps Pro offline (fail-open). No local
  `pro_trial_ends_at` expiry check on the client; expiry is server-worker driven
  and reflected on the next cloud refresh.

## Test coverage in scope
`proGate.test.js`, `payments.cascade.test.js`, `cascade.lifecycle.test.js`
(added this session), `cascade.twoTierGuard.test.js`, `playBilling.offer.test.js`,
`differentialPaywall.test.js`, `rtdnWebhook.contract.test.js`,
`tier-screens-mount.test.js`, `auth-scenarios.test.js`.
