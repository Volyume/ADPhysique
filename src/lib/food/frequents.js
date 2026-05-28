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
