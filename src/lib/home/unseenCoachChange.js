/**
 * unseenCoachChange.js — Item 6 (founder order 2026-09-04, D141).
 *
 * What changed and why: the You-tab "unseen coach review" badge used to
 * mirror HomeScreen's own coach banner exactly (`showCoachBanner`), which
 * carried a `(now - weekStart) < 7 days` freshness window AND cleared on the
 * banner's own dismiss button. That meant the "you have an unread review"
 * signal expired on a clock, and tapping the banner's close X (which is
 * about the banner's time-relevant TEXT going stale, not about having read
 * the review) silently cleared the badge for a review nobody had opened.
 *
 * The badge now tracks a durable, per-user "last viewed" marker written by
 * CoachOutputScreen the moment a real (decision-complete) review is actually
 * shown -- see COACH_OUTPUT_VIEWED_KEY_FOR below. No time expiry: the badge
 * stays lit until the marker for THIS output's week (or a later one) exists.
 *
 * Pure, no I/O: this module only decides the boolean given the facts. The
 * AsyncStorage read/write lives in HomeScreen (read) and CoachOutputScreen
 * (write).
 */

/**
 * Per-user AsyncStorage key for the "last viewed coach output" marker.
 * Matches the repo's existing per-user key convention (e.g. PlansScreen's
 * `BLOCK_SNOOZE_KEY_FOR`). Namespacing by user id means there is nothing to
 * clear on sign-out: a different account reads its own (absent) key and
 * simply starts unread, never another user's marker.
 *
 * @param {string|null|undefined} userId
 * @returns {string}
 */
export function COACH_OUTPUT_VIEWED_KEY_FOR(userId) {
  return `@volyume_coach_output_viewed_${userId ?? 'anon'}`;
}

/**
 * Decide whether the You-tab badge should show.
 *
 * @param {object} args
 * @param {{weekStart?: number, hasEnoughData?: boolean}|null} args.latestOutput
 *   the latest saved coach output row (or null if none exists yet)
 * @param {boolean} args.latestDecisionComplete
 *   isCompletedCoachDecision(latestOutput, itsCheckin) -- the same predicate
 *   the Home banner and the Coach tab already share
 * @param {number|null} args.viewedWeekStart
 *   the weekStart from the persisted marker, or null if never viewed
 * @param {boolean} args.markerLoaded
 *   false while the marker read is still in flight. While loading, this
 *   resolver returns false rather than guessing "unread" -- the CALLER is
 *   responsible for keeping the store's previous value in that state
 *   instead of writing this false through (see HomeScreen's guard).
 * @returns {boolean}
 */
export function resolveHasUnseenCoachChange({
  latestOutput,
  latestDecisionComplete,
  viewedWeekStart,
  markerLoaded,
}) {
  if (!markerLoaded) return false;
  if (!latestOutput || !latestDecisionComplete) return false;
  const latestWeekStart = Number(latestOutput.weekStart);
  if (!Number.isFinite(latestWeekStart)) return false;
  if (viewedWeekStart == null) return true;
  return latestWeekStart > Number(viewedWeekStart);
}

export default resolveHasUnseenCoachChange;
