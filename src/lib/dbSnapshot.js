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

// expo-sqlite's fixed location for openDatabaseAsync('volyume.db').
const DB_PATH = `${FileSystem.documentDirectory}SQLite/volyume.db`;
const SNAP_DIR = `${FileSystem.documentDirectory}snapshots/`;
const KEEP = 3; // rolling-N retention (a full DB copy is larger than a delta)

// ── Pure helpers (unit-tested; no FS) ────────────────────────────────────────

// Filenames embed the kind + an epoch-ms stamp so they parse unambiguously and
// sort numerically: volyume_v70_to_v71_<ms>.db / volyume_accountswitch_<ms>.db
export function snapshotName(kind, { fromVersion, toVersion, at } = {}) {
  const ms = at ?? Date.now();
  if (kind === 'accountswitch') return `volyume_accountswitch_${ms}.db`;
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
  return null;
}

export function labelForSnapshot(meta) {
  if (!meta) return 'Snapshot';
  const when = new Date(meta.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  if (meta.kind === 'accountswitch') return `Before account switch · ${when}`;
  return `Before update to v${meta.toVersion} · ${when}, automatic`;
}

// Newest-first by embedded timestamp. Names that don't parse sort last.
export function sortSnapshotNames(names) {
  return [...names]
    .filter(n => parseSnapshotName(n))
    .sort((a, b) => parseSnapshotName(b).createdAt - parseSnapshotName(a).createdAt);
}

// ── FS operations (defensive; never throw to the caller) ─────────────────────

async function copySnapshot(name) {
  await FileSystem.makeDirectoryAsync(SNAP_DIR, { intermediates: true }).catch(() => {});
  const dest = `${SNAP_DIR}${name}`;
  await FileSystem.copyAsync({ from: DB_PATH, to: dest });
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

// Restore: copy a snapshot back over the live DB. The caller MUST close the DB
// handle first (closeDatabase) and force a relaunch afterwards — writing over an
// open SQLite file risks corruption. Throws on failure so the UI can report it.
export async function restoreSnapshot(uri) {
  await FileSystem.copyAsync({ from: uri, to: DB_PATH });
}
