/**
 * Supabase RPC wrappers for the sync flow. Thin layer over the
 * existing food_sync_pull / food_sync_push calls in
 * src/lib/sync.js. New code paths use this module so future
 * incremental refactors can pull bulk-upload helpers into here
 * without re-plumbing every caller.
 */

import { getSupabaseClient } from '../supabase';
import { logSyncError } from './telemetry';

/**
 * Pull changes since last_pulled_at. Returns the unwrapped
 * food_sync_pull response shape (timestamp + per-table changes).
 */
export async function pullChanges(lastPulledAt) {
  const sb = getSupabaseClient();
  if (!sb) return { timestamp: null, changes: {} };
  const { data, error } = await sb.rpc('food_sync_pull', {
    _since: lastPulledAt ?? null,
  });
  if (error) {
    logSyncError('sync.transport.pullChanges', error);
    return { timestamp: null, changes: {} };
  }
  return data ?? { timestamp: null, changes: {} };
}

/**
 * Push pending changes. `changes` matches the food_sync_push shape:
 *   { food_entries: [{op, row}, ...], custom_foods: [...], ... }
 *
 * Returns the server response (per-record accepted/rejected/errored).
 */
export async function pushChanges(changes) {
  const sb = getSupabaseClient();
  if (!sb) return { accepted: [], rejected: [], errored: [] };
  const { data, error } = await sb.rpc('food_sync_push', { _changes: changes ?? {} });
  if (error) {
    logSyncError('sync.transport.pushChanges', error);
    return { accepted: [], rejected: [], errored: [], _error: error };
  }
  return data ?? { accepted: [], rejected: [], errored: [] };
}
