/**
 * migrate_201 (gym challenge) source guards. Pins the safety and privacy
 * promises the founder approved ("Go as written", 2026-10-19,
 * docs/gym-challenge-2026-10-19/SPEC.md section 3.3):
 *  - food and weigh-ins score on "a row exists" only: no calorie, amount or
 *    weight value is ever read;
 *  - the migrate_180 gate (open ED flag or calm mode) gives food and
 *    weigh-in in full, hides the person from the board and withholds the
 *    board and the gym invite from them;
 *  - the tables are RPC only, and the founder operations (close, results
 *    with email, draw) are service role only;
 *  - the migration is additive.
 * The scoring arithmetic itself is tested against Postgres (SPEC section 8).
 */
const fs = require('fs');
const path = require('path');

const SQL = fs.readFileSync(
  path.join(__dirname, '../../supabase/migrate_201_gym_challenges.sql'), 'utf8');
const body = (name) => {
  const start = SQL.indexOf(`CREATE OR REPLACE FUNCTION public.${name}(`);
  expect(start).toBeGreaterThan(-1);
  const end = SQL.indexOf('END $$;', start);
  return SQL.slice(start, end);
};

describe('migrate_201 gym challenge', () => {
  it('is additive: nothing is dropped, altered or deleted outside its own tables', () => {
    const code = SQL.replace(/^\s*--.*$/gm, '');
    expect(code).not.toMatch(/\bDROP\s+(TABLE|FUNCTION|COLUMN|INDEX)/i);
    expect(code).not.toMatch(/\bALTER\s+TABLE\s+(?!public\.(?:gym_challenge|free_for_life_grants))/i);
    expect(code).not.toMatch(/\b(UPDATE|DELETE\s+FROM|INSERT\s+INTO)\s+public\.(?!gym_challenge|free_for_life_grants)/i);
  });

  it('never reads a food amount, a calorie or a body weight value', () => {
    const score = body('_gym_challenge_score');
    expect(score).not.toMatch(/\b(kcal|calories|protein_g|carbs_g|fat_g|quantity_g)\b/);
    expect(score).not.toMatch(/weight_kg/);
    // body_weight only as a presence check
    const bw = score.match(/body_weight[^\n]*/g) || [];
    expect(bw.length).toBeGreaterThan(0);
    bw.forEach((line) => expect(line).toMatch(/body_weight IS NOT NULL/));
    // workout_sets.weight is the lifting load, used only for the strength estimate
    expect(score).toMatch(/s\.weight \* \(1 \+ s\.actual_reps \/ 30\.0\)/);
  });

  it('caps logging: 3 food days and one weigh-in per 7-day block', () => {
    const score = body('_gym_challenge_score');
    expect(score).toMatch(/round\(3 \* r\.f\)/);
    expect(score).toMatch(/v_weigh_hits := v_weigh_hits \+ 1/);
  });

  it('the migrate_180 gate is read by day and credits food and weigh-in on withheld days (review round 1, B2)', () => {
    const score = body('_gym_challenge_score');
    // never once for the month: an ED flag's own history, the hourly readings, and today
    expect(score).toMatch(/FROM public\.ed_pattern_flags f[\s\S]{0,200}raised_at[\s\S]{0,200}cleared_at/);
    expect(score).toMatch(/FROM public\.gym_challenge_gate_days gd/);
    expect(score).toMatch(/g\.d = v_today AND v_now/);
    // a withheld day counts as a food day and a weigh-in week
    expect(score).toMatch(/UNION\s+SELECT w\.d FROM pg_temp\._gc_w w WHERE w\.d BETWEEN r\.bs AND r\.be/);
    expect(score).toMatch(/IF EXISTS \(SELECT 1 FROM pg_temp\._gc_w w WHERE w\.d BETWEEN r\.bs AND r\.be\)/);
    // the hourly reading exists and is scheduled
    expect(SQL).toMatch(/cron\.schedule\('gym-challenge-gate-readings', '7 \* \* \* \*'/);
    // the screen always gets the gate now, even after close
    expect(body('gym_challenge_score')).toMatch(/'withheld', public\._community_consistency_withheld\(v_uid\)/);
  });

  it('a withdrawn entrant is never scored again, and only winners carry an email (review round 1, M2)', () => {
    const r = body('gym_challenge_results');
    expect(r).toMatch(/CASE WHEN e\.withdrawn_at IS NULL\s+THEN public\._gym_challenge_entrant_score\(v_c, e\) END/);
    expect(r).toMatch(/e\.user_id = ANY \(d\.winners\)\)\s+THEN u\.email::text END/);
  });

  it('a withheld person is never listed, and a withheld viewer gets no board or invite', () => {
    const board = body('gym_challenge_board');
    expect(board).toMatch(/IF public\._community_consistency_withheld\(v_uid\) THEN RETURN NULL; END IF;/);
    expect(board).toMatch(/AND NOT public\._community_consistency_withheld\(e\.user_id\)/);
    expect(board).toMatch(/WHERE listable ORDER BY score DESC, joined_at LIMIT 10/);
    expect(body('gym_challenge_for_my_gym')).toMatch(/_community_consistency_withheld\(v_uid\)/);
  });

  it('adults only', () => {
    const join = body('gym_challenge_join');
    expect(join).toMatch(/IF _adult IS NOT TRUE THEN RAISE EXCEPTION USING message = 'not_allowed'/);
    expect(join).toMatch(/_gym_challenge_is_minor\(v_uid\)/);
    expect(body('gym_challenge_draw')).toMatch(/NOT public\._gym_challenge_is_minor\(e\.user_id\)/);
  });

  it('tables are RPC only', () => {
    ['gym_challenges', 'gym_challenge_entrants', 'gym_challenge_draws', 'free_for_life_grants', 'gym_challenge_gate_days'].forEach((t) => {
      expect(SQL).toMatch(new RegExp(`ALTER TABLE public\\.${t}\\s+ENABLE ROW LEVEL SECURITY`));
    });
    expect(SQL).toMatch(/REVOKE ALL ON public\.gym_challenges, public\.gym_challenge_entrants, public\.gym_challenge_draws,\s+public\.free_for_life_grants, public\.gym_challenge_gate_days FROM PUBLIC, anon, authenticated;/);
  });

  it('founder operations are service role only; only the landing page is anon', () => {
    ['gym_challenge_close(uuid, boolean)', 'gym_challenge_results(uuid)', 'gym_challenge_draw(uuid, text, int)'].forEach((sig) => {
      const esc = sig.replace(/[()]/g, '\\$&');
      expect(SQL).toMatch(new RegExp(`REVOKE ALL ON FUNCTION public\\.${esc} FROM PUBLIC, anon, authenticated;`));
      expect(SQL).toMatch(new RegExp(`GRANT EXECUTE ON FUNCTION public\\.${esc} TO service_role;`));
    });
    const anonGrants = SQL.match(/GRANT EXECUTE ON FUNCTION [^\n]* TO anon[^\n]*/g) || [];
    expect(anonGrants).toEqual(['GRANT EXECUTE ON FUNCTION public.gym_challenge_public(text) TO anon, authenticated;']);
    expect(body('gym_challenge_public')).toMatch(/RETURN public\._gym_challenge_json\(v_c\) - 'id' - 'entrants';/);
    expect(SQL).toMatch(/GRANT EXECUTE ON FUNCTION public\.gym_challenge_create\([^)]*\)\s+TO service_role;/);
  });

  it('joining records the free-for-life promise, and nothing removes it', () => {
    expect(body('gym_challenge_join')).toMatch(/INSERT INTO public\.free_for_life_grants \(user_id, source, source_code\)/);
    expect(SQL).not.toMatch(/(DELETE FROM|UPDATE)\s+public\.free_for_life_grants/i);
    expect(SQL).toMatch(/public\.free_for_life_grants, public\.gym_challenge_gate_days FROM PUBLIC, anon, authenticated;/);
  });

  it('carries the required header notes', () => {
    ['Purpose:', 'Applied locally:', 'Applied remotely:  NO', 'Safe to re-run:', 'Rollback:'].forEach((h) => {
      expect(SQL).toContain(h);
    });
  });
});
