/**
 * Plan folders (Hevy teardown 02-routines-programs.md, R1 "Routine/plan
 * folders"). FREE feature, no Pro gate. The load-bearing invariant is that a
 * folder NEVER owns a plan's lifecycle: deleting a folder UNFILES its plans
 * (programmes.folder_id -> NULL) and tombstones the folder, but NEVER deletes a
 * plan. These tests drive the real helpers against the expo-sqlite shape stub
 * and assert on the SQL issued (the repo convention: CRUD itself is exercised
 * on device; here we pin the contract).
 */

jest.mock('expo-sqlite');

const {
  db,
  createPlanFolder,
  renamePlanFolder,
  deletePlanFolder,
  setPlanFolder,
  getPlanFolders,
} = require('../database');

let conn;

beforeEach(async () => {
  conn = await db();
  conn.runAsync.mockClear();
  conn.getAllAsync.mockReset();
  conn.getFirstAsync.mockReset();
  conn.getFirstAsync.mockResolvedValue(null);
});

function lastCallMatching(re) {
  const calls = conn.runAsync.mock.calls.filter(([sql]) => re.test(sql));
  return calls.length ? calls[calls.length - 1] : null;
}

describe('createPlanFolder', () => {
  test('inserts a folder owned by the user with a name and sort order', async () => {
    conn.getFirstAsync.mockResolvedValue({ maxSort: 2 }); // existing folders
    const folder = await createPlanFolder('u1', 'Push / Pull');

    const insert = lastCallMatching(/INSERT INTO plan_folders/);
    expect(insert).not.toBeNull();
    const [, params] = insert;
    // (id, user_id, name, sort_order, created_at, updated_at)
    expect(params[1]).toBe('u1');
    expect(params[2]).toBe('Push / Pull');
    expect(params[3]).toBe(3); // maxSort 2 -> 3
    expect(folder.id).toBeTruthy();
    expect(folder.name).toBe('Push / Pull');
  });

  test('first folder for a user gets sort_order 0', async () => {
    conn.getFirstAsync.mockResolvedValue({ maxSort: null }); // none yet
    const folder = await createPlanFolder('u1', 'First');
    expect(folder.sortOrder).toBe(0);
  });
});

describe('getPlanFolders', () => {
  test('reads only the user\'s non-deleted folders, ordered', async () => {
    conn.getAllAsync.mockResolvedValue([
      { id: 'f1', user_id: 'u1', name: 'A', sort_order: 0, created_at: 1, updated_at: 1 },
    ]);
    const rows = await getPlanFolders('u1');
    const [sql, params] = conn.getAllAsync.mock.calls[0];
    expect(sql).toMatch(/FROM plan_folders/);
    expect(sql).toMatch(/deleted_at IS NULL/);
    expect(sql).toMatch(/ORDER BY sort_order/);
    expect(params).toEqual(['u1']);
    expect(rows[0].name).toBe('A');
  });
});

describe('renamePlanFolder', () => {
  test('updates the name and bumps updated_at', async () => {
    await renamePlanFolder('f1', 'Renamed');
    const update = lastCallMatching(/UPDATE plan_folders SET name = \?/);
    expect(update).not.toBeNull();
    const [, params] = update;
    expect(params[0]).toBe('Renamed');
    expect(params[2]).toBe('f1');
  });
});

describe('setPlanFolder (move into / out of a folder)', () => {
  test('files a plan into a folder', async () => {
    await setPlanFolder('p1', 'f1');
    const update = lastCallMatching(/UPDATE programmes SET folder_id = \?/);
    expect(update).not.toBeNull();
    const [, params] = update;
    expect(params[0]).toBe('f1');
    expect(params[2]).toBe('p1');
  });

  test('unfiles a plan when folderId is null', async () => {
    await setPlanFolder('p1', null);
    const update = lastCallMatching(/UPDATE programmes SET folder_id = \?/);
    const [, params] = update;
    expect(params[0]).toBeNull();
  });
});

describe('deletePlanFolder UNFILES plans (the safety invariant)', () => {
  test('clears folder_id on the folder\'s plans without deleting any plan', async () => {
    await deletePlanFolder('f1');

    // The plans are unfiled: programmes.folder_id -> NULL for this folder.
    const unfile = lastCallMatching(/UPDATE programmes SET folder_id = NULL.*WHERE folder_id = \?/);
    expect(unfile).not.toBeNull();
    expect(unfile[1][unfile[1].length - 1]).toBe('f1');

    // NOTHING deletes a plan: no DELETE FROM programmes, no DROP.
    const touchedProgrammes = conn.runAsync.mock.calls.map(([sql]) => sql);
    expect(touchedProgrammes.some((s) => /DELETE\s+FROM\s+programmes/i.test(s))).toBe(false);
    expect(touchedProgrammes.some((s) => /DROP\s+TABLE/i.test(s))).toBe(false);
  });

  test('soft-deletes the folder (tombstone), never a hard delete', async () => {
    await deletePlanFolder('f1');

    const tombstone = lastCallMatching(/UPDATE plan_folders SET deleted_at = \?/);
    expect(tombstone).not.toBeNull();
    expect(tombstone[1][tombstone[1].length - 1]).toBe('f1');

    // The folder row is never physically removed.
    const sqls = conn.runAsync.mock.calls.map(([sql]) => sql);
    expect(sqls.some((s) => /DELETE\s+FROM\s+plan_folders/i.test(s))).toBe(false);
  });
});
