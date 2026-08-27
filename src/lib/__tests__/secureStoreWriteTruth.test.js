/**
 * A SecureStore write that did not happen is not silence (adversarial audit
 * 2026-08-26, finding 9).
 *
 * THE GAP. secureAuthStorage.setItem called SecureStore.setItemAsync, caught
 * anything thrown, logged it, and returned. supabase-js therefore believed the
 * session was persisted whatever actually happened. expo-secure-store documents
 * a 2048-byte value limit and warns above it that the value "may not be stored
 * successfully" — and a Supabase session is an access-token JWT plus a refresh
 * token plus the user object, which is not obviously under that. A write that
 * silently did not stick surfaces only at the next cold launch, as a user who
 * was signed in and now is not, with nothing in the logs joining the two.
 *
 * NOT A LIVE INCIDENT, and the fix is scoped to that. Sentry holds no
 * secureStore or keychain events at all across the last 90 days. So the write
 * is checked rather than the storage re-architected: chunking a session across
 * several keychain items would change the format on the live auth path, and
 * nothing observed warrants it.
 *
 * THE ASYMMETRY THAT DRIVES THE DESIGN. A failed save costs the user a
 * re-login. A failed DELETE leaves a session token on a device after sign-out,
 * and the next person holding it is the one who pays. So saves are verified
 * cheaply — over-limit values, plus the first write of each key per launch, so
 * the hourly token refresh keeps its single keychain operation — and deletions
 * are verified every single time.
 */

const mockStore = new Map();
let mockWriteSucceeds = true;
let mockDeleteSucceeds = true;
const mockLog = { logError: jest.fn(), logWarn: jest.fn(), logInfo: jest.fn() };

jest.mock('expo-secure-store', () => ({
  AFTER_FIRST_UNLOCK: 'afterFirstUnlock',
  getItemAsync: jest.fn(async (key) => (mockStore.has(key) ? mockStore.get(key) : null)),
  setItemAsync: jest.fn(async (key, value) => {
    // The documented failure: it does not throw, it just does not store.
    if (mockWriteSucceeds) mockStore.set(key, value);
  }),
  deleteItemAsync: jest.fn(async (key) => {
    if (mockDeleteSucceeds) mockStore.delete(key);
  }),
}), { virtual: true });

jest.mock('../errorLog', () => ({
  logError: (...a) => mockLog.logError(...a),
  logWarn: (...a) => mockLog.logWarn(...a),
  logInfo: (...a) => mockLog.logInfo(...a),
}));

jest.mock('@supabase/supabase-js', () => ({ createClient: jest.fn(() => ({})) }), { virtual: true });

const { __secureAuthStorageForTests: storage } = require('../supabase');

// _verifiedOnce is module-level and once-per-launch BY DESIGN, so tests that
// care about first-write behaviour need their own key rather than a shared one.
let mockKeyCounter = 0;
const nextKey = () => `sb-testproject${++mockKeyCounter}-auth-token`;
const flush = () => new Promise((r) => setImmediate(r));

/** A session of roughly the shape supabase-js persists. */
function session(bytes) {
  return JSON.stringify({ access_token: 'a'.repeat(Math.max(0, bytes - 60)), token_type: 'bearer' });
}

beforeEach(() => {
  mockStore.clear();
  mockWriteSucceeds = true;
  mockDeleteSucceeds = true;
  mockLog.logError.mockClear();
  mockLog.logWarn.mockClear();
  mockLog.logInfo.mockClear();
});

describe('a save that does not stick is reported', () => {
  test('a first write that silently vanishes is logged as an error', async () => {
    const KEY = nextKey();
    mockWriteSucceeds = false;
    await storage.setItem(KEY, session(400));
    await flush();
    expect(mockLog.logError).toHaveBeenCalledWith(
      'supabase.secureStore.writeNotPersisted', expect.any(Error),
      expect.objectContaining({ readBackWasNull: true }),
    );
  });

  test('the report carries the byte size and whether it exceeded the limit', async () => {
    const KEY = nextKey();
    // Both are the first questions anyone would ask, and neither was
    // recoverable from the old logs.
    mockWriteSucceeds = false;
    await storage.setItem(KEY, session(4000));
    await flush();
    const ctx = mockLog.logError.mock.calls[0][2];
    expect(ctx.bytes).toBeGreaterThan(2048);
    expect(ctx.overDocumentedLimit).toBe(true);
  });

  test('a normal successful write says nothing', async () => {
    const KEY = nextKey();
    await storage.setItem(KEY, session(400));
    await flush();
    expect(mockLog.logError).not.toHaveBeenCalled();
    expect(mockStore.get(KEY)).toBe(session(400));
  });
});

describe('verification is paid for where it earns its cost', () => {
  test('an over-limit value is verified on every write', async () => {
    const KEY = nextKey();
    const SecureStore = require('expo-secure-store');
    await storage.setItem(KEY, session(4000));
    await flush();
    SecureStore.getItemAsync.mockClear();
    await storage.setItem(KEY, session(4000));
    await flush();
    expect(SecureStore.getItemAsync).toHaveBeenCalled();
  });

  test('an ordinary value is verified once, then left alone', async () => {
    const KEY = nextKey();
    // The token refresh writes hourly for the life of the app. Reading back
    // every time would double the keychain work on the auth hot path for no
    // new information.
    const SecureStore = require('expo-secure-store');
    await storage.setItem(KEY, session(400));
    await flush();
    SecureStore.getItemAsync.mockClear();
    await storage.setItem(KEY, session(400));
    await storage.setItem(KEY, session(400));
    await flush();
    expect(SecureStore.getItemAsync).not.toHaveBeenCalled();
  });

  test('the verification never delays the caller', async () => {
    const KEY = nextKey();
    // supabase-js awaits setItem while persisting a session; a diagnostic read
    // must not sit in that path. The read is left hanging deliberately, and
    // resolved in the finally so it can never leak into the next test as an
    // unconsumed pending mock.
    const SecureStore = require('expo-secure-store');
    let resolveRead = null;
    SecureStore.getItemAsync.mockImplementationOnce(() => new Promise((r) => { resolveRead = r; }));
    try {
      await expect(storage.setItem(KEY, session(400))).resolves.toBeUndefined();
      expect(typeof resolveRead).toBe('function');   // still pending, and we returned
    } finally {
      if (resolveRead) resolveRead(null);
      SecureStore.getItemAsync.mockReset();
      SecureStore.getItemAsync.mockImplementation(async (k) => (mockStore.has(k) ? mockStore.get(k) : null));
    }
  });
});

describe('a sign-out that leaves the token behind is reported every time', () => {
  test('a delete that does not remove the item is an error', async () => {
    const KEY = nextKey();
    mockStore.set(KEY, session(400));
    mockDeleteSucceeds = false;
    await storage.removeItem(KEY);
    expect(mockLog.logError).toHaveBeenCalledWith(
      'supabase.secureStore.removeNotPersisted', expect.any(Error), expect.any(Object),
    );
  });

  test('the report does not carry the session value or the raw key', async () => {
    const KEY = nextKey();
    // Data minimisation: nothing that identifies the account reaches Sentry.
    mockStore.set(KEY, session(400));
    mockDeleteSucceeds = false;
    await storage.removeItem(KEY);
    const ctx = mockLog.logError.mock.calls[0][2];
    expect(JSON.stringify(ctx)).not.toContain('testproject');
    expect(JSON.stringify(ctx)).not.toContain('aaaa');
  });

  test('deletion is verified on every call, not once per launch', async () => {
    const KEY = nextKey();
    // The asymmetry: a token surviving a sign-out is a different order of
    // problem from a save that failed, so it is never rate-limited.
    const SecureStore = require('expo-secure-store');
    mockStore.set(KEY, session(400));
    await storage.removeItem(KEY);
    SecureStore.getItemAsync.mockClear();
    mockStore.set(KEY, session(400));
    await storage.removeItem(KEY);
    expect(SecureStore.getItemAsync).toHaveBeenCalled();
  });

  test('a successful sign-out says nothing', async () => {
    const KEY = nextKey();
    mockStore.set(KEY, session(400));
    await storage.removeItem(KEY);
    expect(mockLog.logError).not.toHaveBeenCalled();
    expect(mockStore.has(KEY)).toBe(false);
  });
});

describe('a locked keychain is still not treated as a defect', () => {
  const locked = () => { throw new Error('User interaction is not allowed'); };

  test('a locked read during save verification is silent', async () => {
    const KEY = nextKey();
    const SecureStore = require('expo-secure-store');
    SecureStore.getItemAsync.mockImplementationOnce(locked);
    await storage.setItem(KEY, session(400));
    await flush();
    expect(mockLog.logError).not.toHaveBeenCalled();
    expect(mockLog.logWarn).not.toHaveBeenCalled();
  });

  test('a locked read during delete verification is silent too', async () => {
    const KEY = nextKey();
    const SecureStore = require('expo-secure-store');
    mockStore.set(KEY, session(400));
    SecureStore.getItemAsync.mockImplementationOnce(locked);
    await storage.removeItem(KEY);
    expect(mockLog.logError).not.toHaveBeenCalled();
    expect(mockLog.logWarn).not.toHaveBeenCalled();
  });

  test('a locked write is still logged at info, as before', async () => {
    const KEY = nextKey();
    const SecureStore = require('expo-secure-store');
    SecureStore.setItemAsync.mockImplementationOnce(locked);
    await storage.setItem(KEY, session(400));
    expect(mockLog.logInfo).toHaveBeenCalledWith(
      'supabase.secureStore.locked', expect.stringContaining('deferring'),
    );
    expect(mockLog.logError).not.toHaveBeenCalled();
  });
});
