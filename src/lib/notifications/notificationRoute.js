/**
 * Pure mapping from a notification's `data.type` to a navigation target.
 *
 * Kept separate from RootNavigator so it can be unit-tested without the
 * navigator: the navigator owns only "given this target, navigate". The day-14
 * trial gate (`cascade_gate`) dead-ending is the bug this module first closed:
 * with the beta override off, that tap is the conversion moment.
 *
 * ROUTING TRUTH (Campaign 14 job 5, founder ruling). Every LIVE notification
 * type gets exactly one of two treatments, and nothing else:
 *
 *   A. a meaningful existing destination -- a screen that a navigator really
 *      registers AND that genuinely represents what the notification said, or
 *   B. an intentionally non-navigating notification -- an explicit `case`
 *      returning null, so the tap simply opens the app.
 *
 * A route string is never used merely because it exists, and no screen is
 * created merely to satisfy navigation. Where no screen can truthfully carry
 * the notification's subject, B is preferred over a false deep link. The
 * `notification_tapped` open event fires in `listeners.js` before and
 * independently of this mapping, so choosing B never costs the open telemetry.
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
    case 'block_ready_to_review':
      // C16 phase C: the block-complete review. The decision card - the
      // programme verdict, what stays, what changes and the next-block
      // options - lives on the Plans surface, so that is where the push
      // opens. It carries no params: the card reads the active block
      // itself, and a stale id in a notification would be worse than none.
      return { tab: 'PlansTab', screen: 'Plans' };
    case 'weekly_coach_ready':
      // PM-01(b) (D96): the Monday 09:00 push is laid when a check-in is
      // submitted, so it is about THAT week's review. It used to carry no
      // params, and CoachOutput defaults to the CURRENT week, so on Monday
      // morning the tap opened a week nine hours old with no check-in in it.
      // The reviewed week is baked into `data` at schedule time and passed
      // through here, exactly as the day-3 trial variant already is.
      return data?.weekStart != null && Number.isFinite(Number(data.weekStart))
        ? { tab: 'ProfileTab', screen: 'CoachOutput', params: { weekStart: Number(data.weekStart) } }
        : { tab: 'ProfileTab', screen: 'CoachOutput' };
    case 'morning_weight':
    case 'evening_weight':
      // PM-04 (D96): the two most frequent Pro pushes of the month had no
      // route at all, so the tap landed on whatever screen was last open.
      // The destination already exists and is already used by the check-in
      // gate's "Log my weight first": the Today strip's weight input on Home.
      // The param is minted per tap (RootNavigator passes params straight
      // through, and HomeScreen keys the open on a fresh value).
      return { tab: 'HomeTab', screen: 'Home', params: { openWeightLog: Date.now() } };
    case 'training_reminder':
      // FM-08 (D96): a Free-tier push with no route. Home is where the
      // session hero and "Start workout" live, which is what the reminder is
      // about.
      return { tab: 'HomeTab', screen: 'Home' };
    case 'activation_nudge':
      // FM-08 (D96): the nudge exists to restart a stalled user, and the
      // in-app banner version of it already routes to the next workout on
      // Home. Same destination, so the two cannot disagree.
      return { tab: 'HomeTab', screen: 'Home' };
    case 'winback':
      // COMP-025-A: the +30-day win-back. Lands on the Subscription screen,
      // which shows the returning offer when one is store-eligible (§4c).
      // COMP-025-B: fromWinback carries through to the resubscribe so the
      // win-back Play offer is preferred (inert if none is configured).
      return { tab: 'ProfileTab', screen: 'Subscription', params: { fromWinback: true } };
    case 'partner_cheer':
    case 'partner_streak':
    case 'partner_joined':
      // Campaign 14 job 5 (routing truth). All three live partner beats
      // (partnerBeats.js: cheerPush / streakKeptPush / joinPush) land on the
      // Partner surface, the ONLY screen that shows partner state: the pair
      // card, the shared-streak run, the cheer/moment row and the newly
      // joined pair.
      //
      // partner_cheer used to land on ProgressTab/Consistency on the claim
      // that "the partner row hosts the cheer caption". That row was removed
      // from Consistency on the founder device-walk of 2026-07-03 and its
      // absence is now PINNED (partnerPlacementSpine.guard.test.js), so the
      // tap opened a screen with no partner content at all. partner_streak
      // and partner_joined had no mapping, so their taps dead-ended on
      // whatever screen was last open.
      //
      // The Partner route is registered in ProgressStack as the Pro-guarded
      // GatedPartner, exactly as the Coach-tab row and the Progress tile
      // reach it; navigating here never bypasses that gate. `source` mirrors
      // those two entry points so the surface-view telemetry can attribute a
      // notification-driven open. No pairId is passed: PartnerScreen reads
      // route.params.pairId only as a share target.
      return { tab: 'ProgressTab', screen: 'Partner', params: { source: 'notification' } };
    case 'meal_log_reminder':
      // Campaign 14 job 5: the opt-in meal-log nudge (scheduler.js
      // scheduleMealReminders, Pro-gated and ED-flag gated at both schedule
      // and delivery time) had no mapping, so "a gentle reminder to log it"
      // dead-ended. The Diary IS the thing it names, and it is the same
      // destination the planned-meal confirm nudge already uses. DiaryScreen
      // is registered as the Pro-guarded GatedDiary, so the tier gate is
      // unchanged.
      return { tab: 'DiaryTab', screen: 'Diary' };
    case 'subscription_payment_failure':
      // Campaign 14 job 5: the server-sent billing push (Edge Functions
      // play-billing-rtdn + _shared/appStore) had no mapping. Its body tells
      // the user to update their billing to keep Pro; the Subscription screen
      // is where the plan state and the "open subscription settings" route to
      // the store live. Navigation only, no billing behaviour is touched.
      return { tab: 'ProfileTab', screen: 'Subscription' };
    case 'rest_timer':
    case 'rest_end':
      // Campaign 14 job 5: INTENTIONALLY non-navigating, listed explicitly so
      // it reads as a decision rather than an accidental fall-through.
      //
      // Both are live-workout notifications. rest_timer is a silent ongoing
      // sticky whose real controls are its action buttons (handled in
      // listeners.js before onTap ever runs); rest_end is the one-shot "Rest
      // done" alert. A body tap on either happens while the user is mid
      // session, so the OS restores the app exactly where they left it: the
      // Active Workout screen. Pushing an ActiveWorkout route on top of that
      // would duplicate the screen when a workout is live, and land on an
      // empty one when the notification is stale. The tap therefore just
      // opens the app; the notification_tapped telemetry still fires in
      // listeners.js, which runs before and independently of this mapping.
      return null;
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
