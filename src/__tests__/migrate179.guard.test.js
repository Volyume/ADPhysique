/**
 * migrate179.guard.test.js - the tooling tables get Row-Level Security.
 *
 * What this suite pins and why: Supabase's advisor flagged the two
 * migration-tooling ledgers (`claude_schema_migrations`, `claude_seed_files`)
 * as publicly accessible (rls_disabled_in_public; the founder's Supabase
 * email of 19 Sep 2026; proposals item 11). This guard keeps the fix
 * exactly what it is: RLS enabled on those two tables and nothing else,
 * the client roles revoked, every statement idempotent, no data touched,
 * and the file recorded as written and not applied until the founder's
 * phrase.
 */
const fs = require('fs');
const path = require('path');

const SQL = fs.readFileSync(path.join(__dirname, '../../supabase/migrate_179_tooling_tables_rls.sql'), 'utf8');
const README = fs.readFileSync(path.join(__dirname, '../../supabase/README.md'), 'utf8');
const CODE = SQL.replace(/^\s*--.*$/gm, '');

describe('migrate_179: the two tooling tables get RLS and lose their client-role grants', () => {
  test('header carries the house fields and the apply record', () => {
    for (const field of ['Purpose:', 'Applied locally:', 'Applied remotely:', 'Safe to re-run:', 'Rollback:', 'Depends on:']) {
      expect(SQL).toContain(field);
    }
    expect(SQL).toMatch(/YES - 2026-09-24 14:04 UTC \(written 2026-09-23\)/);
    expect(SQL).toContain('run against production');
  });

  test('RLS is enabled on exactly the two tooling tables, with IF EXISTS', () => {
    const enables = CODE.match(/ALTER TABLE IF EXISTS public\.(\w+) ENABLE ROW LEVEL SECURITY;/g) ?? [];
    expect(enables).toHaveLength(2);
    expect(CODE).toContain('ALTER TABLE IF EXISTS public.claude_schema_migrations ENABLE ROW LEVEL SECURITY;');
    expect(CODE).toContain('ALTER TABLE IF EXISTS public.claude_seed_files ENABLE ROW LEVEL SECURITY;');
    // No other table is touched.
    expect(CODE.match(/ALTER TABLE/g)).toHaveLength(2);
  });

  test('the client roles are revoked on both, guarded by to_regclass, and nothing is granted', () => {
    expect(CODE).toContain('REVOKE ALL ON TABLE public.claude_schema_migrations FROM PUBLIC, anon, authenticated;');
    expect(CODE).toContain('REVOKE ALL ON TABLE public.claude_seed_files FROM PUBLIC, anon, authenticated;');
    expect(CODE.match(/to_regclass\('public\.claude_(schema_migrations|seed_files)'\) IS NOT NULL/g)).toHaveLength(2);
    expect(CODE).not.toMatch(/\bGRANT\b/);
  });

  test('additive and idempotent: no policy, no drop, no truncate, no data statement', () => {
    expect(CODE).not.toMatch(/CREATE POLICY/i);
    expect(CODE).not.toMatch(/DROP\s/i);
    expect(CODE).not.toMatch(/\bTRUNCATE\b/i);
    expect(CODE).not.toMatch(/\b(INSERT|UPDATE|DELETE)\b/i);
    expect(CODE).not.toMatch(/DISABLE ROW LEVEL SECURITY/);
  });

  test('the README ledger registers 179 as applied', () => {
    expect(README).toContain('| 179 | `migrate_179_tooling_tables_rls.sql` |');
    const row = README.split('\n').find((l) => l.startsWith('| 179 |')) ?? '';
    expect(row).toMatch(/\*\*APPLIED 2026-09-24 14:04 UTC\*\*/);
  });
});
