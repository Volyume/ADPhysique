/**
 * Gym challenge RPC wrappers (gym challenge SPEC; server
 * `supabase/migrate_201`). Components never call Supabase: every call goes
 * through the Community transport, which asks the sign-out, Article 9 consent
 * and live-session gates first (same pattern as `community/challenges.js`).
 *
 * Failures arrive as a `ChallengeError` whose `.code` is one of
 * 'not_found', 'not_allowed', 'invalid_input', 'network' or 'unavailable'.
 * Return values are plain objects exactly as the RPC answers.
 */
import { callCommunity } from '../community/transport';
import { CHALLENGE_CONSENT_VERSION } from './copy';

export { CHALLENGE_CONSENT_VERSION };

export const CHALLENGE_ERROR_CODES = Object.freeze([
  'not_found', 'not_allowed', 'invalid_input', 'network', 'unavailable',
]);

export class ChallengeError extends Error {
  constructor(code, message) {
    super(message || code);
    this.name = 'ChallengeError';
    this.code = CHALLENGE_ERROR_CODES.includes(code) ? code : 'unavailable';
  }
}

/** Map a transport error code onto the challenge contract. */
export function mapChallengeErrorCode(code) {
  switch (code) {
    case 'not_found':
    case 'invalid_input':
      return code;
    case 'not_allowed':
    case 'forbidden':
    case 'not_signed_in':
    case 'health_consent_unresolved':
    case 'sign_out_wiping':
    case 'profile_restricted':
    case 'profile_suspended':
    case 'minor_restricted':
      return 'not_allowed';
    case 'offline':
      return 'network';
    default:
      return 'unavailable';
  }
}

async function call(name, params = {}) {
  try {
    return await callCommunity(name, params);
  } catch (e) {
    if (e instanceof ChallengeError) throw e;
    throw new ChallengeError(mapChallengeErrorCode(e?.code), e?.message);
  }
}

const CODE_RE = /^[a-z0-9-]{3,32}$/;
const MODES = new Set(['name', 'handle']);

function requireCode(code) {
  const c = typeof code === 'string' ? code.trim().toLowerCase() : '';
  if (!CODE_RE.test(c)) throw new ChallengeError('invalid_input');
  return c;
}

function requireId(id) {
  if (typeof id !== 'string' || !id) throw new ChallengeError('invalid_input');
  return id;
}

function requireTarget(n) {
  if (!Number.isInteger(n) || n < 2 || n > 6) throw new ChallengeError('invalid_input');
  return n;
}

/** The public view of a challenge by code, or null. */
export async function getPublicChallenge(code) {
  const data = await call('gym_challenge_public', { _code: requireCode(code) });
  return data ?? null;
}

/** The signed-in view by code: public fields plus id, joined, withdrawn; or null. */
export async function lookupChallenge(code) {
  const data = await call('gym_challenge_lookup', { _code: requireCode(code) });
  return data ?? null;
}

/**
 * Join a challenge. `displayName` is required when `displayMode` is 'name'.
 * @returns {Promise<{challenge_id: string, joined: boolean}>}
 */
export async function joinChallenge({
  code, displayMode, displayName = '', plannedPerWeek, consentVersion, adult,
}) {
  if (!MODES.has(displayMode) || adult !== true || !consentVersion) {
    throw new ChallengeError('invalid_input');
  }
  const name = String(displayName ?? '').trim();
  if (displayMode === 'name' && (name.length < 1 || name.length > 30)) {
    throw new ChallengeError('invalid_input');
  }
  return call('gym_challenge_join', {
    _code: requireCode(code),
    _display_mode: displayMode,
    _display_name: displayMode === 'name' ? name : '',
    _planned_per_week: requireTarget(plannedPerWeek),
    _consent_version: String(consentVersion),
    _adult: true,
  });
}

/** @returns {Promise<{withdrawn: boolean}>} */
export async function withdrawFromChallenge(challengeId) {
  return call('gym_challenge_withdraw', { _challenge_id: requireId(challengeId) });
}

/** @returns {Promise<{planned_per_week: number}>} */
export async function setChallengeTarget(challengeId, plannedPerWeek) {
  return call('gym_challenge_set_target', {
    _challenge_id: requireId(challengeId),
    _planned_per_week: requireTarget(plannedPerWeek),
  });
}

/** The caller's challenges (empty array when none). */
export async function myChallenges() {
  const data = await call('gym_challenge_mine', {});
  return Array.isArray(data) ? data : [];
}

/** The caller's score breakdown for one challenge. */
export async function challengeScore(challengeId) {
  return call('gym_challenge_score', { _challenge_id: requireId(challengeId) });
}

/** The board, or null (withheld or not an entrant). */
export async function challengeBoard(challengeId) {
  const data = await call('gym_challenge_board', { _challenge_id: requireId(challengeId) });
  return data ?? null;
}

/** The open challenge at the caller's Community gym, or null. */
export async function challengeForMyGym() {
  const data = await call('gym_challenge_for_my_gym', {});
  return data ?? null;
}

