# PASS 3 — AI / ALGORITHMIC COACHING (area AC)

Sources reconciled: `pass2-input-01-chatgpt.md`, `pass2-input-02-gemini.md`, `pass2-input-03-claude.md`.
Volyume gap resolved against Pass 1 only (file:line); unresolved items in the open-questions list.

| ID | Agreement | Source(s) | Market finding | Volyume gap (Pass-1 file:line) |
|---|---|---|---|---|
| AC-1 | ALL-THREE → VERIFIED | ChatGPT Q1; Gemini Q1; Claude Q1 | Weekly check-in → auto-adjust-targets loop is the category standard (MacroFactor, Carbon, RP) | CONFIRMED YES — `runWeeklyCoach weeklyCoach.js:577,:585-586,:773-785` |
| AC-2 | ALL-THREE → VERIFIED | ChatGPT Q2; Gemini Q2; Claude Q2 | Frontier split: nutrition coaches (MacroFactor, Carbon) adjust nutrition only; training engines (RP, JuggernautAI) adjust training only; none close both | CONFIRMED YES (Volyume closes both) — nutrition `weeklyCoach.js:773-785`; training `:176-191`; steps `:873-883`; cardio `:913-914` |
| AC-3 | ALL-THREE → VERIFIED | ChatGPT Q3/AC-F1; Gemini AC-F1; Claude AC-F1 | Adherence-neutral (MacroFactor) vs strict (Carbon); market favours neutral/no-guilt | CONFIRMED PARTIAL — trend-driven, stabilises not shames `weeklyCoach.js:620-621,:668,:692-693` |
| AC-4 | ALL-THREE → VERIFIED | ChatGPT Q3; Gemini Q3; Claude Q3 | Transparency of the "why" matters; MacroFactor exposes logic, Carbon black-box | CONFIRMED YES — plain-English `WHY_LIBRARY weeklyCoach.js:254-297,:299` |
| AC-5 | TWO | ChatGPT Q6; Claude Q-LLM | Deterministic, manual (no-LLM) coaching is a trust asset; LLM carries hallucination/ED risk | CONFIRMED YES — coverage search (a negative can't be one file:line): grepped openai/anthropic/gpt/llm/completion/inference/gemini/bedrock/cohere/fetch(/axios/http-inference-URLs across the 9 coaching-decision files (weeklyCoach.js, nutritionEngine.js, coachApply.js, edPatternDetector.js, algorithms.js, planEngine.js, coachResponse.js, coachRegister.js, coachOutputZones.js) → 0 matches; no LLM/API/inference/network call in any |
| AC-6 | CONFLICT | ChatGPT Q5: no floors advertised · Claude: MacroFactor opt-in 1,200 · Gemini AC-F2: FFM ~30 kcal/kg (ONE/SINGLE-SOURCE, lemon8, mirrors our own spec → untrusted) | Competitor ED calorie-floor / refuse-deficit guardrail | CONFIRMED YES (Volyume side) — always-on tier-blind floors `nutritionEngine.js:119,:614,:792,:104,:808`; `coachApply.js:22`; `weeklyCoach.js:837-862,:1105-1163`; `edPatternDetector.js:30-36,:64`; `proGate.js:22-23` |
| AC-7 | ALL-THREE → VERIFIED | ChatGPT Q4; Gemini Q4; Claude | Pricing: MacroFactor ~$72/yr; Carbon ~$120/yr; RP ~$25–35/mo | N/A — Volyume pricing is Google Play Billing, out of scope |
| AC-8 | TWO | ChatGPT; Claude Q-algo-vs-human | Human-coach hybrid (Caliber, Future) is the premium alternative | CONFIRMED NO (deliberate) — coverage search: grepped human-coach/live-coach/coachChat/messageCoach/book-a-coach/consultation across src → no human-coach surface; only metaphor copy at WelcomeScreen.js:134 and ProUpgradeScreen.js:339 (where "coach" = the deterministic engine) → Q-AC2 |
| AC-9 | ONE / SINGLE-SOURCE (flagged) | Claude AC-F2 | Carbon ships a dedicated reverse-diet protocol (starts at maintenance) | CONFIRMED PARTIAL — diet-break + refeed `nutritionEngine.js:1041-1062` (wired `weeklyCoach.js:992-1010`); no explicit reverse-diet mode → Q-AC1 |
| AC-10 | ONE / SINGLE-SOURCE (flagged) | ChatGPT Q5 | Calorie-tracking↔ED-harm evidence is mixed (one RCT no increased risk) | context only; no Volyume feature action |

## OPEN QUESTIONS
- Q-AC1 (AC-9): Add an explicit reverse-diet mode, or is diet-break + refeed (`nutritionEngine.js:1041-1062`) sufficient? Single-source signal — founder call. files: nutritionEngine.js, CoachOutputScreen.js.
- Q-AC2 (AC-8): Human-coach hybrid is a deliberate non-feature (deterministic engine) — confirm no-action. Founder call.
