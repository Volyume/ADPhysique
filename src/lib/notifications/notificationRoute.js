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
 * @param {object} [data] the full `data` payload, for types whose target
 *        depends on a baked field (e.g. COMP-023 trial_day3 variant)
 * @returns {{tab: string, screen: string, params?: object} | null}
 */
export function routeForNotificationType(type, data = {}) {
  switch (type) {
    case 'weekly_checkin':
      return { tab: 'ProfileTab', screen: 'WeeklyCheckIn' };
    case 'year_of_lifts_unlock':
      return { tab: 'ProgressTab', screen: 'YearOfLifts' };
    case 'monthly_recap':
      // COMP-005: lands on Progress, where the ephemeral recap card and the
      // Recaps tile open the story. The month window is dynamic, so it is not
      // carried on the static notification route.
      return { tab: 'ProgressTab', screen: 'Analytics' };
    case 'cascade_gate':
      // The in-app trial-ending gate. Variant default matches the 14+7 trial
      // (the 'day14' content is the generic "trial winding down" copy).
      return { tab: 'ProfileTab', screen: 'CascadeGate', params: { variant: 'day14' } };
    case 'weekly_coach_ready':
      // Same destination as the You-tab "Precision Coaching" row, which opens
      // CoachOutput with no weekStart (current week).
      return { tab: 'ProfileTab', screen: 'CoachOutput' };
    case 'trial_day3':
      // COMP-023 day-3 value moment. S1/S2 land on the check-in gate screen
      // (which shows the countdown made visible); S3 (no sessions yet) lands on
      // Home, where the session hero is the re-onboarding. The variant is baked
      // into the notification `data` at schedule time.
      return data?.variant === 'S3'
        ? { tab: 'HomeTab' }
        : { tab: 'ProfileTab', screen: 'WeeklyCheckIn' };
    default:
      return null;
  }
}
