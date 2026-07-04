# Content-Quality Audit — Plan Builder (training programmes Volyume *generates*)

**Date:** 2026-07-04 · **Scope:** the deterministic plan-generation engine
(`planEngine.js` + `poolGenerator.js` + `planAutoGen.js` + `mesocycle.js` +
`coachingGoals.js`) and the Pro onboarding flow that feeds it
(`ProOnboardingScreen.js`). **Method:** real generated outputs, not code
reading. **Constraint:** read-only on `src/`; every fix below is *documented,
not applied*.

## How the outputs were generated

`generatePlan(inputs)` is a pure, side-effect-free function. With no
`exerciseLibrary` passed it selects from its built-in `POOL` (the same names
the SQLite library resolves against), so it can be driven directly with zero
DB. I ran it via a throwaway Jest harness
(`scratchpad/gen.test.js`, config `scratchpad/jconf.js`) against 10 profiles
and dumped the full plan verbatim (`scratchpad/plans.txt`). The engine model
splits the task's three axes as: **`goal`** = physique division (default
`general`); **`phase`** = training emphasis (`lean_gain`/`bulk` =
hypertrophy, `strength_size` = strength, `cut` = fat-loss); **`nutritionPhase`**
= calorie tuning. Mapping used:
hypertrophy→`lean_gain`, strength→`strength_size`, fat-loss→`cut`.

Determinism confirmed: repeated runs are byte-identical; no `Math.random` in
the engine.

---

## 1. Real generated examples (verbatim)

Format per line: `Exercise: sets x repMin-repMax  rest Ns  RIR n  [SS:group]  // note`.
`VOLUME SUMMARY` is direct weekly sets per muscle (indirect in parentheses).

### P1 — Beginner / Hypertrophy / 3 days / full gym
```
NAME: Build Muscle · Lean Gain · Full Body 3×/week   SPLIT: full_body
Full Body A (~62min, 16 sets)
  Lat Pulldown (Wide Grip): 4 x 8-12  rest 150s  RIR 3
  Barbell Row (Bent Over):  3 x 5-9   rest 180s  RIR 3
  Standing Calf Raise:      3 x 10-20 rest 75s   RIR 3
  Barbell Bench Press:      3 x 5-9   rest 180s  RIR 3
  JM Press:                 3 x 8-12  rest 150s  RIR 3
Full Body B (~58min, 16 sets)
  Barbell Back Squat:       5 x 5-9   rest 180s  RIR 3
  Romanian Deadlift (BB):   4 x 5-9   rest 180s  RIR 3
  Face Pull:                4 x 10-20 rest 75s   RIR 3
  Cable Crunch:             3 x 10-20 rest 75s   RIR 3
Full Body C (~41min, 13 sets)
  Cable Lateral Raise:      5 x 10-20 rest 75s   RIR 3
  Barbell Hip Thrust:       4 x 8-12  rest 150s  RIR 3
  Incline Dumbbell Curl:    4 x 10-20 rest 75s   RIR 3
WEEKLY: 45 sets | chest=3 back=7 shoulders=9 biceps=4 triceps=3 quads=5 hamstrings=4 glutes=4 calves=3 abs=3 traps=0
```

### P3 — Intermediate / Strength / 4 days / full gym
```
NAME: Strength + Size Upper-Lower 4×/week   SPLIT: upper_lower
Upper A (~64min, 18 sets)
  Barbell Bench Press:      3 x 4-6  rest 210s  RIR 2  // Add weight when you complete the top of the rep range for 2 consecutive sessions
  Lat Pulldown (Wide Grip): 3 x 5-8  rest 180s  RIR 2  // (same note)
  Cable Lateral Raise:      3 x 10-15 rest 75s  RIR 2  [SS:sg_2_0]
  Face Pull:                3 x 10-15 rest 75s  RIR 2  [SS:sg_2_0]
  Incline Dumbbell Curl:    3 x 10-15 rest 75s  RIR 2
  JM Press:                 3 x 5-8  rest 180s  RIR 2
Lower A (~62min, 16 sets)
  Barbell Front Squat:      4 x 4-6  rest 210s  RIR 2
  Romanian Deadlift (BB):   3 x 4-6  rest 210s  RIR 2
  Barbell Hip Thrust:       3 x 5-8  rest 180s  RIR 2
  Standing Calf Raise:      3 x 10-15 rest 75s  RIR 2  [SS:sg_3_0]
  Cable Crunch:             3 x 10-15 rest 75s  RIR 2  [SS:sg_3_0]
Upper B / Lower B mirror A with variation (Incline BB Bench, Barbell Row, Back Squat, Leg Curl…)
WEEKLY: 68 sets | chest=6 back=6 shoulders=12 biceps=6 triceps=6 quads=8 hamstrings=6 glutes=6 calves=6 abs=6
```
Strength axis is expressed correctly: heavy compounds drop to **4-6 reps /
210 s rest**, a progression note is attached, and supersets are kept off the
heavy compounds (only accessories paired).

### P4 — Intermediate / Hypertrophy / 4 days / full gym
```
NAME: Build Muscle · Lean Gain · Upper-Lower 4×/week   SPLIT: upper_lower
Same skeleton as P3 but hypertrophy params: Bench 3x5-9 rest 180, accessories 10-20 reps.
WEEKLY: 69 sets | chest=6 back=6 shoulders=12 biceps=6 triceps=6 quads=8 hamstrings=6 glutes=6 calves=7 abs=6
```

### P5 — Intermediate / Fat-loss / 5 days / full gym
```
NAME: Build Muscle · Cut · PPL 5×/week   SPLIT: ppl   (RIR 3 across the board — deficit autoregulation)
Legs (~80min, 22 sets): Front Squat 4x5-9, Back Squat 3x5-9, RDL 3x5-9, Leg Curl 3, Hip Thrust 3, Calf 3[SS], Cable Crunch 3[SS]
  NOTE: "Around 80 min, longer than your 60 min target. That is normal for the volume this session needs; split it…"
WEEKLY: 70 sets | chest=6 back=10 shoulders=14 biceps=6 triceps=6 quads=7 hamstrings=6 glutes=3 calves=3 abs=3 traps=6
```
Cut correctly bumps RIR to 3 (further from failure to protect muscle in a
deficit — Helms). But note **legs trained once/week** and **glutes=3, calves=3,
abs=3** (below MEV) — see §2.

### P6 — Advanced / Hypertrophy / 5 days / full gym
```
NAME: Build Muscle · Lean Gain · PPL 5×/week   (RIR 1 — advanced)
WEEKLY: 82 sets | chest=8 back=12 shoulders=18 biceps=8 triceps=8 quads=7 hamstrings=6 glutes=3 calves=3 abs=3 traps=6
```
Advanced correctly lifts volume (82 vs beginner 45) and RIR to 1.

### P8 — Advanced / Hypertrophy / 4 days / **dumbbells only**
```
NAME: Build Muscle · Lean Gain · Upper-Lower 4×/week
Upper A: Incline DB Press, DB Row, Chest-Supported DB Row, DB Lateral Raise[SS], DB Rear Delt Fly[SS], Incline DB Curl[SS], OH DB Ext[SS]
Lower A: Bulgarian Split Squat 5x8-12, RDL(DB) 4, DB Hip Thrust 3, DB Calf 3[SS], Decline Crunch 3[SS]
Lower B: Goblet Squat, Single-Leg RDL, DB Step-Up, Single-Leg Calf, Plank
WEEKLY: 78 sets | chest=8 back=10 shoulders=12 quads=10 hamstrings=8 glutes=6 …
```
**Zero barbell movements** — equipment filter is clean, and it still finds
enough dumbbell variety to hit 78 weekly sets with sensible unilateral leg
work.

### P9 — Advanced / **Bikini** division / 5 days / full gym
```
NAME: Bikini · Lean Gain · Glute Focus 5×/week   SPLIT: Glute Focus
Glutes (Max): Barbell Hip Thrust 4, Abductor Machine 4, RDL 4, Lying Leg Curl 4
Glutes (Medius+Ham): DB Hip Thrust 4, Cable Hip Abduction 4, Stiff-Leg DL 4, Seated Leg Curl 4
WEEKLY: 88 sets | glutes=22 hamstrings=16 shoulders=22 quads=7 back=6 chest=3 biceps=3 triceps=3 …
```
No barbell squat/bench (division pool rule); glute volume driven to **22**
across activator+pumper+hinge patterns.

### P10 — Advanced / **Men's Physique** division / 5 days / full gym
```
NAME: Men's Physique · Lean Gain · V-Taper 5×/week   SPLIT: V-Taper
Opens on Pull (Width): Lat Pulldown, Barbell Row, Face Pull[SS], Curl[SS]
WEEKLY: 82 sets | shoulders=23 back=16 biceps=9 triceps=7 chest=6 quads=3 hamstrings=6 glutes=3 …
```
Shoulders/back width prioritised to 23/16; legs held near maintenance.

*(Full verbatim for all 10, including P2 beginner-dumbbell and P7
advanced-strength, in `scratchpad/plans.txt`.)*

---

## 2. Science benchmark & per-dimension verdict

Benchmarks used:
- **Dose-response volume** — Schoenfeld/Ogborn/Krieger 2017: ~0.37 %
  hypertrophy per weekly set; **10+ sets/muscle/week** best, **5-9** the
  minimum-effective band. ([meta-analysis review, PMC8884877](https://pmc.ncbi.nlm.nih.gov/articles/PMC8884877/); [Schoenfeld 2017 dose-response, Semantic Scholar](https://www.semanticscholar.org/paper/Dose-response-relationship-between-weekly-training-Schoenfeld-Ogborn/0d34206f962394983054451cddd8a3b91818f732))
- **Frequency** — Schoenfeld/Grgic 2016 & 2018: **≥2×/week per muscle**
  superior to 1× at matched volume. ([PubMed 30558493](https://pubmed.ncbi.nlm.nih.gov/30558493/); [Frontiers 2018 frequency/strength](https://pmc.ncbi.nlm.nih.gov/articles/PMC6036131/))
- **MEV→MAV→MRV & start-low-ramp** — RP / Israetel volume landmarks: begin a
  block near MEV, add 1-2 sets/muscle/week toward MRV, then deload. ([RP volume landmarks overview, Arvo](https://arvo.guru/resources/methods/rp-training))

| Dimension | Verdict | Evidence in the outputs |
|---|---|---|
| **Exercise selection** | **Principled** | Compound-first ordering; required sub-region coverage (back = vertical pull + horizontal row, hams = hinge + curl); beginner difficulty gate strips advanced lifts and assisted-machine crutches are removed for intermediate+; SFR tiebreak for hypertrophy vs barbell bias for strength; division pool rules (Bikini drops heavy squat/bench, keeps lateral raises). No repetition within a session (dedup + anti-same-subregion). |
| **Compound:isolation ratio** | **Good** | Each day leads with 1-2 heavy compounds then accessories; strength phase keeps compounds on full rest and off supersets. |
| **Weekly volume vs landmarks** | **Mostly principled, one systematic shortfall** | Division/advanced plans land in the evidence-based band (P6 back 12, P9 glutes 22, P10 shoulders 23). **But** the 4-day upper/lower at the **default 60-min** session (P3, P4) trims **back and chest to 6 direct sets** — below the engine's own intermediate MEV of 10 (back). Cause: 6 muscles share a 58-min budget, `trimToTimeBudget` floors every entry to 3 sets. Fat-loss/hypertrophy 5-day PPL squeezes **glutes/calves/abs to 3** (below MEV 4). These are the low end of, or below, the 5-9 minimum band. |
| **Progression (week-to-week)** | **Sound model, over-stated copy** | Real progression = `mesocycle.js` ramp: standard 1.00→1.10→1.20→1.25→**0.50 deload** (5 wk); advanced adds a week (6 wk), MRV-capped, plus double-progression within the rep range and autoregulated set changes from session feedback. This matches RP start-low-ramp-deload. **However** the user-facing "Why this plan?" text claims you "add roughly **one set per exercise per week**" — a ~15-exercise plan would mean +15 sets/wk, whereas the real ramp is ~+1-1.5 sets *per muscle* per week. Copy overstates the prescription. |
| **Split structure** | **Coherent, one frequency weakness** | 3d→full body (3× freq), 4d→upper/lower (2×), 5d→PPL or division matrix. All muscles ≥2× except the **general/hypertrophy & cut 5-day PPL, where legs train only 1×/week** — below the ≥2× frequency benchmark, and it produces an 80-min leg day the engine itself flags as over-long. Division matrices (Bikini/Men's Physique/etc.) are genuinely bespoke and open on the judged lead muscle. |
| **Safety guardrails** | **Strong** | Combined delt cap 26, per-muscle MRV clamp, systemic recovery-scaled ceiling, beginner day-cap (4), poor-recovery + 5-day warnings, cut RIR bump. All tier-blind. |

**Net:** the generated programmes are *good and defensibly evidence-based*, not
arbitrary. The two real content weaknesses are both **volume shortfalls caused
by the time-budget trimmer** (60-min upper/lower compounds; 5-day-PPL legs
frequency) — algorithmic, so held for founder (§5).

---

## 3. Onboarding → output differentiation

**Finding: inputs genuinely drive differentiated output — strongly. YES.**

`ProOnboardingScreen` collects sex, age, height, weight, body-fat (+method),
**experience, session length, days/week, equipment, training phase, physique
division, up to 3 weak points, protein approach, recovery rating**. Every one
of the training fields is threaded into `generatePlan` via
`generateAndSavePlan` → `buildPlanInputs` (verified: `experience`,
`daysPerWeek`, `sessionLengthMinutes`, `equipment`, `goal`, `phase`,
`weakPoints`, `recoveryRating`, `nutritionPhase`, `age` all consumed). No input
is collected-then-ignored on the training side.

### Side-by-side proof (two very different real profiles)

| | **P9 — Advanced ♀ Bikini, 5d, full gym** | **P10 — Advanced Men's Physique, 5d, full gym** |
|---|---|---|
| Split | **Glute Focus** (5 bespoke days) | **V-Taper** (opens Pull-Width) |
| Day 1 lead lift | **Barbell Hip Thrust** | **Lat Pulldown / Barbell Row** |
| Glutes | **22 sets** | 3 sets |
| Hamstrings | **16** | 6 |
| Shoulders | 22 | **23** |
| Back | 6 | **16** |
| Quads | 7 | 3 |
| Chest | 3 | 6 |
| Excluded lifts | heavy squat & bench (pool rule) | heavy squat (quads deny heavy_compound) |

Same experience, days and equipment — only the **division** differs — and the
output is nearly unrecognisable between the two. Experience alone also moves
output hard (P1 beginner 45 wk-sets / RIR 3 / no advanced lifts vs P6 advanced
82 wk-sets / RIR 1). Phase changes rep ranges and rest (P3 strength 4-6/210s vs
P4 hypertrophy 5-9/180s). Equipment swaps the entire lift roster (P8 dumbbells:
zero barbells). **This is the opposite of a funnel** — onboarding is a real
control surface, not cosmetic.

Minor note: `daysPerWeek` for a beginner is silently clamped to ≤4 (surfaced
as a plan warning), and out-of-range day counts clamp to 3-6 — both correct,
both disclosed.

---

## 4. SAFE FIXES (clear copy/consistency issues — ready to apply, no algorithm change)

Ranked. Each is copy/consistency only; none alters exercise-selection, volume
or progression *math*, so none changes a deterministic plan.

1. **`buildWhyThis` progression copy overstates the ramp.**
   `src/lib/planEngine.js` ~L1878.
   - Before: `…add roughly one set per exercise per week across the first ${weeks - 1} weeks.`
   - After (matches the real `mesocycle.js` ramp): `…add roughly one to two sets per muscle group per week across the first ${weeks - 1} weeks.`
   - Why: the engine's actual per-week increase is a +7-10 % total-volume
     multiplier (~1-1.5 sets/muscle), not one set on *every* exercise. Current
     copy promises far more added volume than the plan delivers.

2. **`estimatedSessionMinutes` copy vs reality for the 60-min default.** No code
   change proposed here — flagged only so the fix-pass knows the "~62 min"
   durations on nominally-60-min plans (P1, P3, P4) are the honest estimate and
   should *not* be "corrected" by tightening the trimmer (that would worsen the
   MEV shortfall in §5-A). Documented to prevent a well-meaning but harmful edit.

> Only **one** substantive safe fix (#1). The audit deliberately did **not**
> invent cosmetic fixes: the remaining findings are genuine engine behaviour
> and belong in §5, not dressed up as "bugs".

---

## 5. ENGINE DECISIONS — HOLD for founder (would change deterministic selection/volume/progression)

Do **not** apply silently. Each changes the coaching math; present as a founder
decision.

### A. 60-min upper/lower trims compound volume below MEV
- **Evidence:** P3/P4 (intermediate, 4-day, 60-min) deliver **back = 6, chest =
  6** direct sets/week. The engine's own intermediate MEV is back 10 / chest 6.
  Cause: `trimToTimeBudget` (`planEngine.js` L771-818) floors every entry to 3
  sets to fit a 58-min budget shared across 6 upper-body muscles, so week-1
  starts *below* MEV for the two biggest muscles — contradicting the RP
  "start at MEV" design the block otherwise follows.
- **Options to put to founder (not pre-decided):** (i) raise upper/lower default
  toward 2 leads at ≥4 sets by capping muscles-per-session and pushing overflow
  to the paired day; (ii) let the trimmer protect a per-muscle MEV floor for
  structural movers before shaving them to 3; (iii) nudge the onboarding default
  session length to 75 min for 4-day upper/lower; (iv) accept as-is (time honesty
  over MEV). Each changes generated volume, so it is the founder's call.

### B. General/hypertrophy & cut 5-day split trains legs only 1×/week
- **Evidence:** P5, P6, P7 route `general` 5-day → PPL, so legs get **one**
  22-set / ~80-min session (engine self-flags it as over-long), and
  glutes/calves/abs fall to 3 sets. Frequency 1× is below the ≥2×/week
  benchmark (Schoenfeld 2016/2018).
- **Options:** (i) route 5-day general to an upper/lower/full or PPL-with-second-
  half-leg-accessory so legs hit 2×; (ii) keep PPL but seed leg accessories into
  a pull/push day; (iii) accept the classic 5-day-PPL trade-off. Changes
  `selectSplit` structure → founder decision.

### C. Physique-division de-emphasised structural muscles fall below their own maintenance floor
- **Evidence:** P10 Men's Physique **quads = 3** delivered, though
  `STRUCTURAL_MUSCLES` sets a maintenance floor of 6 at ≥4 days. The weekly
  *target* is floored, but delivery falls short because only one quad exercise is
  placed in the single legs day and the time-trim then shaves it. "Maintenance,
  not zero" is met; "maintenance = 6" is not.
- **Options:** (i) guarantee ≥2 exercises for a floored structural muscle before
  trimming; (ii) lower the documented floor to match delivery; (iii) accept.
  Touches placement + floor logic → founder decision.

### D. Beginner full-body push/pull imbalance
- **Evidence:** P1 delivers **back = 7 but chest = 3** (below chest MEV ~4), from
  the rotating-frequency + systemic-cap math on a 3-day full body. A beginner's
  first plan reading 2:1 pull:push is not ideal.
- **Options:** (i) balance antagonist volume on full-body days; (ii) accept as
  within-range (both are ≥ a beginner minimum). Changes distribution math →
  founder decision.

---

### Appendix — reproduction
`scratchpad/gen.test.js` + `scratchpad/jconf.js`; run:
`npx jest --config scratchpad/jconf.js --silent=false`. Full dump:
`scratchpad/plans.txt`. Engine entry: `generatePlan` (`src/lib/planEngine.js`
L2063). No `src/` file was modified.
