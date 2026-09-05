/**
 * EL-9/EL-7 circuit sync columns (docs/exercise-library-expansion-2026-09-05/
 * 05-DECISIONS.md, 07-CORPUS-FORMAT.md section 5).
 *
 * routine_exercises.group_kind, routine_exercises.round_rest_seconds and
 * workout_sets.evidence_class exist locally but their cloud counterparts
 * (migrate_158, migrate_159) are WRITTEN, NOT APPLIED. Pushing an unknown
 * column fails the WHOLE upsert chunk in Postgres, so the push must OMIT
 * all three entirely while CIRCUIT_SYNC_COLUMNS_ENABLED is false, and
 * include them once the flag flips on. This pins that behaviour against the
 * real bulkUploadLocalData path, not a reimplementation of it.
 */

const mockWorkout = {
  id: 'w1', userId: 'local-user', isCompleted: true,
  updatedAt: Date.UTC(2026, 0, 1), createdAt: Date.UTC(2026, 0, 1),
};
const mockSet = {
  id: 's1', workoutId: 'w1', exerciseId: 'ex1', setNumber: 1,
  setType: 'straight', actualReps: 10, weight: 20,
  evidenceClass: 'circuit', updatedAt: Date.UTC(2026, 0, 1), createdAt: Date.UTC(2026, 0, 1),
};
const mockRoutine = {
  id: 'r1', userId: 'local-user', name: 'Circuit Day',
  updatedAt: Date.UTC(2026, 0, 1), createdAt: Date.UTC(2026, 0, 1),
};
const mockRoutineExercise = {
  id: 're1', routineId: 'r1', exerciseId: 'ex1', exerciseName: 'Goblet Squat',
  orderInRoutine: 0, recommendedSets: 3, recommendedRepsMin: 10, recommendedRepsMax: 15,
  groupKind: 'circuit', roundRestSeconds: 90,
  updatedAt: Date.UTC(2026, 0, 1), createdAt: Date.UTC(2026, 0, 1),
};

const mockEmpty = jest.fn(async () => []);

jest.mock('../../database', () => new Proxy({
  __esModule: true,
  getAllWorkouts: jest.fn(async () => [mockWorkout]),
  getWorkoutSetsForWorkout: jest.fn(async () => [mockSet]),
  getAllRoutinesForUser: jest.fn(async () => [mockRoutine]),
  getAllRoutineExercisesForUser: jest.fn(async () => [mockRoutineExercise]),
}, {
  get(target, property) {
    if (property in target) return target[property];
    target[property] = mockEmpty;
    return target[property];
  },
}));

const upserts = {}; // table -> [{ rows, options }]
const mockSupabase = {
  from: jest.fn((table) => ({
    upsert: jest.fn(async (rows, options) => {
      (upserts[table] = upserts[table] || []).push({ rows, options });
      return { error: null };
    }),
  })),
};

jest.mock('../../supabase', () => ({
  getSupabaseClient: () => mockSupabase,
  hasLiveSession: jest.fn(async () => true),
}));
jest.mock('../../food/db', () => ({ getAllFoodSwapsSince: jest.fn(async () => []) }));
jest.mock('../../errorLog', () => ({
  logError: jest.fn(), logWarn: jest.fn(), logInfo: jest.fn(),
}));
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async () => null),
  setItem: jest.fn(async () => undefined),
  getAllKeys: jest.fn(async () => []),
  multiGet: jest.fn(async () => []),
  multiSet: jest.fn(async () => undefined),
}));

function resetUpserts() {
  for (const k of Object.keys(upserts)) delete upserts[k];
}

describe('EL-7/EL-9 circuit sync columns', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetUpserts();
  });

  test('push OMITS group_kind/round_rest_seconds/evidence_class while the flag is off', async () => {
    jest.resetModules();
    jest.doMock('../featureFlags', () => ({ CIRCUIT_SYNC_COLUMNS_ENABLED: false }));
    const { bulkUploadLocalData } = require('../../sync');

    await bulkUploadLocalData('cloud-user', 'local-user');

    const reRow = upserts.routine_exercises?.[0]?.rows?.[0];
    expect(reRow).toBeDefined();
    expect(reRow).not.toHaveProperty('group_kind');
    expect(reRow).not.toHaveProperty('round_rest_seconds');

    const setRow = upserts.workout_sets?.[0]?.rows?.[0];
    expect(setRow).toBeDefined();
    expect(setRow).not.toHaveProperty('evidence_class');
  });

  test('push INCLUDES group_kind/round_rest_seconds/evidence_class once the flag is on', async () => {
    jest.resetModules();
    jest.doMock('../featureFlags', () => ({ CIRCUIT_SYNC_COLUMNS_ENABLED: true }));
    const { bulkUploadLocalData } = require('../../sync');

    await bulkUploadLocalData('cloud-user', 'local-user');

    const reRow = upserts.routine_exercises?.[0]?.rows?.[0];
    expect(reRow).toMatchObject({ group_kind: 'circuit', round_rest_seconds: 90 });

    const setRow = upserts.workout_sets?.[0]?.rows?.[0];
    expect(setRow).toMatchObject({ evidence_class: 'circuit' });
  });
});
