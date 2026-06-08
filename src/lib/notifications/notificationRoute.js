/**
 * Pure mapping from a notification's `data.type` to a navigation target.
 *
 * Kept separate from RootNavigator so it can be unit-tested without the
 * navigator: the navigator owns only "given this target, navigate". Every
 * type the scheduler sets (`src/lib/notifications/scheduler.js`) must have a
 * route here, or tapping that notification dead-ends. The day-14 trial gate
 * (`cascade_gate`) dead-ending is the bug this closes: with the beta override
 * off, that tap is the conversion moment.
 *
 * Returns `{ tab, screen, params? }` or `null` for an unknown / no-op type.
 * `tab` is the bottom-tab route; `screen` is the screen inside that tab's
 * stack; `params` (optional) are passed to the screen.
 *
 * @param {string} type  the `data.type` on the notification
 * @returns {{tab: string, screen: string, params?: object} | null}
 */
export function routeForNotificationType(type) {
  switch (type) {
    case 'weekly_checkin':
      return { tab: 'ProfileTab', screen: 'WeeklyCheckIn' };
    case 'year_of_lifts_unlock':
      return { tab: 'ProgressTab', screen: 'YearOfLifts' };
    case 'cascade_gate':
      // The in-app trial-ending gate. Variant default matches the 14+7 trial
      // (the 'day14' content is the generic "trial winding down" copy).
      return { tab: 'ProfileTab', screen: 'CascadeGate', params: { variant: 'day14' } };
    case 'weekly_coach_ready':
      // Same destination as the You-tab "Precision Coaching" row, which opens
      // CoachOutput with no weekStart (current week).
      return { tab: 'ProfileTab', screen: 'CoachOutput' };
    case 'partner_digest':
      // The Sunday-evening Training Partners digest opens the partners screen.
      return { tab: 'ProfileTab', screen: 'TrainingPartners' };
    default:
      return null;
  }
}
