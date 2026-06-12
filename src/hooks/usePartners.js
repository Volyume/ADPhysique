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
import { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  getPartnershipsLocal, getActivePartnerCount, getPartnerWeekSignal,
  getPairWeekSignals, getLastCheerSentOn, getLastCheerReceived,
} from '../lib/database';
import { todayLocalKey } from '../lib/dayKey';
import { partnerRowState, cheerAllowed, canAddPartner } from '../lib/partners/signals';
import { computeSharedStreak } from '../lib/partners/sharedStreak';
import {
  createPartnerInvite, redeemPartnerInvite, sendCheer, unpairPartner, blockPartner,
} from '../lib/partners/service';

const EMPTY = {
  loading: true, partnership: null, rowState: 'empty', partnerWeek: null,
  myWeek: null, sharedStreak: null, cheerEnabled: false, lastReceived: null,
  canAdd: true, reload: () => {},
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

  const load = useCallback(async () => {
    if (!userId) { setState({ ...EMPTY, loading: false }); return; }
    try {
      const partnerships = await getPartnershipsLocal(userId);
      const primary = pickPrimary(partnerships);
      const activeCount = await getActivePartnerCount(userId);
      const canAdd = canAddPartner({ tier, activeCount });

      if (!primary || primary.status !== 'active') {
        setState({
          ...EMPTY, loading: false, partnership: primary,
          rowState: partnerRowState({ partnership: primary }), canAdd, reload: load,
        });
        return;
      }

      const partnerId = primary.memberA === userId ? primary.memberB : primary.memberA;
      const [partnerWeek, myWeek, lastSentOn, lastReceived, pairSignals] = await Promise.all([
        getPartnerWeekSignal(primary.id, partnerId),
        getPartnerWeekSignal(primary.id, userId),
        getLastCheerSentOn(primary.id, userId),
        getLastCheerReceived(primary.id, userId),
        getPairWeekSignals(primary.id),
      ]);

      // Shared streak: pair the two members' finished weeks by week_start.
      const sharedStreak = primary.streakEnabled
        ? computeSharedStreak({ enabled: true, weeks: buildSharedWeeks(pairSignals, userId, partnerId) })
        : null;

      setState({
        loading: false,
        partnership: primary,
        rowState: partnerRowState({ partnership: primary, partnerWeek }),
        partnerWeek, myWeek, sharedStreak, lastReceived, canAdd,
        cheerEnabled: cheerAllowed({ lastSentOn, today: todayLocalKey() }),
        reload: load,
      });
    } catch (_) {
      setState({ ...EMPTY, loading: false });
    }
  }, [userId, tier]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  // ── Actions (online; refresh local view after) ──
  const invite = useCallback(async (opts) => {
    const r = await createPartnerInvite(userId, opts);
    return r; // caller drives the OS share sheet with r.data.shareMessage
  }, [userId]);

  const redeem = useCallback(async (code) => {
    const r = await redeemPartnerInvite(userId, code);
    if (r.ok) await load();
    return r;
  }, [userId, load]);

  const cheer = useCallback(async (pairId, reciprocal) => {
    const r = await sendCheer(userId, { pairId, reciprocal });
    await load();
    return r;
  }, [userId, load]);

  const unpair = useCallback(async (pairId) => {
    const r = await unpairPartner(userId, pairId);
    await load();
    return r;
  }, [userId, load]);

  const block = useCallback(async (blockedId) => blockPartner(userId, blockedId), [userId]);

  return { ...state, invite, redeem, cheer, unpair, block };
}

// Align both members' finished weeks (exclude the in-progress current week is
// the caller's job; here we just join by week_start across the synced rows).
function buildSharedWeeks(pairSignals, myId, partnerId) {
  const byWeek = new Map();
  for (const s of (pairSignals || [])) {
    const slot = byWeek.get(s.weekStart) || {};
    if (s.userId === myId) { slot.aMet = !!s.weekMet; slot.aResting = s.state === 'resting'; }
    else if (s.userId === partnerId) { slot.bMet = !!s.weekMet; slot.bResting = s.state === 'resting'; }
    byWeek.set(s.weekStart, slot);
  }
  // Only weeks where BOTH sides have reported feed the shared streak.
  return [...byWeek.entries()]
    .sort((a, b) => Number(a[0]) - Number(b[0]))
    .map(([, v]) => v)
    .filter((v) => ('aMet' in v) && ('bMet' in v));
}
