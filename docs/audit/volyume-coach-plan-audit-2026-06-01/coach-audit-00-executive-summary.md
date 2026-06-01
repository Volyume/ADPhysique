Status: COMPLETE (Phases 1-7; STOP before Phase 8) | Timestamp: 2026-06-01

# Executive summary: Volyume Coach and plan-library audit

## Scope and method
Audited both plan surfaces: the generative Coach (`planEngine.js` and its data
in `coachingGoals.js` / `algorithms.js` / `mesocycle.js`) and the seeded plan
library (`seedRoutines.js`, 31 plans). Eleven research agents ran in parallel
(nine divisions, exercise science, weak-point specialisation), each citing
named coaches and named studies, tagging inferred numbers `[synthesis]`. The
codebase was mapped directly, and a live stress simulation generated plans for
every division and read the engine's own weekly volume output.

Two honest limitations: most primary journal hosts (PMC, Frontiers, Springer,
RP) blocked direct fetch, so the science is sourced to author/year/direction
with deeper per-study numbers and several per-division set counts marked
`[synthesis]`, not verbatim. And Men's 212 is out of scope per founder
direction (it is Open at a weight cap); its research file is reference only.

## The governing principle (per founder direction): science first
The individual's evidence-based recovery envelope is the hard constraint.
Division and coach preferences only redistribute volume inside it; they never
raise the ceiling. The order is: (1) individual MRV and a systemic recovery
ceiling, individualised by training age, recovery, age, nutrition; (2) the
10-20 set, 2x-frequency, near-failure, lengthened-bias evidence band for
maximum gains; (3) division/coach emphasis as redistribution; (4) adjust to the
user's logged response over time. Where coach practice and science conflict,
science wins.

## What is already right
- The volume base is the Renaissance Periodization MEV/MAV/MRV model, already
  individualised by experience, recovery, age and nutrition phase, with an MRV
  clamp and RIR autoregulation. The science skeleton exists.
- Men's Physique reads correctly: the upper-body bias (shoulders, back width)
  reaches the plate, legs and waist are de-emphasised.
- The library encodes real division character in hand-written plans.

## The critical findings (from the live simulation)
1. Division emphasis is applied to MEV (the floor), then eroded by the split
   and the time-trim, so for lower-body divisions it does not reach the plate.
2. Bikini and Wellness generate an IDENTICAL plan despite very different
   overlays. The two lower-body divisions are indistinguishable in practice.
3. Glutes never exceed 4 week-1 sets (5 at peak) in any primary plan, including
   the two divisions judged primarily on glutes. Elite Bikini/Wellness glutes
   run 16-30+ sets. The signature muscle is delivered at roughly a quarter of
   the floor of the elite range.
4. Weak-point specialisation is destructive: it discards the division emphasis
   and drops every non-target muscle to maintenance, instead of layering
   additively with offsets.
5. The split and exercise selection are division-blind; division-specificity is
   volume-distribution-only.
6. The systemic set cap is a flat 130 for everyone, which contradicts fitting
   the maximum to the individual.

No generated plan is unsafe or unmanageable (sessions 28-78 min, total volume
capped). The failure mode is under-delivery of the priority muscles, not
overload.

## What is proposed (full detail in coach-audit-07-proposals.md)
- Science-first guards first: individualise the systemic cap; clamp the peak
  week (not just week 1) to MRV.
- Anchor priority muscles at their working level (MAV) before the division
  multiplier, and raise the glute/adductor/hamstring landmarks, so emphasis
  reaches the plate within the recovery envelope.
- Make split selection and exercise priority division-aware (lower-weighted
  structure and hip-thrust/lengthened-ham priority for Bikini/Wellness;
  upper-weighted with lateral-raise/upper-chest priority for Men's Physique/
  Figure).
- Rebuild weak-point specialisation as an additive, recovery-capped overlay on
  top of the division emphasis, with explicit offsets.
- Per-division building-level set targets, frequencies and key exercises for all
  seven Coach divisions, plus a decision on adding Women's Bodybuilding.
- Volume-audit the eight division library plans against the same ranges.

## Decisions needed before any implementation (Phase 8)
Listed in coach-audit-07-proposals.md section 6. In short: approve the
science-first recovery guards, the anchor/landmark fix, the division-aware
split and exercise priority, the additive weak-point model, the per-division
ranges, and whether Women's Bodybuilding becomes a Coach goal.

## Document index
- coach-audit-01-codebase-audit.md
- coach-audit-02-division-research-[mens-physique | classic-physique |
  open-bodybuilding | mens-212 (reference only) | womens-bikini | womens-figure
  | womens-wellness | womens-physique | womens-bodybuilding].md
- coach-audit-03-exercise-science.md
- coach-audit-04-weak-point-specialisation.md
- coach-audit-05-gap-analysis.md
- coach-audit-06-stress-testing.md
- coach-audit-07-proposals.md

Nothing has been implemented. Awaiting sign-off on the section 6 decisions.
