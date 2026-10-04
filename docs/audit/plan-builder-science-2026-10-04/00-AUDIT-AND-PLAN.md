# D219: the plan builder, rebuilt on the evidence (audit and design)

Programme D219 (register entry D219 and its additions, `docs/ux-world-class-audit-2026-07-09/DECISIONS-2026-07-09.md`). Lead synthesis of three read-only lanes: `01-CODE-MAP-PLAN.md` (R1, how a plan is built and every path that changes its sets, with probes in `probes-R1/`), `03-SCIENCE.md` (S, the evidence, graded A to D, formulas F0 to F16, 125 sources read back from PubMed) and `02-CODE-MAP-RECOVERY.md` (R2, the recovery model, next-session readiness and the Recovery screen). Section numbers in brackets point into those reports, for example [R1 6.4] or [S Q3b]. Nothing here is built yet: this is the plan the founder approves or changes.

Bounds held throughout: the engine stays deterministic and pure (no AI, no randomness, no I/O in engine modules); nothing touches the ED-safety system, consent, billing or identity; D204 holds (screens describe, never tell anyone to train more or less); no new dependency; no cloud migration is needed by the design as drafted (section 9).

---

## 0. The founder's requirements, as rulings to build against

| # | Requirement (register D219, verbatim there) | What it means for the design |
|---|---|---|
| R1 | Plans balance recovery and the volume each muscle needs; the next session finds its muscles recovered; no fixed days, so the next day should be as close to ready as possible | Spacing is the design variable: a fixed rotation scored for back-to-back days, a typical week and an even week, with the wrap from the last session to the first (section 4.6) |
| R2 | A maximum number of sets per exercise, grounded in science; "6 sets in an exercise as we progress" must not happen | A per-exercise cap that holds at every point in a plan's life, not only when it is built (sections 4.3, 4.9 to 4.11) |
| R3 | A check-in "+3" is spread across exercises, with a new exercise when needed | A placement rule (water-filling) with a preview the person confirms (section 4.10) |
| R4 | Structure and order change by days available and weak-area focus | A structure search by days and roles, not fixed templates (sections 4.4, 4.5) |
| R5 | Recovery shows "tomorrow is chest and arms, and they will be recovered" | The Recovery screen leads with the plan's next session and each of its muscles (section 5) |
| R6 | Serious formulas; every plan optimal for growth and recovery, no junk | One explicit objective (expected growth from the dose-response curve) under explicit constraints, every number graded (sections 3, 4.2) |
| R7 | Recovery learning adjusts the plan as it learns; the person sees the intelligence | The learned factor moves spacing and the per-session cap at block boundaries; every plan fact is shown with its reason (sections 4.13, 6) |
| R8 | The order is optimal from the start; no surface recommends another session or a reorder | Recommendation sites removed; the next workout is the plan's own next session (section 7) |
| R9 | Standard exercises every gym has, that people recognise | A curated standard catalogue, first and second choice per muscle; no alphabetical bias (section 4.7) |
| R10 | Swaps: one-off or permanent; the new exercise keeps the same sets and reps | A scope choice on every swap; the slot's prescription carries over (section 4.12) |
| R11 | Focus volume (27 biceps sets) is shown as within its focus range and why, never "overtrained" | One band function and wording table, aware of the plan's role for the muscle, on every surface that judges sets (section 5.3) |
| R12 | Biceps recover quicker than back, for example | Per-muscle recovery clocks, stated as estimates with a band, because the evidence for differences between muscles is weak (section 4.13) |

---

## 1. What is wrong today (audit, evidence in R1 and R2)

### 1.1 Sets per exercise: the cap only holds on the day the plan is built

* The 4 compound / 3 isolation caps (D8, `planEngine.js:1445-1450`) are enforced only at generation, where a "relax" rule can still give one exercise 5 sets [R1 4.1].
* Every later path is uncapped [R1 6.2]. Since FQ-4 the logger serves `round(recommended_sets x weekPlanned / week1Planned)` per exercise (`coachApply.js:335-351`), so the week-to-week ramp multiplies every exercise. In a typical 4-day plan: Barbell Bench Press 3, 4, 5, 6, 7 sets across weeks 1 to 5; Ab Rollout 3 to 12; B-Stance Hip Thrust 3 to 11; with weak points on, one hip thrust reaches 14 sets in week 5 and glutes 56 a week [R1 6.4, probes 2 and 8].
* The ramp's baseline is the template's week-1 row from the raw research table (`database.js:5399`), not the routine's own weekly total, so any gap between the generator's base and the template's MEV is multiplied (abs 6 against 4, glutes 6 against 4) [R1 headline 3].
* The session "+1" (COMP-015) has no per-exercise cap and gates on one exercise's sets, not the muscle's weekly total [R1 6.3].
* Manual edits accept any two-digit number with no nudge except in the manual builder [R1 6.1].

### 1.2 Check-ins: "+N" lands everywhere, for one week, on whatever is there

* The signal (+3, +2, +1, 0, -2 from `autoregulationMatrix`, `weeklyCoach.js:401-419`) is applied to every muscle row for the next week only, including muscles with no exercise in the plan, then each exercise is scaled proportionally with half-up rounding (a +3 on chest served +4) [R1 6.3, probe 2b].
* The following week returns to the template value: an applied +3 on week 3 (10 to 13) is followed by a planned 12 [R1 6.3 step 4].
* No exercise is ever added and nothing is redistributed; the founder's goal 3 is not implemented [R1 10.1].

### 1.3 Exercise choice: the alphabet decides

* The selection score adds each exercise's position in the alphabetical library list (`planEngine.js:1685`, `idx`, 1 point per position) against 2 points per canonicality tier (`:1671`). With the same 918 rows, the shipped order picks 11 staples out of 22; reversed it picks 4; tier first it picks 21 [R1 3.4, probe 10].
* So plans carry B-Stance Hip Thrust, B-Stance Romanian Deadlift, Donkey Calf Raise (and its Machine form), Bayesian Curl, Ab Rollout and Ab Wheel (Kneeling) in one plan, Cable Face Pull and Cable Face Pull (Rope) in one plan [R1 3.4]. Over 63 plans, 56% of picks are COMMON-tier and 0.7% SPECIALIST [probe 9].
* The pinned test that should catch this (`campaign16.canonicality.test.js:144-148`, staples over 60%) feeds corpus order, not the shipped `ORDER BY name ASC`; in shipped order its own cases score 41 to 50% [R1 3.4, STOP-2].
* "Standard and available in every gym" has no data field; `full_gym` admits suspension trainers, sleds, sandbags and landmines [R1 STOP-3].

### 1.4 Structure and order

* Weekly dose is set by landmarks, not by days: the 4-day and 6-day plans carry identical weekly sets [R1 2.4]. At 2 days, chest, biceps, triceps, glutes and abs sit at 3 direct sets a week, below the code's own maintenance floor [R1 2.4].
* Session order is optimised once at build (`planEngine.js:3548`) against an assumed Monday-to-Friday gap layout, at the opening week's dose and RIR 3, and never re-scored, while the model's own recovery times roughly double by the heavy weeks (chest 38 to 75 h, glutes 46 to 112 h) [R1 5.2, probe 13]. Adjacency is scored linearly with no wrap from the last session to the first [S Q6, `sequenceSessions.js:334-345`].
* Inside a session there is no compound-first pass; calves can come before the chest presses [R1 5.2].
* At runtime four sites recommend or allow another next session (`recommendNextWorkout`, the Home override and "Keep", the change-workout sheet, the Recovery screen's still-to-do rows) and the home-screen widget names `routines[0]` [R1 5.4; R2].

### 1.5 Weak points, roles and the learned recovery speed

* Weak points act only in the generator, and for goal `general` only in phase `weak_point`; outside it the plan text still promises extra sets that are not there [R1 7, probe 7c].
* Nothing after generation knows a muscle is a focus: check-ins add the same N to every muscle; the Volume heatmap and the tracker call anything above MRV "Too much", which is how 27 weekly biceps sets read as a fault [S Q3b; R2].
* The learned personal recovery speed reaches display only; no plan decision reads it [R1 11.1; R2].

### 1.6 Swaps

* The plain in-workout swap has no "just this workout or from now on" choice; the permanent route is a separate screen [R1 12.1].
* An in-workout swap loses the week's scaling, because the weekly allocation is keyed by exercise id and the new id falls back to the unscaled base [R1 12.2]; it takes the new exercise's own rep band.
* Swap candidates are not filtered by muscle, so a swap can move a slot's weekly sets to another muscle with no word about it (Leg Extension to Abduction Machine serves glutes 4, 7, 9, 12, 14) [R1 12.3, probe 5].

### 1.7 Explanations

* "Why this plan" is static text, partly untrue (weak points, progression), and the one recovery-order sentence is stored and never shown [R1 11.2, STOP-9]. Nothing explains why this order, why a set count is what it is, or what the learned recovery speed did (nothing) [R1 11.2].

---

## 2. What the evidence says, in one page (from S, grades A to D)

| Question | Answer | Grade |
|---|---|---|
| Sets per exercise | No trial isolates a ceiling at 3 or 4 sets of one exercise; 4 to 6 sets were not significantly better than 2 to 3 (Krieger 2010). The founder's 4 / 3 caps are a sound convention: rep loss and recovery cost rise with every set near failure, and the same sets on a complementary exercise reach regions the first under-loads | A (no ceiling found), B (variation), CONV (the cap) |
| Per muscle per session | About 8 direct or 11 fractional sets; beyond that returns fall and data thin out | A (preprint, Remmert 2025); D (RP 8 to 12) |
| Per muscle per week | Minimum effective dose 4 fractional sets; diminishing returns with no plateau found up to 42: about 6 extra sets per further detectable gain at 5 to 10, 8.5 at 11 to 18, 10.75 at 19 to 29, 12.5 at 30 to 42 | A (Pelland, Sports Med 2026) |
| Counting | A synergist set counts half; best supported of the three methods tested | A |
| Frequency | At equal weekly volume it does not meaningfully change growth; it is forced only by the per-session ceiling | A |
| Recovery | No validated per-muscle table; dose, closeness to failure, exercise type, novelty and training status move recovery by 1.5 to 3 times; measured anchors run shorter than the app's clocks for legs (quads about 30 to 45 h at an ordinary dose against the app's 72 h) | B anchors, D centres |
| "Biceps recover quicker than back" | A reasonable default (practitioner consensus), unmeasured for the lats and upper back; the measured comparisons between other muscles disagree | D |
| Order inside a session | Does not change growth; favours the strength and volume of whatever comes first, so the focus muscle goes first | A |
| Split type | None beats another at equal volume; choose by the per-session ceiling, spacing and time | A |
| Fixed rotation, unknown spacing | Score it cyclically (wrap included) against several spacings; push/pull/legs is order-insensitive; alternating upper/lower beats any order that puts two upper days together by about 8 times; full body on every session cannot be made safe on back-to-back days | INF (S probe, not literature) |
| Weak-point focus | Raise the lagging muscle into the upper productive tier (about 20 to 24 a week, never planned above 30) by adding an exposure and a complementary exercise, ramp 2 to 3 sets a week, train it first; others at or above maintenance (4 to 6) | A (tiers), B (maintenance, ramp), A (order) |
| Progression | +2 and +3 weekly sets per muscle per week are the tested steps; individualising to 1.2 times logged volume beat a fixed dose in one trial | B |
| 27 weekly biceps sets | Inside a defensible focus range (20 to 30); a set count cannot diagnose overtraining; what the evidence does not support is the shape (27 in one session, or 13.5 in each of two) | A, D (Meeusen 2013) |
| Individual differences | Real and large, partly noise; a learned recovery rate should move the spacing clock and the per-session cap at block boundaries, never weekly volume | B, CONV |
| Standard exercises | Trial evidence for the best standard choice exists for quads, hamstrings, triceps, biceps, calves, upper chest, glutes, adductors and side delts; none for lats or upper back, rear delts, traps, abs, forearms, neck, tibialis (choose by action and availability) | B / D |

Two numbers in circulation are excluded: both Barbalho papers that claimed an "upper threshold" are retracted [S 0.2].

---

## 3. The objective: what "optimal" means, in one formula

A plan is optimal when, under its constraints, it buys the most expected growth for the training the person can do. The evidence gives the shape of the return on volume (Pelland 2026, square-root form [S Q3]):

```
growth(m)        = 1.68 x sqrt(W(m))            % over a block; W = weekly fractional sets of muscle m       [INF from A]
marginal(m)      = p(m) x 0.84 / sqrt(W(m))     the value of muscle m's next set                              [INF from A]
p(m)             = role weight: focus 1.5, standard 1.0 (division priorities map onto it); maintenance muscles are held at their floor
objective        = maximise  sum over m of p(m) x growth(m)
```

subject to, in this order of seniority:

| # | Constraint | Value | Basis |
|---|---|---|---|
| K1 | Per-exercise cap | 4 sets (compound or machine compound), 3 (isolation) | Founder D8; CONV consistent with A/B [S Q1, F1] |
| K2 | Per-muscle, per-session cap | 8 direct and 11 fractional sets | A preprint (Remmert); D (RP 8 to 12) [S Q2, F2] |
| K3 | Weekly role band | maintenance 4 (2 to 6); standard up to 20; focus or raised up to 24; never planned above 30 | A tiers; CONV for the stops [S Q3b, F3] |
| K4 | Recovery spacing | rotation penalty within tolerance of the best order, back-to-back safety rules | INF from B/D [S Q6, F7, F8] |
| K5 | Time and session ceilings | the person's session length; 8 exercises and 25 working sets a session (D45) | D45 |
| K6 | Standard exercises only | the curated catalogue (section 4.7) | Founder R9 |
| K7 | Floors | every trained muscle at or above maintenance; first exercise of a muscle in a session at least 3 sets, later ones at least 2 | B/D [S Q8, F1] |

Because every set costs about the same and the return is concave, the plan is solved by placing one set at a time where `marginal(m)` per minute of session time is highest, until a constraint stops it. For a separable concave objective with unit items and box constraints this greedy order is optimal; with slightly unequal minutes per set it is the standard near-optimal rule (INF). It is deterministic: ties break by role, then muscle order, then the catalogue order.

What this gives the person, in plain words: every set in the plan sits where the research says it adds the most, until their session length, their recovery or a set limit stops it. Nothing goes past a limit. That is the sense in which no set is "junk".

---

## 4. The design, piece by piece

### 4.1 Units and counting [S F0]

* A working set ends within about 3 reps of failure; warm-ups never count.
* Direct set = 1.0 for the muscle the exercise is built for; synergist set = 0.5 (the tracker's existing `allocateExerciseVolume`, now also the planner's unit). Weekly W(m) and every band are in these fractional units everywhere: plan, check-in, heatmap, Recovery, summary.
* The planner accounts for indirect credit when it decides direct sets: biceps already get about half a set from every row and pulldown, triceps and front delts from every press, glutes and adductors from squats and leg presses (section 4.9).

### 4.2 Roles and weekly targets [S F3, F10, F11]

Every muscle in a plan has a role, decided when the plan is built and shown to the person:

| Role | Who gets it | Peak weekly target (fractional) | Weekly climb |
|---|---|---|---|
| Focus | up to 3 muscles the person picked to bring up (any goal, any phase; fixes R1 7) | 22 (20 to 24) | +2 a week (+3 allowed), never above 30 |
| Standard | every other muscle the goal trains for growth | the largest value up to 20 that the constraints allow (beginner up to 14, intermediate 18, advanced 20) | +2 a week |
| Maintenance | muscles the goal holds (a division's de-emphasised muscles; front delts, forearms, adductors when only trained indirectly) | 4 to 6, flat | none |
| Raised | a standard muscle that check-ins have lifted above 20 | up to 24 | +2 or +3 a week |

* Week 1 of a first block starts at `max(floor, peak - 8)`; the climb reaches the peak in week 5; week 6 (the recovery week) sits at `max(maintenance, round(0.5 x peak))`, load kept [S F11, F15]. The 6-week block, its RIR ladder and its recovery week stay (they are coaching structure the evidence is neutral on).
* Blocks after the first keep the existing ledger seeding (`blockLedgerGather.js`, `blockSeed.js`: start and peak per muscle from the last block's strain class), clamped to the role bands. That machinery is already evidence-shaped (start from what the person actually did, Scarpelli 2022 [B]).
* Dropped, because the evidence does not support them as volume levers [S Q10 rows 17, 18]: the systemic ceiling of 0.40 x the sum of MRVs, the recovery-answer and age multipliers on MEV and MRV (the recovery answer moves the recovery clock instead, section 4.13), and the one-pass weak-point bonus that closes 70% of the gap to MRV (replaced by the focus role's climb, [S Q10 row 16]). The nutrition-phase reduction for an aggressive cut is kept (peak minus 2), as a convention.
* The landmark tables stop judging anything (section 5.3). `VOLUME_LANDMARKS` remains only where code still needs a legacy field, and every surface reads the one band function instead [S STOP-2, Q10 rows 15 and 27].

### 4.3 Caps that hold everywhere [S F1, F2; founder D8]

| Cap | Value | Where it now holds |
|---|---|---|
| Sets per exercise | 4 compound or machine compound, 3 isolation | generation, every week of the block, check-in placement, the session +1, swaps; a manual edit above it gets the calm D8 nudge and is never blocked |
| Floor per exercise | 3 for a muscle's first exercise in a session, 2 for its second or third | everywhere |
| Exercises per muscle per session | at most 3 for chest, back and quads; 2 for side delts, rear delts, biceps, triceps, glutes, calves, abs; 1 for hamstrings, front delts, traps (hamstrings get their second exercise in another session) | generation and check-in placement |
| Sets per muscle per session | 8 direct and 11 fractional; a focus muscle may reach 10 and 12 only when the rotation cannot give it another session | everywhere |
| Session ceilings | 8 exercises, 25 working sets (D45), and the person's session length | unchanged |

The thin-equipment relaxation (one exercise may take up to 2 extra sets when no other standard exercise exists for the muscle with the person's equipment) stays, and is now shown ("Only one exercise for calves fits your equipment, so it carries 5 sets.").

### 4.4 How many sessions a week each muscle gets [S F4]

```
k(m) = clamp( ceil( D_peak(m) / C_dir(m) ), 1, N )      D_peak = the muscle's direct sets at the block's peak week
C_dir(m) = max(6, floor(8 x min(1, 1 / f_person)))       the per-session cap, lower for a slower-recovering person (section 4.13)
prefer k >= 2 when W_peak >= 12 and N >= 4                [CONV: spreads load; Ochi 2018]
```

Frequency is the smallest number that keeps every session under its cap; it is never raised for its own sake, because at equal weekly volume frequency does not change growth [A] and extra sessions only shorten the spacing.

### 4.5 The structure of the week, by days and focus [S Q6, F8]

The structure is chosen by search, not by a fixed template:

1. Candidate families for N sessions: 2 = full body A and B (each muscle heavy once and light once) or upper and lower; 3 = push, pull, legs, or full body with rotating emphasis, or upper, lower, full; 4 = upper and lower twice, push, pull, legs, upper, or push, pull, legs, arms and shoulders; 5 = push, pull, legs, upper, lower, or upper and lower twice plus a full or focus day, or a body-part week; 6 = push, pull, legs twice, or upper and lower three times.
2. For each family, place each muscle's k(m) sessions on the sessions allowed to train it, spaced as evenly as the cycle allows (gaps of floor(N/k) or ceil(N/k) slots, counting the wrap). Longest-clock muscles first (quads, hamstrings, glutes, then chest and back). Where a muscle cannot be back-to-back safe at its k (the table in [S Q6c]), the session after the shorter gap is its lighter exposure (2 to 4 direct sets) and the other its heavy one (6 to 8).
3. Solve the volumes (sections 3 and 4.9) and the order (section 4.6) for that family.
4. Choose: feasible first (caps, floors, time); then rotation penalty within 0.05 of the best family's; then the highest objective; then the most recognisable structure; then the authored order.
5. A focus muscle gets an extra session when its target needs one, its exercises first in each of its sessions, and the longest gap after its heavy session.

The six physique divisions keep their hand-authored session lists (division intent is senior, Campaign 16); the order, the caps, the volumes and the exercise choice inside them follow this design. A remembered structure from three completed blocks (`programmeStructureMemory.js`) is a candidate family like the others, not an override.

### 4.6 The order of the rotation: fixed, and good whatever the spacing [S F7]

The order is decided once, when the plan is built (and again at each block boundary), and never suggested otherwise afterwards (R8). It minimises:

```
exposures of m: sessions with 2 or more direct sets, or 6 or more fractional sets, of m (lighter indirect work does not constrain the order)
for each exposure i of m and the next exposure j in CYCLIC order (wrap included), d = slots from i to j
hours H_sigma(i, d) = sum of the gaps g_sigma over those d slots, minus 1 h for the session itself
spacings sigma: back to back (24 h a slot), the typical week for N (TYPICAL_WEEK_GAP_HOURS), an even week (168 / N),
                and, once the person has logged 8 or more sessions in the last 8 weeks, their own median gaps
shortfall_sigma = max(0, 1 - H_sigma / T(i, m))          T = the recovery clock for that exposure at the block's PEAK week dose and lowest RIR (section 4.13)
penalty = sum over m and its exposures of w x ( a_B2B x shortfall_B2B^2 + a_TYP x shortfall_TYP^2 + a_EVEN x shortfall_EVEN^2 + a_OWN x shortfall_OWN^2 )
w = clamp(F(j, m) / 6, 0.25, 2), the size of the next exposure
weights a: 0.5 / 0.35 / 0.15 / 0 by default; with the person's own gaps 0.25 / 0.15 / 0.10 / 0.5          [CONV]
search: every cyclic order (N is at most 6, so at most 120 with the first session fixed); ties keep the authored order
```

What changes from today [R1 5.2; S Q6]: the wrap is scored; back-to-back days are scored; the heavy weeks are scored, not the opening week; the person's own rhythm counts once it is known; and the learned recovery speed scales T. The S probe shows the ranking of orders is robust to a 25% error in every clock [S Q6d].

### 4.7 Standard exercises only [S Q12, F13; founder R9]

A curated catalogue replaces ranking by list position. For each muscle and role it names standard, recognisable exercises in order, with the equipment variant used when the person has that kit:

| Muscle | First choice (role) | Second choice (role) | Third, only when a session needs it |
|---|---|---|---|
| Chest | Flat press: barbell bench press, dumbbell bench press, machine chest press | Incline press: incline dumbbell press, incline barbell bench press, incline machine press | Cable fly or pec deck |
| Back | Vertical pull: lat pulldown, pull-up, chin-up | Horizontal row: seated cable row, chest-supported row, barbell row, dumbbell row | the other variant of either |
| Side delts | Dumbbell lateral raise | Cable lateral raise or machine lateral raise | |
| Rear delts | Reverse pec deck | Face pull or bent-over dumbbell reverse fly | |
| Front delts | (credited from presses) | Overhead press: barbell, dumbbell or machine shoulder press | |
| Traps | Dumbbell or barbell shrug | | |
| Biceps | Preacher curl: EZ-bar, dumbbell or machine | Barbell, dumbbell or cable curl | Hammer curl |
| Triceps | Overhead triceps extension: cable or dumbbell | Triceps pushdown: rope or bar | Close-grip bench press |
| Quads | Squat: barbell back squat, hack squat, leg press (deep range) | Leg extension | the other squat variant |
| Hamstrings | Seated leg curl (lying leg curl where there is no seated machine) | Romanian deadlift: barbell or dumbbell (a different session) | |
| Glutes | (credited from squats and leg presses) | Barbell hip thrust or hip thrust machine | Walking lunge or Bulgarian split squat |
| Calves | Standing calf raise (full stretch) | Seated calf raise | Leg press calf raise |
| Abs | Cable crunch or machine crunch | Hanging knee or leg raise (captain's chair) | |
| Adductors | (credited from squats and leg presses) | Hip adduction machine | |
| Forearms, neck, tibialis | off unless the person adds them: wrist curl, neck machine, tibialis raise | | |

Rules: only catalogue exercises are chosen automatically, and every catalogue name must resolve to a STAPLE row of the corpus (a test pins it); among equivalent variants the person's own logged exercise wins (familiar work recovers faster, the repeated-bout effect [S Q5]), then the lengthened-position variant [S Q12], then equipment order (barbell, dumbbell, machine, cable); the library's alphabetical position is never a term. The exercise list is fixed for the block [S F8]. Rebuild continuity stays: an exercise the person chose themselves keeps its slot. The full library stays one tap away in every swap.

### 4.8 The order inside a session [S F9; A: order does not change growth, it favours what comes first]

Sort key: (1) the focus muscle's exercises first; (2) multi-joint before single-joint; (3) heavier free-weight compounds before machine compounds; (4) the session's muscles in their priority order; (5) a muscle's first choice before its second.

### 4.9 Every week's sets come from one function (replaces the FQ-4 multiplier)

`prescribe(plan, week)` is a pure function that turns the week's per-muscle targets into sets per exercise. The logger, the plan screens, the check-in preview and the share image all read it, so the person sees one number everywhere (today the plan screens show stored rows the logger never serves [R1 6.1]).

```
1. order muscles providers first (back, chest, quads, hamstrings), then dependents (biceps, triceps, front and rear delts, glutes, adductors, traps)
2. for each muscle m:  D(m) = max(direct floor, W_week(m) - I(m))      I(m) = 0.5 x the providers' sets already placed that credit m
3. share D(m) across m's sessions by the slot weights fixed at build (the slots' peak-week sets; heavy and light exposures keep their ratio),
   never above the per-session caps
4. inside a session, start every exercise of m at its floor (3, then 2) and add one set at a time to the exercise with the most room under its cap,
   first choice first on a tie, never above the cap
5. anything that does not fit is a shortfall: it is never forced onto an exercise; it is reported (and a check-in can place it, section 4.10)
```

Because the structure is built for the block's peak, every week up to the peak fits inside the caps by construction; the first week starts at the floors. An existing plan's stored set counts serve as its slot weights, so the caps and the redistribution apply to plans people already follow (section 8).

### 4.10 Check-ins: the step for next week, placed set by set [S F12; founder R3]

Today the coach's number is added to whatever the template says next week, for one week, on every muscle (section 1.2). [INF from the same mechanism, R1 6.3: a "hold" writes nothing, so the template's climb continues; a "pull back 2" on top of a +2 template step leaves the week flat.] The new rule makes the words true:

| Check-in signal (unchanged in `weeklyCoach.js`) | Next week's step for a muscle that can take it | Then |
|---|---|---|
| +3 or +2 (recovery and performance strong, or one excellent) | +3 sets (the largest tested weekly step [S Q9]) | the new level carries forward; later weeks climb +2 to the block's peak, or to 24 as "raised" when the step took it past a standard peak |
| +1 (both good) | +2, the planned climb | as planned |
| no check-in, not applied, or withheld by the coordination rule | +2, the planned climb | as planned |
| hold (0) | 0 | the level holds |
| pull back (-2) | -2, not below maintenance | the level carries forward |

Muscles at their role's top, maintenance muscles, muscles with no exercise in the plan, and muscles held by a capability limit or a soreness flag (`coachApplySafety.js`) are not raised.

Placement of a raise, for each muscle, in this order [S F12]:
1. sessions that train the muscle, longest gap after the session first, then fewest sets; add one set at a time to the exercise with the most room under its cap, up to the session cap;
2. if a session still has room under the muscle's session cap but no exercise has room: add the catalogue's next exercise for a role the muscle does not cover yet, with at least 2 sets, then balance so no two of the muscle's exercises in that session differ by more than 1 set;
3. otherwise place what fits and say what did not ("1 set for back could not be placed without going over a limit"); a new session is only ever added at a block boundary.

The card shows the result before the person confirms (D96 FQ-4 confirm-then-apply stays): "Chest, 3 more sets next week: bench press 3 to 4, incline dumbbell press 3 to 4, and cable fly joins with 2 sets." Applying writes the per-muscle rows for the rest of the block and any new exercise row; nothing changes if the person does not apply.

### 4.11 The session's own +1 and the readiness easing

The COMP-015 +1 now goes to the muscle's exercise with the most room under its cap, only while the muscle's session total is under its cap and the week's total under the role's top, and its gate reads the muscle's weekly planned total, not one exercise's sets [R1 6.3]. The readiness easing (downward only) is unchanged.

### 4.12 Swaps: one-off or permanent, same sets and reps [founder R10]

* Every swap asks once: "Just this workout" or "In my plan from now on". The second writes the routine row (the plan-level swap path that exists today) and the rest of the session.
* The new exercise takes the slot's prescription: this week's sets, the rep range and the effort target, and rest. The weekly prescription is keyed by the slot, not the exercise id, so a swapped exercise keeps the week's sets (fixes [R1 12.2]).
* The suggested weight comes from the new exercise's own history only, or the existing zero-history start; never the old exercise's number.
* The sheet lists exercises for the same muscle first. Choosing one that trains a different muscle says what it moves, before it is confirmed: "This moves this slot's sets from quads to glutes for the rest of the plan." (for a permanent swap) and the planner re-solves the week (fixes [R1 12.3]).
* The swapped-in exercise is checked against the caps like any other.


### 4.13 The recovery model, corrected where the evidence says so [S F5, F6, Q10; R2 1]

The model stays what it is (a per-muscle, linear-decay estimate of recovery of function, pure and deterministic, R2 1.2). Changes, each with its basis:

| Piece | Today [R2 1.2] | Proposed | Basis |
|---|---|---|---|
| Effort factor | RIR 0 or 1: 1.15, RIR 2: 1.00, RIR 3+: 0.90 | RIR 0: 1.25, RIR 1: 1.10, RIR 2: 1.00, RIR 3+: 0.80 | today's 10 to 15% spread is far narrower than the measured failure versus non-failure gap (24 to 48 h on a 48 to 72 h clock) [S Q10 row 3; A/B] |
| First-week factor | 1.10 for week 1 of every block, familiar exercises included | novelty factor 1.15 for the first two sessions after a new exercise for that muscle, or after 3 or more weeks without the muscle; else 1.0 | the protection is the repeated-bout effect, which is exercise-specific and lasts weeks to months [S Q10 row 4; C/D] |
| Long-length exercises | none | 1.10 for an exercise built around a long muscle length (overhead triceps extension, seated leg curl, Romanian deadlift, deep squat, full-stretch calf raise, preacher curl) | more damage and later recovery at long length [S Q5; B/C]; the catalogue prefers these exercises for growth, so the clock carries their cost |
| Mostly indirect work | counted like direct | 0.85 when more than half of the muscle's credit in the session is synergist credit | rows left the elbow flexors recovered by 24 h [S Q5, Soares 2015; B] |
| Base clocks | quads, hamstrings, glutes 72; chest, back, adductors 60; arms, delts, traps 48; calves, abs and the small muscles 36 | unchanged in their order (small before large, the founder's R12 and practitioner consensus), and the lower body re-centred to quads and glutes 54 h and hamstrings 60 h, if the founder chooses it (question Q3) | the one trained-lifter anchor implies 30 to 45 h for quads at an ordinary session, and the 72 h base counts Goulart's failure dose twice [S Q5b Table 2, Q10 row 7]; differences between muscles are weak evidence, so every clock is shown as an estimate with a range |
| The range | none shown | every clock carries a band of plus or minus 25% (shown as "about 2 to 3 days") | no study gives the spread in trained lifters [S Q5; CONV] |
| One meaning of "recovered" | screens 0.895 T, sequencer the full T, spacing sentence "about N hours" [R2 STOP-9] | everywhere: at least 90% of the fatigue from the muscle's last session cleared, the screens' existing definition; the planner scores against the same point | one word, one meaning |
| When a session is ready | its limiting (least recovered) muscle's ready time, pinned [R2 2.5, STOP-11] | the LATEST ready time of the muscles it trains, so "every muscle in Upper B is estimated recovered by 07:00 tomorrow" is true | probe: calves ready in 28 h while quads need 61 h |

The person's speed:

* The learned factor (D210, one whole-body factor, 0.75 to 1.40) feeds the plan at a build, a rebuild and every block boundary, never mid-block: it scales every clock in the order search and the readiness check (section 4.14) and lowers the per-session cap for a slower recoverer (`C_dir = max(6, floor(8 x min(1, 1 / factor)))`); it never changes weekly volume, calories, weight, food or notifications [S F14, Q11b]. It acts only when the learner's own gate has passed and the factor has moved at least 0.10 from the value the current plan was built on; it reverts when the evidence fades [S Q11c]. This supersedes D210's "rejected: personalising plan sequencing" by the founder's addition (R7) [R2 STOP-1].
* Reach: for people following a plan the learner almost never learns today (0 of 60 in its own simulation for every fixed schedule and every plan user), because it compares only sessions with the same effort target on the same weekday and a plan's effort target changes every week [R2 8.1]. Question Q4 asks the founder whether to let it compare the same exercise across plan weeks, adjusting each comparison for the planned difference in effort, and to ship that only if the existing safety simulation shows no more false "faster" or "slower" findings than today.
* The check-in path (`weeklyCoach.js`, `coachApply.js`) stays isolated from `src/lib/recovery/` (`edIsolation.guard.test.js`) [R2 STOP-6]: the planner writes each muscle's recovery-safe weekly maximum into the plan's per-muscle rows (the existing `mrv` field) when it builds, and the check-in reads that number, not the model.

### 4.14 The readiness check: the next session finds its muscles recovered [founder R1]

The design's promise, stated so it can be tested:

> At the person's usual spacing (their own median gaps once they have logged 8 sessions, otherwise the typical week for their number of days), every session in every week of the block, the heaviest weeks included, starts with every muscle it trains estimated recovered. On back-to-back days the plan is as close to that as its structure allows, and says how close.

How the planner keeps it, at build time and at every block boundary:

1. Simulate the block with the model (section 4.13): each week's prescription (section 4.9), its effort target, the spacing, the person's factor.
2. For each session, check every muscle it trains (2 or more direct sets) at the session's start.
3. If a muscle is not estimated recovered, in this order: re-order the rotation (4.6); split that muscle's sets into a heavier and a lighter session (4.5 step 2); give it one more session a week if the rotation allows (4.4); and only then lower its peak by the smallest number of sets that passes, and say so: "Legs: 16 sets a week at the peak, not 18, so they are estimated recovered for each leg session in your usual week."
4. Write each muscle's recovery-safe weekly maximum into its per-muscle rows, so a check-in can never raise it past that point.

Today, at the typical spacing, a 4-day plan starts 4 of 4 sessions recovered in week 1, 2 in week 3 and 1 in week 5 [R2 7.2]; the check makes that 4, 4 and 4, by structure first and by volume only as a last resort.

The effort ladder: today the block's effort target runs RIR 3, 2, 1, 0, 0, then the recovery week [R1 1.2]. Training to failure did not grow muscle more than stopping a rep or two short (Refalo 2023 [A]) and costs much more recovery (Vieira 2022 [A]). Ruling proposed: the heavy weeks stop at RIR 1 (ladder 3, 2, 2, 1, 1, then the recovery week at 4). The weekly effort target is shown as it is today.

---

## 5. The Recovery screen and every surface that judges sets [founder R5, R11, R12]

### 5.1 "Next in your plan" (top of the Recovery screen)

One card, always the plan's own next session (R8), built from functions that exist today but are never shown (`projectRecovery`, per-muscle `readyAtMs`) [R2 2.3]:

```
Next in your plan: Upper B
Chest, back, biceps and triceps.
Every muscle in it is estimated recovered by 07:00 tomorrow.

  Chest      estimated recovered by 07:00 tomorrow   (about 2 to 3 days after Monday's session)
  Back       estimated recovered now
  Biceps     estimated recovered now                 Focus: you picked biceps to bring up.
  Triceps    estimated recovered by 21:00 today

Your plan keeps at least 47 hours between sessions that train chest, even on consecutive days.
```

* The session line uses the latest muscle's ready time (4.13); each muscle line its own; times are readiness forecasts, never a statement that the person trains then (the no-scheduled-days ruling and Home's absence guard stay) [R2 STOP-4, STOP-5].
* A muscle with no session in the last 14 days says "No recent session on biceps." (RC-5: no evidence is never called ready) [R2 5 item 2].
* When the plan week is complete, the card names next week's first session ("Next in your plan, when the plan week turns on Monday: Upper A"), which needs the position authority to answer for the next week [R2 STOP-10].
* Tapping a muscle opens its detail (5.3): role, this week's sets and how they are counted, the band and its reason, most in one session, the spacing, the estimate and its range.
* Every line obeys D204 (describes, never instructs; the forbidden-words regex stays), the "estimated" law, the colour law (no amber, warning, success or error tokens) and plain English [R2 5].

### 5.2 Removed from the Recovery screen

The swap reason ("Lower A is next in your plan ... Upper B is estimated ready now."), and the readiness on the "Still to do this plan week" rows: the rows stay as the plan's list (done, next, later) with no readiness and no ranking (R8; founder question Q2 covers the Home sheet).

### 5.3 One band function and one wording table, on every surface that judges a muscle's weekly sets [S Q3b, F16; R2 10]

* `volumeBand(W, role)` in fractional weekly sets: under 2 below maintenance; 2 to 6 maintenance; 6 to 10 between; 10 to 20 normal growth; 20 to 30 focus range; 30 to 42 top of the studied range; over 42 beyond the studied range. Per session: a flag above 8 direct or 11 fractional sets.
* The wording is the S table [S Q3b], aware of the role: a focus muscle at 27 reads "Within your focus range for biceps (20 to 30): you picked it to bring up. Studies have found small extra gains at weekly totals like this. Your plan targets 22 a week." A standard muscle at 24 reads "Above the normal growth range: this is focus-level volume for a muscle that is not a focus in your plan." Nothing reads "Too much", "Near the limit", "overtrained" or "junk", and no band below "beyond the studied range" carries a warning colour.
* It replaces `getVolumeStatus` on the Volume heatmap (rows, groups, figure, legend), the Progress strip, the workout summary's "This week's volume", the check-in review, the heatmap's row explanation, and the manual builder (which nudges on the per-exercise and per-session caps instead of "Biceps volume is very high") [R2 10.1 rows 1 to 5, 8].
* The plan layer of the resolved landmarks stops setting `mav` to the plan's static week-1 total (which makes a plan followed to the letter read "Near the limit" on 12 of 13 muscles from week 2 [R2 10.2]); every surface reads this week's planned target and the role band instead.
* The deload check's over-MRV pass reads the same bands and the role: a focus muscle inside its focus range is never counted as "more sets than it can usually recover from" [R2 10.1 row 7].
* Roles are stored with the plan when it is built (focus, standard, maintenance; "raised" is read from the rows); the build lane confirms where (an existing field, or a local, additive column; anything synced to the cloud waits for the founder's phrase) [R2 10.3].

---

## 6. Showing the intelligence: every plan fact with its reason [founder R7]

Today "Why this plan" is static text, partly untrue, and the one recovery-order sentence is never shown [R1 11.2, STOP-9]. The new explanations are computed from the plan itself (`src/lib/plan/explain.js`, pure), so each line is true of this person's plan, and each states a fact and its reason without telling anyone what to do (D204).

| Where | What it says (examples; real numbers come from the plan) |
|---|---|
| Plan reveal and "Why this plan" | "4 sessions a week, alternating upper and lower. Every muscle gets at least 47 hours between its sessions, even if you train on consecutive days." / "Glutes are your focus: 14 sets a week now, climbing to 22 by week 5, trained first on both lower days." / "No exercise goes above 4 sets. Past that, research finds the same sets do more on a second exercise for the muscle." / "Sessions run about 55 minutes now and about 62 by week 5, inside your 65 minutes." |
| Each exercise in the plan | the reason it is there, from the catalogue: "Seated leg curl: trains the hamstrings at a long length. In a 12-week study it grew them more than lying leg curls." / "Incline dumbbell press: covers the upper chest, which flat pressing reaches less." / for a person's own pick: "You chose this." |
| Each muscle on the plan screen | role, this week's sets with how they are counted, the band, and the climb: "Biceps: 12 sets this week (6 direct, 12 rows and pulldowns at half credit). Normal growth range. Climbing to 16." |
| The check-in card | where every added set goes, set by set (section 4.10), and what could not be placed |
| The order | "Your sessions are ordered so the legs are trained 2 sessions apart: at least 47 hours on consecutive days, about 72 hours in a usual week." |
| What the app learned | "Your lifts held up after shorter breaks than the first estimate. From the next block, recovery estimates are about 15% shorter, so your plan keeps its order but the Recovery screen reads ready sooner." (only when the learner's gate passes; otherwise "Not learning yet: too few comparisons of the same lift.") [S Q11d] |
| A research line on request | a one-line source behind each rule, on tap, e.g. "Pelland and colleagues, 2026: a review of 67 studies of weekly sets and growth." (lead ruling, section 13) |

Rules for every line: a fact from the plan or the log, or an estimate labelled as one; British English, no em dash, no "junk", "too much" or "overtrained"; no instruction (D204); never a claim about weight, food or the body (the ED-safety lane is out of bounds).

---

## 7. No surface recommends another session [founder R8]

Removed, with their tests re-pinned [R1 5.4; R2 9]: the swap rule and its reason (`nextWorkoutRecommendation.js:302-341`, `:218-230`); Home's recovery override, the "Keep" control and its stored flag, the hero line's swap branch; the change-workout sheet's per-row recovery verdicts; the Recovery screen's swap sentence and the readiness on its still-to-do rows. Fixed: the home-screen widget names the plan's next session, not the first routine; Home's Start and Plans' "Start next workout" always open the same session. Kept: Skip; the person's own permanent reorder in plan detail (it re-runs the readiness check and says what it changes); a plain choice of another session (founder question Q2). D201 F1 and its copy rulings are retired by the founder's clarification and recorded so.

---
## 8. Plans people already follow

Three paths, the founder's choice (question Q1):

* The caps and the redistribution (section 4.9), the capped session +1 (4.11), the check-in steps and placement (4.10), the swap scope (4.12) and the bands (5.3) are serve-time and apply to every plan the day they ship, with no plan change stored: an existing plan's stored set counts become its slot weights, so no exercise ever goes past its cap again and the extra sets move to the muscle's other exercises in the same week.
* The new structure, order and standard exercises (sections 4.4 to 4.8) need a rebuild. The keep-block rebuild exists (D140, `activatePlanKeepingBlock`), keeps the person's week in the block, and keeps every exercise the person chose themselves.
* Whatever is chosen, the person sees a one-time note of what changed and why, built from section 6.

---

## 9. Data and storage

* No new table and no cloud migration in the design as drafted: the weekly per-muscle rows (`planned_muscle_volume`) carry the targets; routine exercise rows carry the slot weights and any exercise a check-in adds; roles are derived from the goal, the division and the person's chosen weak points, which are already stored; the person's gap history is read from logged workouts.
* The build lanes must confirm this with the code; any column that turns out to be needed is a local, additive, idempotent migration under the schema rules, and anything in the cloud waits for the founder's phrase.

---

## 10. Locked rules this changes, and the rulings proposed

| Rule | Today | Proposed ruling | Why |
|---|---|---|---|
| D8 caps 4 / 3, "existing plans untouched" | generation only | the caps hold everywhere, existing plans included (subject to Q1) | founder R2; the cap that only holds on day one is the cause of the 6 to 14 set exercises |
| D96 FQ-4 serve-time scaling, "no per-entry cap" | proportional multiplier | `prescribe()` with caps and redistribution; confirm-then-apply kept | R2, R3 |
| D201 F1 "recommend, never silently switch" and its copy rulings | Home and Recovery recommend another session | retired by the founder's clarification (R8) | founder 2026-10-04 |
| D201 sequencer locks (no wrap, typical-week gaps, opening-week dose) | | superseded by section 4.6 | fixed order, free days |
| D45 session ceilings | 8 exercises, 25 sets | kept | |
| Campaign 16 laws (staples first, roles, continuity, no supersets, time as a constraint, division intent senior) | | kept; "staples first" becomes the curated catalogue; the index term goes | R9 |
| The 8-set session cap "Brigatto/Nippard" comment | wrong basis | re-cited to Remmert 2025 (preprint) and RP | [S Q10 row 11] |
| `getVolumeStatus` "Too much" above MRV | | retired for the role-aware bands | R11 |
| `00-SPEC.md` "twice a week beats once" | | superseded (Schoenfeld 2019, Pelland 2026) | [S Q10 row 21] |
| D204 | | kept, and binding on every new line | |

---
## 11. How it is built: phases, lanes and the tests that prove it

Agents at the lowest tier that can do each job to standard (D185); the lead builds the engine spine and reviews every diff; each phase closes with a fresh-eyes Opus review against this document, a full gate, harness renders for every screen touched, and a device checklist in chat. Nothing ships to a phone without the founder's build.

| Phase | Lane | Work | Who |
|---|---|---|---|
| A, for every plan the day it ships | A1 | `src/lib/plan/science.js` (every number in this document with its grade and source), `bands.js` (5.3), `prescribe.js` (4.9), with property tests | lead |
| | A2 | the logger, the plan screens, the share image and the session +1 read `prescribe()`; the manual edit nudge | Sonnet |
| | A3 | check-in steps, placement, preview card and the rows it writes (4.10), inside the ED isolation | lead (engine), Sonnet (card) |
| | A4 | swaps: the scope choice, the slot's prescription carried, same-muscle first, the note when a swap moves a slot's sets (4.12) | Sonnet |
| | A5 | the band function on every judging surface, the plan-layer fix, the deload pass (5.3) | Sonnet |
| | A6 | the recommendation sites removed, the widget and Start fixed (7) | Sonnet |
| B, every new or rebuilt plan | B1 | the standard catalogue and the ranking without the list position, the canonicality tests re-pinned on the shipped order (4.7) | Sonnet, catalogue ruled by the lead |
| | B2 | roles and targets, the allocator, exposures, the structure search, the rotation order, the order inside a session, the readiness check, the effort ladder (3, 4.2 to 4.8, 4.14) | lead |
| | B3 | the recovery model changes, the latest-ready session time, the learned factor into the planner, the learner's reach if Q4 says so (4.13) | lead |
| | B4 | the Recovery screen's "Next in your plan" card and the muscle detail, the next week's first session (5.1, 5.2) | Sonnet |
| | B5 | explanations computed from the plan (6) | Sonnet |
| C | C1 | existing plans, by the founder's answer to Q1, with the one-time "what changed" note (8) | lead and Sonnet |

The tests that make "optimal" checkable, over a matrix of 2 to 6 days, every goal and division, three experience levels, the equipment profiles, no focus, one and three focus muscles, and 45 to 90 minute sessions:

1. No exercise above its cap, and no muscle above its session cap, in any week, after any check-in, after any swap.
2. Every weekly target inside its role band; nothing planned above 30.
3. The readiness promise (4.14) at the usual spacing, every session of every week; the back-to-back shortfall reported, never hidden.
4. The chosen order has the lowest rotation penalty of every cyclic order (exhaustive check).
5. Only catalogue exercises, each a STAPLE corpus row; the same inputs in any library order give the same plan.
6. One number everywhere: what the logger serves equals what the plan screen, the check-in preview and the share image show.
7. Determinism and purity of every engine module; the ED isolation guard and the D204 regex stay green.
8. Each new behaviour has a test that fails on today's code.

---

## 12. Questions for the founder

Asked in chat as structured choices; everything else in this document is a lead ruling under D33, recorded in the register with its reason.

* Q1. Plans people already follow: rebuild every current plan with the new planner at the person's next session, keeping their week in the block and every exercise they chose themselves, with a note of what changed and why; or apply the set limits and redistribution now and the full new structure at each person's next block, with a "Rebuild now" option; or new plans only.
* Q2. The Home "change workout" option: keep a plain choice of another session from the plan list, with no suggestions and no readiness badges; or remove it, so only the plan's next session can be started (Skip stays).
* Q3. The legs' recovery clocks: re-centre them on the best measurement (quads and glutes about 54 hours, hamstrings about 60, at an ordinary session, each with its range), or keep today's cautious 72 hours.
* Q4. Learning for people on a plan: let the recovery learning compare the same exercise across plan weeks, adjusted for the planned difference in effort, and ship it only if the safety simulation finds no more false results than today; or keep the learning as it is (it rarely learns for people following a plan).

---

## 13. Rulings this document asks the register to record (lead, D33, each with its reason above)

Caps everywhere (4.3); `prescribe()` replaces the FQ-4 multiplier, confirm-then-apply kept (4.9); the check-in steps and placement (4.10); roles and targets, and the volume multipliers dropped (4.2); exposures, the structure search and the rotation score (4.4 to 4.6); the standard catalogue (4.7); the order inside a session (4.8); the capped session +1 (4.11); swaps (4.12); the recovery model changes, one meaning of "recovered" and the latest-ready session time (4.13); the learned factor into the plan at block boundaries, superseding D210's rejection (4.13); the readiness check and the recovery-safe maximum (4.14); the effort ladder 3, 2, 2, 1, 1 then the recovery week (4.14); the band function and its wording, "Too much" retired (5.3); the Recovery screen's next-session card (5.1); recommendation sites removed, D201 F1 retired (7); explanations computed from the plan, a one-line research source on tap (6); the focus session cap of 10 direct and 12 fractional only when no extra session is possible (4.3).
