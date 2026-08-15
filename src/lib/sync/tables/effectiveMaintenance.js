/** One-row-per-user effective-maintenance memo sync. */
import { logSyncError } from '../telemetry';
import { isMissingTableError } from './_missingTable';

function iso(value) {
  if (value == null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? new Date(n).toISOString() : null;
}

export async function pushEffectiveMaintenance(sb, { userId, localUserId } = {}) {
  if (!sb || !userId || !localUserId) return { count: 0, errors: 0 };
  try {
    // eslint-disable-next-line global-require
    const { getEffectiveMaintenanceMemo } = require('../../database');
    const memo = await getEffectiveMaintenanceMemo(localUserId);
    if (!memo) return { count: 0, errors: 0 };
    const row = {
      user_id: userId,
      cumulative_residual_kcal: memo.cumulativeResidualKcal,
      formula_prior_kcal_at_derivation: memo.formulaPriorKcalAtDerivation,
      effective_maintenance_kcal_at_derivation: memo.effectiveMaintenanceKcalAtDerivation,
      source: memo.source,
      status: memo.status,
      reason: memo.reason,
      algorithm_version: memo.algorithmVersion,
      as_of: iso(memo.asOf),
      evidence_signature: memo.evidenceSignature,
      food_days_logged: memo.foodDaysLogged,
      weight_points: memo.weightPoints,
      bodyweight_kg: memo.bodyweightKg ?? null,
      goal_phase: memo.goalPhase ?? null,
      activity_level: memo.activityLevel ?? null,
      formula_method: memo.formulaMethod ?? null,
      formula_context_signature: memo.formulaContextSignature,
      large_divergence: !!memo.largeDivergence,
      revalidation_started_at: iso(memo.revalidationStartedAt),
      revalidation_context_signature: memo.revalidationContextSignature ?? null,
      version_key: memo.versionKey,
      updated_at: iso(memo.updatedAt),
    };
    const { error } = await sb.from('effective_maintenance_memos')
      .upsert(row, { onConflict: 'user_id' });
    if (error) {
      if (isMissingTableError(error, 'effective_maintenance_memos')) {
        return { count: 0, errors: 0, skipped: 'cloud_table_missing' };
      }
      logSyncError('sync.tables.effectiveMaintenance.pushUpsert', error);
      return { count: 0, errors: 1 };
    }
    return { count: 1, errors: 0 };
  } catch (e) {
    logSyncError('sync.tables.effectiveMaintenance.push', e);
    return { count: 0, errors: 1 };
  }
}

export async function pullEffectiveMaintenance(sb, { userId, localUserId } = {}) {
  if (!sb || !userId) return { count: 0, errors: 0 };
  const targetLocalUserId = localUserId || userId;
  try {
    const { data, error } = await sb.from('effective_maintenance_memos')
      .select('*').eq('user_id', userId).maybeSingle();
    if (error) {
      if (isMissingTableError(error, 'effective_maintenance_memos')) {
        return { count: 0, errors: 0, skipped: 'cloud_table_missing' };
      }
      logSyncError('sync.tables.effectiveMaintenance.pullSelect', error);
      return { count: 0, errors: 1 };
    }
    if (!data) return { count: 0, errors: 0 };
    // eslint-disable-next-line global-require
    const { insertEffectiveMaintenanceMemoFromCloud } = require('../../database');
    await insertEffectiveMaintenanceMemoFromCloud(targetLocalUserId, data, { cloudUserId: userId });
    return { count: 1, errors: 0 };
  } catch (e) {
    logSyncError('sync.tables.effectiveMaintenance.pull', e);
    return { count: 0, errors: 1 };
  }
}
