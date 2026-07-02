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

// The DB key must be reachable whenever the app runs, including a background
// launch while the device is still locked (background fetch, a notification tap
// that boots the app locked). SecureStore's default accessibility is
// WHEN_UNLOCKED, so a locked-device read throws `User interaction is not
// allowed` (Sentry VOLYUME-1N, audit S-002 pt2). AFTER_FIRST_UNLOCK keeps the
// item readable once the device has been unlocked at least once since boot —
// the standard choice for a service credential the app needs unattended. The
// attribute is applied on WRITE; existing keys keep their prior accessibility
// until next rewritten, and the F-001 guards mean any residual locked-read
// failure is a recoverable blocked-start, never a key rotation. iOS-only
// semantics; the option is a documented no-op on the Android keystore.
const KEY_OPTS = { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK };

function toHex(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length; i += 1) s += bytes[i].toString(16).padStart(2, '0');
  return s;
}

// Monitoring signal for the fail-open path (audit SC-5): the DB opened
// PLAINTEXT instead of encrypted. This runs mid-DB-open with no user id
// and no usable SQLite handle, so engineTelemetry (which persists to the
// local engine_telemetry table and needs a uid) cannot carry it; logError
// with this distinctive scope is the seam — it reaches the on-device ring
// buffer AND Sentry, where the scope is alertable. `stage` only; no PII.
function emitPlaintextFallback(stage) {
  try {
    logError('dbCrypto.plaintextFallback', new Error(`db opened plaintext (${stage})`), { stage });
  } catch (_) { /* monitoring must never break the open */ }
}

// Read the stored key with a few retries. SecureStore can fail transiently
// right after boot (the OS keystore isn't ready yet); a read FAILURE must never
// be treated as "no key", because that would mint a replacement and orphan an
// existing encrypted DB (F-001). Returns { value, failed }: failed=true only
// when every attempt threw.
async function readStoredKey(attempts = 3) {
  for (let i = 0; i < attempts; i += 1) {
    try {
      // eslint-disable-next-line no-await-in-loop
      return { value: await SecureStore.getItemAsync(KEY_ID, KEY_OPTS), failed: false };
    } catch (e) {
      logError('dbCrypto.getKey', e, { attempt: i });
      // eslint-disable-next-line no-await-in-loop
      if (i < attempts - 1) await new Promise((r) => setTimeout(r, 150 * (i + 1)));
    }
  }
  return { value: null, failed: true };
}

/**
 * Per-device SQLCipher key (64 hex chars / 256-bit), created once, kept in
 * SecureStore. Returns { key, status }:
 *   'existing'    — a valid key was already stored (safe to open encrypted).
 *   'created'     — no key existed; a fresh one was generated AND persisted.
 *   'unavailable' — SecureStore read threw on every attempt, OR a fresh key
 *                   could not be persisted. The caller must NOT open or migrate
 *                   an encrypted DB in this state: a transient read failure must
 *                   never replace a real key, and an unpersisted key must never
 *                   encrypt data (the next launch would generate a different key
 *                   and the DB would be unreadable). key is null when unavailable.
 */
export async function getOrCreateDbKey() {
  const { value, failed } = await readStoredKey();
  // A read failure is NOT "no key" — never mint a replacement over a real one.
  if (failed) return { key: null, status: 'unavailable' };
  if (value && /^[0-9a-f]{64}$/.test(value)) return { key: value, status: 'existing' };
  // Genuinely no valid key stored → create one, but only report it as usable if
  // it actually persisted. An unpersisted key must never encrypt data.
  const fresh = toHex(await Crypto.getRandomBytesAsync(32));
  try {
    await SecureStore.setItemAsync(KEY_ID, fresh, KEY_OPTS);
  } catch (e) {
    logError('dbCrypto.setKey', e, {});
    return { key: null, status: 'unavailable' };
  }
  return { key: fresh, status: 'created' };
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
  const { key, status } = await getOrCreateDbKey();

  // Key unavailable (SecureStore read threw on every attempt, or a fresh key
  // could not be persisted). Do NOT open or migrate an encrypted DB with a
  // transient/unpersisted key — that could orphan an existing encrypted DB or
  // encrypt under a key that won't survive to the next launch (F-001). Open the
  // DB file as-is: if it reads (plaintext, or a brand-new file) use it
  // unencrypted; if it does NOT read it is almost certainly an existing
  // encrypted DB we cannot unlock right now, so surface a recoverable error
  // rather than mint a new key/DB and destroy the user's data. The next launch,
  // with SecureStore back, opens it normally.
  if (status === 'unavailable' || !key) {
    const fb = await SQLite.openDatabaseAsync(DB_NAME);
    if (await readable(fb)) {
      emitPlaintextFallback('key_unavailable');
      return { db: fb, encrypted: false };
    }
    try { await fb.closeAsync(); } catch (_) {}
    const err = new Error('SQLCipher key unavailable and existing DB is not plaintext-readable');
    logError('dbCrypto.keyUnavailable', err, {});
    throw err;
  }

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
      // CRITICAL (audit 2026-07-01): determine whether the LIVE db file actually
      // exists BEFORE probing it. keyed()/openDatabaseAsync CREATES an empty db
      // when the file is absent, and an empty keyed db reads as 'readable' — so
      // probing first would report live=true after an interrupted swap (where
      // volyume.db was moved to the backup and never replaced), and we would
      // then DELETE the backup: the user's only copy of their data. Gate on the
      // real file existing; if volyume.db is gone, the swap was interrupted and
      // the backup IS the live data — restore it, never fabricate over it.
      const liveInfo = await FileSystem.getInfoAsync(path(DB_NAME));
      let live = false;
      if (liveInfo.exists) {
        let probe = await keyed(SQLite, key);
        live = (await readable(probe)) || await (async () => { try { await probe.closeAsync(); } catch (_) {} const p = await SQLite.openDatabaseAsync(DB_NAME); const r = await readable(p); try { await p.closeAsync(); } catch (_) {} return r; })();
        try { await probe.closeAsync(); } catch (_) {}
      }
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
    // Neither keyed-readable nor plaintext-readable. A brand-new user's file is
    // empty and DOES read keyed (handled at step 1), so reaching here means a
    // real file exists that the current key can't unlock and isn't plaintext — a
    // wrong-key or corrupt DB. Do NOT silently create a new encrypted DB over it
    // (that would discard possibly-recoverable data). Preserve it aside (never
    // delete), then start fresh, and only claim encrypted once the fresh DB
    // verifies readable (F-001).
    try { await plain.closeAsync(); } catch (_) {}
    try {
      const info = await FileSystem.getInfoAsync(path(DB_NAME));
      if (info.exists) {
        for (const s of ['-wal', '-shm']) { try { await FileSystem.deleteAsync(`${path(DB_NAME)}${s}`, { idempotent: true }); } catch (_) {} }
        try { await FileSystem.deleteAsync(path('volyume-unreadable.db'), { idempotent: true }); } catch (_) {}
        await FileSystem.moveAsync({ from: path(DB_NAME), to: path('volyume-unreadable.db') });
        logError('dbCrypto.unreadableMovedAside', new Error('existing DB unreadable with current key; preserved as volyume-unreadable.db'), {});
      }
    } catch (e) { logError('dbCrypto.moveAside', e, {}); }
    db = await keyed(SQLite, key);
    if (await readable(db)) return { db, encrypted: true };
    // Even a fresh keyed DB isn't readable → SQLCipher unavailable on this build.
    // Fall back to a working plaintext handle rather than return a broken one.
    try { await db.closeAsync(); } catch (_) {}
    const fb = await SQLite.openDatabaseAsync(DB_NAME);
    emitPlaintextFallback('sqlcipher_unavailable');
    return { db: fb, encrypted: false };
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
    try {
      const fb = await SQLite.openDatabaseAsync(DB_NAME);
      emitPlaintextFallback('migrate_failed');
      return { db: fb, encrypted: false };
    }
    catch (e2) { logError('dbCrypto.fallbackOpen', e2, {}); throw e2; }
  }
}
