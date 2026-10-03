/**
 * The "crashed last session" flag (register D216; founder's TestFlight report
 * 2026-10-03). The first launch of 2.6.0 showed "Volyume crashed last session.
 * Report sent." although nothing had crashed: iOS had woken the previous
 * build in the BACKGROUND overnight, that headless launch wrote the
 * clean-shutdown flag as every launch did, never became active and never
 * backgrounded, so nothing cleared it, and the next real launch read a crash.
 *
 * Pins, each launch a fresh module so the per-session cache cannot leak:
 *   - a foreground launch (active, or the mid-launch inactive state) marks
 *     the session in progress exactly as before;
 *   - a BACKGROUND launch leaves the flag as the last foreground session left
 *     it: a clean 'false' stays 'false' (the regression), and a real crash's
 *     'true' is still there for the next foreground launch to report;
 *   - the shutdown handler still marks a background-woken process the moment
 *     it becomes active, and clears it on backgrounding;
 *   - the whole sequence that produced the report: a clean session, a
 *     headless wake, then a foreground launch that must NOT report a crash.
 */

let mockCurrentAppState = 'active';
const mockAppStateListeners = [];

jest.mock('react-native', () => ({
  Platform: { OS: 'ios', select: (o) => o.ios },
  AppState: {
    get currentState() { return mockCurrentAppState; },
    addEventListener: jest.fn((_event, fn) => {
      const sub = { remove: jest.fn() };
      mockAppStateListeners.push({ fn, sub });
      return sub;
    }),
  },
}));

jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: { addEventListener: jest.fn(() => jest.fn()) },
}));

jest.mock('../errorLog', () => ({ logError: jest.fn(), logWarn: jest.fn(), logInfo: jest.fn() }));
jest.mock('../sentry', () => ({
  setSentryUser: jest.fn(), captureError: jest.fn(), captureWarning: jest.fn(), addBreadcrumb: jest.fn(),
}));
jest.mock('../community/transport', () => ({ isExpectedCommunityRefusal: () => false }));

// One store that survives jest.resetModules(): each "launch" below gets a
// fresh module registry (so the per-session cache and the shutdown
// subscription are gone, as in a new process), but the device's storage is
// the same device's storage across launches.
const mockStore = new Map();
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (k) => (mockStore.has(k) ? mockStore.get(k) : null)),
    setItem: jest.fn(async (k, v) => { mockStore.set(k, String(v)); }),
    removeItem: jest.fn(async (k) => { mockStore.delete(k); }),
    clear: jest.fn(async () => { mockStore.clear(); }),
  },
}));

const FLAG = '@volyume_clean_shutdown_v1';
const flag = () => (mockStore.has(FLAG) ? mockStore.get(FLAG) : null);
const seed = (v) => { mockStore.set(FLAG, v); };

// Every launch is a fresh process: a fresh module instance, so the cached
// answer and the shutdown subscription of the previous "process" are gone.
function freshLaunch(appState) {
  mockCurrentAppState = appState;
  mockAppStateListeners.length = 0;
  jest.resetModules();
  // eslint-disable-next-line global-require
  return require('../observability');
}

beforeEach(() => {
  mockStore.clear();
  mockAppStateListeners.length = 0;
});

describe('detectCrashedLastSession: which launches mark the session in progress', () => {
  test('a foreground launch (active) after a clean session: no crash, and the flag is set for this session', async () => {
    seed('false');
    const obs = freshLaunch('active');
    expect(await obs.detectCrashedLastSession()).toBe(false);
    expect(flag()).toBe('true');
  });

  test('the mid-launch inactive state is still a foreground launch: the flag is set', async () => {
    seed('false');
    const obs = freshLaunch('inactive');
    expect(await obs.detectCrashedLastSession()).toBe(false);
    expect(flag()).toBe('true');
  });

  test('a first ever launch (no flag) sets it, and reports no crash', async () => {
    const obs = freshLaunch('active');
    expect(await obs.detectCrashedLastSession()).toBe(false);
    expect(flag()).toBe('true');
  });

  test('THE REGRESSION: a background wake after a clean session leaves the flag false', async () => {
    seed('false');
    const obs = freshLaunch('background');
    expect(await obs.detectCrashedLastSession()).toBe(false);
    expect(flag()).toBe('false');
  });

  test('a background wake after a real crash reports it and leaves the evidence for the next foreground launch', async () => {
    seed('true');
    const wake = freshLaunch('background');
    expect(await wake.detectCrashedLastSession()).toBe(true);
    expect(flag()).toBe('true');
    const next = freshLaunch('active');
    expect(await next.detectCrashedLastSession()).toBe(true);
  });

  test('a foreground launch after a real crash reports it (unchanged)', async () => {
    seed('true');
    const obs = freshLaunch('active');
    expect(await obs.detectCrashedLastSession()).toBe(true);
    expect(flag()).toBe('true');
  });
});

describe('the shutdown handler around a background wake', () => {
  test('a background-woken process that is later opened is marked when it becomes active, and cleared when backgrounded', async () => {
    seed('false');
    const obs = freshLaunch('background');
    await obs.detectCrashedLastSession();
    obs.installShutdownHandler();
    expect(mockAppStateListeners).toHaveLength(1);
    expect(flag()).toBe('false');
    mockAppStateListeners[0].fn('active');
    await Promise.resolve();
    expect(flag()).toBe('true');
    mockAppStateListeners[0].fn('background');
    await Promise.resolve();
    expect(flag()).toBe('false');
  });
});

describe('the sequence behind the report', () => {
  test('clean foreground session, headless wake ended by the OS, then a foreground launch: no crash is reported', async () => {
    // 1. A normal session: launched, used, backgrounded by the person.
    const session = freshLaunch('active');
    await session.detectCrashedLastSession();
    session.installShutdownHandler();
    mockAppStateListeners[0].fn('background');
    await Promise.resolve();
    expect(flag()).toBe('false');
    // 2. iOS wakes the app in the background overnight and ends it without
    //    any AppState change.
    const wake = freshLaunch('background');
    expect(await wake.detectCrashedLastSession()).toBe(false);
    wake.installShutdownHandler();
    // 3. The person opens the app (the first launch of a new build).
    const launch = freshLaunch('active');
    expect(await launch.detectCrashedLastSession()).toBe(false);
    expect(flag()).toBe('true');
  });

  test('bootObservability reports what detectCrashedLastSession found', async () => {
    seed('false');
    const obs = freshLaunch('background');
    const { wasCrashed } = await obs.bootObservability();
    expect(wasCrashed).toBe(false);
    expect(flag()).toBe('false');
  });
});
