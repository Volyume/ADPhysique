# PASS 3 — ONBOARDING (area ON)

Sources reconciled: `pass2-input-01-chatgpt.md`, `pass2-input-02-gemini.md`, `pass2-input-03-claude.md`.
Volyume gap resolved against Pass 1 only (file:line); absence-claims evidenced by coverage grep.

| ID | Agreement | Source(s) | Market finding | Volyume gap (Pass-1 file:line) |
|---|---|---|---|---|
| ON-1 | ALL-THREE → VERIFIED | ChatGPT Q1; Gemini ON-F1/ON-F3; Claude ON-F2 | First-run = quiz / progressive disclosure (one question per screen, visual tiles) | CONFIRMED YES — `WelcomeScreen.js`, `QuizScreen.js`, `FirstRunScreen.js`, `ProGoalSetupScreen.js` (RootNavigator.js:30-31,67,73); tier fork `RootNavigator.js:1138` |
| ON-2 | TWO | ChatGPT Q3; Gemini Q2 | Time-to-first-value must be fast (first workout/value < ~60s) | CONFIRMED PARTIAL — flow exists; TTV timing is device-runtime, not provable from code → Q-ON1 |
| ON-3 | ALL-THREE → VERIFIED | ChatGPT Q4/Q5; Gemini ON-F2; Claude ON-F1 | Severe drop-off (D1 ~26% → D30 ~3–10%); paywall/jargon/forms-before-value drive abandonment | CONFIRMED YES (Volyume avoids paywall/jargon-first) — coverage: grep paywall/RIR/mesocycle/1RM in FirstRunScreen.js/QuizScreen.js → 0; the drop-off stats are market context |
| ON-4 | ONE / SINGLE-SOURCE (flagged) | Claude ON-F2 | ≤3 actions per screen, 3–5 screens is the sweet spot | CONFIRMED PARTIAL — actions-per-screen / screen-count is design/runtime, not provable from code → Q-ON1 |

## OPEN QUESTIONS
- Q-ON1 (ON-2, ON-4): time-to-first-value and actions-per-screen are device-runtime — verify by device walk against the <60s / ≤3-actions bar. files: WelcomeScreen.js, QuizScreen.js, FirstRunScreen.js, ProOnboardingScreen.js.
