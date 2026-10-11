/**
 * telemetry.networkOnly.test.js -- Sentry VOLYUME-2J: the runner's per-table
 * summary ("sync.push.meal_plans.errors") reached Sentry even when the
 * table's failures were only lost connections. logSyncError now counts every
 * table error and the ones that were not a lost connection; the runner asks
 * whether everything since a mark was a lost connection.
 */
jest.mock('../../errorLog', () => ({ logInfo: jest.fn(), logWarn: jest.fn(), logError: jest.fn() }));

const { logSyncError, syncErrorMark, onlyNetworkErrorsSince } = require('../telemetry');

describe('lost-connection summary (Sentry VOLYUME-2J)', () => {
  test('no errors since the mark is not "all lost connections"', () => {
    expect(onlyNetworkErrorsSince(syncErrorMark())).toBe(false);
  });

  test('only lost connections since the mark', () => {
    const mark = syncErrorMark();
    logSyncError('sync.tables.mealPlans.push', new Error('TypeError: Network request failed'), {});
    expect(onlyNetworkErrorsSince(mark)).toBe(true);
  });

  test('one real error since the mark makes it false', () => {
    const mark = syncErrorMark();
    logSyncError('sync.tables.mealPlans.push', new Error('TypeError: Network request failed'), {});
    logSyncError('sync.tables.mealPlans.push', { code: '42501', message: 'new row violates row-level security policy' }, {});
    expect(onlyNetworkErrorsSince(mark)).toBe(false);
  });
});
