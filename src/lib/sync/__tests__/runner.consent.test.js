/**
 * F2 (audit SC-1): Article 9 fail-closed gate on the sync runner. Health-domain
 * tables must never move for a session whose consent is unresolved (null) or
 * denied (false) — enforcement previously lived only in navigation, and the
 * sign-in syncAll raced the consent read. syncAll now skips, fail-closed, for
 * any state other than an affirmative true, including a store read that throws.
 */

// E12 step 0: the orphan registry queue is gone; the runner reads its
// depth from the live retry queue (src/lib/syncQueue.js).
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

// Mutable consent state the store mock serves per test.
let mockConsent = null;
let mockGetStateThrows = false;
jest.mock('../../../store/useAppStore', () => ({
  __esModule: true,
  default: {
    getState: () => {
      if (mockGetStateThrows) throw new Error('store unavailable');
      return { healthConsent: mockConsent };
    },
  },
}));

const { syncAll, _resetRunnerForTests } = require('../runner');
const { bulkUploadLocalData, pullFromCloud } = require('../../sync');

beforeEach(() => {
  _resetRunnerForTests();
  mockConsent = null;
  mockGetStateThrows = false;
  bulkUploadLocalData.mockClear();
  pullFromCloud.mockClear();
});

describe('syncAll Article 9 gate (F2 / SC-1)', () => {
  test('consent unresolved (null): run skips, nothing pushed or pulled', async () => {
    mockConsent = null;
    const res = await syncAll({ userId: 'u1', localUserId: 'u1', triggeredBy: 'sign_in' });
    expect(res).toEqual({ status: 'skipped', reason: 'health_consent_unresolved' });
    expect(bulkUploadLocalData).not.toHaveBeenCalled();
    expect(pullFromCloud).not.toHaveBeenCalled();
  });

  test('consent denied (false): run skips', async () => {
    mockConsent = false;
    const res = await syncAll({ userId: 'u1', localUserId: 'u1', triggeredBy: 'foreground' });
    expect(res.status).toBe('skipped');
    expect(res.reason).toBe('health_consent_unresolved');
    expect(pullFromCloud).not.toHaveBeenCalled();
  });

  test('store read throws: fail CLOSED, run skips', async () => {
    mockGetStateThrows = true;
    const res = await syncAll({ userId: 'u1', localUserId: 'u1', triggeredBy: 'periodic' });
    expect(res.status).toBe('skipped');
    expect(pullFromCloud).not.toHaveBeenCalled();
  });

  test('consent granted (true): the run proceeds to push and pull', async () => {
    mockConsent = true;
    const res = await syncAll({ userId: 'u1', localUserId: 'u1', triggeredBy: 'manual' });
    expect(res.status).not.toBe('skipped');
    expect(bulkUploadLocalData).toHaveBeenCalled();
    expect(pullFromCloud).toHaveBeenCalled();
  });

  test('no user id (signed out): the gate does not apply', async () => {
    mockConsent = null;
    const res = await syncAll({ userId: null, localUserId: null, triggeredBy: 'foreground' });
    expect(res.reason).not.toBe('health_consent_unresolved');
  });
});
