# Round 8 adversarial coach audit: structure engine plans (2026-10-11)

Branch `planner/structure-engine-rulebook`, HEAD ba154a5 ("Structure engine: fix what the round 7 coach and user audits found"). Read-only. Authority read in full: 09 (sections 2 to 10 and Part B) as corrected by 10, D222 and every addendum through "the round 7 coach and user audits" (R1 to R55, Q1 = C, F1 to F6, every "Kept"), and 19-ROUND7-COACH-AUDIT.md; 20-ROUND7-USER-AUDIT.md was not read (see "Not run"). Audited: every block of `12-STRUCTURE-PLANS-RENDERED.md` (2,335 lines; 40 main weeks and 15 variants), line by line, and the real engine beyond the page.

Everything below is OBSERVED (read or run) unless labelled INFERRED. Line numbers are lines of `12-STRUCTURE-PLANS-RENDERED.md` at ba154a5.

## Method

- **Plain sweep, 1,200 builds** (`scratch-coach8-plain`): full gym, 8 categories x 2 to 6 days x 3 levels x 30/45/60/75/90 minutes; the five other kits x 8 x 5 x 3 at 60 minutes. 1,046 built, 154 refused. On each: `checkPlan`, `senseCheck`; the same weekly sets at every length; every offered length rebuilt (it must build without asking, and no shorter standard length may); every offered day count rebuilt (it must fit, and no smaller one may); every refusal's offered day count and length rebuilt; every whole isolation exercise of a session over the length moved to every other session training its muscle, as itself or merged, then `checkPlan` and `senseCheck` with refreshed minutes (does a legal move remove the question that the engine left?); "Full Body" with no lower compound; letter style; abs last; hinge before hip thrust; isolation tier order; a 2-set opener before a bigger compound; lone 2-set lead compounds and whether a donor the round 7 rule names makes a legal third set; stand-ins in gym kits; abs and calves below normal beside a session with room that neighbours none of theirs (trying a 2-set finisher); every stated cause against the session it names (the muscle cap stated with room under both caps and an exercise below 4 sets; "full" stated at 23 sets or fewer; the exercise cap stated under 8 exercises); weeks with calf work and leg days but no calf work on any leg day.
- **Round 7 engine for comparison** (`scratch-coach8-old`): `engine.js` at 91a2f35 (the only source file round 7 changed) copied to the scratchpad with its imports pointed at the current modules, to tell a regression from a pre-existing pattern.
- **Focus sweep, 1,863 focus builds** (`scratch-coach8-focus`; classic, men's physique, bikini, wellness, figure and women's physique; general and bodybuilding did not finish inside the time box): every legal single pick at 2 to 6 days in a full gym at all three levels and with dumbbells at intermediate (60 minutes); pairs of chest, lats, side delts, glutes, quads, hamstrings and biceps at 4 and 5 days (full gym, intermediate); single picks at 45 and 90 minutes (4 and 5 days). Each against its plain week: `checkFocusAgainstBaseline`, `checkPlan`, `senseCheck`; every pick gaining under 2 sets asked (R55) or at its maximum; "reached" claims; at_max picks taking from others (C7-10); the near-maximum claim; every R55 day-count offer, its figure and its length rebuilt; every "with N days it reaches T" rebuilt; stated causes; men's physique legs in one session; who gave sets (never a pick, never a higher tier, never below the minimum); focus order; calves off the leg days.
- **Hand edits** (`scratch-coach8-edit`, `-edit2`): copies of built plans edited, weeks rebuilt with the engine's own `weeksFor`, minutes refreshed with `sessionMinutes`, then `checkPlan`, `senseCheck` and, for focus, `checkFocusAgainstBaseline`. "Demonstrated legal" means all that apply passed. Session names were not recomputed in the edits (`checkPlan` and `senseCheck` do not read them).
- Housekeeping: every `tools/scratch-coach8-*.jest.js` file is deleted before hand-back. The concurrent user audit's `scratch-user8-*` files were not touched. No other file in the tree was touched.

---

## BLOCKER

None found. No plan in any sweep fails `checkPlan` or `senseCheck`; no recovery, joint, F4 or 24-set breach was found.

## MAJOR

### C8-1 MAJOR (part regression from round 7's C7-7 change). Weeks whose leg days carry no calf work at all, the calves sitting on back, chest, push or pull days; men's physique 5 days advanced lost its leg-day calves in round 8

**How widespread (OBSERVED, plain sweep).** 47 of 1,046 built plain weeks train calves and have leg days, but no leg day holds a calf exercise:
- Men's physique 5 days, advanced, every kit that builds (full gym at all five lengths, machines and cables, dumbbells, home gym): 8 builds. **New in round 8**: the round 7 engine (91a2f35, same inputs) gave the leg day a calf exercise in every one checked (full gym advanced 60: "Legs & Side Delts: ... Seated Calf Raise 2"; machines advanced 75: "... Seated Calf Raise 2"; dumbbells advanced 60: "... Seated Dumbbell Calf Raise 2").
- Bodybuilding 6 days, intermediate (full gym at all five lengths, machines, dumbbells, home gym, bodyweight) and advanced (full gym at all five lengths, machines): 15 builds. Pre-existing (the round 7 engine gives the same).
- Figure 6 days advanced (8), women's physique 6 days advanced (4), general 6 days advanced in four kits (4), figure 3 and 5 days with barbell and plates (3), classic 6 days bodyweight (2), bikini and wellness 4 days barbell (3). Figure 6 days advanced is pre-existing; the others were not compared.

**Quoted (rendered, Bodybuilding 6 days, intermediate, full gym, 60).** Line 356 "**1. Push A & Calves**", line 362 "Standing Calf Raise (Machine): sets by week 3/3/4/4/4/2"; line 381 "**4. Push B & Calves**", lines 387 and 388 "Seated Calf Raise ... Leg Press Calf Raise"; lines 372 to 379 "**3. Legs A & Abs**" and lines 398 to 404 "**6. Legs B**" hold no calf exercise.

**Quoted (engine, men's physique 5 days, full gym, advanced, 60; `scratch-coach8-probe`).**
- "3. Chest, Triceps & Calves [59.8m]: Incline Machine Press 4, Pec Deck (Machine Fly) 4, Cable Overhead Tricep Extension 4, Tricep Pushdown (Rope) 4, Seated Calf Raise 3, Standing Calf Raise (Machine) 4"
- "5. Legs & Side Delts [60m]: Hack Squat Machine 4, Romanian Deadlift (Dumbbell) 4, Leg Extension 3, Seated Leg Curl 3, Cable Lateral Raise 4, Machine Lateral Raise 4"
- With machines and cables, advanced, 75 (the rendered variant at lines 1705 to 1752): line 1710 "**1. Back A, Biceps, Chest & Calves** (7 exercises, 23 sets at the peak, about 73 min)", line 1717 "Standing Calf Raise (Machine): sets by week 3/3/4/4/4/2"; lines 1741 to 1747, "**5. Legs & Side Delts**", no calf exercise. The report's overflow list names the cause: `{"muscle":"calves","session":"back_a","reason":"room"}`.

**Mechanism (OBSERVED in the overflow lists; INFERRED as the cause).** The R48 room moves take a calf isolation out of a leg session that sits at its set or exercise limit while a listed muscle (side delts in men's physique, quads and hamstrings in the others) sits below normal, and the round 7 finisher rule (abs and calves may take a session "of either half that neighbours none of theirs", `overflowSiblings` for FLOATERS = every muscle) now gives the calves somewhere to go on an upper day. Nothing keeps a calf exercise on a leg day whose template lists calves. In men's physique 5 days the abs finisher placed on Back B (round 7) also changed the fill, and the leg day's last calf exercise left; the calves also fell from 8 to 7 a week (round 7 engine weekly "calves 8, abs 8"; round 8 "calves 7/7, abs 12/12").

**Why a coach rejects it.** For men's physique this contradicts the founder's own description of the category's week (D219 addendum 4: "The leg day carries the category's standard (quads 8, hamstrings 6, glutes 4, calves 8 with a calf finisher on an upper day)") and 09 B7's 5-day template, whose leg session is "Legs+Side+Calves". The finisher was ruled to sit beside the leg-day calves, not to replace them. A men's physique athlete opening "Legs & Side Delts" with no calves, and finding seven sets of calf raises on chest day, reads it as a mistake; "Back A, Biceps, Chest & Calves" reads as a list, not a session. For the 6-day push/pull/legs weeks the same reading applies (every 09 B11 leg session carries a calf raise), though there the calves left the leg days to keep them inside the length, so it is a trade the lead may keep (question 1).

**Fix (within the bounds).** A session whose template lists calves and whose core is a leg session keeps at least one calf exercise (2 sets or more) wherever the week trains calves and the kit has one; a room move or a finisher may take only the calf sets above that. Same weekly sets (Q1 = C untouched).

**Demonstrated legal.**
- E2 (men's physique 5 days, full gym, advanced, 60): 2 of the chest day's Standing Calf Raise sets moved to "Legs & Side Delts" (chest day: Seated Calf Raise 3 + Standing Calf Raise 2; leg day: Standing Calf Raise 2). `checkPlan` pass, `senseCheck` pass. Minutes 59 / 54.3 / 55.8 / 58.8 / 65 (shown as 65: no length question under the whole-minute rule). Calves 7, every other muscle unchanged.
- E3c (men's physique 5 days, machines and cables, advanced, 75): Back A's Standing Calf Raise removed; chest day Seated Calf Raise 2 + Standing Calf Raise 3; leg day Seated Calf Raise 2. Both checks pass; minutes 63.8 / 52.3 / 58.5 / 62.3 / 70.8, no question at 75; calves 7. (E3a, all four sets to the leg day, fails C6 at 26 sets; E3b, 2 sets on the leg day while Back A keeps 2, fails C2, C16 and S2: the leg day and Back A neighbour, so Back A must give up its calves.)
- Bodybuilding 6 days at 60: NOT demonstrated. Placing 2 calf sets on either leg day takes it to about 66 minutes (asks), and the placement must be the same at every length (R48), so this one is a real trade.

## MINOR

### C8-2 MINOR (C7-8 residue). The top-up order reads the template's name, not the name the person sees, so a muscle the shown name covers is still ordered after lower-tier work

**Quoted (rendered).**
- Wellness 5 days (lines 1090 to 1097): "**1. Lower Body A**" ... line 1096 "Standing Calf Raise (Machine)" (calves, M in wellness) before line 1097 "Abduction Machine" (side glutes, S). "Lower Body" covers the side glutes.
- Classic physique 5 days, 75 minutes, focus lats and side delts (lines 2122 to 2129): "**5. Shoulders, Arms & Lats**" ends with line 2129 "Cable Straight-Arm Pulldown: sets by week 3/3/4/4/4/2", after the face pull, the preacher curl and the overhead extension (rear delts, biceps, triceps: S). Lats are P in classic and a focus pick; 09 s7 orders "P before S before M; focus first only within its tier".

**How widespread (OBSERVED, plain sweep).** Every wellness 5-day full gym and machines week at every level and length (the beginner's "Lower Body" puts the calf raise before the Hip Adduction Machine, adductors S); classic physique 5 days with dumbbells or a home gym, beginner and advanced ("Shoulders, Arms & Lats: Dumbbell Overhead Tricep Extension ... before Straight-Arm Dumbbell Pullover"). The other isolation tier inversions the sweep listed (a fly after its press, a leg extension after its squat, a skull crusher after a close-grip press, a kickback after a hip thrust) are R24's "a muscle's isolation follows its own compound" and are not findings.

**Mechanism (OBSERVED, engine.js 1299 to 1302).** `topUp` tests `COVERED_BY[ex.muscle].test(order[si].name)`, the template's name ("Shoulders & Arms"; wellness 5 days' first session), not the name the session is given at the end ("Shoulders, Arms & Lats", "Lower Body A"). C7-8 was fixed for "Lower B", where the two names agree.

**Why a coach rejects it.** A session the person sees named for the lats finishes with the lats after the arms; a wellness leg day does the maintenance calf raise before the standard side-glute work. Small, but it is exactly the order 09 s7 and the round 7 ruling say is wrong.

**Fix.** Read the covered muscles from the name as it will read (`sessionName` on the session's current muscles, as `namesNow` already does for R51), or treat a muscle the final name covers as the session's own.

**Demonstrated legal.** E1 (classic 5 days, 75, focus lats and side delts): the Cable Straight-Arm Pulldown moved to follow the Lat Pulldown: `checkPlan`, `senseCheck` and `checkFocusAgainstBaseline` all pass; minutes 73.5 / 72.5 / 73.3 / 74.3 / 68.5. E6 (wellness 5 days, 60): Abduction Machine before the Standing Calf Raise: both checks pass.

### C8-3 MINOR (C7-4 rule not applied where the donor is an arm). General 4 days: a 2-set row is the upper back's only compound in Upper B beside a 3-set preacher curl, with the biceps 2.5 sets above normal

**Quoted (rendered, General 4 days).** Line 107 "Chest-Supported Row (Dumbbell): sets by week 2/2/2/2/2/1"; line 111 "EZ Bar Preacher Curl: sets by week 2/2/3/3/3/2"; line 127 "upper_back 9.5, own 6 (6/10/14); ... biceps 12.5, own 6 (6/10/14)". The 2-set row is in every general 4-day full gym week at every length, and with machines and bodyweight (7 builds); figure and women's physique 4 days with barbell and plates show the same with a skull crusher as the donor (2 builds).

**Mechanism (OBSERVED, engine.js `surplusGives`).** The round 7 ruling (C7-4): a lone 2-set lead compound "takes its third set from any isolation in the session whose muscle stays at or above its normal volume after giving, down to 2 sets". The code adds a condition the ruling does not state: an arm or rear-delt donor must keep its own sets at its weekly minimum (`CREDIT_FED ... targets.min`). Biceps own sets are 6, the minimum, so the curl never gives, although the biceps' counted sets stay 2.5 above normal. Round 4's R49 said the opposite ("the arms' and rear delts' own minimum, R27, gives way to it"); round 5 rewrote it to "an arm or rear delt above its own floor first". The register and the code disagree on which floor applies.

**Why a coach rejects it.** A row of 2 sets, the session's only rowing, beside 3 sets of preacher curls when the biceps are already well past normal through the rows and pulldowns, is upside down for a general trainee; the coach gives the row the third set. Low stakes: the upper back is 0.5 below normal.

**Fix (lead's call, question 2).** Either apply the ruling as written (the curl gives, biceps own sets 5, still above their own floor of 3 under S10), or record that the arms' own minimum binds here and keep the 2-set row.

**Demonstrated legal.** E5 (General 4 days, 60): Chest-Supported Row 2 to 3, EZ Bar Preacher Curl 3 to 2: `checkPlan`, `senseCheck` pass; minutes 68 / 70.5 / 67.5 / 65 (Upper B 67 to 67.5; the week asked already); biceps own 5, upper back own 7.

### C8-4 MINOR (C7-3 residue, mostly beginners and focus weeks). "Holds the most sets of them one session may hold" said of 7 hamstring sets

**Plan (engine; wellness 3 days, beginner, full gym and machines, every length: 6 builds).** "1. Glutes & Hamstrings [45m]: Romanian Deadlift (Dumbbell) 4, Machine Hip Thrust 3, Seated Leg Curl 3, Glute Kickback Machine 3" (4 exercises, 13 sets). The report: hamstrings 7 (normal 10), cause `muscle_cap` in "Glutes & Hamstrings"; with nine muscles below normal the plan prints "What holds them back: ... the most sets of one muscle a session may hold (hamstrings)".

**Mechanism (INFERRED from R25 and the code's probe order).** The curl is at the beginner's 3 sets above the minimum (R25), so "one more set on an exercise there" breaks the beginner limit, not the 8-set cap; only the new 2-set exercise breaks the cap. The cheapest step's rule is the beginner's per-exercise limit.

**Why it matters.** The person sees 7 hamstring sets and is told that is the most one session may hold; a coach knows the most is 8. The C7-3 standard (the cause is true of the session it names) is broken for beginners only.

**Fix.** Count the beginner's per-exercise limit as "the exercises for them are at their most sets" (the `exercise_full` wording) when the cheapest step breaks it.

### C8-5 MINOR (wording). One plan prints the same cause sentence twice

**Quoted (rendered, General 3 days, beginner, 45 minutes).** Line 1759 "Fewer sets a week than the plan's usual amount, because the session that trains them already holds the most exercises a session may: side delts 4 (usually 7), abs 4 (usually 7)." Line 1760 "Fewer sets a week than the plan's usual amount, because the session that trains them already holds the most exercises a session may: quads 4 (usually 7), hamstrings 4 (usually 7), calves 4 (usually 7)."

**Mechanism (OBSERVED, render-structure-plans.jest.js).** The lines are grouped by `JSON.stringify(causes)`, which differs by session name (Push & Abs, Legs), but the printed clause for a single session that binds every way ("the session that trains them") drops the name, so two groups print the same sentence.

**Fix.** Name the session when a muscle trains in one session ("Push & Abs already holds the most exercises a session may"), or group by the printed clause. The rendered file is the copy the app follows (round 6 ruling), so the app would repeat it.

---

## Round 7 findings: status (OBSERVED)

| Finding | Status |
|---|---|
| C7-1 | Fixed. 0 of the asked weeks in the plain sweep (full gym at 30 to 90, every other kit at 60) offers a length that asks again or is longer than a standard length that builds without asking; 0 wrong "or N days"; 0 wrong refusal offers ("4 days a week builds, with sessions of 75 minutes", lines 238, 242, 415, 419, 1030, 1034, rebuilt). |
| C7-2 | Fixed. Wellness 5 days builds at 60 (line 1088, "Sessions run about 45 to 63 minutes"; Leg Extension 4 in Quads & Glutes, line 1120). Over every asked week in the plain sweep, no single whole-isolation move (as itself or merged, to any session training the muscle) removes the question while every check passes. |
| C7-3 | Fixed for intermediate and advanced: 0 stated muscle caps with room under both caps and an exercise below 4 sets, 0 "full" sessions at 23 sets or fewer. Line 2240 (men's physique quads focus) now cites the cap with Leg Extension at 4 and quads at 8 direct, true. Per-session causes print (lines 83, 299, 478, 1244, 2027). Residue for beginners: C8-4. |
| C7-4 | Fixed for the cited weeks (figure and women's physique 5 days advanced: Incline Dumbbell Press 3, OBSERVED by probe). Residue where the donor is an arm: C8-3. |
| C7-5 | Fixed. Figure 5 days barbell advanced session 5 reads "Upper Body & Calves"; 0 "Full Body" sessions without a lower compound in the sweep. |
| C7-6 | Fixed. Lines 518 and 522: Incline Dumbbell Press 3, EZ Bar Preacher Curl 3; line 528 chest 11, biceps 13. |
| C7-7 | Fixed at intermediate (line 735 "Seated Calf Raise" on Chest, Triceps & Calves; line 756 calves 6, abs 10, as 4 days). Regression at advanced: C8-1. |
| C7-8 | Fixed for Bikini 4 days Lower B (lines 905 and 908: Lying Leg Curl before the abduction and calf raise). Residue where the shown name differs from the template's: C8-2. |
| C7-9 | Fixed. 0 weeks in the sweep with a letter anywhere but after the first part; wellness 6 days reads "Quads A, Side Glutes & Calves" / "Quads B, Inner Thighs & Calves" (lines 1157, 1179); "Lower Body & Abs" (line 1140) covers its abduction. |
| C7-10 | Fixed. 0 of 1,863 focus builds report "reached" on a gain under 2 sets; 0 at_max picks take a set from another muscle; every near-maximum claim checked true; every pick gaining under 2 sets is either at its maximum or asked (R55). |

## Focus sweep results (OBSERVED, 1,863 builds)

- 0 failing plans, 0 C5 failures, 0 focus weeks refused where the plain week builds, 0 men's physique leg picks trained in two sessions, 0 "room" causes, 0 sets taken from a pick, from a higher tier or below a minimum.
- 0 silent small gains: gains of 0 or 1 set (729 single picks, 106 pair picks) are every one asked about (R55) or at the maximum; 811 asks in all.
- 0 wrong R55 offers: every offered day count rebuilt gains at least 2 sets over its own plain week, with the figure printed; every offered length rebuilt without asking; 0 wrong "reaches" figures.
- C8-1 recurs on focus weeks (55 builds with no calves on a leg day: men's physique 5 days advanced with any pick, figure 6 days advanced, classic 6 days, wellness 5 and 6 days).
- C8-4 recurs: 3 beginner muscle-cap causes at 7 direct (bikini and wellness 3 days hamstrings, classic 5 days chest in Push), and 11 "is full" causes said of a session at 21 to 23 sets with an exercise of the muscle below 4 sets (wellness 5 days side glutes, inner thighs and calves in Lower Body A; classic 6 days side glutes; men's physique 4 days quads and hamstrings pairs; men's physique 5 days advanced chest; figure 5 days triceps and lats in Upper Body). INFERRED: the next set there breaks a rule other than the 24-set limit; the cause printed is not that rule.
- Focus order: 230 builds put a focus isolation after an isolation of the same or a lower tier. Most are R24 (a muscle's isolation follows its own compound: a leg extension after the hack squat, a straight-arm pulldown after the pulldown); the rest are C8-2's template-name reading. Not separated further.
- 29 builds open a session with a 2-set focus lift ahead of a 4-set compound ("Lower B & Abs: Machine Hip Thrust 2, Hack Squat Machine 4", rendered line 2176, women's physique 4 days glutes focus): 09 s7 puts focus first within its tier and the glutes have no donor at or above normal (R49 structural), so not a finding; noted for the lead.

## Verified clean (OBSERVED)

- Every returned plain plan passes `checkPlan` and `senseCheck` (1,046 builds).
- The same weekly sets for every muscle at 30, 45, 60, 75 and 90 minutes in every full gym category, day count and level.
- Abs last in every session; a hinge before a hip thrust in every session holding both; no "Full Body" without a lower compound; one letter style.
- No stand-in in a full gym or machines week beyond the rulebook supplements (Abduction Machine, Cable Hip Abduction, Cable Straight-Arm Pulldown) and the machines kit's Smith Machine Romanian Deadlift; the dumbbell glute bridge in the wellness beginner quads focus (line 2222) is a catalogue name (`from: catalogue`), the beginner's second hip-thrust visit.
- Recovery and joints read by hand on every rendered week: no muscle trained in neighbouring sessions outside the FAST light-dose rule (men's physique and figure 3 days carry the R1 marker, lines 656 and 1231); at most two spinal lifts a session; no two neighbouring sessions both carry a heavy spinal lift; men's physique legs in one session at every day count, including the quads focus (line 2240).
- Refusals at 2 and 3 days (bodybuilding, classic, wellness, figure, women's physique 2 days) state the muscles and offer a day count and length that rebuild as said.
- The finisher rule's new sessions (men's physique 5 days "Chest, Triceps & Calves", "Back B, Biceps & Abs"; 6 days "Shoulders A, Chest & Abs") hold their finishers in sessions that neighbour none of the muscle's other sessions, and every such week stays the same at every length.

## Not run

- 20-ROUND7-USER-AUDIT.md was not read (time box); the user audit's items are judged only where they overlap the coach findings.
- The focus sweep for general and bodybuilding (stopped unfinished at the time box); focus with machines, barbell and plates, home gym or bodyweight; triple picks; focus at 30 and 75 minutes; focus with barbell and plates, home gym or bodyweight.
- Starts other than session 1 (R40).
- A length-move check with two moves at once (only single whole-isolation moves were tried).
- The C8-1 mechanism traced line by line (left INFERRED from the overflow lists and the round 7 comparison).

## Questions for the lead

1. C8-1: should a leg session whose template lists calves always keep a calf exercise where the week trains calves? For men's physique (the founder's D219 addendum 4 wording, and a regression) the answer looks like yes; for the 6-day push/pull/legs weeks at 60 minutes it costs a length question, so it is a trade (calves on push or pull days, or a longer leg day).
2. C8-3: when a lone 2-set lead compound needs its third set and the only donor is an arm above normal in counted sets but at its own minimum, which binds: the round 7 wording (the donor stays at or above normal, down to 2 sets) or the code's arm own-minimum guard? The register has said both (R49 round 4, R49 round 5, C7-4).
