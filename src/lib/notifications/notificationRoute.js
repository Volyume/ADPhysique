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
// Local day-key format used app-wide (YYYY-MM-DD, `src/lib/dayKey.js`). Kept
// as a local regex (this module stays import-free) so an invalid/missing
// date on a future notification can never produce a malformed diary route.
const DAY_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

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
    case 'winback':
      // COMP-025-A: the +30-day win-back. Lands on the Subscription screen,
      // which shows the returning offer when one is store-eligible (§4c).
      // COMP-025-B: fromWinback carries through to the resubscribe so the
      // win-back Play offer is preferred (inert if none is configured).
      return { tab: 'ProfileTab', screen: 'Subscription', params: { fromWinback: true } };
    case 'partner_cheer':
      // NEW-002: a partner sent a cheer. Lands on the Progress consistency
      // screen, where the partner row hosts the cheer caption + reciprocity.
      return { tab: 'ProgressTab', screen: 'Consistency' };
    case 'checkin_missed':
      // OPP-C03 ghost prevention. The same-evening nudge lands on the
      // check-in wizard (it is still the user's check-in day); the +48h
      // value follow-up promises the weekly trend, so it lands on the
      // Progress trend view rather than dead-ending on the check-in
      // screen's wrong-day gate.
      return data?.slot === 'followup'
        ? { tab: 'ProgressTab', screen: 'Analytics' }
        : { tab: 'ProfileTab', screen: 'WeeklyCheckIn' };
    case 'planned_meal_confirm':
      // F3: tap lands on the Diary, where the "Mark as eaten" banner and the
      // per-meal confirm live for the day with unconfirmed planned meals.
      return { tab: 'DiaryTab', screen: 'Diary' };
    case 'diary_day':
      // §15 item 8 (deep-link expansion): the general-purpose target for any
      // notification that references ONE specific diary day rather than
      // today (e.g. a future "confirm what you logged on Tuesday" nudge). No
      // scheduler call site sets this type yet; the mapping exists so the
      // first one to need it has somewhere to land instead of dead-ending.
      // `data.date` is a local day-key (YYYY-MM-DD); an absent or malformed
      // value falls through to the Diary root (today), same as
      // planned_meal_confirm above, never a crash.
      return DAY_KEY_RE.test(data?.date)
        ? { tab: 'DiaryTab', screen: 'Diary', params: { date: data.date } }
        : { tab: 'DiaryTab', screen: 'Diary' };
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
