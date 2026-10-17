/**
 * The sync runner tells screens that read local SQLite (Home) a pull finished.
 *
 * WHAT THIS SUITE PINS, written to FAIL on the old runner (it never signalled
 * anything but the restore flow's markCloudSyncComplete): founder report "I've
 * seen it not refresh right". A weigh-in made on another phone is pulled into
 * SQLite in the background, but Home only re-read on focus, so it stayed stale
 * until the user left and came back. The runner now calls the store's
 * markDataPulled after a pull that did not throw (or a migrated table that
 * wrote rows), and NEVER calls markCloudSyncComplete, which drives the
 * "restoring" banner.
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
  pullFromCloud: jest.fn(async () => 0),
}));
jest.mock('../../supabase', () => ({
  hasLiveSession: jest.fn(async () => true),
  getSupabaseClient: jest.fn(() => null),
}));
jest.mock('../../observability', () => ({
  track: { warn: jest.fn(), breadcrumb: jest.fn() },
}));
const mockMarkDataPulled = jest.fn();
const mockMarkCloudSyncComplete = jest.fn();
jest.mock('../../../store/useAppStore', () => ({
  __esModule: true,
  default: {
    getState: () => ({
      healthConsent: true,
      user: { id: 'u1' },
      markDataPulled: mockMarkDataPulled,
      markCloudSyncComplete: mockMarkCloudSyncComplete,
    }),
  },
}));
jest.mock('../transport', () => ({
  MIGRATED_TABLES: ['t1'],
  pushTable: jest.fn(async () => ({ count: 0, errors: 0 })),
  pullTable: jest.fn(async () => ({ count: 0, errors: 0 })),
  beginFoodRun: jest.fn(),
}));
jest.mock('../../database', () => ({
  isDatabaseDeferred: jest.fn(() => false),
  initDatabase: jest.fn(async () => ({})),
}));

const { syncAll, _resetRunnerForTests } = require('../runner');
const { pullTable } = require('../transport');
const { pullFromCloud } = require('../../sync');

const run = () => syncAll({ userId: 'u1', localUserId: 'u1', triggeredBy: 'foreground' });

beforeEach(() => {
  _resetRunnerForTests();
  jest.clearAllMocks();
  pullTable.mockImplementation(async () => ({ count: 0, errors: 0 }));
  pullFromCloud.mockImplementation(async () => 0);
});

describe('syncAll signals a finished pull to the store', () => {
  test('a pull that completes bumps dataPulledVersion via markDataPulled', async () => {
    await run();
    expect(mockMarkDataPulled).toHaveBeenCalledTimes(1);
  });

  test('never reuses markCloudSyncComplete (that drives the restore banner)', async () => {
    await run();
    expect(mockMarkCloudSyncComplete).not.toHaveBeenCalled();
  });

  test('a migrated table that wrote rows bumps even when the legacy pull threw', async () => {
    pullTable.mockImplementation(async () => ({ count: 3, errors: 0 }));
    pullFromCloud.mockImplementation(async () => { throw new Error('boom'); });
    await run();
    expect(mockMarkDataPulled).toHaveBeenCalledTimes(1);
  });

  test('a legacy pull that threw with nothing written does not bump', async () => {
    pullFromCloud.mockImplementation(async () => { throw new Error('boom'); });
    await run();
    expect(mockMarkDataPulled).not.toHaveBeenCalled();
  });
});
