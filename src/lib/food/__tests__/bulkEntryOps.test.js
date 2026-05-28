jest.mock('../db', () => ({
  logFoodEntry: jest.fn(() => Promise.resolve('new-id')),
  updateFoodEntry: jest.fn(() => Promise.resolve(true)),
  deleteFoodEntry: jest.fn(() => Promise.resolve(true)),
}));

import { logFoodEntry, updateFoodEntry, deleteFoodEntry } from '../db';
import {
  entryToPatch, deleteEntries, moveEntriesToSlot, copyEntriesToDate,
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
  test('deletes each selected entry by id for the user', async () => {
    await deleteEntries('u1', [entry({ id: 'a' }), entry({ id: 'b' })]);
    expect(deleteFoodEntry).toHaveBeenCalledTimes(2);
    expect(deleteFoodEntry).toHaveBeenCalledWith('a', 'u1');
    expect(deleteFoodEntry).toHaveBeenCalledWith('b', 'u1');
  });
});

describe('moveEntriesToSlot', () => {
  test('updates each entry with the full field set and the new slot', async () => {
    await moveEntriesToSlot('u1', [entry({ id: 'a', meal_slot: 'lunch' })], 'dinner');
    expect(updateFoodEntry).toHaveBeenCalledTimes(1);
    const [id, userId, patch] = updateFoodEntry.mock.calls[0];
    expect(id).toBe('a');
    expect(userId).toBe('u1');
    expect(patch.mealSlot).toBe('dinner');
    // macros must survive the move
    expect(patch.kcal).toBe(200);
    expect(patch.proteinG).toBe(12.5);
    expect(patch.quantityG).toBe(150);
  });

  test('skips entries already in the target slot (no needless write or sync)', async () => {
    await moveEntriesToSlot('u1', [entry({ meal_slot: 'dinner' })], 'dinner');
    expect(updateFoodEntry).not.toHaveBeenCalled();
  });
});

describe('copyEntriesToDate', () => {
  test('logs a fresh entry on the target date keeping the original slot', async () => {
    await copyEntriesToDate('u1', [entry({ meal_slot: 'breakfast' })], '2026-06-01');
    expect(logFoodEntry).toHaveBeenCalledTimes(1);
    const [userId, payload] = logFoodEntry.mock.calls[0];
    expect(userId).toBe('u1');
    expect(payload.entryDate).toBe('2026-06-01');
    expect(payload.mealSlot).toBe('breakfast');
    expect(payload.foodRef).toBe('global:abc');
    expect(payload.kcal).toBe(200);
    expect(payload).not.toHaveProperty('id'); // a copy, not the same row
  });
});
