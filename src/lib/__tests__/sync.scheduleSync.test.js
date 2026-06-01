// A2-030: scheduleSync() no-ops under Jest (the JEST_WORKER_ID guard) so most
// DB write tests don't leave a 2s timer pending. The cost was that the debounce
// itself, its coalescing, and cancelScheduledSync had no coverage. These tests
// unset the guard and drive the real timer path with fake timers.
//
// sync.js is the legacy monolith; mock its module-load imports so it loads in
// the node env without the real supabase/db chain (mirrors the sibling sync
// test). useAppStore is mocked too so the fire callback's state is controllable.

jest.mock('../supabase', () => ({ getSupabaseClient: jest.fn(() => null) }));
jest.mock('../database', () => ({}));
jest.mock('../sync/runner', () => ({ scheduleSync: jest.fn() }));
jest.mock('../errorLog', () => ({ logInfo: jest.fn(), logWarn: jest.fn(), logError: jest.fn() }));
jest.mock('../observability', () => ({ audit: jest.fn() }));
jest.mock('../engineTelemetry', () => ({ track: jest.fn() }));

const mockState = { session: null, user: null };
jest.mock('../../store/useAppStore', () => ({
  __esModule: true,
  default: { getState: () => mockState },
}));

const { scheduleSync, cancelScheduledSync } = require('../sync');

describe('scheduleSync debounce + cancellation (A2-030)', () => {
  let savedWorker;
  beforeEach(() => {
    savedWorker = process.env.JEST_WORKER_ID;
    delete process.env.JEST_WORKER_ID; // arm the real debounce instead of no-op
    jest.useFakeTimers();
    mockState.session = null;
    mockState.user = null;
  });
  afterEach(() => {
    cancelScheduledSync();
    jest.clearAllTimers();
    jest.useRealTimers();
    if (savedWorker !== undefined) process.env.JEST_WORKER_ID = savedWorker;
  });

  test('arms exactly one 2s timer', () => {
    const before = jest.getTimerCount();
    scheduleSync();
    expect(jest.getTimerCount()).toBe(before + 1);
  });

  test('coalesces rapid calls into a single pending timer', () => {
    const before = jest.getTimerCount();
    scheduleSync();
    scheduleSync();
    scheduleSync();
    expect(jest.getTimerCount()).toBe(before + 1);
  });

  test('cancelScheduledSync clears the pending timer', () => {
    const before = jest.getTimerCount();
    scheduleSync();
    expect(jest.getTimerCount()).toBe(before + 1);
    cancelScheduledSync();
    expect(jest.getTimerCount()).toBe(before);
  });

  test('does not fire before the 2s window, fires after', () => {
    scheduleSync();
    const armed = jest.getTimerCount();
    jest.advanceTimersByTime(1999);
    expect(jest.getTimerCount()).toBe(armed); // still pending
    jest.advanceTimersByTime(1);
    expect(jest.getTimerCount()).toBe(armed - 1); // fired and cleared
  });

  test('still no-ops when JEST_WORKER_ID is set', () => {
    process.env.JEST_WORKER_ID = '1';
    const before = jest.getTimerCount();
    scheduleSync();
    expect(jest.getTimerCount()).toBe(before); // guard returned early
  });

  test('firing with no cloud session is a safe no-op', () => {
    scheduleSync();
    expect(() => jest.runOnlyPendingTimers()).not.toThrow();
    expect(jest.getTimerCount()).toBe(0);
  });

  test('firing with a cloud session dispatches the upload path without throwing', () => {
    mockState.session = { user: { id: 'sb-1' } };
    mockState.user = { id: 'loc-1' };
    scheduleSync();
    expect(() => jest.runOnlyPendingTimers()).not.toThrow();
    expect(jest.getTimerCount()).toBe(0);
  });
});
