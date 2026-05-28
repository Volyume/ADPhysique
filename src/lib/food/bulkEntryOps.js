/**
 * Bulk operations for the Diary multi-select toolbar (GAP row 26).
 *
 * These run the same per-entry primitives the rest of the diary uses
 * (logFoodEntry / updateFoodEntry / deleteFoodEntry) so rollups, the
 * sync queue and telemetry all stay consistent. They take the enriched
 * food_entries rows the Diary already holds in memory (snake_case
 * columns plus _name/_brand) and operate over a selection.
 *
 * Move is the one with teeth: updateFoodEntry rewrites every column,
 * so a partial patch would null out the macros. entryToPatch always
 * sends the whole row and changes only what the caller overrides.
 */
import { logFoodEntry, updateFoodEntry, deleteFoodEntry } from './db';

export function entryToPatch(entry, overrides = {}) {
  return {
    entryDate: entry.entry_date,
    mealSlot: entry.meal_slot,
    foodRef: entry.food_ref,
    quantityG: entry.quantity_g,
    kcal: entry.kcal,
    proteinG: entry.protein_g,
    carbsG: entry.carbs_g,
    fatG: entry.fat_g,
    fibreG: entry.fibre_g ?? null,
    ...overrides,
  };
}

export async function deleteEntries(userId, entries) {
  for (const e of entries) {
    await deleteFoodEntry(e.id, userId);
  }
}

export async function moveEntriesToSlot(userId, entries, mealSlot) {
  for (const e of entries) {
    if (e.meal_slot === mealSlot) continue;
    await updateFoodEntry(e.id, userId, entryToPatch(e, { mealSlot }));
  }
}

export async function copyEntriesToDate(userId, entries, entryDate) {
  for (const e of entries) {
    await logFoodEntry(userId, {
      entryDate,
      mealSlot: e.meal_slot,
      foodRef: e.food_ref,
      quantityG: e.quantity_g,
      kcal: e.kcal,
      proteinG: e.protein_g,
      carbsG: e.carbs_g,
      fatG: e.fat_g,
      fibreG: e.fibre_g ?? null,
    });
  }
}
