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

function confidenceLabel(confidence, weeks) {
  const n = Number.isFinite(weeks) ? weeks : 0;
  const plural = n === 1 ? 'week' : 'weeks';
  if (confidence === 'high') return `From ${n} ${plural} of data`;
  if (confidence === 'medium') return `Firming up, from ${n} ${plural} of data`;
  return `Early estimate, from ${n} ${plural} of data`;
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

/**
 * @param {object} input
 * @param {Array}  input.ewmaData     computeEWMA output, oldest-first ({ ewma, weightKg, date })
 * @param {?number} input.weeklyChange computeWeeklyWeightChange output (kg/week) or null
 * @param {?object} input.adaptiveBurn computeAdaptiveTDEEAdjustment output or null
 * @param {boolean} input.edFlagOpen   true when an ED/wellbeing flag is open
 * @returns {object} view-model for WeightTrendCard
 */
export function deriveWeightTrend({ ewmaData, weeklyChange, adaptiveBurn, edFlagOpen = false } = {}) {
  const data = Array.isArray(ewmaData) ? ewmaData : [];
  const n = data.length;
  const state = trendStateFor(n);

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
      insight: 'Still building confidence. Keep logging and this sharpens.',
      maintenance: hasMaintenance
        ? { kcal: adaptiveBurn.adjustedTDEE, label: confidenceLabel(confidence, weeks), weeks }
        : { building: true },
      edFlagOpen: false,
    };
  }

  // States 3 and 4: full interpretation. Band membership from the engine's
  // actual-vs-expected rate; the dot caps at 'watch', never 'act' (Class B).
  const actual = adaptiveBurn?.actualKgPerWeek;
  const expected = adaptiveBurn?.expectedKgPerWeek;
  const diverging = isDiverging(actual, expected);
  const above = Number.isFinite(actual) && Number.isFinite(expected) && actual > expected;

  let insight;
  if (!diverging) {
    insight = 'Trending inside your band. Calories hold.';
  } else if (above) {
    insight = 'Drifting a little above your band. Nothing to change yet.';
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
    dot: diverging ? 'watch' : 'onTrack',
    insight,
    maintenance: hasMaintenance
      ? { kcal: adaptiveBurn.adjustedTDEE, label: confidenceLabel(confidence, weeks), weeks }
      : { building: true },
    edFlagOpen: false,
  };
}
