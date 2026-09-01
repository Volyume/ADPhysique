const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const source = fs.readFileSync(
  path.join(ROOT, 'scripts/security/run-effective-supabase-matrix.cjs'),
  'utf8',
);
const inventory = JSON.parse(fs.readFileSync(
  path.join(ROOT, 'scripts/security/supabase-matrix.targets.json'),
  'utf8',
));

describe('effective Supabase hostile-matrix harness', () => {
  test('cannot run accidentally or emit a partial-coverage verdict', () => {
    expect(source).toContain("DAYBREAK_ISOLATED_PROJECT_CONFIRM !== 'YES'");
    expect(source).toContain('Fixture coverage is incomplete');
    expect(source).toContain('Missing table targets');
    expect(source).toContain('Missing RPC targets');
  });

  test('does not mistake ordinary constraint/type failures for policy proof', () => {
    expect(source).toContain("evidence: explicitDenial ? 'explicit_policy_or_acl_denial'");
    expect(source).toContain("'non_policy_error'");
    expect(source).toContain('inconclusive');
    expect(source).toMatch(/verdict: all\.every\(\(check\) => check\.passed\)/);
    expect(source).toContain("expected === 'allow_nonempty'");
  });

  test('inventory includes every highest-risk child and private target', () => {
    const names = inventory.directPostgrestTables
      .map((item) => `${item.schema || 'public'}.${item.table}`);
    expect(names.length).toBeGreaterThanOrEqual(80);
    for (const name of [
      'public.routine_exercises', 'public.mesocycle_weeks', 'public.workout_sets',
      'public.planned_muscle_volume', 'public.adaptation_events',
      'public.recipe_ingredients', 'public.partner_cheers',
      'private.trial_ledger', 'private.founder_pro_ledger', 'private.trial_salt',
    ]) expect(names).toContain(name);
    expect(new Set(names).size).toBe(names.length);
  });

  test('RPC inventory includes ownership, entitlement, food and partner boundaries', () => {
    for (const name of [
      'delete_user_data', 'clear_goal_lock', 'record_engine_telemetry',
      'record_health_consent', 'record_capability_consent', 'food_sync_pull',
      'food_sync_push', 'food_library_pull', 'current_pricing_window',
      'start_cascade', 'upgrade_tier', 'food_frequents_pull',
      'create_partner_invite', 'redeem_partner_invite', 'end_partnership',
      'record_rpc_fallback_deletion', 'record_partner_consent',
    ]) expect(inventory.clientRpcNames).toContain(name);
  });
});
