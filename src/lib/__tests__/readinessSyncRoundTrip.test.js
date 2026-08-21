/**
 * PD-5 (bundle 2 prelude) - readiness fields round-trip the cloud.
 *
 * sleep_quality/energy_score were PUSHED (sync.js payload) but missing
 * from the workouts pull's explicit select, so a cross-device restore
 * handed insertWorkoutFromCloud undefined for both and the INSERT OR
 * REPLACE wrote NULL over the user's entered readiness. Pins:
 *  - the pull select names both columns (and the push still maps them);
 *  - insertWorkoutFromCloud stores the cloud values verbatim and never
 *    fabricates defaults when the cloud genuinely has none.
 */
jest.mock('../dbCrypto', () => {
  const { DatabaseSync } = require('node:sqlite');
  const raw = new DatabaseSync(':memory:');
  const adapt = {
    execAsync: async (sql) => raw.exec(sql),
    getAllAsync: async (sql, params = []) => raw.prepare(sql).all(...params),
    getFirstAsync: async (sql, params = []) => raw.prepare(sql).get(...params) ?? null,
    runAsync: async (sql, params = []) => {
      const r = raw.prepare(sql).run(...params);
      return { changes: Number(r.changes ?? 0), lastInsertRowId: Number(r.lastInsertRowid ?? 0) };
    },
    withTransactionAsync: async (fn) => fn(),
    isInTransactionSync: () => false,
    closeAsync: async () => {},
  };
  return { openEncryptedDb: async () => ({ db: adapt, encrypted: true }), __raw: raw };
});
jest.mock('expo-sqlite');
jest.mock('../sync', () => ({ scheduleSync: () => {} }));

const fs = require('fs');
const path = require('path');
const { db, insertWorkoutFromCloud } = require('../database');

const USER = 'u-pd5';
const syncSrc = fs.readFileSync(path.resolve(__dirname, '../sync.js'), 'utf8');

describe('PD-5: the pull contract carries the readiness fields', () => {
  test('the workouts pull select names sleep_quality and energy_score; the push still maps them', () => {
    const pullSelect = syncSrc.match(/\.select\('id, started_at[^']*'\)/)?.[0] ?? '';
    expect(pullSelect).toContain('sleep_quality');
    expect(pullSelect).toContain('energy_score');
    expect(syncSrc).toMatch(/sleep_quality: w\.sleepQuality \?\? null/);
    expect(syncSrc).toMatch(/energy_score: w\.energyScore \?\? null/);
  });

  test('insertWorkoutFromCloud stores cloud readiness verbatim', async () => {
    await db();
    await insertWorkoutFromCloud(USER, {
      id: 'w-pd5-1', started_at: '2026-04-01T10:00:00Z', is_completed: true,
      sleep_quality: 2, energy_score: 4, updated_at: '2026-04-01T11:00:00Z',
    });
    const d = await db();
    const row = await d.getFirstAsync('SELECT sleep_quality, energy_score FROM workouts WHERE id = ?', ['w-pd5-1']);
    expect(row).toEqual({ sleep_quality: 2, energy_score: 4 });
  });

  test('a cloud row with no readiness stays honestly NULL (no fabricated defaults)', async () => {
    await insertWorkoutFromCloud(USER, {
      id: 'w-pd5-2', started_at: '2026-04-02T10:00:00Z', is_completed: true,
      updated_at: '2026-04-02T11:00:00Z',
    });
    const d = await db();
    const row = await d.getFirstAsync('SELECT sleep_quality, energy_score FROM workouts WHERE id = ?', ['w-pd5-2']);
    expect(row).toEqual({ sleep_quality: null, energy_score: null });
  });
});
