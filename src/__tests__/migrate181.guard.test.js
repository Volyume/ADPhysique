/**
 * migrate181.guard.test.js - the gym moderation listing RPCs (founder order
 * 2026-09-22 item 7, B-03; audit docs/audit/community-audit-2026-09-22/
 * B-functionality-backend-safety-engineering.md).
 *
 * WHAT THIS SUITE PINS, and why every case is written to FAIL: the file is
 * WRITTEN, NOT APPLIED until the founder's phrase, so only source can check
 * it, following migrate177.guard.test.js's pattern.
 *
 * Unlike 176/177/178 (which re-issue an existing function byte-for-byte with
 * a marked addition), THIS migration makes NO CHANGE to `gyms_review_
 * submission` or `gyms_review_report` at all: the fact-finding this task
 * required established that both ALREADY check `community_is_moderator()`
 * and ALREADY carry the authenticated-only grant (migrate_162, APPLIED).
 * So the "byte-for-byte" proof this suite pins is the mirror image of
 * migrate177's: that migrate_181 contains NO re-issue of either name at
 * all, AND that migrate_162's live source (read directly, not trusted from
 * this file's own header prose) still shows both preconditions true. A
 * regression here would mean either migrate_181 quietly started touching a
 * function it was told never to touch, or migrate_162 was edited out from
 * under this migration's own stated justification.
 *
 * The rest pins the two brand-new RPCs exactly the way migrate171's
 * (community_friends_trained_today) acceptance block does: SECURITY
 * DEFINER, pinned search_path, STABLE, the moderator refusal, the exact
 * grant shape, and the fields a moderator needs (never a submitter's or
 * reporter's identity beyond a count).
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

const SQL = read('supabase/migrate_181_gym_moderation_lists.sql');
const SQL162 = read('supabase/migrate_162_gym_directory.sql');
const HEADER = SQL.slice(0, SQL.indexOf('-- ─── Part 1'));
// Statement lines only (same convention as community.rpcOnly.guard.test.js):
// this migration's own Rollback comment names "DROP FUNCTION" (the true,
// honest rollback for a brand-new function, matching migrate_171's
// precedent) - unlike migrate176/177/178, which never need that word
// because they only ever re-issue an EXISTING function. A comment-only
// raw-text scan would false-positive on that prose, so the destructive-
// statement checks below run against CODE, never HEADER or SQL directly.
const CODE_LINES = SQL.split('\n').filter((l) => !l.trim().startsWith('--'));
const CODE = CODE_LINES.join('\n');

function fnSpan(text, startMarker) {
  const start = text.indexOf(startMarker);
  expect(start).toBeGreaterThan(-1);
  const end = text.indexOf('END $$;', start) + 'END $$;'.length;
  return text.slice(start, end);
}

const PENDING_SUBMISSIONS = fnSpan(SQL, 'CREATE OR REPLACE FUNCTION public.gyms_pending_submissions(');
const PENDING_REPORTS = fnSpan(SQL, 'CREATE OR REPLACE FUNCTION public.gyms_pending_reports(');

describe('house migration shape', () => {
  test('the header carries every mandatory field', () => {
    for (const field of ['Purpose:', 'Applied locally:', 'Applied remotely:', 'Safe to re-run:', 'Rollback:', 'Transaction:', 'Depends on:']) {
      expect(HEADER).toContain(field);
    }
    expect(HEADER).toContain('run against production');
    expect(HEADER).toMatch(/Applied remotely:\s+YES - 2026-09-24 15:23 UTC \(written 2026-09-23\)/);
  });

  test('no new table, no DROP, no destructive statement, no RLS toggle', () => {
    expect(CODE).not.toMatch(/CREATE TABLE/i);
    expect(CODE).not.toMatch(/DROP\s+TABLE/i);
    expect(CODE).not.toMatch(/TRUNCATE/i);
    expect(CODE).not.toMatch(/ENABLE ROW LEVEL SECURITY/i);
    expect(CODE).not.toMatch(/DISABLE ROW LEVEL SECURITY/i);
    expect(CODE).not.toMatch(/\bDROP\b/i);
    expect(CODE).not.toMatch(/CREATE POLICY/i);
  });

  test('the only "DROP" anywhere is prose in the Rollback comment, naming the two new functions', () => {
    expect(HEADER).toMatch(/Rollback:\s+DROP FUNCTION public\.gyms_pending_submissions\(int, text\);/);
    expect(HEADER).toMatch(/DROP FUNCTION public\.gyms_pending_reports\(int, text\);/);
  });

  test('the file is registered in the tracker', () => {
    const README = read('supabase/README.md');
    expect(README).toMatch(/\| 181 \|[^\n]*\*\*APPLIED 2026-09-24 15:23 UTC\*\*/);
    expect(README).toContain('| 181 | `migrate_181_gym_moderation_lists.sql` |');
  });
});

describe('migrate_181 makes NO CHANGE to gyms_review_submission or gyms_review_report', () => {
  test('this file declares no such function at all', () => {
    expect(SQL).not.toMatch(/FUNCTION\s+public\.gyms_review_submission/);
    expect(SQL).not.toMatch(/FUNCTION\s+public\.gyms_review_report/);
  });

  test('this file only declares the two new listing RPCs', () => {
    const declared = [...SQL.matchAll(/CREATE OR REPLACE FUNCTION\s+public\.([a-z_0-9]+)\s*\(/g)]
      .map((m) => m[1]);
    expect(declared).toEqual(['gyms_pending_submissions', 'gyms_pending_reports']);
  });

  // The claim this migration's header makes is re-proved here directly
  // against migrate_162's live source, not merely trusted from prose:
  // both preconditions this task was asked to check are independently
  // re-read every time this guard runs.
  test('migrate_162 (APPLIED) already gates both review RPCs on community_is_moderator()', () => {
    for (const fn of ['gyms_review_submission', 'gyms_review_report']) {
      const at = SQL162.indexOf(`CREATE OR REPLACE FUNCTION public.${fn}(`);
      expect(at).toBeGreaterThan(-1);
      const nextFn = SQL162.indexOf('CREATE OR REPLACE FUNCTION public.', at + 10);
      const body = SQL162.slice(at, nextFn === -1 ? SQL162.length : nextFn);
      expect(body).toContain('IF NOT public.community_is_moderator() THEN');
      expect(body).toContain("RAISE EXCEPTION USING message = 'not_allowed'");
    }
  });

  test('migrate_162 already grants EXECUTE on both review RPCs to authenticated only', () => {
    const loopAt = SQL162.lastIndexOf("FOREACH sig IN ARRAY ARRAY[");
    const loopEnd = SQL162.indexOf('END $$;', loopAt);
    const loop = SQL162.slice(loopAt, loopEnd);
    expect(loop).toContain("'gyms_review_submission(uuid, text, uuid)'");
    expect(loop).toContain("'gyms_review_report(uuid, text)'");
    expect(loop).toContain("REVOKE ALL ON FUNCTION public.%s FROM PUBLIC, anon'");
    expect(loop).toContain("GRANT EXECUTE ON FUNCTION public.%s TO authenticated'");
  });

  test('no later migration between 162 and 181 touches either name (163, 167, 168 are the ones that ever re-issue gyms_* functions)', () => {
    for (const file of [
      'supabase/migrate_163_community_place_and_finder.sql',
      'supabase/migrate_167_gyms_stable_volatility_fix.sql',
      'supabase/migrate_168_gym_finder_relevance_and_order_fix.sql',
    ]) {
      const src = read(file);
      expect(src).not.toMatch(/gyms_review_submission/);
      expect(src).not.toMatch(/gyms_review_report/);
    }
  });
});

describe('both new RPCs are pinned SECURITY DEFINER, STABLE, moderator-gated', () => {
  test.each([
    ['gyms_pending_submissions', () => PENDING_SUBMISSIONS],
    ['gyms_pending_reports', () => PENDING_REPORTS],
  ])('%s is SECURITY DEFINER, STABLE, with the pinned search_path', (_name, get) => {
    const fn = get();
    expect(fn).toMatch(/SECURITY DEFINER/);
    expect(fn).toMatch(/SET search_path = public, pg_temp/);
    expect(fn).toMatch(/\bSTABLE\b/);
  });

  test.each([
    ['gyms_pending_submissions', () => PENDING_SUBMISSIONS],
    ['gyms_pending_reports', () => PENDING_REPORTS],
  ])('%s refuses not_allowed unless community_is_moderator()', (_name, get) => {
    const fn = get();
    expect(fn).toContain('IF NOT public.community_is_moderator() THEN');
    expect(fn).toContain("RAISE EXCEPTION USING message = 'not_allowed'");
  });

  test('signatures are exactly (_limit int DEFAULT 20, _cursor text DEFAULT NULL)', () => {
    expect(SQL).toContain(
      'CREATE OR REPLACE FUNCTION public.gyms_pending_submissions(\n  _limit int DEFAULT 20, _cursor text DEFAULT NULL)',
    );
    expect(SQL).toContain(
      'CREATE OR REPLACE FUNCTION public.gyms_pending_reports(\n  _limit int DEFAULT 20, _cursor text DEFAULT NULL)',
    );
  });

  test('both reuse the existing Community keyset-cursor helpers, never inventing a new cursor format', () => {
    for (const fn of [PENDING_SUBMISSIONS, PENDING_REPORTS]) {
      expect(fn).toContain('public._community_cursor_parts(_cursor)');
      expect(fn).toContain('public._community_cursor_of(v_lts, v_lid)');
      expect(fn).toContain('public._community_limit(_limit)');
    }
  });

  test('neither RPC applies _gyms_visible: a moderator sees every pending row', () => {
    for (const fn of [PENDING_SUBMISSIONS, PENDING_REPORTS]) {
      expect(fn).not.toContain('_gyms_visible');
    }
  });

  test('neither RPC calls a write path (STABLE is accurate, not merely declared)', () => {
    for (const fn of [PENDING_SUBMISSIONS, PENDING_REPORTS]) {
      expect(fn).not.toMatch(/_community_rate_check/);
      expect(fn).not.toMatch(/\bINSERT INTO\b/);
      expect(fn).not.toMatch(/\bUPDATE\s+public\./);
      expect(fn).not.toMatch(/\bDELETE FROM\b/);
    }
  });
});

describe('grants: authenticated only, PUBLIC and anon revoked, exactly once each', () => {
  test('the grant statements are present and exact', () => {
    expect(SQL).toContain('REVOKE ALL ON FUNCTION public.gyms_pending_submissions(int, text) FROM PUBLIC, anon;');
    expect(SQL).toContain('GRANT EXECUTE ON FUNCTION public.gyms_pending_submissions(int, text) TO authenticated;');
    expect(SQL).toContain('REVOKE ALL ON FUNCTION public.gyms_pending_reports(int, text) FROM PUBLIC, anon;');
    expect(SQL).toContain('GRANT EXECUTE ON FUNCTION public.gyms_pending_reports(int, text) TO authenticated;');
  });

  test('each is granted exactly once, never widened to anon or PUBLIC', () => {
    expect(SQL.match(/GRANT EXECUTE ON FUNCTION public\.gyms_pending_submissions/g)).toHaveLength(1);
    expect(SQL.match(/GRANT EXECUTE ON FUNCTION public\.gyms_pending_reports/g)).toHaveLength(1);
    expect(SQL).not.toMatch(/GRANT EXECUTE ON FUNCTION public\.gyms_pending_submissions[^;]*\banon\b/);
    expect(SQL).not.toMatch(/GRANT EXECUTE ON FUNCTION public\.gyms_pending_reports[^;]*\banon\b/);
  });

  test('the security matrix inventory lists both new RPCs', () => {
    const inventory = JSON.parse(read('scripts/security/supabase-matrix.targets.json'));
    expect(inventory.clientRpcNames).toContain('gyms_pending_submissions');
    expect(inventory.clientRpcNames).toContain('gyms_pending_reports');
  });
});

describe('the return shapes carry exactly what a moderator needs, never an identity beyond a count', () => {
  test('gyms_pending_submissions: name, address_line, town, postcode, website, operator, confirmation_count, created_at', () => {
    for (const field of ['id', 'name', 'address_line', 'town', 'postcode', 'website', 'operator', 'confirmation_count', 'created_at']) {
      expect(PENDING_SUBMISSIONS).toContain(`'${field}'`);
    }
    expect(PENDING_SUBMISSIONS).toContain("'confirmation_count', page.confirmations");
    expect(PENDING_SUBMISSIONS).not.toMatch(/submitter_id/);
    expect(PENDING_SUBMISSIONS).toContain("s.status = 'pending'");
  });

  test('gyms_pending_reports: venue_id, venue_name, reason, detail, reporter_count, created_at', () => {
    for (const field of ['id', 'venue_id', 'venue_name', 'reason', 'detail', 'reporter_count', 'created_at']) {
      expect(PENDING_REPORTS).toContain(`'${field}'`);
    }
    expect(PENDING_REPORTS).toContain("'reason',         page.kind");
    expect(PENDING_REPORTS).toContain('count(DISTINCT rc.reporter_id)');
    expect(PENDING_REPORTS).not.toMatch(/'reporter_id'/);
    expect(PENDING_REPORTS).toContain("r.status = 'open'");
  });

  test('both return their list under the documented key plus an opaque cursor', () => {
    expect(PENDING_SUBMISSIONS).toMatch(/RETURN jsonb_build_object\(\s*'submissions',/);
    expect(PENDING_REPORTS).toMatch(/RETURN jsonb_build_object\(\s*'reports',/);
  });
});

describe('acceptance check exists and is read-only', () => {
  test('checks existence, SECURITY DEFINER/search_path, STABLE and the grant matrix', () => {
    const acceptance = SQL.slice(SQL.indexOf('-- ─── Part 3'));
    expect(acceptance).toContain("to_regprocedure('public.gyms_pending_submissions(int, text)')");
    expect(acceptance).toContain("to_regprocedure('public.gyms_pending_reports(int, text)')");
    expect(acceptance).toContain('has_function_privilege');
    // Review F1 (2026-09-23): `= ANY (NULL)` is NULL, not false, so a
    // function with NO SET clause would slip past a check that omits
    // the explicit NULL arm (the hostile-review fix 173-180 all carry).
    expect(acceptance).toContain('OR p.proconfig IS NULL');
    expect(acceptance).toContain("'search_path=public, pg_temp' = ANY (p.proconfig)");
    expect(acceptance).not.toMatch(/\bINSERT\b|\bUPDATE\b|\bDELETE\b/);
  });
});
