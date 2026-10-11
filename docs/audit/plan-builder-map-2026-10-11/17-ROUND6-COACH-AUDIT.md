# Round 6 adversarial coach audit: structure engine plans (2026-10-11)

Branch `planner/structure-engine-rulebook`, HEAD 1f8b8d5. I audited every plan in `12-STRUCTURE-PLANS-RENDERED.md` and swept the real engine beyond the page. The authorities were 09 (as corrected by 10), F1 to F6, D222 R1 to R54 with every "Kept" item, and `15-ROUND5-COACH-AUDIT.md`.

## Method

Everything below is OBSERVED unless it is labelled INFERRED.

**(a) Reading.** I read every rendered plan line by line, and diffed the page against the round 5 render (commit 566e4f8) to find regressions.

**(b) Plain-week sweeps (1,200 builds).**
- Full gym: 8 categories x 2 to 6 days x 3 experience levels x 30, 45, 60, 75 and 90 minutes.
- The other five kits: 8 categories x 2 to 6 days x 3 experience levels at 60 minutes.
- Every returned plan passes `checkPlan` and `senseCheck`.

**(c) Focus sweeps.**
- 560 single picks: full gym, intermediate, 60 minutes, 14 muscles.
- 1,008 single picks: beginner and advanced, run through `checkFocusAgainstBaseline`.
- 420 men's physique lower-body picks: 6 kits x 3 experience levels x 5 day counts.

**(d) Length and day claims.** I rebuilt every "Sessions of N minutes would hold this plan" and "or D days" claim (273 asks) at N and at D.

**(e) Hand edits.** I edited copies of built plans, recomputed the reported minutes, and re-ran `checkPlan`, `senseCheck` and, for focus, `checkFocusAgainstBaseline`. "Demonstrated legal" means the edit passed all of them.

**Housekeeping.** The scratch files `tools/scratch-coach6-*.jest.js` are deleted. No other file was edited.

---

## BLOCKER

### C6-1 BLOCKER. A men's physique focus on quads or hamstrings puts leg work in a second session, which breaks F4 (legs once a week)

**Plans (engine sweep; none are on the rendered page).** 175 of 420 men's physique lower-body focus builds train legs in two sessions:
- quads, hamstrings or quads+hamstrings picks, and side delts+quads;
- 4 days (most kits at advanced, and the machine, home, barbell and bodyweight kits at intermediate), 5 days and 6 days, all three experience levels.

**Exact sessions (OBSERVED):**
- MP 5d, full gym, intermediate, focus quads: "Chest, Triceps & Quads: Incline Machine Press 4, Pec Deck 4, Cable Overhead Tricep Extension 4, Tricep Pushdown (Rope) 4, Leg Extension 3", beside "Legs & Side Delts: Hack Squat Machine 4, Romanian Deadlift (Dumbbell) 4, Leg Extension 3, …".
- MP 6d, focus quads: "Back A, Biceps & Quads: … EZ Bar Preacher Curl 3, Leg Extension 2".
- MP 6d, focus hamstrings: "Back A, Biceps & Hamstrings: … Lying Leg Curl 2".
- MP 6d beginner, focus quads+hamstrings: "Back A, Biceps & Quads" and "Shoulders B, Abs & Hamstrings", besides "Legs & Calves".
- MP 5d advanced, focus quads: the chest day opens "Walking Lunge > Incline Machine Press > Leg Extension > Standing Calf Raise > Pec Deck > …".
- MP 5d home gym: "Incline Dumbbell Press > Bulgarian Split Squat > Dumbbell Fly". A split squat now sits between the press and its fly.

**Why it is wrong.**
- F4 is a founder FIXED rule: "Men's physique trains legs in one session a week at every day count." A men's physique coach rejects a leg extension on a back day or a lunge opening a chest day outright.
- No plain men's physique week does this. I checked 0 of all plain MP builds in every kit.

**Mechanism (OBSERVED, engine.js 1520-1535).**
- The focus fill's `overflowSiblings: sameHalf` finds no other lower session in men's physique.
- R47's `overflowFallback` (the other half) then places the pick in an upper session that neighbours none of its own.
- R47 was ruled for "chest goes on the leg day". It was never tested against F4 for the reverse direction.

**Fix (within the hard bounds).**
- In men's physique, quads, hamstrings, glute max, glute med and adductors never overflow out of the leg session, for focus (R30, R47), for minimums (R22) and for normal volume (R50).
- Such a pick reports "legs train once a week in men's physique".
- Add a sense check: in men's physique, the lower-body muscles are trained in exactly one session.

**Question for the lead.** Do calves count as "legs" for F4? Two cases:
- R28/R48 move calf raises onto MP chest and back days in plain weeks. Rendered MP 4d: "Chest, Triceps, Calves & Abs … Standing Calf Raise (Machine) 4" beside "Legs & Abs … Seated Calf Raise 2".
- A calves focus adds them to Back A or the chest day: MP 5d and 6d, "Back A, Biceps & Calves".

---

## MAJOR

### C6-2 MAJOR (regression from U5-10). Full-gym plans use the dumbbell-kit leg curl and the Copenhagen adduction while the gym's machines sit unused

**Rendered lines.**
- "Lying Dumbbell Leg Curl" appears in full-gym plans: Bodybuilding 4d, 5d and 6d; Classic 4d, 5d and 6d; Wellness 5d and 6d; Bodybuilding 6d focus lats; Classic 5d focus.
- Bodybuilding 4d Lower B: "Seated Leg Curl: 3/3/4/4/4/2 … Lying Dumbbell Leg Curl: sets by week 3/3/4/4/4/2", while the "Lying Leg Curl" machine trains in Lower A.
- Wellness 6d: "Hamstrings, Glutes & Inner Thighs (B): Machine Hip Thrust, Seated Leg Curl, Copenhagen Adduction 2/2/2/2/2/1, Lying Dumbbell Leg Curl 2/2/3/3/3/2". The Hip Adduction Machine is in session 6.
- The round 5 render had "Lying Dumbbell Leg Curl" only in the two dumbbell variants (2 occurrences; now 12).

**Sweep (OBSERVED).** The supplement "Lying Dumbbell Leg Curl" appears in 105 full-gym sessions, and "Copenhagen Adduction" in 20.

**Mechanism (OBSERVED, engine.js 467-470).**
- The sort is `fresh(a) - fresh(b)` before `group(a) - group(b)`, so a fresh supplement beats a repeated catalogue staple in every kit.
- This contradicts the code's own comment and R41: "the catalogue's names come first in every kit, then the kit's stand-ins, then the rulebook's supplements … only within a source do the rotation and the week's freshness choose".
- It also contradicts C4-22: "supplements last".
- The round 5 ruling U5-10 was scoped to "a dumbbell kit's names". It was implemented for all kits.

**Why it is wrong.**
- No coach in a full gym programmes a dumbbell held between the feet, which is hard to load and progress, when a lying-curl machine is free.
- The same applies to a bodyweight Copenhagen when an adduction machine is free.
- Round 5 "verified clean" listed "staples before stand-ins in the full gym". That no longer holds.

**Demonstrated legal.** In Bodybuilding 4d Lower B, Lying Dumbbell Leg Curl 4 replaced by Lying Leg Curl 4 passes every check. The sessions are non-adjacent, so C16 is untouched.

**Fix.** Apply "fresh before repeat, any source" only in kits whose source groups are all dumbbell or home. In gym kits, a repeat of a catalogue name beats a fresh supplement.

### C6-3 MAJOR (C5-8 not fixed). The chest top-up still sits between two rows, and 2-set top-up compounds remain in full sessions

**Rendered lines.**
- MP 5d: "1. Back A, Biceps & Chest: Lat Pulldown (Wide Grip), Seated Cable Row, Incline Dumbbell Press 2/2/3/3/3/2, Machine Row (Chest Supported) 2/2/2/2/2/1, …". This is round 5's quoted case, unchanged in order.
- MP 5d machines advanced 75: "Seated Cable Row, Incline Machine Press, Machine Row (Chest Supported)".
- Classic 5d: "5. Shoulders, Arms, Lats & Chest (7 exercises, 24 sets) … Incline Machine Press: sets by week 2/2/2/2/2/1", beside "EZ Bar Preacher Curl 3/3/4/4/4/2" and "Cable Overhead Tricep Extension 3/3/4/4/4/2". The weekly line shows biceps 14, which is their maximum, and triceps 12.

**Engine.**
- General 5d advanced, session 5, "Shoulders, Arms, Lats, Chest & Back": Lat Pulldown 2 and Machine Row 2. Lats are 14, their maximum. This is C5-8's own example, unchanged.
- Figure 5d and Women's physique 5d advanced: Incline Machine Press 2 in a 24-set session that holds Cable Straight-Arm Pulldown 3, with lats 19 against a normal 16 and chest 10 of 12.

**Mechanisms (OBSERVED).**
1. Order:
   - The `topUp` key (engine.js 1148) ranks below kind rank. In the full gym the machine row ranks "machine" and the dumbbell press "mod_compound", so C17 forces the press first.
   - I tested this: rows together with the press after fails C17 ("Incline Dumbbell Press after a lighter exercise").
   - In the machine and dumbbell kits, the U5-6 side-by-side loop (engine.js 1171-1177) deliberately moves the top-up press between the two rows. Two round 5 fixes undo each other.
2. Sets:
   - For a top-up, `raiseLeadCompounds` tries free room and then the main exercise elsewhere, then `continue`s (engine.js 1096-1101).
   - The main-exercise move always fails when the top-up's session is full: 25 sets.
   - The register's "otherwise from an isolation above 3 in the session" is never tried for a top-up.
   - In Classic 5d, the R51 named dose (arms to 4, above normal) took the session's last free sets before R49 ran.

**Demonstrated legal.**
- MP 5d Back A, second row the Chest-Supported Row (Dumbbell) 2 and the press after both rows: passes, with the same weekly sets.
- Classic 5d session 5, incline 2 to 3 and preacher 4 to 3: passes. Chest 11, biceps 13.
- General 5d advanced session 5, 2-set pulldown removed, machine row 3, leaning lateral 3: passes. Lats 12.5 against a normal of 12.
- Figure 5d advanced session 5, straight-arm 3 to 2, incline 2 to 3: passes. Chest 11, lats 18.

**Fix.**
- For ordering, treat an upper-body machine compound as a moderate compound, as R37 already does for rest. Put the top-up after the session's own compounds. Exempt a top-up from the U5-6 interleave.
- For sets, a top-up's third set may come from an isolation in its session whose muscle is above normal, or from a higher-tier muscle's surplus above normal.

### C6-4 MAJOR. "Each session already gives it the most one session may" is printed for muscles nowhere near their per-session cap

**Rendered lines.**
- Bikini 2d: "… because each session already gives it the most one session may, or its sessions are full: quads 2 (usually 6)". Quads hold 2 direct sets.
- Classic 5d: "… or each session already gives it the most one session may: quads 13 (usually 14), hamstrings 13 (usually 14)". Quads hold 7 and 6 direct; hamstrings 7 and 6.
- Women's physique 3d and Figure 3d: "upper back 8 (usually 10)". Upper back holds 6 direct and 8 fractional.
- Figure 3d bodyweight: "upper back 8".
- Classic 5d 75 focus: "chest 9".

**Sweep (OBSERVED).** 150 of 691 "muscle_cap" reasons name a muscle with no session at 8 direct or 11 fractional sets.

**Mechanism (OBSERVED).**
- `CODE_BINDER` maps every C3 failure to `muscle_cap` (engine.js 1599), whichever muscle's cap failed.
- Probe: one more Bikini 2d hack squat set fails on "C3 glute_max 11.5 fractional sets (cap 11)". The cap that binds is the glutes', fed by the hack squat's credit.
- Other cases are a 2-set opening that would overshoot by 1.

**Why it is wrong.**
- The founder's standard asks that every message line be true.
- "Quads 2: the most one session may" is plainly false to a coach.

**Fix.**
- Map C3 to `muscle_cap` only when the failing muscle is the one reported.
- Otherwise name it: "more would give the glutes more than one session may hold".

### C6-5 MAJOR. "To make room for your focus" reads as if a muscle fell below its minimum

**Rendered line.** Wellness 5d beginner, focus quads: "To make room for your focus: inner thighs 5 to 3 sets a week (their minimum is 4)". The weekly line shows "adductors 6.5, own 3 (4/7/14)".

**Sweep (OBSERVED).** 24 of 269 "To make room" lines in the intermediate full-gym pick sweep state a "to" below the stated minimum. Examples:
- "lats 8 to 7 (their minimum is 10)" (Classic 4d, focus side delts);
- "triceps 4 to 2 (minimum 4)" (Bikini 4d to 6d);
- "glutes 7 to 6 (minimum 10)" (Wellness 4d, focus quads).

41 more lines give an own-set "to" below the counted total. Examples:
- MP 4d focus: "rear delts 8 to 6" while the weekly line shows 13 to 11;
- Classic 5d 75 focus: "biceps 7 to 6" while the counted total is 13.

**Why it is wrong.**
- "From" and "to" are own sets; "minimum" is the counted minimum.
- The person reads a breach of F2. The plan is in fact legal: C5 shows 0 failures over 1,568 focus builds.

**Fix.** State counted sets on both sides ("inner thighs 7.5 to 6.5, minimum 4"), or say "own sets" and name the credit.

### C6-6 MAJOR (C5-4 partly fixed). Two picks sharing a session cannot replace a top-up together

**Rendered lines.** Classic physique 5d, 75 min, focus lats and side delts:
- "Your side delts focus: 14 to 15 sets a week, short of the 18 …".
- "Your lats focus: 15 to 18 …, short of the 19".
- Session 5 still holds "Incline Machine Press: 2/2/2/2/2/1".
- Round 4 rendered side delts at 16.

**Mechanism (OBSERVED, engine.js 1484-1513).** `swapTopUps` requires one pick to take every set of the removed top-up. Each pick can take only 1 here, because of the per-session caps.

**Demonstrated legal.** Remove the incline top-up, leaning lateral +1, straight-arm +1. This passes checkPlan, senseCheck and C5. Side delts 16, lats 19 (target reached), chest 7 (minimum 6).

**Fix.** Let the picks in the session share the freed sets. "The week never loses a set" still holds.

---

## MINOR

### C6-7 MINOR (regression from U5-6). The side-by-side rule breaks 09 s7's tier order and makes sessions read as circuits

**Rendered lines.**
- Bodybuilding 5d Push: "Dumbbell Lateral Raise, Cable Overhead Tricep Extension, Machine Lateral Raise".
- Figure 5d and Women's physique 5d session 5: "Cable Lateral Raise, Hammer Curl, Leaning Lateral Raise".
- Bikini 3d: "Abduction Machine, Standing Calf Raise, Cable Hip Abduction, Seated Calf Raise".
- Bodybuilding 4d and 5d Legs B: "Seated Leg Curl, Standing Calf Raise, Lying Dumbbell Leg Curl".
- Wellness 6d: "Seated Leg Curl, Copenhagen Adduction, Lying Dumbbell Leg Curl".

**Sweep (OBSERVED).** At 60 minutes, 403 pairs place a lower-tier isolation before a higher-tier one between two exercises of one pattern. 09 s7 reads "Within a tier, P before S before M".

**Fix.** Interleave only with an exercise of the same muscle tier, or never. Two variants of one movement back to back is normal coaching; U5-6 asked for a reason on screen, not a reorder.

### C6-8 MINOR (question; new argument on C5-14). Spine-first applies within a rank only, so hip thrusts and machine squats still precede dumbbell or Smith Romanian deadlifts

**Rendered lines.**
- General 3d beginner 45 Legs: "Hack Squat Machine, Machine Hip Thrust, Romanian Deadlift (Dumbbell)".
- Wellness 4d Lower B: "Hack Squat Machine, Machine Hip Thrust, Romanian Deadlift (Dumbbell)".
- Wellness 5d session 1: "Barbell Back Squat, Leg Press, Barbell Hip Thrust, Romanian Deadlift (Dumbbell)".

**Sweep (OBSERVED).**
- 114 of 622 builds at 60 minutes put a hip thrust before a hinge in some session.
- Among those that build: 29 full-gym beginner builds, and every machine-kit category through the Smith RDL, which ranks "machine".

**New argument.**
- R37 ranks a machine hip thrust "heavy"; a DB or Smith RDL ranks lower.
- So the "within an order rank" qualifier recreates C4-19's exact case, "a Romanian deadlift after four heavy hip-thrust sets is the riskier order".
- It now falls on novices learning the hinge (F6).

**Question.** Should spine-first apply across ranks among lower-body compounds?

### C6-9 MINOR (regression from the round 5 pattern-visit rotation). A 2-set heavy barbell incline follows the barbell bench

**Rendered lines.**
- General 6d Push A: "Barbell Bench Press 3/3/4/4/4/2 … Incline Barbell Bench Press: 2/2/2/2/2/1, rest 180 s".
- The same in Bodybuilding 4d Upper A, Classic 6d Push A, Figure 6d Push A and Women's physique 6d Push A.
- Round 5 had Incline Machine Press there.

**Sweep (OBSERVED).** 10 builds at 60 minutes.

**Demonstrated legal.** Incline Machine Press 2 in its place passes. So does bench 3 + incline 3.

**Fix.** A muscle's second compound in a session that already holds its heavy barbell lift takes the least fatiguing name.

### C6-10 MINOR (C5-19 partly fixed). "Much the same week" is too narrow

- General 6d carries exactly the same weekly sets as 5d (104 = 104), with two lighter days, and has no note.
- MP 6d adds 3 sets over 5d (rear delts +1, calves +2) and has no note.
- The rule needs every muscle within ±1 set (engine.js 1812-1816). 80 day-count pairs gain 3 sets or fewer and carry no note.
- Also: MP 5d builds 3 fewer sets than MP 4d (abs 8 against 10, calves 4 against 6). A person choosing more days gets less waist work, unexplained.

**Fix.** Judge by the week's total and the largest per-muscle gain.

### C6-11 MINOR. Legal sets left unplaced, reported with no true reason

**Plans.**
- Bodybuilding and Classic 5d and 6d, beginner, 45 minutes.
- Classic 5d barbell advanced.

**OBSERVED.**
- The report's limits contain "room"; the render prints "ROOM LEFT (an engine fault)".
- Bodybuilding 5d beginner 45: the R28 length move left Legs A with 4 exercises and Legs B with 6, which is past R25's 5 for a beginner above the minimum.

**Demonstrated legal.**
- Leg Extension 2 in Legs A.
- Classic barbell: Clamshell 2 to 3.

**Fix.** Never report "room". Apply beginner limits to R28 destinations.

### C6-12 MINOR. Name residue

- A letter still sits mid-name: "Glutes A, Hamstrings & Abs" and "Quads A, Side Glutes & Calves" beside "Hamstrings, Glutes & Inner Thighs (B)" (Wellness 6d).
- "Shoulders, Arms, Lats, Chest & Back" lists the back twice.
- 5-part names: "Glutes, Hamstrings, Quads, Calves & Inner Thighs" (Wellness 5d beginner); "Back, Side Delts, Biceps, Chest & Calves".
- New argument against Kept C5-18: the Kept reason (that "Upper" would hide the template's emphasis) does not apply when the name lists every muscle of the region.

### C6-13 MINOR. The render misstates bodyweight isolation reps

Every bodyweight isolation (hanging raises, decline and reverse crunches, the clamshell) prints "reps by effort (as many as the week asks, 6 to 30)". The engine prescribes [15, 30] (C5-21). The tool hard-codes "6 to 30" whenever a range ends at 30 (render-structure-plans.jest.js line 128).

### C6-14 MINOR. A 5-set single exercise where a second variant fits

MP 4d dumbbells: "Dumbbell Calf Raise (Standing): 4/4/5/5/5/3", with the plan saying "calves 5 (usually 6) because its sessions are full".

Demonstrated legal: 4 + Seated Dumbbell Calf Raise 2 (24 sets, 8 exercises). Calves reach 6, and the stated reason is not true.

### C6-15 MINOR. Wellness 5d's curl day now takes a hinge

The rendered session 1 now carries "Romanian Deadlift (Dumbbell): 2/2/2/2/2/1", 4th after squat, leg press 2 and hip thrust. The week then has two hinge days, at J6's limit.

The round 5 ruling ("hint leads, does not limit") was for the hinge day taking a curl. `patternsFor` applies it to every hinted session.

Demonstrated legal: no DB RDL, Lying Leg Curl 2 to 4. Hamstrings stay 14 and glutes 14.

---

## Round 5 findings: status (OBSERVED)

| Finding | Status |
|---|---|
| C5-1 | Fixed. Every beginner quad day holds a compound (S13). |
| C5-2 | Fixed. Side delts 14 in MP 6d, Figure 5d and WP 5d; General 4d side delts 8; Bikini 2d glutes 11. |
| C5-3 | Fixed. Bikini 3d names are true; no name word has under 2 sets anywhere. |
| C5-4 | Partly fixed. See C6-6. |
| C5-5 | Fixed. MP 5d and 6d abs focus goes 8 to 14. |
| C5-6 | Fixed (R54). |
| C5-7 | Fixed. Classic 4d upper back 10. |
| C5-8 | Not fixed. See C6-3. |
| C5-9 | Partly fixed. Reasons are now probed, but see C6-4 and C6-11. Wellness 5d hamstrings are 14. |
| C5-10 | Fixed. |
| C5-11 | Fixed. |
| C5-12 | Fixed. |
| C5-13 | Fixed as ruled. Abs 9; quads and hamstrings 13 remain, structural. |
| C5-14 | Within-rank only. See C6-8. |
| C5-15 | Fixed for dumbbell kits; the change regressed the full gym (C6-2). |
| C5-16 | Fixed. |
| C5-17 | Register corrected. |
| C5-18 | Kept; new argument in C6-12. |
| C5-19 | Partly fixed (C6-10). |
| C5-20 | Fixed for the cited case; the walking lunge 2 and leg press 2 residues are noted. |
| C5-21 | Fixed in the engine; the render misstates it (C6-13). |

## Verified clean

- All 1,200 plain builds and every focus build pass checkPlan and senseCheck.
- There is no overhead press anywhere.
- No plain men's physique week trains legs twice.
- Length:
  - All 273 "Sessions of N minutes" and "or D days" claims hold when rebuilt at N and at D.
  - D is the fewest.
  - No beginner is offered more than 4 days, and 6 days never offers more.
  - Every muscle's weekly sets are identical at every length.
- Focus:
  - 0 C5 failures over 1,568 builds.
  - Every "To make room" from/to matches the change in own sets.
  - No week loses sets.
  - No false "reached".
  - The MP abs focus now works.
  - Focus day-count claims were spot-checked: Classic 6d reaches 20 lats and 16 side delts; General 5d chest reaches 15.
- 5-set exercises never appear in the full gym.
- Push is at or under pull, and hamstrings at least half of quads, everywhere. Abs are last everywhere.

## Not run

- Pair and triple focus picks outside men's physique.
- Machine-kit and home-kit focus sweeps.
- Starts other than session 1 (R40).
- Deeper traces of why lats rise 3 above normal in Figure 5d advanced, and of the Bodybuilding 3d beginner layout differing at 60 minutes.

## Questions for the lead

1. C6-1: does F4 cover calves?
2. C6-8: should spine-first apply across order ranks?
3. C6-6: may two picks share a removed top-up?
