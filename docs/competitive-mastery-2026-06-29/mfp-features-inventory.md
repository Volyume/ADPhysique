# MyFitnessPal — Complete Feature Inventory & VOLYUME Gap Map

**Date:** 2026-06-29
**Author area:** Full MFP feature surface (NOT food-narrow — this dive covers community, dashboard, goals, plans, exercise/cardio, steps, water, recipes, meals, barcode, insights, challenges, blog, friends, reminders, fasting, medication/GLP-1, sleep, glucose, restaurant, voice, and more).

## Method & sources (honest-source rule)

- **Backbone:** `…/scratchpad/mfp/corpus/screens_components.txt` (1303 lines), read in full. Every line is a fully-qualified MFP class/package. Feature areas below are grouped from the `com/myfitnesspal/feature/*`, `com/myfitnesspal/dashboard/*`, and other top-level packages. This is the strongest signal: a package existing means the feature ships in the decompiled APK.
- **Confirmation:** string literals grepped from `dex_strings_raw.txt` (39M) and `food_ui_copy.txt` (1.6M). Quoted inline where load-bearing.
- **GraphQL surface:** `com/myfitnesspal/queryenvoy/*` (lines 1034–1188) — the network query/mutation contract — corroborates which entities MFP syncs (exercise, habits, medication, side-effects, weekly habits, recipe bookmarks, user tags, subscriptions, goals).
- **Limitation (stated honestly):** `mfp_decoded/` contains only `classes*.dex` + `res/` — **apktool did NOT emit `AndroidManifest.xml`**, so I cannot list declared launchable activities/services/intent-filters or exported components. Everything below is from class packages + string literals, not the manifest. Confidence is marked CONFIRMED (package + corroborating strings) or INFERRED (package only, or string-only).
- **VOLYUME side:** read the real source — `App.js`, `src/navigation/RootNavigator.js` (full screen registry + tab tree + Pro gates), `Glob` of `src/screens` (84 screens) and `src/lib` (~120 modules).

---

## (1) Complete MFP feature inventory, grouped by area

Confidence key: **CONFIRMED** = package present AND string/GraphQL corroboration; **INFERRED** = package present, limited corroboration.

### A. Shell / navigation / dashboard
- **Bottom navigation** — `feature/bottomnavigation/*` (BottomNavigationViewModel, BottomNavigationBottomSheetDialogFragment). CONFIRMED.
- **Main host** — `feature/main/ui/MainActivity`, `RouteToMainActivity`, `ShortcutProxyActivity` (app-shortcut launch). CONFIRMED.
- **Dashboard** — `dashboard/ui/DashboardFragment` + a rich set of card ViewModels: `CaloriesViewModel`, `MacrosViewModel`, `ExerciseViewModel`, `StepsViewModel`/`StepsPerDayViewModel`, `HeartHealthViewModel`, `LowCarbsViewModel`, `WeightGraphViewModel`, `WeeklyHabitsCardViewModel`, `LoggingProgressCardViewModel`, `HeaderViewModel`, `GoalCardBaseViewModel`, `AdjustCalorieGoalDialog`. CONFIRMED — a configurable card dashboard (calories, macros, exercise, steps, heart health, low-carb, weight, weekly habits, logging progress).
- **More menu** — `feature/moreMenu/*` (MoreMenuFragment/ViewModel/Adapter). CONFIRMED.
- **Up-next card** — `domain/upnext/ui/UpNextCardViewModel`. INFERRED (next-action nudge).
- **Landing / splash** — `feature/landing/*`, `android/splash/SplashActivity`. CONFIRMED.

### B. Diary (the central log)
- `feature/diary/*` — DiaryFragment, DiaryViewModel, `FriendDiaryViewModel`/`FriendDiaryActivity` (view a friend's diary), `CompleteDiaryActivity` ("complete this entry" / close-day), `DiarySettingsActivity`, quick-tools/long-press/more-actions dialogs, `ConfirmFastDurationActivity` (fasting tie-in), note-type & timestamp dialogs, copy-to-meal dialogs. CONFIRMED.
- **Multi-day log** — `domain/multidaylog/MultiDayLogViewModel`. CONFIRMED.
- **Quick add** — `feature/addentry/ui/activity/QuickAddActivity` (quick-add calories/macros without a food). CONFIRMED.
- **Diary notes** — `shared/db/adapter/DiaryNoteDbAdapter`, `FoodNotesActivity`. CONFIRMED.

### C. Food search / logging / barcode
- **Search** — `feature/search/*` — local + online food search (`LocalFoodSearchFragment`, `OnlineFoodSearchFragment`), sort/filter dialogs, `SearchResultsScreen`, `NoResultsFoundScreen`, fast-actions, multi-select. CONFIRMED.
- **Food details / add entry** — `feature/addentry/ui/activity/FoodDetailsActivity`, edit-servings dialogs, unit dialog. CONFIRMED.
- **Barcode** — `feature/barcode/*` — `BarcodeScanningActivity`, `BarcodeMatchActivity`, `BarcodeResultFragment`, `SharedBarcodeViewModel`. CONFIRMED.
- **Meal Scan (photo→food, AI)** — `feature/mealscan/walkthrough/*` — MealScanActivity, results-flow, cart, walkthrough, camera-permission screens, experiment variants. CONFIRMED. (AI photo logging.)
- **Voice logging** — `feature/voicelogging/*` — full flow (input, results, error, tip, permissions). CONFIRMED. (Natural-language/voice food entry.)
- **Create / custom food** — `feature/createfood/*`, `feature/editcustomfood/*`, `feature/canonicalfoods/*` (canonical food selection/success — MFP's verified-food dedupe). CONFIRMED.
- **Food editor / food groups** — `feature/foodeditor/*`. CONFIRMED.
- **Food feedback** — `feature/foodfeedback/*` (report-a-food-entry quality). CONFIRMED.
- **Restaurant logging** — `feature/restaurantlogging/*` — MenusActivity, VenueService, MenuService, SearchMatch, "Notify/Request menu". CONFIRMED (restaurant/venue menus with nutrition).
- **Net carbs** — `feature/netcarbs/*` (promo dialog → net-carbs mode). CONFIRMED.

### D. Recipes & meals
- **Recipes** — `feature/recipes/*` — create manually, **import from web URL** (`RecipeImportBrowserActivity`, `RecipeImportReviewActivity`), ingredient matching, My Recipes/Meals/Foods tabs, recipe details. CONFIRMED.
- **Recipe collection (managed/curated)** — `android/recipe_collection/*` — ManagedRecipes grid/carousel/details, directions, ingredients, tags, swap-recipe, select meal date/type. CONFIRMED (curated recipe browse + log).
- **Meals** — `feature/meals/*` (edit meal name, delete, permissions), `feature/mealpage/*` (MealPageActivity — a meal's own page incl. water empty-state). CONFIRMED.
- **Duplicate meal** — `domain/duplicatemeal/*`. CONFIRMED.

### E. Meal Planning (large, premium)
- `feature/mealplanning/*` — by far the largest single area (~lines 392–584). Full meal-plan product: onboarding (biometrics, diet approach, taste like/dislike, format: cuisines, allergies, cooking level, prep time, grocery method/frequency/stores, leftovers, pantry, budget), household members & portions, plan creation + review recipes + pairings, your-plan, past plans + repeat, groceries + grocery details + grocery item edit, **shop integration: Instacart / Walmart / Shop ingredients/list/options**, reminders (grocery + next-plan), recipe import (auto from link, manual, library), settings (diet, macros, units, household), primer/upsell flows. CONFIRMED. This is a paid AI meal-planning + grocery-commerce engine.

### F. Goals & nutrition targets
- `feature/goals/*` — GoalsActivity, daily goals, **custom goals by day of week** (`CustomGoalByDayActivity`), macro editor by grams / by percent, additional nutrient goals, exercise-calorie settings (`CustomExerciseCaloriesActivity`, `ExerciseCaloriesActivity`), activity-level dialog, weight-goal dialog, meal goals (per-meal calorie/macro split), net-energy goal, calorie-adjustment intro. CONFIRMED.
- **Eating-disorder goal guard** — `feature/goals/ui/fragment/EatingDisorderUpdateGoalCompleteFragment` + registration `step/.../glp1/Glp1MedicationUsageViewModel`. CONFIRMED MFP has an ED-aware goal path and floors (note: MFP still ships streaks; see §3).
- **Unified goals** — debug `UnifiedGoalsDebugActivity`; GraphQL `GetUserGoalsQuery`, `SetUserGoalSelectionsMutation`. CONFIRMED.

### G. Nutrition reporting / insights
- `feature/nutrition/*` + `nutrition/ui/*` — Calories / Macros / Nutrients / Single-nutrient fragments + ViewModels, `NutrientGraphActivity`, `FoodListsActivity` (which foods contributed a nutrient), `FoodListSingleNutrientActivity`, `NutritionPremiumActivity`. CONFIRMED.
- **Nutrient dashboard customisation** — `feature/dashboard/ui/.../CustomNutrientDashboardSelectionFragment`, `NutrientDashboardPresetSelectionFragment`, `NutrientDashboardSettingsActivity`. CONFIRMED (choose which nutrients show).
- **Progress hub reports** — string `feature.progress.ui.overview.ReportsSection (ProgressHubOverviewTabContent.kt)`. CONFIRMED (a Reports section exists).
- **File export** — `feature/fileexport/*` (CSV/printable export with reporting-period selection). CONFIRMED.

### H. Exercise & cardio
- **Exercise search & log** — `feature/exercise/*` — ExerciseSearchActivity, MyExercisesFragment, sort-order, `StrengthCalorieAlertFragment`. CONFIRMED.
- **Workout routines** — `feature/workoutroutines/ui/activity/LogWorkoutRoutineActivity` + LogWorkoutRoutineViewModel. CONFIRMED (log a saved routine). NOTE: this is *log a routine*, not a hypertrophy training-builder with set/rep/RIR programming.
- **GraphQL exercise sync** — `UpsertExercise`, `UpsertExerciseDiaryEntry`, `SearchExercises`, `ListExercises`, `ExerciseType` (cardio/strength). CONFIRMED MFP syncs exercise as diary entries.
- **Strength calorie alert** — warns strength training burns few calories. CONFIRMED.

### I. Steps, water, sleep, glucose, heart
- **Steps** — `feature/stepsettings/*`, `dashboard StepsViewModel`, `progress…/steps/StepsInsightViewModel`, settings `StepsSettingsListFragment`; debug StepsDebug. CONFIRMED.
- **Water** — `waterlogging/ui/WaterLoggingActivity` + `WaterLoggingViewModel`, `shared/db/adapter/WaterEntriesDBAdapter`; strings `waterCups/waterGoal/waterUnit`, `/diary/add/water/`, `water_entries.cups`. CONFIRMED.
- **Sleep** — `sleep/feature/ui/SleepActivity`, `SleepFactorsDetailActivity`, SleepViewModel; `ic_sleep`. CONFIRMED.
- **Glucose (blood glucose)** — `glucose/ui/BloodGlucoseActivity`, GlucoseScreen, pager. CONFIRMED.
- **Heart health** — `dashboard/viewmodel/HeartHealthViewModel`. INFERRED (dashboard card).

### J. Progress, weight, body measurements, photos
- `feature/progress/*` — ProgressHub, `AddWeightActivity` (+ image import), **progress photos** (gallery, import, horizontal gallery), **measurements** (MeasurementType/Value dialogs — custom body measurements), share-progress, status-update, recommend-goal, congrats, graph-period. CONFIRMED.
- **Weight logging** — `feature/weightlogging/*` (WeightLoggingActivity, validation dialog, photo options). CONFIRMED.
- **Progress celebrations** — `goals/ui/ProgressCelebrationRedesignActivity`, `ProgressCongratsScreen`. CONFIRMED.

### K. Social / community
- **Friends** — `feature/friends/*` — FriendsActivity, friends list, **friend requests**, **invite friend**, **messages** (compose, detailed, inbox — a DM system). CONFIRMED.
- **Add friends** — `feature/addfriends/*` (splash + parent). CONFIRMED.
- **Community** — `feature/community/*` — CommunityActivity/Fragment + `community/service/CommunityService`. CONFIRMED.
- **Forum** — `databinding/ForumActivity` + `community` service. CONFIRMED (forums/message boards).
- **Newsfeed / status updates** — `feature/progress/.../StatusUpdateActivity`, `ProgressStatusUpdateActivity`; strings `ic_newsfeed`, `ic_newsfeed_new`. CONFIRMED (a status/newsfeed surface).
- **Friend diary** — view friends' diaries (§B). CONFIRMED.
- **Blog** — `feature/blog/*` (BlogActivity/Fragment, `MfpBlogWebView`). CONFIRMED (in-app blog/articles, web-backed).
- **Challenges** — strings `ic_challenges`, `7_challenge`, `UserChallengeRequestCreator`, `showUserChallenge`, `isChallengeAllowed`. INFERRED-leaning-CONFIRMED: challenge **assets + request plumbing** exist but I found no dedicated `feature/challenges/*` UI package in screens_components.txt — likely server-driven/web or a smaller surface than friends/community.

### L. Habits & streaks (engagement)
- **Weekly habits** — `feature/weeklyhabits/*` — habit assessment, enrollment, selection, manage-habit, notification-creation, congratulations; GraphQL `ListWeeklyHabits`, `UpsertWeeklyHabit`, `UpsertHabitEntry`, `ListHabitEntries`. CONFIRMED (a structured habit-coaching system).
- **Streaks** — `feature/streaks/ui/StreakCelebrationActivity`/Screen/ViewModel; food-copy `food_logging_streak_*` (milestone hit, celebration animation `food_log_streak_celebration.json`, buttons for 3/4/5/7/10-day, "streak is active", transparent-bolt SVG). CONFIRMED — **daily food-logging streak with celebration animations + milestone gamification**. (GATED for us — see §3.)

### M. Intermittent fasting
- `intermittentfasting/*` + `feature/intermittentfasting/*` — IntermittentFastingActivity, **fasting timer**, setup, settings, history, pattern select (e.g. 16:8), education carousel, fast-complete dialog, `ConfirmFastDurationActivity`; `managemyday/fasting/*` (start-time/discard dialogs). CONFIRMED. (Fasting timer is GATED for us — §3.)

### N. Medication / GLP-1 (newest pillar)
- `feature/medication/logging/*` — full medication logging (dose, datetime, location, selection, reminder, overview, edit, welcome, weekly-dose reminder), **side-effects logging** (selection, intensities), `glp1_settings/*` (GLP1SettingsActivity). `managemyday` "Manage My Day" (MMD) ties medication, fasting, healthy-habits, meal-tiles, week-progress into one screen. GraphQL: medication & side-effect sync. CONFIRMED. (MFP's GLP-1 weight-loss-drug companion — a 2024/25 strategic pillar.)

### O. Onboarding / registration / goals affirmations
- `feature/registration/*` — multi-step sign-up (name, sex/age/geo, height/weight, activity level, weekly goal), **primary-goal affirmations** (lose/maintain/gain weight, gain muscle, manage stress, modify diet, plan meals, stay active), behaviour goals, meal-plan interest, GLP-1 usage, SSO/OAuth/Facebook, congrats/post-signup. CONFIRMED (heavily personalised, affirmation-driven onboarding).

### P. Monetisation / premium
- `feature/upsell/*` — Premium hub, primer, spoke, promo (long/short), nudge, manage-subscription (downgrade confirm), purchase success, upsell dialogs. `feature/mealplanning/ui/upsell/*` (separate meal-planner upsell). GraphQL `GetSubscriptionSummary`, `UpsellSubscriptions`, `SubscriptionTier/Entitlement`. CONFIRMED. Plus ads: `domain/ads/ui/*`, `add_water_entry_top_*_ad_unit` (ad-supported free tier).

### Q. Settings / account / privacy / help
- `feature/settings/*` — appearance, change password, **custom meal names**, Do-Not-Sell (CCPA), **privacy center**, **reminders** (add/edit/select-type, frequency, day-of-week), diary settings, troubleshooting, steps settings, weekly-nutrition settings, units/height/timezone/country dialogs, **PIN-code diary lock** (`DiaryPasswordDialog`, `PinCodeDialogFragment`). CONFIRMED.
- **Reminders** — `feature/settings/reminder/AddEditReminderActivity` + RemindersActivity. CONFIRMED (custom local reminders for logging meals/weigh-ins).
- **Account** — delete account (+ premium variant), GDPR help, consents (Sourcepoint CMP), updated-terms. CONFIRMED.
- **Help / support** — FAQ, contact support, Zendesk help center, Solvvy. CONFIRMED.
- **App gallery / partner apps** — `feature/appgallery/*` (Google Fit permissions, app integrations directory). CONFIRMED.
- **External sync** — Google Fit (`externalsync/impl/googlefit/*`), Health Connect (`healthconnect/*`), Google Health (`feature/googlehealth/*`). CONFIRMED.
- **Notifications inbox** — `feature/notificationinbox/*` (in-app message inbox). CONFIRMED.
- **Profile / Me** — `feature/profile/ui/me/*`, MyInfo, MyItems, ProfileFragment. CONFIRMED.
- **Welcome-back** — `feature/welcomeback/*` (re-engagement for returning lapsed users). CONFIRMED.
- **In-app review** — `feature/review/*`. CONFIRMED.

### R. Debug-only (mark debug)
- `feature/debug/*` (~lines 179–236): ads, analytics events, feature-flags/rollout, premium/entitlements/nudges, steps, weekly-habits, welcome-back, medication, locale override, env config, deep-link testing, style/compose catalogs. **DEBUG-ONLY — not user-shipped.** Also `uicommon/compose/debug/*` catalog screens.

---

## (2) VOLYUME equivalent today (file refs)

Tab tree (`src/navigation/RootNavigator.js`): **Train (HomeTab) · Plans · Diary · Progress · You (ProfileTab)**. 84 screens in `src/screens`.

| MFP area | VOLYUME today | Files |
|---|---|---|
| Dashboard/home | Train home with next-session hero, cards | `src/screens/HomeScreen.js` |
| Diary (food log) | Food diary (Pro) | `src/screens/DiaryScreen.js` (`GatedDiary`) |
| Food search | Local+live (OpenFoodFacts UK, USDA, CoFID) search | `src/screens/FoodSearchScreen.js`, `src/lib/food/*` |
| Barcode | Barcode scan (Pro) | `src/screens/ScanBarcodeScreen.js` |
| Label scan (OCR) | Nutrition-label OCR scan (Pro) | `src/screens/ScanLabelScreen.js`, `src/lib/food.ocrParser` |
| Create custom food | Yes | `src/screens/AddCustomFoodScreen.js` |
| Recipes | My recipes + builder (Pro) | `src/screens/MyRecipesScreen.js`, `RecipeBuilderScreen.js` |
| Meals (saved) | Saved meals (Pro) | `src/screens/MyMealsScreen.js` |
| Meal planning | Lightweight meal plan (Pro) | `src/screens/MealPlanScreen.js` |
| Goals / nutrition targets | Nutrition targets + macros (Pro) | `src/screens/NutritionTargetsScreen.js`, `src/lib/nutritionEngine.js` |
| Nutrition insights/reports | Food insights (Pro) | `src/screens/FoodInsightsScreen.js`, `src/lib/insightsEngine.js` |
| Exercise — strength | **Stronger than MFP**: full training builder, active workout, set/rep/RIR, rest timer, mesocycles | `BuildWorkoutScreen.js`, `ActiveWorkoutScreen.js`, `MesocycleBuilderScreen.js`, `src/lib/planEngine.js`, `mesocycle.js` |
| Cardio | Log cardio + history (Pro) | `LogCardioScreen.js`, `CardioHistoryScreen.js` |
| Steps | Silent steps via Apple Health/Health Connect (no card) | `src/lib/activitySteps.js`, `health.js` |
| Weight / body metrics | Body metrics + trend (Pro) | `BodyMetricsScreen.js`, `src/lib/weightTrend.js`, `robustTrend.js` |
| Progress / analytics | Analytics, volume heatmap, lift progress, consistency | `AnalyticsScreen.js`, `VolumeHeatmapScreen.js`, `LiftProgressScreen.js`, `ConsistencyScreen.js` |
| Reports / export | CSV export | `src/lib/csvExport.js`, `SettingsDataScreen.js` |
| Weekly habits/coaching | Precision Coaching (deterministic) + weekly check-in | `CoachOutputScreen.js`, `WeeklyCheckInScreen.js`, `src/lib/weeklyCoach.js`, `coachApply.js` |
| Streaks | **Weekly consistency** (ED-safe, no daily counter, freezes under ED flag) | `src/lib/streak.js`, `streakState.js` |
| Social | Privacy-first **training partner** (derived signals, 1 free / 3 Pro) | `PartnerScreen.js`, `src/lib/partners/*` |
| Reminders | Coaching + training reminders, quiet hours | `CoachingRemindersScreen.js`, `NotificationSettingsScreen.js`, `src/lib/notifications/*` |
| Onboarding | Quiz-first, plan preview, Pro onboarding | `QuizScreen.js`, `PlanPreviewScreen.js`, `ProOnboardingScreen.js`, `FreeStarterScreen.js` |
| Health integrations | Apple Health / Health Connect (weight, steps) | `SettingsHealthScreen.js`, `src/lib/health.js` |
| Monetisation | 2-tier (free/Pro), Play Billing, paywall/cascade | `PaywallScreen.js`, `SubscriptionScreen.js`, `src/lib/payments/*` |
| Import | Import external history (Strong/Hevy/MFP CSV) | `ImportScreen.js`, `src/lib/importExternal.js` |
| Year-in-review | Year of Lifts wrap | `YearOfLiftsScreen.js` |
| Settings/account/privacy | Full settings tree, EU/no-PII, snapshots | `Settings*Screen.js`, `SnapshotsScreen.js` |

**VOLYUME does NOT have** (no package/screen/lib found): friends/DM/community/forum, newsfeed/status, in-app blog/articles, **water logging**, **sleep**, **glucose**, **medication/GLP-1**, **fasting timer**, restaurant/venue menus, voice logging, AI meal-photo scan, grocery commerce (Instacart/Walmart), challenges, custom body measurements UI, progress photos, daily food-logging streak, home-screen widget (snapshot writer exists, COMP-019, but it is a written-out snapshot, not a shipped widget surface).

---

## (3) Gaps where MFP beats us — ranked

Each tagged **[SAFE-TO-BUILD]** (compatible with VOLYUME constraints: ED-safety, offline-first, EU/no-PII, Free/Pro gating, deterministic — no AI/LLM) or **[GATED]** (conflicts with a constraint; do NOT build without founder decision).

1. **Progress photos + custom body measurements** — `[SAFE-TO-BUILD]`. MFP has full progress-photo gallery/import and custom measurement types (waist, arms, etc.). VOLYUME has body metrics (weight) but no photo gallery or arbitrary measurement types. High value for a physique app; offline-first and no-PII-friendly (photos stay local / EU storage). Strong fit.
2. **Water logging** — `[SAFE-TO-BUILD]`. Simple, offline, no ED conflict (water is adherence-neutral). MFP: `WaterLoggingActivity`, `WaterEntriesDBAdapter`. Common expectation; cheap. Keep it non-gamified (no streak).
3. **Nutrition reports / per-nutrient breakdown over time** — `[SAFE-TO-BUILD]`. MFP's `FoodListsActivity` (which foods drove a nutrient), single-nutrient graphs, Reports section, period export. VOLYUME has Food Insights but a deeper "nutrient → contributing foods → trend" report is a real gap. Deterministic, offline.
4. **Recipe import from web URL** — `[SAFE-TO-BUILD]` *with care*. MFP `RecipeImportBrowserActivity`/`RecipeImportReviewActivity` parse a recipe page into ingredients. SAFE only if parsing is deterministic (HTML/structured-data scrape, no LLM) and respects offline-first/EU (no third-party AI service). If it needs an LLM to parse, it becomes [GATED].
5. **Restaurant / venue menu logging** — `[SAFE-TO-BUILD]` if data is a static/EU-hosted dataset; leans [GATED] if it requires a live third-party venue API (PII/location + non-EU). MFP `restaurantlogging/*`. Defer.
6. **Per-day-of-week custom goals & per-meal targets** — `[SAFE-TO-BUILD]`. MFP `CustomGoalByDayActivity`, `MealGoalsActivity`. Deterministic targets; fits the coaching engine without AI. Must respect calorie floors.
7. **Custom meal names / more diary structure** — `[SAFE-TO-BUILD]`. MFP `CustomMealNamesActivity`. Small, offline.
8. **Friends / community / newsfeed / forum / DMs** — `[GATED]`. Conflicts with EU/no-PII (social graph + messages = PII + content moderation) and the no-shame/no-comparison ED stance. VOLYUME's deliberate answer is the privacy-first **training partner** (`PartnerScreen.js`) — derived signals only, no profiles/feed. Do not build a social network.
9. **Daily food-logging streak + celebration/gamification** — `[GATED]`. Directly violates the ED rule (NO streaks/guilt/gamification). MFP ships `food_logging_streak_*` with bolt icons and celebration Lottie. VOLYUME's ED-safe weekly consistency (`streak.js`, freezes under ED flag, never shows a "fail") is the compliant substitute — keep it.
10. **Intermittent fasting timer** — `[GATED]` (already known-gated per CLAUDE.md). MFP `intermittentfasting/*`. Fasting windows can drive restriction; conflicts with ED-safety. Founder-decision only.
11. **Micronutrients / NRV tracking** — `[GATED]` (already known-gated; Ultimate-Audit item 16). MFP tracks full micronutrient panel (`AdditionalNutrientGoals`, single-nutrient graphs). Decision-gated.
12. **Home-screen widget** — `[GATED]` (known-gated). Snapshot writer exists (`src/lib/widgets/writer`, COMP-019) but the native widget surface is the gated piece.
13. **Voice logging / AI meal-photo scan** — `[GATED]`. Both require AI/LLM/ML inference → violates "deterministic, no AI" and likely sends data off-device (EU/no-PII risk). MFP `voicelogging/*`, `mealscan/*`. Do not build.
14. **Medication / GLP-1 + side-effects tracking** — `[GATED]`. Special-category health data (Article 9) + clinical framing; large scope, PII-heavy. Founder strategic decision only.
15. **Grocery commerce (Instacart/Walmart/Shop)** — `[GATED]`. Third-party commerce APIs = non-EU data + PII; off-strategy for a training app.
16. **Sleep / glucose tracking** — `[GATED]`-leaning. Possible via Health Connect/Apple Health read (offline, EU-safe) so a *read-only* sleep/HR card could be [SAFE-TO-BUILD], but full logging UIs are scope-heavy and off the core training+nutrition spine. Defer to founder.

---

## (4) Where VOLYUME already beats MFP

- **Strength training is a real programming engine, not a logger.** MFP only has `LogWorkoutRoutineActivity` + exercise-as-diary-entry. VOLYUME has a deterministic plan engine, mesocycles/periodisation, set/rep/RIR, rest timer with lock-screen keep-alive + Live Activity, volume heatmap, lift progression, strength standards (`planEngine.js`, `mesocycle.js`, `poolGenerator.js`, `swapEngine.js`, `strengthStandards.js`, `liftProgress.js`). This is a different league for lifters.
- **Precision Coaching is deterministic + ED-safe.** Weekly coach adjusts training/nutrition with calorie floors, FFM energy floor, rapid-loss gates, ED-pattern detection, Beat UK signposting, calm mode (`weeklyCoach.js`, `nutritionEngine.js`, `edPatternDetector.js`, `wellbeing.js`). MFP has goals + habits but ships gamified streaks that VOLYUME deliberately refuses.
- **Offline-first, EU-resident, no-PII, ad-free.** MFP is ad-supported (`add_water_entry_top_*_ad_unit`), cloud-coupled, and sends data to many partners. VOLYUME is local-source-of-truth, EU-Dublin, no analytics PII.
- **Privacy-first partner vs. social graph.** VOLYUME's derived-signal partner (no profiles, no feed, deletes on end) is a healthier, GDPR-clean answer than MFP's friends/messages/forum/newsfeed.
- **No-shame UX.** Adherence-neutral (no green/red), no daily streak guilt, ED freeze behaviour — a genuine differentiator vs. MFP's bolt-streak engagement loop.
- **Cleaner food provenance for UK/EU.** OpenFoodFacts UK + CoFID + USDA seeded locally with source chips, offline.

---

## (5) Single highest-leverage SAFE feature gap to close

**Progress photos + custom body measurements** (gap #1, `[SAFE-TO-BUILD]`).

Rationale: VOLYUME is a *physique* app (the brand is body-composition outcomes), yet it tracks only scale weight — MFP ships a full progress-photo gallery and arbitrary body-measurement types (waist, arms, chest, hips). For the target user (lifters tracking recomposition where the scale lies), before/after photos and tape measurements are the *primary* progress signal, often more motivating than weight. It is fully compatible with every constraint: offline-first (photos/measurements stored locally, synced to EU-Dublin), no-PII-to-third-parties (never leaves Supabase EU), deterministic (no AI), and ED-safe if presented adherence-neutrally (no "goal weight" countdown shaming, no streak). It slots naturally into the existing Progress tab next to `BodyMetricsScreen.js`, reuses the snapshot/measurement DB patterns MFP itself models (`MeasurementTypesDBAdapter`), and closes a credibility gap against MFP for the exact audience VOLYUME is built for. Pro-gate it alongside the other body-composition features.
