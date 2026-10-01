/**
 * weightTrend.js — pure derivation for the "Your trend" card (COMP-004).
 *
 * Turns the raw trend inputs (EWMA series + the existing nutritionEngine
 * outputs) into the small view-model the Progress card renders: which state
 * it is in, the one calm insight sentence, whether to show the weekly rate,
 * the maintenance line, and which state-colour the dot wears.
 *
 * Pure and side-effect free so it is fully unit-testable; the async DB / store
 * reads live in the useWeightTrend hook. Copy and colour follow COMP-027's
 * Class B body-data rules: a body-weight surface never wears red (the dot caps
 * at 'watch'), the weight numeral is never coloured, and under an open
 * ED/wellbeing flag the card drops to direction-only copy with no rate, no
 * maintenance number and no dot.
 */

// State by number of morning-weight entries (matches the blueprint's
// state ladder). State 0 means the card does not render at all.
export function trendStateFor(entryCount) {
  if (!Number.isFinite(entryCount) || entryCount < 1) return 0;
  if (entryCount < 7) return 1;
  if (entryCount < 14) return 2;
  if (entryCount < 42) return 3;
  return 4;
}

// Campaign 19 only emits a maintenance number after actual food evidence has
// built the durable memo. Sparse current logging can hold that history, but it
// must never be relabelled as an estimate that assumed the prescription.
function confidenceLabel(confidence, weeks, intakeDaysLogged = 0, source = null) {
  const n = Number.isFinite(weeks) ? weeks : 0;
  const plural = n === 1 ? 'week' : 'weeks';
  const intakeBit = Number.isFinite(intakeDaysLogged) && intakeDaysLogged >= 5
    ? ' and your logged food'
    : source
      ? ' and earlier logged food history'
      : ', assuming you ate to target';
  if (confidence === 'high') return `From ${n} ${plural} of weigh-ins${intakeBit}`;
  if (confidence === 'medium') return `Firming up, from ${n} ${plural} of weigh-ins${intakeBit}`;
  return `Early estimate, from ${n} ${plural} of weigh-ins${intakeBit}`;
}

// Is the trend diverging from plan enough to warrant a look? Uses the
// engine's own actual-vs-expected weekly rates, so "maintain" (expected ~0)
// and "cut/gain" goals all read correctly. 1.5x the expected magnitude, with
// a 0.25 kg/week absolute floor so a maintain goal still has a sane band.
function isDiverging(actual, expected) {
  if (!Number.isFinite(actual) || !Number.isFinite(expected)) return false;
  const tolerance = Math.max(Math.abs(expected) * 1.5, 0.25);
  return Math.abs(actual - expected) > tolerance;
}

// S6-1: the one line the Body pillar shows under calm mode. Plain, no
// number, no prompt to weigh; the figures stay one tap away behind Body
// metrics' own re-confirmation.
export const CALM_INSIGHT = 'Your weigh-ins are kept in Body metrics, ready when you want them.';

// D214 (progress audit 2026-10-01, PR-4): the Progress root's Body row prints
// the weekly coach's OWN verdict on the weight trend, so the row and the
// coaching decision never disagree about whether the weight is doing what
// the plan asks. The verdict arrives as the stored coaching output's
// `weight.onTarget` (null when the coach had too little data) and the sign of
// actual minus goal rate (`direction`), with the goal phase's sign supplying
// the words. The sign per phase mirrors weeklyCoach.js's PHASE_CONFIG and is
// pinned against that source by weightTrend.test.js, so the two cannot drift.
// A verdict older than a fortnight is not printed (a stale week's verdict
// beside a live figure would be its own untruth); the derivation then falls
// back to the sentences below exactly as before.
export const GOAL_SIGN_BY_PHASE = Object.freeze({
  mild_cut: -1, recomp: -1, maint: 0, mild_bulk: 1, mod_bulk: 1,
});
export const COACH_VERDICT_FRESH_MS = 14 * 86400000;

export function coachVerdictInsight(coachVerdict, nowMs = Date.now()) {
  if (!coachVerdict || typeof coachVerdict.onTarget !== 'boolean') return null;
  const at = Number(coachVerdict.at);
  if (Number.isFinite(at) && at > 0 && nowMs - at > COACH_VERDICT_FRESH_MS) return null;
  const sign = GOAL_SIGN_BY_PHASE[coachVerdict.goalPhase];
  if (sign === undefined) return null;
  const dir = Math.sign(Number(coachVerdict.direction) || 0);
  if (coachVerdict.onTarget) return sign === 0 ? 'Holding steady, as planned.' : 'Moving at the planned rate.';
  if (sign === 0) {
    if (dir > 0) return 'Drifting up a little.';
    if (dir < 0) return 'Drifting down a little.';
    return 'Holding steady, as planned.';
  }
  if (dir === 0) return 'Moving at the planned rate.';
  // dir is sign(actual - goal). On a cut (goal below zero) a rate above the
  // goal is slower; on a bulk (goal above zero) a rate above the goal is faster.
  const faster = sign > 0 ? dir > 0 : dir < 0;
  return faster ? 'Moving faster than planned.' : 'Moving slower than planned.';
}

/**
 * @param {object} input
 * @param {Array}  input.ewmaData     computeEWMA output, oldest-first ({ ewma, weightKg, date })
 * @param {?number} input.weeklyChange computeWeeklyWeightChange output (kg/week) or null
 * @param {?object} input.adaptiveBurn computeAdaptiveTDEEAdjustment output or null
 * @param {boolean} input.edFlagOpen   true when an ED/wellbeing flag is open
 * @param {boolean} input.calm         true when calm mode is on (or its read
 *                                      failed): no figure, no rate, no
 *                                      maintenance, one calm line (S6-1)
 * @param {?object} input.stepTrend    COMP-026 latest-run modifier state
 *                                      { applied:boolean, direction:-1|0|1 }, or null
 * @returns {object} view-model for WeightTrendCard
 */
// COMP-026 (B): the secondary line shown on the card in a week the step-trend
// modifier sized the calorie change. British English, no numbers, no "gain",
// no steps->kcal implication. Suppressed entirely under an open ED/wellbeing
// flag (that branch returns before this runs), per impl-COMP-026 section 4.6.
function stepTrendLineFor(stepTrend) {
  if (!stepTrend || !stepTrend.applied) return null;
  if (stepTrend.direction === 1) {
    return 'Your daily movement has risen lately, so your maintenance estimate is updating a little faster.';
  }
  if (stepTrend.direction === -1) {
    return 'You have been moving less lately, so your maintenance estimate is settling to match a little sooner.';
  }
  return null;
}

export function deriveWeightTrend({
  ewmaData, weeklyChange, adaptiveBurn, edFlagOpen = false, stepTrend = null, intakeDaysLogged = 0, calm = false,
  coachVerdict = null, nowMs = Date.now(),
} = {}) {
  const data = Array.isArray(ewmaData) ? ewmaData : [];
  const n = data.length;
  const state = trendStateFor(n);

  // Calm mode (S6-1, progress-tab audit 2026-09-24, register D200): the
  // Progress landing's Body pillar rendered the smoothed bodyweight and its
  // weekly rate from this view-model with no calm read at all, while the
  // Photos pillar beside it and Body metrics itself (a per-session
  // re-confirmation screen) withhold under calm. The withhold now lives in
  // the shared derivation so EVERY consumer of this view-model is calm-safe:
  // no figure, no rate, no maintenance, no dot, and no nudge to weigh in,
  // whatever the state. The reader passes calm fail-closed (a failed
  // wellbeing read counts as calm, the same sentinel usePhotoSuppression
  // uses). BodyMetricsScreen does not pass calm (its own screen gate
  // handles it), so its call is unchanged.
  if (calm) {
    return {
      render: true,
      state,
      ewmaNow: null,
      hasSparkline: false,
      showRate: false,
      showRaw: false,
      dot: null,
      insight: CALM_INSIGHT,
      maintenance: null,
      edFlagOpen: !!edFlagOpen,
      calm: true,
      pillarFigure: false,
    };
  }

  if (state === 0) return { render: false, state };

  const ewmaNow = Number.isFinite(data[n - 1]?.ewma) ? data[n - 1].ewma : null;

  // State 1: too little data to interpret. Compact prompt, no number, no maths.
  if (state === 1) {
    return {
      render: true,
      state,
      ewmaNow,
      hasSparkline: n >= 3,
      showRate: false,
      dot: null,
      insight: 'Log your weight for 7 days and your trend appears here.',
      maintenance: null,
      edFlagOpen: !!edFlagOpen,
    };
  }

  // Open ED/wellbeing flag: direction-only, no rate, no maintenance, no dot.
  if (edFlagOpen) {
    const dir = !Number.isFinite(weeklyChange) || Math.abs(weeklyChange) < 0.05
      ? 'stable'
      : weeklyChange > 0 ? 'up' : 'down';
    const insight = dir === 'up'
      ? 'Your weight trend has been rising slightly.'
      : dir === 'down'
        ? 'Your weight trend has been drifting down.'
        : 'Your weight has stayed broadly stable over the past few weeks.';
    return {
      render: true,
      state,
      ewmaNow,
      hasSparkline: true,
      showRate: false,
      showRaw: false,
      dot: null,
      insight,
      maintenance: null,
      edFlagOpen: true,
      // D214 (Q2, lead ruling under the founder's delegation, a withhold
      // STRENGTHENED, never weakened): the Progress root's Body row prints
      // no weight figure under an open flag, as it already does under calm
      // mode. Body metrics keeps the person's own number on their own
      // screen (ewmaNow above is unchanged for it).
      pillarFigure: false,
    };
  }

  const confidence = adaptiveBurn?.confidence ?? 'insufficient_data';
  const weeks = Number.isFinite(adaptiveBurn?.weeks) ? adaptiveBurn.weeks : Math.floor(n / 7);
  const hasMaintenance = confidence !== 'insufficient_data'
    && Number.isFinite(adaptiveBurn?.adjustedTDEE) && adaptiveBurn.adjustedTDEE > 0;

  // States 2: enough for a line, not yet for a verdict or an estimate.
  if (state === 2) {
    return {
      render: true,
      state,
      ewmaNow,
      hasSparkline: true,
      showRate: false,
      dot: 'neutral',
      insight: 'Your trend is still taking shape. Keep logging and it will become clearer.',
      maintenance: hasMaintenance
        ? { kcal: adaptiveBurn.adjustedTDEE, label: confidenceLabel(confidence, weeks, intakeDaysLogged, adaptiveBurn?.source), weeks }
        : { building: true },
      edFlagOpen: false,
    };
  }

  // States 3 and 4: full interpretation. Band membership from the engine's
  // actual-vs-expected rate; the dot caps at 'watch', never 'act' (Class B).
  const actual = adaptiveBurn?.actualKgPerWeek;
  const expected = adaptiveBurn?.expectedKgPerWeek;
  const hasComparison = Number.isFinite(actual) && Number.isFinite(expected);
  const diverging = isDiverging(actual, expected);
  const above = Number.isFinite(actual) && Number.isFinite(expected) && actual > expected;

  // D214 (PR-4): the coach's own verdict leads when it is fresh; the
  // actual-against-expected comparison and the "updated" sentence remain the
  // fallbacks for a week with no verdict.
  const coachLine = coachVerdictInsight(coachVerdict, nowMs);
  let insight;
  if (coachLine) {
    insight = coachLine;
  } else if (!hasComparison) {
    insight = 'Your weight trend is updated. Your maintenance calories are worked out from your own food and weight logs.';
  } else if (!diverging) {
    insight = 'Trending inside your target range. Your calorie target stays the same.';
  } else if (above) {
    insight = 'Drifting a little above your target range. Nothing to change yet.';
  } else {
    insight = 'Trending a little under your target. Nothing to change yet.';
  }

  return {
    render: true,
    state,
    ewmaNow,
    hasSparkline: true,
    showRate: true,
    weeklyChange: Number.isFinite(weeklyChange) ? weeklyChange : null,
    dot: coachLine ? (coachVerdict.onTarget ? 'onTrack' : 'watch') : (diverging ? 'watch' : 'onTrack'),
    insight,
    pillarFigure: true,
    maintenance: hasMaintenance
      ? { kcal: adaptiveBurn.adjustedTDEE, label: confidenceLabel(confidence, weeks, intakeDaysLogged, adaptiveBurn?.source), weeks }
      : { building: true },
    stepTrendLine: stepTrendLineFor(stepTrend),
    edFlagOpen: false,
  };
}
