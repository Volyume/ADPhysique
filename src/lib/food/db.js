/**
 * Food domain SQLite CRUD.
 *
 * Locked schema: docs/DATABASE_SCHEMA_LOCKED.md (mirrors
 * supabase/migrate_015_food_logging.sql). Client-side tables are
 * created by SCHEMA_MIGRATIONS in database.js.
 *
 * Voice rules in returned strings: none directly here (this layer
 * deals with raw data). Surface copy lives in
 * COACHING_VOICE_SYNTHESIS_LOCKED.md and is applied by callers.
 */
import { db } from '../database';

function uid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

// ─── food_entries (the diary) ────────────────────────────────────────────

/**
 * Log a food entry for a user on a specific date and meal slot.
 * Macros are denormalised at log time so future edits to the
 * underlying food don't rewrite history.
 *
 * @param {string} userId
 * @param {object} entry
 * @param {string} entry.entryDate    - 'YYYY-MM-DD'
 * @param {'breakfast'|'lunch'|'dinner'|'snack'} entry.mealSlot
 * @param {string} entry.foodRef      - 'global:<uuid>' or 'custom:<uuid>'
 * @param {number} entry.quantityG
 * @param {number} entry.kcal
 * @param {number} entry.proteinG
 * @param {number} entry.carbsG
 * @param {number} entry.fatG
 * @param {number} [entry.fibreG]
 * @returns {Promise<string>} id of the new entry
 */
export async function logFoodEntry(userId, entry) {
  const d = await db();
  const id = uid();
  const now = Date.now();
  await d.runAsync(
    `INSERT INTO food_entries (
      id, user_id, entry_date, meal_slot, food_ref, quantity_g,
      kcal, protein_g, carbs_g, fat_g, fibre_g, logged_at,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id, userId, entry.entryDate, entry.mealSlot, entry.foodRef,
      entry.quantityG, entry.kcal, entry.proteinG, entry.carbsG,
      entry.fatG, entry.fibreG ?? null, now, now, now,
    ]
  );
  await recomputeRollup(userId, entry.entryDate);
  _scheduleSync();
  return id;
}

export async function updateFoodEntry(id, userId, patch) {
  const d = await db();
  const now = Date.now();
  const existing = await d.getFirstAsync(
    `SELECT entry_date FROM food_entries WHERE id = ? AND user_id = ?`,
    [id, userId]
  );
  if (!existing) return false;
  const newDate = patch.entryDate ?? existing.entry_date;
  await d.runAsync(
    `UPDATE food_entries SET
      entry_date = ?, meal_slot = ?, food_ref = ?, quantity_g = ?,
      kcal = ?, protein_g = ?, carbs_g = ?, fat_g = ?, fibre_g = ?,
      updated_at = ?
    WHERE id = ? AND user_id = ?`,
    [
      newDate, patch.mealSlot, patch.foodRef, patch.quantityG,
      patch.kcal, patch.proteinG, patch.carbsG, patch.fatG,
      patch.fibreG ?? null, now, id, userId,
    ]
  );
  await recomputeRollup(userId, newDate);
  if (existing.entry_date !== newDate) {
    await recomputeRollup(userId, existing.entry_date);
  }
  _scheduleSync();
  return true;
}

export async function deleteFoodEntry(id, userId) {
  const d = await db();
  const now = Date.now();
  const existing = await d.getFirstAsync(
    `SELECT entry_date FROM food_entries WHERE id = ? AND user_id = ?`,
    [id, userId]
  );
  if (!existing) return false;
  await d.runAsync(
    `UPDATE food_entries SET deleted_at = ?, updated_at = ? WHERE id = ? AND user_id = ?`,
    [now, now, id, userId]
  );
  await recomputeRollup(userId, existing.entry_date);
  _scheduleSync();
  return true;
}

export async function getFoodEntriesForDay(userId, entryDate) {
  const d = await db();
  return d.getAllAsync(
    `SELECT * FROM food_entries
     WHERE user_id = ? AND entry_date = ? AND deleted_at IS NULL
     ORDER BY meal_slot, logged_at`,
    [userId, entryDate]
  );
}

export async function getRecentFoodEntries(userId, limit = 25) {
  const d = await db();
  return d.getAllAsync(
    `SELECT * FROM food_entries
     WHERE user_id = ? AND deleted_at IS NULL
     ORDER BY logged_at DESC
     LIMIT ?`,
    [userId, limit]
  );
}

// ─── custom_foods ────────────────────────────────────────────────────────

export async function insertCustomFood(userId, food) {
  const d = await db();
  const id = uid();
  const now = Date.now();
  await d.runAsync(
    `INSERT INTO custom_foods (
      id, user_id, name, brand, serving_g, serving_label,
      kcal_100g, protein_100g, carbs_100g, fat_100g,
      fibre_100g, sodium_100g, sugar_100g, photo_url, notes,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id, userId, food.name, food.brand ?? null,
      food.servingG, food.servingLabel ?? null,
      food.kcal100g, food.protein100g, food.carbs100g, food.fat100g,
      food.fibre100g ?? null, food.sodium100g ?? null, food.sugar100g ?? null,
      food.photoUrl ?? null, food.notes ?? null,
      now, now,
    ]
  );
  _scheduleSync();
  return id;
}

export async function getCustomFoodById(id, userId) {
  const d = await db();
  return d.getFirstAsync(
    `SELECT * FROM custom_foods WHERE id = ? AND user_id = ? AND deleted_at IS NULL`,
    [id, userId]
  );
}

export async function getAllCustomFoods(userId) {
  const d = await db();
  return d.getAllAsync(
    `SELECT * FROM custom_foods WHERE user_id = ? AND deleted_at IS NULL ORDER BY lower(name)`,
    [userId]
  );
}

// ─── daily_intake_rollups (trigger-equivalent, client-side) ──────────────

export async function recomputeRollup(userId, entryDate) {
  const d = await db();
  const row = await d.getFirstAsync(
    `SELECT
       COALESCE(SUM(kcal), 0) AS kcal_total,
       COALESCE(SUM(protein_g), 0) AS protein_g,
       COALESCE(SUM(carbs_g), 0) AS carbs_g,
       COALESCE(SUM(fat_g), 0) AS fat_g,
       COALESCE(SUM(fibre_g), 0) AS fibre_g,
       COUNT(*) AS entries_count
     FROM food_entries
     WHERE user_id = ? AND entry_date = ? AND deleted_at IS NULL`,
    [userId, entryDate]
  );
  const now = Date.now();
  await d.runAsync(
    `INSERT INTO daily_intake_rollups (
      user_id, entry_date, kcal_total, protein_g, carbs_g, fat_g, fibre_g, entries_count, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id, entry_date) DO UPDATE SET
      kcal_total = excluded.kcal_total,
      protein_g  = excluded.protein_g,
      carbs_g    = excluded.carbs_g,
      fat_g      = excluded.fat_g,
      fibre_g    = excluded.fibre_g,
      entries_count = excluded.entries_count,
      updated_at = excluded.updated_at`,
    [
      userId, entryDate,
      row.kcal_total, row.protein_g, row.carbs_g, row.fat_g,
      row.fibre_g || null, row.entries_count, now,
    ]
  );
}

export async function getRollupForDay(userId, entryDate) {
  const d = await db();
  return d.getFirstAsync(
    `SELECT * FROM daily_intake_rollups WHERE user_id = ? AND entry_date = ?`,
    [userId, entryDate]
  );
}

export async function getRollupsForRange(userId, startDate, endDate) {
  const d = await db();
  return d.getAllAsync(
    `SELECT * FROM daily_intake_rollups
     WHERE user_id = ? AND entry_date BETWEEN ? AND ?
     ORDER BY entry_date`,
    [userId, startDate, endDate]
  );
}

/**
 * Compute the 7-day rolling intake average + days-logged count for
 * the FFM floor safety gate. Returns { avgKcal, daysLogged } where
 * daysLogged is the number of distinct days in the last 7 that have
 * at least one entry.
 *
 * Used by callers feeding weeklyCoach inputs.
 */
export async function getRecentIntakeSummary(userId, asOfDate = null) {
  const d = await db();
  const asOf = asOfDate ?? new Date().toISOString().slice(0, 10);
  const startDate = new Date(asOf);
  startDate.setDate(startDate.getDate() - 6);
  const startStr = startDate.toISOString().slice(0, 10);
  const rows = await d.getAllAsync(
    `SELECT entry_date, kcal_total
     FROM daily_intake_rollups
     WHERE user_id = ? AND entry_date BETWEEN ? AND ? AND entries_count > 0`,
    [userId, startStr, asOf]
  );
  if (!rows.length) return { avgKcal: null, daysLogged: 0 };
  const totalKcal = rows.reduce((acc, r) => acc + r.kcal_total, 0);
  return {
    avgKcal: Math.round(totalKcal / rows.length),
    daysLogged: rows.length,
  };
}

// ─── food_favourites ─────────────────────────────────────────────────────

export async function toggleFavourite(userId, foodRef) {
  const d = await db();
  const existing = await d.getFirstAsync(
    `SELECT food_ref FROM food_favourites WHERE user_id = ? AND food_ref = ?`,
    [userId, foodRef]
  );
  if (existing) {
    await d.runAsync(
      `DELETE FROM food_favourites WHERE user_id = ? AND food_ref = ?`,
      [userId, foodRef]
    );
    _scheduleSync();
    return false;
  }
  await d.runAsync(
    `INSERT INTO food_favourites (user_id, food_ref, last_used_at) VALUES (?, ?, ?)`,
    [userId, foodRef, Date.now()]
  );
  _scheduleSync();
  return true;
}

export async function getFavourites(userId) {
  const d = await db();
  return d.getAllAsync(
    `SELECT food_ref, last_used_at FROM food_favourites
     WHERE user_id = ? ORDER BY last_used_at DESC`,
    [userId]
  );
}

// ─── daily_water ─────────────────────────────────────────────────────────

export async function setWater(userId, entryDate, ml) {
  const d = await db();
  const now = Date.now();
  await d.runAsync(
    `INSERT INTO daily_water (user_id, entry_date, ml, updated_at) VALUES (?, ?, ?, ?)
     ON CONFLICT(user_id, entry_date) DO UPDATE SET ml = excluded.ml, updated_at = excluded.updated_at`,
    [userId, entryDate, Math.max(0, ml), now]
  );
  _scheduleSync();
}

export async function getWater(userId, entryDate) {
  const d = await db();
  const row = await d.getFirstAsync(
    `SELECT ml FROM daily_water WHERE user_id = ? AND entry_date = ?`,
    [userId, entryDate]
  );
  return row?.ml ?? 0;
}

// ─── helpers ─────────────────────────────────────────────────────────────

function _scheduleSync() {
  try {
    // eslint-disable-next-line global-require
    require('../sync').scheduleSync();
  } catch (_) { /* sync module unavailable, tolerate */ }
}
