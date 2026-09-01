/**
 * F-04 behavioral fault matrix for the real restore state machine.
 *
 * The filesystem fake preserves copy/move ordering and the SQLite fake opens
 * the bytes currently present at each path.  This catches unsafe continuation
 * after a failed safety copy, partial staging, promotion failure and every
 * durable journal phase without relying on source-string assertions.
 */

const mockFiles = new Map();
const mockFaults = { copy: null, move: null, mutateMove: null };
const mockDoc = '/doc/';
const LIVE = `${mockDoc}SQLite/volyume.db`;
const STAGE = `${mockDoc}SQLite/volyume-restore-stage.db`;
const ROLLBACK = `${mockDoc}SQLite/volyume-restore-rollback.db`;
const STATE = `${mockDoc}SQLite/volyume-restore-state.json`;
const SNAP = `${mockDoc}snapshots/volyume_v100_to_v101_1.db`;

const mockClone = (value) => JSON.parse(JSON.stringify(value));
const mockDatabaseFile = (id, extra = {}) => ({ id, size: 4096, tables: 5, userVersion: 100, ...extra });

jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: mockDoc,
  getInfoAsync: jest.fn(async (path) => {
    const value = mockFiles.get(path);
    return value ? { exists: true, size: value.size ?? String(value.text ?? '').length } : { exists: false };
  }),
  makeDirectoryAsync: jest.fn(async () => {}),
  copyAsync: jest.fn(async ({ from, to }) => {
    if (mockFaults.copy?.({ from, to, files: mockFiles })) throw new Error('injected copy failure');
    if (!mockFiles.has(from)) throw new Error(`missing source ${from}`);
    mockFiles.set(to, mockClone(mockFiles.get(from)));
  }),
  moveAsync: jest.fn(async ({ from, to }) => {
    if (mockFaults.move?.({ from, to, files: mockFiles })) throw new Error('injected move failure');
    if (!mockFiles.has(from)) throw new Error(`missing source ${from}`);
    const value = mockClone(mockFiles.get(from));
    if (mockFaults.mutateMove) mockFaults.mutateMove({ from, to, value });
    mockFiles.set(to, value);
    mockFiles.delete(from);
  }),
  deleteAsync: jest.fn(async (path) => { mockFiles.delete(path); }),
  writeAsStringAsync: jest.fn(async (path, text) => { mockFiles.set(path, { text, size: text.length }); }),
  readAsStringAsync: jest.fn(async (path) => {
    if (!mockFiles.has(path)) throw new Error(`missing ${path}`);
    return mockFiles.get(path).text;
  }),
  readDirectoryAsync: jest.fn(async (dir) => [...mockFiles.keys()]
    .filter((path) => path.startsWith(dir))
    .map((path) => path.slice(dir.length))
    .filter((name) => !name.includes('/'))),
}), { virtual: true });

jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn(async (name) => {
    const path = `${mockDoc}SQLite/${name}`;
    const value = mockFiles.get(path);
    if (!value) throw new Error(`missing sqlite file ${path}`);
    return {
      execAsync: jest.fn(async () => {}),
      getAllAsync: jest.fn(async (sql) => {
        if (value.corrupt) throw new Error('file is not a database');
        if (/WHERE type = 'table'/.test(sql)) return [{ n: value.tables ?? 0 }];
        return [{ n: value.tables ?? 0 }];
      }),
      getFirstAsync: jest.fn(async () => ({ user_version: value.userVersion ?? 0 })),
      closeAsync: jest.fn(async () => {}),
    };
  }),
}), { virtual: true });

jest.mock('../dbCrypto', () => ({
  getOrCreateDbKey: jest.fn(async () => ({ key: null })),
  attestSqlCipherConnection: jest.fn(async () => ({ applied: false, cipherVersion: null })),
}));

jest.mock('../errorLog', () => ({ logWarn: jest.fn() }));

const {
  restoreSnapshot,
  recoverInterruptedSnapshotRestore,
} = require('../dbSnapshot');

beforeEach(() => {
  mockFiles.clear();
  mockFiles.set(LIVE, mockDatabaseFile('original'));
  mockFiles.set(SNAP, mockDatabaseFile('candidate', { userVersion: 99 }));
  mockFaults.copy = null;
  mockFaults.move = null;
  mockFaults.mutateMove = null;
  jest.clearAllMocks();
});

test('pre-restore safety copy failure leaves live byte-for-byte untouched', async () => {
  mockFaults.copy = ({ to }) => to.startsWith(`${mockDoc}snapshots/volyume_prerestore_`);
  await expect(restoreSnapshot(SNAP)).rejects.toThrow(/copy failure/);
  expect(mockFiles.get(LIVE).id).toBe('original');
  expect(mockFiles.has(ROLLBACK)).toBe(false);
});

test('partial/failed candidate staging never touches live', async () => {
  mockFaults.copy = ({ to, files: fs }) => {
    if (to !== STAGE) return false;
    fs.set(to, mockDatabaseFile('partial', { corrupt: true }));
    return true;
  };
  await expect(restoreSnapshot(SNAP)).rejects.toThrow(/copy failure/);
  expect(mockFiles.get(LIVE).id).toBe('original');
  expect(mockFiles.has(STATE)).toBe(false);
});

test('promotion failure rolls the verified original back into place', async () => {
  mockFaults.move = ({ from, to }) => from === STAGE && to === LIVE;
  await expect(restoreSnapshot(SNAP)).rejects.toThrow(/move failure/);
  expect(mockFiles.get(LIVE).id).toBe('original');
  expect(mockFiles.has(ROLLBACK)).toBe(false);
  expect(mockFiles.has(STATE)).toBe(false);
});

test('failed verification of promoted bytes restores the original', async () => {
  mockFaults.mutateMove = ({ from, to, value }) => {
    if (from === STAGE && to === LIVE) value.corrupt = true;
  };
  await expect(restoreSnapshot(SNAP)).rejects.toThrow(/promoted snapshot is unusable/);
  expect(mockFiles.get(LIVE).id).toBe('original');
});

test('rollback move failure preserves the rollback and a second launch repairs it', async () => {
  let promotionFailed = false;
  let rollbackFailed = false;
  mockFaults.move = ({ from, to }) => {
    if (from === STAGE && to === LIVE && !promotionFailed) { promotionFailed = true; return true; }
    if (from === ROLLBACK && to === LIVE && !rollbackFailed) { rollbackFailed = true; return true; }
    return false;
  };
  await expect(restoreSnapshot(SNAP)).rejects.toMatchObject({ code: 'SNAPSHOT_ROLLBACK_FAILED' });
  expect(mockFiles.get(ROLLBACK).id).toBe('original');
  expect(mockFiles.has(STATE)).toBe(true);

  mockFaults.move = null;
  await expect(recoverInterruptedSnapshotRestore()).resolves.toBe(true);
  expect(mockFiles.get(LIVE).id).toBe('original');
  expect(mockFiles.has(STATE)).toBe(false);
});

test.each([
  ['prepared', true, false],
  ['live_moved', false, true],
  ['promoted', true, true],
])('process death in %s phase converges to original live', async (phase, livePresent, rollbackPresent) => {
  const preRestore = `${mockDoc}snapshots/volyume_prerestore_10.db`;
  mockFiles.set(preRestore, mockDatabaseFile('original'));
  if (livePresent) mockFiles.set(LIVE, phase === 'prepared' ? mockDatabaseFile('original') : mockDatabaseFile('candidate'));
  else mockFiles.delete(LIVE);
  if (rollbackPresent) mockFiles.set(ROLLBACK, mockDatabaseFile('original'));
  mockFiles.set(STAGE, mockDatabaseFile('candidate'));
  const text = JSON.stringify({ version: 1, phase, preRestore });
  mockFiles.set(STATE, { text, size: text.length });

  await expect(recoverInterruptedSnapshotRestore()).resolves.toBe(true);
  expect(mockFiles.get(LIVE).id).toBe('original');
  expect(mockFiles.has(ROLLBACK)).toBe(false);
  expect(mockFiles.has(STATE)).toBe(false);
});

test('verified phase with cleaned rollback keeps the verified promoted live', async () => {
  const preRestore = `${mockDoc}snapshots/volyume_prerestore_10.db`;
  mockFiles.set(preRestore, mockDatabaseFile('original'));
  mockFiles.set(LIVE, mockDatabaseFile('candidate'));
  const text = JSON.stringify({ version: 1, phase: 'verified', preRestore });
  mockFiles.set(STATE, { text, size: text.length });

  await expect(recoverInterruptedSnapshotRestore()).resolves.toBe(true);
  expect(mockFiles.get(LIVE).id).toBe('candidate');
});
