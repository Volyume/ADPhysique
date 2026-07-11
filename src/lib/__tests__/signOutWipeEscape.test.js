/**
 * Sign-out wipe escape (ruling 2026-07-11, D33).
 *
 * The wipe_failed path used to be a dead end: one throw from a fatal wipe
 * step blocked sign-out forever (force:true re-runs the same wipe), and the
 * founder's own device needed a full storage clear to escape. These tests pin
 * the escape mechanics WITHOUT weakening the fail-closed privacy rule:
 *
 *   1. A missing table ("no such table", older schema) is not a wipe failure:
 *      a table that doesn't exist holds no data.
 *   2. wipeAllUserDataWithRetry retries a transiently failing wipe and
 *      succeeds when a later attempt lands.
 *   3. When every attempt throws, sign-out proceeds ONLY if
 *      verifyUserWipeClean finds zero residue on the fatal surfaces; any
 *      residue keeps the fail-closed block, with the step named for the
 *      alert (R2-12).
 */
import {
  verifyUserWipeClean,
  wipeAllUserData,
  wipeAllUserDataWithRetry,
} from '../database';

jest.mock('expo-sqlite');
jest.mock('progress-scan-image', () => ({ setExcludedFromBackup: jest.fn(async () => true) }));

// Same stateful fake filesystem as wipeAllUserData.test.js: a flat "file
// exists" set; deleteAsync removes by path prefix like a recursive delete.
const mockFiles = new Set();
jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: '/doc/',
  EncodingType: { UTF8: 'utf8', Base64: 'base64' },
  getInfoAsync: jest.fn(async (p) => ({
    exists: mockFiles.has(p) || Array.from(mockFiles).some((f) => f.startsWith(p)),
  })),
  makeDirectoryAsync: jest.fn(async () => {}),
  readDirectoryAsync: jest.fn(async (dir) => Array.from(mockFiles)
    .filter((f) => f.startsWith(dir))
    .map((f) => f.slice(dir.length))
    .filter((rest) => rest && !rest.includes('/'))),
  readAsStringAsync: jest.fn(async () => 'aGVsbG8='),
  writeAsStringAsync: jest.fn(async (p) => { mockFiles.add(p); }),
  copyAsync: jest.fn(async ({ to }) => { mockFiles.add(to); }),
  deleteAsync: jest.fn(async (p) => {
    for (const f of Array.from(mockFiles)) {
      if (f === p || f.startsWith(p)) mockFiles.delete(f);
    }
  }),
}));

async function conn() {
  return require('../database').db();
}

beforeEach(async () => {
  jest.clearAllMocks();
  mockFiles.clear();
  const d = await conn();
  d.runAsync.mockImplementation(async () => ({ changes: 0, lastInsertRowId: 0 }));
  d.getFirstAsync.mockImplementation(async () => null);
});

describe('missing fatal tables never dead-end the wipe', () => {
  test('"no such table" on a fatal table is tolerated (nothing to remove)', async () => {
    const d = await conn();
    d.runAsync.mockImplementation(async (sql) => {
      if (sql.includes('DELETE FROM partnerships')) throw new Error('no such table: partnerships');
      if (sql.includes('DELETE FROM progress_scan_assets')) throw new Error('no such table: progress_scan_assets');
      return { changes: 0, lastInsertRowId: 0 };
    });
    await expect(wipeAllUserData('user-a')).resolves.toBeUndefined();
  });

  test('any other fatal-table error still rejects, step named (R2-12)', async () => {
    const d = await conn();
    d.runAsync.mockImplementation(async (sql) => {
      if (sql.includes('DELETE FROM progress_scan_assets')) throw new Error('disk I/O error');
      return { changes: 0, lastInsertRowId: 0 };
    });
    await expect(wipeAllUserData('user-a')).rejects.toMatchObject({ wipeStep: 'progress_scan_assets' });
  });
});

describe('verifyUserWipeClean', () => {
  test('clean when every fatal surface is empty', async () => {
    const d = await conn();
    d.getFirstAsync.mockImplementation(async () => ({ n: 0 }));
    expect(await verifyUserWipeClean('user-a')).toEqual({ clean: true, residue: [] });
  });

  test('a surviving fatal row is residue, named', async () => {
    const d = await conn();
    d.getFirstAsync.mockImplementation(async (sql) => (
      sql.includes('FROM progress_photo_meta WHERE user_id = ?') ? { n: 2 } : { n: 0 }
    ));
    const check = await verifyUserWipeClean('user-a');
    expect(check.clean).toBe(false);
    expect(check.residue).toContain('progress_photo_meta');
  });

  test('a missing table is clean; an unreadable table is residue (fail closed)', async () => {
    const d = await conn();
    d.getFirstAsync.mockImplementation(async (sql) => {
      if (sql.includes('FROM partnerships')) throw new Error('no such table: partnerships');
      if (sql.includes('FROM partner_win_cards')) throw new Error('database is locked');
      return { n: 0 };
    });
    const check = await verifyUserWipeClean('user-a');
    expect(check.residue).not.toContain('partnerships');
    expect(check.residue).toContain('partner_win_cards');
  });

  test('surviving photo files on disk are residue', async () => {
    const { saveProgressPhoto } = require('../progressPhotos');
    await saveProgressPhoto('src://a1.jpg', 1000, 'user-a');
    const d = await conn();
    d.getFirstAsync.mockImplementation(async () => ({ n: 0 }));
    const check = await verifyUserWipeClean('user-a');
    expect(check.clean).toBe(false);
    expect(check.residue).toEqual(['photo_files']);
  });

  test('a refused verification (no userId) is never clean', async () => {
    expect((await verifyUserWipeClean(null)).clean).toBe(false);
  });
});

describe('wipeAllUserDataWithRetry', () => {
  test('a transient failure is retried and succeeds', async () => {
    const d = await conn();
    let calls = 0;
    d.runAsync.mockImplementation(async (sql) => {
      if (sql.includes('DELETE FROM progress_scan_assets')) {
        calls += 1;
        if (calls === 1) throw new Error('database is locked');
      }
      return { changes: 0, lastInsertRowId: 0 };
    });
    const result = await wipeAllUserDataWithRetry('user-a', { delaysMs: [0] });
    expect(result).toEqual({ ok: true });
    expect(calls).toBe(2);
  });

  test('all attempts throw but device verifies clean: sign-out may proceed', async () => {
    const d = await conn();
    d.runAsync.mockImplementation(async (sql) => {
      if (sql.includes('DELETE FROM progress_scan_assets')) throw new Error('disk I/O error');
      return { changes: 0, lastInsertRowId: 0 };
    });
    d.getFirstAsync.mockImplementation(async () => ({ n: 0 }));
    const result = await wipeAllUserDataWithRetry('user-a', { attempts: 2, delaysMs: [0] });
    expect(result).toEqual({ ok: true, verifiedClean: true });
  });

  test('all attempts throw and residue remains: fail closed with the step named', async () => {
    const d = await conn();
    d.runAsync.mockImplementation(async (sql) => {
      if (sql.includes('DELETE FROM progress_scan_assets')) throw new Error('disk I/O error');
      return { changes: 0, lastInsertRowId: 0 };
    });
    d.getFirstAsync.mockImplementation(async (sql) => (
      sql.includes('FROM progress_scan_assets') ? { n: 3 } : { n: 0 }
    ));
    const result = await wipeAllUserDataWithRetry('user-a', { attempts: 2, delaysMs: [0] });
    expect(result).toEqual({ ok: false, step: 'progress_scan_assets' });
  });
});
