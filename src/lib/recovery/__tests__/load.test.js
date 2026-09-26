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
 * convention (see muscleRecoveryModel.test.js).
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
};
jest.mock('../../database', () => mockDb);

let mockStoreProfile = { recoveryRating: 'average' };
jest.mock('../../../store/useAppStore', () => ({
  __esModule: true,
  default: { getState: () => ({ userProfile: mockStoreProfile }) },
}));

const {
  loadMuscleRecovery, loadPlannedSetsByRoutine, primarySetsFromRoutineRows,
  buildRecoverySession, pairSorenessNext, indexWeeks, medianHabitStartMinute,
} = require('../load');
const { localWeekStartMs } = require('../../dayKey');

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
  mockStoreProfile = { recoveryRating: 'average' };
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
      weekRirTarget: 2, isFirstWeek: true,
      ratings: { fatigue: 4, joint: 2, sorenessNext: null },
    });
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
    expect(weeks.get('wk1')).toEqual({ rirTarget: 2, isFirstWeek: true });
  });

  test('a middle week (no preceding deload) is not a first week', () => {
    const weeks = indexWeeks([
      { id: 'wk1', week_index: 1, is_deload: 0, rir_target: 2 },
      { id: 'wk2', week_index: 2, is_deload: 0, rir_target: 1 },
    ]);
    expect(weeks.get('wk2')).toEqual({ rirTarget: 1, isFirstWeek: false });
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

  test('a workout outside the fetch window (LOOKBACK_DAYS + 4) never contributes', async () => {
    const startedAt = NOW - 30 * DAY_MS; // well past 14 + 4 days
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
    expect(startMs).toBe(NOW - 18 * DAY_MS);
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
