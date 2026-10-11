# Round 4 adversarial coach audit: structure engine plans (2026-10-11)

Branch `planner/structure-engine-rulebook`. Audited: every plan in `docs/audit/plan-builder-map-2026-10-11/12-STRUCTURE-PLANS-RENDERED.md` (8 categories x 2-6 days, intermediate, full gym, 60 min, plus the 13 variants), against 09 (as corrected by 10), F1-F6 (08 Part 2) and every D222 addendum ruling R1-R46.

Method. Read every rendered plan line by line. Every hypothesis was then tested against the real engine and library through throwaway jest files under `tools/scratch-coach-*.jest.js` (now deleted): (a) builds of all 40 base plans and the variants with per-session probes; (b) an in-memory, instrumented copy of `engine.js` (file untouched) that dumps each session after every pass, to find which pass made each choice; (c) the same week at 45/60/75/90 min; (d) every single focus pick on every full-gym week (409 picks) against its plain week; (e) hand-edited copies of built plans re-run through the real `checkPlan`, `senseCheck` and `checkFocusAgainstBaseline` to prove a better plan is legal. "Demonstrated legal" below means that edited plan passed every rulebook check, every sense check and C5; the only failure in those runs was C18's stale `reportedMinutes` (the edit did not recompute the reported minutes), which is an artefact of the edit, not of the plan.

Labels: OBSERVED = read or run. INFERRED = labelled as such.

---

## BLOCKERS

### C4-1 BLOCKER. A longer chosen session builds a smaller week (founder Q1 = C broken)

Plans: Classic physique 5 and 6 days; Bodybuilding 5 and 6 days; General 5 and 6 days; Women's physique 5 and 6 days (8 of the 32 built full-gym weeks).

OBSERVED (scratch probe, same inputs, only the length changed; own sets a week):

| Plan | 45 min | 60 min (the rendered page) | 75 min | 90 min |
|---|---|---|---|---|
| Classic 6d total sets | 110 | 120 | 110 | 110 |
| Classic 6d quads / hams / calves / abs | 12/12/11/6 | 14/13/14/10 | 12/12/11/6 | 12/12/11/6 |
| Classic 5d total; quads / calves / abs | 103; 12/11/6 | 110; 14/12/10 | 103; 12/11/6 | 103; 12/11/6 |
| Bodybuilding 6d calves | 7 | 10 | 7 | 7 |
| Bodybuilding 5d calves | 7 | 8 | 7 | 7 |
| General 5d/6d, Women's physique 5d/6d glute med | 5 | 6 | 5 | 5 |

Rendered at 60 (Classic physique, 6 days): "calves 14, own 14 (10/14/20)", "abs 10, own 10 (6/10/14)", "quads 14, own 14 (10/14/20)", "1. Push A & Calves ... Seated Calf Raise ... Leg Press Calf Raise", "4. Push B & Abs ... Cable Crunch ... Hanging Knee Raise". Choose 75 or 90 minutes and the same person gets calves 11, abs 6, quads 12: priority muscles below normal volume that the 60-minute week shows can be held.

Why it is wrong. Q1 = C (register D222): "The full plan is always built ... Nothing is removed to fit the clock"; R44 amended: "the gate pins the same week at every length". A person who gives the plan more time gets less training. Nobody would accept that from a coach.

Mechanism (OBSERVED, engine.js 914-1021): R28 moves abs and calf isolation out of a session only when a session is over the chosen length at floor rest, keeps the moves only if the week then fits, then R36 refills normal volume into the freed room. At 75/90 nothing is over length, so nothing moves and the leg sessions stay at the 24-set cap; at 45 the moves cannot make the week fit and are undone. The gate pins the same plan only at 4 days and only 30 against 90 minutes (`gate.test.js` 237-243), where no move happens at either length.

Fix (within bounds: adds, never removes): make the floater rebalancing part of building the full week, independent of the clock (as R44 amended did for the in-session moves): move abs and calf isolation from a session at the 24-set cap to the lightest legal session, refill normal volume, at every length; then shorten rest and ask, as now. Extend the gate's same-week test to every day count and 45/60/75/90.

### C4-2 BLOCKER. Focus picks that change nothing and say nothing

Plans (single focus pick, full gym, intermediate, 60 min): Bikini 5 and 6 days, focus glutes; Bodybuilding 5 and 6 days, focus biceps; Men's physique 4, 5 and 6 days, focus biceps. 7 of 409 picks.

OBSERVED: the focused plan is the plain plan, set for set, and the plan carries no "Focus not fully reached" line. Bikini 5d glute focus: report `glute_max 18, target 18, max 20; focusUnmet []`. Men's physique 4d biceps focus: "biceps 15 -> 15 (target 14)", own deltas NONE (only the order of two exercises changed). The rendered plain bikini 5d already shows "glute_max 18, own 12 (10/14/20)".

Why it is wrong. A bikini athlete who asks for a glute focus gets nothing visible and no reason. R46's own premise: "A focus that changes nothing is a plan that does not make sense to the person who chose it"; S12: a focus short of its target is "never silent". 09 s3 reads "Focus (D): +4 fractional sets/week", an addition; the engine sets the target at typical + 4 (engine.js 182-183), so a week whose credit (biceps from rows) or S5 top-up (bikini Lower C's kickback) already sits at typical + 4 has no focus goal at all.

Room exists (OBSERVED): bikini glute max 18 against a focus maximum of 20; men's physique biceps R34 count 6 own + min(9 credit, 12) = 15 against a focus maximum of 18, with Back A and Back B at 23 of 24 sets.

Fix: focus target = min(focus maximum, max(typical + 4, plain-week count + 4)); for credit-fed muscles (arms, rear delts) measure the focus on own sets (+4 own); S12 fails any pick whose own sets did not rise unless a reason is reported.

---

## MAJOR

### C4-3 MAJOR. When a set must give way, the session's main compound gives first

Plans: Men's physique 3d, Figure 3d, Classic physique 4d (plain weeks); General 4d focus calves; partly Women's physique 4d focus glutes.

Rendered: Men's physique 3d "1. Push & Abs ... Incline Machine Press: sets by week 2/2/3/3/3/2" (the only press of the week; chest 5 a week) beside "Cable Lateral Raise 3/3/4/4/4/2", "Machine Lateral Raise 3/3/4/4/4/2", "Cable Crunch 3/3/4/4/4/2". Figure 3d "Barbell Bench Press: sets by week 2/2/3/3/3/2" beside two 4-set laterals and a 4-set crunch. Classic physique 4d "1. Upper A ... Barbell Bench Press: sets by week 2/2/2/2/2/1, 6-10 reps, rest 120 s" as the session's opener, beside "Reverse Pec Deck 3/3/4/4/4/2" and "Dumbbell Lateral Raise 3/3/4/4/4/2". Focus probe, General 4d focus calves: "Romanian Deadlift (Barbell) 4 -> 3", Leg Extension removed, while the same session's Cable Crunch 4 (abs at 10, same tier, same surplus) was untouched.

OBSERVED (instrumented passes): men's physique 3d and figure 3d presses were 4 after the minimum pass and lost a set in the P-tier repair (normal volume for side delts); classic 4d bench was 3 and lost a set in the R44 move. Abs (crunch 4) had the same surplus as chest in both 3-day Push sessions. Cause: on a tie the donor is the earliest exercise in the session (repair, engine.js 635-636: `s.exercises.indexOf`; R44, engine.js 849-850: `x.at - y.at`), and the earliest exercise is the main lift. Demonstrated legal: classic 4d with bench 3 and machine lateral 2.

Why it is wrong: 09 s7 orders compounds first because they carry the session; a 2-set barbell bench as a session's opener is a token a coach deletes or fixes. Giving from the main lift instead of a crunch is backwards.

Fix: on a tie, isolation donors before compounds and the later exercise before the earlier; never take a muscle's only compound in a session below 3 peak sets.

### C4-4 MAJOR. The repair step is not fair: freed sets go to the first muscle in rulebook order, not the neediest

Plan: Men's physique 3 days (Pull). Rendered: "Seated Cable Row: 3/3/4/4/4/2", "Chest-Supported Row (Dumbbell): sets by week 2/2/2/2/2/1", "Cable Straight-Arm Pulldown: sets by week 3/3/4/4/4/2"; weekly "lats 11, own 8 (8/14/20); upper_back 8, own 6 (8/14/20)". Both are priority muscles; upper back sits at its minimum (57% of normal) while the lat isolation takes 4 sets (lats 79%).

OBSERVED (instrumented): after the arms and rear-delt own-set pass the Pull session was full (24); the P-tier repair took a set from the reverse pec deck and one from the preacher curl and gave both to the straight-arm pulldown, because `repair` walks the short muscles in list order (engine.js 613: `for (const m of short)`; lats precede upper_back). The fill itself sorts by need share (`fair`); the repair does not. Demonstrated legal: CS row 4, straight-arm pulldown 2 gives upper back 10, lats 10.

Widespread: wherever lats and upper back share a tier and a full session (men's physique and bodybuilding pull days); visible in men's physique 3d.

Fix: in `repair`, order short muscles by deficit as a share of goal, as `fill(..., { fair: true })` does.

### C4-5 MAJOR. R20 regressed: men's physique's second chest exercise is a flat press, not a fly; R30's chest focus adds a flat press

Plans: Men's physique 4d, 5d, 6d, 4d dumbbells only, 5d machines and cables (all five MP weeks with two chest exercises); MP 5d and 6d focus chest.

Rendered: MP 4d "Incline Machine Press: 3/3/4/4/4/2 ... Machine Chest Press: sets by week 3/3/4/4/4/2" (same in 5d, 6d, machines); MP dumbbells "Incline Dumbbell Press ... Dumbbell Bench Press: sets by week 3/3/4/4/4/2". Probe, MP 5d focus chest: "Back A, Biceps & Chest: ... Dumbbell Bench Press 4 ... Pec Deck (Machine Fly) 2"; MP 6d: "Shoulders A & Chest: Dumbbell Bench Press 4, Pec Deck (Machine Fly) 2".

Rulings: R20 "men's physique leads chest with the incline press, then a fly, a flat press only when more chest sets are needed"; R30 "a men's physique chest focus at 5 days takes an incline press on Back A". With 8 chest sets (incline 4 + fly 4) no flat press is needed.

OBSERVED cause: the minimum pass values a new exercise by the credits it brings (engine.js 432-452, 463-467); a flat press credits triceps, so whenever triceps are short it beats the fly the category order puts first (MP 3d, where triceps were not short, did get the pec deck). The focus session's first chest exercise follows the visit rotation (engine.js 374-378), which starts at the category order's second entry, so its compound is the flat press.

Demonstrated legal: MP 4d with Pec Deck 4 in place of the Machine Chest Press passes every check; front-delt fractional load in Chest & Triceps falls from 4 (J2's threshold) to 2, which matters under 09 s6 (shoulder disorders 36.6%, Siewe 2014).

Fix: for men's physique chest, apply the category order strictly (no credit valuation) and never rotate the lead: every MP chest session leads with an incline press, then a fly.

### C4-6 MAJOR. The 5-set "sole pattern" allowance is given to muscles that have two or three exercises, and both are used side by side

Plans: Men's physique 4d dumbbells only; Men's physique 5d machines and cables, advanced; Wellness 4d dumbbells only; Figure 3d bodyweight.

Rendered: MP dumbbells "Chest-Supported Row (Dumbbell): sets by week 4/4/5/5/5/3" beside "Dumbbell Row: 2/2/2/2/2/1"; "Dumbbell Lateral Raise: 4/4/5/5/5/3" beside "Leaning Lateral Raise: 2/2/2/2/2/1"; Back B the mirror ("Dumbbell Row 4/4/5/5/5/3", "Chest-Supported Row (Dumbbell) 2/2/2/2/2/1", "Leaning Lateral Raise 4/4/5/5/5/3", "Dumbbell Lateral Raise 2/2/2/2/2/1"); "Dumbbell Calf Raise (Standing): 4/4/5/5/5/3" (the kit has a seated dumbbell calf raise). MP machines "Seated Cable Row: 4/4/5/5/5/3" beside "Machine Row (Chest Supported): 2/2/2/2/2/1"; "Cable Lateral Raise: 4/4/5/5/5/3" beside "Machine Lateral Raise: 2/2/3/3/3/2", and the mirror in Legs & Side Delts. Figure bodyweight "Pull-Up: 4/4/5/5/5/3" beside "Chin-Up: 2/2/3/3/3/2"; "Band Pull-Apart 4/4/5/5/5/3" (kit also has band rear fly and prone reverse fly); "Bodyweight Split Squat 4/4/5/5/5/3" (kit has reverse and walking lunges). Wellness dumbbells "Dumbbell Lateral Raise: 4/4/5/5/5/3" twice (kit has seated and leaning laterals).

OBSERVED cause: `solePatternMuscles` counts pattern keys (patterns.js 466-470), so in every kit but full gym, side delts and calves (one key each) always qualify, upper back qualifies wherever there is no barbell row, and the machines-and-cables gym qualifies too. The engine's own R32 counts exercise names (engine.js 276), the right reading. 09 s7: "The +5-set allowance applies only when a muscle has exactly one pattern in that kit, never in a full gym"; 08 F-3 frames it as "only one exercise". Demonstrated legal: MP dumbbells Back A at 4 + 3 rows and 4 + 3 laterals.

Why it is wrong: 5 + 2 of two variants of one movement is the split no coach writes; 4 + 3 does the same work.

Fix: the allowance only for a muscle with exactly one exercise name in the kit (R32's set), never in machines_cables.

### C4-7 MAJOR. Normal volume never uses a free, legal extra session, so priority and standard muscles sit below normal in their one listed session

Plans: Classic physique 5d (the headline), General 5d, Men's physique 5d and 6d, Bikini 4d.

Rendered: Classic 5d "3. Pull ... Lat Pulldown (Wide Grip) 4 ... Cable Straight-Arm Pulldown 3/3/4/4/4/2", weekly "lats 11, own 8 (10/14/20)": a priority muscle (classic: "legs and back are priority", 09 s1.1) trained once a week, held below normal by the 8-direct-set cap, while "5. Shoulders, Arms & Abs" takes abs to normal ("abs 10, own 10"). General 5d "chest 8, own 8 (6/10/14)" while "5. Shoulders & Arms (4 exercises, 12 sets at the peak, about 36 min)". MP 5d/6d "chest 8, own 8 (6/10/14)" with "1. Shoulders A (3 exercises, 10 sets at the peak, about 30 min)". Bikini 4d "hamstrings 8, own 8 (6/10/14); glute_med 8, own 8 (6/10/14)" while maintenance chest, quads, calves and abs all reach normal.

Proof the placements are legal (OBSERVED): the engine itself puts lats in classic 5d's fifth session when lats are a focus ("Classic physique, 5 days, 75 minutes, focus lats and side delts": "5. Shoulders, Arms & Lats ... Lat Pulldown (Neutral Grip) ... Cable Lat Pullover", passes); it puts chest in MP 5d Back A and MP 6d Shoulders A for a chest focus. Demonstrated legal: General 5d + a 2-set Incline Machine Press in Shoulders & Arms (chest 10, session 42 min); Bikini 4d + a 2-set Lying Leg Curl in Lower B (hamstrings 10; asks for 75 min, as Q1 = C requires).

Rulings: R22 opens such a session only for the minimum; R30 only for a focus. The "Kept" ruling on abs and calves light doses argued "the least important work"; this is chest, lats and hamstrings, so it is a new argument.

Fix: after normal volume, a P or S muscle below normal may take R22's extra session (neighbours none of its sessions, same group or half), as R30 allows a focus; abs and calves stay excluded per the Kept ruling. For classic 5d specifically, the R21 answer also works: the fifth session becomes Upper (or "Back, Shoulders & Arms").

### C4-8 MAJOR. R24's "fresh pattern first" blocks a legal second curl, leaving a priority muscle short in a 32-minute session

Plans: Wellness 6d (plain); Wellness 6d focus hamstrings (no-op with a false reason).

Rendered: "4. Hamstrings & Glutes B (3 exercises, 9 sets at the peak, about 32 min) ... Lying Leg Curl: 3/3/4/4/4/2"; weekly "hamstrings 12, own 12 (10/14/20)" (priority, below normal). Focus probe: "wellness 6d hamstrings(P) counted 12 target 18 :: sessions_full", i.e. the plan would say "its sessions are full" about a 9-set session.

OBSERVED cause: a used pattern may repeat only when no other pattern "has an exercise to offer" (engine.js 426-431, `freshMain` via `optionFor`, which checks names, not legality). The hinge is offered, then fails C12 (the neighbouring Quads A holds a back squat), and the seated leg curl (a different movement under R33) is never tried. Demonstrated legal: + Seated Leg Curl 2 in session 4: hamstrings 14, every check passes.

Fix: when every fresh pattern's step fails the checks, try the used pattern's other variant.

### C4-9 MAJOR. A focus can never open its first exercise in its R30 extra session, so figure and women's physique lat focus does nothing

Plans: Figure 4d focus lats; Women's physique 4d focus lats.

OBSERVED: "figure 4d lats(P) counted 10 target 18 :: sessions_full" and own sets unchanged. Back, Delts & Biceps holds lats at the 8-direct cap; Delts, Chest & Triceps neighbours neither back session (R30-eligible) but is at 24 sets. The repair frees one set per donor (engine.js 626), and `noLoss` plus the 24-set cap mean a 2-set opening is never funded. Demonstrated legal: in Delts, Chest & Triceps, Machine Lateral Raise 4 -> 2 and a 2-set Lat Pulldown (Neutral Grip): lats 10 -> 12, side delts 12 -> 10 (its minimum), sense and C5 pass. "Its sessions are full" is therefore not the true reason.

Fix: let room-making take up to two sets (one or two donors) to fund a pick's 2-set opening; report the real limit when it still fails.

### C4-10 MAJOR (needs a ruling). The rear delts' own-set minimum leaves a lat or row compound at 2 sets beside 4-set isolations

Plans: General 4d (Upper A and Upper B), Bodybuilding 5d (Upper), Wellness 4d (Lower B), General 2d (Lower), and the General 4d focus chest variant.

Rendered: General 4d "1. Upper A ... Lat Pulldown (Wide Grip): sets by week 2/2/2/2/2/1" (the lats' only exercise that day) beside "Cable Lateral Raise 3/3/4/4/4/2", "Reverse Pec Deck: 3/3/4/4/4/2"; "3. Upper B ... Chest-Supported Row (Dumbbell): 2/2/2/2/2/1" beside "Dumbbell Lateral Raise 3/3/4/4/4/2". Bodybuilding 5d "5. Upper ... Chest-Supported Row (Dumbbell): 2/2/2/2/2/1" beside "Cable Lateral Raise 3/3/4/4/4/2". Wellness 4d "3. Lower B & Abs ... Machine Hip Thrust: sets by week 2/2/2/2/2/1" (the priority glutes' only direct work that day) beside "Romanian Deadlift (Dumbbell) 3/3/4/4/4/2", "Lying Leg Curl 3/3/4/4/4/2". General 2d "Barbell Hip Thrust: 2/2/2/2/2/1".

OBSERVED cause (General 4d): R27's CREDIT_FED pass gives rear delts 6 own sets (reverse pec deck 4 + face pull 2) before normal volume, and both upper sessions are at 24; the pulldown is never raised. Demonstrated legal: Upper A pulldown 3, reverse pec deck 3 passes every check and sense (rear delts own 5, counted 8.5 against a minimum of 6).

Why it matters: rows credit the rear delts (09 B2), so rear delts are not "living on credit" the way arms are; giving them 6 own sets ahead of the lats' vertical pull is the inversion a coach notices first.

Fix (ruling needed, R27 names rear delts): take rear delts out of CREDIT_FED, or let a session's lead compound reach 3 peak sets before any isolation in the same session passes 3.

### C4-11 MAJOR. Adductors reported untrainable although the library has an adduction exercise for every kit

Plans: Wellness 4d dumbbells only (rendered); every wellness week in dumbbell, home, barbell-and-plates or bodyweight kits (INFERRED from the kit table: adductors untrainable in all four).

Rendered: "adductors 3.5, own 0 (6/10/14)" and "Cannot be trained directly with this equipment: adductors." Wellness adductors are a standard muscle (09 B3: "Glutes, quads, hamstrings, adductors priority" in s1.1), so the week sits below the category minimum.

OBSERVED: the library row "Copenhagen Adduction" (primary adductors, weight_reps) is tagged for full_gym, machines_cables, dumbbells_only, barbell_plates, home_gym and bodyweight; "Band Standing Hip Adduction" for bodyweight. `patterns.js` maps adduction only from the catalogue's machine role; SUPPLEMENTS has no adduction entry, while R16 supplied the clamshell for glute med the same way.

Fix: add Copenhagen Adduction (short-lever first, a coaching caveat) and Band Standing Hip Adduction to SUPPLEMENTS.adduction.

### C4-12 MAJOR. R8's "the plan says which muscle sits below normal and why" is not on the page

Plans: every plan with a muscle below normal volume (28 of the 32 built base weeks have at least one, OBSERVED from the engine report).

Rendered: Bodybuilding 4d "chest 10, own 10 (10/14/20); lats 10.5 ...; upper_back 10.5 ...; side_delts 10, own 10 (10/14/20)": four priority muscles at the minimum with no reason. MP 4d/5d/6d "chest 8, own 8 (6/10/14)" with no reason.

OBSERVED: the engine's report carries `belowTypical` (muscle, sets, target) but no reason, and the render prints neither (render-structure-plans.jest.js). R8: "Where they bind, the plan says which muscle sits below its normal volume and why." The founder signs off this page.

Fix: one line per below-normal muscle naming the binding limit (the session's 24 sets, the 8-set per-session cap, one listed session, the kit), computed in the engine report.

### C4-13 MAJOR (rulebook question). An "Arms" session with three sets per arm

Plans: General 5d; Classic physique 5d (60 min) has the same arm sets.

Rendered: General 5d "5. Shoulders & Arms (4 exercises, 12 sets at the peak, about 36 min) ... EZ Bar Preacher Curl: sets by week 2/2/3/3/3/2 ... Cable Overhead Tricep Extension: sets by week 2/2/3/3/3/2"; weekly "biceps 12, own 6 (6/10/14); triceps 10, own 6 (6/10/14)". Classic 5d "5. Shoulders, Arms & Abs ... EZ Bar Preacher Curl: 2/2/3/3/3/2 ... Cable Overhead Tricep Extension: 2/2/3/3/3/2".

Why: a session the person sees named for arms trains each arm with one 3-set exercise, 24 minutes inside the chosen length. Normal volume counts row and press credit (counted 12 >= 10), so the engine stops. Demonstrated legal: preacher 4 and extension 4 (biceps counted 13 against a maximum of 14).

Fix (ruling needed, touches R27 and R34): a session named for a muscle gives it at least 4 own sets where the weekly maximum allows; or credit-fed muscles' normal volume is read on own sets in a session named for them.

---

## MINOR

### C4-14 MINOR. A minimum of 5 met as 4 + 2 = 6, the spare set taken from other muscles

Rendered: MP 3d Push "Cable Crunch 3/3/4/4/4/2 ... Hanging Knee Raise 2/2/2/2/2/1" (abs 6, minimum 5) while chest sits at "5, own 5 (5/10/14)"; Figure 3d Pull "EZ Bar Preacher Curl 3/3/4/4/4/2 ... Hammer Curl 2/2/2/2/2/1" (biceps own 6, own minimum 5) beside one 4-set row ("upper_back 6, own 4"); General 3d Push chest, side delts, abs and triceps each at 6 against a minimum of 5. OBSERVED cause: the fill raises the existing exercise before opening another (inc before open on a tie), so the last set of a minimum opens a 2-set exercise. Fix: when a 2-set opening covers a 1-set deficit, drop the first exercise by one (3 + 2).

### C4-15 MINOR. R44 leaves two 2-set lateral raises in one session

Rendered: Figure 4d and Women's physique 4d (and its glute-focus variant) "1. Back, Delts & Biceps ... Dumbbell Lateral Raise: sets by week 2/2/2/2/2/1 ... Machine Lateral Raise: sets by week 2/2/2/2/2/1". OBSERVED: R44 moved two dumbbell-lateral sets to a new hammer curl. Fix: after the moves, merge a muscle's 2 + 2 into one 4-set exercise, freeing a slot.

### C4-16 MINOR. A token second hinge each week

Rendered "Romanian Deadlift (Dumbbell): sets by week 2/2/2/2/2/1" beside "Lying Leg Curl: 3/3/4/4/4/2" after a 4-set barbell RDL earlier in the week: General 4d, 5d, 6d; Classic 4d, 5d; Figure 4d; Women's physique 4d, 5d, 6d; Bikini 5d and 6d (Lower A). Adds a second lumbar-loading session (R26) for 2 sets, putting J6 at its limit; a seated leg curl (R33: a different movement, the lengthened position) does the job without spinal load. Fix: where the week already has a hinge and the session has a curl, prefer the other curl variant to a second hinge.

### C4-17 MINOR. Focus messages that are not the true reason and never name the remedy

Rendered: "Wellness, 5 days, beginner, focus quads ... Focus not fully reached: quads 12 of 14 (its sessions are full ...)" while "4. Quads & Glutes (4 exercises, 10 sets at the peak, about 39 min)": the real limits are the 8-set quad cap there and the beginner exercise cap in session 1. MP 4d: "Focus not fully reached: chest 8 of 14 (it has 1 session a week ...)" with no mention that 5 days reaches it (OBSERVED: MP 5d focus chest 8 -> 14). Fix: per-session reasons, and "reachable at N days" where a build shows it.

### C4-18 MINOR. The weekly figure shown passes the shown maximum, against the line's own header

Rendered: MP 4d/5d/6d "biceps 15, own 6 (6/10/14)"; Bodybuilding 5d/6d "biceps 15, own 6 (6/10/14)"; Bikini 4d/5d/6d "biceps 9, own 2 (4/6/8)"; BB 6d advanced "biceps 16, own 6 (6/12/14)"; header: "Credit counts towards the maximum only up to the maximum less the minimum (R34)". The Kept ruling says "the render now shows the figure R34 counts"; OBSERVED it prints the uncapped `weeklyLoad` fractional (R34's figure for MP biceps is 14). Not re-raising R34; fix the display.

### C4-19 MINOR. Focus order puts the hip thrust ahead of the back squat

Rendered: Women's physique 4d focus glutes "Barbell Hip Thrust 3/3/4/4/4/2, Barbell Back Squat 3/3/4/4/4/2, Romanian Deadlift (Barbell) ..."; the wellness 4d glute focus probe the same. 09 s7 allows focus first within a tier, but a spinal-loaded squat after four heavy hip-thrust sets is the riskier order (F6; lumbar 39.4%, Siewe 2014). Fix: focus first never moves a non-spinal lift ahead of a spinal-axial one.

### C4-20 MINOR. Bodyweight compounds at 8-12 reps

Rendered: Figure 3d bodyweight "Push-Up: ... 8-12 reps", "Bodyweight Split Squat: sets by week 4/4/5/5/5/3, 8-12 reps", "Pull-Up: 4/4/5/5/5/3, 8-12 reps". Unloaded push-ups and split squats at 8-12 sit far from the block's RIR 3 to 1 for an intermediate; 8-12 pull-ups are beyond many. Fix: in the bodyweight kit prescribe reps by RIR (a wider range, or tempo or single-leg progressions).

### C4-21 MINOR. Thin sessions in six-day weeks while muscles sit below normal

Rendered: MP 6d "1. Shoulders A (3 exercises, 10 sets at the peak, about 30 min)", "5. Back B & Biceps (3 exercises, 11 sets ..., about 41 min)" with chest 8/10 and abs 8/10; Bikini 6d "6. Glute Med, Abs & Calves (3 exercises, 10 sets ..., about 30 min)" (the sixth day adds 2 glute-med sets over 5 days); Wellness 6d session 4 at 32 min. Mostly resolved by C4-7 and C4-8.

### C4-22 MINOR. Near-copy lower days in the dumbbell wellness week

Rendered: Wellness 4d dumbbells "Lower A": Goblet Squat, Walking Lunge, Romanian Deadlift (Dumbbell), Dumbbell Hip Thrust, Slider Leg Curl, Clamshell ...; "Lower B": Walking Lunge, Goblet Squat, Romanian Deadlift (Dumbbell), Dumbbell Glute Bridge, Slider Leg Curl, Clamshell ...: five of eight exercises repeated. OBSERVED: the kit also offers Bulgarian Split Squat, Stiff-Leg Deadlift (Dumbbell) and Single-Leg Romanian Deadlift (DB), all unused. The two hinges are rulebook supplements, which R41's order (engine.js optionFor: source group before freshness) ranks after the catalogue's dumbbell RDL even when it is already in the week; Bulgarian Split Squat's source was not checked. 09 s7 asks for a different role on each visit. Fix: within R41's order, a name not yet in the week beats one already used when both are staples or both are stand-ins.

---

## Outside the coaching remit (engineering, OBSERVED, reported because it can crash every build)

`engine.js`: `actionsFor` reads `growth` (line 362, `growth && beginner`), and the P0 pass calls it (lines 669 and 675-685) before `let growth = false;` executes (line 698). Under spec JavaScript this is a temporal-dead-zone ReferenceError: an untranspiled copy of the engine (only the ES-module syntax converted) threw "Cannot access 'growth' before initialization" on the first build. The tests pass, so the project's Babel preset or runtime evidently masks it today (INFERRED: let compiled to var, or a runtime without TDZ checks). Fix: declare `let growth = false;` above `actionsFor`.

---

## Verified clean (checked, found right)

- Recovery: every adjacent pair, including last-to-first, with every next session the next day: no muscle trained in both unless a FAST muscle's earlier dose is light; men's physique 3d and figure 3d side-delt light doses sit in the session before Push and are marked "kept 2 reps short of failure all block" (R11, R35, R1); no light dose where the next session cannot hold the muscle (R42: figure bodyweight band lateral unmarked).
- Joints: no overhead press anywhere on the page (J1, none in men's physique); spinal-axial lifts never in neighbouring sessions and at most two per session (J5, J6, with R26's dumbbell RDL tag); knee compounds never 4+ sets in both of a pair (J8); elbow and overhead-extension caps; rear-delt health sets every week (J4).
- Session limits: no session over 8 exercises or 24 sets; no exercise above 4 sets in a full gym; per-muscle 8 direct and 11 fractional caps; exercises per muscle within limits.
- Category minimums: met in every built plan except kit-limited muscles that are reported (figure bodyweight side delts "5 of 8") and the adductors reported untrainable (C4-11); the templates and F4 (men's physique legs once at every day count) hold.
- One movement once per session (S8, R24, R33): no two pulldowns, two hinges, twin calf machines or two crunch variants of one kind in a session; abs last everywhere (S9); a fly after its press.
- Order: heavy compounds first, leg press and hack squat ranked heavy (R37); isolation work of the session's own half first.
- Rest: isolation trimmed first, then machines, moderate, heavy (R43); leg press and hack squat rest heavy (R29); upper-body machine presses and rows rest moderate (R37); no rest below its floor.
- Week ladder: week 1 = max(2, round(0.7 x peak)), at most +1 a week, peak week 5, deload 50% (09 s8).
- Staples before stand-ins in a full gym (R41: seated leg curl, not TRX; straight-arm dumbbell pullover only in kits without a cable); hanging raises only where there is a bar (R31).
- Push at most pull (S3) and hamstrings at least half of quads (S4) in every plan; hamstrings get a hinge and a curl across the week (S11).
- Session names match contents (R31, R38), including length-moved calves and abs.
- Length line: every plan over 65 minutes asks, none at 65 or under; "or more days" never offered at 6 days (R28).
- Focus variants: what gave way is named and is never below a minimum, a floor or a higher tier (C5, R46); the bikini 4d and women's physique 4d glute focuses visibly add 4; the men's physique 4d side-delt "16 of 18" and classic 5d "16 of 18" messages are true (each side-delt session at its 8-set cap). The classic 5d 75-minute focus's abs at 6 is the plain 75-minute week's figure, not an unreported take.
- R40: same week at every start (gate). Every probe rebuilt the rendered plans exactly (same exercises and sets).

## Questions for the lead (rulings the fixes touch)

1. C4-10: should rear delts leave R27's credit-fed list (rows credit them), so a lat or row compound is never left at 2 sets to protect 6 own rear-delt sets?
2. C4-13: should a session named for arms give each arm at least 4 own sets where the maximum allows, or should credit-fed muscles' normal volume be read on own sets?
3. C4-7: may a priority or standard muscle (not abs or calves, per the Kept ruling) take R22's extra non-neighbouring session to reach normal volume, as R30 lets a focus do; or, for classic 5d only, a fifth Upper session as R21 gave bodybuilding?
