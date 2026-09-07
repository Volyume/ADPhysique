// GD-26 point 4 fixtures: seed-sql.mjs decides, from a migration file's own
// text (never by editing it), whether gym_venues already has a given
// column. Fixture text mirrors real CREATE TABLE shapes; also exercised
// against the actual migrate_162_gym_directory.sql to pin today's real
// answer (verification_status present, needs_review_reason absent).
const fs = require('node:fs');
const path = require('node:path');
const { extractGymVenuesTableBlock, gymVenuesHasColumn, gymVenuesHasAllColumns } = require('../lib/gymVenuesSchema');

const FIXTURE_SQL = `
CREATE TABLE IF NOT EXISTS public.gym_brands (
  id uuid PRIMARY KEY,
  key text
);

CREATE TABLE IF NOT EXISTS public.gym_venues (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name         text NOT NULL,
  verification_status  text NOT NULL DEFAULT 'unverified',
  needs_review         boolean NOT NULL DEFAULT false,
  source_count         int NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.gym_venue_history (
  id uuid PRIMARY KEY,
  venue_id uuid NOT NULL,
  needs_review_reason text -- a mention OUTSIDE the gym_venues block must not count
);
`;

describe('extractGymVenuesTableBlock', () => {
  it('extracts only the gym_venues column-definition body', () => {
    const block = extractGymVenuesTableBlock(FIXTURE_SQL);
    expect(block).toContain('verification_status');
    expect(block).toContain('needs_review');
    expect(block).not.toContain('gym_venue_history');
    expect(block).not.toContain('gym_brands');
  });

  it('returns an empty string when no gym_venues table is present', () => {
    expect(extractGymVenuesTableBlock('CREATE TABLE public.other (id uuid);')).toBe('');
    expect(extractGymVenuesTableBlock('')).toBe('');
    expect(extractGymVenuesTableBlock(null)).toBe('');
  });
});

describe('gymVenuesHasColumn (fixture)', () => {
  it('finds a column declared in the gym_venues block', () => {
    expect(gymVenuesHasColumn(FIXTURE_SQL, 'verification_status')).toBe(true);
    expect(gymVenuesHasColumn(FIXTURE_SQL, 'needs_review')).toBe(true);
    expect(gymVenuesHasColumn(FIXTURE_SQL, 'source_count')).toBe(true);
  });

  it('does not find a column that only appears in a DIFFERENT table (gym_venue_history)', () => {
    expect(gymVenuesHasColumn(FIXTURE_SQL, 'needs_review_reason')).toBe(false);
  });

  it('does not find a column that is not declared anywhere', () => {
    expect(gymVenuesHasColumn(FIXTURE_SQL, 'does_not_exist')).toBe(false);
  });

  it('a "needs_review" fixture column does not falsely match a "needs_review_reason" query (word-boundary correctness)', () => {
    const sql = `CREATE TABLE IF NOT EXISTS public.gym_venues (\n  needs_review boolean\n);`;
    expect(gymVenuesHasColumn(sql, 'needs_review_reason')).toBe(false);
    expect(gymVenuesHasColumn(sql, 'needs_review')).toBe(true);
  });
});

describe('gymVenuesHasAllColumns (fixture)', () => {
  it('is true only when every named column is present', () => {
    expect(gymVenuesHasAllColumns(FIXTURE_SQL, ['verification_status', 'needs_review'])).toBe(true);
    expect(gymVenuesHasAllColumns(FIXTURE_SQL, ['verification_status', 'needs_review_reason'])).toBe(false);
  });
});

describe('against the real migrate_162_gym_directory.sql', () => {
  const migrationPath = path.join(__dirname, '../../../supabase/migrate_162_gym_directory.sql');
  const sql = fs.existsSync(migrationPath) ? fs.readFileSync(migrationPath, 'utf8') : null;
  const maybeIt = sql ? it : it.skip;

  maybeIt('has verification_status but not needs_review_reason (GD-26 point 4 fallback applies today)', () => {
    expect(gymVenuesHasColumn(sql, 'verification_status')).toBe(true);
    expect(gymVenuesHasColumn(sql, 'needs_review')).toBe(true);
    expect(gymVenuesHasColumn(sql, 'needs_review_reason')).toBe(false);
    expect(gymVenuesHasAllColumns(sql, ['verification_status', 'needs_review_reason'])).toBe(false);
  });
});
