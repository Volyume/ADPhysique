# Search phrases and the monthly position check

Task: LOC-662. Source for the phrases: `evidence-1-store-search` on LOC-583 (section B, measured 20 Nov 2026), plus ten autocomplete lookups on 21 Nov 2026 (the same public App Store "search hints" endpoint, one lookup per seed: hypertrophy training, progressive overload app, bodybuilding planner, bodybuilding workout, muscle building, workout log, weightlifting, lifting, meal planner macros, weekly coach). That is ten lookups and no web searches. No new research exercise was run.

## The phrase list (22 lines: 21 phrases and one brand control)

The file the script reads is `phrases.tsv` (column 1 is the phrase). Basis codes: **M-top10** measured in the UK iTunes Search API top 10 on 20 Nov 2026; **M-hint** returned by the UK App Store autocomplete; **D** derived long-tail variant, not itself measured; **C** control.

| # | Phrase | Why it was chosen | Basis |
| --- | --- | --- | --- |
| 1 | hypertrophy | The head phrase for muscle-gain lifters. 5 of the top 10 UK results had 0 UK ratings and the phrase is in most of their names, so a new app can enter. Volyume plans weekly sets per muscle. | M-top10, M-hint |
| 2 | hypertrophy training | Autocomplete returned "hypertrophy training" with an app name in front, so people type the two words together. | M-hint (21 Nov) |
| 3 | hypertrophy tracker | Autocomplete for "hypertrophy" returned "hypertrophy tracker" twice (two different apps). | M-hint |
| 4 | progressive overload | 6 of the top 10 had 4 or fewer UK ratings. Volyume suggests the next weight and reps for each set. | M-top10, M-hint |
| 5 | progressive overload workout | Autocomplete returned it for "progressive overload". | M-hint |
| 6 | progressive overload tracker | Natural pairing of the measured phrase with the word lifters use for a log. Not measured. | D |
| 7 | bodybuilding | Broad term; the top 10 held one 0-rating app at #8. Volyume has division-specific plans (men's physique, classic, bodybuilding and others). | M-top10 |
| 8 | bodybuilding workout | Autocomplete returned "bodybuilding workouts" and "fitness & bodybuilding workout". | M-hint (21 Nov) |
| 9 | bodybuilding planner | The phrase named in the LOC-662 brief. Autocomplete returned nothing for it on 21 Nov, so treat it as a watch phrase, not a target. | D, weak |
| 10 | gym log | Top 10 held 0-rating apps at #5 and #9. Volyume is a set-by-set log. | M-top10, M-hint |
| 11 | workout log | Autocomplete returned "workout log free", "workout logger" and several named apps. | M-hint (21 Nov) |
| 12 | workout tracker | The biggest generic phrase measured; the top 10 mixes large apps and two apps with 10 or 11 ratings. | M-top10, M-hint |
| 13 | workout tracker free | Autocomplete lists the "free" variant first for most seeds; Volyume is free. | M-hint |
| 14 | workout planner | Top 10 included a 26-rating app and a 1-rating app. Volyume builds a plan from goal, days and equipment. | M-top10 |
| 15 | gym planner | Top 10 included apps with 1, 7 and 26 ratings. | M-top10 |
| 16 | weight lifting log | Most of the top 10 had 0 to 12 ratings. | M-top10 |
| 17 | weight lifting tracker | First autocomplete result for "weight lifting". | M-hint |
| 18 | strength training | Head term. No low-rating app in the top 10 on 20 Nov, so a control for how far Volyume is from a head term. | M-top10, C |
| 19 | macro tracker | Top 10 held one low-rating app at #7. Volyume works out calorie and macro targets and logs food. | M-top10 |
| 20 | calorie counter free uk | Autocomplete returned "calorie counter free uk" (the only UK-worded hint seen). Volyume uses UK food data. | M-hint |
| 21 | muscle building | Autocomplete returned nine suggestions, including "muscle building food tracker". | M-hint (21 Nov) |
| 22 | volyume | Brand control. Volyume was #1 on 20 Nov. If this ever falls, something is wrong with the listing. | C |

What the evidence does and does not say about these phrases: on the long-tail ones (hypertrophy, progressive overload, gym log, weight lifting log) apps with zero UK ratings already sit in the top 10, almost always because the phrase is in the app's name, so a new app can enter. It is **not** evidence that those positions produce installs; the same apps have gathered no ratings. Absolute UK search counts for any phrase cannot be obtained from any source (evidence-1, section c). "bodybuilding planner" and "progressive overload tracker" are watch phrases, not targets.

## Monthly position check

```
node scripts/store-position-check.cjs --out docs/growth-store-2026-11
```

- Reads `docs/growth-store-2026-11/phrases.tsv`, asks the public iTunes Search API (UK storefront, software, top 50) for each phrase, one at a time, with a 3.5 second pause (about 17 requests a minute, under Apple's documented 20), and backs off on 403, 429 and server errors. **No credential of any kind**, no account, no dependency.
- Writes `positions-YYYY-MM-DD.md` and prints the same table. The output says in its own header that the order is an **approximation** of what a person sees in the App Store app (personalised, changes daily) and says nothing about installs. The API returns fewer than 50 rows for most phrases because it removes duplicates, which is why the "results returned" column is below 50 (36 to 50 in the baseline).
- Exit code 1 if any phrase could not be read after three tries, so a half-empty month is never filed as a clean one.
- Run it in the first three days of each month and compare with the previous file. Read movement between months, not one rank. Google Play has no public search API, so this check covers the App Store only; the Play side is read from Play Console (`05-store-figures-and-setup.md`).
- Tests: `scripts/__tests__/storePositionCheck.test.js` (recorded responses in `scripts/__tests__/fixtures/`).

## Baseline, run for real on 2026-11-21 (before any wording changed)

### Output of the run

Storefront: GB. Depth: top 50. Source: the public iTunes Search API (entity software), no credentials.

**This is an approximation.** The API order approximates, and is not guaranteed to equal, the order shown in the App Store app, which is personalised and changes daily. Compare month to month; do not quote one rank as fact. A position says nothing about installs.

Volyume appears in the top 50 for 1 of 22 phrases.

| Phrase | Volyume position | Results returned | Top result |
| --- | --- | --- | --- |
| hypertrophy | not in top 50 | 49 | RP Hypertrophy |
| hypertrophy training | not in top 50 | 48 | RP Hypertrophy |
| hypertrophy tracker | not in top 50 | 50 | AANA: Hypertrophy Tracker |
| progressive overload | not in top 50 | 47 | Hevy - Gym Tracker Workout Log |
| progressive overload workout | not in top 50 | 48 | Progressive Overload Workout |
| progressive overload tracker | not in top 50 | 46 | Gym Progressive Overload Track |
| bodybuilding | not in top 50 | 45 | Bodybuilding.com - Fitness App |
| bodybuilding workout | not in top 50 | 44 | Bodybuilding.com - Fitness App |
| bodybuilding planner | not in top 50 | 47 | JEFIT Gym Workout Planner |
| gym log | not in top 50 | 48 | Hevy - Gym Tracker Workout Log |
| workout log | not in top 50 | 48 | Hevy - Gym Tracker Workout Log |
| workout tracker | not in top 50 | 47 | Hevy - Gym Tracker Workout Log |
| workout tracker free | not in top 50 | 47 | RepCount - Gym Workout Tracker |
| workout planner | not in top 50 | 47 | Strong Workout Tracker Gym Log |
| gym planner | not in top 50 | 47 | Strong Workout Tracker Gym Log |
| weight lifting log | not in top 50 | 48 | Weightlifting App: GymKing |
| weight lifting tracker | not in top 50 | 49 | Hevy - Gym Tracker Workout Log |
| strength training | not in top 50 | 48 | Muscle & Motion: Strength |
| macro tracker | not in top 50 | 48 | MyFitnessPal: Calorie Counter |
| calorie counter free uk | not in top 50 | 46 | Calorie Counter + |
| muscle building | not in top 50 | 47 | Fitbod Workout & Gym Planner |
| volyume | 1 | 36 | Volyume |

Reading it: Volyume is not in the UK top 50 for any of the 21 non-brand phrases today, and is first for its own name. That is the expected starting point for an app whose live subtitle is "Precision Coaching" and whose live Play title and short description contain none of these phrases. It is the number to beat after the wording goes live: Play text can change without a build, Apple's subtitle and keywords change with the next build.
