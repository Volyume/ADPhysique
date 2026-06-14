# pass3-unresolved-answers.md — RESOLUTION LOOP (per `_AUDIT-SPEC.md:191-194`)
Each question answered with a CONFIRMED file:line from the named files. Read-only.

- **Q1** (G-01/02): Previous-session performance IS loaded inline — `ActiveWorkoutScreen.js:138 (prevSets state)`,
  loaded on exercise change `:559-565`. Exact tap-count is device-runtime, not statically measurable;
  autofill/targets exist (`algorithms.js:354-438`). RESOLVED: inline prev = YES; tap-count = observational.
- **Q2** (G-09/33): No paywall or jargon strings in the first-run flow — `grep paywall|RIR|mesocycle|1RM|deload
  FirstRunScreen.js QuizScreen.js → 0`. RESOLVED: no hard paywall/jargon in first-run; time-to-value is
  runtime-only (not statically timeable) → that sub-part → Pass-4 NA if a number is needed.
- **Q3** (G-11): No explicit reverse-diet UI — `grep reverse.?diet src → 0`. Engine has diet-break/refeed
  only (`nutritionEngine.js:1056-1062`). RESOLVED: reverse-diet mode = CONFIRMED NO.
- **Q4** (G-13): UK snapshots ship — `assets/seed/off_uk_snapshot.dat (6.5 MB, branded UK)` +
  `cofid_uk.dat (654 KB, ~3k generic UK)`, importer `food/seed.js:7-13`. RESOLVED: substantial UK DB present;
  exact branded item count is inside the .dat (build-time) → noted, not blocking.
- **Q5** (G-15/20): No inline tier gate in `ScanBarcodeScreen.js` (grep 0); barcode/food-diary are Pro per
  CLAUDE.md, gated at the Diary surface. RESOLVED: barcode = PRO (founder pricing decision) → Pass-4 FOUNDER-GATE.
- **Q6** (G-16): Carb-cycle high/low-day confirm-then-apply card exists — `CoachOutputScreen.js:425-432
  (MacroCycleCard)` + `coachApply.js:81`. No general weekly calorie-redistribution planner. RESOLVED: PARTIAL.
- **Q7** (G-17): Tracks fibre/sodium/sugar per-100g — `food/db.js:240,:247`. No vitamin/mineral/NRV tracking.
  RESOLVED: micronutrient/NRV = CONFIRMED NO (fibre/sodium/sugar only).
- **Q8** (G-18): Friction-reducers present — Frequents tab/cache `food/frequents.js`, bulk entry
  `food/bulkEntryOps.js`, recipes (recipe_ingredients sync table). RESOLVED: friction reducers = YES.
- **Q9** (G-23): No recomp-reframing copy in `AnalyticsScreen.js`/`WeightTrendCard.js` (grep 0). RESOLVED:
  recomp UI reframing = CONFIRMED NO (data exists; UI does not explicitly reframe flat weight).
- **Q10** (G-25/26): exercises table has NO media column — `database.js:78+` (name/primary_muscle/
  secondary_muscles/equipment only) → no video/animation demos. Custom exercises supported — `database.js:91
  (is_custom)`, `:999`. Seed `seedExercises.js` (1043 lines; exact count = structural parse, build-time).
  RESOLVED: substitutions YES (`algorithms.js:785-812`), custom YES, demo media = CONFIRMED NO, count ≈ seed.
- **Q11** (G-27): Partner accountability mechanic — `usePartners.js` (free cap 1 partner, Pro 3-partner
  follow-on `:7-8`, cheer/pair). No broad social feed. RESOLVED: accountability = PARTIAL (partner, not feed).
- **Q12** (G-28): 5 bottom tabs — `RootNavigator.js:445-449` (Train/Plans/Diary/Progress/You). RESOLVED:
  5 tabs (≤5 best-practice met).
- **Q13** (G-29): 189 touch-targets located (`extract/s8-touch.txt`); comprehensive compliance of EVERY
  interactive element is an audit task, not a single file:line. RESOLVED: 189 confirmed; full audit = a
  Pass-4 deliverable (not an open blocker — the standard + located set are confirmed).
- **Q14** (G-30): No standalone watchOS/Wear app (no watch target in ios/android); watch DATA read via Apple
  Health weight/steps — `health.js`, `app.json:37`. RESOLVED: standalone watch app = CONFIRMED NO.
- **Q16** (G-32): No posing/peak-week UI tool (grep 0). Nutrition peak logic only — `nutritionEngine.js:1041-1062`,
  `weeklyCoach.js:1020-1050`. RESOLVED: posing/peak-week UI = CONFIRMED NO; nutrition peak = YES.
- **Q17** (G-33): InfoTooltip component EXISTS and is used with plain-English explanations —
  `components/InfoTooltip.js`, used `ProgressSections.js:257`. RESOLVED: inline jargon explanation = present
  (at least Progress); comprehensive coverage = PARTIAL.
- **Q18** (G-34): Weekly check-in is conditional — cycle question gated `WeeklyCheckInScreen.js` via
  `shouldShowCycleQuestion (cyclePrefs:28)`; collects weight + recovery (energy/soreness/stress/sleep) +
  steps. RESOLVED: conditional + wellbeing-aware = YES; exact question count is render-time.
- **Q19** (G-35): Per-domain confirm-then-apply EXISTS — `CoachOutputScreen.js:780-792`, `isApplied/markApplied`
  (calories/training/deload separately), calm-mode `:768`. No Coached/Collaborative/Manual autonomy toggle;
  no manual target override (manual-goal editor "a later pass", `useWeeklyStreak.js`). RESOLVED: PARTIAL.

NON-CODE: **Q15** (G-31) Apple medical-device declaration — not code-resolvable → `pass4-needs-answer-register.md`
as a FOUNDER-GATE/compliance item.
