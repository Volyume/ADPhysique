jest.mock('../../database', () => ({
  getEffectiveMaintenanceMemo: jest.fn(),
  insertEffectiveMaintenanceMemoFromCloud: jest.fn(),
}));

jest.mock('../telemetry', () => ({ logSyncError: jest.fn() }));

const db = require('../../database');
const {
  pushEffectiveMaintenance,
  pullEffectiveMaintenance,
} = require('../tables/effectiveMaintenance');

beforeEach(() => jest.clearAllMocks());

describe('effective-maintenance one-row sync', () => {
  test('push maps the deterministic memo and retries by user_id', async () => {
    db.getEffectiveMaintenanceMemo.mockResolvedValue({
      cumulativeResidualKcal: 160,
      formulaPriorKcalAtDerivation: 2500,
      effectiveMaintenanceKcalAtDerivation: 2660,
      source: 'athlete_history', status: 'current', reason: 'validated',
      algorithmVersion: 1, asOf: 1786795200000,
      evidenceSignature: 'em1_a', foodDaysLogged: 7, weightPoints: 28,
      bodyweightKg: 80, goalPhase: 'cut', activityLevel: 'moderate',
      formulaMethod: 'mifflin', formulaContextSignature: 'fc1_a',
      largeDivergence: false, revalidationStartedAt: 1786795100000,
      revalidationContextSignature: 'rv1_a',
      versionKey: 'emv1_a', updatedAt: 1786795200000,
    });
    const calls = [];
    const sb = { from: jest.fn(() => ({
      upsert: jest.fn(async (row, options) => {
        calls.push({ row, options });
        return { error: null };
      }),
    })) };

    await expect(pushEffectiveMaintenance(sb, { userId: 'cloud-u', localUserId: 'local-u' }))
      .resolves.toEqual({ count: 1, errors: 0 });
    await expect(pushEffectiveMaintenance(sb, { userId: 'cloud-u', localUserId: 'local-u' }))
      .resolves.toEqual({ count: 1, errors: 0 });
    expect(calls).toHaveLength(2);
    expect(calls[0].options).toEqual({ onConflict: 'user_id' });
    expect(calls[0].row).toMatchObject({
      user_id: 'cloud-u', cumulative_residual_kcal: 160,
      evidence_signature: 'em1_a', version_key: 'emv1_a',
      revalidation_started_at: '2026-08-15T11:58:20.000Z',
      revalidation_context_signature: 'rv1_a',
    });
    expect(calls[1].row).toEqual(calls[0].row);
  });

  test('pull scopes to the authenticated user and stores against the local user id', async () => {
    const cloud = {
      user_id: 'cloud-u', cumulative_residual_kcal: 160,
      updated_at: '2026-08-15T12:00:00.000Z', version_key: 'emv1_a',
    };
    const maybeSingle = jest.fn(async () => ({ data: cloud, error: null }));
    const eq = jest.fn(() => ({ maybeSingle }));
    const select = jest.fn(() => ({ eq }));
    const sb = { from: jest.fn(() => ({ select })) };

    await expect(pullEffectiveMaintenance(sb, { userId: 'cloud-u', localUserId: 'local-u' }))
      .resolves.toEqual({ count: 1, errors: 0 });
    expect(eq).toHaveBeenCalledWith('user_id', 'cloud-u');
    expect(db.insertEffectiveMaintenanceMemoFromCloud).toHaveBeenCalledWith(
      'local-u', cloud, { cloudUserId: 'cloud-u' },
    );
  });

  test('an unapplied migration is a benign sync skip', async () => {
    db.getEffectiveMaintenanceMemo.mockResolvedValue({
      cumulativeResidualKcal: 1, formulaPriorKcalAtDerivation: 2000,
      effectiveMaintenanceKcalAtDerivation: 2001, algorithmVersion: 1,
      asOf: 1, evidenceSignature: 'e', foodDaysLogged: 5, weightPoints: 14,
      formulaContextSignature: 'f', versionKey: 'v', updatedAt: 1,
    });
    const error = { code: 'PGRST205', message: "Could not find the table 'public.effective_maintenance_memos' in the schema cache" };
    const upsert = jest.fn()
      .mockResolvedValueOnce({ error })
      .mockResolvedValueOnce({ error: null });
    const sb = { from: jest.fn(() => ({ upsert })) };
    await expect(pushEffectiveMaintenance(sb, { userId: 'u', localUserId: 'u' }))
      .resolves.toEqual({ count: 0, errors: 0, skipped: 'cloud_table_missing' });
    await expect(pushEffectiveMaintenance(sb, { userId: 'u', localUserId: 'u' }))
      .resolves.toEqual({ count: 1, errors: 0 });
    expect(db.getEffectiveMaintenanceMemo).toHaveBeenCalledTimes(2);
    expect(upsert.mock.calls[0][0]).toMatchObject({
      revalidation_started_at: null,
      revalidation_context_signature: null,
    });
  });

  test('an unapplied migration is also a benign pull skip', async () => {
    const error = { code: 'PGRST205', message: "Could not find the table 'public.effective_maintenance_memos' in the schema cache" };
    const maybeSingle = jest.fn(async () => ({ data: null, error }));
    const eq = jest.fn(() => ({ maybeSingle }));
    const select = jest.fn(() => ({ eq }));
    const sb = { from: jest.fn(() => ({ select })) };

    await expect(pullEffectiveMaintenance(sb, { userId: 'cloud-u', localUserId: 'local-u' }))
      .resolves.toEqual({ count: 0, errors: 0, skipped: 'cloud_table_missing' });
    expect(db.insertEffectiveMaintenanceMemoFromCloud).not.toHaveBeenCalled();
  });
});
