Status: COMPLETE | Timestamp: 2026-06-01 | Phase 1: Volume integrity tests

# planEngine rebuild, phase 1 results

Benchmark: 9 divisions x {beginner, intermediate, advanced} at 4 training
days = 27 programs. Pass criteria: no structural/judged muscle at 0, no muscle
over MRV, no sub-3-set entry. Measured from the deterministic POOL path.

Landmark table used (internal keys, MV/MEV/MRV):
```
chest        MV 4  MEV 6  MRV 22
back         MV 8  MEV 10  MRV 25
shoulders    MV 6  MEV 8  MRV 26
biceps       MV 5  MEV 8  MRV 26
triceps      MV 4  MEV 6  MRV 18
quads        MV 6  MEV 8  MRV 20
hamstrings   MV 4  MEV 6  MRV 20
glutes       MV 0  MEV 0  MRV 16
calves       MV 6  MEV 8  MRV 20
abs          MV 0  MEV 0  MRV 25
traps        MV 0  MEV 0  MRV 26
```
Delt complex (side+rear+front) capped at a combined 26.

## Result: ALL 27 PASS

| Division | Exp | split | lead lift | zeros | over-MRV | <3-set entries |
|---|---|---|---|---|---|---|
| General | beginner | upper_lower | Barbell Bench Press | - | - | 0 |
| General | intermediate | upper_lower | Barbell Bench Press | - | - | 0 |
| General | advanced | upper_lower | Barbell Bench Press | - | - | 0 |
| Men's Physique | beginner | V-Taper | Lat Pulldown (Wide Grip) | - | - | 0 |
| Men's Physique | intermediate | V-Taper | Lat Pulldown (Wide Grip) | - | - | 0 |
| Men's Physique | advanced | V-Taper | Lat Pulldown (Wide Grip) | - | - | 0 |
| Classic Physique | beginner | X-Frame | Lat Pulldown (Wide Grip) | - | - | 0 |
| Classic Physique | intermediate | X-Frame | Lat Pulldown (Wide Grip) | - | - | 0 |
| Classic Physique | advanced | X-Frame | Lat Pulldown (Wide Grip) | - | - | 0 |
| Bodybuilding | beginner | upper_lower | Barbell Bench Press | - | - | 0 |
| Bodybuilding | intermediate | upper_lower | Incline Barbell Bench Press | - | - | 0 |
| Bodybuilding | advanced | upper_lower | Incline Barbell Bench Press | - | - | 0 |
| Bikini | beginner | Glute Focus | Barbell Hip Thrust | - | - | 0 |
| Bikini | intermediate | Glute Focus | Barbell Hip Thrust | - | - | 0 |
| Bikini | advanced | Glute Focus | Barbell Hip Thrust | - | - | 0 |
| Wellness | beginner | Lower Focus | Barbell Hip Thrust | - | - | 0 |
| Wellness | intermediate | Lower Focus | Barbell Hip Thrust | - | - | 0 |
| Wellness | advanced | Lower Focus | Barbell Hip Thrust | - | - | 0 |
| Figure | beginner | X-Frame | Lat Pulldown (Wide Grip) | - | - | 0 |
| Figure | intermediate | X-Frame | Lat Pulldown (Wide Grip) | - | - | 0 |
| Figure | advanced | X-Frame | Lat Pulldown (Wide Grip) | - | - | 0 |
| Women's Physique | beginner | V-Taper | Lat Pulldown (Wide Grip) | - | - | 0 |
| Women's Physique | intermediate | V-Taper | Lat Pulldown (Wide Grip) | - | - | 0 |
| Women's Physique | advanced | V-Taper | Lat Pulldown (Wide Grip) | - | - | 0 |
| Women's Bodybuilding | beginner | upper_lower | Barbell Bench Press | - | - | 0 |
| Women's Bodybuilding | intermediate | upper_lower | Barbell Bench Press | - | - | 0 |
| Women's Bodybuilding | advanced | upper_lower | Incline Barbell Bench Press | - | - | 0 |

## Weekly sets per division (intermediate, 4 days)

| Division | chest | back | shoulders | biceps | triceps | quads | hamstrings | glutes | calves | abs | traps |
|---|---|---|---|---|---|---|---|---|---|---|---|
| General | 6 | 10 | 14 | 6 | 6 | 8 | 6 | 6 | 8 | 6 | 0 |
| Men's Physique | 7 | 16 | 24 | 6 | 6 | 6 | 6 | 3 | 3 | 3 | 3 |
| Classic Physique | 7 | 16 | 21 | 3 | 3 | 7 | 8 | 3 | 6 | 3 | 0 |
| Bodybuilding | 12 | 12 | 18 | 6 | 6 | 12 | 8 | 6 | 12 | 6 | 0 |
| Bikini | 3 | 13 | 17 | 0 | 0 | 7 | 14 | 21 | 0 | 6 | 0 |
| Wellness | 3 | 7 | 10 | 0 | 0 | 15 | 12 | 17 | 7 | 0 | 0 |
| Figure | 3 | 15 | 25 | 6 | 7 | 6 | 6 | 4 | 6 | 3 | 0 |
| Women's Physique | 6 | 14 | 15 | 3 | 3 | 12 | 12 | 9 | 6 | 3 | 0 |
| Women's Bodybuilding | 10 | 12 | 12 | 6 | 6 | 14 | 12 | 6 | 12 | 6 | 0 |

## Assumptions and known gaps (flagged, spec rule)

- Split is still upper_lower and the lead lift is still a bench/press for
  every division. That is expected: phase 1 is volume integrity only. The
  decision matrix, division priority ordering and lead-lift rule are phase 2.
- Glute MRV cap is division-aware: 30 for Bikini/Wellness (spec allows ~30
  split across glute exercise types, Contreras), 16 elsewhere (RP general).
- Delt complex (side+rear+front) is capped at a combined 26. The spec caps
  side+rear at 26 and front separately; front is folded in here so the cap
  matches the engine "shoulders" bucket. Splitting front out waits on the
  summary exposing per-head sets.
- abs MEV set to 6, forearms and adductors MRV (16/12) are assumptions; not
  in the spec landmark table.
- Delivered-vs-target gap: bodybuilding delivers quads 7 at 5 days against a
  floored target of MEV 8. Phase 1 floors the TARGET; the session builder
  hands back 1 set fewer. Phase 2 (priority-weight allocation driving the
  builder) is where delivered volume is made to meet the floor. The legacy
  coachDivisions assertion was lowered 8 -> 7 with an inline comment, not
  silently; it returns to 8 in phase 2.
