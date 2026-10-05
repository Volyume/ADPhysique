/**
 * src/lib/recovery/planPersonalisation.js
 *
 * WHAT THE PLANNER MAY BE TOLD ABOUT THIS PERSON (D219, design 4.6 and 4.13,
 * docs/audit/plan-builder-science-2026-10-04/00-AUDIT-AND-PLAN.md; evidence
 * 03-SCIENCE.md Q11 and F14). Two pure answers, handed to the planner as inputs
 * at a build, a rebuild and a block boundary, never mid-block:
 *
 *  - plannerLearnedFactor: the personal learner's factor (personalRecovery.js,
 *    D210), through S F14's safeguards. It acts only when the learner's own gate
 *    has passed, the person has 12 weeks or more of history and 3 or more muscles
 *    contribute, and the factor has moved at least 0.10 from the value the
 *    current plan was built on (otherwise the plan keeps that value, so its
 *    structure is kept). It reverts when the evidence fades: a gate that fails at
 *    the next evaluation, or a factor back within 0.05 of the start, gives the
 *    start (null), so nothing is carried silently. Bounded 0.75 to 1.40. What the
 *    planner then does with it is bounded too (planner.js): it scales the clocks
 *    that order the rotation and shows the readiness, and never changes a weekly
 *    target, calories, weight, food or notifications (design 4.13).
 *  - ownGapsFromHistory: the median hours the person leaves after each slot of
 *    their rotation, once they have logged 8 or more sessions in the last 8
 *    weeks; a slot needs 3 logged gaps, otherwise their median gap between any
 *    two sessions stands for it (design 4.6).
 *
 * The factor reaches the learner's output only through load.js
 * (loadPlanPersonalisation), the recovery domain's one I/O file; the planner
 * gets plain numbers. PURE: no I/O, no clock read (the caller hands over
 * `nowMs`), no randomness; the same history gives the same answer and the order
 * of the sessions does not matter (CLAUDE.md: the engine is deterministic).
 */
import { LEARNED_FACTOR, ROTATION } from '../plan/science';

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;
// Grid steps are floating point (1.1 - 1.0 is 0.10000000000000009, 0.95 - 0.9 is
// 0.04999999999999993): a threshold met "exactly" must count as met.
const EPS = 1e-6;
// S F14: a factor back within this of the start reverts to the start.
const REVERT_WITHIN = 0.05;

const isNum = (v) => typeof v === 'number' && Number.isFinite(v);

/**
 * The factor the planner is given, or null when the start stands.
 *
 * @param {object} args
 * @param {?object} args.personal   learnPersonalRecovery's reading
 *        { factor, prior, reason, pairsByMuscle }
 * @param {number} args.historyDays  days from the person's first completed
 *        workout to now
 * @param {?number} [args.builtOnFactor]  the factor the current plan was built on
 *        (the plan facts' builtFactor), null when it was built on the start
 * @returns {{ factor: ?number, reason: 'learned'|'unchanged'|'not_adjusted'|'history'|'muscles'|'reverted' }}
 */
export function plannerLearnedFactor({ personal, historyDays, builtOnFactor = null } = {}) {
  if (!personal || personal.reason !== 'adjusted') return { factor: null, reason: 'not_adjusted' };
  const learned = personal.factor;
  const prior = personal.prior;
  if (!isNum(learned) || !isNum(prior)) return { factor: null, reason: 'not_adjusted' };
  if (!(isNum(historyDays) && historyDays >= LEARNED_FACTOR.minHistoryWeeks * 7)) return { factor: null, reason: 'history' };
  const muscles = Object.keys(personal.pairsByMuscle && typeof personal.pairsByMuscle === 'object' ? personal.pairsByMuscle : {}).length;
  if (muscles < LEARNED_FACTOR.minMuscles) return { factor: null, reason: 'muscles' };
  if (Math.abs(learned - prior) < REVERT_WITHIN - EPS) return { factor: null, reason: 'reverted' };
  const builtOn = isNum(builtOnFactor) ? builtOnFactor : null;
  const reference = builtOn !== null ? builtOn : prior;
  if (Math.abs(learned - reference) < LEARNED_FACTOR.minMove - EPS) return { factor: builtOn, reason: 'unchanged' };
  return { factor: Math.min(LEARNED_FACTOR.max, Math.max(LEARNED_FACTOR.min, learned)), reason: 'learned' };
}

function median(values) {
  const sorted = values.slice().sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * The person's own median gap, in hours, after each slot of a rotation of
 * `sessionsPerWeek` sessions, or null when it is not known.
 *
 * @param {object} args
 * @param {Array<{startedAt: number, slot: ?number}>} args.sessions  completed
 *        workouts; `slot` is the position (0 to sessionsPerWeek - 1) of the
 *        session in the person's rotation, null for one that has none (an ad hoc
 *        workout, another plan): it still counts toward the overall median
 * @param {number} args.sessionsPerWeek
 * @param {number} args.nowMs
 * @returns {?number[]} one entry per slot, each a positive number of hours
 */
export function ownGapsFromHistory({ sessions, sessionsPerWeek, nowMs } = {}) {
  const n = Math.round(Number(sessionsPerWeek));
  if (!(n >= 2) || !isNum(nowMs)) return null;
  const windowStart = nowMs - ROTATION.ownGapsWindowWeeks * WEEK_MS;
  const list = (Array.isArray(sessions) ? sessions : [])
    .filter((s) => s && isNum(Number(s.startedAt)) && Number(s.startedAt) >= windowStart && Number(s.startedAt) <= nowMs)
    .map((s) => ({ startedAt: Number(s.startedAt), slot: Number.isInteger(s.slot) ? s.slot : null }))
    .sort((a, b) => a.startedAt - b.startedAt);
  if (list.length < ROTATION.ownGapsMinSessions) return null;

  const gaps = [];
  for (let i = 0; i < list.length - 1; i += 1) {
    const hours = (list[i + 1].startedAt - list[i].startedAt) / HOUR_MS;
    if (hours > 0) gaps.push({ slot: list[i].slot, hours });
  }
  if (gaps.length === 0) return null;
  const overall = median(gaps.map((g) => g.hours));
  const out = [];
  for (let slot = 0; slot < n; slot += 1) {
    const mine = gaps.filter((g) => g.slot === slot).map((g) => g.hours);
    out.push(mine.length >= ROTATION.ownGapsMinPerSlot ? median(mine) : overall);
  }
  return out.every((h) => isNum(h) && h > 0) ? out : null;
}
