/**
 * sentryFloodGuard.test.js
 *
 * Pins the Sentry triage of 2026-07-27
 * (docs/audit/sentry-triage-2026-07-27.md).
 *
 * One locked phone produced 1,589 copies of a single issue (VOLYUME-2E) in
 * thirteen days and buried every real defect underneath it. Two contracts come
 * out of that triage and both are pinned here, written to FAIL if either is
 * weakened:
 *
 *   1. A repeating scope+message pair is forwarded to Sentry a bounded number
 *      of times, NOT once per occurrence.
 *   2. The throttle applies to the WIRE ONLY. The on-device ring buffer keeps
 *      every entry, because Settings -> Debug logs is the user's and support's
 *      complete record and must never be silently thinned.
 *
 * Distinct errors must never be suppressed by a noisy neighbour -- a flood
 * guard that hid a NEW crash would be worse than the flood it replaced.
 */

const mockCaptureError = jest.fn();
const mockCaptureWarning = jest.fn();
const mockAddBreadcrumb = jest.fn();

jest.mock('../sentry', () => ({
  captureError: (...a) => mockCaptureError(...a),
  captureWarning: (...a) => mockCaptureWarning(...a),
  addBreadcrumb: (...a) => mockAddBreadcrumb(...a),
}));

const { logError, logWarn, getRecentErrors, clearErrors, _resetSentryThrottleForTests } = require('../errorLog');

describe('Sentry flood guard (triage 2026-07-27)', () => {
  // errorLog persists the ring buffer on a 200ms debounce. Without draining it
  // the last write is still pending at teardown, which Jest reports as a leaked
  // worker -- and --ci treats that as a failure signal even when every
  // assertion passed (see the IS_JEST note in errorLog.js).
  afterAll(async () => {
    await new Promise(resolve => setTimeout(resolve, 300));
  });

  beforeEach(async () => {
    mockCaptureError.mockClear();
    mockCaptureWarning.mockClear();
    _resetSentryThrottleForTests();
    await clearErrors();
  });

  test('a repeating identical error is forwarded a bounded number of times, not 50', () => {
    for (let i = 0; i < 50; i += 1) {
      logError('supabase.secureStore.getItem', new Error('User interaction is not allowed'));
    }
    expect(mockCaptureError.mock.calls.length).toBeGreaterThan(0);
    expect(mockCaptureError.mock.calls.length).toBeLessThanOrEqual(5);
  });

  test('the on-device ring buffer still receives EVERY occurrence', async () => {
    for (let i = 0; i < 20; i += 1) {
      logError('supabase.secureStore.getItem', new Error('User interaction is not allowed'));
    }
    const buf = await getRecentErrors(200);
    const mine = buf.filter(e => e.scope === 'supabase.secureStore.getItem');
    expect(mine).toHaveLength(20);
  });

  test('a DIFFERENT error is never suppressed by a noisy neighbour', () => {
    for (let i = 0; i < 50; i += 1) {
      logError('noisy.scope', new Error('same message every time'));
    }
    mockCaptureError.mockClear();
    logError('brand.new.crash', new Error('a genuinely new failure'));
    expect(mockCaptureError).toHaveBeenCalledTimes(1);
  });

  test('the same message under a different scope is tracked separately', () => {
    for (let i = 0; i < 50; i += 1) {
      logError('scope.a', new Error('shared text'));
    }
    mockCaptureError.mockClear();
    logError('scope.b', new Error('shared text'));
    expect(mockCaptureError).toHaveBeenCalledTimes(1);
  });

  test('warnings are throttled on the same terms as errors', () => {
    for (let i = 0; i < 50; i += 1) {
      logWarn('sync._pushPlannedMuscleVolume', 'new row violates row-level security policy');
    }
    expect(mockCaptureWarning.mock.calls.length).toBeGreaterThan(0);
    expect(mockCaptureWarning.mock.calls.length).toBeLessThanOrEqual(5);
  });
});
