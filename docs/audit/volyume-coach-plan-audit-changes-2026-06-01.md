Status: IN PROGRESS (stages 1-2 of 5 shipped) | Timestamp: 2026-06-01

# Coach plan audit: implementation change log

Implements the approved Phase 7 proposals. Staged, each stage tested and
re-simulated before commit, per the brief. Science-first throughout: the
individual recovery envelope governs, division emphasis only redistributes
within it.

## Stage 1 (shipped, commit 44721cd): science-first foundation + Women's Bodybuilding

- `applyGoalOverlay` now places priority muscles inside their individualised
  working (MAV-MRV) band scaled by priority strength, instead of multiplying up
  from the MEV floor. The per-muscle MRV stays the hard ceiling.
- Systemic cap individualised: 0.40 x sum of the user's individualised MRVs,
  replacing the flat 130. Beginner/poor-recovery lower, advanced higher; an
  average intermediate stays near 130 (no regression).
- `VOLUME_LANDMARKS` glute ceiling raised (mrv 16 -> 22); adductors given a
  working level.
- `adductors` added to Bikini/Wellness/Figure/Women's Physique overlays
  (Wellness 1.40).
- Women's Bodybuilding added as a Coach goal (taxonomy, overlay, labels,
  goal-lock).
- Result (simulation): upper-body divisions deliver strong distinct emphasis;
  cap scales with the individual. Test: `coachDivisions.test.js`.

## Stage 2 (shipped, commit 9770b5b): division-aware lower-focus split

- New `lower_focus` split (3 lower / 2 upper at 5 days, 3/3 at 6, interleaved
  L/U/L/U/L); Bikini and Wellness route to it at 5-6 days, full body at 3,
  upper/lower at 4.
- Result (simulation): Bikini and Wellness deliver ~20 glute sets (was 4) and
  are now distinct (Wellness carries more quad volume). Tests added.

## Remaining stages (not yet implemented)

Each to be implemented, tested and re-simulated per division before commit,
exactly as stages 1-2 were.

- Stage 2b, broader leg-day balancing. Classic, Open, Figure, Women's Physique
  and Women's Bodybuilding still get one leg day on the 5-day PPL, so their
  legs (quads ~6 delivered vs 12-18 in spec) under-deliver. Give the
  leg-judged divisions two leg exposures at 5-6 days while keeping Men's
  Physique upper-weighted.
- Stage 3, division-aware exercise priority. Re-rank `selectExercisesForMuscle`
  by division: lateral-raise and upper-chest-incline bias for Men's Physique /
  Figure; hip-thrust, abduction and lengthened-position hamstring work for
  Bikini / Wellness; standing + seated calf priority for Classic. Also lets the
  adductor target actually land (the builders include adductors but the pool
  selection needs to place them).
- Stage 4, additive weak-point overlay. Replace the destructive weak-point
  branch: keep the division emphasis, add a capped specialisation bonus to the
  weak-point muscles, and offset by trimming non-priority muscles toward MV,
  all inside the individual MRV and systemic cap. (Proposals section 4.)
- Stage 5, peak-week MRV guard. Clamp the mesocycle PEAK week (week-1 x peak
  multiplier) to the individual per-muscle MRV and systemic ceiling, not just
  week 1, so the hardest week cannot overtrain. Touches `generateMesocycleWeeks`
  (`database.js`). The current simulation shows peak totals (and a 20-set glute
  week-1 x1.25) can exceed MRV without this.

## Library

Not yet volume-audited against the Phase 7 ranges. The eight division library
plans should be checked set-by-set once the generator stages are complete, and
any that fall outside the ranges corrected.
