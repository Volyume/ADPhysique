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
