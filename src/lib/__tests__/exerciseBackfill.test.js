/**
 * backfillExerciseMetadataIfNeeded: the one-time pass that populates the
 * derived metadata columns on installs whose canonical exercises were
 * seeded before those columns existed. Verifies it's idempotent, skips
 * custom and already-populated rows, and writes derived values.
 */

let mockStore = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn((k) => Promise.resolve(mockStore[k] ?? null)),
  setItem: jest.fn((k, v) => { mockStore[k] = v; return Promise.resolve(); }),
}));

const mockGetAllExercises = jest.fn();
const mockUpdateExerciseMetadata = jest.fn(() => Promise.resolve());
jest.mock('../database', () => ({
  getAllExercises: (...a) => mockGetAllExercises(...a),
  updateExerciseMetadata: (...a) => mockUpdateExerciseMetadata(...a),
  insertExerciseWithId: jest.fn(() => Promise.resolve()),
  insertExercise: jest.fn(() => Promise.resolve()),
}));

const { backfillExerciseMetadataIfNeeded } = require('../seedExercises');
const getAllExercises = mockGetAllExercises;
const updateExerciseMetadata = mockUpdateExerciseMetadata;

beforeEach(() => {
  mockStore = {};
  getAllExercises.mockReset();
  updateExerciseMetadata.mockReset();
  updateExerciseMetadata.mockResolvedValue(undefined);
});

test('populates derived metadata on canonical rows that lack it', async () => {
  getAllExercises.mockResolvedValue([
    { id: 'a', name: 'Barbell Bench Press', primaryMuscle: 'chest', equipment: 'barbell', movementPattern: 'push', fatigueCost: 4, isCustom: 0, equipmentCategory: null },
    { id: 'b', name: 'Leg Press', primaryMuscle: 'quads', equipment: 'machine', movementPattern: 'squat', fatigueCost: 3, isCustom: 0, equipmentCategory: null },
  ]);

  await backfillExerciseMetadataIfNeeded();

  expect(updateExerciseMetadata).toHaveBeenCalledTimes(2);
  const [, benchMeta] = updateExerciseMetadata.mock.calls.find(c => c[0] === 'a');
  expect(benchMeta.equipmentCategory).toBe('barbell');
  expect(benchMeta.force).toBe('push');
  const [, legMeta] = updateExerciseMetadata.mock.calls.find(c => c[0] === 'b');
  expect(legMeta.equipmentCategory).toBe('machine_selectorised');
  expect(legMeta.machineType).toBe('leg_press');
  expect(legMeta.machineOk).toBe(true);
});

test('skips custom exercises and rows already populated', async () => {
  getAllExercises.mockResolvedValue([
    { id: 'custom', name: 'My Lift', equipment: 'barbell', movementPattern: 'push', isCustom: 1, equipmentCategory: null },
    { id: 'done', name: 'Squat', equipment: 'barbell', movementPattern: 'squat', isCustom: 0, equipmentCategory: 'barbell' },
    { id: 'todo', name: 'Push-Up', primaryMuscle: 'chest', equipment: 'bodyweight', movementPattern: 'push', isCustom: 0, equipmentCategory: null },
  ]);

  await backfillExerciseMetadataIfNeeded();

  expect(updateExerciseMetadata).toHaveBeenCalledTimes(1);
  expect(updateExerciseMetadata.mock.calls[0][0]).toBe('todo');
});

test('is idempotent: the guard flag short-circuits a second run', async () => {
  getAllExercises.mockResolvedValue([
    { id: 'todo', name: 'Push-Up', primaryMuscle: 'chest', equipment: 'bodyweight', movementPattern: 'push', isCustom: 0, equipmentCategory: null },
  ]);

  await backfillExerciseMetadataIfNeeded();
  expect(updateExerciseMetadata).toHaveBeenCalledTimes(1);

  // Second run: flag is set, so it should not query or update again.
  getAllExercises.mockClear();
  updateExerciseMetadata.mockClear();
  await backfillExerciseMetadataIfNeeded();
  expect(getAllExercises).not.toHaveBeenCalled();
  expect(updateExerciseMetadata).not.toHaveBeenCalled();
});

test('a thrown DB error does not reject (boot must not crash)', async () => {
  getAllExercises.mockRejectedValue(new Error('db down'));
  await expect(backfillExerciseMetadataIfNeeded()).resolves.toBeUndefined();
});
