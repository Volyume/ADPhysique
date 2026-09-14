/**
 * The week's decision, read once, for any surface that wants to show it.
 *
 * (Named `coachLatestDecision` because `coachDecision.js` already exists and
 * owns a different, older question: whether a saved output COUNTS as a real
 * decision at all. This module answers "what is it and how old", and defers to
 * that one on "is it real" -- see `isCompleted` below.)
 *
 * Authority: founder, 2026-09-14 (D165/D166). Asked what the Progress screen's
 * one loud element should be, they chose the decision over a bodyweight
 * numeral: "that last thing is the reason Volyume exists ... Volyume's
 * proposition is: Your data tells you what to do next." The sentence already
 * existed; it was buried on the Coach tab behind a "See why" pointer.
 *
 * WHY THIS MODULE EXISTS RATHER THAN A CALL PER SCREEN. D166 makes one
 * condition binding on every consumer: the decision must be taken from
 * `buildDecision()` WHOLE and never reassembled from `output.whyThisWeek`,
 * because `buildDecision` puts the ED-pattern lockout in its FIRST branch and
 * a renderer reaching past it would show a cheerful calorie instruction to
 * someone the app has flagged. Two screens wanting the same sentence is two
 * chances to get that wrong, so it is done once, here.
 *
 * NOTHING IS COMPUTED HERE. `runWeeklyCoach` is the deterministic engine and
 * stays the only thing that decides anything; this module reads what it
 * already persisted. If no week has been checked in, the answer is honestly
 * empty rather than an invented reassurance.
 *
 * STALENESS IS REPORTED, NOT HIDDEN. A decision from three weeks ago is still
 * the last real decision, and silently presenting it as this week's would be
 * the app asserting something it does not know. Callers get `weeksAgo` and
 * decide how to frame it; `isCurrent` is the common case.
 */
import { getLatestCoachOutputMeta, getLatestCheckin } from './database';
import { buildDecision } from './coachResponse';
import { isCompletedCoachDecision } from './coachDecision';
import { localWeekStartMs } from './dayKey';

/** A week in ms, used only to turn a week-start difference into a count. */
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * @typedef {object} CoachDecision
 * @property {string|null} sentence   the decision, safety branches included
 * @property {number|null} weekStart  the local Monday the decision belongs to
 * @property {number}      weeksAgo   0 when it is this week's
 * @property {boolean}     isCurrent  weeksAgo === 0
 * @property {boolean}     hasOutput  whether any week has ever been run
 * @property {boolean}     isCompleted whether the week it belongs to was
 *   actually checked in -- the app's existing test for a real decision
 *   (`coachDecision.js`), not a second opinion invented here
 */

/**
 * Read the most recent decision for a user.
 *
 * Fails soft and honestly: any unreadable input answers "no decision" rather
 * than throwing into a screen's render path, and never a fabricated sentence.
 *
 * @param {string} userId
 * @param {{nowMs?: number}} [opts]
 * @returns {Promise<CoachDecision>}
 */
export async function readLatestDecision(userId, { nowMs = Date.now() } = {}) {
  const empty = {
    sentence: null, weekStart: null, weeksAgo: 0,
    isCurrent: false, hasOutput: false, isCompleted: false,
  };
  if (!userId) return empty;

  let meta = null;
  try {
    meta = await getLatestCoachOutputMeta(userId);
  } catch (_e) {
    return empty;
  }
  if (!meta?.output) return empty;

  // Whole, never reassembled. See the note at the top of this file.
  let sentence = null;
  try {
    sentence = buildDecision({ output: meta.output });
  } catch (_e) {
    sentence = null;
  }
  if (!sentence) return { ...empty, weekStart: meta.weekStart || null, hasOutput: true };

  // The app already has a test for whether an output is a real DECISION rather
  // than a computation: the week it was built from must actually have been
  // checked in (`coachDecision.js`, PM-06/D96, written because Home and the
  // Coach tab could disagree and the one saying "yes" was the one that could
  // be wrong). Reusing it rather than inventing a second opinion is the whole
  // reason this reader exists. A failed check-in read answers "not completed",
  // which is the conservative direction.
  let isCompleted = false;
  try {
    const checkin = await getLatestCheckin(userId, meta.weekStart);
    isCompleted = isCompletedCoachDecision(
      { ...meta.output, weekStart: meta.weekStart, hasEnoughData: meta.output.hasEnoughData },
      checkin,
    );
  } catch (_e) {
    isCompleted = false;
  }

  const thisWeek = localWeekStartMs(nowMs);
  const weeksAgo = meta.weekStart
    ? Math.max(0, Math.round((thisWeek - meta.weekStart) / WEEK_MS))
    : 0;

  return {
    sentence,
    weekStart: meta.weekStart || null,
    weeksAgo,
    isCurrent: weeksAgo === 0,
    hasOutput: true,
    isCompleted,
  };
}

/**
 * How a surface should caption a decision that is not this week's.
 *
 * Kept beside the reader so every screen frames staleness the same way, in the
 * house voice: plain, no urgency, no nudge to go and check in. A person who
 * has not checked in for a month is told what they are looking at, not chased.
 *
 * @param {number} weeksAgo
 * @returns {string|null} null when the decision is current
 */
export function decisionAgeCaption(weeksAgo) {
  if (!Number.isFinite(weeksAgo) || weeksAgo <= 0) return null;
  if (weeksAgo === 1) return 'From last week.';
  return `From ${weeksAgo} weeks ago.`;
}
