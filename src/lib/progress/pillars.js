/**
 * pillars.js — pure view-model builders for the Progress landing's Answer
 * Block (Campaign 23, PROGRESS-UX-SPEC.md §22 R2).
 *
 * No I/O, no store reads, no engine imports: every function here takes
 * already-loaded data and returns plain objects for the screen to render.
 * This mirrors progressSeries.js's own "re-presentation only" contract.
 *
 * D214 lane 3 (progress audit 2026-10-01, plan section 7.1 item 3): the
 * Training row's copy lives here, ladder and all (`trainingPillarCopy`, moved
 * from AnalyticsScreen.js so it is tested without a mount): an exercise's first
 * local day is its baseline (PR-3), the verdict reads "exercises" never
 * "lifts", and the evidence is the new best on the person's heaviest exercise.
 */
import { calculate1RM } from '../algorithms';
import { formatBodyWeight, formatBodyWeightRate } from '../units';
import { localDayKey } from '../dayKey';
import { formatNumber } from '../format';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Training pillar summary (§21/§22 R2, §8 ruling): a trailing-month
 * strength-direction count ("Strength up on N of M exercises") plus up to
 * three NAMED recent bests, deduplicated to one per exercise per LOCAL day
 * (IA-3, §28) so a single session's escalating top sets cannot inflate the
 * count.
 *
 * D214, PR-3 (progress audit 2026-10-01): the BASELINE is an exercise's first
 * local DAY, every set of it included, never its first set. A first-ever
 * session logged as 60 x 8, 65 x 8, 70 x 6 used to count the third set as an
 * improvement ("70 kg x 6, new best") and ramping sets inside each exercise's
 * first session alone could read "Strength up on 9 of 9". Now every set of the
 * first day only sets the bar, and an exercise improves only when a LATER day
 * beats it. The same rule means an exercise trained on one day only has
 * nothing to compare yet, so it is counted apart (`baselineCount`) and is
 * never in the "of M" of the verdict: `comparedCount` is the exercises with at
 * least one in-window day after their baseline day.
 *
 * `trainedCount` / `improvedCount` / `comparedCount` only consider
 * `weight_reps` exercises (matches computePRsPerWeek's own gate,
 * useProgressData.js) so distance/duration/bodyweight-reps-only exercises never
 * appear as an exercise here.
 *
 * `featuredBest` is the row's evidence (D214 plan 7.1 item 3): the new best on
 * the person's HEAVIEST exercise in the window (the exercise with the highest
 * estimated one-rep max among the window's qualifying sets, ties to the lower
 * exercise id so the pick never depends on data order), falling back to the
 * most recent new best when that exercise has none, or null with no new best.
 *
 * @param {Array<object>} allSets - completed workout sets
 * @param {object} exerciseMap - id -> exercise row (needs `.type`/`.exerciseType`, `.name`)
 * @param {{windowDays?: number, now?: number}} [opts]
 * @returns {{trainedCount: number, improvedCount: number, comparedCount: number, baselineCount: number, namedBests: Array<{exerciseId, exerciseName, weight, reps, at, e1rm}>, featuredBest: ?{exerciseId, exerciseName, weight, reps, at, e1rm}}}
 */
export function computeTrainingPillarSummary(allSets, exerciseMap, { windowDays = 30, now = Date.now() } = {}) {
  const windowStart = now - windowDays * DAY_MS;
  const byEx = {};
  for (const s of (allSets || [])) {
    const exId = s.exerciseId ?? s.exercise_id;
    if (!exId) continue;
    (byEx[exId] ??= []).push(s);
  }
  for (const id of Object.keys(byEx)) {
    byEx[id].sort((a, b) => (a.createdAt ?? a.created_at ?? 0) - (b.createdAt ?? b.created_at ?? 0));
  }

  let trainedCount = 0;
  let improvedCount = 0;
  let comparedCount = 0;
  const bests = [];
  const lastBestByExercise = {};
  let heaviest = null; // { exerciseId, e1rm }: the heaviest exercise in the window

  for (const [exId, sets] of Object.entries(byEx)) {
    const exType = exerciseMap?.[exId]?.type ?? exerciseMap?.[exId]?.exerciseType ?? exerciseMap?.[exId]?.exercise_type ?? 'weight_reps';
    if (exType !== 'weight_reps') continue;
    const exerciseName = exerciseMap?.[exId]?.name ?? 'Exercise';
    let runningMax = 0;
    let baselineDayKey = null;
    let trainedInWindow = false;
    let improvedInWindow = false;
    let comparedInWindow = false;
    let heaviestE1rm = 0;
    let lastBestDayKey = null;
    for (const s of sets) {
      const st = s.setType ?? s.set_type ?? 'straight';
      if (st === 'warmup' || st === 'myo_reps' || st === 'rest_pause') continue;
      const at = s.createdAt ?? s.created_at ?? 0;
      const w = s.weight ?? 0;
      const r = s.actualReps ?? s.actual_reps ?? 0;
      if (w <= 0 || r <= 0) continue;
      const dayKey = localDayKey(at);
      const est = calculate1RM(w, r);
      const inWindow = at >= windowStart;
      if (inWindow) {
        trainedInWindow = true;
        if (est > heaviestE1rm) heaviestE1rm = est;
      }
      if (baselineDayKey === null) baselineDayKey = dayKey;
      if (dayKey === baselineDayKey) {
        // PR-3: every set of the exercise's first local day is the baseline,
        // never a record (FQ-7 said the first SET; a session ramps).
        if (est > runningMax) runningMax = est;
        continue;
      }
      if (inWindow) comparedInWindow = true;
      if (est > runningMax) {
        runningMax = est;
        if (inWindow) {
          improvedInWindow = true;
          const entry = { exerciseId: exId, exerciseName, weight: w, reps: r, at, e1rm: est };
          // Per-exercise-per-day dedup (IA-3): only the day's best survives.
          // Because runningMax only ever rises, the LAST qualifying set on a
          // given day is that day's best, so replacing in place is correct.
          if (dayKey === lastBestDayKey) bests[bests.length - 1] = entry;
          else { bests.push(entry); lastBestDayKey = dayKey; }
          lastBestByExercise[exId] = entry;
        }
      }
    }
    if (trainedInWindow) {
      trainedCount += 1;
      if (comparedInWindow) comparedCount += 1;
      if (heaviest === null || heaviestE1rm > heaviest.e1rm
        || (heaviestE1rm === heaviest.e1rm && String(exId) < String(heaviest.exerciseId))) {
        heaviest = { exerciseId: exId, e1rm: heaviestE1rm };
      }
    }
    if (improvedInWindow) improvedCount += 1;
  }

  bests.sort((a, b) => b.at - a.at);
  const featuredBest = (heaviest && lastBestByExercise[heaviest.exerciseId]) || bests[0] || null;
  return {
    trainedCount,
    improvedCount,
    comparedCount,
    baselineCount: trainedCount - comparedCount,
    namedBests: bests.slice(0, 3),
    featuredBest,
  };
}

// D214 (PR-2, PR-3, PR-8): "Last session today / yesterday / 12 days ago", the
// honest recency fact the Training row falls back to when it has no new best to
// name. A fact, never an instruction (D204).
function lastSessionFact(lastSessionAt, now) {
  if (!Number.isFinite(lastSessionAt)) return null;
  // Local calendar days, the repo's convention (dayKey.js), never 24-hour
  // blocks: a session at 22:00 yesterday read at 08:00 is "yesterday".
  const startOfDay = (ms) => new Date(ms).setHours(0, 0, 0, 0);
  const days = Math.max(0, Math.round((startOfDay(now) - startOfDay(lastSessionAt)) / DAY_MS));
  if (days === 0) return 'Last session today';
  if (days === 1) return 'Last session yesterday';
  return `Last session ${days} days ago`;
}

/**
 * The Training pillar's two lines (Campaign 23 §8/§21/§22 R2; D214 plan 7.1
 * item 3). Built from computeTrainingPillarSummary's pure counts, moved here
 * from AnalyticsScreen.js so the ladder is tested without mounting the screen.
 * Factual evidence statements only (D204); the one next action is the
 * zero-history state's, which §23's state F/L sanctions.
 *
 * The ladder, top rung first:
 *   - no completed session: "No sessions logged yet";
 *   - nothing strength-trained in the window: "No strength training logged in
 *     the last 30 days" with the honest last-session fact;
 *   - nothing to compare yet (PR-3: every exercise trained in the window has
 *     only its first day, the baseline): "Baseline set on N exercises", never
 *     "Strength up on 0 of 0";
 *   - a new best on at least one compared exercise: "Strength up on 9 of 9
 *     exercises in the last 30 days" ("exercises", never "lifts" as shorthand;
 *     the denominator is the exercises with a comparison), the evidence the new
 *     best on the person's heaviest exercise falling back to the most recent;
 *   - compared but none improved: "No new bests in the last 30 days, holding
 *     steady" with the last-session fact.
 * The window is a ROLLING 30 days (S6-4, D200-3), never a calendar month: the
 * Recaps door on the same screen uses the calendar month.
 *
 * @param {{ completedWorkoutCount: number, summary: object, lastSessionAt: ?number,
 *   unitsLabel: string, now?: number }} args
 * @returns {{ state: string, evidence: ?string }}
 */
export function trainingPillarCopy({ completedWorkoutCount, summary, lastSessionAt, unitsLabel, now = Date.now() }) {
  if (completedWorkoutCount === 0) {
    return { state: 'No sessions logged yet', evidence: 'Log your first session to start your training history.' };
  }
  // S6-6 (progress-tab audit 2026-09-24): the "last session" fact rides in the
  // EVIDENCE line, never in the state, so a session of cardio only cannot read
  // the self-contradicting "No sessions in the last 0 days".
  const lastSession = lastSessionFact(lastSessionAt, now);
  if (summary.trainedCount === 0) {
    return { state: 'No strength training logged in the last 30 days', evidence: lastSession };
  }
  if (!(summary.comparedCount > 0)) {
    // Nothing trained in the window has a second day yet: all of it is baseline.
    const n = Number.isFinite(summary.baselineCount) ? summary.baselineCount : summary.trainedCount;
    return {
      state: `Baseline set on ${n} exercise${n === 1 ? '' : 's'}`,
      evidence: 'Strength changes show once an exercise has been trained on two different days.',
    };
  }
  const state = summary.improvedCount > 0
    ? `Strength up on ${summary.improvedCount} of ${summary.comparedCount} exercise${summary.comparedCount === 1 ? '' : 's'} in the last 30 days`
    // "holding steady" claimed a steadiness no new best does not prove (lane
    // 3 review N3); the fact alone, with the last session beside it.
    : 'No new bests in the last 30 days';
  const best = summary.featuredBest;
  const evidence = best
    // The weight lifted, never rounded (82.5 kg is what the plates said).
    ? `${best.exerciseName} ${formatNumber(best.weight)} ${unitsLabel} x ${best.reps}, new best`
    : lastSession;
  return { state, evidence };
}

/**
 * Visual pillar copy (§16, §22 R2): turns the already-derived v1 scan
 * evidence + v2 packet fields (see useVisualPillar.js, which builds these
 * from the SAME producer chain the coach card/check-in already use — no new
 * scan derivation here) into the landing's two-line state/evidence pair.
 * Only the packet's data-quality fields are read (status, trendWindow,
 * confidenceTier, eligibleForAssessment); `packet.assessment` is a coach-
 * comparison classification (needs a weekly weight-trend/goal-phase context
 * this landing pillar does not have) and is deliberately not consulted here.
 *
 * Accepts (and ignores) `capturedAt` for signature parity with
 * useVisualPillar's data shape: the lead review removed the date-anchored
 * wording (the latest scan's capture date is the WRONG endpoint for a
 * "change since" claim, and the baseline's date is not carried by the
 * bounded summary), so no date is rendered until a true baseline date
 * exists to cite.
 *
 * @param {{hasScan: boolean, hasNote: boolean, packet: object|null, capturedAt: number|null}} args
 * @returns {{state: string, evidence: string}}
 */
export function buildVisualPillarCopy({ hasScan, hasNote, packet, capturedAt: _capturedAt }) {
  if (!hasScan) {
    // Founder device order 2026-08-17: the empty state names the feature in
    // the user's words - "scan" is capture-flow vocabulary a brand-new user
    // has not met yet, and the row label alone ("Visual" at the time) told
    // them nothing.
    return { state: 'No photos yet', evidence: 'Take your first progress photos to start tracking visible change.' };
  }
  if (!hasNote) {
    return { state: 'Latest scan was not clear enough', evidence: 'Retake your photos so they can be compared.' };
  }
  const status = packet?.status ?? null;
  const trendWindow = packet?.trendWindow ?? { count: 0, direction: 'uncertain', comparableOnly: false };
  if (status === 'not_comparable') {
    return { state: 'Latest set was not comparable', evidence: 'Kept as a record. A matching set will compare next time.' };
  }
  if (packet?.eligibleForAssessment) {
    const dirWord = trendWindow.direction === 'down' ? 'Leaner'
      : trendWindow.direction === 'up' ? 'Fuller'
        : 'Steady';
    const confWord = packet.confidenceTier === 'high' ? 'high confidence' : 'moderate confidence';
    // Lead amendment (Stage 2 review): the earlier draft said "Visible
    // change since <month of the LATEST scan>" — but the change is since
    // the comparison BASELINE, whose date the bounded summary does not
    // carry (evidence.baselineScanId/spanDays are null by design). Naming
    // the wrong endpoint is false precision (§25 copy law), so the claim
    // anchors to what IS known: the comparable-scan count.
    const count = Number(trendWindow.count) || 0;
    return {
      state: 'Visible change',
      evidence: `${dirWord} across your last ${count} comparable scans, ${confWord}.`,
    };
  }
  const remaining = Math.max(0, 3 - (trendWindow.count ?? 0));
  return {
    state: 'Building your visual trend',
    evidence: remaining > 0
      ? `${remaining} more comparable scan${remaining === 1 ? '' : 's'} until your first assessment.`
      : 'Your next comparable scan will complete your first assessment.',
  };
}


// ─── D214: the Body pillar's two lines ──────────────────────────────────────
// Moved here from AnalyticsScreen.js so it can be tested without mounting the
// screen. The headline is the derivation's insight (the weekly coach's own
// verdict when fresh); the evidence line is the smoothed weight and its rate
// in the person's units, and it is withheld whenever the shared derivation
// says so (`pillarFigure: false`: calm mode, or an open ED flag under the
// D214 Q2 ruling, a withhold strengthened, never weakened). No screen-local
// gate decides this.
// D214 addendum 4 (Body metrics, section 3 item 9): the evidence line names
// its referent and window ("Trend 82.4 kg, +0.1 kg/week over the last 2
// weeks", the two-week reading the derivation carries), a lapsed trend says
// so with no figure (BM-3: never "No weigh-ins logged yet" to a person with
// forty), and the headline never carries the maintenance sentence (BM-15,
// weightTrend.js).
export function bodyPillarCopy(weightTrend, bodyWeightUnits) {
  if (!weightTrend?.render) {
    return { state: 'No weigh-ins logged yet', evidence: 'Log a morning weight to start your trend.' };
  }
  // The row's headline is a fragment like the other three rows', so the
  // derivation's sentence drops its full stop here (the spoken label joins
  // the parts with its own stops).
  const headline = String(weightTrend.insight ?? '').replace(/\.$/, '');
  if (weightTrend.lapsed) {
    return { state: headline, evidence: null };
  }
  const parts = [];
  if (weightTrend.pillarFigure !== false && weightTrend.state >= 2 && weightTrend.ewmaNow != null) {
    parts.push(`Trend ${formatBodyWeight(weightTrend.ewmaNow, bodyWeightUnits)}`);
    const twoWeek = weightTrend.twoWeek;
    if (twoWeek && twoWeek.enough && Number.isFinite(twoWeek.ratePerWeek)) {
      // The rate follows the user's display units (section 15 single-system
      // rule), never a kg rate beside an lbs/stone weight on the same row.
      parts.push(`${formatBodyWeightRate(twoWeek.ratePerWeek, bodyWeightUnits)} over the last 2 weeks`);
    } else if (twoWeek === undefined && weightTrend.showRate && Number.isFinite(weightTrend.weeklyChange)) {
      // A derivation without the two-week reading (a caller that predates
      // it) prints the engine's own rate as before.
      parts.push(formatBodyWeightRate(weightTrend.weeklyChange, bodyWeightUnits));
    }
  }
  return { state: headline, evidence: parts.length ? parts.join(', ') : null };
}
