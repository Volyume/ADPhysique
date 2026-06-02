import { shouldSyncPref } from '../sync';

// Custom volume targets (MEV/MAV/MRV) are stored in AsyncStorage under
// `@volyume_landmarks_<uid>` and persist across reinstall ONLY because the
// generic user_prefs sync round-trips every `@volyume_` key that isn't on the
// exclude list. This guard pins that contract: if a future exclude pattern
// (or a prefix change) ever drops the landmark key, custom targets would
// silently stop surviving a reinstall, and this test fails first.
describe('shouldSyncPref: custom volume targets stay syncable', () => {
  test('the landmark key syncs', () => {
    expect(shouldSyncPref('@volyume_landmarks_abc123')).toBe(true);
    expect(shouldSyncPref('@volyume_landmarks_00000000-0000-0000-0000-000000000000')).toBe(true);
  });

  test('device-bound and noise keys stay excluded', () => {
    expect(shouldSyncPref('@volyume_crash_log')).toBe(false);
    expect(shouldSyncPref('@volyume_local_user_id')).toBe(false);
    expect(shouldSyncPref('@volyume_expo_push_token_xyz')).toBe(false);
  });

  test('keys without the app prefix never sync', () => {
    expect(shouldSyncPref('landmarks')).toBe(false);
    expect(shouldSyncPref('some_other_key')).toBe(false);
  });
});
