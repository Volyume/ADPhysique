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
 *   payAt(tier, ref, surface)   -- 'user_paid' (after RevenueCat success)
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

export async function startCascade() {
  return _call('start_cascade', {});
}

export async function payAt(targetTier, paymentRef, sourceSurface = null) {
  if (!paymentRef) {
    return { ok: false, error: 'payment_ref_required' };
  }
  if (!['pro', 'complete'].includes(targetTier)) {
    return { ok: false, error: 'invalid_target_tier' };
  }
  return _call('upgrade_tier', {
    _target_tier: targetTier,
    _reason: 'user_paid',
    _source_surface: sourceSurface,
    _payment_ref: paymentRef,
  });
}

export async function skipToFree(sourceSurface = null) {
  return _call('upgrade_tier', {
    _target_tier: 'free',
    _reason: 'user_skip',
    _source_surface: sourceSurface,
    _payment_ref: null,
  });
}

export async function skipToPro(sourceSurface = null) {
  return _call('upgrade_tier', {
    _target_tier: 'pro',
    _reason: 'user_skip',
    _source_surface: sourceSurface,
    _payment_ref: null,
  });
}

export async function autoDowngrade(targetTier, sourceSurface = null) {
  if (!['pro', 'free'].includes(targetTier)) {
    return { ok: false, error: 'invalid_auto_downgrade_target' };
  }
  return _call('upgrade_tier', {
    _target_tier: targetTier,
    _reason: 'auto_downgrade',
    _source_surface: sourceSurface,
    _payment_ref: null,
  });
}

export async function cancel(sourceSurface = 'revenuecat_webhook') {
  return _call('upgrade_tier', {
    _target_tier: 'free',
    _reason: 'user_cancelled',
    _source_surface: sourceSurface,
    _payment_ref: null,
  });
}

export async function graceLapsed(sourceSurface = 'grace_timer') {
  return _call('upgrade_tier', {
    _target_tier: 'free',
    _reason: 'grace_lapsed',
    _source_surface: sourceSurface,
    _payment_ref: null,
  });
}

export async function refunded(sourceSurface = 'revenuecat_webhook') {
  return _call('upgrade_tier', {
    _target_tier: 'free',
    _reason: 'refunded',
    _source_surface: sourceSurface,
    _payment_ref: null,
  });
}

// ────────────────────────────────────────────────────────────────────
// Pure read helpers (UI reads these against the locally-synced
// users_profile mirror)
// ────────────────────────────────────────────────────────────────────

/**
 * Coarse cascade stage label for surface code. Maps the seven
 * trial_state values down to the five user-facing concepts the UI
 * needs to differentiate.
 */
export function stageOf(profile) {
  const ts = profile?.trialState ?? profile?.trial_state ?? 'unstarted';
  switch (ts) {
    case 'unstarted':             return 'unstarted';
    case 'complete_trial_active': return 'complete_trial';
    case 'pro_trial_active':      return 'pro_trial';
    case 'paid_complete':
    case 'paid_pro':              return 'paid';
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
  if (ts === 'complete_trial_active') {
    endsAt = profile?.completeTrialEndsAt ?? profile?.complete_trial_ends_at ?? null;
  } else if (ts === 'pro_trial_active') {
    endsAt = profile?.proTrialEndsAt ?? profile?.pro_trial_ends_at ?? null;
  }
  if (!endsAt) return null;
  const endMs = typeof endsAt === 'number' ? endsAt : Date.parse(endsAt);
  if (!Number.isFinite(endMs)) return null;
  const diffMs = endMs - nowMs;
  if (diffMs <= 0) return 0;
  return Math.floor(diffMs / (24 * 60 * 60 * 1000));
}
