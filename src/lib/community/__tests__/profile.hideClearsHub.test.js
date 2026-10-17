/**
 * profile.hideClearsHub.test.js - what this suite pins (audit 2026-10-17,
 * finding 1): after a SUCCESSFUL block or mute the cached Hub for the
 * current user is cleared, so a hidden person's posts never reappear from
 * the device cache. A failed block or mute leaves the cache alone.
 */

jest.mock('../transport', () => {
  class CommunityError extends Error {
    constructor(code) { super(code); this.name = 'CommunityError'; this.code = code; }
  }
  return { callCommunity: jest.fn(async () => ({})), CommunityError };
});
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async () => null), setItem: jest.fn(async () => {}), removeItem: jest.fn(async () => {}),
}));
jest.mock('../../database', () => ({ db: jest.fn(async () => null) }));
jest.mock('../../supabase', () => ({ getSupabaseClient: () => null }));
jest.mock('../../../store/useAppStore', () => ({
  __esModule: true,
  default: { getState: () => ({ user: { id: 'me-1' } }) },
}));
jest.mock('../feed', () => ({ clearCachedHub: jest.fn(async () => {}) }));

const { callCommunity } = require('../transport');
const { clearCachedHub } = require('../feed');
const { blockUser, muteUser, unmuteUser } = require('../profile');

beforeEach(() => jest.clearAllMocks());

test('a successful block clears the cached Hub for the current user', async () => {
  await blockUser('them-1');
  expect(clearCachedHub).toHaveBeenCalledWith('me-1');
});

test('a successful mute clears the cached Hub for the current user', async () => {
  await muteUser('them-1');
  expect(clearCachedHub).toHaveBeenCalledWith('me-1');
});

test('a failed block or mute leaves the cache alone', async () => {
  callCommunity.mockRejectedValueOnce(new Error('offline')).mockRejectedValueOnce(new Error('offline'));
  await expect(blockUser('them-1')).rejects.toThrow();
  await expect(muteUser('them-1')).rejects.toThrow();
  expect(clearCachedHub).not.toHaveBeenCalled();
});

test('a cache clear that throws never fails the block', async () => {
  clearCachedHub.mockRejectedValueOnce(new Error('storage'));
  await expect(blockUser('them-1')).resolves.toBeDefined();
});

test('unmute does not need to clear the cache', async () => {
  await unmuteUser('them-1');
  expect(clearCachedHub).not.toHaveBeenCalled();
});
