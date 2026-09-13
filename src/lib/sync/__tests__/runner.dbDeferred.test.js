/**
 * The sync runner stands down while the local database is deferred by
 * dbCrypto (Sentry VOLYUME-2G / 2J).
 *
 * WHAT THIS SUITE PINS, and why each case is written to FAIL: a background
 * wake before the device's first unlock since boot cannot read the SQLCipher
 * key. Before this, every table push and pull of that cycle threw the same
 * deferral and each was logged as an error (one Sentry event per table per
 * wake). Now: (1) a run that starts deferred skips with reason db_deferred
 * and touches nothing; (2) the answer is a FRESH PROBE, never the flag a
 * previous cycle left behind, so a device unlocked since runs normally;
 * (3) any other open failure fails OPEN (the cycle runs and the real fault
 * stays visible where it always was); (4) a clear flag costs no probe; (5) a
 * deferral discovered mid-cycle, thrown or swallowed by the table handler,
 * stands the rest of the cycle down without counting an error or emitting a
 * crumb; (6) an ordinary throw still counts and still crumbs, exactly as
 * before.
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
jest.mock('../../supabase', () => ({
  hasLiveSession: jest.fn(async () => true),
  getSupabaseClient: jest.fn(() => null),
}));
jest.mock('../../observability', () => ({
  track: { warn: jest.fn(), breadcrumb: jest.fn() },
}));
jest.mock('../../../store/useAppStore', () => ({
  __esModule: true,
  default: { getState: () => ({ healthConsent: true, user: { id: 'u1' } }) },
}));
jest.mock('../transport', () => ({
  MIGRATED_TABLES: ['t1', 't2', 't3'],
  pushTable: jest.fn(async () => ({ count: 0, errors: 0 })),
  pullTable: jest.fn(async () => ({ count: 0, errors: 0 })),
  beginFoodRun: jest.fn(),
}));

// The database as the runner sees it: a flag recording the last open, and
// an open whose outcome each test scripts ('ok' | 'deferred' | 'other').
let mockDeferred = false;
let mockOpenOutcome = 'ok';
jest.mock('../../database', () => ({
  isDatabaseDeferred: jest.fn(() => mockDeferred),
  initDatabase: jest.fn(async () => {
    if (mockOpenOutcome === 'ok') { mockDeferred = false; return {}; }
    const e = new Error(mockOpenOutcome === 'deferred' ? 'SQLCipher key unavailable' : 'disk I/O error');
    if (mockOpenOutcome === 'deferred') e.dbCryptoDeferred = true;
    mockDeferred = mockOpenOutcome === 'deferred';
    throw e;
  }),
}));

const { syncAll, _resetRunnerForTests } = require('../runner');
const { pushTable, pullTable } = require('../transport');
const { bulkUploadLocalData, pullFromCloud } = require('../../sync');
const database = require('../../database');
const { track } = require('../../observability');

function deferral() {
  const e = new Error('SQLCipher key unavailable');
  e.dbCryptoDeferred = true;
  return e;
}
// What a table handler does when its first database call discovers the deferral.
function discoverDeferral() { mockDeferred = true; mockOpenOutcome = 'deferred'; }
const run = () => syncAll({ userId: 'u1', localUserId: 'u1', triggeredBy: 'periodic' });

beforeEach(() => {
  _resetRunnerForTests();
  jest.clearAllMocks();
  mockDeferred = false;
  mockOpenOutcome = 'ok';
  pushTable.mockImplementation(async () => ({ count: 0, errors: 0 }));
  pullTable.mockImplementation(async () => ({ count: 0, errors: 0 }));
});

describe('a run that starts deferred', () => {
  test('skips with reason db_deferred and touches nothing', async () => {
    mockDeferred = true;
    mockOpenOutcome = 'deferred';
    const res = await run();
    expect(res).toEqual({ status: 'skipped', reason: 'db_deferred' });
    expect(database.initDatabase).toHaveBeenCalledTimes(1);
    expect(pushTable).not.toHaveBeenCalled();
    expect(pullTable).not.toHaveBeenCalled();
    expect(bulkUploadLocalData).not.toHaveBeenCalled();
    expect(pullFromCloud).not.toHaveBeenCalled();
    expect(track.warn).not.toHaveBeenCalled();
  });

  test('is a fresh probe: a device unlocked since the flag was set runs normally', async () => {
    mockDeferred = true;
    mockOpenOutcome = 'ok';
    const res = await run();
    expect(res.status).not.toBe('skipped');
    expect(database.initDatabase).toHaveBeenCalledTimes(1);
    expect(pushTable).toHaveBeenCalledTimes(3);
    expect(pullTable).toHaveBeenCalledTimes(3);
    expect(bulkUploadLocalData).toHaveBeenCalled();
    expect(pullFromCloud).toHaveBeenCalled();
  });

  test('fails OPEN on any other open failure: the cycle runs and the fault stays visible', async () => {
    mockDeferred = true;
    mockOpenOutcome = 'other';
    const res = await run();
    expect(res.status).not.toBe('skipped');
    expect(pushTable).toHaveBeenCalledTimes(3);
    expect(pullTable).toHaveBeenCalledTimes(3);
  });

  test('a clear flag costs no probe', async () => {
    const res = await run();
    expect(res.status).not.toBe('skipped');
    expect(database.initDatabase).not.toHaveBeenCalled();
    expect(pushTable).toHaveBeenCalledTimes(3);
  });
});

describe('a deferral discovered mid-cycle', () => {
  test('on push: the remaining tables, the legacy push and the whole pull stand down, with no error and no crumb', async () => {
    pushTable.mockImplementationOnce(async () => { discoverDeferral(); throw deferral(); });
    const res = await run();
    expect(pushTable).toHaveBeenCalledTimes(1);
    expect(bulkUploadLocalData).not.toHaveBeenCalled();
    expect(pullTable).not.toHaveBeenCalled();
    expect(pullFromCloud).not.toHaveBeenCalled();
    expect(res.errored_count).toBe(0);
    expect(res.status).toBe('synced');
    expect(track.warn).not.toHaveBeenCalled();
  });

  test('on push, when the table handler swallowed it: the flag alone stands the cycle down before the error is counted', async () => {
    pushTable.mockImplementationOnce(async () => { discoverDeferral(); return { count: 0, errors: 1 }; });
    const res = await run();
    expect(pushTable).toHaveBeenCalledTimes(1);
    expect(database.initDatabase).toHaveBeenCalledTimes(1);
    expect(bulkUploadLocalData).not.toHaveBeenCalled();
    expect(pullTable).not.toHaveBeenCalled();
    expect(res.errored_count).toBe(0);
    expect(track.warn).not.toHaveBeenCalled();
  });

  test('on pull: the remaining tables and the legacy pull stand down, with no error and no crumb', async () => {
    pullTable.mockImplementationOnce(async () => { discoverDeferral(); throw deferral(); });
    const res = await run();
    expect(pushTable).toHaveBeenCalledTimes(3);
    expect(bulkUploadLocalData).toHaveBeenCalled();
    expect(pullTable).toHaveBeenCalledTimes(1);
    expect(pullFromCloud).not.toHaveBeenCalled();
    expect(res.errored_count).toBe(0);
    expect(track.warn).not.toHaveBeenCalled();
  });

  test('the next run, once the device is unlocked, is a normal cycle', async () => {
    pushTable.mockImplementationOnce(async () => { discoverDeferral(); throw deferral(); });
    await run();
    expect(pushTable).toHaveBeenCalledTimes(1);

    mockOpenOutcome = 'ok';
    const res = await run();
    expect(res.status).not.toBe('skipped');
    expect(pushTable).toHaveBeenCalledTimes(4);
    expect(pullFromCloud).toHaveBeenCalledTimes(1);
  });
});

describe('an ordinary throw is unchanged', () => {
  test('still counts as an error, still crumbs, and the next table still runs', async () => {
    pushTable.mockImplementationOnce(async () => { throw new Error('boom'); });
    const res = await run();
    expect(pushTable).toHaveBeenCalledTimes(3);
    expect(res.errored_count).toBeGreaterThanOrEqual(1);
    expect(track.warn).toHaveBeenCalledWith(
      'sync.push.t1.threw', 'sync.push.t1', expect.objectContaining({ error: 'boom' }),
    );
    expect(database.initDatabase).not.toHaveBeenCalled();
  });
});
