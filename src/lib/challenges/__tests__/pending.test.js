/**
 * Pins the pending challenge code (gym challenge SPEC section 2): codes are
 * lower-cased and validated as [a-z0-9-]{3,32} or ignored; take clears,
 * peek does not; the Play install referrer is read on Android only, once per
 * install, and only a challenge=<code> value is kept; failures never throw.
 * A pending code belongs to whoever is signed in when it is first looked at
 * and is dropped when a different person signs in; the active flag is kept
 * per user.
 */
const mockStore = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (k) => (k in mockStore ? mockStore[k] : null)),
    setItem: jest.fn(async (k, v) => { mockStore[k] = v; }),
    removeItem: jest.fn(async (k) => { delete mockStore[k]; }),
  },
}));
const mockLogError = jest.fn();
jest.mock('../../errorLog', () => ({ logError: (...a) => mockLogError(...a) }));
const mockReferrer = jest.fn();
const mockInstalledAt = jest.fn(async () => new Date());
jest.mock('expo-application', () => ({
  getInstallReferrerAsync: (...a) => mockReferrer(...a),
  getInstallationTimeAsync: (...a) => mockInstalledAt(...a),
}));
const mockRN = { Platform: { OS: 'android' } };
jest.mock('react-native', () => mockRN);
let mockUser = null;
jest.mock('../../../store/useAppStore', () => ({
  __esModule: true,
  default: { getState: () => ({ user: mockUser }) },
}));

const pending = require('../pending');

beforeEach(() => {
  Object.keys(mockStore).forEach((k) => delete mockStore[k]);
  jest.clearAllMocks();
  pending._resetPendingForTests();
  mockRN.Platform.OS = 'android';
  mockUser = null;
});

test('normalise: lower-cases, trims, rejects bad shapes', () => {
  expect(pending.normaliseChallengeCode(' Volt-NOV ')).toBe('volt-nov');
  expect(pending.normaliseChallengeCode('ab')).toBeNull();
  expect(pending.normaliseChallengeCode('a'.repeat(33))).toBeNull();
  expect(pending.normaliseChallengeCode('volt_nov')).toBeNull();
  expect(pending.normaliseChallengeCode('volt nov')).toBeNull();
  expect(pending.normaliseChallengeCode(null)).toBeNull();
});

test('set ignores an invalid code; peek keeps, take clears', async () => {
  expect(await pending.setPendingChallenge('no!')).toBe(false);
  expect(await pending.peekPendingChallenge()).toBeNull();
  expect(await pending.setPendingChallenge('Volt-Nov')).toBe(true);
  expect(await pending.peekPendingChallenge()).toBe('volt-nov');
  expect(await pending.peekPendingChallenge()).toBe('volt-nov');
  expect(await pending.takePendingChallenge()).toBe('volt-nov');
  expect(await pending.peekPendingChallenge()).toBeNull();
});

test('subscribers hear a set and a clear', async () => {
  const seen = [];
  pending.subscribePendingChallenge((c) => seen.push(c));
  await pending.setPendingChallenge('volt-nov');
  await pending.clearPendingChallenge();
  expect(seen).toEqual(['volt-nov', null]);
});

test('referrer parse: decoded, picks challenge among other params, rejects junk', () => {
  expect(pending.parseChallengeFromReferrer('challenge=volt-nov')).toBe('volt-nov');
  expect(pending.parseChallengeFromReferrer('utm_source=poster&challenge=Volt-Nov')).toBe('volt-nov');
  expect(pending.parseChallengeFromReferrer('challenge%3Dvolt-nov')).toBeNull();
  expect(pending.parseChallengeFromReferrer('challenge=%E0%A4%A')).toBeNull();
  expect(pending.parseChallengeFromReferrer('utm_source=google-play')).toBeNull();
  expect(pending.parseChallengeFromReferrer('')).toBeNull();
  expect(pending.parseChallengeFromReferrer(undefined)).toBeNull();
});

test('referrer is read once per install and stores the code', async () => {
  mockReferrer.mockResolvedValue('challenge=volt-nov');
  expect(await pending.readInstallReferrerOnce()).toBe('volt-nov');
  expect(await pending.peekPendingChallenge()).toBe('volt-nov');
  // A "new launch": fresh module state, same stored once-flag.
  pending._resetPendingForTests();
  expect(await pending.readInstallReferrerOnce()).toBeNull();
  expect(mockReferrer).toHaveBeenCalledTimes(1);
});

test('an old install never hands over its referrer code (a later account on the same phone)', async () => {
  mockInstalledAt.mockResolvedValueOnce(new Date(Date.now() - 4 * 24 * 60 * 60 * 1000));
  mockReferrer.mockResolvedValue('challenge=volt-nov');
  expect(await pending.readInstallReferrerOnce()).toBeNull();
  expect(mockReferrer).not.toHaveBeenCalled();
  expect(await pending.peekPendingChallenge()).toBeNull();
});

test('the same launch shares one read', async () => {
  mockReferrer.mockResolvedValue('challenge=volt-nov');
  await Promise.all([pending.readInstallReferrerOnce(), pending.readInstallReferrerOnce()]);
  expect(mockReferrer).toHaveBeenCalledTimes(1);
});

test('not read on iOS', async () => {
  mockRN.Platform.OS = 'ios';
  expect(await pending.readInstallReferrerOnce()).toBeNull();
  expect(mockReferrer).not.toHaveBeenCalled();
});

test('a referrer failure is logged and ignored, and is not retried', async () => {
  mockReferrer.mockRejectedValue(new Error('no play service'));
  expect(await pending.readInstallReferrerOnce()).toBeNull();
  expect(mockLogError).toHaveBeenCalledWith('Challenges.readInstallReferrer', expect.any(Error));
  pending._resetPendingForTests();
  await pending.readInstallReferrerOnce();
  expect(mockReferrer).toHaveBeenCalledTimes(1);
});

test('the active flag round-trips for the same user and is not shared with another', async () => {
  expect(await pending.hasChallengeActiveFlag('u1')).toBe(false);
  await pending.setChallengeActiveFlag('u1');
  expect(await pending.hasChallengeActiveFlag('u1')).toBe(true);
  expect(await pending.hasChallengeActiveFlag('u2')).toBe(false);
  expect(Object.keys(mockStore)).toEqual([pending.CHALLENGE_ACTIVE_KEY('u1')]);
  expect(pending.CHALLENGE_ACTIVE_KEY('u1')).toBe('@volyume_challenge_active_u1');
});

test('the active flag needs a user: with none it is never written and reads false', async () => {
  await pending.setChallengeActiveFlag(undefined);
  await pending.setChallengeActiveFlag(null);
  expect(Object.keys(mockStore)).toEqual([]);
  expect(await pending.hasChallengeActiveFlag(undefined)).toBe(false);
});

test('a code left by one user is dropped when a different user signs in, and subscribers hear it', async () => {
  mockUser = { id: 'u1' };
  await pending.setPendingChallenge('volt-nov');
  expect(mockStore[pending.PENDING_OWNER_KEY]).toBe('u1');
  expect(await pending.peekPendingChallenge()).toBe('volt-nov');
  const seen = [];
  pending.subscribePendingChallenge((c) => seen.push(c));
  mockUser = { id: 'u2' };
  expect(await pending.peekPendingChallenge()).toBeNull();
  expect(seen).toEqual([null]);
  expect(mockStore[pending.PENDING_CHALLENGE_KEY]).toBeUndefined();
  expect(mockStore[pending.PENDING_OWNER_KEY]).toBeUndefined();
});

test('take by a different user gets nothing', async () => {
  mockUser = { id: 'u1' };
  await pending.setPendingChallenge('volt-nov');
  mockUser = { id: 'u2' };
  expect(await pending.takePendingChallenge()).toBeNull();
  expect(await pending.peekPendingChallenge()).toBeNull();
});

test('a code that arrived signed out stands until someone signs in, then belongs to them', async () => {
  await pending.setPendingChallenge('volt-nov');
  expect(mockStore[pending.PENDING_OWNER_KEY]).toBe('');
  // Nobody signed in yet: no verdict, the code stands.
  expect(await pending.peekPendingChallenge()).toBe('volt-nov');
  mockUser = { id: 'u1' };
  expect(await pending.peekPendingChallenge()).toBe('volt-nov');
  expect(mockStore[pending.PENDING_OWNER_KEY]).toBe('u1');
  mockUser = { id: 'u2' };
  expect(await pending.peekPendingChallenge()).toBeNull();
});

test('clear and take remove the owner mark with the code', async () => {
  mockUser = { id: 'u1' };
  await pending.setPendingChallenge('volt-nov');
  await pending.clearPendingChallenge();
  expect(Object.keys(mockStore)).toEqual([]);
  await pending.setPendingChallenge('volt-nov');
  expect(await pending.takePendingChallenge()).toBe('volt-nov');
  expect(Object.keys(mockStore)).toEqual([]);
});
