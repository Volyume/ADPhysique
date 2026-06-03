/**
 * cardio_log per-table push + pull.
 *
 * One row per logged cardio session (audit
 * docs/audit/volyume-cardio-integration-2026-06-03). PK (user_id, id), so a
 * day can hold several sessions. Soft delete via deleted_at, last-write-wins on
 * updated_at, the same contract as recipe_ingredients / body_composition_log.
 *
 * Registry: cardio_log -> last_write_wins, softDelete:true, bidirectional,
 * pk (user_id, id). Cloud migration 064.
 *
 *   Push: getCardioLogForPush(localUserId, 400) returns rows touched in the
 *         window (incl. soft-deleted, so deletes propagate), mapped to the
 *         cloud shape and upserted in 200-row batches on (user_id, id). The
 *         server BEFORE UPDATE touch trigger refuses stale writes.
 *
 *   Pull: select all rows for the user, apply insertCardioLogFromCloud only
 *         when the cloud updated_at is strictly newer than the local one
 *         (deleted rows included, so a remote delete lands locally).
 */

import { logSyncError } from '../telemetry';
import { isMissingTableError } from './_missingTable';

const PUSH_BATCH_SIZE = 200;
const PUSH_WINDOW_DAYS = 400;

function _toIso(ms) {
  if (ms == null) return null;
  if (typeof ms === 'string') return ms;
  return new Date(Number(ms)).toISOString();
}

function _toMs(t) {
  if (t == null) return 0;
  if (typeof t === 'number') return t;
  if (typeof t === 'string') return Date.parse(t) || 0;
  return 0;
}

// cardio_log is a brand-new additive table (cloud migration 064). Until 064 is
// applied, the cloud table is absent and a push/pull must be a benign skip
// rather than a sign-out-blocking error. The detector is shared across additive
// handlers (see ./_missingTable) so the cardio_log fix is the pattern, not a
// one-off.
const _isMissingTableError = (error) => isMissingTableError(error, 'cardio_log');

export async function pushCardioLog(sb, { userId, localUserId } = {}) {
  if (!sb || !userId) return { count: 0, errors: 0 };
  try {
    // eslint-disable-next-line global-require
    const { getCardioLogForPush } = require('../../database');
    const sessions = await getCardioLogForPush(localUserId, PUSH_WINDOW_DAYS);
    if (!sessions?.length) return { count: 0, errors: 0 };

    const nowIso = new Date().toISOString();
    const rows = sessions.map((r) => ({
      user_id: userId,
      id: r.id,
      entry_date: r.entryDate,
      activity_id: r.activityId ?? null,
      activity_name: r.activityName ?? 'Cardio',
      category: r.category ?? null,
      duration_min: Math.max(0, Math.round(Number(r.durationMin) || 0)),
      intensity: r.intensity ?? 'moderate',
      met: r.met != null ? Number(r.met) : null,
      est_kcal: r.estKcal != null ? Math.round(Number(r.estKcal)) : null,
      recovery_impact: r.recoveryImpact ?? null,
      impact_type: r.impactType ?? null,
      distance: r.distance != null ? Number(r.distance) : null,
      avg_hr: r.avgHr != null ? Math.round(Number(r.avgHr)) : null,
      source: r.source ?? 'manual',
      notes: r.notes ?? null,
      created_at: _toIso(r.createdAt) ?? nowIso,
      updated_at: _toIso(r.updatedAt) ?? nowIso,
      deleted_at: _toIso(r.deletedAt),
    })).filter((r) => r.id && r.entry_date);

    if (!rows.length) return { count: 0, errors: 0 };

    let pushed = 0;
    let errors = 0;
    for (let i = 0; i < rows.length; i += PUSH_BATCH_SIZE) {
      const batch = rows.slice(i, i + PUSH_BATCH_SIZE);
      const { error } = await sb
        .from('cardio_log')
        .upsert(batch, { onConflict: 'user_id,id' });
      if (error) {
        if (_isMissingTableError(error)) {
          // Cloud table not migrated yet (064 pending). Skip without erroring
          // so sign-out is not blocked. Nothing is lost: there is no cloud
          // table to push to.
          return { count: 0, errors: 0, skipped: 'cloud_table_missing' };
        }
        errors += 1;
        logSyncError('sync.tables.cardioLog.pushUpsert', error);
      } else {
        pushed += batch.length;
      }
    }
    return { count: pushed, errors };
  } catch (e) {
    logSyncError('sync.tables.cardioLog.push', e);
    return { count: 0, errors: 1 };
  }
}

export async function pullCardioLog(sb, { userId } = {}) {
  if (!sb || !userId) return { count: 0, errors: 0 };
  try {
    const { data, error } = await sb
      .from('cardio_log')
      .select('*')
      .eq('user_id', userId);
    if (error) {
      if (_isMissingTableError(error)) {
        // Cloud table not migrated yet (064 pending). Benign skip, see
        // _isMissingTableError. Keeps sign-out unblocked.
        return { count: 0, errors: 0, skipped: 'cloud_table_missing' };
      }
      logSyncError('sync.tables.cardioLog.pull', error);
      return { count: 0, errors: 1 };
    }
    if (!data?.length) return { count: 0, errors: 0 };

    // eslint-disable-next-line global-require
    const { insertCardioLogFromCloud, getCardioLogUpdatedAt } = require('../../database');
    let applied = 0;
    let skipped = 0;
    let errors = 0;
    for (const r of data) {
      try {
        const localUpdatedAt = await getCardioLogUpdatedAt(userId, r.id);
        const cloudUpdatedAt = _toMs(r.updated_at);
        if (localUpdatedAt && cloudUpdatedAt && localUpdatedAt >= cloudUpdatedAt) {
          skipped += 1;
          continue;
        }
        await insertCardioLogFromCloud(userId, r);
        applied += 1;
      } catch (e) {
        errors += 1;
        logSyncError('sync.tables.cardioLog.pullRow', e);
      }
    }
    return { count: applied, errors, ...(skipped ? { skipped } : {}) };
  } catch (e) {
    logSyncError('sync.tables.cardioLog.pull', e);
    return { count: 0, errors: 1 };
  }
}
