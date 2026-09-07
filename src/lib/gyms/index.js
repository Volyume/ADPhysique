/**
 * The gym directory (gym database blueprint `docs/gym-database-2026-09-06/
 * 20-BLUEPRINT.md`, "## App"; GD-09..GD-14).
 *
 * Screens and components import from here, never from a module inside
 * this folder directly (same convention as `src/lib/community/index.js`).
 *
 * DEVIATION (GD-10, recorded per the brief): "near me" is meant to offer
 * "Use my location" only when the app already carries a location
 * permission dependency. `expo-location` is NOT in package.json, and
 * nothing here adds it (CLAUDE.md: never add a dependency without
 * asking). So `near()` below is implemented against `gyms_near` for
 * completeness and for a future permission decision, but nothing in
 * `GymPicker` calls it: "near me" today is reached only through the
 * recognised-postcode chip / town search path (`search()`, which the
 * server resolves via the postcode's ONSPD sector centroid, GD-08),
 * never through the device's own coordinates. No coordinate is ever
 * requested, read, or stored by this module (GD-13).
 */

import { callCommunity } from '../community/transport';
import { callGyms, GymsError, GYM_ERROR_CODES } from './transport';
import {
  recognisePostcode, isPostcodeLike, isFullPostcode, normalisePostcode, outwardOf, extractPostcode,
} from './postcode';
import { rankVenues, BRAND_ALIASES } from './rank';

export { GymsError, GYM_ERROR_CODES };
export {
  recognisePostcode, isPostcodeLike, isFullPostcode, normalisePostcode, outwardOf, extractPostcode,
};
export { rankVenues, BRAND_ALIASES };

/** The six report reasons GD-12 defines, in the order the sheet offers
 * them. */
export const REPORT_KINDS = Object.freeze({
  closed: 'This gym has closed',
  wrong_name: 'The name is wrong',
  wrong_location: 'The location is wrong',
  duplicate_of: 'This is a duplicate of another gym',
  not_a_gym: 'This is not a gym',
  other: 'Something else',
});

function toNumberOrNull(v) {
  // `Number(null)` is 0, a finite number, so null (and '') must be
  // refused explicitly before the finiteness check or a genuinely
  // missing distance/coordinate would render as "0 mi" / (0, 0) instead
  // of being left out.
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** One venue row, in the shape every surface renders (the fixed cloud
 * contract's shape, tolerant of a missing field). */
function normaliseVenue(row) {
  if (!row) return null;
  return {
    id: row.id ?? null,
    display_name: row.display_name ?? row.name ?? '',
    name: row.name ?? row.display_name ?? '',
    brand: row.brand ?? null,
    venue_type: row.venue_type ?? null,
    town: row.town ?? null,
    outward: row.outward ?? null,
    postcode: row.postcode ?? null,
    lat: toNumberOrNull(row.lat),
    lng: toNumberOrNull(row.lng),
    distance_m: toNumberOrNull(row.distance_m),
    status: row.status ?? null,
    verification_status: row.verification_status ?? null,
  };
}

function venuesFrom(data) {
  const rows = Array.isArray(data?.venues) ? data.venues : (Array.isArray(data) ? data : []);
  return rows.map(normaliseVenue).filter(Boolean);
}

/**
 * Search the directory (GD-09). A recognised postcode is searched by its
 * outward/district code server-side; a town name matches the town field.
 * The candidates come back client-ranked (`rankVenues`).
 *
 * @param {string} q
 * @param {{lat?: (number|null), lng?: (number|null), limit?: number}} [opts]
 * @returns {Promise<{venues: Array<object>, recognisedPostcode: (string|null)}>}
 */
export async function search(q, { lat = null, lng = null, limit = 40 } = {}) {
  const text = String(q ?? '').trim();
  const data = await callGyms('gyms_search', {
    _q: text, _lat: lat, _lng: lng, _limit: limit,
  });
  return {
    venues: rankVenues(venuesFrom(data), text),
    recognisedPostcode: data?.recognised_postcode ?? null,
  };
}

/**
 * Near me (GD-10). See the header deviation note: nothing in the app
 * currently calls this with a device coordinate, since there is no
 * location permission dependency, but it stays here against the day a
 * founder decision adds one.
 *
 * @param {number} lat
 * @param {number} lng
 * @param {{radiusM?: number, limit?: number}} [opts]
 * @returns {Promise<Array<object>>}
 */
export async function near(lat, lng, { radiusM = 8047, limit = 40 } = {}) {
  const data = await callGyms('gyms_near', {
    _lat: lat, _lng: lng, _radius_m: radiusM, _limit: limit,
  });
  return venuesFrom(data);
}

/**
 * Every venue in one town/postcode-sector place key.
 *
 * @param {string} townKey
 * @param {{limit?: number}} [opts]
 * @returns {Promise<Array<object>>}
 */
export async function inPlace(townKey, { limit = 40 } = {}) {
  const data = await callGyms('gyms_in_place', { _town_key: townKey, _limit: limit });
  return venuesFrom(data);
}

/**
 * One venue, with its brand and its source names (never the raw source
 * payloads, per the fixed contract).
 *
 * @param {string} id
 * @returns {Promise<object|null>}
 */
export async function get(id) {
  if (!id) return null;
  const data = await callGyms('gyms_get', { _id: id });
  if (!data) return null;
  return {
    ...normaliseVenue(data),
    source_names: Array.isArray(data.source_names) ? data.source_names : [],
  };
}

/**
 * Up to 8 rows for an autocomplete-style suggestion list.
 *
 * @param {string} q
 * @param {{lat?: (number|null), lng?: (number|null)}} [opts]
 * @returns {Promise<Array<object>>}
 */
export async function suggest(q, { lat = null, lng = null } = {}) {
  const text = String(q ?? '').trim();
  if (!text) return [];
  const data = await callGyms('gyms_suggest', { _q: text, _lat: lat, _lng: lng });
  return venuesFrom(data).slice(0, 8);
}

/**
 * "Can't find your gym? Add it" (GD-11). Duplicates are checked
 * server-side at submission (GD-06) and offered back rather than
 * silently creating a second row for the same venue.
 *
 * @param {{name: string, addressLine: string, town: string, postcode: string,
 *   website?: (string|null), operator?: (string|null)}} fields
 * @returns {Promise<{duplicate: boolean, id: (string|null),
 *   displayName?: (string|null), status?: string}>}
 */
export async function submit({
  name, addressLine, town, postcode, website = null, operator = null,
}) {
  const normalisedPostcode = normalisePostcode(postcode);
  const data = await callGyms('gyms_submit', {
    _p: {
      name: String(name ?? '').trim(),
      address_line: String(addressLine ?? '').trim(),
      town: String(town ?? '').trim(),
      postcode: normalisedPostcode ?? String(postcode ?? '').trim().toUpperCase(),
      website: website ? String(website).trim() : null,
      operator: operator ? String(operator).trim() : null,
    },
  });
  if (data?.duplicate_of) {
    return { duplicate: true, id: data.duplicate_of, displayName: data.display_name ?? null };
  }
  return { duplicate: false, id: data?.id ?? null, status: data?.status ?? 'pending' };
}

/**
 * The second independent confirmation a pending submission needs before
 * it is visible to anyone else (GD-11).
 *
 * @param {string} id
 * @returns {Promise<*>}
 */
export async function confirmSubmission(id) {
  return callGyms('gyms_confirm_submission', { _id: id });
}

/**
 * Report a problem with a venue (GD-12): closed, wrong name, wrong
 * location, duplicate of, not a gym, other.
 *
 * @param {string} venueId
 * @param {string} kind one of REPORT_KINDS' keys
 * @param {string|null} [detail]
 * @returns {Promise<*>}
 */
export async function report(venueId, kind, detail = null) {
  return callGyms('gyms_report', {
    _venue_id: venueId,
    _kind: kind,
    _detail: detail ? String(detail).trim() : null,
  });
}

/**
 * Set the caller's own primary gym and up to three other gyms (GD-14).
 * `community_set_gyms` writes `community_profiles` directly, so it is a
 * Community RPC and goes through Community's own transport rather than
 * the gyms wrapper above, exactly the way `community_gym_summary` and
 * `community_find_people` already do for the rest of this campaign.
 *
 * @param {string|null} gymId
 * @param {Array<string>} [otherGymIds] capped at 3 server-side too
 * @returns {Promise<*>}
 */
export async function setGyms(gymId, otherGymIds = []) {
  return callCommunity('community_set_gyms', {
    _gym_id: gymId ?? null,
    _other_gym_ids: Array.isArray(otherGymIds) ? otherGymIds.slice(0, 3) : [],
  });
}

function round1(n) {
  return Math.round(n * 10) / 10;
}

/** "1.2 mi" under 10 miles (one decimal), "12 mi" at or above (whole);
 * null when there is nothing to show. */
export function distanceLabel(distanceM) {
  const n = toNumberOrNull(distanceM);
  if (n === null) return null;
  const miles = n / 1609.344;
  return miles < 10 ? `${round1(miles)} mi` : `${Math.round(miles)} mi`;
}

/**
 * The two lines every gym row renders: the display name, and
 * "town · outward · distance" (whichever parts are known; distance is
 * left out entirely when it is null, never shown as a blank or a dash).
 *
 * @param {object} venue
 * @returns {{primary: string, secondary: string}}
 */
export function venueLine(venue) {
  const primary = venue?.display_name || venue?.name || '';
  const parts = [];
  if (venue?.town) parts.push(venue.town);
  if (venue?.outward) parts.push(venue.outward);
  const dist = distanceLabel(venue?.distance_m);
  if (dist) parts.push(dist);
  return { primary, secondary: parts.join(' · ') };
}

/** A pending submission not yet visible to anyone but its submitter
 * (GD-11: "pending, immediately selectable by its submitter, visible to
 * others after a second independent confirmation or a moderator's
 * verification"). `user_submitted_pending` specifically (migrate_162):
 * `user_submitted_verified`, the status a second confirmation moves it
 * to, is no longer pending and must not carry this badge. */
export function isPendingVenue(venue) {
  return String(venue?.verification_status ?? '').startsWith('user_submitted_pending');
}
