/**
 * The local clip store (D229 addendum 5): BEHAVIOURAL, real SQLite (node:sqlite)
 * through the real database init path and a stateful fake filesystem. It pins:
 *   - the local migration creates `workout_clips` with the ruled columns and the
 *     (user_id, workout_id) index, at the head schema version;
 *   - saveClip MOVES the file out of the camera cache into documentDirectory
 *     + 'clips/', and writes the row;
 *   - a workout holds at most three clips: the fourth is REFUSED with
 *     { ok: false, reason: 'full' }, the file is NOT moved (the caller still
 *     owns it) and no row is written; racing saves cannot exceed three;
 *   - listing is newest first and a stored uri is re-based onto the current
 *     documents directory;
 *   - deleteClip removes the row AND the file; a file that cannot be removed
 *     keeps its row and throws (never silently orphaned);
 *   - deleteClipsForWorkout and deleteAllClipsForUser delete files too, and the
 *     account delete sweeps the whole clips directory;
 *   - the three workout-delete paths and the local account wipe really call
 *     them, and the wipe verifier reports a surviving clip file as residue.
 */

jest.mock('../../dbCrypto', () => {
  const { DatabaseSync } = require('node:sqlite');
  const raw = new DatabaseSync(':memory:');
  const adapt = {
    execAsync: async (sql) => raw.exec(sql),
    getAllAsync: async (sql, params = []) => raw.prepare(sql).all(...params),
    getFirstAsync: async (sql, params = []) => raw.prepare(sql).get(...params) ?? null,
    runAsync: async (sql, params = []) => {
      const r = raw.prepare(sql).run(...params);
      return { changes: Number(r.changes ?? 0), lastInsertRowId: Number(r.lastInsertRowid ?? 0) };
    },
    withTransactionAsync: async (fn) => fn(),
    isInTransactionSync: () => false,
    closeAsync: async () => {},
  };
  return { openEncryptedDb: async () => ({ db: adapt, encrypted: true }), __raw: raw };
});
jest.mock('expo-sqlite');
jest.mock('../../sync', () => ({ scheduleSync: () => {} }));
jest.mock('../../errorLog', () => ({ logError: jest.fn(), logWarn: jest.fn(), logInfo: jest.fn() }));
jest.mock('progress-scan-image', () => ({ setExcludedFromBackup: jest.fn(async () => true) }));
jest.mock('expo-image-manipulator', () => ({
  manipulateAsync: jest.fn(async (uri) => ({ uri })),
  SaveFormat: { JPEG: 'jpeg' },
}));

// A stateful fake filesystem: a flat set of file paths. deleteAsync removes
// the path and anything beneath it, like a recursive directory delete.
const mockFiles = new Set();
const mockFailDelete = new Set();
jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: '/doc/',
  cacheDirectory: '/cache/',
  EncodingType: { UTF8: 'utf8', Base64: 'base64' },
  getInfoAsync: jest.fn(async (p) => ({
    exists: mockFiles.has(p) || Array.from(mockFiles).some((f) => f.startsWith(p.endsWith('/') ? p : `${p}/`)),
  })),
  makeDirectoryAsync: jest.fn(async () => {}),
  readDirectoryAsync: jest.fn(async (dir) => Array.from(mockFiles)
    .filter((f) => f.startsWith(dir))
    .map((f) => f.slice(dir.length))
    .filter((rest) => rest && !rest.includes('/'))),
  moveAsync: jest.fn(async ({ from, to }) => {
    if (!mockFiles.has(from)) throw new Error(`ENOENT: ${from}`);
    mockFiles.delete(from);
    mockFiles.add(to);
  }),
  deleteAsync: jest.fn(async (p) => {
    if (mockFailDelete.has(p)) throw new Error(`EBUSY: ${p}`);
    for (const f of Array.from(mockFiles)) {
      if (f === p || f.startsWith(p)) mockFiles.delete(f);
    }
  }),
  readAsStringAsync: jest.fn(async () => ''),
  writeAsStringAsync: jest.fn(async () => {}),
  copyAsync: jest.fn(async () => {}),
}));

const fs = require('fs');
const path = require('path');
const FileSystem = require('expo-file-system/legacy');
const {
  db, CURRENT_SCHEMA_VERSION, deleteWorkoutAndSets, deleteIncompleteWorkout,
  clearWorkoutHistory, wipeAllUserData, verifyUserWipeClean, WIPE_DIRECT_TABLES,
  FATAL_LOCAL_WIPE_TABLES,
} = require('../../database');
const {
  CLIPS_DIR, saveClip, listClipsForWorkout, countClipsForWorkout, getClip, deleteClip,
  deleteClipsForWorkout, deleteAllClipsForUser,
} = require('../store');

const U = 'user-clips-1';
const U2 = 'user-clips-2';
let conn;
let seq = 0;

beforeAll(async () => {
  conn = await db();
});

beforeEach(async () => {
  mockFiles.clear();
  mockFailDelete.clear();
  // Each test starts from an empty clip index, so counts are its own.
  await conn.runAsync('DELETE FROM workout_clips');
  await conn.runAsync('DELETE FROM workouts');
});

async function addWorkout(id, userId = U, completed = 1) {
  await conn.runAsync(
    'INSERT OR REPLACE INTO workouts (id, user_id, started_at, is_completed) VALUES (?, ?, ?, ?)',
    [id, userId, 1700000000000, completed],
  );
}

function cacheFile(name = `rec-${seq += 1}.mp4`) {
  const uri = `/cache/Camera/${name}`;
  mockFiles.add(uri);
  return uri;
}

async function save(workoutId, extra = {}) {
  return saveClip({
    userId: U, workoutId, exerciseId: 'ex-1', exerciseName: 'Back squat',
    cacheUri: cacheFile(), durationMs: 12000, width: null, height: null, source: 'workout', ...extra,
  });
}

describe('the local migration', () => {
  test('workout_clips has the ruled columns, and exercise_id / exercise_name / set_number / width / height are nullable', async () => {
    const cols = await conn.getAllAsync('PRAGMA table_info(workout_clips)');
    const byName = Object.fromEntries(cols.map((c) => [c.name, c]));
    expect(Object.keys(byName).sort()).toEqual([
      'created_at', 'duration_ms', 'exercise_id', 'exercise_name', 'height', 'id', 'kept_at', 'kept_reason', 'set_number',
      'source', 'uri', 'user_id', 'width', 'workout_id',
    ]);
    // Addendum 15: the keep marks are nullable (NULL is "follows the rule").
    for (const name of ['kept_at', 'kept_reason']) expect(byName[name].notnull).toBe(0);
    expect(byName.id.pk).toBe(1);
    for (const name of ['exercise_id', 'exercise_name', 'set_number', 'width', 'height']) expect(byName[name].notnull).toBe(0);
    for (const name of ['user_id', 'workout_id', 'uri', 'duration_ms', 'created_at', 'source']) expect(byName[name].notnull).toBe(1);
  });

  test('the (user_id, workout_id) index exists', async () => {
    const idx = await conn.getAllAsync("PRAGMA index_list('workout_clips')");
    expect(idx.map((i) => i.name)).toContain('idx_workout_clips_user_workout');
    const info = await conn.getAllAsync("PRAGMA index_info('idx_workout_clips_user_workout')");
    expect(info.map((i) => i.name)).toEqual(['user_id', 'workout_id']);
  });

  test('it is its own additive version with the header note, and the head version covers it', async () => {
    const src = fs.readFileSync(path.join(__dirname, '..', '..', 'database.js'), 'utf8');
    const at = src.indexOf('CREATE TABLE IF NOT EXISTS workout_clips');
    expect(at).toBeGreaterThan(-1);
    expect(src.split('CREATE TABLE IF NOT EXISTS workout_clips').length - 1).toBe(1);
    const header = src.slice(src.lastIndexOf('// D229 addendum 5 (video shares): workout_clips', at), at);
    for (const word of ['Purpose', 'Applied locally', 'Applied remotely', 'Safe to re-run', 'Rollback', 'NO cloud counterpart']) {
      expect(header).toContain(word);
    }
    const row = await conn.getFirstAsync('PRAGMA user_version');
    expect(row.user_version).toBe(CURRENT_SCHEMA_VERSION);
  });

  test('running it again changes nothing and throws on neither run', async () => {
    await conn.execAsync('CREATE TABLE IF NOT EXISTS workout_clips (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, workout_id TEXT NOT NULL, exercise_id TEXT, exercise_name TEXT, set_number INTEGER, uri TEXT NOT NULL, duration_ms INTEGER NOT NULL, width INTEGER, height INTEGER, created_at INTEGER NOT NULL, source TEXT NOT NULL)');
    await conn.execAsync('CREATE INDEX IF NOT EXISTS idx_workout_clips_user_workout ON workout_clips(user_id, workout_id)');
    const cols = await conn.getAllAsync('PRAGMA table_info(workout_clips)');
    // Twelve ruled columns, plus kept_at and kept_reason (addendum 15).
    expect(cols).toHaveLength(14);
  });
});

describe('saveClip', () => {
  test('MOVES the file out of the cache into documentDirectory/clips and writes the row', async () => {
    await addWorkout('w-save');
    const cacheUri = cacheFile('keep-me.mp4');
    const res = await saveClip({
      userId: U, workoutId: 'w-save', exerciseId: 'ex-9', exerciseName: 'Bench press', setNumber: 3,
      cacheUri, durationMs: 9500, width: 1080, height: 1920, source: 'workout',
    });
    expect(res.ok).toBe(true);
    expect(mockFiles.has(cacheUri)).toBe(false);
    expect(res.clip.uri.startsWith(CLIPS_DIR)).toBe(true);
    expect(res.clip.uri.endsWith('.mp4')).toBe(true);
    expect(mockFiles.has(res.clip.uri)).toBe(true);
    expect(res.clip).toMatchObject({
      userId: U, workoutId: 'w-save', exerciseId: 'ex-9', exerciseName: 'Bench press', setNumber: 3,
      durationMs: 9500, width: 1080, height: 1920, source: 'workout',
    });
    const row = await conn.getFirstAsync('SELECT * FROM workout_clips WHERE id = ?', [res.clip.id]);
    expect(row.user_id).toBe(U);
    expect(row.duration_ms).toBe(9500);
    expect(row.exercise_name).toBe('Bench press');
    expect(row.set_number).toBe(3);
  });

  test('the clips folder is kept out of the iOS device backup on every save (the policy promises "not in backups")', async () => {
    const nativeImage = require('progress-scan-image');
    nativeImage.setExcludedFromBackup.mockClear();
    await addWorkout('w-backup');
    const res = await saveClip({
      userId: U, workoutId: 'w-backup', cacheUri: cacheFile('a.mp4'), durationMs: 5000, source: 'workout',
    });
    expect(res.ok).toBe(true);
    expect(nativeImage.setExcludedFromBackup).toHaveBeenCalledWith(CLIPS_DIR);
    // A refusal from the native side never blocks the save.
    nativeImage.setExcludedFromBackup.mockRejectedValueOnce(new Error('no attribute'));
    const again = await saveClip({
      userId: U, workoutId: 'w-backup', cacheUri: cacheFile('b.mp4'), durationMs: 5000, source: 'workout',
    });
    expect(again.ok).toBe(true);
  });

  test('a save or a delete tells every subscriber, so a row on screen can re-read at once', async () => {
    const { subscribeClips } = require('../store');
    const heard = jest.fn();
    const stop = subscribeClips(heard);
    await addWorkout('w-sub');
    const res = await saveClip({
      userId: U, workoutId: 'w-sub', cacheUri: cacheFile('s.mp4'), durationMs: 5000, source: 'share',
    });
    expect(res.ok).toBe(true);
    expect(res.clip.source).toBe('share');
    expect(heard).toHaveBeenCalledTimes(1);
    await deleteClip(res.clip.id);
    expect(heard).toHaveBeenCalledTimes(2);
    stop();
    await saveClip({ userId: U, workoutId: 'w-sub', cacheUri: cacheFile('t.mp4'), durationMs: 5000, source: 'workout' });
    expect(heard).toHaveBeenCalledTimes(2);
  });

  test('the set number is kept with the exercise only, and only when it is a real number', async () => {
    await addWorkout('w-setno');
    const kept = await save('w-setno', { setNumber: 2 });
    expect(kept.clip.setNumber).toBe(2);
    const none = await save('w-setno', { setNumber: undefined });
    expect(none.clip.setNumber).toBeNull();
    const zero = await save('w-setno', { setNumber: 0 });
    expect(zero.clip.setNumber).toBeNull();
    await deleteClipsForWorkout('w-setno');
    // A summary video has no exercise, so there is no set to belong to.
    const summary = await save('w-setno', { exerciseId: null, exerciseName: null, setNumber: 4, source: 'summary' });
    expect(summary.clip.setNumber).toBeNull();
    const row = await conn.getFirstAsync('SELECT set_number FROM workout_clips WHERE id = ?', [summary.clip.id]);
    expect(row.set_number).toBeNull();
  });

  test('keeps a .mov from iOS and names an unknown extension .mp4', async () => {
    await addWorkout('w-ext');
    const mov = await save('w-ext', { cacheUri: cacheFile('a.MOV') });
    expect(mov.clip.uri.endsWith('.mov')).toBe(true);
    const odd = await save('w-ext', { cacheUri: cacheFile('b.tmp') });
    expect(odd.clip.uri.endsWith('.mp4')).toBe(true);
  });

  test('a clip made on the summary has no exercise, and the length is held to the two minute cap (addendum 13)', async () => {
    await addWorkout('w-sum');
    const res = await save('w-sum', { exerciseId: null, exerciseName: null, durationMs: 999999, source: 'summary' });
    expect(res.clip).toMatchObject({ exerciseId: null, exerciseName: null, durationMs: 120000, source: 'summary' });
  });

  test('refuses a fourth clip with { ok: false, reason: "full" }, leaving the file with the caller and no row', async () => {
    await addWorkout('w-full');
    for (let i = 0; i < 3; i += 1) expect((await save('w-full')).ok).toBe(true);
    const cacheUri = cacheFile('fourth.mp4');
    const filesBefore = mockFiles.size;
    const res = await saveClip({
      userId: U, workoutId: 'w-full', cacheUri, durationMs: 5000, source: 'workout',
    });
    expect(res).toEqual({ ok: false, reason: 'full' });
    expect(mockFiles.has(cacheUri)).toBe(true);
    expect(mockFiles.size).toBe(filesBefore);
    expect(await countClipsForWorkout(U, 'w-full')).toBe(3);
  });

  test('racing saves cannot take a workout past three', async () => {
    await addWorkout('w-race');
    const results = await Promise.all([1, 2, 3, 4, 5].map(() => save('w-race')));
    expect(results.filter((r) => r.ok)).toHaveLength(3);
    expect(results.filter((r) => !r.ok).every((r) => r.reason === 'full')).toBe(true);
    expect(await countClipsForWorkout(U, 'w-race')).toBe(3);
  });

  test('the cap is per workout and per user', async () => {
    await addWorkout('w-a');
    await addWorkout('w-b');
    for (let i = 0; i < 3; i += 1) await save('w-a');
    expect((await save('w-b')).ok).toBe(true);
    expect((await save('w-a', { userId: U2 })).ok).toBe(true);
  });

  test('refuses what it cannot keep: no user, no workout, no file, a source that is not workout or summary', async () => {
    const good = { userId: U, workoutId: 'w-x', cacheUri: cacheFile(), durationMs: 5000, source: 'workout' };
    for (const bad of [
      { ...good, userId: '' }, { ...good, workoutId: null }, { ...good, cacheUri: '' },
      { ...good, source: 'gallery' }, { ...good, source: undefined },
    ]) {
      expect(await saveClip(bad)).toEqual({ ok: false, reason: 'invalid' });
    }
    expect(await saveClip(null)).toEqual({ ok: false, reason: 'invalid' });
  });

  test('a move that fails keeps nothing and says so', async () => {
    await addWorkout('w-move');
    const res = await saveClip({
      userId: U, workoutId: 'w-move', cacheUri: '/cache/Camera/missing.mp4', durationMs: 4000, source: 'workout',
    });
    expect(res).toEqual({ ok: false, reason: 'move_failed' });
    expect(await countClipsForWorkout(U, 'w-move')).toBe(0);
  });

  test('a row that cannot be written takes the moved file back out', async () => {
    await addWorkout('w-bad');
    // A row already holding the id the next clip will draw: the INSERT fails.
    await conn.runAsync(
      `INSERT INTO workout_clips (id, user_id, workout_id, uri, duration_ms, created_at, source)
       VALUES ('dup-id', 'someone-else', 'w-elsewhere', '/doc/clips/dup-id.mp4', 1000, 1, 'workout')`,
    );
    const uidSpy = jest.spyOn(require('../../database'), 'uid').mockReturnValueOnce('dup-id');
    try {
      const res = await save('w-bad');
      expect(res).toEqual({ ok: false, reason: 'write_failed' });
    } finally {
      uidSpy.mockRestore();
    }
    expect(Array.from(mockFiles).filter((f) => f.startsWith(CLIPS_DIR))).toEqual([]);
  });
});

describe('reading', () => {
  test('listClipsForWorkout is newest first and scoped to the user and the workout', async () => {
    await addWorkout('w-list');
    await addWorkout('w-other');
    const now = jest.spyOn(Date, 'now');
    now.mockReturnValueOnce(1000);
    const a = await save('w-list');
    now.mockReturnValueOnce(3000);
    const b = await save('w-list');
    now.mockReturnValueOnce(2000);
    const c = await save('w-list');
    now.mockRestore();
    await save('w-other');
    const list = await listClipsForWorkout(U, 'w-list');
    expect(list.map((x) => x.id)).toEqual([b.clip.id, c.clip.id, a.clip.id]);
    expect(await listClipsForWorkout(U2, 'w-list')).toEqual([]);
    expect(await listClipsForWorkout(U, '')).toEqual([]);
  });

  test('a stored uri is re-based onto the current clips directory (an iOS container path can change)', async () => {
    await addWorkout('w-rebase');
    await conn.runAsync(
      `INSERT INTO workout_clips (id, user_id, workout_id, uri, duration_ms, created_at, source)
       VALUES ('c-old', ?, 'w-rebase', 'file:///var/mobile/Containers/Data/Application/OLD-UUID/Documents/clips/c-old.mov', 5000, 1, 'summary')`,
      [U],
    );
    const [clip] = await listClipsForWorkout(U, 'w-rebase');
    expect(clip.uri).toBe(`${CLIPS_DIR}c-old.mov`);
  });

  test('getClip resolves one clip for its owner only', async () => {
    await addWorkout('w-get');
    const { clip } = await save('w-get');
    expect((await getClip(U, clip.id)).id).toBe(clip.id);
    expect(await getClip(U2, clip.id)).toBeNull();
    expect(await getClip(U, 'nope')).toBeNull();
    expect(await getClip(null, clip.id)).toBeNull();
  });
});

describe('deleting', () => {
  test('deleteClip removes the row and the file; an unknown id is false', async () => {
    await addWorkout('w-del');
    const { clip } = await save('w-del');
    expect(await deleteClip(clip.id)).toBe(true);
    expect(mockFiles.has(clip.uri)).toBe(false);
    expect(await countClipsForWorkout(U, 'w-del')).toBe(0);
    expect(await deleteClip(clip.id)).toBe(false);
    expect(await deleteClip('')).toBe(false);
  });

  test('a file that cannot be removed keeps its row and throws, never silently orphaned', async () => {
    await addWorkout('w-stuck');
    const { clip } = await save('w-stuck');
    mockFailDelete.add(clip.uri);
    await expect(deleteClip(clip.id)).rejects.toThrow(/EBUSY/);
    expect(await countClipsForWorkout(U, 'w-stuck')).toBe(1);
    expect(mockFiles.has(clip.uri)).toBe(true);
  });

  test('deleteClipsForWorkout deletes that workout\'s clips and files only', async () => {
    await addWorkout('w-1');
    await addWorkout('w-2');
    const a = await save('w-1');
    const b = await save('w-1');
    const keep = await save('w-2');
    expect(await deleteClipsForWorkout('w-1')).toBe(2);
    expect(mockFiles.has(a.clip.uri) || mockFiles.has(b.clip.uri)).toBe(false);
    expect(mockFiles.has(keep.clip.uri)).toBe(true);
    expect(await countClipsForWorkout(U, 'w-2')).toBe(1);
    expect(await deleteClipsForWorkout('')).toBe(0);
  });

  test('deleteAllClipsForUser deletes one account\'s clips and files and leaves the other account\'s', async () => {
    await addWorkout('w-u1');
    await addWorkout('w-u2', U2);
    const mine = await save('w-u1');
    const theirs = await save('w-u2', { userId: U2 });
    expect(await deleteAllClipsForUser(U)).toBe(1);
    expect(mockFiles.has(mine.clip.uri)).toBe(false);
    expect(mockFiles.has(theirs.clip.uri)).toBe(true);
    expect(await countClipsForWorkout(U2, 'w-u2')).toBe(1);
    await deleteAllClipsForUser(U2);
  });

  test('once no clips remain the whole clips directory goes, so a file that lost its row does not outlive the account', async () => {
    await addWorkout('w-orphan');
    await save('w-orphan');
    mockFiles.add(`${CLIPS_DIR}orphan-from-a-crash.mp4`);
    await deleteAllClipsForUser(U);
    expect(Array.from(mockFiles).filter((f) => f.startsWith(CLIPS_DIR))).toEqual([]);
    expect(FileSystem.deleteAsync).toHaveBeenCalledWith(CLIPS_DIR, { idempotent: true });
  });
});

describe('the workout-delete paths and the account wipe call the store', () => {
  test('deleteWorkoutAndSets removes the workout\'s clips with it', async () => {
    await addWorkout('w-gone');
    const { clip } = await save('w-gone');
    expect(await deleteWorkoutAndSets(U, 'w-gone')).toBe(true);
    expect(mockFiles.has(clip.uri)).toBe(false);
    expect(await countClipsForWorkout(U, 'w-gone')).toBe(0);
  });

  test('deleteIncompleteWorkout (discard a session) removes its clips; a COMPLETED workout keeps them', async () => {
    await addWorkout('w-discard', U, 0);
    await addWorkout('w-done', U, 1);
    const drop = await save('w-discard');
    const keep = await save('w-done');
    expect(await deleteIncompleteWorkout('w-discard')).toBe(true);
    expect(mockFiles.has(drop.clip.uri)).toBe(false);
    expect(await deleteIncompleteWorkout('w-done')).toBe(false);
    expect(mockFiles.has(keep.clip.uri)).toBe(true);
  });

  test('clearWorkoutHistory (delete all my workouts) removes every clip of the user', async () => {
    await addWorkout('w-c1');
    await addWorkout('w-c2');
    const a = await save('w-c1');
    const b = await save('w-c2');
    await clearWorkoutHistory(U);
    expect(mockFiles.has(a.clip.uri) || mockFiles.has(b.clip.uri)).toBe(false);
    expect(await countClipsForWorkout(U, 'w-c1')).toBe(0);
  });

  test('a clip that cannot be removed never stops the workout from being deleted', async () => {
    await addWorkout('w-best-effort');
    const { clip } = await save('w-best-effort');
    mockFailDelete.add(clip.uri);
    expect(await deleteWorkoutAndSets(U, 'w-best-effort')).toBe(true);
    const gone = await conn.getFirstAsync('SELECT id FROM workouts WHERE id = ?', ['w-best-effort']);
    expect(gone).toBeNull();
  });

  test('the account wipe removes the user\'s clip files and rows, and the table is wiped and fatal', async () => {
    expect(WIPE_DIRECT_TABLES).toContain('workout_clips');
    expect(FATAL_LOCAL_WIPE_TABLES.has('workout_clips')).toBe(true);
    await addWorkout('w-wipe');
    const { clip } = await save('w-wipe');
    await wipeAllUserData(U);
    expect(mockFiles.has(clip.uri)).toBe(false);
    const rows = await conn.getAllAsync('SELECT id FROM workout_clips WHERE user_id = ?', [U]);
    expect(rows).toEqual([]);
  });

  test('a clip file that cannot be removed makes the wipe fail closed, naming the step', async () => {
    await addWorkout('w-wipe-fail');
    const { clip } = await save('w-wipe-fail');
    mockFailDelete.add(clip.uri);
    let caught = null;
    try { await wipeAllUserData(U); } catch (e) { caught = e; }
    expect(caught).not.toBeNull();
    expect(caught.wipeStep).toBe('clip_files');
  });

  test('the wipe verifier counts a surviving clip file as residue', async () => {
    mockFiles.add(`${CLIPS_DIR}left-behind.mp4`);
    const verdict = await verifyUserWipeClean(U);
    expect(verdict.clean).toBe(false);
    expect(verdict.residue).toContain('clip_files');
    mockFiles.clear();
    const clean = await verifyUserWipeClean(U);
    expect(clean.residue).not.toContain('clip_files');
  });
});

// ── Keeping and clearing (D229 addendum 15) ──────────────────────────────────
// The founder: videos must not fill the phone. A video is kept for the
// person's chosen number of days (default 7) and then cleared, unless it is
// kept on purpose (by the person, or by the app for a PR set).
const AsyncStorage = require('@react-native-async-storage/async-storage').default;
const {
  setClipKept, keepClipsForPRs, sweepExpiredClips, getClipsStorage, getKeepDays, setKeepDays,
  countExpiredClips, isClipPastWindow,
} = require('../store');
const { DAY_MS, KEEP_DAYS_KEY, KEEP_SINCE_KEY } = require('../rules');

describe('keeping and clearing (addendum 15)', () => {
  const NOW = 1_800_000_000_000;
  beforeEach(async () => {
    await AsyncStorage.clear();
    await addWorkout('w-keep');
  });

  async function savedAt(createdAt, extra = {}) {
    const res = await save('w-keep', extra);
    await conn.runAsync('UPDATE workout_clips SET created_at = ? WHERE id = ?', [createdAt, res.clip.id]);
    return res.clip;
  }

  test('a new clip follows the rule (not kept); Keep marks it, and the mark can be lifted', async () => {
    const clip = (await save('w-keep')).clip;
    expect(clip.keptAt).toBeNull();
    expect(await setClipKept(clip.id, true)).toBe(true);
    let row = await conn.getFirstAsync('SELECT kept_at, kept_reason FROM workout_clips WHERE id = ?', [clip.id]);
    expect(row.kept_at).toBeGreaterThan(0);
    expect(row.kept_reason).toBe('person');
    expect(await setClipKept(clip.id, false)).toBe(true);
    row = await conn.getFirstAsync('SELECT kept_at, kept_reason FROM workout_clips WHERE id = ?', [clip.id]);
    expect(row.kept_at).toBeNull();
    expect(await setClipKept('nope', true)).toBe(false);
  });

  test('the first sweep notes when the rule arrived, so a video recorded before the update is not cleared at once', async () => {
    const old = await savedAt(NOW - 40 * DAY_MS);
    expect(await sweepExpiredClips(U, { force: true, now: NOW })).toBe(0);
    expect(Number(await AsyncStorage.getItem(KEEP_SINCE_KEY))).toBe(NOW);
    expect(await conn.getFirstAsync('SELECT id FROM workout_clips WHERE id = ?', [old.id])).not.toBeNull();
    // Seven days on from the rule's arrival, it goes.
    expect(await sweepExpiredClips(U, { force: true, now: NOW + 7 * DAY_MS })).toBe(1);
    expect(await conn.getFirstAsync('SELECT id FROM workout_clips WHERE id = ?', [old.id])).toBeNull();
    expect(mockFiles.has(old.uri)).toBe(false);
  });

  test('with the rule already in place: a video older than the window is cleared, a newer one and a kept one stay, the file goes with the row', async () => {
    await AsyncStorage.setItem(KEEP_SINCE_KEY, String(NOW - 100 * DAY_MS));
    const old = await savedAt(NOW - 8 * DAY_MS);
    const fresh = await savedAt(NOW - 6 * DAY_MS);
    const kept = await savedAt(NOW - 30 * DAY_MS);
    await setClipKept(kept.id, true);
    expect(await sweepExpiredClips(U, { force: true, now: NOW })).toBe(1);
    const left = (await conn.getAllAsync('SELECT id FROM workout_clips')).map((r) => r.id).sort();
    expect(left).toEqual([fresh.id, kept.id].sort());
    expect(mockFiles.has(old.uri)).toBe(false);
    expect(mockFiles.has(fresh.uri)).toBe(true);
  });

  test('the setting: 30 days keeps a 20 day old video; "until I delete them" (0) clears nothing; a nonsense value reads as 7', async () => {
    await AsyncStorage.setItem(KEEP_SINCE_KEY, String(NOW - 100 * DAY_MS));
    const twenty = await savedAt(NOW - 20 * DAY_MS);
    expect(await setKeepDays(30)).toBe(30);
    expect(await getKeepDays()).toBe(30);
    expect(await sweepExpiredClips(U, { force: true, now: NOW })).toBe(0);
    await setKeepDays(0);
    const ancient = await savedAt(NOW - 400 * DAY_MS);
    expect(await sweepExpiredClips(U, { force: true, now: NOW })).toBe(0);
    expect(await conn.getFirstAsync('SELECT id FROM workout_clips WHERE id = ?', [ancient.id])).not.toBeNull();
    await AsyncStorage.setItem(KEEP_DAYS_KEY, 'banana');
    expect(await getKeepDays()).toBe(7);
    expect(await sweepExpiredClips(U, { force: true, now: NOW })).toBe(2);
    expect(twenty.id).toBeDefined();
  });

  test('countExpiredClips counts what a window would remove NOW, without deleting: kept and PR videos are not counted', async () => {
    await AsyncStorage.setItem(KEEP_SINCE_KEY, String(NOW - 100 * DAY_MS));
    // Three videos to a workout at most, so the older ones sit in a second workout.
    await addWorkout('w-keep-2');
    const savedIn = async (workoutId, createdAt, extra = {}) => {
      const res = await save(workoutId, extra);
      await conn.runAsync('UPDATE workout_clips SET created_at = ? WHERE id = ?', [createdAt, res.clip.id]);
      return res.clip;
    };
    await savedAt(NOW - 8 * DAY_MS);
    await savedAt(NOW - 20 * DAY_MS);
    await savedAt(NOW - 40 * DAY_MS);
    const kept = await savedIn('w-keep-2', NOW - 50 * DAY_MS);
    await setClipKept(kept.id, true);
    const pr = await savedIn('w-keep-2', NOW - 60 * DAY_MS, { exerciseId: 'ex-1', setNumber: 3 });
    await keepClipsForPRs(U, 'w-keep-2', [{ exerciseId: 'ex-1', setNumber: 3, type: '1rm_estimate' }]);
    expect(pr.id).toBeDefined();
    expect(await countExpiredClips(U, { keepDays: 7, now: NOW })).toBe(3);
    expect(await countExpiredClips(U, { keepDays: 30, now: NOW })).toBe(1);
    expect(await countExpiredClips(U, { keepDays: 90, now: NOW })).toBe(0);
    expect(await countExpiredClips(U, { keepDays: 0, now: NOW })).toBe(0);
    expect(await countExpiredClips(null, { keepDays: 7, now: NOW })).toBe(0);
    // Counting never deletes.
    expect((await conn.getAllAsync('SELECT id FROM workout_clips')).length).toBe(5);
    // The rule's arrival counts, as in the sweep: nothing recorded before it is due yet.
    await AsyncStorage.setItem(KEEP_SINCE_KEY, String(NOW - 2 * DAY_MS));
    expect(await countExpiredClips(U, { keepDays: 7, now: NOW })).toBe(0);
  });

  test('isClipPastWindow answers by the stored setting and the rule\'s arrival, as if the video were not kept', async () => {
    await AsyncStorage.setItem(KEEP_SINCE_KEY, String(NOW - 100 * DAY_MS));
    expect(await isClipPastWindow({ createdAt: NOW - 8 * DAY_MS, keptAt: NOW }, { now: NOW })).toBe(true);
    expect(await isClipPastWindow({ createdAt: NOW - 6 * DAY_MS, keptAt: NOW }, { now: NOW })).toBe(false);
    await setKeepDays(30);
    expect(await isClipPastWindow({ createdAt: NOW - 8 * DAY_MS }, { now: NOW })).toBe(false);
    await setKeepDays(0);
    expect(await isClipPastWindow({ createdAt: NOW - 800 * DAY_MS }, { now: NOW })).toBe(false);
  });

  test('the sweep is throttled within a session unless forced, and never throws', async () => {
    await AsyncStorage.setItem(KEEP_SINCE_KEY, String(NOW - 100 * DAY_MS));
    await savedAt(NOW - 8 * DAY_MS);
    expect(await sweepExpiredClips(U, { force: true, now: NOW })).toBe(1);
    await savedAt(NOW - 9 * DAY_MS);
    expect(await sweepExpiredClips(U, { now: NOW + 1000 })).toBe(0); // throttled
    expect(await sweepExpiredClips(U, { force: true, now: NOW + 1000 })).toBe(1);
    expect(await sweepExpiredClips(null, { force: true, now: NOW })).toBe(0);
  });

  test('a video of a PR set is kept by the app, by exercise and set; the rest follow the rule', async () => {
    const pr = (await save('w-keep', { exerciseId: 'ex-1', setNumber: 3 })).clip;
    const other = (await save('w-keep', { exerciseId: 'ex-1', setNumber: 1 })).clip;
    expect(await keepClipsForPRs(U, 'w-keep', [{ exerciseId: 'ex-1', setNumber: 3, type: '1rm_estimate' }])).toBe(1);
    const rows = Object.fromEntries((await conn.getAllAsync('SELECT id, kept_reason FROM workout_clips')).map((r) => [r.id, r.kept_reason]));
    expect(rows[pr.id]).toBe('pr');
    expect(rows[other.id]).toBeNull();
    // A repeat keeps the earlier mark and reports nothing new.
    expect(await keepClipsForPRs(U, 'w-keep', [{ exerciseId: 'ex-1', setNumber: 3 }])).toBe(0);
    expect(await keepClipsForPRs(U, 'w-keep', [])).toBe(0);
  });

  test('the size on this phone: a count and the bytes of the files that exist, for the account or one workout', async () => {
    await addWorkout('w-other');
    await save('w-keep');
    await save('w-keep');
    await save('w-other');
    const all = await getClipsStorage(U);
    expect(all.count).toBe(3);
    expect(all.bytes).toBeGreaterThanOrEqual(0);
    const one = await getClipsStorage(U, 'w-other');
    expect(one.count).toBe(1);
    expect(await getClipsStorage(null)).toEqual({ count: 0, bytes: 0 });
  });
});
