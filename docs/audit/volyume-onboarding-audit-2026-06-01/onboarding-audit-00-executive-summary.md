Status: REFRESHED + PROPOSAL CONFIRMED (post-rebuild) | Original 2026-06-01 (commit e7c3f01) | Refreshed 2026-06-01 (engine at 6cf8642)

REFRESH NOTE. The original audit was written before the planEngine rebuild. The
onboarding/builder FLOW code is unchanged since, so the flow, copy and design
findings stand. What changed: the planEngine was fully rebuilt and the
division-specific system the reinstated weak-point screen connects to is now
complete and verified (division matrix, division pools, division-aware MRV, and
weak-point that composes with the division split). Line references throughout
the phase docs are updated to the current engine. Founder has CONFIRMED the
proposal as-is; this set is refreshed for accuracy, then build follows on a
separate go-ahead.

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
  the weak-point phase. This sits inside the existing per-muscle MRV clamp
  (`planEngine.js:205`) and the recovery-scaled systemic cap (`:226-232`), plus
  the rebuild's delivered-volume clamp, so it redistributes volume within the
  individual's recovery envelope and cannot cause overtraining. Science first,
  exactly as asked.
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

## Status (current)

Implementation has only partially begun, and is now PAUSED awaiting direction.

DONE and committed:
- Weak-point selection reinstated in onboarding (the brief's critical omission).
  Division-scoped selector in ProOnboarding step 3 reading WEAK_POINT_SETS
  (per-division options), wired so the selection reaches plan generation
  (the hard-coded `planWeakPoints: []` is removed). Commit 4928a04. The engine
  applies it through the existing (rebuilt) weak-point path.

NOT done (awaiting explicit go-ahead, do not implement without it):
- The broader onboarding alignment the brief asks for: the comprehensive
  copy pass (accuracy to the current system, removing redundant communications,
  rewriting instructions) and the format/style standardisation (onboarding's
  dropdowns to the rest of the app's card/chip language, division made
  prominent, recovery grouped with training, days/protein parity). This is the
  bulk of the work and is specified screen-by-screen in doc 06 and doc 03. It
  has NOT been built. A full screen-by-screen before/after must be presented
  and approved before any of it is implemented.
- Always-on weak-point bias (doc 06 engine item): NOT implemented and out of
  scope for the onboarding alignment. The engine was deliberately left
  untouched. A selected weak point therefore applies on the weak-point training
  phase (where the engine biases) and not on other phases. Greenlight
  separately if wanted.

Engine: unchanged by this onboarding work.
