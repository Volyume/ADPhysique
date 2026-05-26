/**
 * Conflict resolution dispatcher. SYNC_ARCHITECTURE_LOCKED.md
 * lines 172-195: three strategies.
 *
 * Every resolve() call fires the sync_conflict_resolved event so
 * Panel 4 (sync health) can report rejection rate over time.
 */

import { getRegistryEntry } from './registry';
import { trackSyncConflictResolved } from './telemetry';

/**
 * Resolve a contested write.
 *
 * @param {Object} args
 * @param {string} args.table         - Registry table name
 * @param {string} args.recordId      - The row id (or composite key as string)
 * @param {Object} args.local         - Client-side row
 * @param {Object} args.server        - Server-side row (may be null on insert)
 * @param {string} [args.userId]      - For telemetry attribution
 * @returns {{ winner: 'client' | 'server' | 'merged', row: Object, strategy: string }}
 */
export async function resolve({ table, recordId, local, server, userId }) {
  const entry = getRegistryEntry(table);
  if (!entry) {
    return { winner: 'server', row: server ?? local, strategy: 'last_write_wins' };
  }
  const strategy = entry.conflictStrategy;
  let winner;
  let row;

  switch (strategy) {
    case 'server_wins':
      winner = 'server';
      row = server ?? local;
      break;
    case 'merge':
      // Per-column merge using column_updates_at. profiles only.
      // If server has no per-column map, fall back to last_write_wins.
      if (!server) {
        winner = 'client';
        row = local;
      } else if (server.column_updates_at && typeof server.column_updates_at === 'object') {
        row = mergeColumns(local, server);
        winner = 'merged';
      } else {
        const cmp = compareUpdatedAt(local, server);
        winner = cmp === 'client' ? 'client' : 'server';
        row = winner === 'client' ? local : server;
      }
      break;
    case 'last_write_wins':
    default: {
      const cmp = compareUpdatedAt(local, server);
      winner = cmp === 'client' ? 'client' : 'server';
      row = winner === 'client' ? local : (server ?? local);
      break;
    }
  }

  trackSyncConflictResolved(userId, {
    table,
    record_id: recordId,
    strategy,
    winner,
  }).catch(() => {});

  return { winner, row, strategy };
}

function compareUpdatedAt(local, server) {
  if (!server) return 'client';
  if (!local) return 'server';
  const lt = parseTs(local.updated_at);
  const st = parseTs(server.updated_at);
  return lt > st ? 'client' : 'server';
}

function parseTs(value) {
  if (value == null) return 0;
  if (typeof value === 'number') return value;
  const n = Date.parse(value);
  return Number.isFinite(n) ? n : 0;
}

function mergeColumns(local, server) {
  // column_updates_at is a jsonb map {column_name: iso_timestamp}.
  // For each column the client touched, keep the value whose
  // timestamp wins. Columns the client did not touch keep server.
  const merged = { ...server };
  const localUpdates = local?.column_updates_at ?? {};
  const serverUpdates = server?.column_updates_at ?? {};
  for (const [col, localTs] of Object.entries(localUpdates)) {
    if (col === 'id' || col === 'user_id') continue;
    const serverTs = serverUpdates[col];
    if (!serverTs || parseTs(localTs) > parseTs(serverTs)) {
      merged[col] = local[col];
    }
  }
  merged.column_updates_at = { ...serverUpdates, ...localUpdates };
  return merged;
}
