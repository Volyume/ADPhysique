/**
 * notifications/categories.js
 *
 * The category enum from NOTIFICATIONS_LOCKED.md. Every scheduled
 * push, in-app banner, or email belongs to exactly one category.
 *
 * Telemetry events (notification_sent / _tapped / _failed) carry the
 * category in their payload so Panel 6 can break send / open / fail
 * rates down per category.
 *
 * Adding a category here is the right place to register a new
 * notification surface; the schedule helpers in scheduler.js will
 * apply quiet hours + telemetry uniformly once the category is in
 * the map.
 */

export const CATEGORY = Object.freeze({
  DAILY_CHECKIN_REMINDER: 'daily_checkin_reminder',
  WEEKLY_CHECKIN_REMINDER: 'weekly_checkin_reminder',
  CASCADE_GATE: 'cascade_gate',
  SUBSCRIPTION_PAYMENT_FAILURE: 'subscription_payment_failure',
  SUBSCRIPTION_EXPIRING: 'subscription_expiring',
  SYNC_ERROR: 'sync_error',
  ED_PATTERN_LOCKOUT: 'ed_pattern_lockout',
  FFM_FLOOR_HOLD: 'ffm_floor_hold',
  WEEKLY_COACH_READY: 'weekly_coach_ready',
  COACH_TRIAL_ENDING: 'coach_trial_ending',
  // Existing categories that pre-date the locked spec; keep them
  // so historical scheduling code can map onto a category value
  // without lying about its intent.
  MORNING_WEIGHT: 'morning_weight',
  TRAINING_REMINDER: 'training_reminder',
  YEAR_OF_LIFTS_UNLOCK: 'year_of_lifts_unlock',
  MONTHLY_RECAP: 'monthly_recap', // COMP-005
  TRIAL_DAY3: 'trial_day3', // COMP-023
  WINBACK: 'winback', // COMP-025-A
  PARTNER_CHEER: 'partner_cheer', // NEW-002
  CHECKIN_MISSED: 'checkin_missed', // OPP-C03 ghost prevention
  PLANNED_MEAL_CONFIRM: 'planned_meal_confirm', // F3: confirm planned meals
  REST_TIMER: 'rest_timer', // U1/F3: live lock-screen rest timer with actions
  MEAL_LOG_REMINDER: 'meal_log_reminder', // gap #4: opt-in, convenience-only meal-log nudge
});

/**
 * The expo-notifications notification CATEGORY identifier for the live
 * rest-timer notification. This is the value passed as
 * content.categoryIdentifier when the notification is presented, and the
 * id registered via Notifications.setNotificationCategoryAsync. Keeping it
 * equal to the data.type tag keeps the two in step.
 */
export const REST_TIMER_CATEGORY_ID = 'rest_timer';

/**
 * The four action-button identifiers on the rest-timer notification.
 * These are matched on response.actionIdentifier in the response handler
 * (restTimerActions.js) and mapped to the store rest-timer actions.
 * British-English titles; functional, no shame, no loss framing.
 */
export const REST_TIMER_ACTION = Object.freeze({
  COMPLETE_SET: 'complete_set',
  PLUS_15: 'rest_plus_15',
  MINUS_15: 'rest_minus_15',
  SKIP: 'rest_skip',
});

/**
 * Action descriptors for setNotificationCategoryAsync. Exported so the
 * test can assert exactly four actions with the right ids without
 * reaching into expo. opensAppToForeground:false on ±15/skip lets the
 * user adjust without yanking the app open; complete-set opens the app
 * because logging a set runs through the in-app completion path.
 */
export const REST_TIMER_ACTIONS = Object.freeze([
  { identifier: REST_TIMER_ACTION.COMPLETE_SET, buttonTitle: 'Complete set', options: { opensAppToForeground: true } },
  { identifier: REST_TIMER_ACTION.PLUS_15, buttonTitle: '+15s', options: { opensAppToForeground: false } },
  { identifier: REST_TIMER_ACTION.MINUS_15, buttonTitle: '−15s', options: { opensAppToForeground: false } },
  { identifier: REST_TIMER_ACTION.SKIP, buttonTitle: 'Skip rest', options: { opensAppToForeground: false } },
]);

/**
 * Channel routing per category. "push" means the OS delivers it;
 * "in_app" means a banner or toast inside the app only. ED-pattern
 * and FFM-floor-hold are in-app-only by policy (push for those is
 * the harm pattern). Sync error stays in-app-only too -- a push
 * about a sync error to a backgrounded app is noise.
 */
export const CHANNEL = Object.freeze({
  PUSH: 'push',
  IN_APP: 'in_app',
  EMAIL: 'email',
});

export const CATEGORY_CHANNELS = Object.freeze({
  [CATEGORY.DAILY_CHECKIN_REMINDER]: [CHANNEL.PUSH],
  [CATEGORY.WEEKLY_CHECKIN_REMINDER]: [CHANNEL.PUSH],
  [CATEGORY.CASCADE_GATE]: [CHANNEL.PUSH, CHANNEL.IN_APP],
  [CATEGORY.SUBSCRIPTION_PAYMENT_FAILURE]: [CHANNEL.PUSH, CHANNEL.IN_APP],
  [CATEGORY.SUBSCRIPTION_EXPIRING]: [CHANNEL.PUSH, CHANNEL.IN_APP],
  [CATEGORY.SYNC_ERROR]: [CHANNEL.IN_APP],
  [CATEGORY.ED_PATTERN_LOCKOUT]: [CHANNEL.IN_APP],
  [CATEGORY.FFM_FLOOR_HOLD]: [CHANNEL.IN_APP],
  [CATEGORY.WEEKLY_COACH_READY]: [CHANNEL.PUSH],
  [CATEGORY.COACH_TRIAL_ENDING]: [CHANNEL.EMAIL],
  [CATEGORY.MORNING_WEIGHT]: [CHANNEL.PUSH],
  [CATEGORY.TRAINING_REMINDER]: [CHANNEL.PUSH],
  [CATEGORY.MEAL_LOG_REMINDER]: [CHANNEL.PUSH],
  [CATEGORY.YEAR_OF_LIFTS_UNLOCK]: [CHANNEL.PUSH],
  [CATEGORY.MONTHLY_RECAP]: [CHANNEL.PUSH],
  [CATEGORY.TRIAL_DAY3]: [CHANNEL.PUSH, CHANNEL.IN_APP], // COMP-023
  [CATEGORY.WINBACK]: [CHANNEL.PUSH, CHANNEL.IN_APP], // COMP-025-A
  // NEW-002: a partner cheer. Push when backgrounded, in-app toast when
  // foregrounded. While an ED/wellbeing flag is open the delivery downgrades to
  // in-app-only (handled at send time, §5) — pushing at a flagged user is the
  // harm pattern, exactly as ED_PATTERN_LOCKOUT/FFM_FLOOR_HOLD.
  [CATEGORY.PARTNER_CHEER]: [CHANNEL.PUSH, CHANNEL.IN_APP], // NEW-002
  // OPP-C03: the missed check-in follow-ups. Push only; ED-flag
  // suppression and the never-shame copy rule live in the scheduler
  // (scheduleMissedCheckinFollowups) and handler.
  [CATEGORY.CHECKIN_MISSED]: [CHANNEL.PUSH],
  // F3: a gentle evening nudge to confirm planned meals the user logged but
  // never marked eaten. Push only; Pro-gated, ED-flag suppressed and budgeted
  // in the scheduler, exactly like CHECKIN_MISSED.
  [CATEGORY.PLANNED_MEAL_CONFIRM]: [CHANNEL.PUSH],
  // U1/F3: the live rest-timer notification. It surfaces as an OS push
  // (a silent, ongoing local notification on its own channel) but is
  // presented directly via presentRestTimerNotification, never through
  // the scheduler — this entry exists only so tap telemetry can resolve
  // a channel and to satisfy the "every category has channels" invariant.
  [CATEGORY.REST_TIMER]: [CHANNEL.PUSH],
});

/**
 * Register the rest-timer notification category with its four action
 * buttons. Must run before the first rest-timer notification is
 * presented (the OS attaches the buttons by category id). Idempotent —
 * re-registering simply replaces the definition. Call once at app boot.
 *
 * NOTE: registering a notification category requires a fresh native
 * build; it does not take effect over an OTA/JS-only update.
 */
export async function registerRestTimerCategory() {
  try {
    // Lazily required so this module stays import-light: the category
    // enums above are imported by telemetry/test code that does not mock
    // expo-notifications, and a top-level import would drag the native
    // module into those contexts.
    const Notifications = require('expo-notifications');
    await Notifications.setNotificationCategoryAsync(
      REST_TIMER_CATEGORY_ID,
      REST_TIMER_ACTIONS,
    );
  } catch (_) { /* never break boot on a notification-setup failure */ }
}

/**
 * Whether a category may surface as a push at all. Used by the
 * scheduler to short-circuit OS-push calls for in-app-only types.
 */
export function isPushCategory(category) {
  const channels = CATEGORY_CHANNELS[category] || [];
  return channels.includes(CHANNEL.PUSH);
}

/**
 * Map an expo-notifications data.type string (the runtime tag baked
 * into each scheduled notification's content.data) back to the
 * category enum. Returns null when the type doesn't map. Used by
 * the response listener so the tap telemetry can fire with the
 * right category.
 */
export function categoryForDataType(type) {
  switch (type) {
    case 'morning_weight': return CATEGORY.MORNING_WEIGHT;
    case 'weekly_checkin': return CATEGORY.WEEKLY_CHECKIN_REMINDER;
    case 'training_reminder': return CATEGORY.TRAINING_REMINDER;
    case 'year_of_lifts_unlock': return CATEGORY.YEAR_OF_LIFTS_UNLOCK;
    case 'monthly_recap': return CATEGORY.MONTHLY_RECAP;
    case 'cascade_gate': return CATEGORY.CASCADE_GATE;
    case 'trial_day3': return CATEGORY.TRIAL_DAY3;
    case 'winback': return CATEGORY.WINBACK;
    case 'partner_cheer': return CATEGORY.PARTNER_CHEER;
    case 'checkin_missed': return CATEGORY.CHECKIN_MISSED;
    case 'planned_meal_confirm': return CATEGORY.PLANNED_MEAL_CONFIRM;
    case 'rest_timer': return CATEGORY.REST_TIMER;
    case 'subscription_payment_failure': return CATEGORY.SUBSCRIPTION_PAYMENT_FAILURE;
    case 'subscription_expiring': return CATEGORY.SUBSCRIPTION_EXPIRING;
    case 'weekly_coach_ready': return CATEGORY.WEEKLY_COACH_READY;
    default: return null;
  }
}
