/**
 * src/lib/recovery/muscleRecoveryModel.js
 *
 * The per-muscle recovery ESTIMATE (register D201, spec
 * docs/recovery-programme-2026-09-25/00-SPEC.md section 3.2). Turns
 * completed sessions into a residual-fatigue curve per muscle and reads an
 * estimated-recovered percent, a status band and a "ready by" instant off
 * it. See src/lib/recovery/constants.js for the evidence base, the factor
 * tables and the honesty rule (every figure this feeds is labelled
 * "estimated", never a measurement).
 *
 * THE MODEL. Each completed session contributes, per muscle it loaded, a
 * fatigue unit F (its working sets on that muscle, scaled against the
 * REFERENCE_SETS dose and clamped to [FATIGUE_UNIT_MIN, FATIGUE_UNIT_MAX]),
 * decaying LINEARLY from the session's end to zero at T hours later (T =
 * constants.recoveryHours(muscle, ...), which folds in the session's own
 * dose, the user's recovery rating, the block week's RIR target, whether it
 * fell in a block's first week, and the user's ratings). The residual at any
 * instant t is the sum, over every session within LOOKBACK_DAYS of "now",
 * of max(0, F * (1 - (t - end) / T)): a session already past its own T
 * contributes nothing; two sessions whose windows overlap COMPOUND, which is
 * the honest reading of training a muscle again before it recovered.
 *
 * recoveredPercent = clamp(0, 100, round(100 * (1 - residual))). "Ready by"
 * (readyAtMs) is the earliest instant at which that percent would reach
 * READY_PERCENT. Because the residual is piecewise LINEAR with breakpoints
 * exactly at each contributing session's own zero point (end + T), the
 * crossing is found by walking those breakpoints and solving the linear
 * segment it falls in -- never a numeric search.
 *
 * PURE. No I/O, no clock: every function takes its "now" as an argument.
 * The caller (a later lane's src/lib/recovery/load.js) does all the
 * reading and hands these functions plain data.
 */
import { VOLUME_LANDMARKS, calculateWeeklyVolume } from '../algorithms';
import {
  REFERENCE_SETS, FATIGUE_UNIT_MIN, FATIGUE_UNIT_MAX, LOOKBACK_DAYS,
  READY_PERCENT, NEARLY_PERCENT, DEFAULT_SESSION_MINUTES,
  recoveryHours, feedbackFactor,
} from './constants';

const MS_PER_MINUTE = 60 * 1000;
const MS_PER_HOUR = 60 * MS_PER_MINUTE;
const LOOKBACK_MS = LOOKBACK_DAYS * 24 * MS_PER_HOUR;
// recoveredPercent >= READY_PERCENT reads as recovered. recoveredPercent is
// ROUNDED, so the status flips the moment the raw percent reaches
// READY_PERCENT - 0.5; the ready-by walk aims at exactly that residual, so
// "ready by" and "recovered" name the same instant (Opus review finding 23:
// aiming at the unrounded 0.100 put ready-by about 20 minutes after the
// status had already turned recovered).
const READY_RESIDUAL = 1 - (READY_PERCENT - 0.5) / 100;

const clamp = (lo, hi, v) => Math.min(hi, Math.max(lo, v));

/**
 * A session's end instant: the logged end, else the started time plus its
 * logged duration, else the started time plus DEFAULT_SESSION_MINUTES.
 * Spec 3.2 / this lane's brief: `endedAt ?? startedAt + (durationMinutes ??
 * DEFAULT_SESSION_MINUTES) minutes`.
 */
function resolveEndMs(session) {
  const { startedAt, endedAt, durationMinutes } = session ?? {};
  if (endedAt !== null && endedAt !== undefined) return endedAt;
  const minutes = durationMinutes !== null && durationMinutes !== undefined
    ? durationMinutes
    : DEFAULT_SESSION_MINUTES;
  return startedAt + minutes * MS_PER_MINUTE;
}

/**
 * Per completed session, the working sets it gave each muscle and when it
 * ended. Uses calculateWeeklyVolume -- the SAME allocator the volume tracker
 * uses (allocateExerciseVolume inside it: primary 1.0, secondary 0.5,
 * warm-ups excluded) -- over just that session's own sets, so a session's
 * muscle credit here can never disagree with the heatmap's.
 *
 * @param {Array<object>} sessions - completed sessions: { id, startedAt,
 *   endedAt, durationMinutes, sets, weekRirTarget, isFirstWeek, ratings }
 * @param {object} exerciseById - { [exerciseId]: exercise }
 * @returns {Array<{ workoutId: *, endMs: number, setsByMuscle: object }>}
 */
export function sessionMuscleLoads(sessions, exerciseById) {
  const list = Array.isArray(sessions) ? sessions : [];
  const exerciseMap = exerciseById ?? {};
  return list.map((session) => {
    const volumeByMuscle = calculateWeeklyVolume(session?.sets ?? [], exerciseMap);
    const setsByMuscle = {};
    for (const muscle of Object.keys(volumeByMuscle)) {
      setsByMuscle[muscle] = volumeByMuscle[muscle].workingSets;
    }
    return {
      workoutId: session?.id ?? null,
      endMs: resolveEndMs(session),
      setsByMuscle,
    };
  });
}

/** sets -> fatigue unit F, clamped. Mirrors constants.doseFactor's ratio. */
function fatigueUnit(sets) {
  const s = Number(sets);
  const ratio = Number.isFinite(s) ? s / REFERENCE_SETS : 1;
  return clamp(FATIGUE_UNIT_MIN, FATIGUE_UNIT_MAX, ratio);
}

/**
 * The residual at instant t: the sum, over the given contributing sessions
 * (each { endMs, sets, hoursT }), of max(0, F * (1 - (t - endMs) / Tms)).
 */
function residualAt(contributingSessions, t) {
  let residual = 0;
  for (const cs of contributingSessions) {
    const tMs = cs.hoursT * MS_PER_HOUR;
    if (!(tMs > 0)) continue;
    // Lead review: a session's contribution is capped at its own F. Before
    // its end (a projection that pre-dates it, or an end stamped ahead of
    // "now" by clock skew) the raw fraction exceeds 1 and would inflate the
    // residual past what the session can carry.
    const fraction = Math.min(1, 1 - (t - cs.endMs) / tMs);
    residual += Math.max(0, fatigueUnit(cs.sets) * fraction);
  }
  return residual;
}

function statusForPercent(percent) {
  if (percent >= READY_PERCENT) return 'recovered';
  if (percent >= NEARLY_PERCENT) return 'nearly';
  return 'recovering';
}

/**
 * The earliest t >= fromMs at which the residual first falls to
 * READY_RESIDUAL (recoveredPercent === READY_PERCENT), given the residual is
 * piecewise linear with a breakpoint at each contributing session's own zero
 * point (endMs + hoursT). Walks those breakpoints in order and solves the
 * (constant-slope) segment the crossing falls in directly - no numeric
 * search. Assumes the caller already checked the residual at fromMs is
 * still above READY_RESIDUAL (otherwise it is already recovered).
 */
function computeReadyAtMs(contributingSessions, fromMs) {
  // Lead review: each session's END is a breakpoint too (its contribution
  // is flat at F before it and decays after), so the walk stays exact even
  // for an end stamped after fromMs; for completed sessions those ends are
  // already behind fromMs and drop out of the filter.
  const zeroPoints = Array.from(new Set(
    contributingSessions.flatMap((cs) => [cs.endMs, cs.endMs + cs.hoursT * MS_PER_HOUR]),
  )).filter((bp) => bp > fromMs).sort((a, b) => a - b);

  let prevT = fromMs;
  let prevResidual = residualAt(contributingSessions, fromMs);
  for (const bp of zeroPoints) {
    const residual = residualAt(contributingSessions, bp);
    if (residual <= READY_RESIDUAL) {
      if (residual === prevResidual) return bp;
      // Linear between (prevT, prevResidual) and (bp, residual): solve for
      // the t where the line crosses READY_RESIDUAL.
      const t = prevT + ((READY_RESIDUAL - prevResidual) * (bp - prevT)) / (residual - prevResidual);
      return t;
    }
    prevT = bp;
    prevResidual = residual;
  }
  // Unreachable in practice: every contributing session's term is exactly 0
  // from its own zero point onward, so the residual at the LAST zero point
  // is always 0 <= READY_RESIDUAL and the loop above always returns first.
  // Kept only so this never returns undefined if that invariant is ever
  // violated by a malformed input.
  return zeroPoints.length ? zeroPoints[zeroPoints.length - 1] : fromMs;
}

/** One muscle's output entry, from its (already time/window filtered) contributing sessions. */
function buildMuscleEntry(muscle, contributingSessions, atMs, anyRatingsContributed) {
  if (!contributingSessions.length) {
    return {
      muscle,
      recoveredPercent: 100,
      status: 'no_recent_session',
      readyAtMs: null,
      lastSessionEndMs: null,
      lastSessionSets: null,
      basis: 'time_and_volume',
      contributingSessions: [],
    };
  }
  const residual = residualAt(contributingSessions, atMs);
  const recoveredPercent = clamp(0, 100, Math.round(100 * (1 - residual)));
  const status = statusForPercent(recoveredPercent);
  const readyAtMs = recoveredPercent >= READY_PERCENT
    ? null
    : computeReadyAtMs(contributingSessions, atMs);
  const last = contributingSessions[contributingSessions.length - 1];
  return {
    muscle,
    recoveredPercent,
    status,
    readyAtMs,
    lastSessionEndMs: last.endMs,
    lastSessionSets: last.sets,
    basis: anyRatingsContributed ? 'time_volume_and_ratings' : 'time_and_volume',
    contributingSessions,
  };
}

/**
 * Every VOLUME_LANDMARKS muscle's estimated recovery at nowMs.
 *
 * @param {object} params
 * @param {Array<object>} params.sessions - completed sessions (see
 *   sessionMuscleLoads); only those ending within LOOKBACK_DAYS of nowMs
 *   contribute.
 * @param {object} params.exerciseById
 * @param {string} [params.recoveryRating] - the profile's poor|average|good
 *   answer; unknown reads as average (constants.ratingFactor).
 * @param {number} params.nowMs - the caller's "now"; never read from a clock
 *   here.
 * @returns {object} { [muscle]: { muscle, recoveredPercent, status,
 *   readyAtMs, lastSessionEndMs, lastSessionSets, basis,
 *   contributingSessions } }
 */
export function buildMuscleRecoveryMap({ sessions, exerciseById, recoveryRating, nowMs } = {}) {
  const sessionList = Array.isArray(sessions) ? sessions : [];
  const loads = sessionMuscleLoads(sessionList, exerciseById);

  const map = {};
  for (const muscle of Object.keys(VOLUME_LANDMARKS)) {
    const contributing = [];
    let anyRatingsContributed = false;
    for (let i = 0; i < loads.length; i += 1) {
      const load = loads[i];
      const rawSets = load.setsByMuscle[muscle];
      if (!rawSets || rawSets <= 0) continue;
      if (nowMs - load.endMs > LOOKBACK_MS) continue; // older than LOOKBACK_DAYS: no contribution

      const session = sessionList[i] ?? {};
      const hoursT = recoveryHours(muscle, {
        sets: rawSets,
        recoveryRating,
        rirTarget: session.weekRirTarget,
        firstWeek: session.isFirstWeek,
        ratings: session.ratings,
      });
      if (feedbackFactor(session.ratings ?? {}) > 1) anyRatingsContributed = true;
      contributing.push({ workoutId: load.workoutId, endMs: load.endMs, sets: rawSets, hoursT });
    }
    contributing.sort((a, b) => a.endMs - b.endMs);
    map[muscle] = buildMuscleEntry(muscle, contributing, nowMs, anyRatingsContributed);
  }
  return map;
}

/**
 * Re-evaluates a recovery map at a future (or past) instant, from each
 * muscle's own contributingSessions alone - no new inputs, no re-reading the
 * lookback window. Everything historical (basis, lastSessionEndMs,
 * lastSessionSets, contributingSessions) is carried over unchanged; only
 * recoveredPercent, status and readyAtMs are re-derived for atMs.
 *
 * @param {object} map - a buildMuscleRecoveryMap result
 * @param {number} atMs
 * @returns {object} the same shape as buildMuscleRecoveryMap
 */
export function projectRecovery(map, atMs) {
  const out = {};
  for (const muscle of Object.keys(map ?? {})) {
    const entry = map[muscle];
    const contributingSessions = entry?.contributingSessions ?? [];
    if (!contributingSessions.length) {
      out[muscle] = { ...entry };
      continue;
    }
    const residual = residualAt(contributingSessions, atMs);
    const recoveredPercent = clamp(0, 100, Math.round(100 * (1 - residual)));
    const status = statusForPercent(recoveredPercent);
    const readyAtMs = recoveredPercent >= READY_PERCENT
      ? null
      : computeReadyAtMs(contributingSessions, atMs);
    out[muscle] = { ...entry, recoveredPercent, status, readyAtMs };
  }
  return out;
}
