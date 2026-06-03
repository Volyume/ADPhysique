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

const { rekeyFoodEntriesToLocalDay, applyFoodEntryFromCloud } = require('../db');
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

test('a rollup-rebuild failure propagates (atomic; caller leaves the flag unset to retry)', async () => {
  // Row needs re-keying, but the rollup recompute read fails. The re-key +
  // recompute share one transaction, so the failure must propagate (in a real
  // DB it rolls back), rather than leaving the entry re-keyed with a stale
  // rollup and the migration silently marked done.
  conn.getAllAsync.mockResolvedValueOnce([
    { id: 'fe1', entry_date: '2026-06-04', logged_at: Date.UTC(2026, 5, 3, 12, 0, 0) },
  ]);
  conn.getFirstAsync.mockRejectedValue(new Error('rollup read failed'));

  await expect(rekeyFoodEntriesToLocalDay('u1')).rejects.toThrow();
});

test('returns 0 and does nothing without a userId', async () => {
  const changed = await rekeyFoodEntriesToLocalDay(null);
  expect(changed).toBe(0);
  expect(conn.getAllAsync).not.toHaveBeenCalled();
});

test('applyFoodEntryFromCloud re-keys to the LOCAL day, ignoring the cloud entry_date', async () => {
  // A pulled row carrying a UTC-day entry_date must land on the user's local
  // day (derived from logged_at), so a fresh-device pull is correct regardless
  // of whether the one-time migration has run (no race). Jest runs in UTC, so
  // we assert against localDayKey(loggedAt) directly.
  const loggedAt = Date.UTC(2026, 5, 3, 12, 0, 0);
  const result = await applyFoodEntryFromCloud('u1', {
    id: 'fe1', entry_date: '2026-06-04', // stale/UTC cloud key
    meal_slot: 'breakfast', food_ref: 'off:1', quantity_g: 100,
    kcal: 100, protein_g: 10, carbs_g: 10, fat_g: 5,
    logged_at: new Date(loggedAt).toISOString(),
  });

  expect(result).toBe(localDayKey(loggedAt));
  const insertCall = conn.runAsync.mock.calls.find((c) => /INSERT OR REPLACE INTO food_entries/.test(c[0]));
  expect(insertCall[1][2]).toBe(localDayKey(loggedAt)); // entry_date param
  expect(insertCall[1][2]).not.toBe('2026-06-04');
});
