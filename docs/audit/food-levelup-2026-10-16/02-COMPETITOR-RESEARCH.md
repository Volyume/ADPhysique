# Food diary level-up: competitor research (lane 02)

Written 2026-10-16. Research only: no source file was touched. Brief: beat MyFitnessPal (MFP) and Cronometer "in every possible way other than data source".
Depth: MFP and Cronometer in full; Lose It, MacroFactor, Yazio and Lifesum briefly.

## 0. How to read this, and how far to trust it

Source tags used below:
- [RSS] Apple App Store written reviews, read directly on 2026-10-16 from the public customer-review feed (`https://itunes.apple.com/{us|gb}/rss/customerreviews/page=N/id=<id>/sortby=mostrecent/json`; ids MFP 341232718, Cronometer 1145935738, Lose It 297368629, MacroFactor 1553503471, Yazio 946099227, Lifesum 286906691). 250 most recent per store per app (MacroFactor GB: 167). Observed, but self-selected: people who write a review skew angry. The headline star averages come from in-app rating prompts and are far higher (GB store, 2026-10-16: MFP 4.70 from 473,801; Cronometer 4.73 from 6,973; MacroFactor 4.75 from 1,977; Yazio 4.68 from 12,321; Lifesum 4.60 from 28,136). Both are true; neither alone is "what users think".
- [OFF] vendor's own page or store listing (read directly unless marked).
- [VEND] published by a competitor or the vendor about itself (MacroFactor, MyNetDiary, Nutrola, Fitia, Bento Bunny, Amy Food Journal, calorie-trackers.com). Treat as claims.
- [SUM] a search engine's summary of a page that returned 403 to this lane. All `support.myfitnesspal.com` and `blog.myfitnesspal.com` pages did, so MFP help-centre wording below is second-hand.
- [IMG] the vendor's App Store marketing screenshots, which I looked at. They are curated, so they show the best day, not the worst.

Not reachable: Reddit (fetch and search both refused), the MFP help centre, Cronometer support articles (403 on some), Google Play pages. Reddit evidence below is only what news sites and the Consumer Rights Wiki quote from it.
Fact versus inference: lines starting "Observed" are in a source. Lines starting "Suggests" are my reading and should be tested.

State of play on 2026-10-16 (observed):
- MFP replaced its Diary tab with a "Today" screen. Sources disagree on the date (Oct 2025 per Consumer Rights Wiki; 21 Apr 2026, v26.16.0, per PiunikaWeb and mwm.ai). Written reviews from June to October 2026 still call it "the new UI" and MFP says there is no revert.
- Cronometer's July to October 2026 reviews report heavier ads, a food-search ranking regression, lost custom foods after a September 2026 update, and no offline mode.
- MacroFactor has the best-liked UX, no free tier, and its speed claims are self-published.
- Barcode scanning is paid at MFP and Lose It, free at Cronometer.
- Written reviews of MFP, Lifesum and Yazio carry a distinct 2026 complaint: AI, confetti, coach messages and upsells that cannot be switched off.

---

## 1. The logging flow

### 1.1 Comparison (MFP and Cronometer, October 2026)

| Step | MyFitnessPal | Cronometer |
|---|---|---|
| Open to first tap | Opens on Today. Floating "+" bottom right; each meal card has a "Log" button; bottom tabs Today / Plan / Progress / More [IMG] | Opens on the diary with date arrows; "+" top right; each diary group has its own "+" (Gold); long-press app icon gives "Add Food" [OFF blog] |
| Search | Search-as-you-type covers only foods you have logged before; the online database needs an extra tap or the keyboard submit key [VEND FLSI]. 20.5M foods [OFF]. Green shield on verified items [IMG] | Tabs Common / Brands / Favorites / Custom / Restaurants, source filter, shows "85 Listed Nutrients, Data Source" on each food [OFF support, IMG]. Ranking regression reported Aug to Oct 2026 (below) |
| Recents and frequents | Recent and frequent lists are the fastest route once you have history [VEND]. Premium repeats a food over up to 7 days [OFF] | No recents-first ranking: "even if I used the item the day before the app can't find it by name" [RSS US 3*, 2026-10-09]. Favourites by star; swipe right on a custom food or recipe to add |
| Quick add | Calories quick add; macros and calories per meal is Premium [OFF premium page] | Exists, 7 actions by MacroFactor's count [VEND]. A user cannot "just log generic foods/calories" [RSS US 3*, 2026-09-29] |
| Copy and repeat | Today screen: "..." copies a whole meal to another meal; copying single items or whole days "isn't supported in that view" [SUM]. Swipe-right "copy yesterday" stamps everything with the time you swiped [RSS GB 1*, 2026-09-07] | Copy one entry (swipe, menu) or a whole day (Diary menu) free; copy a whole diary group and "Repeat Items" schedule are Gold [OFF blog] |
| Multi-add | Premium multi-day logging; multi-select copy and delete removed [RSS GB] | "Enable Multi-Add" in the search filter, free [OFF blog] |
| Voice | Premium "Voice Log" [OFF] | Gold, since v4.53.1, 29 Apr 2026; Siri on iOS [OFF blog] |
| Photo | Premium "Meal Scan"; confirm card lists items with kcal and a delete bin, then "Log breakfast" [OFF, IMG] | Gold "Photo Logging" since v4.43.0, Aug 2025; "Ingredient Suggestions" for missed butter and oil since v4.53.0 [OFF] |
| Barcode | Premium. Reviews say it used to be free [RSS] | Free. If the barcode is unknown, photograph the label and it fills a custom food [OFF] |
| Portions | Serving dropdown. UK review: cups and "oz" mean different things and grams are the only precise unit but the "app doesn't offer it on every food" [RSS GB 1*, 2026-10-12]. A Premium upsell sits inside the serving row and gets tapped by accident [RSS US 2*, 2026-10-12] | Confirm screen: Amount, Serving Size dropdown ("cup - 245g"), Timestamp (Gold), Group, then Energy Summary ring, macro bars and target bars, all before you confirm [IMG] |

### 1.2 The other four

| App | Logging notes |
|---|---|
| MacroFactor | Logger sheet: top pill "0 / 2476" (remaining of target), tabs Scan / Search / AI / Quick Add, a strip of recent foods as icon chips with "+", a time-aware "3 PM Picks" list showing kcal, P/F/C and a default serving in grams, a basket-style "Log Foods" button for multi-add [IMG]. Self-published action counts, lower is better: search 10, multi-add 6, barcode 5, quick add 3, total 24, against Lose It 32, MyNetDiary 30, MFP 15 for search and 7 for barcode [VEND]. Label scan reads UK-style labels poorly: "90% of the time it wont recognise a UK label" [RSS GB 2*, 2026-05-03] |
| Lose It | Search 13, multi-add 7, barcode 7, quick add 5 actions [VEND]. Snap It photo and AI voice are Premium [OFF listing]. July 2026 UI update: "daily calorie bar being invisible until you scroll down", pop-up calendar, "food search is so zoomed in" [RSS GB 1*, 2026-07-31]. Does not open on today: "caused logging on an incorrect day" [RSS US 4*, 2026-10-13] |
| Yazio | Summary ring "868 Remaining", meal rows with progress rings and an AI badge, gems, a flame streak and a mascot [IMG]. Photo AI is Pro. Reviews: a full-screen subscription promotion after every meal entry [RSS US 1*, 2026-10-11]; foods for tomorrow now paid [RSS GB 1*, 2026-08-03] |
| Lifesum | Since Dec 2025 a chat-style logger: text box "What do you want to track?" with camera, "+" and mic, and "Often tracked for breakfast" chips [IMG, OFF listing]. Reviews: "I cannot for the life me of figure out how to track a single item" [OFF listing, 2025]; "Where do you log oz/lb/gram/tb/tsp" [RSS US 1*, 2026-10-11] |

### 1.3 Evidence and URLs
- MacroFactor's Food Logging Speed Index defines four workflows and counts discrete actions from a fixed start page. Vendor-run, not neutral, but the method is public and the MFP "taco" example (a new user sees no results until they tap to search online) matches what MFP users describe. https://macrofactor.com/fastest-food-logger/ and https://macrofactor.com/fastest-food-logger-2025/
- MacroFactor's own claim that MFP needs "approximately 1.5 times more discrete actions": https://macrofactor.com/macrofactor-vs-myfitnesspal-2025/
- Cronometer's own list of logging methods and which are Gold: https://cronometer.com/blog/log-food-fast and https://cronometer.com/blog/?p=58829
- Cronometer release notes (voice, photo, ingredient suggestions, dates): https://cronometer.com/blog/cronometer-updates-whats-new-improved
- Cronometer search tabs and "Common Foods" behaviour (older staff answers): https://support.cronometer.com/hc/en-us/articles/360018193011
- Cronometer long-running complaints, from its own forum (jumbled entry order, food added just after midnight lands in the next day, no offline login mode, no fraction support, four-second lag typing a search): https://forums.cronometer.com/discussion/comment/14585/
- MFP Today copy rules [SUM]: https://support.myfitnesspal.com/hc/en-us/articles/39985611667341-Your-Today-tab
- MFP premium page: https://www.myfitnesspal.com/premium
- Accuracy of photo logging, observed: NIH researchers photographed 102 weighed meals and ran them through MFP, Lose It, CalAI and Appediet. All four under-reported by about 250 to 345 kcal and 30 g of fat on average (NUTRITION 2026, 25 to 28 July). https://www.news-medical.net/news/20260726/Photo-based-calorie-tracking-apps-fall-short-in-estimating-meal-nutrition.aspx
- No source measures taps from a cold app open; the Speed Index starts at the search page. The nearest observed figure is a paid MFP user since 2018: "You turned simple tasks into 4-5 clicks instead of 1-2" (May 2026, quoted at https://unstar.app/blog/is-myfitnesspal-premium-worth-it-paywall-app-reviews-2026).
- Suggests: the two things the best logger gets right are (a) the add screen already knows what you eat at this hour and (b) every row is one tap. Everything else in the table is a side route.

---

## 2. The diary view

### 2.1 Comparison

| Aspect | MyFitnessPal Today | Cronometer diary | MacroFactor |
|---|---|---|---|
| Hero | Calories bar "976 cal / 2,074" with "1,098 left"; three macro mini bars, grams eaten over goal [IMG]. Free accounts see macro percentages only [SUM] | Energy Summary and colour bars per macro with kcal or g and %; dots for more target pages; "Targets / Consumed" toggle [IMG] | Pill "0 / 2476"; one-tap swap between "consumed" and "remaining", remembered [OFF dashboard post] |
| Per-meal totals | Meal cards: "Oatmeal and 2 more, 430 cal, C 52% F 26% P 22%" [IMG]. Users say the per-meal calorie summary is buried or in smaller type [SUM, mwm.ai] | Diary group subtotals (web Gold since Nov 2022) | Timeline of logged times with a day total |
| Date nav | Week strip with ticks; reviews say you can no longer swipe between days and the "circles" are hard to read [RSS GB 2*, 2026-10-10] | Left and right arrows by the date; calendar showing complete days | Tap a day column; deselect it for the week summary |
| Meal sections | Meal cards with "View all" to the diary. Custom meal names not confirmed (help page unreadable) | Diary Groups: rename and reorder; free since v4.22.1, May 2024 [OFF notes]. Staff say names are "completely customizable" | Timeline, no fixed meals |
| Notes | Diary Notes removed per Consumer Rights Wiki [VEND wiki] | Notes are a diary entry type | Not covered |
| Water | "Healthy Habits" block at the bottom with water, exercise, steps [SUM]. "I don't log water anymore because it just doesn't stand out" [RSS GB 1*, 2026-09-07] | Water row in the diary ("Water 8 / 48 fl oz") and a diary widget [IMG, OFF notes] | Not covered |
| Exercise | Adds to the day's allowance ("net calories as a daily budget") [VEND griproom, SUM]. The toggle for the negative calorie adjustment moved to the website [RSS GB 1*, 2026-09-05] | Exercise rows show as negative kcal ("-450.0 kcal", Garmin) [IMG]. Energy Summary = BMR (Mifflin-St Jeor) + activity level + tracker + exercise + food effect; the baseline activity shrinks as logged exercise replaces it [SUM support] | Expenditure is estimated from intake and weight trend, not from exercise logs [OFF] |

### 2.2 The others in one line each
- Lose It: single dial of remaining budget [VEND]; has "Track Exercise Calories" toggle and a "Calorie Bonus" above a target burn [VEND]; user: "I burn 600 calories working out, and Lose It tells me I burned 4" [RSS US 1*, 2026-09-22].
- Yazio: ring of remaining; user wants the daily norm fixed instead of rising with burned calories [RSS US 2*, 2026-10-04, Russian].
- Lifesum: arc "Remaining 856 / 1712 kcal" with Eaten and Burned either side, macro bars, then a coach message card and food photos with kcal and macro chips [IMG]. Burned calories double-count with Apple Health in several 2026 reviews.

### 2.3 Evidence and URLs
- MFP Today change and what users lost: https://piunikaweb.com/2026/04/24/myfitnesspal-new-update-complaints/ (diary behind "View All"; per-meal macros harder to find; "gigantic, space-consuming cards") and https://consumerrights.wiki/w/MyFitnessPal_regressive_upgrade (timeline, features removed, MFP replies "our path forward").
- MyNetDiary's monthly scorecard: about 60% of April 2026 MFP reviews mention the redesign; "the food diary no longer shows the full day at a glance". Publisher competes with all six. https://www.mynetdiary.com/diet-app-scorecard-april-2026.html
- MacroFactor's dashboard rationale ("adherence-neutral", consumed or remaining by one tap): https://macrofactor.com/dashboard-revamp/
- Cronometer Energy Summary and activity multipliers, as summarised from support and staff forum posts: https://support.cronometer.com/hc/en-us/articles/30300963266452
- A four-year MFP user on the new diary: "everything is hidden behind at least one extra click, and I've mistracked on about 50% of days because of that" [RSS GB 1*, 2026-09-15].
- Suggests: nobody has built a diary that is both one screen and calm. MFP lost the one-screen property; Cronometer has it but dense; MacroFactor has calm but a timeline rather than meal groups.

---

## 3. Targets and feedback

| Aspect | MyFitnessPal | Cronometer | Others |
|---|---|---|---|
| Goal setup | Calorie goal from profile; a 1,200 kcal floor is enforced: "Your arbitrary minimum 1,200 calorie requirement doesn't make sense" [RSS US 2*, 2026-10-12]. Goal reverts to a default: "keeps changing my personal settings of calories goals" [RSS US 1*, 2026-10-09]; "Calorie goal in settings is 1500. Showing up in my daily diary as 1200" [RSS US 1*, 2026-10-07] | Weight goal sets the energy target. A UK reviewer was allowed a goal that produced 554 kcal a day [RSS GB 1*, 2026-09-30]. A v4.53.1 note claims "body-aware safety guardrails" in goal setup [SUM apkmirror] | MacroFactor: weekly check-in recomputes targets from weight trend and intake. Lifesum: a "goal weight too low" message and a calorie lower limit tied to BMR [OFF help]; custom calorie goal is Premium |
| Macros by day | Percent targets free; gram targets and per-meal macros Premium [OFF page, VEND] | Macro Scheduler (different targets per weekday) is Gold [OFF] | MacroFactor: custom programmes |
| Weekly view | Progress tab; "Food Insights & Comparison" Premium [OFF] | Reports and charts limited to a 7-day window free; Gold gives all time and custom charts [OFF] | MacroFactor: deselect the day to see the week; Energy Balance over 30 days. Review gap: weekly calorie summaries missing (MyNetDiary scorecard, VEND) |
| Nutrient reports | Nutrient Dashboard gone from the app; presets became extra views on the macro card [SUM] | Up to 84 nutrients free, 95 Gold; "Highlighted Targets" in two-column bars; Nutrition Scores (15 categories, up to 8 on the diary header, Gold) [OFF, IMG] | MacroFactor 54 tracked items [VEND] |
| Streaks | Week strip with ticks; a logging streak (log at least one food a day) [SUM]. Also fireworks and "high five" per logged item that cannot be turned off [RSS US 1*, 2026-10-13] | A "complete day" tick in the diary menu (v4.8.0). No streak counter | Yazio: flame counter; a user lost a 259-day streak on reinstall [RSS US 1*, 2026-10-10, Russian] |
| Reminders | Push for "recipes, meal suggestions, logging reminders with no way to disable" [RSS US 1*, 2026-10-13] | Not prominent in reviews | Yazio "motivators" cannot be disabled [RSS US 2*, 2026-10-04] |
| Weigh-in | Logged from Today; chart "defaults to since starting weight" [RSS US 4*, 2026-10-13]. Old "if every day were like today you'd weigh X in 5 weeks" message: a 2026 review still mentions "5wks" [RSS GB 2*, 2026-10-08] | Biometrics, custom biometrics Gold | MacroFactor: weight trend feeds expenditure. A reviewer: "I wish it would give you a reasoning" for each target change [RSS US 4*, 2026-09-08] |

Evidence and URLs
- Cronometer Nutrition Scores: https://cronometer.com/blog/nutrition-scores/ ; Gold feature list: https://cronometer.com/gold/
- Lifesum calorie lower limit: https://help.lifesum.com/en/article/how-can-i-change-my-daily-calorie-goal-czn92y/
- MFP macro card by tier [SUM]: https://support.myfitnesspal.com/hc/en-us/articles/39985611667341-Introducing-the-brand-new-Today-tab
- Suggests: the strongest target feedback in the field is MacroFactor's weekly check-in and the Cronometer micronutrient bars. Both fall short in the same place: nothing says in one plain sentence why a number changed.

---

## 4. Meal planning, recipes, saved meals, grocery lists

| Item | MyFitnessPal | Cronometer | Others |
|---|---|---|---|
| Saved meals | "My Meals": build once, log in a tap | Custom Meals, free; "explode" a meal into items [OFF blog] | MacroFactor: copy and paste, smart history [VEND] |
| Recipe from URL | "Add From Web" on the recipe screen [VEND third-party]; one May 2026 review says URL import moved behind Premium [VEND, unverified] | Recipe Importer is Gold; unmatched ingredients must be resolved before saving; servings imported from the page and editable [SUM support] | MacroFactor: AI photo or text recipe import, v5.7.6, 1 Apr 2026 [OFF listing]. Lose It: "Importing recipe from website... 'unknown error'" [RSS GB 2*, 2026-07-13] |
| Scaling and per-serving | Servings entered by you; a reviewer asks for "half-portion options and per-person ingredient breakdowns" [OFF listing, 2025] | Recipes are servings-based or weight-based; default full-recipe serving [SUM support] | MacroFactor: "batch recipe portions were sometimes off" [OFF listing, 2024] |
| Meal planner | Premium+ only: weekly plans from goals (10 diet approaches per a competitor blog), 1,500+ recipes, "Blue Check" dietitian-reviewed recipes [OFF press release, SUM] | None | Yazio: 2,900+ recipes, plans Pro; Lifesum: plans and grocery lists Premium; Lose It: meal planning Premium [OFF listings] |
| Grocery list | Premium+ list sorted by aisle, pantry exclusion, hand-off to Instacart (and other US retailers, sources disagree) [OFF release, VEND] | None seen | Yazio: grocery list and cooking mode [OFF listing] |
| Repeat on a schedule | Premium multi-day logging, up to 7 days | "Set Repeat Items" Gold | n/a |
| Complaints | A Premium subscriber failed 36 hours to save a recipe: "kept getting an error message" [RSS GB 1*, 2026-10-14]. "£16, then tried to do meal planning and I need to pay another £20/month" [RSS GB 1*, 2026-09-08] | "Designed for people who eat prepackaged foods not for people who ... make their own meals" [RSS US 2*, 2026-09-30]; six recipes "none of them are saved" [RSS US 1*, 2026-09-22] | |

Evidence and URLs
- MFP 2026 Winter Release (tiers, Meal Planner, Blue Check, Instacart offer, dated 24 Feb 2026): https://lite.aol.com/sports/other/story/0022/20260224/9659625.htm
- Cronometer importer behaviour, forum and support [SUM]: https://support.cronometer.com/hc/en-us/articles/4403966087828-Mobile-Recipe-Importer
- Suggests: home cooking is the gap in every app. Packaged food has a barcode; a stew does not. Nobody makes the recipe path as short as the barcode path.

---

## 5. The paid tier today (every item is a candidate to give away free)

| Tier | Price | What sits behind it |
|---|---|---|
| MFP Free | 0 | Manual food search, calorie and macro percentages, exercise log, ads [OFF page, VEND] |
| MFP Premium | $79.99 a year, $19.99 a month, 7-day trial (listing shows plans from $9.99 to $19.99 monthly, $49.99 to $79.99 yearly) | Barcode scan, Meal Scan, Voice Log, macro tracking with custom goals, ad-free logging, intermittent fasting, food insights and comparison, Net Carbs mode, multi-day logging, macro and calorie quick-add per meal, AI Coach (listing) [OFF page, OFF listing]. Data export is Premium per one source [VEND Nutrola] |
| MFP Premium+ | $99.99 a year, $24.99 a month | Meal Planner, grocery hand-off, 1,500+ recipes, Blue Check collection [OFF release, VEND] |
| Cronometer Basic | 0 | Logging of food, exercise, biometrics, notes; custom targets; barcode; custom foods, meals and recipes; 84 nutrients; diary groups; 7-day reports; ads [OFF] |
| Cronometer Gold | $10.99 a month, $59.99 a year | 95 nutrients; Photo Log; Voice Log; Recipe Importer; entry timestamps; Macro Scheduler; Fasting Timer; custom biometrics; Repeat Items; Nutrition Scores; custom charts; food suggestions; sharing custom foods; PDF reports; insights over any time frame; Crono Coach (AI); ad-free; unlimited history [OFF page] |
| MacroFactor | $11.99 a month, $47.99 half-year, $71.99 a year; 7-day trial; no free tier | Everything; no ads [OFF listing] |
| Lose It Premium | Many listed prices, $9.99 to $79.99, lifetime $49.99 or $59.99 | Photo and AI voice logging, barcode scanner, macros and micronutrients, fasting, meal plans, device sync [OFF listing]. UK reviewers describe a jump from about £10 to £75 [RSS GB 1*, 2026-07-04] |
| Yazio Pro | about $47.90 a year in the US listing | Recipes, fasting programmes, AI photo, meal plans, macros per one source, ad-free [OFF listing, VEND] |
| Lifesum Premium | $7.49 a month, $49.99 a year (listing) | Meal plans, diets, recipes, custom calorie goal, extra nutrients [OFF listing, RSS] |

Observed: the most-cited paywall grievance in both stores' 2026 written reviews of MFP is barcode scanning. A crude keyword count (scan or barcode together with pay, premium, subscription or a price) matches 18 of the 250 US reviews (22 Sep to 14 Oct) and 20 of the 250 UK reviews (16 Jun to 14 Oct); some of those are praise or pleas for it to be free. Quotes: "Can't even scan a barcode anymore to input food, pathetic. uninstalled" [OFF unstar.app collection]; "Should I be waiting until you put typing behind a pay wall too?" [RSS US 1*, 2026-10-13].
URLs: https://www.myfitnesspal.com/premium ; https://cronometer.com/gold/ ; https://apps.apple.com/us/app/-/id341232718 ; https://apps.apple.com/us/app/macrofactor-macro-tracker/id1553503471

---

## 6. What users praise and complain about

### 6.1 Sample (RSS, 250 most recent written reviews per store)

| App | US: window, mean, share 1-2 star | UK: window, mean, share 1-2 star |
|---|---|---|
| MFP | 22 Sep to 14 Oct 2026, 3.18, 41% | 16 Jun to 14 Oct 2026, 2.29, 61% |
| Cronometer | 4 Aug to 13 Oct 2026, 3.92, 20% | 2 Mar 2024 to 11 Oct 2026, 3.90, 23% |
| Lose It | 17 Aug to 13 Oct 2026, 3.65, 28% | 9 May 2024 to 12 Oct 2026, 3.01, 44% |
| MacroFactor | 8 Mar to 13 Oct 2026, 3.76, 28% | 167 reviews since Sep 2021, 3.84, 22% |
| Yazio | 14 Feb to 13 Oct 2026, 2.43, 57% | 2021 to 12 Oct 2026, 2.71, 48% |
| Lifesum | 25 Feb to 11 Oct 2026, 2.40, 59% | 10 Jan 2023 to 15 Sep 2026, 2.68, 50% |

The windows differ, so compare within a row, not across. The MFP US window is three weeks. Independent monthly figures from a competitor (MyNetDiary, US App Store, [VEND]): MFP 2.90 in March, 2.31 in April, 1.82 in May 2026; Cronometer 4.06 then 3.91; Lose It 3.46 then 3.43; MacroFactor 3.05 then 3.76 on 21 to 34 reviews. https://www.mynetdiary.com/diet-app-scorecard-may-2026.html

### 6.2 MyFitnessPal: top five complaints
1. The Today redesign. Diary buried, extra taps, no swipe between days, copy of items and days gone, totals hidden. "An extra 2-3 clicks compared to what we used to have to do takes up valuable time for each meal. Also, since the update the app now takes 20-30 seconds to open every single day. Moving over to macrofactor or nutracheck" [RSS GB 2*, 2026-09-11]. "I keep pressing 'plan' to go to my diary as that's where the button used to be. You can't swipe between days now" [RSS GB 2*, 2026-10-10]. "Why do foods not enter in the order entered ... Removed the edit button" [RSS GB 1*, 2026-09-13]. https://consumerrights.wiki/w/MyFitnessPal_regressive_upgrade
2. Barcode scanning moved behind Premium. "Used to be a really decent app until they decided to make you pay for the barcode scanner" [RSS GB 1*, 2026-10-07]. "$80 to get bar code scanning. Clearly you have realized no one uses any of the bloatware ... besides the scanner" [RSS US 1*, 2026-10-13].
3. Ads and nags. "It locks up all the time because of the ad on the bottom of the screen" [RSS US 1*, 2026-10-06]. "STOP asking if I'm sure I want to leave without trying the premium" [RSS GB 1*, 2026-09-25]. "Literally a million settings and no setting for this [marketing notifications]" [RSS GB 1*, 2026-09-24].
4. AI and gamification that cannot be turned off. "What apparently cannot be turned off is all the fireworks and high five celebrations every time you log an item ... feature that appears in the middle of a log of a meal suggesting something picked by Dietician Melissa" [RSS US 1*, 2026-10-13]. "This is an app. Not a coach, not a buddy" [RSS US 2*, 2026-10-11]. MyNetDiary says the AI Coach was "widely described as unwanted and intrusive" [VEND].
5. Reliability and trust in the diary. "Half the items you log don't appear in the diary" [RSS GB 1*, 2026-09-28]; "every time I am adding to my breakfast ... it removes the previous ones" [RSS GB 1*, 2026-09-18]; premium not recognised after sign-in [RSS GB 1*, 2026-09-24]. Plus unit confusion (section 1).
Praise (observed): "easy shortcuts to create own customized meals" [RSS US 5*, 2026-10-09]; "Please don't change the 'nutrition' page! That's super great for tracking calories, macro and micro" (an insulin-dependent diabetic) [RSS US 5*, 2026-10-10]; "I'm back logging after a relapse" [RSS GB 5*, 2026-10-06]. Longevity is the asset: "I feel trapped because I have so many recipes and data from years of use" [RSS US 1*, 2026-10-05].

### 6.3 Cronometer: top five complaints
1. Ads got worse in July to October 2026 (free tier). "Now they blockade the entire screen and make me watch a video every time I want to log food. If I log a meal with many components, I end up having to suffer through the ... ad five or six times" [RSS US 3*, 2026-09-26]. "Some ads don't even have a close button" [RSS US 3*, 2026-10-03]. "pop up and ad every 5 seconds, simply unusable" [RSS GB 2*, 2026-07-21].
2. Search got worse and, for some, data vanished (versions 4.57.3 to 4.59.5, Aug to Oct 2026). "If I type in 'egg' I get every possible egg recipe or egg dish as top search result before just a plain simple egg, it's like 50 results down the list" [RSS GB 2*, 2026-08-04]. "'apple' ... will start with fried apple" [RSS US 2*, 2026-10-01]. "All of my favorites and custom recipes and meals were all lost" [RSS US 1*, 2026-09-22]. I counted 12 US and 4 UK low-star reviews since July that name search. I found no Cronometer statement; the vendor's notes for 4.59.5 say only "bug fixes and polish".
3. Heavy for ordinary eating. "way too complicated ... for something that should be simple: log your food and track your calories" [RSS US 1*, 2026-09-25]. "It's ugly and scientific looking ... No pictures of foods" [RSS GB 3*, 2026-07-20]. Home cooking is slow (section 4).
4. No offline. "If there's no signal it logs you out" [RSS US 3*, 2026-10-08]; "'500 server error' ... unacceptable for an app that should function fine without internet" [RSS GB 1*, 2026-08-18]. Cronometer's own forum has asked for offline login since 2021.
5. Support and goals. "I wrote on September 10th and got a reply on September 26th" [RSS US 3*, 2026-09-28]. A goal of 554 kcal a day was accepted (section 8).
Praise (observed): "without paying you have so many features accessible" [RSS GB 5*, 2026-10-10]; "Efficient, simple to use, free" [RSS US 5*, 2026-10-10]; "Nutritionist approved ... most user-friendly" [RSS US 5*, 2026-10-09]. MyNetDiary: reviewers praise "depth of nutrient tracking ... and a generous free tier" [VEND].

### 6.4 The other four (top themes, 2026 reviews)
- Lose It: paywalled features and price jumps; a long onboarding questionnaire before any value ("The amount of useless questions it asks directly after downloading is a complete waste of time" [RSS US 1*, 2026-10-12]); cancellation hard; ads; exercise credit wrong.
- MacroFactor: no free tier and charged without clear notice; accuracy of labels and poor UK recognition; UI churn ("Stop changing the design" [RSS US 2*, 2026-09-10]; "so much harder to flip through different days" [RSS US 1*, 2026-09-04]); too many feedback prompts. Praise is the strongest of the six: "MacroFactor is the only one I've found that feels really well-designed, it's a pleasure to use" [RSS GB 5*, 2026-09-29]; "I'm here because my fitness pal fell apart sadly. I'm looking to replicate the old my fitness pal experience" [RSS US 5*, 2026-09-26].
- Yazio: full-screen subscription promotion after meal entries, a "wheel of fortune" discount, fasting buried after a release, motivators that cannot be switched off.
- Lifesum: "AI slop ruined a good thing" [RSS US 1*, 2026-09-24], entries that disappear, burned calories doubling from Apple Health, fasting timer removed, custom calorie goal now paid.

---

## 7. Design: what reads modern and what reads dated

I could not open live apps. This section rests on store screenshots [IMG], vendor text and users' words. Check on a device before copying anything.

| App | Observed layout | Reads as |
|---|---|---|
| MFP Today | Light blue-grey ground, white rounded cards, one blue accent. Top: "Today" with a week strip of ticks and a lightning count; a calories card with a thin blue bar and "left" figure; three macro mini bars in teal, purple, amber; a "Diary" list of meal cards each with "..." and a pale "Log" button; floating blue "+" over a four-tab bar [IMG] | Modern but card-heavy. Users call it "gigantic, space-consuming cards" and "a busier home screen ... rebuilt around cards, recommendations, and Premium prompts" [VEND Bento Bunny] |
| Cronometer | Dark or light, dense lists; colour-coded bars (orange energy, green protein, cyan net carbs, purple fat) with numbers and percentages; small clock icons for timestamps; clinical typography [IMG] | Functional and trustworthy, dated to some: "Interface is dense and can feel clinical or overwhelming" [VEND calorie-trackers.com]; "ugly and scientific looking" [RSS GB 3*, 2026-07-20] |
| MacroFactor | Near-black ground, white text, one warm accent, rounded sheets; recents as small icon chips; food icons per entry; charts with a shaded "flux range" band [IMG] | Most modern of the six. "Modern, beautiful, and comfortable ... colorful yet adherence-neutral" [OFF dashboard post]. Complaint: "food icons themselves are way too big" on small phones [RSS US 2*, 2026-08-26] |
| Lose It | Single dial of remaining budget [VEND] | A July 2026 update hid the calorie bar until you scroll [RSS GB 1*, 2026-07-31] |
| Yazio | Dark ground, teal ring, gems, flame, mascot [IMG]; adopted Apple's "Liquid Glass" in v26.33.1 | Playful, game-like |
| Lifesum | Lime-to-cream gradient, large arc, food photos on tracked items, a chat-style add screen [IMG] | The prettiest, but "design advantage has narrowed" [VEND Nutrola] and AI backlash |

Suggests: the ground to take is MacroFactor's calm density with Cronometer's honesty about nutrients, minus both apps' weak points (no meal groups, no free tier; dense and clinical).
URLs: https://macrofactor.com/dashboard-revamp/ ; https://piunikaweb.com/2026/04/24/myfitnesspal-new-update-complaints/ ; https://www.bentobunny.app/guides/myfitnesspal-new-ui-update ; https://calorie-trackers.com/reviews/cronometer/ ; Cronometer's 2020 redesign thread ("not a circus", "way too much wasted space"): https://forums.cronometer.com/discussion/comment/7201

---

## 8. Safety and tone

### 8.1 Comparison

| Topic | MFP | Cronometer | Others |
|---|---|---|---|
| Calorie floor | A 2026 review implies a 1,200 kcal minimum in goal setting ("arbitrary minimum 1,200 calorie requirement", US 2*, 2026-10-12); I did not read the enforcement rules. A 2021 article claims goals as low as 500 were possible [VEND, dated, unverified]: https://www.theswaddle.com/health-tracking-apps-provide-a-worrying-pipeline-to-eating-disorders-better-tech-design-can-fix-that | A UK reviewer: a plan produced 554 kcal a day and "the safeguards and warnings around this are not sufficient" [RSS GB 1*, 2026-09-30]. A v4.53.1 note claims body-aware guardrails [SUM] | Lifesum: lower limit by BMR and "goal weight too low" message [OFF help]. Others: nothing found |
| ED signals | Research shows harm and evasion (below). No current policy page read | Forum staff reply (2020): switch off the calories summary; some of those settings are Gold; calories still show when you add a food [OFF forum]: https://forums.cronometer.com/discussion/comment/11651 | Public Health England removed low-BMI access to the NHS Better Health weight-loss app after Beat UK pressure [SUM Beat] |
| Language | "Remaining calories" and net as "a daily budget" [VEND griproom]; cheerful: fireworks per item; coach tips | Neutral on the whole, but a thread reports a purple deficit and surplus scale with a red warning when intake runs high that a recovering user could not turn off [SUM forum]: https://forums.cronometer.com/discussion/1350/new-cronometer-update-isnt-great-if-youre-recovering-from-an-eating-disorder | Lifesum card: "you ran a bit low on protein yesterday" [IMG]. Reminders "felt like it was scolding me" (AP, 1 Jul 2026) |
| Gamification | Streak, fireworks, confetti | Complete-day tick only | Yazio gems, flame, mascot |

Observed self-reports (single, uncorroborated, not for causal claims): "Developed anorexia :(" [RSS GB Lose It 1*, 2026-09-30]; "This gave me and ED" [RSS GB Cronometer 3*, 2026-07-11].

### 8.2 Research on file
- McCaig et al. 2019 (Reddit ED forums, 1,695 comments): users "evaded restrictions such as account suspension or deletion by changing their listed characteristics", some said the app "prevented bingeing or purging", others that it "facilitated a relapse". https://www.nationalelfservice.net/mental-health/eating-disorders/myfitnesspal-eating-disorders/
- Calorie-tracker users who track for weight or shape reasons report more ED symptoms than health-motivated users (Eating Behaviors, 2021, as summarised by several secondary sources). Survey figures for MFP in the Levinson 2017 study differ between secondary sources (about 75% used it and 73% of those felt it contributed, versus "30% of 105"); I could not read the original, so do not quote either.
- AP, 1 Jul 2026: gamified features "may do more harm than good for certain users"; Courtney Simpson: "The issue is not gamification itself". https://unb.com.bd/category/Lifestyle/nutrition-apps-may-help-healthy-habits-but-experts-warn-gaming-features-can-have-downsides/189586
- 2024 J Eating Disorders longitudinal study of 138 emerging adults: weight-related self-monitoring apps linked to more disordered weight control behaviours, authors call for screening and monitoring. https://jeatdisord.biomedcentral.com/counter/pdf/10.1186/s40337-024-01069-x.pdf

### 8.3 Do NOT copy (Volyume's ED system is locked; these would cut across it)
1. Red or "over" colouring and any deficit or surplus scale with a warning colour.
2. The "if every day were like today you'd weigh X in 5 weeks" projection.
3. Exercise calories added back to the food allowance by default, and "net calories as a budget" wording.
4. Streak counters, loss of a streak on reinstall, fireworks or confetti per logged item, guilt reminders, unswitchable marketing pushes.
5. A coach or AI remark on how much or how little you ate.
6. Any goal setter that accepts an intake below the locked floors (1,200 kcal women, 1,500 kcal men), or one the user can reach by editing profile stats (McCaig: users change stats to evade limits).
7. Hiding calories behind a paid tier. Cronometer's staff reply says some hiding settings are Gold. Volyume's calm mode must stay free.
8. Upsell copy inside the diary ("Are you sure you want to leave?").
Suggests: a calm default ("remaining" and "consumed" as neutral numbers, no colour judgement, no daily "over") is both what MacroFactor markets as "adherence-neutral" and what the safety research asks for. It beats the incumbents without touching the floors.

---

## 9. What beats them

Fifteen things a free app could do better than both, in order of likely impact on daily use. "Lock" notes say where a locked rule in CLAUDE.md Section 2 applies and the lead must decide.

1. **One-screen diary that is the home screen.** Calories remaining, every meal with its own total and its items, swipe between days, nothing behind "View all"; compact rows and large-text support. Rests on: MFP's six months of reviews ("mistracked on about 50% of days", no swipe between days, per-meal totals hidden); Cronometer's density complaints; Cronometer's text scaling only arrived in Aug 2025 (0.75x to 1.5x).
2. **Repeat and copy that keeps meal times.** Copy item, meal or whole day from any date to any date or meal; multi-select to copy, move, delete or set time; "same as yesterday" keeps each item's original time. Rests on: MFP removed item and day copy, and swipe-copy stamps the swipe time; no multi-select delete; Cronometer's group copy is Gold; MacroFactor users praise "copy meals over".
3. **An add screen that knows this hour.** Open on recents and "what you usually have at this time", last-used serving pre-selected, "+" on the row, a basket for several items; your own foods always outrank the rest and whole foods outrank dishes. Rests on: MacroFactor's "3 PM Picks" and chip strip [IMG]; Cronometer's September 2026 ranking regression ("egg" 50 results down); MFP search that only covers logged foods until you tap again.
4. **Barcode scan and label-photo to custom food, free, and fast to correct.** Rests on: barcode paywall is the most-cited MFP grievance in both stores; Cronometer's free scan plus label autofill is praised; Lose It's scan limit.
5. **"Say what you ate" entry.** Typed or spoken "two eggs, toast and a tea" matched to your own foods, always shown as an editable list before it logs, never a silent guess. Lock: CLAUDE.md bars AI in the coaching engine and says to stop and ask if a feature seems to need it. A deterministic parser over local foods avoids that; photo recognition would need a founder ruling. Rests on: voice and photo are Premium at MFP and Gold at Cronometer; the NIH 2026 study found photo estimates under-report by 250 to 345 kcal, so an editable list matters more than the camera.
6. **Calm, neutral numbers with the user's choice of view.** One tap between "consumed" and "remaining", remembered; no red; exercise not added back to the allowance by default. Lock: ED-safety and exercise handling sit inside the locked files; check before building. Rests on: MacroFactor's swap; confusion over net calories at MFP, Yazio, Lose It; the "negative calorie adjustment" toggle MFP moved to the web; section 8.
7. **No ads, no upsell, no nags, and every message switchable.** Celebrations, tips, push categories and coach copy each have an off switch in settings. Rests on: MFP ad freezes and unswitchable confetti and marketing pushes; Cronometer video ads mid-log from July 2026; Yazio's full-screen promotion after each entry. This is structural for a fully free app (D137).
8. **Offline and instant, entries never lost.** Log in a lift or on a hill, open fast, no sign-out, no server error. Rests on: Cronometer "logs you out" without signal and "500 server error"; MFP "takes 20-30 seconds to open", entries overwritten or missing; Lifesum entries disappearing. Volyume's encrypted local SQLite is already the right base.
9. **UK-native units and labels.** Grams and millilitres first, "per 100 g", salt in grams, kJ with kcal, British portion words (slice, tbsp, mug, pint), Monday week start, no cup-versus-ounce ambiguity. This is interface, not data source. Rests on: MFP UK reviewer on cups and oz; Cronometer "Foods are too American" and "not for UK users"; Lose It UK "salt content rather than sodium"; MacroFactor UK "wont recognise a UK label".
10. **A free full day report that is honest about gaps.** Macros, fibre, sugar, salt and the micronutrients the entries actually carry, as bars; say "no data" instead of showing 0%; no Gold-style 7-day cap. Rests on: Cronometer limits free reports to 7 days and gates Nutrition Scores, insights and custom charts; MFP's free macro card shows percentages only and its nutrient dashboard went away; MFP and Lifesum users complain when nutrient views are cut (a diabetic MFP user: "Please don't change the 'nutrition' page").
11. **Recipes as fast as a barcode.** Paste a link or a list, ingredients matched to your foods with unmatched ones flagged, live per-serving maths, scale by servings or by cooked weight, edit after logging; free. Rests on: Cronometer's importer is Gold and its users say it suits packaged food; MFP recipe save failures; Lose It import "unknown error"; MFP user asks for half portions and per-person breakdowns.
12. **Meals, planning ahead and repeats, free.** Save a meal, edit before logging, split into items; log tomorrow's food today; schedule a repeat. Rests on: Cronometer's Repeat Items and group copy are Gold; Yazio paywalled adding foods in advance; MFP's planner and grocery list sit in a $99.99 tier.
13. **A weekly view and a weekly budget.** Seven-day average against target, days logged shown as a calendar of ticks rather than a streak, and the week summary one tap from the diary. Lock: any weekly flexibility must not let a day fall under the locked floors. Rests on: MacroFactor's tap-to-week design; MyNetDiary's note that weekly calorie summaries are missing; the AP coverage on streak pressure.
14. **Say why a number changed.** When a target moves, one plain sentence with the arithmetic from the deterministic engine. Rests on: MacroFactor user "I wish it would give you a reasoning"; "no user facing explanation" of a coach that diverged; MFP goals reverting to defaults and 1,500 shown as 1,200.
15. **Free import and export, so leaving costs nothing.** Import MFP and Cronometer exports; export everything as CSV at any time; never hold history to ransom. Rests on: "I feel trapped because I have so many recipes and data from years of use" [RSS US 1*, 2026-10-05]; PiunikaWeb's longtime users weighing a switch to Cronometer; CSV export is Premium at MFP per one source. The founder still uses MFP, so this is also his own exit.

### Caveats on this list
- Many figures come from competitors (MacroFactor, MyNetDiary, Nutrola, Fitia, Bento Bunny, Amy Food Journal, calorie-trackers.com). I used them for method or direction and marked them [VEND].
- Written reviews skew negative and the MFP US window is three weeks. They show what bothers people; they do not give a share of all users.
- Not examined: Android reviews (Google Play pages were unreadable), real session timings, MFP's current food-detail screen, and anything behind a login.
- Gaps worth a follow-up lane: a hands-on timed test of MFP and Cronometer on a phone; Google Play reviews; MFP export format for item 15.
