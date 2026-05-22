// In-memory SQLite stub. We don't simulate SQL; we just satisfy the
// shape so screens can call db helpers without crashing. Helpers that
// matter for screen tests (getNutritionTargets, etc.) return null or
// empty arrays by default; individual tests can override per-call.

const _store = {};

function makeDb() {
  return {
    execAsync: jest.fn(() => Promise.resolve()),
    runAsync: jest.fn(() => Promise.resolve({ changes: 0, lastInsertRowId: 0 })),
    getAllAsync: jest.fn(() => Promise.resolve([])),
    getFirstAsync: jest.fn(() => Promise.resolve(null)),
    withTransactionAsync: jest.fn(async (fn) => { await fn(); }),
    closeAsync: jest.fn(() => Promise.resolve()),
  };
}

module.exports = {
  openDatabaseAsync: jest.fn(() => Promise.resolve(makeDb())),
  openDatabaseSync: jest.fn(() => makeDb()),
  deleteDatabaseAsync: jest.fn(() => Promise.resolve()),
  __memStore: _store,
};
