/**
 * Member email subscription (founder decision 2026-10-17): members are
 * subscribed unless they turn it off, here in Settings or from any email.
 *
 * Pins: the default is ON; a failed cloud read shows the last known value
 * (never invents "off", never throws); a write goes to the RPC
 * member_email_set_subscribed with the notice version and source 'settings';
 * an offline write is mirrored at once and queued as a
 * member_email_subscription op, which replays oldest first; a choice still
 * waiting to reach the server is never overwritten by an older cloud answer.
 */
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
let mockClient = { rpc: (...a) => mockRpc(...a) };
let mockLive = true;
jest.mock('../../supabase', () => ({
  getSupabaseClient: () => mockClient,
  hasLiveSession: async () => mockLive,
}));
const mockEnqueue = jest.fn(async () => {});
jest.mock('../../syncQueue', () => ({ enqueueSyncOp: (...a) => mockEnqueue(...a) }));
let mockWiping = false;
jest.mock('../../sync/signOutGuard', () => ({ isSignOutWiping: () => mockWiping }));

const {
  MEMBER_EMAIL_NOTICE_VERSION, MEMBER_EMAIL_OP, getSubscribed, setSubscribed,
  replaySubscriptionOp, mirrorKey, pendingKey,
} = require('../subscription');

const UID = 'user-1';

beforeEach(() => {
  jest.clearAllMocks();
  Object.keys(mockStore).forEach((k) => delete mockStore[k]);
  mockClient = { rpc: (...a) => mockRpc(...a) };
  mockLive = true;
  mockWiping = false;
  mockRpc.mockResolvedValue({ data: null, error: null });
});

test('the notice version is the founder decision date', () => {
  expect(MEMBER_EMAIL_NOTICE_VERSION).toBe('2026-10-17');
});

test('the mirror key follows the agreed name', () => {
  expect(mirrorKey(UID)).toBe('@volyume_member_email_subscribed_user-1');
});

describe('getSubscribed', () => {
  test('never changed: the cloud says subscribed, so it is on, and the mirror remembers', async () => {
    mockRpc.mockResolvedValueOnce({ data: { subscribed: true }, error: null });
    expect(await getSubscribed(UID)).toEqual({ subscribed: true, source: 'cloud' });
    expect(mockRpc).toHaveBeenCalledWith('member_email_get_subscribed');
    expect(mockStore[mirrorKey(UID)]).toBe('true');
  });

  test('turned off elsewhere: the cloud answer wins and is mirrored', async () => {
    mockRpc.mockResolvedValueOnce({ data: { subscribed: false }, error: null });
    expect(await getSubscribed(UID)).toEqual({ subscribed: false, source: 'cloud' });
    expect(mockStore[mirrorKey(UID)]).toBe('false');
  });

  test('a failed read with nothing stored defaults to on', async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: { message: 'network request failed' } });
    expect(await getSubscribed(UID)).toEqual({ subscribed: true, source: 'default' });
  });

  test('a failed read shows the last known value, off included', async () => {
    mockStore[mirrorKey(UID)] = 'false';
    mockRpc.mockRejectedValueOnce(new Error('Network request failed'));
    expect(await getSubscribed(UID)).toEqual({ subscribed: false, source: 'mirror' });
  });

  test('a malformed answer is a failed read, not a value', async () => {
    mockStore[mirrorKey(UID)] = 'false';
    mockRpc.mockResolvedValueOnce({ data: { subscribed: 'yes' }, error: null });
    expect((await getSubscribed(UID)).subscribed).toBe(false);
  });

  test('no client or no live session: last known value, no call', async () => {
    mockClient = null;
    expect((await getSubscribed(UID)).subscribed).toBe(true);
    mockClient = { rpc: (...a) => mockRpc(...a) };
    mockLive = false;
    expect((await getSubscribed(UID)).subscribed).toBe(true);
    expect(mockRpc).not.toHaveBeenCalled();
  });

  test('a choice waiting to reach the server is not overwritten by an older cloud answer', async () => {
    mockStore[mirrorKey(UID)] = 'false';
    mockStore[pendingKey(UID)] = 'true';
    mockRpc.mockResolvedValue({ data: { subscribed: true }, error: null });
    expect(await getSubscribed(UID)).toEqual({ subscribed: false, source: 'mirror' });
    // It is never read back over the waiting choice; the choice is pushed again.
    expect(mockRpc).not.toHaveBeenCalledWith('member_email_get_subscribed');
    await new Promise((r) => setImmediate(r));
    expect(mockRpc).toHaveBeenCalledWith('member_email_set_subscribed', {
      _subscribed: false, _source: 'settings', _notice_version: MEMBER_EMAIL_NOTICE_VERSION,
    });
  });

  test('a parked "off" still reaches the server: a read with the marker set re-sends it and clears the marker', async () => {
    mockStore[mirrorKey(UID)] = 'false';
    mockStore[pendingKey(UID)] = 'true';
    await getSubscribed(UID);
    await new Promise((r) => setImmediate(r));
    await new Promise((r) => setImmediate(r));
    expect(mockStore[pendingKey(UID)]).toBeUndefined();
  });

  test('a failed re-send keeps the marker for the next read', async () => {
    mockStore[mirrorKey(UID)] = 'false';
    mockStore[pendingKey(UID)] = 'true';
    mockRpc.mockResolvedValue({ data: null, error: { message: 'function does not exist' } });
    await getSubscribed(UID);
    await new Promise((r) => setImmediate(r));
    expect(mockStore[pendingKey(UID)]).toBe('true');
  });

  test('no user: on, no read', async () => {
    expect(await getSubscribed(null)).toEqual({ subscribed: true, source: 'default' });
    expect(mockRpc).not.toHaveBeenCalled();
  });
});

describe('setSubscribed', () => {
  test('online: mirrors, calls the RPC with the notice version and source, queues nothing', async () => {
    expect(await setSubscribed(UID, false)).toEqual({ ok: true, queued: false });
    expect(mockRpc).toHaveBeenCalledWith('member_email_set_subscribed', {
      _subscribed: false, _source: 'settings', _notice_version: '2026-10-17',
    });
    expect(mockStore[mirrorKey(UID)]).toBe('false');
    expect(mockStore[pendingKey(UID)]).toBeUndefined();
    expect(mockEnqueue).not.toHaveBeenCalled();
  });

  test('offline (RPC error): mirrored at once and queued as a member_email_subscription op', async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: { message: 'Network request failed' } });
    expect(await setSubscribed(UID, false)).toEqual({ ok: true, queued: true });
    expect(mockStore[mirrorKey(UID)]).toBe('false');
    expect(mockStore[pendingKey(UID)]).toBe('true');
    expect(mockEnqueue).toHaveBeenCalledWith(MEMBER_EMAIL_OP, UID, UID, {
      subscribed: false, source: 'settings', noticeVersion: '2026-10-17',
    });
  });

  test('offline (thrown): queued the same way', async () => {
    mockRpc.mockRejectedValueOnce(new Error('timeout'));
    expect((await setSubscribed(UID, true)).queued).toBe(true);
    expect(mockEnqueue).toHaveBeenCalledTimes(1);
  });

  test('a dead session queues without calling the server', async () => {
    mockLive = false;
    expect((await setSubscribed(UID, false)).queued).toBe(true);
    expect(mockRpc).not.toHaveBeenCalled();
    expect(mockEnqueue).toHaveBeenCalledTimes(1);
  });

  test('during a sign-out wipe nothing is written or queued', async () => {
    mockWiping = true;
    expect(await setSubscribed(UID, false)).toEqual({ ok: false, queued: false });
    expect(mockStore[mirrorKey(UID)]).toBeUndefined();
    expect(mockEnqueue).not.toHaveBeenCalled();
  });

  test('never throws, even if the queue itself fails', async () => {
    mockRpc.mockRejectedValueOnce(new Error('offline'));
    mockEnqueue.mockRejectedValueOnce(new Error('db closed'));
    await expect(setSubscribed(UID, false)).resolves.toMatchObject({ ok: true });
  });
});

describe('replaySubscriptionOp', () => {
  const row = (payload, over = {}) => ({ user_id: UID, payload: JSON.stringify(payload), ...over });

  test('sends the queued choice and clears the pending marker when it is still the latest', async () => {
    mockStore[mirrorKey(UID)] = 'false';
    mockStore[pendingKey(UID)] = 'true';
    const done = await replaySubscriptionOp(row({ subscribed: false, source: 'settings', noticeVersion: '2026-10-17' }));
    expect(done).toBe(true);
    expect(mockRpc).toHaveBeenCalledWith('member_email_set_subscribed', {
      _subscribed: false, _source: 'settings', _notice_version: '2026-10-17',
    });
    expect(mockStore[pendingKey(UID)]).toBeUndefined();
  });

  test('keeps the pending marker when a newer choice is behind it', async () => {
    mockStore[mirrorKey(UID)] = 'true';
    mockStore[pendingKey(UID)] = 'true';
    await replaySubscriptionOp(row({ subscribed: false }));
    expect(mockStore[pendingKey(UID)]).toBe('true');
  });

  test('a refusal or an unreachable server throws so the queue retries', async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: { message: 'Network request failed' } });
    await expect(replaySubscriptionOp(row({ subscribed: true }))).rejects.toThrow(/network/i);
    mockLive = false;
    await expect(replaySubscriptionOp(row({ subscribed: true }))).rejects.toThrow();
  });

  test('a payload that can never be sent is dropped without a call', async () => {
    expect(await replaySubscriptionOp(row({ source: 'settings' }))).toBe(true);
    expect(await replaySubscriptionOp({ user_id: UID, payload: 'not json' })).toBe(true);
    expect(await replaySubscriptionOp({ user_id: UID, payload: null })).toBe(true);
    expect(mockRpc).not.toHaveBeenCalled();
  });

  test('the replayed source is always settings, whatever the payload says', async () => {
    await replaySubscriptionOp(row({ subscribed: false, source: 'anything' }));
    expect(mockRpc.mock.calls[0][1]._source).toBe('settings');
  });
});
