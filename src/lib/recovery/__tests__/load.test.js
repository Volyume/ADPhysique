/**
 * load.test.js -- the recovery domain's one I/O file (register D201, spec
 * docs/recovery-programme-2026-09-25/00-SPEC.md section 7).
 *
 * Two layers, tested separately:
 *  - the PURE helpers (buildRecoverySession, pairSorenessNext, indexWeeks,
 *    medianHabitStartMinute) get direct, plain-fixture unit tests -- no
 *    database mocking needed to exercise the tricky bits (isFirstWeek,
 *    the joint-discomfort fallback, the 96-hour soreness-pairing window,
 *    the six-week median).
 *  - loadMuscleRecovery / loadPlannedSetsByRoutine get integration tests
 *    over a mocked database module: the fetch window, the mesocycleId ->
 *    week-row wiring, and every best-effort fallback (a failed read gives a
 *    map built from what did load, never a crash).
 *
 * database.js and trainingHabitSchedule.js (transitively, trainingReminders
 * -> expo-notifications/react-native) are mocked; every pure lib module
 * (dayKey, algorithms, planVolumeTargets, muscleRecoveryModel, constants) is
 * the REAL one, matching this repo's "mock I/O, run the real engine"
 * convention (see muscleRecoveryModel.test.js). The personal learner and the
 * capability eligibility module are the real ones too, wrapped in spies so
 * the wiring (what the loader hands the learner, and what it does with the
 * answer) can be observed (register D210).
 */
jest.mock('react-native', () => ({ Platform: { OS: 'android' } }));
jest.mock('expo-notifications', () => ({
  scheduleNotificationAsync: jest.fn(() => Promise.resolve('id')),
  cancelScheduledNotificationAsync: jest.fn(() => Promise.resolve()),
  getAllScheduledNotificationsAsync: jest.fn(() => Promise.resolve([])),
  getPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  setNotificationChannelAsync: jest.fn(() => Promise.resolve()),
  AndroidImportance: { HIGH: 4, LOW: 2 },
  SchedulableTriggerInputTypes: { WEEKLY: 'weekly' },
}));

const mockDb = {
  getCompletedWorkoutsBetween: jest.fn(async () => []),
  getWorkoutSetsForWorkoutIds: jest.fn(async () => []),
  getAllExercisesIncludingDeleted: jest.fn(async () => []),
  getMesocycleWeeks: jest.fn(async () => []),
  getRoutineExercisesWithDetails: jest.fn(async () => []),
  getCompletedWorkoutStartTimestamps: jest.fn(async () => []),
  getCapabilityConstraints: jest.fn(async () => []),
};
jest.mock('../../database', () => mockDb);

jest.mock('../personalRecovery', () => {
  const actual = jest.requireActual('../personalRecovery');
  return { ...actual, learnPersonalRecovery: jest.fn(actual.learnPersonalRecovery) };
});
jest.mock('../../capability/eligibility', () => {
  const actual = jest.requireActual('../../capability/eligibility');
  return { ...actual, constrainedMusclesInWindow: jest.fn(actual.constrainedMusclesInWindow) };
});

let mockStoreProfile = { recoveryRating: 'average' };
jest.mock('../../../store/useAppStore', () => ({
  __esModule: true,
  default: { getState: () => ({ userProfile: mockStoreProfile }) },
}));

const {
  loadMuscleRecovery, loadPlannedSetsByRoutine, primarySetsFromRoutineRows,
  buildRecoverySession, pairSorenessNext, indexWeeks, medianHabitStartMinute,
  __resetPersonalMemoForTests,
} = require('../load');
const { localWeekStartMs } = require('../../dayKey');
const personalRecovery = require('../personalRecovery');
const eligibility = require('../../capability/eligibility');
const { PERSONAL_HISTORY_DAYS } = personalRecovery;

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;
const HOUR_MS = 60 * 60 * 1000;

beforeEach(() => {
  jest.clearAllMocks();
  mockDb.getCompletedWorkoutsBetween.mockResolvedValue([]);
  mockDb.getWorkoutSetsForWorkoutIds.mockResolvedValue([]);
  mockDb.getAllExercisesIncludingDeleted.mockResolvedValue([]);
  mockDb.getMesocycleWeeks.mockResolvedValue([]);
  mockDb.getRoutineExercisesWithDetails.mockResolvedValue([]);
  mockDb.getCompletedWorkoutStartTimestamps.mockResolvedValue([]);
  mockDb.getCapabilityConstraints.mockResolvedValue([]);
  mockStoreProfile = { recoveryRating: 'average' };
  __resetPersonalMemoForTests();
});

// ─── Pure helpers ───────────────────────────────────────────────────────────

describe('buildRecoverySession', () => {
  test('carries the workout fields straight through, and this session\'s own sorenessNext starts null', () => {
    const workout = {
      id: 'w1', startedAt: 1000, endedAt: 2000, durationMinutes: 60, fatigueLevel: 4, jointDiscomfort: 2,
    };
    const session = buildRecoverySession(workout, [], { rirTarget: 2, isFirstWeek: true });
    expect(session).toEqual({
      id: 'w1', startedAt: 1000, endedAt: 2000, durationMinutes: 60, sets: [],
      weekRirTarget: 2, isFirstWeek: true, isDeload: false, weekStatus: 'none',
      ratings: { fatigue: 4, joint: 2, sorenessNext: null },
    });
  });

  test('weekStatus (D210): none outside a plan, resolved when the week row was found, unresolved when it was not', () => {
    expect(buildRecoverySession({ id: 'a', startedAt: 1 }, [], null).weekStatus).toBe('none');
    expect(buildRecoverySession({ id: 'b', startedAt: 1, mesocycleWeekId: 'wk1' }, [], { rirTarget: 2, isFirstWeek: false })
      .weekStatus).toBe('resolved');
    expect(buildRecoverySession({ id: 'c', startedAt: 1, mesocycleWeekId: 'wk1' }, [], null).weekStatus).toBe('unresolved');
  });

  test('isDeload (D210) rides through from the week row, false when there is none', () => {
    expect(buildRecoverySession({ id: 'a', startedAt: 1, mesocycleWeekId: 'wk6' }, [], {
      rirTarget: 4, isFirstWeek: false, isDeload: true,
    }).isDeload).toBe(true);
    expect(buildRecoverySession({ id: 'b', startedAt: 1 }, [], null).isDeload).toBe(false);
  });

  test('joint discomfort falls back to the MAX across this session\'s own sets when the workout-level answer is absent', () => {
    const workout = { id: 'w1', startedAt: 1000, fatigueLevel: null, jointDiscomfort: null };
    const sets = [{ jointDiscomfort: 1 }, { jointDiscomfort: 3 }, { jointDiscomfort: null }];
    const session = buildRecoverySession(workout, sets, null);
    expect(session.ratings.joint).toBe(3);
  });

  test('joint discomfort is null when neither the workout nor any set answered it', () => {
    const workout = { id: 'w1', startedAt: 1000 };
    const session = buildRecoverySession(workout, [{ jointDiscomfort: null }], null);
    expect(session.ratings.joint).toBeNull();
  });

  test('an unresolved week (older, since-finished block) degrades to neutral defaults, not a crash', () => {
    const workout = { id: 'w1', startedAt: 1000 };
    const session = buildRecoverySession(workout, [], null);
    expect(session.weekRirTarget).toBeNull();
    expect(session.isFirstWeek).toBe(false);
  });
});

describe('pairSorenessNext', () => {
  test('attributes the NEXT session\'s soreness24hBefore when it started within 96 hours', () => {
    const sessions = [
      { ratings: { sorenessNext: null } },
      { ratings: { sorenessNext: null } },
    ];
    const workouts = [
      { startedAt: 0 },
      { startedAt: 48 * HOUR_MS, soreness24hBefore: 3 },
    ];
    pairSorenessNext(sessions, workouts);
    expect(sessions[0].ratings.sorenessNext).toBe(3);
    expect(sessions[1].ratings.sorenessNext).toBeNull(); // no third session to pair from
  });

  test('a gap beyond 96 hours carries no evidence: stays null', () => {
    const sessions = [{ ratings: { sorenessNext: null } }, { ratings: { sorenessNext: null } }];
    const workouts = [{ startedAt: 0 }, { startedAt: 97 * HOUR_MS, soreness24hBefore: 3 }];
    pairSorenessNext(sessions, workouts);
    expect(sessions[0].ratings.sorenessNext).toBeNull();
  });

  test('exactly 96 hours still counts (inclusive boundary)', () => {
    const sessions = [{ ratings: { sorenessNext: null } }, { ratings: { sorenessNext: null } }];
    const workouts = [{ startedAt: 0 }, { startedAt: 96 * HOUR_MS, soreness24hBefore: 2 }];
    pairSorenessNext(sessions, workouts);
    expect(sessions[0].ratings.sorenessNext).toBe(2);
  });

  test('the last session in the list has no next session to pair from', () => {
    const sessions = [{ ratings: { sorenessNext: null } }];
    const workouts = [{ startedAt: 0 }];
    pairSorenessNext(sessions, workouts);
    expect(sessions[0].ratings.sorenessNext).toBeNull();
  });
});

describe('indexWeeks', () => {
  test('week_index 1 is always the first week', () => {
    const weeks = indexWeeks([{ id: 'wk1', week_index: 1, is_deload: 0, rir_target: 2 }]);
    expect(weeks.get('wk1')).toEqual({ rirTarget: 2, isFirstWeek: true, isDeload: false });
  });

  test('a middle week (no preceding deload) is not a first week', () => {
    const weeks = indexWeeks([
      { id: 'wk1', week_index: 1, is_deload: 0, rir_target: 2 },
      { id: 'wk2', week_index: 2, is_deload: 0, rir_target: 1 },
    ]);
    expect(weeks.get('wk2')).toEqual({ rirTarget: 1, isFirstWeek: false, isDeload: false });
  });

  test('the week immediately after a deload/recovery week IS a first week', () => {
    const weeks = indexWeeks([
      { id: 'wk1', week_index: 1, is_deload: 0, rir_target: 2 },
      { id: 'wk2', week_index: 2, is_deload: 1, rir_target: 3 }, // the recovery week
      { id: 'wk3', week_index: 3, is_deload: 0, rir_target: 2 },
    ]);
    expect(weeks.get('wk3').isFirstWeek).toBe(true);
  });

  test('rows out of order are sorted by week_index before the deload propagation runs', () => {
    const weeks = indexWeeks([
      { id: 'wk3', week_index: 3, is_deload: 0, rir_target: 2 },
      { id: 'wk2', week_index: 2, is_deload: 1, rir_target: 3 },
      { id: 'wk1', week_index: 1, is_deload: 0, rir_target: 2 },
    ]);
    expect(weeks.get('wk3').isFirstWeek).toBe(true);
    expect(weeks.get('wk1').isFirstWeek).toBe(true);
    expect(weeks.get('wk2').isFirstWeek).toBe(false);
  });

  test('an absent rir_target reads as null (unknown), not zero', () => {
    const weeks = indexWeeks([{ id: 'wk1', week_index: 1, is_deload: 0, rir_target: null }]);
    expect(weeks.get('wk1').rirTarget).toBeNull();
  });
});

describe('medianHabitStartMinute', () => {
  const NOW = new Date(2026, 2, 16, 12, 0, 0).getTime();
  const CURRENT_WEEK_START = localWeekStartMs(NOW);
  const at = (weeksAgo, dayOffset, hour, minute) => (
    CURRENT_WEEK_START - weeksAgo * WEEK_MS + dayOffset * DAY_MS + hour * 60 * 60 * 1000 + minute * 60 * 1000
  );

  test('insufficient history (fewer than MIN_HISTORY_WEEKS full weeks) returns null', () => {
    const timestamps = [at(0, 1, 18, 0)]; // inside the CURRENT week -- never counted
    expect(medianHabitStartMinute(timestamps, NOW)).toBeNull();
  });

  test('the median minute-of-day over the six-week window, odd count', () => {
    const timestamps = [at(1, 0, 18, 0), at(2, 0, 19, 0), at(3, 0, 20, 0)];
    // sorted minutes: 1080, 1140, 1200 -> median 1140 (19:00)
    expect(medianHabitStartMinute(timestamps, NOW)).toBe(19 * 60);
  });

  test('an even count averages the two middle values', () => {
    const timestamps = [at(1, 0, 18, 0), at(2, 0, 19, 0)];
    // 1080 and 1140 -> average 1110 (18:30)
    expect(medianHabitStartMinute(timestamps, NOW)).toBe(18 * 60 + 30);
  });

  test('a timestamp inside the CURRENT (in-progress) week is excluded from the median', () => {
    const timestamps = [at(1, 0, 18, 0), at(2, 0, 18, 0), at(0, 1, 6, 0)]; // the last one is "today"
    expect(medianHabitStartMinute(timestamps, NOW)).toBe(18 * 60);
  });

  test('only the trailing HABIT_WINDOW_WEEKS weeks are considered, not the full history', () => {
    // A session 10 weeks ago at a wildly different time must not move the
    // median once at least HABIT_WINDOW_WEEKS (6) full weeks of MORE RECENT
    // history exist.
    const timestamps = [
      at(10, 0, 3, 0),
      at(1, 0, 18, 0), at(2, 0, 18, 0), at(3, 0, 18, 0),
      at(4, 0, 18, 0), at(5, 0, 18, 0), at(6, 0, 18, 0),
    ];
    expect(medianHabitStartMinute(timestamps, NOW)).toBe(18 * 60);
  });
});

// ─── loadMuscleRecovery / loadPlannedSetsByRoutine ────────────────────────

describe('loadMuscleRecovery', () => {
  const NOW = new Date(2026, 2, 16, 12, 0, 0).getTime();

  test('no userId: a calm, fully-recovered default shape, never a crash', async () => {
    const result = await loadMuscleRecovery(null, NOW);
    expect(result.nowMs).toBe(NOW);
    expect(result.recoveryRating).toBe('average');
    expect(result.habitualWeekdays).toBeNull();
    expect(result.map.quads.status).toBe('no_recent_session');
    expect(mockDb.getCompletedWorkoutsBetween).not.toHaveBeenCalled();
  });

  test('reads the profile\'s recoveryRating from the store', async () => {
    mockStoreProfile = { recoveryRating: 'poor' };
    const result = await loadMuscleRecovery('u1', NOW);
    expect(result.recoveryRating).toBe('poor');
  });

  test('a completed workout within the window contributes to the map for the muscle it loaded', async () => {
    const startedAt = NOW - 2 * DAY_MS;
    mockDb.getCompletedWorkoutsBetween.mockResolvedValue([
      { id: 'w1', userId: 'u1', isCompleted: 1, deletedAt: null, startedAt, endedAt: startedAt + 3600000, mesocycleId: null, mesocycleWeekId: null },
    ]);
    mockDb.getAllExercisesIncludingDeleted.mockResolvedValue([{ id: 'ex1', primaryMuscle: 'quads', secondaryMuscles: [] }]);
    mockDb.getWorkoutSetsForWorkoutIds.mockResolvedValue([
      { id: 's1', workoutId: 'w1', exerciseId: 'ex1', setType: 'straight', actualReps: 8, weight: 100 },
      { id: 's2', workoutId: 'w1', exerciseId: 'ex1', setType: 'straight', actualReps: 8, weight: 100 },
    ]);
    const result = await loadMuscleRecovery('u1', NOW);
    expect(result.map.quads.status).not.toBe('no_recent_session');
    expect(result.map.quads.recoveredPercent).toBeLessThan(100);
    expect(result.map.chest.status).toBe('no_recent_session');
  });

  test('a workout older than the model\'s own 14-day lookback never contributes to the reading', async () => {
    // Inside the learner's wider history window (D210), which the loader
    // reads, but the map re-applies its own LOOKBACK_DAYS cutoff.
    const startedAt = NOW - 30 * DAY_MS;
    mockDb.getCompletedWorkoutsBetween.mockResolvedValue([
      { id: 'w1', userId: 'u1', isCompleted: 1, deletedAt: null, startedAt, endedAt: startedAt + 3600000 },
    ]);
    mockDb.getAllExercisesIncludingDeleted.mockResolvedValue([{ id: 'ex1', primaryMuscle: 'quads', secondaryMuscles: [] }]);
    mockDb.getWorkoutSetsForWorkoutIds.mockResolvedValue([]);
    const result = await loadMuscleRecovery('u1', NOW);
    expect(result.map.quads.status).toBe('no_recent_session');
  });

  test('a soft-deleted or non-completed workout is excluded', async () => {
    const startedAt = NOW - DAY_MS;
    mockDb.getCompletedWorkoutsBetween.mockResolvedValue([
      { id: 'w1', isCompleted: 1, deletedAt: Date.now(), startedAt },
      { id: 'w2', isCompleted: 0, deletedAt: null, startedAt },
    ]);
    mockDb.getAllExercisesIncludingDeleted.mockResolvedValue([{ id: 'ex1', primaryMuscle: 'quads', secondaryMuscles: [] }]);
    mockDb.getWorkoutSetsForWorkoutIds.mockResolvedValue([
      { id: 's1', workoutId: 'w1', exerciseId: 'ex1', actualReps: 8, weight: 100 },
      { id: 's2', workoutId: 'w2', exerciseId: 'ex1', actualReps: 8, weight: 100 },
    ]);
    const result = await loadMuscleRecovery('u1', NOW);
    expect(result.map.quads.status).toBe('no_recent_session');
    // Neither excluded workout survives to the sets read at all.
    expect(mockDb.getWorkoutSetsForWorkoutIds).not.toHaveBeenCalled();
  });

  test('weekRirTarget/isFirstWeek resolve from the workout\'s OWN mesocycleId, no active-plan lookup', async () => {
    const startedAt = NOW - DAY_MS;
    mockDb.getCompletedWorkoutsBetween.mockResolvedValue([
      { id: 'w1', isCompleted: 1, deletedAt: null, startedAt, mesocycleId: 'm1', mesocycleWeekId: 'wk1' },
    ]);
    mockDb.getMesocycleWeeks.mockImplementation(async (mesoId) => (
      mesoId === 'm1' ? [{ id: 'wk1', week_index: 1, is_deload: 0, rir_target: 0 }] : []
    ));
    mockDb.getAllExercisesIncludingDeleted.mockResolvedValue([{ id: 'ex1', primaryMuscle: 'quads', secondaryMuscles: [] }]);
    mockDb.getWorkoutSetsForWorkoutIds.mockResolvedValue([
      { id: 's1', workoutId: 'w1', exerciseId: 'ex1', actualReps: 8, weight: 100 },
    ]);
    expect(mockDb.getMesocycleWeeks).not.toHaveBeenCalled();
    const withFirstWeekRir0 = await loadMuscleRecovery('u1', NOW);
    // Week 1 (isFirstWeek) at RIR 0 (intensityFactor 1.15) lengthens recovery
    // relative to the same session read as NOT week 1 / neutral RIR --
    // observed indirectly via a lower recoveredPercent for the same elapsed
    // time and dose, proving the week row was actually consulted.
    mockDb.getMesocycleWeeks.mockResolvedValue([{ id: 'wk1', week_index: 5, is_deload: 0, rir_target: 3 }]);
    const withLaterWeekRir3 = await loadMuscleRecovery('u1', NOW);
    expect(withFirstWeekRir0.map.quads.recoveredPercent).toBeLessThan(withLaterWeekRir3.map.quads.recoveredPercent);
    expect(mockDb.getMesocycleWeeks).toHaveBeenCalledWith('m1');
  });

  test('sorenessNext feeds the model as a feedback factor (a lengthened estimate)', async () => {
    const firstStart = NOW - 3 * DAY_MS;
    const secondStart = firstStart + 24 * HOUR_MS; // within the 96h pairing window
    mockDb.getCompletedWorkoutsBetween.mockResolvedValue([
      { id: 'w1', isCompleted: 1, deletedAt: null, startedAt: firstStart, endedAt: firstStart + 3600000 },
      { id: 'w2', isCompleted: 1, deletedAt: null, startedAt: secondStart, soreness24hBefore: 3 },
    ]);
    mockDb.getAllExercisesIncludingDeleted.mockResolvedValue([{ id: 'ex1', primaryMuscle: 'quads', secondaryMuscles: [] }]);
    mockDb.getWorkoutSetsForWorkoutIds.mockResolvedValue([
      { id: 's1', workoutId: 'w1', exerciseId: 'ex1', actualReps: 8, weight: 100 },
    ]);
    const withHighSoreness = await loadMuscleRecovery('u1', NOW);

    mockDb.getCompletedWorkoutsBetween.mockResolvedValue([
      { id: 'w1', isCompleted: 1, deletedAt: null, startedAt: firstStart, endedAt: firstStart + 3600000 },
      { id: 'w2', isCompleted: 1, deletedAt: null, startedAt: secondStart, soreness24hBefore: 1 },
    ]);
    const withLowSoreness = await loadMuscleRecovery('u1', NOW);

    expect(withHighSoreness.map.quads.recoveredPercent).toBeLessThanOrEqual(withLowSoreness.map.quads.recoveredPercent);
    expect(withHighSoreness.map.quads.basis).toBe('time_volume_and_ratings');
  });

  test('best-effort: a failed workouts read never throws, but is reported as degraded (never an all-clear)', async () => {
    // Opus review finding 10: a core read that failed must not surface as
    // "every muscle recovered"; both callers hide their surface on degraded.
    mockDb.getCompletedWorkoutsBetween.mockRejectedValue(new Error('db down'));
    const result = await loadMuscleRecovery('u1', NOW);
    expect(result.map.quads.status).toBe('no_recent_session');
    expect(result.nowMs).toBe(NOW);
    expect(result.degraded).toBe(true);
  });

  test('a failed exercise-map or sets read is degraded too; a clean read is not', async () => {
    mockDb.getAllExercisesIncludingDeleted.mockRejectedValue(new Error('db down'));
    expect((await loadMuscleRecovery('u1', NOW)).degraded).toBe(true);
    mockDb.getAllExercisesIncludingDeleted.mockResolvedValue([]);
    expect((await loadMuscleRecovery('u1', NOW)).degraded).toBe(false);
  });

  test('the workouts read is bounded in the query to the fetch window, never the whole table (Opus finding 17)', async () => {
    await loadMuscleRecovery('u1', NOW);
    const [userId, startMs, endMs] = mockDb.getCompletedWorkoutsBetween.mock.calls[0];
    expect(userId).toBe('u1');
    // The personal learner's history (D210): 84 days of pairs, a 28-day
    // baseline gap and the 14-day lookback before that.
    expect(PERSONAL_HISTORY_DAYS).toBe(126);
    expect(startMs).toBe(NOW - PERSONAL_HISTORY_DAYS * DAY_MS);
    expect(endMs).toBe(NOW + 1);
  });

  test('best-effort: a failed getMesocycleWeeks degrades only that session\'s week info, not the whole read', async () => {
    const startedAt = NOW - DAY_MS;
    mockDb.getCompletedWorkoutsBetween.mockResolvedValue([
      { id: 'w1', isCompleted: 1, deletedAt: null, startedAt, mesocycleId: 'm1' },
    ]);
    mockDb.getMesocycleWeeks.mockRejectedValue(new Error('db down'));
    mockDb.getAllExercisesIncludingDeleted.mockResolvedValue([{ id: 'ex1', primaryMuscle: 'quads', secondaryMuscles: [] }]);
    mockDb.getWorkoutSetsForWorkoutIds.mockResolvedValue([
      { id: 's1', workoutId: 'w1', exerciseId: 'ex1', actualReps: 8, weight: 100 },
    ]);
    const result = await loadMuscleRecovery('u1', NOW);
    // The session still contributes (week info just degrades to neutral).
    expect(result.map.quads.status).not.toBe('no_recent_session');
  });

  test('best-effort: a failed habit-schedule read degrades habitualWeekdays/typicalStartMinute only', async () => {
    mockDb.getCompletedWorkoutStartTimestamps.mockRejectedValue(new Error('db down'));
    const result = await loadMuscleRecovery('u1', NOW);
    expect(result.habitualWeekdays).toBeNull();
  });

  test('habitualWeekdays is wired straight from getCompletedWorkoutStartTimestamps through the real derivation', async () => {
    const CURRENT_WEEK_START = localWeekStartMs(NOW);
    const monday = (weeksAgo) => CURRENT_WEEK_START - weeksAgo * WEEK_MS + 18 * 60 * 60 * 1000;
    mockDb.getCompletedWorkoutStartTimestamps.mockResolvedValue([
      monday(1), monday(2), monday(3), monday(4),
    ]);
    const result = await loadMuscleRecovery('u1', NOW);
    expect(result.habitualWeekdays).toContain(new Date(monday(1)).getDay());
    expect(result.typicalStartMinute).toBe(18 * 60);
  });
});

describe('loadMuscleRecovery: the personal factor (register D210)', () => {
  const NOW = new Date(2026, 2, 16, 12, 0, 0).getTime();
  const QUADS = [{ id: 'ex1', primaryMuscle: 'quads', secondaryMuscles: [] }];
  const workout = (id, daysAgo) => {
    const startedAt = NOW - daysAgo * DAY_MS;
    return {
      id, userId: 'u1', isCompleted: 1, deletedAt: null, startedAt, endedAt: startedAt + HOUR_MS, mesocycleId: null, mesocycleWeekId: null,
    };
  };
  const quadSets = (workoutId) => [1, 2].map((n) => ({
    id: `${workoutId}-s${n}`, workoutId, exerciseId: 'ex1', setType: 'straight', actualReps: 8, weight: 100, setNumber: n,
  }));
  const seed = (workouts) => {
    mockDb.getCompletedWorkoutsBetween.mockResolvedValue(workouts);
    mockDb.getAllExercisesIncludingDeleted.mockResolvedValue(QUADS);
    mockDb.getWorkoutSetsForWorkoutIds.mockResolvedValue(workouts.flatMap((w) => quadSets(w.id)));
  };

  test('no userId: personal is null', async () => {
    const result = await loadMuscleRecovery(null, NOW);
    expect(result.personal).toBeNull();
  });

  test('the reading starts from the recovery answer and says why it has not moved', async () => {
    seed([workout('w1', 2)]);
    const result = await loadMuscleRecovery('u1', NOW);
    expect(result.personal).toEqual({
      factor: 1, prior: 1, pairs: 0, reason: 'too_few', pairsByMuscle: {},
    });
    mockStoreProfile = { recoveryRating: 'poor' };
    __resetPersonalMemoForTests();
    const poor = await loadMuscleRecovery('u1', NOW);
    expect(poor.personal).toEqual({
      factor: 1.15, prior: 1.15, pairs: 0, reason: 'too_few', pairsByMuscle: {},
    });
  });

  test('an adjusted factor takes the answer\'s place in the map; any other reason leaves the map as the answer reads it', async () => {
    seed([workout('w1', 1)]); // still recovering at either factor
    const baseline = await loadMuscleRecovery('u1', NOW);

    __resetPersonalMemoForTests();
    personalRecovery.learnPersonalRecovery.mockReturnValueOnce({ factor: 1.4, prior: 1, pairs: 30, reason: 'adjusted' });
    const slower = await loadMuscleRecovery('u1', NOW);
    expect(slower.personal.reason).toBe('adjusted');
    expect(slower.map.quads.recoveredPercent).toBeLessThan(baseline.map.quads.recoveredPercent);
    expect(slower.map.quads.readyAtMs).toBeGreaterThan(baseline.map.quads.readyAtMs);

    __resetPersonalMemoForTests();
    personalRecovery.learnPersonalRecovery.mockReturnValueOnce({ factor: 1.4, prior: 1, pairs: 30, reason: 'not_clear' });
    const unchanged = await loadMuscleRecovery('u1', NOW);
    expect(unchanged.map.quads.recoveredPercent).toBe(baseline.map.quads.recoveredPercent);
    expect(unchanged.map.quads.readyAtMs).toBe(baseline.map.quads.readyAtMs);
  });

  test('the learner runs once per user, day, answer and history, and again when any of them changes', async () => {
    seed([workout('w1', 3)]);
    await loadMuscleRecovery('u1', NOW);
    await loadMuscleRecovery('u1', NOW + HOUR_MS);
    expect(personalRecovery.learnPersonalRecovery).toHaveBeenCalledTimes(1);

    seed([workout('w1', 3), workout('w2', 1)]); // a new session
    await loadMuscleRecovery('u1', NOW + HOUR_MS);
    expect(personalRecovery.learnPersonalRecovery).toHaveBeenCalledTimes(2);

    await loadMuscleRecovery('u1', NOW + DAY_MS); // the next day
    expect(personalRecovery.learnPersonalRecovery).toHaveBeenCalledTimes(3);

    mockStoreProfile = { recoveryRating: 'good' }; // a new answer
    await loadMuscleRecovery('u1', NOW + DAY_MS);
    expect(personalRecovery.learnPersonalRecovery).toHaveBeenCalledTimes(4);

    await loadMuscleRecovery('u2', NOW + DAY_MS); // another user
    expect(personalRecovery.learnPersonalRecovery).toHaveBeenCalledTimes(5);
  });

  test('an edited set (same count, a corrected weight) re-runs the learner the same day', async () => {
    seed([workout('w1', 3)]);
    await loadMuscleRecovery('u1', NOW);
    await loadMuscleRecovery('u1', NOW);
    expect(personalRecovery.learnPersonalRecovery).toHaveBeenCalledTimes(1);
    mockDb.getWorkoutSetsForWorkoutIds.mockResolvedValue(
      quadSets('w1').map((s, i) => (i === 0 ? { ...s, weight: 102.5 } : s)),
    );
    await loadMuscleRecovery('u1', NOW);
    expect(personalRecovery.learnPersonalRecovery).toHaveBeenCalledTimes(2);
  });

  test('the same day, any change the learner reads re-runs it: a set, a rating, a week, the exercise, an injury limit', async () => {
    // The review of 2026-09-26: a key of counts and the newest session missed
    // each of these until the next day.
    const planned = (id, daysAgo) => ({ ...workout(id, daysAgo), mesocycleId: 'm1', mesocycleWeekId: 'wk2' });
    const weeks = (deload) => [
      { id: 'wk1', week_index: 1, rir_target: 3, is_deload: 0 },
      { id: 'wk2', week_index: 2, rir_target: 2, is_deload: deload ? 1 : 0 },
    ];
    const reset = () => {
      mockDb.getCompletedWorkoutsBetween.mockResolvedValue([planned('w1', 3)]);
      mockDb.getMesocycleWeeks.mockResolvedValue(weeks(false));
      mockDb.getAllExercisesIncludingDeleted.mockResolvedValue(QUADS);
      mockDb.getWorkoutSetsForWorkoutIds.mockResolvedValue(quadSets('w1'));
      mockDb.getCapabilityConstraints.mockResolvedValue([]);
    };
    const changes = [
      ['a set type corrected', () => mockDb.getWorkoutSetsForWorkoutIds.mockResolvedValue(
        quadSets('w1').map((x, i) => (i === 0 ? { ...x, setType: 'warmup' } : x)),
      )],
      ['a set moved to another exercise', () => {
        mockDb.getAllExercisesIncludingDeleted.mockResolvedValue([...QUADS, { id: 'ex2', primaryMuscle: 'quads', secondaryMuscles: [] }]);
        mockDb.getWorkoutSetsForWorkoutIds.mockResolvedValue(quadSets('w1').map((x) => ({ ...x, exerciseId: 'ex2' })));
      }],
      ['a fatigue rating added', () => mockDb.getCompletedWorkoutsBetween.mockResolvedValue([{ ...planned('w1', 3), fatigueLevel: 5 }])],
      ['the week turned into a recovery week', () => mockDb.getMesocycleWeeks.mockResolvedValue(weeks(true))],
      ['the exercise\'s muscle corrected', () => mockDb.getAllExercisesIncludingDeleted.mockResolvedValue([{ ...QUADS[0], primaryMuscle: 'hamstrings' }])],
      ['an injury limit logged, covering the session', () => mockDb.getCapabilityConstraints.mockResolvedValue([
        { id: 'c9', role: 'episode', startsAt: NOW - 10 * DAY_MS, endedAt: null, deletedAt: null },
      ])],
    ];
    // The scan itself is eligibility's own (tested there): here it reports
    // quads for any session it is asked about.
    eligibility.constrainedMusclesInWindow.mockImplementation(() => new Set(['quads']));
    try {
      for (const [what, change] of changes) {
        reset();
        __resetPersonalMemoForTests();
        personalRecovery.learnPersonalRecovery.mockClear();
        // eslint-disable-next-line no-await-in-loop
        await loadMuscleRecovery('u1', NOW);
        // eslint-disable-next-line no-await-in-loop
        await loadMuscleRecovery('u1', NOW + HOUR_MS);
        expect([what, personalRecovery.learnPersonalRecovery.mock.calls.length]).toEqual([what, 1]);
        change();
        // eslint-disable-next-line no-await-in-loop
        await loadMuscleRecovery('u1', NOW + 2 * HOUR_MS);
        expect([what, personalRecovery.learnPersonalRecovery.mock.calls.length]).toEqual([what, 2]);
      }
    } finally {
      eligibility.constrainedMusclesInWindow.mockImplementation(
        jest.requireActual('../../capability/eligibility').constrainedMusclesInWindow,
      );
    }
  });

  test('a failed injury-limit read skips the learner for this read: personal null, the map intact and not degraded', async () => {
    seed([workout('w1', 2)]);
    mockDb.getCapabilityConstraints.mockRejectedValue(new Error('locked'));
    const result = await loadMuscleRecovery('u1', NOW);
    expect(result.personal).toBeNull();
    expect(result.degraded).toBe(false);
    expect(result.map.quads.status).not.toBe('no_recent_session');
    expect(personalRecovery.learnPersonalRecovery).not.toHaveBeenCalled();
  });

  test('a learner that throws leaves personal null and the map reading with the answer alone', async () => {
    seed([workout('w1', 2)]);
    const baseline = await loadMuscleRecovery('u1', NOW);
    __resetPersonalMemoForTests();
    personalRecovery.learnPersonalRecovery.mockImplementationOnce(() => { throw new Error('boom'); });
    const result = await loadMuscleRecovery('u1', NOW);
    expect(result.personal).toBeNull();
    expect(result.map.quads.recoveredPercent).toBe(baseline.map.quads.recoveredPercent);
  });

  test('a degraded read never runs the learner', async () => {
    mockDb.getCompletedWorkoutsBetween.mockRejectedValue(new Error('db locked'));
    const result = await loadMuscleRecovery('u1', NOW);
    expect(result.degraded).toBe(true);
    expect(result.personal).toBeNull();
    expect(personalRecovery.learnPersonalRecovery).not.toHaveBeenCalled();
  });

  test('a session under an injury limit, or in the return period after one, is handed to the learner as excluded for that muscle', async () => {
    seed([workout('w_old', 60), workout('w_new', 2)]);
    const episodeStart = NOW - 5 * DAY_MS;
    mockDb.getCapabilityConstraints.mockResolvedValue([
      { id: 'c1', role: 'episode', startsAt: episodeStart, endedAt: null, deletedAt: null },
    ]);
    // The scan itself is eligibility's own (tested there); here it reports
    // the legacy 'shoulders' key, which the loader normalises as the
    // volume allocator does.
    eligibility.constrainedMusclesInWindow.mockImplementation((rows, library, fromMs) => (
      fromMs >= episodeStart - eligibility.REINTRODUCTION_CARRY_MS ? new Set(['Shoulders', 'quads']) : new Set()
    ));
    await loadMuscleRecovery('u1', NOW);
    const { excluded } = personalRecovery.learnPersonalRecovery.mock.calls[0][0];
    expect([...excluded].sort()).toEqual(['w_new|quads', 'w_new|side_delts']);
    // The session two months before the episode never reached the scan.
    const scannedFrom = eligibility.constrainedMusclesInWindow.mock.calls.map((c) => c[2]);
    expect(scannedFrom).toEqual([NOW - 2 * DAY_MS]);
    eligibility.constrainedMusclesInWindow.mockReset();
    eligibility.constrainedMusclesInWindow.mockImplementation(jest.requireActual('../../capability/eligibility').constrainedMusclesInWindow);
  });

  test('the return period, on the real scan: a session within 14 days after an injury limit ended is left out, one after it is not', async () => {
    // Round 2 of the review: the only exclusion test used a live episode and
    // a stand-in scan, so dropping the return period from the loader's
    // pre-check went unnoticed. This one runs capability/eligibility itself.
    const SQUAT = {
      id: 'ex1', name: 'Barbell Back Squat', primaryMuscle: 'quads', secondaryMuscles: [], position: 'standing',
      floorAccess: 0, overheadPosition: 0, gripDemand: 'bar', unilateralLoadable: 0, bilateralUpper: 1,
      bilateralLower: 1, axialLoad: 1, impact: 0, balanceDemand: 'stable',
    };
    const endedAt = NOW - 20 * DAY_MS;
    seed([workout('w_before', 60), workout('w_during', 30), workout('w_return', 10), workout('w_after', 2)]);
    mockDb.getAllExercisesIncludingDeleted.mockResolvedValue([SQUAT]);
    mockDb.getCapabilityConstraints.mockResolvedValue([{
      id: 'c1', userId: 'u1', role: 'episode', source: 'self', ruleKind: 'demand', ruleValue: 'standing',
      laterality: null, startsAt: endedAt - 20 * DAY_MS, endsAt: null, state: 'ended', endedAt,
      endedReason: 'user_ended', episodeGroupId: 'ep1', deletedAt: null,
    }]);
    await loadMuscleRecovery('u1', NOW);
    const { excluded } = personalRecovery.learnPersonalRecovery.mock.calls[0][0];
    expect([...excluded].sort()).toEqual(['w_during|quads', 'w_return|quads']);
  });

  test('no episode row: nothing is scanned and nothing excluded', async () => {
    seed([workout('w1', 2)]);
    mockDb.getCapabilityConstraints.mockResolvedValue([{ id: 'c2', role: 'rule', startsAt: NOW - DAY_MS }]);
    await loadMuscleRecovery('u1', NOW);
    expect(eligibility.constrainedMusclesInWindow).not.toHaveBeenCalled();
    expect(personalRecovery.learnPersonalRecovery.mock.calls[0][0].excluded.size).toBe(0);
  });
});

describe('loadPlannedSetsByRoutine', () => {
  test('maps each routine id to its planned PRIMARY sets per muscle via the real allocator; no rows is unknown (null)', async () => {
    mockDb.getRoutineExercisesWithDetails.mockImplementation(async (routineId) => (
      routineId === 'r1'
        ? [{ routineExercise: { recommendedSets: 4 }, exercise: { primaryMuscle: 'chest', secondaryMuscles: ['triceps'] } }]
        : []
    ));
    const result = await loadPlannedSetsByRoutine(['r1', 'r2']);
    expect(result.r1.chest).toBe(4);
    // Secondary half-credit never makes a session "train" a muscle (spec 3.3
    // primary-loaded; Opus review finding 12).
    expect(result.r1.triceps).toBeUndefined();
    // A required session with no exercise rows is unknown, not "nothing to
    // recover" (Opus review finding 11).
    expect(result.r2).toBeNull();
  });

  test('a routine with an exercise that no longer resolves (no primary muscle) is unknown (null)', async () => {
    mockDb.getRoutineExercisesWithDetails.mockResolvedValue([
      { routineExercise: { recommendedSets: 4 }, exercise: { primaryMuscle: 'chest', secondaryMuscles: [] } },
      { routineExercise: { recommendedSets: 3 }, exercise: { id: 'gone', name: 'Old custom', primaryMuscle: null, secondaryMuscles: [] } },
    ]);
    const result = await loadPlannedSetsByRoutine(['r1']);
    expect(result.r1).toBeNull();
  });

  test('primarySetsFromRoutineRows: pure mapping, zero-set rows skipped, an all-zero routine is unknown', () => {
    expect(primarySetsFromRoutineRows([
      { routineExercise: { recommendedSets: 3 }, exercise: { primaryMuscle: 'quads', secondaryMuscles: ['glutes'] } },
      { routineExercise: { recommendedSets: 0 }, exercise: { primaryMuscle: 'calves', secondaryMuscles: [] } },
    ])).toEqual({ quads: 3 });
    expect(primarySetsFromRoutineRows([
      { routineExercise: { recommendedSets: 0 }, exercise: { primaryMuscle: 'calves', secondaryMuscles: [] } },
    ])).toBeNull();
    expect(primarySetsFromRoutineRows([])).toBeNull();
    expect(primarySetsFromRoutineRows(null)).toBeNull();
  });

  test('duplicate routine ids are only read once', async () => {
    mockDb.getRoutineExercisesWithDetails.mockResolvedValue([]);
    await loadPlannedSetsByRoutine(['r1', 'r1', 'r1']);
    expect(mockDb.getRoutineExercisesWithDetails).toHaveBeenCalledTimes(1);
  });

  test('a falsy/empty input never throws', async () => {
    expect(await loadPlannedSetsByRoutine(null)).toEqual({});
    expect(await loadPlannedSetsByRoutine([])).toEqual({});
  });

  test('best-effort: a failed read for one routine degrades to null (unknown, never fully ready) for that routine only', async () => {
    mockDb.getRoutineExercisesWithDetails.mockImplementation(async (routineId) => {
      if (routineId === 'bad') throw new Error('db down');
      return [{ routineExercise: { recommendedSets: 4 }, exercise: { primaryMuscle: 'back', secondaryMuscles: [] } }];
    });
    const result = await loadPlannedSetsByRoutine(['bad', 'good']);
    // null, not {} -- {} would mean "genuinely no planned volume" (a real,
    // legitimate fact), which is a different claim from "unknown".
    expect(result.bad).toBeNull();
    expect(result.good.back).toBe(4);
  });
});
