/**
 * session_constraint_effects per-table push + pull (CC26 schema
 * foundation; writers arrive in CC29). Same contract as
 * capabilityConstraints.js: tombstones travel, batches of 200, applier
 * does strictly-newer LWW. Inert while the table is empty.
 */
import { logSyncError } from '../telemetry';

const PUSH_BATCH_SIZE = 200;

function _toIso(ms) {
  if (ms == null) return null;
  if (typeof ms === 'string') return ms;
  return new Date(Number(ms)).toISOString();
}

export async function pushSessionConstraintEffects(sb, { userId, localUserId } = {}) {
  if (!sb || !userId) return { count: 0, errors: 0 };
  try {
    // eslint-disable-next-line global-require
    const { getAllSessionConstraintEffectsForUser } = require('../../database');
    const local = await getAllSessionConstraintEffectsForUser(localUserId);
    if (!local?.length) return { count: 0, errors: 0 };

    const nowIso = new Date().toISOString();
    const rows = local.map((c) => ({
      id: c.id,
      user_id: userId,
      workout_id: c.workoutId,
      effects_json: safeParse(c.effectsJson),
      created_at: _toIso(c.createdAt) ?? nowIso,
      updated_at: _toIso(c.updatedAt) ?? nowIso,
      deleted_at: _toIso(c.deletedAt),
    }));

    let pushed = 0;
    let errors = 0;
    for (let i = 0; i < rows.length; i += PUSH_BATCH_SIZE) {
      const batch = rows.slice(i, i + PUSH_BATCH_SIZE);
      const { error } = await sb
        .from('session_constraint_effects')
        .upsert(batch, { onConflict: 'user_id,id' });
      if (error) {
        errors += 1;
        logSyncError('sync.tables.sessionConstraintEffects.pushUpsert', error);
      } else {
        pushed += batch.length;
      }
    }
    return { count: pushed, errors };
  } catch (e) {
    logSyncError('sync.tables.sessionConstraintEffects.push', e);
    return { count: 0, errors: 1 };
  }
}

function safeParse(json) {
  try { return JSON.parse(json ?? '[]'); } catch (_) { return []; }
}

export async function pullSessionConstraintEffects(sb, { userId, localUserId } = {}) {
  if (!sb || !userId) return { count: 0, errors: 0 };
  try {
    const { data, error } = await sb
      .from('session_constraint_effects')
      .select('*')
      .eq('user_id', userId);
    if (error) {
      logSyncError('sync.tables.sessionConstraintEffects.pull', error);
      return { count: 0, errors: 1 };
    }
    if (!data?.length) return { count: 0, errors: 0 };

    // eslint-disable-next-line global-require
    const { insertSessionConstraintEffectFromCloud } = require('../../database');
    let applied = 0;
    let errors = 0;
    for (const row of data) {
      try {
        const cloudRow = {
          ...row,
          effects_json: typeof row.effects_json === 'string'
            ? row.effects_json
            : JSON.stringify(row.effects_json ?? []),
        };
        const wrote = await insertSessionConstraintEffectFromCloud(localUserId ?? userId, cloudRow);
        if (wrote) applied += 1;
      } catch (e) {
        errors += 1;
        logSyncError('sync.tables.sessionConstraintEffects.pullRow', e);
      }
    }
    return { count: applied, errors };
  } catch (e) {
    logSyncError('sync.tables.sessionConstraintEffects.pull', e);
    return { count: 0, errors: 1 };
  }
}
