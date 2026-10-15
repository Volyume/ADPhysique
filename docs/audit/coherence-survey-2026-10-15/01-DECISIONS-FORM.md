# Founder answer sheet (survey of 2026-10-15)

Reply in chat with one letter per line, for example "P1-C, P2-c, P3-C".
Anything left blank stays as it is today. Nothing is built until you answer.

## P1. Community default and the first automatic post
Reverses or keeps your order of 2026-09-26 ("on for all users by default").
- A. Adults default to Followers (server fallback, client default, onboarding literal, policy copy and its guard test all move together).
- B. Keep on and Everyone, but the first automatic post waits for a one-time confirmation on the workout summary: Everyone / Followers / Not now.
- C. Keep the default; add a one-time post-join receipt on the Hub stating the audience with a direct "Change who sees this" link.
- D. Keep the default; add a ten-minute Undo on the summary strip for the automatic post.
- Combinations are fine, for example B+C.
- Fixed under every answer unless you say otherwise: the strip's wording follows the real audience; an unreadable sharing store stops the post instead of posting; the audience chosen at Join travels in the create call.

## P2. What calm mode and an open flag mean on nutrition surfaces
The helper that unifies the three suppression reads proceeds under D33 unless you stop it.
- a. Hide the numbers under calm and under a flag. Reverses the calm toggle's own copy ("your numbers do not change") and D75 ("never re-propose hiding the rings").
- b. Numbers stay; a calm banner with the Beat signpost on the Diary, Food Insights, Nutrition targets (floor banner and energy caution), the FFM hold and the wellbeing check's positive result.
- c. Two tiers: under calm, totals stay and valence goes quiet (no "over target", no adherence counts, no "vs last week"); under a flag, also withhold the weight-change figures that still print (coach chip, check-in trend, athlete profile tile, lift ratios, Today prefill). Rings and daily kcal stay.
- d. Helper only for now; revisit after the device walk.

## P3. The recap share card's "weight lost this week"
Reverses or keeps your correction of 2026-06-22 (the real number on a safe, on-target week).
- A. Remove the weight hero and the "lost N kg" clause; lead with best lift, PRs, sessions.
- B. Replace with a non-weight hero ("right on target" with sessions, or the best lift).
- C. Keep it under the fail-closed suppress and fix the four incoherences (CTA gate reads calm and an open flag; the toggle starts off; the figure prints in your body-weight unit; the phase label drops under suppress).
- D. Keep it, opt-in only, rounded to the nearest half kilogram, no coach clause.

## P4. Notifications after a flag
The minimal change proceeds under D33 unless you say otherwise: meal reminders and the planned-meal confirm are cancelled when a flag is raised and re-laid when it clears, and the planned-meal confirm gets a foreground check.
- i. Also cancel them on a second device when a pulled flag opens a local row.
- ii. Calm mode also silences meal and weigh-in prompts (changes calm's contract from "quieter progress prompts").
- iii. Bound the meal reminders to a dated run like the weigh-ins.
Tick any, none or all.

## P5. When the plan builder refuses
- A. A chooser on every refusal: the day-count and length rows that exist, plus "Allow more equipment", "Review avoided movements", "Build it yourself", and the plain muscle shortfall.
- B. Dead ends only: the Today card's navigate fixed, the onboarding failure alert carries the reason and a direct retry, the preview sheet always offers "Change my setup".
- C. A plus telemetry (refusal reason codes, no PII).
Apply paths: leave as recorded / give library and kit plans facts at copy / show a "no candidates" line on the check-in card instead of placing nothing silently.

## P6. Orphans (one answer each: delete / re-wire / leave)
- CoachReview (lost its caller under D224).
- MealNames (row removed by your order of 2026-07-13; re-wire reverses it).
- SettingsHealth and the health stub (re-wire would need native modules; not offered).

## P7. Cardio
D92 item 1 is a standing boundary: "no campaign may re-enable cardio routes or surface cardio UI".
- A. Boundary stands; the stale comment is corrected; the pull stays to protect cloud history.
- B. Re-open with the lightest surface: a "Log activity" sheet from the Train tab or workout summary, no kcal estimate shown, push handler added.
- C. Re-open with an inline Diary "Activity" row (same writer).
Removing the table is not offered (schema stays additive).

## P8. iOS widget copy
- A. Hide the widget row on iOS and make the FAQ Android-only until an iOS widget ships.
- B. Keep the row on iOS with honest copy ("Widgets are on Android. iOS widgets are on the way.").
- C. Wire the iOS extension (needs your App ID and App Group provisioning first; a build risk the test records).
Stale comments and doc lines are corrected under every answer.

## P9. The logger screen split and the small improvements
First cut (phase one is behaviour-identical and must pass the 58 source guards, the 35 mount tests and the full gate):
- A. Extract the rest flow.
- B. Extract set entry (collides with two guard pins that would be re-pointed).
- C. Extract PR detection (collides with the PR guard regexes).
- D. Leave intact for now.
- E. Move the sheets and modals out first (about 1,100 lines of JSX; no guard pin lives in that range).
Small improvements, tick any: 1 planned-meal toast count; 2 "Use last session for this exercise"; 3 tick-all for supersets and per-side work.

## Outstanding device checks on the board (no decision, for your list)
- Calorie slider, private training status and gain settling (checklist given in chat 2026-10-12).
- Sentry clear, Today without recovery data, muscle detail redesign (no recorded device result).
- The device-walk backlog (TASKBOARD section 3) and the iOS crash-fix walk.
- The Community level-up build, then the ED-flag walk.
