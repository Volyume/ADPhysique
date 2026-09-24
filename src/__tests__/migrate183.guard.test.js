/**
 * migrate183.guard.test.js - the three unused Community/gyms RPCs lose
 * their EXECUTE grant (founder order 2026-09-22, item 9, "Community
 * hygiene"; audit docs/audit/community-audit-2026-09-22/B-functionality-
 * backend-safety-engineering.md, B-04).
 *
 * WHAT THIS SUITE PINS, and why every case is written to FAIL: the file is
 * WRITTEN, NOT APPLIED until the founder's phrase, so only source can check
 * it, following migrate179.guard.test.js's and migrate181.guard.test.js's
 * pattern.
 *
 * The audit named FOUR RPCs as having zero client callers. Item 9 Lane A
 * established THREE are true and the fourth, `gyms_near`, is not (a client
 * alias, `near as nearGyms`, that the audit's own `near(` grep missed -
 * `src/components/community/GymPicker.js`). This file must never revoke
 * `gyms_near`: the acceptance block proves it stays executable, and this
 * suite pins that `gyms_near` is not even NAMED anywhere in this migration
 * outside that one proof, so a hand-edit cannot casually widen the REVOKE
 * array to include it.
 *
 * `community_dimensions_me` is revoked at exactly ONE signature, `(text)`,
 * not two: migrate_170 Part 7 drops the migrate_160 no-arg overload by name
 * before creating the one-argument version, and no later migration restores
 * a zero-arg overload. This suite re-proves that directly against migrate_
 * 160's and migrate_170's own live source, the same "re-proved here
 * directly, not merely trusted from prose" discipline migrate181.guard.
 * test.js uses for its own cross-file claim.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

const SQL = read('supabase/migrate_183_community_unused_rpcs_revoked.sql');
const SQL160 = read('supabase/migrate_160_community.sql');
const SQL162 = read('supabase/migrate_162_gym_directory.sql');
const SQL167 = read('supabase/migrate_167_gyms_stable_volatility_fix.sql');
const SQL170 = read('supabase/migrate_170_community_connection.sql');

const HEADER = SQL.slice(0, SQL.indexOf('-- ─── Part 1'));
const PART1 = SQL.slice(SQL.indexOf('-- ─── Part 1'), SQL.indexOf('-- ─── Part 2'));
const PART2 = SQL.slice(SQL.indexOf('-- ─── Part 2'));

// Statement lines only (the same convention migrate179/181's guards use): a
// rule quoted in a comment (the Rollback field spells out "GRANT", the
// header prose says "no DROP FUNCTION") proves nothing about the executable
// SQL itself.
const CODE_LINES = SQL.split('\n').filter((l) => !l.trim().startsWith('--'));
const CODE = CODE_LINES.join('\n');

const REVOKED_SIGNATURES = [
  'community_dimensions_me(text)',
  'gyms_in_place(text, integer)',
  'community_gym_suggest(text, text)',
];

describe('house migration shape', () => {
  test('the header carries every mandatory field', () => {
    for (const field of [
      'Purpose:', 'Applied locally:', 'Applied remotely:', 'Safe to re-run:',
      'Rollback:', 'Transaction:', 'Depends on:',
    ]) {
      expect(HEADER).toContain(field);
    }
    expect(HEADER).toContain('run against production');
    expect(HEADER).toMatch(/WRITTEN 2026-09-24/);
    expect(HEADER).toMatch(/NOT YET/);
  });

  test('no DROP, no GRANT, no CREATE and no destructive statement in the executable code', () => {
    expect(CODE).not.toMatch(/\bDROP\b/i);
    expect(CODE).not.toMatch(/\bGRANT\b/i);
    expect(CODE).not.toMatch(/\bCREATE\b/i);
    expect(CODE).not.toMatch(/\bTRUNCATE\b/i);
    expect(CODE).not.toMatch(/\bINSERT\b|\bUPDATE\b|\bDELETE\b/i);
    expect(CODE).not.toMatch(/ALTER TABLE/i);
  });

  test('the only DROP/GRANT anywhere are prose, in the header, never in code', () => {
    expect(SQL).toMatch(/no DROP FUNCTION/);
    expect(SQL).toMatch(/Re-GRANT EXECUTE/);
    // Every mention of the literal words is on a `--`-prefixed line.
    const offenders = SQL.split('\n').filter(
      (l) => !l.trim().startsWith('--') && /\b(DROP|GRANT)\b/i.test(l),
    );
    expect(offenders).toEqual([]);
  });

  test('the file is registered in the README ledger and status', () => {
    const README = read('supabase/README.md');
    expect(README).toMatch(/183[^\n]*WRITTEN[^\n]*NOT APPLIED/);
    expect(README).toContain('| 183 | `migrate_183_community_unused_rpcs_revoked.sql` |');
  });
});

describe('exactly the three signatures are revoked, nothing else', () => {
  test('Part 1 is a FOREACH sig IN ARRAY loop, the migrate_164 Part 15 pattern', () => {
    expect(PART1).toContain('FOREACH sig IN ARRAY ARRAY[');
    expect(PART1).toContain(
      "EXECUTE format('REVOKE ALL ON FUNCTION public.%s FROM PUBLIC, anon, authenticated', sig)",
    );
  });

  test('the REVOKE array holds exactly these three signatures, in this order', () => {
    const arrayStart = PART1.indexOf('FOREACH sig IN ARRAY ARRAY[');
    const arrayEnd = PART1.indexOf(']', arrayStart);
    const arrayText = PART1.slice(arrayStart, arrayEnd);
    const signatures = [...arrayText.matchAll(/'([a-z_0-9]+\([^']*\))'/g)].map((m) => m[1]);
    expect(signatures).toEqual(REVOKED_SIGNATURES);
  });

  test('community_dimensions_me is revoked at exactly one signature: (text), never the bare 0-arg form', () => {
    expect(SQL).not.toContain("'community_dimensions_me()'");
    expect(SQL).toContain("'community_dimensions_me(text)'");
  });

  test('no other gyms_*/community_* RPC name appears in the REVOKE array', () => {
    const arrayStart = PART1.indexOf('FOREACH sig IN ARRAY ARRAY[');
    const arrayEnd = PART1.indexOf(']', arrayStart);
    const arrayText = PART1.slice(arrayStart, arrayEnd);
    const signatures = [...arrayText.matchAll(/'([a-z_0-9]+)\(/g)].map((m) => m[1]);
    expect(signatures).toEqual([
      'community_dimensions_me', 'gyms_in_place', 'community_gym_suggest',
    ]);
  });
});

describe('gyms_near is never widened into this file, by construction', () => {
  test('the string "gyms_near" appears only inside Part 2 (the acceptance block)', () => {
    const beforePart2 = SQL.slice(0, SQL.indexOf('-- ─── Part 2'));
    expect(beforePart2).not.toMatch(/gyms_near/);
    expect(PART2).toMatch(/gyms_near/);
  });

  test('the acceptance block asserts gyms_near IS executable by authenticated (not revoked)', () => {
    expect(PART2).toMatch(
      /IF NOT has_function_privilege\(\s*'authenticated', 'public\.gyms_near\(double precision, double precision, integer, integer\)', 'EXECUTE'\s*\)/,
    );
    expect(PART2).toContain('RAISE EXCEPTION');
  });

  test('gyms_near never appears inside the REVOKE array (Part 1)', () => {
    expect(PART1).not.toMatch(/gyms_near/);
  });
});

describe('the acceptance block is read-only and checks both roles for all three revoked signatures', () => {
  test.each(REVOKED_SIGNATURES)('%s: both anon and authenticated must read false, RAISE otherwise', (sig) => {
    const escaped = sig.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const nameOnly = sig.split('(')[0];
    const at = PART2.indexOf(`public.${sig}`);
    expect(at).toBeGreaterThan(-1);
    // The nearest enclosing IF must test both roles for this exact signature
    // and RAISE EXCEPTION when either reads true.
    const ifStart = PART2.lastIndexOf('IF has_function_privilege', at);
    const ifBlock = PART2.slice(ifStart, PART2.indexOf('END IF;', at) + 'END IF;'.length);
    expect(ifBlock).toMatch(new RegExp(`has_function_privilege\\('anon', 'public\\.${escaped}', 'EXECUTE'\\)`));
    expect(ifBlock).toMatch(
      new RegExp(`has_function_privilege\\('authenticated', 'public\\.${escaped}', 'EXECUTE'\\)`),
    );
    expect(ifBlock).toContain('RAISE EXCEPTION');
    expect(ifBlock).toContain(nameOnly);
  });

  test('the acceptance block contains no write statement', () => {
    expect(PART2).not.toMatch(/\bINSERT\b|\bUPDATE\b|\bDELETE\b|\bDROP\b|\bGRANT\b|\bCREATE\b/i);
  });

  test('the acceptance block ends with a success notice', () => {
    expect(PART2).toContain("RAISE NOTICE 'migrate_183 acceptance: OK'");
  });
});

describe('the community_dimensions_me overload finding is re-proved against live migration source', () => {
  test('migrate_160 created the no-arg overload', () => {
    expect(SQL160).toContain('CREATE OR REPLACE FUNCTION public.community_dimensions_me()');
  });

  test('migrate_170 Part 7 dynamically drops every existing overload by name before creating (_today text)', () => {
    const at = SQL170.indexOf('Part 7: community_dimensions_me');
    expect(at).toBeGreaterThan(-1);
    const part7 = SQL170.slice(at, SQL170.indexOf('CREATE OR REPLACE FUNCTION public.community_dimensions_me(_today'));
    expect(part7).toContain("p.proname = 'community_dimensions_me' AND n.nspname = 'public'");
    expect(part7).toContain('pg_get_function_identity_arguments(p.oid)');
    expect(part7).toContain('DROP FUNCTION IF EXISTS %I.%I(%s) CASCADE');
    expect(SQL170).toContain('CREATE OR REPLACE FUNCTION public.community_dimensions_me(_today text DEFAULT NULL)');
  });

  test("migrate_170's own acceptance block requires the (text) signature and names the 0-arg form as a failure", () => {
    expect(SQL170).toContain("to_regprocedure('public.community_dimensions_me(text)') IS NULL");
    expect(SQL170).toMatch(/old 0-arg signature not dropped/);
  });

  test('no migration after 170 re-creates a zero-argument community_dimensions_me', () => {
    // Every migration numbered above 170, this file included, and every
    // one added later (lead edit at review: the first draft's range
    // stopped at 182 and would have gone quiet on a future re-creation).
    const files = fs.readdirSync(path.join(ROOT, 'supabase'))
      .filter((f) => /^migrate_(\d+)_.*\.sql$/.test(f) && Number(f.match(/^migrate_(\d+)_/)[1]) > 170);
    expect(files.length).toBeGreaterThan(12);
    for (const f of files) {
      const src = read(path.join('supabase', f));
      expect(src).not.toContain('CREATE OR REPLACE FUNCTION public.community_dimensions_me()');
    }
  });
});

describe('the three revoked signatures match the latest CREATE for each, elsewhere in the tree', () => {
  test('gyms_in_place(text, integer) matches migrate_167\'s re-issue and grant', () => {
    expect(SQL167).toContain('REVOKE ALL ON FUNCTION public.gyms_in_place(text, integer) FROM PUBLIC, anon;');
    expect(SQL167).toContain('GRANT EXECUTE ON FUNCTION public.gyms_in_place(text, integer) TO authenticated;');
  });

  test('community_gym_suggest(text, text) matches migrate_162\'s signature', () => {
    expect(SQL162).toContain(
      'CREATE OR REPLACE FUNCTION public.community_gym_suggest(_area_key text, _prefix text DEFAULT NULL)',
    );
    expect(SQL162).toContain("'community_gym_suggest(text, text)'");
  });

  test('community_dimensions_me(text) matches migrate_170\'s signature', () => {
    expect(SQL170).toContain('CREATE OR REPLACE FUNCTION public.community_dimensions_me(_today text DEFAULT NULL)');
  });
});

describe('the security matrix inventory no longer lists the three (the migrate_164 precedent for a revoked RPC)', () => {
  // Lead ruling on Lane A's STOP (2026-09-24): scripts/security/
  // supabase-matrix.targets.json lists exactly the RPCs the client can
  // call; a fully revoked RPC is pinned ABSENT, as migrate164.rpcOnly.
  // guard.test.js pins for the nine programme RPCs 164 revoked. The
  // wrongly-audited gyms_near stays listed, live.
  const inventory = JSON.parse(read('scripts/security/supabase-matrix.targets.json'));
  test.each(['community_dimensions_me', 'gyms_in_place', 'community_gym_suggest'])(
    '%s is absent from clientRpcNames',
    (name) => {
      expect(inventory.clientRpcNames).not.toContain(name);
    },
  );
  test('gyms_near stays inventoried as a live client RPC', () => {
    expect(inventory.clientRpcNames).toContain('gyms_near');
  });
});

describe('no Edge Function calls any of the three revoked RPCs', () => {
  test('grepped supabase/functions/** for all three names: none found', () => {
    const functionsDir = path.join(ROOT, 'supabase', 'functions');
    const names = ['gyms_in_place', 'community_gym_suggest', 'community_dimensions_me'];
    const offenders = [];
    const walk = (dir) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) { walk(full); continue; }
        if (!entry.name.endsWith('.ts')) continue;
        const src = fs.readFileSync(full, 'utf8');
        for (const name of names) {
          if (src.includes(name)) offenders.push(`${path.relative(ROOT, full)}: ${name}`);
        }
      }
    };
    walk(functionsDir);
    expect(offenders).toEqual([]);
  });
});
