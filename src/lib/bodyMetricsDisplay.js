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
import { kgToLbs } from './units';
import { localDayKey } from './dayKey';

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
