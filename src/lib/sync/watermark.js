/**
 * sync/watermark.js
 *
 * Per-table pull watermarks for incremental delta sync (GAP row 12b).
 *
 * The legacy pullFromCloud re-pulled every row of the heavy training
 * tables (workouts, workout_sets, routines, ...) on every foreground,
 * which grows without bound as a user's history grows. migrate_012
 * already added updated_at + a (user_id, updated_at DESC) index to those
 * tables, so a pull can ask the cloud for only rows changed since the
 * last pull. This module stores that "last pulled" timestamp per
 * (user, table) and computes how far to advance it.
 *
 * Self-healing by design: the watermark lives in AsyncStorage, which
 * sign-out clears (the wipe hammer), so the next sign-in has no cursor
 * and does a FULL pull. Any row an incremental pass could theoretically
 * miss (cross-device clock skew) is recovered then. The fast path only
 * ever skips re-pulling rows we already have.
 *
 * Advancement rule: newCursor = max(existing, max updated_at received).
 * The query uses `.gte(cursorIso)` so the boundary row is re-pulled
 * (an idempotent INSERT OR REPLACE), which means a row written with the
 * exact boundary timestamp is never skipped.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export const PULL_WM_PREFIX = '@volyume_pull_wm_';
export const PUSH_WM_PREFIX = '@volyume_push_wm_';

function key(userId, table) {
  return `${PULL_WM_PREFIX}${userId}_${table}`;
}

function pushKey(userId, table) {
  return `${PUSH_WM_PREFIX}${userId}_${table}`;
}

/** Parse an ISO/ms timestamp to ms, or 0 when unusable. */
export function toMs(t) {
  if (t == null) return 0;
  if (typeof t === 'number') return Number.isFinite(t) ? t : 0;
  const p = Date.parse(t);
  return Number.isFinite(p) ? p : 0;
}

/** ISO string for a ms value (the shape PostgREST `.gte` expects). */
export function isoFromMs(ms) {
  return new Date(ms).toISOString();
}

/**
 * Highest updated_at (in ms) across a row set, 0 if none. Tolerant of
 * snake_case rows (updated_at) straight off PostgREST.
 */
export function maxUpdatedAtMs(rows, field = 'updated_at') {
  if (!Array.isArray(rows)) return 0;
  let max = 0;
  for (const r of rows) {
    const ms = toMs(r?.[field]);
    if (ms > max) max = ms;
  }
  return max;
}

/**
 * The cursor to advance to after a pull: never moves backwards.
 */
export function nextWatermark(existingMs, receivedRows, field = 'updated_at') {
  return Math.max(toMs(existingMs), maxUpdatedAtMs(receivedRows, field));
}

/** Read the stored pull watermark (ms) for a table, 0 when absent. */
export async function getPullWatermark(userId, table) {
  if (!userId || !table) return 0;
  try {
    const raw = await AsyncStorage.getItem(key(userId, table));
    return toMs(raw ? Number(raw) : 0);
  } catch {
    return 0;
  }
}

/** Persist the pull watermark (ms) for a table. Never throws. */
export async function setPullWatermark(userId, table, ms) {
  if (!userId || !table || !Number.isFinite(ms) || ms <= 0) return;
  try {
    await AsyncStorage.setItem(key(userId, table), String(ms));
  } catch { /* tolerate */ }
}

/**
 * Push watermarks mirror the pull ones but track the highest updated_at
 * we have already pushed to cloud for a table, so a repeat syncAll
 * (foreground, reconnect, 15-min timer) doesn't re-upsert the entire
 * history every cycle. Only ever advanced after a CLEAN push (zero
 * failures), so a row that failed to upload is retried next cycle rather
 * than skipped. Same self-healing property as the pull side: sign-out
 * clears AsyncStorage, so the next sign-in has no cursor and pushes
 * everything. Safe only for tables whose rows are immutable once
 * pushed (e.g. completed workouts + their sets); do not key it on a
 * table whose rows can change without their updated_at advancing.
 */
export async function getPushWatermark(userId, table) {
  if (!userId || !table) return 0;
  try {
    const raw = await AsyncStorage.getItem(pushKey(userId, table));
    return toMs(raw ? Number(raw) : 0);
  } catch {
    return 0;
  }
}

/** Persist the push watermark (ms) for a table. Never throws. */
export async function setPushWatermark(userId, table, ms) {
  if (!userId || !table || !Number.isFinite(ms) || ms <= 0) return;
  try {
    await AsyncStorage.setItem(pushKey(userId, table), String(ms));
  } catch { /* tolerate */ }
}
