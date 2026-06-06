# Trial length + when to ask for the card (strategy memo)

Date 2026-06-06. Grounds the 4-week-trial decision in what is already built
plus current trial-conversion benchmarks. Strategy, not a code change.

> **Decision (2026-06-06, founder): 14 + 7, 21 days free total.** 14
> cardless days in the app, then a 7-day Google Play intro free trial on
> the Pro subscription. Chosen over the 28-day variant for tighter
> conversion and faster revenue while still covering both early
> adjustment cycles. The card is captured only when the user subscribes
> (day 14 onward), so the "no early ask" principle holds. This supersedes
> the "28 days" recommendation in the body below. Code/doc state put in
> place 2026-06-06: migration 065 (trial 21→14), the locked-doc override,
> and the purchase-surface copy now reads the 7-day Play offer.
>
> **Founder-action checklist (these gate go-live; I can't do them):**
> 1. **Play Console:** on the Pro subscription product, add a base plan
>    with a **7-day free-trial offer** (auto-renewing monthly), for the
>    current pricing-window SKU. Eligibility is once-per-user, enforced by
>    Google.
> 2. **Wire the real Play Billing SDK.** `src/lib/payments/playBilling.js`
>    is still a stub. It must read the actual offer + eligibility (so the
>    "7 days" copy can be SDK-driven, not hardcoded) and run the purchase.
> 3. **Edge Function** `play-billing-rtdn` for server-side receipt
>    validation + RTDN, per SUBSCRIPTION_AND_PAYMENT_LOCKED.
> 4. **Apply migration 065** (in numeric order, after 064) so new trials
>    are 14 days. Safe during beta (PRO_BETA_ACTIVE masks expiry).
> 5. Only after 1-4: move the trial-start trigger to the first Pro touch
>    and ship the day-14 value-anchored ask.

## What is already built (do not rebuild)
- A single Pro trial, no card upfront, started at onboarding (Article 9 consent
  sets `trial_state = pro_trial_active`). Currently **21 days**
  (`SUBSCRIPTION_AND_PAYMENT_LOCKED.md`); the old 28-day cascade was retired.
- The conversion prompt is a soft **inline card in a value surface** at the trial
  gate, not a hard paywall (`CascadeGateScreen`, day-gate variants). Push
  reminders exist (`scheduleCascadeGateNotifications`).
- At trial end with no payment the user reverts to **Free** (Plan Library +
  logging stay free, coaching locks). This is a reverse trial / freemium revert,
  which is the right shape.
- During beta everyone is Pro free (`PRO_BETA_ACTIVE`), so none of this is live
  yet; it switches on when beta ends.

So your instinct (no card early, ask near the end) is already the model. The
open decisions are trial length, and exactly when/how the ask fires.

## The one principle: anchor the ask to the value moment, not a date
Volyume's value timeline (from the code):
- Day 0: plan + calorie/macro targets. Useful, but competitors give a static
  plan for free. Not yet the unique value.
- ~Day 7: first weekly check-in (needs about 5 days of weigh-ins first).
- **~Day 14: first Precision Coaching adjustment** (the app changes your
  training/nutrition from YOUR data). This is the aha. The CoachOutput copy
  already says adjustments hold until about two weeks of weigh-ins plus a
  check-in.

Asking for payment before ~day 14 is the "too early" you are worried about: the
user has only seen a static plan. The earliest good ask is just **after the
first adjustment lands**, when they have felt the thing they would pay for.

## Trial length: 28 days is defensible here, with conditions
Benchmarks: 5-9 day trials are most common and convert well (median ~45%) for
simple apps, but Volyume needs ~2 weeks of data before its core value even
appears, so a 7-day trial would end before the aha. For tools that need data
accumulation, 14-30 days is the recommended band. 17-32 day trials have the
highest median conversion (~46%) BUT ~51% of 30-day trialists cancel before the
end, so a long trial only works with a real end-of-trial reminder sequence.

Recommendation: **28 days**, because it lets the user live through the first
adjustment (~day 14) and a second cycle (~day 21) before deciding, so they are
paying on felt value, not a promise. Accept that it needs the reminder sequence
below. (21 days, the current value, is the tighter-urgency alternative and also
fine; the gain from 28 is one extra adjustment cycle of felt value.)

## When to prompt (the schedule)
1. Days 0-13: NO payment ask. Onboarding sets the expectation and the app drives
   logging (morning weight daily, sessions, food). Surface trial status quietly
   ("Pro trial, 28 days") but do not sell.
2. ~Day 14-16, right after the first adjustment: the first soft ask, an inline
   card in the coaching surface: "This is Precision Coaching adapting to your
   data. Keep it when your trial ends." Value-anchored, dismissible, no wall.
3. Day 23 (5 days left) and Day 26-27 (about 3 days left, per benchmark): trial
   ending reminders, push + inline. Plain, not alarmist: "Your Pro trial ends in
   X days. Subscribe to keep weekly coaching, targets, and the food diary."
4. Day 28: the gate. Two clear choices, Pro (£4.99/month) or continue on Free.
   No lockout, no dark pattern, a visible "continue free" path. Free keeps the
   Plan Library + logging; coaching/targets/diary lock with a one-tap re-subscribe
   later. A user who lapses to Free stays a re-conversion candidate.

## Mechanics constraint (important for "pay at the end")
With Apple/Google IAP you cannot pre-store a card and auto-charge at day 28
yourself. Two only options:
- No-card reverse trial (what you want, what is built): the app grants the trial
  with no card; when the user taps Subscribe (at the day-14 ask or later), IAP
  takes the card THEN and the paid sub starts THEN. More signups, but the user
  must actively convert, so the day-14 value anchor + the reminder sequence are
  what carry conversion.
- Card-upfront IAP free trial: StoreKit/Play intro offer, card at trial start,
  auto-bills day 28 unless cancelled, platform sends the reminders. Higher
  auto-capture but card-upfront deters a large share of signups and is exactly
  the early ask you want to avoid.
Stay with the no-card model. Just make the day-14 ask and the end reminders
strong, because conversion is active, not automatic.

## Onboarding to first check-in: is it fast enough?
Mechanically yes: the first check-in needs ~5 days of weigh-ins and lands on the
user's chosen weekday (~day 7), and the reminder is scheduled
(`scheduleNextCheckinReminder`). Both the check-in (~day 7) and the first
adjustment (~day 14) fall well inside a 28-day trial, so the user reaches the
value before any ask. The gap is expectation-setting, not speed: onboarding
should state plainly "log your morning weight every day; your first check-in is
in about a week and your first coaching adjustment about a week after that," so
week one feels purposeful and tied to what they will be asked to pay for. That
single change is the highest-leverage onboarding fix for trial conversion.

## If you want it built
Concrete changes when you green-light: extend trial to 28 days; add the day-14
value-anchored ask after the first adjustment; add the day-23 / day-26 reminder
schedule; add the onboarding expectation copy. All fit the existing cascade +
notification machinery; none needs StoreKit work beyond the IAP that Phase 4 of
the App Store audit already scopes.
