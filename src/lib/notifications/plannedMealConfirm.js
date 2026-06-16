/**
 * plannedMealConfirm.js — F3 planned-meal confirm reminder (pure helpers + copy)
 *
 * A gentle evening push nudging the user to confirm planned meals they logged
 * but never marked as eaten ("ate as planned"), so the coach's adherence read
 * stays accurate. The confirm action already lives in-app (the Diary banner and
 * the weekly check-in); this is only the proactive reminder.
 *
 * Kept pure (no imports) so the copy + slot maths are trivially testable; the
 * OS-facing scheduling lives in scheduler.js (schedulePlannedMealConfirm), which
 * applies the Pro/toggle gates, the open-ED-flag suppression, quiet hours and
 * the push budget. See docs/f3-planned-meal-reminder-notification-spec-2026-06-16.md
 * and the NOTIFICATIONS_LOCKED.md addendum.
 *
 * Voice: warm, complete British sentences; never shame ("you forgot" is banned).
 */

export const PLANNED_CONFIRM_HOUR = 20; // 20:00 local (founder 2026-06-16)

/**
 * Push copy. `name` is the pre-formatted ', First' suffix (or ''), the same
 * convention as the other schedulers. The suffix sits before the question mark
 * so it reads naturally ("Did your day go to plan, Sam?").
 */
export function plannedMealConfirmPush(name = '') {
  return {
    title: `Did your day go to plan${name}?`,
    body: 'If you ate your planned meals, tap to confirm them so your coach stays accurate.',
  };
}

/**
 * Today's evening slot (20:00 local by default). Quiet hours are applied later
 * by the scheduler and always win. The scheduler skips a slot already in the
 * past, so an app opened after 20:00 simply gets no nudge that day.
 */
export function plannedConfirmSlot(now = new Date(), hour = PLANNED_CONFIRM_HOUR) {
  const d = new Date(now);
  d.setHours(hour, 0, 0, 0);
  return d;
}
