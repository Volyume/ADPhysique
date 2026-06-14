# PASS 3 — NUTRITION (area NU)

Sources reconciled: `pass2-input-01-chatgpt.md`, `pass2-input-02-gemini.md`, `pass2-input-03-claude.md`.
Volyume gap resolved against Pass 1 only (file:line); absence-claims evidenced by coverage grep.

| ID | Agreement | Source(s) | Market finding | Volyume gap (Pass-1 file:line) |
|---|---|---|---|---|
| NU-1 | ALL-THREE → VERIFIED | ChatGPT Q1; Gemini Q1/NU-F1; Claude Q1 | Macro flexibility wanted: weekly calorie redistribution / carb cycling / diet styles | CONFIRMED PARTIAL — diet phases `nutritionEngine.js:27-35 (PHASE_ADJUSTMENTS)`; carb cycle `coachApply.js:81`, eligibility `weeklyCoach.js:1020-1021`, apply card `CoachOutputScreen.js:425-432`; no general user-facing weekly calorie planner → Q-NU1 |
| NU-2 | ALL-THREE → VERIFIED | ChatGPT Q3/NU-F1; Gemini Q3/NU-F2; Claude Q3/NU-F1 | UK curated/verified food DB (~500K, UK retailers, photo portions) is the quality bar/moat | CONFIRMED YES — ships OpenFoodFacts UK + CoFID UK snapshots `food/seed.js:7-11`; `assets/seed/off_uk_snapshot.dat`, `cofid_uk.dat`; exact item count is build-time → Q-NU2 |
| NU-3 | ALL-THREE → VERIFIED | ChatGPT Q4; Gemini Q4; Claude Q4 | kcal + UK units (stones/lbs, kg, GBP) | CONFIRMED YES — `units.js:12 (stoneLbsToKg),:17 (kgToStoneLbs)`; bodyWeightUnits st/kg/lbs; kcal internal; GBP billing |
| NU-4 | ALL-THREE → VERIFIED | ChatGPT Q2; Gemini Q2; Claude Q2 | Protein scales with bodyweight/lean mass (high-protein norm) | CONFIRMED YES — `PROTEIN_APPROACHES nutritionEngine.js:65-98` (g/kg LBM/BW); caps `:133,:138`; calc `:648-655` |
| NU-5 | ONE / SINGLE-SOURCE (flagged) | ChatGPT NU-F2 | MacroFactor/Carbon compete on coaching logic, not DB size | CONFIRMED YES — Volyume has both: engine `nutritionEngine.js` + `weeklyCoach.js` AND UK DB `food/seed.js` |
| NU-6 | ONE / SINGLE-SOURCE (flagged) | ChatGPT NU-F3 | MFP scale (100M+/2.9M) but gates barcode/scan/voice | CONFIRMED PARTIAL — Volyume gates barcode/food-diary behind Pro (founder pricing decision) — `ScanBarcodeScreen.js`; CLAUDE.md gating (cross-ref FL-5) |
| NU-7 | TWO | Gemini NU-F3; Claude NU-F2/NU-F3 | Micronutrient/NRV tracking (vitamins/minerals vs UK NRVs) is rising demand | CONFIRMED NO — coverage: food schema tracks fibre/sodium/sugar only `food/db.js:240,:1143`; no vitamin/mineral/NRV columns → Q-NU3 |
| NU-8 | ONE / SINGLE-SOURCE (flagged) | Claude NU-F3 | UK NDNS population deficiency context (vit D/folate) | context only; no Volyume feature action |

## OPEN QUESTIONS
- Q-NU1 (NU-1): Add a user-facing weekly calorie planner (borrow weekday→weekend), or is phase + carb-cycle sufficient? Founder call. files: coachApply.js, CoachOutputScreen.js, NutritionTargetsScreen.js.
- Q-NU2 (NU-2): Exact UK DB item count vs the ~500K bar — measurable at build from the snapshot. files: assets/seed/off_uk_snapshot.dat, build script.
- Q-NU3 (NU-7): Add micronutrient/NRV tracking, or stay macros + fibre/sodium/sugar? Founder call. files: food/db.js.
