/**
 * nutrientSummary - pure, adherence-NEUTRAL daily nutrient averages over a
 * window of per-day rollups (build gap #18, food insights nutrient breakdown).
 *
 * MACRO-LEVEL ONLY: protein, carbs, fat, fibre. The daily_intake_rollups row
 * (db.js recomputeRollup) carries kcal_total / protein_g / carbs_g / fat_g /
 * fibre_g / entries_count only — there is NO sodium_mg or sugar_g on the
 * rollup, so this helper does not compute them. No micronutrients (gated).
 *
 * This is a factual average, never a good/bad judgement: it returns plain
 * numbers, no colour, no target comparison, no streak. The caller renders
 * them in neutral copy ("Protein 146 g/day"). This neutrality is an ED-safety
 * requirement (see CLAUDE.md SAFETY SYSTEM), so this helper deliberately holds
 * no concept of a limit or a target.
 */

// The nutrient fields we average, mapped from the rollup's snake_case column
// to the camelCase key returned in `avg`. Macro-level only; extend ONLY if a
// field is genuinely present on the rollup shape (sodium/sugar are not).
const NUTRIENT_FIELDS = [
  { column: 'protein_g', key: 'proteinG' },
  { column: 'carbs_g', key: 'carbsG' },
  { column: 'fat_g', key: 'fatG' },
  { column: 'fibre_g', key: 'fibreG' },
];

function zeroAvg() {
  const avg = {};
  for (const f of NUTRIENT_FIELDS) avg[f.key] = 0;
  return avg;
}

function finite(v) {
  return Number.isFinite(v) ? v : 0;
}

/**
 * Average per LOGGED day for each tracked macro nutrient over the window.
 *
 * A "logged day" is a rollup with entries_count > 0 (the same convention the
 * insights screen uses everywhere). Days with no data, or rollups with no
 * entries, are skipped entirely — they neither contribute to the sum nor count
 * towards the divisor, so an unlogged day never drags an average towards a false
 * zero. The divisor is therefore the number of logged days, not the window
 * length.
 *
 * NaN-safe: a missing or non-finite nutrient field on a logged day contributes
 * 0 for that nutrient (the day still counts as logged). Empty input, or a
 * window with no logged days, returns days: 0 and every average at 0.
 *
 * @param {Array<object>} rollups - per-day rollup rows (kcal_total, protein_g,
 *   carbs_g, fat_g, fibre_g, entries_count). Order and completeness do not
 *   matter; non-objects are tolerated.
 * @returns {{ days: number, avg: { proteinG: number, carbsG: number, fatG: number, fibreG: number } }}
 *   `days` is the number of logged days averaged over; `avg` holds the mean
 *   grams/day for each macro, rounded to whole grams.
 */
export function summariseNutrients(rollups) {
  const list = Array.isArray(rollups) ? rollups : [];
  const sums = {};
  for (const f of NUTRIENT_FIELDS) sums[f.key] = 0;
  let days = 0;

  for (const r of list) {
    if (!r || typeof r !== 'object') continue;
    // Only days the user actually logged count towards the average.
    if (!(Number(r.entries_count) > 0)) continue;
    days += 1;
    for (const f of NUTRIENT_FIELDS) {
      sums[f.key] += finite(r[f.column]);
    }
  }

  if (days === 0) return { days: 0, avg: zeroAvg() };

  const avg = {};
  for (const f of NUTRIENT_FIELDS) {
    avg[f.key] = Math.round(sums[f.key] / days);
  }
  return { days, avg };
}

// The display order + labels for the nutrient rows. Exported so the screen
// renders exactly the macros this helper averages, in a stable order, without
// re-stating the field list. British English label copy.
export const NUTRIENT_ROWS = [
  { key: 'proteinG', label: 'Protein' },
  { key: 'carbsG', label: 'Carbs' },
  { key: 'fatG', label: 'Fat' },
  { key: 'fibreG', label: 'Fibre' },
];
