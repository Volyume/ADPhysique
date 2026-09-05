/**
 * exercise/loadSemantics.js — D107-2, LOAD-SEMANTICS-SPEC.
 *
 * Extracted from seedExercises.js (exercise-library-expansion-2026-09-05,
 * EL-14) so the pure derivation has a home outside a module that imports
 * AsyncStorage/database.js — exerciseCorpus/index.js (corpusEntryToSeedRow)
 * needs it and must stay importable from plain Node/Jest, the same reason
 * canonicalId.js was split out in Campaign 16 job 9. seedExercises.js
 * re-exports both names so every existing import path keeps working.
 *
 * What the ENTERED weight number means for an exercise:
 *   total            the whole load moved per rep (barbells, machines, one
 *                    implement held however many hands - the default)
 *   per_hand         one implement per hand, entered weight is ONE of them
 *                    (standard two-dumbbell/two-kettlebell movements)
 *   assisted         the entered weight is the machine's ASSISTANCE - less
 *                    is stronger
 *   added_bodyweight the entered weight is the external ADDITION to a
 *                    bodyweight movement (weighted pull-up/dip)
 *
 * Dumbbell/kettlebell equipment does NOT imply per_hand by itself: many
 * single-implement movements (goblet squats, pullovers, swings, one-arm
 * rows, carries with one implement, get-ups) enter the TOTAL load, so they
 * are listed here explicitly and stay 'total'. The exception list is the
 * reviewable judgement record - adjust names here, never the derivation.
 */
const SINGLE_IMPLEMENT_TOTAL = new Set([
  // One weight held with both hands (or braced against the body).
  'Goblet Squat', 'Wide-Stance Goblet Squat (Adductor Bias)',
  'Sumo Squat (Adductor Focus)', 'Sumo Squat (Glute Focus)',
  'Dumbbell Pullover', 'Dumbbell Pullover (Chest)',
  'Waiter Curl', 'Jefferson Curl', 'Wall Ball Squat',
  'Weighted Russian Twist (Medicine Ball)', 'Weighted Frog Pump',
  'Dumbbell Hip Thrust', 'Kettlebell Swing', 'Kettlebell Romanian Deadlift',
  'Keg Carry',
  // One implement worked one side at a time - weight entered is the whole
  // load that side moves.
  'Dumbbell Row', 'Kroc Row', 'Concentration Curl', 'Dumbbell Side Bend',
  'Single-Arm Dumbbell Press', 'Single-Arm Dumbbell Shrug',
  'Single-Arm Farmer Carry', 'Suitcase Carry',
  'Single-Leg Calf Raise (Dumbbell)', 'Half-Kneeling Shoulder Press',
  'Egyptian Lateral Raise', 'Leaning Lateral Raise',
  'Dumbbell Single-Leg RDL', 'Single-Leg Romanian Deadlift',
  'Single-Leg Romanian Deadlift (DB)', 'Stiff-Leg Deadlift (Single-Leg)',
  'Kettlebell Snatch', 'Kettlebell Clean and Press',
  'Turkish Get-Up', 'Windmill', 'Dumbbell Pronation/Supination',
]);

// Assistance-stack machines: the entered weight is the assistance. Scoped to
// the machine rows only - 'Band Assisted Pull-Up' has no stack number.
const ASSISTED_NAMES = new Set(['Assisted Pull-Up', 'Assisted Dip Machine']);

export const LOAD_SEMANTICS = Object.freeze({
  TOTAL: 'total',
  PER_HAND: 'per_hand',
  ASSISTED: 'assisted',
  ADDED_BODYWEIGHT: 'added_bodyweight',
});

/**
 * Derive an exercise's load semantics from its catalogue facts. Pure and
 * shared by the corpus mapping, the seed and the database backfill
 * migration, so every path classifies identically.
 * @param {{name?: string, equipment?: string, exerciseType?: string}} row
 * @returns {'total'|'per_hand'|'assisted'|'added_bodyweight'}
 */
export function deriveLoadSemantics({ name, equipment, exerciseType } = {}) {
  if (ASSISTED_NAMES.has(name)) return LOAD_SEMANTICS.ASSISTED;
  if (exerciseType === 'weighted_bodyweight') return LOAD_SEMANTICS.ADDED_BODYWEIGHT;
  if ((equipment === 'dumbbell' || equipment === 'kettlebell') && !SINGLE_IMPLEMENT_TOTAL.has(name)) {
    return LOAD_SEMANTICS.PER_HAND;
  }
  return LOAD_SEMANTICS.TOTAL;
}
