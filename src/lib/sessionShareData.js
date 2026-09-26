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
      // EL-7: a ballistic set (light load, high reps) never wins "best
      // lift" - it is not hypertrophy/strength evidence, and letting a
      // light ballistic weight surface here would be meaningless, not
      // merely directionally safe.
      const evidenceClass = s.evidenceClass ?? s.evidence_class ?? null;
      if (typeof evidenceClass === 'string' && evidenceClass.includes('ballistic')) continue;
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
 * Every lift the athlete could put on the share image as its top lift
 * (founder order 2026-09-26: "I want the user to be able to select their Top
 * Lift rather than it just doing one"). One entry per exercise, in the order
 * the session ran them: that exercise's heaviest working set, with more reps
 * breaking a tie at the same weight. The exclusions are topSetFromExerciseData's
 * (warm-ups, ballistic sets, sets with no weight), so the heaviest entry names
 * the same exercise and weight that function picks. An exercise logged twice
 * in one session is one entry. Display only.
 *
 * @param {Array} exerciseData  [{ name, loggedSets: [{ weight, reps, setType }] }]
 * @returns {Array<{weight:number, reps:number, exerciseName:string}>}
 */
export function liftOptionsFromExerciseData(exerciseData) {
  const byName = new Map();
  for (const ex of exerciseData || []) {
    const name = ex && ex.name;
    if (!name) continue;
    for (const s of ex.loggedSets || []) {
      if (s.setType === 'warmup') continue;
      const evidenceClass = s.evidenceClass ?? s.evidence_class ?? null;
      if (typeof evidenceClass === 'string' && evidenceClass.includes('ballistic')) continue;
      const w = parseFloat(s.weight) || 0;
      if (w <= 0) continue;
      const reps = s.reps || 0;
      const best = byName.get(name);
      if (!best || w > best.weight || (w === best.weight && reps > best.reps)) {
        byName.set(name, { weight: w, reps, exerciseName: name });
      }
    }
  }
  return [...byName.values()];
}

/**
 * The lift a share image opens on: the heaviest lift among those that set a
 * new best this session when there are any (the moment the athlete is most
 * likely to want to show), otherwise the heaviest lift of the session. The
 * athlete can change it or remove it on the share screen; this is only where
 * the picker starts. Returns an index into `options`, or -1 when there are
 * none.
 *
 * @param {Array<{weight:number, exerciseName:string}>} options
 * @param {Array<{exerciseName?:string}>} newBests  the session's detected PRs
 * @returns {number}
 */
export function defaultLiftIndex(options, newBests = []) {
  const list = Array.isArray(options) ? options : [];
  if (!list.length) return -1;
  const bestNames = new Set((newBests || []).map((pr) => pr && pr.exerciseName).filter(Boolean));
  const heaviest = (indices) => indices.reduce((best, i) => (best === -1 || list[i].weight > list[best].weight ? i : best), -1);
  const withNewBest = list.map((o, i) => (bestNames.has(o.exerciseName) ? i : -1)).filter((i) => i >= 0);
  if (withNewBest.length) return heaviest(withNewBest);
  return heaviest(list.map((_, i) => i));
}

/**
 * The share image's title. Founder order 2026-09-26: exercise names do not
 * appear on the image "at all", so where shareSessionName falls back to a
 * join of exercise names, the image uses the time of day the session started
 * ("Morning workout") instead. A named routine always wins; 'Workout complete'
 * when the start time is unknown.
 *
 * @param {string} routineName
 * @param {number|string} startedAt  epoch ms or an ISO string
 * @returns {string}
 */
export function shareCardTitle(routineName, startedAt) {
  if (routineName && String(routineName).trim()) return String(routineName).trim();
  const t = typeof startedAt === 'string' ? Date.parse(startedAt) : Number(startedAt);
  if (!Number.isFinite(t) || t <= 0) return 'Workout complete';
  const h = new Date(t).getHours();
  if (h >= 5 && h < 12) return 'Morning workout';
  if (h >= 12 && h < 17) return 'Afternoon workout';
  if (h >= 17 && h < 22) return 'Evening workout';
  return 'Night workout';
}

/**
 * The optional highlight lines the athlete may add to a session's share image
 * (founder, 2026-09-26: "Are there any stats that could be included, like x%
 * more volume than last time, heaviest session in x weeks and so on? They
 * display elsewhere? Consider what's used ... We don't want to force them on
 * but optional?"). Only facts the workout summary already works out, never a
 * new claim, and only the ones worth showing to someone else: a 'down' or
 * 'on pace' comparison, a first session and a half-finished week offer
 * nothing, and where the session sits in a training block was dropped the
 * same day (founder: "What benefit is there at all ... We want things
 * optional as well not just jamming the card full of data. And again, human
 * understandable English!"). The PR count is left out because the image's
 * own hero already shows it. Written in everyday words for the people who
 * see the image, so no "you" and no app terms. None is chosen by default;
 * the share screen lets the athlete add up to two.
 *
 *  - The 4-week comparison: 'best' is "Strongest workout in 4 weeks" (the
 *    summary's own headline); 'up' is "Lifted 12% more than usual", the
 *    total against the average of this workout over the last 4 weeks.
 *  - The early-win milestone this session earned. The summary only claims
 *    one when calm mode and an open ED flag are both off.
 *  - A week of the plan finished with this session: "All 4 workouts done
 *    this week".
 *
 * @param {object} facts
 * @param {{verdict:string, pct?:number, priorCount?:number}|null} [facts.comparison]
 * @param {{kind:string, threshold?:number}|null} [facts.milestone]
 * @param {{logged:number, planned:number|null}|null} [facts.weekProgress]
 * @param {boolean} [facts.calmSuppressed]
 * @returns {Array<{key:string, text:string}>}
 */
export function shareHighlightOptions({
  comparison = null, milestone = null, weekProgress = null, calmSuppressed = false,
} = {}) {
  const out = [];
  if (comparison && comparison.priorCount > 0) {
    if (comparison.verdict === 'best') {
      out.push({ key: 'best_4_weeks', text: 'Strongest workout in 4 weeks' });
    } else if (comparison.verdict === 'up' && Number.isFinite(comparison.pct) && comparison.pct > 0) {
      out.push({ key: 'more_than_usual', text: `Lifted ${comparison.pct}% more than usual` });
    }
  }
  if (milestone && !calmSuppressed) {
    let text = null;
    if (milestone.kind === 'sessions' && Number.isFinite(milestone.threshold)) text = `${milestone.threshold} workouts logged`;
    else if (milestone.kind === 'first_week') text = 'First full week of training';
    else if (milestone.kind === 'first_pr') text = 'First personal best';
    if (text) out.push({ key: 'milestone', text });
  }
  const logged = Number(weekProgress?.logged);
  const planned = Number(weekProgress?.planned);
  if (weekProgress && weekProgress.planned != null && Number.isFinite(planned) && planned > 1
    && Number.isFinite(logged) && logged >= planned) {
    out.push({ key: 'week_done', text: `All ${planned} workouts done this week` });
  }
  return out;
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
