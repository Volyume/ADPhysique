/**
 * App check-in for the team's member list (founder order 2026-10-17).
 *
 * Pins: at most one RPC per local day (AsyncStorage key
 * `@volyume_member_app_seen_day_<uid>`); the RPC is member_app_seen with the
 * native version and ios/android/other; nothing is sent without a user, with
 * a malformed version, or without a live session; it never throws, whatever
 * fails; a refused check-in is not recorded (so a later sync retries) and is
 * not hammered within the hour; the payload carries nothing but version and
 * platform; and the runner calls it only for a signed-in user.
 */
const fs = require('fs');
const path = require('path');

const mockStore = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (k) => (k in mockStore ? mockStore[k] : null)),
    setItem: jest.fn(async (k, v) => { mockStore[k] = String(v); }),
    removeItem: jest.fn(async (k) => { delete mockStore[k]; }),
  },
}));
jest.mock('../../errorLog', () => ({ logError: jest.fn(), logInfo: jest.fn(), logWarn: jest.fn() }));

const mockRpc = jest.fn();
let mockClient;
let mockLive = true;
jest.mock('../../supabase', () => ({
  getSupabaseClient: () => mockClient,
  hasLiveSession: async () => mockLive,
}));

let mockVersion = '1.42.0';
jest.mock('expo-application', () => ({
  get nativeApplicationVersion() { return mockVersion; },
}));

let mockDay = '2026-10-17';
jest.mock('../../dayKey', () => ({ localDayKey: () => mockDay }));

const {
  reportAppSeenIfDue, appSeenDayKey, appSeenPlatform, _resetAppSeenForTests,
} = require('../appSeen');
const AsyncStorage = require('@react-native-async-storage/async-storage').default;

const UID = 'user-1';

beforeEach(() => {
  jest.clearAllMocks();
  Object.keys(mockStore).forEach((k) => delete mockStore[k]);
  _resetAppSeenForTests();
  mockClient = { rpc: (...a) => mockRpc(...a) };
  mockLive = true;
  mockVersion = '1.42.0';
  mockDay = '2026-10-17';
  mockRpc.mockResolvedValue({ data: { last_seen_day: '2026-10-17' }, error: null });
});

test('the storage key follows the agreed name', () => {
  expect(appSeenDayKey(UID)).toBe('@volyume_member_app_seen_day_user-1');
});

test('reports once, with the version and platform, and records the day', async () => {
  const res = await reportAppSeenIfDue(UID);
  expect(res).toEqual({ reported: true });
  expect(mockRpc).toHaveBeenCalledTimes(1);
  const [name, args] = mockRpc.mock.calls[0];
  expect(name).toBe('member_app_seen');
  expect(args).toEqual({ _app_version: '1.42.0', _platform: expect.stringMatching(/^(ios|android|other)$/) });
  expect(mockStore[appSeenDayKey(UID)]).toBe('2026-10-17');
});

test('a second call on the same local day does nothing', async () => {
  await reportAppSeenIfDue(UID);
  const again = await reportAppSeenIfDue(UID);
  expect(again).toEqual({ reported: false, reason: 'already_today' });
  expect(mockRpc).toHaveBeenCalledTimes(1);
});

test('the next local day reports again', async () => {
  await reportAppSeenIfDue(UID);
  mockDay = '2026-10-18';
  await reportAppSeenIfDue(UID);
  expect(mockRpc).toHaveBeenCalledTimes(2);
  expect(mockStore[appSeenDayKey(UID)]).toBe('2026-10-18');
});

test('each account has its own day', async () => {
  await reportAppSeenIfDue(UID);
  await reportAppSeenIfDue('user-2');
  expect(mockRpc).toHaveBeenCalledTimes(2);
});

test('two calls at once make one request', async () => {
  const [a, b] = await Promise.all([reportAppSeenIfDue(UID), reportAppSeenIfDue(UID)]);
  expect(mockRpc).toHaveBeenCalledTimes(1);
  expect([a.reported, b.reported].sort()).toEqual([false, true]);
});

test.each([[null], [undefined], [''], [42]])('skipped with no usable user id (%p)', async (uid) => {
  const res = await reportAppSeenIfDue(uid);
  expect(res.reported).toBe(false);
  expect(res.reason).toBe('no_user');
  expect(mockRpc).not.toHaveBeenCalled();
  expect(AsyncStorage.setItem).not.toHaveBeenCalled();
});

test.each([['1.42'], ['1.42.0-beta'], ['v1.42.0'], [''], [null], [undefined], ['12345.1.1'], ['1.2.3.4']])(
  'a bad version string (%p) is skipped and nothing is sent',
  async (v) => {
    mockVersion = v;
    const res = await reportAppSeenIfDue(UID);
    expect(res).toEqual({ reported: false, reason: 'bad_version' });
    expect(mockRpc).not.toHaveBeenCalled();
    expect(mockStore[appSeenDayKey(UID)]).toBeUndefined();
  },
);

test('no live session: nothing is sent and the day is not recorded', async () => {
  mockLive = false;
  const res = await reportAppSeenIfDue(UID);
  expect(res.reported).toBe(false);
  expect(mockRpc).not.toHaveBeenCalled();
  expect(mockStore[appSeenDayKey(UID)]).toBeUndefined();
});

test('no client: nothing is sent', async () => {
  mockClient = null;
  expect((await reportAppSeenIfDue(UID)).reported).toBe(false);
});

test('a refused check-in is not recorded and is not repeated within the hour', async () => {
  mockRpc.mockResolvedValue({ data: null, error: { message: 'function member_app_seen does not exist' } });
  const first = await reportAppSeenIfDue(UID);
  expect(first).toEqual({ reported: false, reason: 'rpc_error' });
  expect(mockStore[appSeenDayKey(UID)]).toBeUndefined();
  const second = await reportAppSeenIfDue(UID);
  expect(second).toEqual({ reported: false, reason: 'recent_failure' });
  expect(mockRpc).toHaveBeenCalledTimes(1);
});

test('a retry after the hour succeeds and records the day', async () => {
  mockRpc.mockResolvedValueOnce({ data: null, error: { message: 'offline' } });
  await reportAppSeenIfDue(UID);
  const realNow = Date.now;
  Date.now = () => realNow() + 61 * 60 * 1000;
  try {
    const res = await reportAppSeenIfDue(UID);
    expect(res).toEqual({ reported: true });
  } finally {
    Date.now = realNow;
  }
  expect(mockStore[appSeenDayKey(UID)]).toBe('2026-10-17');
});

describe('never throws', () => {
  test('the RPC rejects', async () => {
    mockRpc.mockRejectedValue(new Error('network down'));
    await expect(reportAppSeenIfDue(UID)).resolves.toEqual({ reported: false, reason: 'error' });
    expect(mockStore[appSeenDayKey(UID)]).toBeUndefined();
  });

  test('the client getter throws', async () => {
    mockClient = { get rpc() { throw new Error('boom'); } };
    await expect(reportAppSeenIfDue(UID)).resolves.toMatchObject({ reported: false });
  });

  test('storage cannot be read: it still reports, once', async () => {
    AsyncStorage.getItem.mockRejectedValueOnce(new Error('storage'));
    await expect(reportAppSeenIfDue(UID)).resolves.toEqual({ reported: true });
  });

  test('storage cannot be written: still resolves', async () => {
    AsyncStorage.setItem.mockRejectedValueOnce(new Error('storage'));
    await expect(reportAppSeenIfDue(UID)).resolves.toEqual({ reported: true });
  });
});

describe('platform mapping', () => {
  test.each([['ios', 'ios'], ['android', 'android'], ['web', 'other'], ['windows', 'other'], [null, 'other']])(
    '%p maps to %p', (os, expected) => {
      expect(appSeenPlatform(os)).toBe(expected);
    });
});

describe('source guards', () => {
  const root = path.resolve(__dirname, '..', '..', '..', '..');
  const read = (...p) => fs.readFileSync(path.join(root, ...p), 'utf8');

  test('the module sends only the version and the platform', () => {
    const src = read('src', 'lib', 'memberEmail', 'appSeen.js');
    expect(src).toMatch(/sb\.rpc\('member_app_seen', \{\s*_app_version: version,\s*_platform: appSeenPlatform\(\),\s*\}\)/);
    expect(src).not.toMatch(/from\('workouts'\)|\.from\(/);
  });

  test('the runner calls it lazily, best-effort, and only inside the signed-in branch', () => {
    const src = read('src', 'lib', 'sync', 'runner.js');
    const call = "require('../memberEmail/appSeen').reportAppSeenIfDue(userId).catch(() => {});";
    expect(src).toContain(call);
    // It sits in the `else` of `if (!userId)`, beside the other flushes.
    expect(src.indexOf('if (!userId) {')).toBeLessThan(src.indexOf(call));
    expect(src.indexOf("require('../payments/pendingCascade')")).toBeLessThan(src.indexOf(call));
    expect(src.indexOf(call)).toBeLessThan(src.indexOf("const sync = require('../sync.js');"));
    expect(src).not.toMatch(/import .*memberEmail\/appSeen/);
  });
});
