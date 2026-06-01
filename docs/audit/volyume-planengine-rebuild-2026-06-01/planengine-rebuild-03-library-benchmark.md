Status: COMPLETE | Timestamp: 2026-06-01 | Phase 3 increment 0: library-path benchmark

# planEngine rebuild, phase 3 increment 0: the library-path benchmark

## Why this exists

Phases 1 and 2 were measured on the deterministic internal POOL. The live
app does not use POOL: it feeds the DB exercise library through
getAllExercises, generatePoolFromLibrary and _effectivePool. The Phase 3
library work (3a corrected tagging, 3b sub-region tags, 3c division pools) is
only verifiable on the library path, so this benchmark is built first. It
records the starting numbers so the re-tag work has a before and after, not a
blind edit of 87KB of seed data.

Seed library parsed: 475 exercises.

## Library-path structural check (4-day, intermediate), all divisions

| Division | split | lead lift | total sets | zeros | over-MRV | fragments |
|---|---|---|---|---|---|---|
| General | upper_lower | Barbell Bench Press | 74 | none | none | none |
| Men's Physique | V-Taper | Lat Pulldown (Wide Grip) | 81 | none | none | none |
| Classic Physique | X-Frame | Lat Pulldown (Wide Grip) | 79 | none | none | none |
| Bodybuilding | upper_lower | Incline Barbell Bench Press | 94 | none | none | none |
| Bikini | Glute Focus | Barbell Hip Thrust | 81 | none | none | none |
| Wellness | Lower Focus | Barbell Hip Thrust | 72 | none | none | none |
| Figure | X-Frame | Lat Pulldown (Wide Grip) | 81 | none | none | none |
| Women's Physique | V-Taper | Lat Pulldown (Wide Grip) | 81 | none | none | none |
| Women's Bodybuilding | upper_lower | Barbell Bench Press | 94 | none | none | none |

## POOL vs library path: same structural guarantees?

| Division | POOL total | library total | POOL lead | library lead |
|---|---|---|---|---|
| General | 76 | 74 | Barbell Bench Press | Barbell Bench Press |
| Men's Physique | 83 | 81 | Weighted Pull-Up | Lat Pulldown (Wide Grip) |
| Classic Physique | 76 | 79 | Weighted Pull-Up | Lat Pulldown (Wide Grip) |
| Bodybuilding | 94 | 94 | Incline Barbell Bench Press | Incline Barbell Bench Press |
| Bikini | 81 | 81 | Barbell Hip Thrust | Barbell Hip Thrust |
| Wellness | 70 | 72 | Barbell Hip Thrust | Barbell Hip Thrust |
| Figure | 81 | 81 | Weighted Pull-Up | Lat Pulldown (Wide Grip) |
| Women's Physique | 78 | 81 | Weighted Pull-Up | Lat Pulldown (Wide Grip) |
| Women's Bodybuilding | 94 | 94 | Barbell Bench Press | Barbell Bench Press |

## Bikini-vs-MP exercise overlap (the 3c gate target is < 30%)

- library path: 46%
- POOL path: 54%

This is the gap 3c (division-specific pools + mandated lead category +
restrictions) must close. The assertion lives, skipped, in the phase 2
benchmark and is un-skipped when 3c lands. Not relaxed, just not yet due.

## What this increment does NOT do

- 3a corrected muscle tagging in seedExercises.js (hip-extension primary =
  glutes, etc.): NOT done. This benchmark makes it measurable.
- 3b sub-region tags on every exercise: NOT done.
- 3c division-specific pools: NOT done. This is what drives the overlap down.
- 3e indirect volume, 3f coverage warnings, Phase 4: NOT done.
