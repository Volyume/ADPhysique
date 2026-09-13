/**
 * logSyncError routing (Sentry VOLYUME-2G / 2J, beside the deleted-account
 * residual it already handled).
 *
 * WHAT THIS SUITE PINS, and why each case is written to FAIL: a sync failure
 * whose cause is the database open being DEFERRED by dbCrypto (the SQLCipher
 * key cannot be read before the device's first unlock since boot) is the
 * expected background-wake state, so it is recorded as an info breadcrumb
 * under `<scope>.dbDeferred`, never as an error; the marker is read from the
 * error itself or from its cause; an unmarked error is not a deferral
 * whatever its message says; the deleted-account FK rejection keeps its own
 * info path; and everything else is still an error, unchanged.
 */

jest.mock('../../errorLog', () => ({ logError: jest.fn(), logWarn: jest.fn(), logInfo: jest.fn() }));

const errorLog = require('../../errorLog');
const { logSyncError, isDbDeferredError } = require('../telemetry');

function deferral() {
  const e = new Error('SQLCipher key unavailable and existing DB is not plaintext-readable');
  e.dbCryptoDeferred = true;
  return e;
}

beforeEach(() => jest.clearAllMocks());

describe('isDbDeferredError', () => {
  test('reads the marker on the error', () => {
    expect(isDbDeferredError(deferral())).toBe(true);
  });

  test('reads the marker on the cause', () => {
    const wrapped = new Error('push failed');
    wrapped.cause = deferral();
    expect(isDbDeferredError(wrapped)).toBe(true);
  });

  test('an unmarked error is not a deferral, whatever its message says', () => {
    expect(isDbDeferredError(new Error('SQLCipher key unavailable and existing DB is not plaintext-readable'))).toBe(false);
    expect(isDbDeferredError({ dbCryptoDeferred: 'yes' })).toBe(false);
    expect(isDbDeferredError(null)).toBe(false);
    expect(isDbDeferredError(undefined)).toBe(false);
  });
});

describe('logSyncError', () => {
  test('a deferral is an info breadcrumb under <scope>.dbDeferred, never an error', () => {
    logSyncError('sync.pushTable.t1', deferral(), { table: 't1' });
    expect(errorLog.logInfo).toHaveBeenCalledWith(
      'sync.pushTable.t1.dbDeferred', expect.stringMatching(/deferred/), { table: 't1' },
    );
    expect(errorLog.logError).not.toHaveBeenCalled();
    expect(errorLog.logWarn).not.toHaveBeenCalled();
  });

  test('a deferral carried as a cause is routed the same way', () => {
    const wrapped = new Error('pull failed');
    wrapped.cause = deferral();
    logSyncError('sync.pullTable.t2', wrapped, {});
    expect(errorLog.logInfo).toHaveBeenCalledWith('sync.pullTable.t2.dbDeferred', expect.any(String), {});
    expect(errorLog.logError).not.toHaveBeenCalled();
  });

  test('a deleted-account FK rejection keeps its own info path', () => {
    logSyncError('sync.push', {
      code: '23503', message: 'insert or update on table "daily_steps" violates foreign key constraint "daily_steps_user_id_fkey"',
    }, {});
    expect(errorLog.logInfo).toHaveBeenCalledWith('sync.push.deletedAccountResidual', expect.any(String), {});
    expect(errorLog.logError).not.toHaveBeenCalled();
  });

  test('anything else is still an error', () => {
    const e = new Error('disk I/O error');
    logSyncError('sync.push', e, { table: 't1' });
    expect(errorLog.logError).toHaveBeenCalledWith('sync.push', e, { table: 't1' });
    expect(errorLog.logInfo).not.toHaveBeenCalled();
  });
});
