/**
 * website.js (community product audit 2026-09-07, founder brief
 * "COMMUNITY ONBOARDING — SLICK 'WHERE DO YOU TRAIN?' GYM FINDER";
 * gym database blueprint `docs/gym-database-2026-09-06/20-BLUEPRINT.md`).
 *
 * `officialWebsite(venue)` is the ONE rule for whether GymDetailSheet's
 * "Visit website" action ever appears. Two independent gates, both must
 * pass, or the action is left out ENTIRELY - never a placeholder, never
 * a link to a page that turns out to be a listing rather than the
 * venue's own site:
 *
 *  1. Operator-confirmed: `verification_status` is one of the states
 *     GD-11's confirmation flow actually reaches once a venue is
 *     genuinely settled ('verified', 'user_submitted_verified' - a
 *     second independent person confirmed it, or 'moderator_verified'),
 *     OR the venue carries a source named as the operator itself
 *     (`source_names` containing an entry naming "operator",
 *     case-insensitive). The default 'unverified' and the
 *     one-confirmation 'user_submitted_pending' both fail this gate: a
 *     website is only ever offered once the VENUE, not just its
 *     existence, is confirmed. The `source_names` clause is
 *     forward-looking for a source the cloud pipeline may add later (no
 *     `supabase/**` change lands with this work, so today only the
 *     `verification_status` clause is ever actually true in production
 *     data - the function still honours the second clause the moment a
 *     row carries it).
 *  2. Clean host: the URL parses as http(s) and its host (and, for one
 *     entry, its path) is not an aggregator or social domain from the
 *     founder's denylist ("at least": google., facebook., instagram.,
 *     yell., yelp, tripadvisor, hussle, classpass, bing., apple.com/maps,
 *     tiktok, x.com, twitter). A dot-suffixed fragment ("google.") is
 *     matched as a substring of the host so a subdomain (www.google.com,
 *     maps.google.com) is caught the same as the bare domain; the bare
 *     brand tokens (yelp, tripadvisor, hussle, classpass, tiktok,
 *     twitter) are matched the same way. "x.com" is matched against the
 *     host itself (exact or a subdomain of it), never as a raw substring
 *     of the whole host string, so a short unrelated domain that merely
 *     contains the letters "x.com" (apex.com, flex.com) is not
 *     wrongly caught. "apple.com/maps" covers Apple's maps
 *     listings however they are hosted: the real-world share link
 *     (host maps.apple.com, matched as a subdomain of apple.com) and a
 *     path "/maps" on apple.com or one of its other subdomains - either
 *     way, a plain apple.com page that is not a maps listing
 *     (apps.apple.com, say) stays allowed.
 */

const CONFIRMED_STATUSES = new Set([
  'verified', 'user_submitted_verified', 'moderator_verified',
]);

/** Host-substring fragments matched anywhere in the lower-cased hostname. */
const DENY_HOST_SUBSTRINGS = [
  'google.', 'facebook.', 'instagram.', 'yell.', 'yelp', 'tripadvisor',
  'hussle', 'classpass', 'bing.', 'tiktok', 'twitter',
];

function hasOperatorSource(venue) {
  const names = Array.isArray(venue?.source_names) ? venue.source_names : [];
  return names.some((n) => /operator/i.test(String(n ?? '')));
}

function isOperatorConfirmed(venue) {
  const status = String(venue?.verification_status ?? '');
  return CONFIRMED_STATUSES.has(status) || hasOperatorSource(venue);
}

function isSameOrSubdomain(host, domain) {
  return host === domain || host.endsWith(`.${domain}`);
}

function isDeniedHost(hostname, pathname) {
  const host = String(hostname ?? '').toLowerCase();
  if (DENY_HOST_SUBSTRINGS.some((fragment) => host.includes(fragment))) return true;
  if (isSameOrSubdomain(host, 'x.com')) return true;
  // The real-world Apple Maps share link is hosted on the maps.apple.com
  // subdomain, not a "/maps" path.
  if (isSameOrSubdomain(host, 'maps.apple.com')) return true;
  if (isSameOrSubdomain(host, 'apple.com') && String(pathname ?? '').toLowerCase().startsWith('/maps')) {
    return true;
  }
  return false;
}

/**
 * @param {object|null} venue as returned by `get(id)`: at least
 *   `website`, `verification_status`, `source_names`.
 * @returns {string|null} the venue's website, trimmed, when it is safe to
 *   offer as "Visit website"; null when the action must be omitted.
 */
export function officialWebsite(venue) {
  const raw = String(venue?.website ?? '').trim();
  if (!raw) return null;
  if (!isOperatorConfirmed(venue)) return null;

  let url;
  try {
    url = new URL(raw);
  } catch (_e) {
    return null;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
  if (isDeniedHost(url.hostname, url.pathname)) return null;

  return raw;
}
