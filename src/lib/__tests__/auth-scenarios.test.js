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
  // local data to cloud before wiping. It routes through syncAll (so the
  // food domain is pushed too, not just the legacy tables). In tests we
  // don't run real Supabase, so mock syncAll to report a clean cycle;
  // otherwise clearAuthStateForSignOut aborts with
  // { ok: false, reason: 'unsynced' } and the state-clear assertions fail.
  syncAll: jest.fn().mockResolvedValue({ status: 'synced' }),
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
const { getSupabaseClient } = require('../supabase');
const AsyncStorage = require('@react-native-async-storage/async-storage').default
  ?? require('@react-native-async-storage/async-storage');

// FULLY-FREE PRODUCT (founder decision 2026-09-03): every tier writer in the
// store funnels through _effectiveTier, which answers 'pro' while
// proGate.FULL_ACCESS_FOR_ALL is on. The scenarios below that used to assert a
// 'free' or null tier are INVERTED in place, each annotated; the auth, routing
// and cross-account-isolation properties they also cover are untouched.
// restoreSessionFromCloud restores the profile + first-run flag but not
// tier. The real onAuthStateChange runs both, so the scenarios below do
// too where the end-state tier matters.
async function signInFlow(uid) {
  await useAppStore.getState().restoreSessionFromCloud(uid);
  await useAppStore.getState().refreshTierFromCloud(getSupabaseClient(), uid);
}

beforeEach(async () => {
  mockCloudProfile = null;
  mockSupabaseError = null;
  await AsyncStorage.clear();
  // SYNC-3 guard is module-level; reset so a prior sign-out test can't leak it.
  require('../sync/signOutGuard').setSignOutWiping(false);
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

describe('Scenario: Welcome (there is no Free to pick any more)', () => {
  // INVERTED 2026-09-03 (fully-free product, founder decision). Volyume has no
  // Free/Pro split, so useAppStore._effectiveTier resolves every tier write to
  // the full-access tier. A caller asking for 'free' - including any dormant
  // billing path - cannot put a user on a reduced tier.
  test('setTier(free) resolves to full access, in store and in storage', async () => {
    await useAppStore.getState().setTier('free');
    expect(useAppStore.getState().tier).toBe('pro');
    expect(await AsyncStorage.getItem('@volyume_tier')).toBe('pro');
  });
});

// ─── Scenario 3: Pro signs out + signs back in (cloud profile intact) ────────

describe('Scenario: Pro signs out + signs back in (cloud profile intact)', () => {
  test('tier returns to pro after restoreSessionFromCloud', async () => {
    // Step 1, signed in as Pro
    useAppStore.setState({
      user: { id: 'u1' }, session: { user: { id: 'u1' } },
      tier: 'pro', firstRunComplete: true,
    });
    await AsyncStorage.setItem('@volyume_tier', 'pro');
    await AsyncStorage.setItem('@volyume_first_run_complete', 'true');

    // Step 2, sign out
    await useAppStore.getState().clearAuthStateForSignOut();
    expect(useAppStore.getState().tier).toBeNull();
    expect(useAppStore.getState().firstRunComplete).toBe(false);

    // Step 3, sign back in. Cloud profile intact; this user is a paying
    // Pro subscriber, so cloud.tier='pro'.
    mockCloudProfile = {
      first_name: 'Allan',
      training_focus: 'bodybuilding',
      training_age: 5,
      primary_equipment: 'full_gym',
      units: 'kg',
      bar_weight: 20,
      tier: 'pro',
      first_run_complete: true,
    };
    await signInFlow('u1');

    expect(useAppStore.getState().tier).toBe('pro');
    expect(useAppStore.getState().firstRunComplete).toBe(true);
    expect(useAppStore.getState().userProfile?.firstName).toBe('Allan');
  });
});

// ─── Scenario 3a: Trial cascade fields ride onto userProfile ─────────────────

describe('Scenario: cloud trial state lands on userProfile', () => {
  // The Subscription / ProUpgrade / CoachOutput screens resolve a user's
  // paid/trial stage off userProfile via lib/payments/cascade. If trial_state
  // and pro_trial_ends_at don't ride along with the cloud read, every
  // signed-in user reads back as 'free' / unstarted and the paywall misfires.
  test('refreshTierFromCloud merges trial_state + pro_trial_ends_at onto a cached profile', async () => {
    // Cached profile already in memory (the cold-launch session-restore path).
    useAppStore.setState({
      user: { id: 'u1' }, session: { user: { id: 'u1' } },
      userProfile: { firstName: 'Allan', units: 'kg', barWeight: 20 },
    });
    mockCloudProfile = {
      tier: 'pro',
      billing_period: 'annual',
      trial_state: 'trialing',
      pro_trial_ends_at: '2026-06-20T00:00:00.000Z',
    };

    await useAppStore.getState().refreshTierFromCloud(getSupabaseClient(), 'u1');

    const p = useAppStore.getState().userProfile;
    // INVERTED 2026-09-03 (fully-free product, founder decision). The mirror is
    // NOT written while FULL_ACCESS_FOR_ALL is on: copying trial_state /
    // pro_trial_ends_at back onto userProfile re-arms every trial surface that
    // reads the cascade stage off the profile, on the very next cloud read,
    // undoing the one-shot free conversion. The columns are still SELECTED, so
    // re-enabling this is one line.
    expect(p.trialState).toBeUndefined();
    expect(p.proTrialEndsAt).toBeUndefined();
    // The cached fields survive untouched, and the non-trial cloud fields still
    // land.
    expect(p.firstName).toBe('Allan');
    expect(useAppStore.getState().billingPeriod).toBe('annual');
  });

  test('restoreSessionFromCloud never mirrors trial fields onto a fresh profile (fully free)', async () => {
    mockCloudProfile = {
      first_name: 'Allan',
      training_focus: 'bodybuilding',
      training_age: 5,
      primary_equipment: 'full_gym',
      units: 'kg',
      bar_weight: 20,
      tier: 'pro',
      trial_state: 'expired',
      pro_trial_ends_at: '2026-05-01T00:00:00.000Z',
      first_run_complete: true,
    };

    await useAppStore.getState().restoreSessionFromCloud('u1');

    const p = useAppStore.getState().userProfile;
    // D137 (fully free product): the trial columns are never mirrored onto a
    // fresh profile -- that mirror is what re-armed every trial surface. The
    // rest of the profile still hydrates.
    expect(p.firstName).toBe('Allan');
    expect(p.trialState).toBeUndefined();
    expect(p.proTrialEndsAt).toBeUndefined();
  });
});

// ─── Scenario 3b: Sign-out push-first gate (food-loss guard) ─────────────────

describe('Scenario: sign-out aborts when the cloud push does not complete', () => {
  // The push-first runs syncAll so everything is pushed before the local wipe.
  // We abort only when we can't prove the push reached cloud: 'error', 'skipped'
  // (our push didn't run), or errored_count > 0. We do NOT abort on 'pending':
  // since E12 step 0 the depth behind 'pending' is the live retry queue
  // (pending_sync_ops), whose ops carry data the same cycle's FULL push
  // already re-pushed from SQLite; a genuine failure shows in errored_count.
  const sync = require('../sync');

  test.each(['error', 'skipped'])(
    'status %s keeps the user signed in and skips the wipe',
    async (status) => {
      sync.syncAll.mockResolvedValueOnce({ status });
      useAppStore.setState({
        user: { id: 'u1' }, session: { user: { id: 'u1' } },
        tier: 'pro', firstRunComplete: true,
      });

      const result = await useAppStore.getState().clearAuthStateForSignOut();

      expect(result).toEqual({ ok: false, reason: 'unsynced' });
      // State is untouched: sign-out was aborted before the wipe.
      expect(useAppStore.getState().user).toEqual({ id: 'u1' });
      expect(useAppStore.getState().tier).toBe('pro');
    },
  );

  // Re-audit fix: 'pending' (vestigial sync_queue depth) must NOT block sign-out
  // when the push itself was clean (errored_count 0). Otherwise a user who
  // toggled a notification setting can never sign out.
  test('pending status with zero errors proceeds to wipe + clears state', async () => {
    sync.syncAll.mockResolvedValueOnce({ status: 'pending', errored_count: 0 });
    useAppStore.setState({
      user: { id: 'u1' }, session: { user: { id: 'u1' } },
      tier: 'pro', firstRunComplete: true,
    });

    await useAppStore.getState().clearAuthStateForSignOut();

    expect(useAppStore.getState().user).toBeNull();
    expect(useAppStore.getState().tier).toBeNull();
  });

  // ...but a real push failure (errors > 0) still aborts even if the status
  // would otherwise read 'pending' / 'synced'.
  test('pending status with errored_count > 0 still aborts the wipe', async () => {
    sync.syncAll.mockResolvedValueOnce({ status: 'pending', errored_count: 2 });
    useAppStore.setState({
      user: { id: 'u1' }, session: { user: { id: 'u1' } },
      tier: 'pro', firstRunComplete: true,
    });

    const result = await useAppStore.getState().clearAuthStateForSignOut();

    expect(result).toEqual({ ok: false, reason: 'unsynced' });
    expect(useAppStore.getState().user).toEqual({ id: 'u1' });
  });

  // SYNC-2 gap: errors can occur in a cycle whose queue drained to empty, so
  // the status maps to 'synced' even though something failed. The guard must
  // also inspect errored_count, not just the status.
  test('synced status with errored_count > 0 still aborts the wipe', async () => {
    sync.syncAll.mockResolvedValueOnce({ status: 'synced', errored_count: 1 });
    useAppStore.setState({
      user: { id: 'u1' }, session: { user: { id: 'u1' } },
      tier: 'pro', firstRunComplete: true,
    });

    const result = await useAppStore.getState().clearAuthStateForSignOut();

    expect(result).toEqual({ ok: false, reason: 'unsynced' });
    expect(useAppStore.getState().user).toEqual({ id: 'u1' });
    expect(useAppStore.getState().tier).toBe('pro');
  });

  // SYNC-3: a committed sign-out raises the wipe guard (so lifecycle sync
  // triggers can't pull cloud rows back into the DB mid-wipe), and a
  // subsequent sign-in lifts it.
  test('a clean sign-out raises the wipe guard; a sign-in lifts it', async () => {
    const guard = require('../sync/signOutGuard');
    guard.setSignOutWiping(false);
    sync.syncAll.mockResolvedValueOnce({ status: 'synced' });
    useAppStore.setState({
      user: { id: 'u1' }, session: { user: { id: 'u1' } },
      tier: 'pro', firstRunComplete: true,
    });

    await useAppStore.getState().clearAuthStateForSignOut();
    expect(guard.isSignOutWiping()).toBe(true);

    useAppStore.getState().setUser({ id: 'u2' });
    expect(guard.isSignOutWiping()).toBe(false);
  });

  // An aborted sign-out (push not clean) must NOT raise the guard: the user
  // stays signed in and lifecycle syncs must keep working.
  test('an aborted sign-out leaves the wipe guard down', async () => {
    const guard = require('../sync/signOutGuard');
    guard.setSignOutWiping(false);
    sync.syncAll.mockResolvedValueOnce({ status: 'error' });
    useAppStore.setState({
      user: { id: 'u1' }, session: { user: { id: 'u1' } },
      tier: 'pro', firstRunComplete: true,
    });

    const result = await useAppStore.getState().clearAuthStateForSignOut();

    expect(result).toEqual({ ok: false, reason: 'unsynced' });
    expect(guard.isSignOutWiping()).toBe(false);
  });

  test('a clean status proceeds to wipe + clears state', async () => {
    sync.syncAll.mockResolvedValueOnce({ status: 'synced' });
    useAppStore.setState({
      user: { id: 'u1' }, session: { user: { id: 'u1' } },
      tier: 'pro', firstRunComplete: true,
    });

    await useAppStore.getState().clearAuthStateForSignOut();

    expect(sync.syncAll).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'u1', localUserId: 'u1', triggeredBy: 'sign_out' }),
    );
    expect(useAppStore.getState().tier).toBeNull();
    expect(useAppStore.getState().user).toBeNull();
  });
});

// ─── Scenario 4: Sign in with deleted account (no cloud profile) ─────────────

describe('Scenario: Sign-in with deleted account (cloud profile missing)', () => {
  test('no cloud profile still routes to onboarding, now with full access', async () => {
    await useAppStore.getState().clearAuthStateForSignOut();
    mockCloudProfile = null;
    await signInFlow('u1');
    // INVERTED 2026-09-03 (fully-free product): there is no entitlement to
    // grant or withhold, so a missing cloud row cannot leave a signed-in user
    // on a reduced tier. The routing property this scenario exists for is
    // unchanged: onboarding is still not complete.
    expect(useAppStore.getState().tier).toBe('pro');
    expect(useAppStore.getState().firstRunComplete).toBe(false);
  });
});

// ─── Scenario 5: App restart while signed in as Pro ──────────────────────────

describe('Scenario: App restart, cloud tier is authoritative', () => {
  test('INVERTED: a cloud tier of free can no longer demote a user', async () => {
    await AsyncStorage.setItem('@volyume_tier', 'pro');
    await useAppStore.getState().checkTier();
    expect(useAppStore.getState().tier).toBe('pro');

    // The cloud column still says 'free' for most rows (the DB default, and
    // the cascade cron that used to write it is being unscheduled by
    // supabase/migrate_157). Under the fully-free product that value must not
    // reach the user: _effectiveTier answers 'pro' whatever the server says.
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
    expect(await AsyncStorage.getItem('@volyume_tier')).toBe('pro');
  });

  test('refreshTierFromCloud keeps pro when the cloud says pro', async () => {
    const fakeClient = {
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: { tier: 'pro' }, error: null }),
          }),
        }),
      }),
    };
    await useAppStore.getState().refreshTierFromCloud(fakeClient, 'u1');
    expect(useAppStore.getState().tier).toBe('pro');
  });
});

// ─── Scenario 6: Brand new Pro signup, cloud profile not yet created ────────

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

describe('Scenario: A subscribed user signs in', () => {
  test('cloud.tier=pro + first_run_complete=true → Pro, no re-onboard', async () => {
    await useAppStore.getState().setTier('free');
    await AsyncStorage.setItem('@volyume_first_run_complete', 'true');
    useAppStore.setState({ firstRunComplete: true, firstRunChecked: true });

    // They subscribed, so the cloud profile says Pro.
    mockCloudProfile = { first_name: 'Allan', tier: 'pro', first_run_complete: true };
    await signInFlow('u1');

    expect(useAppStore.getState().tier).toBe('pro');
    expect(useAppStore.getState().firstRunComplete).toBe(true);
  });
});

// ─── Scenario 8: checkTier loads persisted tier on app launch ────────────────

describe('Scenario: App launch, checkTier loads persisted value', () => {
  test('persisted pro round-trips', async () => {
    await AsyncStorage.setItem('@volyume_tier', 'pro');
    await useAppStore.getState().checkTier();
    expect(useAppStore.getState().tier).toBe('pro');
    expect(useAppStore.getState().tierChecked).toBe(true);
  });

  // INVERTED 2026-09-03 (fully-free product, founder decision). checkTier used
  // to round-trip a persisted 'free' and to leave tier null when nothing was
  // cached. There is no reduced tier and no unentitled state any more, so every
  // cached value resolves to full access. tierChecked semantics are unchanged
  // and pinned below: RootNavigator's splash gate waits on it.
  test('INVERTED: a persisted free is lifted to full access', async () => {
    await AsyncStorage.setItem('@volyume_tier', 'free');
    await useAppStore.getState().checkTier();
    expect(useAppStore.getState().tier).toBe('pro');
  });

  test('INVERTED (audit M-3): no cached tier resolves to full access, not null', async () => {
    await AsyncStorage.setItem('@volyume_first_run_complete', 'true');
    await useAppStore.getState().checkTier();
    expect(useAppStore.getState().tier).toBe('pro');
    expect(useAppStore.getState().tierChecked).toBe(true);
  });

  test('INVERTED: no tier + no first-run also resolves to full access', async () => {
    await useAppStore.getState().checkTier();
    expect(useAppStore.getState().tier).toBe('pro');
    expect(useAppStore.getState().tierChecked).toBe(true);
  });
});

// ─── Scenario 9: Pro switches to Free in Settings ────────────────────────────

describe('Scenario: nothing can switch a user to Free any more', () => {
  test('INVERTED: a pro -> free write resolves back to full access', async () => {
    // Fully-free product (2026-09-03). The "switch to Free" affordance is gone
    // with the paywall; this pins that even a direct store write cannot strand
    // a user on a reduced tier while FULL_ACCESS_FOR_ALL is on.
    await useAppStore.getState().setTier('pro');
    await useAppStore.getState().setTier('free');
    expect(useAppStore.getState().tier).toBe('pro');
    expect(await AsyncStorage.getItem('@volyume_tier')).toBe('pro');
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

  // Release-gate fix: the exact cross-user race restoreSessionFromCloud was
  // hardened against (AUTH-2/I5, "restoreSessionFromCloud is uid-guarded"
  // scenario below) but this sibling function never got the same guard. A
  // fast sign-out-as-A -> sign-in-as-B fires this for both users; A's read
  // (up to 5s) landing after B is already signed in must not overwrite B's
  // live tier/trial state with A's.
  test('a resolving read for a user who is no longer signed in does not overwrite the CURRENT user', async () => {
    useAppStore.setState({
      user: { id: 'userB' }, tier: 'free',
      userProfile: { firstName: 'Bob' },
    });
    mockCloudProfile = {
      tier: 'pro', billing_period: 'annual',
      trial_state: 'trial_active', pro_trial_ends_at: 999,
    };
    // Called for userA, exactly as the fire-and-forget bootstrap/SIGNED_IN
    // call sites in RootNavigator would after a stale sign-out.
    await useAppStore.getState().refreshTierFromCloud(getSupabaseClient(), 'userA');

    expect(useAppStore.getState().tier).toBe('free');
    expect(useAppStore.getState().userProfile).toEqual({ firstName: 'Bob' });
  });

  test('still applies normally when the read resolves for the CURRENT user', async () => {
    useAppStore.setState({
      user: { id: 'userB' }, tier: 'free',
      userProfile: { firstName: 'Bob' },
    });
    mockCloudProfile = { tier: 'pro', billing_period: 'monthly' };
    await useAppStore.getState().refreshTierFromCloud(getSupabaseClient(), 'userB');

    expect(useAppStore.getState().tier).toBe('pro');
  });

  test('applies when no user is signed in yet (first sign-in, user not yet set)', async () => {
    useAppStore.setState({ user: null, tier: null });
    mockCloudProfile = { tier: 'pro' };
    await useAppStore.getState().refreshTierFromCloud(getSupabaseClient(), 'userA');

    expect(useAppStore.getState().tier).toBe('pro');
  });
});

// ─── Scenario 11: Cloud query error mid sign-in ──────────────────────────────

describe('Scenario: Cloud query error during restoreSessionFromCloud', () => {
  test('the optimistic local tier is left in place (the failed read cannot override it)', async () => {
    // The user was already resolved to Pro locally (cached / optimistic).
    await useAppStore.getState().setTier('pro');
    mockCloudProfile = null;
    mockSupabaseError = new Error('Network error');
    await useAppStore.getState().restoreSessionFromCloud('u1');
    // A failed cloud read returns early; it must not wipe the local decision.
    expect(useAppStore.getState().tier).toBe('pro');
  });
});

// ─── Scenario 12: Repeated sign-in/sign-out cycles ───────────────────────────

describe('Scenario: Three sign-in/sign-out cycles', () => {
  test('every cycle lands in the right end state', async () => {
    mockCloudProfile = { tier: 'pro', first_run_complete: true, first_name: 'Allan' };

    for (let i = 0; i < 3; i++) {
      await signInFlow('u1');
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

    // User B signs in with their cloud profile. A legacy units='lbs' value is
    // coerced to kg on load (gym weights are kg-only now).
    mockCloudProfile = {
      first_name: 'Bob',
      training_focus: 'powerlifting',
      training_age: 2,
      units: 'lbs',
      bar_weight: 45,
      tier: 'pro',
      first_run_complete: true,
    };
    await signInFlow('userB');

    expect(useAppStore.getState().tier).toBe('pro');
    expect(useAppStore.getState().userProfile?.firstName).toBe('Bob');
    expect(useAppStore.getState().userProfile?.units).toBe('kg'); // legacy 'lbs' coerced
  });
});

// ─── Scenario 14: setTier(null) is a no-op via API (shouldn't be possible) ───

describe('Scenario: setTier with falsy value', () => {
  test('INVERTED: setTier(null) cannot blank the tier, and still does not throw', async () => {
    // Fully-free product: _effectiveTier resolves any argument - including a
    // falsy one from a dormant billing path - to full access, so no code path
    // can drop a signed-in user out of entitlement.
    await useAppStore.getState().setTier('pro');
    await expect(useAppStore.getState().setTier(null)).resolves.toBeUndefined();
    expect(useAppStore.getState().tier).toBe('pro');
  });
});

// AUTH-2 (I5): a late-resolving restoreSessionFromCloud for user A must not
// write over a user B who signed in meanwhile.
describe('Scenario: restoreSessionFromCloud is uid-guarded', () => {
  test('bails immediately when a different user is already signed in', async () => {
    useAppStore.setState({ user: { id: 'userB' }, tier: null, userProfile: null, firstRunComplete: false });
    await useAppStore.getState().restoreSessionFromCloud('userA');
    // userA's restore made no writes; userB's state is intact.
    expect(useAppStore.getState().user).toEqual({ id: 'userB' });
  });
});

// AUTH-5 escape hatch: force=true signs out even when the push didn't complete,
// so the user is never permanently stuck (e.g. offline, or a poison queue).
describe('Scenario: forced sign-out (escape hatch)', () => {
  const sync = require('../sync');
  test('force=true wipes + clears state despite a push error', async () => {
    sync.syncAll.mockResolvedValueOnce({ status: 'error' });
    useAppStore.setState({
      user: { id: 'u1' }, session: { user: { id: 'u1' } },
      tier: 'pro', firstRunComplete: true,
    });

    const result = await useAppStore.getState().clearAuthStateForSignOut({ force: true });

    expect(result?.ok).not.toBe(false); // not aborted
    expect(useAppStore.getState().user).toBeNull();
    expect(useAppStore.getState().tier).toBeNull();
  });

  test('without force, the same error aborts (control)', async () => {
    sync.syncAll.mockResolvedValueOnce({ status: 'error' });
    useAppStore.setState({
      user: { id: 'u1' }, session: { user: { id: 'u1' } },
      tier: 'pro', firstRunComplete: true,
    });

    const result = await useAppStore.getState().clearAuthStateForSignOut();

    expect(result).toEqual({ ok: false, reason: 'unsynced' });
    expect(useAppStore.getState().user).toEqual({ id: 'u1' });
  });
});
