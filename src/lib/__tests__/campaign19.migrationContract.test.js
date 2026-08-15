const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../../..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');

describe('Campaign 19 cloud persistence contract', () => {
  const sql = read('supabase/migrate_141_effective_maintenance_memos.sql');

  test('has one user-owned row with durable evidence and version identity', () => {
    expect(sql).toMatch(/user_id UUID PRIMARY KEY REFERENCES auth\.users\(id\) ON DELETE CASCADE/i);
    expect(sql).toMatch(/cumulative_residual_kcal INTEGER NOT NULL/i);
    expect(sql).toMatch(/evidence_signature TEXT NOT NULL/i);
    expect(sql).toMatch(/version_key TEXT NOT NULL/i);
    expect(sql).toMatch(/effective_maintenance_kcal_at_derivation = formula_prior_kcal_at_derivation \+ cumulative_residual_kcal/i);
    expect(sql).toMatch(/food_days_logged INTEGER NOT NULL CHECK \(food_days_logged >= 5\)/i);
    expect(sql).toMatch(/weight_points INTEGER NOT NULL CHECK \(weight_points >= 14\)/i);
    expect(sql).toMatch(/CHECK \(\(revalidation_started_at IS NULL\) = \(revalidation_context_signature IS NULL\)\)/i);
  });

  test('rejects stale arrivals and deterministically resolves clock ties', () => {
    expect(sql).toMatch(/NEW\.updated_at < OLD\.updated_at/i);
    expect(sql).toMatch(/NEW\.version_key COLLATE "C" <= OLD\.version_key COLLATE "C"/i);
    expect(sql).toMatch(/BEFORE UPDATE ON public\.effective_maintenance_memos/i);
  });

  test('RLS and explicit grants allow own read/write but no client delete', () => {
    expect(sql).toMatch(/ENABLE ROW LEVEL SECURITY/i);
    expect(sql).toMatch(/FOR SELECT[\s\S]*auth\.uid\(\)\) = user_id/i);
    expect(sql).toMatch(/FOR INSERT[\s\S]*WITH CHECK/i);
    expect(sql).toMatch(/FOR UPDATE[\s\S]*USING[\s\S]*WITH CHECK/i);
    expect(sql).toMatch(/GRANT SELECT, INSERT, UPDATE/i);
    expect(sql).not.toMatch(/CREATE POLICY[\s\S]{0,120}FOR DELETE/i);
    expect(sql).not.toMatch(/GRANT\s+(?:SELECT\s*,\s*)?(?:INSERT\s*,\s*)?(?:UPDATE\s*,\s*)?DELETE\s+ON/i);
    expect(sql).toMatch(/FORCE ROW LEVEL SECURITY/i);
    expect(sql).toMatch(/REVOKE ALL ON FUNCTION public\._effective_maintenance_memos_refuse_stale\(\) FROM PUBLIC, anon, authenticated/i);
    expect(sql).not.toMatch(/SECURITY DEFINER/i);
  });

  test('is transactional, additive, and migration number 141 is unique', () => {
    expect(sql.trim()).toMatch(/^--[\s\S]*\bBEGIN;/i);
    expect(sql.trim()).toMatch(/COMMIT;$/i);
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS/i);
    const migration141 = fs.readdirSync(path.join(root, 'supabase'))
      .filter(name => /^migrate_141(?:_|\.)/i.test(name));
    expect(migration141).toEqual(['migrate_141_effective_maintenance_memos.sql']);
  });

  test('sync registry owns the memo in both directions', () => {
    expect(read('src/lib/sync/registry.js')).toMatch(/table: 'effective_maintenance_memos'[\s\S]{0,180}direction: 'bidirectional'/);
    expect(read('src/lib/sync/transport.js')).toMatch(/'effective_maintenance_memos'/);
  });
});
