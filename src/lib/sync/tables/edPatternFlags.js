/**
 * ed_pattern_flags per-table pull (no push, pull_only).
 *
 * Registry entry: pull_only + server_wins + serverAuthoritative.
 * The server-side ed_pattern_flags table is written by the engine
 * (and the upgrade_tier RPC) when a flag is raised or cleared.
 * The client previously did not pull the row back; this handler
 * adds that path so a fresh install or a different device sees
 * the live flag state from the cloud.
 *
 * Pull: select all rows for the user, route each through
 *       upsertEdPatternFlagFromCloud which does INSERT OR REPLACE
 *       (server_wins semantics, any local edits are stomped
 *       by the cloud copy on the next pull).
 */

import { logSyncError } from '../telemetry';

export async function pullEdPatternFlags(sb, { userId } = {}) {
  if (!sb || !userId) return { count: 0, errors: 0 };
  try {
    const { data, error } = await sb
      .from('ed_pattern_flags')
      .select('*')
      .eq('user_id', userId);
    if (error) {
      logSyncError('sync.tables.edPatternFlags.pull', error);
      return { count: 0, errors: 1 };
    }
    if (!data?.length) return { count: 0, errors: 0 };

    // eslint-disable-next-line global-require
    const { upsertEdPatternFlagFromCloud } = require('../../database');
    let applied = 0;
    let errors = 0;
    for (const row of data) {
      try {
        await upsertEdPatternFlagFromCloud(userId, row);
        applied += 1;
      } catch (e) {
        errors += 1;
        logSyncError('sync.tables.edPatternFlags.pullRow', e);
      }
    }
    return { count: applied, errors };
  } catch (e) {
    logSyncError('sync.tables.edPatternFlags.pull', e);
    return { count: 0, errors: 1 };
  }
}
