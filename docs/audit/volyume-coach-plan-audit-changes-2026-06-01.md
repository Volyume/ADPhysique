Status: COMPLETE (generator: stages 1, 2, 2b, 3, 4 shipped; stage 5 verified not needed) | Timestamp: 2026-06-01
Remaining: volume-audit the 8 division library plans against the Phase 7 ranges.

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

## Stage 2b (shipped, commit 9793dd8): balanced two-leg-day split

- Generalised the lower-focus builder to `buildWeightedUpperLower(lowerDays)`,
  added a `balanced_ul` split (half the days lower) and routed Classic, Open,
  Figure, Women's Physique and Women's Bodybuilding to it at 5 days so their
  fully judged legs get two sessions. General and Men's Physique keep PPL.
  Added traps to the weighted upper list.
- Result: Classic calves 4 -> 10 and quads 6 -> 11; Figure glutes 2 -> 12;
  bodybuilding calves 12.

## Stage 4 (shipped, commit ffa3451): additive weak-point specialisation

- `applyGoalOverlay` now always runs the division overlay first (keeps the
  division character), then ADDS a capped bonus to each weak-point muscle
  (closes ~40% of the gap to MRV) and offsets the added volume by trimming the
  lowest-priority, non-weak-point muscles toward MV. The MRV clamp and systemic
  cap remain the ceiling.
- Result: Men's Physique + weak-point glutes keeps shoulders dominant and the MP
  targets intact while glutes go 3 -> 19 (offset from abs/traps), replacing the
  old wipe-everything-to-maintenance. Note: a weak-point block still routes to
  the upper_lower_wp split, which reduces (not wipes) upper-dominant divisions'
  priority delivery during the block; refining that split is a possible
  follow-up.

## Stage 3 (shipped, commit c2ac80d): division-aware exercise priority

- Added a division subregion bias to `selectExercisesForMuscle` scoring (a
  half-tier nudge, not a hard filter): Men's Physique/Figure favour incline
  (upper chest) and vertical pulls (lat width); Classic/Women's Physique favour
  lat width; Bikini/Wellness favour the glute-max (hip-thrust) pattern.
- Result: Men's Physique leads chest with incline pressing and back with
  wide-grip/pull-up width work, where general leads with flat bench. Falls back
  cleanly for thin-library / machine-only users.

## Stage 5 (verified NOT needed): peak-week MRV guard

Investigation found the `MESO_SCHEDULE` setsMultiplier (x1.00 -> x1.25) is used
only for the week LABEL (`WorkoutSummaryScreen`), not applied to working sets:
`generateMesocycleWeeks` stores only RIR ladder and deload flags, and weekly
progression is RIR/load + feedback autoregulation. So there is no automatic set
inflation to guard. The recovery envelope is already enforced by the base-plan
MRV clamp, the new individualised systemic cap (stage 1), and the adaptive
engine, which is MRV-aware (`algorithms.js:520` flags workingSets > mrv and
recommends backing off). The earlier audit docs' "peak = week-1 x1.25 delivered"
was a mis-read; the simulated week-1 numbers are the working volume. No code
change required.

## Library

Not yet volume-audited against the Phase 7 ranges. The eight division library
plans should be checked set-by-set once the generator stages are complete, and
any that fall outside the ranges corrected.
