/**
 * src/lib/recovery/personalRecovery.js
 *
 * PERSONAL RECOVERY LEARNING (register D210). Founder, 2026-09-26: "We had
 * recovery intelligence that learns people's recovery and adjusts as it goes
 * along based on performance from a start. Is that what you've used for the
 * recovery section or have you used rudimentary numbers?"
 *
 * The D201 estimate (constants.js, muscleRecoveryModel.js) starts every
 * muscle from a research baseline, scaled by the session's sets, the
 * athlete's "How's your recovery?" answer, the week's RIR target, a block's
 * first week and the athlete's ratings. On its own it never learns: the same
 * session reads the same for everyone. The learners the app already had
 * (algorithms.computeAdaptiveLandmarks, learnedRange.js) learn how many SETS
 * a muscle takes, never how long it takes to recover. This module learns
 * that, per muscle and per person, from the one objective signal the app
 * records: how the athlete's lifts went when the muscle was trained again.
 *
 * THE EVIDENCE. An exposure is a completed session B that trained a muscle
 * as the PRIMARY mover of an exercise with a baseline: the exercise's most
 * recent earlier comparable session P inside PERSONAL_BASELINE_MAX_GAP_DAYS.
 * Per exercise, B's best estimated max (algorithms.sessionBestE1rm, the
 * app's one trend representative, over trend-eligible sets only) is set
 * against P's:
 *  - a DIP: below PERFORMANCE_DIP_RATIO of P's, or more missed working sets
 *    than P with no gain past E1RM_PROGRESS_MARGIN (the PR check's margin);
 *  - HELD: anything else (as good as P, or better).
 * The muscle's outcome in B is DIP when every such exercise dipped, HELD
 * when none did, and nothing when they disagree; its baseline is the most
 * recent of those exercises' baselines. Left out, because they cannot speak
 * to recovery:
 *  - a recovery (deload) week, as B or as a baseline: loads are lowered on
 *    purpose;
 *  - a baseline trained to a different RIR target from B's: a block's
 *    weeks step closer to failure (3, 2, 1, 0 reps in reserve), so the
 *    estimated max rises or falls by design between them, and per-set
 *    effort is not recorded to correct for it (the per-set RIR picker was
 *    removed so no effort is ever made up, D96/FQ-3). Only sessions trained
 *    to the same target, or two sessions outside any plan, are compared;
 *    the walk back skips the rest for an earlier comparable session.
 *    Counting only the outcome a mismatch cannot fake (a dip despite more
 *    effort, a hold despite less) was ruled out: keeping one kind of
 *    outcome and dropping the other would bias the fit;
 *  - circuit and ballistic sets (isTrendEligibleRow) and deleted sets;
 *  - a session under a capability episode for the muscle (an injury
 *    limit), the rule every other learning consumer follows (CC30); the
 *    caller passes those pairs as `excluded`;
 *  - B with no session on the muscle in the LOOKBACK_DAYS before it:
 *    there was nothing to recover from.
 *
 * WHAT IS CHECKED: THE CHANGE, NOT ONE READING. A lifter who always trains
 * a muscle at the same gap lifts at the same level each time whether they
 * recover fast or slowly (steady partial recovery looks exactly like full
 * recovery from one session to the next), so a single reading can never be
 * checked against performance. What CAN be checked is the change the
 * estimate predicts between the baseline and this session: if it reads
 * this session less recovered than the baseline it expects the lifts to
 * drop, and if it reads it at least as recovered it expects them to hold.
 * Sessions after short gaps set against sessions after long ones are where
 * a person's own recovery shows, and that is what the fit uses.
 *
 * THE FIT. For each candidate factor on PERSONAL_FACTOR_GRID the model
 * re-reads its own curve at the start of B and of its baseline, every
 * earlier session's recovery length computed with that factor in place of
 * the recovery answer's (constants.recoveryHours personalFactor), and adds
 * up the disagreements with what happened (DISAGREEMENT_COST), plus a cost
 * for moving away from the starting factor (PERSONAL_MOVE_COST_PER_TENTH
 * per ten per cent). The lowest total wins; a tie goes to the factor
 * nearest the start, then to the longer. So:
 *  - the start is the research figure shaped by the athlete's recovery
 *    answer (poor 1.15, average 1.0, good 0.9), and it stands until their
 *    sessions clearly beat it: fewer than PERSONAL_MIN_EXPOSURES exposures
 *    leave it untouched, and a single session can move it one 5% step at
 *    most;
 *  - on a steady schedule every candidate predicts the same change, so
 *    ordinary day-to-day dips cost the same everywhere and can never
 *    stretch or shrink anyone's estimate;
 *  - it shortens when lifts hold after gaps the estimate calls too short
 *    to recover, and lengthens when lifts dip after gaps it calls long
 *    enough. Someone whose sessions never test it keeps the starting
 *    estimate, and the screen says so.
 * Ratings keep their own role (feedbackFactor: they can only lengthen a
 * session). This learns from performance, the objective measure Ferreira
 * 2017 says must be combined with ratings, never swapped for them. Bounded
 * to [PERSONAL_FACTOR_MIN, PERSONAL_FACTOR_MAX]; every session length stays
 * clamped to [RECOVERY_HOURS_MIN, RECOVERY_HOURS_MAX].
 *
 * PURE. No I/O, no clock, no randomness. load.js replays it over the logged
 * sessions on every read, so nothing new is stored, the figure follows the
 * last PERSONAL_WINDOW_DAYS of training, and the same history always gives
 * the same answer (CLAUDE.md: the engine is deterministic).
 */
import {
  VOLUME_LANDMARKS, allocateExerciseVolume, sessionBestE1rm, isTrendEligibleRow, E1RM_PROGRESS_MARGIN,
} from '../algorithms';
import {
  LOOKBACK_DAYS, PERSONAL_WINDOW_DAYS, PERSONAL_BASELINE_MAX_GAP_DAYS, PERFORMANCE_DIP_RATIO,
  PERSONAL_MIN_EXPOSURES, PERSONAL_FACTOR_GRID, DISAGREEMENT_COST, PERSONAL_MOVE_COST_PER_TENTH,
  ratingFactor, recoveryHours,
} from './constants';
import { sessionMuscleLoads, readingAt } from './muscleRecoveryModel';

const DAY_MS = 24 * 60 * 60 * 1000;
const LOOKBACK_MS = LOOKBACK_DAYS * DAY_MS;
const WINDOW_MS = PERSONAL_WINDOW_DAYS * DAY_MS;
const BASELINE_GAP_MS = PERSONAL_BASELINE_MAX_GAP_DAYS * DAY_MS;
const LN_TENTH = Math.log(1.1);
const EPSILON = 1e-9;

// Readings in order. A baseline with no session on the muscle in the
// lookback before it was fully rested, so it ranks as Recovered.
const RANK = { recovering: 0, nearly: 1, recovered: 2 };
const rankOf = (status) => (status === null ? RANK.recovered : RANK[status]);

const isFlagSet = (v) => v === 1 || v === true;

/**
 * How far back load.js must read for the learner to see everything it uses:
 * the window, an exposure's baseline before it, and the lookback before
 * that baseline.
 */
export const PERSONAL_HISTORY_DAYS = PERSONAL_WINDOW_DAYS + PERSONAL_BASELINE_MAX_GAP_DAYS + LOOKBACK_DAYS;

/** The exercise's primary mover, by the one allocator the volume tracker uses. */
function primaryMuscleOf(exercise) {
  return allocateExerciseVolume(exercise).find((a) => a.role === 'primary')?.muscle ?? null;
}

/**
 * A working set that fell short: marked failed, or fewer reps than the
 * bottom of its target. An unrecorded rep count or target is not a miss
 * (Number(null) is 0, the trap constants.intensityFactor guards too).
 */
export function isMissedSet(set) {
  if (isFlagSet(set?.failed)) return true;
  const rawTarget = set?.targetRepsMin ?? set?.target_reps_min;
  const rawReps = set?.actualReps ?? set?.actual_reps;
  if (rawTarget === null || rawTarget === undefined || rawReps === null || rawReps === undefined) return false;
  const target = Number(rawTarget);
  const reps = Number(rawReps);
  return Number.isFinite(target) && target > 0 && Number.isFinite(reps) && reps < target;
}

/**
 * One session's lifts: { exerciseId -> { e1rm, missed, muscle } } over its
 * live, trend-eligible sets, keyed to each exercise's primary muscle.
 */
export function exercisePerformance(session, exerciseById) {
  const rowsByExercise = new Map();
  for (const set of Array.isArray(session?.sets) ? session.sets : []) {
    if (!set || (set.deletedAt !== null && set.deletedAt !== undefined)) continue;
    if (!isTrendEligibleRow(set)) continue;
    const exerciseId = set.exerciseId ?? set.exercise_id;
    if (!exerciseId) continue;
    if (!rowsByExercise.has(exerciseId)) rowsByExercise.set(exerciseId, []);
    rowsByExercise.get(exerciseId).push(set);
  }
  const out = new Map();
  for (const [exerciseId, rows] of rowsByExercise) {
    const muscle = primaryMuscleOf(exerciseById?.[exerciseId]);
    if (!muscle) continue;
    const e1rm = sessionBestE1rm(rows);
    if (!(e1rm > 0)) continue;
    out.set(exerciseId, { e1rm, missed: rows.filter(isMissedSet).length, muscle });
  }
  return out;
}

const hasTarget = (v) => v !== null && v !== undefined && v !== '' && Number.isFinite(Number(v));

/** B and P were trained to the same RIR target, or both outside any plan (no target on either). */
export function sameEffortTarget(sessionB, sessionP) {
  const rb = sessionB?.weekRirTarget;
  const rp = sessionP?.weekRirTarget;
  if (!hasTarget(rb) && !hasTarget(rp)) return true;
  return hasTarget(rb) && hasTarget(rp) && Number(rb) === Number(rp);
}

/** What one exposure costs a candidate, from its two readings (DISAGREEMENT_COST). */
function disagreement(outcome, statusB, statusP) {
  const drop = rankOf(statusP) - rankOf(statusB); // bands the estimate expects the lifts to fall
  if (outcome === 'held') {
    if (drop >= 2) return DISAGREEMENT_COST.heldWhenClearDropExpected;
    if (drop === 1) return DISAGREEMENT_COST.heldWhenSmallDropExpected;
    return 0;
  }
  return drop <= 0 ? DISAGREEMENT_COST.dipWhenNoDropExpected : 0;
}

/**
 * Every VOLUME_LANDMARKS muscle's learned recovery factor.
 *
 * @param {object} params
 * @param {Array<object>} params.sessions - completed sessions in the shape
 *   load.js builds ({ id, startedAt, endedAt, durationMinutes, sets,
 *   weekRirTarget, isFirstWeek, isDeload, ratings }), any order, covering
 *   PERSONAL_HISTORY_DAYS before nowMs.
 * @param {object} params.exerciseById
 * @param {string} [params.recoveryRating] - poor | average | good: the start.
 * @param {number} params.nowMs
 * @param {Set<string>} [params.excluded] - `${sessionId}|${muscle}` pairs
 *   trained under a capability episode for that muscle.
 * @returns {object} { [muscle]: { factor, prior, checked } } where checked
 *   is the number of sessions the estimate was checked against.
 */
export function learnPersonalRecovery({
  sessions, exerciseById, recoveryRating, nowMs, excluded = null,
} = {}) {
  const prior = ratingFactor(recoveryRating);
  const unlearned = () => Object.fromEntries(
    Object.keys(VOLUME_LANDMARKS).map((m) => [m, { factor: prior, prior, checked: 0 }]),
  );
  if (!Number.isFinite(nowMs)) return unlearned();

  const list = (Array.isArray(sessions) ? sessions : [])
    .filter((s) => s && Number.isFinite(Number(s.startedAt)))
    .slice()
    .sort((a, b) => Number(a.startedAt) - Number(b.startedAt));
  if (!list.length) return unlearned();

  const loads = sessionMuscleLoads(list, exerciseById);
  const perf = list.map((s) => exercisePerformance(s, exerciseById));
  const isExcluded = (session, muscle) => !!excluded && typeof excluded.has === 'function'
    && excluded.has(`${session.id}|${muscle}`);

  // The sessions that loaded each muscle at all (primary or secondary
  // credit): the curve's contributors, exactly as the live map counts them.
  const loadedBy = {};
  loads.forEach((load, i) => {
    for (const muscle of Object.keys(load.setsByMuscle)) {
      if (!(load.setsByMuscle[muscle] > 0)) continue;
      if (!loadedBy[muscle]) loadedBy[muscle] = [];
      loadedBy[muscle].push(i);
    }
  });

  // What the curve read for `muscle` the instant session `index` began, with
  // every earlier session's length computed with `factor`; null when no
  // session on the muscle ended inside LOOKBACK_DAYS before it.
  const statusCache = new Map();
  const statusAtStart = (muscle, index, factor) => {
    const key = `${muscle}|${index}|${factor}`;
    if (statusCache.has(key)) return statusCache.get(key);
    const atMs = Number(list[index].startedAt);
    const contributing = [];
    for (const j of loadedBy[muscle] ?? []) {
      if (j === index) continue;
      const load = loads[j];
      if (!(load.endMs <= atMs) || atMs - load.endMs > LOOKBACK_MS) continue;
      const earlier = list[j];
      const sets = load.setsByMuscle[muscle];
      contributing.push({
        endMs: load.endMs,
        sets,
        hoursT: recoveryHours(muscle, {
          sets,
          rirTarget: earlier.weekRirTarget,
          firstWeek: earlier.isFirstWeek,
          ratings: earlier.ratings,
          personalFactor: factor,
        }),
      });
    }
    let status = null;
    if (contributing.length) {
      contributing.sort((a, b) => a.endMs - b.endMs);
      status = readingAt(contributing, atMs).status;
    }
    statusCache.set(key, status);
    return status;
  };

  // The exposures, per muscle: { index (B), baseline (P), outcome }.
  const windowStartMs = nowMs - WINDOW_MS;
  const exposures = {};
  for (let b = 0; b < list.length; b += 1) {
    const sessionB = list[b];
    const startB = Number(sessionB.startedAt);
    if (startB < windowStartMs || startB > nowMs) continue;
    if (isFlagSet(sessionB.isDeload)) continue;
    const byMuscle = new Map();
    for (const [exerciseId, lift] of perf[b]) {
      const { muscle } = lift;
      if (isExcluded(sessionB, muscle)) continue;
      // The exercise's most recent earlier comparable session, inside the
      // baseline gap.
      let p = -1;
      for (let j = b - 1; j >= 0; j -= 1) {
        const sessionP = list[j];
        if (Number(sessionP.startedAt) < startB - BASELINE_GAP_MS) break;
        if (!perf[j].has(exerciseId)) continue;
        if (isFlagSet(sessionP.isDeload) || isExcluded(sessionP, muscle)) continue;
        if (!sameEffortTarget(sessionB, sessionP)) continue;
        p = j;
        break;
      }
      if (p < 0) continue;
      const baseline = perf[p].get(exerciseId);
      const ratio = lift.e1rm / baseline.e1rm;
      const dipped = ratio < PERFORMANCE_DIP_RATIO
        || (lift.missed > baseline.missed && ratio < E1RM_PROGRESS_MARGIN);
      if (!byMuscle.has(muscle)) byMuscle.set(muscle, { verdicts: new Set(), baseline: -1 });
      const entry = byMuscle.get(muscle);
      entry.verdicts.add(dipped ? 'dip' : 'held');
      entry.baseline = Math.max(entry.baseline, p);
    }
    for (const [muscle, { verdicts, baseline }] of byMuscle) {
      if (verdicts.size !== 1) continue; // one lift held, another dipped: no clear answer
      if (statusAtStart(muscle, b, prior) === null) continue; // nothing to recover from
      if (!exposures[muscle]) exposures[muscle] = [];
      exposures[muscle].push({ index: b, baseline, outcome: verdicts.has('dip') ? 'dip' : 'held' });
    }
  }

  const candidates = Array.from(new Set([...PERSONAL_FACTOR_GRID, prior]));
  const fit = (muscle, muscleExposures) => {
    if (muscleExposures.length < PERSONAL_MIN_EXPOSURES) return prior;
    let best = null;
    for (const k of candidates) {
      const distance = Math.abs(Math.log(k / prior));
      let cost = PERSONAL_MOVE_COST_PER_TENTH * (distance / LN_TENTH);
      for (const e of muscleExposures) {
        cost += disagreement(e.outcome, statusAtStart(muscle, e.index, k), statusAtStart(muscle, e.baseline, k));
      }
      const better = !best
        || cost < best.cost - EPSILON
        || (Math.abs(cost - best.cost) <= EPSILON
          && (distance < best.distance - EPSILON
            || (Math.abs(distance - best.distance) <= EPSILON && k > best.k)));
      if (better) best = { k, cost, distance };
    }
    return best.k;
  };

  const out = {};
  for (const muscle of Object.keys(VOLUME_LANDMARKS)) {
    const muscleExposures = exposures[muscle] ?? [];
    out[muscle] = { factor: fit(muscle, muscleExposures), prior, checked: muscleExposures.length };
  }
  return out;
}

/**
 * The learned figure against its start, in one word the screen can use:
 * 'sooner' (shorter than the starting estimate), 'later' (longer), 'same'
 * (checked, and the starting estimate still fits best), or 'not_yet' (too
 * few sessions to check against).
 */
export function personalDirection(personal) {
  if (!personal || !(personal.checked >= PERSONAL_MIN_EXPOSURES)) return 'not_yet';
  if (personal.factor < personal.prior - EPSILON) return 'sooner';
  if (personal.factor > personal.prior + EPSILON) return 'later';
  return 'same';
}
