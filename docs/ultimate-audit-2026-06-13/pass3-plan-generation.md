# PASS 3 — PLAN-GENERATION (area PG)

Sources reconciled: `pass2-input-01-chatgpt.md`, `pass2-input-02-gemini.md`, `pass2-input-03-claude.md`.
Volyume gap resolved against Pass 1 only (file:line); absence-claims evidenced by coverage grep.

| ID | Agreement | Source(s) | Market finding | Volyume gap (Pass-1 file:line) |
|---|---|---|---|---|
| PG-1 | ALL-THREE → VERIFIED | ChatGPT Q1/Q2; Gemini Q1/Q2; Claude Q-gen/Q-inputs | Best apps generate plans from a deterministic algorithm + onboarding inputs (goals, equipment, level, frequency, 1RM, injury) → mesocycle or daily session | CONFIRMED YES — `planEngine.js:100 (computeLandmarks by experience/recovery/phase/age),:127 (applyGoalOverlay goal/weak-points)`; splits `:18-21`; experience mult `:69-72` |
| PG-2 | ALL-THREE → VERIFIED | ChatGPT Q4; Gemini Q4/PG-F2; Claude Q-periodisation/PG-F1/PG-F2 | Genuine periodisation (MEV/MRV, deloads, wave/peaking) is the respected architecture; Fitbod rotates by fatigue without a long-term volume ramp | CONFIRMED YES — `VOLUME_LANDMARKS algorithms.js:20-54`; deload triggers `algorithms.js:727-763,:1474-1482`; adaptive landmarks `:1005-1041`; mesocycle tables `database.js` migration v3 (mesocycles/mesocycle_weeks) |
| PG-3 | ALL-THREE → VERIFIED | ChatGPT Q3/PG-F1; Gemini Q3/PG-F1; Claude Q-trust | Users trust deterministic/science-backed (named-expert) plans; LLM-generated plans distrusted as "slop"/recycled | CONFIRMED YES — deterministic, no LLM: coverage grep (openai/anthropic/gpt/llm/inference/fetch) across the 9 coaching-decision files incl. `planEngine.js` → 0 matches (see AC-5) |
| PG-4 | ALL-THREE → VERIFIED | ChatGPT Q5; Gemini Q5; Claude Q-beginner-vs-advanced | Beginners want session/linear auto-progression (StrongLifts); advanced want multi-week mesocycle/RPE | CONFIRMED YES — experience-tiered: beginner→full_body, advanced→ppl `planEngine.js:18-21,:69-72,:100-101`; auto-progression `algorithms.js:354-438` |
| PG-5 | ONE / SINGLE-SOURCE (flagged) | Gemini PG-F3 | A detailed onboarding quiz creates investment ("Ikea effect") aiding conversion | CONFIRMED YES (quiz exists) — `QuizScreen.js`, `ProGoalSetupScreen.js` (effect on conversion not measurable from code; cross-ref ON) |
| PG-6 | ONE / SINGLE-SOURCE (flagged) | ChatGPT PG-F2 | Boostcamp = access to known/expert/community pre-built programmes | CONFIRMED YES — free Plan Library of pre-built plans: `seedRoutines.js:33 (LIBRARY_PLANS)`, `PlanLibraryScreen.js`, `getLibraryPlans` |
| PG-7 | ONE / SINGLE-SOURCE (flagged) | ChatGPT PG-F3 | Users punish arbitrary/illogical volume prescriptions (JuggernautAI "can we add volume?") | CONFIRMED YES — volume bounded to landmarks `algorithms.js:979 ([mev,mrv] clamp)` and explained plainly `WHY_LIBRARY weeklyCoach.js:254-297` |

## OPEN QUESTIONS
None — all PG findings resolved from Pass 1.
