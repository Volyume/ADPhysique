/**
 * lapseDetect.js — COMP-025-A §4a Moment-2 trigger
 *
 * Turns a reconcilePaidEntitlement result into the win-back loop's lifecycle.
 * It makes NO entitlement decision of its own — cascade.js owns that. It only
 * reads the result and arms (or stands down) the post-churn loop.
 *
 * What counts as an authoritative lapse (and what deliberately does not):
 *   - YES: reconcile downgraded a paid_pro user because Play reports no active
 *     'pro' entitlement (the cancel('client_reconcile') branch). In this app's
 *     current setup the server RTDN push is not wired, so this client-side read
 *     is THE authoritative churn signal.
 *   - NO: the stale-entitlement local lockdown (reason 'stale_no_provider' /
 *     'stale_read_failed') — an UNVERIFIED lapse that self-heals on the next
 *     online launch. It must never trigger the sheet or win-back (blueprint
 *     risk #4).
 *   - NO: a trial auto-downgrade — reconcile only runs for trial_state
 *     'paid_pro', so a pro_trial→free day-21 downgrade never reaches here.
 *
 * On a confirmed-active result (a still-paying or returned-to-Pro user) the
 * episode is cleared — a fresh slate (§4c) — and any scheduled win-back is
 * cancelled.
 *
 * Pure detection helpers are exported for tests; the handler is async and
 * never throws.
 */

import { openEpisode, clearEpisode, getEpisode } from './winbackState';

/** A real, client-confirmed paid_pro → free lapse (not a stale lockdown). */
export function isAuthoritativeLapse(result) {
  return !!result
    && result.downgraded === true
    && result.active === false
    && !result.reason; // stale_* lockdowns carry a reason; the real lapse does not
}

/** Play confirmed the 'pro' entitlement is still active right now. */
export function isConfirmedActive(result) {
  return !!result && result.checked === true && result.active === true;
}

/**
 * React to a reconcile result. Fire-and-forget from the reconcile call site.
 *
 * @returns {Promise<{ lapsed: boolean, opened: boolean }>}
 */
export async function handlePotentialLapse(result, userId = null) {
  try {
    if (isConfirmedActive(result)) {
      // Still paying / returned to Pro: fresh slate, and stand down any pending
      // win-back. Only act when an episode is actually open, so the healthy
      // paid launch (the common case) never touches the OS notification layer.
      if (await getEpisode()) {
        await clearEpisode();
        try {
          // eslint-disable-next-line global-require
          const { cancelWinbackNotification } = require('../notifications/scheduler');
          await cancelWinbackNotification();
        } catch (_) { /* best-effort */ }
      }
      return { lapsed: false, opened: false };
    }

    if (!isAuthoritativeLapse(result)) return { lapsed: false, opened: false };

    const { opened } = await openEpisode(Date.now());
    // Lay the single win-back. The scheduler self-guards (no-op when there's no
    // episode, when ED-suppressed, when the floor hasn't cleared, or when the
    // fire date has passed).
    try {
      // eslint-disable-next-line global-require
      const { scheduleWinbackNotification } = require('../notifications/scheduler');
      await scheduleWinbackNotification(userId);
    } catch (_) { /* best-effort */ }
    return { lapsed: true, opened };
  } catch (_) {
    return { lapsed: false, opened: false };
  }
}
