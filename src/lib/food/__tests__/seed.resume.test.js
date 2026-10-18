/**
 * Snapshot import resumes where it stopped (Android spinner report,
 * 2026-10-18). The imported-version flag is written only after the last
 * chunk, so an import cut short by the app closing used to begin again at
 * row 0 on every launch: a phone closed and reopened often enough never
 * finished it, and kept the shared database thread busy each time. What this
 * suite pins:
 *   - progress is recorded after every chunk, for the snapshot version;
 *   - a run resumes at the recorded chunk for the SAME version only;
 *   - a marker from another version, or out of bounds, starts at row 0;
 *   - a finished import sets the flag and clears the marker;
 *   - the local-database reset clears the marker with the flags.
 */

jest.mock('../../../../assets/seed/off_uk_snapshot.dat', () => 101, { virtual: false });
jest.mock('../../../../assets/seed/cofid_uk.dat', () => 102, { virtual: false });

jest.mock('expo-asset', () => ({
  Asset: {
    fromModule: jest.fn(() => ({
      downloadAsync: jest.fn(async () => {}),
      localUri: 'file:///seed/snapshot.dat',
    })),
  },
}));

jest.mock('../../errorLog', () => ({
  logInfo: jest.fn(),
  logWarn: jest.fn(),
  logError: jest.fn(),
}));

let mockDb;
jest.mock('../../database', () => ({
  db: jest.fn(async () => mockDb),
  uid: jest.fn(() => 'test-id'),
  // The real queue returns the task's own result (database.js R2-13).
  runInTransaction: async (d, task) => task(),
}));

const fs = require('fs');
const path = require('path');
const AsyncStorage = require('@react-native-async-storage/async-storage').default;
const FileSystem = require('expo-file-system/legacy');
const {
  importOffSnapshotIfNeeded,
  OFF_SNAPSHOT_FLAG_KEY,
  OFF_SNAPSHOT_PROGRESS_KEY,
  COFID_SNAPSHOT_PROGRESS_KEY,
} = require('../seed');

const VERSION = 'test-snapshot-v1';
const ROWS = 450; // three chunks of 200: 0-199, 200-399, 400-449

function snapshot(version = VERSION) {
  const rows = [];
  for (let i = 0; i < ROWS; i += 1) {
    rows.push({
      ean: `ean-${i}`, name: `Food ${i}`, brand: 'Test',
      serving_g: 50, kcal_100g: 400, protein_100g: 20, carbs_100g: 40, fat_100g: 15,
    });
  }
  return JSON.stringify({ _meta: { generatedAt: version }, rows });
}

function writtenEans() {
  return mockDb.runAsync.mock.calls.map((c) => c[1][2]);
}

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  mockDb = {
    runAsync: jest.fn(async () => ({ changes: 1 })),
  };
  FileSystem.readAsStringAsync.mockResolvedValue(snapshot());
});

test('a fresh run imports every row, records progress per chunk, then sets the flag and clears the marker', async () => {
  const realSetItem = AsyncStorage.setItem;
  const progressWrites = [];
  AsyncStorage.setItem = (k, v) => {
    if (k === OFF_SNAPSHOT_PROGRESS_KEY) progressWrites.push(JSON.parse(v));
    return realSetItem(k, v);
  };
  try {
    const res = await importOffSnapshotIfNeeded();
    expect(res.ok).toBe(true);
    expect(res.importedRows).toBe(ROWS);
    expect(writtenEans()[0]).toBe('ean-0');
  } finally {
    AsyncStorage.setItem = realSetItem;
  }
  expect(progressWrites).toEqual([
    { version: VERSION, next: 200 },
    { version: VERSION, next: 400 },
    { version: VERSION, next: 600 },
  ]);
  expect(await AsyncStorage.getItem(OFF_SNAPSHOT_FLAG_KEY)).toBe(VERSION);
  expect(await AsyncStorage.getItem(OFF_SNAPSHOT_PROGRESS_KEY)).toBeNull();
});

test('a run cut short resumes at the first chunk it had not committed', async () => {
  await AsyncStorage.setItem(OFF_SNAPSHOT_PROGRESS_KEY, JSON.stringify({ version: VERSION, next: 200 }));
  const res = await importOffSnapshotIfNeeded();
  expect(res.ok).toBe(true);
  expect(res.importedRows).toBe(ROWS - 200);
  const eans = writtenEans();
  expect(eans[0]).toBe('ean-200');
  expect(eans).not.toContain('ean-0');
  expect(eans).not.toContain('ean-199');
  expect(eans[eans.length - 1]).toBe(`ean-${ROWS - 1}`);
  expect(await AsyncStorage.getItem(OFF_SNAPSHOT_FLAG_KEY)).toBe(VERSION);
  expect(await AsyncStorage.getItem(OFF_SNAPSHOT_PROGRESS_KEY)).toBeNull();
});

test('a marker from another snapshot version is ignored: the new version imports from row 0', async () => {
  await AsyncStorage.setItem(OFF_SNAPSHOT_PROGRESS_KEY, JSON.stringify({ version: 'older-version', next: 400 }));
  const res = await importOffSnapshotIfNeeded();
  expect(res.importedRows).toBe(ROWS);
  expect(writtenEans()[0]).toBe('ean-0');
});

test('a marker out of bounds or off a chunk boundary is ignored', async () => {
  for (const next of [ROWS, 10000, 150, -200, 'x']) {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    await AsyncStorage.setItem(OFF_SNAPSHOT_PROGRESS_KEY, JSON.stringify({ version: VERSION, next }));
    const res = await importOffSnapshotIfNeeded();
    expect(res.importedRows).toBe(ROWS);
    expect(writtenEans()[0]).toBe('ean-0');
  }
});

test('an unreadable marker is ignored', async () => {
  await AsyncStorage.setItem(OFF_SNAPSHOT_PROGRESS_KEY, '{not json');
  const res = await importOffSnapshotIfNeeded();
  expect(res.importedRows).toBe(ROWS);
});

test('the local-database reset clears both progress markers with the flags', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', '..', 'localDbReset.js'), 'utf8');
  expect(src).toMatch(/foodSeed\.OFF_SNAPSHOT_PROGRESS_KEY,/);
  expect(src).toMatch(/foodSeed\.COFID_SNAPSHOT_PROGRESS_KEY,/);
  expect(COFID_SNAPSHOT_PROGRESS_KEY).not.toBe(OFF_SNAPSHOT_PROGRESS_KEY);
});
