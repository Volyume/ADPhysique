# Round 6 end-user audit: structure engine plans

Branch planner/structure-engine-rulebook, HEAD 1f8b8d5. Read in full: docs/audit/plan-builder-map-2026-10-11/12-STRUCTURE-PLANS-RENDERED.md (53 plan blocks: 40 main-matrix weeks, 8 of them "Not built", and 13 variants), 16-ROUND5-USER-AUDIT.md, and the D222 addenda for rounds 4 and 5 in DECISIONS-2026-07-09.md ("Kept, with reasons" and "For the integration" treated as deliberate). Line numbers below are lines of the rendered file.

Standard: "no instance at all where I or another end user or even a coach loads up a plan and says, okay, this doesn't make sense."

## How I checked (what is observed, what is inferred)

Observed by running the real engine (throwaway jest files, all deleted; no other file touched; read-only git only):
- 3,600 builds: 8 categories x 5 day counts x 6 kits x beginner/intermediate/advanced x 30/45/60/75/90 minutes (3,110 built, 490 refused). Every message was rebuilt from the engine report with the renderer's own wording, and the 40 main-matrix weeks reproduce the rendered file exactly.
- 409 single-pick focus builds (8 categories x 2 to 6 days x every legal pick, full gym, intermediate, 60 minutes) against the same week without focus.
- Every "Asks before saving" offer (1,151 asking weeks) rebuilt at the suggested length and at the suggested day count.
- Every "With N days a week it reaches/gets T" claim (323) rebuilt at N days.
- Session-name words against session contents (all 3,110 built weeks).

Not run: advanced and beginner focus builds, two-pick focus builds other than the one in the file, the 30 and 45 minute screen (integration item).

Where a finding depends on how the app words things (the renderer's `limitText` strings are the only wording that exists), I say so.

---

## Findings

### U6-1  BLOCKER  A focus pick still leaves the plan identical, or one set better, for the commonest picks at 2 to 4 days

Plans in the file: "General, 4 days, focus chest" (line 1952), "Classic physique, 5 days, 75 minutes, focus lats and side delts" (line 2002). The other variants change.

Quoted:
- "Your chest focus: 10 to 12 sets a week, short of the 14 a focus aims for, because its sessions are full, or more would tip pressing against pulling, ..." (1952), and at the same time "To make room for your focus: side delts 8 to 6 sets a week" (1954): the pick gains 2 sets and costs 2.
- "Your side delts focus: 14 to 15 sets a week, short of the 18 a focus aims for, ..." (2002): +1.

Engine run (409 builds): 71 return the identical plan, exercise for exercise and set for set; a further 56 add one set or less: 127 (31%). Counting only the ten picks people actually choose (chest, lats, upper back, side delts, rear delts, biceps, triceps, quads, hamstrings, glutes; 315 builds): 49 identical, 98 with at most +1. For the four most picked muscles (chest, lats, side delts, glutes): identical in 8 of 11 builds at 2 days, 12 of 19 at 3 days, 9 of 31 at 4 days; never at 5 or 6 days. Examples where the plan is identical: Bodybuilding 4 days chest and side delts; Classic 4 days chest, lats, glutes; Figure 4 days chest, upper back, side delts, rear delts; Women's physique 4 days chest, upper back, side delts, rear delts; Figure/Women's 3 days lats and side delts; Bikini 3 days chest, side delts, glutes; Men's physique 2 and 3 days chest, lats, side delts; General 2 days chest, lats, side delts.

What has changed since round 5: the engine now says so. The 101 "changes nothing" lines read "Your chest focus changes nothing at 4 days: its sessions are full. With 6 days a week it reaches 14." (every one names a day count; 50 of them need two or more extra days). "14 to 14" is gone. What has not changed: the pick is accepted, a plan identical to the unfocused one is saved, and it is exactly the founder's D219 complaint ("Even with specialising chest I get two exercises!"). The register's round 5 "Kept" list does not name it; only R47 (Men's physique 4 days chest) actually moves sets.

What a person thinks: "I ticked chest and the app gave me the same plan. Why did it let me tick it?" Also "its sessions are full" is a reason that invites the answer "then take a set from something else, I asked for chest".

How widespread: any category at 2 to 4 days (31% of single picks).

Suggested fix: (1) before building, tell the person on the pick screen ("Chest is already at the most 4 days can hold; with 6 days it goes from 6 to 14. Pick something else, or change days?"); (2) where the plan allows it, do what R47 did for Men's physique: let the pick take a session in the other half of the body that touches none of its sessions, or take a lower-tier muscle's set (R50-style) when the pick would otherwise gain 0 or 1; (3) never accept a pick that gains less than 2 sets without saying so before the plan is shown. Items 1 and 3 are content/flow; item 2 is a founder-level call that I only raise.

---

### U6-2  MAJOR  The "because ..." reasons are chained with "or" and read as muddled, contradictory or ungrammatical

Quoted:
- "Fewer sets a week than usual, because its sessions are full, or its sessions already hold the most exercises they may: side delts 8 (usually 10)." (79; same shape 237, 285, 410, 458, 786, 1006, 1007, 1169, 1564, 1805)
- "... because more would leave too little recovery before it is trained again, or its sessions are full: abs 9 (usually 10)." (461)
- "... because its sessions already hold the most exercises they may, or its exercises there are at their most sets, with no room for another: inner thighs 9 (usually 10)." (1056) and "... because its exercises there are at their most sets, with no room for another: rear delts 7 (usually 10)." (1917)
- "Your chest focus: ... short of the 14 a focus aims for, because its sessions are full, or more would tip pressing against pulling, or quads against hamstrings, or each session already gives it the most one session may." (1952). Quads against hamstrings has nothing to do with chest; the sentence has four reasons for one muscle.
- "... because each session already gives it the most one session may." (1562, 2001, 2002) has no verb after "may".
- "its" / "it" with a plural list: "chest 4 (usually 10), lats about 5 ..., because its sessions are full" (11).
- "... each session already gives it the most one session may, or its sessions are full: quads 2 (usually 6)." (786, Bikini 2 days): the person sees one 2-set hack squat, so "the most one session may" reads as untrue (inference: the engine's per-session cap counts credit from the hinge and thrust sets in the same session, which the person cannot see).

What a person thinks: "or" tells them the app does not know why; "its exercises there" has no "there"; "quads against hamstrings" under a chest pick looks like the wrong sentence. The cause is that `limitText` joins the binder of every session with ", or ", although each applies to a different session.

How widespread (engine run): 29 of the 76 "Fewer sets" lines in the file contain ", or "; across 5,722 such lines in 3,110 built weeks, 1,738 (30%) do, in 1,061 weeks; 962 weeks contain "its exercises there are at their most sets, with no room for another". Also the fallback "its sessions have no room left" (Men's physique 5 and 6 days biceps focus: "15 to 17 sets a week, short of the 18 a focus aims for, because its sessions have no room left") says nothing.

Suggested fix: name one cause per muscle (the one binding the session that holds most of its sets), or write per session ("in Upper A the session is full; in Upper B it already holds 8 exercises"); give each cause a full clause ("each session already holds the most chest sets it may hold"); drop "pressing against pulling or quads against hamstrings" unless the pick is a pressing or quad muscle; rewrite "its exercises there are at their most sets, with no room for another" as "the exercises it has are already at 4 sets each".

---

### U6-3  MAJOR  "To make room for your focus" can print a number below the minimum it quotes

Quoted: "To make room for your focus: inner thighs 5 to 3 sets a week (their minimum is 4)." (2115, "Wellness, 5 days, beginner, focus quads"). Cause (read in the code): `focusTook` compares the muscle's own (direct) sets before and after, but prints `targets[m].min`, the counted weekly minimum that includes half-credit from other exercises (inner thighs: 6.5 counted, own 3, minimum 4, line 2152).

What a person thinks: "It took inner thighs down to 3, below its own stated minimum of 4. The app breaks its own rule."

How widespread: 24 of 269 "To make room" entries in the 409 single-pick builds. Examples: Bikini 4, 5 and 6 days focus chest, lats, upper back or rear delts: "triceps 4 to 2 sets a week (their minimum is 4)" (11 builds); Classic physique 4 days side delts: "lats 8 to 7 sets a week (their minimum is 10)"; Wellness 4 days quads: "glutes 7 to 6 sets a week (their minimum is 10)"; Men's physique 4 days upper back: "lats 10 to 8 (their minimum is 10)"; Bodybuilding 5 days chest: "lats 10 to 9 (their minimum is 10)". In every one the counted week stays at or above the minimum; the message is what is wrong.

Suggested fix: print the same basis on both sides ("counted" to "counted" with the minimum, or "your own sets" with the own floor), or drop the bracket when it would contradict. Separately, in 20 of the 409 builds the pick gains one set or less while another muscle gives up sets ("Your chest focus: 7 to 8 sets a week ..." with "abs 6 to 5 sets a week", General 3 days): say it is a one-for-one swap, or do not take.

---

### U6-4  MAJOR  A developer string can reach the person: "ROOM LEFT (an engine fault: a legal set was not placed)"

Quoted (rebuilt from the engine report with the renderer's wording; not in the rendered file): "Bodybuilding, 5 days, beginner, full gym, 45 minutes: Fewer sets a week than usual, because ROOM LEFT (an engine fault: a legal set was not placed), or its sessions already hold the most exercises they may: quads 7 (usually 10), hamstrings 7 (usually 10), side glutes 3 (usually 4), calves 6 (usually 7), abs 6 (usually 7)."

How widespread: 20 of 3,110 built weeks, all at 30 or 45 minutes, nearly all beginner: Bodybuilding 5 and 6 days and Classic physique 5 and 6 days (full gym, beginner, 45), General 6 days, Women's physique 6 days, Wellness 6 days and Men's physique 5 days with dumbbells (beginner, 30), Men's physique 5 days dumbbells intermediate 45.

What it means (inference): in those weeks the binding rule is the time budget (sessions sit at 41 to 50 minutes against 45 chosen), which the cause finder does not name, so it falls through to "room". Whether the app shows this string is a question for the integration; if it does, a person sees "an engine fault" in their plan.

Suggested fix: add a "your chosen session length" cause ("more would take the session past the 45 minutes you chose") and never print the debug text; keep an engine-side assertion for the real "room left" case.

---

### U6-5  MAJOR  Some refusals show an internal check as the reason

Quoted (rebuilt; not in the rendered file): "Not built: lower_c: 2 exercises, 9 sets. 4 days a week works." Other raw reasons: "shoulders_a: 2 exercises, 6 sets" and "quads_glutes: 2 exercises, 6 sets". These are the sense checker's `detail`, not words.

Where: Bikini 5 and 6 days with barbell and plates (beginner, intermediate, advanced); Men's physique 6 days with barbell and plates or bodyweight (beginner); Wellness 5 days with barbell and plates (all levels). 11 weeks, 55 builds. For the Wellness barbell week a beginner is told "6 days a week works" (they asked for 5, and the round 5 rule is that a beginner is never offered more than 4; here they asked for more).

What a person thinks: a code, not a reason, and no idea what to change except the day count.

Suggested fix: map these sense failures to a sentence ("With a barbell and plates, the extra Lower day would hold only two exercises, which is too thin to be a session") or fold them into the "cannot get their weekly minimum" wording.

---

### U6-6  MAJOR  The numbers in "Fewer sets a week than usual" and "With this equipment" cannot be matched to the plan, and the list can be a wall

Quoted:
- "General, 3 days": "triceps about 9 (usually 10)" (40). The plan lists Cable Overhead Tricep Extension 2/2/3/3/3/2 and Tricep Pushdown 2/2/2/2/2/1: a person counts 5 sets (weekly line "triceps 8.5, own 5"). Same file: "glutes 7 (usually 10)" beside one 3-set Barbell Hip Thrust; General 2 days "lats about 5" beside 3 lat sets; Bikini 3 days "triceps about 4" beside one 2-set pushdown.
- "With this equipment lats have one exercise, giving about 9 of the usual minimum of 10 sets a week." (Figure 4 days with dumbbells: one 5-set pullover). The "9" is half-credit from the rows.
- Rounding: 4.5 prints "about 5", 8.5 "about 9", 9.5 "about 10".
- Volume: 9 of the 32 built main-matrix weeks list 8 or more muscles, General 2 days 13 (lines 11 and 12), Women's physique 3 days 12, Figure 3 days 12, Bikini 2 days 12 (784 to 787), General 3 days 10, Classic 4 days 10, Bikini 3 days 10. Across all kits and levels 1,255 weeks list 8 or more.

What a person thinks: "I count 5 triceps sets and it says 9", or "everything is below usual, so is my plan bad?" The grouping by cause and dropping entries within one set (round 5's fix) helped; the basis is still not stated, and "usually 10" is not defined. This is round 5's U5-4, neither fixed in full nor in "Kept".

Suggested fix: say once what the figure counts ("counting the help your presses and rows give"), or print the person's own sets; when more than about five muscles are short, say it once ("With 2 days a week every muscle gets its minimum, not its usual amount; 4 or more days raise it") and list nothing; define "usually" once ("the usual 10 sets a week").

---

### U6-7  MAJOR  A glutes focus trains the glutes directly in one session only

Plans in the file: "Women's physique, 4 days, focus glutes" (2059 to 2107). Quoted: "Your glutes focus: 10 to 14 sets a week." Lower A holds Barbell Hip Thrust 3/3/4/4/4/2 and Glute Kickback Machine 2/2/3/3/3/2 (7 direct sets). Lower B & Abs (2096 to 2104) holds no glute exercise: Hack Squat, Walking Lunge, Seated Leg Curl, calves, Abduction Machine (side glutes), two ab exercises.

What a person thinks: "My focus is glutes and my second leg day has none. And the plan says 14 but I count 7." (The 14 includes 7 of half-credit.)

How widespread (engine run, 409 builds): glutes pick leaves glutes directly in one session at General 4, 5 and 6 days, Figure 4 and 5 days, Women's physique 4, 5 and 6 days (8 builds, all 3 to 7 direct sets, counted 10 to 14). Bikini and Wellness do train them twice. Round 5's "Kept" U5-9 covers the plain Figure/Women's week; it does not cover a person who asks for glutes.

Suggested fix: a glutes pick adds a glute exercise to each lower day (a machine hip thrust or kickback in Lower B), funded by the second ab exercise or the seated calf raise, which the plan already takes from ("abs 10 to 8", "calves 10 to 9", line 2066).

---

### U6-8  MAJOR  Near-duplicate exercises still share a session or a week at 7 to 8 sets

Round 5's U5-6 is mostly fixed by spacing (only 1 adjacent lateral raise pair remains in the full-gym main matrix), but the pairs remain:
- Abduction twice in one session, 4 + 4 sets: "Abduction Machine ... 3/3/4/4/4/2" and "Cable Hip Abduction ... 3/3/4/4/4/2" (Bikini 3 days 839 and 841; Bikini 4 days 877 and 879; Bikini 5 days 918 and 920; Wellness 5 days 1081 and 1083; Wellness 6 days 1129 and 1131). A calf raise now sits between them; it is still eight sets of one movement.
- Lateral raise twice, 4 + 4: Bodybuilding 5 days Push & Calves (301, 303); Men's physique 3 days Push & Abs (611, 613); Figure 3 days (1174, 1176); Figure 4 days and Women's physique 4 days Delts, Chest & Triceps (1232 and 1234; 1429 and 1431); Women's physique 3 days (1372 and 1374). 42 sessions in the matrix hold two lateral raise variants.
- Adjacent, unspaced: Men's physique 5 days Legs & Side Delts: "Cable Lateral Raise 3/3/4/4/4/2" then "Leaning Lateral Raise 2/2/3/3/3/2" (724, 725; also 1690, 1691 in the advanced variant: Machine then Cable, 4 + 4).
- "Lying Dumbbell Leg Curl" beside machine curls in a full gym (Bodybuilding 4, 5, 6 days: "Seated Leg Curl 3/3/4/4/4/2", a calf raise, "Lying Dumbbell Leg Curl 3/3/4/4/4/2", 271 to 274; Classic 4 to 6 days; Wellness 5 and 6 days; the exercise appears 105 times across the full-gym builds). A person at a gym with a lying and a seated curl machine is asked to hold a dumbbell between their feet; and the lying machine curl is on the other day.
- Wellness 5 days: "Romanian Deadlift (Dumbbell) 2/2/2/2/2/1" on day 1 (1062) and "Romanian Deadlift (Barbell) 3/3/4/4/4/2" on day 3 (1079): the same lift twice in a week, the first a two-set add-on, beside 6 curl sets the same day.
- Bodyweight kit: Push-Up plus Decline Push-Up, or Pull-Up plus Chin-Up, in 34 of 147 sessions ("Pull-Up 3/3/4/4/4/2, Inverted Row, Chin-Up 3/3/4/4/4/2", 1929 to 1931).

What a person thinks: padding, or "the app listed the same exercise twice on different gear".

Suggested fix: use one exercise at 4 and put the rest in the other session (abduction machine day A, cable abduction day B; lateral raise 4 in one session, 3 in the other); prefer the machine curl on both days over the dumbbell curl; put a row or a different muscle between any 4 + 4 pair and say why in one short line ("a second angle for the same muscle").

---

### U6-9  MAJOR  "reps by effort (as many as the week asks, 6 to 30)" is unclear, and wrong for most of the lines that print it

Quoted: "Hanging Knee Raise: sets by week 2/2/2/2/2/1, reps by effort (as many as the week asks, 6 to 30), rest 60 s" (50, 117, 159 and 62 more).

Observed: the phrase prints on 65 lines. The engine's range for 57 of them is 15 to 30 (Hanging Knee Raise 37, Hanging Leg Raise 7, Decline Crunch 4, Clamshell 4, Reverse Crunch 2, Slider Leg Curl, Leg Raise, Donkey Calf Raise); only 8 are 6 to 30 (Push-Up, Pull-Up, Chin-Up, Inverted Row, Decline Push-Up, Tricep Dip, Single-Leg Glute Bridge, Bodyweight Split Squat). The renderer prints "6 to 30" whenever the top of the range is 30, so the file contradicts the register's own C5-21 ("a bodyweight isolation takes 15 to 30 reps").

What a person thinks: "What does the week ask? 6 to 30 of a knee raise?" Round 5's U5-16 raised the same phrase and was not answered.

Suggested fix: show the actual range ("15 to 30 reps") and, for effort exercises, one sentence once per plan ("Stop about 2 reps before you could not do another; the number in brackets is a guide"). Check the app prints the engine's range, not the renderer's.

---

### U6-10  MINOR  Men's physique 4 days with a chest focus: chest work between leg work (round 5's U5-7, partly fixed)

"Men's physique, 4 days, focus side delts and chest" (1576 to 1584): Hack Squat Machine, Romanian Deadlift, **Incline Dumbbell Press**, Leg Extension, Seated Leg Curl, **Cable Crossover (High to Low)**, Cable Crunch, Hanging Leg Raise. The single pick (chest only) gives the same order. The only session I found that alternates halves, in 3,110 plain weeks and 409 single-pick focus weeks. Cause (read): the sort ranks by kind first (a moderate compound before leg isolations), and "each half together" applies only within a rank. A person reads "chest press between my two leg lifts and a fly between leg curls and crunches". Fix: keep a session's halves together (all leg work, then chest, then abs) whatever the rank.

---

### U6-11  MINOR  Session names: four-part names and an inconsistent trailing letter

- Four parts, two of which mean "lower body": "Hamstrings, Side Glutes, Inner Thighs & Calves" (1078); "Glutes, Hamstrings, Quads & Calves" (2117); "Shoulders, Arms, Lats & Chest" (499, 2046); "Back, Side Delts, Biceps & Chest" (1289, 1489); "Chest, Triceps, Calves & Abs" (673, 1595); "Quads, Side Glutes, Abs & Calves" (836).
- "Glutes A, Hamstrings & Abs" (1108) but "Hamstrings, Glutes & Inner Thighs (B)" (1133): the A has a leading muscle, the B is at the end, so it is not obvious they are a pair (Quads A/B pair clearly). Round 5's "(B)" fix is good; the A side was not changed with it.
- "Lower C" (925, 971) says nothing about how it differs from A and B (it is the "lighter day": 3 exercises).
Suggested fix: "Lower body" for the two four-part leg names; "Glutes & Hamstrings A" with "(B)"; a one-line subtitle for Lower C.

---

### U6-12  MINOR  Figure and Women's physique 4 days now give biceps one exercise once a week

"Back, Delts & Biceps" holds the only curl, "EZ Bar Preacher Curl 3/3/4/4/4/2" (1218, 1415); the other upper session has none; weekly line "biceps 8, own 4"; the message lists "biceps 8 (usually 10)". Round 5 recorded Figure and Women's 4 days as having two curl exercises (6 sets) and Bodybuilding 4 days as the single case, which the register kept. The pattern is now the same at Bodybuilding, Figure and Women's 4 days. It is disclosed (the "Fewer sets" line), but it is the same "one curl, once a week" shape the register kept for Bodybuilding on the argument that the biceps' counted sets are above normal; here they are below (8 of 10). Question for the lead: is the kept reasoning meant to cover this?

---

### U6-13  MINOR  Wording glitches in focus lines

(All rebuilt from the engine with the renderer's wording; none of the focus picks below is in the rendered file except the last bullet.)

- "Your glutes focus: about 18 to about 20 sets a week, short of the 20 a focus aims for, because its sessions have no room left." (Bikini 5 and 6 days; 19.5 rounds up to "about 20" and is still "short of 20").
- "Your triceps focus: about 12 to about 15 sets a week, short of the about 16 a focus aims for ... it reaches about 16." (Figure and Women's physique 5 days): "the about 16 a focus aims for", "reaches about 16" for a target.
- "Your front delts focus has no effect: this category does not train front delts directly." (and glutes, side glutes, inner thighs for Men's physique): cold, and front delts do get work from every press. Suggest "Front delts already work in every press, so we add no direct sets for them."
- "... more would pass a joint-safety limit." (5 weeks, e.g. Wellness 6 days quads focus: "14 to 15 sets a week, short of the 18 a focus aims for, because each session already gives it the most one session may, or more would leave too little recovery before it is trained again, or more would pass a joint-safety limit"): for a quads pick this sounds like a warning about the person's knees. Suggest "more would load the knees beyond what the plan allows".
- Double mention: Men's physique 4 days side delts and chest lists calves in "Fewer sets" (1564) and again in "To make room" (1565).

---

### U6-14  MINOR  Dumbbell plans: A and B back days still share most of their exercises

"Men's physique, 4 days, dumbbells only" (1613 to 1638): Back A and Back B share Chest-Supported Row (Dumbbell), Dumbbell Row, Straight-Arm Dumbbell Pullover, Dumbbell Rear Delt Fly and Leaning Lateral Raise: 5 of 7. Round 5's U5-10 is partly addressed (Seated Lateral Raise was added); a person still reads "Back B is Back A with the rows swapped". Same shape in the Wellness 4 days dumbbell plan (Pullover and Goblet Squat on both days).

---

## Questions (not findings)

Q1. Bikini 3 days (and the Wellness 3-day template): every muscle is trained once a week (Glutes & Hamstrings, Upper, Quads & Side Glutes). 09 B7 gives this template, so I did not raise it; a coach may say "glutes once a week for a bikini athlete". Is that meant?

Q2. Does the app show the renderer's `limitText` strings (U6-2, U6-4) or its own copy? Several findings are about those strings.

---

## Status of round 5's 18 findings

| Round 5 | Status now | Evidence |
|---|---|---|
| U5-1 focus changes nothing | Message fixed, behaviour NOT: still 71 identical + 56 at +1 or less of 409; now reported as "changes nothing at N days ... With N days a week it reaches T" (323 of 323 day-count claims true). Open as U6-1 | 1952, 2002 |
| U5-2 Bikini 3 days abs | Fixed: session 3 now holds Cable Crunch; session 1 is "Glutes & Hamstrings". No named muscle has zero sets in any of 3,110 built weeks | 820 to 843 |
| U5-3 stacked colons, "14 to 14", "its minimum" | Mostly fixed: no "14 to 14", plural "their minimum", "have one exercise, giving 5 of the usual minimum of 8" (kit lines true in all 235 cases). New defects: "minimum" mismatch (U6-3), "may" without verb (U6-2) | 1915, 2007 |
| U5-4 "below normal" noise and basis | Partly: grouped by cause, within-one-set entries dropped, whole numbers with "about", plain names ("side glutes", "inner thighs"). Basis and wall still open: U6-6 | 11, 40 |
| U5-5 garbled bracket reasons | Replaced by "because ..." sentences, but the "or" chains and "its exercises there" are new garble: U6-2 | 79, 1056, 1917, 1952 |
| U5-6 same movement twice | Mostly fixed by spacing; 8-set pairs remain (abduction, lateral raise, curl variants): U6-8 | 839 to 841, 1232 to 1234, 724 |
| U5-7 Men's chest on leg day | Fixed in plain weeks; still interleaved in the chest-focus variant: U6-10 | 1576 to 1584 |
| U5-8 Bodybuilding 4 days one curl | Kept with reasons. Figure and Women's 4 days now match it: U6-12 | 266; 1218, 1415 |
| U5-9 Figure/Women's glutes one hip thrust | Kept. Not covered for a glutes pick: U6-7 | 1223, 1420 |
| U5-10 dumbbell A/B | Partly (Seated Lateral Raise added); U6-14 | 1613 to 1638 |
| U5-11 length question wording | Fixed: "against the 60 minutes you chose. Sessions of 75 minutes would hold this plan, or 5 days a week of 60 minutes". All 1,151 offers rebuilt: the suggested length builds without asking again in 100%, and the offered day count in 100% | 10, 39, 78 |
| U5-12 2-set muscle in a session name | Kept (R31) | 691, 162 |
| U5-13 odd names | "(B)" at the end fixed; four-part names and "Lower C" remain: U6-11 | 1133, 1078 |
| U5-14 light days unlabelled | Fixed: "a lighter day" on 11 sessions, a session under three quarters of the longest | 184, 925, 984 |
| U5-15 "longest session ... against" | Fixed: "Sessions run about 64 to 65 minutes." | 1207 |
| U5-16 "6-30" bodyweight reps | NOT fixed and now shown to be wrong for 57 of 65 lines: U6-9 | 50 |
| U5-17 slider curl in a dumbbell plan | Fixed: Wellness 4 days dumbbells uses "Lying Dumbbell Leg Curl" | 1830 |
| U5-18 General 5 days chest twice, back once | Kept | 134 to 168 |

## What reads well (checked, not assumed)

- Session names say what is inside: 0 of 3,110 built weeks name a muscle that has no exercise. Abs sit last, compounds first, a fly follows its press (except U6-10).
- "Asks before saving" names the sessions and their minutes, uses a unit ("against the 60 minutes you chose"), and every offer is true at every length (30 to 90) and kit: 1,151 weeks, zero re-asks.
- "With N days a week it reaches/gets T" is true in 323 of 323 rebuilds. "5 days a week give much the same week: the extra day mostly spreads the same work" is true where it prints (Bikini, Figure, Women's physique 6 days; weekly counts within one set of 5 days) and absent where it is not (Wellness 6 days).
- No silent theft: in 409 single picks no muscle lost any of its own sets without being named under "To make room" (the bracket's numbers are U6-3; the naming is complete).
- "a lighter day" is applied consistently (under three quarters of the longest session) and removes round 5's U5-14.
- Refusals lead with the outcome and name muscles in words ("quads, hamstrings, calves, abs", "side glutes", "inner thighs"); the day count offered builds in every case (98 refusals at 60 minutes, all with a count; a beginner is not offered more than 4 except where they asked for more).
- Beginner plans open with machines and dumbbells; no solo barbell compound in the beginner weeks I read; kit-short lines name exactly one exercise in all 235 cases.
- "stop 2 reps short of failure every week: the next session trains this muscle again" is plain and true.
- No em dash anywhere in the rendered file or in the structure engine's strings; British English; no shaming or guilt language ("Fewer sets a week than usual" is neutral).

## Left alone (deliberate or integration)

Two-set exercises, rest in 15-second steps, "Shoulders" names, 30/45-minute screen and "keep my length", kit labels (bar, bands, bench; the bodyweight plans also ask for parallel bars for the dip and a step for the donkey calf raise, which the planned label does not list), refusal naming other categories, U5-12, U5-18, U5-8 (Bodybuilding only). The Figure and Women's physique plans are near-identical at 3 to 6 days; I did not raise it.

## Housekeeping

Created and deleted: scratch-user6-dump, -length and -peek (.jest.js) under docs/audit/plan-builder-map-2026-10-11/tools/. The scratch-coach6-claims, -probe and -sweep files in the same folder are not mine and were left. Intermediate JSON and analysis scripts are in the session scratchpad only. No other file edited; git used read-only (status, log).
