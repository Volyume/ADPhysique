/**
 * uploadOffToSupabase.test.js — MN-1 (item 16 data spike / D26 data
 * enhancement, 2026-07-10).
 *
 * Pins `toCloudRow()`'s micronutrient mapping: the cloud `foods` upsert row
 * carries the same 27 MICRO_COLUMNS as the local snapshot row, honest
 * null-vs-zero preserved (a snapshot row with no micronutrient data at all
 * uploads every column as null, not omitted or defaulted to 0), and the
 * column list itself never drifts from the canonical
 * src/lib/food/micronutrients.js list.
 *
 * uploadOffToSupabase.js is a plain Node CLI (no Babel/Metro), required
 * here via CommonJS; its `main()` is guarded behind `require.main ===
 * module`, so requiring it for these tests makes no network calls, reads no
 * file and touches no env vars.
 */
const { MICRO_COLUMNS: UPLOAD_MICRO_COLUMNS, toCloudRow } = require('../uploadOffToSupabase');
import { MICRO_COLUMNS } from '../../../src/lib/food/micronutrients';

describe('MICRO_COLUMNS — drift guard against src/lib/food/micronutrients.js', () => {
  test('exactly matches the canonical 27-column list', () => {
    expect([...UPLOAD_MICRO_COLUMNS].sort()).toEqual([...MICRO_COLUMNS].sort());
    expect(UPLOAD_MICRO_COLUMNS.length).toBe(27);
  });
});

describe('toCloudRow()', () => {
  const stamp = '2026-07-10T00:00:00.000Z';

  test('carries genuine micronutrient values from the snapshot row through unchanged', () => {
    const snapshotRow = {
      ean: '5900951313592', name: 'Twix', brand: 'Mars, Twix',
      kcal_100g: 493, protein_100g: 4.6, carbs_100g: 65, fat_100g: 24,
      calcium_100g: 35.731, potassium_100g: 75.285, pantothenic_100g: 0.113,
    };
    const cloudRow = toCloudRow(snapshotRow, stamp);
    expect(cloudRow.calcium_100g).toBe(35.731);
    expect(cloudRow.potassium_100g).toBe(75.285);
    expect(cloudRow.pantothenic_100g).toBe(0.113);
    expect(cloudRow.source).toBe('off');
    expect(cloudRow.source_id).toBe('5900951313592');
    expect(cloudRow.fetched_at).toBe(stamp);
  });

  test('every one of the 27 columns is present on the cloud row, defaulting to null (never 0 or undefined) when the snapshot row lacks it', () => {
    const snapshotRow = {
      ean: '1', name: 'Plain', kcal_100g: 100, protein_100g: 5, carbs_100g: 10, fat_100g: 2,
    };
    const cloudRow = toCloudRow(snapshotRow, stamp);
    for (const col of MICRO_COLUMNS) {
      expect(cloudRow).toHaveProperty(col);
      expect(cloudRow[col]).toBeNull();
    }
  });
});
