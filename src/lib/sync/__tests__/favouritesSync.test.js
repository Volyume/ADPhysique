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
    expect(ins.params).toEqual(['u1', 'global:f1', 2000, 'dislike']);
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
});
