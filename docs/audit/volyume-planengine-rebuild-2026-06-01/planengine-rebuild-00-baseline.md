Status: COMPLETE | Timestamp: 2026-06-01 | Phase 0: Baseline (pre-rebuild)

# planEngine rebuild baseline

Measured from the current `generatePlan` (no code changed yet), deterministic
internal POOL path, profile held constant: intermediate, full gym, 75 min,
average recovery, 4 training days. These are the actual measured numbers the
rebuild must improve on.

Measurement notes / assumptions (spec asks these be flagged):
- "shoulders" is the engine bucket summing side + rear + front delts
  (`buildVolumeSummary`). The spec separates front delts and caps side+rear at
  26. Per-head measurement lands in Phase 1 when the explicit landmark table is
  introduced; the baseline reports the combined bucket and flags it.
- Baseline uses the internal POOL, not the DB seed library. The earlier all-
  division dump confirmed the same structural failures appear on both paths, so
  POOL is a valid structural baseline. Library-specific exercise quality is a
  Phase 3 concern.

## Per-division baseline (4 days)

### General (4-day)
- split: upper_lower
- lead lift: Barbell Bench Press
- weekly sets: chest 6, back 8, shoulders 12, biceps 6, triceps 6, quads 8, hamstrings 6, glutes 6, calves 6, abs 4, traps 0
- total sets: 68
- zeros (structural/judged at 0): none
- over MRV: none
- sub-3-set entries: Lower A: Cable Crunch (2) | Lower B: Hanging Leg Raise (2)

### Men's Physique (4-day)
- split: upper_lower
- lead lift: Incline Barbell Bench Press
- weekly sets: chest 12, back 8, shoulders 16, biceps 4, triceps 4, quads 6, hamstrings 6, glutes 0, calves 6, abs 0, traps 0
- total sets: 62
- zeros (structural/judged at 0): glutes
- over MRV: none
- sub-3-set entries: Upper A: Barbell Bench Press (2) | Upper A: Weighted Pull-Up (2) | Upper A: Barbell Row (Bent Over) (2) | Upper A: Cable Lateral Raise (2) | Upper A: Face Pull (2) | Upper A: Reverse Pec Deck (2) | Upper A: Barbell Overhead Press (2) | Upper A: Incline Dumbbell Curl (2) | Upper A: JM Press (2) | Upper B: Dumbbell Bench Press (2) | Upper B: Lat Pulldown (Wide Grip) (2) | Upper B: T-Bar Row (2) | Upper B: Machine Lateral Raise (2) | Upper B: Cable Rear Delt Fly (2) | Upper B: Dumbbell Rear Delt Fly (2) | Upper B: Dumbbell Shoulder Press (2) | Upper B: Prone Incline Curl (2) | Upper B: Overhead Cable Tricep Extension (2)

### Classic Physique (4-day)
- split: upper_lower
- lead lift: Incline Barbell Bench Press
- weekly sets: chest 10, back 8, shoulders 14, biceps 4, triceps 4, quads 12, hamstrings 7, glutes 7, calves 10, abs 4, traps 0
- total sets: 80
- zeros (structural/judged at 0): none
- over MRV: none
- sub-3-set entries: Upper A: Barbell Bench Press (2) | Upper A: Weighted Pull-Up (2) | Upper A: Barbell Row (Bent Over) (2) | Upper A: Cable Lateral Raise (2) | Upper A: Face Pull (2) | Upper A: Reverse Pec Deck (2) | Upper A: Incline Dumbbell Curl (2) | Upper A: JM Press (2) | Lower A: Standing Calf Raise (Machine) (2) | Lower A: Seated Calf Raise (2) | Lower A: Cable Crunch (2) | Upper B: Dumbbell Bench Press (2) | Upper B: Lat Pulldown (Wide Grip) (2) | Upper B: T-Bar Row (2) | Upper B: Machine Lateral Raise (2) | Upper B: Leaning Lateral Raise (2) | Upper B: Cable Rear Delt Fly (2) | Upper B: Dumbbell Rear Delt Fly (2) | Upper B: Prone Incline Curl (2) | Upper B: Overhead Cable Tricep Extension (2) | Lower B: Hanging Leg Raise (2)

### Bodybuilding (4-day)
- split: upper_lower
- lead lift: Incline Barbell Bench Press
- weekly sets: chest 8, back 8, shoulders 16, biceps 4, triceps 4, quads 8, hamstrings 7, glutes 8, calves 12, abs 5, traps 0
- total sets: 80
- zeros (structural/judged at 0): none
- over MRV: none
- sub-3-set entries: Upper A: Weighted Pull-Up (2) | Upper A: Barbell Row (Bent Over) (2) | Upper A: Cable Lateral Raise (2) | Upper A: Dumbbell Lateral Raise (2) | Upper A: Face Pull (2) | Upper A: Barbell Overhead Press (2) | Upper A: Incline Dumbbell Curl (2) | Upper A: JM Press (2) | Lower A: Cable Crunch (2) | Upper B: Lat Pulldown (Wide Grip) (2) | Upper B: T-Bar Row (2) | Upper B: Machine Lateral Raise (2) | Upper B: Leaning Lateral Raise (2) | Upper B: Reverse Pec Deck (2) | Upper B: Dumbbell Shoulder Press (2) | Upper B: Spider Curl (2) | Upper B: Overhead Cable Tricep Extension (2)

### Bikini (4-day)
- split: upper_lower
- lead lift: Barbell Bench Press
- weekly sets: chest 6, back 14, shoulders 12, biceps 4, triceps 4, quads 8, hamstrings 14, glutes 8, calves 4, abs 4, traps 0
- total sets: 78
- zeros (structural/judged at 0): none
- over MRV: none
- sub-3-set entries: Upper A: Cable Lateral Raise (2) | Upper A: Dumbbell Lateral Raise (2) | Upper A: Face Pull (2) | Upper A: Incline Dumbbell Curl (2) | Upper A: JM Press (2) | Lower A: Barbell Hip Thrust (2) | Lower A: Dumbbell Hip Thrust (2) | Lower A: Standing Calf Raise (Machine) (2) | Lower A: Cable Crunch (2) | Upper B: Machine Lateral Raise (2) | Upper B: Leaning Lateral Raise (2) | Upper B: Reverse Pec Deck (2) | Upper B: Spider Curl (2) | Upper B: Close-Grip Bench Press (2) | Lower B: Glute Bridge (2) | Lower B: Step-Up (Dumbbell) (2) | Lower B: Dumbbell Calf Raise (Standing) (2) | Lower B: Hanging Leg Raise (2)

### Wellness (4-day)
- split: upper_lower
- lead lift: Barbell Bench Press
- weekly sets: chest 6, back 14, shoulders 12, biceps 4, triceps 4, quads 15, hamstrings 8, glutes 8, calves 4, abs 4, traps 0
- total sets: 79
- zeros (structural/judged at 0): none
- over MRV: none
- sub-3-set entries: Upper A: Cable Lateral Raise (2) | Upper A: Dumbbell Lateral Raise (2) | Upper A: Face Pull (2) | Upper A: Incline Dumbbell Curl (2) | Upper A: JM Press (2) | Lower A: Romanian Deadlift (Barbell) (2) | Lower A: Lying Leg Curl (2) | Lower A: Barbell Hip Thrust (2) | Lower A: Dumbbell Hip Thrust (2) | Lower A: Standing Calf Raise (Machine) (2) | Lower A: Cable Crunch (2) | Upper B: Machine Lateral Raise (2) | Upper B: Leaning Lateral Raise (2) | Upper B: Reverse Pec Deck (2) | Upper B: Spider Curl (2) | Upper B: Close-Grip Bench Press (2) | Lower B: Stiff-Leg Deadlift (2) | Lower B: Seated Leg Curl (2) | Lower B: Glute Bridge (2) | Lower B: Step-Up (Dumbbell) (2) | Lower B: Dumbbell Calf Raise (Standing) (2) | Lower B: Hanging Leg Raise (2)

### Figure (4-day)
- split: upper_lower
- lead lift: Incline Barbell Bench Press
- weekly sets: chest 8, back 9, shoulders 16, biceps 4, triceps 4, quads 12, hamstrings 7, glutes 10, calves 5, abs 4, traps 0
- total sets: 79
- zeros (structural/judged at 0): none
- over MRV: none
- sub-3-set entries: Upper A: Weighted Pull-Up (2) | Upper A: Barbell Row (Bent Over) (2) | Upper A: Cable Lateral Raise (2) | Upper A: Dumbbell Lateral Raise (2) | Upper A: Face Pull (2) | Upper A: Reverse Pec Deck (2) | Upper A: Incline Dumbbell Curl (2) | Upper A: JM Press (2) | Lower A: Barbell Hip Thrust (2) | Lower A: Dumbbell Hip Thrust (2) | Lower A: Standing Calf Raise (Machine) (2) | Lower A: Cable Crunch (2) | Upper B: T-Bar Row (2) | Upper B: Machine Lateral Raise (2) | Upper B: Leaning Lateral Raise (2) | Upper B: Cable Rear Delt Fly (2) | Upper B: Dumbbell Rear Delt Fly (2) | Upper B: Spider Curl (2) | Upper B: Overhead Cable Tricep Extension (2) | Lower B: Hanging Leg Raise (2)

### Women's Physique (4-day)
- split: upper_lower
- lead lift: Barbell Bench Press
- weekly sets: chest 8, back 12, shoulders 12, biceps 4, triceps 4, quads 12, hamstrings 7, glutes 7, calves 10, abs 4, traps 0
- total sets: 80
- zeros (structural/judged at 0): none
- over MRV: none
- sub-3-set entries: Upper A: Barbell Row (Bent Over) (2) | Upper A: Cable Lateral Raise (2) | Upper A: Dumbbell Lateral Raise (2) | Upper A: Face Pull (2) | Upper A: Incline Dumbbell Curl (2) | Upper A: JM Press (2) | Lower A: Standing Calf Raise (Machine) (2) | Lower A: Seated Calf Raise (2) | Lower A: Cable Crunch (2) | Upper B: T-Bar Row (2) | Upper B: Machine Lateral Raise (2) | Upper B: Leaning Lateral Raise (2) | Upper B: Reverse Pec Deck (2) | Upper B: Spider Curl (2) | Upper B: Overhead Cable Tricep Extension (2) | Lower B: Hanging Leg Raise (2)

### Women's Bodybuilding (4-day)
- split: upper_lower
- lead lift: Barbell Bench Press
- weekly sets: chest 8, back 12, shoulders 12, biceps 4, triceps 4, quads 12, hamstrings 7, glutes 7, calves 10, abs 5, traps 0
- total sets: 81
- zeros (structural/judged at 0): none
- over MRV: none
- sub-3-set entries: Upper A: Barbell Row (Bent Over) (2) | Upper A: Cable Lateral Raise (2) | Upper A: Dumbbell Lateral Raise (2) | Upper A: Face Pull (2) | Upper A: Incline Dumbbell Curl (2) | Upper A: JM Press (2) | Lower A: Standing Calf Raise (Machine) (2) | Lower A: Seated Calf Raise (2) | Lower A: Cable Crunch (2) | Upper B: T-Bar Row (2) | Upper B: Machine Lateral Raise (2) | Upper B: Leaning Lateral Raise (2) | Upper B: Reverse Pec Deck (2) | Upper B: Spider Curl (2) | Upper B: Overhead Cable Tricep Extension (2)

## Baseline defect roll-up (measured)

- General: 2 sub-3-set entries
- Men's Physique: muscles at zero -> glutes
- Men's Physique: 18 sub-3-set entries
- Classic Physique: 21 sub-3-set entries
- Bodybuilding: 17 sub-3-set entries
- Bikini: 18 sub-3-set entries
- Wellness: 22 sub-3-set entries
- Figure: 20 sub-3-set entries
- Women's Physique: 16 sub-3-set entries
- Women's Bodybuilding: 15 sub-3-set entries

## Split is division-blind at 4 days (measured)

- General: upper_lower
- Men's Physique: upper_lower
- Classic Physique: upper_lower
- Bodybuilding: upper_lower
- Bikini: upper_lower
- Wellness: upper_lower
- Figure: upper_lower
- Women's Physique: upper_lower
- Women's Bodybuilding: upper_lower
