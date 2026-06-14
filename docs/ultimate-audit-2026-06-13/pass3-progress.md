# PASS 3 — PROGRESS (area PR)

Sources reconciled: `pass2-input-01-chatgpt.md`, `pass2-input-02-gemini.md`, `pass2-input-03-claude.md`.
Volyume gap resolved against Pass 1 only (file:line); absence-claims evidenced by coverage grep.

| ID | Agreement | Source(s) | Market finding | Volyume gap (Pass-1 file:line) |
|---|---|---|---|---|
| PR-1 | ALL-THREE → VERIFIED | ChatGPT Q1/Q3/PR-F1; Gemini Q1/Q3/K2; Claude Q1/Q3 | Per-exercise 1RM progression + volume/heatmap graphs + PR callouts drive motivation | CONFIRMED YES — 1RM bests `useProgressData.js:21-45`; weekly volume `:76,:125` + `VOLUME_LANDMARKS algorithms.js:20-54`; PR detection `algorithms.js:530-580`; PR celebration `PRCelebration.js`; `AnalyticsScreen.js` |
| PR-2 | TWO | ChatGPT PR-F2; Gemini Q1/K1 | Trend-weight smoothing (moving average); frame progress as trend not a single weigh-in | CONFIRMED YES — `computeEWMA weeklyCoach.js:39` / `nutritionEngine.js:158`; robust trend `weeklyCoach.js:577`; `WeightTrendCard.js` |
| PR-3 | ALL-THREE → VERIFIED | ChatGPT Q2/PR-F3; Gemini Q2; Claude Q2/PR-F1/PR-F2 | Progress photos + body measurements are top demand; photos private-by-default | CONFIRMED PARTIAL — measurements present `BodyMetricsScreen.js:88,:240,:307`; progress photos ABSENT (coverage: grep progressPhoto/body-photo in src → 0; backend table exists `supabase/setup_complete.sql:251`) → Q-PR1 |
| PR-4 | ALL-THREE → VERIFIED | ChatGPT Q4; Gemini Q4/K3; Claude Q4 | Recomposition reframing — flat scale weight reframed via BF/lean/measurements/PRs | CONFIRMED PARTIAL — recomp goal + explanatory copy `NutritionTargetsScreen.js:84,:93`; BF/measurement trends `BodyMetricsScreen.js:240,:307`; a progress view that explicitly reframes flat scale weight not located (coverage: grep recomp in screens/components → only goal copy) → Q-PR2 |
| PR-5 | ONE / SINGLE-SOURCE (flagged) | ChatGPT PR-F3 | Caliber-style composite Strength Score / Strength Balance reframing metric | CONFIRMED NO — coverage: grep strengthScore/strengthBalance in src → 0 |

## OPEN QUESTIONS
- Q-PR1 (PR-3): Add progress photos (a backend table already exists, `supabase/setup_complete.sql:251`)? Founder call. files: BodyMetricsScreen.js, supabase progress_photos.
- Q-PR2 (PR-4): Add a progress view that reframes flat scale weight via measurements/BF/PRs? Founder call. files: AnalyticsScreen.js, BodyMetricsScreen.js.
