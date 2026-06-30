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
 * Emits partner_invite_accepted on success.
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
    track(userId, 'partner_invite_accepted', {})?.catch?.(() => {});
    return { ok: true, data: { partnershipId: data } };
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
 */
export async function sendCheer(userId, { pairId, reciprocal = false } = {}) {
  const c = getSupabaseClient();
  if (!c || !userId || !pairId) return fail('offline');
  try {
    const { data, error } = await c.functions.invoke('partner-cheer', { body: { pairId } });
    if (error) return fail(error);
    track(userId, 'partner_cheer_sent', { reciprocal: !!reciprocal })?.catch?.(() => {});
    return { ok: true, data };
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
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/**
 * Push the user's own derived week signal (planned/done/met/state) into a pair.
 * Tiny derived row, never raw workouts. Caller computes it from computeWeekState.
 */
export async function pushWeekSignal(userId, { pairId, weekStart, planned, done, weekMet, state } = {}) {
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
      updated_at: new Date().toISOString(),
    }, { onConflict: 'pair_id,user_id,week_start' });
    if (error) return fail(error);
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
