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
 *       insertNutritionTargetsFromCloud. The DB helper is
 *       INSERT-OR-IGNORE / read-only safe; LWW upgrade tracked
 *       alongside the other migrated tables.
 */

import { logSyncError } from '../telemetry';

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
      updated_at: new Date().toISOString(),
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
