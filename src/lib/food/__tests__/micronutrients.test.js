/**
 * micronutrients.test.js — MN-1 (audit §15 item 2).
 *
 * Pins the canonical nutrient list and the SQL fragments that drive every
 * foods/custom_foods call site, plus the "unknown, never 0" honesty rule. The
 * count invariants matter because a mismatch between the column fragment, the
 * bind placeholders and the value arrays would corrupt a live-DB insert (there
 * is no in-memory SQLite harness in this repo; CRUD is exercised on device, so
 * these fragment counts are the cheap guard against a 27-column miscount).
 */
import fs from 'fs';
import path from 'path';
import {
  MICRONUTRIENTS, MICRO_COLUMNS,
  microSqlColumns, microSqlPlaceholders, microSqlUpsertExcluded,
  microValuesFromRow, microValuesFromInput,
  computeMicronutrientTotals, nrvPercent,
} from '../micronutrients';

const N = 27;

describe('micronutrients canonical list + SQL fragments', () => {
  test('there are exactly 27 UK-NRV nutrients, all with a positive NRV and a _100g column', () => {
    expect(MICRONUTRIENTS).toHaveLength(N);
    for (const n of MICRONUTRIENTS) {
      expect(n.column).toMatch(/_100g$/);
      expect(n.nrv).toBeGreaterThan(0);
      expect(['vitamin', 'mineral']).toContain(n.group);
      expect(['mg', 'µg']).toContain(n.unit);
    }
  });

  test('keys and columns are unique', () => {
    expect(new Set(MICRONUTRIENTS.map((n) => n.key)).size).toBe(N);
    expect(new Set(MICRO_COLUMNS).size).toBe(N);
  });

  test('SQL fragment counts all agree (the miscount guard)', () => {
    expect(MICRO_COLUMNS).toHaveLength(N);
    expect(microSqlColumns.split(',')).toHaveLength(N);
    expect(microSqlPlaceholders.split(',')).toHaveLength(N);
    expect((microSqlPlaceholders.match(/\?/g) || [])).toHaveLength(N);
    expect(microSqlUpsertExcluded.split(',')).toHaveLength(N);
    expect(microValuesFromInput({})).toHaveLength(N);
    expect(microValuesFromRow({})).toHaveLength(N);
  });

  test('value arrays default missing data to null, never 0', () => {
    expect(microValuesFromInput({}).every((v) => v === null)).toBe(true);
    expect(microValuesFromRow({}).every((v) => v === null)).toBe(true);
    // a provided value is kept in canonical column order
    const idxIron = MICRO_COLUMNS.indexOf('iron_100g');
    expect(microValuesFromInput({ iron: 3 })[idxIron]).toBe(3);
    expect(microValuesFromRow({ iron_100g: 3 })[idxIron]).toBe(3);
  });
});

describe('computeMicronutrientTotals — unknown, never 0', () => {
  test('no food carries a nutrient -> that nutrient is null (unknown)', () => {
    const { totals, coverage } = computeMicronutrientTotals([{ grams: 100, food: {} }]);
    expect(totals.iron).toBeNull();
    expect(coverage).toEqual({ withData: 0, total: N });
  });

  test('sums only foods that carry a value, scaled per-100g by grams', () => {
    const items = [
      { grams: 200, food: { iron_100g: 2 } }, // 4 mg
      { grams: 50, food: { iron_100g: 10 } }, // 5 mg
      { grams: 100, food: {} },               // contributes nothing (not 0)
    ];
    const { totals, coverage } = computeMicronutrientTotals(items);
    expect(totals.iron).toBe(9);
    expect(totals.calcium).toBeNull();
    expect(coverage.withData).toBe(1);
  });

  test('nrvPercent is null when unknown and a rounded percent otherwise', () => {
    expect(nrvPercent('iron', null)).toBeNull();
    expect(nrvPercent('iron', 14)).toBe(100); // NRV 14 mg
    expect(nrvPercent('vitC', 40)).toBe(50);  // NRV 80 mg
  });
});

describe('call sites bind the micro fragments consistently (source guard)', () => {
  const read = (p) => fs.readFileSync(path.join(__dirname, p), 'utf8');
  test('both custom_foods inserts in db.js use the micro columns AND placeholders', () => {
    const src = read('../db.js');
    // Two INSERT INTO custom_foods statements, each must carry both fragments.
    const inserts = src.split('INSERT INTO custom_foods').slice(1);
    expect(inserts.length).toBeGreaterThanOrEqual(2);
    for (const stmt of inserts) {
      const head = stmt.slice(0, 800);
      expect(head).toContain('${microSqlColumns}');
      expect(head).toContain('${microSqlPlaceholders}');
    }
  });

  test('the foods library upsert binds the micro columns AND placeholders', () => {
    const src = read('../libraryDelta.js');
    const head = src.slice(src.indexOf('INSERT INTO foods'), src.indexOf('INSERT INTO foods') + 900);
    expect(head).toContain('${microSqlColumns}');
    expect(head).toContain('${microSqlPlaceholders}');
  });
});
