/**
 * restSuggest.js — B9: deterministic rest suggestions.
 *
 * Suggested rest durations by set type and exercise compound-ness from ONE
 * fixed table below. Pure lookup: no I/O, no Date, no randomness, no
 * learning (the learned/adaptive version was explicitly rejected in
 * audit/05-enhancements.md — only the fixed table survives as B9).
 *
 * Basis for the values (standard resistance-training rest norms):
 *   - Compound working sets (squat/hinge/press/pull families, tagged
 *     compoundIsolation === 'compound' in the exercise library) are the most
 *     systemically fatiguing, so they get the longest rest: 180s (3 min).
 *   - Isolation working sets recover faster: 90s, which also matches the
 *     app's long-standing global default rest.
 *   - Warm-up sets are light preparation, not a stimulus: 60s.
 *   - Drop sets and AMRAP are still one working effort; the rest AFTER them
 *     follows the working-set row (the drops themselves are continuous).
 *   - Myo-reps and rest-pause clusters take short breaths BETWEEN efforts;
 *     20s matches the mini-rest the live screen already uses for clusters
 *     (ActiveWorkoutScreen startRestTimer(20)).
 *
 * The suggestion is exactly that: a pre-fill the user can always override.
 * It never touches the runtime rest resolution for saved routines
 * (routineExercise.restSeconds || defaultRestSeconds || 90).
 */

/** Fallback when nothing is known about the exercise or set. */
export const FALLBACK_REST_SECONDS = 90;

/**
 * THE fixed table. Every suggested value lives here and nowhere else.
 * Rows are set types (the app's canonical values from SET_TYPE_OPTIONS);
 * columns split by compound-ness where it matters.
 */
export const REST_SUGGESTION_TABLE = Object.freeze({
  straight:   Object.freeze({ compound: 180, isolation: 90 }), // working set
  amrap:      Object.freeze({ compound: 180, isolation: 90 }), // working effort
  dropset:    Object.freeze({ compound: 180, isolation: 90 }), // rest after the full drop set
  warmup:     Object.freeze({ compound: 60,  isolation: 60 }), // light prep
  myo_reps:   Object.freeze({ compound: 20,  isolation: 20 }), // breaths between mini-sets
  rest_pause: Object.freeze({ compound: 20,  isolation: 20 }), // 10-20s convention
});

/**
 * Is this exercise a compound movement? Uses the library's existing
 * compound-ness signal (exercises.compound_isolation, camelCased to
 * compoundIsolation by the DB layer). Tolerates raw snake_case rows the
 * same way the screens do. Unknown or custom exercises without the tag
 * are treated as NOT compound, so they fall to the 90s norm.
 */
function isCompoundExercise(exercise) {
  const tag = exercise?.compoundIsolation ?? exercise?.compound_isolation;
  return tag === 'compound';
}

/**
 * Suggested rest in seconds for one set.
 *
 * @param {object} args
 * @param {object} [args.exercise]  Exercise row (needs compoundIsolation).
 * @param {string} [args.setType]   One of the app's set types
 *   ('straight' | 'warmup' | 'dropset' | 'myo_reps' | 'rest_pause' |
 *   'amrap'). Missing or unknown types are treated as a working set.
 * @returns {number} Seconds. Same input always returns the same output.
 */
export function suggestRestSeconds({ exercise, setType = 'straight' } = {}) {
  const row = REST_SUGGESTION_TABLE[setType] ?? REST_SUGGESTION_TABLE.straight;
  const seconds = isCompoundExercise(exercise) ? row.compound : row.isolation;
  return Number.isFinite(seconds) ? seconds : FALLBACK_REST_SECONDS;
}
