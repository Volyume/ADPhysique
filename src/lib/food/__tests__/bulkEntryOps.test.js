/**
 * bulkEntryOps: the Diary's selection operations, over the BATCHED db
 * primitives (D230 R10, food level-up lane 3A).
 *
 * RE-POINTED from the per-row primitives (logFoodEntry / updateFoodEntry /
 * deleteFoodEntry / restoreFoodEntry, one call per selected row) to the batched
 * ones (logFoodEntries / updateFoodEntries / deleteFoodEntries /
 * restoreFoodEntries, ONE call per deed). Every truth the old suite pinned
 * stands: each selected row is deleted / restored / moved / copied; a move
 * carries the whole row so no macro is nulled; a move into the slot a row is
 * already in writes nothing; a copy keeps the slot, takes the target date, is
 * a fresh row, can be limited to one meal, and hands back the new ids in order
 * so one Undo removes them all.
 *
 * RE-POINTED again (lead ruling, D33): copyEntriesToDate returns
 * { ids, skipped } (it returned the bare id array). A source row that could
 * never be logged (isLoggableFoodEntry says no) is left out BEFORE the one
 * all-or-nothing batch and counted; a plan is never a candidate and is never
 * counted. Every earlier truth stands, read through `.ids`.
 *
 * New here (D230 R9): a copy NEVER copies a plan (is_planned = 1 rows are
 * filtered in the lib, on every path), and each copied row keeps its source's
 * local clock time on the target date (eatenAtOnDate), including across a
 * GMT/BST change, where adding whole days of milliseconds is an hour out. The
 * real-SQLite behaviour of the batched primitives is pinned in
 * batchedEntryWrites.test.js; this suite pins what bulkEntryOps hands them.
 */
jest.mock('../db', () => ({
  logFoodEntries: jest.fn((userId, entries) => Promise.resolve(entries.map((_, i) => `new-${i + 1}`))),
  updateFoodEntries: jest.fn(() => Promise.resolve(1)),
  deleteFoodEntries: jest.fn(() => Promise.resolve(1)),
  restoreFoodEntries: jest.fn(() => Promise.resolve(1)),
  // The real verdict is pinned against logFoodEntry in batchedEntryWrites.test.js;
  // here a payload is loggable unless its grams are the legacy sentinel 6000.
  isLoggableFoodEntry: jest.fn((payload) => payload.quantityG !== 6000),
}));

import {
  logFoodEntries, updateFoodEntries, deleteFoodEntries, restoreFoodEntries, isLoggableFoodEntry,
} from '../db';
import {
  entryToPatch, deleteEntries, restoreEntries, moveEntriesToSlot, copyEntriesToDate, eatenAtOnDate,
} from '../bulkEntryOps';

const entry = (over = {}) => ({
  id: 'e1',
  entry_date: '2026-05-28',
  meal_slot: 'lunch',
  food_ref: 'global:abc',
  quantity_g: 150,
  kcal: 200,
  protein_g: 12.5,
  carbs_g: 30,
  fat_g: 4,
  fibre_g: 2,
  ...over,
});

beforeEach(() => jest.clearAllMocks());

describe('entryToPatch', () => {
  test('carries every macro field so updateFoodEntry cannot null them', () => {
    const p = entryToPatch(entry());
    expect(p).toEqual({
      entryDate: '2026-05-28',
      mealSlot: 'lunch',
      foodRef: 'global:abc',
      quantityG: 150,
      kcal: 200,
      proteinG: 12.5,
      carbsG: 30,
      fatG: 4,
      fibreG: 2,
    });
  });

  test('overrides win over the row values', () => {
    expect(entryToPatch(entry(), { mealSlot: 'dinner' }).mealSlot).toBe('dinner');
  });

  test('missing fibre coerces to null, not undefined', () => {
    expect(entryToPatch(entry({ fibre_g: undefined })).fibreG).toBeNull();
  });
});

describe('deleteEntries', () => {
  test('deletes every selected entry by id for the user, in ONE call', async () => {
    await deleteEntries('u1', [entry({ id: 'a' }), entry({ id: 'b' })]);
    expect(deleteFoodEntries).toHaveBeenCalledTimes(1);
    expect(deleteFoodEntries).toHaveBeenCalledWith('u1', ['a', 'b']);
  });
});

describe('restoreEntries (food audit F-1 undo)', () => {
  test('restores every soft-deleted entry by id for the user, in ONE call', async () => {
    await restoreEntries('u1', [entry({ id: 'a' }), entry({ id: 'b' })]);
    expect(restoreFoodEntries).toHaveBeenCalledTimes(1);
    expect(restoreFoodEntries).toHaveBeenCalledWith('u1', ['a', 'b']);
  });
});

describe('moveEntriesToSlot', () => {
  test('updates each entry with the full field set and the new slot, in ONE call', async () => {
    await moveEntriesToSlot('u1', [
      entry({ id: 'a', meal_slot: 'lunch' }),
      entry({ id: 'b', meal_slot: 'snack', kcal: 90 }),
    ], 'dinner');
    expect(updateFoodEntries).toHaveBeenCalledTimes(1);
    const [userId, updates] = updateFoodEntries.mock.calls[0];
    expect(userId).toBe('u1');
    expect(updates.map((u) => u.id)).toEqual(['a', 'b']);
    const first = updates[0].patch;
    expect(first.mealSlot).toBe('dinner');
    // macros must survive the move
    expect(first.kcal).toBe(200);
    expect(first.proteinG).toBe(12.5);
    expect(first.quantityG).toBe(150);
    expect(updates[1].patch.kcal).toBe(90);
  });

  test('skips entries already in the target slot (no needless write or sync)', async () => {
    await moveEntriesToSlot('u1', [entry({ meal_slot: 'dinner' })], 'dinner');
    expect(updateFoodEntries).not.toHaveBeenCalled();
  });

  test('only the entries that actually change slot are written', async () => {
    await moveEntriesToSlot('u1', [
      entry({ id: 'stay', meal_slot: 'dinner' }),
      entry({ id: 'go', meal_slot: 'lunch' }),
    ], 'dinner');
    const [, updates] = updateFoodEntries.mock.calls[0];
    expect(updates.map((u) => u.id)).toEqual(['go']);
  });
});

describe('copyEntriesToDate', () => {
  test('logs a fresh entry on the target date keeping the original slot', async () => {
    const result = await copyEntriesToDate('u1', [entry({ meal_slot: 'breakfast' })], '2026-06-01');
    expect(result).toEqual({ ids: ['new-1'], skipped: 0 });
    expect(logFoodEntries).toHaveBeenCalledTimes(1);
    const [userId, payloads] = logFoodEntries.mock.calls[0];
    expect(userId).toBe('u1');
    expect(payloads).toHaveLength(1);
    const payload = payloads[0];
    expect(payload.entryDate).toBe('2026-06-01');
    expect(payload.mealSlot).toBe('breakfast');
    expect(payload.foodRef).toBe('global:abc');
    expect(payload.kcal).toBe(200);
    expect(payload.quantityG).toBe(150);
    expect(payload).not.toHaveProperty('id'); // a copy, not the same row
  });

  // D138 item 2: the per-meal "Copy from yesterday" chip copies ONE slot.
  test('a mealSlot filter copies only that slot, leaving the rest of the day alone', async () => {
    await copyEntriesToDate('u1', [
      entry({ id: 'a', meal_slot: 'meal_1' }),
      entry({ id: 'b', meal_slot: 'meal_2' }),
      entry({ id: 'c', meal_slot: 'meal_1' }),
    ], '2026-06-01', { mealSlot: 'meal_1' });
    expect(logFoodEntries).toHaveBeenCalledTimes(1);
    const [, payloads] = logFoodEntries.mock.calls[0];
    expect(payloads).toHaveLength(2);
    payloads.forEach((payload) => {
      expect(payload.mealSlot).toBe('meal_1');
      expect(payload.entryDate).toBe('2026-06-01');
    });
  });

  test('the created entry ids come back, in order, so one Undo can remove every copied row', async () => {
    logFoodEntries.mockResolvedValueOnce(['copy-1', 'copy-2']);
    const { ids } = await copyEntriesToDate('u1', [entry({ id: 'a' }), entry({ id: 'b' })], '2026-06-01');
    expect(ids).toEqual(['copy-1', 'copy-2']);
  });

  test('no filter still copies the whole day (existing callers unchanged), as one write', async () => {
    await copyEntriesToDate('u1', [entry({ meal_slot: 'meal_1' }), entry({ meal_slot: 'meal_2' })], '2026-06-01');
    expect(logFoodEntries).toHaveBeenCalledTimes(1);
    expect(logFoodEntries.mock.calls[0][1]).toHaveLength(2);
  });

  test('weight_state and quantity_g carry over; food_ref is unchanged', async () => {
    await copyEntriesToDate('u1', [entry({ weight_state: 'cooked', quantity_g: 210, food_ref: 'custom:rice' })], '2026-06-01');
    const [payload] = logFoodEntries.mock.calls[0][1];
    expect(payload.weightState).toBe('cooked');
    expect(payload.quantityG).toBe(210);
    expect(payload.foodRef).toBe('custom:rice');
  });

  describe('D230 R9: a plan is never copied', () => {
    test('planned rows are filtered in the lib, whatever the caller passes', async () => {
      await copyEntriesToDate('u1', [
        entry({ id: 'a', is_planned: 0 }),
        entry({ id: 'b', is_planned: 1, food_ref: 'curated:planned' }),
        entry({ id: 'c' }),
      ], '2026-06-01');
      const [, payloads] = logFoodEntries.mock.calls[0];
      expect(payloads.map((p) => p.foodRef)).toEqual(['global:abc', 'global:abc']);
      payloads.forEach((p) => expect(p).not.toHaveProperty('isPlanned'));
    });

    test('a day holding only a plan writes nothing at all and returns no ids', async () => {
      const result = await copyEntriesToDate('u1', [entry({ is_planned: 1 }), entry({ id: 'b', is_planned: 1 })], '2026-06-01');
      // A plan was never a candidate: nothing is written and nothing is "skipped".
      expect(result).toEqual({ ids: [], skipped: 0 });
      expect(logFoodEntries).not.toHaveBeenCalled();
      expect(isLoggableFoodEntry).not.toHaveBeenCalled();
    });

    test('the planned filter also holds on the per-meal path', async () => {
      await copyEntriesToDate('u1', [
        entry({ id: 'a', meal_slot: 'meal_1', is_planned: 1 }),
        entry({ id: 'b', meal_slot: 'meal_1' }),
      ], '2026-06-01', { mealSlot: 'meal_1' });
      expect(logFoodEntries.mock.calls[0][1]).toHaveLength(1);
    });
  });

  describe('ruling: a source row that can never be logged is left out, not blocking the day', () => {
    test('one bad row among three: the other two go in ONE batch, and the bad one is counted', async () => {
      logFoodEntries.mockResolvedValueOnce(['copy-1', 'copy-2']);
      const result = await copyEntriesToDate('u1', [
        entry({ id: 'a', food_ref: 'global:a' }),
        entry({ id: 'b', food_ref: 'global:bad', quantity_g: 6000 }),
        entry({ id: 'c', food_ref: 'global:c' }),
      ], '2026-06-01');
      expect(result).toEqual({ ids: ['copy-1', 'copy-2'], skipped: 1 });
      expect(logFoodEntries).toHaveBeenCalledTimes(1);
      expect(logFoodEntries.mock.calls[0][1].map((p) => p.foodRef)).toEqual(['global:a', 'global:c']);
    });

    test('every row bad: nothing is written at all, { ids: [], skipped: n }', async () => {
      const result = await copyEntriesToDate('u1', [
        entry({ id: 'a', quantity_g: 6000 }), entry({ id: 'b', quantity_g: 6000 }),
      ], '2026-06-01');
      expect(result).toEqual({ ids: [], skipped: 2 });
      expect(logFoodEntries).not.toHaveBeenCalled();
    });

    test('the verdict is asked of the payload that would be written (grams, date, slot and eaten time as sent)', async () => {
      const source = new Date(2026, 2, 10, 13, 5, 0).getTime();
      await copyEntriesToDate('u1', [entry({ eaten_at: source, meal_slot: 'meal_2' })], '2026-04-02');
      expect(isLoggableFoodEntry).toHaveBeenCalledTimes(1);
      expect(isLoggableFoodEntry.mock.calls[0][0]).toEqual(expect.objectContaining({
        entryDate: '2026-04-02', mealSlot: 'meal_2', quantityG: 150, eatenAt: new Date(2026, 3, 2, 13, 5, 0).getTime(),
      }));
    });

    test('a plan is not "skipped", and the meal filter decides what is a candidate', async () => {
      const result = await copyEntriesToDate('u1', [
        entry({ id: 'plan', is_planned: 1, quantity_g: 6000 }),
        entry({ id: 'other-meal-bad', meal_slot: 'meal_2', quantity_g: 6000 }),
        entry({ id: 'ok', meal_slot: 'meal_1' }),
      ], '2026-06-01', { mealSlot: 'meal_1' });
      expect(result.skipped).toBe(0);
      expect(result.ids).toHaveLength(1);
    });
  });

  describe('D230 R9: each copied row keeps its time of day', () => {
    test('the zone is the UK\'s (these cases are about the GMT/BST change)', () => {
      // npm test pins TZ=Europe/London (jest.globalSetup.js). A run in another
      // zone must fail here, loudly, not pass the cases below vacuously.
      expect(new Date(2026, 2, 10, 13, 5).getTimezoneOffset()).toBe(0); // March: GMT
      expect(new Date(2026, 3, 2, 13, 5).getTimezoneOffset()).toBe(-60); // April: BST
    });

    test('13:05 in March is 13:05 on the April date, not 14:05 (no whole-day millisecond arithmetic)', async () => {
      const source = new Date(2026, 2, 10, 13, 5, 0).getTime(); // 10 March, GMT
      await copyEntriesToDate('u1', [entry({ eaten_at: source })], '2026-04-02');
      const [payload] = logFoodEntries.mock.calls[0][1];
      expect(payload.eatenAt).toBe(new Date(2026, 3, 2, 13, 5, 0).getTime());
      // The wrong way round, for the record: 23 days of 86,400,000 ms later.
      expect(payload.eatenAt).not.toBe(source + 23 * 86400000);
      expect(new Date(payload.eatenAt).getHours()).toBe(13);
      expect(new Date(payload.eatenAt).getMinutes()).toBe(5);
    });

    test('and the other way: 13:05 in BST copied into GMT stays 13:05', () => {
      const source = new Date(2026, 5, 15, 13, 5, 30).getTime(); // 15 June, BST
      const copied = eatenAtOnDate(source, '2026-11-03'); // November, GMT
      expect(copied).toBe(new Date(2026, 10, 3, 13, 5, 30).getTime());
    });

    test('seconds are kept; milliseconds are not part of a clock time', () => {
      const source = new Date(2026, 2, 10, 8, 15, 42, 777).getTime();
      expect(eatenAtOnDate(source, '2026-03-11')).toBe(new Date(2026, 2, 11, 8, 15, 42, 0).getTime());
    });

    test('a source with no eaten_at sends no eatenAt, so the write stamps the target\'s own "now"', async () => {
      await copyEntriesToDate('u1', [entry({ eaten_at: null }), entry({ id: 'b' })], '2026-06-01');
      const payloads = logFoodEntries.mock.calls[0][1];
      payloads.forEach((p) => expect(p).not.toHaveProperty('eatenAt'));
    });

    test('an unusable source time is treated as none', () => {
      expect(eatenAtOnDate(undefined, '2026-06-01')).toBeNull();
      expect(eatenAtOnDate(null, '2026-06-01')).toBeNull();
      expect(eatenAtOnDate('not a time', '2026-06-01')).toBeNull();
      expect(eatenAtOnDate(new Date(2026, 5, 1, 9, 0).getTime(), 'not a day')).toBeNull();
    });

    test('the spring-forward night: a time that does not exist lands on the hour the clock moved to', () => {
      // 01:30 does not exist on 29 March 2026 in the UK (01:00 becomes 02:00).
      const source = new Date(2026, 2, 10, 1, 30, 0).getTime();
      const copied = new Date(eatenAtOnDate(source, '2026-03-29'));
      expect(copied.getFullYear()).toBe(2026);
      expect(copied.getMonth()).toBe(2);
      expect(copied.getDate()).toBe(29);
      expect(copied.getHours()).toBe(2);
    });
  });
});
