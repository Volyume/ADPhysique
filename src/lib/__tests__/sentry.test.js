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
