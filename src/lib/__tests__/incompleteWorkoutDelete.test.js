jest.mock('expo-sqlite');

const database = require('../database');

describe('deleteIncompleteWorkout', () => {
  let connection;
  let workout;
  let sets;
  let failParentDelete;

  beforeAll(async () => {
    connection = await database.db();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    workout = { id: 'workout-1', is_completed: 0 };
    sets = new Set(['set-1', 'set-2']);
    failParentDelete = false;
    connection.isInTransactionSync.mockReturnValue(false);
    connection.getFirstAsync.mockImplementation(async (sql) => {
      if (sql.includes('SELECT id, is_completed FROM workouts')) return workout;
      return null;
    });
    connection.runAsync.mockImplementation(async (sql) => {
      if (sql.includes('DELETE FROM workout_sets')) {
        sets.clear();
      } else if (sql.includes('DELETE FROM workouts')) {
        if (failParentDelete) throw new Error('parent delete failed');
        workout = null;
      }
      return { changes: 1 };
    });
    connection.withTransactionAsync.mockImplementation(async (task) => {
      const workoutSnapshot = workout ? { ...workout } : null;
      const setsSnapshot = new Set(sets);
      try {
        return await task();
      } catch (e) {
        workout = workoutSnapshot;
        sets = setsSnapshot;
        throw e;
      }
    });
  });

  test('a completed workout preserves every set', async () => {
    workout.is_completed = 1;

    await expect(database.deleteIncompleteWorkout('workout-1')).resolves.toBe(false);

    expect([...sets]).toEqual(['set-1', 'set-2']);
    expect(connection.runAsync).not.toHaveBeenCalled();
  });

  test('an already-gone workout leaves unrelated set state untouched', async () => {
    workout = null;

    await expect(database.deleteIncompleteWorkout('workout-1')).resolves.toBe(false);

    expect([...sets]).toEqual(['set-1', 'set-2']);
    expect(connection.runAsync).not.toHaveBeenCalled();
  });

  test('a parent-delete failure rolls the set deletion back', async () => {
    failParentDelete = true;

    await expect(database.deleteIncompleteWorkout('workout-1')).rejects.toThrow('parent delete failed');

    expect(workout).toEqual({ id: 'workout-1', is_completed: 0 });
    expect([...sets]).toEqual(['set-1', 'set-2']);
  });

  test('an incomplete workout and its sets delete together', async () => {
    await expect(database.deleteIncompleteWorkout('workout-1')).resolves.toBe(true);

    expect(workout).toBeNull();
    expect([...sets]).toEqual([]);
  });
});
