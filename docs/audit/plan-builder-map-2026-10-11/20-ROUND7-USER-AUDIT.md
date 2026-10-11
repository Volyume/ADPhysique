# Round 7 end-user audit: structure engine plans

Branch planner/structure-engine-rulebook, HEAD 91a2f35 ("Planner: round 6 coach and user audits fixed"), working tree clean at the start and at the end. Read in full: 12-STRUCTURE-PLANS-RENDERED.md (2,334 lines), 18-ROUND6-USER-AUDIT.md, 17-ROUND6-COACH-AUDIT.md, and the D222 addenda for rounds 4, 5 and 6 in DECISIONS-2026-07-09.md. "Kept, with reasons" and "Not changed, with reasons" items are treated as deliberate; I raise one only where I say NEW ARGUMENT.

Standard: "no instance at all where I or another end user or even a coach loads up a plan and says, okay, this doesn't make sense."

Line numbers below are lines of the current 12-STRUCTURE-PLANS-RENDERED.md unless I name another file. Plan keys read goal|days|kit|level|minutes|focus.

## How I checked (OBSERVED unless labelled INFERRED)

I ported the renderer's message wording from tools/render-structure-plans.jest.js into a throwaway jest file (message functions copied verbatim; deleted before handing back) and ran the real engine (`buildStructurePlan` with the campaign16 LIBRARY):

- Plain matrix: 8 categories x 5 day counts x 6 kits x 3 levels x 5 lengths (30/45/60/75/90) = 3,600 builds: 3,150 built, 450 refused (90 at every length, so the refused set does not depend on length).
- Focus: 2,500 focus builds, 2,142 built, 358 refused (none where the plain week builds): every legal single pick, 2 to 6 days, full gym at intermediate, beginner and advanced (60 min) and intermediate at 45 min; machines and cables, dumbbells, home gym, barbell and plates, bodyweight at intermediate (60 min) for eight common picks at 3, 4 and 5 days; eleven common two- and three-pick combinations per category at intermediate full gym. Women's physique, figure and wellness ran full gym intermediate and beginner only (time). 1,793 of the built focus weeks are single picks.
- Claims rebuilt: every "Sessions of N minutes would hold this plan" (1,218 weeks that ask), every "or D days a week" (119), every "much the same week" (330), every "N days a week raise most of them" (1,025), every kit-short line (230 weeks), every "With N days a week it reaches/gets T" (656 and 1,026), every R55 question that names a better day count (835 question lines; 869 single-pick weeks ask in all), every refusal's offered day count (450), every "To make room" bracket (1,363 entries).
- Cause statements ("because ...") checked against the session sizes of the built plan, and, for the 32 built plain full-gym intermediate 60-minute plans and the full-gym intermediate 60-minute focus builds, against a +1 set edit on each existing exercise of the muscle run through checkPlan and senseCheck (3,612 muscle entries probed; adding a new exercise was not probed).
- Plan content: names, order, repeats, labels, reps, stand-ins across all 3,150 plain weeks and 2,142 focus weeks; about ten full plans read as text across the kits.

## Findings

### U7-1  BLOCKER  "Every muscle gets at least its minimum" is printed above plans where a muscle is below it; with a barbell and plates the lats have no exercise at all and the plan says nothing

NEW. The round 6 rewording (U6-6, "said once") put one sentence over every below-usual list: "With N days a week every muscle gets at least its minimum, and K stay below the plan's usual amount: ...". It is false whenever a muscle is below its minimum, and the engine has two such cases that the wording never considered.

Quoted, in the file:
- Line 1990: "With this equipment side delts have one exercise, giving 5 counted sets of the usual minimum of 8 a week."
- Line 1991, the very next line: "With 3 days a week every muscle gets at least its minimum, and 9 stay below the plan's usual amount: lats 10 (usually 14), ..." (Figure, 3 days, bodyweight).
  A person reads 5 of 8, then "every muscle gets at least its minimum".

Quoted, from the engine (not in the file, which only shows full-gym plans). Bodybuilding, 4 days, barbell and plates, intermediate, 60 min:
- "With 4 days a week every muscle gets at least its minimum, and 7 stay below the plan's usual amount: chest 10 (usually 14), upper back 10 (usually 14), side delts 10 (usually 14), hamstrings 12 (usually 14), side glutes 4 (usually 6), calves 8 (usually 10), abs 7 (usually 10). 6 days a week raise most of them."
- The plan has no lat exercise (Upper A: Barbell Bench Press, Incline Barbell Bench Press, Chest-Supported T-Bar Row, Chest-Supported Row (Barbell) ...). The week's own numbers: lats 5 counted, minimum 10, usual 14 (a priority muscle in this category).
- The only place lats are mentioned is the renderer's last line, "Cannot be trained directly with this equipment: lats." (tools/render-structure-plans.jest.js line 211, printed after the weekly-sets diagnostics; the engine's own better text, "lats cannot be trained directly with this equipment; 5 sets a week through other exercises", is in checker.js line 190 and is never rendered). This line has never appeared on the audited page, so no earlier round has read it.

What a person thinks: a bodybuilder who chose barbell and plates sees no pulldown, pull-up or pullover in any session, is told every muscle gets its minimum, and has no way to know the lats are at half of theirs. Or, for the bodyweight case, "5 of the minimum 8" next to "at least its minimum".

How widespread (rebuilt across the plain matrix):
- 345 of the 1,660 weeks that carry the "every muscle gets at least its minimum" sentence have a muscle below its minimum (21%; 11% of all 3,150 built weeks). The below-minimum entries are 240 barbell-kit lats and 180 kit-short muscles (side delts in the bodyweight and barbell kits, calves in bodyweight); some weeks have both.
- Barbell and plates: 495 of 495 built weeks have lats with no exercise of their own, counted at 2 to 7 sets against a minimum of 4 to 10 (Figure 4 days: 5 of 10; Men's physique 3 days: 4 of 8; Figure 2 days: 2 of 6). The head of the plan never mentions lats in any of the 495.
- 590 built weeks in all have a muscle below its weekly minimum: 235 of the below-minimum muscles are announced by a kit-short line and 455 only by the footer line.
- A lats focus on the barbell kit is also dropped silently: see U7-4.

Suggested fix: (1) when any muscle is below its minimum, do not print "every muscle gets at least its minimum" (say "every other muscle ..."); (2) move the untrainable muscle to a head line in plain words ("With a barbell and plates your lats have no exercise of their own; rows give them about 5 of the 10 sets a week. A lat pulldown, a pull-up bar or another kit would fix it."); (3) render the kit-short line first and never beside the sentence it contradicts.

### U7-2  MAJOR  The R55 way out is not a way out: the figures can be wrong, and the "better" day count often asks the same question again

NEW (R55 is round 6's fix for U6-1). The question before saving says "Choose N days a week, D days without the X focus, or D days with it as it is." Rebuilt at the offered N:

Quoted:
- Line 2238 (Men's physique, 5 days, quads): "Asks before saving: your quads focus adds only 1 set a week at 5 days ... With 6 days a week quads get 8. Choose 6 days a week, 5 days without the quads focus, or 5 days with it as it is."
- Engine, General, 2 days, intermediate, glute_med focus: "your side glutes focus adds nothing at 2 days, because the sessions that train them are full. With 3 days a week side glutes get 3. Choose 3 days a week, ...". At 3 days the plain week already gives 3, and the 3-day build says: "your side glutes focus adds nothing at 3 days ... With 4 days a week side glutes get 5." The offer is a bigger week, not the focus.
- Engine, General, 2 days, beginner, chest: "adds nothing at 2 days ... With 3 days a week chest gets 7. Choose 3 days a week ..." and at 3 days: "your chest focus adds nothing at 3 days" (7 to 7).
- Engine, Men's physique, 4 days, rear delts: "With 5 days a week rear delts get 17." Rebuilt at 5 days the pick gets 15.
- Engine, General, 5 days, advanced, upper back: "short of the 17 a focus aims for ... With 6 days a week it reaches 17." Rebuilt at 6 days: 16.
- Engine, General, 2 days, intermediate, biceps: "With 4 days a week biceps get 14." Rebuilt at 4 days: 16.5.

How widespread (single and multi picks, 2,142 built focus weeks):
- 835 asks name a better day count. At that day count the pick again adds under 2 sets (so the same question comes back): 209 (25%). The length question then also fires: 368 (44%).
- The printed figure is wrong by more than one set in 93 of the 835 (11%): 91 understate (the figure is the pick's target at today's day count, not what it gets at the new one), 2 overstate.
- "With N days a week it reaches T" (the focus line, not the question): 31 of 656 over-promise by 1 to 2 sets (4.7%).
- Cause (INFERRED from engine.js, withDaysThatFit, reading it): `moreDays` is the fewest more days at which the pick's sets exceed its sets today, not at which it gains 2 over that day count's plain week, and `setsThen` prints the original `f.target` when `reachedAt` is set, although R52 makes the target plain-plus-4 at each day count.
- The "gets T" claims in the moreAt branch (1,026) were all true on rebuild.

What a person thinks: "It told me 6 days would give me 17. I chose 6 days and got 15", or "I chose 3 days like it said and it asked me the same thing again."

Suggested fix: choose the offered day count as the fewest at which the pick gains at least 2 over that day count's own plain week, print the rebuilt figure, and when no day count does, offer only the two choices.

### U7-3  MAJOR  The one-cause reasons say "each session" and "no room" but are read from one session; the two commonest wordings are false in many plans

NEW. Round 6 (U6-2, C6-4) replaced the "or" chains with one cause "found in the session that holds most of the muscle's sets" (D222 round 6 addendum). The sentence still says "each session that trains it ..." and "their sessions have no room for another exercise".

Quoted and checked against the plan on the page:
- Line 298: "... because each session that trains them already holds the most sets of them one session may hold: chest 12 (usually 14), side delts 12 (usually 14)." Bodybuilding, 5 days. Push & Calves holds 8 chest sets (lines 312-313: Barbell Bench Press 4, Incline Machine Press 4) but Upper holds 4 (line 338: Incline Dumbbell Press 4); side delts 8 (314-315) against 4 (341). One session is at the cap, the other is half of it.
- Line 1874: "... because each session that trains them already holds the most sets of them one session may hold: hamstrings 12 (usually 14)." Wellness, 4 days, dumbbells. Lower B has Single-Leg Romanian Deadlift 4 and Lying Dumbbell Leg Curl 4 (lines 1897, 1901), Lower A has one Romanian Deadlift with 4 (line 1878).
- Line 2238: "each session that trains them already holds the most sets of them one session may hold" for quads in Men's physique's single leg session: Hack Squat Machine 4 plus Leg Extension 3 = 7 direct sets, and the engine's per-session limit is 8 (fractional 7, limit 11). The session is full at 24 sets, which is the true reason.
- Line 1093: "... because the exercises for them are at their most sets and their sessions have no room for another exercise: inner thighs 9 (usually 10)." Wellness, 5 days. Lower Body B is "6 exercises, 22 sets at the peak" (line 1115), and the plan's own sessions go to 8 exercises and 24 sets (line 1095). Room for a 2-set exercise exists.
- Engine, Bikini, 4 days, bodyweight: "... the exercises for them are at their most sets and their sessions have no room for another exercise: calves 5 (usually 6)." The calf session is Lower B at 22 sets and 6 exercises; the real limit is that the kit has one calf exercise (Donkey Calf Raise at its 5-set maximum).

How widespread (plain matrix, Fewer-sets lines):
- "no room for another exercise" (exercise_full): 585 muscle entries; in 440 (75%) a session that trains the muscle still has room for a 2-set exercise by the engine's own limits (22 sets or fewer and fewer than 8 exercises); in 120 the muscle has one exercise in the whole plan, which is a kit limit.
- "each session ... the most sets" (muscle_cap): in the 32 built plain full-gym intermediate 60-minute plans, 2 of 5 entries have a training session below the cap; across all plain configurations 268 of 500 entries (54%) have a training session under 8 direct sets (INFERRED upper bound: the 11-set fractional cap can bind through credit instead).
- "the sessions ... are full" (set_cap): 5 of 745 entries have a session at 22 sets. "already hold the most exercises" (exercise_cap): 30 of 1,805 have a session below the cap. These two are essentially true.
- The same wording drives the focus line and the R55 question (lines 1617, 2028, 2081, 2238).

The +1-set probe found no legal extra set on any existing exercise in any of the 3,612 probed entries, so the plans are not under-filled; the wording names the wrong rule.

What a person thinks: "Upper has four chest sets; it is not full of chest." A coach sees a session at 22 sets and "no room".

Suggested fix: say it for the session that binds ("In Push & Calves chest is at the 8 sets one session may hold; Upper is full at 24 sets"), or print the cause only when every session that trains the muscle shares it; and make exercise_full read "your kit has no other inner-thigh exercise" (no_choice) when the muscle has no unused pattern.

### U7-4  MAJOR  A focus pick the kit cannot train is dropped without a word

NEW argument on the D219 theme (tick a focus, get nothing, not told). Engine: lats focus on the barbell-and-plates kit.

Quoted (Men's physique, 3 days, barbell and plates, intermediate, 60 min, focus lats; the head has no focus line at all):
- "Sessions run about 59 to 63 minutes." / "Sets are counted as in the app ..." / "With this equipment side delts have one exercise, ..." / "Fewer sets a week than the plan's usual amount, ..."

Observed: 12 of 12 built lats picks on the barbell kit (3, 4 and 5 days, the counts I ran for that kit: Bikini 3 and 4, Bodybuilding 4 and 5, Classic physique 4 and 5, General 3 to 5, Men's physique 3 to 5; three further records were refused) came back with no "Your lats focus ..." line at all. The engine reports the pick as ignored only for muscles a category does not train, not for muscles the kit cannot train. No R55 question fires either.

What a person thinks: "I picked lats and there is no sign it was heard." It is the same experience as the founder's complaint, with no question this time.

Suggested fix: report a pick on an untrainable muscle in the head ("Your lats focus changes nothing with a barbell and plates: it has no lat exercise. Rows are the closest.").

### U7-5  MAJOR  A developer string still reaches a focus line: "ROOM LEFT (an engine fault: a legal set was not placed)"

REGRESSION of U6-4 on the focus path (the plain matrix is clean). Engine, Men's physique, 3 days, full gym, beginner, 60 min, calves focus (my port of the renderer's wording, which in the real renderer throws "a report led with 'room'" instead of printing):
- "Your calves focus: 3 to 5 sets a week, short of the 8 a focus aims for, because ROOM LEFT (an engine fault: a legal set was not placed)."
- The report's `limits` for the pick is ['room'] and `reason` is 'sessions_full'.

How widespread: 1 of 2,142 built focus weeks (1 of 1,793 single picks); 0 of 3,150 plain weeks. The register's "Room is never a stated cause" and the round 6 focus gate (8,542 builds) did not cover beginner Men's physique calves; my coverage was every legal single pick at beginner and advanced for the full gym, so the true count at the other kits and lengths may be a few more.

What a person thinks: "an engine fault" in their plan reads as the app being broken.

Suggested fix: as C6-11 and U6-4 asked, when the probe finds a legal set it is a placement bug, not a reason: place the set, or fall back to the nearest true cause; keep the assertion in the build gate, extended to beginner and non-gym-kit focus builds.

### U7-6  MINOR  The below-usual wall states no cause, which is what the register's kept reasons for U6-12 rely on

NEW argument against U6-12's "Not changed" (the register says "the plan states that cause under 'Fewer sets'").
- Lines 1249 and 1453 (Figure and Women's physique, 4 days): "With 4 days a week every muscle gets at least its minimum, and 6 stay below the plan's usual amount: chest 6 (usually 10), lats 10 (usually 14), upper back 6 (usually 10), rear delts 8 (usually 10), biceps 8 (usually 10), triceps 9 (usually 10). 5 days a week raise most of them." No "because" anywhere. Biceps 8 sits beside "EZ Bar Preacher Curl" being the plan's only curl (line 1258).
- More than five muscles short collapses to this sentence: 1,660 of the 3,150 built plain weeks (53%), so for those weeks no reason is ever given; the cause statements exist only in the 1,740 Fewer-sets lines of the other weeks (some weeks have two).
Suggested fix: when the wall prints, say once what binds the sessions ("the sessions are full at 24 sets") or leave the kept reasoning visible in the register only.

### U7-7  MINOR  The wall counts one-set gaps as "below the plan's usual amount"

U6-6's reading (NEW evidence). 3,415 of 16,460 listed entries (21%) are exactly one set short, and in 300 wall weeks half or more of the entries are. Engine, Bikini, 4 days, full gym, beginner: "... and 6 stay below the plan's usual amount: chest 3 (usually 4), side delts 6 (usually 7), rear delts 6 (usually 7), quads 3 (usually 4), calves 3 (usually 4), abs 3 (usually 4)." Line 477 (Classic physique, 5 days): "6 stay below ...: quads 13 (usually 14), hamstrings 13 (usually 14), glutes 9 (usually 10), side glutes 4 (usually 6), calves 12 (usually 14), abs 9 (usually 10). 6 days a week raise most of them." A person is pointed to a sixth day to fix 13 against 14. Round 5's rule dropped gaps under one set; one set exactly still lists. Suggested: list only gaps above one set, and keep the count line.

### U7-8  MINOR  Two letter styles in one week, and one lower day with no letter

NEW (round 6's "letter moves to the end once a name runs to three parts" is the cause, INFERRED from the name function).
- Lines 717 and 738 (Men's physique, 5 days): "Back, Biceps & Chest (A)" and "Back B & Biceps". The pair's halves are lettered differently.
- Lines 1146, 1153, 1163, 1171, 1177, 1185 (Wellness, 6 days): "Glutes, Hamstrings & Abs (A)", "Upper A", "Quads, Side Glutes & Calves (A)", "Hamstrings, Glutes & Inner Thighs (B)", "Upper B & Abs", "Quads, Inner Thighs & Calves (B)". Two pairs use "(A)/(B)", the upper pair "A/B".
- Lines 1095 and 1123 (Wellness, 5 days): "Lower Body A", "Lower Body B", and a third lower day, "Quads & Glutes" (a lighter day).
- 165 plain weeks (5%) mix the two styles, including 2 of the 32 built default plans. Other engine examples: "Hamstrings & Glutes B" with "Quads, Inner Thighs & Calves (B)".
Suggested: one style (the letter after the first word: "Back A, Biceps & Chest"), or "Lower Body A, B, C".

### U7-9  MINOR  Two brackets in a row

NEW (round 6's label). Line 56 "Chest-Supported Row (Dumbbell) (a second angle for the upper back)", line 322 "Machine Row (Chest Supported) (a second angle for the upper back)". 1,117 of 6,493 labelled lines (17%) read this way (Chest-Supported Row (Dumbbell) 370, Seated Calf Raise (Barbell) 187, Chest-Supported Row (Barbell) 185, ...). Suggested: "Chest-Supported Row (Dumbbell), a second angle for the upper back" or move the label to a sub-line.

### U7-10  MINOR  A refusal's "N days a week works" is followed by a length question in 202 of 450 refused weeks

NEW (round 6's refusal wording). The offered day count builds in 450 of 450 (verified) but then asks about the length in 202: 90 of 90 at 30 minutes, 86 of 90 at 45, 26 of 90 at 60 (Bikini 5 and 6 days with barbell and plates: "4 days a week works", and the 4-day build then says "Lower B comes to about 66 minutes, against the 60 minutes you chose. Sessions of 75 minutes would hold this plan."), none at 75 or 90. The sense-failure sentences also name a session the person has never seen: "with this equipment Lower C would hold only 2 exercises and 9 sets, too little to be worth the trip" (Bikini 5 days barbell, 30 matches), "Shoulders A ... 2 exercises and 6 sets" (Men's physique 6 days barbell, beginner), "Quads & Glutes ... 2 exercises and 7 sets" (Wellness 5 days barbell). "Worth the trip" is an idiom a person may not read as "too short to be a session". The minimum-unreachable sentence says "each session holding at most 8 exercises and 24 sets" (5 of the 30 beginner refusals); INFERRED: that is the hard limit, and a beginner's sessions above the minimum stop at 5 exercises. Suggested: "N days a week builds (it needs about D-minute sessions)", and "one of the extra lower days would hold only 2 exercises".

### U7-11  MINOR  A one-set pick that takes a set from another muscle: the question does not say so

Engine, General, 3 days, intermediate, chest: "Asks before saving: your chest focus adds only 1 set a week at 3 days ... Choose 5 days a week, 3 days without the chest focus, or 3 days with it as it is." and two lines lower, "To make room for your focus: abs 6 to 5 sets of their own a week (5 counted, their minimum 5)." The choice "with it as it is" is a one-for-one swap, and only the second line says it. 73 of the 654 single picks that took sets from another muscle gain one set or less. U6-3 asked for this; the swap is still unstated in the question. Suggested: add "and takes 1 set from abs".

### U7-12  MINOR  Wording that blends two numbers, and a length that is not the shortest

- Line 1990: "giving 5 counted sets of the usual minimum of 8 a week" fuses "usual" (the target, "usually 10" elsewhere) and "minimum" (the floor, "its minimum" elsewhere). Suggested: "5 counted sets a week against a minimum of 8".
- Engine: in 28 asking weeks (0.9% of 3,150) a shorter standard length would also hold the plan than the one named ("Sessions of 75 minutes would hold this plan" where 60 does: Bikini 5 and 6 days, Bodybuilding and Classic 6 days, Figure 4 days; chosen 30 or 45).
- The question lists only sessions over the length by more than five minutes: in 326 asking weeks another session is also above the chosen length (inside the tolerance) and is not named.

### U7-13  MINOR  A sixth day can give a smaller week than the fifth

NEW evidence on C6-10. 165 of 680 six-day weeks carry fewer total sets than the five-day week (115 of them carry the "much the same week" note; 50 do not, with a gap of 2 to 5 sets, in home gym and barbell kits). Men's physique 5 days carries 1.5 fewer sets than 4 days in 10 plain weeks (117 to 115.5 counted), no note. The note's wording ("the extra day mostly spreads the same work") is true; the unsaid case is that the six-day week is smaller. Suggested: say "gives slightly less" where it does.

## Status of round 6's 14 findings

| Round 6 | Status now | Evidence |
|---|---|---|
| U6-1 BLOCKER focus changes nothing | Behaviour handled by asking (R55). Of 1,793 single picks, 564 (31%) leave the plan identical and 870 (49%) gain under 2 sets; 869 of those 870 ask, 0 identical plans are saved silently. The ten commonest picks on the default week: 99 of 315 ask (2 days 20 of 29, 3 days 42 of 49, 4 days 30 of 79, 5 days 6 of 79, 6 days 1 of 79). One silent: Classic 6 days advanced lats "19 to 20 sets a week" (reached, +1). New problems: U7-2, U7-4 | lines 2238, 2288 |
| U6-2 "or" chains | Fixed in form: every one of 1,740 Fewer-sets lines (and every focus line) names one cause in a whole clause, no ", or" chains, no "its exercises there", no verbless "may". New problem: the clause is read from one session (U7-3) | 298, 1093, 2028 |
| U6-3 bracket below the minimum | Fixed: 1,363 "To make room" entries in 2,142 focus builds, 0 with a counted figure below the minimum it quotes. The one-for-one swap is still not in the question (U7-11) | 2030, 2083, 2143 |
| U6-4 "ROOM LEFT (an engine fault)" | Fixed on the plain path (0 in 3,600 builds); NOT fully on the focus path: 1 of 2,142 built focus weeks still prints it (U7-5). No raw keys, codes, NaN or em dash anywhere else | whole matrix |
| U6-5 refusals show a check | Fixed in words (14 distinct sentences); the offered day count builds in 450 of 450 and a beginner is never offered above 4 (0 of 469). Residual: U7-10 | 237, 241 |
| U6-6 numbers, wall | Partly: the counting sentence is printed once and the wall is one line with the fewest more days (1,025 "raise most of them" claims all true on rebuild). New problems: U7-1 (the wall's first clause is false in 345 weeks), U7-7 | 11, 1990 |
| U6-7 glutes focus trained once | Fixed where another lower session lists glutes: General, Figure and Women's physique at 4 to 6 days carry glutes in every lower session; Wellness and Bikini in 2 sessions (Wellness 5 and 6 days: 2 of 3 and 2 of 4 lower sessions; Bikini 3 days 1 of 2). Not for Bodybuilding 4 days and Classic 4 and 5 days (1 of 2 lower sessions), which ask | engine run |
| U6-8 near-duplicates | Partly: the gym kits have no dumbbell or bodyweight stand-ins (0 across 1,050 gym-kit weeks), the "(a second angle ...)" label sits on a same-movement second exercise right after the first in all 6,493 labelled lines and no same-movement adjacent pair is unlabelled. 4 + 4 pairs remain in 15 of the 32 built default plans (e.g. lines 868-869 Abduction Machine 4 and Cable Hip Abduction 4). New: U7-9 | 868, 907, 950 |
| U6-9 "reps by effort 6 to 30" | Fixed: the printed range is the engine's: 15 to 30 on 10 isolations (10,165 lines), 6 to 30 only on 11 bodyweight compounds (5,020 lines), 0 isolations at "6 to 30" | 51, 1994 |
| U6-10 chest between leg lifts | Fixed: 0 of 9,069 focus sessions and 0 plain sessions switch body half more than once (abs ignored); no exercise repeats in a session; Men's physique never trains legs in two sessions (0 of its focus builds) | 1619, 1630 |
| U6-11 names | Partly: the four-part leg names became "Lower Body"; "Glutes A, Hamstrings & Abs" became "(A)". New: mixed letter styles, U7-8 | 1095, 717, 1146 |
| U6-12 one curl a week | "Not changed, with reasons". NEW argument: the reason relies on the cause being printed, and at Figure and Women's physique 4 days the wall prints none (U7-6) | 1249, 1453 |
| U6-13 focus wording | Fixed: "just under 20" (19 lines), no "the about", "changes nothing: this category trains X only through other exercises", knees wording ("more would load the knees beyond what the plan allows"), calves named once. "about 12 to about 15 sets a week" stays (55 lines) | 2081 |
| U6-14 dumbbell A/B | "Not changed, with reasons". Observed unchanged: Men's physique 4 days dumbbells shares 5 of 7 names between Back A and Back B (1669-1696) | 1669, 1688 |

## What reads well (checked, not assumed)

- Every suggested length builds without asking again (1,218 of 1,218), the plan at that length has the same weekly sets (R48), and every offered day count builds without asking (119 of 119) and is the fewest that does.
- The refused set is identical at every length (90 per length), every offered day count builds (450 of 450), and no beginner is offered more than 4 days (0 of 469 day-count offers to beginners above 4).
- "N days a week give much the same week" is true on rebuild in all 330 weeks that print it (totals within 4 sets or 3%, no muscle more than 2 apart). "N days a week raise most of them" is true in 1,025 of 1,025.
- Kit-short lines name a muscle with exactly one exercise in 230 of 230 weeks.
- "With N days a week it gets T" (the moreAt branch) was true in 1,026 of 1,026 rebuilds.
- Session names never promise a muscle that is not held, 0 session names have a body-half mismatch, no session lists an exercise twice, and no two neighbouring sessions share four exercises.
- The gym kits (full gym, machines and cables) carry no stand-ins (0 of 1,050 weeks), and the beginner full-gym weeks have no barbell compound.
- No developer text, raw keys, "undefined", "NaN" or em dash in any plain message or focus message except the one ROOM LEFT line (U7-5). British English throughout.
- The plans are not under-filled where they say they are short: a one-set increase on any existing exercise of the muscle failed the checker or the sense layer in 3,612 of 3,612 probes (the wording of the reason is U7-3, the limit is real).
- "To make room" names every muscle that lost own sets, and the counted figure beside the minimum it is judged on is never below it (U6-3).
- A beginner's day counts, the "(a second angle for ...)" labels and the "a lighter day" tags behave as ruled.

## Not run

- The app's own copy (the renderer's wording is the only wording that exists); device checks; text-size pass.
- Starts other than session 1 (R40).
- Focus at 75 and 90 minutes; non-gym-kit focus at 2 and 6 days (3 to 5 only) and for the picks outside the eight common ones; Women's physique, Figure and Wellness at beginner/advanced beyond the beginner pass (they ran full gym intermediate and beginner only).
- Picks the category does not train ("front delts", "forearms", "traps"): the "changes nothing" message path was not reached because I only passed picks the rulebook accepts.
- Three-pick combinations beyond one per category.
- The exercises' correctness for a given piece of kit (bands, parallel bars, a step, sliders) is an integration item.
- Whether the weekly-sets footer is shown to people.

## Questions

Q1. Is the footer line "Weekly sets at the peak (counted: own sets + half of other exercises' credit; ...)" and its raw keys (`glute_max`, `upper_back`, "R34") shown to people in the app? If it is, it needs plain names and no register codes; the head lines do not need it.
Q2. Does the app explain that "sets by week 3/3/4/4/4/2" are weeks 1 to 6 and that week 6 is the recovery week? The "Reps by effort" line says "4 in week 6" with no introduction in the messages.
Q3. The "Reps by effort" line says "stop 3, 2, 2, 1, 1 reps short of failure in weeks 1 to 5", while one exercise in 120 plain weeks (Dumbbell or Cable Lateral Raise) says "stop 2 reps short of failure every week: the next session trains this muscle again". Both can be true; is the person told that the line covers only the "by effort" exercises?
Q4. Copenhagen Adduction (a hard side-plank groin exercise) is given to beginners in dumbbell, home, barbell and bodyweight kits at 2 to 3 sets (75 of 1,170 plain beginner weeks), and to intermediates and advanced at up to 5 sets. Is a coach comfortable with that for a beginner? (INFERRED concern, not a finding.)
Q5. Is U7-1's severity right? I ranked it BLOCKER because the head makes a statement the plan's own numbers falsify in 11% of built weeks and, for the whole barbell kit, hides a priority muscle with no exercise. If the barbell kit is thought rare, MAJOR.

## Left alone (deliberate or integration)

Two-set exercises; the 5-set single exercise in kits with one pattern (Band or Plate Lateral Raise at 5 sets in two sessions in 440 weeks); rest in 15-second steps; "Shoulders" names; the 30 and 45 minute screen (630 of 630 weeks at 30 minutes and 492 of 630 at 45 minutes ask for 45 to 75 minutes: kept per Q1 = C); kit labels (the barbell kit prescribes slider curls and clamshells, the bodyweight kit bands, parallel bars and a step); the bikini 3-day template.

## Housekeeping

Created and deleted: scratch-user7-dump.jest.js and scratch-user7-time.jest.js under docs/audit/plan-builder-map-2026-10-11/tools/. The scratch-coach7-*.jest.js files in the same folder are not mine and were left. No tracked file edited, no commit, push, stash or branch change; git used read-only (status, log, branch). Intermediate JSON and analysis scripts are in the session scratchpad only (r7/).
