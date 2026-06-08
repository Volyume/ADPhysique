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
    // Reflect the trial in the local store straight away. RootNavigator
    // routes onboarding on store.tier and ProGate unlocks on it, but the
    // RPC only writes the server row, so without this mirror a fresh
    // trial leaves the user on the free FirstRunStack (the "just your
    // name" screen) instead of the Pro setup questionnaire. The RPC set
    // the server tier='pro' + trial_state='pro_trial_active'; we copy
    // that down without a second round-trip. Only ever moves the local
    // tier up to 'pro' (never demotes), and the already-started branch
    // omits `tier`, so resolve from the returned trial_state.
    try {
      // eslint-disable-next-line global-require
      const useAppStore = require('../../store/useAppStore').default;
      // eslint-disable-next-line global-require
      const { _resolveTier } = require('../proGate');
      const ts = r.data?.trial_state ?? 'pro_trial_active';
      const nextTier = r.data?.tier ?? _resolveTier(ts, false);
      const st = useAppStore.getState();
      if (nextTier === 'pro') {
        st.setTier?.('pro', 'cascade.startCascade').catch?.(() => {});
      }
      useAppStore.setState((s) => (s.userProfile
        ? {
            userProfile: {
              ...s.userProfile,
              trialState: ts,
              proTrialEndsAt: r.data?.pro_trial_ends_at ?? s.userProfile.proTrialEndsAt ?? null,
            },
          }
        : {}));
    } catch (_) { /* tolerate; refreshTierFromCloud reconciles next read */ }
    _trackTransition({ reason: 'cascade_started', sourceSurface: 'article9_consent', targetTier: 'pro_trial' });
    // Lay the local trial-end reminders from the trial end date the RPC just
    // returned (the 14-day in-app trial; the 7-day Play intro offer is a
    // separate store subscription phase that begins only if the user subscribes
    // afterwards). scheduleCascadeGateNotifications derives the reminder times
    // from this end date. Fire-and-forget: the cascade transition is the
    // important write, the reminders are a convenience and must not block or
    // fail the return.
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

// C-1 (2026-06-06): the paid 'pro' grant is server-authoritative. The client no
// longer writes its own tier (the authenticated upgrade_tier rejects 'pro',
// migration 067), which closes the self-grant hole. On a confirmed purchase we
// unlock Pro optimistically in-memory for instant UX; the Google Play RTDN
// (after Play Developer API verification) writes the real tier via
// upgrade_tier_for_user, and refreshTierFromCloud reconciles to it within the
// optimistic window. A purchase that never reached the server reverts to free.
export async function payAt(targetTier, paymentRef, sourceSurface = null) {
  if (!paymentRef) {
    return { ok: false, error: 'payment_ref_required' };
  }
  // 2-tier model: only 'pro' is purchaseable.
  if (targetTier !== 'pro') {
    return { ok: false, error: 'invalid_target_tier' };
  }
  try {
    // eslint-disable-next-line global-require
    const useAppStore = require('../../store/useAppStore').default;
    await useAppStore.getState().setOptimisticPaid();
  } catch (_) { /* tolerate; the RTDN grant + next refresh still unlock */ }
  _trackTransition({ reason: 'user_paid', sourceSurface, targetTier, paymentRef });
  return { ok: true, optimistic: true };
}

/**
 * Server-authoritative purchase confirmation (C-1). After a successful Play
 * purchase, send the purchase token to the play-billing-rtdn function, which
 * verifies it against the Google Play Developer API and grants Pro via the
 * service-role upgrade_tier_for_user. The client never writes its own paid
 * tier. On success we pull the authoritative tier so the optimistic unlock is
 * reconciled immediately rather than waiting for the next foreground refresh.
 *
 * Fire-and-forget from the purchase surfaces: the optimistic local unlock has
 * already happened, so a slow or failed call just means the next cloud refresh
 * (within the optimistic window) does the reconcile instead.
 */
export async function confirmPurchase({ purchaseToken, subscriptionId } = {}) {
  if (!purchaseToken || !subscriptionId) {
    return { ok: false, error: 'missing_purchase_token' };
  }
  const sb = getSupabaseClient();
  if (!sb) return { ok: false, error: 'no_client' };
  try {
    const { data, error } = await sb.functions.invoke('play-billing-rtdn', {
      body: { purchaseToken, subscriptionId },
    });
    if (error) {
      logWarn('payments.cascade.confirmPurchase.invoke', error.message ?? 'invoke_failed', {});
      return { ok: false, error: error.message ?? 'invoke_failed' };
    }
    // Pull the server-written tier so Pro is confirmed straight away.
    try {
      // eslint-disable-next-line global-require
      const useAppStore = require('../../store/useAppStore').default;
      const st = useAppStore.getState();
      await st.refreshTierFromCloud?.(sb, st.user?.id);
    } catch (_) { /* the optimistic window + next refresh still reconcile */ }
    return { ok: true, data };
  } catch (e) {
    logError('payments.cascade.confirmPurchase.threw', e, { message: e?.message });
    return { ok: false, error: e?.message ?? 'threw' };
  }
}

// SUB-002: how long a paid_pro device may retain Pro without reconfirming its
// entitlement against an authoritative source (a Play entitlement read, the
// purchase, or a server tier refresh). Named constant, not a magic number, so
// the grace window is explicit and tunable. 24 hours balances "don't punish a
// brief offline spell" against "don't let a lapsed/offline device keep Pro
// forever".
const PAID_ENTITLEMENT_OFFLINE_GRACE_MS = 24 * 60 * 60 * 1000;

// C-2 client safety net (trial-subscription audit). The authoritative
// revocation of a cancelled / lapsed / refunded PAID subscription is the Google
// Play RTDN Pub/Sub push (play-billing-rtdn → upgrade_tier_for_user 'free').
// Until that push subscription is wired in the Play/GCP console, the server
// never learns a paid sub ended, so the tier stays 'pro'. This checks Play
// directly on launch for a paid_pro user and downgrades if Google reports no
// active 'pro' entitlement.
//
// This is defence in depth, NOT a substitute for RTDN (the report's SUB-002):
// RTDN remains mandatory release infrastructure. Behaviour:
//   * only runs for trial_state === 'paid_pro' (trials are server-cron driven);
//   * when the REAL provider is installed AND the Play read SUCCEEDS, an
//     "active: false" result is an authoritative lapse → server downgrade;
//   * when the read SUCCEEDS and reports active, the last-verified clock is
//     refreshed (the device is known-good right now);
//   * when the entitlement CANNOT be confirmed (no real provider, or the read
//     throws), it is conservative WITHIN the offline grace window (never revoke
//     a paying customer on a transient blip), but past the grace window it
//     locks the device down LOCALLY to free (SUB-002 step 3). The next online
//     launch's refreshTierFromCloud restores Pro if the sub is in fact still
//     active, so a false lockdown self-heals once the device can verify again.
// A false revoke (Play momentarily empty) is recoverable via Restore purchases.
export async function reconcilePaidEntitlement(profile) {
  try {
    const ts = profile?.trialState ?? profile?.trial_state ?? null;
    if (ts !== 'paid_pro') return { ok: true, checked: false };
    // eslint-disable-next-line global-require
    const useAppStore = require('../../store/useAppStore').default;
    const store = useAppStore.getState();
    const lastVerified = await store.readPaidEntitlementVerifiedAt?.();
    const staleBeyondGrace = typeof lastVerified === 'number'
      && (Date.now() - lastVerified > PAID_ENTITLEMENT_OFFLINE_GRACE_MS);

    // eslint-disable-next-line global-require
    const playBilling = require('./playBilling');
    const providerReal = typeof playBilling.isReal === 'function' && playBilling.isReal();
    if (!providerReal) {
      // Can't read Play (stub/dev, or native module missing). Within grace this
      // is a no-op; past grace, lock down locally so a device that can never
      // reconfirm does not keep Pro forever.
      if (staleBeyondGrace) {
        logWarn('payments.cascade.reconcile.staleNoProvider',
          'paid_pro past offline grace with no Play provider; locking down locally', {});
        await store.lockStalePaidEntitlement?.();
        return { ok: true, checked: true, active: false, downgraded: true, reason: 'stale_no_provider' };
      }
      return { ok: true, checked: false };
    }
    let info;
    try {
      info = await playBilling.getCustomerInfo();
    } catch (e) {
      logWarn('payments.cascade.reconcile.read', e?.message ?? 'unknown', {});
      // Read failed (offline / transient). Within grace, defer. Past grace, lock
      // down locally rather than trust an unverifiable Pro indefinitely.
      if (staleBeyondGrace) {
        logWarn('payments.cascade.reconcile.staleReadFailed',
          'paid_pro past offline grace and Play read failing; locking down locally', {});
        await store.lockStalePaidEntitlement?.();
        return { ok: true, checked: true, active: false, downgraded: true, reason: 'stale_read_failed' };
      }
      return { ok: true, checked: false }; // never revoke on a transient read within grace
    }
    const active = Array.isArray(info?.activeEntitlements)
      && info.activeEntitlements.includes('pro');
    if (active) {
      // Known-good right now: refresh the last-verified clock.
      await store.markPaidEntitlementVerified?.();
      return { ok: true, checked: true, active: true };
    }
    logWarn('payments.cascade.reconcile.lapsed',
      'paid_pro with no active Play entitlement; downgrading to free', {});
    const r = await cancel('client_reconcile');
    return { ok: r.ok, checked: true, active: false, downgraded: !!r.ok };
  } catch (e) {
    logError('payments.cascade.reconcile.threw', e, { message: e?.message });
    return { ok: false, error: e?.message ?? 'threw' };
  }
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
  // 2-tier model: only the end of the 14-day in-app trial transitions to free.
  // (The 7-day Play intro offer is a separate store subscription phase, handled
  // by Play, not this client cascade.) The old 3-tier Complete→Pro
  // auto-downgrade no longer exists.
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
 * entitlement. Used by paywall surfaces to choose between the
 * trial CTA ("Try Pro free for 7 days", the Play intro offer that
 * follows the 14 cardless in-app days) and "Get Pro for £X/month".
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
