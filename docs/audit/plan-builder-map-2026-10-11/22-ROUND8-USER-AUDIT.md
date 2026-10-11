# Round 8 end-user audit: structure engine plans

Branch planner/structure-engine-rulebook, HEAD ba154a5 ("Structure engine: fix what the round 7 coach and user audits found"). Read-only. Working tree: no tracked file touched; my throwaway files (tools/scratch-user8-*.jest.js) are deleted. The untracked tools/scratch-coach8-*.jest.js files in the same folder are another auditor's and were left alone.

Read in full first: 12-STRUCTURE-PLANS-RENDERED.md (2,335 lines), 20-ROUND7-USER-AUDIT.md, 19-ROUND7-COACH-AUDIT.md, and the D222 addenda for rounds 4 to 7 (DECISIONS-2026-07-09.md lines 12121 to 12191). Items the register marks "Kept" or "Not changed" are treated as deliberate. Where I touch one I say NEW ARGUMENT.

Line numbers are lines of the current 12-STRUCTURE-PLANS-RENDERED.md unless I say "engine". A plan key reads goal|days|kit|level|minutes|focus. OBSERVED means I read it or ran it; INFERRED means it follows from what I read.

## How I checked

- I ported the renderer's wording (tools/render-structure-plans.jest.js, every message function, verbatim) into a throwaway module and ran `buildStructurePlan` with the campaign16 LIBRARY. OBSERVED: the port reproduces the 40 main weeks of the rendered page line for line (1,303 of 1,303 non-blank lines identical), so the page is current at HEAD and my wording is the page's wording.
- Plain: all 8 categories x 2 to 6 days x 6 kits x 3 levels at 60 minutes (720 builds: 630 built, 90 refused), each with claim rebuilds. Lengths: 30 and 45 minutes for full gym, machines and cables, bodyweight, intermediate (240 builds: 200 built, 40 refused), with claim rebuilds.
- Focus (single picks, every legal pick, full gym, 60 minutes, with claim rebuilds): 792 builds, 656 built. General and bodybuilding at all three levels and 2 to 6 days (390); classic physique partly (86 records, days 2 to 5, no 6); men's physique, bikini, wellness, figure and women's physique at intermediate only, days 2 to 6 (316).
- Hand probes (40 builds): non-gym kits, two to four picks, untrainable picks, picks a category does not train, near-maximum picks.
- Claims rebuilt: every "Sessions of N minutes would hold this plan" (and that no shorter standard length does), every "or D days a week of L minutes" (and that no fewer days do), every refusal's offered day count and length, every R55 question (the figure printed, that the offered day count gains at least 2 sets and does not ask again, that no fewer days gain, the length it names), every "With N days a week it reaches/gets T", every "much the same week" and "N days a week carry about K sets more", every "N days a week raise most of them" (246 walls, with fewer-day counter checks).
- Cause statements ("is full", "already holds the most exercises", "the most sets of it one session may hold") checked against the session each names, from the plan's own exercise and set counts.

Result in one line: every number and every offered day count or length that a message prints is true on rebuild (0 failures; claim rebuilds ran on all 1,752 records). What is wrong is what the messages say about those numbers, and one product behaviour (beginners' focus) that the wording hides.

## Findings

### U8-1  MAJOR  A focus question whose two answers are the same plan (86% of the questions)

NEW ARGUMENT on R55 (D222 round 6 addendum). R55 offers "N days a week, N days without the pick, or N days with it as it is". When the pick adds nothing and takes nothing, the last two are the same week. The ruling did not consider that case.

Quoted, in the file:
- Line 2289 (Bodybuilding, 4 days, focus chest): "Asks before saving: your chest focus adds nothing at 4 days, because Upper A is full, and Upper B already holds the most exercises a session may. With 5 days a week chest gets 15, in sessions of 75 minutes. Choose 5 days a week, 4 days without the chest focus, or 4 days with it as it is."

Quoted, from the engine, where no better day count exists:
- General, 2 days, beginner, chest: "Asks before saving: your chest focus adds nothing at 2 days, because the session that trains it already holds the most exercises a session may. Choose 2 days without the chest focus, or 2 days with it as it is."
- Figure, 4 days, bodyweight, side delts: "adds nothing at 4 days, because no other exercise for them is available with this equipment. Choose 4 days without the side delts focus, or 4 days with it as it is."

What a person thinks: "It says my focus adds nothing, then asks whether I want it without or with it. What is the difference?"

How widespread (OBSERVED, 656 built single-pick weeks): 301 weeks (46%) carry a focus question. In 260 of the 301 questions (86%) the pick gains 0 sets and takes none, so "without" and "with it as it is" give the same exercises and sets. In 144 (48%) there is no better day count either, so the question is only that pair. I rebuilt 70 sampled "adds nothing" questions as plain week against focus week: 70 of 70 have the same exercises and the same sets; in 18 the only difference is the order of two exercises in one session (for example a triceps focus puts the overhead extension before the lateral raise). The question is worded as a real choice.

Suggested fix: where the pick gains nothing and takes nothing, print a statement instead of a choice ("Your chest focus changes nothing at 4 days: the plan is the same with or without it. With 5 days a week chest gets 15, in sessions of 75 minutes.") and ask only about the day count when one is offered.

### U8-2  MAJOR  For a beginner, a focus pick never changes the plan at 2 to 4 days, and nothing says what would (question for the founder)

NEW ARGUMENT on the D219 complaint ("Even with specialising chest I get two exercises!"), which R55 answered by asking rather than by changing the plan.

OBSERVED (General, bodybuilding, classic physique, full gym, 60 minutes, every legal single pick): beginner 2, 3 and 4 days: 91 of 91 picks ask, 0 pass through. Over all beginner days 129 of 156 picks (83%) ask, and 128 of those 129 offer no better day count. The cause printed is always the beginner's session size: "the session that trains them already holds the most exercises a session may" (the beginner growth cap is 5 exercises, rulebook SESSION_LIMITS.beginnerGrowthExercises). A beginner is also never offered more than 4 days (09 B12), so there is no way out inside the app.

What a person thinks: "I ticked a muscle and nothing I can do changes the plan."

I have not interpreted this: it may be the intended meaning of R23/R25 (beginners' sessions stop at 5 exercises above the minimum). It is raised as a question (Q2) because a beginner is the person most likely to use the picker. Not checked: the other five categories at beginner level (they ran at intermediate only).

### U8-3  MAJOR  The vaguest cause left: "would break a rule of the plan", on headline picks

REGRESSION-ish against the round 6 standard (D222: every stated cause a whole clause naming the rule). The fallback for a pick that was rolled back by the rulebook check (reason "checks") still reads:

Quoted, from the engine:
- Bikini, 5 days, glutes: "Your glutes focus: about 18 to just under 20 sets a week, short of the 20 a focus aims for, because more in each session that trains them would break a rule of the plan." (also bikini 6 days)
- Men's physique, 5 days, biceps: "Your biceps focus: 15 to 17 sets a week, short of the 18 a focus aims for, because more in each session that trains them would break a rule of the plan." (also men's physique 6 days biceps and upper back, bodybuilding 6 days biceps)

What a person thinks: "Which rule? Is the app broken?" The bikini glute pick is the category's signature muscle.

How widespread: 6 of 656 built single-pick weeks (0.9%); every one a 5 or 6 day week. Plain weeks: 0 of 630.

Suggested fix: name the failing check in plain words (the same table as CODE_BINDER: the joint it would load, the recovery it would cost, the pressing-against-pulling balance), or fall back to the nearest true cause from the session probe.

### U8-4  MAJOR  "short of the 17 a focus aims for ... With 6 days a week it reaches 16"

NEW, caused by the round 7 fix to U7-2 (the figure is now the rebuild's, which is correct, but "reaches" is still judged against that day count's own target and printed beside this day count's target).

Quoted, from the engine:
- General, 5 days, advanced, upper back: "Your upper back focus: 13 to 16 sets a week, short of the 17 a focus aims for, because Pull already holds the most sets of it one session may hold, and Upper Body is full. With 6 days a week it reaches 16."
- Classic physique, 5 days, advanced, lats: "about 17 to just under 20 sets a week, short of the 20 a focus aims for ... With 6 days a week it reaches 19."
- Figure, 5 days, intermediate, triceps: "about 12 to about 15 sets a week, short of the 16 a focus aims for ... With 6 days a week it reaches 15."
- Also General 5 days advanced triceps, classic physique 5 days advanced rear delts, women's physique 5 days triceps.

What a person thinks: "It reaches 16 and the aim is 17: that is not reaching it."

How widespread: 6 of 656 built focus weeks (0.9%); all are 5-day weeks that offer 6 days. The rebuilt figure itself is right in every case (0 failures), only the word is wrong.

Suggested fix: use "gets" (as the sentence already does for the other branch) whenever the figure is below the target printed in the same line, or say "its aim at 6 days is 16, and it reaches it".

### U8-5  MAJOR  A six-day week that is smaller than the five-day week, disclosed twice differently and with nothing to do about it

The round 7 fix for U7-13 prints the fact. NEW ARGUMENT: the disclosure raises the question without answering it, and the two wordings contradict each other's tone.

Quoted:
- Line 1345 (Figure, 6 days): "5 days a week give much the same week, with about 2 sets more: the extra day mostly spreads the same work."
- Engine, General, 6 days, dumbbells only, intermediate: "5 days a week carry about 5 sets more than this week: the extra day spreads the work more thinly."
- Engine, Men's physique, 6 days, barbell and plates, advanced: the same sentence with "about 5 sets more".

What a person thinks: "I chose six days and the app says five days has five more sets. Why would it give me the worse week? Which should I pick?" "With about 2 sets more" after "much the same" also reads as if the six-day week had more.

How widespread (plain, 60 minutes): 36 of 139 built six-day weeks (26%) carry one of the two sentences; 10 use "carry about N sets more" (up to 5 sets, home gym, dumbbell and barbell kits).

Suggested fix: either build the six-day week so that it is never smaller than the five-day week, or say what to do ("5 days a week is the stronger week if you can train five days"), in one wording.

### U8-6  MINOR  The same cause sentence printed on consecutive lines

NEW wording problem from the round 7 per-session grouping (lines are grouped by which sessions bind, but the words hide the sessions, so two lines read as a copy error).

Quoted:
- Lines 1243 and 1245 (Figure, 4 days): "Fewer sets a week than the plan's usual amount, because each session that trains them is full: chest 6 (usually 10), rear delts 8 (usually 10)." then (line 1244 in between) then "Fewer sets a week than the plan's usual amount, because each session that trains them is full: upper back 6 (usually 10), biceps 8 (usually 10)."
- The same pattern: lines 1449 and 1451 (Women's physique 4 days); 1759 and 1760 (General 3 days beginner 45 minutes: "...already holds the most exercises a session may: side delts 4 ..., abs 4 ..." then the identical words for "quads 4 ..., hamstrings 4 ..., calves 4 ..."); 1923 and 1924 (Bodybuilding 6 days lats focus: "each session that trains them is full" twice); 2142 and 2144.

How widespread: 51 of 630 plain 60-minute weeks (8%); 51 of the 225 weeks that print any "Fewer sets" line. In the general, bodybuilding and classic physique focus weeks 53 of the 134 that print one; in the other five categories 25 of 49.

Suggested fix: merge lines whose words are identical, or name the sessions when they differ.

### U8-7  MINOR  A one-set gap still printed, because a half set rounds up

Round 7's U7-7 ruling ("a gap of one set or less is not listed") judges the unrounded figure. A week at 8.5 of 10 prints "about 9 (usually 10)", which reads as a one-set gap.

Quoted: line 41 (General, 3 days): "triceps about 9 (usually 10)" in the list of nine. Engine: General 3 days advanced "biceps about 11 (usually 12)".

How widespread: 49 of 630 plain 60-minute weeks (8%) print at least one entry whose printed gap is one set (56 entries of 2,911 listed).

Suggested fix: judge the gap on the number as printed, or print 8.5 as "8 to 9".

### U8-8  MINOR  "already holds the most sets of it one session may hold" next to a session with 4 to 7 of that muscle

The cap behind that sentence is 8 direct sets or 11 counted (half credit included, rulebook PER_SESSION). The sentence never says the number, and the person sees only the direct sets.

OBSERVED: 31 of 293 "muscle cap" statements in the plain 60-minute weeks (11%) are about a session with fewer than 8 direct sets of the muscle (7 in 21, 5 in 9, 4 in 1); in 9 of them the session is not even full (22 sets or fewer). Worst case, engine, Wellness 3 days, full gym, beginner: the wall says "the most sets of one muscle a session may hold (hamstrings)" while "Glutes & Hamstrings" is 4 exercises, 13 sets, about 45 minutes with 7 hamstring sets, beside an 8-exercise 64-minute upper day.

What a person thinks: "That session is short. Why can it not take one more curl?"

Suggested fix: print the cap ("8 sets of it, the most one session may hold") and, for a beginner, the beginner limit actually hit (3 sets an exercise).

### U8-9  MINOR  "before them are trained again"

Wording slip: the recovery clause uses "them" as a subject. 13 lines in the sweeps (all plural muscles, including "abs"). Quoted, engine, Bodybuilding 5 days, barbell: "...and more in Legs A would leave too little recovery before them are trained again: abs 8 (usually 10)." Singular is right ("before it is trained again"). Fix: "before they are trained again".

### U8-10  MINOR  Three "What holds them back" labels a person cannot decode

Quoted:
- Line 1990 (Figure, 3 days, bodyweight): "another muscle's most sets in the same session (upper back)"; "no different exercise left in their sessions (rear delts)".
- Engine, Bikini, 3 days, bodyweight: "what the equipment offers (side delts)".

"Another muscle's" does not say which muscle, and "what the equipment offers" does not say the kit has one exercise for it. The longer per-session sentences name the muscle and the session; the wall abbreviates them into labels.
How widespread (plain 60 minutes, 246 walls): "another muscle's most sets" in 5 weeks (6 entries); "what the equipment offers" in 58 weeks (81 entries); "no different exercise left in their sessions" in 27 weeks (29 entries).
Suggested fix: "the glutes' own cap (more upper back would give them more sets than one session may hold)" or drop the label for that muscle and keep the per-muscle sentence.

### U8-11  MINOR  A one-for-one swap is said for one pick, not for two or more

U7-11 added "which takes 1 set a week from abs" only when exactly one pick is made (renderer `one`). Engine, General, 3 days, chest and biceps: "Asks before saving: your chest focus adds only 1 set a week at 3 days ... Choose 4 days a week, 3 days without the chest focus, or 3 days with it as it is." and only later "To make room for your focus: abs 6 to 5 sets ...". Of the 41 questions where the pick adds some but under 2 sets, 30 state the swap (single picks) and the other 11 take nothing. With two picks none states it (OBSERVED in the probe).

### U8-12  MINOR  Two questions in one plan name different day counts

When a plan asks about length and about a focus pick, each offers its own day count and neither says how they combine.
Quoted, lines 2288 and 2289 (Bodybuilding, 4 days, chest): "Sessions of 75 minutes would hold this plan, or 6 days a week of 60 minutes." then "...With 5 days a week chest gets 15, in sessions of 75 minutes. Choose 5 days a week, ...". The 5-day answer to the second question asks for 75-minute sessions, which is the first question's other answer.
OBSERVED: 60 of 656 built focus weeks (9%) carry two questions with different day counts; 301 questions overall. Integration item for phase 6 if the app shows one chooser; as worded here, a person has to work it out.

### U8-13  MINOR (needs Q1)  A pick beyond the third is dropped without a word

OBSERVED in the engine: `focusDropped` is reported and the renderer prints nothing for it. Bikini, 4 days, picks chest, lats, glutes, quads: the lines speak for glutes, lats and chest only; quads (the fourth) are not mentioned. Same for General, 4 days, chest, lats, biceps, quads. FOCUS.maxPicks is 3. If the picker cannot send a fourth pick this is moot (Q1). If it can, it is the D219 complaint again.

### U8-14  MINOR  The counting sentence can come after the figure it explains

The round 6 rule is that "Sets are counted as in the app" is printed once above any counted figure. The near-maximum line is pushed before it. Engine, Classic physique, 6 days, advanced, lats: "Your lats focus: lats already get 19 sets a week, close to the most a week holds (20), so the plan is the same." then "Sets are counted as in the app: ...". In Figure 6 days advanced lats the sentence is absent altogether. Small; the same ordering applies to the "changes nothing" line.

### U8-15  MINOR  An untrainable-muscle head line says what is short but not what would fix it

Round 7 accepted wording ("With this equipment lats have no exercise of their own: other exercises give them about 5 counted sets a week, against a minimum of 10.", engine, Bodybuilding 4 days, barbell and plates; 99 of 99 barbell weeks). NEW ARGUMENT only on the missing way forward: the focus version offers "or other equipment" and the plain head offers nothing, so the person learns a priority muscle is at half its minimum with no sentence on what to change (a pulldown, a pull-up bar). Also, when the pick is asked about, the minimum is dropped: "(they get about 4 sets a week through other exercises)" (Men's physique 3 days, barbell, lats focus) never says the minimum is 8.

## Status of round 7's 13 findings

| Round 7 | Status now | Evidence |
|---|---|---|
| U7-1 BLOCKER "every muscle gets its minimum" above a plan with a muscle below it | Fixed. 118 of 630 plain 60-minute weeks have a muscle below its minimum (91 barbell, 19 bodyweight, 4 dumbbells, 4 home gym); all 118 are announced by the head line or the kit-short line (0 unannounced); the wall says "every other muscle" in every one of them and "every muscle" in none of them (0 contradictions). Barbell kit: 99 of 99 print the lats line. Residual: U8-15 | whole sweep, probes |
| U7-2 R55 way out | Fixed in the numbers: 0 failures in 301 rebuilt questions and 64 "reaches/gets" claims (56 "reaches", 8 "gets") (printed figure equals rebuild; offered day count gains 2 or more and does not ask again; no fewer day count gains; the named length holds). New: U8-4 (the word "reaches") | 792 focus rebuilds |
| U7-3 causes of one session | Fixed in substance: "is full" is true of its session (2,464 of 2,464 at 23 sets or more); "most exercises" 2,726 of 2,727; no "room" cause anywhere. Residual: the muscle cap (U8-8) and duplicated sentences (U8-6) | 630 plain weeks |
| U7-4 untrainable pick dropped silently | Fixed: asks, with the pick's sets and "other equipment" (probes: lats on barbell at 3 and 4 days, side delts on bodyweight and barbell). Residual: U8-15, U8-13 | probes |
| U7-5 "ROOM LEFT" | Fixed: 0 of 792 focus builds, 0 of 960 plain builds; Men's physique 3 days beginner calves now reads "...because the session that trains them already holds the most exercises a session may" | whole sweep, probe |
| U7-6 wall states no cause | Fixed in form (246 of 630 weeks print "What holds them back"). Residual: labels that show only the lead session (117 of 2,348 entries have a second, different cause elsewhere, mostly "full" against "most exercises", which a person reads as the same) and three cryptic labels (U8-10) | an3 |
| U7-7 one-set gaps listed | Partly: unrounded gaps of one set or less are hidden; half sets round into a visible one-set gap in 49 weeks (U8-7) | line 41 |
| U7-8 two letter styles | Fixed: 0 violations in 630 plain weeks (letter after the first part, only where names start the same, never duplicated names); 96 distinct names; 3 four-part names | names check |
| U7-9 two brackets in a row | Fixed: ", a second angle for the X" after the name; all 1,310 labelled exercises follow an exercise of the same muscle | an5 |
| U7-10 refusals | Fixed: 90 of 90 refusals offer a day count that builds; 24 of the 90 name the length that week needs and it holds; wording "too little for a session of its own". Not run at other lengths | 60 minutes |
| U7-11 swap unstated | Fixed for one pick (30 of 41 one-set questions state it, the rest take nothing); not for two or more picks (U8-11) | probes |
| U7-12 blended wording and a length not the shortest | Fixed: "5 counted sets a week, against a minimum of 8" (47 lines); at 30 and 45 minutes the length offered is the shortest that holds in 197 of 197 asking weeks (suggested 60 in 160, 75 in 34, 45 in 3), 0 failures, and the 7 day-count offers hold | 240 builds |
| U7-13 six days smaller than five | Disclosed, not resolved: 36 of 139 six-day weeks carry the sentence (U8-5) | an plain |

## What reads well (checked, not assumed)

- Every number a message prints holds on rebuild: lengths (shortest, none shorter, same weekly sets), day counts (fewest), refusals (90 of 90 build; beginner never offered above 4), R55 figures, "reaches/gets", "much the same week" (totals within 3 sets or 3%, no muscle more than 2 apart), "N days a week raise most of them" (246 of 246, none missed by a smaller day count). 0 failures.
- All 1,486 built plans across the sweeps pass checkPlan and senseCheck. No "undefined", NaN, raw keys, "room", or em dash in any message.
- The wall's count equals the number of muscles it lists in every week; its "N days a week raise most of them" never offers fewer days than the plan has.
- Every focus pick gets a sentence of its own (656 of 656 single-pick weeks): reached, short with a cause, asked, or already close to the most.
- "To make room for your focus": the counted figure is never below the minimum it quotes (0 of 398 entries in 245 weeks). Near-maximum picks read correctly and take nothing (probes: Classic 6 days, Figure 6 days, Women's physique 6 days, advanced lats).
- Session names: letters only where names start the same, one style, no duplicates; abs and calf finishers are named ("Chest, Triceps & Calves", "Upper B & Calves"); a session's exercises are covered by its name except a curl in "Back & Delts" (30 weeks) and a rear-delt fly in "Back, Biceps & Abs" (12 weeks), which the pull-day convention covers.
- Order inside sessions: abs last in every session; calves never before upper work except in "Legs & Side Delts" (48 of 48 such cases); no body-half switch more than once; no exercise twice in a session.
- Refusal wording is plain ("too little for a session of its own").

## Not run

- The full 3,600-build matrix: 75 and 90 minutes; 30 and 45 minutes for dumbbells, barbell, home gym (messages not read) and for beginner and advanced; claim rebuilds at 75 and 90.
- Focus: non-gym kits beyond 14 hand-picked probes; classic physique days 6 and part of days 2 to 5; the other five categories at beginner and advanced; more than eight two-pick and one three-pick combinations; picks at lengths other than 60.
- The app's own copy, device checks, text-size pass, starts other than session 1.
- The weekly-sets footer (the audit's diagnostic, not app copy).

## Questions

Q1. Can the focus picker send more than three muscles? If yes, U8-13 is the D219 complaint again (the fourth pick vanishes without a line).
Q2. Is it intended that a beginner's focus pick changes nothing at 2 to 4 days (91 of 91 in the three categories I covered)? If it is, the question wording should say so as a statement (U8-1); if not, the 5-exercise growth cap is the thing to revisit.
Q3. Is "with it as it is" in R55 meant to keep a remembered pick that matters elsewhere in the app? If it does, the question should say what differs; if it does not, U8-1's fix applies.
Q4. Is a six-day week that is smaller than the five-day week (26% of six-day weeks) acceptable, or should the engine build it to at least the five-day total (U8-5)?
