# S3 — Performance + Reliability Audit

Auditor: S3 (read-only). No prior perf baseline found at `/audit/perf-baseline.md`
or `docs/audit/*perf*` — this is the first pass; nothing pre-settled to defer to.

## Executive summary (10 lines)

Volyume's performance engineering is materially more mature than a typical
first audit finds: startup already defers screen-module evaluation
(`RootNavigator.lazyScreen`), decouples AsyncStorage-only flag reads from the
SQLite boot path, and documents PR numbers against each fix (F6b, PR-3, PR-4,
PERF-001). Virtualisation is already in place on every heavy list surface
(FlashList on workout history, food search, lift progress, cardio history,
recipes, progress photos, plan library, build/active workout, routine
detail). The sync layer has real backoff/retry, per-op safety nets, watermark
delta-pulls, and a sign-out race guard — all with fix comments referencing
prior incidents (F-003, SYNC-3, A2-005). The residual issues are narrower:
one un-transacted N+1 write path, no photo down-sampling before local
storage, a handful of screens still on ScrollView+map for lists that will
grow (bounded today, not enforced), and a couple of best-effort catches on
billing/tier paths that rely on eventual reconciliation rather than logged
visibility. No P0s found. Two P1s (photo storage growth, un-transacted
insert loop), rest are P2/P3 polish. Scope cut: did not benchmark actual
frame timings/cold-start ms on device (no device attached to this session);
findings are static-analysis + code-reading only, verified against file:line
evidence, not measured.

---

## 1. Startup path (App.js, RootNavigator.js)

**What's already good.** `App.js` gates all UI behind `themeReady` but that
gate is a single AsyncStorage read (`loadA11yPrefs`) — cheap. `RootNavigator`
explicitly starts `checkFirstRun()`/`checkTier()` (AsyncStorage-only) *before*
`await initDatabase()` rather than serially after (comment cites "audit
PR-4"). SQLite init is awaited (correctness: reads can't race a half-open
DB) but exercise seeding, OFF/CoFID snapshot import, and food-library delta
pull are all fire-and-forget after that. Screens are not eagerly imported —
`lazyScreen()` (RootNavigator.js:46-56) defers each of 82 screens' module
evaluation to first render, which is also why `ScanBarcodeScreen.js`/
`ScanLabelScreen.js` can safely import `react-native-vision-camera` at module
scope (it was flagged in a comment as the reason lazyScreen exists at all).
`App.js`'s four sync triggers (foreground/background/network/15-min) share
one `syncInFlight` guard (PERF-001) to stop the periodic timer stacking a
sync on top of one already running.

### Finding: cold start still serially awaits `initDatabase()` + tier before first interactive frame
- **Area:** Startup
- **Severity:** P3
- **Evidence:** `src/navigation/RootNavigator.js:768-892` — `bootstrap()` awaits `initDatabase()`, then `await tierPromise`, then `await client.auth.getSession()` before `setAuthLoading(false)` on the signed-in path.
- **User impact:** None currently reported; this is the standard "splash → home" wait already budgeted for SQLCipher open + migrations. Flagged only because it's the one remaining synchronous chain in an otherwise well-deferred boot.
- **Business impact:** Low; would only bite if `SCHEMA_MIGRATIONS` (database.js) grows a slow migration, or SQLCipher key derivation slows on low-end Android.
- **Complexity:** M (would need a splash progress signal or a migration time budget/telemetry to justify further work).
- **Options:**
  1. Leave as-is — no evidence of a real-world slow boot; the risk is latent, not present.
  2. Add cold-start duration telemetry (time from JS start to `setAuthLoading(false)`) via `engineTelemetry.js` so a future regression is caught quantitatively instead of anecdotally.
  3. Pre-fetch/cache the last migration count so `initDatabase()` can short-circuit the "already fully migrated" case faster (marginal; SQLite `PRAGMA user_version` read is already cheap).

---

## 2. List virtualisation

**What's already good.** FlashList is the standard for every screen with an
unbounded or growing dataset: `WorkoutHistoryScreen.js`, `FoodSearchScreen.js`,
`LiftProgressScreen.js`, `CardioHistoryScreen.js`, `MyRecipesScreen.js`,
`MyMealsScreen.js`, `PlanLibraryScreen.js`, `BuildWorkoutScreen.js`,
`ActiveWorkoutScreen.js`, `RoutineDetailScreen.js`, `MesocycleBuilderScreen.js`,
`ProgressPhotosScreen.js` (timeline grid, `getItemType` used for mixed
header/row cells — correct FlashList usage), plus `ExercisePickerModal.js`.
`YearOfLiftsScreen.js` and `PlanLibraryScreen.js` also use plain `FlatList`
for smaller/simpler lists — reasonable, not everything needs FlashList.

### Finding: `ExerciseDetailScreen` history list is capped in-memory, not a virtualisation gap
- **Area:** Lists
- **Severity:** Informational (not filed as a defect)
- **Evidence:** `src/screens/ExerciseDetailScreen.js:165-168` (comment: "all sessions (uncapped) feed the windowed chart; history stays the last-8 view"), rendered via `ScrollView` + `.map()` at line 674.
- **Note:** Already bounded to 8 sessions for the rendered list; `allSessions` (uncapped) only feeds the chart's aggregated data points, not one DOM node per row. No action needed — confirms the team already thought about this exact risk.

### Finding: several ScrollView+map screens render domain-bounded-but-uncapped arrays
- **Area:** Lists
- **Severity:** P3
- **Evidence:** `src/screens/DiaryScreen.js` (meal slots + food items per slot, lines ~1155, ~1340), `src/screens/AnalyticsScreen.js:668` (`recentSessions.map`), `src/screens/VolumeHeatmapScreen.js:385,464,480` (muscle groups). These are bounded by domain cardinality (meal slots per day ≈ 4-6, muscle groups ≈ 12, "recent sessions" already sliced upstream), not literally unbounded, so FlashList would be over-engineering today.
- **User impact:** None currently; would only matter if a future feature (e.g. unlimited custom meal slots) removed the natural cap.
- **Business impact:** Low.
- **Complexity:** S if it ever needs doing.
- **Options:**
  1. Leave as-is — the caps are real, not incidental.
  2. Add a source-level comment (matching the ExerciseDetailScreen precedent) noting the assumed cap so a future change to remove the cap is forced to reconsider virtualisation.

---

## 3. Re-render hygiene / store selectors

**What's already good.** 63 of 95 screen/component files using `useAppStore`
already use `useShallow`. Sampling the 32 files that don't (`AnalyticsScreen.js`,
`ProgressPhotosScreen.js`, etc.) shows they select **primitive** fields via
separate calls (`useAppStore(s => s.tier)`, `useAppStore(s => s.user?.id)`)
rather than an object literal — Zustand's default `Object.is` equality is
correct for that pattern, so `useShallow` would be a no-op there, not a gap.
The engine call in `CoachOutputScreen.js:1595` (`runWeeklyCoach`) runs inside
an async data-load function triggered by explicit user/effect events, not
inside the render body, so it isn't a per-render recompute risk despite no
`useMemo` wrapping it directly.

### Finding: no broad-slice store subscriptions found in the sampled non-useShallow files
- **Severity:** Informational — checked as a risk, not found. No finding filed.

---

## 4. Database query patterns (`src/lib/database.js`, `src/lib/food/db.js`)

**What's already good.** Index coverage is broad and mostly matches query
shape: 63 `CREATE INDEX` statements covering the hot `WHERE user_id = ?`
paths (workouts, workout_sets, routines, food_entries, custom_foods, cardio_log,
recipe_ingredients, etc.), including partial indexes (`WHERE deleted_at IS
NULL`) that keep soft-delete scans cheap, and composite `(user_id, updated_at)`
indexes purpose-built for the sync watermark delta pulls. `food/db.js`'s
`setRecipeIngredients` (line 841) and `database.js`'s `duplicateRoutine`
(line 2922) both wrap their per-row insert loops in `runInTransaction` —
`duplicateRoutine`'s comment explicitly says "Atomic, was N+1 individual
inserts" (i.e. this exact class of bug was already found and fixed in a prior
pass).

### Finding: `createWorkoutTemplateFromWorkout` loops individual inserts with no transaction wrapper
- **Area:** Database
- **Severity:** P1
- **Evidence:** `src/lib/database.js:3189-3208`:
  ```js
  for (let i = 0; i < exerciseData.length; i++) {
    const ex = exerciseData[i];
    if (!ex.exerciseId) continue;
    await addExerciseToRoutine(id, ex.exerciseId, i, ...);
  }
  ```
  Contrast with `duplicateRoutine` (line 2922-2949), which wraps the identical
  loop shape in `runInTransaction(d, async () => { ... })` specifically
  because an un-transacted version "used to leave a routine row pointing at
  no exercises (or partial)" if interrupted.
- **User impact:** A user saving a completed workout as a template with many
  exercises who backgrounds/kills the app mid-save (low-battery kill, OS
  memory pressure) can end up with a template row referencing only some of
  its exercises — same failure mode `duplicateRoutine`'s comment says was
  already hit in production once.
- **Business impact:** Silent partial data creates a support/trust issue
  ("my template lost exercises") with no error surfaced to the user.
- **Complexity:** S — wrap the existing loop in `runInTransaction`, matching
  the `duplicateRoutine` pattern exactly.
- **Options:**
  1. Wrap the loop in `runInTransaction`, same as `duplicateRoutine` (smallest, most consistent fix).
  2. Batch into a single multi-row `INSERT ... VALUES (...),(...)` statement (marginally faster, more invasive, changes `addExerciseToRoutine`'s call contract).
  3. Leave as-is and accept the residual risk (not recommended — the sibling function's own comment documents this exact failure already happened once).

### Finding: `copyPlanFromLibrary` / `duplicatePlan` loop `duplicateRoutine` calls sequentially, no outer transaction
- **Area:** Database
- **Severity:** P2
- **Evidence:** `src/lib/database.js:3086-3108` (`copyPlanFromLibrary`) and `3154-3176` (`duplicatePlan`) both `for (const row of ...) { await duplicateRoutine(...); await d.runAsync('UPDATE routines SET programme_id = ...') }` — each `duplicateRoutine` call is internally atomic, but the plan-level operation (copy N routines + repoint each) is not: an interruption after routine 2 of 5 leaves a plan with a partial routine set.
- **User impact:** Copying a multi-routine plan (e.g. a 4-day split) and being interrupted mid-copy leaves a plan with some but not all routines.
- **Business impact:** Same class as above but on a plan-copy action, likely lower frequency than workout-template saves.
- **Complexity:** M — needs the whole per-routine loop (including the nested `duplicateRoutine` transaction) folded into one outer transaction, or an explicit rollback/cleanup on partial failure.
- **Options:**
  1. Wrap the outer loop in a single `runInTransaction` (SQLite supports nested-looking transactions via savepoints; verify `runInTransaction`'s implementation supports nesting or refactor `duplicateRoutine` to accept an existing transaction handle).
  2. Leave sequential-but-non-atomic and accept the risk (lower priority than the template case since plan copying is a deliberate, supervised action, not typically background-interrupted).
  3. Add a completion marker column + a startup sweep that finishes or discards partial copies (more infrastructure, defers the fix rather than preventing the state).

---

## 5. Sync reliability (`syncQueue.js`, `watermark.js`, `conflict.js`, `signOutGuard.js`)

**What's already good.** This is the most mature subsystem in the codebase.
`syncQueue.js` has a documented backoff schedule (0/1m/5m/30m/2h/8h, 6 max
retries), per-op-type `safeCall` guards so one unrecognised `op_type` can't
halt the whole drain, and comments citing a real prior bug (F-003: ops that
returned `true` on failure "reported a false success with a reset retry
counter" — now fixed to `rethrow: true` + real return values).
`watermark.js` correctly advances via `max(existing, max received)`
and never regresses; the push watermark is only advanced "after a CLEAN push
(zero failures)" per its own doc comment. `conflict.js` implements three
strategies (`server_wins`/`merge`/`last_write_wins`) dispatched per-table via
a registry, with column-level merge for `profiles`. `signOutGuard.js` is a
tightly-scoped race fix (SYNC-3) preventing a lifecycle sync trigger from
resurrecting rows mid-wipe.

### Finding: `drainSyncQueue` caps at 50 ops per foreground event
- **Area:** Sync
- **Severity:** P3
- **Evidence:** `src/lib/syncQueue.js:78-83` — `LIMIT 50` with no loop to drain remaining rows in the same pass.
- **User impact:** A user who is offline for an extended period with heavy logging (e.g. multi-day gym trip with airplane mode) could accumulate >50 pending ops; only 50 drain per foreground/background/periodic trigger, so full catch-up takes multiple app opens or waits for the 15-minute periodic trigger to cycle through.
- **Business impact:** Low — eventually consistent, no data loss (ops stay queued), just a longer-than-necessary window before all local writes are confirmed synced.
- **Complexity:** S.
- **Options:**
  1. Leave as-is — self-heals within a few periodic cycles, and 50 pending ops is already an unusual volume.
  2. Loop the drain (re-query + repeat) within a single call up to a time budget (e.g. 5s) instead of a fixed row cap, so a large backlog clears in one foreground session.

### Finding: LWW tie-break on exact-equal `updated_at` favours server, not local device truth
- **Area:** Sync
- **Severity:** P3
- **Evidence:** `src/lib/sync/conflict.js:71-77` (`compareUpdatedAt`): `lt > st ? 'client' : 'server'` — a tie (`lt === st`) resolves to `'server'`.
- **User impact:** Extremely rare in practice (millisecond-precision ties across a network round-trip), but CLAUDE.md's architecture line states sync is "last-write-wins with local as device truth" — the tie case contradicts the stated tie-break direction.
- **Business impact:** Negligible; flagged only because it's a literal reading of an evidenced line vs the documented invariant.
- **Complexity:** S (flip `>` to `>=` if the founder wants ties to favour local).
- **Options:**
  1. Leave as-is — ties are vanishingly rare and "server wins on tie" is a defensible interpretation of "last write wins" too.
  2. Change to `>=` so an exact tie favours the local/device value, matching the "local as device truth" framing literally.

---

## 6. Images (progress photos, Skia)

**What's already good.** Progress photos are confirmed device-only:
`src/lib/progressPhotos.js:6` states photos live in "the app's private
document directory: never synced to Supabase, never uploaded" — correct
GDPR/data-minimisation alignment, and removes any bandwidth concern for
photo sync. Skia usage (`ShareCardScreen.js`, `BeforeAfterShareSheet.js`,
`ProgressPhotoCompare.js`, `MacroRings.js`) is all either an offscreen
surface rendered on-demand (share card generation) or a bounded compare view
(2 images), not a per-list-item cost.

### Finding: no image down-sampling/compression step before local storage
- **Area:** Images
- **Severity:** P1
- **Evidence:** `src/screens/ProgressPhotosScreen.js:179` — `ImagePicker` options are `{ mediaTypes: ..., quality: 0.7 }` only; no `allowsEditing`/target dimensions, and no call to `expo-image-manipulator` (or equivalent) anywhere in `progressPhotos.js` or `ProgressPhotosScreen.js`. `quality: 0.7` controls JPEG compression ratio only, not pixel dimensions — a modern phone camera (12-48MP) produces a multi-MB file at full sensor resolution that is stored as-is in the private document directory and re-decoded at full resolution for every grid tile (mitigated somewhat by `resizeMethod="resize"` at `ProgressPhotosScreen.js:376`, which is Android-only).
- **User impact:** A user who logs progress photos weekly/monthly for years accumulates full-resolution originals with no thumbnail tier — device storage grows faster than necessary, and the timeline grid's tile decode cost (even virtualised by FlashList) scales with per-image byte size, risking jank/OOM on lower-end Android devices with large photo libraries.
- **Business impact:** App-storage complaints ("Volyume is using 2GB") and potential crash reports on budget Android devices are a churn/rating risk for a feature (photo-heavy progress tracking) the app is explicitly building out (per the CLAUDE.md status note on the progress-photos programme).
- **Complexity:** M — needs a resize step (e.g. `expo-image-manipulator`, already an Expo-ecosystem package so no new-dependency approval needed if adopted, but confirm it isn't already installed) capping the stored image to a sane max dimension (e.g. 1600px long edge) plus optionally a separate small thumbnail for grid tiles, and a data-migration story for existing full-res photos already on disk.
- **Options:**
  1. Add a resize-on-capture step (cap long edge to e.g. 1600-2000px) before writing to the document directory — smaller stored files, faster grid decode, no visible quality loss for in-app viewing/sharing.
  2. Keep the full-res original (some users may want it for external use) but additionally generate and cache a small thumbnail for grid rendering, decoded from the thumbnail rather than the original in `renderTile`.
  3. Leave as-is — no reported crash/storage complaints yet against this feature; revisit if the founder's progress-photos programme sees photo-heavy adoption in practice.

---

## 7. Error handling coverage

**What's already good.** The `logError`/`logWarn`/`logInfo` convention from
`errorLog.js` is followed consistently on system-critical paths — `App.js`'s
`ErrorBoundary`, `VOLYUME_DAILY_SYNC` task, and `RootNavigator`'s `bootstrap()`
all log failures via `_bootLog`/`logError` rather than swallowing silently.
`syncQueue.js` logs every give-up (`logWarn('syncQueue.giveUp', ...)`) and
unknown-op-type case. Fire-and-forget telemetry (`track(...).catch(() => {})`)
throughout `payments/cascade.js` and `playBilling.js` is an intentional,
documented pattern (analytics must never block a purchase/entitlement flow)
consistent with CLAUDE.md's "best-effort paths use `.catch(() => {})` with a
comment" rule.

### Finding: `cascade.startCascade`'s local tier mirror swallows its own failure with no `logError`
- **Area:** Error handling / Billing-adjacent
- **Severity:** P2
- **Evidence:** `src/lib/payments/cascade.js:131` — `try { await st.setTier?.('pro', 'cascade.startCascade'); } catch (_) {}`, inside an outer `try { ... } catch (_) { /* tolerate; refreshTierFromCloud reconciles next read */ }` (line 142).
- **User impact:** If the local `setTier` write fails (e.g. AsyncStorage write error) right after a successful `start_cascade` RPC, the user's local tier doesn't flip to 'pro' immediately — the code's own comment says this relies on `refreshTierFromCloud` "next read" to reconcile, but that path itself is a separate fire-and-forget call a few lines below with its own `.catch(() => {})`. In the gap, `RootNavigator` (which routes onboarding on `store.tier`) could route the user through the free flow instead of Pro setup — precisely the bug this `await` (vs the previous fire-and-forget) was added to fix per the comment at line 126 ("AWAITED (founder repro 2026-07-02)").
- **Business impact:** A silent failure here reintroduces the exact class of bug the surrounding comment says was already reported and fixed once (a founder-repro'd routing bug), but with no `logError` breadcrumb if it recurs — next time it would be invisible until re-reported.
- **Complexity:** S — add a `logError`/`logWarn` call in the inner catch; no behaviour change needed since reconciliation already exists as the fallback.
- **Options:**
  1. Add `logWarn('cascade.startCascade.setTier', e, { userId: uid })` (or `logError`, given the founder-repro history) in the inner catch so a recurrence is visible in Sentry instead of silent.
  2. Leave as-is, trusting `refreshTierFromCloud`'s reconciliation to always catch it before the user notices — riskier given this exact failure mode was already user-reported once.

---

## 8. Bundle / dependency weight

**What's already good.** The codebase already applies lazy-require broadly
and deliberately: every screen is behind `RootNavigator.lazyScreen`; `App.js`
lazy-requires ~15 modules (billing, live-activity, quick-actions, widgets,
health, activitySteps, feedback, notifications helpers) inline with
`eslint-disable-next-line global-require` comments explaining why in each
case. Heavy/optional native modules (`react-native-iap`, `expo-quick-actions`,
`live-activity`, `@shopify/react-native-skia`, `react-native-vision-camera`)
are all wrapped in `try { require(...) } catch (_) { /* not in this build */ }`
guards so a build without the native module doesn't crash, and their cost is
only paid when the owning screen/feature first renders/runs.

### Finding: none — no eagerly-imported heavy dependency found outside its owning lazy screen
- **Severity:** Informational. Checked `react-native-vision-camera`, Skia,
  and chart libraries specifically; all three are either module-scoped inside
  a `lazyScreen`-wrapped screen (Camera) or small/on-demand (Skia offscreen
  surfaces, `MacroRings`). No action needed.

---

## Severity counts

- P0: 0
- P1: 2 (createWorkoutTemplateFromWorkout un-transacted N+1; progress-photo no down-sampling)
- P2: 2 (copyPlanFromLibrary/duplicatePlan non-atomic multi-routine copy; cascade.startCascade silent setTier failure)
- P3: 4 (cold-start serial chain telemetry suggestion; ScrollView+map domain-bounded lists; syncQueue 50-op drain cap; LWW tie-break direction)
- Informational (checked, no defect): 4 (ExerciseDetailScreen history cap, store selector sampling, engine-call placement, dependency lazy-load coverage)

## Scope cuts (stated per instructions)

- No on-device profiling (no physical Android/EAS build available in this
  read-only session) — findings are static/code-reading evidence only, not
  measured frame times, cold-start ms, or memory profiles.
- Did not read every one of the 82 screens line-by-line; prioritised the
  list-heavy, engine-calling, and sync/payment-adjacent surfaces named in the
  task brief.
- Did not audit `src/lib/sync/runner.js` or `src/lib/sync/registry.js`
  internals in depth beyond confirming the lock/dedupe behaviour referenced
  from `App.js` and `syncQueue.js` — flagged as a follow-up area if a future
  pass wants deeper sync-runner coverage.
