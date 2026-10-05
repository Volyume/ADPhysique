/**
 * src/lib/recovery/personalRecovery.js
 *
 * PERSONAL RECOVERY LEARNING (register D210; spec
 * docs/recovery-programme-2026-09-25/14-PERSONAL-LEARNING-V2.md, which this
 * file implements section by section). Founder, 2026-09-26: "We had recovery
 * intelligence that learns people's recovery and adjusts as it goes along
 * based on performance from a start."
 *
 * The D201 estimate (constants.js, muscleRecoveryModel.js) starts every
 * muscle from a research baseline, stretched or shrunk by the athlete's own
 * recovery answer, and on its own never learns. This module learns how far
 * that answer's factor should really be, from how the athlete's lifts
 * actually went, and moves only when the evidence is clear. The first build
 * of this idea was withdrawn after its adversarial review (D210 addendum);
 * every rule below answers one of that review's findings.
 *
 * ONE FACTOR PER PERSON (D210 addendum 2, from the calibration simulation).
 * The recovery answer the learning starts from is one factor for the whole
 * person, and what the lifts can show about recovery time is small against
 * day-to-day noise: learned muscle by muscle, twelve weeks of training found
 * a slow recoverer for at most 14 of 60 simulated athletes per muscle, and a
 * fast one almost never. Pooled across the person's lifts, with each muscle
 * keeping its own drift and sensitivity, the same weeks carry several times
 * the evidence. So the learned figure is the person's own recovery speed,
 * taking the answer's place for every muscle.
 *
 * EVIDENCE (spec section 2). A pair is a completed session B and the most
 * recent earlier COMPARABLE session P of the same exercise X ON THE SAME DAY
 * OF THE WEEK (D210 addendum 3: a person can be stronger on some weekdays,
 * and on a fixed weekly schedule the break before a session is set by its
 * weekday, so comparing across weekdays read weekday strength as recovery;
 * on the same weekday it cancels): inside PERSONAL_BASELINE_MAX_GAP_DAYS;
 * the same effort target (both week RIR targets known and equal, or both
 * sessions outside any plan; a session whose plan week did not resolve is
 * never comparable) or, D219 (design 4.13, founder answer Q4), both inside
 * plans with different known targets, in which case each session's sets are
 * read at the effort the plan asked of them (see "ACROSS PLAN WEEKS" below);
 * neither in a recovery week; neither under an injury
 * limit for X's primary muscle nor inside its 14-day return period (the
 * caller's `excluded`, built with capability/eligibility's
 * constrainedMusclesInWindow). X must be load-based strength: never an
 * assisted exercise (the entered number is assistance) nor a timed or
 * distance one (the columns hold seconds and metres). Only STRAIGHT working
 * sets count (no warm-up, drop, AMRAP, myo-rep, rest-pause, ballistic or
 * circuit rows: each measures a different effort). B needs a session on X's
 * primary muscle inside LOOKBACK_DAYS before it: with nothing to recover
 * from, a pair says nothing about recovery.
 *
 * REPS THAT NEVER CHANGE (D210 addendum 3). The logging screen fills in the
 * prescribed reps and load, and a person who logs them as given, or trains
 * a fixed 5 x 5, records what was planned rather than how the day went: a
 * tired day and a fresh one read the same, and the fit then reads the
 * missing drops as fast recovery. So a lift whose pairs mostly repeat the
 * same reps set for set (PERSONAL_MAX_FIXED_REPS_SHARE) teaches nothing and
 * is left out; when that leaves too few pairs, the reason says so
 * ('fixed_reps').
 *
 * ACROSS PLAN WEEKS (D219, design 4.13, founder answer Q4: "Extend it,
 * safety-tested"). A plan's effort target changes from week to week (the
 * block's stored ladder, 3, 2, 2, 1, 1 and a recovery week at 4 for a new
 * block), so comparing only equal targets left nobody on a plan with a pair
 * to learn from (0 of 60 simulated plan users). Two sessions of the same lift
 * on the same weekday in different plan weeks now pair even when their
 * targets differ, and each comparison is adjusted for the planned difference
 * in effort: both sessions' sets are read as the estimated max the plan's
 * reps in reserve imply (reps plus the week's RIR target), which is the same
 * ability whatever the week asked. Pairs at one target are read exactly as
 * before. A pair needs both targets known: a session outside a plan never
 * pairs with one inside. The adjustment is the plan's, not the person's: a
 * set stopped earlier or later than planned stays noise, as it always was.
 * This ships only because the calibration simulation, run with the new ladder
 * and the one running blocks still carry, holds every cell inside its pinned
 * bounds (personalRecovery.simulation.test.js).
 *
 * PAIRING BY SLOT WHEN THE WEEKDAYS DO NOT SET THE GAP (D219, learner design
 * 06-LEARNER-SIGNAL-DESIGN.md section 2.3, founder answer 2026-10-05). The
 * same-weekday rule above exists because on a weekly schedule the weekday
 * sets the break; where it does not, the rule throws away most of a person's
 * comparisons. weekdayGapCoupling reads the person's own session gaps, and
 * only when the weekday of a session explains almost none of the gap before
 * it (constants.js PERSONAL_SLOT_MAX_COUPLING) is the baseline the lift's
 * previous session whenever it fell (at least 12 hours earlier, inside the
 * same 28-day gap). A fixed or habitual schedule, one whose weekend mostly
 * sets the gaps, and a history too short to tell all keep the weekday rule
 * exactly as it was. The calibration simulation holds every promise with the
 * guard open and with it shut (its cells for each kind of schedule).
 *
 * WHICH SETS ARE MEASUREMENTS (D219, same design, candidate C). The logging
 * screen fills in the prescribed weight and reps, and a person who logs them as
 * given records the plan, not the day. A set may now say which it was:
 * `entryTyped` 1 (the person typed a value) or 0 (kept as filled in); absent or
 * null, which every set logged before the flag existed is, reads exactly as it
 * did. A set kept as filled in is not a measurement: it is left out, and a
 * comparison reads only the set positions typed in BOTH sessions (the index
 * must compare the same sets, not the first sets of one and the last of the
 * other); a comparison with no such position is counted with the lifts logged
 * as planned. The rule above that leaves out a lift whose reps repeat is
 * unchanged, and applies to what is left: a person who retypes the plan is
 * still logging the plan.
 *
 * THE DAY'S FORM (D219, same design, candidate E). The start sheet's sleep and
 * energy chips enter each comparison as a covariate, y = a + g * days + s * x
 * + b * (chips at B minus chips at P), b held between 0 and
 * PERSONAL_DAY_EFFECT_MAX a chip step (constants.js says why), one b for the
 * person, fitted at each candidate. A comparison without both chips, or a
 * history with fewer than PERSONAL_DAY_EFFECT_MIN_PAIRS of them, is read
 * exactly as before. Soreness is never a covariate.
 *
 * ONE CURVE (D219, same design, section 2.4). A candidate's recovery curve
 * carries the same session terms the clock the person sees carries (novelty,
 * long length, mostly indirect: muscleRecoveryModel.sessionMuscleTerms), so
 * the curve the learner fits at a factor is the clock buildMuscleRecoveryMap
 * draws at that factor (recoveryCurve; pinned).
 *
 * OUTCOME (section 3). y = ln(PI_B / PI_P), where PI is the mean estimated
 * max (algorithms.calculate1RM) of the first k working sets of X in each
 * session, k = min(PERSONAL_MATCHED_SETS, sets in B, sets in P): matched set
 * counts compare like with like, and the first sets reflect the ability to
 * repeat effort, the quality that recovers last (Ferreira 2017). Continuous:
 * no thresholds, no missed-set counts. A pair whose change is past
 * PERSONAL_MAX_CHANGE is not a recovery signal and is left out.
 *
 * MODEL (section 4). For a candidate factor f, the model's own curve gives
 * the recovered fraction of X's primary muscle at the start of B and of P,
 * and x = r_B(f) - r_P(f). Performance is modelled per muscle as
 * y = a + g * days + s * x, with the drift between the sessions (mostly
 * progression: a, and g per day between them, D210 addendum 2) fitted and
 * s (how much performance the muscle loses from fully fatigued to fully
 * recovered) held to [PERFORMANCE_SENSITIVITY_MIN,
 * PERFORMANCE_SENSITIVITY_MAX]: a candidate that predicts a drop the lifts
 * never show must pay for it. The per-day drift matters: a lifter who is
 * still gaining gains more over a longer break, and without it that gain
 * reads as recovery (in simulation, fast-progressing beginners on a varied
 * schedule were shown "slower" 5 times in 60). A candidate's error is the
 * sum over muscles.
 *
 * DECISION (section 5). The candidate on PERSONAL_FACTOR_GRID with the least
 * squared error is used only when there are at least PERSONAL_MIN_PAIRS
 * pairs, the pairs sit at different predicted recovery (the pooled standard
 * deviation of x at least PERSONAL_MIN_SPREAD for some candidate; a steady
 * schedule carries no information, by construction), and
 * pairs x ln(SSE(start) / SSE(best)) is at least PERSONAL_LR_MIN, the gate
 * the calibration simulation sets (personalRecovery.simulation.test.js).
 * Otherwise the start stands and the reason is recorded: 'too_few',
 * 'no_spread' or 'not_clear'.
 *
 * PURE. No I/O, no clock, no randomness: the same history gives the same
 * answer (CLAUDE.md: the engine is deterministic). load.js reads the history
 * and keeps a daily memo of the result.
 */
import { allocateExerciseVolume, calculate1RM, isTrendEligibleRow } from '../algorithms';
import {
  LOOKBACK_DAYS, PERSONAL_WINDOW_DAYS, PERSONAL_BASELINE_MAX_GAP_DAYS, PERSONAL_MATCHED_SETS,
  PERSONAL_FACTOR_GRID, PERFORMANCE_SENSITIVITY_MIN, PERFORMANCE_SENSITIVITY_MAX,
  PERSONAL_MIN_PAIRS, PERSONAL_MIN_MUSCLE_PAIRS, PERSONAL_MIN_SPREAD, PERSONAL_LR_MIN,
  PERSONAL_MAX_CHANGE, PERSONAL_MAX_FIXED_REPS_SHARE, ratingFactor, recoveryHoursAcross,
  PERSONAL_SLOT_MAX_COUPLING, PERSONAL_SLOT_MIN_GAPS, PERSONAL_SLOT_MIN_GAP_HOURS, PERSONAL_SLOT_MAX_GAP_HOURS,
  PERSONAL_DAY_EFFECT_MAX, PERSONAL_DAY_EFFECT_STEPS, PERSONAL_DAY_EFFECT_MIN_PAIRS,
} from './constants';
import { sessionMuscleLoads, sessionMuscleTerms, recoveredFractionsAt } from './muscleRecoveryModel';

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const LOOKBACK_MS = LOOKBACK_DAYS * DAY_MS;
const WINDOW_MS = PERSONAL_WINDOW_DAYS * DAY_MS;
const BASELINE_GAP_MS = PERSONAL_BASELINE_MAX_GAP_DAYS * DAY_MS;
const EPSILON = 1e-12;
// Two sessions on the same weekday are either on the same day (hours apart)
// or a week or more apart; three days tells them apart across any clock change.
const EARLIER_WEEK_MS = 3 * DAY_MS;
// When the weekdays do not set the gap (weekdayGapCoupling), a baseline is any
// earlier session of the lift that is not a second session the same day.
const SAME_DAY_MS = PERSONAL_SLOT_MIN_GAP_HOURS * HOUR_MS;
const NON_LOAD_TYPES = new Set(['distance', 'duration']);

/** How far back load.js must read: the window, a pair's baseline gap, and the curve's lookback before that. */
export const PERSONAL_HISTORY_DAYS = PERSONAL_WINDOW_DAYS + PERSONAL_BASELINE_MAX_GAP_DAYS + LOOKBACK_DAYS;

const isFlagSet = (v) => v === 1 || v === true;
/** The session's local day of the week (0 Sunday to 6 Saturday): a pure
 * conversion of the given instant, never a clock read. */
const weekdayOf = (ms) => new Date(Number(ms)).getDay();
/** The session's local calendar day, as a key: a pure conversion, never a clock read. */
const localDayOf = (ms) => {
  const d = new Date(Number(ms));
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
};
const hasTarget = (v) => v !== null && v !== undefined && v !== '' && Number.isFinite(Number(v));

/** Load-based strength: not assisted, not timed, not distance. */
export function isLoadStrengthExercise(exercise) {
  if (!exercise) return false;
  if ((exercise.loadSemantics ?? exercise.load_semantics) === 'assisted') return false;
  return !NON_LOAD_TYPES.has(exercise.exerciseType ?? exercise.exercise_type);
}

/** The exercise's primary mover, by the one allocator the volume tracker uses. */
function primaryMuscleOf(exercise) {
  return allocateExerciseVolume(exercise).find((a) => a.role === 'primary')?.muscle ?? null;
}

/**
 * B and P were trained to the same effort: both week RIR targets known and
 * equal, or both sessions outside any plan. A session whose plan week did not
 * resolve (`weekStatus === 'unresolved'`) is never comparable: its effort is
 * unknown.
 */
export function sameEffortTarget(sessionB, sessionP) {
  if (sessionB?.weekStatus === 'unresolved' || sessionP?.weekStatus === 'unresolved') return false;
  const rb = sessionB?.weekRirTarget;
  const rp = sessionP?.weekRirTarget;
  if (!hasTarget(rb) && !hasTarget(rp)) return true;
  return hasTarget(rb) && hasTarget(rp) && Number(rb) === Number(rp);
}

/**
 * How two sessions' effort compares (D219, design 4.13): 'same' (both targets
 * known and equal, or both outside any plan: read as ever), 'adjusted' (both
 * known and different: each session's sets are read at the effort the plan
 * asked of it, see meanFirstAtPlannedEffort), or null (never comparable: a
 * session whose plan week did not resolve, or one inside a plan and one not).
 */
export function effortComparison(sessionB, sessionP) {
  if (sessionB?.weekStatus === 'unresolved' || sessionP?.weekStatus === 'unresolved') return null;
  const rb = sessionB?.weekRirTarget;
  const rp = sessionP?.weekRirTarget;
  if (!hasTarget(rb) && !hasTarget(rp)) return 'same';
  if (!hasTarget(rb) || !hasTarget(rp)) return null;
  return Number(rb) === Number(rp) ? 'same' : 'adjusted';
}

/**
 * The primary mover of a load-strength exercise, or null. `cache` (a Map by
 * exercise id) keeps the answer for the rest of one learner run, so the
 * allocator reads each exercise once rather than once per session.
 */
function liftMuscle(exerciseId, exerciseById, cache) {
  if (cache && cache.has(exerciseId)) return cache.get(exerciseId);
  const exercise = exerciseById?.[exerciseId];
  const muscle = isLoadStrengthExercise(exercise) ? primaryMuscleOf(exercise) : null;
  if (cache) cache.set(exerciseId, muscle);
  return muscle;
}

/**
 * Did the person type this set's weight or reps (1), or keep what the logging
 * screen filled in (0)? null when the set does not say, which every set logged
 * before the flag existed does not: such a set is read as a measurement, as it
 * always was. An absent value is checked before it is read as a number
 * (Number(null) is 0, which would read every unflagged set as kept as filled
 * in).
 */
export function entryTypedOf(set) {
  const v = set?.entryTyped ?? set?.entry_typed;
  if (v === null || v === undefined || v === '') return null;
  if (v === 1 || v === true || v === '1') return 1;
  if (v === 0 || v === false || v === '0') return 0;
  return null;
}

/**
 * How the person walked into a session, from the start sheet's two chips, as
 * one number: the mean of the answered chips, each measured from OK (3), so a
 * poor night reads -1 and a good one +1 (Poor 2, OK 3, Good 4; Low 2, OK 3,
 * High 4). null when neither chip was answered. An unanswered chip is checked
 * before it is read as a number (Number(null) is 0, which would read a skipped
 * chip as the worst answer), and a value outside the sheet's 1 to 5 domain is
 * not an answer.
 */
export function walkInScore(session) {
  const chips = session?.walkedIn;
  if (!chips) return null;
  let sum = 0;
  let n = 0;
  for (const raw of [chips.sleep, chips.energy]) {
    if (raw === null || raw === undefined || raw === '') continue;
    const v = Number(raw);
    if (!Number.isFinite(v) || v < 1 || v > 5) continue;
    sum += v - 3;
    n += 1;
  }
  return n ? sum / n : null;
}

/**
 * One session's eligible working sets per load-strength exercise, in set
 * order: Map exerciseId -> { muscle, e1rms: number[], reps: number[],
 * weights: number[], typed: Array<1|0|null> }.
 * Straight sets only (see the header). `cache`: see liftMuscle.
 */
export function sessionLifts(session, exerciseById, cache = null) {
  const rowsByExercise = new Map();
  for (const set of Array.isArray(session?.sets) ? session.sets : []) {
    if (!set || (set.deletedAt !== null && set.deletedAt !== undefined)) continue;
    if (!isTrendEligibleRow(set)) continue;
    if ((set.setType ?? set.set_type ?? 'straight') !== 'straight') continue;
    const exerciseId = set.exerciseId ?? set.exercise_id;
    if (!exerciseId) continue;
    const weight = Number(set.weight);
    const reps = Number(set.actualReps ?? set.actual_reps);
    if (!(weight > 0) || !(reps > 0)) continue;
    if (!rowsByExercise.has(exerciseId)) rowsByExercise.set(exerciseId, []);
    rowsByExercise.get(exerciseId).push(set);
  }
  const out = new Map();
  for (const [exerciseId, rows] of rowsByExercise) {
    const muscle = liftMuscle(exerciseId, exerciseById, cache);
    if (!muscle) continue;
    const ordered = rows.slice().sort((a, b) => {
      const na = Number(a.setNumber ?? a.set_number);
      const nb = Number(b.setNumber ?? b.set_number);
      if (Number.isFinite(na) && Number.isFinite(nb) && na !== nb) return na - nb;
      return (Number(a.createdAt ?? a.created_at) || 0) - (Number(b.createdAt ?? b.created_at) || 0);
    });
    out.set(exerciseId, {
      muscle,
      e1rms: ordered.map((s) => calculate1RM(Number(s.weight), Number(s.actualReps ?? s.actual_reps))),
      reps: ordered.map((s) => Number(s.actualReps ?? s.actual_reps)),
      weights: ordered.map((s) => Number(s.weight)),
      // 1 typed, 0 kept as filled in, null unknown (read as a measurement, as ever).
      typed: ordered.map(entryTypedOf),
    });
  }
  return out;
}

/**
 * The mean of the values at the given set positions, added in position order.
 * With every one of the first k positions (the usual case: no set says it was
 * kept as filled in) this is the mean of the first k values, to the bit.
 */
function meanAt(values, positions) {
  let sum = 0;
  for (const i of positions) sum += values[i];
  return sum / positions.length;
}

/**
 * The mean estimated max at the given set positions with each set's reps
 * raised by the plan's reps in reserve for that session: the estimated max at
 * the effort the week asked of the set (D219, across plan weeks), so sessions
 * planned at different efforts read as the same ability when the person's day
 * was the same. Used only for a pair whose targets differ (effortComparison).
 */
function meanAtPlannedEffort(lift, reserve, positions) {
  let sum = 0;
  for (const i of positions) sum += calculate1RM(lift.weights[i], lift.reps[i] + reserve);
  return sum / positions.length;
}

/**
 * The part of `values` that the drift model does not explain: the residuals
 * of a least-squares line in the days between the two sessions (an
 * intercept and a per-day slope). Progression is a gain per unit of time,
 * so over a longer break it is larger; removing it here keeps strength
 * gained over a long gap from reading as recovery.
 */
export function residualOnDays(values, days) {
  const n = values.length;
  let mv = 0;
  let md = 0;
  for (let i = 0; i < n; i += 1) { mv += values[i]; md += days[i]; }
  mv /= n;
  md /= n;
  let sdd = 0;
  let sdv = 0;
  for (let i = 0; i < n; i += 1) {
    sdd += (days[i] - md) ** 2;
    sdv += (days[i] - md) * (values[i] - mv);
  }
  const slope = sdd > EPSILON ? sdv / sdd : 0;
  return values.map((v, i) => v - mv - slope * (days[i] - md));
}

/**
 * The best sensitivity for a candidate, held to its bounds, and the squared
 * error that leaves: y = a + s * x fitted by least squares with s clamped
 * (a re-solved for the clamped s). `sxx` is the spread of x about its mean.
 * Given residuals from residualOnDays for both x and y, this is the fit of
 * y = a + g * days + s * x (the Frisch-Waugh-Lovell theorem: the drift terms
 * profile out, and the error is still a convex quadratic in s, so clamping
 * the free optimum is the bounded optimum).
 */
export function boundedFit(xs, ys) {
  const n = xs.length;
  let mx = 0;
  let my = 0;
  for (let i = 0; i < n; i += 1) { mx += xs[i]; my += ys[i]; }
  mx /= n;
  my /= n;
  let sxx = 0;
  let sxy = 0;
  let syy = 0;
  for (let i = 0; i < n; i += 1) {
    const dx = xs[i] - mx;
    const dy = ys[i] - my;
    sxx += dx * dx;
    sxy += dx * dy;
    syy += dy * dy;
  }
  const free = sxx > EPSILON ? sxy / sxx : PERFORMANCE_SENSITIVITY_MIN;
  const s = Math.min(PERFORMANCE_SENSITIVITY_MAX, Math.max(PERFORMANCE_SENSITIVITY_MIN, free));
  const sse = Math.max(0, syy - 2 * s * sxy + s * s * sxx);
  return { s, sse, sxx };
}

/** The sessions with a start, oldest first (a copy: the caller's list is never reordered). */
function sortedSessions(sessions) {
  return (Array.isArray(sessions) ? sessions : [])
    .filter((s) => s && Number.isFinite(Number(s.startedAt)))
    .slice()
    .sort((a, b) => Number(a.startedAt) - Number(b.startedAt));
}

/**
 * Do the person's weekdays set the gap before their sessions? (D219, learner
 * design 06 section 2.3; constants.js PERSONAL_SLOT_MAX_COUPLING says why and
 * what each kind of schedule reads.) Of the gaps between consecutive sessions
 * (a break of more than a week and two sessions in one day are not the
 * routine), the share of their variation the weekday of the LATER session
 * explains: omega squared of a one-way analysis of variance, adjusted for the
 * number of weekdays so that a schedule with no weekday pattern reads about 0.
 * `coupled` is true, and the same-weekday rule stands, when the share is above
 * PERSONAL_SLOT_MAX_COUPLING, and also whenever there is too little to say
 * (fewer than PERSONAL_SLOT_MIN_GAPS gaps, one weekday, or gaps that never
 * differ): the guard only ever opens on evidence that the weekdays do not set
 * the gap. Pure: the weekday is a conversion of each given instant.
 *
 * @param {number[]} startsMs - session starts, any order
 * @returns {{ coupled: boolean, omega2: (number|null), gaps: number }}
 */
export function weekdayGapCoupling(startsMs) {
  const starts = (Array.isArray(startsMs) ? startsMs : [])
    .map(Number)
    .filter(Number.isFinite)
    .sort((a, b) => a - b);
  const byWeekday = Array.from({ length: 7 }, () => []);
  let gaps = 0;
  for (let i = 1; i < starts.length; i += 1) {
    const hours = (starts[i] - starts[i - 1]) / HOUR_MS;
    if (hours < PERSONAL_SLOT_MIN_GAP_HOURS || hours > PERSONAL_SLOT_MAX_GAP_HOURS) continue;
    byWeekday[weekdayOf(starts[i])].push(hours / 24);
    gaps += 1;
  }
  let weekdays = 0;
  let sum = 0;
  for (const g of byWeekday) {
    if (!g.length) continue;
    weekdays += 1;
    for (const v of g) sum += v;
  }
  const unknown = { coupled: true, omega2: null, gaps };
  if (gaps < PERSONAL_SLOT_MIN_GAPS || weekdays < 2) return unknown;
  const mean = sum / gaps;
  let between = 0;
  let within = 0;
  for (const g of byWeekday) {
    if (!g.length) continue;
    let m = 0;
    for (const v of g) m += v;
    m /= g.length;
    between += g.length * (m - mean) ** 2;
    for (const v of g) within += (v - m) ** 2;
  }
  const total = between + within;
  if (!(total > EPSILON) || gaps - weekdays <= 0) return unknown;
  const msWithin = within / (gaps - weekdays);
  const omega2 = (between - (weekdays - 1) * msWithin) / (total + msWithin);
  return { coupled: !(omega2 <= PERSONAL_SLOT_MAX_COUPLING), omega2, gaps };
}

/**
 * The curve that reads each muscle's recovered fraction at any instant for
 * any candidate: `fractionsAt(muscle, atMs)` is an array indexed like
 * `candidates`, or null when no session on the muscle ended inside the
 * lookback before it. Each contributing session's recovery length at every
 * candidate is the clock's own: recoveryHoursAcross with the session's sets,
 * its week's effort target, its ratings AND the three session terms the clock
 * the person sees carries (novelty, long length, mostly indirect: D219 design
 * 4.13, muscleRecoveryModel.sessionMuscleTerms), read over the same history,
 * so a candidate's curve is the clock buildMuscleRecoveryMap draws at that
 * factor.
 */
function buildCurve(list, exerciseById, candidates) {
  const loads = sessionMuscleLoads(list, exerciseById);
  const terms = sessionMuscleTerms(list, exerciseById);

  // Per muscle, the sessions that loaded it (the curve's contributors), in
  // end order. Each one's recovery length at every candidate factor is
  // worked out the first time a reading needs it (hoursOf), so a session
  // that no reading reaches, or a muscle no lift is compared on, costs
  // nothing.
  const curve = {};
  loads.forEach((load, i) => {
    for (const muscle of Object.keys(load.setsByMuscle)) {
      const sets = load.setsByMuscle[muscle];
      if (!(sets > 0)) continue;
      if (!curve[muscle]) curve[muscle] = [];
      curve[muscle].push({
        muscle, endMs: load.endMs, sets, session: list[i], term: terms[i]?.[muscle] ?? {}, hours: null,
      });
    }
  });
  for (const muscle of Object.keys(curve)) curve[muscle].sort((a, b) => a.endMs - b.endMs);
  const hoursOf = (entry) => {
    if (!entry.hours) {
      const s = entry.session;
      entry.hours = recoveryHoursAcross(entry.muscle, {
        sets: entry.sets,
        rirTarget: s.weekRirTarget,
        ratings: s.ratings,
        novel: entry.term.novel,
        longLengthShare: entry.term.longLengthShare,
        mostlyIndirect: entry.term.mostlyIndirect,
      }, candidates);
    }
    return entry.hours;
  };

  // Every candidate's recovered fraction for `muscle` at `atMs`. The
  // contributors are the entries ending in [atMs - lookback, atMs], found by
  // a binary search for the first (spec section 8: no walk over the whole
  // history per reading); they are the same for every candidate, only their
  // lengths differ, so one pass reads them all. Memoised per instant: a
  // session is B in one pair and P in the next.
  const memo = new Map();
  return (muscle, atMs) => {
    const key = `${muscle}|${atMs}`;
    if (memo.has(key)) return memo.get(key);
    const entries = curve[muscle] ?? [];
    let lo = 0;
    let hi = entries.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (atMs - entries[mid].endMs > LOOKBACK_MS) lo = mid + 1; else hi = mid;
    }
    const contributing = [];
    for (let i = lo; i < entries.length && entries[i].endMs <= atMs; i += 1) {
      const e = entries[i];
      contributing.push({ endMs: e.endMs, sets: e.sets, hours: hoursOf(e) });
    }
    const out = contributing.length ? recoveredFractionsAt(contributing, atMs, candidates.length) : null;
    memo.set(key, out);
    return out;
  };
}

/**
 * The learner's candidate curves, exposed so the equality with the clock can
 * be pinned (personalRecovery.curve.d219.test.js): the recovered fraction of a
 * muscle at an instant under each candidate factor, from the history given.
 *
 * @param {object} params
 * @param {Array<object>} params.sessions - as learnPersonalRecovery
 * @param {object} params.exerciseById
 * @param {number[]} [params.candidates] - the factors to read (default: the start, 1)
 * @returns {function(string, number): (number[]|null)}
 */
export function recoveryCurve({ sessions, exerciseById, candidates = [1] } = {}) {
  return buildCurve(sortedSessions(sessions), exerciseById, candidates);
}

/**
 * The comparable pairs in the history, per primary muscle (spec sections 2
 * and 3), and the curve that reads each muscle's recovered fraction at any
 * instant for any candidate.
 */
function collectPairs({ sessions, exerciseById, nowMs, excluded, candidates }) {
  const list = sortedSessions(sessions);

  const muscleCache = new Map();
  const lifts = list.map((s) => sessionLifts(s, exerciseById, muscleCache));
  const weekdays = list.map((s) => weekdayOf(s.startedAt));
  const isExcluded = (session, muscle) => !!excluded && typeof excluded.has === 'function'
    && excluded.has(`${session.id}|${muscle}`);
  const fractionsAt = buildCurve(list, exerciseById, candidates);

  // Whether the weekdays set the gap decides the baseline rule (see the
  // header): the guard reads the person's own sessions up to now.
  const slotPairing = !weekdayGapCoupling(
    list.filter((s) => Number(s.startedAt) <= nowMs).map((s) => Number(s.startedAt)),
  ).coupled;

  const windowStartMs = nowMs - WINDOW_MS;
  const found = [];
  const keptAsFilledIn = [];
  for (let b = 0; b < list.length; b += 1) {
    const sessionB = list[b];
    const startB = Number(sessionB.startedAt);
    if (startB < windowStartMs || startB > nowMs) continue;
    if (isFlagSet(sessionB.isDeload) || sessionB.weekStatus === 'unresolved') continue;
    const weekdayB = weekdays[b];
    for (const [exerciseId, liftB] of lifts[b]) {
      const { muscle } = liftB;
      if (isExcluded(sessionB, muscle)) continue;
      if (fractionsAt(muscle, startB) === null) continue; // nothing to recover from
      let p = -1;
      let effort = null;
      for (let j = b - 1; j >= 0; j -= 1) {
        const sessionP = list[j];
        if (Number(sessionP.startedAt) < startB - BASELINE_GAP_MS) break;
        if (slotPairing) {
          // The weekdays do not set the gap: the lift's previous session,
          // whenever it fell, short of a second session the same day.
          if (startB - Number(sessionP.startedAt) < SAME_DAY_MS) continue;
        } else {
          if (weekdays[j] !== weekdayB) continue;
          // The same day of the week in an EARLIER week: a second session of
          // the lift on the same day is not a baseline for the first.
          if (startB - Number(sessionP.startedAt) < EARLIER_WEEK_MS) continue;
        }
        if (!lifts[j].has(exerciseId)) continue;
        if (isFlagSet(sessionP.isDeload) || isExcluded(sessionP, muscle)) continue;
        effort = effortComparison(sessionB, sessionP);
        if (effort === null) continue;
        p = j;
        break;
      }
      if (p < 0) continue;
      const liftP = lifts[p].get(exerciseId);
      const k = Math.min(PERSONAL_MATCHED_SETS, liftB.e1rms.length, liftP.e1rms.length);
      // The sets compared are the first k positions that were measurements in
      // BOTH sessions: a set kept as filled in (entryTyped 0) is the plan, not
      // the day (see the header). With no such flag these are the first k.
      const positions = [];
      for (let i = 0; i < k; i += 1) if (liftB.typed[i] !== 0 && liftP.typed[i] !== 0) positions.push(i);
      if (positions.length === 0) {
        keptAsFilledIn.push(muscle);
        continue;
      }
      // Pairs at one effort are read as ever; a pair across plan weeks reads
      // both sessions at the effort the plan asked of them (D219, Q4).
      const adjusted = effort === 'adjusted';
      const piB = adjusted ? meanAtPlannedEffort(liftB, Number(sessionB.weekRirTarget), positions) : meanAt(liftB.e1rms, positions);
      const piP = adjusted ? meanAtPlannedEffort(liftP, Number(list[p].weekRirTarget), positions) : meanAt(liftP.e1rms, positions);
      if (!(piB > 0) || !(piP > 0)) continue;
      const y = Math.log(piB / piP);
      if (Math.abs(y) > PERSONAL_MAX_CHANGE) continue; // not a recovery signal (constants.js)
      let identical = true;
      for (const i of positions) if (liftB.reps[i] !== liftP.reps[i]) identical = false;
      // How each day started, when the person said (both chips, both days).
      const walkB = walkInScore(sessionB);
      const walkP = walkInScore(list[p]);
      found.push({
        muscle,
        exerciseId,
        startB,
        startP: Number(list[p].startedAt),
        y,
        identical,
        dc: walkB !== null && walkP !== null ? walkB - walkP : null,
      });
    }
  }

  // A lift whose pairs mostly repeat the same reps set for set shows what
  // was planned, not how the day went (see the header): its pairs are left
  // out and counted.
  const repeats = new Map();
  for (const q of found) {
    const r = repeats.get(q.exerciseId) ?? { pairs: 0, identical: 0 };
    r.pairs += 1;
    if (q.identical) r.identical += 1;
    repeats.set(q.exerciseId, r);
  }
  const pairsByMuscle = {};
  const fixedRepsByMuscle = {};
  let fixedRepsPairs = 0;
  for (const q of found) {
    const r = repeats.get(q.exerciseId);
    if (r.identical / r.pairs >= PERSONAL_MAX_FIXED_REPS_SHARE) {
      fixedRepsPairs += 1;
      fixedRepsByMuscle[q.muscle] = (fixedRepsByMuscle[q.muscle] ?? 0) + 1;
      continue;
    }
    if (!pairsByMuscle[q.muscle]) pairsByMuscle[q.muscle] = [];
    const pair = { startB: q.startB, startP: q.startP, y: q.y };
    // Only a pair with both chips carries the field: a pair without them is
    // the same object it always was.
    if (q.dc !== null) pair.dc = q.dc;
    pairsByMuscle[q.muscle].push(pair);
  }
  // A comparison of sets kept as filled in shows the plan too: it is counted
  // with the lifts logged as planned, which is what the reason says.
  for (const muscle of keptAsFilledIn) {
    fixedRepsPairs += 1;
    fixedRepsByMuscle[muscle] = (fixedRepsByMuscle[muscle] ?? 0) + 1;
  }
  return {
    pairsByMuscle, fixedRepsPairs, fixedRepsByMuscle, fractionsAt, slotPairing,
  };
}

/**
 * The comparable pairs in the history, per primary muscle: each
 * { startB, startP, y } (spec sections 2 and 3), and `dc` (the start-sheet
 * chips' difference between the two days) only when both days were answered.
 * The evidence the learner fits, exposed so the pairing rules can be pinned
 * directly.
 *
 * @param {object} params - as learnPersonalRecovery (recoveryRating unused)
 * @returns {object} { [muscle]: Array<{ startB:number, startP:number, y:number, dc?:number }> }
 */
export function comparablePairs({
  sessions, exerciseById, nowMs, excluded = null,
} = {}) {
  if (!Number.isFinite(nowMs)) return {};
  return collectPairs({
    sessions, exerciseById, nowMs, excluded, candidates: [1],
  }).pairsByMuscle;
}

/**
 * What the lifts show, before any gate: the number of comparable pairs, how
 * far apart they sit in predicted recovery, the candidate factor that fits
 * them best and by how much. learnPersonalRecovery applies the gates to
 * this; the calibration simulation reads it directly.
 *
 * A muscle's pairs count only when it has at least PERSONAL_MIN_MUSCLE_PAIRS
 * of them: its own drift and sensitivity are fitted, and fewer pairs than
 * that fit themselves and carry nothing.
 *
 * `spread` is the largest pooled standard deviation of x (about each
 * muscle's own mean) across the candidates (D210 addendum 2): the pairs
 * carry information about recovery time when SOME candidate predicts them
 * at different recovery. Read at the start alone, a schedule the start calls
 * fully recovered at every session could never learn that the athlete
 * recovers more slowly, however clearly the lifts showed it.
 *
 * @param {object} params - as learnPersonalRecovery
 * @returns {{ prior:number, pairs:number, workoutDays:number, spread:number,
 *   best:number, lr:number, pairsByMuscle: object, fixedRepsPairs: number,
 *   pairing: 'weekday'|'slot', dayEffectPairs: number, dayEffect: number }}
 *   `best` the best-fitting factor (the start when nothing fits better); `lr`
 *   = workoutDays x ln(SSE(start) / SSE(best)), 0 when best is the start;
 *   `pairsByMuscle` the counted pairs per muscle; `fixedRepsPairs` the pairs
 *   left out because their lift's reps never change or were kept as filled
 *   in; `pairing` the baseline rule in force (weekdayGapCoupling);
 *   `dayEffectPairs` the counted pairs with both chips answered and
 *   `dayEffect` the chip term fitted at the best factor (0 when unused)
 */
export function personalRecoveryEvidence({
  sessions, exerciseById, recoveryRating, nowMs, excluded = null,
} = {}) {
  const prior = ratingFactor(recoveryRating);
  const none = {
    prior,
    pairs: 0,
    workoutDays: 0,
    spread: 0,
    best: prior,
    lr: 0,
    pairsByMuscle: {},
    fixedRepsPairs: 0,
    fixedRepsWouldCount: false,
    pairing: 'weekday',
    dayEffectPairs: 0,
    dayEffect: 0,
  };
  if (!Number.isFinite(nowMs)) return none;

  // The start sits last, so its index is fixed whatever the grid holds.
  const candidates = [...PERSONAL_FACTOR_GRID.filter((f) => f !== prior), prior];
  const priorIndex = candidates.length - 1;
  const {
    pairsByMuscle, fixedRepsPairs, fixedRepsByMuscle, fractionsAt, slotPairing,
  } = collectPairs({
    sessions, exerciseById, nowMs, excluded, candidates,
  });
  const pairing = slotPairing ? 'slot' : 'weekday';

  const muscles = Object.keys(pairsByMuscle)
    .filter((m) => pairsByMuscle[m].length >= PERSONAL_MIN_MUSCLE_PAIRS)
    .sort();
  const counted = Object.fromEntries(muscles.map((m) => [m, pairsByMuscle[m].length]));
  const n = muscles.reduce((sum, m) => sum + counted[m], 0);
  if (n < PERSONAL_MIN_PAIRS) {
    // Would the lifts left out for repeating their reps have made enough?
    // Only then are they the reason it cannot start (review of 2026-09-26).
    const all = new Set([...Object.keys(pairsByMuscle), ...Object.keys(fixedRepsByMuscle)]);
    let withFixed = 0;
    for (const m of all) {
      const k = (pairsByMuscle[m]?.length ?? 0) + (fixedRepsByMuscle[m] ?? 0);
      if (k >= PERSONAL_MIN_MUSCLE_PAIRS) withFixed += k;
    }
    return {
      ...none, pairs: n, pairsByMuscle: counted, fixedRepsPairs, fixedRepsWouldCount: fixedRepsPairs > 0 && withFixed >= PERSONAL_MIN_PAIRS, pairing,
    };
  }

  // Per muscle, each pair's readings at B and at P for every candidate
  // (P with nothing before it reads fully recovered), and the days between
  // the two sessions, which the drift is fitted on (residualOnDays).
  const readings = Object.fromEntries(muscles.map((m) => [m, pairsByMuscle[m].map((q) => ({
    atB: fractionsAt(m, q.startB),
    atP: fractionsAt(m, q.startP),
  }))]));
  const daysByMuscle = Object.fromEntries(muscles.map((m) => [m, pairsByMuscle[m].map((q) => (q.startB - q.startP) / DAY_MS)]));
  const ysByMuscle = Object.fromEntries(muscles.map((m) => [m, residualOnDays(pairsByMuscle[m].map((q) => q.y), daysByMuscle[m])]));

  // The day's form (candidate E, see the header): the pairs with both chips
  // answered carry the chips' difference between the two days, and with enough
  // of them one non-negative term, capped, takes out of every comparison the
  // part of the day's form the chips explain. A pair without both chips has
  // no difference (0): it is read as it was. Fewer than the minimum pairs, and
  // the term is not fitted at all.
  let dayEffectPairs = 0;
  for (const m of muscles) for (const q of pairsByMuscle[m]) if (q.dc !== undefined) dayEffectPairs += 1;
  const dayEffectOn = dayEffectPairs >= PERSONAL_DAY_EFFECT_MIN_PAIRS;
  const chipsByMuscle = dayEffectOn
    ? Object.fromEntries(muscles.map((m) => [m, residualOnDays(pairsByMuscle[m].map((q) => q.dc ?? 0), daysByMuscle[m])]))
    : null;
  const dayEffects = Array.from({ length: PERSONAL_DAY_EFFECT_STEPS }, (_, i) => (PERSONAL_DAY_EFFECT_MAX * (i + 1)) / PERSONAL_DAY_EFFECT_STEPS);

  const fits = candidates.map((_, ci) => {
    const xsByMuscle = muscles.map((m) => residualOnDays(
      readings[m].map(({ atB, atP }) => atB[ci] - (atP ? atP[ci] : 1)),
      daysByMuscle[m],
    ));
    // The fit with no day effect: what the learner has always done.
    let sse = 0;
    let sxx = 0;
    muscles.forEach((m, mi) => {
      const fit = boundedFit(xsByMuscle[mi], ysByMuscle[m]);
      sse += fit.sse;
      sxx += fit.sxx;
    });
    // With the chips: the term that leaves the least error, 0 unless one of
    // the capped values beats it (ties keep the smaller).
    let dayEffect = 0;
    if (dayEffectOn) {
      for (const b of dayEffects) {
        let sseAt = 0;
        muscles.forEach((m, mi) => {
          const adjusted = ysByMuscle[m].map((y, i) => y - b * chipsByMuscle[m][i]);
          sseAt += boundedFit(xsByMuscle[mi], adjusted).sse;
        });
        if (sseAt < sse - EPSILON) { sse = sseAt; dayEffect = b; }
      }
    }
    return { sse, sxx, dayEffect };
  });
  const spread = Math.max(...fits.map((fit) => Math.sqrt(fit.sxx / n)));

  const atPrior = fits[priorIndex];
  let best = { ci: priorIndex, sse: atPrior.sse, distance: 0 };
  candidates.forEach((f, ci) => {
    if (ci === priorIndex) return;
    const { sse } = fits[ci];
    const distance = Math.abs(Math.log(f / prior));
    // Ties go to the candidate nearest the start, then to the longer.
    const better = sse < best.sse - EPSILON
      || (Math.abs(sse - best.sse) <= EPSILON && (distance < best.distance
        || (distance === best.distance && f > candidates[best.ci])));
    if (better) best = { ci, sse, distance };
  });
  // The comparisons from one day share that day's form (sleep, stress, the
  // weekday), so they are not independent: the clarity test counts the
  // days the later sessions fell on, not the comparisons (review of
  // 2026-09-26: counting comparisons, two exercises a muscle or pre-filled
  // reps showed a direction to up to 1 in 5 whose recovery equals the start).
  const days = new Set();
  for (const m of muscles) for (const q of pairsByMuscle[m]) days.add(localDayOf(q.startB));
  const workoutDays = days.size;
  const lr = best.ci !== priorIndex && atPrior.sse > EPSILON
    ? workoutDays * Math.log(atPrior.sse / Math.max(best.sse, EPSILON))
    : 0;
  return {
    prior,
    pairs: n,
    workoutDays,
    spread,
    best: candidates[best.ci],
    lr,
    pairsByMuscle: counted,
    fixedRepsPairs,
    fixedRepsWouldCount: false,
    pairing,
    dayEffectPairs,
    dayEffect: fits[best.ci].dayEffect,
  };
}

/**
 * The athlete's learned recovery factor.
 *
 * @param {object} params
 * @param {Array<object>} params.sessions - completed sessions in load.js's
 *   shape ({ id, startedAt, endedAt, durationMinutes, sets, weekRirTarget,
 *   weekStatus: 'none'|'resolved'|'unresolved', isFirstWeek, isDeload,
 *   ratings, walkedIn: { sleep, energy } }), any order, covering
 *   PERSONAL_HISTORY_DAYS before nowMs. A set may carry `entryTyped` (1 typed,
 *   0 kept as filled in); a session may carry `walkedIn` (the start sheet's
 *   chips); both are read when present and read as unknown when not.
 * @param {object} params.exerciseById
 * @param {string} [params.recoveryRating] - poor | average | good: the start.
 * @param {number} params.nowMs
 * @param {Set<string>} [params.excluded] - `${sessionId}|${muscle}` pairs under
 *   an injury limit or its return period.
 * @returns {{ factor:number, prior:number, pairs:number, reason:string,
 *   pairsByMuscle: object, pairing?: 'slot' }} reason one of 'adjusted' |
 *   'too_few' | 'fixed_reps' | 'no_spread' | 'not_clear'; factor is the prior
 *   unless adjusted; pairsByMuscle the counted comparisons per muscle (the
 *   screen names the muscle the learning rests on most); pairing is 'slot'
 *   only when the weekdays did not set the person's gaps and the baseline was
 *   the lift's previous session on any weekday (absent: the same weekday)
 */
export function learnPersonalRecovery(params = {}) {
  const {
    prior, pairs, spread, best, lr, pairsByMuscle, fixedRepsWouldCount, pairing,
  } = personalRecoveryEvidence(params);
  let reason = 'not_clear';
  if (pairs < PERSONAL_MIN_PAIRS) {
    // Enough comparisons existed, but only with the lifts whose reps repeat.
    reason = fixedRepsWouldCount ? 'fixed_reps' : 'too_few';
  } else if (spread < PERSONAL_MIN_SPREAD) reason = 'no_spread';
  else if (best !== prior && lr >= PERSONAL_LR_MIN) reason = 'adjusted';
  return {
    factor: reason === 'adjusted' ? best : prior,
    prior,
    pairs,
    reason,
    pairsByMuscle,
    // Said only when the baseline was the lift's previous session on any
    // weekday: the screen's "on the same day in different weeks" is then not
    // what these comparisons are.
    ...(pairing === 'slot' ? { pairing } : {}),
  };
}

/**
 * The learned figure in one word the screen can use: 'faster' or 'slower'
 * than the first estimate when adjusted, otherwise the reason it is not
 * ('too_few', 'fixed_reps', 'no_spread', 'not_clear'). Null when there is no
 * reading.
 */
export function personalDirection(personal) {
  if (!personal) return null;
  if (personal.reason !== 'adjusted') return personal.reason ?? 'too_few';
  if (personal.factor < personal.prior) return 'faster';
  if (personal.factor > personal.prior) return 'slower';
  return 'not_clear';
}
