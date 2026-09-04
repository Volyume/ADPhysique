/**
 * mealReminderOffer.js — Item 9(c) (D141, founder order 2026-09-04).
 *
 * The opt-in meal-log reminder (category `meal_log_reminder`, off by
 * default, Settings -> Notifications and reminders -> Meal reminders) had
 * no contextual discovery path: a user missing days of logging was never
 * told the reminder existed. This is the pure eligibility rule behind a
 * calm, dismissible, one-time offer card on DiaryScreen pointing at it.
 *
 * Pure, no I/O: DiaryScreen reads every fact (the existing 7-day intake
 * summary already used elsewhere in the app, the meal-reminders
 * AsyncStorage flag, calm mode, the open ED-pattern flag, and this offer's
 * own per-user dismissal marker) and this module only decides the boolean.
 *
 * ED-safety (CLAUDE.md, fail CLOSED): a food-adjacent nudge must never
 * appear under calm mode or an open ED-pattern flag. Both `calmMode` and
 * `edFlagOpen` are expected to already carry their FAIL-CLOSED value from
 * the caller (a transient read failure counts as "on"), matching every
 * other suppression chain in this screen (see DiaryScreen's own
 * edFlagOpen / bankingAvailable).
 */

/** Per-user AsyncStorage key for this offer's own "dismissed for good" marker. */
export function MEAL_REMINDER_OFFER_DISMISSED_KEY_FOR(userId) {
  return `@volyume_meal_reminder_offer_dismissed_${userId ?? 'anon'}`;
}

/** How many of the trailing 7 days (including today) must have NO logged food
 *  for the diary to count as "missing days" worth nudging about. */
export const MIN_MISSING_DAYS = 2;
export const WINDOW_DAYS = 7;

/**
 * @param {object} f
 * @param {boolean} f.hasAccount             signed in (no anonymous mode exists, but keep the check explicit)
 * @param {boolean} f.hasNutritionTargets    nutrition targets are set
 * @param {number|null|undefined} f.daysLoggedLast7
 *   getRecentIntakeSummary(userId).daysLogged -- days with at least one food
 *   entry in the trailing 7-day window INCLUDING today. A missing/failed
 *   read counts as 0 days logged (the most-missing case): a summary that
 *   could not be read is not evidence the user has been logging.
 * @param {boolean} f.mealRemindersEnabled   any entry in MEAL_REMINDERS_KEY is already on
 * @param {boolean} f.calmMode               wellbeing mode is 'calm', OR the read failed (fail closed)
 * @param {boolean} f.edFlagOpen             an ED pattern flag is open, OR the read failed (fail closed)
 * @param {boolean} f.dismissed              the offer's own per-user marker is set
 * @returns {boolean}
 */
export function resolveMealReminderOfferEligible({
  hasAccount,
  hasNutritionTargets,
  daysLoggedLast7,
  mealRemindersEnabled,
  calmMode,
  edFlagOpen,
  dismissed,
}) {
  // (i) account + nutrition targets
  if (!hasAccount || !hasNutritionTargets) return false;
  // (ii) at least MIN_MISSING_DAYS of the last WINDOW_DAYS (incl. today) show no food
  const logged = Number.isFinite(daysLoggedLast7) ? daysLoggedLast7 : 0;
  // Lead review (D141): the offer is for someone who HAS been logging and
  // has started to miss days, never for a first-day user who has not
  // logged anything yet - that would be first-launch noise on the diary
  // before they have tried it once. So at least one logged day in the
  // window, and at least MIN_MISSING_DAYS missing.
  if (logged < 1) return false;
  const missingDays = WINDOW_DAYS - logged;
  if (missingDays < MIN_MISSING_DAYS) return false;
  // (iii) meal reminders not already enabled -- nothing to offer
  if (mealRemindersEnabled) return false;
  // (iv) never a food-adjacent nudge under calm mode or an open ED flag
  if (calmMode || edFlagOpen) return false;
  // (v) not previously dismissed
  if (dismissed) return false;
  return true;
}

export default resolveMealReminderOfferEligible;
