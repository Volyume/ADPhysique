/**
 * The onboarding "Your gym" step's join path (communities revamp
 * 2026-09-10, `docs/communities-revamp-2026-09-10/
 * 25-ONBOARDING-COMMUNITY-SPEC.md` section 4.2; founder order
 * 2026-09-11, rulings CR-15 / D158).
 *
 * `performCommunityJoin` is the ONE path both the onboarding step's
 * completion (spec section 4.3) and every retry use. A join that
 * cannot run there and then (offline, a transient refusal, a rate
 * limit) is never lost: it is queued on device, per account, and
 * drained on the reconnect edge, on app start, and when Community is
 * opened (`retryPendingJoin`, wired from App.js and
 * CommunityHubScreen). `rememberOnboardingChoice`/`readOnboardingChoice`
 * hold the separate "Not now" choice (a gym and a name, no join ever
 * attempted) that the Join screen pre-fills from later.
 *
 * A Community lib file, so it obeys the privacy guard
 * (`src/__tests__/community.privacy.guard.test.js`): no `firstName`,
 * `first_name`, `email`, `dateOfBirth` or `date_of_birth` is read here.
 * The handle is suggested SERVER-SIDE from the account's sign-in email
 * (`community_handle_suggestion`, `profile.js#suggestHandle`); this
 * module only ever sees the resulting handle string, never the address
 * it came from. The display name and the chosen gym arrive as plain
 * strings and ids the caller already resolved; nothing about the
 * person's age or identity is read here beyond the account id used to
 * key the per-account storage below.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { upsertProfile, loadMe, hasProfile, suggestHandle } from './profile';
import { setGyms } from '../gyms';

export const ONBOARDING_CHOICE_PREFIX = '@volyume_community_onboarding_choice_';
export const PENDING_JOIN_PREFIX = '@volyume_community_pending_join_';

/** A pending join older than this is dropped unsent rather than retried
 * (ruling h): the person's wish may have moved on, and the Join screen
 * is one tap away. */
export const PENDING_JOIN_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;

export function onboardingChoiceKey(uid) {
  return `${ONBOARDING_CHOICE_PREFIX}${uid ?? 'unknown'}`;
}

export function pendingJoinKey(uid) {
  return `${PENDING_JOIN_PREFIX}${uid ?? 'unknown'}`;
}

/** The venue fields a pre-fill needs and nothing else; null unless it
 * carries a string id. */
function minimalVenue(gym) {
  if (!gym || typeof gym !== 'object' || typeof gym.id !== 'string') return null;
  return {
    id: gym.id,
    display_name: typeof gym.display_name === 'string' ? gym.display_name : '',
    town: typeof gym.town === 'string' ? gym.town : null,
    outward: typeof gym.outward === 'string' ? gym.outward : null,
    brand: typeof gym.brand === 'string' ? gym.brand : null,
  };
}

// One join per account at a time (lead review 2026-09-11): the reconnect
// edge, the daily sync and opening Community can all drain the queue in
// the same minute, and two creates racing each other is pointless work.
const inFlight = new Map();

/**
 * Remember the gym and name from a "Not now" answer on the onboarding
 * step, for the Join screen to pre-select later (section 4.2).
 *
 * @param {string} uid
 * @param {{gym: (object|null), displayName: (string|null)}} [choice]
 *   `gym` is the minimal venue `{id, display_name, town, outward}`, or
 *   null when the person chose "I don't train at a gym".
 */
export async function rememberOnboardingChoice(uid, { gym = null, displayName = null } = {}) {
  if (!uid) return;
  try {
    await AsyncStorage.setItem(onboardingChoiceKey(uid), JSON.stringify({
      gym: gym ?? null,
      displayName: displayName ?? null,
    }));
  } catch (_e) { /* best effort: worst case the Join screen starts blank */ }
}

/**
 * @param {string} uid
 * @returns {Promise<{gym: (object|null), displayName: (string|null)}|null>}
 *   null when nothing was remembered, or the stored value is malformed.
 */
export async function readOnboardingChoice(uid) {
  if (!uid) return null;
  try {
    const raw = await AsyncStorage.getItem(onboardingChoiceKey(uid));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return { gym: parsed.gym ?? null, displayName: parsed.displayName ?? null };
  } catch (_e) {
    return null;
  }
}

/** Drop the remembered "Not now" choice, once it has been used (a
 * successful join) or is no longer wanted (leaving Community). */
export async function clearOnboardingChoice(uid) {
  if (!uid) return;
  try {
    await AsyncStorage.removeItem(onboardingChoiceKey(uid));
  } catch (_e) { /* best effort */ }
}

/**
 * Queue a join that could not run, exactly as it was decided, for
 * `retryPendingJoin` to pick up later (section 4.2).
 *
 * @param {string} uid
 * @param {{handle: (string|null), displayName: (string|null),
 *   gymId: (string|null), decidedAt?: number}} [pending] `decidedAt`
 *   defaults to now; a test may inject an older one to exercise the
 *   14-day expiry.
 */
export async function writePendingJoin(uid, {
  handle = null, displayName = null, gymId = null, gym = null, decidedAt = Date.now(),
} = {}) {
  if (!uid) return;
  try {
    await AsyncStorage.setItem(pendingJoinKey(uid), JSON.stringify({
      handle: handle ?? null,
      displayName: displayName ?? null,
      gymId: gymId ?? null,
      // The minimal venue, for the Join screen's pre-fill only (lead
      // review 2026-09-11): an id alone would render a nameless gym row.
      gym: minimalVenue(gym),
      decidedAt,
    }));
  } catch (_e) { /* best effort: worst case the choice is lost, and the Join screen is one tap away */ }
}

/**
 * @param {string} uid
 * @param {{nowMs?: number}} [opts] `nowMs` injected for tests.
 * @returns {Promise<{handle: (string|null), displayName: (string|null),
 *   gymId: (string|null), decidedAt: number}|null>} null when nothing is
 *   stored, the stored value is malformed, or it is older than
 *   PENDING_JOIN_MAX_AGE_MS (dropped unsent, ruling h: the storage entry
 *   is cleared too, so a stale join is asked about only once).
 */
export async function readPendingJoin(uid, { nowMs = Date.now() } = {}) {
  if (!uid) return null;
  try {
    const raw = await AsyncStorage.getItem(pendingJoinKey(uid));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    const decidedAt = Number(parsed.decidedAt);
    if (!Number.isFinite(decidedAt)) return null; // malformed
    if (nowMs - decidedAt > PENDING_JOIN_MAX_AGE_MS) {
      await clearPendingJoin(uid); // dropped unsent: nothing left to retry
      return null;
    }
    return {
      handle: typeof parsed.handle === 'string' ? parsed.handle : null,
      displayName: typeof parsed.displayName === 'string' ? parsed.displayName : null,
      gymId: typeof parsed.gymId === 'string' ? parsed.gymId : null,
      gym: minimalVenue(parsed.gym),
      decidedAt,
    };
  } catch (_e) {
    return null;
  }
}

/** The Join screen supersedes any pending join once its own create
 * succeeds, and a successful `performCommunityJoin` clears it too. */
export async function clearPendingJoin(uid) {
  if (!uid) return;
  try {
    await AsyncStorage.removeItem(pendingJoinKey(uid));
  } catch (_e) { /* best effort */ }
}

// Refusals that mean "try again later, nothing about this attempt was
// wrong" (ruling h, spec section 4.2): stored unchanged.
const UNCHANGED_CODES = new Set([
  'offline', 'unavailable', 'rate_limited', 'health_consent_unresolved',
  'not_signed_in', 'sign_out_wiping',
]);

/**
 * One attempt: resolve a handle if none was given, create or update the
 * profile, then set the gym, best effort (as Join). Never called with a
 * handle a `handle_taken` refusal already rejected -- the one retry
 * below passes null so a fresh one is suggested.
 */
async function attemptJoin(handle, displayName, gymId) {
  let resolvedHandle = handle;
  if (!resolvedHandle) {
    const suggestion = await suggestHandle();
    resolvedHandle = suggestion?.handle ?? null;
  }
  // Avatar preset stays the client (server) default, as Join; the
  // sharing toggles stay OFF (CR-13): neither is sent. A missing name
  // falls back to the handle (lead review 2026-09-11): the server refuses
  // an empty name as invalid_input, and a retry with the same empty name
  // would refuse forever.
  const name = (typeof displayName === 'string' && displayName.trim()) || resolvedHandle;
  await upsertProfile({ handle: resolvedHandle, display_name: name, visibility: 'public' });
  if (gymId) {
    try {
      await setGyms(gymId, []);
    } catch (_e) { /* best effort, as Join: the profile already exists either way */ }
  }
}

/**
 * What to do with a join that failed outright (ruling h). Checked in
 * this order: a settled terminal state first (suspended, or -- a lost
 * response from an earlier attempt, or the Join screen winning a race
 * while this ran in the background -- already joined), then the two
 * retry shapes.
 */
async function classifyRefusal(uid, error, pending) {
  const code = error?.code ?? 'unavailable';

  if (code === 'profile_suspended') {
    await clearPendingJoin(uid);
    return { ok: false, queued: false, error: code };
  }

  const { me } = await loadMe({ force: true, userId: uid });
  if (hasProfile(me)) {
    await clearPendingJoin(uid);
    await clearOnboardingChoice(uid);
    return { ok: true, queued: false, error: null };
  }

  if (UNCHANGED_CODES.has(code)) {
    await writePendingJoin(uid, pending);
    return { ok: false, queued: true, error: code };
  }

  // handle_taken (its one re-suggest-and-retry, below, already spent),
  // handle_invalid, or invalid_input (a server-side rule the client did
  // not know): clear the handle so the next retry asks for a fresh one
  // rather than repeating a doomed value.
  await writePendingJoin(uid, { ...pending, handle: null });
  return { ok: false, queued: true, error: code };
}

/**
 * The one join path (spec section 4.2), used by the onboarding step's
 * completion and by every retry of a join that could not run at the
 * time. Never throws.
 *
 * @param {string} uid
 * @param {{handle: (string|null), displayName: (string|null),
 *   gymId: (string|null)}} [fields]
 * @returns {Promise<{ok: boolean, queued: boolean, error: (string|null)}>}
 */
export async function performCommunityJoin(uid, {
  handle = null, displayName = null, gymId = null, gym = null,
} = {}) {
  if (!uid) return { ok: false, queued: false, error: 'not_signed_in' };
  if (inFlight.has(uid)) return inFlight.get(uid);
  const run = performCommunityJoinOnce(uid, { handle, displayName, gymId, gym })
    .finally(() => { inFlight.delete(uid); });
  inFlight.set(uid, run);
  return run;
}

async function performCommunityJoinOnce(uid, { handle, displayName, gymId, gym }) {
  // Never write over a profile that already exists (lead review
  // 2026-09-11). The onboarding step skips an existing member, but a
  // retry from the queue, a race with the Join screen, or a re-run
  // onboarding must not rewrite their handle, name or visibility. Cache
  // first: an existing member normally has `me` cached; offline with no
  // cache reads as no profile and the attempt below queues itself.
  const { me: existing } = await loadMe({ userId: uid });
  if (hasProfile(existing)) {
    await clearPendingJoin(uid);
    await clearOnboardingChoice(uid);
    return { ok: true, queued: false, error: null };
  }

  let error = null;
  try {
    await attemptJoin(handle, displayName, gymId);
  } catch (e) {
    error = e;
    if (e?.code === 'handle_taken') {
      try {
        await attemptJoin(null, displayName, gymId); // the one re-suggest-and-retry
        error = null;
      } catch (e2) {
        error = e2;
      }
    }
  }

  if (!error) {
    await loadMe({ force: true, userId: uid }); // so the cached `me` is current; never throws
    await clearPendingJoin(uid);
    await clearOnboardingChoice(uid);
    return { ok: true, queued: false, error: null };
  }

  return classifyRefusal(uid, error, { handle, displayName, gymId, gym });
}

/**
 * Retry a queued join: the reconnect edge, app start, or opening
 * Community (ruling h). A no-op when nothing is pending.
 *
 * @param {string} uid
 * @returns {Promise<{ok: boolean, queued: boolean, error?: (string|null)}>}
 */
export async function retryPendingJoin(uid) {
  if (!uid) return { ok: false, queued: false };
  const pending = await readPendingJoin(uid);
  if (!pending) return { ok: false, queued: false };
  return performCommunityJoin(uid, {
    handle: pending.handle, displayName: pending.displayName, gymId: pending.gymId, gym: pending.gym,
  });
}
