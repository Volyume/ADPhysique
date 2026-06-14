# PASS 3 — AI / ALGORITHMIC COACHING (area AC)

Per instruction: ingest the three research docs (`pass2-input-01-chatgpt.md`, `-02-gemini.md`,
`-03-claude.md`), reconcile each finding ALL-THREE / TWO / ONE(SINGLE-SOURCE) / CONFLICT with the source(s)
that made it, then resolve against Pass 1 by file:line. The three tools have not seen our code — every
Volyume statement is from Pass 1 only; unresolved items go to open questions. ai-coaching only, then STOP.

## RECONCILED MARKET FINDINGS
| ID | Market finding | Agreement | Source(s) |
|---|---|---|---|
| AC-1 | Weekly check-in → auto-adjust-targets loop is the category standard (MacroFactor, Carbon, RP run it weekly) | ALL-THREE → VERIFIED | ChatGPT Q1; Gemini Q1; Claude Q1 |
| AC-2 | Frontier is split: nutrition coaches (MacroFactor, Carbon) adjust NUTRITION only; training engines (RP, JuggernautAI) adjust TRAINING only — none close both | ALL-THREE → VERIFIED | ChatGPT Q2; Gemini Q2; Claude Q2 |
| AC-3 | Adherence-NEUTRAL (MacroFactor) vs adherence-STRICT (Carbon won't adjust if you didn't comply); market favours neutral/no-guilt | ALL-THREE → VERIFIED | ChatGPT Q3/AC-F1; Gemini AC-F1; Claude AC-F1 |
| AC-4 | Transparency of the "why": MacroFactor exposes its expenditure logic; Carbon is strict/black-box | ALL-THREE → VERIFIED | ChatGPT Q3; Gemini Q3; Claude Q3 |
| AC-5 | Deterministic, manual-entry (no-LLM) coaching is a trust asset; LLM coaching carries hallucination/ED-safety risk | TWO | ChatGPT Q6; Claude Q-LLM |
| AC-6 | Whether competitors ship an ED calorie-floor / refuse-deficit guardrail | CONFLICT | ChatGPT Q5: listings do NOT advertise floors. Claude: MacroFactor has an *opt-in* 1,200 kcal floor. Gemini AC-F2: MacroFactor "strict floor ~1,200 / ~30 kcal/kg FFM" — single low-trust source (lemon8) whose numbers match our own product spec, so untrusted. Surfaced, not averaged. |
| AC-7 | Frontier pricing: MacroFactor ~$72/yr ($11.99/mo); Carbon ~$120/yr ($8.33–14.99/mo); RP ~$25–35/mo | ALL-THREE → VERIFIED | ChatGPT Q4; Gemini Q4; Claude |
| AC-8 | Human-coach hybrid (Caliber, Future) is the premium alternative; algorithm can't read stress/sleep/readiness like a human | TWO | ChatGPT; Claude Q-algo-vs-human |
| AC-9 | Carbon ships a dedicated reverse-diet protocol (starts at maintenance, ~50–100 kcal/wk up) | SINGLE-SOURCE — flag | Claude AC-F2 |
| AC-10 | Calorie-tracking↔ED-harm evidence is mixed (one RCT no increased risk) | SINGLE-SOURCE — flag | ChatGPT Q5 |

## GAP ANALYSIS vs VOLYUME (Pass 1 file:line only)
- **AC-1** → CONFIRMED YES. `runWeeklyCoach` is this loop: on-target test `weeklyCoach.js:577`, data gate
  `:585-586`, calorie-adjust steps `:773-785`.
- **AC-2** → CONFIRMED YES (Volyume closes both). Nutrition `weeklyCoach.js:773-785`; training volume/signal
  `:176-191`; steps `:873-883`; cardio `:913-914` — all off one weight trend.
- **AC-3** → CONFIRMED PARTIAL. Trend-driven (neutral-like), not guilt-based: stabilises on low engagement
  `weeklyCoach.js:620-621`; calorie change gated by cooldown/off-target `:668,:692-693`.
- **AC-4** → CONFIRMED YES. Plain-English reasons `WHY_LIBRARY weeklyCoach.js:254-297`; selected `pickWhy :299`.
- **AC-5** → CONFIRMED YES. Engine fully deterministic, no LLM (CLAUDE.md; Pass-1 Section 2 all hardcoded,
  `pass1-section2-engine-rules.md`).
- **AC-6** → CONFIRMED YES (Volyume side). Always-on, tier-blind floors: FFM `nutritionEngine.js:119,:614`;
  sex floor `:792` (1,500 M / 1,200 F); hard-gate loss `:104,:808`; apply floor `coachApply.js:22`; FFM-hold
  `weeklyCoach.js:837-862`; ED detector `edPatternDetector.js` + lockout `weeklyCoach.js:1105-1163`;
  tier-blind `proGate.js:22-23`. (Market side stays a CONFLICT — not resolved here.)
- **AC-7** → market context only; Volyume pricing is Google Play Billing — out of audit scope.
- **AC-8** → CONFIRMED NO (deliberate: deterministic engine, no human coach). → Q-AC2.
- **AC-9** → CONFIRMED PARTIAL. Diet-break + refeed exist `nutritionEngine.js:1041-1062` (wired
  `weeklyCoach.js:992-1010`); no explicit reverse-diet mode (grep `reverse.?diet` src → 0). Single-source
  finding, so flagged not settled → Q-AC1.
- **AC-10** → context for why the safety stack exists; no Volyume feature action.

## OPEN QUESTIONS
- Q-AC1 (AC-9): Add an explicit reverse-diet mode, or is diet-break + refeed (`nutritionEngine.js:1041-1062`)
  sufficient? Single-source signal — founder call. files: nutritionEngine.js, CoachOutputScreen.js.
- Q-AC2 (AC-8): Human-coach hybrid is a deliberate non-feature (deterministic engine). Confirm it stays a
  no-action. Founder call (architectural).

STOP — ai-coaching only, handed back for review before any other area.
