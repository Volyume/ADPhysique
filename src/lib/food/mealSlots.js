/**
 * Meal-slot model for the diary (flexible numbered meals, 2026-06-01).
 *
 * A physique athlete runs four to eight structured meals a day, not the
 * three-meals-and-a-snack wellness frame. So the diary uses numbered meals
 * ("Meal 1", "Meal 2", ...) plus, when the user opts in
 * (userProfile.mealPlanPeriWorkout, "Around training" on MealPlanScreen),
 * Pre-workout and Post-workout as named meals the user places around
 * training whenever they train (no training-day detection). The peri-workout
 * pair is OFF BY DEFAULT and fully hidden until opted in (2026-07-11 fix: was
 * previously always shown, unbuilt and confusing). New entries store keys
 * like 'meal_1'; the cloud accepts them via migration 059.
 *
 * Back-compat is the load-bearing rule here: existing users already have
 * entries stored under 'breakfast' / 'lunch' / 'dinner' / 'snack'. Those must
 * never disappear. buildMealSlots() therefore always includes any slot that has
 * entries, on top of the numbered ladder, and mealSlotLabel() gives every key
 * (legacy or numbered) a human label.
 *
 * Single source of truth: DiaryScreen, the edit and quick-add slot pickers, and
 * the per-meal breakdown all read from here, so the slot set stays consistent.
 */

export const DEFAULT_MEALS_PER_DAY = 4;

// ─── Custom meal names (gap #1) ─────────────────────────────────────────────
// Slot KEYS never change (meal_1, preworkout, ...); only the human label can be
// overridden per user. The overrides live in a module-level cache that
// mealSlotLabel reads, so the ~10 components that render labels need no change
// and stay consistent. The cache defaults EMPTY — identical to the old fixed
// labels until a user sets one. Persistence is device-local (cosmetic); reload
// the cache at app boot and after an edit. Reactivity is focus-bound: renaming
// happens on its own settings screen, so returning to the diary re-renders with
// the new label.
import AsyncStorage from '@react-native-async-storage/async-storage';

export const MEAL_LABELS_KEY = '@volyume_meal_labels';

let _labelOverrides = {};

// Sanitise to a flat { slotKey: trimmedName } map of non-empty strings.
function _sanitiseOverrides(map) {
  const out = {};
  if (map && typeof map === 'object') {
    for (const [k, v] of Object.entries(map)) {
      if (typeof v === 'string' && v.trim()) out[k] = v.trim().slice(0, 24);
    }
  }
  return out;
}

// Replace the in-memory overrides (e.g. after a load or an edit). Exposed for
// tests and for the boot loader.
export function setMealLabelOverrides(map) {
  _labelOverrides = _sanitiseOverrides(map);
  return _labelOverrides;
}

export function getMealLabelOverrides() {
  return { ..._labelOverrides };
}

// Load the saved overrides into the cache. Tolerant of missing/corrupt data.
export async function loadMealLabelOverrides() {
  try {
    const raw = await AsyncStorage.getItem(MEAL_LABELS_KEY);
    setMealLabelOverrides(raw ? JSON.parse(raw) : {});
  } catch (_) { setMealLabelOverrides({}); }
  return _labelOverrides;
}

// Set or clear (empty name) a single slot's custom label, persisting + updating
// the cache. Returns the new overrides map.
export async function setMealLabel(slotKey, name) {
  const next = { ..._labelOverrides };
  if (typeof name === 'string' && name.trim()) next[slotKey] = name.trim().slice(0, 24);
  else delete next[slotKey];
  setMealLabelOverrides(next);
  try { await AsyncStorage.setItem(MEAL_LABELS_KEY, JSON.stringify(_labelOverrides)); } catch (_) {}
  return _labelOverrides;
}

const LEGACY_LABELS = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snacks',
  preworkout: 'Pre-workout',
  postworkout: 'Post-workout',
};

const NUMBERED = /^meal_(\d+)$/;

// Human label for any slot key: the legacy names, "Meal N" for numbered keys,
// and a safe fallback for anything unexpected.
export function mealSlotLabel(key) {
  const custom = _labelOverrides[key];
  if (custom) return custom; // user's own name wins (already trimmed/bounded)
  if (LEGACY_LABELS[key]) return LEGACY_LABELS[key];
  const m = NUMBERED.exec(key || '');
  if (m) return `Meal ${m[1]}`;
  return 'Meal';
}

// The DEFAULT label for a key, ignoring any custom override — for the rename UI,
// which shows the override as an editable value over its default placeholder.
export function defaultMealSlotLabel(key) {
  if (LEGACY_LABELS[key]) return LEGACY_LABELS[key];
  const m = NUMBERED.exec(key || '');
  if (m) return `Meal ${m[1]}`;
  return 'Meal';
}

// Canonical display order: legacy day-meals first (they sit early in the day),
// then numbered meals by index, then the peri-workout meals, then snacks and
// anything unrecognised. A brand-new user with no legacy entries simply sees
// Meal 1..N then Pre/Post-workout.
export function slotOrder(key) {
  const fixed = { breakfast: 1, lunch: 2, dinner: 3, preworkout: 90, postworkout: 91, snack: 95 };
  if (fixed[key] != null) return fixed[key];
  const m = NUMBERED.exec(key || '');
  if (m) return 10 + Number(m[1]);
  return 99;
}

// The meals to show on the diary for a given day. A numbered ladder
// (Meal 1..mealsPerDay), unioned with any slot that already has entries so no
// logged food is hidden, sorted into canonical order.
//
// Pre-workout and Post-workout are OFF BY DEFAULT (founder device report,
// 2026-07-11: half-built and confusing when every user sees two permanently
// empty peri-workout cards regardless of whether they train around them).
// They are the same opt-in the meal-plan generator already gates on
// (userProfile.mealPlanPeriWorkout, surfaced as "Around training" on
// MealPlanScreen) so enabling it in one place turns them on everywhere.
// `periWorkoutSlots` defaults to false so every existing call site that does
// not yet thread the preference through keeps the slots hidden rather than
// silently keeping the old always-on behaviour. Back-compat is preserved
// regardless: any entry already logged under 'preworkout'/'postworkout'
// still surfaces via the entries union below, opted in or not.
export function buildMealSlots(entries = [], mealsPerDay = DEFAULT_MEALS_PER_DAY, periWorkoutSlots = false) {
  const byKey = new Map();
  const add = (key) => { if (key && !byKey.has(key)) byKey.set(key, { key, label: mealSlotLabel(key) }); };
  const n = Math.max(1, mealsPerDay | 0);
  for (let i = 1; i <= n; i++) add(`meal_${i}`);
  if (periWorkoutSlots) {
    add('preworkout');
    add('postworkout');
  }
  for (const e of entries) add(e?.meal_slot);
  return [...byKey.values()].sort((a, b) => slotOrder(a.key) - slotOrder(b.key));
}

// The highest numbered meal that has an entry (so the ladder never hides a
// logged meal). Returns 0 when no numbered meals are logged.
export function highestLoggedMeal(entries = []) {
  let max = 0;
  for (const e of entries) {
    const m = NUMBERED.exec(e?.meal_slot || '');
    if (m) max = Math.max(max, Number(m[1]));
  }
  return max;
}

// Slot options for an edit / quick-add picker (no day context). The numbered
// ladder, plus Pre/Post when the user has opted in (see buildMealSlots),
// always including `current` so an existing entry's slot (including a legacy
// one like 'breakfast', or a peri-workout slot logged before the user turned
// the preference off) stays selectable and labelled.
export function pickerMealSlots(current, mealsPerDay = DEFAULT_MEALS_PER_DAY, periWorkoutSlots = false) {
  const list = buildMealSlots([], mealsPerDay, periWorkoutSlots);
  if (current && !list.some((s) => s.key === current)) {
    list.push({ key: current, label: mealSlotLabel(current) });
    list.sort((a, b) => slotOrder(a.key) - slotOrder(b.key));
  }
  return list;
}

// The waking eating window the meal ladder is spread across for time-of-day
// inference. Kept deliberately wide so an early breakfast or a late dinner
// still lands on a sensible meal rather than the edges.
export const EATING_WINDOW_START_HOUR = 6;
export const EATING_WINDOW_END_HOUR = 22;

// The meal the user is most likely logging into RIGHT NOW, given the local
// hour and the day's ordered slot keys. Pure: the caller passes the hour so
// this never reads the clock. The ladder is mapped evenly across the waking
// eating window and the nearest slot centre to `hour` wins (ties lean earlier,
// which reads as "still finishing the earlier meal"). Peri-workout slots are
// excluded from the guess: they are intent-specific, not time-of-day, so a
// scan is never silently filed under Pre/Post-workout. Falls back to the first
// slot when there is nothing to range over. This is the honest default the
// diary barcode FAB passes so a scan no longer lands in 'snack' regardless of
// the time of day; the user can still re-pick on the detail sheet.
export function inferMealSlotForHour(hour, slotKeys = []) {
  const meals = (slotKeys || []).filter(
    (k) => k && k !== 'preworkout' && k !== 'postworkout',
  );
  if (meals.length === 0) return (slotKeys && slotKeys[0]) || null;
  if (meals.length === 1) return meals[0];
  const span = EATING_WINDOW_END_HOUR - EATING_WINDOW_START_HOUR;
  const h = Number.isFinite(hour) ? hour : EATING_WINDOW_START_HOUR;
  let best = 0;
  let bestDist = Infinity;
  for (let i = 0; i < meals.length; i += 1) {
    const centre = EATING_WINDOW_START_HOUR + ((i + 0.5) / meals.length) * span;
    const dist = Math.abs(h - centre);
    if (dist < bestDist) { bestDist = dist; best = i; }
  }
  return meals[best];
}
