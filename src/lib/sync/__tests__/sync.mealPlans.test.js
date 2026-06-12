/**
 * meal_plans per-table sync handlers (Theme G active-plan mirror).
 * Contracts: push sends the LATEST local row including tombstones (so a
 * delete propagates) with plan_json parsed for jsonb; corrupt local JSON
 * is never pushed; pull picks the newest cloud row and routes through
 * applyMealPlanRowFromCloud (whose LWW guard decides), stringifying
 * plan_json back for the local TEXT column.
 */

jest.mock('../telemetry', () => ({ logSyncError: jest.fn() }));
jest.mock('../../food/db', () => ({
  getLatestMealPlanRowForSync: jest.fn(),
  applyMealPlanRowFromCloud: jest.fn(),
}));

import { pushMealPlans, pullMealPlans } from '../tables/mealPlans';
import { getLatestMealPlanRowForSync, applyMealPlanRowFromCloud } from '../../food/db';

const PLAN = { kind: 'week', days: [], schedule: [] };

const sbForPush = () => {
  const upsert = jest.fn(async () => ({ error: null }));
  return { sb: { from: jest.fn(() => ({ upsert })) }, upsert };
};

const sbForPull = (rows) => ({
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(async () => ({ data: rows, error: null })),
    })),
  })),
});

beforeEach(() => jest.clearAllMocks());

describe('pushMealPlans', () => {
  test('pushes the latest row — including a tombstone — with parsed jsonb', async () => {
    getLatestMealPlanRowForSync.mockResolvedValue({
      id: 'p1', plan_json: JSON.stringify(PLAN), is_active: 0, deleted_at: 999, created_at: 1, updated_at: 999,
    });
    const { sb, upsert } = sbForPush();
    const res = await pushMealPlans(sb, { userId: 'cloud-u', localUserId: 'local-u' });
    expect(res).toEqual({ count: 1, errors: 0 });
    const [row, opts] = upsert.mock.calls[0];
    expect(row.id).toBe('p1');
    expect(row.user_id).toBe('cloud-u'); // cloud uid, never the local id
    expect(row.plan_json).toEqual(PLAN); // parsed object for jsonb
    expect(row.deleted_at).toBe(999); // tombstone propagates
    expect(opts).toEqual({ onConflict: 'id' });
  });

  test('no local row → clean no-op', async () => {
    getLatestMealPlanRowForSync.mockResolvedValue(null);
    const { sb, upsert } = sbForPush();
    expect(await pushMealPlans(sb, { userId: 'u', localUserId: 'l' })).toEqual({ count: 0, errors: 0 });
    expect(upsert).not.toHaveBeenCalled();
  });

  test('corrupt local plan_json is never pushed', async () => {
    getLatestMealPlanRowForSync.mockResolvedValue({
      id: 'p1', plan_json: '{nope', is_active: 1, deleted_at: null, created_at: 1, updated_at: 2,
    });
    const { sb, upsert } = sbForPush();
    expect(await pushMealPlans(sb, { userId: 'u', localUserId: 'l' })).toEqual({ count: 0, errors: 0 });
    expect(upsert).not.toHaveBeenCalled();
  });
});

describe('pullMealPlans', () => {
  test('applies the NEWEST cloud row, stringifying jsonb for the local column', async () => {
    applyMealPlanRowFromCloud.mockResolvedValue(true);
    const sb = sbForPull([
      { id: 'old', plan_json: PLAN, updated_at: 10 },
      { id: 'new', plan_json: PLAN, updated_at: 20 },
    ]);
    const res = await pullMealPlans(sb, { userId: 'cloud-u', localUserId: 'local-u' });
    expect(res).toEqual({ count: 1, errors: 0 });
    const [localUser, row] = applyMealPlanRowFromCloud.mock.calls[0];
    expect(localUser).toBe('local-u');
    expect(row.id).toBe('new');
    expect(typeof row.plan_json).toBe('string'); // local column is TEXT
  });

  test('LWW guard declining counts as zero applied, zero errors', async () => {
    applyMealPlanRowFromCloud.mockResolvedValue(false);
    const sb = sbForPull([{ id: 'p', plan_json: PLAN, updated_at: 5 }]);
    expect(await pullMealPlans(sb, { userId: 'u', localUserId: 'l' })).toEqual({ count: 0, errors: 0 });
  });

  test('empty cloud → clean no-op', async () => {
    const sb = sbForPull([]);
    expect(await pullMealPlans(sb, { userId: 'u', localUserId: 'l' })).toEqual({ count: 0, errors: 0 });
    expect(applyMealPlanRowFromCloud).not.toHaveBeenCalled();
  });
});
