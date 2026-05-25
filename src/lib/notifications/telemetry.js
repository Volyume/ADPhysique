/**
 * notifications/telemetry.js
 *
 * Thin wrappers over engineTelemetry.track for the three notification
 * events:
 *   notification_sent   - OS delivered a scheduled notification to
 *                         the device (we observe this via the
 *                         expo-notifications received-listener; only
 *                         fires while the app is alive enough for the
 *                         listener to run)
 *   notification_tapped - user opened a delivered notification
 *   notification_failed - schedule call threw (local error) OR the
 *                         OS reported a delivery failure
 *
 * Each helper is fire-and-forget. They look the user up lazily from
 * the Zustand store so call sites don't need to thread userId.
 * They never throw: notification flows must not break because the
 * telemetry layer is unavailable.
 */

import { CATEGORY, categoryForDataType } from './categories';

function getCurrentUserId() {
  try {
    // eslint-disable-next-line global-require
    const useAppStore = require('../../store/useAppStore').default;
    return useAppStore.getState().user?.id ?? null;
  } catch {
    return null;
  }
}

function getTrack() {
  try {
    // eslint-disable-next-line global-require
    return require('../engineTelemetry').track;
  } catch {
    return null;
  }
}

/**
 * Resolve a category from one of: an explicit category string, a
 * notification object (request.content.data.type), or null. Always
 * returns a category enum value, falling back to TRAINING_REMINDER
 * is wrong -- callers that can't determine the category should pass
 * null and the helper will skip telemetry rather than misattribute.
 */
function resolveCategory({ category, notification }) {
  if (category) return category;
  const type = notification?.request?.content?.data?.type
    ?? notification?.content?.data?.type
    ?? null;
  if (type) return categoryForDataType(type);
  return null;
}

export function trackNotificationSent({ category, notification, scheduledFor, payload } = {}) {
  const userId = getCurrentUserId();
  if (!userId) return;
  const track = getTrack();
  if (!track) return;
  const cat = resolveCategory({ category, notification });
  if (!cat) return;
  const body = {
    category: cat,
    scheduled_for: scheduledFor ?? null,
    delivered_at: new Date().toISOString(),
    ...(payload ?? {}),
  };
  track(userId, 'notification_sent', body).catch(() => {});
}

export function trackNotificationTapped({ category, notification, payload } = {}) {
  const userId = getCurrentUserId();
  if (!userId) return;
  const track = getTrack();
  if (!track) return;
  const cat = resolveCategory({ category, notification });
  if (!cat) return;
  const body = {
    category: cat,
    tapped_at: new Date().toISOString(),
    ...(payload ?? {}),
  };
  track(userId, 'notification_tapped', body).catch(() => {});
}

export function trackNotificationFailed({ category, reason, payload } = {}) {
  const userId = getCurrentUserId();
  if (!userId) return;
  const track = getTrack();
  if (!track) return;
  if (!category) return;
  const body = {
    category,
    reason: reason ?? 'unknown',
    ...(payload ?? {}),
  };
  track(userId, 'notification_failed', body).catch(() => {});
}

// Re-export for convenience so callers can use CATEGORY enum without
// importing two modules.
export { CATEGORY };
