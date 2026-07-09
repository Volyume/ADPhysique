/**
 * exerciseFuzzySearch
 *
 * Pure, dependency-free fuzzy matcher for the exercise picker search
 * (design-usability-audit-2026-07-09, L07-F6: "No fuzzy/typo-tolerant
 * search in the exercise picker"). The old search was a plain
 * case-insensitive substring match against the whole query string, so a
 * typo or an out-of-order word (e.g. "bul garian" for "Bulgarian Split
 * Squat") found nothing.
 *
 * No external library. Matching is:
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
 * Exported as small, independently-testable pure functions so the scoring
 * rules can be pinned by unit tests without any React/RN dependency.
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

/**
 * Filter + rank a list of items by fuzzy-matching `query` against
 * `getText(item)`. Returns only items that match (score > 0), best match
 * first; equal scores keep the original relative order (stable sort). An
 * empty query returns `items` unchanged, same order.
 */
export function fuzzySearch(items, query, getText) {
  const q = String(query || '').trim();
  if (!q) return items;
  return items
    .map((item, index) => ({ item, index, score: fuzzyScore(q, getText(item)) }))
    .filter(x => x.score > 0)
    .sort((a, b) => (b.score - a.score) || (a.index - b.index))
    .map(x => x.item);
}
