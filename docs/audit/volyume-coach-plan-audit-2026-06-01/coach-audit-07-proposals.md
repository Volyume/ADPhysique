Status: COMPLETE (proposal, awaiting sign-off) | Timestamp: 2026-06-01 | Phase 7: Proposals

# Proposals: division-correct Coach and plan library

This is the specification for review. Nothing here is implemented. The brief
requires a STOP at the end of this phase. Per-division set numbers are
building-level weekly targets the engine must DELIVER (not just target), and
are grounded in the 10-20 set science band (Schoenfeld 2017; Pelland 2025)
scaled by each division's judged priorities. Where the division research did
not publish exact per-muscle numbers, the figure is a reasoned default and is
marked [default].

## 0. Science-first foundation (governs everything below)

Order of authority, highest first. Each layer may only DISTRIBUTE volume inside
the envelope set by the layer above it; it can never raise the ceiling.

1. The individual's recovery envelope (science, inviolable). Per-muscle volume
   is bounded by that individual's MRV, computed from the evidence-based
   landmarks (Israetel MEV/MAV/MRV; Schoenfeld 2017 and Pelland 2025 dose
   response) individualised by training age/experience, self-reported recovery,
   age, and nutrition phase (`computeLandmarks` already does this). No division
   priority, coach preference or weak-point selection may push any muscle above
   its individual MRV, or the whole plan above the individual's systemic
   recovery ceiling. This prevents overtraining by construction.
2. The evidence-based working range. Default every trained muscle into the
   10-20 hard-sets-per-week band at 2+ sessions, near failure (1-3 RIR), with a
   lengthened-position bias (Schoenfeld Grgic Krieger 2019; Robinson 2024;
   Schoenfeld 2024-2025). This is the "maximum gains" target band before any
   division flavour.
3. Division and coach emphasis (this document). Operates ONLY as a
   redistribution of the recoverable budget: shift sets toward the division's
   judged-priority muscles and away from its de-emphasised muscles, holding the
   individual total inside layer 1. Coach methods (FST-7, Y3T, etc.) inform
   exercise selection and rep/rest texture, not the recovery ceiling.
4. Individual feedback over time. Treat MRV as a practitioner estimate, not a
   measured constant (per the exercise-science doc): start mid-range and adjust
   to the user's logged recovery, soreness and performance, never the reverse.

If coach practice and the science conflict, the science wins (default to the
meta-analytic consensus; do not present any MRV as a measured fact).

Two science-first changes this exposes, added below: individualise the systemic
set cap (it is currently a flat 130 for everyone, which contradicts fitting the
maximum to the individual), and guard the mesocycle PEAK week against MRV (not
just week 1).

## 1. Design principles

1. Science first: the individual recovery envelope (section 0) is the hard
   constraint; everything else distributes volume within it.
2. Division character must reach the plate, verified by re-simulation, but only
   inside that envelope.
3. Specialisation is additive with explicit offsets, never a silent wipe of the
   division emphasis, and still bounded by per-muscle MRV and the individual
   systemic ceiling.
4. Natural-athlete calibration: published elite (often enhanced) volumes are
   the ceiling, not the default; the individualised landmarks and cap govern.
5. Minimal, additive code changes to runtime-critical generation, with tests
   and re-simulation per division (engineering rules 5 and 7).

## 2. Architecture changes (fix the cross-cutting Critical/High gaps)

These are ordered: 2.0a/2.0b are the science-first recovery guards and must
hold before any division emphasis (2.1-2.4) is allowed to distribute volume.

### 2.0a Individualise the systemic set cap (science-first; replaces flat 130)
The systemic total cap in `applyGoalOverlay` (`planEngine.js:167-174`) is a
fixed 130 sets for everyone. Replace it with a per-individual ceiling derived
from the same multipliers that drive `computeLandmarks`: a base weekly systemic
budget scaled by experience (beginner well below intermediate), recovery
rating, age and nutrition phase. So a beginner or a poor-recovery user is held
to a genuinely lower total, and an advanced good-recovery competitor a higher
one. This is the whole-body analogue of per-muscle MRV and is the primary
overtraining guard. The exact base and multipliers to be confirmed in 6.

### 2.0b Guard the mesocycle peak against MRV, not just week 1
The MRV clamp is applied to week-1 targets, but the block builds to x1.25
(`mesocycle.js`). Ensure the PEAK-week per-muscle volume (week-1 x peak
multiplier) is also clamped to the individual MRV, and the peak-week total to
the individual systemic ceiling, so the hardest week of the block still cannot
overtrain. Verify in the proposed-plan simulation.

### 2.1 Anchor the emphasis at a working level, not the floor (fixes X1, X2, X7)
Change `applyGoalOverlay` (`planEngine.js:140-159`) so a PRIORITY muscle
(multiplier >= 1.15) is anchored at its MAV before the multiplier, while
neutral/de-emphasised muscles stay anchored at MEV. Effect (Bikini glutes,
MAV 10): 10 x 1.55 = 15.5 -> 15, inside the elite 16-30 band at building level
and far above today's 4. De-emphasised muscles (MP quads x0.70 on MEV) are
unchanged. Keep the 110% MRV clamp and the systemic cap.

### 2.2 Raise the physique-relevant landmarks (supports 2.1)
In `VOLUME_LANDMARKS` (`algorithms.js:13`), raise:
- glutes MAV 10 -> 14, MRV 16 -> 22 (physique divisions work here).
- adductors give a real working level (MAV 8 -> 10) and bias it per division.
- hamstrings MAV 12 -> 14 (lengthened-bias divisions).
Leave others. These are additive and only bind when a division or weak point
actually drives volume there.

### 2.3 Division-aware split selection (fixes X5)
Extend `selectSplit` to take the division. For lower-body-dominant divisions
(bikini, wellness) at 4-6 days, use a lower-weighted structure (e.g. 5 days =
Lower / Upper / Lower / Glute-Ham / Upper instead of balanced PPL) so glute/ham
volume has the sessions and time to land. Upper-dominant divisions (mens_
physique, figure) keep an upper-weighted PPL. General/bodybuilding/classic keep
the current balanced splits.

### 2.4 Division-aware exercise priority (fixes X6)
Add a per-division priority hint consumed by `selectExercisesForMuscle` so the
pool favours the division's signature movements:
- Men's Physique / Figure: lateral-raise variants for side delts; wide-grip
  vertical pulls for lat width; incline for upper chest.
- Bikini / Wellness: hip thrust and abduction for glutes; lengthened-position
  leg curls and RDLs for hamstrings; Wellness adds full-depth squat/press and
  adductor work.
- Classic: standing calf + seated (soleus) priority; balanced compound legs.
This is a re-ranking within the existing pool, not new exercises.

### 2.5 Make weak-point specialisation additive (fixes X4)
Replace the `phase==='weak_point'` branch (`planEngine.js:132-139`) so it:
1. Starts from the division overlay (keep division character).
2. Adds a capped specialisation bonus to each weak-point muscle: +30-40% of the
   gap between its current target and MRV, capped so the muscle stays <= MRV.
3. Applies offsetting reductions ONLY to non-priority, non-weak-point muscles
   (drop them toward MV), not a blanket wipe, so total stress holds.
4. Keeps the dedicated weak-point day, and respects the systemic cap.
See section 4 for the exact overlay numbers.

## 3. Per-division specification (building-level weekly delivered sets)

Tiers: maintenance ~= MV/MEV; building = the figure shown; maximum = building
x1.25 (the mesocycle peak). Frequency is sessions/muscle/week.

### Men's Physique
Priority: side delts > lats/back width > upper chest > rear delts > arms;
legs and waist de-emphasised; traps restrained.
- side delts 18-22 (freq 3), rear delts 10-14 (2-3), back 16-20 (2-3, width
  bias), chest 12-16 with upper-chest lead (2), triceps 10-14, biceps 8-12,
  quads 6-9 (1-2), hams 6 (1), glutes 4-6 (1), calves 6-9 (2), abs 0-4, traps
  4-6. Split: upper-weighted PPL. Reps/load: as current (hypertrophy ranges,
  delts toward higher reps). [Mostly default, anchored to Rambod/Jansen
  upper-body priority and the V-taper standard.]

### Classic Physique
Priority: balanced upper + proportionate legs; calves a named priority; waist
control; restrained traps.
- back 16-20, side delts 14-18, chest 12-16, quads 12-16 (2), hams 10-14 (2),
  calves 12-16 (3, a true priority), glutes 8-12, arms 10-14, rear delts 10-14,
  abs 4-8 (control, not thickening), traps 6-8. Split: balanced PPL or
  upper/lower. Note: add an optional bodyweight-cap awareness later (out of
  volume scope).

### Open Bodybuilding (`bodybuilding`)
Priority: complete development; bring up common weak points (rear delts, hams,
calves).
- chest 14-18, back 16-20, side delts 16-20, rear delts 12-16, quads 14-18,
  hams 12-16, glutes 8-12, calves 14-18, arms 12-16, abs 6-10, traps 8-12.
  Natural calibration: these are the advanced/enhanced ceiling; the experience
  multiplier and 130 cap scale them down for everyone else. Keep the cap.

### Women's Bikini
Priority: glutes >> hamstrings > round (capped) delts > back; quads and waist
deliberately restrained.
- glutes 16-22 (freq 3-4), hamstrings 12-16 (2-3, lengthened bias), side delts
  10-14 (round not wide), back 10-14, quads 6-10 (held back), chest 4-6,
  arms 4-8, calves 6-10, abs 0-4 (no weighted oblique work), traps 2-4.
  Split: lower-weighted. (de Silveira 2025; Contreras glute frequency.)

### Women's Wellness
Priority: glutes >> quads ~ hamstrings > adductors; upper body maintained,
never wide.
- glutes 18-24 (freq 3-5), quads 14-18 (2-3, full depth), hamstrings 14-18
  (2-3), adductors 6-10 (2), side delts 8-12 (capped), back 8-12, chest 4-6,
  arms 4-8, calves 8-12, abs 2-4, traps 2-4. Split: lower-dominant (this is the
  most lower-body division). Must clearly out-deliver Bikini on quads and
  adductors. (Pannain/Mattos leg+glute 5x/week.)

### Women's Figure
Priority: capped delt width + back (V-taper) > glutes ~ legs; conditioning.
- side delts 16-20 (width), back 16-20, rear delts 12-16, glutes 12-16,
  hamstrings 10-14, quads 10-14, chest 6-10, arms 8-12, calves 8-12, abs 4-8,
  traps 4-6. Split: upper-weighted with real lower-body work.

### Women's Physique
Priority: complete feminine development; back and shoulders lead; legs fully
judged.
- back 16-20, side delts 14-18, rear delts 12-16, quads 12-16, hams 12-16,
  glutes 12-16, chest 10-14, arms 12-16, calves 10-14, abs 4-8, traps 6-10.
  Split: balanced. (Coelho 2x/2x/1x frequency reference.)

### Women's Bodybuilding (proposed new Coach goal)
Optional: add a `womens_bodybuilding` goal (the library already has the plan).
Spec mirrors Open with feminine-line judging: complete high volume, back and
shoulder detail, full legs, conditioning. Decision required (section 6).

## 4. Weak-point specialisation overlay (additive, recovery-capped)

For each selected weak-point muscle, starting from its division target T and
its MRV:
- Tier A (large: back, quads, hams, glutes, chest): +4-6 sets, frequency +1,
  capped at MRV.
- Tier B (delts split, calves, abs, biceps, triceps, adductors): +3-4 sets,
  frequency +1, capped at MRV.
Offsets (to hold total stress): reduce each non-priority, non-weak-point muscle
toward MV until the plan total is within the systemic cap; never reduce the
division's own priority muscles below their building target.
Ceiling: at most 2-3 weak points at once (already capped at 3); if the offsets
cannot bring the total under the cap, reduce the weak-point bonus, do not exceed
the cap. Block length: 4-6 weeks then reassess (one mesocycle), with the
existing deload. (Israetel specialisation model; Schoenfeld frequency.)

Worked example (Men's Physique, weak point = glutes): keep MP upper-body
emphasis (side delts ~20, back ~18); glutes go from the MP maintenance 4-6 to
~12-14 (+~8, capped at the new glute MRV 22); offset by trimming abs/traps and
shaving 1-2 sets from non-priority arms. Division character retained, glutes
brought up, total within cap.

## 5. Plan library actions

- Volume-audit each of the 8 division library plans against the section 3
  ranges (Phase 6 proposed-plan simulation) and correct any that fall outside.
- The library is the safer near-term path to elite division plans; prioritise
  confirming Bikini/Wellness/Figure library plans hit the glute/leg ranges,
  since the generator under-delivers there until 2.1-2.4 ship.
- Keep Men's Bodybuilding and Women's Bodybuilding library plans. Add no 212
  plan (out of scope).

## 6. Decisions required before implementation

0. Approve the science-first guards FIRST: individualised systemic cap (2.0a)
   and peak-week MRV guard (2.0b). These set the recovery envelope that
   everything else must stay inside. The section 3 per-division ranges are all
   subject to this envelope: where an individual's recovery ceiling is lower
   than a building range, the engine delivers the ceiling, not the range.
1. Approve the anchor change (2.1) and landmark raises (2.2). This is the core
   fix and touches runtime-critical generation.
2. Approve division-aware split (2.3) and exercise priority (2.4), or defer
   them and rely on volume + library only for this pass.
3. Approve the additive weak-point model (2.5 / section 4).
4. Women's Bodybuilding: add as a Coach goal, or leave to the library only?
5. Confirm the section 3 per-division building ranges, or adjust any you want
   different. These drive the implementation exactly.

## 7. Implementation and verification plan (Phase 8, only after sign-off)

Per approved division, in order: update overlay/landmarks/split/exercise
priority -> add or update tests -> re-run the Phase 6 simulation for that
division -> confirm delivered building-level volume matches section 3 before
moving on. Change log saved to
`docs/audit/volyume-coach-plan-audit-changes-2026-06-01.md`.

STOP. Awaiting explicit confirmation of the section 6 decisions before any
implementation.
