/**
 * migrate_173_community_handle_suggestion.sql keeps the house migration
 * shape and the RPC-only posture (SD-14, as 160-172), and never lets the
 * caller's email out.
 *
 * WHAT THIS SUITE PINS, and why every case is written to FAIL: the file is
 * WRITTEN, NOT APPLIED until the founder's phrase, so only source can check
 * it. It pins the mandatory header; that the three functions carry SECURITY
 * DEFINER on the pinned search_path; that the RPC is VOLATILE (its rate rail
 * writes, migrate_167's lesson) and the two helpers IMMUTABLE; the grants
 * (authenticated may execute the RPC and nothing else, no client role may
 * execute a helper); that the suggestion's exclusion list is EXACTLY the
 * client's RESERVED_HANDLES, so the server can never suggest a word the
 * client refuses; that `_community_handle_reserved` (the hard rule the
 * upsert re-validates on every save) is NOT re-issued, because widening it
 * would refuse every future edit from an existing member whose handle is on
 * it; that the email is read once into a local and never returned, built
 * into the jsonb or raised; that the derivation runs name first and takes
 * only the leading letters of the email as a last resort (D159, Q2); and
 * that the tracker and the security matrix know the RPC.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const SQL = read('supabase/migrate_173_community_handle_suggestion.sql');
const HEADER = SQL.slice(0, SQL.indexOf('-- ─── Part 1'));
const { RESERVED_HANDLES } = require('../lib/community/validation');

function fnSpan(text, startMarker) {
  const start = text.indexOf(startMarker);
  expect(start).toBeGreaterThan(-1);
  const end = text.indexOf('$$;', start + startMarker.length) + '$$;'.length;
  return text.slice(start, end);
}
const RESERVED = fnSpan(SQL, 'CREATE OR REPLACE FUNCTION public._community_handle_suggest_reserved()');
const BASE = fnSpan(SQL, 'CREATE OR REPLACE FUNCTION public._community_handle_base(_raw text)');
const RPC = fnSpan(SQL, 'CREATE OR REPLACE FUNCTION public.community_handle_suggestion(_hint text DEFAULT NULL)');

describe('house migration shape', () => {
  test('the header carries every mandatory field', () => {
    for (const field of ['Purpose:', 'Applied locally:', 'Applied remotely:', 'Safe to re-run:', 'Rollback:', 'Transaction:', 'Depends on:']) {
      expect(HEADER).toContain(field);
    }
    expect(HEADER).toContain('run against production');
  });

  test('no table is created or altered: three functions and their grants only', () => {
    expect(SQL).not.toMatch(/\b(CREATE TABLE|ALTER TABLE|DROP TABLE|INSERT INTO|UPDATE public\.|DELETE FROM)\b/);
    expect((SQL.match(/CREATE OR REPLACE FUNCTION public\./g) || []).length).toBe(3);
  });
});

describe('RPC-only security posture', () => {
  test('SECURITY DEFINER on the pinned search_path, all three functions', () => {
    for (const fn of [RESERVED, BASE, RPC]) {
      expect(fn).toMatch(/SECURITY DEFINER/);
      expect(fn).toMatch(/SET search_path = public, pg_temp/);
    }
  });

  test('the RPC is VOLATILE (its rate rail writes); the helpers are IMMUTABLE', () => {
    expect(RPC).toMatch(/\nVOLATILE\n/);
    expect(RPC).toContain("PERFORM public._community_rate_check(v_uid, 'handle_suggest', 30, 30, interval '1 hour');");
    expect(RESERVED).toMatch(/\nIMMUTABLE\n/);
    expect(BASE).toMatch(/\nIMMUTABLE\n/);
  });

  test('authenticated may execute the RPC; no client role may execute a helper', () => {
    expect(SQL).toContain('REVOKE ALL ON FUNCTION public.community_handle_suggestion(text) FROM PUBLIC, anon;');
    expect(SQL).toContain('GRANT EXECUTE ON FUNCTION public.community_handle_suggestion(text) TO authenticated;');
    expect(SQL).toContain('REVOKE ALL ON FUNCTION public._community_handle_base(text) FROM PUBLIC, anon, authenticated;');
    expect(SQL).toContain('REVOKE ALL ON FUNCTION public._community_handle_suggest_reserved() FROM PUBLIC, anon, authenticated;');
    expect(SQL).not.toMatch(/GRANT [A-Z]+ ON FUNCTION public\._community_handle/);
  });

  test('the caller is resolved server-side and an existing member gets their own handle back', () => {
    expect(RPC).toContain('v_uid       uuid := public._community_caller();');
    expect(RPC).toContain("RETURN jsonb_build_object('handle', v_existing, 'source', 'existing');");
  });
});

describe('the exclusion list is the client list, and the hard list is untouched', () => {
  test('_community_handle_suggest_reserved equals RESERVED_HANDLES, in order', () => {
    const arrayText = RESERVED.slice(RESERVED.indexOf('ARRAY['), RESERVED.indexOf(']::text[]'));
    const words = [...arrayText.matchAll(/'([a-z0-9_]+)'/g)].map((m) => m[1]);
    expect(words).toEqual([...RESERVED_HANDLES]);
    expect(words.length).toBeGreaterThanOrEqual(70);
  });

  test('the sanitiser refuses an excluded base, an invalid base and a short base', () => {
    expect(BASE).toContain('IF length(v) < 3 THEN RETURN NULL; END IF;');
    expect(BASE).toContain('IF NOT public._community_handle_valid(v) THEN RETURN NULL; END IF;');
    expect(BASE).toContain('IF v = ANY (public._community_handle_suggest_reserved()) THEN RETURN NULL; END IF;');
  });

  test('_community_handle_reserved (the rule the upsert re-validates on every save) is not re-issued', () => {
    expect(SQL).not.toContain('CREATE OR REPLACE FUNCTION public._community_handle_reserved');
  });
});

describe('the email never leaves the function', () => {
  test('it is read once from auth.users into a local and nulled after the split', () => {
    expect(RPC).toContain('SELECT lower(u.email), u.raw_user_meta_data INTO v_address, v_meta');
    expect(RPC).toContain('FROM auth.users u');
    expect(RPC).toContain("    v_local  := split_part(coalesce(v_address, ''), '@', 1);");
    expect(RPC).toContain("    v_domain := split_part(coalesce(v_address, ''), '@', 2);");
    expect(RPC).toContain('    v_address := NULL;');
    // The local part is used ONCE, for its leading letters only (Q2):
    // the declaration, the assignment, and that one use.
    expect((RPC.match(/\bv_local\b/g) || []).length).toBe(3);
    expect(RPC).toContain("public._community_handle_base(substring(v_local FROM '^[a-z]+'))");
    expect((RPC.match(/\bu\.email\b/g) || []).length).toBe(1);
    // One read of auth.users in the code (the header names it in prose),
    // inside the RPC only, and only after the rail.
    expect((RPC.match(/auth\.users/g) || []).length).toBe(1);
    expect(BASE).not.toMatch(/auth\.users/);
    expect(RESERVED).not.toMatch(/auth\.users/);
    const railAt = RPC.indexOf("PERFORM public._community_rate_check(v_uid, 'handle_suggest'");
    const readAt = RPC.indexOf('FROM auth.users u');
    expect(railAt).toBeGreaterThan(-1);
    expect(readAt).toBeGreaterThan(railAt);
  });

  test('no RETURN, jsonb_build_object or RAISE carries the address, the local part or the domain', () => {
    const returns = RPC.match(/RETURN jsonb_build_object\([^;]*\);/g) || [];
    expect(returns.length).toBe(2);
    for (const r of returns) {
      expect(r).not.toMatch(/v_address|v_local|v_domain|email/);
    }
    const raises = RPC.match(/RAISE [^;]*;/g) || [];
    for (const r of raises) {
      expect(r).not.toMatch(/v_address|v_local|v_domain|email|v_meta|v_base/);
    }
    expect(RPC).not.toMatch(/RAISE NOTICE|RAISE LOG|RAISE WARNING/);
  });

  test('the return shape is the handle and its source, nothing else', () => {
    expect(RPC).toContain("RETURN jsonb_build_object('handle', v_candidate, 'source', v_source);");
  });
});

describe('derivation order and bounds', () => {
  test('D159 Q2: the hint, then the profile first name, then the provider name, then the leading letters of the email, then athlete', () => {
    const hint = RPC.indexOf("v_base := public._community_handle_base(left(coalesce(_hint, ''), 60));");
    const profileName = RPC.indexOf('FROM public.users_profile up');
    const signIn = RPC.indexOf('FROM auth.users u');
    const providerName = RPC.indexOf("nullif(btrim(coalesce(v_meta ->> 'given_name', '')), '')");
    const emailLetters = RPC.indexOf("IF v_base IS NULL AND v_domain <> 'privaterelay.appleid.com' THEN");
    const fallback = RPC.indexOf("v_base := 'athlete';");
    expect(hint).toBeGreaterThan(-1);
    expect(profileName).toBeGreaterThan(hint);
    expect(signIn).toBeGreaterThan(profileName);
    expect(providerName).toBeGreaterThan(signIn);
    expect(emailLetters).toBeGreaterThan(providerName);
    expect(fallback).toBeGreaterThan(emailLetters);
    // Each later source runs ONLY through its `IF v_base IS NULL THEN`
    // wrapper (hostile review OJ-REV-SQL-2, F9): the profile-name read sits
    // inside one opened after the hint's source line, with no END IF
    // between, and the sign-in read inside one opened after the profile
    // read.
    const hintDone = RPC.indexOf("IF v_base IS NOT NULL THEN v_source := 'name'; END IF;", hint);
    expect(hintDone).toBeGreaterThan(hint);
    const wrap2 = RPC.lastIndexOf('IF v_base IS NULL THEN', profileName);
    expect(wrap2).toBeGreaterThan(hintDone);
    expect(RPC.slice(wrap2, profileName)).not.toContain('END IF;');
    const before = RPC.slice(0, signIn);
    expect(before.lastIndexOf('IF v_base IS NULL THEN')).toBeGreaterThan(profileName);
    expect(RPC.slice(before.lastIndexOf('IF v_base IS NULL THEN'), signIn)).not.toContain('END IF;');
    // The full local part never becomes a handle: no base call takes v_local whole.
    expect(RPC).not.toMatch(/_community_handle_base\(v_local\)/);
  });

  test('a hint is a base to derive from, never stored or echoed', () => {
    // The parameter, and its one use inside the sanitiser call (comments
    // stripped: the body names it in prose too).
    const code = RPC.split('\n').filter((l) => !l.trim().startsWith('--')).join('\n');
    expect((code.match(/\b_hint\b/g) || []).length).toBe(2);
    expect(code).not.toMatch(/INSERT|UPDATE/);
  });

  test('the collision walk re-validates every candidate, excludes the caller, and is bounded', () => {
    expect(RPC).toContain('WHILE NOT public._community_handle_valid(v_candidate)');
    expect(RPC).toContain('WHERE p.handle = v_candidate AND p.user_id <> v_uid)');
    expect(RPC).toContain('IF v_tries > 120 THEN');
    expect(RPC).toContain("RAISE EXCEPTION USING message = 'unavailable';");
  });

  test('every candidate fits twenty characters and never ends in an underscore (the exact expressions)', () => {
    // n = 2..99: cut the base to leave room for "_" and the digits, trim a
    // "_" the cut may expose, then append. 100 onwards: fifteen plus "_" plus
    // four digits. A one-character slip here makes every candidate invalid
    // and the RPC always `unavailable` for a long base.
    expect(RPC).toContain("v_candidate := rtrim(left(v_base, 20 - length(v_n::text) - 1), '_') || '_' || v_n::text;");
    expect(RPC).toContain("v_candidate := rtrim(left(v_base, 15), '_') || '_'");
    expect(RPC).toContain("|| lpad((floor(random() * 10000))::int::text, 4, '0');");
  });

  test('the acceptance block cannot be fooled by a NULL: no SET clause and a NULL base both fail', () => {
    const accept = SQL.slice(SQL.indexOf('-- ─── Acceptance check'));
    expect(accept).toContain('OR p.proconfig IS NULL');
    expect(accept).toContain("length(public._community_handle_base('abcdefghijklmnopqrstuvwxyz')) IS DISTINCT FROM 20");
  });
});

describe('the acceptance block proves the shape and tests the sanitiser pure', () => {
  const ACCEPT = SQL.slice(SQL.indexOf('-- ─── Acceptance check'));
  test('presence, volatility, posture, grants and the exclusion words', () => {
    expect(ACCEPT).toContain("to_regprocedure('public.community_handle_suggestion(text)') IS NULL");
    expect(ACCEPT).toContain("to_regprocedure('public.community_handle_suggestion()') IS NOT NULL");
    expect(ACCEPT).toContain("IF v_vol IS DISTINCT FROM 'v' THEN");
    expect(ACCEPT).toContain("IF v_vol IS DISTINCT FROM 'i' THEN");
    expect(ACCEPT).toContain("'search_path=public, pg_temp' = ANY (p.proconfig)");
    expect(ACCEPT).toContain("has_function_privilege('anon', 'public.community_handle_suggestion(text)', 'EXECUTE')");
    expect(ACCEPT).toContain("ARRAY['app', 'settings', 'login', 'me', 'today'] <@ public._community_handle_suggest_reserved()");
  });

  test('five pure sanitiser checks, none touching data', () => {
    expect(ACCEPT).toContain("public._community_handle_base('John.Smith+gym') IS DISTINCT FROM 'john_smith'");
    expect(ACCEPT).toContain("public._community_handle_base('  --ab-- ') IS NOT NULL");
    expect(ACCEPT).toContain("public._community_handle_base('app') IS NOT NULL");
    expect(ACCEPT).toContain("length(public._community_handle_base('abcdefghijklmnopqrstuvwxyz')) IS DISTINCT FROM 20");
    expect(ACCEPT).toContain("public._community_handle_base('sam.j.parker-1990') IS DISTINCT FROM 'sam_j_parker_1990'");
    expect(ACCEPT).toContain("public._community_handle_base(substring('sam.j.parker-1990' FROM '^[a-z]+')) IS DISTINCT FROM 'sam'");
    expect(ACCEPT).toContain("public._community_handle_base(substring('sj.parker' FROM '^[a-z]+')) IS NOT NULL");
    expect(ACCEPT).not.toMatch(/community_profiles|auth\.users/);
  });
});

describe('the tracker and the security matrix know the RPC', () => {
  test('supabase/README.md carries the status block and the table row', () => {
    const readme = read('supabase/README.md');
    expect(readme).toMatch(/- \*\*173 (WRITTEN, NOT APPLIED|APPLIED)/);
    expect(readme).toMatch(/\| 173 \| `migrate_173_community_handle_suggestion\.sql` \|/);
  });

  test('scripts/security/supabase-matrix.targets.json lists community_handle_suggestion', () => {
    const matrix = JSON.parse(read('scripts/security/supabase-matrix.targets.json'));
    expect(JSON.stringify(matrix)).toContain('"community_handle_suggestion"');
  });
});
