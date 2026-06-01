Status: COMPLETE | Timestamp: 2026-06-01 | Phase 0: Executive summary (written last)

# Onboarding and plan-builder audit, executive summary

A complete audit of the two flows that build a training plan: first-time
onboarding (`ProOnboardingScreen.js`) and the Plans tab builder for returning
users (`ProGoalSetupScreen.js`). Grounded in the code on `main`. Full detail in
the seven phase documents alongside this one.

## The one finding that reframes the brief

The brief treats weak-point selection as absent from both flows and asks us to
confirm it absent from the builder. The code disagrees:

- Onboarding: weak-point selection is genuinely absent (`planWeakPoints: []`
  hard-coded, `ProOnboardingScreen.js:519`).
- Builder: weak-point selection is present and ships today (a 16-muscle grid,
  `ProGoalSetupScreen.js:345-372`).

So onboarding is the thinner flow, not the builder. The real weak-point
problems are different and arguably more serious than a missing screen:

1. The selector is a flat generic list, identical for every division
   (`WEAK_POINT_MUSCLES`, `coachingGoals.js:126-132`). The brief's requirement
   that Men's Physique shows MP options and Bikini shows Bikini options is met
   in neither flow.
2. Selected weak points are silently ignored unless the training phase is
   "Bring up a weak point" (`planEngine.js:173`). On any other phase the copy
   promises a volume bias that never happens.

## Parity gaps (the corrected picture)

Onboarding is missing three things the builder already has: training days per
week (onboarding hard-codes 4), weak-point selection, and protein approach. The
matching questions use two different control languages across the flows
(dropdowns in onboarding, cards and chips in the builder), so the two do not
feel like one product. Full table in Phase 1.

## What we propose (approved direction: full audit, always-on bias)

- One shared option layer and one shared selector component, used by both
  flows, so parity is guaranteed by construction rather than by hand.
- Division-specific weak-point option sets (`WEAK_POINT_SETS` in
  `coachingGoals.js`), derived from the existing division overlays.
- Always-on division bias in the engine: a selected weak point biases the plan
  on every phase (a small additive emphasis), with the larger effect kept for
  the weak-point phase. This sits inside the existing per-muscle MRV clamp and
  the recovery-scaled systemic cap (`planEngine.js:199-218`), so it
  redistributes volume within the individual's recovery envelope and cannot
  cause overtraining. Science first, exactly as asked.
- Close the onboarding gaps: training days, protein approach, and the
  reinstated weak-point selector.
- Standardise the shared controls on one visual language and surface each
  division's judging note at selection time.
- Experience gating from the research: for beginners, default to "Not sure" and
  frame balanced training as the right call; specialisation is an
  intermediate-plus tool.

End state: zero option gaps between the flows, a weak-point system that is
division-aware and honest about its effect, and an onboarding that matches the
builder's depth while staying appropriately first-timer in pacing.

## Priority order

1. Critical: weak points in onboarding, always-on bias in the engine (with
   tests), division-specific sets, honest weak-point copy.
2. High: the shared selector, onboarding's days and protein, control
   standardisation, division judging notes.
3. Polish: summary-screen weak-point reflection, a one-line Diary note,
   grouping, time estimates, icon treatment.

Full scoring in Phase 7.

## Documents

- 00 this summary
- 01 flow map and parity table
- 02 copy and tone
- 03 design and presentation
- 04 integration accuracy (the two weak-point defects, in detail)
- 05 research (live web, 2026)
- 06 full proposal for both flows
- 07 prioritised build recommendations

## Status

Audit and proposal pass only. No app code has been changed. Awaiting approval
before any implementation, per the brief and per the engineering rules.
