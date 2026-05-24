/**
 * CSV export formatter tests.
 *
 * Pure formatter only — no I/O. Locks the header row, the escape
 * rules, and the food-lookup miss fallback (food_ref appears in
 * the food column).
 */
jest.mock('expo-file-system', () => ({ cacheDirectory: '/tmp/', writeAsStringAsync: jest.fn(), EncodingType: { UTF8: 'utf8' } }));
jest.mock('expo-sharing', () => ({ isAvailableAsync: async () => false, shareAsync: jest.fn() }));
jest.mock('../food/sources/localCache', () => ({ resolveFoodRef: async () => null }));

import { buildDiaryCsv } from '../food/csvExport';

describe('buildDiaryCsv', () => {
  test('emits the header row first', () => {
    const csv = buildDiaryCsv([], new Map());
    expect(csv).toBe('date,meal,food,brand,quantity_g,kcal,protein_g,carbs_g,fat_g,fibre_g');
  });

  test('joins entries with newlines and resolves the food name from the lookup', () => {
    const lookup = new Map([
      ['global:abc', { name: 'Chicken breast', brand: 'Tesco' }],
    ]);
    const entries = [{
      entry_date: '2026-05-23',
      meal_slot: 'lunch',
      food_ref: 'global:abc',
      quantity_g: 150,
      kcal: 248,
      protein_g: 46,
      carbs_g: 0,
      fat_g: 5.4,
      fibre_g: 0,
    }];
    const csv = buildDiaryCsv(entries, lookup);
    const lines = csv.split('\n');
    expect(lines).toHaveLength(2);
    expect(lines[1]).toBe('2026-05-23,lunch,Chicken breast,Tesco,150,248,46,0,5.4,0');
  });

  test('falls back to food_ref when the lookup misses', () => {
    const entries = [{
      entry_date: '2026-05-22', meal_slot: 'snack', food_ref: 'custom:xyz',
      quantity_g: 30, kcal: 100, protein_g: 1, carbs_g: 20, fat_g: 0, fibre_g: null,
    }];
    const csv = buildDiaryCsv(entries, new Map());
    const lines = csv.split('\n');
    expect(lines[1]).toBe('2026-05-22,snack,custom:xyz,,30,100,1,20,0,');
  });

  test('quotes values that contain commas, quotes, or newlines', () => {
    const lookup = new Map([
      ['global:1', { name: 'Beans, baked', brand: 'Heinz "classic"' }],
    ]);
    const entries = [{
      entry_date: '2026-05-21', meal_slot: 'dinner', food_ref: 'global:1',
      quantity_g: 200, kcal: 156, protein_g: 9, carbs_g: 26, fat_g: 0.5, fibre_g: 7,
    }];
    const csv = buildDiaryCsv(entries, lookup);
    expect(csv).toContain('"Beans, baked"');
    expect(csv).toContain('"Heinz ""classic"""');
  });

  test('renders an empty fibre cell when the entry has no fibre value', () => {
    const entries = [{
      entry_date: '2026-05-20', meal_slot: 'breakfast', food_ref: 'global:a',
      quantity_g: 40, kcal: 150, protein_g: 5, carbs_g: 27, fat_g: 3, fibre_g: null,
    }];
    const csv = buildDiaryCsv(entries, new Map());
    const lastCell = csv.split('\n')[1].split(',').pop();
    expect(lastCell).toBe('');
  });
});
