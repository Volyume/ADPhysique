/**
 * notifications.pushToken.test.js
 *
 * Remote-push token lifecycle (Unit 1 of the Expo push stack).
 *
 * Critical behaviours:
 *   - no projectId in app.json -> getExpoPushToken no-ops (returns
 *     null) and warns once. This is the CURRENT production state, so
 *     the no-op path must be airtight: local notifications keep working
 *     and no token row is ever written.
 *   - permission not granted -> no token, no cloud write.
 *   - happy path -> upsert on (user_id, expo_push_token), token cached.
 *   - unregister deletes THIS device's row by (user_id, token) and
 *     clears the cache even when the cloud delete can't run.
 *   - every failure path is swallowed (notification flows never throw).
 */

let mockPlatformOS = 'android';
jest.mock('react-native', () => ({
  Platform: { get OS() { return mockPlatformOS; } },
}));

jest.mock('expo-notifications', () => ({
  getExpoPushTokenAsync: jest.fn(),
}));

// expo-constants drives projectId discovery. mockConstants.value is the
// object Constants.default resolves to; tests reshape it per case.
const mockConstants = { value: {} };
jest.mock('expo-constants', () => ({
  __esModule: true,
  get default() { return mockConstants.value; },
}));

const mockStorage = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn((k, v) => { mockStorage[k] = v; return Promise.resolve(); }),
  getItem: jest.fn((k) => Promise.resolve(mockStorage[k] ?? null)),
  removeItem: jest.fn((k) => { delete mockStorage[k]; return Promise.resolve(); }),
}));

jest.mock('../errorLog', () => ({
  logWarn: jest.fn(), logError: jest.fn(), logInfo: jest.fn(),
}));

const mockPerm = { status: 'granted' };
jest.mock('../notifications/permissions', () => ({
  getNotificationPermissionStatus: jest.fn(() => Promise.resolve(mockPerm.status)),
}));

const mockSb = { value: null };
jest.mock('../supabase', () => ({
  getSupabaseClient: jest.fn(() => mockSb.value),
}));

const Notifications = require('expo-notifications');
const AsyncStorage = require('@react-native-async-storage/async-storage');
const { logWarn } = require('../errorLog');

// Builds a supabase double whose upsert/delete record their args.
function makeSb({ upsertError = null, deleteError = null } = {}) {
  const calls = { upserts: [], deletes: [] };
  const deleteChain = {
    _eqs: [],
    eq(col, val) { this._eqs.push([col, val]); return this; },
    then(resolve) { // thenable so `await delete().eq().eq()` resolves
      calls.deletes.push({ eqs: this._eqs });
      resolve({ error: deleteError });
    },
  };
  return {
    _calls: calls,
    from: jest.fn(() => ({
      upsert: jest.fn(async (row, opts) => {
        calls.upserts.push({ row, opts });
        return { error: upsertError };
      }),
      delete: jest.fn(() => ({ ...deleteChain, _eqs: [] })),
    })),
  };
}

function loadModule() {
  let mod;
  jest.isolateModules(() => { mod = require('../notifications/pushToken'); });
  return mod;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockPlatformOS = 'android';
  mockPerm.status = 'granted';
  mockConstants.value = { expoConfig: { extra: { eas: { projectId: 'proj-123' } } } };
  mockSb.value = null;
  for (const k of Object.keys(mockStorage)) delete mockStorage[k];
  Notifications.getExpoPushTokenAsync.mockResolvedValue({ data: 'ExponentPushToken[abc]' });
});

describe('getExpoPushToken', () => {
  test('returns null on web without touching the OS', async () => {
    mockPlatformOS = 'web';
    const { getExpoPushToken } = loadModule();
    expect(await getExpoPushToken()).toBeNull();
    expect(Notifications.getExpoPushTokenAsync).not.toHaveBeenCalled();
  });

  test('returns null when permission is not granted', async () => {
    mockPerm.status = 'denied';
    const { getExpoPushToken } = loadModule();
    expect(await getExpoPushToken()).toBeNull();
    expect(Notifications.getExpoPushTokenAsync).not.toHaveBeenCalled();
  });

  test('no projectId: no-ops, warns once, never calls the token API', async () => {
    mockConstants.value = { expoConfig: { extra: {} } };
    const { getExpoPushToken } = loadModule();
    expect(await getExpoPushToken()).toBeNull();
    expect(await getExpoPushToken()).toBeNull(); // second call
    expect(Notifications.getExpoPushTokenAsync).not.toHaveBeenCalled();
    // warned exactly once across both calls
    const noProjWarns = logWarn.mock.calls.filter(c => c[0] === 'notifications.pushToken.noProjectId');
    expect(noProjWarns).toHaveLength(1);
  });

  test('passes the projectId through to getExpoPushTokenAsync', async () => {
    const { getExpoPushToken } = loadModule();
    expect(await getExpoPushToken()).toBe('ExponentPushToken[abc]');
    expect(Notifications.getExpoPushTokenAsync).toHaveBeenCalledWith({ projectId: 'proj-123' });
  });

  test('falls back to easConfig.projectId when expoConfig path is absent', async () => {
    mockConstants.value = { easConfig: { projectId: 'eas-fallback' } };
    const { getExpoPushToken } = loadModule();
    await getExpoPushToken();
    expect(Notifications.getExpoPushTokenAsync).toHaveBeenCalledWith({ projectId: 'eas-fallback' });
  });

  test('returns null and swallows when the token API throws', async () => {
    Notifications.getExpoPushTokenAsync.mockRejectedValue(new Error('offline'));
    const { getExpoPushToken } = loadModule();
    expect(await getExpoPushToken()).toBeNull();
    expect(logWarn).toHaveBeenCalledWith('notifications.pushToken.fetchFailed', 'offline');
  });
});

describe('registerPushToken', () => {
  test('upserts on (user_id, expo_push_token) and caches the token', async () => {
    mockSb.value = makeSb();
    const { registerPushToken } = loadModule();
    const ok = await registerPushToken('u1');
    expect(ok).toBe(true);
    const { row, opts } = mockSb.value._calls.upserts[0];
    expect(row).toEqual({
      user_id: 'u1',
      expo_push_token: 'ExponentPushToken[abc]',
      platform: 'android',
    });
    expect(opts).toEqual({ onConflict: 'user_id,expo_push_token' });
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('@volyume_expo_push_token', 'ExponentPushToken[abc]');
  });

  test('records ios platform on ios devices', async () => {
    mockPlatformOS = 'ios';
    mockSb.value = makeSb();
    const { registerPushToken } = loadModule();
    await registerPushToken('u1');
    expect(mockSb.value._calls.upserts[0].row.platform).toBe('ios');
  });

  test('no userId: no-ops', async () => {
    mockSb.value = makeSb();
    const { registerPushToken } = loadModule();
    expect(await registerPushToken(null)).toBe(false);
    expect(mockSb.value._calls.upserts).toHaveLength(0);
  });

  test('no token (no projectId): never touches supabase', async () => {
    mockConstants.value = { expoConfig: { extra: {} } };
    mockSb.value = makeSb();
    const { registerPushToken } = loadModule();
    expect(await registerPushToken('u1')).toBe(false);
    expect(mockSb.value.from).not.toHaveBeenCalled();
  });

  test('upsert error: returns false, does not cache', async () => {
    mockSb.value = makeSb({ upsertError: { message: 'rls' } });
    const { registerPushToken } = loadModule();
    expect(await registerPushToken('u1')).toBe(false);
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
    expect(logWarn).toHaveBeenCalledWith('notifications.pushToken.register', 'rls');
  });
});

describe('unregisterPushToken', () => {
  test('deletes this device row by (user_id, token) and clears cache', async () => {
    mockStorage['@volyume_expo_push_token'] = 'ExponentPushToken[abc]';
    mockSb.value = makeSb();
    const { unregisterPushToken } = loadModule();
    const ok = await unregisterPushToken('u1');
    expect(ok).toBe(true);
    expect(mockSb.value._calls.deletes[0].eqs).toEqual([
      ['user_id', 'u1'],
      ['expo_push_token', 'ExponentPushToken[abc]'],
    ]);
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@volyume_expo_push_token');
  });

  test('clears the cache even when there is no cloud client', async () => {
    mockStorage['@volyume_expo_push_token'] = 'ExponentPushToken[abc]';
    mockSb.value = null;
    const { unregisterPushToken } = loadModule();
    const ok = await unregisterPushToken('u1');
    expect(ok).toBe(false);
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@volyume_expo_push_token');
  });

  test('no cached token: clears cache, no delete attempted', async () => {
    mockSb.value = makeSb();
    const { unregisterPushToken } = loadModule();
    expect(await unregisterPushToken('u1')).toBe(false);
    expect(mockSb.value.from).not.toHaveBeenCalled();
  });

  test('no userId: no-ops entirely', async () => {
    mockSb.value = makeSb();
    const { unregisterPushToken } = loadModule();
    expect(await unregisterPushToken(null)).toBe(false);
    expect(AsyncStorage.removeItem).not.toHaveBeenCalled();
  });
});
