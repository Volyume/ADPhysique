/**
 * src/lib/recovery/load.js
 *
 * THE ONLY I/O IN THE RECOVERY DOMAIN (register D201, spec
 * docs/recovery-programme-2026-09-25/00-SPEC.md section 7). Reads whatever
 * `buildMuscleRecoveryMap` and `nextWorkoutRecommendation` need and hands
 * them plain data; every other file under src/lib/recovery/ is pure. Mirrors
 * the pattern sessionAdjustments.js already uses for a different engine: an
 * orchestrator module that reads the database directly and composes pure
 * engine calls, called from the screen.
 *
 * EVERY READ IS BEST-EFFORT. A failed read never throws out of this module:
 * `loadMuscleRecovery` always returns a usable shape, with logError
 * recording the failure (CLAUDE.md error convention), and sets
 * `degraded: true` when one of the CORE reads (the workouts, their sets,
 * the exercise map) failed. Both callers (HomeScreen, ReadinessCards) render
 * NOTHING from a degraded result rather than an all-clear built on a read
 * that never happened (Opus review finding 10: a database fault used to
 * surface as "estimated recovered"). A failed week or habit read only
 * neutralises the factor it feeds and is not degradation.
 *
 * THE SESSIONS SHAPE THE MODEL EXPECTS (muscleRecoveryModel.js): per
 * completed workout, `{ id, startedAt, endedAt, durationMinutes, sets,
 * weekRirTarget, isFirstWeek, ratings: { fatigue, joint, sorenessNext } }`.
 *
 *  - weekRirTarget / isFirstWeek come from the workout's OWN mesocycle_week_id
 *    resolved against ITS OWN mesocycle_id's week rows (workouts carry both
 *    columns directly -- no active-plan lookup needed to find them).
 *    isFirstWeek is week_index === 1, or the first week immediately after a
 *    week whose is_deload is set (Damas 2016: a block's first week, or the
 *    first week back from a recovery week, carries extra fatigue).
 *  - ratings.fatigue is the workout's own post-session fatigue_level;
 *    ratings.joint is the workout's own post-session joint_discomfort, or
 *    (when that was never answered) the MAX joint_discomfort logged on any
 *    of that session's own sets.
 *  - ratings.sorenessNext is whole-body: the soreness_24h_before the athlete
 *    reported walking into their NEXT completed session, attributed back to
 *    THIS session as feedback on how it left them -- but only when that next
 *    session started within 96 hours of THIS one starting; a longer gap
 *    carries no evidence about this specific session's lingering effect, so
 *    it stays null.
 *
 * The fetch window is PERSONAL_HISTORY_DAYS (register D210): the personal
 * learner (personalRecovery.js) reads 84 days of pairs, each with a baseline
 * up to 28 days earlier and the curve's 14-day lookback before that. It used
 * to be LOOKBACK_DAYS plus 4 days, the margin a session at the model's own
 * edge needs for its soreness-pairing partner; the wider window covers it.
 * The model re-applies its own LOOKBACK_DAYS cutoff internally
 * (buildMuscleRecoveryMap), so handing it the wider set is always safe --
 * the extra days simply never contribute to the live reading. The window is
 * applied IN THE QUERY (getCompletedWorkoutsBetween), never by reading the
 * whole workouts table and filtering in JavaScript (Opus review finding 17:
 * Home and Consistency each do this on every focus).
 *
 * THE PERSONAL FACTOR (register D210, spec 14-PERSONAL-LEARNING-V2.md). The
 * learner runs over the same sessions, at most once per user, local day,
 * recovery answer and history (a module-level memo: Home, Progress and the
 * Recovery place all read this loader, and a fit on every focus cost up to
 * 390 ms in review). When it has moved from the start, its factor takes the
 * recovery answer's place in the map; the reading itself is returned as
 * `personal` for the screens that show it. A session under an injury limit,
 * or inside the 14-day return period after one, teaches its muscle nothing
 * (the CC30 rule, through capability/eligibility's
 * constrainedMusclesInWindow). If that read fails, the learner is skipped
 * for this read rather than learning from sessions it cannot vouch for (the
 * safe direction for learning is out, CAP-12): the map then reads with the
 * recovery answer alone and `personal` is null. A failed learner does the
 * same. Neither degrades the map.
 */
import {
  getCompletedWorkoutsBetween, getWorkoutSetsForWorkoutIds, getAllExercisesIncludingDeleted,
  getMesocycleWeeks, getRoutineExercisesWithDetails, getCompletedWorkoutStartTimestamps,
  getCapabilityConstraints,
} from '../database';
import { logError } from '../errorLog';
import { localWeekStartMs, localDayKey } from '../dayKey';
import { allocateExerciseVolume } from '../algorithms';
import {
  deriveHabitualTrainingWeekdays, HABIT_WINDOW_WEEKS, MIN_HISTORY_WEEKS,
} from '../notifications/trainingHabitSchedule';
import { buildMuscleRecoveryMap } from './muscleRecoveryModel';
import { DEFAULT_TRAINING_START_MINUTE } from './constants';
import { learnPersonalRecovery, PERSONAL_HISTORY_DAYS } from './personalRecovery';

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;
const SORENESS_PAIR_WINDOW_MS = 96 * 60 * 60 * 1000;
const DEFAULT_SESSION_MS = 60 * 60 * 1000;

const isTruthyFlag = (v) => v === 1 || v === true;

/**
 * The median minute-of-day of completed-session start times inside the
 * SAME six-week habit window deriveHabitualTrainingWeekdays uses
 * (trainingHabitSchedule.js: HABIT_WINDOW_WEEKS, current week always
 * excluded, MIN_HISTORY_WEEKS gate), so the two readings describe the same
 * slice of history and can never silently disagree about which sessions
 * they are each summarising. Returns null on insufficient history so the
 * caller falls back to DEFAULT_TRAINING_START_MINUTE.
 *
 * Exported (alongside indexWeeks and buildRecoverySession below) so this
 * pure arithmetic is directly unit-testable with plain fixtures, without
 * mocking the database chain just to exercise it.
 */
export function medianHabitStartMinute(timestampsMs, nowMs) {
  const timestamps = Array.isArray(timestampsMs) ? timestampsMs.filter((t) => Number.isFinite(t)) : [];
  if (!timestamps.length) return null;
  const currentWeekStart = localWeekStartMs(nowMs);
  const earliestWeekStart = localWeekStartMs(Math.min(...timestamps));
  const historySpanWeeks = Math.floor((currentWeekStart - earliestWeekStart) / WEEK_MS);
  if (historySpanWeeks < MIN_HISTORY_WEEKS) return null;
  const observedWeeks = Math.min(HABIT_WINDOW_WEEKS, historySpanWeeks);
  const windowStart = currentWeekStart - observedWeeks * WEEK_MS;

  const minutes = timestamps
    .filter((t) => t >= windowStart && t < currentWeekStart)
    .map((t) => {
      const d = new Date(t);
      return d.getHours() * 60 + d.getMinutes();
    })
    .sort((a, b) => a - b);
  if (!minutes.length) return null;
  const mid = Math.floor(minutes.length / 2);
  return minutes.length % 2 ? minutes[mid] : Math.round((minutes[mid - 1] + minutes[mid]) / 2);
}

/** The profile's "How's your recovery?" answer, read the way effectiveLandmarks.js's
 * getPlanLandmarks reads userProfile: a lazy store require (CLAUDE.md convention,
 * avoids an import cycle between lib modules and the store), defaulting exactly
 * like planAutoGen.js's buildPlanInputs does (`?? 'average'`). Never throws. */
function readRecoveryRating() {
  try {
    // eslint-disable-next-line global-require
    const profile = require('../../store/useAppStore').default.getState().userProfile;
    return profile?.recoveryRating ?? 'average';
  } catch (e) {
    logError('recovery.load.readRecoveryRating', e, {});
    return 'average';
  }
}

/**
 * Groups a mesocycle's week rows into { [weekId]: { rirTarget, isFirstWeek,
 * isDeload } }. isFirstWeek: week_index 1, or the week immediately after one
 * with is_deload set -- derived purely from this one block's own week rows,
 * in week_index order, no block-level plannedWeeks/deloadWeek lookup
 * required. isDeload (register D210): the recovery week itself, whose
 * lowered loads the personal learner never compares.
 */
export function indexWeeks(weekRows) {
  const sorted = (Array.isArray(weekRows) ? weekRows : [])
    .slice()
    .sort((a, b) => (Number(a?.week_index) || 0) - (Number(b?.week_index) || 0));
  const out = new Map();
  let previousWasDeload = false;
  for (const w of sorted) {
    if (!w?.id) continue;
    const weekIndex = Number(w.week_index);
    const isFirstWeek = weekIndex === 1 || previousWasDeload;
    const isDeload = isTruthyFlag(w.is_deload);
    out.set(w.id, { rirTarget: w.rir_target ?? null, isFirstWeek, isDeload });
    previousWasDeload = isDeload;
  }
  return out;
}

/**
 * One completed workout (camelCase row from getAllWorkouts), its own sets,
 * and its resolved week info (from indexWeeks), turned into the session
 * shape muscleRecoveryModel.js expects. Pure -- exported so this mapping is
 * directly unit-testable with plain fixtures. `ratings.sorenessNext` is
 * always null here; pairSorenessNext resolves it afterwards, since it needs
 * to see the FOLLOWING session too.
 *
 * `weekStatus` (register D210) says whether the effort target is known:
 * 'none' for a session outside any plan (no week id), 'resolved' when its
 * week row was found, 'unresolved' when it has a week id whose row was not
 * found (the personal learner never compares such a session: its effort is
 * unknown).
 *
 * @param {object} workout
 * @param {Array} workoutSets - this workout's own workout_sets rows
 * @param {{rirTarget: number|null, isFirstWeek: boolean, isDeload?: boolean}|null} week
 */
export function buildRecoverySession(workout, workoutSets, week) {
  const sets = Array.isArray(workoutSets) ? workoutSets : [];
  // Number(null) is 0, not NaN (the same trap programmePosition.js's `int`
  // and constants.js's `intensityFactor` both guard against), so an
  // UNANSWERED per-set reading must be rejected before coercion or it would
  // count as "reported zero discomfort" rather than "not reported".
  const jointValues = sets
    .map((s) => s?.jointDiscomfort)
    .filter((v) => v !== null && v !== undefined)
    .map((v) => Number(v))
    .filter((v) => Number.isFinite(v));
  const maxJointDiscomfort = jointValues.length ? Math.max(...jointValues) : null;
  return {
    id: workout.id,
    startedAt: workout.startedAt,
    endedAt: workout.endedAt ?? null,
    durationMinutes: workout.durationMinutes ?? null,
    sets,
    weekRirTarget: week?.rirTarget ?? null,
    isFirstWeek: !!week?.isFirstWeek,
    isDeload: !!week?.isDeload,
    weekStatus: workout.mesocycleWeekId ? (week ? 'resolved' : 'unresolved') : 'none',
    ratings: {
      fatigue: workout.fatigueLevel ?? null,
      joint: workout.jointDiscomfort ?? maxJointDiscomfort,
      sorenessNext: null,
    },
  };
}

/**
 * Mutates `sessions[i].ratings.sorenessNext` in place: the soreness_24h_before
 * the athlete reported at the NEXT completed session, only when that next
 * session started within 96 hours of THIS one starting (spec 3.1: whole-body,
 * so it applies regardless of which muscle either session loaded). Both
 * arrays must be the SAME length, in the SAME oldest-first order (`sessions`
 * built from `completedWorkouts` via buildRecoverySession, one-to-one).
 */
export function pairSorenessNext(sessions, completedWorkouts) {
  for (let i = 0; i < sessions.length - 1; i += 1) {
    const gap = Number(completedWorkouts[i + 1]?.startedAt) - Number(completedWorkouts[i]?.startedAt);
    if (Number.isFinite(gap) && gap > 0 && gap <= SORENESS_PAIR_WINDOW_MS) {
      sessions[i].ratings.sorenessNext = completedWorkouts[i + 1]?.soreness24hBefore ?? null;
    }
  }
  return sessions;
}

/**
 * The completed, non-deleted workouts within the fetch window, oldest
 * first (the order every step below relies on for the forward
 * soreness-pairing walk).
 */
function selectCompletedWorkouts(allWorkouts, windowStartMs, nowMs) {
  return (Array.isArray(allWorkouts) ? allWorkouts : [])
    .filter((w) => w && w.deletedAt == null && isTruthyFlag(w.isCompleted))
    .filter((w) => {
      const startedAt = Number(w.startedAt);
      return Number.isFinite(startedAt) && startedAt >= windowStartMs && startedAt <= nowMs;
    })
    .sort((a, b) => Number(a.startedAt) - Number(b.startedAt));
}

/**
 * Reads everything `buildMuscleRecoveryMap` and `recommendNextWorkout` need
 * about ONE user and hands back plain data. No pure logic lives here.
 *
 * @param {string} userId
 * @param {number} [nowMs]
 * @returns {Promise<{ map: object, nowMs: number, recoveryRating: string,
 *   personal: ({ factor: number, prior: number, pairs: number,
 *   reason: string, pairsByMuscle: object }|null), habitualWeekdays: number[]|null,
 *   typicalStartMinute: number, degraded: boolean }>}
 */
export async function loadMuscleRecovery(userId, nowMs = Date.now()) {
  const recoveryRating = readRecoveryRating();
  if (!userId) {
    return {
      map: buildMuscleRecoveryMap({ sessions: [], exerciseById: {}, recoveryRating, nowMs }),
      nowMs,
      recoveryRating,
      personal: null,
      habitualWeekdays: null,
      typicalStartMinute: DEFAULT_TRAINING_START_MINUTE,
      degraded: false,
    };
  }

  let degraded = false;
  const windowStartMs = nowMs - PERSONAL_HISTORY_DAYS * DAY_MS;
  let windowWorkouts = [];
  try {
    // Bounded in the query: completed workouts whose end (or start) falls
    // inside the window. The end bound is exclusive, hence + 1.
    windowWorkouts = await getCompletedWorkoutsBetween(userId, windowStartMs, nowMs + 1);
  } catch (e) {
    logError('recovery.load.getCompletedWorkoutsBetween', e, { userId });
    windowWorkouts = [];
    degraded = true;
  }
  const completed = selectCompletedWorkouts(windowWorkouts, windowStartMs, nowMs);

  let exercises = [];
  try {
    // Including soft-deleted custom exercises: a logged set on one still
    // fatigued the muscle it trained (Opus review finding 22; the volume
    // trend's own join is unfiltered for the same reason).
    exercises = await getAllExercisesIncludingDeleted();
  } catch (e) {
    logError('recovery.load.getAllExercises', e, {});
    exercises = [];
    degraded = true;
  }
  const exerciseById = Object.fromEntries((exercises ?? []).map((ex) => [ex.id, ex]));

  let sets = [];
  if (completed.length) {
    try {
      sets = await getWorkoutSetsForWorkoutIds(completed.map((w) => w.id));
    } catch (e) {
      logError('recovery.load.getWorkoutSetsForWorkoutIds', e, { userId });
      sets = [];
      degraded = true;
    }
  }
  const setsByWorkoutId = new Map();
  for (const s of Array.isArray(sets) ? sets : []) {
    const wid = s?.workoutId;
    if (!wid) continue;
    if (!setsByWorkoutId.has(wid)) setsByWorkoutId.set(wid, []);
    setsByWorkoutId.get(wid).push(s);
  }

  // Week rows: each workout carries its OWN mesocycle_id directly, so every
  // distinct block touched by the fetch window is read exactly once -- no
  // active-plan/mesocycle lookup needed, and a workout from an older,
  // since-finished block degrades gracefully (its week simply never
  // resolves, so weekRirTarget/isFirstWeek stay at their neutral defaults).
  const mesocycleIds = Array.from(new Set(completed.map((w) => w.mesocycleId).filter(Boolean)));
  const weekById = new Map();
  for (const mesoId of mesocycleIds) {
    try {
      // eslint-disable-next-line no-await-in-loop
      const weekRows = await getMesocycleWeeks(mesoId);
      for (const [weekId, info] of indexWeeks(weekRows)) weekById.set(weekId, info);
    } catch (e) {
      logError('recovery.load.getMesocycleWeeks', e, { mesoId });
    }
  }

  const sessions = completed.map((w) => (
    buildRecoverySession(w, setsByWorkoutId.get(w.id) ?? [], w.mesocycleWeekId ? weekById.get(w.mesocycleWeekId) : null)
  ));
  pairSorenessNext(sessions, completed);

  let habitualWeekdays = null;
  let typicalStartMinute = DEFAULT_TRAINING_START_MINUTE;
  try {
    const timestamps = await getCompletedWorkoutStartTimestamps(userId);
    habitualWeekdays = deriveHabitualTrainingWeekdays(timestamps, nowMs);
    typicalStartMinute = medianHabitStartMinute(timestamps, nowMs) ?? DEFAULT_TRAINING_START_MINUTE;
  } catch (e) {
    logError('recovery.load.habitSchedule', e, { userId });
    habitualWeekdays = null;
    typicalStartMinute = DEFAULT_TRAINING_START_MINUTE;
  }

  const personal = degraded ? null : await learnFromSessions({
    userId, sessions, exercises, exerciseById, recoveryRating, nowMs,
  });
  const map = buildMuscleRecoveryMap({
    sessions,
    exerciseById,
    recoveryRating,
    nowMs,
    personalFactor: personal?.reason === 'adjusted' ? personal.factor : null,
  });

  return {
    map, nowMs, recoveryRating, personal, habitualWeekdays, typicalStartMinute, degraded,
  };
}

// The learner's last answer (see the header): one entry, keyed by user,
// local day, recovery answer and the history's shape (learnFromSessions).
let personalMemo = null;

/** The allocator's primary-muscle normalisation (algorithms.allocateExerciseVolume), for keys that arrive raw. */
function normaliseMuscleKey(muscle) {
  const key = String(muscle ?? '').toLowerCase();
  return key === 'shoulders' ? 'side_delts' : key;
}

/**
 * The personal reading (personalRecovery.learnPersonalRecovery), or null
 * when it cannot be vouched for (see the header). Pure learner, best-effort
 * reads.
 */
async function learnFromSessions({
  userId, sessions, exercises, exerciseById, recoveryRating, nowMs,
}) {
  const newest = sessions[sessions.length - 1];
  // The history's shape: how many sessions and sets, the newest session, and
  // the sum of weight x reps, so an edited set (same count, a corrected
  // weight or rep count) re-runs the learner the same day.
  let setCount = 0;
  let workload = 0;
  for (const session of sessions) {
    for (const set of Array.isArray(session.sets) ? session.sets : []) {
      setCount += 1;
      const w = Number(set?.weight);
      const r = Number(set?.actualReps ?? set?.actual_reps);
      if (Number.isFinite(w) && Number.isFinite(r)) workload += w * r;
    }
  }
  const key = [
    userId, localDayKey(nowMs), recoveryRating, sessions.length, setCount, Math.round(workload * 100), newest?.id ?? '',
  ].join('|');
  if (personalMemo && personalMemo.key === key) return personalMemo.value;

  const excluded = new Set();
  try {
    const capRows = await getCapabilityConstraints(userId);
    // The block ledger's own precondition (blockLedgerRunner.js): no episode
    // row, nothing is constrained.
    if (Array.isArray(capRows) && capRows.some((r) => r?.role === 'episode')) {
      // Lazy, as database.getAdaptiveLandmarkHistory requires it.
      // eslint-disable-next-line global-require
      const elig = require('../capability/eligibility');
      for (const session of sessions) {
        const startMs = Number(session.startedAt);
        const endMs = Number(session.endedAt) > startMs ? Number(session.endedAt) : startMs + DEFAULT_SESSION_MS;
        // No episode active across the session or the return period before
        // it: nothing to scan the library for (anyEpisodeOverlap is the
        // module's own fast pre-check, a superset of what the scan finds).
        if (!elig.anyEpisodeOverlap(capRows, startMs - elig.REINTRODUCTION_CARRY_MS, endMs)) continue;
        for (const muscle of elig.constrainedMusclesInWindow(capRows, exercises, startMs, endMs)) {
          excluded.add(`${session.id}|${normaliseMuscleKey(muscle)}`);
        }
      }
    }
  } catch (e) {
    logError('recovery.load.capabilityConstraints', e, { userId });
    return null;
  }
  try {
    const value = learnPersonalRecovery({
      sessions, exerciseById, recoveryRating, nowMs, excluded,
    });
    personalMemo = { key, value };
    return value;
  } catch (e) {
    logError('recovery.load.learnPersonalRecovery', e, { userId });
    return null;
  }
}

/** Test seam: forget the learner's memo. */
export function __resetPersonalMemoForTests() {
  personalMemo = null;
}

/**
 * Planned PRIMARY sets per muscle, per routine, for the given routine ids
 * -- the ONLY other I/O `recommendNextWorkout` needs
 * (`plannedSetsByRoutine`). Kept in this loader (the domain's one I/O
 * file) rather than in the screen, so Home still only composes.
 *
 * PRIMARY sets only (spec 3.3 / 4.2 "primary-loaded"; Opus review finding
 * 12): a hinge's half-credit to the back must never make a lower day read
 * "Back is estimated 20% recovered" or exclude it as sharing a limiting
 * muscle. The role comes from the same allocateExerciseVolume every
 * volume surface uses, so muscle keys stay normalised the same way.
 *
 * UNKNOWN IS NULL, NEVER `{}` (lead review; Opus review finding 11): a
 * routine whose read failed, that has no exercise rows at all, whose rows
 * include an exercise that no longer resolves (no primary muscle), or that
 * allocates no primary sets to any muscle, is `null`. `recommendNextWorkout`
 * reads `null` as unknown and never treats it as a candidate, nor as
 * evidence that `programmeNext` itself is ready. `{}` would read as
 * "genuinely nothing to recover" and win as the safest choice.
 *
 * @param {string[]} routineIds
 * @returns {Promise<object>} { [routineId]: { [muscle]: primarySets } | null }
 */
export async function loadPlannedSetsByRoutine(routineIds) {
  const ids = Array.from(new Set((Array.isArray(routineIds) ? routineIds : []).filter(Boolean)));
  const result = {};
  for (const routineId of ids) {
    try {
      // eslint-disable-next-line no-await-in-loop
      const rows = await getRoutineExercisesWithDetails(routineId);
      result[routineId] = primarySetsFromRoutineRows(rows);
    } catch (e) {
      logError('recovery.load.loadPlannedSetsByRoutine', e, { routineId });
      result[routineId] = null;
    }
  }
  return result;
}

/**
 * { [muscle]: primary sets } from getRoutineExercisesWithDetails rows, or
 * null when the routine is unknown (see loadPlannedSetsByRoutine). Pure
 * and exported so it is directly unit-testable with plain fixtures.
 */
export function primarySetsFromRoutineRows(rows) {
  const list = Array.isArray(rows) ? rows : [];
  if (!list.length) return null;
  const out = {};
  for (const row of list) {
    const sets = Number(row?.routineExercise?.recommendedSets ?? row?.routineExercise?.recommended_sets);
    const exercise = row?.exercise ?? null;
    if (!exercise || !exercise.primaryMuscle) return null; // an unresolved exercise: unknown
    if (!Number.isFinite(sets) || sets <= 0) continue;
    for (const alloc of allocateExerciseVolume(exercise)) {
      if (!alloc?.muscle || alloc.role !== 'primary') continue;
      out[alloc.muscle] = (out[alloc.muscle] || 0) + sets * alloc.sets;
    }
  }
  return Object.keys(out).length ? out : null;
}
