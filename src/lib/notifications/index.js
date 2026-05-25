/**
 * notifications/index.js
 *
 * Public API for the notifications module. Re-exports the surface
 * the rest of the app uses; consumers should import from
 * '../lib/notifications' (or '../../lib/notifications') and never
 * reach into the submodules directly.
 *
 * Internal layout (per NOTIFICATIONS_LOCKED.md):
 *   categories.js   the category enum + channel routing
 *   quietHours.js   the 22:00 -> 07:00 default time-shift rule
 *   permissions.js  request / status helpers
 *   handler.js      foreground delivery handler with smart suppression
 *   scheduler.js    cron-like schedule + cancel helpers
 *   telemetry.js    notification_sent / _tapped / _failed firers
 *
 * Surfaces still pending split-out (tracked in NOTIFICATIONS_LOCKED.md):
 *   - Cascade gate (day 19, 21) push
 *   - Subscription payment failure
 *   - Weekly coach output ready
 * Each of those will land here as a category + scheduler helper
 * when its feature ships; the spec table in categories.js already
 * names them.
 */

export {
  requestNotificationPermissions,
  getNotificationPermissionStatus,
} from './permissions';

export { configureNotificationHandler } from './handler';

export {
  scheduleMorningWeightNotification,
  scheduleCheckinReminder,
  scheduleNextCheckinReminder,
  cancelMorningNotification,
  cancelCheckinNotification,
  cancelAllNotifications,
  restoreNotifications,
  checkYearOfLiftsUnlock,
} from './scheduler';

export {
  CATEGORY,
  CHANNEL,
  CATEGORY_CHANNELS,
  isPushCategory,
  categoryForDataType,
} from './categories';

export {
  getQuietHours,
  setQuietHours,
  isInsideQuietHours,
  shiftHourMinuteOutOfQuietHours,
  shiftDateOutOfQuietHours,
  DEFAULT_QUIET_HOURS,
  QUIET_HOURS_KEY,
} from './quietHours';

export {
  trackNotificationSent,
  trackNotificationTapped,
  trackNotificationFailed,
} from './telemetry';
