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

// getBestAnchorSet (best-working-set seed) and prefillRepsForTarget
// (beat-anchor-by-one-rep) were RETIRED in Campaign 20 Phase 2 Stage 12
// (docs/live-prescription-campaign-20-2026-08-16/
// CAMPAIGN-20-PHASE-1-DESIGN.md §3, authorities #2 and #3: MERGE). Both had
// zero production callers once ActiveWorkoutScreen.js was wired through the
// resolver. Their ideas live on inside src/lib/livePrescription.js: the
// never-seed-below-session-best rule is the resolver's session-start
// contract, and the beat-one-rep rule is the resolver's rep-progression
// micro-rule, applied consistently instead of on one path only.

/**
 * L07-F10: whether finishing the workout right now needs the "Finish
 * workout?" confirm.
 *
 * The confirm exists to stop a silent discard: either nothing was logged at
 * all, or a planned exercise is about to be left with zero sets. When every
 * exercise the session actually intends to work (i.e. not one Time Crunch
 * consciously dropped via `_timeCrunchSkipped` - that's a deliberate choice,
 * not an abandonment) already carries at least one logged set, AND at least
 * one set has been logged overall, finishing loses nothing, so the confirm
 * can be skipped.
 *
 * @param {Array} workoutExercises  session exercise entries ({ sets, _timeCrunchSkipped })
 * @returns {boolean} true when the "Finish workout?" confirm should show
 */
export function shouldConfirmBeforeFinish(workoutExercises) {
  const entries = workoutExercises ?? [];
  const totalLoggedSets = entries.reduce((sum, e) => sum + (e.sets?.length ?? 0), 0);
  if (totalLoggedSets === 0) return true; // zero sets logged: warn accurately
  const planned = entries.filter(e => !e._timeCrunchSkipped);
  const everyPlannedExerciseLogged = planned.length > 0 && planned.every(e => (e.sets?.length ?? 0) > 0);
  return !everyPlannedExerciseLogged; // true = a planned exercise would be silently abandoned
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

// Parse a free-typed mm:ss (or plain seconds) string into total seconds.
// "1:30" -> 90, "90" -> 90, "" -> '' (kept blank so the field can be cleared).
export function parseTimeToSeconds(text) {
  if (text == null || text === '') return '';
  const t = String(text).trim();
  if (t.includes(':')) {
    const [m, s] = t.split(':');
    const mm = parseInt(m, 10);
    const ss = parseInt(s, 10);
    if (Number.isNaN(mm) && Number.isNaN(ss)) return '';
    return (Number.isNaN(mm) ? 0 : mm) * 60 + (Number.isNaN(ss) ? 0 : ss);
  }
  const n = parseInt(t, 10);
  return Number.isNaN(n) ? '' : n;
}

export function validateSetEntryValue({
  value,
  exercise,
  units = 'kg',
  actualRepsOverride = null,
  weightAction = 'completing this set',
}) {
  const exerciseType = exercise?.exerciseType || exercise?.exercise_type || 'weight_reps';
  const isTimed = exerciseType === 'duration' || exerciseType === 'distance';
  const isWeightReps = exerciseType === 'weight_reps' || exerciseType === 'weighted_bodyweight';
  const repsRaw = actualRepsOverride != null ? actualRepsOverride : value?.reps;
  const actualReps = typeof repsRaw === 'number' ? repsRaw : parseInt(repsRaw, 10);

  if (!Number.isFinite(actualReps) || actualReps < 1) {
    return {
      ok: false,
      title: isTimed ? 'Enter time' : 'Enter reps',
      message: isTimed
        ? 'Please enter the duration for this set.'
        : 'Please enter the number of reps completed.',
    };
  }

  const isBodyweight = /body\s*weight/i.test(exercise?.equipment || '');
  const skipWeightCheck = exerciseType === 'reps_only' || exerciseType === 'duration';
  if (!skipWeightCheck && !isLoggableWeight(value?.weight, isBodyweight)) {
    return {
      ok: false,
      title: 'Enter weight',
      message: `Enter the weight used (in ${units}) before ${weightAction}.`,
    };
  }

  return {
    ok: true,
    actualReps,
    weight: parseFloat(value?.weight) || 0,
    exerciseType,
    isTimed,
    isWeightReps,
  };
}

// Format an integer number of seconds as mm:ss for the duration / distance
// schemas (a logged set stores its seconds in the reps column).
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
