# Round 4 end-user audit: structure engine plans

Source read in full: docs/audit/plan-builder-map-2026-10-11/12-STRUCTURE-PLANS-RENDERED.md (53 plan blocks: 40 main-matrix weeks, 13 variants; 8 of the 40 main weeks are refusals). Rulings register read: D222 addendum sections (R1 to R46). Line numbers below are lines of the rendered file.

How I checked: I read every plan, parsed the file into sessions and exercises to count patterns, and ran the real engine (throwaway jest files, deleted; no other file touched, nothing committed). Engine runs used a full gym, intermediate, no focus unless stated. Where I say "engine run" the number did not come from the rendered file.

Standard applied: the founder's "no instance where a person, or a coach, loads up a plan and says this doesn't make sense".

---

## Findings

### U4-1  BLOCKER  The session-length choice does nothing to the plan, and the question it triggers cannot be answered for 30 and 45 minutes

Plans: the 19 plans that carry the line, and every plan built at 30 or 45 minutes. In the rendered file: General 2, 3, 4 days; Bodybuilding 4; Classic 4; Men's 2, 3; Bikini 2, 3; Wellness 4; Figure 3, 4; Women's 3, 4; and the variants "General, 3 days, beginner, 45 minutes" (line 1617), "General, 2 days, home gym, beginner, 45 minutes" (1646), "Bikini, 4 days, focus glutes" (1671), "General, 4 days, focus chest" (1850), "Women's physique, 4 days, focus glutes" (1951).

Quoted:
- "Longest session 72 min against 60 chosen (asks for a longer session: 75 min, or more days)." (line 10; the same line appears on 19 plans: lines 10, 37, 75, 230, 393, 550, 577, 748, 776, 959, 1107, 1144, 1298, 1334, 1617, 1646, 1671, 1850, 1951)
- "Longest session 57 min against 45 chosen (asks for a longer session: 60 min, or more days)." (line 1617)

What a person thinks: "I said 45 minutes. The app says my plan is 57 and tells me to pick 60 or train more days. Which session? How many more days? What if I really only have 45?" For someone who picked 30 or 45 it is worse.

Evidence (engine run, full gym, intermediate, no focus):
- Sets and exercises are byte-identical at 30, 60 and 75 minutes (checked on General 4, Figure 4, Bodybuilding 4, Bikini 3, General 2). Only rest times change. So the length control, to the person, changes nothing except rest and whether they get asked.
- At 30 or 45 minutes, 63 of the 64 buildable (category, day count) weeks ask for a longer session (sessions of 63 to 72 min against 30 or 45 chosen). The only week that fits is Men's physique 6 days at 45 min (50 min). General at 30 or 45 asks for 75 at every day count from 2 to 6.
- "or more days" is offered in 62 of those weeks (days below 6). In 44 of the 62 no higher day count fits either (e.g. General 5 days at 45 min asks for 75; 6 days also asks for 75; Bikini, Figure, Women's, Bodybuilding, Classic, Wellness likewise). At 60 minutes every "or more days" offer has some day count that fits, so the false offer is specific to 30 and 45.
- At 60 minutes (the commonest choice) 14 of the 32 buildable weeks ask.
- Weeks that fit within the 5-minute tolerance still show sessions above the chosen length with no mention, e.g. "Longest session 65 min against 60 chosen." (lines 121, 169, 276, 327).

How widespread: all 8 categories. Two of the five length options (30, 45) are effectively unusable.

Suggested fix: (a) say which session, in plain words: "Your Lower & Abs session comes to about 72 minutes. You chose 60." (b) name the remedy that works: give the actual day count that fits, or omit "or more days" when no higher count fits; (c) for 30 and 45, tell the person up front the plan cannot be that short and what the shortest honest plan is, instead of asking for 75; (d) state what happens if they keep their length (this is the founder's Q1 = C, so the app must still offer a way forward); (e) consider not offering 30 and 45 where nothing fits. I am not re-opening Q1 = C itself; the new argument is that for 30 and 45 it asks something that cannot be satisfied, and half the question ("more days") is untrue in 44 of 62 cases.

---

### U4-2  BLOCKER  A chest (or side delt, or lat) focus changes nothing at 4 days in most physique categories, the exact complaint behind the rebuild

Plans: "Men's physique, 4 days, focus side delts and chest" (lines 1484 to 1527), and by engine run: Men's physique 4 days chest focus only is IDENTICAL, exercise for exercise, set for set, rest for rest, to the no-focus plan (lines 611 to 652).

Quoted (line 1489): "Focus not fully reached: chest 8 of 14 (it has 1 session a week, each already holding the most one session may; the plan says so)."
The chest day (lines 1518 to 1524) is still two exercises: "Incline Machine Press ... 8-15 reps" and "Machine Chest Press ... 8-15 reps", 8 sets.

What a person thinks: the founder's own words from D219: "Even with specialising chest I get two exercises!" They tick chest focus and get the same two exercises as everyone else. The sentence is also grammatically broken ("1 session a week, each") and does not say what would help (a fifth day).

Evidence (engine run, 348 single-focus builds: 8 categories x 3 to 6 days x 12 picks, full gym, intermediate, 75 min so length cannot interfere): 59 builds (17%) came back identical to the no-focus plan. The ones a person would care about most:
- Chest focus identical: Bodybuilding 4 and 5 days, Classic 4, Men's 4, Figure 4, Women's 4, Bikini 3 (7 of 29 category/day cells).
- Side delt focus identical (the signature muscle of Figure, Women's and Men's physique): Figure 3 and 4, Women's 3 and 4, Men's 3, Bodybuilding 4 and 5, Bikini 3.
- Lat focus identical: Figure 3 and 4, Women's 3 and 4, Men's 3, Bodybuilding 4.
- Glute focus identical: Classic 4, 5, 6; Bikini 3, 5, 6; Men's all day counts.

How widespread: 4 days is where it bites hardest; 5 of 8 categories at 4 days have a chest focus that adds nothing. The register (R46) records this as a known remainder ("picks still adding nothing"); it is not a "Kept, with reasons" ruling, and my new argument is the person-level one: a focus control that returns the same plan reads as broken.

Suggested fix: when a pick cannot add anything, say so BEFORE the plan is saved, in plain words with the remedy: "Chest already gets all the sets one session can hold at 4 days. With 5 days it gets a second session." Offer the day count that works (the engine already finds it for refusals). Where a pick can add sets by moving them (e.g. a chest press on the first back day, as R30 does at 5 days), consider allowing that at 4 days too, accepting adjacent upper days; that is a founder-level call, so I only raise it.

---

### U4-3  MAJOR  Some focus picks change nothing and the plan says nothing at all

Plans (engine run, no line appears in the rendered output for these): Men's physique, any day count, glute focus (plan identical, focus recorded as ignored); Bikini 5 and 6 days, glute focus (identical to the no-focus plan: glutes already at 18 sets, nothing to add); Men's physique 6 days, biceps focus (identical). The render prints a line only for "not fully reached" and "to make room".

What a person thinks: "I picked glutes for a bikini plan and nothing moved, and the app did not even say why." A bikini competitor choosing glutes is the single most predictable pick in that category.

Suggested fix: always say one calm sentence when a pick adds nothing: "Glutes are already at the top of what a week can hold, so your plan is the same." For an ignored pick (men's physique glutes are not trained directly in that category): "Men's physique does not train glutes directly, so this pick has no effect."

---

### U4-4  MAJOR  Focus, room-making, kit and refusal messages: muscle codes, jargon and a broken sentence

Quoted (all lines are sentences a person would read):
- Line 221: "Refused: side_delts cannot reach the category minimum at 2 days within the safety limits. Nearest day count that works: 4."
- Line 954: "Refused: side_delts cannot reach the category minimum at 3 days within the safety limits."
- Line 1488: "Focus not fully reached: side_delts 16 of 18 (it has 2 sessions a week, each already holding the most one session may; the plan says so)."
- Line 1489 (grammar): "it has 1 session a week, each already holding"
- Line 1817: "With this equipment side_delts has one exercise of its own: 5 of 8 sets a week (the plan says so)."
- Line 1852: "To make room for the focus: side_delts 8 to 6 own sets (minimum 6)."
- Line 1952: "To make room for the focus: quads 10 to 8 own sets (minimum 6); calves 10 to 9 own sets (minimum 6); glute_med 5 to 4 own sets (minimum 4)."
- Line 1999: "Focus not fully reached: quads 12 of 14 (its sessions are full; the plan says so)."

What a person thinks:
- Code names (side_delts, glute_med) read as an error.
- "own sets", "category minimum", "holding the most one session may", "its sessions are full" are coach-internal; "full" of what? time? sets?
- "12 of 14", "5 of 8": 14 and 8 of what? They are weekly set targets but the line never says "sets a week".
- "(the plan says so)" is a pointer to nothing the person can see.
- "Refused" is blunt for a calm, no-shame product.
- "To make room for the focus: quads 10 to 8" does tell them something was taken (good), but the person cannot tell whether 8 is fine. The women's physique glute focus plan actually drops the leg extension entirely (compare lines 1346 to 1353 with 1964 to 1971); the line says "quads 10 to 8 own sets", not "your leg extension is gone".

How widespread: every plan that carries a focus, room-making or kit line (lines 1488 to 1489, 1817, 1852, 1899, 1952, 1999) and the refusal lines: two of the eight show an underscore code (221 and 954, "side_delts"), all eight use "category minimum" and "safety limits".

Suggested fix: map muscle codes to names ("side delts", "glutes (medius)"), say "sets a week", name the cause plainly ("chest is already trained in the only session we can add it to, and that session holds the most chest work we allow"), and for room-making name the exercise that was dropped or reduced. Replace "Refused:" with a calm sentence; drop "(the plan says so)".

---

### U4-5  MAJOR  Refusals: 8 of 40 main weeks, wording hides the reason and one word worries

Plans: Bodybuilding 2 and 3 days, Classic 2 and 3, Wellness 2 and 3, Figure 2, Women's physique 2 (lines 219 to 225, 382 to 388, 948 to 954, 1100 to 1102, 1291 to 1293).

Quoted: "Refused: quads, hamstrings, calves, abs cannot reach the category minimum at 3 days within the safety limits. Nearest day count that works: 4." (line 225)

What a person thinks:
- "Safety limits": am I unsafe at 3 days? The real reason is the per-session limits on sets and exercises, which is not about their safety. This is misleading and slightly alarming.
- "category minimum" means nothing to a lay person.
- The muscle lists contradict each other: at 2 days Bodybuilding names only side_delts, at 3 days it names four others, so a person who sees "side delts" and tries 3 days meets a different list. 
- Someone with exactly three days for bodybuilding or classic physique (very common) is turned away, with only "4" offered.

Suggested fix: lead with the outcome: "Bodybuilding needs at least 4 training days a week to cover every muscle properly." Drop "safety limits" or replace with the true cause ("one session can only hold so much work"). Show one line of why in plain muscle names. Offer an alternative that does fit their days (a different category at their day count), since the engine knows which categories build at 3.

---

### U4-6  MAJOR  Men's physique: chest is two machine presses, once a week, at 4, 5 and 6 days (the founder's earlier complaint in a milder form)

Plans: Men's physique 4 days (lines 643 to 649), 5 days (673 to 677), 6 days (714 to 718), 4 days focus (1518 to 1524), and the advanced 75-minute machines plan (1590 to 1595).
Quoted: "Incline Machine Press ... 3/3/4/4/4/2, 8-15 reps" and "Machine Chest Press ... 3/3/4/4/4/2, 8-15 reps", nothing else for chest. Men's 3 days: Incline Machine Press plus Pec Deck, 5 sets (lines 580 to 581). Men's 2 days: one chest exercise (line 555).

What a person thinks: the founder said "Even with specialising chest I get two exercises!" This is still two exercises, both presses, no fly, one day a week; in the advanced plan (lines 1590 to 1595) the chest day is "about 48 min" of the 75 chosen. A person sees back trained twice and chest once with two exercises and wonders why a 75-minute pick leaves 27 minutes unused on the chest day. R20 says men's physique chest is incline press then a fly, flat press only when more sets are needed; at 4 to 6 days the second slot is a flat press and no fly appears.

Checked: engine run MP 5 days advanced 75 min: chest 8 of a normal 12; session 49.8 min; no focus line (the render prints none for "below normal").

Suggested fix: allow a third chest exercise (a fly at 2 to 3 sets) by taking one set off each press (3 + 3 + 2) so the day reads as a chest day without changing the weekly total, or use the free session time. If the session cap of 8 direct sets is the binding limit, say so in the plan (see Question Q1).

---

### U4-7  MAJOR  Classic physique 4 days: chest is the weakest muscle in the plan, with a 2-set bench press, and rows are one 3-set exercise

Plan: Classic physique, 4 days (lines 390 to 435).
Quoted: line 396 "Barbell Bench Press: sets by week 2/2/2/2/2/1, 6-10 reps, rest 120 s" (first exercise of Upper A, two sets); line 418 "Seated Cable Row: sets by week 2/2/3/3/3/2" (the only row in the week).
Weekly line (technical, for counts only): chest 6 (minimum 6, normal 10), rows own 3, against side delts 11, lats 11.5, quads 12, hamstrings 12, calves 11.

What a person thinks: a classic physique competitor judges chest and back; the plan opens Upper A with a bench press of two sets, then spends the day on pulldowns, three lateral raise exercises and rear delts. Chest is the lowest muscle in the plan and sits at the bare minimum while calves outrank it. And no line tells them chest is held below its normal volume (the engine knows: chest 6 of 10).

Compare: Classic 5 days chest 8, 6 days chest 10, so the oddity is the 4-day week.

Suggested fix: give the first chest slot of Upper A at least 3 sets or move a third of a lateral raise's sets to it; add a plain line "Chest is held at the minimum at 4 days; at 5 days it rises".

---

### U4-8  MAJOR  Bodybuilding 4 days: biceps are one exercise, once a week; Upper A has no arms work except one triceps exercise

Plan: Bodybuilding, 4 days (lines 227 to 271).
Quoted: Upper A (lines 232 to 239) has no biceps exercise; the only biceps exercise in the week is line 258 "EZ Bar Preacher Curl: sets by week 3/3/4/4/4/2".
Weekly line: biceps own 4 (credit 11), triceps own 5; chest 10, lats 10.5, upper back 10.5, side delts 10 are all at their minimum while the normal volume is 14.

What a person thinks: a bodybuilder's plan with four sets of biceps, in one session, with no hammer or second curl; and all the big muscles at the floor. Founder text: "At no stage ever is it acceptable to completely bypass or barely maintain key muscle groups." Not a complete dropout, but a person scanning for their arms sees one line.

Suggested fix: a second biceps exercise (2 to 3 sets) on Upper A; or a plain statement that arms ride on rows and pulldowns at 4 days and the 5-day week gives them their own session.

---

### U4-9  MAJOR  Equipment labels and what the plan needs do not match (bodyweight, dumbbells only)

Plans: "Figure, 3 days, bodyweight" (lines 1813 to 1845), "Men's physique, 4 days, dumbbells only" (1529 to 1569), "Wellness, 4 days, dumbbells only" (1712 to 1754), "General, 2 days, home gym, beginner" (1643 to 1666).
The app's own label for the kit (src/lib/equipmentOptions.js): Bodyweight, "No equipment needed"; Dumbbells only, "Adjustable or fixed dumbbells".
Quoted from the bodyweight plan: Pull-Up, Chin-Up, Inverted Row, Hanging Knee Raise (a bar); Bench Dip, Decline Push-Up, Decline Crunch (a bench or step); Slider Leg Curl (Bodyweight) (sliders); and six band exercises out of 19 ("Band Tricep Kickback", "Band Pull-Apart", "Band Standing Curl (Single-Arm)", "Band Hammer Curl", "Band Romanian Deadlift (Bilateral)", "Band Lateral Raise").
Dumbbells-only plans: Incline and flat dumbbell press, Chest-Supported Row (Dumbbell), Preacher Curl (Dumbbell), Decline Crunch (benches), and "Slider Leg Curl (Bodyweight)" inside a dumbbell plan.

What a person thinks: "No equipment needed" and I am told to do pull-ups and band raises; I do not own bands. "Slider Leg Curl (Bodyweight)" in a plan for dumbbells. One band exercise is the person's only side-delt work in that plan (line 1817 says side delts has one exercise).

Suggested fix: either tell the person on the equipment screen what each kit assumes (bar, bands, bench), or build bodyweight and dumbbell plans from what the label says. At minimum add one line to the plan: "This plan uses a pull-up bar and resistance bands."

---

### U4-10  MAJOR  Beginner plans lead with heavy barbell lifts, three in one leg day

Plans: "General, 3 days, beginner, 45 minutes" (lines 1614 to 1641); "Wellness, 5 days, beginner, focus quads" (lines 1995 to 2036).
Quoted (lines 1634 to 1636): "Barbell Back Squat: 3/3/4/4/4/2, 6-10 reps, rest 120 s", "Romanian Deadlift (Barbell): 3/3/4/4/4/2, 6-10 reps, rest 120 s", "Barbell Hip Thrust: 2/2/3/3/3/2, 6-10 reps, rest 120 s". Also "Barbell Bench Press: 3/3/4/4/4/2" first on the push day (line 1620). Wellness beginner session 1 opens with "Barbell Back Squat ... rest 180 s".

What a person thinks: a first-time lifter, 45 minutes, handed squat, barbell deadlift variant and barbell hip thrust in one session, with nothing lighter to learn on (a leg press, goblet squat or machine) and no leg curl or extension. It looks intimidating and a coach would question it. The same plan also asks the beginner for 60 minutes because their legs day comes to 57 (line 1617).

Suggested fix: for beginners prefer the machine or dumbbell version of the hinge and squat first (leg press, dumbbell RDL), keeping the barbell versions for intermediates. This is a content choice, not an ED or billing item.

---

### U4-11  MAJOR  The same movement appears twice (or twice in a week under two names)

Counts from the rendered file (sessions where two exercises share a movement):
- Two lateral raise variants in one session: 55 sessions, i.e. nearly every plan with side delts. Examples: lines 174 to 175 "Dumbbell Lateral Raise ... 3/3/4/4/4/2" then "Machine Lateral Raise ... 2/2/2/2/2/1"; line 134 to 135 "Cable Lateral Raise" then "Machine Lateral Raise"; line 556 to 557 "Dumbbell Lateral Raise" then "Cable Lateral Raise"; men's dumbbell plan lines 1538 to 1539 "Dumbbell Lateral Raise" then "Leaning Lateral Raise"; MP advanced Legs & Side Delts lines 1608 to 1609 "Machine Lateral Raise 4/4/5/5/5/3" then "Cable Lateral Raise".
- Two hip abduction exercises in one session: Bikini 3, 4, 5, 6 days, Wellness 5, 6, and the Bikini and Wellness variants. E.g. line 797 to 798 "Abduction Machine" then "Cable Hip Abduction" (3/3/4/4/4/2 each).
- Two leg curls in one session: Wellness 5 days (lines 1011 to 1012 "Seated Leg Curl ... 3/3/4/4/4/2", "Lying Leg Curl ... 3/3/4/4/4/2") and its beginner variant.
- Two rows in one session: 17 sessions, including "Dumbbell Row" and "Chest-Supported Row (Dumbbell)" (lines 1535 to 1536, 1553 to 1554) and Bodybuilding 6 days focus lats Pull B (1795 to 1796).
- Pull-Up and Chin-Up in one session (Figure bodyweight, lines 1828 to 1829).
- "Cable Lat Pullover" and "Cable Straight-Arm Pulldown", which are the same cable movement, in the same week: Classic 5 (focus) and 6 days, Figure 5 and 6, Women's 5 and 6, Bodybuilding 6 days focus lats.
- Standing and seated calf raise in one session: 20 sessions (defensible: knee straight vs bent, R24).

What a person thinks: padding. The lateral raises are the most common (7 or 8 sets of lateral raise in one session on adjacent lines). R24 and R33 rule these deliberate; my new argument is the person-level one: nothing on screen explains why, they sit next to each other, and "Cable Lat Pullover" vs "Cable Straight-Arm Pulldown" reads as a pure repeat.

Suggested fix: do not change the engine rule unless desired; add a short reason shown with the second exercise ("different angle for the same muscle"), put the two apart in the session (a different muscle's exercise between them), or keep one name for the cable pullover family.

---

### U4-12  MINOR  The next-day annotation is jargon

Plans: Men's physique 3 days (line 606), Figure 3 days (line 1136).
Quoted: "Dumbbell Lateral Raise: sets by week 3/3/4/4/4/2, 10-20 reps, rest 60 s, kept 2 reps short of failure all block (next-day light dose)".
A person: "what block? what is a light dose?" The lateral raise is also the last line of a session called "Legs & Side Delts", after the calf raises.
Suggested fix: "Stay about two reps short of failure on this one: you train shoulders again tomorrow." Say "this plan" or "these six weeks" for "block".

---

### U4-13  MINOR  Many exercises are two-set singles, dropping to one set in week 6

Counts: 314 of 1,226 exercises across the file never exceed 2 sets. Heaviest cases (roughly 40 to 50% of the plan): Bikini 2 days (8 of 16, lines 750 to 768), Wellness 4 days (11 of 29), Women's 4 days (11 of 30), Men's 2 days (6 of 15), Bikini 4 days and 5 days.
Examples: Bikini 2 days "Hack Squat Machine: sets by week 2/2/2/2/2/1" (line 753, the week's only quad work), "Standing Calf Raise (Machine) 2/2/2/2/2/1", "Cable Crunch 2/2/2/2/2/1"; General 2 days "Barbell Hip Thrust 2/2/2/2/2/1" (line 25).
A person: setting up a machine for two sets, and a week-6 set of one. In Bikini 2 days chest, quads, calves and abs are each a single 2-set exercise once a week. Set to the category minimum, but it looks token.
Suggested fix: where an exercise is the muscle's only work, prefer 3 sets and drop a different token exercise, or merge the single-set tail in week 6 (1 set) into the neighbouring exercise.

---

### U4-14  MINOR  Rest times that look odd

- 105 s (19 exercises) and 135 s (6 exercises) are unusual: lines 644 to 645 ("Incline Machine Press ... rest 105 s"), line 132 ("Barbell Bench Press ... rest 135 s"), "Push-Up ... rest 135 s" (line 1820).
- Squat rests less than upper-body lifts in the same plan: General 6 days "Barbell Bench Press ... rest 180 s" (line 172) against "Barbell Back Squat ... rest 120 s" (line 185); "Lat Pulldown (Wide Grip) ... rest 150 s" (line 179) against "Romanian Deadlift (Barbell) ... rest 120 s" (line 186). A lifter expects the squat to rest longest.
- Hack squat 180 s but the dumbbell Romanian deadlift 90 s in the same session: lines 626 to 627.
Suggested fix: explain once that rests are shortened to fit the session, or round to 120/150/180.

---

### U4-15  MINOR  Uneven sessions against the chosen length

Sessions of 30 to 44 minutes next to 60-minute ones: Men's 6 days "Shoulders A" 3 exercises about 30 min (line 702) and "Back B & Biceps" about 41 min (727); Bikini 6 days "Glute Med, Abs & Calves" about 30 min (938); Wellness 6 days "Hamstrings & Glutes B" about 32 min (1076), "Glutes A & Hamstrings" about 42 min; General 5 days "Shoulders & Arms" about 36 min (157).
A person who set 60 may wonder if the app broke. Fine as a design, but say "a lighter day".

---

### U4-16  MINOR  Sessions called "Shoulders" have no press

Plans: General 5 days "Shoulders & Arms" (lines 157 to 161: Lateral Raise, Face Pull, Preacher Curl, Overhead Tricep Extension), Classic 5 days "Shoulders, Arms & Abs" (476 to 483), Men's 6 days "Shoulders A" (702 to 705). No overhead or shoulder press appears in any of the 53 plans (grep: 0). This is research-derived (front delts are indirect-only, 09 findings, J1), so I am not asking to change it; the point is naming: a General fitness person opening "Shoulders & Arms" expects a shoulder press.
Suggested fix: name them "Delts & Arms" or add a line "Shoulder pressing is covered by your chest presses."

---

### U4-17  MINOR  Gym jargon in session names

"Glute Med, Abs & Calves" (line 938), "Quads, Glute Med, Abs & Calves" (794), "Hamstrings, Glute Med, Adductors & Calves" (1025, 2015), "Glutes, Hamstrings, Quads & Calves" (1006, 2001; that is simply the lower body), "Lower C" (880, 925) with no hint how it differs from A and B. Four-to-five-noun names are long on a phone.
Suggested fix: "Hips & Calves", "Lower body", or a one-line subtitle.

---

## Questions (could not settle from the file)

Q1. Does the app show the engine's "below normal volume" list (belowTypical) with the reason, as R8 says the plan will? The render never prints it. Examples where it matters: Classic 4 days chest 6 of a normal 10; Bodybuilding 4 days chest 10 of 14; Men's 5 days chest 8 of 12.
Q2. Does the app show focusIgnored (men's physique glutes) and "pick already at the top"? The render prints nothing for them (U4-3).
Q3. What does the person see if they decline both the longer session and the extra days in the length question? Is there a way to keep their length (Q1 = C says the plan is not saved until they choose)?
Q4. Does the equipment screen tell the Bodyweight and Dumbbells-only user that bands, a bar and a bench are assumed (U4-9)?
Q5. After a refusal, does the app offer a different category that builds at their day count, or only the nearest day count?

---

## What reads well

- Session names now say what is inside: "Chest, Triceps, Calves & Abs", "Push & Calves", "Legs & Abs". I found no session whose name contradicted its contents.
- Abs always last, compounds first, a muscle's isolation follows its own compound; sessions open with the main lift.
- Weekly shapes are recognisable and sensible: General 4 days Upper/Lower, 6 days push/pull/legs twice; Men's physique has one leg day at every count (founder ruling).
- Sets by week (3/3/4/4/4/2) and the recovery week are easy to read; heavy lifts rest 2 to 3 minutes and isolation 60 to 75 seconds; compound rest never drops below 2 minutes.
- Every plan has chest, back, shoulders, arms, legs and abs; no complete dropout of a muscle group in any of the 45 plans that build.
- "Cannot be trained directly with this equipment: adductors." (line 1754) is plain and honest.
- "To make room for the focus: ..." names what was taken (line 1952), which is the right instinct; it needs plain words (U4-4).
- No em dashes, no US spellings and no shaming or guilt language anywhere in the rendered file.
- Dumbbell, machines-and-cables and home plans are internally coherent (no barbell in a "no free barbells" kit).

## Housekeeping

Throwaway files scratch-user-a to scratch-user-f.jest.js were created under docs/audit/plan-builder-map-2026-10-11/tools/ and deleted. `scratch-coach-a.jest.js` in the same folder is not mine and was left. No other file edited; no git commands run beyond read-only `git status`/`git log`.
