Status: COMPLETE | Timestamp: 2026-06-01 | Phase 3e: indirect volume modelling

# planEngine rebuild, phase 3e results: indirect (fractional) volume

A synergist on a compound lift earns half a working set (RP convention).
The engine reports this as weeklyVolumeSummary.indirectSets, additive to the
existing plannedSets (direct) count, which is left exactly as it was. The live
app path carries the secondaryMuscles the model reads (DB secondary_muscles
column); the hand-written internal POOL carries none, so the POOL path reports
0 indirect (the field is still present).

## Direct + indirect sets per muscle (4-day, library path)

| Division | muscle: direct (+indirect) |
|---|---|
| General | chest 6 (+3), back 10 (+4.5), shoulders 12 (+10), biceps 6 (+5), triceps 6 (+6), quads 8 (+1.5), hamstrings 6 (+5), glutes 6 (+5.5), calves 8, abs 6, traps 0 (+1.5) |
| Men's Physique | chest 8 (+1.5), back 16 (+7), shoulders 21 (+11), biceps 6 (+8), triceps 6 (+7.5), quads 6 (+1.5), hamstrings 6 (+1.5), glutes 3 (+4.5), calves 3, abs 3, traps 3 (+2.5) |
| Classic Physique | chest 7, back 16 (+4), shoulders 20 (+8.5), biceps 6 (+8), triceps 3 (+6.5), quads 7 (+1.5), hamstrings 8 (+3), glutes 3 (+3.5), calves 6, abs 3, traps 0 (+2) |
| Bodybuilding | chest 10, back 12 (+4.5), shoulders 18 (+12.5), biceps 6 (+6), triceps 6 (+11), quads 10 (+1.5), hamstrings 8 (+5.5), glutes 6 (+6.5), calves 12, abs 6, traps 0 (+1.5) |
| Bikini | chest 3, back 13 (+6.5), shoulders 17 (+1.5), biceps 0 (+6.5), triceps 0 (+1.5), quads 7 (+2), hamstrings 14 (+6), glutes 21 (+7), calves 0, abs 6, traps 0 (+1.5) |
| Wellness | chest 3, back 7 (+3), shoulders 9 (+6), biceps 0 (+3.5), triceps 0 (+4.5), quads 15 (+6), hamstrings 12 (+7.5), glutes 20 (+14.5), calves 6, abs 0, traps 0 |
| Figure | chest 3 (+1.5), back 15 (+7.5), shoulders 25 (+8.5), biceps 6 (+7.5), triceps 7 (+5.5), quads 6 (+2), hamstrings 6 (+3.5), glutes 4 (+4.5), calves 6, abs 3, traps 0 (+3) |
| Women's Physique | chest 6, back 14 (+3), shoulders 15 (+7.5), biceps 3 (+7), triceps 3 (+6), quads 12 (+2), hamstrings 10 (+6), glutes 9 (+6), calves 6, abs 3, traps 0 (+1.5) |
| Women's Bodybuilding | chest 10, back 12 (+6), shoulders 12 (+9.5), biceps 6 (+6), triceps 6 (+8), quads 12 (+4.5), hamstrings 12 (+4.5), glutes 6 (+12), calves 12, abs 6, traps 0 (+1.5) |

## What the numbers show

- Pulling programs feed biceps large indirect volume (MP biceps gets several
  fractional sets from rows and pulldowns), so heavy direct biceps work is
  rarely needed on top.
- Pressing programs feed triceps large indirect volume.
- Bikini, after the phase 3 delt rule removed pressing, leaves the shoulders
  with almost no indirect coverage. That is exactly why Bikini trains delts
  directly with lateral raises. This is the spec "side delts in pressing
  programs" coverage signal, seen from the no-pressing side.

## Synergist trim (target subtraction) DONE

A synergist with heavy indirect coverage has its DIRECT target trimmed by a
credit proportional to its driver compound (biceps from back at 0.4, triceps
from chest at 0.5), floored at MEV + 2. Effective volume (direct + indirect),
the correct adequacy measure, stays at or above MEV for every arm-judged
division and day count. Example: Classic biceps target 12 trims to 10, and
with the delivered-vs-target fix it delivers ~10, plus ~8 indirect.

This was only safe AFTER the delivered-vs-target gap fix: before it, a trimmed
target cratered DELIVERED volume (a discretisation cliff dropped a 5-set
session from 2 exercises to 1). Arms are not judged in Bikini or Wellness, so
their below-MEV arm volume is correct and is not asserted.

## Not done in 3e

- A hard coverage flag forcing isolation when indirect is near zero: largely
  redundant with the matrix (every division already gets direct side delts),
  low value, deferred.
