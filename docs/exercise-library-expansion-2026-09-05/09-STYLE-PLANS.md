# 09 — Style plans: kettlebell, circuits and the other families (EL-8 to EL-12)

Implementation spec. Authority: `05-DECISIONS.md` EL-8 to EL-12, research
in `04-ALT-PLAN-RESEARCH.md` sections 3 to 6.

## 1. Style pools (`src/lib/exercise/stylePools.js`, pure)

A style pool is a named, versioned list of canonical exercise names plus
the equipment profile it implies and the tiers it may reach. Pools:

| Pool | Equipment | Reaches | Contents |
|---|---|---|---|
| `kettlebell_foundations` | single kettlebell | grind rows, two-hand swing | Goblet Squat, Kettlebell Deadlift, Sumo Deadlift, Single-Leg Deadlift, Romanian Deadlift, Press (Single-Arm), Seated Press, Floor Press, Row (Single-Arm), Gorilla Row, Farmer's Carry, Suitcase Carry, Rack Carry, Halo, Around-the-World, Reverse Lunge (Rack), Get-Up to Elbow, Turkish Get-Up (Half), Kettlebell Swing (two-hand), Shrug |
| `kettlebell_experienced` | single or double | foundations plus ballistics and advanced grinds | all of the above plus Swing (Single-Arm), Swing (Alternating), Double Swing, Clean, Double Clean, Dead Clean, Hang Clean, Snatch, Alternating Snatch, Clean and Press, Push Press, Jerk, High Pull, Front Rack Squat (Single-Arm, Double), Double Press, Half-Kneeling Press, See-Saw Press, Bottoms-Up Press and Carry, Thruster (Double), Turkish Get-Up, Windmill (Low, High), Overhead Carry, Overhead Lunge, Forward Lunge (Rack), Renegade Row |
| `circuit_dumbbell` | dumbbells | staple and common dumbbell and bodyweight rows only | goblet squat, dumbbell RDL, dumbbell row, press, lunge, push-up, hip thrust, lateral raise, curl, extension, plank family |
| `circuit_bodyweight` | none | staple and common bodyweight rows | squat, split squat, push-up family, inverted row (needs a bar: flagged), glute bridge, plank family, dead bug, step-up |
| `bodyweight`, `band`, `suspension`, `minimal_home` | as named | staple and common rows of that equipment | derived from the corpus by equipment and tier |

The pool file is generated from the corpus by
`scripts/exercise-library/build-style-pools.mjs` for the equipment-derived
pools and hand-curated for the two kettlebell pools; the corpus guard
checks every pool name exists and that no pool contains a NEVER_AUTO row
other than the kettlebell ballistics it explicitly lists. A plan carries
`style:<pool>` in its tags; generation (Adjust plan), swap ranking and
the picker's "current plan" filter read the pool as the candidate set
when a style tag is present, with "Show all exercises" as the explicit
relaxation (EL-11).

## 2. Kettlebell templates (curated, parameterised by level and days)

All original programming, informed by the competence ordering in 04
(swing and get-up before one-arm and overhead ballistics), grind double
progression (EL-10), sessions 25 to 45 minutes.

1. **Kettlebell Foundations, 2 days** (single bell, beginner). Day A:
   Goblet Squat 3x8-12, Kettlebell Deadlift 3x8-12, Press (Single-Arm)
   3x6-10 per side, Row (Single-Arm) 3x8-12 per side, Farmer's Carry
   3x40 m, Halo 2x8 each way. Day B: Reverse Lunge (Rack) 3x8-10 per
   side, Romanian Deadlift 3x8-12, Floor Press 3x8-12, Gorilla Row
   3x8-12, Kettlebell Swing (two-hand) 5x10, Get-Up to Elbow 3x3 per
   side. Tags: `style:kettlebell_foundations equipment:kettlebell
   kettlebell home full_body beginner goal:build_muscle days:2 short`.
2. **Kettlebell Foundations, 3 days** (single bell, beginner): the two
   days above plus Day C: Sumo Deadlift 3x8-12, Seated Press 3x8-12,
   Single-Leg Deadlift 3x6-8 per side, Suitcase Carry 3x30 m per side,
   Swing (two-hand) 5x10, Turkish Get-Up (Half) 3x3 per side.
3. **Kettlebell Strength, 3 days** (single or double, experienced): Day
   A: Front Rack Squat (Double) 4x5-8, Double Press 4x5-8, Swing
   (Single-Arm) 5x10 per side, Renegade Row 3x6-8 per side, Windmill
   (Low) 2x5 per side. Day B: Clean 5x5 per side, Single-Leg Deadlift
   3x6-8 per side, Half-Kneeling Press 3x6-10 per side, Gorilla Row
   4x8-12, Rack Carry 3x40 m. Day C: Snatch 5x5 per side, Thruster
   (Double) 3x6-8, Turkish Get-Up 3x2 per side, Double Swing 4x8-12,
   Overhead Carry 3x30 m per side.
4. **Kettlebell Strength, 4 days** (double, experienced): upper / lower
   / full / ballistic day split from the same pool; the ballistic day is
   Clean, Snatch, Jerk, Swing variations and one carry.
5. **Kettlebell Minimal, 3 days** (single bell, any level after
   Foundations): Swing (two-hand or single-arm by level) 10x10 with a
   fixed 30 s rest, Turkish Get-Up 5x1 per side, Goblet Squat 3x10.
   Twenty-five minutes. Tag `short`.

Progression per EL-10: reps to the top of the range, then the next bell
size (the template's description says so in plain words; the live
screen's rep-then-load nudge already exists for grind rows; ballistic
rows show no load-step suggestion).

## 3. Circuit templates

1. **Full-Body Circuit, Dumbbells, 3 days**: two circuits per session,
   each 3 rounds, 90 s between rounds, stations 8-12 reps. Session A:
   circuit 1 goblet squat, push-up, dumbbell row; circuit 2 dumbbell
   RDL, dumbbell shoulder press, dead bug. Sessions B and C rotate
   patterns (lunge, floor press, hip thrust, lateral raise, curl,
   extension, plank). Tags: `style:circuit_dumbbell circuit equipment:
   dumbbell home full_body goal:build_muscle days:3 short beginner
   intermediate`.
2. **Bodyweight Circuit, 3 days**: same shape from `circuit_bodyweight`;
   the inverted row station is the one bar dependency, flagged in the
   description with the band-row alternative.
3. **Kettlebell Circuit, 3 days** (experienced): circuits from the
   experienced pool with one ballistic station at most per circuit.

Circuit rounds progress 3 to 4 to 5 across the block (EL-10); the
template description states the rule; round rest stays as written.

## 4. Library organisation

Collections gain: `kettlebell` ("Kettlebell"), `circuit` ("Circuits"),
`bodyweight` ("Bodyweight"), `band` ("Bands"), `minimal` ("Minimal
equipment", any plan tagged home or equipment:dumbbell / band /
suspension / kettlebell / bodyweight). The chip row scrolls; ordering:
All, Fits how you train (when active), Featured, Kettlebell, Circuits,
Minimal equipment, Dumbbells only, Bodyweight, Bands, Short sessions,
Beginner, For women, For men, Bodybuilding divisions. The plan card
shows style, days, level, session minutes (`estimateWorkoutMinutes`)
and the implements required (from the plan's exercises' equipment).
`planEquipmentAllows` learns `equipment:kettlebell`, `equipment:band`,
`equipment:suspension` and the wizard / quiz equipment answer gains
"Kettlebells" and "Bands" options mapped to the `home_gym` /
`dumbbells_only` profiles the corpus already uses.

## 5. Capability and intent

Every template is validated by the existing plan compatibility check
(`src/lib/capability/planCompat.js`) against a constrained user in the
verification suite; a style plan with no viable substitution for a
station surfaces the existing "needs edit" state rather than inserting
an incompatible movement. Swaps within a style plan record
`exercise_swaps.cause = 'style'` so the preference layer can exclude
them from durable preference evidence.
