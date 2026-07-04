/**
 * Progress photos (gap #9) — DEVICE-LOCAL only.
 *
 * Physique tracking wants progress photos, but body images are sensitive
 * (special-category data + body-image ED-sensitivity). So they live ONLY in the
 * app's private document directory: never synced to Supabase, never uploaded,
 * never shared automatically, never gamified. A photo is a file named
 * `<epochMs>.jpg`; the timestamp is the only metadata, parsed back from the name
 * for display + ordering. The screen layers a calm-mode note on top.
 *
 * The pure half (filename <-> timestamp, the sort) is unit-tested; the
 * FileSystem wrappers are thin.
 */
import * as FileSystem from 'expo-file-system/legacy';

const BASE_DIR = `${FileSystem.documentDirectory}progress_photos/`;
const LEGACY_OWNER_FILE = `${BASE_DIR}owner.txt`;

function safeUserSegment(userId) {
  if (!userId) return null;
  return String(userId).replace(/[^a-zA-Z0-9._-]/g, '_');
}

export function photoDir(userId) {
  const safe = safeUserSegment(userId);
  return safe ? `${BASE_DIR}users/${safe}/` : BASE_DIR;
}

// Parse the epoch-ms timestamp from a `<ms>.jpg` filename, or null if it isn't
// one of ours (so stray files never crash the gallery).
export function timestampFromName(name) {
  const m = /^(\d+)\.jpg$/.exec(name || '');
  return m ? Number(m[1]) : null;
}

// Newest-first ordering of a raw filename list into display rows. Pure.
export function orderPhotos(names) {
  return (names || [])
    .map((name) => ({ name, uri: BASE_DIR + name, ts: timestampFromName(name) }))
    .filter((p) => p.ts != null)
    .sort((a, b) => b.ts - a.ts);
}

function orderPhotosInDir(names, dir) {
  return (names || [])
    .map((name) => ({ name, uri: dir + name, ts: timestampFromName(name) }))
    .filter((p) => p.ts != null)
    .sort((a, b) => b.ts - a.ts);
}

export async function ensurePhotoDir(userId) {
  const dir = photoDir(userId);
  try {
    const info = await FileSystem.getInfoAsync(dir);
    if (!info.exists) await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  } catch (_) { /* tolerate */ }
}

export async function listProgressPhotos(userId) {
  const dir = photoDir(userId);
  await ensurePhotoDir(userId);
  try {
    return orderPhotosInDir(await FileSystem.readDirectoryAsync(dir), dir);
  } catch (_) { return []; }
}

// Copy a picked/captured image into the private dir under a timestamp name.
// `nowMs` is injectable for tests/determinism.
export async function saveProgressPhoto(srcUri, nowMs, userId) {
  if (!srcUri) return null;
  await ensurePhotoDir(userId);
  const dir = photoDir(userId);
  let ts = Number.isFinite(nowMs) ? nowMs : Date.now();
  // Collision guard (gap #11): the filename IS the photo id, so two saves in
  // the same millisecond would copy to an identical path and silently
  // overwrite the earlier photo. Walk `ts` forward until the path is free; the
  // `<ms>.jpg` scheme and the timestampFromName regex are preserved, the id
  // just lands on the next free millisecond. Best-effort: if existence can't be
  // probed we fall through to the copy (matching the old behaviour).
  let uri = `${dir}${ts}.jpg`;
  try {
    // eslint-disable-next-line no-await-in-loop
    while ((await FileSystem.getInfoAsync(uri)).exists) {
      ts += 1;
      uri = `${dir}${ts}.jpg`;
    }
  } catch (_) { /* can't probe; fall through and copy under the current ts */ }
  await FileSystem.copyAsync({ from: srcUri, to: uri });
  return { name: `${ts}.jpg`, uri, ts };
}

function isLegacyPhotoUri(uri) {
  if (typeof uri !== 'string') return false;
  if (!uri.startsWith(BASE_DIR)) return false;
  if (uri.startsWith(`${BASE_DIR}users/`)) return false;
  return /^\d+\.jpg$/.test(uri.slice(BASE_DIR.length));
}

export function isProgressPhotoUriForUser(userId, uri) {
  if (typeof uri !== 'string') return false;
  if (userId && uri.startsWith(photoDir(userId))) return true;
  return isLegacyPhotoUri(uri);
}

export async function deleteProgressPhoto(userIdOrUri, maybeUri) {
  const hasUser = maybeUri !== undefined;
  const userId = hasUser ? userIdOrUri : null;
  const uri = hasUser ? maybeUri : userIdOrUri;
  if (hasUser && !isProgressPhotoUriForUser(userId, uri)) return false;
  if (!hasUser && typeof uri === 'string' && !uri.startsWith(BASE_DIR)) return false;
  try { await FileSystem.deleteAsync(uri, { idempotent: true }); return true; } catch (_) { return false; }
}

// ── Owner marker (E10 read-only lapse views, hostile review #2) ─────────────
//
// The photo directory is shared per-DEVICE, not per-account. The Pro screen
// has always shown whatever the directory holds, but the read-only lapse view
// is granted by a route guard, and that guard must not hand account B a
// gallery of account A's body photos on a shared device. A tiny sidecar file
// records which signed-in user the photos belong to; the guard only opens the
// view-only gallery for that user. The marker is (re)stamped whenever a Pro
// user uses the screen, so existing installs pick it up on their next visit;
// with no marker the check fails CLOSED (ProLocked, never the gallery).

export async function markPhotosOwner(userId) {
  if (!userId) return;
  try {
    await ensurePhotoDir();
    await FileSystem.writeAsStringAsync(LEGACY_OWNER_FILE, String(userId));
  } catch (_) { /* best-effort; the guard fails closed without it */ }
}

/**
 * Whether this device's photos may be shown READ-ONLY to `userId`: there is
 * at least one photo AND the owner marker matches. Unset marker, mismatch or
 * any read failure all answer false (fail closed).
 */
export async function photosViewableBy(userId) {
  if (!userId) return false;
  try {
    const scoped = await listProgressPhotos(userId);
    if (scoped.length > 0) return true;
    const legacy = await listProgressPhotos();
    if (legacy.length === 0) return false;
    const owner = await FileSystem.readAsStringAsync(LEGACY_OWNER_FILE);
    return String(owner).trim() === String(userId);
  } catch (_) { return false; }
}

export async function wipeProgressPhotoDirectory() {
  await FileSystem.deleteAsync(BASE_DIR, { idempotent: true });
  return true;
}
