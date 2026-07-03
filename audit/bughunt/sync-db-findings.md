# Sync / DB / data-integrity hunt — findings

Surface: `src/lib/database.js`, `src/lib/food/db.js`, `src/lib/sync/**`,
`src/lib/syncQueue.js`, `src/lib/dbCrypto.js`, `supabase/migrate_*.sql` (recent).
Read-only. Each finding traced to code with a concrete trigger.

Overall the sync layer is unusually well-hardened (per-table watermarks with
-1 backoff, LWW gates on every food/workout applier, push-first sign-out guard,
fail-closed Article 9 gate, tombstone propagation). The findings below are the
residual gaps that survive that hardening. The two `major` items are genuine
data-loss / ownership paths; the rest are narrower.

---

## 1. [major][FOUNDER-DECISION] `src/lib/database.js:1691` — `runInTransaction` inline-reentrancy silently rolls back an unrelated concurrent write

```js
export async function runInTransaction(d, task) {
  const inTx = () => typeof d.isInTransactionSync === 'function' && d.isInTransactionSync();
  if (inTx()) return task();                    // <-- runs INLINE inside whatever tx is open
  const run = _txTail.then(() => (inTx() ? task() : d.withTransactionAsync(task)));
  ...
}
```

The reentrancy guard is designed for *nested* calls (a task that itself calls
`runInTransaction`). It cannot distinguish a nested call from an **independent
concurrent** call: both see `isInTransactionSync() === true`.

**Trigger (concrete sequence):**
1. Flow A calls `runInTransaction(d, taskA)` — e.g. `wipeAllUserData`, or the
   pull-side `applyMealPlanRowFromCloud` (both use `runInTransaction`). `inTx()`
   is false, so it enters `d.withTransactionAsync(taskA)`, which issues `BEGIN`
   and then awaits taskA's first `runAsync`.
2. During that await, Flow B (a different async context — e.g. the user tapping
   Save, driving `saveActiveMealPlan` → `runInTransaction(d, taskB)`) runs its
   synchronous entry. A transaction is now open, so `if (inTx()) return task()`
   fires and **taskB executes inline, immediately, inside A's transaction**.
   taskB resolves; B's caller sees success.
3. taskA then throws (a constraint hit, a mid-wipe error, `withTransactionAsync`
   rolls back with `ROLLBACK`). **taskB's writes are rolled back with it**, but
   B's caller already observed a resolved promise.

**Failure:** a save the user was told succeeded is silently discarded, with no
error surfaced to its caller. During a `wipeAllUserData` rollback the inlined
write can also be swept into the wipe. This is a real (timing-dependent) data-loss
race on the primitive every DB write in the app funnels through.

**Minimal fix:** distinguish true nesting from concurrent entry — e.g. track an
explicit "I own the current tx" flag set only by the `withTransactionAsync`
branch, and route a call that arrives while a *foreign* tx is open through
`_txTail` (queue it) instead of inlining. Tagged FOUNDER-DECISION because it
changes the behaviour of the shared transaction primitive and re-introduces the
deadlock surface the inline path was added to avoid; needs a deliberate design
call + test plan.

---

## 2. [major][FOUNDER-DECISION] cross-user wipe safety net is disarmed by `AsyncStorage.clear()` when the SQLite wipe fails — `src/store/useAppStore.js:431-447` + `src/navigation/RootNavigator.js:1163-1175`

Sign-out order in `clearAuthStateForSignOut`:
- line 431-432: `await wipeAllUserData(prevUid)` — on failure the catch **logs
  and continues** ("if wipe partly fails ... next sign-in's cross-user-wipe path
  is the safety net").
- line 447: `await AsyncStorage.clear()` — clears **all** keys, including
  `@volyume_last_supabase_user_id`.

The "safety net" it defers to (`RootNavigator.js:1163`) reads exactly that key:
```js
const lastSignedInUserId = await AsyncStorage.getItem('@volyume_last_supabase_user_id')...
if (lastSignedInUserId && lastSignedInUserId !== session.user.id) { await wipeAllUserData(lastSignedInUserId); }
```
The marker is only ever (re)written on sign-*in* (line 1175). So once
`AsyncStorage.clear()` runs, the marker is gone until the next successful sign-in.

**Trigger:** user A signs out; `wipeAllUserData(A)` throws (e.g. a locked DB, an
FTS-rebuild error, an interrupted transaction) and is swallowed; `AsyncStorage.clear()`
then succeeds and erases the last-user marker. User B signs in on the same
device: `lastSignedInUserId` is null, so the cross-user wipe **does not run**.

**Failure:** user A's user-scoped rows (food diary = Article 9 health data,
weights, ED-pattern flags, etc.) physically remain in the local encrypted DB
under A's `user_id`. They are not shown in B's queries (which filter by B's id),
so this is data *remanence*, not an active in-UI leak — but it violates the
locked invariant "sign-out wipes EVERY user-scoped table"
(IDENTITY_AND_OWNERSHIP_LOCKED.md) and the GDPR minimisation posture. The net
only self-heals the crash-*before*-clear case, not the wipe-failed-then-cleared
case.

**Minimal fix:** write `@volyume_last_supabase_user_id = prevUid` (or a dedicated
"pending wipe" key) *before* `AsyncStorage.clear()`, or re-persist it immediately
after clear, so the sign-in net can still fire; alternatively retry
`wipeAllUserData` before clearing. Tagged FOUNDER-DECISION: touches the
identity/ownership-locked wipe contract + GDPR.

---

## 3. [minor][SAFE-FIX] `src/lib/database.js:1944` & `:1962` — hard-delete of a workout + its sets is two unwrapped statements (persistDays pattern)

```js
export async function deleteIncompleteWorkout(workoutId) {
  await d.runAsync('DELETE FROM workout_sets WHERE workout_id = ?', [workoutId]);   // (a)
  await d.runAsync('DELETE FROM workouts WHERE id = ? AND is_completed = 0', [workoutId]); // (b)
}
export async function deleteWorkoutAndSets(userId, workoutId) {
  ...
  await d.runAsync('DELETE FROM workout_sets WHERE workout_id = ?', [workoutId]);   // (a)
  await d.runAsync('DELETE FROM workouts WHERE id = ?', [workoutId]);               // (b)
}
```

Neither pair is inside `runInTransaction`, so (a) and (b) auto-commit
independently.

**Trigger:** app is killed / process dies between (a) and (b) (OOM, force-quit,
crash on an unrelated effect).

**Failure:** `deleteWorkoutAndSets` leaves an orphan `workouts` row (a completed
session with zero sets) that still renders in history and is counted by
streak/frequency recomputes; `deleteIncompleteWorkout` leaves an orphan
`in_progress` workout with no sets. Self-heals only if the user deletes again.

**Minimal fix:** wrap each pair in `runInTransaction(d, ...)`, matching the
sibling delete paths (`deletePlanFolder`, `setRecipeIngredients`). Clear
defensive change in ordinary code.

---

## 4. [minor][SAFE-FIX] `src/lib/database.js:6316` (+ `src/lib/sync.js:1236-1247`) — a locally hard-deleted workout set is resurrected by a pull while its cloud-delete is still queued

`insertWorkoutSetFromCloud` LWW gate:
```js
const existing = await d.getFirstAsync('SELECT updated_at FROM workout_sets WHERE id = ?', [s.id]);
const localMs = existing?.updated_at ?? null;
if (localMs && cloudMs && localMs >= cloudMs) return;   // guard needs a LOCAL row
```
Local set deletion is a **hard** delete (`DELETE FROM workout_sets`), and the
cloud removal is deferred to a `workout_set_delete` queue op (`syncQueue.js`),
which can sit in backoff for minutes/hours.

**Trigger:** user deletes a set in-session (row hard-deleted locally, cloud
delete enqueued and pending). A foreground pull (`pullFromCloud` → the second
sets pass) fetches that workout's sets from cloud, which still has the row.
`localMs` is null (row is gone), so the `localMs && ...` guard is skipped and the
set is **re-inserted live**.

**Failure:** the deleted set reappears in the session until the queued
`workout_set_delete` op finally succeeds, transiently corrupting volume/PB
recomputes. Same shape applies to `deleteWorkoutFromCloud` for a whole session.

**Minimal fix:** have the sets pull filter `deleted_at IS NULL` server-side (like
the workouts query at `sync.js:1220`) AND/OR check the pending-delete queue
before re-inserting; long-term, move workout_sets to the soft-delete tombstone
model the food tables use.

---

## 5. [minor][SAFE-FIX] `src/lib/syncQueue.js:172,185,196` — malformed `payload` JSON strands a queue op through all 6 retries instead of dropping it

In `_runOp`, the `body_metric` / `morning_weight` / `check_in` cases do
`JSON.parse(row.payload)` inside the drain's outer try. A row whose `payload`
column is non-null but not valid JSON (a truncated write, a schema drift, a
hand-edited/older-build row) throws on every drain.

**Trigger:** a `pending_sync_ops` row with a corrupt `payload` string.

**Failure:** the op cannot ever succeed; it burns all `MAX_RETRIES` (6) attempts
with backoff and then parks with `retries >= MAX_RETRIES` and a JSON error in
`last_error`, inflating the "failed" queue-stat for good. Not data loss (the
underlying SQLite row is also pushed by the registry path), but permanent queue
noise and wasted retries.

**Minimal fix:** wrap the three `JSON.parse` calls in a try and `return true`
(drop the op) on a parse failure, matching the "unknown op → drop" philosophy
already used for `default`.

---

## Checked and found SOUND (no finding)

- **Food-domain shared push/pull watermark** (`foodDomain.js`): the `-1 ms`
  backoff on both sides + "advance only when every non-empty table succeeded"
  correctly prevents same-ms and partial-failure skips. The cross-table shared
  cursor cannot skip a row because every change column is a monotonic
  `Date.now()`/server-`now()` clock, so a new change is always strictly newer
  than the last batch's max. No data loss found.
- **Sign-out push-first guard** (`useAppStore.js:374`): correctly consumes the
  runner's real `errored_count` (verified `sync.js` re-exports the runner's
  `syncAll` via `sync/index.js`, so the field is populated, not `undefined`).
- **Sign-out wipe vs live sync race** (SYNC-3): `signOutGuard` + `whenSyncIdle`
  + the mid-loop `isSignOutWiping()` re-check in `runner.js:232` close the
  pull-back window; `_transportBlockedReason` fails closed on any store-read
  throw.
- **FTS injection** (`localCache.js:32` `toFtsMatch`): tokenises, strips quotes,
  wraps each token, and passes the result as a bound `?` parameter — not
  interpolated. Safe.
- **dbCrypto** (`dbCrypto.js`): `PRAGMA key = '${key}'` interpolates only a
  validated 64-hex value; the plaintext→encrypted swap preserves the original
  until the encrypted copy verifies, and recovers an interrupted swap without
  fabricating over the backup. No key/data-loss path found.
- **`profiles` merge** (`conflict.js:86` `mergeColumns`): the merged
  `column_updates_at` mislabels a server-won column with the client's older
  timestamp, but the value is written to the store WITHOUT `column_updates_at`
  and the next push rebuilds the map from `userProfileFieldUpdatedAt`, so the
  mislabel is inert. Not a bug.
- **Recent migrations 090/092/096-100/102**: all additive + idempotent
  (`ADD COLUMN IF NOT EXISTS`, `CREATE OR REPLACE`, `DROP POLICY IF EXISTS`, the
  guarded CHECK-constraint DO-block, `DROP FUNCTION IF EXISTS` before the single
  return-type change in 102). Deletion-promise trigger + RLS on
  `partner_shared_blocks` are correctly scoped. No non-additive statement found.
- **`wipeAllUserData` table coverage** (`WIPE_DIRECT_TABLES` + the FK-chain
  deletes + partner flat-wipe + FTS rebuild): every user-scoped local table is
  covered; the custom_foods FTS index is rebuilt so tokens don't bleed to the
  next account.

---

### Count by severity
- blocker: 0
- major: 2  (#1 runInTransaction reentrancy data-loss race; #2 cross-user wipe net disarmed on wipe-failure)
- minor: 3  (#3 unwrapped workout delete; #4 set resurrection on pull; #5 malformed-payload queue strand)

**DATA-LOSS paths flagged:** #1 (silent rollback of an unrelated committed-looking
write) and #2 (user-scoped rows — incl. Article 9 health data — persist locally
after a failed sign-out wipe with the recovery net disarmed).
