/**
 * Snapshot importer fast path (audit PR-1). The version flag must be
 * checked with a single AsyncStorage read BEFORE any file I/O: when the
 * stored imported-version already matches the bundled snapshot's
 * version, the 6.3 MB readAsStringAsync + JSON.parse must never run.
 * When it differs, the full import path proceeds as before.
 */

// The .dat assets resolve to numeric Metro asset ids in the app; jest has
// no transformer for them, so stub the modules with numbers.
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
}));

const AsyncStorage = require('@react-native-async-storage/async-storage').default;
const FileSystem = require('expo-file-system/legacy');
const { Asset } = require('expo-asset');
const {
  importOffSnapshotIfNeeded,
  importCofidSnapshotIfNeeded,
  OFF_SNAPSHOT_VERSION,
  COFID_SNAPSHOT_VERSION,
} = require('../seed');

const OFF_FLAG_KEY = '@volyume_off_snapshot_loaded_v1';
const COFID_FLAG_KEY = '@volyume_cofid_snapshot_loaded_v1';

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
});

test('OFF: stored version matches -> no file read, no asset load', async () => {
  await AsyncStorage.setItem(OFF_FLAG_KEY, OFF_SNAPSHOT_VERSION);
  const res = await importOffSnapshotIfNeeded();
  expect(res).toEqual({ ok: true, reason: 'already_loaded', importedRows: 0 });
  expect(FileSystem.readAsStringAsync).not.toHaveBeenCalled();
  expect(Asset.fromModule).not.toHaveBeenCalled();
});

test('CoFID: stored version matches -> no file read, no asset load', async () => {
  await AsyncStorage.setItem(COFID_FLAG_KEY, COFID_SNAPSHOT_VERSION);
  const res = await importCofidSnapshotIfNeeded();
  expect(res).toEqual({ ok: true, reason: 'already_loaded', importedRows: 0 });
  expect(FileSystem.readAsStringAsync).not.toHaveBeenCalled();
  expect(Asset.fromModule).not.toHaveBeenCalled();
});

test('OFF: stored version differs -> import path proceeds and flag is updated', async () => {
  await AsyncStorage.setItem(OFF_FLAG_KEY, 'some-older-version');
  FileSystem.readAsStringAsync.mockResolvedValueOnce(JSON.stringify({
    _meta: { generatedAt: OFF_SNAPSHOT_VERSION },
    rows: [{
      ean: '5012345678900', name: 'Test Bar', brand: 'Test',
      serving_g: 50, kcal_100g: 400, protein_100g: 20,
      carbs_100g: 40, fat_100g: 15,
    }],
  }));
  mockDb = {
    execAsync: jest.fn(async () => {}),
    runAsync: jest.fn(async () => {}),
  };
  const res = await importOffSnapshotIfNeeded();
  expect(FileSystem.readAsStringAsync).toHaveBeenCalledTimes(1);
  expect(res.ok).toBe(true);
  expect(res.reason).toBe('imported');
  expect(res.importedRows).toBe(1);
  expect(mockDb.runAsync).toHaveBeenCalledTimes(1);
  expect(await AsyncStorage.getItem(OFF_FLAG_KEY)).toBe(OFF_SNAPSHOT_VERSION);
});

test('no stored version (first launch) -> import path proceeds', async () => {
  FileSystem.readAsStringAsync.mockResolvedValueOnce(JSON.stringify({
    _meta: { generatedAt: OFF_SNAPSHOT_VERSION },
    rows: [{
      ean: '5000000000001', name: 'Oat Thing',
      kcal_100g: 350, protein_100g: 11, carbs_100g: 60, fat_100g: 7,
    }],
  }));
  mockDb = {
    execAsync: jest.fn(async () => {}),
    runAsync: jest.fn(async () => {}),
  };
  const res = await importOffSnapshotIfNeeded();
  expect(FileSystem.readAsStringAsync).toHaveBeenCalledTimes(1);
  expect(res.reason).toBe('imported');
  expect(res.importedRows).toBe(1);
});

// Guard against the constants drifting from the real bundled assets: parse
// only the head of each .dat (the _meta object is written first by the
// build scripts) and compare generatedAt. If this fails, the snapshot was
// regenerated without bumping the constant in seed.js — the app stays
// correct (the post-parse check still governs imports) but the startup
// fast path is forfeited until the constant is updated.
test('version constants match the bundled snapshot assets', () => {
  const fs = require('fs');
  const path = require('path');
  const head = (file) => {
    const fd = fs.openSync(path.join(__dirname, '../../../../assets/seed', file), 'r');
    const buf = new Uint8Array(4096);
    fs.readSync(fd, buf, 0, 4096, 0);
    fs.closeSync(fd);
    const text = new TextDecoder('utf-8').decode(buf);
    const m = text.match(/"generatedAt"\s*:\s*"([^"]+)"/);
    return m ? m[1] : null;
  };
  expect(head('off_uk_snapshot.dat')).toBe(OFF_SNAPSHOT_VERSION);
  expect(head('cofid_uk.dat')).toBe(COFID_SNAPSHOT_VERSION);
});
