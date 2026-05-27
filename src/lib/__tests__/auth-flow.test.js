/**
 * Integration tests for the sign-out / sign-in / cross-user / delete-account
 * state transitions in useAppStore.
 *
 * These don't exercise Supabase calls (those are mocked) but they DO
 * verify the local state machine that decides what's wiped, kept, and
 * routed to next.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

// Stub the sync module: clearAuthStateForSignOut now push-firsts to
// cloud before wiping local. In tests we don't run Supabase, so make
// the push call succeed unconditionally so the sign-out flow proceeds
// to the wipe step instead of aborting with { ok: false }.
jest.mock('../sync', () => ({
  bulkUploadLocalData: jest.fn().mockResolvedValue(undefined),
  cancelScheduledSync: jest.fn(),
}));

// flushPendingTelemetry moved to lib/engineTelemetry (was previously
// being destructured off lib/sync in error). The store now requires it
// from the right place; the test follows.
jest.mock('../engineTelemetry', () => ({
  track: jest.fn().mockResolvedValue(undefined),
  flushPendingTelemetry: jest.fn().mockResolvedValue(undefined),
}));

beforeEach(() => {
  jest.resetModules();
  return AsyncStorage.clear();
});

describe('clearAuthStateForSignOut', () => {
  test('wipes every AsyncStorage key — sign-out leaves nothing on the device', async () => {
    // Policy 2026-05-24 (founder direction): sign-out wipes
    // everything from the device for this user. Same hammer as
    // delete-account. No carve-outs for accessibility prefs, crash
    // log, install counters, or anything else. If a user wants a
    // setting back, they can set it again after signing in.
    const Store = require('@react-native-async-storage/async-storage');
    const setItem = Store.default?.setItem ?? Store.setItem;
    const target = Store.default ?? Store;
    const SEEDED = {
      '@volyume_local_user_id': 'u1',
      '@volyume_tier': 'pro',
      '@volyume_user_profile_u1': JSON.stringify({ firstName: 'Allan' }),
      '@volyume_block_snooze': '1',
      '@volyume_schedule_v1': '{}',
      '@volyume_body_metrics_migrated_u1': 'true',
      '@volyume_first_run_complete': 'true',
      '@volyume_first_run_complete_u1': 'true',
      '@volyume_a11y_prefs': '{"reduceMotion":true}',
      '@volyume_crash_log': '{}',
      'volyume_review_prompted': '1',
      'volyume_notif_prompt_seen': '1',
      'volyume_sessions_since_install': '42',
    };
    for (const [k, v] of Object.entries(SEEDED)) {
      await setItem.call(target, k, v);
    }

    const useAppStore = require('../../store/useAppStore').default;
    await useAppStore.getState().clearAuthStateForSignOut();

    const getItem = Store.default?.getItem ?? Store.getItem;
    for (const k of Object.keys(SEEDED)) {
      expect(await getItem.call(target, k)).toBeNull();
    }
  });

  test('resets in-memory store to a clean post-signout state', async () => {
    const useAppStore = require('../../store/useAppStore').default;
    // Seed in-memory state as if a user was signed in mid-workout
    useAppStore.setState({
      user: { id: 'u1', email: 'a@b.c' },
      session: { user: { id: 'u1' } },
      userProfile: { firstName: 'Allan' },
      tier: 'pro',
      tierChecked: true,
      firstRunComplete: true,
      firstRunChecked: true,
      activeWorkout: { id: 'w1' },
      workoutExercises: [{ exercise: { id: 'e1' }, sets: [] }],
      currentExerciseIndex: 0,
      restTimerActive: true,
      prCelebration: { type: '1rm_estimate' },
      prCelebrationQueue: [{ type: 'heaviest_weight' }],
    });

    await useAppStore.getState().clearAuthStateForSignOut();

    const s = useAppStore.getState();
    expect(s.user).toBeNull();
    expect(s.session).toBeNull();
    expect(s.userProfile).toBeNull();
    expect(s.tier).toBeNull();
    // tierChecked / firstRunChecked MUST stay true after sign-out so the
    // splash screen doesn't hang waiting for a re-check that never runs.
    // The "checked" flag means we've verified the value — clearing it
    // would be incorrect (we just SET it to null, that IS the verified
    // result). See bug fix in wave 25.
    expect(s.tierChecked).toBe(true);
    expect(s.firstRunComplete).toBe(false);
    expect(s.firstRunChecked).toBe(true);
    expect(s.activeWorkout).toBeNull();
    expect(s.workoutExercises).toEqual([]);
    expect(s.currentExerciseIndex).toBe(0);
    expect(s.restTimerActive).toBe(false);
    expect(s.prCelebration).toBeNull();
    expect(s.prCelebrationQueue).toEqual([]);
  });

  test('does not throw if AsyncStorage.getAllKeys rejects', async () => {
    const Store = require('@react-native-async-storage/async-storage');
    const target = Store.default ?? Store;
    const original = target.getAllKeys;
    target.getAllKeys = jest.fn().mockRejectedValue(new Error('disk full'));
    try {
      const useAppStore = require('../../store/useAppStore').default;
      // Per the locked design, sign-out returns { ok: true } on
      // success and { ok: false, reason: ... } if it had to abort
      // (e.g. cloud push failed). An AsyncStorage failure inside the
      // local wipe step is caught + logged but doesn't abort the
      // sign-out -- in-memory state still clears.
      const result = await useAppStore.getState().clearAuthStateForSignOut();
      expect(result?.ok).toBe(true);
      expect(useAppStore.getState().user).toBeNull();
      expect(useAppStore.getState().tier).toBeNull();
    } finally {
      target.getAllKeys = original;
    }
  });
});

describe('uid() — UUID v4 format', () => {
  test('produces valid UUID v4 strings', () => {
    // Verifies the UUID helper format directly. The earlier shape of
    // this test routed through initLocalUser to get a uid; that
    // action was deleted per IDENTITY_AND_OWNERSHIP_LOCKED.md rule
    // 1 / 5 / anti-patterns. Calling generateUUID via the store
    // exposed helper instead.
    // eslint-disable-next-line global-require
    const { generateUUID } = require('../../store/useAppStore');
    const id = generateUUID();
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });
});
