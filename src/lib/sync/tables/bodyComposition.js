/**
 * body_composition_log per-table push + pull.
 *
 * Registry key is `body_composition_log` (locked in
 * SYNC_REGISTRY); the cloud table is `body_metrics` and the local
 * SQLite table is `body_metric_log`. Names diverged historically
 * and the registry-key-vs-table-name split is preserved here so
 * the dispatch contract matches the locked spec while the SQL
 * stays compatible with the existing schema.
 *
 * Moved out of the monolithic sync.js bulkUploadLocalData /
 * pullFromCloud helpers per SYNC_ARCHITECTURE_LOCKED.md
 * lines 156-238.
 *
 * Contract (after migration 047 closed the cloud-schema gap):
 *
 *   Push: getBodyMetricLog(localUserId, 365), map to the
 *         body_metrics cloud schema (thigh -> quads, ham ->
 *         hamstrings, body_fat_*), filter rows that produce a
 *         null metric_date, stamp updated_at + (optional)
 *         deleted_at ISO strings, upsert in 200-row batches on
 *         (user_id, id). Server-side BEFORE UPDATE trigger
 *         refuses stale writes (NEW.updated_at < OLD.updated_at)
 *         so the round trip is symmetric with the LWW gate on
 *         pull below.
 *
 *   Pull: select all rows from body_metrics for the user
 *         including tombstones (deleted_at not null). For each
 *         row, compare local updated_at against cloud
 *         updated_at; only invoke insertBodyMetricFromCloud when
 *         the cloud row is strictly newer than the local copy.
 *         Mirrors the recipe_ingredients pattern.
 */

import { logSyncError } from '../telemetry';
import { localDayKey } from '../../dayKey';
import { fetchAllUserRows } from './_paginate';

const PUSH_BATCH_SIZE = 200;
const PUSH_WINDOW_DAYS = 365;

// LS-07: stamp metric_date on the user's LOCAL calendar day, not UTC.
// `new Date(ms).toISOString().split('T')[0]` reads the UTC date, so an
// early-morning weigh-in during BST (UTC+1) -- e.g. 00:30 local, which is
// 23:30 UTC the previous day -- landed on the WRONG day once it hit the
// cloud. localDayKey (dayKey.js) is the shared local-calendar-day helper
// used everywhere else in the app (weight/workouts already used it; this
// closes the last UTC-keyed gap). Same null guard as before.
function msToDate(ms) {
  if (!ms) return null;
  try { return localDayKey(ms); } catch (_) { return null; }
}

function _toIso(ms) {
  if (!ms) return null;
  if (typeof ms === 'string') return ms;
  return new Date(Number(ms)).toISOString();
}

function _toMs(t) {
  if (t == null) return 0;
  if (typeof t === 'number') return t;
  if (typeof t === 'string') return Date.parse(t) || 0;
  return 0;
}

export async function pushBodyComposition(sb, { userId, localUserId } = {}) {
  if (!sb || !userId) return { count: 0, errors: 0 };
  try {
    // eslint-disable-next-line global-require
    const { getBodyMetricLog } = require('../../database');
    // D16 (NAV-2): includeDeleted so a soft-deleted (edited-away) entry still
    // pushes as a body_metrics tombstone (deleted_at set below) instead of
    // silently vanishing from the cloud sync while surviving on another
    // device's pull.
    const metrics = await getBodyMetricLog(localUserId, PUSH_WINDOW_DAYS, { includeDeleted: true });
    if (!metrics?.length) return { count: 0, errors: 0 };

    const nowIso = new Date().toISOString();
    const rows = metrics.map((m) => ({
      id: m.id,
      user_id: userId,
      metric_date: msToDate(m.loggedAt),
      body_weight: m.weightKg ?? null,
      waist: m.waistCm ?? null,
      chest: m.chestCm ?? null,
      hips: m.hipsCm ?? null,
      quads: m.thighCm ?? null,
      arms: m.armCm ?? null,
      shoulders: m.shouldersCm ?? null,
      forearms: m.forearmCm ?? null,
      hamstrings: m.hamCm ?? null,
      calves: m.calfCm ?? null,
      body_fat_percent: m.bodyFatPercent ?? null,
      body_fat_source: m.bodyFatSource ?? null,
      notes: m.notes ?? null,
      updated_at: _toIso(m.updatedAt) ?? nowIso,
      deleted_at: m.deletedAt ? _toIso(m.deletedAt) : null,
    })).filter((r) => r.metric_date);

    if (!rows.length) return { count: 0, errors: 0 };

    let pushed = 0;
    let errors = 0;
    for (let i = 0; i < rows.length; i += PUSH_BATCH_SIZE) {
      const batch = rows.slice(i, i + PUSH_BATCH_SIZE);
      const { error } = await sb
        .from('body_metrics')
        .upsert(batch, { onConflict: 'user_id,id' });
      if (error) {
        errors += 1;
        logSyncError('sync.tables.bodyComposition.pushUpsert', error);
      } else {
        pushed += batch.length;
      }
    }
    return { count: pushed, errors };
  } catch (e) {
    logSyncError('sync.tables.bodyComposition.push', e);
    return { count: 0, errors: 1 };
  }
}

export async function pullBodyComposition(sb, { userId } = {}) {
  if (!sb || !userId) return { count: 0, errors: 0 };
  try {
    // LS-03b: page past PostgREST's 1000-row cap so a long history restores in full.
    const { data, error } = await fetchAllUserRows(
      () => sb.from('body_metrics').select('*').eq('user_id', userId),
    );
    if (error) {
      logSyncError('sync.tables.bodyComposition.pull', error);
      return { count: 0, errors: 1 };
    }
    if (!data?.length) return { count: 0, errors: 0 };

    // eslint-disable-next-line global-require
    const {
      insertBodyMetricFromCloud,
      getBodyMetricUpdatedAt,
    } = require('../../database');
    let applied = 0;
    let skipped = 0;
    let errors = 0;
    for (const m of data) {
      try {
        const localUpdatedAt = await getBodyMetricUpdatedAt(userId, m.id);
        const cloudUpdatedAt = _toMs(m.updated_at);
        if (localUpdatedAt && cloudUpdatedAt && localUpdatedAt >= cloudUpdatedAt) {
          skipped += 1;
          continue;
        }
        await insertBodyMetricFromCloud(userId, m);
        applied += 1;
      } catch (e) {
        errors += 1;
        logSyncError('sync.tables.bodyComposition.pullRow', e);
      }
    }
    return { count: applied, errors, ...(skipped ? { skipped } : {}) };
  } catch (e) {
    logSyncError('sync.tables.bodyComposition.pull', e);
    return { count: 0, errors: 1 };
  }
}
