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
 * never comparable); neither in a recovery week; neither under an injury
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
} from './constants';
import { sessionMuscleLoads, recoveredFractionsAt } from './muscleRecoveryModel';

const DAY_MS = 24 * 60 * 60 * 1000;
const LOOKBACK_MS = LOOKBACK_DAYS * DAY_MS;
const WINDOW_MS = PERSONAL_WINDOW_DAYS * DAY_MS;
const BASELINE_GAP_MS = PERSONAL_BASELINE_MAX_GAP_DAYS * DAY_MS;
const EPSILON = 1e-12;
// Two sessions on the same weekday are either on the same day (hours apart)
// or a week or more apart; three days tells them apart across any clock change.
const EARLIER_WEEK_MS = 3 * DAY_MS;
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
 * One session's eligible working sets per load-strength exercise, in set
 * order: Map exerciseId -> { muscle, e1rms: number[], reps: number[] }.
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
    });
  }
  return out;
}

/** The mean of the first k values. */
function meanFirst(values, k) {
  let sum = 0;
  for (let i = 0; i < k; i += 1) sum += values[i];
  return sum / k;
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

/**
 * The comparable pairs in the history, per primary muscle (spec sections 2
 * and 3), and the curve that reads each muscle's recovered fraction at any
 * instant for any candidate.
 */
function collectPairs({ sessions, exerciseById, nowMs, excluded, candidates }) {
  const list = (Array.isArray(sessions) ? sessions : [])
    .filter((s) => s && Number.isFinite(Number(s.startedAt)))
    .slice()
    .sort((a, b) => Number(a.startedAt) - Number(b.startedAt));

  const loads = sessionMuscleLoads(list, exerciseById);
  const muscleCache = new Map();
  const lifts = list.map((s) => sessionLifts(s, exerciseById, muscleCache));
  const weekdays = list.map((s) => weekdayOf(s.startedAt));
  const isExcluded = (session, muscle) => !!excluded && typeof excluded.has === 'function'
    && excluded.has(`${session.id}|${muscle}`);

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
        muscle, endMs: load.endMs, sets, session: list[i], hours: null,
      });
    }
  });
  for (const muscle of Object.keys(curve)) curve[muscle].sort((a, b) => a.endMs - b.endMs);
  const hoursOf = (entry) => {
    if (!entry.hours) {
      const s = entry.session;
      entry.hours = recoveryHoursAcross(entry.muscle, {
        sets: entry.sets, rirTarget: s.weekRirTarget, firstWeek: s.isFirstWeek, ratings: s.ratings,
      }, candidates);
    }
    return entry.hours;
  };

  // Every candidate's recovered fraction for `muscle` at `atMs`, as an array
  // indexed like `candidates`; null when no session on the muscle ended
  // inside the lookback before it. The contributors are the entries ending
  // in [atMs - lookback, atMs], found by a binary search for the first
  // (spec section 8: no walk over the whole history per reading); they are
  // the same for every candidate, only their lengths differ, so one pass
  // reads them all. Memoised per instant: a session is B in one pair and P
  // in the next.
  const memo = new Map();
  const fractionsAt = (muscle, atMs) => {
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

  const windowStartMs = nowMs - WINDOW_MS;
  const found = [];
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
      for (let j = b - 1; j >= 0; j -= 1) {
        const sessionP = list[j];
        if (Number(sessionP.startedAt) < startB - BASELINE_GAP_MS) break;
        if (weekdays[j] !== weekdayB) continue;
        // The same day of the week in an EARLIER week: a second session of
        // the lift on the same day is not a baseline for the first.
        if (startB - Number(sessionP.startedAt) < EARLIER_WEEK_MS) continue;
        if (!lifts[j].has(exerciseId)) continue;
        if (isFlagSet(sessionP.isDeload) || isExcluded(sessionP, muscle)) continue;
        if (!sameEffortTarget(sessionB, sessionP)) continue;
        p = j;
        break;
      }
      if (p < 0) continue;
      const liftP = lifts[p].get(exerciseId);
      const k = Math.min(PERSONAL_MATCHED_SETS, liftB.e1rms.length, liftP.e1rms.length);
      const piB = meanFirst(liftB.e1rms, k);
      const piP = meanFirst(liftP.e1rms, k);
      if (!(piB > 0) || !(piP > 0)) continue;
      const y = Math.log(piB / piP);
      if (Math.abs(y) > PERSONAL_MAX_CHANGE) continue; // not a recovery signal (constants.js)
      let identical = true;
      for (let i = 0; i < k; i += 1) if (liftB.reps[i] !== liftP.reps[i]) identical = false;
      found.push({
        muscle, exerciseId, startB, startP: Number(list[p].startedAt), y, identical,
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
    pairsByMuscle[q.muscle].push({ startB: q.startB, startP: q.startP, y: q.y });
  }
  return {
    pairsByMuscle, fixedRepsPairs, fixedRepsByMuscle, fractionsAt,
  };
}

/**
 * The comparable pairs in the history, per primary muscle: each
 * { startB, startP, y } (spec sections 2 and 3). The evidence the learner
 * fits, exposed so the pairing rules can be pinned directly.
 *
 * @param {object} params - as learnPersonalRecovery (recoveryRating unused)
 * @returns {object} { [muscle]: Array<{ startB:number, startP:number, y:number }> }
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
 * @returns {{ prior:number, pairs:number, spread:number, best:number, lr:number,
 *   pairsByMuscle: object, fixedRepsPairs: number }} `best` the
 *   best-fitting factor (the start when nothing fits better); `lr` =
 *   pairs x ln(SSE(start) / SSE(best)), 0 when best is the start;
 *   `pairsByMuscle` the counted pairs per muscle; `fixedRepsPairs` the pairs
 *   left out because their lift's reps never change
 */
export function personalRecoveryEvidence({
  sessions, exerciseById, recoveryRating, nowMs, excluded = null,
} = {}) {
  const prior = ratingFactor(recoveryRating);
  const none = {
    prior, pairs: 0, workoutDays: 0, spread: 0, best: prior, lr: 0, pairsByMuscle: {}, fixedRepsPairs: 0, fixedRepsWouldCount: false,
  };
  if (!Number.isFinite(nowMs)) return none;

  // The start sits last, so its index is fixed whatever the grid holds.
  const candidates = [...PERSONAL_FACTOR_GRID.filter((f) => f !== prior), prior];
  const priorIndex = candidates.length - 1;
  const {
    pairsByMuscle, fixedRepsPairs, fixedRepsByMuscle, fractionsAt,
  } = collectPairs({
    sessions, exerciseById, nowMs, excluded, candidates,
  });

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
      ...none, pairs: n, pairsByMuscle: counted, fixedRepsPairs, fixedRepsWouldCount: fixedRepsPairs > 0 && withFixed >= PERSONAL_MIN_PAIRS,
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
  const fits = candidates.map((_, ci) => {
    let sse = 0;
    let sxx = 0;
    for (const m of muscles) {
      const xs = residualOnDays(readings[m].map(({ atB, atP }) => atB[ci] - (atP ? atP[ci] : 1)), daysByMuscle[m]);
      const fit = boundedFit(xs, ysByMuscle[m]);
      sse += fit.sse;
      sxx += fit.sxx;
    }
    return { sse, sxx };
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
    prior, pairs: n, workoutDays, spread, best: candidates[best.ci], lr, pairsByMuscle: counted, fixedRepsPairs, fixedRepsWouldCount: false,
  };
}

/**
 * The athlete's learned recovery factor.
 *
 * @param {object} params
 * @param {Array<object>} params.sessions - completed sessions in load.js's
 *   shape ({ id, startedAt, endedAt, durationMinutes, sets, weekRirTarget,
 *   weekStatus: 'none'|'resolved'|'unresolved', isFirstWeek, isDeload,
 *   ratings }), any order, covering PERSONAL_HISTORY_DAYS before nowMs.
 * @param {object} params.exerciseById
 * @param {string} [params.recoveryRating] - poor | average | good: the start.
 * @param {number} params.nowMs
 * @param {Set<string>} [params.excluded] - `${sessionId}|${muscle}` pairs under
 *   an injury limit or its return period.
 * @returns {{ factor:number, prior:number, pairs:number, reason:string,
 *   pairsByMuscle: object }} reason one of 'adjusted' | 'too_few' |
 *   'no_spread' | 'not_clear'; factor is the prior unless adjusted;
 *   pairsByMuscle the counted comparisons per muscle (the screen names the
 *   muscle the learning rests on most)
 */
export function learnPersonalRecovery(params = {}) {
  const {
    prior, pairs, spread, best, lr, pairsByMuscle, fixedRepsWouldCount,
  } = personalRecoveryEvidence(params);
  let reason = 'not_clear';
  if (pairs < PERSONAL_MIN_PAIRS) {
    // Enough comparisons existed, but only with the lifts whose reps repeat.
    reason = fixedRepsWouldCount ? 'fixed_reps' : 'too_few';
  } else if (spread < PERSONAL_MIN_SPREAD) reason = 'no_spread';
  else if (best !== prior && lr >= PERSONAL_LR_MIN) reason = 'adjusted';
  return {
    factor: reason === 'adjusted' ? best : prior, prior, pairs, reason, pairsByMuscle,
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
