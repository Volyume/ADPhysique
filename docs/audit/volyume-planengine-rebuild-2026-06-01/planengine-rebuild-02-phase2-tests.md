Status: COMPLETE | Timestamp: 2026-06-01 | Phase 2: Division specialisation tests

# planEngine rebuild, phase 2 results

Core benchmark: 4-day Bikini vs 4-day Men's Physique.
- exercise overlap: 65% (spec target < 30%)
- Bikini lead lift: Barbell Hip Thrust
- Men's Physique lead lift: Weighted Pull-Up

SPEC CONFLICT (flagged, not resolved silently): the < 30% overlap gate
depends on division-specific exercise pools, which are phase 3. Phase 2
differentiates structure (split, lead lift, frequency, muscle emphasis) and
all those gates pass. Shared muscles still select the same lifts across
divisions until the phase 3 pools land, so overlap sits at ~65% here. The
overlap assertion is skipped in phase 2 and re-homed to phase 3 pending
founder direction.

Structural gates that PASS in phase 2:
- different lead lifts: Barbell Hip Thrust vs Weighted Pull-Up
- Bikini/Wellness lead with glutes at 3 and 4 days
- MP leads a vertical pull (never bench), width-vs-thickness split
- Bikini glutes are the highest-volume muscle; MP back >= chest

## Lead lift + split per specialised division, all day counts

| Division | Days | split | lead lift | session names |
|---|---|---|---|---|
| General | 3 | full_body | Barbell Back Squat | Full Body A / Full Body B / Full Body C |
| General | 4 | upper_lower | Barbell Bench Press | Upper A / Lower A / Upper B / Lower B |
| General | 5 | ppl | Barbell Bench Press | Push A / Pull A / Legs / Push B / Pull B |
| General | 6 | ppl_ab | Barbell Bench Press | Push A / Pull A / Legs A / Push B / Pull B / Legs B |
| Men's Physique | 3 | V-Taper | Weighted Pull-Up | Upper A (Width) / Lower + Abs / Upper B (Detail) |
| Men's Physique | 4 | V-Taper | Weighted Pull-Up | Back + Delts (Width) / Chest + Arms / Lower + Abs / Back + Delts (Thickness) |
| Men's Physique | 5 | V-Taper | Weighted Pull-Up | Pull (Width) / Push (Delts + Chest) / Legs + Abs / Pull (Thickness) / Delts + Arms |
| Men's Physique | 6 | V-Taper | Weighted Pull-Up | Pull (Width) / Push (Chest) / Legs / Pull (Thickness) / Push (Delts) / Delts + Arms + Abs |
| Classic Physique | 3 | X-Frame | Weighted Pull-Up | Upper (Back + Delt) / Lower (Sweep + Ham) / Upper (Chest + Arm) |
| Classic Physique | 4 | X-Frame | Weighted Pull-Up | Back + Rear Delt / Legs (Sweep) / Chest + Side Delt + Arms / Back + Hams |
| Classic Physique | 5 | X-Frame | Weighted Pull-Up | Pull / Legs (Quad) / Push / Pull / Legs (Ham + Glute) |
| Classic Physique | 6 | X-Frame | Weighted Pull-Up | Pull / Push / Legs / Pull / Push / Legs + Abs |
| Bodybuilding | 3 | full_body | Barbell Back Squat | Full Body A / Full Body B / Full Body C |
| Bodybuilding | 4 | upper_lower | Incline Barbell Bench Press | Upper A / Lower A / Upper B / Lower B |
| Bodybuilding | 5 | balanced_ul | Barbell Hip Thrust | Lower A / Upper A / Lower B / Upper B / Upper C |
| Bodybuilding | 6 | ppl_ab | Incline Barbell Bench Press | Push A / Pull A / Legs A / Push B / Pull B / Legs B |
| Bikini | 3 | Glute Focus | Barbell Hip Thrust | Glute Focus A / Upper (Delts + Width) / Glute Focus B |
| Bikini | 4 | Glute Focus | Barbell Hip Thrust | Lower (Glute + Ham) / Upper (Delts + Back) / Lower (Glute + Quad) / Glutes (Pump) + Delts |
| Bikini | 5 | Glute Focus | Barbell Hip Thrust | Glutes (Max) / Delts + Back + Abs / Glutes (Medius + Ham) / Lower (Quad + Glute) / Delts + Arms |
| Bikini | 6 | Glute Focus | Barbell Hip Thrust | Glutes / Upper (Delt + Back) / Glutes / Lower (Quad) / Upper (Delt + Arm) / Glutes Pump + Abs |
| Wellness | 3 | Lower Focus | Barbell Hip Thrust | Lower A (Glute + Ham) / Lower B (Quad + Adductor) / Upper (Delts + Back + Abs) |
| Wellness | 4 | Lower Focus | Barbell Hip Thrust | Glute + Ham / Quad Sweep + Adductor / Glute (Medius) + Upper / Lower Full |
| Wellness | 5 | Lower Focus | Barbell Hip Thrust | Glutes / Quads (Sweep) / Glute + Ham / Upper (Delts + Back) / Lower Full |
| Wellness | 6 | Lower Focus | Barbell Hip Thrust | Glutes / Quads / Ham + Glute / Upper / Lower (Sweep) / Glute Pump + Abs |
| Figure | 3 | X-Frame | Cable Lateral Raise | Upper (Delt + Back Width) / Lower (Glute + Ham + Quad) / Upper (Delt + Arm + Abs) |
| Figure | 4 | X-Frame | Weighted Pull-Up | Back + Rear Delt / Lower / Shoulders + Arms / Back Width + Abs |
| Figure | 5 | X-Frame | Weighted Pull-Up | Pull / Legs / Delts + Arms / Pull / Lower (Glute-Ham) |
| Figure | 6 | X-Frame | Weighted Pull-Up | Pull / Push (Delt) / Legs / Pull / Delts + Arms / Lower |
| Women's Physique | 3 | V-Taper | Weighted Pull-Up | Upper (Back + Delt) / Lower (Quad + Ham + Glute) / Upper (Chest + Arm + Abs) |
| Women's Physique | 4 | V-Taper | Weighted Pull-Up | Upper (Width) / Lower / Upper (Thickness) / Lower |
| Women's Physique | 5 | V-Taper | Weighted Pull-Up | Pull / Push / Legs / Upper / Lower |
| Women's Physique | 6 | V-Taper | Weighted Pull-Up | Pull / Push / Legs / Pull / Push / Legs |
| Women's Bodybuilding | 3 | full_body | Barbell Back Squat | Full Body A / Full Body B / Full Body C |
| Women's Bodybuilding | 4 | upper_lower | Barbell Bench Press | Upper A / Lower A / Upper B / Lower B |
| Women's Bodybuilding | 5 | balanced_ul | Barbell Hip Thrust | Lower A / Upper A / Lower B / Upper B / Upper C |
| Women's Bodybuilding | 6 | ppl_ab | Barbell Bench Press | Push A / Pull A / Legs A / Push B / Pull B / Legs B |
