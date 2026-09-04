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

// Locked-device predicate, mirroring supabase.js's _isKeychainLocked (kept as
// a local copy on purpose: this module opens the database and stays
// dependency-light; importing supabase.js here would pull the whole client
// into the DB-open path). "User interaction is not allowed" is the Keychain
// refusing access before the device's first unlock since boot - an EXPECTED
// state for AFTER_FIRST_UNLOCK items on a background wake, not a defect.
function _isKeychainLocked(e) {
  const msg = String(e?.message || e || '');
  return msg.includes('User interaction is not allowed')
    || msg.includes('errSecInteractionNotAllowed');
}

async function readStoredKey(attempts = 3) {
  // Re-triage 2026-08-01 (VOLYUME-2G/2E residue): `locked` is true only when
  // EVERY attempt failed AND every failure was the locked-device refusal, so a
  // mixed or unknown failure is never softened. Classification changes the
  // LOGGING ONLY - the { value, failed } contract, the retry cadence, and the
  // F-001 never-mint-over-a-real-key rule are byte-identical.
  let allLocked = true;
  for (let i = 0; i < attempts; i += 1) {
    try {
      // eslint-disable-next-line no-await-in-loop
      return { value: await SecureStore.getItemAsync(KEY_ID, KEY_OPTS), failed: false, locked: false };
    } catch (e) {
      if (_isKeychainLocked(e)) logInfo('dbCrypto.getKey.locked', 'keychain locked before first unlock, deferring', { attempt: i });
      else { allLocked = false; logError('dbCrypto.getKey', e, { attempt: i }); }
      // eslint-disable-next-line no-await-in-loop
      if (i < attempts - 1) await new Promise((r) => setTimeout(r, 150 * (i + 1)));
    }
  }
  return { value: null, failed: true, locked: allLocked };
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
  const { value, failed, locked } = await readStoredKey();
  // A read failure is NOT "no key" — never mint a replacement over a real one.
  if (failed) return { key: null, status: 'unavailable', locked: !!locked };
  if (value && /^[0-9a-f]{64}$/.test(value)) return { key: value, status: 'existing' };
  // Genuinely no valid key stored → create one, but only report it as usable if
  // it actually persisted. An unpersisted key must never encrypt data.
  const fresh = toHex(await Crypto.getRandomBytesAsync(32));
  try {
    await SecureStore.setItemAsync(KEY_ID, fresh, KEY_OPTS);
    // A resolved keychain write is not positive persistence evidence. Never
    // authorize database creation/migration until the exact key can be read
    // back; otherwise a silent adapter failure encrypts data under an
    // ephemeral key that is lost on the next launch.
    const persisted = await SecureStore.getItemAsync(KEY_ID, KEY_OPTS);
    if (persisted !== fresh) throw new Error('database key write did not persist');
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

// Close a probe handle, reporting failure instead of swallowing it (R2-11
// structural follow-up, 2026-07-11). expo-sqlite hands back the SAME
// ref-counted native connection for every openDatabaseAsync of one path, so a
// probe whose close silently failed stays live: the next "fresh" open reuses
// it, inheriting its PRAGMA key state and - after a file move - its old inode.
// A probe chain that keeps going after a failed close can misclassify the
// database (keyed state read as plaintext or vice versa) and take a
// destructive branch on wrong evidence. Callers on classification-critical
// paths must abort when this returns false.
async function closeQuietly(handle, stage) {
  try { await handle.closeAsync(); return true; }
  catch (e) {
    logError('dbCrypto.close', e, { stage });
    return false;
  }
}

// Recoverable abort: thrown when the open cannot proceed SAFELY this launch
// (e.g. a probe connection would not close, so every later probe is
// untrustworthy). initDatabase resets its init promise on a throw, so the
// next launch (or retry) probes again with clean state - the same contract as
// the keyUnavailable blocked start. Never destructive: nothing has been
// moved or deleted when this is thrown.
function abortOpen(stage, context = null) {
  const err = new Error(`dbCrypto open aborted (${stage})`);
  err.dbCryptoAbort = true;
  logError('dbCrypto.abort', err, context ? { stage, ...context } : { stage });
  return err;
}

/**
 * Opens the database with the key applied, and positively attests that the
 * connection is backed by SQLCipher.
 *
 * FAIL-CLOSED AUDIT (founder law, 2026-08-27). This used to swallow a failing
 * `PRAGMA key` entirely. On a build where SQLCipher is not present the pragma
 * throws, a brand-new empty file then reads perfectly well without it, and the
 * caller's first branch concluded the database was encrypted. So the app
 * reported encrypted: true on a build that has no encryption at all -- and
 * since the Article 9 consent screen now reads that flag to decide what to tell
 * the user about their health data, a false positive there is the exact case
 * the honesty fix was written for.
 *
 * Ordinary SQLite may silently accept an unknown PRAGMA, so "PRAGMA key did
 * not throw" is configuration intent, not encryption evidence.  SQLCipher's
 * non-empty cipher_version is the minimum positive capability proof; callers
 * must also prove the keyed database is readable before claiming encryption.
 */
export async function attestSqlCipherConnection(db, key) {
  let keyAccepted = false;
  let cipherVersion = null;
  // Incident 2026-09-04: when this attestation fails on a fresh install the
  // open aborts and the user sees "Couldn't open your data". The abort used
  // to record only its stage, so three shipped builds could not be told
  // apart between "codec absent" and "codec present, probe wrong". The
  // probe's own facts ride the abort now: whether PRAGMA key was accepted,
  // the raw shape of the cipher_version row (column names only, never the
  // key), and any thrown message.
  const probe = { keyAccepted: false, rowKeys: null, rawType: null, error: null };
  try {
    const escapedKey = String(key).replace(/'/g, "''");
    await db.execAsync(`PRAGMA key = '${escapedKey}'`);
    keyAccepted = true;
    probe.keyAccepted = true;
    const row = await db.getFirstAsync('PRAGMA cipher_version');
    probe.rowKeys = row && typeof row === 'object' ? Object.keys(row) : (row === null ? 'null' : typeof row);
    const raw = row?.cipher_version
      ?? (row && typeof row === 'object' ? Object.values(row)[0] : null);
    probe.rawType = raw === null || raw === undefined ? 'empty' : typeof raw;
    if (typeof raw === 'string' && raw.trim()) cipherVersion = raw.trim();
  } catch (e) { probe.error = String(e?.message ?? e ?? 'unknown').slice(0, 200); }
  return { applied: keyAccepted && Boolean(cipherVersion), cipherVersion, probe };
}

async function keyed(SQLite, key, name = DB_NAME) {
  const db = await SQLite.openDatabaseAsync(name);
  const attestation = await attestSqlCipherConnection(db, key);
  return { db, ...attestation };
}

/**
 * Open volyume.db SQLCipher-encrypted, migrating an existing plaintext DB in
 * place on first run. Returns { db, encrypted }. `encrypted` is false only on
 * the safe plaintext fallback, so callers/telemetry can see the state.
 */
export async function openEncryptedDb(SQLite) {
  const { key, status, locked } = await getOrCreateDbKey();

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
    // FAIL-CLOSED AUDIT (founder law, 2026-08-27), state E. Check whether a
    // database file exists BEFORE opening one, because openDatabaseAsync
    // CREATES it when absent. Without this check, a fresh install whose
    // keychain was briefly unavailable -- a background wake before the device's
    // first unlock is the ordinary way that happens -- created a PLAINTEXT
    // database and returned it. Health data would then be written unencrypted
    // until some later launch happened to migrate it. The expected model for a
    // fresh install is an ENCRYPTED database, so the right answer when we
    // cannot have one is to wait, not to make the wrong kind.
    // Lazily required here as it is everywhere else in this module: the main
    // path's own require sits further down, after this early return.
    // eslint-disable-next-line global-require
    const FS = require('expo-file-system/legacy');
    const existing = await FS.getInfoAsync(`${FS.documentDirectory}SQLite/${DB_NAME}`)
      .catch(() => ({ exists: false }));
    if (!existing?.exists) {
      logInfo('dbCrypto.keyUnavailable.noDatabase', 'no database yet and no key; deferring rather than creating plaintext');
      const err = new Error('SQLCipher key unavailable and no database exists yet');
      err.dbCryptoDeferred = true;
      throw err;
    }
    const fb = await SQLite.openDatabaseAsync(DB_NAME);
    if (await readable(fb)) {
      // Reached only for a database that was ALREADY plaintext. Opening it is
      // not a downgrade: it was never encrypted, and refusing would lock the
      // user out of their own history for nothing.
      emitPlaintextFallback('key_unavailable');
      return { db: fb, encrypted: false };
    }
    await closeQuietly(fb, 'key_unavailable_probe');
    const err = new Error('SQLCipher key unavailable and existing DB is not plaintext-readable');
    // Locked-before-first-unlock is the EXPECTED background-wake state for an
    // AFTER_FIRST_UNLOCK key: the next foreground launch opens normally. The
    // throw is identical either way - only a genuinely unexplained key loss
    // stays an error, because that one really is serious.
    if (locked) logInfo('dbCrypto.keyUnavailable.locked', 'device not yet unlocked since boot, deferring DB open');
    else logError('dbCrypto.keyUnavailable', err, {});
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
        // Probe keyed first, then plaintext - closing fully between probes.
        // A probe that will not close makes every later probe untrustworthy
        // (shared ref-counted native connection), and the branches below
        // move/delete database files on the probes' verdict: abort the open
        // recoverably instead of acting on wrong evidence.
        const { db: probe, applied } = await keyed(SQLite, key);
        live = applied && await readable(probe);
        if (!(await closeQuietly(probe, 'recover_keyed_probe'))) {
          throw abortOpen('recover_keyed_probe_close');
        }
        if (!live) {
          const p = await SQLite.openDatabaseAsync(DB_NAME);
          live = await readable(p);
          if (!(await closeQuietly(p, 'recover_plain_probe'))) {
            throw abortOpen('recover_plain_probe_close');
          }
        }
      }
      if (!liveInfo.exists) {
        // No primary exists: the backup is the only candidate.  Promote it
        // without first creating/deleting a fabricated empty primary.
        await FileSystem.moveAsync({ from: backup, to: path(DB_NAME) });
        logInfo('dbCrypto.recovered', 'restored plaintext backup after interrupted swap');
      } else if (!live) {
        // Both files may contain the user's only recoverable history.  A wrong
        // key and corruption are indistinguishable here, so preserve both and
        // fail closed instead of replacing the newer primary with an older
        // backup on ambiguous evidence.
        throw abortOpen('recover_ambiguous_primary');
      } else {
        try { await FileSystem.deleteAsync(backup, { idempotent: true }); } catch (_) {}
      }
    }
  } catch (e) {
    // Every recovery failure escapes.  Continuing would let the next keyed
    // open create an empty primary after a failed backup promotion, and a
    // second launch could then discard the last valid backup as "stale".
    if (e?.dbCryptoAbort) throw e;
    logError('dbCrypto.recover', e, {});
    throw abortOpen('recover_failed');
  }

  // 1. Open keyed. If readable, it's already encrypted (or a brand-new file).
  const liveExistedBeforeKeyedOpen = (await FileSystem.getInfoAsync(path(DB_NAME)).catch(() => ({ exists: false })))?.exists === true;
  let { db, applied: keyApplied, probe: keyProbe } = await keyed(SQLite, key);
  if (await readable(db)) {
    // `applied` and not merely `readable`: an empty file reads fine with no key
    // at all, so readable alone cannot tell an encrypted database from a build
    // where PRAGMA key does not exist.
    if (!keyApplied) {
      if (!(await closeQuietly(db, 'sqlcipher_attestation'))) throw abortOpen('sqlcipher_attestation_close');

      // A fresh install must never silently become plaintext merely because
      // ordinary SQLite accepted an unknown PRAGMA.  Remove only the empty
      // file created by this probe and wait for a SQLCipher-capable build.
      if (!liveExistedBeforeKeyedOpen) {
        for (const suffix of ['', '-wal', '-shm']) {
          try { await FileSystem.deleteAsync(`${path(DB_NAME)}${suffix}`, { idempotent: true }); } catch (_) {}
        }
        throw abortOpen('sqlcipher_unavailable_fresh_database', { probe: keyProbe ?? null });
      }

      // Existing plaintext databases remain usable (and honestly reported)
      // when SQLCipher is unavailable.  Re-open without key state so an
      // encrypted/corrupt database can never be mislabeled as plaintext.
      const plainProbe = await SQLite.openDatabaseAsync(DB_NAME);
      if (await readable(plainProbe)) {
        emitPlaintextFallback('sqlcipher_unavailable');
        return { db: plainProbe, encrypted: false };
      }
      await closeQuietly(plainProbe, 'sqlcipher_unavailable_existing');
      throw abortOpen('sqlcipher_unavailable_existing_database');
    }
    return { db, encrypted: true };
  }

  // 2. Not readable keyed: check for plaintext data. If the keyed handle will
  // not close, the "plaintext" open below would reuse the same still-keyed
  // native connection and misread the state - abort recoverably instead.
  if (!(await closeQuietly(db, 'keyed_probe'))) throw abortOpen('keyed_probe_close');
  let plain = await SQLite.openDatabaseAsync(DB_NAME);
  if (!(await readable(plain))) {
    // Neither keyed-readable nor plaintext-readable. A wrong key and corruption
    // are indistinguishable. Keep the potentially valid database at its
    // canonical path and fail closed; moving it aside and creating an empty
    // replacement turns a transient key problem into apparent data loss.
    if (!(await closeQuietly(plain, 'unreadable_plain'))) throw abortOpen('unreadable_plain_close');
    throw abortOpen('unreadable_existing_database');
  }

  // 3. Plaintext data exists → migrate, preserving the original until verified.
  try {
    try { await FileSystem.deleteAsync(encPath, { idempotent: true }); } catch (_) {}
    // The main file becomes the rollback copy below. Flush its WAL first so
    // that copy is independently complete rather than dependent on sidecars
    // that cannot follow an atomic single-file rename.
    await plain.getAllAsync('PRAGMA wal_checkpoint(FULL);');
    await plain.execAsync(`ATTACH DATABASE '${encPath}' AS encrypted KEY '${key}';`);
    await plain.getAllAsync("SELECT sqlcipher_export('encrypted');");
    await plain.execAsync('DETACH DATABASE encrypted;');
    // A still-open plaintext connection must never survive into the swap:
    // after the moves below, a reopened DB_NAME would reuse this connection
    // and every write this session would land on the old (deleted) inode.
    // Throwing here lands in the migrate_failed fallback BEFORE any move, so
    // the original file is untouched and the app opens plaintext.
    if (!(await closeQuietly(plain, 'migrate_export'))) {
      throw new Error('plaintext handle would not close before the swap');
    }

    // Verify the encrypted copy reads with the key BEFORE touching the original.
    const { db: verify, applied: verifyKeyApplied } = await keyed(SQLite, key, 'volyume-enc.db');
    const ok = verifyKeyApplied && await readable(verify);
    if (!(await closeQuietly(verify, 'verify_encrypted_copy'))) {
      throw new Error('verified encrypted candidate would not close');
    }
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

    ({ db, applied: keyApplied } = await keyed(SQLite, key));
    if (keyApplied && await readable(db)) {
      try { await FileSystem.deleteAsync(backup, { idempotent: true }); } catch (_) {}
      logInfo('dbCrypto.migrated', 'local DB encrypted');
      return { db, encrypted: true };
    }
    // Do not delete an unreadable promoted file: a transient/wrong key is
    // indistinguishable from corruption. The catch below preserves it before
    // restoring the verified plaintext rollback.
    if (!(await closeQuietly(db, 'post_swap_unreadable'))) {
      throw abortOpen('post_swap_unreadable_close');
    }
    throw new Error('post-swap DB not readable');
  } catch (e) {
    logError('dbCrypto.migrate', e, {});
    // Fall back only after proving a pre-existing plaintext database is back
    // at the canonical path. openDatabaseAsync creates missing files, so an
    // unconditional open here can turn a failed rollback into an empty DB and
    // make the only valid backup look stale on the next launch.
    try {
      let liveExists = (await FileSystem.getInfoAsync(path(DB_NAME)).catch(() => ({ exists: false })))?.exists === true;
      const backupExists = (await FileSystem.getInfoAsync(backup).catch(() => ({ exists: false })))?.exists === true;
      if (backupExists && liveExists) {
        // Preserve the promoted candidate before putting plaintext back. The
        // encrypted staging path is free after a successful promotion; if it
        // is not, the state is ambiguous and every copy is retained.
        const candidateExists = (await FileSystem.getInfoAsync(encPath).catch(() => ({ exists: false })))?.exists === true;
        if (candidateExists) throw abortOpen('migrate_rollback_ambiguous');
        await FileSystem.moveAsync({ from: path(DB_NAME), to: encPath });
        liveExists = false;
      }
      if (backupExists && !liveExists) {
        await FileSystem.moveAsync({ from: backup, to: path(DB_NAME) });
        liveExists = true;
      }
      if (!liveExists) throw abortOpen('migrate_rollback_missing_live');

      const fb = await SQLite.openDatabaseAsync(DB_NAME);
      if (!(await readable(fb))) {
        await closeQuietly(fb, 'migrate_rollback_probe');
        throw abortOpen('migrate_rollback_not_plaintext');
      }
      // Now—and only now—a replacement for any failed encrypted candidate is
      // positively verified. The candidate is a disposable export, not the
      // user's last copy.
      try { await FileSystem.deleteAsync(encPath, { idempotent: true }); } catch (_) {}
      emitPlaintextFallback('migrate_failed');
      return { db: fb, encrypted: false };
    } catch (e2) {
      logError('dbCrypto.fallbackOpen', e2, {});
      if (e2?.dbCryptoAbort) throw e2;
      throw abortOpen('migrate_rollback_failed');
    }
  }
}
