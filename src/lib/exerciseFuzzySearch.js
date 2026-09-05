/**
 * exerciseFuzzySearch
 *
 * Pure fuzzy matcher for the exercise picker search (design-usability-audit
 * -2026-07-09, L07-F6: "No fuzzy/typo-tolerant search in the exercise
 * picker"). The old search was a plain case-insensitive substring match
 * against the whole query string, so a typo or an out-of-order word (e.g.
 * "bul garian" for "Bulgarian Split Squat") found nothing.
 *
 * No external library. Token-level matching is:
 *   - token-based: the query and the exercise name are both split into
 *     words, so word order in the query never matters ("squat bulgarian"
 *     matches the same as "bulgarian squat").
 *   - AND across query tokens: every typed word must find SOME match
 *     among the name's tokens, or the whole query fails. Without this,
 *     "leg curl" would also return every "leg press" (both contain "leg").
 *   - OR across name tokens per query token, scored by (in order of
 *     preference) exact match, prefix match, substring match, in-order
 *     subsequence, then a small Levenshtein-distance allowance for a
 *     genuine typo (transposition, one wrong letter, etc).
 *
 * Exercise-library-expansion-2026-09-05 (EL-20): the corpus now carries an
 * `aliases` field (JSON array of alternative names, e.g. "RDL" for
 * "Romanian Deadlift"), and results must favour a strong canonical match
 * over a niche variant. `fuzzySearch` therefore ranks in TIERS rather than
 * by raw score alone, checked in this order for a non-empty query:
 *
 *   0. exact name match       (normalised full string equality)
 *   1. name prefix match      (normalised name starts with the query)
 *   2. alias exact match
 *   3. alias prefix match
 *   4. fuzzy match on the name    (the token-scorer above, score > 0)
 *   5. fuzzy match on an alias    (same scorer, against any alias)
 *
 * An item that hits none of these six tiers is excluded, exactly as
 * before (score/rank 0 == no match). Within a tier, ties break by auto-
 * generation tier (STAPLE first, `exercise/canonicality.js`'s `tierRank`)
 * then alphabetically by name, so "Bench Press" surfaces the staple
 * "Barbell Bench Press" above an equally-matching niche variant.
 *
 * Exported as small, independently-testable pure functions so the scoring
 * rules can be pinned by unit tests without any React/RN dependency. This
 * module has no dependency of its own on the tier registry
 * (`exercise/canonicality.js`) — a caller that wants staples to outrank
 * specialists within a tier passes its `tierRank` in as `options.getTier`.
 */

// Lower-cases and strips accents so e.g. "café" and "cafe" tokenize the
// same way. No RN/Intl dependency required for this normalisation.
function normalise(str) {
  return String(str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/** Split free text into lower-cased, accent-stripped word tokens. */
export function tokenize(str) {
  return normalise(str).split(/[^a-z0-9]+/).filter(Boolean);
}

/**
 * Classic Levenshtein edit distance (insert/delete/substitute), iterative
 * two-row DP. Exercise-name tokens are short, so this stays cheap even run
 * per keystroke across the whole library.
 */
export function levenshteinDistance(a, b) {
  if (a === b) return 0;
  const la = a.length;
  const lb = b.length;
  if (la === 0) return lb;
  if (lb === 0) return la;

  let prev = new Array(lb + 1);
  let curr = new Array(lb + 1);
  for (let j = 0; j <= lb; j++) prev[j] = j;

  for (let i = 1; i <= la; i++) {
    curr[0] = i;
    for (let j = 1; j <= lb; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1, // deletion
        curr[j - 1] + 1, // insertion
        prev[j - 1] + cost, // substitution
      );
    }
    [prev, curr] = [curr, prev];
  }
  return prev[lb];
}

// Is `needle` a (not necessarily contiguous) subsequence of `haystack`, in
// order? Used as a partial-match fallback before the edit-distance check.
function isSubsequence(needle, haystack) {
  let i = 0;
  for (let j = 0; j < haystack.length && i < needle.length; j++) {
    if (needle[i] === haystack[j]) i++;
  }
  return i === needle.length;
}

/**
 * Score one query word against one name word. 0 means no match; higher is
 * better. The caller takes the best score across all of the name's words.
 */
function scoreTokenPair(queryToken, nameToken) {
  if (!queryToken || !nameToken) return 0;
  if (queryToken === nameToken) return 1;
  if (nameToken.startsWith(queryToken)) {
    return 0.9 + 0.1 * (queryToken.length / nameToken.length);
  }
  if (nameToken.includes(queryToken)) {
    return 0.6 + 0.2 * (queryToken.length / nameToken.length);
  }
  if (isSubsequence(queryToken, nameToken)) {
    return 0.3 + 0.2 * (queryToken.length / nameToken.length);
  }
  // Typo tolerance: allow a small edit distance relative to token length.
  // Scaled by length so short words ("leg") do not fuzzy-match everything,
  // while longer words tolerate one or two genuine slips (a transposed
  // letter, a dropped letter).
  const longer = Math.max(queryToken.length, nameToken.length);
  if (longer >= 3) {
    const allowedDistance = queryToken.length <= 4 ? 1 : queryToken.length <= 7 ? 2 : 3;
    const distance = levenshteinDistance(queryToken, nameToken);
    if (distance <= allowedDistance) {
      return 0.2 * (1 - distance / longer) + 0.05;
    }
  }
  return 0;
}

/**
 * Score a free-text query against an exercise name. Returns a number > 0
 * when every word in the query matches somewhere in the name (higher is a
 * better match), or exactly 0 when it does not match at all. An empty/
 * whitespace-only query always scores 1 (matches everything), so this
 * function can be used for both filtering (score > 0) and ranking (sort
 * descending by score).
 */
export function fuzzyScore(query, name) {
  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) return 1;
  const nameTokens = tokenize(name);
  if (nameTokens.length === 0) return 0;

  let total = 0;
  for (const q of queryTokens) {
    let best = 0;
    for (const n of nameTokens) {
      const s = scoreTokenPair(q, n);
      if (s > best) best = s;
    }
    if (best === 0) return 0;
    total += best;
  }
  return total / queryTokens.length;
}

// Lower-cases, strips accents AND collapses/trims whitespace, for
// whole-string comparisons (exact/prefix tiers, and the create-form
// canonical-match suggestion). `normalise` above only lower-cases and
// strips accents; token boundaries are handled separately by `tokenize`.
export function normaliseExerciseName(str) {
  return normalise(str).replace(/\s+/g, ' ').trim();
}

/**
 * Where `name`/`aliases` rank against `query` (EL-20's six tiers, module
 * doc above). Returns the tier number (0 best) or null when nothing
 * matches at all. `query` is assumed non-empty and already trimmed.
 */
function matchTier(query, name, aliases) {
  const nq = normaliseExerciseName(query);
  const nn = normaliseExerciseName(name);
  if (nn && nn === nq) return 0;
  if (nn && nn.startsWith(nq)) return 1;
  const normAliases = (Array.isArray(aliases) ? aliases : [])
    .filter(Boolean)
    .map(normaliseExerciseName);
  if (normAliases.some(a => a === nq)) return 2;
  if (normAliases.some(a => a.startsWith(nq))) return 3;
  if (fuzzyScore(query, name) > 0) return 4;
  const rawAliases = (Array.isArray(aliases) ? aliases : []).filter(Boolean);
  if (rawAliases.some(a => fuzzyScore(query, a) > 0)) return 5;
  return null;
}

/**
 * Filter + rank a list of items by fuzzy-matching `query` against
 * `getText(item)` (the exercise name) and, via `options.getAliases`, its
 * search aliases. Returns only items that match at least one of the six
 * tiers above, best tier first; within a tier, `options.getTier` breaks
 * ties (the picker passes the real auto-generation tierRank so staples
 * outrank specialists; omitted, every item ties at tier 0 and the order
 * is purely alphabetical, same as before EL-20) then alphabetically; any
 * remaining tie keeps the original relative order (stable). An empty
 * query returns `items` unchanged, same order — unchanged from before
 * EL-20, so an empty-query caller keeps its own ordering (the picker's
 * recent/plan/staples/alphabetical sections, EL-20 second half, live in
 * the component, not here).
 */
export function fuzzySearch(items, query, getText, options = {}) {
  const q = String(query || '').trim();
  if (!q) return items;
  const getAliases = options.getAliases || (() => []);
  const getTier = options.getTier || (() => 0);
  return items
    .map((item, index) => ({
      item,
      index,
      tier: matchTier(q, getText(item) || '', getAliases(item)),
    }))
    .filter(x => x.tier !== null)
    .sort((a, b) => {
      if (a.tier !== b.tier) return a.tier - b.tier;
      const tierRankA = getTier(a.item);
      const tierRankB = getTier(b.item);
      if (tierRankA !== tierRankB) return tierRankA - tierRankB;
      const cmp = String(getText(a.item) || '').localeCompare(String(getText(b.item) || ''));
      if (cmp !== 0) return cmp;
      return a.index - b.index;
    })
    .map(x => x.item);
}

/**
 * EL-18: does `name` already exist in the library, exactly, as a canonical
 * row's name OR one of its aliases (normalised: case/accent/whitespace
 * insensitive)? Used by the custom-exercise creation form to offer "Looks
 * like <Name> already exists. Use it instead?" rather than a silent
 * duplicate. Canonical rows only (never suggests merging into another
 * custom exercise) — pure, no I/O; the caller supplies the exercise list.
 * Returns the matching exercise, or null.
 */
export function findCanonicalNameMatch(name, exercises) {
  const target = normaliseExerciseName(name);
  if (!target || !Array.isArray(exercises)) return null;
  for (const ex of exercises) {
    if (!ex || ex.isCustom) continue;
    if (normaliseExerciseName(ex.name) === target) return ex;
    const aliases = Array.isArray(ex.aliases) ? ex.aliases : [];
    if (aliases.some(a => normaliseExerciseName(a) === target)) return ex;
  }
  return null;
}
