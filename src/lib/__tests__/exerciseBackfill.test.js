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
const mockInsertExerciseWithId = jest.fn(() => Promise.resolve());
jest.mock('../database', () => ({
  getAllExercises: (...a) => mockGetAllExercises(...a),
  updateExerciseMetadata: (...a) => mockUpdateExerciseMetadata(...a),
  insertExerciseWithId: (...a) => mockInsertExerciseWithId(...a),
  insertExercise: jest.fn(() => Promise.resolve()),
}));

const { backfillExerciseMetadataIfNeeded, topUpNewExercisesIfNeeded, rederiveExerciseMetadataIfNeeded } = require('../seedExercises');
const getAllExercises = mockGetAllExercises;
const updateExerciseMetadata = mockUpdateExerciseMetadata;
const insertExerciseWithId = mockInsertExerciseWithId;

beforeEach(() => {
  mockStore = {};
  getAllExercises.mockReset();
  updateExerciseMetadata.mockReset();
  insertExerciseWithId.mockReset();
  insertExerciseWithId.mockResolvedValue(undefined);
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

describe('rederiveExerciseMetadataIfNeeded', () => {
  test('re-derives EVERY canonical row, even ones already populated', async () => {
    getAllExercises.mockResolvedValue([
      { id: 'custom', name: 'My Lift', equipment: 'barbell', movementPattern: 'push', isCustom: 1, equipmentCategory: 'barbell' },
      // A row the v1 backfill already filled with the old (broad) profiles.
      { id: 'pullup', name: 'Pull-Up', primaryMuscle: 'back', equipment: 'bodyweight', movementPattern: 'pull', compoundIsolation: 'compound', isCustom: 0, equipmentCategory: 'bodyweight' },
      { id: 'crunch', name: 'Hanging Leg Raise', primaryMuscle: 'abs', equipment: 'bodyweight', movementPattern: 'isolation', compoundIsolation: 'isolation', isCustom: 0, equipmentCategory: 'bodyweight' },
    ]);

    await rederiveExerciseMetadataIfNeeded();

    // Custom skipped; both canonical rows re-derived despite being populated.
    expect(updateExerciseMetadata).toHaveBeenCalledTimes(2);
    const [, pullupMeta] = updateExerciseMetadata.mock.calls.find(c => c[0] === 'pullup');
    expect(pullupMeta.equipmentProfiles).toEqual(['bodyweight']);
    const [, crunchMeta] = updateExerciseMetadata.mock.calls.find(c => c[0] === 'crunch');
    expect(crunchMeta.equipmentProfiles).toContain('full_gym');
  });

  test('is idempotent: the guard flag short-circuits a second run', async () => {
    getAllExercises.mockResolvedValue([
      { id: 'pullup', name: 'Pull-Up', primaryMuscle: 'back', equipment: 'bodyweight', movementPattern: 'pull', compoundIsolation: 'compound', isCustom: 0, equipmentCategory: 'bodyweight' },
    ]);
    await rederiveExerciseMetadataIfNeeded();
    expect(updateExerciseMetadata).toHaveBeenCalledTimes(1);

    getAllExercises.mockClear();
    updateExerciseMetadata.mockClear();
    await rederiveExerciseMetadataIfNeeded();
    expect(getAllExercises).not.toHaveBeenCalled();
    expect(updateExerciseMetadata).not.toHaveBeenCalled();
  });

  test('a thrown DB error does not reject (boot must not crash)', async () => {
    getAllExercises.mockRejectedValue(new Error('db down'));
    await expect(rederiveExerciseMetadataIfNeeded()).resolves.toBeUndefined();
  });
});

describe('topUpNewExercisesIfNeeded', () => {
  test('inserts only the RAW exercises the install does not already have', async () => {
    // Pretend the install has every canonical exercise except the new
    // adductor machine. The top-up should insert exactly the missing ones.
    const { canonicalExerciseId } = require('../seedExercises');
    const hipAdductionId = canonicalExerciseId('Hip Adduction Machine');
    // Existing = everything the top-up could try, minus the adductor machine.
    // We fake "everything" by returning a row whose id matches each RAW id
    // except the one we want inserted. Simplest: return all but that id by
    // letting getAllExercises report a huge set is impractical here, so
    // instead assert the new exercise IS among the inserts on an empty DB.
    getAllExercises.mockResolvedValue([]);
    await topUpNewExercisesIfNeeded();
    const insertedIds = insertExerciseWithId.mock.calls.map(c => c[0]);
    expect(insertedIds).toContain(hipAdductionId);
    // Every insert carries derived metadata.
    const adductorCall = insertExerciseWithId.mock.calls.find(c => c[0] === hipAdductionId);
    expect(adductorCall[1].equipmentCategory).toBe('machine_selectorised');
    expect(adductorCall[1].primaryMuscle).toBe('adductors');
  });

  test('skips exercises already present', async () => {
    const { canonicalExerciseId } = require('../seedExercises');
    const benchId = canonicalExerciseId('Barbell Bench Press');
    // DB already has the bench press; it must not be re-inserted.
    getAllExercises.mockResolvedValue([{ id: benchId }]);
    await topUpNewExercisesIfNeeded();
    const insertedIds = insertExerciseWithId.mock.calls.map(c => c[0]);
    expect(insertedIds).not.toContain(benchId);
  });

  test('is idempotent: the version flag short-circuits a second run', async () => {
    getAllExercises.mockResolvedValue([]);
    await topUpNewExercisesIfNeeded();
    expect(insertExerciseWithId).toHaveBeenCalled();

    getAllExercises.mockClear();
    insertExerciseWithId.mockClear();
    await topUpNewExercisesIfNeeded();
    expect(getAllExercises).not.toHaveBeenCalled();
    expect(insertExerciseWithId).not.toHaveBeenCalled();
  });

  test('a thrown DB error does not reject (boot must not crash)', async () => {
    getAllExercises.mockRejectedValue(new Error('db down'));
    await expect(topUpNewExercisesIfNeeded()).resolves.toBeUndefined();
  });
});
