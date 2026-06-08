/**
 * partnerService.js — Training Partners (private accountability)
 *
 * The ONE sanctioned exception to "components never query Supabase directly".
 * Screens call this module; this module owns every partner cloud read/write so
 * no screen ever touches Supabase for partner data. See the approved proposal
 * docs/phase2-research/phase2-02-accountability-proposal.md.
 *
 * Architecture (critical): accountability is cross-user, so it MUST NOT go
 * through Volyume's strictly single-owner offline sync engine (src/lib/sync/).
 * These reads/writes hit new member-scoped-RLS tables (migration 075) directly.
 * The local `workouts` table stays the source of truth for the user's own
 * training; we PUBLISH a derived weekly signal upward (server-computed, the
 * client cannot fake it) and READ partners' signals downward.
 *
 * Hard guarantees enforced here AND by schema:
 *   - No weight / food / body / performance / PR / check-in / coaching / ED
 *     data ever leaves the device through this module — those columns do not
 *     exist on any partner table.
 *   - Everything no-ops gracefully (returns empty/ok-false, never throws to the
 *     UI) when: Supabase is unconfigured, the user is not Pro, the
 *     'training_partners' feature flag is off, or the network is down.
 *   - Offline: signal reads fall back to a small AsyncStorage cache so the
 *     You-tab card renders instantly and never spins forever.
 *
 * Deviation note: the proposal sketched the offline cache as a SQLite table in
 * database.js's SCHEMA_MIGRATIONS array. We use AsyncStorage instead (as
 * feedback.js does) to keep the cache out of the shipped device-DB migration
 * path. Behaviourally identical for the UI; trivially reversible.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getSupabaseClient, isSupabaseConfigured, getCurrentUser } from '../supabase';
import { track } from '../observability';

export const NUDGE_EMOJI_PLACEHOLDER = null; // (kept intentionally minimal)

export const MEMBER_CAP_DEFAULT = 6;
// First-week onboarding lock: invites are refused for accounts younger than
// this, mirroring the research that the first week shouldn't be disrupted.
export const ONBOARDING_LOCK_MS = 7 * 86400000;
// Phases during which we auto-pause sharing (read-only signal from the coaching
// engine; this module never modifies engine state or logic).
export const AUTO_PAUSE_PHASES = ['contest_prep', 'aggressive_cut'];

const CACHE_KEY = '@volyume_partner_signal_cache_v1';

// ─── Gating ────────────────────────────────────────────────────────────

/**
 * Is the feature available for this user? Pro + Supabase configured. There is
 * NO rollout/feature flag: Training Partners is a shipped Pro feature, live for
 * every Pro user. Default-false only when cloud isn't configured or not Pro
 * (the Free/Pro boundary is a hard rule). `tier` is read lazily from the store
 * so the service stays usable from anywhere without prop-drilling.
 */
export async function isPartnersEnabled() {
  if (!isSupabaseConfigured()) return false;
  if (_currentTier() !== 'pro') return false;
  return !!getSupabaseClient();
}

function _currentTier() {
  try {
    // Lazy require avoids any import cycle with the store.
    // eslint-disable-next-line global-require
    const { useAppStore } = require('../../store/useAppStore');
    return useAppStore.getState?.().tier ?? null;
  } catch (_) {
    return null;
  }
}

// Guard wrapper: resolves to a graceful fallback unless the feature is fully
// available. Keeps every public method's preamble identical and honest.
async function _whenEnabled(fallback, fn) {
  try {
    if (!(await isPartnersEnabled())) return fallback;
    return await fn(getSupabaseClient());
  } catch (e) {
    track.warn?.('partners.call.threw', 'partners', { error: e?.message });
    return fallback;
  }
}

// ─── Reads ───────────────────────────────────────────────────────────────

/** Circles the current user is an active member of. [] when unavailable. */
export async function getMyCircles() {
  return _whenEnabled([], async (sb) => {
    const { data, error } = await sb
      .from('partner_circles')
      .select('id, name, member_cap, created_by, created_at');
    if (error) return [];
    return data ?? [];
  });
}

/**
 * Members + this-week signals for a circle. Write-through to the offline cache
 * on success; on network failure return the last cached signals so the card
 * renders offline. Returns { members, signals, fromCache }.
 */
export async function getCircleSignals(circleId) {
  if (!circleId) return { members: [], signals: [], fromCache: false };
  const enabled = await isPartnersEnabled();
  if (!enabled) return { members: [], signals: [], fromCache: false };
  const sb = getSupabaseClient();
  try {
    const { data: members, error: mErr } = await sb
      .from('partner_members')
      .select('user_id, display_name, role, status, sharing_enabled')
      .eq('circle_id', circleId)
      .eq('status', 'active');
    if (mErr) throw mErr;

    const { data: signals, error: sErr } = await sb
      .from('partner_weekly_signal')
      .select('user_id, iso_week, sessions_done, sessions_planned, streak_weeks, status, server_updated_at')
      .order('iso_week', { ascending: false });   // latest week first → signalFor picks the current row
    if (sErr) throw sErr;

    const result = { members: members ?? [], signals: signals ?? [], fromCache: false };
    await _writeCache(circleId, result);
    return result;
  } catch (e) {
    track.warn?.('partners.signals.offline', 'partners', { error: e?.message });
    const cached = await _readCache(circleId);
    return cached
      ? { ...cached, fromCache: true }
      : { members: [], signals: [], fromCache: false };
  }
}

// ─── Mutations ─────────────────────────────────────────────────────────────

/** Create a new circle (caller becomes owner via the members_self insert). */
export async function createCircle(name) {
  return _whenEnabled({ ok: false }, async (sb) => {
    const user = await getCurrentUser();
    if (!user?.id) return { ok: false, error: { message: 'Not signed in.' } };
    const { data: circle, error } = await sb
      .from('partner_circles')
      .insert({ name: name ? String(name).slice(0, 60) : null, created_by: user.id, member_cap: MEMBER_CAP_DEFAULT })
      .select('id')
      .single();
    if (error || !circle?.id) return { ok: false, error };
    // The creator's own member row (owner). RLS members_self allows self-insert.
    const { error: mErr } = await sb.from('partner_members').insert({
      circle_id: circle.id,
      user_id: user.id,
      display_name: _defaultDisplayName(user),
      role: 'owner',
    });
    if (mErr) return { ok: false, error: mErr };
    track.event?.('partners.circle.created', {});
    return { ok: true, circleId: circle.id };
  });
}

/**
 * Create a single-use invite for a circle the user owns. Returns the share
 * link + suggested British-English share text. The raw token is returned by
 * the RPC exactly once; only its hash is stored server-side.
 */
export async function createInvite(circleId) {
  return _whenEnabled({ ok: false }, async (sb) => {
    if (!circleId) return { ok: false, error: { message: 'No circle.' } };
    const { data: token, error } = await sb.rpc('create_partner_invite', { p_circle: circleId });
    if (error || !token) return { ok: false, error };
    const link = `https://volyume.app/partner/${token}`;
    track.event?.('partners.invite.created', {});
    return {
      ok: true,
      token,
      link,
      shareText: `I'm training with Volyume — want to keep each other honest? Join me: ${link}`,
    };
  });
}

/**
 * Accept an invite. Enforces the 7-day onboarding lock client-side (the RPC
 * has no notion of account age), then calls the race-safe accept RPC which
 * enforces token validity + member_cap server-side.
 */
export async function acceptInvite(token, displayName) {
  return _whenEnabled({ ok: false }, async (sb) => {
    if (!token) return { ok: false, error: { message: 'Invalid invite.' } };
    const user = await getCurrentUser();
    if (!user?.id) return { ok: false, error: { message: 'Not signed in.' } };
    const createdAt = user.created_at ? Date.parse(user.created_at) : null;
    if (createdAt && Date.now() - createdAt < ONBOARDING_LOCK_MS) {
      return { ok: false, code: 'onboarding_lock',
        error: { message: 'You can connect a training partner after your first week.' } };
    }
    const name = (displayName && String(displayName).trim()) || _defaultDisplayName(user);
    const { data: circleId, error } = await sb.rpc('accept_partner_invite', {
      p_token: token, p_display_name: name.slice(0, 40),
    });
    if (error) return { ok: false, code: error.message, error };
    track.event?.('partners.invite.accepted', {});
    return { ok: true, circleId };
  });
}

/** Master per-circle sharing toggle (the authoritative data-layer gate). */
export async function setSharing(circleId, enabled) {
  return _whenEnabled({ ok: false }, async (sb) => {
    const user = await getCurrentUser();
    if (!user?.id || !circleId) return { ok: false };
    const { error } = await sb
      .from('partner_members')
      .update({ sharing_enabled: !!enabled })
      .eq('circle_id', circleId)
      .eq('user_id', user.id);
    track.event?.('partners.sharing.set', { enabled: !!enabled });
    return error ? { ok: false, error } : { ok: true };
  });
}

/**
 * Master sharing switch: flip sharing_enabled across ALL the user's active
 * circles at once (drives the Settings toggle). Turning off makes partners see
 * zero signal rows immediately (may_view_signal returns false).
 */
export async function setSharingAll(enabled) {
  return _whenEnabled({ ok: false }, async (sb) => {
    const user = await getCurrentUser();
    if (!user?.id) return { ok: false };
    const { error } = await sb
      .from('partner_members')
      .update({ sharing_enabled: !!enabled })
      .eq('user_id', user.id)
      .eq('status', 'active');
    track.event?.('partners.sharing.all', { enabled: !!enabled });
    return error ? { ok: false, error } : { ok: true };
  });
}

/** Leave a circle: marks the user's own row removed (RLS members_self). */
export async function leaveCircle(circleId) {
  return _whenEnabled({ ok: false }, async (sb) => {
    const user = await getCurrentUser();
    if (!user?.id || !circleId) return { ok: false };
    const { error } = await sb
      .from('partner_members')
      .update({ status: 'removed' })
      .eq('circle_id', circleId)
      .eq('user_id', user.id);
    await _dropCache(circleId);
    track.event?.('partners.circle.left', {});
    return error ? { ok: false, error } : { ok: true };
  });
}

/**
 * Publish the user's derived weekly signal. The server counts real completed
 * workouts; we only pass sessions_planned as a non-authoritative hint and the
 * current goalPhase so we can auto-pause during contest prep.
 *
 * Caller supplies `{ sessionsPlanned, goalPhase }` from existing app state
 * (e.g. getWeeklySessionStats + the active coach output), so this module never
 * reaches into the coaching engine itself. Fire-and-forget; never blocks UI.
 */
export async function publishWeeklySignal({ sessionsPlanned = 0, goalPhase = null } = {}) {
  return _whenEnabled({ ok: false }, async (sb) => {
    if (shouldPauseForPhase(goalPhase)) {
      await pauseForContestPrep();
      return { ok: true, paused: true };
    }
    const { error } = await sb.rpc('publish_my_weekly_signal', {
      p_sessions_planned: Math.max(0, Math.round(sessionsPlanned) || 0),
    });
    return error ? { ok: false, error } : { ok: true };
  });
}

/** True when the current phase should auto-pause partner sharing. */
export function shouldPauseForPhase(goalPhase) {
  return !!goalPhase && AUTO_PAUSE_PHASES.includes(String(goalPhase));
}

/** Pause sharing across all the user's circles (contest-prep auto-pause). */
export async function pauseForContestPrep() {
  return _setPaused(true, 'contest_prep');
}

/** Resume sharing across all the user's circles when phase exits prep. */
export async function resumeSharing() {
  return _setPaused(false, null);
}

async function _setPaused(paused, reason) {
  return _whenEnabled({ ok: false }, async (sb) => {
    const user = await getCurrentUser();
    if (!user?.id) return { ok: false };
    const { error } = await sb
      .from('partner_members')
      .update({ status: paused ? 'paused' : 'active', paused_reason: paused ? reason : null })
      .eq('user_id', user.id)
      .neq('status', 'removed');
    return error ? { ok: false, error } : { ok: true };
  });
}

// ─── Nudges (in-app only; push deferred until an EAS projectId exists) ─────

// The fixed emoji set. Keys match migration 076's CHECK constraint; the glyph
// is the in-app rendering. No free text — a nudge carries no training data.
export const NUDGE_EMOJI = { flex: '💪', fire: '🔥', fist: '👊', clap: '✊' };

/**
 * Send a one-tap nudge to a co-member. Server enforces co-membership + the
 * once-per-recipient-per-day cap and returns false when rate-limited.
 * Returns { ok, sent }.
 */
export async function sendNudge(circleId, toUserId, emoji) {
  return _whenEnabled({ ok: false }, async (sb) => {
    if (!circleId || !toUserId || !NUDGE_EMOJI[emoji]) return { ok: false };
    const { data, error } = await sb.rpc('send_partner_nudge', {
      p_circle: circleId, p_to_user: toUserId, p_emoji: emoji,
    });
    if (error) return { ok: false, error };
    track.event?.('partners.nudge.sent', { rateLimited: data === false });
    return { ok: true, sent: data === true };
  });
}

/** Unseen nudges addressed to the current user. [] when unavailable. */
export async function getMyNudges() {
  return _whenEnabled([], async (sb) => {
    const { data, error } = await sb
      .from('partner_nudges')
      .select('id, circle_id, from_user, emoji, created_at')
      .eq('seen', false)
      .order('created_at', { ascending: false });
    if (error) return [];
    return data ?? [];
  });
}

/** Mark a set of nudge ids as seen so they don't resurface. */
export async function markNudgesSeen(ids) {
  return _whenEnabled({ ok: false }, async (sb) => {
    if (!Array.isArray(ids) || ids.length === 0) return { ok: true };
    const { error } = await sb.from('partner_nudges').update({ seen: true }).in('id', ids);
    return error ? { ok: false, error } : { ok: true };
  });
}

// ─── Pure view helpers (no I/O; safe to unit-test in isolation) ────────────

const STATUS_LABEL = {
  on_track: 'on track',
  in_progress: 'this week',
  easy: 'taking it easy',
  quiet: 'quiet week',
};

/**
 * Derive the display model for one member's weekly signal. Pure: maps the raw
 * signal row to { label, done, planned, pips } where pips is an array of
 * 'done' | 'todo' the card renders as filled/outline circles. Never invents a
 * "missed" label — an absent signal reads as a neutral "this week".
 */
export function deriveSignalView(signal) {
  const done = Math.max(0, signal?.sessions_done ?? 0);
  const planned = Math.max(0, signal?.sessions_planned ?? 0);
  const status = signal?.status ?? 'in_progress';
  const total = Math.max(planned, done, 1);
  const pips = Array.from({ length: Math.min(total, 7) }, (_, i) => (i < done ? 'done' : 'todo'));
  return {
    label: STATUS_LABEL[status] ?? STATUS_LABEL.in_progress,
    done,
    planned,
    streakWeeks: Math.max(0, signal?.streak_weeks ?? 0),
    pips,
  };
}

// ─── Offline cache (AsyncStorage) ────────────────────────────────────────

async function _readCache(circleId) {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    const all = raw ? JSON.parse(raw) : {};
    return all[circleId] ?? null;
  } catch (_) { return null; }
}

async function _writeCache(circleId, payload) {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    const all = raw ? JSON.parse(raw) : {};
    all[circleId] = { ...payload, cachedAt: Date.now() };
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(all));
  } catch (_) {}
}

async function _dropCache(circleId) {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return;
    const all = JSON.parse(raw);
    delete all[circleId];
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(all));
  } catch (_) {}
}

// ─── Helpers ─────────────────────────────────────────────────────────────

function _defaultDisplayName(user) {
  // Never leaks the account email: derive a neutral first-name-ish default the
  // user can override on join. Falls back to "Training partner".
  const fromMeta = user?.user_metadata?.name || user?.user_metadata?.full_name;
  if (fromMeta) return String(fromMeta).split(' ')[0].slice(0, 40);
  return 'Training partner';
}
