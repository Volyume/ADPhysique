/**
 * Public sync surface — imports through the same '../lib/sync' path
 * that App.js + SyncStatusBadge use, and asserts every spec'd export
 * resolves to a real callable.
 *
 * Codex re-audit 2026-05-26 F5: the earlier sync.runner.triggers test
 * imported from '../runner' directly so it could not detect that the
 * App.js path was broken. This test resolves through the same module
 * Node picks for App.js + SyncStatusBadge so a future regression that
 * drops the re-exports from sync.js fails here.
 */

// Mock minimal cross-module deps so the import chain doesn't try to
// reach native modules during the require.
jest.mock('../../supabase', () => ({ getSupabaseClient: () => null }));
jest.mock('../../database', () => ({
  db: jest.fn(async () => null),
}));

// Don't import via path-resolved '../sync' inside the test file
// directly — Jest's resolver may behave differently. Use require with
// a literal path that mirrors what App.js does relative to its own
// location (`./src/lib/sync` from App.js = `../../lib/sync` from this
// test = `'../../sync'`).
const publicSync = require('../../sync');

describe('public sync surface (importable via require("../lib/sync"))', () => {
  test('syncAll is a function', () => {
    expect(typeof publicSync.syncAll).toBe('function');
  });

  test('syncTable is a function', () => {
    expect(typeof publicSync.syncTable).toBe('function');
  });

  test('getStatus is a function', () => {
    expect(typeof publicSync.getStatus).toBe('function');
  });

  test('SYNC_REGISTRY is the locked array', () => {
    expect(Array.isArray(publicSync.SYNC_REGISTRY)).toBe(true);
    expect(publicSync.SYNC_REGISTRY.length).toBeGreaterThan(10);
  });

  test('queue helpers are functions', () => {
    expect(typeof publicSync.ensureSyncQueueTable).toBe('function');
    expect(typeof publicSync.enqueue).toBe('function');
    expect(typeof publicSync.getQueueDepth).toBe('function');
  });

  test('legacy helpers are still exported (App.js uses bulkUploadLocalData)', () => {
    expect(typeof publicSync.bulkUploadLocalData).toBe('function');
    expect(typeof publicSync.pullFromCloud).toBe('function');
  });

  test('getStatus returns the spec shape', async () => {
    const s = await publicSync.getStatus();
    expect(s).toHaveProperty('status');
    expect(s).toHaveProperty('queue_depth');
    expect(s).toHaveProperty('last_run_at');
    expect(s).toHaveProperty('last_error');
  });
});
