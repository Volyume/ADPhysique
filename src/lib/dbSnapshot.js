// COMP-009 — automatic SQLite snapshots, the data-loss safety net.
//
// A byte-for-byte copy of the live database file taken (a) before any pending
// schema migration runs and (b) before a destructive account switch. This is
// deliberately NOT dataBackup.js's JSON dump: a file copy is faster, smaller,
// and schema-faithful at the PRE-migration version (a JSON dump would be
// re-interpreted through current code). Rolling-N retention keeps the most
// recent few; a snapshot failure is always logged-and-ignored so it can never
// block a migration or a sign-in.
//
// Uses expo-file-system/legacy to match dataBackup.js / SettingsDataScreen.js
// (no new FS API, no new dependency).

import * as FileSystem from 'expo-file-system/legacy';
import { logWarn } from './errorLog';

const SQLITE_DIR = `${FileSystem.documentDirectory}SQLite/`;
// expo-sqlite's fixed location for openDatabaseAsync('volyume.db').
const DB_PATH = `${SQLITE_DIR}volyume.db`;
// Exported for verifyUserWipeClean (database.js), which checks this
// directory directly during the sign-out wipe-verify pass.
export const SNAP_DIR = `${FileSystem.documentDirectory}snapshots/`;
const KEEP = 3; // rolling-N retention (a full DB copy is larger than a delta)
const RESTORE_STAGE = `${SQLITE_DIR}volyume-restore-stage.db`;
const RESTORE_ROLLBACK = `${SQLITE_DIR}volyume-restore-rollback.db`;
const RESTORE_STATE = `${SQLITE_DIR}volyume-restore-state.json`;

// ── Pure helpers (unit-tested; no FS) ────────────────────────────────────────

// Filenames embed the kind + an epoch-ms stamp so they parse unambiguously and
// sort numerically: volyume_v70_to_v71_<ms>.db / volyume_accountswitch_<ms>.db
export function snapshotName(kind, { fromVersion, toVersion, at } = {}) {
  const ms = at ?? Date.now();
  if (kind === 'accountswitch') return `volyume_accountswitch_${ms}.db`;
  if (kind === 'prerestore') return `volyume_prerestore_${ms}.db`;
  return `volyume_v${fromVersion}_to_v${toVersion}_${ms}.db`;
}

export function parseSnapshotName(name) {
  if (typeof name !== 'string' || !name.endsWith('.db')) return null;
  const mig = name.match(/^volyume_v(\d+)_to_v(\d+)_(\d+)\.db$/);
  if (mig) {
    return { kind: 'migration', fromVersion: Number(mig[1]), toVersion: Number(mig[2]), createdAt: Number(mig[3]) };
  }
  const acc = name.match(/^volyume_accountswitch_(\d+)\.db$/);
  if (acc) return { kind: 'accountswitch', createdAt: Number(acc[1]) };
  // Finding 5: the copy taken immediately before a restore overwrites the live
  // database. It is parsed as a first-class snapshot deliberately, so it is
  // listed, labelled and pruned like any other — an unparsed name would be
  // invisible to the user AND immortal, since sortSnapshotNames drops what it
  // cannot parse and pruneSnapshots only ever deletes from that sorted list.
  const pre = name.match(/^volyume_prerestore_(\d+)\.db$/);
  if (pre) return { kind: 'prerestore', createdAt: Number(pre[1]) };
  return null;
}

export function labelForSnapshot(meta) {
  if (!meta) return 'Snapshot';
  const when = new Date(meta.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  if (meta.kind === 'accountswitch') return `Before account switch · ${when}`;
  if (meta.kind === 'prerestore') return `Before restoring a snapshot · ${when}`;
  return `Before update to v${meta.toVersion} · ${when}, automatic`;
}

// Newest-first by embedded timestamp. Names that don't parse sort last.
export function sortSnapshotNames(names) {
  return [...names]
    .filter(n => parseSnapshotName(n))
    .sort((a, b) => parseSnapshotName(b).createdAt - parseSnapshotName(a).createdAt);
}

// ── FS operations (defensive; never throw to the caller) ─────────────────────

// ── Verification (adversarial audit 2026-08-26, finding 5) ───────────────────
//
// BACKUP TRUTH. Nothing here ever checked that a snapshot was a usable
// database. copyAsync was called, its promise resolved, and the file was
// thereafter presented to the user as "an automatic safety copy" with a
// friendly label and a byte size. A copy that ran out of disk part-way, or
// landed empty, looked exactly the same on that screen. So the one screen a
// user reaches when something has already gone wrong could be offering them
// nothing, and they would only find out at the moment they needed it.
//
// Restore made that worse rather than better: it copied the snapshot straight
// over the live database and deleted the WAL sidecars. If the snapshot was
// unusable, the user ended up with neither their current data nor the backup.
// The confirmation dialog says "This cannot be undone", which was true, but
// understated: the failure could take the good copy with it.
//
// So a snapshot is now opened and read before it is trusted, at both ends:
// when it is written (a bad copy is deleted rather than listed) and before a
// restore overwrites anything (an unusable snapshot is refused, and the live
// database is copied aside first).
//
// WHY OPENING IT IS THE RIGHT TEST AND A SIZE CHECK IS NOT. The database is
// SQLCipher-encrypted, so a snapshot is a copy of the ciphertext. A file can be
// the right size, have a plausible header, and still be unopenable because the
// key that encrypted it is not the key we hold now — which is precisely the
// case after a key loss, the situation where someone reaches for a backup.
// Only an actual open with the current key answers the question that matters.

/** SQLite's own minimum: the file header alone is 100 bytes, one page is 512. */
const MIN_PLAUSIBLE_DB_BYTES = 512;

/**
 * Opens a copy of `uri` and reads from it, to establish that it really is a
 * database this app can restore.
 *
 * Runs against a COPY in the SQLite directory under a unique name, never the
 * snapshot itself: expo-sqlite hands back the same ref-counted native
 * connection for every open of one path (see dbCrypto.closeQuietly), so
 * reusing a name would inherit a previous probe's PRAGMA key state and answer
 * about the wrong file.
 *
 * @returns {Promise<{ok: boolean, reason: string, mode?: string,
 *   userVersion?: number, tables?: number}>} never throws
 */
export async function verifySnapshot(uri) {
  // eslint-disable-next-line global-require
  const SQLite = require('expo-sqlite');
  const dir = `${FileSystem.documentDirectory}SQLite/`;
  const probeName = `volyume-verify-${Date.now()}-${Math.floor(Math.random() * 1e6)}.db`;
  const probePath = `${dir}${probeName}`;
  let handle = null;

  const cleanup = async () => {
    if (handle) {
      // A probe handle that will not close stays live and would poison the
      // next open of this path. Nothing here is destructive, so logging and
      // moving on is safe, but the file must still go.
      try { await handle.closeAsync(); } catch (e) { logWarn('database.snapshot.verify.close', e?.message ?? 'close failed'); }
    }
    for (const suffix of ['', '-wal', '-shm']) {
      try { await FileSystem.deleteAsync(`${probePath}${suffix}`, { idempotent: true }); } catch (_) { /* best-effort */ }
    }
  };

  try {
    const info = await FileSystem.getInfoAsync(uri).catch(() => null);
    if (!info?.exists) return { ok: false, reason: 'missing' };
    if ((info.size ?? 0) < MIN_PLAUSIBLE_DB_BYTES) return { ok: false, reason: 'truncated' };

    await FileSystem.makeDirectoryAsync(dir, { intermediates: true }).catch(() => {});
    await FileSystem.copyAsync({ from: uri, to: probePath });
    handle = await SQLite.openDatabaseAsync(probeName);

    // Keyed first, because that is what a snapshot of this app normally is.
    // Plaintext second and deliberately: the app has a documented plaintext
    // fallback (F-002), a snapshot taken during one is plaintext, and
    // openEncryptedDb re-encrypts a plaintext database on the next launch, so
    // such a snapshot IS restorable and refusing it would be a false negative.
    let mode = null;
    try {
      // eslint-disable-next-line global-require
      const { getOrCreateDbKey, attestSqlCipherConnection } = require('./dbCrypto');
      const { key } = await getOrCreateDbKey();
      if (key) {
        const { applied } = await attestSqlCipherConnection(handle, key);
        if (applied) {
          await handle.getAllAsync('SELECT count(*) FROM sqlite_master');
          mode = 'encrypted';
        }
      }
    } catch (_) { mode = null; }

    if (!mode) {
      // The keyed attempt leaves the connection in a state a second PRAGMA key
      // cannot undo, so re-open clean before testing plaintext.
      try { if (handle) await handle.closeAsync(); } catch (_) { /* reported below if it matters */ }
      handle = await SQLite.openDatabaseAsync(probeName);
      try {
        await handle.getAllAsync('SELECT count(*) FROM sqlite_master');
        mode = 'plaintext';
      } catch (_) {
        return { ok: false, reason: 'unreadable' };
      }
    }

    const tables = (await handle.getAllAsync(
      "SELECT count(*) AS n FROM sqlite_master WHERE type = 'table'",
    ))?.[0]?.n ?? 0;
    const userVersion = (await handle.getFirstAsync('PRAGMA user_version'))?.user_version ?? 0;

    // An openable file with no tables is a database in name only. It would
    // restore "successfully" and leave the user staring at an empty app, which
    // is the failure this whole check exists to prevent.
    if (tables === 0) return { ok: false, reason: 'empty', mode, userVersion, tables };

    return { ok: true, reason: 'ok', mode, userVersion, tables };
  } catch (e) {
    return { ok: false, reason: e?.message ? `error: ${e.message}` : 'error' };
  } finally {
    await cleanup();
  }
}

async function copySnapshot(name) {
  await FileSystem.makeDirectoryAsync(SNAP_DIR, { intermediates: true }).catch(() => {});
  // Flush the WAL into the main DB file first, or the byte-for-byte copy can miss
  // recent commits still sitting in volyume.db-wal (WAL mode is on). This is the
  // single choke point for BOTH snapshot callers, so the account-switch path is
  // covered too, not just migrations (audit F-003). Best-effort: a checkpoint
  // failure must never block a snapshot. Lazy require avoids a static import
  // cycle with database.js.
  try {
    // eslint-disable-next-line global-require
    const { checkpointWal } = require('./database');
    await checkpointWal();
  } catch (_) { /* checkpoint best-effort */ }
  const dest = `${SNAP_DIR}${name}`;
  await FileSystem.copyAsync({ from: DB_PATH, to: dest });

  // Finding 5: a copy that resolved is not a copy that worked. Verify before
  // this file is ever offered as a restore point, and delete it if it is not
  // one — an absent snapshot is honest, a broken one listed as "an automatic
  // safety copy" is not.
  const check = await verifySnapshot(dest);
  if (!check.ok) {
    try { await FileSystem.deleteAsync(dest, { idempotent: true }); } catch (_) { /* best-effort */ }
    throw new Error(`snapshot written but unusable (${check.reason})`);
  }

  await pruneSnapshots(KEEP);
  return dest;
}

export async function snapshotBeforeMigration(fromVersion, toVersion) {
  try {
    await copySnapshot(snapshotName('migration', { fromVersion, toVersion }));
  } catch (e) {
    // Never block a migration on a snapshot failure (e.g. disk full).
    logWarn('database.snapshot', e?.message ?? 'snapshot failed');
  }
}

export async function snapshotBeforeAccountSwitch() {
  try {
    await copySnapshot(snapshotName('accountswitch', {}));
  } catch (e) {
    logWarn('database.snapshot.accountswitch', e?.message ?? 'snapshot failed');
  }
}

// Keep the newest `keep` snapshots, delete the rest. Bounds storage growth.
export async function pruneSnapshots(keep = KEEP) {
  try {
    const names = await FileSystem.readDirectoryAsync(SNAP_DIR).catch(() => []);
    const sorted = sortSnapshotNames(names);
    for (const name of sorted.slice(keep)) {
      await FileSystem.deleteAsync(`${SNAP_DIR}${name}`, { idempotent: true }).catch(() => {});
    }
  } catch (e) {
    logWarn('database.snapshot.prune', e?.message ?? 'prune failed');
  }
}

export async function purgeSnapshots() {
  try {
    await FileSystem.deleteAsync(SNAP_DIR, { idempotent: true });
    return true;
  } catch (e) {
    logWarn('database.snapshot.purge', e?.message ?? 'purge failed');
    throw e;
  }
}

// For the restore screen: newest-first list with label + size.
export async function listSnapshots() {
  try {
    const names = sortSnapshotNames(await FileSystem.readDirectoryAsync(SNAP_DIR).catch(() => []));
    const out = [];
    for (const name of names) {
      const meta = parseSnapshotName(name);
      const uri = `${SNAP_DIR}${name}`;
      const info = await FileSystem.getInfoAsync(uri).catch(() => null);
      out.push({ uri, name, label: labelForSnapshot(meta), sizeBytes: info?.size ?? 0, createdAt: meta.createdAt });
    }
    return out;
  } catch (e) {
    logWarn('database.snapshot.list', e?.message ?? 'list failed');
    return [];
  }
}

async function fileExists(uri) {
  return (await FileSystem.getInfoAsync(uri).catch(() => ({ exists: false })))?.exists === true;
}

async function deleteDatabaseFamily(uri) {
  for (const suffix of ['', '-wal', '-shm']) {
    await FileSystem.deleteAsync(`${uri}${suffix}`, { idempotent: true }).catch(() => {});
  }
}

function validRestoreState(value) {
  return value?.version === 1
    && ['prepared', 'live_moved', 'promoted', 'verified'].includes(value.phase)
    && typeof value.preRestore === 'string'
    && value.preRestore.startsWith(SNAP_DIR)
    && value.preRestore.endsWith('.db');
}

async function readRestoreState() {
  if (!(await fileExists(RESTORE_STATE))) return null;
  let parsed;
  try { parsed = JSON.parse(await FileSystem.readAsStringAsync(RESTORE_STATE)); }
  catch (e) { throw new Error(`snapshot restore journal is unreadable: ${e?.message ?? 'invalid JSON'}`); }
  if (!validRestoreState(parsed)) throw new Error('snapshot restore journal is invalid');
  return parsed;
}

async function writeRestoreState(state) {
  const payload = JSON.stringify({ version: 1, ...state });
  await FileSystem.writeAsStringAsync(RESTORE_STATE, payload);
  const readback = await FileSystem.readAsStringAsync(RESTORE_STATE);
  if (readback !== payload) throw new Error('snapshot restore journal readback mismatch');
}

/**
 * Repairs an interrupted restore before the main database is opened.
 * A rollback file always wins until the promoted live file was verified and
 * that fact was durably journalled.  This makes every process-death point
 * converge to either the original live database or a verified replacement.
 */
export async function recoverInterruptedSnapshotRestore() {
  const state = await readRestoreState();
  const rollbackExists = await fileExists(RESTORE_ROLLBACK);

  if (!state) {
    if (rollbackExists) {
      throw new Error('orphaned snapshot rollback preserved for recovery');
    }
    await deleteDatabaseFamily(RESTORE_STAGE);
    return false;
  }

  const liveExists = await fileExists(DB_PATH);
  if (state.phase === 'verified' && liveExists && !rollbackExists) {
    await deleteDatabaseFamily(RESTORE_STAGE);
    await FileSystem.deleteAsync(RESTORE_STATE, { idempotent: true });
    return true;
  }

  if (rollbackExists) {
    // The original live DB was renamed only after an independently verified
    // safety snapshot existed.  Restore it; any promoted candidate still
    // exists at the user's source snapshot and is not the last valid copy.
    if (liveExists) await deleteDatabaseFamily(DB_PATH);
    await FileSystem.moveAsync({ from: RESTORE_ROLLBACK, to: DB_PATH });
  } else if (state.phase === 'prepared' && liveExists) {
    // The process died before touching live. Nothing to roll back.
  } else {
    // The rollback rename may have completed while its directory entry was
    // later lost. Reconstruct from the already verified pre-restore copy
    // before touching whatever currently occupies the live path.
    if (!(await fileExists(state.preRestore))) {
      throw new Error('interrupted restore has no recoverable live database copy');
    }
    await FileSystem.copyAsync({ from: state.preRestore, to: RESTORE_ROLLBACK });
    const safety = await verifySnapshot(RESTORE_ROLLBACK);
    if (!safety.ok) throw new Error(`restore safety copy is unusable (${safety.reason})`);
    if (liveExists) await deleteDatabaseFamily(DB_PATH);
    await FileSystem.moveAsync({ from: RESTORE_ROLLBACK, to: DB_PATH });
  }

  const restored = await verifySnapshot(DB_PATH);
  if (!restored.ok) throw new Error(`rolled-back live database is unusable (${restored.reason})`);
  await deleteDatabaseFamily(RESTORE_STAGE);
  await deleteDatabaseFamily(RESTORE_ROLLBACK);
  await FileSystem.deleteAsync(RESTORE_STATE, { idempotent: true });
  return true;
}

// Restore: copy a snapshot back over the live DB. The caller MUST close the DB
// handle first (closeDatabase) and force a relaunch afterwards — writing over an
// open SQLite file risks corruption. Throws on failure so the UI can report it.
export async function restoreSnapshot(uri) {
  await recoverInterruptedSnapshotRestore();

  // Finding 5: verify BEFORE overwriting. Restoring an unusable snapshot used
  // to destroy the live database on the way to failing, leaving the user with
  // neither copy — the opposite of what this screen is for.
  const check = await verifySnapshot(uri);
  if (!check.ok) {
    const err = new Error(`snapshot is not restorable (${check.reason})`);
    err.code = 'SNAPSHOT_UNUSABLE';
    err.reason = check.reason;
    throw err;
  }

  // A restore is refused unless the live database exists and a VERIFIED safety
  // copy can be made. Full disk is exactly when continuation is least safe.
  if (!(await fileExists(DB_PATH))) throw new Error('live database is missing');
  const preRestore = `${SNAP_DIR}${snapshotName('prerestore', {})}`;
  await FileSystem.makeDirectoryAsync(SNAP_DIR, { intermediates: true });
  await FileSystem.copyAsync({ from: DB_PATH, to: preRestore });
  const safety = await verifySnapshot(preRestore);
  if (!safety.ok) {
    await FileSystem.deleteAsync(preRestore, { idempotent: true }).catch(() => {});
    const err = new Error(`pre-restore safety copy is unusable (${safety.reason})`);
    err.code = 'SNAPSHOT_SAFETY_COPY_FAILED';
    throw err;
  }

  // Stage and independently verify the exact bytes that will be promoted.
  await deleteDatabaseFamily(RESTORE_STAGE);
  await FileSystem.copyAsync({ from: uri, to: RESTORE_STAGE });
  const staged = await verifySnapshot(RESTORE_STAGE);
  if (!staged.ok) {
    await deleteDatabaseFamily(RESTORE_STAGE);
    const err = new Error(`staged snapshot is unusable (${staged.reason})`);
    err.code = 'SNAPSHOT_UNUSABLE';
    err.reason = staged.reason;
    throw err;
  }

  const state = { phase: 'prepared', preRestore };
  await writeRestoreState(state);
  try {
    await FileSystem.moveAsync({ from: DB_PATH, to: RESTORE_ROLLBACK });
    await writeRestoreState({ ...state, phase: 'live_moved' });
    // The old WAL was checkpointed before closeDatabase returned. Delete its
    // now-stale sidecars only after both rollback copies and the journal exist.
    for (const suffix of ['-wal', '-shm']) {
      await FileSystem.deleteAsync(`${DB_PATH}${suffix}`, { idempotent: true }).catch(() => {});
    }
    await FileSystem.moveAsync({ from: RESTORE_STAGE, to: DB_PATH });
    await writeRestoreState({ ...state, phase: 'promoted' });

    const promoted = await verifySnapshot(DB_PATH);
    if (!promoted.ok) throw new Error(`promoted snapshot is unusable (${promoted.reason})`);
    await writeRestoreState({ ...state, phase: 'verified' });

    await deleteDatabaseFamily(RESTORE_ROLLBACK);
    await FileSystem.deleteAsync(RESTORE_STATE, { idempotent: true });
    await pruneSnapshots(KEEP);
  } catch (e) {
    logWarn('database.snapshot.restore', e?.message ?? 'restore failed');
    try { await recoverInterruptedSnapshotRestore(); }
    catch (rollbackError) {
      e.rollbackError = rollbackError;
      e.code = 'SNAPSHOT_ROLLBACK_FAILED';
    }
    throw e;
  }
}
