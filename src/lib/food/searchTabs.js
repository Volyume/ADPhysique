// Search subnav tabs (GAP row 28). Five tabs, locked in
// UI_FLOWS_LOCKED.md: Recents, Favourites, Frequents, Custom, Database.
// (My Recipes stays a CTA, not a tab, per the founder's 2026-05-28 call.)

export const SEARCH_TABS = [
  { key: 'recents', label: 'Recents' },
  { key: 'favourites', label: 'Favourites' },
  { key: 'frequents', label: 'Frequents' },
  { key: 'custom', label: 'Custom' },
  { key: 'database', label: 'Database' },
];

// Which food rows a tab shows for the current query.
//   Database is search-driven: nothing until a 2+ char query, then the
//   waterfall results. The other four are curated local lists that the
//   query filters by name client-side (instant, no network).
export function selectTabRows({ activeTab, query = '', lists = {}, results = [] }) {
  const q = (query || '').trim().toLowerCase();
  if (activeTab === 'database') {
    return q.length >= 2 ? results : [];
  }
  const base = lists[activeTab] ?? [];
  if (!q) return base;
  return base.filter((f) => (f?.name ?? '').toLowerCase().includes(q));
}
