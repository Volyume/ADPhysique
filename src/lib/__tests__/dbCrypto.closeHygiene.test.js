/**
 * dbCrypto probe close hygiene (R2-11 structural follow-up, 2026-07-11).
 *
 * expo-sqlite hands back the SAME ref-counted native connection for every
 * openDatabaseAsync of one path. The open/migrate flow probes the DB several
 * times (keyed, plaintext) and used to swallow every closeAsync failure - so
 * a probe that would not close stayed live, the next "fresh" open reused it
 * (inheriting its PRAGMA key state, or after a file move its old inode), and
 * the flow could misclassify the database and take a destructive branch on
 * wrong evidence. Worst chain: a leaked plaintext handle surviving the
 * migration swap meant every write that session landed on a deleted inode.
 *
 * These tests pin the new contract: on any classification-critical path a
 * failed close ABORTS the open recoverably (nothing moved, nothing deleted;
 * initDatabase retries clean on the next launch), and a failed close before
 * the migration swap lands in the plaintext fallback BEFORE any file move.
 *
 * The real migration is native SQLCipher and stays device-only; these tests
 * exercise the control flow through the injectable SQLite parameter.
 */

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => 'a'.repeat(64)),
  setItemAsync: jest.fn(async () => {}),
  AFTER_FIRST_UNLOCK: 'AFTER_FIRST_UNLOCK',
}));
jest.mock('expo-crypto', () => ({ getRandomBytesAsync: jest.fn() }));
jest.mock('../errorLog', () => ({
  logError: jest.fn(), logInfo: jest.fn(), logWarn: jest.fn(),
}));

const mockFsState = { backupExists: false, liveExists: true };
jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: '/doc/',
  getInfoAsync: jest.fn(async (p) => {
    if (p.includes('volyume-plain-backup.db')) return { exists: mockFsState.backupExists };
    return { exists: mockFsState.liveExists };
  }),
  deleteAsync: jest.fn(async () => {}),
  moveAsync: jest.fn(async () => {}),
}));

const { openEncryptedDb } = require('../dbCrypto');
const FileSystem = require('expo-file-system/legacy');

// A handle whose readability and close behaviour are scripted per test.
function handle({ isReadable, closeThrows = false }) {
  return {
    execAsync: jest.fn(async () => {}),
    getAllAsync: jest.fn(async (sql) => {
      if (sql.includes('sqlite_master') && !isReadable) throw new Error('file is not a database');
      return [];
    }),
    closeAsync: jest.fn(async () => {
      if (closeThrows) throw new Error('unable to close due to unfinalized statements');
    }),
  };
}

// Fake SQLite module: hands out scripted handles in open order.
function sqliteWith(handles) {
  const queue = [...handles];
  return {
    openDatabaseAsync: jest.fn(async () => {
      if (!queue.length) throw new Error('test opened more handles than scripted');
      return queue.shift();
    }),
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockFsState.backupExists = false;
  mockFsState.liveExists = true;
});

test('happy path is untouched: keyed-readable DB returns encrypted', async () => {
  const SQLite = sqliteWith([handle({ isReadable: true })]);
  const result = await openEncryptedDb(SQLite);
  expect(result.encrypted).toBe(true);
  expect(FileSystem.moveAsync).not.toHaveBeenCalled();
});

test('keyed probe that will not close aborts recoverably before any plaintext probe', async () => {
  const SQLite = sqliteWith([handle({ isReadable: false, closeThrows: true })]);
  await expect(openEncryptedDb(SQLite)).rejects.toMatchObject({ dbCryptoAbort: true });
  // Only the keyed probe was opened; no misclassifying plaintext probe, no file ops.
  expect(SQLite.openDatabaseAsync).toHaveBeenCalledTimes(1);
  expect(FileSystem.moveAsync).not.toHaveBeenCalled();
  expect(FileSystem.deleteAsync).not.toHaveBeenCalled();
});

test('interrupted-swap recovery aborts on a stuck probe instead of moving files', async () => {
  mockFsState.backupExists = true;
  const SQLite = sqliteWith([handle({ isReadable: false, closeThrows: true })]);
  await expect(openEncryptedDb(SQLite)).rejects.toMatchObject({ dbCryptoAbort: true });
  expect(FileSystem.moveAsync).not.toHaveBeenCalled();
  expect(FileSystem.deleteAsync).not.toHaveBeenCalled();
});

test('unreadable-both path aborts on a stuck plaintext probe instead of moving the DB aside', async () => {
  const SQLite = sqliteWith([
    handle({ isReadable: false }),                     // keyed probe, closes fine
    handle({ isReadable: false, closeThrows: true }),  // plaintext probe, stuck
  ]);
  await expect(openEncryptedDb(SQLite)).rejects.toMatchObject({ dbCryptoAbort: true });
  expect(FileSystem.moveAsync).not.toHaveBeenCalled();
});

test('a stuck plaintext handle before the swap lands in the plaintext fallback with no file moved', async () => {
  const fallback = handle({ isReadable: true });
  const SQLite = sqliteWith([
    handle({ isReadable: false }),                    // keyed probe
    handle({ isReadable: true, closeThrows: true }),  // plaintext data, export runs, close sticks
    fallback,                                         // migrate_failed fallback open
  ]);
  const result = await openEncryptedDb(SQLite);
  expect(result.encrypted).toBe(false);
  expect(result.db).toBe(fallback);
  // The abort fired BEFORE the swap: the live DB was never moved.
  expect(FileSystem.moveAsync).not.toHaveBeenCalled();
});
