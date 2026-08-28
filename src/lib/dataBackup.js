// Local backup safety valve.
//
// Cloud sync covers the per-table push/pull, but a full local export is still
// the cleanest way for a user to move everything at once or recover from a
// critical bug. exportBackup() writes the entire local database plus all
// Volyume preferences into one JSON file and hands it to the native share
// sheet (Files app, email, AirDrop, etc.). importBackup() reads such a file
// back and fully restores the app state.

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';

import { BACKUP_TABLES, dumpAllTables, restoreAllTables } from './database';
import { photoDir } from './progressPhotos';
import { isProfileAvatarUriForUser } from './profileAvatar';
import { logInfo } from './errorLog';

const BACKUP_FORMAT = 'volyume-backup';
const BACKUP_FORMAT_VERSION = 2;
export const MAX_BACKUP_BYTES = 25 * 1024 * 1024;
export const MAX_BACKUP_ROWS = 250000;
const MAX_ROWS_PER_TABLE = 100000;
const MAX_PREF_VALUE_CHARS = 1024 * 1024;
const MAX_PREF_TOTAL_CHARS = 5 * 1024 * 1024;

// Every Volyume preference key is namespaced "@volyume_". The crash log is
// transient diagnostics and is deliberately excluded from backups.
const PREF_PREFIX = '@volyume_';
const PREF_EXCLUDE = new Set(['@volyume_crash_log']);
// Entitlement / trial / payment state is authoritative from the cloud ONLY.
// It must never travel in a backup or be written by a restore: a crafted backup
// could otherwise flip the local tier to 'pro' and unlock Pro UI before cloud
// reconciliation (audit F-002). Matched against the @volyume_ key name.
const SENSITIVE_PREF = /(tier|trial|paid|entitle|subscrip|purchase|billing|verified_at|last_supabase_user_id|auth|token|deletion|consent|sync)/i;
function isRestorablePref(k) {
  return k.startsWith(PREF_PREFIX) && !PREF_EXCLUDE.has(k) && !SENSITIVE_PREF.test(k);
}

function isProfilePrefForUser(key, userId) {
  return key === `${PROFILE_PREF_PREFIX}${userId}`;
}

async function dumpPrefs(userId) {
  const allKeys = await AsyncStorage.getAllKeys();
  const keys = allKeys.filter((key) => isRestorablePref(key)
    && (!key.startsWith(PROFILE_PREF_PREFIX) || isProfilePrefForUser(key, userId)));
  const pairs = await AsyncStorage.multiGet(keys);
  const prefs = {};
  for (const [k, v] of pairs) prefs[k] = v;
  return prefs;
}

async function restorePrefs(prefs, userId) {
  if (!prefs || typeof prefs !== 'object') return;
  const entries = Object.entries(prefs)
    .filter(([k]) => isRestorablePref(k)
      && (!k.startsWith(PROFILE_PREF_PREFIX) || isProfilePrefForUser(k, userId)))
    .map(([k, v]) => [k, v == null ? '' : String(v)]);
  if (entries.length) await AsyncStorage.multiSet(entries);
}

// ─── Local-file integrity on restore (T-17) ─────────────────────────────────
//
// A backup is JSON. It carries SQLite rows and preferences, never the private
// image files: progress photos and profile pictures live in the app's own
// document directory and deliberately never travel (progressPhotos.js header,
// device-local by design). A backup restored onto a clean install therefore
// lands rows whose file references point at nothing.
//
// PRODUCT LAW: a restore must never create a reference to a file that does not
// exist. No dead image URI, no broken thumbnail, no tap-to-open of a missing
// file. So every persisted file reference this restore can write is checked
// against the real filesystem BEFORE the write. A reference that resolves is
// kept exactly as it was. One that does not is either cleared (where the rest
// of the row stands on its own) or its row is left out (where the row exists
// only to point at that file). Nothing here creates a placeholder file, and
// nothing tells the user an image came back: an image file that was not in the
// backup is simply not on the device, which is the documented outcome.
//
// The restore-time verdict per reference, and why:
//  - progress_scan_assets.uri / .photo_name  ROW NOT RESTORED when the file is
//    absent. Both columns are NOT NULL and the row exists only to point at one
//    photo; every consumer of an asset row renders it (a thumbnail plus a
//    tap-to-open in ProgressScanHistoryCard, a compare cell in
//    ProgressScanCompare), so there is no image-free remainder worth keeping.
//    Its per-photo quality numbers are already summarised into the session's
//    signals_json.
//  - progress_photo_meta.name  ROW NOT RESTORED when the file is absent. The
//    filename IS the key, and takenAt/pose/the weigh-in snapshot/the note all
//    describe that one image. Every consumer looks the row up by a name it has
//    just read off the filesystem (getPhotoMetaMap over listProgressPhotos), so
//    a row for a missing file is a reference to a file that does not exist and
//    unreachable data at the same time.
//  - custom_foods.photo_url  CLEARED when it names a local file that is absent.
//    The column is nullable and the food row (name, serving, macros) is
//    complete without it, so the food is kept and only the dead reference goes.
//    Remote values are left alone: they are not files on this device.
//  - '@volyume_user_profile_*' avatarUri (a preference blob, same restore path)
//    CLEARED when the local file is absent. ProfileAvatarMark falls back to the
//    chosen Volyume avatar or the initial, so no broken image is shown.
//  - progress_scan_sessions  RESTORED UNCHANGED. The row holds no file
//    reference at all: captured-at, consent version, the estimates, quality,
//    trend and signals are numbers that stand on their own, and every
//    production read of a session already runs without assets (rowToScan
//    builds the whole view model from columns; listProgressScans,
//    getProgressScanCoachSummary and getPreviousAnalysedProgressScans never
//    join assets). The UI guards its photo strip on `scan.assets.length > 0`
//    and shows "Not taken" for an absent pose, so the numeric scan history the
//    backup deliberately preserves survives with no image affordance behind it.

// Profile blobs are the one preference that carries a local file path
// (avatarUri, written by saveLocalProfile in the store).
const PROFILE_PREF_PREFIX = '@volyume_user_profile_';

// Existence probe with a per-restore cache (one backup can reference the same
// file from several rows). A probe that throws counts as ABSENT: unreadable and
// missing look identical to every consumer, so this fails closed.
function makeFileProbe() {
  const cache = new Map();
  return async function fileExists(uri) {
    if (typeof uri !== 'string' || !uri) return false;
    if (cache.has(uri)) return cache.get(uri);
    let exists = false;
    try {
      const info = await FileSystem.getInfoAsync(uri);
      exists = info?.exists === true;
    } catch (_) {
      // Treated as absent on purpose, see above.
      exists = false;
    }
    cache.set(uri, exists);
    return exists;
  };
}

// Where a progress photo file lives for its owner. photoDir() falls back to the
// shared legacy directory for a null user id, which is exactly where a
// pre-per-user row's photo sits.
function photoPathFor(userId, name) {
  if (!userId || !/^\d+\.jpg$/.test(String(name || ''))) return null;
  return `${photoDir(userId ?? null)}${name}`;
}

// A composite key for the (owner, filename) pair. JSON rather than a
// delimiter: a filename cannot collide with another owner's through a
// separator that happens to appear in it, and the source file stays
// plain text (a raw NUL would make git treat this module as binary and
// stop showing its diff in review).
function photoKey(userId, name) {
  return JSON.stringify([userId ?? null, name ?? null]);
}

// Returns { tables, dropped } where `tables` is safe to write: no row in it
// references a file that is not on this device.
async function verifyTableFileReferences(tables, fileExists, currentUserId) {
  const out = { ...(tables || {}) };
  const dropped = {};

  const keptPhotos = new Set();
  if (Array.isArray(out.progress_scan_assets)) {
    const kept = [];
    for (const row of out.progress_scan_assets) {
      // Never trust an absolute URI carried by JSON, even when it happens to
      // exist. Rebuild the only allowed location from the authenticated owner
      // and a canonical Volyume filename; this closes path traversal and
      // arbitrary app-private file deletion through a later gallery action.
      const byName = photoPathFor(currentUserId, row?.photo_name);
      let resolved = null;
      // eslint-disable-next-line no-await-in-loop
      if (byName && await fileExists(byName)) resolved = byName;
      if (!resolved) continue;
      kept.push({ ...row, user_id: currentUserId, uri: resolved });
      keptPhotos.add(photoKey(currentUserId, row?.photo_name));
    }
    dropped.progress_scan_assets = out.progress_scan_assets.length - kept.length;
    out.progress_scan_assets = kept;
  }

  if (Array.isArray(out.progress_photo_meta)) {
    const kept = [];
    for (const row of out.progress_photo_meta) {
      const path = photoPathFor(currentUserId, row?.name);
      // A kept scan asset has already proved that same file exists.
      if (keptPhotos.has(photoKey(currentUserId, row?.name))) {
        kept.push(row);
        continue;
      }
      // eslint-disable-next-line no-await-in-loop
      if (path && await fileExists(path)) kept.push(row);
    }
    dropped.progress_photo_meta = out.progress_photo_meta.length - kept.length;
    out.progress_photo_meta = kept;
  }

  if (Array.isArray(out.custom_foods)) {
    let cleared = 0;
    const rows = [];
    for (const row of out.custom_foods) {
      if (typeof row?.photo_url === 'string' && /^https:\/\//i.test(row.photo_url)
        && row.photo_url.length <= 2048) {
        rows.push(row);
        continue;
      }
      if (row?.photo_url == null || row.photo_url === '') {
        rows.push(row);
        continue;
      }
      cleared += 1;
      rows.push({ ...row, photo_url: null });
    }
    dropped.custom_foods_photo_url = cleared;
    out.custom_foods = rows;
  }

  return { tables: out, dropped };
}

// The same law over the preference half of a backup: the profile blob's
// avatarUri is a path into the app's private avatar directory.
async function verifyPrefFileReferences(prefs, fileExists, currentUserId) {
  if (!prefs || typeof prefs !== 'object') return { prefs, cleared: 0 };
  const out = { ...prefs };
  let cleared = 0;
  for (const [key, value] of Object.entries(out)) {
    if (!isProfilePrefForUser(key, currentUserId) || typeof value !== 'string') continue;
    let profile = null;
    try { profile = JSON.parse(value); } catch (_) { continue; } // not a blob we can read; leave as-is
    if (!profile || typeof profile !== 'object' || Array.isArray(profile)) continue;
    if (!profile.avatarUri) continue;
    if (!isProfileAvatarUriForUser(currentUserId, profile.avatarUri)) {
      out[key] = JSON.stringify({ ...profile, avatarUri: null });
      cleared += 1;
      continue;
    }
    // eslint-disable-next-line no-await-in-loop
    if (await fileExists(profile.avatarUri)) continue;
    out[key] = JSON.stringify({ ...profile, avatarUri: null });
    cleared += 1;
  }
  return { prefs: out, cleared };
}

// Builds the backup object, writes it to a JSON file in the cache directory
// and opens the native share sheet. Returns { fileUri, bytes }.
export async function exportBackup(userId) {
  if (!userId) throw new Error('Sign in before exporting a backup.');
  const { schemaVersion, tables } = await dumpAllTables(userId);
  const prefs = await dumpPrefs(userId);

  const payload = {
    format: BACKUP_FORMAT,
    formatVersion: BACKUP_FORMAT_VERSION,
    schemaVersion,
    exportedAt: new Date().toISOString(),
    app: 'Volyume',
    ownerUserId: userId,
    sqlite: tables,
    prefs,
  };

  const json = JSON.stringify(payload);
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const fileUri = `${FileSystem.cacheDirectory}volyume_backup_${stamp}.json`;

  await FileSystem.writeAsStringAsync(fileUri, json, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  if (!(await Sharing.isAvailableAsync())) {
    await FileSystem.deleteAsync(fileUri, { idempotent: true }).catch(() => {});
    throw new Error('Secure sharing is not available on this device.');
  }
  try {
    await Sharing.shareAsync(fileUri, {
      mimeType: 'application/json',
      dialogTitle: 'Save Volyume backup',
      UTI: 'public.json',
    });
  } finally {
    // The chosen target receives its own copy. Do not leave the plaintext
    // Article 9 dataset behind in the app cache after the share sheet closes.
    await FileSystem.deleteAsync(fileUri, { idempotent: true }).catch(() => {});
  }

  return { fileUri: null, bytes: json.length, temporaryFileRemoved: true };
}

function assertBackupShape(parsed, currentUserId) {
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)
    || !parsed.sqlite || typeof parsed.sqlite !== 'object' || Array.isArray(parsed.sqlite)) {
    throw new Error('That file is not a Volyume backup.');
  }
  if (parsed.formatVersion >= 2 && parsed.ownerUserId !== currentUserId) {
    throw new Error('That backup belongs to a different account.');
  }
  const allowedTables = new Set(BACKUP_TABLES);
  let totalRows = 0;
  for (const [table, rows] of Object.entries(parsed.sqlite)) {
    if (!allowedTables.has(table) || !Array.isArray(rows) || rows.length > MAX_ROWS_PER_TABLE) {
      throw new Error('That backup has an unsupported table shape.');
    }
    totalRows += rows.length;
    if (totalRows > MAX_BACKUP_ROWS) throw new Error('That backup contains too many records.');
    for (const row of rows) {
      if (!row || typeof row !== 'object' || Array.isArray(row) || row.user_id !== currentUserId) {
        throw new Error('That backup contains records for a different account.');
      }
    }
  }
  if (parsed.prefs != null && (typeof parsed.prefs !== 'object' || Array.isArray(parsed.prefs))) {
    throw new Error('That backup has invalid preferences.');
  }
  let prefChars = 0;
  for (const [key, value] of Object.entries(parsed.prefs || {})) {
    if (typeof key !== 'string' || typeof value !== 'string' || value.length > MAX_PREF_VALUE_CHARS) {
      throw new Error('That backup has invalid preferences.');
    }
    if (key.startsWith(PROFILE_PREF_PREFIX) && !isProfilePrefForUser(key, currentUserId)) {
      throw new Error('That backup contains a profile for a different account.');
    }
    prefChars += value.length;
    if (prefChars > MAX_PREF_TOTAL_CHARS) throw new Error('That backup contains too many preferences.');
  }
}

// Lets the user pick a .json backup, validates it, and restores everything.
// Returns { restored: true, counts } or { cancelled: true }.
export async function importBackup(currentUserId) {
  if (!currentUserId) throw new Error('Sign in before restoring a backup.');
  const picked = await DocumentPicker.getDocumentAsync({
    type: ['application/json', 'text/plain', '*/*'],
    copyToCacheDirectory: true,
  });

  // expo-document-picker v12 returns { canceled, assets: [...] }
  if (picked?.canceled || picked?.type === 'cancel') {
    return { cancelled: true };
  }
  const asset = picked?.assets?.[0];
  const uri = asset?.uri || picked?.uri;
  if (!uri) throw new Error('No file was selected.');
  const declaredSize = Number(asset?.size ?? picked?.size);
  if (Number.isFinite(declaredSize) && declaredSize > MAX_BACKUP_BYTES) {
    throw new Error('That backup is too large to restore safely.');
  }

  const raw = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.UTF8,
  });
  if (raw.length > MAX_BACKUP_BYTES) throw new Error('That backup is too large to restore safely.');

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (_) {
    throw new Error('That file is not a valid Volyume backup (not JSON).');
  }

  if (parsed?.format !== BACKUP_FORMAT || !parsed?.sqlite) {
    throw new Error('That file is not a Volyume backup.');
  }
  // formatVersion must be present AND in the supported range. Missing or
  // undefined fails the previous `>` check silently (undefined > 1 is
  // false), so v0 / pre-version backups would be applied to current tables
  // with potentially incompatible row shapes.
  const fv = parsed.formatVersion;
  if (typeof fv !== 'number' || fv < 1) {
    throw new Error(
      'This backup is missing a version marker. It may be from a pre-release build; export a fresh backup from this version of the app.',
    );
  }
  if (fv > BACKUP_FORMAT_VERSION) {
    throw new Error(
      'This backup was made by a newer version of Volyume. Update the app, then import again.',
    );
  }
  assertBackupShape(parsed, currentUserId);

  // T-17: nothing that names a missing file reaches the database or the
  // preferences. This runs BEFORE the write, not as a clean-up afterwards,
  // so there is no window in which a dead reference exists at all.
  const fileExists = makeFileProbe();
  const { tables: safeTables, dropped } = await verifyTableFileReferences(
    parsed.sqlite, fileExists, currentUserId,
  );
  const { prefs: safePrefs, cleared: avatarsCleared } = await verifyPrefFileReferences(
    parsed.prefs, fileExists, currentUserId,
  );

  await restoreAllTables({ tables: safeTables }, currentUserId);
  await restorePrefs(safePrefs, currentUserId);

  // Counts report what was actually RESTORED, not what the file contained,
  // so nothing downstream can tell the user an image came back when it did
  // not. `dropped` states the difference plainly for the same reason.
  const counts = {};
  for (const [t, rows] of Object.entries(safeTables)) {
    counts[t] = Array.isArray(rows) ? rows.length : 0;
  }
  const missingFiles = { ...dropped, profile_avatar_uri: avatarsCleared };
  logInfo('dataBackup.importBackup.done', 'restore complete', { missingFiles });
  return { restored: true, counts, missingFiles, exportedAt: parsed.exportedAt };
}
