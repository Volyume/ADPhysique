/** Actual bulk-sync path: durable local rows are re-read on every attempt. */
const mockResolutionRows = [{
  id: 'sr_week-1_routine-legs', userId: 'local-user',
  mesocycleWeekId: 'week-1', routineId: 'routine-legs', mesocycleId: 'block-1',
  resolution: 'skipped_by_user', workoutId: null,
  resolvedAt: Date.UTC(2026, 0, 1), createdAt: Date.UTC(2026, 0, 1),
  updatedAt: Date.UTC(2026, 0, 1), deletedAt: null,
}];

const mockGetAllSessionResolutionsForUser = jest.fn(async () => mockResolutionRows);
const mockEmpty = jest.fn(async () => []);

jest.mock('../database', () => new Proxy({
  __esModule: true,
  getAllSessionResolutionsForUser: mockGetAllSessionResolutionsForUser,
}, {
  get(target, property) {
    if (property in target) return target[property];
    target[property] = mockEmpty;
    return target[property];
  },
}));

let mockTableMissing = true;
const mockSessionUpserts = [];
const mockSupabase = {
  from: jest.fn((table) => ({
    upsert: jest.fn(async (rows, options) => {
      if (table === 'session_resolutions') {
        mockSessionUpserts.push({ rows, options });
        return mockTableMissing
          ? { error: { code: '42P01', message: 'session_resolutions does not exist' } }
          : { error: null };
      }
      return { error: null };
    }),
  })),
};

jest.mock('../supabase', () => ({
  getSupabaseClient: () => mockSupabase,
  hasLiveSession: jest.fn(async () => true),
}));
jest.mock('../food/db', () => ({ getAllFoodSwapsSince: jest.fn(async () => []) }));
jest.mock('../errorLog', () => ({
  logError: jest.fn(), logWarn: jest.fn(), logInfo: jest.fn(),
}));
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async () => null),
  setItem: jest.fn(async () => undefined),
  getAllKeys: jest.fn(async () => []),
  multiGet: jest.fn(async () => []),
  multiSet: jest.fn(async () => undefined),
}));

const { bulkUploadLocalData } = require('../sync');

beforeEach(() => {
  jest.clearAllMocks();
  mockSessionUpserts.length = 0;
  mockTableMissing = true;
  mockGetAllSessionResolutionsForUser.mockResolvedValue(mockResolutionRows);
});

test('a pre-migration failure leaves the durable row eligible for a later sync', async () => {
  const failed = await bulkUploadLocalData('cloud-user', 'local-user');
  expect(failed.errors).toBeGreaterThan(0);
  expect(mockSessionUpserts).toHaveLength(1);
  expect(mockSessionUpserts[0].rows[0]).toMatchObject({
    id: 'sr_week-1_routine-legs', user_id: 'cloud-user',
    mesocycle_week_id: 'week-1', routine_id: 'routine-legs',
    resolution: 'skipped_by_user',
  });

  // Migration lands later. No queue acknowledgement or watermark has removed
  // the row: the next ordinary bulk cycle reads it from SQLite again.
  mockTableMissing = false;
  const retried = await bulkUploadLocalData('cloud-user', 'local-user');
  expect(retried.errors).toBe(0);
  expect(mockGetAllSessionResolutionsForUser).toHaveBeenCalledTimes(2);
  expect(mockSessionUpserts).toHaveLength(2);
  expect(mockSessionUpserts[1].rows).toEqual(mockSessionUpserts[0].rows);
  expect(mockSessionUpserts[1].options).toEqual({ onConflict: 'user_id,id' });
});
