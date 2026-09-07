/**
 * migrate_164_community_gap_closure.sql keeps the house migration shape and
 * security posture (SD-14, exactly as 160-163).
 *
 * WHAT THIS SUITE PINS, and why it is written to fail rather than to pass:
 * the file's mandatory header (purpose/push/pull/applied/safe-to-re-run/
 * rollback/GDPR); every statement re-runnable (ADD COLUMN IF NOT EXISTS,
 * both CHECK widenings DROP-then-re-ADD, CREATE OR REPLACE FUNCTION
 * throughout, the one signature change dropping its old overload by name
 * first); every function this file declares or re-issues is SECURITY
 * DEFINER with `search_path = public, pg_temp`, and EXECUTE is granted to
 * `authenticated` only for the client RPCs and to nobody for any
 * `_community_*` helper; the nine retired programme RPCs are executable by
 * NOBODY (not even authenticated); the new client RPCs are registered in
 * the security matrix inventory and the nine retired ones are removed from
 * it; `community_find_people` never turns a hidden gym/place into a match
 * signal; `community_dimension` never touches the retired programme tables
 * for a `programme` key.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const MIGRATION = path.join(ROOT, 'supabase', 'migrate_164_community_gap_closure.sql');
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

// Two REVOKE-from-(PUBLIC,anon,authenticated) loops in this file: the
// programme retirement (Part 15) and the helper functions (Part 16, first
// FOREACH). Both use the identical clause text, so the helper list is the
// LAST such loop before the grant-loop clause, and the programme list is
// found by searching from the START of the file instead.
const RPC_SIGNATURES = signatureList("REVOKE ALL ON FUNCTION public.%s FROM PUBLIC, anon'");
const PROGRAMME_REVOKE_BLOCK = SQL.slice(
  SQL.indexOf('-- ─── Part 15'), SQL.indexOf('-- ─── Part 16'),
);
const HELPER_REVOKE_BLOCK = SQL.slice(
  SQL.indexOf('-- ─── Part 16'), SQL.indexOf('-- ─── Part 17'),
);
const PROGRAMME_SIGNATURES = [
  ...PROGRAMME_REVOKE_BLOCK.matchAll(/'([a-z_0-9\[\] .,]+\([^']*\))'/g),
].map((m) => m[1]);
// Part 16's FIRST FOREACH loop (helpers, revoked from everyone); its SECOND
// FOREACH loop (the ordinary grant loop) is what RPC_SIGNATURES reads from
// the whole file above.
const HELPER_LOOP_END = HELPER_REVOKE_BLOCK.indexOf(
  'FOREACH sig IN ARRAY ARRAY[', HELPER_REVOKE_BLOCK.indexOf('FOREACH sig IN ARRAY ARRAY[') + 1,
);
const HELPER_SIGNATURES = [
  ...HELPER_REVOKE_BLOCK.slice(0, HELPER_LOOP_END).matchAll(/'([a-z_0-9\[\] .,]+\([^']*\))'/g),
].map((m) => m[1]);

const FUNCTIONS = declaredFunctions();
const NEW_RPCS = [
  'community_list_followers', 'community_my_status', 'community_set_quiet_hours',
  'community_set_show_gym', 'community_set_show_place', 'community_respond_session',
];
const REISSUED_RPCS = [
  'community_search_people', 'community_find_people', 'community_suggested_people',
  'community_dimension', 'community_comment', 'community_report', 'community_send_message',
];
const RETIRED_PROGRAMME_RPCS = [
  'community_publish_programme', 'community_unpublish_programme',
  'community_discover_programmes', 'community_search_programmes',
  'community_get_programme', 'community_record_programme_use',
  'community_programme_people', 'community_set_show_programmes', 'community_my_programmes',
];
const RPCS = FUNCTIONS.filter((f) => [...NEW_RPCS, ...REISSUED_RPCS].includes(f.name));
const HELPERS = FUNCTIONS.filter((f) => f.name.startsWith('_community_'));

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
    expect(HEADER).toContain('40-GAP-CLOSURE.md');
  });

  test('Applied remotely still says NO, awaiting the founder phrase', () => {
    expect(HEADER).toMatch(/Applied remotely:\s+NO/);
    expect(HEADER).toContain('run against production');
  });

  test('it records that it depends on 160, 161, 162 and 163 and must never run before them', () => {
    expect(HEADER).toContain('160');
    expect(HEADER).toContain('161');
    expect(HEADER).toContain('162');
    expect(HEADER).toContain('163');
  });

  test('Applied locally says N/A: this adds no local SQLite table either', () => {
    expect(HEADER).toMatch(/Applied locally:\s+N\/A/);
  });
});

describe('every statement is re-runnable', () => {
  test('added columns use ADD COLUMN IF NOT EXISTS', () => {
    const adds = CODE.split('\n').filter((l) => /ADD COLUMN/i.test(l));
    expect(adds.length).toBeGreaterThan(0);
    for (const line of adds) expect(line).toMatch(/ADD COLUMN IF NOT EXISTS/i);
  });

  test('both CHECK widenings DROP the constraint by name before re-adding it', () => {
    const drops = (CODE.match(/DROP CONSTRAINT IF EXISTS \w+_check/g) || []).length;
    const adds = (CODE.match(/ADD CONSTRAINT \w+_check/g) || []).length;
    expect(drops).toBeGreaterThanOrEqual(2);
    expect(adds).toBe(drops);
  });

  test('every function is CREATE OR REPLACE, never a bare CREATE FUNCTION', () => {
    expect(CODE).not.toMatch(/^CREATE FUNCTION/m);
    expect((CODE.match(/CREATE OR REPLACE FUNCTION/g) || []).length).toBeGreaterThanOrEqual(15);
  });

  test('community_send_message (new trailing parameter) drops the old overload by name first', () => {
    const dropBlock = /WHERE p\.proname = 'community_send_message' AND n\.nspname = 'public'/;
    expect(CODE).toMatch(dropBlock);
    expect(CODE).toContain('DROP FUNCTION IF EXISTS %I.%I(%s) CASCADE');
  });

  test('nothing destructive touches an existing table', () => {
    expect(CODE).not.toMatch(/DROP TABLE/i);
    expect(CODE).not.toMatch(/DROP COLUMN/i);
    expect(CODE).not.toMatch(/\bTRUNCATE\s+TABLE\b/i);
    const drops = CODE.split('\n').filter(
      (l) => /^\s*(ALTER TABLE|DROP)\s/i.test(l) && /DROP/i.test(l),
    );
    for (const line of drops) {
      expect(line).toMatch(/DROP (TRIGGER IF EXISTS|POLICY IF EXISTS|CONSTRAINT IF EXISTS)/i);
    }
  });

  test('no CREATE TABLE and no RLS/policy statement: this file adds no new table', () => {
    expect(CODE).not.toMatch(/CREATE TABLE/i);
    expect(CODE).not.toMatch(/ENABLE ROW LEVEL SECURITY/i);
  });

  test('it ends with a read-only acceptance check', () => {
    const acceptance = SQL.slice(SQL.indexOf('-- ─── Part 17'));
    expect(acceptance).toContain('information_schema.columns');
    expect(acceptance).toContain('prosecdef');
    const acceptanceCode = acceptance.split('\n').filter((l) => !l.trim().startsWith('--')).join('\n');
    expect(acceptanceCode).not.toMatch(/^\s*(INSERT|UPDATE|DELETE)\s/im);
  });
});

describe('every function this file touches is a pinned SECURITY DEFINER', () => {
  test('the migration declares both new and re-issued RPCs, and the internal helpers', () => {
    expect(RPCS.length).toBeGreaterThanOrEqual(NEW_RPCS.length + REISSUED_RPCS.length);
    expect(HELPERS.length).toBeGreaterThanOrEqual(2);
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
  test('the privilege loops exist and say the right thing', () => {
    expect(CODE).toContain("REVOKE ALL ON FUNCTION public.%s FROM PUBLIC, anon, authenticated'");
    expect(CODE).toContain("REVOKE ALL ON FUNCTION public.%s FROM PUBLIC, anon'");
    expect(CODE).toContain("GRANT EXECUTE ON FUNCTION public.%s TO authenticated'");
  });

  test.each([...NEW_RPCS, ...REISSUED_RPCS])('%s is in the grant-to-authenticated list', (name) => {
    expect(RPC_SIGNATURES.some((sig) => sig.startsWith(`${name}(`))).toBe(true);
    expect(HELPER_SIGNATURES.some((sig) => sig.startsWith(`${name}(`))).toBe(false);
  });

  test.each(['_community_profile_card', '_community_message_json'])(
    '%s is in the revoke-from-authenticated (helper) list', (name) => {
      expect(HELPER_SIGNATURES.some((sig) => sig.startsWith(`${name}(`))).toBe(true);
      expect(RPC_SIGNATURES.some((sig) => sig.startsWith(`${name}(`))).toBe(false);
    },
  );

  test('no helper is granted to authenticated anywhere', () => {
    const grantLines = CODE_LINES.filter((l) => /GRANT EXECUTE ON FUNCTION/i.test(l));
    for (const line of grantLines) {
      expect(line).not.toMatch(/public\._community_/);
    }
  });

  test.each(RETIRED_PROGRAMME_RPCS)('%s is revoked from PUBLIC, anon AND authenticated (nobody executes it)', (name) => {
    expect(PROGRAMME_SIGNATURES.some((sig) => sig.startsWith(`${name}(`))).toBe(true);
    // Never separately re-granted to authenticated by the ordinary grant loop.
    expect(RPC_SIGNATURES.some((sig) => sig.startsWith(`${name}(`))).toBe(false);
  });

  test('the programme revoke loop names all nine retired RPCs', () => {
    expect(RETIRED_PROGRAMME_RPCS.every(
      (name) => PROGRAMME_SIGNATURES.some((sig) => sig.startsWith(`${name}(`)),
    )).toBe(true);
  });
});

describe('the file is registered in the tracker', () => {
  const README = fs.readFileSync(path.join(ROOT, 'supabase', 'README.md'), 'utf8');

  test('supabase/README.md carries the status entry and a ledger row', () => {
    expect(README).toContain('164 WRITTEN, NOT APPLIED');
    expect(README).toContain('| 164 | `migrate_164_community_gap_closure.sql` |');
  });
});

describe('the security matrix inventory reflects the retirement', () => {
  const inventory = JSON.parse(fs.readFileSync(
    path.join(ROOT, 'scripts', 'security', 'supabase-matrix.targets.json'), 'utf8',
  ));

  test.each(NEW_RPCS)('%s is inventoried as a client RPC', (name) => {
    expect(inventory.clientRpcNames).toContain(name);
  });

  test.each(RETIRED_PROGRAMME_RPCS)('%s is removed from the client RPC inventory', (name) => {
    expect(inventory.clientRpcNames).not.toContain(name);
  });

  test('no _community_* helper is ever listed as a client RPC', () => {
    expect(inventory.clientRpcNames.filter((n) => n.startsWith('_community_'))).toEqual([]);
  });
});

describe('D: a hidden gym/place is never a match signal in community_find_people', () => {
  function bodyOf(fnHeader) {
    const at = CODE.indexOf(fnHeader);
    expect(at).toBeGreaterThan(-1);
    const nextFn = CODE.indexOf('CREATE OR REPLACE FUNCTION public.', at + 10);
    return CODE.slice(at, nextFn === -1 ? CODE.length : nextFn);
  }

  test('every gym/place door and filter predicate is ANDed with the candidate show_gym/show_place toggle', () => {
    const body = bodyOf('CREATE OR REPLACE FUNCTION public.community_find_people(');
    expect((body.match(/coalesce\(p\.show_gym, true\)/g) || []).length).toBeGreaterThanOrEqual(3);
    expect((body.match(/coalesce\(p\.show_place, true\)/g) || []).length).toBeGreaterThanOrEqual(1);
    expect((body.match(/coalesce\(v_row\.show_gym, true\)/g) || []).length).toBeGreaterThanOrEqual(1);
    expect((body.match(/coalesce\(v_row\.show_place, true\)/g) || []).length).toBeGreaterThanOrEqual(1);
  });

  test("'programme' is no longer a valid _mode", () => {
    const body = bodyOf('CREATE OR REPLACE FUNCTION public.community_find_people(');
    expect(body).toContain("('like_me', 'gym', 'area', 'partners', 'might_know')");
  });
});

describe('A: community_dimension never touches the retired programme tables for a programme key', () => {
  test('the programme branch returns the empty page without reading community_programmes/community_programme_uses', () => {
    const at = CODE.indexOf('CREATE OR REPLACE FUNCTION public.community_dimension(');
    const nextFn = CODE.indexOf('CREATE OR REPLACE FUNCTION public.', at + 10);
    const body = CODE.slice(at, nextFn === -1 ? CODE.length : nextFn);
    expect(body).toContain("IF _kind = 'programme' THEN");
    expect(body).not.toContain('community_programme_uses');
    expect(body).not.toContain('community_programmes');
  });
});
