/**
 * swapEngine.js
 * Pure-function exercise swap scoring for the Volyume app.
 * No side effects, no DB calls — scores and ranks alternatives.
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
    parts.push('similar stimulus-to-fatigue ratio');
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
    // Optional equipment filter
    .filter((ex) => equipment === null || ex.equipment === equipment)
    // Score each candidate
    .map((ex) => ({
      exercise: ex,
      score: scoreCandidate(originalExercise, ex),
    }))
    // Sort descending by score; stable tie-break by name for determinism
    .sort((a, b) => b.score - a.score || a.exercise.name.localeCompare(b.exercise.name))
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
