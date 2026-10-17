// Frequents refresh (GAP row 28). The server recomputes the top-20
// foods over 30 days nightly (cloud migration 051). The client pulls a
// snapshot into the local food_frequents cache when the Frequents tab is
// opened and the cache is stale, then renders from the cache. This sits
// outside the runtime-critical food_sync_pull/push cycle on purpose:
// Frequents is disposable, so it needs none of the queue or conflict
// machinery and a failed refresh just leaves the last good cache in place.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getSupabaseClient } from '../supabase';
import { replaceFoodFrequents } from './db';

const REFRESH_KEY_PFX = '@volyume_frequents_refreshed_';
export const FREQUENTS_MAX_AGE_MS = 12 * 60 * 60 * 1000; // 12h

// The server job runs nightly; refreshing the client cache at most twice
// a day keeps it current without hammering the RPC on every tab open.
export function frequentsCacheStale(lastRefreshedAt, now = Date.now(), maxAgeMs = FREQUENTS_MAX_AGE_MS) {
  if (!lastRefreshedAt) return true;
  return now - lastRefreshedAt >= maxAgeMs;
}

export async function refreshFrequentsIfStale(userId) {
  if (!userId) return;
  let last = 0;
  try {
    last = Number(await AsyncStorage.getItem(REFRESH_KEY_PFX + userId)) || 0;
  } catch (_) { /* treat as stale */ }
  if (!frequentsCacheStale(last)) return;
  try {
    const sb = getSupabaseClient();
    if (!sb) return;
    const { data, error } = await sb.rpc('food_frequents_pull');
    if (error) return; // RPC missing (migration not applied yet) or offline
    await replaceFoodFrequents(userId, Array.isArray(data) ? data : []);
    try { await AsyncStorage.setItem(REFRESH_KEY_PFX + userId, String(Date.now())); } catch (_) {}
  } catch (_) { /* keep whatever is cached */ }
}

/**
 * The "Often" list: the device's own counts first, the server snapshot only to
 * fill places (food audit follow-up 2026-10-16). Pure and deterministic.
 *
 * The local diary is the truth on this phone and is current to the last log;
 * the server snapshot is nightly and only knows synced entries. A snapshot row
 * fills a ref the local list lacks (a fresh install or a new phone, whose local
 * diary is still empty, still gets a tab); a ref in both ranks by the larger of
 * its two counts; equal counts keep local-first order. A ref never appears
 * twice. Rows without a food_ref are dropped.
 *
 * @param {Array<{food_ref: string, log_count?: number}>} localRows  already ranked
 * @param {Array<{food_ref: string, log_count?: number}>} serverRows already ranked
 * @param {number} [limit]
 * @returns {Array<{food_ref: string, log_count: number}>}
 */
export function mergeFrequents(localRows, serverRows, limit = 20) {
  const cap = Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : 20;
  const out = [];
  const seen = new Set();
  const take = (list) => {
    for (const r of Array.isArray(list) ? list : []) {
      const ref = r?.food_ref;
      if (!ref || seen.has(ref)) continue;
      seen.add(ref);
      out.push({ food_ref: ref, log_count: Number(r.log_count) || 0 });
    }
  };
  take(localRows);
  take(serverRows);
  // A ref in both lists ranks by the larger count: the local count is current
  // to the last log, the snapshot's may include entries from another phone.
  // Without this, a food logged once here outranked one eaten twenty times on
  // the person's other phone. The sort is stable, so equal counts keep the
  // local-first order above.
  const serverCount = new Map((Array.isArray(serverRows) ? serverRows : [])
    .filter((r) => r?.food_ref).map((r) => [r.food_ref, Number(r.log_count) || 0]));
  for (const row of out) row.log_count = Math.max(row.log_count, serverCount.get(row.food_ref) ?? 0);
  out.sort((a, b) => b.log_count - a.log_count);
  return out.slice(0, cap);
}
