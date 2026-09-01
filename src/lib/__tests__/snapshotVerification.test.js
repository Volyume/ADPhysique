/**
 * A snapshot is not a backup until something has read it back
 * (adversarial audit 2026-08-26, finding 5).
 *
 * THE DEFECT. copySnapshot called FileSystem.copyAsync, its promise resolved,
 * and the file was thereafter presented on the restore screen as "an automatic
 * safety copy" with a friendly label and a byte size. Nothing ever opened it. A
 * copy that ran out of disk part-way, or landed empty, or was encrypted under a
 * key the device no longer holds, looked identical on that screen to a good
 * one. The single screen a user reaches when something has already gone wrong
 * could be offering them nothing, and they would find out at the worst moment.
 *
 * AND RESTORE MADE IT WORSE. restoreSnapshot copied the snapshot straight over
 * the live database and deleted the WAL sidecars. Restoring an unusable
 * snapshot therefore destroyed the live database on the way to failing: the
 * user ended with neither copy. The confirmation dialog's "This cannot be
 * undone" was true but understated — the failure took the good copy with it.
 *
 * WHY OPENING IT IS THE ONLY REAL TEST. The database is SQLCipher-encrypted, so
 * a snapshot is a copy of ciphertext. It can be the right size with a plausible
 * header and still be unopenable, because the key that encrypted it is not the
 * key held now — exactly the situation in which someone reaches for a backup.
 * A size check cannot see that. An open can.
 */

// ── A filesystem and a SQLite that behave like the real ones for this test ──

// Jest only lets a mock factory reach out-of-scope names prefixed `mock`.
let mockFiles;      // uri -> { size, content }
let mockOpenable;   // content -> how a database opened on it behaves

jest.mock('expo-file-system/legacy', () => ({
  get documentDirectory() { return '/doc/'; },
  makeDirectoryAsync: jest.fn(async () => {}),
  copyAsync: jest.fn(async ({ from, to }) => {
    if (!(from in mockFiles)) throw new Error(`no such file: ${from}`);
    mockFiles[to] = { ...mockFiles[from] };
  }),
  moveAsync: jest.fn(async ({ from, to }) => {
    if (!(from in mockFiles)) throw new Error(`no such file: ${from}`);
    mockFiles[to] = { ...mockFiles[from] };
    delete mockFiles[from];
  }),
  writeAsStringAsync: jest.fn(async (uri, content) => {
    mockFiles[uri] = { content, size: String(content).length };
  }),
  readAsStringAsync: jest.fn(async (uri) => {
    if (!(uri in mockFiles)) throw new Error(`no such file: ${uri}`);
    return mockFiles[uri].content;
  }),
  deleteAsync: jest.fn(async (uri) => { delete mockFiles[uri]; }),
  getInfoAsync: jest.fn(async (uri) => (
    uri in mockFiles ? { exists: true, size: mockFiles[uri].size } : { exists: false }
  )),
  readDirectoryAsync: jest.fn(async (dir) => Object.keys(mockFiles)
    .filter((f) => f.startsWith(dir))
    .map((f) => f.slice(dir.length))),
}), { virtual: true });

jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn(async (name) => {
    const uri = `/doc/SQLite/${name}`;
    const file = mockFiles[uri];
    const behaviour = mockOpenable[file?.content] ?? 'unreadable';
    let keyed = false;
    // encrypted: readable only once PRAGMA key is applied.
    // plaintext: readable only WITHOUT a key.
    // unreadable: never readable — a wrong-key or corrupt file.
    const readOk = () => {
      if (behaviour === 'encrypted') return keyed;
      if (behaviour === 'plaintext') return !keyed;
      return false;
    };
    return {
      execAsync: async (sql) => { if (/PRAGMA key/i.test(sql)) keyed = true; },
      getAllAsync: async (sql) => {
        if (!readOk()) throw new Error('file is not a database');
        if (/type = 'table'/.test(sql)) return [{ n: file.tables ?? 12 }];
        return [{ 'count(*)': 1 }];
      },
      getFirstAsync: async (sql) => {
        if (!readOk()) throw new Error('file is not a database');
        if (/PRAGMA\s+cipher_version/i.test(String(sql))) {
          return keyed && behaviour === 'encrypted' ? { cipher_version: 'test-sqlcipher-4' } : null;
        }
        return { user_version: 71 };
      },
      closeAsync: async () => {},
    };
  }),
}), { virtual: true });

jest.mock('../dbCrypto', () => ({
  getOrCreateDbKey: jest.fn(async () => ({ key: 'test-key', status: 'ok' })),
  attestSqlCipherConnection: jest.fn(async (db, key) => {
    await db.execAsync(`PRAGMA key = '${key}'`);
    const row = await db.getFirstAsync('PRAGMA cipher_version');
    return { applied: Boolean(row?.cipher_version), cipherVersion: row?.cipher_version ?? null };
  }),
}));

jest.mock('../database', () => ({ checkpointWal: jest.fn(async () => {}) }));

const mockWarn = jest.fn();
jest.mock('../errorLog', () => ({ logWarn: (...a) => mockWarn(...a), logError: jest.fn(), logInfo: jest.fn() }));

const {
  verifySnapshot, restoreSnapshot, snapshotBeforeMigration,
  parseSnapshotName, labelForSnapshot, sortSnapshotNames, listSnapshots,
} = require('../dbSnapshot');

const DB_PATH = '/doc/SQLite/volyume.db';
const SNAP = '/doc/snapshots/';

function file(content, size = 40960, tables = 12) { return { content, size, tables }; }

beforeEach(() => {
  mockWarn.mockClear();
  mockOpenable = { good: 'encrypted', plain: 'plaintext', wrongkey: 'unreadable', garbage: 'unreadable' };
  mockFiles = { [DB_PATH]: file('good') };
});

describe('verifySnapshot answers the question a size check cannot', () => {
  test('a healthy encrypted snapshot verifies, and reports how it opened', async () => {
    mockFiles[`${SNAP}s.db`] = file('good');
    await expect(verifySnapshot(`${SNAP}s.db`)).resolves.toMatchObject({
      ok: true, mode: 'encrypted', userVersion: 71,
    });
  });

  test('a snapshot encrypted under a key we no longer hold is refused', async () => {
    // The whole reason a size check is not enough: right size, right header,
    // unopenable. And it is the exact case where a backup is reached for.
    mockFiles[`${SNAP}s.db`] = file('wrongkey');
    await expect(verifySnapshot(`${SNAP}s.db`)).resolves.toMatchObject({
      ok: false, reason: 'unreadable',
    });
  });

  test('a plaintext snapshot is accepted, not treated as corrupt', async () => {
    // The app has a documented plaintext fallback and re-encrypts on the next
    // launch, so refusing these would be a false negative that costs a user
    // their only backup.
    mockFiles[`${SNAP}s.db`] = file('plain');
    await expect(verifySnapshot(`${SNAP}s.db`)).resolves.toMatchObject({
      ok: true, mode: 'plaintext',
    });
  });

  test('a truncated copy is refused before anything tries to open it', async () => {
    mockFiles[`${SNAP}s.db`] = file('good', 12);
    await expect(verifySnapshot(`${SNAP}s.db`)).resolves.toMatchObject({
      ok: false, reason: 'truncated',
    });
  });

  test('a missing file is refused', async () => {
    await expect(verifySnapshot(`${SNAP}gone.db`)).resolves.toMatchObject({
      ok: false, reason: 'missing',
    });
  });

  test('an openable file with no tables is refused', async () => {
    // It would restore "successfully" and leave the user staring at an empty
    // app, which is the failure this check exists to prevent.
    mockFiles[`${SNAP}s.db`] = file('good', 40960, 0);
    await expect(verifySnapshot(`${SNAP}s.db`)).resolves.toMatchObject({
      ok: false, reason: 'empty',
    });
  });

  test('it never throws, whatever it is handed', async () => {
    await expect(verifySnapshot(null)).resolves.toMatchObject({ ok: false });
    await expect(verifySnapshot(undefined)).resolves.toMatchObject({ ok: false });
  });

  test('the probe copy is cleaned up, including its WAL sidecars', async () => {
    mockFiles[`${SNAP}s.db`] = file('good');
    await verifySnapshot(`${SNAP}s.db`);
    const leftovers = Object.keys(mockFiles).filter((f) => f.includes('volyume-verify-'));
    expect(leftovers).toEqual([]);
  });

  test('it probes a copy under a unique name, never the snapshot itself', async () => {
    // expo-sqlite hands back the same ref-counted connection for every open of
    // one path, so a fixed probe name would inherit the previous probe's
    // PRAGMA key state and answer about the wrong file.
    const SQLite = require('expo-sqlite');
    SQLite.openDatabaseAsync.mockClear();
    mockFiles[`${SNAP}a.db`] = file('good');
    mockFiles[`${SNAP}b.db`] = file('good');
    await verifySnapshot(`${SNAP}a.db`);
    await verifySnapshot(`${SNAP}b.db`);
    const names = SQLite.openDatabaseAsync.mock.calls.map((c) => c[0]);
    expect(names.every((n) => n.startsWith('volyume-verify-'))).toBe(true);
    expect(new Set(names).size).toBe(names.length);
  });
});

describe('a snapshot that cannot be read back is never offered as one', () => {
  test('a bad copy is deleted rather than listed', async () => {
    mockFiles[DB_PATH] = file('garbage');
    await snapshotBeforeMigration(70, 71);
    const kept = Object.keys(mockFiles).filter((f) => f.startsWith(SNAP));
    expect(kept).toEqual([]);
  });

  test('the failure is logged, so a user with no backups is not a silent state', async () => {
    mockFiles[DB_PATH] = file('garbage');
    await snapshotBeforeMigration(70, 71);
    expect(mockWarn).toHaveBeenCalledWith('database.snapshot', expect.stringMatching(/unusable/));
  });

  test('a good copy is kept and listed', async () => {
    await snapshotBeforeMigration(70, 71);
    const kept = Object.keys(mockFiles).filter((f) => f.startsWith(SNAP));
    expect(kept).toHaveLength(1);
    expect(kept[0]).toMatch(/volyume_v70_to_v71_\d+\.db$/);
    await expect(listSnapshots()).resolves.toHaveLength(1);
  });

  test('a snapshot failure still never blocks the migration', async () => {
    // The original contract, and it must survive the new strictness: a full
    // disk must not brick an update.
    mockFiles[DB_PATH] = file('garbage');
    await expect(snapshotBeforeMigration(70, 71)).resolves.toBeUndefined();
  });
});

describe('restore refuses to destroy the live database for an unusable snapshot', () => {
  test('an unreadable snapshot is refused, and the live database is untouched', async () => {
    mockFiles[`${SNAP}bad.db`] = file('wrongkey');
    const before = { ...mockFiles[DB_PATH] };
    await expect(restoreSnapshot(`${SNAP}bad.db`)).rejects.toMatchObject({
      code: 'SNAPSHOT_UNUSABLE', reason: 'unreadable',
    });
    expect(mockFiles[DB_PATH]).toEqual(before);
  });

  test('a truncated snapshot is refused the same way', async () => {
    mockFiles[`${SNAP}bad.db`] = file('good', 8);
    await expect(restoreSnapshot(`${SNAP}bad.db`)).rejects.toMatchObject({ reason: 'truncated' });
    expect(mockFiles[DB_PATH].content).toBe('good');
  });

  test('a good snapshot restores, and the stale WAL sidecars go with it', async () => {
    // A surviving -wal replays pre-restore commits over the restored file and
    // silently undoes the restore.
    mockFiles[`${SNAP}ok.db`] = file('plain');
    mockFiles[`${DB_PATH}-wal`] = file('stale');
    mockFiles[`${DB_PATH}-shm`] = file('stale');
    await restoreSnapshot(`${SNAP}ok.db`);
    expect(mockFiles[DB_PATH].content).toBe('plain');
    expect(mockFiles[`${DB_PATH}-wal`]).toBeUndefined();
    expect(mockFiles[`${DB_PATH}-shm`]).toBeUndefined();
  });

  test('the pre-restore state is copied aside first, so a mistake is reversible', async () => {
    mockFiles[`${SNAP}ok.db`] = file('plain');
    await restoreSnapshot(`${SNAP}ok.db`);
    const pre = Object.keys(mockFiles).filter((f) => /volyume_prerestore_\d+\.db$/.test(f));
    expect(pre).toHaveLength(1);
    expect(mockFiles[pre[0]].content).toBe('good');   // the data as it was
  });

  test('a failed pre-restore copy blocks restore and preserves the live database', async () => {
    // Targeted at the pre-restore destination specifically: verification copies
    // first, so a blanket "fail the next copy" would hit the wrong call and
    // prove nothing.
    const FS = require('expo-file-system/legacy');
    mockFiles[`${SNAP}ok.db`] = file('plain');
    const real = FS.copyAsync.getMockImplementation();
    FS.copyAsync.mockImplementation(async (args) => {
      if (/volyume_prerestore_/.test(args.to)) throw new Error('disk full');
      return real(args);
    });
    try {
      await expect(restoreSnapshot(`${SNAP}ok.db`)).rejects.toThrow('disk full');
      expect(mockFiles[DB_PATH].content).toBe('good');
    } finally {
      FS.copyAsync.mockImplementation(real);
    }
  });
});

describe('the pre-restore copy is a first-class snapshot, not an orphan', () => {
  test('its name parses, so it is listed rather than invisible', () => {
    expect(parseSnapshotName('volyume_prerestore_1756300000000.db'))
      .toEqual({ kind: 'prerestore', createdAt: 1756300000000 });
  });

  test('it is therefore prunable — sortSnapshotNames drops what it cannot parse', () => {
    // An unparsed name would be immortal: prune only ever deletes from the
    // sorted list, so a file it cannot parse would accumulate forever.
    const names = ['volyume_prerestore_2.db', 'volyume_accountswitch_1.db'];
    expect(sortSnapshotNames(names)).toEqual(names);
  });

  test('it is labelled for a human, not left as a filename', () => {
    expect(labelForSnapshot(parseSnapshotName('volyume_prerestore_1756300000000.db')))
      .toMatch(/Before restoring a snapshot/);
  });
});
