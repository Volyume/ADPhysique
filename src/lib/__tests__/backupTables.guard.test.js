/**
 * backupTables.guard.test.js — source guard on the free JSON backup's table
 * set (E10-F1a).
 *
 * What this pins and why: the free Settings > Your data backup is the one
 * self-service portability path a lapsed (free) user has for the data they
 * created during the Pro trial. The food tables are the user's own Article 9
 * health records; their absence from BACKUP_TABLES meant a lapsed user had
 * NO way to view or export 14 days of logged food (GDPR Article 20 exposure,
 * audit/e10-trial-lapse.md F1). This guard stops any of those tables quietly
 * falling back out, and keeps the reseedable shared `foods` library cache
 * (25k+ reference rows, not user data) OUT of the dump.
 *
 * Source-level by convention: importing database.js pulls expo-sqlite, and
 * the dump/restore pair is generic over the array (live-schema column
 * allowlist), so the array IS the behaviour.
 */
import fs from 'fs';
import path from 'path';

const DB = fs.readFileSync(path.resolve(__dirname, '../database.js'), 'utf8');

function backupTablesArray() {
  const start = DB.indexOf('export const BACKUP_TABLES = [');
  expect(start).toBeGreaterThan(-1);
  const end = DB.indexOf('];', start);
  return DB.slice(start, end);
}

describe('E10-F1a: the free backup carries the user-owned food domain', () => {
  const block = backupTablesArray();

  test.each([
    'food_entries', 'custom_foods', 'saved_meals', 'recipes',
    'recipe_ingredients', 'daily_water', 'food_favourites', 'meal_plans',
    'daily_intake_rollups',
  ])('%s is in BACKUP_TABLES', (table) => {
    expect(block).toContain(`'${table}'`);
  });

  test('the shared foods library cache stays OUT (reference data, not user data)', () => {
    expect(block).not.toMatch(/'foods'/);
  });

  test('the coaching history tables remain (morning weights, check-ins, coach outputs)', () => {
    for (const t of ['morning_weights', 'weekly_checkins', 'coach_outputs']) {
      expect(block).toContain(`'${t}'`);
    }
  });
});
