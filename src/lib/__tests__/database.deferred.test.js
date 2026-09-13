/**
 * The database deferral flag (Sentry VOLYUME-2G / 2J).
 *
 * WHAT THIS SUITE PINS, and why each case is written to FAIL: a background
 * wake before the device's first unlock since boot cannot read the SQLCipher
 * key, so dbCrypto rejects the open with a MARKED deferral. That is the
 * expected background-wake state, not a fault, and the sync runner stands
 * down for the cycle by asking `isDatabaseDeferred()`. The flag must be TRUE
 * only after a deferral (any other failure is a real fault the runner must
 * not hide), must be CLEARED by the next successful open (a stale flag would
 * stand sync down for a device that is fine), and the marked error itself
 * must reach the caller unchanged so a table handler can recognise it.
 */

jest.mock('expo-sqlite', () => ({ openDatabaseAsync: jest.fn() }));
jest.mock('../dbSnapshot', () => ({
  recoverInterruptedSnapshotRestore: jest.fn(async () => {}),
  snapshotBeforeMigration: jest.fn(async () => {}),
}));
jest.mock('../errorLog', () => ({ logError: jest.fn(), logWarn: jest.fn(), logInfo: jest.fn() }));

const mockOpen = jest.fn();
jest.mock('../dbCrypto', () => ({ openEncryptedDb: (...a) => mockOpen(...a) }));

const database = require('../database');

// A handle at the current schema version, so init runs no migration.
function handle() {
  return {
    execAsync: jest.fn(async () => {}),
    runAsync: jest.fn(async () => ({ changes: 0 })),
    getFirstAsync: jest.fn(async (sql) => (
      /user_version/i.test(String(sql)) ? { user_version: database.CURRENT_SCHEMA_VERSION } : null
    )),
    getAllAsync: jest.fn(async () => []),
    closeAsync: jest.fn(async () => {}),
  };
}

function deferral() {
  const e = new Error('SQLCipher key unavailable and existing DB is not plaintext-readable');
  e.dbCryptoDeferred = true;
  return e;
}

beforeEach(async () => {
  jest.clearAllMocks();
  await database.closeDatabase().catch(() => {});
});

test('before any open, the database is not deferred', () => {
  expect(database.isDatabaseDeferred()).toBe(false);
});

test('a deferred open marks the database deferred and re-throws the marked error', async () => {
  mockOpen.mockRejectedValueOnce(deferral());
  await expect(database.initDatabase()).rejects.toMatchObject({ dbCryptoDeferred: true });
  expect(database.isDatabaseDeferred()).toBe(true);
});

test('the next successful open clears it', async () => {
  mockOpen.mockRejectedValueOnce(deferral());
  await database.initDatabase().catch(() => {});
  expect(database.isDatabaseDeferred()).toBe(true);

  mockOpen.mockResolvedValueOnce({ db: handle(), encrypted: true });
  await database.initDatabase();
  expect(database.isDatabaseDeferred()).toBe(false);
});

test('any other open failure is not a deferral, and clears a stale one', async () => {
  mockOpen.mockRejectedValueOnce(deferral());
  await database.initDatabase().catch(() => {});
  expect(database.isDatabaseDeferred()).toBe(true);

  mockOpen.mockRejectedValueOnce(new Error('disk I/O error'));
  await expect(database.initDatabase()).rejects.toThrow('disk I/O error');
  expect(database.isDatabaseDeferred()).toBe(false);
});

test('a deferral after a successful open marks it again: the flag is the LAST attempt', async () => {
  mockOpen.mockResolvedValueOnce({ db: handle(), encrypted: true });
  await database.initDatabase();
  expect(database.isDatabaseDeferred()).toBe(false);

  await database.closeDatabase();
  mockOpen.mockRejectedValueOnce(deferral());
  await database.initDatabase().catch(() => {});
  expect(database.isDatabaseDeferred()).toBe(true);
});
