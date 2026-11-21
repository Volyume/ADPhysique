# Corrected wording for both stores

Task: LOC-662. Everything here is a **draft for the founder to paste; nothing is published by this task.** Each field below is stored verbatim as a text file in `docs/growth-store-2026-11/wording/`; `scripts/__tests__/storeWording.guard.test.js` checks the counts, the limits, the banned words and that this page matches those files.

## Limits and counts

Limits are the ones recorded in `evidence-1-store-search` (sections C and OP3): Google Play title 30, short description 80, full description 4,000; App Store name 30, subtitle 30, keyword field 100, promotional text 170, description 4,000. Counts are characters (the keyword field counts commas; Apple counts bytes and this text is plain ASCII, so characters equal bytes).

| Store | Field | File | Count / limit |
| --- | --- | --- | --- |
| Google Play | Title | `play-title.txt` | 30 / 30 |
| Google Play | Short description | `play-short-description.txt` | 75 / 80 |
| Google Play | Full description | `play-full-description.txt` | 2393 / 4000 |
| App Store | Name (unchanged) | (not changed) | 7 / 30 ("Volyume") |
| App Store | Subtitle | `apple-subtitle.txt` | 28 / 30 |
| App Store | Keyword field | `apple-keywords.txt` | 98 / 100 |
| App Store | Promotional text | `apple-promotional-text.txt` | 163 / 170 |
| App Store | Description | `apple-description.txt` | 2393 / 4000 |

The name "Volyume" does not change on either store. On Google Play the descriptive phrase after it is part of the title. On the App Store the phrase sits in the subtitle (Apple indexes name, subtitle and keywords together), and the keyword field holds the words not already in the name or subtitle, with no repeats, as Apple's guidance asks (evidence-1, section C).

## Google Play

**Title** (`play-title.txt`)

```
Volyume: Hypertrophy & Gym Log
```

**Short description** (`play-short-description.txt`)

```
Hypertrophy planner, gym log and food diary. Weekly decisions with reasons.
```

**Full description** (`play-full-description.txt`)

```
Volyume is a free workout tracker, food diary and weekly coach for lifters who plan their own training. It builds your hypertrophy training plan, logs every set, tracks your food, and every week makes the training and nutrition decision and shows you why.

It runs on fixed rules, not AI. The same numbers give the same decision every time, and the reason is written down.

TRAIN
• Build a workout planner from your goal, 2 to 6 training days a week, session length, equipment and experience. Or pick a ready-made plan from the library, or build your own.
• Six training styles for building muscle: Balanced, V-taper, X-frame, Upper-body density, Powerbuilder and Minimalist.
• Competing in bodybuilding or physique? Choose your division and the plan puts the priority on the muscles that matter for it.
• A gym log for every set: working sets, warm-ups, drop sets, myo-reps, rest-pause and AMRAP, with a rest timer. It works without a signal.
• Progressive overload built in. From your second session, Volyume suggests a weight and a rep target for each set from your last comparable session. You can type over it.
• Plans for hypertrophy and strength training, with the weekly sets set for each muscle.

WEEKLY CHECK-IN
• Tell Volyume how your week went: energy, sleep, stress, soreness, joint pain and how closely you followed the plan.
• It proposes changes to your training volume, your daily calories and your steps target, and writes down why. When it holds a change back, it says why.
• You stay in charge. Nothing applies itself unless you choose Coached mode, and even then anything safety-related waits for you.

NUTRITION
• A calorie counter and macro tracker: search foods, scan barcodes, scan nutrition labels, save meals, build recipes and log water.
• Built on UK food data.
• Calorie and macro targets worked out from your body, your goal and your activity level.
• Meal plans built by fixed rules from UK meals, your saved meals and your recipes, with a shopping list.

PROGRESS
• Lifts, personal bests, volume and recovery for each muscle, weight trend, body measurements and progress photos.
• Your progress photos and workout videos stay on your phone.

COMMUNITY
• Follow other lifters, share sessions, join groups and send messages.

MADE FOR LIFTERS IN THE UK
• Lifts in kg, body weight in stone, kg or pounds, British English.
• No ads.

Questions: support@volyume.app
```

Play rules kept (evidence-1, OP3 item 8): no emoji, no "#1", "best", "popular" or "new", no price or promotion text, no repeated keywords, no testimonials. The title and short description do not say "free" (Play restricts price and promotion text there); "free" appears once, in the first line of the full description, as a plain fact. That is an assumption from the policy page read (evidence-1 line 53); if Play's review rejects it, delete the word "free" from that line and nothing else changes.

## App Store

**Subtitle** (`apple-subtitle.txt`)

```
Hypertrophy training planner
```

**Keyword field** (`apple-keywords.txt`)

```
progressive,overload,gym,log,bodybuilding,workout,tracker,macro,calorie,counter,food,diary,uk,free
```

**Promotional text** (`apple-promotional-text.txt`; changeable at any time, no new version)

```
Each week Volyume makes the training and food decision and shows you why. Fixed rules, no AI. Free, with no ads. Plan your split, log every set, track your macros.
```

**Description** (`apple-description.txt`)

```
Volyume is a free workout tracker, food diary and weekly coach for lifters who plan their own training. It builds your hypertrophy training plan, logs every set, tracks your food, and every week makes the training and nutrition decision and shows you why.

It runs on fixed rules, not AI. The same numbers give the same decision every time, and the reason is written down.

TRAIN
• Build a workout planner from your goal, 2 to 6 training days a week, session length, equipment and experience. Or pick a ready-made plan from the library, or build your own.
• Six training styles for building muscle: Balanced, V-taper, X-frame, Upper-body density, Powerbuilder and Minimalist.
• Competing in bodybuilding or physique? Choose your division and the plan puts the priority on the muscles that matter for it.
• A gym log for every set: working sets, warm-ups, drop sets, myo-reps, rest-pause and AMRAP, with a rest timer. It works without a signal.
• Progressive overload built in. From your second session, Volyume suggests a weight and a rep target for each set from your last comparable session. You can type over it.
• Plans for hypertrophy and strength training, with the weekly sets set for each muscle.

WEEKLY CHECK-IN
• Tell Volyume how your week went: energy, sleep, stress, soreness, joint pain and how closely you followed the plan.
• It proposes changes to your training volume, your daily calories and your steps target, and writes down why. When it holds a change back, it says why.
• You stay in charge. Nothing applies itself unless you choose Coached mode, and even then anything safety-related waits for you.

NUTRITION
• A calorie counter and macro tracker: search foods, scan barcodes, scan nutrition labels, save meals, build recipes and log water.
• Built on UK food data.
• Calorie and macro targets worked out from your body, your goal and your activity level.
• Meal plans built by fixed rules from UK meals, your saved meals and your recipes, with a shopping list.

PROGRESS
• Lifts, personal bests, volume and recovery for each muscle, weight trend, body measurements and progress photos.
• Your progress photos and workout videos stay on your phone.

COMMUNITY
• Follow other lifters, share sessions, join groups and send messages.

MADE FOR LIFTERS IN THE UK
• Lifts in kg, body weight in stone, kg or pounds, British English.
• No ads.

Questions: support@volyume.app
```

The App Store description is deliberately the same text as the Play full description, so a fact is corrected in one place and the other copied. The name, subtitle and keywords are version fields: they take effect only with the next build the founder submits. The promotional text can go live straight away.

## Claim by claim: what each public statement rests on

"Proof" is a file at base commit `942a44e0d3b282c3f25a9073a95e56c95f956e08`. A reviewer should open each file.

| # | Statement in the new wording | Proof |
| --- | --- | --- |
| 1 | "free", "No ads" | `src/lib/proGate.js:43` (`FULL_ACCESS_FOR_ALL = true`); `src/screens/WelcomeScreen.js:146` ("Completely free · No ads"); no ad SDK in `package.json` (dossier 5i) |
| 2 | "fixed rules, not AI"; "same numbers give the same decision every time, and the reason is written down" | `src/screens/WelcomeScreen.js:148` ("Your coach isn't an AI chatbot. It follows fixed rules."); `CLAUDE.md` section 2 ("deterministic. No AI. Ever."); `src/lib/weeklyCoach.js` (pure, `runWeeklyCoach`) |
| 3 | "workout tracker, food diary and weekly coach" | `src/screens/DiaryScreen.js` (food diary); `src/lib/weeklyCoach.js` and `src/screens/WeeklyCheckInScreen.js` (weekly check-in and coach); the set logger `src/screens/ActiveWorkoutScreen.js` |
| 4 | "builds your hypertrophy training plan" / "Plans for hypertrophy and strength training, with the weekly sets set for each muscle" | `src/lib/structure/engine.js` (the live plan builder; refuses or returns a plan); `src/lib/planEngine.js` (sets per muscle against minimum and maximum volume landmarks, MEV/MAV/MRV, dossier 1.3); focus goals include lean gain, bulk and strength/size, `src/lib/coachingGoals.js:231-291` |
| 5 | "from your goal, 2 to 6 training days a week, session length, equipment and experience" | `src/lib/structure/engine.js:324` ("days 2 to 6") and `:347`; inputs listed in dossier 1.3 from the same file |
| 6 | "ready-made plan from the library, or build your own" | `src/screens/PlanLibraryScreen.js`; the manual builder (`CURRENT-APP-MAP.md` section 4.1-4.2) |
| 7 | "Six training styles: Balanced, V-taper, X-frame, Upper-body density, Powerbuilder and Minimalist" | `src/lib/trainingArchetypes.js:14-21`. **Newer than the live builds** (first committed 2026-10-19, after 3.0.0 and 3.1.0); true of the base commit, reaches users with the 3.4.0 build. On Play, publish this line with the build, or delete the bullet. |
| 8 | "Competing in bodybuilding or physique? Choose your division and the plan puts the priority on the muscles that matter for it" | `src/screens/ProOnboardingScreen.js:3285` ("Competing in a category?"); `src/lib/coachingGoals.js:29-104` (categories, each with its own muscle priorities) |
| 9 | "working sets, warm-ups, drop sets, myo-reps, rest-pause and AMRAP, with a rest timer" | `src/lib/livePrescription.js` and `src/lib/clusterSet.js` (set types); `src/components/EngineLog.js:30` (warm-up, myo-reps, rest-pause rows); rest timer: `modules/rest-timer-live` and `CURRENT-APP-MAP.md` section 4.3 |
| 10 | "It works without a signal" | `CLAUDE.md` section 1 "Storage: offline-first" (local SQLite is the source of truth; sync is a queue) |
| 11 | "From your second session ... suggests a weight and a rep target for each set from your last comparable session. You can type over it." | `src/lib/livePrescription.js` (ghost prefill; first session shows rep bands only, `FIRST_TIME_BAND`); `docs/WHAT-VOLYUME-ACTUALLY-DOES.md` section 1 ("works from the second session onward, the user types over it freely") |
| 12 | "Progressive overload built in" | same files as 11: the suggestion is the next load or rep from the last session. Chosen over "learns" or "adapts to you", which the engine does not do (`docs/WHAT-VOLYUME-ACTUALLY-DOES.md` line 129). |
| 13 | Check-in asks about "energy, sleep, stress, soreness, joint pain and how closely you followed the plan" | `src/screens/WeeklyCheckInScreen.js:343-357` (stress, sleep, soreness, joint pain states); adherence and energy are in the same screen (dossier 1.5) |
| 14 | "proposes changes to your training volume, your daily calories and your steps target, and writes down why. When it holds a change back, it says why" | `src/lib/weeklyCoach.js` (three lanes, "why this week", held decisions with reasons; dossier 1.5, `weeklyCoach.js:2034-2130`); `src/lib/weeklyCoach.js:438` (steps target bands) |
| 15 | "Nothing applies itself unless you choose Coached mode, and even then anything safety-related waits for you" | `src/screens/SettingsCoachingScreen.js:49, 236` (default collaborative; the in-app line "Anything safety-related still waits for your confirmation."); `src/screens/CoachOutputScreen.js:990-991, 2617` |
| 16 | "search foods, scan barcodes, scan nutrition labels, save meals, build recipes and log water" | `src/screens/FoodSearchScreen.js`, `ScanBarcodeScreen.js`, `ScanLabelScreen.js`, `MyMealsScreen.js`, `RecipeBuilderScreen.js`, `DiaryScreen.js` (water) |
| 17 | "A calorie counter and macro tracker" | the diary totals calories and macros against targets: `src/lib/nutritionEngine.js`, `src/screens/DiaryScreen.js` |
| 18 | "Built on UK food data" | `src/lib/food/waterfall.js` (the phone's own foods, a bundled Open Food Facts UK snapshot, CoFID UK, then live sources; dossier 1.4) |
| 19 | "Calorie and macro targets worked out from your body, your goal and your activity level" | `src/lib/nutritionEngine.js:17-26, 613-653` (Mifflin-St Jeor / Katch-McArdle, activity multipliers, goal adjustments) |
| 20 | "Meal plans built by fixed rules from UK meals, your saved meals and your recipes, with a shopping list" | `src/screens/MealPlanScreen.js:1341, 1711` (dated days and "Shopping list"); dossier 1.4 (curated UK meals, saved meals, recipes) |
| 21 | "Lifts, personal bests, volume and recovery for each muscle, weight trend, body measurements and progress photos" | `src/screens/LiftProgressScreen.js`, `RecoveryScreen.js`, `ProgressPhotosScreen.js`; personal bests and measurements in dossier 1.3 (`CURRENT-APP-MAP.md` section 6) |
| 22 | "Your progress photos and workout videos stay on your phone" | `src/screens/WelcomeScreen.js:147`; `app.json:39` (camera text: "Progress photos and videos stay on this device and are never uploaded") |
| 23 | "Follow other lifters, share sessions, join groups and send messages" | `src/screens/CommunityHubScreen.js`, `CommunityFollowersScreen.js`, `CommunityGroupScreen.js`, `CommunityConversationScreen.js`; dossier 1.6 |
| 24 | "Lifts in kg, body weight in stone, kg or pounds, British English" | `src/screens/SettingsUnitsScreen.js:15-21` ("Gym weights stay in kg by design"; body weight Stone, Kg, Lbs); `CLAUDE.md` section 3 (British English) |
| 25 | "support@volyume.app" | `public/support/` and the other public pages carry this address (dossier 5i) |

Deliberately left out, with the reason: any price or "free for life" promise (the brief bars price promises); "Pro", "trial", "subscription"; "AI", "learns", "adapts to you"; cardio and step **tracking**; "smart food suggestions" (not traced); streaks; the gym challenge; coach partnerships; weight-loss or transformation claims; ratings, reviews and "best" (Apple and Google rules, and none exist worth quoting); health or safety outcome claims; any statement about accessibility (`REAL-DISABLED-USER-VALIDATED = NO`, `CLAUDE.md` section 2).

## Phrases the wording carries

hypertrophy (title, short description, subtitle, both descriptions), progressive overload (description, keywords), gym log (title, description, keywords), workout tracker, workout planner, bodybuilding, strength training, calorie counter, macro tracker, food diary, UK. The reasons are in `phrases.tsv` and `03-phrases-and-monthly-check.md`.

## Before pasting: two things only the founder can settle

1. Whether to paste the Play text before the 3.4.0 build is live on Play (see row 7), or paste it now without the "Six training styles" bullet.
2. The live App Store listing still shows two in-app purchases and the Play listing still shows an in-app-purchases label (`05-store-figures-and-setup.md`). The wording above removes every mention in the text, but those labels come from the store consoles, not from the wording.
