/**
 * Lapsed-partner data-layer gate (A1 section 9.4; brief 0.3.1).
 *
 * Tier is enforced only at the UI route layer (withProGuard); RLS and the sync
 * layer are tier-blind, so a Pro user who lapses to Free keeps silently pushing
 * live week signals into a pairing they can no longer see. There is no tier /
 * entitlement column on any partner table, so the fix lives at the app's data
 * layer: the two signal PUSH paths (weekSignalWriter and sync/tables/partners)
 * consult the resolved tier here and, for a lapsed user, transition the outbound
 * state to 'resting' so the partner sees a calm state, never live ticks.
 *
 * Resolution uses the store's already-resolved `tier` (exactly what withProGuard
 * gates on), with proGate.isPaidTier over userProfile as the resolver of record.
 * IMPORTANT (not the ED fail-closed pattern, deliberately): an UNKNOWN tier
 * (null during bootstrap, unset in tests) does NOT count as lapsed. Muting a
 * paying Pro on a transient/unresolved read is the worse failure; only an
 * explicit 'free' resolution (a real churn) mutes. tier is an always-present
 * local store value once resolved, so this window is momentary.
 */
import { isPaidTier } from '../proGate';

/** 'pro' | 'free' | null (null = not yet resolved -> treat as NOT lapsed). */
export function resolveEffectiveTier() {
  try {
    // eslint-disable-next-line global-require
    const s = require('../../store/useAppStore').default.getState();
    const t = (s?.tier === 'pro' || s?.tier === 'free')
      ? s.tier
      : (s?.userProfile ? isPaidTier(s.userProfile) : null);
    return (t === 'pro' || t === 'free') ? t : null;
  } catch (_) {
    return null;
  }
}

/** True only when the tier resolves definitively to Free (a lapse/churn). */
export function isLapsedPartner() {
  return resolveEffectiveTier() === 'free';
}
