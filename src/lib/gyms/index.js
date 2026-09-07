/**
 * The gym directory (gym database blueprint `docs/gym-database-2026-09-06/
 * 20-BLUEPRINT.md`, "## App"; GD-09..GD-14).
 *
 * Screens and components import from here, never from a module inside
 * this folder directly (same convention as `src/lib/community/index.js`).
 *
 * Community product audit 2026-09-07 (`30-IMPLEMENTATION.md` section
 * 1.2): the finder (`GymPicker`) now calls `near()` for every recognised
 * postcode, town or "Use my location" tap, at whichever mile band the
 * person has chosen, merged with `search()`'s own text matches. The
 * coordinate `near()` takes is always either a PLACE centroid the server
 * resolved from typed text (`search()`'s `centroid`, `placeCentroid()`),
 * or, for "Use my location" only, the device's own momentary position -
 * which `deviceLocation.js` still gates behind `isAvailable()` (false
 * until the founder's location-permission dependency decision) and which
 * is held in the caller's component state for that session only, never
 * read or written by this module (GD-13). No coordinate is ever stored
 * here, in AsyncStorage, SecureStore or SQLite by any function below.
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
    address_line: row.address_line ?? null,
    town: row.town ?? null,
    outward: row.outward ?? null,
    postcode: row.postcode ?? null,
    website: row.website ?? null,
    lat: toNumberOrNull(row.lat),
    lng: toNumberOrNull(row.lng),
    distance_m: toNumberOrNull(row.distance_m),
    status: row.status ?? null,
    verification_status: row.verification_status ?? null,
    // migrate_163 (30-IMPLEMENTATION.md 1.1 A): the sort key search/near
    // insert ahead of distance. `rank.js` applies a small deprioritisation
    // for it; nothing here removes an unconfirmed venue from the list.
    operator_unconfirmed: !!row.operator_unconfirmed,
  };
}

function venuesFrom(data) {
  const rows = Array.isArray(data?.venues) ? data.venues : (Array.isArray(data) ? data : []);
  return rows.map(normaliseVenue).filter(Boolean);
}

/** A search or near response's resolved place centroid
 * (`{kind, label, lat, lng}`), or null when nothing resolved. Shared by
 * `search()` and `placeCentroid()` so both normalise the same shape. */
function centroidFrom(data) {
  const c = data?.centroid;
  if (!c || typeof c !== 'object') return null;
  return {
    kind: c.kind ?? 'none',
    label: c.label ?? null,
    lat: toNumberOrNull(c.lat),
    lng: toNumberOrNull(c.lng),
  };
}

/** Metres in one mile, so every mile/metre conversion in the app agrees. */
export const METRES_PER_MILE = 1609.344;

/** Miles to metres, rounded to the nearest metre (a `_radius_m` argument
 * a server RPC accepts). */
export function milesToMetres(miles) {
  return Math.round(Number(miles) * METRES_PER_MILE);
}

/**
 * Search the directory (GD-09). A recognised postcode is searched by its
 * outward/district code server-side; a town name matches the town field.
 * The candidates come back client-ranked (`rankVenues`). When the query
 * resolves to a place (a postcode or a known town), the response also
 * carries that place's centroid (30-IMPLEMENTATION.md 1.1 A), which the
 * finder uses to run a separate `near()` at whatever mile band is
 * selected; text matches from THIS function are never filtered by that
 * band (the finder merges rather than replaces).
 *
 * @param {string} q
 * @param {{lat?: (number|null), lng?: (number|null), limit?: number,
 *   radiusM?: (number|null)}} [opts] `radiusM` is the server's own
 *   postcode-union radius (default 8047 m / 5 miles server-side when
 *   omitted); it does not affect the name/brand/town matches.
 * @returns {Promise<{venues: Array<object>, recognisedPostcode: (string|null),
 *   centroid: (object|null)}>}
 */
export async function search(q, {
  lat = null, lng = null, limit = 40, radiusM = null,
} = {}) {
  const text = String(q ?? '').trim();
  const data = await callGyms('gyms_search', {
    _q: text, _lat: lat, _lng: lng, _limit: limit, _radius_m: radiusM,
  });
  return {
    venues: rankVenues(venuesFrom(data), text),
    recognisedPostcode: data?.recognised_postcode ?? null,
    centroid: centroidFrom(data),
  };
}

/**
 * Near a known point (GD-10). Used by the finder for every recognised
 * postcode, town or "Use my location" tap, at the chosen mile band
 * (`milesToMetres`). The coordinate is supplied by the caller and is
 * never read, stored or cached by this module (GD-13); for a device
 * position specifically, `deviceLocation.js` gates whether the caller
 * may ever obtain one at all.
 *
 * @param {number} lat
 * @param {number} lng
 * @param {{radiusM?: number, limit?: number}} [opts]
 * @returns {Promise<{venues: Array<object>, truncated: boolean}>}
 */
export async function near(lat, lng, { radiusM = 8047, limit = 40 } = {}) {
  const data = await callGyms('gyms_near', {
    _lat: lat, _lng: lng, _radius_m: radiusM, _limit: limit,
  });
  const venues = venuesFrom(data);
  return {
    venues,
    truncated: !!data?.truncated || venues.length >= limit,
  };
}

/**
 * Resolve a typed postcode or town to its public centroid, without
 * searching for venues (30-IMPLEMENTATION.md 1.1 A,
 * `public.gyms_place_centroid`). Used by `PlacePicker` to preview a
 * place before it is saved, and by the "Use my gym's town" shortcut.
 *
 * @param {string} q
 * @returns {Promise<{kind: ('postcode'|'town'|'none'), label: (string|null),
 *   lat: (number|null), lng: (number|null)}>}
 */
export async function placeCentroid(q) {
  const text = String(q ?? '').trim();
  if (!text) return { kind: 'none', label: null, lat: null, lng: null };
  const data = await callGyms('gyms_place_centroid', { _q: text });
  return centroidFrom({ centroid: data }) ?? { kind: 'none', label: null, lat: null, lng: null };
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

/** "0.7 miles" (one decimal, always miles) - 30-IMPLEMENTATION.md 1.2:
 * "distance only when known, one decimal, miles"; null when there is
 * nothing to show. */
export function distanceLabel(distanceM) {
  const n = toNumberOrNull(distanceM);
  if (n === null) return null;
  const miles = n / METRES_PER_MILE;
  return `${miles.toFixed(1)} miles`;
}

/** Lower-case, alphanumeric-only fold, just for the "is the brand already
 * named in the display name?" check below - not the ranking fold in
 * `rank.js` (this one only ever answers a yes/no containment question). */
function foldForContainment(s) {
  return String(s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * The two lines every gym row renders: the display name, and
 * "town · outward · distance · brand" (whichever parts are known;
 * distance is left out entirely when it is null, never shown as a blank
 * or a dash). Brand is the LAST part and only ever appears when it is
 * not already named in the display name itself (founder brief, gym
 * finder: "brand only when not redundant with the name") - "PureGym
 * Motherwell" never grows a trailing "· PureGym", but a franchise or
 * independent-sounding name that does not carry its own chain's name
 * (e.g. a venue named after its address, branded "Anytime Fitness")
 * does.
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
  if (venue?.brand && !foldForContainment(primary).includes(foldForContainment(venue.brand))) {
    parts.push(venue.brand);
  }
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
