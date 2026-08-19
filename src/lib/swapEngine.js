/**
 * swapEngine.js
 * Pure-function exercise swap scoring for the Volyume app.
 * No side effects, no DB calls, scores and ranks alternatives.
 *
 * Extended (Phase 6) with joint-discomfort pattern detection and auto-swap logic.
 */

// The one parser for an exercise row's equipment profiles, shared with the
// exercise pool planEngine filters on, so a swap and a generated plan can
// never disagree about what the athlete's kit allows. Pure, no DB.
import { parseProfiles } from './poolGenerator';

// ---------------------------------------------------------------------------
// Scoring weights
// ---------------------------------------------------------------------------

const SCORE_SAME_PRIMARY_MUSCLE = 40;
// Same anatomical subregion within the same muscle (audit gap C6): a swap
// should default to the same subregion so it preserves the balance the plan
// was built for (e.g. an incline-press swap stays an upper-chest movement,
// not a flat press). Ranked just below same-muscle and above movement
// pattern, so a same-subregion option wins where it otherwise ties.
const SCORE_SAME_SUBREGION = 25;
const SCORE_SAME_MOVEMENT_PATTERN = 20;
const SCORE_SAME_EQUIPMENT = 15;
const SCORE_SAME_COMPOUND_ISOLATION = 10;
const SCORE_SIMILAR_FATIGUE_COST = 10;
const SCORE_SIMILAR_SFR = 10;
const SIMILAR_WITHIN = 1; // ±1 threshold for fatigueCost and SFR

// Assisted machine regressions (Assisted Pull-Up, Assisted Dip Machine). For an
// intermediate or stronger lifter these are not sensible swap targets for a
// loaded movement, so rankSwaps can drop them with the excludeAssisted option.
// Word boundary so it only catches genuinely assisted lifts.
const ASSISTED_RE = /\bassisted\b/i;

// ---------------------------------------------------------------------------
// Internal: score a single candidate against the original
// ---------------------------------------------------------------------------

function scoreCandidate(original, candidate) {
  let score = 0;

  if (candidate.primaryMuscle === original.primaryMuscle) {
    score += SCORE_SAME_PRIMARY_MUSCLE;

    // Subregion only carries meaning within the same muscle. Both must have
    // a subregion tag to count; legacy/custom exercises with no tag are
    // neither rewarded nor penalised, so the scorer degrades gracefully.
    if (
      original.subregion &&
      candidate.subregion &&
      candidate.subregion === original.subregion
    ) {
      score += SCORE_SAME_SUBREGION;
    }
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
    // `!= null` (not `!== undefined`) so an unknown SFR — a custom exercise now
    // stores null rather than a guessed midpoint — genuinely SKIPS this term
    // instead of coercing null to 0 in the subtraction and mis-ranking as a
    // very-low-SFR match.
    candidate.stimulusToFatigueRatio != null &&
    original.stimulusToFatigueRatio != null &&
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
    candidate.stimulusToFatigueRatio != null &&
    original.stimulusToFatigueRatio != null &&
    Math.abs(candidate.stimulusToFatigueRatio - original.stimulusToFatigueRatio) <= SIMILAR_WITHIN;

  const sameSubregion =
    samePrimary &&
    original.subregion &&
    candidate.subregion &&
    candidate.subregion === original.subregion;

  if (samePrimary && samePattern) {
    parts.push(
      `Targets ${candidate.primaryMuscle} with the same ${candidate.movementPattern} pattern`,
    );
  } else if (samePrimary) {
    parts.push(`Same primary muscle (${candidate.primaryMuscle})`);
  } else if (samePattern) {
    parts.push(`Shares the ${candidate.movementPattern} movement pattern`);
  }

  if (sameSubregion) {
    parts.push('same area of the muscle');
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
 * @param {boolean}     options.excludeAssisted - drop assisted machine regressions
 *                       (Assisted Pull-Up etc). Set for intermediate+ lifters so
 *                       a beginner crutch is never offered as a swap. Off by
 *                       default; a true beginner still sees them.
 * @returns {{ exercise: object, score: number, reason: string }[]}
 */
export function rankSwaps(originalExercise, allExercises, options = {}) {
  const {
    equipment = null,
    numResults = 5,
    excludeIds = [],
    excludeAssisted = false,
  } = options;

  const excludeSet = new Set([originalExercise.id, ...excludeIds]);

  const scored = allExercises
    // Mandatory exclusions
    .filter((ex) => !excludeSet.has(ex.id))
    // Assisted-regression filter (intermediate+). Never applied to the original
    // itself: if the user is on an assisted lift and wants alternatives, they
    // still get loaded ones.
    .filter((ex) => !excludeAssisted || !ASSISTED_RE.test(ex.name ?? ''))
    // Equipment filter (founder report 2026-08-19: swapping with Machines &
    // Cables selected still offered Barbell Back Squat).
    //
    // This used to compare the caller's value against `ex.equipment`, which
    // is the RAW seed column ('barbell', 'cable', 'machine', 'dumbbell').
    // What a caller actually has is the athlete's equipment PROFILE
    // ('machines_cables', 'full_gym', ...) - a different vocabulary - so
    // `ex.equipment === 'machines_cables'` could never be true and passing
    // equipment would have emptied the list rather than filtering it. The
    // comparison now runs against equipmentProfiles through the same parser
    // planEngine's filterPool uses, so a swap and a generated plan can never
    // disagree about what the athlete can actually do.
    //
    // Legacy shape kept: an ARRAY is still matched against the raw column,
    // because that is what the exercise picker's equipment chips pass.
    .filter((ex) => {
      if (equipment === null) return true;
      if (Array.isArray(equipment)) return equipment.includes(ex.equipment);
      const profiles = parseProfiles(ex);
      // An untagged row (a custom exercise the athlete created) carries no
      // profiles. Never hide someone's own exercise on an absence of data.
      if (profiles.length === 0) return true;
      return profiles.includes(equipment);
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

