/**
 * NEW-002 partner sync — the new PAIR-SCOPED shape.
 *
 * Every other registry table is user-scoped ("rows where user_id = me"). Partner
 * data is pair-scoped: "rows in my active pairs, including my partner's". One
 * registry entry (`partner_signals`) drives all three local mirrors:
 *
 *   PULL  partnerships (mine, any status) -> local; then for active pairs,
 *         partner_week_signals + partner_cheers for BOTH members -> local.
 *         A partnership the cloud no longer returns as mine is pruned locally
 *         (the unpair-while-offline case: the other side ended it).
 *   PUSH  my own derived week signals (planned/done/met/state) for active pairs.
 *         Cheers are sent through the partner-cheer edge function, never here;
 *         partnership status is server-authoritative (RPC / unpair), not pushed.
 *
 * Benign-skip on a missing cloud table (081 not applied yet) so a partner table
 * absence can never wedge the push-first sign-out guard, exactly like cardio_log
 * / daily_steps.
 */

import { logSyncError } from '../telemetry';
import { isMissingTableError } from './_missingTable';

const PUSH_BATCH_SIZE = 200;

export async function pushPartners(sb, { userId, localUserId } = {}) {
  if (!sb || !userId) return { count: 0, errors: 0 };
  try {
    // eslint-disable-next-line global-require
    const db = require('../../database');
    const partnerships = await db.getPartnershipsLocal(localUserId || userId);
    const activePairIds = partnerships.filter((p) => p.status === 'active').map((p) => p.id);
    if (!activePairIds.length) return { count: 0, errors: 0 };

    // Gather my own local week signals for active pairs.
    const rows = [];
    for (const pairId of activePairIds) {
      const sig = await db.getPartnerWeekSignal(pairId, userId).catch(() => null);
      if (sig) {
        rows.push({
          pair_id: pairId,
          user_id: userId,
          week_start: String(sig.weekStart),
          planned_count: Math.max(0, Math.round(Number(sig.plannedCount) || 0)),
          done_count: Math.max(0, Math.round(Number(sig.doneCount) || 0)),
          week_met: !!sig.weekMet,
          state: sig.state === 'resting' ? 'resting' : 'training',
          updated_at: new Date(sig.updatedAt || Date.now()).toISOString(),
        });
      }
    }
    if (!rows.length) return { count: 0, errors: 0 };

    let pushed = 0;
    let errors = 0;
    for (let i = 0; i < rows.length; i += PUSH_BATCH_SIZE) {
      const batch = rows.slice(i, i + PUSH_BATCH_SIZE);
      const { error } = await sb.from('partner_week_signals')
        .upsert(batch, { onConflict: 'pair_id,user_id,week_start' });
      if (error) {
        if (isMissingTableError(error, 'partner_week_signals')) {
          return { count: 0, errors: 0, skipped: 'cloud_table_missing' };
        }
        errors += 1;
        logSyncError('sync.tables.partners.pushUpsert', error);
      } else {
        pushed += batch.length;
      }
    }
    return { count: pushed, errors };
  } catch (e) {
    logSyncError('sync.tables.partners.push', e);
    return { count: 0, errors: 1 };
  }
}

export async function pullPartners(sb, { userId } = {}) {
  if (!sb || !userId) return { count: 0, errors: 0 };
  try {
    // eslint-disable-next-line global-require
    const db = require('../../database');

    // 1. My partnerships (any status — an 'ended' row is the tombstone the UI
    //    shows once before returning to empty).
    const { data: partnerships, error: pErr } = await sb.from('partnerships')
      .select('*')
      .or(`member_a.eq.${userId},member_b.eq.${userId}`);
    if (pErr) {
      if (isMissingTableError(pErr, 'partnerships')) {
        return { count: 0, errors: 0, skipped: 'cloud_table_missing' };
      }
      logSyncError('sync.tables.partners.pullPartnerships', pErr);
      return { count: 0, errors: 1 };
    }

    let applied = 0;
    let errors = 0;
    const cloudIds = new Set();
    for (const row of (partnerships || [])) {
      cloudIds.add(row.id);
      try { await db.upsertPartnershipFromCloud(row); applied += 1; } catch (e) {
        errors += 1; logSyncError('sync.tables.partners.upsertPartnership', e);
      }
      // Deletion promise (blueprint §5), other member's side: once the cloud
      // reports a pair as ended, the end_partnership RPC has already purged its
      // signals + cheers server-side. Clear the local mirror of those shared rows
      // here so they do not linger on this device after the other person ended it.
      if (row.status === 'ended') {
        try { await db.deleteLocalPairSharedData(row.id); } catch (_) { /* best-effort */ }
      }
    }

    // Prune local partnerships the cloud no longer returns as mine (hard-removed
    // server-side, e.g. both members deleted). 'ended' rows stay (cloud returns
    // them) so the tombstone is shown; only truly vanished rows are pruned. A
    // vanished pair also has its shared rows purged locally (same promise).
    try {
      const localIds = await db.getLocalPartnershipIds(userId);
      const gone = localIds.filter((id) => !cloudIds.has(id));
      for (const id of gone) {
        await db.upsertPartnershipFromCloud({ id, status: 'ended', updated_at: new Date().toISOString() });
        try { await db.deleteLocalPairSharedData(id); } catch (_) { /* best-effort */ }
      }
    } catch (_) { /* prune is best-effort */ }

    const activePairIds = (partnerships || []).filter((p) => p.status === 'active').map((p) => p.id);
    if (activePairIds.length) {
      // 2. Week signals for both members of active pairs.
      const { data: signals, error: sErr } = await sb.from('partner_week_signals')
        .select('*').in('pair_id', activePairIds);
      if (!sErr) {
        for (const row of (signals || [])) {
          try { await db.upsertPartnerWeekSignalFromCloud(row); applied += 1; } catch (e) {
            errors += 1; logSyncError('sync.tables.partners.upsertSignal', e);
          }
        }
      } else if (!isMissingTableError(sErr, 'partner_week_signals')) {
        errors += 1; logSyncError('sync.tables.partners.pullSignals', sErr);
      }

      // 3. Cheers for active pairs.
      const { data: cheers, error: cErr } = await sb.from('partner_cheers')
        .select('*').in('pair_id', activePairIds);
      if (!cErr) {
        for (const row of (cheers || [])) {
          try { await db.upsertPartnerCheerFromCloud(row); applied += 1; } catch (e) {
            errors += 1; logSyncError('sync.tables.partners.upsertCheer', e);
          }
        }
      } else if (!isMissingTableError(cErr, 'partner_cheers')) {
        errors += 1; logSyncError('sync.tables.partners.pullCheers', cErr);
      }

      // 4. Shared training block for active pairs (Wave 5 C5 A1). One row per
      //    pair; a pair the cloud returns NO row for has no (or no longer a)
      //    shared block, so the local mirror is cleared — the partner leaving
      //    the block must propagate to this device. Benign-skip a missing
      //    cloud table (migrate_100 not applied yet).
      const { data: blocks, error: bErr } = await sb.from('partner_shared_blocks')
        .select('*').in('pair_id', activePairIds);
      if (!bErr) {
        const withBlock = new Set();
        for (const row of (blocks || [])) {
          withBlock.add(row.pair_id);
          try { await db.upsertPartnerSharedBlockFromCloud(row); applied += 1; } catch (e) {
            errors += 1; logSyncError('sync.tables.partners.upsertSharedBlock', e);
          }
        }
        for (const pairId of activePairIds) {
          if (!withBlock.has(pairId)) {
            try { await db.deleteLocalPartnerSharedBlock(pairId); } catch (_) { /* best-effort */ }
          }
        }
      } else if (!isMissingTableError(bErr, 'partner_shared_blocks')) {
        errors += 1; logSyncError('sync.tables.partners.pullSharedBlocks', bErr);
      }
    }

    // NEW-002 rebuild: the pull is the only moment a cheer (or the partner's
    // week resolution) can ARRIVE on device, so this is where the partner
    // beats are checked. Fire-and-forget; watermarks inside make each beat
    // fire at most once, and every gate (ED flag, prefs, budget, quiet
    // hours) lives in the scheduler.
    try {
      // eslint-disable-next-line global-require
      const { schedulePartnerBeats } = require('../../notifications/scheduler');
      schedulePartnerBeats(userId).catch(() => {});
    } catch (_) { /* notifications unavailable (tests, web): skip */ }

    return { count: applied, errors };
  } catch (e) {
    logSyncError('sync.tables.partners.pull', e);
    return { count: 0, errors: 1 };
  }
}
