/**
 * CAMPAIGN 14 job 1 — preference sync is FAIL-CLOSED.
 *
 * What this suite pins and why:
 *
 * The generic AsyncStorage pref sync used to be allow-by-prefix. Every
 * `@volyume_*` key shipped to `user_prefs` unless a human remembered to add
 * it to an exclusion list. That is backwards for user control and privacy:
 * a new key became cross-device state simply by using the normal namespace,
 * and the only defence against a device-local, ephemeral, sensitive or
 * implementation-only key leaking was somebody noticing in review. Campaign
 * 10H closed one such leak (the analytics opt-out) BY NAME and recorded the
 * architecture as still fail-open.
 *
 * The model is now an allowlist: a key reaches the cloud only by being
 * deliberately classified in SYNCED_PREF_PATTERNS as cross-device user
 * state. An UNKNOWN key does not sync, in EITHER direction, because push
 * and pull share the one predicate.
 *
 * These tests are written to fail if anyone re-opens the default. The
 * unknown-key cases below are the load-bearing ones: they must stay `false`
 * for keys that nothing has ever classified.
 */

jest.mock('../supabase', () => ({ getSupabaseClient: () => null }));
jest.mock('../errorLog', () => ({
  logError: jest.fn(), logWarn: jest.fn(), logInfo: jest.fn(),
}));

const fs = require('fs');
const path = require('path');
const { shouldSyncPref } = require('../sync');

const SYNC_SRC = fs.readFileSync(path.resolve(__dirname, '../sync.js'), 'utf8');

describe('C14-1 an unknown @volyume_ key does NOT sync (the whole point)', () => {
  // None of these exist. That is exactly why they are here: the previous
  // model would have shipped every one of them to the cloud purely because
  // of the namespace. Under the allowlist an unclassified key fails safe.
  const UNKNOWN = [
    '@volyume_some_future_feature_flag',
    '@volyume_experiment_bucket_v3',
    '@volyume_debug_overlay_enabled',
    '@volyume_internal_scratch_state',
    '@volyume_last_seen_tooltip_xyz',
    '@volyume_cached_render_metrics',
    '@volyume_new_health_answers_v1',
  ];

  test.each(UNKNOWN)('%s is refused by omission', (key) => {
    expect(shouldSyncPref(key)).toBe(false);
  });

  test('an unknown key is refused on the PULL side too, not just the push', () => {
    // Push and pull call the same predicate, so one classification governs
    // both directions and a key can never be uploadable but not
    // downloadable (or the reverse). _pullUserPrefs is not exported, so
    // this is pinned at source in the repo's existing scoped style.
    const start = SYNC_SRC.indexOf('async function _pullUserPrefs');
    expect(start).toBeGreaterThan(-1);
    const end = SYNC_SRC.indexOf('\n// ─── Per-table pull helpers', start);
    const body = SYNC_SRC.slice(start, end === -1 ? undefined : end);
    const filterIdx = body.indexOf('shouldSyncPref(');
    const writeIdx = body.indexOf('AsyncStorage.multiSet(');
    expect(filterIdx).toBeGreaterThan(-1);
    expect(writeIdx).toBeGreaterThan(filterIdx);
  });

  test('the push side filters every key through the same predicate', () => {
    const start = SYNC_SRC.indexOf('async function _pushAllUserPrefs');
    expect(start).toBeGreaterThan(-1);
    const body = SYNC_SRC.slice(start, start + 2000);
    expect(body).toMatch(/getAllKeys\(\)/);
    expect(body).toMatch(/\.filter\(shouldSyncPref\)/);
  });

  test('the single-key push path is gated by the same predicate', () => {
    const start = SYNC_SRC.indexOf('export async function syncUserPref');
    expect(start).toBeGreaterThan(-1);
    const body = SYNC_SRC.slice(start, start + 800);
    expect(body).toMatch(/!shouldSyncPref\(key\)/);
  });

  test('shouldSyncPref is an allowlist, not a blocklist, at source', () => {
    // A blocklist returns true at the end. An allowlist returns the result
    // of matching the synced list. If this ever reverts to `return true`,
    // every unknown key silently starts syncing again.
    const start = SYNC_SRC.indexOf('export function shouldSyncPref');
    expect(start).toBeGreaterThan(-1);
    const body = SYNC_SRC.slice(start, SYNC_SRC.indexOf('\n}', start));
    expect(body).toMatch(/SYNCED_PREF_PATTERNS\.some/);
    expect(body).not.toMatch(/return true;/);
  });
});

describe('C14-1 every deliberately-synced user choice is still allowlisted', () => {
  // Regression cover for the inversion itself: closing the default must not
  // have quietly dropped a preference the user expects to follow them onto
  // a new device. Each entry is a real live key with a real writer.
  const SYNCED = [
    '@volyume_units',
    '@volyume_a11y_prefs',
    '@volyume_workout_prefs',
    '@volyume_schedule_v1',
    '@volyume_intent_prompt_off',
    '@volyume_physique_tracking_enabled',
    '@volyume_user_profile_abc123',
    '@volyume_notification_prefs',
    '@volyume_quiet_hours_v1',
    '@volyume_meal_reminders',
    '@volyume_reminder_enabled_v1',
    '@volyume_reminder_time_v1',
    '@volyume_meal_labels',
    '@volyume_meals_per_day',
    '@volyume_water_target_ml',
    '@volyume_nutrition_targets',
    '@volyume_perday_target_offsets_abc123',
    '@volyume_landmarks_abc123',
    '@volyume_progress_scan_hide_exact_numbers',
    '@volyume_progress_scan_timer_seconds',
    '@volyume_unilateral_exercises',
    '@volyume_unilateral_asked_exercises',
    '@volyume_chart_window_weight',
    '@volyume_chart_metric_detail',
    '@volyume_streak_v1_abc123',
    '@volyume_winback_episode_abc123',
    '@volyume_wellbeing_mode',
  ];

  test.each(SYNCED)('%s still restores on a new device', (key) => {
    expect(shouldSyncPref(key)).toBe(true);
  });

  test('every guarded pref family is also a synced family', () => {
    // A guarded pref is one whose cloud copy must not clobber a fresher
    // local edit. Guarding a key that never syncs would be dead code, and
    // more importantly a guarded key dropped from the allowlist by mistake
    // would stop restoring while still looking protected.
    const { isGuardedPref } = require('../sync');
    const guarded = [
      '@volyume_landmarks_abc123',
      '@volyume_wellbeing_mode',
      '@volyume_user_profile_abc123',
      '@volyume_streak_v1_abc123',
      '@volyume_notification_prefs',
      '@volyume_quiet_hours_v1',
      '@volyume_winback_episode_abc123',
    ];
    for (const key of guarded) {
      expect(isGuardedPref(key)).toBe(true);
      expect(shouldSyncPref(key)).toBe(true);
    }
  });
});

describe('C14-1 privacy and safety keys stay refused (belt and braces)', () => {
  // The exclusion list is DELIBERATELY retained as a second gate. These
  // families were named out by Campaign 10H and the Codex audit; they must
  // stay refused even if someone later widens the allowlist by mistake, so
  // the exclusion check runs BEFORE the allowlist check.
  const REFUSED = [
    '@volyume_privacy_prefs',
    '@volyume_privacy_prefs_v2',
    '@volyume_scoff_answers',
    '@volyume_cycle_tracking',
    '@volyume_cycle_tracking_v2',
    '@volyume_error_log_v1',
    '@volyume_last_crash_meta_v1',
    '@volyume_feedback_pending_v1',
    '@volyume_pro_onboarding_draft_abc123',
    '@volyume_pref_written_at_@volyume_wellbeing_mode',
  ];

  test.each(REFUSED)('%s never reaches the cloud', (key) => {
    expect(shouldSyncPref(key)).toBe(false);
  });

  test('the exclusion gate is evaluated before the allowlist', () => {
    const start = SYNC_SRC.indexOf('export function shouldSyncPref');
    const body = SYNC_SRC.slice(start, SYNC_SRC.indexOf('\n}', start));
    const excludeIdx = body.indexOf('PREF_EXCLUDE_PATTERNS');
    const allowIdx = body.indexOf('SYNCED_PREF_PATTERNS');
    expect(excludeIdx).toBeGreaterThan(-1);
    expect(allowIdx).toBeGreaterThan(excludeIdx);
  });

  test('the write stamps for guarded prefs stay device-local', () => {
    // They record when THIS device last wrote a guarded pref. Importing
    // another device's clock would defeat the guard they exist for.
    expect(shouldSyncPref('@volyume_pref_written_at_@volyume_landmarks_abc'))
      .toBe(false);
  });
});

describe('C14-1 device-local and ephemeral state stays on the device', () => {
  const LOCAL = [
    '@volyume_crash_log',
    '@volyume_local_user_id',
    '@volyume_palette_recents',
    '@volyume_expo_push_token',
    '@volyume_pull_wm_abc_workouts',
    '@volyume_push_wm_abc_workouts',
    '@volyume_food_last_pushed_abc',
    '@volyume_food_last_pulled_abc',
    '@volyume_active_workout',
    '@volyume_notif_tz_offset',
  ];

  test.each(LOCAL)('%s never syncs', (key) => {
    expect(shouldSyncPref(key)).toBe(false);
  });

  test('the prefix gate and the type gate both hold', () => {
    expect(shouldSyncPref('some_random_key')).toBe(false);
    expect(shouldSyncPref('units')).toBe(false);
    expect(shouldSyncPref('')).toBe(false);
    expect(shouldSyncPref(null)).toBe(false);
    expect(shouldSyncPref(undefined)).toBe(false);
    expect(shouldSyncPref(42)).toBe(false);
    expect(shouldSyncPref({})).toBe(false);
  });
});

describe('C14-1 state with its OWN sync mechanism does not double-sync', () => {
  // Anything that already travels through the registry-driven sync engine
  // (its own table, its own conflict rule) must not ALSO ride the generic
  // pref blob. Two writers for one piece of state means the loser's copy
  // silently wins on whichever ordering the session happens to take.
  const OWN_MECHANISM = [
    '@volyume_workouts_cache_v1',
    '@volyume_food_log_cache',
    '@volyume_measurements_cache',
    '@volyume_checkins_cache',
    '@volyume_body_weight_cache',
  ];

  test.each(OWN_MECHANISM)('%s is not carried by the pref blob', (key) => {
    expect(shouldSyncPref(key)).toBe(false);
  });
});
