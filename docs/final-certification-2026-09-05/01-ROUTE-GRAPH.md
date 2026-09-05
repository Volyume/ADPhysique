# 01 — ROUTE GRAPH (actual user-reachable product graph)

Authority: founder brief 2026-09-05 "final whole-product adversarial
certification", Part 1 (product graph) + Part 28 (dead ends).
Branch `claude/volyume-final-certification-w2xds1`, tree at 2026-09-05.
Read-only audit. Machine-readable graph: `data/route-graph.json`.
Extractor: `scripts/certification/route-graph.js` (deterministic, no deps).

## 0. Method and totals

Parsed `src/navigation/RootNavigator.js` for every `<Stack.Screen>` /
`<Tab.Screen>`; grepped all of `src/` (excluding `__tests__`) for
navigation-object calls (`navigation|nav|navigationRef|parent|getParent()`
`.navigate|.push|.replace|.jumpTo`), `navigateCrossTab(...)`, nested
`navigate('Tab', { screen })`, and `reset({ routes:[{name}] })`.

| Measure | Value |
|---|---|
| Screen registrations | 117 |
| Distinct route names | 84 |
| Screen files in `src/screens/` | 83 (+ `paywallExcerpts.js`, not a screen) |
| Navigation edges found | 237 |
| Dynamic (non-literal) nav targets | 4 — all resolved by hand below |
| Cross-stack dead taps in live tree | **0** |
| Deep-link paths in `linking.config` | 6 |
| Notification `data.type` → route mappings | 20 (`notificationRoute.js`) |

### Gates (`renderNavigator`, RootNavigator.js:2078-2133)

| Order | Condition | Navigator mounted |
|---|---|---|
| 1 | `!user` | `WelcomeStack` |
| 2 | signed-in, `!firstRunComplete && !healthConsentChecked` | blank splash (holds) |
| 3 | `healthConsentChecked && (healthConsent === false \|\| (healthConsent == null && !firstRunComplete))` | `Article9ConsentStack` (fail-closed) |
| 4 | `!firstRunComplete` | `ProOnboardingStack` |
| 5 | else | `LockedMainTabs` (MainTabs + optional biometric overlay) |

Tab titles vs internal ids: `HomeTab`=Today, `PlansTab`=Train,
`DiaryTab`=Nutrition, `ProgressTab`=Progress, `ProfileTab`=Coach.
Every tab stack pops to root on re-tap of the focused tab (NAV-5 listeners,
lines 364-368/429-433/471-475/510-514/558-562). Tabs are lazy; the
notification-tap handler passes `initial: false` (line 1020) so a cold
notification tap does not strand a tab on a single route.

## 1. The graph

"inbound" = navigation call sites naming that route anywhere in `src/`.
A route registered in N stacks shares one inbound count. Routes repeated
across stacks are transitive-closure copies (RootNavigator.js:449-454,
532-548, 571-582, 789-803), not duplicate features.

| Section (gate) | Routes registered — `route`(inbound) |
|---|---|
| **WelcomeStack** — signed out (gate 1) | `Welcome`(0), `QuizTraining`(1), `PlanPreview`(1), `Login`(1), `PrivacyPolicy`(2) |
| **Article9ConsentStack** — Article 9 gate (3) | `Article9Consent`(0), `PrivacyPolicy`(2) |
| **ProOnboardingStack** — first run (gate 4) | `ProOnboarding`(0), `ProSetupComplete`(1), `NutritionEducation`(2), `NotificationSettings`(4), `CoachingReminders`(4), `Methodology`(3), `HowYouTrain`(15), `HowYouTrainAdd`(5), `TrainingConsiderations`(1), `SettingsWorkout`(3), `AvoidedMovements`(2) |
| **HomeStack** — Today tab | `Home`(2), `BuildWorkout`(4), `ActiveWorkout`(11), `WorkoutSummary`(4), `WorkoutHistory`(3), `ShareCard`(8), `CoachReview`(1), `HowYouTrain`(15), `HowYouTrainAdd`(5), `TrainingConsiderations`(1), `SettingsWorkout`(3), `AvoidedMovements`(2) |
| **PlansStack** — Train tab | `Plans`(5), `PlanUpdate`(1), `PlanDetail`(9), `RoutineDetail`(2), `ExerciseDetail`(7), `ManualBuilder`(1), `PlanLibrary`(3), `MesocycleBuilder`(2), `AvoidedMovements`(2), `HowYouTrain`(15), `HowYouTrainAdd`(5), `TrainingConsiderations`(1), `SettingsWorkout`(3) |
| **DiaryStack** — Nutrition tab | `Diary`(2), `MealPlan`(4), `FoodSearch`(5), `AddCustomFood`(8), `ScanBarcode`(3), `ScanLabel`(2), `FoodInsights`(2), `MyRecipes`(1), `MyMeals`(2), `RecipeBuilder`(2) |
| **ProgressStack** — Progress tab | `Analytics`(1), `WorkoutHistory`(3), `WorkoutSummary`(4), `VolumeHeatmap`(3), `BodyMetrics`(3), `ProgressPhotos`(5), `LiftProgress`(3), `Consistency`(1), `Partner`(4), `ExerciseDetail`(7), `YearOfLifts`(1), `RecapStory`(5), `ShareCard`(8), `HowYouTrain`(15), `HowYouTrainAdd`(5), `TrainingConsiderations`(1), `AvoidedMovements`(2), `SettingsWorkout`(3) |
| **ProfileStack** — Coach tab | `You`(1), `AthleteProfile`(1), `Settings`(2), `SettingsWorkout`(3), `HowYouTrain`(15), `HowYouTrainAdd`(5), `TrainingConsiderations`(1), `AvoidedMovements`(2), `SettingsAccount`(1), `SettingsProfile`(2), `SettingsCoaching`(1), `SettingsDisplay`(1), `SettingsHealth`(1), `SettingsData`(2), `SettingsDietary`(1), `Snapshots`(1), `SettingsPrivacy`(2), `SettingsAbout`(1), `SettingsFaq`(1), `NutritionTargets`(9), `MealNames`(0), `NutritionEducation`(2), `BodyMetrics`(3), `ProgressPhotos`(5), `WeeklyCheckIn`(2), `CoachOutput`(7), `WeeklyStory`(1), `Methodology`(3), `ShareCard`(8), `CoachHeldHistory`(2), `BlockReflection`(3), `ProGoalSetup`(1), `GoalChangeSummary`(1), `GoalLockConsent`(1), `NotificationSettings`(4), `Import`(1), `CoachingReminders`(4), `WellbeingCheck`(1), `PrivacyPolicy`(2), `DebugLog`(2), `Credits`(1) |
| **MainTabs** — tab bar | `HomeTab`(9), `PlansTab`(4), `DiaryTab`(2), `ProgressTab`(0), `ProfileTab`(2) |

## 2. ANOMALIES

Severity: **P0** crash / dead target · **P1** stranded user or orphan
feature · **P2** duplication or confusing back · **P3** cosmetic / dormant.

### A1 — Widget taps have no click action at all — **P1**

`src/widgets/widgetTaskHandler.js:7-8` states "Tapping a widget opens the app
via the volyume:// deep link." No `clickAction` appears anywhere in
`src/widgets/widgets.js`, `widgetTaskHandler.js`, `plugins/withVolyumeWidget.js`,
`app.json` or `src/lib/widgets/` (`grep -rn clickAction src/ app.json plugins/`
returns nothing). `react-native-android-widget@0.20.3` requires an explicit
per-element `clickAction` (`node_modules/react-native-android-widget/src/api/
private.types.ts:2-3`); there is no documented container default.
OBSERVED: no click action is registered. INFERRED (not verified on device):
both home-screen widgets are inert to tap.

### A2 — Partner invite links are generated but never routed — **P1**

`src/lib/partners/link.js:18-19` mints `volyume://partner/<CODE>` and
`https://volyume.app/partner/<CODE>` and `inviteShareMessage` (line 57) puts the
web link in the share text. `app.json` carries an `autoVerify` intent filter for
`https://volyume.app` `pathPrefix: /partner`. The receiving screen is already
built: `src/screens/PartnerScreen.js:635` reads `route.params.code` through
`parseInviteCode`. But `linking.config` (RootNavigator.js:830-882) has **no
`partner` path**, and there is no `Linking.addEventListener` /
`Linking.getInitialURL` anywhere in `src/` (grep: zero hits). An invited
partner who taps the link opens the app and lands wherever they were; the code
must be typed in by hand on PartnerScreen. The whole word-of-mouth acquisition
path the module header describes is unwired.

### A3 — `volyume://active-workout` is handed to native but unmapped — **P1**

`src/lib/notifications/activeWorkout.js:152` and
`src/lib/notifications/restForeground.js:72,107` pass
`deepLink: 'volyume://active-workout'` into the Android foreground-service /
chronometer notification. `linking.config` has no `active-workout` path, so
`safeGetStateFromPath` → `getStateFromPath` finds no match and returns
undefined; the tap opens the app with no navigation. While the app is alive the
OS restores ActiveWorkout anyway (the same reasoning `notificationRoute.js`
records for `rest_timer`, lines 148-161) — but the FGS path exists explicitly
because it *"survives force-close"* (activeWorkout.js:140-141), and a cold
launch from that notification lands on Today, not the live session.

### A4 — The whole quiz-first pre-account branch is dead, and `Login` with it — **P1**

`src/lib/onboarding/quizFlow.js:24` — `export const ONBOARDING_QUIZ_FIRST = false;`
`WelcomeScreen.getStarted()` (`src/screens/WelcomeScreen.js:74-79`) therefore
never reaches `navigate('QuizTraining')`; it opens the inline `AuthSheet`
instead (line 167). The only edge into `PlanPreview` is `QuizScreen.js:68`, and
the **only** edge into `Login` in the entire tree is `PlanPreviewScreen.js:29`
(`grep -rn "'Login'" src/` returns exactly that line plus the registration at
RootNavigator.js:733). So `QuizTraining`, `PlanPreview` and `Login` are all
unreachable, and `src/screens/LoginScreen.js` contains no navigation call of any
kind. `WelcomeScreen.js:85-88` also carries dead recovery code for "arrived on
the Login route from elsewhere in the app", a state that cannot occur.
Two full screens (Quiz, PlanPreview) plus LoginScreen ship unreachable. The flag
is documented as reversible (quizFlow.js:23), which is why this is P1 not P0 —
but LoginScreen duplicates AuthSheet and is not part of that flag's story.

### A5 — `navigate('PlansTab')` from inside PlansStack after "Save draft" — **P1**

`src/screens/ManualBuilderScreen.js:1012` — after persisting a draft plan the
screen calls `navigation.navigate('PlansTab')`. ManualBuilder is registered only
in `PlansStack` (RootNavigator.js:484), i.e. the user is *already* on that tab.
The NAVIGATE action bubbles to the tab navigator, which is already focused on
`PlansTab` and receives no nested `screen`, so no stack pop is requested.
OBSERVED: the call names the tab the screen already lives in and requests no
pop. NOT VERIFIED statically: whether React Navigation 6's TabRouter leaves the
nested stack untouched here — needs a device walk. If it does, "Save draft"
leaves the user sitting on the builder with only a toast.
Contrast the sibling success path at line 1589, `navigation.navigate('HomeTab')`,
which does change tab but bypasses `navigateCrossTab`, so ManualBuilder stays on
the Train stack and returning to Train re-opens the builder (P2).

### A6 — `returnToTab` / `returnToScreen` params are written and never read — **P2**

`src/screens/MealPlanScreen.js:430-434` jumps to
`ProfileTab/NutritionTargets` with `{ source, returnToTab: 'DiaryTab',
returnToScreen: 'MealPlan' }`. `grep -rn "returnToTab\|returnToScreen"
src/screens/` finds no consumer anywhere. `navigateCrossTab` pops the
destination stack to root first (navigateCrossTab.js:41-47), so after setting
targets the user's Back lands on the Coach tab root (`You`), not the meal plan
they were building. The intent to return is recorded in the params and never
honoured.

### A7 — goBack + `setTimeout` cross-tab jump on an unmounting screen — **P2**

`src/screens/BlockReflectionScreen.js:374-377`:
`navigation.goBack(); setTimeout(() => navigateCrossTab(navigation, 'PlansTab',
'Plans'), 300);`. The screen unmounts at `goBack()`, then 300 ms later the
callback calls `navigation.getParent()` on that route's navigation object. This
is a timing arrangement, not a closed mechanism (CLAUDE.md §4, "a timing patch
is not a fix"): if the pop has not settled the parent lookup can be stale.
The adjacent `onAction` at line 240 does the same jump in one call with no
`goBack`, which is the pattern that cannot race.

### A8 — Three entry points to reminder configuration — **P2**

`SettingsScreen.js:104` → `NotificationSettings` and `SettingsScreen.js:110` →
`CoachingReminders` are **adjacent rows in the same settings section**;
`NotificationSettingsScreen` then links to `CoachingReminders` again, and
`YouScreen.js:586` offers `CoachingReminders` directly, as does
`WeeklyCheckInScreen.js:1589`. Four surfaces, two screens, one concept.

### A9 — "How you train" offered twice, one tap apart — **P2**

`YouScreen.js:516` → `HowYouTrain`, and `YouScreen.js:388` → `Settings`, whose
first row (`SettingsScreen.js:46`) is `HowYouTrain` again. `HowYouTrain` carries
15 inbound edges from 12 files — the highest in the app — and is registered in
five stacks. Reachability is not the problem; the Coach tab offering the same
destination at depth 1 and depth 2 is.

### A10 — Plan-change entry points: five surfaces — **P2**

`PlansScreen.js:77,84,91` build action cards for `PlanUpdate`, `PlanLibrary`,
`ManualBuilder` (dispatched dynamically at line 1732), plus
`PlansScreen`→`MesocycleBuilder` and `PlanDetailScreen`→`ManualBuilder`;
`HomeScreen` and `ConsistencyScreen` also link `PlanLibrary`, and
`HomeChangeWorkoutSheet.js:63` jumps to `PlansTab` with its own nested screen.
Five distinct ways to change what you train, offered from four screens.

### A11 — Injury / limitation split across three screens — **P2**

`HowYouTrain` (settings home), `TrainingConsiderations` (discovery surface, 1
inbound — only from HowYouTrain) and `AvoidedMovements` (2 inbound —
`HowYouTrainScreen` and `PlansScreen` "Plan tools"), with set/clear living on a
fourth surface entirely (`RoutineDetailScreen` exercise long-press, per
RootNavigator.js:487-490). `TrainingConsiderations` is registered in five stacks
for a single inbound edge.

### A12 — Dormant billing: verified unregistered AND unreachable — **P3**

`FULL_ACCESS_FOR_ALL = true` (`src/lib/proGate.js:43`). None of
`ProUpgrade`, `CascadeGate`, `Subscription`, `SubscriptionPolicy`, `ProGate` is
registered in any navigator — confirmed by the extractor (84 route names, none
of them these). Three `navigate()` calls still name unregistered routes:

| Call site | Target | Live? |
|---|---|---|
| `src/components/ProGate.js:85,229,239` | `ProUpgrade` | no importer outside a comment (`grep -rn "components/ProGate"` → RootNavigator.js:225, a comment) |
| `src/components/PostLapseSheet.js:72` | `ProfileTab`/`Subscription` | never imported or rendered anywhere in `src/` |
| `src/screens/ProUpgradeScreen.js:631` | `ProfileTab`/`SubscriptionPolicy` | screen not registered |

All three live in modules that are unreachable from the mounted tree, so no user
can trigger them. They would each be a silent dead tap the moment anything
re-imports those modules. `src/screens/paywallExcerpts.js` (a data module, not a
screen) also survives with only `ProUpgradeScreen` as its consumer.

### A13 — `MealNames` registered with zero inbound — **P3, expected**

`RootNavigator.js:599`, inbound 0. Retained deliberately by founder order
2026-07-13 / D95 (comment at lines 595-598). Not a defect; listed so the
0-inbound count is accounted for.

### A14 — `PlanDetail` deep link cannot open a library plan — **P3**

`volyume://routine/:planId` (RootNavigator.js:858) supplies only `planId`.
`PlanDetailScreen.js:44` destructures `{ planId, isLibrary = false }`, so a
shared link to a library plan renders the owned-plan variant.

## 3. Tab journeys — completion and back

| Flow | Completion | Back / cancel |
|---|---|---|
| Today → BuildWorkout → ActiveWorkout | `replace('ActiveWorkout')` BuildWorkoutScreen.js:182,196 | back skips the builder — correct |
| ActiveWorkout → WorkoutSummary | `replace('WorkoutSummary')` ActiveWorkoutScreen.js:3796 | back skips the session — correct |
| WorkoutSummary → done | `popToTop()` WorkoutSummaryScreen.js:864,1005 | lands on tab root — correct |
| Onboarding → ProSetupComplete | `replace('ProSetupComplete')` ProOnboardingScreen.js:1833 | no back into the wizard — correct |
| ProSetupComplete → app | `completeFirstRun()` (line 214) flips gate 4; navigator re-renders into MainTabs. **No navigation call** — the screen has no explicit exit, the gate is the exit | n/a |
| ProGoalSetup → GoalChangeSummary → You | `replace` (ProGoalSetupScreen.js:531) then `popToTop()` (GoalChangeSummaryScreen.js:202-203) | correct |
| CoachOutput "Got it" | `popToTop()` (CoachOutputScreen.js:2489) | correct |
| WeeklyCheckIn → CoachOutput | `navigate('CoachOutput', {weekStart})` WeeklyCheckInScreen.js:995 — a push, not a replace | see note |
| MealPlan → NutritionTargets | `navigateCrossTab` + unread return params | A6 |
| Food scan chain | `ScanBarcode` →`replace`→ `ScanLabel` →`replace`→ `AddCustomFood`; `AddCustomFood` →`replace`→ `FoodSearch` (AddCustomFoodScreen.js:453) | all `replace`, so stack depth stays 1 and back exits to Diary — no loop |
| BlockReflection → next block | A7 | |
| Article9Consent | no navigation; store flip re-renders the gate (RootNavigator.js:752-754) | gate cannot be skipped |

Note on WeeklyCheckIn: the submit continuation (line 995) pushes rather than
replaces, so hardware/gesture Back from the coach's decision returns to the
check-in route. That route does NOT re-show the wizard — it re-renders as the
"You're all caught up" gate (lines 1617-1637) whose only CTA pushes CoachOutput
again. So Back is survivable but circular, and the in-screen "Got it"
(`CoachOutputScreen.js:2489`) `popToTop()`s past it correctly. **P3**, not the
back-into-a-wizard class.

## 4. Deep links and notifications

All six `linking.config` targets exist in the named tab's stack and every one
tolerates absent params: `BuildWorkout` (no param reads), `Diary`
(`route.params.date`, validated, DiaryScreen.js:160-174), `PlanDetail`
(`planId`, line 44), `Analytics` (`focusWeightTrend` optional, line 165),
`CoachOutput` (`weekStart` defaults to current week, line 928), `WeeklyCheckIn`
(no param reads). **No deep link supplies a param its target requires.**

All 20 `routeForNotificationType` mappings (`src/lib/notifications/
notificationRoute.js`) resolve to routes registered in the tab they name —
verified programmatically; `cascade_gate`, `winback`, `trial_day3`,
`subscription_payment_failure`, `rest_timer` and `rest_end` deliberately return
`null` (treatment B) and are correct under D137.

Unmapped URL surfaces: `partner/<CODE>` (A2) and `active-workout` (A3).

## 5. Not verified statically

- Runtime behaviour of A1 and A5 needs a device walk on an EAS build.
- The four dynamic `navigate()` targets were resolved by reading their data:
  `VolyumeTabBar.js:155` (`route.name`, tab ids), `DiaryScreen.js:1052`
  (`'MyMeals'`/`'MyRecipes'`, lines 1895/1910), `FoodSearchScreen.js:538`
  (`returnTo`, default `'RecipeBuilder'`), `PlansScreen.js:1732` (`card.screen`
  ∈ PlanUpdate/PlanLibrary/ManualBuilder, lines 77/84/91). All registered.
- Component-hosted nav calls were placed by one-hop importer analysis; the
  `navigationRef.navigate('HowYouTrain')` calls in `ExerciseConflictSheet.js:178`
  and `ExercisePickerModal.js:493` were checked by hand — every screen that
  renders them sits in a stack that registers `HowYouTrain`.
- Route params are not type-checked here beyond the deep-link set.
- iOS universal links: `app.json` declares no `associatedDomains`, so the
  `https://volyume.app` prefix is Android-only. Not investigated further.
