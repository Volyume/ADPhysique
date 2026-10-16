/**
 * TZ-1 phase 2: rekeyFoodEntriesToLocalDay moves a food entry carrying the
 * pre-phase-1 UTC day-key (entry_date = the UTC day of logged_at, which is not
 * its local day, written before the phase 1 cutoff) onto the local day, and
 * rebuilds the affected days' rollups. Any other mismatch is a day chosen on
 * purpose and is never moved (2026-10-16 narrowing; the real-SQLite cases,
 * back-dated, copied, planned and imported rows and the push and pull round
 * trip, are pinned in dayKeyRepair.realdb.test.js).
 *
 * The expo-sqlite mock is a shape stub, so we drive getAllAsync (the row scan)
 * and assert which UPDATE writes fire. Every fixture is built relative to the
 * zone the suite runs in (utcWindowMoment), so it holds under Europe/London,
 * America/New_York and Asia/Tokyo: the window the old key got wrong is local
 * 00:30 east of Greenwich (UTC still the day before) and local 23:30 west of
 * it (UTC already the day after).
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

const utcDay = (ms) => new Date(ms).toISOString().slice(0, 10);
function utcWindowMoment(y, m, d) {
  for (const [h, min] of [[0, 30], [23, 30]]) {
    const ms = new Date(y, m, d, h, min).getTime();
    if (utcDay(ms) !== localDayKey(ms)) return ms;
  }
  throw new Error('run this suite in a zone that is not UTC');
}

// In London: 00:30 BST on 2 June 2026 (23:30 UTC on the 1st); in New York
// 23:30 on 2 June (03:30 UTC on the 3rd). Either way before the phase 1
// cutoff (4 June 00:00 UTC). UTC_KEY is the day the old build wrote,
// LOCAL_KEY the day the meal belongs to.
const UTC_KEYED_MS = utcWindowMoment(2026, 5, 2);
const UTC_KEY = utcDay(UTC_KEYED_MS);
const LOCAL_KEY = localDayKey(UTC_KEYED_MS);

test('re-keys only an entry carrying the pre-phase-1 UTC key; a deliberate day is left alone', async () => {
  const correctMs = Date.UTC(2026, 5, 10, 12, 0, 0);
  conn.getAllAsync.mockResolvedValueOnce([
    { id: 'fe1', entry_date: UTC_KEY, logged_at: UTC_KEYED_MS, created_at: UTC_KEYED_MS, is_planned: 0 }, // UTC key -> re-key
    { id: 'fe2', entry_date: localDayKey(correctMs), logged_at: correctMs, created_at: correctMs, is_planned: 0 }, // already right
    { id: 'fe3', entry_date: '2026-06-04', logged_at: Date.UTC(2026, 5, 3, 12, 0, 0), is_planned: 0 }, // a chosen day
    { id: 'fe4', entry_date: UTC_KEY, logged_at: UTC_KEYED_MS, created_at: UTC_KEYED_MS, is_planned: 1 }, // planned
  ]);

  const changed = await rekeyFoodEntriesToLocalDay('u1');

  expect(changed).toBe(1);
  const updates = updateEntryDateCalls();
  expect(updates).toHaveLength(1);
  expect(updates[0][1][0]).toBe(LOCAL_KEY); // the local day of the moment (2 June)
  expect(LOCAL_KEY).toBe('2026-06-02');
  expect(updates[0][1][2]).toBe('fe1'); // by id
});

test('a UTC-looking key written after the phase 1 cutoff is a chosen day and is never moved', async () => {
  // In London: 00:30 BST on 17 October, logged for the 16th (its UTC day) on purpose.
  const ms = utcWindowMoment(2026, 9, 17);
  conn.getAllAsync.mockResolvedValueOnce([
    { id: 'fe1', entry_date: utcDay(ms), logged_at: ms, created_at: ms, is_planned: 0 },
  ]);
  await expect(rekeyFoodEntriesToLocalDay('u1')).resolves.toBe(0);
  expect(updateEntryDateCalls()).toHaveLength(0);
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
    { id: 'fe1', entry_date: UTC_KEY, logged_at: UTC_KEYED_MS, created_at: UTC_KEYED_MS, is_planned: 0 },
  ]);
  conn.getFirstAsync.mockRejectedValue(new Error('rollup read failed'));

  await expect(rekeyFoodEntriesToLocalDay('u1')).rejects.toThrow();
});

test('returns 0 and does nothing without a userId', async () => {
  const changed = await rekeyFoodEntriesToLocalDay(null);
  expect(changed).toBe(0);
  expect(conn.getAllAsync).not.toHaveBeenCalled();
});

test('applyFoodEntryFromCloud moves a pre-phase-1 UTC-keyed cloud row to the LOCAL day', async () => {
  // A pulled row carrying the old UTC-day key lands on the user's local day
  // (derived from logged_at), so a fresh-device pull is correct whether or not
  // the one-time re-key has run (no race).
  const iso = new Date(UTC_KEYED_MS).toISOString();
  const result = await applyFoodEntryFromCloud('u1', {
    id: 'fe1', entry_date: UTC_KEY, // the UTC key
    meal_slot: 'breakfast', food_ref: 'off:1', quantity_g: 100,
    kcal: 100, protein_g: 10, carbs_g: 10, fat_g: 5,
    logged_at: iso, created_at: iso, updated_at: iso,
  });

  expect(result).toBe(LOCAL_KEY);
  const insertCall = conn.runAsync.mock.calls.find((c) => /INSERT OR REPLACE INTO food_entries/.test(c[0]));
  expect(insertCall[1][2]).toBe(LOCAL_KEY); // entry_date param
});

test('applyFoodEntryFromCloud keeps the cloud entry_date the writing device chose', async () => {
  // A meal logged on 3 June for 4 June: the cloud's logged_at is the push
  // moment, which says nothing about the day the food belongs to.
  const loggedAt = Date.UTC(2026, 5, 3, 12, 0, 0);
  const result = await applyFoodEntryFromCloud('u1', {
    id: 'fe2', entry_date: '2026-06-04',
    meal_slot: 'breakfast', food_ref: 'off:1', quantity_g: 100,
    kcal: 100, protein_g: 10, carbs_g: 10, fat_g: 5,
    logged_at: new Date(loggedAt).toISOString(),
  });
  expect(result).toBe('2026-06-04');
  const insertCall = conn.runAsync.mock.calls.find((c) => /INSERT OR REPLACE INTO food_entries/.test(c[0]));
  expect(insertCall[1][2]).toBe('2026-06-04');
});

test('applyFoodEntryFromCloud falls back to the local day when the cloud day is missing or unreadable', async () => {
  const loggedAt = Date.UTC(2026, 5, 3, 12, 0, 0);
  const result = await applyFoodEntryFromCloud('u1', {
    id: 'fe3', entry_date: 'not-a-day',
    meal_slot: 'breakfast', food_ref: 'off:1', quantity_g: 100,
    kcal: 100, protein_g: 10, carbs_g: 10, fat_g: 5,
    logged_at: new Date(loggedAt).toISOString(),
  });
  expect(result).toBe(localDayKey(loggedAt));
});
