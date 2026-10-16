/**
 * food/diaryInPlace.js - D230 R17, "load once, update in place". Pure.
 *
 * After a SINGLE-entry write (a usual chip, a swipe delete with its Undo, the
 * edit sheet's save) the Diary no longer waits for the full eight-read load()
 * before it shows the result. It applies the write to the rows and the rollup
 * already on screen with the helpers below, then reconciles with one
 * background load(). Nothing here reads a store or a database, and nothing
 * here decides what a number MEANS: the rollup is the same plain sum the
 * database computes (db.js recomputeRollup: live rows of the day, planned
 * scaffolding excluded), so the ring and the bars read what the next load()
 * will confirm.
 *
 * `emptySlotKey` is the dependency of the two Diary effects that re-query per
 * meal (the usual chips, the peri-workout suggestion). They used to re-run on
 * every change of the meal ladder, which changes with every write; they now
 * key on WHICH meals are empty, a stable string, so a write that fills a meal
 * runs them once and a write that leaves the set alone runs them not at all.
 */

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

// The database's own row order (food/db.js getFoodEntriesForDay): meal, then
// eaten_at (rows without one last), then logged_at.
function compareDiaryRows(a, b) {
  if (a.meal_slot !== b.meal_slot) return String(a.meal_slot) < String(b.meal_slot) ? -1 : 1;
  const aNull = a.eaten_at == null;
  const bNull = b.eaten_at == null;
  if (aNull !== bNull) return aNull ? 1 : -1;
  if (!aNull && a.eaten_at !== b.eaten_at) return a.eaten_at - b.eaten_at;
  return num(a.logged_at) - num(b.logged_at);
}

/**
 * The on-screen row a just-written usual-chip entry will be, from the payload
 * that was written (buildFoodEntryPayload) and the food it was built from.
 */
export function entryRowFromPayload({ id, userId, payload, food, now }) {
  return {
    id,
    user_id: userId,
    entry_date: payload.entryDate,
    meal_slot: payload.mealSlot,
    food_ref: payload.foodRef,
    quantity_g: payload.quantityG,
    kcal: payload.kcal,
    protein_g: payload.proteinG,
    carbs_g: payload.carbsG,
    fat_g: payload.fatG,
    fibre_g: payload.fibreG ?? null,
    logged_at: now,
    is_planned: payload.isPlanned ? 1 : 0,
    weight_state: payload.weightState ?? 'as_weighed',
    eaten_at: payload.isPlanned ? null : now,
    note: payload.note ?? null, // D230 R20
    created_at: now,
    updated_at: now,
    deleted_at: null,
    _name: food?.name ?? null,
    _brand: food?.brand ?? null,
  };
}

/** Rows plus one row, in the database's order. A row with the same id is replaced. */
export function insertEntry(entries, row) {
  const rest = (entries ?? []).filter((e) => e.id !== row.id);
  return [...rest, row].sort(compareDiaryRows);
}

/** Rows without the one with this id. */
export function removeEntry(entries, id) {
  return (entries ?? []).filter((e) => e.id !== id);
}

/**
 * Rows with one row patched. A patch that moves the row to another day takes
 * it out of the day in view.
 */
export function patchEntry(entries, id, patch, dayInView) {
  const current = (entries ?? []).find((e) => e.id === id);
  if (!current) return entries ?? [];
  const next = { ...current, ...patch };
  if (dayInView && next.entry_date !== dayInView) return removeEntry(entries, id);
  return insertEntry(entries, next);
}

/**
 * The day's rollup from the day's rows: the sum recomputeRollup stores, for
 * live, non-planned rows of `entryDate`. Fields of `base` the sum does not
 * own (the row's id-like columns) are kept.
 */
export function rollupFromEntries(entries, { userId, entryDate, base = null } = {}) {
  let kcal = 0; let protein = 0; let carbs = 0; let fat = 0; let fibre = 0; let count = 0;
  for (const e of entries ?? []) {
    if (e.is_planned || e.deleted_at != null) continue;
    if (entryDate && e.entry_date !== entryDate) continue;
    kcal += num(e.kcal);
    protein += num(e.protein_g);
    carbs += num(e.carbs_g);
    fat += num(e.fat_g);
    fibre += num(e.fibre_g);
    count += 1;
  }
  return {
    ...(base ?? {}),
    user_id: userId ?? base?.user_id,
    entry_date: entryDate ?? base?.entry_date,
    kcal_total: kcal,
    protein_g: protein,
    carbs_g: carbs,
    fat_g: fat,
    fibre_g: fibre,
    entries_count: count,
  };
}

/**
 * Which meals are empty, as a stable string ('' when none). `slotKeys` is the
 * ladder on screen, `entriesBySlot` the rows bucketed by meal. The same
 * ladder and the same empty set give the same string, whatever the write.
 */
export function emptySlotKey(slotKeys, entriesBySlot) {
  return (slotKeys ?? []).filter((k) => !(entriesBySlot?.[k]?.length)).join(',');
}

/** The keys back out of an emptySlotKey. */
export function emptySlotKeysFromKey(key) {
  return key ? key.split(',') : [];
}
