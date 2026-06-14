# PASS 3 — GAP CORRECTIONS (read-backed; every verdict cites a file actually Read)

Each verdict below was decided by reading the implementation in full this session (Read calls are in the
console) and is cited to the deciding lines. grep is not used as evidence anywhere here. Where a verdict
still rests on the register or a schema read rather than the screen file, that is stated explicitly.

Files Read in full this session: pass1-section4-features.md, AnalyticsScreen.js, CoachOutputScreen.js
(1–1315), useProgressData.js, LiftProgressScreen.js, strengthStandards.js, BodyMetricsScreen.js, health.js,
watch/bridge.js, partners/service.js, NutritionTargetsScreen.js (full), DiaryScreen.js, mesocycle.js,
ConsistencyScreen.js, coachRegister.js. (food/db.js + database.js schema read earlier this session.)

## A. FALSE GAPS — feature exists (read-backed; my earlier verdict was wrong)
1. **Strength-score / Strength-standing (PR-5) → EXISTS.** Composite overall strength standing +
   per-lift relative-strength levels (Beginner→Elite): `LiftProgressScreen.js:138-193`,
   `strengthStandards.js:56-90 (getStrengthLevel), :108-132 (summariseStrengthStanding overallLabel)`.
2. **Manual coaching control (SC-2) → EXISTS** (only a named tri-mode toggle is missing). Full self-serve
   target calculator the user drives: `NutritionTargetsScreen.js` GOALS (80-87, 798-827), custom protein
   g/kg (874-889), `handleCalculate` (356-457), per-meal override (1053-1073), Recalculate (1308-1315);
   plus per-adjustment confirm-then-apply `CoachOutputScreen.js:778-1045 (markApplied/isApplied)`.
3. **Register/tone switching (SC-4) → EXISTS.** `coachRegister.js:64,80-88` supportive/precise/automatic;
   precise renderers 100-235; opt-in science `withScience` 308-316.
4. **Carb-cycle / refeed / diet-break planning (NU-1, broader) → EXISTS.** `CoachOutputScreen.js:389-423`
   (DietBreakCard), `:431-470` (MacroCycleCard), `:477-510` (RefeedCard); consumed in `DiaryScreen.js:143-164`.
5. **Companion watch logging (MF-2, partial) → EXISTS (phone-tethered).** `watch/bridge.js:42-76`
   (composeSessionScript/Cursor), `:99-111` (`applyRemoteSetEvent`, watch_set_logged). Renders full session
   + logs sets from the wrist. (My "rest-timer haptic only" was wrong.)
6. **Progress views / graphs (PR-1) → EXISTS.** `AnalyticsScreen.js:431-524` (volume summary, PR sparkline),
   `:256-263` (weight trend), `useProgressData.js` loaders.

## B. REAL GAPS — survives (read-backed ABSENT/PARTIAL)
1. **Progress-photo UI (PR-3) → ABSENT (table exists, no client UI).** `BodyMetricsScreen.js` `FIELD_MAP`
   55-66 + `saveMetrics` 595-669 handle weight/body-fat/measurements/notes only; no image capture/display;
   no picker/camera import (1-47). Backend table exists (register #1).
2. **HRV / sleep ingestion (MF-1) → ABSENT.** `health.js` reads weight (`readWeightsSince` 361-412) + steps
   (`readStepsToday` 421-474) only; perms 45-59 / 188-194 carry no HRV/sleep; header 14-18 states the scope set.
3. **Micronutrient / NRV (NU-7) → ABSENT.** `DiaryScreen.js` shows macros + fibre + water (239-254, 540-546,
   752-778); `food/db.js:240` schema = fibre/sodium/sugar only, no vitamin/mineral columns.
4. **Challenges / leaderboards (RE-7) → ABSENT.** `partners/service.js` = invite/redeem/cheer/block/unpair/
   week-signal/view (26-171); no challenge/leaderboard/ranking. (RE-3 social/accountability EXISTS — this.)
5. **Posing / contest peak-week (MF-3) → ABSENT.** `mesocycle.js:14-32` `peak` = highest-volume *training*
   week; no stage water/sodium/carb-load protocol or posing tool anywhere read.
6. **Reverse-diet mode (AC-9) → ABSENT (analogues exist).** `NutritionTargetsScreen.js:80-87` goals carry no
   reverse-diet; analogues = maintain goal + diet-break/refeed (`CoachOutputScreen.js:389-510`).
7. **Weekday→weekend calorie-banking planner (NU-1, specific) → ABSENT.** Not in NutritionTargets,
   CoachOutput, or DiaryScreen (all read). Day-type is training/rest/refeed-driven, not a user calorie bank.
8. **Recomp reframing view (PR-4) → PARTIAL.** Components exist — BF/measurement trends
   `BodyMetricsScreen.js:242-358`, strength standing `LiftProgressScreen.js`, weight trend
   `AnalyticsScreen.js:256-263` — but no view reframes flat scale weight as recomposition (Analytics,
   BodyMetrics, Consistency all read).
9. **Exercise demo media (EL-1/NE-3) → ABSENT.** Exercises table has no video/image/media column
   (`database.js:78-92`, schema read this session); register #2 ABSENT. (ExerciseDetailScreen not re-read
   this session — the absence of any media column is the decisive evidence.)
10. **Standalone (phone-free) watch (MF-2) → PARTIAL.** Companion logging exists (A5) but it is phone-tethered
    (`watch/bridge.js` header 6-7: "phone composes; watch renders"; `publish` 85-97); phone-free is the gap.

## HOLD (read-confirmed EXISTS)
Streak (register #7 + StreakWeeksSection used in ConsistencyScreen.js:46); accountability/partners (RE-3,
partners/service.js); barcode (register #18); colour-blind palette (theme.js:328-329 read earlier);
no-LLM (coverage across 9 engine files); jargon tooltips (InfoTooltip + GLOSSARY used across Analytics/
BodyMetrics/NutritionTargets/LiftProgress, all read); UI progressive disclosure (NutritionTargets fast-path
/fine-tune 516-672, CoachOutput moreOpen 771 + CollapsibleSection, BodyMetrics measure toggle 956-971).
