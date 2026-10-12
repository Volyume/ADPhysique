# 01 "Mens Physique Off Season - Allan": build spec (lead rulings, 2026-10-12)

Authority: `00-FOUNDER-PLAN.md` (verbatim, the founder's document) and register D227 with its addenda (the plan starts at Ramp 1 when selected; phases as blocks; check-ins as for every plan inside the plan's ceilings; closed exercise list; sets only onto prescribed exercises). Recon of today's coach (2026-10-12, read-only map; file:line references below are from it). House rules: CLAUDE.md Section 2 and 3. Every ruling is D33.

Recon finding that frames everything: a library plan installed today would NOT run the document. Install starts a standard 6-week block with template volume; the next screen open rebuilds the copy through the planner's fixed mode, which re-sets every exercise's sets from the profile and the house caps (planRebuild.js rebuildFixed :391); the laterals are capped at 3 (4 for a focus), sessions at 8 direct sets, check-ins step +3 on every muscle, and the side delts Monday to Tuesday fail the readiness check. Each lever below changes that for an AUTHORED plan only (`facts.kind === 'authored'`); every other plan behaves exactly as today.

## A. The plan as data (one authored definition)

**A1 Definition.** `src/lib/library/offseasonAllan.js` (pure data, exported), plus its entry in `seedRoutines.js LIBRARY_PLANS` (name `Mens Physique Off Season - Allan`, tags `gender:men`, `goal:mens_physique`, `equipment:machines_cables`, `authored`), seed key bumped to v18. Visible to every user (library plans are; getLibraryPlans has no owner filter).

**A2 Sessions and exercises** exactly as the document's section 2 (order, rep ranges, rest: the lower bound of each rest range in seconds, e.g. "2-3 min" = 150 s as the midpoint rounded to 15 s; "60-90 s" = 75 s; "90 s-2 min" = 105 s). Library rows (ids from the recon; resolved by name at seed time as today):
- Day 1 Back Width A: Plate-Loaded Lat Pulldown; Single-Arm Lat Pulldown; Machine Row (Chest Supported); Single-Arm Cable Lateral Raise; Reverse Pec Deck; Preacher Curl Machine; Kneeling Cable Crunch.
- Day 2 Upper Chest: Incline Machine Press; Converging Chest Press Machine; Cable Fly (Low to High); Machine Lateral Raise; Cable Overhead Tricep Extension; Tricep Pushdown (Rope); Machine Crunch.
- Day 3 Legs: Seated Leg Curl; Hack Squat Machine; Leg Extension; Standing Calf Raise (Machine); Single-Arm Cable Lateral Raise; Cable Straight-Arm Pulldown.
- Day 4 Back Width B: V-Bar Pulldown; Iso-Lateral Front Pulldown; Wide-Grip Cable Row; Machine Lateral Raise; Reverse Cable Crossover; Cable Curl; Cross-Body Cable Tricep Extension.
Session names in the app: "Back Width A", "Upper Chest & Arms", "Legs, Delts & Lats", "Back Width B & Arms". Days are a rotation, not fixed weekdays (the app's rotation; the suggested days Mon, Tue, Thu, Sat go in the plan description).

**A3 Substitutions** per exercise exactly as the document lists them (section 2 "Substitutions"), resolved to library rows; four rows are MISSING from the library and are ADDED to the corpus with full metadata (primary muscle, equipment, compound/isolation, pattern): Cable Preacher Curl; Seated Cable Chest Press; Neutral-Grip Machine Pulldown; Single-Arm High-Pulley Seated Cable Row. Single-Arm Cable Lateral Raise gets its `lateral_raise` subregion. Optional Growth trial: Machine Shoulder Press (2 sets, RIR 2 or more, offered only in Growth, never served by default; the document's "only if completely pain-free" is its note).

**A4 Notes.** Each exercise's note is its cue rewritten in plain British English (house rules, no citations, no em dash), plus: the warm-up line on the first exercise of Days 1, 2 and 4 ("Warm up with 2 light sets of cable external rotation and 1 to 2 very light sets of this exercise." Not logged as working sets); the Growth-only optional lengthened partials line on the final set of calves, laterals and leg curls. Excluded from the library copy (D227 point 4): the shoulder history as a diagnosis, physio, doctor and bloods, show dates, anything about enhanced use. The general rules stay in the plan description: no flat pressing, dips, upright rows, behind-the-neck work, deep fly stretches or heavy overhead pressing; laterals in the scapular plane to about shoulder height; work in a pain-free range.

**A5 The set ladder per exercise** (the founder's numbers; ramp weeks allocated by the lead in the document's order: lats and side delts, then rear delts and upper back, then chest and arms, then legs; never a new exercise). Health (H) is the reference only; the plan starts at Ramp 1.

| Exercise | H | Ramp 1 | Ramp 2 | Growth (G) | Reduction |
|---|---|---|---|---|---|
| D1 Plate-Loaded Lat Pulldown | 3 | 4 | 4 | 4 | 2 |
| D1 Single-Arm Lat Pulldown (per arm) | 2 | 2 | 3 | 3 | 2 |
| D1 Machine Row (Chest Supported) | 2 | 2 | 2 | 3 | 1 |
| D1 Single-Arm Cable Lateral Raise | 3 | 4 | 5 | 5 | 3 |
| D1 Reverse Pec Deck | 2 | 3 | 3 | 3 | 2 |
| D1 Preacher Curl Machine | 2 | 2 | 3 | 3 | 2 |
| D1 Kneeling Cable Crunch | 2 | 2 | 2 | 3 | 2 |
| D2 Incline Machine Press | 3 | 3 | 4 | 4 | 2 |
| D2 Converging Chest Press | 2 | 2 | 3 | 3 | 2 |
| D2 Cable Fly (Low to High) | 2 | 2 | 2 | 3 | 1 |
| D2 Machine Lateral Raise | 3 | 4 | 4 | 5 | 2 |
| D2 Cable Overhead Tricep Extension | 2 | 2 | 3 | 3 | 2 |
| D2 Tricep Pushdown | 2 | 2 | 2 | 2 | 1 |
| D2 Machine Crunch | 2 | 2 | 2 | 3 | 1 |
| D3 Seated Leg Curl | 3 | 3 | 3 | 4 | 2 |
| D3 Hack Squat Machine | 2 | 2 | 3 | 3 | 2 |
| D3 Leg Extension | 2 | 2 | 2 | 3 | 1 |
| D3 Standing Calf Raise | 3 | 3 | 3 | 4 | 2 |
| D3 Single-Arm Cable Lateral Raise | 3 | 4 | 5 | 5 | 3 |
| D3 Cable Straight-Arm Pulldown | 2 | 2 | 2 | 3 | 1 |
| D4 V-Bar Pulldown | 3 | 4 | 4 | 4 | 2 |
| D4 Iso-Lateral Front Pulldown (per arm) | 2 | 2 | 3 | 3 | 2 |
| D4 Wide-Grip Cable Row | 2 | 3 | 3 | 3 | 2 |
| D4 Machine Lateral Raise | 3 | 4 | 4 | 5 | 2 |
| D4 Reverse Cable Crossover | 2 | 2 | 2 | 3 | 1 |
| D4 Cable Curl | 2 | 2 | 2 | 3 | 1 |
| D4 Cross-Body Cable Tricep Extension | 2 | 2 | 2 | 3 | 1 |
| **Total** | **63** | **71** | **80** | **93** | **47** |

Weekly direct sets: Ramp 1: lats 14, side delts 16, rear delts 5, upper back 5 (others Health). Ramp 2: lats 16, side delts 18 (5 on Days 1 and 3, 4 on Days 2 and 4, fewer on the day after Day 1), chest 9, biceps 5, triceps 7, quads 5. Growth: the document's table (lats 17, side delts 20, chest 10, upper back 6, rear delts 6, biceps 6, triceps 8, abs 6, quads 6, hamstrings 4, calves 4). Reduction (the document's "~47 (half of Growth)", same exercises): each muscle's Growth sets halved, rounded half up per muscle (lats 9, upper back 3, side delts 10, rear delts 3, chest 5, biceps 3, triceps 4, abs 3, quads 3, hamstrings 2, calves 2 = 47), spread over its exercises largest first, every exercise keeping at least 1 set. An earlier draft rounded each exercise up (57); RULED against it, because it overruled the founder's own figure by a rounding choice.

**A6 Effort (RIR) per phase and type**, from the document: Ramp 1: compound 2, isolation 1 to 2. Ramp 2: compound 2, isolation 1. Growth: compound 1 to 2, isolation 0 to 1 (true failure only on the final set of a machine or cable isolation exercise). Reduction: compound 3, isolation 2 to 3. The block's week RIR (`mesocycles.rir_ladder`, read by the recovery model) is the compound value's lower bound; each exercise shows its own target effort in plain words in the logger ("Stop 1 to 2 reps before you could not do another." / Growth isolation: "Stop 0 to 1 reps short. The last set may go to failure.").

## B. Blocks (mesocycles)

**B1 Block 1 (8 weeks):** Ramp 1, Ramp 2, Growth x 5, Reduction. This is the document's weeks 5 to 12 (Ramp 1 to 3, Growth 8 to 11, reduction 12), Ramp 3 being the first Growth week. `planned_weeks` 8, recovery week 8.
**B2 Block 2 and on (8 weeks each):** Growth x 7 from the level the previous block reached (its check-in raises carried forward), Reduction at week 8. Two blocks are the founder's 16 weeks; a third takes it to 24 (the founder ends the off-season by choosing another plan).
**B3** The block's weekly planned volume (`planned_muscle_volume`) is written from the authored ladder (A5), never from the template or learned rows, at activation, at every next block, and after every check-in Apply. The rir ladder is written from A6.

## C. Serving exactly what is written

**C1** An authored plan is served its own per-exercise sets for the block week (as phase 6's structure ladder is: a stored per-exercise ladder overrides prescribeWeek; typed counts still win). Plan-level overrides replace the house caps for this plan only: per-exercise caps (laterals up to 7, leg curl and calves 4 in Growth, the founder's numbers); per-session caps (side delts 7 direct; back 10 direct, 12 counted; chest 10 direct); no STANDARD_DIRECT_FLOOR raise (legs stay at the document's minimum-effective dose: the document's MP-specific ruling).
**C2** The planner's fixed-mode rebuild never touches an authored plan (planRebuild skips `kind: 'authored'`; facts are seeded with the library programme and copied with routine ids re-keyed in copyPlanFromLibrary).

## D. Check-ins (the coach as now, aimed where the document says)

**D1** The weekly check-in's signal is computed exactly as today (recovery, performance, soreness, joint pain, illness).
**D2** Raise (signal 2 or more) on this plan, Growth weeks only: one more set a week to lats and one to side delts (the document's 13+ rule, now driven by the coach's own raise signal), placed onto prescribed exercises: side delts onto the lateral raise with the fewest sets, Days 3 and 4 before Day 1 and Day 2 last (Day 2 follows Day 1); lats onto the isolation or single-arm pulldowns first (Single-Arm Lat Pulldown, Cable Straight-Arm Pulldown, Iso-Lateral Front Pulldown), the main pulldowns last. Ceilings: lats 20, side delts 22 a week; never more than 7 direct sets of either in one session. A stalled exercise (E2) never takes a raised set.
**D3** Signal 1 (keep climbing): during the ramp, the ladder's next week; in Growth, no change. Hold: next week repeats this week (the ramp pauses one week; later weeks move back one). Pull back (signal negative): the coach's pull-back as now, applied to every muscle, never below the Health numbers.
**D4** The legs rule: the check-in for this plan asks one extra question in its own style, "Do your legs look flat in your shorts?" Yes: one more set each to quads (Leg Extension) and hamstrings (Seated Leg Curl), once a block, never above 7 quads or 5 hamstrings a week.
**D5** A check-in never opens a new exercise on this plan (sets go onto prescribed exercises only).

## E. Progression, stall and reduction

**E1 Double progression (this plan):** the load goes up one increment when EVERY working set at the top load reaches the top of the rep range and the session's effort rating is within the target (no harder than planned); then the rep target restarts at the bottom of the range. Increments: the exercise's own increment if set, else 5 kg for compounds and 2.5 kg for isolation (machine stacks), not capped at 5% of the load. Lateral raises and reverse flies: when the next increment would drop reps by more than 4 (read from the last time the load was raised on that exercise, or the stack step over 10% of the load), progress by reps up to 20 first, then add the load. Ramp weeks: loads are held or matched; progression applies from the first Growth week (the document's "load progression is mainly a Growth-phase tool").
**E2 Stall rule (this plan):** no gain in load or reps across 3 consecutive sessions of an exercise, while recovery ratings are fine, shows: "No progress on X for 3 sessions. Check sleep and food first. If both are fine, swap to Y for 4 to 6 weeks." with that exercise's listed substitution(s) as the swap. No rep-range change suggestion on this plan; no sets added to a stalled exercise.
**E3 Reduction triggers (this plan):** a reduction week is suggested (the coach's existing early-deload card, Apply as now) when two or more of these hold, read from what the app records: (1) the same exercise's load or reps dropped in two consecutive sessions at the same effort; (2) joint discomfort rated 2 or more (of 3) in two sessions in one week; (3) soreness before a session rated high and that session's rep minimums missed; (4) a week of low energy and motivation, or poor sleep, in the weekly check-in; (5) 12 or more weeks since the last reduction week. The single-signal deload score on Home and Review does not fire on this plan. Applying it serves A5's Reduction column (half sets, same exercises, normal reps, RIR 3 or more) for that week; the block's planned reduction week then still comes unless it is within 2 weeks (taken already).

## F. Closed exercise list, recovery, safety

**F1 Closed list (D227):** every path offers only the exercise's listed substitutions: the swap picker (no "Show all exercises" on this plan), the serve-time stand-in when a machine is missing, the stall swap, kit stand-ins, rebuilds. A test drives every path and fails if any exercise outside the list appears.
**F2 Recovery:** the plan records the side delts on consecutive days (Days 1 and 2) as the author's accepted exception: the readiness simulation does not reorder sessions or trim sets for it, the recovery safe maximum is not pinned for side delts, and the readiness copy says "Side delts are trained on back-to-back days by design: lateral raises are low in fatigue." The live recovery estimates still show as usual. No other exception.
**F3 Re-entry and limitations:** unchanged: the long-gap re-entry eases the first sessions back; a limitation set in the capability lane holds or swaps affected exercises (from the closed list) and its reintroduction ramp climbs back to the plan's numbers.
**F4 Diet:** D226 (slider, enhanced gain ceiling, the gain-phase settling period). Moving into the plan is when the person moves nutrition to a building phase themselves; the plan never changes nutrition.

## G. Proof

**G1 Simulation test:** a 16-week simulated off-season through the real coach code: select the plan, block 1 (ramp and Growth weekly sets exactly as A5 in every week), weekly check-ins with scripted signals (raises in Growth add 1 lat and 1 side-delt set a week onto the right exercises up to 20 and 22, never above 7 per session; a hold pauses the ramp; a pull-back never goes below Health), two reduction triggers at week 10 producing the reduction suggestion, block 2 starting from block 1's level, the stall rule after 3 flat sessions offering only the listed substitution, progression raising the load only when every set hits the top. Every week's served sets checked against A5 plus applied raises.
**G2** The closed-list test (F1); the authored rebuild skip; other plans unchanged (existing suites green untouched).
**G3** A fresh-eyes Opus review against this spec and the founder's document before merge.

## H. Lead rulings after lane A (2026-10-12)

1. Seated Leg Curl cap 5 (D4 can take hamstrings to 5 a week through it). Lat exercise caps 7 (inside the 7-a-session ceiling). Kept.
2. The alternatives the document names inside its main cells join the closed list: Leg Press (45 degree) for the hack squat, Leg Press Calf Raise for the standing calf raise, Cable Overhead Tricep Extension for Day 4's cross-body extension. Lane A's nearest-row choices for the listed substitutions stand (Seated Machine Row (Wide), Lying Leg Curl, Dip Machine).
3. BLOCKER before merge: the check-in card on this plan uses D2 to D5 (lane B), never the house +3 logic; its Apply writes only what authored serving reads.
4. The reduction week (planned or early) on this plan serves normal reps at RIR 3 or more (compound 3, isolation 2 to 3), never the house deload's halved reps at RIR 4.
5. The activation copy says the true block length for this plan ("eight-week block").
6. The manual "Add exercise" picker stays the person's free choice (the closed list governs what the app adds or offers as a swap).
7. Activating this plan again while its own block is running keeps the running block; a new block starts only through the next-block flow.
8. The optional Machine Shoulder Press is offered on Day 2 in Growth weeks only, through the plan's own add list, marked optional, never served by default.
9. Effort (A6): the founder removed the logger's session effort line on 2026-08-17, so it does not return to the logger. The session's plan screen shows one plain line with this week's target effort, e.g. "This week: stop 1 to 2 reps short on presses, pulldowns and rows; 0 to 1 on raises, curls and extensions."
10. The 1-character margin on blockLifecycle.stage1's pinned window over activatePlanWithBlock is accepted and recorded; lane B must not grow that function (add helpers outside it).
