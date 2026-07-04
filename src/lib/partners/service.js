/**
 * NEW-002 — partner online operations (§4.2, §4.4, §4.8).
 *
 * Pairing is the one online-required step (code redemption resolves cross-user
 * server-side); everything after reads from the local cache. These wrappers
 * call the SECURITY DEFINER RPCs (create/redeem), the partner-cheer edge
 * function, and the RLS-scoped tables, and emit the four derived telemetry
 * events (counts/booleans only — NEVER partner identity).
 *
 * Every call is defensive: it returns { ok, data?, error? } and never throws at
 * the caller, so a flaky network degrades to a benign retry, not a crash.
 */

import { getSupabaseClient } from '../supabase';
import { track } from '../engineTelemetry';
import { buildInviteLinks, inviteShareMessage } from './link';
import { recordPartnerSharingConsent } from './consent';
import { isValidAckKey, DEFAULT_ACK_KEY } from './acknowledgements';
import {
  trackInviteMinted, trackInviteRedeemed, trackCheerSent, trackUnpair,
} from './telemetry';

function fail(error) {
  return { ok: false, error: error?.message || String(error || 'unknown') };
}

/**
 * Create an invite: the server generates the code and stores only its hash; we
 * receive the plaintext once to share out-of-band. Emits partner_invite_sent.
 */
export async function createPartnerInvite(userId, { streakEnabled = true } = {}) {
  const c = getSupabaseClient();
  if (!c || !userId) return fail('offline');
  try {
    const { data, error } = await c.rpc('create_partner_invite', { _streak_enabled: streakEnabled });
    if (error) return fail(error);
    const row = Array.isArray(data) ? data[0] : data;
    if (!row?.invite_code) return fail('no_code');
    const links = buildInviteLinks(row.invite_code);
    track(userId, 'partner_invite_sent', { streak_enabled: !!streakEnabled })?.catch?.(() => {});
    trackInviteMinted();
    return {
      ok: true,
      data: {
        partnershipId: row.partnership_id,
        ...links,
        shareMessage: inviteShareMessage(links),
      },
    };
  } catch (e) {
    return fail(e);
  }
}

/**
 * Redeem an invite code. The RPC enforces not-self / not-expired / single-use /
 * not-blocked and raises one indistinguishable 'invite_invalid' on any failure.
 * Emits partner_invite_accepted on success. Returns the inviter's first name
 * when the 102 RPC shape is live (server-snapshotted from the enrolment name).
 */
export async function redeemPartnerInvite(userId, code) {
  const c = getSupabaseClient();
  if (!c || !userId) return fail('offline');
  try {
    const { data, error } = await c.rpc('redeem_partner_invite', { _code: code });
    if (error) {
      // The RPC raises 'invite_invalid' for every failure path by design.
      return { ok: false, error: 'invite_invalid' };
    }
    // Two RPC shapes: migrate_102 returns a one-row table
    // { partnership_id, partner_first_name }; the 081 RPC (production until the
    // founder applies 102) returns a bare uuid. Handle both so this build works
    // against either; pre-102 the name is simply absent and the UI's existing
    // 'Your partner' fallback holds.
    const row = Array.isArray(data) ? data[0] : data;
    const pairId = (row && typeof row === 'object') ? row.partnership_id : row;
    const partnerFirstName = (row && typeof row === 'object') ? (row.partner_first_name || null) : null;
    if (!pairId) return { ok: false, error: 'invite_invalid' };
    // Capture the partner-sharing consent on the accept act (A4 s6). This rides
    // the same append-only consent_log rail as the Article 9 health consent.
    // FAIL CLOSED: if the consent write fails, the pairing does not complete —
    // roll the just-redeemed partnership back (end_partnership purges + tombs
    // it) and surface the same calm redemption failure, so no sharing begins
    // without a recorded consent.
    const consent = await recordPartnerSharingConsent(userId, { granted: true });
    if (!consent.ok) {
      try { await c.rpc('end_partnership', { _pair_id: pairId }); } catch (_) { /* best-effort rollback */ }
      return { ok: false, error: 'consent_failed' };
    }
    track(userId, 'partner_invite_accepted', {})?.catch?.(() => {});
    trackInviteRedeemed();
    return { ok: true, data: { partnershipId: pairId, partnerFirstName } };
  } catch (e) {
    return fail(e);
  }
}

/**
 * Send a one-tap cheer via the partner-cheer edge function (validates the
 * partnership + the one-per-day rate limit server-side, inserts the cheer, and
 * fans out the push unless an ED/wellbeing flag is open — in which case the
 * recipient's delivery downgrades to in-app-only, §5). Emits partner_cheer_sent
 * with the reciprocal boolean (Strava: reciprocity is the active ingredient).
 *
 * D5-B1: the sender picks a FIXED acknowledgement `kind` from the closed enum
 * (never free text). It is validated here and passed to the edge function, which
 * stores it and uses its line in the push. An unknown/absent kind collapses to
 * the quiet default so an old caller keeps working.
 */
export async function sendCheer(userId, { pairId, kind = DEFAULT_ACK_KEY, reciprocal = false } = {}) {
  const c = getSupabaseClient();
  if (!c || !userId || !pairId) return fail('offline');
  const ackKind = isValidAckKey(kind) ? kind : DEFAULT_ACK_KEY;
  try {
    const { data, error } = await c.functions.invoke('partner-cheer', { body: { pairId, kind: ackKind } });
    if (error) return fail(error);
    track(userId, 'partner_cheer_sent', { reciprocal: !!reciprocal })?.catch?.(() => {});
    trackCheerSent();
    return { ok: true, data };
  } catch (e) {
    return fail(e);
  }
}

/**
 * Push the user's OWN weekly intention (an integer session aim against their own
 * plan) into a pair (D5-A). RLS-scoped direct upsert on the member's own row —
 * derived-safe, one small integer, never raw training data. The partner reads it
 * from their pull; the two aims are shown side by side but NEVER compared.
 */
export async function pushWeeklyIntention(userId, { pairId, weekStart, weeklyAim } = {}) {
  const c = getSupabaseClient();
  if (!c || !userId || !pairId || !weekStart) return fail('offline');
  try {
    const { error } = await c.from('partner_weekly_intentions').upsert({
      pair_id: pairId,
      user_id: userId,
      week_start: String(weekStart),
      weekly_aim: Math.max(0, Math.round(Number(weeklyAim) || 0)),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'pair_id,user_id,week_start' });
    if (error) return fail(error);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/**
 * Block a person from sending new invites. Stored by user id; the redeem RPC
 * consults it and returns the same 'invite_invalid' so the block is invisible.
 * Emits partner_blocked (expected ≈0; any sustained nonzero is a design smell).
 */
export async function blockPartner(userId, blockedId) {
  const c = getSupabaseClient();
  if (!c || !userId || !blockedId) return fail('offline');
  try {
    const { error } = await c.from('partner_blocks')
      .upsert({ blocker_id: userId, blocked_id: blockedId }, { onConflict: 'blocker_id,blocked_id' });
    if (error) return fail(error);
    track(userId, 'partner_blocked', {})?.catch?.(() => {});
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/**
 * End a partnership. Silent and immediate: the other side sees only
 * "Partnership ended" (no reason). Honours the in-app deletion promise (blueprint
 * §5): the end_partnership RPC (migration 092) DELETES the pair's week signals
 * and cheers server-side and marks the partnership 'ended' (the tombstone stays
 * so the other person sees only that it ended). A bare UPDATE never fired the
 * ON DELETE CASCADE — the RPC is what actually purges the shared data.
 */
export async function unpairPartner(userId, pairId) {
  const c = getSupabaseClient();
  if (!c || !userId || !pairId) return fail('offline');
  try {
    const { error } = await c.rpc('end_partnership', { _pair_id: pairId });
    if (error) return fail(error);
    // Record the sharing-consent WITHDRAWAL on the same append-only rail as the
    // grant (A4 s6). Best-effort by design: the user must always be able to
    // leave, so a failed withdrawal record never blocks the unpair (mirrors the
    // health-consent withdrawal soft-fail in useAccountActions).
    recordPartnerSharingConsent(userId, { granted: false }).catch(() => {});
    trackUnpair();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/**
 * Push the user's own derived week signal (planned/done/met/state) into a pair.
 * Tiny derived row, never raw workouts. Caller computes it from computeWeekState.
 *
 * completedBlock / hitPb are the two milestone-moment booleans (finished a block
 * this week / set at least one PB this week). Booleans ONLY, never a number or
 * content; the caller (weekSignalWriter) forces them false under the ED freeze.
 */
export async function pushWeekSignal(userId, { pairId, weekStart, planned, done, weekMet, state, completedBlock = false, hitPb = false } = {}) {
  const c = getSupabaseClient();
  if (!c || !userId || !pairId || !weekStart) return fail('offline');
  try {
    const { error } = await c.from('partner_week_signals').upsert({
      pair_id: pairId,
      user_id: userId,
      week_start: String(weekStart),
      planned_count: Math.max(0, Math.round(Number(planned) || 0)),
      done_count: Math.max(0, Math.round(Number(done) || 0)),
      week_met: !!weekMet,
      state: state === 'resting' ? 'resting' : 'training',
      completed_block: !!completedBlock,
      hit_pb: !!hitPb,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'pair_id,user_id,week_start' });
    if (error) return fail(error);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

// ── Shared training block (Wave 5 C5 A1) ──
// One row per pair; the ONLY user-chosen content is the display name the
// proposer deliberately shares (capped at 80 characters). Never plan content:
// no exercises, days, sets or weights cross the wire (§5; pinned by
// partnerPrivacy.guard.test.js). block_ref is server-minted.

/**
 * Propose training the same block: replace any previous row for the pair with
 * a fresh proposal (a new proposal means a new server-minted block_ref).
 * Emits partner_block_proposed (derived only — never the name).
 */
export async function proposeSharedBlock(userId, { pairId, blockName } = {}) {
  const c = getSupabaseClient();
  const name = String(blockName ?? '').trim().slice(0, 80);
  if (!c || !userId || !pairId || !name) return fail('offline');
  try {
    // Delete-then-insert rather than upsert so a re-proposal mints a fresh
    // block_ref (the DB default) instead of inheriting the old block's id.
    const { error: delErr } = await c.from('partner_shared_blocks')
      .delete().eq('pair_id', pairId);
    if (delErr) return fail(delErr);
    const { error } = await c.from('partner_shared_blocks').insert({
      pair_id: pairId,
      block_name: name,
      proposed_by: userId,
      status: 'proposed',
      updated_at: new Date().toISOString(),
    });
    if (error) return fail(error);
    track(userId, 'partner_block_proposed', {})?.catch?.(() => {});
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/**
 * Adopt the block the partner proposed. Only the non-proposer can flip it to
 * active (enforced here by the proposer filter; membership by RLS). Emits
 * partner_block_adopted.
 */
export async function adoptSharedBlock(userId, pairId) {
  const c = getSupabaseClient();
  if (!c || !userId || !pairId) return fail('offline');
  try {
    const { data, error } = await c.from('partner_shared_blocks')
      .update({ status: 'active', updated_at: new Date().toISOString() })
      .eq('pair_id', pairId)
      .eq('status', 'proposed')
      .neq('proposed_by', userId)
      .select('pair_id');
    if (error) return fail(error);
    if (!data?.length) return fail('not_adoptable');
    track(userId, 'partner_block_adopted', {})?.catch?.(() => {});
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/**
 * Leave (or withdraw) the shared block: the row is DELETED for both sides —
 * the same deletion promise as unpair, scoped to the block. Either member.
 * Emits partner_block_left.
 */
export async function leaveSharedBlock(userId, pairId) {
  const c = getSupabaseClient();
  if (!c || !userId || !pairId) return fail('offline');
  try {
    const { error } = await c.from('partner_shared_blocks')
      .delete().eq('pair_id', pairId);
    if (error) return fail(error);
    track(userId, 'partner_block_left', {})?.catch?.(() => {});
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/**
 * Read the partner view: the user's partnerships plus, for active ones, both
 * sides' recent week signals and cheers. Server-authoritative; the UI renders
 * the local cache between syncs.
 */
export async function fetchPartnerView(userId) {
  const c = getSupabaseClient();
  if (!c || !userId) return fail('offline');
  try {
    const { data: partnerships, error } = await c.from('partnerships')
      .select('*')
      .or(`member_a.eq.${userId},member_b.eq.${userId}`)
      .in('status', ['invited', 'active']);
    if (error) return fail(error);
    return { ok: true, data: { partnerships: partnerships || [] } };
  } catch (e) {
    return fail(e);
  }
}
