/**
 * Contract guard for migration 071 (trial ledger, trial-abuse prevention).
 *
 * The 14-day cardless trial was anchored to users_profile.trial_state, which
 * account-delete wipes, so delete + re-signup restarted the trial. Migration
 * 071 adds a private.trial_ledger (salted email hash) that survives deletion
 * and makes start_cascade refuse a second cardless trial for the same email.
 *
 * These source-grep assertions lock the contract so a future edit cannot
 * silently regress it (including back to the superuser-only
 * session_replication_role bypass that threw on hosted Supabase before 068).
 */
import fs from 'fs';
import path from 'path';

const SQL = fs.readFileSync(
  path.resolve(__dirname, '../../../supabase/migrate_071_trial_ledger.sql'),
  'utf8',
);
const DELETE_RPC = fs.readFileSync(
  path.resolve(__dirname, '../../../supabase/migrate_062_delete_user_data_post025_tables.sql'),
  'utf8',
);

describe('migration 071 trial ledger', () => {
  test('creates the private ledger + salt and a hash helper', () => {
    expect(SQL).toMatch(/CREATE TABLE IF NOT EXISTS private\.trial_ledger/);
    expect(SQL).toMatch(/CREATE TABLE IF NOT EXISTS private\.trial_salt/);
    expect(SQL).toMatch(/FUNCTION private\.email_trial_hash/);
    // The stored value is a hash, not the email.
    expect(SQL).toMatch(/digest\(/);
    expect(SQL).toMatch(/email_hash\s+text\s+PRIMARY KEY/);
  });

  test('start_cascade checks the ledger and blocks a second cardless trial', () => {
    const fn = SQL.slice(
      SQL.indexOf('CREATE OR REPLACE FUNCTION start_cascade'),
      SQL.indexOf('GRANT EXECUTE ON FUNCTION start_cascade'),
    );
    expect(fn).toMatch(/already_trialled/);
    expect(fn).toMatch(/private\.email_trial_hash\(user_email\)/);
    expect(fn).toMatch(/FROM private\.trial_ledger/);
    // A returning trialler is moved to the post-trial free state, not granted
    // a second 14-day trial.
    expect(fn).toMatch(/trial_state\s*=\s*'cascade_expired'/);
    // The first trial records the hash so re-signup can be detected.
    expect(fn).toMatch(/INSERT INTO private\.trial_ledger/);
  });

  test('uses the app.allow_tier_change GUC bypass, NOT session_replication_role', () => {
    const fn = SQL.slice(
      SQL.indexOf('CREATE OR REPLACE FUNCTION start_cascade'),
      SQL.indexOf('GRANT EXECUTE ON FUNCTION start_cascade'),
    );
    // session_replication_role is superuser-only on hosted Supabase and threw
    // before migration 068; it must never be used inside the function body.
    expect(fn).not.toMatch(/set_config\(\s*'session_replication_role'/);
    expect(fn).toMatch(/set_config\(\s*'app\.allow_tier_change',\s*'on'/);
  });

  test('the ledger survives deletion (delete_user_data does not touch it)', () => {
    expect(DELETE_RPC).not.toMatch(/trial_ledger/);
    // And the ledger lives in the private schema, so PostgREST never exposes it.
    expect(SQL).toMatch(/CREATE SCHEMA IF NOT EXISTS private/);
  });
});
