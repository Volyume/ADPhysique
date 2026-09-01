// In-memory SQLite stub. We don't simulate SQL; we just satisfy the
// shape so screens can call db helpers without crashing. Helpers that
// matter for screen tests (getNutritionTargets, etc.) return null or
// empty arrays by default; individual tests can override per-call.

const _store = {};

function makeDb() {
  return {
    execAsync: jest.fn(() => Promise.resolve()),
    runAsync: jest.fn(() => Promise.resolve({ changes: 0, lastInsertRowId: 0 })),
    getAllAsync: jest.fn((sql) => {
      if (/PRAGMA\s+table_info/i.test(String(sql))) {
        // Function migrations positively verify required tables/columns. This
        // non-executing screen double models the already-complete production
        // schema; real migration tests use node:sqlite and own missing-column
        // and readback-failure behavior.
        return Promise.resolve([
          'load_semantics', 'cause', 'effective_choice',
          'weight_bearing_hands', 'adaptation_mode',
        ].map((name) => ({ name })));
      }
      return Promise.resolve([]);
    }),
    getFirstAsync: jest.fn((sql) => {
      if (/PRAGMA\s+cipher_version/i.test(String(sql))) {
        // The application now requires positive SQLCipher attestation. This
        // global screen-test double represents the encrypted production build;
        // dbFailClosed.test owns the ordinary-SQLite negative cases.
        return Promise.resolve({ cipher_version: 'test-sqlcipher-4' });
      }
      if (/PRAGMA\s+user_version/i.test(String(sql))) return Promise.resolve({ user_version: 0 });
      return Promise.resolve(null);
    }),
    withTransactionAsync: jest.fn(async (fn) => { await fn(); }),
    isInTransactionSync: jest.fn(() => false),
    closeAsync: jest.fn(() => Promise.resolve()),
  };
}

module.exports = {
  openDatabaseAsync: jest.fn(() => Promise.resolve(makeDb())),
  openDatabaseSync: jest.fn(() => makeDb()),
  deleteDatabaseAsync: jest.fn(() => Promise.resolve()),
  __memStore: _store,
};
