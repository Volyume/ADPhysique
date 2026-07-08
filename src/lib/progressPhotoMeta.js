/**
 * Progress-photo metadata (progress-photos upgrade B0) — DEVICE-LOCAL only.
 *
 * Each progress photo is still just a file named `<epochMs>.jpg`
 * (src/lib/progressPhotos.js). This module layers an OPTIONAL metadata row on
 * top, keyed by that filename in the local `progress_photo_meta` table:
 *   - takenAt  — editable "date taken" (defaults to the filename timestamp)
 *   - pose     — 'front' | 'side' | 'back' | null
 *   - weightKg — a snapshot of the nearest logged weigh-in to takenAt, taken
 *                when the row is created or takenAt changes (never re-derived on
 *                an unrelated pose/note edit)
 *   - note     — a short user note
 *   - unscored — a PERMANENT origin marker (progress-photos wave 2, founder
 *                gate F2 = tag route). true for photos saved through a
 *                quick-add route (camera/library in ProgressPhotosScreen);
 *                once true it can never be cleared back to false by any
 *                later patch, so a quick-add photo can never quietly become
 *                scored-comparison material. Defaults to false so every
 *                other route (guided, scan, scan_library) is unaffected.
 *
 * Fully back-compatible: a photo with NO row behaves exactly as today — takenAt
 * derived from the filename, pose/weightKg/note null. Nothing here ever requires
 * a row to pre-exist. Like the photos themselves, this metadata is device-local
 * and is deliberately NOT in SYNC_REGISTRY — it never leaves the device.
 *
 * Thin, pure-ish wrappers over the shared SQLite handle; the weight snapshot
 * reuses the getBodyWeightNearestTo accessor in database.js.
 */
import { db, getBodyWeightNearestTo } from './database';
import { timestampFromName } from './progressPhotos';
import { logError } from './errorLog';

// The shape every consumer sees. A missing row resolves to these defaults so a
// today's-photo (no row) reads identically to the pre-upgrade behaviour.
function defaultMeta(name) {
  return {
    name,
    takenAt: timestampFromName(name),
    pose: null,
    weightKg: null,
    note: null,
    unscored: false,
  };
}

function resolveArgs(a, b) {
  if (b === undefined) return { userId: null, name: a };
  return { userId: a ?? null, name: b };
}

function rowToMeta(row) {
  return {
    name: row.name,
    takenAt: row.taken_at,
    pose: row.pose ?? null,
    weightKg: row.weight_kg ?? null,
    note: row.note ?? null,
    unscored: row.unscored === 1 || row.unscored === true,
  };
}

/**
 * Metadata for one photo `name`. Returns the stored row mapped to the shared
 * shape, or the derived defaults when there is no row (never null, never
 * throws).
 */
export async function getPhotoMeta(userIdOrName, maybeName) {
  const { userId, name } = resolveArgs(userIdOrName, maybeName);
  if (!name) return defaultMeta(name);
  try {
    const d = await db();
    const row = userId
      ? await d.getFirstAsync(
        `SELECT * FROM progress_photo_meta
          WHERE name = ? AND user_id = ?
          LIMIT 1`,
        [name, userId],
      )
      : await d.getFirstAsync(
        'SELECT * FROM progress_photo_meta WHERE name = ? AND user_id IS NULL LIMIT 1',
        [name],
      );
    return row ? rowToMeta(row) : defaultMeta(name);
  } catch (e) {
    logError('ProgressPhotoMeta.get', e, { name });
    return defaultMeta(name);
  }
}

/**
 * Batch metadata for a list of photo `names`. Returns a map keyed by name;
 * every requested name is present, missing rows falling back to defaults. Never
 * throws (a read failure yields all-defaults, i.e. today's behaviour).
 */
export async function getPhotoMetaMap(names, userId = null) {
  const list = Array.isArray(names) ? names.filter(Boolean) : [];
  const map = {};
  for (const n of list) map[n] = defaultMeta(n);
  if (list.length === 0) return map;
  try {
    const d = await db();
    const placeholders = list.map(() => '?').join(', ');
    const rows = userId
      ? await d.getAllAsync(
        `SELECT * FROM progress_photo_meta
          WHERE name IN (${placeholders}) AND user_id = ?`,
        [...list, userId],
      )
      : await d.getAllAsync(
        `SELECT * FROM progress_photo_meta WHERE name IN (${placeholders}) AND user_id IS NULL`,
        list,
      );
    for (const row of rows) map[row.name] = rowToMeta(row);
  } catch (e) {
    logError('ProgressPhotoMeta.getMap', e, { count: list.length });
  }
  return map;
}

/**
 * Create or update the metadata row for a photo `name`.
 *
 * `patch` may carry any of `{ takenAt, pose, note, unscored }`; only the keys
 * present are changed (an absent key keeps the stored value, or the default
 * on create). `weightKg` is NOT user-settable — it is snapshotted from the
 * nearest logged weigh-in to takenAt (via getBodyWeightNearestTo) when the
 * row is first created OR when takenAt changes, and otherwise left exactly as
 * it was. `unscored` is PERMANENT once set: passing `unscored: true` tags the
 * row forever; passing `unscored: false` (or omitting it) NEVER clears an
 * existing true value, so a quick-add photo can never be quietly re-tagged
 * as scoreable by an unrelated edit (progress-photos wave 2, founder gate F2).
 *
 * Returns the resulting metadata in the shared shape. `userId` is only needed
 * for the weight snapshot; a null userId simply yields weightKg = null.
 */
export async function upsertPhotoMeta(userId, name, patch = {}, options = {}) {
  if (!name) return defaultMeta(name);
  try {
    const d = await db();
    const now = Date.now();
    const existing = await d.getFirstAsync(
      userId
        ? `SELECT * FROM progress_photo_meta
            WHERE name = ? AND user_id = ?
            LIMIT 1`
        : 'SELECT * FROM progress_photo_meta WHERE name = ? AND user_id IS NULL LIMIT 1',
      userId ? [name, userId] : [name],
    );

    const prevTakenAt = existing ? existing.taken_at : null;
    const takenAt = Number.isFinite(patch.takenAt)
      ? patch.takenAt
      : (existing ? existing.taken_at : timestampFromName(name));
    const pose = patch.pose !== undefined ? patch.pose : (existing ? existing.pose : null);
    const note = patch.note !== undefined ? patch.note : (existing ? existing.note : null);
    const prevUnscored = existing ? (existing.unscored === 1 || existing.unscored === true) : false;
    const unscored = prevUnscored || patch.unscored === true;

    // Snapshot the weight only when the row is CREATED or takenAt CHANGES;
    // otherwise keep the existing snapshot so a pose/note edit never re-reads it.
    let weightKg = existing ? existing.weight_kg : null;
    const takenAtChanged = takenAt !== prevTakenAt;
    if ((!existing || takenAtChanged) && Number.isFinite(takenAt)) {
      try {
        const w = await getBodyWeightNearestTo(userId, takenAt);
        weightKg = w ? w.weightKg : null;
      } catch (_) { /* leave weightKg as-is; no snapshot is a valid state */ }
    }

    const createdAt = existing ? existing.created_at : now;
    if (userId) {
      await d.runAsync(
        `INSERT INTO progress_photo_meta
           (user_id, name, taken_at, pose, weight_kg, note, unscored, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(user_id, name) DO UPDATE SET
           taken_at   = excluded.taken_at,
           pose       = excluded.pose,
           weight_kg  = excluded.weight_kg,
           note       = excluded.note,
           unscored   = excluded.unscored,
           updated_at = excluded.updated_at`,
        [userId, name, takenAt, pose ?? null, weightKg ?? null, note ?? null, unscored ? 1 : 0, createdAt, now],
      );
    } else if (existing) {
      await d.runAsync(
        `UPDATE progress_photo_meta
          SET taken_at = ?, pose = ?, weight_kg = ?, note = ?, unscored = ?, updated_at = ?
          WHERE user_id IS NULL AND name = ?`,
        [takenAt, pose ?? null, weightKg ?? null, note ?? null, unscored ? 1 : 0, now, name],
      );
    } else {
      await d.runAsync(
        `INSERT INTO progress_photo_meta
           (user_id, name, taken_at, pose, weight_kg, note, unscored, created_at, updated_at)
         VALUES (NULL, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [name, takenAt, pose ?? null, weightKg ?? null, note ?? null, unscored ? 1 : 0, createdAt, now],
      );
    }

    return {
      name, takenAt, pose: pose ?? null, weightKg: weightKg ?? null, note: note ?? null, unscored,
    };
  } catch (e) {
    logError('ProgressPhotoMeta.upsert', e, { name });
    if (options?.throwOnError) throw e;
    return defaultMeta(name);
  }
}

/**
 * Remove the metadata row for a deleted photo. Call this whenever a photo file
 * is deleted so no orphan row lingers. Idempotent; never throws.
 */
export async function deletePhotoMeta(userIdOrName, maybeName) {
  const { userId, name } = resolveArgs(userIdOrName, maybeName);
  if (!name) return false;
  try {
    const d = await db();
    if (userId) {
      await d.runAsync('DELETE FROM progress_photo_meta WHERE user_id = ? AND name = ?', [userId, name]);
    } else {
      await d.runAsync('DELETE FROM progress_photo_meta WHERE user_id IS NULL AND name = ?', [name]);
    }
    return true;
  } catch (e) {
    logError('ProgressPhotoMeta.delete', e, { name });
    return false;
  }
}
