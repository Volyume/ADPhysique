/**
 * pillars.js — pure view-model builders for the Progress landing's Answer
 * Block (Campaign 23, PROGRESS-UX-SPEC.md §22 R2).
 *
 * No I/O, no store reads, no engine imports: every function here takes
 * already-loaded data and returns plain objects for the screen to render.
 * This mirrors progressSeries.js's own "re-presentation only" contract.
 */
import { calculate1RM } from '../algorithms';
import { localDayKey } from '../dayKey';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Training pillar summary (§21/§22 R2, §8 ruling): a trailing-month
 * strength-direction count ("Strength up on N of M lifts") plus up to three
 * NAMED recent bests, deduplicated to one per exercise per LOCAL day (IA-3,
 * §28) so a single session's escalating top sets cannot inflate the count.
 *
 * `trainedCount` / `improvedCount` only consider `weight_reps` exercises
 * (matches computePRsPerWeek's own gate, useProgressData.js) so distance/
 * duration/bodyweight-reps-only exercises never appear as a "lift".
 *
 * @param {Array<object>} allSets - completed workout sets
 * @param {object} exerciseMap - id -> exercise row (needs `.type`/`.exerciseType`, `.name`)
 * @param {{windowDays?: number, now?: number}} [opts]
 * @returns {{trainedCount: number, improvedCount: number, namedBests: Array<{exerciseId, exerciseName, weight, reps, at, e1rm}>}}
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
  const bests = [];

  for (const [exId, sets] of Object.entries(byEx)) {
    const exType = exerciseMap?.[exId]?.type ?? exerciseMap?.[exId]?.exerciseType ?? exerciseMap?.[exId]?.exercise_type ?? 'weight_reps';
    if (exType !== 'weight_reps') continue;
    const exerciseName = exerciseMap?.[exId]?.name ?? 'Exercise';
    let runningMax = 0;
    let trainedInWindow = false;
    let improvedInWindow = false;
    let lastBestDayKey = null;
    for (const s of sets) {
      const st = s.setType ?? s.set_type ?? 'straight';
      if (st === 'warmup' || st === 'myo_reps' || st === 'rest_pause') continue;
      const at = s.createdAt ?? s.created_at ?? 0;
      const w = s.weight ?? 0;
      const r = s.actualReps ?? s.actual_reps ?? 0;
      if (w <= 0 || r <= 0) continue;
      if (at >= windowStart) trainedInWindow = true;
      const est = calculate1RM(w, r);
      if (est > runningMax) {
        // FQ-7 (matches computePRsPerWeek): the first qualifying exposure is
        // a baseline, never a record.
        const isBaseline = runningMax === 0;
        runningMax = est;
        if (!isBaseline && at >= windowStart) {
          improvedInWindow = true;
          const dayKey = localDayKey(at);
          const entry = { exerciseId: exId, exerciseName, weight: w, reps: r, at, e1rm: est };
          // Per-exercise-per-day dedup (IA-3): only the day's best survives.
          // Because runningMax only ever rises, the LAST qualifying set on a
          // given day is that day's best, so replacing in place is correct.
          if (dayKey === lastBestDayKey) bests[bests.length - 1] = entry;
          else { bests.push(entry); lastBestDayKey = dayKey; }
        }
      }
    }
    if (trainedInWindow) trainedCount += 1;
    if (improvedInWindow) improvedCount += 1;
  }

  bests.sort((a, b) => b.at - a.at);
  return { trainedCount, improvedCount, namedBests: bests.slice(0, 3) };
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
    return { state: 'Latest scan needs a clearer read', evidence: 'Retake for a comparable read.' };
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
