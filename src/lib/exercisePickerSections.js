/**
 * exercisePickerSections
 *
 * Exercise-library-expansion-2026-09-05 (EL-20, 01-SCHEMA-AND-CONSUMERS.md
 * section 5 + 05-DECISIONS.md EL-20): pure ordering logic for the exercise
 * picker's EMPTY-QUERY list. The old behaviour was "the library,
 * alphabetically" (`getAllExercises()` is `ORDER BY name ASC`, unfiltered
 * beyond the equipment/muscle/intent/capability chips). The new ordering
 * is: recent and frequent for this user, then the active plan/routine's
 * own exercises, then staples matching whatever equipment/muscle filter is
 * already active, then everything else - alphabetically (the fallback,
 * since `base` below is already alphabetical and every filter step in
 * ExercisePickerModal preserves relative order, so "everything else" needs
 * no re-sort of its own).
 *
 * Kept out of ExercisePickerModal.js itself (a React/RN component) so this
 * can be pinned by plain unit tests with a small fixture, same as the
 * ranking rules in exerciseFuzzySearch.js. Non-empty-query ranking is
 * exerciseFuzzySearch's job, not this file's - see that module for the
 * six-tier alias-aware search.
 */
import { autoTier, AUTO_TIER } from './exercise/canonicality';

/**
 * Merge recency (`getRecentlyUsedExerciseIds`, already recency-first) with
 * frequency (`getExerciseUsageStats`' completed-session counts per
 * exercise) into ONE ordered id list for the "Recent" section. Recency
 * wins: every recent id keeps its recency-first order, unchanged. A
 * frequent-but-not-recent exercise (at least 2 completed sessions, so a
 * single one-off logged months ago never crowds this section) is appended
 * after, ranked by session count, highest first. Capped so this stays a
 * quick-access list, not the user's whole training history.
 *
 * Pure: `recentIds` and `usageStats` are exactly what
 * `getRecentlyUsedExerciseIds`/`getExerciseUsageStats` (database.js)
 * already return; this only merges and orders them.
 */
export function buildRecentAndFrequentIds(recentIds, usageStats, cap = 10) {
  const ordered = [];
  const seen = new Set();
  for (const id of (Array.isArray(recentIds) ? recentIds : [])) {
    const key = String(id);
    if (seen.has(key)) continue;
    seen.add(key);
    ordered.push(id);
  }
  const byFrequency = (Array.isArray(usageStats) ? usageStats : [])
    .filter(s => (s?.sessions || 0) >= 2)
    .slice()
    .sort((a, b) => (b?.sessions || 0) - (a?.sessions || 0));
  for (const stat of byFrequency) {
    if (ordered.length >= cap) break;
    const key = String(stat?.exerciseId);
    if (!stat?.exerciseId || seen.has(key)) continue;
    seen.add(key);
    ordered.push(stat.exerciseId);
  }
  return ordered.slice(0, cap);
}

/**
 * EL-20's four-stage empty-query ordering. `base` is the ALREADY-FILTERED
 * candidate list (whatever equipment/muscle/intent/capability filters the
 * picker currently has active) - this function only reorders it into
 * sections, it never re-filters or adds exercises `base` excludes.
 *
 * `recentAndFrequentIds` - from `buildRecentAndFrequentIds` above.
 * `planExercises` - the active plan/routine's own exercise rows (or
 * exercise-shaped objects with an `id`), if the caller has them; omitted
 * entirely, the "In your plan" section simply never appears.
 *
 * Each exercise appears in exactly ONE section (the earliest one it
 * qualifies for), so recent items never also show as "Staples" further
 * down. Returns only the non-empty sections, in order.
 */
export function buildEmptyQuerySections({
  base = [], recentAndFrequentIds = [], planExercises = [],
} = {}) {
  const byId = new Map(base.map(e => [String(e.id), e]));
  const seen = new Set();
  const sections = [];

  const recentItems = recentAndFrequentIds
    .map(id => byId.get(String(id)))
    .filter(Boolean);
  recentItems.forEach(e => seen.add(String(e.id)));
  if (recentItems.length) sections.push({ key: 'recent', label: 'Recent', items: recentItems });

  const planIds = new Set(
    (Array.isArray(planExercises) ? planExercises : [])
      .map(e => (e?.id != null ? String(e.id) : null))
      .filter(Boolean),
  );
  const planItems = planIds.size
    ? base.filter(e => planIds.has(String(e.id)) && !seen.has(String(e.id)))
    : [];
  planItems.forEach(e => seen.add(String(e.id)));
  if (planItems.length) sections.push({ key: 'plan', label: 'In your plan', items: planItems });

  const stapleItems = base.filter(
    e => !seen.has(String(e.id)) && autoTier(e.name) === AUTO_TIER.STAPLE,
  );
  stapleItems.forEach(e => seen.add(String(e.id)));
  if (stapleItems.length) sections.push({ key: 'staples', label: 'Staples', items: stapleItems });

  const restItems = base.filter(e => !seen.has(String(e.id)));
  if (restItems.length) sections.push({ key: 'all', label: 'All exercises', items: restItems });

  return sections;
}

/**
 * Flattens `buildEmptyQuerySections`' output into the single array a list
 * component renders, with a lightweight header marker
 * (`{ __section, key }`) ahead of each section's items. The picker's
 * renderItem/keyExtractor/getItemType branch on `__section`.
 */
export function flattenSectionsForList(sections) {
  const out = [];
  for (const s of sections) {
    out.push({ __section: s.label, key: `section-${s.key}` });
    out.push(...s.items);
  }
  return out;
}
