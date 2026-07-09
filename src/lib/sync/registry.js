/**
 * SYNC_REGISTRY, the locked table list from
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
    softDelete: true,
    direction: 'bidirectional',
  },
  {
    table: 'food_favourites',
    pk: ['user_id', 'food_ref'],
    conflictStrategy: 'last_write_wins',
    serverAuthoritative: false,
    // D1-#8: deleted_at tombstone added (local mig + cloud migration 090) so
    // favourite deletes propagate cross-device instead of re-pulling back.
    softDelete: true,
    direction: 'bidirectional',
  },
  {
    table: 'daily_water',
    pk: ['user_id', 'entry_date'],
    conflictStrategy: 'last_write_wins',
    serverAuthoritative: false,
    // D1-#8: deleted_at tombstone added (local mig + cloud migration 090) so
    // water deletes propagate cross-device instead of re-pulling back.
    softDelete: true,
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
    // Activity store (cardio/steps audit). Per-day step total, same
    // contract as daily_water but with its own handler so it stays
    // off the food bulk RPC. Cloud migration 056.
    table: 'daily_steps',
    pk: ['user_id', 'entry_date'],
    conflictStrategy: 'last_write_wins',
    serverAuthoritative: false,
    softDelete: false,
    direction: 'bidirectional',
  },
  {
    // Cardio session log (cardio-integration audit). Many rows per day, so
    // pk (user_id, id) not (user_id, entry_date). Soft delete + LWW, same
    // contract as recipe_ingredients. Cloud migration 064.
    table: 'cardio_log',
    pk: ['user_id', 'id'],
    conflictStrategy: 'last_write_wins',
    serverAuthoritative: false,
    softDelete: true,
    direction: 'bidirectional',
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
    // nutrition_targets are computed locally by the nutrition engine
    // (BMR / TDEE / target_kcal / macros derived deterministically
    // from height, weight, activity, phase, goal). The cloud copy
    // exists for cross-device restore, not for server-side
    // computation, so serverAuthoritative is false and the row is
    // bidirectional. Legacy registry entry had this as
    // pull_only + serverAuthoritative=true which contradicted the
    // shipping code (sync.js _pushNutritionTargets has always run
    // on every saveNutritionTargets). Corrected alongside the
    // per-table transport migration.
    table: 'nutrition_targets',
    pk: 'user_id',
    conflictStrategy: 'last_write_wins',
    serverAuthoritative: false,
    softDelete: false,
    direction: 'bidirectional',
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
  {
    // NEW-002 training partners — the PAIR-SCOPED shape (not user-scoped). One
    // registry entry drives all four local mirrors (partnerships,
    // partner_week_signals, partner_cheers, partner_shared_blocks): pull both
    // members' rows for my active pairs, push my own derived week signals.
    // Cheers go via the partner-cheer edge function; shared-block writes are
    // online ops in partners/service.js; partnership status is
    // server-authoritative. Cloud migrations 081 + 100 (shared block).
    // Handler: src/lib/sync/tables/partners.js.
    table: 'partner_signals',
    pk: ['pair_id', 'user_id', 'week_start'],
    conflictStrategy: 'last_write_wins',
    serverAuthoritative: false,
    softDelete: false,
    direction: 'bidirectional',
  },
  {
    // Theme G (2026-06-12): the assembled meal plan is computed on device
    // from the synced target + prefs, but the EXACT active plan (swaps,
    // coach edits, training-day answers) must survive a device change
    // rather than regenerate differently. One latest row per user moves;
    // deletes propagate as tombstones. Cloud migration 086. Handler:
    // src/lib/sync/tables/mealPlans.js.
    table: 'meal_plans',
    pk: 'id',
    conflictStrategy: 'last_write_wins',
    serverAuthoritative: false,
    softDelete: true,
    direction: 'bidirectional',
  },
  {
    // Plan folders (Hevy teardown R1). User-owned organisation of the My Plans
    // list (= programmes); FREE feature, no Pro gate. One row per folder, own-row
    // RLS. Bidirectional LWW on epoch-ms updated_at, soft-delete tombstones
    // propagate (deleting a folder unfiles its plans and tombstones the folder).
    // Cloud migration 089. Handler: src/lib/sync/tables/planFolders.js.
    table: 'plan_folders',
    pk: 'id',
    conflictStrategy: 'last_write_wins',
    serverAuthoritative: false,
    softDelete: true,
    direction: 'bidirectional',
  },
  {
    // Per-day-of-week calorie planning offsets (design-usability audit
    // 2026-07-09, finding L05-PDT1). One row per user; the offsets are
    // display-only kcal deltas the diary adds to the base target
    // (src/lib/food/perDayTargets.js), never a coaching write, never a
    // floor. No soft delete: "Reset all to base target" writes zeros, it
    // never deletes the row. Cloud migration 110 (founder-run, not yet
    // applied). Handler: src/lib/sync/tables/perDayTargetOffsets.js.
    table: 'perday_target_offsets',
    pk: 'user_id',
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
