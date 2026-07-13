/**
 * Tests for the beforeSend / beforeBreadcrumb hook wrappers in
 * src/lib/sentry.js (LO-10 privacy fail-open fix).
 *
 * Before this fix, a throw inside scrubEvent/scrubBreadcrumb caused the
 * catch branch to return the ORIGINAL, unsanitised event/breadcrumb, so
 * a scrubber bug, a malicious getter on the payload, or an SDK shape
 * change could ship raw data (including a temporarily-attached user
 * email, see setSentryUser) precisely on the error path.
 *
 * This pins the fixed contract:
 *   - normal path: the scrubbed value returned by scrubEvent/
 *     scrubBreadcrumb is passed straight through, unchanged.
 *   - failure path: if the scrub function throws, the hook returns
 *     null (Sentry drops the event/breadcrumb) rather than the
 *     original payload. A dropped crash report is an acceptable cost;
 *     a leaked event is not.
 *
 * The hooks are only reachable via the config object passed to
 * SentryNative.init(), so this captures that config via a mocked
 * @sentry/react-native and invokes the hooks directly, with
 * ../observability/sentryScrub mocked so the throw/success path is
 * fully controlled without touching the real scrub rules.
 */

const mockInit = jest.fn();

jest.mock('@sentry/react-native', () => ({
  init: (...args) => mockInit(...args),
  setUser: jest.fn(),
  withScope: jest.fn(),
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  addBreadcrumb: jest.fn(),
}));

jest.mock('../observability/sentryScrub', () => ({
  scrubEvent: jest.fn(),
  scrubBreadcrumb: jest.fn(),
}));

describe('sentry.js beforeSend / beforeBreadcrumb (fail-closed)', () => {
  let hooks;
  let scrubEvent;
  let scrubBreadcrumb;

  beforeEach(() => {
    jest.resetModules();
    mockInit.mockClear();
    process.env.EXPO_PUBLIC_SENTRY_DSN = 'https://publicKey@o0.ingest.sentry.io/123';

    // Re-require after resetModules so the mocked scrub fns are the
    // exact instances sentry.js closes over.
    ({ scrubEvent, scrubBreadcrumb } = require('../observability/sentryScrub'));
    const sentry = require('../sentry');
    sentry.initSentry({ environment: 'test' });

    expect(mockInit).toHaveBeenCalledTimes(1);
    hooks = mockInit.mock.calls[0][0];
    expect(typeof hooks.beforeSend).toBe('function');
    expect(typeof hooks.beforeBreadcrumb).toBe('function');
  });

  afterEach(() => {
    delete process.env.EXPO_PUBLIC_SENTRY_DSN;
  });

  test('beforeSend passes the scrubbed event through unchanged on success', () => {
    const event = { message: 'raw' };
    const scrubbed = { message: 'scrubbed' };
    scrubEvent.mockReturnValue(scrubbed);

    expect(hooks.beforeSend(event)).toBe(scrubbed);
    expect(scrubEvent).toHaveBeenCalledWith(event);
  });

  test('beforeSend drops the event (returns null) when scrubEvent throws', () => {
    const event = {
      user: { id: 'u1', email: 'allan@example.com' },
      extra: { weight_kg: 80 },
    };
    scrubEvent.mockImplementation(() => { throw new Error('scrub bug'); });

    const result = hooks.beforeSend(event);

    expect(result).toBeNull();
    // The original, unsanitised event must never be the return value.
    expect(result).not.toBe(event);
  });

  test('beforeBreadcrumb passes the scrubbed breadcrumb through unchanged on success', () => {
    const crumb = { message: 'raw' };
    const scrubbed = { message: 'scrubbed' };
    scrubBreadcrumb.mockReturnValue(scrubbed);

    expect(hooks.beforeBreadcrumb(crumb)).toBe(scrubbed);
    expect(scrubBreadcrumb).toHaveBeenCalledWith(crumb);
  });

  test('beforeBreadcrumb drops the breadcrumb (returns null) when scrubBreadcrumb throws', () => {
    const crumb = { message: 'sync', data: { weight_kg: 80 } };
    scrubBreadcrumb.mockImplementation(() => { throw new Error('scrub bug'); });

    const result = hooks.beforeBreadcrumb(crumb);

    expect(result).toBeNull();
    expect(result).not.toBe(crumb);
  });
});

/**
 * Expected-offline warning gate (2026-07-12, VOLYUME-S/1A/1B/1C/1D/1E):
 * a device retrying sync pushes with no connectivity shipped thousands of
 * warning EVENTS for the expected "Network request failed" condition. The
 * gate demotes those to warning-level breadcrumbs (still attached to any
 * later real error) while every other warning still creates an event, and
 * captureError is never gated. isKnownOffline fails open: unknown
 * connectivity means capture normally.
 */
describe('sentry.js captureWarning expected-offline gate', () => {
  let SentryNative;
  let sentry;

  function setup(offline) {
    jest.resetModules();
    mockInit.mockClear();
    process.env.EXPO_PUBLIC_SENTRY_DSN = 'https://publicKey@o0.ingest.sentry.io/123';
    jest.doMock('../observability', () => ({ isKnownOffline: jest.fn(() => offline) }));
    SentryNative = require('@sentry/react-native');
    SentryNative.captureMessage.mockClear();
    SentryNative.addBreadcrumb.mockClear();
    SentryNative.withScope.mockClear();
    SentryNative.withScope.mockImplementation((cb) => cb({
      setLevel: jest.fn(), setTag: jest.fn(), setExtra: jest.fn(),
    }));
    sentry = require('../sentry');
    sentry.initSentry({ environment: 'test' });
  }

  afterEach(() => {
    delete process.env.EXPO_PUBLIC_SENTRY_DSN;
    jest.dontMock('../observability');
  });

  test('a "Network request failed" warning becomes a breadcrumb, not an event', () => {
    setup(false);
    sentry.captureWarning('TypeError: Network request failed', { scope: 'sync._pushMesocycleWeeks' });
    expect(SentryNative.captureMessage).not.toHaveBeenCalled();
    expect(SentryNative.addBreadcrumb).toHaveBeenCalledWith(expect.objectContaining({
      message: 'TypeError: Network request failed',
      level: 'warning',
      category: 'sync._pushMesocycleWeeks',
    }));
  });

  test('the network signature in the CONTEXT is also demoted (db.upsert.failed shape)', () => {
    setup(false);
    sentry.captureWarning('db.upsert.failed supabase.mesocycle_weeks', {
      scope: 'supabase.mesocycle_weeks',
      extra: { context: { errorMessage: 'TypeError: Network request failed', op: 'upsert' } },
    });
    expect(SentryNative.captureMessage).not.toHaveBeenCalled();
    expect(SentryNative.addBreadcrumb).toHaveBeenCalledTimes(1);
  });

  test('a sync-family warning while KNOWN offline is demoted even without the fetch text', () => {
    setup(true);
    sentry.captureWarning('sync.push.legacy.errors', { scope: 'sync.push.legacy', extra: { context: { errors: 1 } } });
    expect(SentryNative.captureMessage).not.toHaveBeenCalled();
    expect(SentryNative.addBreadcrumb).toHaveBeenCalledTimes(1);
  });

  test('the same sync-family warning with connectivity UNKNOWN/online still creates an event', () => {
    setup(false);
    sentry.captureWarning('sync.push.legacy.errors', { scope: 'sync.push.legacy', extra: { context: { errors: 1 } } });
    expect(SentryNative.captureMessage).toHaveBeenCalledWith('sync.push.legacy.errors');
    expect(SentryNative.addBreadcrumb).not.toHaveBeenCalled();
  });

  test('a non-sync warning is never demoted, even while offline', () => {
    setup(true);
    sentry.captureWarning('purchase acknowledgement failed', { scope: 'payments.playBilling.acknowledge' });
    expect(SentryNative.captureMessage).toHaveBeenCalled();
  });

  // 2026-07-13 (founder clean-slate mandate): store-side "cannot sell right
  // now" warnings -- what a sideloaded Android build gets from Google's
  // billing client on every catalogue/paywall touch -- demote to
  // breadcrumbs. Actionable payments warnings (previous test) stay loud.
  test('a store-unavailability payments warning becomes a breadcrumb, not an event', () => {
    setup(false);
    sentry.captureWarning('Unknown St13runtime_error error.', { scope: 'payments.appStore.fetchProducts' });
    expect(SentryNative.captureMessage).not.toHaveBeenCalled();
    expect(SentryNative.addBreadcrumb).toHaveBeenCalledTimes(1);
    SentryNative.addBreadcrumb.mockClear();
    sentry.captureWarning('SKU not found', { scope: 'payments.playBilling.offer' });
    expect(SentryNative.captureMessage).not.toHaveBeenCalled();
    expect(SentryNative.addBreadcrumb).toHaveBeenCalledTimes(1);
  });

  test('the same store message OUTSIDE a payments scope still creates an event', () => {
    setup(false);
    sentry.captureWarning('SKU not found', { scope: 'exercise.library' });
    expect(SentryNative.captureMessage).toHaveBeenCalled();
  });
});
