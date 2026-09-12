/**
 * migrate_175_community_rules_gate_tolerant.sql keeps the house migration
 * shape and the RPC-only posture (SD-14, as 160-174), and carries the D160
 * ruling exactly.
 *
 * WHAT THIS SUITE PINS, and why every case is written to FAIL: the file is
 * WRITTEN, NOT APPLIED until it runs, so only source can check it. Part 1:
 * `community_upsert_profile(jsonb, boolean)` is migrate_170 lines 2597-2902
 * byte-for-byte once the four marked migrate_175 changes are reverted, so a
 * hand-edited carry-forward can never silently change a profile field; the
 * two exact-equality rules gates became the tolerant range (1 up to the
 * server's version plus one) and nothing else about consent moved; the
 * create path stores the version the person actually accepted, in the
 * profile row and in the consent log. Part 2: the rules version is 3 again,
 * in the same file, and the client's own constant agrees. The act-level
 * gate (`_community_require_rules`) is NOT re-issued here, so an old build
 * is still asked for the current rules on the acts that need them. The
 * acceptance block cannot be fooled by a NULL and reads the LIVE body.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const SQL = read('supabase/migrate_175_community_rules_gate_tolerant.sql');
const SRC170 = read('supabase/migrate_170_community_connection.sql').split('\n');
const HEADER = SQL.slice(0, SQL.indexOf('-- ─── Part 1'));
const { COMMUNITY_RULES_VERSION } = require('../lib/community/limits');

function fnSpan(text, startMarker, endMarker = 'END $$;') {
  const start = text.indexOf(startMarker);
  expect(start).toBeGreaterThan(-1);
  const end = text.indexOf(endMarker, start) + endMarker.length;
  return text.slice(start, end);
}
const UPSERT = fnSpan(SQL, 'CREATE OR REPLACE FUNCTION public.community_upsert_profile(_p jsonb, _remove_shared boolean DEFAULT false)');
const RULES = fnSpan(SQL, 'CREATE OR REPLACE FUNCTION public._community_rules_version()', '$$;');

/** The four marked changes: [new text in 175, original text in 170]. Each
 * must be present exactly once; reverting all four must give 170's function
 * byte-for-byte. */
const REPLACEMENTS = [
  [
    "    v_accept := (_p ->> 'accept_rules_version')::int;\n"
    + '    -- migrate_175: the gate tolerates an OLDER client (its build carries an\n'
    + '    -- earlier rules text; the version it accepted is stored below, and the\n'
    + '    -- acts that need the current text keep raising rules_outdated through\n'
    + '    -- _community_require_rules) and a client ONE version ahead (a build\n'
    + '    -- shipped before its migration). Anything else is malformed.\n'
    + '    IF v_accept < 1 OR v_accept > public._community_rules_version() + 1 THEN\n'
    + "      RAISE EXCEPTION USING message = 'invalid_input';\n"
    + '    END IF;\n',
    "    v_accept := (_p ->> 'accept_rules_version')::int;\n"
    + '    IF v_accept IS DISTINCT FROM public._community_rules_version() THEN\n'
    + "      RAISE EXCEPTION USING message = 'invalid_input';\n"
    + '    END IF;\n',
  ],
  [
    "      v_visibility, v_minor, 'active', v_accept, now(), -- migrate_175: the version accepted\n",
    "      v_visibility, v_minor, 'active', public._community_rules_version(), now(),\n",
  ],
  [
    "    VALUES (v_uid, 'community_visibility', true, now(),\n"
    + '            v_accept::text); -- migrate_175: the version accepted\n',
    "    VALUES (v_uid, 'community_visibility', true, now(),\n"
    + '            public._community_rules_version()::text);\n',
  ],
  [
    "      v_accept := (_p ->> 'accept_rules_version')::int;\n"
    + '      -- migrate_175: same tolerance as the create path above; a re-consent\n'
    + '      -- at an older version than the one already stored changes nothing.\n'
    + '      IF v_accept < 1 OR v_accept > public._community_rules_version() + 1 THEN\n'
    + "        RAISE EXCEPTION USING message = 'invalid_input';\n"
    + '      END IF;\n',
    "      v_accept := (_p ->> 'accept_rules_version')::int;\n"
    + '      IF v_accept IS DISTINCT FROM public._community_rules_version() THEN\n'
    + "        RAISE EXCEPTION USING message = 'invalid_input';\n"
    + '      END IF;\n',
  ],
];
function reverted(text) {
  let out = text;
  for (const [now, before] of REPLACEMENTS) {
    expect(out.split(now).length - 1).toBe(1);
    out = out.replace(now, before);
  }
  return out;
}

describe('house migration shape', () => {
  test('the header carries every mandatory field and names the order it runs under', () => {
    for (const field of ['Purpose:', 'Applied locally:', 'Applied remotely:', 'Safe to re-run:', 'Rollback:', 'Transaction:', 'Depends on:']) {
      expect(HEADER).toContain(field);
    }
    expect(HEADER).toContain('run against production');
    expect(HEADER).toContain('founder order 2026-09-12');
  });

  test('two functions and nothing else: no table change, no new grant beyond the re-stated pair', () => {
    expect(SQL).not.toMatch(/\b(CREATE TABLE|ALTER TABLE|DROP TABLE|INSERT INTO public\.(?!community_profiles|consent_log)|DELETE FROM public\.(?!community_comments|community_activity|community_posts))\b/);
    expect((SQL.match(/CREATE OR REPLACE FUNCTION public\./g) || []).length).toBe(2);
    expect(SQL).not.toMatch(/CREATE OR REPLACE FUNCTION public\._community_require_rules/);
  });
});

describe('Part 1: migrate_170 lines 2597-2902 plus the four marked changes only', () => {
  test('reverting the four changes gives the source function byte-for-byte', () => {
    const source = SRC170.slice(2596, 2902).join('\n').trimEnd();
    expect(reverted(UPSERT).trimEnd()).toBe(source);
    expect(UPSERT).not.toBe(source);
  });

  test('the tolerant range replaces the exact gate on create and on re-consent', () => {
    expect((UPSERT.match(/IF v_accept < 1 OR v_accept > public\._community_rules_version\(\) \+ 1 THEN/g) || []).length).toBe(2);
    expect(UPSERT).not.toMatch(/IS DISTINCT FROM public\._community_rules_version\(\)/);
  });

  test('the create path stores the version the person actually accepted, in the row and in the consent log', () => {
    expect(UPSERT).toContain("v_visibility, v_minor, 'active', v_accept, now(),");
    expect(UPSERT).toContain("VALUES (v_uid, 'community_visibility', true, now(),\n            v_accept::text);");
    // The server's own version is never stamped on a consent the person did not give.
    const createBranch = UPSERT.slice(UPSERT.indexOf('IF v_is_new THEN'), UPSERT.indexOf('  ELSE\n'));
    expect(createBranch).not.toMatch(/public\._community_rules_version\(\)::text|'active', public\._community_rules_version\(\)/);
  });

  test('a re-consent still records only a NEWER version than the one stored', () => {
    expect(UPSERT).toContain('IF coalesce(v_existing.rules_version, 0) < v_accept THEN');
    expect(UPSERT).toContain('UPDATE public.community_profiles SET rules_version = v_accept WHERE user_id = v_uid;');
  });

  test('the grants are the pair migrate_170 set', () => {
    expect(SQL).toContain('REVOKE ALL ON FUNCTION public.community_upsert_profile(jsonb, boolean) FROM PUBLIC, anon;');
    expect(SQL).toContain('GRANT EXECUTE ON FUNCTION public.community_upsert_profile(jsonb, boolean) TO authenticated;');
  });
});

describe('Part 2: the rules version is 3 again, and the client agrees', () => {
  test('SELECT 3 on the pinned search_path, IMMUTABLE, SECURITY DEFINER', () => {
    expect(RULES).toContain('SELECT 3;');
    expect(RULES).toMatch(/\nIMMUTABLE\n/);
    expect(RULES).toMatch(/SECURITY DEFINER/);
    expect(RULES).toMatch(/SET search_path = public, pg_temp/);
    expect(COMMUNITY_RULES_VERSION).toBe(3);
  });
});

describe('the acceptance block reads the live body and cannot be fooled by a NULL', () => {
  const ACCEPT = SQL.slice(SQL.indexOf('-- ─── Acceptance check'));
  test('presence, single overload, volatility, posture, grants', () => {
    expect(ACCEPT).toContain("to_regprocedure('public.community_upsert_profile(jsonb, boolean)') IS NULL");
    expect(ACCEPT).toContain("to_regprocedure('public.community_upsert_profile(jsonb)') IS NOT NULL");
    expect(ACCEPT).toContain("IF v_vol IS DISTINCT FROM 'v' THEN");
    expect(ACCEPT).toContain('OR p.proconfig IS NULL');
    expect(ACCEPT).toContain("p.proname IN ('community_upsert_profile', '_community_rules_version', '_community_require_rules')");
    expect(ACCEPT).toContain("has_function_privilege('anon', 'public.community_upsert_profile(jsonb, boolean)', 'EXECUTE')");
  });

  test('the live body carries the tolerant gate twice, the exact gate nowhere, and stores the accepted version', () => {
    expect(ACCEPT).toContain("v_def := pg_get_functiondef(to_regprocedure('public.community_upsert_profile(jsonb, boolean)'));");
    expect(ACCEPT).toContain("'v_accept > public\\._community_rules_version\\(\\) \\+ 1', 'g')) <> 2 THEN");
    expect(ACCEPT).toContain("v_def LIKE '%v_accept IS DISTINCT FROM public._community_rules_version()%'");
    expect(ACCEPT).toContain("v_def NOT LIKE '%''active'', v_accept, now(),%'");
  });

  test('the act-level gate is checked live, and the version is 3', () => {
    expect(ACCEPT).toContain("pg_get_functiondef(to_regprocedure('public._community_require_rules(public.community_profiles)'))");
    expect(ACCEPT).toContain("v_def NOT LIKE '%< public._community_rules_version()%'");
    expect(ACCEPT).toContain('IF public._community_rules_version() IS DISTINCT FROM 3 THEN');
  });
});

describe('the tracker knows the file', () => {
  test('supabase/README.md carries the status block and the table row', () => {
    const readme = read('supabase/README.md');
    expect(readme).toMatch(/- \*\*175 (WRITTEN, NOT APPLIED|APPLIED)/);
    expect(readme).toMatch(/\| 175 \| `migrate_175_community_rules_gate_tolerant\.sql` \|/);
  });
});
