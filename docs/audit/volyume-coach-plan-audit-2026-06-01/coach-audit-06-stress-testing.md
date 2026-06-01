Status: COMPLETE (current-system simulation) | Timestamp: 2026-06-01 | Phase 6: Stress testing

# Stress testing and simulation: current system

Method: a temporary Jest harness imported `generatePlan` from `planEngine.js`
and generated plans across divisions and configs, reading the engine's own
`weeklyVolumeSummary` (per-category WEEK-1 placed sets; delts are merged into
"shoulders"). Peak sets = week-1 x 1.25 (the `MESO_SCHEDULE` build multiplier,
`mesocycle.js:14`). No `exerciseLibrary` was passed, so the built-in `POOL` was
used. The harness was removed after the run; the figures below are the output.

These are DELIVERED sets (what lands in the plan after split structure and the
time-trim), not the internal targets. That distinction is the headline finding:
the overlay sets a target, but the structure decides what actually lands.

## Primary scenario: intermediate, 5 days, full gym, 75 min

Format: chest / back / shoulders / biceps / triceps / quads / hamstrings /
glutes / calves / abs / traps. wk1 = total week-1 sets; peak = x1.25.

| Division | ch | bk | sh | bi | tr | qu | ham | glu | cal | abs | tr | wk1 | peak |
|---|--|--|--|--|--|--|--|--|--|--|--|--|--|
| general | 6 | 8 | 12 | 6 | 6 | 7 | 4 | 2 | 4 | 2 | 4 | 61 | 76 |
| mens_physique | 8 | 14 | 18 | 6 | 8 | 6 | 4 | 3 | 3 | 2 | 4 | 76 | 95 |
| classic_physique | 8 | 12 | 12 | 6 | 8 | 7 | 4 | 2 | 4 | 2 | 4 | 69 | 86 |
| bodybuilding | 8 | 12 | 12 | 6 | 8 | 7 | 4 | 2 | 4 | 2 | 6 | 71 | 89 |
| bikini | 6 | 12 | 12 | 6 | 6 | 6 | 4 | 4 | 2 | 2 | 4 | 64 | 80 |
| wellness | 6 | 12 | 12 | 6 | 6 | 6 | 4 | 4 | 2 | 2 | 4 | 64 | 80 |
| figure | 6 | 14 | 12 | 6 | 8 | 7 | 4 | 2 | 4 | 2 | 4 | 69 | 86 |
| womens_physique | 8 | 14 | 12 | 6 | 8 | 7 | 4 | 2 | 4 | 2 | 4 | 71 | 89 |

Observations:

1. Men's Physique reads correctly at the category level: shoulders 18 and back
   14 are clearly elevated, legs are low. The upper-body PPL structure has room
   to absorb the upper-body bias.
2. Bikini and Wellness produce an IDENTICAL plan. The overlays differ sharply
   (Wellness glutes x1.60 / quads x1.35 / hams x1.40 vs Bikini glutes x1.55 /
   hams x1.35 / quads x0.90), yet delivered volume is the same. The two
   lower-body divisions are indistinguishable in practice. Critical.
3. Glutes never exceed 4 week-1 sets (5 at peak) in any primary plan, including
   the two divisions that are judged primarily on glutes. Elite standard for
   Bikini/Wellness glutes is far higher (research: 15+ building, up to ~30
   off-season). Critical.
4. Classic's calf bias (x1.30) delivers 4 calf sets, identical to general.
   Classic's leg emphasis is not visible at the plate. High.
5. Quads sit at 6-7 across every division regardless of overlay; calves at 2-4.
   Lower-body emphasis is broadly not delivered for any division.
6. The overlay multiplies MEV (the floor), and MEV for glutes (4), hamstrings
   (6) and calves (8) is low; the split (one or two leg sessions in a 5-day
   PPL) plus the time-trim then cap delivery below even the multiplied target.

## Edge case: minimum (beginner, 3 days, full body)

| Plan | ch | bk | sh | bi | tr | qu | ham | glu | cal | wk1 | peak |
|---|--|--|--|--|--|--|--|--|--|--|--|
| mens_physique | 9 | 9 | 15 | 6 | 9 | 0 | 0 | 0 | 0 | 48 | 60 |
| bikini | 0 | 6 | 6 | 0 | 0 | 9 | 9 | 9 | 6 | 45 | 56 |
| bodybuilding | 6 | 6 | 12 | 6 | 6 | 9 | 6 | 0 | 6 | 57 | 71 |

- Beginner full-body actually delivers MORE glutes for Bikini (9) than the
  5-day plan (4), because full-body sessions place a leg movement every session.
  Structure, not the overlay, is doing the work.
- But beginner Bikini delivers 0 chest, 0 biceps, 0 triceps, and beginner Men's
  Physique delivers 0 legs entirely. Whole regions drop out at low frequency.
  The minimum scenario is effective for the priority region but leaves clear
  holes. Medium-High.

## Edge case: maximum (advanced, 6 days, 90 min)

| Plan | ch | bk | sh | qu | ham | glu | cal | wk1 | peak | longest session |
|---|--|--|--|--|--|--|--|--|--|--|
| mens_physique | 8 | 16 | 18 | 6 | 6 | 6 | 6 | 87 | 109 | 57 min |
| bikini | 6 | 14 | 12 | 8 | 7 | 8 | 6 | 81 | 101 | 64 min |
| bodybuilding | 8 | 14 | 18 | 12 | 7 | 6 | 12 | 102 | 128 | 78 min |

- Advanced bodybuilding peaks at 128 sets, right at the 130 systemic cap
  (`planEngine.js:167`). It is delivered across 6 sessions topping out at 78
  min. Recoverable for an advanced trainee, but the cap is doing real work and
  this is the ceiling of the current model.
- Even at maximum, Bikini glutes only reach 8 week-1 (10 peak). The structure
  still limits the signature muscle. The model cannot express elite glute
  volume even for an advanced Bikini competitor on 6 days.

## Edge case: weak-point phase (the additive-vs-destructive test)

Men's Physique, advanced, 5 days:

| Variant | ch | bk | sh | qu | ham | glu | cal | abs | tr | split |
|---|--|--|--|--|--|--|--|--|--|--|
| base (no phase) | 8 | 16 | 18 | 6 | 4 | 3 | 4 | 2 | 4 | ppl |
| weak_point: side delts + glutes | 6 | 8 | 19 | 6 | 6 | 20 | 6 | 0 | 0 | upper_lower_wp |

- The weak-point phase DOES deliver high priority volume (glutes 20, shoulders
  19). It is the only path in the system that gets glutes above single digits.
- But it is destructive: back collapses 16 -> 8, abs and traps drop to 0, and
  the Men's Physique character (the x1.40 side-delt / x1.30 back bias) is
  entirely discarded for the block. This confirms the codebase finding that the
  weak-point branch ignores the division overlay (`planEngine.js:128-139`).
- Glutes 20 slightly exceeds glute MRV (16) and the 110% clamp (17.6), because
  the dedicated weak-point day double-counts placement. Minor over-delivery to
  watch.

Maximum weak-point stack, bodybuilding, advanced, 6 days, 3 weak points
(rear delts, hamstrings, calves): delivers hamstrings 14, calves 12, shoulders
12, with glutes/abs/traps at 0. wk1 70, peak 88. This remains recoverable
(below the advanced ceiling), but again everything outside the stack drops to
maintenance or zero.

## Manageability verdict

- No generated plan is physically unmanageable. Session durations run 28-78 min;
  the systemic 130-set cap prevents runaway total volume.
- Several sessions are UNDER-stuffed (28-35 min push/pull days in the 6-day and
  weak-point plans), wasting a training slot.
- The binding problem is the opposite of overload: the priority muscles for
  lower-body divisions are UNDER-delivered. The system fails the "elite for
  this division" test for Bikini, Wellness, Figure (glutes), and Classic
  (calves and overall leg emphasis), not by being unsafe but by not expressing
  the division's defining volume.

## What the proposed system must fix (carried to Phase 7)

1. Make the lower-body divisions distinguishable and deliver glute/ham/quad
   volume that reaches the elite range, not 4 sets.
2. Apply the division emphasis to a level that survives the split and time-trim
   (multiply a higher anchor than MEV, raise the relevant landmarks, or
   restructure the split for lower-body-dominant divisions).
3. Make weak-point specialisation additive on top of the division emphasis,
   with explicit offsetting reductions, instead of replacing it.
4. Avoid whole-region dropouts at low frequency (beginner Bikini 0 chest;
   beginner Men's Physique 0 legs).
5. Re-simulate every division after changes and confirm delivered volume
   matches the per-division specification before sign-off.
