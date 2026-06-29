/**
 * sync_queue: client-side SQLite table that records every local
 * mutation to a syncable table. Schema locked in
 * DATABASE_SCHEMA_LOCKED.md lines 484-495 and SYNC_ARCHITECTURE_LOCKED.md
 * lines 197-211.
 *
 * The runner reads pending rows, attempts the Supabase push, removes
 * on success or increments attempt_count on failure with exponential
 * backoff (2s, 4s, 8s, 16s, 32s, cap 5 minutes).
 *
 * Compaction: two updates to the same record with no intervening
 * sync collapse to one row; deletes supersede prior updates.
 *
 * This module is the CRUD surface only. The runner and transport
 * modules consume it. Lives in SQLite only; never synced to cloud.
 */

import { db as getDb, runInTransaction } from '../database';

const BACKOFF_MS = [2_000, 4_000, 8_000, 16_000, 32_000, 64_000, 128_000, 256_000, 300_000];

function backoffForAttempt(attemptCount) {
  if (attemptCount <= 0) return 0;
  const idx = Math.min(attemptCount - 1, BACKOFF_MS.length - 1);
  return BACKOFF_MS[idx];
}

/**
 * Ensure the sync_queue table exists. Called once at boot from the
 * sync runner. Safe to call repeatedly (IF NOT EXISTS).
 */
export async function ensureSyncQueueTable() {
  const d = await getDb();
  if (!d) return;
  await d.execAsync(`
    CREATE TABLE IF NOT EXISTS sync_queue (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      table_name    TEXT NOT NULL,
      operation     TEXT NOT NULL CHECK (operation IN ('insert','update','delete')),
      record_id     TEXT NOT NULL,
      payload_json  TEXT NOT NULL,
      queued_at     TEXT NOT NULL,
      attempt_count INTEGER NOT NULL DEFAULT 0,
      last_error    TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_sync_queue_table_record
      ON sync_queue(table_name, record_id);
    CREATE INDEX IF NOT EXISTS idx_sync_queue_queued
      ON sync_queue(queued_at);
  `);
}

/**
 * Enqueue a local mutation. Performs compaction in the same
 * transaction: if a pending row already exists for
 * (table_name, record_id), it is replaced (delete > update > insert
 * supersedes earlier states).
 */
export async function enqueue({ table, operation, recordId, payload }) {
  if (!table || !operation || !recordId) {
    throw new Error('sync_queue.enqueue: table, operation, recordId required');
  }
  const d = await getDb();
  if (!d) return;
  const queuedAt = new Date().toISOString();
  const payloadJson = JSON.stringify(payload ?? {});
  await runInTransaction(d, async () => {
    // Compaction: delete supersedes everything earlier for this row.
    if (operation === 'delete') {
      await d.runAsync(
        `DELETE FROM sync_queue WHERE table_name = ? AND record_id = ?`,
        [table, String(recordId)],
      );
    } else {
      // Update / insert: drop earlier pending updates/inserts for the
      // same row. Keep prior deletes (they take precedence and
      // running the new row would re-create what the user deleted).
      await d.runAsync(
        `DELETE FROM sync_queue WHERE table_name = ? AND record_id = ? AND operation IN ('insert','update')`,
        [table, String(recordId)],
      );
    }
    await d.runAsync(
      `INSERT INTO sync_queue (table_name, operation, record_id, payload_json, queued_at)
       VALUES (?, ?, ?, ?, ?)`,
      [table, operation, String(recordId), payloadJson, queuedAt],
    );
  });
}

/**
 * List rows currently eligible for push: attempt_count's exponential
 * backoff has elapsed since queued_at + (attempt_count * step). Cap
 * at `limit` rows so a runaway push can't lock the runner.
 */
export async function listPending({ limit = 200 } = {}) {
  const d = await getDb();
  if (!d) return [];
  const rows = await d.getAllAsync(
    `SELECT id, table_name, operation, record_id, payload_json, queued_at, attempt_count, last_error
     FROM sync_queue
     ORDER BY queued_at ASC
     LIMIT ?`,
    [limit],
  );
  const now = Date.now();
  // D1-#12 (FOUNDER DECISION NEEDED — documented, not fixed): backoff is
  // measured from `queued_at` (row birth), not the last attempt. Because the
  // backoff caps at 5 min, a permanently-failing row older than that is
  // eligible on EVERY cycle regardless of attempt_count — true exponential
  // backoff only holds for the row's first ~5 min of life. This is LATENT
  // today (sync_queue has no drainer, so nothing consumes these rows). The
  // correct fix is to add a `last_attempt_at` column, set it in markFailed,
  // and measure backoff from it here. That needs a schema column, so it is
  // flagged for founder and NOT changed now.
  return rows.filter(r => {
    if ((r.attempt_count ?? 0) === 0) return true;
    const queuedMs = Date.parse(r.queued_at) || 0;
    return now - queuedMs >= backoffForAttempt(r.attempt_count);
  });
}

/**
 * Total queue depth (including rows still in backoff). Surfaced to
 * the sync status indicator in the UI.
 */
export async function getQueueDepth() {
  const d = await getDb();
  if (!d) return 0;
  const row = await d.getFirstAsync(`SELECT COUNT(*) AS n FROM sync_queue`);
  return Number(row?.n ?? 0);
}

export async function markSucceeded(ids) {
  if (!ids || ids.length === 0) return;
  const d = await getDb();
  if (!d) return;
  const placeholders = ids.map(() => '?').join(',');
  await d.runAsync(`DELETE FROM sync_queue WHERE id IN (${placeholders})`, ids);
}

export async function markFailed(id, errorMessage) {
  if (!id) return;
  const d = await getDb();
  if (!d) return;
  await d.runAsync(
    `UPDATE sync_queue
     SET attempt_count = attempt_count + 1,
         last_error = ?
     WHERE id = ?`,
    [String(errorMessage ?? '').slice(0, 500), id],
  );
}

export async function clearQueue() {
  const d = await getDb();
  if (!d) return;
  await d.runAsync(`DELETE FROM sync_queue`);
}

// Drop every queued row for one table. Used to clear rows the old build
// enqueued for notification_preferences: that table syncs through its own
// registry handler and sync_queue has no drainer, so those rows were never
// consumed and only inflated getQueueDepth() (the "N changes waiting to
// upload" line). Safe to call on every run; once cleared it is a no-op.
export async function purgeQueuedTable(tableName) {
  if (!tableName) return;
  const d = await getDb();
  if (!d) return;
  await d.runAsync(`DELETE FROM sync_queue WHERE table_name = ?`, [tableName]);
}
