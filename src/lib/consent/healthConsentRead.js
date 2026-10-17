/**
 * The Article 9 health-consent READ: local cache first, then the cloud
 * profile row (RLS-scoped to the signed-in user). One copy of the rule, used
 * by the sign-in resolution in RootNavigator and by its re-resolution of an
 * unresolved consent (B2, final audit 2026-10-17).
 *
 * FAIL CLOSED, and only closed. This module never grants consent nobody
 * gave: 'granted' comes only from a cache written after a real grant or from
 * the cloud row saying `health_data_consent === true`. Any failure (no
 * client, a cloud error, a throw) is 'unresolved', which the caller keeps as
 * null, so the gate stays closed and the sync layer keeps refusing to move
 * health data. A failed read is never 'not_granted' either: false would send
 * a person who already consented back into the un-skippable gate because the
 * network blipped (A2-014).
 *
 * The cache is written only on a cloud 'granted', exactly as the sign-in
 * path always did; it is never written false.
 */

export const HEALTH_CONSENT_CACHE_PREFIX = '@volyume_health_consent_';

export function healthConsentCacheKey(userId) {
  return `${HEALTH_CONSENT_CACHE_PREFIX}${userId}`;
}

/**
 * @param {object} args
 * @param {object|null} args.client - the Supabase client (null: unresolved).
 * @param {string} args.userId
 * @param {{ getItem: Function, setItem: Function }} args.storage - AsyncStorage.
 * @returns {Promise<{ status: 'granted'|'not_granted'|'unresolved', source: 'cache'|'cloud'|null, thrown: unknown|null }>}
 */
export async function readHealthConsentStatus({ client, userId, storage }) {
  if (!userId) return { status: 'unresolved', source: null, thrown: null };
  try {
    const cacheKey = healthConsentCacheKey(userId);
    const cached = await storage.getItem(cacheKey).catch(() => null);
    if (cached === 'true') return { status: 'granted', source: 'cache', thrown: null };
    if (!client) return { status: 'unresolved', source: null, thrown: null };
    const { data, error } = await client
      .from('users_profile')
      .select('health_data_consent')
      .eq('id', userId)
      .maybeSingle();
    if (error) return { status: 'unresolved', source: 'cloud', thrown: null };
    const granted = data?.health_data_consent === true;
    if (granted) {
      try { await storage.setItem(cacheKey, 'true'); } catch (_) { /* cache is a convenience */ }
    }
    return { status: granted ? 'granted' : 'not_granted', source: 'cloud', thrown: null };
  } catch (e) {
    return { status: 'unresolved', source: null, thrown: e ?? new Error('consent read failed') };
  }
}
