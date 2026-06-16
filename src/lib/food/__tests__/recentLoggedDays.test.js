/**
 * getRecentLoggedDays — the data behind the "copy a previous day" picker
 * (food audit F-3). Same harness as curatedDiary/savedMeals: db() is mocked and
 * we assert the SQL + params the helper issues.
 */
let mockDb;
jest.mock('../../database', () => ({ db: jest.fn(async () => mockDb) }));
jest.mock('../../engineTelemetry', () => ({ track: jest.fn(() => Promise.resolve()) }));

const food = require('../db');

beforeEach(() => { jest.clearAllMocks(); });

describe('getRecentLoggedDays', () => {
  test('returns [] (and runs no query) without a user or as-of date', async () => {
    const getAllAsync = jest.fn();
    mockDb = { getAllAsync };
    expect(await food.getRecentLoggedDays(null, '2026-06-16')).toEqual([]);
    expect(await food.getRecentLoggedDays('u1', null)).toEqual([]);
    expect(getAllAsync).not.toHaveBeenCalled();
  });

  test('queries live days before the as-of date, newest first, with count + kcal', async () => {
    const rows = [
      { entry_date: '2026-06-15', count: 5, kcal: 2100 },
      { entry_date: '2026-06-14', count: 4, kcal: 1980 },
    ];
    const getAllAsync = jest.fn(async () => rows);
    mockDb = { getAllAsync };
    const out = await food.getRecentLoggedDays('u1', '2026-06-16', 14);
    expect(out).toEqual(rows);
    const [sql, params] = getAllAsync.mock.calls[0];
    expect(sql).toMatch(/deleted_at IS NULL/);
    expect(sql).toMatch(/entry_date < \?/);
    expect(sql).toMatch(/GROUP BY entry_date/);
    expect(sql).toMatch(/ORDER BY entry_date DESC/);
    expect(params).toEqual(['u1', '2026-06-16', 14]);
  });

  test('defaults the limit to 14', async () => {
    const getAllAsync = jest.fn(async () => []);
    mockDb = { getAllAsync };
    await food.getRecentLoggedDays('u1', '2026-06-16');
    expect(getAllAsync.mock.calls[0][1]).toEqual(['u1', '2026-06-16', 14]);
  });
});
