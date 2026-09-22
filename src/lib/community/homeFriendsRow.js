/**
 * The Today root's live Community row (founder order 2026-09-22, item 2
 * merged with item 4a; audit A-03/A-04/Q1/Q5,
 * docs/audit/community-audit-2026-09-22/A-adoption-visibility-look-copy.md):
 * pure line-builder and the row's own small cache. HomeScreen.js owns the
 * membership check, the ED/calm gate and the actual fetch; this module
 * never touches the network itself.
 *
 * The count is sourced from src/lib/widgets/friends.js's
 * `fetchFriendsTrainedToday` (the same reader the Android widget uses for
 * `community_friends_trained_today`) -- this file adds no second RPC
 * wrapper. It keeps a SEPARATE small cache from that module's own,
 * namespaced under this folder's `@volyume_community_*` convention, so
 * the row's own "when did we last check" bookkeeping lives with the rest
 * of Community's per-user storage.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

export const HOME_FRIENDS_ROW_CACHE_PREFIX = '@volyume_community_home_friends_row_';

/** Refresh at most this often (spec: "at most every 15 minutes and on focus"). */
export const HOME_FRIENDS_ROW_REFRESH_MS = 15 * 60 * 1000;

export function homeFriendsRowCacheKey(uid) {
  return `${HOME_FRIENDS_ROW_CACHE_PREFIX}${String(uid ?? '')}`;
}

/**
 * Read the row's own small cache. Never throws; a miss or a corrupt
 * value reads as null, which HomeScreen.js treats as "nothing to show
 * yet", never as an error.
 *
 * @param {string} uid
 * @returns {Promise<{count: number, dayKey: string, fetchedAt: number}|null>}
 */
export async function readCachedHomeFriendsRow(uid) {
  if (!uid) return null;
  try {
    const raw = await AsyncStorage.getItem(homeFriendsRowCacheKey(uid));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    if (!Number.isFinite(Number(parsed.count))) return null;
    if (!Number.isFinite(Number(parsed.fetchedAt))) return null;
    return {
      count: Number(parsed.count),
      dayKey: typeof parsed.dayKey === 'string' ? parsed.dayKey : '',
      fetchedAt: Number(parsed.fetchedAt),
    };
  } catch (_e) {
    return null; // a cache miss/corruption is never an error the user hears about
  }
}

/**
 * Write the row's own small cache. Best-effort: a failed write just
 * means the next open re-fetches, never an error the user hears about.
 *
 * @param {string} uid
 * @param {number} count
 * @param {string} dayKey
 */
export async function writeCachedHomeFriendsRow(uid, count, dayKey) {
  if (!uid) return;
  try {
    const value = { count: Math.max(0, Number(count) || 0), dayKey: String(dayKey ?? ''), fetchedAt: Date.now() };
    await AsyncStorage.setItem(homeFriendsRowCacheKey(uid), JSON.stringify(value));
  } catch (_e) { /* best effort: the row just re-fetches next time */ }
}

/**
 * Should the row refetch from the network right now? Pure. Never on
 * every render -- HomeScreen.js only calls the network stage when this
 * is true (no cached read yet, the cached read has aged past the
 * 15-minute window, or the cached read is stamped with a different
 * local day than `today`).
 *
 * @param {{fetchedAt: number, dayKey: string}|null} cached
 * @param {string} today the caller's current local day key
 * @param {number} [now] injectable for tests
 * @returns {boolean}
 */
export function shouldRefreshHomeFriendsRow(cached, today, now = Date.now()) {
  if (!cached) return true;
  if (!Number.isFinite(Number(cached.fetchedAt))) return true;
  if (String(cached.dayKey ?? '') !== String(today ?? '')) return true;
  return (Number(now) - Number(cached.fetchedAt)) >= HOME_FRIENDS_ROW_REFRESH_MS;
}

/**
 * The row's own line (spec: singular handled). Pure.
 *
 * @param {number} count how many people the reader follows trained today
 * @returns {string}
 */
export function friendsTrainedTodayLine(count) {
  const n = Math.max(0, Number(count) || 0);
  if (n === 0) return 'Nobody you follow has trained yet today';
  return `${n} ${n === 1 ? 'person' : 'people'} you follow trained today`;
}
