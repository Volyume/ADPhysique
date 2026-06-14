# PASS 3 — WORKOUT-SCREEN (area WS)

Sources reconciled: `pass2-input-01-chatgpt.md`, `pass2-input-02-gemini.md`, `pass2-input-03-claude.md`.
Volyume gap resolved against Pass 1 only (file:line); absence-claims evidenced by coverage grep.

| ID | Agreement | Source(s) | Market finding | Volyume gap (Pass-1 file:line) |
|---|---|---|---|---|
| WS-1 | ALL-THREE → VERIFIED | ChatGPT Q1; Gemini Q1; Claude WS-F1 | Fast low-friction set logging (~2–4 taps, autofill previous, tap-to-confirm/keyboard) is the benchmark | CONFIRMED PARTIAL — autofilled targets `algorithms.js:354-438`; prev values loaded `ActiveWorkoutScreen.js:138,:559-565`; exact tap-count is device-runtime, not statically provable → Q-WS1 |
| WS-2 | ALL-THREE → VERIFIED | ChatGPT Q2/WS-F2; Gemini Q2 (source pelaris = phantom, citation disregarded); Claude Q | Previous-session data shown inline during logging | CONFIRMED YES — `ActiveWorkoutScreen.js:138 (prevSets),:559-565 (loaded per exercise)` |
| WS-3 | ALL-THREE → VERIFIED | ChatGPT Q5; Gemini Q5; Claude Q | Auto-start rest timer (custom durations, smartwatch haptic) is table-stakes | CONFIRMED YES — `components/RestTimer.js`; `startRestTimer ActiveWorkoutScreen.js:115,:128`; `lib/restTimerMath.js`; watch haptic `lib/watch/bridge.js` |
| WS-4 | TWO | ChatGPT Q4; Gemini Q4/K3 | Mid-workout app freezing / offline-sync data loss is a top complaint | CONFIRMED YES (Volyume is offline-first) — coverage: grep fetch/axios/supabase/http in `ActiveWorkoutScreen.js` → 0; sets persist to local SQLite `workout_sets database.js:113` |
| WS-5 | ONE / SINGLE-SOURCE (flagged) | Claude WS-F3 | Top loggers don't read recovery (HRV/sleep) — "journals with timers" | CONFIRMED PARTIAL — self-reported recovery used `weeklyCoach.js:144-154`; no wearable HRV (coverage in MF area: `health.js` reads steps+weight only) |
| WS-6 | TWO | Gemini Q4; Claude Q | Excessive taps/navigation between input fields is a friction complaint | CONFIRMED PARTIAL — same tap/navigation question, device-runtime → Q-WS1 |
| WS-7 | ONE / SINGLE-SOURCE (flagged) | Claude | Social-feed distraction / free routine caps (Hevy, Strong) mid-workout | CONFIRMED NO — coverage: grep feed/social/follow/friends in `ActiveWorkoutScreen.js` → 0 (no in-workout social feed) |
| WS-8 | TWO | Gemini E-praise; Claude Q3 | Quick actions expected: plate calculator + one-tap set/routine duplication | CONFIRMED YES — plate calc `components/PlateCalculator.js:8` (`calculatePlates algorithms.js:843`); duplicate action `components/PeekMenu.js:21` |

## OPEN QUESTIONS
- Q-WS1 (WS-1, WS-6): exact taps to log a set / inter-field navigation speed is device-runtime, not provable from code. Confirm by device walk or accept as observational. files: ActiveWorkoutScreen.js, components/SetEntry.js.
