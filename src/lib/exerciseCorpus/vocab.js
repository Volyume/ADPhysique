/**
 * vocab.js — closed enums for the structured exercise corpus (EL-14,
 * 07-CORPUS-FORMAT.md section 1). Every family module and the guard
 * (scripts/exercise-library/validate-corpus.mjs,
 * src/lib/exerciseCorpus/__tests__/corpus.guard.test.js) reads its
 * vocabulary from here — nothing is invented ad hoc in a family file.
 *
 * Pure: no React Native imports. Demand-axis vocab is re-exported from
 * capability/demands.js rather than duplicated, since that module already
 * owns the closed value sets (section 8.2) and is itself pure/dependency-
 * free — importing it here does not add any I/O to the corpus package.
 */

import { DEMAND_POSITION, DEMAND_GRIP, DEMAND_BALANCE, DEMAND_FIELDS } from '../capability/demands.js';
import { AUTO_TIER } from '../exercise/canonicality.js';

// Re-exported so a family module or the guard needs only ./vocab.
export { DEMAND_POSITION, DEMAND_GRIP, DEMAND_BALANCE, DEMAND_FIELDS, AUTO_TIER };

/** Primary/secondary muscle enum (algorithms.js MUSCLE_DISPLAY_NAMES keys). */
export const MUSCLES = Object.freeze([
  'chest', 'back', 'front_delts', 'side_delts', 'rear_delts', 'biceps',
  'triceps', 'forearms', 'quads', 'hamstrings', 'glutes', 'adductors',
  'calves', 'abs', 'traps', 'neck', 'tibialis',
]);

/**
 * Coarse equipment enum. `equipment` on a corpus entry is the CORRECTED
 * coarse family (EL-21): a band row is 'band', a landmine row is
 * 'landmine', a suspension-trainer row is 'suspension' — never the raw
 * seed-tuple value of 'bodyweight'/'barbell' those used to carry. This is
 * also the value family assignment in convert-legacy.mjs groups by.
 */
export const EQUIPMENT = Object.freeze([
  'barbell', 'dumbbell', 'cable', 'machine', 'smith_machine', 'kettlebell',
  'ez_bar', 'bodyweight', 'band', 'suspension', 'landmine', 'medicine_ball',
  'sled',
]);

export const MOVEMENT_PATTERNS = Object.freeze([
  'push', 'pull', 'squat', 'hinge', 'isolation', 'carry', 'plyometric',
  'core', 'lunge', 'power',
]);

export const LATERALITY = Object.freeze(['bilateral', 'unilateral', 'alternating']);

export const LOAD_CHARACTER = Object.freeze(['grind', 'ballistic']);

/** The live screen's exercise_type vocabulary (exercises_exercise_type_chk,
 *  supabase/migrate_091_exercise_type.sql; matches ExercisePickerModal.js
 *  EXERCISE_TYPE_OPTIONS exactly). poolGenerator hard-screens every value
 *  but 'weight_reps' out of automatic generation (EL-21). */
export const EXERCISE_TYPES = Object.freeze([
  'weight_reps', 'reps_only', 'duration', 'distance', 'weighted_bodyweight',
]);

/**
 * Per-muscle subregion vocabulary actually in use by the corpus and read by
 * planEngine.js SUBREGION_REQUIREMENTS / poolGenerator.js DEFAULT_SUBREGION.
 * Muscles not listed here (forearms, front_delts, traps, neck, tibialis,
 * adductors, side_delts is listed for completeness though its requirement
 * lives in poolGenerator's translation table, not planEngine) carry no
 * enforced subregion split — a corpus entry for them may still set a
 * subregion string, but nothing requires or checks it against a fixed list.
 */
export const SUBREGIONS_BY_MUSCLE = Object.freeze({
  chest: ['flat', 'incline', 'decline'],
  back: [
    'vertical_pull', 'horizontal_row', 'horizontal_lat', 'upper_mid_row',
    'shoulder_extension', 'spinal_erector', 'hip_extension',
    // 'Face Pull (Rope)' is tagged primaryMuscle back with this rear-delt-
    // style subregion in the pre-existing corpus (not introduced by this
    // campaign) — carried through honestly rather than silently narrowed.
    'face_pull',
  ],
  front_delts: ['overhead_press'],
  side_delts: ['lateral_raise', 'overhead_press'],
  rear_delts: ['horiz_abduction', 'face_pull'],
  hamstrings: ['hip_extension', 'knee_flexion'],
  triceps: ['overhead', 'pushdown'],
  calves: ['gastro', 'soleus'],
  abs: ['flexion', 'anti_extension', 'rotation'],
  glutes: ['activator', 'stretcher', 'pumper'],
  quads: ['squat_press', 'knee_extension'],
  biceps: ['long_head', 'short_head', 'brachialis'],
});

/** Muscles whose SUBREGION_REQUIREMENTS (planEngine.js) make a null
 *  subregion a coverage defect, not a neutral omission (EL-21 / F6). */
export const MUSCLES_REQUIRING_SUBREGION = Object.freeze([
  'chest', 'back', 'hamstrings', 'glutes', 'quads', 'rear_delts', 'triceps',
  'calves', 'abs', 'biceps',
]);
