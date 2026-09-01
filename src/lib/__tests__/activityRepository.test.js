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
    rowToCamel,
    scheduleSync,
    dayKey: () => '2026-07-05',
    now: () => now,
  });
  return { repo, dbHandle, scheduleSync };
}

describe('activity database repository', () => {
  test('daily steps use the injected local day key and schedule sync after a bounded write', async () => {
    const { repo, dbHandle, scheduleSync } = makeRepo();

    expect(repo.activityDayKey(123)).toBe('2026-07-05');
    const result = await repo.setDailySteps('u1', { steps: 200000, source: 'watch' });

    expect(result).toEqual({
      entryDate: '2026-07-05',
      steps: 200000,
      source: 'watch',
      updatedAt: 1700000000000,
    });
    expect(dbHandle.runAsync).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO daily_steps'), [
      'u1',
      '2026-07-05',
      200000,
      'watch',
      1700000000000,
    ]);
    expect(scheduleSync).toHaveBeenCalledTimes(1);
  });

  test.each([NaN, Infinity, -Infinity, Number.MAX_VALUE, 200001, -1, '8123', '', null])(
    'rejects unsafe local steps %p before opening SQLite',
    async (steps) => {
      const { repo, dbHandle } = makeRepo();
      await expect(repo.setDailySteps('u1', { steps, source: 'manual' })).rejects.toThrow(/invalid activity/);
      expect(dbHandle.runAsync).not.toHaveBeenCalled();
    },
  );

  // insertCardioLog/updateCardioLog were removed with the cardio-logging
  // product boundary (D95, Campaign 4): no local writer remains. deleteCardioLog
  // stays (D95 H3, erasure affordance) and keeps its coverage below.
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

  test.each([
    { entry_date: '2026-07-05', steps: NaN, source: 'watch', updated_at: '2026-07-05T10:15:30Z' },
    { entry_date: '2026-07-05', steps: '8123', source: 'watch', updated_at: '2026-07-05T10:15:30Z' },
    { entry_date: '2026-02-30', steps: 8123, source: 'watch', updated_at: '2026-07-05T10:15:30Z' },
    { entry_date: '2026-07-05', steps: 8123, source: 'bogus', updated_at: '2026-07-05T10:15:30Z' },
    { entry_date: '2026-07-05', steps: 8123, source: 'watch', updated_at: 'not-a-date' },
  ])('skips a malformed cloud steps row without touching SQLite', async (row) => {
    const { repo, dbHandle } = makeRepo();
    await expect(repo.insertDailyStepsFromCloud('u1', row)).resolves.toBe(false);
    expect(dbHandle.runAsync).not.toHaveBeenCalled();
  });

  test('skips malformed legacy cardio rows without resurrecting a writer or poisoning sync', async () => {
    const { repo, dbHandle } = makeRepo();
    await expect(repo.insertCardioLogFromCloud('u1', {
      id: 'legacy-1', entry_date: '2026-07-05', duration_min: Infinity,
      activity_name: 'Walk', source: 'manual',
    })).resolves.toBe(false);
    expect(dbHandle.runAsync).not.toHaveBeenCalled();
  });
});
