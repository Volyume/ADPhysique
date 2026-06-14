# PASS 3 — SCALING (area SC)

Sources reconciled: `pass2-input-01-chatgpt.md`, `pass2-input-02-gemini.md`, `pass2-input-03-claude.md`.
Volyume gap resolved against Pass 1 only (file:line); absence-claims evidenced by coverage grep.

| ID | Agreement | Source(s) | Market finding | Volyume gap (Pass-1 file:line) |
|---|---|---|---|---|
| SC-1 | ALL-THREE → VERIFIED | ChatGPT Q3; Gemini SC-K1; Claude SC-F1 | Progressive disclosure is THE single-product dual-audience mechanism | CONFIRMED PARTIAL — engine experience tiers `nutritionEngine.js:709-723`, `planEngine.js:69-72,:100-101`; experience UI `ProGoalSetupScreen.js:38,:457`; UI-level hide-advanced-behind-toggle not confirmed → Q-SC1 |
| SC-2 | ONE / SINGLE-SOURCE (flagged) | Claude SC-F2 | No mainstream app spans complete-beginner → elite in one product | CONFIRMED PARTIAL — Volyume's thesis; engine is experience-tiered (`nutritionEngine.js:709-723`); the dual-audience UI completeness depends on Q-SC1 |
| SC-3 | ONE / SINGLE-SOURCE (flagged) | Gemini SC-K2/SC-K3 | Tiered autonomy (Coached/Collaborative/Manual) + granular override for elite | CONFIRMED PARTIAL — per-domain confirm-then-apply exists `CoachOutputScreen.js:780-792 (isApplied/markApplied)`; no Coached/Collaborative/Manual toggle, no manual target override (manual-goal editor "a later pass", `useWeeklyStreak.js` docstring) → Q-SC2 |
| SC-4 | TWO | ChatGPT Q2; Claude (register) | Register switching: plain for beginners, RIR/landmarks for advanced | CONFIRMED YES — coach register `coachRegister.js (resolveRegister)`; plain-English why `weeklyCoach.js:254-297`; advanced metrics exposed `algorithms.js` (RIR/landmarks) |

## OPEN QUESTIONS
- Q-SC1 (SC-1, SC-2, cross-ref DE-3/NE-4): does the UI progressively disclose (clean beginner view → advanced depth behind a toggle), end to end? files: ProGoalSetupScreen.js, HomeScreen.js, AnalyticsScreen.js.
- Q-SC2 (SC-3): add Coached/Collaborative/Manual autonomy modes + manual target override (respecting the safety floors)? Founder call. files: CoachOutputScreen.js, coachApply.js.
