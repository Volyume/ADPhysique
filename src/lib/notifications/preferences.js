/**
 * Local SQLite mirror of the cloud notification_preferences table
 * (migration 044). Per NOTIFICATIONS_LOCKED.md lines 117-119, the
 * preferences must sync via the registry. NotificationSettingsScreen
 * has historically stored prefs as a single JSON blob in AsyncStorage
 * under '@volyume_notification_prefs'; this module gives every
 * category its own row + updated_at so sync's last-write-wins resolver
 * can do its job per row, and so the cloud table actually has
 * something to receive.
 *
 * Schema mirrors migration 044 (composite PK (user_id, category)) plus
 * an updated_at integer for sync ordering. Categories are the strings
 * from src/lib/notifications/categories.js plus the legacy ones the
 * screen still uses.
 *
 * Sync direction:
 *   - NotificationSettingsScreen calls setPreference() whenever a
 *     toggle or time picker changes; the row is upserted in SQLite
 *     with updated_at = Date.now().
 *   - src/lib/sync.js bulkUploadLocalData pushes any rows with
 *     updated_at > server's last-seen timestamp via PostgREST upsert.
 *   - Pulls are server-wins-by-updated_at per the registry entry
 *     (last_write_wins, bidirectional).
 */

import { db as getDb } from '../database';

const TABLE = 'notification_preferences';

/**
 * Idempotent table create. Called lazily before any read/write so
 * an install that pre-dates this module still works on first access
 * without a separate schema migration step.
 */
export async function ensureTable() {
  const d = await getDb();
  if (!d) return;
  await d.execAsync(`
    CREATE TABLE IF NOT EXISTS ${TABLE} (
      user_id      TEXT NOT NULL,
      category     TEXT NOT NULL,
      enabled      INTEGER NOT NULL DEFAULT 1,
      time_pref    TEXT,
      updated_at   INTEGER NOT NULL,
      PRIMARY KEY (user_id, category)
    );
    CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_updated
      ON ${TABLE}(user_id, updated_at DESC);
  `);
}

/**
 * Upsert a single preference from a USER action (toggle, time
 * picker, etc.). Bumps updated_at to now and enqueues into
 * sync_queue so the registry-driven push picks it up.
 *
 * For applying rows pulled from the cloud, use
 * applyPreferenceFromPull() instead, it preserves the server
 * updated_at so a pulled row does not echo back to the cloud as
 * a fresh local write.
 */
export async function setPreference(userId, category, { enabled, time_pref }) {
  if (!userId || !category) return;
  await ensureTable();
  const d = await getDb();
  if (!d) return;
  const updatedAt = Date.now();
  await d.runAsync(
    `INSERT INTO ${TABLE} (user_id, category, enabled, time_pref, updated_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(user_id, category) DO UPDATE SET
       enabled    = excluded.enabled,
       time_pref  = excluded.time_pref,
       updated_at = excluded.updated_at`,
    [
      String(userId),
      String(category),
      enabled ? 1 : 0,
      time_pref == null ? null : String(time_pref),
      updatedAt,
    ],
  );
  // No sync_queue enqueue here. notification_preferences pushes through its
  // own registry handler (src/lib/sync/tables, pushNotificationPreferences),
  // which reads the table directly, and bulk_upload ships the whole table on
  // sign-in. sync_queue has no drainer, so an enqueue here was never consumed:
  // it only inflated getQueueDepth(), which left the Settings sync line stuck
  // on "N changes waiting to upload" forever after any preference toggle. The
  // runner purges any rows left by the old build (see purgeQueuedTable).
}

/**
 * Apply a row pulled from the cloud. Preserves the server
 * `updated_at` so the row does not look like a fresh local write
 * on the next push round. Does NOT enqueue into sync_queue.
 *
 * Last-write-wins: only overwrites the local row when the
 * incoming server updated_at is strictly newer. This prevents a
 * stale cloud snapshot from clobbering a more-recent local edit
 * that hasn't yet been pushed.
 *
 * Codex re-audit 2026-05-26 finding #4: the previous
 * implementation called setPreference() on pulled rows, which
 * stamped updated_at = Date.now() and could echo back as a fresh
 * write or clobber newer cloud changes.
 */
export async function applyPreferenceFromPull(userId, category, { enabled, time_pref, updated_at }) {
  if (!userId || !category) return false;
  const serverUpdatedAt = Number(updated_at);
  if (!Number.isFinite(serverUpdatedAt) || serverUpdatedAt <= 0) return false;
  await ensureTable();
  const d = await getDb();
  if (!d) return false;
  // Only overwrite when the server row is strictly newer than
  // what we already have. SQLite ON CONFLICT WHERE clause does
  // this conditionally without a read-modify-write race.
  const result = await d.runAsync(
    `INSERT INTO ${TABLE} (user_id, category, enabled, time_pref, updated_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(user_id, category) DO UPDATE SET
       enabled    = excluded.enabled,
       time_pref  = excluded.time_pref,
       updated_at = excluded.updated_at
     WHERE excluded.updated_at > ${TABLE}.updated_at`,
    [
      String(userId),
      String(category),
      enabled ? 1 : 0,
      time_pref == null ? null : String(time_pref),
      serverUpdatedAt,
    ],
  );
  return result?.changes > 0;
}

/**
 * Read a single category for a user. Returns null if no row.
 */
export async function getPreference(userId, category) {
  if (!userId || !category) return null;
  await ensureTable();
  const d = await getDb();
  if (!d) return null;
  const row = await d.getFirstAsync(
    `SELECT user_id, category, enabled, time_pref, updated_at
     FROM ${TABLE}
     WHERE user_id = ? AND category = ?`,
    [String(userId), String(category)],
  );
  if (!row) return null;
  return {
    user_id: row.user_id,
    category: row.category,
    enabled: !!row.enabled,
    time_pref: row.time_pref,
    updated_at: Number(row.updated_at),
  };
}

/**
 * Read every preference for a user. Used by the sync push path
 * to compute the changeset.
 */
export async function getAllPreferences(userId) {
  if (!userId) return [];
  await ensureTable();
  const d = await getDb();
  if (!d) return [];
  const rows = await d.getAllAsync(
    `SELECT user_id, category, enabled, time_pref, updated_at
     FROM ${TABLE}
     WHERE user_id = ?
     ORDER BY updated_at DESC`,
    [String(userId)],
  );
  return rows.map(r => ({
    user_id: r.user_id,
    category: r.category,
    enabled: !!r.enabled,
    time_pref: r.time_pref,
    updated_at: Number(r.updated_at),
  }));
}

/**
 * Read every preference updated since a given timestamp. Used by
 * the sync push path to compute the delta.
 */
export async function getPreferencesUpdatedSince(userId, sinceMs) {
  if (!userId) return [];
  await ensureTable();
  const d = await getDb();
  if (!d) return [];
  const since = Number.isFinite(sinceMs) ? Number(sinceMs) : 0;
  const rows = await d.getAllAsync(
    `SELECT user_id, category, enabled, time_pref, updated_at
     FROM ${TABLE}
     WHERE user_id = ? AND updated_at > ?
     ORDER BY updated_at ASC`,
    [String(userId), since],
  );
  return rows.map(r => ({
    user_id: r.user_id,
    category: r.category,
    enabled: !!r.enabled,
    time_pref: r.time_pref,
    updated_at: Number(r.updated_at),
  }));
}

/**
 * One-shot migration from the legacy AsyncStorage JSON blob into
 * the per-category SQLite rows. Safe to call repeatedly, each
 * category lands once and subsequent calls become no-ops because
 * setPreference is an UPSERT and the screen continues to drive
 * updates via the same setPreference path.
 *
 * Categories mapped from the legacy keys:
 *   morningEnabled        → morning_weight   time_pref = HH:MM
 *   checkinEnabled        → weekly_checkin_reminder time_pref = dow_HH:MM
 *   trainingEnabled       → training_reminder (no time_pref; per-day schedule lives in legacy keys)
 */
export async function migrateFromLegacyBlob(userId, legacyBlob) {
  if (!userId || !legacyBlob || typeof legacyBlob !== 'object') return;
  const now = Date.now();
  const ops = [];
  if (legacyBlob.morningEnabled !== undefined) {
    const t = (legacyBlob.morningHour ?? 8).toString().padStart(2, '0')
      + ':' + (legacyBlob.morningMinute ?? 0).toString().padStart(2, '0');
    ops.push(['morning_weight', !!legacyBlob.morningEnabled, t]);
  }
  if (legacyBlob.checkinEnabled !== undefined) {
    const dow = ['sun','mon','tue','wed','thu','fri','sat'][legacyBlob.checkinDay ?? 0];
    const t = (legacyBlob.checkinHour ?? 18).toString().padStart(2, '0')
      + ':' + (legacyBlob.checkinMinute ?? 0).toString().padStart(2, '0');
    ops.push(['weekly_checkin_reminder', !!legacyBlob.checkinEnabled, `${dow}_${t}`]);
  }
  if (legacyBlob.trainingEnabled !== undefined) {
    const t = (legacyBlob.trainingHour ?? 8).toString().padStart(2, '0')
      + ':' + (legacyBlob.trainingMinute ?? 0).toString().padStart(2, '0');
    ops.push(['training_reminder', !!legacyBlob.trainingEnabled, t]);
  }
  for (const [category, enabled, time_pref] of ops) {
    const existing = await getPreference(userId, category);
    // Only seed the row if the per-category SQLite copy is missing;
    // don't overwrite a more-recent SQLite write with a stale blob.
    if (!existing) {
      await setPreference(userId, category, { enabled, time_pref });
      // Backdate updated_at one second so the seed doesn't beat any
      // legitimate writes that may be in flight on first launch.
      const d = await getDb();
      if (d) {
        await d.runAsync(
          `UPDATE ${TABLE} SET updated_at = ? WHERE user_id = ? AND category = ?`,
          [now - 1000, String(userId), category],
        );
      }
    }
  }
}

/**
 * Delete every preference for a user. Called from
 * wipeAllUserData (sign-out / account delete).
 */
export async function deletePreferencesForUser(userId) {
  if (!userId) return;
  await ensureTable();
  const d = await getDb();
  if (!d) return;
  await d.runAsync(`DELETE FROM ${TABLE} WHERE user_id = ?`, [String(userId)]);
}
