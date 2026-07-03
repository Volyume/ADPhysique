/**
 * Partner adoption telemetry (STEP A). Counts only, NO PII, no free text.
 *
 * Rides the existing engineTelemetry rail (src/lib/engineTelemetry.js ->
 * lib/telemetry/transport.postEvent): each call persists a local
 * engine_telemetry row and the debounced flush pushes it through the
 * record_engine_telemetry RPC. The event names here are on both the client
 * allow-list (src/lib/telemetry/events.js) and the server allow-list
 * (supabase/migrate_102_partner_safety_consent.sql).
 *
 * This is the Direction-3 adoption set (11-DECISION-BRIEF section 0.3 / line
 * 118): surface views, invite journey steps, invites minted / redeemed / died
 * at the paywall, cheers, unpairs, and pairs still active at week 2 and week 6.
 * It sits ALONGSIDE the legacy funnel events (partner_invite_sent /
 * _accepted / _cheer_sent / _blocked) rather than replacing them.
 *
 * userId is resolved lazily from the store so screen call sites can use the
 * plain signatures the brief specifies (e.g. trackPartnerSurfaceView(source)).
 * A missing userId is a benign no-op (postEvent returns null).
 */

import { track } from '../engineTelemetry';

function currentUserId() {
  try {
    // eslint-disable-next-line global-require
    return require('../../store/useAppStore').default.getState()?.user?.id ?? null;
  } catch (_) {
    return null;
  }
}

function emit(event, payload) {
  const uid = currentUserId();
  if (!uid) return;
  track(uid, event, payload ?? {})?.catch?.(() => {});
}

/**
 * A partner surface was viewed. source is one of the calm entry points:
 * 'you_row' | 'consistency_row' | 'progress_tile' | 'post_workout'.
 * (Screen-level call sites are other agents' work; exported here for them.)
 */
export function trackPartnerSurfaceView(source) {
  emit('partner_surface_view', { source: String(source || 'unknown') });
}

/** A step of the three-beat invite journey (1 = what this is, 2 = what crosses, 3 = send). */
export function trackInviteJourneyStep(step) {
  const s = Math.max(1, Math.min(3, Math.round(Number(step) || 0)));
  emit('partner_invite_journey_step', { step: s });
}

/** An invite code was minted (server create/reuse). Wired at the mint call site. */
export function trackInviteMinted() {
  emit('partner_invite_minted');
}

/** An invite code was redeemed and the sharing consent recorded. Wired at redeem. */
export function trackInviteRedeemed() {
  emit('partner_invite_redeemed');
}

/** An invited free/logged-out user hit the Pro gate; the code was preserved (A1 s9.3). */
export function trackInviteDiedAtPaywall() {
  emit('partner_invite_died_at_paywall');
}

/** A cheer was sent. Wired at the cheer call site. */
export function trackCheerSent() {
  emit('partner_cheer');
}

/** A partnership was ended (unpair). Wired at the unpair call site. */
export function trackUnpair() {
  emit('partner_unpair');
}

/** A pair reached week 2 or week 6 of being active. week is 2 | 6. */
export function trackPairWeekActive(weekNumber) {
  const w = Math.round(Number(weekNumber) || 0);
  if (w !== 2 && w !== 6) return;
  emit('partner_pair_week_active', { week: w });
}
