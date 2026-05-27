/**
 * swapEngine.js
 * Pure-function exercise swap scoring for the Volyume app.
 * No side effects, no DB calls, scores and ranks alternatives.
 *
 * Extended (Phase 6) with joint-discomfort pattern detection and auto-swap logic.
 */

// ---------------------------------------------------------------------------
// Scoring weights
// ---------------------------------------------------------------------------

const SCORE_SAME_PRIMARY_MUSCLE = 40;
const SCORE_SAME_MOVEMENT_PATTERN = 20;
const SCORE_SAME_EQUIPMENT = 15;
const SCORE_SAME_COMPOUND_ISOLATION = 10;
const SCORE_SIMILAR_FATIGUE_COST = 10;
const SCORE_SIMILAR_SFR = 10;
const SIMILAR_WITHIN = 1; // ±1 threshold for fatigueCost and SFR

// ---------------------------------------------------------------------------
// Internal: score a single candidate against the original
// ---------------------------------------------------------------------------

function scoreCandidate(original, candidate) {
  let score = 0;

  if (candidate.primaryMuscle === original.primaryMuscle) {
    score += SCORE_SAME_PRIMARY_MUSCLE;
  }

  if (candidate.movementPattern === original.movementPattern) {
    score += SCORE_SAME_MOVEMENT_PATTERN;
  }

  if (candidate.equipment === original.equipment) {
    score += SCORE_SAME_EQUIPMENT;
  }

  if (candidate.compoundIsolation === original.compoundIsolation) {
    score += SCORE_SAME_COMPOUND_ISOLATION;
  }

  if (
    candidate.fatigueCost !== undefined &&
    original.fatigueCost !== undefined &&
    Math.abs(candidate.fatigueCost - original.fatigueCost) <= SIMILAR_WITHIN
  ) {
    score += SCORE_SIMILAR_FATIGUE_COST;
  }

  if (
    candidate.stimulusToFatigueRatio !== undefined &&
    original.stimulusToFatigueRatio !== undefined &&
    Math.abs(candidate.stimulusToFatigueRatio - original.stimulusToFatigueRatio) <= SIMILAR_WITHIN
  ) {
    score += SCORE_SIMILAR_SFR;
  }

  return score;
}

// ---------------------------------------------------------------------------
// Export: buildSwapReason
// ---------------------------------------------------------------------------

/**
 * Generates a plain-English "Why this?" string (≤20 words) explaining why
 * `candidate` is a good swap for `original`.
 *
 * @param {object} original  - original exercise object
 * @param {object} candidate - candidate exercise object
 * @returns {string}
 */
export function buildSwapReason(original, candidate) {
  const parts = [];

  const samePrimary = candidate.primaryMuscle === original.primaryMuscle;
  const samePattern = candidate.movementPattern === original.movementPattern;
  const sameEquipment = candidate.equipment === original.equipment;
  const sameCI = candidate.compoundIsolation === original.compoundIsolation;
  const similarFatigue =
    candidate.fatigueCost !== undefined &&
    original.fatigueCost !== undefined &&
    Math.abs(candidate.fatigueCost - original.fatigueCost) <= SIMILAR_WITHIN;
  const similarSFR =
    candidate.stimulusToFatigueRatio !== undefined &&
    original.stimulusToFatigueRatio !== undefined &&
    Math.abs(candidate.stimulusToFatigueRatio - original.stimulusToFatigueRatio) <= SIMILAR_WITHIN;

  if (samePrimary && samePattern) {
    parts.push(
      `Targets ${candidate.primaryMuscle} with the same ${candidate.movementPattern} pattern`,
    );
  } else if (samePrimary) {
    parts.push(`Same primary muscle (${candidate.primaryMuscle})`);
  } else if (samePattern) {
    parts.push(`Shares the ${candidate.movementPattern} movement pattern`);
  }

  if (sameEquipment) {
    parts.push(`uses the same ${candidate.equipment}`);
  } else if (candidate.equipment) {
    parts.push(`uses ${candidate.equipment} instead`);
  }

  if (sameCI) {
    parts.push(
      candidate.compoundIsolation === 'compound' ? 'multi-joint compound lift' : 'isolation movement',
    );
  }

  if (similarFatigue) {
    parts.push('similar fatigue cost');
  }

  if (similarSFR) {
    parts.push('similar effort-to-return ratio');
  }

  if (parts.length === 0) {
    return `Alternative to ${original.name} with overlapping muscle involvement.`;
  }

  // Join naturally and capitalise first letter
  let reason = parts.join(', ');
  reason = reason.charAt(0).toUpperCase() + reason.slice(1) + '.';

  // Hard cap: if for some reason it's extremely long, truncate gracefully
  const words = reason.split(' ');
  if (words.length > 20) {
    reason = words.slice(0, 20).join(' ');
    if (!reason.endsWith('.')) reason += '.';
  }

  return reason;
}

// ---------------------------------------------------------------------------
// Export: rankSwaps
// ---------------------------------------------------------------------------

/**
 * Ranks exercises as swap candidates for `originalExercise`.
 *
 * @param {object}   originalExercise - the exercise to replace
 * @param {object[]} allExercises     - full exercise library
 * @param {object}   options
 * @param {string|null} options.equipment   - filter to this equipment type (null = no filter)
 * @param {number}      options.numResults  - max results (default 5)
 * @param {string[]}    options.excludeIds  - additional exercise IDs to exclude
 * @returns {{ exercise: object, score: number, reason: string }[]}
 */
export function rankSwaps(originalExercise, allExercises, options = {}) {
  const {
    equipment = null,
    numResults = 5,
    excludeIds = [],
  } = options;

  const excludeSet = new Set([originalExercise.id, ...excludeIds]);

  const scored = allExercises
    // Mandatory exclusions
    .filter((ex) => !excludeSet.has(ex.id))
    // Optional equipment filter, accepts a string or array of strings
    .filter((ex) => {
      if (equipment === null) return true;
      if (Array.isArray(equipment)) return equipment.includes(ex.equipment);
      return ex.equipment === equipment;
    })
    // Score each candidate
    .map((ex) => ({
      exercise: ex,
      score: scoreCandidate(originalExercise, ex),
    }))
    // Sort descending by score; stable tie-break by name for determinism.
    // Names default to '' so a custom user-added exercise with no name
    // doesn't crash localeCompare on undefined.
    .sort((a, b) => b.score - a.score || (a.exercise.name ?? '').localeCompare(b.exercise.name ?? ''))
    // Take top N
    .slice(0, numResults)
    // Attach reason
    .map(({ exercise, score }) => ({
      exercise,
      score,
      reason: buildSwapReason(originalExercise, exercise),
    }));

  return scored;
}

// ---------------------------------------------------------------------------
// Phase 6 extension: Joint discomfort pattern detection
// ---------------------------------------------------------------------------

/**
 * Analyses a log of joint discomfort reports for a specific exercise and
 * determines whether the exercise should be automatically swapped out.
 *
 * Trigger rule (from spec Part 7.3):
 *   jointDiscomfort >= 2 on TWO sessions → flag for auto-swap
 *
 * @param {Array<{ exerciseId: string, jointDiscomfort: number, sessionDate: number }>} discomfortLog
 *   Sorted ascending by sessionDate.
 * @param {string} exerciseId - the exercise to check
 * @param {number} [windowMs]  - look back window in ms (default: 30 days)
 * @returns {{ shouldSwap: boolean, alertCount: number, message: string }}
 */
export function detectJointDiscomfortPattern(discomfortLog = [], exerciseId, windowMs = 30 * 24 * 60 * 60 * 1000) {
  const cutoff = Date.now() - windowMs;
  const relevant = discomfortLog.filter(
    entry => entry.exerciseId === exerciseId &&
             entry.sessionDate >= cutoff &&
             (entry.jointDiscomfort ?? 0) >= 2
  );

  const shouldSwap = relevant.length >= 2;
  const alertCount = relevant.length;

  if (shouldSwap) {
    return {
      shouldSwap: true,
      alertCount,
      message: `This movement caused joint discomfort in ${alertCount} recent sessions. It has been flagged for a swap in your next plan.`,
    };
  }

  if (alertCount === 1) {
    return {
      shouldSwap: false,
      alertCount,
      message: `One session with joint discomfort noted. Log another session and if it happens again, the exercise will be swapped out automatically.`,
    };
  }

  return { shouldSwap: false, alertCount: 0, message: '' };
}

/**
 * Given a list of flagged exercise IDs (from detectJointDiscomfortPattern),
 * returns the recommended swap for each, avoiding other flagged exercises.
 *
 * @param {string[]}  flaggedExerciseIds    - exercises to replace
 * @param {object[]}  exerciseLibrary       - full exercise library
 * @param {object}    options
 * @param {string|null} options.equipment   - equipment filter
 * @param {number}    options.numResults    - candidates per exercise
 * @returns {Array<{ originalId: string, originalName: string, swaps: Array }>}
 */
export function autoSwapForJointDiscomfort(flaggedExerciseIds = [], exerciseLibrary = [], options = {}) {
  const { equipment = null, numResults = 3 } = options;

  return flaggedExerciseIds.map(id => {
    const original = exerciseLibrary.find(ex => ex.id === id);
    if (!original) return { originalId: id, originalName: id, swaps: [] };

    // Exclude all flagged exercises from candidates
    const excludeIds = flaggedExerciseIds.filter(fid => fid !== id);

    // Prefer lower fatigue-cost alternatives, they're more joint-friendly
    const swaps = rankSwaps(original, exerciseLibrary, {
      equipment,
      numResults,
      excludeIds,
    }).map(s => ({
      ...s,
      autoSwapReason: `Replaces ${original.name}. A lower joint stress option for this muscle group.`,
    }));

    return { originalId: id, originalName: original.name, swaps };
  });
}
