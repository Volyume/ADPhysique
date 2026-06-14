# PASS 3 — RETENTION (area RE)

Sources reconciled: `pass2-input-01-chatgpt.md`, `pass2-input-02-gemini.md`, `pass2-input-03-claude.md`.
Volyume gap resolved against Pass 1 only (file:line); absence-claims evidenced by coverage grep.

| ID | Agreement | Source(s) | Market finding | Volyume gap (Pass-1 file:line) |
|---|---|---|---|---|
| RE-1 | ALL-THREE → VERIFIED | ChatGPT Q1; Gemini Q1/K2; Claude Q1 | Streaks (especially flexible) + PR celebration retain | CONFIRMED YES — streak engine `lib/streak.js`, `lib/streakState.js`, `WeeklyStreakStrip.js`, `useWeeklyStreak.js`; PR celebration `PRCelebration.js` |
| RE-2 | TWO | Gemini Q3/K2; ChatGPT Q1 (MacroFactor no-shame) | Streak-freeze / "recovery moment" beats all-or-nothing guilt (the #1 churn trigger) | CONFIRMED YES (lead) — ED/wellbeing benign freeze `streak.js:20,:37 ('resting'),:38 (paused),:26`; non-shaming re-engagement `notifications/missedCheckin.js:5-9` ("you missed" banned) |
| RE-3 | ALL-THREE → VERIFIED | ChatGPT Q1; Gemini K1; Claude Q1 | Social accountability + wearable anchoring retain | CONFIRMED PARTIAL — partner accountability `src/lib/partners/ (link.js, service.js, sharedStreak.js, signals.js)`, `usePartners.js` (free 1 / Pro 3); wearable sync `health.js`; no broad social feed (coverage: grep socialFeed/followers/activity-feed in src → 0) → Q-RE1 |
| RE-4 | ALL-THREE → VERIFIED | ChatGPT Q3; Gemini Q4; Claude Q3 | Notifications: milestone/task-supporting good; generic/guilt/in-workout-popup bad | CONFIRMED YES — non-shaming re-engagement copy `notifications/missedCheckin.js:5-9`; streak milestones `lib/streakState.js` |
| RE-5 | ALL-THREE (direction) | ChatGPT Q2; Gemini Q2; Claude Q2/RE-F1/RE-F2 | Day-30 retention is single-digit-to-low; early window (first 2 weeks / <3 sessions) is the churn signal (numbers vary by source) | Market context; Volyume mitigations = streak/PR (RE-1) + onboarding funnel (cross-ref ON) |
| RE-6 | ONE / SINGLE-SOURCE (flagged) | Gemini K3 | Annual-subscription lock-in retains better (~33%) | CONFIRMED YES — pro_annual exists (Google Play Billing); out of feature scope (billing untouched) |
| RE-7 | ONE / SINGLE-SOURCE (flagged) | Claude RE-F3 | Strava "Challenges" raised 90-day retention 18%→32% | CONFIRMED NO — coverage: grep challenge/leaderboard in src → 0 (no challenges feature) → Q-RE2 |

## OPEN QUESTIONS
- Q-RE1 (RE-3): Broaden the partner mechanic to a social feed, or keep 1:1 partner accountability? Founder call. files: src/lib/partners/, usePartners.js.
- Q-RE2 (RE-7): Add challenges/leaderboards? Single-source signal — founder call.
