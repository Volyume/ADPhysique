/**
 * daily_steps per-table push + pull.
 *
 * The activity store from the cardio/steps audit
 * (docs/audit/volyume-cardio-steps-audit-2026-05-30.md). One row per local
 * day: the day's step total plus its source ('manual' vs 'health'). Same
 * per-day shape and last-write-wins contract as daily_water, but daily_water
 * rides the food bulk RPC; daily_steps has its own handler so it stays
 * independent of the food domain.
 *
 * Registry: daily_steps -> last_write_wins, softDelete:false,
 * bidirectional, pk (user_id, entry_date).
 *
 *   Push: getDailyStepsForPush(localUserId, 400), map to the cloud row
 *         (entry_date stays the YYYY-MM-DD string, updated_at to ISO),
 *         upsert in 200-row batches on (user_id, entry_date). The
 *         server BEFORE UPDATE touch trigger (cloud migration 056)
 *         refuses stale writes, symmetric with the pull gate below.
 *
 *   Pull: select all rows for the user, compare local updated_at against
 *         cloud updated_at, only apply insertDailyStepsFromCloud when the
 *         cloud row is strictly newer. Mirrors bodyComposition / recipe
 *         ingredients.
 */

import { logSyncError } from '../telemetry';

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

export async function pushDailySteps(sb, { userId, localUserId } = {}) {
  if (!sb || !userId) return { count: 0, errors: 0 };
  try {
    // eslint-disable-next-line global-require
    const { getDailyStepsForPush } = require('../../database');
    const days = await getDailyStepsForPush(localUserId, PUSH_WINDOW_DAYS);
    if (!days?.length) return { count: 0, errors: 0 };

    const nowIso = new Date().toISOString();
    const rows = days.map((r) => ({
      user_id: userId,
      entry_date: r.entryDate,
      steps: Math.max(0, Math.round(Number(r.steps) || 0)),
      source: r.source ?? 'manual',
      updated_at: _toIso(r.updatedAt) ?? nowIso,
    })).filter((r) => r.entry_date);

    if (!rows.length) return { count: 0, errors: 0 };

    let pushed = 0;
    let errors = 0;
    for (let i = 0; i < rows.length; i += PUSH_BATCH_SIZE) {
      const batch = rows.slice(i, i + PUSH_BATCH_SIZE);
      const { error } = await sb
        .from('daily_steps')
        .upsert(batch, { onConflict: 'user_id,entry_date' });
      if (error) {
        errors += 1;
        logSyncError('sync.tables.dailySteps.pushUpsert', error);
      } else {
        pushed += batch.length;
      }
    }
    return { count: pushed, errors };
  } catch (e) {
    logSyncError('sync.tables.dailySteps.push', e);
    return { count: 0, errors: 1 };
  }
}

export async function pullDailySteps(sb, { userId } = {}) {
  if (!sb || !userId) return { count: 0, errors: 0 };
  try {
    const { data, error } = await sb
      .from('daily_steps')
      .select('*')
      .eq('user_id', userId);
    if (error) {
      logSyncError('sync.tables.dailySteps.pull', error);
      return { count: 0, errors: 1 };
    }
    if (!data?.length) return { count: 0, errors: 0 };

    // eslint-disable-next-line global-require
    const {
      insertDailyStepsFromCloud,
      getDailyStepsUpdatedAt,
    } = require('../../database');
    let applied = 0;
    let skipped = 0;
    let errors = 0;
    for (const r of data) {
      try {
        const localUpdatedAt = await getDailyStepsUpdatedAt(userId, r.entry_date);
        const cloudUpdatedAt = _toMs(r.updated_at);
        if (localUpdatedAt && cloudUpdatedAt && localUpdatedAt >= cloudUpdatedAt) {
          skipped += 1;
          continue;
        }
        await insertDailyStepsFromCloud(userId, r);
        applied += 1;
      } catch (e) {
        errors += 1;
        logSyncError('sync.tables.dailySteps.pullRow', e);
      }
    }
    return { count: applied, errors, ...(skipped ? { skipped } : {}) };
  } catch (e) {
    logSyncError('sync.tables.dailySteps.pull', e);
    return { count: 0, errors: 1 };
  }
}
