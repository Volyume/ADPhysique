/**
 * nutrientSummary.test.js — pure, adherence-neutral daily macro averages over a
 * window of rollups (build gap #18). Macro-level only (P/C/F/fibre); the rollup
 * carries no sodium/sugar so those are intentionally absent.
 */
import { summariseNutrients, NUTRIENT_ROWS } from '../nutrientSummary';

const day = (over) => ({
  entry_date: '2026-06-20',
  kcal_total: 0,
  protein_g: 0,
  carbs_g: 0,
  fat_g: 0,
  fibre_g: 0,
  entries_count: 1,
  ...over,
});

describe('summariseNutrients', () => {
  test('averages each macro over N logged days, rounded to whole grams', () => {
    const rollups = [
      day({ protein_g: 100, carbs_g: 200, fat_g: 60, fibre_g: 20 }),
      day({ protein_g: 200, carbs_g: 100, fat_g: 80, fibre_g: 40 }),
    ];
    const { days, avg } = summariseNutrients(rollups);
    expect(days).toBe(2);
    expect(avg).toEqual({ proteinG: 150, carbsG: 150, fatG: 70, fibreG: 30 });
  });

  test('rounds the mean to whole grams', () => {
    const rollups = [
      day({ protein_g: 100 }),
      day({ protein_g: 101 }),
      day({ protein_g: 100 }),
    ];
    // 301 / 3 = 100.33 -> 100
    expect(summariseNutrients(rollups).avg.proteinG).toBe(100);
  });

  test('skips unlogged days (entries_count 0) — they never dilute the average', () => {
    const rollups = [
      day({ protein_g: 150, entries_count: 3 }),
      day({ protein_g: 0, entries_count: 0 }), // logged nothing this day
    ];
    const { days, avg } = summariseNutrients(rollups);
    expect(days).toBe(1);
    expect(avg.proteinG).toBe(150);
  });

  test('empty input -> days 0 and every average 0', () => {
    expect(summariseNutrients([])).toEqual({
      days: 0,
      avg: { proteinG: 0, carbsG: 0, fatG: 0, fibreG: 0 },
    });
  });

  test('no logged days in the window -> zeros', () => {
    const rollups = [day({ entries_count: 0 }), day({ entries_count: 0 })];
    expect(summariseNutrients(rollups)).toEqual({
      days: 0,
      avg: { proteinG: 0, carbsG: 0, fatG: 0, fibreG: 0 },
    });
  });

  test('missing / non-finite fields are tolerated as 0, day still counts', () => {
    const rollups = [
      // fibre_g absent entirely, fat_g a NaN — both contribute 0, not a crash.
      { protein_g: 120, carbs_g: 180, fat_g: NaN, entries_count: 2 },
      { protein_g: 80, carbs_g: 220, fat_g: 70, fibre_g: 30, entries_count: 1 },
    ];
    const { days, avg } = summariseNutrients(rollups);
    expect(days).toBe(2);
    expect(avg.proteinG).toBe(100); // (120 + 80) / 2
    expect(avg.carbsG).toBe(200); // (180 + 220) / 2
    expect(avg.fatG).toBe(35); // (0 + 70) / 2
    expect(avg.fibreG).toBe(15); // (0 + 30) / 2
  });

  test('tolerates non-object junk and null entries in the array', () => {
    const rollups = [null, undefined, 42, 'x', day({ protein_g: 90 })];
    const { days, avg } = summariseNutrients(rollups);
    expect(days).toBe(1);
    expect(avg.proteinG).toBe(90);
  });

  test('non-array input -> zeros', () => {
    expect(summariseNutrients(null).days).toBe(0);
    expect(summariseNutrients(undefined).days).toBe(0);
  });

  test('macro-level only: no sodium / sugar / micronutrient keys leak in', () => {
    const { avg } = summariseNutrients([day({ protein_g: 100 })]);
    expect(Object.keys(avg).sort()).toEqual(['carbsG', 'fatG', 'fibreG', 'proteinG']);
    expect(avg.sodiumMg).toBeUndefined();
    expect(avg.sugarG).toBeUndefined();
  });

  test('NUTRIENT_ROWS lists exactly the four averaged macros, in order', () => {
    expect(NUTRIENT_ROWS.map((r) => r.key)).toEqual(['proteinG', 'carbsG', 'fatG', 'fibreG']);
  });
});
