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
 *    week whose is_deload is set. D219 (design 4.13): the model no longer
 *    reads it (novelty, a new exercise or a layoff, replaced the first-week
 *    factor); it is still derived and carried so the session shape and the
 *    personal learner's memo key do not change.
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
 * the extra days never contribute to the live reading's residual. They are
 * not wasted: D219's novelty (muscleRecoveryModel.sessionMuscleTerms) reads
 * the whole fetched history to tell a new exercise, or a layoff of 21 days
 * or more, from a familiar one, so a session in the live window is judged
 * against at least 112 days (16 weeks) of earlier sessions. The window is
 * applied IN THE QUERY (getCompletedWorkoutsBetween), never by reading the
 * whole workouts table and filtering in JavaScript (Opus review finding 17:
 * Home and Consistency each do this on every focus).
 *
 * THE PERSONAL FACTOR (register D210, spec 14-PERSONAL-LEARNING-V2.md). The
 * learner runs over the same sessions, at most once per user, local day,
 * recovery answer and everything it reads from the history (a module-level
 * memo keyed by personalMemoKey: Home, Progress and the Recovery place all
 * read this loader, and the first build's fit on every focus cost up to
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
 *
 * THE PAUSE (D219, learner design 06 section 2.5; founder answer 2026-10-05,
 * "Pause it then"). While calm mode is on or an ED-pattern flag is open, the
 * learner does not move: it is not run, nothing it would learn is kept, and
 * the reading in effect stays as it was. readLearnerPause reads both the way
 * blockLedgerRunner.readSuppression does, and FAILS CLOSED: a read that fails
 * counts as a pause. What "as it was" is, stated for what each reader can
 * see: the screens keep the learner's last reading this app process holds for
 * the person (the daily memo; a cold start under a pause has none, and the map
 * then reads on the recovery answer alone, which is the safe direction); the
 * planner keeps the factor its current plan was built on (the plan's own
 * `builtFactor`, which is stored), so a block boundary under a pause neither
 * learns a factor nor loses one. The read sits here, where the learner is
 * run, and in no ED module (edIsolation.guard.test.js keeps them from
 * importing this domain); the learner itself (personalRecovery.js) stays pure.
 *
 * THE DAY'S CHIPS (D219, learner design 06 section 2.3). Each session carries
 * the sleep and energy chips the person tapped on the start sheet
 * (`walkedIn`, 2 to 4 or null): the learner's day-effect covariates, never
 * read by the clock and never a recovery marker. Soreness is not among them.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getCompletedWorkoutsBetween, getWorkoutSetsForWorkoutIds, getAllExercisesIncludingDeleted,
  getMesocycleWeeks, getRoutineExercisesWithDetails, getCompletedWorkoutStartTimestamps,
  getCapabilityConstraints, getOpenEdPatternFlag,
} from '../database';
import { buildExerciseLookup } from '../exercise/lookup';
import { isCalm, WELLBEING_KEY } from '../wellbeing';
import { logError } from '../errorLog';
import { localWeekStartMs, localDayKey } from '../dayKey';
import { allocateExerciseVolume } from '../algorithms';
import {
  deriveHabitualTrainingWeekdays, HABIT_WINDOW_WEEKS, MIN_HISTORY_WEEKS,
} from '../notifications/trainingHabitSchedule';
import { buildMuscleRecoveryMap } from './muscleRecoveryModel';
import { DEFAULT_TRAINING_START_MINUTE } from './constants';
import { learnPersonalRecovery, PERSONAL_HISTORY_DAYS } from './personalRecovery';
import { plannerLearnedFactor, ownGapsFromHistory } from './planPersonalisation';
import { ROTATION } from '../plan/science';

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
 * `walkedIn` (D219) carries the start sheet's sleep and energy chips.
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
    // How the person walked in, from the start sheet (2 to 4, null when the
    // chip was skipped): the learner's day-effect covariates. Soreness is not
    // here: it is a mediator of recovery and the learner never adjusts for it.
    walkedIn: {
      sleep: workout.sleepQuality ?? null,
      energy: workout.energyScore ?? null,
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
 *   typicalStartMinute: number, degraded: boolean, learnerPaused: boolean }>}
 *   `learnerPaused` is true while calm mode is on, an ED-pattern flag is open
 *   or either read failed: `personal` is then the reading held from before
 *   (or null), never a new one (see THE PAUSE in the header)
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
      learnerPaused: false,
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
  // D218 (founder order 2026-10-03, register ruling S3): the estimate resolves
  // a set exactly as the per-muscle "Trained N days ago" line beside it does
  // (the shared exercise lookup over these same unfiltered rows: a retired id
  // answers with its survivor, and a set whose id no row carries is read by
  // its own name snapshot), so the line and the estimate count the same
  // sessions. The map keeps its plain shape for the pure modules below.
  const exerciseLookup = buildExerciseLookup(exercises ?? []);
  const exerciseById = Object.fromEntries(exerciseLookup.byId);

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
  sets = (Array.isArray(sets) ? sets : []).map((s) => {
    const id = s?.exerciseId ?? s?.exercise_id;
    if (id == null || exerciseById[id]) return s;
    const row = exerciseLookup.resolve(s);
    return row?.id ? { ...s, exerciseId: row.id } : s;
  });
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

  // The pause is read once, here, right before the learner would run, and
  // whatever the answer it is returned: the planner's reader needs it even
  // when a core read failed (see loadPlanPersonalisation).
  const learnerPaused = await readLearnerPause(userId);
  let personal = null;
  if (learnerPaused) personal = heldReading(userId);
  else if (!degraded) {
    personal = await learnFromSessions({
      userId, sessions, exercises, exerciseById, recoveryRating, nowMs,
    });
  }
  const map = buildMuscleRecoveryMap({
    sessions,
    exerciseById,
    recoveryRating,
    nowMs,
    personalFactor: personal?.reason === 'adjusted' ? personal.factor : null,
  });

  return {
    map, nowMs, recoveryRating, personal, habitualWeekdays, typicalStartMinute, degraded, learnerPaused,
  };
}

/**
 * Is the learner paused? True while calm mode is on or an ED-pattern flag is
 * open, and FAIL CLOSED: a flag read or a wellbeing read that fails (or throws
 * before it can fail) counts as a pause, so a possibly-flagged person never
 * has the learner move because a read timed out. The same two reads, and the
 * same rule, as blockLedgerRunner.readSuppression (D219, learner design 06
 * section 2.5; founder answer 2026-10-05, "Pause it then").
 *
 * @param {string} userId
 * @returns {Promise<boolean>}
 */
export async function readLearnerPause(userId) {
  try {
    const edFlag = await getOpenEdPatternFlag(userId).catch((e) => {
      logError('recovery.load.learnerPause.edFlag', e, { userId });
      return 'read_failed';
    });
    const wellbeing = await AsyncStorage.getItem(WELLBEING_KEY)
      .then((v) => v || 'unspecified')
      .catch((e) => {
        logError('recovery.load.learnerPause.wellbeing', e, {});
        return 'read_failed';
      });
    return !!edFlag || wellbeing === 'read_failed' || isCalm(wellbeing);
  } catch (e) {
    // The read itself could not start (a missing function, a throw before a
    // promise exists): the same answer as a failed read.
    logError('recovery.load.learnerPause', e, { userId });
    return true;
  }
}

/**
 * D219 (design 4.13 and 4.6, S F14, lane R3 item 3): what the planner may be
 * told about this person at a build, a rebuild and a block boundary, never
 * mid-block (nothing re-runs the planner on its own). The planner takes plain
 * numbers, so this reads and answers:
 *  - learnedFactor: the personal learner's factor through S F14's safeguards
 *    (planPersonalisation.plannerLearnedFactor: the gate passed, 12 weeks of
 *    history from the person's FIRST completed workout, 3 muscles, a move of
 *    0.10 from `builtOnFactor`, the value the current plan was built on), or
 *    null, which is the start (their recovery answer). A degraded read or a
 *    failed learner never gives a factor: the start is the safe direction.
 *    While the learner is paused (calm mode on, an ED flag open, a failed
 *    read of either: readLearnerPause) the factor is `builtOnFactor` itself:
 *    the plan keeps what it was built on, whatever the learner would say.
 *  - ownGaps: the median hours the person leaves after each slot of their
 *    rotation over the last 8 weeks (planPersonalisation.ownGapsFromHistory),
 *    or null when 8 sessions in 8 weeks are not there. A workout's slot is its
 *    routine's position in the old rotation (`routineIdsInOrder`), used only
 *    when that rotation has as many sessions as the new plan; otherwise the
 *    person's median gap between any two sessions stands for every slot.
 * The factor never changes a weekly target, calories, weight, food or
 * notifications (planner.js holds that); it only orders the rotation and
 * scales the readiness shown. Every read is best-effort and nothing throws: a
 * failure leaves the planner exactly where it stood before.
 *
 * @param {string} userId
 * @param {object} args
 * @param {number} args.sessionsPerWeek    the new plan's number of sessions
 * @param {string[]} [args.routineIdsInOrder]  the old plan's routines, in rotation order
 * @param {?number} [args.builtOnFactor]   the factor the current plan was built on
 * @param {number} [args.nowMs]
 * @returns {Promise<{ learnedFactor: ?number, ownGaps: ?number[] }>}
 */
export async function loadPlanPersonalisation(userId, {
  sessionsPerWeek, routineIdsInOrder = [], builtOnFactor = null, nowMs = Date.now(),
} = {}) {
  const out = { learnedFactor: null, ownGaps: null };
  if (!userId) return out;

  try {
    const recovery = await loadMuscleRecovery(userId, nowMs);
    if (recovery.learnerPaused) {
      // Paused (calm mode, an open ED flag, or a failed read: D219, learner
      // design 06 section 2.5): nothing is learned and nothing is lost. The
      // plan keeps the factor it was built on, the one number about the
      // learner that is stored, whatever the learner's own reading is.
      out.learnedFactor = Number.isFinite(builtOnFactor) ? builtOnFactor : null;
    } else if (!recovery.degraded && recovery.personal) {
      const timestamps = (await getCompletedWorkoutStartTimestamps(userId)).filter((t) => Number.isFinite(t));
      const first = timestamps.length ? Math.min(...timestamps) : null;
      const historyDays = first === null ? 0 : (nowMs - first) / DAY_MS;
      out.learnedFactor = plannerLearnedFactor({ personal: recovery.personal, historyDays, builtOnFactor }).factor;
    }
  } catch (e) {
    logError('recovery.load.planPersonalisation.factor', e, { userId });
    out.learnedFactor = null;
  }

  try {
    const windowStartMs = nowMs - ROTATION.ownGapsWindowWeeks * WEEK_MS;
    const completed = selectCompletedWorkouts(
      await getCompletedWorkoutsBetween(userId, windowStartMs, nowMs + 1), windowStartMs, nowMs,
    );
    const order = Array.isArray(routineIdsInOrder) ? routineIdsInOrder : [];
    const slotOf = new Map(order.map((id, i) => [id, i]));
    const slotted = order.length > 0 && order.length === Math.round(Number(sessionsPerWeek));
    out.ownGaps = ownGapsFromHistory({
      sessions: completed.map((w) => ({
        startedAt: Number(w.startedAt),
        slot: slotted && slotOf.has(w.routineId) ? slotOf.get(w.routineId) : null,
      })),
      sessionsPerWeek,
      nowMs,
    });
  } catch (e) {
    logError('recovery.load.planPersonalisation.gaps', e, { userId });
    out.ownGaps = null;
  }
  return out;
}

// The learner's last answer (see the header): one entry, keyed by
// everything it reads (personalMemoKey), and by whom it is for (`userId`), so
// a pause can hold it for that person and no one else (heldReading).
let personalMemo = null;

/**
 * The reading a pause holds: the learner's last answer for THIS person, or
 * null when this process has none (a cold start under a pause). Never a new
 * reading, never a write.
 */
function heldReading(userId) {
  return personalMemo && personalMemo.userId === userId ? personalMemo.value : null;
}

/** The allocator's primary-muscle normalisation (algorithms.allocateExerciseVolume), for keys that arrive raw. */
function normaliseMuscleKey(muscle) {
  const key = String(muscle ?? '').toLowerCase();
  return key === 'shoulders' ? 'side_delts' : key;
}

/**
 * The `${sessionId}|${muscle}` pairs an injury limit leaves out of the
 * learning: a session under an episode for that muscle, or inside the
 * 14-day return period after one (the CC30 rule, capability/eligibility),
 * from the injury rows already read.
 */
function excludedEvidence(capRows, sessions, exercises) {
  const excluded = new Set();
  if (!hasEpisode(capRows)) return excluded;
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
  return excluded;
}

/** The block ledger's own precondition (blockLedgerRunner.js): no episode row, nothing is constrained. */
function hasEpisode(capRows) {
  return Array.isArray(capRows) && capRows.some((r) => r?.role === 'episode');
}

/**
 * What the injury scan reads besides the sessions: the injury rows as
 * stored, and, only when there is an episode to scan for, the exercise
 * library's size and newest edit (every edit a person can make stamps
 * updated_at; a library migration runs at start-up, before any memo).
 */
function injuryInputsKey(capRows, exercises) {
  const rows = Array.isArray(capRows) ? capRows : [];
  if (!hasEpisode(rows)) return JSON.stringify(rows);
  let newest = 0;
  let removed = 0;
  const library = Array.isArray(exercises) ? exercises : [];
  for (const e of library) {
    const t = Number(e?.updatedAt ?? e?.updated_at ?? e?.createdAt ?? e?.created_at);
    if (Number.isFinite(t) && t > newest) newest = t;
    if (e?.deletedAt ?? e?.deleted_at) removed += 1;
  }
  return `${JSON.stringify(rows)}|${library.length}|${removed}|${newest}`;
}

/**
 * Everything the learner reads, as one string: the user, the local day and
 * the phone's time zone (weekdays are local), the recovery answer, the
 * injury inputs (injuryInputsKey), and for each session the fields its
 * pairing, its outcome and its curve read (times, the week's target, first
 * week and recovery week, the ratings, and each set's exercise, type,
 * weight, reps, order and whether it was typed, and the session's start-sheet
 * chips), with the exercises those sets name and their names. Any change
 * to any of them, a set corrected, a rating added, a week turned into a
 * recovery week, an injury limit logged or backdated, re-runs the learner
 * the same day (review of 2026-09-26: a shorter key missed all of these
 * until the next day).
 */
function personalMemoKey({
  userId, nowMs, recoveryRating, sessions, exerciseById, injuryKey,
}) {
  const parts = [userId, localDayKey(nowMs), new Date(nowMs).getTimezoneOffset(), recoveryRating, injuryKey];
  const named = new Set();
  for (const session of sessions) {
    const r = session.ratings ?? {};
    parts.push([
      session.id, session.startedAt, session.endedAt, session.durationMinutes, session.weekRirTarget,
      session.isFirstWeek, session.isDeload, session.weekStatus, r.fatigue, r.joint, r.sorenessNext,
      session.walkedIn?.sleep, session.walkedIn?.energy,
    ].join('|'));
    for (const set of Array.isArray(session.sets) ? session.sets : []) {
      const exerciseId = set?.exerciseId ?? set?.exercise_id;
      named.add(exerciseId);
      parts.push([
        set?.id, exerciseId, set?.setType ?? set?.set_type, set?.evidenceClass ?? set?.evidence_class,
        set?.weight, set?.actualReps ?? set?.actual_reps, set?.setNumber ?? set?.set_number,
        set?.createdAt ?? set?.created_at, set?.deletedAt ?? set?.deleted_at,
        set?.entryTyped ?? set?.entry_typed,
      ].join('|'));
    }
  }
  for (const id of named) {
    const e = exerciseById?.[id];
    parts.push(e ? [
      id, e.primaryMuscle ?? e.primary_muscle, JSON.stringify(e.secondaryMuscles ?? e.secondary_muscles ?? null),
      e.loadSemantics ?? e.load_semantics, e.exerciseType ?? e.exercise_type,
      // The long-length term reads the exercise's name (constants.isLongLengthExercise).
      e.name,
    ].join('|') : `${id}|none`);
  }
  return parts.join('\n');
}

/**
 * The personal reading (personalRecovery.learnPersonalRecovery), or null
 * when it cannot be vouched for (see the header). Pure learner, best-effort
 * reads.
 */
async function learnFromSessions({
  userId, sessions, exercises, exerciseById, recoveryRating, nowMs,
}) {
  // The injury rows are read on every call, so a limit logged or backdated
  // today counts at once (CC30); the scan over the library they need runs
  // only when the key has changed (review of 2026-09-26: run on every focus
  // it cost up to 190 ms without a JIT).
  let capRows;
  try {
    capRows = await getCapabilityConstraints(userId);
  } catch (e) {
    logError('recovery.load.capabilityConstraints', e, { userId });
    return null;
  }
  const key = personalMemoKey({
    userId, nowMs, recoveryRating, sessions, exerciseById, injuryKey: injuryInputsKey(capRows, exercises),
  });
  if (personalMemo && personalMemo.key === key && personalMemo.userId === userId) return personalMemo.value;
  try {
    const excluded = excludedEvidence(capRows, sessions, exercises);
    const value = learnPersonalRecovery({
      sessions, exerciseById, recoveryRating, nowMs, excluded,
    });
    personalMemo = { key, value, userId };
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
 * D219 (design 4.14): for a plan the new planner built, a session's sets in
 * the forecast are the sets the plan SERVES this week, not `recommended_sets`
 * (the week-1 count, which week 5 serves up to twice over). The numbers come
 * from the caller, never from here: `resolveServed(routineId, rows)` answers
 * { [routineExerciseId]: sets } for a plan with facts (sessionAdjustments.
 * servedSetsResolver) or null, so this module imports neither the plan's serve
 * path nor coachApply. A resolver that answers null, throws or is absent leaves
 * the stored sets (every other plan, and a failed read, forecast as before).
 *
 * @param {string[]} routineIds
 * @param {function(string, Array): Promise<?Object<string, number>>} [resolveServed]
 * @returns {Promise<object>} { [routineId]: { [muscle]: primarySets } | null }
 */
export async function loadPlannedSetsByRoutine(routineIds, resolveServed = null) {
  const ids = Array.from(new Set((Array.isArray(routineIds) ? routineIds : []).filter(Boolean)));
  const result = {};
  for (const routineId of ids) {
    try {
      // eslint-disable-next-line no-await-in-loop
      const rows = await getRoutineExercisesWithDetails(routineId);
      let served = null;
      if (typeof resolveServed === 'function') {
        try {
          // eslint-disable-next-line no-await-in-loop
          served = await resolveServed(routineId, rows);
        } catch (e) {
          // Best-effort: the stored sets still forecast (the pre-D219 reading).
          logError('recovery.load.servedSets', e, { routineId });
          served = null;
        }
      }
      result[routineId] = primarySetsFromRoutineRows(rows, served);
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
 *
 * `served` (D219, design 4.14): { [routineExerciseId]: sets } for a plan the
 * new planner built, the sets this week serves. A row it names (a number of
 * one or more) counts its served sets; every other row, and every row when
 * `served` is absent, counts its stored `recommended_sets` as before.
 */
export function primarySetsFromRoutineRows(rows, served = null) {
  const list = Array.isArray(rows) ? rows : [];
  if (!list.length) return null;
  const out = {};
  for (const row of list) {
    const servedSets = served && typeof served === 'object' ? Number(served[row?.routineExercise?.id]) : NaN;
    const sets = Number.isFinite(servedSets) && servedSets >= 1
      ? servedSets
      : Number(row?.routineExercise?.recommendedSets ?? row?.routineExercise?.recommended_sets);
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
