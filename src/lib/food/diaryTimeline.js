/**
 * The diary timeline (Ultimate-Audit item 15, D22 15a/15b, lead ruling
 * ux-world-class-audit-2026-07-09/DECISIONS-2026-07-09.md): pure functions
 * that turn a day's food_entries into ONE chronological list with quiet
 * Morning/Afternoon/Evening day-part labels, replacing the meal-bucket card
 * layout for every user (June founder ruling, item-15-timeline-scoping.md
 * Section 1 -- "Timeline replaces the meal buckets for everyone").
 *
 * Ordering rule:
 *   - An entry with a real eaten_at (individually logged/confirmed, or an
 *     edited time) sorts by that clock time.
 *   - An entry with NO eaten_at (bulk-confirmed: D22 15b, "bulk-confirmed
 *     entries carry no precise time") sorts into its meal's CONVENTIONAL
 *     position, derived from the existing numbered meal-slot ladder order
 *     (mealSlots.js buildMealSlots/slotOrder) -- never an invented clock
 *     time. Several untimed entries in the same meal share the same
 *     synthetic position, so they render adjacent to one another: "grouped
 *     under their meal tag" per the ruling, without ever displaying a false
 *     timestamp (buildDiaryTimeline never attaches a display time to an
 *     untimed entry; only real eaten_at values are ever shown -- see
 *     EntryRow.js).
 *
 * ED-safety non-goal (explicit, item-15-timeline-scoping.md Section 5): this
 * module NEVER computes or exposes a gap between entries, a "fasting
 * window", an early/late judgement, or any derived meal-timing commentary.
 * The day-part label is the only time framing the timeline shows; it is a
 * quiet section marker, not a claim about when someone "should" eat.
 */
import { EATING_WINDOW_START_HOUR, EATING_WINDOW_END_HOUR } from './mealSlots';

// Day-part boundaries: three broad, calm bands so a long day's list doesn't
// read as one wall of rows. Chosen as round hours with no "should eat by"
// meaning; they never gate or judge anything, only label a section.
export const MORNING_END_HOUR = 12; // before 12:00 -> Morning
export const AFTERNOON_END_HOUR = 17; // 12:00-16:59 -> Afternoon, 17:00+ -> Evening

export const DAY_PARTS = Object.freeze(['Morning', 'Afternoon', 'Evening']);

/**
 * The quiet day-part label for an hour-of-day (0-23). Pure, no clock read.
 */
export function dayPartForHour(hour) {
  const h = Number.isFinite(hour) ? hour : EATING_WINDOW_START_HOUR;
  if (h < MORNING_END_HOUR) return 'Morning';
  if (h < AFTERNOON_END_HOUR) return 'Afternoon';
  return 'Evening';
}

/**
 * The synthetic hour-of-day for an entry with NO real eaten_at: its meal
 * slot's conventional position, spread evenly across the same eating window
 * mealSlots.js already uses for inferMealSlotForHour, run in reverse (slot
 * index -> hour) so an untimed entry sorts into place without ever inventing
 * a time that gets DISPLAYED (this hour is a sort key only). Falls back to
 * the start of the window when the slot is not in the day's ladder (should
 * not happen: buildMealSlots always folds in every slot that has entries).
 */
export function syntheticHourForSlot(slotKey, orderedSlotKeys) {
  const keys = Array.isArray(orderedSlotKeys) ? orderedSlotKeys : [];
  const i = keys.indexOf(slotKey);
  if (i === -1) return EATING_WINDOW_START_HOUR;
  const n = keys.length || 1;
  const span = EATING_WINDOW_END_HOUR - EATING_WINDOW_START_HOUR;
  return EATING_WINDOW_START_HOUR + ((i + 0.5) / n) * span;
}

function _hourOf(msEpoch) {
  const dt = new Date(msEpoch);
  return dt.getHours() + dt.getMinutes() / 60;
}

/**
 * Build the flat, ordered timeline for one day's viewable entries.
 *
 * @param {Array} entries      the day's food_entries (already filtered for
 *                             read-only etc by the caller)
 * @param {Array} mealSlots    the day's ordered meal-slot ladder
 *                             ([{ key, label }], from buildMealSlots) --
 *                             the source of truth for where an untimed
 *                             entry's meal conventionally sits
 * @returns {Array} a flat list of items, in render order:
 *   { type: 'daypart', key, label }
 *   { type: 'entry', key, entry, hasTime, mealLabel, isFirstOfSlot, isLastOfSlot }
 *
 * Stable-sorted (ties keep the entries' original relative order, which is
 * already meal_slot/logged_at from getFoodEntriesForDay), so the result is
 * deterministic for a given input every time -- no randomness, no clock read
 * inside the sort itself (only Number.isFinite(entry.eaten_at) branches).
 */
export function buildDiaryTimeline(entries, { mealSlots = [] } = {}) {
  const orderedKeys = mealSlots.map((s) => s.key);
  const list = Array.isArray(entries) ? entries : [];

  const withSortKeys = list.map((entry, idx) => {
    const hasTime = Number.isFinite(entry?.eaten_at);
    const hour = hasTime ? _hourOf(entry.eaten_at) : syntheticHourForSlot(entry?.meal_slot, orderedKeys);
    return { entry, hasTime, hour, idx };
  });

  // Array.prototype.sort is stable (guaranteed since ES2019): entries tied
  // on hour keep their incoming relative order (idx) as the tiebreak, so
  // several untimed entries in the same meal stay adjacent in the order
  // they were originally read (meal_slot, logged_at).
  withSortKeys.sort((a, b) => (a.hour - b.hour) || (a.idx - b.idx));

  // Precompute first/last-of-slot flags in this final render order, so a
  // caller can attach meal-level chrome (e.g. the "optional extras" row)
  // to exactly one row per meal group without a second pass over the DOM.
  const lastIndexForSlot = new Map();
  withSortKeys.forEach((row, renderIdx) => { lastIndexForSlot.set(row.entry?.meal_slot, renderIdx); });
  const seenSlot = new Set();

  const items = [];
  let lastPart = null;
  withSortKeys.forEach((row, renderIdx) => {
    const part = dayPartForHour(Math.floor(row.hour));
    if (part !== lastPart) {
      items.push({ type: 'daypart', key: `daypart-${part}-${renderIdx}`, label: part });
      lastPart = part;
    }
    const slotKey = row.entry?.meal_slot;
    const isFirstOfSlot = !seenSlot.has(slotKey);
    seenSlot.add(slotKey);
    const isLastOfSlot = lastIndexForSlot.get(slotKey) === renderIdx;
    items.push({
      type: 'entry',
      key: row.entry?.id,
      entry: row.entry,
      hasTime: row.hasTime,
      isFirstOfSlot,
      isLastOfSlot,
    });
  });
  return items;
}
