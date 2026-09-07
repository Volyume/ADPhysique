/**
 * Find people: six doors and the scored lists behind them (discovery
 * blueprint sections 4, 5, 7, 8, 9; SD-23, SD-24, SD-27, SD-28).
 *
 * Two rules run through the whole module.
 *
 * REASONS, NEVER PERCENTAGES (SD-24). The server scores candidates to
 * ORDER them and nothing else. Every row carries its `reasons` in fixed
 * wording ("Trains at PureGym Leeds", "Both usually train evenings"), and
 * no surface anywhere turns a score into a match percentage: a percentage
 * claims a precision coarse bands cannot carry, and it invites ranking
 * people against each other. The score is transport; the reasons are the
 * explanation.
 *
 * HONEST DOORS (SD-28). A door with no count says so, and a door that
 * cannot work yet says exactly what would make it work ("Add your gym to
 * see who trains there") rather than hiding. Nothing here is gated behind
 * a density threshold, because a door that vanishes when the network is
 * small is a door nobody can be the first through.
 */

import { callCommunity, CommunityError } from './transport';

export const DEFAULT_PAGE_SIZE = 20;

/**
 * The six doors, in the order the screen lists them (blueprint section 4).
 *
 * `requires` names the field on the caller's own profile that a door
 * needs; `requirement` is what the row says instead when it is missing,
 * and tapping it opens Edit profile. `available: false` never means
 * "hidden": the row is still there, still tappable, and honest about why
 * it is empty.
 */
export const FIND_MODES = Object.freeze({
  gym: Object.freeze({
    mode: 'gym',
    label: 'At my gym',
    subtitle: 'Lifters at your gym',
    requires: 'gym_label',
    requirement: 'Add your gym to see who trains there',
  }),
  area: Object.freeze({
    mode: 'area',
    label: 'Near me',
    subtitle: 'Lifters in your area',
    requires: 'area_label',
    requirement: 'Add your area to see who trains near you',
  }),
  like_me: Object.freeze({
    mode: 'like_me',
    label: 'Train like me',
    subtitle: 'Lifters like you',
    requires: null,
    requirement: null,
  }),
  programme: Object.freeze({
    mode: 'programme',
    label: 'On my programme',
    subtitle: 'Lifters on the same programme',
    requires: 'tp_programme_key',
    requirement: 'Set an active plan to see who else is on it',
  }),
  partners: Object.freeze({
    mode: 'partners',
    label: 'Open to training together',
    subtitle: 'Lifters open to a training partner',
    requires: null,
    requirement: null,
  }),
  might_know: Object.freeze({
    mode: 'might_know',
    label: 'People you might know',
    subtitle: 'From your connections and follows',
    requires: null,
    requirement: null,
  }),
});

export const FIND_MODE_ORDER = Object.freeze([
  'gym', 'area', 'like_me', 'programme', 'partners', 'might_know',
]);

const FIND_MODE_SET = new Set(FIND_MODE_ORDER);

/**
 * Where each door's requirement lives on the `me` payload. The gym and
 * area labels sit on the profile card; the programme key is a training
 * profile band, which is on `me` itself (blueprint section 11).
 */
function requirementValue(me, field) {
  if (!field) return true;
  if (field === 'tp_programme_key') return me?.tp_programme_key ?? me?.profile?.tp_programme_key ?? null;
  return me?.profile?.[field] ?? me?.[field] ?? null;
}

/**
 * The six door descriptors for this person.
 *
 * @param {object|null} me the `community_get_me` payload
 * @returns {Array<{mode: string, label: string, subtitle: string,
 *   available: boolean, requirement: (string|null), key: (string|null)}>}
 */
export function doorsFor(me) {
  return FIND_MODE_ORDER.map((mode) => {
    const door = FIND_MODES[mode];
    const value = requirementValue(me, door.requires);
    const available = door.requires ? !!value : true;
    return {
      mode,
      label: door.label,
      subtitle: door.subtitle,
      available,
      requirement: available ? null : door.requirement,
      key: door.requires && available ? value : null,
    };
  });
}

/**
 * The line under a door's label once its count is known.
 *
 * A count of null means "not read yet" and answers the plain subtitle
 * rather than a zero, because "· 0" and "not counted yet" are different
 * facts and only one of them is true at that moment.
 *
 * @param {object} door one descriptor from `doorsFor`
 * @param {number|null} [count]
 * @returns {string}
 */
export function doorLine(door, count = null, scope = null) {
  if (!door?.available) return door?.requirement ?? '';
  const n = Number.isFinite(Number(count)) && count !== null ? Number(count) : null;
  if (n === null) return door.subtitle;
  switch (door.mode) {
    case 'gym':
      return `Trains at ${door.key} · ${n} ${n === 1 ? 'other' : 'others'}`;
    case 'area':
      return `Lifters in ${door.key} · ${n}`;
    case 'programme':
      return `On your programme · ${n}`;
    case 'partners':
      // The server says where the count applies ("at your gym" when the
      // person set same gym only, else "in your area"); the client never
      // guesses (security review 72, finding 5).
      return `${n} ${scope || 'in your area'}`;
    default:
      return door.subtitle;
  }
}

/**
 * The zero state for a door. Never pretends (SD-28): it says what is true
 * and offers the one thing that changes it.
 *
 * @param {object} door
 * @returns {string}
 */
export function doorZeroState(door) {
  if (!door?.available) return door?.requirement ?? '';
  if (door.mode === 'gym' && door.key) {
    return `No one else lists ${door.key} yet. You are the first here; anyone who adds it will see you.`;
  }
  if (door.mode === 'area' && door.key) {
    return `No one else lists ${door.key} yet. You are the first here; anyone who adds it will see you.`;
  }
  if (door.mode === 'partners') {
    return 'No one else is open to training together yet. Anyone who switches it on will see you.';
  }
  return 'No one to show yet. Share your profile link and anyone who joins will find you here.';
}

/**
 * One page of a scored list.
 *
 * There is deliberately NO key parameter. `community_find_people` takes
 * the mode, a cursor and a limit only (blueprint section 11) and reads the
 * gym, area and programme keys from the CALLER's own profile, server-side.
 * A client-supplied key would let anyone list the members of any gym they
 * can name. The people-list screen keeps the label it was opened with for
 * its own title; it is never sent, and passing one here does nothing.
 *
 * `filters` (spec 1.1 C, migration 163) is a combinable set of HARD
 * filters over the same scored query: `scope` ('gym'|'place'|'any'),
 * `place_band_miles` ('0'|'5'|'10'|'25', only with scope 'place'),
 * `partner_only`, `days`, `time_bands`, `styles`, `goal`,
 * `experience_band`, `age_band`. It is sent as `_filters` ONLY when
 * given, so a caller that never passes one (every existing door) makes
 * the exact RPC call it always has.
 *
 * @param {string} mode one of FIND_MODE_ORDER
 * @param {{cursor?: string|null, limit?: number, filters?: (object|null)}} [opts]
 * @returns {Promise<{people: Array<{card: object, reasons: string[],
 *   score: number, fallback: boolean}>, cursor: (string|null),
 *   count: (number|null), count_truncated: boolean}>}
 * @throws {CommunityError} 'invalid_input' for an unknown mode.
 */
export async function findPeople(mode, {
  cursor = null, limit = DEFAULT_PAGE_SIZE, filters = null,
} = {}) {
  if (!FIND_MODE_SET.has(mode)) throw new CommunityError('invalid_input');
  const params = { _mode: mode, _cursor: cursor, _limit: limit };
  if (filters) params._filters = filters;
  const data = await callCommunity('community_find_people', params);
  const rows = Array.isArray(data?.people) ? data.people : [];
  return {
    people: rows.map((row) => ({
      card: row?.card ?? null,
      reasons: Array.isArray(row?.reasons) ? row.reasons : [],
      score: Number(row?.score ?? 0),
      // SD-28 fallback rows (first page, no filters, a door under 5):
      // recently active public profiles with no reasons at all, rendered
      // under their own divider, never mixed in with a scored match.
      fallback: !!row?.fallback,
    })),
    cursor: typeof data?.cursor === 'string' ? data.cursor : null,
    count: Number.isFinite(Number(data?.count)) ? Number(data.count) : null,
    // True only when the server's 1,000-row scan cap was hit: the count
    // above is then a floor, not the true total, which is why the list
    // reads "N+ people" rather than "N people" (spec 1.3).
    count_truncated: !!data?.count_truncated,
  };
}

/**
 * The summary at the top of a gym page (SD-27). Counts by style, by
 * shared time band and by the partner flag, plus "N you follow".
 *
 * Nothing live and nothing precise: a gym page is a noticeboard, not a
 * room, and it never says who is there now (SD-31).
 *
 * @param {string} key the gym dimension key
 * @returns {Promise<object>}
 */
export async function gymSummary(key) {
  if (!key) throw new CommunityError('invalid_input');
  const data = await callCommunity('community_gym_summary', { _key: key });
  return {
    label: data?.label ?? null,
    count: Number(data?.count ?? 0),
    following_count: Number(data?.following_count ?? 0),
    open_to_partner_count: Number(data?.open_to_partner_count ?? 0),
    by_style: Array.isArray(data?.by_style) ? data.by_style : [],
    by_time_band: Array.isArray(data?.by_time_band) ? data.by_time_band : [],
  };
}

/**
 * The gym typeahead on the profile editor (SD-27). Suggests labels
 * ALREADY used in the same area, so "PureGym Leeds" is chosen once and
 * then chosen again, rather than retyped into four near-misses that never
 * join up into one page.
 *
 * @param {string} areaKey
 * @param {string} prefix
 * @returns {Promise<Array<{label: string, count: number}>>}
 */
export async function gymSuggest(areaKey, prefix) {
  const text = String(prefix ?? '').trim();
  if (!areaKey || !text) return [];
  const data = await callCommunity('community_gym_suggest', {
    _area_key: areaKey, _prefix: text,
  });
  const rows = Array.isArray(data?.gyms) ? data.gyms : (Array.isArray(data) ? data : []);
  return rows
    .map((row) => (typeof row === 'string'
      ? { label: row, count: 0 }
      : { label: row?.label ?? null, count: Number(row?.count ?? 0) }))
    .filter((row) => !!row.label);
}

// ─── Combinable filters (spec 1.1 C, 1.3; migration 163) ───────────────

/** The three "Where" scopes the filters sheet offers. */
export const FILTER_SCOPES = Object.freeze({ gym: 'My gym', place: 'Near me', any: 'Anywhere' });

/** The place bands, keyed exactly as `_filters.place_band_miles` wants
 * them (a string), '0' meaning "the same place, not a radius at all". */
export const PLACE_BAND_MILES = Object.freeze(['0', '5', '10', '25']);

export const PLACE_BAND_LABELS = Object.freeze({
  0: 'Same place', 5: 'Within 5 miles', 10: 'Within 10 miles', 25: 'Within 25 miles',
});

/**
 * Reduce a UI filter state down to exactly what the server accepts,
 * dropping anything unset or invalid, and answering `null` (not `{}`)
 * when nothing is actually applied -- `findPeople` only sends `_filters`
 * at all when this is truthy, which is what keeps a door with no filters
 * open making the exact RPC call it always has.
 *
 * @param {object|null} raw
 * @returns {object|null}
 */
export function normaliseFilters(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const out = {};
  if (raw.scope && FILTER_SCOPES[raw.scope]) out.scope = raw.scope;
  if (out.scope === 'place' && PLACE_BAND_MILES.includes(String(raw.place_band_miles))) {
    out.place_band_miles = String(raw.place_band_miles);
  }
  if (raw.partner_only) out.partner_only = true;
  if (Array.isArray(raw.days) && raw.days.length) out.days = [...raw.days];
  if (Array.isArray(raw.time_bands) && raw.time_bands.length) out.time_bands = [...raw.time_bands];
  if (Array.isArray(raw.styles) && raw.styles.length) out.styles = [...raw.styles];
  if (raw.goal) out.goal = raw.goal;
  if (raw.experience_band) out.experience_band = raw.experience_band;
  if (raw.age_band) out.age_band = raw.age_band;
  return Object.keys(out).length ? out : null;
}

/**
 * The applied filters as removable chips (spec 1.3): one entry per
 * active choice, each carrying the exact key `removeFilterChip` clears to
 * remove just that one and nothing else.
 *
 * The label maps are passed in rather than imported (`COMMUNITY_STYLE_KEYS`,
 * `COMMUNITY_GOALS`, `TP_DAYS`, `TP_TIME_BANDS`, `TP_EXPERIENCE_BANDS`,
 * `TP_AGE_BANDS`), so this stays a pure function over plain data the
 * caller already has and never grows an import cycle into this module.
 *
 * @param {object|null} filters normalised filters, as sent to the server
 * @param {{styles?: object, goals?: object, days?: object,
 *   timeBands?: object, experience?: object, ageBand?: object}} [labels]
 * @returns {Array<{key: string, label: string}>}
 */
export function filterChips(filters, labels = {}) {
  if (!filters) return [];
  const chips = [];
  if (filters.scope === 'gym') {
    chips.push({ key: 'scope', label: FILTER_SCOPES.gym });
  } else if (filters.scope === 'place') {
    chips.push({ key: 'scope', label: PLACE_BAND_LABELS[filters.place_band_miles ?? '0'] ?? FILTER_SCOPES.place });
  } else if (filters.scope === 'any') {
    chips.push({ key: 'scope', label: FILTER_SCOPES.any });
  }
  if (filters.partner_only) chips.push({ key: 'partner_only', label: 'Open to training together' });
  for (const d of filters.days ?? []) {
    if (labels.days?.[d]) chips.push({ key: `days:${d}`, label: labels.days[d] });
  }
  for (const b of filters.time_bands ?? []) {
    if (labels.timeBands?.[b]) chips.push({ key: `time_bands:${b}`, label: labels.timeBands[b] });
  }
  for (const s of filters.styles ?? []) {
    if (labels.styles?.[s]) chips.push({ key: `styles:${s}`, label: labels.styles[s] });
  }
  if (filters.goal && labels.goals?.[filters.goal]) {
    chips.push({ key: 'goal', label: labels.goals[filters.goal] });
  }
  if (filters.experience_band && labels.experience?.[filters.experience_band]) {
    chips.push({ key: 'experience_band', label: labels.experience[filters.experience_band] });
  }
  if (filters.age_band && labels.ageBand?.[filters.age_band]) {
    chips.push({ key: 'age_band', label: labels.ageBand[filters.age_band] });
  }
  return chips;
}

/**
 * Remove exactly one applied filter by its chip's `key` (`filterChips`'
 * own key), leaving every other choice standing. An unknown key is a
 * no-op; clearing the last choice answers `null`, matching what
 * `normaliseFilters` would have answered for an empty state.
 *
 * @param {object|null} filters normalised filters
 * @param {string} key
 * @returns {object|null}
 */
export function removeFilterChip(filters, key) {
  if (!filters || !key) return filters ?? null;
  const next = { ...filters };
  if (key === 'scope') {
    delete next.scope;
    delete next.place_band_miles;
  } else if (key === 'partner_only') {
    delete next.partner_only;
  } else if (key.startsWith('days:')) {
    next.days = (next.days ?? []).filter((d) => `days:${d}` !== key);
    if (!next.days.length) delete next.days;
  } else if (key.startsWith('time_bands:')) {
    next.time_bands = (next.time_bands ?? []).filter((b) => `time_bands:${b}` !== key);
    if (!next.time_bands.length) delete next.time_bands;
  } else if (key.startsWith('styles:')) {
    next.styles = (next.styles ?? []).filter((s) => `styles:${s}` !== key);
    if (!next.styles.length) delete next.styles;
  } else if (key === 'goal') {
    delete next.goal;
  } else if (key === 'experience_band') {
    delete next.experience_band;
  } else if (key === 'age_band') {
    delete next.age_band;
  }
  return Object.keys(next).length ? next : null;
}

/**
 * "N people" / "N+ people" once the server's scan cap truncated the
 * count (spec 1.3). A count that has not been read yet (`null`) answers
 * '', so a caller falls back to its own loading state rather than a
 * false zero.
 *
 * @param {number|null} count
 * @param {boolean} [truncated]
 * @returns {string}
 */
export function peopleCountLine(count, truncated = false) {
  const n = Number(count);
  if (count === null || count === undefined || !Number.isFinite(n)) return '';
  return `${n}${truncated ? '+' : ''} people`;
}
