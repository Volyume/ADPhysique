# D219: the plan builder, rebuilt on the evidence (audit and design)

Programme D219 (register entry D219 and its additions, `docs/ux-world-class-audit-2026-07-09/DECISIONS-2026-07-09.md`). Lead synthesis of three read-only lanes: `01-CODE-MAP-PLAN.md` (R1, how a plan is built and every path that changes its sets, with probes in `probes-R1/`), `03-SCIENCE.md` (S, the evidence, graded A to D, formulas F0 to F16, 125 sources read back from PubMed) and `02-CODE-MAP-RECOVERY.md` (R2, the recovery model, next-session readiness and the Recovery screen). Section numbers in brackets point into those reports, for example [R1 6.4] or [S Q3b]. Nothing here is built yet: this is the plan the founder approves or changes. Revision 2 (2026-10-04) folds in a fresh-eyes Opus review of revision 1 (two blockers, twelve should-fix items, nits; every finding re-checked by the lead against the code and the sources before it was taken); section 14 lists each finding and what changed.

Bounds held throughout: the engine stays deterministic and pure (no AI, no randomness, no I/O in engine modules); nothing touches the ED-safety system, consent, billing or identity; D204 holds (screens describe, never tell anyone to train more or less); no new dependency; one additive cloud migration is likely (section 9) and waits for the founder's phrase; one module the CLAUDE.md ED rule names (`coachApply.js`) would have its two volume functions changed, which is asked first (section 12, Q6), and none of its floors or ED paths change.

---

## 0. The founder's requirements, as rulings to build against

| # | Requirement (register D219, verbatim there) | What it means for the design |
|---|---|---|
| R1 | Plans balance recovery and the volume each muscle needs; the next session finds its muscles recovered; no fixed days, so the next day should be as close to ready as possible | Spacing is the design variable: a fixed rotation scored for back-to-back days, a typical week and an even week, with the wrap from the last session to the first (section 4.6) |
| R2 | A maximum number of sets per exercise, grounded in science; "6 sets in an exercise as we progress" must not happen | A per-exercise cap that holds at every point in a plan's life, not only when it is built (sections 4.3, 4.9 to 4.11) |
| R3 | A check-in "+3" is spread across exercises, with a new exercise when needed | A placement rule (water-filling) with a preview the person confirms (section 4.10) |
| R4 | Structure and order change by days available and weak-area focus | A structure search by days and roles, not fixed templates (sections 4.4, 4.5) |
| R5 | Recovery shows "tomorrow is chest and arms, and they will be recovered" | The Recovery screen leads with the plan's next session and each of its muscles (section 5). Because no days are scheduled, it names the next session and when its muscles are estimated recovered ("Next in your plan: Upper B ... estimated recovered by tomorrow morning"); it never says a session is "tomorrow" |
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
* The sessions grow with it. In that plan the logger serves 21 working sets in each upper session in week 1 and 45 in week 5, and 42 to 44 in each lower session in week 5, against D45's ceiling of 25 for a built session [R1 probe 2, d4, read by the lead]. Even at the plan's own weekly rows (the landmark table's MAV by week 5: chest 14, back 16, side and rear delts 16, biceps and triceps 14, `algorithms.js:25-59`), an upper session holds about 45 sets in week 5.
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
| Per muscle per session | About 11 fractional sets: the point beyond which more sets in one session showed no detectable extra benefit, which the authors say are "not upper limits" (Remmert 2025, preprint); 8 direct is the same authors' conversion at the trials' average indirect share, used here as a second cap by convention | A (preprint) for 11 fractional; CONV for 8 direct; D (RP 8 to 12) |
| Per muscle per week | Minimum effective dose 4 fractional sets; diminishing returns with no plateau found up to 42: about 6 extra sets per further detectable gain at 5 to 10, 8.5 at 11 to 18, 10.75 at 19 to 29, 12.5 at 30 to 42 | A (Pelland, Sports Med 2026) |
| Counting | A synergist set counts half; best supported of the three methods tested | A |
| Frequency | At equal weekly volume it does not meaningfully change growth; it is forced only by the per-session ceiling | A |
| Recovery | No validated per-muscle table; dose, closeness to failure, exercise type, novelty and training status move recovery by 1.5 to 3 times; measured anchors run shorter than the app's clocks for legs (quads about 30 to 45 h at an ordinary dose against the app's 72 h) | B anchors, D centres |
| "Biceps recover quicker than back" | A reasonable default (practitioner consensus), unmeasured for the lats and upper back; the measured comparisons between other muscles disagree | D |
| Order inside a session | Does not change growth; favours the strength and volume of whatever comes first, so the focus muscle goes first | A |
| Split type | None beats another at equal volume; choose by the per-session ceiling, spacing and time | A |
| Fixed rotation, unknown spacing | Score it cyclically (wrap included) against several spacings; push/pull/legs is order-insensitive; alternating upper/lower beats any order that puts two upper days together by about 8 times; full body on every session cannot be made safe on back-to-back days | INF (S probe, not literature) |
| Weak-point focus | Raise the lagging muscle into the upper productive tier (about 20 to 24 a week, never planned above 30) by adding an exposure and a complementary exercise, ramp 2 to 3 sets a week, train it first; others at or above maintenance (4 to 6) | A (tiers), B (maintenance, ramp), A (order) |
| Progression | Adding sets through a block is tested and not harmful: 4 or 6 sets every 2 weeks (about +2 or +3 a week) raised squat strength more than constant volume, while the growth difference was not significant (Enes 2024); individualising to 1.2 times logged volume beat a fixed dose in one small trial (Scarpelli 2022) | B |
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
| K2 | Per-muscle, per-session cap | 11 fractional sets (A, preprint: Remmert 2025's point beyond which more sets in one session showed no detectable extra benefit); 8 direct sets as a second cap for muscles trained mostly directly (CONV: Remmert's own conversion of 11 fractional at the trials' average indirect share, and the bottom of RP's 8 to 12, D) | [S Q2, F2] |
| K3 | Weekly role band | maintenance 4 (2 to 6); standard up to 20; focus or raised up to 24; never planned above 30 | A tiers; CONV for the stops [S Q3b, F3] |
| K4 | Recovery spacing | rotation penalty within tolerance of the best order, back-to-back safety rules | INF from B/D [S Q6, F7, F8] |
| K5 | Time and session ceilings | the person's session length; 8 exercises and 25 working sets a session (D45) | D45 |
| K6 | Standard exercises only | the curated catalogue (section 4.7) | Founder R9 |
| K7 | Floors | every trained muscle at or above maintenance; every exercise at least 2 sets (section 4.3) | B/D [S Q8, F1] |

The plan is solved by placing one set at a time where `marginal(m)` per SET is highest, until a constraint stops it; session time is a constraint, never part of the ranking (ranking per minute would favour cheap isolation sets, calves over quads, because a heavy compound set costs about 4 minutes and an isolation set about 2 and a quarter, `planEngine.js:956-985` with `prescription.js:72-77` [review 9]). For a separable concave objective with unit items and box constraints this greedy order is optimal (INF). No size weight between muscles is used, because the dose-response evidence does not separate muscles [S Q3]; the plan's intent enters only through the role weights. It is deterministic: ties break by role, then muscle order, then the catalogue order.

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
| Standard | every other muscle the goal trains for growth | the largest value up to 20 that the constraints allow; a first block for a beginner peaks at 14 [CONV: S Q3 says trained lifters sit further along the same curve, not on a different one, so the band is the same for everyone and only the starting point differs] | +2 a week |
| Maintenance | muscles the goal holds (a division's de-emphasised muscles; front delts, forearms, adductors when only trained indirectly) | 4 to 6, flat | none |
| Raised | a standard muscle that check-ins have lifted above 20 | up to 24 | +2 or +3 a week |

* Weekly targets are stored, as today, in DIRECT sets per muscle (`planned_muscle_volume`, the unit FQ-4 reads [review 1]); the planner works in fractional sets and converts each muscle's fractional target into a direct target at build, from the plan's own exercises (a muscle's direct target is its fractional target minus the half credit its providers' planned sets give it). Week 1 of a first block starts at `max(floor, peak - 8)`; the climb reaches the peak in week 5; week 6 (the recovery week) sits at `max(maintenance, round(0.5 x peak))`, load kept [S F11, F15]. The 6-week block and its recovery week stay (coaching structure the evidence is neutral on); its effort ladder is founder question Q5 (section 4.14).
* Blocks after the first keep the existing ledger seeding (`blockLedgerGather.js`, `blockSeed.js`: start and peak per muscle from the last block's strain class), clamped to the role bands. That machinery is already evidence-shaped (start from what the person actually did, Scarpelli 2022 [B]).
* Dropped, because the evidence does not support them as volume levers [S Q10 rows 17, 18]: the systemic ceiling of 0.40 x the sum of MRVs, the recovery-answer and age multipliers on MEV and MRV (the recovery answer moves the recovery clock instead, section 4.13), and the one-pass weak-point bonus that closes 70% of the gap to MRV (replaced by the focus role's climb, [S Q10 row 16]). The nutrition-phase reduction for an aggressive cut is kept (peak minus 2), as a convention.
* The landmark tables stop judging anything (section 5.3). `VOLUME_LANDMARKS` remains only where code still needs a legacy field, and every surface reads the one band function instead [S STOP-2, Q10 rows 15 and 27].

### 4.3 Caps that hold everywhere [S F1, F2; founder D8]

| Cap | Value | Where it now holds |
|---|---|---|
| Sets per exercise | 4 compound or machine compound, 3 isolation | generation, every week of the block, check-in placement, the session +1, swaps. A number the person types themselves above it gets the calm D8 nudge, is never blocked, and is served as typed for the rest of the block (no climb on top of it): the cap binds the planner, not the person's own choice [review 13] |
| Floor per exercise | 2 sets for every exercise (more than one set per exercise beats one, Krieger 2010 [A], and 2 to 3 are equivalent); extra sets go to a muscle's first exercise in a session first | everywhere |
| Exercises per muscle per session | at most 3 for chest, back and quads; 2 for side delts, rear delts, biceps, triceps, glutes, calves, abs; 1 for hamstrings, front delts, traps (hamstrings get their second exercise in another session) | generation and check-in placement |
| Sets per muscle per session | 8 direct and 11 fractional; a focus muscle may reach 10 and 12 only when the rotation cannot give it another session. A muscle trained by isolation work meets its exercise limit first (biceps 2 exercises x 3 sets = 6 a session), so its extra volume comes as extra sessions (section 4.4) | everywhere |
| Session ceilings | 8 exercises, 25 working sets (D45), and the person's session length | unchanged |

The thin-equipment relaxation (one exercise may take up to 2 extra sets when no other standard exercise exists for the muscle with the person's equipment) stays, and is now shown ("Only one exercise for calves fits your equipment, so it carries 5 sets.").

### 4.4 How many sessions a week each muscle gets [S F4]

```
k(m) = clamp( ceil( D_peak(m) / cap_s(m) ), 1, N )      D_peak = the muscle's direct sets at the block's peak week
cap_s(m) = min( C_dir(m), exercises allowed for m in a session x cap per exercise )
           e.g. biceps 2 x 3 = 6, hamstrings 1 x 3 or 4, chest 3 x 4 capped at 8 [review 7]
C_dir(m) = 8, or max(6, floor(8 x min(1, 1 / f_person))) for a slower-recovering person when the lower cap can be met by giving the muscle
           another session; when it cannot, the standard 8 stands, so the learned factor never removes sets (section 4.13)
prefer k >= 2 when W_peak >= 12 and N >= 4                [CONV: spreads load; Ochi 2018]
```

Frequency is the smallest number that keeps every session under its cap; it is never raised for its own sake, because at equal weekly volume frequency does not change growth [A] and extra sessions only shorten the spacing. So a focus muscle trained by isolation work (biceps, side delts) gets its extra volume as extra sessions, not as more sets in one session.

Ramp, do not jump [S Q8]: with the exercise list sized for the peak, the floors set week 1's level. If that level is more than 3 sets a week above what the person logged for the muscle over the last 4 weeks (or, with no history, more than 4 above the standard start), the planner uses fewer exercises for the muscle and accepts a lower peak, so no block opens with a jump larger than the tested weekly steps.

### 4.5 The structure of the week, by days and focus [S Q6, F8]

The structure is chosen by search, not by a fixed template:

1. Candidate families for N sessions: 2 = full body A and B (each muscle heavy once and light once) or upper and lower; 3 = push, pull, legs, or full body with rotating emphasis, or upper, lower, full; 4 = upper and lower twice, push, pull, legs, upper, or push, pull, legs, arms and shoulders; 5 = push, pull, legs, upper, lower, or upper and lower twice plus a full or focus day, or a body-part week; 6 = push, pull, legs twice, or upper and lower three times.
2. For each family, place each muscle's k(m) sessions on the sessions allowed to train it, spaced as evenly as the cycle allows (gaps of floor(N/k) or ceil(N/k) slots, counting the wrap). Longest-clock muscles first (quads, hamstrings, glutes, then chest and back). Where a muscle cannot be back-to-back safe at its k (the table in [S Q6c]), the exposure FOLLOWED by the shorter gap is its lighter one (2 to 4 direct sets) and the exposure followed by the longer gap its heavy one (6 to 8), so the heavy session always has the longer time to clear before the muscle is trained again [review 2; a probe of the model at the typical 4-day spacing reads the light session at 71% the wrong way round, 94% and 100% this way]. A test pins the direction.
3. Solve the volumes (sections 3 and 4.9) and the order (section 4.6) for that family.
4. Choose: feasible first (caps, floors, time, and every standard muscle at or above its growth floor of 10 where any family can reach it, so a family that recovers well by starving a muscle does not win); then rotation penalty within 0.05 of the best remaining family's; then the highest objective; then the most recognisable structure; then the authored order.
5. A focus muscle gets an extra session when its target needs one, its exercises first in each of its sessions, and the longest gap after its heavy session.
6. If no family is feasible (for example a 45-minute session with three focus muscles on 2 days), the planner takes the family with the smallest shortfall, keeps every cap, holds lower-priority muscles at maintenance first, and states what could not be fitted.

The six physique divisions keep their hand-authored session lists (division intent is senior, Campaign 16); the order, the caps, the volumes and the exercise choice inside them follow this design. A remembered structure from three completed blocks (`programmeStructureMemory.js`) is a candidate family like the others, not an override.

### 4.6 The order of the rotation: fixed, and good whatever the spacing [S F7]

The order is decided once, when the plan is built (and again at each block boundary), and never suggested otherwise afterwards (R8). It minimises:

```
trains m (one definition everywhere): a session with 2 or more direct sets, or 6 or more fractional sets, of m [S Q6c R4]
for each exposure i of m and the next exposure j in CYCLIC order (wrap included), d = slots from i to j
hours H_sigma(i, d) = sum of the gaps g_sigma over those d slots, minus 1 h for the session itself
spacings sigma: back to back (24 h a slot), the typical week for N (TYPICAL_WEEK_GAP_HOURS), an even week (168 / N),
                and the person's own gaps once known (below)
shortfall_sigma = max(0, 1 - H_sigma / T90(i, m))     T90 = when the model reads the muscle 90% recovered (0.895 T, the screens'
                                                      meaning of "recovered", section 4.13), at the block's PEAK week dose and lowest RIR
recovery = sum over m and its exposures of w x ( a_B2B x shortfall_B2B^2 + a_TYP x shortfall_TYP^2 + a_EVEN x shortfall_EVEN^2 + a_OWN x shortfall_OWN^2 )
w = clamp(F(j, m) / 6, 0.25, 2), the size of the next exposure
clash = today's C16 law 5 term (no two near-identical sessions next to each other), now including the wrap pair (last session to first)
penalty = recovery + clash
weights a: 0.5 / 0.35 / 0.15 / 0 by default; with the person's own gaps 0.25 / 0.15 / 0.10 / 0.5          [CONV]
own gaps: once the person has logged 8 or more sessions in the last 8 weeks, the median hours they leave after each slot of the
          rotation (a slot needs 3 logged gaps; otherwise their median gap between any two sessions stands for every slot)
search: every order, any session leading (N is at most 6, so at most 720 orders; with uneven gaps the lead matters); ties keep the authored order
```

What changes from today [R1 5.2; S Q6; `sequenceSessions.js:322-348`]: the recovery term already wraps (its circular pairs) and the clash term now wraps too (D201 lead ruling 2 kept it linear); back-to-back days, an even week and the person's own rhythm are scored beside the typical week; the heavy weeks are scored, not the opening week; any session may lead; the score uses the screens' 90% meaning of "recovered"; and the learned recovery speed scales T. The S probe shows the ranking of orders is robust to a 25% error in every clock [S Q6d].

### 4.7 Standard exercises only [S Q12, F13; founder R9]

A curated catalogue replaces ranking by list position. For each muscle and role it names standard, recognisable exercises in order, with the equipment variant used when the person has that kit:

| Muscle | First choice (role) | Second choice (role) | Third, only when a session needs it |
|---|---|---|---|
| Chest | Flat press: barbell bench press, dumbbell bench press, machine chest press | Incline press: incline dumbbell press, incline barbell bench press, incline machine press | Pec deck or cable crossover |
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
| Adductors | (credited from squats and leg presses) | Hip adduction machine, only when the person adds adductors | |
| Forearms, neck, tibialis | off unless the person adds them: wrist curl, neck machine, tibialis raise | | |

Rules: only catalogue exercises are chosen automatically, and every name the planner picks without being asked must resolve to a STAPLE row of the corpus (a test pins it). Some evidence-preferred or everyday choices sit below STAPLE today [review 8; `canonicality.js`, read by the lead], so the catalogue brings a registry change (the Campaign 16 canonicality registry; lead ruling): the preacher curls (EZ Bar Preacher Curl, Preacher Curl (Dumbbell), Preacher Curl (Barbell), Preacher Curl Machine), the overhead triceps extensions (Cable Overhead Tricep Extension, Dumbbell Overhead Tricep Extension), Machine Crunch and Walking Lunge move from COMMON to STAPLE; the chest fly uses the STAPLE rows already there (Pec Deck (Machine Fly), Cable Crossover (High to Low)). Adductors, forearms, neck and tibialis are trained directly only when the person adds them: the Hip Adduction Machine moves from SPECIALIST to COMMON (nearly every commercial gym has one), and wrist curl, neck machine and tibialis raise stay SPECIALIST, offered only then.

Between two STAPLE choices the catalogue's order decides, not the tier: the evidence-preferred exercise comes first where a trial supports it (preacher curl and overhead extension rank above barbell curl and pushdown for that reason [S Q12]), the most familiar one where none does. Among equivalent variants the person's own logged exercise wins (familiar work recovers faster, the repeated-bout effect [S Q5]), then the lengthened-position variant [S Q12], then equipment order (barbell, dumbbell, machine, cable); the library's alphabetical position is never a term. The exercise list is fixed for the block [S F8], except an exercise a check-in adds (section 4.10). Rebuild continuity stays: an exercise the person chose themselves keeps its slot. The full library stays one tap away in every swap.

### 4.8 The order inside a session [S F9; A: order does not change growth, it favours what comes first]

Sort key: (1) the focus muscle's exercises first; (2) multi-joint before single-joint; (3) heavier free-weight compounds before machine compounds; (4) the session's muscles in their priority order; (5) a muscle's first choice before its second.

### 4.9 Every week's sets come from one function (replaces the FQ-4 multiplier)

`prescribe(plan, week)` is a pure function that turns the week's per-muscle targets into sets per exercise. The logger, the plan screens, the check-in preview and the share image all read it, so the person sees one number everywhere (today the plan screens show stored rows the logger never serves [R1 6.1]).

```
1. for each muscle m: D(m) = this week's direct-set target in the plan's per-muscle rows (direct sets, as today; the indirect
   credit was accounted for when the plan was built, section 4.2, so nothing is subtracted when the week is served)
2. share D(m) across m's sessions: where m has a heavy and a light exposure (section 4.5), the light one takes its share fixed at
   build (stored with the plan, section 9) and the heavy one the rest; otherwise by the slot weights, each routine exercise's
   stored week-1 sets (`recommended_sets`, whose meaning does not change for any of the 16 files that read it); never above the
   per-session caps
3. inside a session, start every exercise of m at its floor (2) and add one set at a time to the exercise with the most room
   under its cap, first choice first on a tie, never above the cap
4. a set count the person typed themselves is served as typed and counts toward D(m) (section 4.3)
5. anything that does not fit is a shortfall: never forced onto an exercise and never dropped in silence. A plan built by this
   design has none up to its peak (its structure is sized for the peak); for a plan built before it, see section 8 (Q1)
```

Because the structure is built for the block's peak, every week up to the peak fits inside the caps by construction; the first week starts at the floors. Every reader of a week's sets reads this one function: the logger, the plan screens, the check-in preview, the share image and the rest of the 16 files that read `recommended_sets` today [review 11; counted by the lead].

### 4.10 Check-ins: the step for next week, placed set by set [S F12; founder R3]

Today the coach's number is added to whatever the template says next week, for one week, on every muscle (section 1.2). [INF from the same mechanism, R1 6.3: a "hold" writes nothing, so the template's climb continues; a "pull back 2" on top of a +2 template step leaves the week flat.] Two more things make today's words untrue [review 3, checked by the lead]: a hold cannot be applied at all (`CoachOutputScreen.js:416`: Apply needs a non-zero signal), so "Volume stays the same" is not what happens; and an increase withheld by the coordination rule reads "Training volume stays the same. Your recovery this week points to easing off rather than adding work." (`weeklyCoach.js:2106`; the rule is `coachPrecedence.js:403`, "Volume may not be ADDED ... to an athlete whose recovery evidence calls for restraint") while the planned climb still adds sets. The new rule makes the words true. Nothing changes until the person taps Apply (D96 confirm-then-apply stays), and every card says what happens if they leave it:

| Check-in signal (unchanged in `weeklyCoach.js`) | What the card proposes for next week | If the person applies it | If they leave it |
|---|---|---|---|
| +3 or +2 (recovery and performance strong, or one excellent) | +3 sets for each muscle that can take them, placed as below (the top of the steps tested: Enes 2024 added 6 sets every 2 weeks [B]) | the new level carries forward; later weeks climb +2 to the block's peak, or up to 24 as "raised" when the step took it past a standard peak | the planned climb |
| +1 (both good) | the planned climb (+2 a week to the peak) | nothing to apply: Apply is hidden and the card says "Your plan's planned climb goes ahead." | the same |
| hold (0) | next week stays at this week's level | the level holds, then the planned climb resumes from it (new: today a hold has no Apply) | the planned climb, and the card says so: "If you leave this, your plan's planned climb of 2 sets goes ahead." |
| withheld by the coordination rule (sessions missed, recovery calls for restraint, one change at a time) | the same as a hold, so the coach's "Training volume stays the same" is exactly what Apply does | as a hold | as a hold |
| pull back (-2) | 2 fewer sets, not below maintenance | the level carries forward | the planned climb |

Muscles at their role's top, maintenance muscles, muscles with no exercise in the plan, and muscles held by a capability limit or a soreness flag (`coachApplySafety.js`) are not raised.

Placement of a raise, for each muscle, in this order [S F12], by a pure module outside the recovery model (`src/lib/plan/checkinPlacement.js`, section 4.13):
1. sessions that train the muscle, longest gap after the session first (each session's gap rank is stored with the plan when it is built, section 9, so the check-in never reads the recovery model), then fewest sets; add one set at a time to the exercise with the most room under its cap, up to the session cap;
2. if a session still has room under the muscle's session cap but no exercise has room: add the catalogue's next exercise (a STAPLE row, section 4.7) for a role the muscle does not cover yet, with at least 2 sets, then balance so no two of the muscle's exercises in that session differ by more than 1 set;
3. otherwise place what fits and say what did not ("1 set for back could not be placed without going over a limit"); a new session is only ever added at a block boundary.

The card shows the result before the person confirms: "Chest, 3 more sets next week: bench press 3 to 4, incline dumbbell press 3 to 4, and pec deck joins with 2 sets." Applying writes the per-muscle rows for the rest of the block and any new exercise row; nothing changes if the person does not apply.

### 4.11 The session's own +1 and the readiness easing

The COMP-015 +1 now goes to the muscle's exercise with the most room under its cap, only while the muscle's session total is under its cap and the week's total under the role's top, and its gate reads the muscle's weekly planned total, not one exercise's sets [R1 6.3]. The readiness easing (downward only) is unchanged.

### 4.12 Swaps: one-off or permanent, same sets and reps [founder R10]

* Every swap asks once: "Just this workout" or "In my plan from now on". The second writes the routine row (the plan-level swap path that exists today) and the rest of the session.
* The new exercise takes the slot's prescription: this week's sets, the rep range and the effort target, so no load is misplaced. Rest follows the new exercise (a pushdown does not need a squat's rest; Campaign 16 job 7 keeps rest realistic). The weekly prescription is keyed by the slot, not the exercise id, so a swapped exercise keeps the week's sets (fixes [R1 12.2]).
* The suggested weight comes from the new exercise's own history only, or the existing zero-history start; never the old exercise's number (Campaign 16 job 7: "Replacement/new exercise: do NOT inherit an old exercise's starting load").
* The sheet lists exercises for the same muscle first. Choosing one that trains a different muscle says what it moves, before it is confirmed: "This moves this slot's sets from quads to glutes for the rest of the plan." (for a permanent swap) and the planner re-solves the week (fixes [R1 12.3]).
* The swapped-in exercise is checked against the caps like any other.


### 4.13 The recovery model, corrected where the evidence says so [S F5, F6, Q10; R2 1]

The model stays what it is (a per-muscle, linear-decay estimate of recovery of function, pure and deterministic, R2 1.2). Changes, each with its basis:

| Piece | Today [R2 1.2] | Proposed | Basis |
|---|---|---|---|
| Effort factor | RIR 0 or 1: 1.15, RIR 2: 1.00, RIR 3+: 0.90 | RIR 0: 1.25, RIR 1: 1.10, RIR 2: 1.00, RIR 3+: 0.80 | today's 10 to 15% spread is far narrower than the measured failure versus non-failure gap (24 to 48 h on a 48 to 72 h clock) [S Q10 row 3; the direction A/B, the numbers CONV] |
| First-week factor | 1.10 for week 1 of every block, familiar exercises included | novelty factor 1.15 for the first two sessions after a new exercise for that muscle, or after 3 or more weeks without the muscle; else 1.0 | the protection is the repeated-bout effect, which is exercise-specific and lasts weeks to months [S Q10 row 4; C/D] |
| Long-length exercises | none | 1.10 for an exercise built around a long muscle length (overhead triceps extension, seated leg curl, Romanian deadlift, deep squat, full-stretch calf raise, preacher curl) | more damage and later recovery at long length [S Q5; B/C]; the catalogue prefers these exercises for growth, so the clock carries their cost |
| Mostly indirect work | counted like direct | 0.85 when more than half of the muscle's credit in the session is synergist credit | rows left the elbow flexors recovered by 24 h [S Q5, Soares 2015; C] |
| Base clocks | quads, hamstrings, glutes 72; chest, back, adductors 60; arms, delts, traps 48; calves, abs and the small muscles 36 | unchanged in their order (small before large, the founder's R12 and practitioner consensus), and the lower body re-centred to quads and glutes 54 h and hamstrings 60 h, if the founder chooses it (question Q3) | the one trained-lifter anchor implies 30 to 45 h for quads at an ordinary session, and the 72 h base counts Goulart's failure dose twice [S Q5b Table 2, Q10 row 7]; differences between muscles are weak evidence, so every clock is shown as an estimate with a range |
| The range | none shown | every clock carries a band of plus or minus 25% (shown as "about 2 to 3 days") | no study gives the spread in trained lifters [S Q5; CONV] |
| One meaning of "recovered" | screens 0.895 T, sequencer the full T, spacing sentence "about N hours" [R2 STOP-9] | everywhere: at least 90% of the fatigue from the muscle's last session cleared, the screens' existing definition; the planner scores against the same point | one word, one meaning |
| When a session is ready | its limiting (least recovered) muscle's ready time, pinned [R2 2.5, STOP-11] | the LATEST ready time of the muscles it trains, so "every muscle in Upper B is estimated recovered by tomorrow morning" is true | probe: calves ready in 28 h while quads need 61 h |

The person's speed:

* The learned factor (D210, one whole-body factor, 0.75 to 1.40) feeds the plan at a build, a rebuild and every block boundary, never mid-block. It scales every clock in the order search, the heavy and light split and the readiness shown (section 4.14), and lowers the per-session cap for a slower recoverer only where the sets can move to another session (section 4.4). It never changes a weekly target, calories, weight, food or notifications [S F14, Q11b]: the readiness check's volume step uses the population clocks (section 4.14). It acts only when the learner's own gate has passed, the person has 12 weeks or more of history and 3 or more muscles contribute (the safeguards S F14 adds), and the factor has moved at least 0.10 from the value the current plan was built on; it reverts when the evidence fades [S Q11c]. The Recovery screen already uses the factor (`load.js:375`); this adds the plan. It supersedes D210's "rejected: personalising plan sequencing" by the founder's addition (R7) [R2 STOP-1].
* Reach: for people following a plan the learner almost never learns today (0 of 60 in its own simulation for every fixed schedule and every plan user), because it compares only sessions with the same effort target on the same weekday and a plan's effort target changes every week [R2 8.1]. Question Q4 asks the founder whether to let it compare the same exercise across plan weeks, adjusting each comparison for the planned difference in effort, and to ship that only if the existing safety simulation, re-run with the effort ladder Q5 chooses (`personalRecovery.simulation.test.js:77` uses today's), shows no more false "faster" or "slower" findings than today.
* The ED-woven modules stay isolated from `src/lib/recovery/` [R2 STOP-6]. The check-in's volume placement lives in a new pure module (`src/lib/plan/checkinPlacement.js`) that never imports the recovery model: the longest-gap order it needs is each session's stored gap rank (section 9), and the recovery-safe weekly maximum is the number the planner wrote into the rows' `mrv`. `coachApply.js`'s two volume functions (`computeVolumeApply`, `computeWeeklySessionAllocation`) would call `checkinPlacement.js` and `prescribe.js` (founder question Q6); nothing else in that file changes, and the calorie floors, the FFM floor, the rapid-loss gate, calm mode and every ED-flag path are untouched. The isolation guard (`edIsolation.guard.test.js`, direct imports only today) becomes transitive: it follows every import from the five modules, so no helper in between can bring the recovery model in.

### 4.14 The readiness check: the next session finds its muscles recovered [founder R1]

The promise, stated so it can be tested:

> At the person's usual spacing (their own gaps once known, section 4.6; otherwise the typical week for their number of days), every session in every week of the block, the heaviest weeks included, starts with every muscle it trains (section 4.6's definition) estimated recovered (at least 90%, section 4.13).

Two limits, both stated to the person and never hidden:

* On back-to-back days, and for a person whose usual spacing is back to back, the plan is as close to that as its structure allows and says how close: "On consecutive days, quads are estimated about 80% recovered at the start of Lower B."
* The check never lowers a muscle's weekly sets below its role's growth floor (standard 10, focus 20 fractional) to keep the promise. The weekly dose rests on A-graded evidence and the clocks are D-graded estimates, and training a muscle before it is fully recovered has not been shown to slow growth at modest session volumes [S STOP 5]. Where the two collide, the volume stays and the session shows its estimate: "Quads: estimated about 85% recovered at the start of Lower B in your usual week."

How the planner keeps it, at build time and at every block boundary:

1. Simulate the block with the model (section 4.13): each week's prescription (section 4.9), its effort target, the spacing, the person's factor.
2. For each session, check every muscle it trains at the session's start.
3. If a muscle is not estimated recovered, in this order: re-order the rotation (4.6); split its sets into a heavy and a light exposure (4.5 step 2); give it one more session a week if the rotation allows (4.4); and only then lower its peak by the smallest number of sets that passes, never below its role's growth floor, and say so: "Quads: 12 sets a week at the peak, not 16, so they are estimated recovered for each leg session in your usual week." This volume step uses the population clocks, never the learned factor, so what the app learns about a person never changes their weekly sets (section 4.13).
4. Write each muscle's recovery-safe weekly maximum into its per-muscle rows (`mrv`), so a check-in can never raise it past that point.

What the promise costs, from a probe of the real model with the factors proposed in section 4.13 and the heavy weeks at RIR 1 [review probe, read by the lead; a copy is in the lead's scratchpad, `d219/review/`]:

| Case | Base clocks today (quads, hamstrings, glutes 72 h) | Re-centred (quads and glutes 54 h, question Q3) |
|---|---|---|
| 4 days, upper and lower, quads 8 + 8 sets | one leg session starts at 72%; the promise holds with a 4-set light and an 8-set heavy session (94% and 100%), so about 12 quad sets a week | 94% and 100%: 16 quad sets a week hold |
| 3 days, full body, quads every session | 85 to 87% even at 2 sets a session: the promise cannot hold for the legs in this family, and the structure search weighs that against the other 3-day families (4.5) | 100% at 2 or 3 sets a session, 97% at 4 |
| 5 days, chest trained again 47 h later (chest clocks are not part of Q3) | the session before the 47 h gap can hold 3 sets (4 read 87%), so chest runs 3 light and up to 8 heavy | the same |

With today's effort ladder (RIR 0 in the heavy weeks, question Q5) the 4-day plan at 72 h reads 84% even with the light and heavy split. Today, at the typical spacing, a 4-day plan starts 4 of 4 sessions recovered in week 1, 2 in week 3 and 1 in week 5 [R2 7.2]. The check aims at 4 of 4 in every week, by structure first and by volume only down to the growth floor; test 3 proves it over the whole matrix before anything ships.

The effort ladder is founder question Q5. Today the block runs RIR 3, 2, 1, 0, 0, then the recovery week at 4 (`rir_ladder`, stored per block and synced). Taking sets to failure gave a small growth advantage when failure was defined loosely (effect size 0.19, interval 0.00 to 0.37) and none when it meant momentary failure (0.12, interval -0.13 to 0.37) (Refalo 2023 [A]); an exploratory meta-regression found growth rose as sets ended closer to failure (Robinson 2024 [A, exploratory]); failure costs markedly more recovery (Vieira 2022 [A]); and the step from RIR 1 to RIR 0 is close to the error in people's own estimates (about plus or minus 0.65 reps near failure, Refalo 2024 [B]). The proposal: heavy weeks at RIR 1 (3, 2, 2, 1, 1, then 4). It repeats an effort target in weeks 2 and 3 and in weeks 4 and 5, which gives the learner more like-for-like comparisons, so the learner simulation is re-run with it (Q4). A new ladder applies to new blocks; a running block keeps its stored one.

---

## 5. The Recovery screen and every surface that judges sets [founder R5, R11, R12]

### 5.1 "Next in your plan" (top of the Recovery screen)

One card, always the plan's own next session (R8), built from functions that exist today but are never shown (`projectRecovery`, per-muscle `readyAtMs`) [R2 2.3]:

```
Next in your plan: Upper B
Chest, back, biceps and triceps.
Every muscle in it is estimated recovered by tomorrow morning.

  Chest      estimated recovered by tomorrow morning   (about 2 to 3 days after Monday's session)
  Back       estimated recovered now
  Biceps     estimated recovered now                   Focus: you picked biceps to bring up.
  Triceps    estimated recovered by this evening

Your plan keeps at least 47 hours between sessions that train chest, even on consecutive days.
```

* The session line uses the latest muscle's ready time (4.13); each muscle line its own. Times are rounded to a part of the day (this afternoon, this evening, tomorrow morning, in about 2 days), because each estimate carries a band of about 25% and a clock time would claim more than the model knows. They are readiness forecasts, never a statement that the person trains then (the no-scheduled-days ruling and Home's absence guard stay) [R2 STOP-4, STOP-5].
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
* Roles are stored with the plan when it is built (focus, standard, maintenance; "raised" is read from the rows), in the synced home of section 9 [R2 10.3; review 11].

---

## 6. Showing the intelligence: every plan fact with its reason [founder R7]

Today "Why this plan" is static text, partly untrue, and the one recovery-order sentence is never shown [R1 11.2, STOP-9]. The new explanations are computed from the plan itself (`src/lib/plan/explain.js`, pure), so each line is true of this person's plan, and each states a fact and its reason without telling anyone what to do (D204).

| Where | What it says (examples; real numbers come from the plan) |
|---|---|
| Plan reveal and "Why this plan" | "4 sessions a week, alternating upper and lower. Every muscle gets at least 47 hours between its sessions, even if you train on consecutive days." / "Glutes are your focus: 14 sets a week now, climbing to 22 by week 5, trained first in both lower sessions." / "No exercise goes above 4 sets. Past 3 or 4 sets, each extra set of the same exercise gets fewer reps for more fatigue, and a second exercise trains parts of the muscle the first reaches less." / "Sessions run about 55 minutes now and about 62 by week 5, inside your 65 minutes." |
| Each exercise in the plan | the reason it is there, from the catalogue: "Seated leg curl: trains the hamstrings at a long length. In a 12-week study it grew them more than lying leg curls." / "Incline dumbbell press: covers the upper chest, which flat pressing reaches less." / for a person's own pick: "You chose this." |
| Each muscle on the plan screen | role, this week's sets with how they are counted, the band, and the climb: "Biceps: 12 sets this week (6 direct, 12 rows and pulldowns at half credit). Normal growth range. Climbing to 16." |
| The check-in card | where every added set goes, set by set (section 4.10), and what could not be placed |
| The order | "Your sessions are ordered so the legs are trained 2 sessions apart: at least 47 hours on consecutive days, about 72 hours in a usual week." |
| What the app learned | "Your lifts held up after shorter breaks than the first estimate. Recovery estimates already use this; from your next block, your plan's order and spacing use it too." (only when the learner's gate passes; otherwise "Not learning yet: too few comparisons of the same lift.") [S Q11d] |
| A research line on request | a one-line source behind each rule, on tap, e.g. "Pelland and colleagues, 2026: a review of 67 studies of weekly sets and growth." (lead ruling, section 13) |

Rules for every line: a fact from the plan or the log, or an estimate labelled as one; British English, no em dash, no "junk", "too much" or "overtrained"; no instruction (D204); never a claim about weight, food or the body (the ED-safety lane is out of bounds).

---

## 7. No surface recommends another session [founder R8]

Removed, with their tests re-pinned [R1 5.4; R2 9]: the swap rule and its reason (`nextWorkoutRecommendation.js:302-341`, `:218-230`); Home's recovery override, the "Keep" control and its stored flag, the hero line's swap branch; the change-workout sheet's per-row recovery verdicts; the Recovery screen's swap sentence and the readiness on its still-to-do rows. Fixed: the home-screen widget names the plan's next session, not the first routine; Home's Start and Plans' "Start next workout" always open the same session. Kept: Skip; the person's own permanent reorder in plan detail (it re-runs the readiness check and says what it changes); a plain choice of another session (founder question Q2). D201 F1 and its copy rulings are retired by the founder's clarification and recorded so.

---
## 8. Plans people already follow

What they hold today [R1 probe 2, d4; section 1.1]: weekly rows that climb to the landmark table's MAV by week 5, usually one exercise per muscle per session, and served sessions of about 45 working sets in week 5 with single exercises at 7 to 12 sets. Two founder rulings meet here. D8 says "Existing plans untouched (no migration prompt)" and that overflow past a cap is "spilled deterministically into a complementary-angle exercise (never trimmed)"; D45 limits a session to 8 exercises and 25 working sets ("otherwise you try and jam 9 exercises into one day and absolutely kill yourself"). For these plans in their peak weeks both cannot hold: keeping every planned set inside the per-exercise caps needs about 12 exercises and 45 sets in an upper session. So the founder chooses (Q1):

* (A) Rebuild every current plan with the new planner at the person's next session. The keep-block rebuild exists (D140, `activatePlanKeepingBlock`): it keeps the person's week in the block, their days and every exercise they chose themselves; generator picks outside the catalogue are replaced, each named in the note. From then on the plan is this design in full: new weekly targets inside the session length and D45 (so the peak weeks hold far fewer sets than today's), the order, the readiness check, nothing past a cap.
* (B) Keep current plans' weekly targets and apply the caps with D8's own overflow rule now: sets past an exercise's cap move into the catalogue's next exercise for that muscle in the same session, so weekly volume is kept; sessions keep their size (about 45 working sets and 12 exercises in week 5 of a 4-day plan, past D45). The full design arrives at each person's next block, with a "Rebuild now" option.
* (C) Leave current plans exactly as they are until their next block or a rebuild, as D8 says.

In every option, what changes no set count (the bands and their wording, the explanations, the swap choice, no recommendations) applies to every plan at once. Under A and B the person sees a one-time note of what changed and why, built from section 6. Test 8 pins whichever is chosen.

---

## 9. Data and storage

* The weekly per-muscle rows (`planned_muscle_volume`) keep their unit, direct sets, which FQ-4 reads today (`coachApply.js:335-351`), so no marker is needed and every reader keeps working; the recovery-safe weekly maximum goes into their existing `mrv` field, which the check-in already clamps to (section 4.14). Routine exercise rows keep `recommended_sets` as the week-1 sets (16 source files read it; their meaning does not change); an exercise a check-in adds is an ordinary routine exercise row.
* New facts the plan must carry: each muscle's role; the heavy and light designation and the light share (section 4.9); each session's gap rank (section 4.10); the learned factor the plan was built on (section 4.13); and the mark on a set count the person typed themselves (section 4.3). Every one must sync: all five plan tables sync to the cloud (`sync.js:1025, 1121, 1203, 1220, 1645`, pulled at `:2795`), so a local-only column would be lost on a pull [review 11].
* Roles cannot be derived when they are read: a style-locked save stores weak points without a rebuild (`ProGoalSetupScreen.js:323-325`), and kit, library and manual plans carry no roles from the profile. So roles are written when a plan is built; kit, library and manual plans get explicit roles (standard for every muscle they train, unless the person marks a focus).
* Where they live: inside an existing synced field if every reader tolerates the new keys (the block's `block_ledger` JSON, cloud column since migrate_131; `routine_exercises.selection_reason`, since migrate_139), which needs no cloud migration; otherwise one additive, idempotent cloud migration (for example a `role` column on `planned_muscle_volume` and a plan-facts JSON on `mesocycles`), applied only on the founder's phrase "run against production". The build lane confirms which with the code and the lead rules. Any local column follows the schema rules (additive, idempotent, header note).
* The person's gap history is read from logged workouts; nothing new is stored for it.

---

## 10. Locked rules this changes, and the rulings proposed

| Rule | Today | Proposed ruling | Why |
|---|---|---|---|
| D8 caps 4 / 3, overflow "never trimmed", "existing plans untouched" | generation only | the caps hold everywhere; overflow goes to a second exercise as D8 says; existing plans by the founder's answer to Q1 | founder R2; the cap that only holds on day one is the cause of the 6 to 14 set exercises |
| D96 FQ-4 serve-time scaling, "no per-entry cap" | proportional multiplier | `prescribe()` with caps and redistribution; confirm-then-apply kept | R2, R3 |
| D201 F1 "recommend, never silently switch" and its copy rulings | Home and Recovery recommend another session | retired by the founder's clarification (R8) | founder 2026-10-04 |
| D201 sequencer locks (lead ruling 2: the clash term never wraps; typical-week gaps only; opening-week dose) | | superseded by section 4.6; the C16 law 5 clash term is kept and now wraps | fixed order, free days [S STOP 4] |
| D201 recovery-model constants (effort factor, first-week factor, base clocks) | | changed as section 4.13 sets out; the base clocks by the founder's answer to Q3 | [S Q10] |
| D214 Q7 = A Recovery layout, the swap sentence pinned at `ReadinessCards.recoveryByMuscle.test.js:525-532`, readiness on the still-to-do rows | | superseded by sections 5.1 and 5.2, tests re-pinned | founder R5, R8 |
| `sessionReadiness.test.js:76` (a session is ready at its limiting muscle's time) | | the latest muscle's ready time (4.13), test re-pinned | "every muscle in it is estimated recovered" must be true |
| Campaign 16 job 7 (a swap sets reps by the new exercise's role) | | reps now carry over by the founder's R10; rest and the never-inherit-load rule stay | founder R10 |
| D96 FQ-4 confirm-then-apply | | kept; a hold and a withheld increase gain an Apply (4.10) | the coach's words must be what Apply does |
| D45 session ceilings | 8 exercises, 25 sets | kept | |
| Campaign 16 laws (staples first, roles, continuity, no supersets, time as a constraint, division intent senior) and its canonicality registry | | kept; "staples first" becomes the curated catalogue; the index term goes; nine registry rows change tier (4.7) | R9 |
| The 8-set session cap "Brigatto/Nippard" comment | wrong basis | re-cited to Remmert 2025 (preprint) and RP | [S Q10 row 11] |
| `getVolumeStatus` "Too much" above MRV | | retired for the role-aware bands | R11 |
| `00-SPEC.md` "twice a week beats once" | | superseded (Schoenfeld 2019, Pelland 2026) | [S Q10 row 21] |
| D204 | | kept, and binding on every new line | |

---
## 11. How it is built: phases, lanes and the tests that prove it

Agents at the lowest tier that can do each job to standard (D185); the lead builds the engine spine and reviews every diff; each phase closes with a fresh-eyes Opus review against this document, a full gate, harness renders for every screen touched, and a device checklist in chat. Nothing ships to a phone without the founder's build.

| Phase | Lane | Work | Who |
|---|---|---|---|
| 0, before B | S0 | the synced home for the plan's new facts (section 9); a cloud migration, if one is needed, waits for the founder's phrase | lead |
| A, serve-time (which plans it reaches: Q1) | A1 | `src/lib/plan/science.js` (every number in this document with its grade and source), `bands.js` (5.3), `prescribe.js` (4.9), with property tests | lead |
| | A2 | the 16 files that read a week's sets read `prescribe()`; the manual edit nudge | Sonnet |
| | A3 | check-in steps, `checkinPlacement.js`, the preview card and the rows it writes (4.10); `coachApply.js` by the founder's answer to Q6; the transitive ED isolation guard | lead (engine), Sonnet (card) |
| | A4 | swaps: the scope choice, the slot's prescription carried, same-muscle first, the note when a swap moves a slot's sets (4.12) | Sonnet |
| | A5 | the band function on every judging surface, the plan-layer fix, the deload pass (5.3) | Sonnet |
| | A6 | the recommendation sites removed, the widget and Start fixed, Home's change option by Q2 (7) | Sonnet |
| B, every new or rebuilt plan | B1 | the standard catalogue, the nine registry tier changes and the ranking without the list position; the canonicality tests re-pinned on the shipped order (4.7) | Sonnet, catalogue ruled by the lead |
| | B2 | roles and targets, the allocator, exposures, the structure search, the rotation order, the order inside a session, the readiness check, the effort ladder by Q5 (3, 4.2 to 4.8, 4.14) | lead |
| | B3 | the recovery model changes (base clocks by Q3), the latest-ready session time, the learned factor into the planner with its safeguards, the learner's reach by Q4 (4.13) | lead |
| | B4 | the Recovery screen's "Next in your plan" card and the muscle detail, the next week's first session (5.1, 5.2) | Sonnet |
| | B5 | explanations computed from the plan (6) | Sonnet |
| C | C1 | existing plans, by the founder's answer to Q1, with the one-time "what changed" note (8) | lead and Sonnet |

The tests that make "optimal" checkable, over a matrix of 2 to 6 days, every goal and division, three experience levels, the equipment profiles, no focus, one and three focus muscles, and 45 to 90 minute sessions:

1. No exercise above its cap, and no muscle above its session cap, in any week, after any check-in, after any swap (a number the person typed themselves aside, which is served as typed).
2. Every weekly target inside its role band and nothing planned above 30; where the constraints make a target unreachable (for example three focus muscles on 2 days at 45 minutes), the shortfall is reported, never hidden.
3. The readiness promise (4.14) at the usual spacing, every session of every week, before and after any check-in; where the growth floor wins, the session's estimate is shown; the back-to-back shortfall is reported, never hidden.
4. The chosen order has the lowest penalty among the orders that pass the readiness check (exhaustive).
5. For a muscle with a heavy and a light exposure, the heavy one is the exposure followed by the longer gap (pins 4.5 step 2).
6. Only catalogue exercises, each a STAPLE corpus row (the opt-in muscles aside); an exercise a check-in adds comes from the catalogue; the same inputs in any library order give the same plan.
7. One number everywhere: what the logger serves equals what every other reader shows (the plan screens, the check-in preview, the share image and the rest of the 16 files that read `recommended_sets` today).
8. Existing plans by the answer to Q1: under B, no plan's weekly volume falls; under A, every rebuilt plan passes tests 1 to 7 and keeps the person's week, days and own exercises.
9. The learned factor never changes a weekly target: a slower factor may change the order, the split, the per-session cap (only where the sets move to another session) and the readiness shown, never a week's total.
10. Check-ins: the hold and withheld cards show Apply and say what happens if they are left; +1 shows no Apply and says the planned climb goes ahead; nothing changes without Apply (D96).
11. Determinism and purity of every engine module; the ED isolation guard (now transitive) and the D204 regex stay green; the calorie floor, FFM floor, rapid-loss, calm-mode and ED-flag suites stay green and unchanged.
12. Each new behaviour has a test that fails on today's code.

---

## 12. Questions for the founder

Asked in chat as structured choices; everything else in this document is a lead ruling under D33, recorded in the register with its reason.

* Q1. Plans people already follow (section 8): (A) rebuild every current plan with the new planner at the person's next session, keeping their week in the block, their days and every exercise they chose, with a note of what changed and why (their peak-week sessions come down from about 45 working sets to within their session length and D45); (B) keep their weekly targets and apply the caps with D8's spill into a second exercise now, so sessions keep their size (about 45 working sets in week 5 of a 4-day plan, past D45), with the full design at each person's next block and a "Rebuild now" option; (C) leave current plans untouched until their next block or a rebuild, as D8 says.
* Q2. The Home "change workout" option: (A) keep a plain choice of another session from the plan's list, with no suggestions and no readiness badges; (B) remove it, so only the plan's next session can be started (Skip stays).
* Q3. The legs' recovery clocks: (A) re-centre quads and glutes on about 54 hours and hamstrings on about 60, closer to the one measurement in trained lifters (quads about 30 to 45 hours after an ordinary session; nothing is measured for glutes), each shown with its range, so a 4-day plan keeps 16 quad sets a week with every leg session starting recovered; (B) keep today's 72 hours, under which the same plan keeps the promise at about 12 quad sets a week and a 3-day full-body plan cannot keep it for the legs at all (section 4.14).
* Q4. Learning for people on a plan: (A) let the recovery learning compare the same exercise across plan weeks, adjusting each comparison for the planned difference in effort, shipped only if the safety simulation, re-run with the ladder Q5 chooses, finds no more false "faster" or "slower" results than today; (B) keep the learning as it is (it almost never learns for a person following a plan: 0 of 60 in its own simulation).
* Q5. Effort in the heavy weeks: (A) RIR 1, the ladder 3, 2, 2, 1, 1, then the recovery week at 4; (B) keep 3, 2, 1, 0, 0, then 4, two weeks at failure (section 4.14 sets out the evidence and what each costs in recovery).
* Q6. Permission for `coachApply.js`, a module the CLAUDE.md ED rule names: (A) change only its two volume functions so they call the new caps and placement, with the floors and every ED path untouched and their suites unchanged and green; (B) leave the file untouched, with its two callers (`sessionAdjustments.js:67`, `CoachOutputScreen.js:1354`) calling the new modules directly and the two old functions left unused in the file.

---

## 13. Rulings this document asks the register to record (lead, D33, each with its reason above)

Caps everywhere, a number the person typed served as typed (4.3); `prescribe()` replaces the FQ-4 multiplier, the rows stay in direct sets, confirm-then-apply kept (4.9); the check-in steps (a hold and a withheld increase as a hold with Apply, +1 as the planned climb) and the placement in a pure module outside the recovery model (4.10, 4.13); roles and targets, the ramp-don't-jump rule, and the volume multipliers dropped (4.2, 4.4); exposures sized by each session's real capacity, the structure search with the heavy exposure before the longer gap, and the rotation score with the wrap, the clash term and the 90% meaning of "recovered" (4.4 to 4.6); the standard catalogue and its nine registry tier changes (4.7); the order inside a session (4.8); the capped session +1 (4.11); swaps: the scope choice, the sets, reps and effort carried, rest and load by Campaign 16 job 7 (4.12); the recovery model changes, one meaning of "recovered" and the latest-ready session time (4.13); the learned factor into the plan at block boundaries with S F14's safeguards and never into volume, superseding D210's rejection (4.13); the readiness check with its two limits and the recovery-safe maximum (4.14); the band function and its wording, "Too much" retired (5.3); the Recovery screen's next-session card with part-of-day times (5.1); recommendation sites removed, D201 F1 retired (7); explanations computed from the plan, with a one-line research source on tap (6); the focus session cap of 10 direct and 12 fractional only when no extra session is possible (4.3); the synced home for the plan's new facts (9).

---

## 14. What the review found and what changed (revision 2)

A fresh-eyes Opus review of revision 1 read the four reports, the register and the code at every cited line, ran one probe of the real model (copy in the lead's scratchpad, `d219/review/`), and re-read the sources on PubMed and in full text. The lead re-checked each finding against the code and the sources before taking it; every finding below was confirmed and taken.

| # | Finding | What changed |
|---|---|---|
| B1 | Serve-time caps would cut existing plans' weekly volume (week 5: chest 8 served of 14 planned, back 8 of 16, side delts 6 of 16), against D8's "never trimmed"; the unit of the existing rows was never stated | The rows stay in direct sets (4.2, 4.9, 9); existing plans are the founder's choice with the real numbers, including their 45-set week-5 sessions against D45 (8, Q1); test 8 |
| B2 | The heavy and light exposures were the wrong way round (the light session read 71% at its start) | 4.5 step 2 reversed: the heavy exposure is the one followed by the longer gap; test 5 pins it |
| S3 | The check-in table left the coach's words untrue: a withheld increase still added sets, a hold cannot be applied, +1 changed nothing (`coachPrecedence.js:403`, `CoachOutputScreen.js:416`, `weeklyCoach.js:2106`) | 4.10 rewritten: a withheld increase acts as a hold, a hold gains Apply, +1 shows no Apply, every card says what happens if it is left; test 10 |
| S4 | `coachApply.js` is a module the ED rule names, and the guard checks direct imports only (`edIsolation.guard.test.js:30`) | The bounds line, a pure placement module, the stored gap rank, the transitive guard (4.13), Q6, test 11 |
| S5 | The readiness promise was asserted, not shown; at 72 h it costs leg volume; "own gaps" was undefined; no rule for an infeasible family | 4.14 rewritten with the probe's numbers and two limits (back to back; never below the growth floor); own gaps defined (4.6); 4.5 step 6; the costs stated in Q3 |
| S6 | The learned factor could change volume through the readiness check and the session cap; S F14's safeguards were dropped | The volume step uses the population clocks; the cap moves only where sets can move; 12 weeks and 3 muscles restored (4.4, 4.13, 4.14); test 9 |
| S7 | The session count ignored the session's real capacity; floors of 3 and 2 on a block-fixed list put week 1 near the peak | `cap_s` uses the exercises allowed (4.4); a floor of 2 for every exercise (4.3, K7); ramp, do not jump (4.4) |
| S8 | Catalogue entries were not STAPLE rows (preacher curls, overhead extensions, Machine Crunch, Cable Fly, Walking Lunge are COMMON; Hip Adduction Machine, wrist curl, neck machine, tibialis raise SPECIALIST) | Nine registry tier changes as a Campaign 16 ruling; the chest fly names STAPLE rows; opt-in muscles; the catalogue's order decides between STAPLE choices (4.7) |
| S9 | Ranking per minute favoured cheap isolation sets, calves over quads (`planEngine.js:956-985`, `prescription.js:72-77`) | Ranked per set; time is only a constraint (3) |
| S10 | Evidence misstated: Refalo 2023's small failure advantage; the second-exercise line; "54 h the best measurement"; 8 direct presented as evidence; unlabelled experience peaks; Enes's steps called weekly | Sections 2, 3 (K2), 4.2, 4.10, 4.14, 6 and Q3, Q5 reworded and regraded |
| S11 | Storage: all plan tables sync; roles cannot be derived for style-locked, kit, library and manual plans; 16 files read `recommended_sets` | Section 9 rewritten (a synced home, possibly one cloud migration, explicit roles); test 7 covers the 16 files |
| S12 | Locked rules changed but not listed: D214 Q7 = A and its pinned sentence, `sessionReadiness.test.js:76`, the D201 constants, Campaign 16 job 7, D8, the law 5 clash term | Section 10 extended |
| S13 | A typed number above the cap was "never blocked" but also never served above the cap | Served as typed, with no climb on top (4.3, 4.9 step 4) |
| S14 | Gaps in the test plan | Section 11's tests rewritten (12 tests) |
| Nits | The recovery term already wraps; 90% against the full clock; a fixed lead session; contradictions (the ladder, the fixed list, derived roles, two "trains" thresholds, Q1 against phase A); clock-time precision; "days" for sessions; the learned line; grades; the new ladder's equal-effort weeks; "tomorrow is chest and arms" | 4.6 (the clash term wraps, T90, any session leads, one "trains" definition); the 4.7 exception; 5.1 part-of-day times; 6 copy; 4.13 grades; the Q4 and Q5 notes; the R5 note in section 0; phase A tied to Q1 |
