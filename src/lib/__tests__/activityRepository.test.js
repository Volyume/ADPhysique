import { createActivityRepository } from '../database/activity';

function rowToCamel(row) {
  if (!row) return null;
  const out = {};
  for (const [key, value] of Object.entries(row)) {
    out[key.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase())] = value;
  }
  return out;
}

function makeRepo({ firstRows = [], allRows = [], now = 1700000000000 } = {}) {
  const dbHandle = {
    runAsync: jest.fn(() => Promise.resolve()),
    getFirstAsync: jest.fn(() => Promise.resolve(firstRows.shift() ?? null)),
    getAllAsync: jest.fn(() => Promise.resolve(allRows.shift() ?? [])),
  };
  const scheduleSync = jest.fn();
  const repo = createActivityRepository({
    db: jest.fn(() => Promise.resolve(dbHandle)),
    uid: () => '00000000-0000-4000-8000-000000000001',
    rowToCamel,
    scheduleSync,
    dayKey: (ms) => `day-${ms}`,
    now: () => now,
  });
  return { repo, dbHandle, scheduleSync };
}

describe('activity database repository', () => {
  test('daily steps use the injected local day key, clamp values and schedule sync after write', async () => {
    const { repo, dbHandle, scheduleSync } = makeRepo();

    expect(repo.activityDayKey(123)).toBe('day-123');
    const result = await repo.setDailySteps('u1', { steps: 999999, source: 'watch' });

    expect(result).toEqual({
      entryDate: 'day-1700000000000',
      steps: 200000,
      source: 'watch',
      updatedAt: 1700000000000,
    });
    expect(dbHandle.runAsync).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO daily_steps'), [
      'u1',
      'day-1700000000000',
      200000,
      'watch',
      1700000000000,
    ]);
    expect(scheduleSync).toHaveBeenCalledTimes(1);
  });

  test('cardio insert clamps session fields, returns camelCase and schedules sync', async () => {
    const { repo, dbHandle, scheduleSync } = makeRepo();

    const row = await repo.insertCardioLog('u1', {
      durationMin: 2000,
      estKcal: -10,
      avgHr: 122.7,
      extId: 'health:1',
    });

    expect(row).toEqual(expect.objectContaining({
      id: '00000000-0000-4000-8000-000000000001',
      userId: 'u1',
      entryDate: 'day-1700000000000',
      activityName: 'Cardio',
      durationMin: 1440,
      estKcal: 0,
      avgHr: 123,
      extId: 'health:1',
    }));
    expect(dbHandle.runAsync).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO cardio_log'), expect.arrayContaining([
      'u1',
      '00000000-0000-4000-8000-000000000001',
      'day-1700000000000',
      1440,
      0,
      123,
      'health:1',
    ]));
    expect(scheduleSync).toHaveBeenCalledTimes(1);
  });

  test('cardio update with no fields is inert and does not schedule sync', async () => {
    const { repo, dbHandle, scheduleSync } = makeRepo();

    await expect(repo.updateCardioLog('u1', 'c1', {})).resolves.toBeNull();

    expect(dbHandle.runAsync).not.toHaveBeenCalled();
    expect(scheduleSync).not.toHaveBeenCalled();
  });

  test('cardio delete writes deleted_at and updated_at with the same timestamp', async () => {
    const { repo, dbHandle, scheduleSync } = makeRepo({ now: 1700000000999 });

    await expect(repo.deleteCardioLog('u1', 'c1')).resolves.toBe(true);

    expect(dbHandle.runAsync).toHaveBeenCalledWith(
      'UPDATE cardio_log SET deleted_at = ?, updated_at = ? WHERE user_id = ? AND id = ?',
      [1700000000999, 1700000000999, 'u1', 'c1'],
    );
    expect(scheduleSync).toHaveBeenCalledTimes(1);
  });

  test('cloud restores preserve remote updated_at timestamps as milliseconds', async () => {
    const { repo, dbHandle } = makeRepo();

    await repo.insertDailyStepsFromCloud('u1', {
      entry_date: '2026-07-05',
      steps: 8123.8,
      source: 'watch',
      updated_at: '2026-07-05T10:15:30.000Z',
    });

    expect(dbHandle.runAsync).toHaveBeenCalledWith(expect.stringContaining('INSERT OR REPLACE INTO daily_steps'), [
      'u1',
      '2026-07-05',
      8124,
      'watch',
      new Date('2026-07-05T10:15:30.000Z').getTime(),
    ]);
  });
});
