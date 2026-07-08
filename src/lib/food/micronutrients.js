/**
 * micronutrients.js — MN-1 (audit §15 item 2, founder-approved full build 2026-07-08).
 *
 * The single source of truth for the vitamin/mineral set VOLYUME tracks. Every
 * downstream piece (SQLite columns, the Supabase migration, sync mapping,
 * resolve/log wiring, the diary panel) is driven from MICRONUTRIENTS so the 27
 * nutrients stay identical everywhere and adding one is a one-line change.
 *
 * Reference values are UK/EU NRVs (Nutrient Reference Values, EU Reg 1169/2011
 * Annex XIII, retained in UK law) — the same daily reference a UK food label
 * uses. They are per-day totals, not per-100g.
 *
 * HONESTY (blueprint MN-1 "unknown not 0"): a food with no value for a nutrient
 * contributes nothing and is not counted as zero. A day total is only shown for
 * a nutrient when at least one logged food carries a value for it; otherwise the
 * nutrient reads "unknown", and `coverage` reports how complete the day is.
 */

// Ordered, grouped. `column` is the per-100g SQLite/Postgres column; `unit` is
// the display unit for both the amount and its NRV.
export const MICRONUTRIENTS = [
  // Vitamins (13)
  { key: 'vitA', column: 'vit_a_100g', label: 'Vitamin A', unit: 'µg', nrv: 800, group: 'vitamin' },
  { key: 'vitD', column: 'vit_d_100g', label: 'Vitamin D', unit: 'µg', nrv: 5, group: 'vitamin' },
  { key: 'vitE', column: 'vit_e_100g', label: 'Vitamin E', unit: 'mg', nrv: 12, group: 'vitamin' },
  { key: 'vitK', column: 'vit_k_100g', label: 'Vitamin K', unit: 'µg', nrv: 75, group: 'vitamin' },
  { key: 'vitC', column: 'vit_c_100g', label: 'Vitamin C', unit: 'mg', nrv: 80, group: 'vitamin' },
  { key: 'thiamin', column: 'thiamin_100g', label: 'Thiamin (B1)', unit: 'mg', nrv: 1.1, group: 'vitamin' },
  { key: 'riboflavin', column: 'riboflavin_100g', label: 'Riboflavin (B2)', unit: 'mg', nrv: 1.4, group: 'vitamin' },
  { key: 'niacin', column: 'niacin_100g', label: 'Niacin (B3)', unit: 'mg', nrv: 16, group: 'vitamin' },
  { key: 'vitB6', column: 'vit_b6_100g', label: 'Vitamin B6', unit: 'mg', nrv: 1.4, group: 'vitamin' },
  { key: 'folate', column: 'folate_100g', label: 'Folate', unit: 'µg', nrv: 200, group: 'vitamin' },
  { key: 'vitB12', column: 'vit_b12_100g', label: 'Vitamin B12', unit: 'µg', nrv: 2.5, group: 'vitamin' },
  { key: 'biotin', column: 'biotin_100g', label: 'Biotin', unit: 'µg', nrv: 50, group: 'vitamin' },
  { key: 'pantothenic', column: 'pantothenic_100g', label: 'Pantothenic acid (B5)', unit: 'mg', nrv: 6, group: 'vitamin' },
  // Minerals (14). Sodium is already tracked (sodium_100g) and stays there.
  { key: 'potassium', column: 'potassium_100g', label: 'Potassium', unit: 'mg', nrv: 2000, group: 'mineral' },
  { key: 'chloride', column: 'chloride_100g', label: 'Chloride', unit: 'mg', nrv: 800, group: 'mineral' },
  { key: 'calcium', column: 'calcium_100g', label: 'Calcium', unit: 'mg', nrv: 800, group: 'mineral' },
  { key: 'phosphorus', column: 'phosphorus_100g', label: 'Phosphorus', unit: 'mg', nrv: 700, group: 'mineral' },
  { key: 'magnesium', column: 'magnesium_100g', label: 'Magnesium', unit: 'mg', nrv: 375, group: 'mineral' },
  { key: 'iron', column: 'iron_100g', label: 'Iron', unit: 'mg', nrv: 14, group: 'mineral' },
  { key: 'zinc', column: 'zinc_100g', label: 'Zinc', unit: 'mg', nrv: 10, group: 'mineral' },
  { key: 'copper', column: 'copper_100g', label: 'Copper', unit: 'mg', nrv: 1, group: 'mineral' },
  { key: 'manganese', column: 'manganese_100g', label: 'Manganese', unit: 'mg', nrv: 2, group: 'mineral' },
  { key: 'fluoride', column: 'fluoride_100g', label: 'Fluoride', unit: 'mg', nrv: 3.5, group: 'mineral' },
  { key: 'selenium', column: 'selenium_100g', label: 'Selenium', unit: 'µg', nrv: 55, group: 'mineral' },
  { key: 'chromium', column: 'chromium_100g', label: 'Chromium', unit: 'µg', nrv: 40, group: 'mineral' },
  { key: 'molybdenum', column: 'molybdenum_100g', label: 'Molybdenum', unit: 'µg', nrv: 50, group: 'mineral' },
  { key: 'iodine', column: 'iodine_100g', label: 'Iodine', unit: 'µg', nrv: 150, group: 'mineral' },
];

// The per-100g column names, in canonical order. Drives schema + wiring.
export const MICRO_COLUMNS = MICRONUTRIENTS.map((n) => n.column);

// SQL type is uniform: nullable REAL per-100g (null = unknown, never 0).
export const MICRO_COLUMN_SQL_TYPE = 'REAL';

/**
 * Build the "col REAL" fragments for a CREATE TABLE body (no leading comma).
 * @returns {string} e.g. "vit_a_100g REAL,\n      vit_d_100g REAL, ..."
 */
export function microColumnsCreateFragment(indent = '      ') {
  return MICRO_COLUMNS.map((c) => `${c} ${MICRO_COLUMN_SQL_TYPE}`).join(`,\n${indent}`);
}

/**
 * Sum each micronutrient across a day's logged foods, per-100g scaled by grams.
 * Honest coverage: a nutrient total is null ("unknown") unless at least one
 * food carried a value for it; foods lacking it are simply not counted (never
 * treated as 0). Returns totals keyed by nutrient key plus a coverage summary.
 *
 * @param {Array<{ grams:number, food:object }>} items each food is a per-100g row
 * @returns {{ totals: Object, coverage: { withData:number, total:number } }}
 */
export function computeMicronutrientTotals(items) {
  const totals = {};
  let nutrientsWithAnyData = 0;
  for (const n of MICRONUTRIENTS) {
    let sum = 0;
    let anyKnown = false;
    for (const it of items || []) {
      const per100 = it?.food?.[n.column];
      const grams = Number(it?.grams);
      if (per100 == null || !Number.isFinite(Number(per100)) || !Number.isFinite(grams)) continue;
      sum += (Number(per100) * grams) / 100;
      anyKnown = true;
    }
    totals[n.key] = anyKnown ? Math.round(sum * 100) / 100 : null; // null = unknown
    if (anyKnown) nutrientsWithAnyData += 1;
  }
  return { totals, coverage: { withData: nutrientsWithAnyData, total: MICRONUTRIENTS.length } };
}

/**
 * Percent of the UK NRV a day total represents, or null when unknown.
 */
export function nrvPercent(key, amount) {
  const n = MICRONUTRIENTS.find((m) => m.key === key);
  if (!n || amount == null || !Number.isFinite(Number(amount))) return null;
  return Math.round((Number(amount) / n.nrv) * 100);
}

// ── SQL fragments (keep every foods/custom_foods call site identical) ──────────
// Column list for SELECT/INSERT: "vit_a_100g, vit_d_100g, ..."
export const microSqlColumns = MICRO_COLUMNS.join(', ');
// Bind placeholders matching microSqlColumns: "?, ?, ..."
export const microSqlPlaceholders = MICRO_COLUMNS.map(() => '?').join(', ');
// UPSERT set-list: "vit_a_100g = excluded.vit_a_100g, ..."
export const microSqlUpsertExcluded = MICRO_COLUMNS.map((c) => `${c} = excluded.${c}`).join(', ');

/**
 * Bind values from a snake_case DB row (cloud custom-food upsert, library pull),
 * in microSqlColumns order. `num` normalises each value (default: pass-through,
 * null-safe). A missing column stays null (unknown), never 0.
 */
export function microValuesFromRow(row, num = (v) => (v == null ? null : v)) {
  return MICRO_COLUMNS.map((c) => num(row?.[c] ?? null));
}

/**
 * Bind values from a custom-food input carrying a `.micros` object keyed by
 * nutrient key (e.g. { vitC: 12, iron: 3 }), in microSqlColumns order. A missing
 * or non-finite value stays null (unknown), never 0.
 */
export function microValuesFromInput(micros) {
  return MICRONUTRIENTS.map((n) => {
    const v = micros?.[n.key];
    return v == null || !Number.isFinite(Number(v)) ? null : Number(v);
  });
}
