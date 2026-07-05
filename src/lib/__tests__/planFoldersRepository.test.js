import { createPlanFoldersRepository } from '../database/planFolders';

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
  const runInTransaction = jest.fn(async (_db, task) => task());
  const repo = createPlanFoldersRepository({
    db: jest.fn(() => Promise.resolve(dbHandle)),
    uid: () => 'folder-1',
    rowToCamel,
    runInTransaction,
    scheduleSync,
    now: () => now,
  });
  return { repo, dbHandle, runInTransaction, scheduleSync };
}

describe('planFoldersRepository', () => {
  test('creates folders after the current max sort order and schedules sync', async () => {
    const { repo, dbHandle, scheduleSync } = makeRepo({ firstRows: [{ maxSort: 2 }] });

    const folder = await repo.createPlanFolder('u1', 'Push / Pull');

    expect(folder).toEqual({
      id: 'folder-1',
      userId: 'u1',
      name: 'Push / Pull',
      sortOrder: 3,
      createdAt: 1700000000000,
      updatedAt: 1700000000000,
    });
    expect(dbHandle.runAsync).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO plan_folders'), [
      'folder-1',
      'u1',
      'Push / Pull',
      3,
      1700000000000,
      1700000000000,
    ]);
    expect(scheduleSync).toHaveBeenCalledTimes(1);
  });

  test('deleting a folder unfiles plans, tombstones the folder and schedules sync once', async () => {
    const { repo, dbHandle, runInTransaction, scheduleSync } = makeRepo({ now: 1700000000444 });

    await repo.deletePlanFolder('f1');

    expect(runInTransaction).toHaveBeenCalledWith(dbHandle, expect.any(Function));
    expect(dbHandle.runAsync).toHaveBeenNthCalledWith(
      1,
      'UPDATE programmes SET folder_id = NULL, updated_at = ? WHERE folder_id = ?',
      [1700000000444, 'f1'],
    );
    expect(dbHandle.runAsync).toHaveBeenNthCalledWith(
      2,
      'UPDATE plan_folders SET deleted_at = ?, updated_at = ? WHERE id = ?',
      [1700000000444, 1700000000444, 'f1'],
    );
    expect(scheduleSync).toHaveBeenCalledTimes(1);
  });

  test('cloud inserts preserve remote tombstones and timestamps', async () => {
    const { repo, dbHandle } = makeRepo();

    await repo.insertPlanFolderFromCloud('u1', {
      id: 'f-cloud',
      name: 'Remote',
      sort_order: 7,
      deleted_at: '2026-07-05T10:15:30.000Z',
      created_at: '2026-07-01T08:00:00.000Z',
      updated_at: '2026-07-05T11:00:00.000Z',
    });

    expect(dbHandle.runAsync).toHaveBeenCalledWith(expect.stringContaining('ON CONFLICT(id) DO UPDATE SET'), [
      'f-cloud',
      'u1',
      'Remote',
      7,
      Date.parse('2026-07-05T10:15:30.000Z'),
      Date.parse('2026-07-01T08:00:00.000Z'),
      Date.parse('2026-07-05T11:00:00.000Z'),
    ]);
  });
});
