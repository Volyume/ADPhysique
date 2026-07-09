/**
 * perday_target_offsets per-table push + pull.
 *
 * Cloud mirror of the per-day-of-week calorie planning offsets
 * (src/lib/food/perDayTargets.js, gap #13 / design-usability audit
 * 2026-07-09, finding L05-PDT1). One row per user (PK user_id), 7 integer
 * kcal-offset columns (Monday-first weekday keys) plus updated_at.
 * Bidirectional, last-write-wins, no soft delete: "Reset all to base
 * target" (PerDayTargetsScreen) writes zeros, it never deletes the row.
 *
 * PLANNING-ONLY: these are the user's own kcal offsets, the same values
 * PerDayTargetsScreen already shows and clamps against the safety floor.
 * Nothing here reaches the engine, a floor, or any ED-safety gate; see the
 * header of src/lib/food/perDayTargets.js.
 *
 * Cloud migration 110 creates the table; it is NOT yet applied (founder
 * runs cloud migrations manually, CLAUDE.md §2). Until then, push/pull
 * treat "table not in schema cache" (PGRST205 / 42P01) as a benign skip
 * (errors:0), the same pattern cardio_log and daily_steps use, so a
 * not-yet-migrated table cannot trip the push-first sign-out guard.
 *
 *   Push: loadPerDayOffsetsForSync() reads the current offsets + their
 *         local last-write-wins clock from AsyncStorage and upserts a
 *         single row on user_id. Skipped entirely when the offsets have
 *         never been saved locally (updatedAtMs 0), mirroring
 *         nutrition_targets' "nothing to push yet" guard.
 *
 *   Pull: select the single per-user row and hand it to
 *         applyPerDayOffsetsFromCloud, which enforces the LWW gate itself
 *         (only overwrites the local copy when the cloud row is strictly
 *         newer).
 */
import { logSyncError } from '../telemetry';
import { isMissingTableError } from './_missingTable';

const _isMissingTableError = (error) => isMissingTableError(error, 'perday_target_offsets');

function _toIso(ms) {
  if (ms == null) return null;
  if (typeof ms === 'string') return ms;
  return new Date(Number(ms)).toISOString();
}

export async function pushPerDayTargetOffsets(sb, { userId } = {}) {
  if (!sb || !userId) return { count: 0, errors: 0 };
  try {
    // eslint-disable-next-line global-require
    const { loadPerDayOffsetsForSync } = require('../../food/perDayTargets');
    const { offsets, updatedAtMs } = await loadPerDayOffsetsForSync();
    // Nothing saved locally yet: no row to push (matches nutrition_targets'
    // `if (!targets) return` guard rather than writing an all-zero row for
    // every user who has never opened this screen).
    if (!updatedAtMs) return { count: 0, errors: 0 };

    const row = {
      user_id: userId,
      mon_offset_kcal: offsets.mon ?? 0,
      tue_offset_kcal: offsets.tue ?? 0,
      wed_offset_kcal: offsets.wed ?? 0,
      thu_offset_kcal: offsets.thu ?? 0,
      fri_offset_kcal: offsets.fri ?? 0,
      sat_offset_kcal: offsets.sat ?? 0,
      sun_offset_kcal: offsets.sun ?? 0,
      updated_at: _toIso(updatedAtMs),
    };
    const { error } = await sb
      .from('perday_target_offsets')
      .upsert(row, { onConflict: 'user_id' });
    if (error) {
      if (_isMissingTableError(error)) {
        return { count: 0, errors: 0, skipped: 'cloud_table_missing' };
      }
      logSyncError('sync.tables.perDayTargetOffsets.pushUpsert', error);
      return { count: 0, errors: 1 };
    }
    return { count: 1, errors: 0 };
  } catch (e) {
    logSyncError('sync.tables.perDayTargetOffsets.push', e);
    return { count: 0, errors: 1 };
  }
}

export async function pullPerDayTargetOffsets(sb, { userId } = {}) {
  if (!sb || !userId) return { count: 0, errors: 0 };
  try {
    const { data, error } = await sb
      .from('perday_target_offsets')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) {
      if (_isMissingTableError(error)) {
        return { count: 0, errors: 0, skipped: 'cloud_table_missing' };
      }
      logSyncError('sync.tables.perDayTargetOffsets.pull', error);
      return { count: 0, errors: 1 };
    }
    if (!data) return { count: 0, errors: 0 };

    const offsets = {
      mon: data.mon_offset_kcal, tue: data.tue_offset_kcal, wed: data.wed_offset_kcal,
      thu: data.thu_offset_kcal, fri: data.fri_offset_kcal, sat: data.sat_offset_kcal,
      sun: data.sun_offset_kcal,
    };
    const cloudUpdatedMs = Date.parse(data.updated_at) || 0;

    // eslint-disable-next-line global-require
    const { applyPerDayOffsetsFromCloud } = require('../../food/perDayTargets');
    try {
      const applied = await applyPerDayOffsetsFromCloud(offsets, cloudUpdatedMs);
      return applied ? { count: 1, errors: 0 } : { count: 0, errors: 0, skipped: 1 };
    } catch (e) {
      logSyncError('sync.tables.perDayTargetOffsets.pullApply', e);
      return { count: 0, errors: 1 };
    }
  } catch (e) {
    logSyncError('sync.tables.perDayTargetOffsets.pull', e);
    return { count: 0, errors: 1 };
  }
}
