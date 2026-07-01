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

// Drop sets count for weekly volume but NOT towards the set-target progress.
// Only straight, amrap, myo-reps, rest-pause and superset sets tick the
// target counter.
export function countProgressSets(sets) {
  return sets.filter(s => {
    const t = s.setType ?? s.set_type ?? 'straight';
    return t !== 'warmup' && t !== 'dropset';
  }).length;
}

/**
 * The set number to stamp on the next logged set, numbered WITHIN its own
 * kind: working sets read 1, 2, 3 regardless of any warm-ups logged first,
 * and warm-ups get their own 1, 2 sequence (set_type distinguishes them).
 * Counting warm-ups alongside working sets is the WK-3 defect this prevents
 * (the first working set after a warm-up used to read "2").
 *
 * @param {Array} loggedSets  sets already logged for the current exercise
 * @param {boolean} isWarmup  whether the set being logged is a warm-up
 * @returns {number} 1-based position within the matching kind
 */
export function setNumberForKind(loggedSets, isWarmup) {
  return (loggedSets ?? []).filter(s =>
    ((s.setType ?? s.set_type ?? 'straight') === 'warmup') === isWarmup
  ).length + 1;
}

/**
 * The best (heaviest) working anchor set to prefill the next set from.
 * Prefers the set at `workingIdx` among working (non-warm-up) sets, but never
 * suggests a load lighter than the user's heaviest working set so far.
 *
 * @param {Array} sets        prior sets (any kind; warm-ups are ignored)
 * @param {number} workingIdx index among working sets to anchor on
 * @returns {object|null} the chosen anchor set, or null when there is none
 */
export function getBestAnchorSet(sets, workingIdx) {
  if (!sets || sets.length === 0) return null;
  const working = sets.filter(s => (s.setType ?? s.set_type ?? 'straight') !== 'warmup');
  const indexed = working[workingIdx] ?? null;
  const best = working.reduce((b, s) => (!b || (s.weight || 0) > (b.weight || 0)) ? s : b, null);
  if (!indexed || !best || (indexed.weight || 0) >= (best.weight || 0)) return indexed ?? best;
  return best;
}

/**
 * Reps to prefill for the next set: beat the anchor by one rep when that still
 * lands inside the target rep range, otherwise fall back to the range minimum.
 * Centralises the beat-rep rule the live session applies both after a working
 * set and on the warm-up → working switch.
 *
 * @param {object|null} anchorSet  the set to try to beat (needs actualReps)
 * @param {{repsMin:number, repsMax:number}} target  the rep-range target
 * @returns {number} the prefill rep count
 */
export function prefillRepsForTarget(anchorSet, target) {
  const beatRep = anchorSet ? (anchorSet.actualReps ?? anchorSet.actual_reps) + 1 : null;
  return (beatRep && beatRep >= target.repsMin && beatRep <= target.repsMax)
    ? beatRep
    : target.repsMin;
}

/**
 * Whether a weight entry may be logged. Bodyweight movements accept any (no
 * load needed); everything else needs a positive numeric load, so a blank or
 * zero field blocks the save rather than silently persisting a 0 kg set.
 *
 * @param {string|number|null} weightRaw  the raw weight field value
 * @param {boolean} isBodyweight          whether the exercise is bodyweight
 * @returns {boolean} true when the set is safe to log
 */
export function isLoggableWeight(weightRaw, isBodyweight) {
  if (isBodyweight) return true;
  const weightNum = parseFloat(weightRaw);
  return !(weightRaw === '' || weightRaw == null || isNaN(weightNum) || weightNum <= 0);
}

// Format an integer number of seconds as mm:ss for the duration / distance
// schemas (a logged set stores its seconds in the reps column). Pure; mirrors
// SetEntry's own formatSeconds so the live field and the logged row read alike.
export function formatSeconds(total) {
  const n = typeof total === 'number' ? total : (parseInt(total, 10) || 0);
  const safe = Number.isFinite(n) && n > 0 ? n : 0;
  const mm = Math.floor(safe / 60);
  const ss = safe % 60;
  return `${mm}:${String(ss).padStart(2, '0')}`;
}

/**
 * The display string + Est-1RM eligibility for one already-logged set, made
 * exercise_type aware. distance reuses the `weight` column for its value
 * (metres/yards) and the reps column for seconds; duration reuses reps for
 * seconds; reps_only carries no load. Without this, a logged run printed
 * "400kg × 90" with a bogus "Est. max ≈…kg" (the weight column held metres).
 * weight_reps / weighted_bodyweight (and any unknown type, for safety) keep the
 * original "{weight}{units} × {reps}" with the 1RM estimate shown.
 *
 * @param {object} set            logged set ({ weight, actualReps|reps })
 * @param {string} units          the user's gym unit label (kg)
 * @param {string} exerciseType   the parent exercise's type
 * @returns {{ text: string, showE1RM: boolean }}
 */
export function formatLoggedSet(set, units, exerciseType = 'weight_reps') {
  const type = exerciseType || 'weight_reps';
  const reps = set.actualReps ?? set.actual_reps ?? set.reps ?? 0;
  if (type === 'reps_only') {
    return { text: `${reps} reps`, showE1RM: false };
  }
  if (type === 'duration') {
    return { text: formatSeconds(reps), showE1RM: false };
  }
  if (type === 'distance') {
    // Distance unit mirrors SetEntry: metric users get metres, others yards.
    const distUnit = units === 'kg' ? 'm' : 'yd';
    const dist = set.weight ?? 0;
    return { text: `${dist}${distUnit} · ${formatSeconds(reps)}`, showE1RM: false };
  }
  return { text: `${set.weight}${units} × ${reps}`, showE1RM: true };
}
