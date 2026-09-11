/**
 * onboardingJoin.test.js - communities revamp 2026-09-10,
 * `docs/communities-revamp-2026-09-10/25-ONBOARDING-COMMUNITY-SPEC.md`
 * section 4.2, ruling h.
 *
 * What this suite pins: `performCommunityJoin` is the ONE path, and it
 * never throws. Every refusal class ruling h names is checked against
 * the actual code the server would raise, not a paraphrase of it:
 *   - offline / unavailable / rate_limited / health_consent_unresolved /
 *     not_signed_in / sign_out_wiping queue the SAME fields, unchanged;
 *   - handle_taken re-suggests once and retries once, and only clears
 *     the handle if that retry ALSO fails;
 *   - handle_invalid / invalid_input clear the handle so the next retry
 *     asks the server for a fresh one;
 *   - profile_suspended drops the queue outright;
 *   - a profile that already exists (checked via `hasProfile` after a
 *     fresh `loadMe`) is treated as already joined, not re-queued, even
 *     though the attempt that reached this branch failed.
 * A pending join older than 14 days is dropped unsent, and the storage
 * entry is actually cleared (not merely treated as absent), so a stale
 * join is asked about once and never again.
 *
 * `../profile` and `../gyms` are mocked (this suite is database-free,
 * per the lane brief): `hasProfile` alone keeps its real, pure body
 * (a one-line `!!me?.profile?.handle`) rather than a hand-rolled
 * stand-in that could drift from it.
 */

const mockStore = new Map();
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (k) => (mockStore.has(k) ? mockStore.get(k) : null)),
    setItem: jest.fn(async (k, v) => { mockStore.set(k, v); }),
    removeItem: jest.fn(async (k) => { mockStore.delete(k); }),
  },
}));

jest.mock('../profile', () => ({
  upsertProfile: jest.fn(),
  loadMe: jest.fn(),
  suggestHandle: jest.fn(),
  hasProfile: (me) => !!me?.profile?.handle,
}));
jest.mock('../../gyms', () => ({ setGyms: jest.fn() }));

const { upsertProfile, loadMe, suggestHandle } = require('../profile');
const { setGyms } = require('../../gyms');
const {
  performCommunityJoin, retryPendingJoin, applyOnboardingGym,
  rememberOnboardingChoice, readOnboardingChoice, clearOnboardingChoice,
  writePendingJoin, readPendingJoin, clearPendingJoin,
  PENDING_JOIN_MAX_AGE_MS, onboardingChoiceKey, pendingJoinKey,
} = require('../onboardingJoin');

function communityError(code) {
  return Object.assign(new Error(code), { code });
}

const NO_PROFILE_ME = { profile: null };
const HAS_PROFILE_ME = { profile: { handle: 'rowan_lifts' } };

beforeEach(() => {
  mockStore.clear();
  upsertProfile.mockReset().mockResolvedValue({ handle: 'rowan_lifts' });
  loadMe.mockReset().mockResolvedValue({ me: NO_PROFILE_ME, fromCache: false, error: null });
  suggestHandle.mockReset().mockResolvedValue({ handle: 'suggested_1', source: 'email' });
  setGyms.mockReset().mockResolvedValue({});
});

describe('performCommunityJoin: the success order', () => {
  test('a null handle asks the server for one first, then creates the profile, sets the gym, refreshes me, and clears both queues', async () => {
    await writePendingJoin('u1', { handle: 'stale', displayName: 'Stale', gymId: 'g0' });
    await rememberOnboardingChoice('u1', { gym: { id: 'g0' }, displayName: 'Stale' });

    const out = await performCommunityJoin('u1', { handle: null, displayName: 'Rowan', gymId: 'g1' });

    expect(out).toEqual({ ok: true, queued: false, error: null });
    expect(suggestHandle).toHaveBeenCalledTimes(1);
    expect(upsertProfile).toHaveBeenCalledWith({
      handle: 'suggested_1', display_name: 'Rowan', visibility: 'public',
    });
    expect(setGyms).toHaveBeenCalledWith('g1', []);
    expect(loadMe).toHaveBeenCalledWith({ force: true, userId: 'u1' });
    await expect(readPendingJoin('u1')).resolves.toBeNull();
    await expect(readOnboardingChoice('u1')).resolves.toBeNull();
  });

  test('a handle the caller already has (a typed one, or one carried on a pending join) is used as-is: no suggestion asked', async () => {
    const out = await performCommunityJoin('u1', { handle: 'rowan_lifts', displayName: 'Rowan', gymId: null });

    expect(out).toEqual({ ok: true, queued: false, error: null });
    expect(suggestHandle).not.toHaveBeenCalled();
    expect(upsertProfile).toHaveBeenCalledWith({
      handle: 'rowan_lifts', display_name: 'Rowan', visibility: 'public',
    });
  });

  test('no gym chosen never calls setGyms', async () => {
    await performCommunityJoin('u1', { handle: 'rowan_lifts', displayName: 'Rowan', gymId: null });
    expect(setGyms).not.toHaveBeenCalled();
  });

  test('the profile call never carries an avatar preset, discipline keys or a sharing toggle (CR-13: sharing stays OFF)', async () => {
    await performCommunityJoin('u1', { handle: 'rowan_lifts', displayName: 'Rowan', gymId: null });
    const sent = upsertProfile.mock.calls[0][0];
    expect(sent).not.toHaveProperty('avatar_preset');
    expect(sent).not.toHaveProperty('discipline_keys');
    expect(sent).not.toHaveProperty('share_sessions');
    expect(sent).not.toHaveProperty('accept_rules_version');
  });

  test('a gym that fails to set is best effort, as Join: the join still succeeds', async () => {
    setGyms.mockRejectedValueOnce(communityError('unavailable'));
    const out = await performCommunityJoin('u1', { handle: 'rowan_lifts', displayName: 'Rowan', gymId: 'g1' });
    expect(out).toEqual({ ok: true, queued: false, error: null });
  });
});

describe('performCommunityJoin: refusals queue unchanged (ruling h)', () => {
  test.each(['offline', 'unavailable', 'rate_limited', 'health_consent_unresolved', 'not_signed_in', 'sign_out_wiping'])(
    '%s stores the pending join with the SAME handle and is retried, never dropped',
    async (code) => {
      upsertProfile.mockRejectedValueOnce(communityError(code));

      const out = await performCommunityJoin('u1', { handle: 'rowan_lifts', displayName: 'Rowan', gymId: 'g1' });

      expect(out).toEqual({ ok: false, queued: true, error: code });
      await expect(readPendingJoin('u1')).resolves.toEqual(expect.objectContaining({
        handle: 'rowan_lifts', displayName: 'Rowan', gymId: 'g1',
      }));
    },
  );
});

describe('performCommunityJoin: a rule the client did not know clears the handle (ruling h)', () => {
  test.each(['handle_invalid', 'invalid_input'])(
    '%s stores the pending join with the handle CLEARED, so the retry suggests afresh',
    async (code) => {
      upsertProfile.mockRejectedValueOnce(communityError(code));

      const out = await performCommunityJoin('u1', { handle: 'rowan_lifts', displayName: 'Rowan', gymId: 'g1' });

      expect(out).toEqual({ ok: false, queued: true, error: code });
      await expect(readPendingJoin('u1')).resolves.toEqual(expect.objectContaining({
        handle: null, displayName: 'Rowan', gymId: 'g1',
      }));
    },
  );
});

describe('performCommunityJoin: handle_taken re-suggests once and retries once', () => {
  test('a collision on the FIRST attempt is invisible to the caller once the retry succeeds', async () => {
    upsertProfile.mockRejectedValueOnce(communityError('handle_taken'));
    upsertProfile.mockResolvedValueOnce({ handle: 'suggested_1' });

    const out = await performCommunityJoin('u1', { handle: 'taken_one', displayName: 'Rowan', gymId: null });

    expect(out).toEqual({ ok: true, queued: false, error: null });
    expect(suggestHandle).toHaveBeenCalledTimes(1); // only the retry needs one
    expect(upsertProfile).toHaveBeenCalledTimes(2);
    expect(upsertProfile.mock.calls[0][0]).toEqual(expect.objectContaining({ handle: 'taken_one' }));
    expect(upsertProfile.mock.calls[1][0]).toEqual(expect.objectContaining({ handle: 'suggested_1' }));
  });

  test('a second collision (the one retry ALSO taken) clears the handle and queues, rather than retrying again', async () => {
    upsertProfile.mockRejectedValueOnce(communityError('handle_taken'));
    upsertProfile.mockRejectedValueOnce(communityError('handle_taken'));

    const out = await performCommunityJoin('u1', { handle: 'taken_one', displayName: 'Rowan', gymId: null });

    expect(out).toEqual({ ok: false, queued: true, error: 'handle_taken' });
    expect(suggestHandle).toHaveBeenCalledTimes(1); // the one retry, never a second
    expect(upsertProfile).toHaveBeenCalledTimes(2);
    await expect(readPendingJoin('u1')).resolves.toEqual(expect.objectContaining({ handle: null }));
  });
});

describe('performCommunityJoin: terminal refusals never queue a retry', () => {
  test('profile_suspended drops any pending join outright and never forces a loadMe to check', async () => {
    await writePendingJoin('u1', { handle: 'stale', displayName: 'Stale', gymId: null });
    upsertProfile.mockRejectedValueOnce(communityError('profile_suspended'));

    const out = await performCommunityJoin('u1', { handle: 'rowan_lifts', displayName: 'Rowan', gymId: null });

    expect(out).toEqual({ ok: false, queued: false, error: 'profile_suspended' });
    // The one cache-first read before the attempt (lead review 2026-09-11:
    // never write over an existing profile) is the only loadMe; a
    // suspended refusal is terminal and never forces a second one.
    expect(loadMe).toHaveBeenCalledTimes(1);
    expect(loadMe).not.toHaveBeenCalledWith({ force: true, userId: 'u1' });
    await expect(readPendingJoin('u1')).resolves.toBeNull();
  });

  test('a profile that already exists (hasProfile after a fresh loadMe) is treated as joined, not re-queued', async () => {
    await writePendingJoin('u1', { handle: 'stale', displayName: 'Stale', gymId: null });
    await rememberOnboardingChoice('u1', { gym: null, displayName: 'Stale' });
    upsertProfile.mockRejectedValueOnce(communityError('unavailable'));
    loadMe.mockResolvedValueOnce({ me: HAS_PROFILE_ME, fromCache: false, error: null });

    const out = await performCommunityJoin('u1', { handle: 'rowan_lifts', displayName: 'Rowan', gymId: null });

    expect(out).toEqual({ ok: true, queued: false, error: null });
    await expect(readPendingJoin('u1')).resolves.toBeNull();
    await expect(readOnboardingChoice('u1')).resolves.toBeNull();
  });
});

describe('performCommunityJoin: lead review 2026-09-11 (existing profile, empty name, overlap, venue)', () => {
  test('a profile that already exists (cache-first loadMe) is never written over: no upsert, both queues cleared, ok', async () => {
    loadMe.mockResolvedValue({ me: HAS_PROFILE_ME, fromCache: true, error: null });
    await writePendingJoin('u1', { handle: 'x', displayName: 'X', gymId: 'g1' });
    await rememberOnboardingChoice('u1', { gym: { id: 'g1' }, displayName: 'X' });

    const out = await performCommunityJoin('u1', { handle: 'x', displayName: 'X', gymId: 'g1' });

    expect(out).toEqual({ ok: true, queued: false, error: null });
    expect(loadMe).toHaveBeenCalledWith({ userId: 'u1' });
    expect(upsertProfile).not.toHaveBeenCalled();
    expect(suggestHandle).not.toHaveBeenCalled();
    expect(setGyms).not.toHaveBeenCalled();
    expect(await readPendingJoin('u1')).toBeNull();
    expect(await readOnboardingChoice('u1')).toBeNull();
  });

  test('an empty name falls back to the handle the server suggested, so a retry can never refuse forever', async () => {
    await performCommunityJoin('u1', { handle: null, displayName: '  ', gymId: null });
    expect(upsertProfile).toHaveBeenCalledWith({ handle: 'suggested_1', display_name: 'suggested_1', visibility: 'public' });
  });

  test('two overlapping joins for one account run once and share the answer', async () => {
    let release;
    upsertProfile.mockImplementation(() => new Promise((resolve) => { release = resolve; }));
    const a = performCommunityJoin('u1', { handle: 'rowan_lifts', displayName: 'Rowan', gymId: null });
    const b = performCommunityJoin('u1', { handle: 'rowan_lifts', displayName: 'Rowan', gymId: null });
    await Promise.resolve();
    release({ handle: 'rowan_lifts' });
    const [outA, outB] = await Promise.all([a, b]);
    expect(outA).toEqual({ ok: true, queued: false, error: null });
    expect(outB).toBe(outA);
    expect(upsertProfile).toHaveBeenCalledTimes(1);
    // And a later join is a fresh run, not the finished promise.
    upsertProfile.mockResolvedValue({ handle: 'rowan_lifts' });
    await performCommunityJoin('u1', { handle: 'rowan_lifts', displayName: 'Rowan', gymId: null });
    expect(upsertProfile).toHaveBeenCalledTimes(2);
  });

  test('the pending record carries the minimal venue for the Join screen pre-fill, and only its named fields', async () => {
    upsertProfile.mockRejectedValue(communityError('offline'));
    const gym = { id: 'g1', display_name: 'Iron Works', town: 'Leith', outward: 'EH6', brand: null, distance_m: 900, secret: 'no' };
    const out = await performCommunityJoin('u1', { handle: 'rowan_lifts', displayName: 'Rowan', gymId: 'g1', gym });
    expect(out).toEqual({ ok: false, queued: true, error: 'offline' });
    const pending = await readPendingJoin('u1');
    expect(pending.gym).toEqual({ id: 'g1', display_name: 'Iron Works', town: 'Leith', outward: 'EH6', brand: null });
    // A retry carries it forward unchanged.
    upsertProfile.mockRejectedValue(communityError('unavailable'));
    await retryPendingJoin('u1');
    expect((await readPendingJoin('u1')).gym).toEqual({ id: 'g1', display_name: 'Iron Works', town: 'Leith', outward: 'EH6', brand: null });
  });
});

describe('the decision time survives every failed retry (fresh-eyes review B1)', () => {
  test('a re-queued join keeps its ORIGINAL decidedAt, so the 14-day expiry can actually fire', async () => {
    const decidedAt = Date.now() - 10 * 24 * 60 * 60 * 1000;
    await writePendingJoin('u1', { handle: 'rowan_lifts', displayName: 'Rowan', gymId: null, decidedAt });
    upsertProfile.mockRejectedValue(communityError('health_consent_unresolved'));
    await retryPendingJoin('u1');
    await retryPendingJoin('u1');
    expect((await readPendingJoin('u1')).decidedAt).toBe(decidedAt);
    // Five days later it is stale, and the next drain sends nothing.
    upsertProfile.mockClear();
    expect(await readPendingJoin('u1', { nowMs: decidedAt + PENDING_JOIN_MAX_AGE_MS + 1 })).toBeNull();
    expect(await retryPendingJoin('u1')).toEqual({ ok: false, queued: false });
    expect(upsertProfile).not.toHaveBeenCalled();
  });

  test('a first attempt straight from the wizard stamps now, exactly as before', async () => {
    const before = Date.now();
    upsertProfile.mockRejectedValue(communityError('offline'));
    await performCommunityJoin('u1', { handle: 'rowan_lifts', displayName: 'Rowan', gymId: null });
    expect((await readPendingJoin('u1')).decidedAt).toBeGreaterThanOrEqual(before);
  });
});

describe('applyOnboardingGym: an existing member keeps their other gyms (fresh-eyes review F2)', () => {
  test('sets the answered gym as primary and carries the other gyms across, minus a duplicate', async () => {
    loadMe.mockResolvedValue({ me: { profile: { handle: 'rowan_lifts', other_gym_ids: ['g2', 'g1', 'g3'] } }, fromCache: false, error: null });
    expect(await applyOnboardingGym('u1', 'g1')).toBe(true);
    expect(setGyms).toHaveBeenCalledWith('g1', ['g2', 'g3']);
    expect(loadMe).toHaveBeenCalledWith({ force: true, userId: 'u1' });
  });

  test('never writes for a caller with no profile, no gym, or no uid', async () => {
    expect(await applyOnboardingGym('u1', 'g1')).toBe(false); // NO_PROFILE_ME
    expect(await applyOnboardingGym('u1', null)).toBe(false);
    expect(await applyOnboardingGym(null, 'g1')).toBe(false);
    expect(setGyms).not.toHaveBeenCalled();
  });

  test('a failed set is best effort: false, never a throw', async () => {
    loadMe.mockResolvedValue({ me: HAS_PROFILE_ME, fromCache: false, error: null });
    setGyms.mockRejectedValue(communityError('unavailable'));
    expect(await applyOnboardingGym('u1', 'g1')).toBe(false);
  });
});

describe('performCommunityJoin: no uid sends nothing', () => {
  test('null uid refuses before any call, and touches no storage', async () => {
    const out = await performCommunityJoin(null, { handle: 'rowan_lifts', displayName: 'Rowan', gymId: 'g1' });

    expect(out).toEqual({ ok: false, queued: false, error: 'not_signed_in' });
    expect(upsertProfile).not.toHaveBeenCalled();
    expect(setGyms).not.toHaveBeenCalled();
    expect(mockStore.size).toBe(0);
  });
});

describe('retryPendingJoin', () => {
  test('nothing pending is a no-op: no call, no write', async () => {
    const out = await retryPendingJoin('u1');
    expect(out).toEqual({ ok: false, queued: false });
    expect(upsertProfile).not.toHaveBeenCalled();
  });

  test('null uid is a no-op too', async () => {
    const out = await retryPendingJoin(null);
    expect(out).toEqual({ ok: false, queued: false });
  });

  test('a pending join is retried with exactly its own stored fields', async () => {
    await writePendingJoin('u1', { handle: null, displayName: 'Rowan', gymId: 'g1' });

    const out = await retryPendingJoin('u1');

    expect(out).toEqual({ ok: true, queued: false, error: null });
    expect(suggestHandle).toHaveBeenCalledTimes(1);
    expect(setGyms).toHaveBeenCalledWith('g1', []);
  });

  test('a successful retry clears the queue so a second retry with nothing pending is a no-op', async () => {
    await writePendingJoin('u1', { handle: 'rowan_lifts', displayName: 'Rowan', gymId: null });
    await retryPendingJoin('u1');
    upsertProfile.mockClear();

    const second = await retryPendingJoin('u1');

    expect(second).toEqual({ ok: false, queued: false });
    expect(upsertProfile).not.toHaveBeenCalled();
  });
});

describe('a pending join older than 14 days is dropped unsent (ruling h)', () => {
  test('readPendingJoin returns null for a stale entry, and clears the storage entry itself', async () => {
    const decidedAt = 1_000_000_000_000; // an arbitrary fixed instant
    await writePendingJoin('u1', { handle: 'rowan_lifts', displayName: 'Rowan', gymId: null, decidedAt });

    const nowMs = decidedAt + PENDING_JOIN_MAX_AGE_MS + 1;
    await expect(readPendingJoin('u1', { nowMs })).resolves.toBeNull();
    // Actually cleared, not merely treated as absent: a raw read of the
    // key now finds nothing either.
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    await expect(AsyncStorage.getItem(pendingJoinKey('u1'))).resolves.toBeNull();
  });

  test('one millisecond inside the window is kept', async () => {
    const decidedAt = 1_000_000_000_000;
    await writePendingJoin('u1', { handle: 'rowan_lifts', displayName: 'Rowan', gymId: null, decidedAt });

    const nowMs = decidedAt + PENDING_JOIN_MAX_AGE_MS - 1;
    await expect(readPendingJoin('u1', { nowMs })).resolves.toEqual(expect.objectContaining({ handle: 'rowan_lifts' }));
  });

  test('retryPendingJoin never attempts a stale join', async () => {
    const decidedAt = 1_000_000_000_000;
    await writePendingJoin('u1', { handle: 'rowan_lifts', displayName: 'Rowan', gymId: null, decidedAt });
    jest.spyOn(Date, 'now').mockReturnValue(decidedAt + PENDING_JOIN_MAX_AGE_MS + 1);

    const out = await retryPendingJoin('u1');

    expect(out).toEqual({ ok: false, queued: false });
    expect(upsertProfile).not.toHaveBeenCalled();
    Date.now.mockRestore();
  });
});

describe('malformed storage never throws', () => {
  test('a non-JSON pending join reads as null', async () => {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    await AsyncStorage.setItem(pendingJoinKey('u1'), 'not json');
    await expect(readPendingJoin('u1')).resolves.toBeNull();
  });

  test('a pending join missing decidedAt reads as null (malformed)', async () => {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    await AsyncStorage.setItem(pendingJoinKey('u1'), JSON.stringify({ handle: 'x', displayName: 'y', gymId: null }));
    await expect(readPendingJoin('u1')).resolves.toBeNull();
  });

  test('a non-JSON onboarding choice reads as null', async () => {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    await AsyncStorage.setItem(onboardingChoiceKey('u1'), '{not valid');
    await expect(readOnboardingChoice('u1')).resolves.toBeNull();
  });
});

describe('storage is keyed per account', () => {
  test('a pending join written for one uid is invisible under another', async () => {
    await writePendingJoin('u1', { handle: 'rowan_lifts', displayName: 'Rowan', gymId: null });
    await expect(readPendingJoin('u2')).resolves.toBeNull();
    await expect(readPendingJoin('u1')).resolves.toEqual(expect.objectContaining({ handle: 'rowan_lifts' }));
  });

  test('an onboarding choice written for one uid is invisible under another', async () => {
    await rememberOnboardingChoice('u1', { gym: { id: 'g1' }, displayName: 'Rowan' });
    await expect(readOnboardingChoice('u2')).resolves.toBeNull();
    await clearOnboardingChoice('u1');
    await expect(readOnboardingChoice('u1')).resolves.toBeNull();
  });
});

describe('rememberOnboardingChoice / readOnboardingChoice round trip', () => {
  test('a gym of null (chose "I don\'t train at a gym") round-trips as null, not dropped entirely', async () => {
    await rememberOnboardingChoice('u1', { gym: null, displayName: 'Rowan' });
    await expect(readOnboardingChoice('u1')).resolves.toEqual({ gym: null, displayName: 'Rowan' });
  });

  test('no uid writes nothing', async () => {
    await rememberOnboardingChoice(null, { gym: { id: 'g1' }, displayName: 'Rowan' });
    expect(mockStore.size).toBe(0);
  });
});

describe('writePendingJoin / clearPendingJoin round trip', () => {
  test('clearPendingJoin drops a written entry', async () => {
    await writePendingJoin('u1', { handle: 'rowan_lifts', displayName: 'Rowan', gymId: 'g1' });
    await expect(readPendingJoin('u1')).resolves.toEqual(expect.objectContaining({ handle: 'rowan_lifts' }));

    await clearPendingJoin('u1');

    await expect(readPendingJoin('u1')).resolves.toBeNull();
  });

  test('no uid clears nothing and writes nothing', async () => {
    await clearPendingJoin(null);
    await writePendingJoin(null, { handle: 'rowan_lifts', displayName: 'Rowan', gymId: 'g1' });
    expect(mockStore.size).toBe(0);
  });
});
