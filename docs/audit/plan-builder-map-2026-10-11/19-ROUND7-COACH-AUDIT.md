# Round 7 adversarial coach audit: structure engine plans (2026-10-11)

Branch `planner/structure-engine-rulebook`, HEAD 91a2f35 ("Planner: round 6 coach and user audits fixed"). Read-only. Authority read in full: 09 (as corrected by 10), D222 and every addendum through "the round 6 coach and user audits" (R1 to R55, Q1 = C, F1 to F6, every "Kept"), 17-ROUND6-COACH-AUDIT.md, 18-ROUND6-USER-AUDIT.md (first half in full, the rest skimmed). Audited: every block of `12-STRUCTURE-PLANS-RENDERED.md` (40 main weeks, 15 variants), line by line, and the real engine beyond the page.

Everything below is OBSERVED (read or run) unless labelled INFERRED. Line numbers are lines of `12-STRUCTURE-PLANS-RENDERED.md`.

## Method

- **Plain sweep, 1,200 builds** (`scratch-coach7-sweep`): full gym, 8 categories x 2 to 6 days x 3 levels x 30/45/60/75/90 minutes; the five other kits x 8 x 5 x 3 at 60 minutes. 1,046 built, 154 refused. On each: `checkPlan`, `senseCheck`, every "below normal" cause against the session loads (`sessionLoad`), sources of every exercise in gym kits, 5-set exercises, 2-set lone lead compounds, isolation order against 09 s7 tiers, names, length asks beside lighter days, the same week at every length.
- **Order sweep, 240 builds** (all kits, intermediate, 60): hinge against hip thrust, "second angle" adjacency, two leg-raise movements in one session.
- **Length-suggestion sweep, 3,600 builds** (`scratch-coach7-len`): every category, day count, kit and level at 30/45/60/75/90; each asked week's "Sessions of N minutes" checked against the shortest longer length that actually builds without asking.
- **Focus sweeps** (`scratch-coach7-focus`): 2,180 single picks (every legal pick, 2 to 6 days; full gym at all three levels, machines and home gym at intermediate; 60 minutes) and 1,395 pairs (full gym, intermediate, 60, every pair of chest, lats, upper back, side delts, rear delts, biceps, triceps, quads, hamstrings and glutes legal in the category), each against its plain week: `checkFocusAgainstBaseline`, `checkPlan`, `senseCheck`, R55 asks, stated causes, men's physique leg sessions, "reached" claims, own work spread over sessions.
- **Hand edits** (`scratch-coach7-edit`): copies of built plans edited, weeks rebuilt with the engine's own `weeksFor`, reported minutes refreshed with `sessionMinutes`, then `checkPlan`, `senseCheck` and `checkFocusAgainstBaseline`. "Demonstrated legal" means all three passed.
- Housekeeping: the scratch files `tools/scratch-coach7-*.jest.js` are deleted. No other file was touched.

---

## BLOCKER

None found. No plan in any sweep fails `checkPlan` or `senseCheck`; no recovery, joint or F4 breach was found (status table below).

## MAJOR

### C7-1 MAJOR. At 30 or 45 minutes the length question offers a longer session than the week needs

**Plans (engine; the rendered page shows only 60-minute main weeks).** 28 of the 1,218 asked weeks in the 3,600-build length sweep offer 75 minutes where 60 builds the same week without asking, every one at 30 or 45 minutes: Men's physique 4 days, Bodybuilding 6 days, Classic physique 6 days, Bikini 5 and 6 days, Figure 4, 5 and 6 days (full gym, intermediate); Figure 4, 5 and 6 days and General 6 days advanced with machines; Figure 5 and 6 days with barbell and plates. Men's physique 4 days is a rendered week (lines 662 to 707, 60 to 65 minutes at 60); asked at 30 or 45 it is told "Sessions of 75 minutes would hold this plan".

**Exact case (OBSERVED, scratch-coach7-print).** Bodybuilding, 6 days, full gym, intermediate:
- At 45 minutes: asks, "Sessions of 75 minutes would hold this plan" (`suggestedLength` 75). Legs A & Abs is 72 minutes: "Barbell Back Squat 4, Romanian Deadlift (Barbell) 4, Barbell Hip Thrust 3, Leg Extension 3, Lying Leg Curl 2, Cable Hip Abduction 2, Cable Crunch 4, Hanging Leg Raise 2".
- At 60 minutes the same week (every muscle's weekly sets identical) builds without asking, 59 to 63 minutes (rendered lines 351 to 404): the Cable Crunch 4 has moved to "Pull B & Abs".

**Mechanism (OBSERVED in code, INFERRED as the cause).** R28's moves for length run only "when that removes the length question" at the chosen length. At 45 no move can reach 50 minutes, so none is made, and `suggestedLength` is read off the unmoved week's longest session (72, so 75). It is never rebuilt at the candidate length, as `daysThatFit` is rebuilt at candidate day counts.

**Why a coach rejects it.** The person is told to train 15 minutes longer, six days a week, than the plan needs. Q1 = C asks the person "to choose a longer session or more days"; the offer must be the true one. Round 6 checked that each offered length holds the plan, not that it is the shortest.

**Fix (within the bounds).** Compute the offered length by building the week at each longer length in `TIME_MODEL.lengths` and offering the first that builds without asking (the moves for length included), exactly as the fewest days are found. Nothing about the week changes; only the offer.

### C7-2 MAJOR. The length question is asked where moving one isolation exercise to a lighter session that already trains the muscle removes it

**Plan (rendered).** Wellness, 5 days (lines 1087 to 1139):
- Line 1090: "Asks before saving: Lower Body A comes to about 70 minutes, against the 60 minutes you chose. Sessions of 75 minutes would hold this plan, or 6 days a week of 60 minutes."
- Lower Body A (line 1095): 8 exercises, 24 sets, "Leg Extension: sets by week 2/2/2/2/2/1" (line 1099).
- Quads & Glutes (line 1123): "3 exercises, 10 sets at the peak, about 41 min, a lighter day", already holding "Leg Extension: sets by week 2/2/2/2/2/1" (line 1126).

**Demonstrated legal (E1).** Leg Extension removed from Lower Body A; Quads & Glutes' Leg Extension 2 to 4. Minutes 64.5 / 59.5 / 60.0 / 45.3 / 60.5 (shown as 65: no question under the whole-minute rule). `checkPlan` pass, `senseCheck` pass, C5 pass. Every muscle's weekly sets unchanged (quads 14). Quads in Quads & Glutes reach 8 direct, the cap, not past it.

**Mechanism (OBSERVED, register).** R44: "Before asking for a longer session, a single set may also move between two sessions that both list the muscle." Every exercise is at least 2 sets, so moving one set out of a 2-set exercise is never legal, and the move that works (the whole exercise) is never tried. R28 moves whole exercises, but only abs and calves.

**Why a coach rejects it.** A coach seeing a 70-minute leg day beside a 41-minute leg day that trains the same muscle with the same machine moves the leg extensions. Asking the person for 75-minute sessions or a sixth day instead reads as the plan not knowing its own week.

**How widespread.** 86 of the 1,046 plain builds ask for length while another session of the same week runs under three quarters of the longest (examples: Wellness 5 days intermediate at 30, 45 and 60; General 5 days intermediate at 30 and 45; Figure and Women's physique 6 days intermediate at 30 and 45; General 6 days advanced at 60). Not all of these can be fixed by one move (General 6 days advanced at 60 cannot: its legs days are both full). The general count of weeks where a whole-exercise move removes the question was NOT run (see "Not run").

**Fix.** Extend R44's between-session move to a whole isolation exercise (or its sets merged into the same exercise there), from a session over the chosen length to a session that lists the muscle and neighbours none of its other sessions, kept only when it removes the length question and every check passes. Being a length move, it runs with R28 after focus.

### C7-3 MAJOR (C6-4 not fully fixed). The stated cause names the per-session cap when the session holds 7 of 8 and the real limit is the session's 24 sets; it now reaches an "Asks before saving" question

**Rendered line 2238** (Men's physique, 5 days, focus quads): "Asks before saving: your quads focus adds only 1 set a week at 5 days, because each session that trains them already holds the most sets of them one session may hold."
- The one session that trains them (lines 2270 to 2277) holds Hack Squat 4 and Leg Extension 3: 7 direct quad sets against a cap of 8, and 24 working sets.

**Demonstrated (E2).** Leg Extension 3 to 4: `checkPlan` fails only "C6 25 working sets (limit 24)" and C18 (67 minutes); quads reach 8, inside C3. So the true cause is "the session that trains them is full". (E2b: Leg Extension +1 with a lateral raise -1 passes `checkPlan` and `senseCheck` but fails C5, "side_delts gave 1 sets to a focus of a lower tier", so R55's question itself is right; only its reason is wrong.)

**Mechanism (OBSERVED, engine.js 1646 to 1683).** `bindersIn` tries every action (one more set on each exercise, or a new exercise of 2 sets) and takes the union of the codes they break, then sorts by `BINDER_ORDER`, where `muscle_cap` ranks first. The +1 set breaks only C6 (set_cap); the new 2-set exercise breaks C3 (9 direct). The union sorted puts the cap first although the cap still has room for a set.

**How widespread (OBSERVED, plain sweep).** 89 of 1,046 plain builds state the cap first while the session holding most of the muscle's sets is at 7 direct or fewer with room for one more set under both caps (examples: General 3 days with machines, dumbbells, barbell, home gym or bodyweight, "quads 7 (usually 10)", legs 7 direct; General 4 days advanced, hamstrings 11 of 12, Lower A 7 direct; Women's physique 3 days quads; Classic 5 days quads and hamstrings). In the focus sweeps the pick's stated cause is the cap with the same room left in 24 of 2,180 single picks and 38 of 1,395 pairs (for example Bodybuilding 5 days, biceps focus: Pull holds 4 direct biceps sets, Upper 3; Men's physique 5 days, quads, as above). Separately, "each session that trains it" overclaims where only the lead session is capped: line 2028 (General 4 days, chest focus: Upper A's only chest exercise is a 4-set bench, line 2033) and line 298 (Bodybuilding 5 days: Upper's chest is one 4-set press, line 338).

**Why a coach rejects it.** The person is asked to choose days or drop a focus on a reason that is not true of their plan; a coach reading "the most sets one session may hold" next to 7 quad sets knows it is wrong. This is round 6's C6-4 standard ("every message line be true") on a question that gates the save.

**Fix.** Rank the cheapest step first: the cause stated is what the next single set breaks; the cap is stated only when every step breaks C3 for that muscle (intersection, not union), or when the session already holds 8 direct or 11 fractional. Say "the session that trains them most" instead of "each session" unless every listed session binds the same way.

## MINOR

### C7-4 MINOR (C6-3 residue). Figure and women's physique 5 days, advanced: a 2-set incline press tops up chest while the lats sit 3 above normal with a 3-set isolation in the same session

**Plans (engine, full gym, advanced, 60).** Figure 5 days and Women's physique 5 days, session 5 "Upper Body": "Lat Pulldown (Neutral Grip) 4, Chest-Supported Row (Dumbbell) 4, Incline Dumbbell Press 2, Cable Straight-Arm Pulldown 3, Cable Lateral Raise 4, Machine Lateral Raise 4, Hammer Curl 3" (24 sets). Weekly: chest 10 of a normal 12, lats 19 of a normal 16. The plan says "chest 10 (usually 12)".

**Demonstrated legal (E3).** Straight-arm 3 to 2, incline 2 to 3: `checkPlan`, `senseCheck`, C5 pass; chest 11, lats 18 (still 2 above normal); minutes 66.5.

**Mechanism (INFERRED).** The round 6 rule ("a lead muscle's lone compound top-up takes its third set from an isolation in the session whose muscle is above normal volume") does not fire here; the lats isolation's third set is placed after it ran, or the lats' R51 named dose protects it. Not traced further.

**Fix.** Re-run the top-up raise after the last normal-volume fill (as round 5 did for R49 and R51 on the settled week), with the same donors.

### C7-5 MINOR (regression from C6-12). An upper-body session with a 2-set calf raise is named "Full Body"

**Plan (engine).** Figure, 5 days, barbell and plates, advanced, 60, session 5 "Full Body": "Seal Row 4, Chest-Supported T-Bar Row 2, Incline Barbell Bench Press 3, Plate Lateral Raise 5, Preacher Curl (Barbell) 3, Prone Reverse Fly 2, Standing Calf Raise (Barbell) 2". No squat, hinge, lunge or hip thrust. 1 of 1,046 plain builds.

**Mechanism (OBSERVED, engine.js sessionName).** Five or more name parts across two regions read "Full Body"; calves count as the lower region (abs are excluded, calves are not).

**Why it is wrong.** A person who opens "Full Body" expects legs; the session has none.

**Fix.** Treat calves as abs are treated when choosing the half ("Upper Body & Calves"), or say "Full Body" only when the lower region holds a compound.

### C7-6 MINOR (new argument on the round 6 Kept item, Classic 5 days). The 2-set incline press stays while the biceps sit 4 sets above normal

**Rendered lines 515 to 522** (Classic physique, 5 days): "5. Upper Body ... Incline Dumbbell Press: sets by week 2/2/2/2/2/1 ... EZ Bar Preacher Curl: sets by week 3/3/4/4/4/2 ... Cable Overhead Tricep Extension: sets by week 3/3/4/4/4/2"; weekly (line 527) "chest 10 ... biceps 14 ... triceps 12" against normals 10, 10, 10.

**New argument.** The Kept reason was "the only donor above normal is the day's named biceps dose (R51)". (a) R51 as narrowed (C5-13) raises a named muscle to 4 "only while it is below normal volume, or nothing else the session lists is"; biceps are 4 above normal. (b) After C6-12 the session is named "Upper Body", so it no longer promises arms to the person.

**Demonstrated legal (E4).** Preacher 4 to 3, incline 2 to 3: all checks pass; chest 11, biceps 13. Lead's call whether this reopens the Kept item.

### C7-7 MINOR (new argument on the round 2 Kept item and C6-10's second bullet). Men's physique at 5 days still gets less calf and waist work than at 4 days, with lighter days free

**Rendered.** Men's physique 4 days: "calves 6 ... abs 10" (line 707). 5 days: line 714 "calves 4 (usually 6)" "because the sessions that train them are full", line 715 "abs 8 (usually 10)"; sessions 3 and 4 run 48 and 49 minutes (lines 732, 738).

**New argument.** The Kept reason (abs or calves in sessions not named for them "adds names and length for the least important work") does not hold here: the founder-approved men's physique week (D219 addendum 4, cited in the round 6 F4 ruling) carries a calf finisher on an upper day, and the engine itself builds "Chest, Triceps & Calves" for men's physique 5 days with machines (line 1731). Length is not at stake (48 minutes against 60).

**Demonstrated legal (E5).** Seated Calf Raise 2 added to "Chest & Triceps" (renamed "Chest, Triceps & Calves", recorded as overflow): all checks pass; calves 6, session 53.5 minutes. Abs were not tried.

### C7-8 MINOR. A top-up leg curl sits after the calf raise

Bikini 4 days, Lower B, lines 909 and 910: "Standing Calf Raise (Machine) ... Lying Leg Curl" (also the bikini glute focus, lines 1853 and 1854). Hamstrings are standard and calves maintenance in bikini (09 B3); 09 s7 orders "P before S before M". The engine places the curl after the session's listed work (C5-8's top-up rule; Lower B lists glute_max, quads, glute_med and calves). 12 such pairs in the plain sweep. New argument against the ruling's reach: "Lower B" covers hamstrings in the person's reading, so the curl is not visibly "a session not named for its muscle". Low stakes; lead's call.

### C7-10 MINOR (R55 gap). A lats focus adds 1 set, is reported "reached", and takes a side delt set to do it, with no question

**Plans (engine, full gym, advanced, 60).** Figure 5 days: lats 19 to 20, `reason: "reached"`, and "To make room for your focus: side delts 16 to 15". The same +1 "reached" in Classic physique 6 days, Figure 6 days, Women's physique 5 and 6 days (5 of 2,180 single picks; the only silent gains under 2 in either focus sweep).

**Mechanism (OBSERVED in the report).** The plain week already holds lats at 19 (3 above normal, see C7-4); the focus target is capped at the focus maximum 20, so +1 "reaches" it and R55 (which asks when a pick "cannot give at least 2 more sets") does not fire.

**Why a coach rejects it.** Figure's signature muscle (side delts) gives a set for one more lat set the person will not notice; the person who ticked lats sees "19 to 20".

**Fix.** Where the plain week is within 2 sets of the focus maximum, report it as `at_max` ("lats already get 19 sets a week, close to the most a week holds") and take nothing from another muscle; or put it in R55's question. Not demonstrated by hand edit (a report-path change).

### C7-9 MINOR. Name residue

- Wellness 6 days, beginner (engine): "Glutes A & Hamstrings" in the same week as "Quads, Side Glutes & Calves (A)" and "Hamstrings, Glutes & Inner Thighs (B)": two letter styles in one week.
- Wellness 6 days, advanced (engine): the pair reads "Glutes, Hamstrings & Abs (A)" and "Lower Body & Abs (B)": the letters promise a pair the names do not show.
- Wellness 6 days (rendered, line 1146): "Glutes, Hamstrings & Abs (A)" holds "Abduction Machine" (line 1150) without naming side glutes, while session 3 (line 1163) names "Side Glutes" (COVERED_BY lets "Glutes" cover glute_med).

---

## Round 6 findings: status (OBSERVED)

| Finding | Status |
|---|---|
| C6-1 | Fixed. 0 men's physique focus builds (single and pair, every pick) train legs in two sessions; line 2238 asks and says "Men's physique trains the legs in one session a week". S14 holds in every sweep. |
| C6-2 | Fixed. No Lying Dumbbell Leg Curl or Copenhagen Adduction in any full-gym or machines plan; the only non-catalogue names there are the rulebook supplements (Abduction Machine, Cable Hip Abduction, Cable Straight-Arm Pulldown) and the machines kit's Smith Machine Romanian Deadlift. Bodybuilding 4 days Lower B now repeats the Lying Leg Curl (line 283). |
| C6-3 | Partly fixed. Men's physique 5 days Back A: rows together, press after (lines 718 to 721). General 5 days advanced session 5: one Machine Row 3, no 2-set pulldown. Classic 5 days stays Kept (new argument: C7-6). Figure and Women's physique 5 days advanced still carry the 2-set incline beside a surplus lats isolation (C7-4). |
| C6-4 | Partly fixed. Another muscle's cap is now named (`muscle_cap_other`), but the union of probe results still ranks the cap first when the cheapest step breaks only the 24-set limit (C7-3), now inside an R55 question (line 2238). |
| C6-5 | Fixed. Own beside own and counted beside minimum: lines 1619, 1826, 1926, 2030, 2083, 2143, 2195. |
| C6-6 | Fixed. Line 2080 "lats 15 to 19", line 2081 side delts 16 (each session at 8 direct); the incline top-up is gone, chest 10 to 7 named at line 2083. |
| C6-7 | Fixed. 0 of 240 builds separate a "second angle" from its first; the label prints (line 47 and others). |
| C6-8 | Fixed as ruled. 0 of 240 builds put a hip thrust before a hinge. Spine-first across ranks was not adopted (line 1066 to 1068: hack squat, then the DB Romanian deadlift, then the hip thrust), which is the round 6 ruling. |
| C6-9 | Fixed. Incline Machine Press after the barbell bench (lines 187, 252, 536, 1353, 1561). |
| C6-10 | Partly fixed. The note now prints on the 6-day weeks that add 3 sets or fewer (lines 183, 762, 979, 1349, 1557). Men's physique 5 days still gives less calf and abs work than 4 days; now explained, not resolved (C7-7). |
| C6-11 | Fixed. "room" never leads a stated cause in any sweep (it trails as a secondary limit in 2 plain builds, Bodybuilding 5 days with barbell and plates, and 3 single-pick builds). Bodybuilding 5 days beginner 45: Legs A and Legs B hold 5 exercises each. |
| C6-12 | Fixed for the cases cited; new residue C7-5 ("Full Body" upper day) and C7-9. |
| C6-13 | Fixed. Isolations print "15 to 30 reps by effort" (lines 51, 1998), loaded-free compounds "6 to 30" (lines 1994, 2011). |
| C6-14 | Fixed. Lines 1683 and 1684: Dumbbell Calf Raise 4 + Seated Dumbbell Calf Raise 2, calves 6. |
| C6-15 | Fixed. Wellness 5 days Lower Body A holds no hinge (lines 1095 to 1103); the week has one hinge day. |

## Verified clean (OBSERVED)

- Every returned plan passes `checkPlan` and `senseCheck`: 1,046 plain builds, 2,180 single picks, 1,395 pairs, 240 order builds.
- Focus: 0 C5 failures; 0 focus weeks refused where the plain week builds; 0 "reached" claims below target; 0 "To make room" entries whose counted figure falls below the minimum; every pick gaining under 2 sets asks (R55), except the 5 at the focus maximum (C7-10).
- The same week at every length: every full-gym category, day count and level has identical weekly sets per muscle at 30, 45, 60, 75 and 90.
- No 5-set exercise in a full-gym plan. No overhead press anywhere. Abs last everywhere (S9).
- Order: hinge before hip thrust everywhere; "second angle" pairs adjacent; never two leg-raise movements in one session.
- Recovery and joints: `checkPlan` (C2, C8 to C15) passes every build in every sweep; read by hand on the rendered weeks: no muscle trained in neighbouring sessions outside the FAST light-dose rule (men's physique and figure 3 days carry the R1 marker, lines 655 and 1237); J2 never met (front-delt pressing never 4 fractional in two neighbouring sessions); no two neighbouring sessions both hold a heavy spinal lift; at most two spinal lifts a session; at most two hinge days a week.
- Men's physique: legs in one session at every day count and every focus; calves on an upper day only as ruled.
- Rendered "or D days" and "Sessions of N minutes" claims at 60 minutes match the engine; the 30 and 45 minute offers are C7-1.

## Not run

- A full count of weeks where moving a whole isolation exercise to a session that lists the muscle removes the length question (C7-2 is demonstrated on one week only).
- Focus picks at other lengths than 60, focus with dumbbell, barbell or bodyweight kits, triple picks.
- Starts other than session 1 (R40).
- The cause of C7-4 traced in code (left INFERRED).
- The second half of 18-ROUND6-USER-AUDIT.md was skimmed, not read line by line.

## Questions for the lead

1. C7-2: may R44's move between sessions take a whole isolation exercise (not one set) when that removes the length question?
2. C7-6 and C7-7 re-raise Kept items with new arguments (the "Upper Body" name and biceps 4 above normal; the founder-approved men's physique calf finisher and the engine's own "Chest, Triceps & Calves"). Do either reopen?
3. C7-10: should a pick within 2 sets of the focus maximum read as "already at the most" and take nothing from another muscle?

