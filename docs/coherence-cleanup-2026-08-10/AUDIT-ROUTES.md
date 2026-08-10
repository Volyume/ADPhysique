# AUDIT-ROUTES — Campaign 4 lane: routes reachability

**Authority:** Campaign 4 founder order, PHASE 1 (rebuild the live/dead reachability
map), PHASE 11 (stale route registrations), PHASE 21 (empty / deep link /
notification cleanup). Classification law: order section CORE CLEANUP LAW (A–I).
**Baseline:** branch `claude/campaign4-coherence`, tree at `92b9644e` (main) +
`0f4d868e` (docs only).
**Status:** READ-ONLY audit. Nothing executed, nothing deleted, no commit.
Every removal below is a PROPOSAL with proof; the lead executes or rules.

Zero callers alone never proves dead. Every DEAD verdict below is checked
against: decision register, tests, deep-link config, notification route map,
widgets, native intents, dynamic/lazy requires, Metro platform variants, saved
navigation state, and scripts/CI. Where any of those left doubt, the verdict is
**I — UNCERTAIN, do not delete**.

---

## 1. Method

Sources read in full or in the cited range:

- `src/navigation/RootNavigator.js` (1,770 lines) — the ONLY navigator file.
  Verified sole navigator: `rg -l "createStackNavigator|createBottomTabNavigator|createNativeStackNavigator|createDrawerNavigator" src/` returns
  `RootNavigator.js` and `src/components/ScreenBoundary.js` (the latter is the
  `withScreenBoundaries` factory wrapper at `RootNavigator.js:169-170`, not a
  second navigator).
- `src/navigation/navigateCrossTab.js` — the single sanctioned cross-tab idiom.
- `src/lib/notifications/notificationRoute.js` — the notification tap map.
- `src/widgets/widgetTaskHandler.js`, `src/widgets/widgets.js`, `index.js:11-14`,
  `app.json` (scheme, intentFilters, widget plugin block).
- `docs/ux-world-class-audit-2026-07-09/DECISIONS-2026-07-09.md` D92-1 (cardio boundary).
- `docs/IDENTITY_AND_OWNERSHIP_LOCKED.md:286-296` (quiz-first rollback lock).

Reachability was computed mechanically (parse every `<Stack.Screen>` /
`<Tab.Screen>` across all ten navigator functions including multi-line JSX; then
match every `navigation.navigate|push|replace('X')`, every
`navigate('Tab', { screen: 'X' })`, every `navigateCrossTab(nav, 'Tab', 'X')`,
plus the linking config and notification map, against the caller's OWN stack
membership). React Navigation silently DROPS a `navigate()` to a route not
registered in the caller's own navigator — the F4 bug class documented at
`src/__tests__/navigationTargets.guard.test.js:1-10` — so "a caller exists" is
NOT reachability; the caller must be registered in the same stack.

---

## 2. Census — headline counts

| Measure | Count | Evidence |
|---|---|---|
| Navigator functions | 10 | `RootNavigator.js` DiaryStack:361, HomeStack:438, PlansStack:468, ProgressStack:495, ProfileStack:530, MainTabs:588, WelcomeStack:673, FirstRunStack:686, Article9ConsentStack:709, ProOnboardingStack:721 |
| Route **registrations** | 116 | Stack.Screen/Tab.Screen tags across those 10 |
| **Unique** route names | 89 | dedup of the above |
| Screen files in `src/screens` | 83 | `ls src/screens/*.js` = 84 incl. `paywallExcerpts.js` (a data module, not a screen — header at `paywallExcerpts.js:1-3`) |
| Screen files with NO registration | **0** | every one of the 83 is `require`d in `RootNavigator.js`; set-diff empty both ways |
| Registrations with **no identified entry** | 10 | §5 |
| Routes **SOURCELESS** (registered, only navigator is a dead tap) | 1 | `BlockReflection` |
| Cross-stack **dead taps** (silently dropped navigate) | 16 sites | §6 |

### Per-navigator registration counts

| Navigator | Registrations | Root route |
|---|---|---|
| DiaryStack | 13 | `Diary` (:373) |
| HomeStack | 11 | `Home` (:450) |
| PlansStack | 10 | `Plans` (:480) |
| ProgressStack | 17 | `Analytics` (:507) |
| ProfileStack | 42 | `You` (:542) |
| MainTabs | 5 | `HomeTab` (:638) |
| WelcomeStack | 4 | `Welcome` (:676) |
| FirstRunStack | 5 | `FirstRunBranch` (:689) |
| Article9ConsentStack | 2 | `Article9Consent` (:712) |
| ProOnboardingStack | 7 | `ProOnboarding` (:724) |

---

## 3. REACHABILITY-MAP counts for Phase 30 census

Counted over the **89 unique route names**.

| Bucket | Count | Members |
|---|---|---|
| **Tab containers (LIVE)** | 5 | HomeTab, PlansTab, DiaryTab, ProgressTab, ProfileTab |
| **LIVE screens** (unconditional user path) | 57 | see §4 |
| **LIVE-CONDITIONAL** (Pro guard / flow-state gate; the guard renders, so the route is live) | 21 | Diary, MealPlan, FoodSearch, AddCustomFood, ScanBarcode, ScanLabel, FoodInsights, MyRecipes, MyMeals, RecipeBuilder, NutritionTargets, PerDayTargets, WeeklyCheckIn, CoachOutput, WeeklyStory, ProGoalSetup, PlanUpdate, CoachingReminders, BodyMetrics, ProgressPhotos, Partner |
| **ROLLBACK / dark intentional** | 2 | QuizTraining, PlanPreview |
| **LEGACY-retained, unreachable, documented** | 1 | MealNames |
| **SOURCELESS** (registered; every navigator to it is a dead tap) | 1 | BlockReflection |
| **PRODUCT-BOUNDARY REMNANT, already user-unreachable** | 2 | LogCardio, CardioHistory |
| **DEAD routes** (unique names with no reachable registration anywhere) | **0** | — |
| **DEAD registrations** (route+stack pairs, route live elsewhere) | **10** | §5 |
| **Dead screen files** | **0** | every screen file is registered |

> Note for the Phase 30 "before" line: the honest before-count for *dead routes*
> is **0 at the unique-name level and 10 at the registration level**. Reporting
> only unique names would hide the ten dead `route+stack` pairs, which are the
> actual Phase 11 targets.

---

## 4. Route census — LIVE and LIVE-CONDITIONAL

Class **A (LIVE — KEEP)** unless marked. Each has at least one navigator
registered in the SAME stack, or is that stack's initial route, or is a
deep-link / notification destination. Evidence column gives the proving entry.

### MainTabs (`RootNavigator.js:588-645`) — class A

`HomeTab` :638 · `PlansTab` :639 · `DiaryTab` :640 · `ProgressTab` :641 ·
`ProfileTab` :642. All five render in `VolyumeTabBar` (:620) and are pinned by
`src/__tests__/iaNavigation.guard.test.js:12-25`. Deep-link config and the
notification map both address them by these ids.

### DiaryStack (`:361-436`) — class A / B

| Route | Ln | Class | Proving entry |
|---|---|---|---|
| Diary | 373 | B (Pro, `withReadOnlyProGuard` :236) | stack root; deep link `diary/:date?` (:780); notif `planned_meal_confirm`/`diary_day` (`notificationRoute.js:66,76-78`) |
| MealPlan | 374 | B | `DiaryScreen.js:1566,1676`; crossTab `MealPlanScreen.js` |
| FoodSearch | 379 | B | `DiaryScreen.js:924` +3 in-stack |
| AddCustomFood | 384 | B | 7 in-stack callers |
| ScanBarcode | 389 | B | `DiaryScreen.js:932,1864` |
| ScanLabel | 394 | B | 2 in-stack |
| **LogCardio** | 399 | **G** | see §7 — reachable ONLY from `CardioHistoryScreen.js:227`, itself only reachable from LogCardio. Closed cycle, no external door. |
| **CardioHistory** | 404 | **G** | `LogCardioScreen.js:175` only |
| FoodInsights | 409 | B | `DiaryScreen.js:2000` |
| MyRecipes | 414 | B | 1 in-stack |
| MyMeals | 419 | B | 1 in-stack |
| RecipeBuilder | 424 | B | 2 in-stack |
| ProUpgrade | 433 | A | `ProGate.js` (3 sites) + in-stack; pinned by `navigationTargets.guard.test.js:81-95` |

### HomeStack (`:438-466`)

| Route | Ln | Class | Proving entry |
|---|---|---|---|
| Home | 450 | A | stack root; crossTab from `WeeklyCheckInScreen` |
| BuildWorkout | 451 | A | deep link `workout/start` (:768) + 3 crossTab |
| ActiveWorkout | 452 | A | 6 in-stack + 6 crossTab |
| WorkoutSummary | 453 | A | `ActiveWorkoutScreen.js:2288` (`replace`) |
| WorkoutHistory | 454 | A | 1 in-stack |
| **VolumeHeatmap** | **455** | **F** | **no entry** — §5.1 |
| ShareCard | 456 | A | 3 in-stack |
| CoachReview | 457 | A | `HomeScreen.js:1635` |
| **LogCardio** | **460** | **F/G** | **no entry** — §5.2 |
| ProUpgrade | 461 | A | ProGate + in-stack |
| FreeStarter | 463 | A | `HomeScreen.js` no-plan card |

### PlansStack (`:468-493`) — all class A

Plans :480 (root) · PlanUpdate :481 (B, Pro) · PlanDetail :482 (12 in-stack +
deep link `routine/:planId` :790) · RoutineDetail :483 · ExerciseDetail :484 ·
ManualBuilder :485 · PlanLibrary :486 · MesocycleBuilder :487 · ProUpgrade :488 ·
FreeStarter :490.

### ProgressStack (`:495-528`)

| Route | Ln | Class | Proving entry |
|---|---|---|---|
| Analytics | 507 | A | root; deep link `progress` (:796); notif `monthly_recap`, `checkin_missed` followup (`notificationRoute.js:35,61`) |
| WorkoutHistory | 508 | A | 2 in-stack |
| WorkoutSummary | 509 | A | 3 in-stack |
| VolumeHeatmap | 510 | A | `AnalyticsScreen.js:743`; crossTab `YouScreen.js:550` |
| **CoachReview** | **511** | **F** | **no entry** — §5.3 |
| BodyMetrics | 512 | B | `AnalyticsScreen.js:807`, `LiftProgressScreen.js:323`, crossTab `AthleteProfileScreen.js:569` |
| ProgressPhotos | 513 | B | 3 in-stack + crossTab `AthleteProfileScreen.js:579` |
| LiftProgress | 514 | A | 2 in-stack + 2 crossTab |
| Consistency | 515 | A | notif `partner_cheer` (`notificationRoute.js:53`) |
| Partner | 516 | B | 1 in-stack + 3 crossTab |
| ExerciseDetail | 517 | A | 3 in-stack + 5 crossTab |
| YearOfLifts | 518 | A | `AnalyticsScreen.js:851`; notif `year_of_lifts_unlock` (`notificationRoute.js:30`) |
| **RecapStory** | 519 | **A — resolved, see §8** | `AnalyticsScreen.js:604,836` (in-stack, working) |
| ShareCard | 520 | A | 11 in-stack |
| **LogCardio** | 523 | **G** | `CardioHistoryScreen.js:227` only — §7 |
| **CardioHistory** | 524 | **G** | `LogCardioScreen.js:175` only — §7 |
| ProUpgrade | 525 | A | ProGate + in-stack |

### ProfileStack (`:530-586`)

All class A unless noted. Root `You` :542.

AthleteProfile :543 · Settings :544 · SettingsWorkout :545 · SettingsAccount :546 ·
SettingsProfile :547 · SettingsCoaching :548 · SettingsDisplay :549 ·
SettingsHealth :550 · SettingsData :551 · SettingsDietary :552 ·
**Snapshots :553 — A, resolved §8** (`SettingsDataScreen.js:313`) ·
SettingsPrivacy :554 · SettingsAbout :555 · SettingsFaq :556 ·
NutritionTargets :557 (B) · **MealNames :558 — E, §5.4** ·
PerDayTargets :559 (B) · NutritionEducation :560 ·
**BodyMetrics :561 — F, §5.5** · ProgressPhotos :562 (B —
proven live here by `WeeklyCheckInScreen.js:1688`, a ProfileStack screen) ·
WeeklyCheckIn :563 (B; deep link `checkin` :813; notif `weekly_checkin`,
`checkin_missed`, `trial_day3`) · CoachOutput :564 (B; deep link `coach` :811;
notif `weekly_coach_ready`) · WeeklyStory :565 (B) · Methodology :566 ·
ShareCard :567 · CoachHeldHistory :568 · **BlockReflection :569 — SOURCELESS,
§5.6** · ProGoalSetup :570 (B) · GoalChangeSummary :571 · GoalLockConsent :572 ·
NotificationSettings :573 · Import :574 · CoachingReminders :575 (B) ·
WellbeingCheck :576 · PrivacyPolicy :577 · DebugLog :578 ·
SubscriptionPolicy :579 · Subscription :580 (notif `winback`,
`notificationRoute.js:49`; `PostLapseSheet.js:72` via navigationRef) ·
CascadeGate :581 (notif `cascade_gate`, `notificationRoute.js:39`) ·
Credits :582 · ProUpgrade :583.

### Pre-MainTabs stacks

| Route | Ln | Class | Proving entry |
|---|---|---|---|
| WelcomeStack.Welcome | 676 | A | `renderNavigator()` :1575 `if (!user) return <WelcomeStack />` |
| WelcomeStack.**QuizTraining** | 679 | **D** | `WelcomeScreen.js:69` behind `ONBOARDING_QUIZ_FIRST` — §9 |
| WelcomeStack.**PlanPreview** | 680 | **D** | `QuizScreen.js:67` — §9 |
| WelcomeStack.Login | 681 | A | `WelcomeScreen.js:73` + 2 |
| FirstRunStack.FirstRunBranch | 689 | A | `renderNavigator()` :1609 |
| FirstRunStack.FreeStarter | 694 | A | `FirstRunScreen.js:54` |
| FirstRunStack.**PlanLibrary** | **695** | **F** | **no entry** — §5.7 |
| FirstRunStack.**PlanDetail** | **696** | **F** | transitively unreachable — §5.7 |
| FirstRunStack.**ActiveWorkout** | **700** | **F** | **no entry** — §5.7 |
| Article9ConsentStack.Article9Consent | 712 | A | `renderNavigator()` :1606 |
| Article9ConsentStack.PrivacyPolicy | 716 | A | in-stack from the consent screen |
| ProOnboardingStack.ProOnboarding | 724 | A | `renderNavigator()` :1609 |
| ProOnboardingStack.**PlanLibrary** | **725** | **F** | **no entry** — §5.7 |
| ProOnboardingStack.**PlanDetail** | **726** | **F** | transitively unreachable — §5.7 |
| ProOnboardingStack.**ActiveWorkout** | **727** | **F** | **no entry** — §5.7 |
| ProOnboardingStack.ProSetupComplete | 728 | A | `ProOnboardingScreen.js:1096,1108` (`replace`) |
| ProOnboardingStack.NutritionEducation | 731 | A | `ProSetupCompleteScreen.js:317` |
| ProOnboardingStack.Methodology | 734 | A | `ProSetupCompleteScreen.js:511` |

---

## 5. DEAD / SOURCELESS registrations — each with its A–I proof

### 5.1 `HomeStack.VolumeHeatmap` — `RootNavigator.js:455` — class **F (CONFIRMED DEAD)**

- **Non-test callers:** exactly two, repo-wide.
  `AnalyticsScreen.js:743` `navigation.navigate('VolumeHeatmap')` — AnalyticsScreen is
  registered ONLY in ProgressStack (:507), so it resolves against `ProgressStack.VolumeHeatmap` (:510).
  `YouScreen.js:550` `navigateCrossTab(navigation, 'ProgressTab', 'VolumeHeatmap')` — explicitly targets ProgressTab.
- **No HomeStack screen navigates to it.** Home/BuildWorkout/ActiveWorkout/WorkoutSummary/
  WorkoutHistory/ShareCard/CoachReview/FreeStarter/ProUpgrade/LogCardio: zero hits.
- **Deep links:** absent from `linking.config` (:759-818). **Notifications:** absent from
  `notificationRoute.js`. **Widgets:** no click target. **Saved nav state:** the app
  does not persist navigation state (no `initialState`/`PERSISTENCE_KEY` anywhere in `src/`).
- **Tests:** `campaign3.discoverability.test.js:59` pins only the *crossTab-to-ProgressTab*
  form, which this deletion does not touch.
- **Decisions/migrations/sync:** none reference it.
- **REMOVAL SAFE? YES.** Delete `RootNavigator.js:455` only. ProgressStack:510 stays.

### 5.2 `HomeStack.LogCardio` — `RootNavigator.js:460` — class **F, reinforced by G**

- The registration's own comment (`:458-459`) says *"Cardio is launched from the Today
  tab's CardioCard"*. **That card no longer exists**: `AnalyticsScreen.js:748-750` records
  its removal, and `progressAndBrief.founderRulings.guard.test.js:35` asserts
  `components/CardioPlanCard.js` does not exist. Repo-wide there is no cardio entry on Home.
- **Non-test callers in HomeStack:** zero. `LogCardioScreen.js:175` navigates OUT of
  LogCardio to CardioHistory, which HomeStack does **not** register — so even the one
  screen reachable here would dead-tap.
- Authority: DECISIONS D92-1 (`DECISIONS-2026-07-09.md:2369-2378`) — cardio logging is
  out of scope, "no campaign may re-enable cardio routes or surface cardio UI."
- **REMOVAL SAFE? YES for the registration.** The `GatedLogCardio` wrapper (:237) must
  stay while DiaryStack/ProgressStack registrations stand (`proScreenGating.guard.test.js:130`).

### 5.3 `ProgressStack.CoachReview` — `RootNavigator.js:511` — class **F**

- **The only non-test caller repo-wide** is `HomeScreen.js:1635`
  `navigation.navigate('CoachReview')`. HomeScreen is registered only in HomeStack, so it
  resolves against `HomeStack.CoachReview` (:457).
- No ProgressStack screen navigates to it; not a deep link, not a notification target, no
  widget/native entry; no test names the route (`rg "'CoachReview'" src/**/__tests__` = 0 hits).
- **REMOVAL SAFE? YES.** Delete :511 only; :457 stays.

### 5.4 `ProfileStack.MealNames` — `RootNavigator.js:558` — class **E (LEGACY, KEEP + DOCUMENT)**

- **Zero navigators anywhere in `src/`** — the strongest zero-caller signal in the census.
- **BUT the retention is an explicit founder order, quoted verbatim in source** at
  `SettingsScreen.js:67-70`: *"Founder order (2026-07-13): the 'Meal names' settings row is
  REMOVED - not needed. The MealNames screen and its route stay registered (harmless,
  unreachable from Settings) in case meal renaming ever returns by founder decision."*
- Corroborated by `docs/_FULL-APP-PRODUCT-MAP.md:2053-2055` ("LEGACY-UNREACHABLE
  (documented and deliberate)") and `docs/discoverability-audit-2026-08-10/SETTINGS-INVENTORY.md:190`.
- Pinned by `proScreenGating.guard.test.js:123` (`GatedMealNames` must stay guarded).
- Its data layer is live and shared: `mealSlots.js` labels are read by `DiaryScreen` and
  sized by `NutritionTargetsScreen` (`NutritionTargetsScreen.mealsPerDayLabel.guard.test.js:85-87`).
- **REMOVAL SAFE? NO — do not delete.** Class E: keep, and add the one-line
  "retained by founder order 2026-07-13, deliberately unreachable" note at the
  registration site so the next audit stops re-discovering it.

### 5.5 `ProfileStack.BodyMetrics` — `RootNavigator.js:561` — class **F**, but see caveat

- **All three non-test callers resolve elsewhere:** `AnalyticsScreen.js:807` and
  `LiftProgressScreen.js:323` are ProgressStack-only screens; `AthleteProfileScreen.js:569`
  (the one ProfileStack screen that links body metrics) deliberately uses
  `navigateCrossTab(navigation, 'ProgressTab', 'BodyMetrics')` — it routes AWAY from ProfileStack.
- Not a deep link, not a notification target.
- **Caveat that keeps this off the immediate F/G list:** `proScreenGating.guard.test.js:128`
  matches `BodyMetrics` across the whole navigator file and its comment (`:120-126`) states
  the intent that BodyMetrics is registered in more than one stack so "free deep-linking
  cannot bypass the guard via either entry point." That is a *defence-in-depth* rationale,
  not a reachability one, and the sibling `ProfileStack.ProgressPhotos` (:562) IS live here
  (`WeeklyCheckInScreen.js:1688`). The pair reads as deliberately symmetric.
- **VERDICT: I — UNCERTAIN.** Reachability says F; the guard comment implies a deliberate
  defence-in-depth registration. Needs a lead ruling, not a unilateral delete.

### 5.6 `ProfileStack.BlockReflection` — `RootNavigator.js:569` — **SOURCELESS**, class **I** (do not delete; FIX instead)

- **The only navigator repo-wide** is `MesocycleBuilderScreen.js:283`
  `navigation.navigate('BlockReflection', { mesocycleId: meso.id })` — the "View block
  summary" button. MesocycleBuilder is registered ONLY in PlansStack (:487);
  BlockReflection ONLY in ProfileStack (:569). **React Navigation silently drops it.**
  The button is a live, visible, inert control in production.
- BlockReflection in turn carries three of its own dead taps (§6): its "Play block story"
  header button (`:171` → `RecapStory`, ProgressStack-only) and both "Start a new block"
  CTAs (`:207`, `:321` → `MesocycleBuilder`, PlansStack-only).
- Authority KEEPS the feature: `DECISIONS-2026-07-09.md:2344` — *"The full reflection stays
  one tap away on BlockReflection"*. It is a wanted surface, currently unreachable.
- Test coverage exists at `src/__tests__/screen-mount.test.js:880-886` (mount only).
- **REMOVAL SAFE? NO.** Deleting it would delete a surface the decision register says must
  stay one tap away. **The defect is the navigation, not the registration.** Proposal:
  convert `MesocycleBuilderScreen.js:283` to `navigateCrossTab(navigation, 'ProfileTab',
  'BlockReflection', { mesocycleId })`, and fix the three outbound taps the same way — or
  rule to move `BlockReflection` into PlansStack beside `MesocycleBuilder`. Lead decision.

### 5.7 Onboarding-stack registrations with no entry — class **F** (6 registrations)

`FirstRunStack.PlanLibrary` :695 · `FirstRunStack.PlanDetail` :696 ·
`FirstRunStack.ActiveWorkout` :700 ·
`ProOnboardingStack.PlanLibrary` :725 · `ProOnboardingStack.PlanDetail` :726 ·
`ProOnboardingStack.ActiveWorkout` :727

Proof:

- **FirstRunStack** registers exactly two reachable screens: `FirstRunBranch` (root) and
  `FreeStarter`, reached by `FirstRunScreen.js:54`
  `navigation.navigate('FreeStarter', { fromFirstRun: true })`.
  `FreeStarterScreen` under `fromFirstRun` **never** opens the library: its browse handler
  (`FreeStarterScreen.js:103-106`, comment *"Browse instead (Home/Plans contexts only)"*)
  is bound only in the non-first-run branch — `FreeStarterScreen.js:236`
  `onPress={fromFirstRun ? handleSkip : handleBrowse}`. `handleSkip` calls
  `completeFirstRun()` (`:88-94`), which flips the navigator to MainTabs.
- **ProOnboardingStack**: `ProOnboardingScreen.js` contains exactly two navigation calls,
  both `navigation.replace('ProSetupComplete')` (`:1096`, `:1108`); `rg -i "planlibrary|plan library|browse plans" src/screens/ProOnboardingScreen.js` = **0 hits**.
  `ProSetupCompleteScreen` navigates only to `NutritionEducation` (:317), `Methodology`
  (:511) and `NotificationSettings` (:268 — itself a dead tap, §6).
- **PlanDetail is transitively dead in both stacks**: its only in-stack navigator is
  `PlanLibraryScreen`, which is itself unreachable there.
- `PlanLibraryScreen.js:350,375` `if (fromFirstRun) navigation.navigate('ProSetupComplete')`
  is dead code in the same way: **no caller anywhere passes `fromFirstRun` to PlanLibrary**
  (`rg "fromFirstRun" src/` — the only producer is `FirstRunScreen.js:54`, targeting FreeStarter).
- Deep links cannot reach these: `linking.config` names only MainTabs-nested screens
  (`RootNavigator.js:746-755` states this explicitly). Notifications route only to tabs.
- **REMOVAL SAFE? YES for the six registrations**, with one qualification: this is the
  residue of the pre-B2 onboarding shape, and removing it makes the two onboarding stacks
  honest. It also removes latent dead taps (`ActiveWorkoutScreen.js:2288` `replace('WorkoutSummary')`
  and `PlanDetailScreen.js:267,464` are dead in exactly these two stacks — §6).
  **Recommend the lead confirm no founder intent to re-add a "browse the library during
  onboarding" step before deleting**; if that intent exists, the fix is a navigator, not a
  deletion. Absent such intent: F.

---

## 6. Cross-stack dead-tap register (16 sites) — Phase 11 "no valid navigation exists"

Every row is a `navigation.navigate|push|replace('X')` whose target is NOT registered in
the caller's own stack. React Navigation drops these silently.

| # | Site | Target | Caller registered in | Target missing from | Severity |
|---|---|---|---|---|---|
| 1 | `MesocycleBuilderScreen.js:283` | BlockReflection | PlansStack | PlansStack | **HIGH** — makes BlockReflection SOURCELESS (§5.6) |
| 2 | `BlockReflectionScreen.js:171` | RecapStory | ProfileStack | ProfileStack | HIGH — "Play block story" inert |
| 3 | `BlockReflectionScreen.js:207` | MesocycleBuilder | ProfileStack | ProfileStack | HIGH — empty-state CTA inert |
| 4 | `BlockReflectionScreen.js:321` | MesocycleBuilder | ProfileStack | ProfileStack | HIGH — "Start a new block" inert |
| 5 | `YouScreen.js:499` | LogCardio | ProfileStack | ProfileStack | **HIGH** — the ONLY cardio door; §7 |
| 6 | `ProUpgradeScreen.js:617` | SubscriptionPolicy | all 5 tab stacks | Home/Plans/Diary/Progress | **HIGH** — "What stays if you switch back to Free later" is inert in 4 of 5 paywall entries (billing-copy adjacent; do not change copy, only navigation) |
| 7 | `WorkoutSummaryScreen.js:1361` | ProgressPhotos | Home+Progress | HomeStack | MED — "add photo" inert after a workout finished from Today |
| 8 | `WorkoutSummaryScreen.js:1461` | RecapStory | Home+Progress | HomeStack | MED |
| 9 | `WorkoutSummaryScreen.js:1504` | RecapStory | Home+Progress | HomeStack | MED |
| 10 | `LogCardioScreen.js:175` | CardioHistory | Diary+Home+Progress | HomeStack | LOW — HomeStack.LogCardio is itself dead (§5.2) |
| 11 | `ProSetupCompleteScreen.js:268` | NotificationSettings | ProOnboardingStack | ProOnboardingStack | MED — the "Reminders off" row in Pro setup is inert |
| 12 | `ActiveWorkoutScreen.js:2288` | WorkoutSummary (`replace`) | FirstRun+ProOnb+Home | FirstRun, ProOnboarding | resolves once §5.7 lands |
| 13 | `PlanDetailScreen.js:267` | ManualBuilder | FirstRun+Plans+ProOnb | FirstRun, ProOnboarding | resolves once §5.7 lands |
| 14 | `PlanDetailScreen.js:464` | RoutineDetail | FirstRun+Plans+ProOnb | FirstRun, ProOnboarding | resolves once §5.7 lands |
| 15 | `PlanLibraryScreen.js:350` | ProSetupComplete | FirstRun+Plans+ProOnb | FirstRun, Plans | dead code (`fromFirstRun` never true here) |
| 16 | `PlanLibraryScreen.js:375` | ProSetupComplete | FirstRun+Plans+ProOnb | FirstRun, Plans | dead code, same |

**Guard-coverage gap:** `src/__tests__/navigationTargets.guard.test.js:23` canaries only
six ProfileStack-only routes (`CoachOutput, NutritionTargets, SettingsPrivacy,
WeeklyCheckIn, PerDayTargets, SettingsWorkout`) across six named screens. Rows 1–6 above
are all outside that canary set. The class the guard exists to prevent has recurred six
times. Recommend the guard be generalised to a computed check (registration map vs every
bare `navigate`) rather than a hand-maintained list — that is a Phase 23/24 item.

---

## 7. Cardio routes — reachability verdict (feeds PHASE 2A)

**Finding: cardio logging is already 100% unreachable in the shipping product.**

The five cardio registrations form a closed two-node cycle with no external door:

| Registration | Ln | In-stack entry |
|---|---|---|
| DiaryStack.LogCardio | 399 | `CardioHistoryScreen.js:227` (empty-state CTA) |
| DiaryStack.CardioHistory | 404 | `LogCardioScreen.js:175` (header) |
| HomeStack.LogCardio | 460 | **none** |
| ProgressStack.LogCardio | 523 | `CardioHistoryScreen.js:227` |
| ProgressStack.CardioHistory | 524 | `LogCardioScreen.js:175` |

Every external door is closed or broken:

- **Progress tab card:** removed by founder ruling 2026-08-06 —
  `AnalyticsScreen.js:748-750`; component deleted, asserted by
  `progressAndBrief.founderRulings.guard.test.js:34-36`.
- **Plans tab card:** removed 2026-06-03 — `PlansScreen.js:1243-1244`. (Its module header
  at `PlansScreen.js:97-99` still describes a live "Weekly cardio card on Plans… Tap to
  log." — a **stale lying comment**, Phase 15 lane.)
- **Coach tab row (`YouScreen.js:493-500`):** `navigation.navigate('LogCardio')` from
  ProfileStack, where LogCardio is **not registered** → silently dropped. The visible
  "Log cardio" NavRow is a **dead control**.
- **Deep links:** no cardio path in `linking.config` (:759-818).
- **Notifications:** no cardio type in `notificationRoute.js` or in the scheduled type set.
- **Widgets / quick actions / intents:** none.

**A test currently pins the dead control in place.**
`progressAndBrief.founderRulings.guard.test.js:38-43` asserts
`expect(YOU).toContain("navigation.navigate('LogCardio')")` and
`expect(LOG).toContain("navigation.navigate('CardioHistory')")`, under the header claim
(`:11-13`) that *"The cardio ENTRY lives on the Coach tab (YouScreen) … so the feature
survives."* **That claim is false against current main** — the entry was never registered
in ProfileStack. This is a Phase 17 case C: the test protects a historical implementation
belief, not a behavioural law.

**Classification of the route layer: G — PRODUCT-BOUNDARY REMNANT, remove where
non-destructive.** Authority: `DECISIONS-2026-07-09.md:2369-2378` (D92-1), which names
this exact defect: *"including the dead tap found by the product map: the only cardio
entry navigates to an unregistered route"* and assigns clean removal to "the later
whole-product coherence/dead-code campaign" — i.e. Campaign 4.

**Route-layer removal proposal (non-destructive, no data touched):** delete the five
registrations (:399, :404, :460, :523, :524), the two `Gated*` wrappers (:237-238), the
`YouScreen.js:493-500` NavRow, and re-anchor
`progressAndBrief.founderRulings.guard.test.js:38-43` onto an absence guard.

**STOP boundaries this lane will not cross (class H / other lanes):**
`cardio_log` local + cloud storage, sync registry participation, export/delete
coverage, and the **live** coaching-adjacent reader `ReadinessCards.js:27,152-153`
(`getCardioLogRange` → `cardioRecoveryLoad`/`cardioLoadLevel` → a fatigue note rendered at
`:224-229`). That reader is user-visible today and is NOT a cardio-logging surface — it is
a consumer of historical cardio rows. Removing the write surface while that reader stands
is coherent, but the reader's fate is a Phase 2B/2C ruling, not a routes ruling.
`ProGate.js:38` also carries a live Pro promise string for cardio — Phase 19 lane.

---

## 8. The two old-map uncertainties — RESOLVED

### SnapshotsScreen → **LIVE (class A). Not dead.**

- Route `Snapshots` at `RootNavigator.js:553`, ProfileStack.
- Reached by `SettingsDataScreen.js:313` `onPress={() => navigation.navigate('Snapshots')}`.
- `SettingsData` is registered in the SAME stack (`RootNavigator.js:551`), so the navigate
  resolves. Path: Coach tab → You → Settings → Your data → Snapshots.
- Corroborated by the account-switch flow, which writes the snapshots the screen restores
  from (`RootNavigator.js:1265` copy: *"You can restore it from Settings, Your data."*;
  `dbSnapshot.snapshotBeforeAccountSwitch` at :1287-1288) and by
  `DECISIONS-2026-07-09.md:1593`.
- **Verdict: A — LIVE, KEEP.**

### RecapStory → **LIVE (class A). Not dead. Not an orphan alias.**

- Route `RecapStory` at `RootNavigator.js:519`, ProgressStack, deliberately sharing the
  `YearOfLiftsScreen` component with `YearOfLifts` (:518) — the same screen serves
  year/month/week/block via a `variant` param
  (`docs/ux-world-class-audit-2026-07-09/facts-coaching.md:23`).
- **Working navigators (both in ProgressStack, so both resolve):**
  `AnalyticsScreen.js:604` (recap card) and `AnalyticsScreen.js:836` (Recaps tile), each
  passing `recentMonthRecapParams(earliestWorkoutAt)`.
- **Three further navigators are dead taps** (§6 rows 2, 8, 9):
  `BlockReflectionScreen.js:171` and `WorkoutSummaryScreen.js:1461,1504` — all pass
  `{ variant: 'block', mesocycleId, blockName }`. So the **month** recap works and the
  **block** recap is inert from every one of its three entry points.
- **Verdict: A — LIVE, KEEP the registration.** The defect is the three block-recap
  navigators, not the route.

---

## 9. Dark / rollback routes — class D, KEEP

`QuizTraining` (:679) and `PlanPreview` (:680), WelcomeStack.

- Gate: `ONBOARDING_QUIZ_FIRST = false` at `src/lib/onboarding/quizFlow.js:24`, read at
  `WelcomeScreen.js:15,69`. With the flag on, `WelcomeScreen.js:70` opens `QuizTraining`;
  `QuizScreen.js:67` then opens `PlanPreview`.
- The registration comment at `RootNavigator.js:677-678` states they are "Registered always
  (harmless); only reached when ONBOARDING_QUIZ_FIRST is on".
- **Locked-document authority:** `docs/IDENTITY_AND_OWNERSHIP_LOCKED.md:286-296` —
  *"TURNED OFF 2026-06-26 by explicit founder decision … the flag and screens remain as
  the rollback switch (set back to `true` to restore)."*
- Campaign 4 order, PHASE 7: *"ONBOARDING_QUIZ_FIRST: … Unless a later ruling superseded
  it: KEEP."* No later ruling found in `DECISIONS-2026-07-09.md`.
- **Verdict: D — INTENTIONAL ROLLBACK SEAM. KEEP both registrations and both screens.**

---

## 10. Secondary entry mechanisms (PHASE 21)

### 10.1 Deep links — `linking` config, `RootNavigator.js:759-818`

Prefixes `volyume://`, `https://volyume.app`. Six paths, **all resolving to live,
registered routes**; none points at a retired or dark surface:

| Path | Target | Ln | Status |
|---|---|---|---|
| `workout/start` | HomeTab → BuildWorkout | 768 | LIVE |
| `diary/:date?` | DiaryTab → Diary | 780 | LIVE (Pro guard renders for free) |
| `routine/:planId` | PlansTab → PlanDetail | 790 | LIVE |
| `progress` | ProgressTab → Analytics | 796 | LIVE |
| `coach` | ProfileTab → CoachOutput | 811 | LIVE |
| `checkin` | ProfileTab → WeeklyCheckIn | 813 | LIVE |

`app.json` intent filters match exactly (scheme `volyume`; host `volyume.app` over
https, both `autoVerify: true`) — no orphaned filter.

**Two URI families are EMITTED but NOT MAPPED (class I — handle, do not delete):**

1. **`volyume://active-workout`** — emitted at `src/lib/notifications/restForeground.js:72`
   and `src/lib/notifications/activeWorkout.js:146`, and fired as a real
   `Intent.ACTION_VIEW` by the native module
   (`modules/rest-timer-live/.../WorkoutForegroundService.kt:409-411` and
   `RestTimerLiveModule.kt:322-324`). **There is no `active-workout` path in the linking
   config.** The rest path is LIVE (not flag-gated): `shouldUseRestForeground`
   (`restForeground.js:50-55`) requires only Android + the native module + rest ≤ 170 s.
   Tapping the chronometer notification therefore opens the app and resolves nothing —
   graceful (React Navigation leaves the mounted stack alone, no crash), but the promise
   is unmet. The workout-wide variant is additionally behind
   `USE_FOREGROUND_SERVICE = false` (`activeWorkout.js:49`), a platform-capability flag —
   Campaign 4 PHASE 7 says do not remove it without platform evidence.
   **Proposal: add `ActiveWorkout: 'active-workout'` under `HomeTab` in `linking.config`.**
   Additive, no deletion. Class I until the lead rules (it is a fix, not a cleanup).
2. **`volyume://partner/<CODE>` / `https://volyume.app/partner/<CODE>`** — built by
   `src/lib/partners/link.js:30-32`. Only consumed by manual paste:
   `PartnerScreen.js:45` imports `parseInviteCode`. **Not in the linking config**, so a
   tapped invite deep link opens the app to wherever the user was, not to Partner.
   Note also `app.json` has **no `ios.associatedDomains`**, so the
   `https://volyume.app/partner/...` universal link cannot open the app on iOS at all —
   it lands on the web page, which `link.js:9-12` says is the intended fallback for a
   partner without the app, but is NOT intended for an existing user.
   **Class I.** Not dead residue; a genuine gap. Flag to the lead; do not delete.

### 10.2 Notification tap destinations — `src/lib/notifications/notificationRoute.js`

Twelve `type → target` mappings. **All twelve resolve to live registered routes; none
points at a retired or dark surface.** Verified pairs: `ProfileTab/WeeklyCheckIn` (:28),
`ProgressTab/YearOfLifts` (:30), `ProgressTab/Analytics` (:35, :61),
`ProfileTab/CascadeGate` (:39), `ProfileTab/CoachOutput` (:43),
`ProfileTab/Subscription` (:49), `ProgressTab/Consistency` (:53),
`DiaryTab/Diary` (:66, :77-78), `HomeTab` (:85). **No cardio, Peak Week, timeline-diary
or quiz destination exists.**

Navigation is performed at `RootNavigator.js:906-928` with `initial: false` (:919) so a
lazy tab is mounted over its root rather than replacing it — correct.

**Gap (not residue):** ten scheduled `data.type` values have **no** entry in the map, so
`routeForNotificationType` returns `null` and the tap does nothing beyond opening the app:
`activation_nudge`, `active_workout`, `evening_weight`, `morning_weight`, `partner_joined`,
`partner_streak`, `rest_end`, `rest_timer`, `training_reminder`, `meal_log_reminder`.
Some are correct by design (`rest_timer`/`rest_end`/`active_workout` are foreground/sticky
surfaces). Others (`activation_nudge`, `training_reminder`, `morning_weight`,
`evening_weight`, `partner_joined`, `partner_streak`, `meal_log_reminder`) look like real
dead-end taps, and the module's own header (`notificationRoute.js:5-7`) states the contract:
*"Every type the scheduler sets … must have a route here, or tapping that notification
dead-ends."* **Class I — reported, not actioned; this is a fix lane, not a delete lane.**

### 10.3 Widgets — LIVE, and NOT a navigation entry

`src/widgets/widgets.js` + `src/widgets/widgetTaskHandler.js`, registered at a **native
entry point**: `index.js:11-14` `registerWidgetTaskHandler(widgetTaskHandler)`.
Configured in `app.json` under the `react-native-android-widget` plugin with two widgets
(`NextSession`, `WeeklyConsistency`) matching `widgetTaskHandler.js:27-35`.

**Do not classify as dead** — a static import grep from `src/` misses them; the entry is
`index.js`. `rg "clickAction|ClickAction|openUri" src/widgets/*.js` = **0 hits**: the
widgets carry no per-widget deep link, so a tap opens the launcher activity. No widget
points at a retired surface. **Class C — INTERNAL AND REQUIRED, KEEP.**

### 10.4 Quick actions / Android intents / iOS universal-link map

- **Quick actions (app-icon shortcuts): none.** `rg "quickAction|ShortcutManager|dynamicAppIcon"` over `src/`, `modules/`, `app.json` returns only unrelated style identifiers in `MealPlanScreen.js:1240-1250` (`planQuickActions` — a layout style name).
- **Android intents:** the two `app.json` intent filters (§10.1) only. No cardio, quiz or Peak Week intent.
- **iOS universal-link map:** `app.json` `expo.ios.associatedDomains` is **absent** — see §10.1 item 2.
- **Native module intents:** the only ones are the rest/workout foreground service
  content intents (§10.1 item 1) and its action PendingIntents
  (`WorkoutForegroundService.kt:374-383`), which re-enter the service via `getService`
  and never navigate.

### 10.5 Saved navigation state — NONE

`rg "PERSISTENCE_KEY|initialState|onStateChange|restoreState" src/` returns **zero**
matches. The `NavigationContainer` (`RootNavigator.js:1622-1638`) takes `ref`, `linking`,
`onReady` and `theme` only. **A stale device therefore cannot restore a removed screen
from persisted navigation state** — this materially de-risks every registration deletion
proposed above, and answers the Campaign 4 order's "saved navigation state" question
for PHASE 21 and for PHASE 25 question 3/7.

### 10.6 `navigationRef` imperative navigation (outside the notification path)

- `ScreenBoundary.js:92` → `navigate('HomeTab', { screen: 'Home', initial: false })` — LIVE, valid.
- `PostLapseSheet.js:72` → `navigate('ProfileTab', { screen: 'Subscription', initial: false })` — LIVE, valid.

Both target registered routes. No retired destination.

---

## 11. Proposed actions

### F / G — DELETE-SAFE (proposal; execution is the lead's)

| # | Item | Class | Evidence |
|---|---|---|---|
| 1 | `RootNavigator.js:455` `HomeStack.VolumeHeatmap` registration | F | §5.1 — both callers resolve to ProgressStack:510 |
| 2 | `RootNavigator.js:460` `HomeStack.LogCardio` registration + its stale comment :458-459 | F/G | §5.2 — the "Today tab CardioCard" it names is deleted |
| 3 | `RootNavigator.js:511` `ProgressStack.CoachReview` registration | F | §5.3 — sole caller `HomeScreen.js:1635` resolves to HomeStack:457 |
| 4 | `RootNavigator.js:695,696,700` FirstRunStack `PlanLibrary`/`PlanDetail`/`ActiveWorkout` | F | §5.7 — FreeStarter's browse path is bound only when `!fromFirstRun` |
| 5 | `RootNavigator.js:725,726,727` ProOnboardingStack `PlanLibrary`/`PlanDetail`/`ActiveWorkout` | F | §5.7 — ProOnboarding navigates only to ProSetupComplete |
| 6 | `PlanLibraryScreen.js:350,375` `if (fromFirstRun) navigate('ProSetupComplete')` | F | §5.7 — no caller ever passes `fromFirstRun` to PlanLibrary |
| 7 | `RootNavigator.js:399,404,523,524` cardio registrations + `:237-238` `GatedLogCardio`/`GatedCardioHistory` + `YouScreen.js:493-500` NavRow | G | §7 — D92-1 (`DECISIONS:2369-2378`); already user-unreachable; UI/route layer only, **no data touched** |

Items 1–6 are pure route hygiene with zero user-visible change (all are already
unreachable). Item 7 is the PHASE 2A boundary closure for the route layer and must land
together with the test re-anchor in §12, or the suite goes red.

### H / I — STOP, ruling required

| # | Item | Class | Why it stops here |
|---|---|---|---|
| 1 | `RootNavigator.js:558` `ProfileStack.MealNames` | **E** | Founder order 2026-07-13 quoted verbatim at `SettingsScreen.js:67-70` retains it deliberately. KEEP; add the retention note at the registration site. |
| 2 | `RootNavigator.js:569` `ProfileStack.BlockReflection` | **I** | SOURCELESS, but `DECISIONS:2344` requires the surface stay one tap away. Fix the navigator (§5.6), do not delete. Lead: cross-tab vs relocate to PlansStack. |
| 3 | `RootNavigator.js:561` `ProfileStack.BodyMetrics` | **I** | Reachability says F; `proScreenGating.guard.test.js:120-126` implies a deliberate defence-in-depth multi-stack registration. Needs a ruling. |
| 4 | 16 cross-stack dead taps (§6) | **I** | Six live, visible, inert controls (rows 1–6). These are DEFECTS to fix, not code to delete. Scope + sequencing is a lead call; rows 6 (`ProUpgradeScreen.js:617`) and 5 (`YouScreen.js:499`) touch billing-copy and cardio-boundary lanes respectively. |
| 5 | `progressAndBrief.founderRulings.guard.test.js:38-43` | **I → Phase 17 case C** | Actively pins a dead control and asserts a false claim about current main (§7). Must be re-anchored as an ABSENCE guard **in the same change** as F/G item 7, never deleted alone. |
| 6 | `volyume://active-workout` unmapped (§10.1) | **I** | LIVE native intent with no linking entry. Fix = add a path (additive). Not a deletion. |
| 7 | `volyume://partner/<CODE>` unmapped + no `ios.associatedDomains` (§10.1) | **I** | Real gap in a live feature; links may exist in the wild. Order PHASE 21: "handle gracefully… prefer safe fallback". Today's fallback IS safe (no crash). Lead ruling on whether to map it. |
| 8 | Ten scheduled notification types with no route (§10.2) | **I** | Contradicts `notificationRoute.js:5-7`'s own contract. Some are correct by design. Needs triage, not deletion. |
| 9 | `cardio_log` local/cloud tables, sync registry, export/delete, and the live reader `ReadinessCards.js:27,152-153` | **H** | Data-destructive or out of this lane. SECOND CLEANUP LAW: do not delete historical user data. Phase 2B/2C. |
| 10 | `PlansScreen.js:97-99` stale header describing a deleted cardio card | — | Phase 15 (comment truth) lane; noted here as route-adjacent evidence. |

### Guard-coverage recommendation (Phase 23/24)

`navigationTargets.guard.test.js` uses a hand-maintained six-route canary list
(`:23`). The bug class it exists to stop has recurred **16 times**, six of them outside
the list. Recommend replacing it with a computed guard: parse the registration map out of
`RootNavigator.js`, then assert that every bare `navigation.navigate('X')` in a screen
resolves in **every** stack that screen is registered in. That is a mechanical,
maintenance-free version of the same law and would have caught all sixteen.

---

## 12. What this lane did NOT do

No file outside this one was written. No route was removed, no navigator changed, no test
altered, no commit, push or stash. Every item in §11 is a proposal with its proof; the
lead executes, and items in the H/I table require a ruling first.
