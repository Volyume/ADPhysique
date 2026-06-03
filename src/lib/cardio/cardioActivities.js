/**
 * cardio/cardioActivities.js
 *
 * The Volyume cardio activity library. A code constant, not a database table:
 * it is canonical (ships in every install), never per-user, and never synced,
 * so it lives in code like the curated food library (curatedMeals.js), not in
 * SQLite. A cardio_log row references an activity by its stable id and snapshots
 * the name + MET it was logged at, so the log is self-describing even if the
 * library later changes.
 *
 * Design per docs/audit/volyume-cardio-integration-2026-06-03 (Phase 5):
 *   - User-led: this is browsed and chosen by the user, never prescribed.
 *   - MET x intensity (low/moderate/high), 2024 Adult Compendium of Physical
 *     Activities representative values (pacompendium.com). Each row carries the
 *     intensity spread because MET varies strongly with effort.
 *   - recoveryImpact + impactType drive the recovery model and the coach's
 *     interference flag (HIIT vs LISS treated differently), NOT calorie or
 *     volume accounting.
 *   - coachTargetable: whether the coach may dose it. Team/racket sports are
 *     logged and counted but never dosed (the coach can't prescribe minutes of
 *     football), so they are 0.
 *
 * Voice rules: CLAUDE.md. No em dashes. British English in prose.
 */

// ── Controlled vocab ──────────────────────────────────────────────────────
export const CARDIO_CATEGORIES = Object.freeze([
  'walking', 'running', 'cycling', 'rowing', 'swimming',
  'machine', 'hiit', 'conditioning', 'sport', 'other',
]);

export const CARDIO_INTENSITIES = Object.freeze(['low', 'moderate', 'high']);
export const RECOVERY_IMPACTS = Object.freeze(['low', 'moderate', 'high']);
export const IMPACT_TYPES = Object.freeze(['cardiovascular', 'musculoskeletal', 'both']);

// ── Deterministic canonical id ────────────────────────────────────────────
// Mirrors canonicalExerciseId (seedExercises.js): hash the name into a
// UUID-shaped string so the same activity has the same id on every device and a
// cardio_log row round-trips across installs. Kept self-contained (a copy of the
// pure mixer) so this module pulls in nothing from the lifting seed.
export function canonicalCardioId(name) {
  const s = `cardio:${String(name || '').toLowerCase().trim()}`;
  let a = 0xdeadbeef, b = 0x41c6ce57, c = 0x1b873593, d = 0xcc9e2d51;
  for (let i = 0; i < s.length; i++) {
    const ch = s.charCodeAt(i);
    a = Math.imul(a ^ ch, 2654435761);
    b = Math.imul(b ^ ch, 1597334677);
    c = Math.imul(c ^ ch, 2246822507);
    d = Math.imul(d ^ ch, 3266489909);
  }
  a = Math.imul(a ^ (a >>> 16), 2246822507);
  a ^= Math.imul(b ^ (b >>> 13), 3266489909);
  b = Math.imul(b ^ (b >>> 16), 2246822507);
  b ^= Math.imul(c ^ (c >>> 13), 3266489909);
  c = Math.imul(c ^ (c >>> 16), 2246822507);
  c ^= Math.imul(d ^ (d >>> 13), 3266489909);
  d = Math.imul(d ^ (d >>> 16), 2246822507);
  d ^= Math.imul(a ^ (a >>> 13), 3266489909);
  const h = (x) => (x >>> 0).toString(16).padStart(8, '0');
  const full = h(a) + h(b) + h(c) + h(d);
  const variantNibble = ((parseInt(full[16], 16) & 0x3) | 0x8).toString(16);
  return `${full.substring(0, 8)}-${full.substring(8, 12)}-4${full.substring(13, 16)}-${variantNibble}${full.substring(17, 20)}-${full.substring(20, 32)}`;
}

// ── The library ───────────────────────────────────────────────────────────
// Tuple: [name, category, equipment, [metLow, metMod, metHigh],
//         defaultIntensity, recoveryImpact, impactType, coachTargetable]
// MET = 2024 Adult Compendium representative values, verify at pacompendium.com.
const RAW = [
  // Walking
  ['Walking',                 'walking',      'none',       [3.0, 4.3, 5.0],   'low',      'low',      'cardiovascular', true],
  ['Incline Treadmill Walk',  'walking',      'treadmill',  [4.5, 5.3, 6.5],   'moderate', 'low',      'both',           true],
  ['Hiking',                  'walking',      'outdoor',    [5.3, 6.0, 7.3],   'moderate', 'moderate', 'both',           true],
  // Running
  ['Treadmill Run',           'running',      'treadmill',  [8.3, 9.8, 11.8],  'moderate', 'moderate', 'both',           true],
  ['Outdoor Run',             'running',      'outdoor',    [8.3, 9.8, 12.3],  'moderate', 'moderate', 'both',           true],
  ['Trail Run',               'running',      'outdoor',    [8.5, 10.0, 12.0], 'moderate', 'high',     'both',           true],
  ['Sprint Intervals',        'running',      'outdoor',    [9.0, 12.0, 15.0], 'high',     'high',     'both',           true],
  // Cycling
  ['Indoor Bike (Steady)',    'cycling',      'bike_indoor',[4.8, 7.0, 8.5],   'low',      'low',      'cardiovascular', true],
  ['Spin / Bike Intervals',   'cycling',      'bike_indoor',[6.0, 8.5, 11.0],  'high',     'high',     'cardiovascular', true],
  ['Outdoor Cycling',         'cycling',      'bike_outdoor',[4.0, 8.0, 10.0], 'moderate', 'low',      'cardiovascular', true],
  ['Recumbent Bike',          'cycling',      'bike_indoor',[3.5, 5.0, 6.8],   'low',      'low',      'cardiovascular', true],
  // Rowing
  ['Indoor Row (Steady)',     'rowing',       'rower',      [4.8, 7.0, 8.5],   'moderate', 'moderate', 'both',           true],
  ['Row Intervals',           'rowing',       'rower',      [6.0, 8.5, 12.0],  'high',     'high',     'both',           true],
  // Swimming
  ['Swim (Freestyle)',        'swimming',     'pool',       [5.8, 7.0, 8.3],   'moderate', 'low',      'cardiovascular', true],
  ['Swim (Intervals)',        'swimming',     'pool',       [8.3, 9.5, 10.0],  'high',     'moderate', 'cardiovascular', true],
  ['Swim (Breaststroke)',     'swimming',     'pool',       [5.3, 6.5, 8.0],   'low',      'low',      'cardiovascular', true],
  // Machine
  ['Elliptical',              'machine',      'elliptical', [4.6, 5.0, 6.8],   'moderate', 'low',      'cardiovascular', true],
  ['Stair Climber',           'machine',      'stair',      [8.0, 9.0, 9.5],   'moderate', 'moderate', 'both',           true],
  ['Ski Erg',                 'machine',      'rower',      [5.0, 7.0, 9.0],   'moderate', 'moderate', 'both',           true],
  ['Assault / Air Bike',      'machine',      'bike_indoor',[6.0, 8.5, 11.0],  'high',     'high',     'both',           true],
  // HIIT
  ['HIIT',                    'hiit',         'none',       [6.0, 8.0, 10.0],  'high',     'high',     'both',           true],
  ['Tabata / Sprint Sets',    'hiit',         'none',       [8.0, 10.0, 12.0], 'high',     'high',     'both',           true],
  ['Jump Rope',               'hiit',         'rope',       [8.8, 11.0, 12.3], 'moderate', 'moderate', 'both',           true],
  // Conditioning
  ['Circuit Training',        'conditioning', 'none',       [5.0, 6.5, 8.0],   'moderate', 'moderate', 'both',           true],
  ['Kettlebell Cardio',       'conditioning', 'kettlebell', [6.0, 8.0, 9.8],   'high',     'high',     'both',           true],
  ['Battle Ropes',            'conditioning', 'battle_ropes',[6.0, 8.0, 10.0], 'high',     'high',     'both',           true],
  ['Sled / Prowler Push',     'conditioning', 'sled',       [6.0, 8.0, 9.5],   'high',     'high',     'both',           true],
  ['Boxing / Bag Work',       'conditioning', 'bag',        [6.0, 7.8, 9.5],   'moderate', 'moderate', 'both',           true],
  ['Kickboxing / Sparring',   'conditioning', 'bag',        [7.0, 9.0, 12.0],  'high',     'high',     'both',           true],
  // Sport (logged + counted, never dosed by the coach)
  ['Football / Soccer',       'sport',        'outdoor',    [7.0, 8.0, 10.0],  'moderate', 'moderate', 'both',           false],
  ['Basketball',              'sport',        'outdoor',    [6.0, 8.0, 9.3],   'moderate', 'moderate', 'both',           false],
  ['Racket Sports',           'sport',        'outdoor',    [5.0, 7.0, 8.0],   'moderate', 'moderate', 'both',           false],
  ['Climbing / Bouldering',   'sport',        'outdoor',    [5.0, 7.5, 9.0],   'moderate', 'moderate', 'both',           false],
  // Other
  ['Cardio Dance',            'other',        'none',       [5.0, 6.5, 7.8],   'moderate', 'low',      'both',           true],
  ['Elliptical Intervals',    'other',        'elliptical', [6.0, 8.0, 9.0],   'high',     'moderate', 'cardiovascular', true],
  ['Other Cardio',            'other',        'none',       [6.0, 7.0, 8.0],   'moderate', 'moderate', 'both',           true],
];

function build(tuple) {
  const [name, category, equipment, met, defaultIntensity, recoveryImpact, impactType, coachTargetable] = tuple;
  return Object.freeze({
    id: canonicalCardioId(name),
    name,
    displayName: name,
    category,
    equipment,
    met: Object.freeze({ low: met[0], moderate: met[1], high: met[2] }),
    defaultIntensity,
    recoveryImpact,
    impactType,
    coachTargetable,
  });
}

export const CARDIO_ACTIVITIES = Object.freeze(RAW.map(build));

const BY_ID = new Map(CARDIO_ACTIVITIES.map((a) => [a.id, a]));
const BY_NAME = new Map(CARDIO_ACTIVITIES.map((a) => [a.name.toLowerCase(), a]));

/** Look up an activity by canonical id, or null. */
export function getCardioActivity(id) {
  return BY_ID.get(id) ?? null;
}

/** Look up an activity by exact (case-insensitive) name, or null. */
export function getCardioActivityByName(name) {
  return BY_NAME.get(String(name || '').toLowerCase()) ?? null;
}

/** All activities in a category, in library order. */
export function cardioActivitiesByCategory(category) {
  return CARDIO_ACTIVITIES.filter((a) => a.category === category);
}

/** The fallback activity for free-text / unknown logs. */
export const OTHER_CARDIO_ID = canonicalCardioId('Other Cardio');
