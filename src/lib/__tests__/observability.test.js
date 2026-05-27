/**
 * Tests for the new auto-instrumentation surfaces in
 * src/lib/observability.js, instrumentAppState, instrumentNetInfo,
 * and the enhanced instrumentSupabase (rpc + error + rejection
 * coverage).
 *
 * The existing audit() / track() / instrumentNavigation paths are
 * covered indirectly by sentryScrub.test.js + the runner integration
 * test; this file focuses on the recently-added behaviour so a
 * regression here surfaces immediately.
 */

// Mock AppState + NetInfo BEFORE importing observability so the
// module picks the mocks up. AppState is part of react-native;
// NetInfo is a lazy require inside observability.js.
const mockAppStateListeners = [];
let mockCurrentAppState = 'active';

jest.mock('react-native', () => ({
  Platform: { OS: 'android', select: (o) => o.android },
  AppState: {
    get currentState() { return mockCurrentAppState; },
    addEventListener: jest.fn((_event, fn) => {
      const sub = { remove: jest.fn() };
      mockAppStateListeners.push({ fn, sub });
      return sub;
    }),
  },
}));

const mockNetInfoListeners = [];
jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: {
    addEventListener: jest.fn((fn) => {
      const unsub = jest.fn();
      mockNetInfoListeners.push({ fn, unsub });
      return unsub;
    }),
  },
}));

jest.mock('../errorLog', () => ({
  logError: jest.fn(),
  logWarn: jest.fn(),
  logInfo: jest.fn(),
}));

jest.mock('../sentry', () => ({
  setSentryUser: jest.fn(),
  captureError: jest.fn(),
  captureWarning: jest.fn(),
  addBreadcrumb: jest.fn(),
}));

const errorLog = require('../errorLog');
const {
  instrumentAppState,
  uninstrumentAppState,
  instrumentNetInfo,
  uninstrumentNetInfo,
  instrumentSupabase,
} = require('../observability');

beforeEach(() => {
  jest.clearAllMocks();
  mockAppStateListeners.length = 0;
  mockNetInfoListeners.length = 0;
  mockCurrentAppState = 'active';
  uninstrumentAppState();
  uninstrumentNetInfo();
});

describe('instrumentAppState', () => {
  test('subscribes to AppState changes and breadcrumbs each transition', () => {
    instrumentAppState();
    expect(mockAppStateListeners).toHaveLength(1);

    mockAppStateListeners[0].fn('background');

    const calls = errorLog.logInfo.mock.calls.filter(
      ([scope]) => scope === 'lifecycle',
    );
    expect(calls).toHaveLength(1);
    const ctx = calls[0][2];
    expect(ctx).toMatchObject({ from: 'active', to: 'background' });
    expect(ctx.durationInPrevMs).toBeGreaterThanOrEqual(0);
  });

  test('subsequent transitions update the from-state', () => {
    instrumentAppState();
    mockAppStateListeners[0].fn('background');
    mockAppStateListeners[0].fn('active');

    const calls = errorLog.logInfo.mock.calls.filter(
      ([scope]) => scope === 'lifecycle',
    );
    expect(calls).toHaveLength(2);
    expect(calls[0][2]).toMatchObject({ from: 'active', to: 'background' });
    expect(calls[1][2]).toMatchObject({ from: 'background', to: 'active' });
  });

  test('idempotent: a second call does not double-subscribe', () => {
    instrumentAppState();
    instrumentAppState();
    expect(mockAppStateListeners).toHaveLength(1);
  });

  test('unsubscribe stops new transitions from breadcrumbing', () => {
    instrumentAppState();
    uninstrumentAppState();
    expect(mockAppStateListeners[0].sub.remove).toHaveBeenCalled();
  });
});

describe('instrumentNetInfo', () => {
  test('subscribes to NetInfo and breadcrumbs on state change', () => {
    instrumentNetInfo();
    expect(mockNetInfoListeners).toHaveLength(1);

    // First callback after subscribe: nothing prior, so it sets the
    // baseline and DOES breadcrumb (lastConnected was null).
    mockNetInfoListeners[0].fn({ isConnected: true, type: 'wifi' });
    const firstCalls = errorLog.logInfo.mock.calls.filter(
      ([scope]) => scope === 'lifecycle',
    );
    expect(firstCalls).toHaveLength(1);
    expect(firstCalls[0][2].to).toEqual({ isConnected: true, type: 'wifi' });
  });

  test('does not breadcrumb when the same connectivity state arrives twice', () => {
    instrumentNetInfo();
    mockNetInfoListeners[0].fn({ isConnected: true, type: 'wifi' });
    mockNetInfoListeners[0].fn({ isConnected: true, type: 'wifi' });
    const calls = errorLog.logInfo.mock.calls.filter(
      ([scope]) => scope === 'lifecycle',
    );
    expect(calls).toHaveLength(1);
  });

  test('breadcrumbs when the connection type changes', () => {
    instrumentNetInfo();
    mockNetInfoListeners[0].fn({ isConnected: true, type: 'wifi' });
    mockNetInfoListeners[0].fn({ isConnected: true, type: 'cellular' });
    const calls = errorLog.logInfo.mock.calls.filter(
      ([scope]) => scope === 'lifecycle',
    );
    expect(calls).toHaveLength(2);
    expect(calls[1][2].to).toEqual({ isConnected: true, type: 'cellular' });
  });

  test('breadcrumbs the offline transition', () => {
    instrumentNetInfo();
    mockNetInfoListeners[0].fn({ isConnected: true, type: 'wifi' });
    mockNetInfoListeners[0].fn({ isConnected: false, type: 'none' });
    const calls = errorLog.logInfo.mock.calls.filter(
      ([scope]) => scope === 'lifecycle',
    );
    expect(calls).toHaveLength(2);
    expect(calls[1][2]).toMatchObject({
      from: { isConnected: true, type: 'wifi' },
      to: { isConnected: false, type: 'none' },
    });
  });

  test('idempotent: a second call does not double-subscribe', () => {
    instrumentNetInfo();
    instrumentNetInfo();
    expect(mockNetInfoListeners).toHaveLength(1);
  });
});

describe('instrumentSupabase (enhanced)', () => {
  function makeQueryBuilder({ data = null, error = null, shouldThrow = false } = {}) {
    const result = shouldThrow
      ? Promise.reject(new Error('network down'))
      : Promise.resolve({ data, error });
    return {
      select: jest.fn(() => result),
      insert: jest.fn(() => result),
      update: jest.fn(() => result),
      upsert: jest.fn(() => result),
      delete: jest.fn(() => result),
    };
  }

  function makeClient({ from = jest.fn(), rpc = jest.fn() } = {}) {
    return { from, rpc, auth: {} };
  }

  test('happy path breadcrumb includes rowCount and durationMs', async () => {
    const builder = makeQueryBuilder({ data: [{ id: 1 }, { id: 2 }] });
    const client = makeClient({ from: jest.fn(() => builder) });
    const wrapped = instrumentSupabase(client);

    await wrapped.from('food_entries').select('*');

    const breadcrumb = errorLog.logInfo.mock.calls.find(
      ([scope]) => scope === 'supabase.food_entries',
    );
    expect(breadcrumb).toBeTruthy();
    const ctx = breadcrumb[2];
    expect(ctx).toMatchObject({ rowCount: 2 });
    expect(ctx.durationMs).toBeGreaterThanOrEqual(0);
  });

  test('PostgREST error envelope routes to logWarn with code + message', async () => {
    const builder = makeQueryBuilder({
      error: { code: 'PGRST204', message: 'Could not find column foo', hint: null },
    });
    const client = makeClient({ from: jest.fn(() => builder) });
    const wrapped = instrumentSupabase(client);

    const { error } = await wrapped.from('recipe_ingredients').upsert({ id: 1 });
    expect(error).toBeTruthy();

    const warn = errorLog.logWarn.mock.calls.find(
      ([scope]) => scope === 'supabase.recipe_ingredients',
    );
    expect(warn).toBeTruthy();
    expect(warn[2]).toMatchObject({
      op: 'upsert',
      table: 'recipe_ingredients',
      errorCode: 'PGRST204',
      threw: false,
    });
    expect(warn[2].errorMessage).toContain('Could not find column foo');
  });

  test('promise rejection (network failure) also breadcrumbs as warn', async () => {
    const builder = makeQueryBuilder({ shouldThrow: true });
    const client = makeClient({ from: jest.fn(() => builder) });
    const wrapped = instrumentSupabase(client);

    await expect(wrapped.from('food_entries').select('*')).rejects.toThrow('network down');

    const warn = errorLog.logWarn.mock.calls.find(
      ([scope]) => scope === 'supabase.food_entries',
    );
    expect(warn).toBeTruthy();
    expect(warn[2]).toMatchObject({
      threw: true,
      errorCode: 'thrown',
    });
    expect(warn[2].errorMessage).toContain('network down');
  });

  test('rpc() is wrapped and breadcrumbs with the rpc name as table', async () => {
    const rpcResult = Promise.resolve({ data: { timestamp: 'x', changes: {} }, error: null });
    const client = makeClient({ rpc: jest.fn(() => rpcResult) });
    const wrapped = instrumentSupabase(client);

    await wrapped.rpc('food_sync_pull', { _since: null });

    const breadcrumb = errorLog.logInfo.mock.calls.find(
      ([scope]) => scope === 'supabase.food_sync_pull',
    );
    expect(breadcrumb).toBeTruthy();
    expect(breadcrumb[2].rowCount).toBeNull(); // data is an object, not an array
  });

  test('rpc() error envelope routes to logWarn', async () => {
    const rpcResult = Promise.resolve({
      data: null,
      error: { code: '42703', message: 'column does not exist' },
    });
    const client = makeClient({ rpc: jest.fn(() => rpcResult) });
    const wrapped = instrumentSupabase(client);

    await wrapped.rpc('food_sync_push', { _changes: {} });

    const warn = errorLog.logWarn.mock.calls.find(
      ([scope]) => scope === 'supabase.food_sync_push',
    );
    expect(warn).toBeTruthy();
    expect(warn[2]).toMatchObject({
      op: 'rpc',
      table: 'food_sync_push',
      errorCode: '42703',
    });
  });

  test('idempotent: instrumenting an already-instrumented client returns it unchanged', () => {
    const client = makeClient();
    const wrapped = instrumentSupabase(client);
    const wrappedTwice = instrumentSupabase(wrapped);
    expect(wrapped).toBe(wrappedTwice);
  });

  test('non-thenable from() result (rare) is passed through without breadcrumb', () => {
    const builder = {
      select: jest.fn(() => 'sync-value'), // not a promise
    };
    const client = makeClient({ from: jest.fn(() => builder) });
    const wrapped = instrumentSupabase(client);
    const result = wrapped.from('foo').select('*');
    expect(result).toBe('sync-value');
    // No crash, no breadcrumb fired
    const crumbs = errorLog.logInfo.mock.calls.filter(
      ([scope]) => scope === 'supabase.foo',
    );
    expect(crumbs).toHaveLength(0);
  });
});
