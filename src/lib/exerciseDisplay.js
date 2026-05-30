/**
 * exerciseDisplay
 *
 * Pure presentation helpers for the exercise metadata added by the
 * 2026-05-30 exercise audit (equipment_category, machine_type, difficulty,
 * subregion, cue). Kept here, free of React, so the library filter and the
 * detail screen share one source of truth and the logic is unit-testable.
 *
 * Background: the data layer reclassifies movements into equipment_category
 * (barbell, dumbbell, cable, smith, kettlebell, bodyweight, landmine, band,
 * machine_selectorised, machine_plate_loaded, other), but the raw legacy
 * `equipment` string was not updated, so band moves still read
 * equipment='bodyweight'. Filtering on the raw string alone made the
 * Library "Bands" chip return nothing. These helpers read the derived
 * category first and fall back to the raw string.
 *
 * Voice rules: CLAUDE.md. No em dashes.
 */

// Friendly labels per derived equipment category.
const EQUIPMENT_LABELS = {
  barbell: 'Barbell',
  dumbbell: 'Dumbbell',
  cable: 'Cable',
  smith: 'Smith machine',
  kettlebell: 'Kettlebell',
  bodyweight: 'Bodyweight',
  landmine: 'Landmine',
  band: 'Resistance band',
  machine_selectorised: 'Machine',
  machine_plate_loaded: 'Plate-loaded machine',
  other: null,
};

const DIFFICULTY_LABELS = { 1: 'Beginner', 2: 'Intermediate', 3: 'Advanced' };

/**
 * Does an exercise match a Library equipment filter chip? Reads the derived
 * equipment_category first, then falls back to the raw equipment string so
 * legacy rows still match. Returns true when no filter is set.
 */
export function matchesEquipmentFilter(exercise, filterLabel) {
  if (!filterLabel) return true;
  const f = String(filterLabel).toLowerCase().trim();
  const raw = String(exercise?.equipment || '').toLowerCase();
  const cat = String(exercise?.equipmentCategory || '').toLowerCase();

  switch (f) {
    case 'band':
    case 'bands':
      return cat.includes('band') || raw.includes('band');
    case 'plate-loaded':
    case 'plate loaded':
      return cat === 'machine_plate_loaded' || raw.includes('plate');
    case 'landmine':
      return cat === 'landmine' || raw.includes('landmine');
    case 'smith':
    case 'smith machine':
      return cat === 'smith' || raw.includes('smith');
    case 'machine':
      // Any machine: selectorised or plate-loaded, plus the legacy string.
      // A Smith machine counts as a machine too.
      return cat.startsWith('machine') || cat === 'smith' || raw.includes('machine');
    case 'bodyweight':
      return cat === 'bodyweight' || raw.includes('bodyweight') || raw.includes('body weight');
    default:
      // barbell, dumbbell, cable, kettlebell and any future label: match
      // either the derived category exactly or the raw string loosely. The
      // category catches reclassified rows (an EZ bar reads as 'barbell').
      return cat === f || raw.includes(f);
  }
}

/**
 * Friendly equipment label for an exercise, preferring the derived category
 * (so a plate-loaded machine reads as such) and falling back to a tidied
 * version of the raw equipment string. Returns null when nothing is known.
 */
export function equipmentDisplayLabel(exercise) {
  const cat = exercise?.equipmentCategory;
  if (cat && EQUIPMENT_LABELS[cat]) return EQUIPMENT_LABELS[cat];
  const raw = exercise?.equipment;
  if (raw) {
    const s = String(raw);
    return s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ');
  }
  return null;
}

/**
 * Difficulty as a word. Library exercises carry a numeric difficulty (1-3);
 * custom exercises store it as a "difficulty:beginner" note token. Returns
 * null when neither is present.
 */
export function difficultyDisplayLabel(exercise) {
  const d = exercise?.difficulty;
  if (typeof d === 'number' && DIFFICULTY_LABELS[d]) return DIFFICULTY_LABELS[d];

  const note = String(exercise?.notes || '');
  const m = note.match(/difficulty:(beginner|intermediate|advanced)/i);
  if (m) return m[1].charAt(0).toUpperCase() + m[1].slice(1).toLowerCase();

  const n = Number(d);
  if (DIFFICULTY_LABELS[n]) return DIFFICULTY_LABELS[n];
  return null;
}

/**
 * Humanise a subregion token ("rear_delts" -> "Rear Delts"). Returns null
 * for an empty value.
 */
export function subregionDisplayLabel(subregion) {
  if (!subregion) return null;
  return String(subregion)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}
