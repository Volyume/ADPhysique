/**
 * Founder order 2026-10-17 (member list shows the last day the app was used):
 * the sync runner makes the once-a-day app check-in next to the other
 * best-effort flushes. Pins: it is called with the signed-in user id, never
 * without one, and a check-in that throws or rejects never fails or alters
 * the sync run.
 */
jest.mock('../../syncQueue', () => ({
  getQueueStats: jest.fn(async () => ({ pending: 0, failed: 0 })),
}));
jest.mock('../telemetry', () => ({
  trackSyncRun: jest.fn(async () => {}),
  trackSyncConflictResolved: jest.fn(async () => {}),
}));
jest.mock('../../sync', () => ({
  bulkUploadLocalData: jest.fn(async () => ({})),
  pullFromCloud: jest.fn(async () => ({})),
}));
jest.mock('../../../store/useAppStore', () => ({
  __esModule: true,
  default: { getState: () => ({ healthConsent: true }) },
}));

let mockImpl = () => Promise.resolve({ reported: true });
const mockReport = jest.fn((...a) => mockImpl(...a));
jest.mock('../../memberEmail/appSeen', () => ({
  reportAppSeenIfDue: (...a) => mockReport(...a),
}));

const { syncAll, _resetRunnerForTests } = require('../runner');

beforeEach(() => {
  _resetRunnerForTests();
  mockReport.mockClear();
  mockImpl = () => Promise.resolve({ reported: true });
});

test('a signed-in run makes the check-in with the user id', async () => {
  const res = await syncAll({ userId: 'u1', localUserId: 'u1', triggeredBy: 'foreground' });
  expect(res.status).not.toBe('skipped');
  expect(mockReport).toHaveBeenCalledTimes(1);
  expect(mockReport).toHaveBeenCalledWith('u1');
});

test('a signed-out run makes no check-in', async () => {
  await syncAll({ userId: null, localUserId: null, triggeredBy: 'foreground' });
  expect(mockReport).not.toHaveBeenCalled();
});

test('a check-in that rejects does not fail the run', async () => {
  mockImpl = () => Promise.reject(new Error('boom'));
  const res = await syncAll({ userId: 'u1', localUserId: 'u1', triggeredBy: 'manual' });
  expect(res.status).not.toBe('skipped');
  expect(res.status).not.toBe('failed');
});

test('a check-in that throws synchronously does not fail the run', async () => {
  mockImpl = () => { throw new Error('boom'); };
  const res = await syncAll({ userId: 'u1', localUserId: 'u1', triggeredBy: 'manual' });
  expect(res.status).not.toBe('skipped');
  expect(res.status).not.toBe('failed');
});
