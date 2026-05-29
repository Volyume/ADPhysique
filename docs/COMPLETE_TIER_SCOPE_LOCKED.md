# Tier scope (locked)

> **Founder override 2026-05-25:** Volyume ships as **two tiers**
> (Free, Pro), not three. The Complete tier and the 28-day Complete→Pro
> cascade are removed. Pro becomes "the whole app". Peak Week
> support is dropped entirely (per founder: peak week needs a human
> eye, not an algorithm). Trial is a **single 21-day Pro trial**
> giving the user three full weekly check-ins before the decision
> point. Pricing tweaked to balance "build a user base" against
> partial recovery of the lost Complete-tier ARPU.
>
> Implementation notes are below the original section; the original
> 3-tier locked text is preserved for historical context but does
> NOT govern. The new model governs.

Resolves open question #2 from Claude's third-pass adjudication
(`BRIEF_C_CLAUDE_ADJUDICATION.md`). Originally locked 2026-05-23 as
3 tiers + cascade. Re-locked 2026-05-25 as 2 tiers + single trial.

## The 2-tier model (current)

### What separates the tiers

| Feature | Free | Pro |
|---|---|---|
| Adaptive engine, food logging, FFM floor, ED-pattern lockout, rapid-loss safety | Yes | Yes |
| History window | 30 days | Unlimited |
| Protein tier ceiling | Standard (2.2 to 2.6 g/kg BM) | Optimised (2.5 to 3.0); Advanced (2.8 to 3.3) when goal supports |
| Refeed prescription | No | Any cut, with automated timing |
| Block planning beyond current block | No | Yes |
| Photo progress timeline (on-device only) | No | Yes |
| Body composition trend (BF%, FFM) | No | Full charts plus export |
| Coach link (B2B, phase two) | No | Yes |
| Share-pack export for coach handover | CSV only | PDF, CSV, and photos |
| Priority support | No | Yes |

Peak Week is **not** in either tier. Removed 2026-05-25 per founder
direction: peak-week management (contest prep tapering, last-week
sodium/carb manipulation, stage-day timing) needs human-coach
judgement, not engine output. The coach handoff path (phase 2) is
where peak-week support lives — via the linked coach, not the app.

### Safety logic is tier-blind (unchanged)

The FFM floor, ED-pattern detection, rapid-loss flag, adaptive
TDEE accuracy, held decisions, and any future harm-prevention
guardrail fire for every user on every tier, including Free.
Paywalling safety is indefensible and creates UK GDPR Article 9
exposure.

### Goal-based unlocks (independent of tier)

- **Advanced protein tier (2.8 to 3.3 g/kg BM):** requires explicit
  physique competition or recomp goal selection. Available to Pro
  users on that goal.
- **Refeed prescription:** requires `aggressive_cut` flag plus an
  energy score history showing accumulated low-energy weeks.
  Available to Pro users on those flags.

### Trial: single 21-day Pro trial

New signups at general availability enter a 21-day Pro trial:

1. **Days 1 to 21: Pro free.** Full Pro feature set. No payment
   captured at signup, just consent to the trial rules.
2. **Day 21 gate: "Your Pro trial is winding down" prompt.** User
   can pay (founders price if eligible, standard otherwise), skip
   to Free now, or do nothing and auto-downgrade to Free at day 22.
3. **Day 22 onward: Free.** Engine still runs with the safety
   guardrails. Pro-tier surfaces lock. Differential-output paywall
   triggers become active.

Rules:

- A user who pays at any stage stops the trial at Pro.
- A user who skips ahead (Pro to Free before day 21) cannot
  re-enter the trial later. Trial is a one-time entitlement per
  account.
- Trial state is server-side. `trial_state` enum (legacy values
  retained for schema compatibility but unused in the 2-tier model):
  `unstarted`, `pro_trial_active`, `paid_pro`, `free`,
  `cascade_expired`.
- The `tier_history` table records every transition with timestamp,
  reason (`auto_downgrade`, `user_skip`, `user_paid`,
  `user_cancelled`), and source surface.
- Notifications fire at day 19 (Pro winding down) and day 21
  (downgraded to Free). The locked day-12/14/26/28 schedule from
  the 3-tier era is collapsed to day-19/21.

### Pricing windows

| Window | Pro price | Notes |
|---|---|---|
| Open beta (first 4 weeks post-GA) | **£0.99/month** | Unchanged from the locked open-beta Pro price |
| Founders (weeks 5-16) | **£1.99/month** | Up from £1.49 (3-tier Pro) |
| Standard (week 17+) | **£3.99/month** | Up from £2.99 (3-tier Pro), well below the old Complete £6.99 |

Users who upgrade during a window lock that price for the life of
the subscription as long as it remains active without lapse.

Pricing strategy: prioritise building a user base over short-term
ARPU. The 99p entry stays. Modest founders / standard uplift
captures part of the lost Complete-tier ARPU without choking
acquisition.

### Engine code implications

> **Founder decision 2026-05-29:** gating is binary (Pro or Free),
> enforced solely by `store.tier === 'pro'` via the `ProGate`
> component. The granular `hasFeature` / `FEATURE_MAP` /
> `hasGoalUnlock` / `PRO_ROUTES` layer described below was built and
> tested but never wired into a single screen, so it was removed as
> dead code. `proGate.js` now exports only `PRO_BETA_ACTIVE`,
> `_resolveTier`, and `isPaidTier`. If per-feature/per-goal gating is
> ever wanted it returns as a fresh build against the then-current
> scope. The text below is retained for historical context only.

`src/lib/proGate.js` had the three helpers:

- `isPaidTier(user)` returns `'free' | 'pro'`. (Retained.)
- `hasFeature(user, feature)` returns boolean against the per-tier
  feature flag map. (Removed 2026-05-29.)
- `hasGoalUnlock(user, feature)` returns boolean against the user's
  current goal state, independent of tier. (Removed 2026-05-29.)

`weeklyCoach.js` and `nutritionEngine.js` MUST NOT consult `proGate`
when computing safety floors, lockouts, or guardrails. They consult
it only when deciding which output surfaces to populate.

### Closed testing entitlement (unchanged)

Closed testing on the Play Store is an internal testing group, not
an end-user beta cohort. No special tier entitlement applies.
Internal testers run on whichever tier matches their development
account, and the 21-day trial applies normally at general
availability.

---

## Historical context (3-tier, superseded)

The text below is preserved for traceability with prior LOCKED
documents that referenced this file. It does NOT govern the
implementation. The 2-tier model above is the current spec.

## Principle

Safety logic is tier-blind. The FFM floor, ED-pattern detection,
rapid-loss flag, adaptive TDEE accuracy, held decisions, and any future
harm-prevention guardrail fire for every user on every tier, including
Free. Paywalling safety is indefensible and creates UK GDPR Article 9
exposure.

Complete tier differentiates on surfaces, depth, and integrations.
Never on safety logic.

## What separates the tiers

| Feature | Free | Pro | Complete |
| --- | --- | --- | --- |
| Adaptive engine, food logging, FFM floor, ED-pattern lockout, rapid-loss safety | Yes | Yes | Yes |
| History window | 30 days | 90 days | Unlimited |
| Protein tier ceiling | Standard (2.2 to 2.6 g/kg BM) | Optimised (2.5 to 3.0) | Advanced (2.8 to 3.3) unlocked when goal supports it |
| Refeed prescription | No | Aggressive cut and contest prep only | Any cut, with automated timing |
| Peak Week module | No | No | Yes |
| Block planning beyond current block | No | No | Yes |
| Photo progress timeline | No | No | Yes |
| Body composition trend (BF%, FFM) | No | Read-only summary | Full charts plus export |
| Coach link (B2B, phase two) | No | No | Yes |
| Share-pack export for coach handover | CSV only | CSV only | PDF, CSV, and photos |
| Priority support | No | No | Yes |

## Goal-based unlocks (independent of tier)

Some features gate on the user's stated goal, not on their plan. A Pro
user with the right goal flag gets the same access as a Complete user
with the same flag.

- **Advanced protein tier (2.8 to 3.3 g/kg BM):** requires explicit
  physique competition or recomp goal selection. Available to Pro on
  that goal, not Complete-only.
- **Refeed prescription:** requires `aggressive_cut` flag plus an
  energy score history showing accumulated low-energy weeks. Available
  to Pro with that flag, not Complete-only.

## Trial cascade (locked)

New signups at general availability enter a 28-day cascade:

1. **Days 1 to 14: Complete free.** Full ceiling. No payment captured
   at signup, just consent to the cascade rules.
2. **Day 14 gate: "Hold on Complete" prompt.** User can pay (founders
   price if eligible, standard otherwise), skip to Pro now, skip to
   Free now, or do nothing and auto-downgrade to Pro at day 15.
3. **Days 15 to 28: Pro free.** Engine, food logging, the lot at the
   Pro feature set. Complete-only surfaces (Peak Week, photo timeline,
   coach link, unlimited history, body composition charts) lock at
   day 15.
4. **Day 28 gate: "Hold on Pro" prompt.** User can pay for Pro, pay
   for Complete (re-upgrade), skip to Free, or do nothing and
   auto-downgrade to Free at day 29.
5. **Day 29 onward: Free.** Engine still runs with the safety
   guardrails. Pro-tier surfaces lock. Differential-output paywall
   triggers (move four) become active.

Rules:

- A user who pays at any stage stops the cascade at that tier.
- A user who skips ahead (Complete to Free at day 14, for example)
  cannot re-enter the trial later. Cascade is a one-time entitlement
  per account.
- Trial state is server-side. `trial_state` enum:
  `complete_trial_active`, `pro_trial_active`, `paid_complete`,
  `paid_pro`, `free`, `cascade_expired`.
- The `tier_history` table records every transition with timestamp,
  reason (`auto_downgrade`, `user_skip`, `user_paid`,
  `user_cancelled`), and source surface.
- Notifications fire at day 12 (Complete winding down), day 14
  (downgraded to Pro), day 26 (Pro winding down), day 28 (downgraded
  to Free). Notifications respect user notification settings.

## Open beta pricing window

Between internal closed testing and full general availability,
Volyume runs an **open beta** phase. Open beta is the first
public-facing release with the food layer included and the three-tier
cascade live. Pricing during open beta:

- **Open beta upgrade prices sit below founders pricing:** Pro
  £0.99/month, Complete £1.99/month. Duration of open beta is locked
  at four weeks from GA-1.
- **Users who upgrade during open beta lock those prices for the
  life of the subscription** as long as the subscription remains
  active without lapse.
- At the end of the open beta window, prices step up to founders
  pricing (Pro £1.49, Complete £3.49) for the next 12 weeks.
- After the founders window, prices step up to standard (Pro £2.99,
  Complete £6.99).
- The 28-day trial cascade runs identically across all three pricing
  windows. The difference is the price the user sees at the hold and
  upgrade gates.

This lets the open beta period deliver real price-elasticity data and
a thank-you to early adopters without compromising the long-term
revenue model.

## Closed testing entitlement

Closed testing on the Play Store is an internal testing group, not an
end-user beta cohort. No special tier entitlement applies. Internal
testers run on whichever tier matches their development account, and
the 28-day cascade applies normally at general availability.

## Engine code implications

`src/lib/proGate.js` gains three helpers. None of them gate safety
functions:

- `isPaidTier(user)` returns `'free' | 'pro' | 'complete'`.
- `hasFeature(user, feature)` returns boolean against a per-tier
  feature flag map.
- `hasGoalUnlock(user, feature)` returns boolean against the user's
  current goal state, independent of tier.

`weeklyCoach.js` and `nutritionEngine.js` MUST NOT consult `proGate`
when computing safety floors, lockouts, or guardrails. They consult it
only when deciding which output surfaces to populate (deeper insight
blocks, differential output, refeed prescription text).

## Pricing justification (founder-facing only, not surface copy)

- Pro: "the engine, free of guesswork."
- Complete: "the engine, with a year of memory, deeper periodisation,
  and your coach in the loop."

Founder pricing: Pro £1.49, Complete £3.49. Standard pricing post-launch:
Pro £2.99, Complete £6.99.

## Open follow-ups

- Confirm the share-pack PDF format (single page, multi-page, branded
  template) before move five ships.
- Decide whether the Complete coach link uses Volyume B2B accounts or
  a one-time share URL with expiry. Phase two work.
- Decide whether photo progress timeline is on-device only or syncs to
  Supabase Storage. Privacy review required either way.
