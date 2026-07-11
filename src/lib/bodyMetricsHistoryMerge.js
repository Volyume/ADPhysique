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
