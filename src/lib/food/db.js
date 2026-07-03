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
import { db, runInTransaction } from '../database';
import { CURATED_MEALS, mealItems } from './curatedMeals';
import { resolveFoodRef } from './sources/localCache';
import { todayLocalKey, localDayKey, parseLocalDay } from '../dayKey';
// Single id generator (A2-036); aliased to keep the local uid() call sites.
import { generateUUID as uid } from '../uuid';

// ─── food_entries (the diary) ────────────────────────────────────────────

/**
 * Log a food entry for a user on a specific date and meal slot.
 * Macros are denormalised at log time so future edits to the
 * underlying food don't rewrite history.
 *
 * @param {string} userId
 * @param {object} entry
 * @param {string} entry.entryDate    - 'YYYY-MM-DD'
 * @param {'breakfast'|'lunch'|'dinner'|'preworkout'|'postworkout'|'snack'} entry.mealSlot
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
  // Defence in depth. quantity_g, kcal, protein_g, carbs_g and fat_g are all
  // NOT NULL. A non-finite value (a NaN from a bad upstream calc) would bind
  // as NULL and throw an opaque constraint error, crashing a diary write the
  // user can do dozens of times a day. Coerce to a finite number (default 0)
  // so logging never hard-fails; a stray entry is editable. fibre_g is
  // nullable, so it keeps its null.
  const finite = (v) => (Number.isFinite(v) ? v : 0);
  // is_planned=1 marks a meal-plan entry as scaffolding: excluded from the
  // rollup/adherence/FFM/sync until the user confirms they ate it (adherence
  // model 2026-06-15). Defaults to an actual (0).
  const isPlanned = entry.isPlanned ? 1 : 0;
  await d.runAsync(
    `INSERT INTO food_entries (
      id, user_id, entry_date, meal_slot, food_ref, quantity_g,
      kcal, protein_g, carbs_g, fat_g, fibre_g, logged_at,
      is_planned, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id, userId, entry.entryDate, entry.mealSlot, entry.foodRef,
      finite(entry.quantityG), finite(entry.kcal), finite(entry.proteinG),
      finite(entry.carbsG), finite(entry.fatG),
      Number.isFinite(entry.fibreG) ? entry.fibreG : null, now,
      isPlanned, now, now,
    ]
  );
  await recomputeRollup(userId, entry.entryDate);
  // Per TELEMETRY_DASHBOARDS_LOCKED.md Panel 3 (food layer health).
  // Fire-and-forget; the track() call writes locally first so a
  // network outage does not block the user's diary entry.
  // Lazy-required so test environments that mock ./database can
  // skip pulling in the full supabase client.
  try {
    // eslint-disable-next-line global-require
    const { track } = require('../engineTelemetry');
    track(userId, 'food_logged', {
      // HP-2: source + slot only. The amount eaten (quantity_g) is the
      // user's dietary content and does not belong in product telemetry.
      food_ref_source: entry.foodRef?.startsWith('quick:') ? 'quick_add'
        : entry.foodRef?.startsWith('custom:') ? 'custom'
          : 'global',
      meal_slot: entry.mealSlot,
    }).catch(() => {});
    // E7.2 activation funnel: first-ever food logged (durable, once per user).
    // A real diary entry only, not planned scaffolding.
    if (!isPlanned) {
      // eslint-disable-next-line global-require
      const { trackFirst } = require('../telemetry/firsts');
      trackFirst(userId, 'first_food_logged').catch(() => {});
    }
  } catch (_) { /* tolerate test env without telemetry */ }
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

// Reverse a soft-delete (food audit F-1: the Undo affordance). Clears
// deleted_at so the row is active again, bumps updated_at so the change is the
// latest write (last-write-wins sync resurrects it on every device), recomputes
// the day rollup and re-queues sync — the exact mirror of deleteFoodEntry.
export async function restoreFoodEntry(id, userId) {
  const d = await db();
  const now = Date.now();
  const existing = await d.getFirstAsync(
    `SELECT entry_date FROM food_entries WHERE id = ? AND user_id = ?`,
    [id, userId]
  );
  if (!existing) return false;
  await d.runAsync(
    `UPDATE food_entries SET deleted_at = NULL, updated_at = ? WHERE id = ? AND user_id = ?`,
    [now, id, userId]
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

/**
 * Recent days (before asOfDate) that have live food logged, for the "copy a
 * previous day" picker (food audit F-3). Returns the most recent `limit` days,
 * each with how many items and the day's calories so the user can recognise it.
 */
export async function getRecentLoggedDays(userId, asOfDate, limit = 14) {
  if (!userId || !asOfDate) return [];
  const d = await db();
  return d.getAllAsync(
    `SELECT entry_date, COUNT(*) AS count, SUM(kcal) AS kcal
     FROM food_entries
     WHERE user_id = ? AND deleted_at IS NULL AND entry_date < ?
     GROUP BY entry_date
     ORDER BY entry_date DESC
     LIMIT ?`,
    [userId, asOfDate, limit]
  );
}

/**
 * Whether the user has ANY live food entry at all (E10 read-only lapse views).
 * Drives the route guard's lock-vs-view branch: a lapsed user with logged days
 * gets the view-only diary; a user with nothing logged keeps the ProLocked
 * show-then-sell gate. Cheap indexed existence read, no rows materialised.
 */
export async function hasAnyFoodEntries(userId) {
  if (!userId) return false;
  const d = await db();
  // is_planned = 0: unconfirmed meal-plan scaffolding is not logged history
  // (hostile review E10 #4) — a user whose only rows are un-eaten planned
  // meals keeps the ProLocked gate, not a read-only view of food they never
  // ate.
  const row = await d.getFirstAsync(
    `SELECT 1 AS one FROM food_entries
     WHERE user_id = ? AND deleted_at IS NULL AND is_planned = 0 LIMIT 1`,
    [userId]
  );
  return !!row;
}

/**
 * Confirm a day's planned meals as eaten (adherence model 2026-06-15): flips
 * is_planned 1 -> 0 so they count towards the rollup/adherence/FFM and sync as
 * normal actuals. Bumps logged_at + updated_at. Returns the number confirmed.
 */
export async function confirmPlannedDay(userId, entryDate) {
  const d = await db();
  const now = Date.now();
  const res = await d.runAsync(
    `UPDATE food_entries SET is_planned = 0, logged_at = ?, updated_at = ?
     WHERE user_id = ? AND entry_date = ? AND is_planned = 1 AND deleted_at IS NULL`,
    [now, now, userId, entryDate]
  );
  await recomputeRollup(userId, entryDate);
  _scheduleSync();
  return res?.changes ?? 0;
}

/**
 * Distinct days in [startIso, endIso] that still hold unconfirmed planned meals
 * (is_planned=1). Used by the weekly check-in to offer a retroactive "I ate as
 * planned" backstop for days the user never confirmed in the diary.
 */
export async function getPlannedDaysInRange(userId, startIso, endIso) {
  const d = await db();
  const rows = await d.getAllAsync(
    `SELECT DISTINCT entry_date FROM food_entries
     WHERE user_id = ? AND entry_date >= ? AND entry_date <= ?
       AND is_planned = 1 AND deleted_at IS NULL
     ORDER BY entry_date`,
    [userId, startIso, endIso]
  );
  return rows.map((r) => r.entry_date);
}

/**
 * Discard a day's planned scaffolding without eating it (the "no" path).
 * Planned rows are local-only and never synced, so a hard delete is safe;
 * actuals on the day are untouched. Returns the number cleared.
 */
export async function clearPlannedDay(userId, entryDate) {
  const d = await db();
  const res = await d.runAsync(
    `DELETE FROM food_entries
     WHERE user_id = ? AND entry_date = ? AND is_planned = 1`,
    [userId, entryDate]
  );
  await recomputeRollup(userId, entryDate);
  return res?.changes ?? 0;
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

export async function getFoodEntriesForRange(userId, startDate, endDate) {
  const d = await db();
  return d.getAllAsync(
    `SELECT * FROM food_entries
     WHERE user_id = ? AND entry_date BETWEEN ? AND ? AND deleted_at IS NULL
     ORDER BY entry_date, meal_slot, logged_at`,
    [userId, startDate, endDate]
  );
}

// ─── food_frequents (GAP row 28, server-computed cache) ──────────────────
//
// Derived data: the server recomputes the top-20-over-30-days nightly
// (cloud migration 051) and the client pulls a snapshot into this table.
// replaceFoodFrequents swaps the whole cache for one user in a single
// transaction so a reader never catches it mid-write.

export async function replaceFoodFrequents(userId, rows) {
  const d = await db();
  await runInTransaction(d, async () => {
    await d.runAsync('DELETE FROM food_frequents WHERE user_id = ?', [userId]);
    for (const r of rows || []) {
      if (!r?.food_ref) continue;
      await d.runAsync(
        `INSERT OR REPLACE INTO food_frequents
           (user_id, food_ref, log_count, last_logged_at, computed_at)
         VALUES (?, ?, ?, ?, ?)`,
        [userId, r.food_ref, r.log_count ?? 0, _isoToMs(r.last_logged_at), _isoToMs(r.computed_at)],
      );
    }
  });
}

export async function getFoodFrequents(userId, limit = 20) {
  const d = await db();
  return d.getAllAsync(
    `SELECT food_ref, log_count FROM food_frequents
     WHERE user_id = ? ORDER BY log_count DESC, last_logged_at DESC
     LIMIT ?`,
    [userId, limit],
  );
}

// ─── food_slot_recents (COMP-002, client-only "Add again" memory) ────────
//
// Per-(user, slot, food) log frequency and last-used portion, written on
// every food log from the picker and read by the slot-aware "Add again"
// tab. Never synced: derived data that rebuilds itself as the user logs.

export async function upsertSlotRecent(userId, { mealSlot, foodRef, quantityG }) {
  // Quick-adds aren't foods (no resolvable record) so they never earn a
  // slot-recent row.
  if (!userId || !mealSlot || !foodRef || foodRef.startsWith('quick:')) return;
  const d = await db();
  await d.runAsync(
    `INSERT INTO food_slot_recents
       (user_id, meal_slot, food_ref, log_count, last_logged_at, last_quantity_g)
     VALUES (?, ?, ?, 1, ?, ?)
     ON CONFLICT(user_id, meal_slot, food_ref) DO UPDATE SET
       log_count = log_count + 1,
       last_logged_at = excluded.last_logged_at,
       last_quantity_g = excluded.last_quantity_g`,
    [userId, mealSlot, foodRef, Date.now(), Number.isFinite(quantityG) ? quantityG : 0],
  );
}

export async function getSlotRecents(userId, mealSlot, limit = 10) {
  const d = await db();
  return d.getAllAsync(
    `SELECT food_ref, last_quantity_g, log_count
     FROM food_slot_recents
     WHERE user_id = ? AND meal_slot = ?
     ORDER BY log_count DESC, last_logged_at DESC
     LIMIT ?`,
    [userId, mealSlot, limit],
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
      barcode_ean, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id, userId, food.name, food.brand ?? null,
      food.servingG, food.servingLabel ?? null,
      food.kcal100g, food.protein100g, food.carbs100g, food.fat100g,
      food.fibre100g ?? null, food.sodium100g ?? null, food.sugar100g ?? null,
      food.photoUrl ?? null, food.notes ?? null,
      food.barcodeEan ?? null,
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
     WHERE user_id = ? AND entry_date = ? AND deleted_at IS NULL AND is_planned = 0`,
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
      // Store the summed fibre as-is (COALESCEd to 0 above) like the other
      // macros; the old `|| null` turned a real 0 g total into NULL, making a
      // zero-fibre day indistinguishable from "no data" (food review D-m5).
      row.fibre_g, row.entries_count, now,
    ]
  );
}

// TZ-1 phase 2: re-key historical food_entries to the LOCAL calendar day.
// Phase 1 switched new writes to local; rows written earlier (or pulled from a
// build that wrote UTC keys) still carry a UTC entry_date. Each row keeps its
// logged_at timestamp, so we recompute entry_date from it and rebuild the
// affected days' rollups. Idempotent: only rows whose key actually changes are
// touched (updated_at bumped so the change syncs to cloud). Run once per user
// behind the caller's guard. Best-effort: it uses the device's current
// timezone applied to logged_at, so a user who logged in another timezone has
// those rows classified by the current one.
export async function rekeyFoodEntriesToLocalDay(userId) {
  if (!userId) return 0;
  const d = await db();
  const rows = await d.getAllAsync(
    'SELECT id, entry_date, logged_at FROM food_entries WHERE user_id = ? AND deleted_at IS NULL',
    [userId],
  );
  const affectedDays = new Set();
  const updates = [];
  for (const r of rows ?? []) {
    if (r.logged_at == null) continue;
    const newKey = localDayKey(r.logged_at);
    if (newKey && newKey !== r.entry_date) {
      affectedDays.add(r.entry_date);
      affectedDays.add(newKey);
      updates.push([r.id, newKey]);
    }
  }
  if (updates.length === 0) return 0;
  const now = Date.now();
  // Re-key AND rebuild the affected days' rollups in ONE transaction so they
  // commit atomically. If the recompute throws, the entry_date updates roll
  // back too, the guard flag stays unset, and the next launch redoes the whole
  // thing cleanly. (Previously the recompute ran after the txn: a failure there
  // left the entries re-keyed but the rollups stale, and the re-run early-
  // returned before recomputing because nothing was left to update.)
  await runInTransaction(d, async () => {
    for (const [id, newKey] of updates) {
      await d.runAsync(
        'UPDATE food_entries SET entry_date = ?, updated_at = ? WHERE id = ?',
        [newKey, now, id],
      );
    }
    // Rebuild every day that lost or gained entries (old key and new key).
    for (const day of affectedDays) {
      await recomputeRollup(userId, day);
    }
  });
  return updates.length;
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
 * Compute the recent intake summary for the FFM floor safety gate over a 7-day
 * window. Returns { avgKcal, daysLogged } where daysLogged is the number of
 * distinct days in the last 7 with at least one entry, and avgKcal is the mean
 * across THOSE LOGGED DAYS (divided by daysLogged, not by 7) — so days the user
 * didn't log don't dilute the figure the floor gate sees (food review D-n3).
 *
 * Used by callers feeding weeklyCoach inputs.
 */
export async function getRecentIntakeSummary(userId, asOfDate = null) {
  const d = await db();
  const asOf = asOfDate ?? todayLocalKey();
  // Build the 7-day window on the LOCAL calendar. new Date('YYYY-MM-DD') parses
  // as UTC midnight, so in BST the start day used to slip back a day and the
  // window covered 8 days. parseLocalDay + localDayKey keep it aligned to the
  // same local day-keys the rollup rows are stored under.
  const startDate = parseLocalDay(asOf);
  startDate.setDate(startDate.getDate() - 6);
  const startStr = localDayKey(startDate.getTime());
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

// ─── food_favourites (likes) + food_dislikes ─────────────────────────────
//
// One table, one column (`kind`). A food can be:
//   - not in the table at all  -> 'none' (neutral; default state)
//   - kind = 'fav'             -> user likes it; surfaces in Favourites
//                                  section, suggested by future meal
//                                  suggester / recipe builder
//   - kind = 'dislike'         -> user explicitly excludes it; coach
//                                  + future suggesters skip it; user
//                                  can still log it deliberately
// Composite PK (user_id, food_ref) means each food is one state at
// a time. Toggling from 'fav' -> 'dislike' just updates the row
// rather than inserting a duplicate.

const VALID_KINDS = new Set(['fav', 'dislike']);

/**
 * Set or clear a food preference.
 *   setFoodPreference(uid, ref, 'fav')      -> insert/update to fav
 *   setFoodPreference(uid, ref, 'dislike')  -> insert/update to dislike
 *   setFoodPreference(uid, ref, null)       -> delete the row (back to neutral)
 *
 * Returns the new state: 'fav' | 'dislike' | null.
 */
export async function setFoodPreference(userId, foodRef, kind) {
  if (kind != null && !VALID_KINDS.has(kind)) {
    throw new Error(`setFoodPreference: invalid kind '${kind}'`);
  }
  const d = await db();
  if (kind === null) {
    // D1-#8: SOFT-delete, not a hard DELETE. Set deleted_at + bump last_used_at
    // so the tombstone out-clocks an older edit and propagates cross-device via
    // the food sync `deleted` slice; a hard delete left no trace to sync, so the
    // row re-pulled back from another device.
    await d.runAsync(
      `UPDATE food_favourites
       SET deleted_at = ?, last_used_at = ?
       WHERE user_id = ? AND food_ref = ?`,
      [Date.now(), Date.now(), userId, foodRef]
    );
    _scheduleSync();
    return null;
  }
  // Re-favouriting a previously deleted food clears its tombstone.
  await d.runAsync(
    `INSERT INTO food_favourites (user_id, food_ref, last_used_at, kind, deleted_at)
     VALUES (?, ?, ?, ?, NULL)
     ON CONFLICT(user_id, food_ref) DO UPDATE SET
       kind = excluded.kind,
       last_used_at = excluded.last_used_at,
       deleted_at = NULL`,
    [userId, foodRef, Date.now(), kind]
  );
  _scheduleSync();
  return kind;
}

/**
 * Current preference for one food, or null when neutral.
 */
export async function getFoodPreference(userId, foodRef) {
  const d = await db();
  const row = await d.getFirstAsync(
    `SELECT kind FROM food_favourites WHERE user_id = ? AND food_ref = ? AND deleted_at IS NULL`,
    [userId, foodRef]
  );
  return row?.kind ?? null;
}

/**
 * Cycle a food's preference: none -> fav -> dislike -> none. Used by
 * the long-press toggle on every food row in FoodSearchScreen.
 * Returns the new state.
 */
export async function cycleFoodPreference(userId, foodRef) {
  const current = await getFoodPreference(userId, foodRef);
  const next = current === null ? 'fav'
    : current === 'fav' ? 'dislike'
    : null;
  return setFoodPreference(userId, foodRef, next);
}

/**
 * Backwards-compatible wrapper that toggles ONLY between 'fav' and
 * neutral. Existing callers (older code paths) keep working
 * unchanged; new code should use setFoodPreference or
 * cycleFoodPreference. Returns true when the row is now a fav,
 * false when it was removed.
 */
export async function toggleFavourite(userId, foodRef) {
  const current = await getFoodPreference(userId, foodRef);
  if (current === 'fav') {
    await setFoodPreference(userId, foodRef, null);
    return false;
  }
  // 'dislike' or null both flip to 'fav' under the legacy toggle.
  await setFoodPreference(userId, foodRef, 'fav');
  return true;
}

export async function getFavourites(userId) {
  const d = await db();
  return d.getAllAsync(
    `SELECT food_ref, last_used_at FROM food_favourites
     WHERE user_id = ? AND kind = 'fav' AND deleted_at IS NULL
     ORDER BY last_used_at DESC`,
    [userId]
  );
}

export async function getDislikes(userId) {
  const d = await db();
  return d.getAllAsync(
    `SELECT food_ref, last_used_at FROM food_favourites
     WHERE user_id = ? AND kind = 'dislike' AND deleted_at IS NULL
     ORDER BY last_used_at DESC`,
    [userId]
  );
}

// ─── daily_water ─────────────────────────────────────────────────────────

export async function setWater(userId, entryDate, ml) {
  const d = await db();
  const now = Date.now();
  // Setting water clears any prior tombstone (D1-#8): re-logging water on a
  // previously deleted day brings the row back to life.
  await d.runAsync(
    `INSERT INTO daily_water (user_id, entry_date, ml, updated_at, deleted_at) VALUES (?, ?, ?, ?, NULL)
     ON CONFLICT(user_id, entry_date) DO UPDATE SET ml = excluded.ml, updated_at = excluded.updated_at, deleted_at = NULL`,
    [userId, entryDate, Math.max(0, ml), now]
  );
  _scheduleSync();
}

// D1-#8: SOFT-delete a day's water so the deletion propagates cross-device via
// the food sync `deleted` slice. Set deleted_at + bump updated_at so the
// tombstone out-clocks an older edit on the other device.
export async function deleteWater(userId, entryDate) {
  const d = await db();
  const now = Date.now();
  await d.runAsync(
    `UPDATE daily_water
     SET deleted_at = ?, updated_at = ?
     WHERE user_id = ? AND entry_date = ?`,
    [now, now, userId, entryDate]
  );
  _scheduleSync();
}

export async function getWater(userId, entryDate) {
  const d = await db();
  const row = await d.getFirstAsync(
    `SELECT ml FROM daily_water WHERE user_id = ? AND entry_date = ? AND deleted_at IS NULL`,
    [userId, entryDate]
  );
  return row?.ml ?? 0;
}

// ─── recipes (CRUD) ──────────────────────────────────────────────────────
//
// A recipe is the user's own composed food: name + total servings +
// notes + an ordered list of ingredients (food_ref + quantity_g).
// Schema lives in `recipes` + `recipe_ingredients`; both tables have
// soft-delete tombstones (deleted_at) so the cloud sees deletions
// after sync.
//
// computeRecipeMacros() sums the resolved ingredients' macros and
// returns both the total and the per-serving figures so the UI can
// render both numbers without redoing the math.

/**
 * Insert a new recipe. Returns the new id so the caller can navigate
 * straight into the builder for that recipe.
 */
export async function createRecipe(userId, { name, totalServings, notes = null }) {
  if (!name || !name.trim()) {
    throw new Error('createRecipe: name is required');
  }
  const servings = Number(totalServings);
  if (!Number.isFinite(servings) || servings <= 0) {
    throw new Error('createRecipe: totalServings must be > 0');
  }
  const d = await db();
  const id = uid();
  const now = Date.now();
  await d.runAsync(
    `INSERT INTO recipes
       (id, user_id, name, total_servings, notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, userId, name.trim(), servings, notes, now, now]
  );
  _scheduleSync();
  return id;
}

/**
 * Patch a recipe in place. Fields not present in `patch` are left
 * untouched. Always bumps `updated_at` so sync picks it up.
 */
export async function updateRecipe(userId, recipeId, patch = {}) {
  const d = await db();
  const now = Date.now();
  const fields = [];
  const params = [];
  if (patch.name !== undefined) {
    if (!patch.name || !patch.name.trim()) {
      throw new Error('updateRecipe: name cannot be blank');
    }
    fields.push('name = ?');
    params.push(patch.name.trim());
  }
  if (patch.totalServings !== undefined) {
    const servings = Number(patch.totalServings);
    if (!Number.isFinite(servings) || servings <= 0) {
      throw new Error('updateRecipe: totalServings must be > 0');
    }
    fields.push('total_servings = ?');
    params.push(servings);
  }
  if (patch.notes !== undefined) {
    fields.push('notes = ?');
    params.push(patch.notes ?? null);
  }
  if (!fields.length) return;
  fields.push('updated_at = ?');
  params.push(now, recipeId, userId);
  await d.runAsync(
    `UPDATE recipes
     SET ${fields.join(', ')}
     WHERE id = ? AND user_id = ? AND deleted_at IS NULL`,
    params
  );
  _scheduleSync();
}

/**
 * Soft-delete a recipe and tombstone every ingredient under it.
 */
export async function deleteRecipe(userId, recipeId) {
  const d = await db();
  const now = Date.now();
  await d.runAsync(
    `UPDATE recipes
     SET deleted_at = ?, updated_at = ?
     WHERE id = ? AND user_id = ?`,
    [now, now, recipeId, userId]
  );
  await d.runAsync(
    `UPDATE recipe_ingredients
     SET deleted_at = ?, updated_at = ?
     WHERE recipe_id = ? AND user_id = ? AND deleted_at IS NULL`,
    [now, now, recipeId, userId]
  );
  _scheduleSync();
}

/**
 * Active recipes (not tombstoned), newest-touched first.
 */
export async function listRecipes(userId) {
  const d = await db();
  return d.getAllAsync(
    `SELECT id, name, total_servings, notes, created_at, updated_at
     FROM recipes
     WHERE user_id = ? AND deleted_at IS NULL
     ORDER BY updated_at DESC`,
    [userId]
  );
}

/**
 * Recipe header + ingredients in order. Returns null when the recipe
 * doesn't exist or has been deleted.
 */
export async function getRecipeWithIngredients(userId, recipeId) {
  const d = await db();
  const recipe = await d.getFirstAsync(
    `SELECT id, user_id, name, total_servings, notes, created_at, updated_at
     FROM recipes
     WHERE id = ? AND user_id = ? AND deleted_at IS NULL`,
    [recipeId, userId]
  );
  if (!recipe) return null;
  const ingredients = await d.getAllAsync(
    `SELECT id, food_ref, quantity_g, order_index
     FROM recipe_ingredients
     WHERE recipe_id = ? AND user_id = ? AND deleted_at IS NULL
     ORDER BY order_index ASC, created_at ASC`,
    [recipeId, userId]
  );
  return { ...recipe, ingredients };
}

/**
 * Replace a recipe's ingredient list. Caller passes the new full
 * ordered set; helper tombstones the existing rows and writes the
 * new ones. Atomic via withTransactionAsync.
 *
 * Each ingredient: { food_ref, quantity_g, id? }
 * - id missing → new row, fresh uuid
 * - id present → reuse it so any in-flight sync row identity holds
 */
export async function setRecipeIngredients(userId, recipeId, newIngredients) {
  if (!Array.isArray(newIngredients)) {
    throw new Error('setRecipeIngredients: newIngredients must be an array');
  }
  const d = await db();
  const now = Date.now();
  await runInTransaction(d, async () => {
    await d.runAsync(
      `UPDATE recipe_ingredients
       SET deleted_at = ?, updated_at = ?
       WHERE recipe_id = ? AND user_id = ? AND deleted_at IS NULL`,
      [now, now, recipeId, userId]
    );
    for (let i = 0; i < newIngredients.length; i++) {
      const ing = newIngredients[i];
      const id = ing.id || uid();
      const q = Number(ing.quantity_g);
      if (!ing.food_ref || !Number.isFinite(q) || q <= 0) continue;
      await d.runAsync(
        `INSERT OR REPLACE INTO recipe_ingredients
           (id, recipe_id, user_id, food_ref, quantity_g, order_index,
            created_at, updated_at, deleted_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
        [id, recipeId, userId, ing.food_ref, q, i, ing.created_at ?? now, now]
      );
    }
    await d.runAsync(
      `UPDATE recipes SET updated_at = ? WHERE id = ? AND user_id = ?`,
      [now, recipeId, userId]
    );
  });
  _scheduleSync();
}

/**
 * Compute macros for the recipe as a whole and per-serving.
 * `resolvedIngredients`: [{ food: <food row with kcal_100g etc>, quantity_g }]
 * Returns { total: {kcal, protein, carbs, fat, fibre}, perServing: {...} }
 */
export function computeRecipeMacros(resolvedIngredients, totalServings) {
  let kcal = 0, protein = 0, carbs = 0, fat = 0, fibre = 0;
  for (const item of resolvedIngredients || []) {
    if (!item || !item.food) continue;
    const factor = Number(item.quantity_g) / 100;
    if (!Number.isFinite(factor) || factor < 0) continue;
    kcal += (item.food.kcal_100g ?? 0) * factor;
    protein += (item.food.protein_100g ?? 0) * factor;
    carbs += (item.food.carbs_100g ?? 0) * factor;
    fat += (item.food.fat_100g ?? 0) * factor;
    fibre += (item.food.fibre_100g ?? 0) * factor;
  }
  const servings = Math.max(Number(totalServings) || 1, 0.01);
  const round1 = (n) => Math.round(n * 10) / 10;
  return {
    total: {
      kcal: Math.round(kcal),
      protein: round1(protein),
      carbs: round1(carbs),
      fat: round1(fat),
      fibre: round1(fibre),
    },
    perServing: {
      kcal: Math.round(kcal / servings),
      protein: round1(protein / servings),
      carbs: round1(carbs / servings),
      fat: round1(fat / servings),
      fibre: round1(fibre / servings),
    },
  };
}

// ─── Saved meals (My Meals templates) ────────────────────────────────────
// A saved meal is a named bundle of foods the user logs together (e.g.
// "my usual breakfast"). Unlike a recipe (a child-table ingredient list
// scaled by servings), a saved meal stores its foods inline as a JSON
// array in items_json, so applying it is just N food_entries inserts.
//
// Item shape (camelCase, aligned 1:1 with logFoodEntry's `entry` so apply
// can hand each item straight to it):
//   { foodRef, name, quantityG, kcal, proteinG, carbsG, fatG, fibreG }
//
// The cloud column is items_json (jsonb); the sync serialiser
// (_savedMealToCloud) parses this TEXT back to an array on push.

function _parseSavedMealItems(raw) {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try {
      const v = JSON.parse(raw);
      return Array.isArray(v) ? v : [];
    } catch {
      return [];
    }
  }
  return [];
}

/**
 * Sum the per-item macros for list/detail display. Tolerant of missing
 * fields (an item with no fat contributes 0 fat).
 */
export function computeSavedMealTotals(items) {
  let kcal = 0, protein = 0, carbs = 0, fat = 0;
  for (const it of items || []) {
    kcal += Number(it?.kcal) || 0;
    protein += Number(it?.proteinG) || 0;
    carbs += Number(it?.carbsG) || 0;
    fat += Number(it?.fatG) || 0;
  }
  const round1 = (n) => Math.round(n * 10) / 10;
  return { kcal: Math.round(kcal), protein: round1(protein), carbs: round1(carbs), fat: round1(fat) };
}

/**
 * Create a saved meal from a set of food items. `items` is the inline
 * food array (see shape above). Returns the new id.
 */
export async function createSavedMeal(userId, { name, items } = {}) {
  if (!name || !name.trim()) {
    throw new Error('createSavedMeal: name is required');
  }
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('createSavedMeal: at least one item is required');
  }
  const d = await db();
  const id = uid();
  const now = Date.now();
  await d.runAsync(
    `INSERT INTO saved_meals (id, user_id, name, items_json, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, userId, name.trim(), JSON.stringify(items), now, now]
  );
  _scheduleSync();
  return id;
}

/**
 * Active saved meals (not tombstoned), newest-touched first. Each row
 * carries its parsed `items` array plus `totals` + `itemCount` so the
 * list can render macros without re-parsing.
 */
export async function listSavedMeals(userId) {
  const d = await db();
  const rows = await d.getAllAsync(
    `SELECT id, name, items_json, created_at, updated_at
     FROM saved_meals
     WHERE user_id = ? AND deleted_at IS NULL
     ORDER BY updated_at DESC`,
    [userId]
  );
  return rows.map((r) => {
    const items = _parseSavedMealItems(r.items_json);
    return {
      id: r.id,
      name: r.name,
      items,
      itemCount: items.length,
      totals: computeSavedMealTotals(items),
      created_at: r.created_at,
      updated_at: r.updated_at,
    };
  });
}

/**
 * One saved meal with its parsed items, or null if missing/deleted.
 */
export async function getSavedMeal(userId, id) {
  const d = await db();
  const row = await d.getFirstAsync(
    `SELECT id, name, items_json, created_at, updated_at
     FROM saved_meals
     WHERE id = ? AND user_id = ? AND deleted_at IS NULL`,
    [id, userId]
  );
  if (!row) return null;
  const items = _parseSavedMealItems(row.items_json);
  return { ...row, items, itemCount: items.length, totals: computeSavedMealTotals(items) };
}

/**
 * Rename a saved meal. Bumps updated_at so sync picks it up.
 */
export async function renameSavedMeal(userId, id, name) {
  if (!name || !name.trim()) {
    throw new Error('renameSavedMeal: name cannot be blank');
  }
  const d = await db();
  const now = Date.now();
  await d.runAsync(
    `UPDATE saved_meals SET name = ?, updated_at = ?
     WHERE id = ? AND user_id = ? AND deleted_at IS NULL`,
    [name.trim(), now, id, userId]
  );
  _scheduleSync();
}

/**
 * Soft-delete a saved meal so the tombstone reaches the cloud.
 */
export async function deleteSavedMeal(userId, id) {
  const d = await db();
  const now = Date.now();
  await d.runAsync(
    `UPDATE saved_meals SET deleted_at = ?, updated_at = ?
     WHERE id = ? AND user_id = ?`,
    [now, now, id, userId]
  );
  _scheduleSync();
}

/**
 * Log every food in a saved meal to the diary at the given slot + date.
 * Reuses logFoodEntry per item so rollup recompute, telemetry, and sync
 * scheduling all behave exactly like a manual log. Items missing a foodRef
 * or a positive quantity are skipped rather than logged as junk.
 *
 * Returns { logged, entryIds }: `logged` is the count (kept for the pre-C6
 * `n > 0` callsite contract), `entryIds` is every food_entries id actually
 * created, in insert order, so a caller can offer a full Undo (C6, Wave A)
 * that removes exactly the entries this call made, not just one.
 *
 * T1 (world-class audit 2026-07-03): also writes ONE food_slot_recents row
 * for the meal itself, keyed on a synthetic 'meal:<id>' ref (never written
 * to food_entries, so it can never leak into the diary, CSV export or
 * resolveFoodRef's food-row contract). This is the same client-only,
 * unsynced table and the same log_count/last_logged_at ranking single foods
 * already use for "Add again" (see food_slot_recents above); it does not
 * touch the per-item slot-recent rows below, so a meal log doesn't inflate
 * its individual ingredients' own recency. Derived memory only; never fails
 * the log.
 */
export async function applySavedMealToDiary(userId, id, { mealSlot, entryDate } = {}) {
  if (!mealSlot || !entryDate) {
    throw new Error('applySavedMealToDiary: mealSlot and entryDate are required');
  }
  const meal = await getSavedMeal(userId, id);
  if (!meal) return { logged: 0, entryIds: [] };
  const entryIds = [];
  for (const it of meal.items) {
    const q = Number(it?.quantityG);
    if (!it?.foodRef || !Number.isFinite(q) || q <= 0) continue;
    const entryId = await logFoodEntry(userId, {
      entryDate,
      mealSlot,
      foodRef: it.foodRef,
      quantityG: q,
      kcal: Number(it.kcal) || 0,
      proteinG: Number(it.proteinG) || 0,
      carbsG: Number(it.carbsG) || 0,
      fatG: Number(it.fatG) || 0,
      fibreG: it.fibreG != null ? Number(it.fibreG) : null,
    });
    entryIds.push(entryId);
  }
  if (entryIds.length > 0) {
    // quantityG has no meaning for a whole meal (it isn't measured in grams),
    // so 0 is stored; nothing reads last_quantity_g for a meal: ref.
    await upsertSlotRecent(userId, { mealSlot, foodRef: `meal:${id}`, quantityG: 0 }).catch(() => {});
  }
  return { logged: entryIds.length, entryIds };
}

/**
 * Resolve a food_slot_recents ref for the "Add again" pool, including a
 * saved meal's synthetic 'meal:<id>' ref (T1, world-class audit 2026-07-03).
 * A saved meal fans out into several food_entries rows rather than one (see
 * applySavedMealToDiary), so it has no single per-100g profile to resolve
 * the way resolveFoodRef does for a real food or a recipe; it gets its own
 * display shape here instead, treating the whole meal as "one serving" on a
 * 100 g basis (the same convention resolveFoodRef already uses for a
 * curated food with no serving size) so FoodRow's existing kcal-per-serving
 * maths shows the meal's true totals with no change to FoodRow itself.
 * `savedMealId` and `itemCount` ride along for the caller's relog + audit
 * use; they are not part of resolveFoodRef's food-row contract.
 *
 * Every other ref (global/custom/curated/recipe) passes straight through to
 * resolveFoodRef unchanged, so single-food and recipe resolution behave
 * exactly as before.
 */
export async function resolveSlotRecentRef(userId, foodRef) {
  if (typeof foodRef === 'string' && foodRef.startsWith('meal:')) {
    const id = foodRef.slice('meal:'.length);
    const meal = await getSavedMeal(userId, id);
    if (!meal) return null;
    return {
      food_ref: foodRef,
      savedMealId: meal.id,
      itemCount: meal.itemCount,
      name: meal.name,
      source: null,
      brand: null,
      serving_g: null,
      serving_label: `${meal.itemCount} ${meal.itemCount === 1 ? 'food' : 'foods'}`,
      kcal_100g: meal.totals.kcal,
      protein_100g: meal.totals.protein,
      carbs_100g: meal.totals.carbs,
      fat_100g: meal.totals.fat,
    };
  }
  return resolveFoodRef(userId, foodRef);
}

/**
 * Log a curated meal (from the suggestion library) into the diary. The
 * meal is defined as foods + grams; its items carry computed macros
 * (foodRef 'curated:<key>'), so this fans them out into food_entries
 * exactly like a saved meal. Returns the number of items logged, or 0
 * when the meal id is unknown.
 */
export async function applyCuratedMealToDiary(userId, mealId, { mealSlot, entryDate } = {}) {
  if (!mealSlot || !entryDate) {
    throw new Error('applyCuratedMealToDiary: mealSlot and entryDate are required');
  }
  const meal = CURATED_MEALS.find(m => m.id === mealId);
  if (!meal) return 0;
  let logged = 0;
  for (const it of mealItems(meal)) {
    const q = Number(it?.quantityG);
    if (!it?.foodRef || !Number.isFinite(q) || q <= 0) continue;
    await logFoodEntry(userId, {
      entryDate,
      mealSlot,
      foodRef: it.foodRef,
      quantityG: q,
      kcal: Number(it.kcal) || 0,
      proteinG: Number(it.proteinG) || 0,
      carbsG: Number(it.carbsG) || 0,
      fatG: Number(it.fatG) || 0,
      fibreG: null,
    });
    logged += 1;
  }
  return logged;
}

// ───────────────────────────────────────────────────────────────────────
// Generated meal plan (deep-audit Theme G). One active plan per user,
// stored whole as JSON (the assembled day/week + the prefs and engine-
// target snapshot it was built from, so swaps and coach edits can
// re-solve). Synced bidirectionally via the registry (handler
// src/lib/sync/tables/mealPlans.js, cloud migration 086): the latest row
// per user moves, last-write-wins on epoch-ms updated_at, and soft-delete
// tombstones propagate.
// ───────────────────────────────────────────────────────────────────────

/**
 * Save (replace) the user's active meal plan. Deactivates any prior
 * active plan and inserts the new one in a single transaction. `plan` is
 * the assembled object plus its snapshots; it is stored verbatim as JSON.
 * Returns the new plan id.
 */
export async function saveActiveMealPlan(userId, plan) {
  if (!userId) throw new Error('saveActiveMealPlan: userId is required');
  if (!plan || typeof plan !== 'object') throw new Error('saveActiveMealPlan: plan is required');
  const d = await db();
  const id = uid();
  const now = Date.now();
  // runInTransaction(d, task) — withTransactionAsync passes no tx arg, so
  // the task uses the same d handle (the established pattern in this file).
  await runInTransaction(d, async () => {
    await d.runAsync(
      `UPDATE meal_plans SET is_active = 0, updated_at = ?
       WHERE user_id = ? AND is_active = 1 AND deleted_at IS NULL`,
      [now, userId]
    );
    await d.runAsync(
      `INSERT INTO meal_plans (id, user_id, plan_json, is_active, created_at, updated_at)
       VALUES (?, ?, ?, 1, ?, ?)`,
      [id, userId, JSON.stringify(plan), now, now]
    );
  });
  _scheduleSync();
  return id;
}

/**
 * The user's active meal plan with its parsed `plan` object, or null when
 * there is none. The stored snapshot round-trips unchanged.
 */
export async function getActiveMealPlan(userId) {
  const d = await db();
  const row = await d.getFirstAsync(
    `SELECT id, plan_json, created_at, updated_at
     FROM meal_plans
     WHERE user_id = ? AND is_active = 1 AND deleted_at IS NULL
     ORDER BY updated_at DESC`,
    [userId]
  );
  if (!row) return null;
  let plan = null;
  try { plan = JSON.parse(row.plan_json); } catch (_) { plan = null; }
  if (!plan) return null;
  return { id: row.id, plan, created_at: row.created_at, updated_at: row.updated_at };
}

/**
 * Persist an in-place change to the active plan (a swap or a coach edit).
 * Replaces the stored JSON and bumps updated_at; _scheduleSync then pushes
 * it through the registry. No-ops when the id is missing or already tombstoned.
 */
export async function updateMealPlan(userId, id, plan) {
  if (!plan || typeof plan !== 'object') throw new Error('updateMealPlan: plan is required');
  const d = await db();
  const now = Date.now();
  await d.runAsync(
    `UPDATE meal_plans SET plan_json = ?, updated_at = ?
     WHERE id = ? AND user_id = ? AND deleted_at IS NULL`,
    [JSON.stringify(plan), now, id, userId]
  );
  _scheduleSync();
}

/**
 * Soft-delete a meal plan; the tombstone propagates through the registry
 * sync handler (migration 086).
 */
export async function deleteMealPlan(userId, id) {
  const d = await db();
  const now = Date.now();
  await d.runAsync(
    `UPDATE meal_plans SET deleted_at = ?, is_active = 0, updated_at = ?
     WHERE id = ? AND user_id = ?`,
    [now, now, id, userId]
  );
  _scheduleSync();
}

/**
 * The user's most recent meal-plan row for sync, INCLUDING tombstones so a
 * delete on this device propagates to others. Raw row (plan_json stays a
 * string); null when the user has never had a plan.
 */
export async function getLatestMealPlanRowForSync(userId) {
  const d = await db();
  const row = await d.getFirstAsync(
    `SELECT id, plan_json, is_active, deleted_at, created_at, updated_at
     FROM meal_plans
     WHERE user_id = ?
     ORDER BY updated_at DESC
     LIMIT 1`,
    [userId]
  );
  return row || null;
}

/**
 * Apply a cloud meal-plan row locally with a last-write-wins guard: a
 * local row with the same id and an equal-or-newer updated_at is never
 * trampled. When the incoming row is the active plan, any other active
 * local plan is deactivated in the same transaction (one active plan per
 * user, same invariant saveActiveMealPlan keeps). Pull-side only: never
 * schedules a push. Returns true when the row was applied.
 */
export async function applyMealPlanRowFromCloud(userId, row) {
  if (!userId || !row?.id || typeof row.plan_json !== 'string') return false;
  const incomingUpdated = Number(row.updated_at) || 0;
  const d = await db();
  const local = await d.getFirstAsync(
    'SELECT updated_at FROM meal_plans WHERE id = ? AND user_id = ?',
    [row.id, userId]
  );
  if (local && Number(local.updated_at) >= incomingUpdated) return false;

  const isActive = row.is_active ? 1 : 0;
  const deletedAt = row.deleted_at == null ? null : Number(row.deleted_at);
  await runInTransaction(d, async () => {
    if (isActive && deletedAt == null) {
      // Bump updated_at on the deactivated sibling (food review D-m4): the old
      // `updated_at = updated_at` no-op meant the deactivation never re-pushed,
      // so a second device could keep showing two "active" plans. Stamping it
      // with the incoming change time lets the change query pick it up.
      await d.runAsync(
        `UPDATE meal_plans SET is_active = 0, updated_at = ?
         WHERE user_id = ? AND is_active = 1 AND id != ?`,
        [incomingUpdated, userId, row.id]
      );
    }
    await d.runAsync(
      `INSERT OR REPLACE INTO meal_plans
         (id, user_id, plan_json, is_active, deleted_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        row.id, userId, row.plan_json, isActive, deletedAt,
        Number(row.created_at) || incomingUpdated, incomingUpdated,
      ]
    );
  });
  return true;
}

/**
 * Log a recipe to the diary as a single entry (food_ref 'recipe:<id>'),
 * scaled to the servings eaten. Macros are denormalised at log time like
 * any other entry, and resolveFoodRef renders the recipe name plus a
 * per-serving profile so the row shows as one line and rescales on edit.
 * Reuses the same per-100g maths as a normal food log. Returns the new
 * entry id, or null when the recipe is missing or has no resolvable
 * ingredients (so nothing junk is written).
 *
 * T1 (world-class audit 2026-07-03): also writes a food_slot_recents row,
 * same as every other log path (FoodSearchScreen's quickLogRelog/confirmLog/
 * logPlate, DiaryScreen's onLogUsual). Without this a recipe could never
 * earn a place in the "Add again" ranked relog pool no matter how often it
 * was logged; resolveFoodRef already resolves 'recipe:<id>' into a normal
 * food-shaped row, so once it has a slot-recent row it joins that pool with
 * zero further changes. Derived memory only; never fails the log.
 */
export async function applyRecipeToDiary(userId, recipeId, { mealSlot, entryDate, servings = 1 } = {}) {
  if (!mealSlot || !entryDate) {
    throw new Error('applyRecipeToDiary: mealSlot and entryDate are required');
  }
  const n = Number(servings);
  if (!Number.isFinite(n) || n <= 0) return null;
  const food = await resolveFoodRef(userId, `recipe:${recipeId}`);
  if (!food || !(Number(food.serving_g) > 0)) return null;
  const quantityG = Math.round(food.serving_g * n * 10) / 10;
  const factor = quantityG / 100;
  const foodRef = `recipe:${recipeId}`;
  const entryId = await logFoodEntry(userId, {
    entryDate,
    mealSlot,
    foodRef,
    quantityG,
    kcal: Math.round((food.kcal_100g ?? 0) * factor),
    proteinG: Math.round((food.protein_100g ?? 0) * factor * 10) / 10,
    carbsG: Math.round((food.carbs_100g ?? 0) * factor * 10) / 10,
    fatG: Math.round((food.fat_100g ?? 0) * factor * 10) / 10,
    fibreG: food.fibre_100g != null ? Math.round((food.fibre_100g) * factor * 10) / 10 : null,
  });
  await upsertSlotRecent(userId, { mealSlot, foodRef, quantityG }).catch(() => {});
  return entryId;
}

/**
 * Distinct meal slots that already have (live) entries for a day. Used
 * to work out how many meals are still to come today when sizing a
 * suggestion to one meal's share of the remaining macros.
 */
export async function getLoggedMealSlotsForDay(userId, entryDate) {
  const d = await db();
  const rows = await d.getAllAsync(
    `SELECT DISTINCT meal_slot FROM food_entries
     WHERE user_id = ? AND entry_date = ? AND deleted_at IS NULL`,
    [userId, entryDate]
  );
  return (rows || []).map(r => r.meal_slot).filter(Boolean);
}

// ─── Sync row fetchers ───────────────────────────────────────────────────
// Each returns every row touched since `sinceMs` (EXCLUSIVE: updated_at >
// sinceMs), including soft-deleted rows so the cloud receives tombstones.
// Pure SQL reads. Used by sync._pushFoodChanges to assemble the
// food_sync_push payload.
//
// Audit B7: the foodDomain push advances its watermark to the server
// response timestamp while these compare a client-clock updated_at, so a row
// edited mid-push can in theory be skipped. The fix is to mirror the workouts
// watermark (inclusive .gte + advance to max local updated_at pushed), which
// is a careful change to this runtime-critical path and is deferred, not made
// blindly here. The comment previously claimed "inclusive", which was wrong.

export async function getAllFoodEntriesSince(userId, sinceMs = 0) {
  const d = await db();
  // Planned scaffolding (is_planned=1) is local-only and never synced; it
  // becomes a normal actual the moment the user confirms they ate it.
  return d.getAllAsync(
    `SELECT * FROM food_entries WHERE user_id = ? AND updated_at > ? AND is_planned = 0`,
    [userId, sinceMs]
  );
}

export async function getAllCustomFoodsSince(userId, sinceMs = 0) {
  const d = await db();
  return d.getAllAsync(
    `SELECT * FROM custom_foods WHERE user_id = ? AND updated_at > ?`,
    [userId, sinceMs]
  );
}

export async function getAllSavedMealsSince(userId, sinceMs = 0) {
  const d = await db();
  return d.getAllAsync(
    `SELECT * FROM saved_meals WHERE user_id = ? AND updated_at > ?`,
    [userId, sinceMs]
  );
}

export async function getAllRecipesSince(userId, sinceMs = 0) {
  const d = await db();
  return d.getAllAsync(
    `SELECT * FROM recipes WHERE user_id = ? AND updated_at > ?`,
    [userId, sinceMs]
  );
}

export async function getAllFavouritesSince(userId, sinceMs = 0) {
  const d = await db();
  return d.getAllAsync(
    `SELECT * FROM food_favourites WHERE user_id = ? AND last_used_at > ?`,
    [userId, sinceMs]
  );
}

export async function getAllWaterSince(userId, sinceMs = 0) {
  const d = await db();
  return d.getAllAsync(
    `SELECT * FROM daily_water WHERE user_id = ? AND updated_at > ?`,
    [userId, sinceMs]
  );
}

// ─── Cloud-row appliers (used by sync._pullFoodChanges) ──────────────────
// Each takes a row in the cloud schema (ISO timestamps, snake_case) and
// upserts into local SQLite (ms timestamps). Returns the affected
// entry_date if relevant so the caller can recompute the rollup.

function _isoToMs(iso) {
  if (!iso) return null;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : null;
}

// F1: last-write-wins gate for the core food appliers. Every other handler
// (cardio_log, daily_steps, recipe_ingredients, body_composition, and the
// daily_water / food_favourites food tables) already skips a cloud row when
// the local copy is the same age or newer. The four core food tables applied
// unconditionally with INSERT OR REPLACE, so a pull carrying an older server
// version could clobber a newer local edit that had not pushed yet (offline,
// failed push, or a cross-cycle interleave). This reads the local updated_at
// so the apply can skip when local >= cloud. Ties keep the local row, matching
// the >= convention used by the inline gates elsewhere. `table` is a fixed
// literal at every call site, never user input.
async function _localUpdatedMs(d, table, id, userId) {
  const r = await d.getFirstAsync(
    `SELECT updated_at FROM ${table} WHERE id = ? AND user_id = ?`,
    [id, userId],
  );
  return r?.updated_at != null ? Number(r.updated_at) : null;
}

export async function applyFoodEntryFromCloud(userId, row) {
  if (!row?.id) return null;
  const d = await db();
  const loggedAt = _isoToMs(row.logged_at) ?? Date.now();
  const createdAt = _isoToMs(row.created_at) ?? loggedAt;
  const updatedAt = _isoToMs(row.updated_at) ?? createdAt;
  const deletedAt = _isoToMs(row.deleted_at);
  // F1: keep a newer/equal local edit rather than overwriting it with an
  // older cloud row. Returns null so the caller does not recompute the rollup.
  const localMs = await _localUpdatedMs(d, 'food_entries', row.id, userId);
  if (localMs != null && localMs >= updatedAt) return null;
  // TZ-1: derive entry_date from logged_at (LOCAL day) rather than trusting the
  // cloud value, which may be a UTC-day key from old data or the frozen AAB.
  // This makes every pulled row land on the user's calendar day on apply, so a
  // fresh-device pull is correct regardless of whether/when the one-time
  // food-day-key migration has run (it no longer races the pull). Returns the
  // local key so the caller rebuilds the right day's rollup.
  const entryDate = localDayKey(loggedAt);
  await d.runAsync(
    `INSERT OR REPLACE INTO food_entries (
      id, user_id, entry_date, meal_slot, food_ref, quantity_g,
      kcal, protein_g, carbs_g, fat_g, fibre_g, logged_at,
      deleted_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      row.id, userId, entryDate, row.meal_slot, row.food_ref,
      row.quantity_g, row.kcal, row.protein_g, row.carbs_g, row.fat_g,
      row.fibre_g ?? null, loggedAt,
      deletedAt, createdAt, updatedAt,
    ]
  );
  return entryDate;
}

export async function applyCustomFoodFromCloud(userId, row) {
  if (!row?.id) return;
  const d = await db();
  const createdAt = _isoToMs(row.created_at) ?? Date.now();
  const updatedAt = _isoToMs(row.updated_at) ?? createdAt;
  const deletedAt = _isoToMs(row.deleted_at);
  // F1: keep a newer/equal local edit rather than overwriting it.
  const localMs = await _localUpdatedMs(d, 'custom_foods', row.id, userId);
  if (localMs != null && localMs >= updatedAt) return;
  // ON CONFLICT DO UPDATE, deliberately NOT INSERT OR REPLACE (E3 review):
  // REPLACE deletes the old row WITHOUT firing the custom_foods_fts delete
  // trigger (SQLite only fires it under recursive_triggers, which is off) and
  // re-inserts under a NEW rowid, so every cross-device edit — and even this
  // device's own push-then-pull cycle, since the server restamps updated_at —
  // left the old name's tokens orphaned in the search index. A true upsert
  // keeps the rowid and fires the UPDATE trigger, so the index stays exact.
  await d.runAsync(
    `INSERT INTO custom_foods (
      id, user_id, name, brand, serving_g, serving_label,
      kcal_100g, protein_100g, carbs_100g, fat_100g,
      fibre_100g, sodium_100g, sugar_100g, photo_url, notes,
      barcode_ean, deleted_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      user_id = excluded.user_id,
      name = excluded.name,
      brand = excluded.brand,
      serving_g = excluded.serving_g,
      serving_label = excluded.serving_label,
      kcal_100g = excluded.kcal_100g,
      protein_100g = excluded.protein_100g,
      carbs_100g = excluded.carbs_100g,
      fat_100g = excluded.fat_100g,
      fibre_100g = excluded.fibre_100g,
      sodium_100g = excluded.sodium_100g,
      sugar_100g = excluded.sugar_100g,
      photo_url = excluded.photo_url,
      notes = excluded.notes,
      barcode_ean = excluded.barcode_ean,
      deleted_at = excluded.deleted_at,
      created_at = excluded.created_at,
      updated_at = excluded.updated_at`,
    [
      row.id, userId, row.name, row.brand ?? null,
      row.serving_g, row.serving_label ?? null,
      row.kcal_100g, row.protein_100g, row.carbs_100g, row.fat_100g,
      row.fibre_100g ?? null, row.sodium_100g ?? null, row.sugar_100g ?? null,
      row.photo_url ?? null, row.notes ?? null,
      row.barcode_ean ?? null,
      deletedAt, createdAt, updatedAt,
    ]
  );
}

export async function applySavedMealFromCloud(userId, row) {
  if (!row?.id) return;
  const d = await db();
  const createdAt = _isoToMs(row.created_at) ?? Date.now();
  const updatedAt = _isoToMs(row.updated_at) ?? createdAt;
  const deletedAt = _isoToMs(row.deleted_at);
  const itemsJson = typeof row.items_json === 'string'
    ? row.items_json
    : JSON.stringify(row.items_json ?? []);
  // F1: keep a newer/equal local edit rather than overwriting it.
  const localMs = await _localUpdatedMs(d, 'saved_meals', row.id, userId);
  if (localMs != null && localMs >= updatedAt) return;
  await d.runAsync(
    `INSERT OR REPLACE INTO saved_meals (
      id, user_id, name, items_json, deleted_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [row.id, userId, row.name, itemsJson, deletedAt, createdAt, updatedAt]
  );
}

export async function applyRecipeFromCloud(userId, row) {
  if (!row?.id) return;
  const d = await db();
  const createdAt = _isoToMs(row.created_at) ?? Date.now();
  const updatedAt = _isoToMs(row.updated_at) ?? createdAt;
  const deletedAt = _isoToMs(row.deleted_at);
  // F1: keep a newer/equal local edit rather than overwriting it.
  const localMs = await _localUpdatedMs(d, 'recipes', row.id, userId);
  if (localMs != null && localMs >= updatedAt) return;
  await d.runAsync(
    `INSERT OR REPLACE INTO recipes (
      id, user_id, name, total_servings, notes,
      deleted_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      // Cloud sends `servings` (migrate_021/023); tolerate the legacy
      // `total_servings` key, default 1 so a recipe never lands with NULL servings.
      row.id, userId, row.name, row.servings ?? row.total_servings ?? 1, row.notes ?? null,
      deletedAt, createdAt, updatedAt,
    ]
  );
}

export async function applyFavouriteFromCloud(userId, row) {
  if (!row?.food_ref) return;
  const d = await db();
  const lastUsedAt = _isoToMs(row.last_used_at) ?? Date.now();
  // D1-#8: carry the tombstone so a remote delete reaches this device. Under the
  // same last_used_at LWW gate below, a newer cloud row with deleted_at set
  // tombstones the local row (and a newer cloud un-delete revives it).
  const deletedAt = _isoToMs(row.deleted_at);
  // Cloud rows that pre-date mig 048 don't have `kind`; default to
  // 'fav' so they keep behaving exactly as before. Reject anything
  // outside the validated set so a malformed row can't poison local
  // state.
  const kind = row.kind === 'dislike' ? 'dislike' : 'fav';
  // LWW on BOTH columns (food review D-M2): the previous applier took MAX on
  // last_used_at but overwrote `kind` unconditionally, so a stale cloud row
  // could re-assert an old like/dislike over a newer local change. Gate the
  // whole update on the cloud row being newer-or-equal, mirroring the water
  // applier, so a newer local kind is never clobbered by an older cloud row.
  await d.runAsync(
    `INSERT INTO food_favourites (user_id, food_ref, last_used_at, kind, deleted_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(user_id, food_ref) DO UPDATE SET
       last_used_at = excluded.last_used_at,
       kind = excluded.kind,
       deleted_at = excluded.deleted_at
     WHERE excluded.last_used_at >= food_favourites.last_used_at`,
    [userId, row.food_ref, lastUsedAt, kind, deletedAt]
  );
}

export async function applyWaterFromCloud(userId, row) {
  if (!row?.entry_date) return;
  const d = await db();
  const updatedAt = _isoToMs(row.updated_at) ?? Date.now();
  // D1-#8: carry the tombstone so a remote delete reaches this device, gated by
  // the same updated_at LWW comparison.
  const deletedAt = _isoToMs(row.deleted_at);
  await d.runAsync(
    `INSERT INTO daily_water (user_id, entry_date, ml, updated_at, deleted_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(user_id, entry_date) DO UPDATE SET
       ml = excluded.ml,
       updated_at = excluded.updated_at,
       deleted_at = excluded.deleted_at
     WHERE excluded.updated_at >= daily_water.updated_at`,
    [userId, row.entry_date, Math.max(0, row.ml ?? 0), updatedAt, deletedAt]
  );
}

// ─── helpers ─────────────────────────────────────────────────────────────

function _scheduleSync() {
  try {
    // eslint-disable-next-line global-require
    require('../sync').scheduleSync();
  } catch (_) { /* sync module unavailable, tolerate */ }
}
