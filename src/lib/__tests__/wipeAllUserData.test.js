/**
 * wipeAllUserData direct-table set (audit Phase 2 / finding A4).
 *
 * Sign-out and account-delete wipe local SQLite through wipeAllUserData. The
 * food tables were missing from its delete set, so on a shared device the
 * next user could read the prior user's cached food log, recipes, and water
 * (locked decision 2: sign-out wipes every user-scoped table). This pins the
 * food tables, and the core training / body / sync-mirror tables, into the
 * set the wipe iterates and deletes by user_id.
 *
 * The storage layer has no SQL engine under jest, so this is a contract guard
 * on the exported list (one source of truth shared with the wipe loop), not a
 * live-DB assertion.
 */
import { WIPE_DIRECT_TABLES } from '../database';

describe('wipeAllUserData direct-table set (A4)', () => {
  test('includes every user-scoped food table', () => {
    const food = [
      'food_entries', 'custom_foods', 'saved_meals',
      'recipes', 'recipe_ingredients',
      'daily_water', 'food_favourites', 'daily_intake_rollups',
      'food_frequents',
      // generated meal plan: user_id + a calorie-target snapshot (health
      // data); must never survive sign-out or account-delete
      'meal_plans',
    ];
    for (const t of food) expect(WIPE_DIRECT_TABLES).toContain(t);
  });

  test('still includes the core training, body, and sync-mirror tables', () => {
    const core = [
      'workout_sets', 'workouts', 'routines', 'programmes', 'mesocycles',
      'body_metric_log', 'nutrition_targets', 'notification_preferences',
      'pending_sync_ops',
    ];
    for (const t of core) expect(WIPE_DIRECT_TABLES).toContain(t);
  });

  test('includes every remaining user-scoped table (locked decision 2)', () => {
    // These four each carry a user_id column but were missing from the set, so
    // they survived sign-out, the cross-user safety net, and account-delete.
    // ed_pattern_flags is eating-disorder pattern state; engine_telemetry
    // leftovers could ship under the next account. Pin them so the omission
    // cannot silently return.
    const rest = ['cardio_log', 'ed_pattern_flags', 'tier_history', 'engine_telemetry'];
    for (const t of rest) expect(WIPE_DIRECT_TABLES).toContain(t);
  });

  test('has no duplicate entries', () => {
    expect(new Set(WIPE_DIRECT_TABLES).size).toBe(WIPE_DIRECT_TABLES.length);
  });
});
