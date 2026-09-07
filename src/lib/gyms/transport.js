/**
 * Gyms transport (gym database blueprint `docs/gym-database-2026-09-06/
 * 20-BLUEPRINT.md`, "## App"; GD-13).
 *
 * The gym directory is infrastructure UNDER Community (GD-01), so its
 * reads and writes go through Community's own transport
 * (`src/lib/community/transport.js`) rather than opening a second route
 * to Supabase: the same sign-out-wipe guard, the same Article 9 consent
 * gate, and the same "no answered session, no request" rule apply here
 * exactly as they do to every other Community read.
 *
 * `callCommunity`'s fixed `COMMUNITY_ERROR_CODES` do not know the gym
 * RPCs' own deliberate refusals (`rate_limited`, `invalid_postcode`,
 * `invalid`): a code Community's transport does not recognise falls back
 * to `unavailable` there, but it still keeps the raw message (the code
 * string itself, since these RPCs raise with the bare code as their
 * message, same convention as Community's own). `callGyms` recovers the
 * REAL code from that message before handing back a `GymsError`, so a
 * deliberate "you are submitting too fast" refusal is never mistaken for
 * an unexpected defect at the call site.
 */

import { callCommunity, CommunityError } from '../community/transport';
import { logError } from '../errorLog';

/** Every code a gyms_* RPC can raise, plus the gates this shares with
 * Community (sign-out wipe, consent, session) and the two local-only
 * codes (`offline`, `unavailable`). `not_allowed` (gyms_confirm_submission's
 * own-submission refusal) and `already_confirmed` (a repeat confirmation)
 * are migrate_162's own additions, matched here now that
 * CommunityDimensionScreen's "Is this gym real? Confirm it" row is the
 * first consuming surface for either code. */
export const GYM_ERROR_CODES = Object.freeze([
  'sign_out_wiping',
  'health_consent_unresolved',
  'offline',
  'not_signed_in',
  'rate_limited',
  'invalid_postcode',
  'invalid',
  'not_found',
  'not_allowed',
  'already_confirmed',
  'unavailable',
]);

const GYM_CODE_SET = new Set(GYM_ERROR_CODES);

/** Every Gyms failure is one of these. `.code` is the contract. */
export class GymsError extends Error {
  constructor(code, message) {
    super(message || code);
    this.name = 'GymsError';
    this.code = GYM_CODE_SET.has(code) ? code : 'unavailable';
  }
}

/** Recover a gym-specific refusal from the raw message a CommunityError
 * carries (see the header). */
function ownCodeFromMessage(message) {
  const text = String(message ?? '').trim();
  return GYM_CODE_SET.has(text) ? text : null;
}

/**
 * Call one `gyms_*` RPC through Community's transport and its gates.
 *
 * @param {string} name the RPC name, e.g. 'gyms_search'
 * @param {object} [params]
 * @returns {Promise<*>} the RPC's data
 * @throws {GymsError}
 */
export async function callGyms(name, params = {}) {
  const scope = `Gyms.${name}`;
  try {
    return await callCommunity(name, params);
  } catch (e) {
    if (e instanceof CommunityError) {
      const recovered = ownCodeFromMessage(e.message);
      const code = recovered ?? (GYM_CODE_SET.has(e.code) ? e.code : 'unavailable');
      throw new GymsError(code, e.message);
    }
    logError(scope, e, {});
    throw new GymsError('unavailable', e?.message);
  }
}
