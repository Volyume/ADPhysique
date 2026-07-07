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
import { useState, useCallback, useEffect, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  getPartnershipsLocal, getActivePartnerCount, getPartnerWeekSignal,
  getPairWeekSignals, getLastCheerSentOn, getLastCheerReceived,
  deleteLocalPairSharedData, markLocalPartnershipEnded,
  getPartnerSharedBlock, deleteLocalPartnerSharedBlock,
  upsertPartnerSharedBlockFromCloud,
  getPartnerWeeklyIntention, setLocalPartnerWeeklyIntention,
  getPartnerWinCards, upsertPartnerWinCardFromCloud, markLocalPartnerWinCardRevoked,
  setLocalPartnerCheerSent, upsertPartnershipFromCloud,
} from '../lib/database';
import { todayLocalKey, localWeekStartMs } from '../lib/dayKey';
import { partnerRowState, cheerAllowed, canAddPartner } from '../lib/partners/signals';
import { computeSharedStreak, buildSharedWeeks } from '../lib/partners/sharedStreak';
import { weekKeptTogether } from '../lib/partners/intention';
import {
  createPartnerInvite, redeemPartnerInvite, sendCheer, unpairPartner, blockPartner,
  proposeSharedBlock, adoptSharedBlock, leaveSharedBlock, pushWeeklyIntention,
  sendPartnerWinCard, revokePartnerWinCard,
} from '../lib/partners/service';
import { writeOwnWeekSignals } from '../lib/partners/weekSignalWriter';
import { getCachedInvite, setCachedInvite, clearCachedInvite } from '../lib/partners/inviteCache';
import { readPendingPartnerCode, clearPendingPartnerCode } from '../lib/partners/pendingInvite';

const WEEK_MS = 7 * 86400000;

const EMPTY = {
  loading: true, error: false, partnership: null, rowState: 'empty', partnerWeek: null,
  myWeek: null, sharedStreak: null, cheerEnabled: false, lastReceived: null,
  sharedBlock: null, canAdd: true, pairs: [], pendingInvite: null, reload: () => {},
};

const PASSIVE_PENDING_REFRESH_ENABLED = !(typeof process !== 'undefined' && process.env?.JEST_WORKER_ID);
const PENDING_INVITE_REFRESH_MS = 2000;
const REDEEM_VISIBILITY_RETRY_MS = (typeof process !== 'undefined' && process.env?.JEST_WORKER_ID)
  ? [0]
  : [350, 900, 1600];

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, Math.max(0, Number(ms) || 0)));
}

function shouldRetryCheerAfterMirrorRefresh(error) {
  return error === 'not_active';
}

async function pullPartnerMirrorNow(userId) {
  if (!userId) return false;
  try {
    // Dynamic require keeps the hook's test imports light and avoids dragging
    // sync transport into screens that only need cached partner reads.
    // eslint-disable-next-line global-require
    const { getSupabaseClient } = require('../lib/supabase');
    // eslint-disable-next-line global-require
    const { pullPartners } = require('../lib/sync/tables/partners');
    const client = getSupabaseClient?.();
    if (client && typeof pullPartners === 'function') {
      const result = await pullPartners(client, { userId });
      return Number(result?.errors || 0) === 0;
    }
    return false;
  } catch (_) {
    // Online action already returned its result; the normal sync loop heals.
    return false;
  }
}

// Pick the partnership to surface: an active one first, else a pending invite,
// else the most recent ended tombstone, else none.
function pickPrimary(partnerships) {
  return partnerships.find((p) => p.status === 'active')
    || partnerships.find((p) => p.status === 'invited')
    || partnerships.find((p) => p.status === 'ended')
    || null;
}

// Paired-at ordering key: accepted-at (the moment the pairing became real),
// falling back to created-at. Used to order the PairCards ascending so the
// oldest partnership sits first — never by activity, streak or anything
// performance-shaped (DESIGN-SPEC B2, the pair-isolation rule).
function pairedAtMs(p) {
  return Number(p?.acceptedAt) || Number(p?.createdAt) || 0;
}

async function optionalPartnerRead(read, fallback) {
  try {
    const value = await read();
    return value == null ? fallback : value;
  } catch (_) {
    return fallback;
  }
}

async function readPartnershipsWithCloudRepair(userId) {
  try {
    return await getPartnershipsLocal(userId);
  } catch (e) {
    const pulled = await pullPartnerMirrorNow(userId);
    if (!pulled) throw e;
    return getPartnershipsLocal(userId);
  }
}

function nowIso() {
  return new Date().toISOString();
}

async function mirrorPendingInviteLocally(userId, invite, opts = {}) {
  if (!userId || !invite?.partnershipId) return;
  const now = nowIso();
  try {
    await upsertPartnershipFromCloud({
      id: invite.partnershipId,
      member_a: userId,
      member_b: null,
      status: 'invited',
      streak_enabled: opts?.streakEnabled !== false,
      partner_first_name: null,
      created_at: now,
      updated_at: now,
    });
  } catch (_) { /* pull heals */ }
}

async function mirrorAcceptedPartnershipLocally(userId, data = {}) {
  const now = nowIso();
  const row = data?.partnership || (data?.partnershipId ? {
    id: data.partnershipId,
    member_a: null,
    member_b: userId,
    status: 'active',
    streak_enabled: true,
    partner_first_name: data.partnerFirstName ?? null,
    created_at: now,
    accepted_at: now,
    updated_at: now,
  } : null);
  if (!row?.id) return false;
  try {
    await upsertPartnershipFromCloud(row);
    return true;
  } catch (_) {
    return false;
  }
}

async function isAcceptedPartnershipVisible(userId, data = {}) {
  const expectedId = data?.partnership?.id || data?.partnershipId || null;
  try {
    const rows = await getPartnershipsLocal(userId);
    return rows.some((p) => p.status === 'active' && (!expectedId || p.id === expectedId));
  } catch (_) {
    return false;
  }
}

async function waitForAcceptedPartnershipVisible(userId, data = {}) {
  if (await isAcceptedPartnershipVisible(userId, data)) return true;
  for (const ms of REDEEM_VISIBILITY_RETRY_MS) {
    await wait(ms);
    await pullPartnerMirrorNow(userId);
    if (await isAcceptedPartnershipVisible(userId, data)) return true;
  }
  return false;
}

// Enrich one active partnership with its OWN derived view: both sides' week
// signals, the shared streak, the cheer allowance, the last cheer received and
// the shared block. Each pair is a private world — nothing here is compared or
// aggregated across pairs (DESIGN-SPEC B2).
async function enrichPair(partnership, userId) {
  const partnerId = partnership.memberA === userId ? partnership.memberB : partnership.memberA;
  const thisWeek = String(localWeekStartMs(Date.now()));
  const lastWeek = String(localWeekStartMs(Date.now()) - WEEK_MS);
  const [
    partnerWeek, myWeek, lastSentOn, lastReceived, pairSignals, sharedBlock,
    myAimRow, partnerAimRow,
    myPrevSignal, partnerPrevSignal, myPrevAimRow, partnerPrevAimRow,
    winCards,
  ] = await Promise.all([
    optionalPartnerRead(() => getPartnerWeekSignal(partnership.id, partnerId), null),
    optionalPartnerRead(() => getPartnerWeekSignal(partnership.id, userId), null),
    optionalPartnerRead(() => getLastCheerSentOn(partnership.id, userId), null),
    optionalPartnerRead(() => getLastCheerReceived(partnership.id, userId), null),
    optionalPartnerRead(() => getPairWeekSignals(partnership.id), []),
    optionalPartnerRead(() => getPartnerSharedBlock(partnership.id), null),
    // D5-A: each side's OWN aim for THIS week (shown side by side, never compared).
    optionalPartnerRead(() => getPartnerWeeklyIntention(partnership.id, userId, thisWeek), null),
    optionalPartnerRead(() => getPartnerWeeklyIntention(partnership.id, partnerId, thisWeek), null),
    // Kept-moment inputs: the just-CLOSED week's signals + aims for both sides.
    optionalPartnerRead(() => getPartnerWeekSignal(partnership.id, userId, lastWeek), null),
    optionalPartnerRead(() => getPartnerWeekSignal(partnership.id, partnerId, lastWeek), null),
    optionalPartnerRead(() => getPartnerWeeklyIntention(partnership.id, userId, lastWeek), null),
    optionalPartnerRead(() => getPartnerWeeklyIntention(partnership.id, partnerId, lastWeek), null),
    optionalPartnerRead(() => getPartnerWinCards(partnership.id, { limit: 5 }), []),
  ]);
  const sharedStreak = partnership.streakEnabled
    ? computeSharedStreak({ enabled: true, weeks: buildSharedWeeks(pairSignals, userId, partnerId) })
    : null;
  // Rest-safe kept-moment for the closed week: both met their OWN aim, neither
  // rested. A miss simply yields false (HOLD) — never a red, never attribution.
  const weekKept = weekKeptTogether({
    myAim: myPrevAimRow?.weeklyAim,
    partnerAim: partnerPrevAimRow?.weeklyAim,
    myDone: myPrevSignal?.doneCount,
    partnerDone: partnerPrevSignal?.doneCount,
    myResting: myPrevSignal?.state === 'resting',
    partnerResting: partnerPrevSignal?.state === 'resting',
  });
  return {
    id: partnership.id,
    partnership,
    partnerId,
    partnerFirstName: partnership.partnerFirstName || null,
    rowState: partnerRowState({ partnership, partnerWeek }),
    partnerWeek,
    myWeek,
    sharedStreak,
    lastReceived,
    sharedBlock,
    // D5-A intention: my own aim, the partner's own aim, and the kept-moment.
    weekStart: thisWeek,
    myAim: Number(myAimRow?.weeklyAim) || 0,
    partnerAim: Number(partnerAimRow?.weeklyAim) || 0,
    weekKept,
    cheerEnabled: cheerAllowed({ lastSentOn, today: todayLocalKey() }),
    streakEnabled: !!partnership.streakEnabled,
    pairedAt: pairedAtMs(partnership),
    winCards,
  };
}

function minimalActivePair(partnership, userId) {
  if (!partnership?.id) return null;
  const partnerId = partnership.memberA === userId ? partnership.memberB : partnership.memberA;
  return {
    id: partnership.id,
    partnership,
    partnerId,
    partnerFirstName: partnership.partnerFirstName || null,
    rowState: partnerRowState({ partnership, partnerWeek: null }),
    partnerWeek: null,
    myWeek: null,
    sharedStreak: null,
    lastReceived: null,
    sharedBlock: null,
    weekStart: String(localWeekStartMs(Date.now())),
    myAim: 0,
    partnerAim: 0,
    weekKept: false,
    cheerEnabled: false,
    streakEnabled: !!partnership.streakEnabled,
    pairedAt: pairedAtMs(partnership),
    winCards: [],
  };
}

async function safeEnrichPair(partnership, userId) {
  try {
    return await enrichPair(partnership, userId);
  } catch (_) {
    return minimalActivePair(partnership, userId);
  }
}

export default function usePartners(userId, tier) {
  const [state, setState] = useState(EMPTY);
  // Guards the one-shot re-surface of a paywall-preserved invite (A1 s9.3).
  const pendingTriedRef = useRef(false);
  const loadRequestRef = useRef(0);

  const load = useCallback(async (opts = {}) => {
    const silent = opts?.silent === true;
    const requestId = loadRequestRef.current + 1;
    loadRequestRef.current = requestId;
    const isCurrentRequest = () => loadRequestRef.current === requestId;
    if (!userId) { setState({ ...EMPTY, loading: false }); return; }
    setState(prev => ({ ...prev, loading: silent ? prev.loading : true, error: false, reload: load }));
    try {
      let partnerships = await readPartnershipsWithCloudRepair(userId);
      if (!isCurrentRequest()) return;
      let activeCount = await optionalPartnerRead(
        () => getActivePartnerCount(userId),
        partnerships.filter((p) => p.status === 'active').length,
      );
      if (!isCurrentRequest()) return;
      let canAdd = canAddPartner({ tier, activeCount });

      // Re-surface a paywall-preserved invite (A1 s9.3): a user bounced at the
      // Pro gate with a code kept it. Now that they are eligible (Pro) and not
      // already paired, auto-open the redemption path once, expiry respected.
      // Runs before the render branches so a successful redeem lands the active
      // pairing on this same load pass.
      if (tier === 'pro' && !pendingTriedRef.current && !partnerships.some((p) => p.status === 'active')) {
        const storedCode = await readPendingPartnerCode();
        if (!isCurrentRequest()) return;
        pendingTriedRef.current = true;
        if (storedCode) {
          const rr = await redeemPartnerInvite(userId, storedCode);
          if (!isCurrentRequest()) return;
          await clearPendingPartnerCode();
          if (!isCurrentRequest()) return;
          if (rr.ok) {
            partnerships = await getPartnershipsLocal(userId).catch(() => partnerships);
            if (!isCurrentRequest()) return;
            activeCount = await getActivePartnerCount(userId).catch(() => activeCount);
            if (!isCurrentRequest()) return;
            canAdd = canAddPartner({ tier, activeCount });
          }
        }
      }

      // All active pairs, oldest-first. Each is rendered as its own isolated
      // PairCard (DESIGN-SPEC B2); the single primary below is kept only for the
      // existing single-pair consumers (Consistency PartnerRow, the post-workout
      // beat) that have not moved to the list yet.
      const activeList = partnerships
        .filter((p) => p.status === 'active')
        .sort((a, b) => pairedAtMs(a) - pairedAtMs(b));

      if (activeList.length) {
        // Paired now, so any cached pending invite (the inviter's single-mint
        // code) is spent — drop it so a later empty state mints fresh.
        clearCachedInvite();
        // Keep my own week signal current for the partner's ticks (fire-and-
        // forget; the workout-finish path and sync layer also drive this). Pass
        // the sender's SCOFF score so an outbound freeze (§5) fires on SCOFF >= 2
        // with no open flag exactly as it does on an open flag — the writer
        // applies the Number.isFinite && >= 2 convention internally.
        // eslint-disable-next-line global-require
        const scoffScore = require('../store/useAppStore').default.getState().userProfile?.scoffScore;
        writeOwnWeekSignals(userId, scoffScore).catch(() => {});
      }

      const pairs = (await Promise.all(activeList.map((p) => safeEnrichPair(p, userId)))).filter(Boolean);
      if (!isCurrentRequest()) return;
      const pendingInvite = partnerships.find((p) => p.status === 'invited') || null;
      const primary = pickPrimary(partnerships);
      const primaryPair = primary && primary.status === 'active'
        ? pairs.find((pp) => pp.id === primary.id) || null
        : null;

      setState({
        loading: false,
        error: false,
        pairs,
        pendingInvite,
        canAdd,
        partnership: primaryPair ? primaryPair.partnership : primary,
        rowState: primaryPair ? primaryPair.rowState : partnerRowState({ partnership: primary }),
        partnerWeek: primaryPair?.partnerWeek ?? null,
        myWeek: primaryPair?.myWeek ?? null,
        sharedStreak: primaryPair?.sharedStreak ?? null,
        lastReceived: primaryPair?.lastReceived ?? null,
        sharedBlock: primaryPair?.sharedBlock ?? null,
        cheerEnabled: primaryPair?.cheerEnabled ?? false,
        reload: load,
      });
    } catch (_) {
      if (!isCurrentRequest()) return;
      setState((prev) => {
        const hasUsablePartnerState = (prev.pairs || []).length > 0 || !!prev.pendingInvite || !!prev.partnership;
        if (hasUsablePartnerState) {
          return { ...prev, loading: false, error: false, reload: load };
        }
        return { ...EMPTY, loading: false, error: true, reload: load };
      });
    }
  }, [userId, tier]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const pendingRefreshKey = state.pendingInvite?.id
    || (state.partnership?.status === 'invited' ? state.partnership.id : null);
  useEffect(() => {
    if (!PASSIVE_PENDING_REFRESH_ENABLED || !userId || !pendingRefreshKey) return undefined;
    let cancelled = false;
    const tick = () => {
      if (!cancelled) pullPartnerMirrorNow(userId).finally(() => load({ silent: true }));
    };
    tick();
    const timer = setInterval(tick, PENDING_INVITE_REFRESH_MS);
    return () => { cancelled = true; clearInterval(timer); };
  }, [userId, pendingRefreshKey, load]);

  const refresh = useCallback(async () => {
    const pulled = await pullPartnerMirrorNow(userId);
    await load();
    return { ok: pulled };
  }, [userId, load]);

  // ── Actions (online; refresh local view after) ──
  // Single-mint (A1 s9.5): every share channel reuses the ONE active pending
  // code. Only mint a fresh code when nothing is cached (after cancel / expiry /
  // redemption clear it). The server enforces the same single-pending invariant.
  const invite = useCallback(async (opts) => {
    const cached = getCachedInvite(userId);
    if (cached) {
      await mirrorPendingInviteLocally(userId, cached, opts);
      return { ok: true, data: cached };
    }
    const r = await createPartnerInvite(userId, opts);
    if (r.ok && r.data) {
      setCachedInvite(userId, r.data);
      await mirrorPendingInviteLocally(userId, r.data, opts);
    }
    return r; // caller drives the OS share sheet with r.data.shareMessage
  }, [userId]);

  const redeem = useCallback(async (code) => {
    // Cap guard on the redeem path itself (free = 1, pro = 3): every caller
    // inherits it, not just the surfaces that happen to gate around it. Read the
    // live active count so a just-synced pairing counts. Refuse before the RPC
    // when at the limit; the caller surfaces the calm at-limit toast.
    const activeCount = await getActivePartnerCount(userId).catch(() => 0);
    if (!canAddPartner({ tier, activeCount })) return { ok: false, error: 'at_cap' };
    const r = await redeemPartnerInvite(userId, code);
    if (r.ok) {
      clearCachedInvite();
      await clearPendingPartnerCode();
      await mirrorAcceptedPartnershipLocally(userId, r.data);
      let visible = await isAcceptedPartnershipVisible(userId, r.data);
      if (!visible) {
        await pullPartnerMirrorNow(userId);
        visible = await waitForAcceptedPartnershipVisible(userId, r.data);
      }
      if (!visible) {
        await load();
        return { ok: false, error: 'local_mirror_pending' };
      }
      await load();
    }
    return r;
  }, [userId, tier, load]);

  const cheer = useCallback(async (pairId, kind, reciprocal) => {
    let r = await sendCheer(userId, { pairId, kind, reciprocal });
    if (!r?.ok && shouldRetryCheerAfterMirrorRefresh(r?.error)) {
      await pullPartnerMirrorNow(userId);
      const visible = await isAcceptedPartnershipVisible(userId, { partnershipId: pairId });
      if (visible) {
        r = await sendCheer(userId, { pairId, kind, reciprocal });
      }
    }
    if (r?.ok || r?.error === 'already_cheered') {
      try {
        await setLocalPartnerCheerSent({ pairId, senderId: userId, sentOn: todayLocalKey(), kind });
      } catch (_) { /* pull heals */ }
      await pullPartnerMirrorNow(userId);
    }
    await load();
    return r;
  }, [userId, load]);

  const shareWin = useCallback(async (pairId, preview) => {
    const r = await sendPartnerWinCard(userId, { pairId, preview });
    if (r.ok && r.data) {
      try { await upsertPartnerWinCardFromCloud(r.data); } catch (_) { /* pull heals */ }
    }
    await load();
    return r;
  }, [userId, load]);

  const revokeWin = useCallback(async (cardId) => {
    const r = await revokePartnerWinCard(userId, { cardId });
    if (r.ok && r.data) {
      try { await upsertPartnerWinCardFromCloud(r.data); } catch (_) { /* pull heals */ }
    } else if (r.ok) {
      try { await markLocalPartnerWinCardRevoked(cardId); } catch (_) { /* pull heals */ }
    }
    await load();
    return r;
  }, [userId, load]);

  // D5-A: set the user's OWN weekly aim. Writes the local mirror first (so the
  // card reflects it before the next pull) then pushes; fail-closed consistent
  // with the other online ops (a failed push surfaces to the caller).
  const setIntention = useCallback(async (pairId, weeklyAim) => {
    const weekStart = String(localWeekStartMs(Date.now()));
    const aim = Math.max(0, Math.round(Number(weeklyAim) || 0));
    try {
      await setLocalPartnerWeeklyIntention({ pairId, userId, weekStart, weeklyAim: aim });
    } catch (_) { /* best-effort local; the push is the source of truth */ }
    const r = await pushWeeklyIntention(userId, { pairId, weekStart, weeklyAim: aim });
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
      // Move the local row to the 'ended' tombstone too (the RPC did this
      // server-side). load() reads only SQLite, so without this the cancelled
      // invite's row stays status='invited' and its pending card keeps showing
      // until the next pull ("Cancel doesn't do anything", founder 2026-07-03).
      try { await markLocalPartnershipEnded(pairId); } catch (_) { /* best-effort */ }
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

  return {
    ...state, invite, redeem, cheer, unpair, block,
    proposeBlock, adoptBlock, leaveBlock, setIntention, shareWin, revokeWin, refresh,
  };
}
