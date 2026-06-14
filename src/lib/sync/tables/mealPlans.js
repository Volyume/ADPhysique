/**
 * meal_plans per-table push + pull (Theme G follow-up, 2026-06-12).
 *
 * The plan is assembled deterministically on device from the synced
 * nutrition target + prefs; the cloud row exists so the EXACT active plan
 * (with its swaps and coach edits) survives a device change instead of
 * being regenerated with a different seed. Bidirectional, last-write-wins
 * on epoch-ms updated_at, soft-delete tombstones propagate.
 *
 * Push: the user's most recent local row — including a tombstone, so a
 *       delete here removes the plan everywhere. plan_json is parsed to
 *       feed the jsonb column; an unparseable local row is never pushed.
 *
 * Pull: the most recent cloud row, applied through
 *       applyMealPlanRowFromCloud, whose LWW guard never tramples an
 *       equal-or-newer local row and keeps the one-active-plan invariant.
 */

import { logSyncError } from '../telemetry';

export async function pushMealPlans(sb, { userId, localUserId } = {}) {
  if (!sb || !userId) return { count: 0, errors: 0 };
  try {
    // eslint-disable-next-line global-require
    const { getLatestMealPlanRowForSync } = require('../../food/db');
    const row = await getLatestMealPlanRowForSync(localUserId);
    if (!row) return { count: 0, errors: 0 };

    let planJson = null;
    try { planJson = JSON.parse(row.plan_json); } catch (_) { planJson = null; }
    if (!planJson) return { count: 0, errors: 0 };

    const { error } = await sb.from('meal_plans').upsert({
      id: row.id,
      user_id: userId,
      plan_json: planJson,
      is_active: !!row.is_active,
      deleted_at: row.deleted_at ?? null,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }, { onConflict: 'id' });
    if (error) {
      logSyncError('sync.tables.mealPlans.pushUpsert', error);
      return { count: 0, errors: 1 };
    }
    return { count: 1, errors: 0 };
  } catch (e) {
    logSyncError('sync.tables.mealPlans.push', e);
    return { count: 0, errors: 1 };
  }
}

export async function pullMealPlans(sb, { userId, localUserId } = {}) {
  if (!sb || !userId) return { count: 0, errors: 0 };
  try {
    // Standard handler chain (.select().eq()) then reduce client-side: the
    // cloud carries one latest row per user (push only ever sends one), so
    // picking max(updated_at) locally is exact, not an approximation.
    const { data: rows, error } = await sb
      .from('meal_plans')
      .select('*')
      .eq('user_id', userId);
    if (error) {
      logSyncError('sync.tables.mealPlans.pull', error);
      return { count: 0, errors: 1 };
    }
    const data = (rows || []).reduce(
      (best, r) => (!best || Number(r.updated_at) > Number(best.updated_at) ? r : best),
      null,
    );
    if (!data) return { count: 0, errors: 0 };

    // eslint-disable-next-line global-require
    const { applyMealPlanRowFromCloud } = require('../../food/db');
    try {
      const applied = await applyMealPlanRowFromCloud(localUserId, {
        ...data,
        plan_json: typeof data.plan_json === 'string'
          ? data.plan_json
          : JSON.stringify(data.plan_json),
      });
      return { count: applied ? 1 : 0, errors: 0 };
    } catch (e) {
      logSyncError('sync.tables.mealPlans.pullRow', e);
      return { count: 0, errors: 1 };
    }
  } catch (e) {
    logSyncError('sync.tables.mealPlans.pull', e);
    return { count: 0, errors: 1 };
  }
}
