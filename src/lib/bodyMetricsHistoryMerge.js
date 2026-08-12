// BUG-WEIGHT-HISTORY (2026-07-11): pure helper, deliberately dependency-free
// (no React/React Native imports) so it's unit-testable without mounting
// BodyMetricsScreen (which pulls in react-native-svg via VolyumeChart).
//
// Root cause this fixes: Home's quick weigh-in widget
// (HomeScreen.handleLogWeight -> logMorningWeight) writes dated rows into
// morning_weights, a separate table from the body_metric_log rows
// BodyMetricsScreen's own "Log weight" form writes via logBodyMetric.
// getLatestBodyWeight (used for the CURRENT weight shown elsewhere, e.g.
// HomeScreen's stat tile) already reads both tables and picks the newest, so
// a Home quick-log correctly moves the CURRENT weight shown around the app.
// BodyMetricsScreen's History, though, only ever queried body_metric_log, so
// every weigh-in logged from Home was invisible there -- History looked
// frozen on whichever single body_metric_log row existed (often just the
// onboarding auto-seed), even as "current weight" kept updating underneath
// it from morning_weights.
import { localDayKey } from './dayKey';

// Shaped like BodyMetricsScreen's rowToEntry so it drops into the same
// history/trend/EWMA pipeline; measurement fields are always null since
// morning_weights only ever carries a weight + notes.
export function morningWeightToEntry(row) {
  return {
    id: row.id,
    metric_date: localDayKey(new Date(row.loggedAt ?? row.createdAt ?? Date.now()).getTime()),
    body_weight: row.weightKg ?? null,
    body_fat: null,
    chest: null, shoulders: null, arms: null, forearms: null,
    waist: null, hips: null, quads: null, hamstrings: null, calves: null,
    notes: row.notes ?? '',
    source: 'morning_weight',
  };
}

// bodyMetricEntries is already rowToEntry-shaped (most-recent-first, from
// getBodyMetricLog); morningRows is raw getMorningWeights() output
// (camelCase, may include soft-deleted or non-positive rows that a genuine
// weigh-in never produces). A calendar day that already has a
// body_metric_log entry is left exactly as-is, no field-merging, so one save
// never becomes two rows and edit/delete keep targeting the richer,
// user-editable record for that day (body_metric_log, via
// updateBodyMetric/deleteBodyMetric -- a merged-in morning_weights row has
// no body_metric_log id for those to target).
/**
 * The canonical weigh-in series, in the `{ weightKg, loggedAt }` shape the
 * coaching engine consumes.
 *
 * NOT THE SAFETY PATH. Do not wire this into the rapid-loss reader.
 *
 * It was written for finding X3 (cross-surface audit 2026-07-30), when a
 * weigh-in logged through BodyMetricsScreen's own form was invisible to the
 * ED-safety gates. Merging the two tables into the gate's input was tried,
 * and REVERTED (dd67bbf4) for crossing an ED-safety inviolable.
 *
 * That finding was then closed a different way, and the canonical law is:
 *
 *   RAPID-LOSS SAFETY READS THE CANONICAL `morning_weights` SERIES.
 *   A DELIBERATE POSITIVE WEIGHT ENTERED THROUGH BODY METRICS IS WRITTEN
 *   THROUGH INTO THAT CANONICAL SERIES AT ENTRY TIME.
 *
 * The write-through is the D90 founder ruling of 2026-08-06 (c569e00c),
 * live in `src/lib/database/bodyMetrics.js` and injected at
 * `database.js:104`. So the gate already sees every legitimate Body
 * Metrics weigh-in, WITHOUT `body_metric_log` becoming a second evidence
 * source. Measurements-only entries are bypassed; non-positive, invalid
 * and deleted entries stay excluded by the existing readers.
 *
 * Reading both tables HERE would therefore double-count nothing today but
 * would re-create the dual-source shape the revert and the source guard
 * (`CoachOutputScreen.morningWeightsSource.guard.test.js`) exist to
 * prevent. This function survives for non-safety history/trend use only.
 *
 * Open, deliberately NOT actioned (recorded 2026-08-12): a Body Metrics
 * weight entry does not by itself prove morning/fasted measurement
 * conditions. That is a measurement-provenance and UX question for its
 * own targeted decision, not something to resolve here.
 *
 * Dedupe is by calendar day, inherited from mergeMorningWeightsIntoHistory, so
 * a day recorded in both tables contributes once. Non-positive and
 * soft-deleted rows are dropped, matching computeEWMA's own guard.
 *
 * @param {Array} bodyMetricEntries - rowToEntry-shaped, from getBodyMetricLog
 * @param {Array} morningRows       - raw getMorningWeights() output
 * @returns {Array} [{ weightKg, loggedAt }] oldest-first
 */
export function buildWeighInSeries(bodyMetricEntries, morningRows) {
  const merged = mergeMorningWeightsIntoHistory(bodyMetricEntries, morningRows, Number.MAX_SAFE_INTEGER);
  return merged
    .map((e) => {
      const weightKg = Number(e.body_weight);
      if (!Number.isFinite(weightKg) || weightKg <= 0) return null;
      // metric_date is a local day key; anchor at local midday so a timezone
      // shift can never move a reading across a day boundary.
      const [y, m, d] = String(e.metric_date || '').split('-').map(Number);
      if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null;
      const loggedAt = new Date(y, m - 1, d, 12, 0, 0, 0).getTime();
      if (!Number.isFinite(loggedAt)) return null;
      return { weightKg, loggedAt };
    })
    .filter(Boolean)
    .sort((a, b) => a.loggedAt - b.loggedAt);
}

export function mergeMorningWeightsIntoHistory(bodyMetricEntries, morningRows, limit = 50) {
  const daysWithBodyMetric = new Set(bodyMetricEntries.map(e => e.metric_date));
  const morningOnlyEntries = (morningRows || [])
    .filter(r => r && r.deletedAt == null && Number.isFinite(r.weightKg) && r.weightKg > 0)
    .map(morningWeightToEntry)
    .filter(e => !daysWithBodyMetric.has(e.metric_date));
  return [...bodyMetricEntries, ...morningOnlyEntries]
    .sort((a, b) => b.metric_date.localeCompare(a.metric_date))
    .slice(0, limit);
}
