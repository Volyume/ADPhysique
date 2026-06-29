/**
 * plan_folders per-table push + pull (Hevy teardown R1, 2026-06-29).
 *
 * User-owned organisation of the My Plans list (= programmes). FREE feature,
 * no Pro gate. One row per folder, own-row RLS, bidirectional last-write-wins
 * on epoch-ms updated_at, soft-delete tombstones propagate (deleting a folder
 * unfiles its plans locally and tombstones the folder, which travels here).
 *
 * Mirrors the cardio_log contract: PK id, soft delete via deleted_at, push all
 * the user's rows (incl. tombstones) upserting on id, pull only when the cloud
 * updated_at is strictly newer than the local one. Cloud migration 089.
 *
 * Wired into transport.js (MIGRATED_TABLES + PUSH/PULL_HANDLERS) so the runner
 * iterates it; registry.js sets softDelete:true. A locally-deleted folder is
 * pushed as a tombstone (deleted_at set) and applied on pull via
 * insertPlanFolderFromCloud, so folder deletes propagate cross-device.
 */

import { logSyncError } from '../telemetry';
import { isMissingTableError } from './_missingTable';

const PUSH_BATCH_SIZE = 200;

function _toIso(ms) {
  if (ms == null) return null;
  if (typeof ms === 'string') return ms;
  return new Date(Number(ms)).toISOString();
}

function _toMs(t) {
  if (t == null) return 0;
  if (typeof t === 'number') return t;
  if (typeof t === 'string') return Date.parse(t) || 0;
  return 0;
}

// plan_folders is a brand-new additive table (cloud migration 089). Until 089
// is applied the cloud table is absent; a push/pull must then be a benign skip
// rather than a sign-out-blocking error.
const _isMissingTableError = (error) => isMissingTableError(error, 'plan_folders');

export async function pushPlanFolders(sb, { userId, localUserId } = {}) {
  if (!sb || !userId) return { count: 0, errors: 0 };
  try {
    // eslint-disable-next-line global-require
    const { getPlanFoldersForPush } = require('../../database');
    const folders = await getPlanFoldersForPush(localUserId);
    if (!folders?.length) return { count: 0, errors: 0 };

    const nowIso = new Date().toISOString();
    // Ship tombstoned rows too: the cloud plan_folders table carries a
    // deleted_at column (migration 089), so a locally-deleted folder propagates
    // as a tombstone (deleted_at set) and lands on other devices via pull. The
    // unfiled plans (folder_id -> NULL on programmes) travel via the programmes
    // round-trip. Mirrors the cardio_log / foodDomain soft-delete contract.
    const rows = folders
      .map((f) => ({
        id: f.id,
        user_id: userId,
        name: f.name,
        sort_order: Math.max(0, Math.round(Number(f.sortOrder) || 0)),
        created_at: _toIso(f.createdAt) ?? nowIso,
        updated_at: _toIso(f.updatedAt) ?? nowIso,
        deleted_at: _toIso(f.deletedAt),
      }))
      .filter((r) => r.id && r.name);

    if (!rows.length) return { count: 0, errors: 0 };

    let pushed = 0;
    let errors = 0;
    for (let i = 0; i < rows.length; i += PUSH_BATCH_SIZE) {
      const batch = rows.slice(i, i + PUSH_BATCH_SIZE);
      const { error } = await sb
        .from('plan_folders')
        .upsert(batch, { onConflict: 'id' });
      if (error) {
        if (_isMissingTableError(error)) {
          return { count: 0, errors: 0, skipped: 'cloud_table_missing' };
        }
        errors += 1;
        logSyncError('sync.tables.planFolders.pushUpsert', error);
      } else {
        pushed += batch.length;
      }
    }
    return { count: pushed, errors };
  } catch (e) {
    logSyncError('sync.tables.planFolders.push', e);
    return { count: 0, errors: 1 };
  }
}

export async function pullPlanFolders(sb, { userId } = {}) {
  if (!sb || !userId) return { count: 0, errors: 0 };
  try {
    const { data, error } = await sb
      .from('plan_folders')
      .select('*')
      .eq('user_id', userId);
    if (error) {
      if (_isMissingTableError(error)) {
        return { count: 0, errors: 0, skipped: 'cloud_table_missing' };
      }
      logSyncError('sync.tables.planFolders.pull', error);
      return { count: 0, errors: 1 };
    }
    if (!data?.length) return { count: 0, errors: 0 };

    // eslint-disable-next-line global-require
    const { insertPlanFolderFromCloud, getPlanFolderUpdatedAt } = require('../../database');
    let applied = 0;
    let skipped = 0;
    let errors = 0;
    for (const r of data) {
      try {
        const localUpdatedAt = await getPlanFolderUpdatedAt(userId, r.id);
        const cloudUpdatedAt = _toMs(r.updated_at);
        if (localUpdatedAt && cloudUpdatedAt && localUpdatedAt >= cloudUpdatedAt) {
          skipped += 1;
          continue;
        }
        await insertPlanFolderFromCloud(userId, r);
        applied += 1;
      } catch (e) {
        errors += 1;
        logSyncError('sync.tables.planFolders.pullRow', e);
      }
    }
    return { count: applied, errors, ...(skipped ? { skipped } : {}) };
  } catch (e) {
    logSyncError('sync.tables.planFolders.pull', e);
    return { count: 0, errors: 1 };
  }
}
