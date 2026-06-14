# PASS 3 — EXERCISE-LIBRARY (area EL)

Sources reconciled: `pass2-input-01-chatgpt.md`, `pass2-input-02-gemini.md`, `pass2-input-03-claude.md`.
Volyume gap resolved against Pass 1 only (file:line); absence-claims evidenced by coverage grep.

| ID | Agreement | Source(s) | Market finding | Volyume gap (Pass-1 file:line) |
|---|---|---|---|---|
| EL-1 | TWO | Gemini EL-F3; ChatGPT Q1 | Demo norm = HD video / looping (soundless) animation per exercise | CONFIRMED NO — coverage: exercises table has no video/image/media column `database.js:78-92` (name/primary_muscle/secondary_muscles/equipment only) → Q-EL1 |
| EL-2 | TWO | ChatGPT Q1/Q2; Claude EL-F1/EL-F2/EL-F3 | Library-size bar ~250 (specialist) → ~1,400 (JEFIT breadth); third-party counts often wrong | CONFIRMED PARTIAL — library seeded `seedExercises.js`; exact count not parseable by grep → Q-EL2 |
| EL-3 | TWO | Gemini EL-F1; ChatGPT Q3 | Custom-exercise creation expected (Hevy caps free at 7) | CONFIRMED YES — custom exercises supported: `is_custom database.js:91`, create/delete `:1493,:1535` |
| EL-4 | TWO | Gemini EL-F2; ChatGPT Q3 | Smart real-time substitutions (equipment busy) without breaking tracking | CONFIRMED YES — `getExerciseSubstitutes algorithms.js:772-812` (same primary muscle, equipment-aware, top-3) |
| EL-5 | ONE / SINGLE-SOURCE (flagged) | ChatGPT Q4 | Form-cue / common-mistake content per exercise | CONFIRMED YES (text) — per-exercise form tips `lib/formTips.js:1 (FORM_TIPS)`; no video (see EL-1) |

## OPEN QUESTIONS
- Q-EL1 (EL-1, cross-ref NE-3): Add exercise demo media (video/animation)? The exercises table has no media column. Founder call. files: database.js, ExerciseDetailScreen.js.
- Q-EL2 (EL-2): Exact library count vs the 250–1,400 bar — measurable at build from the seed. files: seedExercises.js.
