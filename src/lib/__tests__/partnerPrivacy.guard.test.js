/**
 * partnerPrivacy.guard.test.js
 *
 * The headline Training Partners guarantee (proposal §7): no weight, calorie,
 * macro, performance, PR, exercise, check-in, coaching or ED data can EVER be
 * shared with a partner. This is enforced by SCHEMA — those columns simply do
 * not exist on any member-readable table. This source-level guard fails the
 * build if such a column is ever added to the shared tables, or if the service
 * ever selects a forbidden field.
 *
 * Member-readable tables (migration 075): partner_members and
 * partner_weekly_signal. (partner_circles holds only a name/cap; partner_invites
 * and partner_nudges are not body/food/coaching carriers.)
 *
 * Matching is token-precise: column / field names are split on '_' and each
 * token is compared to the forbidden set, so legitimate identifiers like
 * `sharing_enabled` (contains "ean"/"ed") or `created_at` never false-trip.
 */

const fs = require('fs');
const path = require('path');

const SQL = fs.readFileSync(
  path.resolve(__dirname, '../../../supabase/migrate_075_training_partners.sql'),
  'utf8',
);
const SERVICE = fs.readFileSync(
  path.resolve(__dirname, '../partners/partnerService.js'),
  'utf8',
);

// Forbidden CONCEPTS, compared against underscore-split tokens of a field name.
const FORBIDDEN = new Set([
  'weight', 'kg', 'kgs', 'calorie', 'calories', 'kcal', 'macro', 'macros',
  'protein', 'carb', 'carbs', 'fat', 'fats', 'bodyfat', 'ffm', 'lbm',
  'performance', 'pr', 'prs', 'onerep', 'exercise', 'exercises', 'checkin',
  'coach', 'coaching', 'adjustment', 'rir', 'rpe', 'tonnage', 'volume',
  'safety', 'rapid', 'floor', 'calories',
]);

const tokens = (name) => name.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
const offending = (name) => tokens(name).filter(t => FORBIDDEN.has(t));

// Extract column names from a CREATE TABLE block: lines whose first identifier
// is followed by a known column type.
function columnsOf(table) {
  const start = SQL.indexOf(`CREATE TABLE IF NOT EXISTS public.${table}`);
  if (start === -1) return [];
  const block = SQL.slice(start, SQL.indexOf(');', start));
  const cols = [];
  for (const line of block.split('\n')) {
    const m = line.match(/^\s+([a-z_]+)\s+(uuid|text|int|boolean|timestamptz|date|bytea)\b/);
    if (m) cols.push(m[1]);
  }
  return cols;
}

describe('Training Partners shares no body/food/coaching data (schema guard)', () => {
  test.each(['partner_members', 'partner_weekly_signal'])(
    '%s carries no forbidden column',
    (table) => {
      const cols = columnsOf(table);
      expect(cols.length).toBeGreaterThan(0);
      for (const col of cols) {
        expect({ col, hits: offending(col) }).toEqual({ col, hits: [] });
      }
    },
  );

  test('the service never selects a forbidden field', () => {
    const selects = [...SERVICE.matchAll(/\.select\(\s*['"`]([^'"`]*)['"`]/g)].map(m => m[1]);
    expect(selects.length).toBeGreaterThan(0);
    for (const sel of selects) {
      for (const field of sel.split(',')) {
        const name = field.trim();
        if (!name) continue;
        expect({ name, hits: offending(name) }).toEqual({ name, hits: [] });
      }
    }
  });
});
