/**
 * sync.mesocycleWeeksPush.test.js -- Sentry VOLYUME-2D/2F/2C (2026-10-10,
 * build 81): "new row violates row-level security policy for table
 * mesocycle_weeks". The cloud admits a week only when its block is already
 * in the cloud for this person, and one week whose block was not pushed in
 * that run (a block with no dates, a failed block upsert, or a block created
 * on the device after the block list was read) rejected its whole request,
 * taking every good week with it.
 *
 * Pins: only weeks whose block was pushed in the same run are sent; when the
 * block upsert fails no week is sent; weeks of pushed blocks still go up.
 */
jest.mock('expo-sqlite');
jest.mock('../supabase', () => ({ getSupabaseClient: () => null }));
jest.mock('../errorLog', () => ({ logError: jest.fn(), logWarn: jest.fn(), logInfo: jest.fn() }));
jest.mock('../database', () => ({
  getAllMesocyclesForUser: jest.fn(),
  getAllMesocycleWeeksForUser: jest.fn(),
}));

const database = require('../database');
const { _pushMesocyclesForTests: pushMesocycles } = require('../sync');

function fakeClient({ blockError = null } = {}) {
  const calls = [];
  return {
    calls,
    from(table) {
      return {
        upsert: async (rows) => {
          calls.push({ table, rows });
          return { error: table === 'mesocycles' ? blockError : null };
        },
      };
    },
  };
}

const block = (id, dates = true) => ({
  id, name: 'Block', startDate: dates ? '2026-10-01' : null, endDate: dates ? '2026-11-12' : null,
  durationWeeks: 6, plannedWeeks: 6, isActive: 1, createdAt: 1, updatedAt: 2,
});
const week = (id, mesocycleId) => ({ id, mesocycleId, weekIndex: 1, isDeload: 0, updatedAt: 3 });

describe('mesocycle_weeks push (Sentry VOLYUME-2D/2F/2C)', () => {
  beforeEach(() => jest.clearAllMocks());

  test('a week whose block was not pushed in this run is held back; the others go up', async () => {
    database.getAllMesocyclesForUser.mockResolvedValue([block('a'), block('b', false)]);
    // 'c' stands for a block created after the block list was read.
    database.getAllMesocycleWeeksForUser.mockResolvedValue([week('w1', 'a'), week('w2', 'b'), week('w3', 'c')]);
    const sb = fakeClient();
    await pushMesocycles(sb, 'user-1', 'local-1');
    const weeks = sb.calls.filter((c) => c.table === 'mesocycle_weeks').flatMap((c) => c.rows);
    expect(weeks.map((w) => w.id)).toEqual(['w1']);
    expect(weeks[0]).toMatchObject({ user_id: 'user-1', mesocycle_id: 'a' });
  });

  test('when the block upsert fails, no week is sent', async () => {
    database.getAllMesocyclesForUser.mockResolvedValue([block('a')]);
    database.getAllMesocycleWeeksForUser.mockResolvedValue([week('w1', 'a')]);
    const sb = fakeClient({ blockError: { code: '42703', message: 'column does not exist' } });
    await pushMesocycles(sb, 'user-1', 'local-1');
    expect(sb.calls.some((c) => c.table === 'mesocycle_weeks')).toBe(false);
  });
});
