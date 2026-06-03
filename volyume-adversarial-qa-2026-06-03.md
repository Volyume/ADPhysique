# Volyume adversarial QA — failure-path report (2026-06-03)

Method: static execution-path analysis of the working tree (no device/emulator
available in this environment). Five subsystems were attacked in parallel; every
finding below was re-verified against source by reading the exact code and, where
relevant, executing the pure functions. Each item carries a confidence rating:

- **VERIFIED** — read the exact code / ran the function; it definitively does this.
- **LIKELY** — strong inference, one runtime-dependent link.
- **SPECULATIVE** — plausible, needs device confirmation.

Severity counts: **4 Critical, 7 High, 11 Medium, ~8 Low/latent.**

The two highest-stakes clusters are **data loss on sign-out** (SYNC-1/2/3) and
**data loss on app-kill mid-workout** (WK-1). Both destroy real user data through
normal, non-adversarial use.

---

## CRITICAL

### SYNC-1 — Sign-out wipes local data even when the legacy-table push silently failed
**VERIFIED.** `src/lib/sync.js:535-627` (`bulkUploadLocalData` wraps the whole body
in try/catch, on error calls `logError` and returns `undefined` — never throws,
never returns an error count); each `_pushX` helper also swallows its own errors.
`src/lib/sync/runner.js:114-124` only bumps `erroredCount` if that legacy call
*throws*. `runner.js:170-172` then sets `_lastStatus = queueAfter>0 ? 'pending' : 'synced'`.
The sign-out guard `src/store/useAppStore.js:242` aborts only on `'error'`/`'skipped'`.

- **Repro:** Sign in, edit a *legacy* table (workouts / routines / mesocycles /
  morning weights / programmes / coach outputs). Force any of those upserts to
  fail (RLS rejection, cloud column drift, transient 5xx) while food + migrated
  tables succeed. Sign out.
- **Consequence:** `erroredCount===0` → status `'synced'` → guard passes →
  `wipeAllUserData` + `AsyncStorage.clear()` run. Unsynced legacy-table edits are
  permanently destroyed. Directly violates the "push-first safety" intent in
  `docs/IDENTITY_AND_OWNERSHIP_LOCKED.md`.
- **Fix direction:** `bulkUploadLocalData` must collect and return per-table
  failure counts (or throw on any); the runner must fold them into `erroredCount`;
  the sign-out guard must also treat `'pending'` as a non-clean result.

### SYNC-2 — `'pending'` (queued, undrained rows) is treated as success by the sign-out guard
**VERIFIED.** `runner.js:172` returns `_lastStatus='pending'` when `queueAfter>0`
with no new errors; `runner.js:188` returns `{ status: _lastStatus }`. The sign-out
guard (`useAppStore.js:242`) checks `'error'||'skipped'` but **not `'pending'`**.

- **Repro:** Have rows sitting in `pending_sync_ops` (a prior single-entity push
  failed and enqueued) that don't drain this cycle. Sign out.
- **Consequence:** Wipe proceeds; queued rows and the local data they reference are
  lost.

### WK-1 — Kill app mid-workout: logged sets are lost, the workout is orphaned, and there is no resume
**VERIFIED.** The Zustand store is plain `create()` with no `persist` middleware
(`src/store/useAppStore.js:89`); `activeWorkout` is never written to AsyncStorage
(`startWorkout` at `:801` only sets in-memory state). But the `workouts` row is
created up front via `createWorkout` (default `is_completed=0`) and each set is
written to SQLite immediately (`ActiveWorkoutScreen.js:768` → `createWorkoutSet`).
There is **no restore path** — the only code touching incomplete workouts is
`deleteIncompleteWorkout` (`database.js:1419-1429`).

- **Repro:** Start a workout, log 3 sets, force-kill the app, relaunch.
- **Consequence:** You land on Home with no way back in. The `workouts` row stays
  `is_completed=0` forever (every history/analytics query filters `=1`, so it is
  invisible), its `workout_sets` rows are orphaned and counted by nothing, never
  cleaned, never resumable. Real logged work is lost.
- **Fix direction:** persist active-workout state (or, at minimum, detect an
  `is_completed=0` row on launch and offer "resume / discard").

### CALC-1 — A lone "." in the body-fat field produces persisted `NaN kcal` nutrition targets
**VERIFIED** (engine output reproduced; input gate confirmed). `nutritionEngine.js:519-521`
guards with `?? default`, which only catches `null`/`undefined`; an explicit `NaN`
survives (`Math.min(Math.max(NaN,100),250) === NaN`). The Katch-McArdle path
`nutritionEngine.js:343` `lbm = weightKg * (1 - bodyFatPercent/100)` propagates NaN.
Reachable via `NutritionTargetsScreen.js:261` `const bfNum = bodyFat.trim() ? parseFloat(bodyFat) : null;`
then `:290` `bodyFatSource: bfNum != null ? bfSource : null` — `NaN != null` is **true**,
so NaN flows into the engine. The field is `decimal-pad` but accepts a lone `"."`,
and `parseFloat(".") === NaN`, `".".trim()` is truthy.

- **Repro:** NutritionTargets → valid age/height/weight → type `.` into "Body fat %"
  → pick a source → Calculate.
- **Consequence:** `targetKcal/maintenanceKcal/bmrKcal/carbsG` all `NaN`; protein
  still computes, so it doesn't look obviously broken. Targets are persisted
  (`:301` AsyncStorage, `:303` `saveNutritionTargets`); `NaN` serialises to JSON
  `null`, so downstream reads get `null` calorie targets.
- **Fix direction:** `Number.isFinite(x) ? x : default` in the engine for
  age/height/weight/bodyFat, and gate `bfNum` with `Number.isFinite` in the screen.

---

## HIGH

### SYNC-3 — Sign-out wipe races still-live sync triggers (foreground / reconnect / periodic)
**LIKELY.** `clearAuthStateForSignOut` cancels only the 2s debounce
(`useAppStore.js:212-216`); the AppState/NetInfo/periodic triggers in `App.js:643-686`
stay live, and the Supabase session is still valid through the wipe. `_runLock`
(`runner.js:37-40`) only dedupes *concurrent* runs, not the gap between the
sign-out sync finishing and the wipe completing.
- **Repro:** Begin sign-out; after its `syncAll` completes but before `set({user:null})`
  + cloud `signOut()`, background+foreground (or wait for periodic/reconnect). A fresh
  pull acquires the free lock and re-inserts rows into a half-wiped DB.
- **Consequence:** Zombie/partial rows after wipe, or a push against a half-wiped DB.

### SYNC-4 — Legacy pull `INSERT OR REPLACE` clobbers newer local workout/set rows (no last-write-wins)
**VERIFIED** (no LWW guard) / trigger **LIKELY**. `database.js:4470` (`INSERT OR REPLACE INTO workouts`)
and `:4596` (`workout_sets`) have no `updated_at` comparison, unlike migrated tables
(`bodyComposition.js:136`, `dailySteps.js:109`). Push and pull are sequential in one
cycle (`runner.js:88-157`); a swallowed push failure (SYNC-1) is immediately followed
by an unconditional REPLACE on pull.
- **Repro:** Fresh sign-in (watermark 0 after `AsyncStorage.clear`) or any cycle where
  a locally-edited completed workout's push fails. The pull overwrites the local edit.
- **Consequence:** Local workout edits (notes, RIR, set data) silently reverted to cloud.

### SYNC-5 — Food push watermark uses the server clock while the change query uses the local clock (clock-skew lost update)
**VERIFIED** (cross-clock comparison) / impact **LIKELY**. `foodDomain.js:220-230`
reads `sinceMs` and queries `getAll…Since(localUserId, sinceMs)` against local
`updated_at` (`food/db.js:927` `WHERE updated_at > ?`), but advances the watermark to
`data.timestamp` = **server** time (`foodDomain.js:267-277`).
- **Repro:** Device clock ahead of server; a row written during the RPC round-trip
  gets a local `updated_at` ≤ recorded server time. Next push computes
  `updated_at > serverTime` → row excluded permanently (until sign-out clears the key).
- **Consequence:** Silent permanent non-sync of food entries/custom foods/water
  written in the skew/round-trip window.

### SYNC-6 — `morning_weights` cloud-restore uses `INSERT OR IGNORE` — edits never reconcile across devices
**VERIFIED.** `database.js:4282` `INSERT OR IGNORE INTO morning_weights`; push side
upserts on `(user_id,id)` (`sync.js:786-803`). IGNORE = first-write-wins locally,
opposite of the cloud upsert.
- **Repro:** Edit a morning-weight entry (same id) on device A → it upserts to cloud.
  Device B pull runs IGNORE → keeps the stale local row.
- **Consequence:** Cross-device divergence of morning weights that never reconciles.

### TZ-1 — Food/water/steps use a UTC day-key; weight/workouts use a local day-key. "Today" disagrees for everyone not at UTC+0
**VERIFIED.** Food: `food/db.js:291` `new Date().toISOString().slice(0,10)`; steps/water:
`activityDayKey` UTC (`database.js:3520`); morning weight: local midnight
(`database.js:3498`). Comments at `database.js:3515-3519` admit the split is deliberate.
- **Repro:** Device in LA (UTC-8). At 21:00 Mon local (= 05:00 Tue UTC) log a meal and
  a morning weight. Meal lands on Tuesday's diary; weight on Monday; today's diary looks empty.
- **Consequence:** Food/water/steps drift a calendar day away from weight/workouts;
  rollups and the coach's "this week" windows read the wrong day.

### WK-2 — Swap/remove an exercise mid-workout orphans its already-saved sets; summary and DB diverge
**VERIFIED.** `handleRemoveExercise` (`ActiveWorkoutScreen.js:287`) and `handleConfirmSwap`
clear only in-memory state; neither deletes the `workout_sets` rows already written.
`syncWorkout` reads sets from the DB (`getWorkoutSetsForWorkout`), so the orphans get
pushed to cloud and counted in per-exercise/weekly aggregates, while the finish summary
computes totals from in-memory `snapshotExercises`, excluding them.
- **Repro:** Log 2 sets on an exercise, swap it, finish. Summary under-reports; the 2
  sets still inflate that exercise's all-time history and weekly volume.

### CALC-2 — `calculate1RM` returns null/NaN for non-numeric reps, corrupting PR detection
**VERIFIED.** `algorithms.js:62-63`: the guard `!reps || reps < 1` is skipped for a
string like `"abc"` (`"abc" < 1` is false, `!"abc"` is false), then `Math.min("abc",20)`
→ NaN → returns null. `detectPR` (`:415`) feeds `newSet.actualReps` straight in.
- **Repro:** A malformed/legacy synced row with `actual_reps` stored as text.
- **Consequence:** Wrong/empty 1RM, spurious or missing PR, NaN written into PR records.
  Main exposure is bad/legacy synced data (in-app keypad yields numbers), hence High not Critical.

---

## MEDIUM

### AUTH-1 (S1) — During beta every signed-in user hits "You're Pro" and can be bounced into full onboarding
**VERIFIED.** `proGate.js:25` `PRO_BETA_ACTIVE = true` → every signed-in user resolves
to `tier==='pro'`. `ProUpgradeScreen.js:162-178`: entering ProUpgrade (via any Pro CTA
or ProGate lock) shows the success screen, whose "Set up your training" calls
`resetFirstRun()` → `firstRunComplete=false` → RootNavigator re-mounts ProOnboardingStack.
- **Consequence:** A curious user tapping a Pro lock is dropped back into the onboarding wizard.

### AUTH-2 (I5) — Rapid sign-out→sign-in-as-B: user A's late cloud read corrupts user B
**VERIFIED** (no guard present). `restoreSessionFromCloud` (`useAppStore.js:457+`) has no
"is this uid still current?" check after its awaits; its `set({firstRunComplete, userProfile})`
and global FIRST_RUN_KEY writes use the started-for uid but the global `set()` lands on
whoever is signed in now.
- **Repro:** Sign in A, immediately sign out, immediately sign in B, while A's cloud read
  (≤10s timeout) is still in flight.
- **Consequence:** B sees A's firstRunComplete/profile; possible mis-route into/out of onboarding.

### AUTH-3 (I4) — Cloud `signOut()` runs after the local wipe; a throw + no-op reload can re-trigger the enter-pipeline
**LIKELY.** `SettingsScreen.js:506-522` calls cloud `signOut()` after the local wipe;
if it throws and `Updates.reloadAsync()` no-ops (dev/Expo Go), the supabase client keeps a
live session while the store says signed-out → a later `getSession`/`INITIAL_SESSION`
re-runs the enter-pipeline (`RootNavigator.js:695-856`), effectively un-signing-out.

### AUTH-4 (I2) — Enter-pipeline runs on both `SIGNED_IN` and `INITIAL_SESSION`, plus Login's own syncAll: up to three syncAll initiations
**LIKELY.** `RootNavigator.js:668-695` + `:842-845`, and `LoginScreen.js:166-168` (acknowledges
relying on the runner lock to dedupe). Safety rests entirely on `_runLock` correctness;
the cross-user wipe is idempotent so that part is safe.

### AUTH-5 (I3) — Sign out while a background sync holds the lock returns `'skipped'` → spurious "Couldn't sign out"
**VERIFIED.** `useAppStore.js:242` maps `'skipped'`→abort. (This is the conservative side of
the SYNC-1/2 guard; tightening that guard should also make `'skipped'` retry/wait rather than
hard-fail.)
- **Repro:** Open app (enter-pipeline syncAll running), go to Settings, tap Sign out within the window.

### WK-3 — `set_number` counts warm-ups, so persisted/synced working-set numbers are wrong
**VERIFIED.** `ActiveWorkoutScreen.js:801` pushes every set (warm-ups included) into
`loggedSets`; `:766 const setNumber = loggedSets.length + 1` derives the persisted
`set_number` from it, while the rest of the file excludes warm-ups via `countProgressSets`.

### WK-4 — Rest-timer "−30s" *adds* time when under 5s remain
**VERIFIED.** `RestTimer.js:126`: `delta < 0 ? Math.max(delta, -(restTimerRemaining - 5)) : delta`.
With 2s left, `-(2-5)=+3`, `Math.max(-30,3)=3` → +3s. The floor-at-5s clamp inverts the sign.

### WK-5 — `currentExerciseIndex` can point at a Time-Crunch-skipped entry; not re-clamped
**LIKELY.** `handleTimeCrunch` (`:1029-1048`) tags entries `_timeCrunchSkipped` without
filtering, and the index isn't re-clamped (unlike `handleRemoveExercise`). Optional chaining
prevents a crash, but you can log against a slot the UI told you was dropped.

### TZ-2 — DST corrupts the morning-weight day window → duplicate day rows
**VERIFIED** (logic). `database.js:3503`/`3498` use a hardcoded `+ 86400000` day window. On a
25-hour fall-back day a late-evening log opens a second row for the same calendar day.

### TZ-3 — DST breaks the consecutive-week training streak
**LIKELY.** `HomeScreen.js:425-438`: `trainedWeeks` keyed on local-midnight Mondays, but the
loop walks back with a fixed `WEEK_MS = 7*24*60*60*1000` (`:434`). Across a DST boundary the
decrement misses the true local Monday by ±3600000 ms, so `trainedWeeks.has(cursor)` fails and
the streak truncates — defeating the comment's "local-anchored so it doesn't break across DST".

### NOTIF-1 — Reminders aren't rescheduled on timezone change; quiet-hours can be wrong until next cold start
**VERIFIED** (behaviour). `scheduler.js` lays absolute-hour DAILY/WEEKLY triggers with
quiet-hours baked in at schedule time; only `restoreNotifications` (on launch) re-lays them.
No Localization/AppState reschedule. After a timezone move, morning/coach reminders can fire
inside quiet hours until the next cold start.

### CALC-3 — Plate double-log: `logPlate` has no in-flight guard, double-tap duplicates every item
**VERIFIED** (missing guard) / race **LIKELY**. `FoodSearchScreen.js:255-274` loops
`await logFoodEntry` then `setPlate([])` only after; trigger buttons (`:622`, `:657`) have no
`disabled`/submitting state (unlike `FoodDetailSheet.js:172` and `QuickAddSheet.js:121`, which do).
- **Repro:** Build a plate of N foods, double-tap "Log N" before the awaits resolve.
- **Consequence:** Every item inserted twice (fresh `uid()` each), `recomputeRollup` doubles the
  day's totals.

---

## LOW / LATENT

### WK-6 (L8) — Picker create-fallback can return an id-less exercise *(regression from this session's picker consolidation)*
**LIKELY.** `ExercisePickerModal.js:68-69`: after `insertExercise` the component discards the
returned id and relies on `getAllExercises().find(by name)`, with a fallback object that has
**no `id`**. The old ActiveWorkout picker used `{ id: created.id, … }`. If the find ever misses
(duplicate names, silent insert failure), `onSelect` hands back an id-less exercise — in
ActiveWorkout that logs a set with `exerciseId: undefined`. Introduced by my picker merge;
fix by capturing `insertExercise`'s return id as the fallback.

### CALC-4 — `getVolumeStatus(NaN)` reports "Too much" (over MRV)
**VERIFIED** (function) / production reach **SPECULATIVE**. `algorithms.js:163-178`: NaN falls
through every comparison to the final `over_mrv` return. A muscle with missing data shows as
over-trained, possibly triggering spurious deload suggestions.

### CALC-5 — `getProgressionSuggestion` recommends +1.3 kg off all-zero (bodyweight) history
**VERIFIED.** `algorithms.js:204-222`: `prevAvgWeight=0` → `defaultIncrement(0,'kg')=1.25` →
"Try 1.3kg next session" for unloaded exercises.

### CALC-6 — `generateDeloadPrescription` passes negative weights through unclamped
**VERIFIED.** `algorithms.js:1060-1062`: `weight:-50` → `deloadWeight:-25` (no `Math.max(0,…)`
clamp, unlike `computeSetTargets`/`getProgressionSuggestion`). Requires a pre-existing negative weight.

### CALC-7 — `calculatePlates` infinite-loops if `availablePlates` contains 0
**VERIFIED** (loop reproduced) / **not reachable via shipped UI** (`PlateCalculator.js:14` uses a
fixed zero-free `PLATE_SETS`). `algorithms.js:724-729`: `while (remaining >= 0 - 0.001)` never
terminates. Latent landmine for any future/custom plate-set caller; add input validation.

### NOTIF-2 — Reminders stay "on" in the UI after OS permission is revoked
**VERIFIED.** `scheduler.js:375` / `trainingReminders.js:87-88` return silently on non-granted
without cancelling or flipping the pref. Toggles read "on"; nothing is delivered.

### NOTIF-3 — Foreground suppression mixes UTC and local boundaries
**VERIFIED.** `notifications/handler.js`: `_alreadyTrainedToday` (`:81-83`) local midnight,
`_alreadyCheckedInThisWeek` (`:64-67`) UTC Monday. Reminders can fire after the user already
acted (or be suppressed when they shouldn't), compounding TZ-1.

### NOTIF-4 — Morning-copy variant is frozen into the recurring DAILY trigger
**VERIFIED.** `scheduler.js:55` picks copy via `pickMorningCopy(new Date().getDay())` once at
schedule time; the DAILY trigger repeats the same line daily instead of rotating by weekday.
Cosmetic.

### CALC-8 — Mesocycle helpers swallow out-of-range/NaN week numbers
**VERIFIED.** `mesocycle.js:84` `?? schedule[0]` makes `getWeekSetsMultiplier(0|99)` return 1.0;
`getCurrentMesoWeek(NaN)` returns NaN. No crash, silent week-1 fallback.

### AUTH-6 (V1/V3) — LoginScreen signup lacks the 8-char password check ProUpgrade has; `looksUnregistered` precedence can mis-prompt unconfirmed users
**VERIFIED/LIKELY.** `LoginScreen.js:53-57` only `.trim()`-checks (vs `ProUpgradeScreen.js:115-118`
enforcing `length<8`); `LoginScreen.js:73-78` boolean precedence can tell an unconfirmed user
"No account found, create one".

---

## Checked and found SOUND (to avoid false alarms)
- Listener/timer cleanup: `RestTimer.js`, `StepsCard.js`, `ActiveWorkoutScreen.js:450-460`,
  `observability.js` AppState singleton, notification listener dispose — all remove subscriptions.
- Workout/rest timers derive elapsed from wall-clock and re-sync on foreground; no background
  double-fire. Android 14 foreground-service path correctly gated off.
- Pull watermarks stay put on insert failure and never move backwards (`watermark.js:64-66`);
  `gte` re-pull is intentional/idempotent. `_runLock` does dedupe concurrent runs. Food push
  correctly does not advance its watermark on partial-table failure.
- `refreshTierFromCloud` fails safe to last-known tier offline (does not demote to locked).
  Cloud reads have explicit 5s/10s timeouts. Cross-user wipe is idempotent.
- Food/recipe inputs (`FoodDetailSheet`, `QuickAddSheet`, `createRecipe`/`updateRecipe`,
  `computeRecipeMacros`, `recomputeRollup`) validate ranges, guard NaN/negative, clamp servings,
  and recompute rollups on edit/delete/date-move. `logMorningWeight` de-dupes per local day
  (the DST edge in TZ-2 aside). `units.js` formatters guard `isNaN`.
- 1RM/tonnage in the live workout path are NaN-safe for numeric keypad input; the CALC-2 exposure
  is bad/legacy synced data, not normal entry.

---

## Suggested fix order
1. **SYNC-1 + SYNC-2** (sign-out data loss) — make the legacy push report failures, fold into
   `erroredCount`, and have the sign-out guard treat `pending`/any-error as "do not wipe".
   Locked-doc adjacent: reconcile against `IDENTITY_AND_OWNERSHIP_LOCKED.md`.
2. **WK-1** (kill-mid-workout) — persist/resume active workouts, or detect+offer-resume on launch.
3. **CALC-1** (NaN nutrition targets) — `Number.isFinite` guards in engine + screen.
4. **SYNC-4 / SYNC-6** (legacy REPLACE/IGNORE LWW asymmetry), **WK-2** (orphan sets on swap/remove),
   **CALC-3** (plate double-log), **TZ-1** (day-key split — a design decision, needs your call).
5. The Medium/Low items as a cleanup pass.
