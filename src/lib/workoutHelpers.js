/**
 * Shared pure helpers for live-session set counting.
 *
 * Extracted from ActiveWorkoutScreen (COMP-001) so the screen, the
 * notification path, and the upcoming Live Activity fix (COMP-019) and
 * watch companion (COMP-020) all derive "Set N of M" from the same
 * counting rule. The original "Set 3 of 2" defect came from counting
 * warm-up sets alongside working sets in one consumer; one shared
 * derivation makes that defect class unrepresentable.
 */

// Drop sets count for weekly volume but NOT toward the set-target progress.
// Only straight, amrap, myo-reps, rest-pause and superset sets tick the
// target counter.
export function countProgressSets(sets) {
  return sets.filter(s => {
    const t = s.setType ?? s.set_type ?? 'straight';
    return t !== 'warmup' && t !== 'dropset';
  }).length;
}
