// Sync queue with exponential-backoff retry.
//
// Mutations that fail to ship to the cloud (offline, flaky connection,
// 5xx) are enqueued in SQLite's pending_sync_ops table. A drainer runs
// on app foreground (App.js AppState 'active' handler) and tries each
// pending op, advancing retries + next_attempt_at on failure.
//
// Without this, dropped syncs were silent data loss until the next
// sign-in cycle triggered a full bulkUploadLocalData catch-up, which
// the user discovered hours later on a different device.
//
// API surface:
//   enqueueSyncOp(opType, entityId, userId, payload)
//   drainSyncQueue(supabaseClient)       , called from AppState foreground
//   getQueueStats(userId)                , for UI badge
//   clearQueueForUser(userId)            , used by Settings → Delete account
//
// Backoff schedule (ms): 0 (immediate), 1min, 5min, 30min, 2h, 8h
// After MAX_RETRIES (6 attempts) the op stays in the table with the
// last_error so an admin / debug log can see what broke.

import { db } from './database';
import { logWarn, logError, logInfo } from './errorLog';

const MAX_RETRIES = 6;
const BACKOFFS_MS = [0, 60_000, 5 * 60_000, 30 * 60_000, 2 * 60 * 60_000, 8 * 60 * 60_000];

function uid() {
  return 'qxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/**
 * Enqueue an op for cloud sync. Caller has already written to local
 * SQLite, this is the retry-on-failure fallback for the cloud push.
 *
 * @param {string} opType    one of 'workout' | 'body_metric' | 'morning_weight' | 'check_in'
 * @param {string} entityId  the local SQLite row id we want to ship
 * @param {string} userId    supabase user.id
 * @param {object} payload   optional, extra data the worker needs (most ops
 *                           re-read from local SQLite by entityId so payload
 *                           can be null)
 */
export async function enqueueSyncOp(opType, entityId, userId, payload = null) {
  if (!opType || !entityId || !userId) return;
  try {
    const d = await db();
    await d.runAsync(
      `INSERT INTO pending_sync_ops (id, op_type, entity_id, user_id, payload, created_at, retries, next_attempt_at, last_error)
       VALUES (?, ?, ?, ?, ?, ?, 0, ?, NULL)`,
      [uid(), opType, entityId, userId, payload ? JSON.stringify(payload) : null, Date.now(), Date.now()],
    );
    logInfo('syncQueue.enqueue', `${opType} ${entityId}`);
  } catch (e) {
    logWarn('syncQueue.enqueue', e?.message, { opType, entityId });
  }
}

/**
 * Drain the queue for the signed-in user. Picks ops where
 * next_attempt_at <= now() and tries each one. Success → delete row.
 * Failure → increment retries, schedule next attempt by backoff.
 *
 * Wired into App.js's AppState 'active' handler so it runs whenever
 * the app comes to the foreground.
 *
 * @param {object} supabaseClient  authenticated supabase client
 * @param {string} userId          the current user.id
 * @returns {{ drained: number, failed: number, skipped: number }}
 */
export async function drainSyncQueue(supabaseClient, userId) {
  if (!supabaseClient || !userId) return { drained: 0, failed: 0, skipped: 0 };
  let drained = 0, failed = 0, skipped = 0;
  try {
    const d = await db();
    const now = Date.now();
    const rows = await d.getAllAsync(
      `SELECT * FROM pending_sync_ops
        WHERE user_id = ? AND next_attempt_at <= ? AND retries < ?
        ORDER BY created_at ASC
        LIMIT 50`,
      [userId, now, MAX_RETRIES],
    );
    for (const row of rows) {
      try {
        const ok = await _runOp(supabaseClient, row);
        if (ok) {
          await d.runAsync(`DELETE FROM pending_sync_ops WHERE id = ?`, [row.id]);
          drained++;
        } else {
          try { await _scheduleRetry(d, row, 'sync function returned false'); }
          catch (retryErr) { logWarn('syncQueue.retrySchedule', retryErr?.message ?? 'unknown', { id: row.id }); }
          failed++;
        }
      } catch (e) {
        // Belt-and-braces: a thrown _scheduleRetry was the only way an
        // error could escape this catch and tear down the entire drain
        // for every other queued op. Wrap it so a single bad row can't
        // strand the rest.
        try { await _scheduleRetry(d, row, e?.message ?? 'unknown error'); }
        catch (retryErr) { logWarn('syncQueue.retrySchedule', retryErr?.message ?? 'unknown', { id: row.id, originalError: e?.message }); }
        failed++;
      }
    }
    if (drained > 0 || failed > 0) {
      logInfo('syncQueue.drained', `drained=${drained} failed=${failed} skipped=${skipped}`);
    }
  } catch (e) {
    logError('syncQueue.drain', e, { userId });
  }
  return { drained, failed, skipped };
}

async function _scheduleRetry(d, row, errorMsg) {
  const nextRetries = row.retries + 1;
  if (nextRetries >= MAX_RETRIES) {
    await d.runAsync(
      `UPDATE pending_sync_ops SET retries = ?, last_error = ?, next_attempt_at = ? WHERE id = ?`,
      [nextRetries, String(errorMsg).slice(0, 500), Date.now() + 365 * 24 * 60 * 60_000, row.id],
    );
    logWarn('syncQueue.giveUp', `op ${row.op_type} ${row.entity_id} after ${nextRetries} retries`, { error: errorMsg });
    return;
  }
  const backoff = BACKOFFS_MS[nextRetries] ?? BACKOFFS_MS[BACKOFFS_MS.length - 1];
  await d.runAsync(
    `UPDATE pending_sync_ops SET retries = ?, last_error = ?, next_attempt_at = ? WHERE id = ?`,
    [nextRetries, String(errorMsg).slice(0, 500), Date.now() + backoff, row.id],
  );
}

// Per-op-type worker. Re-reads the entity from local SQLite to ensure
// we ship the freshest state (the user may have edited the row between
// the original failed sync and this retry).
async function _runOp(supabaseClient, row) {
  // eslint-disable-next-line global-require
  const sync = require('./sync');
  // Defensive: if the named sync function isn't exported (because an
  // older op_type made it into the queue before its sync impl existed)
  // drop the row rather than crash drain for everything else. Without
  // this guard, one rogue queue row halts ALL pending syncs.
  function safeCall(fn, ...args) {
    if (typeof fn !== 'function') {
      logWarn('syncQueue.missingFn', `no sync fn for ${row.op_type}`, { id: row.id });
      return null;
    }
    return fn(...args);
  }
  switch (row.op_type) {
    case 'workout':
      await safeCall(sync.syncWorkout, row.user_id, row.entity_id);
      return true;
    case 'body_metric': {
      const payload = row.payload ? JSON.parse(row.payload) : null;
      if (!payload) return true; // payload missing, treat as drained
      // Fall back to the bulk push when the dedicated sync fn is missing,
      // matching morning_weight / check_in below, so a renamed or removed
      // syncBodyMetric can't silently drop the op (audit B2).
      const r = safeCall(sync.syncBodyMetric, row.user_id, payload);
      if (r === null) await safeCall(sync.bulkUploadLocalData, row.user_id, row.user_id);
      else await r;
      return true;
    }
    case 'morning_weight': {
      const payload = row.payload ? JSON.parse(row.payload) : null;
      if (!payload) return true;
      // bulkUploadLocalData is the canonical path for morning weights;
      // a queued row falls back to that so a missing dedicated sync
      // function doesn't strand the row forever.
      const r = safeCall(sync.syncMorningWeight, row.user_id, payload);
      if (r === null) await safeCall(sync.bulkUploadLocalData, row.user_id, row.user_id);
      else await r;
      return true;
    }
    case 'check_in': {
      const payload = row.payload ? JSON.parse(row.payload) : null;
      if (!payload) return true;
      const r = safeCall(sync.syncCheckin, row.user_id, payload);
      if (r === null) await safeCall(sync.bulkUploadLocalData, row.user_id, row.user_id);
      else await r;
      return true;
    }
    default:
      logWarn('syncQueue.unknownOp', `unknown op_type=${row.op_type}`, { id: row.id });
      return true; // unknown op, drop it rather than retry forever
  }
}

/**
 * Stats for a UI indicator. Returns { pending, failed }.
 *   pending = ops still within retry budget
 *   failed  = ops that hit MAX_RETRIES
 */
export async function getQueueStats(userId) {
  if (!userId) return { pending: 0, failed: 0 };
  try {
    const d = await db();
    const [p, f] = await Promise.all([
      d.getFirstAsync(
        `SELECT COUNT(*) as c FROM pending_sync_ops WHERE user_id = ? AND retries < ?`,
        [userId, MAX_RETRIES],
      ),
      d.getFirstAsync(
        `SELECT COUNT(*) as c FROM pending_sync_ops WHERE user_id = ? AND retries >= ?`,
        [userId, MAX_RETRIES],
      ),
    ]);
    return { pending: p?.c ?? 0, failed: f?.c ?? 0 };
  } catch (_) {
    return { pending: 0, failed: 0 };
  }
}

/**
 * Clear the queue for one user. Called when the user deletes their
 * account so we don't try to ship ops for a uid that no longer exists.
 */
export async function clearQueueForUser(userId) {
  if (!userId) return;
  try {
    const d = await db();
    await d.runAsync(`DELETE FROM pending_sync_ops WHERE user_id = ?`, [userId]);
  } catch (_) {}
}
