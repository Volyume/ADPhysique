/**
 * migrate_174_community_minor_closed_rules_v3.sql keeps the house migration
 * shape and the RPC-only posture (SD-14, as 160-173), and carries the two
 * D159 rulings exactly.
 *
 * WHAT THIS SUITE PINS, and why every case is written to FAIL: the file is
 * WRITTEN, NOT APPLIED until it runs under the founder's phrase, so only
 * source can check it. Part 1: `_community_minor` is migrate_160's body
 * with every fail-open return turned to TRUE (an absent, blank or
 * unparseable date of birth reads as a minor until the date arrives) and
 * the age test itself untouched; STABLE, SECURITY DEFINER on the pinned
 * search_path. Part 2: `_community_rules_version()` returns 3, and the
 * client's own COMMUNITY_RULES_VERSION agrees, so a member on version 2
 * meets the re-consent path once and a member on version 3 never does. The
 * acceptance block cannot be fooled by a NULL, proves the fail-closed
 * answer on an account with no row, and the tracker knows the file.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const SQL = read('supabase/migrate_174_community_minor_closed_rules_v3.sql');
const HEADER = SQL.slice(0, SQL.indexOf('-- ─── Part 1'));
const SRC160 = read('supabase/migrate_160_community.sql');
const SRC161 = read('supabase/migrate_161_community_connections.sql');
const SRC170 = read('supabase/migrate_170_community_connection.sql');
const { COMMUNITY_RULES_VERSION } = require('../lib/community/limits');

function fnSpan(text, startMarker) {
  const start = text.indexOf(startMarker);
  expect(start).toBeGreaterThan(-1);
  const end = text.indexOf('$$;', start + startMarker.length) + '$$;'.length;
  return text.slice(start, end);
}
const MINOR = fnSpan(SQL, 'CREATE OR REPLACE FUNCTION public._community_minor(_uid uuid)');
const RULES = fnSpan(SQL, 'CREATE OR REPLACE FUNCTION public._community_rules_version()');
const MINOR160 = fnSpan(SRC160, 'CREATE OR REPLACE FUNCTION public._community_minor(_uid uuid)');

const code = (text) => text.split('\n').filter((l) => !l.trim().startsWith('--')).join('\n');

describe('house migration shape', () => {
  test('the header carries every mandatory field', () => {
    for (const field of ['Purpose:', 'Applied locally:', 'Applied remotely:', 'Safe to re-run:', 'Rollback:', 'Transaction:', 'Depends on:']) {
      expect(HEADER).toContain(field);
    }
    expect(HEADER).toContain('run against production');
  });

  test('two functions and nothing else: no table, no grant change', () => {
    expect(SQL).not.toMatch(/\b(CREATE TABLE|ALTER TABLE|DROP TABLE|INSERT INTO|UPDATE public\.|DELETE FROM|GRANT|REVOKE)\b/);
    expect((SQL.match(/CREATE OR REPLACE FUNCTION public\./g) || []).length).toBe(2);
  });
});

describe('RPC-only security posture', () => {
  test('SECURITY DEFINER on the pinned search_path, both functions', () => {
    for (const fn of [MINOR, RULES]) {
      expect(fn).toMatch(/SECURITY DEFINER/);
      expect(fn).toMatch(/SET search_path = public, pg_temp/);
    }
  });

  test('the minor check is STABLE (one read, no write); the version is IMMUTABLE', () => {
    expect(MINOR).toMatch(/\nSTABLE\n/);
    expect(RULES).toMatch(/\nIMMUTABLE\n/);
  });
});

describe('Part 1: the under-18 check fails closed and changes nothing else', () => {
  test('every fail-open return became TRUE, and the age test is untouched', () => {
    const body = code(MINOR);
    expect((body.match(/RETURN true;/g) || []).length).toBe(3);
    expect(body).not.toMatch(/RETURN false;/);
    expect(body).toContain("RETURN v_dob > (current_date - interval '18 years');");
    expect(body).toContain('FROM public.user_body_profile');
    expect(body).toContain('WHERE user_id = _uid');
  });

  test('it is migrate_160 with exactly those three returns flipped', () => {
    const flipped = code(MINOR160).replace(/RETURN false;/g, 'RETURN true;');
    expect(code(MINOR)).toBe(flipped);
    expect(code(MINOR)).not.toBe(code(MINOR160));
  });
});

describe('Part 2: the rules version the server requires is the one the client accepts', () => {
  test('SELECT 3, and the client constant agrees', () => {
    expect(code(RULES)).toContain('SELECT 3;');
    expect(COMMUNITY_RULES_VERSION).toBe(3);
  });
});

describe('the acceptance block proves the rulings and cannot be fooled by a NULL', () => {
  const ACCEPT = SQL.slice(SQL.indexOf('-- ─── Acceptance check'));
  test('presence, volatility, posture', () => {
    expect(ACCEPT).toContain("to_regprocedure('public._community_minor(uuid)') IS NULL");
    expect(ACCEPT).toContain("IF v_vol IS DISTINCT FROM 's' THEN");
    expect(ACCEPT).toContain("IF v_vol IS DISTINCT FROM 'i' THEN");
    expect(ACCEPT).toContain('OR p.proconfig IS NULL');
    expect(ACCEPT).toContain("'search_path=public, pg_temp' = ANY (p.proconfig)");
  });

  test('fail closed on an account with no row, and the version is 3', () => {
    expect(ACCEPT).toContain('IF public._community_minor(gen_random_uuid()) IS DISTINCT FROM true THEN');
    expect(ACCEPT).toContain('IF public._community_rules_version() IS DISTINCT FROM 3 THEN');
  });
});

describe('the applied files this ruling relies on still do what the header says (hostile review OJ-REV-SQL-2, F9)', () => {
  // The LAST definition in 170 is the live one (part B re-issues part A's).
  const upsertStart = SRC170.lastIndexOf('CREATE OR REPLACE FUNCTION public.community_upsert_profile(');
  const UPSERT = code(SRC170.slice(upsertStart, SRC170.indexOf('$$;', upsertStart) + 3));
  const GET_ME = code(fnSpan(SRC161, 'CREATE OR REPLACE FUNCTION public.community_get_me('));

  test('a minor is stored followers-only by the upsert: that is what the fail-closed value is for', () => {
    expect(UPSERT).toContain('v_minor := public._community_minor(v_uid);');
    expect(UPSERT).toContain("IF v_minor THEN v_visibility := 'followers'; END IF;");
  });

  test('every hub open recomputes the stored is_minor, so the value self-heals once the row exists', () => {
    expect(GET_ME).toContain('is_minor = public._community_minor(v_uid)');
  });

  test('the rules gate is EXACT equality on create and on re-consent: the recorded constraint (174 header, F6)', () => {
    expect((UPSERT.match(/IF v_accept IS DISTINCT FROM public\._community_rules_version\(\) THEN/g) || []).length).toBe(2);
    expect(HEADER).toContain('ORDER IN THE BATCH: this file runs BEFORE migrate_173.');
  });
});

describe('the tracker knows the file', () => {
  test('supabase/README.md carries the status block and the table row', () => {
    const readme = read('supabase/README.md');
    expect(readme).toMatch(/- \*\*174 (WRITTEN, NOT APPLIED|APPLIED)/);
    expect(readme).toMatch(/\| 174 \| `migrate_174_community_minor_closed_rules_v3\.sql` \|/);
  });
});
