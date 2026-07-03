/**
 * Pure builders for the post-session share card.
 *
 * Extracted from WorkoutSummaryScreen so the share artefact's three rules are
 * locked with tests: the "best lift" must be the heaviest WORKING set (never a
 * warm-up), the intensity badge follows fixed thresholds, and the title falls
 * back gracefully when there is no named routine. Display only — no persistence.
 */

/**
 * The heaviest working set across the session, for the "best lift" highlight.
 * Warm-ups are skipped and weights are parsed defensively. Returns null when
 * there is no qualifying set.
 *
 * @param {Array} exerciseData  [{ name, loggedSets: [{ weight, reps, setType }] }]
 * @returns {{weight:number, reps:number, exerciseName:string}|null}
 */
export function topSetFromExerciseData(exerciseData) {
  let topSet = null;
  let topWeight = 0;
  for (const ex of exerciseData || []) {
    for (const s of ex.loggedSets || []) {
      if (s.setType === 'warmup') continue;
      const w = parseFloat(s.weight) || 0;
      if (w > topWeight) {
        topWeight = w;
        topSet = { weight: w, reps: s.reps || 0, exerciseName: ex.name };
      }
    }
  }
  return topSet;
}

/**
 * Intensity tier badge for the share card. A heuristic, not a grade: any one of
 * the PR / tonnage / set-count thresholds is enough to reach a tier.
 *
 * @param {number} prCount  detected PRs this session
 * @param {number} tonnage  total tonnage in kg
 * @param {number} sets     working set count
 * @returns {'solid'|'tough'|'epic'}
 */
export function intensityTier(prCount, tonnage, sets) {
  const prs = prCount || 0;
  const ton = tonnage || 0;
  const n = sets || 0;
  if (prs >= 2 || ton > 8000 || n >= 25) return 'epic';
  if (prs >= 1 || ton > 4000 || n >= 18) return 'tough';
  return 'solid';
}

/**
 * Title for the share card: the named routine when there is one, otherwise a
 * join of the first two exercises (with "+more" when there are extras), and a
 * generic label as the last resort.
 *
 * @param {string} routineName    the routine/day name, if any
 * @param {string[]} exerciseNames  exercise names trained this session
 * @returns {string}
 */
export function shareSessionName(routineName, exerciseNames = []) {
  if (routineName && routineName.trim()) return routineName.trim();
  if (exerciseNames.length > 0) {
    return exerciseNames.slice(0, 2).join(' & ') + (exerciseNames.length > 2 ? ' +more' : '');
  }
  return 'Workout complete';
}
