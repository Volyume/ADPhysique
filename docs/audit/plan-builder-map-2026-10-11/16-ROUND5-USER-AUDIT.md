# Round 5 end-user audit: structure engine plans

Branch planner/structure-engine-rulebook, HEAD 566e4f8. Source read in full: docs/audit/plan-builder-map-2026-10-11/12-STRUCTURE-PLANS-RENDERED.md (53 plan blocks: 40 main-matrix weeks, of which 8 are "Not built", and 13 variants). Also read in full: 14-ROUND4-USER-AUDIT.md and the D222 addendum sections in DECISIONS-2026-07-09.md (R1 to R53, "Kept, with reasons", "For the integration"). Line numbers below are lines of the rendered file.

How I checked. I read every plan. I then ran the real engine with throwaway jest files (all deleted; no other file edited; no git command beyond read-only status and log). Runs: (a) 1,842 builds across every category, day count, kit, experience level and 30/60/90 minutes, to compare each session name with its contents; (b) 409 single-pick focus builds (8 categories x 2 to 6 days x every legal pick, full gym, intermediate, 60 minutes) against the same week with no focus, and the same set for sets taken without a "To make room" line; (c) every category and day count at 30, 45, 60, 75 and 90 minutes, checking every claim in the "Asks before saving" line by building what it offers; (d) all 160 beginner full-gym sessions; (e) A/B similarity and same-movement pairs across 191 plans in 6 kits. Where I say "engine run" the number did not come from the rendered file. The weekly-sets line at the end of each plan is ignored, as instructed.

The standard: "no instance at all where I or another end user or even a coach loads up a plan and says, okay, this doesn't make sense."

---

## Status of round 4's 17 findings

| Round 4 | Status now | Evidence |
|---|---|---|
| U4-1 length question | Mostly fixed in content. The line names the sessions and the offers are true (engine run: all 18 weeks that ask at 60 minutes, and every suggested length and day count, build without a further question). 30/45 minutes and "what if I keep my length" are integration items. Wording residue is U5-11. | lines 10, 38, 77 |
| U4-2 chest focus changes nothing | Fixed for Men's physique 4 days only (R47: chest 8 to 14, line 1544). Open everywhere else: U5-1. | |
| U4-3 silent no-effect picks | Partly. Picks now print a line, but it reads "14 to 14" (line 1979); the "has no effect" and "already at" sentences never appear in the file. U5-1, U5-3. | |
| U4-4 muscle codes and jargon | Codes fixed (no `side_delts` anywhere). New jargon replaced the old: U5-3, U5-5. | |
| U4-5 refusals | Improved: plain muscle names, "safety limits" gone, the day count offered is true (all 8 checked). | lines 225, 229 |
| U4-6 Men's chest two presses | Fixed: incline press then pec deck fly, chest 8 (line 665 to 667). | |
| U4-7 Classic 4 days chest | Fixed by message: the bench is now 3 sets and the plan says "chest 7 of 10" (line 405). | |
| U4-8 Bodybuilding 4 days biceps | NOT changed and not in "Kept": U5-8. | lines 237 to 264 |
| U4-9 kit labels | Integration. One residue: U5-17. | |
| U4-10 beginner barbells | Fixed. Engine run: 0 barbell compounds in 160 beginner full-gym sessions; the beginner variants open on a machine press or a hack squat. | lines 1684, 1698, 2093 |
| U4-11 same movement twice | Only the pullover twin was fixed. Lateral raise, abduction, leg curl and row pairs remain: U5-6. | |
| U4-12 next-day annotation | Fixed: "stop 2 reps short of failure every week: the next session trains this muscle again" (lines 627, 1180). Plain and true. | |
| U4-13 two-set exercises, U4-14 rest, U4-16 "Shoulders" names | Kept, with reasons. Not re-raised. | |
| U4-15 uneven session lengths | Not addressed, not in "Kept": U5-14. | |
| U4-17 jargon names | "Side Glutes" and "Inner Thighs" done. "Lower C", four-part names, new oddity "Glutes B" mid-name remain: U5-13. | |

---

## Findings

### U5-1  BLOCKER  A focus pick still leaves the plan identical, or one set better, in the plans where a person most expects a change

Plans in the file: "General, 4 days, focus chest" (line 1929: chest "10 to 11 sets a week"), "Classic physique, 5 days, 75 minutes, focus lats and side delts" (line 1979: side delts "14 to 14 sets a week, short of 18"). The other variants do change (Men's 4 days chest 8 to 14; Bikini glutes 14 to 18; Women's glutes 10 to 15; Bodybuilding lats 16 to 20; Wellness quads 10 to 12).

Quoted:
- "Focus on chest: 10 to 11 sets a week, short of 14: its sessions are at their limits: a full session of 24 sets. With 5 days a week it reaches 14." (1929)
- "Focus on side delts: 14 to 14 sets a week, short of 18: its sessions are at their limits: the most side delts work one session may hold; a full session of 24 sets." (1979)

What a person thinks: "I ticked chest and the app gave me one more set, and says 10 to 11 as if that were a focus." And for "14 to 14": "it did nothing." This is the founder's own complaint (D219, "Even with specialising chest I get two exercises!") coming back through a different door.

Engine run (full gym, intermediate, 60 minutes, every legal single pick, 409 builds):
- 70 builds (17%) return a plan identical, exercise for exercise and set for set, to the plan without the focus. A further 55 add one set a week or less. 125 of 409 in all (31%).
- Counting only the picks people actually choose (chest, lats, upper back, side delts, rear delts, biceps, triceps, quads, hamstrings, glutes; 315 builds): 47 identical, and 95 add at most one set (the 47 included).
- At 4 days (where it is worst): Bodybuilding adds nothing for any of chest, lats, upper back, side delts, rear delts, biceps, triceps; Classic adds nothing for chest, lats, biceps, triceps, glutes, and one set for each of upper back, side delts, rear delts; Figure and Women's physique add nothing for chest, upper back, side delts, rear delts, biceps, triceps.
- Side delts, the signature muscle of Figure, Women's physique and Men's physique, is unchanged by the pick at Figure 3 and 4 days, Women's 3 and 4 days, Men's 2 and 3 days, Bodybuilding 4 days, Bikini 3 days, General 2 days. Chest is unchanged at Bodybuilding 4, Classic 4, Figure 3 and 4, Women's 4, Men's 2 and 3, Bikini 2 and 3, General 2.
- The "With N days a week it reaches T" help is missing exactly where it is most needed. It prints only when the pick reaches its full target at a higher day count. In 17 of the 70 identical cases it prints nothing, although in at least some of them more days do help: Bodybuilding 5 days takes the chest pick from 12 to 15 against 10 at 4 days (the pick stays short of 18, so no day count counts as "reached"); Figure and Women's 5 days take side delts to 16 against 12 at 4 days.
- No silent theft (checked): in all 409 builds no other muscle lost any sets of its own without being named in "To make room". That part is clean.

How widespread: any category at 3 to 4 days, plus 2-day weeks.

Suggested fix: (1) when a pick adds nothing, or fewer than 2 sets, say it first and in plain words, before the plan is shown or saved: "Chest already gets all the sets your 4 days can hold, so this pick changes nothing. With 5 days chest goes from 10 to 15." (2) offer the fewest more days at which the pick gains, not only the day count that reaches the full target. (3) where the plan structure allows it, do what R47 did for Men's physique: let the pick take a session in the other half of the body that touches none of its sessions. Items 1 and 2 are content; item 3 is a founder-level call that I only raise. (4) Where nothing helps at any day count (Figure and Women's physique side delts at 4 days), say so and offer nothing false.

---

### U5-2  MAJOR  Bikini, 3 days: a session is named for abs and holds no abs

Plan: "Bikini, 3 days" (default full gym, intermediate; engine run also: advanced; every length).
Quoted (line 827 to 833): "**3. Quads, Side Glutes, Abs & Calves**" holds Hack Squat Machine, Leg Extension, Abduction Machine, Cable Hip Abduction, Standing Calf Raise (Machine), Seated Calf Raise. No abs exercise. Both abs exercises (Cable Crunch, Hanging Knee Raise) are in session 1 "Glutes, Hamstrings & Abs" (809 to 815).

What a person thinks: "the app forgot my abs day", or "the name is wrong". This is exactly the "session name that does not match its contents" class that R31 set out to close.

Cause (read in the code, not inferred): `sessionName` in engine.js adds muscles a session holds that its name does not cover, but never removes one the template name already promises; the template name is "Quads, Side Glutes & Abs", and the abs moved to session 1 afterwards.

How widespread: engine run over 1,842 builds, 6 builds, all Bikini 3 days full gym at intermediate and advanced. A second case outside the file: Men's physique 6 days "Legs & Calves" has no calf exercise for a beginner at 30 minutes in three kits (machines and cables, dumbbells only, home gym). No other name in the matrix names a muscle with zero exercises.

Suggested fix: drop a named muscle from a session's name when it holds no exercise for it (here the name becomes "Quads, Side Glutes & Calves").

---

### U5-3  MAJOR  Focus and kit messages: stacked colons, "its", "14 to 14", a remedy that is not offered

Quoted, with what is wrong:
- "Focus on side delts: 14 to 14 sets a week, short of 18: its sessions are at their limits: the most side delts work one session may hold; a full session of 24 sets." (1979) Three colons; "14 to 14" reads as a bug; "18" has never been explained; "its" has no antecedent (the plural "side delts" is not "its"); the same sentence blends two different limits.
- "Focus on chest: 10 to 11 sets a week, short of 14: its sessions are at their limits: a full session of 24 sets." (1929) "Short of 14" reads as a promise the app failed to keep.
- "To make room for the focus: rear delts 8 to 6 sets a week of its own (its minimum is 6); calves 6 to 4 sets a week of its own (its minimum is 4)." (1546; also 1739, 1831, 1984, 2042) "Sets a week of its own" is coach language (it means direct sets, as opposed to the help a muscle gets from presses and rows); "its" for a plural; a person cannot see which exercise disappeared. It is good that something taken is named; it needs plain words.
- "With this equipment side delts has one exercise: 5 of its 8 sets a week." (1892) Grammar ("side delts have"), and "5 of its 8" does not say what 8 is.
- The renderer holds two sentences for a pick that changes nothing ("Focus on X has no effect: this category does not train it directly." and "Focus on X: already at N sets a week, the most a week holds for it, so the plan is the same."). Neither appears anywhere in the file, so I could not judge them in a rendered plan; the first reads a little cold ("has no effect") for a bikini athlete who picked glutes, and the second is fine.

Suggested wording:
- "Side delts: 14 sets a week now, and your 4 days cannot hold more. Each of the two sessions that train them is already at 8 sets." (no "short of 18")
- "To make room for chest, rear delts goes from 8 to 6 sets a week (6 is the least we plan) and calves from 6 to 4."
- "With this equipment side delts get one exercise, so they get 5 sets a week rather than the 8 we aim for."

---

### U5-4  MAJOR  "Below normal volume": the numbers cannot be checked against the plan, and the line is noisy

Quoted (62 such lines in the file, 221 muscle entries): e.g. line 39 "Below normal volume (...): chest 6 of 10, lats 9.5 of 10, upper back 9 of 10, side delts 6 of 10, rear delts 9.5 of 10, triceps 9 of 10, quads 6 of 10, hamstrings 6 of 10, glutes 7 of 10, glute medius 3 of 6, calves 6 of 10, abs 6 of 10."

What a person thinks:
- They cannot count it. General 3 days "triceps 9 of 10": the plan lists Cable Overhead Tricep Extension 3/3/4/4/4/2 and Tricep Pushdown 2/2/2/2/2/1, which is 6 triceps sets in the biggest week. The 9 includes half credit from the presses (the weekly line says "triceps 9, own 6"). Nothing on screen says so, so "9 of 10" and "4.5 of 10" ("lats 4.5 of 10", line 11) look wrong.
- Fractions. 28 of the 221 entries are half sets (4.5, 9.5, 3.5, 12.5): you cannot do half a set.
- Noise. 44 of 221 entries are within one set of normal (e.g. "rear delts 9.5 of 10", "glute medius 5 of 6", "quads 13 of 14", lines 39, 78, 453); they sit in the same line as real gaps, so the real gaps (chest 4 of 10) are diluted and the whole plan reads as a problem.
- Volume. General 2 days lists all 13 muscles on one line (line 11); Figure 3 days and Women's physique 3 days list 10. A person reads "everything is below normal" about a plan they chose.
- "Normal" is never defined.
- Two names for one muscle. Session names say "Side Glutes" and "Inner Thighs" (827, 1116); the messages say "glute medius" and "adductors" (78, 995).

Suggested fix: count only what the person can count (their own sets) or say "counting the help from your presses and rows"; round to whole sets; omit entries within one set of normal; when more than about five muscles are below normal, say it once ("With 2 days a week every muscle gets its minimum; more days raise it") instead of listing them; define normal once ("the usual 10 sets a week"); use "side glutes" and "inner thighs" in messages.

---

### U5-5  MAJOR  The "why" in brackets reads as garbled

Quoted (on all 62 "Below normal" lines and on every "short of" focus line):
- "(sets a week; its sessions are at their limits: a full session of 24 sets; the most of that muscle one session may hold)" (e.g. 1191)
- "(sets a week; its sessions are at their limits: the recovery and joint rules for the rest)" (680, 726, 1236)
- "(sets a week; its sessions are at their limits: the most exercises one session may hold)" (1681, 1711, 2090)
- "(sets a week; its sessions are at their limits: a full session of 24 sets; the recovery and joint rules for the rest): abs 7 of 10." (455)
- Up to four such lines in one plan (line 1980 to 1983), each with a different bracket.

What a person thinks: "its" refers to nothing; "sets a week" is a unit stuffed into the reason; "at their limits" of what; "the recovery and joint rules for the rest" (the rest of what?); "the most of that muscle one session may hold" is clumsy; "24 sets" appears as if it were a law of nature. The recovery and joint wording also sits close to the safety language the product is careful with, and here it is applied to ordinary session limits.

Suggested fix: one plain sentence per cause, written once and reused: "These muscles are trained in sessions that are already full (24 sets)", "These muscles already get the most one session allows", "Your joints and recovery limit the rest". Put the unit ("sets a week") in the label, not in the reason. Merge lines with the same cause.

---

### U5-6  MAJOR  The same movement twice, back to back, up to 4 + 4 sets (re-raised: not in "Kept")

File count (main matrix and variants, by script over the rendered text): two lateral raise exercises in one session in 52 sessions across 37 plan blocks; two leg curls in 21 sessions; two abduction exercises in 8; two row exercises in 17; two calf raises in 24 (defensible: knee straight and bent, R24).

Quoted:
- "Dumbbell Lateral Raise ... 3/3/4/4/4/2" then "Machine Lateral Raise ... 3/3/4/4/4/2" (Bodybuilding 5 days Push & Calves, 295 to 299; same pattern 4 + 4 in Classic 5 days 466, Men's 3 days 600 to 604, Figure 3 days 1153 to 1157, Figure 4 days and Women's 4 days Delts, Chest & Triceps 1212 to 1216 and 1407 to 1411).
- "Abduction Machine ... 3/3/4/4/4/2" then "Cable Hip Abduction ... 3/3/4/4/4/2" (Bikini 3 days 827, Bikini 4 days Lower B 863 to 869, Bikini 5 days 906 to 913, Wellness 5 days 1063 to 1066).
- "Lying Leg Curl 3/3/4/4/4/2" then "Seated Leg Curl 3/3/4/4/4/2" (Bodybuilding 4, 5 and 6 days; Wellness 5 days 1048 to 1049; the Wellness case is required by R33 and 09 B7).
- "Chest-Supported Row (Dumbbell)" then "Dumbbell Row" (Bodybuilding 6 days focus lats Pull B, 1868 to 1869).

What a person thinks: "padding: 8 sets of lateral raises in a row, just on different gear." R24 and R33 hold these as deliberate (different implement or position); the register's "Kept" list does not name them and the founder's standard has no exception for "deliberate". Nothing on screen says why.

Suggested fix: keep the engine rule if it must, but (1) show a short reason beside the second exercise ("different angle for the same muscle"), (2) put another muscle's exercise between the pair, and (3) where the pair adds up to 7 or 8 sets, consider one exercise at 4 and the rest in another session.

---

### U5-7  MAJOR  Men's physique 4 days with a chest focus: a chest press sits between the squat and the deadlift

Plan: "Men's physique, 4 days, focus side delts and chest" (lines 1557 to 1565).
Quoted, in order: Hack Squat Machine, **Incline Dumbbell Press**, Romanian Deadlift (Dumbbell), Leg Extension, Seated Leg Curl, **Cable Crossover (High to Low)**, Cable Crunch, Hanging Knee Raise. The session is called "Legs, Chest & Abs".

What a person thinks: "why is a chest press between my two leg lifts, and a fly between leg curls and crunches?" It looks like two plans shuffled together. The engine did this on purpose (R47 puts chest on the leg day and orders by lift weight), and it works: chest goes 8 to 14. But the reading order is wrong-looking.

Suggested fix: keep each body half together inside the session (all leg work, then chest, then abs, or chest first); never alternate halves.

---

### U5-8  MAJOR  Bodybuilding 4 days: one biceps exercise, once a week (round 4's U4-8, still open and not in "Kept")

Plan: "Bodybuilding, 4 days" (lines 237 to 264) and the beginner version (engine run).
Quoted: Upper A (237 to 244) has no biceps exercise; Upper B has "EZ Bar Preacher Curl: sets by week 3/3/4/4/4/2" (263), the only curl in the week. Lower days: none.

What a person thinks: a bodybuilder's arms are four sets of one curl on one day. Biceps does not appear in "Below normal volume" (line 235) because the count includes half credit from rows and pulldowns (11 against 10), so the plan neither fixes it nor says it. Triceps get two exercises. Classic, Figure and Women's physique at 4 days give biceps two exercises (6 sets).

Suggested fix: a second biceps exercise (2 to 3 sets) in Upper A, or a plain line "your arms get extra work from rows and pulldowns at 4 days; 5 days gives them their own session".

---

### U5-9  MAJOR  Figure and Women's physique: the only direct glute exercise is one 3-set hip thrust a week

Plans: Figure 3 to 6 days; Women's physique 3 to 6 days. Quoted: Women's physique 4 days Lower A "Barbell Hip Thrust: sets by week 2/2/3/3/3/2" (1402) is the only direct glute exercise in the week (the abduction work is for the side glutes); Lower B (1416 to 1424) has none (leg press, curls, abduction, calves, abs). Figure 4 days: same (1206).

What a person thinks: for the two categories where the lower body, glutes included, is judged, a woman sees squats and deadlifts plus one hip thrust of 3 sets. At 4 days and up she will not be told it is thin: the glutes do not appear in "Below normal volume" (lines 1385 to 1387; at 3 days they do, line 1149 and 1347) because the count includes half credit from squats and deadlifts (10 against 10). Per the research tiers glutes are "standard" for these two categories, so this is by design (S10: own sets at least half the minimum); my point is only that it reads as a token for a key muscle.
Engine run: the same single 3-set hip thrust is the glute exercise in General 3 to 6 days, Bodybuilding 4 and 5, Classic 4 to 6 (where it is less of a problem).

Suggested fix: a second glute exercise in the second lower session (machine hip thrust, kickback) for Figure and Women's physique, or a line saying the glutes also work in squats and deadlifts.

---

### U5-10  MAJOR  Dumbbell plans: the A and B days are the same session with two exercises swapped

Plan: "Men's physique, 4 days, dumbbells only" (1594 to 1619). Back A and Back B share 6 of 8 distinct exercises: Chest-Supported Row (Dumbbell) and Dumbbell Row (A: 4 sets then 3; B: 4 then 3, swapped), Straight-Arm Dumbbell Pullover 4 on both, Dumbbell Lateral Raise and Leaning Lateral Raise (swapped), Dumbbell Rear Delt Fly 3 on both; only the curl differs (Preacher Curl vs Hammer Curl).

What a person thinks: "Back B is Back A." The kit is limited; an A/B split with no variation does not look like two different days.
Engine run, beyond the file: the same shape in Men's 4 days home gym (75% shared), and in barbell-and-plates weeks (General 4, Classic 4 Upper A and B share 5 of 7 exercises, Push A and Push B share 3 of 4 in General, Classic and Women's 6 days) and bodyweight (Classic 6 days Push A and Push B 80%).

Suggested fix: spread the exercises (one lateral variant per day, a different row each day, curl and fly alternating).

---

### U5-11  MINOR  The length question: clear about the sessions, but a few wording faults

Quoted: "Asks before saving: Upper comes to about 68 minutes; Lower & Abs comes to about 72 minutes, against the 60 you chose. A 75-minute session fits, or 5 days a week at 60 minutes." (10; same shape on 19 plans)

Checked and good: it names the sessions; both offers are true (engine run, all 18 weeks that ask at 60 minutes: the suggested length and the day count both produce a week with no further question).

Faults: (1) "against the 60 you chose" has no unit; "60-minute sessions you chose" is clearer. (2) "A 75-minute session fits" is ambiguous (does it mean one session? the whole week at 75?). (3) It lists two ways out and says nothing about a third (keep 60 and accept the longer days); a person does not know whether the plan can be saved as it stands. (4) At 30 and 45 minutes every plan asks (engine run: 32 of 32 at 30 minutes, 31 of 32 at 45; 75 is the answer in 26 of 32); "A 75-minute session fits" to someone who chose 30 is unhelpful. The register already files the 30/45 point and the "keep my length" screen under "For the integration", so I record only that the content is true and unhelpful there.

---

### U5-12  MINOR  A session name promises a muscle that gets one 2-set exercise

Quoted (a muscle is added to the name by a single exercise of two sets):
- "Back A, Biceps & Chest" (Men's physique 5 days, 683 to 689): chest is "Incline Dumbbell Press ... 2/2/2/2/2/1, rest 150 s", wedged between two rows.
- "Shoulders, Arms & Chest" (General 5 days, 160 to 165): chest is one "Incline Barbell Bench Press ... 2/2/2/2/2/1, rest 180 s" as the first exercise.
- "Hamstrings, Glutes B & Inner Thighs" (Wellness 6 days, 1116): inner thighs is one "Hip Adduction Machine ... 2/2/2/2/2/1"; Wellness 5 days session 1 (1043 to 1051) has the same.
- "Lower & Abs" (Bikini 2 days, 779 to 787): abs is one "Cable Crunch ... 2/2/2/2/2/1". Wellness 4 days "Lower A & Abs" and "Lower B & Abs" (997 to 1025): each abs exercise is 2 sets.
Engine run over 1,842 builds: 38 distinct session-name and muscle pairs have a named muscle held by two sets or fewer.

What a person thinks: "Chest" in a back day's name sets the expectation of a chest block; there is one two-set press with 150 or 180 seconds of rest. R51 ("a muscle a session is named for holds at least 4 sets") covers only a template's core muscles, not these.

Suggested fix: name a muscle only when the session gives it at least 3 sets, or merge the 2-set tail into a day that is already the muscle's day.

---

### U5-13  MINOR  Session names that read oddly

- "Hamstrings, Glutes B & Inner Thighs" (Wellness 6 days, 1116): the letter sits inside a three-part list, so it reads as a muscle called "Glutes B"; the sister session is "Glutes A & Hamstrings" (1092). Cause: `sessionName` splits the template name "Hamstrings & Glutes B" and adds "Inner Thighs" in the middle.
- Four-part names, two of which simply mean "lower body": "Glutes, Hamstrings, Quads & Inner Thighs" (1043), "Hamstrings, Side Glutes, Inner Thighs & Calves" (1063); also "Back, Rear Delts, Biceps & Abs" (1246) and "Shoulders, Arms, Chest & Lats" (492, 2021). Long on a phone.
- "Lower C" (Bikini 5 and 6 days, 915, 960): three exercises, nothing to say how it differs from A and B (round 4's U4-17 residue).

Suggested fix: "Glutes & Hamstrings B" (letter at the end), "Lower body" for the first two, and a one-line subtitle for C.

---

### U5-14  MINOR  Light days among 60-minute days, with no word (round 4's U4-15, still open)

Quoted: Bikini 6 days "Side Glutes, Abs & Calves" about 33 min, 3 exercises (973); "Lower C" about 41 min (915, 960); Men's physique 6 days "Shoulders A & Chest" about 40 min (729) and "Back B & Biceps" about 41 min, 3 exercises (755); Wellness 6 days "Hamstrings, Glutes B & Inner Thighs" about 43 min and "Quads B, Inner Thighs & Calves" about 44 min (1116, 1130); Wellness 5 days "Quads & Glutes" about 46 min (1071).

What a person thinks: they chose 60 minutes; one session is half of that. The only line they get is the one about the longest session. Say it is a lighter day ("these days are shorter on purpose") or fold the 3-exercise days together.

---

### U5-15  MINOR  "Longest session about 65 minutes against the 60 chosen."

Appears on 21 plan blocks, 14 of them in the main matrix (e.g. 124, 173, 635, 886). It sits within the 5-minute tolerance, asks nothing and offers nothing, and reads like a complaint. "Against" is odd English here.
Suggested fix: print nothing within tolerance, or "Your longest session is about 65 minutes, close to the 60 you chose."

---

### U5-16  MINOR  Bodyweight reps "6-30" with no word on what that means

Quoted: "Push-Up: sets by week 3/3/4/4/4/2, 6-30 reps, rest 135 s" (1898), also lines 1899, 1900, 1906 to 1908, 1915, 1916. R4 ruled this deliberately (a bodyweight compound's reps follow effort); on its own, "6-30" tells a person nothing. Also, "Pull-Up" and "Chin-Up" 4 + 4 sets in the same session (1906 to 1907) is a lot of the same pull for the people who are choosing "no equipment".
Suggested fix: one line under the exercise: "Choose a version you can do for 6 to 30 reps; stop about 2 reps before you cannot".

---

### U5-17  MINOR  Wellness, 4 days, dumbbells only: a slider curl in a dumbbell plan

Quoted: "Slider Leg Curl (Bodyweight): sets by week 2/2/3/3/3/2" (1809). Round 4 ruled that dumbbell kits curl with a dumbbell before sliders, and the Men's physique dumbbell plan does ("Lying Dumbbell Leg Curl", 1607). The Wellness plan reaches the slider by the engine's rotation of names between visits (engine.js, `rotatedNames`). A dumbbells-only person is asked for sliders (or towels on a smooth floor) when a dumbbell version exists, and "(Bodyweight)" in a dumbbell plan reads like a mistake.

---

### U5-18  MINOR  General 5 days: chest twice, back once

Quoted: Push & Calves (134) and Shoulders, Arms & Chest (160) both train chest; Pull (142) is the only session with a row or pulldown. The other 5-day plans (Bodybuilding, Classic, Figure, Women's) train back twice. A person who counts the week sees two pressing days and one pulling day. The weekly sets are balanced; the frequency is not. This follows the 09 template for general fitness, so it is a question rather than a fault: is the 5-day general week meant to be that way round?

---

## What reads well

- Session names now say what is inside, apart from U5-2 and the minor oddities. I compared 1,842 builds and found a named muscle with no exercise in only two cases (U5-2 and one 30-minute beginner edge).
- Abs last and compounds before isolation in the plans I read; a muscle's isolation follows its own compound (a fly after the press).
- Refusals lead with the outcome and name muscles in plain words; the day count offered is true in all 8 cases (Figure 2 days builds at 3, the rest at 4).
- The "Asks before saving" line names each session and its minutes, and every offer in it is true at 60 minutes. The register says the week is the same at every length (R48); I did not re-run that gate.
- A pick that works is visible and says what it cost: Men's physique 4 days chest 8 to 14 and "rear delts 8 to 6, calves 6 to 4"; Women's glutes 10 to 15 with the four muscles that gave. In 409 single picks no muscle lost sets of its own without a line naming it.
- Beginner plans open with machines and dumbbells (0 barbell compounds in 160 beginner sessions) and never ask for more than they hold.
- "stop 2 reps short of failure every week: the next session trains this muscle again" is plain and true.
- Muscle names in messages are words, not codes. No em dash, no US spelling and no shaming or guilt language anywhere in the file (grep: 0 em dashes; the only guilt-adjacent wording is the "Below normal volume" label, see U5-4).
- Sets by week, the recovery week at the end, and the length in minutes are easy to read.

## Left alone (deliberate or integration)

U4-13 two-set exercises, U4-14 odd rest times (105, 135, 165 s), U4-16 "Shoulders" sessions with no press, the 30/45 minute screen, the "keep my length" choice, the kit labels (bar, bands, bench) and the refusal's list of categories that do build. I also noted but did not raise: Figure 3 days and Women's 3 days side delts (12 and 8 of 14): R35's note in rulebook.js says Women's keeps the general week on purpose, and the plan says so; Figure 4 days and Women's physique 4 days share their two upper sessions exercise for exercise; the heading "General, 4 days, focus chest (R46: room made above the standard)" carries a ruling number, which belongs to the audit file, not the app.

## Housekeeping

Throwaway files scratch-user5-names, -focus, -length, -dups, -beginner, -kits, -took and -thin (all .jest.js) were created under docs/audit/plan-builder-map-2026-10-11/tools/ and deleted. The files scratch-coach5-a to -d in the same folder are not mine and were left. Scratch outputs are in the session scratchpad only. No other file edited; no git command beyond read-only status and log.
