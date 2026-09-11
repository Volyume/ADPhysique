/**
 * migrate_171_community_friends_trained_today.sql keeps the house migration
 * shape and the RPC-only security posture (SD-14, exactly as 160-170).
 *
 * WHAT THIS SUITE PINS, and why every case is written to FAIL rather than
 * to pass: the file is WRITTEN, NOT APPLIED until the founder's "run against
 * production" lands, so nothing but source can check it. It pins the
 * mandatory header; re-runnability (CREATE OR REPLACE); SECURITY DEFINER on
 * the pinned search_path; EXECUTE reaching `authenticated` and nobody else;
 * that the function is STABLE and genuinely read-only (no rate-rail write,
 * no DML), which is the ONLY reason STABLE is allowed (migrate_167's
 * lesson); the `_today` contract of migrate_170 (validated when supplied,
 * UK-local fallback, never now()::date); and - the reason the suite exists -
 * that the eligibility predicate is community_board's `following` arm to
 * the letter (active, adult, sharing consistency, counters inside fourteen
 * days, not blocked either way, an accepted follow) with the caller's own
 * row excluded, so this count can never say more than the caller's own
 * Following board already shows. Finally, that the tracker and the security
 * matrix both know the function.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const SQL = fs.readFileSync(
  path.join(ROOT, 'supabase', 'migrate_171_community_friends_trained_today.sql'), 'utf8',
);
const CODE = SQL.split('\n').filter((l) => !l.trim().startsWith('--')).join('\n');
const HEADER = SQL.slice(0, SQL.indexOf('-- ─── Part 1'));
const FN_START = CODE.indexOf('CREATE OR REPLACE FUNCTION public.community_friends_trained_today');
const FN_END = CODE.indexOf('$function$;', FN_START);
const FN = CODE.slice(FN_START, FN_END);

describe('house migration shape', () => {
  test('the header carries every mandatory field', () => {
    for (const field of ['Purpose:', 'Applied locally:', 'Applied remotely:', 'Safe to re-run:', 'Rollback:', 'Depends on:']) {
      expect(HEADER).toContain(field);
    }
    expect(HEADER).toContain('run against production');
  });

  test('the function is created with CREATE OR REPLACE (re-runnable)', () => {
    expect(FN_START).toBeGreaterThan(-1);
    expect(CODE).not.toMatch(/CREATE FUNCTION\s+public\.community_friends_trained_today/);
  });
});

describe('RPC-only security posture', () => {
  test('SECURITY DEFINER on the pinned search_path', () => {
    expect(FN).toMatch(/SECURITY DEFINER/);
    expect(FN).toMatch(/SET search_path TO 'public', 'pg_temp'/);
  });

  test('EXECUTE reaches authenticated and nobody else', () => {
    expect(CODE).toMatch(/REVOKE ALL ON FUNCTION public\.community_friends_trained_today\(text\) FROM PUBLIC, anon;/);
    expect(CODE).toMatch(/GRANT EXECUTE ON FUNCTION public\.community_friends_trained_today\(text\) TO authenticated;/);
    expect(CODE).not.toMatch(/GRANT[^;]*TO anon/);
  });

  test('STABLE, and genuinely read-only: no rate-rail write and no DML', () => {
    expect(FN).toMatch(/\nSTABLE\n/);
    expect(FN).not.toMatch(/_community_rate_check/);
    expect(FN).not.toMatch(/\b(INSERT|UPDATE|DELETE)\b/);
  });

  test('the acceptance block proves STABLE, not VOLATILE', () => {
    expect(CODE).toMatch(/provolatile = 's'/);
  });
});

describe('the _today contract (migrate_170)', () => {
  test('a supplied day is validated as YYYY-MM-DD and refused when malformed', () => {
    expect(FN).toMatch(/_today !~ '\^\\d\{4\}-\\d\{2\}-\\d\{2\}\$'/);
    expect(FN).toMatch(/RAISE EXCEPTION USING message = 'invalid_input'/);
  });

  test('an absent day falls back to the UK-local day, never now()::date', () => {
    expect(FN).toContain("to_char(timezone('Europe/London', now()), 'YYYY-MM-DD')");
    expect(FN).not.toMatch(/now\(\)::date/);
  });
});

describe("community_board's following arm, to the letter, minus the caller", () => {
  test.each([
    ['the caller is never counted', /p\.user_id <> v_uid/],
    ['active profiles only', /p\.status = 'active'/],
    ['never a minor', /p\.is_minor = false/],
    ['consent: sharing consistency', /p\.share_consistency = true/],
    ['counters published inside fourteen days', /p\.c_updated_at >= now\(\) - interval '14 days'/],
    ['the day-level test', /p\.c_last_trained_day = v_today/],
    ['blocked in either direction excluded', /NOT public\._community_is_blocked\(v_uid, p\.user_id\)/],
    ['an accepted follow from the caller', /f\.follower_id = v_uid AND f\.followee_id = p\.user_id AND f\.state = 'accepted'/],
  ])('%s', (_name, re) => {
    expect(FN).toMatch(re);
  });

  test('the caller must hold a joined, unsuspended profile (the board\'s own gate)', () => {
    expect(FN).toMatch(/_community_require_profile\(v_uid, false\)/);
  });

  test('capped at 999, the client\'s own clamp', () => {
    expect(FN).toMatch(/least\(coalesce\(v_n, 0\), 999\)/);
  });

  test('returns an integer and nothing else (never a card)', () => {
    expect(FN).toMatch(/RETURNS integer/);
    expect(FN).not.toMatch(/_community_profile_card/);
    expect(FN).not.toMatch(/\bhandle\b/);
  });
});

describe('the file is registered in the tracker and the security matrix', () => {
  test('supabase/README.md carries the status entry and a ledger row', () => {
    const README = fs.readFileSync(path.join(ROOT, 'supabase', 'README.md'), 'utf8');
    expect(README).toMatch(/171 (WRITTEN, NOT APPLIED|APPLIED)/);
    expect(README).toContain('| 171 | `migrate_171_community_friends_trained_today.sql` |');
  });

  test('community_friends_trained_today is inventoried as a client RPC', () => {
    const inventory = JSON.parse(fs.readFileSync(path.join(
      ROOT, 'scripts', 'security', 'supabase-matrix.targets.json',
    ), 'utf8'));
    expect(inventory.clientRpcNames).toContain('community_friends_trained_today');
  });
});
