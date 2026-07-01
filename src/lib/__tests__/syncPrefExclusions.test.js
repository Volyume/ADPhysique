/**
 * F1 (audit SD-1, CRITICAL): sync watermarks/cursors are DEVICE state and must
 * never ride the user_prefs sync. They previously did (keyed by the Supabase
 * uid, identical across devices), so device B could import device A's fresher
 * push cursor, defeating the advance-only-on-a-clean-push hold-back — rows
 * that failed to push were skipped forever with no error, and the sign-out
 * wipe then destroyed them. These guards pin every cursor-class key OUT of
 * shouldSyncPref, plus the other device-bound artefacts (the in-progress
 * workout crash snapshot and the notification timezone baseline).
 */

jest.mock('../supabase', () => ({ getSupabaseClient: () => null }));
jest.mock('../errorLog', () => ({
  logError: jest.fn(), logWarn: jest.fn(), logInfo: jest.fn(),
}));

const { shouldSyncPref } = require('../sync');

describe('shouldSyncPref excludes device-bound keys (F1 / SD-1)', () => {
  const DEVICE_BOUND = [
    '@volyume_pull_wm_abc123_workouts',
    '@volyume_push_wm_abc123_workouts',
    '@volyume_food_last_pushed_abc123',
    '@volyume_food_last_pulled_abc123',
    '@volyume_active_workout',
    '@volyume_active_workout_abc123',
    '@volyume_notif_tz_offset',
    // The pre-existing exclusions must survive the F1 change.
    '@volyume_crash_log',
    '@volyume_local_user_id',
    '@volyume_palette_recents',
    '@volyume_expo_push_token',
  ];

  test.each(DEVICE_BOUND)('%s never syncs', (key) => {
    expect(shouldSyncPref(key)).toBe(false);
  });

  test('genuine user preferences still sync', () => {
    expect(shouldSyncPref('@volyume_quiet_hours_v1')).toBe(true);
    expect(shouldSyncPref('@volyume_notification_prefs')).toBe(true);
  });

  test('non-volyume keys never sync (prefix gate intact)', () => {
    expect(shouldSyncPref('some_random_key')).toBe(false);
  });

  // Canary: if a future cursor/watermark key is added under a new name, this
  // sweep catches the naming families we know about. A new family still needs
  // adding to PREF_EXCLUDE_PATTERNS — and to this list.
  test('no cursor-family key shape is syncable', () => {
    const shapes = [
      '@volyume_pull_wm_X_Y', '@volyume_push_wm_X_Y',
      '@volyume_food_last_pushed_X', '@volyume_food_last_pulled_X',
    ];
    for (const key of shapes) expect(shouldSyncPref(key)).toBe(false);
  });
});
