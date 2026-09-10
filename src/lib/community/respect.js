/**
 * Respect everyone who trained today (phase3 spec section 5; blueprint
 * section 5, CR-06; `22-MIGRATION-170A-CONTRACT.md` Part B
 * `community_respect_all`).
 *
 * One tap on a roster sends the caller's Respect to the latest auto
 * session item of every eligible member of the scope who trained today;
 * blocked and muted pairs are excluded SERVER-SIDE (safety verdict R4),
 * this module only carries the call and the device-recorded "already
 * given today" state that disables the row until the next UK-local day.
 *
 * Device recording is per SCOPE PER DAY, not global: giving Respect on
 * the gym cohort page does not disable the row on a group page the same
 * day, because each is its own roster and its own tap.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { callCommunity } from './transport';
import { todayLocalKey } from '../dayKey';

const GIVEN_PREFIX = '@volyume_community_respect_given_';

/** @param {string} scope one of `community_respect_all`'s scopes
 * @param {string|null} scopeKey */
export function respectGivenKey(scope, scopeKey) {
  return `${GIVEN_PREFIX}${scope}_${scopeKey ?? 'own'}`;
}

/**
 * The device's own record of the last bulk Respect for this scope, or
 * `null` when none is on record (or the store could not be read, so the
 * row simply behaves as never-given rather than stuck disabled).
 *
 * @returns {Promise<{day: string, given: number}|null>}
 */
export async function lastRespectGivenState(scope, scopeKey) {
  try {
    const raw = await AsyncStorage.getItem(respectGivenKey(scope, scopeKey));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && typeof parsed.day === 'string' ? parsed : null;
  } catch (_e) {
    return null;
  }
}

/** @param {number} given the count `community_respect_all` returned */
export async function recordRespectGiven(scope, scopeKey, day, given) {
  try {
    await AsyncStorage.setItem(respectGivenKey(scope, scopeKey), JSON.stringify({ day, given: Number(given) || 0 }));
  } catch (_e) { /* best effort: worst case the row re-enables a day early */ }
}

/**
 * @param {object} input
 * @param {'gym'|'area'|'style'|'discipline'|'age_band'|'group'|'following'} input.scope
 * @param {string|null} [input.scopeKey] required for gym/area (own
 *   fallback)/style/discipline/group; omitted for age_band/following
 * @param {string|null} [input.today] the caller's own UK-local day
 *   (`dayKey.js`); the RPC falls back to its own UK-local computation
 *   when omitted, but a live caller always has one to send
 * @returns {Promise<{given: number}>} a count only -- no per-recipient
 *   detail, by design (the RPC's own contract)
 */
export async function respectAll({ scope, scopeKey = null, today = null } = {}) {
  const data = await callCommunity('community_respect_all', {
    _scope: scope, _scope_key: scopeKey, _today: today || todayLocalKey(),
  });
  return { given: Number.isFinite(Number(data?.given)) ? Number(data.given) : 0 };
}
