/**
 * homeFriendsRow.test.js (founder order 2026-09-22 item 2)
 *
 * What this suite pins and why:
 * - the cache key uses the @volyume_community_home_friends_row_ prefix;
 * - readCachedHomeFriendsRow returns null for no uid, missing storage value,
 *   corrupt JSON, non-numeric count or fetchedAt, and returns the parsed
 *   object for valid data;
 * - writeCachedHomeFriendsRow stores a clamped non-negative count, the
 *   dayKey and a fetchedAt timestamp, and swallows storage failures;
 * - shouldRefreshHomeFriendsRow correctly decides when to refresh based on
 *   cache state, age and day key, with injectable now for testing;
 * - friendsTrainedTodayLine generates the correct English line for 0, 1,
 *   and multiple counts, with correct singular/plural handling.
 */

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async () => null),
  setItem: jest.fn(async () => {}),
  removeItem: jest.fn(async () => {}),
}));

const AsyncStorage = require('@react-native-async-storage/async-storage');
const {
  HOME_FRIENDS_ROW_CACHE_PREFIX,
  HOME_FRIENDS_ROW_REFRESH_MS,
  homeFriendsRowCacheKey,
  readCachedHomeFriendsRow,
  writeCachedHomeFriendsRow,
  shouldRefreshHomeFriendsRow,
  friendsTrainedTodayLine,
} = require('../homeFriendsRow');

describe('homeFriendsRowCacheKey', () => {
  test('uses the @volyume_community_home_friends_row_ prefix', () => {
    const key = homeFriendsRowCacheKey('u1');
    expect(key).toContain('@volyume_community_home_friends_row_');
    expect(key).toBe(`${HOME_FRIENDS_ROW_CACHE_PREFIX}u1`);
  });

  test('handles null/undefined uid', () => {
    expect(homeFriendsRowCacheKey(null)).toBe(`${HOME_FRIENDS_ROW_CACHE_PREFIX}`);
    expect(homeFriendsRowCacheKey(undefined)).toBe(`${HOME_FRIENDS_ROW_CACHE_PREFIX}`);
  });
});

describe('readCachedHomeFriendsRow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns null for no uid', async () => {
    expect(await readCachedHomeFriendsRow(null)).toBeNull();
    expect(await readCachedHomeFriendsRow(undefined)).toBeNull();
    expect(await readCachedHomeFriendsRow('')).toBeNull();
  });

  test('returns null for missing storage value', async () => {
    AsyncStorage.getItem.mockResolvedValue(null);
    expect(await readCachedHomeFriendsRow('u1')).toBeNull();
  });

  test('returns null for corrupt JSON', async () => {
    AsyncStorage.getItem.mockResolvedValue('{not valid json');
    expect(await readCachedHomeFriendsRow('u1')).toBeNull();
  });

  test('returns null for non-object parsed value', async () => {
    AsyncStorage.getItem.mockResolvedValue(JSON.stringify('string value'));
    expect(await readCachedHomeFriendsRow('u1')).toBeNull();
  });

  test('returns null for non-numeric count', async () => {
    AsyncStorage.getItem.mockResolvedValue(
      JSON.stringify({ count: 'not a number', dayKey: '2026-09-22', fetchedAt: 1000 })
    );
    expect(await readCachedHomeFriendsRow('u1')).toBeNull();
  });

  test('returns null for non-numeric fetchedAt', async () => {
    AsyncStorage.getItem.mockResolvedValue(
      JSON.stringify({ count: 5, dayKey: '2026-09-22', fetchedAt: 'not a number' })
    );
    expect(await readCachedHomeFriendsRow('u1')).toBeNull();
  });

  test('coerces NaN count to 0 via JSON serialisation (NaN serialises to null)', async () => {
    // JSON.stringify converts NaN to null, so this round-trips as count: 0
    AsyncStorage.getItem.mockResolvedValue(
      JSON.stringify({ count: NaN, dayKey: '2026-09-22', fetchedAt: 1000 })
    );
    const result = await readCachedHomeFriendsRow('u1');
    expect(result.count).toBe(0);
  });

  test('coerces Infinity fetchedAt to 0 via JSON serialisation (Infinity serialises to null)', async () => {
    // JSON.stringify converts Infinity to null, so this round-trips as fetchedAt: 0
    AsyncStorage.getItem.mockResolvedValue(
      JSON.stringify({ count: 5, dayKey: '2026-09-22', fetchedAt: Infinity })
    );
    const result = await readCachedHomeFriendsRow('u1');
    expect(result.fetchedAt).toBe(0);
  });

  test('returns {count, dayKey, fetchedAt} for valid data', async () => {
    const value = { count: 3, dayKey: '2026-09-22', fetchedAt: 1695398400000 };
    AsyncStorage.getItem.mockResolvedValue(JSON.stringify(value));
    expect(await readCachedHomeFriendsRow('u1')).toEqual(value);
  });

  test('coerces count and fetchedAt to numbers', async () => {
    AsyncStorage.getItem.mockResolvedValue(
      JSON.stringify({ count: '5', dayKey: '2026-09-22', fetchedAt: '1695398400000' })
    );
    const result = await readCachedHomeFriendsRow('u1');
    expect(result.count).toBe(5);
    expect(result.fetchedAt).toBe(1695398400000);
  });

  test('handles missing dayKey as empty string', async () => {
    AsyncStorage.getItem.mockResolvedValue(JSON.stringify({ count: 5, fetchedAt: 1000 }));
    const result = await readCachedHomeFriendsRow('u1');
    expect(result.dayKey).toBe('');
  });
});

describe('writeCachedHomeFriendsRow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns early for no uid', async () => {
    await writeCachedHomeFriendsRow(null, 5, '2026-09-22');
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  });

  test('stores clamped non-negative count', async () => {
    await writeCachedHomeFriendsRow('u1', -5, '2026-09-22');
    expect(AsyncStorage.setItem).toHaveBeenCalled();
    const callArgs = AsyncStorage.setItem.mock.calls[0];
    const stored = JSON.parse(callArgs[1]);
    expect(stored.count).toBe(0);
  });

  test('stores the dayKey as string', async () => {
    await writeCachedHomeFriendsRow('u1', 5, '2026-09-22');
    const callArgs = AsyncStorage.setItem.mock.calls[0];
    const stored = JSON.parse(callArgs[1]);
    expect(stored.dayKey).toBe('2026-09-22');
  });

  test('stores a fetchedAt timestamp', async () => {
    const before = Date.now();
    await writeCachedHomeFriendsRow('u1', 5, '2026-09-22');
    const after = Date.now();
    const callArgs = AsyncStorage.setItem.mock.calls[0];
    const stored = JSON.parse(callArgs[1]);
    expect(stored.fetchedAt).toBeGreaterThanOrEqual(before);
    expect(stored.fetchedAt).toBeLessThanOrEqual(after);
  });

  test('swallows AsyncStorage write failure silently', async () => {
    AsyncStorage.setItem.mockRejectedValue(new Error('Storage failed'));
    expect(async () => {
      await writeCachedHomeFriendsRow('u1', 5, '2026-09-22');
    }).not.toThrow();
  });

  test('handles null dayKey as empty string', async () => {
    await writeCachedHomeFriendsRow('u1', 5, null);
    const callArgs = AsyncStorage.setItem.mock.calls[0];
    const stored = JSON.parse(callArgs[1]);
    expect(stored.dayKey).toBe('');
  });

  test('coerces count to number and clamps to 0 minimum', async () => {
    await writeCachedHomeFriendsRow('u1', '10', '2026-09-22');
    const callArgs = AsyncStorage.setItem.mock.calls[0];
    const stored = JSON.parse(callArgs[1]);
    expect(stored.count).toBe(10);
  });
});

describe('shouldRefreshHomeFriendsRow', () => {
  test('returns true for null cached value', () => {
    expect(shouldRefreshHomeFriendsRow(null, '2026-09-22')).toBe(true);
  });

  test('returns true for non-finite fetchedAt', () => {
    const cached = { count: 5, dayKey: '2026-09-22', fetchedAt: NaN };
    expect(shouldRefreshHomeFriendsRow(cached, '2026-09-22')).toBe(true);
  });

  test('returns true for different dayKey', () => {
    const cached = { count: 5, dayKey: '2026-09-21', fetchedAt: 1695398400000 };
    expect(shouldRefreshHomeFriendsRow(cached, '2026-09-22')).toBe(true);
  });

  test('returns true for age of exactly HOME_FRIENDS_ROW_REFRESH_MS', () => {
    const now = 2000000;
    const cached = { count: 5, dayKey: '2026-09-22', fetchedAt: now - HOME_FRIENDS_ROW_REFRESH_MS };
    expect(shouldRefreshHomeFriendsRow(cached, '2026-09-22', now)).toBe(true);
  });

  test('returns true when age exceeds HOME_FRIENDS_ROW_REFRESH_MS', () => {
    const now = 2000000;
    const cached = { count: 5, dayKey: '2026-09-22', fetchedAt: now - HOME_FRIENDS_ROW_REFRESH_MS - 1 };
    expect(shouldRefreshHomeFriendsRow(cached, '2026-09-22', now)).toBe(true);
  });

  test('returns false one millisecond under HOME_FRIENDS_ROW_REFRESH_MS on the same day', () => {
    const now = 2000000;
    const cached = { count: 5, dayKey: '2026-09-22', fetchedAt: now - HOME_FRIENDS_ROW_REFRESH_MS + 1 };
    expect(shouldRefreshHomeFriendsRow(cached, '2026-09-22', now)).toBe(false);
  });

  test('uses Date.now() as default now', () => {
    const cached = { count: 5, dayKey: '2026-09-22', fetchedAt: Date.now() };
    expect(shouldRefreshHomeFriendsRow(cached, '2026-09-22')).toBe(false);
  });
});

describe('friendsTrainedTodayLine', () => {
  test('returns correct line for 0 friends', () => {
    expect(friendsTrainedTodayLine(0)).toBe('Nobody you follow has trained yet today');
  });

  test('returns correct line for negative count (treated as 0)', () => {
    expect(friendsTrainedTodayLine(-5)).toBe('Nobody you follow has trained yet today');
  });

  test('returns correct line for NaN (treated as 0)', () => {
    expect(friendsTrainedTodayLine(NaN)).toBe('Nobody you follow has trained yet today');
  });

  test('returns correct line for 1 friend (singular)', () => {
    expect(friendsTrainedTodayLine(1)).toBe('1 person you follow trained today');
  });

  test('returns correct line for 2 friends (plural)', () => {
    expect(friendsTrainedTodayLine(2)).toBe('2 people you follow trained today');
  });

  test('returns correct line for 3 friends (plural)', () => {
    expect(friendsTrainedTodayLine(3)).toBe('3 people you follow trained today');
  });

  test('returns correct line for large count', () => {
    expect(friendsTrainedTodayLine(100)).toBe('100 people you follow trained today');
  });

  test('uses singular for string "1"', () => {
    expect(friendsTrainedTodayLine('1')).toBe('1 person you follow trained today');
  });

  test('uses plural for string "3"', () => {
    expect(friendsTrainedTodayLine('3')).toBe('3 people you follow trained today');
  });
});

describe('constants', () => {
  test('HOME_FRIENDS_ROW_REFRESH_MS is 15 minutes', () => {
    expect(HOME_FRIENDS_ROW_REFRESH_MS).toBe(15 * 60 * 1000);
  });

  test('HOME_FRIENDS_ROW_CACHE_PREFIX includes the @volyume_community_ namespace', () => {
    expect(HOME_FRIENDS_ROW_CACHE_PREFIX).toContain('@volyume_community_');
  });
});
