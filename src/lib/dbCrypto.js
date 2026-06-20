/**
 * SQLCipher encryption for the local database (audit F-004).
 *
 * Uses expo-sqlite's BUILT-IN SQLCipher (the `useSQLCipher` build flag in
 * app.json) — no new dependency, no change to the query layer. The key is a
 * per-device 256-bit random value held in the OS keystore (SecureStore).
 *
 * SAFETY INVARIANT (this app is live; users have real local data):
 *   The existing plaintext DB is NEVER deleted or mutated until an encrypted
 *   copy has been written AND verified readable. The plaintext is renamed to a
 *   backup during the swap and only removed once the encrypted DB is promoted
 *   and verified. An interrupted swap self-recovers on the next launch. Any
 *   failure falls back to opening the DB plaintext (working, just unencrypted)
 *   and is logged — encryption must never brick the app or lose data.
 *
 * Device-only: SQLCipher is native, so this path cannot be exercised under the
 * node/jest test runner. The pure key helper is unit-tested; the migration
 * itself MUST be verified on a device with a real, populated DB (incl. the
 * interrupted-swap path) before shipping to users.
 */
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import { logError, logInfo } from './errorLog';

const KEY_ID = 'volyume_db_key_v1';
const DB_NAME = 'volyume.db';

function toHex(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length; i += 1) s += bytes[i].toString(16).padStart(2, '0');
  return s;
}

/** Per-device SQLCipher key (64 hex chars / 256-bit), created once, kept in SecureStore. */
export async function getOrCreateDbKey() {
  let key = null;
  try { key = await SecureStore.getItemAsync(KEY_ID); } catch (e) { logError('dbCrypto.getKey', e, {}); }
  if (key && /^[0-9a-f]{64}$/.test(key)) return key;
  const fresh = toHex(await Crypto.getRandomBytesAsync(32));
  try { await SecureStore.setItemAsync(KEY_ID, fresh); } catch (e) { logError('dbCrypto.setKey', e, {}); }
  return fresh;
}

async function readable(db) {
  try { await db.getAllAsync('SELECT count(*) FROM sqlite_master'); return true; }
  catch (_) { return false; }
}

async function keyed(SQLite, key) {
  const db = await SQLite.openDatabaseAsync(DB_NAME);
  try { await db.execAsync(`PRAGMA key = '${key}'`); } catch (_) { /* probe handles failure */ }
  return db;
}

/**
 * Open volyume.db SQLCipher-encrypted, migrating an existing plaintext DB in
 * place on first run. Returns { db, encrypted }. `encrypted` is false only on
 * the safe plaintext fallback, so callers/telemetry can see the state.
 */
export async function openEncryptedDb(SQLite) {
  const key = await getOrCreateDbKey();
  // eslint-disable-next-line global-require
  const FileSystem = require('expo-file-system/legacy');
  const dir = `${FileSystem.documentDirectory}SQLite/`;
  const path = (n) => `${dir}${n}`;
  const backup = path('volyume-plain-backup.db');
  const encPath = path('volyume-enc.db');

  // 0. Recover an interrupted prior swap: if a plaintext backup is present and
  //    the live DB isn't usable, restore the backup before doing anything else.
  try {
    const bak = await FileSystem.getInfoAsync(backup);
    if (bak.exists) {
      let probe = await keyed(SQLite, key);
      const live = (await readable(probe)) || await (async () => { try { await probe.closeAsync(); } catch (_) {} const p = await SQLite.openDatabaseAsync(DB_NAME); const r = await readable(p); try { await p.closeAsync(); } catch (_) {} return r; })();
      try { await probe.closeAsync(); } catch (_) {}
      if (!live) {
        for (const s of ['', '-wal', '-shm']) { try { await FileSystem.deleteAsync(`${path(DB_NAME)}${s}`, { idempotent: true }); } catch (_) {} }
        await FileSystem.moveAsync({ from: backup, to: path(DB_NAME) });
        logInfo('dbCrypto.recovered', 'restored plaintext backup after interrupted swap');
      } else {
        try { await FileSystem.deleteAsync(backup, { idempotent: true }); } catch (_) {}
      }
    }
  } catch (e) { logError('dbCrypto.recover', e, {}); }

  // 1. Open keyed. If readable, it's already encrypted (or a brand-new file).
  let db = await keyed(SQLite, key);
  if (await readable(db)) return { db, encrypted: true };

  // 2. Not readable keyed: check for plaintext data.
  try { await db.closeAsync(); } catch (_) {}
  let plain = await SQLite.openDatabaseAsync(DB_NAME);
  if (!(await readable(plain))) {
    // Neither keyed nor plaintext: treat as fresh/corrupt — create a new encrypted DB.
    try { await plain.closeAsync(); } catch (_) {}
    db = await keyed(SQLite, key);
    return { db, encrypted: true };
  }

  // 3. Plaintext data exists → migrate, preserving the original until verified.
  try {
    try { await FileSystem.deleteAsync(encPath, { idempotent: true }); } catch (_) {}
    await plain.execAsync(`ATTACH DATABASE '${encPath}' AS encrypted KEY '${key}';`);
    await plain.getAllAsync("SELECT sqlcipher_export('encrypted');");
    await plain.execAsync('DETACH DATABASE encrypted;');
    try { await plain.closeAsync(); } catch (_) {}

    // Verify the encrypted copy reads with the key BEFORE touching the original.
    let verify = await SQLite.openDatabaseAsync('volyume-enc.db');
    try { await verify.execAsync(`PRAGMA key = '${key}'`); } catch (_) {}
    const ok = await readable(verify);
    try { await verify.closeAsync(); } catch (_) {}
    if (!ok) throw new Error('encrypted copy not readable');

    // Swap, plaintext preserved as backup until the encrypted DB is promoted.
    for (const s of ['-wal', '-shm']) { try { await FileSystem.deleteAsync(`${path(DB_NAME)}${s}`, { idempotent: true }); } catch (_) {} }
    await FileSystem.moveAsync({ from: path(DB_NAME), to: backup });
    try {
      await FileSystem.moveAsync({ from: encPath, to: path(DB_NAME) });
    } catch (swapErr) {
      try { await FileSystem.moveAsync({ from: backup, to: path(DB_NAME) }); } catch (_) {}
      throw swapErr;
    }

    db = await keyed(SQLite, key);
    if (await readable(db)) {
      try { await FileSystem.deleteAsync(backup, { idempotent: true }); } catch (_) {}
      logInfo('dbCrypto.migrated', 'local DB encrypted');
      return { db, encrypted: true };
    }
    // Promoted DB unreadable: restore the backup and fall through to plaintext.
    try { await FileSystem.deleteAsync(path(DB_NAME), { idempotent: true }); } catch (_) {}
    try { await FileSystem.moveAsync({ from: backup, to: path(DB_NAME) }); } catch (_) {}
    throw new Error('post-swap DB not readable');
  } catch (e) {
    logError('dbCrypto.migrate', e, {});
    // Fallback: open plaintext so the app works (unencrypted) — never brick.
    try { const fb = await SQLite.openDatabaseAsync(DB_NAME); return { db: fb, encrypted: false }; }
    catch (e2) { logError('dbCrypto.fallbackOpen', e2, {}); throw e2; }
  }
}
