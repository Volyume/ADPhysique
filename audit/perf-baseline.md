# Volyume performance baseline (P6 Phase 1 skeleton)

Date: 2026-07-02. Measured at HEAD `db57532` (branch `claude/codebase-audit-docs-pv6mjd`).
Static analysis plus a real Metro export in this environment. Cold-start, frame and ANR
numbers CANNOT be measured here (no device, no emulator); those sections are templated
as "RUN ON DEVICE" with exact commands. Every measured claim carries file:line or
command evidence.

Budgets requested by the founder brief: crash-free sessions >= 99.5%, ANR <= 0.47%.

---

## 1. Startup work audit (measured statically)

### 1.1 App.js: module scope, before any React render

Everything below runs synchronously when the JS bundle evaluates `App.js`, before the
first frame:

| # | Work | Evidence |
|---|------|----------|
| 1 | `installGlobalHandlers()` (error ring buffer wiring) | `App.js:21` |
| 2 | `initSentry({})` via inline `require('./src/lib/sentry')` | `App.js:27-34` |
| 3 | `tryWireRealProvider()` (lazy-loads react-native-iap) | `App.js:41-45` |
| 4 | `TaskManager.defineTask(VOLYUME_REST_TIMER_KEEPALIVE, ...)` | `App.js:54-60` |
| 5 | `TaskManager.defineTask(VOLYUME_DAILY_SYNC, ...)` | `App.js:72-90` |
| 6 | `Notifications.setNotificationHandler(...)` | `App.js:94-106` |

There are NO top-level awaits; module scope is registration only. The heavy screen
graph is deliberately NOT imported here (comment at `App.js:108-113`).

### 1.2 App.js: the single render gate

The whole UI is gated on one async op: `bootstrapAccessibility()` (reads a11y prefs
from storage, mutates theme tokens), then `setThemeReady(true)` in `finally`
(`App.js:402-406`, function at `App.js:125-138`). Until it resolves the app renders a
bare dark `<View>` (`App.js:877-882`). After the gate, `RootNavigator`, `PRCelebration`,
`ToastProvider`, `FeedbackProvider`, `AppAlertHost`, `PostLapseSheetHost` are
lazy-required inside the render body (`App.js:886-899`), which synchronously evaluates
the navigator module (but no longer the 82-screen graph, see 1.3).

### 1.3 App.js: mount effects (side effects after first render, none block paint)

| Effect | What it does | Evidence |
|--------|--------------|----------|
| `bootObservability()` | session id, crash detection | `App.js:412-418` |
| `loadAccessibility()` / `loadPrivacyPrefs()` | store hydration | `App.js:423-431` |
| `loadMealLabelOverrides()` | meal-slot names cache | `App.js:436` |
| live-activity `endAllActivities()` | iOS only, guarded require | `App.js:448-454` |
| `Linking.getInitialURL()` + url listener | deep links | `App.js:460-464` |
| expo-quick-actions `setItems` + listeners | launcher shortcuts | `App.js:474-501` |
| `Updates.checkForUpdateAsync()` (prod only) | OTA check, network | `App.js:505-527` |
| `ensureNotifChannels()` + response listener | Android channels | `App.js:532-543` |
| `BackgroundFetch.registerTaskAsync` (~12 h) | daily sync task | `App.js:551-563` |
| `maybeSync()` on mount + AppState listener | cold-start sync round: `getSession`, `syncAll`, `drainSyncQueue`, health weight import, steps record/backfill, feedback flush, Year-of-Lifts + monthly-recap SELECTs, telemetry | `App.js:570-776` (mount call at `App.js:774`) |
| `callSyncAll` triggers: foreground, NetInfo reconnect, 15-min interval | `App.js:785-875` (interval at `App.js:867`) |

The `maybeSync` round is the single largest cold-start background workload: two
workout-count SELECTs run on every launch for a signed-in user (`App.js:677-709`)
in addition to the full `syncAll` push+pull.

### 1.4 RootNavigator bootstrap (runs while splash is up)

`bootstrap()` effect (`src/navigation/RootNavigator.js:775-942`):

1. `checkFirstRun()` / `checkTier()` start immediately (AsyncStorage only,
   deliberately before DB init, comment at :778-784).
2. `await initDatabase()` (:793) is the only awaited DB work on the splash path
   (SQLCipher open + `PRAGMA user_version` migrations).
3. Fire-and-forget after DB open: `seedExercisesIfNeeded` (449 inserts on first
   install, `src/lib/seedExercises.js:376-906`, count verified 449 by script) then
   `topUpNewExercisesIfNeeded` then metadata backfill/rederive (:794-798),
   `cleanupOrphanRoutineExercises` (:799), OpenFoodFacts UK snapshot import
   (~100k+ rows, 6.3 MB asset `assets/seed/off_uk_snapshot.dat`, :805-810), CoFID
   import (~3k rows, 640 KB asset, :811-817), food library delta pull (:818-826).
4. `await tierPromise` (:840), then `getSession()` (:845), profile hydrate from
   AsyncStorage (:858-875), `refreshTierFromCloud` + entitlement reconcile
   (:880-882), `playBilling.initialise` (:889-893), `setAuthLoading(false)`.

### 1.5 Eager-mounting truth at HEAD (dossier correction)

The dossier's "lazy={false} / 108 registrations" is STALE. Wave 4 F6b landed:

- All screens are wrapped in `lazyScreen(() => require(...))`, which defers module
  evaluation to first render: factory at `RootNavigator.js:47-57`, rationale comment
  at :29-46. Count: 81 `lazyScreen(` wrappers (command:
  `grep -c 'lazyScreen(' src/navigation/RootNavigator.js` returns 81).
- Registrations at HEAD: 97 `Stack.Screen name=` + 5 `Tab.Screen name=` = 102
  (same grep method; screens registered in multiple stacks account for 97 > 81).
- The Tab.Navigator carries NO `lazy` prop (`RootNavigator.js:500-545`); tabs are
  default-lazy in react-navigation v7. The F6b comment at :501-509 records that the
  old `lazy={false}` was removed and non-initial tabs now mount on first focus.
  HomeTab (Train) is the initial tab and mounts immediately (:509, :546).
- Guard: `src/__tests__/lazyScreens.guard.test.js` pins no static screen imports,
  no `lazy={false}` respelling, and `initial: false` on nested cross-tab navigates.
- Note: `lazyScreen` defers evaluation, not download; Metro ships one bundle, so
  every screen's bytes are still in the 7.67 MB .hbc (section 3).

### 1.6 Splash floors (constants found and quoted)

`src/navigation/RootNavigator.js:676-681`:

```js
const SPLASH_MIN_MS = 1600;
// A returning, already-set-up user doesn't need the full brand-splash hold —
// the real readiness gate (firstRunChecked && tierChecked) keeps the splash up
// only as long as bootstrap actually needs. This short floor (anti-flash only)
// releases them ~1.2s sooner than the first-install ceiling above.
const SPLASH_MIN_FLOOR_MS = 350;
```

Usage: 1600 ms ceiling timer at :722; the 350 ms floor releases returning users once
`firstRunChecked && tierChecked && firstRunComplete` (:730-736). The splash component
renders while `!splashReady || !firstRunChecked || !tierChecked` (:1330-1332) and
again while consent is unresolved for a new signed-in user (:1383-1385).

---

## 2. Long-list inventory

No FlashList anywhere: `grep -n 'flash-list' package.json` returns nothing, and the
only virtualised-list imports are RN `FlatList`/`SectionList` (grep across `src/`
found 36 occurrences in 15 files). None of the vertical lists below set
`getItemLayout`, `initialNumToRender`, `windowSize` or `removeClippedSubviews`
(greps per file returned only `keyExtractor`).

| Surface | Implementation | keyExtractor | getItemLayout | Item scale | Evidence |
|---|---|---|---|---|---|
| WorkoutHistory | FlatList | yes (`item.workout.id`) | no | capped at 50 most recent (LB-7 page) | `src/screens/WorkoutHistoryScreen.js:632-634`, cap at :65-67 |
| FoodSearch suggestions | FlatList | yes (composite) | no | ~12 suggestions + 50 favourites scan | `src/screens/FoodSearchScreen.js:709-713`, :143, :242 |
| FoodSearch results | FlatList | yes (`i.key`) | no | `searchFoods` limit 25 (`src/lib/food/waterfall.js:118`) | `src/screens/FoodSearchScreen.js:850-852`, :274 |
| YearOfLifts deck | FlatList horizontal, `pagingEnabled` | index-based | YES (fixed SCREEN_W) | ~10 story cards | `src/screens/YearOfLiftsScreen.js:614-626` |
| Diary day view | ScrollView (whole day in one scroll), day pager is prev/next buttons, not a swipe pager | n/a | n/a | 10-20 entries/day typical (comment :130-131) | `src/screens/DiaryScreen.js:765-966`, pager row :777-794 |
| ExercisePicker (modal) | FlatList over FULL library, no render cap | yes (`String(e.id)`) | no | 449 seeded + custom, unfiltered initial render | `src/components/ExercisePickerModal.js:241-243`, load :48-51, filter :54-60 |
| BuildWorkout picker | FlatList, capped at `PICKER_RENDER_CAP = 80` after filter | yes (`e.id`) | no | <= 80 rendered of 449 | `src/screens/BuildWorkoutScreen.js:181-186`, :411-413 |
| PlanLibrary | FlatList x2 (categories + plans) | yes | no | dozens of plans | `src/screens/PlanLibraryScreen.js:411-414, 454-457` |
| Progress (Analytics) | ScrollView + mapped cards, NOT virtualised | n/a | n/a | bounded card count, but fed by unbounded `allSets` (section 4) | `src/screens/AnalyticsScreen.js:299-645` |
| LiftProgress | FlatList | yes (`exerciseId`) | no | one row per trained exercise (tens to ~100) | `src/screens/LiftProgressScreen.js:291-293` |
| CardioHistory | SectionList | yes (`item.id`) | no | grows with sessions, unbounded | `src/screens/CardioHistoryScreen.js:175-177` |
| ActiveWorkout exercise list (modal) | FlatList | yes | no | session-sized (<20) | `src/screens/ActiveWorkoutScreen.js:3063-3065` |
| RoutineDetail | FlatList x2 | yes | no | routine-sized | `src/screens/RoutineDetailScreen.js:319-321, 597-599` |
| MyMeals / MyRecipes / ProgressPhotos / MesocycleBuilder | FlatList each | yes | no | user-data sized, unbounded | `MyMealsScreen.js:180-182`, `MyRecipesScreen.js:200-202`, `ProgressPhotosScreen.js:232-235`, `MesocycleBuilderScreen.js:138-142` |

Biggest static list risk: ExercisePickerModal mounts a 449-row FlatList with default
virtualisation settings and no cap (BuildWorkoutScreen's sibling picker already has
the 80-row cap pattern to copy).

---

## 3. Bundle analysis (MEASURED in this environment)

Commands run (both completed, exit 0):

```
npx expo export --platform android --source-maps --output-dir <dir>            # production-like (Hermes)
npx expo export --platform android --source-maps --no-bytecode --output-dir <dir2>  # plain JS for source-map-explorer
npx source-map-explorer index-<hash>.js index-<hash>.js.map --no-border-checks --json out.json
```

Results:

- Production Hermes bundle: `index-1b232fdf...hbc` = 7.67 MB (+ 23.3 MB map).
- Plain-JS equivalent (for attribution): 8.02 MB (+ 26.5 MB map).
- source-map-explorer needed `--no-border-checks` (Metro emits an Infinity-column
  mapping that fails its validation) and left 741,597 bytes (9.25%) unmapped;
  treat per-module numbers as floors.

### Top 20 modules/packages by mapped size (plain-JS bytes)

| KB | Module |
|---:|---|
| 1186.4 | app: src/screens (82 screens) |
| 1184.0 | app: src/lib |
| 724.2 | [unmapped] |
| 685.0 | react-native-reanimated |
| 681.0 | react-native |
| 267.1 | @sentry/core |
| 267.0 | @shopify/react-native-skia |
| 232.1 | app: src/components |
| 194.9 | @sentry/react-native |
| 170.3 | date-fns |
| 140.7 | [no source] |
| 130.5 | @sentry-internal/replay |
| 124.4 | @supabase/auth-js |
| 111.8 | react-native-gesture-handler |
| 111.3 | react-reconciler |
| 109.0 | react-native-svg |
| 81.8 | expo |
| 78.4 | @sentry/browser |
| 67.1 | react-native-worklets |
| 63.9 | react-native-iap |

(Next: @react-native/virtualized-lists 52.3, @sentry-internal/feedback 49.0,
@react-navigation/stack 47.1, @react-navigation/core 46.5,
react-native-vision-camera 45.8.)

### Largest individual source files in the bundle

`src/lib/database.js` 172.3 KB, `src/lib/formTips.js` 129.2 KB,
`src/lib/seedRoutines.js` 98.9 KB, `src/screens/ActiveWorkoutScreen.js` 87.0 KB,
`src/screens/HomeScreen.js` 60.7 KB, `src/screens/CoachOutputScreen.js` 58.8 KB,
`src/lib/planEngine.js` 50.8 KB, `src/lib/seedExercises.js` 46.6 KB.

### Immediate observations (no action taken, Phase 2 candidates)

1. Sentry family totals ~720 KB JS incl. `@sentry-internal/replay` (130.5 KB),
   `@sentry/browser` (78.4 KB) and `@sentry-internal/feedback` (49.0 KB): browser
   replay/feedback code in a native app bundle looks like an import-path or
   tree-shaking issue worth a Phase 2 look.
2. `@expo/vector-icons` ships every vendor font as assets; only Ionicons is used by
   the tab bar (`RootNavigator.js:542`). MaterialCommunityIcons.ttf alone is 1.31 MB,
   FontAwesome6_Solid 424 KB, Fontisto 314 KB (export log). APK-size, not JS-size.
3. `date-fns` at 170.3 KB suggests non-tree-shaken imports.
4. Seed data compiled into JS: seedRoutines 98.9 KB + seedExercises 46.6 KB +
   formTips 129.2 KB evaluate whenever their importers load.

Founder-runnable repro (identical commands):

```
npx expo export --platform android --source-maps --output-dir dist
npx expo export --platform android --source-maps --no-bytecode --output-dir dist-js
cd dist-js/_expo/static/js/android
npx source-map-explorer index-*.js index-*.js.map --no-border-checks --html bundle.html
```

---

## 4. JS-thread hot spots (static identification only)

### 4.1 JS-driven animations at HEAD

Repo-wide grep for `useNativeDriver: false` returns exactly two sites:

- `src/screens/YearOfLiftsScreen.js:484`: story progress bar animates width % on the
  JS thread for the full 5 s per card (`STORY_MS = 5000` at :40, loop :475-489).
  Contained to the Year of Lifts deck.
- `src/components/food/MacroRings.js:222`: ring fill animates a non-native prop over
  `motion.hero` (440 ms, `src/styles/theme.js:606`) on every Diary/summary render of
  the rings.

Everything else animates with `useNativeDriver: true` or Reanimated (UI thread).

### 4.2 Recurring JS timers

- Rest timer: 1 s `setInterval` calling `tickRestTimer()` (a Zustand `set` every
  second) while resting (`src/components/RestTimer.js:62`, store tick at
  `src/store/useAppStore.js:1458`). F7 narrowed subscriptions, but every store tick
  still runs subscriber selectors each second of every rest.
- Workout elapsed clock: 1 s `setInterval` (`src/screens/ActiveWorkoutScreen.js:679`)
  for the whole session.
- Hold-to-adjust repeat: 200 ms interval while pressed (`RestTimer.js:191`).
- App-wide: 15-min `syncAll` interval (`App.js:867`).

### 4.3 Log-set path (call chain traced)

`handleLogSet` in `src/screens/ActiveWorkoutScreen.js:1089-1234`:
haptic (:1091-1092) -> `await createWorkoutSet` (async SQLite insert plus one
`getFirstAsync` name lookup, `src/lib/database.js:2179-2197`) -> state updates + audit
(:1135-1143) -> `detectPR` synchronously scans `allTimeSets` (every completed set ever
for that exercise, loaded at exercise focus via `getAllCompletedSetsForExercise`,
:830-839) plus session sets (:1155-1163) -> rest-timer start (:1207-1209).
Cloud push is debounced 2 s off this path (`_SYNC_DEBOUNCE_MS = 2_000`,
`src/lib/sync.js:487,501-513`). No synchronous SQLite API anywhere: grep for
`getFirstSync|getAllSync|runSync|execSync` across `src/` returns zero matches, so DB
work is async but resolves on the JS thread; the synchronous CPU cost here is the
`detectPR` scan, linear in per-exercise history (fine at hundreds of sets, worth
watching at thousands).

### 4.4 Diary open

`load()` at `src/screens/DiaryScreen.js:99-153`: 9 parallel queries (entries, rollup,
water, targets, training-day, refeed date, ED flag, body weight, body comp) then an
N+1 `resolveFoodRef` per entry (:132-143, self-described as fine for 10-20 entries).
A second effect loads suggestions per meal slot (:393-401). Bounded per day; the
biggest cost is breadth (number of awaits), not depth.

### 4.5 Progress open

`useProgressData.load()` (`src/hooks/useProgressData.js:97-140`) runs on EVERY tab
focus (`useFocusEffect`, :95) and loads `getCompletedWorkoutSets(user.id)`: every
completed set the user has ever logged, unbounded (:100-104). The full `allSets`
array is then re-scanned synchronously multiple times: 4-week tonnage filter loop
(:157-170), volume snapshot, deload check, PR bars, muscle frequency (:122-134), and
again in AnalyticsScreen memos (`buildWeeklyLoadSeries`, session counts, lifetime
reps loop at `src/screens/AnalyticsScreen.js:226-259`). This is the clearest
scale-with-tenure JS-thread hotspot in the app: a 3-year daily lifter approaches
~10k-set arrays scanned ~8 times per Progress focus.

### 4.6 Home (initial tab) mount

HomeScreen (Train) mounts at boot as the initial tab; its focus loads run several
`Promise.all` query batches (`src/screens/HomeScreen.js:306-460, 666-676`). Not
enumerated further here; flagged because it shares the splash-adjacent window with
section 1.4's bootstrap work.

---

## 5. Play vitals monitoring (what the repo says)

- Alert threshold on record: "Crash-free session rate below 99.5%: alert."
  (`docs/PRODUCTION_READINESS_LOCKED.md:110`).
- Play-side runtime budgets on record: "Crash <1.09%, ANR <0.47%, cold start <5 s,
  frozen frames <0.1% are runtime metrics. Read them from the Play Console
  pre-launch report + Android Vitals after the first internal-track upload."
  (`docs/playstore-readiness-2026-06-06/playstore-05-performance-crash-audit.md:47-50`).
- Manual-process docs: watch Android Vitals during the internal cycle
  (`docs/SUBMISSION_CHECKLIST.md:168`), pre-launch report reading
  (`docs/playstore-readiness-2026-06-06/DOCUMENT-B-manual-actions.md:71`), crash-free
  daily panel from Sentry (`docs/TELEMETRY_DASHBOARDS_LOCKED.md:238-244`).
- Automation: NONE. No workflow in `.github/workflows/` touches Play vitals or ANR
  (grep across workflows matched only incidental comment text). Monitoring is
  founder-manual via Play Console plus Sentry.
- Founder budgets for this baseline: crash-free >= 99.5% (matches the locked doc),
  ANR <= 0.47% (matches Play's bad-behaviour threshold quoted in playstore-05).

RUN ON CONSOLE: Play Console -> Quality -> Android vitals -> Overview. Record:
crash rate, user-perceived crash rate, ANR rate, user-perceived ANR rate for the
last 28 days, plus cold/warm/hot start times if reported. Paste into section 6.

---

## 6. Device-required measurements (TEMPLATE, cannot be measured in this environment)

This environment has no Android device or emulator, so cold start, frames and real
ANR data are unmeasurable here. Run these on a physical Android device against a
release-mode EAS build (this app has custom native modules, so Expo Go is not
representative).

### 6.1 Cold start (RUN ON DEVICE)

```
# Kill the app fully, then measure a true cold start:
adb shell am force-stop com.volyume.app
adb shell am start -W -n com.volyume.app/.MainActivity
# Record: ThisTime / TotalTime / WaitTime (ms). Repeat 5x, take median.
```

Notes: confirm the package/activity with
`adb shell cmd package resolve-activity --brief com.volyume.app`. `TotalTime` is
process start to first frame of the activity; the JS splash (section 1.6) sits on
top of it, so also record time-to-interactive by screen recording
(`adb shell screenrecord`) and counting frames from icon tap to the Train screen
being tappable. Expected splash floor: 1600 ms first install, 350 ms returning
(RootNavigator.js:676,681).

| Metric | Cold (first install) | Cold (returning) | Warm |
|---|---|---|---|
| am start TotalTime | RUN ON DEVICE | RUN ON DEVICE | RUN ON DEVICE |
| Tap-to-interactive (video) | RUN ON DEVICE | RUN ON DEVICE | RUN ON DEVICE |

Optional deeper trace: Perfetto (`adb shell perfetto ...` or ui.perfetto.dev) with
the app startup track, or add `reportFullyDrawn()` via an Expo config plugin in a
later phase. Sentry app-start spans exist but at `tracesSampleRate: 0.05`
(CLAUDE.md, `src/lib/sentry.js`) they sample 1 in 20 sessions; fine for population
medians, useless for single-run measurement.

### 6.2 Frame health per surface (RUN ON DEVICE)

```
adb shell dumpsys gfxinfo com.volyume.app reset
# ... drive the surface for ~30 s (scroll WorkoutHistory, swipe YearOfLifts,
#     open Progress, type in ExercisePicker search) ...
adb shell dumpsys gfxinfo com.volyume.app
# Record: Total frames, Janky frames %, 90th/95th/99th percentile.
```

Surfaces to test (from section 2): ExercisePickerModal open + scroll (449 rows),
Progress tab focus with a large history, WorkoutHistory scroll, FoodSearch typing,
Diary day switch, YearOfLifts deck (JS-driven progress bar), rest timer running
during a workout (1 s store ticks).

| Surface | Janky % | P95 frame (ms) | Notes |
|---|---|---|---|
| ExercisePicker scroll | RUN ON DEVICE | RUN ON DEVICE | |
| Progress open (big history) | RUN ON DEVICE | RUN ON DEVICE | |
| WorkoutHistory scroll | RUN ON DEVICE | RUN ON DEVICE | |
| FoodSearch typing | RUN ON DEVICE | RUN ON DEVICE | |
| Diary day switch | RUN ON DEVICE | RUN ON DEVICE | |
| YearOfLifts deck | RUN ON DEVICE | RUN ON DEVICE | |
| Active workout + rest timer | RUN ON DEVICE | RUN ON DEVICE | |

### 6.3 Screen-open latency (RUN ON DEVICE)

Stopwatch or screen-recording frame counts, cold per screen (first open after boot,
so lazyScreen module evaluation is included) and warm (second open):
Diary open, Progress open, WorkoutHistory open, FoodSearch open, ExercisePicker open.
Record cold vs warm to expose the one-off lazyScreen evaluation cost F6b moved out
of boot.

### 6.4 ANR / vitals (RUN ON CONSOLE)

See section 5. Paste the 28-day numbers here and compare to budgets
(crash-free >= 99.5%, ANR <= 0.47%).

---

## 7. Honest limitations of this baseline

- No runtime numbers of any kind were produced here; sections 1, 2 and 4 are static
  truth at `db57532`, section 3 is a real Metro export from this checkout.
- The plain-JS bundle used for attribution is 4.5% larger than the shipping Hermes
  .hbc; per-module shares are indicative, not exact, and 9.25% of bytes are unmapped.
- `expo export` bundles for the JS engine only; APK/AAB size (native libs, fonts,
  the 6.3 MB OFF snapshot asset) needs an EAS build:
  `eas build -p android --profile production` then inspect the AAB with bundletool.
- Item-count scales in section 2 marked "unbounded" grow with user tenure and were
  not verified against a real user database.
