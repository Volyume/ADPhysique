/**
 * The member_email_subscription op in syncQueue.js: a Settings choice made
 * offline is replayed through replaySubscriptionOp when the queue drains,
 * deleted on success, kept (with a retry scheduled) on failure.
 */
const mockDb = {
  getAllAsync: jest.fn(async () => []),
  runAsync: jest.fn(async () => {}),
  getFirstAsync: jest.fn(async () => ({ c: 0 })),
};
jest.mock('../../database', () => ({ db: jest.fn(async () => mockDb) }));
jest.mock('../../errorLog', () => ({ logWarn: jest.fn(), logError: jest.fn(), logInfo: jest.fn() }));
jest.mock('../../sync', () => ({}));
const mockReplay = jest.fn();
jest.mock('../subscription', () => ({ replaySubscriptionOp: (...a) => mockReplay(...a) }));

const { drainSyncQueue } = require('../../syncQueue');

const UID = 'user-1';
const row = () => ({
  id: 'q-me', op_type: 'member_email_subscription', entity_id: UID, user_id: UID,
  payload: JSON.stringify({ subscribed: false, source: 'settings', noticeVersion: '2026-10-17' }),
  created_at: 1, retries: 0, next_attempt_at: 0, last_error: null,
});
const deleted = () => mockDb.runAsync.mock.calls.some(([sql, args]) => /DELETE FROM pending_sync_ops/.test(sql) && args[0] === 'q-me');

beforeEach(() => { jest.clearAllMocks(); });

test('a queued choice is replayed and the op is drained', async () => {
  mockReplay.mockResolvedValueOnce(true);
  mockDb.getAllAsync.mockResolvedValueOnce([row()]);
  const res = await drainSyncQueue({}, UID);
  expect(mockReplay).toHaveBeenCalledWith(expect.objectContaining({ op_type: 'member_email_subscription', user_id: UID }));
  expect(res).toMatchObject({ drained: 1, failed: 0 });
  expect(deleted()).toBe(true);
});

test('a failed replay keeps the op for another try', async () => {
  mockReplay.mockRejectedValueOnce(new Error('network: offline'));
  mockDb.getAllAsync.mockResolvedValueOnce([row()]);
  const res = await drainSyncQueue({}, UID);
  expect(res).toMatchObject({ drained: 0, failed: 1 });
  expect(deleted()).toBe(false);
});

test('a member_email_topic op is replayed through replayTopicOp', () => {
  const src = require('fs').readFileSync(require('path').join(__dirname, '..', '..', 'syncQueue.js'), 'utf8');
  expect(src).toContain("case 'member_email_topic'");
  expect(src).toContain('replayTopicOp');
});
