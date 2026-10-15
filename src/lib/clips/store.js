/**
 * store.js - the local clip store (D229 addendum 5, "Record a clip").
 *
 * A clip is up to 15 seconds of silent video kept WITH its workout. It is
 * private device data, like a progress photo:
 *   - the file is MOVED from the camera's cache into
 *     `documentDirectory + 'clips/'` and the row in `workout_clips` points at
 *     it (the table is created by the local migration in database.js);
 *   - it is NEVER synced: `workout_clips` is not in the sync registry, not in
 *     `src/lib/sync.js` and has no cloud table, and no Community file may
 *     reference clips (pinned by clips.neverSynced.guard.test.js);
 *   - it is deleted with its workout (database.js calls deleteClipsForWorkout
 *     from the three workout-delete paths) and with the account
 *     (deleteAllClipsForUser, from wipeAllUserData);
 *   - up to three for each workout, and a fourth is REFUSED with
 *     `{ ok: false, reason: 'full' }`, never replaced silently (ruling 6).
 *
 * The uri stored is the full uri at save time, but every read re-bases it onto
 * the CURRENT documents directory, because an iOS app container's absolute
 * path is not guaranteed to survive an app update. Only the file name is
 * trusted.
 *
 * Thumbnails: none. No frame-extraction package is installed, so the clips
 * sheet lists text rows (exercise name or "Workout", length, recorded time)
 * and the share screen cuts its own frames from the clip.
 *
 * Legacy expo-file-system API, matching progressPhotos.js and
 * profileAvatar.js.
 */
import * as FileSystem from 'expo-file-system/legacy';
import { db, uid } from '../database';
import { logError } from '../errorLog';
import {
  MAX_CLIPS_PER_WORKOUT,
  MAX_CLIP_MS,
  CLIP_SOURCES,
} from './rules';

/** Where the clip files live. */
export const CLIPS_DIR = `${FileSystem.documentDirectory}clips/`;

/** The table name, exported so the guard tests and database.js cannot drift. */
export const CLIPS_TABLE = 'workout_clips';

function fileNameOf(uri) {
  if (typeof uri !== 'string') return '';
  const clean = uri.split('?')[0];
  return clean.slice(clean.lastIndexOf('/') + 1);
}

/** A stored uri re-based onto the current clips directory. */
function rebase(uri) {
  const name = fileNameOf(uri);
  return name ? `${CLIPS_DIR}${name}` : '';
}

function extensionOf(uri) {
  const name = fileNameOf(uri);
  const dot = name.lastIndexOf('.');
  const ext = dot === -1 ? '' : name.slice(dot + 1).toLowerCase();
  // The camera records .mp4 on Android and .mov on iOS. Anything else is
  // kept as an mp4 name, the container the player and the engine read.
  return ext === 'mov' || ext === 'mp4' ? ext : 'mp4';
}

function intOrNull(v) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}

function rowToClip(row) {
  return {
    id: row.id,
    userId: row.user_id,
    workoutId: row.workout_id,
    exerciseId: row.exercise_id ?? null,
    exerciseName: row.exercise_name ?? null,
    setNumber: row.set_number ?? null,
    uri: rebase(row.uri),
    durationMs: Number(row.duration_ms) || 0,
    width: row.width ?? null,
    height: row.height ?? null,
    createdAt: Number(row.created_at) || 0,
    source: row.source,
  };
}

/** Delete one clip file. Idempotent: a file that is already gone is success. */
async function removeFile(uri) {
  const target = rebase(uri);
  if (!target) return;
  await FileSystem.deleteAsync(target, { idempotent: true });
}

/**
 * Delete the files of `rows`, then their rows. A row whose file could not be
 * removed is KEPT (so it can be retried and is never silently orphaned) and the
 * first failure is thrown after every other row has been handled.
 */
async function deleteRowsAndFiles(d, rows) {
  let firstError = null;
  let removed = 0;
  for (const row of rows) {
    try {
      // eslint-disable-next-line no-await-in-loop
      await removeFile(row.uri);
      // eslint-disable-next-line no-await-in-loop
      await d.runAsync('DELETE FROM workout_clips WHERE id = ?', [row.id]);
      removed += 1;
    } catch (e) {
      firstError = firstError || e;
      logError('clips.store.deleteFile', e, { clipId: row.id });
    }
  }
  if (firstError) throw firstError;
  return removed;
}

/** This workout's clips, newest first. [] for a missing id or a read failure's
 *  empty result; a real database failure throws. */
export async function listClipsForWorkout(userId, workoutId) {
  if (!userId || !workoutId) return [];
  const d = await db();
  const rows = await d.getAllAsync(
    'SELECT * FROM workout_clips WHERE user_id = ? AND workout_id = ? ORDER BY created_at DESC, id DESC',
    [userId, workoutId],
  );
  return (Array.isArray(rows) ? rows : []).map(rowToClip);
}

/** How many clips this workout holds. */
export async function countClipsForWorkout(userId, workoutId) {
  if (!userId || !workoutId) return 0;
  const d = await db();
  const row = await d.getFirstAsync(
    'SELECT COUNT(*) AS n FROM workout_clips WHERE user_id = ? AND workout_id = ?',
    [userId, workoutId],
  );
  return Number(row?.n) || 0;
}

/** One clip by id (the share screen resolves its `clipId` param through this),
 *  or null. Scoped to the user so a stale id never crosses accounts. */
export async function getClip(userId, clipId) {
  if (!userId || !clipId) return null;
  const d = await db();
  const row = await d.getFirstAsync(
    'SELECT * FROM workout_clips WHERE id = ? AND user_id = ?',
    [clipId, userId],
  );
  return row ? rowToClip(row) : null;
}

// Saves are serialised: two saves racing past the count check could otherwise
// leave a workout holding four clips.
let saveChain = Promise.resolve();

async function saveOne(input) {
  const {
    userId, workoutId, exerciseId = null, exerciseName = null, setNumber = null,
    cacheUri, durationMs, width = null, height = null, source,
  } = input || {};
  if (!userId || !workoutId || typeof cacheUri !== 'string' || !cacheUri
    || !CLIP_SOURCES.includes(source)) {
    return { ok: false, reason: 'invalid' };
  }

  const d = await db();
  const held = await countClipsForWorkout(userId, workoutId);
  if (held >= MAX_CLIPS_PER_WORKOUT) return { ok: false, reason: 'full' };

  const id = uid();
  const dest = `${CLIPS_DIR}${id}.${extensionOf(cacheUri)}`;
  try {
    await FileSystem.makeDirectoryAsync(CLIPS_DIR, { intermediates: true });
  } catch (_) {
    // An existing directory is fine; a real failure surfaces on the move.
  }
  try {
    await FileSystem.moveAsync({ from: cacheUri, to: dest });
  } catch (e) {
    logError('clips.store.move', e, { workoutId });
    return { ok: false, reason: 'move_failed' };
  }

  const createdAt = Date.now();
  const length = Math.min(MAX_CLIP_MS, Math.max(0, Math.round(Number(durationMs) || 0)));
  const name = typeof exerciseName === 'string' && exerciseName.trim() ? exerciseName.trim() : null;
  // The set's number is kept only with an exercise to belong to.
  const setNo = name ? intOrNull(setNumber) : null;
  try {
    await d.runAsync(
      `INSERT INTO workout_clips
         (id, user_id, workout_id, exercise_id, exercise_name, set_number, uri, duration_ms, width, height, created_at, source)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, userId, workoutId,
        exerciseId || null, name, setNo,
        dest, length, intOrNull(width), intOrNull(height), createdAt, source,
      ],
    );
  } catch (e) {
    logError('clips.store.insert', e, { workoutId });
    // The file moved but no row names it: take it back out so nothing is orphaned.
    await FileSystem.deleteAsync(dest, { idempotent: true }).catch(() => {
      // Best-effort; the account wipe sweeps the whole clips directory.
    });
    return { ok: false, reason: 'write_failed' };
  }

  return {
    ok: true,
    clip: rowToClip({
      id, user_id: userId, workout_id: workoutId, exercise_id: exerciseId || null,
      exercise_name: name, set_number: setNo,
      uri: dest, duration_ms: length, width: intOrNull(width), height: intOrNull(height),
      created_at: createdAt, source,
    }),
  };
}

/**
 * Keep a freshly recorded clip with its workout.
 *
 * `cacheUri` is the camera's file in the cache; on success it has been MOVED
 * into the clips directory (nothing is left in the cache).
 *
 * @param {{ userId: string, workoutId: string, exerciseId?: string|null,
 *   exerciseName?: string|null, setNumber?: number|null, cacheUri: string, durationMs: number,
 *   width?: number|null, height?: number|null,
 *   source: 'workout'|'summary' }} input
 * @returns {Promise<{ ok: true, clip: object }
 *   | { ok: false, reason: 'full'|'invalid'|'move_failed'|'write_failed' }>}
 *   `reason: 'full'` means the workout already holds three clips: the file was
 *   NOT moved, so the caller still owns it.
 */
export function saveClip(input) {
  const run = saveChain.then(() => saveOne(input), () => saveOne(input));
  saveChain = run.catch(() => {
    // Keep the chain alive after a failed save; the caller sees its own result.
  });
  return run;
}

/** Delete one clip, its file and its row. False when there was no such clip. */
export async function deleteClip(id) {
  if (!id) return false;
  const d = await db();
  const row = await d.getFirstAsync('SELECT * FROM workout_clips WHERE id = ?', [id]);
  if (!row) return false;
  await deleteRowsAndFiles(d, [row]);
  return true;
}

/** Delete every clip of one workout, files and rows. Returns how many. */
export async function deleteClipsForWorkout(workoutId) {
  if (!workoutId) return 0;
  const d = await db();
  const rows = await d.getAllAsync('SELECT * FROM workout_clips WHERE workout_id = ?', [workoutId]);
  return deleteRowsAndFiles(d, Array.isArray(rows) ? rows : []);
}

/**
 * Delete every clip of one account, files and rows (account deletion, the
 * sign-out wipe, and "delete all my workouts"). Once no account's clips
 * remain, the whole clips directory is removed too, so a file that lost its
 * row to a crash does not outlive the account.
 */
export async function deleteAllClipsForUser(userId) {
  if (!userId) return 0;
  const d = await db();
  const rows = await d.getAllAsync('SELECT * FROM workout_clips WHERE user_id = ?', [userId]);
  const removed = await deleteRowsAndFiles(d, Array.isArray(rows) ? rows : []);
  const left = await d.getFirstAsync('SELECT COUNT(*) AS n FROM workout_clips');
  if ((Number(left?.n) || 0) === 0) {
    await FileSystem.deleteAsync(CLIPS_DIR, { idempotent: true });
  }
  return removed;
}
