/**
 * Public API for the sync module, per SYNC_ARCHITECTURE_LOCKED.md
 * lines 9-19. Consumers import from '../lib/sync/' (or with the
 * explicit '/index') and never reach into submodules unless they
 * need a specific helper (e.g. a test wanting registry shape).
 *
 * Surface:
 *   syncAll({ userId, localUserId, triggeredBy })
 *     → run a full pull + push cycle.
 *   syncTable(name, { ... })
 *     → run a sync scoped to one table (currently delegates to
 *       syncAll until per-table transport paths land).
 *   getStatus()
 *     → snapshot for the UI status indicator.
 *
 * Plus re-exports of the registry helpers so
 * tests and the eventual UI status sheet can introspect without
 * deep imports.
 */

export { syncAll, syncTable, getStatus } from './runner';
export {
  SYNC_REGISTRY,
  getRegistryEntry,
  listSyncableTables,
  listBidirectionalTables,
  listPullOnlyTables,
} from './registry';
export { resolve as resolveConflict } from './conflict';
export { trackSyncRun, trackSyncConflictResolved } from './telemetry';
