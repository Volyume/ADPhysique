/**
 * Cloud-push column-preservation guard for syncExercises (sync.js).
 *
 * F5/exercise-restore audit (2026-07-09) follow-up: insertOrUpdateExerciseFromCloud
 * (database.js) was fixed to read exercise_type back off the cloud row
 * (see insertOrUpdateExerciseFromCloud.test.js), but syncExercises never sent
 * exercise_type up in the first place, so a custom exercise's type (e.g. a
 * duration/reps-only schema picked in ExercisePickerModal) still did not
 * survive a full sign-out/sign-in cycle -- the restore had nothing to read.
 *
 * This test drives syncExercises() with a mocked local exercises table and
 * a mocked Supabase client, and asserts the row handed to
 * custom_exercises.upsert() carries exercise_type, defaulting to
 * 'weight_reps' when the local value is missing -- the same convention used
 * on the restore side.
 */

const mockExercises = [];

jest.mock('../database', () => ({
  getAllExercises: jest.fn(async () => mockExercises),
}));

const mockUpsert = jest.fn(() => Promise.resolve({ error: null }));
const mockFrom = jest.fn(() => ({ upsert: mockUpsert }));

jest.mock('../supabase', () => ({
  getSupabaseClient: jest.fn(() => ({ from: mockFrom })),
}));

const { syncExercises } = require('../sync');

beforeEach(() => {
  mockExercises.length = 0;
  mockUpsert.mockClear();
  mockFrom.mockClear();
});

describe('syncExercises pushes exercise_type to custom_exercises', () => {
  test('sends the custom exercise\'s exercise_type to the cloud', async () => {
    mockExercises.push({
      id: 'custom-1',
      isCustom: true,
      name: 'Wall Sit',
      primaryMuscle: 'quads',
      exerciseType: 'duration',
      updatedAt: Date.now(),
    });
    await syncExercises('user-1');
    expect(mockFrom).toHaveBeenCalledWith('custom_exercises');
    const rows = mockUpsert.mock.calls[0][0];
    expect(rows[0].exercise_type).toBe('duration');
  });

  test('defaults exercise_type to weight_reps when the local value is missing', async () => {
    mockExercises.push({
      id: 'custom-2',
      isCustom: true,
      name: 'Cable Curl',
      primaryMuscle: 'biceps',
      updatedAt: Date.now(),
    });
    await syncExercises('user-1');
    const rows = mockUpsert.mock.calls[0][0];
    expect(rows[0].exercise_type).toBe('weight_reps');
  });
});
