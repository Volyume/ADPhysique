/**
 * An existing encrypted database never silently downgrades to plaintext
 * (founder law, 2026-08-27).
 *
 * THE LAW. If the SQLCipher key cannot be retrieved, the app must not open or
 * create plaintext storage over an existing encrypted database. It must fail
 * closed and expose a recoverable state instead. A silent downgrade would mean
 * health data the consent screen calls encrypted sitting on disk unprotected,
 * and the user never told.
 *
 * THE FIVE STATES, and what each must do:
 *
 *   A  fresh install, no database, no key      mint a key, create encrypted
 *   B  existing encrypted database, valid key  open it encrypted
 *   C  existing encrypted database, TEMPORARY  FAIL CLOSED. No plaintext handle,
 *      key-retrieval failure                   no new database, recoverable throw
 *   D  existing encrypted database, key        preserve the file, never destroy
 *      genuinely unrecoverable                 or overwrite it
 *   E  no database, stale or missing           behave as a fresh install
 *      SecureStore state
 *
 * These drive the REAL openEncryptedDb against a filesystem and a SQLite that
 * behave the way the originals do, because the property under test is which
 * files exist afterwards and whether a plaintext handle was ever returned.
 * Reading the branches is not enough: this module's whole difficulty is that
 * `openDatabaseAsync` CREATES a file when one is absent, so several branches
 * look safe and are not.
 */

const mockFiles = new Map();          // path -> { encrypted: bool, empty: bool }
const VALID_KEY = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
let mockKeyState = { stored: VALID_KEY, readThrows: false, writeThrows: false, locked: false };
let mockSqlcipherWorks = true;
const mockLog = { logError: jest.fn(), logInfo: jest.fn(), logWarn: jest.fn() };

const DIR = '/doc/SQLite/';
const LIVE = `${DIR}volyume.db`;

// Driven through SecureStore rather than by stubbing getOrCreateDbKey.
// openEncryptedDb calls that function by its module-internal binding, so a
// jest.spyOn on the exports object does not intercept it -- an earlier version
// of this file did exactly that, silently ran every case as "key unavailable",
// and passed the four assertions that happened to match.
jest.mock('expo-secure-store', () => ({
  AFTER_FIRST_UNLOCK: 'afterFirstUnlock',
  getItemAsync: jest.fn(async () => {
    if (mockKeyState.readThrows) {
      const e = new Error(mockKeyState.locked ? 'User interaction is not allowed' : 'keystore unavailable');
      throw e;
    }
    return mockKeyState.stored;
  }),
  setItemAsync: jest.fn(async () => {
    if (mockKeyState.writeThrows) throw new Error('keystore unavailable');
  }),
  deleteItemAsync: jest.fn(async () => {}),
}), { virtual: true });

jest.mock('expo-crypto', () => ({
  getRandomBytesAsync: jest.fn(async (n) => new Uint8Array(n).fill(0xab)),
}), { virtual: true });

jest.mock('expo-file-system/legacy', () => ({
  get documentDirectory() { return '/doc/'; },
  getInfoAsync: jest.fn(async (p) => (mockFiles.has(p) ? { exists: true, size: 4096 } : { exists: false })),
  deleteAsync: jest.fn(async (p) => { mockFiles.delete(p); }),
  moveAsync: jest.fn(async ({ from, to }) => {
    if (!mockFiles.has(from)) throw new Error(`no such file: ${from}`);
    mockFiles.set(to, mockFiles.get(from));
    mockFiles.delete(from);
  }),
  copyAsync: jest.fn(async ({ from, to }) => { mockFiles.set(to, mockFiles.get(from)); }),
  makeDirectoryAsync: jest.fn(async () => {}),
}), { virtual: true });

/**
 * A SQLite whose open CREATES an absent file, exactly like the real one. That
 * behaviour is the source of most of this module's danger, so the fake must
 * reproduce it or the tests prove nothing.
 */
const mockOpened = [];
jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn(async (name) => {
    const p = `/doc/SQLite/${name}`;
    const created = !mockFiles.has(p);
    if (created) mockFiles.set(p, { encrypted: false, empty: true });
    const file = mockFiles.get(p);
    const handle = {
      _path: p,
      _keyed: false,
      _createdByThisOpen: created,
      execAsync: jest.fn(async (sql) => {
        const m = /PRAGMA key = '([^']*)'/.exec(sql);
        if (m) {
          if (!mockSqlcipherWorks) throw new Error('no such pragma: key');
          handle._keyed = true;
          handle._key = m[1];
          // A brand-new empty file becomes encrypted, under THIS key, the
          // moment it is keyed.
          if (file.empty) { file.encrypted = true; file.key = m[1]; }
        }
      }),
      getAllAsync: jest.fn(async () => {
        if (file.encrypted) {
          // The wrong key reads exactly like a corrupt file, which is the
          // whole difficulty of telling states C and D apart.
          if (!handle._keyed || handle._key !== file.key) throw new Error('file is not a database');
          return [{ n: 1 }];
        }
        if (handle._keyed && !file.empty) throw new Error('file is not a database');
        return [{ n: 1 }];
      }),
      getFirstAsync: jest.fn(async () => ({ user_version: 0 })),
      closeAsync: jest.fn(async () => {}),
    };
    mockOpened.push(handle);
    return handle;
  }),
}), { virtual: true });

jest.mock('../errorLog', () => ({
  logError: (...a) => mockLog.logError(...a),
  logInfo: (...a) => mockLog.logInfo(...a),
  logWarn: (...a) => mockLog.logWarn(...a),
}));

const SQLite = require('expo-sqlite');



function reset() {
  mockFiles.clear();
  mockOpened.length = 0;
  mockSqlcipherWorks = true;
  mockKeyState = { stored: VALID_KEY, readThrows: false, writeThrows: false, locked: false };
  mockLog.logError.mockClear();
  mockLog.logInfo.mockClear();
  jest.restoreAllMocks();
}

/** Runs the REAL open, including the real key retrieval. */
async function open() {
  return require('../dbCrypto').openEncryptedDb(SQLite);
}

const plaintextFallbacks = () => mockLog.logError.mock.calls
  .filter((c) => c[0] === 'dbCrypto.plaintextFallback');

beforeEach(reset);

describe('the fake reproduces the behaviour that makes this module dangerous', () => {
  test('opening an absent database CREATES it, as the real one does', async () => {
    expect(mockFiles.has(LIVE)).toBe(false);
    await SQLite.openDatabaseAsync('volyume.db');
    expect(mockFiles.has(LIVE)).toBe(true);
  });

  test('an encrypted file is unreadable without the key', async () => {
    mockFiles.set(LIVE, { encrypted: true, empty: false, key: VALID_KEY });
    const h = await SQLite.openDatabaseAsync('volyume.db');
    await expect(h.getAllAsync('SELECT 1')).rejects.toThrow(/not a database/);
  });

  test('and readable with it', async () => {
    mockFiles.set(LIVE, { encrypted: true, empty: false, key: VALID_KEY });
    const h = await SQLite.openDatabaseAsync('volyume.db');
    await h.execAsync(`PRAGMA key = '${VALID_KEY}'`);
    await expect(h.getAllAsync('SELECT 1')).resolves.toBeTruthy();
  });
});

describe('state C: existing encrypted database, temporary key failure', () => {
  // The state the law is written for.
  beforeEach(() => {
    mockFiles.set(LIVE, { encrypted: true, empty: false, key: VALID_KEY });
    mockKeyState = { stored: null, readThrows: true, writeThrows: false, locked: false };
  });

  test('it FAILS CLOSED rather than returning a handle', async () => {
    await expect(open()).rejects.toThrow(/key unavailable/i);
  });

  test('no plaintext fallback is emitted', async () => {
    await open().catch(() => {});
    expect(plaintextFallbacks()).toEqual([]);
  });

  test('the encrypted database is left exactly where it was', async () => {
    await open().catch(() => {});
    expect(mockFiles.get(LIVE)).toEqual({ encrypted: true, empty: false, key: VALID_KEY });
  });

  test('nothing was moved aside or replaced', async () => {
    await open().catch(() => {});
    expect(mockFiles.has(`${DIR}volyume-unreadable.db`)).toBe(false);
    expect([...mockFiles.keys()]).toEqual([LIVE]);
  });

  test('a locked device is logged as expected, not as an error', async () => {
    mockKeyState = { stored: null, readThrows: true, writeThrows: false, locked: true };
    await open().catch(() => {});
    expect(mockLog.logInfo).toHaveBeenCalledWith(
      'dbCrypto.keyUnavailable.locked', expect.any(String),
    );
    expect(mockLog.logError).not.toHaveBeenCalledWith('dbCrypto.keyUnavailable', expect.anything(), expect.anything());
  });

  test('an unexplained key loss IS an error, because that one is serious', async () => {
    await open().catch(() => {});
    expect(mockLog.logError).toHaveBeenCalledWith('dbCrypto.keyUnavailable', expect.any(Error), {});
  });

  test('the throw is recoverable: the next launch with the key opens normally', async () => {
    await expect(open()).rejects.toThrow();
    mockKeyState = { stored: VALID_KEY, readThrows: false, writeThrows: false, locked: false };
    await expect(open()).resolves.toMatchObject({ encrypted: true });
  });
});

describe('state A: fresh install', () => {
  test('creates an encrypted database', async () => {
    await expect(open()).resolves.toMatchObject({ encrypted: true });
    expect(mockFiles.get(LIVE).encrypted).toBe(true);
  });

  test('with no plaintext fallback anywhere on the path', async () => {
    await open();
    expect(plaintextFallbacks()).toEqual([]);
  });
});

describe('state B: existing encrypted database, valid key', () => {
  test('opens it encrypted and touches nothing', async () => {
    mockFiles.set(LIVE, { encrypted: true, empty: false, key: VALID_KEY });
    await expect(open()).resolves.toMatchObject({ encrypted: true });
    expect([...mockFiles.keys()]).toEqual([LIVE]);
  });
});

describe('state E: no database, stale or missing SecureStore state', () => {
  test('a stale key with no database behaves as a fresh install', async () => {
    mockKeyState = { stored: 'b'.repeat(64), readThrows: false, writeThrows: false, locked: false };
    await expect(open()).resolves.toMatchObject({ encrypted: true });
  });

  test('no key and no database DEFERS rather than creating a plaintext one', async () => {
    // Found by this test before the fix: openDatabaseAsync creates the file
    // when absent, so a fresh install whose keychain was briefly unavailable --
    // a background wake before the first unlock is the ordinary way that
    // happens -- got a PLAINTEXT database and wrote health data into it. The
    // expected model for a fresh install is an encrypted database, so the right
    // answer when we cannot have one is to wait.
    mockKeyState = { stored: null, readThrows: true, writeThrows: false, locked: false };
    await expect(open()).rejects.toThrow(/no database exists yet/);
  });

  test('and creates nothing on disk while deferring', async () => {
    mockKeyState = { stored: null, readThrows: true, writeThrows: false, locked: false };
    await open().catch(() => {});
    expect([...mockFiles.keys()]).toEqual([]);
  });

  test('the next launch, with the key back, creates it encrypted', async () => {
    mockKeyState = { stored: null, readThrows: true, writeThrows: false, locked: false };
    await open().catch(() => {});
    mockKeyState = { stored: VALID_KEY, readThrows: false, writeThrows: false, locked: false };
    await expect(open()).resolves.toMatchObject({ encrypted: true });
  });
});

describe('state D: key genuinely unrecoverable', () => {
  beforeEach(() => {
    mockFiles.set(LIVE, { encrypted: true, empty: false, key: VALID_KEY });
    mockKeyState = { stored: 'c'.repeat(64), readThrows: false, writeThrows: false, locked: false };
  });

  test('the old database is preserved, never deleted', async () => {
    await open().catch(() => {});
    const preserved = mockFiles.get(`${DIR}volyume-unreadable.db`);
    expect(preserved).toMatchObject({ encrypted: true, empty: false, key: VALID_KEY });
  });

  test('it is not overwritten in place', async () => {
    await open().catch(() => {});
    // Whatever now sits at the live path, it is not the old encrypted file
    // having been written over: that file still exists under its own name.
    expect(mockFiles.has(`${DIR}volyume-unreadable.db`)).toBe(true);
  });

  test('the preservation is recorded, so it is not a silent event', async () => {
    await open().catch(() => {});
    expect(mockLog.logError).toHaveBeenCalledWith(
      'dbCrypto.unreadableMovedAside', expect.any(Error), expect.anything(),
    );
  });
});

describe('the plaintext fallbacks that remain are not downgrades of encrypted data', () => {
  test('SQLCipher unavailable on the build reports encrypted:false honestly', async () => {
    // Found by this test before the fix: keyed() swallowed a failing PRAGMA
    // key, an empty file then read perfectly well without one, and the caller
    // concluded the database was encrypted. The app claimed encryption on a
    // build that has none -- and the Article 9 consent screen now reads that
    // flag to decide what to tell the user about their health data, so a false
    // positive there defeats the honesty fix in exactly its own case.
    mockSqlcipherWorks = false;
    const result = await open().catch((e) => e);
    expect(result).not.toBeInstanceOf(Error);
    expect(result.encrypted).toBe(false);
    expect(plaintextFallbacks().length).toBeGreaterThan(0);
  });

  test('readable alone is not enough to claim encryption', async () => {
    // The distinction the fix turns on, as an executed fact: an empty database
    // reads fine with no key at all.
    mockSqlcipherWorks = false;
    const h = await SQLite.openDatabaseAsync('volyume.db');
    await expect(h.getAllAsync('SELECT 1')).resolves.toBeTruthy();
  });

  test('a plaintext database staying plaintext is not a downgrade', async () => {
    // A user from before encryption shipped, whose key is briefly unavailable.
    // Their data was never encrypted, so opening it is not a downgrade, and
    // refusing would lock them out of their own history for nothing.
    mockFiles.set(LIVE, { encrypted: false, empty: false });
    mockKeyState = { stored: null, readThrows: true, writeThrows: false, locked: false };
    const result = await open();
    expect(result.encrypted).toBe(false);
    expect(plaintextFallbacks().length).toBeGreaterThan(0);
  });
});

describe('the law, stated as one assertion', () => {
  test('no path returns a plaintext handle for a database that was encrypted', async () => {
    // The single property the founder law names, swept across every key state.
    for (const keyState of [
      { stored: null, readThrows: true, writeThrows: false, locked: false },
      { stored: null, readThrows: true, writeThrows: false, locked: true },
      { stored: 'c'.repeat(64), readThrows: false, writeThrows: false, locked: false },
      { stored: null, readThrows: false, writeThrows: true, locked: false },
    ]) {
      reset();
      mockFiles.set(LIVE, { encrypted: true, empty: false, key: VALID_KEY });
      mockKeyState = keyState;
      const result = await open().catch((e) => e);
      if (result instanceof Error) continue;                 // failed closed
      if (result.encrypted) continue;                        // opened encrypted
      // A plaintext handle was returned. That is only lawful if the original
      // encrypted file was preserved rather than adopted.
      expect(mockFiles.has(`${DIR}volyume-unreadable.db`)).toBe(true);
    }
  });
});
