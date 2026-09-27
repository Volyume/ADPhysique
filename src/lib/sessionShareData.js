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
 * The optional highlight line the athlete may add to a session's share image
 * (founder, 2026-09-26: "Are there any stats that could be included, like x%
 * more volume than last time, heaviest session in x weeks and so on? ...
 * We don't want to force them on but optional?").
 *
 * The rule, from the founder's two corrections the same day: the image is ONE
 * workout, so a line earns its place only by saying something about THAT
 * workout. "Get rid of the block 3 of week 5 thing. What benefit is there at
 * all if having that in the share card. We want things optional as well not
 * just jamming the card full of data", and then, of the lines the lead had
 * kept: "Why the fuck do we need 'all 4 workouts done this week' on a single
 * workout share. What value does that give at all!?" So no line about the
 * week, the training block, how many workouts someone has logged, or a first
 * of anything (the image's own hero already shows this workout's personal
 * bests). What is left is how this workout compares with the same workout
 * over the last 4 weeks, the two stats the founder named: "Strongest workout
 * in 4 weeks" (the summary's own headline) or "Lifted 12% more than usual"
 * (its total against the 4-week average). The 4-week verdict is one line at
 * most; a 'down', 'on pace' or first-time verdict offers nothing. Then how it
 * compares with the last time the same workout was done (founder,
 * 2026-09-27: "the comparison to last session, ie heavier than last
 * session"): "Lifted 1,240 kg more than last session", offered only when it
 * is more. Everyday words for the people who see the image: no "you", no app
 * terms. Off unless the athlete switches it on.
 *
 * @param {object} facts
 * @param {{verdict:string, pct?:number, priorCount?:number, moreThanLast?:number}|null} [facts.comparison]
 * @param {'kg'|'lbs'} [facts.units]
 * @returns {Array<{key:string, text:string}>}
 */
export function shareHighlightOptions({ comparison = null, units = 'kg' } = {}) {
  if (!comparison || !(comparison.priorCount > 0)) return [];
  const out = [];
  if (comparison.verdict === 'best') {
    out.push({ key: 'best_4_weeks', text: 'Strongest workout in 4 weeks' });
  } else if (comparison.verdict === 'up' && Number.isFinite(comparison.pct) && comparison.pct > 0) {
    out.push({ key: 'more_than_usual', text: `Lifted ${comparison.pct}% more than usual` });
  }
  const more = Math.round(Number(comparison.moreThanLast));
  if (Number.isFinite(more) && more > 0) {
    // A no-break space keeps the number and its unit on one line.
    out.push({ key: 'more_than_last', text: `Lifted ${more.toLocaleString('en-GB')}\u00A0${units === 'lbs' ? 'lbs' : 'kg'} more than last session` });
  }
  return out;
}

/**
 * How a workout's total lifted compares with the same workout over the 4
 * weeks before it (the workout summary's verdict), and with the last of
 * those sessions. `prior` is those sessions, newest first, each with its
 * `tonnage`; sessions with no total are left out, as they always were.
 *
 * @param {Array<{tonnage?:number}>} prior
 * @param {number} current  this workout's total lifted
 * @returns {{verdict:string, priorCount:number, pct?:number, position?:number, total?:number, avgTonnage?:number, moreThanLast?:number}}
 */
export function compareWithPriorSessions(prior, current) {
  const tonnages = (Array.isArray(prior) ? prior : []).map((p) => (p && p.tonnage) || 0).filter((t) => t > 0);
  if (!tonnages.length) return { verdict: 'first', priorCount: 0 };
  const avg = tonnages.reduce((a, b) => a + b, 0) / tonnages.length;
  const cur = current || 0;
  const pct = avg > 0 ? Math.round(((cur - avg) / avg) * 100) : 0;
  // Rank: position of `cur` if inserted into the sorted list (desc).
  // 1 = top of the window. total = sessions including this one.
  const allSorted = [...tonnages, cur].sort((a, b) => b - a);
  const position = allSorted.indexOf(cur) + 1;
  const total = allSorted.length;
  let verdict;
  if (position === 1) verdict = 'best';
  else if (pct >= 10) verdict = 'up';
  else if (pct <= -10) verdict = 'down';
  else verdict = 'on_pace';
  return {
    verdict, pct, position, total, priorCount: tonnages.length, avgTonnage: Math.round(avg),
    // The last session: the newest of them.
    moreThanLast: Math.round(cur - tonnages[0]),
  };
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
