/**
 * Reset and restore (founder answer 2026-10-17): when the phone's database
 * file is deleted and no signed-in user is known, every pull and push
 * watermark must go, or the next pull would be incremental over an empty
 * database. This pins the all-users helper: it removes every key under both
 * watermark prefixes, for every user, and touches nothing else (consent,
 * auth and preference keys survive).
 */
const mockStore = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
  getAllKeys: jest.fn(() => Promise.resolve(Object.keys(mockStore))),
  multiRemove: jest.fn((keys) => { keys.forEach((k) => { delete mockStore[k]; }); return Promise.resolve(); }),
  getItem: jest.fn((k) => Promise.resolve(mockStore[k] ?? null)),
  setItem: jest.fn((k, v) => { mockStore[k] = v; return Promise.resolve(); }),
}));

const AsyncStorage = require('@react-native-async-storage/async-storage');
const { clearAllWatermarks, PULL_WM_PREFIX, PUSH_WM_PREFIX } = require('../watermark');

beforeEach(() => {
  for (const k of Object.keys(mockStore)) delete mockStore[k];
  jest.clearAllMocks();
});

test('removes every pull and push key for every user, and nothing else', async () => {
  mockStore[`${PULL_WM_PREFIX}u1_workouts`] = '10';
  mockStore[`${PUSH_WM_PREFIX}u1_workouts`] = '11';
  mockStore[`${PULL_WM_PREFIX}u2_food_entries`] = '12';
  mockStore['@volyume_health_consent_u1'] = 'granted';
  mockStore['@volyume_user_profile_u1'] = '{}';
  const n = await clearAllWatermarks();
  expect(n).toBe(3);
  expect(Object.keys(mockStore).sort()).toEqual(['@volyume_health_consent_u1', '@volyume_user_profile_u1']);
});

test('with no watermarks it removes nothing and does not call multiRemove', async () => {
  mockStore['@volyume_something_else'] = 'keep';
  expect(await clearAllWatermarks()).toBe(0);
  expect(AsyncStorage.multiRemove).not.toHaveBeenCalled();
  expect(mockStore['@volyume_something_else']).toBe('keep');
});

test('a storage failure is thrown to the caller, not swallowed', async () => {
  AsyncStorage.getAllKeys.mockImplementationOnce(() => Promise.reject(new Error('storage down')));
  await expect(clearAllWatermarks()).rejects.toThrow('storage down');
});
