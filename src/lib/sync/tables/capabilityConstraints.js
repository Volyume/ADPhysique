/**
 * capability_constraints per-table push + pull (CC26; registry contract,
 * weeklyCheckins.js template).
 *
 * Push: every row INCLUDING tombstones (soft delete propagates as
 * UPDATE; the server purges tombstones on its standing schedule), mapped
 * to the migrate_145 shape with ISO timestamps, upserted in batches of
 * 200 on (user_id, id). The server-side refuse-stale trigger keeps
 * updated_at monotonic. Fails soft (queued retry) until migration 145 is
 * applied - founder-gated.
 *
 * Pull: select all for the user; the database.js applier does the
 * strictly-newer LWW compare, so a local unsynced write is never
 * clobbered and a NEWER tombstone always beats an older active copy
 * (retirement can never resurrect).
 *
 * Role and interval fields are mapped explicitly and completely: losing
 * role or starts_at/ended_at in transit would corrupt the provenance
 * joins later campaigns depend on (CAP-14) - pinned by the CC26 sync
 * suite's field-map test.
 */
import { logSyncError } from '../telemetry';

const PUSH_BATCH_SIZE = 200;

function _toIso(ms) {
  if (ms == null) return null;
  if (typeof ms === 'string') return ms;
  return new Date(Number(ms)).toISOString();
}

export async function pushCapabilityConstraints(sb, { userId, localUserId } = {}) {
  if (!sb || !userId) return { count: 0, errors: 0 };
  try {
    // eslint-disable-next-line global-require
    const { getAllCapabilityConstraintsForUser } = require('../../database');
    const local = await getAllCapabilityConstraintsForUser(localUserId);
    if (!local?.length) return { count: 0, errors: 0 };

    const nowIso = new Date().toISOString();
    // CC33 D112 R8: PostgREST rejects mixed-key batches, so the field is
    // included for ALL rows or NONE, decided by whether any row carries
    // it. A user who never used "hold my plan" pushes exactly the
    // pre-152 shape and stays green before the cloud migration is
    // applied (founder-gated); a hold user's push fails soft until then
    // (queued retry, local durability - the 145/149 pre-apply posture).
    const carryAdaptationMode = local.some((c) => c.adaptationMode != null);
    const rows = local.map((c) => ({
      id: c.id,
      user_id: userId,
      role: c.role,
      source: c.source,
      rule_kind: c.ruleKind,
      rule_value: c.ruleValue,
      laterality: c.laterality ?? null,
      starts_at: _toIso(c.startsAt),
      ends_at: _toIso(c.endsAt),
      state: c.state,
      ended_at: _toIso(c.endedAt),
      ended_reason: c.endedReason ?? null,
      episode_group_id: c.episodeGroupId ?? null,
      acknowledged_at: _toIso(c.acknowledgedAt),
      // CC29 (section 14): the standing Apply/Decline on an episode rule's
      // session effect. Tolerated-mode until migrate_149 runs.
      effective_choice: c.effectiveChoice ?? null,
      ...(carryAdaptationMode ? { adaptation_mode: c.adaptationMode ?? null } : {}),
      created_at: _toIso(c.createdAt) ?? nowIso,
      updated_at: _toIso(c.updatedAt) ?? nowIso,
      deleted_at: _toIso(c.deletedAt),
    }));

    let pushed = 0;
    let errors = 0;
    for (let i = 0; i < rows.length; i += PUSH_BATCH_SIZE) {
      const batch = rows.slice(i, i + PUSH_BATCH_SIZE);
      const { error } = await sb
        .from('capability_constraints')
        .upsert(batch, { onConflict: 'user_id,id' });
      if (error) {
        errors += 1;
        logSyncError('sync.tables.capabilityConstraints.pushUpsert', error);
      } else {
        pushed += batch.length;
      }
    }
    return { count: pushed, errors };
  } catch (e) {
    logSyncError('sync.tables.capabilityConstraints.push', e);
    return { count: 0, errors: 1 };
  }
}

export async function pullCapabilityConstraints(sb, { userId, localUserId } = {}) {
  if (!sb || !userId) return { count: 0, errors: 0 };
  try {
    const { data, error } = await sb
      .from('capability_constraints')
      .select('*')
      .eq('user_id', userId);
    if (error) {
      logSyncError('sync.tables.capabilityConstraints.pull', error);
      return { count: 0, errors: 1 };
    }
    if (!data?.length) return { count: 0, errors: 0 };

    // eslint-disable-next-line global-require
    const { insertCapabilityConstraintFromCloud } = require('../../database');
    let applied = 0;
    let errors = 0;
    for (const row of data) {
      try {
        const wrote = await insertCapabilityConstraintFromCloud(localUserId ?? userId, row);
        if (wrote) applied += 1;
      } catch (e) {
        errors += 1;
        logSyncError('sync.tables.capabilityConstraints.pullRow', e);
      }
    }
    return { count: applied, errors };
  } catch (e) {
    logSyncError('sync.tables.capabilityConstraints.pull', e);
    return { count: 0, errors: 1 };
  }
}
