/**
 * The error log demotes a MARKED database deferral, once, for every catch
 * site (Sentry VOLYUME-2G).
 *
 * WHAT THIS SUITE PINS, and why each case is written to FAIL: dbCrypto marks
 * the rejection it raises when the SQLCipher key cannot be read before the
 * device's first unlock since boot (a background wake). Ten different catch
 * sites then logged that same rejection as an error, and one Sentry issue
 * grew from all of them. Now logError itself files a marked deferral as
 * information under `<scope>.dbDeferred`: it never reaches Sentry as an
 * error and never enters the ring buffer at error level. The unmarked twin,
 * a genuine key loss, is forwarded exactly as before.
 */

const mockCaptureError = jest.fn();
const mockCaptureWarning = jest.fn();
const mockAddBreadcrumb = jest.fn();
jest.mock('../sentry', () => ({
  captureError: (...a) => mockCaptureError(...a),
  captureWarning: (...a) => mockCaptureWarning(...a),
  addBreadcrumb: (...a) => mockAddBreadcrumb(...a),
}));
jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

const { logError, getRecentErrors, clearErrors, _resetSentryThrottleForTests } = require('../errorLog');

function deferral() {
  const e = new Error('SQLCipher key unavailable and existing DB is not plaintext-readable');
  e.dbCryptoDeferred = true;
  return e;
}

beforeEach(async () => {
  jest.clearAllMocks();
  _resetSentryThrottleForTests();
  await clearErrors();
});

test('a marked deferral never reaches Sentry as an error, from any scope', () => {
  for (const scope of ['syncQueue.drain', 'syncQueue.getQueueStats', 'sync.tables.planFolders.push', 'anything.at.all']) {
    logError(scope, deferral(), { userId: 'u1' });
  }
  expect(mockCaptureError).not.toHaveBeenCalled();
});

test('a marked deferral never enters the ring buffer at error level', async () => {
  logError('syncQueue.drain', deferral(), {});
  const errors = (await getRecentErrors()).filter((e) => e.level === 'error');
  expect(errors).toHaveLength(0);
});

test('the unmarked twin, a genuine key loss, is still forwarded as an error', () => {
  const e = new Error('SQLCipher key unavailable and existing DB is not plaintext-readable');
  logError('dbCrypto.keyUnavailable', e, {});
  expect(mockCaptureError).toHaveBeenCalledTimes(1);
  expect(mockCaptureError.mock.calls[0][0]).toBe(e);
});

test('the marker must be exactly true: a truthy stand-in does not demote', () => {
  const e = new Error('SQLCipher key unavailable and existing DB is not plaintext-readable');
  e.dbCryptoDeferred = 'yes';
  logError('syncQueue.drain', e, {});
  expect(mockCaptureError).toHaveBeenCalledTimes(1);
});
