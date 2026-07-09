/**
 * wipeAllUserData direct-table set (audit Phase 2 / finding A4).
 *
 * Sign-out and account-delete wipe local SQLite through wipeAllUserData. The
 * food tables were missing from its delete set, so on a shared device the
 * next user could read the prior user's cached food log, recipes, and water
 * (locked decision 2: sign-out wipes every user-scoped table). This pins the
 * food tables, and the core training / body / sync-mirror tables, into the
 * set the wipe iterates and deletes by user_id.
 *
 * The storage layer has no SQL engine under jest, so most of this file is a
 * contract guard on the exported list (one source of truth shared with the
 * wipe loop), not a live-DB assertion.
 *
 * Wave 5 addition (safety-privacy-blueprint.md §6.4, founder decision
 * 2026-07-09, "scope to account"): the photo-directory wipe inside
 * wipeAllUserData must be scoped to the wiped account's own subfolder, never
 * the whole progress_photos/ tree (that used to delete every account's
 * photos on a shared device). expo-sqlite IS mockable (a stub that
 * resolves/no-ops every call), so the two-user test below exercises the REAL
 * wipeAllUserData end-to-end against a stateful in-memory fake filesystem to
 * prove the actual directory scoping, not just the source wiring.
 */
import { FATAL_LOCAL_WIPE_TABLES, WIPE_DIRECT_TABLES, wipeAllUserData } from '../database';
import fs from 'fs';
import path from 'path';

jest.mock('expo-sqlite');
jest.mock('progress-scan-image', () => ({ setExcludedFromBackup: jest.fn(async () => true) }));

// Stateful fake filesystem (identifiers must start with "mock" per Jest's
// out-of-scope-variable rule for hoisted jest.mock factories). Tracks a flat
// set of "file exists" paths; deleteAsync removes anything sharing that path
// as a prefix, matching real recursive-directory-delete semantics.
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
  readAsStringAsync: jest.fn(async (p) => {
    if (!mockFiles.has(p)) throw new Error(`ENOENT: ${p}`);
    return 'aGVsbG8='; // arbitrary base64 stand-in photo content ("hello")
  }),
  writeAsStringAsync: jest.fn(async (p) => { mockFiles.add(p); }),
  copyAsync: jest.fn(async ({ to }) => { mockFiles.add(to); }),
  deleteAsync: jest.fn(async (p) => {
    for (const f of Array.from(mockFiles)) {
      if (f === p || f.startsWith(p)) mockFiles.delete(f);
    }
  }),
}));

describe('wipeAllUserData direct-table set (A4)', () => {
  test('includes every user-scoped food table', () => {
    const food = [
      'food_entries', 'custom_foods', 'saved_meals',
      'recipes', 'recipe_ingredients',
      'daily_water', 'food_favourites', 'daily_intake_rollups',
      'food_frequents',
      // generated meal plan: user_id + a calorie-target snapshot (health
      // data); must never survive sign-out or account-delete
      'meal_plans',
    ];
    for (const t of food) expect(WIPE_DIRECT_TABLES).toContain(t);
  });

  test('still includes the core training, body, and sync-mirror tables', () => {
    const core = [
      'workout_sets', 'workouts', 'routines', 'programmes', 'mesocycles',
      'body_metric_log', 'nutrition_targets', 'notification_preferences',
      'pending_sync_ops',
    ];
    for (const t of core) expect(WIPE_DIRECT_TABLES).toContain(t);
  });

  test('includes every remaining user-scoped table (locked decision 2)', () => {
    // These four each carry a user_id column but were missing from the set, so
    // they survived sign-out, the cross-user safety net, and account-delete.
    // ed_pattern_flags is eating-disorder pattern state; engine_telemetry
    // leftovers could ship under the next account. Pin them so the omission
    // cannot silently return.
    const rest = ['cardio_log', 'ed_pattern_flags', 'tier_history', 'engine_telemetry'];
    for (const t of rest) expect(WIPE_DIRECT_TABLES).toContain(t);
  });

  // audit 2026-07-01: both carry a user_id column locally and were missing, so
  // they survived sign-out / account-delete / cross-user switch. Pinned.
  test('includes plan_folders + food_slot_recents (audit 2026-07-01)', () => {
    expect(WIPE_DIRECT_TABLES).toContain('plan_folders');
    expect(WIPE_DIRECT_TABLES).toContain('food_slot_recents');
  });

  test('includes local-only progress photo and scan tables', () => {
    expect(WIPE_DIRECT_TABLES).toContain('progress_photo_meta');
    expect(WIPE_DIRECT_TABLES).toContain('progress_scan_sessions');
    expect(WIPE_DIRECT_TABLES).toContain('progress_scan_assets');
  });

  test('photo and scan wipe failures are fatal, not best-effort', () => {
    expect(FATAL_LOCAL_WIPE_TABLES.has('progress_photo_meta')).toBe(true);
    expect(FATAL_LOCAL_WIPE_TABLES.has('progress_scan_sessions')).toBe(true);
    expect(FATAL_LOCAL_WIPE_TABLES.has('progress_scan_assets')).toBe(true);
  });

  test('account-bound wipe purges SQLite snapshots', () => {
    const database = fs.readFileSync(path.resolve(__dirname, '../database.js'), 'utf8');
    const snapshots = fs.readFileSync(path.resolve(__dirname, '../dbSnapshot.js'), 'utf8');
    expect(snapshots).toMatch(/export async function purgeSnapshots/);
    expect(database).toMatch(/purgeSnapshots\(\)/);
  });

  test('has no duplicate entries', () => {
    expect(new Set(WIPE_DIRECT_TABLES).size).toBe(WIPE_DIRECT_TABLES.length);
  });

  test('the photo-directory wipe call is scoped per-user, not the whole tree (founder decision 2026-07-09)', () => {
    const database = fs.readFileSync(path.resolve(__dirname, '../database.js'), 'utf8');
    expect(database).toMatch(/wipeProgressPhotoDirectoryForUser\(userId\)/);
    // The old whole-tree call (no userId argument) must not be the one wired
    // into the account wipe any more.
    expect(database).not.toMatch(/wipeProgressPhotoDirectory\(\)/);
  });
});

describe('wipeAllUserData two-user photo scope (safety-privacy-blueprint.md §6.4)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFiles.clear();
  });

  test('wiping account A leaves account B\'s photo files and directory intact, A\'s gone', async () => {
    // eslint-disable-next-line global-require
    const { saveProgressPhoto, listProgressPhotos } = require('../progressPhotos');

    await saveProgressPhoto('src://a1.jpg', 1000, 'user-a');
    await saveProgressPhoto('src://b1.jpg', 2000, 'user-b');
    expect((await listProgressPhotos('user-a')).length).toBe(1);
    expect((await listProgressPhotos('user-b')).length).toBe(1);

    await wipeAllUserData('user-a');

    expect(await listProgressPhotos('user-a')).toEqual([]);
    const bPhotos = await listProgressPhotos('user-b');
    expect(bPhotos.length).toBe(1);
    expect(bPhotos[0].name).toBe('2000.jpg');
  });

  test('the account-scoped tables are deleted WHERE user_id = the wiped user, never the other account\'s rows', async () => {
    const conn = await require('../database').db();
    conn.runAsync.mockClear();

    await wipeAllUserData('user-a');

    const photoMetaCalls = conn.runAsync.mock.calls.filter(([sql]) => sql.includes('FROM progress_photo_meta') && sql.includes('WHERE user_id = ?'));
    expect(photoMetaCalls.length).toBeGreaterThan(0);
    for (const [, params] of photoMetaCalls) expect(params).toEqual(['user-a']);
    expect(photoMetaCalls.some(([, params]) => params.includes('user-b'))).toBe(false);

    const scanSessionCalls = conn.runAsync.mock.calls.filter(([sql]) => sql.includes('FROM progress_scan_sessions') && sql.includes('WHERE user_id = ?'));
    for (const [, params] of scanSessionCalls) expect(params).toEqual(['user-a']);

    const scanAssetCalls = conn.runAsync.mock.calls.filter(([sql]) => sql.includes('FROM progress_scan_assets') && sql.includes('WHERE user_id = ?'));
    for (const [, params] of scanAssetCalls) expect(params).toEqual(['user-a']);
  });

  test('fatal-on-failure semantics are unchanged: a photo-directory delete failure still rejects the whole wipe', async () => {
    const fsMock = require('expo-file-system/legacy');
    fsMock.deleteAsync.mockImplementationOnce(async () => { throw new Error('disk busy'); });

    await expect(wipeAllUserData('user-a')).rejects.toThrow('disk busy');
  });

  test('refusing to wipe without a userId means no photo directory is ever touched', async () => {
    // eslint-disable-next-line global-require
    const { saveProgressPhoto } = require('../progressPhotos');
    await saveProgressPhoto('src://a1.jpg', 1000, 'user-a');

    await wipeAllUserData(null); // wipeAllUserData itself no-ops on a falsy userId

    const fsMock = require('expo-file-system/legacy');
    expect(fsMock.deleteAsync).not.toHaveBeenCalled();
  });
});
