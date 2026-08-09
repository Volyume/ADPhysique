/**
 * blockMetrics.js — the block performance metric (Stage 3 of the
 * adaptive mesocycle build; authority
 * docs/blueprint-adaptive-mesocycle-2026-08-09.md §3.1 + the founder's
 * Stage 3 spec). Computes interBlock's `performance` input for ONE
 * muscle over ONE finished block, from raw completed workout_sets rows
 * passed in. Pure and deterministic: no I/O, no clocks, no randomness,
 * and it never asks anything about the user beyond the rows it is
 * handed.
 *
 * Founder rules implemented here:
 * - Per stable exercise FIRST, and raw e1RM values are NEVER averaged
 *   across exercises: each exercise gets its own least-squares slope
 *   (over days, normalised by its fitted start), and only those slopes
 *   are combined, weighted by evidence.
 * - Reduced weighting (x0.5 each) for exercises new this block and for
 *   exercises whose logged target rep range shifted mid-block (null
 *   targets are unknown, not a shift — free-session sets carry no
 *   rep-range evidence).
 * - Post-deload rebound PRs weigh 0.25 in the density; the raw count is
 *   reported alongside and must never drive decisions (interBlock's
 *   contract).
 * - PR density's denominator is eligible exposures: distinct block
 *   sessions containing at least one working set whose exercise trains
 *   the muscle as PRIMARY (secondary work accrues volume elsewhere but
 *   is too noisy to read performance from — D91 posture).
 * - The deload week is prescribed light, so its sessions are excluded
 *   from slope, PRs and exposures. Weeks are calendar-derived from the
 *   block start (mesocycle_weeks carries no per-week actual dates).
 * - doseResponse: lateProgression needs the late accumulation half to
 *   beat the early half by >= 1% (or a late PR event) on stable
 *   exercises; lateRecoveryOk needs POSITIVE late-window feedback
 *   evidence (>= 2 rows, calm soreness and joints). Absence of feedback
 *   is never evidence of recovery: the founder's retention rule only
 *   raises volume on evidence, so missing data reads false.
 *
 * PR replay matches the live detector's conventions (detectPR /
 * getWeeklyPRCount): prior-history best as the baseline, the 1.001
 * margin, and a first-ever lift is never a PR. e1RM comes from the
 * app's single mandated calculate1RM (X4 ruling) — no fork.
 */
import { calculate1RM } from './algorithms';

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

const PR_MARGIN = 1.001;          // detectPR's margin, unchanged
const REBOUND_PR_WEIGHT = 0.25;   // founder: reduced weighting, not zero
const DISCOUNT = 0.5;             // new-exercise / rep-shift weight factor
const STABLE_MIN_SESSIONS = 3;
const LATE_BEAT_EARLY = 1.01;     // late peak must beat early peak by 1%
const LATE_FEEDBACK_MIN_ROWS = 2;
const LATE_SORENESS_OK = 2.5;     // soreness_24h_before is 1-3 (3 = sore)
const LATE_JOINT_OK = 2;          // joint_discomfort is 0-3

const f = (row, camel, snake) => (row?.[camel] !== undefined && row?.[camel] !== null ? row[camel] : row?.[snake]);
const lookup = (bag, id) => (bag instanceof Map ? bag.get(id) : bag?.[id]);

function leastSquaresSlope(points) {
  // points: [{ x, y }], returns { perX, fittedAt }; null under 2 points.
  const n = points.length;
  if (n < 2) return null;
  const mx = points.reduce((s, p) => s + p.x, 0) / n;
  const my = points.reduce((s, p) => s + p.y, 0) / n;
  let num = 0;
  let den = 0;
  for (const p of points) { num += (p.x - mx) * (p.y - my); den += (p.x - mx) * (p.x - mx); }
  if (den === 0) return null;
  const b = num / den;
  const a = my - b * mx;
  return { perX: b, fittedAt: (x) => a + b * x };
}

/**
 * Compute the performance half of interBlock's per-muscle input.
 *
 * @param {object} input
 * @param {string} input.muscle - muscle key (matches exercises.primary_muscle)
 * @param {Array}  input.sets - completed workout_sets rows overlapping the
 *   block (camelCase or snake_case; warm-ups, invalid rows and rows outside
 *   the accumulation window are filtered here)
 * @param {Map|object} input.exercisesById - exercise rows keyed by id
 *   (primaryMuscle/primary_muscle, exerciseType/exercise_type)
 * @param {Array}  [input.priorSets] - completed sets from BEFORE the block:
 *   prior bests for PR replay and the newness check. Empty means no prior
 *   history exists (first block), in which case nothing is "new".
 * @param {Map|object|null} [input.workoutsById] - workout feedback rows
 *   keyed by workout id (soreness24hBefore 1-3, jointDiscomfort 0-3)
 * @param {number} input.blockStart - epoch ms of the block start
 * @param {number} input.blockWeeks - planned weeks (last week = deload)
 * @param {number} [input.deloadWeekIndex] - defaults to blockWeeks
 * @param {Array}  [input.reboundWindowsMs] - [{ start, end }] windows that
 *   sit immediately after a deload (previous block's recovery week, or an
 *   applied mid-block deload); PR events inside them weigh 0.25
 * @returns {{ e1rmSlopePct: number, prDensity: number, rawPrCount: number,
 *   eligibleExposures: number, confidence: number, discontinuity: boolean,
 *   doseResponse: { lateProgression: boolean, lateRecoveryOk: boolean } }}
 */
export function computeBlockPerformance({
  muscle,
  sets = [],
  exercisesById = null,
  priorSets = [],
  workoutsById = null,
  blockStart,
  blockWeeks,
  deloadWeekIndex = blockWeeks,
  reboundWindowsMs = [],
} = {}) {
  const empty = {
    e1rmSlopePct: 0,
    prDensity: 0,
    rawPrCount: 0,
    eligibleExposures: 0,
    confidence: 0,
    discontinuity: false,
    doseResponse: { lateProgression: false, lateRecoveryOk: false },
  };
  if (!muscle || !Number.isFinite(blockStart) || !Number.isFinite(blockWeeks) || blockWeeks < 1) return empty;

  const weekOf = (at) => Math.floor((at - blockStart) / WEEK_MS) + 1;
  const inAccumulation = (at) => {
    const w = weekOf(at);
    return w >= 1 && w <= blockWeeks && w !== deloadWeekIndex;
  };

  const usable = (row) => {
    const weight = f(row, 'weight', 'weight');
    const reps = f(row, 'reps', 'reps');
    const setType = f(row, 'setType', 'set_type');
    if (setType === 'warmup') return false;
    if (!(weight > 0) || !(reps > 0)) return false;
    const ex = lookup(exercisesById, f(row, 'exerciseId', 'exercise_id'));
    if (!ex) return false;
    const type = f(ex, 'exerciseType', 'exercise_type');
    if (type === 'distance' || type === 'duration') return false;
    return f(ex, 'primaryMuscle', 'primary_muscle') === muscle;
  };

  // ── Per-exercise session series inside the accumulation window ──────────
  // byExercise: id -> Map(sessionKey -> { at, e1rm, repTargets:Set })
  const byExercise = new Map();
  for (const row of sets) {
    const at = f(row, 'createdAt', 'created_at');
    if (!Number.isFinite(at) || !inAccumulation(at) || !usable(row)) continue;
    const exId = f(row, 'exerciseId', 'exercise_id');
    const sessionKey = f(row, 'workoutId', 'workout_id') ?? `t:${at}`;
    let sessions = byExercise.get(exId);
    if (!sessions) { sessions = new Map(); byExercise.set(exId, sessions); }
    let sess = sessions.get(sessionKey);
    if (!sess) { sess = { at, e1rm: 0, repTargets: new Set() }; sessions.set(sessionKey, sess); }
    sess.at = Math.max(sess.at, at);
    sess.e1rm = Math.max(sess.e1rm, calculate1RM(f(row, 'weight', 'weight'), f(row, 'reps', 'reps')));
    const tMin = f(row, 'targetRepsMin', 'target_reps_min');
    const tMax = f(row, 'targetRepsMax', 'target_reps_max');
    if (tMin != null && tMax != null) sess.repTargets.add(`${tMin}-${tMax}`);
  }
  if (byExercise.size === 0) return empty;

  // ── Eligible exposures: distinct sessions featuring the muscle ──────────
  const exposureKeys = new Set();
  for (const sessions of byExercise.values()) {
    for (const key of sessions.keys()) exposureKeys.add(key);
  }
  const eligibleExposures = exposureKeys.size;

  // ── Accumulation halves (calendar weeks, deload excluded) ───────────────
  const accumWeeks = [];
  for (let w = 1; w <= blockWeeks; w += 1) if (w !== deloadWeekIndex) accumWeeks.push(w);
  const splitAt = Math.ceil(accumWeeks.length / 2);
  const earlyWeeks = new Set(accumWeeks.slice(0, splitAt));
  const lateWeeks = new Set(accumWeeks.slice(splitAt));

  // ── Prior history: bests + which exercises exist at all ─────────────────
  const priorBest = new Map();
  for (const row of priorSets) {
    const weight = f(row, 'weight', 'weight');
    const reps = f(row, 'reps', 'reps');
    if (f(row, 'setType', 'set_type') === 'warmup' || !(weight > 0) || !(reps > 0)) continue;
    const exId = f(row, 'exerciseId', 'exercise_id');
    if (exId == null) continue;
    priorBest.set(exId, Math.max(priorBest.get(exId) ?? 0, calculate1RM(weight, reps)));
  }
  const historyExists = priorBest.size > 0;

  // ── Per-exercise stability, discounts, slopes ───────────────────────────
  const perExercise = [];
  for (const [exId, sessions] of byExercise) {
    const points = [...sessions.values()].sort((a, b) => a.at - b.at);
    const weeksSeen = new Set(points.map((p) => weekOf(p.at)));
    const inEarly = [...weeksSeen].some((w) => earlyWeeks.has(w));
    const inLate = [...weeksSeen].some((w) => lateWeeks.has(w));
    const stable = points.length >= STABLE_MIN_SESSIONS && inEarly && inLate;

    const isNew = historyExists && !priorBest.has(exId);
    const repPairs = new Set();
    for (const p of points) for (const pair of p.repTargets) repPairs.add(pair);
    const repShifted = repPairs.size > 1;

    let slopePct = 0;
    if (stable) {
      const ls = leastSquaresSlope(points.map((p) => ({ x: (p.at - blockStart) / DAY_MS, y: p.e1rm })));
      if (ls) {
        const x0 = (points[0].at - blockStart) / DAY_MS;
        const xN = (points[points.length - 1].at - blockStart) / DAY_MS;
        const fittedStart = ls.fittedAt(x0);
        if (fittedStart > 0 && xN > x0) slopePct = (ls.perX * (xN - x0)) / fittedStart * 100;
      }
    }

    perExercise.push({
      exId,
      points,
      rawSessions: points.length,
      stable,
      weight: stable ? points.length * (isNew ? DISCOUNT : 1) * (repShifted ? DISCOUNT : 1) : 0,
      slopePct,
    });
  }

  const totalRawSessions = perExercise.reduce((s, e) => s + e.rawSessions, 0);
  const stableRawSessions = perExercise.reduce((s, e) => s + (e.stable ? e.rawSessions : 0), 0);
  const totalWeight = perExercise.reduce((s, e) => s + e.weight, 0);

  const e1rmSlopePct = totalWeight > 0
    ? perExercise.reduce((s, e) => s + e.slopePct * e.weight, 0) / totalWeight
    : 0;
  const confidence = totalRawSessions > 0 ? totalWeight / totalRawSessions : 0;
  const discontinuity = totalRawSessions > 0 && stableRawSessions / totalRawSessions < 0.5;

  // ── PR replay per exercise (session grain, prior best as baseline) ──────
  const inRebound = (at) => reboundWindowsMs.some((w) => at >= w.start && at < w.end);
  let rawPrCount = 0;
  let weightedPrEvents = 0;
  let latePrEvents = 0;
  for (const ex of perExercise) {
    let runningBest = priorBest.get(ex.exId) ?? 0;
    for (const p of ex.points) {
      if (runningBest <= 0) { runningBest = p.e1rm; continue; } // first-ever: baseline, never a PR
      if (p.e1rm > runningBest * PR_MARGIN) {
        rawPrCount += 1;
        weightedPrEvents += inRebound(p.at) ? REBOUND_PR_WEIGHT : 1;
        if (lateWeeks.has(weekOf(p.at))) latePrEvents += 1;
        runningBest = p.e1rm;
      }
    }
  }
  const prDensity = eligibleExposures > 0 ? weightedPrEvents / eligibleExposures : 0;

  // ── Dose-response evidence ──────────────────────────────────────────────
  let progressedWeight = 0;
  for (const ex of perExercise) {
    if (!ex.stable || ex.weight <= 0) continue;
    let earlyPeak = 0;
    let latePeak = 0;
    for (const p of ex.points) {
      const w = weekOf(p.at);
      if (earlyWeeks.has(w)) earlyPeak = Math.max(earlyPeak, p.e1rm);
      if (lateWeeks.has(w)) latePeak = Math.max(latePeak, p.e1rm);
    }
    if (earlyPeak > 0 && latePeak > earlyPeak * LATE_BEAT_EARLY) progressedWeight += ex.weight;
  }
  const lateProgression = (totalWeight > 0 && progressedWeight / totalWeight >= 0.5) || latePrEvents > 0;

  let lateRecoveryOk = false;
  if (workoutsById) {
    const rows = [];
    for (const key of exposureKeys) {
      const wk = lookup(workoutsById, key);
      if (!wk) continue;
      // Only the late accumulation window informs the pair; find this
      // session's date from any exercise series that contains it.
      let at = null;
      for (const sessions of byExercise.values()) {
        const sess = sessions.get(key);
        if (sess) { at = sess.at; break; }
      }
      if (at == null || !lateWeeks.has(weekOf(at))) continue;
      const soreness = f(wk, 'soreness24hBefore', 'soreness_24h_before');
      const joint = f(wk, 'jointDiscomfort', 'joint_discomfort');
      rows.push({ soreness: soreness ?? null, joint: joint ?? null });
    }
    const withSoreness = rows.filter((r) => r.soreness != null);
    if (withSoreness.length >= LATE_FEEDBACK_MIN_ROWS) {
      const avgSoreness = withSoreness.reduce((s, r) => s + r.soreness, 0) / withSoreness.length;
      const withJoint = rows.filter((r) => r.joint != null);
      const avgJoint = withJoint.length > 0
        ? withJoint.reduce((s, r) => s + r.joint, 0) / withJoint.length
        : 0;
      lateRecoveryOk = avgSoreness < LATE_SORENESS_OK && avgJoint < LATE_JOINT_OK;
    }
  }

  return {
    e1rmSlopePct,
    prDensity,
    rawPrCount,
    eligibleExposures,
    confidence,
    discontinuity,
    doseResponse: { lateProgression, lateRecoveryOk },
  };
}
