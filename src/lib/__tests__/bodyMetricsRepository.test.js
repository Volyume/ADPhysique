import { createBodyMetricsRepository } from '../database/bodyMetrics';

const rowToCamel = (row) => Object.fromEntries(
  Object.entries(row).map(([key, value]) => [
    key.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase()),
    value,
  ]),
);

function createHarness(overrides = {}) {
  const conn = {
    getAllAsync: jest.fn(async () => []),
    getFirstAsync: jest.fn(async () => null),
    runAsync: jest.fn(async () => undefined),
    ...overrides.conn,
  };
  const scheduleSync = jest.fn();
  const repo = createBodyMetricsRepository({
    db: jest.fn(async () => conn),
    uid: jest.fn(() => 'metric-1'),
    rowToCamel,
    scheduleSync,
    now: jest.fn(() => 123456),
    ...overrides.deps,
  });
  return { conn, repo, scheduleSync };
}

describe('bodyMetricsRepository', () => {
  test('logBodyMetric writes local body metrics and schedules sync', async () => {
    const { conn, repo, scheduleSync } = createHarness();

    await expect(repo.logBodyMetric('u1', {
      loggedAt: 1000,
      weightKg: 82.5,
      bodyFatPercent: 14.2,
      bodyFatSource: 'scan',
      waistCm: 80,
      notes: 'check-in',
    })).resolves.toMatchObject({
      id: 'metric-1',
      userId: 'u1',
      createdAt: 123456,
      weightKg: 82.5,
    });

    expect(conn.runAsync).toHaveBeenCalledTimes(1);
    expect(conn.runAsync.mock.calls[0][1]).toEqual([
      'metric-1', 'u1', 1000,
      82.5, 14.2, 'scan',
      80, null, null,
      null, null,
      null, null, null,
      null, 'check-in', 123456,
    ]);
    expect(scheduleSync).toHaveBeenCalledTimes(1);
  });

  test('getBodyMetricLog and getAllBodyMetricsForUser return camelCase rows', async () => {
    const row = { id: 'bm1', user_id: 'u1', logged_at: 1000, weight_kg: 82 };
    const { conn, repo } = createHarness({
      conn: { getAllAsync: jest.fn(async () => [row]) },
    });

    await expect(repo.getBodyMetricLog('u1', 10)).resolves.toEqual([
      { id: 'bm1', userId: 'u1', loggedAt: 1000, weightKg: 82 },
    ]);
    expect(conn.getAllAsync.mock.calls[0][1]).toEqual(['u1', 10]);

    await expect(repo.getAllBodyMetricsForUser('u1')).resolves.toEqual([
      { id: 'bm1', userId: 'u1', loggedAt: 1000, weightKg: 82 },
    ]);
    expect(conn.getAllAsync.mock.calls[1][1]).toEqual(['u1']);
  });

  test('getLatestBodyWeight chooses the newest body-metric or morning-weight row', async () => {
    const { conn, repo } = createHarness();
    conn.getFirstAsync.mockImplementation(async (sql) => (
      sql.includes('FROM body_metric_log')
        ? { weight_kg: 81, logged_at: 1000 }
        : { weight_kg: 80.5, logged_at: 2000 }
    ));

    await expect(repo.getLatestBodyWeight('u1')).resolves.toEqual({
      weightKg: 80.5,
      loggedAt: 2000,
    });

    conn.getFirstAsync.mockImplementation(async (sql) => (
      sql.includes('FROM body_metric_log')
        ? { weight_kg: 82, logged_at: 3000 }
        : { weight_kg: 80.5, logged_at: 2000 }
    ));
    await expect(repo.getLatestBodyWeight('u1')).resolves.toEqual({
      weightKg: 82,
      loggedAt: 3000,
    });
  });

  test('getBodyWeightNearestTo guards invalid input and falls back to nearest weight', async () => {
    const db = jest.fn();
    const repo = createBodyMetricsRepository({
      db,
      uid: jest.fn(),
      rowToCamel,
      now: jest.fn(() => 1),
    });
    await expect(repo.getBodyWeightNearestTo('', 1000)).resolves.toBeNull();
    await expect(repo.getBodyWeightNearestTo('u1', Number.NaN)).resolves.toBeNull();
    expect(db).not.toHaveBeenCalled();

    const { conn, repo: validRepo } = createHarness();
    conn.getFirstAsync
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ weight_kg: 79, logged_at: 500 });

    await expect(validRepo.getBodyWeightNearestTo('u1', 1000)).resolves.toEqual({
      weightKg: 79,
      loggedAt: 500,
    });
    expect(conn.getFirstAsync).toHaveBeenCalledTimes(2);
  });

  test('getLatestBodyComposition returns the latest body-fat row and tolerates read errors', async () => {
    const { conn, repo } = createHarness();
    conn.getFirstAsync.mockResolvedValueOnce({
      body_fat_percent: 13.5,
      body_fat_source: 'manual',
      logged_at: 111,
    });

    await expect(repo.getLatestBodyComposition('u1')).resolves.toEqual({
      bodyFatPercent: 13.5,
      bodyFatSource: 'manual',
      loggedAt: 111,
    });

    conn.getFirstAsync.mockRejectedValueOnce(new Error('missing column'));
    await expect(repo.getLatestBodyComposition('u1')).resolves.toBeNull();
  });

  test('insertBodyMetricFromCloud maps cloud body_metrics columns into local body_metric_log', async () => {
    const { conn, repo } = createHarness();

    await repo.insertBodyMetricFromCloud('u1', {
      id: 'cloud-1',
      metric_date: '2026-07-05',
      body_weight: 78.2,
      body_fat_percent: 12.9,
      body_fat_source: 'scan',
      waist: 76,
      chest: 104,
      hips: 92,
      quads: 58,
      arms: 39,
      shoulders: 122,
      forearms: 31,
      hamstrings: 54,
      calves: 37,
      notes: 'restore',
      created_at: '2026-07-04T10:00:00.000Z',
      updated_at: '2026-07-04T11:00:00.000Z',
      deleted_at: '2026-07-04T12:00:00.000Z',
    });

    expect(conn.runAsync).toHaveBeenCalledTimes(1);
    expect(conn.runAsync.mock.calls[0][1]).toEqual([
      'cloud-1',
      'u1',
      new Date('2026-07-05T00:00:00Z').getTime(),
      78.2,
      12.9,
      'scan',
      76,
      104,
      92,
      58,
      39,
      122,
      31,
      54,
      37,
      'restore',
      new Date('2026-07-04T10:00:00.000Z').getTime(),
      new Date('2026-07-04T11:00:00.000Z').getTime(),
      new Date('2026-07-04T12:00:00.000Z').getTime(),
    ]);
  });

  test('getBodyMetricUpdatedAt returns null without id and reads local LWW timestamp', async () => {
    const db = jest.fn();
    const repoWithoutId = createBodyMetricsRepository({
      db,
      uid: jest.fn(),
      rowToCamel,
    });
    await expect(repoWithoutId.getBodyMetricUpdatedAt('u1')).resolves.toBeNull();
    expect(db).not.toHaveBeenCalled();

    const { conn, repo } = createHarness();
    conn.getFirstAsync.mockResolvedValueOnce({ updated_at: 123 });
    await expect(repo.getBodyMetricUpdatedAt('u1', 'bm1')).resolves.toBe(123);
    expect(conn.getFirstAsync).toHaveBeenCalledWith(
      'SELECT updated_at FROM body_metric_log WHERE id = ? AND user_id = ?',
      ['bm1', 'u1'],
    );
  });
});
