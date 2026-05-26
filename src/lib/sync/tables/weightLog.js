/**
 * weight_log per-table push + pull.
 *
 * weight_log is the same data as body_composition_log. The cloud
 * table is body_metrics; local SQLite is body_metric_log. Both
 * registry entries map to the same rows. body_composition_log
 * already owns the lift, so weight_log's handlers are intentional
 * no-ops that report count:0 / errors:0 to keep the per-table
 * loop totals honest without double-pushing every row.
 *
 * Listed in MIGRATED_TABLES so the registry survey shows
 * everything-on-transport rather than a stale "weight_log:
 * legacy" entry. If the locked spec is ever rewritten to give
 * weight_log its own cloud table this file is where the new
 * push/pull code lands.
 */

export async function pushWeightLog(_sb, _ctx) {
  return { count: 0, errors: 0, skipped: 'aliased_to_body_composition_log' };
}

export async function pullWeightLog(_sb, _ctx) {
  return { count: 0, errors: 0, skipped: 'aliased_to_body_composition_log' };
}
