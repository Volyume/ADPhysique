/**
 * favouritesSync.test.js
 *
 * Regression for D-M2 (food review 2026-06-15): applyFavouriteFromCloud must
 * gate its ON CONFLICT update on the cloud row being newer-or-equal (LWW), so a
 * stale cloud row can't re-assert an old like/dislike over a newer local change.
 * The previous applier took MAX(last_used_at) but overwrote `kind`
 * unconditionally. db() is mocked (expo-sqlite is unavailable under node), so we
 * assert the emitted SQL carries the gate and the kind is validated.
 */
const runCalls = [];
let mockDb;

jest.mock('../../database', () => ({ db: jest.fn(async () => mockDb) }));
jest.mock('../../engineTelemetry', () => ({ track: jest.fn(() => Promise.resolve()) }));

const food = require('../../food/db');

beforeEach(() => {
  jest.clearAllMocks();
  runCalls.length = 0;
  mockDb = {
    runAsync: jest.fn(async (sql, params) => { runCalls.push({ sql, params }); }),
  };
});

describe('applyFavouriteFromCloud — last-write-wins on kind', () => {
  test('the upsert is gated on the cloud row being newer-or-equal', async () => {
    await food.applyFavouriteFromCloud('u1', {
      food_ref: 'global:f1', kind: 'dislike', last_used_at: new Date(2000).toISOString(),
    });
    const ins = runCalls.find((c) => /INSERT INTO food_favourites/.test(c.sql));
    expect(ins).toBeTruthy();
    // The LWW gate must be present so a stale cloud row is a no-op.
    expect(ins.sql).toMatch(/excluded\.last_used_at\s*>=\s*food_favourites\.last_used_at/);
    // And it updates BOTH columns together (not kind unconditionally).
    expect(ins.sql).toMatch(/kind\s*=\s*excluded\.kind/);
    // D1-#8: deleted_at now rides along (5th param, null when the cloud row is live).
    expect(ins.params).toEqual(['u1', 'global:f1', 2000, 'dislike', null]);
  });

  test('an out-of-set kind is coerced to fav (cannot poison local state)', async () => {
    await food.applyFavouriteFromCloud('u1', {
      food_ref: 'global:f1', kind: 'garbage', last_used_at: new Date(2000).toISOString(),
    });
    const ins = runCalls.find((c) => /INSERT INTO food_favourites/.test(c.sql));
    expect(ins.params[3]).toBe('fav');
  });

  test('ignores a row with no food_ref', async () => {
    await food.applyFavouriteFromCloud('u1', { kind: 'fav' });
    expect(runCalls.length).toBe(0);
  });

  // D1-#8: a remote tombstone must set deleted_at on the local row (under the
  // same last_used_at LWW gate) so a cross-device delete reaches this device.
  test('a cloud tombstone writes deleted_at under the LWW gate', async () => {
    await food.applyFavouriteFromCloud('u1', {
      food_ref: 'global:f1', kind: 'fav',
      last_used_at: new Date(1900).toISOString(),
      deleted_at: new Date(1900).toISOString(),
    });
    const ins = runCalls.find((c) => /INSERT INTO food_favourites/.test(c.sql));
    expect(ins.sql).toMatch(/deleted_at\s*=\s*excluded\.deleted_at/);
    expect(ins.sql).toMatch(/excluded\.last_used_at\s*>=\s*food_favourites\.last_used_at/);
    expect(ins.params).toEqual(['u1', 'global:f1', 1900, 'fav', 1900]); // 5th = deleted_at
  });
});

describe('applyWaterFromCloud — remote tombstone', () => {
  // D1-#8: a remote water tombstone sets deleted_at on the local row under the
  // updated_at LWW gate.
  test('a cloud tombstone writes deleted_at under the LWW gate', async () => {
    await food.applyWaterFromCloud('u1', {
      entry_date: '2026-06-02', ml: 0,
      updated_at: new Date(1900).toISOString(),
      deleted_at: new Date(1900).toISOString(),
    });
    const ins = runCalls.find((c) => /INSERT INTO daily_water/.test(c.sql));
    expect(ins.sql).toMatch(/deleted_at\s*=\s*excluded\.deleted_at/);
    expect(ins.sql).toMatch(/excluded\.updated_at\s*>=\s*daily_water\.updated_at/);
    expect(ins.params).toEqual(['u1', '2026-06-02', 0, 1900, 1900]); // 5th = deleted_at
  });
});
