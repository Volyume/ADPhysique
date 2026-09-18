/**
 * scripts/paper-render/expoSqliteShim.js
 *
 * A real SQLite shim for the paper-render harness, standing in for
 * `expo-sqlite` under Jest. Backed by Node 22's built-in `node:sqlite`
 * (`DatabaseSync`), so `src/lib/database.js` runs its OWN schema creation
 * and `PRAGMA user_version` migrations against a real SQLite engine and the
 * app's own write functions produce real, query-able rows -- rather than a
 * hand-rolled fixture guessing at every screen's read shape.
 *
 * Scope: implements exactly the handle methods `src/lib/database.js` and
 * `src/lib/food/db.js` call (grepped, see the paper-render README):
 * execAsync, runAsync, getAllAsync, getFirstAsync, withTransactionAsync,
 * isInTransactionSync, closeAsync -- plus the module-level openDatabaseAsync
 * / openDatabaseSync / deleteDatabaseAsync expo-sqlite itself exports.
 * `src/lib/dbCrypto.js`'s own SQLCipher dance (PRAGMA key, ATTACH DATABASE
 * ... KEY, sqlcipher_export) is NOT reproduced here -- see
 * dbCryptoPassthrough.js, which bypasses it entirely, so this shim never
 * needs to fake SQLCipher.
 *
 * Real file, not :memory:. Two things depend on that:
 *   1. `PRAGMA journal_mode = WAL` (database.js runs this immediately after
 *      opening) needs a real file -- SQLite refuses WAL on an in-memory db.
 *   2. The light-theme mounts in paper-render.test.js reload every module
 *      (jest.resetModules(), so a screen's StyleSheet.create call reruns
 *      against the light colour tokens) and re-open the "same" database by
 *      name. A real file makes that reopen land on the same seeded data
 *      with no cross-module cache needed; :memory: would hand back an
 *      empty database the second time.
 *
 * node:sqlite quirks this shim papers over (measured against Node 22.22.2 /
 * SQLite 3.51.2 here, see the README):
 *   - stmt.run()/.all()/.get() take VARIADIC params, never a single array
 *     ("Unknown named parameter '0'" if you pass an array through as one
 *     positional argument) -- coerceParams always spreads.
 *   - a raw boolean or `undefined` bind value throws ("Provided value
 *     cannot be bound to SQLite parameter N"); expo-sqlite's native bridge
 *     tolerates both. Coerced here: true/false -> 1/0, undefined -> null.
 *   - stmt.get() with no matching row returns `undefined`; expo-sqlite's
 *     getFirstAsync contract is `null`.
 *   - rows come back as null-prototype objects; spread into a plain object
 *     so every consumer (rowToCamel's Object.entries, JSON.stringify, a
 *     Jest matcher's deep-equal) sees an ordinary object.
 */
'use strict';

const { DatabaseSync } = require('node:sqlite');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

function dbDir() {
  const dir = process.env.PAPER_RENDER_SQLITE_DIR || path.join(os.tmpdir(), 'paper-render-sqlite');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function coerceParam(v) {
  if (v === undefined) return null;
  if (v === true) return 1;
  if (v === false) return 0;
  return v;
}

function coerceParams(params) {
  if (params === undefined || params === null) return [];
  if (Array.isArray(params)) return params.map(coerceParam);
  // A lone scalar param, passed the way a handful of call sites do
  // (single-value updates). expo-sqlite accepts this shape too.
  return [coerceParam(params)];
}

function plainRow(row) {
  return row === undefined || row === null ? null : { ...row };
}

function wrapHandle(nativeDb) {
  const handle = {
    // Not part of expo-sqlite's contract; the paper-render seed/report code
    // uses this to reach the native handle directly (e.g. to force a
    // checkpoint) without punching through the Proxy database.js wraps
    // every handle in (guardSqliteConnection, sqliteBoundary.js).
    __nativeDb: nativeDb,

    async execAsync(sql) {
      nativeDb.exec(sql);
    },

    async runAsync(sql, params) {
      const stmt = nativeDb.prepare(sql);
      const info = stmt.run(...coerceParams(params));
      return { changes: info.changes, lastInsertRowId: info.lastInsertRowid };
    },

    async getAllAsync(sql, params) {
      const stmt = nativeDb.prepare(sql);
      const rows = stmt.all(...coerceParams(params));
      return rows.map(plainRow);
    },

    async getFirstAsync(sql, params) {
      const stmt = nativeDb.prepare(sql);
      return plainRow(stmt.get(...coerceParams(params)));
    },

    // expo-sqlite's withTransactionAsync awaits the task but discards its
    // return value (database.js's runInTransaction works around exactly
    // that, see its own header comment) -- matched here for fidelity, not
    // because paper-render's seed code relies on the discard.
    async withTransactionAsync(task) {
      nativeDb.exec('BEGIN');
      try {
        await task();
        nativeDb.exec('COMMIT');
      } catch (e) {
        try { nativeDb.exec('ROLLBACK'); } catch (_) { /* best-effort unwind */ }
        throw e;
      }
    },

    isInTransactionSync() {
      return !!nativeDb.isTransaction;
    },

    async closeAsync() {
      try { nativeDb.close(); } catch (_) { /* already closed: tolerate */ }
    },
  };
  return handle;
}

// name -> wrapped handle, so repeated opens of the same name within one
// module lifetime share one native connection (expo-sqlite's own
// same-path-same-connection behaviour, which some app code assumes).
// Cleared naturally by jest.resetModules(); a fresh open after that just
// re-opens the same on-disk file, which is the point of using a real file.
const OPEN = new Map();

async function openDatabaseAsync(name) {
  const filePath = path.join(dbDir(), name);
  const cached = OPEN.get(filePath);
  if (cached) return cached;
  const nativeDb = new DatabaseSync(filePath);
  const handle = wrapHandle(nativeDb);
  OPEN.set(filePath, handle);
  return handle;
}

function openDatabaseSync(name) {
  const filePath = path.join(dbDir(), name);
  const cached = OPEN.get(filePath);
  if (cached) return cached;
  const nativeDb = new DatabaseSync(filePath);
  const handle = wrapHandle(nativeDb);
  OPEN.set(filePath, handle);
  return handle;
}

async function deleteDatabaseAsync(name) {
  const filePath = path.join(dbDir(), name);
  const cached = OPEN.get(filePath);
  if (cached) {
    await cached.closeAsync();
    OPEN.delete(filePath);
  }
  for (const suffix of ['', '-wal', '-shm', '-journal']) {
    try { fs.unlinkSync(`${filePath}${suffix}`); } catch (_) { /* absent: fine */ }
  }
}

module.exports = {
  openDatabaseAsync,
  openDatabaseSync,
  deleteDatabaseAsync,
  // Test/report seam: close and forget every handle this shim instance has
  // open, without touching the files on disk. Used between the dark and
  // light theme passes so a stale native connection is never left dangling
  // across a jest.resetModules() boundary.
  __closeAllForTests: async () => {
    for (const handle of OPEN.values()) await handle.closeAsync();
    OPEN.clear();
  },
};
