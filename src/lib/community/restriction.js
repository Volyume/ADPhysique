/**
 * The one calm line for a restricted or suspended Community profile
 * (D221 spec 2.6 L7). The server raises `profile_restricted` or
 * `profile_suspended` on every write for such a profile; trying again
 * cannot fix it, so no surface says "try again" for these two codes.
 * Pure: no imports, so any component or screen can take it without
 * pulling in the transport.
 */
export const COMMUNITY_RESTRICTED_LINE =
  'Your Community access is limited at the moment. See the notice on Community.';

/** Spread into a screen's code-to-copy table. */
export const RESTRICTION_REFUSALS = Object.freeze({
  profile_restricted: COMMUNITY_RESTRICTED_LINE,
  profile_suspended: COMMUNITY_RESTRICTED_LINE,
});

/** @param {string|null|undefined} code
 * @returns {string|null} the line for the two restriction codes, else null */
export function restrictionLine(code) {
  return code === 'profile_restricted' || code === 'profile_suspended'
    ? COMMUNITY_RESTRICTED_LINE
    : null;
}

/**
 * The calm toast for a Respect that did not land (D221 spec 2.4 and 2.6
 * L3). Offline, an unknown fault and a rate limit each get their own
 * line; a restricted or suspended profile gets the restricted line.
 * Never "try again" for the restricted case.
 *
 * @param {string|null|undefined} code a CommunityError code
 * @returns {string}
 */
export function respectFailureLine(code) {
  const restricted = restrictionLine(code);
  if (restricted) return restricted;
  if (code === 'rate_limited') return 'You have given a lot of Respect today. It will be back tomorrow.';
  return 'Could not send that. Try again in a moment.';
}
