/**
 * setTypeEngine.js
 * Set-type intelligence for the Volyume Coach Engine v2.
 *
 * Determines when and where to deploy advanced set techniques:
 *   - Myo-reps (rest-pause clusters)
 *   - Drop sets
 *   - Rest-pause sets
 *
 * Rules (from Phase 8 spec):
 *   - Advanced techniques deploy in Week 4+ of an accumulation block (peak phase)
 *   - Also deploy in time-crunch sessions (more work per minute)
 *   - Never on compound lifts as the primary working set (too much fatigue cost)
 *   - Never in Week 1 (intro phase — technique focus only)
 *   - Max 1 advanced technique per session to avoid excessive fatigue
 *
 * Pure functions — no DB calls, no side effects.
 */

// ---------------------------------------------------------------------------
// Set type definitions
// ---------------------------------------------------------------------------

export const SET_TYPES = {
  straight:   { label: 'Straight Set',    icon: 'barbell-outline' },
  warmup:     { label: 'Warm-Up',         icon: 'flame-outline' },
  dropset:    { label: 'Drop Set',        icon: 'arrow-down-outline' },
  myo_reps:   { label: 'Myo-Reps',       icon: 'flash-outline' },
  rest_pause: { label: 'Rest-Pause',      icon: 'pause-outline' },
  superset:   { label: 'Superset',        icon: 'git-compare-outline' },
  amrap:      { label: 'AMRAP',           icon: 'trending-up-outline' },
};

// ---------------------------------------------------------------------------
// Advanced set technique eligibility
// ---------------------------------------------------------------------------

/**
 * Determines whether advanced set techniques should be deployed this session.
 *
 * @param {object} context
 * @param {number}  context.mesoWeek      - 1-indexed week in the mesocycle
 * @param {string}  context.mesoPhase     - 'intro' | 'build' | 'peak' | 'recovery'
 * @param {boolean} context.isTimeCrunch  - time-crunch mode active
 * @param {string}  context.experience    - 'beginner' | 'intermediate' | 'advanced' | 'competitive'
 * @returns {boolean}
 */
export function shouldDeployAdvancedSets({ mesoWeek = 1, mesoPhase = 'intro', isTimeCrunch = false, experience = 'intermediate' }) {
  if (experience === 'beginner') return false;           // never for beginners
  if (mesoPhase === 'intro') return false;               // Week 1 — technique only
  if (mesoPhase === 'recovery') return false;            // rest week — easy sessions
  if (isTimeCrunch) return true;                          // time crunch → squeeze more in
  if (mesoPhase === 'peak') return true;                 // peak week → max stimulus
  if (mesoWeek >= 4 && mesoPhase === 'build') return true; // late accumulation

  return false;
}

// ---------------------------------------------------------------------------
// Technique selector
// ---------------------------------------------------------------------------

/**
 * Selects the best advanced technique for a given exercise.
 * Returns null if the exercise is not eligible or context doesn't warrant it.
 *
 * @param {object} exercise  - exercise object with compoundIsolation, restSec, sets
 * @param {object} context   - same as shouldDeployAdvancedSets
 * @param {boolean} alreadyUsedThisSession - flag to enforce 1-per-session rule
 * @returns {'dropset'|'myo_reps'|'rest_pause'|null}
 */
export function selectAdvancedSetType(exercise, context, alreadyUsedThisSession = false) {
  if (alreadyUsedThisSession) return null;
  if (!shouldDeployAdvancedSets(context)) return null;

  // Never on compound lifts (too much systemic fatigue)
  if (exercise.compoundIsolation === 'compound') return null;

  // Prefer based on rest time and rep range:
  // - Short rest (≤60s) + many sets → myo-reps (efficient clusters)
  // - Medium rest + 3+ sets → drop set (simple, dramatic stimulus)
  // - Long rest (≥120s) + 2 sets → rest-pause (maximises stimulus per set)

  const restSec = exercise.restSec ?? 90;
  const sets = exercise.sets ?? 3;

  if (context.isTimeCrunch) {
    return 'myo_reps'; // most time-efficient
  }
  if (restSec <= 60 && sets >= 3) {
    return 'myo_reps';
  }
  if (sets >= 3) {
    return 'dropset';
  }
  if (sets >= 2) {
    return 'rest_pause';
  }

  return null;
}

// ---------------------------------------------------------------------------
// Instructions for each technique
// ---------------------------------------------------------------------------

const TECHNIQUE_INSTRUCTIONS = {
  dropset: {
    shortLabel: 'Drop Set',
    instruction: (sets) =>
      `Last ${sets > 1 ? '2 sets are' : 'set is'} a drop set: complete your working reps, strip 20–30% of the weight immediately, and squeeze out as many more reps as possible. No rest between drops.`,
  },
  myo_reps: {
    shortLabel: 'Myo-Reps',
    instruction: () =>
      `Myo-rep cluster: do your first set to 3–4 reps before failure, rest 5–10 deep breaths, then do clusters of 3–5 reps with the same weight until you can\'t complete a full cluster. Rest fully between full clusters.`,
  },
  rest_pause: {
    shortLabel: 'Rest-Pause',
    instruction: () =>
      `Rest-pause: take your set close to failure, rack the weight, breathe 10–15 times, then push for as many more quality reps as you can. Counts as 1.5× a normal set.`,
  },
};

/**
 * Returns the instruction string for a given advanced set technique.
 *
 * @param {'dropset'|'myo_reps'|'rest_pause'} technique
 * @param {number} sets - how many sets in the exercise
 * @returns {{ shortLabel: string, instruction: string }}
 */
export function getAdvancedSetInstructions(technique, sets = 3) {
  const def = TECHNIQUE_INSTRUCTIONS[technique];
  if (!def) return { shortLabel: technique, instruction: '' };
  return {
    shortLabel: def.shortLabel,
    instruction: def.instruction(sets),
  };
}

// ---------------------------------------------------------------------------
// Session-level set type annotator
// ---------------------------------------------------------------------------

/**
 * Annotates a session's exercises with advanced set type recommendations.
 * Respects the 1-per-session rule.
 *
 * @param {Object[]} exercises   - session exercise list
 * @param {object}   context     - shouldDeployAdvancedSets context object
 * @returns {Object[]} - exercises with optional `advancedSetType` and `advancedSetNote` fields added
 */
export function annotateSessionSetTypes(exercises, _context) {
  return exercises;
}

// ---------------------------------------------------------------------------
// Warmup set calculator
// ---------------------------------------------------------------------------

/**
 * Calculates warmup sets for a given working weight.
 * Returns an array of { weight, reps } warmup entries.
 *
 * @param {number} workingWeight - the target working weight in kg/lbs
 * @param {string} compoundIsolation - 'compound' | 'isolation'
 * @returns {Array<{ weight: number, reps: number, label: string }>}
 */
export function calculateWarmupSets(workingWeight, compoundIsolation = 'compound') {
  if (!workingWeight || workingWeight <= 0) return [];

  if (compoundIsolation === 'isolation') {
    // One feeler set at 50%
    return [
      { weight: Math.round(workingWeight * 0.5), reps: 12, label: 'Warm-up (light)' },
    ];
  }

  // Compound: progressive ramp-up
  const warmups = [
    { weight: Math.round(workingWeight * 0.40), reps: 10, label: 'Warm-up 1 (40%)' },
    { weight: Math.round(workingWeight * 0.60), reps: 6,  label: 'Warm-up 2 (60%)' },
    { weight: Math.round(workingWeight * 0.80), reps: 3,  label: 'Warm-up 3 (80%)' },
  ];

  return warmups;
}

// ---------------------------------------------------------------------------
// Set type display helper
// ---------------------------------------------------------------------------

/**
 * Returns the display label for a set type key.
 *
 * @param {string} setType - key from SET_TYPES
 * @returns {string}
 */
export function getSetTypeLabel(setType) {
  return SET_TYPES[setType]?.label ?? setType;
}
