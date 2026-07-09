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
 *
 * Privacy hardening (safety-privacy-blueprint.md §6.2/§6.3, wave 5):
 *  - EXIF/GPS strip: every saved photo (camera capture via ProgressGhostCapture
 *    and library import, both of which funnel through `saveProgressPhoto`) is
 *    copied through `stripJpegExifBytes` instead of a byte-for-byte copy, so a
 *    picked photo's embedded GPS/maker EXIF never lands in the device-local
 *    store. Pure segment-level strip: lossless, no re-encode, no quality
 *    change (see the function's own header for the exact scope).
 *  - iOS backup exclusion: `ensurePhotoDir` best-effort marks the per-user
 *    photo directory excluded from iCloud/iTunes device backups via the
 *    native `progress-scan-image` module. Called on every directory
 *    creation AND every existing-install pass (list/save both call
 *    `ensurePhotoDir` first), which doubles as the "heal existing installs"
 *    requirement. Android has no equivalent attribute; `allowBackup=false`
 *    already covers Android app-wide, and the native module no-ops there.
 */
import * as FileSystem from 'expo-file-system/legacy';
import { logError } from './errorLog';

const BASE_DIR = `${FileSystem.documentDirectory}progress_photos/`;
const LEGACY_OWNER_FILE = `${BASE_DIR}owner.txt`;

// ── Pure-JS base64 <-> bytes (no Buffer in RN; house pattern from restSound.js) ──

const BASE64_TABLE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

export function bytesToBase64(bytes) {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let bin = '';
  const chunkSize = 0x2000; // avoid a call-stack blowup from String.fromCharCode(...bigArray)
  for (let i = 0; i < arr.length; i += chunkSize) {
    bin += String.fromCharCode.apply(null, arr.subarray(i, i + chunkSize));
  }
  if (typeof btoa === 'function') return btoa(bin);
  let out = '';
  for (let i = 0; i < bin.length; i += 3) {
    const a = bin.charCodeAt(i);
    const b = i + 1 < bin.length ? bin.charCodeAt(i + 1) : 0;
    const c = i + 2 < bin.length ? bin.charCodeAt(i + 2) : 0;
    const tri = (a << 16) | (b << 8) | c;
    out += BASE64_TABLE[(tri >> 18) & 63] + BASE64_TABLE[(tri >> 12) & 63]
      + (i + 1 < bin.length ? BASE64_TABLE[(tri >> 6) & 63] : '=')
      + (i + 2 < bin.length ? BASE64_TABLE[tri & 63] : '=');
  }
  return out;
}

export function base64ToBytes(base64) {
  const clean = String(base64 || '').replace(/[\r\n]/g, '');
  let bin;
  if (typeof atob === 'function') {
    bin = atob(clean);
  } else {
    const lookup = new Map();
    for (let i = 0; i < BASE64_TABLE.length; i++) lookup.set(BASE64_TABLE[i], i);
    let bits = 0;
    let value = 0;
    const chars = [];
    for (const ch of clean) {
      if (ch === '=') break;
      const v = lookup.get(ch);
      if (v === undefined) continue;
      value = (value << 6) | v;
      bits += 6;
      if (bits >= 8) {
        bits -= 8;
        chars.push((value >> bits) & 0xff);
      }
    }
    bin = String.fromCharCode(...chars);
  }
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

// ── EXIF/GPS strip (safety-privacy-blueprint.md §6.2) ───────────────────────
//
// A pure JPEG-segment-level strip: no dependency, no re-encode, no quality
// change. Walks the marker stream from SOI and drops APP1 (Exif — this is
// where GPS and MakerNote IFDs live per the Exif spec) and standalone COM
// (free-text comment) segments. Every other segment, including SOF/DHT/DQT
// and the entropy-coded scan data itself, is copied byte-for-byte, so the
// decoded image is pixel-identical. APP0 (JFIF), APP2 (commonly an ICC
// colour profile) and APP14 (Adobe colour-transform marker) are deliberately
// LEFT ALONE: those affect how a decoder renders colour, not privacy, and
// touching them risks a visible quality/colour regression, which is
// out of scope here. Anything that doesn't parse as a well-formed marker
// stream (truncated length, missing SOI) is returned UNCHANGED rather than
// risk corrupting the user's photo — this is a strip, never a repair tool.
export function stripJpegExifBytes(bytes) {
  const buf = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  if (buf.length < 4 || buf[0] !== 0xFF || buf[1] !== 0xD8) return buf;

  const out = new Uint8Array(buf.length);
  out[0] = 0xFF;
  out[1] = 0xD8;
  let outPos = 2;
  let offset = 2;
  let safe = true;

  while (safe && offset < buf.length) {
    if (buf[offset] !== 0xFF) { safe = false; break; }
    const marker = buf[offset + 1];
    if (marker === undefined) { safe = false; break; }

    // Standalone markers carry no length field: SOI (already consumed),
    // TEM (0x01), RSTn (0xD0-0xD7) and EOI (0xD9).
    if (marker === 0xD8 || marker === 0x01 || (marker >= 0xD0 && marker <= 0xD9)) {
      out[outPos] = 0xFF;
      out[outPos + 1] = marker;
      outPos += 2;
      offset += 2;
      if (marker === 0xD9) offset = buf.length; // EOI: nothing follows
      continue;
    }

    if (offset + 4 > buf.length) { safe = false; break; }
    const length = (buf[offset + 2] << 8) | buf[offset + 3]; // includes these 2 length bytes
    const segmentEnd = offset + 2 + length;
    if (length < 2 || segmentEnd > buf.length) { safe = false; break; }

    const isApp1Exif = marker === 0xE1;
    const isComment = marker === 0xFE;
    if (!isApp1Exif && !isComment) {
      out.set(buf.subarray(offset, segmentEnd), outPos);
      outPos += segmentEnd - offset;
    }

    if (marker === 0xDA) {
      // Start Of Scan: its own header is handled above; everything from here
      // to end-of-file is entropy-coded image data (may itself contain 0xFF
      // bytes, always stuffed with a following 0x00) plus the trailing EOI.
      // Copy verbatim rather than attempt to parse it.
      out.set(buf.subarray(segmentEnd), outPos);
      outPos += buf.length - segmentEnd;
      offset = buf.length;
      break;
    }
    offset = segmentEnd;
  }

  if (!safe) return buf; // malformed mid-parse: never risk corrupting the photo
  return out.subarray(0, outPos);
}

// Copies `from` to `to`, stripping Exif/GPS metadata along the way. Falls
// back to a raw byte copy if the source can't be read/written as base64 for
// any reason (matches the old copyAsync failure surface — a save should
// never fail solely because the strip step's string plumbing hiccups).
async function copyPhotoStrippingExif(from, to) {
  try {
    const base64 = await FileSystem.readAsStringAsync(from, { encoding: FileSystem.EncodingType.Base64 });
    const stripped = stripJpegExifBytes(base64ToBytes(base64));
    await FileSystem.writeAsStringAsync(to, bytesToBase64(stripped), { encoding: FileSystem.EncodingType.Base64 });
  } catch (e) {
    logError('progressPhotos.copyStrippingExif', e, {});
    await FileSystem.copyAsync({ from, to });
  }
}

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
  // iOS backup exclusion (safety-privacy-blueprint.md §6.3): re-applied every
  // time this runs, both right after creation and as a healing pass for
  // existing installs whose directory predates this. Android has no
  // equivalent attribute (allowBackup=false already covers Android
  // app-wide); the native module no-ops there. Best-effort: this must never
  // block a photo save or the gallery listing that calls this first.
  try {
    // eslint-disable-next-line global-require
    const nativeImage = require('progress-scan-image');
    await nativeImage.setExcludedFromBackup?.(dir);
  } catch (_) { /* best-effort */ }
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
  await copyPhotoStrippingExif(srcUri, uri);
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

// Whole-tree wipe (ALL users' photo subfolders). Kept for a distinct future
// full-local-reset path (factory-reset-style, not account-scoped); as of this
// wave `wipeAllUserData` no longer calls this (see
// `wipeProgressPhotoDirectoryForUser` below) — no such distinct full-reset
// caller exists in the app today, so this is currently unused in production
// but preserved as the documented whole-directory primitive per the founder's
// scope-to-account decision (2026-07-09).
export async function wipeProgressPhotoDirectory() {
  await FileSystem.deleteAsync(BASE_DIR, { idempotent: true });
  return true;
}

// Per-user wipe scope (founder decision 2026-07-09, evidence-gaps §7 Q5):
// account removal/sign-out wipes ONLY that account's photo subfolder
// (`progress_photos/users/<safeUserId>/`), never the whole `progress_photos/`
// tree, so a second account's photos on a shared device survive the first
// account's wipe. Requires a real userId — refuses to fall back to the
// shared top-level directory (`photoDir(null)` resolves to `BASE_DIR`, which
// would silently regress to the old whole-tree blast radius this wave fixes).
export async function wipeProgressPhotoDirectoryForUser(userId) {
  if (!userId) {
    throw new Error('wipeProgressPhotoDirectoryForUser requires a userId; refusing to wipe the shared photo directory');
  }
  await FileSystem.deleteAsync(photoDir(userId), { idempotent: true });
  return true;
}
