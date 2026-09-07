/**
 * rank.js (gym database blueprint `docs/gym-database-2026-09-06/
 * 20-BLUEPRINT.md`, "## App"; GD-09).
 *
 * The client half of search (GD-09): the server returns up to 40
 * candidates (folded token prefix match, brand aliases, postcode
 * district, a bounding box when coordinates are supplied); this module
 * orders THOSE candidates for a human, brand match first, then locality,
 * then distance, with a small edit-distance allowance for misspellings.
 *
 * Every venue keeps its `reasons`, never a score or a percentage (the
 * same rule `findPeople.js` follows): a reason names WHY a row is near
 * the top ("Matches the brand", "In Motherwell", "Near ML1"), which is
 * something a person can read, unlike an internal ranking number.
 *
 * `reasons` is an internal ranking explanation ONLY: `GymRow` must never
 * render it (lead addendum, 09-gym-journey-tests.md item 3, "the
 * 'Matches The Gym Group' reason is internal and must not be rendered");
 * a venue's brand shown to a person comes solely from its own `brand`
 * field.
 */

import { extractPostcode } from './postcode';

/**
 * The named chains and their aliases (blueprint GD-05: "PureGym"/
 * "the gym" -> The Gym Group, "JD"/"J D Gyms"). Client-side only, for
 * ranking; the server's own brand table (`gym_brands`) is canonical.
 */
export const BRAND_ALIASES = Object.freeze({
  puregym: { name: 'PureGym', aliases: ['puregym', 'pure gym'] },
  the_gym_group: { name: 'The Gym Group', aliases: ['the gym', 'the gym group', 'thegym'] },
  jd_gyms: { name: 'JD Gyms', aliases: ['jd', 'jd gyms', 'j d gyms'] },
  anytime_fitness: { name: 'Anytime Fitness', aliases: ['anytime fitness', 'anytime'] },
  david_lloyd: { name: 'David Lloyd', aliases: ['david lloyd'] },
  bannatyne: { name: 'Bannatyne', aliases: ['bannatyne', 'bannatyne health club', 'bannatyne fitness'] },
  nuffield_health: { name: 'Nuffield Health', aliases: ['nuffield health', 'nuffield'] },
  virgin_active: { name: 'Virgin Active', aliases: ['virgin active'] },
  everyone_active: { name: 'Everyone Active', aliases: ['everyone active'] },
  better_gll: { name: 'Better', aliases: ['better', 'better gym', 'gll'] },
  snap_fitness: { name: 'Snap Fitness', aliases: ['snap fitness'] },
  total_fitness: { name: 'Total Fitness', aliases: ['total fitness'] },
  village_gym: { name: 'Village Gym', aliases: ['village gym', 'village hotel'] },
  energie: { name: 'énergie', aliases: ['energie', 'energie fitness'] },
  xercise4less: { name: 'Xercise4Less', aliases: ['xercise4less', 'xercise 4 less'] },
  fitness_first: { name: 'Fitness First', aliases: ['fitness first'] },
  gymbox: { name: 'Gymbox', aliases: ['gymbox', 'gym box'] },
  third_space: { name: 'Third Space', aliases: ['third space'] },
  f45: { name: 'F45', aliases: ['f45', 'f45 training'] },
  crossfit: { name: 'CrossFit', aliases: ['crossfit', 'cross fit'] },
});

/** Fold: lower-case, strip accents and punctuation, collapse whitespace. */
function fold(s) {
  return String(s ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Fold with every space removed too, so "Pure Gym" and "PureGym" and
 * "pure  gym" all become the same comparable string. */
function compact(s) {
  return fold(s).replace(/\s+/g, '');
}

/** Plain Levenshtein edit distance, small strings only (brand names and
 * town names are short; there is no need for anything faster). */
function editDistance(a, b) {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i += 1) {
    const row = [i];
    for (let j = 1; j <= n; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      row[j] = Math.min(row[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    prev = row;
  }
  return prev[n];
}

/** Does `needle` match `haystack` closely enough to count as the same
 * word, allowing either direction of substring containment and a small
 * edit-distance tolerance for a misspelling ("puregm" for "puregym")? */
function looseMatch(needle, haystack) {
  if (!needle || !haystack) return false;
  if (haystack.includes(needle) || needle.includes(haystack)) return true;
  const tolerance = Math.max(1, Math.floor(Math.min(needle.length, haystack.length) * 0.25));
  return editDistance(needle, haystack) <= tolerance;
}

/** The alias set (folded, space-compact) for a venue's own brand name,
 * from the client's own alias table when the brand is a recognised
 * chain, else just the brand name itself (still matchable). */
function aliasesFor(brandName) {
  const brandFold = fold(brandName);
  const entry = Object.values(BRAND_ALIASES).find((b) => fold(b.name) === brandFold);
  const list = entry ? entry.aliases : [brandName];
  return list.map(compact).filter(Boolean);
}

const WEIGHT = {
  BRAND_EXACT: 1000,
  BRAND_CLOSE: 700,
  POSTCODE: 500,
  TOWN: 300,
  NAME_TOKEN: 60,
  NAME_TOKEN_CLOSE: 30,
};

/** Points for how close a venue is, closer scoring more; null distance
 * (no coordinates supplied) contributes nothing. Deliberately smaller
 * than brand/locality (GD-09: "brand match first, then locality, then
 * distance").
 *
 * `distanceM` must be checked for null/undefined BEFORE `Number(...)`:
 * `Number(null)` is `0`, a finite number, so a venue with no distance at
 * all used to score as if it were sitting at 0 m and outrank a real
 * nearby branch (lead addendum, 09-gym-journey-tests.md finding R1/R1b). */
function distanceScore(distanceM) {
  if (distanceM === null || distanceM === undefined || distanceM === '') return 0;
  const n = Number(distanceM);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, 200 - n / 100);
}

/** A small deprioritisation, never a filter, for a venue whose operator
 * has not confirmed it (30-IMPLEMENTATION.md section 1.2): it still
 * shows, still matches on name/brand/town exactly as a confirmed venue
 * does, it just settles below an otherwise-equal confirmed one. */
const UNCONFIRMED_PENALTY = 40;

/**
 * Score and explain one venue against a query.
 *
 * @returns {{score: number, reasons: string[]}}
 */
function scoreVenue(venue, { queryCompact, queryTokens, postcodeOutward }) {
  const reasons = [];
  let score = 0;

  if (venue.brand) {
    const aliasSet = aliasesFor(venue.brand);
    const exact = aliasSet.some((a) => queryCompact.includes(a) || a.includes(queryCompact));
    if (exact) {
      score += WEIGHT.BRAND_EXACT;
      reasons.push(`Matches ${venue.brand}`);
    } else {
      const close = aliasSet.some((a) => looseMatch(a, queryCompact));
      if (close) {
        score += WEIGHT.BRAND_CLOSE;
        reasons.push(`Close match to ${venue.brand}`);
      }
    }
  }

  if (venue.town) {
    const townCompact = compact(venue.town);
    if (townCompact && (queryCompact.includes(townCompact) || townCompact.includes(queryCompact))) {
      score += WEIGHT.TOWN;
      reasons.push(`In ${venue.town}`);
    }
  }

  if (postcodeOutward && venue.outward
    && fold(venue.outward).replace(/\s+/g, '') === fold(postcodeOutward).replace(/\s+/g, '')) {
    score += WEIGHT.POSTCODE;
    reasons.push(`Near ${venue.outward}`);
  }

  const nameTokens = fold(venue.display_name || venue.name).split(' ').filter(Boolean);
  for (const qt of queryTokens) {
    if (qt.length < 2) continue;
    if (nameTokens.some((nt) => nt.startsWith(qt) || qt.startsWith(nt))) {
      score += WEIGHT.NAME_TOKEN;
    } else if (nameTokens.some((nt) => looseMatch(nt, qt))) {
      score += WEIGHT.NAME_TOKEN_CLOSE;
    }
  }

  const dScore = distanceScore(venue.distance_m);
  if (dScore > 0) {
    score += dScore;
    reasons.push('Nearby');
  }

  if (venue.operator_unconfirmed) {
    score -= UNCONFIRMED_PENALTY;
  }

  return { score, reasons };
}

/**
 * Rank the server's candidate venues for a human reading the query.
 *
 * @param {Array<object>} candidates venue rows (id, display_name, name,
 *   brand, venue_type, town, outward, postcode, lat, lng, distance_m,
 *   status, verification_status)
 * @param {string} query what the person typed
 * @returns {Array<object>} the same venues, ordered, each carrying its own
 *   `reasons` (never a score or a percentage)
 */
export function rankVenues(candidates, query) {
  const rows = Array.isArray(candidates) ? candidates : [];
  const queryCompact = compact(query);
  const queryTokens = fold(query).split(' ').filter(Boolean);
  const postcodeHit = extractPostcode(query);
  const postcodeOutward = postcodeHit.kind !== 'none' ? postcodeHit.outward : null;

  const scored = rows.map((venue) => {
    const { score, reasons } = scoreVenue(venue, { queryCompact, queryTokens, postcodeOutward });
    return { venue, score, reasons };
  });

  // Stable sort by score, ties kept in the server's own order (which is
  // already relevance-then-distance server-side).
  scored.forEach((row, i) => { row._i = i; });
  scored.sort((a, b) => (b.score - a.score) || (a._i - b._i));

  return scored.map(({ venue, reasons }) => ({ ...venue, reasons }));
}
