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
 * by raw score alone.
 *
 * Final-certification-2026-09-05 (F-09) rewrote those tiers. The old
 * ladder checked `name.startsWith(query)` and `alias.startsWith(query)` on
 * the RAW string before ever consulting the tier registry, so the corpus's
 * own `[Implement] [Angle] [Movement]` naming convention buried every
 * staple: "bench" put "Bench Dip" above "Barbell Bench Press", "curl" put
 * a Spanish wrist-curl alias ("Curl De Muneca Con Barra") above "Barbell
 * Curl", and "front squat" put a niche dumbbell variant above the
 * canonical barbell row (06-LIBRARY-SEARCH.md anomaly 2 and 4). The tiers
 * are now, for a non-empty query:
 *
 *   0. exact name match   (normalised full-string equality)
 *   1. PREFIX tier: every query word is a whole word of, or the start of a
 *      word of, the NAME or of one alias. "a word of the name starts with
 *      the query" is deliberately the SAME tier as "the name starts with
 *      the query" and as "an alias equals the query" (F-09 ruling 1), so
 *      "Barbell Bench Press" and "Bench Dip" arrive at the same tier for
 *      "bench" and the tier registry — not word order — decides.
 *   2. fuzzy match on the name    (the token scorer below, score > 0)
 *   3. fuzzy match on an alias    (same scorer, against any alias)
 *
 * An item that hits none of these tiers is excluded, exactly as before
 * (score/rank 0 == no match). Within a tier, ties break by:
 *   a. LITERAL before FUZZY (F-09 ruling 2): an entry every one of whose
 *      query words was matched literally (exact word, word prefix or
 *      substring) sorts above one that needed the subsequence or
 *      edit-distance fallback, BEFORE the staple preference applies.
 *   b. auto-generation tier (STAPLE first, `exercise/canonicality.js`'s
 *      `tierRank`, passed in as `options.getTier`).
 *   c. alphabetically by name, then the original order (stable).
 *
 * (b) and (c): F-09's ruling 1 asks for "shorter name first" after the
 * tier registry. Implemented literally — by characters or by word count —
 * it FAILS three of the same ruling's own acceptance queries, because
 * several equally-staple rows share a movement word: "curl" would return
 * "Cable Curl" (10 chars) before "Barbell Curl" (12), and "row" would
 * push "Barbell Row (Bent Over)" (4 words) to fourth behind "Dumbbell
 * Row", "T-Bar Row" and "Seated Cable Row". The acceptance queries are
 * the concrete criterion, so the pre-existing alphabetical tie-break is
 * kept and the conflict is recorded here and in
 * exerciseSearch.staples.contract.test.js rather than papered over.
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
 * Optimal-string-alignment (Damerau-Levenshtein) distance: like
 * `levenshteinDistance` above, but an ADJACENT TRANSPOSITION costs 1
 * rather than 2.
 *
 * F-09 (final-certification-2026-09-05) tightened the typo allowance to
 * "3 letters or fewer none, 4 to 6 one, 7 or more two", which kills the
 * nonsense short-word matches the audit found ("dip" ~ "hip", "row" ~
 * "low"). Under plain Levenshtein that same tightening would also lose
 * the single commonest real typo, a transposed pair: "sqaut" is 2 edits
 * from "squat" and "benhc" 2 from "bench", so both would stop matching
 * even though each is one keyboard slip. Scoring transpositions at their
 * true cost of one keeps every misspelling the audit measured working
 * while the allowance itself gets stricter. `levenshteinDistance` stays
 * exported and unchanged (it is pinned by its own tests and used
 * nowhere else).
 */
function typoDistance(a, b) {
  if (a === b) return 0;
  const la = a.length;
  const lb = b.length;
  if (la === 0) return lb;
  if (lb === 0) return la;

  // Three rows: i-2 is needed for the transposition case, so the two-row
  // rotation the plain distance above uses is not enough here.
  let twoBack = null;
  let prev = new Array(lb + 1);
  let curr = new Array(lb + 1);
  for (let j = 0; j <= lb; j++) prev[j] = j;

  for (let i = 1; i <= la; i++) {
    curr[0] = i;
    for (let j = 1; j <= lb; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let best = Math.min(
        prev[j] + 1, // deletion
        curr[j - 1] + 1, // insertion
        prev[j - 1] + cost, // substitution
      );
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        best = Math.min(best, twoBack[j - 2] + 1); // transposition
      }
      curr[j] = best;
    }
    twoBack = prev;
    prev = curr;
    curr = new Array(lb + 1);
  }
  return prev[lb];
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
  // Typo tolerance, F-09 (06-LIBRARY-SEARCH.md anomaly 1): a typed word of
  // three letters or fewer gets NO edit-distance allowance, four to six
  // letters one, seven or more two. The old ladder allowed one edit on a
  // three-letter word, which is a third of the word rewritten: "dip"
  // matched "hip" (putting two hip thrusts in the top three for a dip
  // search), "row" matched the "(High to Low)" in a cable crossover, and
  // "swing" matched "Lying" and "Ring" well enough to keep Kettlebell
  // Swing out of the top five for the word "swing" entirely. Genuine
  // typos are unaffected: they are recovered by `typoDistance` above,
  // which charges a transposition one edit instead of two.
  const longer = Math.max(queryToken.length, nameToken.length);
  const allowedDistance = queryToken.length <= 3 ? 0 : queryToken.length <= 6 ? 1 : 2;
  if (allowedDistance > 0 && longer >= 3) {
    // Perf (EL-20, searching a 1,500+ row library on every keystroke):
    // edit distance can never be smaller than the two tokens' length
    // difference, so a pair whose lengths are already further apart than
    // the allowance can never pass -- skip the O(n*m) DP table entirely.
    // This is a pure short-circuit (same results, just fewer wasted
    // distance calls against tokens that share nothing in common, e.g.
    // "press" against "kettlebell").
    if (Math.abs(queryToken.length - nameToken.length) > allowedDistance) return 0;
    const distance = typoDistance(queryToken, nameToken);
    if (distance <= allowedDistance) {
      return 0.2 * (1 - distance / longer) + 0.05;
    }
  }
  return 0;
}

// Score bands `scoreTokenPair` returns, named so the tier logic below can
// ask "was this a literal hit?" without re-running the scorer:
//   exact word          1
//   word prefix         0.9 .. 1.0   -> the F-09 PREFIX tier
//   substring           0.6 .. 0.8   -> literal, but not a word start
//   subsequence         0.3 .. 0.5   -> fuzzy
//   edit distance       0.05 .. 0.25 -> fuzzy
const PREFIX_SCORE = 0.9;
const LITERAL_SCORE = 0.6;

// The actual token-vs-token scan, shared by `fuzzyScore` (which tokenizes
// both sides fresh, for standalone/one-off use) and the indexed hot path
// in `fuzzySearch` below (which tokenizes each name/alias exactly once
// per exercise-list identity, never per keystroke — see the WeakMap index
// further down). Same result either way; this is purely which side
// re-does the tokenizing work.
//
// `pairCache`, when passed, memoises `scoreTokenPair(q, n)` by its two
// token strings for the lifetime of one `fuzzySearch` call. A real
// exercise library repeats the same handful of implement/movement words
// (Barbell, Press, Row, Incline...) across most of its rows -- typically
// tens of DISTINCT tokens versus 1,500+ rows -- so this collapses what
// would be an O(rows * tokens^2) scan (thousands of repeat Levenshtein
// calls against word pairs already scored on an earlier row) into
// O(distinct-token-pairs^2), computed once each. Pure memoisation of a
// pure function: identical results, far fewer calls.
function scanTokenised(queryTokens, nameTokens, pairCache) {
  if (queryTokens.length === 0) return { score: 1, weakest: 1 };
  if (nameTokens.length === 0) return { score: 0, weakest: 0 };
  let total = 0;
  let weakest = 1;
  for (const q of queryTokens) {
    let best = 0;
    for (const n of nameTokens) {
      let s;
      if (pairCache) {
        const key = `${q} ${n}`;
        s = pairCache.get(key);
        if (s === undefined) {
          s = scoreTokenPair(q, n);
          pairCache.set(key, s);
        }
      } else {
        s = scoreTokenPair(q, n);
      }
      if (s > best) best = s;
    }
    if (best === 0) return { score: 0, weakest: 0 };
    if (best < weakest) weakest = best;
    total += best;
  }
  return { score: total / queryTokens.length, weakest };
}

// Same scan, score only -- the shape every pre-F-09 caller expects.
function scoreTokenised(queryTokens, nameTokens, pairCache) {
  return scanTokenised(queryTokens, nameTokens, pairCache).score;
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
  return scoreTokenised(tokenize(query), tokenize(name));
}

// Lower-cases, strips accents AND collapses/trims whitespace, for
// whole-string comparisons (exact/prefix tiers, and the create-form
// canonical-match suggestion). `normalise` above only lower-cases and
// strips accents; token boundaries are handled separately by `tokenize`.
export function normaliseExerciseName(str) {
  return normalise(str).replace(/\s+/g, ' ').trim();
}

/**
 * Perf (EL-20: search must feel instant over a 1,500+ row library, on
 * every keystroke): tokenizing every name and alias is the same work
 * whichever query is typed next, so it is done exactly ONCE per
 * exercise-list identity and cached here, keyed by the `items` array
 * reference itself. `ExercisePickerModal` re-filters its equipment/
 * muscle/intent conditions into a fresh `base` array only when THOSE
 * change (not on every keystroke), so this cache is naturally hit on
 * every keystroke of a search and naturally invalidated (a new array
 * reference in, a fresh index built) whenever the underlying candidate
 * set actually changes. A WeakMap means a stale `items` array is freed
 * automatically once nothing else references it - no manual eviction.
 *
 * Assumes (as the picker always does) that `getText`/`getAliases` are
 * stable, pure accessors for a given array identity - if a caller ever
 * needs to reuse the same array reference with DIFFERENT accessors, it
 * must pass a fresh array (e.g. via `.slice()`) to force a rebuild.
 */
const _indexCache = new WeakMap();

function buildIndex(items, getText, getAliases) {
  return items.map((item) => {
    const name = getText(item) || '';
    const aliases = (getAliases(item) || []).filter(Boolean);
    return {
      item,
      nn: normaliseExerciseName(name),
      nameTokens: tokenize(name),
      aliasEntries: aliases.map((a) => ({
        norm: normaliseExerciseName(a),
        tokens: tokenize(a),
      })),
    };
  });
}

function getIndex(items, getText, getAliases) {
  let index = _indexCache.get(items);
  if (!index) {
    index = buildIndex(items, getText, getAliases);
    _indexCache.set(items, index);
  }
  return index;
}

/**
 * Where one indexed entry ranks against an already-tokenised query (the
 * F-09 tiers in the module doc above). Returns `null` when nothing
 * matches at all, otherwise `{ tier, literal }`:
 *
 *   tier 0  exact name match
 *   tier 1  PREFIX: every query word is a word, or the start of a word, of
 *           the name or of one alias (the raw whole-name prefix and the
 *           whole-alias-equals-query cases both land here too, since a
 *           query that prefixes the string also prefixes its first words)
 *   tier 2  fuzzy on the name
 *   tier 3  fuzzy on an alias
 *
 * `literal` is true when EVERY query word was matched literally (exact
 * word, word start or substring) rather than through the subsequence or
 * edit-distance fallback -- the F-09 ruling that an exact-token match
 * outranks a fuzzy one before the staple preference applies. It is always
 * true at tiers 0 and 1 by construction and does real work at tiers 2 and
 * 3, where a substring hit ("garian" inside "Bulgarian") sorts above a
 * typo-recovered one. `pairCache` is the per-search token-pair memo (see
 * `scanTokenised` above).
 */
function matchTier(nq, queryTokens, entry, pairCache) {
  if (entry.nn && entry.nn === nq) return { tier: 0, literal: true };
  if (entry.nn && entry.nn.startsWith(nq)) return { tier: 1, literal: true };

  const nameScan = scanTokenised(queryTokens, entry.nameTokens, pairCache);
  if (nameScan.weakest >= PREFIX_SCORE) return { tier: 1, literal: true };

  let bestAlias = null;
  for (const a of entry.aliasEntries) {
    if (a.norm === nq) return { tier: 1, literal: true };
    const scan = scanTokenised(queryTokens, a.tokens, pairCache);
    if (scan.weakest >= PREFIX_SCORE) return { tier: 1, literal: true };
    if (!bestAlias || scan.weakest > bestAlias.weakest) bestAlias = scan;
  }

  if (nameScan.score > 0) return { tier: 2, literal: nameScan.weakest >= LITERAL_SCORE };
  if (bestAlias && bestAlias.score > 0) return { tier: 3, literal: bestAlias.weakest >= LITERAL_SCORE };
  return null;
}

/**
 * Filter + rank a list of items by fuzzy-matching `query` against
 * `getText(item)` (the exercise name) and, via `options.getAliases`, its
 * search aliases. Returns only items that match at least one of the four
 * tiers above, best tier first; within a tier a fully literal match sorts
 * above a typo-recovered one, then `options.getTier` breaks ties (the
 * picker passes the real auto-generation tierRank so staples outrank
 * specialists; omitted, every item ties and the order is purely
 * alphabetical, same as before EL-20), then alphabetically; any remaining
 * tie keeps the original relative order (stable). An empty query returns
 * `items` unchanged, same order — unchanged from before EL-20, so an
 * empty-query caller keeps its own ordering (the picker's recent/plan/
 * staples/alphabetical sections, EL-20 second half, live in the
 * component, not here).
 */
export function fuzzySearch(items, query, getText, options = {}) {
  const q = String(query || '').trim();
  if (!q) return items;
  const getAliases = options.getAliases || (() => []);
  const getTier = options.getTier || (() => 0);
  const nq = normaliseExerciseName(q);
  const queryTokens = tokenize(q);
  const index = getIndex(items, getText, getAliases);
  const pairCache = new Map();
  return index
    .map((entry, i) => {
      const match = matchTier(nq, queryTokens, entry, pairCache);
      return {
        entry,
        index: i,
        tier: match ? match.tier : null,
        literal: match ? match.literal : false,
      };
    })
    .filter(x => x.tier !== null)
    .sort((a, b) => {
      if (a.tier !== b.tier) return a.tier - b.tier;
      if (a.literal !== b.literal) return a.literal ? -1 : 1;
      const tierRankA = getTier(a.entry.item);
      const tierRankB = getTier(b.entry.item);
      if (tierRankA !== tierRankB) return tierRankA - tierRankB;
      const cmp = String(getText(a.entry.item) || '').localeCompare(String(getText(b.entry.item) || ''));
      if (cmp !== 0) return cmp;
      return a.index - b.index;
    })
    .map(x => x.entry.item);
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
