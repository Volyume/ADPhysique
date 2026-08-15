/**
 * Campaign 18 final hostile lifecycle verification.
 *
 * These drive the real database entry points against the repository's SQLite
 * connection mock. They pin the production transaction boundary, authoritative
 * week attribution, and pull-side half of the cloud conflict contract.
 */
jest.mock('expo-sqlite');
jest.mock('../supabase', () => ({ getSupabaseClient: () => null }));
jest.mock('../sync', () => ({ scheduleSync: jest.fn() }));
jest.mock('../errorLog', () => ({
  logError: jest.fn(), logWarn: jest.fn(), logInfo: jest.fn(),
}));

const {
  db,
  createWorkout,
  finishWorkoutWithSessionResolution,
  insertOrUpdateSessionResolutionFromCloud,
  getBlockTrainingData,
  getWeeklySessionStats,
} = require('../database');

const iso = (ms) => new Date(ms).toISOString();
const T1 = Date.UTC(2026, 0, 1);
const T2 = Date.UTC(2026, 0, 2);

let conn;

beforeEach(async () => {
  conn = await db();
  conn.runAsync.mockReset().mockResolvedValue({ changes: 1 });
  conn.getFirstAsync.mockReset().mockResolvedValue(null);
  conn.withTransactionAsync.mockClear();
});

describe('authoritative required-session attribution', () => {
  test('a held earlier week is written even when the calendar has moved on', async () => {
    conn.getFirstAsync.mockImplementation(async (sql) => {
      if (sql.includes('FROM mesocycles')) return { id: 'block-1' };
      if (sql.includes('FROM mesocycle_weeks WHERE id')) return { id: 'week-held' };
      throw new Error(`calendar lookup was not expected: ${sql}`);
    });

    const workout = await createWorkout('user-1', 'routine-legs', {
      mesocycleWeekId: 'week-held',
    });

    expect(workout.mesocycleWeekId).toBe('week-held');
    const insert = conn.runAsync.mock.calls.find(([sql]) => sql.includes('INSERT INTO workouts'));
    expect(insert[1][4]).toBe('week-held');
  });

  test('a caller cannot stamp an authoritative week from another block', async () => {
    conn.getFirstAsync.mockImplementation(async (sql) => (
      sql.includes('FROM mesocycles') ? { id: 'block-1' } : null
    ));

    await expect(createWorkout('user-1', 'routine-legs', {
      mesocycleWeekId: 'foreign-week',
    })).rejects.toThrow('Authoritative programme week');
    expect(conn.runAsync.mock.calls.some(([sql]) => sql.includes('INSERT INTO workouts'))).toBe(false);
  });
});

describe('ENDED_EARLY is one crash-safe SQLite commit', () => {
  const workoutData = {
    endedAt: T2, durationMinutes: 30, isCompleted: true,
    name: 'Legs', setCount: 3, totalVolume: 1200,
  };
  const resolution = {
    mesocycleWeekId: 'week-1', routineId: 'routine-legs',
    mesocycleId: 'block-1', resolution: 'ended_early',
  };

  test('workout closure and explicit resolution execute inside one transaction', async () => {
    await finishWorkoutWithSessionResolution(
      'workout-partial', workoutData, 'user-1', resolution,
    );

    expect(conn.withTransactionAsync).toHaveBeenCalledTimes(1);
    const writes = conn.runAsync.mock.calls.map(([sql]) => sql);
    expect(writes).toHaveLength(2);
    expect(writes[0]).toMatch(/UPDATE workouts/);
    expect(writes[1]).toMatch(/INSERT INTO session_resolutions/);
    expect(conn.runAsync.mock.calls[1][1]).toContain('workout-partial');
  });

  test('a resolution failure rejects finalisation instead of being swallowed', async () => {
    conn.runAsync
      .mockResolvedValueOnce({ changes: 1 })
      .mockRejectedValueOnce(new Error('resolution write failed'));

    await expect(finishWorkoutWithSessionResolution(
      'workout-partial', workoutData, 'user-1', resolution,
    )).rejects.toThrow('resolution write failed');
    expect(conn.withTransactionAsync).toHaveBeenCalledTimes(1);
  });

  test('a missing or foreign workout cannot create an explicit resolution', async () => {
    conn.runAsync.mockResolvedValueOnce({ changes: 0 });

    await expect(finishWorkoutWithSessionResolution(
      'foreign-workout', workoutData, 'user-1', resolution,
    )).rejects.toThrow('identity did not match');
    expect(conn.runAsync).toHaveBeenCalledTimes(1);
    expect(conn.runAsync.mock.calls[0][0]).toMatch(
      /WHERE id = \? AND user_id = \? AND routine_id = \? AND mesocycle_week_id = \?/,
    );
  });

  test('repeating the same finalisation converges on the same instance id', async () => {
    await finishWorkoutWithSessionResolution(
      'workout-partial', workoutData, 'user-1', resolution,
    );
    await finishWorkoutWithSessionResolution(
      'workout-partial', workoutData, 'user-1', resolution,
    );
    const inserts = conn.runAsync.mock.calls.filter(([sql]) => sql.includes('session_resolutions'));
    expect(inserts).toHaveLength(2);
    expect(inserts[0][1][0]).toBe('sr_week-1_routine-legs');
    expect(inserts[1][1][0]).toBe(inserts[0][1][0]);
  });
});

describe('cloud pull uses the same total ordering as the server seam', () => {
  const cloud = (resolution, updated, resolved = updated) => ({
    id: 'sr_week-1_routine-legs', user_id: 'user-1',
    mesocycle_week_id: 'week-1', routine_id: 'routine-legs',
    mesocycle_id: 'block-1', resolution,
    workout_id: resolution === 'ended_early' ? 'workout-partial' : null,
    created_at: iso(T1), updated_at: iso(updated), resolved_at: iso(resolved),
    deleted_at: null,
  });

  test('newer cloud replaces stale local; stale cloud cannot regress local', async () => {
    conn.getFirstAsync.mockResolvedValue({
      id: 'sr_week-1_routine-legs', resolution: 'skipped_by_user',
      workout_id: null, resolved_at: T1, updated_at: T1,
    });
    await insertOrUpdateSessionResolutionFromCloud('user-1', cloud('ended_early', T2));
    expect(conn.runAsync).toHaveBeenCalledTimes(1);

    conn.runAsync.mockClear();
    conn.getFirstAsync.mockResolvedValue({
      id: 'sr_week-1_routine-legs', resolution: 'ended_early',
      workout_id: 'workout-partial', resolved_at: T2, updated_at: T2,
    });
    await insertOrUpdateSessionResolutionFromCloud('user-1', cloud('skipped_by_user', T1));
    expect(conn.runAsync).not.toHaveBeenCalled();
  });

  test('equal timestamps choose ENDED_EARLY deterministically on either device', async () => {
    conn.getFirstAsync.mockResolvedValue({
      id: 'sr_week-1_routine-legs', resolution: 'skipped_by_user',
      workout_id: null, resolved_at: T2, updated_at: T2,
    });
    await insertOrUpdateSessionResolutionFromCloud('user-1', cloud('ended_early', T2));
    expect(conn.runAsync).toHaveBeenCalledTimes(1);

    conn.runAsync.mockClear();
    conn.getFirstAsync.mockResolvedValue({
      id: 'sr_week-1_routine-legs', resolution: 'ended_early',
      workout_id: 'workout-partial', resolved_at: T2, updated_at: T2,
    });
    await insertOrUpdateSessionResolutionFromCloud('user-1', cloud('skipped_by_user', T2));
    expect(conn.runAsync).not.toHaveBeenCalled();
  });
});

describe('adherence distinguishes closure from full completion', () => {
  test('block data preserves partial evidence but exposes only full completions', async () => {
    conn.getAllAsync.mockImplementation(async (sql) => {
      if (sql.includes('SELECT * FROM workouts')) {
        return [{ id: 'workout-full' }, { id: 'workout-partial' }];
      }
      if (sql.includes('SELECT ws.* FROM workout_sets')) {
        return [
          { id: 'set-full', workout_id: 'workout-full' },
          { id: 'set-partial', workout_id: 'workout-partial' },
        ];
      }
      if (sql.includes('SELECT workout_id FROM session_resolutions')) {
        return [{ workout_id: 'workout-partial' }];
      }
      return [];
    });

    const data = await getBlockTrainingData('user-1', 'block-1');
    expect(data.workouts.map((w) => w.id)).toEqual(['workout-full', 'workout-partial']);
    expect(data.sets.map((s) => s.id)).toEqual(['set-full', 'set-partial']);
    expect(data.fullyCompletedWorkouts.map((w) => w.id)).toEqual(['workout-full']);
  });

  test('weekly completed-session SQL excludes ended-early closures', async () => {
    conn.getFirstAsync.mockImplementation(async (sql) => {
      if (sql.includes('COUNT(*) AS completed')) {
        expect(sql).toMatch(/NOT EXISTS[\s\S]*session_resolutions[\s\S]*ended_early/);
        return { completed: 3 };
      }
      return null;
    });
    conn.getAllAsync.mockImplementation(async (sql) => {
      if (sql.includes('COUNT(*) AS wk_count')) {
        expect(sql).toMatch(/NOT EXISTS[\s\S]*session_resolutions[\s\S]*ended_early/);
        return [{ wk_count: 3 }];
      }
      return [];
    });

    const stats = await getWeeklySessionStats('user-1', T1);
    expect(stats.completed).toBe(3);
  });
});
