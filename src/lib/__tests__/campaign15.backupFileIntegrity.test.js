/**
 * campaign15.backupFileIntegrity.test.js — Campaign 15 job 5 (T-17).
 *
 * What this suite pins and why:
 *
 * A Volyume backup is JSON. It carries SQLite rows and preferences, and it
 * deliberately does NOT carry the private image files: progress photos and
 * avatars live in the app's own document directory and never travel. That
 * is a product decision about privacy and storage, and this campaign does
 * not reverse it.
 *
 * What it does fix is the consequence. Restoring that JSON onto a clean
 * install wrote rows whose file references pointed at nothing: a scan
 * asset row with a dead uri, a photo-meta row for a file that is not
 * there, a custom food whose photo_url resolves to nothing, a profile blob
 * with a dead avatarUri. The user got broken thumbnails and taps that open
 * nothing, which reads as corruption rather than as the documented
 * local-only behaviour.
 *
 * THE LAW: a restore must never create a reference to a file that does not
 * exist. Where the rest of a row stands on its own, the reference is
 * cleared and the row is kept. Where the row exists only to point at the
 * file, the row is not restored. No placeholder file is ever created, and
 * nothing reports an image as restored when it was not.
 *
 * The correct outcome for the image files themselves is EXPECTED LOCAL
 * LOSS, not a restore failure, so the numeric scan history the backup does
 * carry survives with no image affordance behind it.
 */

const fs = require('fs');
const path = require('path');

// The filesystem this restore is landing on: a clean install that holds
// exactly one of the referenced files, so the "keeps what really exists"
// half is proved alongside the "drops what does not".
const mockPresent = new Set();
let mockDeleteFailure = false;
jest.mock('expo-file-system/legacy', () => ({
  getInfoAsync: jest.fn(async uri => ({ exists: mockPresent.has(uri) })),
  deleteAsync: jest.fn(async () => { if (mockDeleteFailure) throw new Error('delete failed'); }),
  readAsStringAsync: jest.fn(),
  writeAsStringAsync: jest.fn(),
  cacheDirectory: 'file:///cache/',
  documentDirectory: 'file:///docs/',
  EncodingType: { UTF8: 'utf8' },
}));
jest.mock('expo-sharing', () => ({ isAvailableAsync: async () => false, shareAsync: jest.fn() }));
jest.mock('expo-document-picker', () => ({ getDocumentAsync: jest.fn() }));
jest.mock('../errorLog', () => ({ logInfo: jest.fn(), logError: jest.fn(), logWarn: jest.fn() }));

const mockPrefs = new Map();
let mockPrefWriteFailure = false;
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getAllKeys: jest.fn(async () => [...mockPrefs.keys()]),
    multiGet: jest.fn(async ks => ks.map(k => [k, mockPrefs.get(k) ?? null])),
    multiSet: jest.fn(async es => {
      for (const [k, v] of es) {
        mockPrefs.set(k, String(v));
        if (mockPrefWriteFailure) {
          mockPrefWriteFailure = false;
          throw new Error('preference write failed');
        }
      }
    }),
    multiRemove: jest.fn(async ks => { for (const k of ks) mockPrefs.delete(k); }),
  },
}));

// Capture what the restore actually writes, so the assertions are about
// the rows that reach the database rather than about the file on disk.
const mockState = { restored: null, restoreFailure: null };
jest.mock('../database', () => ({
  BACKUP_TABLES: ['progress_scan_sessions', 'progress_scan_assets', 'progress_photo_meta', 'custom_foods'],
  dumpAllTables: jest.fn(async () => ({ schemaVersion: 1, tables: {} })),
  restoreAllTables: jest.fn(async (dump) => {
    if (mockState.restoreFailure) throw mockState.restoreFailure;
    mockState.restored = dump?.tables ?? null;
  }),
}));
jest.mock('../progressPhotos', () => ({
  photoDir: uid => (uid ? `file:///docs/photos/users/${uid}/` : 'file:///docs/photos/'),
}));

const DocumentPicker = require('expo-document-picker');
const FileSystem = require('expo-file-system/legacy');
const {
  importBackup, MAX_BACKUP_BYTES, assertBackupShape, removeTemporaryBackupFile,
} = require('../dataBackup');

const U = 'user-1';
const DIR = `file:///docs/photos/users/${U}/`;
const KEPT_PHOTO = `${DIR}1000.jpg`;   // the one file that survived
const GONE_PHOTO = `${DIR}2000.jpg`;   // referenced, absent

function backupFile(overrides = {}) {
  return {
    format: 'volyume-backup',
    formatVersion: 1,
    schemaVersion: 1,
    exportedAt: '2026-08-01T00:00:00.000Z',
    sqlite: {
      progress_scan_sessions: [
        { id: 's-1', user_id: U, captured_at: 1, estimated_body_fat: 18.2, signals_json: '{}' },
        { id: 's-2', user_id: U, captured_at: 2, estimated_body_fat: 17.4, signals_json: '{}' },
      ],
      progress_scan_assets: [
        { id: 'a-kept', scan_id: 's-1', user_id: U, pose: 'front', photo_name: '1000.jpg', uri: KEPT_PHOTO, taken_at: 1 },
        { id: 'a-gone', scan_id: 's-2', user_id: U, pose: 'front', photo_name: '2000.jpg', uri: GONE_PHOTO, taken_at: 2 },
      ],
      progress_photo_meta: [
        { user_id: U, name: '1000.jpg', taken_at: 1, pose: 'front', note: 'kept' },
        { user_id: U, name: '2000.jpg', taken_at: 2, pose: 'front', note: 'gone' },
      ],
      custom_foods: [
        { id: 'f-1', user_id: U, name: 'Porridge', kcal: 350, photo_url: GONE_PHOTO },
        { id: 'f-2', user_id: U, name: 'Chicken', kcal: 220, photo_url: 'https://cdn.example/img.jpg' },
        { id: 'f-3', user_id: U, name: 'Rice', kcal: 190, photo_url: null },
      ],
      ...(overrides.sqlite ?? {}),
    },
    prefs: {
      [`@volyume_user_profile_${U}`]: JSON.stringify({ firstName: 'Sam', avatarUri: GONE_PHOTO }),
      '@volyume_units': 'kg',
      ...(overrides.prefs ?? {}),
    },
  };
}

async function runImport(file = backupFile(), assetOverrides = {}) {
  DocumentPicker.getDocumentAsync.mockResolvedValue({
    canceled: false, assets: [{ uri: 'file:///cache/b.json', ...assetOverrides }],
  });
  FileSystem.readAsStringAsync.mockResolvedValue(JSON.stringify(file));
  return importBackup(U);
}

beforeEach(() => {
  mockState.restored = null;
  mockState.restoreFailure = null;
  mockDeleteFailure = false;
  mockPrefWriteFailure = false;
  mockPrefs.clear();
  mockPresent.clear();
  mockPresent.add(KEPT_PHOTO);        // only this one is really on the device
  jest.clearAllMocks();
  // clearAllMocks does not undo a mockRejectedValue, so the default probe is
  // re-installed here; otherwise the fail-closed case below would leak into
  // every test after it and make them pass for the wrong reason.
  FileSystem.getInfoAsync.mockImplementation(async uri => ({ exists: mockPresent.has(uri) }));
});

describe('hostile backup ownership and resource limits', () => {
  test('a row for another account rejects the whole transaction', async () => {
    const file = backupFile();
    file.sqlite.custom_foods[0].user_id = 'attacker';
    await expect(runImport(file)).rejects.toThrow(/different account/i);
    expect(mockState.restored).toBeNull();
  });

  test('v2 owner binding rejects a backup labelled for another account', async () => {
    const file = backupFile({});
    file.formatVersion = 2;
    file.ownerUserId = 'attacker';
    await expect(runImport(file)).rejects.toThrow(/different account/i);
    expect(mockState.restored).toBeNull();
  });

  test('v2 owner binding rejects a missing owner marker', async () => {
    const file = backupFile();
    file.formatVersion = 2;
    await expect(runImport(file)).rejects.toThrow(/different account/i);
    expect(mockState.restored).toBeNull();
  });

  test('unknown tables and duplicate record ids fail before restore', async () => {
    const unknown = backupFile();
    unknown.sqlite.attacker_table = [];
    await expect(runImport(unknown)).rejects.toThrow(/unsupported table shape/i);

    const duplicate = backupFile();
    duplicate.sqlite.custom_foods[1].id = duplicate.sqlite.custom_foods[0].id;
    await expect(runImport(duplicate)).rejects.toThrow(/duplicate or invalid/i);
    expect(mockState.restored).toBeNull();
  });

  test.each([
    ['forbidden control preference', '@volyume_auth_token', 'secret'],
    ['entitlement preference', '@volyume_tier', 'pro'],
    ['foreign profile', '@volyume_user_profile_attacker', '{}'],
  ])('%s is rejected instead of silently ignored', async (_label, key, value) => {
    const file = backupFile();
    file.prefs[key] = value;
    await expect(runImport(file)).rejects.toThrow(/preferences|different account/i);
    expect(mockState.restored).toBeNull();
  });

  test('nested row values and malformed profile JSON are inadmissible', async () => {
    const nested = backupFile();
    nested.sqlite.custom_foods[0].payload = { nested: true };
    await expect(runImport(nested)).rejects.toThrow(/record shape/i);

    const malformed = backupFile();
    malformed.prefs[`@volyume_user_profile_${U}`] = '{nope';
    await expect(runImport(malformed)).rejects.toThrow(/malformed profile/i);
    expect(mockState.restored).toBeNull();
  });

  test('declared oversized files are refused before the whole file is read', async () => {
    await expect(runImport(backupFile(), { size: MAX_BACKUP_BYTES + 1 })).rejects.toThrow(/too large/i);
    expect(FileSystem.readAsStringAsync).not.toHaveBeenCalled();
  });

  test('actual file size defeats a lying small declared size', async () => {
    FileSystem.getInfoAsync.mockImplementation(async uri => (uri.endsWith('/b.json')
      ? { exists: true, size: MAX_BACKUP_BYTES + 1 }
      : { exists: mockPresent.has(uri) }));
    await expect(runImport(backupFile(), { size: 1 })).rejects.toThrow(/too large/i);
    expect(FileSystem.readAsStringAsync).not.toHaveBeenCalled();
  });

  test('a traversal filename and app-private URI are dropped without probing the URI', async () => {
    const dbUri = 'file:///docs/SQLite/volyume.db';
    mockPresent.add(dbUri);
    const file = backupFile();
    file.sqlite.progress_scan_assets = [{
      id: 'hostile', scan_id: 's-1', user_id: U, pose: 'front',
      photo_name: '../../SQLite/volyume.db', uri: dbUri, taken_at: 1,
    }];
    const result = await runImport(file);
    expect(mockState.restored.progress_scan_assets).toEqual([]);
    expect(result.missingFiles.progress_scan_assets).toBe(1);
    expect(FileSystem.getInfoAsync).not.toHaveBeenCalledWith(dbUri);
  });
});

describe('C15-5 a restore leaves no dangling file reference (19)', () => {
  test('a scan asset whose photo is absent is not restored at all', async () => {
    await runImport();
    const ids = mockState.restored.progress_scan_assets.map(r => r.id);
    expect(ids).toEqual(['a-kept']);
  });

  test('a photo-meta row for a missing file is not restored', async () => {
    await runImport();
    expect(mockState.restored.progress_photo_meta.map(r => r.name)).toEqual(['1000.jpg']);
  });

  test('a custom food keeps its row but loses only the dead photo reference', async () => {
    await runImport();
    const byId = Object.fromEntries(mockState.restored.custom_foods.map(r => [r.id, r]));
    expect(Object.keys(byId).sort()).toEqual(['f-1', 'f-2', 'f-3']);
    expect(byId['f-1'].photo_url).toBeNull();          // cleared, row kept
    expect(byId['f-1'].name).toBe('Porridge');
    expect(byId['f-2'].photo_url).toBe('https://cdn.example/img.jpg'); // remote, untouched
    expect(byId['f-3'].photo_url).toBeNull();
  });

  test('a profile avatar pointing at a missing file is cleared', async () => {
    await runImport();
    const blob = JSON.parse(mockPrefs.get(`@volyume_user_profile_${U}`));
    expect(blob.avatarUri).toBeNull();
    expect(blob.firstName).toBe('Sam');                // the rest survives
  });

  test('NOTHING that reached the database still points at an absent file', async () => {
    // The sweep that would catch a column nobody thought about: every
    // string value in every restored row that looks like a local file must
    // resolve on this device.
    await runImport();
    const dangling = [];
    for (const [table, rows] of Object.entries(mockState.restored)) {
      for (const row of rows) {
        for (const [col, value] of Object.entries(row)) {
          if (typeof value !== 'string') continue;
          const isLocal = value.startsWith('file://') || value.startsWith('content://');
          if (isLocal && !mockPresent.has(value)) dangling.push(`${table}.${col}=${value}`);
        }
      }
    }
    expect(dangling).toEqual([]);
    for (const [key, value] of mockPrefs.entries()) {
      expect(String(value)).not.toContain(GONE_PHOTO);
      expect(key).toBeTruthy();
    }
  });
});

describe('C15-5 useful image-independent metadata survives (20)', () => {
  test('the numeric scan history is kept in full, with no image behind it', async () => {
    // A scan session carries the measurements and estimates the user cares
    // about and holds no file reference of its own. Dropping it because
    // its photo is gone would throw away the part of the history that is
    // still true.
    await runImport();
    expect(mockState.restored.progress_scan_sessions.map(r => r.id)).toEqual(['s-1', 's-2']);
    expect(mockState.restored.progress_scan_sessions[1].estimated_body_fat).toBe(17.4);
    // ...and s-2's asset is gone, so no image affordance is offered for it.
    expect(mockState.restored.progress_scan_assets.some(r => r.scan_id === 's-2')).toBe(false);
  });

  test('a file that IS present is restored untouched', async () => {
    await runImport();
    const kept = mockState.restored.progress_scan_assets.find(r => r.id === 'a-kept');
    expect(kept.uri).toBe(KEPT_PHOTO);
    expect(kept.pose).toBe('front');
  });
});

describe('C15-5 the restore never claims an image came back (21)', () => {
  test('no placeholder file is written, ever', async () => {
    await runImport();
    expect(FileSystem.writeAsStringAsync).not.toHaveBeenCalled();
  });

  test('the reported counts describe what was restored, not what the file held', async () => {
    const result = await runImport();
    expect(result.counts.progress_scan_assets).toBe(1);   // not 2
    expect(result.counts.progress_photo_meta).toBe(1);    // not 2
    expect(result.counts.progress_scan_sessions).toBe(2);
  });

  test('what was dropped is reported plainly rather than passed over', async () => {
    const result = await runImport();
    expect(result.missingFiles.progress_scan_assets).toBe(1);
    expect(result.missingFiles.progress_photo_meta).toBe(1);
    expect(result.missingFiles.custom_foods_photo_url).toBe(1);
    expect(result.missingFiles.profile_avatar_uri).toBe(1);
  });

  test('image files are still never carried BY a backup (the local-only promise)', () => {
    // Expected local loss, not a restore failure. If a backup ever started
    // embedding photo bytes, that would be a privacy and storage decision,
    // not a bug fix, and this is where it would be noticed.
    const src = fs.readFileSync(path.resolve(__dirname, '../dataBackup.js'), 'utf8');
    const exportFn = src.slice(src.indexOf('export async function exportBackup'));
    const body = exportFn.slice(0, exportFn.indexOf('\n}\n'));
    expect(body).not.toMatch(/readAsStringAsync|EncodingType\.Base64|photoDir/);
  });
});

describe('C15-5 the same law covers every reference this path can restore (22)', () => {
  test('an unreadable file counts as absent, so the check fails closed', async () => {
    FileSystem.getInfoAsync.mockImplementation(async uri => {
      if (uri.endsWith('/b.json')) return { exists: true, size: 1000 };
      throw new Error('EACCES');
    });
    await runImport();
    expect(mockState.restored.progress_scan_assets).toEqual([]);
    expect(mockState.restored.progress_photo_meta).toEqual([]);
    expect(mockState.restored.custom_foods.every(r => r.photo_url == null
      || r.photo_url.startsWith('https://'))).toBe(true);
  });

  test('a relocated file is re-pointed rather than thrown away', async () => {
    // An iOS container path changes between installs, so a stored absolute
    // uri can be dead while the very same photo sits in this user's own
    // directory. Re-pointing is scoped to the row's own user_id, so it can
    // never resolve across accounts.
    mockPresent.clear();
    mockPresent.add(`${DIR}2000.jpg`);
    const file = backupFile();
    file.sqlite.progress_scan_assets = [{
      id: 'a-moved', scan_id: 's-2', user_id: U, pose: 'front',
      photo_name: '2000.jpg', uri: 'file:///OLD-CONTAINER/photos/2000.jpg', taken_at: 2,
    }];
    await runImport(file);
    expect(mockState.restored.progress_scan_assets).toHaveLength(1);
    expect(mockState.restored.progress_scan_assets[0].uri).toBe(`${DIR}2000.jpg`);
  });

  test('a backup with no file references at all restores unchanged', async () => {
    const file = backupFile();
    file.sqlite.progress_scan_assets = [];
    file.sqlite.progress_photo_meta = [];
    file.sqlite.custom_foods = [{ id: 'f-9', user_id: U, name: 'Oats', kcal: 300, photo_url: null }];
    file.prefs = { '@volyume_units': 'kg' };
    const result = await runImport(file);
    expect(mockState.restored.custom_foods).toHaveLength(1);
    expect(result.restored).toBe(true);
  });
});

describe('restore and export failure atomicity', () => {
  test('a partial preference failure is rolled back before database restore starts', async () => {
    mockPrefs.set('@volyume_units', 'lb');
    mockPrefWriteFailure = true;
    await expect(runImport()).rejects.toThrow(/preference write failed/i);
    expect(mockPrefs.get('@volyume_units')).toBe('lb');
    expect(mockState.restored).toBeNull();
  });

  test('a database failure rolls preferences back to their exact prior values', async () => {
    mockPrefs.set('@volyume_units', 'lb');
    mockState.restoreFailure = new Error('database transaction failed');
    await expect(runImport()).rejects.toThrow(/database transaction failed/i);
    expect(mockPrefs.get('@volyume_units')).toBe('lb');
  });

  test('plaintext cleanup failure is surfaced rather than reported as removed', async () => {
    mockDeleteFailure = true;
    await expect(removeTemporaryBackupFile('file:///cache/plain.json')).rejects.toThrow(/delete failed/i);
  });

  test('the lowest-level shape validator rejects mixed owners directly', () => {
    const file = backupFile();
    file.sqlite.custom_foods[2].user_id = 'attacker';
    expect(() => assertBackupShape(file, U)).toThrow(/different account/i);
  });
});
