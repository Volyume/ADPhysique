# Facts (second wave): navigation, reachability, shortcuts

Raw fact report saved verbatim from a read-only subagent run on 2026-07-09, second-wave ease-of-use hunt (founder request). Evidence for the ease-of-use strengthening pass. Facts only; judgement stays with the main session.

---

TAP COUNTS (cold app open lands on Home tab; counts are physical taps, not typing)

1. **Start today's workout**: Home tab (already there) → tap "Start workout" (`HomeScreen.js` `handleStartNextWorkout`, ~line 1744) → intent prompt modal opens → tap an intent chip or "Skip" (`confirmStart`, line ~2182/2235) → `ActiveWorkout`. **2 taps.** A one-time "Don't ask before each session" opt-out (line 2243) persists to AsyncStorage `@volyume_intent_prompt_off` and drops future starts to **1 tap**. If there's no active plan, an extra "Start with a plan" tap is required first (line 1779).

2. **Log morning weight** (Pro tier only — `TodayStrip` only renders `tier === 'pro'`, line 1626): Home tab → tap "Log" on the Morning-weight row (`WeightEmpty`, `TodayStrip.js` line 183, opens inline edit fields) → type value → tap "Log" submit (line 136). **2 taps** (+ typing). No morning-weight surface exists on Home for free tier.

3. **Log a food to lunch** (Pro; Diary is Pro-gated): tap Nutrition tab (1) → tap "Add" on the Lunch `MealSection` (`DiaryScreen.js` line 1393 → `addFood(slot.key)` → `navigation.navigate('FoodSearch', ...)`, line 750) (2) → tap a search result row, opening the ServingPicker sheet (3) → tap "Add to diary" (`FoodSearchScreen.js` line 13 comment: "Tap a row -> ServingPicker sheet -> 'Add to diary'") (4). **4 taps** (+ typing the search query). A long-press on a row offers a quicker re-log path (comment line 13), skipping the serving picker.

4. **View last session**: Home tab → tap the "Last session" row (`Card` at `HomeScreen.js` line 1924, `onPress={() => navigation.navigate('WorkoutHistory')}`). **1 tap.**

5. **Start the weekly check-in**: tap Coach tab (1) → tap "Weekly check-in" `NavRow` (`YouScreen.js` line 348, `onPress={() => navigation.navigate('WeeklyCheckIn')}`) (2). **2 taps.** If the one-time "Your weekly check-in is ready" nudge banner is showing on Home (line 1990), tapping "Open check-in" is **1 tap** directly from Home.

6. **Log cardio** (Pro): tap Progress tab (1) → tap the `CardioPlanCard` on Analytics, `onPress={() => navigation.navigate('LogCardio')}` (`AnalyticsScreen.js` line 677) (2). **2 taps.** Cardio has no entry point on Home or Plans tabs — `grep` for `navigate('LogCardio')` across `src/` returns exactly two call sites: `AnalyticsScreen.js:677` and `CardioHistoryScreen.js:194`.

SHORTCUT CAPABILITY

- **expo-quick-actions** (long-press icon): exactly 2 items, defined twice — statically in `app.json` (`plugins` → `expo-quick-actions`, lines 130-154, iOS build-time) and dynamically via `QuickActions.setItems()` in `App.js` (~line 489, runs on both platforms, is the only path that registers Android shortcuts since "Android static actions are NOT supported by the plugin," per the code comment). Actions: `workout` = "Start workout" → `volyume://workout/start` → routes to `HomeTab`/`BuildWorkout`; `diary` = "Log food" → `volyume://diary` → routes to `DiaryTab`/`Diary` (`QUICK_ACTION_ROUTES`, `App.js` line 197). No shortcut exists for weight, check-in, or cardio.
- **react-native-android-widget**: 2 widgets in `src/widgets/widgets.js` + `widgetTaskHandler.js` — `NextSession` (routine name, day label, week-in-block chip) and `WeeklyConsistency` ("N of M sessions this week" + streak weeks, falls back to NextSession content under an open ED flag). Both are read-only display; explicitly never show weight/calorie/body data (file header comment). Tapping opens the app via a `volyume://` deep link (comment, `widgetTaskHandler.js` line 7-8) but no widget offers a direct logging action.
- **Deep links**: `RootNavigator.js` `linking` config (lines 681-740) maps `volyume://workout/start`, `volyume://diary/:date?`, `volyume://routine/:planId`, `volyume://progress`, `volyume://coach`, `volyume://checkin` — 6 named paths total, all inside the signed-in tab tree. Separately, `App.js` has a raw `Linking.addEventListener('url', ...)` (line 472) feeding `handleIncomingDeepLink` which handles partner-invite links first, then Supabase auth callback links (PKCE code exchange or implicit-flow tokens, lines 227-267) — a mechanism distinct from the React Navigation `linking` config and from notification-tap routing (a third, separate mechanism in `RootNavigator.js` line 809).

MODAL VS PUSH

- Full-screen `presentation: 'modal'`: `FoodSearch`, `AddCustomFood`, `ScanBarcode`, `ScanLabel`, `LogCardio`, `MyRecipes`, `MyMeals`, `RecipeBuilder`, `ProUpgrade`, `CascadeGate`, `Paywall` (all in `RootNavigator.js`).
- Push with hero-zoom transition: `ActiveWorkout`, `WorkoutSummary`, `PlanDetail`, `RoutineDetail`, `ExerciseDetail` (comment lines 244-253: "the destination fades in while scaling from 0.92 to 1.0").
- Plain push (default): `BuildWorkout`, `WorkoutHistory`, most Settings/Coach screens.
- In-screen bottom-sheet components (not navigator routes at all): `FoodDetailSheet`, `CalorieBankSheet`, `MacroBreakdownSheet`, `QuickAddSheet`, the ServingPicker in `FoodSearchScreen`.
- Inconsistency: creating a new workout (`BuildWorkout`) is a plain push, while creating a new food (`AddCustomFood`) or a new recipe (`RecipeBuilder`) is a modal — two "add new item" flows use different presentations.

BACK BEHAVIOUR

- `grep -r BackHandler src` returns exactly **one** file in the whole app: `ActiveWorkoutScreen.js` (line 692). It intercepts hardware back and calls `handleCancelWorkout()` (line 671): a genuinely empty session (no sets, nothing in progress) discards silently and calls `goBack()`; any logged/in-progress work instead opens a discard-confirm modal (`setShowDiscardModal(true)`).
- Every other screen (`FoodSearchScreen`, `WeeklyCheckInScreen`, `ScanBarcodeScreen`, etc.) has no hardware-back override — Android hardware back falls through to the default stack pop with no confirmation, even mid-multi-step forms (e.g. `WeeklyCheckInScreen` has no `BackHandler`, so answers in progress can be lost silently on back).
- `ManualBuilderScreen.js` deliberately uses a different pattern for destructive taps: long-press-to-remove an exercise has **no** confirm Alert at all (comment line 371: "No 'Are you sure?' Alert, the safety net is the Undo button"), just an 8-second Undo toast.

TAB STATE

- Tabs are lazy (`MainTabs`, comment lines 519-526): each non-initial tab's stack mounts only on first focus; no `unmountOnBlur`/`lazy={false}` found anywhere (`grep` clean, and `src/__tests__/lazyScreens.guard.test.js` pins `lazy={false}`/`lazy: false` as forbidden). So once visited, a tab's scroll/state is preserved across switches by default.
- Each tab stack (`HomeStack`, `PlansStack`, `DiaryStack`, `ProgressStack`, `ProfileStack`) attaches a `tabPress` listener that calls `StackActions.popToTop()` only when `navigation.isFocused()` (re-tapping the already-active tab) — switching tabs never pops.
- Inconsistency: `HomeScreen.js` (line 283) and `PlansScreen.js` (line 133) additionally register their own `tabPress` listener via `navigation.getParent()` that calls `scrollRef.current?.scrollTo({y:0})` with **no** `isFocused()` guard — so switching *into* Home or Plans always resets scroll to top, every time. `DiaryScreen.js` instead has a scroll-position-restore mechanism (line 804-809, restores a remembered `y`). `YouScreen.js` (Coach tab) has neither `scrollRef` nor `useScrollToTop` — no scroll-to-top or restore behaviour at all, the only one of the five tab roots without one.

5 STRONGEST FACTS
1. All five tab stacks share one consistent NAV-5 re-tap-to-root convention (pop only on re-press of the already-focused tab), applied uniformly.
2. Both platform-native shortcut surfaces (quick actions + widgets) are ED-safety-conscious by design: quick actions carry no weight/food-logging bypass beyond opening the diary root, and widgets explicitly never surface weight/calorie/body data.
3. Deep-linking is layered cleanly into three non-overlapping mechanisms (React Navigation `linking` config, raw `Linking` auth/partner handler, notification-tap routing) rather than one tangled handler.
4. `ActiveWorkoutScreen`'s hardware-back handling is deliberately tiered: silent discard only for a truly empty session, confirm modal for any real progress.
5. "Last session" and "view last workout" is a single tap from a cold Home open, no tab switch required.

5 FRICTION FACTS
1. Logging a single food item to a meal takes 4 taps minimum (tab, Add, result row, Add-to-diary) plus a text search — the longest of the six sampled paths.
2. Cardio logging has zero entry points on Home or Plans; it's reachable only through Progress → Analytics, a tab a user might not associate with logging an activity.
3. Only 1 of 82 screens overrides hardware back for confirmation (`ActiveWorkoutScreen`); every other multi-step flow (e.g. the weekly check-in) can be backed out of silently with no warning.
4. Home and Plans force a scroll-to-top on every tab switch into them (no `isFocused()` guard), while Diary preserves scroll position and Coach has no scroll-position handling at all — three different behaviours for the same gesture across the five tabs.
5. Quick actions and widgets only cover 2 of the 6 sampled actions (start workout, open diary); there is no shortcut for weight logging, check-in, or cardio despite those being sampled as common daily actions.
