/**
 * SYNC_REGISTRY — the locked table list from
 * SYNC_ARCHITECTURE_LOCKED.md lines 29-153.
 *
 * Adding a table to sync is, by spec, adding a row here. The
 * runner picks up registry entries automatically; per-table
 * pull/push helpers in transport.js dispatch on the table name.
 *
 * Schema strategies per spec:
 *   - last_write_wins: server compares incoming updated_at, newer
 *     wins, otherwise server overwrites client.
 *   - server_wins (pull_only): client never pushes, server is
 *     authoritative for derived state (rollups, flags, history).
 *   - merge: profile-only per-column merge using a column_updates_at
 *     jsonb map. Avoids the "phone A and phone B simultaneously
 *     edited different fields" clobber.
 *
 * Soft-delete: if true, deletes set deleted_at and propagate as
 * UPDATE; hard-delete happens server-side after 30 days.
 */

export const SYNC_REGISTRY = [
  {
    table: 'weekly_checkins_v2',
    pk: 'id',
    conflictStrategy: 'last_write_wins',
    serverAuthoritative: false,
    softDelete: false,
    direction: 'bidirectional',
  },
  {
    table: 'weight_log',
    pk: 'id',
    conflictStrategy: 'last_write_wins',
    serverAuthoritative: false,
    softDelete: false,
    direction: 'bidirectional',
  },
  {
    table: 'food_entries',
    pk: 'id',
    conflictStrategy: 'last_write_wins',
    serverAuthoritative: false,
    softDelete: true,
    direction: 'bidirectional',
  },
  {
    table: 'custom_foods',
    pk: 'id',
    conflictStrategy: 'last_write_wins',
    serverAuthoritative: false,
    softDelete: true,
    direction: 'bidirectional',
  },
  {
    table: 'saved_meals',
    pk: 'id',
    conflictStrategy: 'last_write_wins',
    serverAuthoritative: false,
    softDelete: true,
    direction: 'bidirectional',
  },
  {
    table: 'recipes',
    pk: 'id',
    conflictStrategy: 'last_write_wins',
    serverAuthoritative: false,
    softDelete: true,
    direction: 'bidirectional',
  },
  {
    table: 'recipe_ingredients',
    pk: 'id',
    conflictStrategy: 'last_write_wins',
    serverAuthoritative: false,
    softDelete: false,
    direction: 'bidirectional',
  },
  {
    table: 'food_favourites',
    pk: ['user_id', 'food_ref'],
    conflictStrategy: 'last_write_wins',
    serverAuthoritative: false,
    softDelete: false,
    direction: 'bidirectional',
  },
  {
    table: 'daily_water',
    pk: ['user_id', 'entry_date'],
    conflictStrategy: 'last_write_wins',
    serverAuthoritative: false,
    softDelete: false,
    direction: 'bidirectional',
  },
  {
    table: 'daily_intake_rollups',
    pk: ['user_id', 'entry_date'],
    conflictStrategy: 'server_wins',
    serverAuthoritative: true,
    softDelete: false,
    direction: 'pull_only',
  },
  {
    table: 'ed_pattern_flags',
    pk: 'id',
    conflictStrategy: 'server_wins',
    serverAuthoritative: true,
    softDelete: false,
    direction: 'pull_only',
  },
  {
    table: 'tier_history',
    pk: 'id',
    conflictStrategy: 'server_wins',
    serverAuthoritative: true,
    softDelete: false,
    direction: 'pull_only',
  },
  {
    table: 'body_composition_log',
    pk: 'id',
    conflictStrategy: 'last_write_wins',
    serverAuthoritative: false,
    softDelete: true,
    direction: 'bidirectional',
  },
  {
    table: 'nutrition_targets',
    pk: 'user_id',
    conflictStrategy: 'server_wins',
    serverAuthoritative: true,
    softDelete: false,
    direction: 'pull_only',
  },
  {
    table: 'profiles',
    pk: 'id',
    conflictStrategy: 'merge',
    serverAuthoritative: false,
    softDelete: false,
    direction: 'bidirectional',
  },
  {
    table: 'notification_preferences',
    pk: ['user_id', 'category'],
    conflictStrategy: 'last_write_wins',
    serverAuthoritative: false,
    softDelete: false,
    direction: 'bidirectional',
  },
];

export function getRegistryEntry(tableName) {
  return SYNC_REGISTRY.find(e => e.table === tableName) ?? null;
}

export function listSyncableTables() {
  return SYNC_REGISTRY.map(e => e.table);
}

export function listBidirectionalTables() {
  return SYNC_REGISTRY.filter(e => e.direction === 'bidirectional').map(e => e.table);
}

export function listPullOnlyTables() {
  return SYNC_REGISTRY.filter(e => e.direction === 'pull_only').map(e => e.table);
}
