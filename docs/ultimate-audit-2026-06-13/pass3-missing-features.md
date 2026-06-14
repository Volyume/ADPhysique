# PASS 3 — MISSING-FEATURES (area MF)

Sources reconciled: `pass2-input-01-chatgpt.md`, `pass2-input-02-gemini.md`, `pass2-input-03-claude.md`.
Volyume gap resolved against Pass 1 only (file:line); absence-claims evidenced by coverage grep.

| ID | Agreement | Source(s) | Market finding | Volyume gap (Pass-1 file:line) |
|---|---|---|---|---|
| MF-1 | ALL-THREE → VERIFIED | ChatGPT Q1; Gemini MF-F1; Claude MF-F1 | Wearable sync (Apple Health/Health Connect) is table-stakes; reading HRV/sleep recovery is rare and most-wished | CONFIRMED PARTIAL — sync of steps/weight present `health.js` (Steps :454/:464, weight :361/:371), workout write `:517,:524`; HRV/sleep read ABSENT (coverage: grep hrv/heart-rate in health.js → 0) → Q-MF1 |
| MF-2 | ONE / SINGLE-SOURCE (flagged) | Gemini MF-F2 | Standalone (phone-free) watch app valued | CONFIRMED NO — watch bridge is for rest-timer haptic only `lib/watch/bridge.js`; no standalone watchOS/Wear app → Q-MF2 |
| MF-3 | ONE / SINGLE-SOURCE (flagged) | ChatGPT Q2 | Contest-prep / peak-week / posing tooling = white space (absent in competitors) | CONFIRMED PARTIAL — nutrition peak logic present (contest_prep phase `nutritionEngine.js:27-35`, refeed/diet-break `:1041-1062`, competition macro-cycle `weeklyCoach.js:1020-1050`); no posing/peak-week UI tool (coverage: grep posing/peak-week in screens → 0) → Q-MF3 |
| MF-4 | ONE / SINGLE-SOURCE (flagged) | Gemini MF-F3 | iOS/Android feature-parity disparity hurts competitors | CONFIRMED YES — Expo managed single codebase, cross-platform by construction (CLAUDE.md ARCHITECTURE) |
| MF-5 | ONE / SINGLE-SOURCE (flagged) | Claude MF-F3 | Apple 26 Mar 2026 medical-device declaration requirement | not code-resolvable → Q-MF4 (compliance/store-listing) |
| MF-6 | TWO | ChatGPT Q3; Gemini MF-F1 | Most-wished: HRV-driven volume; barcode-correction; more machines/substitutions; workout charts | CONFIRMED PARTIAL — HRV→volume = MF-1/Q-MF1; substitutions present `algorithms.js:772-812`; charts present `useProgressData.js` / `AnalyticsScreen.js` |

## OPEN QUESTIONS
- Q-MF1 (MF-1, MF-6): Add HRV/sleep read into the existing readiness path (`getRecoveryScore weeklyCoach.js:144-154`)? Pro per CLAUDE.md. files: health.js, weeklyCoach.js.
- Q-MF2 (MF-2): Build a standalone watch app, or keep the rest-timer bridge? Founder call. files: lib/watch/bridge.js.
- Q-MF3 (MF-3): Add a posing/peak-week UI tool on top of the existing nutrition peak logic? Founder call.
- Q-MF4 (MF-5): Apple medical-device declaration — compliance/store decision, not code. Founder/legal.
