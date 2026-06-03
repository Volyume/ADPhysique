/**
 * TZ-1 phase 2: rekeyFoodEntriesToLocalDay recomputes each food entry's
 * entry_date from its logged_at (local calendar day) and rebuilds the affected
 * days' rollups. Only rows whose key actually changes are updated.
 *
 * The expo-sqlite mock is a shape stub, so we drive getAllAsync (the row scan)
 * and assert which UPDATE writes fire. Jest runs in UTC, so localDayKey == the
 * UTC day here; we make rows need re-keying by giving them an entry_date that
 * doesn't match their logged_at's day.
 */
jest.mock('expo-sqlite');

const { rekeyFoodEntriesToLocalDay } = require('../db');
const { db } = require('../../database');
const { localDayKey } = require('../../dayKey');

let conn;
beforeEach(async () => {
  conn = await db();
  conn.runAsync.mockClear();
  conn.getAllAsync.mockReset();
  conn.getFirstAsync.mockReset();
  // recomputeRollup reads a COALESCE(SUM...) row (always present, zeroed here).
  conn.getFirstAsync.mockResolvedValue({
    kcal_total: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fibre_g: 0, entries_count: 0,
  });
});

function updateEntryDateCalls() {
  return conn.runAsync.mock.calls.filter((c) => /UPDATE food_entries SET entry_date/.test(c[0]));
}

test('re-keys only entries whose entry_date disagrees with logged_at', async () => {
  const mislabelledMs = Date.UTC(2026, 5, 3, 12, 0, 0); // local/UTC day 2026-06-03
  const correctMs = Date.UTC(2026, 5, 10, 12, 0, 0);     // 2026-06-10
  conn.getAllAsync.mockResolvedValueOnce([
    { id: 'fe1', entry_date: '2026-06-04', logged_at: mislabelledMs }, // wrong -> re-key
    { id: 'fe2', entry_date: localDayKey(correctMs), logged_at: correctMs }, // already right
  ]);

  const changed = await rekeyFoodEntriesToLocalDay('u1');

  expect(changed).toBe(1);
  const updates = updateEntryDateCalls();
  expect(updates).toHaveLength(1);
  expect(updates[0][1][0]).toBe(localDayKey(mislabelledMs)); // new key
  expect(updates[0][1][2]).toBe('fe1'); // by id
});

test('no updates when every entry is already on its local day', async () => {
  const ms = Date.UTC(2026, 5, 3, 12, 0, 0);
  conn.getAllAsync.mockResolvedValueOnce([
    { id: 'fe1', entry_date: localDayKey(ms), logged_at: ms },
  ]);

  const changed = await rekeyFoodEntriesToLocalDay('u1');

  expect(changed).toBe(0);
  expect(updateEntryDateCalls()).toHaveLength(0);
});

test('skips entries with no logged_at (cannot recompute)', async () => {
  conn.getAllAsync.mockResolvedValueOnce([
    { id: 'fe1', entry_date: '2026-06-04', logged_at: null },
  ]);

  const changed = await rekeyFoodEntriesToLocalDay('u1');

  expect(changed).toBe(0);
  expect(updateEntryDateCalls()).toHaveLength(0);
});

test('returns 0 and does nothing without a userId', async () => {
  const changed = await rekeyFoodEntriesToLocalDay(null);
  expect(changed).toBe(0);
  expect(conn.getAllAsync).not.toHaveBeenCalled();
});
