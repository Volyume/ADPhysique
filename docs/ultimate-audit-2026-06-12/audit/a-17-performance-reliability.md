# A-17 — Performance & Reliability (internal audit, code-verified)

Audit agent 17, ULTIMATE-APP MANDATE. Branch `claude/admiring-bohr-2kb7pd`.
All findings carry file:line evidence and were verified against the real code
with no internet. No code was changed. British English throughout.

Scope: cold-start path, SQLite at scale, sync-layer performance, bundle/asset
weight, memory/list patterns, error/crash surfaces, offline completeness, test
infrastructure health, OTA mechanics.

---

## 0. HOT-PATH VERDICTS (read first)

| Hot path | Verdict | Evidence |
|---|---|---|
| Cold start → first frame | **GOOD, with a synchronous module-scope tail** | `App.js:19,27-31,41-42` run before React mounts; theme-gate renders a bare `View` until a11y prefs load (`App.js:356-358,791-796`) |
| Food search / barcode lookup | **WEAK AT SCALE — the one true bottleneck** | `%q%` leading-wildcard LIKE over a ~100k-row table with no usable index/FTS (`localCache.js:23,33`; `seed.js:60`; 6.5 MB `off_uk_snapshot.dat`) |
| Workout history list | **GOOD** | full fetch but JS-sliced to 50, paged sets fetch, `FlatList` (`WorkoutHistoryScreen.js:60-95,632`) |
| Progress / analytics tab | **HEAVY — unbounded 2-year scan into JS on every focus** | `getCompletedWorkoutSets` whole-history + `computePRsPerWeek` per-exercise sort/walk (`useProgressData.js:95,100-104`; `useProgressData.js:23-61`) |
| Home / daily loop | **GOOD** | windowed set reads (`getWorkoutSetsSince` 1–4 wk) (`HomeScreen.js:601,704`); only `getAllWorkouts` is full-history |
| Active workout logging | **GOOD — already optimised** | `React.memo` rows + shallow store selector kill the per-second re-render storm (`ActiveWorkoutScreen.js:70,97-100`) |
| Sync round (offline→online) | **GOOD** | single in-memory run-lock, watermark-incremental, 200-row chunks, backoff queue (`runner.js:23,79-82`; `syncQueue.js:27`) |

---

## 1. WHAT — the hot paths as implemented

### 1.1 Cold-start path (`App.js`)
Three things run **synchronously at module scope before any React render**:
- `installGlobalHandlers()` — `ErrorUtils.setGlobalHandler` + unhandled-rejection
  ring buffer (`App.js:19`, `errorLog.js:273-277`).
- Sentry init, lazy-required (`App.js:27-31`).
- `tryWireRealProvider()` — lazy-loads `react-native-iap`, no-ops if unlinked
  (`App.js:41-42`).
Two `TaskManager.defineTask` registrations (rest-timer keepalive, daily sync)
and the notification handler are also module-scope (`App.js:52,70,92`).

The component **gates first paint on accessibility prefs**: `bootstrapAccessibility()`
reads `loadA11yPrefs()` and mutates theme tokens, and until `themeReady` flips,
the app renders a bare `#0D0D0D` `View` matching the splash (`App.js:356-358,
791-796`). Only **after** that does it lazy-`require` the entire screen graph —
`RootNavigator`, `PRCelebration`, `ToastProvider`, `FeedbackProvider`,
`AppAlertHost`, `PostLapseSheetHost` (`App.js:802-813`). This deferral is
deliberate: every screen's `StyleSheet.create` must see post-a11y tokens.

**Deferred / async (post-mount `useEffect`s):** observability boot
(`App.js:364-370`), a11y + privacy store hydration (`375-383`), watch bridge
(`387-392`), stale Live-Activity cleanup (`404-410`), deep-link handler
(`415-419`), OTA check (`423-445`), notif channels (`450-461`), background-fetch
registration (`469-481`), and the two sync effects (`488-690`, `699-789`).
A `maybeSync()` fires once on mount (`App.js:688`).

`index.js` is the Expo entrypoint; DB init is lazy via `initDatabase()` on first
`db()` call, not at boot (`database.js:59-72`).

### 1.2 SQLite at scale (`src/lib/database.js`, 6,459 lines)
- Single handle, **WAL journal mode** (`database.js:75-76`).
- **60 indices** across the schema (counted: `grep -c "CREATE INDEX|CREATE UNIQUE INDEX"`
  = 60). Hot tables are covered: `idx_workouts_user`, `idx_workout_sets_workout`,
  `idx_workout_sets_user_created`, `idx_food_entries_user_date_slot`,
  `idx_food_entries_user_recent`, `idx_body_log_user(user_id, logged_at)`, etc.
  (`database.js:186-190,773-774,848-849,272`).
- `user_version`-driven migrations, each run once, WAL-checkpointed before
  snapshot copy (`database.js:284,1355,1368,1400`).
- A transaction tail-chain serialises writes because expo-sqlite's
  `withTransactionAsync` is **not** exclusive (`database.js:1415-1433`).
- One in-memory read cache: `_allExercisesCache` (the exercise library, near-static),
  invalidated on every exercise write (`database.js:1448-1459,1529,5690`). Screens
  do **not** query SQLite directly — they go through `database.js` / `food/db.js`
  (architecture rule honoured; `grep getAllAsync` on screens = 0).

### 1.3 Sync layer (`src/lib/sync.js` 1,786 ln, `src/lib/sync/*`)
- Four triggers (foreground, network-reconnect, debounced-write, 15-min periodic)
  all route through `syncAll()` behind a **single boolean run-lock** that skips
  re-entrant calls (`runner.js:23,79-82`; App wiring `App.js:699-789`).
- Push is **watermark-incremental** per table and **chunked at 200 rows** for
  upserts / 10 for workouts (`sync.js:408-409,633`; watermark import
  `sync.js:53`).
- **Conflict resolution** is a real dispatcher (`sync/conflict.js`): `last_write_wins`
  (default, `updated_at` compare), `server_wins`, and per-column `merge` for
  profiles via a `column_updates_at` jsonb map (`conflict.js:32-59,86-102`).
- **Retry queue** `pending_sync_ops` with exponential backoff
  `[0, 1m, 5m, 30m, 2h, 8h]`, max 6 attempts, drained on foreground
  (`syncQueue.js:27,72-80,119-128`).
- Daily background sync via `expo-background-fetch` (~12 h target),
  foreground/background flush on every AppState change (`App.js:70-88,469-481,
  642-690`).

### 1.4 Bundle / asset weight
- **No heavy charting library.** Charts are hand-rolled: `Sparkline`,
  `SvgBarSparkline`, `VolumeBars`, `VolyumeChart`, `BodyDiagramHeatmap`
  (`src/components/`). `react-native-svg` imported by only **6** files.
- **Skia** (`@shopify/react-native-skia`) used in exactly **one** runtime
  component: `food/MacroRings.js`. Minimal blast radius.
- `transform-remove-console` strips `console.*` (keeps error/warn) in production
  bundles (`babel.config.js:11-15`).
- Largest shipped asset is the food snapshot: `assets/seed/off_uk_snapshot.dat`
  **6.5 MB** + `cofid_uk.dat` 654 KB (seeded into SQLite on first run, `seed.js`).

### 1.5 Error / crash surfaces
- **One** `ErrorBoundary`, at the app root (`App.js:198-243,816`). Catches via
  `getDerivedStateFromError`, logs to ring buffer + legacy single-slot crash log,
  shows a self-contained crash screen using literal hex (so a theme-layer crash
  can't re-crash the recovery screen — `App.js:245-261`).
- **Global handlers:** `ErrorUtils.setGlobalHandler` + unhandled-rejection capture
  installed at module scope (`errorLog.js:273-277`).
- **Crash detection:** clean-shutdown flag pattern — `@volyume_clean_shutdown_v1`
  set true on boot, flipped false on graceful background; a true flag at next
  boot means the prior session died (`observability.js:131-189`). Surfaces a calm
  "crashed last session, report sent" toast (`App.js:268-306`).
- Sentry owns crash/error transport with its own offline buffer (`App.js:546`).

### 1.6 OTA mechanics
- `expo-updates` present; `App.js:423-445` checks once on mount, production only,
  silent download + "Restart to apply" alert.
- `runtimeVersion.policy: "appVersion"` (`app.json:13-15`) — OTA payloads only
  apply within the same `version` string (1.2.0); a native dependency bump forces
  a store build. New Architecture enabled (`app.json:19`).

---

## 2. WHERE — bottleneck candidates (measured statically)

1. **Food search = full scan of ~100k rows, no usable index** *(highest impact)*.
   `searchLocalByName` runs `WHERE lower(name) LIKE '%q%'` (leading wildcard,
   `localCache.js:23,33,46`) against the `foods` table seeded from a 6.5 MB OFF
   snapshot (~100k+ rows per `seed.js:60`). The only name index is
   `idx_foods_name_lower ON foods(lower(name))` (`database.js:805`), which a
   **leading** wildcard cannot use — SQLite falls back to a full table scan plus
   an in-memory `ORDER BY rank, verified, lower(name)` sort, on **every keystroke
   batch** (250 ms-debounced, `FoodSearchScreen.js:215`). **No FTS5 table exists**
   (grep for `fts`/`MATCH`/`VIRTUAL TABLE` = none).

2. **Progress tab = unbounded 2-year scan into JS, every focus.**
   `useProgressData.load()` runs on `useFocusEffect` and calls
   `getCompletedWorkoutSets(user.id)` — *every set from every completed workout,
   ordered, mapped to camelCase* (`useProgressData.js:95,100-104`;
   `database.js:1724-1734`). It then feeds `computePRsPerWeek`, which groups all
   sets by exercise, **sorts each group**, and walks them for a running-max 1RM
   (`useProgressData.js:23-61`). Eight surfaces share this unbounded loader:
   ReadinessCards, EngineLog, useProgressData, MesocycleBuilder, CoachReview,
   WorkoutSummary, VolumeHeatmap, LiftProgress (grep, §3). A bounded sibling
   already exists for the Home path (`getWorkoutSetsSince`, `database.js:1742`),
   but the analytics surfaces don't use it.

3. **`getAllWorkouts` full-history fetch on common screens.** Home, History,
   Progress, WorkoutSummary, CoachReview, MesocycleBuilder all pull every workout
   row then slice/filter in JS (`WorkoutHistoryScreen.js:60-67`,
   `useProgressData.js:101`). Bounded by workout count (hundreds, not 100k) so
   acceptable today, but it scales linearly with the 2-year user.

4. **ActiveWorkout renders exercises via `.map` inside a `ScrollView`**, not a
   `FlatList` (`ActiveWorkoutScreen.js:1416,1443`). All exercises + all logged
   sets render eagerly. Bounded by session size (typically <12 exercises) so
   low-risk, and the per-second re-render storm is already mitigated
   (`React.memo` rows, shallow selector — `ActiveWorkoutScreen.js:70,97-100`).

5. **Module-scope synchronous boot work** (`App.js:19,27-31,41-42`) runs before
   first paint. Each is lazy-required and no-ops cleanly, but it is on the
   critical cold-start path; the IAP wire and Sentry init are the heaviest.

---

## 3. FEEL — what a 2-year power user's data does to each screen

- **Food diary / search:** Worst-affected, but worst for *everyone*, not just the
  power user — the 100k-row scan is independent of personal history. A cache-promoted
  local hit is fast; any miss/typo triggers a full scan + sort on each debounced
  query. On a mid-range Android the leading-wildcard scan over 100k rows is the
  single most likely place the user perceives lag while typing.
- **Progress tab:** Degrades **with** the user's own history. A 2-year, 4×/week
  lifter has roughly 100k–150k sets; every tab focus loads them all into JS,
  camelCases them, then sorts per-exercise for the PR-per-week bars. This is the
  screen most likely to feel sluggish *specifically for the loyal power user the
  mandate cares about*.
- **Workout history:** Stays snappy — JS-sliced to 50 and only that page's sets
  are fetched (`WorkoutHistoryScreen.js:65-69`); `FlatList` virtualises the rows.
  The full `getAllWorkouts` fetch is the only linear cost.
- **Home:** Stays snappy — windowed reads (1–4 weeks) regardless of total history
  (`HomeScreen.js:601,704`).
- **Active workout:** Unaffected by history size; bounded by the live session.
- **Sync:** A long-offline power user returning online does **not** storm —
  watermark-incremental push only sends rows past the last watermark, in 200-row
  chunks, behind the run-lock, with per-op backoff on failure. Conflict storms
  resolve deterministically (LWW/server/merge) without user prompts.

---

## 4. GAPS / FRICTION (per code)

- **G17-1 (high):** No FTS index on `foods`; food search is an O(n) scan + sort of
  ~100k rows with a leading-wildcard LIKE. A prefix-only LIKE (`q%`) would use
  `idx_foods_name_lower`, or an FTS5 contentless table would serve substring
  search. (`localCache.js:33`, `database.js:805`, no FTS present.)
- **G17-2 (high):** Analytics surfaces load the entire set history into JS on
  every focus (`getCompletedWorkoutSets`), with per-exercise JS sorts. No SQL-side
  aggregation, no windowing, no cache. Eight call sites.
- **G17-3 (medium):** Maestro E2E is **dead** (confirms prior gap G4). Latest run
  (#16, 2026-05-26, **17 days stale**) ended `failure` at "Run Maestro flows" on
  `main` (`.ci-status/maestro-latest.md`). The flow `.yaml` files are **not in the
  repo** and **no workflow references Maestro** (grep of `.github/workflows/*` =
  none). The E2E layer is effectively unmaintained; Jest is the only live gate.
- **G17-4 (medium):** **Single root error boundary.** Any uncaught render error in
  any screen takes the *whole app* to the crash screen — no per-tab/per-screen
  boundary to contain a failure to one surface (`App.js:816`).
- **G17-5 (low/medium):** OTA may be a no-op. `App.js:423-445` calls
  `Updates.checkForUpdateAsync()`, but **no `updates.url` in `app.json`** and **no
  `channel` per build profile in `eas.json`**. Unless the EAS project injects the
  channel/URL at build, the check silently returns no update. Worth confirming the
  build actually ships an update channel.
- **G17-6 (low):** ActiveWorkout uses `ScrollView + .map`, not `FlatList`
  (`ActiveWorkoutScreen.js:1416`). Fine at current session sizes; would matter
  only for pathologically long sessions.
- **G17-7 (low):** `getAllWorkouts` (full history) is fetched on several screens
  where only a recent window or a count is used; linear growth with history.
- **G17-8 (info):** No jest `coverageThreshold` / `collectCoverage` config in
  `package.json` — ~3,140 test cases across 256 test files / 21 `__tests__` dirs,
  but coverage shape is unmeasured in CI.

---

## 5. SURFACE INVENTORY (counts)

| Surface | Count | Note |
|---|---|---|
| SQLite indices | **60** | `CREATE INDEX`/`CREATE UNIQUE INDEX` in `database.js` |
| FTS / virtual tables | **0** | none — food search has no full-text index |
| In-memory read caches | **1** runtime (`_allExercisesCache`) | exercise library only |
| Error boundaries | **1** | root only (`App.js:198`) |
| Global error handlers | **2** | uncaught exception + unhandled rejection (`errorLog.js:273`) |
| Virtualised lists (`FlatList`/`SectionList`) | **13 files** | History, FoodSearch, PlanLibrary, LiftProgress, MesocycleBuilder, RoutineDetail, BuildWorkout, CardioHistory, MyMeals, MyRecipes, YearOfLifts, ActiveWorkout(modal list), ExercisePickerModal |
| Screens using `ScrollView` | **56** | many render small `.map` lists (bounded) inside |
| Notable unvirtualised list on a hot screen | **1** | ActiveWorkout exercises via `.map` in `ScrollView` (`ActiveWorkoutScreen.js:1416`) |
| Heavy native render deps in runtime | Skia **1** component; SVG **6** files | no charting library |
| Largest shipped asset | **6.5 MB** | `assets/seed/off_uk_snapshot.dat` (~100k+ rows) |
| Sync triggers | **4** | foreground / network / write / periodic, one run-lock |
| Sync queue backoff steps | **6** | `[0,1m,5m,30m,2h,8h]`, max 6 attempts |
| Conflict strategies | **3** | last_write_wins / server_wins / merge |
| Jest test files / cases | **256 files / ~3,140 cases** | live gate (`main-ci.yml`) |
| Maestro E2E | **dead** | last run failure, 17 days stale, flows absent from repo |
| OTA | present, possibly unconfigured | `expo-updates`, `runtimeVersion: appVersion`, no channel/url in repo config |

---

## 6. WHAT'S ALREADY GOOD (so Phase 3 doesn't "fix" it)

- WAL mode, 60 targeted indices, write serialisation, lazy DB init.
- Architecture rule honoured: screens never touch SQLite directly.
- ActiveWorkout re-render storm already solved (memo + shallow selector).
- Sync is genuinely robust: run-lock dedupe, watermark-incremental, chunked
  upserts, deterministic conflict resolution, exponential-backoff retry queue,
  sign-out wipe guard (`runner.js:76`), background-flush-before-OS-kill.
- Offline-first promise holds for the core loop: workout logging, history,
  PBs, plan library, and **food logging of already-known items** all work with
  no connection — the food waterfall is local-first against the bundled OFF/CoFID
  snapshot; only novel/branded barcodes need network (`waterfall.js:98-134,
  141-170`). Offline writes queue and catch up on next foreground.
- No bloated chart/animation dependency; hand-rolled SVG charts + one Skia
  component.
