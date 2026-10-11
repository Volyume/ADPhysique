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

## 5. Citations and the map's numbers

Sections 5 and 6 are filled from the two verification passes (citations against primary sources; every number 09 attributes to the map against the map files).
