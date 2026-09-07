/**
 * migrate_163_community_place_and_finder.sql keeps the house migration
 * shape and security posture (SD-14, exactly as 160-162).
 *
 * WHAT THIS SUITE PINS, and why it is written to fail rather than to pass:
 * the file's mandatory header (purpose/push/pull/applied/safe-to-re-run/
 * rollback/GDPR); every statement re-runnable (ADD COLUMN IF NOT EXISTS,
 * the one new CHECK inside a duplicate_object-tolerant block, CREATE OR
 * REPLACE FUNCTION throughout, the two DROP-by-name blocks for the
 * signature changes); every function this file declares or re-issues is
 * SECURITY DEFINER with `search_path = public, pg_temp`, and EXECUTE is
 * granted to `authenticated` only for the client RPCs and to nobody for
 * any `_gyms_*`/`_community_*` helper; the two new client RPCs are
 * registered in the security matrix inventory; `community_find_people`
 * and `gyms_search`/`gyms_near` never return a numeric distance between
 * two PEOPLE (place reasons are fixed tokens, never a metre/mile number);
 * and no function in this file can ever write a caller-supplied `_lat`/
 * `_lng` into `community_profiles.place_lat`/`place_lng` (LJ-01: a place
 * is a public centroid a person CHOSE by text, never a device position).
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const MIGRATION = path.join(ROOT, 'supabase', 'migrate_163_community_place_and_finder.sql');
const SQL = fs.readFileSync(MIGRATION, 'utf8');

const CODE_LINES = SQL.split('\n').filter((l) => !l.trim().startsWith('--'));
const CODE = CODE_LINES.join('\n');
const HEADER = SQL.slice(0, SQL.indexOf('-- ─── Part 1'));

function declaredFunctions() {
  const out = [];
  const re = /CREATE OR REPLACE FUNCTION\s+public\.([a-z_0-9]+)\s*\(/g;
  let m;
  while ((m = re.exec(SQL)) !== null) {
    const name = m[1];
    const bodyStart = SQL.indexOf('AS $$', m.index);
    out.push({ name, header: SQL.slice(m.index, bodyStart === -1 ? m.index + 400 : bodyStart) });
  }
  return out;
}

function signatureList(revokeClause) {
  const at = SQL.indexOf(revokeClause);
  if (at === -1) return [];
  const arrayStart = SQL.lastIndexOf('FOREACH sig IN ARRAY ARRAY[', at);
  if (arrayStart === -1) return [];
  return [...SQL.slice(arrayStart, at).matchAll(/'([a-z_0-9\[\] .,]+\([^']*\))'/g)].map((m) => m[1]);
}

const HELPER_SIGNATURES = signatureList(
  "REVOKE ALL ON FUNCTION public.%s FROM PUBLIC, anon, authenticated'",
);
const RPC_SIGNATURES = signatureList("REVOKE ALL ON FUNCTION public.%s FROM PUBLIC, anon'");

const FUNCTIONS = declaredFunctions();
const NEW_RPCS = ['gyms_place_centroid', 'community_set_place'];
const REISSUED_RPCS = [
  'gyms_search', 'gyms_near', 'gyms_get', 'gyms_in_place', 'gyms_submit',
  'community_set_gyms', 'community_upsert_profile', 'community_find_people',
  'community_suggested_people', 'community_report',
];
const RPCS = FUNCTIONS.filter((f) => [...NEW_RPCS, ...REISSUED_RPCS].includes(f.name));
const HELPERS = FUNCTIONS.filter((f) => f.name.startsWith('_gyms_') || f.name.startsWith('_community_'));

describe('the mandatory header is present and honest', () => {
  test.each([
    ['Purpose', /^-- Purpose:/m],
    ['Push', /Push:/],
    ['Pull', /Pull:/],
    ['Applied locally', /^-- Applied locally:/m],
    ['Applied remotely', /^-- Applied remotely:/m],
    ['Safe to re-run', /^-- Safe to re-run:/m],
    ['Rollback', /^-- Rollback:/m],
    ['GDPR note', /^-- GDPR note:/m],
  ])('the header states %s', (_label, re) => {
    expect(HEADER).toMatch(re);
  });

  test('it names its authority document', () => {
    expect(HEADER).toContain('docs/community-product-audit-2026-09-07/');
    expect(HEADER).toContain('30-IMPLEMENTATION.md');
  });

  test('Applied remotely still says NO, awaiting the founder phrase', () => {
    expect(HEADER).toMatch(/Applied remotely:\s+NO/);
    expect(HEADER).toContain('run against production');
  });

  test('it records that it depends on 160, 161 and 162 and must never run before them', () => {
    expect(HEADER).toContain('migrate_160_community.sql');
    expect(HEADER).toContain('migrate_161_community_connections.sql');
    expect(HEADER).toContain('migrate_162_gym_directory.sql');
  });

  test('Applied locally says N/A: this adds no local SQLite table either', () => {
    expect(HEADER).toMatch(/Applied locally:\s+N\/A/);
  });

  test('carries a Findings for the lead block naming every judgement call', () => {
    expect(HEADER).toContain('FINDINGS FOR THE LEAD');
  });
});

describe('every statement is re-runnable', () => {
  test('added columns use ADD COLUMN IF NOT EXISTS', () => {
    const adds = CODE.split('\n').filter((l) => /ADD COLUMN/i.test(l));
    expect(adds.length).toBeGreaterThan(0);
    for (const line of adds) expect(line).toMatch(/ADD COLUMN IF NOT EXISTS/i);
  });

  test('the one named CHECK is added inside a duplicate_object-tolerant block', () => {
    const blocks = SQL.match(/DO \$\$ BEGIN\s+ALTER TABLE[\s\S]*?EXCEPTION WHEN duplicate_object THEN NULL; END \$\$;/g) || [];
    expect(blocks.length).toBeGreaterThanOrEqual(1);
    const guarded = (blocks.join('\n').match(/ADD CONSTRAINT/g) || []).length;
    const all = (CODE.match(/ADD CONSTRAINT/g) || []).length;
    expect(all).toBe(guarded);
  });

  test('every function is CREATE OR REPLACE, never a bare CREATE FUNCTION', () => {
    expect(CODE).not.toMatch(/^CREATE FUNCTION/m);
    expect((CODE.match(/CREATE OR REPLACE FUNCTION/g) || []).length).toBeGreaterThanOrEqual(20);
  });

  test('a signature change (new trailing parameter) drops the old overload by name first', () => {
    for (const name of ['gyms_search', 'community_find_people']) {
      const dropBlock = new RegExp(
        `WHERE p\\.proname = '${name}' AND n\\.nspname = 'public'`,
      );
      expect(CODE).toMatch(dropBlock);
      expect(CODE).toContain('DROP FUNCTION IF EXISTS %I.%I(%s) CASCADE');
    }
  });

  test('nothing destructive touches an existing table', () => {
    expect(CODE).not.toMatch(/DROP TABLE/i);
    expect(CODE).not.toMatch(/DROP COLUMN/i);
    expect(CODE).not.toMatch(/TRUNCATE/i);
    const drops = CODE.split('\n').filter((l) => /^\s*(ALTER TABLE|DROP)/i.test(l) && /DROP/i.test(l));
    for (const line of drops) {
      expect(line).toMatch(/DROP (TRIGGER IF EXISTS|POLICY IF EXISTS|CONSTRAINT IF EXISTS)/i);
    }
  });

  test('no CREATE TABLE and no RLS/policy statement: this file adds no new table', () => {
    expect(CODE).not.toMatch(/CREATE TABLE/i);
    expect(CODE).not.toMatch(/ENABLE ROW LEVEL SECURITY/i);
  });

  test('it ends with a read-only acceptance check', () => {
    expect(SQL).toContain('information_schema.columns');
    expect(SQL).toContain('prosecdef');
    expect(SQL).not.toMatch(/^\s*(INSERT|UPDATE|DELETE)\s/im);
  });
});

describe('every function this file touches is a pinned SECURITY DEFINER', () => {
  test('the migration declares both new RPCs, the re-issued RPCs and the internal helpers', () => {
    expect(RPCS.length).toBeGreaterThanOrEqual(NEW_RPCS.length + REISSUED_RPCS.length);
    expect(HELPERS.length).toBeGreaterThanOrEqual(9);
  });

  test.each(FUNCTIONS.map((f) => [f.name, f]))(
    '%s is SECURITY DEFINER with a pinned search_path',
    (_name, fn) => {
      expect(fn.header).toMatch(/SECURITY DEFINER/);
      expect(fn.header).toMatch(/SET search_path = public, pg_temp/);
    },
  );

  test.each(NEW_RPCS)('%s (new RPC) is declared', (name) => {
    expect(FUNCTIONS.map((f) => f.name)).toContain(name);
  });
});

describe('EXECUTE is granted deliberately, never by default', () => {
  test('the two privilege loops exist and say the right thing', () => {
    expect(CODE).toContain("REVOKE ALL ON FUNCTION public.%s FROM PUBLIC, anon, authenticated'");
    expect(CODE).toContain("REVOKE ALL ON FUNCTION public.%s FROM PUBLIC, anon'");
    expect(CODE).toContain("GRANT EXECUTE ON FUNCTION public.%s TO authenticated'");
  });

  test.each([...NEW_RPCS, ...REISSUED_RPCS])('%s is in the grant-to-authenticated list', (name) => {
    expect(RPC_SIGNATURES.some((sig) => sig.startsWith(`${name}(`))).toBe(true);
    expect(HELPER_SIGNATURES.some((sig) => sig.startsWith(`${name}(`))).toBe(false);
  });

  test.each([
    '_gyms_outward_centroid', '_gyms_brand_alias_tokens', '_gyms_tokens_strip',
    '_gyms_dedupe_jaccard', '_community_can_connect', '_community_place_band_m',
    '_community_populate_place_from_gym', '_community_find_people_cursor_of',
    '_community_find_people_cursor_parts', '_community_profile_card',
  ])('%s is in the revoke-from-authenticated (helper) list', (name) => {
    expect(HELPER_SIGNATURES.some((sig) => sig.startsWith(`${name}(`))).toBe(true);
    expect(RPC_SIGNATURES.some((sig) => sig.startsWith(`${name}(`))).toBe(false);
  });

  test('no helper is granted to authenticated anywhere', () => {
    const grantLines = CODE_LINES.filter((l) => /GRANT EXECUTE ON FUNCTION/i.test(l));
    for (const line of grantLines) {
      expect(line).not.toMatch(/public\._gyms_/);
      expect(line).not.toMatch(/public\._community_/);
    }
  });
});

describe('the file is registered in the tracker', () => {
  const README = fs.readFileSync(path.join(ROOT, 'supabase', 'README.md'), 'utf8');

  test('supabase/README.md carries the status entry and a ledger row', () => {
    expect(README).toContain('163 WRITTEN, NOT APPLIED');
    expect(README).toContain('| 163 | `migrate_163_community_place_and_finder.sql` |');
  });
});

describe('the security matrix inventory is updated with the two new client RPCs', () => {
  const inventory = JSON.parse(fs.readFileSync(
    path.join(ROOT, 'scripts', 'security', 'supabase-matrix.targets.json'), 'utf8',
  ));

  test.each(NEW_RPCS)('%s is inventoried as a client RPC', (name) => {
    expect(inventory.clientRpcNames).toContain(name);
  });

  test('no _gyms_*/_community_* helper is ever listed as a client RPC', () => {
    expect(inventory.clientRpcNames.filter((n) => n.startsWith('_gyms_'))).toEqual([]);
    expect(inventory.clientRpcNames.filter((n) => n.startsWith('_community_'))).toEqual([]);
  });
});

describe('LJ-01: distance between two PEOPLE is never a number, only a venue ever carries distance_m', () => {
  function bodyOf(fnHeader) {
    const at = CODE.indexOf(fnHeader);
    expect(at).toBeGreaterThan(-1);
    const nextFn = CODE.indexOf('CREATE OR REPLACE FUNCTION public.', at + 10);
    return CODE.slice(at, nextFn === -1 ? CODE.length : nextFn);
  }

  test('community_find_people only ever pushes the four fixed place/age reason tokens, never a rendered distance', () => {
    const body = bodyOf('CREATE OR REPLACE FUNCTION public.community_find_people(');
    expect(body).toContain("'same_age_band'::text");
    expect(body).toContain("'same_place'::text");
    expect(body).toContain("'near_place'::text");
    expect(body).toContain("'within_25_miles'::text");
    // The metre value from _community_place_band_m is compared against a
    // fixed threshold and discarded; it is never concatenated into a
    // reason string or returned as a bare field.
    expect(body).not.toMatch(/v_place_m\s*\|\|/);
    expect(body).not.toMatch(/'place_distance/);
    expect(body).not.toMatch(/'distance_miles/);
  });

  test('_community_place_band_m never appears in gyms_search or gyms_near (venue distance uses _gyms_distance_m only)', () => {
    const search = bodyOf('CREATE OR REPLACE FUNCTION public.gyms_search(');
    const near = bodyOf('CREATE OR REPLACE FUNCTION public.gyms_near(');
    expect(search).not.toContain('_community_place_band_m');
    expect(near).not.toContain('_community_place_band_m');
  });

  test('no coalesce ever turns a missing venue distance into 0 (must stay JSON null)', () => {
    expect(CODE).not.toMatch(/coalesce\([^)]*distance_m[^)]*,\s*0\)/i);
  });
});

describe('a place is a chosen PUBLIC centroid, never a device coordinate (LJ-01)', () => {
  function signatureOf(name) {
    const re = new RegExp(`CREATE OR REPLACE FUNCTION\\s+public\\.${name}\\s*\\(([^)]*)\\)`);
    const m = CODE.match(re);
    expect(m).not.toBeNull();
    return m[1];
  }

  test('community_set_place takes text only, never a _lat/_lng argument', () => {
    const args = signatureOf('community_set_place');
    expect(args).not.toMatch(/_lat/);
    expect(args).not.toMatch(/_lng/);
  });

  test('_community_populate_place_from_gym takes only a user id, never a coordinate', () => {
    const args = signatureOf('_community_populate_place_from_gym');
    expect(args.trim()).toBe('_uid uuid');
  });

  test('gyms_place_centroid takes text only', () => {
    const args = signatureOf('gyms_place_centroid');
    expect(args.trim()).toBe('_q text');
  });

  test('every write to place_lat/place_lng reads from a server-resolved centroid variable, never a bare _lat/_lng parameter', () => {
    const writes = CODE.split('\n').filter((l) => /place_lat\s*=/.test(l) || /place_lat,/.test(l));
    for (const line of writes) {
      expect(line).not.toMatch(/=\s*_lat\b/);
    }
  });
});
