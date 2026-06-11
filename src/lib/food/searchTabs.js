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
export const SEARCH_TABS = [
  { key: 'recents', label: 'Add again' },
  { key: 'suggested', label: 'Suggested' },
  { key: 'favourites', label: 'Favourites' },
  { key: 'frequents', label: 'Frequents' },
  { key: 'custom', label: 'Custom' },
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
