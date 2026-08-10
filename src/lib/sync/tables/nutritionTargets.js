/**
 * nutrition_targets per-table push + pull.
 *
 * Registry drift resolved in the same commit: the registry
 * previously said direction=pull_only + serverAuthoritative=false,
 * but the legacy code did bidirectional and there is no
 * server-side computation of these rows (BMR / TDEE / target_kcal
 * / macro split are computed deterministically in the local
 * nutrition engine on every saveNutritionTargets). Truth =
 * bidirectional; the registry is flipped alongside this migration.
 *
 * Push: getNutritionTargets(localUserId) reads the single per-user
 *       row from SQLite. Upsert with onConflict='user_id' (the
 *       Supabase unique index on user_id).
 *
 * Pull: select the single per-user row and route through
 *       insertNutritionTargetsFromCloud, which applies a real
 *       last-write-wins gate on updated_at (it skips any cloud row
 *       that is not strictly newer than the local one). The push
 *       therefore has to ship an HONEST updated_at or that gate
 *       reads backwards - see _toIso below (Campaign 1 P0-8 D9).
 */

import { logSyncError } from '../telemetry';

// Campaign 1 P0-8 D9: the row's own edit time as an ISO string.
// saveNutritionTargets maintains a local epoch-ms updated_at honestly;
// this push used to discard it and stamp new Date() instead, which
// inverted LWW - a device that had not synced since before the targets
// changed uploaded its STALE calorie/macro targets carrying the newest
// timestamp in the account, and insertNutritionTargetsFromCloud's gate
// then applied them over the up-to-date device. Falls back to now() only
// when the local row genuinely carries no timestamp (legacy rows).
function _toIso(value) {
  if (value == null) return new Date().toISOString();
  const ms = typeof value === 'number' ? value : Date.parse(value);
  if (!Number.isFinite(ms)) return new Date().toISOString();
  return new Date(ms).toISOString();
}

export async function pushNutritionTargets(sb, { userId, localUserId } = {}) {
  if (!sb || !userId) return { count: 0, errors: 0 };
  try {
    // eslint-disable-next-line global-require
    const { getNutritionTargets } = require('../../database');
    const targets = await getNutritionTargets(localUserId);
    if (!targets) return { count: 0, errors: 0 };

    const row = {
      user_id: userId,
      bmr: targets.bmr ?? null,
      tdee: targets.tdee ?? null,
      target_kcal: targets.targetKcal ?? null,
      protein_g: targets.proteinG ?? null,
      carbs_g: targets.carbsG ?? null,
      fat_g: targets.fatG ?? null,
      phase: targets.phase ?? null,
      bmr_method: targets.bmrMethod ?? null,
      activity_level: targets.activityLevel ?? null,
      confidence: targets.confidence ?? null,
      warnings: targets.warnings ?? null,
      gdpr_consented: !!targets.gdprConsented,
      goal: targets.goal ?? null,
      protein_approach: targets.proteinApproach ?? null,
      updated_at: _toIso(targets.updatedAt),
    };
    const { error } = await sb
      .from('nutrition_targets')
      .upsert(row, { onConflict: 'user_id' });
    if (error) {
      logSyncError('sync.tables.nutritionTargets.pushUpsert', error);
      return { count: 0, errors: 1 };
    }
    return { count: 1, errors: 0 };
  } catch (e) {
    logSyncError('sync.tables.nutritionTargets.push', e);
    return { count: 0, errors: 1 };
  }
}

export async function pullNutritionTargets(sb, { userId } = {}) {
  if (!sb || !userId) return { count: 0, errors: 0 };
  try {
    const { data, error } = await sb
      .from('nutrition_targets')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) {
      logSyncError('sync.tables.nutritionTargets.pull', error);
      return { count: 0, errors: 1 };
    }
    if (!data) return { count: 0, errors: 0 };

    // eslint-disable-next-line global-require
    const { insertNutritionTargetsFromCloud } = require('../../database');
    try {
      await insertNutritionTargetsFromCloud(userId, data);
      return { count: 1, errors: 0 };
    } catch (e) {
      logSyncError('sync.tables.nutritionTargets.pullRow', e);
      return { count: 0, errors: 1 };
    }
  } catch (e) {
    logSyncError('sync.tables.nutritionTargets.pull', e);
    return { count: 0, errors: 1 };
  }
}
