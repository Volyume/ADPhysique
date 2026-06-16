/**
 * NEW-002 — invite link build/parse (§4.2), pure and testable.
 *
 * Pairing is code/link based, with NO in-app user search or discovery of any
 * kind. The link carries an unguessable server-generated code:
 *
 *   deep link:      volyume://partner/<CODE>
 *   universal link: https://volyume.app/partner/<CODE>
 *
 * The universal link lands on a web page (web/) that states the
 * derived-signals-only promise and links to the store, for a partner who does
 * not have the app yet — so the link itself is a word-of-mouth asset.
 *
 * Codes are uppercase hex from the server (create_partner_invite), so parsing
 * is case-insensitive and trims surrounding whitespace from manual entry.
 */

const SCHEME_HOST = 'volyume://partner/';
const WEB_PREFIX = 'https://volyume.app/partner/';

/** Validate a redeemed code shape (defence-in-depth; the RPC is authoritative). */
export function isValidInviteCode(code) {
  return typeof code === 'string' && /^[A-Z0-9]{8,}$/.test(code.trim().toUpperCase());
}

/** Build the out-of-band share text and links from a server-issued code. */
export function buildInviteLinks(code) {
  const c = String(code || '').trim().toUpperCase();
  return {
    code: c,
    deepLink: `${SCHEME_HOST}${c}`,
    webLink: `${WEB_PREFIX}${c}`,
  };
}

/**
 * Extract an invite code from a deep link, universal link, or a bare code the
 * user typed/pasted. Returns the upper-cased code, or null if none/invalid.
 */
export function parseInviteCode(input) {
  if (!input || typeof input !== 'string') return null;
  let raw = input.trim();

  if (raw.toLowerCase().startsWith(SCHEME_HOST)) {
    raw = raw.slice(SCHEME_HOST.length);
  } else if (raw.toLowerCase().startsWith(WEB_PREFIX.toLowerCase())) {
    raw = raw.slice(WEB_PREFIX.length);
  }
  // Strip any trailing path/query/fragment.
  raw = raw.split(/[/?#]/)[0];

  const code = raw.toUpperCase();
  return isValidInviteCode(code) ? code : null;
}

/** The out-of-band invite message (house voice). */
export function inviteShareMessage({ webLink } = {}) {
  return `Be my training partner on Volyume. It just shows whether I trained this week, and nothing else about it. No numbers, no feed.\n\n${webLink}`;
}
