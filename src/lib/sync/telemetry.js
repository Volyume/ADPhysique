/**
 * Sync telemetry: emits the structured events SYNC_ARCHITECTURE_LOCKED.md
 * lines 282-295 names. Aggregated daily in engine_telemetry_daily.sync_*
 * fields. Sentry breadcrumb attached so failures surface in error context.
 */

import { logInfo, logWarn, logError } from '../errorLog';

/**
 * Fire a sync_run event after a sync attempt completes.
 *
 * shape (per spec):
 *   {
 *     event: 'sync_run',
 *     status: 'success' | 'partial' | 'failure',
 *     duration_ms,
 *     triggered_by: 'foreground' | 'network' | 'write' | 'periodic' | 'manual',
 *     pull_count_per_table: {table: n, ...},
 *     push_count_per_table: {table: n, ...},
 *     rejected_count, errored_count,
 *     queue_depth_before, queue_depth_after,
 *   }
 */
export async function trackSyncRun(userId, payload) {
  const safe = {
    status: payload?.status ?? 'success',
    duration_ms: Number(payload?.duration_ms ?? 0),
    triggered_by: payload?.triggered_by ?? 'manual',
    pull_count_per_table: payload?.pull_count_per_table ?? {},
    push_count_per_table: payload?.push_count_per_table ?? {},
    rejected_count: Number(payload?.rejected_count ?? 0),
    errored_count: Number(payload?.errored_count ?? 0),
    queue_depth_before: Number(payload?.queue_depth_before ?? 0),
    queue_depth_after: Number(payload?.queue_depth_after ?? 0),
  };
  try {
    logInfo('sync.run', safe);
  } catch (_) {}
  if (!userId) return;
  try {
    // eslint-disable-next-line global-require
    const { track } = require('../engineTelemetry');
    await track(userId, 'sync_run', safe);
  } catch (e) {
    logWarn('sync.telemetry.sync_run.failed', { error: String(e?.message ?? e) });
  }
}

/**
 * Fire a sync_conflict_resolved event when the conflict module
 * settles a contested row. Allow-listed by migration 043.
 *
 * shape:
 *   {
 *     event: 'sync_conflict_resolved',
 *     table,
 *     record_id,
 *     strategy: 'last_write_wins' | 'server_wins' | 'merge',
 *     winner: 'client' | 'server' | 'merged',
 *   }
 */
export async function trackSyncConflictResolved(userId, payload) {
  const safe = {
    table: String(payload?.table ?? 'unknown'),
    record_id: String(payload?.record_id ?? ''),
    strategy: payload?.strategy ?? 'last_write_wins',
    winner: payload?.winner ?? 'server',
  };
  try {
    logInfo('sync.conflict.resolved', safe);
  } catch (_) {}
  if (!userId) return;
  try {
    // eslint-disable-next-line global-require
    const { track } = require('../engineTelemetry');
    await track(userId, 'sync_conflict_resolved', safe);
  } catch (e) {
    logWarn('sync.telemetry.conflict.failed', { error: String(e?.message ?? e) });
  }
}

// A deleted account whose device still holds a live (unexpired) JWT will fail
// the user_id -> auth.users foreign key (Postgres 23503) on every push until
// the token expires. That is the CORRECT server response (you cannot write
// rows for a user that no longer exists), not an app fault — so it must not
// raise a Sentry error/issue. We match it narrowly (FK violation on a
// *_user_id_fkey constraint) and demote it to an info breadcrumb; the sync
// runner's auth-gone check then clears the session so it stops entirely.
function isDeletedAccountFkError(err) {
  const code = err?.code ?? err?.cause?.code ?? null;
  const text = `${err?.message ?? ''} ${err?.details ?? ''} ${err?.hint ?? ''}`.toLowerCase();
  return code === '23503' && /_user_id_fkey/.test(text);
}

export function logSyncError(scope, err, ctx) {
  try {
    if (isDeletedAccountFkError(err)) {
      logInfo(
        `${scope}.deletedAccountResidual`,
        'benign user_id FK rejection from a deleted-account device; session will clear',
        ctx,
      );
      return;
    }
    logError(scope, err, ctx);
  } catch (_) {}
}
