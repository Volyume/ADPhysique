/**
 * Member email topics (Wave C): the weekly summary choice. Pins: default ON;
 * cloud map read; failed read shows the mirror; a pending choice is pushed
 * again on read and outranks a stale cloud answer; a write calls
 * member_email_set_topic(topic, on); offline writes queue a
 * member_email_topic op; replay throws when unreachable.
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
  MEMBER_EMAIL_TOPIC_OP, TOPIC_WEEKLY_SUMMARY, getTopic, setTopic, replayTopicOp, topicMirrorKey, topicPendingKey,
} = require('../topics');

const UID = 'user-1';
const T = TOPIC_WEEKLY_SUMMARY;

beforeEach(() => {
  jest.clearAllMocks();
  Object.keys(mockStore).forEach((k) => delete mockStore[k]);
  mockClient = { rpc: (...a) => mockRpc(...a) };
  mockLive = true;
  mockWiping = false;
  mockRpc.mockResolvedValue({ data: null, error: null });
});

test('names', () => {
  expect(MEMBER_EMAIL_TOPIC_OP).toBe('member_email_topic');
  expect(T).toBe('weekly_summary');
  expect(topicMirrorKey(UID, T)).toBe('@volyume_member_email_topic_weekly_summary_user-1');
});

describe('getTopic', () => {
  test('cloud map wins and is mirrored', async () => {
    mockRpc.mockResolvedValue({ data: { weekly_summary: false }, error: null });
    expect(await getTopic(UID, T)).toEqual({ on: false, source: 'cloud' });
    expect(mockRpc).toHaveBeenCalledWith('member_email_get_topics');
    expect(mockStore[topicMirrorKey(UID, T)]).toBe('false');
  });
  test('nothing stored and no answer: ON by default', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'x' } });
    expect(await getTopic(UID, T)).toEqual({ on: true, source: 'default' });
  });
  test('a throwing read shows the mirror', async () => {
    mockStore[topicMirrorKey(UID, T)] = 'false';
    mockRpc.mockRejectedValue(new Error('boom'));
    expect(await getTopic(UID, T)).toEqual({ on: false, source: 'mirror' });
  });
  test('a pending choice outranks the cloud and is sent again', async () => {
    mockStore[topicMirrorKey(UID, T)] = 'false';
    mockStore[topicPendingKey(UID, T)] = 'true';
    mockRpc.mockResolvedValue({ data: { weekly_summary: true }, error: null });
    expect(await getTopic(UID, T)).toEqual({ on: false, source: 'mirror' });
    await new Promise((r) => setImmediate(r));
    expect(mockRpc).toHaveBeenCalledWith('member_email_set_topic', { topic: T, on: false });
    expect(mockRpc).not.toHaveBeenCalledWith('member_email_get_topics');
    expect(mockStore[topicPendingKey(UID, T)]).toBeUndefined();
  });
  test('no uid: default ON, no call', async () => {
    expect(await getTopic(null, T)).toEqual({ on: true, source: 'default' });
    expect(mockRpc).not.toHaveBeenCalled();
  });
});

describe('setTopic', () => {
  test('online: mirror, RPC, marker cleared', async () => {
    expect(await setTopic(UID, T, false)).toEqual({ ok: true, queued: false });
    expect(mockRpc).toHaveBeenCalledWith('member_email_set_topic', { topic: T, on: false });
    expect(mockStore[topicMirrorKey(UID, T)]).toBe('false');
    expect(mockStore[topicPendingKey(UID, T)]).toBeUndefined();
    expect(mockEnqueue).not.toHaveBeenCalled();
  });
  test('offline: queued with the topic payload, marker kept', async () => {
    mockClient = null;
    expect(await setTopic(UID, T, true)).toEqual({ ok: true, queued: true });
    expect(mockEnqueue).toHaveBeenCalledWith(MEMBER_EMAIL_TOPIC_OP, UID, `${UID}:${T}`, { topic: T, on: true });
    expect(mockStore[topicPendingKey(UID, T)]).toBe('true');
  });
  test('an RPC error queues it', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'nope' } });
    expect((await setTopic(UID, T, false)).queued).toBe(true);
  });
  test('no uid or a sign-out wipe writes nothing', async () => {
    expect(await setTopic(null, T, false)).toEqual({ ok: false, queued: false });
    mockWiping = true;
    expect(await setTopic(UID, T, false)).toEqual({ ok: false, queued: false });
    expect(mockRpc).not.toHaveBeenCalled();
  });
});

describe('replayTopicOp', () => {
  const row = (p) => ({ user_id: UID, payload: p === undefined ? null : JSON.stringify(p) });
  test('sends and clears the marker when it is the latest choice', async () => {
    mockStore[topicMirrorKey(UID, T)] = 'false';
    mockStore[topicPendingKey(UID, T)] = 'true';
    expect(await replayTopicOp(row({ topic: T, on: false }))).toBe(true);
    expect(mockRpc).toHaveBeenCalledWith('member_email_set_topic', { topic: T, on: false });
    expect(mockStore[topicPendingKey(UID, T)]).toBeUndefined();
  });
  test('throws when unreachable or refused', async () => {
    mockClient = null;
    await expect(replayTopicOp(row({ topic: T, on: true }))).rejects.toThrow();
    mockClient = { rpc: (...a) => mockRpc(...a) };
    mockRpc.mockResolvedValue({ data: null, error: { message: 'no' } });
    await expect(replayTopicOp(row({ topic: T, on: true }))).rejects.toThrow('no');
  });
  test('a bad payload is dropped', async () => {
    expect(await replayTopicOp(row({ topic: T }))).toBe(true);
    expect(await replayTopicOp(row())).toBe(true);
    expect(mockRpc).not.toHaveBeenCalled();
  });
});
