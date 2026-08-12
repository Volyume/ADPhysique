/**
 * blockMetrics.js — the block performance metric (Stage 3 of the
 * adaptive mesocycle build; authority
 * docs/blueprint-adaptive-mesocycle-2026-08-09.md §3.1 + the founder's
 * Stage 3 spec). Hardened after the Stage 3 adversarial review
 * (2026-08-09): real row shapes (actual_reps), the app's DST-safe
 * day-counting and its single muscle allocator are used instead of
 * forks; the slope is a robust Theil-Sen fit clamped to a sane band;
 * discounts reach PR density; absent joint feedback never reads as
 * recovered.
 *
 * Computes interBlock's `performance` input for ONE muscle over ONE
 * finished block, from raw COMPLETED workout_sets rows passed in (the
 * caller filters to completed workouts; incomplete sessions are not
 * evidence). Pure and deterministic: no I/O, no clocks, no randomness.
 *
 * Founder rules implemented here:
 * - Per stable exercise FIRST, and raw e1RM values are NEVER averaged
 *   across exercises: each exercise gets its own robust slope (Theil-Sen
 *   over days, normalised by its fitted start, clamped to ±25%), and
 *   only those slopes are combined, weighted by evidence. An exercise
 *   whose fit is unusable is EXCLUDED (weight 0), never a false 0%.
 * - A stable exercise has >= 3 block sessions, appears in both halves of
 *   the accumulation phase, and spans >= 3 distinct block weeks.
 * - Reduced weighting (x0.5 each) for exercises new this block and for
 *   exercises whose logged target rep range genuinely SHIFTED mid-block
 *   (the early half's target pairs and the late half's are disjoint —
 *   a heavy-day/volume-day split whose ranges coexist all block is not
 *   a shift; null targets are unknown, never a shift). The same
 *   discounts apply to that exercise's PR events in the density.
 * - Newness needs real prior history to infer from (>= 4 usable prior
 *   rows); one stray imported row must not mark everything "new".
 * - Post-deload rebound PRs weigh 0.25; raw count reported alongside
 *   and never drives decisions (interBlock's contract).
 * - PR density's denominator is eligible exposures: distinct block
 *   sessions containing at least one working set whose exercise trains
 *   the muscle as PRIMARY (via allocateExerciseVolume, the app's single
 *   allocator — legacy keys and case normalise there). Unweighted
 *   bodyweight work still counts as an exposure; only the e1RM/PR maths
 *   requires a positive load.
 * - The deload week is excluded from slope, PRs and exposures. Weeks
 *   are derived per session through mesocycle.localDaysElapsed (the
 *   DST-safe day-counting every block surface shares).
 * - doseResponse: lateProgression needs the late accumulation half to
 *   beat the early half by >= 1% (or a late PR event) on stable
 *   exercises; lateRecoveryOk needs POSITIVE late-window evidence —
 *   soreness AND joint answers on at least half the late sessions, all
 *   calm. Missing or self-selected feedback reads false, never fine.
 *   C10K: sessions from an APPLIED EARLY-DELOAD week are not part of that
 *   population at all — a deliberately reduced dose cannot prove the normal
 *   dose was recovered from. They leave the numerator and the denominator
 *   together, so their removal can never make thin evidence look sufficient.
 *
 * MID-BLOCK USE (C10G F-6). The ledger calls this only for a FINISHED
 * block, but the computation itself never assumes the block ended: every
 * window comes from the PLAN (start, planned weeks, deload index) and
 * every point from rows actually logged. Called part-way through, an
 * exercise simply fails the stability test until it has appeared in both
 * halves of the accumulation phase across >= 3 block weeks, so the result
 * is `confidence: 0` (no reading yet), never a false flat — see
 * `effectiveBlockSlopePct` below, which drops exactly those. And because
 * the slope is TOTAL change across the observed span, a part-block span
 * accumulates less of it than the full block would, so a fixed threshold
 * reads conservatively mid-block. What it cannot do mid-block is judge a
 * finished block's dose-response; `doseResponse` and `prDensity` stay
 * block-END evidence and the live caller reads neither.
 *
 * Known model properties (lead-ruled, D91): rep-count progression at a
 * fixed load raises e1RM by design — that is the app's single strength
 * model (calculate1RM, X4 ruling) and the same semantics the live PR
 * detector uses. PR density corroborates and explains; classification
 * runs on the slope (recorded Stage 2 ruling).
 */
import { calculate1RM, allocateExerciseVolume } from './algorithms';
import { localDaysElapsed } from './mesocycle';

const PR_MARGIN = 1.001;          // detectPR's margin, unchanged
const REBOUND_PR_WEIGHT = 0.25;   // founder: reduced weighting, not zero
const DISCOUNT = 0.5;             // new-exercise / rep-shift weight factor
const STABLE_MIN_SESSIONS = 3;
const STABLE_MIN_WEEKS = 3;       // sessions must span this many block weeks
const SLOPE_CLAMP_PCT = 25;       // one block cannot honestly claim more
const MIN_PRIOR_ROWS_FOR_NEWNESS = 4;
const LATE_BEAT_EARLY = 1.01;     // late peak must beat early peak by 1%
const LATE_SORENESS_OK = 2.5;     // soreness_24h_before is 1-3 (3 = sore)
const LATE_JOINT_OK = 2;          // joint_discomfort is 0-3

const f = (row, camel, snake) => (row?.[camel] !== undefined && row?.[camel] !== null ? row[camel] : row?.[snake]);
const lookup = (bag, id) => (bag instanceof Map ? bag.get(id) : (Object.prototype.hasOwnProperty.call(bag ?? {}, id) ? bag[id] : undefined));
const num = (v, fallback) => {
  const n = typeof v === 'string' && v.trim() !== '' ? Number(v) : v;
  return Number.isFinite(n) ? n : fallback;
};

const localStartOfDay = (ms) => {
  const d = new Date(ms);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
};

const median = (values) => {
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 1 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};

// Robust per-exercise slope: Theil-Sen (median of pairwise slopes) with a
// median intercept, so one mistyped set cannot swing the block verdict.
// Returns null when no usable fit exists.
function theilSenSlopePct(points) {
  const n = points.length;
  if (n < 2) return null;
  const slopes = [];
  for (let i = 0; i < n; i += 1) {
    for (let j = i + 1; j < n; j += 1) {
      const dx = points[j].x - points[i].x;
      if (dx !== 0) slopes.push((points[j].y - points[i].y) / dx);
    }
  }
  if (slopes.length === 0) return null;
  const b = median(slopes);
  const a = median(points.map((p) => p.y - b * p.x));
  const x0 = points[0].x;
  const xN = points[n - 1].x;
  const fittedStart = a + b * x0;
  if (!(fittedStart > 0) || !(xN > x0)) return null;
  const raw = (b * (xN - x0)) / fittedStart * 100;
  return Math.max(-SLOPE_CLAMP_PCT, Math.min(SLOPE_CLAMP_PCT, raw));
}

/**
 * Compute the performance half of interBlock's per-muscle input.
 *
 * PRECONDITION: `sets` and `priorSets` are rows from COMPLETED workouts
 * only (the caller filters on workouts.is_completed).
 *
 * @param {object} input
 * @param {string} input.muscle - muscle key (allocateExerciseVolume's
 *   vocabulary; legacy exercise keys normalise through the allocator)
 * @param {Array}  input.sets - completed workout_sets rows overlapping the
 *   block (camelCase or snake_case; warm-ups, invalid rows and rows outside
 *   the accumulation window are filtered here). Rows without a workout id
 *   are skipped (the local schema makes workout_id NOT NULL).
 * @param {Map|object} input.exercisesById - exercise rows keyed by id
 * @param {Array}  [input.priorSets] - completed sets from BEFORE the block:
 *   prior bests for PR replay and the newness check.
 * @param {Map|object|null} [input.workoutsById] - workout feedback rows
 *   keyed by workout id (soreness24hBefore 1-3, jointDiscomfort 0-3)
 * @param {number} input.blockStart - epoch ms of the block start
 * @param {number} input.blockWeeks - planned weeks (last week = deload)
 * @param {number} [input.deloadWeekIndex] - defaults to blockWeeks; a null
 *   passes through to the same default (never "no deload week")
 * @param {Array}  [input.reboundWindowsMs] - [{ start, end }] windows that
 *   sit immediately after a deload; PR events inside them weigh 0.25
 * @param {number[]} [input.appliedEarlyDeloadWeekIndices] - C10K: block week
 *   indices the user actually deloaded mid-block, the SAME list the runner
 *   already derives from mesocycle_weeks for the deload flags, the rebound
 *   windows and (C10J) the recovery gather. Used ONLY to drop reduced-dose
 *   sessions from the lateRecoveryOk evidence population; every performance
 *   term still counts them.
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
  deloadWeekIndex = null,
  reboundWindowsMs = [],
  appliedEarlyDeloadWeekIndices = [],
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
  const start = num(blockStart, null);
  const weeks = num(blockWeeks, null);
  if (!muscle || start == null || weeks == null || weeks < 1) return empty;
  const dwi = num(deloadWeekIndex, weeks);
  const blockDay0 = localStartOfDay(start);

  const weekOf = (at) => {
    if (localStartOfDay(at) < blockDay0) return 0; // before the block
    return Math.floor(localDaysElapsed(start, at) / 7) + 1;
  };
  const inAccumulation = (at) => {
    const w = weekOf(at);
    return w >= 1 && w <= weeks && w !== dwi;
  };

  const primaryFor = (ex) => {
    try {
      return allocateExerciseVolume(ex).some((a) => a.role === 'primary' && a.muscle === muscle);
    } catch (_e) {
      return false;
    }
  };

  // A row that counts as this muscle's work at all (exposure grain).
  const attributable = (row) => {
    if (f(row, 'setType', 'set_type') === 'warmup') return false;
    const reps = num(f(row, 'actualReps', 'actual_reps') ?? row?.reps, 0);
    if (!(reps > 0)) return false;
    const ex = lookup(exercisesById, f(row, 'exerciseId', 'exercise_id'));
    if (!ex) return false;
    const type = f(ex, 'exerciseType', 'exercise_type');
    if (type === 'distance' || type === 'duration') return false;
    return primaryFor(ex);
  };
  // A row that can feed the e1RM series (needs a real positive load).
  const loadBearing = (row) => {
    const weight = num(f(row, 'weight', 'weight'), null);
    return weight != null && weight > 0;
  };
  const repsOf = (row) => num(f(row, 'actualReps', 'actual_reps') ?? row?.reps, 0);

  // ── Per-exercise session series inside the accumulation window ──────────
  // byExercise: id -> Map(sessionKey -> { at, e1rm, earlyPairs/latePairs })
  const byExercise = new Map();
  const exposureKeys = new Set();
  for (const row of sets) {
    const at = num(f(row, 'createdAt', 'created_at'), null);
    if (at == null || !inAccumulation(at) || !attributable(row)) continue;
    const sessionKey = f(row, 'workoutId', 'workout_id');
    if (sessionKey == null) continue; // NOT NULL locally; never invent sessions
    exposureKeys.add(sessionKey);
    const exId = f(row, 'exerciseId', 'exercise_id');
    let sessions = byExercise.get(exId);
    if (!sessions) { sessions = new Map(); byExercise.set(exId, sessions); }
    let sess = sessions.get(sessionKey);
    if (!sess) { sess = { at, e1rm: 0, repPairs: new Set() }; sessions.set(sessionKey, sess); }
    sess.at = Math.max(sess.at, at);
    if (loadBearing(row)) {
      sess.e1rm = Math.max(sess.e1rm, calculate1RM(num(f(row, 'weight', 'weight'), 0), repsOf(row)));
    }
    const tMin = f(row, 'targetRepsMin', 'target_reps_min');
    const tMax = f(row, 'targetRepsMax', 'target_reps_max');
    if (tMin != null && tMax != null) sess.repPairs.add(`${tMin}-${tMax}`);
  }
  if (byExercise.size === 0) return empty;
  const eligibleExposures = exposureKeys.size;

  // ── Accumulation halves (calendar weeks, deload excluded) ───────────────
  const accumWeeks = [];
  for (let w = 1; w <= weeks; w += 1) if (w !== dwi) accumWeeks.push(w);
  const splitAt = Math.ceil(accumWeeks.length / 2);
  const earlyWeeks = new Set(accumWeeks.slice(0, splitAt));
  const lateWeeks = new Set(accumWeeks.slice(splitAt));

  // ── Prior history: bests + which exercises exist at all ─────────────────
  const priorBest = new Map();
  let usablePriorRows = 0;
  for (const row of priorSets) {
    const weight = num(f(row, 'weight', 'weight'), null);
    const reps = num(f(row, 'actualReps', 'actual_reps') ?? row?.reps, 0);
    if (f(row, 'setType', 'set_type') === 'warmup' || weight == null || !(weight > 0) || !(reps > 0)) continue;
    const exId = f(row, 'exerciseId', 'exercise_id');
    if (exId == null) continue;
    usablePriorRows += 1;
    priorBest.set(exId, Math.max(priorBest.get(exId) ?? 0, calculate1RM(weight, reps)));
  }
  // One stray imported row must not mark every other lift "new": newness
  // is only inferable from a real prior history.
  const historyExists = usablePriorRows >= MIN_PRIOR_ROWS_FOR_NEWNESS;

  // ── Per-exercise stability, discounts, slopes ───────────────────────────
  const perExercise = [];
  for (const [exId, sessions] of byExercise) {
    const points = [...sessions.values()].sort((a, b) => a.at - b.at);
    const weeksSeen = new Set(points.map((p) => weekOf(p.at)));
    const inEarly = [...weeksSeen].some((w) => earlyWeeks.has(w));
    const inLate = [...weeksSeen].some((w) => lateWeeks.has(w));
    const stable = points.length >= STABLE_MIN_SESSIONS && inEarly && inLate
      && weeksSeen.size >= STABLE_MIN_WEEKS;

    const isNew = historyExists && !priorBest.has(exId);
    // A genuine mid-block SHIFT: the early half's target pairs and the
    // late half's are disjoint. Coexisting ranges (heavy day + volume
    // day, all block long) are programme structure, not a shift.
    const earlyPairs = new Set();
    const latePairs = new Set();
    for (const p of points) {
      const w = weekOf(p.at);
      for (const pair of p.repPairs) {
        if (earlyWeeks.has(w)) earlyPairs.add(pair);
        if (lateWeeks.has(w)) latePairs.add(pair);
      }
    }
    const repShifted = earlyPairs.size > 0 && latePairs.size > 0
      && [...earlyPairs].every((pair) => !latePairs.has(pair));

    const discount = (isNew ? DISCOUNT : 1) * (repShifted ? DISCOUNT : 1);

    // Loaded points only feed the slope; an unusable fit EXCLUDES the
    // exercise from the mean (weight 0) rather than shipping a false 0%.
    const loaded = points.filter((p) => p.e1rm > 0);
    let slopePct = null;
    if (stable && loaded.length >= 2) {
      slopePct = theilSenSlopePct(loaded.map((p) => ({ x: localDaysElapsed(start, p.at), y: p.e1rm })));
    }

    perExercise.push({
      exId,
      points,
      loaded,
      rawSessions: points.length,
      stable,
      discount,
      weight: stable && slopePct != null ? points.length * discount : 0,
      slopePct: slopePct ?? 0,
    });
  }

  const totalRawSessions = perExercise.reduce((s, e) => s + e.rawSessions, 0);
  const stableRawSessions = perExercise.reduce((s, e) => s + (e.stable ? e.rawSessions : 0), 0);
  const totalWeight = perExercise.reduce((s, e) => s + e.weight, 0);
  // Confidence only credits exercises that produced a USABLE strength
  // series (stable AND a real fit): a stable lift with no measurable load
  // (bodyweight-only) or an unusable fit is zero strength evidence.
  const confidenceWeight = perExercise.reduce(
    (s, e) => s + (e.weight > 0 ? e.rawSessions * e.discount : 0), 0,
  );

  const e1rmSlopePct = totalWeight > 0
    ? perExercise.reduce((s, e) => s + e.slopePct * e.weight, 0) / totalWeight
    : 0;
  const confidence = totalRawSessions > 0 ? confidenceWeight / totalRawSessions : 0;
  const discontinuity = totalRawSessions > 0 && stableRawSessions / totalRawSessions < 0.5;

  // ── PR replay per exercise (session grain, prior best as baseline) ──────
  // Event weight carries the SAME per-exercise discounts as the slope
  // (founder: reduced weighting for new lifts and rep shifts applies to
  // the whole metric), times the rebound factor.
  const inRebound = (at) => reboundWindowsMs.some((w) => at >= w.start && at < w.end);
  let rawPrCount = 0;
  let weightedPrEvents = 0;
  let latePrEvents = 0;
  for (const ex of perExercise) {
    let runningBest = priorBest.get(ex.exId) ?? 0;
    for (const p of ex.loaded) {
      if (runningBest <= 0) { runningBest = p.e1rm; continue; } // first-ever: baseline, never a PR
      if (p.e1rm > runningBest * PR_MARGIN) {
        rawPrCount += 1;
        weightedPrEvents += (inRebound(p.at) ? REBOUND_PR_WEIGHT : 1) * ex.discount;
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
    for (const p of ex.loaded) {
      const w = weekOf(p.at);
      if (earlyWeeks.has(w)) earlyPeak = Math.max(earlyPeak, p.e1rm);
      if (lateWeeks.has(w)) latePeak = Math.max(latePeak, p.e1rm);
    }
    if (earlyPeak > 0 && latePeak > earlyPeak * LATE_BEAT_EARLY) progressedWeight += ex.weight;
  }
  const lateProgression = (totalWeight > 0 && progressedWeight / totalWeight >= 0.5) || latePrEvents > 0;

  let lateRecoveryOk = false;
  if (workoutsById) {
    // Late-window sessions featuring the muscle, with their dates.
    //
    // C10K (founder ruling): an APPLIED EARLY-DELOAD WEEK IS A REDUCED-DOSE
    // INTERVENTION. Feedback collected while the dose was deliberately cut
    // says nothing about whether the NORMAL dose was recovered from well
    // enough to earn more volume, so those sessions are not evidence for
    // this question and are dropped here — from the population itself, so
    // they leave the numerator and the `required` denominator TOGETHER.
    // Excluding them from the answered count while leaving them in the
    // denominator would read as missing feedback and be a different (also
    // wrong) answer.
    //
    // The late window is still decided by the PLANNED structure above
    // (accumWeeks -> splitAt -> lateWeeks) BEFORE any session is dropped,
    // so this cannot promote an earlier week into the late half. Same law
    // as C10J: an early deload does not rewrite calendar chronology.
    //
    // Deliberately scoped to the RECOVERY half only. e1rmSlopePct,
    // eligibleExposures, prDensity, lateProgression, stability and
    // discontinuity all still see these sessions — they were real training
    // and remain real performance evidence.
    const earlyDeloadWeeks = new Set(
      (Array.isArray(appliedEarlyDeloadWeekIndices) ? appliedEarlyDeloadWeekIndices : [])
        .map((w) => num(w, null))
        .filter((w) => w != null && w !== dwi),
    );
    const lateSessionKeys = [];
    for (const key of exposureKeys) {
      let at = null;
      for (const sessions of byExercise.values()) {
        const sess = sessions.get(key);
        if (sess) { at = sess.at; break; }
      }
      if (at == null) continue;
      const w = weekOf(at);
      if (!lateWeeks.has(w)) continue;
      if (earlyDeloadWeeks.has(w)) continue; // reduced dose: not evidence
      lateSessionKeys.push(key);
    }
    // Positive evidence only: BOTH soreness and joint answered, on at
    // least half the LEGITIMATE late sessions (self-selected scraps of
    // feedback are not an evidence base), all calm.
    const rows = [];
    for (const key of lateSessionKeys) {
      const wk = lookup(workoutsById, key);
      if (!wk) continue;
      const soreness = num(f(wk, 'soreness24hBefore', 'soreness_24h_before'), null);
      const joint = num(f(wk, 'jointDiscomfort', 'joint_discomfort'), null);
      if (soreness == null || joint == null) continue;
      rows.push({ soreness, joint });
    }
    const required = Math.max(2, Math.ceil(lateSessionKeys.length / 2));
    if (rows.length >= required) {
      const avgSoreness = rows.reduce((s, r) => s + r.soreness, 0) / rows.length;
      const avgJoint = rows.reduce((s, r) => s + r.joint, 0) / rows.length;
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

/**
 * C10G F-6: collapse several muscles' block slopes into the ONE number
 * weeklyCoach's `blockE1rmSlopePct` seam takes (D91-9: "a caller-supplied
 * block e1RM slope >= 1.5%" as the alternative route to the top
 * performance grade). No second slope FORMULA is defined here — every
 * value combined is `computeBlockPerformance`'s own Theil-Sen output,
 * unchanged.
 *
 * Two rules, both conservative, because the only thing this number can do
 * downstream is EARN a bigger volume push:
 *
 * 1. A muscle with `confidence === 0` is DROPPED, not read as 0%. Above,
 *    `e1rmSlopePct` is 0 exactly when `totalWeight === 0` (no exercise
 *    produced a usable fit) — and `confidence > 0` holds exactly then too,
 *    since confidence only credits exercises with weight > 0. So confidence
 *    is the honest "is this a real reading?" flag, and a placeholder 0
 *    never dilutes a real one. All muscles unusable => null => the engine
 *    keeps its legacy PR-only read, byte-identical to no caller at all.
 * 2. The survivors combine by MEDIAN, the same robust combiner the
 *    per-exercise fit already uses (Theil-Sen). A session-weighted mean
 *    would double-count compound work (one bench session is evidence for
 *    chest, front delts and triceps), and a max would let a single lucky
 *    muscle buy a whole-body top grade.
 *
 * @param {Array} perMuscle - computeBlockPerformance results
 * @returns {number|null} the effective block slope %, or null for no evidence
 */
export function effectiveBlockSlopePct(perMuscle = []) {
  const usable = (Array.isArray(perMuscle) ? perMuscle : [])
    .filter((p) => p && Number.isFinite(p.e1rmSlopePct) && Number(p.confidence) > 0)
    .map((p) => p.e1rmSlopePct);
  if (usable.length === 0) return null;
  return median(usable);
}
