/**
 * prescription.js — Campaign 16 job 7: how many reps, how long a rest, and
 * what load a generated or swapped exercise carries.
 *
 * Extracted from planEngine so the plan generator and the plan EDITOR agree.
 * They did not. The engine prescribed from a four-tier table; a plan-level
 * exercise swap changed the exercise and left the previous exercise's reps,
 * rest and starting weight sitting on the row.
 *
 * THE DEFECT THIS FIXES
 *
 * `heavy_compound` prescribed 5-9 reps in the HYPERTROPHY table, so a
 * general hypertrophy plan handed a user 3x5-9 on barbell bench, incline
 * bench and close-grip bench. A five-rep bottom end is a strength
 * prescription. It appeared in a plan whose whole purpose is hypertrophy,
 * beside a separate strength table that already exists for people who chose
 * strength.
 *
 * The fix is 6-10, not 8-12. The founder's instruction is explicit: "Do not
 * blindly make every exercise 8-12. Use exercise role and practical
 * hypertrophy usage." A heavy barbell compound SHOULD sit heavier than the
 * accessories around it; it simply should not read as a powerlifting set.
 *
 * WHY THE OVERRIDE LIST IS SHORT, deliberately
 *
 * The four tiers already encode the distinction that matters - how heavy
 * and how stable the movement is - so most exercises need no special case.
 * Inventing a per-exercise rep table would be exactly the pseudo-scientific
 * micro-targeting this campaign was told to avoid: it would imply a
 * precision the evidence does not support, and every entry would be a
 * number somebody made up. Hypertrophy happens across a wide rep range when
 * sets are taken near failure. The rep range is a practical choice about
 * fatigue, technique and how the movement is normally loaded, and it is
 * only worth overriding where practice genuinely and obviously differs.
 *
 * WHAT IS NOT HERE, and must not be
 *
 *   - No rotation of rep ranges by block number. A plan does not switch to
 *     "the 5s block" because a counter incremented. Rep ranges change when
 *     the exercise or the user's goal changes, not on a schedule.
 *   - No fabricated starting load. Volyume does not know what anyone can
 *     lift, and a made-up number on a first session is worse than an empty
 *     field: it is a prescription the user may try to honour.
 */

// ---------------------------------------------------------------------------
// Tier defaults
// ---------------------------------------------------------------------------

/**
 * Hypertrophy. `heavy_compound` was 5-9; see the header for why it is now
 * 6-10 rather than 8-12.
 */
export const REP_RANGES = Object.freeze({
  heavy_compound: { repMin: 6,  repMax: 10 },
  mod_compound:   { repMin: 8,  repMax: 12 },
  machine:        { repMin: 8,  repMax: 15 },
  isolation:      { repMin: 10, repMax: 20 },
});

/** Strength, for users who explicitly chose it. Unchanged. */
export const STRENGTH_REP_RANGES = Object.freeze({
  heavy_compound: { repMin: 4,  repMax: 6  },
  mod_compound:   { repMin: 5,  repMax: 8  },
  machine:        { repMin: 8,  repMax: 12 },
  isolation:      { repMin: 10, repMax: 15 },
});

// Rest is a real cost, not a label: these values feed the session-time
// estimate, so lengthening a rest lengthens the session the user is shown
// and can push the trim into dropping work. They are unchanged here.
export const REST_SEC = Object.freeze({
  heavy_compound: 180,
  mod_compound:   150,
  machine:        120,
  isolation:       75,
});

export const STRENGTH_REST = Object.freeze({
  heavy_compound: 210,
  mod_compound:   180,
  machine:        120,
  isolation:       75,
});

// ---------------------------------------------------------------------------
// Exercise-specific ranges
// ---------------------------------------------------------------------------

/**
 * The deliberately small set of exercises whose practical loading differs
 * from their tier, each with the reason stated.
 *
 * The deadlift family is the honest case. It reads as `heavy_compound`, but
 * a set of ten conventional deadlifts is not ten bench presses: grip fails,
 * bracing degrades, technique drifts under fatigue, and the systemic cost is
 * out of proportion to the stimulus. Standard practice keeps it lower and
 * that is a fatigue-and-technique judgement, not a claim about a special
 * hypertrophy mechanism.
 */
const DEADLIFT_FAMILY = new Set([
  'Conventional Deadlift', 'Sumo Deadlift', 'Snatch Grip Deadlift',
  'Deficit Deadlift', 'Trap Bar Deadlift', 'Rack Pull',
]);

export const REP_OVERRIDES = Object.freeze([
  {
    match: name => DEADLIFT_FAMILY.has(name),
    range: { repMin: 5, repMax: 8 },
    reason: 'Grip, bracing and technique degrade across a long deadlift set, and the systemic fatigue cost is high relative to the stimulus. Standard practice keeps the family lower than other heavy compounds.',
  },
]);

/**
 * The rep range for one exercise.
 *
 * Tier default first, then an override only where practice genuinely
 * differs. Strength users are never overridden: they chose a strength
 * prescription and their table already sits below every override here.
 *
 * @param {string} name       canonical exercise name
 * @param {string} paramKey   heavy_compound | mod_compound | machine | isolation
 * @param {boolean} isStrength
 */
export function repRangeFor(name, paramKey, isStrength = false) {
  if (isStrength) {
    return STRENGTH_REP_RANGES[paramKey] ?? STRENGTH_REP_RANGES.isolation;
  }
  for (const o of REP_OVERRIDES) {
    if (name && o.match(name)) return o.range;
  }
  return REP_RANGES[paramKey] ?? REP_RANGES.isolation;
}

/** The rest for one exercise, in seconds. */
export function restFor(paramKey, isStrength = false) {
  if (isStrength) return STRENGTH_REST[paramKey] ?? REST_SEC[paramKey] ?? 75;
  return REST_SEC[paramKey] ?? 75;
}

/**
 * Is this row still carrying the DEFAULT prescription for `paramKey`, or has
 * the user edited it?
 *
 * Used by the swap path so a slot the user has tuned themselves is never
 * quietly overwritten, while an untouched slot can be recalibrated when the
 * exercise in it changes tier.
 */
export function isDefaultPrescription(paramKey, { repMin, repMax, restSec }) {
  const isDefaultFor = (table, restTable) => {
    const r = table[paramKey];
    if (!r) return false;
    if (repMin != null && repMin !== r.repMin) return false;
    if (repMax != null && repMax !== r.repMax) return false;
    if (restSec != null && restSec !== restTable[paramKey]) return false;
    return true;
  };
  return isDefaultFor(REP_RANGES, REST_SEC) || isDefaultFor(STRENGTH_REP_RANGES, STRENGTH_REST);
}
