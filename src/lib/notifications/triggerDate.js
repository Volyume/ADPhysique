/**
 * notifications/triggerDate.js
 *
 * The one sanctioned way to build the `date` of an expo-notifications DATE
 * trigger. Every DATE trigger in this codebase goes through
 * `safeTriggerDate`; triggerDate.guard.test.js pins that.
 *
 * WHY THIS EXISTS (Sentry VOLYUME-1K, two user crash reports 2026-08-26).
 *
 * An Invalid Date, NaN or Infinity handed to a DATE trigger crosses the
 * bridge as a raw double and lands in expo-notifications'
 * DateTriggerRecord.toUNNotificationTrigger()
 * (node_modules/expo-notifications/ios/EXNotifications/Notifications/
 * Records.swift), whose first statement is:
 *
 *     let timestamp: Int = Int(self.timestamp / 1000)
 *
 * Swift's Int(Double) traps on NaN and on either infinity. The process dies
 * instantly with EXC_BREAKPOINT (SIGTRAP) on the notification scheduling
 * queue, which is a plain background libdispatch queue, not the JS thread.
 *
 * That trap is NATIVE. The try/catch wrapped around every
 * scheduleNotificationAsync call, App.js's ErrorBoundary and every
 * ScreenBoundary are all powerless against it, because none of them ever
 * runs. The user sees the app vanish to the home screen with no calm error
 * screen and no incident reference code, and it recurs every time they
 * repeat the action. Two users reported exactly that shape.
 *
 * WHY THE EXISTING GUARDS DID NOT CATCH IT. The scheduler's protection was a
 * family of past-date comparisons:
 *
 *     if (when.getTime() <= now) return;   // skip a gate already gone by
 *
 * NaN <= now evaluates to FALSE, so every comparison of that shape fails
 * OPEN on precisely the value that traps: an Invalid Date sails straight
 * past the check that looks like it should have stopped it. A trigger date
 * has to be PROVED valid. It can never be established by comparison.
 *
 * SCOPE. This rejects only what actually traps: non-finite, or outside the
 * range a JS Date can represent. Past-date handling is deliberately left
 * exactly as each caller already had it, so no working schedule changes
 * behaviour.
 */

import * as Notifications from 'expo-notifications';
import { trackNotificationFailed } from './telemetry';
import { logWarn } from '../errorLog';

// The widest instant a JS Date can represent (ECMA-262 time-clip range).
// new Date(ms) outside this is an Invalid Date, whose getTime() is NaN,
// which is the trapping value. Number.isFinite(1e300) is true, so a
// finite-check on its own is NOT sufficient here.
const MAX_TIME_VALUE = 8.64e15;

/**
 * Coerce a caller's trigger instant into a Date that is safe to hand to a
 * DATE trigger, or null when it is not safe to schedule at all.
 *
 * @param {Date|number|string|null|undefined} value Requested trigger instant.
 * @param {{ category?: string, scope?: string }} [options]
 *   category - notification CATEGORY, so a rejection names its own source in
 *              telemetry rather than leaving us hunting all twelve triggers.
 *   scope    - calling function, for the dev-only warning.
 * @returns {Date|null} A valid Date, or null when the caller must not schedule.
 */
export function safeTriggerDate(value, { category = 'unknown', scope = '' } = {}) {
  let ms;
  if (value instanceof Date) ms = value.getTime();
  else if (typeof value === 'number') ms = value;
  else if (typeof value === 'string') ms = Date.parse(value);
  else ms = NaN;

  if (Number.isFinite(ms) && Math.abs(ms) <= MAX_TIME_VALUE) {
    return new Date(ms);
  }

  // Rejected. Report it rather than dropping it on the floor: a bad trigger
  // date is always a defect upstream, and this telemetry is how the
  // producing scheduler gets identified.
  trackNotificationFailed({
    category,
    reason: 'invalid_trigger_date',
    // `raw` describes the SHAPE of the bad value and never carries a real
    // timestamp: notification schedules are health-adjacent and nothing
    // identifying may leave the device (CLAUDE.md, data minimisation).
    payload: { raw: describeRejected(value), scope },
  });
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    logWarn('notifications.safeTriggerDate', `rejected ${describeRejected(value)} for ${category}`);
  }
  return null;
}

/**
 * The single choke point through which every notification in this codebase is
 * scheduled. Drop-in for Notifications.scheduleNotificationAsync: identical
 * signature and return, with one addition.
 *
 * When the trigger is a DATE trigger its date is validated by
 * safeTriggerDate first. An unsafe date is NOT scheduled and resolves null,
 * because the alternative is not a missed notification, it is the app being
 * killed by a native trap the user cannot recover from.
 *
 * Non-DATE triggers (WEEKLY, DAILY, TIME_INTERVAL, null) pass through
 * untouched: they never reach DateTriggerRecord, so they cannot trap here.
 *
 * A rejection is attributed by the notification's own `identifier`, which is
 * a distinct constant per scheduler, so telemetry names the producing
 * scheduler without every call site having to pass its category by hand.
 *
 * @param {object} config Exactly what scheduleNotificationAsync takes.
 * @param {{ category?: string }} [options] Category for telemetry, when known.
 * @returns {Promise<string|null>} The notification id, or null if not scheduled.
 */
export async function scheduleCheckedNotification(config, { category = 'unknown' } = {}) {
  const trigger = config?.trigger;
  // Compare defensively: a DATE trigger is identified by the library enum
  // where it exists, and by the literal 'date' otherwise, so this can never
  // itself throw on a partial module (or a test double) that omits the enum.
  const DATE = Notifications?.SchedulableTriggerInputTypes?.DATE ?? 'date';
  if (trigger && (trigger.type === DATE || trigger.type === 'date')) {
    const safe = safeTriggerDate(trigger.date, {
      category,
      scope: typeof config?.identifier === 'string' ? config.identifier : '',
    });
    if (!safe) return null;
    return Notifications.scheduleNotificationAsync({
      ...config,
      trigger: { ...trigger, date: safe },
    });
  }
  return Notifications.scheduleNotificationAsync(config);
}

/**
 * A short, non-identifying description of a rejected value, so telemetry can
 * say WHAT was wrong without ever carrying a real instant off-device.
 */
function describeRejected(value) {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (value instanceof Date) return 'InvalidDate';
  if (typeof value === 'number') {
    if (Number.isNaN(value)) return 'NaN';
    if (!Number.isFinite(value)) return 'Infinity';
    return 'number-out-of-range';
  }
  if (typeof value === 'string') return 'unparsable-string';
  return typeof value;
}
