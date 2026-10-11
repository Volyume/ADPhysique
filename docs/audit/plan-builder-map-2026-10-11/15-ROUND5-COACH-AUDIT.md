# Round 5 adversarial coach audit: structure engine plans (2026-10-11)

Branch `planner/structure-engine-rulebook`, HEAD 566e4f8. Audited: every plan in `docs/audit/plan-builder-map-2026-10-11/12-STRUCTURE-PLANS-RENDERED.md` (8 categories x 2-6 days, intermediate, full gym, 60 min, plus the 13 variants). The authorities were 09 (as corrected by 10), F1-F6 (08 Part 2), D222 R1-R53 with every "Kept" item, and `13-ROUND4-COACH-AUDIT.md`.

Method (all OBSERVED unless labelled INFERRED):
- (a) I read every rendered plan line by line.
- (b) An in-memory instrumented copy of `engine.js` (file untouched) snapshotted the week after each pass: minimums, R27 own sets, normal volume, R51, push/pull, S5, R44, R49, order, R48, R28 and focus. Each rendered week was cross-checked byte-equal to the real engine.
- (c) Scans over 416 full-gym builds (3 experiences x 30/45/60/75/90 min) and 510 builds in the other five kits. They covered names against contents, order, 2-set lead compounds, below-normal reasons (by trying +1 set on each exercise of the muscle) and leg days without a compound. A pass-by-pass sweep across 6 kits x 3 experiences listed every set that R44, R48, R49 and R28 moved.
- (d) The same week at every length, and every "A N-minute session fits" and "or D days" claim, rebuilt at N and at D.
- (e) All 409 single focus picks (full gym) against their plain weeks.
- (f) Hand-edited copies of built plans re-run through the real `checkPlan`, `senseCheck` and (for focus) `checkFocusAgainstBaseline`, with reported minutes recomputed. "Demonstrated legal" below means the edit passed all three.

The round-4 rendered page (commit ab552dd) was diffed against the current one to find regressions. The scratch files `tools/scratch-coach5-*.jest.js` are deleted.

---

## BLOCKER

### C5-1 BLOCKER. Beginner leg days with no lower-body compound: leg extension, leg curl and calf raise only

Plans (engine output, not on the rendered page):
- Men's physique beginner 2, 4 and 5 days, full gym and machines_cables. This is the week's only leg session (F4).
- Bikini beginner 3, 5 and 6 days, full gym and machines_cables. Bikini 2d and 4d beginner have only a glute bridge or hip thrust; their only quad work is the leg extension.

OBSERVED, with exact sessions:
- MP 5d beginner, full gym, 60: "Legs & Side Delts: Leg Extension 3, Seated Leg Curl 3, Standing Calf Raise (Machine) 3, Cable Lateral Raise 3, Machine Lateral Raise 3"
- MP 2d beginner: "Legs & Abs: Leg Extension 3, Seated Leg Curl 3, Standing Calf Raise (Machine) 3, Cable Crunch 3, Hanging Knee Raise 3"
- MP 4d beginner: "Legs & Abs: Leg Extension 3, Seated Leg Curl 3, Standing Calf Raise (Machine) 3, Cable Crunch 3, Hanging Leg Raise 2"
- Bikini 5d beginner: "Lower B & Abs: Abduction Machine 4, Cable Hip Abduction 3, Leg Extension 3, Standing Calf Raise (Machine) 3, Cable Crunch 3"
- Bikini 3d beginner: "Quads, Side Glutes, Abs & Calves: Abduction Machine 4, Cable Hip Abduction 3, Leg Extension 3, Standing Calf Raise (Machine) 3, Cable Crunch 3"

Why it is wrong:
- A beginner's one leg day of the week has no squat, leg press or hinge. A coach rejects it outright. Beginners need to learn and load a knee-dominant compound.
- 09 B11 puts a squat_machine first on every men's physique leg day ("S2: squat_machine 3/4, hinge 2/3, ...").
- The plan also reports "quads 3 of 4 ... the most exercises one session may hold" while two of the five slots are lateral raises.

Mechanism (OBSERVED, engine.js 451-452): for beginners, `pool = [...rotated].sort((a, b) => easiest(a) - easiest(b))` sorts patterns by the least fatiguing kind available. An isolation (fatigue 0) sorts before a machine compound (1). Quads in MP and bikini are tier M, so R27's lead-compound rule (P/S only) never applies, and leg_ext opens first.

The round-4 ruling (U4-10, R53 smaller rulings) reads "beginners take the machine or dumbbell version first", meaning a machine over a barbell. The code turned it into "isolation before compound".

Demonstrated legal: MP 5d, MP 4d and bikini 5d beginner, with Leg Extension 3 replaced by Hack Squat Machine 3. Each passes every check with the same quad sets.

Fix:
- Apply the beginner's low-fatigue preference to names within a pattern only. That already happens in `optionFor` via `lowFatigue`. Keep the pattern order.
- Add a sense check: a session named Legs or Lower, or whose core includes quads, holds at least one lower-body compound where the kit has one.

---

## MAJOR

### C5-2 MAJOR (regression from R49). R49 takes its set from the wrong muscle and never uses free room

Plans (rendered): Men's physique 6d; Figure 5d; Women's physique 5d; General 4d (and its focus-chest variant); Bikini 2d; Wellness 4d; Classic 5d (hidden later by an R48 refill).

Sweep (OBSERVED): 92 R49 transfers across all kits and experiences, many of the same kinds.

Rendered lines:
- MP 6d: "1. Shoulders A & Chest (4 exercises, 13 sets at the peak, about 40 min) - Incline Dumbbell Press: sets by week 2/2/3/3/3/2 ... - Dumbbell Lateral Raise: sets by week 2/2/3/3/3/2". Report line: "Below normal volume (...: the recovery and joint rules for the rest): side delts 13 of 14". Weekly line: "chest 11, own 11 (6/10/14)".
- Figure 5d and WP 5d: "5. Back, Side Delts, Biceps & Chest ... Incline Barbell Bench Press: sets by week 2/2/3/3/3/2 ... Cable Lateral Raise: sets by week 2/2/3/3/3/2". Report line: "side delts 13 of 14" (same reason). Weekly line: "chest 11".
- General 4d: "Cable Lateral Raise: sets by week 2/2/3/3/3/2" (Upper A) and "Dumbbell Lateral Raise: sets by week 2/2/3/3/3/2" (Upper B). Weekly line: "side_delts 6, own 6 (6/10/14); lats 10.5 ...; upper_back 10.5". Round 4 had side delts 8.
- Bikini 2d: "Hack Squat Machine: 2/2/3/3/3/2", "Glute Kickback Machine: 2/2/3/3/3/2", "Incline Machine Press: 2/2/3/3/3/2", "Reverse Pec Deck: 2/2/3/3/3/2". Round 4 had kickback 4, hack 2, RPD 4, incline 2.
- Wellness 4d: "Machine Hip Thrust: 2/2/3/3/3/2", "Seated Leg Curl: 2/2/3/3/3/2". Weekly line: "hamstrings 11 ... (10/14/20); glute_max 14.5 ... (10/14/20)".

OBSERVED transfers (instrumented pass 6):
- MP 6d, Figure 5d, WP 5d: side delts (P) 14 -> 13 (below normal); chest (S) 10 -> 11 (above normal).
- General 4d: side delts (S) 8 -> 6 (its minimum); lats and upper back 9.5 -> 10.5 (above normal).
- Bikini 2d: glute max (P, bikini's first priority) to quads (M); rear delts (S) to chest (M).
- Wellness 4d: hamstrings (P, 12/14) to glute max (P, already 14/14).
- Elsewhere in the sweep, with M-tier compounds as recipients:
  - Bikini 4d-6d advanced, DB and home: side delts (S) to chest (M).
  - Wellness barbell: side delts to chest (M).
  - Classic and BB 3d beginner: hamstrings (P) to glute max (S).

Mechanism (OBSERVED, engine.js 1003-1030):
- `loneLeadCompound` reads `LEAD_MUSCLES` without the tier, so bikini and wellness M-tier chest and quads qualify. R27 defines lead muscles as P or S.
- Donors are sorted by lowest tier first, then the higher peak, then the later position. Nothing stops a higher-tier donor, or a donor that drops below normal while the recipient rises above it.
- In General 4d the reverse pec deck (rear delts own 6, counted 9.5) was an eligible donor: own floor 3, not named in "Upper A". It lost to the laterals only on position. The ruling's own words were "the arms' and rear delts' own minimum (R27) gives way to it".
- In MP 6d, R51 had just raised the reverse pec deck to 4 (rear delts 13/10, above normal). R49's "named dose" guard then shielded it and took from side delts at 7 in that session.
- R49 never adds a set from free room. Shoulders A had 11 free sets.
- Nothing refills after R49.

Why it is wrong:
- R36: P before S before M.
- R44 moves only to a higher tier.
- Figure, women's physique and men's physique are judged on the side delts (09 s1.1, B3).
- Bikini wants glutes, not quad density.
- The R8 line blames "the recovery and joint rules", which do not bind (see C5-9).

Demonstrated legal:
- MP 6d, DB lateral back to 4: side delts 14, chest 11. Alternatively also chest-day incline 4->3: side 14, chest 10.
- Figure 5d, machine lateral 3->4: side 14. Or cable lateral 4 with incline back to 2: side 14, chest 10.
- WP 5d, the same.
- General 4d, Upper A cable lateral 4 and RPD 3, plus Upper B DB lateral 4 and incline barbell 3: side delts 8, rear delts 8.5 (own 5), chest 9, lats and upper back 10.5. Upper A alone also passes.
- Bikini 2d, round-4 split restored: glute max 11, rear delts 6.

Fix:
- R49 applies only to P/S lead muscles.
- It uses free room in the session first (the lead muscle stays at or under its maximum).
- A donor is never of a higher tier than the lead muscle, never a muscle that would drop below normal while the lead muscle ends at or above normal, and the neediest gives last.
- Prefer the credit-fed muscle's sets above its own floor, as the ruling says.
- Otherwise move one of the lead muscle's own sets from its other session, so the week's total holds.
- Re-run R49 and R51 after R48's refill (see C5-8).

### C5-3 MAJOR (regression from R48). A session is named for abs it does not train

Plans: Bikini 3d at every length, intermediate and advanced (8 of 416 full-gym builds; OBSERVED by scan).

Rendered: "3. Quads, Side Glutes, Abs & Calves (6 exercises, 20 sets at the peak, about 58 min)". The exercises are Hack Squat Machine, Leg Extension, Abduction Machine, Cable Hip Abduction, Standing Calf Raise (Machine) and Seated Calf Raise. There is no abs exercise. The abs sit in "1. Glutes, Hamstrings & Abs" (Cable Crunch 4, Hanging Knee Raise 2).

Mechanism (OBSERVED): R48 moved the crunch and knee raise from session 3 to session 1, after which session 3 had 4 sets unused. `sessionName` (engine.js 132-137, 1449-1452) adds names but never removes a template word. The template's name is "Quads, Side Glutes & Abs". In round 4 session 3 held the crunch. S7 checks only `core`, and abs are not core there (bikini abs are M).

Why it is wrong: R31 says names say what a session holds. A person opening day 3 for abs finds none: the founder's "this doesn't make sense" case.

Fix:
- Build each session's name from what it holds: drop a template muscle word the session no longer trains.
- Add a sense check that every muscle word in a name has at least 2 direct sets in that session.
- The same latent risk applies to every template name carrying a floater ("Legs & Abs", "Shoulders B & Abs", "Legs & Calves", "Delts & Abs", "Side Glutes, Abs & Calves") whenever R28 or R48 moves abs or calves out.

### C5-4 MAJOR (regression). A side-delt focus adds nothing while a chest top-up above normal sits in its session

Plan: "Classic physique, 5 days, 75 minutes, focus lats and side delts".

Rendered:
- "Focus on side delts: 14 to 14 sets a week, short of 18: its sessions are at their limits: the most side delts work one session may hold; a full session of 24 sets."
- Session 5 opens with "Incline Barbell Bench Press: sets by week 2/2/3/3/3/2, 6-10 reps, rest 180 s".
- Weekly line: "chest 11, own 11 (6/10/14)".
- Round 4 rendered side delts at 16 for the same variant.

OBSERVED: the session-5 incline press is the R50 chest top-up, raised to 3 by R49 (chest 11, above normal). R46's room-making takes one set per donor (engine.js 677). The lone-compound floor of 3 (R49) means chest can never give a single set, and a whole exercise is never removed. So a P focus loses to an S muscle above normal in the very session.

Demonstrated legal (with C5 against the plain 75-min week): session 5 drops the incline press, DB lateral goes to 4, cable lateral to 4 and straight-arm to 4. Side delts 14 -> 16, lats 18 -> 19 (the target), chest 8 (minimum 6).

Fix:
- R46's room-making may remove a whole R50 or R22 top-up exercise from the pick's session when that muscle keeps its minimum and the pick takes every set.
- R49's floor applies only to the session's own lead muscles, never to a top-up placed for normal volume.

### C5-5 MAJOR. A men's physique abs focus does nothing at 5 and 6 days, though 4 days reaches the full +4

Plans: Men's physique 5d and 6d, focus abs (all 409-pick matrix, OBSERVED). The plain weeks hold abs 8 of 10.

OBSERVED:
- "mens_physique 5d focus abs(S): 8 -> 8 target 14 session_cap" with no day count that reaches it. 6d is the same.
- MP 4d focus abs: 10 -> 14, reached.
- Rendered plain MP 5d and 6d: "Below normal volume (...: the most of that muscle one session may hold): abs 8 of 10."
- Mechanism: abs live in one session at 5 and 6 days (Delts & Abs, Shoulders B & Abs). R30/R47 overflow excludes the trunk: `overflowFallback` returns [] for trunk, and `sameHalf` filters it out (engine.js 790, 1339).

Why it is wrong:
- More training days give less abs focus than fewer.
- Men's physique judges the waist (09 s1.1: "Width, upper chest, arms and waist").
- R46's own premise: "A focus that changes nothing is a plan that does not make sense to the person who chose it."
- New argument against the round-2 Kept ruling: abs there were "the least important work". A focus pick says the person ranks them, and in men's physique they are S, not maintenance.

Demonstrated legal: MP 6d with Hanging Leg Raise 4 added to Back A (non-neighbouring), and MP 5d with it added to Back B. Abs 8 -> 12. Every rulebook check, sense check and C5 passes; the only flag was S12, because the edit did not write the "12 of 14" report.

Fix: for a focus pick, abs (and calves) may take one more session that neighbours none of their own, as R30/R47 allow other muscles.

### C5-6 MAJOR (ruling question; new argument on R27/R44). The credit-fed own minimum takes a priority muscle's normal volume

Plans:
- Figure 4d and Women's physique 4d (rendered), and in the full gym, machines, dumbbells and home kits, intermediate and advanced.
- Beginners in classic, figure and women's physique 6d (side delts and chest to triceps).
- Bodybuilding 4d dumbbells and home (side delts to triceps or rear delts).
- Bodybuilding 5d beginner, dumbbells and home (upper back P to biceps).
- Men's physique 5d and 6d beginner (abs to rear delts).

Rendered (Figure 4d and WP 4d): "1. Back, Delts & Biceps ... Dumbbell Lateral Raise: sets by week 3/3/4/4/4/2 ... EZ Bar Preacher Curl: 3/3/4/4/4/2 ... Hammer Curl: 2/2/2/2/2/1". Report line: "Below normal volume (...: a full session of 24 sets; the most of that muscle one session may hold): side delts 12 of 14". Weekly line: "biceps 10, own 6 (6/10/14)".

OBSERVED (instrumented pass 5): R44 moved 2 sets from side delts (P, at normal 14) to a new hammer curl for the biceps' own minimum (own 4 -> 6). Biceps counted were already 8, over their minimum 6. Across 6 kits and 3 experiences the sweep shows 48 R44 moves into an arm's or rear delt's own sets; 35 of them take from a P muscle.

Why it is wrong:
- Figure and women's physique are judged on the V-taper (09 s1.1: "side delts and lats priority").
- The plan gives the signature muscle less so curls reach 6 own sets on top of 4 sets of rows' credit.
- R44's credit-fed clause ignores tier.
- This is not C4-10's argument (a compound at 2 sets). Here the cost lands on a P muscle's normal volume.

Demonstrated legal: Figure 4d and WP 4d with the hammer curl removed and DB lateral 4 + machine lateral 2: side delts 14, biceps 8 (own 4, floor 3).

Question for the lead: should R27's own minimum for arms and rear delts, and R44's move to it, give way to a P muscle's normal volume? The same question applies when the credit-fed muscle's counted volume is already at or above its minimum.

### C5-7 MAJOR. Classic physique 4 days rows 3 sets a week

Plan: Classic physique 4d (rendered).

Rendered: Upper A has "Cable Straight-Arm Pulldown: sets by week 2/2/2/2/2/1" and no row. The week's only row is Upper B "Seated Cable Row: sets by week 2/2/3/3/3/2". Weekly line: "upper_back 7, own 3 (6/10/14)", beside "Reverse Pec Deck 3/3/4/4/4/2" and "Face Pull 2/2/2/2/2/1" (rear delts own 6).

OBSERVED: the normal-volume fill chose the straight-arm pulldown, which closes 2 sets of the lats' shortfall where a row closes 1 lat set plus 2 upper-back sets.

Why it is wrong:
- Classic: "legs and back are priority" (09 s1.1).
- Three sets of rows a week sit at the S10 floor exactly.
- The rear delts get twice the upper back's direct work.

Demonstrated legal: Upper A straight-arm pulldown 2 replaced by Chest-Supported Row (Dumbbell) 2. Upper back 7 -> 9 (own 5), lats 11.5 -> 10.5 (still at or above the P minimum 10), rear delts 8.5, all checks pass.

Fix: in a session that lists both lats and upper back, open a row before a second lat isolation while upper back is below normal.

### C5-8 MAJOR. Top-up compounds are 2-set tokens or heavy openers in sessions named for other muscles; R49's "structural" claim is false

Plans (rendered): General 5d; Men's physique 5d; Figure 5d; Women's physique 5d; Classic physique 5d; Bodybuilding 6d (Legs B).

Engine scan of 2-set P/S lead compounds in sessions with free room (OBSERVED): 91 instances, among them:
- General 5d advanced, session 5 "Shoulders, Arms, Chest, Lats & Back": Lat Pulldown 2 and Machine Row 2. Lats are then at their maximum, 14.
- Men's physique 6d barbell: "Incline Barbell Bench Press 2" in an 11-set session.
- Figure 5d and WP 5d barbell: a 2-set incline barbell in a 15-set session.
- Classic 5d barbell.

Rendered:
- General 5d: "5. Shoulders, Arms & Chest (5 exercises, 16 sets at the peak, about 47 min) - Incline Barbell Bench Press: sets by week 2/2/2/2/2/1, 6-10 reps, rest 180 s" (the opener).
- MP 5d: "1. Back A, Biceps & Chest (6 exercises, 17 sets ...) ... Seated Cable Row ... Incline Dumbbell Press: sets by week 2/2/2/2/2/1 ... Machine Row (Chest Supported)". The press sits between two rows.
- Figure 5d and WP 5d: "Incline Barbell Bench Press: sets by week 2/2/3/3/3/2" opens "Back, Side Delts, Biceps & Chest" ahead of the priority lat pulldown.
- Bodybuilding 6d: "6. Legs B ... Machine Hip Thrust: sets by week 2/2/2/2/2/1" beside "Lying Leg Curl 4, Seated Leg Curl 4, Abduction Machine 4", with 3 free sets.

OBSERVED mechanisms:
- R50 opens the minimum 2-set exercise and stops at normal volume.
- The name rotates by visit, so a non-maintenance chest's third chest exercise becomes the heavy barbell incline.
- R49 never adds from free room.
- BB 6d's hip thrust was opened by R48's refill (pass 8), after R49 and R51 had already run.

Why it is wrong:
- These are the C4-3 tokens again: a 2-set heavy lift as a session opener is something a coach deletes or fixes.
- The R49 register text says the remaining 2-set compounds are "structural, not a choice". Where the session has free sets, they are a choice.

Demonstrated legal:
- MP 5d: Back A incline DB 3 with the chest-day incline 4 -> 3. Chest stays 10.
- General 5d: session-5 incline barbell 2 -> Incline Machine Press 3, with the Push incline DB 4 -> 3. Chest stays 10, session 50 min.

Fix:
- An R50/R22 top-up takes the least fatiguing name (R19's rule) and at least 3 sets, moving a set from the muscle's main session where needed.
- In order, it follows the session's named muscles' compounds of the same tier.
- Re-run R49 and R51 after R48's refill.

### C5-9 MAJOR. The "Below normal volume" reasons are false where nothing about recovery or joints binds (R8)

Plans (rendered): Men's physique 6d, Figure 5d and Women's physique 5d (side delts); Men's physique 5d (calves); Classic physique 5d (abs); Wellness 5d (hamstrings); Men's physique 4d dumbbells (calves); Figure 3d bodyweight (upper back, rear delts).

The kits scan found 18 more with a legal +1 left, among them: bikini 4d, 5d and 6d in bodyweight and barbell kits ("side delts 9 of 10", the plate or band lateral could take its 5th set); MP 6d and figure 5d in DB and home kits; MP 5d beginner "abs 5 of 7 ... the most exercises one session may hold", where the crunch 2 -> 3 is legal (demonstrated).

Rendered:
- "side delts 13 of 14" (MP 6d, figure 5d, WP 5d)
- "calves 4 of 6" (MP 5d)
- "calves 5 of 6" (MP 4d dumbbells)
- "abs 7 of 10 (a full session of 24 sets; the recovery and joint rules for the rest)" (classic 5d)
- "hamstrings 12 of 14 (the most of that muscle one session may hold; the recovery and joint rules for the rest)" (wellness 5d)

OBSERVED: `limitsOf` (engine.js 1394-1399) returns 'rules' for any session below 24 sets, the exercise cap and the per-muscle cap. The render prints that as "the recovery and joint rules". The real binders:
- Side delts: R49 took the set, and a +1 is legal.
- MP 5d calves: the leg session holds 23 sets, so a 2-set opening does not fit, and R50 bars calves from another session.
- Classic 5d abs: Push holds 23 sets with the crunch at 4.
- Wellness 5d hamstrings: 09 B7's "hinge" hint in session 3, plus one hinge a session.
- Figure bodyweight: the per-session fractional cap. A band row breaks C3: biceps 12 against 11.

Wellness 5d is more than a wording fault. Demonstrated legal: + Seated Leg Curl 2 in session 3 (22 -> 24 sets) brings hamstrings (P) 12 -> 14.

Fix:
- Record the step that failed and its check code.
- Name the real binder: "no room for a second exercise", "the exercise is at 4 sets", "the template trains a hinge here", "abs and calves stay in their sessions", or the check that failed.
- Fill any legal +1 left after the late passes.
- Wellness 5d needs a ruling (question 4).

### C5-10 MAJOR. A chest press between the hack squat and the Romanian deadlift on a leg day

Plan: "Men's physique, 4 days, focus side delts and chest" (rendered).

Rendered: "2. Legs, Chest & Abs ... Hack Squat Machine ... Incline Dumbbell Press: 3/3/4/4/4/2 ... Romanian Deadlift (Dumbbell) ... Leg Extension ... Seated Leg Curl ... Cable Crossover (High to Low) ..."

OBSERVED (engine.js 1054-1065): order is kind rank, then the "away" rule (isolations only), then tier (chest S before hamstrings M), and only then spine first. So the R47 chest compound lands between two leg compounds, and ahead of a lumbar-tagged (R26) DB RDL.

Why it is wrong:
- A coach finishes the leg compounds (and the spinal hinge) before switching body halves.
- R53's ruling reads "a lift loading the spine comes before one that does not, whatever the focus".

Demonstrated legal: order Hack Squat, DB RDL, Incline DB Press, Leg Extension, Seated Leg Curl, Crossover, abs. Passes C17 and every check.

Fix:
- Extend R24's "own half first" to compounds: an overflow or focus compound of the other half comes after the session's home compounds of the same rank.
- Apply spine-first before tier within a rank (see C5-11).

### C5-11 MAJOR (unfixed round-4 C4-5). Men's physique dumbbell chest is still two presses and no fly

Plan: "Men's physique, 4 days, dumbbells only" (rendered). The round-4 C4-5 plan list named it.

Rendered: "4. Chest, Triceps & Abs ... Incline Dumbbell Press: 3/3/4/4/4/2 ... Dumbbell Bench Press: sets by week 3/3/4/4/4/2".

OBSERVED: the dumbbell and home kits offer no fly pattern. The structure catalogue lists only "Pec Deck" and "Cable Crossover", and SUPPLEMENTS has no fly. The library holds "Dumbbell Fly" and "Incline Dumbbell Fly" (src/lib/exerciseCorpus/families/dumbbell.js 312, 851). R20 restored the strict incline, fly, flat order, but the kit skips the fly.

Why it is wrong:
- This is C4-5's case.
- R20 ("a flat press only when more chest sets are needed").
- Front-delt load (09 s6, shoulder 36.6%).

Demonstrated legal: Dumbbell Bench Press 4 replaced by Dumbbell Fly 4. Chest 8, front-delt fractional 4 -> 2, triceps 10 -> 8 (minimum 6), all checks pass.

Fix: add Dumbbell Fly (then Incline Dumbbell Fly) to SUPPLEMENTS.fly for kits without a machine or cable fly.

### C5-12 MAJOR (re-raise of Kept C4-14, new argument). R27's own-set pass overshoots each credit-fed muscle by one set before the fair fill

Plans (rendered): General 3d (Push, Pull); Figure 3d (Pull); Women's physique 3d (Pull).

Rendered:
- General 3d Push: "Barbell Bench Press 3/3/4/4/4/2, Incline Dumbbell Press 2/2/2/2/2/1 ... Cable Overhead Tricep Extension 3/3/4/4/4/2, Tricep Pushdown (Rope) 2/2/2/2/2/1". Weekly line: "chest 6, own 6 (5/10/14) ... triceps 9, own 6 (5/10/14)".
- Figure 3d Pull: "Seated Cable Row 3/3/4/4/4/2 [the week's only row] ... Reverse Pec Deck 3/3/4/4/4/2, Face Pull 2/2/2/2/2/1, EZ Bar Preacher Curl 3/3/4/4/4/2, Hammer Curl 2/2/2/2/2/1". Weekly line: "upper_back 6, own 4".

OBSERVED (instrumented pass 0b): R27's credit-fed pass took triceps, rear delts and biceps each from 3 to 6 own sets (4 + 2) against a target of 5, before normal volume. In General 3d that filled Push to 24 sets before chest, the push day's lead muscle, received one normal-volume set.

New argument against the Kept ruling ("the one-set gap is the fair fill's rounding; moving it inverts it"):
- The overshoot is made by the R27 pass, not by the fair fill.
- Moving it does not invert: General 3d becomes chest 7/10 and triceps 8.5/10.
- In Figure 3d nobody loses.

Demonstrated legal:
- General 3d: OH extension 4 -> 3, incline DB 2 -> 3. Chest 7, triceps own 5 (counted 8.5).
- Figure 3d: RPD 4 -> 3, preacher 4 -> 3, + Chest-Supported Row (DB) 2. Upper back 6 -> 8, lats 10 -> 11, rear delts 8 -> 8, biceps 10 -> 10.

Fix: in R27's own-set pass, a 2-set opening that covers a 1-set deficit takes the first exercise down one (3 + 2), as C4-14 proposed.

### C5-13 MAJOR (regression). Classic physique 5 days: abs and quads fall below normal while chest and arms rise above it

Plan: Classic physique 5d (rendered).

Rendered: "5. Shoulders, Arms, Chest & Lats (7 exercises, 24 sets ...) - Incline Barbell Bench Press: 2/2/3/3/3/2 ... EZ Bar Preacher Curl: 3/3/4/4/4/2 ... Cable Overhead Tricep Extension: 3/3/4/4/4/2". Weekly line: "chest 11 (6/10/14); biceps 14, own 7 (6/10/14); triceps 12.5, own 7; quads 13 (10/14/20); hamstrings 13; abs 7 (6/10/14)". Report lines: "abs 7 of 10", "quads 13 of 14".

OBSERVED: round 4 had abs 10, quads 14, chest 8, biceps 11, triceps 10. Lats rose 11 -> 15 (R50, correct). But session 5 also took a chest top-up (R50, raised by R49 to 3) and R51's arm sets above normal (biceps reaches its maximum 14). The abs, which round 4 carried in session 5, are left at 7.

Why it is wrong: classic's mandatory poses include "Abdominals and Thighs" (09 s1.1). S muscles above normal while an S muscle and a P muscle sit below it inverts R36.

Demonstrated legal (Classic 5d, 60 min):
- Session 5: drop the incline press, preacher 3, OH extension 3, face pull 2, + Hanging Leg Raise 4 + Machine Crunch 2.
- Legs B: drop the Hanging Leg Raise, leg extension 3, seated leg curl 3, abduction 3.
- Result: abs 10, quads 14, hamstrings 14, glute med 5, chest 8, biceps 13, triceps 10, rear delts 9. The engine's own "normal volume reached" measure (each muscle capped at normal) rises by 3 sets over the week: abs +3, quads, hamstrings and glute med +1 each, chest -2, rear delts -1.

Fix:
- R51's 4-set dose only where the arm is below normal (counted), or where the set comes from free room no below-normal muscle can use.
- R48 should consider re-placing abs into the R50 session before R50's top-ups.
- Name the session "Upper" (see C5-18).

---

## MINOR

### C5-14 MINOR (question). Spine first is only a tie-break below tier

Plans: Bikini 2d, 3d and 4d ("Barbell Hip Thrust" before "Romanian Deadlift (Barbell)"), and Bikini 5d and 6d Lower C ("Machine Hip Thrust" before "Romanian Deadlift (Barbell)"). Also 200+ kit builds with a hip thrust or glute bridge before an RDL.

OBSERVED: `spinalLast` sorts after TIER_RANK (engine.js 1058-1062), so P glutes beat the S hinge. C4-19's argument applies equally: a spinal-loaded lift after four heavy hip-thrust sets is the riskier order (F6; lumbar 39.4%).

Demonstrated legal: bikini 3d with the RDL first.

Question: does R53's "whatever the focus" also put spine first across tiers? If yes, move `spinalLast` above the tier key within a kind rank.

### C5-15 MINOR. Dumbbell kit's only leg curl is a slider, against R53/U4-9

Plan: "Wellness, 4 days, dumbbells only" (rendered): "Slider Leg Curl (Bodyweight): sets by week 2/2/3/3/3/2". The kit's "Lying Dumbbell Leg Curl" is unused all week.

OBSERVED: the name rotation by visit (engine.js 421-426) starts at index 1, because hamstrings were already visited by the Lower A dumbbell RDL. Both names are supplements, so the rotation beats R53's "a dumbbell kit curls with a dumbbell before sliders". Demonstrated legal swap.

Fix: rotate by visits of the same pattern, not of the muscle.

### C5-16 MINOR. Beginners told "or 5 days a week"

Plans: General, Bodybuilding and Classic beginner 2, 3 and 4 days at 45 min (9 builds; rendered: "General, 3 days, beginner, 45 minutes ... or 5 days a week at 45 minutes"). 09 B12: "Beginner, 6 days: Build with x 0.7; recommend 3-4 days."

Fix: for beginners offer more days only up to 4.

### C5-17 MINOR. Women's physique 3 days: R35's light lateral dose is in the register but not in the code

Plan: Women's physique 3d (rendered): "side delts 8 of 14 ... the most of that muscle one session may hold". The Legs session has no lateral.

OBSERVED: the R35 register text names women's physique; the code comment (rulebook.js FIGURE_TEMPLATES) says WP keeps the general week, because its Legs session cannot then hold the hamstring and calf minimums. I confirmed it structural: all 8 slots are needed by minimums.

Fix: correct the register, and have the below-normal line say why (the leg day cannot also carry a lateral dose), or recommend 4 days.

### C5-18 MINOR. Session names that are lists

Rendered:
- "Shoulders, Arms, Chest & Lats" (classic 5d)
- "Back, Side Delts, Biceps & Chest" (figure and WP 5d)
- "Glutes, Hamstrings, Quads & Inner Thighs", "Hamstrings, Side Glutes, Inner Thighs & Calves" (wellness 5d)
- "Chest, Triceps, Calves & Abs" (MP 4d)

Engine: "Shoulders, Arms, Chest, Lats & Back" (general 5d advanced).

A session holding chest, back, delts and arms is an Upper day.

Fix: when R31 would add a third group to a name, use the region name ("Upper", "Lower") with its emphasis.

### C5-19 MINOR (C4-21 unchanged). A sixth day that adds nothing

Rendered:
- Bikini 6d: "6. Side Glutes, Abs & Calves (3 exercises, 11 sets ..., about 33 min)". The 6-day week equals the 5-day one plus 1 abs set.
- Bikini 5d and 6d: "4. Lower C (3 exercises, 10 sets, about 41 min)", whose kickback is an S5 top-up only. OBSERVED, pass 4; glutes are already 17.5 of 14.
- MP 6d: "5. Back B & Biceps (3 exercises, 11 sets ..., about 41 min)".

Fix: say so ("5 days carries the same week"), or balance Lower A (17 sets) and Lower C.

### C5-20 MINOR. A 2-set hack squat after back squat, RDL and before the hip thrust

Rendered: General 2d, 4d, 5d and 6d; Figure 4d, 5d and 6d; Women's physique 4d, 5d and 6d; Wellness 5d and 6d, all with "Hack Squat Machine: sets by week 2/2/2/2/2/1" as a fourth compound. Round 4's General 4d used a 2-set leg extension there.

INFERRED from the credit valuation: the hack squat wins on its glute and adductor credit.

Fix: once a session holds two heavy compounds, a quad's second exercise is the isolation.

### C5-21 MINOR. Exercise prescriptions

- Wellness 4d dumbbells: "Copenhagen Adduction: 2/2/3/3/3/2, 10-20 reps". The short-lever caveat is in the reason, not on the page, and 10 to 20 reps of a Copenhagen is far above typical progressions.
- "Clamshell (Side-Lying) ... 10-20 reps" unloaded, which sits far from RIR 1-3.
- Figure bodyweight: "Bench Dip: 2/2/2/2/2/1, 6-30 reps, rest 135 s". This is a shoulder-extension-loaded dip (09 s6 shoulder 36.6%), and a 135 s rest for a 2-set triceps exercise.

Fix: a Copenhagen rep range of 6-12 with the short lever named; a band or slow tempo for the clamshell; prefer the diamond push-up or band kickback to the bench dip.

---

## Round 4 findings: status (OBSERVED)

Fixed:

| Finding | Status |
|---|---|
| C4-1 | Same week at every length (all categories, days, experiences, 30-90 min, full gym). |
| C4-2 | Bikini glute focus +4; MP and BB biceps +1 to +2 and reported. |
| C4-3 | Classic 4d bench 3; MP 3d and figure 3d presses 4. |
| C4-4 | MP 3d CS row 4. |
| C4-7 | R50. |
| C4-8 | Wellness 6d hamstrings 14. |
| C4-9 | Figure and WP 4d lat focus +2. |
| C4-11 | Adductors in every kit. |
| C4-12 | Below-normal lines present. |
| C4-13 | R51. |
| C4-15 | Lateral 2 + 2 merged. |
| C4-16 | Curl before a token hinge. Side effect: BB 4d/5d and classic 4d glutes fall to 9 of 10, reported. |
| C4-18 | Display. |
| C4-20 | Bodyweight reps 6-30. |
| TDZ | `growth` declared first. |

Partly fixed or regressed:

| Finding | Status |
|---|---|
| C4-5 | Not fixed in the dumbbell kit (C5-11). |
| C4-6 | Fixed as ruled; MP machines Back B row at 5 alone is within R53. |
| C4-10 | The pulldown is fixed, but General 4d side delts regressed 8 -> 6 (C5-2). |
| C4-14 | Re-raised (C5-12). |
| C4-17 | Per-session reasons and "reaches at N days" exist, but 'rules' misattributes (C5-9). |
| C4-19 | Fixed within a tier; the cross-tier question is C5-14. |
| C4-21 | Unchanged (C5-19). |
| C4-22 | Wellness dumbbell lower repeats down from 5 of 8 to 3 of 8. |

## Verified clean (checked, found right)

**Recovery and joints.** Every plan passes `checkPlan` and `senseCheck`. There is no overhead press anywhere. Light doses are marked in MP 3d and Figure 3d. The MP 3d "side delts 12 of 14" reason (the light dose's 4-set cap) is true.

**Length.** Every "A N-minute session fits" and every "or D days" claim holds; I rebuilt each one at N and at D, full gym, all experiences, 30-90 min, and D is the fewest. 6 days never offers more days. No week builds at some lengths and not at others.

**Focus.** 409 single picks:
- 189 reached, 57 session_cap, 163 sessions_full.
- No C5 failure.
- Every "To make room" line names exactly the muscles that lost own sets, with correct from and to.
- No higher-tier donor; no silent short pick; every "reached" meets its target.
- The rendered focus variants' lines match their plain weeks (MP 4d, bikini 4d, BB 6d advanced, General 4d chest, Classic 5d 75, WP 4d glutes, Wellness 5d beginner quads), including "With 5 days a week it reaches 14" (General 4d chest) and the MP 4d focus "or 5 days" claim.

**Below-normal lines.** Every muscle under normal is listed; plans with none (General 5d and 6d, BB 6d, Classic 6d, Figure 6d, WP 6d) have every muscle at normal.

**Order, ladders and kits.**
- Abs last; a fly after its press; heavy compounds first by rank (except C5-10 and C5-14).
- Week ladders: 2/2/3/3/3/2, 3/3/4/4/4/2, 2/2/2/2/2/1, 4/4/5/5/5/3.
- Rest never below its floor; trimmed by class.
- Staples before stand-ins in the full gym: no TRX or slider in any gym plan. The weekly maximum display follows R34.
- Men's physique legs once at every day count.
- Push at or under pull, and hamstrings at least half of quads, in every plan.

## Questions for the lead

1. C5-6: should R27's own minimum for arms and rear delts, and R44's move towards it, ever take a set from a P muscle's normal volume, or from any muscle more below normal than the credit-fed one, when the credit-fed muscle's counted volume is already at or above its minimum?
2. C5-14: does R53's spine-first rule outrank the tier key (bikini hip thrust before a barbell RDL)?
3. C5-5: may an abs or calves focus pick take one non-neighbouring extra session, as R30/R47 allow other muscles, notwithstanding the round-2 Kept ruling for plain weeks?
4. C5-9 (wellness 5d): may the hinge day of 09 B7's wellness 5-day template also take a leg curl once its hinge is full, so the priority hamstrings reach normal volume?
