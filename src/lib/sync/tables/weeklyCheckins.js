/**
 * weekly_checkins_v2 per-table push + pull.
 *
 * Moved out of the monolithic sync.js bulkUploadLocalData /
 * pullFromCloud helpers per SYNC_ARCHITECTURE_LOCKED.md
 * lines 156-238 (registry-driven transport, table-by-table).
 *
 * Contract (after migration 047 closed the cloud-schema gap):
 *
 *   Push: read all weekly_checkins for the local user via
 *         getAllWeeklyCheckinsForUser, map to the v2 schema,
 *         stamp updated_at as an ISO string from the local
 *         updated_at column (DEFAULT now() server-side if NULL),
 *         upsert in batches of 200 on (user_id, id). Server-side
 *         BEFORE UPDATE trigger refuses stale writes so the
 *         pull-side LWW gate has a reliable monotonic clock to
 *         compare against.
 *
 *   Pull: select all rows from weekly_checkins_v2 for the user.
 *         Compare local updated_at against cloud updated_at;
 *         only invoke insertWeeklyCheckinFromCloud when the
 *         cloud row is strictly newer than the local copy.
 *         Local writes that have not synced yet are NOT
 *         clobbered.
 *
 * Registry says softDelete:false; rows are hard-deleted on the
 * cloud. The local SQLite table does carry a deleted_at column
 * (legacy, additive block in src/lib/database.js) but it is not
 * synced.
 */

import { logSyncError } from '../telemetry';

const PUSH_BATCH_SIZE = 200;

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

export async function pushWeeklyCheckins(sb, { userId, localUserId } = {}) {
  if (!sb || !userId) return { count: 0, errors: 0 };
  try {
    // eslint-disable-next-line global-require
    const { getAllWeeklyCheckinsForUser } = require('../../database');
    const checkins = await getAllWeeklyCheckinsForUser(localUserId);
    if (!checkins?.length) return { count: 0, errors: 0 };

    const nowIso = new Date().toISOString();
    const rows = checkins.map((c) => ({
      id: c.id,
      user_id: userId,
      week_start: c.weekStart,
      energy_score: c.energyScore ?? null,
      soreness_score: c.sorenessScore ?? null,
      stress_score: c.stressScore ?? null,
      sleep_hours: c.sleepHours ?? null,
      cals_adherence: c.calsAdherence ?? null,
      steps_adherence: c.stepsAdherence ?? null,
      cardio_adherence: c.cardioAdherence ?? null,
      training_performance: c.trainingPerformance ?? null,
      joint_pain: !!c.jointPain,
      sore_muscles: c.soreMuscles ?? null,
      cycle_override: !!c.cycleOverride,
      notes: c.notes ?? null,
      updated_at: _toIso(c.updatedAt) ?? nowIso,
    }));

    let pushed = 0;
    let errors = 0;
    for (let i = 0; i < rows.length; i += PUSH_BATCH_SIZE) {
      const batch = rows.slice(i, i + PUSH_BATCH_SIZE);
      const { error } = await sb
        .from('weekly_checkins_v2')
        .upsert(batch, { onConflict: 'user_id,id' });
      if (error) {
        errors += 1;
        logSyncError('sync.tables.weeklyCheckins.pushUpsert', error);
      } else {
        pushed += batch.length;
      }
    }
    return { count: pushed, errors };
  } catch (e) {
    logSyncError('sync.tables.weeklyCheckins.push', e);
    return { count: 0, errors: 1 };
  }
}

export async function pullWeeklyCheckins(sb, { userId } = {}) {
  if (!sb || !userId) return { count: 0, errors: 0 };
  try {
    const { data, error } = await sb
      .from('weekly_checkins_v2')
      .select('*')
      .eq('user_id', userId);
    if (error) {
      logSyncError('sync.tables.weeklyCheckins.pull', error);
      return { count: 0, errors: 1 };
    }
    if (!data?.length) return { count: 0, errors: 0 };

    // eslint-disable-next-line global-require
    const {
      insertWeeklyCheckinFromCloud,
      getWeeklyCheckinUpdatedAt,
    } = require('../../database');
    let applied = 0;
    let skipped = 0;
    let errors = 0;
    for (const c of data) {
      try {
        const localUpdatedAt = await getWeeklyCheckinUpdatedAt(userId, c.id);
        const cloudUpdatedAt = _toMs(c.updated_at);
        if (localUpdatedAt && cloudUpdatedAt && localUpdatedAt >= cloudUpdatedAt) {
          skipped += 1;
          continue;
        }
        await insertWeeklyCheckinFromCloud(userId, c);
        applied += 1;
      } catch (e) {
        errors += 1;
        logSyncError('sync.tables.weeklyCheckins.pullRow', e);
      }
    }
    return { count: applied, errors, ...(skipped ? { skipped } : {}) };
  } catch (e) {
    logSyncError('sync.tables.weeklyCheckins.pull', e);
    return { count: 0, errors: 1 };
  }
}
