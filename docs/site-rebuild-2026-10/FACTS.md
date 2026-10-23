# FACTS.md — volyume.app homepage rebuild, facts pass

Read-only pass. No repo file was edited. Date of pass: 2026-10-21.
Repo: /home/user/ADPhysique, branch `main`, HEAD `078f174` ("Fix three faults on the live homepage ahead of the rebuild"), app version 3.3.0 (`app.json:12`, `package.json:3`), Android versionCode 3357 (`app.json:73`), iOS buildNumber "10" (`app.json:33`).

Governing documents read in full first: `marketing/hq/PRODUCT-FACTS.md` (dated 2026-07-12, patched 2026-08-25) and `marketing/hq/CLAIMS-STANDARDS.md`.

Legend
- **[CODE path:line]** read and checked in today's source, or measured by loading the real module/asset under node.
- **[DOC path:line]** stated in a document; not re-derivable from source today. Treat as lower confidence.
- **UNKNOWN** nothing in the repo establishes it. Omit from public copy (CLAIMS-STANDARDS §2.4).
- Not done: no internet fetch (store pages were not re-fetched), no device run, no production database read.

---

## 0. READ FIRST: the two governing documents are stale in places

The Claim Rule says PRODUCT-FACTS wins over a draft. Several lines in PRODUCT-FACTS and CLAIMS-STANDARDS are now contradicted by the code or by the founder's later decisions. A rebuild that obeys them literally will publish falsehoods or leave out true features. The lead should either patch the docs first or knowingly override them with the evidence below.

| Governing line | What it says | Today's truth | Evidence |
|---|---|---|---|
| PRODUCT-FACTS §E (line 180) | "iOS is currently TestFlight / coming soon, never claim App Store availability" | App Store listing is live (same file §A, lines 25-33, corrected 2026-08-25). §E was not corrected, so the file contradicts itself. | PRODUCT-FACTS.md:25-33 vs :180 |
| PRODUCT-FACTS §F (line 189) | "iOS is not yet on the public App Store" | Same as above. Stale. | PRODUCT-FACTS.md:189 |
| PRODUCT-FACTS §F (line 191) | "No micronutrient tracking" | The app now shows micronutrient values on a food's detail sheet and a 7-day average card in Food Insights, only where food data carries them and only past a coverage floor. It is display only, never read by the coaching engine. Do not claim "tracking" either; the old "no" is no longer a safe absolute. | `src/components/food/FoodDetailSheet.js:620`, `src/screens/FoodInsightsScreen.js:730`, `src/lib/food/micronutrientCoverage.js:1-30` |
| PRODUCT-FACTS §D (lines 130-148) | 551 exercises, 47 plans, "3 PR types" | 923 exercises, 58 plans, 4 PR types (a fourth, `least_assistance`, exists for assisted lifts). Section 2 below. | `src/lib/algorithms.js:581-587` |
| PRODUCT-FACTS §D line 159 | "weekly coach needs at least 3 morning weigh-ins" | Code carries both 3 (`weeklyCoach.js:228`) and 4 (`coachContext.js:95`, `weeklyCoach.js:1214`). Not a stable fact. Also CLAIMS §5 bans weigh-in counts as proof. Do not cite any number. | cited lines |
| PRODUCT-FACTS §A (lines 65-74) | "no silent auto-apply, calories included" | True by default (Collaborative: "Your coach suggests each change. You tap to apply it."). There is a user-selectable "Coached" mode that applies the week's changes when the person opens the decision, except any safety hold, which always waits. So "nothing changes until you tap" is not literally true for every account. Say "by default". | `src/screens/SettingsCoachingScreen.js:229-240,246-252`, `src/screens/CoachOutputScreen.js:990-991,2618-2625` |
| PRODUCT-FACTS §B (lines 104, 118-121) | "included, permanently"; "free with no card and no time limit" | Conflicts with the lead's rule "describe today only, never promise it stays free". "Permanently" and "no time limit" are promises about the future. See section 4. | PRODUCT-FACTS.md:104,121 |
| PRODUCT-FACTS §G | survey reward = "a free week of Volyume Pro" via Play promo codes | There is no Pro. Stale; not for the homepage. | PRODUCT-FACTS.md:198-209 |
| CLAIMS-STANDARDS §3 and §4 | 14-day trial, 7-day intro offer, £1.99/£19.99 | There is no trial, no price, no Pro (D137). These sections must NOT be used. | `src/lib/proGate.js:43` |
| CLAIMS-STANDARDS §5 | "Claiming barcode scanning is free" is banned | Barcode scanning is free today (ungated, registered with no guard). The ban describes a tier that no longer exists. | `src/navigation/RootNavigator.js:281-285,299,443-449` |
| CLAUDE.md line 3 | "iOS via TestFlight" | Stale (same reason). | n/a |
| CURRENT-APP-MAP.md §2.2 | "Apple (iPhone only), Google (Android only)" | Code differs: see section 1.3. | `src/components/auth/OAuthButtons.js:20-25,43,78-83` |

Also: the 3.3.0 What's New text shows that version 3.3.0 adds features (Apple sign-in on Android, oily-fish choice, clearer weekly coaching, regrouped Settings) (`src/components/WhatsNewSheet.js:173-178`). **Which app version is live in each store is UNKNOWN** (founder-held, PRODUCT-FACTS.md:269-271). Every feature below is "in the 3.3.0 source". If a feature arrived in 3.2.0 or 3.3.0 (set videos, the logger revamp, Apple on Android) the founder should confirm it is in the store builds before the page names it.

---

## 1. Platforms and store links

### 1.1 Platforms
- Android app, package `app.volyume`. [CODE app.json:72]
- iPhone app, bundle id `app.volyume`. [CODE app.json:32]
- iPhone only, no tablet layout (`supportsTablet: false`). [CODE app.json:31]
- Portrait only. [CODE app.json:24]
- Minimum Android API level 26, which is Android 8.0 (the API-to-version mapping is outside the repo). [CODE app.json:303]
- Minimum iOS 16.0. [CODE app.json:333]
- Home-screen widgets exist on Android only: "Next session" and "Weekly consistency". [CODE `app.json:346-375` (`NextSession`, `WeeklyConsistency`)] The iOS widget plugin exists on disk but is not wired in `app.json` (grep of `withVolyumeWidget` in app.json returns nothing). [CODE app.json] (CLAUDE.md §1 says the same.)
- No wearable or smartwatch app, no Apple Health or Health Connect integration. No health-library dependency in `package.json`, no health permissions in `app.json:76-92`, and the code states the integration was removed (`src/screens/ProOnboardingScreen.js:2052-2053`, founder 2026-06-30). **The privacy policy's section 6 "Health Connect" (`public/privacy/index.html:147-150`) still describes it. That text is stale; do not echo it, and tell the founder.**

### 1.2 Store links
- Google Play: `https://play.google.com/store/apps/details?id=app.volyume`. [CODE `public/index.html:163`; `public/get/index.html:140,180`; `public/c/index.html:119`; `public/p/index.html:56`] Matches package id `app.volyume`. [CODE app.json:72]
- App Store: `https://apps.apple.com/gb/app/volyume/id6777083702`. [CODE `public/index.html:166`; `public/get/index.html:136,176`; `public/p/index.html:57`; `public/c/index.html:120`; `public/g/index.html:91`; `public/s/index.html:224`; `public/u/index.html:221`; `public/partner/index.html:116`]
  - The app itself holds the Apple id `6777083702` for its own "write a review" link. [CODE `src/screens/SettingsAboutScreen.js:72-73`]
  - Tests pin the exact URL. [CODE `src/__tests__/community.earlyDays.guard.test.js:46,81`; `src/lib/challenges/__tests__/landingPage.test.js:102`]
- Both store pages returned HTTP 200 on 2026-08-25. [DOC PRODUCT-FACTS.md:28-33] Not re-fetched today.
- Copy may say the app is on iPhone and Android and link both. [DOC PRODUCT-FACTS.md:31-33]
- Live store versions: UNKNOWN (see section 0).

### 1.3 Sign-in options (what a person actually sees)
- Sign-in is required; there is no guest or anonymous mode. [CODE `src/navigation/RootNavigator.js:2701,2721` (`if (!user) return <WelcomeStack />`) and `:863-864` (Welcome and Login screens); `docs/IDENTITY_AND_OWNERSHIP_LOCKED.md` per CLAUDE.md §2]
- "Continue with Apple": shown on both platforms. Native Apple button on iPhone; on Android it uses the web OAuth flow (founder ruling, Batch 4 item 2). [CODE `src/components/auth/OAuthButtons.js:20-25,78-83`] The 3.3.0 What's New says "Apple now works on Android". [CODE `src/components/WhatsNewSheet.js:174`]
- "Continue with Google": shown on Android. **Hidden on iPhone** because the iOS client id is an empty string. [CODE `src/lib/supabase.js:556-563`; `OAuthButtons.js:43`] So an iPhone user sees Apple and email, not Google. (This was true at the time of this pass; it changes if the founder fills the id before a build.)
- "Continue with email": email and password sign-in and account creation, plus a "Forgot password" path. Behind a "Continue with email" control. Re-added 2026-07-21 on founder order. [CODE `src/components/auth/AuthSheet.js:11,261-275,456-463`; `src/lib/supabase.js:424-432,445`]
- Sign-in methods can be added or removed in account settings. [CODE `src/screens/SettingsSignInMethodsScreen.js` exists; What's New `WhatsNewSheet.js:174`]
- The auth surface is used on Welcome and Login. [CODE `src/screens/WelcomeScreen.js`, `src/screens/LoginScreen.js` both import AuthSheet]

---

## 2. Counts (old site number vs today's number)

Old site = `public/index.html` at HEAD (lines 258, 260, 265). PRODUCT-FACTS = §D as dated 2026-07-12 / 2026-08-25.

| Item | Old site | PRODUCT-FACTS §D | TODAY | Status |
|---|---|---|---|---|
| Built-in exercises | 551 | 551 (RAW array) | **923** | old figure FALSE |
| Built-in training plans | 31 | 47 | **58** | old figure FALSE |
| Foods in bundled data | "over 29,000 UK foods" | 29,279 rows | **29,279** (26,427 Open Food Facts + 2,852 CoFID) | still true; "UK" needs a hedge |
| Curated meals | not stated | not stated | **94** | new, not yet in PRODUCT-FACTS |
| Curated staple foods behind those meals | not stated | not stated | **83** | new |
| Training styles | not stated | not stated | **6** | new |
| Physique goal options | not stated | 9 | **9** (not competing + 8 divisions) | still true |

### 2.1 Exercises: 923
Method (so the lead can repeat it):
- The old `RAW` array in `seedExercises.js` (PRODUCT-FACTS cites lines 580-1279) no longer exists; the file is 341 lines and seeds from a corpus. [CODE `src/lib/seedExercises.js:9-14,92-96`]
- Live library = `CORPUS`, the concatenation of 16 family modules with retired stubs removed. [CODE `src/lib/exerciseCorpus/index.js:36-57`]
- Installs seed `CORPUS.map(...)`. [CODE `src/lib/seedExercises.js:96`] Pickers read every row that is not a soft-deleted custom exercise. [CODE `src/lib/database.js:3591-3605`]
- Counted by importing the real module under node: `CORPUS.length` = **923**; 923 distinct case-insensitive names; 923 distinct canonical ids (`canonicalExerciseId`); 21 retired stubs excluded (`RETIRED_ENTRIES`, `index.js:64`). [CODE measured 2026-10-21]
- The build's own floor is 918 and fails if the corpus shrinks below it. [CODE `docs/exercise-library-expansion-2026-09-05/data/corpus-floor.json`, read by `src/lib/exerciseCorpus/__tests__/corpus.guard.test.js:29,64-66`]
- By equipment (sums to 923): bodyweight 176, barbell 157, dumbbell 144, cable 121, machine 108, band 62, kettlebell 59, suspension 36, landmine 27, smith machine 13, sandbag 8, medicine ball 5, EZ bar 4, sled 3. [CODE measured]
- Plus unlimited user-added custom exercises (custom rows are normal rows; `is_custom`). [DOC PRODUCT-FACTS.md:130-131] Soft-delete filter proves customs are first-class: `database.js:3594-3598`.
- Safe wordings: "923 exercises", or "over 900 exercises". Do not carry "551" or "448".

### 2.2 Training plans: 58
- `LIBRARY_PLANS` = the literal array (55) + `BAND_LIBRARY_PLANS` (2, pushed) + one authored plan "Mens Physique Off Season - Allan" (1, pushed at module end). [CODE `src/lib/seedRoutines.js:132` literal, `:2505` band push, `:2666` authored push; `src/lib/seedRoutines.bandPlans.js`]
- Loaded the real module under node: length **58**, 0 array holes, 58 unique names, 0 plans with no workouts. [CODE measured]
- The seed creates every one of them as an `is_library = 1` programme. [CODE `src/lib/seedRoutines.js:2587-2610`] The library screen lists them all (`getLibraryPlans`, `src/lib/database.js:6132-6138`), filtered only by search, collection chips and the optional "Fits your limitations" view. [CODE `src/screens/PlanLibraryScreen.js:46-66,592-600`]
- Plan length mix (days per week tag): 2-day 14, 3-day 27, 4-day 8, 5-day 7, 6-day 1. [CODE measured from `tags`]
- The test pins only `>= 40`, so the exact count is not test-guarded. [CODE `src/lib/__tests__/seedRoutinesLibraryData.test.js:115`] Re-count before any build that changes plans.
- Safe wordings: "58 built-in plans", or "over 50 built-in plans".

### 2.3 Foods: 29,279, offline
- Two files ship in the app: `assets/seed/off_uk_snapshot.dat` (rowCount 26,427, generated 2026-07-05) and `assets/seed/cofid_uk.dat` (rowCount 2,852, generated 2026-07-10). [CODE the `_meta` headers; `src/lib/food/seed.js:99,103`]
- Parsed both files: every row passes the importer's usability test and every `source_id` is distinct, so **29,279** rows import. [CODE measured against `seed.js:361-367`]
- They are written into the local SQLite `foods` table on first launch, and the lookup tries the local table first, before any network call. [CODE `src/lib/food/seed.js:143,157`; `src/lib/food/waterfall.js:5-12`] So bundled foods are searchable with no connection once that first-launch import has finished. (The import is chunked and resumable: `seed.js` progress key.)
- Live Open Food Facts (and USDA, only if a key is configured) are fallbacks when online. [CODE `waterfall.js:5-12`; `src/lib/food/sources/usda.js:8,28`]
- **"UK" hedge.** The Open Food Facts snapshot is built from UK-scoped queries (`scripts/seed/buildOffSnapshot.js:12-26`), but it contains products sold elsewhere: 86 of the 26,427 rows have non-Latin-script names or brands and the file's first row is a Moroccan water. The CoFID half is the UK government's own table. In-app Credits calls it "Branded UK food data". [CODE `src/screens/CreditsScreen.js:55,71`] Safe wording: "over 29,000 foods, built around UK products". "UK foods" flat is defensible but loose.
- The OFF snapshot is dated 2026-07-05 inside the app (it is a snapshot, not live). "Refreshes weekly" is a build-pipeline claim, not an in-app fact. Do not say "up to date".
- Food-database micronutrient columns: CoFID rows carry 24 of 27 micronutrient fields, OFF rows none. [CODE `src/lib/food/seed.js:26-32`]

### 2.4 Curated meals: 94
- `CURATED_MEALS` has **94** meals, each tagged with the broadest diet it suits: omnivore 14, pescatarian 19, vegetarian 28, vegan 33. [CODE `src/lib/food/curatedMeals.js:53`; measured]
- A person sees every meal whose tag is at or below their diet, so vegan 33, vegetarian 61, pescatarian 80, omnivore 94. [CODE `curatedMeals.js:42-50`, rank rule]
- By slot (a meal can fit more than one): breakfast 24, lunch 42, dinner 46, snack 15, pre-workout 4, post-workout 5. [CODE measured]
- Meal plans are also built from the person's own saved meals and recipes. [CODE `src/lib/food/mealPlanAssembler.js:606`]
- 83 curated staple foods feed the meals. [CODE `src/lib/food/curatedFoods.js:29`; measured]
- Not in PRODUCT-FACTS, so by the Claim Rule it needs an entry there before it is used. The number is real today.

### 2.5 Other numbers the page could use
- 6 training styles: Balanced, V-taper, X-frame, Upper-body density, Powerbuilder, Minimalist. [CODE `src/lib/trainingArchetypes.js:14-21`] Hidden for people competing in a physique category (doc: CURRENT-APP-MAP §4.2).
- 9 physique goal options (Not competing, Men's Physique, Classic Physique, Bodybuilding, Bikini, Wellness, Figure, Women's Physique, Women's Bodybuilding). [CODE `src/lib/coachingGoals.js:26-112`]
- 6 set types: Working, Warm-up, Drop set, Myo-reps, Rest-pause, AMRAP. [CODE `src/screens/ActiveWorkoutScreen.js:267-274`]
- Rest timer default 90 s. [CODE `src/store/useAppStore.js:2143`]
- Set videos: 3 per workout; length 60, 90 or 120 s (default 90); kept 7, 30, 90 days or forever (default 7). [CODE `src/lib/clips/rules.js:43,69-70,85-86`]
- Raw/dry versus cooked weight conversion for 13 staple foods (rice, pasta, potato, chicken, turkey, steak, beef mince, cod, salmon, lentils, bacon medallions and others). [CODE `src/lib/food/cookYield.js:33-56`; measured `Object.keys(COOK_YIELD_PAIRS).length` = 13] Do not give a number on the page; the list changed on 2026-10-20.
- Training milestones: sessions 5, 10, 25, 50, 100, a first-week milestone and a first PR. [CODE `src/lib/milestones.js:52-88`] Older 250/500 figures are stale.
- 6 tabs: Today, Train, Nutrition, Progress, Community, Coach. [CODE `src/navigation/RootNavigator.js:824-829`] (Superseded 2026-10-23 by the layout rework D231: 5 tabs in this order, Today, Train, Nutrition, Coach, Community, with Progress inside Coach and Train. [CODE `src/navigation/RootNavigator.js:805-809`]. See FEATURES.md correction 6.)
- Do NOT use: weigh-in counts, "3 PR types", screen counts, migration counts, telemetry event counts.

---

## 3. Current user-facing feature set (shipped and reachable; billing surfaces excluded)

Reachability basis: `FULL_ACCESS_FOR_ALL = true` (`src/lib/proGate.js:43`); the former Pro screens are registered with no guard (`src/navigation/RootNavigator.js:276-300`). Registered screens named below carry their line in that file.

### 3.1 Training and logging
- Log every set with weight and reps; rest timer starts automatically, default 90 s. [CODE `ActiveWorkoutScreen.js`, `useAppStore.js:2143`; the -15/+15/Skip controls are visible in the screen and in `CURRENT-APP-MAP.md` §4.3, doc]
- Six set types, so warm-ups, drop sets, myo-reps, rest-pause and AMRAP sets are logged as what they are. Warm-ups do not count toward volume. [CODE `ActiveWorkoutScreen.js:267-274`]
- Supersets and circuits. [CODE `src/lib/database.js:536` (superset_group_id), `:2828-2840` (circuit group_kind, round rest)]
- The rest timer keeps going from the lock screen with "Log set" and "+15s" buttons. [CODE `src/lib/notifications/categories.js:78-110`] iOS Live Activity / Android live module exist in `modules/` but their wiring is not verified here; do not name them.
- Swap an exercise for this session or from now on; "I cannot do this" offers just-for-today or from-now-on. [CODE `src/components/workout/session/SessionSheets.js:669-671`]
- Personal bests detected per lift (heaviest weight, estimated 1RM, most reps at a weight, least assistance for assisted lifts); the summary lists one entry per lift. [CODE `src/lib/algorithms.js:581-627`; PRODUCT-FACTS §H]
- Workout history, lift progress chart, volume-by-muscle heatmap, consistency, monthly/yearly recaps. [CODE routes `RootNavigator.js:645,648,729-736`; `YearOfLiftsScreen` registered]
- Import your history from Hevy or Strong CSV; import a food history from MyFitnessPal or Cronometer exports. [CODE `src/screens/ImportScreen.js:1-11,32-36`; `src/lib/food/importHistory.js:1-19`; reached from Settings > Your data `src/screens/SettingsDataScreen.js:496`]
- 923 exercises with setup, execution and "watch for" cues (text, not video). [CODE `src/lib/exerciseCorpus` entry fields `setup, execution, watch`]. **No demonstration videos** (grep of ExerciseDetailScreen for video/gif/animation returns nothing).

### 3.2 Plans and the structure engine
- 58 built-in plans, with search and collections: Kettlebell, Circuits, Minimal equipment, Dumbbells only, Bodyweight, Bands, Short sessions, Beginner, For women, For men, Bodybuilding divisions, and "Fits your limitations" when limitations are set. [CODE `src/screens/PlanLibraryScreen.js:46-66`; route `RootNavigator.js:608`]
- Build a plan from your goal, 2 to 6 training days, session length, equipment, experience and focus muscles; the structure engine either returns a plan or refuses with a reason. [CODE `src/lib/planAutoGen.js:994`; `src/lib/structure/engine.js:2373`; `STRUCTURE_ENGINE = true` at `src/lib/structure/release.js:24`; `PLANNER_V2 = true` at `src/lib/plan/release.js:22`; day range per CURRENT-APP-MAP §4.1, doc]
- Six training styles (V-taper, X-frame and so on) picked in setup. [CODE `trainingArchetypes.js:14-21`]
- Build your own plan by hand (days, exercises, supersets, circuits); one-off workouts; training blocks with deload weeks. [CODE routes `RootNavigator.js:607,609`]
- "How you train" and "Injuries & limitations": say what your training should be built around; setup notes for exercises adapt. [CODE `RootNavigator.js:512,616`; PRODUCT-FACTS §H] Marketing readiness matrix is all NO, so name no population and use no medical framing (CLAIMS-STANDARDS §9A). The only permitted line: "your plan is built around how you train."
- Three start routes at first run: "Set up coaching" (recommended), "Pick a ready-made plan", "Build my own". The last two defer coaching setup until the person does it from the Coach tab. [CODE `src/screens/StartChoiceScreen.js:30-46,101`]

### 3.3 The weekly coaching decision, and how it explains itself
- A weekly check-in (a quick version when the logs already answer most questions, a full one otherwise) then a "Coaching decision" screen with a calorie change and a training change, each with Apply, or "Keep as is". [CODE routes `RootNavigator.js:729,735`; `CoachOutputScreen.js:301,370,458`]
- Default autonomy is "Collaborative": the coach suggests and the person taps to apply. "Manual" removes Apply and the person makes the change. "Coached" applies when the decision is opened, but any safety hold waits for confirmation. [CODE `SettingsCoachingScreen.js:229-252`; `CoachOutputScreen.js:990-991,2618-2625`]
- It holds rather than guesses, and says why in plain words. Held-decision reasons include: a safety hold, a floor, the last change not yet showing up, one change at a time, food not tracked ("any change would be a guess"), intake unreadable. [CODE `src/lib/weeklyCoach.js:2050-2191`, e.g. `:2191`]
- It reads logged training, weight trend, food diary data and weekly check-in answers, and decides what should change, what should stay and why. [CODE `src/screens/MethodologyScreen.js:33-38`] Progress Scan evidence is one input. [CODE `src/lib/weeklyCoach.js:28-31` import of `progressScanCheckInEvidence`]
- The 3.3.0 release note: "Your weekly coaching now says what it saw, what changes and when your coach looks again." [CODE `WhatsNewSheet.js:176`; the screen change is commit `8e207f6`, 2026-10-20 "Show both decision cards ... and when it is next reviewed"]
- Opt-in "Show the science" layer; a "Coaching history" of every weekly decision. [CODE `SettingsCoachingScreen.js:41,268`; route `RootNavigator.js:741`]
- Deterministic: no language model in the engine; `Math.random` appears nowhere in the engine modules (only in id generation and UI animation). [CODE grep of `weeklyCoach.js`, `nutritionEngine.js`, `planEngine.js`, `structure/engine.js`, `coachApply.js`; `src/lib/planEngine.js:4`]
- The in-app name for the coach is "Precision Coaching" only inside the Methodology and Goal-lock copy (`MethodologyScreen.js:34-46`, `GoalLockConsentScreen.js:100`); the screens a person uses are "Weekly check-in", "Coaching decision" and the "Coach" tab.

### 3.4 Nutrition
- A food diary built as one workspace per day: calorie ring, protein/carb/fat bars, numbered meals, pre/post-workout slots, copy yesterday, move or delete several foods at once. [CODE `src/screens/DiaryScreen.js:1897` (title "Nutrition"); detail DOC CURRENT-APP-MAP §5.1]
- Barcode scan; on a miss, scan the label (on-device text recognition) to pre-fill a custom food. [CODE routes `RootNavigator.js:443-449`; `src/lib/food/ocr.js:1-12`]
- Calorie and macro targets worked out from your own inputs, shown with their rationale; floors and safety checks always on. [CODE `src/lib/nutritionEngine.js:722` (floors 1,200 / 1,500)] Do not give floor numbers or say "safe" on the page (CLAIMS-STANDARDS §5, ED safety).
- Meal plans for a day or a week built from 94 curated meals plus your own saved meals and recipes, to land in your target range; swap a meal or food, leave a food out, add the day to the diary. Dietary needs: diet type (vegan, vegetarian, pescatarian, omnivore), allergen excludes and foods to leave out. [CODE route `RootNavigator.js:428`; `mealPlanAssembler.js:606`; `src/screens/SettingsDietaryScreen.js:1-12`] Do not claim allergy safety.
- Raw or dry versus cooked weights on meal plans and food detail, plus a shopping list. [CODE `src/lib/food/cookYield.js:33-56`; `MealPlanScreen.js`]
- Oily fish meals per week choice. [CODE `src/screens/MealPlanScreen.js:48,321-324`; What's New `:175`]
- Recipes: build your own, log by servings or grams, import from a web address. [CODE `src/lib/food/recipeImport.js:1-12`; route `RootNavigator.js:468`]
- Water tracking; custom foods with your own portions; notes on foods. [CODE `src/screens/DiaryScreen.js:37-42`; What's New `WhatsNewSheet.js` 2.19.0 entry]
- Food Insights: 7/14/30/90-day trends, CSV and PDF export of the diary. [CODE `src/screens/FoodInsightsScreen.js:53,357-366`; route `RootNavigator.js:453`]
- Vitamins and minerals shown on a food's detail where the data has them. [CODE `FoodDetailSheet.js:620`] Say nothing stronger.
- Not present: restaurant or takeaway database, photograph-a-meal logging. [DOC PRODUCT-FACTS.md:191-192; no such code found]

### 3.5 Progress
- Progress photos kept on your phone: capture, compare, view over time. Photos have location data stripped on save. [CODE `src/lib/progressPhotos.js:1-20`; routes `RootNavigator.js:647,728`]
- Progress Scan: a progress score from your own front and back photos (side optional), shown with a confidence level and a band, and it can decline to score. The photo and the scan run on the phone. It is not a body-fat measurement or a medical assessment. [CODE `assets/ml/README.md:1-52`; `src/screens/ProgressPhotosScreen.js:1181-1190` (labels Score, Leanness, Change, Confidence); `src/lib/progressScan*`]
  - Hidden under calm mode or an open eating-disorder flag. [CODE `ProgressPhotosScreen.js:1170-1190` `suppressed`]
  - Marketing rule: a feature may be named; before/after body imagery in ads is banned (CLAIMS-STANDARDS §5). The "Leanness" band wording is a body-composition label inside the app; keep it off the page, use "progress score".
- Body metrics: weight in kg, stone or pounds, body fat with its method, tape measurements, trend chart. [CODE route `RootNavigator.js:646,727`; detail DOC CURRENT-APP-MAP §6] Weight is one signal; CLAIMS-STANDARDS §5 bans making the scale a hook.
- Lift progress, volume by muscle, consistency, recaps. [CODE routes as 3.1]

### 3.6 Recovery
- A per-muscle estimate of how recovered each muscle is and when it is ready again, always labelled an estimate; a Recovery screen under Progress; a "how are you feeling today" readiness question before a session. [CODE `src/lib/recovery/muscleRecoveryModel.js:1-40`; `src/screens/RecoveryScreen.js:1-35`; route `RootNavigator.js:650`; `src/lib/recovery/sessionReadiness.js`]
- Say "estimated". Never say it measures recovery.

### 3.7 Community and gym challenges
- A Community tab: a feed of other lifters' sessions and PRs, follows, messages, groups, boards. Optional. Joining requires a profile, health consent and sign-in. [CODE tab `RootNavigator.js:828`; `src/screens/CommunityHubScreen.js`; `src/lib/community/transport.js:158-176` (fails closed without consent)]
- Once you have joined, each finished workout is posted automatically by default (sessions and up to three PRs), visible to everyone in Community (followers only if under 18); body weight, measurements, food diary, photos and check-ins are never posted. The switch is shown before the profile is created. [DOC `public/privacy/index.html:136`; app map §8]
- Gym challenge: a gym can run a scored challenge (training days, weeks hit, lifts beaten, a Community post, and with coaching on, check-in, food-logging and weigh-in points), with a top-10 board and prize draws. Joining needs 18 or over. [CODE `src/lib/challenges/copy.js:36-40`; routes `RootNavigator.js:554,911`; DOC `supabase/migrate_201_gym_challenges.sql` header; `public/c/index.html`, `public/challenge-terms/index.html`]
- **Whether any challenge is running is UNKNOWN.** On 2026-10-20 production held 0 challenges and 0 grants. [DOC `supabase/migrate_203_free_for_life_on_completion.sql` header] Do not advertise a live challenge.

### 3.8 Set videos and share cards
- Record a silent video of a set (60, 90 or 120 s), up to 3 per workout, kept on the phone for 7 days by default or longer if you choose. Use it as the background of a share image or video with your stats on top, trimmed to 15 s at most. [CODE `src/lib/clips/rules.js:43,69-70,85-86`; routes `RootNavigator.js:498,660`; no microphone permission: `app.json:43,86`; trim length DOC app map §4.5]
- The founder's own wording for the privacy of those videos, 2026-10-20: "private on your device only, unless you choose to share them". [CODE `src/components/WhatsNewSheet.js:160-163`] Use this, not "never uploaded" (the privacy policy still says never uploaded, `public/privacy/index.html:110`; the app never uploads the raw clip, but a shared video leaves the phone because the person shared it).
- Share cards for a session, a new PR, a milestone, a weekly recap and a before/after: story, full-screen, feed and square shapes, light or dark, with a photo/camera/video/no background, looks, and a quote or your own caption. [CODE `src/screens/ShareCardScreen.js:663-667`; routes `RootNavigator.js:496,658`; shapes and weekly/before-after DOC app map §10.2]
- Share cards never include name, measurements or private notes; bodyweight appears only on the before/after card; progress wording and photo/video backgrounds are withheld under calm mode or an open ED flag. [DOC CLAUDE.md §2; app map §10.2]

### 3.9 Reminders and notifications
- Reminders for training, the weekly check-in, meals (opt-in) and a morning weigh-in; quiet hours default 22:00 to 07:00 and adjustable; at most 2 event pushes a day and 8 a week. [CODE `src/lib/notifications/categories.js:26-50`; `quietHours.js:22-24`; `budget.js:35-36`]
- Food and weight reminders are never scheduled while an eating-disorder flag is open. [DOC CLAUDE.md §2; app map §10.1] Not a marketing line.
- Do not name a number of notification types (the map says 26; not re-counted).

### 3.10 Accessibility, calm mode, display
- Settings > Display and accessibility: theme (Dark default, Light, Match phone), Larger text, Higher contrast, Colour-blind safe palette, Reduce motion, a separate vibration switch. [CODE `src/screens/SettingsDisplayScreen.js:13-17,158,175,192,209,224`]
- "Calmer coaching" (calm mode): quieter progress prompts, no pushing for more, hides comparison and share surfaces; the safety limits stay on. [CODE `src/screens/SettingsCoachingScreen.js:146-147`] It is a user setting, not a diagnosis.
- Optional biometric app lock (off by default). [CODE `src/screens/SettingsPrivacyScreen.js:155`]
- Energy units kcal or kJ, weight units kg, stone or pounds. [DOC app map §10.5; `SettingsUnitsScreen.js` exists]
- Real-disabled-user validation is NO (CLAUDE.md §2 truth field). Do not claim "accessible" as an outcome; list the settings only.

### 3.11 Data and account
- Offline-first: logging works with no connection; the phone's database is the source of truth. [CODE `src/lib/dbCrypto.js:1-20`; `src/lib/database.js`]
- Backup and restore (JSON), snapshot and CSV export, clear history, delete account and withdraw consent. [CODE `src/screens/SettingsDataScreen.js:17,292`; `src/screens/SettingsPrivacyScreen.js:237-243`]
- Android home-screen widgets. [CODE `app.json` widget block]

Excluded because dormant or absent: any subscription, upgrade, cascade or paywall surface (`RootNavigator.js` registers none); iPhone widget; Apple Health / Health Connect; demonstration videos; a chat assistant.

---

## 4. Price truth

- The product is fully free today, founder decision 2026-09-03 (D137). [CODE `src/lib/proGate.js:30-43`] Every signed-in account resolves to full access: the store clamps every tier write (`src/store/useAppStore.js:45-46,1073-1074`); the billing barrel refuses every call (`src/lib/payments/index.js:16-24,62`, `{ ok:false, error:'billing_disabled' }`); no route is guarded (`RootNavigator.js:276-285`); no subscription, upgrade or cascade screen is registered.
- There is no trial, no paywall, no price, no expiry, no in-app purchase anywhere in the user experience. [CODE as above; DOC CLAUDE.md §2; PRODUCT-FACTS.md:100-102]
- Barcode scanning, meal planning, Progress Scan, weekly coaching, advanced plan building: all included. [CODE ungated routes, `RootNavigator.js:276-300`]
- An account is needed (Apple, Google on Android, or email). "Free" copy should not imply no sign-up.
- The store listing already says: "Volyume is free. No card, no time limit, no subscription." [DOC `docs/PLAY_STORE_LISTING.md:67-68,226`] and `/get` says "Free. No card, no time limit." [CODE `public/get/index.html` offer line]

What the page may say (today only):
- "Volyume is free." "Everything in the app is included." "There is no trial, no subscription and no card."
- Describe it in the present tense. Do not write "free forever", "always free", "permanently", "for good", "no time limit", "never charge", "free for now", "free during launch", "free until", or any former or future price. "No time limit" is in PRODUCT-FACTS §B and the Play listing, but it reads as a promise about the future; the lead's rule is to avoid it.
- Do not mention Pro, tiers, prices, trials or subscriptions (PRODUCT-FACTS.md:118-121).

Free for life (gym challenge only):
- Founder's exact line: "Completing a challenge with a final score of 50 or more earns free for life." [CODE `src/lib/challenges/copy.js:39`] and landing "Volyume is free. Completing a challenge with a final score of 50 or more earns free for life." [CODE `copy.js:40`; `public/c/index.html:106`; terms section 9 `public/challenge-terms/index.html:180-181`]
- Earned at close by the founder, not on join; leaving before the end forfeits it. [DOC `supabase/migrate_203_free_for_life_on_completion.sql` header; APPLIED 2026-10-21 02:46:54 UTC per CLAUDE.md status block and the file]
- No app code reads the grant (the app is free anyway). [DOC app map §9]
- It is meaningful only if a challenge exists (UNKNOWN). Do not put "free for life" on the homepage as a general promise.

---

## 5. Privacy and trust claims that are literally true

Each line is stated narrowly on purpose. A sceptical reader should find it accurate after reading the in-app description (CLAIMS-STANDARDS §6).

1. **Progress photos stay on the phone unless you share them.** Stored in the app's private folder, never synced or uploaded, location data stripped on save. [CODE `src/lib/progressPhotos.js:1-20`; `app.json:39`; guard `src/lib/sync/__tests__/progressPhotoMetaNoSync.guard.test.js`] Scan data lives in local tables (`src/lib/database.js:1787,1815,2065`) with no cloud table or sync registry entry (grep of `supabase/` and `src/lib/sync/` for `progress_scan_sessions` finds only the guard test). Policy says the same (`public/privacy/index.html:110,123`). Caveat: a before/after card, a share image or an export leaves the phone because the person chose to.
2. **Set videos stay on the phone unless you share them.** No microphone use (`app.json:43,86`). Use the founder's 2026-10-20 sentence (`WhatsNewSheet.js:160-163`).
3. **Health-data consent is required before the app opens.** A signed-in person without consent sees the consent screen first; a new person whose consent read failed is sent to the gate, not past it. [CODE `src/navigation/RootNavigator.js:2738-2753`; `src/screens/Article9ConsentScreen.js:84` (`record_health_consent`); Community also refuses without consent `src/lib/community/transport.js:171-172`]
4. **Encrypted on the device.** The local database uses SQLCipher with a random per-device 256-bit key in the phone's secure store. [CODE `app.json:258`; `src/lib/dbCrypto.js:1-20,45`] Nuance, stated in the file header: if encrypting ever fails the app falls back to opening the database unencrypted rather than lose data (`dbCrypto.js:8-12`). Say "stored in an encrypted database on your phone", not "cannot be read".
5. **EU data residency.** Cloud account data is in Supabase, EU region; the production project is `eu-west-1`, which is Ireland (Dublin). [DOC `supabase/README.md:447-448` (project `sujrylzzxcqxxfygptns`, eu-west-1); `public/privacy/index.html:123,158` says "EU region" and "does not leave the UK or EU"; CLAUDE.md §1 says Dublin] The repo has no region setting, so "Dublin" is doc-stated, not code-verified. Not re-queried from production.
   - **Mandatory companion: the Resend exception.** Member and sign-in emails go through Resend, which sends from Ireland and keeps its records in the United States under standard contractual clauses (founder, 2026-10-17, "Keep Resend, say so"). Resend receives the email address. [DOC CLAUDE.md §1; CODE-published `public/privacy/index.html:161,172`; `src/screens/PrivacyPolicyScreen.js:205`] So a flat "all your data stays in the EU" is false. Safe: "Your account data is stored in the EU (Dublin). Our news emails are sent through Resend, which keeps its email records in the United States."
6. **No adverts.** No advertising SDK in `package.json` dependencies, and the policy says health data is "never ... used for advertising or sold". [CODE `package.json` dependency list, checked for ad and attribution SDKs; DOC `public/privacy/index.html:94,155`]
7. **Data is not sold.** [DOC `public/privacy/index.html:94,155`: "We never sell it, never share it with advertisers, and never use it to train a public AI model."]
8. **Analytics, stated carefully.** The app records first-party usage events (screens, failures, small counts) to its own database, tied to a pseudonymous account id, kept six months, switchable off in Settings; it never includes weights, foods, notes or names; it uses no third-party analytics or tracking tool. [DOC `public/privacy/index.html:117`; CODE `src/lib/telemetry/transport.js:1-20`; `supabase/migrate_200_growth_telemetry.sql:235,283` inserts `user_id`] **The old homepage line "no personal identifiers go to analytics" is therefore risky: the usage rows carry an account id.** Use the policy's wording: "no third-party analytics or tracking tools" and "usage data never contains your weights, foods or notes".
9. **Crash reports are scrubbed.** Sentry events have weight, intake and body data removed. [CODE `src/lib/observability/sentryScrub.js`; DOC `public/privacy/index.html:159`]
10. **The coach is fixed rules, not an AI chatbot.** The weekly decision, targets and plans are pure functions of your own logged data; the same inputs give the same decision; there is no language model anywhere in `src/` or `modules/` (case-insensitive search for OpenAI, Anthropic, Gemini, LangChain, GPT and "LLM" finds only a comment "no LLM" in `src/lib/food/mealSuggest.js:4`). [CODE greps; `src/lib/planEngine.js:4`]
    - **Do not write "no AI" about the product.** Two on-device recognition models exist:
      - Progress Scan: MediaPipe Selfie Segmentation (TFLite, `assets/ml/selfie_segmentation_v2.tflite`, `react-native-fast-tflite`, with an ML Kit native fallback) finds the body outline in your own photo. A vision model, not a generative one. [CODE `assets/ml/README.md:1-36`; `package.json:128,195`]
      - Label scan: Google ML Kit text recognition reads a nutrition label on the phone, no network, no key. [CODE `src/lib/food/ocr.js:1-12`; `package.json:78`]
    - Safe form: "The weekly decision is deterministic coaching, not generative coaching. No language model is involved in it." (CLAIMS-STANDARDS §6.)
11. **Things that touch third parties (do not contradict):** food lookups can reach Open Food Facts (and USDA if a key is set) when a food is not found locally; push goes through Expo; crash reports go to Sentry; Apple and Google handle sign-in. [DOC `public/privacy/index.html:157-162`] Sharing scanned labels back to Open Food Facts is an opt-in switch. [CODE `src/screens/SettingsPrivacyScreen.js:114`]
12. **The team can see cloud-held account data when supporting you** (the policy says so). So never write "we never see your data" or "completely private". [DOC `public/privacy/index.html:123`; CLAIMS-STANDARDS §6]
13. **Delete your account** from Settings, which also withdraws consent. [CODE `src/screens/SettingsPrivacyScreen.js:237-243`; edge function `supabase/functions/delete-account`]

---

## 6. Everything in current `public/index.html` that is now false or stale

Checked against HEAD `078f174` (353 lines). The commit already fixed three faults (header button, "iOS coming soon" in the hero, the doubled "Free" label). The rest below is untouched.

### 6.1 False
| Line | Text | Why |
|---|---|---|
| 258 | "Plan library, 31 built-in training plans" | 58 today (section 2.2). |
| 260 | "Exercise library, 551 exercises plus your own" | 923 today (section 2.1). |
| 299-303 | Section "On iPhone?" / "Volyume for iOS is coming to the App Store very soon." | The App Store listing is live. This contradicts line 166 on the same page. |
| 322-346 (HTML comment block, lines 333-336 and 342-345 in particular) | Claims table traces everything to PRODUCT-FACTS "dated 2026-07-12" and lists `"iOS coming soon"` and the old counts as the page's claims | The traces are stale; the block is an HTML comment (not user-visible) but it is the repo's record of what was approved. |

### 6.2 Stale or misleading (not strictly false)
| Line | Text | Why |
|---|---|---|
| 173 | Hero screenshot `02_know_what_to_do_today.jpg`, alt text "showing morning weight, the next workout and check-in readiness" | Image shows a five-tab bar (Today, Train, Nutrition, Progress, Coach); the app has six, with Community. It leads with a weight card ("198 lbs") and "1 of 3 morning weigh-ins", the scale-as-hook that CLAIMS-STANDARDS §5 bans, and the Today screen has since been rebuilt (`CURRENT-APP-MAP.md` §3). |
| 220 | `05_log_every_set.jpg` | Predates the logger revamp (What's New 3.0.0 to 3.2.0, `WhatsNewSheet.js:179-198`). The screen is the pre-revamp logger. |
| 229 | `06_meals_planned_to_your_targets.jpg` | Header reads "Eat" and the date "Sun 12 Jul"; the screen is now titled "Nutrition" (`DiaryScreen.js:1897`) and food was rebuilt in October (What's New 2.17.0 to 2.19.0). Five-tab bar. |
| 238 | `03_plan_that_moves_with_you.jpg` | Five-tab bar; the Train screen has since gained plan tools (`CURRENT-APP-MAP.md` §4.1). All four screenshots are 2026-07-12 captures of a demo account "Alex" (`marketing/hq/assets/screenshots/Volyume_Selected_Screenshots_Manifest.md`, usage rules). The four files in `public/screenshots/` are byte-identical to those in `marketing/hq/assets/screenshots/` (checked with `cmp`). |
| 161, 203-204 | "Each week it decides whether to change or hold" / "The weekly check-in decides. Change or hold" | Needs the qualifier "by default you tap to apply" (PRODUCT-FACTS §A copy rule; `SettingsCoachingScreen.js:229-240`). "makes the weekly decision" at line 160 is permitted wording; "decides what to change" unqualified is not. |
| 194 | Step 2: "It builds your plan and targets ..." | True only for the "Set up coaching" start route; the other two routes defer coaching (`StartChoiceScreen.js:30-46`). |
| 199, 290 | "The local database on your device is the source of truth." | True but insider jargon (CLAIMS-STANDARDS §9 item 11). |
| 265 | "Over 29,000 UK foods, searchable offline" | Count true (29,279). "UK" needs a hedge; searchable offline after first-launch import (section 2.3). |
| 267 | "Progress Scan, a progress score from your own photos" | True, but omits what PRODUCT-FACTS §F requires: a confidence level, and that it may decline to score. |
| 268 | "Weekly Precision Coaching, the change-or-hold decision" | The name exists only in the Methodology and Goal-lock screens; people meet "Weekly check-in" and "Coaching decision". |
| 269 | "Advanced progression" | No such label anywhere in the app. It is a PRODUCT-FACTS §B list item with no matching screen or string. Replace with what exists (target weight and reps suggested set by set in the logger, plan-level progression). |
| 291 | "Cloud-backed account data is stored in the EU, in Dublin." | Needs the Resend exception wherever it stands as an unqualified residency line (section 5, item 5). "Dublin" is doc-stated. |
| 293 | "no personal identifiers go to analytics" | Usage rows carry a pseudonymous account id (section 5, item 8). Use "no third-party analytics" instead. |
| 288 | "The specific posture, not a vague slogan." | Fails CLAIMS-STANDARDS §9 item 3 (negation pivot). Style, not fact. |
| 316 | Footer shows only "Get it on Google Play" | App Store link missing from the footer. |
| 150, 162-167 | Nav "Get the app" and hero buttons | Fine and already linked to both stores (HEAD). The App Store link is a text link, not the official badge. |
| missing | Community, set videos, share cards, gym challenge, recovery estimate, meal plans, raw/cooked weights, training styles, the six-tab layout, sign-in options | True and reachable but absent from the page. |

### 6.3 Guards a rebuild must respect
- `src/__tests__/memberEmailWebsite.guard.test.js:140`: `public/index.html` must not match `/\/members/`.
- `src/__tests__/marketingClaimsGuard.test.js` bans R2 medical-purpose terms and population-claim terms on `docs/PLAY_STORE_LISTING.md`, `docs/APP_STORE_CONNECT_LISTING.md`, `public/get/index.html` and `marketing/hq/PRODUCT-FACTS.md`. `public/index.html` is not listed, but CLAIMS-STANDARDS §9A applies by hand.
- The privacy page, support page and the pages named in `privacyTruth.guard.test.js` / `usageDataDisclosure.guard.test.js` are byte-tested; do not edit them as part of the homepage.
- `public/get/index.html` (already live, already links both stores) says "its weekly suggestions only take effect when you apply them", unqualified; it reuses the same four stale screenshots. Out of scope, but it carries the same two weaknesses.
- Public copy rules: no em dash, no exclamation mark, British English, no banned hype words (CLAIMS-STANDARDS §8 and §9).

---

## 7. UNKNOWN or founder-held (omit from public copy until established)

- Which app version is live on Google Play and on the App Store (PRODUCT-FACTS.md:269-271).
- Whether a gym challenge is running; any prize wording (migrate_203 header: 0 challenges on 2026-10-20).
- Apple Health / Health Connect: absent in code; the policy's section 6 still describes it (founder to resolve the policy, not the homepage).
- Store ratings, user counts, download counts, testimonials: none exist in the repo; CLAIMS-STANDARDS §5 bans invented ones.
- Whether Google sign-in will be on iPhone for the next build (empty iOS client id at `src/lib/supabase.js:556`).
- Production region confirmation from the Supabase dashboard (doc-stated only).
- How many notification types, migrations, tables or screens: not re-counted, do not use.

## 8. Assets and constraints the rebuild may want

- Fresh app renders (not device captures): `screenshots/current/01-today.png` to `15-workout-summary.png`, made 2026-10-20 at version 3.2.0 by the repo's paper-render harness (Jest plus headless Chromium, seeded example user). Images and chart canvases are not drawn (avatars show as dark boxes). They show the six-tab layout. [DOC `CURRENT-APP-MAP.md:10-24,996-1018`] They are screen renders, so caption them as such or have the founder capture device screenshots (CLAUDE.md: the founder works from a phone).
- Brand files: `public/volyume-wordmark.png`, `public/volyume-v.png`, `public/favicon.png`. Theme tokens: `--bg #0D0D0D`, amber `#F5A623`/`#E08C0B` in the current page.
- The Play badge currently loads from `play.google.com/intl/en_us/badges/...` (external). No Apple badge asset exists in `public/`.
- Founder rule on builds: nothing here authorises a build or store submission.
