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
import { logFoodEntry, updateFoodEntry, deleteFoodEntry, restoreFoodEntry } from './db';

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
    weightState: entry.weight_state,
    ...overrides,
  };
}

export async function deleteEntries(userId, entries) {
  for (const e of entries) {
    await deleteFoodEntry(e.id, userId);
  }
}

// Undo a bulk delete (food audit F-1): restore each soft-deleted row by id.
export async function restoreEntries(userId, entries) {
  for (const e of entries) {
    await restoreFoodEntry(e.id, userId);
  }
}

export async function moveEntriesToSlot(userId, entries, mealSlot) {
  for (const e of entries) {
    if (e.meal_slot === mealSlot) continue;
    await updateFoodEntry(e.id, userId, entryToPatch(e, { mealSlot }));
  }
}

/**
 * Replay a set of entries onto another date.
 *
 * D138 (per-meal "Copy from yesterday"): an optional `mealSlot` filter copies
 * ONE slot's rows rather than a whole day, and the created entry ids are
 * returned so the caller can offer a single Undo that removes every copied
 * row (the multi-entry undo pattern MyMealsScreen already uses for a saved
 * meal). Callers that copy a whole day pass no options and may ignore the
 * return, so the previous behaviour is unchanged.
 */
export async function copyEntriesToDate(userId, entries, entryDate, { mealSlot = null } = {}) {
  const createdIds = [];
  for (const e of entries) {
    if (mealSlot && e.meal_slot !== mealSlot) continue;
    const id = await logFoodEntry(userId, {
      entryDate,
      mealSlot: e.meal_slot,
      foodRef: e.food_ref,
      quantityG: e.quantity_g,
      kcal: e.kcal,
      proteinG: e.protein_g,
      carbsG: e.carbs_g,
      fatG: e.fat_g,
      fibreG: e.fibre_g ?? null,
      weightState: e.weight_state,
    });
    createdIds.push(id);
  }
  return createdIds;
}
