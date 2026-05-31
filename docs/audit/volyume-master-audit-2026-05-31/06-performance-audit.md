# 06 — Performance Audit

Status: **COMPLETE**
Date: 2026-05-31
Method: traced from code read in Phase 2 + targeted greps run this session
(FlatList configs, memoisation, timers, effect cleanup). Bundle-size /
runtime profiling on-device is out of scope for a static audit and is
flagged where it would be the next step.

---

## 1. List performance — good
- **15 screens use `FlatList`**; **all 15 have `keyExtractor`** (grep-
  verified). Only 1 uses `getItemLayout` — acceptable, the rest are
  variable-height rows where `getItemLayout` doesn't apply. No `ScrollView`-
  rendering-a-large-list anti-pattern found in the heavy screens (history,
  library, food search all use FlatList).
- **P6-001 (low):** none set `windowSize`/`maxToRenderPerBatch` explicitly.
  Defaults are fine for the realistic row counts (a few hundred), but the
  exercise library (~280 rows) + food search results would benefit from a
  tuned `windowSize` if scroll-jank shows on low-end devices. Profile on
  device before tuning.

## 2. Re-render discipline — strong
- **`useShallow` selectors in 24 files** — the documented guard that stops
  every store mutation (rest-timer ticks, PR flags) re-rendering big trees.
  `ActiveWorkoutScreen` (2,560 LOC) and `RestTimer` both exclude rest-timer
  fields from their selectors so the per-second tick doesn't re-render the
  workout tree (A2-044 verified). `RootNavigator` subscribes via field
  selectors to avoid full-nav re-render.
- **P6-002 (low):** only 1 `React.memo` in the codebase. Most components are
  cheap, but list row components (`ExerciseCard`, `FoodRow`, `EntryRow`,
  `SetEntry`) re-render with their parent list — wrapping the heaviest rows
  in `React.memo` + stable `keyExtractor` would cut re-renders on large
  lists. Low; profile-driven.

## 3. Timers / subscriptions / leaks — clean
- **`setInterval` in exactly 3 components**: `ActiveWorkoutScreen` (elapsed
  timer — clean teardown + AppState resync, A2-044), `RestTimer` (countdown
  — all timeouts tracked + drained on unmount, A2-048/050), `StepsCard`
  (30s poll — cleared on blur/unmount). **No leaked intervals.**
- **`addEventListener` in 4 files** — all paired with `remove()` in the
  effect cleanup (App.js AppState/Linking, observability, RestTimer). Phase-2
  reads confirmed cleanup on each.
- **A2-048 (low, real):** `RestTimer` drives a JS-thread `Animated.timing`
  (`useNativeDriver:false`) progress animation every rest that **renders
  nothing** (no View consumes `barWidth`). Wasted CPU/battery during every
  workout. → remove or re-wire. The clearest perf win.

## 4. Animations — mostly native-driver
- Splash, PRCelebration, Toast, BottomSheet, PeekMenu, FeedbackSheet,
  PressableCard, AnimatedEntrance all use `useNativeDriver: true` (verified
  Phase 2). Reduce-motion short-circuits the heavy ones.
- **Exceptions (JS-thread, `useNativeDriver:false`):** `RestTimer`
  progress (dead — A2-048) and `Skeleton` shimmer width. The Skeleton runs
  only during cold-load and is paused under reduce-motion — acceptable.
- Reanimated layout animations (`AnimatedEntrance` FadeInDown) run on the UI
  thread. Good.

## 5. Startup sequence — one fixed cost
- **A2-013 (medium UX/perf):** `SPLASH_MIN_MS = 2500` forces a **2.5s splash
  on every cold launch** regardless of how fast bootstrap finishes
  (`RootNavigator:408,435-438,876`). Deliberate brand moment but a fixed tax.
- **A2-008 (low):** `MainTabs` is `lazy={false}` so all 5 tab stacks +
  initial screens mount at entry (Home 2,344 LOC, Analytics 1,436, Diary,
  Plans, You). Trades a heavier first-MainTabs render for instant tab
  switches. Quantify on device; consider `lazy` for the heaviest non-Home
  tabs if cold-start matters.
- Bootstrap (`RootNavigator:471-855`) does DB init (awaited) + 3 fire-and-
  forget food-seed imports + tier/session hydration. The food seeds are
  chunked + transaction-mutexed (A2 seed batch) so they don't block boot.

## 6. Sync / network efficiency
- **A2-001 (medium, perf only):** on each foreground after sign-in, BOTH
  `maybeSync`→`bulkUploadLocalData` and `callSyncAll`→`syncAll`(→same) can
  run; the `_runLock` only guards `syncAll`, so direct callers bypass it →
  **redundant duplicate upload + 2× `getSession()` per foreground**.
  Idempotent (onConflict upserts) so not corrupting, but wasteful. → route
  all callers through `syncAll`.
- **A2-055 (low):** per-table pulls do an N+1 `getXUpdatedAt` lookup per
  cloud row for the LWW gate. Bounded row counts; a batched `IN (…)` removes
  it.
- Positives: watermark delta-pull (only changed rows), debounced write-sync
  (2s coalesce), chunked uploads (10–200/batch with JS-thread yields),
  food-domain per-table RPC isolation. Network usage is well-managed apart
  from A2-001's duplication.

## 7. DB / main-thread
- All SQLite via `expo-sqlite` async API (no sync calls blocking JS). WAL
  mode (`database.js:63`). Bulk operations chunked with `setTimeout(50)`
  yields (`sync.js:574`). `database.js` is 5,574 LOC but that's code size,
  not runtime cost — queries are indexed (`idx_*` created in schema +
  migrations).

## Performance findings summary
| ID | Finding | Severity |
|---|---|---|
| A2-001 | Redundant duplicate sync per foreground | Medium (perf) |
| A2-013 | Fixed 2.5s splash every launch | Medium (UX/perf) |
| A2-048 | RestTimer dead JS-thread animation every rest | Low–med |
| A2-008 | `lazy={false}` mounts all tabs at entry | Low |
| A2-055 | N+1 updated_at lookups on pull | Low |
| P6-001/002 | FlatList tuning / row memoisation | Low (profile-driven) |

**Verdict:** performance hygiene is **good** — clean timers/listeners,
strong re-render discipline, native-driver animations, indexed async DB,
delta sync. The actionable wins are **A2-001 (sync dedup)**, **A2-013
(splash)**, and **A2-048 (dead animation)**. No on-device profiling done
(out of static scope); recommend a Sentry-traces pass on cold-start +
large-list scroll to confirm before deeper tuning.
