/**
 * CR-14 (`docs/communities-revamp-2026-09-10/24-PHASE4-SPEC.md` section 3)
 * -- pins the "friends trained today" count feeder. Written to FAIL
 * against a wrong implementation:
 *  - counting excludes the caller's own row and any row without
 *    trainedToday, and clamps a hostile count to 0..999;
 *  - no `loadBoard` call (no network) when there is no cached Community
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
jest.mock('../../community/boards', () => ({ loadBoard: jest.fn() }));
jest.mock('../../community/profile', () => ({ readCachedMe: jest.fn(), hasProfile: jest.fn() }));

const AsyncStorage = require('@react-native-async-storage/async-storage').default;
const { loadBoard } = require('../../community/boards');
const { readCachedMe, hasProfile } = require('../../community/profile');
const { todayLocalKey } = require('../../dayKey');
const {
  FRIENDS_CACHE_KEY, friendsCacheKey, countFriendsTrainedToday, readCachedFriends,
  fetchFriendsTrainedToday, clearCachedFriends,
} = require('../friends');

beforeEach(() => {
  jest.clearAllMocks();
  readCachedMe.mockResolvedValue({ profile: { handle: 'u1' } });
  hasProfile.mockReturnValue(true);
});

describe('countFriendsTrainedToday', () => {
  test('counts only rows that trained today and excludes the caller\'s own row', () => {
    const rows = [
      { trainedToday: true, isYou: false },
      { trainedToday: true, isYou: true }, // own row, trained today: excluded
      { trainedToday: false, isYou: false }, // not trained today: excluded
      { trainedToday: true, isYou: false },
    ];
    expect(countFriendsTrainedToday(rows)).toBe(2);
  });

  test('clamps to 0..999 and never throws on hostile input', () => {
    expect(countFriendsTrainedToday(null)).toBe(0);
    expect(countFriendsTrainedToday(undefined)).toBe(0);
    expect(countFriendsTrainedToday('not an array')).toBe(0);
    const huge = Array.from({ length: 1200 }, () => ({ trainedToday: true, isYou: false }));
    expect(countFriendsTrainedToday(huge)).toBe(999);
  });
});

describe('fetchFriendsTrainedToday: guard 7 (no profile, no RPC)', () => {
  test('no cached profile: loadBoard is never called, resolves null', async () => {
    hasProfile.mockReturnValue(false);
    const out = await fetchFriendsTrainedToday('u1');
    expect(loadBoard).not.toHaveBeenCalled();
    expect(out).toBeNull();
  });

  test('no uid at all: loadBoard is never called, resolves null', async () => {
    const out = await fetchFriendsTrainedToday(null);
    expect(loadBoard).not.toHaveBeenCalled();
    expect(out).toBeNull();
  });
});

describe('fetchFriendsTrainedToday: failures are swallowed, cache untouched', () => {
  test('a CommunityError-shaped rejection resolves null and never writes the cache', async () => {
    const err = Object.assign(new Error('offline'), { name: 'CommunityError', code: 'offline' });
    loadBoard.mockRejectedValue(err);
    const out = await fetchFriendsTrainedToday('u1');
    expect(out).toBeNull();
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  });

  test('a plain thrown network error also resolves null and never writes the cache', async () => {
    loadBoard.mockRejectedValue(new Error('network request failed'));
    const out = await fetchFriendsTrainedToday('u1');
    expect(out).toBeNull();
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  });
});

describe('fetchFriendsTrainedToday: a success', () => {
  test('counts the following-board rows and writes the cache with today\'s dayKey', async () => {
    loadBoard.mockResolvedValue({
      rows: [
        { trainedToday: true, isYou: false },
        { trainedToday: true, isYou: false },
        { trainedToday: false, isYou: false },
        { trainedToday: true, isYou: true },
      ],
    });
    const out = await fetchFriendsTrainedToday('u1');
    // Review 2026-09-11 finding 3: the SAME day key goes to the server and
    // onto the cache, from one clock read, so a call straddling midnight can
    // never stamp yesterday's server answer as today's.
    expect(loadBoard).toHaveBeenCalledWith({
      scope: 'following', window: 'week', limit: 50, today: todayLocalKey(),
    });
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
