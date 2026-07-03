/**
 * usePartners — drives the NEW-002 partner row on the Progress consistency
 * screen. Offline-first: every READ is the local SQLite mirror (the sync layer
 * keeps it current); the ONLINE actions (create/redeem/cheer/unpair/block) are
 * the deliberate exceptions — pairing is "the one online-required step" (§4.2).
 *
 * v1 surfaces a single primary partnership (the free cap is one partner; the
 * Pro three-partner list is a follow-on). Recomputes on focus so a synced cheer
 * or week signal reflects immediately.
 */
import { useState, useCallback, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  getPartnershipsLocal, getActivePartnerCount, getPartnerWeekSignal,
  getPairWeekSignals, getLastCheerSentOn, getLastCheerReceived,
  deleteLocalPairSharedData, getPartnerSharedBlock, deleteLocalPartnerSharedBlock,
  upsertPartnerSharedBlockFromCloud,
} from '../lib/database';
import { todayLocalKey } from '../lib/dayKey';
import { partnerRowState, cheerAllowed, canAddPartner } from '../lib/partners/signals';
import { computeSharedStreak, buildSharedWeeks } from '../lib/partners/sharedStreak';
import {
  createPartnerInvite, redeemPartnerInvite, sendCheer, unpairPartner, blockPartner,
  proposeSharedBlock, adoptSharedBlock, leaveSharedBlock,
} from '../lib/partners/service';
import { writeOwnWeekSignals } from '../lib/partners/weekSignalWriter';
import { getCachedInvite, setCachedInvite, clearCachedInvite } from '../lib/partners/inviteCache';
import { readPendingPartnerCode, clearPendingPartnerCode } from '../lib/partners/pendingInvite';

const EMPTY = {
  loading: true, partnership: null, rowState: 'empty', partnerWeek: null,
  myWeek: null, sharedStreak: null, cheerEnabled: false, lastReceived: null,
  sharedBlock: null, canAdd: true, reload: () => {},
};

// Pick the partnership to surface: an active one first, else a pending invite,
// else the most recent ended tombstone, else none.
function pickPrimary(partnerships) {
  return partnerships.find((p) => p.status === 'active')
    || partnerships.find((p) => p.status === 'invited')
    || partnerships.find((p) => p.status === 'ended')
    || null;
}

export default function usePartners(userId, tier) {
  const [state, setState] = useState(EMPTY);
  // Guards the one-shot re-surface of a paywall-preserved invite (A1 s9.3).
  const pendingTriedRef = useRef(false);

  const load = useCallback(async () => {
    if (!userId) { setState({ ...EMPTY, loading: false }); return; }
    try {
      const partnerships = await getPartnershipsLocal(userId);
      let primary = pickPrimary(partnerships);
      let activeCount = await getActivePartnerCount(userId);
      let canAdd = canAddPartner({ tier, activeCount });

      // Re-surface a paywall-preserved invite (A1 s9.3): a user bounced at the
      // Pro gate with a code kept it. Now that they are eligible (Pro) and not
      // already paired, auto-open the redemption path once, expiry respected.
      // Runs before the render branches so a successful redeem lands the active
      // pairing on this same load pass.
      if (tier === 'pro' && !pendingTriedRef.current && !(primary && primary.status === 'active')) {
        pendingTriedRef.current = true;
        const storedCode = await readPendingPartnerCode();
        if (storedCode) {
          const rr = await redeemPartnerInvite(userId, storedCode);
          await clearPendingPartnerCode();
          if (rr.ok) {
            const refreshed = await getPartnershipsLocal(userId).catch(() => partnerships);
            primary = pickPrimary(refreshed);
            activeCount = await getActivePartnerCount(userId).catch(() => activeCount);
            canAdd = canAddPartner({ tier, activeCount });
          }
        }
      }

      if (!primary || primary.status !== 'active') {
        setState({
          ...EMPTY, loading: false, partnership: primary,
          rowState: partnerRowState({ partnership: primary }), canAdd, reload: load,
        });
        return;
      }

      // Paired now, so any cached pending invite (the inviter's single-mint
      // code) is spent — drop it so a later empty state mints fresh.
      clearCachedInvite();

      // Keep my own week signal current for the partner's ticks (fire-and-
      // forget; the workout-finish path and sync layer also drive this).
      writeOwnWeekSignals(userId).catch(() => {});

      const partnerId = primary.memberA === userId ? primary.memberB : primary.memberA;
      const [partnerWeek, myWeek, lastSentOn, lastReceived, pairSignals, sharedBlock] = await Promise.all([
        getPartnerWeekSignal(primary.id, partnerId),
        getPartnerWeekSignal(primary.id, userId),
        getLastCheerSentOn(primary.id, userId),
        getLastCheerReceived(primary.id, userId),
        getPairWeekSignals(primary.id),
        getPartnerSharedBlock(primary.id),
      ]);

      // Shared streak: pair the two members' finished weeks by week_start.
      const sharedStreak = primary.streakEnabled
        ? computeSharedStreak({ enabled: true, weeks: buildSharedWeeks(pairSignals, userId, partnerId) })
        : null;

      setState({
        loading: false,
        partnership: primary,
        rowState: partnerRowState({ partnership: primary, partnerWeek }),
        partnerWeek, myWeek, sharedStreak, lastReceived, sharedBlock, canAdd,
        cheerEnabled: cheerAllowed({ lastSentOn, today: todayLocalKey() }),
        reload: load,
      });
    } catch (_) {
      setState({ ...EMPTY, loading: false });
    }
  }, [userId, tier]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  // ── Actions (online; refresh local view after) ──
  // Single-mint (A1 s9.5): every share channel reuses the ONE active pending
  // code. Only mint a fresh code when nothing is cached (after cancel / expiry /
  // redemption clear it). The server enforces the same single-pending invariant.
  const invite = useCallback(async (opts) => {
    const cached = getCachedInvite(userId);
    if (cached) return { ok: true, data: cached };
    const r = await createPartnerInvite(userId, opts);
    if (r.ok && r.data) setCachedInvite(userId, r.data);
    return r; // caller drives the OS share sheet with r.data.shareMessage
  }, [userId]);

  const redeem = useCallback(async (code) => {
    const r = await redeemPartnerInvite(userId, code);
    if (r.ok) {
      clearCachedInvite();
      await clearPendingPartnerCode();
      await load();
    }
    return r;
  }, [userId, load]);

  const cheer = useCallback(async (pairId, reciprocal) => {
    const r = await sendCheer(userId, { pairId, reciprocal });
    await load();
    return r;
  }, [userId, load]);

  const unpair = useCallback(async (pairId) => {
    const r = await unpairPartner(userId, pairId);
    // Honour the deletion promise on THIS device immediately: the RPC purged the
    // pair's signals + cheers server-side; clear the local mirror now rather than
    // waiting for the next pull, so nothing shared lingers after "End".
    if (r.ok) {
      // Cancelling a pending invite (or ending a pairing) frees the single-mint
      // code so a fresh invite can be minted next time.
      clearCachedInvite();
      try { await deleteLocalPairSharedData(pairId); } catch (_) { /* best-effort */ }
    }
    await load();
    return r;
  }, [userId, load]);

  const block = useCallback(async (blockedId) => blockPartner(userId, blockedId), [userId]);

  // ── Shared training block (Wave 5 C5 A2) — online ops, local view refresh ──
  // Each success writes the local mirror BEFORE load(): load() reads only
  // SQLite and the next pull may be minutes away, so without this the screen
  // would keep showing the pre-action state (A3 review finding, 2026-07-03).
  const proposeBlock = useCallback(async (pairId, blockName) => {
    const r = await proposeSharedBlock(userId, { pairId, blockName });
    if (r.ok) {
      try {
        await upsertPartnerSharedBlockFromCloud({
          pair_id: pairId,
          block_name: String(blockName ?? '').trim().slice(0, 80),
          proposed_by: userId,
          status: 'proposed',
          updated_at: new Date().toISOString(),
        });
      } catch (_) { /* best-effort; the pull heals the mirror */ }
    }
    await load();
    return r;
  }, [userId, load]);

  const adoptBlock = useCallback(async (pairId) => {
    const r = await adoptSharedBlock(userId, pairId);
    if (r.ok) {
      try {
        const existing = await getPartnerSharedBlock(pairId);
        if (existing) {
          await upsertPartnerSharedBlockFromCloud({
            pair_id: pairId,
            block_ref: existing.blockRef ?? null,
            block_name: existing.blockName,
            proposed_by: existing.proposedBy,
            status: 'active',
            updated_at: new Date().toISOString(),
          });
        }
      } catch (_) { /* best-effort; the pull heals the mirror */ }
    }
    await load();
    return r;
  }, [userId, load]);

  const leaveBlock = useCallback(async (pairId) => {
    const r = await leaveSharedBlock(userId, pairId);
    // Same immediate-local-effect rule as unpair: the cloud row is gone, so
    // clear the mirror now rather than waiting for the next pull.
    if (r.ok) { try { await deleteLocalPartnerSharedBlock(pairId); } catch (_) { /* best-effort */ } }
    await load();
    return r;
  }, [userId, load]);

  return { ...state, invite, redeem, cheer, unpair, block, proposeBlock, adoptBlock, leaveBlock };
}

