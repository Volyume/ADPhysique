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
 *
 * D214 addendum 4 (Body metrics, 2026-10-02; the spec is
 * docs/audit/progress-recovery-consistency-audit-2026-10-01/
 * 04-BODY-METRICS-AUDIT-AND-SPEC.md, section 3 items 2 and 9 and section 4):
 * the display reading of direction is the TWO-WEEK trend (twoWeekTrend),
 * named with its window wherever it prints; "steady" has one definition
 * (STEADY_RATE_KG_PER_WEEK) on every display surface; a person whose last
 * weigh-in is older than the 14-day boundary reads as lapsed, never as
 * having no weigh-ins; the maintenance sentence never leads the Body row;
 * the flag sentence claims no stability when the rate is unknown and
 * carries no "slightly"; and the typical day-to-day swing
 * (typicalDailySwingKg) is derived here for Body metrics' noise line. The
 * engine's own smoothers, rates and gates are untouched: these are display
 * readings of the smoothed series the engine already produced.
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
// BM-17: with no weigh-in at all, the calm line promises rather than claims.
export const CALM_INSIGHT_NONE = 'Your weigh-ins will be kept in Body metrics, ready when you want them.';
// BM-16: under an open flag with no rate to read, the line claims nothing
// about the trend; the same line serves a lapsed trend under the flag, where
// "no weigh-in in the last 14 days" would be a nudge.
export const ED_KEPT_INSIGHT = 'Your weigh-ins are kept in Body metrics.';

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

// ─── D214 addendum 4: the display readings ──────────────────────────────────

// One definition of "steady" on every display surface (the retired chip's
// rule, now the only one): a trend moving within this rate, either way, is
// steady. The coach's own dead band lives in the engine and is not this.
export const STEADY_RATE_KG_PER_WEEK = 0.2;
export const TWO_WEEK_WINDOW_DAYS = 14;
export const DIRECTION_MIN_POINTS = 7;
export const DIRECTION_MIN_SPAN_DAYS = 7;
const DAY_MS = 86400000;

function pointMs(p) {
  const raw = p?.loggedAt ?? p?.date ?? p?.createdAt ?? null;
  if (raw == null) return null;
  const ms = typeof raw === 'number' ? raw : Date.parse(raw);
  return Number.isFinite(ms) ? ms : null;
}

/**
 * The trend's movement over the last two weeks: the newest smoothed point
 * against the oldest smoothed point dated inside the window. A reading needs
 * DIRECTION_MIN_POINTS points spanning DIRECTION_MIN_SPAN_DAYS days or more,
 * so a few days of noise never print as a direction. ratePerWeek is the
 * movement normalised to seven days; deltaKg is the movement itself.
 *
 * @param {Array} ewmaData computeEWMA output, oldest-first ({ ewma, date })
 * @param {number} [nowMs]
 * @returns {{ enough: true, deltaKg: number, ratePerWeek: number, spanDays: number, count: number }
 *   | { enough: false, count: number }}
 */
export function twoWeekTrend(ewmaData, nowMs = Date.now()) {
  const data = Array.isArray(ewmaData) ? ewmaData : [];
  const start = nowMs - TWO_WEEK_WINDOW_DAYS * DAY_MS;
  const inWindow = data
    .map(p => ({ ms: pointMs(p), ewma: Number(p?.ewma) }))
    .filter(p => p.ms !== null && p.ms >= start && p.ms <= nowMs && Number.isFinite(p.ewma))
    .sort((a, b) => a.ms - b.ms);
  const count = inWindow.length;
  if (count < DIRECTION_MIN_POINTS) return { enough: false, count };
  const first = inWindow[0];
  const last = inWindow[count - 1];
  const spanDays = (last.ms - first.ms) / DAY_MS;
  if (spanDays < DIRECTION_MIN_SPAN_DAYS) return { enough: false, count };
  const deltaKg = last.ewma - first.ewma;
  return {
    enough: true,
    deltaKg: Math.round(deltaKg * 100) / 100,
    ratePerWeek: Math.round((deltaKg / spanDays) * 7 * 100) / 100,
    spanDays: Math.round(spanDays),
    count,
  };
}

/** 'up', 'down' or 'steady' under the one steady rule; null without a reading. */
export function trendDirection(twoWeek) {
  if (!twoWeek?.enough) return null;
  if (Math.abs(twoWeek.ratePerWeek) < STEADY_RATE_KG_PER_WEEK) return 'steady';
  return twoWeek.ratePerWeek > 0 ? 'up' : 'down';
}

// The Body row's headline when the coach has no fresh verdict and the engine
// no comparison: the direction in words with its window and no number (the
// evidence line carries the figures), never the maintenance sentence (BM-15).
function directionInsight(twoWeek) {
  const dir = trendDirection(twoWeek);
  if (dir === 'up') return 'Trending up over the last 2 weeks.';
  if (dir === 'down') return 'Trending down over the last 2 weeks.';
  if (dir === 'steady') return 'Holding steady over the last 2 weeks.';
  const count = Number(twoWeek?.count) || 0;
  if (count >= DIRECTION_MIN_POINTS) return 'Not enough weigh-ins in the last 2 weeks for a direction yet.';
  return `Not enough weigh-ins in the last 2 weeks for a direction: ${count} of ${DIRECTION_MIN_POINTS}.`;
}

/**
 * The typical day-to-day swing of the person's own weigh-ins: the upper
 * quartile of the absolute change between weigh-ins on consecutive mornings
 * (a gap of 36 hours or less) over the last days days, so "usually moves
 * within X" holds three mornings in four. Null below minEntries weigh-ins in
 * the window or below five such changes. A display reading only; the
 * engine's smoothers carry their own noise handling and never read this.
 *
 * @param {Array} entries raw weigh-ins ({ weightKg, loggedAt | date })
 * @param {object} [opts]
 * @param {number} [opts.nowMs]
 * @param {number} [opts.days]
 * @param {number} [opts.minEntries]
 * @returns {?number} kg, rounded to 0.1 and at least 0.1
 */
export function typicalDailySwingKg(entries, { nowMs = Date.now(), days = 28, minEntries = 10 } = {}) {
  const start = nowMs - days * DAY_MS;
  const rows = (Array.isArray(entries) ? entries : [])
    .map(e => ({ ms: pointMs(e), kg: Number(e?.weightKg ?? e?.weight) }))
    .filter(r => r.ms !== null && r.ms >= start && r.ms <= nowMs && Number.isFinite(r.kg) && r.kg > 0)
    .sort((a, b) => a.ms - b.ms);
  if (rows.length < minEntries) return null;
  const changes = [];
  for (let i = 1; i < rows.length; i += 1) {
    const gap = rows[i].ms - rows[i - 1].ms;
    if (gap > 0 && gap <= 1.5 * DAY_MS) changes.push(Math.abs(rows[i].kg - rows[i - 1].kg));
  }
  if (changes.length < 5) return null;
  changes.sort((a, b) => a - b);
  const upperQuartile = changes[Math.min(changes.length - 1, Math.ceil(changes.length * 0.75) - 1)];
  return Math.max(0.1, Math.round(upperQuartile * 10) / 10);
}

// "3 weeks ago" for the lapsed line: whole days up to a fortnight, then
// weeks, then months, then years; never a decimal.
export function agoPhrase(thenMs, nowMs = Date.now()) {
  const days = Math.max(0, Math.floor((nowMs - thenMs) / DAY_MS));
  if (days < 1) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 14) return `${days} days ago`;
  if (days < 61) return `${Math.round(days / 7)} weeks ago`;
  if (days < 365) return `${Math.max(2, Math.round(days / 30.4))} months ago`;
  const years = Math.floor(days / 365);
  return years === 1 ? 'over a year ago' : `over ${years} years ago`;
}

// BM-3: a person whose last weigh-in is older than the 14-day boundary has a
// trend that lapsed, not no weigh-ins; the line says so and when.
export function lapsedInsight(lastWeighInMs, nowMs = Date.now()) {
  return `No weigh-in in the last 14 days; the last was ${agoPhrase(lastWeighInMs, nowMs)}.`;
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
 * @param {?number} input.lastWeighInMs the newest weigh-in of ANY age (BM-3):
 *                                      with an empty series it marks a lapsed
 *                                      trend rather than no weigh-ins
 * @param {number} [input.nowMs]
 * @returns {object} view-model for the Body row and Body metrics
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
  coachVerdict = null, lastWeighInMs = null, nowMs = Date.now(),
} = {}) {
  const hasAnyWeighIn = (Array.isArray(ewmaData) && ewmaData.length > 0)
    || (Number.isFinite(lastWeighInMs) && lastWeighInMs > 0);
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
      insight: hasAnyWeighIn ? CALM_INSIGHT : CALM_INSIGHT_NONE,
      maintenance: null,
      edFlagOpen: !!edFlagOpen,
      calm: true,
      pillarFigure: false,
    };
  }

  if (state === 0) {
    // BM-3: an empty series with a weigh-in of any age behind it is a trend
    // that lapsed past the 14-day boundary (useWeightTrend.js), never "no
    // weigh-ins logged yet". No figure, no rate, no dot; under an open flag
    // the line claims only what is kept.
    if (hasAnyWeighIn) {
      return {
        render: true,
        state,
        lapsed: true,
        lastWeighInMs,
        ewmaNow: null,
        hasSparkline: false,
        showRate: false,
        showRaw: false,
        dot: null,
        insight: edFlagOpen ? ED_KEPT_INSIGHT : lapsedInsight(lastWeighInMs, nowMs),
        maintenance: null,
        edFlagOpen: !!edFlagOpen,
        pillarFigure: false,
      };
    }
    return { render: false, state };
  }

  const ewmaNow = Number.isFinite(data[n - 1]?.ewma) ? data[n - 1].ewma : null;
  // D214 addendum 4: the two-week reading every display surface prints its
  // direction from; the calm, flag and lapsed branches never carry it.
  const twoWeek = twoWeekTrend(data, nowMs);

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
  // BM-16: the one steady rule decides "broadly stable"; above it the words
  // carry no size ("slightly" claimed a size at any rate); with no rate to
  // read the line claims nothing about the trend; "the past few weeks" only
  // when the series spans a fortnight.
  if (edFlagOpen) {
    const rate = Number.isFinite(weeklyChange) ? weeklyChange : null;
    let insight;
    if (rate === null) {
      insight = ED_KEPT_INSIGHT;
    } else if (Math.abs(rate) < STEADY_RATE_KG_PER_WEEK) {
      insight = n >= 14
        ? 'Your weight has stayed broadly stable over the past few weeks.'
        : 'Your weight has stayed broadly stable over the past week.';
    } else {
      insight = rate > 0 ? 'Your weight trend has been rising.' : 'Your weight trend has been drifting down.';
    }
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
      twoWeek,
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
    insight = directionInsight(twoWeek);
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
    twoWeek,
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
