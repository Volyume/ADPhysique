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
