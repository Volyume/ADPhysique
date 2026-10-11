# 10 Verification of the founder's research (09)

Status: 2026-10-11. The research in `09-RESEARCH-FINDINGS.md` is the authority for the structure-engine rebuild. This file records what was checked, what holds and what must be corrected before it becomes the rulebook. Every finding below names its evidence. OBSERVED means read or run; INFERRED is labelled as such.

## 1. Internal consistency: the research's example plans against its own rules

Method (OBSERVED): every fully specified example plan in 09 section B11 was encoded and checked against 09's own rules: B2 credits (indirect = 0.5), B3 tiers, the minimums and maxima in section 3, C2 (adjacency, "trained" = 2 or more direct or 4 or more fractional sets, FAST muscles allowed next-day only when the earlier dose is light), C3 (8 direct and 11 fractional per muscle per session), C6 (8 exercises, 24 sets, exercises per muscle), J4. Peak-week sets. Script: kept out of the repo (scratch), reproduced from these rules in the checker build.

| Example (09 B11) | 09 says | Result against 09's own rules |
|---|---|---|
| Men's physique 4d, marked verified | "Passes all checks" | FAILS C3: Chest + Triceps + Abs carries 10 direct chest sets in one session (press_incline 4, press_flat 3, fly 3); the cap is 8. Every other check passes. |
| Men's physique 4d, focus side delts + biceps, marked verified | Side 15, biceps 15, passes | Read as edits to the base plan, totals match 09 (side 15, biceps 15, Back B 6 exercises, 21 sets); biceps 15 is legal under the focus allowance (S max 14 + 4). Inherits the 10-direct chest session: FAILS C3. |
| Men's physique 3d | Admits upper back short | FAILS C4 three times, not one: upper back 6 (P minimum 8), side delts 7 (P minimum 8), abs 3 (S minimum 5). Also C2: side delts sit in Legs + Side and the next session, Push; that pair is legal only if the earlier dose is light, which needs every set at RIR 2 or more, while B9's ladder takes every set to RIR 1 in weeks 4 and 5. 09 labels the Push laterals "light", but the earlier session of that pair is Legs + Side. |
| Men's physique 5d | not verified | FAILS C3 (Chest + Tri 10 direct chest) and C4 (calves 3, minimum 4; abs 3, minimum 6). |
| General 2d, 3d, 4d, 5d | not verified | FAIL C4 in every one: side delts 3 a week at 2d to 4d (S minimum 4 to 6), glute_med 0 everywhere (M minimum 2 to 4), abs and calves short at 2d, 3d and 5d, rear delts short at 2d and 4d. |
| Bikini 4d, marked verified | Glute_max 14.5 | Glute_max 14.5 matches; FAILS C4 on six muscles against 09's own B3 bikini tiers: chest 0 (M minimum 4; the plan has no chest work at all), triceps 2, calves 3 and abs 2 (M minimum 4), glute_med 4 (S minimum 6), biceps 8.5 (M maximum 8, from rowing and pulldown credits). |

Conclusion (lead ruling, recorded in the register): the rules hold together; the hand-written examples do not. The examples are not used as fixtures. The engine builds every plan from the rules, the checker passes or fails it, and the founder signs off the rendered output, not 09's examples.

## 2. Contradictions inside 09 and how they are resolved

| # | Contradiction | Resolution |
|---|---|---|
| R1 | The next-day exception for FAST muscles needs a "light" earlier dose (every set RIR 2 or more), but B9's RIR ladder is 3, 2, 2, 1, 1, 4 for every set. | Lead ruling: an exercise placed under the next-day exception is held at RIR 2 or more in every week; it does not follow the ladder below 2. The checker tests it per week, not only at the peak. |
| R2 | Section 5 step 1 adds focus "only while capacity remains"; B8 ranks focus (6) above the chosen length (7). | Tied to founder fork Q1 (section 4). Until answered, B8's order governs: focus is never dropped for the clock. |
| R3 | The 60-minute example rule "5 exercises, 17 sets" against the capacity table "16 sets at default rest, 20 at floor rest". | The time model governs; the example rule is dropped. |
| R4 | Session working-set ceiling: 09 says 24 hard; D45 says 25. | 24 (09 is the newer authority, and it is the stricter). |
| R5 | 09 says the catalogue "needs a plate lateral raise for barbell-and-plates kits". | The library already has "Plate Lateral Raise" (side_delts, barbell, `src/lib/exerciseCorpus/families/barbell.js`); the barbell_plates catalogue entry has no side-delt choice (`src/lib/plan/catalogue.js:510`). The fix is the catalogue mapping, not a new exercise. Bodyweight has no lateral-raise pattern without bands; per 09 section 7 it is reported untrainable when no pattern exists. |

## 3. Conflicts with the founder's FIXED rules (08 Part 2)

| Fixed rule | 09 | Status |
|---|---|---|
| F1 deterministic | C19 byte-identical output | Agrees |
| F2 standard kept, focus on top | C5, focus never takes from another muscle | Agrees |
| F3 nothing removed to fit the clock; rest shortened first; real length shown | Section 5: minimums first, then typical, focus and growth sets "only while capacity remains"; B8 ranks growth above the minimum below the chosen length; reject the save when the minimums do not fit at floor rest | CONFLICT. Founder decision Q1. |
| F4 men's physique legs once | Legs once at every day count | Agrees |
| F5 no fixed days; next session may be tomorrow | The adjacency rule assumes exactly this | Agrees |
| F6 recovery never traded | Recovery is HARD, rank 1 | Agrees |

## 4. Founder decisions

Q1 (F3 against 09 section 5). See the chat message of 2026-10-11 and the register entry.

## 5. The map's numbers as 09 uses them (OBSERVED: each figure traced to the map files; Sonnet read pass, lead-reviewed)

"Now" = commit 39a1929; "9 Oct" = ddcf0a5; "3 Oct" = a7c4333. Percentages are of the 1,440 plans unless stated.

Holds as stated: recovery check failing in 80% and the plan saved anyway (04:11, 00:56); 37% with the same muscle 24 h apart, abs 406, side delts 148, calves 145 plans (04:13, 05:159-168); 25% with overhead pressing in two or more sessions (04:16); the 6-set overhead press and the thin-equipment +2 cap (05:228, 01:1515); the 1.10 front-delt overlay (01:384); 74% with the same exercise in neighbouring sessions, any gap (04:14); focus-first ordering (01:803, 01:1576); biceps 24 against a peak of 22 from uncapped credits (01:798, 01:1481); 240 of 240 below floor in barbell-and-plates and bodyweight kits, side delts in every one (04:52-53); the clash term about 1000 times the recovery terms (01:1505); the 26% figure for the 3 Oct generator (05:29).

Holds with a qualifier:
- "79-80% over 8 exercises / 25 sets or over length" is two separate measures (79% and 80%); either one: 1,295 of 1,440 (90%).
- 9.3 exercises a session and 109 sets a week are means; 221 minutes is one plan (bodybuilding, 2 days, 45 minutes, three focus picks).
- Front delts pressed back-to-back 46% (men's physique 77%) counts bench and incline presses and any gap; at 24 h apart it is 6%.
- 288 of 288 two-day plans with the same muscle back-to-back: any gap, and every 2-day plan is full body; the map reads that as ordinary full-body training and uses the 24 h figure (0) as the recovery measure (05:15). The 3-day figure is the same. 09's rule changes 2- and 3-day plans to splits for exactly this reason (F5).
- "Only 8 orders examined" is the readiness step; the order search scores every permutation (01 section 6.9).
- The 10-set lateral raise and 11-set hip thrust are the older generator's plan served through the uncapped multiplier on the no-facts path (02:684, P17), not post-build paths in general.
- Abs absent in men's physique 4-day is today's older generator (02:686); the 3 Oct generator's plan has abs (05:178).

Not in the map (09's inference, plausible, to be confirmed by the checker in phase 2): no variety check; a silent beginner clamp causing beginner 45 min = intermediate 60 min (one sample pair, 03:2245 and 03:2897); "no lateral-raise pattern in those kits" (confirmed separately: section 2, R5); catalogue role order putting bench first in bikini upper sessions.

Wrong: "4x4 leg compounds in library plans": library plans carry squat 4, leg press 3, RDL 3 (02:527-541); four leg compounds at 4 sets is the new planner's own men's physique plan (02:214-217). The wrap-around pair cannot explain the 26% (the measure puts the wrap pair at 72 h).

R6 (added): rest floors. 09 says keep today's rest ladder (section 10) but its section 5 table gives different floors (heavy compound 120 s, moderate 90, machine 75, isolation 60) from today's (150, 120, 90, 60; 06:58). Lead ruling: 09's table governs; it is explicit and graded (isolation floor from Singer 2024).

## 6. Citations against primary sources (OBSERVED: abstracts via Europe PMC and publisher pages, full texts where open; Sonnet pass, lead-reviewed)

17 of 19 VERIFIED as 09 states them; 2 PARTIAL; none fabricated or contradicted.

VERIFIED: Pelland 2026 (67 studies, 2,058 participants, fractional counting strongest, frequency "compatible with negligible effects", efficiency tiers in its Table 3; the frequency slope was positive with 91.3% probability, so negligible is compatible, not proven); Remmert 2025 preprint (~2 direct / ~11 fractional per session); Robinson 2024; Refalo 2024 (J Sports Sci 42:85-101); Moran-Navarro 2017; Singer 2024 (benefit above 60 s, no appreciable difference above 90 s); Miller 2005; Kassiano 2022; Coleman 2024; Bell 2023 (Delphi, no duration numbers in the abstract); Rogerson 2024 (6.4 +/- 1.7 days every 5.6 +/- 2.3 weeks, frequency kept, volume cut); Siewe 2014 (every figure); Kolber 2014 (every figure); Campos 2020 (every figure; bench drives the front delt at 21.4% MVIC); Baz-Valle et al. 2026, Sports 14(1):20 (the "Spanish natural elite bodybuilders" survey, n = 56); NPC men's physique and bikini judging text.

PARTIAL:
- Lanza 2024 (J Bodyw Mov Ther 40:1417-22) is real and matches the design (10-week bench-only RCT, MRI). The quoted sentence comparing the pectoralis major with the anterior deltoid is not in the abstract and the full text was not reachable; the abstract reports the anterior deltoid grew against control and the medial deltoid least. The rule it supports (no mandatory direct front-delt work) also rests on Campos 2020 and stands at grade C.
- da Silveira 2025 (Front Sports Act Living 7:1536360) is real (n = 154), but "split routines (85.5%), 4-7 sessions, twice weekly, 60-90 min" is background in its introduction, cited to Hackett 2013 and 2022 (male bodybuilder surveys), not its own result.

Limits on how 09 uses sources, with rulings:
- Remmert's ~11 fractional sets: the authors say these "are not upper limits" and to interpret cautiously. 09 uses 11 as a hard per-session cap. Ruling: kept as a hard cap as a deliberate conservative design limit under F6 and the founder's conservative posture (GC-D12), labelled in the rulebook as a design limit drawn from a preprint, not an evidence-proven ceiling.
- Kolber's "not associated" lifts (bench, dips, behind-the-neck) were non-significant in a small cross-sectional sample: not proof of safety. No rule depends on them being safe; 09's joint rules restrict, never permit.
- Siewe found no effect of session duration on injury; it does not support a length cap. 09's session limits are graded D and stay as design limits.
- Kassiano supports avoiding excessive rotation; it does not show that fixing exercises for a whole block is better. The fixed-for-the-block rule stays at grade D (design).
