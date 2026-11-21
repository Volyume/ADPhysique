/**
 * migrate_204 (new account outcomes) source guards (LOC-661,
 * docs/growth-totals/SPEC.md). The migration is written for the founder to
 * apply and never applied by an agent. Pins that it stays the smallest
 * read-only addition: one aggregate view and one STABLE function, service
 * role only, reading telemetry and never the safety flags, and that it does
 * not re-issue the existing digest. Its behaviour (read-only transaction,
 * client roles refused, counts against direct SQL) was checked on a scratch
 * PostgreSQL 17 with migrate_200 and synthetic rows; that run is recorded on
 * LOC-661.
 */
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '../../supabase');
const SQL = fs.readFileSync(path.join(dir, 'migrate_204_new_account_outcomes.sql'), 'utf8');
const code = SQL.replace(/^\s*--.*$/gm, '');

describe('migrate_204 new account outcomes', () => {
  it('carries the required header notes and is marked not applied', () => {
    ['Purpose:', 'Applied locally:', 'Applied remotely:', 'Safe to re-run:', 'Rollback:'].forEach((h) => expect(SQL).toContain(h));
    expect(SQL).toMatch(/Applied remotely:\s+NOT APPLIED/);
  });

  it('is the only migration numbered 204', () => {
    const numbers = fs.readdirSync(dir).map((f) => /^migrate_(\d+)_/.exec(f)).filter(Boolean).map((m) => Number(m[1]));
    expect(numbers.filter((n) => n === 204)).toHaveLength(1);
  });

  it('only reads: no table, row or existing object is changed', () => {
    expect(code).not.toMatch(/\b(INSERT|UPDATE|DELETE|TRUNCATE|ALTER|DROP|CREATE TABLE|CREATE INDEX|CREATE TRIGGER|cron\.)\b/i);
    expect(code.match(/CREATE OR REPLACE (VIEW|FUNCTION) public\.(\w+)/g)).toEqual([
      'CREATE OR REPLACE VIEW public.v_new_account_outcomes',
      'CREATE OR REPLACE FUNCTION public.telemetry_new_account_outcomes',
    ]);
    expect(code).not.toMatch(/telemetry_weekly_digest/);
  });

  it('reads telemetry only, never the safety flags or anything outside the telemetry', () => {
    expect(code).not.toMatch(/ed_pattern_flags|auth\.users|profiles|workouts\b|food_entries|checkins/);
    const tables = [...new Set((code.match(/FROM public\.(\w+)/g) || []).map((t) => t.slice(12)))].sort();
    expect(tables).toEqual(['engine_telemetry', 'v_user_signups']);
  });

  it('returns counts only, with no identifier column', () => {
    const select = code.slice(code.indexOf('SELECT date_trunc'), code.indexOf('FROM per_person'));
    expect(select).not.toMatch(/user_id/);
    expect(select.match(/ AS (\w+)/g).map((a) => a.slice(4))).toEqual([
      'signup_week', 'app_version', 'new_accounts', 'first_workout_14d', 'window_14d_closed', 'three_workouts_14d',
      'eligible_day_7', 'trained_after_day_7', 'eligible_day_14', 'trained_after_day_14', 'eligible_day_30', 'trained_after_day_30',
    ]);
  });

  it('counts three workouts only once the 14 days are over, as the app defines activation', () => {
    expect(code).toMatch(/count\(\*\) FILTER \(WHERE p\.signed_up_at < now\(\) - interval '14 days' AND p\.workouts_14d >= 3\) AS three_workouts_14d/);
    expect(code).toMatch(/w\.occurred_at >= u\.signed_up_at\s+AND w\.occurred_at < u\.signed_up_at \+ interval '14 days'/);
    const activation = fs.readFileSync(path.join(__dirname, '../lib/activation.js'), 'utf8');
    expect(activation).toMatch(/ACTIVATION_TARGET_SESSIONS = 3;/);
    expect(activation).toMatch(/ACTIVATION_WINDOW_DAYS = 14;/);
  });

  it('is service role only, and the function is STABLE so PostgREST runs it read only', () => {
    expect(code).toMatch(/REVOKE ALL ON public\.v_new_account_outcomes FROM PUBLIC, anon, authenticated;/);
    expect(code).toMatch(/GRANT SELECT ON public\.v_new_account_outcomes TO service_role;/);
    expect(code).toMatch(/REVOKE ALL ON FUNCTION public\.telemetry_new_account_outcomes\(int\) FROM PUBLIC, anon, authenticated;/);
    expect(code).toMatch(/GRANT EXECUTE ON FUNCTION public\.telemetry_new_account_outcomes\(int\) TO service_role;/);
    expect(code).not.toMatch(/TO (anon|authenticated)\b/);
    const fn = code.slice(code.indexOf('CREATE OR REPLACE FUNCTION'));
    expect(fn).toMatch(/LANGUAGE sql\s+STABLE\s+SECURITY DEFINER\s+SET search_path = public/);
  });
});
