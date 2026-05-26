/**
 * notification_preferences per-table push + pull.
 *
 * Moved out of the monolithic sync.js bulkUploadLocalData /
 * pullFromCloud helpers per SYNC_ARCHITECTURE_LOCKED.md
 * lines 156-238 (registry-driven transport, table-by-table).
 * Cloud table created in migration 044.
 *
 * Push contract:
 *   - Reads all SQLite rows for both supabaseUserId and localUserId
 *     via getAllPreferences (a no-op if they're equal).
 *   - Folds to the latest row per category (LWW on local timestamps).
 *   - Reads server timestamps; only upserts rows that are strictly
 *     newer locally. Avoids re-pushing rows the server already wrote.
 *
 * Pull contract:
 *   - Selects the full per-category row set for supabaseUserId.
 *   - Applies via applyPreferenceFromPull which preserves the
 *     server-provided updated_at and only writes when the cloud row
 *     is strictly newer. The Codex re-audit 2026-05-26 F4 fix:
 *     setPreference stamps Date.now() and caused pulled rows to
 *     echo back as fresh local writes.
 *
 * Returns the shape the runner consumes:
 *   { count, errors, skipped? }
 * where count = rows actually upserted (push) or applied locally
 * (pull); errors = unrecoverable error count for telemetry.
 */

import { logSyncError } from '../telemetry';

function timeToMs(t) {
  if (t == null) return 0;
  if (typeof t === 'number') return t;
  if (typeof t === 'string') return Date.parse(t) || 0;
  return 0;
}

function msToISO(ms) {
  if (!ms) return new Date().toISOString();
  return new Date(ms).toISOString();
}

export async function pushNotificationPreferences(sb, { userId, localUserId } = {}) {
  if (!sb || !userId) return { count: 0, errors: 0 };
  try {
    // eslint-disable-next-line global-require
    const { getAllPreferences } = require('../../notifications/preferences');
    const localRows = [];
    if (localUserId) {
      const a = await getAllPreferences(localUserId);
      for (const r of a) localRows.push(r);
    }
    if (userId && userId !== localUserId) {
      const a = await getAllPreferences(userId);
      for (const r of a) localRows.push(r);
    }
    if (localRows.length === 0) return { count: 0, errors: 0 };

    const latestByCategory = new Map();
    for (const r of localRows) {
      const existing = latestByCategory.get(r.category);
      if (!existing || timeToMs(r.updated_at) > timeToMs(existing.updated_at)) {
        latestByCategory.set(r.category, r);
      }
    }

    const rows = Array.from(latestByCategory.values()).map((r) => ({
      user_id: userId,
      category: r.category,
      enabled: !!r.enabled,
      time_pref: r.time_pref,
      updated_at: msToISO(r.updated_at),
    }));
    const categories = rows.map((r) => r.category);
    const { data: serverRows, error: readError } = await sb
      .from('notification_preferences')
      .select('category, updated_at')
      .eq('user_id', userId)
      .in('category', categories);
    if (readError) {
      logSyncError('sync.tables.notificationPreferences.pushRead', readError);
      return { count: 0, errors: 1 };
    }

    const serverUpdatedByCategory = new Map(
      (serverRows ?? []).map((r) => [r.category, timeToMs(r.updated_at)]),
    );
    const rowsToPush = rows.filter((r) => {
      const localMs = timeToMs(r.updated_at);
      const serverMs = serverUpdatedByCategory.get(r.category) ?? 0;
      return localMs > serverMs;
    });
    if (rowsToPush.length === 0) {
      return { count: 0, errors: 0, skipped: rows.length };
    }

    const { error } = await sb
      .from('notification_preferences')
      .upsert(rowsToPush, { onConflict: 'user_id,category' });
    if (error) {
      logSyncError('sync.tables.notificationPreferences.pushUpsert', error);
      return { count: 0, errors: 1 };
    }
    return { count: rowsToPush.length, errors: 0, skipped: rows.length - rowsToPush.length };
  } catch (e) {
    logSyncError('sync.tables.notificationPreferences.push', e);
    return { count: 0, errors: 1 };
  }
}

export async function pullNotificationPreferences(sb, { userId } = {}) {
  if (!sb || !userId) return { count: 0, errors: 0 };
  try {
    const { data, error } = await sb
      .from('notification_preferences')
      .select('user_id, category, enabled, time_pref, updated_at')
      .eq('user_id', userId);
    if (error) {
      logSyncError('sync.tables.notificationPreferences.pull', error);
      return { count: 0, errors: 1 };
    }
    if (!data?.length) return { count: 0, errors: 0 };
    // eslint-disable-next-line global-require
    const { applyPreferenceFromPull } = require('../../notifications/preferences');
    let applied = 0;
    let errors = 0;
    for (const row of data) {
      try {
        const updatedAtMs = typeof row.updated_at === 'string'
          ? Date.parse(row.updated_at)
          : Number(row.updated_at);
        const did = await applyPreferenceFromPull(userId, row.category, {
          enabled: !!row.enabled,
          time_pref: row.time_pref ?? null,
          updated_at: updatedAtMs,
        });
        if (did) applied += 1;
      } catch (e) {
        errors += 1;
        logSyncError('sync.tables.notificationPreferences.pullRow', e);
      }
    }
    return { count: applied, errors };
  } catch (e) {
    logSyncError('sync.tables.notificationPreferences.pull', e);
    return { count: 0, errors: 1 };
  }
}
