/**
 * Trial cascade state machine (client side).
 *
 * Locked in COMPLETE_TIER_SCOPE_LOCKED.md lines 46-80 and
 * SUBSCRIPTION_AND_PAYMENT_LOCKED.md lines 87-119.
 *
 * Server-side state machine + audit lives in migration 030
 * (start_cascade + upgrade_tier RPCs). This module wraps the RPCs
 * with the verbs the UI + workers actually call:
 *
 *   startCascade()              -- Article 9 consent → complete_trial_active
 *   payAt(tier, ref, surface)   -- 'user_paid' (after Play Billing success)
 *   skipToFree(surface)         -- 'user_skip' → free
 *   skipToPro(surface)          -- 'user_skip' → pro_trial_active
 *   autoDowngrade(tier, surface)-- 'auto_downgrade' (day 14 / 28 worker)
 *   cancel(surface)             -- 'user_cancelled' (webhook EXPIRATION)
 *   graceLapsed(surface)        -- 'grace_lapsed' (3-day timer)
 *   refunded(surface)           -- 'refunded' (webhook REFUND)
 *
 * Plus pure helpers that the UI reads:
 *
 *   daysRemaining(profile)      -- days until next cascade gate
 *   stageOf(profile)             -- 'complete_trial' | 'pro_trial' | 'paid' | 'free' | 'unstarted'
 *   canStillTrial(profile)       -- true iff cascade entitlement unused
 *
 * Every state-changing call returns the RPC's returned jsonb:
 *   { trial_state, tier, locked_in_price_tier,
 *     complete_trial_ends_at, pro_trial_ends_at, payment_ref }
 *
 * On any RPC failure, returns { ok: false, error: msg } and logs
 * via errorLog so the caller can decide UI fallback. No exceptions
 * cross the module boundary.
 */

import { getSupabaseClient } from '../supabase';
import { logError, logWarn } from '../errorLog';

// ────────────────────────────────────────────────────────────────────
// RPC wrappers
// ────────────────────────────────────────────────────────────────────

async function _call(rpcName, args) {
  const sb = getSupabaseClient();
  if (!sb) {
    logWarn(`payments.cascade.${rpcName}.noClient`, 'no supabase client', {});
    return { ok: false, error: 'no_client' };
  }
  try {
    const { data, error } = await sb.rpc(rpcName, args ?? {});
    if (error) {
      logError(`payments.cascade.${rpcName}.rpc`, error, { args });
      return { ok: false, error: error.message ?? 'rpc_error' };
    }
    return { ok: true, data };
  } catch (e) {
    logError(`payments.cascade.${rpcName}.threw`, e, { args, message: e?.message });
    return { ok: false, error: e?.message ?? 'threw' };
  }
}

// Telemetry fan-out for every successful cascade transition. Fires
// the generic cascade_state_transition (Panel 5 sankey) plus any
// granular variants from the locked catalogue that map cleanly to
// the reason. Read user from the store lazily so the cascade module
// stays free of store imports at evaluation time.
function _trackTransition({ reason, sourceSurface, targetTier, paymentRef }) {
  try {
    // eslint-disable-next-line global-require
    const useAppStore = require('../../store/useAppStore').default;
    const uid = useAppStore.getState().user?.id;
    if (!uid) return;
    // eslint-disable-next-line global-require
    const { track } = require('../engineTelemetry');
    const base = {
      reason,
      source_surface: sourceSurface ?? null,
      target_tier: targetTier ?? null,
    };
    track(uid, 'cascade_state_transition', base).catch(() => {});
    if (reason === 'cascade_started') {
      track(uid, 'cascade_started', { source_surface: sourceSurface ?? null }).catch(() => {});
    } else if (reason === 'user_paid') {
      track(uid, 'paid_converted', {
        source_surface: sourceSurface ?? null,
        tier: targetTier ?? null,
        payment_ref: paymentRef ? String(paymentRef).slice(0, 12) : null,
      }).catch(() => {});
      track(uid, 'cascade_advanced', {
        source_surface: sourceSurface ?? null,
        tier: targetTier ?? null,
      }).catch(() => {});
    } else if (reason === 'user_skip') {
      track(uid, 'churn_at_gate', { source_surface: sourceSurface ?? null }).catch(() => {});
      track(uid, 'cascade_skipped_ahead', { source_surface: sourceSurface ?? null }).catch(() => {});
    } else if (reason === 'user_cancelled' || reason === 'grace_lapsed' || reason === 'refunded') {
      track(uid, 'subscription_cancelled', {
        reason,
        source_surface: sourceSurface ?? null,
      }).catch(() => {});
    }
  } catch (_) { /* tolerate */ }
}

export async function startCascade() {
  const r = await _call('start_cascade', {});
  if (r.ok) {
    _trackTransition({ reason: 'cascade_started', sourceSurface: 'article9_consent', targetTier: 'pro_trial' });
    // Lay the local cascade-gate reminders (day 19 + day 21 at 10:00)
    // from the trial end date the RPC just returned. Fire-and-forget:
    // the cascade transition is the important write, the reminders are
    // a convenience and must not block or fail the return.
    const endsAt = r.data?.pro_trial_ends_at ?? r.data?.complete_trial_ends_at ?? null;
    if (endsAt) {
      try {
        // eslint-disable-next-line global-require
        const { scheduleCascadeGateNotifications } = require('../notifications');
        scheduleCascadeGateNotifications(endsAt).catch(() => {});
      } catch (_) { /* tolerate */ }
    }
  }
  return r;
}

export async function payAt(targetTier, paymentRef, sourceSurface = null) {
  if (!paymentRef) {
    return { ok: false, error: 'payment_ref_required' };
  }
  // 2-tier model: only 'pro' is purchaseable.
  if (targetTier !== 'pro') {
    return { ok: false, error: 'invalid_target_tier' };
  }
  const r = await _call('upgrade_tier', {
    _target_tier: targetTier,
    _reason: 'user_paid',
    _source_surface: sourceSurface,
    _payment_ref: paymentRef,
  });
  if (r.ok) _trackTransition({ reason: 'user_paid', sourceSurface, targetTier, paymentRef });
  return r;
}

export async function skipToFree(sourceSurface = null) {
  const r = await _call('upgrade_tier', {
    _target_tier: 'free',
    _reason: 'user_skip',
    _source_surface: sourceSurface,
    _payment_ref: null,
  });
  if (r.ok) _trackTransition({ reason: 'user_skip', sourceSurface, targetTier: 'free' });
  return r;
}

/**
 * Removed in the 2-tier consolidation (2026-05-25). The previous
 * 3-tier model had a day-14 Complete→Pro skip path; in the 2-tier
 * model there's nothing between the Pro trial and Free. Function
 * stub left for any caller that hasn't yet been updated; returns
 * an error rather than throwing.
 */
export async function skipToPro(_sourceSurface = null) {
  return { ok: false, error: 'skip_to_pro_removed_in_2_tier_model' };
}

export async function autoDowngrade(targetTier, sourceSurface = null) {
  // 2-tier model: only the day-21 trial expiry transitions to free.
  // The 3-tier Complete→Pro auto-downgrade no longer exists.
  if (targetTier !== 'free') {
    return { ok: false, error: 'invalid_auto_downgrade_target' };
  }
  const r = await _call('upgrade_tier', {
    _target_tier: targetTier,
    _reason: 'auto_downgrade',
    _source_surface: sourceSurface,
    _payment_ref: null,
  });
  if (r.ok) _trackTransition({ reason: 'auto_downgrade', sourceSurface, targetTier });
  return r;
}

export async function cancel(sourceSurface = 'play_billing_rtdn') {
  const r = await _call('upgrade_tier', {
    _target_tier: 'free',
    _reason: 'user_cancelled',
    _source_surface: sourceSurface,
    _payment_ref: null,
  });
  if (r.ok) _trackTransition({ reason: 'user_cancelled', sourceSurface, targetTier: 'free' });
  return r;
}

export async function graceLapsed(sourceSurface = 'grace_timer') {
  const r = await _call('upgrade_tier', {
    _target_tier: 'free',
    _reason: 'grace_lapsed',
    _source_surface: sourceSurface,
    _payment_ref: null,
  });
  if (r.ok) _trackTransition({ reason: 'grace_lapsed', sourceSurface, targetTier: 'free' });
  return r;
}

export async function refunded(sourceSurface = 'play_billing_rtdn') {
  const r = await _call('upgrade_tier', {
    _target_tier: 'free',
    _reason: 'refunded',
    _source_surface: sourceSurface,
    _payment_ref: null,
  });
  if (r.ok) _trackTransition({ reason: 'refunded', sourceSurface, targetTier: 'free' });
  return r;
}

// ────────────────────────────────────────────────────────────────────
// Pure read helpers (UI reads these against the locally-synced
// users_profile mirror)
// ────────────────────────────────────────────────────────────────────

/**
 * Coarse stage label for surface code. Maps the trial_state values
 * to the four user-facing concepts the UI needs to differentiate.
 * Legacy complete_* states map to their Pro equivalents because in
 * the 2-tier model they grant the same entitlement.
 */
export function stageOf(profile) {
  const ts = profile?.trialState ?? profile?.trial_state ?? 'unstarted';
  switch (ts) {
    case 'unstarted':             return 'unstarted';
    case 'pro_trial_active':      return 'pro_trial';
    case 'complete_trial_active': return 'pro_trial';   // legacy
    case 'paid_pro':              return 'paid';
    case 'paid_complete':         return 'paid';        // legacy
    case 'free':
    case 'cascade_expired':       return 'free';
    default:                      return 'unstarted';
  }
}

/**
 * True iff the user has not yet used their one-time trial
 * entitlement. Used by paywall surfaces to choose between
 * "Try Pro free for 14 days" and "Get Pro for £X/month".
 */
export function canStillTrial(profile) {
  const ts = profile?.trialState ?? profile?.trial_state ?? 'unstarted';
  return ts === 'unstarted';
}

/**
 * Days until the next cascade gate. Returns null when not in a
 * trial (already paid, free, or never started). Rounds down so
 * "1 day remaining" stays accurate until the cutover instant.
 */
export function daysRemaining(profile, nowMs = Date.now()) {
  const ts = profile?.trialState ?? profile?.trial_state ?? 'unstarted';
  let endsAt = null;
  if (ts === 'pro_trial_active' || ts === 'complete_trial_active' /* legacy */) {
    endsAt = profile?.proTrialEndsAt ?? profile?.pro_trial_ends_at
      ?? profile?.completeTrialEndsAt ?? profile?.complete_trial_ends_at
      ?? null;
  }
  if (!endsAt) return null;
  const endMs = typeof endsAt === 'number' ? endsAt : Date.parse(endsAt);
  if (!Number.isFinite(endMs)) return null;
  const diffMs = endMs - nowMs;
  if (diffMs <= 0) return 0;
  return Math.floor(diffMs / (24 * 60 * 60 * 1000));
}
