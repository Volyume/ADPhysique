# Complete tier scope (locked)

Resolves open question #2 from Claude's third-pass adjudication
(`BRIEF_C_CLAUDE_ADJUDICATION.md`). Locked 2026-05-23.

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

## Closed beta entitlement (locked)

Closed beta users receive **Complete free for the full duration of the
closed test period** (currently scoped to 12 weeks against the existing
Play Store closed testing track) as a contributor benefit. At the
transition to general availability, beta accounts drop into the
standard 28-day cascade starting from day 1, not into Free directly.
This means a beta user who tested for 12 weeks gets:

- 12 weeks at Complete during beta
- 14 days at Complete post-GA
- 14 days at Pro post-GA
- Then Free or paid, by their choice

The cascade rule (`one-time entitlement per account`) treats the
post-GA cascade as the user's first cascade. The beta period is not
counted against trial entitlement.

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
