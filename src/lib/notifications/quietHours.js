/**
 * notifications/quietHours.js
 *
 * Per NOTIFICATIONS_LOCKED.md, every push respects a quiet-hours
 * window. Default is 22:00 to 07:00 local time. If a scheduled push
 * would fire inside that window, it shifts to the next available
 * minute after the window ends.
 *
 * The window is configurable per user via AsyncStorage. Persistence
 * lives in NotificationSettingsScreen / You -> Notifications.
 *
 * This module is pure logic. The OS-facing schedule calls live in
 * scheduler.js and consult these helpers before pinning a trigger.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export const QUIET_HOURS_KEY = '@volyume_quiet_hours_v1';

export const DEFAULT_QUIET_HOURS = Object.freeze({
  enabled: true,
  startHour: 22,   // 22:00 local
  startMinute: 0,
  endHour: 7,      // 07:00 local
  endMinute: 0,
});

/**
 * Load the persisted quiet-hours preference, falling back to the
 * locked default when nothing is stored or the stored blob is
 * corrupt.
 */
export async function getQuietHours() {
  try {
    const raw = await AsyncStorage.getItem(QUIET_HOURS_KEY);
    if (!raw) return { ...DEFAULT_QUIET_HOURS };
    const parsed = JSON.parse(raw);
    return {
      enabled: parsed.enabled !== false,
      startHour: clampHour(parsed.startHour, DEFAULT_QUIET_HOURS.startHour),
      startMinute: clampMinute(parsed.startMinute, DEFAULT_QUIET_HOURS.startMinute),
      endHour: clampHour(parsed.endHour, DEFAULT_QUIET_HOURS.endHour),
      endMinute: clampMinute(parsed.endMinute, DEFAULT_QUIET_HOURS.endMinute),
    };
  } catch {
    return { ...DEFAULT_QUIET_HOURS };
  }
}

export async function setQuietHours(prefs) {
  const merged = { ...DEFAULT_QUIET_HOURS, ...prefs };
  await AsyncStorage.setItem(QUIET_HOURS_KEY, JSON.stringify(merged));
  return merged;
}

function clampHour(n, fallback) {
  return Number.isInteger(n) && n >= 0 && n <= 23 ? n : fallback;
}

function clampMinute(n, fallback) {
  return Number.isInteger(n) && n >= 0 && n <= 59 ? n : fallback;
}

/**
 * Returns true when (hour, minute) falls inside the quiet-hours
 * window. Handles the common wrap case where the window crosses
 * midnight (start > end, e.g. 22:00 -> 07:00).
 */
export function isInsideQuietHours(hour, minute, quietHours) {
  if (!quietHours || !quietHours.enabled) return false;
  const t = hour * 60 + minute;
  const start = quietHours.startHour * 60 + quietHours.startMinute;
  const end = quietHours.endHour * 60 + quietHours.endMinute;
  if (start === end) return false;
  if (start < end) {
    // Same-day window, e.g. 12:00 -> 14:00.
    return t >= start && t < end;
  }
  // Wrap window, e.g. 22:00 -> 07:00. Inside when after start OR before end.
  return t >= start || t < end;
}

/**
 * For a scheduled (hour, minute) trigger, returns the (hour, minute)
 * that should actually be used after applying the quiet-hours rule.
 * If the requested time falls inside the window, the trigger is
 * pushed to the first minute after the window ends. Otherwise the
 * requested time is returned unchanged.
 */
export function shiftHourMinuteOutOfQuietHours(hour, minute, quietHours) {
  if (!quietHours || !quietHours.enabled) return { hour, minute, shifted: false };
  if (!isInsideQuietHours(hour, minute, quietHours)) {
    return { hour, minute, shifted: false };
  }
  return {
    hour: quietHours.endHour,
    minute: quietHours.endMinute,
    shifted: true,
  };
}

/**
 * For a one-off Date trigger, returns the Date that should actually
 * be used after applying the quiet-hours rule. The original date
 * stays if it's outside the window. Otherwise the date shifts to
 * the next instant after quiet-hours ends; if the window wraps
 * midnight and we're already past midnight, that's later today,
 * otherwise it's tomorrow at endHour:endMinute.
 */
export function shiftDateOutOfQuietHours(date, quietHours) {
  if (!quietHours || !quietHours.enabled) return { date, shifted: false };
  const h = date.getHours();
  const m = date.getMinutes();
  if (!isInsideQuietHours(h, m, quietHours)) return { date, shifted: false };
  const out = new Date(date);
  out.setHours(quietHours.endHour, quietHours.endMinute, 0, 0);
  if (out.getTime() <= date.getTime()) {
    // The same-day endHour is in the past relative to the trigger
    // (e.g. trigger 23:30, end 07:00). Advance one day so the
    // shifted time lands tomorrow morning.
    out.setDate(out.getDate() + 1);
  }
  return { date: out, shifted: true };
}
