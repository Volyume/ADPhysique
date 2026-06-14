/**
 * NEW-002 — the shared training-partner streak (§4.5, the no-blame design).
 *
 * Counted in TRAINING WEEKS (Mon–Sun), never days, riding COMP-018's
 * computeWeekState seam exactly (one consistency engine). Each finished week is
 * reduced to a joint state from both partners' own week states:
 *
 *   - either partner 'resting' (deload / pause / wellbeing hold)  -> 'resting'
 *       The streak HOLDS. It never grows and can never read as broken. A
 *       wellbeing/ED hold is indistinguishable from a planned recovery week
 *       (the §5 privacy property), so 'resting' must never look like a fail.
 *   - both partners met their own week                            -> 'met'
 *       The shared streak increments.
 *   - otherwise (at least one trained-but-unmet, none resting)    -> 'quiet'
 *       A "Quiet week": the streak HOLDS at N, no notification, and no copy
 *       ever attributes the quiet week to a person. This is the deliberate
 *       inversion of Duolingo's break-and-unpair.
 *
 * After 4 consecutive quiet weeks the run gently ARCHIVES — a stale number is
 * worse than a fresh start, but archiving is forward motion, not failure. When
 * both partners next meet a week, counting resumes from the next integer (or 1
 * after an archive).
 *
 * Pure and fully unit-tested. The current in-progress week is never judged and
 * must be excluded by the caller (pass finished weeks only).
 */

const QUIET_ARCHIVE_LIMIT = 4;

/** Reduce one finished week's two own-states to the joint state. */
export function jointWeekState({ aMet = false, aResting = false, bMet = false, bResting = false } = {}) {
  if (aResting || bResting) return 'resting';
  if (aMet && bMet) return 'met';
  return 'quiet';
}

/**
 * @param {object} input
 * @param {Array} input.weeks  oldest-first finished weeks, each
 *   { aMet, aResting, bMet, bResting } (the two partners' computeWeekState
 *   outputs for that week). The in-progress current week is excluded.
 * @param {boolean} input.enabled  the optional shared-streak toggle (§4.5)
 * @returns {{ run:number, status:'counting'|'resting'|'quiet'|'archived'|'off', longest:number }}
 */
export function computeSharedStreak({ weeks = [], enabled = true } = {}) {
  if (!enabled) return { run: 0, status: 'off', longest: 0 };

  let run = 0;
  let longest = 0;
  let quietRun = 0;
  let archived = false;
  let lastJoint = null;

  for (const w of (Array.isArray(weeks) ? weeks : [])) {
    const joint = jointWeekState(w);
    lastJoint = joint;
    if (joint === 'met') {
      run = archived ? 1 : run + 1;
      archived = false;
      quietRun = 0;
    } else if (joint === 'resting') {
      // Planned hold: the streak is safe, neither grows nor counts as quiet.
      quietRun = 0;
    } else { // 'quiet'
      quietRun += 1;
      if (quietRun >= QUIET_ARCHIVE_LIMIT) archived = true;
    }
    if (run > longest) longest = run;
  }

  let status;
  if (archived) status = 'archived';
  else if (lastJoint === 'resting') status = 'resting';
  else if (lastJoint === 'quiet') status = 'quiet';
  else status = 'counting';

  return { run: archived ? 0 : run, status, longest };
}

/**
 * The chip label for the partner row (§4.4), house voice, British English.
 * Numerals are the hero; no exclamation marks; never a red/fail word.
 */
export function sharedStreakLabel({ run = 0, status = 'counting' } = {}) {
  switch (status) {
    case 'off':      return null;
    case 'resting':  return run > 0 ? `Resting. Streak safe at ${run} ${weeksWord(run)}.` : 'Resting this week';
    case 'quiet':    return run > 0 ? `Quiet week. Streak safe at ${run} ${weeksWord(run)}.` : 'Quiet week';
    case 'archived': return 'Start a new run together?';
    default:         return run > 0 ? `${run} ${weeksWord(run)}` : 'New run';
  }
}

function weeksWord(n) {
  return n === 1 ? 'week' : 'weeks';
}

/**
 * Align both members' finished weeks for computeSharedStreak: join the
 * synced pair signals by week_start; only weeks where BOTH sides have
 * reported feed the shared streak. (Moved from usePartners so the
 * notification scheduler and the hook read ONE derivation.)
 */
export function buildSharedWeeks(pairSignals, myId, partnerId) {
  const byWeek = new Map();
  for (const s of (pairSignals || [])) {
    const slot = byWeek.get(s.weekStart) || {};
    if (s.userId === myId) { slot.aMet = !!s.weekMet; slot.aResting = s.state === 'resting'; }
    else if (s.userId === partnerId) { slot.bMet = !!s.weekMet; slot.bResting = s.state === 'resting'; }
    byWeek.set(s.weekStart, slot);
  }
  return [...byWeek.entries()]
    .sort((a, b) => Number(a[0]) - Number(b[0]))
    .map(([, v]) => v)
    .filter((v) => ('aMet' in v) && ('bMet' in v));
}
