# PASS 3 — NEWBIE-EXPERIENCE (area NE)

Sources reconciled: `pass2-input-01-chatgpt.md`, `pass2-input-02-gemini.md`, `pass2-input-03-claude.md`.
Volyume gap resolved against Pass 1 only (file:line); absence-claims evidenced by coverage grep.

| ID | Agreement | Source(s) | Market finding | Volyume gap (Pass-1 file:line) |
|---|---|---|---|---|
| NE-1 | ALL-THREE → VERIFIED | ChatGPT Q2; Gemini NE-F1; Claude NE-F1 | Jargon (RIR/MEV/mesocycle) is the primary beginner barrier; explain inline or hide behind "advanced" | CONFIRMED PARTIAL — plain-English coach copy `WHY_LIBRARY weeklyCoach.js:254-297`; inline tooltips `components/InfoTooltip.js` (used `ProgressSections.js:257`); comprehensive jargon-label coverage not audited → Q-NE1 |
| NE-2 | TWO | Gemini NE-F2; ChatGPT Q3 | Beginners need guidance, not a blank canvas (auto-progression, prescribed first session) | CONFIRMED YES — auto-progression `algorithms.js:354-438`; prescribed plans `planEngine.js` + Plan Library `seedRoutines.js:33` |
| NE-3 | TWO | Gemini NE-F3; ChatGPT Q3 | Inline form video/demo builds execution confidence | CONFIRMED NO (video) — no exercise demo media; form tips are text `lib/formTips.js:1` (cross-ref EL-1) → Q-EL1 |
| NE-4 | TWO | Claude NE-F2; ChatGPT Q4 | Progressive disclosure + immediate first-session win | CONFIRMED PARTIAL — experience tiers `nutritionEngine.js:709-723`, `planEngine.js:69-72`; UI disclosure + first-session timing cross-ref SC/ON → Q-SC1 |

## OPEN QUESTIONS
- Q-NE1 (NE-1): audit in-app labels/tooltips for jargon-free coverage beyond the coach copy + Progress tooltip. files: src/screens (coach/plan), src/components.
