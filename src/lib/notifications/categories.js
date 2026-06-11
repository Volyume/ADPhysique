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
});

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
  [CATEGORY.YEAR_OF_LIFTS_UNLOCK]: [CHANNEL.PUSH],
  [CATEGORY.MONTHLY_RECAP]: [CHANNEL.PUSH],
  [CATEGORY.TRIAL_DAY3]: [CHANNEL.PUSH, CHANNEL.IN_APP], // COMP-023
  [CATEGORY.WINBACK]: [CHANNEL.PUSH, CHANNEL.IN_APP], // COMP-025-A
});

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
    case 'subscription_payment_failure': return CATEGORY.SUBSCRIPTION_PAYMENT_FAILURE;
    case 'subscription_expiring': return CATEGORY.SUBSCRIPTION_EXPIRING;
    case 'weekly_coach_ready': return CATEGORY.WEEKLY_COACH_READY;
    default: return null;
  }
}
