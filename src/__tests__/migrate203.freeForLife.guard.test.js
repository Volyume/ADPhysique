/**
 * migrate_203 (free for life on completion) source guards. Pins the founder
 * answer of 2026-10-20 (Stage 2, item 34): free for life is earned by a
 * final score of 50 or more when the challenge closes, never by joining, and
 * withdrawing ends the chance. The migration is written, never applied here.
 */
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '../../supabase');
const SQL = fs.readFileSync(path.join(dir, 'migrate_203_free_for_life_on_completion.sql'), 'utf8');
const body = (name) => {
  const start = SQL.indexOf(`CREATE OR REPLACE FUNCTION public.${name}(`);
  expect(start).toBeGreaterThan(-1);
  return SQL.slice(start, SQL.indexOf('END $$;', start));
};

describe('migrate_203 free for life on completion', () => {
  it('carries the required header notes and is not applied', () => {
    ['Purpose:', 'Applied locally:', 'Safe to re-run:', 'Rollback:'].forEach((h) => expect(SQL).toContain(h));
    expect(SQL).toMatch(/Applied remotely:\s+NOT applied/);
  });

  it('the join RPC no longer writes a grant or returns the flag, and keeps the age guards', () => {
    const join = body('gym_challenge_join');
    expect(join).not.toMatch(/free_for_life_grants/);
    expect(join).not.toMatch(/free_for_life/);
    expect(join).toMatch(/IF _adult IS NOT TRUE THEN RAISE EXCEPTION USING message = 'not_allowed'/);
    expect(join).toMatch(/IF public\._gym_challenge_is_minor\(v_uid\) THEN RAISE EXCEPTION USING message = 'not_allowed'/);
  });

  it('the only grant insert is in the close step: closed, not withdrawn, final score 50 or more', () => {
    const code = SQL.replace(/^\s*--.*$/gm, '');
    expect(code.match(/INSERT INTO public\.free_for_life_grants/g)).toHaveLength(1);
    const g = body('gym_challenge_grant_free_for_life');
    expect(g).toMatch(/INSERT INTO public\.free_for_life_grants \(user_id, source, source_code\)/);
    expect(g).toMatch(/v_c\.status <> 'closed' THEN RAISE EXCEPTION/);
    expect(g).toMatch(/e\.withdrawn_at IS NULL/);
    expect(g).toMatch(/e\.final_score >= 50/);
    expect(g).toMatch(/NOT public\._gym_challenge_is_minor\(e\.user_id\)/);
    expect(g).toMatch(/ON CONFLICT \(user_id\) DO NOTHING/);
    expect(g).not.toMatch(/_gym_challenge_score\(/); // reads the frozen score, never rescoring
  });

  it('close freezes the existing scoring, then grants', () => {
    const c = body('gym_challenge_close');
    expect(c).toMatch(/final_score = \(public\._gym_challenge_score\(v_c, e\) ->> 'total'\)::int/);
    expect(c.indexOf("status = 'closed'")).toBeLessThan(c.indexOf('gym_challenge_grant_free_for_life'));
  });

  it('is founder and service role only, tables stay closed, nothing is dropped or removed', () => {
    expect(SQL).toMatch(/REVOKE ALL ON FUNCTION public\.gym_challenge_grant_free_for_life\(uuid\) FROM PUBLIC, anon, authenticated;/);
    expect(SQL).toMatch(/GRANT EXECUTE ON FUNCTION public\.gym_challenge_grant_free_for_life\(uuid\) TO service_role;/);
    expect(SQL).toMatch(/GRANT EXECUTE ON FUNCTION public\.gym_challenge_close\(uuid, boolean\) TO service_role;/);
    expect(SQL).toMatch(/GRANT EXECUTE ON FUNCTION public\.gym_challenge_join\([^)]*\) TO authenticated;/);
    const grants = SQL.match(/GRANT EXECUTE ON FUNCTION [^\n]* TO [^\n]*/g);
    grants.forEach((l) => expect(l).not.toMatch(/\banon\b/));
    expect(SQL.match(/SECURITY DEFINER\s+SET search_path = public, pg_temp/g)).toHaveLength(3);
    const code = SQL.replace(/^\s*--.*$/gm, '');
    expect(code).not.toMatch(/\bDROP\s+(TABLE|COLUMN|INDEX)|\bDELETE\s+FROM|\bTRUNCATE|\bALTER\s+TABLE|\bUPDATE\s+public\.free_for_life_grants/i);
  });

  it('no other migration claims 203', () => {
    expect(fs.readdirSync(dir).filter((f) => /^migrate_203_/.test(f))).toEqual(['migrate_203_free_for_life_on_completion.sql']);
  });
});
