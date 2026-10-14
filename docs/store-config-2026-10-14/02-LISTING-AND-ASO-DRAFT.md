# Store listing and ASO draft, 2026-10-14

Status: DRAFT for founder review. Nothing here is published. Written against app version 2.14.0 (`package.json`, `app.json`, `src/components/WhatsNewSheet.js`). British English, no em dashes, no exclamation marks, no price/trial/upgrade language, no "AI" wording.

Read first, and why it matters: `docs/PLAY_STORE_LISTING.md` and `docs/APP_STORE_CONNECT_LISTING.md` both carry a 2026-08-10 banner saying they are STALE on cardio and must not be pasted. Their long descriptions still claim cardio logging, "400+" or "150+" exercises, "No social feed. No public profiles", an em dash and "bodybuilding logbook". This draft replaces the description copy; it does not reuse those blocks. Also stale in the repo: `marketing/hq/CLAIMS-STANDARDS.md` sections 3, 4 and 5 (trial, GBP prices, "barcode scanning is a Pro feature") and `marketing/hq/PRODUCT-FACTS.md` sections E and F ("iOS TestFlight / coming soon") contradict PRODUCT-FACTS section A (corrected 2026-08-25, App Store live) and section B (fully free, 2026-09-03). Section B and CLAUDE.md win.

## A. Competitor table

Method: web search on 2026-10-14 (standard mode). The search tool mostly returned third-party mirrors, review sites and aggregators rather than the live store pages, so nearly every row is second-hand. Store titles and subtitles change; verify on the live listing before relying on a row. Prices are USD unless stated and vary by region.

| App | Store title (as seen) | Tagline / short description (as seen) | Keyword themes | Pricing posture | Complaints a free app could answer | Source | Verification |
|---|---|---|---|---|---|---|---|
| Strong | Strong Workout Tracker Gym Log | "The most intuitive workout and exercise tracker for any fitness routine." Mentions Apple Watch app, routines, rest timers, 1RM and volume graphs | workout tracker, gym log, routine, rest timer, 1RM | Free with a cap of 3 custom routines; Pro $4.99/month or $29.99/year per listing text; lifetime option reported by reviews | Routine cap on the free plan. No price-complaint source found | https://apps.appfollow.io/ios/strong-workout-tracker-gym-log/464254577?country=es ; https://www.sensai.fit/blog/strong-app-review-2026 | Listing text via AppFollow mirror (undated crawl, shows an Oct 2026 update); pricing partly from a review site. Mark UNVERIFIED on exact figures |
| Hevy | Hevy - Gym Log Workout Tracker | Play short description could not be retrieved. Third-party copy: log workouts and track progress for free; "weightlifting tracker and planner" | gym log, workout tracker, planner, social | Free tier reported as unlimited logging, 4 routines, 7 custom exercises, 3 months of graph history; Pro reported around $2.99/month, $23.99/year, $74.99 lifetime | Free-tier caps tighter than the listing implies (review site opinion) | https://similarweb.com/zh/app/google/com.hevy ; https://www.sensai.fit/blog/hevy-review-2026 ; https://www.hevyapp.com/ | Play wording UNVERIFIED. Free caps and prices from affiliate-style review pages, undated. Treat as unverified |
| MyFitnessPal | MyFitnessPal: Calorie Counter (title not confirmed in results) | Subtitle not retrieved | calorie counter, food diary, macros, barcode | Free base; Premium reported $19.99/month or $79.99/year, Premium+ $24.99/month or $99.99/year; barcode scanner moved behind Premium on 1 Oct 2022 | Barcode scanner paywalled; logouts, crashes and sync failures reported by free and paying users (Unstar analysis of 300 Play reviews, July 2026) | https://digitaltrends.com/phones/myfitnesspal-barcode-scanning-not-free-premium-subscription ; https://unstar.app/blog/is-myfitnesspal-premium-worth-it-paywall-app-reviews-2026 ; https://content.fitbudd.com/post/myfitnesspal-app-cost | Scanner removal: dated and reported by a news site. 2026 prices from a blog: UNVERIFIED. Unstar is a review-analysis vendor: weigh accordingly |
| MacroFactor | MacroFactor - Macro Tracker | Description opener: "Reach your diet goals with the smartest macro tracker and nutrition coach". Subtitle not retrieved (storefront shows category-style lines such as "Calorie, Nutrition, Food, Diet" in the US) | macro tracker, nutrition coach, calorie, diet | No free tier; free trial; $11.99/month, $47.99/half year, $71.99/year per the App Store listing | No free option; trial-then-charge complaints; some reviewers say it offers little beyond MyFitnessPal's free tier (single review quote) | https://apps.apple.com/app/id1553503471 ; https://help.macrofactorapp.com/en/articles/393-how-macrofactor-subscriptions-and-bundles-work | Title, description opener and prices from the official App Store page (best source in this table). Complaint themes from rival-vendor blogs: UNVERIFIED |
| Cronometer | Cronometer: Calorie Counter | Subtitle not retrieved | calorie counter, nutrition, micronutrients | Free base; Gold $10.99/month or $59.99/year per listing (ad-free, fasting timer, recipe importer, macro scheduler, custom charts) | Ads on free plan implied by "ad-free" Gold pitch | https://apps.apple.com/app/cronometer-calorie-counter/id1145935738 ; https://apps.apple.com/us/app/-/id1145935738 | Title and Gold features from the App Store page; undated |
| Fitbod | Fitbod: Gym & Fitness Planner (via aggregator) | Subtitle not retrieved | workout planner, gym, fitness planner | Subscription; reported $15.99/month, $95.99/year, 7-day trial | Unexpected charges and cancelling reported by about 15% of users (one aggregator estimate); repeated workouts; limited variety | https://kimola.com/reports/unlock-insights-fitbod-app-customer-feedback-analysis-app-store-us-156948 ; https://www.thepricer.org/how-much-does-fitbod-cost/ | Percentages are from SEO and aggregator pages: UNVERIFIED |
| JEFIT | JEFIT Workout Planner Gym Log | Play short description not found | workout planner, gym log, routines | Elite $69.99/year, $12.99/month per App Store listing; several other tiers shown | Not researched beyond pricing | https://apps.apple.com/app/id449810000 | Prices from App Store page; undated |
| Lose It! | Lose It! - Calorie Counter | Subtitle not retrieved | calorie counter, weight loss, barcode | Premium reported around $39.99/year; App Store page lists the barcode scanner under Premium features, other sources disagree | Barcode scanning confusion; users switched to it when MyFitnessPal paywalled its scanner (Kimola summary) | https://apps.apple.com/it/app/lose-it-calorie-counter/id297368629?l=en-GB ; https://kimola.com/reports/myfitnesspal-removes-free-barcode-scanner-feature-140890 | Scanner status CONFLICTING across sources: UNVERIFIED |

Reading the table (observed, then inference):
- Observed: every named rival has either a feature cap, a subscription or both. Barcode scanning is behind a paywall at MyFitnessPal and listed as Premium at Lose It!. Strong and Hevy cap routines on free plans.
- Inference, not fact: the claim "full barcode scanning, unlimited routines, unlimited history, free, no ads" is a real contrast. It must be stated about Volyume only, never as a statement about a named rival (CLAIMS-STANDARDS section 5, superiority claims).
- Titles follow one pattern: brand, then a head keyword ("Workout Tracker", "Gym Log", "Macro Tracker", "Calorie Counter"). Subtitles were not retrievable for most apps, so subtitle patterns are UNKNOWN.
- Screenshot approach: not retrievable through search. UNKNOWN. Do a manual pass of each live listing before locking section D.

## B. Google Play draft

Language: English (United Kingdom). Category: Health & Fitness. Package: `app.volyume`.

**Title (25/30)**
```
Volyume: Gym Log & Macros
```

**Short description (67/80)**
```
Log lifts and food, get a clear weekly plan. Free, no ads, no card.
```

**Full description (3197/4000)**
```
Volyume is a gym log and food diary with a weekly coaching review, made for people who train on their own. It is free, with no ads, no card and no time limit.

LOG YOUR TRAINING
Your whole session sits on one screen: every exercise, every set, and what you lifted last time beside each row. Type your reps, tap the tick and the set is saved. A rest timer, personal best alerts and a history for each exercise are built in. Logging works offline and syncs to your account when you reconnect.

Personal bests are tracked three ways: estimated one-rep max, heaviest weight, and most reps at a weight.

PLANS BUILT AROUND YOUR WEEK
Start from the library of 47 training plans, or have Volyume build one from your goal, your training days, your session length and your equipment. Every session is checked so that no muscle is trained hard two days running, and if a plan needs more time or more days, it asks you first. Choose general training or one of eight physique divisions as your goal, from Men's Physique to Women's Bodybuilding.

You can also tell Volyume which movements and positions to keep out of your plan. It builds around them, and you can allow an exercise back whenever you want.

More than 500 exercises are built in, and you can add your own.

EAT AND TRACK MACROS
Search more than 29,000 UK foods, even without a signal. Scan a barcode, or scan a nutrition label and have it read on your phone. Build recipes once and log them as one line, save the meals you eat often, or quick add a figure.

Daily calorie and macro targets are worked out from your profile, your training and your goal. You can choose your calorie target anywhere inside your estimated range, and your macros follow. Targets never go below built-in safety minimums.

A WEEKLY COACHING REVIEW
Once a week you check in. Volyume reads your logged training, food and check-in, then makes a change-or-hold call and explains the reasons in plain words. It proposes and you decide: nothing changes until you tap Apply. If there is not enough data to act on, it holds and says so.

The coaching is rule-based, not generated. The same inputs give the same decision, and every decision shows its working.

SEE WHERE YOU STAND
Recovery by muscle, weekly sets against your plan's own ranges, consistency, a volume heatmap and strength trends for every lift. Body metrics and optional progress photos sit alongside. Progress photo files stay on your phone unless you choose to share or export them.

COMMUNITY (OPTIONAL)
Follow people, join groups, message them and take on a sessions challenge together. Sharing is your choice and can be turned off in Settings. Showing that you are training right now is off until you turn it on.

YOUR DATA
Your data is encrypted on your phone and backed up to servers in the EU (Dublin). There are no ads and nothing you log is sold. Export your workout sets as a CSV, make a full backup file, or import a workout history CSV from Hevy or Strong. Gym weights work in kg or lb, and body weight in kg, lb or stone.

NOT MEDICAL ADVICE
Volyume gives training and nutrition guidance, not medical advice. Speak to a qualified professional before you make big changes to your diet or exercise.
```

**Tags / category.** Category Health & Fitness (matches `docs/PLAY_STORE_LISTING.md` App Details). Play tags are chosen from a fixed list inside Play Console; the list was not retrievable, so these are CANDIDATES to look for, not verified options: Fitness, Weightlifting, Strength training, Nutrition and diet, Workout. Pick up to the number the Console allows.

**Keyword weaving check.** Terms the 2026-06-08 ASO shortlist and `docs/GROWTH_STRATEGY_SYNTHESIS_LOCKED.md` section 5.2 call for, and where they appear: gym log (title, line 1), food diary (line 1), macros (title), barcode (Eat), hypertrophy (not in the body; see open question 4), strength trends, progressive overload (deliberately omitted: no claim in code that Volyume automates overload; see F row 21), weekly check-in, nutrition label.

**Three alternative title and short-description pairs**

| # | Title | Chars | Short description | Chars |
|---|---|---|---|---|
| 1 | Volyume: Workout Tracker | 24 | Track every set and meal, with a weekly plan review. Free, no ads. | 66 |
| 2 | Volyume: Lifting & Macros | 25 | A gym log, food diary and weekly coaching in one free app. No ads. | 66 |
| 3 | Volyume: Hypertrophy Log | 24 | Plan, log and review your training and food each week. Free to use. | 67 |

Note on pair 3: "Hypertrophy" is a niche term; it narrows the audience and lowers reach on the head term "workout tracker". Test it as a variant, not as the default.

Counts were computed by script (Python `len` on the exact strings above) on 2026-10-14. Re-check after any edit.

## C. App Store draft

Primary language: English (U.K.). Bundle ID `app.volyume`. Store page: https://apps.apple.com/gb/app/volyume/id6777083702 (from PRODUCT-FACTS section A; fetched HTTP 200 on 2026-08-25, not re-fetched today).

**Name (25/30)**
```
Volyume: Gym Log & Macros
```

**Subtitle (28/30)**
```
Workout tracker & food diary
```

**Promotional text (146/170)**
```
Plans are now checked so no muscle is trained hard two days running, and you can set your calorie target anywhere inside your range. Free, no ads.
```

**Description (3197/4000).** Same body as Google Play (plain text; Apple shows no markdown). Paste the block in section B. It names no Android-only feature (the home screen widget is Android only and is left out) and no other store.

**Keywords (97/100)**
```
hypertrophy,bodybuilding,lifting,strength,barcode,calorie,protein,nutrition,planner,weightlifting
```
Rules applied: comma separated, no spaces, singular forms, no repeat of any word in the name or subtitle (volyume, gym, log, macros, workout, tracker, food, diary), no competitor names, no "free". Apple indexes name, subtitle and this field together, so phrases are built from the combination, for example "gym log", "workout tracker", "food diary", "barcode calorie". Keyword popularity was not measured (no ASO tool access): validate with AppTweak or Sensor Tower on a UK storefront before locking, as `docs/PLAY_STORE_LISTING.md` already advises.

**URLs (placeholders to confirm live before submission)**
- Support URL: https://volyume.app/support
- Marketing URL: https://volyume.app
- Privacy Policy URL: https://volyume.app/privacy
(All three are taken from `docs/APP_STORE_CONNECT_LISTING.md`; liveness not checked today.)

**Categories.** Primary: Health & Fitness. Secondary: Sports (as in `docs/APP_STORE_CONNECT_LISTING.md`). Alternative secondary to test: Lifestyle is not recommended; keep Sports.

**What's new, version 2.14.0 (571/4000).** Condensed from `WHATS_NEW['2.14.0']` in `src/components/WhatsNewSheet.js`, same three facts, same order, same wording. Google Play's release-notes field is 500 characters, so the Play version needs a shorter cut (open question 6).
```
Plans are built a new way. Every session is checked so that no muscle is trained hard two days running, sessions keep to the length you choose, and if a plan needs more time or more days, it asks you first.

You can now choose your daily calorie target anywhere inside your estimated range, and your macros follow.

Community has its own tab. See what the people you follow are training, join groups, chat with them and take on a challenge together. Our privacy policy now covers Community, including how to turn sharing off. Find it in Settings, under Privacy and legal.
```

## D. Screenshot plan

Eight screens in order. Captions are in plain words (CLAIMS-STANDARDS section 9 rules 10 and 11: say-it-out-loud, no insider compression). Screens must be real app UI with realistic example data, no bodyweight on screen, no before/after body imagery, no scale-centric frames (CLAIMS-STANDARDS section 5). Seed demo data must not look like a real person's details.

| # | Screen | Caption | Screen file |
|---|---|---|---|
| 1 | Logger: one screen, every set, last session beside each row | Every set on one screen, with last time beside it | `src/screens/ActiveWorkoutScreen.js` |
| 2 | Plan preview: session checked, length chosen | A plan built around your days and session length | `src/screens/PlanPreviewScreen.js`, `PlanLibraryScreen.js` |
| 3 | Food diary with barcode scan | Scan a barcode and log it in seconds | `src/screens/DiaryScreen.js`, `ScanBarcodeScreen.js` |
| 4 | Nutrition targets with calorie range choice | Pick your calories inside your range and your macros follow | `src/screens/NutritionTargetsScreen.js` |
| 5 | Weekly coach output: change-or-hold with reasons and Apply | A weekly check-in that says what to change, and why | `src/screens/CoachOutputScreen.js` |
| 6 | Recovery by muscle | See how each muscle is recovering | `src/screens/RecoveryScreen.js` |
| 7 | Progress: volume heatmap or lift progress | Your weekly sets and strength trends in one place | `src/screens/VolumeHeatmapScreen.js`, `LiftProgressScreen.js` |
| 8 | Community feed or groups | Follow people, join groups, take on a challenge | `src/screens/CommunityHubScreen.js` |

Order logic: logger first (core job), plan second, food third (second job), then the coaching decision (the differentiator), then depth. Per `docs/GROWTH_STRATEGY_SYNTHESIS_LOCKED.md` section 5.2, specific coaching features should appear in the first three frames for the lifting-led variant; the custom product page in E reorders for that. Progress Photos is not in the eight: it is a permitted feature to market (CLAIMS-STANDARDS section 5) but needs a founder-approved, non-body-image frame, so it is held for a later set.

**Device sizes (verified by search 2026-10-14; sources are third-party blogs, not Apple or Google pages, so confirm in the consoles)**
- App Store: the iPhone 6.9-inch set is the required one; reported accepted portrait sizes 1320 x 2868 (most recommended master), 1290 x 2796, 1260 x 2736 (acceptance of this one is disputed across sources). 6.5-inch (1242 x 2688 or 1284 x 2778) is a valid alternative; Apple scales the largest set down. App Store Connect reportedly rejects dimensions off by one pixel. Up to 10 screenshots per set. No iPad set is needed because `app.json` has `"supportsTablet": false`. Sources: https://theapplaunchpad.com/blog/app-store-screenshot-guidelines ; https://www.applaunchflow.com/blog/app-store-screenshot-specifications-2026 ; https://butterkit.app/guides/app-store-screenshot-sizes/. One source claims a September 2026 rule needing an iPad image; that conflicts with an iPhone-only build and is UNVERIFIED, so check App Store Connect before upload.
- Google Play: phone screenshots JPEG or 24-bit PNG, no alpha, each side 320 to 3,840 px, up to 8 per device type, 8 MB per file; real app UI only, misleading visuals and device frames can be rejected. Feature graphic 1024 x 500, JPEG or 24-bit PNG, no alpha, required to publish. Icon 512 x 512 PNG. Sources: https://support.google.com/googleplay/android-developer/answer/9866151 ; https://appradar.com/blog/android-app-screenshot-sizes-and-guidelines-for-google-play. The sources disagreed on icon alpha; follow the Console upload page. Tablet screenshots: not needed while tablets are not a target (`docs/PLAY_STORE_LISTING.md` distribution says phones only).

**Feature graphic idea (1024 x 500).** Dark background in the app's own theme tokens (`src/styles/theme.js`), the logger set table cropped on the left at about 60 percent width, one line on the right: "Gym log and food diary. Free, no ads." No phone frame, no person, no body, no scale. Keep key text inside the central safe area because Play crops it on some surfaces (UNVERIFIED crop behaviour; test on a device).

## E. Custom product pages, Play custom listings, experiments

Context: `docs/GROWTH_STRATEGY_SYNTHESIS_LOCKED.md` section 2.5 (Custom Product Pages underused, cited AppTweak 2025 benchmark) and 5.2 (three pages: nutrition-led, lifting-led, coach-referred). Caveat: the app is new with low traffic, so a test may take weeks to reach a readable sample. Play store listing experiments and Apple product page optimisation were not verified by search this session (the Play search returned asset specs only); confirm availability and limits in the consoles.

| # | Hypothesis | Variant | Metric | Decision rule |
|---|---|---|---|---|
| 1 | Leading the screenshots with the logger beats leading with the food diary for people searching "gym log" and "workout tracker" | Play store listing experiment on screenshot order: A = section D order, B = food first | Store listing acquirers divided by store listing visitors (Play Console experiment metric), 90 percent interval | Ship B only if the interval excludes zero; otherwise keep A |
| 2 | A first screenshot and short description that say "Free, no ads" lift install conversion versus one that leads with coaching | Play short description pair: current vs alternative pair 2 (section B) | Same conversion metric, plus day-1 retention of the acquired cohort from first-party telemetry | Keep the winner only if day-1 retention is not lower |
| 3 | Nutrition-led search traffic (barcode, calorie, macros) converts better on a page that opens with the food diary and barcode scan | Apple custom product page "nutrition-led" with its own deep link, screenshots 3, 4, 1, 5, 6, 7, 8 and the same text; the default page stays lifting-led | Product page conversion rate in App Analytics for the custom link, compared with the default page | Keep the page if it outperforms on its own traffic; a custom page needs its own URL, so it only helps if the founder uses that link in nutrition-themed posts or ads (no paid acquisition per growth strategy section 2.2) |

Also available later: a coach-referred page (growth strategy 5.2). The coach programme is not described in `PRODUCT-FACTS.md` as shipped, so no copy is drafted for it (UNKNOWN).

## F. Claim-to-source map

Key: PF = `marketing/hq/PRODUCT-FACTS.md`; CS = `marketing/hq/CLAIMS-STANDARDS.md`; WN = `src/components/WhatsNewSheet.js`. "Re-verify" means the cited line is dated and the number must be checked in the build before submission.

| # | Claim in the copy | Source | Status |
|---|---|---|---|
| 1 | Free, no ads, no card, no time limit | PF section B; `src/lib/proGate.js:43` (`FULL_ACCESS_FOR_ALL = true`); PF section E "No adverts" | Verified |
| 2 | Gym log and food diary with weekly coaching review | PF section A; screens `ActiveWorkoutScreen.js`, `DiaryScreen.js`, `WeeklyCheckInScreen.js`, `CoachOutputScreen.js` | Verified |
| 3 | Whole session on one screen, last session beside each row, tick to save | WN 2.9.0, 2.10.0 entries | Per release notes; device-check before submission |
| 4 | Rest timer, personal best alerts, history per exercise | `docs/PLAY_STORE_LISTING.md` feature list (rest timer, PR detection); PF section H (PB alert); WN 2.8.0 (history and best reps one tap away) | Verified in docs; device-check |
| 5 | Works offline, syncs when you reconnect | CLAUDE.md section 1 (offline-first, push on save, queued retry); PF section E | Verified in docs |
| 6 | Three PB types: estimated one-rep max, heaviest weight, most reps at a weight | PF section D (`src/lib/algorithms.js` `PR_TYPE_RANK`) | Verified 2026-07-12; re-verify |
| 7 | 47 training plans | PF section D; `src/lib/seedRoutines.js` `LIBRARY_PLANS`; `seedRoutinesLibraryData.test.js` | Verified 2026-08-25; re-verify |
| 8 | Plan built from goal, days, session length, equipment | WN 2.14.0, 1.2.1 (equipment); PF section A (onboarding builds the plan) | Verified in docs |
| 9 | Every session checked so no muscle is trained hard two days running; asks first if more time or days are needed | WN 2.14.0 line 1 (register D222) | Per release notes. Founder-authored copy; scope: plan builder only |
| 10 | General training or eight physique divisions, Men's Physique to Women's Bodybuilding | PF section D (`src/lib/coachingGoals.js` `PHYSIQUE_GOALS`, 9 options) | Verified 2026-07-12; re-verify |
| 11 | Tell Volyume which movements and positions to keep out; allow back any time | `docs/APP_STORE_CONNECT_LISTING.md` What's New (review-scrubbed wording); PF section H; `src/screens/HowYouTrainScreen.js`; CS section 9A (neutral wording, no population, no medical framing) | Wording copied from the review-scrubbed field |
| 12 | More than 500 exercises, add your own | PF section D says 551 (`src/lib/seedExercises.js`); that file is now a 341-line module that reads `src/lib/exerciseCorpus/`, so the cited line range is stale and the count was not re-derived this session | RE-VERIFY before submission; "more than 500" is a floor taken from 551 |
| 13 | More than 29,000 UK foods, searchable offline | PF section D (26,427 + 2,852 = 29,279; `assets/seed/off_uk_snapshot.dat`, `cofid_uk.dat` exist) | Verified 2026-07-12; snapshot refreshes weekly; wording follows PF guidance |
| 14 | Barcode scan | PF section B; `src/screens/ScanBarcodeScreen.js` | Verified |
| 15 | Nutrition label scan, read on the phone | `src/screens/ScanLabelScreen.js` (on-device ML Kit recogniser, "Label scanning still works offline") | Verified in code |
| 16 | Recipes as one line, saved meals, quick add | `docs/PLAY_STORE_LISTING.md` food section; `RecipeBuilderScreen.js`, `MyMealsScreen.js` | Verified screens exist |
| 17 | Calorie target anywhere inside estimated range, macros follow | WN 2.14.0 line 2 (register D226) | Per release notes |
| 18 | Targets never go below built-in safety minimums | CLAUDE.md section 2 (floors 1,500 / 1,200 kcal); `src/lib/nutritionEngine.js`, `coachApply.js`. No numbers are in the copy | Verified in constitution; no figure published (ED-safety: do not state thresholds as marketing) |
| 19 | Weekly check-in; change-or-hold call with reasons | PF section A; CS section 6 ("coach" means the structured weekly decision) | Verified |
| 20 | Nothing changes until you tap Apply | PF section A "coach PROPOSES, the athlete APPLIES" (`src/lib/coachApply.js`, `CoachOutputScreen.js`) | Verified 2026-05/08; button label "Apply" to be checked on device |
| 21 | Holds and says so when there is not enough data | PF section A; PF section D (`MIN_WEIGH_INS`, `weeklyCoach.js`) | Verified. Weight is deliberately not mentioned (CS section 5 last bullet) |
| 22 | Rule-based, not generated; same inputs give the same decision; shows its working | CS section 6 ("deterministic coaching, not generative coaching"); CLAUDE.md section 2; PF section A (scoped to the decision; no blanket "no AI") | Verified. The words "AI" and "no AI" do not appear |
| 23 | Recovery by muscle | WN 2.4.0 to 2.6.0; `src/screens/RecoveryScreen.js` | Verified |
| 24 | Weekly sets against your plan's own ranges | WN 2.7.0 line 6 | Per release notes |
| 25 | Consistency, volume heatmap, lift progress | `ConsistencyScreen.js`, `VolumeHeatmapScreen.js`, `LiftProgressScreen.js`; WN 2.6.0 | Verified screens exist |
| 26 | Body metrics; optional progress photos stay on the phone unless shared or exported | `BodyMetricsScreen.js`, `ProgressPhotosScreen.js`; `docs/PLAY_STORE_LISTING.md` Data Safety; `docs/APP_STORE_CONNECT_LISTING.md` practices | Verified in docs. No Progress Scan score claim made |
| 27 | Community: follow, groups, messages, sessions challenge; sharing can be turned off; "training right now" off until turned on | WN 2.8.0 and 2.14.0; `CommunityHubScreen.js`, `CommunityPrivacyScreen.js`, `CommunityGroupChatScreen.js` | Per release notes; device-check the privacy panel |
| 28 | Encrypted on the phone | CLAUDE.md section 1 (`dbCrypto.js`, SQLCipher); PF section E | Verified |
| 29 | Backed up to servers in the EU (Dublin) | CLAUDE.md section 1; PF section E | Verified |
| 30 | Nothing you log is sold | PF section E; Data Safety tables | Verified |
| 31 | Export workout sets as CSV; full backup file | `SettingsDataScreen.js` (`buildWorkoutCSV`); `src/lib/dataBackup.js`; `docs/APP_STORE_CONNECT_LISTING.md` | Verified |
| 32 | Import a workout history CSV from Hevy or Strong | `src/screens/ImportScreen.js` line 196 | Verified. Names two third-party products descriptively; see open question 7 |
| 33 | Gym weights in kg or lb; body weight in kg, lb or stone | `src/lib/units.js` header lines 4-5 | Verified |
| 34 | Not medical advice | Existing disclaimer in both listing docs; CS section 9A exempts honest disclaimers | Verified |
| 35 | Promo text and What's New facts | WN `'2.14.0'` | Verified against file |

Banned-content self-check (by hand and by script): no em dash, no exclamation mark, no "AI", no price, trial, subscription, Pro or upgrade wording, no rhetorical-question opener, no "whether you are", no hype words from CS section 9 rule 6 ("comprehensive", "seamless", "unlock", "robust"), no before/after claim, no health outcome, no superiority claim, no weight-loss framing, no cardio or steps claim (both removed from the product: D95 banner in both listing docs; `docs/PLAY_STORE_LISTING.md` Data Safety note). British spellings used (programme avoided in favour of "plan"; "personalised" not used). Marketing claims guard `src/__tests__/marketingClaimsGuard.test.js` runs over the old listing files and PRODUCT-FACTS; it was NOT run against this draft. Run the `marketing-claims-check` skill and the guard after any paste into the real listing files.

## Open questions for the founder

1. Title: "Volyume: Gym Log & Macros" vs a pair from section B. Which becomes the first experiment?
2. "Precision Coaching" is left out of the copy (trademark posture unresolved, COPY-003 in `docs/PLAY_STORE_LISTING.md`). Keep it out, or add it with the mark?
3. Content rating: the age-rating tables in both listing docs say User-Generated Content "No", but Community (posts, comments, messages) now exists. The questionnaires likely need re-answering before this description mentions Community. Unverified against the live Console answers.
4. "Hypertrophy" and "progressive overload" are not in the Play body. Hypertrophy is in the Apple keywords. Is it acceptable to leave overload out, since no code source says the app automates it?
5. The exercise count (551 in PRODUCT-FACTS) could not be re-derived this session. Who confirms it?
6. Play What's New is 500 characters; a cut of section C's text is needed. Approve a cut that drops the Community sentence, or keep all three facts in compressed form?
7. May the description name Hevy and Strong for CSV import? It is descriptive and true, but it names competitors.
8. May screenshot 8 show Community, given the privacy surface and example profiles that must be invented?
9. The PRODUCT-FACTS and CLAIMS-STANDARDS files still carry trial, price and "iOS coming soon" text. Should they be corrected so the compliance gate stops disagreeing with the product?
