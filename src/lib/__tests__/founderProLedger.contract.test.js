import fs from 'fs';
import path from 'path';

const SQL = fs.readFileSync(
  path.resolve(__dirname, '../../../supabase/migrate_108_founder_pro_ledger.sql'),
  'utf8',
);

const DELETE_RPC = fs.readFileSync(
  path.resolve(__dirname, '../../../supabase/migrate_096_delete_user_data_completeness2.sql'),
  'utf8',
);

describe('migration 108 founder Pro ledger', () => {
  test('creates a private hashed founder ledger and seeds the three founder emails', () => {
    expect(SQL).toMatch(/CREATE TABLE IF NOT EXISTS private\.founder_pro_ledger/);
    expect(SQL).toMatch(/email_hash text\s+PRIMARY KEY/);
    expect(SQL).not.toMatch(/\n\s+email\s+text/i);

    expect(SQL).toContain("private.email_trial_hash('allansdouglas1983@gmail.com')");
    expect(SQL).toContain("private.email_trial_hash('allansdoug1983@gmail.com')");
    expect(SQL).toContain("private.email_trial_hash('allanhendy69@gmail.com')");
  });

  test('founder accounts are applied as paid_pro, not time-limited trial accounts', () => {
    expect(SQL).toMatch(/FUNCTION public\.apply_founder_pro_entitlement/);
    expect(SQL).toMatch(/trial_state = 'paid_pro'/);
    expect(SQL).toMatch(/tier = 'pro'/);
    expect(SQL).toMatch(/pro_trial_ends_at = NULL/);
  });

  test('profile creation and later downgrade attempts are corrected by a server trigger', () => {
    expect(SQL).toMatch(/CREATE TRIGGER users_profile_founder_pro_entitlement/);
    expect(SQL).toMatch(/AFTER INSERT OR UPDATE OF tier, trial_state ON users_profile/);
    expect(SQL).toMatch(/apply_founder_pro_entitlement\(NEW\.id, 'founder_pro_profile_trigger'\)/);
  });

  test('start_cascade checks founder entitlement before the trial ledger flow', () => {
    const founderCheck = SQL.indexOf("apply_founder_pro_entitlement(uid, 'onboarding_founder_pro')");
    const trialLedgerCheck = SQL.indexOf('FROM private.trial_ledger');

    expect(founderCheck).toBeGreaterThan(-1);
    expect(trialLedgerCheck).toBeGreaterThan(-1);
    expect(founderCheck).toBeLessThan(trialLedgerCheck);
    expect(SQL).toMatch(/'founder_pro', true/);
    expect(SQL).toMatch(/'trial_state', 'paid_pro'/);
  });

  test('the founder ledger survives account deletion by design', () => {
    expect(DELETE_RPC).not.toMatch(/founder_pro_ledger/);
  });
});
