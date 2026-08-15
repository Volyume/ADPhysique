/** Founder-gated migration audit. This suite reads SQL; it never executes it. */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..', '..');
const migrationPath = path.join(root, 'supabase', 'migrate_140_session_resolutions.sql');
const sql = fs.readFileSync(migrationPath, 'utf8');

test('session resolutions has one unambiguous migration number and tracker row', () => {
  const files = fs.readdirSync(path.join(root, 'supabase'))
    .filter((name) => /^migrate_140_.*\.sql$/.test(name));
  expect(files).toEqual(['migrate_140_session_resolutions.sql']);
  expect(fs.existsSync(path.join(root, 'supabase', 'migrate_137_session_resolutions.sql'))).toBe(false);
  const tracker = fs.readFileSync(path.join(root, 'supabase', 'README.md'), 'utf8');
  expect(tracker).toMatch(/\| 140 \| `migrate_140_session_resolutions\.sql`/);
  expect(tracker).toMatch(/NO - PENDING/);
});

test('cloud uniqueness and values match the local explicit-resolution contract', () => {
  expect(sql).toMatch(/PRIMARY KEY \(user_id, id\)/);
  expect(sql).toMatch(/UNIQUE INDEX IF NOT EXISTS idx_session_resolutions_instance[\s\S]*user_id, mesocycle_week_id, routine_id/);
  expect(sql).toMatch(/CHECK \(resolution IN \('skipped_by_user', 'ended_early'\)\)/);
  expect(sql).not.toMatch(/'completed'/);
});

test('server LWW rejects stale arrival and defines deterministic ties/retries', () => {
  expect(sql).toMatch(/CREATE OR REPLACE FUNCTION public\._session_resolutions_refuse_stale/);
  expect(sql).toMatch(/IF NEW\.updated_at < OLD\.updated_at THEN\s+RETURN OLD/);
  expect(sql).toMatch(/IF NEW\.updated_at = OLD\.updated_at[\s\S]*NEW\.resolved_at[\s\S]*new_resolution_rank[\s\S]*RETURN OLD/);
  expect(sql).toMatch(/workout_id[\s\S]*COLLATE "C"[\s\S]*id COLLATE "C"/);
  expect(sql).toMatch(/BEFORE UPDATE ON public\.session_resolutions/);
});

test('RLS blocks cross-user rows and validates both owned parents', () => {
  expect(sql).toMatch(/ENABLE ROW LEVEL SECURITY/);
  expect(sql).toMatch(/USING \(auth\.uid\(\) = user_id\)/);
  expect(sql).toMatch(/WITH CHECK \([\s\S]*auth\.uid\(\) = user_id/);
  expect(sql).toMatch(/FROM public\.mesocycle_weeks mw[\s\S]*m\.user_id = auth\.uid\(\)/);
  expect(sql).toMatch(/FROM public\.routines r[\s\S]*r\.user_id = auth\.uid\(\)/);
});
