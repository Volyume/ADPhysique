Status: COMPLETE | Timestamp: 2026-06-01 | Phase 2: Division specialisation tests

# planEngine rebuild, phase 2 results

Core benchmark: 4-day Bikini vs 4-day Men's Physique.
- exercise overlap (library path, the gate): 43% (gate < 50%; spec literal target < 30%)
- exercise overlap (internal POOL fallback): 54%
- Bikini lead lift: Barbell Hip Thrust
- Men's Physique lead lift: Weighted Pull-Up

Re-homed to phase 3: overlap is driven by exercise SELECTION, which the
phase 3 division pools control. Phase 3 implemented the spec hard pool rules
(Bikini back width-only, no bench/back-squat, round delts via laterals; MP
legs maintenance only), taking Bikini-vs-MP from 65% to 48% on the library
path. FOUNDER DECISION: the gate is set at < 50%, not the literal < 30%,
because the residual overlap is genuinely shared programming (lat-width
pulldowns, lateral raises, rear-delt and hamstring work) that both divisions
correctly want. See docs 03/04 for the floor analysis.

Structural gates that PASS in phase 2:
- different lead lifts: Barbell Hip Thrust vs Weighted Pull-Up
- Bikini/Wellness lead with glutes at 3 and 4 days
- MP leads a vertical pull (never bench), width-vs-thickness split
- Bikini glutes are the highest-volume muscle; MP back >= chest

## Lead lift + split per specialised division, all day counts

| Division | Days | split | lead lift | session names |
|---|---|---|---|---|
| General | 3 | full_body | Weighted Pull-Up | Full Body A / Full Body B / Full Body C |
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
| Bodybuilding | 3 | full_body | Weighted Pull-Up | Full Body A / Full Body B / Full Body C |
| Bodybuilding | 4 | upper_lower | Incline Barbell Bench Press | Upper A / Lower A / Upper B / Lower B |
| Bodybuilding | 5 | balanced_ul | Barbell Front Squat | Lower A / Upper A / Lower B / Upper B / Upper C |
| Bodybuilding | 6 | ppl_ab | Incline Barbell Bench Press | Push A / Pull A / Legs A / Push B / Pull B / Legs B |
| Bikini | 3 | Glute Focus | Barbell Hip Thrust | Glute Focus A / Upper (Delts + Width) / Glute Focus B |
| Bikini | 4 | Glute Focus | Barbell Hip Thrust | Lower (Glute + Ham) / Upper (Delts + Back) / Lower (Glute + Quad) / Glutes (Pump) + Delts |
| Bikini | 5 | Glute Focus | Barbell Hip Thrust | Glutes (Max) / Delts + Back + Abs / Glutes (Medius + Ham) / Lower (Quad + Glute) / Delts + Arms |
| Bikini | 6 | Glute Focus | Barbell Hip Thrust | Glutes / Upper (Delt + Back) / Glutes / Lower (Quad) / Upper (Delt + Arm) / Glutes Pump + Abs |
| Wellness | 3 | Lower Focus | Barbell Hip Thrust | Lower A (Glute + Ham) / Lower B (Quad + Adductor) / Upper (Delts + Back + Abs) |
| Wellness | 4 | Lower Focus | Barbell Hip Thrust | Glute + Ham + Delts / Quad Sweep + Adductor / Glute (Medius) + Upper / Lower Full |
| Wellness | 5 | Lower Focus | Barbell Hip Thrust | Glutes / Quads (Sweep) / Glute + Ham / Upper (Delts + Back) / Lower Full + Arms |
| Wellness | 6 | Lower Focus | Barbell Hip Thrust | Glutes / Quads / Ham + Glute / Upper (Delts + Back) / Lower (Sweep) / Glute Pump + Arms + Abs |
| Figure | 3 | X-Frame | Cable Lateral Raise | Upper (Delt + Back Width) / Lower (Glute + Ham + Quad) / Upper (Delt + Arm + Abs) |
| Figure | 4 | X-Frame | Weighted Pull-Up | Back + Rear Delt / Lower / Shoulders + Arms / Back Width + Abs |
| Figure | 5 | X-Frame | Weighted Pull-Up | Pull / Legs / Delts + Arms / Pull / Lower (Glute-Ham) |
| Figure | 6 | X-Frame | Weighted Pull-Up | Pull / Push (Delt) / Legs / Pull / Delts + Arms / Lower |
| Women's Physique | 3 | V-Taper | Weighted Pull-Up | Upper (Back + Delt) / Lower (Quad + Ham + Glute) / Upper (Chest + Arm + Abs) |
| Women's Physique | 4 | V-Taper | Weighted Pull-Up | Upper (Width) / Lower / Upper (Thickness) / Lower |
| Women's Physique | 5 | V-Taper | Weighted Pull-Up | Pull / Push / Legs / Upper / Lower |
| Women's Physique | 6 | V-Taper | Weighted Pull-Up | Pull / Push / Legs / Pull / Push / Legs |
| Women's Bodybuilding | 3 | full_body | Weighted Pull-Up | Full Body A / Full Body B / Full Body C |
| Women's Bodybuilding | 4 | upper_lower | Barbell Bench Press | Upper A / Lower A / Upper B / Lower B |
| Women's Bodybuilding | 5 | balanced_ul | Barbell Front Squat | Lower A / Upper A / Lower B / Upper B / Upper C |
| Women's Bodybuilding | 6 | ppl_ab | Barbell Bench Press | Push A / Pull A / Legs A / Push B / Pull B / Legs B |
