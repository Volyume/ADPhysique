/**
 * Bulk operations for the Diary multi-select toolbar (GAP row 26).
 *
 * These run the BATCHED primitives of food/db.js (logFoodEntries /
 * updateFoodEntries / deleteFoodEntries / restoreFoodEntries; D230 R10), so
 * a selection is ONE transaction: one rollup recompute per touched day, one
 * sync schedule, and a failure part-way rolls the whole deed back instead of
 * leaving half of it written. Rollups, the sync queue and telemetry stay
 * consistent because the rows are written by the same validators and the
 * same INSERT/UPDATE as a single write. They take the enriched food_entries
 * rows the Diary already holds in memory (snake_case columns plus
 * _name/_brand) and operate over a selection.
 *
 * Move is the one with teeth: updateFoodEntries rewrites every column,
 * so a partial patch would null out the macros. entryToPatch always
 * sends the whole row and changes only what the caller overrides.
 */
import {
  logFoodEntries, updateFoodEntries, deleteFoodEntries, restoreFoodEntries, isLoggableFoodEntry,
} from './db';
import { parseLocalDay } from '../dayKey';

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
  await deleteFoodEntries(userId, entries.map((e) => e.id));
}

// Undo a bulk delete (food audit F-1): restore each soft-deleted row by id.
export async function restoreEntries(userId, entries) {
  await restoreFoodEntries(userId, entries.map((e) => e.id));
}

export async function moveEntriesToSlot(userId, entries, mealSlot) {
  const updates = entries
    .filter((e) => e.meal_slot !== mealSlot)
    .map((e) => ({ id: e.id, patch: entryToPatch(e, { mealSlot }) }));
  if (updates.length === 0) return;
  await updateFoodEntries(userId, updates);
}

/**
 * The moment a copied row was eaten (D230 R9): the SOURCE row's local clock
 * time (hours, minutes, seconds) on the TARGET day, so yesterday's 13:05
 * lunch is 13:05 on the day it is copied to. Computed on the local calendar
 * with the day-key helpers (parseLocalDay is the target's local midnight,
 * setHours moves along the local clock); never by adding whole days of
 * milliseconds, which is an hour out across a GMT/BST change (the copy of a
 * March 13:05 into April would read 14:05). A wall-clock time that does not
 * exist on the target day (01:30 on the spring-forward night) lands on the
 * hour the clock moved to. Returns null for a source with no usable time, so
 * the caller leaves eatenAt unset and the write stamps the target's "now",
 * as a single write does.
 */
export function eatenAtOnDate(sourceEatenAtMs, entryDate) {
  if (sourceEatenAtMs == null || !Number.isFinite(Number(sourceEatenAtMs))) return null;
  const source = new Date(Number(sourceEatenAtMs));
  const day = parseLocalDay(entryDate);
  if (Number.isNaN(source.getTime()) || Number.isNaN(day.getTime())) return null;
  day.setHours(source.getHours(), source.getMinutes(), source.getSeconds(), 0);
  return day.getTime();
}

/**
 * Replay a set of entries onto another date.
 *
 * D138 (per-meal "Copy from yesterday"): an optional `mealSlot` filter copies
 * ONE slot's rows rather than a whole day, and the created entry ids are
 * returned (as `ids`, below) so the caller can offer a single Undo that
 * removes every copied row (the multi-entry undo pattern MyMealsScreen
 * already uses for a saved meal). Callers that copy a whole day pass no
 * options.
 *
 * D230 R9, for EVERY copy path (per meal, whole day, any day, "To today"):
 *  - A PLAN IS NEVER COPIED. Planned rows (is_planned = 1) are unconfirmed
 *    scaffolding, not food eaten ("planned is not eaten"), so they are
 *    filtered here in the lib, not left to each screen; a copy can never
 *    write a planned row, and can never turn one into an actual.
 *  - Each copied row keeps its time of day (eatenAtOnDate), so a copied meal
 *    reads in the order it was eaten. A source row with no eaten_at gets the
 *    write's own "now".
 *  - weight_state and quantity_g carry over; food_ref is unchanged.
 *
 * D230 R10: the copy is ONE logFoodEntries call, atomic: every row it writes
 * is validated as a single write is, and either all of them are copied or
 * none are. The ids come back in source order.
 *
 * A source row that could never be logged (a legacy row from an older build:
 * grams outside 1 to 5000, a macro out of bounds) is LEFT OUT before the
 * batch, by the same validator the write runs (isLoggableFoodEntry), and
 * counted in `skipped`. One rogue row therefore never makes a whole day
 * uncopyable, and the batch itself stays all-or-nothing. A planned row is not
 * "skipped": it was never a candidate (see above) and is not counted.
 *
 * @returns {Promise<{ ids: string[], skipped: number }>} the new entry ids
 *   (empty when nothing qualified) and how many eaten source rows were left
 *   out for failing validation
 */
export async function copyEntriesToDate(userId, entries, entryDate, { mealSlot = null } = {}) {
  const rows = (entries ?? []).filter((e) => !e.is_planned && (!mealSlot || e.meal_slot === mealSlot));
  const payloads = rows.map((e) => {
    const eatenAt = eatenAtOnDate(e.eaten_at, entryDate);
    return {
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
      ...(eatenAt == null ? {} : { eatenAt }),
    };
  });
  // Judge the payload that would be written (eaten time and all), not the
  // source row: it is exactly what logFoodEntries will validate.
  const loggable = payloads.filter((p) => isLoggableFoodEntry(p));
  const skipped = payloads.length - loggable.length;
  if (loggable.length === 0) return { ids: [], skipped };
  return { ids: await logFoodEntries(userId, loggable), skipped };
}
