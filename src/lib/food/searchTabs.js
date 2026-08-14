// Search subnav tabs (GAP row 28). Updated 2026-05-29 (founder): the old
// far-right "Database" tab is gone. The search box itself now searches the
// database from any tab, matching how MyFitnessPal, MacroFactor, Cronometer
// and Lose It work: a persistent search bar over browse lists, not a tab you
// hunt for. The tabs are the empty-query browse lists; Suggested sits second
// so the curated meals are visible without scrolling.
// Suggested is handled by the screen, not selectTabRows, since it lists meals,
// not food rows. (My Recipes stays a CTA, not a tab, per the 2026-05-28 call.)

// "Add again" (COMP-002): the first tab is the slot-aware recents list,
// filtered to the meal slot being logged with last-used portions pre-filled.
// The key stays 'recents' so state, telemetry and empty-copy keys are stable.
// L05-FS1 (2026-07-09 design audit): the last tab holds scan/quick-add/
// recipes/saved-meals as well as "add a custom food", so labelling it
// "Custom" read as "create a custom food" and buried the rest. "More"
// matches how those other actions are actually being found. The `key`
// stays 'custom' (state, telemetry and empty-copy keys are unchanged).
export const SEARCH_TABS = [
  { key: 'recents', label: 'Recent' },
  { key: 'suggested', label: 'Suggested' },
  { key: 'favourites', label: 'Favourites' },
  { key: 'frequents', label: 'Frequents' },
  { key: 'custom', label: 'More' },
];

// Which food rows the list shows for the current query.
//   A 2+ char query is a database search from any tab: return the waterfall
//   results (which already include the user's custom foods, ranked first).
//   With no query, show the active tab's browse list.
export function selectTabRows({ activeTab, query = '', lists = {}, results = [] }) {
  const q = (query || '').trim().toLowerCase();
  if (q.length >= 2) return results;
  return lists[activeTab] ?? [];
}

// Personal-history weighting (MFP/Cronometer parity — both flow audits found
// the reason a typed search "feels easy" is that the user's OWN foods are the
// first rows, so they rarely type a full name). The waterfall already ranks the
// user's custom foods first; this lifts the foods they've actually
// FAVOURITED / logged here recently / logged often above the generic database
// matches for the same query. Pure + STABLE: rows keep the waterfall's relevance
// order within each weight bucket, and never-logged results keep their order
// beneath the known ones — so this only ever promotes a food the user has a
// real prior relationship with, never reshuffles relevance arbitrarily.
export function rankByPersonalHistory(results, { favouriteRefs, recentRefs, frequentRefs } = {}) {
  if (!Array.isArray(results) || results.length < 2) return results || [];
  const asSet = (s) => (s instanceof Set ? s : new Set(Array.isArray(s) ? s : []));
  const fav = asSet(favouriteRefs);
  const rec = asSet(recentRefs);
  const freq = asSet(frequentRefs);
  const weight = (ref) => {
    if (ref == null) return 0;
    if (fav.has(ref)) return 3;  // explicitly favourited = strongest intent
    if (rec.has(ref)) return 2;  // logged in this slot recently
    if (freq.has(ref)) return 2; // logged often
    if (typeof ref === 'string' && ref.startsWith('custom:')) return 1; // user's own food
    return 0;                    // generic database match
  };
  // Decorate-sort-undecorate so the sort is stable on the original index.
  return results
    .map((food, i) => ({ food, i, w: weight(food?.food_ref) }))
    .sort((a, b) => (b.w - a.w) || (a.i - b.i))
    .map((x) => x.food);
}

// ─── Personal matches (Campaign 17B job 1) ──────────────────────────────────
//
// FOUNDER QUESTION: "When I search for something I eat regularly, does MY
// exact food appear before a generic alternative?"
//
// `rankByPersonalHistory` above answers that only when the user's food is
// ALREADY in the returned rows. It re-orders; it cannot add. So a mature user
// whose exact branded yoghurt sits below twenty-five generic text matches
// never sees it at all, however often they have logged it - the ranker has
// nothing to promote.
//
// This closes that: the user's own foods are matched against the query
// directly and merged in, then the existing weighting decides the order. The
// result is that personal exact history cannot lose to generic text relevance
// by being absent.
//
// IDENTITY, NOT NAME. Everything here matches and dedupes on `food_ref`, which
// carries the source (`curated:`, `off:`, `custom:`, ...). Two foods with the
// same display name from different sources stay two foods: a user's history
// with one specific branded item must never promote every food that looks like
// it. Matching by name is only ever used to decide whether a food is RELEVANT
// to the query, never to decide whether two foods are the same.

/**
 * Query normalisation, deliberately small.
 *
 * Lowercase, punctuation to spaces, whitespace collapsed. That covers the
 * founder's "spelling/punctuation variation" case (Kellogg's vs Kelloggs) with
 * no fuzzy-matching machinery. It is NOT a general spell-checker and does not
 * pretend to be.
 */
export function normaliseFoodQuery(text) {
  return String(text ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

/** A crude singular form: drop one trailing 's'. Enough for oat/oats. */
const singular = (w) => (w.length > 3 && w.endsWith('s') ? w.slice(0, -1) : w);

/**
 * Does this food's name match the query closely enough to offer?
 *
 * Every query word must appear in the name, comparing singular forms so
 * "oat" finds "Porridge oats" and "oats" finds "Oat milk". Word-level, not
 * character-level: no edit distance, no phonetics, no science project.
 */
export function foodNameMatchesQuery(name, query) {
  const q = normaliseFoodQuery(query);
  if (q.length < 2) return false;
  const n = normaliseFoodQuery(name);
  if (!n) return false;
  const words = n.split(' ').map(singular);
  return q.split(' ').every((term) => {
    const t = singular(term);
    return words.some((w) => w.startsWith(t) || t.startsWith(w));
  });
}

/**
 * Merge the user's OWN matching foods into a search result set.
 *
 * @param {Array} results   the waterfall's rows, in relevance order
 * @param {object} opts
 * @param {Array}  opts.personal  the user's own food rows (favourites,
 *                                frequents, slot recents, custom foods), each
 *                                carrying at least { food_ref, name }
 * @param {string} opts.query
 * @param {number} [opts.limit]   cap on the merged list
 * @returns {Array} results plus any of the user's matching foods that were
 *   missing from them. Order is not decided here - `rankByPersonalHistory`
 *   does that, so there is exactly one place that ranks.
 */
export function mergePersonalMatches(results, { personal = [], query = '', limit = 25 } = {}) {
  const rows = Array.isArray(results) ? results : [];
  const q = normaliseFoodQuery(query);
  if (q.length < 2 || !Array.isArray(personal) || personal.length === 0) return rows;
  const present = new Set(rows.map((r) => r?.food_ref).filter(Boolean));
  const added = [];
  const addedRefs = new Set();
  for (const f of personal) {
    const ref = f?.food_ref;
    if (!ref || present.has(ref) || addedRefs.has(ref)) continue;
    if (!foodNameMatchesQuery(f.name, q)) continue;
    addedRefs.add(ref);
    added.push(f);
  }
  if (!added.length) return rows;
  // The user's foods go in FRONT of the generic rows before ranking, so that
  // when two rows carry the same weight the personal one still wins the
  // stable-sort tiebreak. Never truncate them away: the cap trims the generic
  // tail, which is what the user was least likely to want.
  return [...added, ...rows].slice(0, Math.max(limit, added.length));
}
