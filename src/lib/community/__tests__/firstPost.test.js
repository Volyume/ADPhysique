/**
 * firstPost.test.js (D228 item 1, option B).
 *
 * What this suite pins, and why each case is written to FAIL: the first
 * automatic post to Community waits for ONE confirmation per person. The
 * confirmation is a per-user device key, and it FAILS CLOSED: a key that
 * cannot be read means "not confirmed", so a storage fault can only ever
 * hold a post back, never release one. Only the exact stored value '1'
 * confirms; anything else (a stray string, a stale format) does not.
 */

const mockStore = new Map();
let mockReadThrows = false;
let mockWriteThrows = false;
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (k) => {
      if (mockReadThrows) throw new Error('storage unreadable');
      return mockStore.has(k) ? mockStore.get(k) : null;
    }),
    setItem: jest.fn(async (k, v) => {
      if (mockWriteThrows) throw new Error('storage unwritable');
      mockStore.set(k, v);
    }),
    removeItem: jest.fn(async (k) => { mockStore.delete(k); }),
  },
}));

const {
  FIRST_POST_AUDIENCES, firstPostConfirmedKey, readFirstPostConfirmed, markFirstPostConfirmed,
} = require('../firstPost');

beforeEach(() => {
  mockStore.clear();
  mockReadThrows = false;
  mockWriteThrows = false;
});

describe('the confirmation key', () => {
  test('is per user, under the Volyume community prefix', () => {
    expect(firstPostConfirmedKey('u1')).toBe('@volyume_community_first_post_confirmed_u1');
    expect(firstPostConfirmedKey('u2')).toBe('@volyume_community_first_post_confirmed_u2');
  });
});

describe('readFirstPostConfirmed', () => {
  test('a person who has never answered is not confirmed', async () => {
    expect(await readFirstPostConfirmed('u1')).toBe(false);
  });

  test('marking confirms that person only', async () => {
    await markFirstPostConfirmed('u1');
    expect(await readFirstPostConfirmed('u1')).toBe(true);
    expect(await readFirstPostConfirmed('u2')).toBe(false);
  });

  test('FAILS CLOSED: an unreadable key reads as not confirmed', async () => {
    await markFirstPostConfirmed('u1');
    mockReadThrows = true;
    expect(await readFirstPostConfirmed('u1')).toBe(false);
  });

  test('only the exact stored value confirms', async () => {
    mockStore.set(firstPostConfirmedKey('u1'), 'true');
    expect(await readFirstPostConfirmed('u1')).toBe(false);
    mockStore.set(firstPostConfirmedKey('u1'), '');
    expect(await readFirstPostConfirmed('u1')).toBe(false);
  });

  test('no account id: not confirmed, and no read is made', async () => {
    expect(await readFirstPostConfirmed()).toBe(false);
    expect(await readFirstPostConfirmed(null)).toBe(false);
  });
});

describe('markFirstPostConfirmed', () => {
  test('answers true when the key was written', async () => {
    expect(await markFirstPostConfirmed('u1')).toBe(true);
    expect(mockStore.get(firstPostConfirmedKey('u1'))).toBe('1');
  });

  test('a failed write never throws and answers false (the sheet then returns, which is the closed direction)', async () => {
    mockWriteThrows = true;
    await expect(markFirstPostConfirmed('u1')).resolves.toBe(false);
    mockWriteThrows = false;
    expect(await readFirstPostConfirmed('u1')).toBe(false);
  });

  test('no account id writes nothing', async () => {
    expect(await markFirstPostConfirmed()).toBe(false);
    expect(mockStore.size).toBe(0);
  });
});

describe('the audiences the sheet can write', () => {
  test('exactly Everyone and Followers, in that order, as sessions_audience values', () => {
    expect(FIRST_POST_AUDIENCES).toEqual(['everyone', 'followers']);
  });
});
