# Live store pages: what is published today (record dated 21 November 2026)

Task: LOC-662. Base commit of the app: `942a44e0d3b282c3f25a9073a95e56c95f956e08`. Nothing here was changed on either store; both pages were only read.

## How this was read

- **App Store (UK).** `https://apps.apple.com/gb/app/volyume/id6777083702` fetched as a public web page, and `https://itunes.apple.com/lookup?id=6777083702&country=gb` (the public lookup API), both on 2026-11-21 with no login.
- **Google Play (UK).** `https://play.google.com/store/apps/details?id=app.volyume&hl=en_GB&gl=GB` fetched as a public web page on 2026-11-21 with no login.
- Limits of what a public read shows: Apple's **promotional text** is not exposed by the public page or the lookup API. Apple's **keyword field** is never public. The **text inside screenshots** cannot be read as text. Play's **screenshot images** are not captioned in the page text. The wording below is exactly what the public sources returned.

## What the App Store page says

| Field | Published text |
| --- | --- |
| Name | Volyume |
| Subtitle | Precision Coaching |
| Price line | "Free · In-App Purchases" |
| In-app purchases listed | "Volyume Annual £19.99" and "Volyume Pro (Monthly) £1.99" |
| Version live | 3.0 (current version released 2026-10-18); release notes "Upgraded logger, community and share videos." |
| Rating | 1 UK rating, 5.0 |
| Category | Health & Fitness |
| Age rating | the web page shows 9+, the lookup API shows 4+ (not a wording claim; recorded because the two differ) |
| Screenshots | four; the file names, which carry the baked-in captions, are `01_Train_with_structure`, `02_Log_every_set_fast`, `03_Check_in_get_coached`, `04_See_the_full_picture` |
| Promotional text | not readable from public sources |

**Description (as published, 2,365 characters, section headings shown as run-in labels):**

> Volyume is a workout tracker, food diary and coaching app for serious lifters and physique athletes. Log every set in the gym, track your macros and calories, and get weekly coaching that learns from your training, nutrition and progress. One app for lifting, food and progress, instead of three.
>
> TRAIN. Build your own training plan or start from the plan library. Log every set, rep and weight with fast gym logging that works fully offline. Browse the exercise library, follow structured training plans, and watch your strength climb with personal bests, lift progress and volume by muscle. Built for hypertrophy and strength training, with tools to help you manage progressive overload.
>
> EAT (Pro). A food diary with a barcode scanner and a large food database. Track macros, calories, protein, carbs and fat against targets worked out from your body, your training and your goal. Get meal suggestions, build recipes, and keep your nutrition on track without the guesswork.
>
> COACHING (Pro). Every week, a short check-in brings together your weight trend, nutrition, training performance and recovery. Precision Coaching looks for real patterns in your data and can recommend changes to calories, training volume or recovery when the evidence supports them, explaining what it thinks should change and why. You remain in control of whether those changes are applied.
>
> Built for cutting, gaining muscle, maintenance and physique-focused training, with safeguards designed to avoid reacting to isolated weigh-ins or one bad session.
>
> PROGRESS. See your morning weight trend, body metrics and progress photos in one place. Follow your lifting progress, personal bests and training volume with clear charts showing how things are changing over time.
>
> WHO IT'S FOR. Serious lifters, bodybuilders and physique athletes who want one app for training, nutrition and coaching, in plain numbers with no fluff.
>
> FREE. Plan library, custom plan builder, unlimited workout logging, exercise library, personal bests and training progress. No time limit.
>
> PRO. Food diary, macros, nutrition targets, weekly check-ins and Precision Coaching. Includes a 14-day Pro trial, then a monthly subscription if you choose to subscribe.
>
> Made in the UK. Works in kg and stone. Built for the way you actually train.

## What the Google Play page says

| Field | Published text |
| --- | --- |
| Title | Volyume |
| Short description | "A bodybuilding coach in your pocket." |
| Price line | the page shows an "In-app purchases" label; the page data holds "£1.99 – £19.99 if billed through Play" |
| Installs | "50+" |
| Last updated | 19 Oct 2026; the page data also holds version 3.1.0 |
| Content rating | PEGI 3 |
| Category | Health & Fitness |
| Screenshot captions | not readable as text from the public page |

**Full description (as published):**

> Volyume builds your training and nutrition plan, then adjusts it every week based on how you're actually doing.
>
> Tell Volyume your goal, your schedule, and your equipment. It builds a plan around you from day one, the right split, the right volume, the right calories and macros for your phase.
>
> Every week, check in. Volyume reads your progress and makes changes. More volume when you're recovering well. Less when you're not. Nutrition targets that shift with your goal. A plan that moves with you, not against you.
>
> WHAT'S INCLUDED: Personalised training plans built for your goal, experience, and schedule; Precision Coaching that adjusts your plan after every weekly check-in; Calorie and macro targets calculated for your phase, with full explanations; Smart food suggestions sized to fit your remaining targets for each meal; Food diary with barcode scanning, water logging, and copy-yesterday; Cardio and steps tracking; Progress monitoring across sessions, volume, and personal bests; Competing? Select your division and your plan prioritises the muscles that win it; Safety checks throughout, the coach monitors for concerning patterns and steps in when needed.
>
> FREE FOREVER: Training plans from the Plan Library; Custom training builder; Unlimited workout logging; Exercise library and personal bests; Progress tracking.
>
> PRO, 14 DAYS FREE, NO CARD NEEDED: Full coaching system; Weekly check-ins with written rationale for every change; Food diary and nutrition targets; Barcode scanning and smart meal suggestions; Cardio and steps tracking; Precision Coaching that adjusts training and nutrition weekly.

(The published text uses long dashes as bullet markers; they are shown here as semicolons for the record.)

## Statements that are untrue of the app at the base commit

"Proof" is a file at `942a44e0d3b282c3f25a9073a95e56c95f956e08`.

| # | Store | Published statement | Why it is untrue | Proof |
| --- | --- | --- | --- | --- |
| 1 | App Store | "EAT (Pro)", "COACHING (Pro)", "PRO: Food diary, macros, nutrition targets, weekly check-ins and Precision Coaching", and the FREE/PRO split | There is no Pro tier. Every feature is open to everyone. | `src/lib/proGate.js:43` (`FULL_ACCESS_FOR_ALL = true`); `CLAUDE.md` section 1 "Tier" and section 2 "The product is fully free" (D137, 2026-09-03) |
| 2 | App Store | "Includes a 14-day Pro trial, then a monthly subscription if you choose to subscribe" | No trial, no subscription is offered. The billing code is dormant and refuses every call. | `src/lib/payments/index.js` (barrel refuses while the flag is on); `src/lib/proGate.js:43`; `CLAUDE.md` section 1 "Payments (DORMANT since D137)" |
| 3 | App Store | In-app purchases "Volyume Annual £19.99" and "Volyume Pro (Monthly) £1.99", and the "Free · In-App Purchases" line | The app sells nothing. The two products are leftovers in App Store Connect. (Console action, not wording: see `05-store-figures-and-setup.md`.) | `src/lib/payments/index.js`; `CLAUDE.md` section 1 "Payments", "Tier" |
| 4 | Google Play | "PRO, 14 DAYS FREE, NO CARD NEEDED" and the whole FREE FOREVER / PRO split | Same as 1 and 2. "FREE FOREVER" is also a promise about the future that the company has not made. | `src/lib/proGate.js:43`; `CLAUDE.md` section 2 |
| 5 | Google Play | The "In-app purchases £1.99 – £19.99" label | Same as 3. | `src/lib/payments/index.js` |
| 6 | Google Play (twice) | "Cardio and steps tracking" | Cardio logging was removed. The app has no step counter: the coach sets a steps **target**, it does not track steps. | `docs/TASKBOARD.md` section 3 item H4 ("Cardio logging is removed from the app ... listings still promise cardio"); `src/screens/WeeklyCheckInScreen.js:944-946` (cardio adherence no longer collected); `src/lib/weeklyCoach.js:438` (steps target bands) |
| 7 | App Store | "weekly coaching that learns from your training, nutrition and progress" | The coach has no learning. Copy must not say it learns. | `CLAUDE.md` section 2 "The coaching engine is deterministic. No AI. Ever."; `docs/WHAT-VOLYUME-ACTUALLY-DOES.md` lines 26 and 129 ("not learned"; copy may not say it "learns") |
| 8 | App Store | "Precision Coaching looks for real patterns in your data ... when the evidence supports them" | The weekly coach applies fixed rules to this week's numbers. It does not search for patterns. | `src/lib/weeklyCoach.js` (`runWeeklyCoach`, pure rules); `docs/WHAT-VOLYUME-ACTUALLY-DOES.md` section 1 and 6 |
| 9 | Google Play | "Precision Coaching that adjusts your plan after every weekly check-in" / "Volyume reads your progress and makes changes" | By default the coach **suggests** and the person taps Apply. Changes apply on their own only in Coached mode, and not while a safety hold is open. | `src/screens/SettingsCoachingScreen.js:49, 236`; `src/screens/CoachOutputScreen.js:990-991, 2617` |
| 10 | App Store | "meal suggestions" and Play "Smart food suggestions sized to fit your remaining targets for each meal" | Not traced to a feature. The code has meal **plans** (seven dated days with a shopping list), not per-meal remaining-target suggestions. Treated as unproven and left out of the new wording. | `src/screens/MealPlanScreen.js:1341, 1711` |
| 11 | Google Play | Short description "A bodybuilding coach in your pocket." | Not false, but it says "bodybuilding" only and says nothing a lifter types in search. Replaced for search, not for truth. | `src/lib/coachingGoals.js:29-104` (competition categories include bodybuilding, so the word is supported) |

Statements checked and found true at the base commit (kept or reused in the new wording): barcode scanning (`src/screens/ScanBarcodeScreen.js`), label scanning (`src/screens/ScanLabelScreen.js`), water logging and "copy yesterday" (`src/screens/DiaryScreen.js:9`), personal bests, progress photos kept on the phone (`src/screens/WelcomeScreen.js:147`), "Competing? Select your division" (`src/screens/ProOnboardingScreen.js:3285`; `src/lib/coachingGoals.js:29-104`), stone and kg (`src/screens/SettingsUnitsScreen.js:17-21`), fully offline logging (`CLAUDE.md` section 1 "Storage: offline-first").

## A fact the wording cannot fix by itself

- Apple's **subtitle, keyword field and description** change only with a new version submitted from a build (evidence-1, section C), and builds are run by the founder only. Apple's **promotional text** can change at any time.
- Google Play listing text changes need **no build** and go through Play's own review (hours to seven days).
- Live builds are older than the base commit: App Store 3.0 (code version 3.0.0 is dated 2026-10-17), Google Play about 3.1.0 (2026-10-18), against 3.4.0 in the code. The new wording keeps to features that exist in the base commit. Only one claim rests on code newer than 3.1.0, the six training styles (`src/lib/trainingArchetypes.js`, first committed 2026-10-19); `02-store-wording.md` marks it.
