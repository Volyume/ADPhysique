/**
 * weeklyStory.js — Audit §15 item 1: connected weekly story surface.
 *
 * Composes the FOUR strands the app already computes every week into one
 * ordered, calm narrative: train -> eat -> weigh -> decision. This is the
 * fragmentation fix from the 2026-07-08 launch audit (00-full-audit.md §2,
 * "the connected narrative... is real in the data layer... but fragmented
 * across Home banners, Analytics cards, Profile tiles and Check-in"). No new
 * data source, no new engine, no AI, no randomness — this only reads fields
 * the callers already fetch elsewhere:
 *
 *   - training  -> getWeeklySessionStats(userId, weekStart) + getWeeklyPRCount
 *                  (already read together on CoachOutputScreen)
 *   - eating    -> getRecentIntakeSummary(userId) + getNutritionTargets(userId)
 *                  (already read together on CoachOutputScreen)
 *   - body      -> the weekly coach output's own `trend` field (ewma7, delta,
 *                  onTarget, deltaLabel, rateLabel) — the same EWMA-derived
 *                  weight trend runWeeklyCoach already produces, not a fresh
 *                  computation
 *   - decision  -> getLatestCoachOutput(userId): whyThisWeek + heldDecisions,
 *                  the engine's own already-written explanation
 *
 * Pure, deterministic, no I/O. A missing or thin strand degrades to one
 * honest, calm sentence — never a fabricated number, never a crash.
 *
 * ED-safety: `suppress` (open ED-pattern flag OR calm mode OR a failed safety
 * read — fail CLOSED) strips the body strand to direction-only language with
 * no numbers, mirroring the existing suppression contract in
 * `weightTrend.js` (`deriveWeightTrend`'s `edFlagOpen` branch) and
 * `shareCard/greatWeek.js` (`suppress`). Training and eating stay unaffected:
 * neither carries weight/rate numbers, so nothing to strip there.
 */

function chapter(key, icon, heading, body, empty = false) {
  return { key, icon, heading, body, empty };
}

function buildTrainingChapter({ sessionStats, prsThisWeek }) {
  const completed = sessionStats?.completed;
  const planned = sessionStats?.planned;
  if (!Number.isFinite(completed) || !Number.isFinite(planned) || planned <= 0) {
    return chapter('training', 'barbell-outline', 'Training', 'No sessions logged this week yet.', true);
  }
  let body = `You trained ${completed} of ${planned} planned session${planned === 1 ? '' : 's'} this week.`;
  const prs = Number.isFinite(prsThisWeek) ? prsThisWeek : 0;
  if (prs > 0) {
    body += ` You set ${prs} new PR${prs === 1 ? '' : 's'}.`;
  }
  return chapter('training', 'barbell-outline', 'Training', body, false);
}

function buildEatingChapter({ intake, targetKcal }) {
  const daysLogged = intake?.daysLogged;
  const avgKcal = intake?.avgKcal;
  if (!Number.isFinite(daysLogged) || daysLogged <= 0 || !Number.isFinite(avgKcal)) {
    return chapter('eating', 'nutrition-outline', 'Eating', 'No meals logged in the last 7 days.', true);
  }
  let body = `You logged food on ${daysLogged} of the last 7 days, averaging ${avgKcal} kcal a day.`;
  if (Number.isFinite(targetKcal) && targetKcal > 0) {
    const diff = avgKcal - targetKcal;
    // Within 5% of target reads as "close to" rather than a hair-splitting
    // over/under, matching the adherence-neutral voice used elsewhere
    // (weeklyCoach's calsAdherence bands, no pass/fail framing).
    const closeBand = targetKcal * 0.05;
    if (Math.abs(diff) <= closeBand) {
      body += ` That's close to your ${targetKcal} kcal target.`;
    } else if (diff > 0) {
      body += ` That's above your ${targetKcal} kcal target.`;
    } else {
      body += ` That's below your ${targetKcal} kcal target.`;
    }
  }
  return chapter('eating', 'nutrition-outline', 'Eating', body, false);
}

function buildBodyChapter({ trend, hasEnoughWeightData, suppress }) {
  if (!trend || !hasEnoughWeightData) {
    return chapter('body', 'trending-up-outline', 'Weighing in', 'Not enough weigh-ins yet to show a trend this week.', true);
  }
  if (suppress) {
    // Direction-only, no numbers, no rate label — same contract as
    // deriveWeightTrend's edFlagOpen branch (weightTrend.js).
    const delta = trend.delta;
    let body;
    if (!Number.isFinite(delta) || Math.abs(delta) < 0.05) {
      body = 'Your weight has stayed broadly stable.';
    } else if (delta > 0) {
      body = 'Your weight trend has been drifting up.';
    } else {
      body = 'Your weight trend has been drifting down.';
    }
    return chapter('body', 'trending-up-outline', 'Weighing in', body, false);
  }
  const label = trend.deltaLabel || 'Calculating…';
  const body = trend.onTarget ? `${label}, on target for your goal.` : `${label}.`;
  return chapter('body', 'trending-up-outline', 'Weighing in', body, false);
}

function buildDecisionChapter({ coachOutput, isCurrentWeek }) {
  if (!coachOutput) {
    return chapter(
      'decision',
      'compass-outline',
      "This week's decision",
      'No coaching decision yet. Complete your first weekly check-in to see one here.',
      true,
    );
  }
  const sentences = [];
  if (coachOutput.whyThisWeek) sentences.push(coachOutput.whyThisWeek);
  const held = Array.isArray(coachOutput.heldDecisions) ? coachOutput.heldDecisions : [];
  for (const h of held) {
    if (h?.reason) sentences.push(h.reason);
  }
  let body = sentences.length ? sentences.join(' ') : 'The coach held everything the same this week.';
  if (!isCurrentWeek) {
    body = `From your last coaching decision: ${body}`;
  }
  return chapter('decision', 'compass-outline', "This week's decision", body, false);
}

/**
 * @param {object} input
 * @param {?string} input.weekLabel - e.g. "1 Jul to 7 Jul 2026" (weekRangeLabel output), for the screen header.
 * @param {?{completed:number, planned:number}} input.sessionStats - getWeeklySessionStats result.
 * @param {?number} input.prsThisWeek - getWeeklyPRCount result.
 * @param {?{avgKcal:?number, daysLogged:number}} input.intake - getRecentIntakeSummary result.
 * @param {?number} input.targetKcal - getNutritionTargets(...).targetKcal.
 * @param {?object} input.coachOutput - getLatestCoachOutput result (the full weekly coach output shape).
 * @param {boolean} [input.isCurrentWeek] - true when coachOutput.weekStart matches this calendar week.
 * @param {boolean} [input.suppress] - open ED-pattern flag OR calm mode OR a failed safety read (fail CLOSED).
 * @returns {{weekLabel: ?string, chapters: Array<{key:string, icon:string, heading:string, body:string, empty:boolean}>}}
 */
export function buildWeeklyStory({
  weekLabel = null,
  sessionStats = null,
  prsThisWeek = null,
  intake = null,
  targetKcal = null,
  coachOutput = null,
  isCurrentWeek = false,
  suppress = false,
} = {}) {
  const trend = coachOutput?.trend ?? null;
  const hasEnoughWeightData = !!coachOutput?.hasEnoughData;
  const chapters = [
    buildTrainingChapter({ sessionStats, prsThisWeek }),
    buildEatingChapter({ intake, targetKcal }),
    buildBodyChapter({ trend, hasEnoughWeightData, suppress: !!suppress }),
    buildDecisionChapter({ coachOutput, isCurrentWeek: !!isCurrentWeek }),
  ];
  return { weekLabel: weekLabel ?? null, chapters };
}
