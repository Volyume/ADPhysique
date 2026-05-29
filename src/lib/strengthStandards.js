// Strength standards expressed as multiples of bodyweight.
//
// These are commonly cited reference figures (drawn from sources such as
// strengthlevel.com and symmetricstrength.com) for the five core barbell
// compounds. They are presented as a single, gender-neutral rough guide:
// this module does not branch on biological sex (even though the app does
// record it at onboarding), so these values are general orientation rather
// than a precise verdict.
//
// Each entry maps a regex (matched against the exercise name) to an array
// of five ascending ratios, one per level:
//   [Beginner, Novice, Intermediate, Advanced, Elite]
// A lifter whose 1RM / bodyweight ratio is below the Beginner threshold is
// labelled "Untrained" so we can still show them their next milestone.

export const STRENGTH_STANDARDS = {
  bench: {
    match: /bench press/i,
    levels: [0.50, 0.75, 1.00, 1.25, 1.50],
  },
  squat: {
    match: /\b(back|front|safety bar)?\s*squat\b/i,
    levels: [0.75, 1.00, 1.50, 2.00, 2.50],
  },
  deadlift: {
    match: /deadlift/i,
    levels: [1.00, 1.25, 1.75, 2.25, 2.75],
  },
  ohp: {
    match: /overhead press|\bohp\b|shoulder press|military press/i,
    levels: [0.35, 0.55, 0.75, 1.00, 1.25],
  },
  row: {
    match: /barbell row|pendlay row|pendlay|bent.?over row|yates row/i,
    levels: [0.50, 0.75, 1.00, 1.25, 1.50],
  },
};

export const LEVEL_LABELS = ['Beginner', 'Novice', 'Intermediate', 'Advanced', 'Elite'];

/**
 * Compute the strength level for a given exercise + 1RM + bodyweight.
 *
 * @param {string} exerciseName  - logged exercise name (e.g. "Barbell Bench Press")
 * @param {number} oneRm         - estimated 1RM in the same units as bodyweight
 * @param {number} bodyweight    - latest bodyweight in the same units as oneRm
 * @returns {null | {
 *   label: string,            // 'Untrained' | 'Beginner' | ... | 'Elite'
 *   ratio: number,            // oneRm / bodyweight
 *   nextTarget: number|null,  // weight (same units) needed for next level
 *   nextLabel: string|null,   // name of the next level, if any
 * }}
 *   - `null` when inputs are missing or the exercise is not one of the
 *     five tracked compounds.
 */
export function getStrengthLevel(exerciseName, oneRm, bodyweight) {
  if (!exerciseName || !oneRm || !bodyweight || bodyweight <= 0) return null;
  const ratio = oneRm / bodyweight;

  for (const std of Object.values(STRENGTH_STANDARDS)) {
    if (!std.match.test(exerciseName)) continue;

    // Find the highest bucket the ratio meets.
    let levelIdx = -1;
    for (let i = std.levels.length - 1; i >= 0; i--) {
      if (ratio >= std.levels[i]) { levelIdx = i; break; }
    }

    if (levelIdx < 0) {
      // Below the Beginner threshold, still surface the next milestone so
      // the user has something concrete to aim for.
      return {
        label: 'Untrained',
        ratio,
        nextTarget: std.levels[0] * bodyweight,
        nextLabel: LEVEL_LABELS[0],
      };
    }

    const nextRatio = std.levels[levelIdx + 1];
    return {
      label: LEVEL_LABELS[levelIdx],
      ratio,
      nextTarget: nextRatio ? nextRatio * bodyweight : null,
      nextLabel: nextRatio ? LEVEL_LABELS[levelIdx + 1] : null,
    };
  }

  return null;
}

// All tiers low to high, including the below-Beginner "Untrained" floor, so a
// standing can be averaged across lifts into a single overall label.
export const STRENGTH_TIERS = ['Untrained', ...LEVEL_LABELS];

/**
 * Roll the per-lift strength levels into one glanceable standing: an overall
 * tier across the tracked compounds (the rounded-down average), plus the
 * single nearest rank-up so the user has one concrete thing to chase.
 *
 * @param {Array<{lift: string, oneRm: number, level: {label, nextTarget, nextLabel}}>} entries
 * @returns {null | {
 *   count: number,
 *   overallLabel: string,
 *   nearest: null | { lift: string, toLabel: string, delta: number },
 * }}
 */
export function summariseStrengthStanding(entries) {
  const valid = (entries || []).filter(
    e => e && e.level && STRENGTH_TIERS.includes(e.level.label),
  );
  if (valid.length === 0) return null;

  const meanIdx =
    valid.reduce((sum, e) => sum + STRENGTH_TIERS.indexOf(e.level.label), 0) /
    valid.length;
  const overallLabel = STRENGTH_TIERS[Math.floor(meanIdx)];

  let nearest = null;
  for (const e of valid) {
    const { nextTarget, nextLabel } = e.level;
    if (nextTarget == null || nextLabel == null || e.oneRm == null) continue;
    const delta = nextTarget - e.oneRm;
    if (delta <= 0) continue; // already past it; the bucket will catch up
    if (!nearest || delta < nearest.delta) {
      nearest = { lift: e.lift, toLabel: nextLabel, delta };
    }
  }
  if (nearest) nearest.delta = Math.round(nearest.delta * 10) / 10;

  return { count: valid.length, overallLabel, nearest };
}
