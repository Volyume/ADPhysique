# Subscription and payment (locked)

> **Founder override 2026-06-06 (trial shape):** The single Pro trial
> splits into two halves, 21 days free total still:
>
> 1. **14 cardless days in the app.** Article 9 consent starts the
>    `pro_trial_active` window, now **14 days** (migration 065 changes
>    `start_cascade` from `interval '21 days'` to `interval '14 days'`).
>    No card. The day-14 worker reverts to Free if the user does
>    nothing.
> 2. **7-day Google Play intro free trial** on the Pro subscription
>    product. When the user subscribes (at the day-14 ask or any earlier
>    Pro touch), Google's intro offer gives 7 more days free with the
>    card on file, then bills. This half is Play Console config, not a
>    database concern: our state machine treats a Play subscriber as
>    `paid_pro` the moment the subscription starts, intro trial or not.
>
> Net: 14 + 7 = 21 days free, but the card is only captured at the
> point of subscribing (day 14 onward), so the "no early ask" principle
> holds. The day-21 references below become **day-14** for the in-app
> gate; the 7-day figure is the Play purchase-surface disclosure.
> Rationale and the conversion trade-off (vs a 28-day variant) are in
> `docs/TRIAL_CONVERSION_STRATEGY_2026-06-06.md`. The in-app figures
> below that still read "21" predate this override; where they conflict
> this block governs.
>
> **Not yet live:** the real Play Billing path is still a stub
> (`src/lib/payments/playBilling.js`), and the Play Console 7-day offer
> must be created before any of this converts. See the founder-action
> checklist in the strategy memo.

> **Founder override 2026-06-06 (pricing):** Flat pricing replaces the
> escalating launch/founders/standard windows. Pro is **£4.99/month** or
> **£29.99/year** (annual ~50% off). Two Play Console products to create:
> `pro_monthly` and `pro_annual`, each carrying the 7-day intro free-trial
> offer. The `locked_in_price_tier` window machinery is retired client-side
> (`src/lib/payments/catalogue.js` now keys on billing period, not window);
> the Paywall carries a monthly/annual toggle, other purchase surfaces
> default to monthly. The SKU tables further down that still list
> £0.99/£1.99/£3.99 windows are superseded by this block. The day-14 gate
> now also carries the monthly/annual toggle. The purchased period is
> stored on the profile (migration 066 `billing_period`, set by the
> play-billing-rtdn webhook) and read by the Subscription screen, so
> annual subscribers see £29.99/year. ProUpgrade still subscribes monthly.

> **Founder override 2026-05-25:** Three structural changes since
> the original 2026-05-23 lock:
>
> 1. **2-tier model** (Free, Pro). Complete tier dropped. See
>    `COMPLETE_TIER_SCOPE_LOCKED.md` for the new tier scope.
> 2. **Single 21-day Pro trial**, not a 28-day cascade. No day-14
>    Complete→Pro step. Day-21 gate replaces day-28.
> 3. **Google Play Billing direct**, not RevenueCat. Saves the 1%
>    above £2.5k MRR; one fewer third-party dependency. iOS deferred
>    indefinitely; cross-platform identity that RevenueCat solved
>    is moot on Android-only.
>
> Updated values are in the sections below. Historical 3-tier text
> with the cascade state machine is preserved at the bottom for
> traceability but does NOT govern.

The state machine, the payment integration, and the rules that keep
tier state consistent. Originally locked 2026-05-23; re-locked
2026-05-25 with the changes above.

## Sign-in providers (unchanged)

Locked at native SDKs on mobile, not web OAuth flows.

### Android: Google Sign-In via native SDK

- Library: `@react-native-google-signin/google-signin`.
- Google Cloud Console: OAuth client (Android type) configured with
  the app's package name and SHA-1 signing cert.
- Flow: native Google picker → Google ID token → Supabase
  `signInWithIdToken({ provider: 'google', token })`.

### iOS: deferred indefinitely

iOS is not in scope at Phase B per the Android-only locked decision.
Apple Sign-In wiring stays out until iOS lands.

### Email magic link (fallback)

Existing Supabase email magic link flow. Used as a fallback when
native sign-in fails or for users who prefer email.

## Provider

**Google Play Billing direct.** Founder override 2026-05-25
replacing the original locked RevenueCat choice; rationale recorded
in `docs/CURRENT_STATUS.md`. The IAP SDK (`react-native-iap` or
`expo-in-app-purchases`) wraps Play Billing; receipt validation
runs server-side via a Supabase Edge Function calling Google's
Play Developer API verifyPurchase endpoint. Real-Time Developer
Notifications (RTDN) Pub/Sub topic delivers renewal / cancel /
refund events to the same Edge Function.

Cost posture (see `BUDGET_POSTURE_LOCKED.md`): zero recurring third-
party fee. Google takes their 15% (small business programme) at the
store layer; that's unavoidable and baked into pricing.

## The product catalogue

**Three SKUs at launch**, all Pro:

| SKU ID | Pricing window | UK price |
|---|---|---|
| `pro_monthly_open_beta` | Open beta (first 4 weeks post-GA) | £0.99/month |
| `pro_monthly_founders` | Founders (weeks 5-16) | £1.99/month |
| `pro_monthly_standard` | Standard (week 17+) | £3.99/month |

When a user signs up they see only the SKU matching the current
pricing window. Once subscribed, they stay on that SKU for life
unless cancelled (lapse = lose the locked price; resubscribe at
the then-current price).

Coach tier SKUs (phase 2) remain a separate set (see historical
section), purchased via Stripe from the coach web dashboard.

## The trial state machine

Locked in `COMPLETE_TIER_SCOPE_LOCKED.md`. Re-stating with explicit
transitions for the 2-tier model.

States:

- `unstarted`: fresh account, hasn't passed Article 9 consent yet
- `pro_trial_active`: days 1-14 of the cardless in-app Pro trial
  (was 21; see the 2026-06-06 override at the top)
- `paid_pro`: user paid for Pro (any pricing window)
- `free`: trial expired without payment, or user skipped to Free
- `cascade_expired`: equivalent to `free`; kept distinct for telemetry

(Legacy values `complete_trial_active` and `paid_complete` remain
in the schema CHECK constraint for compatibility with already-
applied migration 030, but they are NEVER set by code in the
2-tier model.)

Transitions:

| From | Trigger | To |
|---|---|---|
| `unstarted` | Article 9 consent confirmed | `pro_trial_active` |
| `pro_trial_active` | Day 14 + no action | `cascade_expired` |
| `pro_trial_active` | User pays Pro | `paid_pro` |
| `pro_trial_active` | User skips to Free | `free` |
| `paid_pro` | Play Billing reports cancellation | `free` (after grace period) |
| `paid_pro` | User cancels and renewal cycle ends | `free` |
| `free` | User pays Pro | `paid_pro` |
| Any | Account deleted | (no state, row gone) |

## Grace period

When Google Play reports a payment failure (declined card, expired
card, billing retry exhausted), the user does NOT lose tier
immediately. Grace: **3 days from payment failure to tier
downgrade.**

Behaviour unchanged from the original spec, just narrower in
target tiers (only Pro now). During grace:

- User retains full Pro benefits.
- In-app banner: "We couldn't take your payment. Update your
  billing in Google Play within 3 days to keep your Pro features."
- One reminder push at 24h and 48h.
- After 72h, tier downgrades to `free` and a "Your subscription
  has ended" banner appears with a re-upgrade CTA.

Google's own retry window (typically 16 days under their
account-hold policy) operates on top of ours: if Google is still
retrying past day 3 we keep showing the "couldn't take payment"
banner and only flip to `free` if Google eventually gives up.

## Cancellation

### User cancels from inside Volyume

You → Subscription → Cancel. Single tap to confirmation:

> **Cancel your Volyume subscription?**
>
> You'll keep your Pro features until your current billing period
> ends on [date]. After that, you'll drop to Free. Your training
> history, food log, and check-ins all stay; some Pro-tier features
> become read-only.
>
> [ Keep my subscription ]   [ Cancel anyway ]

"Cancel anyway" deep-links into Google Play's subscription
management page; Google requires their own UI for actual
cancellation.

### User cancels from Google Play

Play Billing webhook fires. We update `profiles.trial_state` to
reflect: subscription remains active until expiry date, then
auto-transitions to `free`.

## Refund handling

Refunds happen entirely through Google Play. We do not handle
refunds directly.

When Play Billing reports a refund (RTDN `SUBSCRIPTION_REVOKED`):

- Tier immediately downgrades to `free`.
- `tier_history` row records the refund with reason `refunded`.
- No notification to user (they initiated the refund and know it
  happened).
- ED-pattern flag state is preserved (refund doesn't clear safety
  history).

## Receipt validation

The Supabase Edge Function (`/functions/v1/play-billing-rtdn`)
validates purchase tokens against Google's Play Developer API
verifyPurchase endpoint server-side. The client never trusts a
raw IAP success callback alone.

The flow:

1. User taps "Upgrade to Pro".
2. App initiates IAP via the chosen SDK
   (`Purchases.requestSubscription(skuId)` for `react-native-iap`).
3. Google Play completes the purchase.
4. App posts the purchase token to our Edge Function.
5. Edge Function calls Google's Play Developer API to verify the
   token and read subscription state.
6. On verified-purchase, the Edge Function calls `upgrade_tier(
   target_tier, payment_ref)` RPC.
7. RPC writes `tier_history` row and updates `profiles.trial_state`.
8. App refreshes `profiles` row via the sync layer.

## Cross-platform subscription state

Android-only at v1. When iOS lands (phase later), the same Edge
Function pattern will validate Apple receipts via App Store
Connect's verifyReceipt endpoint; a single user account with
purchases on both platforms gets a single entitlement (tier
follows the user, not the device).

## Founding-price lock-in

Locked-in pricing is enforced platform-side via the SKU the user
originally purchased.

- User signs up during open beta, buys `pro_monthly_open_beta` at
  £0.99/mo. Google charges them £0.99/mo at every renewal as long
  as the subscription stays continuously active.
- If they cancel and resubscribe later, they buy whatever SKU is
  current (Founders or Standard).
- We don't manipulate price ourselves; we rely on Google Play's
  subscription continuity rule to keep them on the original SKU.

## Tier transitions in `profiles`

The `profiles` table (`users_profile` in our schema) tracks current
state. Schema additions (already applied in migration 030):

```
trial_state             text NOT NULL DEFAULT 'unstarted'
trial_started_at        timestamptz
complete_trial_ends_at  timestamptz       -- legacy, unused in 2-tier
pro_trial_ends_at       timestamptz       -- the 21-day end timestamp
locked_in_price_tier    text   -- 'open_beta','founders','standard'
revenuecat_app_user_id  text   -- legacy column name; stores auth.uid()
```

Every transition writes a `tier_history` row.

## The `upgrade_tier` RPC

Locked signature:

```sql
upgrade_tier(
  _target_tier    text,           -- 'pro','free'
  _reason         text,            -- 'user_paid','user_skip','user_cancelled','grace_lapsed','admin','refunded','auto_downgrade'
  _source_surface text DEFAULT NULL,
  _payment_ref    text DEFAULT NULL
) RETURNS jsonb
```

Whitelisted (via session_replication_role) to bypass the existing
`protect_users_profile_tier` trigger.

Behaviour:
- `user_paid` requires `_payment_ref` (Play Billing purchase token).
- `admin` requires service-role JWT.
- All transitions write `tier_history`.
- Sets `locked_in_price_tier` based on current pricing window at
  first paid transition (and never changes after).
- Returns `{trial_state, tier, locked_in_price_tier,
  pro_trial_ends_at, payment_ref}`.

The legacy 3-tier transitions to `paid_complete` / from
`complete_trial_active` are kept compileable but never executed in
the 2-tier model (cleaner not to delete dead code paths until next
schema cleanup).

## Webhook contract

Google Play Real-Time Developer Notifications (RTDN) → Supabase
Edge Function (`/functions/v1/play-billing-rtdn`).

Events handled:

| RTDN notificationType | Our response |
|---|---|
| `SUBSCRIPTION_PURCHASED` | `upgrade_tier('pro', 'user_paid', payment_ref)` |
| `SUBSCRIPTION_RENEWED` | No-op (subscription continues) |
| `SUBSCRIPTION_CANCELED` | Set `cancellation_scheduled_for`; no tier change yet |
| `SUBSCRIPTION_EXPIRED` | `upgrade_tier('free', 'user_cancelled')` |
| `SUBSCRIPTION_ON_HOLD` | Set `payment_failed_at`; start the 3-day grace clock |
| `SUBSCRIPTION_REVOKED` | `upgrade_tier('free', 'refunded')` |
| `SUBSCRIPTION_PAUSED` | Pause Pro features; resume on `SUBSCRIPTION_RESTARTED` |
| `SUBSCRIPTION_RESTARTED` | Re-enable Pro |
| `SUBSCRIPTION_PRICE_CHANGE_CONFIRMED` | Update locked-in price |
| `SUBSCRIPTION_DEFERRED` | Update next-renewal timestamp |

Webhook auth: Google's Pub/Sub OIDC token verification on the
Edge Function. Reject any request with bad signature with 401.

## In-app purchase surfaces

Two places a user encounters payment:

### Day-14 trial gate

Modal with:
- The Free vs Pro feature strip.
- "Continue at Pro" CTA → starts the Pro subscription. Google's 7-day
  intro free trial applies here, so the purchase disclosure reads "Free
  for 7 days, then £X/month" (the Play offer), not 21.
- "Drop to Free" → fires `upgrade_tier('free', 'user_skip')`.

### Differential paywall trigger (move #4)

Inline card in the relevant insight surface (Stalled Lift, Energy
Crash, etc.) per the conversion copy locked in
`MOVE_4_DIFFERENTIAL_PAYWALL.md`.
- Single CTA: "Try Pro free for 7 days" (the Play intro offer; the
  14 cardless days run before the user reaches a purchase surface).
- Tapping a free user who has already completed their trial
  surfaces a different copy: "Get Pro for £[current price]/month."

## Restore purchases

You → Subscription → Restore. Calls the IAP SDK's
`getAvailablePurchases()` / equivalent. Returns the user's
entitlements; we sync `profiles.trial_state` accordingly. No-op if
nothing to restore.

## Implementation files

```
src/lib/payments/
├── playBilling.js        -- IAP SDK initialisation and wrappers
├── catalogue.js          -- the three consumer SKUs + lookup helpers
├── cascade.js            -- the trial state machine (transitions, gate)
└── restore.js            -- restore purchases flow

src/screens/
├── CascadeGateScreen.js  -- the day-21 modal
└── SubscriptionScreen.js -- You-tab subscription management
```

Edge function lives in `supabase/functions/play-billing-rtdn/`.

## Testing

- Sandbox tester accounts on Google Play Console for every
  transition.
- Play Billing test purchases used to verify our Edge Function
  handler.
- A scripted test cycles through every transition above in a Play
  Billing sandbox before Phase A exit.
- Grace period test: revoke a sandbox subscription, observe the
  3-day banner, verify auto-downgrade at 72h.

## Acceptance check

- State machine passes all transitions in test (see
  `payments.cascade.test.js`).
- A sandbox purchase of `pro_monthly_open_beta` results in
  `paid_pro` state + `locked_in_price_tier = 'open_beta'`.
- Cancelling on Play Billing sandbox triggers `SUBSCRIPTION_CANCELED`
  webhook → banner appears → `SUBSCRIPTION_EXPIRED` fires at period
  end → tier becomes `free`.
- Refunding via Play Billing sandbox immediately downgrades tier.
- Restore purchases on a clean install correctly restores tier.

---

## Historical context (3-tier + RevenueCat, superseded 2026-05-25)

The original 2026-05-23 spec used three tiers (Free, Pro, Complete)
with a 28-day cascade (14 Complete → 14 Pro → Free) and RevenueCat
as the IAP provider. That spec is preserved below for traceability
with prior LOCKED docs. The current 2-tier + Play Billing model
above governs the implementation.

## Sign-in providers

Locked at native SDKs on mobile, not web OAuth flows. Reason: the
web-based Supabase OAuth flow shows the Supabase project domain on
Google's account picker (e.g. `xyz.supabase.co`) which reads
unprofessional. Native SDKs show our app branding instead.

### Android: Google Sign-In via native SDK

- Library: `@react-native-google-signin/google-signin`.
- Google Cloud Console: OAuth client (Android type) configured with
  the app's package name and SHA-1 signing cert. App name set to
  "Volyume" so the picker shows "Sign in to Volyume."
- Flow: native Google picker -> Google ID token -> Supabase
  `signInWithIdToken({ provider: 'google', token })`.
- Cost: free. No Supabase paid plan needed.

### iOS: Apple Sign-In via Expo native module

- Library: `expo-apple-authentication`.
- Apple's rules require apps offering third-party sign-in to also
  offer Apple Sign-In. So iOS leads with Apple; Google Sign-In is
  optional secondary on iOS.
- Flow: native Apple picker -> Apple identity token -> Supabase
  `signInWithIdToken({ provider: 'apple', token })`.

### Email magic link (fallback)

Existing Supabase email magic link flow. Works on both platforms.
Used as a fallback when native sign-in fails or for users who
prefer email.

### Why not Supabase custom domain at v1

Supabase's custom-domain feature (`auth.volyume.app` instead of the
project-default domain) costs $10/month on the Pro plan. Native
sign-in solves the same UX problem (no public-facing Supabase
domain) for free. Revisit if we later need it for web-based OAuth
flows that don't have native SDK alternatives.

## Provider

RevenueCat on top of Apple StoreKit 2 and Google Play Billing. Locked
in `MASTER_VISION_AND_PLAN.md` Section 2.2.

Cost posture (see `BUDGET_POSTURE_LOCKED.md`): free below $2,500/mo
MRR, then 1% of revenue above that.

## The product catalogue

Six SKUs at launch, three per platform (App Store Connect + Google
Play Console):

| SKU ID | Tier | Pricing window | UK price |
| --- | --- | --- | --- |
| `pro_monthly_open_beta` | Pro | Open beta (first 4 weeks post-GA) | £0.99/month |
| `pro_monthly_founders` | Pro | Founders (weeks 5-16 post-GA) | £1.49/month |
| `pro_monthly_standard` | Pro | Standard (week 17+) | £2.99/month |
| `complete_monthly_open_beta` | Complete | Open beta | £1.99/month |
| `complete_monthly_founders` | Complete | Founders | £3.49/month |
| `complete_monthly_standard` | Complete | Standard | £6.99/month |

When a user signs up they see only the SKU matching the current
pricing window. Once subscribed, they stay on that SKU for life
unless cancelled (lapse = lose the locked price; resubscribe at the
then-current price).

Coach tier SKUs (phase 2) are a separate set:

| SKU ID | Tier | Notes |
| --- | --- | --- |
| `coach_starter_monthly` | Coach Starter | £29.99/mo (£14.99 founding-coach) |
| `coach_pro_monthly` | Coach Pro | £59.99/mo (£29.99 founding-coach) |
| `coach_studio_monthly` | Coach Studio | £119.99/mo (£59.99 founding-coach) |

Coach SKUs only purchasable from the coach web dashboard, not from
the consumer mobile app. Stripe rather than IAP because they're
purchased from a desktop web flow where Stripe is the natural fit
and Apple/Google IAP rules wouldn't apply.

## The trial cascade state machine

Locked in `COMPLETE_TIER_SCOPE_LOCKED.md`. Re-stating with explicit
transitions.

States:

- `unstarted`: fresh account, hasn't passed Article 9 consent yet
- `complete_trial_active`: days 1-14 of the cascade
- `pro_trial_active`: days 15-28 of the cascade
- `paid_complete`: user paid for Complete (any pricing window)
- `paid_pro`: user paid for Pro (any pricing window)
- `free`: cascade expired without payment, or user skipped to Free
- `cascade_expired`: equivalent to `free`; kept distinct for telemetry

Transitions:

| From | Trigger | To |
| --- | --- | --- |
| `unstarted` | Article 9 consent confirmed | `complete_trial_active` |
| `complete_trial_active` | Day 14 + no action | `pro_trial_active` |
| `complete_trial_active` | User pays Complete | `paid_complete` |
| `complete_trial_active` | User pays Pro | `paid_pro` |
| `complete_trial_active` | User skips to Free | `free` |
| `pro_trial_active` | Day 28 + no action | `cascade_expired` |
| `pro_trial_active` | User pays Pro | `paid_pro` |
| `pro_trial_active` | User pays Complete | `paid_complete` |
| `pro_trial_active` | User skips to Free | `free` |
| `paid_*` | RevenueCat reports cancellation | `free` (after grace period, see below) |
| `paid_pro` | User upgrades to Complete | `paid_complete` |
| `paid_complete` | User downgrades to Pro | `paid_pro` (at next renewal) |
| `free` | User pays anything | `paid_*` |
| Any | Account deleted | (no state, row gone) |

## Grace period

When RevenueCat reports a payment failure (declined card, expired
card, billing retry exhausted), the user does NOT lose tier
immediately. Grace: **3 days from payment failure to tier
downgrade.**

During grace:
- User retains full tier benefits.
- In-app banner: "We couldn't take your payment. Update your billing
  in [App Store / Google Play] within 3 days to keep your Complete
  features."
- One reminder push at 24h and 48h.
- After 72h, tier downgrades to `free` and a "Your subscription has
  ended" banner appears with a re-upgrade CTA.

Apple and Google both have their own retry grace periods (typically
16 days). Our 3-day window operates on top of theirs: if Apple is
still retrying past day 3 we keep showing the "couldn't take payment"
banner and only flip to `free` if Apple eventually gives up.

## Cancellation

Two paths:

### User cancels from inside Volyume

You → Subscription → Cancel. Single tap to a confirmation:

> **Cancel your Volyume subscription?**
>
> You'll keep your Complete features until your current billing
> period ends on [date]. After that, you'll drop to Free. Your
> training history, food log, and check-ins all stay; only some
> Complete-tier features become read-only.
>
> [ Keep my subscription ]   [ Cancel anyway ]

The "Cancel anyway" tap deep-links into the platform's subscription
management page (App Store / Google Play) because Apple and Google
both require their UI to be used for actual cancellation. We can't
cancel server-side.

### User cancels from App Store / Google Play

RevenueCat webhook fires. We update `profiles.trial_state` to
reflect: subscription remains active until expiry date, then auto-
transitions to `free`.

User sees a banner in Volyume: "Your subscription ends on [date].
After that you'll drop to Free."

## Refund handling

Refunds happen entirely through Apple / Google. We do not handle
refunds directly.

When RevenueCat reports a refund:
- Tier immediately downgrades to `free`.
- `tier_history` row records the refund with reason `refunded`.
- No notification to user (they initiated the refund and know it
  happened).
- ED-pattern flag state is preserved (refund doesn't clear safety
  history).

## Receipt validation

RevenueCat handles this server-side. We trust the RevenueCat webhook
as the source of truth.

The flow:

1. User taps "Upgrade to Complete" (or another paywall CTA).
2. App initiates IAP via RevenueCat SDK (`Purchases.purchasePackage`).
3. Apple / Google complete the purchase.
4. RevenueCat validates the receipt and grants entitlements.
5. RevenueCat webhook hits our `/api/revenuecat/webhook` endpoint
   (Supabase Edge Function).
6. Webhook handler calls `upgrade_tier(user_id, target_tier,
   payment_ref)` RPC.
7. RPC writes `tier_history` row and updates `profiles.trial_state`.
8. App receives the updated `profiles` row via the next sync (or via
   a manual `Purchases.getCustomerInfo()` refresh).
9. User sees the upgraded tier instantly (we update local state
   optimistically on purchase success, server confirms within
   seconds).

## Cross-platform subscription state

A user can sign in on iPhone (Apple subscription) and then on Android
(no Google subscription) on the same Volyume account. RevenueCat's
`appUserID` is our Supabase `auth.uid()`. RevenueCat aggregates
entitlements across platforms, so:

- User pays £1.49 for Pro on iPhone.
- User signs in on Android with the same Volyume account.
- Android Volyume sees `paid_pro` tier via RevenueCat customer info.
- Android user does NOT pay again. They use Pro features for free
  on Android because they're paying via Apple.

This is standard RevenueCat behaviour. We just respect what it tells
us.

## Founding-price lock-in

Locked-in pricing is enforced platform-side via the SKU the user
originally purchased.

- User signs up during open beta, buys `pro_monthly_open_beta` at
  £0.99/mo. Apple/Google charge them £0.99/mo at every renewal as
  long as the subscription stays continuously active.
- If they cancel and resubscribe later, they buy whatever SKU is
  current (Founders or Standard).
- We don't manipulate price ourselves; we rely on the App Store /
  Google Play subscription continuity rule to keep them on the
  original SKU.

Edge case: Apple raises prices on the SKU. Apple's rules require us
to either keep the existing price for current subscribers or have
them re-confirm before the increase. We'll never raise prices on
existing subscribers; new subscribers from that day forward pay the
new price on the same SKU. Both stores support this.

## Tier transitions in `profiles`

The `profiles` table tracks current state. Locked schema additions
(also in `DATABASE_SCHEMA_LOCKED.md`):

```
trial_state             text NOT NULL DEFAULT 'unstarted'
trial_started_at        timestamptz
complete_trial_ends_at  timestamptz
pro_trial_ends_at       timestamptz
locked_in_price_tier    text   -- 'open_beta','founders','standard'
revenuecat_app_user_id  text   -- mirror of auth.uid() for clarity
```

Every transition writes a `tier_history` row.

## The `upgrade_tier` RPC

Locked signature:

```sql
upgrade_tier(
  target_tier text,           -- 'pro','complete','free'
  reason text,                -- 'user_paid','user_skip','user_cancelled','grace_lapsed','admin'
  payment_ref text DEFAULT NULL
) RETURNS jsonb
```

Whitelisted to bypass the existing tier-protect trigger.

Behaviour:
- `user_paid` requires `payment_ref` (RevenueCat transaction ID).
- `admin` requires service-role JWT.
- All transitions write `tier_history`.
- Sets `locked_in_price_tier` based on current pricing window at
  first paid transition (and never changes after).
- Returns `{trial_state, locked_in_price_tier, complete_trial_ends_at,
  pro_trial_ends_at, payment_ref}`.

## Webhook contract

RevenueCat → Supabase Edge Function (`/functions/v1/revenuecat-webhook`).

Events handled:

| RevenueCat event | Our response |
| --- | --- |
| `INITIAL_PURCHASE` | `upgrade_tier(target_tier, 'user_paid', transaction_id)` |
| `RENEWAL` | No-op (subscription continues) |
| `NON_RENEWING_PURCHASE` | Same as INITIAL_PURCHASE for our model |
| `PRODUCT_CHANGE` | If upgrade, fire `upgrade_tier`. If downgrade, schedule for next billing |
| `CANCELLATION` | Set `cancellation_scheduled_for` in profiles; no tier change yet |
| `EXPIRATION` | `upgrade_tier('free', 'user_cancelled')` |
| `BILLING_ISSUE` | Set `payment_failed_at`; start the 3-day grace clock |
| `REFUND` | `upgrade_tier('free', 'refunded', original_transaction_id)` |

Webhook auth: RevenueCat HMAC signature header verified against
`REVENUECAT_WEBHOOK_SECRET` (GitHub secret + Supabase env var).
Reject any request with bad signature with 401.

## In-app purchase surfaces

Two places a user encounters payment:

### Cascade hold gates (day 14, day 28)

Modal with:
- The tier comparison strip (locked in
  `OPEN_QUESTIONS_RESOLVED.md` Q3).
- "Continue at [Complete]" CTA → purchases the current Complete SKU.
- "Switch to Pro" → purchases the current Pro SKU.
- "Drop to Free" → fires `upgrade_tier('free', 'user_skip')`.

### Differential paywall trigger (move #4)

Inline card in the relevant insight surface (Stalled Lift, Energy
Crash, etc.) per the conversion copy locked in
`RESEARCH_FINDINGS_SYNTHESISED.md` Section 3 move #4.
- Single CTA: "Try Pro free for 14 days."
- Tapping a free user who has already completed their cascade
  surfaces a different copy: "Get Pro for £[current price]/month."
  (We don't lie about a trial they've used.)

## Restore purchases

You → Subscription → Restore. Calls
`Purchases.restorePurchases()`. RevenueCat returns the user's
entitlements, we sync `profiles.trial_state` accordingly. No-op if
nothing to restore (and we show a polite "Nothing to restore on this
account").

## Implementation files

```
src/lib/payments/
├── revenuecat.js          -- SDK initialisation and wrappers
├── catalogue.js           -- the six consumer SKUs + lookup helpers
├── cascade.js             -- the state machine (transitions, gates)
├── webhook-handler.js     -- Supabase Edge Function (not in client bundle)
└── restore.js             -- restore purchases flow

src/screens/
├── CascadeGateScreen.js   -- the day 14 and day 28 modals
└── SubscriptionScreen.js  -- You tab subscription management
```

Edge function lives in `supabase/functions/revenuecat-webhook/`.

## Testing

- Sandbox accounts on App Store Connect and Google Play Console for
  every cascade transition.
- RevenueCat's sandbox webhook test triggers used to verify our
  Edge Function handler.
- A scripted test cycles through every transition above in a
  RevenueCat sandbox before move #5 ships.
- Grace period test: revoke a sandbox subscription, observe the
  3-day banner, verify auto-downgrade at 72h.

## Acceptance check

- Cascade state machine passes all 17 transitions in test.
- A sandbox purchase of `pro_monthly_open_beta` results in
  `paid_pro` state + `locked_in_price_tier = 'open_beta'`.
- Cancelling on Apple sandbox triggers the CANCELLATION webhook ->
  banner appears -> EXPIRATION fires at period end -> tier becomes
  `free`.
- Refunding via Apple sandbox immediately downgrades tier.
- Cross-platform sign-in test: iPhone purchase visible on Android
  Volyume without re-charging.
- Restore purchases on a clean install correctly restores tier.
