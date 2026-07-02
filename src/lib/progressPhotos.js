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

const DIR = `${FileSystem.documentDirectory}progress_photos/`;

export function photoDir() { return DIR; }

// Parse the epoch-ms timestamp from a `<ms>.jpg` filename, or null if it isn't
// one of ours (so stray files never crash the gallery).
export function timestampFromName(name) {
  const m = /^(\d+)\.jpg$/.exec(name || '');
  return m ? Number(m[1]) : null;
}

// Newest-first ordering of a raw filename list into display rows. Pure.
export function orderPhotos(names) {
  return (names || [])
    .map((name) => ({ name, uri: DIR + name, ts: timestampFromName(name) }))
    .filter((p) => p.ts != null)
    .sort((a, b) => b.ts - a.ts);
}

export async function ensurePhotoDir() {
  try {
    const info = await FileSystem.getInfoAsync(DIR);
    if (!info.exists) await FileSystem.makeDirectoryAsync(DIR, { intermediates: true });
  } catch (_) { /* tolerate */ }
}

export async function listProgressPhotos() {
  await ensurePhotoDir();
  try {
    return orderPhotos(await FileSystem.readDirectoryAsync(DIR));
  } catch (_) { return []; }
}

// Copy a picked/captured image into the private dir under a timestamp name.
// `nowMs` is injectable for tests/determinism.
export async function saveProgressPhoto(srcUri, nowMs) {
  if (!srcUri) return null;
  await ensurePhotoDir();
  const ts = Number.isFinite(nowMs) ? nowMs : Date.now();
  const uri = `${DIR}${ts}.jpg`;
  await FileSystem.copyAsync({ from: srcUri, to: uri });
  return { name: `${ts}.jpg`, uri, ts };
}

export async function deleteProgressPhoto(uri) {
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

const OWNER_FILE = `${DIR}owner.txt`;

export async function markPhotosOwner(userId) {
  if (!userId) return;
  try {
    await ensurePhotoDir();
    await FileSystem.writeAsStringAsync(OWNER_FILE, String(userId));
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
    const photos = await listProgressPhotos();
    if (photos.length === 0) return false;
    const owner = await FileSystem.readAsStringAsync(OWNER_FILE);
    return String(owner).trim() === String(userId);
  } catch (_) { return false; }
}
