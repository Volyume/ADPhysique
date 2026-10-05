# 05. The personal recovery learner: how it works, why a plan user gets no direction, and what could give it more to learn from (lane L1, read-only recon)

Register D219, founder answer 2026-10-05 (2): "Give it more to learn from (Recommended)". A follow-up designs a stronger signal for plan users and the design goes to the founder before anything is built. The lead writes that design; this file is the evidence it rests on. Nothing here is a recommendation to build, and nothing was built.

**Provenance.** Read at `ccb32784` on `claude/plan-builder-science`. The learner files (`src/lib/recovery/*`) are identical at `82635044`; the two newer commits change the planner's allocation and its tests. The working tree held uncommitted edits from other lanes (the Volume targets removal); they were neither read nor touched. The only file this lane wrote is this one. **Production data was not queried** (no authority, Article 9): how often people answer the chips, how many plan users train on fixed weekdays and how many log as prescribed are therefore UNKNOWN here and are marked so.

**Tags.** [OBS] observed in code (file:line) or in a run (with its N). [INF] my inference or arithmetic, shown. [ASSUMED] a number the simulation suite assumes and no source fixes. [LIT-A..D] literature, graded as `03-SCIENCE.md` section 0.1 grades it (A review of trials, B controlled trial, C acute or observational, D consensus); every PubMed source below was opened to its abstract through NCBI efetch by PMID, and numbers are from the abstract text (full texts were not opened).

**What I ran.** (1) The repo's own suite, everyday mode with `PERSONAL_SIM_REPORT=1` (67 tests green, 69 s) and `PERSONAL_CALIBRATION=full` (600 athletes a cell, 67 tests green, 666 s). (2) A scratch lab outside the repo: a verbatim copy of the suite's athlete (`personalRecovery.simulation.test.js:61-332`) with noise switches that do not change any random draw, and a hooked copy of the learner's pairing and fit (`personalRecovery.js:320-591`). Checked: with no hook it equals `personalRecoveryEvidence` on pairs, workout days, best factor, spread and LR for 150 athletes in 6 cells, and it reproduces the suite's own report medians athlete for athlete at N=60 (36 pairs and spread 0.26 for a varied plan; 108 and 0.07 for Mon/Wed/Fri plan; 72 and 0.02 for Mon/Thu plan; 88 and 0.35, 120 and 0.02 without a plan). Scratch results carry their N; they are properties of the suite's athlete model [ASSUMED], not measurements of people.

---

## 0. What frames the design (read first)

**F1. The premise needs qualifying: at the pinned gate the learner finds almost nobody, plan or not.** The repo's own full run (600 a cell, 32 cells) found a direction for **0 of 600 in both directions in every one of the 20 plan cells**; the only non-zero counts in the whole table are 1 to 6 of 600 in four no-plan stress cells and one wrong direction (1 of 600). The best case, a varied schedule without a plan, found 0 of 600 slow recoverers; my 300-athlete replication agrees (0 of 300 at gate 10, 34 of 300 at gate 4) [OBS, section 2.1]. The "123 of 600 slow, 11 of 600 fast on a varied schedule without a plan" still quoted in `14-PERSONAL-LEARNING-V2.md` section 0, `03-SCIENCE.md` Q10 row 22 and Q11d, and register D210 addendum 3 is the figure before D210 addendum 5 changed the statistic from comparisons to workout days; addendum 5 itself says "in twelve weeks it almost never moves anyone", and `constants.js:371-375` says the same. So "give plan users more to learn from" cannot mean "bring them up to non-plan users": nobody is served at this gate. **STOP item 1 (section 6).**

**F2. On a fixed weekly schedule no logged performance can identify recovery speed, and on most plan structures there is nothing to identify.** Same-weekday pairing puts every lift on a 7-day cadence; the spread gate (0.10) is failed by 100% of Mon/Thu, upper/lower and push/pull/legs athletes (spread 0.02) and by 90% of Mon/Wed/Fri plan athletes (0.07) [OBS]. On the three structures with 72 h or more between sessions of a muscle, even a 1.4 times slower recoverer starts 0% of lift-sessions below 90% recovered at the suite's 4-set dose, and 29% at the plan's reference dose of 6 sets a muscle, with a mean performance deficit of 0.5% against a per-comparison noise of 5% [OBS, section 2.3]. Design 4.14 aims for exactly this (each session starts recovered at the usual spacing), so on those structures a learned factor would not change what the plan does either. The structure where it would (short gaps, full body three days) is the one where the weekday rule removes the contrast.

**F3. On a varied schedule the contrast exists and noise swamps it.** A plan block gives about 10 usable workout days (22 without a plan); a comparison carries about 4.7% noise against a distinguishing signal of about 1.1%; the likelihood statistic's median is 0.65 against a gate of 10 [OBS, sections 2.4 and 2.5]. And 56% to 90% of a plan user's comparisons are read at the effort the plan asked for, not the effort reached; on a fixed schedule an error in that reading produces a statistic 2.7 times the real signal [OBS, section 2.4a].

**F4. The levers I could test do not reach the gate together.** Stacking pairing on any weekday, a perfect effort record and half the shared day noise gives a median of 2.0 (90th percentile 5.7) and 2% of slow recoverers found at gate 10; only removing all shared-day and exercise-level noise gets 25% [OBS, section 2.6]. The information needed at the median is about 15 times what a plan block gives [INF, section 2.5].

**F5. A logged effort tap has little headroom and reverses a standing founder ruling.** A perfect record of the reserve gains 1.2 to 1.3 times in the median statistic; a record with the error published for trained lifters (0.65 to 1.0 reps) gains nothing or loses (0.7 to 1.1 times) [OBS, section 2.6]. D96 FQ-3(b) (founder ruling received 2026-08-10): "the picker stays removed", never fabricated per-set RIR. **STOP item 2.**

**F6. The only signal class I found that can work on a fixed schedule is a level (a symptom), not a contrast (a performance change),** and it has its own identifiability problem (reporting style, novelty) and no calibration data (section 4, candidate B). The weekly check-in route is closed: it is weight-gated and its soreness and energy answers feed the rapid-loss calorie path (ED-woven). **STOP item 3.**

**F7. Two design-versus-code differences the lead should know before relying on the factor.** (a) Design 4.4 and 4.13 say a slower factor lowers the per-session direct cap; `LEARNED_FACTOR.slowerDirectCapFloor` (`science.js:186`) has no consumer in code, so today the factor only reorders the rotation and scales the readiness shown [OBS]. (b) The learner's candidate curves omit the three D219 session terms (novelty, long length, mostly indirect) that the displayed map and planner clocks carry; `recoveryClocks.d219.test.js:26` pins that `recoveryHoursAcross` returns what `recoveryHours` returns with the new options included ("the personal learner relies on that equality"), but `personalRecovery.js:350-358` passes none of them. Tested: with the athlete's true clocks including them, false directions stay at 0 of 300 at gate 10 [OBS, section 1.8]. **STOP item 5.**

**F8. The existing learner and its card are not gated by calm mode or an open ED flag** (no wellbeing or ED read anywhere in `src/lib/recovery/`, `RecoveryLearningCard.js` or `ReadinessCards.js`) [OBS]. The brief for any new signal says it must respect both. **STOP item 4.**

---

## 1. How the learner works today, end to end

### 1.1 Where it sits

| Piece | File |
|---|---|
| The learner (pairs, fit, gates) | `src/lib/recovery/personalRecovery.js` (639 lines, pure: no I/O, no clock, no randomness; guarded by `purity.guard.test.js`) |
| Its numbers and the evidence for each | `src/lib/recovery/constants.js:294-376` (the learner), `:1-93` (the model's evidence) |
| The curve it fits against | `src/lib/recovery/muscleRecoveryModel.js` (linear decay to zero at T hours; recovered fraction read against the peak residual; overlapping sessions compound) |
| The only I/O (reads history, memoises, applies the factor) | `src/lib/recovery/load.js` |
| What the planner may be told | `src/lib/recovery/planPersonalisation.js`, `load.js:421-461`, `src/lib/planAutoGen.js:1718-1750` |
| The screen | `src/components/RecoveryLearningCard.js`, `ReadinessCards.js` |
| The spec (stale in places, see F1) | `docs/recovery-programme-2026-09-25/14-PERSONAL-LEARNING-V2.md` |
| The calibration | `src/lib/recovery/__tests__/personalRecovery.simulation.test.js` |

### 1.2 Inputs: what is read, from where

The loader reads 126 days (`PERSONAL_HISTORY_DAYS` = 84-day window + 28-day baseline gap + 14-day lookback, `personalRecovery.js:132`), completed workouts only (`load.js:248-256`), with their sets, the exercise library including retired ids (`load.js:297-339`) and the week rows of every block touched (`load.js:341-356`). `buildRecoverySession` (`load.js:195-223`) turns each into the session shape.

| Learner input | Stored in | Notes |
|---|---|---|
| Weight, reps per set | `workout_sets.weight`, `.actual_reps` | straight sets only, weight > 0, reps > 0 (`personalRecovery.js:206-218`) |
| Set order | `workout_sets.set_number`, `.created_at` | sorted at `:223-228` |
| Set type, evidence class | `workout_sets.set_type`, `.evidence_class` | warm-up, drop, AMRAP, myo-rep, rest-pause, circuit, ballistic all left out (`:209-210`, `isTrendEligibleRow`) |
| Exercise to primary muscle | `exercises.primary_muscle` through `allocateExerciseVolume` | assisted, timed and distance exercises left out (`:145-150`, `:192-198`) |
| Session start, end, duration | `workouts.started_at`, `.ended_at`, `.duration_minutes` | pair timing and the curve |
| The week's effort target | `mesocycle_weeks.rir_target` through `workouts.mesocycle_week_id` | `load.js:160-175`, `:216`; status `none` (no plan), `resolved`, `unresolved` (a week id with no row: never compared) |
| Recovery week | `mesocycle_weeks.is_deload` | excluded as the later session and as the baseline (`personalRecovery.js:395`, `:411`) |
| Ratings (only lengthen the curve) | `workouts.fatigue_level`, `.joint_discomfort`, and the NEXT session's `soreness_24h_before` within 96 h | `load.js:216-221`, `:233-241`; `constants.js:264-270`, `:467-474`. They are inputs to the predicted curve, never outcomes |
| The start factor | the profile's "How's your recovery?" answer: poor 1.15, average 1.0, good 0.9 | `constants.js:160`, `load.js:141-150` |
| Injury limits | `capability_constraints` | a session under a limit for the muscle, or inside the 14-day return, teaches nothing (`load.js:479-497`) |

Not read: sleep quality, energy, the pre-session intent, session difficulty, muscle engagement, `session_resolutions`, weekly check-ins, time of day, per-set effort.

### 1.3 Evidence: what counts as a comparable pair (`collectPairs`, `personalRecovery.js:320-462`)

A pair is a completed session B and the most recent earlier session P of the same exercise X, and:

1. B started inside the last 84 days, is not a recovery week and has a resolved plan week or none (`:389-395`).
2. X is load-based strength with a primary muscle; neither session is under an injury limit for it (`:399`, `:411`).
3. B has a session on X's primary muscle ending inside the 14 days before it, "something to recover from" (`:400`).
4. **P is on the same local weekday as B**, at least 3 days earlier (a second session the same day is not a baseline) and at most 28 days earlier (`:405-409`, `constants.js:308`). The walk back skips an incomparable session for an earlier one.
5. The effort is comparable (`effortComparison`, `:178-185`): both outside any plan, or both targets known and equal ('same'), or both known and different ('adjusted', D219 Q4); one in a plan and one not, or an unresolved week, never pairs.
6. k = min(3, sets in B, sets in P) first straight sets of each (`:419`). The performance index is the mean estimated max (`calculate1RM`, Epley and Brzycki blended up to 10 reps, Epley above) of those sets. For an 'adjusted' pair each set is read at reps plus the week's planned reps in reserve (`meanFirstAtPlannedEffort`, `:253-257`, `:422-424`).
7. The outcome is y = ln(PI_B / PI_P) (`:426`); a change past 0.2 (about 22%) is dropped as a slip or an injury (`:427`, `constants.js:341`).
8. A lift whose comparisons repeat the same reps set for set in at least half of them is "logged as planned" and its pairs are left out and counted (`:428-458`, `constants.js:348`); when that alone leaves too few the reason is `fixed_reps`.
9. A muscle's pairs count only from 5 of them, and learning needs 8 counted in all (`constants.js:351-356`, `personalRecovery.js:524-529`).

### 1.4 The model and the fit (`personalRecoveryEvidence`, `:506-591`)

For each candidate factor f on a 5% grid from 0.75 to 1.40 plus the start (`constants.js:314-318`), the model's own curve gives each muscle's recovered fraction r at the start of B and of P, and x(f) = r_B(f) - r_P(f) (`:556`). Per muscle the performance change is modelled as y = a + g x days + s x x(f): an offset and a per-day drift fitted per muscle (`residualOnDays`, `:266-281`), and a sensitivity s held to 0.04 to 0.15 (`boundedFit`, `:292-313`, `constants.js:330-331`; "a candidate that predicts a drop the lifts never show must pay for it"). A candidate's error is the sum over muscles (`:552-562`). Two consequences matter for section 2: **every muscle has its own intercept, so only variation of x within a muscle over time carries information; and a muscle's steady difference from another carries none.**

### 1.5 The decision (`learnPersonalRecovery`, `:612-625`)

The best candidate (least squared error; ties to the nearest the start, then the longer, `:565-576`) is used only if all hold, else the start stands with a reason:

| Gate | Value | Reason if failed |
|---|---|---|
| counted pairs | at least 8 (`PERSONAL_MIN_PAIRS`) | `too_few`, or `fixed_reps` when the left-out lifts would have made enough |
| spread: the largest pooled SD of x about each muscle's own mean, over candidates (`:563`) | at least 0.10 (`PERSONAL_MIN_SPREAD`) | `no_spread` |
| clarity: workout days x ln(SSE at the start / SSE at the best) (`:577-587`) | at least 10 (`PERSONAL_LR_MIN`) | `not_clear` |

The clarity statistic counts the **days** the later sessions fell on, not the comparisons, because comparisons from one day share that day's form (D210 addendum 5; `:577-581`). Output: `{ factor, prior, pairs, reason, pairsByMuscle }`; `workoutDays`, `spread`, `best` and `lr` are computed and dropped (`:565-587`).

### 1.6 How the gate was calibrated, and what the suite contains

**The simulated athlete** (suite `:61-332`) [ASSUMED unless noted]: twelve weeks; four muscles (chest, back, quads, hamstrings) with three exercises each; a true recovery factor, a true sensitivity per muscle drawn from 0.06 to 0.12, a strength level, progression of 0.2% to 1% a week per exercise; a steady strength effect per weekday, standard deviation 1.5% (from the 2026-09-26 review; **no published magnitude was found in this recon**, PubMed search 2026-10-05); half the athletes take an 8 to 14 day break and return 2% down; per session a shared day effect (2%), per exercise an exercise effect (2%), per set noise (1%); the load is the plan's, in plate steps; the reserve at which the set stops is the target plus one of -1, 0, 0, +1; reps are whole numbers; four sets of one exercise per muscle (some cells: two exercises, or eight sets). The true recovered fraction comes from **the model's own curve at the true factor**, so the truth is always inside the learner's model class (the register says so: "every simulated muscle shares one true speed").

**The cells (32):** five schedules (Mon/Wed/Fri full body, Mon/Thu, upper/lower 4-day, push/pull/legs 6-day, varied gaps of 1 to 4 days) each with no plan, a plan on the new ladder (RIR 3, 2, 2, 1, 1, 4), a plan on the running ladder (3, 2, 1, 0, 0, 4) and a plan whose athlete stops at their own effort whatever the plan asks (the stress case for the D219 reading): 20 cells; and 12 no-plan stress cells (reps as prescribed, two exercises a muscle, tiring through the sets, eight sets, last set taken as far as it goes) (`:327-386`). **Every stress cell is without a plan** ("where the learner otherwise has most to go on", `:363-365`), and every plan cell logs "measured" reps.

**The bounds the suite pins** (`:83-84`, `:442-486`): at a true factor equal to the start a direction shown for at most 5 of 60 athletes a cell in the everyday run, at most 30 of 600 (5%) in the full run; at a true factor of 0.75 or 1.40 the wrong direction for at most 3 of 60 (everyday), at most 10 of 600 (1 in 60, full); `PERSONAL_LR_MIN` pinned at 10; "reps logged as prescribed on three set days: nobody shown a direction, reason given"; the learner's decision equals the suite's `directionAt` on simulated athletes.

**Other pins** [OBS]: `personalRecovery.test.js` pins the pair rules one by one (weekday, effort comparison and its 'adjusted' reading, recovery week, unresolved week, injury, the 28-day gap, matched sets, straight sets, the 0.2 change cap, the fixed-reps share of one half, the 5-pair muscle floor, `PERSONAL_HISTORY_DAYS`), the bounded fit (sensitivity 0.04 to 0.15) and that a clean slow or fast athlete is found and one at the start is not; `planPersonalisation.test.js` pins S F14's safeguards (12 weeks, 3 muscles, a move of 0.10, a revert within 0.05, bounds 0.75 to 1.40); `planAutoGen.plannerV2.personalisation.test.js:192-200` pins that a learned factor never changes a weekly target; `purity.guard.test.js` pins no I/O, clock or randomness in the learner and `planPersonalisation.js`; `edIsolation.guard.test.js` keeps `edPatternDetector.js`, `wellbeing.js`, `nutritionEngine.js`, `weeklyCoach.js` and `coachApply.js` from importing `src/lib/recovery/`, and walks `coachApply.js`'s imports transitively.

**Official results at this head** [OBS, full run, 600 a cell, 666 s]: smallest gate meeting both promises 5; at gate 10 the worst cell shows a direction to 3 of 600 whose truth equals the start and the wrong direction to 1 of 600 (gate 8: 8 and 1; gate 12: 1 and 0). `constants.js:371-375` still says 2 and 1 and "smallest 4": one count stale after the D219 plan cells, inside the promise. Found in the right direction at gate 10: 0 of 600 in all 20 plan cells; 5 and 6 of 600 faster in two no-plan prescribed cells, 4 of 600 slower in one, 1 of 600 faster in another.

### 1.7 Where the learned factor goes

- **Screen.** `load.js:375-384`: when `reason === 'adjusted'` the factor replaces the recovery answer's factor for every muscle in `buildMuscleRecoveryMap`; the reading is returned for the card. Memoised per user, local day, recovery answer and everything it reads (`load.js:536-565`). Skipped, and the map reads on the answer alone, when a read fails (`load.js:375`, `:572-601`).
- **Plan.** At a build, a rebuild and a block boundary only; nothing re-runs the planner on its own (`load.js:391-411`). `loadPlanPersonalisation` (`load.js:421-461`) applies S F14's safeguards through `plannerLearnedFactor` (`planPersonalisation.js:56-69`): the learner's own gate passed, 12 weeks from the person's first completed workout, 3 muscles contributing, a move of at least 0.10 from the factor the plan was built on (hysteresis), a return to the start when the factor is back within 0.05 or the gate fails, bounded 0.75 to 1.40. `planAutoGen.js:1718-1750` hands the planner a number (or null) at every route into the new planner (`:1785`, `:2161`).
- **What the planner does with it.** `planner.js:123-153`: the factor drives `hoursPerson`, used only to choose the rotation order (`personalise`, `:257-279`) and the readiness reported; every decision that sets a weekly target runs on `hoursPopulation` (`:140`, `:148` "never changes a weekly target"); `builtFactor` is recorded in the plan facts (`:1207`). `LEARNED_FACTOR.slowerDirectCapFloor` is defined (`science.js:186`) and read nowhere [OBS, grep of `src/`], so design 4.4's "lower per-session cap for a slower recoverer" is not built.
- **Tests.** `planAutoGen.plannerV2.personalisation.test.js:192-200` pins that the same profile built with and without a learned factor has the same weekly targets for every muscle and week.

### 1.8 One curve, two versions (F7b)

`buildMuscleRecoveryMap` passes `novel`, `longLengthShare` and `mostlyIndirect` (from `sessionMuscleTerms`, `muscleRecoveryModel.js:186-215`) into `recoveryHours` (`:428-450`). The learner's `hoursOf` passes sets, effort target, first-week flag and ratings only (`personalRecovery.js:350-358`; `grep` finds none of the three words in the file). The suite's athlete truth omits them as well, so the suite cannot see the difference. Scratch test, athletes whose true clocks include novelty and long length (Barbell Back Squat, Hack Squat Machine, Romanian Deadlift, Seated Leg Curl named on the lifts; N=300 a truth, four cells): false directions at gate 10, 0 of 300 in every cell; at gate 4, 0 to 2 of 300. It does not break the promise today. It is worth knowing because a design that makes the learner more sensitive makes it more sensitive to this too.

---

## 2. Why a plan user produces no direction

### 2.1 Reach, gate by gate (scratch, suite athlete, N=300 a truth; counts are of 300)

Counted pairs, days, spread and "pass spread" are for athletes whose truth equals the start (medians; the share who pass the 0.10 gate). "Days" is the count the clarity statistic multiplies by (workout days). "LR" is the median (90th percentile, maximum) of the statistic among athletes who pass the pairs and spread gates, true factor 1.4. "Slower at 10 / at 4" counts truth-1.4 athletes shown "slower" at gate 10 and at gate 4. "False" counts athletes whose truth equals the start shown any direction.

| Cell | Counted pairs | Days | Spread | Pass spread | LR, truth 1.4 | Slower at 10 / at 4 | False at 10 / at 4 |
|---|---|---|---|---|---|---|---|
| Varied, no plan | 87 | 22 | 0.34 | 100% | 1.53 (4.43, 8.29) | 0 / 34 | 0 / 2 |
| Varied, plan, new ladder | 38 | 10 | 0.26 | 94% | 0.68 (2.51, 7.50) | 0 / 5 | 0 / 0 |
| Varied, plan, running ladder | 38 | 10 | 0.26 | 94% | 0.77 (2.58, 5.98) | 0 / 6 | 0 / 0 |
| Varied, plan, stops at own effort | 40 | 10 | 0.25 | 96% | 0.73 (2.78, 5.07) | 0 / 5 | 0 / 0 |
| Varied, plan, **reps as prescribed** (not in the suite) | 0 | 0 | 0.00 | 23% | 1.03 (3.27, 12.25) | 1 / 8 | 0 / 4 |
| Varied, plan, two exercises a muscle (not in the suite) | 104 | 16 | 0.33 | 100% | 0.83 (2.37, 6.52) | 0 / 3 | 0 / 0 |
| Mon/Wed/Fri, no plan | 120 | 30 | 0.02 | **0%** | none pass | 0 / 0 | 0 / 0 |
| Mon/Wed/Fri, plan, new ladder | 96 | 24 | 0.07 | 10% | 0.80 (1.66, 2.24) | 0 / 0 | 0 / 0 |
| Mon/Wed/Fri, plan, reps as prescribed (not in the suite) | 6 | 0 | 0.00 | 4% | 0.87 (2.22, 5.27) | 0 / 1 | 0 / 2 |
| Mon/Thu, plan | 72 | 18 | 0.02 | **0%** | none pass | 0 / 0 | 0 / 0 |
| Upper/lower 4-day, plan | 72 | 36 | 0.02 | **0%** | none pass | 0 / 0 | 0 / 0 |
| Push/pull/legs 6-day, plan | 70 | 52 | 0.02 | **0%** | none pass | 0 / 0 | 0 / 0 |

Reasons shown at gate 10 (truth 1.4): fixed schedules `no_spread` for 275 to 300 of 300; the varied plan cells `not_clear` for 283 to 289; the varied plan cell with reps as prescribed `fixed_reps` for 205 of 300 (223 for athletes at the start) [OBS]. At the refused lower gates the picture is the same shape (varied no plan, truth 1.4: 11% at gate 4, 5% at 6, 1% at 8, 0% at 10); and a **faster** recoverer is found by almost no cell at any gate (0 to 2 of 300 at gate 4), because a faster recoverer differs from the start only after short breaks (`14-PERSONAL-LEARNING-V2.md` section 0).

### 2.2 Mechanism 1: on a fixed schedule there is no contrast (the pair rule)

Same-weekday pairing was added so a lifter 2% stronger on Mondays is not read as "slower" (D210 addendum 3). On a fixed weekly schedule the gap before a session is a deterministic function of its weekday, so weekday strength and recovery time are the same variable: the rule removes the confound by removing the contrast. [OBS] The suite's own report shows it: spread 0.00 to 0.02 for every fixed schedule without a plan, and 0.02 to 0.07 with one. The only contrast left is the plan's own ladder (the effort factor moves T by 0.8 to 1.1, `constants.js:409-420`), which is why Mon/Wed/Fri gains 0.05 when a plan is added and why that is still under the 0.10 gate. The planner's rule that no exercise repeats within a week keeps each lift on a 7-day cadence even if the weekday rule were lifted (scratch: Mon/Wed/Fri plan, any weekday allowed: spread 0.07, 6% pass; without a plan, where bench recurs Monday, Wednesday and Friday, any weekday gives spread 0.15 and 100% pass, which is the danger shown in 2.6).

Removing the noise does not change this: with every modelled noise source switched off (jitter, rounding, day, exercise, set) Mon/Thu still shows 0% passing the spread gate, and Mon/Wed/Fri 7% [OBS, scratch N=150, section 2.6]. It is structural: **performance outcomes are relative (they need two observations that differ in predicted recovery), and a fixed schedule supplies none.**

### 2.3 Mechanism 2: the plan's spacing leaves nothing to see

The plan aims for each session to start with its muscles estimated recovered at the usual spacing (design 4.14). The suite's athletes follow schedules, not the planner's output, so this is read structure by structure. Scratch, suite athlete, N=100 a truth, "lift-sessions" are the 128 (or 96, 176, 264) lifts in the window; deficit = sensitivity x (1 - true recovered fraction), in % of the estimated max:

| Cell (dose) | Truth | Lift-sessions starting below 90% recovered | Mean deficit | 90th percentile deficit | SD of the true recovery signal across pairs | Residual SD per comparison (about the noise) |
|---|---|---|---|---|---|---|
| Varied, no plan (4 sets) | 1.0 / 1.4 | 27% / 50% | 1.16% / 1.94% | 4.4% / 5.6% | 2.6% / 3.3% | 5.1% / 5.3% |
| Varied, plan (4 sets) | 1.0 / 1.4 | 29% / 44% | 1.14% / 1.79% | 4.1% / 5.4% | 2.1% / 2.7% | 4.6% / 4.7% |
| Mon/Wed/Fri, plan (4 sets) | 1.0 / 1.4 | 15% / 61% | 0.25% / 1.38% | 1.0% / 3.1% | 0.4% / 0.8% | 5.1% / 5.2% |
| Mon/Thu, upper/lower, PPL, plan (4 sets) | 1.0 / 1.4 | **0% / 0%** | 0.00% / 0.06% | 0% / 0.4% | 0.0% / 0.2% | 5.1% |
| Mon/Wed/Fri, plan (6 sets a muscle) | 1.0 / 1.4 | 44% / 83% | 0.84% / 2.11% | 2.3% / 3.8% | 0.8% / 0.7% | 5.2% / 5.3% |
| Mon/Thu, upper/lower, PPL, plan (6 sets a muscle) | 1.0 / 1.4 | **0% / 29%** | 0.00% / 0.50% | 0% / 1.8% | 0.0% / 0.7% | 5.2% / 5.3% |
| Varied, plan (6 sets a muscle) | 1.0 / 1.4 | 39% / 58% | 1.43% / 2.24% | 4.9% / 5.7% | 2.7% / 3.0% | 4.9% / 5.1% |

6 sets a muscle is `REFERENCE_SETS` (`constants.js:153`), "the median per-session target the plan generator itself emits"; the suite's own plan cells train 4 sets, below it. [INF] On the three structures with 72 h or more between sessions of a muscle the typical plan user, and a slower one at 4 sets, start every session recovered: there is no fatigue for any outcome to reveal, and the plan would not change for them if the factor moved. The structure where the factor would matter (full body three days a week) is where the pair rule destroys the contrast (2.2).

### 2.4 Mechanism 3: comparisons lost before the gate (the funnel)

Median per athlete over twelve weeks, truth equal to the start (scratch, N=100; "lifts" are exercise-sessions in the window):

| Cell | Lifts | Recovery week | Nothing to recover from | Not trained in the previous 28 days | **No same-weekday session** | Baseline in a recovery week | Pairs formed | Left out: logged as prescribed | Counted | Days |
|---|---|---|---|---|---|---|---|---|---|---|
| Varied, no plan | 128 | 0 | 4 | 0 | **36** | 0 | 88 | 0 | 88 | 22 |
| Varied, plan | 128 | 20 | 4 | 8 | **52** | 4 | 40 | 0 | 40 | 10 |
| Varied, plan, exercise by routine cycle | 128 | 20 | 4 | 8 | **60** | 4 | 32 | 0 | 32 | 8 |
| Varied, plan, reps as prescribed | 128 | 20 | 4 | 8 | 52 | 4 | 38 | **32** | 0 | 0 |
| Mon/Wed/Fri, plan | 128 | 24 | 4 | 8 | 0 | 0 | 96 | 0 | 96 | 24 |
| Mon/Thu, plan | 96 | 16 | 4 | 4 | 0 | 0 | 72 | 0 | 72 | 18 |
| Mon/Wed/Fri, one session in four shifted a day, plan | 144 | 24 | 4 | 8 | 28 | 0 | 68 | 0 | 68 | 17 |

On a varied schedule the same-weekday rule is the largest single loss (36 of 128 without a plan, 52 with one); a plan adds the recovery week (20 of 128, the block's sixth week; both as the later session and as the baseline) and the rotation (8 more). The suite's plan cells assign exercises by occurrence within the calendar week (`:205-212`); assigning by the routine cycle, as the app serves a plan, costs 8 more of 128 (the "routine cycle" row). **What real plan users do (fixed or varied weekdays) is UNKNOWN here;** D17 (founder: "Rest days are not strictly adhered to, user trains on the days they want and have lives") says the varied case is not marginal, and `deriveHabitualTrainingWeekdays` (`trainingHabitSchedule.js:72`) already classifies habit from history.

### 2.4a Mechanism 3b: the effort and the load are the plan's, not the person's

- **Most comparisons are read at the effort the plan asked for.** A plan's target changes weekly (new ladder 3, 2, 2, 1, 1, 4), so only weeks 2 and 3, and weeks 4 and 5, share one. Of a plan user's counted comparisons, 78% on a varied schedule (90% on the running ladder, 56% on Mon/Wed/Fri) are read as 'adjusted': each session's sets are raised by the plan's reserve (`effortComparison`, `personalRecovery.js:178-185`; `:253-257`) [OBS, scratch, N=100 medians]. D219 Q4 made this possible and held the false-direction bound; it also means the reserve actually reached enters the fit only as the plan's number.
- **An error in that reading lands on the only contrast a fixed schedule has.** The ladder moves the predicted clock (T x 0.8 to 1.1, `constants.js:409-420`), the one source of within-muscle variation in x on Mon/Wed/Fri. An athlete who stops at their own effort whatever the week asks (the suite's stress cell) hands the adjustment an error tied to the week's place in the block. Scratch, N=300, Mon/Wed/Fri plan, athletes who pass the spread gate: the statistic's median for a truth equal to the start is **2.13** (90th percentile 2.92, maximum 3.95) for the own-effort athlete, against 0.28 (1.67, 2.28) for one who follows the plan, and 0.80 for a true 1.4 recoverer who follows the plan. On this schedule the effort-reading error is 2.7 times the real signal. The pinned bound still holds (0 of 300 shown any direction at gate 10, the maximum 3.95 against 10), and the suite's own report shows the same shape (null top 4.0 for this cell at 60 athletes, against 0.2 for the plain plan cell). It is a margin to watch: a design that raises sensitivity spends it.
- **Climbing loads.** The suite's athlete progresses smoothly (0.2% to 1% a week) and the fit removes a per-day drift. A real plan climbs in steps: the prescription raises the load when the rep range is topped (`LOAD_ADVANCE_RANGE_TOPPED`, `livePrescription.js:55`, `:308`) and the reps then reset, so a pair across a step compares different rep counts. The estimate is not load-invariant: `calculate1RM` blends Epley and Brzycki up to 10 reps and uses Epley above (`algorithms.js:104-141`); at 5 reps the blend is 1.150 times the load against Epley's 1.167, at 8 reps 1.257 against 1.267, at 10 reps they agree [INF, arithmetic from the formula]. So the two estimators the index blends already differ by about 1.4% between 5 and 10 reps, a rep-range term of the same order as the signal that separates a 1.4 recoverer from the start (1.1% on a varied schedule, 0.56% on Mon/Wed/Fri, section 2.5). The suite's athlete is generated by pure Epley (`30 x (setMax / load - 1)`, suite `:280`), so it cannot show this. When the person logs as prescribed the load climbs and the reps stay the plan's, and the fixed-reps rule removes the lift (section 2.4).

### 2.5 Mechanism 4: noise against signal, and the information budget

Per comparison on a varied schedule the noise is about 5% of the estimated max and the signal that separates a 1.4 recoverer from the start is about 1.1% to 1.25% (the SD across pairs of sensitivity x (x at 1.4 minus x at the start), about each muscle's mean: 1.25% varied no plan, 1.09% to 1.13% varied plan, 0.56% Mon/Wed/Fri plan, 0.19% to 0.20% on Mon/Thu, upper/lower and push/pull/legs at 4 sets and 0.67% at 6 sets; scratch, N=100) [OBS]. The clarity statistic behaves like days x (signal/noise)^2 [INF]: plan, 10 x (1.09/4.7)^2 = 0.54 against an observed median of 0.65; no plan, 22 x (1.25/5.07)^2 = 1.3 against 1.5 to 1.7. To reach 10 at the median the plan athlete needs the noise SD cut from 4.7% to about 1.1% (4.3 times, 18 times in variance) or 19 times the days; the athlete without a plan, 2.7 times in SD or 7.5 times the days. At the 90th percentile of the plan athletes (2.5) the gap is 4 times.

Where the noise comes from (varied, no plan, N=150, each source switched off in turn, shares of the noise variance) [OBS, scratch]: the reserve the person actually stopped at (plan target plus -1, 0, 0 or +1) 26%; the shared day effect 31%; the exercise-level effect 30%; set noise 7%; whole-rep rounding 9%. [ASSUMED] sizes; for scale, the test-retest coefficient of variation of a 1RM test has a median of 4.2% (range 0.5 to 12.1%, 32 studies, n=1,595; Grgic 2020, PMID 32681399, [LIT-A]), so the suite's 5% per comparison is not obviously pessimistic. Not modelled by the suite and present in real logs: time of day (strength varies sinusoidally and peaks in the early evening, Atkinson and Reilly 1996, PMID 8726347, [LIT-D]); the rest between sets (not recorded); a different gym or machine; the prescription following last week's performance (a control loop: a poor week sets next week's target).

### 2.6 What each lever is worth (scratch, truth 1.4, median of the statistic; N shown)

**Noise sources removed, one at a time and together** (N=150 a truth; found at gate 4 in brackets):

| Scenario | Varied, no plan | Varied, plan, new ladder |
|---|---|---|
| Baseline | 1.72 (10%) | 0.65 (2%) |
| No variation in the reserve reached | 2.06 (21%) | 0.83 (5%) |
| No shared day effect | 2.55 (22%) | 1.02 (3%) |
| Day effect halved | 2.28 (17%) | 0.89 (2%) |
| No exercise-level effect | 2.35 (25%) | 0.91 (7%) |
| No reserve variation and no day effect | 3.50 (38%) | 1.44 (11%) |
| **All noise off** (reserve, rounding, day, exercise, set) | **78.6 (99%, 99% at gate 10)** | **18.8 (89%, 79% at gate 10)** |
| Mon/Wed/Fri plan, all noise off | 24.3 but only 7% pass the spread gate | |
| Mon/Thu plan, all noise off | 0% pass the spread gate | |

**A logged reserve** (the athlete reports the reserve it really stopped at, plus an error of the stated SD in reps, whole numbers, read into the learner as reps plus the logged reserve for both sessions):

| Report | Varied, no plan | Varied, plan, new ladder |
|---|---|---|
| Baseline (the plan's reserve assumed) | 1.72 | 0.65 |
| Perfect (error 0) | 2.08 (x1.21) | 0.83 (x1.28) |
| Error 0.65 reps (the absolute error of trained lifters on 1 and 3 RIR, Refalo 2024) | 1.59 (x0.92) | 0.70 (x1.08) |
| Error 1.0 reps (the raw SD in the same study; the between-person SD in the meta-analysis is 1.45) | 1.16 (x0.67) | 0.47 (x0.72) |

**Pairing the same lift on any weekday** (N=150 a truth; the weekday test of 1.3 item 4 lifted, effort still compared). "same" is the repo's rule, "any" the lifted one.

| Cell | Days, same / any | Median (90th pct), same / any | Slower found at gate 4, same / any | False direction, truth = start, % at gates 10 / 4 | Wrong direction, truth 0.75, % at gates 10 / 4 |
|---|---|---|---|---|---|
| Varied, no plan | 22 / 31 | 1.72 (3.96) / 1.93 (5.83) | 10% / 21% | same 0 / 0; any 0 / 1 | same 0 / 0; any 0 / 1 |
| Varied, plan | 10 / 23 | 0.65 (2.53) / 1.11 (3.58) | 2% / 9% | same 0 / 0; any 0 / 1 | same 0 / 0; any 0 / 1 |
| Varied, plan, exercise by routine cycle | 7 / 24 | 0.74 (2.88) / 1.18 (4.20) | 1% / 11% | same 0 / 0; any 0 / 1 | same 0 / 0; any 0 / 0 |
| Mon/Wed/Fri, no plan | 30 / 32 | none pass / 3.30 (10.79) | 0% / 43% | same 0 / 0; **any 4 / 17** | same 0 / 0; **any 2 / 15** |
| Mon/Wed/Fri, plan | 26 / 26 | 1.51 / 0.95 (7% / 6% pass) | 0% / 0% | same 0 / 0; any 0 / 0 | same 0 / 0; any 0 / 0 |
| Mon/Wed/Fri, a quarter of sessions shifted a day, no plan | 27 / 35 | 0.99 (3.98) / 2.01 (7.83) | 10% / 31% | same 0 / 0; any 0 / 2 | same 0 / 0; any 0 / 5 |

Allowing any weekday more than doubles the usable days on a varied schedule and roughly doubles the statistic, with false directions held at 1% or less **on a varied schedule only**; on a fixed schedule it brings back the weekday confound (false direction for 4% at gate 10; wrong direction for 2% at truth 0.75), which is exactly D210 addendum 3's finding. Any such rule needs a guard that says when weekday and gap are coupled (the habit measure in `trainingHabitSchedule.js:72` is one existing, deterministic start).

**Stacks** (N=200 a truth, varied, plan, new ladder; median (90th percentile), found at gate 10 / at gate 4):

| Stack | Median (90th) | At 10 / at 4 |
|---|---|---|
| Baseline | 0.65 (2.55) | 0% / 2% |
| Any weekday | 1.19 (3.67) | 0% / 9% |
| Any weekday + logged reserve, error 0.65 | 1.06 (3.64) | 0% / 8% |
| Any weekday + perfect logged reserve | 1.36 (5.13) | 0% / 17% |
| Any weekday + perfect reserve + day effect halved | **2.02 (5.70)** | 2% / 22% |
| Any weekday + perfect reserve + no day effect | 2.47 (6.00) | 1% / 26% |
| Any weekday + perfect reserve + no day effect + no exercise effect | 6.29 (13.96) | 25% / 66%, but false at 4: 6% |

Without a plan the same stacks give 1.64 to 4.48 with 0% to 8% at gate 10, and 10.4 (51% at gate 10) when both shared noises are removed. [INF] No combination I could test brings the median plan athlete to the gate within the 84-day window: the best stack that keeps a plausible input (a perfect reserve record is not plausible, see candidate A) reaches a fifth of the way on the median (2.0 against 10), 2% of slow recoverers at gate 10 and 22% at gate 4.

### 2.7 What the physiology allows

The size of the real effect at plan doses is small. Six sets of bench at 75% 1RM (n=24 trained men and women): bar velocity at a fixed load 24 h later -3% after sets to failure and -3% after sets to 1 rep in reserve, +2% after 3 in reserve, and all between-protocol differences gone at 48 h (Refalo 2023, PMID 36752989, [LIT-B]). After ten failure sets of squat and leg press (n=14) volume load was down 24 h later (effect size -0.90), first-set volume load still down at 48 h (-0.63), jump and isometric strength at or above baseline by 72 h (Goulart 2021, PMID 32594858, [LIT-B]). Failure against non-failure in a systematic review of 20 studies, 12 in the meta-analysis, with a larger fall in biomechanical function after failure (standardised difference -0.96, 95% CI -1.43 to -0.49; Vieira 2022, PMID 34881412, [LIT-A]) and recovery that is faster between 24 and 48 h without failure (Moran-Navarro 2017, PMID 28965198, [LIT-B]) are the evidence for the effort ladder. [INF] The suite's mean deficits at plan spacing (0.5% to 2%, 90th percentile 2% to 5%, section 2.3) are the same order as the measured 24 h decrement of a few percent, so the suite's truth is not exaggerated; the physiology, not only the app's data, limits what any performance-based signal can detect.

### 2.8 What the suite does not cover for plan users

[OBS, suite lines 327-386 and 178-300]: (a) no plan cell logs as prescribed, trains two exercises a muscle, trains eight sets or tires through the sets (every stress cell is `withPlan = false`); my scratch run of plan x reps as prescribed shows 0 of 300 false directions at gate 10, 4 of 300 at gate 4, so the promise holds there, but it is not pinned. (b) Plan exercises follow the calendar week's occurrence, not the routine cycle. (c) The athlete has no soreness, readiness, difficulty, reserve report, entry-edit flag, skipped or shortened session, per-muscle speed, novelty or long-length term in its truth, time of day, or a prescription that follows last week's performance. (d) The truth sits inside the learner's own model class (linear decay, the same T terms). (e) A better learner sees model error as well as signal: any change that raises sensitivity should be re-run against truths outside the model class.

---

## 3. What the app already records that could inform recovery

Completeness is UNKNOWN for every answer-type row: no telemetry event records how often the start-sheet chips or the post-session ratings are answered (`telemetry/events.js`: the closest are `session_adjustment_shown` and `session_adjustment_reverted`, `:134-135`, and the check-in events `checkin_started` and `first_checkin_completed`, `:288-289`) and production was not queried. "Likely" below is read from the screen's structure only.

| Signal | Table.column (scale) | Captured at | Optional? | Likely completeness for a plan user | Read today by |
|---|---|---|---|---|---|
| Weight and reps per set | `workout_sets.weight`, `.actual_reps` | `ActiveWorkoutScreen.js:2821-2833`; the boxes are pre-filled with the live prescription (`:2689-2690`) | no | complete for logged sets, but **as prescribed unless edited**; the prescription shown is not stored, override events are Sentry breadcrumbs only (`:3037-3045`, `observability.js:362-364`) | the learner, progression, records |
| The plan's rep range per set | `workout_sets.target_reps_min`, `.target_reps_max` | `:2827-2828` | no | complete for plan sets | `getAdaptiveLandmarkHistory` (shortfall below the minimum, `database.js:8475-8482`) |
| Set order and logging time | `workout_sets.set_number`, `.created_at` | `database.js:4528-4563` | no | complete | the learner's sort; rest between sets is derivable [INF] |
| The week's planned effort | `mesocycle_weeks.rir_target`, `mesocycles.rir_ladder`; `workouts.mesocycle_week_id` | `database.js:557-566`, `:3934-3954` | no | complete for sessions started from the plan | the learner |
| Reps in reserve, RPE, failed, missed reps per set | `workout_sets.rir`, `.rpe`, `.failed`, `.missed_reps` | **no writer**: `rir` is null unless a recovery-week seed (`ActiveWorkoutScreen.js:2831`), `rpe` null (`:2832`), `failed` false (`:2833`) | n/a | about none (seeds are not effort evidence); the cloud column exists (`supabase/schema.sql:183`, `sync.js:566`) | nothing |
| Per-set pump, connection, joint | `workout_sets.post_set_pump`, `.post_set_muscle_connection`, `.joint_discomfort` | **no caller**: `updateWorkoutSetPostRating` (`database.js:4569`) is never called | n/a | none | nothing |
| Soreness coming in (whole body) | `workouts.soreness_24h_before` (1 to 3: Fresh, Mild, Sore) | the start sheet, `HomeScreen.js:160-179`, flow `:1713-1790`, sheet `:3385-3470`; stored at `database.js:3951-3954` | chip optional; a standing opt-out `@volyume_intent_prompt_off` (`:1757`) | unknown; present only when the chip is tapped | attributed to the PREVIOUS session within 96 h as a lengthen-only rating (`load.js:233-241`); adaptive landmarks (rated sessions only) |
| Sleep, energy coming in | `workouts.sleep_quality`, `.energy_score` (2, 3, 4 on a 1 to 5 domain) | same sheet | optional | unknown | `readinessSummary.js:140-141` wording; why-text in `sessionAdjustments.js:670-686`; **not by the recovery model** |
| Intent | `workouts.pre_workout_intent` (sharp, average, below_par) | same sheet | one tap or Skip | unknown | session easing: below par is one set fewer and 5% lighter (`sessionAdjustments.js:640-662`), so it changes what is logged |
| Post-session ratings | `workouts.session_difficulty` (1 to 5), `.overall_pump` (1 to 3), `.joint_discomfort` (0 to 3), `.fatigue_level` (1 to 5) | `WorkoutSummaryScreen.js:2184-2216`, behind a "Rate this workout" expander; the Recovery screen offers "Rate your last session" for the latest unrated session only (`ReadinessCards.js:597-632`) | optional; unrated stays NULL (`WorkoutSummaryScreen.js:203-206`, `:1026-1035`) | unknown, likely partial | fatigue and joint lengthen the curve (`load.js:216-221`); difficulty feeds progression (`livePrescription.js:757`) and deload (`algorithms.js:1597`); `getAdaptiveLandmarkHistory` reads rated sessions only (`database.js:8491`) |
| Weekly check-in | `weekly_checkins.energy_score`, `.stress_score`, `.sleep_hours`, `.sleep_quality`, `.soreness_score` (1 to 5), `.sore_muscles` (muscle keys), `.joint_pain`, `.training_performance`, and food-adjacent `.cals_adherence`, `.steps_*`, `.cardio_adherence` | `WeeklyCheckInScreen.js:309-341`, `:870-898` | energy and soreness required | **zero for anyone who does not weigh in**: open only on the scheduled day, after 5 days of data, with 3 distinct weigh-in mornings in the trailing 7 days (`:441-460`, `:671-676`; `trialActivation.js:23-24`) | weeklyCoach's recovery score and the rapid-loss calorie raise (`:783-789`): **ED-woven, excluded** |
| Gaps between sessions | `workouts.started_at` | automatic | no | complete | the learner; `ownGapsFromHistory` (`planPersonalisation.js:90-113`) |
| Skipped or ended-early planned session | `session_resolutions.resolution` (`skipped_by_user`, `ended_early`), keyed by week and routine | `HomeScreen.js:1528-1565`, `ActiveWorkoutScreen.js:4144-4190`, `database.js:6538-6600` | only on those actions; no reason asked | complete for those actions | progression; not the learner |
| Shortened sessions | `workouts.duration_minutes`, `.active_elapsed_seconds`, `.set_count` against the planned sets | automatic | no | complete | derivable [INF] |
| Time of day | `workouts.started_at` | automatic | no | complete | not read: the learner pairs weekday, not hour |
| Injury episodes | `capability_constraints` | settings | yes | n/a | the learner's exclusion |
| Weight, food, calories, steps, cardio | `morning_weights`, `food_entries`, `nutrition_targets`, `daily_steps`, `cardio_log` | | | | **never** (CLAUDE.md section 2) |

Two facts that shape every candidate: **the reps a plan user logs are the plan's unless they edit them** (section 2.4: 74% of simulated athletes who log as prescribed are left out as `fixed_reps`), and **the effort actually reached is recorded nowhere**: the register's own note (D210 addendum 3, "a comparison across effort targets would need the effort actually reached") still stands.

---

## 4. Candidate stronger signals

Five candidates, each with what it measures, the evidence, how it enters the deterministic learner, what it needs, its ED-safety position and its risks, and what I measured of its headroom. The ED position is stated the same way for all: each reads only training fields (never weight, food or calories); the pattern for holding a learner under calm mode or an open ED flag, failing closed on a read failure, is `blockLedgerRunner.readSuppression` (`blockLedgerRunner.js:212-218`); **the existing learner is not held that way (F8)**, so "respect both" is new behaviour for any of them and the choice between holding only new prompts or the whole learner is the lead's and the founder's. Any new prompt must also meet `docs/rules/plain-english.md`, D204 (describe, never instruct) and the no-em-dash rule.

### Candidate A. The effort actually reached (reps in reserve, logged by the person)

- **Measures.** How many more reps the person says they could have done at the end of an exercise (0, 1, 2, 3 or more), so each session is read at its real effort instead of the plan's, and any two sessions can pair at any two effort levels, with or without a plan.
- **Evidence.** The scale is valid against bar velocity: RIR-based RPE against mean velocity r = -0.88 in experienced and -0.77 in novice squatters, n=29 (Zourdos 2016, PMID 26049792, [LIT-B]); RIR-based, sessional and post-set RPE are among the measures "strongly associated with training performance" (r at least 0.68) in a search-based review of 90 studies (Helms 2020, PMID 33312273, [LIT-C]). Accuracy is the limit: absolute error 0.65 (SD 0.78) reps at 1 and 3 RIR, raw -0.17 (SD 1.00), n=24 trained, bench (Refalo 2024, PMID 37967832, [LIT-B]); under-prediction of 0.95 reps (95% CI 0.17 to 1.73), 12 studies, 414 people, I-squared 98%, better near failure, with heavier loads and in later sets, between-person SD 1.45 (Halperin 2022, PMID 34542869, [LIT-A]); 2.0 reps (0.0 to 4.0) in knee extension (Armes 2020, PMID 33424678, [LIT-B]). As a **recovery marker** the evidence is indirect: autoregulation is built to follow daily fatigue and readiness (Larsen 2021, PMID 33520457, [LIT-A]) but autoregulated and percentage loading did not differ in 1RM (mean difference 2.07 kg, 95% CI -0.32 to 4.46; Hickmott 2022, PMID 35038063, [LIT-A]); no study found validates reserve at a fixed load as a marker of time since the last session. Grade for this use: C.
- **Enters the learner as.** The reserve in `meanFirstAtPlannedEffort` (`personalRecovery.js:253-257`, `:422-424`) comes from the logged value for each session's lift when present, the plan's when not; with logged reserves on both sessions the pair no longer needs equal or planned effort, which admits non-plan users and removes the dependence on the plan's ladder. A guard like the fixed-reps rule: a lift whose logged reserve equals the plan's target at least half the time adds no information and is read as planned. Deterministic; no randomness.
- **Needs.** New UI: one tap per exercise or per set after the last working set, blank by default and never pre-filled (the earlier silent `rir: 2` default is recorded as a fabrication at `ActiveWorkoutScreen.js:126-133`). The column exists locally and in the cloud (`workout_sets.rir`, `supabase/schema.sql:183`, `sync.js:566`), but recovery-week seeds already write 4 into it, so a new flag or a new column is needed to tell genuine from seeded. **A founder ruling reverses D96 FQ-3(b).**
- **ED position.** Training effort only: no weight, food or calories. The existing start-sheet answers are shown under calm mode today. To hold a new tap, or the learner's use of it, under calm mode or an open ED flag it would sit behind `readSuppression` (fail closed).
- **Risks.** Noise: the reserve error (0.65 to 1.45 reps, about 2% to 4% of the estimated max at 8 to 10 reps) is the same size as the signal; people who stop when they believe they are at the plan's reserve will log the plan's reserve, so the part of the deviation they cannot see (their prediction error) is exactly what the tap cannot report [INF]; burden (the picker was removed as "rarely used", `SetEntry.js:488`); under-prediction grows with distance from failure, the plan's RIR 2 to 3 weeks.
- **Headroom measured.** Section 2.6: perfect record x1.2 to x1.3 in the median; error 0.65 reps x0.9 to x1.1; error 1.0 x0.7. In the stack it adds x1.1 to x1.4 and no more.
- **Simulation to add.** An athlete whose deviation from the plan's reserve has a part it knows (a chosen early stop, a pushed last set) and a part it does not (prediction error); a report with error SD 0.65, 1.0 and 1.45 reps, under-prediction growing with distance from failure, anchoring on the plan's reserve for 0%, 50% and 90% of reports, skipping 0%, 50% and 80%; the same cells for a person who always logs 0 and one who always logs the plan's number; every cell with and without a plan; the pinned bounds unchanged.

### Candidate B. How recovered the person says they feel walking in, scored against the model's prediction (a level signal)

- **Measures.** The whole-body soreness chip that exists today (`workouts.soreness_24h_before`, 1 to 3), or a new per-muscle tap for the muscles the session trains: a symptom level at the moment the model predicts a recovered fraction for each muscle.
- **Evidence.** Perceived recovery tracks recovery of performance within a person: against jump height r = .84 and mean bar velocity r = .80 at 24, 48 and 72 h after 8 x 10 squats at 70% 1RM, n=11, "the relationship is individualized; equal scores in two people are not indicative of similar recovery" (Tolusso 2022, PMID 35255478, [LIT-C]); against velocity r = .78 across the sets of one squat session, n=10 (Buoncristiani 2024, PMID 38134896, [LIT-C]); subjective measures followed acute and chronic training load with better sensitivity and consistency than objective ones, and the two "generally did not correlate", 56 studies (Saw 2016, PMID 26423706, [LIT-A]); soreness and perceived recovery worsened as sets neared failure (Refalo 2023, PMID 36752989, [LIT-B]); consensus on systematic monitoring of recovery and its large inter- and intra-individual variability (Kellmann 2018, PMID 29345524, [LIT-D]). **Against it:** soreness and function run on different clocks (soreness lasted 72 h, peak torque returned at 96 h and total work had not returned by 96 h; Ferreira 2017, PMID 28595855, [LIT-B]); soreness "is a poor reflector" of damage, correlations under 0.32, n=110 (Nosaka 2002, PMID 12453160, [LIT-B]). So the level can be trusted as a within-person symptom, not as a muscle's time to function recovery. Grade for the use here: C for the within-person tracking, D for a muscle-specific speed.
- **Enters the learner as.** A second evidence stream beside the performance pairs. For every session with an answer, the model already yields each trained muscle's predicted recovered fraction at that instant under every candidate factor (`fractionsAt`, `personalRecovery.js:369-387`); an ordinal likelihood with a bounded slope (as s is bounded) and a person-level reporting intercept taken from **anchor sessions** (the muscle untrained for 7 or more days, or the first session after a recovery week), maximised over the same grid; its own gate set by the simulation, as `PERSONAL_LR_MIN` was. Deterministic. If the soreness answer is used as an outcome it must stop being an input to the same curve (`load.js:233-241` lengthens T from it today), or it counts twice.
- **Why it is the only candidate that can work on a fixed schedule.** Performance has no zero, so it needs two observations that differ; a symptom has a zero (fresh), so a level is informative on its own. On the suite's fixed structures a 1.4 recoverer starts 29% to 83% of lift-sessions below 90% recovered at the reference dose (section 2.3) while the performance deficit is 0.5% to 2.1%: the state is there, the performance outcome cannot see it. [INF]
- **Needs.** Nothing for the whole-body chip (it exists; completeness UNKNOWN). A per-muscle tap is new UI at the start sheet: more burden, and a body-focused question for calm-mode users. A change to the weekly check-in is excluded (F6, STOP item 3).
- **ED position.** Symptoms, not weight or food; the start sheet is not suppressed by calm mode today. A new per-muscle body prompt is a judgement (calm mode "softens" the app), and holding it, or the learner's use of the answers, under calm mode or an open ED flag would sit behind `readSuppression` (fail closed): open point for the lead.
- **Risks.** Identifiability: a person who always says "Sore" cannot be told from a slow recoverer without anchors; novelty, eccentric and long-length work cause soreness the clocks already model separately; a whole-body answer cannot name the muscle; the floor ("Fresh") means it can only find "slower" (one-sided; the safe direction for a plan); the chips are optional, can be switched off for good, and are missing not at random; the link from predicted recovery to a reported level has no calibration data at plan doses and ordinal resolution (D-grade).
- **Headroom measured.** None: a simulation needs an assumed link, which would make the number an artefact of the assumption. What I can say is structural (above).
- **Simulation to add.** A soreness generator with: a link from the true recovered fraction (weak, medium, strong); drivers independent of recovery (novelty, eccentric and long-length exercises, the day's mood); person-level reporting bias (SD 0, 0.5 and 1 on the logit); whole-body aggregation (the worst of the muscles trained in the last 72 h); missing not at random (skip and opt-out more likely on sore days); anchors absent for some athletes; cells for fixed and varied schedules, with a truth equal to the start and "soreness from novelty only", and bounds as today.

### Candidate C. Was the pre-filled entry kept or changed (entry provenance, per set)

- **Measures.** Whether each logged weight and reps is what the screen filled in or what the person typed. Not a recovery marker: a measure of whether a logged number is a measurement.
- **Evidence.** Internal: D210 addendum 3 (a lifter who stops at the prescribed reps logs no drop); scratch, plan x reps as prescribed: median counted pairs 0, 74% of athletes (223 of 300) left out as `fixed_reps`, 24% reach 8 pairs (section 2.1); the funnel loses 32 of 38 pairs (section 2.4). No literature is needed for the flag itself.
- **Enters the learner as.** The fixed-reps rule (`:436-458`, today a share of identical reps per lift) becomes a per-set fact: typed sets count as measured; unedited sets are right-censored (the person met at least the prescription). A censored set adds loss only where a candidate predicts a shortfall that the unedited set shows did not happen; or it is simply left out. Deterministic.
- **Needs.** One nullable column on `workout_sets` (additive, local migration, a founder-gated cloud migration under "run against production", a sync mapping); the app already compares an entry with the value it was seeded with, to decide whether anything is unsaved (`hasInProgressSetEntry`, `ActiveWorkoutScreen.js:1916-1922`; the seed is written at `:2690`), and compares each logged set with the presented prescription (`:3037-3045`), so the flag is known at log time. No new UI, no burden.
- **ED position.** Training logging only; no weight, food or calories; no new prompt, so nothing to hold under calm mode, and the learner's use of it follows whatever the lead decides for the learner as a whole (F8).
- **Risks.** Typed-over sets are a selected sample (people edit when the day is unusual), so they are biased toward unusual days; "typed" is not "measured" (a person can retype the same number); the gain is bounded by the share of sets people edit, which is UNKNOWN.
- **Headroom measured.** Not measurable without the share of edited sets; the suite's 'prescribed' style caps every set at the prescribed reps, a worst case.
- **Simulation to add.** A per-set edit probability that depends on the day (tired days edit down; fresh days seldom edit up), censoring at the prescription, an athlete who retypes the plan; plan x prescribed cells at the suite's scale.

### Candidate D. Pair by routine slot, not by weekday, when the person's own weekdays are irregular (a guarded pair rule)

- **Measures.** Nothing new: the same lift, compared with its most recent earlier session on any weekday, when the weekday is not what sets the gap.
- **Evidence.** Internal: section 2.6. Usable days 10 to 23 and the statistic x1.6 to x1.8 for varied-schedule plan users; slower recoverers found at gate 4 rise from 2% to 9% (1% to 11% with the routine-cycle assignment); false directions at 1% or less; **unsafe on a fixed schedule** (false direction 4% at gate 10, wrong direction 2%; 17% and 15% at gate 4). Time of day is a nuisance this rule meets: strength peaks in the early evening (Atkinson and Reilly 1996, PMID 8726347, [LIT-D]), and the suite's athlete always trains at 18:00 (+/- 1 to 3 h).
- **Enters the learner as.** The baseline walk (`personalRecovery.js:403-415`) drops the weekday test when a guard says weekday does not determine the gap: a habit read (`deriveHabitualTrainingWeekdays`, `trainingHabitSchedule.js:72`, already read by `load.js:363-373`), or the person's own gap-by-weekday history. Fixed or habitual schedules keep the weekday rule. A deterministic threshold needing calibration.
- **Needs.** Nothing from the person.
- **ED position.** Training timestamps only; no weight, food or calories; no new prompt; the learner as a whole is the open point (F8).
- **Risks.** The guard's threshold is a new tunable; weekday effects exist in the suite by assumption only (no published magnitude); a person who looks irregular but has a hidden weekly structure (a fixed weekend gap) is the failure case; time of day is not controlled.
- **Headroom measured.** Section 2.6: the largest of the five on a varied schedule, still short of the gate alone (median 1.1 to 1.2 for a plan user).
- **Simulation to add.** Irregular schedules with weekday-coupled gaps (a long weekend gap with varied weekdays inside it), shifting habits, time-of-day variation (a random start hour, a circadian term), a guard that flips between runs; cells at the full scale with false direction held at the bounds for every athlete type.

### Candidate E. Sleep and energy as day-effect covariates (existing chips used to take noise out)

- **Measures.** How the person slept and their energy, as covariates for the shared day effect (31% of the comparison's noise variance in the suite), not as recovery markers.
- **Evidence.** Sleep loss lowers performance: mean change -7.56% (95% CI -11.9 to -3.13), 69 publications, I-squared 98%, with about 0.4% lost per hour awake before the task under deprivation and late restriction (Craven 2022, PMID 35708888, [LIT-A]); inadequate sleep impairs maximal strength in compound movements, with little effect from total deprivation, 17 studies of moderate or weak quality (Knowles 2018, PMID 29422383, [LIT-A]). The chips are three-level (Poor, OK, Good) and not hours.
- **Enters the learner as.** A bounded term in each muscle's fit (y = a + g x days + s x x + beta x (chip at B minus chip at P), beta held to one sign), or y pre-adjusted by the chip difference. Use sleep and energy only: soreness is a mediator of recovery and adjusting for it would remove the signal. Deterministic.
- **Needs.** Nothing new; completeness UNKNOWN (optional chips, standing opt-out).
- **ED position.** Sleep and energy are wellbeing answers, not weight or food; the sheet is not held by calm mode today; no new prompt, so the only question is whether the learner's use of the answers is held (F8).
- **Risks.** Missing not at random; a three-level, optional answer explains little of the day effect; the below-par answer eases the session (one set fewer, 5% lighter: `sessionAdjustments.js:640-662`), changing what is logged; with a shared day effect that is mostly not sleep (mood, stress, caffeine, food, equipment) the covariate takes out only part.
- **Headroom measured.** Section 2.6: day effect halved x1.3 to x1.4, removed x1.5 to x1.6 in the median (varied schedule); three-level optional chips explain far less than a halving [INF].
- **Simulation to add.** A day effect that is partly sleep (a stated share), chips that report it coarsely (three levels, noisy, skipped 30% to 80% with the skips tied to bad days), a below-par easing that changes load and sets, and a shared effect the chips cannot see.

### Also considered and set aside

| Idea | Why not (evidence) |
|---|---|
| Total reps across all working sets ("ability to repeat") | The evidence is the best of any performance marker: total work fell 25% and peak torque 17% right after 8 bench sets to failure, total work stayed below peak torque at 24, 48 and 96 h and had not returned at 96 h (Ferreira 2017, PMID 28595855, [LIT-B]); volume load fell 24 h after failure sets and first-set volume load stayed down at 48 h (Goulart 2021, PMID 32594858). But the suite's athlete has no within-session fatigue that depends on recovery, so no headroom can be computed, and as-prescribed logging caps every set at the prescription. The learner reads the first three sets by design (`:419`). Keep as a variant of the outcome to test once the athlete is extended. |
| Shifted and skipped sessions as natural experiments | Real, free data (`session_resolutions`, timestamps). Scratch: a quarter of sessions shifted a day lifts spread 0.07 to 0.20 on Mon/Wed/Fri plan but the median stays 0.68 to 1.05 (1% to 7% at gate 4). Folded into candidate D's guard. |
| Heart rate variability, resting heart rate from a wearable | New dependency (the repo has no HRV; `constants.js:15-19`), a new Article 9 consent surface, whole-body not per muscle; the review evidence is from endurance athletes with small effects (Bellenger 2016, PMID 26888648, [LIT-A]). Needs the founder's yes on a dependency. |
| Bar velocity, jump or grip tests | No sensor; a test is a burden and off-brand for a logging app. Velocity and jump are the best objective markers in the studies above; the app cannot capture them. |
| The weekly check-in | Weight-gated, ED-woven (F6). |
| A longer window (84 to 168 days) | The statistic scales with days, so doubling the window doubles it at best; older sessions carry progression and a changed plan. A parameter, not a signal; section 2.5's gap is about 15 times. |
| Failure sets or AMRAP tests added to plans for the learner | Contradicts founder Q5 (stop one rep short) and adds fatigue; a free-choice AMRAP is left out of the learner today for a reason (`:209-210`). |

---

## 5. What the safety simulation needs to add, by candidate

The suite's job is to hold two promises over every cell: at most 5% shown any direction when truth equals the start, and at most 1 in 60 the wrong one. Any new signal changes the scale of the clarity statistic, so the gate must be re-derived the way `PERSONAL_LR_MIN` was (the smallest value meeting both promises over every cell, full run at 600 a cell, about 11 minutes on a single core now; each added cell adds about 20 s) and pinned again (`CALIBRATED_GATE`, `:86`, `:443-446`).

| Candidate | New athlete behaviour and cells |
|---|---|
| Common to all, for plan users | Plan x logged as prescribed, x two exercises a muscle, x eight sets, x tiring through the sets (the suite has none); exercise assignment by routine cycle; plan cells at the reference dose of 6 sets a muscle; irregular schedules whose gaps depend on weekday; time of day; truths outside the learner's model class (exponential decay, per-muscle speeds, novelty and long-length terms in the truth); a prescription that follows last week's performance; missing answers not at random |
| A. Logged reserve | Known and unknown parts of the deviation; report error 0.65, 1.0, 1.45 reps; anchoring on the plan; skipping; a person who always logs 0 or the plan's number |
| B. Soreness or readiness level | Link strength; drivers that are not recovery; reporting bias; whole-body aggregation; anchors absent; missing not at random; truths "novelty only" and "bias only" |
| C. Entry provenance | Edit probability that depends on the day; censoring at the prescription; an athlete who retypes the plan |
| D. Pair by routine slot | Weekday-coupled irregular schedules; a guard that flips; time of day; the full set of fixed schedules re-run as the confound check (the 4% and 2% found above are the result to beat) |
| E. Sleep and energy covariates | A day effect that is part sleep; coarse chips; skipped on bad days; the below-par easing |

---

## 6. Open points for the lead (recorded, not interpreted)

1. **The reach premise (F1).** At the pinned gate nobody is served, plan or not. `14-PERSONAL-LEARNING-V2.md` section 0 (the gate on comparisons, and "123 of 600") and section 5 (the `pairs x ln` statistic), `03-SCIENCE.md` Q10 row 22 and Q11d, and the register's D210 addendum 3 figures predate addendum 5; the code uses workout days. The design needs a success criterion the evidence can meet; sections 2.5 and 2.6 give what the tested levers are worth (a stack reaches a median of about 2 against 10). The register says lowering the gate "was refused by the session's safety check and is not pursued": I have not tested a different decision framework.
2. **D96 FQ-3(b)** (founder ruling received 2026-08-10, `docs/first-use-audit-2026-08-10/D96-RULINGS.md:352-396`, the text at `:387-396`): the per-set RIR picker stays removed and effort is never fabricated per set. Candidate A reverses it and needs a new founder decision; its measured headroom is small (F5).
3. **The weekly check-in** is gated on weigh-ins (`WeeklyCheckInScreen.js:671-676`), its energy and soreness feed the rapid-loss calorie path (`:783-789`), and the isolation guard keeps the five ED modules from importing `src/lib/recovery/` (`edIsolation.guard.test.js`). Using it, or changing its screen, is ED-woven and outside this lane.
4. **Calm mode and the ED flag.** The existing learner and card read neither (F8). Whether to hold the whole learner, only new prompts, or neither is a decision; the pattern exists (`blockLedgerRunner.js:212-218`).
5. **Design against code (F7).** `slowerDirectCapFloor` has no consumer, so the factor reorders the rotation and scales the readiness shown, nothing more (`planner.js:123-153`, `:257-279`); the learner's candidate curves omit the three D219 terms although `recoveryHoursAcross` supports them (`recoveryClocks.d219.test.js:26`). Both bear on what "more learning" buys a person on a plan.
6. **Suite assumptions not checked against people:** the weekday effect (no published size found), the noise sizes, truth inside the model class, and the dose (4 sets a muscle against the plan's 6).
7. **UNKNOWN, needs real data if the founder wants it:** the share of plan users on fixed weekdays, the share who answer the start-sheet chips and the post-session ratings, the share who log as prescribed. An aggregate, non-identifying count from production would settle all three; I did not query production.

---

## Appendix A. Sources (PubMed IDs; abstracts opened through NCBI efetch on 2026-10-05)

| Source | PMID | Used for |
|---|---|---|
| Zourdos 2016, J Strength Cond Res 30(1):267-75 | 26049792 | RIR-based RPE against velocity |
| Helms 2016, Strength Cond J 38:42-49 | 27531969 | RIR scale in practice |
| Helms 2020, J Hum Kinet 74:23-42 | 33312273 | monitoring and regulating methods, 90 studies |
| Refalo 2024, J Strength Cond Res 38(3):e78-e85 | 37967832 | RIR prediction accuracy |
| Halperin 2022, Sports Med 52:377-390 | 34542869 | accuracy meta-analysis |
| Armes 2020, Front Psychol 11:565416 | 33424678 | under-prediction of reps to failure |
| Lovegrove 2022, J Strength Cond Res 36:2696-2700 | 36135029 | reliability of RIR load prescription (novice) |
| Larsen 2021, PeerJ 9:e10663 | 33520457 | autoregulation review |
| Hickmott 2022, Sports Med Open 8:9 | 35038063 | load autoregulation meta-analysis |
| Refalo 2023, Sports Med Open 9:10 | 36752989 | proximity to failure, fatigue and perceptual responses |
| Tolusso 2022, Int J Sports Physiol Perform 17:886-892 | 35255478 | perceived recovery status |
| Buoncristiani 2024, Int J Sports Physiol Perform 19:242-248 | 38134896 | perceptual recovery within a session |
| Saw 2016, Br J Sports Med 50:281-91 | 26423706 | subjective against objective monitoring |
| Kellmann 2018, Int J Sports Physiol Perform 13:240-245 | 29345524 | recovery consensus |
| Ferreira 2017, Physiol Behav 179:143-147 | 28595855 | peak torque, total work and soreness time courses |
| Nosaka 2002, Scand J Med Sci Sports 12:337-46 | 12453160 | soreness against damage |
| Goulart 2021, Eur J Sport Sci 21:935-943 | 32594858 | volume load recovery |
| Moran-Navarro 2017, Eur J Appl Physiol 117:2387-2399 | 28965198 | failure against non-failure |
| Vieira 2022, Sports Med 52:1103-1125 | 34881412 | failure meta-analysis |
| Bartolomei 2017, Eur J Appl Physiol 117:1287-1298 | 28447186 | high volume against high intensity recovery |
| Grgic 2020, Sports Med Open 6:31 | 32681399 | 1RM test-retest reliability |
| Craven 2022, Sports Med 52:2669-2690 | 35708888 | sleep loss and performance |
| Knowles 2018, J Sci Med Sport 21:959-968 | 29422383 | inadequate sleep and strength |
| Atkinson and Reilly 1996, Sports Med 21:292-312 | 8726347 | circadian variation in strength |
| Bellenger 2016, Sports Med 46:1461-86 | 26888648 | heart rate variability in endurance athletes |

## Appendix B. Method notes and limits of the scratch runs

- The scratch lab lives in the session scratchpad (`.../scratchpad/l1/`: `lib/lab.js`, `lib/e1common.js`, `lib/e2common.js`, and the tests e1 to e4), not in the repo, and will not survive the session; every figure above is recorded here with its N. Its pieces: the suite's athlete with noise switches (day, exercise, set, weekday SDs; reserve jitter; whole-rep rounding), a side table of the reserve each lift really stopped at, and a copy of the learner's pairing and fit with hooks (pair rule, outcome, effort comparison, a funnel counter). Added schedules: Mon/Wed/Fri and Mon/Thu with a quarter of sessions shifted a day; added styles: exercise by routine cycle, true clocks including novelty and long length, six sets a muscle (two exercises of three sets).
- Sample sizes: reach 300 a truth (200 for the 6-set cells); signal against noise 100; noise sources, logged reserve and pairing 150; stacks 200; funnel 100; the repo's own runs 60 and 600. Differences of a few points between cells at N=150 are within sampling noise; the large effects (0%, 2% to 25%, x1.2 to x1.8 on a median) are not.
- "Found at gate g" uses the suite's own `directionAt`. "Wrong" means the opposite direction to the truth. A gate below 10 is shown only to describe the statistic; the register does not pursue it.
- Not tested: truths outside the learner's model class, a soreness generator, per-set edit behaviour, time of day, real schedules, and anything on a real person's data.
- Commands for the repo's own results: `PERSONAL_SIM_REPORT=1 npx jest src/lib/recovery/__tests__/personalRecovery.simulation.test.js` (everyday, 69 s) and `PERSONAL_CALIBRATION=full npx jest src/lib/recovery/__tests__/personalRecovery.simulation.test.js` (666 s).
