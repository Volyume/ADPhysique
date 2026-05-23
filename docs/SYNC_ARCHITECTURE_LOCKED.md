# Sync architecture (locked)

Hand-rolled offline-first sync on top of existing expo-sqlite +
Supabase REST. Principle and triggers locked in
`PRODUCTION_READINESS_LOCKED.md` Section 1. This doc names the
implementation. Locked 2026-05-23.

## Module structure

```
src/lib/sync/
├── index.js              -- public API: syncAll(), syncTable(name), getStatus()
├── registry.js           -- the table registry
├── runner.js             -- the sync loop (pull + push per table)
├── queue.js              -- sync_queue CRUD on SQLite
├── conflict.js           -- conflict resolution per table
├── transport.js          -- Supabase RPC calls (food_sync_pull, food_sync_push)
└── telemetry.js          -- emit sync events to Sentry + engine_telemetry_daily
```

## The table registry

A single file lists every syncable table with its sync metadata.
Adding a new table to the registry is the only step required to
bring it into sync.

```js
// src/lib/sync/registry.js
export const SYNC_REGISTRY = [
  {
    table: 'weekly_checkins_v2',
    pk: 'id',
    conflictStrategy: 'last_write_wins',
    serverAuthoritative: false,
    softDelete: false,
    direction: 'bidirectional',
  },
  {
    table: 'weight_log',
    pk: 'id',
    conflictStrategy: 'last_write_wins',
    serverAuthoritative: false,
    softDelete: false,
    direction: 'bidirectional',
  },
  {
    table: 'food_entries',
    pk: 'id',
    conflictStrategy: 'last_write_wins',
    serverAuthoritative: false,
    softDelete: true,
    direction: 'bidirectional',
  },
  {
    table: 'custom_foods',
    pk: 'id',
    conflictStrategy: 'last_write_wins',
    serverAuthoritative: false,
    softDelete: true,
    direction: 'bidirectional',
  },
  {
    table: 'saved_meals',
    pk: 'id',
    conflictStrategy: 'last_write_wins',
    serverAuthoritative: false,
    softDelete: true,
    direction: 'bidirectional',
  },
  {
    table: 'recipes',
    pk: 'id',
    conflictStrategy: 'last_write_wins',
    serverAuthoritative: false,
    softDelete: true,
    direction: 'bidirectional',
  },
  {
    table: 'recipe_ingredients',
    pk: 'id',
    conflictStrategy: 'last_write_wins',
    serverAuthoritative: false,
    softDelete: false,
    direction: 'bidirectional',
  },
  {
    table: 'food_favourites',
    pk: ['user_id','food_ref'],
    conflictStrategy: 'last_write_wins',
    serverAuthoritative: false,
    softDelete: false,
    direction: 'bidirectional',
  },
  {
    table: 'daily_water',
    pk: ['user_id','entry_date'],
    conflictStrategy: 'last_write_wins',
    serverAuthoritative: false,
    softDelete: false,
    direction: 'bidirectional',
  },
  {
    table: 'daily_intake_rollups',
    pk: ['user_id','entry_date'],
    conflictStrategy: 'server_wins',
    serverAuthoritative: true,
    softDelete: false,
    direction: 'pull_only',
  },
  {
    table: 'ed_pattern_flags',
    pk: 'id',
    conflictStrategy: 'server_wins',
    serverAuthoritative: true,
    softDelete: false,
    direction: 'pull_only',
  },
  {
    table: 'tier_history',
    pk: 'id',
    conflictStrategy: 'server_wins',
    serverAuthoritative: true,
    softDelete: false,
    direction: 'pull_only',
  },
  // photo_progress is client-side SQLite only; not in the sync
  // registry. Photos never leave the device. See
  // BUDGET_POSTURE_LOCKED.md.
  {
    table: 'body_composition_log',
    pk: 'id',
    conflictStrategy: 'last_write_wins',
    serverAuthoritative: false,
    softDelete: true,
    direction: 'bidirectional',
  },
  {
    table: 'nutrition_targets',
    pk: 'user_id',
    conflictStrategy: 'server_wins',
    serverAuthoritative: true,
    softDelete: false,
    direction: 'pull_only',
  },
  {
    table: 'profiles',
    pk: 'id',
    conflictStrategy: 'merge',         // profile column merge, see below
    serverAuthoritative: false,
    softDelete: false,
    direction: 'bidirectional',
  },
];
```

## Sync triggers

All four triggers route through the same `syncAll()` entry point.
The runner deduplicates concurrent calls via a single in-memory lock.

| Trigger | When |
| --- | --- |
| App foreground | `AppState` listener fires `'active'` |
| Network reconnect | `NetInfo` listener fires `isConnected: true` after offline |
| Local write (debounced 2s) | After any insert/update/delete on a syncable table |
| Periodic | Every 15 minutes while the app is open |

The debounced-on-write trigger uses a single timer. Multiple writes
within 2s collapse to one sync call.

## Conflict resolution per strategy

### `last_write_wins`

Server tracks `updated_at`. On push, the server compares incoming
`updated_at` against current row. If incoming is newer, write wins.
If incoming is older, server rejects and returns the server row;
client overwrites local.

### `server_wins`

Pull-only. Client never pushes. The server is the source of truth
for derived state (`daily_intake_rollups`, `ed_pattern_flags`,
`tier_history`).

### `merge`

For `profiles` only. Columns are merged on a per-column basis using
`updated_at` plus a `column_updates_at jsonb` map on the server row.
Client writes carry the columns they changed and the timestamp of
each change. Server merges, keeping the most-recent per column.

This avoids the classic "user changes notification setting on phone
A, simultaneously changes name on phone B, last-write-wins clobbers
one of the two" problem.

## Sync queue

Client-side SQLite table (`sync_queue`). Every local mutation to a
syncable table writes a row to `sync_queue` in the same transaction
as the data write. The sync runner reads pending rows, attempts the
push, removes on success or increments `attempt_count` on failure
with exponential backoff (2s, 4s, 8s, 16s, 32s, cap at 5 minutes).

Queue is unbounded but compacted: if the queue contains two updates
to the same record with no intervening sync, the older row is
removed. Deletes supersede prior updates for the same record.

Queue surfaces in the UI as a "Pending changes" count behind the
sync status indicator.

## Pull flow

1. Read `last_pulled_at` from `profiles.last_pulled_at` (or `0` on
   first run).
2. Call `food_sync_pull(last_pulled_at)` via Supabase RPC.
3. For each table in the response:
   - Apply inserts to SQLite.
   - Apply updates (last-write-wins by `updated_at`).
   - Apply deletes (hard-delete locally if `direction = 'pull_only'`
     or soft-delete if `softDelete = true`).
4. Update `profiles.last_pulled_at` to the response `timestamp`.
5. Emit telemetry: rows pulled per table, duration.

## Push flow

1. Read pending rows from `sync_queue`, grouped by table.
2. Build the `changes_json` payload in the food_sync_push shape.
3. Call `food_sync_push(changes)` via Supabase RPC.
4. For accepted records, update local row with returned
   `updated_at`. Remove from `sync_queue`.
5. For rejected records (server had newer), overwrite local from
   the returned server row. Remove from `sync_queue`.
6. For errored records, increment `attempt_count`, set `last_error`,
   leave in queue.
7. Emit telemetry: rows pushed, accepted, rejected, errored,
   duration.

## Multi-device support

On first run after sign-in:

1. Set `last_pulled_at = 0`.
2. Run a full pull (returns every row from every table the user owns).
3. Insert all into SQLite.
4. Set `last_pulled_at` to response timestamp.

Bounded by pagination (Supabase RPC returns at most 1000 rows per
table per call; runner loops until empty). For a heavy user with 12
months of food entries (5000+ rows), full pull takes 5-15 seconds on
4G. Surfaced as a "Restoring your data" splash on first run.

Subsequent device opens do an incremental pull as normal.

## Soft-delete tombstones

For tables with `softDelete: true`:

- Local delete sets `deleted_at` and queues an UPDATE.
- Server receives the update and propagates the soft-delete to
  other devices.
- Hard-delete (table compaction) runs server-side as a scheduled job
  30 days after `deleted_at`. Client never hard-deletes user data.

## Sync status UI

A single status indicator in the navigation header shows one of:

- **Synced** — last sync within 60s, queue empty, no errors.
- **Pending** — queue has entries waiting to push.
- **Offline** — network unavailable.
- **Error** — last sync failed; tap for details.

Tappable. Tap opens a sheet with: last sync timestamp, queue depth,
last error (if any), manual "Sync now" button, "Force full pull"
button (advanced; clears `last_pulled_at` and re-pulls everything).

## Telemetry events

Every sync attempt emits one structured event:

```js
{
  event: 'sync_run',
  status: 'success' | 'partial' | 'failure',
  duration_ms: 1234,
  triggered_by: 'foreground' | 'network' | 'write' | 'periodic' | 'manual',
  pull_count_per_table: { food_entries: 12, weight_log: 0, ... },
  push_count_per_table: { food_entries: 3, ... },
  rejected_count: 0,
  errored_count: 0,
  queue_depth_before: 3,
  queue_depth_after: 0,
}
```

Sent to Sentry as a breadcrumb, aggregated daily into
`engine_telemetry_daily.sync_*` fields (added in `migrate_006`).

## Test matrix

Each table in the registry has a paired regression test:

1. Local insert -> sync -> remote contains row.
2. Local update -> sync -> remote reflects update.
3. Local soft-delete -> sync -> remote shows `deleted_at`.
4. Remote insert (via service role) -> sync -> local contains row.
5. Conflict (local + remote both modified) -> last-write-wins applies.
6. Network failure mid-push -> queue retained -> retry succeeds.

Two-device test:

7. Device A inserts, syncs. Device B foregrounds within 60s ->
   row appears.
8. Device A and B insert simultaneously offline -> both reconnect
   -> both rows present, ordered by their respective `created_at`.

Performance tests:

9. Sync 50 entries on simulated 4G: under 2s p95.
10. Full pull of 5000 rows on 4G: under 15s p95.
11. Sync queue with 200 pending entries flushes in under 8s.

## Failure modes and handling

- **Network drops mid-push**: queue retained, retry on next trigger.
- **Server returns 401**: refresh auth token, retry once, then bubble
  up to the auth flow if still 401.
- **Server returns 5xx**: backoff, retry up to attempt_count = 5,
  then surface as "Error" status with the last error message.
- **Schema mismatch (client has new column server doesn't)**: server
  ignores unknown columns. Client ignores missing columns on pull.
- **Clock skew**: server timestamps are authoritative. Client never
  trusts its own clock for conflict resolution.

## What this does not cover

- Realtime updates (Supabase Realtime channels). Out of scope for v1.
  Sync is polled. Realtime is a v1.1 candidate for the coach surface
  (where multi-user-on-one-record edits matter).
- Conflict-free replicated data types (CRDTs). Overkill at v1 scale.
- Differential sync (only the changed fields). The whole row pulls
  on update. Acceptable at row sizes we have.

## Acceptance check

- Sync runner survives airplane mode -> foreground -> typed entries
  -> network restored -> all entries on server within 60s.
- Two-device test 7 above passes manually before move #1 ships.
- Performance tests 9-11 pass in CI before move #1 ships.
- Sync status indicator visible from every primary tab.
