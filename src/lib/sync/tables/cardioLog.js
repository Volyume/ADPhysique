/**
 * cardio_log per-table pull. Push was removed under the cardio-logging
 * product boundary (D92-1/D95 H1, Campaign 4): no local writer remains
 * (LogCardioScreen/CardioHistoryScreen and the passive Health import are
 * gone), so there is never anything new to upload. Pull stays
 * LEGACY-LOAD-BEARING so a user's existing cloud-resident history, and any
 * cross-device history, is never stranded by a sign-out local wipe. The
 * registry entry is `direction: 'pull_only'` (same shape as
 * ed_pattern_flags).
 *
 * One row per logged cardio session (audit
 * docs/audit/volyume-cardio-integration-2026-06-03). PK (user_id, id), so a
 * day can hold several sessions. Soft delete via deleted_at.
 *
 *   Pull: select all rows for the user, apply insertCardioLogFromCloud only
 *         when the cloud updated_at is strictly newer than the local one
 *         (deleted rows included, so a remote delete lands locally).
 */

import { logSyncError } from '../telemetry';
import { isMissingTableError } from './_missingTable';
import { fetchAllUserRows } from './_paginate';

function _toMs(t) {
  if (t == null) return 0;
  if (typeof t === 'number') return t;
  if (typeof t === 'string') return Date.parse(t) || 0;
  return 0;
}

// cardio_log is a brand-new additive table (cloud migration 064). Until 064 is
// applied, the cloud table is absent and a pull must be a benign skip rather
// than a sign-out-blocking error. The detector is shared across additive
// handlers (see ./_missingTable) so the cardio_log fix is the pattern, not a
// one-off.
const _isMissingTableError = (error) => isMissingTableError(error, 'cardio_log');

export async function pullCardioLog(sb, { userId } = {}) {
  if (!sb || !userId) return { count: 0, errors: 0 };
  try {
    // LS-03b: page past PostgREST's 1000-row cap so a long cardio history restores in full.
    const { data, error } = await fetchAllUserRows(
      () => sb.from('cardio_log').select('*').eq('user_id', userId),
    );
    if (error) {
      if (_isMissingTableError(error)) {
        // Cloud table not migrated yet (064 pending). Benign skip, see
        // _isMissingTableError. Keeps sign-out unblocked.
        return { count: 0, errors: 0, skipped: 'cloud_table_missing' };
      }
      logSyncError('sync.tables.cardioLog.pull', error);
      return { count: 0, errors: 1 };
    }
    if (!data?.length) return { count: 0, errors: 0 };

    // eslint-disable-next-line global-require
    const { insertCardioLogFromCloud, getCardioLogUpdatedAt } = require('../../database');
    let applied = 0;
    let skipped = 0;
    let errors = 0;
    for (const r of data) {
      try {
        const localUpdatedAt = await getCardioLogUpdatedAt(userId, r.id);
        const cloudUpdatedAt = _toMs(r.updated_at);
        if (localUpdatedAt && cloudUpdatedAt && localUpdatedAt >= cloudUpdatedAt) {
          skipped += 1;
          continue;
        }
        await insertCardioLogFromCloud(userId, r);
        applied += 1;
      } catch (e) {
        errors += 1;
        logSyncError('sync.tables.cardioLog.pullRow', e);
      }
    }
    return { count: applied, errors, ...(skipped ? { skipped } : {}) };
  } catch (e) {
    logSyncError('sync.tables.cardioLog.pull', e);
    return { count: 0, errors: 1 };
  }
}
