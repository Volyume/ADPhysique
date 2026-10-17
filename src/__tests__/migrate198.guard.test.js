/**
 * migrate_198_member_email.sql keeps the house migration shape and the
 * member email safety posture (spec docs/member-email-2026-10-17/SPEC.md
 * sections 1 and 5; founder decisions 2026-10-17: members are emailed by
 * default and can turn it off, and the admin can exclude people).
 *
 * WHAT THIS SUITE PINS, and why every case is written to FAIL: the file is
 * WRITTEN, NOT APPLIED until the founder's phrase, so only source can check
 * it. It pins the mandatory header; that every new table has RLS on and no
 * client privilege except the owner's SELECT on the prefs table; that every
 * function is SECURITY DEFINER on the pinned search_path; that the two
 * member RPCs are granted to authenticated and never anon, the client may
 * only set source 'settings', and turning the emails back on deletes the
 * caller's opt-out rows; that the audience is service role only, built on
 * the one roster, and applies migrate_180's wellbeing gate fail-closed in
 * BOTH places, the opt-out (user id or email, case-insensitive), the prefs
 * off state and the admin exclusions (user id or email); that the
 * unsubscribe writes the opt-out, the prefs and an event; that the link
 * secret is generated once and never rotated; that no existing object is
 * altered or dropped; that the acceptance block checks all of it; and that
 * the tracker knows the file.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const SQL = read('supabase/migrate_198_member_email.sql');
const HEADER = SQL.slice(0, SQL.indexOf('-- ─── Guard'));
const ACCEPT = SQL.slice(SQL.indexOf('-- ─── Acceptance check'));
const BODY = SQL.slice(SQL.indexOf('-- ─── Guard'), SQL.indexOf('-- ─── Acceptance check'));

function fnSpan(startMarker) {
  const start = BODY.indexOf(startMarker);
  expect(start).toBeGreaterThan(-1);
  const asAt = BODY.indexOf('AS $$', start);
  const end = BODY.indexOf('$$;', asAt + 5) + 3;
  return BODY.slice(start, end);
}

const SET_SUB = fnSpan('CREATE OR REPLACE FUNCTION public.member_email_set_subscribed(');
const GET_SUB = fnSpan('CREATE OR REPLACE FUNCTION public.member_email_get_subscribed(');
const ROSTER = fnSpan('CREATE OR REPLACE FUNCTION public._member_email_roster(');
const AUDIENCE = fnSpan('CREATE OR REPLACE FUNCTION public.member_email_audience(');
const MEMBERS = fnSpan('CREATE OR REPLACE FUNCTION public.member_email_members(');
const COUNTS = fnSpan('CREATE OR REPLACE FUNCTION public.member_email_counts(');
const UNSUB = fnSpan('CREATE OR REPLACE FUNCTION public.member_email_unsubscribe(');
const ALL_FNS = [SET_SUB, GET_SUB, ROSTER, AUDIENCE, MEMBERS, COUNTS, UNSUB];

const TABLES = [
  'member_email_prefs', 'member_email_pref_events', 'member_surveys',
  'member_email_campaigns', 'member_email_sends', 'member_survey_answers',
  'member_email_admin_logins', 'member_email_config', 'member_email_exclusions',
];
const ADMIN_TABLES = TABLES.filter((t) => t !== 'member_email_prefs' && t !== 'member_email_pref_events');

describe('house migration shape', () => {
  test('the header carries every mandatory field, WRITTEN NOT APPLIED, and the founder decisions', () => {
    for (const field of ['Purpose:', 'Applied locally:', 'Applied remotely:', 'Safe to re-run:', 'Rollback:', 'Transaction:', 'Depends on:']) {
      expect(HEADER).toContain(field);
    }
    expect(HEADER).toMatch(/Applied remotely:\s+WRITTEN, NOT APPLIED/);
    expect(HEADER).toContain('run against production 198');
    expect(HEADER).toContain('No consent to sign up');
    expect(HEADER).toContain('exclude people myself too');
  });

  test('additive only: no DROP TABLE, no TRUNCATE, no ALTER of an existing table, no DROP FUNCTION statement', () => {
    const code = SQL.split('\n').filter((l) => !l.trim().startsWith('--')).join('\n');
    expect(code).not.toMatch(/DROP\s+TABLE/i);
    expect(code).not.toMatch(/TRUNCATE/i);
    expect(code).not.toMatch(/DROP\s+FUNCTION/i);
    expect(code).not.toMatch(/DISABLE ROW LEVEL SECURITY/i);
    for (const m of code.matchAll(/ALTER TABLE\s+(?:IF EXISTS\s+)?public\.(\w+)/gi)) {
      expect(TABLES).toContain(m[1]);
    }
    for (const m of code.matchAll(/CREATE TABLE IF NOT EXISTS public\.(\w+)/g)) {
      expect(TABLES).toContain(m[1]);
    }
    // Every CREATE TABLE is IF NOT EXISTS, every policy is dropped first.
    expect(code).not.toMatch(/CREATE TABLE (?!IF NOT EXISTS)/);
    expect((code.match(/CREATE POLICY/g) || []).length)
      .toBeLessThanOrEqual((code.match(/DROP POLICY IF EXISTS/g) || []).length);
    // The existing objects are named, never redefined.
    expect(code).not.toMatch(/CREATE OR REPLACE FUNCTION public\._community_/);
    expect(code).not.toMatch(/CREATE (TABLE|POLICY)[^;]*marketing_email_optout/);
  });

  test('the guard refuses without migrate_180, migrate_123, migrate_120 and pgcrypto', () => {
    const guard = BODY.slice(0, BODY.indexOf('-- ─── Part 1'));
    expect(guard).toContain("to_regprocedure('public._community_ed_flag_open(uuid)') IS NULL");
    expect(guard).toContain("to_regclass('public.marketing_email_optout') IS NULL");
    expect(guard).toContain("to_regclass('public.marketing_admins') IS NULL");
    expect(guard).toContain("to_regprocedure('extensions.gen_random_bytes(integer)') IS NULL");
  });
});

describe('tables: RLS on, client roles shut out', () => {
  test.each(TABLES)('%s is created and has RLS enabled', (t) => {
    expect(BODY).toContain(`CREATE TABLE IF NOT EXISTS public.${t} (`);
    const direct = BODY.includes(`ALTER TABLE public.${t} ENABLE ROW LEVEL SECURITY;`);
    const looped = BODY.includes(`'${t}'`) && BODY.includes("EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t)");
    expect(direct || looped).toBe(true);
  });

  test('the admin tables are revoked from PUBLIC, anon and authenticated in the loop, with no client policy', () => {
    const loop = BODY.slice(BODY.indexOf('FOREACH t IN ARRAY ARRAY['), BODY.indexOf('END LOOP;'));
    for (const t of ADMIN_TABLES) expect(loop).toContain(`'${t}'`);
    expect(loop).toContain("EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC, anon, authenticated', t)");
    expect(loop).toContain('FOR ALL TO service_role USING (true) WITH CHECK (true)');
    expect(BODY).not.toMatch(/GRANT[^;]*ON TABLE public\.member_(surveys|email_campaigns|email_sends|survey_answers|email_admin_logins|email_config|email_exclusions)[^;]*TO (anon|authenticated)/);
    expect(BODY).not.toMatch(/CREATE POLICY[^;]*\bTO anon\b/);
  });

  test('prefs: owner SELECT only; events: no client access', () => {
    expect(BODY).toMatch(/CREATE POLICY member_email_prefs_owner_select\s+ON public\.member_email_prefs\s+FOR SELECT\s+TO authenticated\s+USING \(auth\.uid\(\) = user_id\);/);
    expect(BODY).toContain('REVOKE ALL ON TABLE public.member_email_prefs FROM PUBLIC, anon, authenticated;');
    expect(BODY).toContain('GRANT SELECT ON TABLE public.member_email_prefs TO authenticated;');
    expect(BODY).not.toMatch(/GRANT (INSERT|UPDATE|DELETE|ALL)[^;]*member_email_prefs TO authenticated/);
    expect(BODY).toContain('REVOKE ALL ON TABLE public.member_email_pref_events FROM PUBLIC, anon, authenticated;');
    expect(BODY).not.toMatch(/GRANT[^;]*member_email_pref_events TO (anon|authenticated)/);
  });

  test('subscribed by default, every user row cascades with the account', () => {
    expect(BODY).toMatch(/subscribed\s+boolean NOT NULL DEFAULT true/);
    expect(BODY).toMatch(/source\s+text NOT NULL CHECK \(source IN \('settings', 'email'\)\)/);
    const fks = BODY.match(/REFERENCES auth\.users\(id\)[^,\n]*/g) || [];
    expect(fks.length).toBe(5);
    for (const fk of fks) expect(fk).toContain('ON DELETE CASCADE');
  });

  test('the spec checks: campaign limits, https button, survey outline, answer size, one answer per member', () => {
    expect(BODY).toContain('CHECK (char_length(subject) BETWEEN 1 AND 150)');
    expect(BODY).toContain('CHECK (char_length(body) BETWEEN 1 AND 20000)');
    expect(BODY).toContain("CHECK (button_url IS NULL OR button_url LIKE 'https://%')");
    expect(BODY).toContain("CHECK (status IN ('draft', 'sending', 'sent', 'partial'))");
    expect(BODY).toMatch(/jsonb_typeof\(questions\) = 'array'\s+THEN jsonb_array_length\(questions\) BETWEEN 1 AND 20/);
    expect(BODY).toContain('CHECK (pg_column_size(answers) <= 20000)');
    expect(BODY).toContain('UNIQUE (survey_id, user_id)');
    expect(BODY).toContain('PRIMARY KEY (campaign_id, user_id)');
    expect(BODY).toContain('CHECK (user_id IS NOT NULL OR email IS NOT NULL)');
    expect(BODY).toContain('ON public.member_email_exclusions (lower(email)) WHERE email IS NOT NULL');
  });

  test('the link secret is generated once and never rotated by a re-run', () => {
    expect(BODY).toMatch(/INSERT INTO public\.member_email_config \(key, value\)\s+VALUES \('link_secret', encode\(extensions\.gen_random_bytes\(32\), 'hex'\)\)\s+ON CONFLICT \(key\) DO NOTHING;/);
    expect(BODY).not.toMatch(/UPDATE public\.member_email_config/);
  });
});

describe('functions: posture', () => {
  test('every function is SECURITY DEFINER on the pinned search_path', () => {
    for (const fn of ALL_FNS) {
      expect(fn).toMatch(/SECURITY DEFINER/);
      expect(fn).toMatch(/SET search_path = public, pg_temp/);
    }
  });

  test('the member RPCs: authenticated only, never anon', () => {
    expect(BODY).toContain('REVOKE ALL ON FUNCTION public.member_email_set_subscribed(boolean, text, text) FROM PUBLIC, anon;');
    expect(BODY).toContain('GRANT EXECUTE ON FUNCTION public.member_email_set_subscribed(boolean, text, text) TO authenticated;');
    expect(BODY).toContain('REVOKE ALL ON FUNCTION public.member_email_get_subscribed() FROM PUBLIC, anon;');
    expect(BODY).toContain('GRANT EXECUTE ON FUNCTION public.member_email_get_subscribed() TO authenticated;');
    expect(BODY).not.toMatch(/GRANT EXECUTE ON FUNCTION public\.member_email_\w+\([^)]*\) TO anon/);
  });

  test('the service-role functions are revoked from every client role', () => {
    for (const sig of ['member_email_audience()', 'member_email_members(text, integer, integer)', 'member_email_counts()', 'member_email_unsubscribe(uuid)']) {
      expect(BODY).toContain(`REVOKE ALL ON FUNCTION public.${sig} FROM PUBLIC, anon, authenticated;`);
      expect(BODY).toContain(`GRANT EXECUTE ON FUNCTION public.${sig} TO service_role;`);
    }
    expect(BODY).toContain('REVOKE ALL ON FUNCTION public._member_email_roster() FROM PUBLIC, anon, authenticated, service_role;');
    expect(BODY).not.toMatch(/GRANT EXECUTE ON FUNCTION public\._member_email_roster/);
  });

  test('set_subscribed: the caller only, source settings only, versioned, appends an event, re-subscribe clears the opt-out', () => {
    expect(SET_SUB).toContain('v_uid uuid := auth.uid();');
    expect(SET_SUB).toContain("IF _source IS DISTINCT FROM 'settings' THEN");
    expect(SET_SUB).toContain('char_length(_notice_version) NOT BETWEEN 1 AND 40');
    expect(SET_SUB).toContain('INSERT INTO public.member_email_pref_events');
    expect(SET_SUB).toMatch(/IF _subscribed THEN[\s\S]*DELETE FROM public\.marketing_email_optout o\s+WHERE o\.user_id = v_uid\s+OR \(v_email IS NOT NULL AND o\.email IS NOT NULL AND lower\(o\.email\) = lower\(v_email\)\)/);
    // An admin exclusion is the admin's decision: the member never lifts it.
    expect(SET_SUB).not.toContain('member_email_exclusions');
    expect(SET_SUB).not.toMatch(/WHERE user_id = _|_user_id/);
  });

  test('get_subscribed: true with no row, false under an opt-out row', () => {
    expect(GET_SUB).toContain("RETURN jsonb_build_object('subscribed', NOT v_optout);");
    expect(GET_SUB).toContain("'subscribed', v_row.subscribed AND NOT v_optout");
    expect(GET_SUB).toContain('v_uid uuid := auth.uid();');
  });
});

describe('who is emailed: the roster and the audience', () => {
  test('the roster: exclusions first, then turned off (prefs or opt-out by id or email), unconfirmed, paused, receives', () => {
    const order = ["THEN 'excluded'", "THEN 'turned_off'", "THEN 'unconfirmed'", "THEN 'paused'", "ELSE 'receives'"]
      .map((s) => ROSTER.indexOf(s));
    for (const at of order) expect(at).toBeGreaterThan(-1);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(ROSTER).toMatch(/FROM public\.member_email_exclusions x\s+WHERE x\.user_id = u\.id\s+OR \(x\.email IS NOT NULL AND u\.email IS NOT NULL AND lower\(x\.email\) = lower\(u\.email::text\)\)/);
    expect(ROSTER).toMatch(/FROM public\.member_email_prefs p\s+WHERE p\.user_id = u\.id AND p\.subscribed = false/);
    expect(ROSTER).toMatch(/FROM public\.marketing_email_optout o\s+WHERE o\.user_id = u\.id\s+OR \(o\.email IS NOT NULL AND u\.email IS NOT NULL AND lower\(o\.email\) = lower\(u\.email::text\)\)/);
    expect(ROSTER).toContain('u.email_confirmed_at IS NULL');
    expect(ROSTER).toContain('u.deleted_at IS NULL');
    expect(ROSTER).toContain('coalesce(u.is_anonymous, false) = false');
  });

  test('the wellbeing gate fails closed in the roster AND is re-checked in the audience', () => {
    expect(ROSTER).toContain("WHEN public._community_ed_flag_open(u.id) IS DISTINCT FROM false THEN 'paused'");
    expect(AUDIENCE).toContain('FROM public._member_email_roster() r');
    expect(AUDIENCE).toContain("WHERE r.status = 'receives'");
    expect(AUDIENCE).toContain('AND public._community_ed_flag_open(r.user_id) IS NOT DISTINCT FROM false');
    // No consent row is required: the audience never reads a yes.
    expect(AUDIENCE).not.toMatch(/subscribed = true/);
  });

  test('members and counts read the same roster; the search escapes LIKE wildcards and is capped at 50', () => {
    expect(MEMBERS).toContain('FROM public._member_email_roster() r');
    expect(MEMBERS).toContain('least(greatest(coalesce(_limit, 50), 1), 50)');
    expect(MEMBERS).toContain("LIKE v_pattern ESCAPE '\\'");
    expect(MEMBERS).toContain("replace(replace(replace(lower(v_q), '\\', '\\\\'), '%', '\\%'), '_', '\\_')");
    expect(COUNTS).toContain('FROM public._member_email_roster() r');
    for (const s of ['receives', 'excluded', 'turned_off', 'paused', 'unconfirmed']) {
      expect(COUNTS).toContain(`'${s}', count(*) FILTER (WHERE r.status = '${s}')`);
    }
  });

  test('unsubscribe: opt-out row with the email, prefs off with source email, one event on a change, gone account writes nothing', () => {
    expect(UNSUB).toContain('INSERT INTO public.marketing_email_optout (user_id, email, opted_out_at, source)');
    expect(UNSUB).toContain("VALUES (_user_id, false, 'email', NULL, now())");
    expect(UNSUB).toContain("SET subscribed = false, source = 'email', updated_at = now()");
    expect(UNSUB).toMatch(/IF NOT v_found OR v_prev\.subscribed IS DISTINCT FROM false THEN\s+INSERT INTO public\.member_email_pref_events/);
    expect(UNSUB).toMatch(/IF NOT FOUND THEN\s+RETURN jsonb_build_object\('ok', true, 'gone', true\);/);
  });
});

describe('acceptance block', () => {
  test('read-only and checks RLS, privileges, posture, the gate wiring and the secret', () => {
    // Comments and string literals (privilege names like 'INSERT') removed.
    const code = ACCEPT.split('\n').filter((l) => !l.trim().startsWith('--')).join('\n').replace(/'[^']*'/g, "''");
    expect(code).not.toMatch(/\b(INSERT|UPDATE|DELETE|ALTER|DROP|CREATE|GRANT|REVOKE)\b/);
    for (const t of TABLES) expect(ACCEPT).toContain(`'${t}'`);
    expect(ACCEPT).toContain('relrowsecurity');
    expect(ACCEPT).toContain("has_function_privilege('authenticated', 'public.member_email_audience()', 'EXECUTE')");
    expect(ACCEPT).toContain("has_function_privilege('anon', 'public.member_email_set_subscribed(boolean, text, text)', 'EXECUTE')");
    expect(ACCEPT).toContain("NOT ('search_path=public, pg_temp' = ANY (p.proconfig))");
    expect(ACCEPT).toContain("'_community_ed_flag_open(u.id) IS DISTINCT FROM false'");
    expect(ACCEPT).toContain("'_community_ed_flag_open(r.user_id) IS NOT DISTINCT FROM false'");
    expect(ACCEPT).toContain("value ~ '^[0-9a-f]{64}$'");
    expect(ACCEPT).toContain("RAISE NOTICE 'migrate_198 acceptance: OK';");
    // Counts only, never an address.
    expect(ACCEPT).not.toMatch(/RAISE NOTICE[^;]*email/i);
  });
});

describe('the file is registered in the tracker', () => {
  test('supabase/README.md carries the status entry and a ledger row marking 198 WRITTEN, NOT APPLIED', () => {
    const README = read('supabase/README.md');
    expect(README).toContain('- **198 WRITTEN, NOT APPLIED (2026-10-17, member email).**');
    const row = README.split('\n').find((l) => l.startsWith('| 198 | `migrate_198_member_email.sql` |'));
    expect(row).toBeDefined();
    expect(row).toContain('**WRITTEN, NOT APPLIED**');
    expect(row).toContain('run against production 198');
  });
});
