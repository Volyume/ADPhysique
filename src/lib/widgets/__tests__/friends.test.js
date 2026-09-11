/**
 * CR-14 (`docs/communities-revamp-2026-09-10/24-PHASE4-SPEC.md` section 3)
 * -- pins the "friends trained today" count feeder. Written to FAIL
 * against a wrong implementation:
 *  - counting excludes the caller's own row and any row without
 *    trainedToday, and clamps a hostile count to 0..999;
 *  - no count RPC call (no network) when there is no cached Community
 *    profile (spec section 1 rule 7: never a Community RPC for someone
 *    who has not joined);
 *  - a CommunityError-shaped rejection and a plain thrown error both
 *    resolve to null and leave the cache untouched (best-effort: never
 *    surfaced, never partially written);
 *  - a success writes the AsyncStorage cache with today's dayKey.
 */
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: { getItem: jest.fn(), setItem: jest.fn(), removeItem: jest.fn() },
}));
jest.mock('../../community/transport', () => ({ callCommunity: jest.fn() }));
jest.mock('../../community/profile', () => ({ readCachedMe: jest.fn(), hasProfile: jest.fn() }));

const AsyncStorage = require('@react-native-async-storage/async-storage').default;
const { callCommunity } = require('../../community/transport');
const { readCachedMe, hasProfile } = require('../../community/profile');
const { todayLocalKey } = require('../../dayKey');
const {
  FRIENDS_CACHE_KEY, friendsCacheKey, clampFriendsCount, readCachedFriends,
  fetchFriendsTrainedToday, clearCachedFriends,
} = require('../friends');

beforeEach(() => {
  jest.clearAllMocks();
  readCachedMe.mockResolvedValue({ profile: { handle: 'u1' } });
  hasProfile.mockReturnValue(true);
});

describe('clampFriendsCount (migration 171: the server counts, the client clamps)', () => {
  test('a plain integer passes through; anything else is 0; the cap is 999', () => {
    expect(clampFriendsCount(2)).toBe(2);
    expect(clampFriendsCount('3')).toBe(3);
    expect(clampFriendsCount(null)).toBe(0);
    expect(clampFriendsCount(undefined)).toBe(0);
    expect(clampFriendsCount('not a number')).toBe(0);
    expect(clampFriendsCount(-4)).toBe(0);
    expect(clampFriendsCount(1200)).toBe(999);
    expect(clampFriendsCount(2.7)).toBe(2);
  });
});

describe('fetchFriendsTrainedToday: guard 7 (no profile, no RPC)', () => {
  test('no cached profile: the count RPC is never called, resolves null', async () => {
    hasProfile.mockReturnValue(false);
    const out = await fetchFriendsTrainedToday('u1');
    expect(callCommunity).not.toHaveBeenCalled();
    expect(out).toBeNull();
  });

  test('no uid at all: the count RPC is never called, resolves null', async () => {
    const out = await fetchFriendsTrainedToday(null);
    expect(callCommunity).not.toHaveBeenCalled();
    expect(out).toBeNull();
  });
});

describe('fetchFriendsTrainedToday: failures are swallowed, cache untouched', () => {
  test('a CommunityError-shaped rejection resolves null and never writes the cache', async () => {
    const err = Object.assign(new Error('offline'), { name: 'CommunityError', code: 'offline' });
    callCommunity.mockRejectedValue(err);
    const out = await fetchFriendsTrainedToday('u1');
    expect(out).toBeNull();
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  });

  test('a plain thrown network error also resolves null and never writes the cache', async () => {
    callCommunity.mockRejectedValue(new Error('network request failed'));
    const out = await fetchFriendsTrainedToday('u1');
    expect(out).toBeNull();
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  });
});

describe('fetchFriendsTrainedToday: a success', () => {
  test('asks the count RPC for today and writes the cache with that same dayKey', async () => {
    callCommunity.mockResolvedValue(2);
    const out = await fetchFriendsTrainedToday('u1');
    // Review 2026-09-11 finding 3: the SAME day key goes to the server and
    // onto the cache, from one clock read, so a call straddling midnight can
    // never stamp yesterday's server answer as today's. Migration 171: the
    // count-only RPC, never the board.
    expect(callCommunity).toHaveBeenCalledWith('community_friends_trained_today', { _today: todayLocalKey() });
    expect(out).toEqual({ dayKey: todayLocalKey(), count: 2, fetchedAt: expect.any(Number) });
    // Finding 5: the cache is namespaced by account.
    expect(friendsCacheKey('u1')).toBe(`${FRIENDS_CACHE_KEY}:u1`);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(friendsCacheKey('u1'), JSON.stringify(out));
  });
});

describe('readCachedFriends', () => {
  test('a well-shaped cache entry is returned as-is', async () => {
    AsyncStorage.getItem.mockResolvedValue(JSON.stringify({ dayKey: '2026-09-11', count: 3, fetchedAt: 123 }));
    expect(await readCachedFriends('u1')).toEqual({ dayKey: '2026-09-11', count: 3, fetchedAt: 123 });
  });

  test('missing, malformed or hostile cache content never throws and returns null', async () => {
    AsyncStorage.getItem.mockResolvedValue(null);
    expect(await readCachedFriends('u1')).toBeNull();

    AsyncStorage.getItem.mockResolvedValue('not json');
    expect(await readCachedFriends('u1')).toBeNull();

    AsyncStorage.getItem.mockResolvedValue(JSON.stringify({ dayKey: 4, count: 'x' }));
    expect(await readCachedFriends('u1')).toBeNull();

    AsyncStorage.getItem.mockResolvedValue(JSON.stringify([1, 2, 3]));
    expect(await readCachedFriends('u1')).toBeNull();

    AsyncStorage.getItem.mockRejectedValue(new Error('fs down'));
    expect(await readCachedFriends('u1')).toBeNull();
  });
});

describe('clearCachedFriends (review 2026-09-11 finding 5)', () => {
  test('removes this account\'s key only and never throws', async () => {
    await clearCachedFriends('u1');
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith(friendsCacheKey('u1'));
    AsyncStorage.removeItem.mockRejectedValueOnce(new Error('fs down'));
    await expect(clearCachedFriends('u1')).resolves.toBeUndefined();
    await clearCachedFriends(null);
    expect(AsyncStorage.removeItem).toHaveBeenCalledTimes(2);
  });

  test('readCachedFriends without an account id reads nothing', async () => {
    expect(await readCachedFriends(null)).toBeNull();
    expect(AsyncStorage.getItem).not.toHaveBeenCalled();
  });
});
