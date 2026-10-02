/**
 * BodyMetricsScreen display helpers, pulled out as pure functions
 * (dependency-free: no react-native, no database, no sync) so they are
 * unit-testable without mounting BodyMetricsScreen, which pulls in
 * react-native-svg via VolyumeChart (same rationale as
 * bodyMetricsHistoryMerge.js and weightTrend.js, already split out of this
 * screen for the same reason).
 *
 * BUILD LANE A (progress-tab audit 2026-09-24, second pass).
 */
import { format } from 'date-fns/format';
import { parseISO } from 'date-fns/parseISO';
import { kgToLbs, lbsToKg, kgToStoneLbs, formatBodyWeight } from './units';
import { localDayKey, parseLocalDay } from './dayKey';
import { formatNumber, formatWithUnit, toEnergy, energyUnitLabel } from './format';
import {
  trendDirection, STEADY_RATE_KG_PER_WEEK, DIRECTION_MIN_POINTS, DIRECTION_MIN_SPAN_DAYS, twoWeekWindowPhrase,
} from './weightTrend';
import { STEADY_AMOUNT_KG } from './chartWindows';

// ─── A1: WeightTrendChart's value/label unit mapping ──────────────────────────
//
// THE DEFECT: the chart always plotted canonical kg (e.body_weight, min/max
// from raw kg) but labelled the axis/tooltip straight from bodyWeightUnits --
// for a pounds user that put "lbs" on a true kg number (82.5 kg read
// "82.5 lbs"). 'st' is unchanged by design (kg values, an honest ' kg' label
// -- stone itself is not a useful decimal chart axis); 'lbs' converts every
// plotted number with the existing units.js conversion (one decimal,
// matching formatBodyWeightRate's own rounding) so the number and its label
// agree; 'kg' (or anything else) is unchanged.

export function weightChartUnitLabel(bodyWeightUnits) {
  return bodyWeightUnits === 'lbs' ? 'lbs' : 'kg';
}

export function weightChartValue(kg, bodyWeightUnits) {
  if (kg == null || isNaN(kg)) return kg;
  return bodyWeightUnits === 'lbs' ? parseFloat(kgToLbs(kg).toFixed(1)) : kg;
}

export function weightChartTooltipTitle(kg, bodyWeightUnits) {
  return `${weightChartValue(kg, bodyWeightUnits)} ${weightChartUnitLabel(bodyWeightUnits)}`;
}

// ─── A2: snapshot header date label ─────────────────────────────────────────
//
// THE DEFECT: the snapshot header fell back to the literal string "Today"
// whenever the stored metric_date failed to parse -- a claim about the
// CURRENT day for an entry whose real date is simply unknown, not
// necessarily today at all. "Today" now shows only when the parsed date
// really IS the current local day (dayKey.js localDayKey, matching how
// metric_date is stamped in BodyMetricsScreen's rowToEntry); an unparseable
// date is honest about not knowing ("Date unknown"); any other parseable
// date keeps its normal formatted form, exactly as before.

export function weightSnapshotDateLabel(metricDate, nowMs = Date.now()) {
  if (!metricDate) return 'Date unknown';
  let d;
  try {
    d = typeof metricDate === 'string' ? parseISO(metricDate) : new Date(metricDate);
  } catch (_) {
    return 'Date unknown';
  }
  if (!d || isNaN(d.getTime())) return 'Date unknown';
  if (localDayKey(d.getTime()) === localDayKey(nowMs)) return 'Today';
  return format(d, 'd MMM yyyy');
}

// ─── D214 addendum 4 (Body metrics, lane 7): the screen's sentences ───────────
//
// Spec docs/audit/progress-recovery-consistency-audit-2026-10-01/
// 04-BODY-METRICS-AUDIT-AND-SPEC.md section 3. Every line the screen speaks
// is built here, pure, so the wording is tested against the real functions
// and the screen only places them. Rules the sentences keep: they describe and
// never instruct (D204), every number carries its unit and its referent, and a
// stone or pound user reads stones and pounds everywhere except the chart axis
// (which stays in kilograms with its one-line note, A1).

const DAY_MS = 86400000;

/** A number as text: rounded to `maxDp` places, no trailing zeros, never "-0". */
export function trimDecimals(value, maxDp = 1) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '';
  const f = 10 ** maxDp;
  const r = Math.round(n * f) / f;
  return String(Object.is(r, -0) ? 0 : r);
}

/**
 * An amount of weight (a change, a difference, a swing) in the person's
 * units, always positive: "0.3 kg", "0.7 lbs", "8 st 7 lbs". Stones appear once
 * the amount is a stone or more.
 */
export function formatWeightAmount(kg, bwu = 'st') {
  const n = Math.abs(Number(kg));
  if (!Number.isFinite(n)) return '';
  if (bwu === 'kg') return `${trimDecimals(n, 1)} kg`;
  const lbs = kgToLbs(n);
  if (bwu === 'st' && lbs >= 14) {
    const { stone, lbs: rest } = kgToStoneLbs(n);
    return rest > 0 ? `${stone} st ${trimDecimals(rest, 1)} ${rest === 1 ? 'lb' : 'lbs'}` : `${stone} st`;
  }
  const shown = trimDecimals(lbs, lbs < 10 ? 1 : 0);
  return `${shown} ${shown === '1' ? 'lb' : 'lbs'}`;
}

/** A weekly rate in the person's units, always positive: "0.15 kg a week", "0.3 lbs a week" (the app's one spelling, units.js). */
export function formatWeightRatePerWeek(kgPerWeek, bwu = 'st') {
  const n = Math.abs(Number(kgPerWeek));
  if (!Number.isFinite(n)) return '';
  return bwu === 'kg'
    ? `${trimDecimals(n, 2)} kg a week`
    // Two decimals in pounds too (0.2 kg is 0.44 lbs; at one decimal 0.18 and
    // 0.2 kg both read "0.4 lbs", one steady and one not; closing review S1).
    : `${trimDecimals(kgToLbs(n), 2)} ${trimDecimals(kgToLbs(n), 2) === '1' ? 'lb' : 'lbs'} a week`;
}

/** A local day key as text in a date-fns pattern; '' for an unreadable key. */
export function dayKeyLabel(dayKey, pattern = 'd MMM') {
  const d = parseLocalDay(dayKey);
  if (!d || Number.isNaN(d.getTime())) return '';
  try { return format(d, pattern); } catch (_) { return ''; }
}
/** "16 Sep" */
export const shortDate = (dayKey) => dayKeyLabel(dayKey, 'd MMM');
/** "Tue 16 Sep" */
export const weekdayDate = (dayKey) => dayKeyLabel(dayKey, 'EEE d MMM');
/** "16 Sep 2025" and "Tue 16 Sep 2025": for a window that crosses a year (review S2). */
export const shortDateYear = (dayKey) => dayKeyLabel(dayKey, 'd MMM yyyy');
export const weekdayDateYear = (dayKey) => dayKeyLabel(dayKey, 'EEE d MMM yyyy');
/** "16 Sep" for an epoch time, on the person's local day. */
export const shortDateOfMs = (ms) => (Number.isFinite(ms) ? shortDate(localDayKey(ms)) : '');
/** "7:02" for an epoch time, 24-hour, local. */
export function clockTime(ms) {
  if (!Number.isFinite(ms)) return '';
  try { return format(new Date(ms), 'H:mm'); } catch (_) { return ''; }
}

// ── The This week card ──

/** "weighed 4 of 5 mornings so far this week": a denominator, never a streak. */
export function morningsCaption({ weighed, elapsed }) {
  return `weighed ${weighed} of ${elapsed} ${elapsed === 1 ? 'morning' : 'mornings'} so far this week`;
}

/**
 * The direction over the last two weeks, in words with its rate:
 * "Down 0.3 kg over the last 2 weeks, about 0.15 kg a week." Steady under the
 * ONE steady rule (weightTrend.STEADY_RATE_KG_PER_WEEK). The window named is
 * the one the weigh-ins cover (twoWeekWindowPhrase: "over the last 9 days"
 * until they span a fortnight). Null without a reading.
 */
export function twoWeekVerdictLine(twoWeek, bwu = 'st') {
  const dir = trendDirection(twoWeek);
  if (!dir) return null;
  const rate = formatWeightRatePerWeek(twoWeek.ratePerWeek, bwu);
  const over = twoWeekWindowPhrase(twoWeek);
  if (dir === 'steady') return `Holding steady ${over}, about ${rate}.`;
  return `${dir === 'up' ? 'Up' : 'Down'} ${formatWeightAmount(twoWeek.deltaKg, bwu)} ${over}, about ${rate}.`;
}

/**
 * Said instead of a direction while there is too little to read one, with its
 * denominator: "Not enough weigh-ins yet to show which way your weight is going: 3 of 7."
 */
export function notEnoughForDirectionLine(twoWeek) {
  const count = Number(twoWeek?.count) || 0;
  if (count >= DIRECTION_MIN_POINTS) {
    const span = Math.max(0, Math.floor(Number(twoWeek?.spanDays) || 0));
    return `Not enough time yet to show which way your weight is going: your weigh-ins cover ${Math.min(span, DIRECTION_MIN_SPAN_DAYS)} of ${DIRECTION_MIN_SPAN_DAYS} days.`;
  }
  return `Not enough weigh-ins yet to show which way your weight is going: ${count} of ${DIRECTION_MIN_POINTS}.`;
}

/**
 * A weight as the screen would print it, back in kilograms: to 0.1 kg, to the
 * pound, or to the half pound of a stone reading. The week comparison differs
 * the PRINTED averages, so it never says "0.1 kg above" beside two averages
 * that both read 82.3 kg.
 */
export function roundToDisplay(kg, bwu = 'st') {
  const n = Number(kg);
  if (!Number.isFinite(n)) return NaN;
  // formatBodyWeight's own rounding (toFixed), so a .x5 tie never prints
  // "0.1 kg above" beside two averages that both read the same (review S6).
  if (bwu === 'kg') return parseFloat(n.toFixed(1));
  if (bwu === 'lbs') return lbsToKg(Math.round(kgToLbs(n)));
  const { stone, lbs } = kgToStoneLbs(n);
  return lbsToKg(stone * 14 + lbs);
}

/**
 * This week against last: "This week's average so far is 82.3 kg, 0.2 kg below
 * last week's (5 weigh-ins against 6)." Omitted (null) until last week holds
 * two weigh-ins. "so far" because the week is open.
 */
export function weekComparisonLine({ thisWeek, lastWeek, bwu = 'st' }) {
  if (!thisWeek || !lastWeek || !(thisWeek.count > 0) || !(lastWeek.count >= 2)) return null;
  const diff = roundToDisplay(thisWeek.averageKg, bwu) - roundToDisplay(lastWeek.averageKg, bwu);
  const level = Math.abs(diff) < 0.01;
  const relation = level ? 'level with' : `${formatWeightAmount(diff, bwu)} ${diff < 0 ? 'below' : 'above'}`;
  const n = thisWeek.count;
  const m = lastWeek.count;
  return `This week's average so far is ${formatBodyWeight(thisWeek.averageKg, bwu)}, ${relation} last week's (${n} weigh-in${n === 1 ? '' : 's'} against ${m}).`;
}

/** "Day to day your weight usually moves within 0.4 kg." Null without a swing. */
export function noiseLine(swingKg, bwu = 'st') {
  if (!(Number(swingKg) > 0)) return null;
  return `Day to day your weight usually moves within ${formatWeightAmount(swingKg, bwu)}.`;
}

export const TREND_WEIGHT_INFO = 'A smoothed average of your recent weigh-ins, so one heavy or light morning moves the trend weight only a little. With only a few weigh-ins the trend weight stays close to your latest one.';
export const DAY_ZERO_LINE = 'Your trend starts with your first morning weigh-in.';

/** Day zero: "Starting weight from setup: 82 kg, 3 Aug" (the date only when it is known). */
export function startingWeightLine({ kg, ms, bwu = 'st' }) {
  if (!(Number(kg) > 0)) return null;
  const date = shortDateOfMs(ms);
  return `Starting weight from setup: ${formatBodyWeight(kg, bwu)}${date ? `, ${date}` : ''}`;
}

/** A lapsed trend has no trend weight; the last weigh-in is still the person's own number, named as such. */
export function lastWeighInCaption(dayKey) {
  const date = dayKey ? shortDate(dayKey) : '';
  return date ? `last weigh-in, ${date}` : 'last weigh-in';
}

/**
 * The weekly coach's own verdict on the weight trend, mapped from the stored
 * coaching output exactly as useWeightTrend does (D214 PR-4), so the verdict
 * line here and the Progress Body row read the same words. `shortfall` is the
 * negated sign of actual minus goal (weeklyCoach.js), so the direction is
 * sign(actual - goal). Null without an output.
 */
export function coachVerdictFromOutput(lastCoach) {
  if (!lastCoach?.weight) return null;
  const weekStartRaw = lastCoach?.weekStart ?? lastCoach?.week_start ?? null;
  const weekStartMs = typeof weekStartRaw === 'number'
    ? weekStartRaw
    : (typeof weekStartRaw === 'string' ? Date.parse(weekStartRaw) : NaN);
  return {
    onTarget: typeof lastCoach.weight.onTarget === 'boolean' ? lastCoach.weight.onTarget : null,
    direction: Number.isFinite(Number(lastCoach.weight.shortfall)) ? -Number(lastCoach.weight.shortfall) : 0,
    goalPhase: lastCoach.weight.goalPhase ?? null,
    at: Number.isFinite(weekStartMs) ? weekStartMs : null,
  };
}

// ── The Trend card ──

/** The card title for a window key: "Trend, last 3 months". */
export function trendTitle(windowKey) {
  const words = { '1M': 'last month', '3M': 'last 3 months', '6M': 'last 6 months', Y: 'last year' };
  return `Trend, ${words[windowKey] ?? 'last 3 months'}`;
}

/** What the chart's colours are, in the person's units where the axis differs. */
export const TREND_LEGEND = Object.freeze([
  { key: 'trend', label: 'Trend' },
  { key: 'weighins', label: 'Weigh-ins' },
]);

/** The note under a chart that reads in kilograms for a stone user (A1). */
export function chartUnitNote(bwu) {
  return bwu === 'st' ? 'The chart reads in kilograms.' : null;
}

/** The (i) on the Trend card: what the line, the dots and "steady" mean. */
export function trendInfo(bwu = 'st', { includeSteady = true } = {}) {
  const base = 'The line is your trend, a smoothed average of your weigh-ins. The dots are the weigh-ins themselves.';
  return includeSteady
    ? `${base} Steady means the trend moves by less than ${formatWeightRatePerWeek(STEADY_RATE_KG_PER_WEEK, bwu)} and by less than ${formatWeightAmount(STEADY_AMOUNT_KG, bwu)} in all.`
    : base;
}

/**
 * The y-axis domain fitted to the window's weigh-ins and trend plus the
 * person's typical day-to-day swing (never a fixed pad): [min - swing,
 * max + swing] in kilograms, with a floor on the span so a flat series still
 * has height.
 * @returns {{ min: number, max: number }}
 */
export function fittedAxis(values, swingKg = 0) {
  const finite = (values || []).map(Number).filter((v) => Number.isFinite(v));
  if (!finite.length) return { min: 0, max: 1 };
  const lo = Math.min(...finite);
  const hi = Math.max(...finite);
  const pad = Math.max(0.1, Number(swingKg) > 0 ? Number(swingKg) : 0.3);
  let min = lo - pad;
  let max = hi + pad;
  if (max - min < 0.8) {
    const mid = (min + max) / 2;
    min = mid - 0.4;
    max = mid + 0.4;
  }
  return { min: Math.round(min * 10) / 10, max: Math.round(max * 10) / 10 };
}

/**
 * Round values inside [min, max] for the y-axis rules: the smallest round step
 * that gives two to five of them. The domain stays fitted to the data; only the
 * rules sit on round numbers.
 */
export function niceAxisTicks(min, max) {
  if (!(Number(max) > Number(min))) return [];
  for (const step of [0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50]) {
    const first = Math.ceil(min / step - 1e-9) * step;
    const out = [];
    for (let v = first; v <= max + 1e-9; v += step) out.push(Math.round(v * 100) / 100);
    if (out.length >= 2 && out.length <= 5) return out;
  }
  return [];
}

/** The y-axis label gutter, wide enough for the longest label ("82.6 kg"); never under the default 34. */
export function axisGutterWidth(labels) {
  const longest = Math.max(0, ...(labels || []).map((l) => String(l).length));
  return Math.max(34, Math.ceil(longest * 5.4) + 10);
}

/** Monday-anchored weekly tick times between two instants (the chart's baseline ticks). */
export function weeklyTickTimes(fromMs, toMs, maxTicks = 30) {
  if (!Number.isFinite(fromMs) || !Number.isFinite(toMs) || toMs <= fromMs) return [];
  const out = [];
  const d = new Date(fromMs);
  d.setHours(12, 0, 0, 0);
  const dow = (d.getDay() + 6) % 7; // 0 = Monday
  d.setDate(d.getDate() + ((7 - dow) % 7));
  while (d.getTime() <= toMs) {
    out.push(d.getTime());
    d.setDate(d.getDate() + 7);
  }
  if (out.length <= maxTicks) return out;
  const step = Math.ceil(out.length / maxTicks);
  return out.filter((_, i) => i % step === 0);
}

// ── Maintenance calories ──

// The memo contract's own thresholds (effectiveMaintenance.js:
// `validWeights.length < 14` and `foodDaysLogged) < 5` in deriveEffectiveMaintenanceMemo,
// `weightPoints < 14` and `foodDays < 5` in isValidEffectiveMaintenanceMemo;
// the 7-day food window is food/db.js getRecentIntakeSummary; the 14-day
// freshness is learnEffectiveMaintenanceForUser). They are not exported
// there, so the denominators are named here and a source guard pins that the
// literals in the contract have not moved.
export const MAINTENANCE_MIN_WEIGH_IN_DAYS = 14;
export const MAINTENANCE_MIN_FOOD_DAYS = 5;
export const MAINTENANCE_FOOD_WINDOW_DAYS = 7;
export const MAINTENANCE_WEIGH_IN_FRESH_DAYS = 14;

export const MAINTENANCE_TITLE = 'Maintenance calories';

/** The (i): what maintenance calories are, the coaching's own name for them, and what the estimate needs. */
export const MAINTENANCE_INFO = `Maintenance calories are the calories you eat in a day to stay the same weight. This is an estimate worked out from your weight and food logs, not a measurement. Your coaching calls it effective maintenance. The estimate needs ${MAINTENANCE_MIN_WEIGH_IN_DAYS} weigh-ins and food logged on ${MAINTENANCE_MIN_FOOD_DAYS} of the last ${MAINTENANCE_FOOD_WINDOW_DAYS} days.`;

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

function energyText(kcal, energyUnit) {
  return formatWithUnit(formatNumber(toEnergy(kcal, energyUnit)), energyUnitLabel(energyUnit));
}

/**
 * The calories card, from the resolver's own answer (the same authority the
 * hook and the coach read): the figure only for a remembered one, the days
 * counted against the contract's own thresholds otherwise. Three states in the
 * spec's words, and a fourth the contract has (held: the estimate is older
 * than its 14 days and nothing newer has been logged), said as what it is.
 *
 * @param {object} authority resolveEffectiveMaintenanceForUser's result
 *   ({ resolved, memo, weights, intake })
 * @param {object} [opts]
 * @param {'kcal'|'kj'} [opts.energyUnit]
 * @param {number} [opts.nowMs]
 * @returns {{ state: 'current'|'rechecking'|'held'|'building', kcal: ?number,
 *   figure: ?{ number: string, unit: string, estimated: string }, line: string }}
 */
export function maintenanceModel(authority, { energyUnit = 'kcal', nowMs = Date.now() } = {}) {
  const resolved = authority?.resolved ?? null;
  const memo = authority?.memo ?? null;
  const weights = Array.isArray(authority?.weights) ? authority.weights : [];
  const intake = authority?.intake ?? null;
  const remembered = resolved
    && resolved.source !== 'formula_prior'
    && Number.isFinite(resolved.effectiveMaintenanceKcal)
    && resolved.effectiveMaintenanceKcal > 0;
  if (remembered && ['current', 'revalidating', 'held'].includes(resolved.status)) {
    const kcal = resolved.effectiveMaintenanceKcal;
    const unit = energyUnitLabel(energyUnit);
    const figure = { number: formatNumber(toEnergy(kcal, energyUnit)), unit: `${unit} a day`, estimated: 'estimated' };
    const about = energyText(kcal, energyUnit);
    if (resolved.status === 'current') {
      const w = Number(memo?.weightPoints) || weights.length;
      const f = Number(memo?.foodDaysLogged) || Number(intake?.daysLogged) || 0;
      return {
        state: 'current',
        kcal,
        figure,
        // The memo's own counts (the rows it learned from), with no span claimed:
        // the authority's current weigh-ins are not the memo's rows (review S5).
        line: `About ${about} a day, estimated from ${plural(w, 'weigh-in', 'weigh-ins')} and food logged on ${f} of the last ${MAINTENANCE_FOOD_WINDOW_DAYS} days.`,
      };
    }
    if (resolved.status === 'revalidating') {
      return {
        state: 'rechecking',
        kcal,
        figure,
        line: `Earlier estimate, about ${about} a day, being rechecked against your newer weigh-ins and food.`,
      };
    }
    const asOf = shortDateOfMs(Number(resolved.asOf));
    return {
      state: 'held',
      kcal,
      figure,
      line: `Earlier estimate, about ${about} a day${asOf ? `, from your logs up to ${asOf}` : ''}.`,
    };
  }
  // Not ready: the days counted against the contract's own thresholds.
  // The true counts (rule 7.0.4: the number judged is the number shown).
  const weighDays = weights.length;
  const foodDays = Number(intake?.daysLogged) || 0;
  const newest = weights.length ? Number(weights[weights.length - 1].loggedAt) : NaN;
  const stale = Number.isFinite(newest) && newest < nowMs - MAINTENANCE_WEIGH_IN_FRESH_DAYS * DAY_MS;
  const weighClause = stale
    ? `a weigh-in from the last ${MAINTENANCE_WEIGH_IN_FRESH_DAYS} days`
    : `${MAINTENANCE_MIN_WEIGH_IN_DAYS} weigh-ins`;
  // Both thresholds met with no memo yet: the estimate is learned by the
  // coaching run (learnEffectiveMaintenanceForUser, CoachOutputScreen), so
  // the line says that, never "you have 14 of 14" and "not ready" at once.
  // Only what is outstanding is asked for (closing review S5), and the
  // sentence names its subject (founder, 2026-10-02: a bare "it" is not
  // understandable English): "Working out your maintenance calories needs ...".
  const weighMet = !stale && weighDays >= MAINTENANCE_MIN_WEIGH_IN_DAYS;
  const foodMet = foodDays >= MAINTENANCE_MIN_FOOD_DAYS;
  const needs = 'Working out your maintenance calories needs';
  const foodNeeds = `food logged on ${MAINTENANCE_MIN_FOOD_DAYS} of the last ${MAINTENANCE_FOOD_WINDOW_DAYS} days`;
  const foodSoFar = `${plural(foodDays, 'day', 'days')} of logged food`;
  const weighSoFar = plural(weighDays, 'weigh-in', 'weigh-ins');
  let line;
  if (weighMet && foodMet) {
    line = `Not ready yet. You have the ${MAINTENANCE_MIN_WEIGH_IN_DAYS} weigh-ins and the food logged on ${MAINTENANCE_MIN_FOOD_DAYS} of the last ${MAINTENANCE_FOOD_WINDOW_DAYS} days; your maintenance calories are worked out the next time your coaching runs.`;
  } else if (weighMet) {
    line = `Not ready yet. ${needs} ${foodNeeds}. So far you have ${foodSoFar}; your ${weighSoFar} are enough.`;
  } else if (foodMet) {
    line = stale
      ? `Not ready yet. ${needs} ${weighClause}. Your last weigh-in is older than that; your food log is enough.`
      : `Not ready yet. ${needs} ${weighClause}. So far you have ${weighDays}; your food log is enough.`;
  } else {
    line = stale
      ? `Not ready yet. ${needs} ${weighClause} and ${foodNeeds}. Your last weigh-in is older than that, and so far you have ${foodSoFar}.`
      : `Not ready yet. ${needs} ${weighClause} and ${foodNeeds}. So far you have ${weighSoFar} and ${foodSoFar}.`;
  }
  return { state: 'building', kcal: null, figure: null, line };
}

/**
 * "Over the last 7 days you logged food on 3 days, averaging 1,625 kcal."
 * Null when no day was logged (nothing to average).
 */
export function intakeLine(intake, energyUnit = 'kcal') {
  const days = Number(intake?.daysLogged) || 0;
  if (days < 1 || !Number.isFinite(Number(intake?.avgKcal))) return null;
  return `Over the last ${MAINTENANCE_FOOD_WINDOW_DAYS} days you logged food on ${plural(days, 'day', 'days')}, averaging ${energyText(intake.avgKcal, energyUnit)}.`;
}

// ── History ──

/** "Week of 15 Sep · average 82.3 kg · 5 weigh-ins" ("average so far" on the open week). */
export function weekGroupHeader({ weekStartMs, count, averageKg, open, bwu = 'st', withholdAverage = false }) {
  const head = `Week of ${shortDate(localDayKey(weekStartMs))}`;
  if (!(count > 0)) return `${head} · no weigh-ins`;
  // Under calm mode or an open flag a run of weekly averages is a trend to
  // read, so the header keeps the count only (review N1, the Q2 precedent).
  if (withholdAverage) return `${head} · ${plural(count, 'weigh-in', 'weigh-ins')}`;
  return `${head} · average${open ? ' so far' : ''} ${formatBodyWeight(averageKg, bwu)} · ${plural(count, 'weigh-in', 'weigh-ins')}`;
}

/** The note a row shows: the setup marker reads as what it is, anything else as typed. */
export function noteForDisplay(entry) {
  const note = typeof entry?.notes === 'string' ? entry.notes.trim() : '';
  if (!note) return '';
  return note === 'enrolment' ? 'Starting weight from setup' : note;
}

/** "Tue 16 Sep · 82.5 kg", or the day and what it holds when there is no weight. */
export function historyRowTitle(entry, bwu = 'st') {
  const day = weekdayDate(entry?.metric_date);
  if (Number(entry?.body_weight) > 0) return `${day} · ${formatBodyWeight(entry.body_weight, bwu)}`;
  return `${day} · Measurements`;
}

/**
 * The figures a row carries beside its weight: body fat and the sites, with
 * their units, the first three and a count of the rest.
 */
export function historyRowDetail(entry, siteLabels = {}, max = 3) {
  const parts = [];
  if (Number(entry?.body_fat) > 0) parts.push(`Body fat ${trimDecimals(entry.body_fat, 1)}%`);
  for (const [key, label] of Object.entries(siteLabels)) {
    if (Number(entry?.[key]) > 0) parts.push(`${label} ${trimDecimals(entry[key], 1)} cm`);
  }
  if (parts.length <= max) return parts.join(', ');
  return `${parts.slice(0, max).join(', ')} and ${parts.length - max} more`;
}

/**
 * Said under the form before saving when the chosen day already holds a
 * weigh-in: "This replaces today's 7:02 weigh-in of 82.4 kg."
 * @param {object} p
 * @param {object} p.existing  the day's entry
 * @param {string} p.todayKey
 * @param {'st'|'kg'|'lbs'} [p.bwu]
 */
export function replaceNotice({ existing, todayKey, bwu = 'st' }) {
  if (!existing || !(Number(existing.body_weight) > 0)) return null;
  const weight = formatBodyWeight(existing.body_weight, bwu);
  const at = Number(existing.loggedAt);
  // A time of exactly local midnight is a date-only stamp, not a time of day.
  const midnight = Number.isFinite(at) && new Date(at).getHours() === 0 && new Date(at).getMinutes() === 0;
  const time = Number.isFinite(at) && !midnight ? clockTime(at) : '';
  if (existing.metric_date === todayKey) {
    return `This replaces today's ${time ? `${time} ` : ''}weigh-in of ${weight}.`;
  }
  return `This replaces the ${time ? `${time} ` : ''}weigh-in of ${weight} on ${weekdayDate(existing.metric_date)}.`;
}

// ── Body fat and measurements ──

/** "Body fat 18%, 17 Sep, caliper" style detail pieces. */
export const BODY_FAT_METHOD_LABELS = Object.freeze({
  visual: 'best estimate', bia: 'smart scale (BIA)', caliper: 'caliper', dexa: 'DEXA scan', manual: 'typed in',
});

/**
 * The change against the previous reading with both dates:
 * "Down 2 cm from 86 cm on 3 Aug."; body fat reads from the earlier figure
 * ("Down from 19% on 3 Aug.", the row's own value beside it). Null without a
 * previous reading.
 * @param {{ value: number, metric_date: string }} latest
 * @param {?{ value: number, metric_date: string }} previous
 * @param {string} unit '%' (percentage points) or 'cm'
 */
export function readingChangeLine(latest, previous, unit) {
  if (!latest || !previous) return null;
  const diff = latest.value - previous.value;
  const when = `on ${shortDate(previous.metric_date)}`;
  if (unit === '%') {
    const pts = Math.abs(Math.round(diff * 10) / 10);
    if (pts === 0) return `Level with ${trimDecimals(previous.value, 1)}% ${when}.`;
    return `${diff < 0 ? 'Down' : 'Up'} from ${trimDecimals(previous.value, 1)}% ${when}.`;
  }
  const cm = Math.abs(Math.round(diff * 10) / 10);
  if (cm === 0) return `Level with ${trimDecimals(previous.value, 1)} cm ${when}.`;
  return `${diff < 0 ? 'Down' : 'Up'} ${trimDecimals(cm, 1)} cm from ${trimDecimals(previous.value, 1)} cm ${when}.`;
}

/** The (i) behind the measurement sites: how each is measured, so readings stay comparable. */
export const MEASURE_HOW_INFO = [
  'How each site is measured, so readings stay comparable from one day to the next.',
  'Every site is measured with a soft tape, snug but not tight, at about the same time of day.',
  'Chest: around the fullest part of the chest, arms relaxed at your sides.',
  'Shoulders: around the widest point, over the shoulders and upper chest.',
  'Arms (flexed): around the fullest part of the upper arm with the arm flexed.',
  'Forearms: around the thickest part, arm relaxed.',
  'Waist: around the narrowest part of the waist, or level with the navel if there is no clear narrowing.',
  'Hips: around the widest part of the hips.',
  'Quads: around the thigh, halfway between the hip and the knee.',
  'Hamstrings: around the back of the thigh at the same halfway point.',
  'Calves: around the fullest part of the calf, standing.',
].join(' ');
