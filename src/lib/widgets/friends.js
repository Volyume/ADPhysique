/**
 * CR-14 (`docs/communities-revamp-2026-09-10/24-PHASE4-SPEC.md` section 2)
 * -- the "a friend trained today" count feeder for the home-screen widget.
 *
 * Presence, never a person (spec section 1 rule 1): this module answers
 * ONE question, "how many people I follow trained today", as a plain
 * integer. It never reads or carries a handle, a display name, an avatar,
 * a gym or anything else that could identify who. Consent is the server's
 * -- `community_friends_trained_today` (migrate_171) counts with exactly
 * the Following board's eligibility, server-side, and returns the integer
 * alone, so nothing new is disclosed and no card ever reaches this module.
 *
 * Offline-first stays intact (spec section 1 rule 6): `gatherWidgetInputs`
 * (writer.js) reads ONLY the small local cache this module maintains
 * (`readCachedFriends`), never the network, on every snapshot write. The
 * network read (`fetchFriendsTrainedToday`) is a separate, best-effort
 * SECOND stage writer.js runs after the local-only snapshot is already
 * persisted, and it is guarded (spec rule 7): it never calls the Community
 * board RPC for someone who has not joined Community (no cached profile),
 * so this surface adds no new RPC and no migration.
 *
 * A failure of any kind -- offline, a `CommunityError` of any code, no
 * profile -- is swallowed and answers null. Nothing is logged at error
 * level for an expected refusal here: `src/lib/community/transport.js`
 * already classifies and logs whatever is genuinely unexpected before it
 * ever reaches this module's catch.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { callCommunity } from '../community/transport';
import { readCachedMe, hasProfile } from '../community/profile';
import { todayLocalKey } from '../dayKey';

export const FRIENDS_CACHE_KEY = '@volyume_widget_friends_v1';

/**
 * The cache key for one account (review 2026-09-11 finding 5: namespaced
 * by user id, like profile.js's meCacheKey, so a second account on the
 * same device can never read the first account's count).
 */
export function friendsCacheKey(uid) {
  return `${FRIENDS_CACHE_KEY}:${uid}`;
}

/**
 * Clamp the server's count to what the widget may show. Pure. Migration
 * 171 (applied 2026-09-11) moved the counting server-side: the RPC
 * returns one integer computed with exactly the Following board's
 * eligibility, the caller excluded; before that the client loaded a page
 * of profile cards to derive the same number (fresh-eyes review of phase
 * 4, finding 9: data minimisation).
 *
 * @param {*} value the RPC's answer
 * @returns {number} 0..999
 */
export function clampFriendsCount(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(999, Math.trunc(n)));
}

/**
 * Read the small local cache for this account. Shape-checked, never throws.
 *
 * @param {string} uid
 * @returns {Promise<{dayKey: string, count: number, fetchedAt: number}|null>}
 */
export async function readCachedFriends(uid) {
  try {
    if (!uid) return null;
    const raw = await AsyncStorage.getItem(friendsCacheKey(uid));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    if (typeof parsed.dayKey !== 'string') return null;
    if (!Number.isFinite(Number(parsed.count))) return null;
    if (!Number.isFinite(Number(parsed.fetchedAt))) return null;
    return { dayKey: parsed.dayKey, count: Number(parsed.count), fetchedAt: Number(parsed.fetchedAt) };
  } catch (_e) {
    return null; // a cache miss/corruption is never an error the user hears about
  }
}

/**
 * The network stage (spec section 1 rules 6-7): fetch, count and cache
 * today's friends-trained-today figure. Best-effort -- returns null on
 * ANY failure (offline, no profile, a `CommunityError` of any code, an
 * unexpected throw) and leaves the existing cache untouched in that case.
 *
 * @param {string} uid
 * @returns {Promise<{dayKey: string, count: number, fetchedAt: number}|null>}
 */
export async function fetchFriendsTrainedToday(uid) {
  try {
    if (!uid) return null;
    // Guard 7: never a Community RPC for someone who has not joined --
    // the cached `me` is a local, no-network read (profile.js).
    const me = await readCachedMe(uid);
    if (!hasProfile(me)) return null;

    // Review 2026-09-11 finding 3: ONE clock read. The server evaluates
    // "trained today" against the `_today` this call sends, and the cache
    // is stamped with that same key, so a request that straddles local
    // midnight can never label yesterday's count as today's. Migration
    // 171: a count-only RPC, never a page of cards, and no board rate rail
    // spent on it.
    const today = todayLocalKey();
    const data = await callCommunity('community_friends_trained_today', { _today: today });
    const count = clampFriendsCount(data);
    const cache = { dayKey: today, count, fetchedAt: Date.now() };
    await AsyncStorage.setItem(friendsCacheKey(uid), JSON.stringify(cache));
    return cache;
  } catch (_e) {
    // Offline, a CommunityError of any code, or an unexpected throw: this
    // stage is best-effort and must never surface a failure or touch the
    // cache. transport.js already logs whatever is genuinely unexpected.
    return null;
  }
}

/**
 * Forget this account's count (review 2026-09-11 finding 5): called when
 * the person leaves Community, so a home screen never keeps publishing a
 * count on behalf of someone who has withdrawn. Never throws.
 *
 * @param {string} uid
 */
export async function clearCachedFriends(uid) {
  try {
    if (uid) await AsyncStorage.removeItem(friendsCacheKey(uid));
  } catch (_e) { /* best-effort */ }
}
