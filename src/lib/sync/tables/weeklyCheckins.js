/**
 * weekly_checkins_v2 per-table push + pull.
 *
 * Moved out of the monolithic sync.js bulkUploadLocalData /
 * pullFromCloud helpers per SYNC_ARCHITECTURE_LOCKED.md
 * lines 156-238 (registry-driven transport, table-by-table).
 *
 * Behavioural contract preserved verbatim from sync.js:
 *
 *   Push: read all weekly_checkins for the local user via
 *         getAllWeeklyCheckinsForUser, map to the v2 schema,
 *         upsert in batches of 200 on (user_id, id). No
 *         client-side updated_at; the server-side default fills
 *         it on upsert.
 *
 *   Pull: select all rows from weekly_checkins_v2 for the user,
 *         call insertWeeklyCheckinFromCloud which does
 *         INSERT OR IGNORE. Cloud-side edits to a row that
 *         already exists locally are NOT applied (existing
 *         contract; LWW upgrade is a follow-up).
 *
 * The registry entry says conflictStrategy=last_write_wins; the
 * code does not currently enforce that. Tracked as a follow-up:
 * the push payload needs a client-supplied updated_at and the
 * pull side needs INSERT ... ON CONFLICT UPDATE WHERE clauses.
 * Not in scope for the migration; this commit is a pure lift.
 */

import { logSyncError } from '../telemetry';

const PUSH_BATCH_SIZE = 200;

export async function pushWeeklyCheckins(sb, { userId, localUserId } = {}) {
  if (!sb || !userId) return { count: 0, errors: 0 };
  try {
    // eslint-disable-next-line global-require
    const { getAllWeeklyCheckinsForUser } = require('../../database');
    const checkins = await getAllWeeklyCheckinsForUser(localUserId);
    if (!checkins?.length) return { count: 0, errors: 0 };

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
      training_performance: c.trainingPerformance ?? null,
      joint_pain: !!c.jointPain,
      sore_muscles: c.soreMuscles ?? null,
      cycle_override: !!c.cycleOverride,
      notes: c.notes ?? null,
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
    const { insertWeeklyCheckinFromCloud } = require('../../database');
    let applied = 0;
    let errors = 0;
    for (const c of data) {
      try {
        await insertWeeklyCheckinFromCloud(userId, c);
        applied += 1;
      } catch (e) {
        errors += 1;
        logSyncError('sync.tables.weeklyCheckins.pullRow', e);
      }
    }
    return { count: applied, errors };
  } catch (e) {
    logSyncError('sync.tables.weeklyCheckins.pull', e);
    return { count: 0, errors: 1 };
  }
}
