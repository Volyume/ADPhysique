# PASS 3 — FOOD-LOGGING (area FL)

Sources reconciled: `pass2-input-01-chatgpt.md`, `pass2-input-02-gemini.md`, `pass2-input-03-claude.md`.
Volyume gap resolved against Pass 1 only (file:line); absence-claims evidenced by coverage grep.

| ID | Agreement | Source(s) | Market finding | Volyume gap (Pass-1 file:line) |
|---|---|---|---|---|
| FL-1 | ALL-THREE → VERIFIED | ChatGPT Q1/FL-F1; Gemini Q1/FL-F1; Claude Q1/Q3/FL-F2 | Logging burden/time is the top quit reason; adherence decays sharply (~80% by 90d; ~21% by wk12) | Market stat (not a Volyume feature). Volyume mitigations: friction reducers (FL-2) + non-punitive stabilise `weeklyCoach.js:620-621` |
| FL-2 | ALL-THREE → VERIFIED | ChatGPT Q5; Gemini Q5; Claude Q5 | Friction reducers required: barcode, copy/recent, frequents/favourites, recipes, quick-add | CONFIRMED YES — recent `food/db.js:141`; frequents cache `food/db.js:162-185`; recipes (recipe_ingredients table + recipeIngredients sync); barcode `ScanBarcodeScreen.js` |
| FL-3 | ALL-THREE → VERIFIED | ChatGPT Q3/FL-F2; Gemini Q3; Claude Q3 | Barcode accuracy + UK verified DB strong; crowdsourced entries wrong | CONFIRMED YES — barcode `ScanBarcodeScreen.js`; UK verified DB `food/seed.js:7-11` |
| FL-4 | ALL-THREE → VERIFIED | ChatGPT Q4/FL-F3; Gemini Q4/FL-F2; Claude Q4/FL-F3 | AI meal-photo/voice logging is fast but inaccurate (15–40% error); trust fragile | CONFIRMED YES (sidesteps) — coverage: grep estimateCalories/photoToCalories/aiEstimate/mealPhoto/foodRecognition across food/+screens → 0; camera is deterministic barcode + on-device label OCR `food/ocr.js` (paid cloud-vision adapter explicitly removed) |
| FL-5 | TWO | Gemini FL-F3; ChatGPT Q1 | Paywalling barcode/essential utilities causes backlash (esp UK) | CONFIRMED PARTIAL (tension) — Volyume gates barcode behind Pro (founder pricing decision) `ScanBarcodeScreen.js`; CLAUDE.md → Q-FL1 |
| FL-6 | ONE / SINGLE-SOURCE (flagged) | Claude FL-F1 | ~73% of MFP users WITH an eating disorder perceived it as a contributor (Levinson 2017, N=105 clinical) | CONFIRMED YES — Volyume has ED-pattern detection: `edPatternDetector.js:30-36,:64` (context for why the safety stack exists) |
| FL-7 | TWO | Gemini Q2; Claude Q2 | Time-per-log benchmarks (~45–90s/item manual; AI <3s; 23→15 min/day) | Market context; Volyume mitigation = FL-2 reducers |

## OPEN QUESTIONS
- Q-FL1 (FL-5): barcode is Pro — keep, or move to Free as a UK acquisition lever? Founder pricing/gating decision (billing untouched without permission). files: gating, ScanBarcodeScreen.js.
