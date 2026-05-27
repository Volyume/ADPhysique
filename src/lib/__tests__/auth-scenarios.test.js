/**
 * auth-scenarios.test.js
 *
 * End-to-end simulations of every membership / sign-in / sign-out / delete
 * combination. Runs the actual store actions (restoreSessionFromCloud,
 * refreshTierFromCloud, setTier, clearAuthStateForSignOut, initLocalUser,
 * checkTier) with mocked AsyncStorage + Supabase responses.
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

let mockCloudProfile = null;
let mockSupabaseError = null;

jest.mock('../supabase', () => ({
  getSupabaseClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: mockCloudProfile,
            error: mockSupabaseError,
          }),
        }),
      }),
    }),
  }),
}));

jest.mock('../sync', () => ({
  syncProfile: jest.fn().mockResolvedValue({}),
  // Per IDENTITY_AND_OWNERSHIP_LOCKED.md the sign-out flow push-firsts
  // local data to cloud before wiping. In tests we don't run real
  // Supabase, so mock the push to succeed unconditionally; otherwise
  // clearAuthStateForSignOut aborts with { ok: false, reason: 'unsynced' }
  // and the state-clear assertions all fail.
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

// Use a single store across tests; reset its state in beforeEach by
// calling clearAuthStateForSignOut + clearing AsyncStorage. Avoids
// jest.resetModules which would re-require AsyncStorage with a fresh
// mock that doesn't share state with the singleton instance.
const useAppStore = require('../../store/useAppStore').default;
const AsyncStorage = require('@react-native-async-storage/async-storage').default
  ?? require('@react-native-async-storage/async-storage');

beforeEach(async () => {
  mockCloudProfile = null;
  mockSupabaseError = null;
  await AsyncStorage.clear();
  // Reset in-memory state to a clean post-boot state
  useAppStore.setState({
    user: null,
    session: null,
    userProfile: null,
    tier: null,
    tierChecked: false,
    firstRunComplete: false,
    firstRunChecked: false,
  });
});

// ─── Scenario 1: Fresh install picks Pro ─────────────────────────────────────

describe('Scenario: Welcome → pick Pro', () => {
  test('setTier(pro) lands pro in store + storage', async () => {
    await useAppStore.getState().setTier('pro');
    expect(useAppStore.getState().tier).toBe('pro');
    expect(await AsyncStorage.getItem('@volyume_tier')).toBe('pro');
  });
});

// ─── Scenario 2: Welcome → pick Free ─────────────────────────────────────────

describe('Scenario: Welcome → pick Free', () => {
  test('setTier(free) lands free in store + storage', async () => {
    await useAppStore.getState().setTier('free');
    expect(useAppStore.getState().tier).toBe('free');
    expect(await AsyncStorage.getItem('@volyume_tier')).toBe('free');
  });
});

// ─── Scenario 3: Pro signs out + signs back in (cloud profile intact) ────────

describe('Scenario: Pro signs out + signs back in (cloud profile intact)', () => {
  test('tier returns to pro after restoreSessionFromCloud', async () => {
    // Step 1 — signed in as Pro
    useAppStore.setState({
      user: { id: 'u1' }, session: { user: { id: 'u1' } },
      tier: 'pro', firstRunComplete: true,
    });
    await AsyncStorage.setItem('@volyume_tier', 'pro');
    await AsyncStorage.setItem('@volyume_first_run_complete', 'true');

    // Step 2 — sign out
    await useAppStore.getState().clearAuthStateForSignOut();
    expect(useAppStore.getState().tier).toBeNull();
    expect(useAppStore.getState().firstRunComplete).toBe(false);

    // Step 3 — sign back in. Cloud profile exists; cloud.tier='free' (beta)
    mockCloudProfile = {
      first_name: 'Allan',
      training_focus: 'bodybuilding',
      training_age: 5,
      primary_equipment: 'full_gym',
      units: 'kg',
      bar_weight: 20,
      tier: 'free',
      first_run_complete: true,
    };
    await useAppStore.getState().restoreSessionFromCloud('u1');

    expect(useAppStore.getState().tier).toBe('pro');
    expect(useAppStore.getState().firstRunComplete).toBe(true);
    expect(useAppStore.getState().userProfile?.firstName).toBe('Allan');
  });
});

// ─── Scenario 4: Sign in with deleted account (no cloud profile) ─────────────

describe('Scenario: Sign-in with deleted account (cloud profile missing)', () => {
  test('tier becomes pro; firstRunComplete unchanged (stays false from sign-out)', async () => {
    await useAppStore.getState().clearAuthStateForSignOut();
    mockCloudProfile = null;
    await useAppStore.getState().restoreSessionFromCloud('u1');
    expect(useAppStore.getState().tier).toBe('pro');
    expect(useAppStore.getState().firstRunComplete).toBe(false);
  });
});

// ─── Scenario 5: App restart while signed in as Pro ──────────────────────────

describe('Scenario: App restart while signed in as Pro', () => {
  test('refreshTierFromCloud preserves pro even though cloud says free', async () => {
    await AsyncStorage.setItem('@volyume_tier', 'pro');
    await useAppStore.getState().checkTier();
    expect(useAppStore.getState().tier).toBe('pro');

    const fakeClient = {
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: { tier: 'free' }, error: null }),
          }),
        }),
      }),
    };
    await useAppStore.getState().refreshTierFromCloud(fakeClient, 'u1');
    expect(useAppStore.getState().tier).toBe('pro');
  });
});

// ─── Scenario 6: Brand new Pro signup — cloud profile not yet created ────────

describe('Scenario: Brand new Pro signup', () => {
  test('tier=pro set up front, firstRunComplete stays false', async () => {
    await useAppStore.getState().setTier('pro');
    mockCloudProfile = null;
    await useAppStore.getState().restoreSessionFromCloud('newuser');
    expect(useAppStore.getState().tier).toBe('pro');
    expect(useAppStore.getState().firstRunComplete).toBe(false);
  });
});

// ─── Scenario 7: Free user upgrades to Pro via ProUpgrade OAuth ──────────────

describe('Scenario: Free user upgrades to Pro via OAuth', () => {
  test('Free + firstRunComplete=true → Pro + firstRunComplete=true (no re-onboard)', async () => {
    await useAppStore.getState().setTier('free');
    await AsyncStorage.setItem('@volyume_first_run_complete', 'true');
    useAppStore.setState({ firstRunComplete: true, firstRunChecked: true });

    mockCloudProfile = null; // brand-new cloud account, no profile yet
    await useAppStore.getState().restoreSessionFromCloud('u1');

    expect(useAppStore.getState().tier).toBe('pro');
    expect(useAppStore.getState().firstRunComplete).toBe(true);
  });
});

// ─── Scenario 8: checkTier loads persisted tier on app launch ────────────────

describe('Scenario: App launch — checkTier loads persisted value', () => {
  test('persisted pro round-trips', async () => {
    await AsyncStorage.setItem('@volyume_tier', 'pro');
    await useAppStore.getState().checkTier();
    expect(useAppStore.getState().tier).toBe('pro');
    expect(useAppStore.getState().tierChecked).toBe(true);
  });

  test('persisted free round-trips', async () => {
    await AsyncStorage.setItem('@volyume_tier', 'free');
    await useAppStore.getState().checkTier();
    expect(useAppStore.getState().tier).toBe('free');
  });

  test('no tier + completed first-run elevates to pro (legacy users)', async () => {
    await AsyncStorage.setItem('@volyume_first_run_complete', 'true');
    await useAppStore.getState().checkTier();
    expect(useAppStore.getState().tier).toBe('pro');
  });

  test('no tier + no first-run leaves tier=null', async () => {
    await useAppStore.getState().checkTier();
    expect(useAppStore.getState().tier).toBeNull();
    expect(useAppStore.getState().tierChecked).toBe(true);
  });
});

// ─── Scenario 9: Pro switches to Free in Settings ────────────────────────────

describe('Scenario: Pro user explicitly switches to Free', () => {
  test('setTier(free) lands free + storage', async () => {
    await useAppStore.getState().setTier('pro');
    await useAppStore.getState().setTier('free');
    expect(useAppStore.getState().tier).toBe('free');
    expect(await AsyncStorage.getItem('@volyume_tier')).toBe('free');
  });
});

// ─── Scenario 10: refreshTierFromCloud safety ────────────────────────────────

describe('Scenario: refreshTierFromCloud safety guards', () => {
  test('null client = no-op', async () => {
    await useAppStore.getState().setTier('pro');
    await useAppStore.getState().refreshTierFromCloud(null, 'u1');
    expect(useAppStore.getState().tier).toBe('pro');
  });

  test('null userId = no-op', async () => {
    await useAppStore.getState().setTier('pro');
    await useAppStore.getState().refreshTierFromCloud({ from: () => {} }, null);
    expect(useAppStore.getState().tier).toBe('pro');
  });
});

// ─── Scenario 11: Cloud query error mid sign-in ──────────────────────────────

describe('Scenario: Cloud query error during restoreSessionFromCloud', () => {
  test('tier still forced to pro via beta policy', async () => {
    mockCloudProfile = null;
    mockSupabaseError = new Error('Network error');
    await useAppStore.getState().restoreSessionFromCloud('u1');
    expect(useAppStore.getState().tier).toBe('pro');
  });
});

// ─── Scenario 12: Repeated sign-in/sign-out cycles ───────────────────────────

describe('Scenario: Three sign-in/sign-out cycles', () => {
  test('every cycle lands in the right end state', async () => {
    mockCloudProfile = { tier: 'free', first_run_complete: true, first_name: 'Allan' };

    for (let i = 0; i < 3; i++) {
      await useAppStore.getState().restoreSessionFromCloud('u1');
      expect(useAppStore.getState().tier).toBe('pro');
      expect(useAppStore.getState().firstRunComplete).toBe(true);

      await useAppStore.getState().clearAuthStateForSignOut();
      expect(useAppStore.getState().tier).toBeNull();
      expect(useAppStore.getState().firstRunComplete).toBe(false);
    }
  });
});

// ─── Scenario 13: User switches accounts on same device ──────────────────────

describe('Scenario: User A signs out, User B signs in (different cloud account)', () => {
  test('User B gets fresh state, not user A leftovers', async () => {
    // User A is signed in as Pro
    useAppStore.setState({
      user: { id: 'userA' }, session: { user: { id: 'userA' } },
      tier: 'pro', firstRunComplete: true,
      userProfile: { firstName: 'Allan', units: 'kg' },
    });
    await AsyncStorage.setItem('@volyume_user_profile_userA', JSON.stringify({ firstName: 'Allan', units: 'kg' }));

    // User A signs out
    await useAppStore.getState().clearAuthStateForSignOut();
    expect(useAppStore.getState().userProfile).toBeNull();

    // User B signs in with their cloud profile
    mockCloudProfile = {
      first_name: 'Bob',
      training_focus: 'powerlifting',
      training_age: 2,
      units: 'lbs',
      bar_weight: 45,
      tier: 'free',
      first_run_complete: true,
    };
    await useAppStore.getState().restoreSessionFromCloud('userB');

    expect(useAppStore.getState().tier).toBe('pro');
    expect(useAppStore.getState().userProfile?.firstName).toBe('Bob');
    expect(useAppStore.getState().userProfile?.units).toBe('lbs');
  });
});

// ─── Scenario 14: setTier(null) is a no-op via API (shouldn't be possible) ───

describe('Scenario: setTier with falsy value', () => {
  test('setTier(null) still writes null but does not throw', async () => {
    await useAppStore.getState().setTier('pro');
    await useAppStore.getState().setTier(null);
    expect(useAppStore.getState().tier).toBeNull();
  });
});
