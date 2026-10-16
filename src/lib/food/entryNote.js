/**
 * D230 R20: the note on a diary entry (food_entries.note, migration 194 in the
 * cloud, a local schema step in database.js).
 *
 * A note is one short line a person writes on an entry: the name a quick add
 * never had, the line an import writes, "Anything worth remembering". At most
 * 120 characters, nullable. A blank note is NULL, never an empty string, so
 * "no note" has exactly one stored shape. Pure: no I/O, no store.
 *
 * It is the person's own text about their own food. It never goes into a
 * telemetry event, a share card or a log line (pinned by
 * src/lib/food/__tests__/entryNote.test.js).
 */

export const FOOD_NOTE_MAX_LENGTH = 120;

/**
 * Normalise a note for storage.
 *  - undefined            -> undefined (the caller did not touch the field)
 *  - null, '' or blanks   -> null (no note)
 *  - a string <= 120      -> the trimmed string
 *  - anything else        -> false (invalid: not a string, or too long)
 *
 * @param {unknown} value
 * @returns {string|null|undefined|false}
 */
export function cleanFoodNote(value) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  return trimmed.length <= FOOD_NOTE_MAX_LENGTH ? trimmed : false;
}

/**
 * The note as a display string, or null when there is none. Tolerant of a
 * stored value that is not a clean note (it never throws, and it never shows
 * more than the bound).
 *
 * @param {unknown} value
 * @returns {string|null}
 */
export function displayFoodNote(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed.slice(0, FOOD_NOTE_MAX_LENGTH);
}
