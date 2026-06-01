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
| General | chest 6 (+3), back 8 (+4.5), shoulders 12 (+9.5), biceps 6 (+4), triceps 6 (+6), quads 8 (+5.5), hamstrings 6 (+5), glutes 6 (+7.5), calves 8, abs 6, traps 0 (+1.5) |
| Men's Physique | chest 8 (+1.5), back 16 (+6), shoulders 18 (+10.5), biceps 6 (+8), triceps 6 (+7), quads 3 (+4.5), hamstrings 6 (+1.5), glutes 3 (+6), calves 3, abs 3, traps 3 (+1.5) |
| Classic Physique | chest 7, back 16 (+3), shoulders 18 (+8.5), biceps 6 (+8), triceps 3 (+6.5), quads 7 (+3), hamstrings 6 (+3), glutes 3 (+5), calves 6, abs 3, traps 0 (+1.5) |
| Bodybuilding | chest 8, back 12 (+4.5), shoulders 18 (+11.5), biceps 6 (+6), triceps 6 (+10), quads 8 (+4.5), hamstrings 6 (+5.5), glutes 7 (+7), calves 12, abs 6, traps 0 (+1.5) |
| Bikini | chest 3, back 10 (+6.5), shoulders 18 (+1.5), biceps 0 (+3.5), triceps 0 (+1.5), quads 7 (+3.5), hamstrings 13 (+7.5), glutes 21 (+8.5), calves 0, abs 6, traps 0 (+1.5) |
| Wellness | chest 3, back 6 (+3.5), shoulders 3 (+4.5), biceps 0 (+3), triceps 0 (+3), quads 15 (+8.5), hamstrings 13 (+7.5), glutes 20 (+14), calves 6, abs 0, traps 0 |
| Figure | chest 3 (+2), back 15 (+7.5), shoulders 21 (+8), biceps 6 (+7.5), triceps 7 (+4.5), quads 3 (+3.5), hamstrings 6 (+3.5), glutes 4 (+4.5), calves 6, abs 3, traps 0 (+3) |
| Women's Physique | chest 6, back 14 (+3), shoulders 15 (+7.5), biceps 3 (+7), triceps 3 (+6), quads 12 (+3.5), hamstrings 6 (+5.5), glutes 8 (+6), calves 6, abs 3, traps 0 (+1.5) |
| Women's Bodybuilding | chest 8, back 12 (+4.5), shoulders 12 (+8.5), biceps 6 (+6), triceps 6 (+7), quads 6 (+7.5), hamstrings 6 (+4.5), glutes 6 (+9), calves 12, abs 6, traps 0 (+1.5) |

## What the numbers show

- Pulling programs feed biceps large indirect volume (MP biceps gets several
  fractional sets from rows and pulldowns), so heavy direct biceps work is
  rarely needed on top.
- Pressing programs feed triceps large indirect volume.
- Bikini, after the phase 3 delt rule removed pressing, leaves the shoulders
  with almost no indirect coverage. That is exactly why Bikini trains delts
  directly with lateral raises. This is the spec "side delts in pressing
  programs" coverage signal, seen from the no-pressing side.

## Not done in 3e (next increments)

- Subtracting indirect from direct TARGETS (so a muscle with high indirect
  coverage needs fewer direct sets). Deferred because targets are set before
  selection and indirect is only known after; needs a two-pass with the MEV
  floor (phase 1) protected so nothing is under-dosed.
- A hard coverage flag forcing isolation when indirect is near zero. The
  reporting above is the measurement layer that flag will read.
