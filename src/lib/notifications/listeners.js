/**
 * notifications/listeners.js
 *
 * Process-lifetime expo-notifications listener wiring. Owned here
 * so the navigation layer doesn't have to know about
 * `expo-notifications` directly; it just provides an `onTap`
 * callback that resolves a tapped notification to a target screen.
 *
 * Three things this module owns end-to-end (CLAUDE.md Rule 5,
 * notifications are runtime-critical):
 *
 *   1. addNotificationReceivedListener -> fires
 *      `notification_sent` telemetry. The OS only invokes this
 *      callback while the app process is alive, so it captures
 *      foreground + recently-backgrounded deliveries. Cold-start
 *      deliveries (system tray populated by FCM with no live JS
 *      process) are never observable here.
 *
 *   2. addNotificationResponseReceivedListener -> fires
 *      `notification_tapped` telemetry, then hands the response
 *      to the caller's `onTap`. The caller decides what to
 *      navigate to.
 *
 *   3. getLastNotificationResponseAsync -> handles the cold-start
 *      case where the app was launched by a notification tap and
 *      the responseReceived listener wasn't yet installed. Routes
 *      that response through the same `onTap`.
 *
 * The returned dispose function removes both subscriptions. The
 * cold-start promise is fire-and-forget; if it resolves after
 * dispose, the late onTap call is harmless (caller's tryNavigate
 * is idempotent against an unmounted navigation ref).
 *
 * Telemetry inside this module never throws: notification flows
 * MUST NOT break because telemetry is unavailable.
 */

import * as Notifications from 'expo-notifications';

import {
  trackNotificationSent,
  trackNotificationTapped,
} from './telemetry';
import { handleRestTimerAction } from './restTimerActions';

/**
 * Install the process-lifetime notification listeners.
 *
 * @param {Object}   opts
 * @param {Function} opts.onTap   Called with the raw expo-notifications
 *                                response object on every tap (both
 *                                foreground and cold-start). Caller
 *                                resolves the screen target from
 *                                `response.notification.request.content.data.type`.
 *
 * @returns {Function} dispose    Call to remove both subscriptions.
 *                                Idempotent.
 */
export function installNotificationListeners({ onTap } = {}) {
  function handleResponse(response) {
    const type = response?.notification?.request?.content?.data?.type;

    try {
      trackNotificationTapped({
        notification: response?.notification,
        payload: { data_type: type ?? 'unknown' },
      });
    } catch (_) { /* telemetry must never break the tap handler */ }

    // Rest-timer action buttons (Complete set / ±15s / Skip rest) are
    // handled here, not via onTap's navigation routing: the response
    // carries an actionIdentifier for the button pressed. The handler is
    // a no-op unless there's a live workout + running rest, so a stale
    // tap on a lingering notification does nothing. A plain body tap
    // (DEFAULT_ACTION_IDENTIFIER) falls through to onTap to open the app.
    if (type === 'rest_timer') {
      const actionId = response?.actionIdentifier;
      if (actionId && actionId !== Notifications.DEFAULT_ACTION_IDENTIFIER) {
        try { handleRestTimerAction(actionId); } catch (_) { /* never crash on a tap */ }
        return;
      }
    }

    if (typeof onTap === 'function') {
      try { onTap(response); } catch (_) { /* swallow caller errors */ }
    }
  }

  function handleReceived(notification) {
    try {
      const trigger = notification?.request?.trigger;
      const scheduledFor = trigger?.date
        ? new Date(trigger.date).toISOString()
        : null;
      trackNotificationSent({ notification, scheduledFor });
    } catch (_) { /* telemetry must never break delivery */ }
  }

  const tapSub = Notifications.addNotificationResponseReceivedListener(handleResponse);
  const recvSub = Notifications.addNotificationReceivedListener(handleReceived);

  // Cold-start: app launched by a tap before the responseReceived
  // listener was installed. Promise rejection is benign; the user
  // sees the default landing screen instead of the tap target.
  Notifications.getLastNotificationResponseAsync()
    .then((r) => { if (r) handleResponse(r); })
    .catch(() => {});

  let disposed = false;
  return function dispose() {
    if (disposed) return;
    disposed = true;
    try { tapSub.remove(); } catch (_) { /* tolerate */ }
    try { recvSub.remove(); } catch (_) { /* tolerate */ }
  };
}
