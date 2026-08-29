/**
 * capability_constraints per-table push + pull (CC26; registry contract,
 * weeklyCheckins.js template).
 *
 * Push: every row INCLUDING tombstones (soft delete propagates as
 * UPDATE; the server purges tombstones on its standing schedule), mapped
 * to the migrate_145 shape with ISO timestamps, upserted in batches of
 * 200 on (user_id, id). The server-side refuse-stale trigger keeps
 * updated_at monotonic. Migration 145 is APPLIED (2026-08-21, founder-
 * confirmed "run against production" batch; verified live per
 * supabase/README.md's 2026-08-21 entry) - the fail-soft queued-retry
 * path below was the pre-application bridge and stands unchanged as
 * ordinary transient-failure handling.
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
      // session effect (migrate_149 APPLIED).
      effective_choice: c.effectiveChoice ?? null,
      // CC33 adversarial review F3: UNCONDITIONAL, exactly like
      // effective_choice above. The old some()-gated inclusion existed
      // for the pre-migrate_152 cloud (a hold user's push failed soft
      // until the column landed) - but 152 is APPLIED (2026-08-28,
      // supabase/README), and the condition it left behind was a live
      // defect: resuming the LAST held episode made every local value
      // NULL, the key was omitted from the push, the cloud row kept
      // 'hold', and the other device re-applied the hold the user had
      // just cancelled. NULL must travel like any other value.
      adaptation_mode: c.adaptationMode ?? null,
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
