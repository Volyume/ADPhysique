# PASS 3 — CHECK-IN (area CK)

Sources reconciled: `pass2-input-01-chatgpt.md`, `pass2-input-02-gemini.md`, `pass2-input-03-claude.md`.
Volyume gap resolved against Pass 1 only (file:line); absence-claims evidenced by coverage grep.

| ID | Agreement | Source(s) | Market finding | Volyume gap (Pass-1 file:line) |
|---|---|---|---|---|
| CK-1 | ALL-THREE → VERIFIED | ChatGPT Q3/Q4; Gemini CK-F1/CK-F3; Claude CK-F1 | Weekly check-in should be short + conditional/branching | CONFIRMED YES — multi-step check-in `WeeklyCheckInScreen.js:138-144 (stepBar/stepDot)` with conditional cycle question `:28 (shouldShowCycleQuestion)`; engine conditional gates `weeklyCoach.js:620,:645-651` |
| CK-2 | ALL-THREE → VERIFIED | ChatGPT Q2/Q5; Gemini CK-F2; Claude CK-F2 | Wellbeing/recovery inputs (sleep/soreness/stress/readiness) | CONFIRMED YES — energy/soreness/stress feed `getRecoveryScore weeklyCoach.js:144-154`; sleep → deload `:974-979` |
| CK-3 | ONE / SINGLE-SOURCE (flagged) | Gemini CK-F3 | Auto-pull logged averages (don't re-ask what the app already has) | CONFIRMED YES — check-in auto-pulls weight + steps `WeeklyCheckInScreen.js:14 (getMorningWeightsLast14Days),:20 (getDailyStepsRange),:25 (summariseWeekSteps),:261-262,:366` |
| CK-4 | ONE / SINGLE-SOURCE (flagged) | Claude CK-F1 | Menstrual-cycle accounting | CONFIRMED YES — cycle question `cyclePrefs shouldShowCycleQuestion` (`WeeklyCheckInScreen.js:28`); note flags `parseNoteFlags weeklyCoach.js:313` |
| CK-5 | ONE / SINGLE-SOURCE (flagged) | Gemini CK-F1 | Check-in compliance = strongest retention predictor / human-accountability feel | Market context; Volyume mitigation = non-shaming re-engagement `notifications/missedCheckin.js:5-9` (cross-ref RE-4) |

## OPEN QUESTIONS
None — all CK findings resolved from Pass 1 (exact question count is render-time but the conditional + wellbeing structure is confirmed).
