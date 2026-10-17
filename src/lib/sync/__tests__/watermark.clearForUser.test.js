/**
 * B4 (audit 2026-10-17): sign-out removes a user's pull and push watermarks
 * BEFORE the SQLite wipe, so a failed AsyncStorage clear can never leave a
 * cursor over an empty database. This pins the helper that does it: it removes
 * every table's pull and push key for ONE user and touches nothing else.
 */
const mockStore = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
  getAllKeys: jest.fn(() => Promise.resolve(Object.keys(mockStore))),
  multiRemove: jest.fn((keys) => { keys.forEach((k) => { delete mockStore[k]; }); return Promise.resolve(); }),
  getItem: jest.fn((k) => Promise.resolve(mockStore[k] ?? null)),
  setItem: jest.fn((k, v) => { mockStore[k] = v; return Promise.resolve(); }),
}));

const { clearWatermarksForUser, PULL_WM_PREFIX, PUSH_WM_PREFIX } = require('../watermark');

beforeEach(() => { for (const k of Object.keys(mockStore)) delete mockStore[k]; });

test('removes every pull and push key for the user, and only that user', async () => {
  mockStore[`${PULL_WM_PREFIX}u1_workouts`] = '10';
  mockStore[`${PULL_WM_PREFIX}u1_food_entries`] = '11';
  mockStore[`${PUSH_WM_PREFIX}u1_workouts`] = '12';
  mockStore[`${PULL_WM_PREFIX}u2_workouts`] = '13';
  mockStore['@volyume_something_else'] = 'keep';
  const n = await clearWatermarksForUser('u1');
  expect(n).toBe(3);
  expect(Object.keys(mockStore).sort()).toEqual([`${PULL_WM_PREFIX}u2_workouts`, '@volyume_something_else'].sort());
});

test('a user id that prefixes another does not take the other\'s keys', async () => {
  mockStore[`${PULL_WM_PREFIX}u10_workouts`] = '1';
  expect(await clearWatermarksForUser('u1')).toBe(0);
  expect(mockStore[`${PULL_WM_PREFIX}u10_workouts`]).toBe('1');
});

test('no user id removes nothing', async () => {
  mockStore[`${PULL_WM_PREFIX}u1_workouts`] = '1';
  expect(await clearWatermarksForUser(null)).toBe(0);
  expect(Object.keys(mockStore)).toHaveLength(1);
});
