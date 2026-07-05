export function createPlanFoldersRepository({
  db,
  uid,
  rowToCamel,
  runInTransaction,
  scheduleSync = () => {},
  now = () => Date.now(),
}) {
  async function getPlanFolders(userId) {
    const d = await db();
    const rows = await d.getAllAsync(
      `SELECT * FROM plan_folders
       WHERE user_id = ? AND deleted_at IS NULL
       ORDER BY sort_order ASC, created_at ASC`,
      [userId],
    );
    return rows.map(rowToCamel);
  }

  async function createPlanFolder(userId, name) {
    const d = await db();
    const id = uid();
    const createdAt = now();
    const maxRow = await d.getFirstAsync(
      'SELECT MAX(sort_order) AS maxSort FROM plan_folders WHERE user_id = ? AND deleted_at IS NULL',
      [userId],
    );
    const sortOrder = (maxRow?.maxSort ?? -1) + 1;
    await d.runAsync(
      `INSERT INTO plan_folders (id, user_id, name, sort_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, userId, name, sortOrder, createdAt, createdAt],
    );
    scheduleSync();
    return { id, userId, name, sortOrder, createdAt, updatedAt: createdAt };
  }

  async function renamePlanFolder(folderId, name) {
    const d = await db();
    await d.runAsync(
      'UPDATE plan_folders SET name = ?, updated_at = ? WHERE id = ?',
      [name, now(), folderId],
    );
    scheduleSync();
  }

  async function deletePlanFolder(folderId) {
    const d = await db();
    const deletedAt = now();
    await runInTransaction(d, async () => {
      await d.runAsync(
        'UPDATE programmes SET folder_id = NULL, updated_at = ? WHERE folder_id = ?',
        [deletedAt, folderId],
      );
      await d.runAsync(
        'UPDATE plan_folders SET deleted_at = ?, updated_at = ? WHERE id = ?',
        [deletedAt, deletedAt, folderId],
      );
    });
    scheduleSync();
  }

  async function setPlanFolder(planId, folderId) {
    const d = await db();
    await d.runAsync(
      'UPDATE programmes SET folder_id = ?, updated_at = ? WHERE id = ?',
      [folderId ?? null, now(), planId],
    );
    scheduleSync();
  }

  async function getPlanFoldersForPush(userId) {
    const d = await db();
    const rows = await d.getAllAsync(
      'SELECT * FROM plan_folders WHERE user_id = ?',
      [userId],
    );
    return rows.map(rowToCamel);
  }

  async function getPlanFolderUpdatedAt(userId, id) {
    const d = await db();
    const row = await d.getFirstAsync(
      'SELECT updated_at FROM plan_folders WHERE user_id = ? AND id = ?',
      [userId, id],
    );
    return row?.updated_at ?? 0;
  }

  async function insertPlanFolderFromCloud(userId, folder) {
    const d = await db();
    const toMs = (t) => (typeof t === 'string' ? new Date(t).getTime() : (t ?? null));
    await d.runAsync(
      `INSERT INTO plan_folders (id, user_id, name, sort_order, deleted_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         name = excluded.name,
         sort_order = excluded.sort_order,
         deleted_at = excluded.deleted_at,
         updated_at = excluded.updated_at`,
      [
        folder.id,
        userId,
        folder.name,
        folder.sort_order ?? 0,
        toMs(folder.deleted_at),
        toMs(folder.created_at) ?? now(),
        toMs(folder.updated_at) ?? now(),
      ],
    );
  }

  return {
    createPlanFolder,
    deletePlanFolder,
    getPlanFolderUpdatedAt,
    getPlanFolders,
    getPlanFoldersForPush,
    insertPlanFolderFromCloud,
    renamePlanFolder,
    setPlanFolder,
  };
}
