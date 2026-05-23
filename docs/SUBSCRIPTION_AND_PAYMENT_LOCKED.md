# Subscription and payment (locked)

The cascade state machine, the payment integration, and the rules
that keep tier state consistent across platforms and devices. Locked
2026-05-23.

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

- `unstarted` — fresh account, hasn't passed Article 9 consent yet
- `complete_trial_active` — days 1-14 of the cascade
- `pro_trial_active` — days 15-28 of the cascade
- `paid_complete` — user paid for Complete (any pricing window)
- `paid_pro` — user paid for Pro (any pricing window)
- `free` — cascade expired without payment, or user skipped to Free
- `cascade_expired` — equivalent to `free`; kept distinct for telemetry

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
