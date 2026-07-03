/**
 * coachResponse.js
 * The five-part coach response layer (deep audit 2026-06-12, Theme A:
 * OPP-C01 specific acknowledgement, OPP-C06 plain-language trend
 * interpretation, OPP-C02 one cue + forward pull).
 *
 * Pure functions only. No side effects, no DB calls, no I/O, no
 * randomness. Takes the weekly coach output CoachOutputScreen already
 * receives and renders the five-part response elite coaches use:
 *   1. Specific, data-referenced acknowledgement (never generic praise)
 *   2. Plain-language trend interpretation
 *   3. The decision plus the reason (reuses the existing decision data)
 *   4. One tactical cue for the week ahead (deterministic priority)
 *   5. A forward-pull line that anchors the next check-in
 *
 * Voice rules: docs/COACHING_VOICE_SYNTHESIS_LOCKED.md.
 *   - Honesty test on every line: "would this still be true if the user
 *     did nothing but kept logging?"
 *   - Mirror data, never infer state. Numbers before narrative.
 *   - No motivational filler without a data referent. No em dashes.
 *   - British English throughout.
 *
 * ED / calm-mode suppression mirrors the existing surfaces (COMP-004
 * weightTrend.js and the COMP-023 trial banner): under an open
 * ED/wellbeing flag or calm mode, weight-change RATE language is
 * dropped (direction-only copy), weigh-in counts are not surfaced, and
 * no cue asks for daily weighing or tighter food control.
 */

import { checkJargon } from './whyThisTemplates';
import { getLatestEwma, getEwmaSevenDaysAgo } from './weeklyCoach';
import { pairAppliedWithOutcome } from './coachOutcome';

// ---------------------------------------------------------------------------
// Guards
// ---------------------------------------------------------------------------

// Dev-time guard, same pattern as whyThisTemplates.clean(): every exported
// string runs through the shared jargon blocklist, plus a hard block on em
// and en dashes which are banned in all user-facing copy.
function clean(str) {
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    const { clean: ok, violations } = checkJargon(str);
    if (!ok) {
      throw new Error(`Jargon detected in coach response: "${violations.join(', ')}" in: "${str}"`);
    }
    if (/[–—]/.test(str)) {
      throw new Error(`Em or en dash detected in coach response: "${str}"`);
    }
  }
  return str.trim();
}

function plural(n, word) {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

// Ordinal words for the on-target streak sentence. Streaks longer than
// six weeks fall back to the numeric form in buildInterpretation.
const ORDINAL_WORDS = { 2: 'second', 3: 'third', 4: 'fourth', 5: 'fifth', 6: 'sixth' };

// ---------------------------------------------------------------------------
// Part 1: specific, data-referenced acknowledgement
// ---------------------------------------------------------------------------

/**
 * Names something real from THIS week: sessions trained, PRs set,
 * weigh-ins logged, or an answered check-in detail. Never generic
 * praise; every clause is a mirror of logged data, so it stays true
 * whatever the user does next. Returns null when there is genuinely
 * nothing to name (never fabricates).
 *
 * Under suppression (open ED flag or calm mode) weigh-in counts are not
 * surfaced, matching the COMP-023 trial banner rule.
 */
function buildAcknowledgement({ sessionsCompleted, sessionsPlanned, prsThisWeek, weighInsThisWeek, checkin, suppress }) {
  const completed = Number.isFinite(sessionsCompleted) ? sessionsCompleted : 0;
  const planned = Number.isFinite(sessionsPlanned) ? sessionsPlanned : 0;
  const prs = Number.isFinite(prsThisWeek) ? prsThisWeek : 0;
  const weighIns = Number.isFinite(weighInsThisWeek) ? weighInsThisWeek : null;

  const prClause = prs > 0 ? `, with ${prs} new PR${prs === 1 ? '' : 's'}` : '';

  let sessionSentence = null;
  if (planned > 0 && completed >= planned) {
    sessionSentence = planned === 1
      ? `Your planned session is in the log this week${prClause}.`
      : `All ${planned} sessions trained this week${prClause}.`;
  } else if (completed >= 1 && planned > 0) {
    sessionSentence = `${completed} of ${planned} sessions trained this week${prClause}.`;
  } else if (completed >= 1) {
    sessionSentence = `${plural(completed, 'session')} trained this week${prClause}.`;
  }

  // Weigh-ins ride along when the logging week was strong, or carry the
  // acknowledgement alone when there was no training. Never under
  // suppression: no weigh-in counts on top of an open flag.
  if (sessionSentence) {
    if (!suppress && weighIns != null && weighIns >= 5) {
      return clean(`${sessionSentence} ${weighIns} weigh-ins logged too.`);
    }
    return clean(sessionSentence);
  }

  if (!suppress && weighIns != null && weighIns >= 3) {
    return clean(`${plural(weighIns, 'weigh-in')} logged this week. Enough to read the trend from.`);
  }

  if (checkin) {
    const e = checkin.energyScore;
    if (e != null) {
      return clean(`Check-in logged. Energy came in at ${e} of 5.`);
    }
    return clean('Check-in logged.');
  }

  return null;
}

// ---------------------------------------------------------------------------
// Part 2: plain-language trend interpretation
// ---------------------------------------------------------------------------

/**
 * Counts how many weeks running the trend has been on target: this week
 * plus consecutive prior outputs (most recent first) whose saved trend
 * was on target.
 */
function onTargetStreak(currentOnTarget, history) {
  if (!currentOnTarget) return 0;
  let streak = 1;
  for (const entry of Array.isArray(history) ? history : []) {
    if (entry?.trend?.onTarget === true) streak += 1;
    else break;
  }
  return streak;
}

/**
 * Translates the trend numbers into meaning. Under suppression the rate
 * is dropped entirely and the copy goes direction-only, mirroring the
 * COMP-004 "Your trend" card's flagged branch.
 */
function buildInterpretation({ output, history, units, suppress }) {
  const trend = output?.trend ?? null;
  const delta = Number.isFinite(trend?.delta) ? trend.delta : null;

  if (suppress) {
    if (delta == null) return null;
    if (delta > 0.01) return clean('Your weight trend has been rising slightly.');
    if (delta < -0.01) return clean('Your weight trend has been drifting down.');
    return clean('Your weight has stayed broadly stable over the past few weeks.');
  }

  if (delta == null) {
    return clean('Not enough weigh-ins for a weekly trend read yet. The trend sharpens with daily logs.');
  }

  const u = units === 'lbs' ? 'lbs' : 'kg';
  const abs = Math.abs(delta);
  const lead = abs <= 0.01
    ? 'Your 7-day average is level with last week.'
    : `Your 7-day average is ${delta > 0 ? 'up' : 'down'} ${abs} ${u} on last week.`;

  let verdict;
  if (trend?.onTarget) {
    const streak = onTargetStreak(true, history);
    if (streak >= 2 && streak <= 6) {
      verdict = `That is the ${ORDINAL_WORDS[streak]} week running at the right rate.`;
    } else if (streak > 6) {
      verdict = `That is ${streak} weeks running at the right rate.`;
    } else {
      verdict = 'That is the rate this phase is set for.';
    }
  } else {
    verdict = 'That is off the set rate for this phase.';
  }

  return clean(`${lead} ${verdict}`);
}

// ---------------------------------------------------------------------------
// Part 3: the decision plus the reason (reuses existing decision data)
// ---------------------------------------------------------------------------

function buildDecision({ output }) {
  if (!output) return null;
  const heldDecisions = Array.isArray(output.heldDecisions) ? output.heldDecisions : [];

  // Safety holds lead and their locked reason strings are reused
  // verbatim; the rich held-decision card carries the full copy.
  const lockout = heldDecisions.find(d => d.type === 'ed_pattern_lockout');
  if (lockout?.reason) return clean(lockout.reason);

  const calories = output.adjustments?.calories ?? null;
  if (calories && Number.isFinite(calories.change) && calories.change !== 0) {
    const dir = calories.change > 0 ? 'up' : 'down';
    const call = `The call this week: calorie target ${dir} ${Math.abs(calories.change)} kcal.`;
    return clean(calories.note ? `${call} ${calories.note}` : call);
  }

  const heldCalories = heldDecisions.find(d => d.type === 'calories' || d.type === 'ffm_floor');
  if (heldCalories?.reason) return clean(heldCalories.reason);

  return output.whyThisWeek ? clean(output.whyThisWeek) : null;
}

// ---------------------------------------------------------------------------
// Part 4: one tactical cue for the week ahead
// ---------------------------------------------------------------------------

/**
 * Exactly one cue, picked by a deterministic priority order (highest
 * leverage first, mirroring the existing buildFocus ladder):
 *
 *   1. Thin weigh-in data       (skipped under suppression: no weight ask)
 *   2. Sleep flagged            (< 6.5 hours)
 *   3. Missed sessions
 *   4. Joint pain flagged
 *   5. Calories untracked       (skipped under suppression: the target is
 *                                not being tuned while a hold is open)
 *   6. Calorie adherence off    ('under' allowed under suppression because
 *                                it matches the safety copy "eat to the
 *                                target, not under it"; 'over' skipped:
 *                                no restraint push on top of an open flag)
 *   7. Default consistency line (safety-worded under suppression)
 */
function buildCue({ output, checkin, weighInsThisWeek, suppress }) {
  const trend = output?.trend ?? null;
  const delta = Number.isFinite(trend?.delta) ? trend.delta : null;
  const weighIns = Number.isFinite(weighInsThisWeek) ? weighInsThisWeek : null;
  const sessionsCompleted = Number.isFinite(output?.sessionsCompleted) ? output.sessionsCompleted : 0;
  const sessionsPlanned = Number.isFinite(output?.sessionsPlanned) ? output.sessionsPlanned : 0;
  const sleepHours = checkin?.sleepHours ?? null;
  const cals = checkin?.calsAdherence ?? null;

  // 1. Thin weigh-in data: without it nothing else can be read.
  if (!suppress && (delta == null || (weighIns != null && weighIns < 4))) {
    return clean('Log your morning weight each day this week. Every log sharpens the read.');
  }

  // 2. Sleep: the biggest single recovery lever.
  if (sleepHours != null && sleepHours < 6.5) {
    return clean('Sleep is the lever this week. Aim for 7 hours or more a night.');
  }

  // 3. Sessions.
  if (sessionsPlanned > 0 && sessionsCompleted < sessionsPlanned) {
    return clean(`Get all ${sessionsPlanned} sessions in this week. Consistency moves the plan more than any single change.`);
  }

  // 4. Joint pain.
  if (checkin?.jointPain) {
    return clean('Keep load off the sore joint this week. Swap any movement that aggravates it for a pain-free option.');
  }

  // 5. Untracked calories.
  if (!suppress && cals === 'untracked') {
    return clean('Log your food this week. The calorie target can only be tuned against real intake.');
  }

  // 6. Calorie adherence off target.
  if (cals === 'under') {
    return clean('Eat to the target this week, not under it. The plan is built on the target being hit.');
  }
  if (!suppress && cals === 'over') {
    return clean('Stay inside the calorie target this week. One steady week tells the plan more than a mixed one.');
  }

  // 7. Default.
  if (suppress) {
    return clean('Your work this week: keep logging, keep training, eat to the target, weigh in as normal.');
  }
  return clean('Keep the week the same: log, train, eat to the target, weigh in.');
}

// ---------------------------------------------------------------------------
// Part 5: forward pull
// ---------------------------------------------------------------------------

function buildForward({ output, weighInsThisWeek, checkinDayName, suppress }) {
  const opener = checkinDayName ? `See you ${checkinDayName}.` : 'See you at the next check-in.';

  if (suppress) {
    return clean(`${opener} The plan is reviewed again at the next weekly run.`);
  }

  const sessionsCompleted = Number.isFinite(output?.sessionsCompleted) ? output.sessionsCompleted : 0;
  const sessionsPlanned = Number.isFinite(output?.sessionsPlanned) ? output.sessionsPlanned : 0;
  const calorieChange = output?.adjustments?.calories?.change ?? 0;
  const delta = Number.isFinite(output?.trend?.delta) ? output.trend.delta : null;
  const weighIns = Number.isFinite(weighInsThisWeek) ? weighInsThisWeek : null;

  let tail;
  if (calorieChange !== 0) {
    tail = 'The next read checks the trend against the target again.';
  } else if (sessionsPlanned > 0 && sessionsCompleted < sessionsPlanned) {
    tail = 'Get the sessions in and the next read will show it.';
  } else if (delta == null || (weighIns != null && weighIns < 4)) {
    tail = 'Daily weigh-ins between now and then sharpen the read.';
  } else {
    tail = 'The next weekly read takes it from there.';
  }

  return clean(`${opener} ${tail}`);
}

// ---------------------------------------------------------------------------
// Part 6: the pre-commitment line + its next-week answer (S1c, "give the coach
// a memory"). The coach names, in advance, the specific thing the next read
// will check; the following week visibly answers it. Presentation only over
// data already persisted; deterministic. Both suppress under an open
// ED/wellbeing flag or calm mode (trend-response language is rate-adjacent).
// ---------------------------------------------------------------------------

/** This week's calorie call as { amount, direction }, or null when none. */
export function preCommitmentFacts(output) {
  const change = output?.adjustments?.calories?.change;
  if (!Number.isFinite(change) || change === 0) return null;
  return { amount: Math.abs(change), direction: change < 0 ? 'cut' : 'increase' };
}

/**
 * Whether LAST week's applied calorie call has been answered by THIS week's
 * trend, as { amount, direction, onTarget }, or null. Reuses the coachOutcome
 * pairing so this prose and the coaching-history outcome chip can never
 * disagree: null unless last week's calorie call was APPLIED, the two weeks are
 * calendar-consecutive (the pairing's own ~7-day window), and this week carries
 * a boolean trend verdict. Fails safe (null) when weekStartMs is unknown, so it
 * never mislabels a gap in history as "last week".
 */
export function commitmentOutcomeFacts({ output, history = [], weekStartMs } = {}) {
  if (!output || !Number.isFinite(weekStartMs)) return null;
  const prior = Array.isArray(history) ? history[0] : null;
  const priorChange = prior?.adjustments?.calories?.change;
  if (!Number.isFinite(priorChange) || priorChange === 0) return null;
  // Most-recent-first, with the current week stamped so the pairing can verdict
  // the prior week's applied call against this week's trend.
  const desc = [{ ...output, weekStart: weekStartMs }, ...(Array.isArray(history) ? history : [])];
  const pair = pairAppliedWithOutcome(desc).find(
    (p) => p.domain === 'calories' && p.verdictWeekStart === weekStartMs,
  );
  if (!pair) return null;
  return { amount: Math.abs(priorChange), direction: priorChange < 0 ? 'cut' : 'increase', onTarget: pair.onTarget };
}

function buildPreCommitment({ output, checkinDayName, suppress }) {
  if (suppress) return null;
  const facts = preCommitmentFacts(output);
  if (!facts) return null;
  const when = checkinDayName ? `Next ${checkinDayName}, the read` : 'The next read';
  return clean(`${when} checks whether the trend responds to this ${facts.amount} kcal ${facts.direction}.`);
}

function buildCommitmentAnswer({ output, history, weekStartMs, suppress }) {
  if (suppress) return null;
  const facts = commitmentOutcomeFacts({ output, history, weekStartMs });
  if (!facts) return null;
  const verdict = facts.onTarget
    ? 'The trend has responded, it is back on the set rate.'
    : 'The trend has not responded yet, it is still off the set rate.';
  return clean(`Last week's ${facts.amount} kcal ${facts.direction} was the call to watch. ${verdict}`);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Renders the five-part coach response from the weekly engine output.
 * Deterministic: the same inputs always produce the same strings.
 *
 * @param {object} args
 * @param {object|null} args.output            runWeeklyCoach result (or a persisted coach output row)
 * @param {object|null} args.checkin           weekly_checkins row (camelCase), or null
 * @param {Array}       args.history           previous coach outputs, most recent first, current week excluded
 * @param {number|null} args.weighInsThisWeek  morning weigh-ins logged in the displayed week
 * @param {string}      args.units             'kg' | 'lbs' (labelling only, mirrors weeklyCoach)
 * @param {boolean}     args.edFlagOpen        open ED/wellbeing pattern flag
 * @param {boolean}     args.calmMode          user asked for a calmer experience
 * @param {string|null} args.checkinDayName    'Sunday' etc, for the forward line
 * @returns {{ acknowledgement:?string, interpretation:?string, decision:?string,
 *             cue:?string, forward:?string, suppressed:boolean }}
 */
export function buildCoachResponse({
  output = null,
  checkin = null,
  history = [],
  weighInsThisWeek = null,
  units = 'kg',
  edFlagOpen = false,
  calmMode = false,
  checkinDayName = null,
  weekStartMs = null,
} = {}) {
  const suppress = !!edFlagOpen || !!calmMode;

  if (!output) {
    return {
      acknowledgement: null,
      interpretation: null,
      decision: null,
      cue: null,
      forward: null,
      preCommitment: null,
      commitmentAnswer: null,
      suppressed: suppress,
    };
  }

  const acknowledgement = buildAcknowledgement({
    sessionsCompleted: output.sessionsCompleted,
    sessionsPlanned: output.sessionsPlanned,
    prsThisWeek: output.prsThisWeek,
    weighInsThisWeek,
    checkin,
    suppress,
  });

  // Cold start: with not enough data the engine holds everything, so
  // the response shrinks rather than fabricating a trend or a decision.
  // The acknowledgement still names what was really logged, the cue
  // still points at the highest-leverage behaviour, and the forward
  // line still anchors the next check-in.
  if (output.hasEnoughData === false) {
    // Cold start: no calorie call and no trend verdict yet, so both S1c parts
    // are null rather than fabricated.
    return {
      acknowledgement,
      interpretation: null,
      decision: null,
      cue: buildCue({ output, checkin, weighInsThisWeek, suppress }),
      forward: buildForward({ output, weighInsThisWeek, checkinDayName, suppress }),
      preCommitment: null,
      commitmentAnswer: null,
      suppressed: suppress,
    };
  }

  return {
    acknowledgement,
    interpretation: buildInterpretation({ output, history, units, suppress }),
    decision: buildDecision({ output }),
    cue: buildCue({ output, checkin, weighInsThisWeek, suppress }),
    forward: buildForward({ output, weighInsThisWeek, checkinDayName, suppress }),
    preCommitment: buildPreCommitment({ output, checkinDayName, suppress }),
    commitmentAnswer: buildCommitmentAnswer({ output, history, weekStartMs, suppress }),
    suppressed: suppress,
  };
}

// ---------------------------------------------------------------------------
// Free-tier weekly one-liner (founder decision 4c, 2026-06-12)
// ---------------------------------------------------------------------------

/**
 * The single-sentence free version of the weekly read. Uses ONLY data a
 * free user has: completed training sessions plus any logged morning
 * weights. No calorie targets, no macros, no food data, no coaching
 * decision, and no Pro functionality. Direction-only on weight (no
 * rate, no figure, no units), so it can never conflict with the body
 * weight display unit and never surfaces a rate on top of an open flag.
 *
 * Returns null when there is nothing real to say (never fabricates).
 *
 * @param {object} args
 * @param {number}  args.sessionsThisWeek  completed sessions this week
 * @param {Array}   args.morningWeights    [{ weightKg, loggedAt }] recent window (e.g. last 14 days)
 * @param {boolean} args.edFlagOpen        open ED/wellbeing pattern flag
 * @param {boolean} args.calmMode          user asked for a calmer experience
 * @returns {?string}
 */
export function buildFreeCoachLine({
  sessionsThisWeek = 0,
  morningWeights = [],
  edFlagOpen = false,
  calmMode = false,
} = {}) {
  const suppress = !!edFlagOpen || !!calmMode;
  const sessions = Number.isFinite(sessionsThisWeek) ? Math.max(0, Math.round(sessionsThisWeek)) : 0;

  // Direction-only weight trend, suppressed entirely under a flag or
  // calm mode (training-only line instead), matching the COMP-023
  // trial banner's "no weight ask, no counts" rule.
  let weightSentence = null;
  if (!suppress && Array.isArray(morningWeights) && morningWeights.length >= 4) {
    const now = getLatestEwma(morningWeights);
    const prior = getEwmaSevenDaysAgo(morningWeights);
    if (now != null && prior != null) {
      const delta = now - prior;
      weightSentence = delta > 0.01
        ? 'Weight trend is up this week.'
        : delta < -0.01
          ? 'Weight trend is down this week.'
          : 'Weight trend is steady this week.';
    }
  }

  const sessionSentence = sessions > 0
    ? `${plural(sessions, 'session')} trained.`
    : null;

  if (weightSentence && sessionSentence) {
    return clean(`${weightSentence} ${sessionSentence}`);
  }
  if (weightSentence) return clean(weightSentence);
  if (sessionSentence) {
    return clean(`${plural(sessions, 'session')} trained this week.`);
  }
  return null;
}
