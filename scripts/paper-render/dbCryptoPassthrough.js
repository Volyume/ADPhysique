/**
 * scripts/paper-render/dbCryptoPassthrough.js
 *
 * Jest mock for `src/lib/dbCrypto.js`, used only by the paper-render
 * harness (`jest.mock('../../src/lib/dbCrypto', () => require('./dbCryptoPassthrough'))`
 * in mockPreamble.js).
 *
 * WHY BYPASSED RATHER THAN SHIMMED. dbCrypto's job is the SQLCipher
 * migrate-in-place dance: PRAGMA key, ATTACH DATABASE ... KEY,
 * sqlcipher_export(), a plaintext<->encrypted swap guarded by file moves
 * through expo-file-system. None of that is reachable under node:sqlite
 * (there is no SQLCipher codec to attest, and the paper-render task itself
 * says a plaintext no-op pass-through is an acceptable, honest choice here
 * -- see the brief's MOUNTING step). Reproducing it faithfully would mean
 * re-implementing ATTACH/sqlcipher_export against plain SQLite for a
 * property (encryption-at-rest) this harness has no way to observe or
 * screenshot. The two existing REAL tests of that dance
 * (src/lib/__tests__/dbFailClosed.test.js, snapshotVerification.test.js)
 * already mock expo-sqlite AND dbCrypto's own helpers with a fake in-memory
 * file model rather than real SQLite, for the same reason -- this mirrors
 * that established idiom rather than inventing a new one.
 *
 * What this returns is a database opened via the real shim
 * (expoSqliteShim.js, itself standing in for `expo-sqlite`), reported as
 * `encrypted: true` -- the ordinary state on a real device, and the state
 * every screen's copy/branching assumes. Nothing here actually encrypts
 * anything; this is a paper-render harness, not a security test.
 */
'use strict';

async function getOrCreateDbKey() {
  return { key: 'paper-render-unkeyed', status: 'existing', locked: false };
}

async function attestSqlCipherConnection() {
  return { applied: true, cipherVersion: 'paper-render-passthrough', probe: {} };
}

async function openEncryptedDb(SQLite) {
  const db = await SQLite.openDatabaseAsync('volyume.db');
  return { db, encrypted: true };
}

module.exports = { getOrCreateDbKey, attestSqlCipherConnection, openEncryptedDb };
