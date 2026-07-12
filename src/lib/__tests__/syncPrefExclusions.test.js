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

describe('shouldSyncPref excludes special-category / sensitive keys (Codex audit AC-01/H-03)', () => {
  // These are special-category health data the wellbeing screen promises stay
  // device-only, or transient diagnostics/drafts with no place in the cloud.
  // The prefs sync is allow-by-prefix (fail-open), so each MUST be named out
  // until the model is inverted to a fail-closed allowlist.
  const SENSITIVE = [
    '@volyume_scoff_answers',            // raw ED-screening answers (Article 9)
    '@volyume_cycle_tracking',           // menstrual-cycle data (Article 9)
    '@volyume_cycle_tracking_v2',
    '@volyume_error_log_v1',
    '@volyume_last_crash_meta_v1',
    '@volyume_feedback_pending_v1',
    '@volyume_feedback_prompt_history_v1',
    '@volyume_pro_onboarding_draft_abc123',
  ];
  test.each(SENSITIVE)('%s never syncs to the cloud', (key) => {
    expect(shouldSyncPref(key)).toBe(false);
  });

  // The non-sensitive counterparts these keys sit near MUST still sync, so the
  // exclusion did not over-reach and break legitimate cross-device restore.
  test('non-sensitive preferences near the excluded families still sync', () => {
    expect(shouldSyncPref('@volyume_quiet_hours_v1')).toBe(true);
    expect(shouldSyncPref('@volyume_notification_prefs')).toBe(true);
  });
});

describe('the PULL side applies the same exclusions (F1, hostile-review blocker)', () => {
  // Excluding keys from push alone is not enough: older builds already pushed
  // the device-bound rows to the cloud, and with the push no longer refreshing
  // them they sit frozen-stale. _pullUserPrefs runs LAST in pullFromCloud, so
  // an unfiltered multiSet would overwrite the watermarks the pull just set
  // (silently skipping locally-unpushed rows) and could resurrect another
  // device's dead active-workout snapshot. Source guard in the repo's scoped
  // style (_pullUserPrefs is not exported).
  const fs = require('fs');
  const path = require('path');
  const SYNC = fs.readFileSync(path.resolve(__dirname, '../sync.js'), 'utf8');

  function fnBody(decl) {
    const start = SYNC.indexOf(decl);
    expect(start).toBeGreaterThan(-1);
    const next = SYNC.indexOf('\nasync function ', start + decl.length);
    return SYNC.slice(start, next === -1 ? undefined : next);
  }

  test('_pullUserPrefs filters cloud rows through shouldSyncPref before multiSet', () => {
    const body = fnBody('async function _pullUserPrefs');
    expect(body).toMatch(/\.filter\(r => shouldSyncPref\(r\?\.key \?\? ''\)\)/);
    const filterIdx = body.indexOf(".filter(r => shouldSyncPref(r?.key ?? ''))");
    const writeIdx = body.indexOf('AsyncStorage.multiSet(');
    expect(filterIdx).toBeGreaterThan(-1);
    expect(writeIdx).toBeGreaterThan(filterIdx);
  });
});
